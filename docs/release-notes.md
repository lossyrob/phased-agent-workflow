# Release Notes

Per-release changelogs are published on [GitHub Releases](https://github.com/lossyrob/phased-agent-workflow/releases). This page summarises major versions and their breaking changes.

## PAW v2 (unreleased)

Tracking issue: [#322](https://github.com/lossyrob/phased-agent-workflow/issues/322). Design: [PAW v2 Design](specification/v2/design.md).

### Highlights

- **One workflow skill.** `paw-workflow` runs the implementation workflow. The agent you talk to is the host: it builds a todo graph of every configured step before starting, runs specify, research, plan, implement and review in subagents, checks each result against git and the files on disk, and owns every push and PR.
- **Presets instead of modes.** `lite`, `standard` (default) and `thorough`, plus user presets in `~/.paw/presets/`. One set of [configuration fields](guide/workflow-presets.md#fields) replaces about 40 v1 parameters.
- **Review providers.** Plan review and final review each take a provider block: `off`, `single-model`, `multi-model` or `society-of-thought`. Optional phase review after each unit.
- **One final pull request.** No planning, phase or docs PRs.
- **Optional plan checkpoint.** Pause to review and revise the plan before implementation; otherwise the workflow runs to the PR unattended.
- **Resume and rewind from evidence.** A new session rebuilds the todo graph from artifacts, commits and PR state. A rewind previews what it reopens and adds new commits; history is never rewritten.
- **PAW Review on the v2 contracts.** Todo graph, one subagent per stage with a shared return contract, host-only posting, configured society-of-thought review runs or blocks.
- **VS Code.** **PAW: New PAW Workflow** asks for preset and plan checkpoint; **PAW: Get Work Status** uses the rewritten `paw-status`.
- **CLI installer.** Install and upgrade remove files the previous version installed and the new version no longer ships.

### Breaking Changes

- Removed configuration: workflow mode, review strategy, review policy, handoff mode, session policy, final agent review and planning docs review switches, interactive modes for implementation reviews, plan generation mode. See [Removed options](guide/migration.md#removed-options).
- Removed: planning, phase and docs branches and PRs.
- Removed skills: `paw-init`, `paw-transition`, `paw-spec`, `paw-spec-research`, `paw-spec-review`, `paw-code-research`, `paw-planning`, `paw-plan-review`, `paw-planning-docs-review`, `paw-implement`, `paw-impl-review`, `paw-final-review`, `paw-pr`, `paw-git-operations`.
- Removed VS Code tool: `paw_new_session`.
- PAW Lite is the `lite` preset; `Plan.md` is replaced by `ImplementationPlan.md` for new work.
- Built-in presets changed: `quick`, `auto`, `auto-full`, `shaping-full` and `team` map to the new presets with a notice. User presets must use the new field names.
- `paw-rewind` no longer resets the branch.
- Defaults changed: final review is `multi-model` in `standard`; plan review is on (`single-model`); phase review is off.

### Migration

In-flight v1 work items can be resumed: PAW converts a v1 `WorkflowContext.md` once and asks before continuing if something cannot be mapped or if work is left on v1 PR branches. See [Migrating from v1](guide/migration.md).

### Known Limits

PAW v2's behavioural tests run on GitHub Copilot CLI 1.0.108 only. The rest is unverified:

- **VS Code and Claude Code**: behaviour is taken from their documentation; no PAW v2 run has been made on either. In VS Code's Local harness, subagents cannot receive follow-up messages (revisions go to a new subagent with the full revision packet), nested subagents are off by default, and the todo list has no dependencies. Multi-model and society-of-thought reviews have not been run in VS Code.
- **Context compaction**: whether the Copilot CLI todo store survives compaction is not tested (the test SDK cannot force compaction), nor is rebuilding the graph within the same session.
- **Untested paths**: stopping when a worktree cannot be proven mid-run; declining a rewind preview; PAW Review treating a pending review as terminal; parallel subagents with per-call models in VS Code; running the integration tests against Claude Code.
- **Pull requests in tests** are created through a stub `gh`, so the tests do not exercise a real `gh pr create`.
- **Final PR platform**: the final PR procedure uses the GitHub CLI (`gh`). Opening the final PR on Azure DevOps is not covered.

Details: [Runtime Capabilities](specification/v2/runtime-capabilities.md) and [Git coverage](specification/v2/invariants.md#git-coverage).
