# Procedure: Rewind

Go back to an earlier activity, or change an accepted artifact or implemented unit, without rewriting history.

## 1. Preview

Before changing any file, commit, or todo, show the user:

- the target: the earliest todo whose output changes;
- the todos you will reopen: the target and every todo blocked by it, directly or transitively; `final-pr` too if a PR exists;
- the commits that stay in history, and how each affected one will be superseded: a new commit on top, or `git revert` for work the change removes.

Ask the user to confirm. If they decline or change the request, change nothing.

## 2. Apply

- Set each reopened todo to `pending`. Never delete a todo.
- Revise the target artifact through its activity with a revision packet; previous commit as the "last returned at" point.
- After a plan change, `expand-plan` adds `implement:<unit>` for new units.
- A reopened todo whose output the change does not affect closes again on its existing evidence, rechecked.
- Each reopened `implement:<unit>` brief names the unit's existing commits and what must change. The subagent makes new commits on top.
- No `reset`, `rebase`, `--amend`, `commit-tree`, `update-ref`, or force push. An existing PR is updated by pushing; never open a second one.

## 3. Continue

Work the graph. Every reopened todo needs fresh evidence to close.
