# Feature Specification: Society-of-Thought for PAW Planning Workflow

**Branch**: feature/society-of-thought-planning  |  **Created**: 2026-02-06  |  **Status**: Draft
**Input Brief**: Add multi-model plan generation and plan review to PAW Planning stage, bringing the Society-of-Thought pattern forward from final-review to where it has the highest leverage — design decisions.

## Overview

PAW's planning stage currently relies on a single AI model to create the implementation plan — the highest-leverage artifact in the entire workflow. Errors in the plan cascade through every implementation phase, making plan quality critical. Different models have different architectural strengths: one might prefer simpler phasing while another opts for more granular decomposition; one might catch integration risks another misses; one might propose better component boundaries.

This feature extends the planning stage with multi-model consensus, following the same Society-of-Thought pattern already proven in `paw-final-review`. Multiple AI models independently create competing implementation plans, optionally debate each other's approaches, then synthesize into a single consensus ImplementationPlan.md. The same multi-model treatment extends to plan review, where multiple models independently validate the plan and produce a weighted verdict.

The feature introduces three planning modes — `single-model` (current behavior, default), `multi-model` (independent plans then synthesis), and `multi-model-deep` (plans, debate round, then synthesis). Users configure this via WorkflowContext.md, mirroring the final-review configuration pattern. All modes produce the same downstream artifact (ImplementationPlan.md), ensuring zero impact on implementation and later stages.

This is a CLI-only capability since multi-model parallel execution requires the `task` tool with model parameter, which is unavailable in VS Code. VS Code gracefully falls back to single-model mode.

## Objectives

- Enable higher-quality implementation plans by synthesizing the best ideas from multiple independent AI perspectives
- Provide configurable planning depth — users choose cost/quality tradeoff per feature complexity
- Bring the proven multi-model consensus pattern from final-review forward to the planning stage
- Extend plan review with multi-model validation for higher-confidence pass/fail verdicts
- Maintain full backwards compatibility — existing single-model workflows unchanged

## User Scenarios & Testing

### User Story P1 – Multi-Model Plan Generation (Simple Mode)

Narrative: A developer working on a complex feature wants better plan quality. They configure `Planning Mode: multi-model` in WorkflowContext.md. During the planning stage, three models independently create plans in parallel. A synthesis step merges the best elements into a single ImplementationPlan.md. The developer reviews the synthesized plan, which captures architectural insights that no single model would have produced alone.

Independent Test: Configure multi-model planning mode, run planning stage, and verify three per-model draft plans are saved and a synthesized ImplementationPlan.md is produced.

Acceptance Scenarios:
1. Given Planning Mode is `multi-model` and three models are configured, When the planning stage runs, Then three parallel subagents each produce a full plan draft saved to `planning/PLAN-{MODEL}.md`, and a synthesis step produces the final `ImplementationPlan.md`
2. Given Planning Mode is `multi-model`, When one subagent fails, Then the synthesis proceeds with the remaining successful plans and reports the failure
3. Given Planning Mode is `multi-model`, When running in VS Code, Then a fallback message is shown and single-model planning executes instead

### User Story P2 – Multi-Model Plan Generation (Deep Mode)

Narrative: A developer working on a high-stakes architectural change wants maximum plan quality and is willing to spend more on LLM calls. They configure `Planning Mode: multi-model-deep`. After the independent plans are created, each model reviews all three plans and writes a critique identifying strengths, disagreements, and synthesis recommendations. The final synthesis is informed by both the plans and the debate.

Independent Test: Configure deep mode, run planning stage, and verify critique artifacts are produced in addition to plan drafts, and the synthesis references debate insights.

Acceptance Scenarios:
1. Given Planning Mode is `multi-model-deep`, When the planning stage runs, Then after plan drafts are created, each model produces a `CRITIQUE-{MODEL}.md` analyzing all three plans, and synthesis uses both plans and critiques
2. Given Planning Mode is `multi-model-deep`, When critiques are generated, Then each critique covers: strengths per plan, where plans disagree, risks/gaps spotted, and a recommended synthesis approach
3. Given deep mode is active, When critique artifacts are produced, Then they are saved in the `planning/` subfolder alongside plan drafts

### User Story P3 – Multi-Model Plan Review

Narrative: A developer wants higher confidence in plan validation. They configure `Plan Review Mode: multi-model`. During plan review, three models independently review the synthesized ImplementationPlan.md. A weighted verdict passes if the majority of models pass, but all concerns from all models are surfaced regardless of the overall verdict.

