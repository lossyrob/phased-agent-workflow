# Plan: Review Authorization Audit

## Approach Summary

Replace PAW Review's unconditional pending-only submission language with one platform-neutral authorization contract. Run capability and instruction-conflict preflight before analysis, preserve pending review creation as the GitHub default, and permit an explicitly authorized GitHub submission only after verifying the repository, pull request, head commit, pending review ID, and requested event. Record the resolved policy in `ReviewContext.md` so downstream skills use one authoritative decision. Azure DevOps receives the same preflight and authorization model, but unsupported API actions remain artifact-only until issues #313-#316 implement them.

## Work Items

- [ ] Define the review authorization precedence, policy classification, and preflight contract across the PAW Review agent, workflow skill, and understanding artifact.
- [ ] Update the GitHub output skill to support pending-by-default and explicitly authorized, target-verified submission without weakening finalized-comment safeguards.
- [ ] Align the review specifications and agent reference with the platform-neutral policy inventory and Azure DevOps capability boundary.
- [ ] Add regression tests for pending defaults, explicit and repeated authorization, early instruction-conflict detection, target/head verification, and Azure DevOps capability preflight.
- [ ] Render generated VS Code skill assets and run targeted tests, prompt linting with token counts, repository lint, and documentation validation.

## Key Decisions

- Explicit user direction overrides PAW-owned defaults, but not evidence/integrity invariants or unavailable platform capabilities.
- Submission authorization is scoped to one platform-qualified target, exact head commit, pending review ID, and review event; a changed head invalidates authorization.
- GitHub defaults to a pending review when authorization is absent. Ambiguous submission requests block before the Understanding stage.
- Repeating the same explicit authorization for the same target, head, and event confirms rather than conflicts with the authorized action.
- Azure DevOps preflight records whether required capabilities exist. This issue does not add Azure DevOps API calls.
- Existing `Final` markers, skipped-comment handling, and prohibition on exposing internal PAW rationale remain integrity boundaries.

## Open Questions

None.
