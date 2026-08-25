# Epic 4: Billing Status State Machine (Backend)

**Goal:** Implement the backend logic that correctly transitions `billing_status` on job items based on invoice lifecycle events.

## User Stories

- [ ] **US-4.1: Mark Items `on_draft`**
  - **As a** system, **when** a user saves a draft invoice with selected line items, **I want** to update the linked job items' `billing_status` to `on_draft`.
- [ ] **US-4.2: Revert Items to `unbilled` (Multi-Draft Check)**
  - **As a** system, **when** a user removes a line item from any invoice, **I want** the source job item to revert to `unbilled` ONLY if it is not present on another draft invoice.
- [ ] **US-4.3: Mark Items `billed`**
  - **As a** system, **when** an invoice status changes to `sent`, **I want** all linked job items to transition to `billed`.
- [ ] **US-4.4: Release Items on Void**
  - **As a** system, **when** an invoice is voided, **I want** all linked job items to revert to `unbilled` (with the multi-draft check).
