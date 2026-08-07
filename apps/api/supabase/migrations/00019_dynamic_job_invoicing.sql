-- Migration 00019: Dynamic Job Invoicing
-- Add a unique constraint to ensure a job can only have one invoice

ALTER TABLE invoices
ADD CONSTRAINT unique_job_id UNIQUE (job_id);
