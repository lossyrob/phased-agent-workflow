# Final Review (Cycle 2) - Prompt Semantics & Instruction-Precedence Specialist

## Self-Report

- Role: Prompt semantics and instruction-precedence specialist (Cycle 2, final closed council).
- Model requested: `claude-opus-4.8`.
- Provider family: unsure (unverified; no fallback signal observed).
- Scope: Verify prior findings U1-U4 are resolved in the current committed diff (`origin/main...HEAD`), with deep verification of U1 feedback-scope persistence and semantic consistency; then detect only newly material blockers/regressions introduced by the fixes. Uncommitted WorkflowContext/review artifacts ignored.

## Verdict

**CLEAN / PASS (HIGH confidence).** All four prior findings (U1-U4) are resolved in the committed diff. No newly material blocker or regression was introduced by the Cycle 1->2 fixes (commit `9b7a024` "Address PAW Review final review notes").

## U1-U4 Resolution Table

| ID | Prior finding | Status | Current committed evidence |
|---|---|---|---|
| U1 | Feedback-scope filter lacked an explicit ReviewContext field; feedback stage could apply all-findings default instead of a user's narrowing request | **RESOLVED** | End-to-end chain now closed: preflight resolves it (`skills/paw-review-workflow/SKILL.md:134`), agent forwards it (`agents/PAW-Review.agent.md:27`), template persists `Feedback Scope Filter` (`skills/paw-review-understanding/SKILL.md:271`), validation requires it (`skills/paw-review-understanding/SKILL.md:196`), feedback honors it (`skills/paw-review-feedback/SKILL.md:383`), test asserts field presence (`tests/integration/tests/skills/review-authorization-policy.test.ts:86`). |
| U2 | `bind-created-review` reconciliation asymmetric: creation reconciled the sentinel but reuse did not, risking over-block on interrupted follow-ups | **RESOLVED** | Reuse path now reconciles the sentinel symmetrically: `skills/paw-review-github/SKILL.md:87` ("If `Authorized Pending Review` is `bind-created-review`, replace it with the re-resolved pending review ID before evaluating submission"), matching creation path `:81`. Submission still requires exact ID match `:111`, so the sentinel must be replaced first. |
| U3 | Two enumerated lifecycle details (reuse/no-duplicate, creation-to-ID rebinding) lacked direct static assertions | **RESOLVED** | New test case added: `tests/integration/tests/skills/review-authorization-policy.test.ts:110-123` asserts reuse/no-duplicate (`skills/paw-review-github/SKILL.md:55`) and both rebinding statements (`:81`, `:87`). Test count 8 -> 9, consistent with brief. |
| U4 | Residual `non-GitHub` binary annotations beside the new platform enum in the ReviewContext template | **RESOLVED (at flagged location)** | Flagged template fields now use unified enums: `skills/paw-review-understanding/SKILL.md:258-263` (State/Created/CI Status/Labels/Reviewers/Linked Issues). The prior `(GitHub) OR ... (non-GitHub)` binary annotations are removed. Remaining `non-GitHub` mentions are pre-existing descriptive prose in `paw-review-specification.md`/`docs`, outside U4's scope, cosmetic, and non-behavioral. |

## Deep U1 Verification (feedback-scope persistence & semantic consistency)

- **Producer:** `paw-review-workflow/SKILL.md:134` resolves feedback scope as `all` by default or the user's explicit scope/output filter, ordered before authorization resolution (step 4 of the preflight), so a narrowing request is captured pre-analysis rather than inferred later.
- **Hand-off:** `PAW-Review.agent.md:27` now explicitly passes "feedback scope" alongside platform/capability/action/authorization/target/head/event to `paw-review-understanding`, keeping ReviewContext.md authoritative.
- **Persistence:** `paw-review-understanding/SKILL.md:271` adds `Feedback Scope Filter: <all | explicit user scope/output filter>` to the ReviewContext template, and the validation checklist `:196` gates artifact completeness on it being recorded.
- **Consumer:** `paw-review-feedback/SKILL.md:383` ("Honor explicit scope or output filters recorded in ReviewContext.md") reads from the persisted field. A separately delegated feedback session that only sees ReviewContext.md will now find the recorded scope, closing the prior gap where it would fall back to the all-findings default.
- **Semantic consistency:** The producer/hand-off/validation phrase it "feedback scope" while the persisted field is "Feedback Scope Filter"; the value vocabulary (`all | explicit user scope/output filter`) is identical across producer, template, and consumer. The naming variance is cosmetic and unambiguous - a reviewing agent resolves the single field without conflict. The safe default (`all`) is preserved, so the fix cannot loosen coverage; it can only honor an explicit narrowing that was previously dropped. No precedence inversion: scope is a PAW-owned default overridable by explicit user direction, consistent with the invariant/default/user-policy ordering elsewhere.

## New Material Findings

**None.** No newly material blocker or regression was introduced by the committed fixes.

Non-elevated observation (not a finding, no action required for merge): the ReviewContext template value-set for `Base Commit Source` (`github-api|platform-metadata|merge-base`, `skills/paw-review-understanding/SKILL.md:253`) does not exactly match the inline instruction (`github-api | merge-base`, `:103`). This is descriptive metadata with no authorization/submission consumer, it reduces a pre-existing origin/main inconsistency rather than creating one, and it is cosmetic. Below the threshold for a finding.

