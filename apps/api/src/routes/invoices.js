import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const invoiceSchema = z.object({
  client_id: z.string().uuid(),
  job_id: z.string().uuid().optional().nullable(),
  invoice_date: z.string().optional(),
  due_date: z.string().optional().nullable(),
  labor_title: z.string().optional().nullable(),
  labor_notes: z.string().optional().nullable(),
  labor_amount: z.number().optional().default(0),
  property_address: z.string().optional().nullable(),
  property_id: z.string().uuid().optional().nullable(),
  billed_to_name: z.string().optional().nullable(),
  bill_to_type: z.enum(['client_name', 'company_name', 'property_address']).optional().default('client_name'),
  materials: z.array(z.object({
    description: z.string(),
    cost: z.number()
  })).optional().default([]),
  labor_details: z.array(z.object({
    description: z.string()
  })).optional().default([])
});

const statusSchema = z.object({
  status: z.enum(['draft', 'sent', 'in_progress', 'paid', 'overdue'])
});

// GET all invoices
router.get('/', async (req, res, next) => {
  try {
    const { status, client_id, from_date, to_date } = req.query;
    
    let query = supabase
      .from('invoices')
      .select('*, clients(name, email, phone)')
      .eq('tenant_id', req.user.tenant_id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (client_id) query = query.eq('client_id', client_id);
    if (from_date) query = query.gte('invoice_date', from_date);
    if (to_date) query = query.lte('invoice_date', to_date);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// GET single invoice
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients(name, email, phone, address),
        tenants(name, business_tagline, payment_method, payment_details, phone),
        invoice_items(*)
      `)
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, error: 'Invoice not found' });
      throw error;
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// POST new invoice
router.post('/', async (req, res, next) => {
  try {
    const result = invoiceSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }

    const { materials, labor_details, due_date, ...invoiceData } = result.data;
    const sanitizedDueDate = due_date === '' ? null : due_date;
    const materialsAmount = materials.reduce((sum, m) => sum + m.cost, 0);
    const totalAmount = (invoiceData.labor_amount || 0) + materialsAmount;

    // Transaction-like approach using an RPC function would be safer, but doing it in steps for now:
    // 1. Get next invoice number
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('next_invoice_number')
      .eq('id', req.user.tenant_id)
      .single();
      
    if (tenantError) throw tenantError;
    const invoiceNumber = `${tenant.next_invoice_number}`;

    // 2. Insert invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{
        ...invoiceData,
        due_date: sanitizedDueDate,
        tenant_id: req.user.tenant_id,
        invoice_number: invoiceNumber,
        materials_amount: materialsAmount,
        total_amount: totalAmount,
        status: 'draft'
      }])
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // 3. Increment next_invoice_number
    await supabase
      .from('tenants')
      .update({ next_invoice_number: tenant.next_invoice_number + 1 })
      .eq('id', req.user.tenant_id);

    // 4. Insert items
    const itemsToInsert = [];
    let sortOrder = 0;
    
    for (const ld of labor_details) {
      itemsToInsert.push({
        invoice_id: invoice.id,
        type: 'labor_detail',
        description: ld.description,
        sort_order: sortOrder++
      });
    }
    
    for (const m of materials) {
      itemsToInsert.push({
        invoice_id: invoice.id,
        type: 'material',
        description: m.description,
        total_price: m.cost,
        sort_order: sortOrder++
      });
    }

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);
      
      if (itemsError) throw itemsError;
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// PATCH update draft invoice
router.patch('/:id', async (req, res, next) => {
  try {
    const result = invoiceSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }

    const { materials, labor_details, due_date, ...invoiceData } = result.data;
    const sanitizedDueDate = due_date === '' ? null : due_date;
    const materialsAmount = materials.reduce((sum, m) => sum + m.cost, 0);
    const totalAmount = (invoiceData.labor_amount || 0) + materialsAmount;

    // Check if invoice is draft
    const { data: existing, error: checkError } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (checkError) throw checkError;
    if (existing.status !== 'draft') {
      return res.status(403).json({ success: false, error: 'Only draft invoices can be edited' });
    }

    // Update invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .update({
        ...invoiceData,
        due_date: sanitizedDueDate,
        materials_amount: materialsAmount,
        total_amount: totalAmount
      })
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Replace items
    await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id);

    const itemsToInsert = [];
    let sortOrder = 0;
    
    for (const ld of labor_details) {
      itemsToInsert.push({
        invoice_id: invoice.id,
        type: 'labor_detail',
        description: ld.description,
        sort_order: sortOrder++
      });
    }
    
    for (const m of materials) {
      itemsToInsert.push({
        invoice_id: invoice.id,
        type: 'material',
        description: m.description,
        total_price: m.cost,
        sort_order: sortOrder++
      });
    }

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);
      
      if (itemsError) throw itemsError;
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// PATCH status
router.patch('/:id/status', async (req, res, next) => {
  try {
    const result = statusSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }

    const updateData = { status: result.data.status };
    if (result.data.status === 'paid') {
      updateData.paid_at = new Date().toISOString();
    } else {
      updateData.paid_at = null;
    }

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// PATCH internal notes
router.patch('/:id/internal-notes', async (req, res, next) => {
  try {
    const { internal_notes } = req.body;
    
    const { data, error } = await supabase
      .from('invoices')
      .update({ internal_notes })
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// DELETE draft invoice
router.delete('/:id', async (req, res, next) => {
  try {
    // Check if draft
    const { data: existing, error: checkError } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (checkError) throw checkError;
    if (existing.status !== 'draft') {
      return res.status(403).json({ success: false, error: 'Only draft invoices can be deleted' });
    }

    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// GET prepopulate from job
router.get('/from-job/:jobId', async (req, res, next) => {
  try {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        clients(id, name, email, phone, address),
        job_hours(hours, description),
        job_materials(description, cost)
      `)
      .eq('id', req.params.jobId)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (jobError) throw jobError;

    let laborAmount = 0;
    if (job.rate_type === 'flat') {
      laborAmount = job.flat_rate || 0;
    } else {
      const totalHours = (job.job_hours || []).reduce((sum, h) => sum + h.hours, 0);
      laborAmount = totalHours * (job.hourly_rate || 0);
    }

    const payload = {
      client_id: job.client_id,
      job_id: job.id,
      labor_title: job.title,
      labor_amount: laborAmount,
      labor_details: (job.job_hours || []).map(h => ({ description: h.description || `${h.hours} hours logged` })),
      materials: (job.job_materials || []).map(m => ({ description: m.description, cost: m.cost })),
      property_address: job.clients?.address || ''
    };

    res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
});

export default router;
