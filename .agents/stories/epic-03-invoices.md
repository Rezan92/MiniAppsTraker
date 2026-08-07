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

- [x] **Task 3.5: Invoice Payment Tracking & Partial Balances**
  - Create `invoice_payments` table to log multiple payments per invoice.
  - Track remaining balance based on partial payments.
  - Automatically update invoice status to `in_progress` or `paid` based on payment thresholds.

- [x] **Task 3.6: Job Data Integrity for Invoices**
  - "As a user, I need to edit or delete logged hours and materials on a job so that the data flowing into my auto-generated invoices is accurate."

## User Stories

- [x] **US-3.1:** "As an Admin, I want to create an invoice for a client so I can bill them for completed work."
- [x] **US-3.2:** "As an Admin, I want to optionally link an invoice to a completed job so that labor details and materials auto-populate from the job data."
- [x] **US-3.3:** "As an Admin, I want each invoice to have an auto-incrementing invoice number so I can track invoices sequentially."
- [x] **US-3.4:** "As an Admin, I want to view a professional invoice preview that matches our business PDF format, with labor descriptions, materials breakdown, and payment instructions."
- [x] **US-3.5:** "As an Admin, I want to download or print an invoice as a PDF directly from the app."
- [x] **US-3.6:** "As an Admin, I want to manage invoice status (draft → sent → paid) so I can track the payment lifecycle."
- [x] **US-3.7:** "As an Admin, I want to see a list of all invoices with filters by status, client, and date range."
- [x] **US-3.8:** "As an Admin, I want my business tagline and payment instructions to appear on every invoice, configured once in my tenant settings."
- [x] **US-3.9: Quick Job Creation from Invoice Builder** — "As an Admin, I want a 'Create New Job' shortcut in the job selector dropdown when building an invoice, so I can create a job on the fly without leaving the invoice form."
- [x] **US-3.10: Auto-named PDF Downloads** — "As an Admin, I want downloaded invoice PDFs to have a descriptive filename including the client name, property address, invoice number, and timestamp, so my files are organized and identifiable."
- [x] **US-3.11:** "As an Admin, when I record a payment on an invoice, I want a prompt asking how much was paid and the payment method used, so I can accurately log the transaction."
- [x] **US-3.12:** "As an Admin, I want to log partial payments against an invoice so the system can track the remaining balance due."
- [x] **US-3.13:** "As an Admin, I want the invoice status to automatically update to 'in_progress' if partially paid, and 'paid' when the balance reaches zero."

*Technical Note:* This will require a new `invoice_payments` table (`id`, `invoice_id`, `amount`, `payment_method`, `payment_date`, `notes`) to log multiple payments per invoice.

### Phase 3: Dynamic 1:1 Job Invoicing (Major Feature)
1. [x] **Invoice Anytime:** A user can generate an invoice for a job even if the job's status is not yet "completed".
2. [x] **1-to-1 Constraint:** A job can only ever have *one* invoice tied to it. The system must enforce this and hide the "Create Invoice" button on the job page if one already exists.
3. [x] **Dynamic Syncing:** If labor hours or materials are added to a job *after* its invoice is created, the invoice must automatically recalculate and pick up those new costs.
4. [x] **Safety Lock Rule:** The dynamic syncing described above must *only* happen if the invoice is in a `draft` status. Once an invoice is marked as `sent` or `paid`, it is permanently locked and will ignore any future hours/materials logged to the job.
5. [x] **Auto-Complete Job on Send:** When a user clicks "Send Invoice", the system must do two things:
   - Update the invoice status to `sent`.
   - Check the related job's status. If the job is not completed, automatically update the job status to `completed`.
