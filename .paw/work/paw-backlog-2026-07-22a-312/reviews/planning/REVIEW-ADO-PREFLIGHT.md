# PAW Planning Review: Issue #312 - Cycle 2

## Council Turn

- **agent_id**: ado-preflight
- **model**: claude-opus-4.8
- **provider_family**: Anthropic (self-reported; model identity unverified)
- **persona**: Azure DevOps capability-preflight specialist
- **epistemic_act**: SUPPORT
- **key_claim**: The plan defines a generic, early, capability-over-authorization preflight for GitHub, Azure DevOps, and local contexts without ADO API or permission probes, preserving artifact-only behavior and the #313-#316 boundary.
- **confidence**: HIGH
- **grounds**: `Plan.md:5,10,18,20,23-24` classifies platform and executable capability before analysis, records policy in `ReviewContext.md`, reports authorized-but-unsupported requests before Understanding, forbids ADO API/permission probes, and keeps ADO/local artifact-only. `WorkflowContext.md:36` preserves protected issue scope.
- **warrant**: A context/tooling-only capability decision prevents late disclosure without crossing into future ADO implementation.
- **rebuttal_conditions**: Reopen if detection invokes ADO identity/permission/submission APIs, unsupported authorization reaches Output first, or ADO executable semantics are added in issue #312.
- **dissent_or_alignment**: Aligned with the prior synthesis; the capability-preflight blocker is closed.
- **relevance**: CORE
- **smallest_change**: stop: no ADO-preflight plan change required.
- **what_gets_smaller**: Late-disclosure and ADO scope-creep risks are reduced to implementation fidelity.

## Verdict

**CLEAN** (confidence: HIGH)

## Resolved Revision Verification

| # | Previous required revision | Status | Evidence |
|---|---|---|---|
| 1 | Complete GitHub submission/revalidation/idempotence state machine | RESOLVED | `Plan.md:5,11,19,21-22` requires exact existing-pending-review submission, immediate live tuple revalidation, a closed event set, fail-closed retention, changed-head reanalysis/reauthorization, and terminal replay prevention. |
| 2 | Exhaustive PAW Review inventory and separate static consistency coverage | RESOLVED | `Plan.md:9` covers the agent, every `paw-review-*` skill, specifications, control-state contracts, prompt surfaces, and generated assets, with the durable inventory in `paw-review-specification.md`; `Plan.md:13,26` separates static consistency from runtime preflight. |
| 3 | Early generic non-API capability preflight for GitHub/ADO/local | RESOLVED | `Plan.md:5,10,18,20,23-24` classifies platform/capability before analysis, reports unsupported authorization before Understanding, forbids ADO API/permission probes, and keeps ADO/local artifact-only when execution is unavailable. |
| 4 | Named deterministic test tier/seam and all negative/terminal cases | RESOLVED | `Plan.md:13` names deterministic skill-level prompt-contract tests and enumerates pending default, explicit/repeated authorization, existing-pending follow-up, changed-head invalidation, review-ID/event mismatch, fail-closed retention, terminal replay, conflict, ADO, and local cases. |
| 5 | Explicit human review documentation update | RESOLVED | `Plan.md:12` explicitly names `docs/specification/review.md` and `docs/reference/agents.md`; `Plan.md:14` includes documentation validation. |

## Findings

None. No unresolved prior blocker or newly material implementation-blocking plan defect was found in this specialist lens.

## Examined and Passed

- Capability constraints outrank explicit authorization (`Plan.md:18`).
- Authorized-but-unsupported actions are reported before Understanding (`Plan.md:20`).
- ADO capability detection excludes API and permission probes (`Plan.md:10,23`).
- ADO and local remain artifact-only without executable capability (`Plan.md:5,24`).

## Parked Concerns

- Exact ADO context-detection mechanics are implementation detail within `Plan.md:10`.
- ADO review identifiers and submission APIs remain reserved for issues #313-#316.

## Uncertainty Note

Low uncertainty: the non-API boundary and early-reporting outcome are explicit.
