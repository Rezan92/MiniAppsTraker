-- Phase 5 Backend Performance Indexes

-- Optimize tenant-scoped status lookups for jobs, invoices, and clients
CREATE INDEX IF NOT EXISTS idx_jobs_tenant_status ON jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_paid_at ON invoices(tenant_id, paid_at);
CREATE INDEX IF NOT EXISTS idx_clients_tenant_status ON clients(tenant_id, status);

-- Optimize relational lookups and foreign keys
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_job_hours_job_id ON job_hours(job_id);
CREATE INDEX IF NOT EXISTS idx_job_materials_job_id ON job_materials(job_id);
CREATE INDEX IF NOT EXISTS idx_rental_properties_client_id ON rental_properties(client_id);
