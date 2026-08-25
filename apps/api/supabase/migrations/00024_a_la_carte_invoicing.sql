-- Migration 00024: A La Carte Invoicing Engine

-- 1. Create invoice_line_items Table
CREATE TABLE invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  source_type VARCHAR(20) CHECK (source_type IN ('labor', 'material', 'ad_hoc')),
  source_id UUID,
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);

-- 2. Add billing_status to Job Items
ALTER TABLE job_hours ADD COLUMN billing_status VARCHAR(20) DEFAULT 'unbilled'
  CHECK (billing_status IN ('unbilled', 'on_draft', 'billed'));
  
ALTER TABLE job_materials ADD COLUMN billing_status VARCHAR(20) DEFAULT 'unbilled'
  CHECK (billing_status IN ('unbilled', 'on_draft', 'billed'));

-- 3. Billing Status Migration Logic
-- Update job_hours based on joined invoices
UPDATE job_hours
SET billing_status = CASE
    WHEN i.status IN ('sent', 'paid') THEN 'billed'
    WHEN i.status IN ('draft', 'ready_to_send') THEN 'on_draft'
    ELSE 'unbilled'
  END
FROM invoices i
WHERE job_hours.invoice_id = i.id;

-- Update job_materials based on joined invoices
UPDATE job_materials
SET billing_status = CASE
    WHEN i.status IN ('sent', 'paid') THEN 'billed'
    WHEN i.status IN ('draft', 'ready_to_send') THEN 'on_draft'
    ELSE 'unbilled'
  END
FROM invoices i
WHERE job_materials.invoice_id = i.id;

-- 4. Migrate Existing Data from invoice_items to invoice_line_items
INSERT INTO invoice_line_items (invoice_id, source_type, source_id, description, amount, sort_order)
SELECT
  invoice_id,
  CASE 
    WHEN type = 'labor_detail' THEN 'labor' 
    WHEN type = 'material' THEN 'material' 
    ELSE 'ad_hoc' 
  END,
  NULL,  -- Old items didn't track source_id
  description,
  COALESCE(total_price, 0),
  sort_order
FROM invoice_items;

-- 5. Drop old table
DROP TABLE invoice_items;

-- 6. Add New Statuses to Invoice Status Enum
-- Drop existing unnamed or named constraint safely
DO $$
DECLARE
    conname text;
BEGIN
    SELECT constraint_name INTO conname
    FROM information_schema.check_constraints
    WHERE constraint_schema = 'public' 
      AND constraint_name LIKE 'invoices_status_check%';
      
    IF conname IS NOT NULL THEN
        EXECUTE 'ALTER TABLE invoices DROP CONSTRAINT ' || conname;
    END IF;
END $$;

ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
  CHECK (status IN ('draft', 'ready_to_send', 'sent', 'disputed', 'paid', 'voided'));
