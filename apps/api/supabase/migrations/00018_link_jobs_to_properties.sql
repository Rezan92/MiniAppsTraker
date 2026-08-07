ALTER TABLE jobs
ADD COLUMN property_id UUID REFERENCES rental_properties(id) ON DELETE SET NULL;
