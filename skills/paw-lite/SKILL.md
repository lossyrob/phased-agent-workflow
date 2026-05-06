---
name: paw-lite
description: Lightweight PAW workflow skill. Optional work shaping → plan → parallel fleet-style implementation → configurable review (single-model, multi-model, or SoT) → PR. Uses SQL todos for coordination and delegates to paw-work-shaping, paw-sot, paw-git-operations, and paw-pr.
---

# PAW Lite

> **Execution Context**: This skill runs **directly** in the calling agent's session (not a subagent), preserving interactivity for work shaping Q&A, planning decisions, and review discussion.

Prerequisite: WorkflowContext.md must exist (created by `paw-init` or manually).

## Configuration Contract

Read resolved WorkflowContext.md values before each stage boundary and treat them as active obligations. Defaults, presets, and explicit overrides are equally authoritative once written.

- WorkflowContext.md is durable configuration only. Do not add runtime progress, gate status, reconciliation markers, TODO mirrors, SQL mirror data, or other mutable workflow bookkeeping to this artifact during init or later updates.
- `Planning Docs Review`, `Planning Review Mode`, `Final Agent Review`, `Final Review Mode`, `Review Policy`, `Artifact Lifecycle`, and model fields determine required procedures.
- Review Policy controls human pause points only. It does not disable configured planning docs review, configured final review, automated gates, or final PR handoff.

## Boundary Checkpoints

At each boundary, output a compact brief with: completed stage, next activity, required gate/procedure, configured value, incorrect shortcut, and next TODOs.

Boundary names: `plan->planning-docs-review`, `plan->implement`, `planning-docs-review->implement`, `implement->final-review`, `implement->final-pr`, `final-review->final-pr`.

Use SQL TODO categories:
- Boundary TODOs: `lite:<work-id>:boundary:<boundary-name>`
- Work-item TODOs: `lite:<work-id>:work:<slug>`

Maintain boundary TODOs persistently. Upsert the next boundary as `pending`; when a checkpoint completes, mark its active boundary TODO `done` before creating the next one.
```sql
INSERT INTO todos (id, title, description, status)
VALUES ('lite:<work-id>:boundary:<boundary-name>', 'Boundary: <boundary-name>', '<brief>', 'pending')
ON CONFLICT(id) DO UPDATE SET title = excluded.title, description = excluded.description, status = excluded.status, updated_at = datetime('now');
UPDATE todos SET status = 'done', updated_at = datetime('now') WHERE id = 'lite:<work-id>:boundary:<completed-boundary-name>';
```

Filter readiness checks by category. Work-item completion checks must use `id LIKE 'lite:<work-id>:work:%'`; pending future boundary TODOs must not block implementation, review, or PR readiness. Boundary TODOs gate only their named checkpoint.
Work ID values are validated by `paw-init` before use; if a legacy WorkflowContext.md has an empty work ID or characters outside lowercase letters, numbers, and hyphens, STOP before running TODO readiness queries.
Pre-PR readiness fails closed: zero unfinished work TODOs is not enough. Require at least one completed `lite:<work-id>:work:%` TODO, or create and complete `lite:<work-id>:work:no-work-required` for doc-only/no-op work.

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
- Verify work existed or no-work was attested: `SELECT id FROM todos WHERE status = 'done' AND id LIKE 'lite:<work-id>:work:%' LIMIT 1`
- Run project verification (tests, lint, build) per repository norms
- Commit changes following selective staging discipline (never `git add .`)
- Stage `.paw/` files per artifact lifecycle mode from WorkflowContext.md

**Boundary after implementation**:
- If `Final Agent Review: enabled`, output `implement->final-review`, create/maintain `lite:<work-id>:boundary:implement->final-review`, then execute Stage 4. Final review is mandatory before final PR; honor configured `Final Review Mode`, models, specialists, and interaction settings. Ad-hoc substitutes are incorrect.
- If `Final Agent Review: disabled`, output `implement->final-pr`, create/maintain `lite:<work-id>:boundary:implement->final-pr`, intentionally skip Stage 4 by configuration, then hand off to Stage 5. Final PR still routes through `paw-pr`.

**Selective staging**: Follow `paw-git-operations` patterns for selective staging discipline and artifact lifecycle handling.

### Stage 4: Review (configurable)

Review the implementation before PR creation. Treat `Final Review Mode` and related WorkflowContext.md fields as the configured procedure; Review Policy does not make final review optional when `Final Agent Review: enabled`.

**Review modes**:

| Mode | What happens |
|------|-------------|
| `single-model` | Agent reviews its own changes — check diff, verify tests, assess quality |
| `multi-model` | Delegate to configured `Final Review Models` via `task` subagents, then synthesize findings |
| `society-of-thought` | Load `paw-sot` and invoke with configured specialists, interaction mode, specialist models, and perspectives |

For `society-of-thought`, generic self-review or ad-hoc single-model review is incorrect. Use the configured `paw-sot` path.

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

**After review**: Present findings to user. Apply fixes if straightforward, discuss trade-offs if not. Once findings are resolved or intentionally carried forward, output `final-review->final-pr`, create/maintain `lite:<work-id>:boundary:final-review->final-pr`, and hand off to Stage 5. Inline PR creation, inline `git push`, and inline stop-tracking/artifact cleanup are incorrect.

### Stage 5: PR

Load the `paw-pr` skill and follow its instructions for final PR creation. `paw-pr` owns pre-flight validation, artifact lifecycle detection, stop-tracking, push, PR creation, and PR description scaling.

Before invoking paw-pr, ensure implementation work todos are complete and work did not fail open: `SELECT id, status FROM todos WHERE status != 'done' AND id LIKE 'lite:<work-id>:work:%'` returns no rows, and `SELECT id FROM todos WHERE status = 'done' AND id LIKE 'lite:<work-id>:work:%' LIMIT 1` returns a completed work item or `lite:<work-id>:work:no-work-required`.

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
