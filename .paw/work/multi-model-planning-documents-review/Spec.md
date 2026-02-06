# Feature Specification: Multi-model Planning Documents Review

**Branch**: feature/multi-model-planning-documents-review  |  **Created**: 2026-02-05  |  **Status**: Draft
**Input Brief**: Add a holistic planning documents review gate that examines Spec.md + ImplementationPlan.md + CodeResearch.md as a bundle using multi-model parallel review, catching cross-artifact consistency issues before implementation begins.

## Overview

PAW's current review pipeline evaluates planning artifacts individually — spec-review checks Spec.md in isolation, plan-review checks ImplementationPlan.md in isolation. While each catches problems within its artifact, neither can detect cross-artifact inconsistencies: a spec requirement the plan interprets differently than intended, assumptions that contradict code research findings, or scope drift between the spec's boundaries and the plan's exclusions.

Plans are the highest-leverage artifact in PAW — errors discovered during implementation are expensive, often requiring phase rework or spec re-negotiation. A holistic review that examines all planning documents as a unit catches these cross-artifact gaps before implementation begins, when they're cheapest to fix.

This feature adds a new review gate — `paw-planning-docs-review` — positioned after plan-review passes and before implementation (or Planning PR creation in PRs strategy). It follows the same multi-model parallel review pattern established by Final Agent Review, adapted for planning documents: parallel model-specific reviews, synthesis of cross-artifact findings, and interactive resolution that routes fixes back to the appropriate planning skill.

Planning documents are short compared to full implementations, making multi-model review low-cost and high-value — the ideal leverage point for catching cascading errors before they multiply across implementation phases.

## Objectives

- Catch cross-artifact consistency issues between spec, plan, and code research before implementation begins
- Leverage multiple AI model perspectives to identify gaps that single-model reviews miss
- Provide interactive resolution that routes findings to the correct planning artifact for revision
- Maintain the existing individual review pipeline (spec-review, plan-review) as fast iterative fix loops
- Mirror the Final Agent Review execution pattern for consistency across the workflow

## User Scenarios & Testing

### User Story P1 – Cross-Artifact Review Gate

Narrative: A developer has completed spec writing and implementation planning. Both individual reviews passed. Before committing to implementation, the planning documents are reviewed as a bundle to catch consistency issues spanning multiple artifacts.

Independent Test: After plan-review passes, the planning-docs-review runs automatically, examining all three planning artifacts together and surfacing cross-artifact findings.

Acceptance Scenarios:
1. Given plan-review has passed, When the workflow proceeds, Then planning-docs-review executes automatically (if enabled) before implementation begins
2. Given all three planning artifacts exist, When planning-docs-review runs, Then it examines Spec.md, ImplementationPlan.md, and CodeResearch.md as a unit
3. Given a spec requirement has no corresponding plan phase, When the review runs, Then it surfaces this as a traceability gap finding

### User Story P2 – Multi-Model Parallel Review

Narrative: A developer wants diverse AI perspectives on their planning documents to catch blind spots that any single model might miss.

Independent Test: In multi-model mode, three different AI models review the planning bundle in parallel, and their findings are synthesized with consensus categorization.

Acceptance Scenarios:
1. Given multi-model mode is configured, When planning-docs-review executes, Then three model-specific reviews run in parallel
2. Given all model reviews complete, When synthesis occurs, Then findings are categorized as consensus (all agree), partial (2+ agree), or single-model
3. Given single-model mode is configured, When planning-docs-review executes, Then a single review pass occurs without parallel execution

### User Story P3 – Interactive Resolution

Narrative: A developer reviews the planning-docs-review findings and decides how to address each one — applying fixes to spec, plan, or both, or skipping findings that aren't actionable.

Independent Test: Each finding is presented with resolution options, and applying a fix invokes the appropriate planning skill with the finding as context.

Acceptance Scenarios:
1. Given findings are presented interactively, When the user chooses to apply a spec fix, Then paw-spec is invoked with the finding as revision context
2. Given findings are presented interactively, When the user chooses to apply a plan fix, Then paw-planning is invoked with the finding as revision context
3. Given a finding affects both spec and plan, When the user applies it, Then both artifacts are revised in sequence
4. Given the user skips a finding, When the next finding is presented, Then the skipped finding is recorded but no revision occurs
5. Given all findings are resolved, When the review completes, Then the workflow proceeds to implementation (or Planning PR in PRs strategy)

### User Story P4 – Re-Review After Revision

Narrative: After applying fixes from the planning-docs-review, the developer needs to verify the revisions haven't introduced new cross-artifact issues.

Independent Test: After revisions are made, planning-docs-review re-runs to verify the bundle is now consistent.

Acceptance Scenarios:
1. Given revisions were applied from findings, When re-review runs, Then it examines the updated artifacts
2. Given no new findings are found, When re-review completes, Then the workflow proceeds
3. Given new findings emerge from revisions, When they are presented, Then the resolution cycle repeats

### Edge Cases

- CodeResearch.md does not exist (minimal mode or skipped): Review proceeds with Spec.md and ImplementationPlan.md only, noting reduced coverage
- Planning-docs-review is disabled: Workflow skips directly from plan-review to implementation/Planning PR
- All models return no findings: Review passes immediately, workflow proceeds
- User cancels mid-resolution: Partial progress is preserved; re-running continues from unresolved findings
- Single model fails during multi-model execution: Synthesis proceeds with available model results, noting the gap

## Requirements

### Functional Requirements

