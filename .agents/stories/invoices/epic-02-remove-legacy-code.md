# Epic 2: Remove ALL Legacy Sync & Sweep Code

**Goal:** Completely delete all code related to the old Sweep & Sync model. If code is not needed, it must be deleted — not commented out.

## User Stories

- [ ] **US-2.1: Remove Backend Sync Infrastructure**
  - Delete `/:id/sync-status` and `/:id/sync` routes in `invoices.js`.
  - Delete `syncJobToDraftInvoice()` and related calls in `jobs.js`.
  - Delete the "Sweep" auto-assign logic in `POST /api/invoices`.
- [ ] **US-2.2: Remove Frontend Sync Infrastructure**
  - Delete `syncStatus` hook, `syncMutation`, and sync warning banners in `InvoiceBuilder.jsx` and `InvoiceDetails.jsx`.
- [ ] **US-2.3: Remove Unused Dependencies & Imports**
  - Search and destroy all orphaned imports and references to sync logic or `invoice_items`.
