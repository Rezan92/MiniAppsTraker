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
  bill_to_type: z.enum(['client_name', 'company_name', 'property_address', 'renter_name']).optional().default('client_name'),
  materials: z.array(z.object({
    description: z.string(),
    cost: z.number()
  })).optional().default([]),
  labor_details: z.array(z.object({
    description: z.string()
  })).optional().default([])
});

const statusSchema = z.object({
  status: z.enum(['draft', 'sent', 'in_progress', 'paid', 'overdue', 'voided']),
  reason: z.string().optional()
});

// GET all invoices
router.get('/', async (req, res, next) => {
  try {
    const { status, client_id, property_id, from_date, to_date, job_id } = req.query;
    
    let query = supabase
      .from('invoices')
      .select('*, clients(name, email, phone)')
      .eq('tenant_id', req.user.tenant_id)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (client_id) query = query.eq('client_id', client_id);
    if (property_id) query = query.eq('property_id', property_id);
    if (job_id) query = query.eq('job_id', job_id);
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
    
    // Note: 1:1 job_id constraint check has been removed (Multi-Invoice Jobs)

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

    // 5. Lock unbilled job items (Sweep)
    if (invoice.job_id) {
      await supabase.from('job_materials')
        .update({ invoice_id: invoice.id })
        .eq('job_id', invoice.job_id)
        .is('invoice_id', null);
        
      await supabase.from('job_hours')
        .update({ invoice_id: invoice.id })
        .eq('job_id', invoice.job_id)
        .is('invoice_id', null);
    }

    // 6. Audit Trail (Log Creation)
    await supabase.from('invoice_logs').insert([{
      invoice_id: invoice.id,
      tenant_id: req.user.tenant_id,
      action: 'Created',
      user_id: req.user.id
    }]);

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

// GET check if invoice is out of sync with job
router.get('/:id/sync-status', async (req, res, next) => {
  try {
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, jobs(*)')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (error) throw error;
    if (!invoice.job_id || invoice.status !== 'draft') {
      return res.json({ success: true, outOfSync: false });
    }

    const { data: materials } = await supabase.from('job_materials').select('*').eq('invoice_id', invoice.id);
    const { data: hours } = await supabase.from('job_hours').select('*').eq('invoice_id', invoice.id);
    const { data: existingItems } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id);

    const existingMaterials = existingItems.filter(i => i.type === 'material');
    const existingLabor = existingItems.filter(i => i.type === 'labor_detail');

    const reasons = [];

    // Check material counts/costs
    for (const m of (materials || [])) {
      const existing = existingMaterials.find(em => em.description === m.description);
      if (!existing) {
        reasons.push(`Missing material: ${m.description}`);
      } else if (existing.total_price !== m.cost) {
        reasons.push(`Price changed for material: ${m.description}`);
      }
    }

    // Check hours
    for (const h of (hours || [])) {
      const desc = h.description || `${h.hours} hours logged`;
      if (!existingLabor.find(el => el.description === desc)) {
        reasons.push(`Missing logged hours: ${desc}`);
      }
    }

    // Check rate changes
    const job = invoice.jobs;
    let laborAmount = 0;
    if (job.rate_type === 'flat') {
      laborAmount = job.flat_rate || 0;
    } else {
      const totalHours = (hours || []).reduce((sum, h) => sum + h.hours, 0);
      laborAmount = totalHours * (job.hourly_rate || 0);
    }
    if (laborAmount !== invoice.labor_amount) {
      reasons.push('Job rate structure or total labor amount changed');
    }

    // Check property changes
    if (invoice.property_id !== job.property_id) {
      reasons.push('Assigned property on job has changed');
    }

    res.json({ success: true, outOfSync: reasons.length > 0, reasons });
  } catch (err) {
    next(err);
  }
});

// POST sync invoice with job data
router.post('/:id/sync', async (req, res, next) => {
  try {
    const { data: invoice, error: checkError } = await supabase
      .from('invoices')
      .select('*, jobs(*, clients(*), rental_properties(*))')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (checkError) throw checkError;
    if (invoice.status !== 'draft') {
      return res.status(403).json({ success: false, error: 'Only draft invoices can be synced' });
    }
    if (!invoice.job_id) {
      return res.status(400).json({ success: false, error: 'Invoice is not linked to a job' });
    }

    const job = invoice.jobs;

    // Sweep any unbilled items just in case
    await supabase.from('job_materials')
      .update({ invoice_id: invoice.id })
      .eq('job_id', job.id)
      .is('invoice_id', null);
      
    await supabase.from('job_hours')
      .update({ invoice_id: invoice.id })
      .eq('job_id', job.id)
      .is('invoice_id', null);

    const { data: materials } = await supabase.from('job_materials').select('*').eq('invoice_id', invoice.id);
    const { data: hours } = await supabase.from('job_hours').select('*').eq('invoice_id', invoice.id);
    const { data: existingItems } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id);

    const existingMaterials = existingItems.filter(i => i.type === 'material');
    const existingLabor = existingItems.filter(i => i.type === 'labor_detail');
    let maxSortOrder = existingItems.reduce((max, i) => Math.max(max, i.sort_order), -1);

    const itemsToInsert = [];

    // Diff Materials
    for (const m of (materials || [])) {
      const existing = existingMaterials.find(em => em.description === m.description);
      if (!existing) {
        maxSortOrder++;
        itemsToInsert.push({
          invoice_id: invoice.id,
          type: 'material',
          description: m.description,
          total_price: m.cost,
          sort_order: maxSortOrder
        });
      } else if (existing.total_price !== m.cost) {
        await supabase.from('invoice_items').update({ total_price: m.cost }).eq('id', existing.id);
      }
    }

    // Diff Hours
    for (const h of (hours || [])) {
      const desc = h.description || `${h.hours} hours logged`;
      const existing = existingLabor.find(el => el.description === desc);
      if (!existing) {
        maxSortOrder++;
        itemsToInsert.push({
          invoice_id: invoice.id,
          type: 'labor_detail',
          description: desc,
          sort_order: maxSortOrder
        });
      }
    }

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
      if (itemsError) throw itemsError;
    }

    // Recalculate totals and check rate structure changes
    let laborAmount = 0;
    if (job.rate_type === 'flat') {
      laborAmount = job.flat_rate || 0;
    } else {
      const totalHours = (hours || []).reduce((sum, h) => sum + h.hours, 0);
      laborAmount = totalHours * (job.hourly_rate || 0);
    }

    // Re-fetch items to get the actual total of materials (including custom ones added on invoice)
    const { data: finalItems } = await supabase.from('invoice_items').select('*').eq('invoice_id', invoice.id);
    const materialsAmount = finalItems.filter(i => i.type === 'material').reduce((sum, m) => sum + (m.total_price || 0), 0);
    const totalAmount = laborAmount + materialsAmount;

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        labor_amount: laborAmount,
        materials_amount: materialsAmount,
        total_amount: totalAmount,
        property_id: job.property_id,
        property_address: job.rental_properties?.address || ''
      })
      .eq('id', invoice.id);

    if (updateError) throw updateError;

    const logReason = `Synced from job: Updated labor ($${laborAmount.toFixed(2)}) and materials ($${materialsAmount.toFixed(2)}). Property set to ${job.rental_properties?.address || 'None'}.`;
    
    const { error: logError } = await supabase.from('invoice_logs').insert([{
      invoice_id: invoice.id,
      tenant_id: req.user.tenant_id,
      user_id: req.user.id,
      action: 'Synced',
      reason: logReason
    }]);

    if (logError) throw logError;

    res.json({ success: true });
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
    delete invoiceData.job_id; // Prevent dangerous job swapping
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

    const { error: logError } = await supabase.from('invoice_logs').insert([{
      invoice_id: invoice.id,
      tenant_id: req.user.tenant_id,
      user_id: req.user.id,
      action: 'Updated',
      reason: 'Manual draft update'
    }]);
    
    if (logError) throw logError;

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

    const { status, reason } = result.data;

    const { data: existing, error: existError } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', req.params.id)
      .single();

    if (existError) throw existError;

    let action = 'Updated';
    if (status === 'sent') action = 'Sent';
    if (status === 'paid') action = 'Paid';
    if (status === 'voided') action = 'Voided';
    if (status === 'draft' && existing.status !== 'draft') action = 'Reverted';
    
    if ((action === 'Reverted' || action === 'Voided') && !reason) {
      return res.status(400).json({ success: false, error: 'A reason is required to revert or void an invoice' });
    }

    const updateData = { status };
    if (status === 'paid') {
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

    if (action === 'Voided') {
      await supabase.from('job_materials').update({ invoice_id: null }).eq('invoice_id', req.params.id);
      await supabase.from('job_hours').update({ invoice_id: null }).eq('invoice_id', req.params.id);
    }

    // Auto-complete job on send
    if (status === 'sent' && data.job_id) {
      const { data: job } = await supabase
        .from('jobs')
        .select('status')
        .eq('id', data.job_id)
        .single();
        
      if (job && job.status !== 'completed') {
        await supabase
          .from('jobs')
          .update({ status: 'completed' })
          .eq('id', data.job_id);
      }
    }

    await supabase.from('invoice_logs').insert([{
      invoice_id: req.params.id,
      tenant_id: req.user.tenant_id,
      action: action,
      reason: reason || null,
      user_id: req.user.id
    }]);

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
        clients(id, name, email, phone, address)
      `)
      .eq('id', req.params.jobId)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (jobError) throw jobError;

    const { data: hours } = await supabase.from('job_hours').select('hours, description').eq('job_id', job.id).is('invoice_id', null);
    const { data: materials } = await supabase.from('job_materials').select('description, cost').eq('job_id', job.id).is('invoice_id', null);
    
    job.job_hours = hours || [];
    job.job_materials = materials || [];

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

// GET invoice logs
router.get('/:id/logs', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('invoice_logs')
      .select('*')
      .eq('invoice_id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
