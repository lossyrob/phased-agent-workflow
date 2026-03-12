# Plan

## Problem

Issue `#284` reports that `commit-and-clean` can be bypassed at final PR time because the orchestrator may create the final PR directly instead of loading `paw-pr`, so the stop-tracking operation never runs.

## Approach

Tighten the final-PR boundary rather than duplicating cleanup logic. Keep `paw-pr` as the only place that performs stop-tracking, then add defense-in-depth so the orchestrator and transition skill make that requirement explicit and harder to bypass. Back the change with regression coverage around the transition output used at the `paw-pr` boundary.

## Work Items

1. **Orchestrator guardrails**
   - Update `agents/PAW.agent.md` so `paw-pr` explicitly requires loading the skill and honoring `artifact_lifecycle`.
   - Extend the transition-response handling and "Before Yielding Control" checklist to verify `commit-and-clean` cleanup before final PR creation.

2. **Transition boundary signal**
   - Update `skills/paw-transition/SKILL.md` to surface an explicit lifecycle action reminder when transitioning to `paw-pr`.
   - Keep the output structured so the orchestrator can act on the reminder deterministically.

3. **Regression coverage**
   - Extend workflow integration coverage to assert the lifecycle reminder is present for the `paw-pr` boundary in `commit-and-clean` mode.
   - Preserve existing artifact lifecycle detection coverage.

## Key Decisions

- Keep `paw-pr` as the single owner of stop-tracking behavior; do not add a second cleanup implementation elsewhere.
- Prefer explicit guardrails and structured reminders over a fallback shell command in the orchestrator.
- Implement sequentially instead of fleet-style subagents because the prompt and test changes are tightly coupled and small enough to edit safely in one pass.
