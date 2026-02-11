# Plan Review: Artifact Lifecycle Management

**Reviewer**: Plan Review Activity  
**Date**: 2026-02-11  
**Plan**: `.paw/work/artifact-lifecycle-management/ImplementationPlan.md`  
**Spec**: `.paw/work/artifact-lifecycle-management/Spec.md`  

---

## Verdict: CONDITIONAL PASS

The plan is well-structured, technically sound, and covers the full scope of the specification. Phase ordering is logical with correct incremental dependencies. File references are verified against the codebase. Two blocking issues must be resolved before implementation proceeds; both are scoping/completeness gaps rather than feasibility concerns.

---

## Spec Coverage Assessment

### Functional Requirements Mapping

| Requirement | Plan Phase | Status |
|-------------|-----------|--------|
| FR-001: Three-mode `artifact_lifecycle` setting | Phase 1 | ✅ Covered |
| FR-002: Default to `commit-and-clean` without prompt | Phase 1 (paw-init) | ✅ Covered |
| FR-003: Explicit `Artifact Lifecycle` field in WorkflowContext.md | Phase 1 (paw-init template) | ✅ Covered |
| FR-004: Stop-tracking at `paw-pr` time for `commit-and-clean` | Phase 2 | ✅ Covered |
| FR-005: `.gitignore` NOT added to git during stop-tracking | Phase 2 (step 3: "do NOT stage this file") | ✅ Covered |
| FR-006: Artifact link in PR description for `commit-and-clean` | Phase 2 | ✅ Covered |
| FR-007: Legacy `artifact_tracking` mapping | Phase 1 (fallback detection) | ✅ Covered |
| FR-008: `.gitignore`-based fallback detection | Phase 1 (detection hierarchy) | ✅ Covered |
| FR-009: Three-mode staging in `paw-git-operations` | Phase 1 | ✅ Covered |
| FR-010: `paw-transition` lifecycle detection and output | Phase 1 | ✅ Covered |
| FR-011: `paw-pr` conditional stop-tracking | Phase 2 | ✅ Covered |
| FR-012: VS Code init UI update | Phase 3 | ✅ Covered |
| FR-013: VS Code "Stop Tracking" command lifecycle-awareness | Phase 3 | ✅ Covered |
| FR-014: Stop-tracking idempotency | Phase 2 (explicit: "skip gracefully") | ✅ Covered |
| FR-015: `paw-impl-review` lifecycle-aware staging | Phase 1 | ✅ Covered |

**All 15 functional requirements are mapped to plan phases.** No orphaned requirements.

### User Stories Coverage

| Story | Plan Coverage |
|-------|--------------|
| P1 – Clean Main After Merge | Phase 2 stop-tracking operation |
| P2 – Artifact Links in Final PR | Phase 2 PR description |
| P3 – Seamless Default Experience | Phase 1 paw-init defaults |
| P4 – Explicit Persist Mode | Phase 1 + Phase 2 (no-op path) |
| P5 – Never Commit Mode | Phase 1 + Phase 2 (no-op path) |
| P6 – Backward Compatibility | Phase 1 detection hierarchy |

### Success Criteria from Spec

| Spec SC | Plan Verification |
|---------|-------------------|
| SC-001: Zero `.paw/` in final PR diff | Phase 2 success criteria |
| SC-002: Artifact link in PR description | Phase 2 success criteria |
| SC-003: Default without prompting, explicit field stored | Phase 1 success criteria |
| SC-004: Legacy values continue working | Phase 1 success criteria |
| SC-005: All five skills respect three modes | Phase 1 + Phase 2 success criteria |
| SC-006: VS Code UI reflects lifecycle modes | Phase 3 success criteria |

---

## Phase Feasibility Assessment

### Phase 1: Core Skill Updates
- **Scope**: 5 files (paw-init, paw-git-operations, paw-transition, paw-impl-review, PAW.agent.md)
- **Assessment**: Well-scoped. Changes are mechanical replacements of binary toggle with three-mode logic. File:line references verified against codebase — all match.
- **Dependencies**: None (foundational phase)
- **Verdict**: ✅ Feasible

