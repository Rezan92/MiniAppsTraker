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
      .single();
      
    req.user = {
      id: user.id,
      email: user.email,
      tenant_id: userData?.tenant_id || null,
      role: userData?.role || null
    };

    next();
  } catch (err) {
    next(err);
  }
};
