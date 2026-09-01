import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const jobSchema = z.object({
  client_id: z.string().uuid(),
  property_id: z.string().uuid().optional().nullable().or(z.literal('')).transform(val => val || null),
  title: z.string().min(1, "Title is required"),
  rate_type: z.enum(['flat', 'hourly']),
  hourly_rate: z.number().optional().nullable(),
  flat_rate: z.number().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional().default('open'),
  start_date: z.string().optional().nullable().or(z.literal('')).transform(val => val || null),
  end_date: z.string().optional().nullable().or(z.literal('')).transform(val => val || null),
  notes: z.string().optional().nullable().or(z.literal('')).transform(val => val || null)
});

const statusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'completed', 'on_hold', 'cancelled'])
});

const materialSchema = z.object({
  description: z.string().min(1, "Description is required"),
  cost: z.number().min(0),
  is_from_stock: z.boolean().optional().default(false),
  store: z.string().optional(),
  purchase_date: z.string().optional(),
  notes: z.string().optional()
});

const jobHoursSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hours: z.number().min(0, "Hours must be positive"),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  description: z.string().min(1, "Description is required")
});

router.get('/', async (req, res, next) => {
  try {
    const { client_id, property_id, status } = req.query;
    let query = supabase
      .from('jobs')
      .select('*, clients(name), rental_properties(name, address), invoices(id, status, invoice_number)')
      .eq('tenant_id', req.user.tenant_id);

    if (client_id) query = query.eq('client_id', client_id);
    if (property_id) query = query.eq('property_id', property_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('jobs')
      .select('*, clients(name), invoices(id, status, invoice_number)')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ success: false, error: 'Job not found' });
      throw error;
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = jobSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, error: result.error.issues[0].message });

    const { data, error } = await supabase
      .from('jobs')
      .insert([{ ...result.data, tenant_id: req.user.tenant_id }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = jobSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, error: result.error.issues[0].message });

    const { data, error } = await supabase
      .from('jobs')
      .update(result.data)
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

