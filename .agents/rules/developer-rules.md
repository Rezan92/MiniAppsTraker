# Developer Rules

These rules dictate how the AI Developer Agent should behave and interact with the codebase. They must be followed closely during all tasks.

## Rule 1: Task and Story Completion Tracking
**Always mark completed user stories and tasks as `[x]` in the `.agents/stories/` markdown files.**
Whenever an implementation is successfully finished, the developer agent must locate the corresponding user story and epic file and update the checkboxes from `[ ]` to `[x]` to maintain an accurate source of truth for project progress.

## Rule 2: Automatic Commits
**Always commit changes automatically without asking, unless specified otherwise.**
When finishing a feature, bugfix, or distinct unit of work, automatically stage and commit the changes with a clear, descriptive commit message. Do not ask for permission to commit unless the user explicitly requested you to wait.
