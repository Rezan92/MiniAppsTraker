# Mobile Optimization & Touch Ergonomics Roadmap

This document serves as the single source of truth for the mobile optimization initiative across **MiniAppsTraker**. It tracks implementation phases, responsive design patterns, touch ergonomics, and mobile-specific workflows while enforcing **Zero Desktop Regressions** (desktop viewports ≥ 768px remain untouched).

---

## Cardinal Constraint: Zero Desktop Regressions
- Desktop viewports (`md:` / `lg:` breakpoints, ≥ 768px) must remain completely untouched, visually and functionally identical.
- All mobile enhancements must be strictly additive and isolated using Tailwind responsive modifiers (`hidden md:flex`, `block md:hidden`), dynamic viewport units (`100dvh`), and safe-area utilities.

---

## Implementation Progress

### Phase 0: Foundations, Tokens & Touch Ergonomics
- [x] **Viewport & Head (`apps/web/index.html`)**: Viewport meta tag with `viewport-fit=cover`, `maximum-scale=1.0`, `user-scalable=no` to prevent auto-zoom.
- [x] **Safe-Area Insets (`apps/web/src/index.css`)**: Environment variables for iOS notch & home indicators (`--sat`, `--sab`, `--sal`, `--sar`).
- [x] **Dynamic Viewports (`min-h-[100dvh]`)**: Replace all `h-screen` / `min-h-screen` across layouts, auth, and onboarding to eliminate mobile browser URL bar jumpiness.
- [x] **Touch Device Hook (`apps/web/src/hooks/ui/useMediaQuery.js`)**: Runtime hook (`useMediaQuery`, `useIsMobile`, `useIsTouchDevice`) for viewport and pointer checks.
- [x] **Typography & 16px Rule (`apps/web/src/index.css`)**: Base rule ensuring inputs, selects, and textareas render at `16px` on mobile (< 640px) to prevent iOS Safari auto-zoom on field focus.
- [x] **Minimum Hit Areas**: Enforce 44x44px minimum touch target boundaries across all mobile interactive elements.

---

### Phase 1: App Shell, Navigation & Overlay Architecture
- [x] **Desktop Shell Preservation (`DashboardLayout.jsx`)**: Desktop sidebar (`hidden md:flex`) and layout remain 100% untouched.
- [x] **Mobile Header (`DashboardLayout.jsx`)**: Sticky top bar (`md:hidden`) with workspace branding, offline banner (`NetworkBanner.jsx`), and hamburger trigger.
- [x] **Bottom Navigation Dock (`DashboardLayout.jsx`)**: Fixed bottom dock (`md:hidden`) for primary flows (Dashboard, Clients, Jobs, Calendar, Invoices) with safe-area padding (`pb-[calc(0.5rem+var(--sab,0px))]`).
- [x] **Off-Canvas Drawer (`DashboardLayout.jsx`)**: Slide-in mobile drawer for workspace switcher, secondary navigation (Settings, Profile, Support), and sign out.
- [x] **Toast Repositioning (`ToastContext.jsx`)**: Relocate floating toasts on mobile to top-center (`top-[calc(1rem+var(--sat,0px))]`) avoiding bottom navigation collision while preserving desktop bottom-right positioning.

---

