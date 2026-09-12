# Epic 18: Calendar & Scheduling Hub

## Overview
A dedicated, real-time Calendar and Scheduling Hub providing Day, Week, and Month views for jobs and standalone appointments across the workspace. Built with Schedule-X, drag-and-drop rescheduling, multi-tenancy, chronological constraints, relational joins (clients, jobs, rental properties), and Supabase Realtime synchronization.

## Specification Reference
- **Master Plan**: `epic_18_calendar_specification.md`

## Milestones & Implementation Progress

### Milestone 1: Data Model, Domain Service & REST API Core
- [x] **Database Migration (`00031_create_appointments_table.sql`)**:
  - `appointments` table with `tenant_id`, `job_id`, `client_id`, `property_id`, `user_id`
  - Chronological check constraint: `chk_appointments_time_order CHECK (end_time >= start_time)`
  - Status check: `scheduled`, `in_progress`, `completed`, `cancelled`, `rescheduled`
  - Contact role check: `billing_client`, `site_resident`, `property_manager`, `custom`
  - Row Level Security (RLS) policies for tenant isolation
  - Composite and foreign-key performance indexes on `(tenant_id, start_time, end_time)`, `(tenant_id, status)`, `job_id`, `client_id`, `property_id`
  - `REPLICA IDENTITY FULL` and addition to `supabase_realtime` publication
- [x] **Domain Service Layer (`apps/api/src/services/domain/appointmentService.js`)**:
  - Multi-tenant security isolation (`assertTenant`)
  - Interval overlap range queries (`start_time <= endDate AND end_time >= startDate`)
  - Smart contact and location inheritance from linked properties and clients
  - Chronological validation and phone normalization
  - Re-exported in `apps/api/src/services/domain/index.js`
- [x] **REST Controller (`apps/api/src/routes/appointments.js`)**:
  - `GET /api/appointments` (filtered by date range, job, client, status)
  - `GET /api/appointments/:id` (full relational joins)
  - `POST /api/appointments` (Zod validation with timestamp order refinement)
  - `PATCH /api/appointments/:id` (partial validation with chronological validation)
  - `DELETE /api/appointments/:id`
  - Mounted in `apps/api/src/index.js` at `/api/appointments`
- [x] **Backend Automated Tests (`apps/api/test/appointmentService.test.js`)**:
  - Security guards, parameter validations, schemas, and phone normalization verified (35/35 passing tests)

---

### Milestone 2: Frontend Data Access Layer & State Hooks
- [x] **Query Keys (`apps/web/src/lib/queryKeys.js`)**:
  - `appointments.all`, `appointments.lists()`, `appointments.list(filters)`, `appointments.range(start, end)`, `appointments.detail(id)`
- [x] **TanStack Query Hooks (`apps/web/src/hooks/api/useAppointments.js`)**:
  - `useAppointments`, `useAppointment`, `useCreateAppointment`, `useUpdateAppointment`, `useDeleteAppointment`
- [x] **Zod Validation Schema (`apps/web/src/schemas/appointmentSchema.js`)**:
  - Validates `title`, `start_time`, `end_time`, `status`, `color_tag`, `contact_role`, `reminder_minutes`, with `end_time >= start_time` refinement

---

### Milestone 3 & 4: Schedule-X Viewport Shell & Interactive Modals
- [x] **Schedule-X Integration (`apps/web/src/components/calendar/CalendarView.jsx`)**:
  - Integrated `@schedule-x/react`, `@schedule-x/calendar`, `@schedule-x/drag-and-drop`, `@schedule-x/theme-default`
  - Week View, Month Grid View, and Day View
  - Dynamic color calendars matching palette (`blue`, `amber`, `green`, `purple`, `red`, `indigo`, `gray`)
  - Status filter chips (`All Events`, `Scheduled`, `In Progress`, `Completed`)
  - Drag-and-drop and resize rescheduling wired to `useUpdateAppointment`
  - Click-to-create (`onClickDate`, `onClickDateTime`) wired to `AddAppointmentModal`
- [x] **Routing & Navigation**:
  - Route `/calendar` registered in `App.jsx` with code splitting
  - Sidebar link added with `calendar_month` icon in `DashboardLayout.jsx`
- [x] **Interactive Modals**:
  - `AddAppointmentModal.jsx`: React Hook Form + Zod, quick duration buttons (`+30m`, `+1h`, `+2h`, `4h`, `8h`), linked entities (Client, Job, Property), smart contact switcher (`[Billing Client]`, `[On-Site Resident]`, `[Property Manager]`, `[Custom]`), and address auto-fill
  - `AppointmentDetailsModal.jsx`: Google Calendar-style inspection card, status badge, formatted duration, 1-tap "Directions" (Google Maps), 1-tap "Call" and "Text" buttons, linked client/job navigation pills, and quick "Mark Completed" / "Edit" / "Delete" actions

---

### Milestone 5: Realtime Multi-Device Sync & Imminent Alerts
- [ ] Supabase Realtime channel subscription for `appointments` in `useSupabaseRealtimeSync.js`
- [ ] In-app imminent reminder badge on Calendar icon
- [ ] Cross-entity deep linking from Job Details and Client Details tabs
