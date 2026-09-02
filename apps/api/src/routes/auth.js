import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { createApiError } from '../middleware/errorHandler.js';

const router = express.Router();
router.use(authLimiter);

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
    const { name, address, phone, timezone, business_tagline, payment_method, payment_details } = req.body;

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
        timezone: timezone || 'UTC',
        business_tagline: business_tagline || null,
        payment_method: payment_method || null,
        payment_details: payment_details || null
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

// GET /api/auth/workspaces/:id/members - List members of a workspace
router.get('/workspaces/:id/members', authenticate, async (req, res, next) => {
  try {
    const tenant_id = req.params.id;

    // Verify requesting user is a member of this workspace
    const { data: memberCheck, error: checkError } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (checkError || !memberCheck) {
      return next(createApiError('Access denied: You are not a member of this workspace', 403, 'FORBIDDEN'));
    }

    const { data: members, error } = await supabase
      .from('tenant_members')
      .select('id, user_id, role, status, created_at, users(id, email, full_name, first_name, last_name, phone, avatar_url)')
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formatted = (members || []).map(m => {
      const u = m.users || {};
      const name = u.full_name || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Team Member';
      return {
        membership_id: m.id,
        user_id: m.user_id,
        role: m.role,
        status: m.status,
        joined_at: m.created_at,
        email: u.email || 'N/A',
        name,
        phone: u.phone || null,
        avatar_url: u.avatar_url || null
      };
    });

    res.json({ success: true, data: formatted });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/workspaces/:id/members/:userId - Update member role (Admin only)
router.patch('/workspaces/:id/members/:userId', authenticate, async (req, res, next) => {
  try {
    const { id: tenant_id, userId: target_user_id } = req.params;
    const { role } = req.body;

    // Verify caller is admin of this workspace
    const { data: callerMember, error: callerErr } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', req.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (callerErr || !callerMember) {
      return next(createApiError('Only administrators can modify member roles', 403, 'FORBIDDEN'));
    }

    if (!['admin', 'employee'].includes(role)) {
      return next(createApiError('Role must be admin or employee', 400, 'VALIDATION_ERROR'));
    }

    // If demoting an admin, ensure at least one other admin remains
    if (role === 'employee') {
      const { data: admins, error: adminErr } = await supabase
        .from('tenant_members')
        .select('id, user_id')
        .eq('tenant_id', tenant_id)
        .eq('role', 'admin')
        .eq('status', 'active');

      if (adminErr) throw adminErr;
      if (admins && admins.length <= 1 && admins.some(a => a.user_id === target_user_id)) {
        return next(createApiError('Cannot demote the only administrator of the workspace', 400, 'LAST_ADMIN_PROTECTED'));
      }
    }

    const { data: updated, error: updateErr } = await supabase
      .from('tenant_members')
      .update({ role })
      .eq('tenant_id', tenant_id)
      .eq('user_id', target_user_id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    res.json({ success: true, data: updated, message: 'Member role updated successfully' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/auth/workspaces/:id/members/:userId - Remove member from workspace (Admin only)
router.delete('/workspaces/:id/members/:userId', authenticate, async (req, res, next) => {
  try {
    const { id: tenant_id, userId: target_user_id } = req.params;

    // Verify caller is admin of this workspace
    const { data: callerMember, error: callerErr } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', tenant_id)
      .eq('user_id', req.user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (callerErr || !callerMember) {
      return next(createApiError('Only administrators can remove team members', 403, 'FORBIDDEN'));
    }

    // Prevent removing the sole admin
    const { data: admins, error: adminErr } = await supabase
      .from('tenant_members')
      .select('id, user_id')
      .eq('tenant_id', tenant_id)
      .eq('role', 'admin')
      .eq('status', 'active');

    if (adminErr) throw adminErr;
    if (admins && admins.length <= 1 && admins.some(a => a.user_id === target_user_id)) {
      return next(createApiError('Cannot remove the only administrator of the workspace', 400, 'LAST_ADMIN_PROTECTED'));
    }

    const { error: deleteErr } = await supabase
      .from('tenant_members')
      .delete()
      .eq('tenant_id', tenant_id)
      .eq('user_id', target_user_id);

    if (deleteErr) throw deleteErr;

    // If user's active tenant was this one, reset it
    await supabase
      .from('users')
      .update({ last_active_tenant_id: null })
      .eq('id', target_user_id)
      .eq('last_active_tenant_id', tenant_id);

    res.json({ success: true, message: 'Member removed from workspace' });
  } catch (err) {
    next(err);
  }
});

export default router;
