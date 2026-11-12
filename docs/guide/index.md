# Getting Started

This guide gets you from installation to your first PAW pull request.

## Prerequisites

- A Git repository with a remote on GitHub
- The [GitHub CLI](https://cli.github.com/) (`gh`), authenticated. The workflow pushes the target branch and opens the final pull request with it.
- One of:
    - **GitHub Copilot CLI** — see [CLI Installation](cli-installation.md)
    - **VS Code 1.109 or newer** with GitHub Copilot — see [Quick Install (VS Code)](#quick-install-vs-code)

!!! note "Runtime support"
    PAW v2 has been verified on GitHub Copilot CLI. VS Code and Claude Code behaviour is described from their documentation and has not been run end to end. See [Known limits](../release-notes.md#known-limits).

## Quick Install (VS Code)

1. Download the latest `.vsix` from the [Releases page](https://github.com/lossyrob/phased-agent-workflow/releases).
2. Install it: Command Palette → `Extensions: Install from VSIX...`, or `code --install-extension paw-workflow-X.X.X.vsix`.
3. Reload VS Code if the PAW agents do not appear in Copilot Chat.

The VS Code extension also installs the PAW agents and adds the commands below. See [VS Code Extension](vscode-extension.md).

## Start a Work Item

### Copilot CLI

```bash
copilot --agent PAW
```

Then describe the task, or give an issue URL. Name a preset or setting in the same message if you want one:

```
Implement https://github.com/org/repo/issues/42
paw this with thorough, plan checkpoint on
```

You can also ask any Copilot CLI session to "paw this"; it loads the `paw-workflow` skill.

### VS Code

1. Command Palette → **PAW: New PAW Workflow**.
2. Answer the prompts: issue URL (optional), execution mode, branch name, preset, plan checkpoint, artifact lifecycle. See [VS Code Extension](vscode-extension.md#paw-new-paw-workflow).
3. A PAW chat opens with your choices. If you gave no issue URL, describe the task there.

You can also select the **PAW** agent in Copilot Chat, or use `/paw`, and describe the task.

## What Happens

1. **Setup** — PAW derives a work id, resolves the configuration, creates the target branch (or a worktree), and writes `.paw/work/<work-id>/WorkflowContext.md`.
2. **Todo graph** — PAW creates one todo per configured activity before any other work: plan, reviews, implementation units, final PR.
3. **Activities** — Specify (optional), research (optional), plan, implement and review each run in a subagent. PAW checks each result against git and the files on disk before closing the todo.
4. **Final PR** — PAW pushes the target branch and opens one pull request to the base branch.

With the default `standard` preset, PAW runs from task to pull request without stopping, unless it needs a decision from you. Turn on the [plan checkpoint](two-workflows.md#plan-checkpoint) to review the plan before implementation starts.

## Check Status

- **VS Code**: Command Palette → **PAW: Get Work Status**, then pick a work item or auto-detect.
- **Any runtime**: ask the PAW agent "what's the status of `<work-id>`?", "list my work items", or "what presets are available?". This loads the `paw-status` skill, which is read-only unless you ask it to post an update.

## Next Steps

- [Workflows](two-workflows.md) — The implementation workflow and PAW Review
- [Configuration and Presets](workflow-presets.md) — Presets, fields and review providers
- [Migrating from v1](migration.md) — What changed if you used PAW before v2
