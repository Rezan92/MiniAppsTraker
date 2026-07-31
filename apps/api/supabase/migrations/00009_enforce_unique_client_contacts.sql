-- Create a unique composite index for tenant_id and email, ignoring NULL emails
CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_id_email_key 
ON clients (tenant_id, email) 
WHERE email IS NOT NULL;

-- Create a unique composite index for tenant_id and phone, ignoring NULL phones
CREATE UNIQUE INDEX IF NOT EXISTS clients_tenant_id_phone_key 
ON clients (tenant_id, phone) 
WHERE phone IS NOT NULL;
