# Epic 12: Dashboard Operations & DB Schema Docs

## Overview
Build the central operational hub for the tenant and document the database relationships.

## Tasks
- [ ] **Task 12.1: Database Documentation**
  - Create `.agents/docs/database_schema.md` documenting relations between `tenants`, `users`, `clients`, `jobs`, `job_materials`, and `job_hours`.
- [ ] **Task 12.2: Dynamic UI Branding**
  - Update the global layout. Replace hardcoded "ProFix" strings with the user's dynamic `tenant.name`.
- [ ] **Task 12.3: Dashboard UI Implementation**
  - Implement `/dashboard` with Quick Actions (New Job/Estimate), Financial Snapshots, and active Job/Estimate tables.
  - **US-12.1**: "As a workspace Admin or Employee, I want to see a dashboard when I log in, so I have an immediate overview of my business operations."
  - **US-12.2**: "As a workspace Admin, I want to see KPI summary cards (Active Clients, Open Jobs, Monthly Revenue, Monthly Material Costs) so I can monitor business health at a glance."
  - **US-12.3**: "As a workspace Admin or Employee, I want to see my active jobs on the dashboard so I can quickly access work in progress."
  - **US-12.4**: "As a workspace Admin or Employee, I want to see upcoming scheduled jobs (next 7 days) so I can plan my week."
  - **US-12.5**: "As a workspace Admin or Employee, I want quick action buttons on the dashboard to create a new client or job without navigating away."
  - **US-12.6**: "As a workspace Admin or Employee, I want to see a recent activity feed showing the latest actions in my workspace."
