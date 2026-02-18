# Feature Specification: Society-of-Thought Review Mode for PAW Review

**Branch**: feature/paw-review-sot  |  **Created**: 2026-02-18  |  **Status**: Draft
**Input Brief**: Add society-of-thought review mode to PAW Review workflow using the extracted paw-sot engine

## Overview

PAW Review currently evaluates pull requests through a single-perspective gap analysis — one reviewer persona examining correctness, safety, testing, and maintainability in sequence. While effective, this approach lacks the perspective diversity that catches subtle issues arising from different domain expertise. A security specialist notices injection risks that a performance engineer overlooks, while an architecture guardian spots convention violations invisible to both.

The Society of Thought (SoT) review mode brings multi-perspective deliberation to PAW Review. When enabled, instead of running a single gap analysis pass, the workflow invokes the `paw-sot` engine with specialized reviewer personas — each bringing distinct expertise, cognitive strategies, and review priorities. These specialists can operate in parallel for speed or engage in structured debate for depth, producing a confidence-weighted synthesis that resolves conflicting assessments with explicit reasoning.

This builds on the `paw-sot` engine extracted in PR #251, which provides scenario-agnostic orchestration for specialist-based review. The implementation is a thin adapter layer: PAW Review constructs a review context from its existing `ReviewContext.md`, invokes `paw-sot`, and maps the synthesis output back into the existing comment pipeline for posting to GitHub. The hard orchestration work — specialist management, debate threading, adaptive selection, synthesis — is already done.

The result is a PAW Review mode that surfaces issues no single perspective would catch, with traceable rationale for every finding's priority. Users opt in via `review_mode: society-of-thought` in their review configuration, choosing their specialists, interaction mode, and model diversity preferences.

## Objectives

- Enable multi-perspective PR review through specialist personas with distinct expertise and review priorities
- Leverage the existing `paw-sot` engine to avoid duplicating orchestration, debate, and synthesis logic
- Replace both Impact Analysis and Gap Analysis with a unified SoT evaluation when the mode is active, simplifying the review pipeline
- Produce confidence-weighted findings with debate traces showing how conflicting specialist assessments were resolved
- Maintain backward compatibility — single-model remains the default; SoT is opt-in
- Feed SoT findings into the existing Output Stage pipeline (feedback → critic → github) for comment generation and posting

## User Scenarios & Testing

### User Story P1 – Enable SoT Review Mode
Narrative: A reviewer configuring PAW Review wants multi-perspective analysis. They set `review_mode: society-of-thought` in their review configuration, and the workflow invokes specialist personas instead of single-model gap analysis.

Independent Test: Configure `review_mode: society-of-thought` and run PAW Review on a PR; verify specialist review artifacts are created and findings appear in the synthesis.

Acceptance Scenarios:
1. Given a PR with `review_mode: society-of-thought` configured, When the evaluation stage runs, Then paw-sot is invoked with specialist personas and produces REVIEW-{SPECIALIST}.md files plus REVIEW-SYNTHESIS.md
2. Given a PR with `review_mode: society-of-thought` configured, When the evaluation stage completes, Then no separate ImpactAnalysis.md or GapAnalysis.md artifacts are created (SoT replaces both)
3. Given a PR with no review_mode configured (or `review_mode: single-model`), When the evaluation stage runs, Then the existing single-model gap analysis runs unchanged

### User Story P2 – Configure Specialist Selection
Narrative: A reviewer wants to control which specialist perspectives are applied to a PR. They configure specialist selection as `all`, a specific list, or `adaptive` to let the engine analyze the diff and select the most relevant specialists.

Independent Test: Configure `review_specialists: adaptive:3` and verify that only 3 contextually-selected specialists run.

Acceptance Scenarios:
1. Given `review_specialists: all`, When SoT evaluation runs, Then all available specialists execute
2. Given `review_specialists: security, performance, edge-cases`, When SoT evaluation runs, Then only those three specialists execute
3. Given `review_specialists: adaptive:4`, When SoT evaluation runs, Then paw-sot analyzes the diff and selects 4 relevant specialists

