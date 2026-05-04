---
name: paw-lite
description: Lightweight PAW workflow skill. Optional work shaping → plan → parallel fleet-style implementation → configurable review (single-model, multi-model, or SoT) → PR. Uses SQL todos for coordination and delegates to paw-work-shaping, paw-sot, paw-git-operations, and paw-pr.
---

# PAW Lite

> **Execution Context**: This skill runs **directly** in the calling agent's session (not a subagent), preserving interactivity for work shaping Q&A, planning decisions, and review discussion.

Prerequisite: WorkflowContext.md must exist (created by `paw-init` or manually).

## Configuration Contract

Read resolved WorkflowContext.md values before each stage boundary and treat them as active obligations. Defaults, presets, and explicit overrides are equally authoritative once written.

- WorkflowContext.md is durable configuration only; do not write runtime progress, boundary status, reconciliation markers, TODO mirrors, or SQL mirror data into it.
- `Planning Docs Review`, `Planning Review Mode`, `Final Agent Review`, `Final Review Mode`, `Review Policy`, `Artifact Lifecycle`, and model fields determine required procedures.
- Review Policy controls human pause points only. It does not disable configured planning docs review, configured final review, automated gates, or final PR handoff.

## Boundary Checkpoints

At each boundary, output a compact brief with: completed stage, next activity, required gate/procedure, configured value, incorrect shortcut, and next TODOs.

Boundary names: `plan->planning-docs-review`, `plan->implement`, `planning-docs-review->implement`, `implement->final-review`, `implement->final-pr`, `final-review->final-pr`.

Use SQL TODO categories:
- Boundary TODOs: `lite:<work-id>:boundary:<boundary-name>`
- Work-item TODOs: `lite:<work-id>:work:<slug>`

Filter readiness checks by category. Work-item completion checks must use `id LIKE 'lite:<work-id>:work:%'`; pending future boundary TODOs must not block implementation, review, or PR readiness. Boundary TODOs gate only their named checkpoint.

For deterministic resume/tests, if asked to evaluate a named boundary, produce that boundary brief and TODO guidance from existing artifacts and WorkflowContext.md without advancing unrelated stages.

## Workflow Stages

```
[Work Shaping] → [Plan] → [Planning Docs Review?] → [Implement] → [Review] → [PR]
  (optional)     (light)  (if enabled)              (fleet)       (config)
```

### Stage 1: Work Shaping (optional)

**When to run**: User's request is vague, exploratory, or multi-faceted. Skip for clear bug fixes, well-defined tasks, or when the user says to skip.

**How**: Load the `paw-work-shaping` skill and follow its instructions. It produces `WorkShaping.md` in the work directory.

### Stage 2: Plan

Create an implementation plan and save it to `.paw/work/<work-id>/Plan.md`.

**Desired end states**:
- Plan includes approach summary, work items, and key decisions
- Todos reflected in SQL for fleet coordination:
  ```sql
  INSERT INTO todos (id, title, description, status) VALUES ...;
  INSERT INTO todo_deps (todo_id, depends_on) VALUES ...;  -- if any
  ```
- Plan committed per artifact lifecycle mode

**Guidance**:
- Structure todos to minimize dependencies and maximize parallel execution
- Use `lite:<work-id>:work:<slug>` IDs for implementation work items
- If the task is simple enough for a single sequential implementation, skip fleet dispatch in Stage 3 and implement directly

**Boundary after planning**:
- If `Planning Docs Review: enabled`, output `plan->planning-docs-review`, create/maintain the planning review activity TODO and `lite:<work-id>:boundary:planning-docs-review->implement`, honor configured planning review mode/models, then load and execute `paw-planning-docs-review`. Skipping directly to implementation is incorrect.
- If `Planning Docs Review: disabled`, output `plan->implement`, create/maintain `lite:<work-id>:boundary:plan->implement`, and proceed to implementation with tracked work-item TODOs.

