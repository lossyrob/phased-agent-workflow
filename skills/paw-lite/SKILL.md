---
name: paw-lite
description: Lightweight PAW workflow skill. Optional work shaping → plan → parallel fleet-style implementation → configurable review (single-model, multi-model, or SoT) → PR. Uses SQL todos for coordination and delegates to paw-work-shaping, paw-sot, paw-git-operations, and paw-pr.
---

# PAW Lite

> **Execution Context**: This skill runs **directly** in the calling agent's session (not a subagent), preserving interactivity for work shaping Q&A, planning decisions, and review discussion.

Prerequisite: `WorkflowContext.md` must exist (created by `paw-init` or manually).

## Workflow Stages

```
[Work Shaping] → [Plan] → [Planning Docs Review] → [Implement] → [Review] → [PR]
  (optional)     (light)   (optional)              (fleet-style) (configurable)
```

## Workflow Identity and Durable State

- If `Workflow Identity: paw-lite` and `## Control State` exist, use the lite control-state profile (items: `init`, `planning`, `planning-docs-review` (optional), `implementation`, `final-review`, `final-pr`; procedures: `procedure:planning-review` (optional), `procedure:final-review`)
- If `Workflow Identity` is absent but `Plan.md` exists without `ImplementationPlan.md`, enter read-only **legacy paw-lite compatibility mode** — report status only, STOP before mutation-affecting work until `Workflow Identity: paw-lite` is persisted
- Durable artifacts (`WorkflowContext.md`, `Plan.md`, `reviews/planning/`, `reviews/FINAL-REVIEW.md`) win over SQL; rebuild SQL from them on resume
- When `## Control State` exists, apply the reconciliation-on-read preamble from the control-state contract (drift check + `reconcile:<work-id>` SQL todo) on every skill load and at every stage boundary below.

### SQL Mirroring

- Activity-level IDs: `lite:<work-id>:{planning,planning-docs-review,implementation,final-review,final-pr}` — rebuild at every stage boundary, not only during implementation. Include `planning-docs-review` only when `Planning Docs Review: enabled`.
- Work-item IDs: `lite-task:<work-id>:<slug>` — mirror durable checkboxes in `Plan.md`
- Reconcile-on-read todo: `reconcile:<work-id>` — seeded by `paw-init`, kept `pending` until reconciliation proves `current`
- Create idempotently (`INSERT OR IGNORE`); rebuild from durable artifacts on resume

### Stage Boundary Gate

Apply this gate at every stage transition (2→2.5, 2.5→3, 2→3 when planning docs review is disabled, 3→4, 4→5) before entering the next stage or loading any downstream skill:

1. **Rebuild activity mirror**: Ensure `lite:<work-id>:*` todos exist in SQL with statuses matching the embedded `## Control State`. Include or omit `planning-docs-review` per configuration. Never trust prior-turn memory for these rows.
2. **Reconcile**: Run the reconciliation-on-read check (same semantics as `paw-transition` Step 4). Compare each activity item to live evidence — `Plan.md` checkboxes, `reviews/planning/` (when enabled), `reviews/FINAL-REVIEW.md` (when enabled), target-branch commits, and any external state the stage requires.
3. **Block on drift**: If any prior activity item is non-terminal, or if reconciliation cannot prove live state, STOP and report the specific drift. Do not auto-correct embedded state; do not proceed into the next stage.
4. **Advance**: Only after the check passes, set the next activity's embedded status to `in_progress`, update the matching `lite:*` SQL mirror row, and re-open `reconcile:<work-id>` (pending) so the next skill load must re-verify before mutation.

**Pre-dispatch discipline (subagent-heavy stages)**: Running the gate is main-session discipline. If you will dispatch `task` subagents for the upcoming stage (Stage 3 fleet, multi-model Stage 4, SoT Stage 4), run the gate and update the activity mirror **in-session before dispatch**. Subagents do not inherit gate discipline, skill loads, or control-state context. Include the expected post-task mirror update in the subagent's prompt (e.g., "on completion, report: `lite:<work-id>:implementation`=resolved") and apply those updates yourself when the subagent returns.

