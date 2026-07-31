# Epic 11: Tenant Onboarding & Invitation System

## Overview
Handle the creation of new businesses (Tenants) and the secure invitation flow for adding workforce users to a tenant without exposing tenant lists publicly.

## Tasks
- [ ] **Task 11.1: Tenant Owner Onboarding**
  - Create an `/onboarding` route for new signups who lack a `tenant_id`.
  - Build a form to collect Business Name and Contact Info. Upon save, create the `tenants` record and promote the user to 'Admin'.
- [ ] **Task 11.2: Database Schema for Invitations**
  - Create an `invitations` table: `id`, `tenant_id`, `email`, `token` (secure hash), `role`, `expires_at`, `status` (pending, accepted).
- [ ] **Task 11.3: Secure Invite Flow**
  - Create an Admin UI to generate invites by email.
  - Create a `/join/:token` route. The system must validate the token and force the user to sign up using the exact email attached to the invitation.
- [ ] **Task 11.4: Settings Separation**
  - Build `/settings`. Display 'Company Settings' only if the user is an Admin. Display 'Personal Settings' for all users.
