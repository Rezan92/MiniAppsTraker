import { supabase } from '../config/supabase.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    // Query our users table to get last_active_tenant_id
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select('last_active_tenant_id')
      .eq('id', user.id)
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      return next(userError); // Real DB error
    }

    if (!userData) {
      // Create user record in our users table if they just signed up via Supabase Auth
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{ id: user.id, email: user.email }])
        .select('last_active_tenant_id')
        .single();
      
      if (createError) {
        return res.status(500).json({ success: false, error: 'Failed to provision user profile' });
      }
      userData = newUser;
    }

    let tenant_id = userData?.last_active_tenant_id;
    let role = null;

    if (!tenant_id) {
      // If no last_active_tenant_id is set, see if they belong to any tenants in tenant_members
      const { data: members, error: memError } = await supabase
        .from('tenant_members')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .eq('status', 'active');
      
      if (!memError && members && members.length > 0) {
        tenant_id = members[0].tenant_id;
        role = members[0].role;
        // Auto-update last_active_tenant_id
        await supabase.from('users').update({ last_active_tenant_id: tenant_id }).eq('id', user.id);
      }
    } else {
      // Fetch their role for the active tenant
      const { data: member } = await supabase
        .from('tenant_members')
        .select('role')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant_id)
        .eq('status', 'active')
        .maybeSingle();
      
      role = member?.role || null;
    }

    req.user = {
      id: user.id,
      email: user.email,
      tenant_id, // Could be null if they need to onboard
      role // Could be null
    };

    next();
  } catch (err) {
    next(err);
  }
};
