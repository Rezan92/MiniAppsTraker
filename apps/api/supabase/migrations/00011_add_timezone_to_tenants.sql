-- Add timezone column to tenants table
ALTER TABLE tenants 
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';
