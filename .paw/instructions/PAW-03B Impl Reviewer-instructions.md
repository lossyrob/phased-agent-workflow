# Implementation Review Custom Instructions

## Keep PAW Spec and Status Agent Synchronized

When reviewing changes to `paw-specification.md`, verify the Status Agent (`agents/PAW-X Status Update.agent.md`) is updated to match:
- New/changed workflow stages, modes, or review strategies
- Updated branching patterns or agent responsibilities
- New artifacts or deliverables

When reviewing changes to the Status Agent, verify it aligns with `paw-specification.md`:
- Stage descriptions match spec definitions
- Workflow mode/review strategy behaviors reflect spec
- Duration estimates and navigation commands are accurate

**Source of truth**: `paw-specification.md` → Status Agent reflects the spec for user guidance.

If synchronization is missing, document the gap and request Implementation Agent address it in a follow-up commit.
