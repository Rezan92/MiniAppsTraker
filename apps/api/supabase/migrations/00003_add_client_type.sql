ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_type VARCHAR(50) CHECK (client_type IN ('residential', 'commercial', 'property_manager')) DEFAULT 'residential';
