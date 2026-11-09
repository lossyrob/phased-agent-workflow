---
name: paw-workflow
description: PAW implementation workflow. Takes a scoped task (issue, work item, or prompt) through planning, implementation, configured review, and a final pull request. Load when asked to implement a task with PAW, "paw this", or run the PAW workflow.
---

# PAW Workflow

You are the orchestrator. Your existing project and user instructions stay in force. Activities run in subagents; you track the workflow in your todo store, check every result, and own all external side effects.

Files referenced below live in `references/` next to this file. Read each one only when its step starts.

## Host rules

1. Build the complete todo graph before any other work.
2. Start any unblocked todo. Delegate activities with a brief; never do an activity's work yourself.
3. A subagent's return is a claim. Verify it against git and the files on disk before closing the todo.
4. Close a todo only with its evidence in hand. Cancel one only when the user tells you to: not because it seems redundant, slow, or already covered by an earlier activity.
5. A configured review runs as configured, through its named provider, or the workflow blocks.
6. Only you push, open pull requests, or change artifact tracking. Subagents commit locally.
7. Stop only when the graph is complete, a todo needs a user decision, a configured checkpoint is reached, or the user asks. Otherwise continue to the next unblocked todo.
8. Report final status from live `git` and PR state.

## Setup

Do this directly.

1. Derive a work title and a work id (lowercase, hyphens) from the task. The work directory is `.paw/work/<work-id>/`; it must not already exist.
2. Resolve configuration: defaults below, then any settings the user stated.
3. Note uncommitted changes with `git status --short`. They belong to the user: never stage, commit, or revert them.
4. Create the target branch from the base branch.
5. Write `.paw/work/<work-id>/WorkflowContext.md` with the resolved configuration, task source, base branch, and target branch. It holds configuration only, never progress.
6. Collect the project and user instructions that apply to code changes and commits (instruction files, rules given to you in this session). They go into every brief.

| Setting | Values | Default |
|---------|--------|---------|
| `plan_review` | `off`, `single-model` | `single-model` |
| `plan_checkpoint` | `off`, `on` | `off` |
| `phase_review` | `off`, `on` | `off` |
| `final_review` | `off`, `single-model` | `single-model` |
| `artifact_lifecycle` | `commit-and-clean`, `commit-and-persist`, `never-commit` | `commit-and-clean` |

## Todo graph

Create one todo per row whose condition holds, with the listed dependencies, in your dependency-aware todo store (Copilot CLI: `todos` and `todo_deps` SQL tables). If your store has no dependencies, keep this order and write `blocked by: <id>` in each item. Subagents never edit the store.

| Id | Condition | Blocked by | Evidence to close |
|----|-----------|------------|-------------------|
| `setup` | always | — | `WorkflowContext.md` exists; on target branch |
| `plan` | always | `setup` | Accepted `ImplementationPlan.md`, committed per lifecycle |
| `plan-review` | `plan_review` not `off` | `plan` | `reviews/planning/REVIEW.md`; findings resolved |
| `plan-checkpoint` | `plan_checkpoint: on` | last of the above | User accepted the plan |
| `expand-plan` | always | last of the above | `implement:*` todos exist for every plan unit |
| `final-review` | `final_review` not `off` | `expand-plan` | `reviews/REVIEW.md`; findings resolved |
| `final-pr` | always | `final-review`, else `expand-plan` | PR URL from live state |

Write the configured provider into each review todo's description.

**`expand-plan`**: when the plan is accepted, add `implement:<unit>` for each phase or work item with the dependencies the plan states, and make `final-review` (or `final-pr`) depend on all of them. With `phase_review: on`, add `review:<unit>` after each.

**During the run**:

- Review returns findings → add `revise:<target>` blocked by that review; the reviewed todo's successor waits on it.
- Return lists `candidates` → add `candidate:<slug>` and make `final-pr` depend on it. Resolve each by implementing it or by recording in the plan why it is deferred.
- Return is `blocked` or `needs-decision` → the todo stays open. Resolve it from the task, the plan, and the codebase if you can; ask the user only for a real decision.

## Delegation

Start each activity as a general-purpose subagent with this brief. Do not paste artifact contents; subagents read from disk.

```text
Activity: <plan | implement | review>
Brief file: <absolute path to references/activities/<activity>.md> — read it first and follow it.
Intent: <what the task is for>
Task source: <issue link or the prompt text>
Work context: work dir <path>, target branch <branch>, base branch <branch>
Host instructions: <project and user rules that apply, verbatim>
Inputs: <artifact paths to read>
Constraints: <scope limits, decisions already made, what must not change>
Done when: <observable criteria>
Limits: commit locally with explicit file paths only; never `git add .`/`-A`/`commit -a`; leave these uncommitted user files untouched: <list>; do not push, open PRs, change artifact tracking, edit todos, or load the paw-workflow skill.
Return: the return block defined in the brief file.
```

Start `plan` so it can receive follow-up messages, and keep that subagent for every plan revision (Copilot CLI: `task` with `mode: "background"`, then `read_agent` and `write_agent`). If your runtime has no follow-up, send the revision packet to a new subagent.

Run `implement:*` units one at a time unless the plan marks units as independent; then run those in parallel.

### Revision packet

For every revision, send:

```text
Artifact: <path>, last returned at <commit or "uncommitted">
Requested change: <specific delta>
Accepted decisions so far: <cumulative list>
Constraints and intent: <restated>
Must not regress: <points corrected in earlier rounds>
```

Compare the result with the previous version before accepting it.

## Acceptance

Before closing a todo, check on disk:

| Activity | Check |
|----------|-------|
| Any | Listed artifacts exist and are non-empty; listed commits exist on the target branch (`git log`); `git status` shows no stray changes and the user's uncommitted files are still uncommitted |
| `plan` | No placeholders or open blocking questions; covers the whole task; consistent with decisions made in this session |
| `implement` | Every deliverable the plan names for the unit exists with real content; the stated validation passed; commits follow the host instructions |
| `review` | The review file exists in the configured location with a verdict |

A failed check is a revision for the same subagent, not a closed todo.

## Reviews

For `single-model` and for `review:<unit>`, delegate one `review` activity. Tell it the target (`plan`, `unit <unit>`, or `final`), the output path (`reviews/planning/REVIEW.md`, `reviews/<unit>/REVIEW.md`, or `reviews/REVIEW.md`), and the diff range: the unit's commits for `unit`, `<base>...<target>` for `final`.

Before the first review, create `.paw/work/<work-id>/reviews/.gitignore` containing `*`. Never stage it.

Resolve findings without asking the user:

- `must-fix` and `should-fix` → send to the subagent that produced the work (plan subagent, or an `implement` subagent) as a revision, then verify the fix.
- `consider` → apply if cheap and clearly right; otherwise note it for the PR description.
- A finding that needs a product decision → `needs-decision`; ask the user.

If the review had any `must-fix`, run the review again after the fixes.

## Git and final PR

Read `references/procedures/git.md` before your first commit.

When `final-pr` is unblocked and every other todo is done, read `references/procedures/final-pr.md` and follow it. Create the pull request only through that procedure.

## Completion

Confirm no todo is open. Report: PR URL from live state, what was built, validation run, review outcome, and anything deferred.
