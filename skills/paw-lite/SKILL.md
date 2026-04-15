---
name: paw-lite
description: Lightweight PAW workflow skill. Optional work shaping → plan → parallel fleet-style implementation → configurable review (single-model, multi-model, or SoT) → PR. Uses SQL todos for coordination and delegates to paw-work-shaping, paw-sot, paw-git-operations, and paw-pr.
---

# PAW Lite

> **Execution Context**: This skill runs **directly** in the calling agent's session (not a subagent), preserving interactivity for work shaping Q&A, planning decisions, and review discussion.

Prerequisite: `WorkflowContext.md` must exist (created by `paw-init` or manually).

## Workflow Stages

```
[Work Shaping] → [Plan] → [Implement] → [Review] → [PR]
  (optional)     (light)  (fleet-style) (configurable)
```

## Workflow Identity and Durable State

- If `Workflow Identity: paw-lite` and `## Control State` exist, use the lite control-state profile (items: `init`, `planning`, `implementation`, `final-review`, `final-pr`; procedure: `procedure:final-review`)
- If `Workflow Identity` is absent but `Plan.md` exists without `ImplementationPlan.md`, enter read-only **legacy paw-lite compatibility mode** — report status only, STOP before mutation-affecting work until `Workflow Identity: paw-lite` is persisted
- Durable artifacts (`WorkflowContext.md`, `Plan.md`, `reviews/FINAL-REVIEW.md`) win over SQL; rebuild SQL from them on resume

### SQL Mirroring

- Activity-level IDs: `lite:<work-id>:{planning,implementation,final-review,final-pr}`
- Work-item IDs: `lite-task:<work-id>:<slug>`
- Create idempotently (`INSERT OR IGNORE`); rebuild from durable artifacts on resume

### Stage 1: Work Shaping (optional)

**When to run**: User's request is vague, exploratory, or multi-faceted. Skip for clear bug fixes, well-defined tasks, or when the user says to skip.

**How**: Load the `paw-work-shaping` skill and follow its instructions. It produces `WorkShaping.md` in the work directory.

### Stage 2: Plan

Create `.paw/work/<work-id>/Plan.md`.

**Desired end states**:
- `Plan.md` has sections: `## Approach Summary`, `## Work Items`, `## Key Decisions`, `## Open Questions`
- `## Work Items` uses durable checkboxes — source of truth for lite progress
- Each work item mirrored into SQL as `lite-task:<work-id>:<slug>` todo
- If control state is active, update `planning` status accordingly

**Guidance**:
- Structure work items to minimize dependencies and maximize parallel execution.
- If the task is simple enough for single-threaded implementation, skip fleet dispatch in Stage 3 and implement directly.
- `## Open Questions` must be explicit. Use `None` when there are no open questions.

### Stage 3: Implement (Fleet-Style)

Implement the plan using parallel task subagents for independent work items.

**Getting started**:
1. If control state is active, mark `implementation` in progress
2. Rebuild `lite-task:` rows from `Plan.md` before dispatching
3. Query ready `lite-task:<work-id>:%` todos (pending, no unmet deps)
4. Multiple independent items → parallel background `task` subagents; single item → sequential

**Parallel execution rules**:
- Never dispatch a single background subagent — use sync for solo items
- Each subagent gets full task context and its `lite-task:` todo ID
- If `Implementation Model` is not `none`, pass it as the `model` parameter
- After completion, sync `Plan.md` checkboxes with SQL

**After implementation**:
- Verify all `lite-task:` todos are done
- Run project verification, commit with selective staging (never `git add .`)
- If control state is active, resolve `implementation`

**Selective staging**: Follow `paw-git-operations` patterns for selective staging discipline and artifact lifecycle handling.

### Stage 4: Review (configurable)

Review the implementation before PR creation. Configuration from `WorkflowContext.md` (`Final Agent Review`, `Final Review Mode`).

- If `Final Agent Review` is `disabled`, skip to Stage 5

**Review modes**: `single-model` (self-review), `multi-model` (multiple model subagents), `society-of-thought` (load `paw-sot` with review context from `WorkflowContext.md`)

**Durable review output**:
- Write `reviews/FINAL-REVIEW.md` when final review is enabled (mode, verdict, summary, unresolved findings)
- If review-driven fixes change the diff, update `FINAL-REVIEW.md` before resolving
- If control state is active, resolve `final-review` only after the configured procedure ran successfully

### Stage 5: PR

Before invoking `paw-pr`, confirm all `lite-task:` todos are done and `## Open Questions` is empty/`None`.

If control state is active, update `final-pr` status accordingly. Load `paw-pr` for final PR creation.

## Artifact Structure

```
.paw/work/<work-id>/
├── WorkflowContext.md       # Workflow configuration and lite control state
├── WorkShaping.md           # Optional: from Stage 1
├── Plan.md                  # Durable lite plan and work-item checklist
└── reviews/
    ├── FINAL-REVIEW.md      # Durable review result when final review is enabled
    ├── REVIEW-*.md          # Optional: per-specialist reviews
    └── REVIEW-SYNTHESIS.md  # Optional: synthesized findings
```

## Configuration

All configuration lives in `WorkflowContext.md`. PAW Lite defaults:

| Field | Default |
|-------|---------|
| Workflow Identity | `paw-lite` |
| Workflow Mode | `custom` |
| Review Strategy | `local` |
| Review Policy | `final-pr-only` |
| Implementation Model | `none` (session default) |
| Artifact Lifecycle | `commit-and-clean` |
