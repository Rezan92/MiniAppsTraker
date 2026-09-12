-- Migration 00032: Disable Row Level Security on appointments table
-- Matches architecture from Migration 00023, allowing the Express API to insert, update, 
-- and query records with backend multi-tenant isolation (assertTenant)

ALTER TABLE appointments DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view and manage appointments in their tenant" ON appointments;
