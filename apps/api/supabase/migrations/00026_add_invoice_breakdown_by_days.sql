-- Migration 00026: Add breakdown_by_days feature

ALTER TABLE invoices ADD COLUMN breakdown_by_days BOOLEAN DEFAULT false;
ALTER TABLE invoice_line_items ADD COLUMN service_date DATE;
