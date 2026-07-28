-- 00004_expand_jobs_schema.sql
-- Add new columns to jobs
ALTER TABLE jobs ADD COLUMN start_date DATE;
ALTER TABLE jobs ADD COLUMN end_date DATE;
ALTER TABLE jobs ADD COLUMN notes TEXT;

-- Create job_hours table
CREATE TABLE job_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    hours DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_job_hours_job_id ON job_hours(job_id);

-- Add new columns to job_materials
ALTER TABLE job_materials ADD COLUMN store VARCHAR(255);
ALTER TABLE job_materials ADD COLUMN purchase_date DATE;
ALTER TABLE job_materials ADD COLUMN notes TEXT;
