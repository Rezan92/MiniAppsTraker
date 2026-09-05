import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { createApiError } from '../middleware/errorHandler.js';
import { invoiceService } from '../services/domain/index.js';

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

router.get('/', async (req, res, next) => {
  try {
    const { status, client_id, property_id, from_date, to_date, job_id, limit = 50, page = 1, offset } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const parsedOffset = offset !== undefined ? Math.max(parseInt(offset, 10) || 0, 0) : (Math.max(parseInt(page, 10) || 1, 1) - 1) * parsedLimit;
    
    let query = supabase
      .from('invoices')
      .select('*, clients(name, email, phone)')
      .eq('tenant_id', req.user.tenant_id)
      .order('created_at', { ascending: false })
      .range(parsedOffset, parsedOffset + parsedLimit - 1);

    if (status) query = query.eq('status', status);
    if (client_id) query = query.eq('client_id', client_id);
    if (property_id) query = query.eq('property_id', property_id);
    if (job_id) query = query.eq('job_id', job_id);
    if (from_date) query = query.gte('invoice_date', from_date);
    if (to_date) query = query.lte('invoice_date', to_date);

    const { data, error } = await query;
    if (error) throw error;

    res.json({ success: true, data: data || [] });
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

    const invoice = await invoiceService.createInvoice({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      invoiceData: result.data
    });

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

    const { line_items, ...updateData } = result.data;
    const invoice = await invoiceService.updateInvoiceDraft({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      invoiceId: req.params.id,
      updateData,
      lineItems: line_items
    });

    res.json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/items', async (req, res, next) => {
  try {
    const result = lineItemSchema.safeParse(req.body);
    if (!result.success) return next(result.error);

    const { item } = await invoiceService.addInvoiceLineItem({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      invoiceId: req.params.id,
      itemData: result.data
    });

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/items/:itemId', async (req, res, next) => {
  try {
    const result = lineItemUpdateSchema.safeParse(req.body);
    if (!result.success) return next(result.error);

    const item = await invoiceService.updateInvoiceLineItem({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      invoiceId: req.params.id,
      itemId: req.params.itemId,
      updateData: result.data
    });

    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/items/:itemId', async (req, res, next) => {
  try {
    await invoiceService.deleteInvoiceLineItem({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      invoiceId: req.params.id,
      itemId: req.params.itemId
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const result = statusSchema.safeParse(req.body);
    if (!result.success) {
      return next(result.error);
    }

    const { status, reason } = result.data;
    const updatedInvoice = await invoiceService.updateInvoiceStatus({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      invoiceId: req.params.id,
      status,
      reason
    });

    res.json({ success: true, data: updatedInvoice });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/internal-notes', async (req, res, next) => {
  try {
    const { internal_notes } = req.body;
    const data = await invoiceService.updateInternalNotes({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      invoiceId: req.params.id,
      internalNotes: internal_notes
    });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await invoiceService.deleteDraftInvoice({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      invoiceId: req.params.id
    });

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