router.patch('/:id/status', async (req, res, next) => {
  try {
    const result = statusSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, error: result.error.issues[0].message });

    const { data, error } = await supabase
      .from('jobs')
      .update({ status: result.data.status })
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

router.post('/:id/materials', async (req, res, next) => {
  try {
    const result = materialSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, error: result.error.errors[0].message });

    const { data: job, error: jobError } = await supabase.from('jobs').select('id').eq('id', req.params.id).eq('tenant_id', req.user.tenant_id).single();
    if (jobError || !job) return res.status(404).json({ success: false, error: 'Job not found' });

    const payload = { ...result.data, job_id: job.id };
    
    const { data, error } = await supabase.from('job_materials').insert([payload]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/:id/materials', async (req, res, next) => {
  try {
    const { data: job, error: jobError } = await supabase.from('jobs').select('id').eq('id', req.params.id).eq('tenant_id', req.user.tenant_id).single();
    if (jobError || !job) return res.status(404).json({ success: false, error: 'Job not found' });

    let query = supabase.from('job_materials').select('*').eq('job_id', job.id);
    if (req.query.billing_status) {
      query = query.in('billing_status', req.query.billing_status.split(','));
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch('/:id/materials/:materialId', async (req, res, next) => {
  try {
    const result = materialSchema.safeParse(req.body);
    if (!result.success) return res.status(400).json({ success: false, error: result.error.errors[0].message });

    const { data: job, error: jobError } = await supabase.from('jobs').select('id').eq('id', req.params.id).eq('tenant_id', req.user.tenant_id).single();
    if (jobError || !job) return res.status(404).json({ success: false, error: 'Job not found' });

    const { data: existing } = await supabase.from('job_materials').select('billing_status').eq('id', req.params.materialId).single();
    if (existing && existing.billing_status === 'billed') {
      return res.status(403).json({ success: false, error: 'Cannot modify items that have already been billed.' });
    }

    const { data, error } = await supabase.from('job_materials').update(result.data).eq('id', req.params.materialId).eq('job_id', job.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/:id/materials/:materialId', async (req, res, next) => {
  try {
    const { data: job, error: jobError } = await supabase.from('jobs').select('id').eq('id', req.params.id).eq('tenant_id', req.user.tenant_id).single();
    if (jobError || !job) return res.status(404).json({ success: false, error: 'Job not found' });

    const { data: existing } = await supabase.from('job_materials').select('billing_status').eq('id', req.params.materialId).single();
    if (existing && existing.billing_status === 'billed') {
      return res.status(403).json({ success: false, error: 'Cannot modify items that have already been billed.' });
    }

    const { error } = await supabase.from('job_materials').delete().eq('id', req.params.materialId).eq('job_id', job.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/:id/hours', async (req, res, next) => {
  try {
    const result = jobHoursSchema.safeParse(req.body);
    if (!result.success) {
      const err = new Error(result.error.errors[0].message);
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const { data: job, error: jobError } = await supabase.from('jobs').select('id').eq('id', req.params.id).eq('tenant_id', req.user.tenant_id).single();
    if (jobError || !job) return res.status(404).json({ success: false, error: 'Job not found' });

    const payload = { ...result.data, job_id: job.id };

    const { data, error } = await supabase.from('job_hours').insert([payload]).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/:id/hours', async (req, res, next) => {
  try {
    const { data: job, error: jobError } = await supabase.from('jobs').select('id').eq('id', req.params.id).eq('tenant_id', req.user.tenant_id).single();
    if (jobError || !job) return res.status(404).json({ success: false, error: 'Job not found' });

    let query = supabase.from('job_hours').select('*').eq('job_id', job.id).order('date', { ascending: false });
    if (req.query.billing_status) {
      query = query.in('billing_status', req.query.billing_status.split(','));
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch('/:id/hours/:hourId', async (req, res, next) => {
  try {
    const result = jobHoursSchema.safeParse(req.body);
    if (!result.success) {
      const err = new Error(result.error.errors[0].message);
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const { data: job, error: jobError } = await supabase.from('jobs').select('id').eq('id', req.params.id).eq('tenant_id', req.user.tenant_id).single();
    if (jobError || !job) return res.status(404).json({ success: false, error: 'Job not found' });

    const { data: existing } = await supabase.from('job_hours').select('billing_status').eq('id', req.params.hourId).single();
    if (existing && existing.billing_status === 'billed') {
      return res.status(403).json({ success: false, error: 'Cannot modify items that have already been billed.' });
    }

    const { data, error } = await supabase.from('job_hours').update(result.data).eq('id', req.params.hourId).eq('job_id', job.id).select().single();
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/:id/hours/:hourId', async (req, res, next) => {
  try {
    const { data: job, error: jobError } = await supabase.from('jobs').select('id').eq('id', req.params.id).eq('tenant_id', req.user.tenant_id).single();
    if (jobError || !job) return res.status(404).json({ success: false, error: 'Job not found' });

    const { data: existing } = await supabase.from('job_hours').select('billing_status').eq('id', req.params.hourId).single();
    if (existing && existing.billing_status === 'billed') {
      return res.status(403).json({ success: false, error: 'Cannot modify items that have already been billed.' });
    }

    const { error } = await supabase.from('job_hours').delete().eq('id', req.params.hourId).eq('job_id', job.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { data: invoices } = await supabase.from('invoices').select('status').eq('job_id', req.params.id).eq('tenant_id', req.user.tenant_id);
    if (invoices && invoices.some(inv => inv.status === 'paid' || inv.status === 'in_progress')) {
      return res.status(403).json({ success: false, error: 'Cannot delete a job that has paid or in-progress invoices.' });
    }
    const { error } = await supabase.from('jobs').delete().eq('id', req.params.id).eq('tenant_id', req.user.tenant_id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
