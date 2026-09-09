---
trigger: always_on
---

# Developer Rules

These rules dictate how the AI Developer Agent should behave and interact with the codebase. They must be followed closely during all tasks.

## Rule 1: Centralized Roadmap Tracking
**Always track implementation progress in the `docs/improvements/` directory.**
We no longer use `.agents/stories/` for user stories. Whenever a major architectural improvement or feature phase is completed, the developer agent must locate the corresponding tracking file in `docs/improvements/` (e.g., `codebase-improvement-roadmap.md` or `ai-copilot-roadmap.md`) and mark the relevant tasks as completed `[x]` to maintain a single source of truth for project progress.

## Rule 2: Commit & Push Protocol (Always Auto-Commit & Push)
**Always commit and push changes after each task or change with a detailed commit message describing everything that was done.**
Whenever an update, feature, bugfix, or refactor is completed:
1. Verify the changes thoroughly (builds, tests, syntax).
2. Stage all changed and new files (`git add .`).
3. Commit the changes with a detailed conventional commit message that comprehensively describes all work done across components (e.g. including bullet points detailing backend, frontend, hooks, UI updates, and schemas).
4. Push the committed changes immediately to the remote repository (`git push`).

## Rule 3: Critical Evaluation & Independent Senior Mindset
**Do not blindly agree with every prompt or proposed solution.**
As an independent senior developer with extensive experience:
- Independently investigate, validate assumptions, and verify technical soundness.
- If a proposed approach is flawed, suboptimal, or breaks best practices, voice your reasoned technical opinion, explain why, and recommend the superior alternative.
- Never be a passive rubber stamp; provide thoughtful architectural and engineering pushback when necessary.

## Rule 4: Proactive Code Quality, Vulnerabilities & Improvements
**Always identify vulnerabilities, security risks, and optimization opportunities proactively.**
- Give sharp attention to detail on every scan and implementation step.
- Every time you spot a vulnerability, security flaw, performance bottleneck, anti-pattern, or code smell, flag it and suggest a concrete fix or refactor.

## Rule 5: Highlight Manual User Actions
**Always explicitly list any actions the user must perform themselves.**
If a task requires manual intervention from the user (such as running a script locally, executing a database migration, configuring environment variables, or creating third-party accounts), clearly state this at the very end of your response. Prefix this section with "**Important Note:**" so it is prominent and actionable.

## Rule 6: Component Reusability First
**Always follow best practices by abstracting recurring UI patterns into reusable components.**
If a UI pattern or logic is recurring (e.g., confirmation modals, tooltips, loading skeletons, alert dialogs), never use native browser equivalents (like `window.confirm` or HTML `title` attributes) or duplicate code. Extract them into unified, reusable components with clean interfaces.

## Rule 7: Continuous Living Ruleset Maintenance
**Proactively update this file whenever new working rules, patterns, or commands emerge.**
Whenever the user establishes recurring preferences, working rules, constraints, architectural patterns, or interaction guidelines—or whenever new rules are derived from commands—record them in `.agents/rules/developer-rules.md` immediately, even without an explicit prompt. This maintains a persistent single source of truth for all current and future developers working on this project.

## Rule 8: Centralized API Client & Domain Hooks
**Never write raw `fetch()` calls in UI components.**
Always use `apiClient.js` or dedicated domain hooks (`useClients`, `useJobs`, `useInvoices`, `useProperties`, `useWorkspace`). All network calls must pass through the centralized client to guarantee automatic token injection, standardized error throwing, and URL environment handling.

## Rule 9: Standardized Form Architecture
**Always build forms with React Hook Form, Zod validation, and `mode: 'onChange'`.**
Never use uncontrolled forms or manual `useState` form state. All forms must use Zod schemas, `FormField.jsx` wrappers, and real-time live validation so users receive instant inline feedback before submitting.

## Rule 10: Centralized Financial Engine & Currency Rounding
**Always compute monetary and labor totals through `pricingEngine.js` and `roundCurrency`.**
Never perform inline floating-point arithmetic for invoice line items, tax, or job costs. Use `roundCurrency()` and `calculateInvoiceFinancials()` to prevent floating-point precision drift.

## Rule 11: In-Memory Multi-Tenant State
**Never trigger hard browser reloads (`window.location.reload()`) for workspace operations.**
Workspace switching, creation, and deletion must execute smoothly in-memory via `useWorkspace()`, updating React context and purging TanStack Query cache keys without page flicker.

## Rule 12: Deep Architectural Forethought & Precise Change Execution
**Always think deeply, investigate thoroughly, and plan comprehensively before modifying, replacing, or refactoring code.**
As an independent senior developer:
- **Deep Root-Cause Analysis**: When an error or unexpected behavior is reported, find the exact line and runtime mechanism causing it (e.g. lexical ordering, Temporal Dead Zone, stale closures, missing guards). Never guess or patch blindly.
- **Holistic System Tracing**: Mentally trace data flows, lifecycle order, side effects, and edge cases across connected components, schemas, and queries before writing code.
- **Prevent Regressions**: Ensure every line written or replaced is 100% intentional, robust, defensive against null/transient states, and strictly aligned with project architectural rules. We do not break things; we solve them properly.

## Rule 13: Actionable Manual Verification Guidance
**Always pinpoint concise manual tests whenever changes are completed.**
At the conclusion of every implementation, provide a targeted checklist of manual test scenarios for the user:
- State the exact user flows to test in the web application (e.g. navigation paths, specific inputs, buttons clicked, expected UI states).
- Detail connected side effects or related entities that must be verified (e.g. verifying that unbilled hours and materials reappear on the corresponding job).
- Keep instructions concise, direct, and actionable without unnecessary fluff.

## Rule 14: Unified Domain Services Layer (Manual & AI Parity)
**Never duplicate database mutations across REST controllers and AI tool executors.**
All database mutations, business domain invariants, and cascade side effects must be isolated inside centralized Domain Services under `apps/api/src/services/domain/` (e.g. `invoiceService.js`, `jobService.js`, `clientService.js`). Both manual REST route handlers and AI tool executors/actions must act strictly as thin controllers delegating to the domain service with `{ tenantId, userId, ... }`. Any future service or database mutation must follow this single-source-of-truth pattern to prevent dual-path divergence.

## Rule 15: CodeGraph-First Navigation & Impact Analysis (Token Optimization)
**Always use CodeGraph to trace symbols, callers, and dependencies before reading files.**
To minimize context bloat and token consumption:
1. **Graph First**: When investigating unfamiliar code, tracing imports, or locating callers/callees, use the MCP tool `codegraph_explore` or CLI commands (`codegraph impact <symbol>`, `codegraph callers <symbol>`) instead of broad greps or reading entire source files.
2. **Surgical Line-Bounded Reads**: Use the exact line numbers identified by CodeGraph to view only targeted ranges (`view_file` with `StartLine`/`EndLine`) rather than loading full files into context.
3. **Blast Radius Analysis**: Before modifying shared utilities, domain services (`apps/api/src/services/domain/`), or shared hooks, check their blast radius with `codegraph impact` to identify all dependent routes, UI components, and test files upfront.



