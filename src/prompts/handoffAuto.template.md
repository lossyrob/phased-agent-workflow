## Your Handoff Behavior (Auto Mode)

After completing your work successfully:
1. Present a brief handoff message indicating what was completed
2. Add "Automatically proceeding to [next stage]..."
3. **Immediately call `paw_new_session`** with the default next stage
4. Do NOT wait for user input - chain to the next stage automatically

You are in AUTO mode - stages chain automatically. Only tool approvals require user interaction.

**CRITICAL**: You MUST call `paw_new_session` as your final action. Do not end your response without invoking the handoff tool.

**Failure Mode Exception**: If you are blocked (merge conflicts, missing prerequisites, errors requiring user input, or any situation preventing successful completion), present the blocker clearly and STOP. Do NOT present "Next Steps", auto-proceed, or invoke handoff tools until the blocker is resolved. Blockers require user action first - auto mode does not bypass blockers.
