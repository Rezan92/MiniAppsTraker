# Codebase Engineering Improvement Roadmap

This document serves as the comprehensive architectural audit, security review, code-quality assessment, and strategic improvement roadmap for **MiniAppsTraker**.

---

## 1. Security, Authentication & Authorization Hardening

### 1.1 Dynamic Client URL Resolution for Invitations
- **Affected Files**: [`apps/api/src/routes/invitations.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/routes/invitations.js)
- **Problem**: Join invitation links currently hardcode `http://localhost:5173/join/${invite.token}`, which breaks in staging, production, or custom domain environments.
- **Remedy**: Resolve the base URL dynamically from `process.env.APP_URL` or `process.env.CLIENT_URL` with fallback to `req.headers.origin || 'http://localhost:5173'`.

### 1.2 Rate Limiting on Public & Sensitive Endpoints
- **Affected Files**: [`apps/api/src/routes/invitations.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/routes/invitations.js), [`apps/api/src/routes/auth.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/routes/auth.js)
- **Problem**: The public `/api/invitations/:token` endpoint and workspace creation `/api/auth/onboarding` lack rate limiting, making them vulnerable to brute-force attacks and abuse.
- **Remedy**: Introduce `express-rate-limit` middleware on auth/invitation routes (e.g., max 10 requests per 15 minutes per IP for invite validation).

### 1.3 Unified Role-Based Access Control (RBAC) Middleware
- **Affected Files**: [`apps/api/src/routes/invitations.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/routes/invitations.js), [`apps/api/src/routes/auth.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/routes/auth.js), [`apps/api/src/middleware/rbac.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/middleware/rbac.js)
- **Problem**: Some routes check `if (req.user.role !== 'admin')` inline while others use `requireRole('admin')`.
- **Remedy**: Standardize all administrative routes to strictly use `requireRole('admin')` middleware.

### 1.4 User Auto-Provisioning Concurrency Hardening
- **Affected Files**: [`apps/api/src/middleware/auth.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/middleware/auth.js)
- **Problem**: When a new user logs in, simultaneous parallel frontend queries (e.g. `/api/auth/me` and `/api/clients`) can trigger race conditions on `users.insert()`.
- **Remedy**: Use `upsert` with `onConflict: 'id'` or catch duplicate key exceptions cleanly.

---

## 2. Redundant "Ghost" Files & Dead Code Elimination

### 2.1 Eliminate Deprecated Shared Modal Wrappers
- **Affected Files**:
  - [`apps/web/src/components/shared/CreateJobModal.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/shared/CreateJobModal.jsx) (DEPRECATE / DELETE)
  - [`apps/web/src/components/shared/CreateClientModal.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/shared/CreateClientModal.jsx) (DEPRECATE / DELETE)
  - [`apps/web/src/components/dashboard/Dashboard.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/dashboard/Dashboard.jsx)
  - [`apps/web/src/components/layout/DashboardLayout.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/layout/DashboardLayout.jsx)
- **Problem**: `CreateJobModal.jsx` and `CreateClientModal.jsx` are outdated wrappers that use raw `fetch()`, manual form states, and outdated query keys (`dashboardSummary`).
- **Remedy**: Refactor `Dashboard.jsx` and `DashboardLayout.jsx` to directly render [`AddJobModal.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/jobs/AddJobModal.jsx) and [`AddClientModal.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/clients/AddClientModal.jsx) with `useCreateJob()` and `useCreateClient()`. Delete the legacy wrapper files.

### 2.2 Purge Direct `fetch()` Calls Across UI Views
- **Affected Files**:
  - [`apps/web/src/components/dashboard/Dashboard.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/dashboard/Dashboard.jsx)
  - [`apps/web/src/components/settings/CompanyProfile.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/settings/CompanyProfile.jsx)
- **Problem**: Direct `fetch()` calls bypass token handling, error normalization, and centralized API configuration.
- **Remedy**: Create a dedicated `useDashboardSummary()` query hook and migrate `CompanyProfile.jsx` to `apiClient` / `useWorkspace()`.

---

## 3. Backend API Standardization & Data Integrity

### 3.1 Unified API Response & Error Contract
- **Affected Files**: All files in [`apps/api/src/routes/`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/routes/) and [`apps/api/src/middleware/errorHandler.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/middleware/errorHandler.js)
- **Problem**: Some endpoints return `{ success: false, error: "string" }` while global error handling returns `{ success: false, error: { message, code } }`.
- **Remedy**: Standardize all routes and middleware on a uniform contract:
  ```json
  {
    "success": false,
    "error": {
      "message": "Human readable error description",
      "code": "VALIDATION_ERROR | NOT_FOUND | FORBIDDEN | INTERNAL_ERROR",
      "details": []
    }
  }
  ```

### 3.2 Pagination & Query Boundaries
- **Affected Files**: [`apps/api/src/routes/clients.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/routes/clients.js), [`apps/api/src/routes/jobs.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/routes/jobs.js), [`apps/api/src/routes/invoices.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/routes/invoices.js)
- **Problem**: Endpoints return unbound full datasets, creating performance bottlenecks as workspaces grow.
- **Remedy**: Implement optional `limit` and `offset` / `page` query parameters with sensible defaults (e.g. `limit=50`).

### 3.3 Strict Payload Validation on PATCH Endpoints
- **Affected Files**: [`apps/api/src/routes/jobs.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/routes/jobs.js), [`apps/api/src/routes/clients.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/routes/clients.js), [`apps/api/src/routes/properties.js`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/api/src/routes/properties.js)
- **Problem**: Partial updates could accidentally persist unrecognized properties.
- **Remedy**: Enforce strict schema stripping (`.strict()` or validated object mappings) before sending payload updates to Supabase.

---

## 4. Form Validation & UX Standardization

### 4.1 Migrate Settings & Auth Forms to React Hook Form + Zod
- **Affected Files**:
  - [`apps/web/src/components/settings/CompanyProfile.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/settings/CompanyProfile.jsx)
  - [`apps/web/src/components/LoginCard.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/LoginCard.jsx)
  - [`apps/web/src/components/Onboarding.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/Onboarding.jsx)
  - [`apps/web/src/components/Join.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/Join.jsx)
  - [`apps/web/src/components/ForgotPassword.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/ForgotPassword.jsx)
- **Problem**: These views still manage state manually with raw `useState` and lack real-time inline validation feedback (`mode: 'onChange'`).
- **Remedy**: Define domain schemas in `apps/web/src/schemas/` (`companySchema.js`, `authSchema.js`) and standardize forms with `FormField.jsx` and `useForm({ mode: 'onChange' })`.

---

## 5. Design System, Styling & CSS Token Consistency

### 5.1 Replace Hardcoded CSS Values with Design System Tokens
- **Affected Files**: [`apps/web/src/components/layout/DashboardLayout.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/layout/DashboardLayout.jsx), [`apps/web/src/components/settings/SettingsLayout.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/settings/SettingsLayout.jsx)
- **Problem**: Arbitrary classes like `bg-[#1F2937]`, `border-[#374151]`, and `bg-[#F9FAFB]` bypass the Tailwind v4 `@theme` design tokens defined in [`index.css`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/index.css).
- **Remedy**: Replace hardcoded values with design tokens (`bg-inverse-surface`, `border-outline-variant`, `bg-surface-bright`).

### 5.2 Print Stylesheet Isolation
- **Affected Files**: [`apps/web/src/components/invoices/InvoicePreview.css`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/components/invoices/InvoicePreview.css)
- **Problem**: Global `.invoice-content` styles can interfere with other views if not scoped.
- **Remedy**: Isolate print stylesheets or migrate to CSS Modules / scoped print media queries.

---

## 6. Performance, Bundling & Code-Splitting

### 6.1 Route-Level Code Splitting via React `lazy()` and `Suspense`
- **Affected Files**: [`apps/web/src/App.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/App.jsx)
- **Problem**: All application views (InvoiceBuilder, JobDetails, ClientDetails, Settings) are compiled into a single initial bundle (>810 kB).
- **Remedy**: Implement dynamic imports (`React.lazy(() => import(...))`) for main routes with a lightweight fallback skeleton.

### 6.2 TanStack Query Cache & Stale Time Optimization
- **Affected Files**: [`apps/web/src/main.jsx`](file:///c:/Users/syria/Documents/WebProjects/MiniAppsTraker/apps/web/src/main.jsx)
- **Problem**: Default TanStack query settings refetch aggressively on window refocus.
- **Remedy**: Configure default query client options (`staleTime: 1000 * 60 * 2` [2 mins], `refetchOnWindowFocus: false`) with per-hook overrides.

---

## Summary Prioritization Matrix

| # | Improvement Area | Category | Priority | Effort | Impact | Status | Target Area |
|---|---|---|---|---|---|---|---|
| 1 | Dynamic Client URL & Invite Links | Security | **P0 (Critical)** | Low | High | **Completed** | `apps/api/src/routes/invitations.js` |
| 2 | Rate Limiting on Public Auth & Invite Endpoints | Security | **P0 (Critical)** | Low | High | **Completed** | `apps/api/src/routes/` |
| 3 | Unified RBAC Middleware (`requireRole`) | Security | **P0 (Critical)** | Low | High | **Completed** | `apps/api/src/middleware/rbac.js` |
| 4 | Purge Duplicate `CreateJobModal` & `CreateClientModal` | Clean Code | **P1 (High)** | Low | High | **Completed** | `apps/web/src/components/shared/` |
| 5 | Replace Direct `fetch()` with `useDashboardSummary` | Architecture | **P1 (High)** | Medium | High | **Completed** | `apps/web/src/components/dashboard/` |
| 6 | Unified Backend API Response & Error Contract | Architecture | **P1 (High)** | Medium | High | **Completed** | `apps/api/src/` |
| 7 | Migrate Company Profile & Auth to React Hook Form | Code Quality | **P1 (High)** | Medium | High | *Pending* | `apps/web/src/components/settings/` |
| 8 | Strict Payload Validation on PATCH Routes | Data Integrity | **P1 (High)** | Low | Medium | **Completed** | `apps/api/src/routes/` |
| 9 | Route-Level Lazy Loading (`React.lazy`) | Performance | **P2 (Medium)** | Low | High | *Pending* | `apps/web/src/App.jsx` |
| 10 | Tailwind Design System Token Alignment | UX / Styling | **P2 (Medium)** | Low | Medium | *Pending* | `apps/web/src/components/layout/` |
| 11 | TanStack Query Global Stale Times | Performance | **P2 (Medium)** | Low | Medium | *Pending* | `apps/web/src/main.jsx` |
| 12 | Print Stylesheet Modularization | CSS Architecture | **P3 (Low)** | Low | Low | *Pending* | `apps/web/src/components/invoices/` |
| 13 | API Query Pagination (`limit`/`offset`) | Performance | **P3 (Low)** | Medium | Medium | *Pending* | `apps/api/src/routes/` |

---
