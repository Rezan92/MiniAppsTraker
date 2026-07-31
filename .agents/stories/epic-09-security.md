# Epic 09: Security, Auth Guards & Access Control

## Overview
Ensure the application is strictly protected against unauthorized access, enforces tenant isolation so users cannot view cross-tenant data via URL manipulation, and gracefully handles routing errors.

## Tasks
- [x] **Task 9.1: Global Route Protection (Auth Guard)**
  - Implement a React Router wrapper (e.g., `ProtectedRoute.jsx`) that checks the AuthContext.
  - Automatically redirect any unauthenticated user attempting to access the dashboard or internal pages back to the `/login` route.
- [x] **Task 9.2: Tenant Isolation Enforcement (Row Level Security)**
  - Verify and audit all Supabase RLS (Row Level Security) policies.
  - Ensure users can only `SELECT`, `INSERT`, `UPDATE`, or `DELETE` rows where the `tenant_id` matches their authenticated JWT token's tenant.
- [x] **Task 9.3: Error Boundaries & Fallback Pages**
  - Create a generic `NotFound.jsx` (404) page for invalid URLs.
  - Create an `Unauthorized.jsx` (403) page explaining the user does not have permission to view the requested resource.
- [ ] **Task 9.4: Research - Advanced Security Audit**
  - Conduct a security research spike to identify missing security headers, rate-limiting needs, and potential XSS/CSRF vulnerabilities within the current architecture. Document findings and recommended implementation steps.
