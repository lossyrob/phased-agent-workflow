---
name: paw-workflow
description: PAW implementation workflow. Takes a scoped task (issue, work item, or prompt) through planning, implementation, configured review, and a final pull request. Load when asked to implement a task with PAW, "paw this", or run the PAW workflow.
---

# PAW Workflow

You are the orchestrator. Your existing project and user instructions stay in force. Activities run in subagents; you track the workflow in your todo store, check every result, and own all external side effects.

Files referenced below live in `references/` next to this file. Read each one only when its step starts.

## Host rules

1. Build the complete todo graph before any other work.
2. Start any unblocked todo. Mark it in progress when you start it and done as soon as its evidence is in hand, before starting anything it blocks. Delegate activities with a brief; never do an activity's work yourself.
3. A subagent's return is a claim. Verify it against git and the files on disk before closing the todo.
4. Close a todo only with its evidence in hand. Cancel one only when the user tells you to: not because it seems redundant, slow, or already covered by an earlier activity.
5. A configured review runs as configured, through its named provider, or the workflow blocks.
6. Only you push, open pull requests, or change artifact tracking. Subagents commit locally.
7. Stop only when the graph is complete, a todo needs a user decision, a configured checkpoint is reached, or the user asks. Otherwise continue to the next unblocked todo.
8. Report final status from live `git` and PR state.
9. A request to be fast changes configuration only. Every rule here still holds, and every todo is still tracked.

## Setup

Do this directly. To continue an existing work item, follow `references/procedures/resume.md` instead.

1. Derive a work title and a work id (lowercase, hyphens) from the task. The work directory is `.paw/work/<work-id>/`; it must not already exist.
2. Resolve configuration as `references/configuration.md` describes.
3. Note uncommitted changes with `git status --short`. They belong to the user: never stage, commit, or revert them.
4. Create the target branch from the base branch; with `execution_mode: worktree`, in a new worktree per `references/procedures/git.md`.
5. Write `.paw/work/<work-id>/WorkflowContext.md` in the format `references/configuration.md` gives. It holds configuration only, never progress.
6. Collect the project and user instructions that apply to code changes and commits (instruction files, rules given to you in this session). They go into every brief.

## Todo graph

Create one todo per row whose condition holds, with the listed dependencies, in your dependency-aware todo store (Copilot CLI: `todos` and `todo_deps` SQL tables). If your store has no dependencies, keep this order and write `blocked by: <id>` in each item. Subagents never edit the store.

| Id | Condition | Blocked by | Evidence to close |
|----|-----------|------------|-------------------|
| `setup` | always | — | `WorkflowContext.md` exists; on target branch |
| `shape` | `shaping: on`, or `auto` and the task is vague | `setup` | `WorkShaping.md` the user confirmed |
| `specify` | `spec: on` | last of the above | Accepted `Spec.md`, committed per lifecycle |
| `research` | `research: dedicated` | last of the above | `CodeResearch.md`, committed per lifecycle |
| `plan` | always | last of the above | Accepted `ImplementationPlan.md`, committed per lifecycle |
| `plan-review` | `plan_review.mode` not `off` | `plan` | Provider's output in `reviews/planning/`; findings resolved |
| `plan-checkpoint` | `plan_checkpoint: on` | last of the above | User accepted the plan |
| `expand-plan` | always | last of the above | `implement:*` todos exist for every plan unit |
| `final-review` | `final_review.mode` not `off` | `expand-plan` | Provider's output in `reviews/`; findings resolved |
| `final-pr` | always | `final-review`, else `expand-plan` | PR URL from live state |

Write the configured provider block into each review todo's description.

**`shape`**: load the `paw-work-shaping` skill and run it here, with the user; it writes `WorkShaping.md` in the work directory.

**`expand-plan`**: when the plan is accepted, add `implement:<unit>` for each phase or work item with the dependencies the plan states, and make `final-review` (or `final-pr`) depend on all of them. With `phase_review: on`, add `review:<unit>` after each.

**During the run**:

- Review returns findings → add `revise:<target>` blocked by that review; the reviewed todo's successor waits on it.
- Return lists `candidates` → add `candidate:<slug>` and make `final-pr` depend on it. Resolve each by implementing it or by recording in the plan why it is deferred.
- Return is `blocked` or `needs-decision` → the todo stays open. Resolve it from the task, the plan, and the codebase if you can; ask the user only for a real decision.
- User asks to go back or to change accepted work (spec, plan, an implemented unit) → follow `references/procedures/rewind.md` before changing anything.

## Delegation

Start each activity as a general-purpose subagent with this brief. Do not paste artifact contents; subagents read from disk.

`specify` and `plan` always start in a mode that accepts follow-up messages, never a blocking call (Copilot CLI: `task` with `mode: "background"`, then `read_agent`; never `mode: "sync"`).

```text
Activity: <specify | research | plan | implement | review>
Brief file: <absolute path to references/activities/<activity>.md> — read it first and follow it.
Intent: <what the task is for>
Task source: <issue link or the prompt text>
Work context: work dir <path>, execution checkout <path>, target branch <branch>, base branch <branch>
Host instructions: <project and user rules that apply, verbatim>
Inputs: <artifact paths to read>
Constraints: <scope limits, decisions already made, what must not change>
Done when: <observable criteria>
Limits: work and commit only in the execution checkout, staging explicit file paths only; never `git add .`/`-A`/`commit -a`; never rewrite a commit (`--amend`, `rebase`, `reset`) — fix with a new commit; leave these uncommitted user files untouched: <list>; do not push, open PRs, change artifact tracking, edit todos, or load the paw-workflow skill.
Return: the return block defined in the brief file.
```

Send every revision of an artifact to the subagent that wrote it (Copilot CLI: `write_agent`), never to a new one. Only if your runtime has no follow-up, send the revision packet to a new subagent.

With two or more `planning.models`, start one plan subagent per model with that `model`, each writing `ImplementationPlan-<model>.md`; then send the first a follow-up to merge them into `ImplementationPlan.md`, and keep it for revisions.

Pass `implementation.model` as the `model` of each `implement` subagent. Run `implement:*` units one at a time unless the plan marks units as independent and `implementation.parallel` is `auto`; then run those in parallel.

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
| `specify`, `plan` | No placeholders or open blocking questions; covers the whole task (and every spec requirement, for `plan`); consistent with decisions made in this session |
| `research` | Claims carry `file:line` references |
| `implement` | Every deliverable the plan names for the unit exists with real content; the stated validation passed; commits follow the host instructions |
| `review` | The provider's evidence files exist in the output dir |

A failed check is a revision for the same subagent, not a closed todo.

## Reviews

When a review todo starts, read `references/review-providers.md` and run the provider named in the todo.

## Git and final PR

Read `references/procedures/git.md` before your first commit.

When `final-pr` is unblocked and every other todo is done, read `references/procedures/final-pr.md` and follow it. Create the pull request only through that procedure.

## Completion

Query the todo store for todos not marked done; close or resolve each before reporting. Report: PR URL from live state, what was built, validation run, review outcome, and anything deferred.
