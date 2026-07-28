-- 00006_add_times_to_job_hours.sql
ALTER TABLE job_hours ADD COLUMN start_time TIME;
ALTER TABLE job_hours ADD COLUMN end_time TIME;
