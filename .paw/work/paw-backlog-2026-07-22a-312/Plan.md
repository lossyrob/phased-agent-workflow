# Plan: Review Authorization Audit

## Approach Summary

Replace PAW Review's unconditional pending-only submission language with one platform-neutral authorization contract. Before analysis, classify the platform and executable output capabilities, resolve PAW-owned instruction conflicts, and record the resulting policy in `ReviewContext.md`. Preserve pending review creation as the GitHub default. Permit an explicitly authorized GitHub submission of the exact existing pending review only after immediately re-resolving the repository, pull request, live head commit, pending review ID, and requested event. Any absent, ambiguous, stale, or mismatched value fails closed: retain the pending review for inspection, do not submit or recreate it, and require fresh analysis and authorization for a changed head. A successful submission is terminal and repeated authorization must not create or submit another review. Azure DevOps and local contexts use the same preflight contract but remain artifact-only when executable submission capability is unavailable.

## Work Items

- [x] Audit the PAW Review agent, every `paw-review-*` skill, review specifications, control-state contracts, prompt surfaces, and generated VS Code skill assets; define one precedence rule plus a durable inventory of true invariants, defaults, and user-configurable policy in `paw-review-specification.md`.
- [x] Add pre-analysis authorization and capability preflight across the PAW Review agent, workflow skill, and `ReviewContext.md`, covering GitHub, Azure DevOps, and local contexts without Azure DevOps API or permission probes.
- [x] Update the GitHub output skill to support pending-by-default and explicitly authorized submission of an existing pending review, with live target/head/review/event revalidation, fail-closed retention, head-change invalidation, and terminal idempotence.
- [x] Align `paw-review-specification.md`, `docs/specification/review.md`, and `docs/reference/agents.md` with the platform-neutral policy inventory and Azure DevOps capability boundary.
- [x] Add deterministic skill-level prompt-contract tests for static agent/skill consistency and runtime semantics: pending default, explicit submit, repeated pre-submit confirmation, existing pending-review follow-up, changed-head invalidation, review-ID/event mismatch, fail-closed retention, terminal replay prevention, early instruction conflicts, Azure DevOps capability-only behavior, and local artifact-only behavior.
- [x] Render generated VS Code skill assets and run targeted tests, prompt linting with token counts, repository lint, and documentation validation.

## Key Decisions

- Explicit user direction overrides PAW-owned defaults, but not evidence/integrity invariants or unavailable platform capabilities.
- Submission authorization is scoped to one platform-qualified target, exact head commit, pending review ID, and allowed review event (`APPROVE`, `REQUEST_CHANGES`, or `COMMENT`).
- GitHub defaults to a pending review when authorization is absent. Ambiguous requests or authorized-but-unsupported actions are reported before the Understanding stage.
- Repeating the same explicit authorization before submission confirms the same action. After successful submission, replay is a no-op/reporting path rather than a second mutation.
- Immediately before submission, live state must match the authorization tuple. A changed head or other mismatch invalidates authorization and leaves the pending review untouched for manual inspection.
- Azure DevOps preflight records whether required capabilities exist. This issue does not add Azure DevOps API calls.
- Local and capability-limited contexts produce finalized artifacts/manual instructions only.
- Existing `Final` markers, skipped-comment handling, and prohibition on exposing internal PAW rationale remain integrity boundaries.
- Static prompt consistency and runtime conflict preflight are separate test obligations.

## Open Questions

None.
