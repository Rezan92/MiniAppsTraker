# Epic 03: Invoices Mini-App Engine

- [x] **Task 3.1: Invoice Generation & Multi-Job Aggregation**
  - Select a Client and pull 1 or multiple completed Jobs into an Invoice.
  - Calculate grand total based on Job rate calculations + Material costs.

- [x] **Task 3.2: Invoice Line Item Snapshotting**
  - Copy calculated totals into an `invoice_items` table upon creation.
  - Ensure future edits to a Job do not alter locked, historical invoices.

- [x] **Task 3.3: Invoice Status & Payment Lifecycle**
  - Track statuses: `draft`, `sent` (open), `in_progress` (partial collection), `paid`, `overdue`.
  - Support manual status overrides and partial payment logs.

- [x] **Task 3.4: PDF Invoice Rendering & Client Delivery**
  - Generate clean, printable PDF invoices with company header, line item breakdown, payment status badge, and total amount due.

## User Stories

- [x] **US-3.1:** "As an Admin, I want to create an invoice for a client so I can bill them for completed work."
- [x] **US-3.2:** "As an Admin, I want to optionally link an invoice to a completed job so that labor details and materials auto-populate from the job data."
- [x] **US-3.3:** "As an Admin, I want each invoice to have an auto-incrementing invoice number so I can track invoices sequentially."
- [x] **US-3.4:** "As an Admin, I want to view a professional invoice preview that matches our business PDF format, with labor descriptions, materials breakdown, and payment instructions."
- [x] **US-3.5:** "As an Admin, I want to download or print an invoice as a PDF directly from the app."
- [x] **US-3.6:** "As an Admin, I want to manage invoice status (draft → sent → paid) so I can track the payment lifecycle."
- [x] **US-3.7:** "As an Admin, I want to see a list of all invoices with filters by status, client, and date range."
- [x] **US-3.8:** "As an Admin, I want my business tagline and payment instructions to appear on every invoice, configured once in my tenant settings."
- [ ] **US-3.9: Quick Job Creation from Invoice Builder** — "As an Admin, I want a 'Create New Job' shortcut in the job selector dropdown when building an invoice, so I can create a job on the fly without leaving the invoice form."
