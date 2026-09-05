import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { createApiError } from '../middleware/errorHandler.js';
import { jobService } from '../services/domain/index.js';

const router = express.Router();
router.use(authenticate);

const jobSchema = z.object({
  client_id: z.string().uuid('Invalid client ID'),
  property_id: z.string().uuid('Invalid property ID').optional().nullable().or(z.literal('')).transform(val => val || null),
  title: z.string().min(1, "Title is required"),
  rate_type: z.enum(['flat', 'hourly']),
  hourly_rate: z.number().optional().nullable(),
  flat_rate: z.number().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'completed', 'on_hold', 'cancelled']).optional().default('open'),
  start_date: z.string().optional().nullable().or(z.literal('')).transform(val => val || null),
  end_date: z.string().optional().nullable().or(z.literal('')).transform(val => val || null),
  notes: z.string().optional().nullable().or(z.literal('')).transform(val => val || null)
}).strict();

const jobPatchSchema = jobSchema.partial();

const statusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'completed', 'on_hold', 'cancelled'])
}).strict();

const materialSchema = z.object({
  description: z.string().min(1, "Description is required"),
  cost: z.number().min(0, "Cost must be a positive number"),
  is_from_stock: z.boolean().optional().default(false),
  store: z.string().optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
}).strict();

const jobHoursSchema = z.object({
  date: z.string().min(1, "Date is required"),
  hours: z.number().min(0, "Hours must be positive"),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  description: z.string().min(1, "Description is required")
}).strict();

router.get('/', async (req, res, next) => {
  try {
    const { client_id, property_id, status, limit = 50, page = 1, offset } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const parsedOffset = offset !== undefined ? Math.max(parseInt(offset, 10) || 0, 0) : (Math.max(parseInt(page, 10) || 1, 1) - 1) * parsedLimit;

    let query = supabase
      .from('jobs')
      .select('*, clients(name), rental_properties(name, address), invoices(id, status, invoice_number)')
      .eq('tenant_id', req.user.tenant_id)
      .range(parsedOffset, parsedOffset + parsedLimit - 1);

    if (client_id) query = query.eq('client_id', client_id);
    if (property_id) query = query.eq('property_id', property_id);
    if (status) query = query.eq('status', status);

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
      .from('jobs')
      .select('*, clients(name), invoices(id, status, invoice_number)')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return next(createApiError('Job not found', 404, 'NOT_FOUND'));
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
    if (!result.success) return next(result.error);

    const data = await jobService.createJob({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      jobData: result.data
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = jobSchema.safeParse(req.body);
    if (!result.success) return next(result.error);

    const data = await jobService.updateJob({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      jobId: req.params.id,
      updateData: result.data
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const result = jobPatchSchema.safeParse(req.body);
    if (!result.success) return next(result.error);

    const data = await jobService.updateJob({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      jobId: req.params.id,
      updateData: result.data
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    const result = statusSchema.safeParse(req.body);
    if (!result.success) return next(result.error);

    const data = await jobService.updateJobStatus({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      jobId: req.params.id,
      status: result.data.status
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/materials', async (req, res, next) => {
  try {
    const result = materialSchema.safeParse(req.body);
    if (!result.success) return next(result.error);

    const data = await jobService.logJobMaterials({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      jobId: req.params.id,
      materialData: result.data
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/:id/materials', async (req, res, next) => {
  try {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();
      
    if (jobError || !job) return next(createApiError('Job not found', 404, 'NOT_FOUND'));

    let query = supabase.from('job_materials').select('*').eq('job_id', job.id);
    if (req.query.billing_status) {
      query = query.in('billing_status', req.query.billing_status.split(','));
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
});

router.patch('/:id/materials/:materialId', async (req, res, next) => {
  try {
    const result = materialSchema.partial().safeParse(req.body);
    if (!result.success) return next(result.error);

    const data = await jobService.updateJobMaterials({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      jobId: req.params.id,
      materialId: req.params.materialId,
      updateData: result.data
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/:id/materials/:materialId', async (req, res, next) => {
  try {
    await jobService.deleteJobMaterials({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      jobId: req.params.id,
      materialId: req.params.materialId
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.post('/:id/hours', async (req, res, next) => {
  try {
    const result = jobHoursSchema.safeParse(req.body);
    if (!result.success) return next(result.error);

    const data = await jobService.logJobHours({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      jobId: req.params.id,
      hoursData: result.data
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get('/:id/hours', async (req, res, next) => {
  try {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();
      
    if (jobError || !job) return next(createApiError('Job not found', 404, 'NOT_FOUND'));

    let query = supabase.from('job_hours').select('*').eq('job_id', job.id).order('date', { ascending: false });
    if (req.query.billing_status) {
      query = query.in('billing_status', req.query.billing_status.split(','));
    }
    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (err) { next(err); }
});

router.patch('/:id/hours/:hourId', async (req, res, next) => {
  try {
    const result = jobHoursSchema.partial().safeParse(req.body);
    if (!result.success) return next(result.error);

    const data = await jobService.updateJobHours({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      jobId: req.params.id,
      hourId: req.params.hourId,
      updateData: result.data
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.delete('/:id/hours/:hourId', async (req, res, next) => {
  try {
    await jobService.deleteJobHours({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      jobId: req.params.id,
      hourId: req.params.hourId
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await jobService.deleteJob({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      jobId: req.params.id
    });
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
