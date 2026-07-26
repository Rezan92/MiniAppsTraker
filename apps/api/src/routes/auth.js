import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});

// POST /api/auth/onboard-tenant
const onboardSchema = z.object({
  company_name: z.string().min(2, "Company name must be at least 2 characters")
});

router.post('/onboard-tenant', authenticate, async (req, res, next) => {
  try {
    const result = onboardSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }
    const { company_name } = result.data;

    if (req.user.tenant_id) {
      return res.status(400).json({ success: false, error: 'User is already associated with a tenant' });
    }

    // Insert new tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([{ company_name }])
      .select('id')
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Failed to create tenant: ${tenantError?.message || 'Unknown error'}`);
    }

    // Assign tenant to user and set role to admin
    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: req.user.id,
        email: req.user.email,
        tenant_id: tenant.id,
        role: 'admin'
      });

    if (userError) {
      throw new Error(`Failed to link user to tenant: ${userError.message}`);
    }

    res.json({
      success: true,
      data: {
        tenant_id: tenant.id,
        role: 'admin',
        message: 'Tenant successfully created and linked'
      }
    });

  } catch (err) {
    next(err);
  }
});

export default router;
