# Tech Stack & Coding Standards

- **Runtime & Syntax:** Node.js v20+ with native ES Modules (`import/export` only). Prohibit `require()`, `module.exports`, `var`, or callback-based async code.
- **Backend:** Express.js or Fastify. Use standard `axios` or native `fetch`. Strictly forbidden: deprecated libraries (e.g., `request`).
- **Frontend:** React 18+ with Material UI (MUI v6+). Use functional components and custom React hooks.
- **Database:** PostgreSQL on Supabase using versioned `.sql` migration files. Every table must include `tenant_id` for multi-tenancy with Row Level Security (RLS).
- **Validation:** Zod for all API query/body validations and shared TypeScript/JS types.
- **Error Handling:** Standardized API response wrappers `{ success: boolean, data?: any, error?: string }`.
