-- Add internal_notes to invoices table
ALTER TABLE public.invoices
ADD COLUMN internal_notes TEXT;
