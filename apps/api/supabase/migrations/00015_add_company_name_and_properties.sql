-- Migration 00015: Add Company Name, Rental Properties, and Invoice Billing targets

-- 1. Modify clients table
ALTER TABLE clients
ADD COLUMN company_name VARCHAR(255);

-- 2. Create rental_properties table
CREATE TABLE rental_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    name VARCHAR(255),
    address TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_rental_properties_tenant_id ON rental_properties(tenant_id);
CREATE INDEX idx_rental_properties_client_id ON rental_properties(client_id);

-- 3. Modify invoices table
ALTER TABLE invoices
ADD COLUMN billed_to_name TEXT,
ADD COLUMN bill_to_type VARCHAR(50) DEFAULT 'client_name' CHECK (bill_to_type IN ('client_name', 'company_name', 'property_address')),
ADD COLUMN property_id UUID REFERENCES rental_properties(id) ON DELETE SET NULL;
