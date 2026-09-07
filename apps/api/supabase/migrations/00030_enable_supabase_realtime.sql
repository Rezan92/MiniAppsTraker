-- Migration 00030: Enable Supabase Realtime and Full Replica Identity for Core Tables
-- Ensures Postgres mutations (INSERT, UPDATE, DELETE) are broadcast via Supabase Realtime,
-- and that DELETE / UPDATE events carry complete row data (including tenant_id) for client filtering.

-- Ensure publication exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Set REPLICA IDENTITY FULL and add core tables to supabase_realtime publication idempotently
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'clients',
    'rental_properties',
    'jobs',
    'job_hours',
    'job_materials',
    'invoices',
    'invoice_line_items'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Enable REPLICA IDENTITY FULL so DELETE and UPDATE events emit the full row with tenant_id
    EXECUTE format('ALTER TABLE %I REPLICA IDENTITY FULL', tbl);

    -- Add table to supabase_realtime if not already present
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl);
    END IF;
  END LOOP;
END $$;
