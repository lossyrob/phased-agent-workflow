# Migrating from v1

PAW v2 replaces the multi-skill implementation workflow with one workflow skill, `paw-workflow`. The agent you talk to orchestrates; activities run in subagents; a todo graph built at the start tracks every required step. PAW and PAW Lite become one configurable workflow with three presets, and every run ends in one pull request.

This page lists what changed for you. For how v2 works, see [Workflows](two-workflows.md) and [Configuration and Presets](workflow-presets.md).

## What You Do Differently

| v1 | v2 |
|----|----|
| Pick a workflow mode, review strategy, review policy and session policy | Pick a preset (`lite`, `standard`, `thorough`), and optionally turn on the plan checkpoint |
| Choose PAW or PAW Lite | Choose a preset; `paw-lite` loads the `lite` preset |
| Type `continue` or ask for the next stage | Nothing: the workflow runs to the final PR unless it needs a decision or reaches the plan checkpoint |
| Review planning, phase and docs PRs | Review the one final PR (and the plan, if you turn on the checkpoint) |
| Start a new chat per stage (`per-stage` session policy) | One session; activities run in subagents. A new session resumes the work item from its evidence |
| Rewind resets the branch to an earlier commit | Rewind reopens todos and adds new commits; history is never rewritten |

## Removed Options

| Removed | Replacement |
|---------|-------------|
| Workflow mode `full` | `spec: on`, `research: dedicated` (or the `thorough` preset) |
| Workflow mode `minimal` | `spec: off`, `research: inline` (the default) |
| Workflow mode `custom` and custom instructions | Individual fields; free-text `instructions` |
| Review strategy `prs` / `local` | None. One final PR from the target branch |
| Review policy (`every-stage`, `milestones`, `planning-only`, `final-pr-only`) and handoff mode | `plan_checkpoint: on` or `off` |
| Session policy (`per-stage`, `continuous`) | None |
| Final Agent Review `enabled`/`disabled`, Final Review Mode and its fields | `final_review` provider block; `mode: off` disables it |
| Planning Docs Review and the Planning Review fields | `plan_review` provider block; `mode: off` disables it |
| `*Interactive` (`true`, `false`, `smart`) for implementation reviews | None. Findings are applied without asking; trade-offs and product decisions come to you as a decision |
| Plan Generation Mode `multi-model` and Plan Generation Models | `planning.models` with two or more models |
| Implementation Model | `implementation.model` |
| Repository Identity, Execution Binding, Remote, Artifact Paths, Additional Inputs | Dropped |

`execution_mode` and `artifact_lifecycle` keep their values. New fields: `shaping`, `implementation.phases`, `implementation.parallel`, `phase_review`.

User presets in `~/.paw/presets/` must use the new field names; v1 field names are reported as unknown and PAW asks before continuing.

### Presets

| v1 preset | v2 preset |
|-----------|-----------|
| `quick` | `lite` |
| `standard` | `standard` (different settings: see below) |
| `thorough` | `thorough` |
| `auto` | `standard` |
| `auto-full` | `thorough` |
| `shaping-full` | `thorough` with `shaping: on` |
| `team` | `standard`; PR-per-phase review no longer exists |
| `paw-lite` (name) | `lite` |

Old names keep working; PAW tells you which preset it used.

## Behaviour Differences

- **One pull request.** No `_plan`, `_phase<N>` or `_docs` branches or PRs. Every commit is made on the target branch.
- **Runs unattended by default.** The `standard` preset has no human pause. Use `plan_checkpoint: on` to review the plan before implementation.
- **Plan review is a provider.** v1 Planning Docs Review becomes `plan_review`, on by default as `single-model` (`thorough`: society-of-thought). Its output is in `reviews/planning/`.
- **Final review defaults to multi-model** in `standard`; `lite` uses single-model.
- **Phase review is off by default.** The host checks after each unit that every deliverable the plan names exists and its validation passed. `phase_review: on` (or `thorough`) adds a single-model review per unit.
- **Configured reviews cannot be skipped.** If a configured provider (for example `paw-sot`) cannot run, the workflow blocks and tells you; it does not substitute another review.
- **Rewind never rewrites history.** It previews what it will reopen, waits for your confirmation, and supersedes commits with new commits or `git revert`.
- **`WorkflowContext.md` holds configuration only.** Progress is in the todo graph and in git.
- **One plan file.** `ImplementationPlan.md` for every preset; PAW Lite's `Plan.md` is gone for new work. The plan has units instead of a phase-status checklist, and phase candidates become todos instead of plan checkboxes.
- **`Spec.md` and `CodeResearch.md` are optional** (per configuration). `SpecResearch.md` and `Docs.md` are not produced unless the plan calls for them.

