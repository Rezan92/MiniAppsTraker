# Tech Stack Rules

## Backend (Node.js/Express)
- **ES Modules ONLY**: Use `import`/`export`. No `require`, no `module.exports`. Set `"type": "module"` in `package.json`.
- **No Deprecated Practices**: Do NOT use `var`. Use `const` and `let`. Do NOT use deprecated libraries like `request`.
- **Error Handling**: Strict error handling must be implemented using middleware and try/catch blocks. Do not swallow errors.

## Frontend (React)
- **Styling**: Material UI (MUI v6+). No other UI libraries unless explicitly requested.

## Validation
- **Zod**: Use Zod schemas for all validation. Schemas MUST be shared between frontend and backend in the `packages/` directory.

## General
- **Monorepo**: Adhere strictly to the workspace structure (`apps/web`, `apps/api`, `packages/`).
