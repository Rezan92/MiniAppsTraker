-- Migration: Add is_hidden to invoice_line_items
-- Description: Allows users to hide specific line items from the final PDF preview while still calculating their amounts in the total.

ALTER TABLE public.invoice_line_items 
ADD COLUMN is_hidden BOOLEAN NOT NULL DEFAULT false;
