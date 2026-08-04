# Epic 19: Dashboard V2 & Analytics Improvements

## Overview
This epic aims to significantly enhance the Dashboard by transforming it from a simple data overview into a powerful analytics and forecasting command center. It introduces historical data viewing, advanced date filtering, and comprehensive invoice tracking.

## User Stories

### US-19.1: Dynamic Date & Month Toggling
**As a** workspace Admin
**I want to** be able to toggle the date range for dashboard metrics (e.g., view past months, year-to-date, or custom ranges)
**So that** I can compare current performance against past performance and track business growth.
*Acceptance Criteria:*
- The default view should clearly state the current month's name (e.g., "Current Month (August 2026)").
- Add a date picker/toggle to easily switch between previous months.
- Support selecting multiple months or predefined ranges (e.g., "Year to Date", "Past Year").
- KPI cards (Revenue, Materials, Jobs) must dynamically update based on the selected date range.

### US-19.2: Comprehensive Invoice Tracking
**As a** workspace Admin
**I want to** see an overview of all invoices directly on the dashboard
**So that** I know exactly how much money is outstanding and what needs to be followed up on.
*Acceptance Criteria:*
- Display total amounts and counts for:
  - Invoices Paid
  - Invoices Unpaid (Sent but waiting to be paid)
  - Invoices Not Sent (Jobs completed but no invoice generated)
- Highlight overdue invoices from previous months or previous clients that require immediate attention.

### US-19.3: Advanced Job Statistics
**As a** workspace Admin or Employee
**I want to** see detailed statistics about job performance and pipeline
**So that** I can manage my team's workload effectively.
*Acceptance Criteria:*
- Display metrics for:
  - Total jobs completed in the selected time period.
  - Total open jobs.
  - Total upcoming jobs.
  - Total jobs created/scheduled for the selected month.
- Ensure these statistics reflect the dynamic date filter from US-19.1.

### US-19.4: Enhanced Upcoming Schedule
**As a** workspace Admin or Employee
**I want to** see a richer view of my upcoming schedule
**So that** I can plan my week more effectively.
*Acceptance Criteria:*
- Expand the upcoming schedule widget to show more details (e.g., assigned team members, estimated duration).
- Ensure it visually distinguishes between jobs happening today versus later in the week.

## Technical Notes
- **Backend**: The `/api/dashboard/summary` endpoint will need to be updated to accept `startDate` and `endDate` query parameters instead of hardcoding the current month.
- **Frontend**: The Date Picker component should be highly accessible and clear. We may want to implement a library like `react-datepicker` or `date-fns` if not already used.
- **Invoices**: Requires the Invoices module (Epic 16) to be fully implemented and stable before building the dashboard widgets for it.