Independent Test: Configure multi-model plan review, run plan-review, and verify per-model verdicts are produced and a weighted synthesis verdict is returned.

Acceptance Scenarios:
1. Given Plan Review Mode is `multi-model`, When plan review runs, Then each model independently produces a structured verdict, and a weighted synthesis determines the overall PASS/FAIL
2. Given two of three models return PASS and one returns FAIL, When verdicts are synthesized, Then the overall verdict is PASS but all BLOCKING and IMPROVE items from the failing model are surfaced
3. Given all three models return FAIL, When verdicts are synthesized, Then the overall verdict is FAIL with combined feedback from all models

### User Story P4 – Configuration and Backwards Compatibility

Narrative: An existing PAW user upgrades to a version with multi-model planning support. Their existing WorkflowContext.md files have no planning mode fields. The planning stage continues to work exactly as before in single-model mode. A new user creating a workflow sees the new configuration options with sensible defaults.

Independent Test: Run planning stage with a WorkflowContext.md that has no Planning Mode field and verify single-model behavior is unchanged.

Acceptance Scenarios:
1. Given WorkflowContext.md has no Planning Mode field, When the planning stage runs, Then single-model planning executes (current behavior)
2. Given Planning Mode is `single-model`, When the planning stage runs, Then behavior is identical to current implementation with no per-model artifacts created
3. Given paw-init runs, When WorkflowContext.md is generated, Then Planning Mode and Plan Review Mode fields are included with `single-model` defaults

### Edge Cases

- Model resolution failure: If a configured model name/intent cannot be resolved, report the error and fall back to remaining models (minimum 2 required for multi-model)
- All subagents fail: Report failure and offer to retry or fall back to single-model
- Identical plans: If all models produce near-identical plans, synthesis should recognize convergence and produce the plan without unnecessary merging
- Very large plans: Per-model artifacts may be large; ensure the `planning/` subfolder is gitignored to avoid bloating the repository
- Configuration validation: `multi-model` and `multi-model-deep` modes require CLI execution context; reject with clear error if attempted in VS Code

## Requirements

### Functional Requirements

- FR-001: Extend `paw-planning` skill with `single-model`, `multi-model`, and `multi-model-deep` execution modes (Stories: P1, P2, P4)
- FR-002: In multi-model modes, spawn parallel subagents using the `task` tool with `model` parameter, each receiving identical planning inputs (Spec.md, CodeResearch.md, planning prompt) (Stories: P1, P2)
- FR-003: Each subagent must produce a full ImplementationPlan.md-format document, saved as `PLAN-{MODEL}.md` in the `planning/` subfolder (Stories: P1, P2)
- FR-004: A synthesis step must read all per-model plans and produce the final `ImplementationPlan.md`, selecting best phase structure, architecture decisions, and catching blind spots (Stories: P1, P2)
- FR-005: In deep mode, after plan drafts are created, each model must receive all plans and produce a `CRITIQUE-{MODEL}.md` analyzing strengths, disagreements, gaps, and synthesis recommendations (Stories: P2)
- FR-006: In deep mode, the synthesis step must incorporate both plans and critiques (Stories: P2)
- FR-007: Extend multi-model plan review by having the PAW orchestrator spawn parallel `paw-plan-review` subagents (one per model) since `paw-plan-review` runs as a subagent and cannot spawn sub-subagents itself. The orchestrator collects per-model verdicts and performs synthesis. (Stories: P3)
- FR-008: Plan review synthesis must use weighted verdict — PASS if majority passes, all concerns surfaced regardless. Per-model verdicts saved as `PLAN-REVIEW-{MODEL}.md` in the `planning/` subfolder, with a `PLAN-REVIEW-SYNTHESIS.md` containing the weighted verdict and combined feedback. (Stories: P3)
- FR-009: Add `Planning Mode`, `Planning Models`, `Plan Review Mode`, and `Plan Review Models` configuration fields to WorkflowContext.md (Stories: P4)
- FR-010: Default all new fields to `single-model` for backwards compatibility (Stories: P4)
- FR-011: Update `paw-init` to include the new configuration fields in generated WorkflowContext.md with input parameters: `planning_mode` (default: `single-model`, values: `single-model | multi-model | multi-model-deep`), `planning_models` (default: `latest GPT, latest Gemini, latest Claude Opus`), `plan_review_mode` (default: `single-model`, values: `single-model | multi-model`), `plan_review_models` (default: `latest GPT, latest Gemini, latest Claude Opus`) (Stories: P4)
- FR-012: Create `planning/` subfolder in the work directory with gitignore for per-model artifacts (Stories: P1, P2)
- FR-013: Graceful fallback to single-model when running in VS Code with multi-model configured (Stories: P1, P4)
- FR-014: Handle partial subagent failures — synthesize from successful results if at least 2 models complete (applies to both planning and plan review) (Stories: P1, P2, P3)

