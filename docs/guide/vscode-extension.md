# VS Code Extension

The PAW VS Code extension automates workflow initialization and provides quick access to workflow status. This guide covers the extension's features, commands, and configuration options.

## Commands

### PAW: New PAW Workflow

Starts a PAW work item with your choices and opens a PAW chat to run it.

**How to use:**

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type **"PAW: New PAW Workflow"**
3. Follow the prompts:
     - **Issue URL** (optional): GitHub Issue or Azure DevOps Work Item URL
     - **Execution mode**: Current Checkout or Dedicated Worktree (shown only when `paw.enableWorktreeExecution` is on)
     - **Branch name**: optional in Current Checkout mode (empty means PAW derives one), required in Dedicated Worktree mode
     - **Worktree strategy** (Dedicated Worktree only): Create New Worktree (with an optional path) or Reuse Existing Worktree
     - **Preset**: Standard (default), Lite, or Thorough
     - **Plan checkpoint**: Run to Final PR (default) or Pause to Review the Plan
     - **Artifact lifecycle**: Commit & Clean (default), Commit & Persist, or Never Commit

The extension opens a new chat with the **PAW** agent and passes these as `preset`, `target_branch`, `execution_mode`, `artifact_lifecycle`, `plan_checkpoint` and, if given, `task_source`. The agent then runs setup: it creates the target branch and writes `.paw/work/<work-id>/WorkflowContext.md`. If you gave no issue URL, describe the task in the chat.

