# Epic 01: Authentication & Multi-Tenancy

- [ ] **Task 1.1: Google OAuth Supabase Integration**
  - Implement Supabase Auth Google login flow on backend/frontend.
  - Create `users` table linked to `auth.users` via triggers.

- [ ] **Task 1.2: Tenant Provisioning & RBAC**
  - Automatically create a `tenants` record upon new admin sign-up.
  - Assign roles (`admin` for business owner/manager, `client` for customer portal).
  - Implement authorization middleware `requireRole(['admin'])` on restricted API endpoints.