### Key Entities

- **Plan Draft**: A full ImplementationPlan.md-format document produced by a single model during independent plan generation
- **Critique**: A structured analysis of all plan drafts produced by a single model during the debate round (deep mode only)
- **Plan Synthesis**: The process of merging multiple plan drafts (and optionally critiques) into a single final ImplementationPlan.md
- **Review Verdict**: A structured PASS/FAIL assessment with BLOCKING/IMPROVE/NOTE categorized feedback, produced per-model and synthesized

### Cross-Cutting / Non-Functional

- Multi-model planning modes are CLI-only; VS Code falls back to single-model with user notification
- Per-model artifacts (plan drafts, critiques) must not be committed to the repository
- Model resolution must follow the same intent-to-model-name pattern used by `paw-final-review`

## Success Criteria

- SC-001: When Planning Mode is `multi-model`, three independent plan drafts are created in parallel and a synthesized ImplementationPlan.md is produced (FR-002, FR-003, FR-004)
- SC-002: When Planning Mode is `multi-model-deep`, critique artifacts are produced after plan drafts and the synthesis incorporates debate insights (FR-005, FR-006)
- SC-003: When Plan Review Mode is `multi-model`, per-model verdicts are produced and a weighted synthesis verdict is returned with all concerns surfaced (FR-007, FR-008)
- SC-004: When no Planning Mode is configured, single-model planning runs identically to current behavior (FR-010)
- SC-005: Per-model artifacts are saved in a gitignored `planning/` subfolder and never committed (FR-012)
- SC-006: When a multi-model mode is configured in VS Code, a fallback message is shown and single-model executes (FR-013)
- SC-007: When one subagent fails in multi-model mode, synthesis proceeds with remaining results (FR-014)

## Assumptions

- The `task` tool's `model` parameter supports all models that users may configure (same assumption as `paw-final-review`)
- Model intent resolution (e.g., "latest GPT" → specific model name) uses the same mechanism already implemented in `paw-final-review`
- The existing ImplementationPlan.md template is suitable for per-model plan drafts without modification
- Three models is a reasonable default; two is the minimum for meaningful multi-model consensus

## Scope

In Scope:
- Multi-model plan generation (simple and deep modes) in `paw-planning`
- Multi-model plan review with weighted verdict in `paw-plan-review`
- WorkflowContext.md configuration fields and `paw-init` updates
- Per-model artifact storage with gitignore
- VS Code fallback behavior
- Partial failure handling

Out of Scope:
- Multi-model spec review (`paw-spec-review`) — separate future work
- Multi-model code research (`paw-code-research`) — low value for documentary tasks
- Society-of-Thought with specialist personas (sequential, role-based) — separate from multi-model parallel approach
- Smart interactive mode for synthesis findings (#219) — future enhancement
- Holistic planning documents review (#212) — complementary but separate feature
- Changes to downstream workflow stages (implementation, final review, PR)

## Dependencies

- Existing `paw-final-review` multi-model infrastructure (model resolution, subagent spawning pattern)
- `task` tool with `model` parameter (CLI environment)
- Existing `paw-planning` skill and ImplementationPlan.md template
- Existing `paw-plan-review` skill and BLOCKING/IMPROVE/NOTE verdict format

## Risks & Mitigations

- **Cost concern**: Multi-model planning uses 4-7x more LLM calls than single-model. Mitigation: Default to `single-model`; multi-model is opt-in per-workflow. Clear documentation of cost tradeoffs.
- **Synthesis quality**: The synthesis model may not effectively merge three different architectural approaches. Mitigation: Use full ImplementationPlan.md format for all drafts to enable structured comparison; synthesis prompt explicitly instructs section-by-section comparison.
- **Latency**: Parallel plan generation adds wall-clock time. Mitigation: Plans are generated in parallel (not sequential), limiting added time to the synthesis step.
- **Model availability**: Configured models may be unavailable at runtime. Mitigation: Graceful fallback — proceed with available models if at least 2 remain.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/221
- Pattern reference: `paw-final-review` skill (existing multi-model implementation)
- Related: #212 (Multi-model Planning Documents Review), #201 (Society-of-Thought for Final Review)
- Research: Google "Society of Thought" paper (arXiv:2601.10825)
