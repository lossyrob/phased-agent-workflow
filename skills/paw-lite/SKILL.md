---
name: paw-lite
description: Lightweight PAW workflow skill. Work shaping (optional) → plan → fleet-implement → configurable review → PR. Trusts frontier models for implementation decisions while keeping PAW's work shaping, review quality, git discipline, and artifact lifecycle.
---

# PAW Lite

> **Execution Context**: This skill runs **directly** in the calling agent's session (not a subagent), preserving interactivity for work shaping Q&A, planning decisions, and review discussion.

Lightweight workflow that keeps PAW's most valuable components — work shaping, SoT review, git discipline, artifact lifecycle — while replacing the rigid spec→plan→phased-implement pipeline with a flow that trusts frontier models to make implementation decisions in the moment.

Prerequisite: WorkflowContext.md must exist (created by `paw-init` or manually).

## Workflow Stages

```
[Work Shaping] → [Plan] → [Implement] → [Review] → [PR]
  (optional)     (light)  (fleet-style) (configurable)
```

### Stage 1: Work Shaping (optional)

**When to run**: User's request is vague, exploratory, or multi-faceted. Skip for clear bug fixes, well-defined tasks, or when the user says to skip.

**How**: Load the `paw-work-shaping` skill and follow its instructions. It produces `WorkShaping.md` in the work directory.

**Skip criteria**: User provides a clear brief, references a detailed issue, or explicitly requests skipping.

### Stage 2: Plan

Create a lightweight implementation plan. No rigid structure — let the model determine what's appropriate for the task.

**Desired end states**:
- A plan exists at `.paw/work/<work-id>/Plan.md`
- Plan includes: approach summary, work items, and any key decisions
- Todos reflected in SQL for fleet coordination:
  ```sql
  INSERT INTO todos (id, title, description, status) VALUES ...;
  INSERT INTO todo_deps (todo_id, depends_on) VALUES ...;  -- if any
  ```
- Plan committed per artifact lifecycle mode

**Guidance**:
- Keep plans light — approach and work items, not detailed code specifications
- Structure todos to minimize dependencies and maximize parallel execution
- If the task is simple enough for a single sequential implementation, skip fleet dispatch in Stage 3 and just implement directly

### Stage 3: Implement (Fleet-Style)

Implement the plan using parallel task subagents for independent work items.

**Getting started**:
1. Query ready todos: `SELECT * FROM todos WHERE status = 'pending' AND id NOT IN (SELECT todo_id FROM todo_deps td JOIN todos t ON td.depends_on = t.id WHERE t.status != 'done')`
2. If multiple independent todos exist, dispatch them as parallel background `task` subagents
3. If only one todo or all have dependencies, implement sequentially

**Parallel execution rules**:
- Dispatch independent todos simultaneously via background `task` subagents
- Never dispatch just a single background subagent — either use sync or dispatch multiple
- Each sub-agent prompt must include the full task context and instruction to update SQL: `UPDATE todos SET status = 'done' WHERE id = '<id>'`
- After sub-agents complete, validate work quality and check todo status in SQL

**After implementation**:
- Verify all todos are done: `SELECT id, status FROM todos WHERE status != 'done'`
- Run project verification (tests, lint, build) per repository norms
- Commit changes following selective staging discipline (never `git add .`)
- Stage `.paw/` files per artifact lifecycle mode from WorkflowContext.md

**Selective staging**: Follow `paw-git-operations` patterns:
1. Check `Artifact Lifecycle:` in WorkflowContext.md
2. `commit-and-clean` or `commit-and-persist`: stage all files including `.paw/`
3. `never-commit`: stage non-`.paw/` files only
4. Always verify branch before commit: `git branch --show-current`

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

Create a pull request from the target branch to the base branch.

**Pre-flight checks** (block on failures unless user overrides):
- All todos complete in SQL
- Target branch has implementation commits
- Branch up-to-date with base (from WorkflowContext.md, default `main`)
- No merge conflicts
- Build/tests pass (if applicable)

**Artifact lifecycle handling**:
- `commit-and-clean`: Remove `.paw/` from git index (`git rm --cached -r .paw/`), add `.paw/.gitignore` with `*`, commit deletions. Artifacts remain on disk but not in the PR.
- `commit-and-persist`: Include artifact links in PR description
- `never-commit`: Omit artifacts section from PR

**PR description**: Scale to change complexity:
- **Simple**: Title, summary, key changes
- **Complex**: Summary, changes by area, testing notes, breaking changes if any

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

All configuration lives in WorkflowContext.md. PAW Lite uses the same fields as full PAW but with lighter defaults:

| Field | PAW Lite Default | Notes |
|-------|-----------------|-------|
| Workflow Mode | `custom` | Always custom for PAW Lite |
| Review Strategy | `local` | No intermediate PRs |
| Review Policy | `final-pr-only` | Single review gate |
| Artifact Lifecycle | `commit-and-clean` | Visible during work, cleaned from PR |
