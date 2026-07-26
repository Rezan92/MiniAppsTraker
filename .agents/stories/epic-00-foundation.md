# Epic 00: Foundation & Environment Setup

- [x] **Task 0.1: Workspace & Root Configuration**
  - Configure root `package.json` for pnpm/npm monorepo workspaces (`apps/*`).
  - Create `.env.example` in `apps/api` and `apps/web` with `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `PORT=4000`.

- [ ] **Task 0.2: Express API Skeleton**
  - Initialize Express app in `apps/api/src/index.js` using ES Modules.
  - Implement CORS middleware, Zod validation handler, and `/api/health` status check endpoint.

- [ ] **Task 0.3: Supabase Database Client Initialization**
  - Configure `@supabase/supabase-js` client in `apps/api/src/config/supabase.js`.
  - Verify database connectivity on server startup.
