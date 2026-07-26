import { createClient } from '@supabase/supabase-js';

// Use Vite environment variables, falling back to process.env if needed
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'placeholder_key';

export const supabase = createClient(supabaseUrl, supabaseKey);