**After planning docs review**: Output `planning-docs-review->implement`. Blocking findings must be resolved before implementation; keep the implementation boundary TODO visible.

### Stage 3: Implement (Fleet-Style)

Implement the plan using parallel task subagents for independent work items.

**Getting started**:
1. Query ready work todos: `SELECT * FROM todos WHERE status = 'pending' AND id LIKE 'lite:<work-id>:work:%' AND id NOT IN (SELECT todo_id FROM todo_deps td JOIN todos t ON td.depends_on = t.id WHERE t.status != 'done')`
2. If multiple independent todos exist, dispatch them as parallel background `task` subagents
3. If only one todo or all have dependencies, implement sequentially

**Parallel execution rules**:
- Dispatch independent todos simultaneously via background `task` subagents
- Never dispatch just a single background subagent — either use sync or dispatch multiple
- Each sub-agent prompt must include the full task context and instruction to update SQL: `UPDATE todos SET status = 'done' WHERE id = '<id>'`
- If `Implementation Model` in WorkflowContext.md is not `none`, pass it as the `model` parameter to each task subagent
- After sub-agents complete, validate work quality and check todo status in SQL

**After implementation**:
- Verify work todos are done: `SELECT id, status FROM todos WHERE status != 'done' AND id LIKE 'lite:<work-id>:work:%'`
- Run project verification (tests, lint, build) per repository norms
- Commit changes following selective staging discipline (never `git add .`)
- Stage `.paw/` files per artifact lifecycle mode from WorkflowContext.md

**Selective staging**: Follow `paw-git-operations` patterns for selective staging discipline and artifact lifecycle handling.

### Stage 4: Review (configurable)

Review the implementation before PR creation. Configuration comes from WorkflowContext.md fields `Final Review Mode` and related settings.

**Review modes**:

| Mode | What happens |
|------|-------------|
| `single-model` | Agent reviews its own changes — check diff, verify tests, assess quality |
| `multi-model` | Delegate review to multiple models via `task` subagents with different models, synthesize findings |
| `society-of-thought` | Load `paw-sot` skill and invoke with review context from WorkflowContext.md |

**For SoT invocation**, provide the review context:

| Field | Source |
|-------|--------|
| `type` | `diff` |
| `coordinates` | diff range against base branch |
| `output_dir` | `.paw/work/<work-id>/reviews/` |
| `specialists` | WorkflowContext.md `Final Review Specialists` |
| `interaction_mode` | WorkflowContext.md `Final Review Interaction Mode` |
| `interactive` | WorkflowContext.md `Final Review Interactive` |
| `specialist_models` | WorkflowContext.md `Final Review Specialist Models` |

**After review**: Present findings to user. Apply fixes if straightforward, discuss trade-offs if not.

### Stage 5: PR

Load the `paw-pr` skill and follow its instructions for final PR creation. It handles pre-flight validation, artifact lifecycle (commit-and-clean scoping to the work directory), and PR description scaling.

Before invoking paw-pr, ensure implementation work todos are complete: `SELECT id, status FROM todos WHERE status != 'done' AND id LIKE 'lite:<work-id>:work:%'`

## Artifact Structure

```
.paw/work/<work-id>/
├── WorkflowContext.md      # Workflow configuration (from paw-init)
├── WorkShaping.md          # Optional: from Stage 1
├── Plan.md                 # From Stage 2
└── reviews/                # From Stage 4 (if SoT)
    ├── REVIEW-*.md         # Per-specialist reviews
    └── REVIEW-SYNTHESIS.md # Synthesized findings
```

## Configuration

All configuration lives in WorkflowContext.md. PAW Lite defaults:

| Field | Default |
|-------|---------|
| Workflow Mode | `custom` |
| Review Strategy | `local` |
| Review Policy | `final-pr-only` |
| Implementation Model | `none` (session default) |
| Artifact Lifecycle | `commit-and-clean` |
