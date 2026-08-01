-- 1. Update tenants table
ALTER TABLE tenants RENAME COLUMN company_name TO name;
  
ALTER TABLE tenants 
  ADD COLUMN email VARCHAR(255),
  ADD COLUMN phone VARCHAR(50),
  ADD COLUMN address TEXT,
  ADD COLUMN logo_url TEXT;

-- 2. Create tenant_members junction table
CREATE TABLE tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) CHECK (role IN ('admin', 'employee')) NOT NULL DEFAULT 'employee',
    status VARCHAR(50) CHECK (status IN ('active', 'suspended')) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, user_id)
);
CREATE INDEX idx_tenant_members_user_id ON tenant_members(user_id);
CREATE INDEX idx_tenant_members_tenant_id ON tenant_members(tenant_id);

-- 3. Migrate existing user-tenant relationships to tenant_members
INSERT INTO tenant_members (tenant_id, user_id, role)
SELECT tenant_id, id, 'admin' FROM users;

-- 4. Alter users table
ALTER TABLE users 
  ADD COLUMN last_active_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- Set last_active_tenant_id to their existing tenant_id
UPDATE users SET last_active_tenant_id = tenant_id;

-- Now drop the strict tenant_id and role columns
ALTER TABLE users DROP COLUMN tenant_id;
ALTER TABLE users DROP COLUMN role;

-- 5. Create invitations table
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    token UUID NOT NULL DEFAULT gen_random_uuid(),
    role VARCHAR(50) CHECK (role IN ('admin', 'employee')) NOT NULL DEFAULT 'employee',
    status VARCHAR(50) CHECK (status IN ('pending', 'accepted', 'expired')) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_tenant_id ON invitations(tenant_id);
