import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { createApiError } from '../middleware/errorHandler.js';
import { calculateInvoiceFinancials } from '../services/pricingEngine.js';

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
  breakdown_by_days: z.boolean().optional().default(false)
});

const statusSchema = z.object({
  status: z.enum(['draft', 'ready_to_send', 'sent', 'disputed', 'paid', 'voided']),
  reason: z.string().optional()
});

const lineItemSchema = z.object({
  source_type: z.enum(['labor', 'material', 'ad_hoc']),
  source_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1),
  amount: z.number().default(0),
  sort_order: z.number().default(0),
  is_billable: z.boolean().default(true),
  service_date: z.string().optional().nullable(),
  is_hidden: z.boolean().optional().default(false)
});

const lineItemUpdateSchema = z.object({
  description: z.string().optional(),
  amount: z.number().optional(),
  sort_order: z.number().optional(),
  is_billable: z.boolean().optional(),
  service_date: z.string().optional().nullable(),
  is_hidden: z.boolean().optional()
});

const invoicePatchItemSchema = z.object({
  id: z.string().optional(),
  source_type: z.enum(['labor', 'material', 'ad_hoc']),
  source_id: z.string().uuid().optional().nullable(),
  description: z.string().min(1, 'Description is required'),
  amount: z.number().default(0),
  sort_order: z.number().default(0),
  is_billable: z.boolean().default(true),
  service_date: z.string().optional().nullable(),
  is_hidden: z.boolean().optional().default(false)
});

const invoicePatchSchema = invoiceSchema.extend({
  client_id: z.string().uuid().optional(),
  line_items: z.array(invoicePatchItemSchema).optional()
});

const isUUID = (str) => typeof str === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

