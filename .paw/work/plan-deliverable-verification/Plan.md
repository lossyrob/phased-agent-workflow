# Plan

## Problem

Issue `#282` reports that PAW can carry a plan all the way to the final PR while still missing promised deliverables. The current workflow talks about plan completeness, but it does not force the implementer or reviewers to verify each planned deliverable against actual repository state with enough specificity.

## Approach

Turn plan deliverables into explicit verification checkpoints at three layers: before phase completion (`paw-implement`), during implementation review (`paw-impl-review`), and during final review (`paw-final-review`). Then update the implementation specification/docs to match that contract and add an offline regression test so the prompt-level rules stay locked in.

## Work Items

1. **Implementer and impl-review checks**
   - Make `paw-implement` verify the current phase's `Changes Required` deliverables exist before marking the phase complete.
   - Make `paw-impl-review` compare explicit plan promises against actual files and block empty or missing deliverables.

2. **Final review and specification**
   - Make `paw-final-review` cross-reference `ImplementationPlan.md` deliverables and treat missing promised outputs as `should-fix` minimum.
   - Update the implementation specification/docs so the workflow contract matches the new behavior.

3. **Regression coverage**
   - Add an offline regression test that asserts the new prompt guardrails exist in the relevant skills/spec text.

## Key Decisions

- Treat explicit plan deliverables and “at minimum” commitments as a contract, not a soft suggestion.
- Verify deliverables against actual file existence/content, not just changed-directory scaffolding.
- Use a fast single-model final review for this bugfix to keep the multi-issue batch moving.
