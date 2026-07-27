# Epic 05: DevOps & CI/CD Pipeline

- [ ] **Task 5.1: GitHub Actions Automated Migrations**
  - Context: Eliminate manual database updates.
  - Action: Create a `.github/workflows/deploy.yml` pipeline.
  - Logic: On push to the `main` branch, use the Supabase CLI to automatically authenticate and run `supabase db push` to apply new migration files (e.g., `00002_add_notes_to_clients.sql`) to the remote database sequentially.