async function enforceInvoiceEditability(invoiceId, tenantId) {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .eq('tenant_id', tenantId)
    .single();
  if (error || !invoice) throw new Error('Invoice not found');
  if (['ready_to_send', 'sent', 'paid', 'voided'].includes(invoice.status)) {
    const err = new Error('Invoice is locked and cannot be edited in its current status.');
    err.status = 403;
    throw err;
  }
}

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

    // Totals (labor_amount, materials_amount, total_amount) are stored directly in DB columns on save
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients(name, email, phone, address),
        tenants(name, business_tagline, payment_method, payment_details, phone),
        jobs(id, title, rental_properties(id, address)),
        invoice_line_items(*)
      `)
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return next(createApiError('Invoice not found', 404, 'NOT_FOUND'));
      throw error;
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = invoiceSchema.safeParse(req.body);
    if (!result.success) {
      return next(result.error);
    }

    const { due_date, ...invoiceData } = result.data;
    const sanitizedDueDate = due_date === '' ? null : due_date;

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('next_invoice_number')
      .eq('id', req.user.tenant_id)
      .single();
      
    if (tenantError) throw tenantError;
    const invoiceNumber = `${tenant.next_invoice_number}`;

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{
        ...invoiceData,
        due_date: sanitizedDueDate,
        tenant_id: req.user.tenant_id,
        invoice_number: invoiceNumber,
        labor_amount: invoiceData.labor_amount || 0,
        materials_amount: 0,
        total_amount: invoiceData.labor_amount || 0,
        status: 'draft'
      }])
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    await supabase
      .from('tenants')
      .update({ next_invoice_number: tenant.next_invoice_number + 1 })
      .eq('id', req.user.tenant_id);

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

router.patch('/:id', async (req, res, next) => {
  try {
    const result = invoicePatchSchema.safeParse(req.body);
    if (!result.success) {
      return next(result.error);
    }

    await enforceInvoiceEditability(req.params.id, req.user.tenant_id);

    const { due_date, line_items, ...invoiceData } = result.data;
    delete invoiceData.job_id;
    const sanitizedDueDate = due_date === '' ? null : due_date;

    let lineLabor = 0;
    let lineMaterials = 0;

    if (Array.isArray(line_items)) {
      // 1. Fetch current line items from DB for this invoice
      const { data: existingDbItems, error: fetchItemsErr } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', req.params.id);
      if (fetchItemsErr) throw fetchItemsErr;
      const dbItems = existingDbItems || [];

      const incomingIds = new Set(line_items.map(i => i.id).filter(id => isUUID(id)));

      // 2. Identify items to delete (in DB but not in incoming line_items)
      const toDelete = dbItems.filter(item => !incomingIds.has(item.id));
      const toDeleteIds = toDelete.map(item => item.id);

      if (toDeleteIds.length > 0) {
        const { error: delErr } = await supabase
          .from('invoice_line_items')
          .delete()
          .in('id', toDeleteIds)
          .eq('invoice_id', req.params.id);
        if (delErr) throw delErr;

        // For deleted items linked to job items, revert billing_status to 'unbilled' if no other active draft links to them
        for (const item of toDelete) {
          if (item.source_id && item.source_type !== 'ad_hoc') {
            const { data: otherDrafts } = await supabase
              .from('invoice_line_items')
              .select('invoices!inner(status)')
              .eq('source_id', item.source_id)
              .neq('invoice_id', req.params.id)
              .in('invoices.status', ['draft', 'ready_to_send']);

            if (!otherDrafts || otherDrafts.length === 0) {
              const table = item.source_type === 'labor' ? 'job_hours' : 'job_materials';
              await supabase.from(table).update({ billing_status: 'unbilled' }).eq('id', item.source_id);
            }
          }
        }
      }

      // 3. Separate incoming items into updates vs insertions
      const itemsToUpdate = line_items.filter(item => isUUID(item.id) && dbItems.some(dbItem => dbItem.id === item.id));
      const itemsToInsert = line_items.filter(item => !isUUID(item.id) || !dbItems.some(dbItem => dbItem.id === item.id));

      // Perform updates
      for (const item of itemsToUpdate) {
        const { error: updErr } = await supabase
          .from('invoice_line_items')
          .update({
            description: item.description,
            amount: item.amount,
            sort_order: item.sort_order,
            is_billable: item.is_billable,
            service_date: item.service_date || null,
            is_hidden: item.is_hidden ?? false
          })
          .eq('id', item.id)
          .eq('invoice_id', req.params.id);
        if (updErr) throw updErr;
      }

      // Perform inserts
      if (itemsToInsert.length > 0) {
        const insertPayload = itemsToInsert.map((item, index) => ({
          invoice_id: req.params.id,
          source_type: item.source_type,
          source_id: item.source_id || null,
          description: item.description,
          amount: item.amount,
          sort_order: item.sort_order ?? index,
          is_billable: item.is_billable ?? true,
          service_date: item.service_date || null,
          is_hidden: item.is_hidden ?? false
        }));

        const { error: insErr } = await supabase
          .from('invoice_line_items')
          .insert(insertPayload);
        if (insErr) throw insErr;

        // Set billing_status = 'on_draft' for newly linked job items
        const laborSourceIds = itemsToInsert.filter(i => i.source_type === 'labor' && i.source_id).map(i => i.source_id);
        const matSourceIds = itemsToInsert.filter(i => i.source_type === 'material' && i.source_id).map(i => i.source_id);
        if (laborSourceIds.length > 0) {
          await supabase.from('job_hours').update({ billing_status: 'on_draft' }).in('id', laborSourceIds);
        }
        if (matSourceIds.length > 0) {
          await supabase.from('job_materials').update({ billing_status: 'on_draft' }).in('id', matSourceIds);
        }
      }
    }

    let lineItemsForCalc = [];
    if (line_items && Array.isArray(line_items)) {
      lineItemsForCalc = line_items;
    } else {
      // Backward compatibility: calculate totals from existing DB line items
      const { data: items } = await supabase
        .from('invoice_line_items')
        .select('amount, source_type, is_billable')
        .eq('invoice_id', req.params.id);
      lineItemsForCalc = items || [];
    }

    const { laborAmount, materialsAmount, totalAmount } = calculateInvoiceFinancials({
      baseLaborAmount: invoiceData.labor_amount,
      lineItems: lineItemsForCalc
    });

    const updatePayload = {
      ...invoiceData,
      labor_amount: laborAmount,
      materials_amount: materialsAmount,
      total_amount: totalAmount
    };
    if (due_date !== undefined) {
      updatePayload.due_date = sanitizedDueDate;
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .select(`
        *,
        clients(name, email, phone, address),
        tenants(name, business_tagline, payment_method, payment_details, phone),
        jobs(id, title, rental_properties(id, address)),
        invoice_line_items(*)
      `)
      .single();

    if (invoiceError) throw invoiceError;

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

router.post('/:id/items', async (req, res, next) => {
  try {
    await enforceInvoiceEditability(req.params.id, req.user.tenant_id);
    const result = lineItemSchema.safeParse(req.body);
    if (!result.success) return next(result.error);
    
    const { source_type, source_id, description, amount, sort_order, is_billable, service_date, is_hidden } = result.data;

    const { data: item, error: itemError } = await supabase
      .from('invoice_line_items')
      .insert([{ invoice_id: req.params.id, source_type, source_id, description, amount, sort_order, is_billable, service_date, is_hidden }])
      .select()
      .single();
    if (itemError) throw itemError;

    if (source_id && source_type !== 'ad_hoc') {
      const table = source_type === 'labor' ? 'job_hours' : 'job_materials';
      await supabase.from(table).update({ billing_status: 'on_draft' }).eq('id', source_id);
    }
    
    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.patch('/:id/items/:itemId', async (req, res, next) => {
  try {
    await enforceInvoiceEditability(req.params.id, req.user.tenant_id);
    const result = lineItemUpdateSchema.safeParse(req.body);
    if (!result.success) return next(result.error);

    const { data: item, error: itemError } = await supabase
      .from('invoice_line_items')
      .update(result.data)
      .eq('id', req.params.itemId)
      .eq('invoice_id', req.params.id)
      .select()
      .single();
    if (itemError) throw itemError;

    res.json({ success: true, data: item });
  } catch (err) { next(err); }
});

router.delete('/:id/items/:itemId', async (req, res, next) => {
  try {
    await enforceInvoiceEditability(req.params.id, req.user.tenant_id);
    const { data: item } = await supabase.from('invoice_line_items').select('source_id, source_type').eq('id', req.params.itemId).single();
    if (!item) return next(createApiError('Item not found', 404, 'NOT_FOUND'));

    await supabase.from('invoice_line_items').delete().eq('id', req.params.itemId).eq('invoice_id', req.params.id);

    if (item.source_id && item.source_type !== 'ad_hoc') {
      const { data: drafts } = await supabase
        .from('invoice_line_items')
        .select('invoices!inner(status)')
        .eq('source_id', item.source_id)
        .in('invoices.status', ['draft', 'ready_to_send']);
      
      if (!drafts || drafts.length === 0) {
        const table = item.source_type === 'labor' ? 'job_hours' : 'job_materials';
        await supabase.from(table).update({ billing_status: 'unbilled' }).eq('id', item.source_id);
      }
    }
    
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const result = statusSchema.safeParse(req.body);
    if (!result.success) {
      return next(result.error);
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
    if (status === 'ready_to_send') action = 'Ready';
    if (status === 'disputed') action = 'Disputed';
    if (status === 'draft' && existing.status !== 'draft') action = 'Reverted';
    
    if (['Reverted', 'Voided', 'Disputed'].includes(action) && !reason) {
      return next(createApiError('A reason is required to revert, void, or dispute an invoice', 400, 'REASON_REQUIRED'));
    }

    const updateData = { status };
    if (status === 'paid') updateData.paid_at = new Date().toISOString();
    else updateData.paid_at = null;

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .select()
      .single();

    if (error) throw error;

    if (status === 'sent') {
      const { data: lines } = await supabase.from('invoice_line_items').select('source_id, source_type').eq('invoice_id', req.params.id);
      if (lines) {
        const matIds = lines.filter(i => i.source_type === 'material' && i.source_id).map(i => i.source_id);
        const labIds = lines.filter(i => i.source_type === 'labor' && i.source_id).map(i => i.source_id);
        if (matIds.length) await supabase.from('job_materials').update({ billing_status: 'billed' }).in('id', matIds);
        if (labIds.length) await supabase.from('job_hours').update({ billing_status: 'billed' }).in('id', labIds);
      }
    }
    
    if (status === 'voided') {
      const { data: lines } = await supabase.from('invoice_line_items').select('source_id, source_type').eq('invoice_id', req.params.id);
      if (lines) {
        const matIds = lines.filter(i => i.source_type === 'material' && i.source_id).map(i => i.source_id);
        const labIds = lines.filter(i => i.source_type === 'labor' && i.source_id).map(i => i.source_id);
        if (matIds.length) await supabase.from('job_materials').update({ billing_status: 'unbilled' }).in('id', matIds);
        if (labIds.length) await supabase.from('job_hours').update({ billing_status: 'unbilled' }).in('id', labIds);
      }
    }

    if (status === 'sent' && data.job_id) {
      const { data: job } = await supabase.from('jobs').select('status').eq('id', data.job_id).single();
      if (job && job.status !== 'completed') {
        await supabase.from('jobs').update({ status: 'completed' }).eq('id', data.job_id);
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

router.delete('/:id', async (req, res, next) => {
  try {
    const { data: existing, error: checkError } = await supabase
      .from('invoices')
      .select('status')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (checkError) throw checkError;
    if (existing.status !== 'draft') {
      return next(createApiError('Only draft invoices can be deleted', 403, 'INVOICE_NOT_DRAFT'));
    }

    const { data: items } = await supabase
      .from('invoice_line_items')
      .select('source_type, source_id')
      .eq('invoice_id', req.params.id)
      .not('source_id', 'is', null);

    if (items && items.length > 0) {
      const laborIds = items.filter(i => i.source_type === 'labor').map(i => i.source_id);
      const materialIds = items.filter(i => i.source_type === 'material').map(i => i.source_id);

      if (laborIds.length > 0) {
        await supabase.from('job_hours').update({ billing_status: 'unbilled' }).in('id', laborIds);
      }
      if (materialIds.length > 0) {
        await supabase.from('job_materials').update({ billing_status: 'unbilled' }).in('id', materialIds);
      }
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

router.get('/from-job/:jobId', async (req, res, next) => {
  try {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        clients(id, name, email, phone, address),
        rental_properties(id, address)
      `)
      .eq('id', req.params.jobId)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (jobError) throw jobError;

    const payload = {
      client_id: job.client_id,
      job_id: job.id,
      labor_title: job.title,
      labor_amount: 0,
      property_address: job.rental_properties?.address || job.clients?.address || ''
    };
    res.json({ success: true, data: payload });
  } catch (err) {
    next(err);
  }
});

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
