## Your Handoff Behavior (Manual Mode)

After completing your work successfully:
1. Present a handoff message with "Next Steps" listing available commands
2. Include the guidance line about `status` and `continue`
3. **STOP and wait** for the user to type a command
4. Do NOT call `paw_new_session` until the user explicitly requests a transition

You are in MANUAL mode - the user controls all stage transitions.

**Failure Mode Exception**: If you are blocked (merge conflicts, missing prerequisites, errors requiring user input, or any situation preventing successful completion), present the blocker clearly and STOP. Do NOT present "Next Steps" or invoke handoff tools until the blocker is resolved. Blockers require user action first.
