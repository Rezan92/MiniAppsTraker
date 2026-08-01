import express from 'express';
import { z } from 'zod';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'employee']).default('employee')
});

// POST /api/invitations - Generate an invite (Admin only)
router.post('/', authenticate, async (req, res, next) => {
  try {
    if (!req.user || !req.user.tenant_id) {
      return res.status(400).json({ success: false, error: 'Tenant context missing' });
    }
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Only admins can send invitations' });
    }

    const result = inviteSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error.errors[0].message });
    }

    const { email, role } = result.data;

    const { data: invite, error } = await supabase
      .from('invitations')
      .insert([{ tenant_id: req.user.tenant_id, email, role }])
      .select('token')
      .single();

    if (error) throw error;

    // Simulate sending email by logging to console
    const joinUrl = `http://localhost:5173/join/${invite.token}`;
    console.log(`\n\n=== INVITATION EMAIL ===\nTo: ${email}\nLink: ${joinUrl}\n========================\n\n`);

    res.json({ success: true, data: { message: 'Invitation sent successfully', token: invite.token } });
  } catch (err) {
    next(err);
  }
});

// GET /api/invitations/:token - Validate an invite link
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
      return res.status(404).json({ success: false, error: 'Invalid invitation link' });
    }

    if (invite.status !== 'pending') {
      return res.status(400).json({ success: false, error: `Invitation is already ${invite.status}` });
    }

    if (new Date(invite.expires_at) < new Date()) {
      // Auto-update to expired
      await supabase.from('invitations').update({ status: 'expired' }).eq('id', invite.id);
      return res.status(400).json({ success: false, error: 'Invitation has expired' });
    }

    res.json({
      success: true,
      data: {
        email: invite.email,
        role: invite.role,
        tenant_name: invite.tenants.name
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
      return res.status(404).json({ success: false, error: 'Invalid invitation link' });
    }

    if (invite.status !== 'pending' || new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ success: false, error: 'Invitation is no longer valid' });
    }

    // Verify the authenticated user's email matches the invite
    if (req.user.email !== invite.email) {
      return res.status(403).json({ success: false, error: 'Authenticated email does not match the invitation email. Please sign out and use the correct account.' });
    }

    // Link the user to the tenant
    const { error: memberError } = await supabase
      .from('tenant_members')
      .insert([{ tenant_id: invite.tenant_id, user_id: req.user.id, role: invite.role }]);

    if (memberError) {
      // Might be a unique constraint violation if they are already in the tenant
      if (memberError.code === '23505') {
        return res.status(400).json({ success: false, error: 'You are already a member of this workspace' });
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
