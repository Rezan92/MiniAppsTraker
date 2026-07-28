-- 00005_add_flat_rate.sql
ALTER TABLE jobs ADD COLUMN flat_rate DECIMAL(10, 2);
