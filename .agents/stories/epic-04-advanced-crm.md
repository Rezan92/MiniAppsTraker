# Epic 04: Advanced CRM & Data Integrity

- [x] **Task 4.1: Rental Properties Management (Landlord Extension)**
  - Context: Clients may have multiple rental properties where jobs occur.
  - Database: Create `rental_properties` table `(id, tenant_id, client_id, address, name, notes)`.
  - API: Build CRUD endpoints in `apps/api/src/routes/properties.js` linked securely to `client_id` and `tenant_id`.
  - UI: Add a "Rental Properties" management tab inside the Client Details view.

- [x] **Task 4.2: Client Company/LLC Support**
  - Database: Add `company_name` to `clients` table.
  - UI: Show "Company Name" input dynamically in Client creation and details forms when `client_type` is commercial or property_manager.

- [x] **Task 4.3: Strict Data Validation & Normalization**
  - Backend: Add pre-save hook/middleware to strip non-digits from `phone` fields (e.g. formatting as `1234567890`) to enforce `UNIQUE(tenant_id, phone)`.
  - Database: Run a migration to clean all existing phone strings in the DB to match the normalized format.
  - UI: Maintain visually pleasing formatting `(XXX) XXX-XXXX` on frontend while saving purely digits.

- [x] **Task 4.4: Invoice Billing Flexibility & Immutability**
  - Database: Add `billed_to_name`, `bill_to_type`, and `property_id` to the `invoices` table. (Note: `property_address` already exists).
  - Business Logic: When an invoice is finalized, save a hardcoded snapshot of the name billed (Client or LLC) to `billed_to_name`, and copy the string address to `property_address`. Do not rely on joins.
  - UI: Update Invoice Builder to include a "Bill To" dropdown allowing selection between Client Name, Company Name, or a specific Rental Property. Update Invoice PDF views to respect `billed_to_name` and `property_address`.

### Phase 1: Property Page Workflow Automation
1. [x] **Add Job Button:** Add an "Add Job" button next to the "New Invoice" button on the Rental Property details page.
2. [x] **Smart Add Job Form:** Clicking "Add Job" from a property page must open the modal and auto-populate:
   - `Client`: Set to the Property Manager.
   - `Property`: Set to the current Property Address.
3. [x] **Smart New Invoice Form:** Clicking "New Invoice" from a property page must open the builder and auto-populate:
   - `Client`: Set to the Property Manager.
   - `Property Address`: Set to the current Property Address.
   - `Bill To`: Default to the manager's `company_name` (fallback to client name if no company exists).

### Phase 2: UI Bug Fixes
1. [x] **Update Job Button Text:** In the Job Modal, if the user is editing an existing job, the submit button text must dynamically change from "Create Job" to "Update Job".