At Stage 5 specifically: the gate must pass before the instruction "Load `paw-pr`" executes. Do not perform stop-tracking, `git rm`, `git push origin <target>`, or `gh pr create` from this skill or inline — the gate proves prerequisites, and `paw-pr` + `paw-git-operations` perform the scoped mutations. Direct remote-affecting commands from a paw-lite session are a contract violation.

### Summarization and Checkpoint Protocol

When this session summarizes, checkpoints, or hands off to a resuming agent, include the entire `## Control State` section from `WorkflowContext.md` verbatim, plus current `reconcile:<work-id>` and `lite:<work-id>:*` todo rows. Omitting them makes resume unsafe: the resumed agent will fall back to prose progress notes and bypass reconciliation-on-read.

### Halt on Unknown Activity

If the user requests a stage, review, or activity with no matching item in this profile (e.g., "run spec review in paw-lite"), STOP and report the mismatch. Do not improvise a slot. Offer the closest supported activity or recommend re-initializing with a different identity/configuration.

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

### Stage 2.5: Planning Docs Review (optional)

**When to run**: `Planning Docs Review: enabled` in `WorkflowContext.md`. Otherwise skip directly from Stage 2 to Stage 3.

**Before entering Stage 2.5**: Run the Stage Boundary Gate (2→2.5). Block if `planning` is non-terminal.

**How**: Load `paw-planning-docs-review` and follow its instructions. The skill runs against `Plan.md` (the lite planning artifact) using the configured `Planning Review Mode` (`single-model` | `multi-model` | `society-of-thought`). Review artifacts land in `.paw/work/<work-id>/reviews/planning/`.

**After review**:
- If the verdict is blocking, update `Plan.md` (return to Stage 2) and re-run Stage 2.5 until non-blocking.
- Mark `planning-docs-review` resolved and `procedure:planning-review` resolved only when the configured mode completed successfully.

**Before entering Stage 3**: Run the Stage Boundary Gate (2.5→3).

### Stage 3: Implement (Fleet-Style)

Implement the plan using parallel task subagents for independent work items.

**Before entering Stage 3**: Run the Stage Boundary Gate. Block if planning is not terminal, or if `Planning Docs Review: enabled` and `planning-docs-review` is not terminal, or if reconciliation cannot prove `Plan.md` matches embedded state.

**Getting started**:
1. If control state is active, mark `implementation` in progress (gate has already reconciled)
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

**Before entering Stage 4**: Run the Stage Boundary Gate (3→4). Block if implementation is non-terminal, `lite-task:` todos are not all `done`, or reconciliation cannot prove branch/commit state matches embedded `implementation: resolved`.

- If `Final Agent Review` is `disabled`, skip to Stage 5 (still run Gate 4→5 before proceeding)

**Review modes**: `single-model` (self-review), `multi-model` (multiple model subagents), `society-of-thought` (load `paw-sot` with review context from `WorkflowContext.md`)

**Durable review output**:
- Write `reviews/FINAL-REVIEW.md` when final review is enabled (mode, verdict, summary, unresolved findings)
- If review-driven fixes change the diff, update `FINAL-REVIEW.md` before resolving
- If control state is active, resolve `final-review` only after the configured procedure ran successfully

### Stage 5: PR

**Before entering Stage 5**: Run the Stage Boundary Gate (4→5). Block if `final-review` is non-terminal (when enabled), `reviews/FINAL-REVIEW.md` is missing (when enabled), or any `lite-task:` todo is unresolved. The gate — not `paw-pr` alone — is the chokepoint that forces Stage 5 onto the supported path.

Before invoking `paw-pr`, confirm all `lite-task:` todos are done and `## Open Questions` is empty/`None`.

If control state is active, update `final-pr` status accordingly. Load `paw-pr` for final PR creation. Do not run `git rm`, stop-tracking, or any artifact cleanup from this skill — that is `paw-pr`'s and `paw-git-operations`' responsibility under their own control-state gates.

## Artifact Structure

```
.paw/work/<work-id>/
├── WorkflowContext.md       # Workflow configuration and lite control state
├── WorkShaping.md           # Optional: from Stage 1
├── Plan.md                  # Durable lite plan and work-item checklist
└── reviews/
    ├── planning/            # Optional: Stage 2.5 planning docs review artifacts
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
