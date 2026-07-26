import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const jobSchema = z.object({
  client_id: z.string().uuid(),
  title: z.string().min(1, "Title is required"),
  rate_type: z.enum(['flat', 'hourly']),
  hourly_rate: z.number().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional().default('open'),
  description: z.string().optional() // Used as scope of work
});

const statusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled'])
});

const materialSchema = z.object({
  description: z.string().min(1, "Description is required"),
  cost: z.number().min(0),
  is_from_stock: z.boolean().optional().default(false)
});

router.get('/', async (req, res, next) => {
  try {
    const { client_id, status } = req.query;
    let query = supabase
      .from('jobs')
      .select('*, clients(name)')
      .eq('tenant_id', req.user.tenant_id);

    if (client_id) query = query.eq('client_id', client_id);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const result = jobSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }

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

router.patch('/:id/status', async (req, res, next) => {
  try {
    const result = statusSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }

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

// Materials sub-routes
router.post('/:id/materials', async (req, res, next) => {
  try {
    const result = materialSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }

    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const { data, error } = await supabase
      .from('job_materials')
      .insert([{ ...result.data, job_id: job.id }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/materials', async (req, res, next) => {
  try {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (jobError || !job) {
      return res.status(404).json({ success: false, error: 'Job not found' });
    }

    const { data, error } = await supabase
      .from('job_materials')
      .select('*')
      .eq('job_id', job.id);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

export default router;
