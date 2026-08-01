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

// POST /api/auth/onboarding
const onboardSchema = z.object({
  name: z.string().min(2, "Business name must be at least 2 characters"),
  phone: z.string().optional(),
  address: z.string().optional()
});

router.post('/onboarding', authenticate, async (req, res, next) => {
  try {
    const result = onboardSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }
    const { name, phone, address } = result.data;

    // Check if user already has an active tenant
    if (req.user.tenant_id) {
      return res.status(400).json({ success: false, error: 'User is already associated with an active tenant workspace' });
    }

    // 1. Create the tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([{ name, phone, address }])
      .select('id')
      .single();

    if (tenantError || !tenant) {
      throw new Error(`Failed to create business profile: ${tenantError?.message || 'Unknown error'}`);
    }

    // 2. Create the tenant_members record linking user as admin
    const { error: memberError } = await supabase
      .from('tenant_members')
      .insert([{ tenant_id: tenant.id, user_id: req.user.id, role: 'admin' }]);
    
    if (memberError) {
      throw new Error(`Failed to link user to business: ${memberError.message}`);
    }

    // 3. Set users.last_active_tenant_id
    const { error: userError } = await supabase
      .from('users')
      .update({ last_active_tenant_id: tenant.id })
      .eq('id', req.user.id);

    if (userError) {
      throw new Error(`Failed to update active workspace: ${userError.message}`);
    }

    res.json({
      success: true,
      data: {
        tenant_id: tenant.id,
        role: 'admin',
        message: 'Business profile successfully created'
      }
    });

  } catch (err) {
    next(err);
  }
});

// POST /api/auth/switch-workspace
router.post('/switch-workspace', authenticate, async (req, res, next) => {
  try {
    const { target_tenant_id } = req.body;
    if (!target_tenant_id) {
      return res.status(400).json({ success: false, error: 'target_tenant_id is required' });
    }

    // Verify user belongs to this tenant
    const { data: member, error: memError } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', target_tenant_id)
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (memError || !member) {
      return res.status(403).json({ success: false, error: 'Access denied to this workspace' });
    }

    // Update last_active_tenant_id
    const { error: updateError } = await supabase
      .from('users')
      .update({ last_active_tenant_id: target_tenant_id })
      .eq('id', req.user.id);

    if (updateError) {
      throw new Error(`Failed to switch workspace: ${updateError.message}`);
    }

    res.json({
      success: true,
      data: {
        tenant_id: target_tenant_id,
        role: member.role,
        message: 'Switched workspace successfully'
      }
    });

  } catch (err) {
    next(err);
  }
});

export default router;
