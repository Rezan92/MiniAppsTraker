ALTER TABLE invoices ADD COLUMN base_labor_amount DECIMAL(10,2) DEFAULT 0;
UPDATE invoices SET base_labor_amount = labor_amount;

