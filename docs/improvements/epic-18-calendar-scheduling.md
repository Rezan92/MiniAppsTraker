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
  - Integrated `@schedule-x/react`, `@schedule-x/calendar`, `@schedule-x/drag-and-drop`, `@schedule-x/current-time`, `@schedule-x/resize`, `@schedule-x/calendar-controls`, `@schedule-x/theme-default`
  - Week View, Month Grid View, and Day View with Google Calendar ergonomics
  - Custom Google-style Top Navigation Header Bar: dynamic period title, "<" and ">" Chevrons, "Today" quick jump, Hamburger toggle, and Day/Week/Month dropdown
  - Collapsible internal calendar sidebar with Google "+ Create" button, interactive Mini Month Picker (`MiniCalendar.jsx`), and status toggles
  - Stacking context resolution: elevated header and dropdown to `z-50` preventing clipping behind calendar cells
  - Day view alignment: left-aligned day label ("SAT 12") directly above the time grid column
  - Vertical scrollability: bounded flex container sizing unlocking smooth scrolling across all 24 hours (12 AM - 11 PM) with auto-scroll to morning hours
  - Month view layout: edge-to-edge full width with crisp Google-style borders and date chips
  - Live red current-time indicator line showing active minute in Day & Week views
  - Drag-and-drop and resize duration rescheduling wired to `useUpdateAppointment`
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

---

### Milestone 6: AI Copilot Scheduling & Calendar Integration (Epic 18 Parity)
- [x] **OpenAPI / Gemini AI Tool Specifications (`aiToolDefinitions.js`)**:
  - `list_appointments`: Query appointments with date range filters (`start_date`, `end_date`), `client_name_or_id`, `job_id`, and `status`.
  - `get_appointment_details`: Retrieve full appointment metadata and relations by identifier.
  - `create_appointment`: Schedule appointments with title, start/end times, linked client/job/property, notes, contact name/phone, color tag, and all-day flags.
  - `reschedule_appointment`: Relocate/shift an appointment to a new date/time with duration preservation.
  - `update_appointment`: Edit title, times, status, color tag, notes, or contact info.
  - `delete_appointment`: Permanently delete or cancel scheduled appointments.
- [x] **Smart Entity Resolution (`entityResolver.js`)**:
  - Implemented `resolveAppointment`: Resolves events by UUID, exact title, case-insensitive substring, linked client name, contact name, or location within tenant boundary.
- [x] **AI Domain Tool Executors (`aiToolExecutors.js`)**:
  - Wired all 6 scheduling tools directly into `appointmentService` domain layer (Rule 14).
  - Emits `{ mutation: 'appointments' }` to automatically trigger frontend cache invalidation.
- [x] **Temporal Prompt Engineering (`promptBuilder.js`)**:
  - Dynamic user timezone injection, current ISO date, and human-friendly weekday string (e.g., "Saturday, September 12, 2026").
  - Relative temporal arithmetic instructions ("tomorrow", "day after tomorrow", "this week", "next week", "next Monday").
  - Calendar domain rules (1-hour default duration, Google Calendar color palette fallback).
- [x] **Real-Time Client Invalidation & Screen Context (`AiContext.jsx` & `CalendarView.jsx`)**:
  - `AiContext.jsx` handles `'appointments'` mutation by invalidating `QUERY_KEYS.appointments.all` (`['appointments']`).
  - `CalendarView.jsx` publishes active view, selected date, user timezone, visible range, and status filters via `useScreenContext`.
