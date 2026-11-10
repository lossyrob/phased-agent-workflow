# Procedure: Resume

Continue a work item that already has `.paw/work/<work-id>/WorkflowContext.md`. Never recreate the work directory, the branch, or an accepted artifact.

## 1. Locate

- The work directory is in this checkout, or on another branch: `git log --all --format=%D -1 -- .paw/work/<work-id>/WorkflowContext.md`; with `execution_mode: worktree`, in the worktree `git worktree list` shows on the target branch.
- Read `WorkflowContext.md`. Its configuration holds, plus any change the user states now.
- Note `git status --short`: those files are the user's uncommitted changes.
- Switch to the target branch, or work in its worktree, before anything that writes (`references/procedures/git.md`).

## 2. Rebuild the graph

If the todo store already holds this work item's todos, keep them. Otherwise create the todos exactly as SKILL.md's todo graph table defines them: same ids, only rows whose condition holds, same dependencies, `expand-plan` included. If `ImplementationPlan.md` exists, do `expand-plan` now: `implement:<unit>` per plan unit.

Mark a todo done only with its evidence present now:

| Todo | Evidence |
|------|----------|
| `setup` | `WorkflowContext.md`; target branch exists |
| `shape`, `specify`, `research`, `plan` | Its artifact exists, without placeholders, committed per lifecycle |
| `plan-review`, `final-review`, `review:<unit>` | Provider's evidence files in the output dir |
| `plan-checkpoint` | Implementation commits exist after the plan, or the user accepts now |
| `implement:<unit>` | Commits on the target branch deliver every deliverable the plan names for the unit, and its validation passes now |
| `final-pr` | `gh pr list --head <target-branch>` shows an open PR; finish it through the final PR procedure |

Anything partial stays open; its brief names the commits already made.

## 3. Continue

Tell the user in a few lines which todos you closed from evidence and what runs next, then work the graph. Do not redo a closed todo or re-plan unless the user asks; that is a rewind.
