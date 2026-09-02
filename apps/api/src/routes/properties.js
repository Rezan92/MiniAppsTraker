import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { createApiError } from '../middleware/errorHandler.js';

const router = express.Router();
router.use(authenticate);

const propertySchema = z.object({
  client_id: z.string().uuid("Invalid client ID"),
  name: z.string().optional().nullable(),
  address: z.string().min(1, "Address is required"),
  renter_name: z.string().optional().nullable(),
  renter_phone: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
}).strict();

const propertyUpdateSchema = propertySchema.omit({ client_id: true }).partial().strict();

router.get('/', async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
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

router.get('/:id', async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const { data, error } = await supabase
      .from('rental_properties')
      .select('*, clients(id, name, company_name, phone)')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return next(createApiError('Property not found', 404, 'NOT_FOUND'));
      }
      return next(error);
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const result = propertySchema.safeParse(req.body);
    if (!result.success) {
      return next(result.error);
    }

    const { client_id, name, address, renter_name, renter_phone, notes } = result.data;

    // Verify client belongs to tenant
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', client_id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (clientError || !clientData) {
      return next(createApiError('Client not found', 404, 'NOT_FOUND'));
    }

    const { data, error } = await supabase
      .from('rental_properties')
      .insert([{ tenant_id: req.user.tenant_id, client_id, name, address, renter_name, renter_phone, notes }])
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
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const result = propertyUpdateSchema.safeParse(req.body);
    if (!result.success) {
      return next(result.error);
    }

    const { data, error } = await supabase
      .from('rental_properties')
      .update(result.data)
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .select();

    if (error) return next(error);
    if (!data || data.length === 0) {
      return next(createApiError('Property not found', 404, 'NOT_FOUND'));
    }

    res.json({ success: true, data: data[0] });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const { data, error } = await supabase
      .from('rental_properties')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .select();

    if (error) return next(error);
    if (!data || data.length === 0) {
      return next(createApiError('Property not found or already deleted', 404, 'NOT_FOUND'));
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
