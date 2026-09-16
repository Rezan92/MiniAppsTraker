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

### Phase 2: Design System & Common UI Primitives (`apps/web/src/components/common/`)
- [x] **Adaptive Tables (`DataTable.jsx`)**: Render standard `<table>` on desktop (`hidden md:table`); render stacked readable cards on mobile (`md:hidden`).
- [x] **Bottom Sheet Pattern (`BaseModal.jsx`)**: Transform centered dialogs into native-feeling mobile bottom sheets (`rounded-t-2xl max-h-[90dvh]`) on screens `< 768px`.
- [x] **Popovers & Date Pickers (`DatePicker.jsx`, `DateRangeFilter.jsx`)**: Responsive popovers preventing horizontal screen clipping; mobile single-column sheets.
- [x] **Tooltips & Hover Suppression (`Tooltip.jsx`)**: Suppress hover tooltips on touch devices (`@media (hover: hover)`).
- [x] **Horizontal Pill Scrollers**: Touch-scrollable filter bars and chips with `-mx-4 px-4 overflow-x-auto`.

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
