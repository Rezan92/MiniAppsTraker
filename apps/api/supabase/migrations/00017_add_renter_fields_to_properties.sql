-- Migration 00017: Add renter name and phone to rental properties, update invoices check constraint

-- 1. Add renter fields to rental_properties
ALTER TABLE rental_properties
ADD COLUMN renter_name VARCHAR(255),
ADD COLUMN renter_phone VARCHAR(50);

-- 2. Drop and recreate the bill_to_type check constraint on invoices
ALTER TABLE invoices
DROP CONSTRAINT invoices_bill_to_type_check;

ALTER TABLE invoices
ADD CONSTRAINT invoices_bill_to_type_check 
CHECK (bill_to_type IN ('client_name', 'company_name', 'property_address', 'renter_name'));