### Phase 2: Design System, Tables & Mobile Navigation Refinements
- [x] **Adaptive Tables (`DataTable.jsx`)**: Responsive HTML `<table>` that fits mobile screens without horizontal scroll. Keeps primary columns visible (`Invoice #`, `Total`, `Status`) and expands remaining columns into interactive inline detail sub-rows with smooth animated chevrons. Desktop remains 100% full-width table.
- [x] **Dashboard Responsive Tables (`Dashboard.jsx`)**: Financial Tracking (Invoices) and Operational Tracking (Jobs) converted to compact responsive tables with expandable inline sub-rows, zero horizontal scroll on mobile, and direct navigation links. Desktop view is 100% identical and regression-free.
- [x] **Bottom Sheet Pattern (`BaseModal.jsx`)**: Centered modals transform into native mobile bottom sheets (`rounded-t-2xl max-h-[90dvh]`) on screens `< 768px` with top grab handle and safe-area padding.
- [x] **Popovers & Compact Filters (`DateRangeFilter.jsx`, `PageHeader.jsx`)**: Consolidated search and date filters with compact single-tap buttons and pills (`h-10 text-sm`), eliminating sprawling inputs.
- [x] **Tooltips & Touch Suppression (`Tooltip.jsx`)**: Suppress hover tooltips on touch devices (`@media (hover: hover) and (pointer: fine)`).
- [x] **Onboarding Mobile Ergonomics (`Onboarding.jsx`, `ProtectedRoute.jsx`)**: Vertical scroll enabled (`overflow-y-auto min-h-[100dvh]`) preventing virtual keyboard entrapment, standardized `rounded-xl` tokens, `inputMode="tel"`, and route guard redirecting onboarded users with tenant to `/`.
- [x] **Invoice Builder Top Actions (`InvoiceBuilder.jsx`)**: Sized and aligned top action buttons (`h-10`, responsive grid/flex layout) on mobile screens, eliminating horizontal overflow and oversized buttons.
- [x] **AI Copilot Floating Orb (`AiCopilotWidget.jsx`, `useDraggableResizableWindow.js`)**: Added `touch-none` to prevent mobile scroll hijacking, increased drag threshold to 10px to distinguish clicks/holds from drags, added fallback `onClick`, and offset floating circle above the bottom navigation dock.

---

### Phase 3: Auth, Onboarding & Settings
- [ ] **Auth Flow Layouts (`LoginCard.jsx`, `Join.jsx`, `ForgotPassword.jsx`)**: Fluid responsive bounds (`w-full max-w-md px-4`) preventing virtual keyboard obstruction.
- [ ] **Onboarding Wizard (`Onboarding.jsx`)**: Mobile stepped progress indicator with clear "Step X of Y" labels.
- [ ] **Settings Sub-Navigation (`SettingsLayout.jsx`)**: Scrollable horizontal tab strip on mobile (`< 768px`).

---

### Phase 4: Core Business Domains (Clients, Jobs, Invoices)
- [ ] **Clients & Properties (`ClientList.jsx`, `ClientDetails.jsx`, `PropertiesList.jsx`)**:
  - Instant native `tel:` and mapping navigation links on mobile cards.
  - Sticky tab headers for client details (`Overview`, `Properties`, `Jobs`, `Invoices`).
- [ ] **Jobs & Field Hours (`JobList.jsx`, `JobDetails.jsx`, `AddJobHoursModal.jsx`)**:
  - Prominent sticky primary CTA ("Log Hours") on mobile job views.
  - Explicit numeric virtual keyboards (`inputMode="decimal"` for hours/rates, `inputMode="numeric"` for quantities).
- [ ] **Invoices & Billing (`InvoiceBuilder.jsx`, `InvoicePreview.jsx`)**:
  - 2-step mobile workflow (Step 1: Items & Labor; Step 2: Live Preview & Export).
  - Vertically stacked labor and material cards with large touch-friendly steppers.

---

### Phase 5: High-Complexity Modules (Calendar & AI Copilot)
- [ ] **Calendar Scheduling (`CalendarView.jsx`, `CalendarSidebar.jsx`)**:
  - Default mobile view to Day / Agenda list; suppress multi-column week grids on small screens.
  - Replace desktop right-click context menu with single-tap mobile action sheet.
- [ ] **AI Assistant (`AiCopilotWidget.jsx`)**:
  - Disable mouse-coordinate dragging on mobile to avoid scrolling collisions.
  - Render as a floating action button (FAB) at `bottom-20 right-4` opening a full-screen drawer on tap.
  - Enhance `CameraCaptureModal.jsx` with native `<input type="file" capture="environment" />`.

---

### Phase 6: Edge Cases, Field Conditions & Regression Verification
- [ ] Prevent iOS modal background bounce (`overscroll-behavior-y: contain`).
- [ ] Virtual Viewport API (`window.visualViewport`) integration for soft-keyboard form ergonomics.
- [ ] Form dismissal protection during mobile back-swipes (`useUnsavedChangesWarning.js`).
- [ ] Responsive cross-viewport regression test suite (375px, 393px, 412px, 768px, 1280px+).
