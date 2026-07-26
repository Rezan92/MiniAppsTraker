# Architecture Guidelines

## Monorepo Structure
- **apps/web**: Contains the React/MUI frontend application.
- **apps/api**: Contains the Node.js/Express backend services.
- **packages/**: Contains shared resources (e.g., Zod schemas, types).

## Microservices/Mini-Apps
- Keep mini-apps isolated as microservices within the monorepo structure where appropriate.
- Separation of concerns: Ensure distinct boundaries between different domains (e.g., Auth, CRM, Invoicing).

## Multi-Tenancy
- All data must be scoped to a `tenant_id`.
- Ensure Row-Level Security (RLS) is applied in the database (Supabase/PostgreSQL) to enforce multi-tenancy.
