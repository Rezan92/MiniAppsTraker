# Epic 11.5: Production UI Controls & Auth Expansion

## Overview
Implement permanent, production-grade application controls to allow users to securely log out, switch active workspaces, and create new workspaces. Expand authentication to fully support Email/Password sign-ups and password resets.

## Tasks
- [ ] **Task 11.5.1: Profile Dropdown & Secure Logout**
  - Build an interactive User Profile dropdown component in the Top Navigation.
  - Display the user's name/email.
  - Implement a permanent "Log Out" button inside this dropdown that calls Supabase `signOut()`, clears the TanStack Query cache, and routes to `/login`.

- [ ] **Task 11.5.2: Workspace Switcher Dropdown**
  - Build an interactive Workspace Switcher dropdown in the Top Navigation.
  - Map over the array from `GET /api/auth/workspaces`.
  - Include a permanent "+ Create New Workspace" action at the bottom of the dropdown that routes the user directly to `/onboarding`.

- [ ] **Task 11.5.3: The Employee Escape Hatch**
  - Update `Onboarding.jsx`. Add a secondary layout block stating: "Are you an employee? Please log out and click the invitation link sent to your email."
  - Wire up a "Log Out" button specifically for this block to un-trap employees.

- [x] **Task 11.5.4: Auth Expansion (Email & Password)**
  - Ensure standard Email/Password Sign Up and Log In methods are fully wired up in the Supabase Auth context.
  - Build the `/forgot-password` React route.
  - Wire up the Supabase `resetPasswordForEmail` trigger.

- [ ] **Task 11.5.5: In-App Workspace Creation & Limits (Patch)**
  - Replace the `/onboarding` redirect in the Workspace Switcher with a local state toggle that opens a `<CreateWorkspaceModal />`.
  - Add a backend task to enforce a 5-workspace limit per user.

- [ ] **Task 11.5.6: Apply Final Designer HTML (Pending)**
  - Once the designer provides the polished HTML/Tailwind for these components, overwrite the base Tailwind structures with the final designs while preserving React logic.
