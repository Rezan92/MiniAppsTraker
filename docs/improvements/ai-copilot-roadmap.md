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
  - Contractors can capture (via live camera modal) or upload receipt and job-site photos directly into the multimodal AI Copilot.
  - Multimodal vision powered by Gemini natively parses trade receipts, materials, and job details with prompt-driven formatting and automatic financial rounding.
  - Autonomous batch material logging commits directly to `job_materials` via Gemini function calling and `jobService.logJobMaterialsBatch`.
  - Multimodal conversational attachments in chat with sliding window context pruning: heavy base64 payloads are sent exclusively on active turns and pruned to lightweight text markers on subsequent turns, preventing token accumulation and context bloat across conversations.
  - Full Work Item Lifecycle Management: Copilot can update or delete logged materials (by name, description, cost) and hours (by date, description, hours), strictly enforcing database integrity by preventing modifications to items currently locked to draft invoices (on_draft) or finalized invoices (billed).
- [x] **Speech-to-Text & Voice Dictation (Phase 8.2):**
  - Contractors can tap a dedicated microphone button in the Copilot messaging bar to dictate requests, task descriptions, or material purchases hands-free.
  - Browser audio capture powered by `MediaRecorder` API (`useAudioRecorder` hook) supporting `audio/webm;codecs=opus` and `audio/mp4`.
  - Transcribed with ultra-low latency using Groq's high-performance `whisper-large-v3-turbo` model via dedicated `/api/ai/transcribe` endpoint with MIME-matched explicit file extensions (`recording.webm`, `recording.mp4`).
  - Populates transcribed speech directly into the message input field, allowing contractors to review, edit, and send with one tap.
  - Responsive auto-growing multiline textarea with smooth word wrapping, 4-5 line scroll cap (`overflow-y: auto`), `Shift+Enter` multiline support, and conditional expand/collapse toggle positioned above everything (even above suggestion responses) appearing exclusively when text reaches the scrolling point, featuring outward-opening arrows to expand and inward-opposing arrows to collapse.
  - Draggable floating circular assistant orb (`w-14 h-14 rounded-full`): Copilot smoothly collapses into a sleek, glowing circular orb that can be placed anywhere on screen via pointer drag-and-drop with viewport boundary clamping and localStorage position persistence.
  - Click-outside collapse & bi-directional fluid animations: Clicking anywhere on the screen outside of the Copilot window (or clicking close/minimize, or double-clicking the header) triggers a smooth 240ms cubic-bezier transition collapsing the window into the circle; clicking the circle expands it smoothly outward. The circle stays directly in the exact spot where the user clicked to close it (centered under cursor) with zero position drift on reopen.
  - Multi-Provider LLM Architecture (NVIDIA Build): Added Moonshot Kimi K3 (`moonshotai/kimi-k3`) via NVIDIA Build API (`https://integrate.api.nvidia.com/v1/chat/completions`) using native Node 22 fetch with zero external dependencies. Exposes complete domain tool-calling parity (all 26 CRM functions), multimodal vision support (base64 image uploads), and clean frontend optgroup categorization in the model selector.
- [x] **Calendar & Scheduling Hub Integration (Phase 8.4):**
  - Copilot equipped with 6 comprehensive scheduling tools: `list_appointments`, `get_appointment_details`, `create_appointment`, `reschedule_appointment`, `update_appointment`, and `delete_appointment`.
  - Temporal prompt enrichment: dynamic user timezone awareness, formatted current day and ISO date injection, and relative date arithmetic ("today", "tomorrow", "day after tomorrow", "this week", "next week", "next Monday", etc.).
  - Smart appointment entity resolution (`resolveAppointment`) across UUIDs, exact titles, fuzzy title substrings, client names, and contact persons.
  - Duration-preserving rescheduling engine automatically maintains event length when rescheduling to a new start time without an explicit end time.
  - Automatic TanStack Query cache invalidation (`QUERY_KEYS.appointments.all`) upon any AI scheduling mutation, instantly updating the calendar without page refresh.
  - Live screen context synchronization via `useScreenContext` in `CalendarView.jsx`, giving Copilot real-time visibility into the user's active view, selected date, and visible date range.
- [ ] **Live Voice Chat & Confirmation (Phase 8.3):**
  - Allow users to talk directly to the AI via voice to perform tasks hands-free.
  - When the AI receives a voice command, it must repeat the request back (improving and articulating the wording professionally) and ask for explicit confirmation before executing any actions.
- [ ] **Asynchronous Background Tasks:**
  - "Every Friday at 4 PM, draft invoices for all jobs completed this week and send me a summary." (Requires a background cron job + AI task queue).
