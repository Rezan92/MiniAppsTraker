-- Migration 00016: Normalize Phone Numbers for Unique Constraint

-- Update all existing phone numbers to remove any non-digit characters.
-- This ensures the unique constraint on (tenant_id, phone) works effectively.
UPDATE clients
SET phone = regexp_replace(phone, '\D', '', 'g')
WHERE phone IS NOT NULL;
