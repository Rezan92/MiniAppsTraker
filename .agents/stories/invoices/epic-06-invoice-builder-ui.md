# Epic 6: Invoice Builder UI Refactor

**Goal:** Rebuild the `InvoiceBuilder.jsx` to support the A La Carte workflow.

## User Stories

- [ ] **US-6.1: Blank Invoice on Generation**
  - **As a** user, **when** I click "Generate Invoice", **I want** the invoice line items section to be completely blank.
- [ ] **US-6.2: Integrate Smart Dropdown**
  - **As a** user, **I want** the Smart Dropdown embedded directly in the Invoice Builder form for Labor and Materials.
- [ ] **US-6.3: Editable Line Item Descriptions (Data Firewall)**
  - **As a** user, **I want** to freely edit the description of any line item on my invoice without changing the original Job record.
- [ ] **US-6.4: Remove Item from Invoice (X Button)**
  - **As a** user, **I want** to click an X button next to a line item to remove it, putting it back in the unbilled pool.
