-- Add paid_at timestamp to invoices table
ALTER TABLE public.invoices
ADD COLUMN paid_at TIMESTAMPTZ;
