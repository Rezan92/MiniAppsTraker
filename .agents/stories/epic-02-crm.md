# Epic 02: Handyman CRM (Clients, Jobs & Materials)

- [ ] **Task 2.1: Client Management CRUD**
  - Backend endpoints & UI for Client profiles (Name, Phone, Email, Physical Address, Internal Notes).
  - Search/filter clients by name or address.

- [ ] **Task 2.2: Job Tracking Engine**
  - Create Job linked to Client (`client_id`).
  - Support Rate Types: `flat` (fixed rate) vs `hourly` (Hourly Rate * Hours Worked).
  - Track Job Status: `open`, `in_progress`, `completed`, `cancelled`.
  - Capture scope of work description, start date, and completion date.

- [ ] **Task 2.3: Job Materials & Inventory Costing**
  - Add sub-items to Jobs for Materials.
  - Fields: `description`, `cost`, `vendor/store_name`.
  - Include boolean flag `is_from_stock` (True = pulled from personal inventory, False = bought specifically for job).
