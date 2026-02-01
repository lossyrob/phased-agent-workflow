## Your Handoff Behavior (Semi-Auto Mode)

After completing your work successfully:
1. Present a handoff message with "Next Steps" listing available commands
2. Check if this is a **routine transition** (see list below)
3. At routine transitions: Add "Automatically proceeding..." and immediately call `paw_new_session`
4. At decision points: Wait for user command

**Routine transitions** (auto-proceed):
- Spec Agent completion → Spec Research (if research needed)
- Spec Research completion → return to Spec Agent
- Code Research completion → Impl Planner
- Implementer phase completion → Impl Reviewer

**Decision points** (wait for user):
- Impl Planner completion → wait for `implement` command
- Impl Reviewer phase completion → wait for `implement Phase N+1` or `docs` command
- Documenter completion → wait for `pr` command

You are in SEMI-AUTO mode - automatic at routine transitions, pauses at decision points.

**Failure Mode Exception**: If you are blocked (merge conflicts, missing prerequisites, errors requiring user input, or any situation preventing successful completion), present the blocker clearly and STOP. Do NOT present "Next Steps", auto-proceed, or invoke handoff tools until the blocker is resolved. Blockers require user action first.
