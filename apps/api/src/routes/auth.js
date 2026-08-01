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

// GET /api/auth/workspaces
router.get('/workspaces', authenticate, async (req, res, next) => {
  try {
    const { data: members, error } = await supabase
      .from('tenant_members')
      .select('role, tenants(id, name, logo_url)')
      .eq('user_id', req.user.id)
      .eq('status', 'active');

    if (error) throw error;

    const workspaces = members.map(m => ({
      tenant_id: m.tenants.id,
      name: m.tenants.name,
      logo_url: m.tenants.logo_url,
      role: m.role
    }));

    res.json({ success: true, data: workspaces });
  } catch (err) {
    next(err);
  }
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

    // Enforce 5 workspace limit for admins
    const { count, error: countError } = await supabase
      .from('tenant_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .eq('role', 'admin');

    if (countError) throw countError;
    if (count >= 5) {
      return res.status(403).json({ success: false, error: 'Maximum limit of 5 workspaces reached.' });
    }

    // Check for duplicate workspace name by this user
    const { data: duplicate, error: dupError } = await supabase
      .from('tenant_members')
      .select('tenants!inner(name)')
      .eq('user_id', req.user.id)
      .eq('role', 'admin')
      .ilike('tenants.name', name)
      .maybeSingle();

    if (dupError) throw dupError;
    if (duplicate) {
      return res.status(400).json({ success: false, error: 'You already have a workspace with this name.' });
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

// GET /api/auth/workspaces/:id
router.get('/workspaces/:id', authenticate, async (req, res, next) => {
  try {
    const tenant_id = req.params.id;

    // Verify user belongs to this tenant
    const { data: member, error: memError } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', req.user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (memError || !member) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', tenant_id)
      .single();

    if (tenantError) {
      return res.status(404).json({ success: false, error: 'Workspace not found' });
    }

    res.json({ success: true, data: tenant });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/workspaces/:id
router.patch('/workspaces/:id', authenticate, async (req, res, next) => {
  try {
    const tenant_id = req.params.id;
    const { name, address, phone, timezone } = req.body;

    // Verify user is an admin of this tenant
    const { data: member, error: memError } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', req.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (memError || !member) {
      return res.status(403).json({ success: false, error: 'You do not have permission to update this workspace' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ success: false, error: 'Business name is required' });
    }

    // Sanitize unique optional fields like phone: mapping empty strings to NULL
    const sanitizedPhone = phone === '' ? null : phone;

    const { data: updatedTenant, error: updateError } = await supabase
      .from('tenants')
      .update({ 
        name: name.trim(), 
        address, 
        phone: sanitizedPhone, 
        timezone: timezone || 'UTC' 
      })
      .eq('id', tenant_id)
      .select('*')
      .single();

    if (updateError) {
      throw new Error(`Failed to update workspace: ${updateError.message}`);
    }

    res.json({
      success: true,
      data: updatedTenant,
      message: 'Workspace updated successfully'
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/workspaces/:id
router.delete('/workspaces/:id', authenticate, async (req, res, next) => {
  try {
    const tenant_id = req.params.id;

    // Verify user is an admin of this tenant
    const { data: member, error: memError } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', req.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (memError || !member) {
      return res.status(403).json({ success: false, error: 'You do not have permission to delete this workspace' });
    }

    // Delete the tenant (cascade handles all related records)
    const { error: deleteError } = await supabase
      .from('tenants')
      .delete()
      .eq('id', tenant_id);

    if (deleteError) {
      throw new Error(`Failed to delete workspace: ${deleteError.message}`);
    }

    // Nullify active tenant ID for any users who had this active
    await supabase
      .from('users')
      .update({ last_active_tenant_id: null })
      .eq('last_active_tenant_id', tenant_id);

    res.json({
      success: true,
      message: 'Workspace permanently deleted'
    });

  } catch (err) {
    next(err);
  }
});

export default router;
