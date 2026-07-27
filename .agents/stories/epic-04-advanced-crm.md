# Epic 04: Advanced CRM & Data Integrity

- [ ] **Task 4.1: Rental Properties Management (Landlord Extension)**
  - Context: Clients may have multiple rental properties where jobs occur.
  - Database: Create `rental_properties` table `(id, tenant_id, client_id, address, unit_number, property_type, access_instructions, notes)`.
  - API: Build CRUD endpoints in `apps/api/src/routes/properties.js` linked securely to `client_id` and `tenant_id`.
  - UI: Add a "Rental Properties" management tab inside the Client view.
  - Job Engine: Allow selecting an optional `rental_property_id` when creating a new Job.

- [ ] **Task 4.2: Address Autocomplete & Strict Data Validation**
  - UI Verification: Integrate an address autocomplete provider (e.g., Google Places API) in Client and Property creation forms to enforce standardized US addresses.
  - Schema Enforcement: Enhance frontend and backend Zod schemas with regex validation for US phone numbers `(XXX) XXX-XXXX` and strict RFC email validation.
  - UX: Implement clear, inline error handling in the Material UI forms for invalid data entry.