### Phase 2: paw-pr Stop-Tracking
- **Scope**: 1 file (paw-pr/SKILL.md)
- **Assessment**: Most complex behavioral change — adding active git operations to a skill that currently only reads state. Stop-tracking sequence is well-defined and reuses the proven pattern from `src/prompts/stopTrackingArtifacts.template.md`. Idempotency handling is explicit.
- **Dependencies**: Phase 1 (needs lifecycle detection in place)
- **Verdict**: ✅ Feasible

### Phase 3: VS Code Extension
- **Scope**: 4-5 files (userInput.ts, initializeWorkItem.ts, stopTrackingArtifacts.ts, stopTrackingArtifacts.template.md, potentially userInput.test.ts)
- **Assessment**: Straightforward type and UI changes. QuickPick replacement from 2-option boolean to 3-option string is clean. 
- **Dependencies**: Phase 1 (skill parameter name must match)
- **Verdict**: ✅ Feasible

### Phase 4: Specification and Documentation
- **Scope**: 3 files (paw-specification.md, vscode-extension.md, artifacts.md)
- **Assessment**: Documentation changes aligned with prior implementation phases.
- **Dependencies**: Phases 1-3 (documenting implemented behavior)
- **Verdict**: ✅ Feasible

### Phase 5: Documentation (Docs.md + cleanup recipe)
- **Scope**: Docs.md artifact + cleanup recipe
- **Assessment**: Standard docs phase.
- **Dependencies**: Phases 1-4
- **Verdict**: ✅ Feasible

**Phase ordering is correct.** Each phase builds on prior phases with no circular dependencies. Phases can be reviewed independently.

---

## Blocking Issues

### BLOCKING-1: Phase 3 missing `paw-init` prompt awareness for CLI mode

The plan updates the VS Code extension UI to present a three-option picker (Phase 3) and updates the `paw-init` skill parameter from boolean to string (Phase 1). However, in CLI mode, the PAW agent directly passes parameters to `paw-init` without going through the VS Code UI. The plan's Phase 1 changes to `paw-init/SKILL.md` handle the skill-side parameter change, and the spec says "default to `commit-and-clean` without prompting" (FR-002) — but the plan should explicitly note that the `paw-init` skill's default value handles the CLI case (where no UI picker exists). Currently the plan says "Replace `track_artifacts` boolean parameter (line 32) with `artifact_lifecycle` string parameter, default `commit-and-clean`" which does cover it, but the plan should confirm that no other CLI-specific code needs updating.

**Impact**: If there's CLI-specific code that passes `track_artifacts` not covered by the plan, it would break CLI workflows.

**Location**: Phase 1, paw-init changes; Phase 3 scope.

**Resolution**: Verify there's no CLI-specific code path that passes `track_artifacts` to `paw-init` beyond the VS Code extension. If the CLI relies entirely on the skill default, add a note confirming this. If CLI code exists (e.g., in `cli/`), add it to Phase 3 or a separate phase.

### BLOCKING-2: Phase 3 test coverage is underspecified

Phase 3 lists `src/test/suite/userInput.test.ts` for a test addition but hedges with "if type is exported with validator." The spec has no optional requirements — FR-012 requires the UI update. The plan should specify what the test validates (the new type, QuickPick option count, default selection) rather than making it conditional.

Additionally, CodeResearch.md §19 identifies that integration tests should validate: default lifecycle mode at init, `commit-and-clean` stop-tracking at paw-pr time, `never-commit` prevents staging, and legacy backward compatibility. The plan includes no integration test phase or integration test items in any phase's success criteria.

**Impact**: No test coverage for the most critical new behavior (stop-tracking at PR time). The spec's success criteria SC-001 through SC-006 are untestable without integration tests.

**Location**: Phase 2 and Phase 3 success criteria.

**Resolution**: Either add integration test items to relevant phases (at minimum Phase 2 for stop-tracking behavior) or add a rationale for deferring integration tests. Remove the "if applicable" hedge from Phase 3's unit test item.

---

## Improvement Suggestions

### IMPROVE-1: Phase 2 stop-tracking step 3 should clarify `.gitignore` non-staging mechanism

