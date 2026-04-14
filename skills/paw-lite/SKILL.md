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

- If `WorkflowContext.md` contains `Workflow Identity: paw-lite` and `## Control State`, use the lite control-state profile:
  - required items: `init`, `planning`, `implementation`, `final-review`, `final-pr`
  - configured procedures: `procedure:final-review`
- If `Workflow Identity` is absent, but `Plan.md` exists and `ImplementationPlan.md` does not, enter **legacy paw-lite compatibility mode**:
  - report lite artifact expectations as read-only compatibility only
  - explicitly say workflow identity is missing
  - STOP before mutation-affecting work until `Workflow Identity: paw-lite` is persisted
- Do not create or mutate standard PAW phase items, gate items, or planning-review items inside a paw-lite workflow.
- Durable artifacts win over SQL. If SQL disagrees with `WorkflowContext.md`, `Plan.md`, or `reviews/FINAL-REVIEW.md`, rebuild SQL from the durable artifacts.
- In legacy paw-lite compatibility mode, do not create SQL mirrors, modify workflow artifacts, mutate git state, or create PRs. Report the migration blocker and required fix instead.

### SQL Mirroring

- Use activity-level TODO IDs only for the lite workflow items:
  - `lite:<work-id>:planning`
  - `lite:<work-id>:implementation`
  - `lite:<work-id>:final-review`
  - `lite:<work-id>:final-pr`
- Use granular implementation work-item TODO IDs with a separate namespace: `lite-task:<work-id>:<slug>`.
- Create SQL rows idempotently (`INSERT OR IGNORE` / upsert behavior).
- On resume, recreate any missing `lite:` and `lite-task:` rows from control state and `Plan.md` before continuing.

### Stage 1: Work Shaping (optional)

**When to run**: User's request is vague, exploratory, or multi-faceted. Skip for clear bug fixes, well-defined tasks, or when the user says to skip.

**How**: Load the `paw-work-shaping` skill and follow its instructions. It produces `WorkShaping.md` in the work directory.

### Stage 2: Plan

Create `.paw/work/<work-id>/Plan.md`.

**Desired end states**:
- `Plan.md` contains these sections:
  - `## Approach Summary`
  - `## Work Items`
  - `## Key Decisions`
  - `## Open Questions`
- `## Work Items` uses durable checkboxes. These are the source of truth for lite implementation progress.
- Each work item is mirrored into SQL as a `lite-task:<work-id>:<slug>` todo plus any `todo_deps` needed for sequencing.
- If control state is active, mark `planning` in progress while planning, then resolve `planning` and leave `implementation` pending when the plan is ready.

**Guidance**:
- Structure work items to minimize dependencies and maximize parallel execution.
- If the task is simple enough for single-threaded implementation, skip fleet dispatch in Stage 3 and implement directly.
- `## Open Questions` must be explicit. Use `None` when there are no open questions.

### Stage 3: Implement (Fleet-Style)

Implement the plan using parallel task subagents for independent work items.

**Getting started**:
1. If control state is active, mark `implementation` in progress.
2. Rebuild or refresh `lite-task:<work-id>:<slug>` rows from `Plan.md` before dispatching work.
3. Query ready work-item todos with the `lite-task:` prefix only:
   ```sql
   SELECT * FROM todos
   WHERE status = 'pending'
     AND id LIKE 'lite-task:<work-id>:%'
     AND id NOT IN (
       SELECT td.todo_id
       FROM todo_deps td
       JOIN todos dep ON td.depends_on = dep.id
       WHERE dep.status != 'done'
     )
   ```
4. If multiple independent work items exist, dispatch them as parallel background `task` subagents.
5. If only one work item is ready, implement sequentially in the current session.

**Parallel execution rules**:
- Never dispatch just a single background subagent.
- Each subagent prompt must include the full task context and the exact `lite-task:` todo ID it owns.
- Subagents may update only their assigned `lite-task:` todo status; they must not mutate activity-level `lite:` rows.
- If `Implementation Model` in `WorkflowContext.md` is not `none`, pass it as the `model` parameter to each implementation subagent.
- After subagents complete, update `Plan.md` checkboxes to match the completed work and refresh SQL if needed.

**After implementation**:
- Verify no work-item todos remain incomplete:
  ```sql
  SELECT id, status FROM todos
  WHERE id LIKE 'lite-task:<work-id>:%' AND status != 'done'
  ```
- Run project verification per repository norms.
- Commit code using selective staging discipline (never `git add .`).
- Stage `.paw/` artifacts per the workflow's artifact lifecycle.
- If all work items are complete and control state is active, resolve `implementation` and set reconciliation current.

**Selective staging**: Follow `paw-git-operations` patterns for selective staging discipline and artifact lifecycle handling.

### Stage 4: Review (configurable)

Review the implementation before PR creation. Configuration comes from `WorkflowContext.md` fields `Final Agent Review`, `Final Review Mode`, and related settings.

- If `Final Agent Review` is `disabled`, and control state is active, keep `final-review` and `procedure:final-review` as `not_applicable` and skip directly to Stage 5.

**Review modes**:

| Mode | What happens |
|------|-------------|
| `single-model` | Agent reviews its own changes — check diff, verify tests, assess quality |
| `multi-model` | Delegate review to multiple models via `task` subagents with different models, then synthesize findings |
| `society-of-thought` | Load `paw-sot` and invoke it with review context from `WorkflowContext.md` |

**For SoT invocation**, provide:

| Field | Source |
|-------|--------|
| `type` | `diff` |
| `coordinates` | diff range against base branch |
| `output_dir` | `.paw/work/<work-id>/reviews/` |
| `specialists` | `WorkflowContext.md` `Final Review Specialists` |
| `interaction_mode` | `WorkflowContext.md` `Final Review Interaction Mode` |
| `interactive` | `WorkflowContext.md` `Final Review Interactive` |
| `specialist_models` | `WorkflowContext.md` `Final Review Specialist Models` |

**Durable review output**:
- Always write `.paw/work/<work-id>/reviews/FINAL-REVIEW.md` when final review is enabled, regardless of review mode.
- `FINAL-REVIEW.md` must capture at least: configured mode, procedure status, verdict, summary, and any unresolved findings.
- SoT may additionally produce `REVIEW-*.md` and `REVIEW-SYNTHESIS.md`.
- If review-driven fixes change the diff materially, update or rewrite `FINAL-REVIEW.md` before resolving the review activity.
- Unsupported runtime or mode combinations must be recorded as blocked; do not silently downgrade to a different review mode.
- If control state is active, mark `final-review` in progress while reviewing and resolve it only after the configured procedure ran successfully with a non-blocking outcome.

### Stage 5: PR

Before invoking `paw-pr`:
- confirm all `lite-task:<work-id>:` todos are complete
- confirm `## Open Questions` is empty or explicitly `None`
- if final review is enabled, confirm `reviews/FINAL-REVIEW.md` exists and reflects the current post-fix state

If control state is active, mark `final-pr` in progress before loading `paw-pr`. After successful PR creation, resolve `final-pr`. If PR creation is blocked or fails, record that state explicitly instead of silently proceeding.

Load the `paw-pr` skill and follow its instructions for final PR creation. It handles lite-aware pre-flight validation, artifact lifecycle, and PR description scaling.

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
