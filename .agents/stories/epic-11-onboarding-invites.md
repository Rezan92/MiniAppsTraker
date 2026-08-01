# Epic 11: Multi-Tenant Architecture, Onboarding & Invitations

## Overview
Implement an "Identity vs. Workspace" architecture utilizing a junction table (`tenant_members`) to allow single users to belong to multiple tenants. Provide clear pre-login entry paths for Business Owners vs. Employees, and enforce strict email-matched tokenized invitation acceptance.

## Detailed Tasks

- [ ] **Task 11.1: Database Schema & Migration**
  - Create/Verify the `tenants` table (`id`, `name`, `email`, `phone`, `address`, `logo_url`, `created_at`).
  - Add `last_active_tenant_id` (UUID FK to tenants, nullable) to the `users` table.
  - Create the `tenant_members` junction table:
    - `id` (UUID PK)
    - `tenant_id` (UUID FK -> tenants)
    - `user_id` (UUID FK -> users)
    - `role` (VARCHAR: 'admin', 'employee')
    - `status` (VARCHAR: 'active', 'suspended')
    - Unique Constraint on `(tenant_id, user_id)`
  - Create the `invitations` table:
    - `id` (UUID PK)
    - `tenant_id` (UUID FK -> tenants)
    - `email` (TEXT)
    - `token` (UUID / Secure Hash)
    - `role` (VARCHAR, default 'employee')
    - `expires_at` (TIMESTAMP)
    - `status` (VARCHAR: 'pending', 'accepted', 'expired')

- [ ] **Task 11.2: Pre-Login Landing & Entry Flow**
  - Update the Login / Sign Up landing view (`LoginCard.jsx` / Entry screen):
  - Provide clear options:
    1. **"I am a Business Owner"** -> Routes to Sign Up / Login -> If user has 0 `tenant_members` records, force redirect to `/onboarding`.
    2. **"I am an Employee"** -> Display guidance: *"Employees join via an invite link from their employer. Please check your email inbox."* Provide a direct login link for employees who already completed onboarding.

- [ ] **Task 11.3: Tenant Owner Onboarding (`/onboarding`)**
  - Secure route for authenticated users with 0 `tenant_members` entries.
  - Form fields: Business Name, Business Phone, Business Address.
  - On submission:
    1. Create `tenants` record.
    2. Create `tenant_members` record linking user as `admin`.
    3. Set `users.last_active_tenant_id` to this new tenant ID.
    4. Redirect to Dashboard.

- [ ] **Task 11.4: Tokenized Invitation Flow (`/join/:token`)**
  - Admin UI in `Settings -> Team`: Input employee email -> Generates secure `/join/:token` link (Log URL to Express console).
  - Public route `/join/:token`: Validates token status and expiration.
  - Enforce Email Match: Authenticated user's email MUST match `invitations.email`. If not, show error / prompt to switch accounts.
  - Profile Completion: If missing `full_name` or `phone`, prompt employee to complete their profile details before proceeding.
  - On acceptance: Create `tenant_members` record (`role: 'employee'`), set `status: 'accepted'`, update `users.last_active_tenant_id`, and redirect to Dashboard.

- [ ] **Task 11.5: Workspace Switcher & Session Persistence**
  - When a user logs in, automatically load the workspace specified by `users.last_active_tenant_id` (or fallback to their first `tenant_members` record).
  - In `DashboardLayout` header, if the user belongs to >1 tenant in `tenant_members`, render a "Workspace Switcher" dropdown to change the active `tenant_id` in global context and update `users.last_active_tenant_id`.
