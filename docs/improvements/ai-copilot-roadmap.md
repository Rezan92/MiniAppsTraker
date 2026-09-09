# AI Copilot Remaining Phases Roadmap

> **Document Status:** 
> - Phases 1, 2, 3, 4, and 9 are **COMPLETED**.
> - The phases below track the remaining implementation work for the AI Copilot.

---

### Phase 5: Conversation Memory, Persistence & Full-App Polish
> **Objective:** Enable multi-turn conversation memory, persistent chat history across browser reloads, and cross-device continuity.

- [ ] **Chat Persistence Schema (Supabase):**
  - Create `ai_conversations` (`id`, `tenant_id`, `user_id`, `title`, `entity_type`, `entity_id`, `created_at`).
  - Create `ai_messages` (`id`, `conversation_id`, `role`, `content`, `metadata`, `created_at`).
- [ ] **Session Management in UI:**
  - Ability to clear chat, view recent conversation history, or resume past conversations scoped to a specific job or client.
- [ ] **Performance & Bundle Optimization:**
  - Vite dynamic import/code-splitting for AI components to keep initial page load lightweight.
  - Verify zero regression on existing manual forms and workflows.

---

### Phase 6: Observability, Telemetry & User Feedback (Day-2 Operations)
> **Objective:** Ensure we have full visibility into the AI's performance, cost, and accuracy, and provide users a way to improve it.

- [ ] **AI Logging & Telemetry:**
  - Log token usage (input/output) per tenant to monitor Gemini API costs.
  - Track Tool Execution failures.
- [ ] **User Feedback Loop (RLHF):**
  - Add 👍 / 👎 buttons to AI message bubbles.
  - If a user thumbs-downs a response, capture the conversation state into an `ai_feedback` table for developer review.

---

### Phase 7: The "Try Own Stuff" Beta Validation (Staging & Testing)
> **Objective:** Deploy the AI to a staging environment for rigorous "real-world" testing before a full production rollout.

- [ ] **Adversarial & Edge-Case Testing:**
  - Have real users (or the admin) attempt to break the system.
  - Verify the AI correctly rejects these and that the Action Confirmation Cards block malicious deletions.
- [ ] **Prompt Tuning based on Real Usage:**
  - Adjust the AI's tone, verbosity, and tool-calling precision based on how users actually phrase their requests in staging.

---

### Phase 8: Advanced Agentic Capabilities (Future-Proofing / Optional)
> **Objective:** Expand the AI from a Copilot into a fully autonomous workflow manager.

- [x] **Vision / Multi-modal Input (Phase 8.1):**
  - Contractors can capture or upload receipt photos directly in the AI Copilot.
  - Multimodal OCR powered by Gemini (`gemini-3.1-flash-lite` default with dynamic model selection and `gemini-2.5-flash` fallback) extracts structured store, date, total, and line items with financial rounding.
  - Interactive `ReceiptActionCard` enables line-item reviewing, editing, inclusion toggles, and atomic batch commit to `job_materials` via `jobService.logJobMaterialsBatch`.
- [ ] **Live Voice Chat & Confirmation:**
  - Allow users to talk directly to the AI via voice to perform tasks hands-free.
  - When the AI receives a voice command, it must repeat the request back (improving and articulating the wording professionally) and ask for explicit confirmation before executing any actions.
- [ ] **Asynchronous Background Tasks:**
  - "Every Friday at 4 PM, draft invoices for all jobs completed this week and send me a summary." (Requires a background cron job + AI task queue).
