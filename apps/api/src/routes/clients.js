import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional()
});

router.get('/', async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return res.status(400).json({ success: false, error: 'Tenant context missing' });
    }

    const { search } = req.query;
    let query = supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', req.user.tenant_id);

    if (search) {
      query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) return next(error);

    res.json({ success: true, data: data || [] });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return res.status(400).json({ success: false, error: 'Tenant context missing' });
    }

    const result = clientSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }

    const { name, email, phone, address, notes } = result.data;

    const { data, error } = await supabase
      .from('clients')
      .insert([{ name, email, phone, address, notes, tenant_id: req.user.tenant_id }])
      .select();

    if (error) return next(error);
    if (!data || data.length === 0) {
      return res.status(500).json({ success: false, error: 'Failed to create client record' });
    }

    res.json({ success: true, data: data[0] });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return res.status(400).json({ success: false, error: 'Tenant context missing' });
    }

    const result = clientSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }

    const { name, email, phone, address, notes } = result.data;

    const { data, error } = await supabase
      .from('clients')
      .update({ name, email, phone, address, notes })
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .select();

    if (error) return next(error);
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found or update failed' });
    }

    res.json({ success: true, data: data[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return res.status(400).json({ success: false, error: 'Tenant context missing' });
    }

    const { data, error } = await supabase
      .from('clients')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .select();

    if (error) return next(error);
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Client not found or already deleted' });
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
