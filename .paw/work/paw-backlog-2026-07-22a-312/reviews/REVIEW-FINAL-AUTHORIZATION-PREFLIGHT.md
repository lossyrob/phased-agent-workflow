# REVIEW-FINAL-AUTHORIZATION-PREFLIGHT (Cycle 2, Final)

- **Role**: Authorization integrity and cross-platform preflight specialist (Specialist 3)
- **Model**: requested `claude-opus-4.8`
- **provider_family**: unsure (self-reported; identity UNVERIFIED)
- **Verdict**: CLEAN / PASS
- **Confidence**: HIGH
- **Cycle**: Second and final closed council cycle for issue #312

## Scope

Reviewed CURRENT COMMITTED `origin/main...HEAD` only (HEAD = `9b7a024 Address PAW Review final review notes`). Ignored uncommitted WorkflowContext and review artifacts. Focus: verify prior U1-U4 are resolved with current file:line evidence; deeply re-verify authorization integrity, exact repository/PR/live-head/pending-review/event binding and immediate revalidation, fail-closed behavior, explicit-user-direction precedence, unavailable-capability invariants, early conflict surfacing, and Azure DevOps/local non-probing artifact-only semantics. Special attention to U2 reuse-path binding and any new authorization ambiguity it may introduce.

## U1-U4 Resolution Table

| ID | Prior finding | Status | Current file:line evidence |
|----|---------------|--------|----------------------------|
| U1 | Feedback scope filter lacked an explicit persisted ReviewContext field | RESOLVED | `skills/paw-review-understanding/SKILL.md:271` adds `**Feedback Scope Filter**: <all | explicit user scope/output filter>`; preflight resolves it at `skills/paw-review-workflow/SKILL.md:134` ("Resolve feedback scope as `all` by default or the user's explicit scope/output filter") and passes fields for persistence at `:138`; consumer honors it at `skills/paw-review-feedback/SKILL.md:383`. Asserted by `tests/integration/tests/skills/review-authorization-policy.test.ts:86,144`. |
| U2 | `bind-created-review` reconciliation asymmetric on reuse | RESOLVED | Reuse path now reconciles the sentinel symmetrically: `skills/paw-review-github/SKILL.md:87` ("If `Authorized Pending Review` is `bind-created-review`, replace it with the re-resolved pending review ID before evaluating submission"), mirroring the creation path at `:81`. Reuse is gated by verified-PR + still-pending at `:85-86`. Asserted by `review-authorization-policy.test.ts:114-121`. |
| U3 | Reuse/no-duplicate and creation-to-ID rebinding lacked direct static assertions | RESOLVED | `review-authorization-policy.test.ts:110-122` asserts no-duplicate reuse (`:113`), reuse-path rebinding (`:114-117`), and creation-path rebinding (`:118-121`). Test count now 9. |
| U4 | Residual `non-GitHub` binary metadata terminology | RESOLVED | No `non-GitHub` string remains in `skills/` (grep clean). Template uses the superset framing `Review Platform: <github | azure-devops | local>` at `skills/paw-review-understanding/SKILL.md:248` with `(hosted PR)` / `(local)` at `:247`. |

## Deep Re-Verification (authorization integrity and cross-platform preflight)

- **Exact tuple binding + immediate revalidation**: `skills/paw-review-github/SKILL.md:105-124` requires `Submission Authorization: explicit`, an allowed event, authorized target == repository/PR, authorized head == current live head, and authorized pending review ID == the exact pending review; then immediately re-reads live state `repository + PR + live head + pending review ID + event` (`:113-118`) and requires every value present and equal before submission.
- **Fail-closed**: On absence, ambiguity, mismatch, permission failure, or changed state, does not submit or recreate, preserves the pending review, records the blocked reason, and reports the mismatch (`:119-124`). Reinforced as a true invariant at `:162-164`.
- **Changed-head invalidation**: `:68-72` leaves the pending review untouched, records `Preflight Status: blocked: head changed`, and requires fresh analysis/authorization; workflow echoes this at `skills/paw-review-workflow/SKILL.md:140`.
- **Terminal idempotence / replay-safety**: `:128-134` — repeated pre-submission authorization confirms the same mutation; repeated post-submission authorization returns recorded state without creating/submitting another review; a new head forces a fresh pending review and fresh authorization.
- **Explicit-user-direction precedence vs invariants/capabilities**: `skills/paw-review-workflow/SKILL.md:136` ("Explicit user direction overrides a default; it does not override an integrity invariant or create a missing capability"); classification mirrored at `skills/paw-review-github/SKILL.md:156-173` and asserted against the specification at `review-authorization-policy.test.ts:33-36`.
- **Early conflict surfacing**: `skills/paw-review-workflow/SKILL.md:137` reports ambiguous authorization or unavailable requested mutation before analysis; agent enforces reporting "before the Understanding stage" (asserted at `review-authorization-policy.test.ts:67`).
- **ADO/local non-probing artifact-only semantics**: `skills/paw-review-workflow/SKILL.md:129` forbids probing Azure DevOps APIs, identities, permissions, or submission endpoints for preflight; `:132` sets ADO/local default to `artifact-only`; `skills/paw-review-github/SKILL.md:145-154` performs no GitHub mutation and requires an unsupported submission request to have been reported before Understanding (no silent conversion).
- **Unavailable-capability invariant**: Output Policy blocks and reports when a requested mutation is unavailable (`skills/paw-review-github/SKILL.md:37`), and capability is derived without probing.

## U2-Specific Ambiguity Analysis (special attention)

