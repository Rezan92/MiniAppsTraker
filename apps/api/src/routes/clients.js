import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { createApiError } from '../middleware/errorHandler.js';
import { clientService } from '../services/domain/index.js';

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

    const { search, limit = 50, page = 1, offset } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const parsedOffset = offset !== undefined ? Math.max(parseInt(offset, 10) || 0, 0) : (Math.max(parseInt(page, 10) || 1, 1) - 1) * parsedLimit;

    let query = supabase
      .from('clients')
      .select('*')
      .eq('tenant_id', req.user.tenant_id)
      .range(parsedOffset, parsedOffset + parsedLimit - 1);

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
    const result = clientSchema.safeParse(req.body);
    if (!result.success) return next(result.error);

    const client = await clientService.createClient({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      clientData: result.data
    });

    res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const result = clientSchema.safeParse(req.body);
    if (!result.success) return next(result.error);

    const client = await clientService.updateClient({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      clientId: req.params.id,
      updateData: result.data
    });

    res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const result = clientSchema.partial().safeParse(req.body);
    if (!result.success) return next(result.error);

    const client = await clientService.updateClient({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      clientId: req.params.id,
      updateData: result.data
    });

    res.json({ success: true, data: client });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await clientService.deleteClient({
      tenantId: req.user.tenant_id,
      userId: req.user.id,
      clientId: req.params.id
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
