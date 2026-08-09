-- 1. Drop the restrictive legacy constraint
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;

-- 2. Apply the new comprehensive constraint
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
CHECK (status IN ('draft', 'sent', 'in_progress', 'paid', 'overdue', 'voided'));
