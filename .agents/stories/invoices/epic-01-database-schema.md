# Epic 1: Database Schema — Line Items, States & Migration

**Goal:** Create the new `invoice_line_items` table, add `billing_status` to job items, migrate existing data, and remove the old `invoice_items` table.

## User Stories

- [ ] **US-1.1: Create `invoice_line_items` Table**
  - **As a** system architect, **I want** a dedicated table to store invoice line items that are decoupled from raw job data, **so that** client-facing descriptions are independent from worker-logged descriptions.
- [ ] **US-1.2: Add `billing_status` to Job Items**
  - **As a** system, **I want** each job hour and job material to have a `billing_status` field, **so that** the Smart Dropdown can filter items correctly.
- [ ] **US-1.3: Migrate Existing Data from `invoice_items` to `invoice_line_items`**
  - **As a** system, **I want** all existing invoice line item data to be migrated to the new table structure, **so that** no legacy code paths are needed.
- [ ] **US-1.4: Add New Statuses to Invoice Status Enum**
  - **As a** system, **I want** the invoice status column to support the new statuses (`ready_to_send`, `disputed`).
