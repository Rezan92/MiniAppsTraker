# Epic 5: Invoice Status Pipeline (Full Lifecycle)

**Goal:** Implement the complete 6-status lifecycle with proper locking, mandatory reason inputs, and audit logging.

## User Stories

- [ ] **US-5.1: Implement "Ready to Send" Status**
  - **As a** user, **I want** to mark a draft as "Ready to Send" to lock the UI, requiring a "Revert to Draft" action to edit again.
- [ ] **US-5.2: Implement "Disputed" Status**
  - **As a** user, **I want** to mark a sent invoice as "Disputed" (with a mandatory reason) making it editable again, and releasing removed items to `unbilled`.
- [ ] **US-5.3: Enforce Terminal States (`paid`, `voided`)**
  - **As a** system, **I want** the backend to reject any edits to `paid` or `voided` invoices to enforce strict financial locking.
