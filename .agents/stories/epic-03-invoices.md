# Epic 03: Invoices Mini-App Engine

- [ ] **Task 3.1: Invoice Generation & Multi-Job Aggregation**
  - Select a Client and pull 1 or multiple completed Jobs into an Invoice.
  - Calculate grand total based on Job rate calculations + Material costs.

- [ ] **Task 3.2: Invoice Line Item Snapshotting**
  - Copy calculated totals into an `invoice_items` table upon creation.
  - Ensure future edits to a Job do not alter locked, historical invoices.

- [ ] **Task 3.3: Invoice Status & Payment Lifecycle**
  - Track statuses: `draft`, `sent` (open), `in_progress` (partial collection), `paid`, `overdue`.
  - Support manual status overrides and partial payment logs.

- [ ] **Task 3.4: PDF Invoice Rendering & Client Delivery**
  - Generate clean, printable PDF invoices with company header, line item breakdown, payment status badge, and total amount due.
