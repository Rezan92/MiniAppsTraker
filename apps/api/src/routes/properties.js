import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

const propertySchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  name: z.string().optional().nullable(),
  address: z.string().min(1, "Address is required"),
  notes: z.string().optional().nullable()
});

router.get('/', async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return res.status(400).json({ success: false, error: 'Tenant context missing' });
    }

    const { client_id } = req.query;
    let query = supabase
      .from('rental_properties')
      .select('*')
      .eq('tenant_id', req.user.tenant_id)
      .order('created_at', { ascending: false });

    if (client_id) {
      query = query.eq('client_id', client_id);
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

    const result = propertySchema.safeParse(req.body);
    if (!result.success) {
      const err = new Error(result.error.issues[0].message);
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const { client_id, name, address, notes } = result.data;

    // Verify client belongs to tenant
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (clientError || !clientData) {
      return res.status(404).json({ success: false, error: 'Client not found' });
    }

    const { data, error } = await supabase
      .from('rental_properties')
      .insert([{ tenant_id: req.user.tenant_id, client_id, name, address, notes }])
      .select();

    if (error) return next(error);

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

    const result = propertySchema.safeParse(req.body);
    if (!result.success) {
      const err = new Error(result.error.issues[0].message);
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return next(err);
    }

    const { name, address, notes } = result.data;

    const { data, error } = await supabase
      .from('rental_properties')
      .update({ name, address, notes })
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .select();

    if (error) return next(error);
    if (!data || data.length === 0) {
      return res.status(404).json({ success: false, error: 'Property not found' });
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

    const { error } = await supabase
      .from('rental_properties')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id);

    if (error) return next(error);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
