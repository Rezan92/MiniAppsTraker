import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';
import { inviteLimiter } from '../middleware/rateLimiter.js';
import { createApiError } from '../middleware/errorHandler.js';

const router = express.Router();
router.use(inviteLimiter);

const inviteSchema = z.object({
  email: z.string().email('Please provide a valid email address'),
  role: z.enum(['admin', 'employee']).default('employee')
}).strict();

// GET /api/invitations - List invitations for current tenant (Admin only)
router.get('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const { data: invitations, error } = await supabase
      .from('invitations')
      .select('id, email, role, status, expires_at, created_at, token')
      .eq('tenant_id', req.user.tenant_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const rawOrigin = process.env.CLIENT_URL || process.env.APP_URL || req.headers.origin || 'http://localhost:5173';
    const clientUrl = rawOrigin.replace(/\/+$/, '');

    const enriched = (invitations || []).map(inv => ({
      ...inv,
      joinUrl: `${clientUrl}/join/${inv.token}`
    }));

    res.json({ success: true, data: enriched });
  } catch (err) {
    next(err);
  }
});

// POST /api/invitations - Generate an invite (Admin only)
router.post('/', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const result = inviteSchema.safeParse(req.body);
    if (!result.success) {
      return next(result.error);
    }

    const { email, role } = result.data;

    const { data: invite, error } = await supabase
      .from('invitations')
      .insert([{ tenant_id: req.user.tenant_id, email, role }])
      .select('token')
      .single();

    if (error) throw error;

    // Dynamically resolve client application URL
    const rawOrigin = process.env.CLIENT_URL || process.env.APP_URL || req.headers.origin || 'http://localhost:5173';
    const clientUrl = rawOrigin.replace(/\/+$/, '');
    const joinUrl = `${clientUrl}/join/${invite.token}`;
    console.log(`\n\n=== INVITATION EMAIL ===\nTo: ${email}\nLink: ${joinUrl}\n========================\n\n`);

    res.json({
      success: true,
      data: {
        message: 'Invitation sent successfully',
        token: invite.token,
        joinUrl
      }
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/invitations/:id - Revoke an invitation (Admin only)
router.delete('/:id', authenticate, requireRole('admin'), async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return next(createApiError('Tenant context missing', 400, 'TENANT_REQUIRED'));
    }

    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', req.params.id)
      .eq('tenant_id', req.user.tenant_id);

    if (error) throw error;

    res.json({ success: true, message: 'Invitation revoked successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/invitations/:token - Validate an invite link (Public)
router.get('/:token', async (req, res, next) => {
  try {
    const { token } = req.params;

    const { data: invite, error } = await supabase
      .from('invitations')
      .select('id, email, role, status, expires_at, tenants(name)')
      .eq('token', token)
      .maybeSingle();

    if (error) throw error;
    if (!invite) {
      return next(createApiError('Invalid invitation link', 404, 'NOT_FOUND'));
    }

    if (invite.status !== 'pending') {
      return next(createApiError(`Invitation is already ${invite.status}`, 400, 'INVITATION_INACTIVE'));
    }

    if (new Date(invite.expires_at) < new Date()) {
      // Auto-update to expired
      await supabase.from('invitations').update({ status: 'expired' }).eq('id', invite.id);
      return next(createApiError('Invitation has expired', 400, 'INVITATION_EXPIRED'));
    }

    res.json({
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
        tenant_name: invite.tenants?.name || 'ProFix Handyman'
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/invitations/:token/accept - Accept an invite
router.post('/:token/accept', authenticate, async (req, res, next) => {
  try {
    const { token } = req.params;

    // Fetch the invite
    const { data: invite, error: inviteError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      return next(createApiError('Invalid invitation link', 404, 'NOT_FOUND'));
    }

    if (invite.status !== 'pending' || new Date(invite.expires_at) < new Date()) {
      return next(createApiError('Invitation is no longer valid', 400, 'INVITATION_INVALID'));
    }

    // Verify the authenticated user's email matches the invite
    if (req.user.email !== invite.email) {
      return next(createApiError('Authenticated email does not match the invitation email. Please sign out and use the correct account.', 403, 'EMAIL_MISMATCH'));
    }

    // Link the user to the tenant
    const { error: memberError } = await supabase
      .from('tenant_members')
      .insert([{ tenant_id: invite.tenant_id, user_id: req.user.id, role: invite.role }]);

    if (memberError) {
      if (memberError.code === '23505') {
        return next(createApiError('You are already a member of this workspace', 400, 'ALREADY_MEMBER'));
      }
      throw memberError;
    }

    // Update invite status
    await supabase.from('invitations').update({ status: 'accepted' }).eq('id', invite.id);

    // Update user's active tenant
    await supabase.from('users').update({ last_active_tenant_id: invite.tenant_id }).eq('id', req.user.id);

    res.json({ success: true, data: { message: 'Successfully joined workspace', tenant_id: invite.tenant_id, role: invite.role } });
  } catch (err) {
    next(err);
  }
});

export default router;