The reuse-path reconciliation binds `bind-created-review` only to a review already re-resolved from GitHub and confirmed to (a) belong to the verified PR and (b) still be pending (`skills/paw-review-github/SKILL.md:85-87`). This is semantically identical to the creation-path binding and faithful to the sentinel intent (the PAW-managed pending review for this PR). No new authorization ambiguity is introduced:

- Binding cannot target a wrong-PR or submitted review: the "already submitted" case routes to the terminal no-op (`:88`) and any other state mismatch blocks and preserves (`:89`).
- Even under an adversarial reading of bullet ordering, submission independently requires `Authorized pending review ID matching the exact pending review` (`:110`) plus the immediate live-tuple equality check including `pending review ID` (`:113-118`); a non-pending or mismatched review fails closed at that gate.

Net effect of the fix: eliminates the prior over-block on the normal reuse follow-up path without weakening any fail-closed gate.

## Findings

None material. No newly material blocker or regression detected in the committed diff.

Non-elevated observation (not a finding, no action required): in the reuse block, the bind bullet (`:87`) is textually adjacent to the still-pending gate (`:85-86`) rather than nested under it; the immediate live-tuple equality check (`:113-118`) makes any conceivable mis-ordering fail closed, so impact is nil. Recorded only for transparency; does not warrant a direction-preserving change.

## Examined-Passed

- `skills/paw-review-github/SKILL.md` (full) — pending/reuse/submit lifecycle, tuple revalidation, fail-closed, terminal idempotence, multi-PR isolation, artifact-only.
- `skills/paw-review-workflow/SKILL.md:124-140` — Authorization Preflight (platform classification, non-probing capability, feedback-scope resolution, conflict precedence, early reporting).
- `skills/paw-review-understanding/SKILL.md:232-290` — ReviewContext.md authorization contract fields incl. Feedback Scope Filter and superset platform field.
- `skills/paw-review-feedback/SKILL.md:261,381-385,334-355` — feedback scope + tone as user-configurable policy honoring persisted ReviewContext.
- `tests/integration/tests/skills/review-authorization-policy.test.ts` (9 tests) — invariant/default/user-policy classification, pending-only prohibition removal, pending default + repeated authorization, early conflict/capability preflight, contract persistence, live-tuple fail-closed, reuse/no-duplicate + dual rebinding, ADO/local artifact-only, feedback scope/tone policy.
- `git log origin/main..HEAD` — remediation isolated to commit `9b7a024`; no drift into #303 or #313-#321 scope.

## Coverage

| Cycle-2 required surface | Status |
|---|---|
| U1-U4 resolution verified with current file:line | examined-passed (all RESOLVED) |
| Exact repository/PR/live-head/pending-review/event binding + immediate revalidation | examined-passed |
| Fail-closed behavior | examined-passed |
| Explicit-user-direction precedence vs invariants/capabilities | examined-passed |
| Unavailable-capability invariants | examined-passed |
| Early conflict surfacing | examined-passed |
| Azure DevOps/local non-probing artifact-only semantics | examined-passed |
| U2 reuse-path binding — new ambiguity check | examined-passed (no new ambiguity) |
| No accidental #303 / #313-#321 scope drift | examined-passed |

## Updated Validation Evidence (as provided)

- Targeted authorization contract tests: 9 passed.
- Modified prompt total: 12,644 tokens before, 12,561 after (net -83).
- Repository ESLint, TypeScript compile + 31 VS Code skill renders, prompting linter (all agents/skills), and strict MkDocs build: passed (brief).

## Council Structured Turn

- **agent_id**: final-authorization-preflight (cycle 2)
- **model**: claude-opus-4.8 (requested)
- **provider_family**: unsure (self-reported; UNVERIFIED)
- **persona**: Authorization integrity and cross-platform preflight specialist
- **epistemic_act**: verify-and-confirm (re-audit of prior U1-U4 remediation against committed HEAD)
- **key_claim**: All prior U1-U4 findings are resolved in committed HEAD `9b7a024`; the U2 reuse-path reconciliation is symmetric and introduces no new authorization ambiguity; every submission path remains gated by explicit authorization plus immediate live-tuple equality and fails closed on any deviation.
- **confidence**: HIGH
- **grounds**: `skills/paw-review-github/SKILL.md:81,85-89,105-134,145-173`; `skills/paw-review-workflow/SKILL.md:124-140`; `skills/paw-review-understanding/SKILL.md:247-278`; `skills/paw-review-feedback/SKILL.md:261,381-385`; `tests/integration/tests/skills/review-authorization-policy.test.ts:79-148` (9 tests); grep confirms no residual `non-GitHub`.
- **warrant**: Authorization integrity holds when the mutating skill binds only to a verified-pending review for the verified target and re-validates the full tuple at the mutation boundary; symmetric sentinel reconciliation preserves fail-closed guarantees while removing an over-block.
- **rebuttal_conditions**: Reopen if any path can submit without explicit authorization or without immediate equality of repository/PR/live head/pending review ID/event; if reuse binding can target a submitted or wrong-PR review; if a changed head, unavailable capability, or replay can recreate/submit instead of preserving state; if ADO execution requires API/identity/permission/submission probing; or if the 9-test/-83-token/lint/docs evidence no longer holds at HEAD.
- **dissent_or_alignment**: Aligned with cycle-1 MERGE-READY; upgrades U1-U4 from open LOW follow-ups to RESOLVED based on committed remediation.
- **relevance**: Directly addresses issue #312 outcome anchor (pending-by-default with fail-closed, exactly-verified explicit submission; non-probing cross-platform semantics).
- **smallest_change**: None required.
- **what_gets_smaller**: N/A — no change proposed; prior over-block surface on the reuse follow-up path is already eliminated.
