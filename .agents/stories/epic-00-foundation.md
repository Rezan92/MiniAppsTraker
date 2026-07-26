# Epic 00: Foundation & Environment Setup

- [x] **Task 0.1: Workspace & Root Configuration**
  - Configure root `package.json` for pnpm/npm monorepo workspaces (`apps/*`).
  - Create `.env.example` in `apps/api` and `apps/web` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `PORT=4000`.

- [x] **Task 0.2: Express API Skeleton**
  - Initialize Express app in `apps/api/src/index.js` using ES Modules.
  - Implement CORS middleware, Zod validation handler, and `/api/health` status check endpoint.

- [x] **Task 0.3: Supabase Database Client Initialization**
  - Configure `@supabase/supabase-js` client in `apps/api/src/config/supabase.js`.
  - Verify database connectivity on server startup.
### Implementation Notes & Additions
- Refactored environment variable SUPABASE_ANON_KEY to SUPABASE_PUBLISHABLE_KEY in both pps/api/.env.example and pps/web/.env.example to align with modern Supabase terminology.
