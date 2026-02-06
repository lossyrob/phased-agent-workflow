# Multi-model Planning Documents Review

## Overview

The Planning Documents Review is a holistic review gate that examines all planning artifacts (Spec.md, ImplementationPlan.md, CodeResearch.md) as a bundle after plan-review passes, before implementation begins. Unlike the existing individual review skills (spec-review, plan-review) that evaluate each artifact in isolation, this review catches cross-artifact consistency issues — requirements the plan interprets differently than the spec intended, assumptions that contradict code research findings, or scope drift between spec boundaries and plan exclusions.

The skill follows the same multi-model parallel review pattern established by Final Agent Review, adapted for planning documents: parallel model-specific reviews, synthesis of cross-artifact findings with consensus categorization, and interactive resolution that routes fixes back to the appropriate planning skill.

## Architecture and Design

### Workflow Position

```
spec → spec-review → code-research → planning → plan-review →
  [paw-planning-docs-review] (if enabled) →
    implementation (local strategy) or Planning PR (PRs strategy)
```

The review sits between iterative plan refinement (plan-review cycle) and commitment to implementation. This is the highest-leverage review point — errors caught here are cheapest to fix.

### Execution Model

- **Direct execution** in the PAW session (not a subagent), preserving user interactivity
- Routing is handled by the PAW agent (matching existing post-plan-review pattern), not the transition table
- `paw-transition` handles stage boundary enforcement and milestone pauses for the new gate

### Design Decisions

1. **New skill rather than extending paw-plan-review**: The existing plan-review is a single-model iterative fix loop for ImplementationPlan.md quality. The new skill is a multi-model holistic gate for cross-artifact consistency — fundamentally different purpose and execution model.

2. **PAW agent owns routing**: The existing post-plan-review routing lives in the PAW agent, not the transition table. The new gate follows this pattern — the PAW agent checks if Planning Docs Review is enabled and conditionally invokes it.

3. **Resolution routes to existing skills**: Rather than applying fixes directly, findings route to `paw-spec` (Revise Specification mode) or `paw-planning` (Plan Revision mode). Both already support revision context for targeted edits.

4. **2-cycle re-review limit**: After applying fixes, the review re-runs to verify consistency. To prevent infinite loops, findings that persist after 2 cycles are presented as informational and the workflow proceeds.

## User Guide

### Configuration

Four new WorkflowContext.md fields control the feature:

| Field | Default | Values |
|-------|---------|--------|
| Planning Docs Review | `enabled` (Full), `disabled` (Minimal) | `enabled`, `disabled` |
| Planning Review Mode | `multi-model` | `single-model`, `multi-model` |
| Planning Review Interactive | `true` | `true`, `false` |
| Planning Review Models | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated |

### Review Criteria

The review focuses on five cross-artifact criteria:

1. **Spec ↔ Plan Traceability** — Do all FRs map to phases? Do phases introduce unspecified work?
2. **Assumption Consistency** — Do spec assumptions hold given code research findings?
3. **Scope Coherence** — Does the plan's exclusions match spec's Out of Scope?
4. **Feasibility Validation** — Does code research support the plan's approach?
5. **Completeness** — Are there spec success criteria with no corresponding plan coverage?

### Interactive Resolution

Each finding is presented with resolution options:

- **apply-to-spec** — Invokes paw-spec with finding as revision context
- **apply-to-plan** — Invokes paw-planning with finding as revision context
- **apply-to-both** — Sequential: spec first, then plan
- **skip** — Records finding, no action
- **discuss** — Discuss with user, then apply or skip

### Review Artifacts

| Mode | Files |
|------|-------|
| single-model | `reviews/planning/REVIEW.md` |
| multi-model | `reviews/planning/REVIEW-{MODEL}.md` per model, `reviews/planning/REVIEW-SYNTHESIS.md` |

All artifacts are gitignored via the parent `reviews/.gitignore`.

## Integration Points

### Skills Modified

| Skill | Changes |
|-------|---------|
| `paw-init` | 4 new config fields with defaults |
| `paw-transition` | Stage boundary, milestone mapping, preflight checks, pause rules |
| `PAW.agent.md` | Mandatory transitions, stage boundaries, execution model, handoff messaging |
| `paw-status` | Stage progression, config detection, artifact discovery |
| `paw-workflow` | Activities table, directory structure, flow, execution model |

### Pause Behavior by Review Policy

| Policy | Pauses at Planning Docs Review? |
|--------|-------------------------------|
| `always` | Yes |
| `milestones` | Yes |
| `planning-only` | Yes |
| `never` | No |

## Limitations and Future Work

- **VS Code**: Only supports single-model mode (VS Code limitation applies to all multi-model review skills)
- **Renaming paw-plan-review**: The naming proximity between `paw-plan-review` and `paw-planning-docs-review` may cause confusion; a follow-up rename is tracked separately
- **Society-of-Thought**: Future evolution (#201) could add specialized reviewer perspectives for planning documents
- **Non-interactive mode**: Auto-apply is available but planning revisions generally benefit from human judgment
