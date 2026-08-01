# Epic 15: Settings Hub & Workspace Configuration

## Overview
Build the centralized Settings interface where Business Admins can manage their tenant profile, invite and manage team members, and configure operational defaults (tax rates, hourly rates). Provide personal profile management for all users.

## Tasks
- [ ] **Task 15.1: Settings Layout & Company Profile**
  - Create a new `SettingsLayout.jsx` with a sub-navigation menu (e.g., "Company Profile", "Team Management", "Service Configuration", "My Account").
  - Build the "Company Profile" tab to edit basic business details.
  - **Danger Zone:** Implement a type-to-confirm workspace deletion modal at the bottom of the Company Profile.
  - Implement RBAC (Role-Based Access Control) on the tabs: Only users with the `admin` role in the current `tenant_members` context can view/access Company Profile, Team Management, and Service Configuration.

- [ ] **Task 15.2: Team Management Interface**
  - Build the UI to consume the `/api/invitations` endpoints created in Epic 11.
  - Implement an "Invite User" form (Email input + Role selector).
  - Build a "Pending Invitations" data table with a "Revoke" button to cancel active tokens.
  - Build an "Active Team" data table listing all current users in the tenant, allowing Admins to remove users or change their roles.

- [ ] **Task 15.3: Service Configuration & Defaults**
  - Create a new table `tenant_settings` (or add JSONB columns to `tenants`) to store: `default_hourly_rate`, `default_tax_rate`, and `service_categories` (array of strings).
  - Build the UI for Admins to update these defaults.
  - Ensure the Estimate and Job creation forms automatically pull from these tenant defaults when a new record is created.

- [ ] **Task 15.4: Personal Account Management**
  - Build a "My Account" tab accessible to ALL users (Admins and Employees).
  - Allow users to update their global `users` record (Full Name, Phone Number, Avatar) and reset their password.

- [ ] **Task 15.5: Settings Navigation Restructure**
  - **User Story**: "As an Admin, I want Workspace Settings (Company Profile, Team Management, Service Config) to be accessible from the sidebar Settings link and gear icon, separate from my personal profile, so that workspace-scoped settings are not conflated with my personal account settings."
  - **Acceptance Criteria**:
    - Gear icon and sidebar "Settings" link → open Workspace Settings hub
    - Profile avatar → opens dropdown with: My Account, Switch Workspace, Sign Out
    - My Account is a standalone screen for personal settings, not a tab inside workspace settings
    - Non-admins accessing workspace settings routes are redirected appropriately

- [x] **Task 15.6: Timezone Field**
  - **User Story**: "As an Admin, I want to set my workspace's timezone in Company Profile settings, so that all time-sensitive features (scheduling, appointments, notifications) use the correct local time." 
  - **Acceptance Criteria**:
    - Add `timezone` field to `tenants` table with 'UTC' default.
    - Add timezone dropdown to Company Profile form.
    - Wire to backend API.
