-- Revert the unnecessary base_labor_amount column from 00027
ALTER TABLE invoices DROP COLUMN IF EXISTS base_labor_amount;

-- Add the is_billable flag to line items to support flat-rate vs hourly itemization
ALTER TABLE invoice_line_items ADD COLUMN is_billable BOOLEAN DEFAULT true;

