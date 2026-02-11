# Spec Review: Artifact Lifecycle Management

**Spec**: `.paw/work/artifact-lifecycle-management/Spec.md`
**Issue**: lossyrob/phased-agent-workflow#220
**Reviewer**: paw-spec-review
**Date**: 2026-02-11

---

## Verdict: CONDITIONAL PASS

**Criteria passing**: 22 / 25
**Issues found**: 3 (0 blocking, 3 requiring changes)

The spec is well-structured, thorough, and clearly traces from the issue RFC through user stories, functional requirements, and success criteria. The three-mode lifecycle model is well-motivated and the backward compatibility story is carefully handled. Three issues must be addressed before planning proceeds.

---

## Checklist Results

### Content Quality

- [x] **User value focus**: Overview and stories describe WHAT & WHY from a user perspective. No implementation bias in framing.
- [x] **No code artifacts**: ✅ No code snippets, class names, or API signatures in user stories or narrative sections. FR-004's mention of `git rm --cached` is in Requirements (acceptable for specifying observable behavior), and Key Entities briefly describes the operation — borderline but acceptable as it describes the *what*, not *how to implement it*.
- [x] **Story priorities**: Clear P1–P6 priority ordering with P1 (clean main) correctly at top.
- [x] **Testable stories**: Each story has an independent test description.
- [x] **Acceptance scenarios**: All stories have ≥1 Given/When/Then scenario. P1 has 3, P6 has 3. Good coverage.
- [x] **Edge cases**: Four edge cases enumerated covering idempotency, no-op, legacy fallback, and concurrent changes.

### Narrative Quality

- [x] **Overview present**: Three paragraphs of flowing prose — clear problem statement, current limitation, proposed solution.
- [x] **Objectives present**: Five bulleted behavioral goals, all user/outcome-focused.
- [x] **User perspective**: Overview and Objectives focus on WHAT/WHY from user viewpoint.
- [x] **Specific content**: Language is measurable — "zero `.paw/` residue", "three-mode setting", "automatically removed from git tracking at final PR time".
- [x] **No duplication**: Overview summarizes the concept without duplicating story acceptance criteria verbatim.

### Requirement Completeness

- [x] **FRs testable**: All 14 FRs describe observable, testable behaviors.
- [x] **FRs mapped**: All FRs include `(Stories: ...)` traceability references.
- [x] **SCs measurable**: All 6 success criteria are measurable and technology-agnostic.
- [x] **SCs linked**: All SCs reference FR IDs.
- [x] **Assumptions documented**: Four assumptions listed, all reasonable.
- [x] **Dependencies listed**: Two dependencies captured.

### Ambiguity Control

- [x] **No unresolved questions**: No TBDs or clarification markers in spec body. Issue's open questions are all resolved in the spec.
- [x] **Precise language**: No vague adjectives without metrics.

### Scope & Risk

- [x] **Boundaries defined**: Clear In Scope (9 items) and Out of Scope (5 items) sections.
- [x] **Risks captured**: Three risks with impact descriptions and mitigations.

### Research Integration

- [x] **Research incorporated**: SpecResearch.md findings are reflected throughout — .gitignore detection pattern, surface area of affected skills, `paw-impl-review` gap (addressed in SC-005), VS Code extension flows.
- [ ] **External questions listed**: See Issue 1 below.

---

## Issues Requiring Changes

### Issue 1: SC-005 lists `paw-impl-review` but no FR covers it

**Criterion**: FRs mapped / SCs linked
**Section**: Success Criteria, Functional Requirements

SC-005 states: "All five affected skills (`paw-init`, `paw-git-operations`, `paw-transition`, `paw-pr`, `paw-impl-review`) correctly respect the three lifecycle modes." However, there is no FR that covers updating `paw-impl-review`. The research (Q7) identified a real gap — `paw-impl-review` commits without checking tracking state. FR-009 only covers `paw-git-operations`, FR-010 covers `paw-transition`, and FR-011 covers `paw-pr`.

**Suggestion**: Add an FR (e.g., FR-015) for updating `paw-impl-review` to check artifact lifecycle state before committing `.paw/` files, mapped to the relevant stories (P1, P4, P5). Alternatively, if the intent is that `paw-impl-review` delegates to `paw-git-operations` for all staging, state that explicitly and remove `paw-impl-review` from SC-005.

### Issue 2: FR-005's `.gitignore` handling contradicts FR-004

**Criterion**: Ambiguity control — precise language
**Section**: Functional Requirements (FR-004, FR-005)

FR-004 says: "create local `.gitignore` with `*` (untracked), and commit the removal." FR-005 says: "The `.gitignore` file created during stop-tracking must NOT be committed — it remains untracked locally." These two statements are consistent in intent (the `.gitignore` is created but not committed; what *is* committed is the `git rm --cached` removal), but the phrasing "commit the removal" in FR-004 makes it ambiguous whether the `.gitignore` creation is part of the committed change.

**Suggestion**: Reword FR-004 to clearly separate the two operations: (1) remove files from index and commit that removal, (2) create local `.gitignore` (untracked). For example: "...remove `.paw/work/<work-id>/` from git index with `git rm --cached -r` and commit the removal; then create a local `.gitignore` with `*` that remains untracked to prevent re-staging."

### Issue 3: "Integration tests for artifact lifecycle behavior" listed as Out of Scope

**Criterion**: Scope — boundaries defined (quality concern, not checklist failure)
**Section**: Scope → Out of Scope

The Out of Scope section explicitly excludes "Integration tests for artifact lifecycle behavior." Given the project's `.github/copilot-instructions.md` guidelines on integration testing and the fact that this feature touches 5 skills and modifies core staging logic, excluding tests entirely is a notable risk. The research identified zero existing test coverage for artifact tracking.

**Suggestion**: Either move integration tests into scope, or add an assumption that explains why tests are deferred (e.g., "Integration test coverage will be added in a follow-up issue") and capture the follow-up as a dependency or post-merge action. The planning stage needs clarity on whether tests are expected.

---

## Optional Polish (Non-Blocking)

- **Assumption 3** ("The stop-tracking commit as part of `paw-pr` is acceptable as a separate commit on the feature branch") could benefit from noting that this commit will be visible in the PR's commit list — reviewers will see it. This is a minor UX detail that planning should be aware of.
- **Edge case — "Concurrent changes"**: The behavior description says "handle gracefully" but doesn't specify what "gracefully" means. Consider specifying: unstaged local changes to `.paw/` files are preserved on disk; only the index is modified.

---

## Summary

This is a well-crafted spec that clearly traces from the RFC issue through a complete set of user stories, requirements, and success criteria. The three issues above are all fixable with targeted edits — no structural rework is needed. Once addressed, the spec is ready for planning.
