# Epic 22: Advanced Reporting (Date Range Navigation)

## Objective
Provide business admins with the ability to filter the Comprehensive Dashboard and all associated KPI metrics by custom date ranges.

## User Story
**As a** Business Admin,
**I want** to select a custom start and end date on the dashboard,
**So that** I can view historical revenue, outstanding balances, and job metrics for specific periods (e.g., last quarter, last year) rather than only the current month.

## Requirements
- **Global Date Picker**: Add a prominent UI component to the top of the `DashboardLayout` or `Dashboard.jsx` that allows selecting a preset range (e.g., "This Month", "Last Month", "Q3") or a custom start/end date.
- **Backend Refactoring**: 
  - Update `GET /api/dashboard/summary` to accept `startDate` and `endDate` query parameters.
  - Refactor the SQL/Supabase aggregations (`revenueThisMonth`, `jobsThisMonth`, etc.) to dynamically apply these bounds instead of hardcoding `startOfMonth` and `nextMonth`.
- **URL State**: Persist the selected date range in the URL query parameters so the view can be bookmarked or shared.

## Tasks
- [ ] UI: Implement a DateRangePicker component.
- [ ] Backend: Update the summary endpoint to accept custom date parameters.
- [ ] Backend: Refactor SQL queries to replace hardcoded date boundaries with the provided parameters.
- [ ] State: Sync the date range with React Router query strings.
- [ ] Test: Verify revenue calculations for past months align with historical paid invoices.
