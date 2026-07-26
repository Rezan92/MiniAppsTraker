# Architecture & Mini-App Guidelines

- **Monorepo Structure:** Keep `/apps/web` (React UI), `/apps/api` (Express backend), and `/packages` cleanly separated.
- **Mini-App Isolation:** Core domains (Invoicing, Jobs, Clients) must be developed as self-contained services inside the backend.
- **Dual Exposure for AI Readiness:** Every mini-app API endpoint must be accompanied by a Zod schema so it can be exposed as a Gemini AI Tool Function Call in future phases.
- **Data Isolation:** All queries must explicitly filter by `tenant_id` derived from the user's authenticated session token.