## Examined-Passed Evidence

- Committed diff scoped correctly: `git diff --stat origin/main...HEAD` and `git show 9b7a024` confirm the fixes touch only agent/skill/spec/docs/test surfaces; no implementation-runtime code and no stray scope changes for #303 or #313-#321.
- Fail-closed mutation boundary intact after fixes: `skills/paw-review-github/SKILL.md:105-126` still requires explicit authorization, allowed event, target/head/exact-pending-ID equality, and an immediate live re-read of `repository + PR + live head + pending review ID + event`; every mismatch preserves the pending review.
- Head-change invalidation and terminal idempotence intact: `skills/paw-review-github/SKILL.md:68-72,128-134`.
- Instruction precedence coherent across surfaces: `agents/PAW-Review.agent.md:20-27` and `skills/paw-review-workflow/SKILL.md:128-140` keep the same defaults-yield-to-explicit-direction ordering while integrity invariants and unavailable capabilities remain binding; conflicts/ambiguity/unavailable mutations surface before the Understanding stage.
- Test target phrasing verified present in skill sources (`git grep`), so the added assertions match real content and are not brittle against absent text.
- Validation evidence used as provided by the updated brief: 9 targeted authorization-contract tests passed; prompt tokens 12,644 -> 12,561 (net -83); ESLint, TypeScript compile + 31 VS Code skill renders (source/render parity), prompting linter, and strict MkDocs all passed. The token delta increase versus Cycle 1's -107 is consistent with the added feedback-scope/bind-reconciliation prompt content.

## Coverage

| Surface | Status |
|---|---|
| U1 feedback-scope persistence chain (producer -> hand-off -> template -> validation -> consumer -> test) | examined-passed (RESOLVED) |
| U2 bind-created-review reuse symmetry | examined-passed (RESOLVED) |
| U3 static assertions for reuse/no-duplicate and rebinding | examined-passed (RESOLVED) |
| U4 ReviewContext template terminology | examined-passed (RESOLVED at flagged location) |
| GitHub fail-closed mutation boundary / head invalidation / terminal idempotence (regression check) | examined-passed |
| Instruction precedence & early conflict preflight (regression check) | examined-passed |
| Diff scope (no #303 / #313-#321 leakage) | examined-passed |
| Committed diff only (uncommitted artifacts ignored) | honored |

## Council Structured Turn

```yaml
agent_id: council-312-final-cycle2/specialist-1-prompt-semantics
model: claude-opus-4.8 (requested; identity unverified)
provider_family: unsure
persona: Prompt semantics and instruction-precedence specialist
epistemic_act: verify
key_claim: >
  Prior findings U1-U4 are resolved in the current committed diff, with U1 feedback-scope
  persistence now coherent end-to-end producer->consumer; the fixes introduce no new material
  blocker or regression. Verdict CLEAN/PASS.
confidence: HIGH
grounds:
  - skills/paw-review-workflow/SKILL.md:134 (preflight resolves feedback scope, default all)
  - agents/PAW-Review.agent.md:27 (feedback scope forwarded to understanding)
  - skills/paw-review-understanding/SKILL.md:196,271 (Feedback Scope Filter persisted and gated)
  - skills/paw-review-feedback/SKILL.md:383 (consumer honors recorded scope)
  - skills/paw-review-github/SKILL.md:81,87 (bind-created-review reconciled on both create and reuse)
  - skills/paw-review-github/SKILL.md:105-126 (fail-closed exact-tuple submission unchanged)
  - tests/integration/tests/skills/review-authorization-policy.test.ts:86,110-123 (new assertions)
  - skills/paw-review-understanding/SKILL.md:258-263 (U4 unified enums)
warrant: >
  A user-configurable policy is only reliable if the narrowing decision is persisted where the
  (possibly separately delegated) consuming stage reads it; the added field plus validation gate
  closes that gap while the safe all default prevents any coverage loss. Symmetric sentinel
  reconciliation ensures the exact-ID submission check cannot over-block or mis-submit. Enum
  unification removes precedence ambiguity in metadata without touching the authorization tuple.
rebuttal_conditions:
  - A delegated feedback session ignores the persisted Feedback Scope Filter and still applies all.
  - A reuse follow-up leaves bind-created-review unreconciled at the submission check.
  - Any submission path bypasses the immediate live repository+PR+head+review-ID+event equality.
  - The token delta or targeted test count does not hold at the reviewed head.
dissent_or_alignment: >
  Aligned with the Cycle 1 synthesis dispositions; confirms the prompt-semantics-owned U1 gap that
  other members did not independently elevate is now closed rather than merely parked.
relevance: >
  Directly resolves the one prompt-semantics finding that weakened an advertised user-configurable
  policy, and confirms the instruction-precedence spine (defaults yield to explicit direction;
  invariants and unavailable capabilities bind) survived the fixes intact.
smallest_change: none required for merge
what_gets_smaller: >
  Optional future polish: align the Feedback Scope Filter field name with the "feedback scope"
  wording, and reconcile the Base Commit Source value-set between template and inline instruction.
  Both are cosmetic and non-behavioral.
```

## Meta

- Verdict: CLEAN / PASS (HIGH). U1-U4 resolved in committed diff; no new material blocker/regression.
