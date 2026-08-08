-- 1. Remove 1:1 Restriction
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_job_id_key;

-- 2. Billed State Tracking (Foreign Keys)
ALTER TABLE job_materials 
ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE job_hours 
ADD COLUMN invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL;

-- 3. The Audit Trail Table
CREATE TABLE invoice_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'Created', 'Sent', 'Reverted', 'Paid', 'Voided'
    reason TEXT,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for invoice_logs
ALTER TABLE invoice_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their tenant's invoice logs" ON invoice_logs FOR SELECT USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Users can insert into their tenant's invoice logs" ON invoice_logs FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
