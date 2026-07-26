import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY || 'placeholder_key';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY is not defined in environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);
