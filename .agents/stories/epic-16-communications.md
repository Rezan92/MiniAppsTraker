# Epic 16: External Communications & SMTP Integration

## Overview
Replace our mock email delivery services with a production-ready transactional email provider (e.g., Resend, SendGrid, or AWS SES) to handle tenant invitations, password resets, and client invoice deliveries.

## Tasks
- [ ] **Task 16.1: Provider Setup & Configuration**
  - Integrate the official SDK for our chosen email provider (e.g., `resend` npm package).
  - Add secure environment variables (`EMAIL_API_KEY`, `EMAIL_FROM_ADDRESS`) to our `.env` and deployment configurations.
- [ ] **Task 16.2: Replace Mock Invitation Service**
  - Update `apps/api/src/routes/invitations.js`.
  - Replace the `console.log` mock with the actual API call to send the `join/:token` link to the invited user's inbox.
  - Create a clean HTML email template for the invitation (incorporating the inviting business's name).
- [ ] **Task 16.3: Password Reset Flow**
  - Build the backend endpoints for generating a secure password reset token.
  - Send the reset token via the new email provider.
- [ ] **Task 16.4: Client Document Delivery (Future)**
  - Build utility functions to send approved Estimates and final Invoices directly to external clients via email.