Phase 2 says "Create `.paw/work/<work-id>/.gitignore` with `*` (do NOT stage this file)" — but doesn't explain *how* the agent ensures it's not staged, given that step 4 commits. The existing template at `src/prompts/stopTrackingArtifacts.template.md` relies on the `.gitignore` with `*` ignoring itself (self-ignoring pattern). The plan should note this is the mechanism (the `.gitignore` prevents its own staging automatically) rather than requiring an explicit "don't stage" instruction, which could confuse the implementing agent.

**Location**: Phase 2, stop-tracking step 3.

### IMPROVE-2: Phase 4 spec section scope is vague

Phase 4 says "Add Artifact Lifecycle section defining the three modes, default behavior, stop-tracking mechanism, and backward compatibility mapping" for `paw-specification.md`. This is a significant specification addition. The plan should list the key subsections or content areas to ensure the spec update is comprehensive (e.g., parameter definition, mode behaviors, stop-tracking sequence, backward compatibility mapping table).

**Location**: Phase 4, paw-specification.md changes.

### IMPROVE-3: Phase 5 cleanup recipe location unspecified

Phase 5 mentions "Document in appropriate docs location how to bulk-remove old `.paw/work/` directories from `main`" but doesn't specify which file or docs section. Should this be in the user guide? A new troubleshooting page? An FAQ? The implementing agent will have to guess.

**Location**: Phase 5, cleanup recipe.

---

## Notes

### NOTE-1: Session policy consideration

The plan has 5 phases. With `session_policy: per-stage` (default), this means 5+ implementation sessions. The plan phases are well-scoped for independent sessions.

### NOTE-2: Stop-tracking commit ordering

Phase 2 describes the stop-tracking commit happening *before* PR creation. The spec assumes this is a separate commit on the feature branch (Assumptions section). The plan correctly captures this sequence. Worth noting that the stop-tracking commit will be visible in the PR's commit history.

### NOTE-3: `paw-init` no-prompt behavior

The plan correctly implements FR-002's "default without prompting" by setting the skill parameter default to `commit-and-clean`. The VS Code extension *does* show a picker (Phase 3), but the skill default handles the no-prompt case for CLI and direct skill invocations.

---

## Quality Checklist

### Spec Coverage
- [x] All spec requirements mapped to plan phases (15/15 FRs covered)
- [x] User stories have corresponding implementation work (6/6 stories covered)
- [x] Success criteria from spec reflected in phase success criteria (6/6 SCs mapped)
- [x] No spec requirements orphaned

### Phase Feasibility
- [x] Each phase has clear, testable success criteria
- [x] Phase boundaries are logical (not too large, not too small)
- [x] Dependencies between phases are explicit
- [x] Phases build incrementally and can be reviewed independently

### Completeness
- [x] No placeholder content or TBDs
- [x] All file paths and components specified
- [ ] Unit tests specified alongside code they test — **BLOCKING-2**: test coverage underspecified
- [x] "What We're NOT Doing" section exists and aligns with spec's Out of Scope

### Research Integration
- [x] Code research findings incorporated (file:line references verified against codebase)
- [x] Documentation System section from CodeResearch.md considered (Phase 4/5 use mkdocs build)
- [x] Existing patterns referenced (stop-tracking template pattern reused)

### Strategic Focus
- [x] Changes describe WHAT not HOW (interfaces, responsibilities)
- [x] Code blocks limited to architectural concepts
- [x] No implementation algorithms or pseudo-code (Phase 2 git sequence is operational spec, not pseudo-code)
- [x] Significant decisions include trade-off analysis (implicit in spec)

### Documentation Planning
- [x] Documentation phase included (Phase 4 + Phase 5)
- [x] Docs.md specified (Phase 5)
- [x] Project docs updates included (Phase 4: specification, user guide, reference)
- [x] N/A — project docs are included

---

## Recommendation

**CONDITIONAL PASS** — The plan is ready for implementation after addressing the two blocking issues:

1. **BLOCKING-1**: Verify CLI code path coverage and add a note or additional changes if needed.
2. **BLOCKING-2**: Specify test coverage (remove hedging on unit tests; address integration test gap with either test items or explicit deferral rationale).

The three IMPROVE items are non-blocking but would strengthen the plan's clarity for the implementing agent.
