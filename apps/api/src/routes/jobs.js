import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const jobSchema = z.object({
  client_id: z.string().uuid(),
  property_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1, "Title is required"),
  rate_type: z.enum(['flat', 'hourly']),
  hourly_rate: z.number().optional(),
  flat_rate: z.number().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional().default('open'),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  notes: z.string().optional()
});

const statusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled'])
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
  description: z.string().optional()
});

async function syncJobToDraftInvoice(jobId, tenantId) {
  try {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('id, status')
      .eq('job_id', jobId)
      .eq('tenant_id', tenantId)
      .eq('status', 'draft')
      .single();
      
    if (!invoice) return;

    const { data: job } = await supabase.from('jobs').select('hourly_rate, flat_rate, rate_type, title').eq('id', jobId).single();
    const { data: hours } = await supabase.from('job_hours').select('*').eq('job_id', jobId);
    const { data: materials } = await supabase.from('job_materials').select('*').eq('job_id', jobId);

    const totalHours = (hours || []).reduce((sum, h) => sum + Number(h.hours), 0);
    const laborAmount = job.rate_type === 'hourly' ? totalHours * (job.hourly_rate || 0) : (job.flat_rate || 0);
    const materialsAmount = (materials || []).reduce((sum, m) => sum + Number(m.cost), 0);
    const totalAmount = laborAmount + materialsAmount;

    await supabase.from('invoices')
      .update({ labor_amount: laborAmount, materials_amount: materialsAmount, total_amount: totalAmount })
      .eq('id', invoice.id);

    await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id);
    
    const itemsToInsert = [];
    let sortOrder = 0;
    
    itemsToInsert.push({
      invoice_id: invoice.id,
      type: 'labor_detail',
      description: job.rate_type === 'hourly' ? `${job.title} - ${totalHours} hours` : `${job.title} - Flat Rate`,
      sort_order: sortOrder++
    });
    
    for (const m of (materials || [])) {
      itemsToInsert.push({
        invoice_id: invoice.id,
        type: 'material',
        description: m.description,
        total_price: m.cost,
        sort_order: sortOrder++
      });
    }

    if (itemsToInsert.length > 0) {
      await supabase.from('invoice_items').insert(itemsToInsert);
    }
  } catch (err) {
    console.error('Failed to sync job to draft invoice:', err);
  }
}

router.get('/', async (req, res, next) => {
  try {
    const { client_id, property_id, status } = req.query;
    let query = supabase
      .from('jobs')
      .select('*, clients(name), rental_properties(name, address), invoices(id)')
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
      .select('*, clients(name)')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ success: false, error: 'Job not found' });
      }
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
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
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

router.put('/:id', async (req, res, next) => {
  try {
    const result = jobSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
    }

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
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.issues[0].message });
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
    
    // Sync to draft invoice
    await syncJobToDraftInvoice(job.id, req.user.tenant_id);

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

router.patch('/:id/materials/:materialId', async (req, res, next) => {
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
      .update(result.data)
      .eq('id', req.params.materialId)
      .eq('job_id', job.id)
      .select()
      .single();

    if (error) throw error;
    
    // Sync to draft invoice
    await syncJobToDraftInvoice(job.id, req.user.tenant_id);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/materials/:materialId', async (req, res, next) => {
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

    const { error } = await supabase
      .from('job_materials')
      .delete()
      .eq('id', req.params.materialId)
      .eq('job_id', job.id);

    if (error) throw error;
    
    // Sync to draft invoice
    await syncJobToDraftInvoice(job.id, req.user.tenant_id);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Job Hours sub-routes
router.post('/:id/hours', async (req, res, next) => {
  try {
    const result = jobHoursSchema.safeParse(req.body);
    if (!result.success) {
      const err = new Error(result.error.errors[0].message);
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
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
      .from('job_hours')
      .insert([{ ...result.data, job_id: job.id }])
      .select()
      .single();

    if (error) throw error;
    
    // Sync to draft invoice
    await syncJobToDraftInvoice(job.id, req.user.tenant_id);
    
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/hours', async (req, res, next) => {
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
      .from('job_hours')
      .select('*')
      .eq('job_id', job.id)
      .order('date', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
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
      .from('job_hours')
      .update(result.data)
      .eq('id', req.params.hourId)
      .eq('job_id', job.id)
      .select()
      .single();

    if (error) throw error;
    
    // Sync to draft invoice
    await syncJobToDraftInvoice(job.id, req.user.tenant_id);
    
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/hours/:hourId', async (req, res, next) => {
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

    const { error } = await supabase
      .from('job_hours')
      .delete()
      .eq('id', req.params.hourId)
      .eq('job_id', job.id);

    if (error) throw error;
    
    // Sync to draft invoice
    await syncJobToDraftInvoice(job.id, req.user.tenant_id);
    
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