## In-flight v1 Work Items

Continue a v1 work item as you would any other: ask the PAW agent to continue it by work id or branch.

1. PAW recognises a v1 `WorkflowContext.md` (no `## Configuration` block), switches to the target branch, and converts the file once to the v2 format, using the table above. `Review Policy` or `Handoff Mode` becomes `plan_checkpoint: off` for `final-pr-only`, `never` and `auto`, and `on` otherwise. `Workflow Mode: custom` turns on `spec` or dedicated `research` only if `Spec.md` or `CodeResearch.md` exists. Shaping is off. The preset is recorded as `none (v1)`.
2. It commits the converted file per the artifact lifecycle and tells you the mapped configuration, that the run ends in one PR, and which settings were dropped.
3. It rebuilds the todo graph and closes todos only where evidence exists now. The plan is used as it is: `ImplementationPlan.md` (its `## Phase N:` sections are the units) or PAW Lite's `Plan.md`. Unchecked `## Phase Candidates` items become candidate todos.

PAW stops and asks before continuing when a v1 field has a value it cannot map, or when work on `<target>_plan`, `<target>_phase*` or `<target>_docs` branches is not on the target branch, or PRs from those branches are open. It lists them and does not merge, close or reuse them without your decision.

## Removed Skills and Tools

These v1 skills are deleted. The npm CLI installer removes them when you upgrade (see [Upgrading](#upgrading)).

| Removed | Replaced by |
|---------|-------------|
| `paw-init` | Setup and configuration in `paw-workflow` |
| `paw-transition` | The todo graph |
| `paw-spec`, `paw-spec-research`, `paw-spec-review` | The specify activity brief |
| `paw-code-research` | The research activity brief |
| `paw-planning`, `paw-plan-review`, `paw-planning-docs-review` | The plan activity brief and `plan_review` |
| `paw-implement`, `paw-impl-review` | The implement activity brief and host acceptance (plus optional `phase_review`) |
| `paw-final-review` | `final_review` and the review activity brief |
| `paw-pr`, `paw-git-operations` | The final PR and git procedures in `paw-workflow` |

Kept: `paw-workflow` (rewritten), `paw-lite` and `paw-rewind` (now short aliases), `paw-status` (rewritten for v2), `paw-work-shaping`, `paw-sot`, `paw-docs-guidance`, `paw-review-response`, and the PAW Review skills.

VS Code: the `paw_new_session` tool is removed. **PAW: New PAW Workflow** no longer asks for workflow mode, review strategy, review policy, session policy or final agent review; it asks for preset and plan checkpoint. The other prompts (issue URL, execution mode, branch, worktree, artifact lifecycle) are unchanged.

## PAW Review

PAW Review keeps its stages, artifacts, pending-review default and authorization rules. Internally it now uses a todo graph, one subagent per stage with the shared return contract, and host-only posting. Differences you may notice:

- `PAW-Review` is a thin wrapper that loads `paw-review-workflow`.
- Review configuration is a provider block in `ReviewContext.md`. Only `single-model` and `society-of-thought` are available; other modes are reported and PAW asks.
- `ReviewContext.md` no longer carries a stage checklist.
- Your checkout is not moved: baseline research reads the base commit without checking it out.

## Upgrading

- **Copilot CLI plugin:** `copilot plugin marketplace update paw-workflow`, then `copilot plugin update paw-workflow`.
- **npm CLI:** `npx @paw-workflow/cli upgrade`, or `npx @paw-workflow/cli install copilot --force`. The installer removes files the previous version installed and v2 no longer ships.
- **VS Code:** install the new `.vsix` and reload the window.

If you copied v1 skills into a project or a skills directory yourself, remove them; a stale `paw-transition` or `paw-pr` skill on the skill path can be loaded alongside v2.