- FR-001: A new `paw-planning-docs-review` skill reviews Spec.md, ImplementationPlan.md, and CodeResearch.md as a holistic bundle (Stories: P1)
- FR-002: The review focuses on cross-artifact criteria: spec↔plan traceability, assumption consistency, scope coherence, feasibility validation, and completeness (Stories: P1)
- FR-003: Multi-model mode dispatches parallel reviews to configurable AI models, producing per-model review artifacts (Stories: P2)
- FR-004: Single-model mode performs a single review pass, producing a single review artifact (Stories: P2)
- FR-005: Multi-model findings are synthesized with consensus/partial/single-model categorization (Stories: P2)
- FR-006: Interactive mode presents findings individually with apply/skip/discuss options (Stories: P3)
- FR-007: Apply actions route to the appropriate planning skill (paw-spec for spec issues, paw-planning for plan issues) with finding context (Stories: P3)
- FR-008: After revisions, planning-docs-review re-runs to verify consistency without re-running individual reviews (Stories: P4)
- FR-009: WorkflowContext.md configuration fields control enablement, mode, interactivity, and model selection (Planning Docs Review, Planning Review Mode, Planning Review Interactive, Planning Review Models) (Stories: P1, P2)
- FR-010: The PAW agent routes through planning-docs-review after plan-review passes when enabled; `paw-transition` handles stage boundary enforcement and milestone pauses for the new gate (Stories: P1)
- FR-011: Review artifacts are written to `.paw/work/<work-id>/reviews/planning/` (Stories: P1, P2)
- FR-012: For PRs strategy, planning-docs-review executes before Planning PR creation (Stories: P1)
- FR-013: The feature is enabled by default in Full workflow mode, disabled in Minimal mode, and configurable in Custom mode (Stories: P1)
- FR-014: Existing spec-review and plan-review skills operate unchanged (Stories: P1)
- FR-015: Workflow reference skills (paw-status, paw-workflow) reflect the new review gate in stage progression and activity tables (Stories: P1)

### Key Entities

- **Planning Bundle**: The set of Spec.md + ImplementationPlan.md + CodeResearch.md reviewed as a unit
- **Cross-Artifact Finding**: An issue that spans multiple planning artifacts (e.g., spec↔plan traceability gap)
- **Resolution Action**: User decision on a finding — apply (to spec, plan, or both), skip, or discuss

### Cross-Cutting / Non-Functional

- Planning documents are short; multi-model review cost is proportional to document size
- Review execution time bounded by the slowest model in multi-model mode (parallel execution)
- Findings must be actionable — each finding identifies the artifact(s) affected and suggests a resolution direction

## Success Criteria

- SC-001: Cross-artifact consistency issues between spec and plan are detected before implementation begins (FR-001, FR-002)
- SC-002: Multi-model review produces per-model artifacts and a synthesis with consensus categorization (FR-003, FR-005)
- SC-003: Single-model fallback operates without parallel execution infrastructure (FR-004)
- SC-004: Interactive resolution routes fixes to the correct planning skill and re-verifies after revision (FR-006, FR-007, FR-008)
- SC-005: Workflow transitions correctly gate implementation behind the planning-docs-review when enabled (FR-010, FR-012)
- SC-006: Configuration fields in WorkflowContext.md control all review behavior (FR-009, FR-013)
- SC-007: The existing plan-review and spec-review skills continue to function unchanged (FR-014)

## Assumptions

- The multi-model parallel execution pattern from Final Agent Review (issue #200) is already implemented and available as a pattern to follow
- The `task` tool with `model` parameter is available for dispatching model-specific subagents
- Planning documents (Spec.md, ImplementationPlan.md, CodeResearch.md) are small enough that multi-model review cost is negligible
- The `paw-init` skill will be updated to include new WorkflowContext.md fields with sensible defaults
- The `paw-spec` and `paw-planning` skills support invocation with revision context for targeted edits rather than full rewrites

## Scope

In Scope:
- New `paw-planning-docs-review` skill with multi-model and single-model execution
- Cross-artifact review criteria (traceability, consistency, coherence, feasibility, completeness)
- Interactive resolution routing findings to paw-spec or paw-planning
- Re-review loop after revisions (planning-docs-review only, not individual reviews)
- WorkflowContext.md configuration fields (Planning Docs Review, Planning Review Mode, Planning Review Interactive, Planning Review Models)
- `paw-transition` routing updates for the new gate
- `paw-init` defaults for new configuration fields
- PAW agent orchestration updates for the new workflow position
- Specification and documentation updates

Out of Scope:
- Renaming existing `paw-plan-review` skill (follow-up issue)
- Society-of-Thought review mode (future evolution, issue #201)
- Changes to existing spec-review or plan-review behavior
- VS Code extension command updates (CLI-first, VS Code adapts separately)

## Dependencies

- Final Agent Review (#200) — provides the multi-model review pattern and infrastructure
- `paw-transition` skill — must be updated for new routing
- `paw-init` skill — must be updated for new WorkflowContext.md fields
- PAW agent — must be updated for new workflow orchestration

## Risks & Mitigations

- **Review fatigue**: Adding another review gate may slow the workflow. Mitigation: The gate is positioned at the highest-leverage point (before implementation) and planning documents are short, keeping review time minimal.
- **Resolution loop**: Revisions could trigger new findings indefinitely. Mitigation: Re-review after revision uses the same review; if findings persist after 2 cycles, present remaining findings as informational and proceed.
- **Model availability**: A model may be unavailable during multi-model execution. Mitigation: Synthesis proceeds with available results, noting reduced coverage.
- **Naming proximity**: `paw-plan-review` and `paw-planning-docs-review` could cause confusion. Mitigation: Clear differentiation in skill descriptions (iterative single-artifact fix loop vs. holistic multi-artifact gate); follow-up rename of paw-plan-review is out of scope but tracked.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/212
- Pattern reference: `paw-final-review` skill, `.github/skills/multi-model-review/SKILL.md`
- Related: #200 (Final Agent Review), #201 (Society-of-Thought)
