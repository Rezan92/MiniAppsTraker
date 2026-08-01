# Epic 17: Master UI/UX Design Backlog

## Overview
This epic tracks all pending HTML/Tailwind screen designs required from the UI/UX Designer. Once a screen is delivered, it will be integrated into its respective functional Epic.

## Pending Screens & Specifications

- [ ] **Task 17.1: Pre-Login Gateway (Welcome Choice)**
  - **Description:** The entry screen before login. Two split cards.
  - **Card A:** "I'm a Business Owner" -> "Start a New Business".
  - **Card B:** "I'm an Employee" -> "Please click the secure invitation link sent to your email to join. [I already have an account - Log In]".

- [ ] **Task 17.2: Tenant Owner Onboarding & Employee Escape**
  - **Description:** The `/onboarding` screen. Split-pane layout (image left, form right).
  - **Form:** Business Name, Phone Number, Address.
  - **Employee Escape Hatch:** A banner at the bottom stating: "Are you an employee trying to join a team? Please log out and click the invitation link sent to your email." Includes a secondary "Log Out" button.

- [ ] **Task 17.3: Secure Invite Link (`/join/:token`)**
  - **Description:** The screen an employee sees when clicking their email invite. Split-pane layout.
  - **Content:** "You've been invited to join [Business Name]." 
  - **Action:** Prompts them to log in or confirm their profile details (Name, Phone) to accept the invite.

- [ ] **Task 17.4: Core Navigation Dropdowns**
  - **Description:** Two floating dropdown menus for the Top Navigation.
  - **Menu A (User Profile):** Shows Name/Email, "My Profile", "Settings", and a distinct "Log Out" button.
  - **Menu B (Workspace Switcher):** Shows dummy business names, active checkmark, and a "+ Create New Workspace" button at the bottom.

- [ ] **Task 17.5: Forgot Password Screen**
  - **Description:** Standard split-pane layout for password recovery.
  - **Content:** Email input, "Send Reset Link" button, and "Back to Login" text link.

- [ ] **Task 17.6: Settings Hub Shell**
  - **Description:** The master dashboard `/settings` layout.
  - **Content:** A side-navigation menu connecting to the sub-tabs.

- [ ] **Task 17.7: Create Workspace Modal (From Epic 11.5 Patch)**
  - **Description:** A centered, in-app pop-up modal overlay for creating secondary workspaces.
  - **Content:** Business Name, Phone, and Address inputs with a creation button.

- [ ] **Task 17.8: Settings - Company Profile Tab**
  - **Description:** The form for updating basic business details.
  - **Content:** Business Name, Phone, Address, Logo Upload.

- [ ] **Task 17.9: Settings - Danger Zone & Destructive Deletion Modal**
  - **Description:** The red-themed deletion container at the bottom of the Company Profile, and its type-to-confirm modal.
  - **Content:** "Delete Workspace" button, confirmation input matching the business name, and final delete button.

- [ ] **Task 17.10: Settings - Team Management Tab**
  - **Description:** Interface for managing members and invites.
  - **Content:** Invite form (Email, Role), Pending Invites table, Active Team table.

- [ ] **Task 17.11: Settings - Service Configuration Tab**
  - **Description:** Form for operational defaults.
  - **Content:** Default hourly rates, tax rates, and service categories.

- [ ] **Task 17.12: Settings - My Account Tab**
  - **Description:** Personal user details.
  - **Content:** Name, Phone, Password Reset form.