### User Story P3 – Choose Interaction Mode
Narrative: A reviewer wants to choose between fast parallel review and deeper debate-based review. They configure `review_interaction_mode: parallel` for speed or `debate` for richer findings with cross-specialist discussion.

Independent Test: Configure `review_interaction_mode: debate` and verify specialist findings include threaded discussion traces.

Acceptance Scenarios:
1. Given `review_interaction_mode: parallel`, When SoT evaluation runs, Then specialists review independently and synthesis merges findings
2. Given `review_interaction_mode: debate`, When SoT evaluation runs, Then specialists engage in multi-round threaded discussion and synthesis includes debate traces

### User Story P4 – Findings Flow to GitHub Comments
Narrative: After SoT evaluation produces synthesized findings, the reviewer wants those findings to flow through the normal output pipeline — generating review comments, undergoing critique, and being posted to GitHub as a pending review.

Independent Test: Run SoT review to completion and verify that findings from REVIEW-SYNTHESIS.md appear as draft review comments in ReviewComments.md.

Acceptance Scenarios:
1. Given REVIEW-SYNTHESIS.md exists with findings, When the output stage begins, Then findings are mapped into the paw-review-feedback pipeline as input
2. Given SoT findings have been processed through feedback and critic stages, When the reviewer approves, Then comments are posted to GitHub via paw-review-github

### User Story P5 – Configure Model Diversity
Narrative: A reviewer wants different specialists to use different AI models for architectural diversity. They configure a model pool or pinned specialist-model pairs.

Independent Test: Configure `review_specialist_models: security:claude-opus-4.6, gpt-5.3-codex` and verify the security specialist uses Claude while others draw from the pool.

Acceptance Scenarios:
1. Given `review_specialist_models: none`, When SoT evaluation runs, Then all specialists use the session default model
2. Given a model pool configured, When SoT evaluation runs, Then models are distributed round-robin across specialists
3. Given pinned pairs configured, When SoT evaluation runs, Then pinned specialists use their assigned model and unpinned specialists draw from any remaining pool

### Edge Cases
- PR with no code changes (documentation-only): SoT should still run if configured, with specialists focusing on documentation quality
- Very small PR (< 10 lines): Adaptive selection should select fewer specialists; parallel mode preferred
- PR touching security-sensitive files: Adaptive selection should include security specialist regardless of N
- Review mode configured but paw-sot skill unavailable: Report error, do not fall back silently
- Conflicting specialist assessments in synthesis: Must include explicit conflict resolution reasoning in REVIEW-SYNTHESIS.md

## Requirements

### Functional Requirements

- FR-001: PAW Review workflow supports a `society-of-thought` review mode alongside existing `single-model` mode (Stories: P1)
- FR-002: When `review_mode: society-of-thought` is active, the Evaluation Stage invokes paw-sot instead of running paw-review-impact and paw-review-gap separately (Stories: P1)
- FR-003: The adapter constructs a paw-sot review context from ReviewContext.md fields, mapping review configuration to paw-sot contract fields (Stories: P1)
- FR-004: Review context uses `type: diff` with PR diff as coordinates (Stories: P1)
- FR-005: Specialist selection is configurable via `review_specialists` field: `all`, comma-separated names, or `adaptive:<N>` (Stories: P2)
- FR-006: Interaction mode is configurable via `review_interaction_mode`: `parallel` or `debate` (Stories: P3)
- FR-007: SoT output artifacts (REVIEW-{SPECIALIST}.md, REVIEW-SYNTHESIS.md) are written to the PAW Review artifact directory (Stories: P1, P4)
- FR-008: REVIEW-SYNTHESIS.md findings are mapped into the paw-review-feedback pipeline as input for comment generation (Stories: P4)
- FR-009: Specialist model diversity is configurable via `review_specialist_models`: none, pool, pinned, or mixed (Stories: P5)
- FR-010: When `review_mode` is not `society-of-thought`, the existing single-model pipeline runs unchanged (Stories: P1)
- FR-011: paw-sot's built-in specialists (with 4-level discovery) are used; no PAW Review-specific specialist definitions needed (Stories: P2)
- FR-012: The REVIEW-* artifact naming convention is adopted consistently (replacing GapAnalysis-* naming) (Stories: P1)

