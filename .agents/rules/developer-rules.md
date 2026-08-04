# Developer Rules

These rules dictate how the AI Developer Agent should behave and interact with the codebase. They must be followed closely during all tasks.

## Rule 1: Task and Story Completion Tracking
**Always mark completed user stories and tasks as `[x]` in the `.agents/stories/` markdown files.**
Whenever an implementation is successfully finished, the developer agent must locate the corresponding user story and epic file and update the checkboxes from `[ ]` to `[x]` to maintain an accurate source of truth for project progress.
