# Feature Specification: Planning Review SoT Support

**Branch**: feature/planning-review-sot-support  |  **Created**: 2026-02-27  |  **Status**: Draft
**Input Brief**: Add society-of-thought execution mode and perspective overlays to paw-planning-docs-review

## Overview

The PAW workflow's planning documents review gate (`paw-planning-docs-review`) currently supports two execution modes: single-model and multi-model. The final review gate (`paw-final-review`) supports a third mode — society-of-thought (SoT) — which orchestrates specialist personas for multi-perspective deliberative analysis via the `paw-sot` engine. This creates an asymmetry where the most sophisticated review capability is only available at the end of the workflow, after implementation is complete and changes are expensive.

Adding SoT support to planning docs review enables users to catch cross-artifact consistency issues earlier — during planning — when course corrections are cheapest. The SoT engine already supports an `artifacts` review type with a preamble designed for design and planning document review rather than code review. The infrastructure is ready; this feature wires the planning docs review skill into it.

Additionally, perspective overlays (composable evaluative lenses like premortem, retrospective, red-team) were recently added to the SoT engine (#270). When the planning docs review uses SoT mode, perspective overlays should be available and configurable, enabling specialists to review planning documents through multiple analytical frames.

## Objectives

- Enable society-of-thought execution mode for planning documents review, providing specialist-persona analysis of planning artifacts before implementation begins
- Support perspective overlays in SoT planning review, allowing diverse evaluative lenses on design decisions
- Maintain full configuration parity with final review's SoT support (specialists, interaction mode, specialist models, perspectives, moderator mode)
- Preserve backward compatibility — existing single-model and multi-model planning review workflows are unaffected

## User Scenarios & Testing

### User Story P1 – SoT Planning Review
Narrative: A developer configures `planning_review_mode: society-of-thought` during PAW init. After the plan passes plan-review, the planning docs review runs with specialist personas analyzing the Spec.md + ImplementationPlan.md + CodeResearch.md bundle. Each specialist applies their cognitive strategy to identify cross-artifact consistency issues from their domain perspective. A synthesis aggregates findings by confidence and agreement.

Independent Test: Configure SoT planning review mode, run through planning stage, verify specialist reviews and synthesis are produced in `reviews/planning/`.

Acceptance Scenarios:
1. Given `planning_review_mode` is `society-of-thought`, When planning docs review executes, Then the `paw-sot` engine is invoked with `type: artifacts` and specialist reviews + synthesis are written to `reviews/planning/`
2. Given SoT planning review with `planning_review_interaction_mode: debate`, When specialists produce findings, Then debate rounds occur before synthesis
3. Given SoT planning review with `planning_review_interaction_mode: parallel`, When specialists produce findings, Then all run in parallel and synthesis aggregates results

### User Story P2 – SoT Planning Review with Perspectives
Narrative: A developer configures `planning_review_perspectives: auto` (or explicit perspective names). Each specialist reviews planning documents through assigned perspective overlays (e.g., premortem analysis of the plan's feasibility, red-team analysis of assumption gaps).

Independent Test: Configure SoT planning review with perspectives, verify perspective-attributed review files are produced.

Acceptance Scenarios:
1. Given `planning_review_perspectives: auto`, When SoT planning review executes, Then perspectives are auto-selected based on artifact content and specialist reviews include perspective attribution
2. Given `planning_review_perspectives: premortem, red-team`, When SoT planning review executes, Then only those perspectives are applied and file naming reflects perspective (e.g., `REVIEW-SECURITY-PREMORTEM.md`)
3. Given `planning_review_perspectives: none`, When SoT planning review executes, Then no perspectives are applied and behavior is identical to SoT without perspectives

### User Story P3 – Smart Mode Resolution for SoT
Narrative: When `planning_review_interactive: smart` and mode is `society-of-thought`, findings from the synthesis are classified by confidence, grounding, and severity. High-confidence, directly-grounded must-fix/should-fix findings are auto-applied; lower-confidence or trade-off findings pause for user decision.

Independent Test: Run SoT planning review with smart interactivity, verify auto-apply vs interactive classification.

Acceptance Scenarios:
1. Given smart mode with SoT, When synthesis contains HIGH confidence + Direct grounding + must-fix finding affecting a single artifact, Then that finding is auto-applied to the affected artifact (spec or plan)
2. Given smart mode with SoT, When synthesis contains HIGH confidence + Direct grounding + should-fix finding affecting a single artifact, Then that finding is auto-applied to the affected artifact
3. Given smart mode with SoT, When synthesis contains a finding affecting both artifacts, Then that finding is presented interactively regardless of confidence (user chooses routing)
4. Given smart mode with SoT, When synthesis contains trade-off findings, Then those findings are presented interactively regardless of confidence
5. Given smart mode with SoT, When synthesis contains MEDIUM/LOW confidence findings, Then those findings are presented interactively

### User Story P4 – Moderator Mode for SoT Planning Review
Narrative: After finding resolution completes, if SoT mode is active and interactive conditions are met, the user can enter moderator mode to summon specialists for deeper analysis of specific planning concerns.

Independent Test: Complete SoT planning review resolution, verify moderator mode is offered when interactive conditions are met.

Acceptance Scenarios:
1. Given SoT planning review with `planning_review_interactive: true` and findings exist, When resolution completes, Then moderator mode is offered
2. Given SoT planning review with `planning_review_interactive: false`, When resolution completes, Then moderator mode is skipped
3. Given moderator mode is active, When user says "done" or "continue", Then moderator mode exits and workflow proceeds

### Edge Cases
- SoT mode configured but zero specialists found after discovery → paw-sot engine falls back to built-in default specialists (engine-level fallback; planning docs review does not preempt this)
- All specialist reviews return no findings → clean pass, no synthesis needed
- Perspective auto-selection finds no relevant perspectives → use baseline perspective
- SoT configured in VS Code → degrade to single-model with informational message (consistent with final review behavior)
- `planning_review_mode: society-of-thought` with `planning_docs_review: disabled` → SoT config is stored but unused

## Requirements

### Functional Requirements

- FR-001: `paw-init` accepts `society-of-thought` as a valid value for `planning_review_mode` (Stories: P1)
- FR-002: `paw-init` accepts and stores SoT-specific planning review config fields: `planning_review_specialists`, `planning_review_interaction_mode`, `planning_review_specialist_models`, `planning_review_perspectives`, `planning_review_perspective_cap` (Stories: P1, P2)
- FR-003: WorkflowContext.md template includes all new planning review SoT fields (Stories: P1, P2)
- FR-004: `paw-planning-docs-review` constructs SoT review context with `type: artifacts` and planning artifact coordinates when mode is `society-of-thought` (Stories: P1)
- FR-005: `paw-planning-docs-review` maps planning review config fields to the `paw-sot` review context input contract (Stories: P1, P2)
- FR-006: `paw-planning-docs-review` includes SoT classification heuristic (confidence × grounding × severity × affected artifact) for smart mode resolution — single-artifact consensus findings auto-route; multi-artifact findings always pause for user routing (Stories: P3)
- FR-007: `paw-planning-docs-review` supports moderator mode when SoT is active and interactive conditions are met (Stories: P4)
- FR-008: `paw-planning-docs-review` updates review artifacts table to include SoT output files (`REVIEW-{SPECIALIST-NAME}.md`, `REVIEW-{SPECIALIST-NAME}-{PERSPECTIVE}.md`, `REVIEW-SYNTHESIS.md`) (Stories: P1, P2)
- FR-009: `paw-planning-docs-review` degrades SoT to single-model in VS Code with informational message (Stories: P1)
- FR-010: `paw-init` validates SoT-specific fields when `planning_review_mode` is `society-of-thought` (specialist values, interaction mode, perspective values, perspective cap) (Stories: P1, P2)
- FR-011: Perspective overlay support passes `perspectives` and `perspective_cap` from WorkflowContext to SoT review context for planning review (Stories: P2)

### Key Entities
- **Planning Review SoT Config**: The set of WorkflowContext fields controlling SoT behavior for planning docs review
- **Review Context**: The input contract passed from `paw-planning-docs-review` to `paw-sot` engine

### Cross-Cutting / Non-Functional
- Configuration parity: every SoT config field available for final review must have a planning review counterpart
- Backward compatibility: existing `single-model` and `multi-model` planning review flows unchanged
- Prompt token discipline: new skill text should be proportional to value delivered

## Success Criteria

- SC-001: User can configure `planning_review_mode: society-of-thought` during PAW init and have it stored in WorkflowContext.md (FR-001, FR-002, FR-003)
- SC-002: SoT planning docs review produces specialist review files and synthesis in `reviews/planning/` directory (FR-004, FR-005, FR-008)
- SC-003: Smart mode correctly classifies SoT findings using confidence/grounding/severity heuristic (FR-006)
- SC-004: Moderator mode is available after SoT planning review resolution when interactive conditions are met (FR-007)
- SC-005: Perspective overlays are applied when configured, producing perspective-attributed file naming (FR-011, FR-008)
- SC-006: VS Code gracefully degrades SoT to single-model (FR-009)
- SC-007: Existing single-model and multi-model planning review workflows produce identical results before and after this change (backward compatibility)

## Assumptions

- The `paw-sot` engine's `artifacts` review type and context-adaptive preamble are sufficient for planning document review without modification (validated by inspection of paw-sot SKILL.md)
- Perspective overlays in SoT mode are handled natively by the `paw-sot` engine — no custom perspective logic needed in `paw-planning-docs-review`
- Multi-model perspective support is deferred to #269 — this work only adds perspectives via the SoT path
- Default values for new fields mirror final review defaults where applicable (`specialists: all`, `interaction_mode: parallel`, `specialist_models: none`, `perspectives: auto`, `perspective_cap: 2`)

## Scope

In Scope:
- SoT execution path in `paw-planning-docs-review`
- SoT config fields in `paw-init` and WorkflowContext.md template
- SoT classification heuristic for smart mode in planning docs review
- Moderator mode support for SoT planning review
- Perspective overlay config passthrough to SoT engine
- VS Code degradation handling
- SoT validation rules in `paw-init`

Out of Scope:
- Multi-model perspective support (#269)
- Changes to the `paw-sot` engine itself
- Changes to `paw-plan-review` (the simpler subagent-based review skill)
- New specialist personas
- New perspective overlay files
- Integration tests (separate follow-up)

## Dependencies

- `paw-sot` engine with `artifacts` type support (#251)
- Perspective overlay infrastructure in `paw-sot` (#270)
- `paw-final-review` as reference implementation for SoT + perspectives integration

## Risks & Mitigations

- **Token budget inflation**: Adding SoT execution path and smart mode heuristic to `paw-planning-docs-review` increases prompt size. Mitigation: Mirror `paw-final-review` structure closely; compress where possible; measure before/after token counts.
- **SoT re-review cost**: The existing re-review cycle re-runs the full review after artifact revisions. With SoT, this means re-running all specialists. Mitigation: Accept the cost for the first re-review cycle; the existing 2-cycle limit bounds total specialist invocations.
- **Configuration complexity**: 5 new config fields may overwhelm users during init. Mitigation: All fields have sensible defaults; only `planning_review_mode` needs explicit setting to enable SoT.
- **Duplicated patterns**: SoT execution + smart mode heuristic code is similar between final review and planning docs review. Mitigation: Accept structural duplication — each skill has distinct review context construction and resolution routing.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/272
- #261 (SoT perspective shifts — original feature)
- #270 (Temporal perspective shifts — merged)
- #269 (Multi-model perspectives — open, deferred)
- #251 (SoT engine extraction)
- `paw-final-review` SKILL.md — reference implementation
- `paw-sot` SKILL.md — review context input contract
