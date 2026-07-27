# Epic 02: Handyman CRM (Clients, Jobs & Materials)

- [x] **Task 2.1: Client Management CRUD**
  - Backend endpoints & UI for Client profiles (Name, Phone, Email, Physical Address, Internal Notes).
  - Search/filter clients by name or address.

- [x] **Task 2.2: Job Tracking Engine**
  - Create Job linked to Client (`client_id`).
  - Support Rate Types: `flat` (fixed rate) vs `hourly` (Hourly Rate * Hours Worked).
  - Track Job Status: `open`, `in_progress`, `completed`, `cancelled`.
  - Capture scope of work description, start date, and completion date.

- [x] **Task 2.3: Job Materials & Inventory Costing**
  - Add sub-items to Jobs for Materials.
  - Fields: `description`, `cost`, `vendor/store_name`.
  - Include boolean flag `is_from_stock` (True = pulled from personal inventory, False = bought specifically for job).
### Implementation Notes & Additions
- Created isolated CRM API endpoints for Clients and Jobs under /api/clients and /api/jobs.
- Added Materials as sub-routes under Jobs to streamline relational queries.
- Built unified Dashboard UI with MUI Tabs rendering ClientList and JobList views.
- [x] Created 00002_add_notes_to_clients.sql migration and updated API Zod schemas to handle the notes field.
