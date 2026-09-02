import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { createApiError } from '../middleware/errorHandler.js';

const router = express.Router();
router.use(authenticate);

const clientSchema = z.object({
  name: z.string().min(1, "Name is required").regex(/^[a-zA-Z\s\-\']+$/, "Full name cannot contain numbers"),
  client_type: z.enum(['residential', 'commercial', 'property_manager']).default('residential'),
  company_name: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().regex(/^\+?[\d\s\-\(\)]+$/, "Phone number must contain only numbers and formatting characters").optional().nullable(),
  address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active')
}).strict();

router.get('/', async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
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

router.get('/:id', async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return next(createApiError('Client not found', 404, 'NOT_FOUND'));
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

    const result = clientSchema.safeParse(req.body);
    if (!result.success) {
      return next(result.error);
    }

    const { name, client_type, company_name, email, phone, address, notes, status } = result.data;
    const cleanEmail = email?.trim() ? email.trim() : null;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

    const { data, error } = await supabase
      .from('clients')
      .insert([{ name, client_type, company_name, email: cleanEmail, phone: cleanPhone, address, notes, status, tenant_id: req.user.tenant_id }])
      .select();

    if (error) return next(error);
    if (!data || data.length === 0) {
      return next(createApiError('Failed to create client record', 500, 'DATABASE_ERROR'));
    }

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

    const result = clientSchema.safeParse(req.body);
    if (!result.success) {
      return next(result.error);
    }

    const { name, client_type, company_name, email, phone, address, notes, status } = result.data;
    const cleanEmail = email?.trim() ? email.trim() : null;
    const cleanPhone = phone ? phone.replace(/\D/g, '') : null;

    const { data, error } = await supabase
      .from('clients')
      .update({ name, client_type, company_name, email: cleanEmail, phone: cleanPhone, address, notes, status })
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .select();

    if (error) return next(error);
    if (!data || data.length === 0) {
      return next(createApiError('Client not found or update failed', 404, 'NOT_FOUND'));
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
      .from('clients')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id)
      .select();

    if (error) return next(error);
    if (!data || data.length === 0) {
      return next(createApiError('Client not found or already deleted', 404, 'NOT_FOUND'));
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
