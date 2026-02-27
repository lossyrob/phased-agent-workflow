# Planning Review SoT Support

## Overview

Extends the `paw-planning-docs-review` skill with a third execution mode — society-of-thought (SoT) — enabling specialist-persona analysis of planning artifacts before implementation begins. When configured, the SoT engine (`paw-sot`) orchestrates specialist personas to review the Spec.md + ImplementationPlan.md + CodeResearch.md bundle through diverse cognitive strategies and optional perspective overlays.

This also adds 5 new configuration fields to `paw-init` for controlling SoT behavior in planning review, mirroring the final review's SoT configuration pattern.

## Architecture and Design

### How It Works

The planning docs review now has three execution paths in Step 4:

1. **single-model** — Direct review with session model (unchanged)
2. **multi-model** — Parallel subagent reviews with synthesis (unchanged)
3. **society-of-thought** — Delegates to `paw-sot` engine with `type: artifacts`

The SoT path constructs a review context that maps WorkflowContext fields to the `paw-sot` input contract. The key difference from final review's SoT integration is the review type: `artifacts` (not `diff`), which triggers a planning-appropriate preamble in the SoT engine.

### Design Decisions

**`type: artifacts` vs `type: diff`**: Planning docs review examines design documents, not code changes. The SoT engine's `artifacts` preamble frames specialists for design/planning analysis ("gaps in reasoning, missing edge cases, feasibility risks") rather than code review ("bugs, security issues, performance problems").

**4-dimensional smart heuristic**: The SoT smart mode classification extends the final review's 3-column heuristic (confidence × grounding × severity) with a 4th column — Affected Artifact (spec | plan | both). This is unique to planning review because findings route to different skills (paw-spec vs paw-planning). Single-artifact HIGH+Direct findings auto-route; multi-artifact findings always pause for user routing.

**Moderator mode after re-review**: Placed at Step 6.5 (after the re-review cycle) rather than between resolution and re-review, because moderator insights are advisory and should not trigger additional revision cycles.

**Init-time validation**: `planning_review_mode: society-of-thought` requires `planning_docs_review: enabled`. If manually set to disabled post-init, the SoT config is stored but unused.

## User Guide

### Configuration

Set `planning_review_mode: society-of-thought` during PAW init. Additional SoT fields:

| Field | Default | Description |
|-------|---------|-------------|
| `planning_review_specialists` | `all` | Which specialists to invoke |
| `planning_review_interaction_mode` | `parallel` | `parallel` or `debate` |
| `planning_review_specialist_models` | `none` | Model assignment for specialists |
| `planning_review_perspectives` | `auto` | Perspective overlays to apply |
| `planning_review_perspective_cap` | `2` | Max perspectives per specialist |

When SoT is active, `planning_review_models` is ignored — use `planning_review_specialist_models` for model diversity.

### VS Code

VS Code does not support SoT mode. If configured, it degrades to single-model with an informational message.

## Testing

### How to Test

1. Initialize a PAW workflow with `planning_review_mode: society-of-thought`
2. Complete spec and planning stages
3. After plan-review passes, observe that planning docs review invokes `paw-sot` with `type: artifacts`
4. Verify specialist reviews appear in `.paw/work/<work-id>/reviews/planning/`
5. Verify smart mode classifies findings using the 4-dimensional heuristic
6. Verify moderator mode is offered after re-review (when interactive conditions met)

### Edge Cases

- Zero specialists after discovery → paw-sot engine falls back to built-in defaults
- All specialist reviews return no findings → clean pass
- Perspective auto-selection finds nothing relevant → baseline perspective used
- SoT in VS Code → degrades to single-model

## Limitations and Future Work

- Multi-model perspective support deferred to #269
- No integration tests yet (separate follow-up)
- Token budget: +44% to planning docs review skill (2455 → 3527 tokens)
