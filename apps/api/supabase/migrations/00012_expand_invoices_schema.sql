-- Migration 00012: Expand Invoices Schema

-- 1. Modify tenants table
ALTER TABLE tenants
ADD COLUMN business_tagline TEXT,
ADD COLUMN payment_method TEXT,
ADD COLUMN payment_details TEXT,
ADD COLUMN next_invoice_number INTEGER DEFAULT 1001;

-- 2. Modify invoices table
ALTER TABLE invoices
ADD COLUMN job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
ADD COLUMN invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN labor_title TEXT,
ADD COLUMN labor_notes TEXT,
ADD COLUMN labor_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN materials_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN property_address TEXT;

-- 3. Modify invoices status check constraint
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

ALTER TABLE invoices ADD CONSTRAINT invoices_status_check CHECK (status IN ('draft', 'sent', 'in_progress', 'paid', 'overdue'));

-- 4. Modify invoice_items table
ALTER TABLE invoice_items
ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'material' CHECK (type IN ('labor_detail', 'material')),
ADD COLUMN sort_order INTEGER DEFAULT 0;

ALTER TABLE invoice_items
ALTER COLUMN quantity DROP NOT NULL,
ALTER COLUMN unit_price DROP NOT NULL,
ALTER COLUMN total_price DROP NOT NULL;
