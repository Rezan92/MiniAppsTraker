# Epic 13: Granular Role-Based Access Control (RBAC)

## Overview
Implement flexible, modular permissions so Admins can restrict workforce access to specific tabs/features (e.g., Dashboard, Clients, Jobs, Invoices).

## Tasks
- [ ] **Task 13.1: DB Schema for Permissions**
  - Add a JSONB column `permissions` to the user-tenant mapping (or `users` table) to store boolean toggles: `{ can_view_dashboard: true, can_view_clients: false, ... }`.
- [ ] **Task 13.2: Auth Context & Middleware Enforcement**
  - Load user permissions into the global `AuthContext` on login.
  - Update `ProtectedRoute.jsx` to accept a `requiredPermission` prop. If the user lacks the permission, redirect to a 403 Unauthorized page.
- [ ] **Task 13.3: Dynamic UI Rendering**
  - Update the Sidebar navigation to conditionally render links based on the user's active permissions object.
- [ ] **Task 13.4: Admin Permission Manager UI**
  - Build a "Team Management" tab in Settings where Admins can invite users and toggle checkboxes to grant/revoke access to individual modules freely.
