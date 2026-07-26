# MiniAppsTraker

MiniAppsTraker is a multi-tenant SaaS application designed for handyman businesses to manage clients, jobs, tracking job materials, and invoicing.

## Architecture & Tech Stack

This project is structured as a monorepo workspace:
- **Frontend (`apps/web`)**: React, Vite, Material UI (MUI v6+).
- **Backend (`apps/api`)**: Node.js, Express (strictly ES Modules).
- **Shared (`packages/`)**: Shared types and Zod schemas for validation across frontend and backend.
- **Database**: PostgreSQL on Supabase with Row-Level Security (RLS) for multi-tenancy.

## Project Epics
- **Epic 00**: Foundation (Workspace setup, API skeleton, DB Connection)
- **Epic 01**: Auth & Multi-Tenancy (Google Auth, RBAC, Tenant setup)
- **Epic 02**: CRM (Client/Job management, material/hours tracking)
- **Epic 03**: Invoices (PDF generation, job snapshots, status tracking)

## Development Rules
Check the `.agents/rules/` directory for specific architecture and tech-stack guidelines.
