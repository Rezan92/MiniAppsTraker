# Epic 07: Estimates & Quoting Engine

## Overview
A dedicated module allowing the user to generate, send, and track pre-job estimates for clients. Estimates should be convertible directly into active Jobs once approved.

## Tasks
- [ ] **Task 7.1: Database Schema Expansion**
  - Create `estimates` table: `id`, `tenant_id`, `client_id`, `status` (draft, sent, approved, rejected), `total_amount`, `valid_until`, `notes`.
  - Create `estimate_items` table (for line items): `id`, `estimate_id`, `description`, `quantity`, `unit_price`.
- [ ] **Task 7.2: API Routing**
  - `GET /api/estimates`: Fetch all estimates.
  - `POST /api/estimates`: Create a new estimate.
  - `POST /api/estimates/:id/convert`: A specialized endpoint that takes an 'approved' estimate, automatically creates a new `jobs` record, copies over the line items to `job_materials`/labor, and links them.
- [ ] **Task 7.3: Frontend UI (Estimates Mini-App)**
  - Add "Estimates" to the main global sidebar navigation.
  - Build `EstimateList.jsx`: A data table tracking all quotes by status.
  - Build `EstimateBuilder.jsx`: A dynamic form allowing users to add line items, calculate totals, and save the quote.
  - Add a "Convert to Job" action button on the Estimate Details view.
