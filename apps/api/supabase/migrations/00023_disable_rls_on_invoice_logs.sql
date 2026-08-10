-- Disable Row Level Security on invoice_logs table to allow backend Express API to insert records without Supabase Auth Context
ALTER TABLE invoice_logs DISABLE ROW LEVEL SECURITY;