Other settings (spec, research, review providers, models) are not prompted for. State them in the chat, or use a [user preset](workflow-presets.md#user-presets).

In Dedicated Worktree mode the extension creates or validates the worktree on the target branch, opens it in a new VS Code window, and starts the PAW chat there without changing the caller checkout.

### PAW: Get Work Status

Opens a PAW chat that loads the `paw-status` skill.

**How to use:**

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type **"PAW: Get Work Status"**
3. Select from:
    - **Auto-detect from context**: Uses current file or git branch
    - **Specific work item**: Choose from list sorted by most recent activity

**What you get:**

- Configuration from `WorkflowContext.md` (a v1 file is reported as written)
- Artifacts present, and which plan units commits on the target branch deliver
- Git state: current and target branch, uncommitted changes, commits ahead of or behind the remote
- The pull request for the target branch, its checks and unresolved review comments
- A recommended next step, usually to continue the work item with the PAW agent

The status check is read-only unless you ask it to post an update to the issue or PR.

### PAW: Stop Tracking Artifacts

Switches a work item's artifact lifecycle to `never-commit`, removing artifacts from git while keeping local copies. This is a mid-workflow escape hatch—note that `commit-and-clean` workflows handle cleanup automatically at PR time.

**How to use:**

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type **"PAW: Stop Tracking Artifacts"**
3. Select your work item from the list
4. An agent session opens and executes the git commands

**What happens:**

- Artifacts are untracked from git index (files remain locally)
- A local-only `.gitignore` file is created in the workflow directory and remains untracked
- `artifact_lifecycle` in `WorkflowContext.md` is set to `never-commit` (in a v1 file, the `Artifact Lifecycle` line)
- Future commits won't include workflow artifacts

**When to use:**

- Contributing to non-PAW repositories where artifacts may be unwanted
- Small changes where artifact overhead is disproportionate
- Mid-workflow decision to switch from `commit-and-persist` to local-only

**Cleanup recipe:** To remove old `.paw/work/` directories from `main` after merging `commit-and-persist` workflows:

> ⚠️ This permanently deletes `.paw/work/` files from both git history and your local filesystem.

```bash
git rm -r .paw/work/ && git commit -m "Remove PAW workflow artifacts"
```

## Configuration

### Custom Agent Directory

PAW requires **VS Code 1.109 or newer** for native prompt and skill contributions.

By default, PAW installs agents to the user agent directory for your platform:

- **Windows**: `%USERPROFILE%\\.copilot\\agents\\`
- **macOS**: `~/.copilot/agents/`
- **Linux**: `~/.copilot/agents/`
- **WSL**: `~/.copilot/agents/` inside the Linux home directory

To use a custom location, set the `paw.agentDirectory` setting:

```json
{
  "paw.agentDirectory": "/path/to/custom/agents"
}
```

!!! note "VS Code Variants"
    PAW still detects VS Code variants (Insiders, Code-OSS, VSCodium) when cleaning up legacy prompt-directory installs from older releases.

!!! note "Deprecated fallback"
    `paw.promptDirectory` is still honored as a backward-compatible fallback, but new configurations should use `paw.agentDirectory`.

### Dedicated Worktree Execution

The `paw.enableWorktreeExecution` setting controls whether the initialization flow offers Dedicated Worktree mode:

```json
{
  "paw.enableWorktreeExecution": true
}
```

- `true` (default): show the execution-mode picker with **Current Checkout** and **Dedicated Worktree**
- `false`: skip the picker and always initialize in the current checkout

## Output Channel

For detailed logging during workflow operations, check the **PAW Workflow** output channel:

1. Open Output panel (`Ctrl+Shift+U` / `Cmd+Shift+U`)
2. Select **PAW Workflow** from the dropdown

This is useful for:

- Troubleshooting initialization issues
- Seeing detailed progress during agent operations

## Agent Installation

When you install the PAW extension, all PAW agents are automatically installed to `~/.copilot/agents` (or your configured override). The extension handles:

- **Fresh installations**: All agents installed on first activation
- **Upgrades**: Old agents removed, new agents installed
- **Repairs**: Missing agent files are automatically restored
- **Migration cleanup**: Legacy `User/prompts` installs from older releases are removed during upgrade

Downgrading to a pre-migration release is **not yet validated end-to-end**. If you install an older PAW VSIX after using a release that installs agents into `~/.copilot/agents`, remove the PAW-managed files from `~/.copilot/agents` and reload VS Code if the older release does not behave correctly.

!!! info "Agent Discovery"
    After installation, you may need to reload VS Code for GitHub Copilot to discover the new agents. If agents don't appear in Copilot Chat, try reloading the window (`Ctrl+Shift+P` → "Developer: Reload Window").

## Prompt Files and Skills

PAW prompt files and skills are now contributed natively by the extension:

- **Prompt files** (`/paw`, `/paw-review`) are provided through `chatPromptFiles`
- **Skills** are provided through `chatSkills`

These assets are bundled with the extension and do not need separate on-disk installation.

## Troubleshooting

### Extension Not Loading

If PAW commands don't appear in Command Palette:

1. Check the Extensions panel for installation status
2. Look for errors in the **PAW Workflow** output channel
3. Try reloading VS Code

### Agents Not Appearing in Copilot

If PAW agents don't show up in GitHub Copilot Chat:

1. Verify agents were installed: Check your agent directory for `*.agent.md` files
2. Reload VS Code: `Ctrl+Shift+P` → "Developer: Reload Window"
3. Check Copilot is active and signed in
4. Confirm you're on VS Code 1.109 or newer

### Initialization Failures

If workflow initialization fails:

1. Ensure you're in a git repository
2. If using Dedicated Worktree mode, provide an explicit target branch and avoid choosing the branch already checked out in the caller workspace
3. For reuse or resume errors, run `git worktree list`, reopen the expected execution checkout, or re-initialize the workflow
4. Review the **PAW Workflow** output channel for detailed errors
5. Verify disk permissions for the `.paw/` directory and any configured worktree location

### Dedicated Worktree Recovery

Dedicated Worktree mode fails fast when PAW cannot prove it is running in the correct execution checkout. Common recovery steps:

1. Run `git worktree list` to identify the expected execution checkout
2. Reopen that worktree in VS Code if it still exists
3. If the worktree was removed manually, re-run initialization and create or reuse a valid worktree

`WorkflowContext.md` does not record the worktree path. The extension keeps it in VS Code local state, and a resumed session finds the worktree with `git worktree list`. Moving or deleting a worktree outside PAW requires reopening or re-initializing it.

### WSL (Windows Subsystem for Linux)

When using VS Code with WSL:

- **Agent directory**: PAW installs agents into the Linux-side home directory (`~/.copilot/agents/`)
- **Legacy cleanup**: Older prompt-directory installs are cleaned up from the Windows-side VS Code path when it can be resolved
- **File permissions**: Ensure the WSL user has write access to `~/.copilot/agents/`
- **Git operations**: Git runs in the WSL environment; ensure git is installed in WSL

If agents aren't found, verify the agent directory exists:

```bash
ls ~/.copilot/agents/
```
