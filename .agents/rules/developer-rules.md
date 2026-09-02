---
trigger: always_on
---

# Developer Rules

These rules dictate how the AI Developer Agent should behave and interact with the codebase. They must be followed closely during all tasks.

## Rule 1: Task and Story Completion Tracking (Deactivated)
*(Currently deactivated - do not follow or spend attention on this rule unless reactivated).*
**Always mark completed user stories and tasks as `[x]` in the `.agents/stories/` markdown files.**
Whenever an implementation is successfully finished, the developer agent must locate the corresponding user story and epic file and update the checkboxes from `[ ]` to `[x]` to maintain an accurate source of truth for project progress.

## Rule 2: Mandatory Auto-Commit & Push
**Always commit changes with detailed messages and push for anything updated.**
Whenever an update, feature, bugfix, or refactor is completed:
1. Stage and commit the changes with a clear, detailed, and conventional commit message.
2. Push the committed changes to the remote repository immediately.
Do not wait or ask for permission to commit and push unless explicitly instructed otherwise.

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
**Always think deeply and plan comprehensively before modifying, replacing, or refactoring code.**
As a senior developer:
- Never blindly replace blocks of code or make rushed changes without understanding all connected consumers, schemas, and type contracts.
- Mentally trace data flows, side effects, and edge cases across frontend and backend before executing.
- Ensure every line written or replaced is 100% intentional, accurate, robust, and aligned with project architectural rules.