### Key Entities

- **Review Context**: PAW Review's ReviewContext.md — the authoritative configuration source, extended with SoT fields
- **SoT Review Context**: The contract object constructed by the adapter and passed to paw-sot (type, coordinates, output_dir, specialists, interaction_mode, interactive, specialist_models)
- **Specialist Persona**: A built-in paw-sot reviewer role with distinct expertise and cognitive strategy

### Cross-Cutting / Non-Functional

- SoT mode must work in both CLI and VS Code environments (paw-sot is session-loaded, not subagent-dependent)
- No new external dependencies — paw-sot is already part of the project

## Success Criteria

- SC-001: Running PAW Review with `review_mode: society-of-thought` produces per-specialist review artifacts and a synthesis artifact (FR-001, FR-002, FR-007)
- SC-002: SoT findings flow through the existing comment pipeline and can be posted to GitHub (FR-008)
- SC-003: Specialist selection modes (all, explicit list, adaptive) produce the expected number and composition of specialist reviews (FR-005, FR-011)
- SC-004: Parallel and debate interaction modes produce structurally distinct outputs (parallel: independent findings; debate: threaded discussion traces) (FR-006)
- SC-005: Existing single-model review mode continues to work unchanged when SoT is not configured (FR-010)
- SC-006: Model diversity configuration is respected — pinned specialists use assigned models, pool models are distributed (FR-009)
- SC-007: REVIEW-* naming convention is used consistently across artifacts (FR-012)

## Assumptions

- The paw-sot engine (extracted in PR #251) is stable and merged to main — this work builds on it, not alongside it
- paw-sot's built-in specialists are sufficiently general for PR review scenarios (they were designed for implementation review but cover the same dimensions)
- The `diff` review context type in paw-sot is appropriate for PR review (same as paw-final-review's usage)
- ImpactAnalysis.md is not needed as a separate artifact in SoT mode — impact concerns are addressed by relevant specialists (architecture, security, performance)

## Scope

In Scope:
- Adapter layer in PAW Review workflow to invoke paw-sot for SoT evaluation
- ReviewContext.md field extensions for SoT configuration
- paw-review-workflow skill updates to route through SoT when configured
- Mapping SoT synthesis findings into paw-review-feedback input format
- Artifact naming alignment (REVIEW-* convention)
- Documentation updates for the new review mode

Out of Scope:
- Changes to paw-sot engine internals (it's consumed as-is)
- New specialist persona definitions (using built-in ones)
- Multi-model review mode for PAW Review (separate concern; multi-model is for paw-final-review)
- Changes to the Output Stage pipeline (feedback → critic → github) — it receives mapped input but isn't modified
- Cross-repo correlation with SoT (paw-review-correlation remains separate)

## Dependencies

- paw-sot skill (extracted in PR #251, merged to main)
- paw-review-workflow skill (orchestration target for modifications)
- paw-review-gap skill (bypassed when SoT mode active, but unchanged)
- paw-review-impact skill (bypassed when SoT mode active, but unchanged)
- paw-review-feedback skill (receives mapped SoT findings as input)

## Risks & Mitigations

- Specialist overlap with existing gap analysis categories: specialists may produce findings in formats that don't map cleanly to the feedback pipeline's expected input. Mitigation: define a clear mapping from REVIEW-SYNTHESIS.md finding structure to paw-review-feedback's expected input format.
- Token cost: running multiple specialists costs more than single-model. Mitigation: adaptive selection limits specialist count; parallel mode is faster than debate.
- SoT findings quality for PR context: specialists were designed for implementation review, not PR review. Mitigation: paw-sot's context-adaptive preambles handle `type: diff` with PR-appropriate framing.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/209
- SoT Research: arXiv:2601.10825 — "Society of Thought" paper
- Related: PR #251 (paw-sot extraction), Issue #208 (multi-model support), Issue #201 (SoT for final review)
