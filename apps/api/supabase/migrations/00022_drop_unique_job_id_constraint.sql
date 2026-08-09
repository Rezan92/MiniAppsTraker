-- Migration 00022
-- Drops the unique_job_id constraint from the invoices table 
-- to allow Progress Billing (multiple invoices per job).

ALTER TABLE invoices DROP CONSTRAINT IF EXISTS unique_job_id;
