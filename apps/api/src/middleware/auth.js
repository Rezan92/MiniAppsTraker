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

    // Query our users table to get tenant_id and role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      return next(userError); // Real DB error
    }

    let tenant_id = userData?.tenant_id;
    let role = userData?.role;

    if (!tenant_id) {
      // Auto-provision tenant
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .insert([{ company_name: 'Default Workspace' }])
        .select('id')
        .single();

      if (tenantError || !tenant) {
        return res.status(500).json({ success: false, error: 'Failed to auto-provision tenant workspace' });
      }

      tenant_id = tenant.id;
      role = 'admin';

      const { error: upsertError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          tenant_id,
          role
        });

      if (upsertError) {
        return res.status(500).json({ success: false, error: 'Failed to auto-provision user profile' });
      }
    }

    if (!tenant_id) {
      return res.status(400).json({ success: false, error: 'Tenant context missing after resolution' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      tenant_id,
      role
    };

    next();
  } catch (err) {
    next(err);
  }
};
