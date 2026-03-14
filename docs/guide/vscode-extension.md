# VS Code Extension

The PAW VS Code extension automates workflow initialization and provides quick access to workflow status. This guide covers the extension's features, commands, and configuration options.

## Commands

### PAW: New PAW Workflow

Creates a complete PAW workflow structure with all necessary files and directories.

**How to use:**

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type **"PAW: New PAW Workflow"**
3. Follow the prompts:
     - **Issue URL** (optional): GitHub Issue or Azure DevOps Work Item URL
     - **Execution mode**: Current Checkout or Dedicated Worktree
     - **Branch name**: Optional auto-derive in Current Checkout mode, explicit in Dedicated Worktree mode
     - **Worktree strategy** (Dedicated Worktree only): Create New Worktree or Reuse Existing Worktree
     - **Workflow mode**: Full, Minimal, or Custom
     - **Review strategy**: PRs or Local (Minimal enforces Local)
     - **Review policy**: Every Stage, Milestones, Planning-Only, or Final PR Only
     - **Session policy**: Per-Stage or Continuous
     - **Artifact lifecycle**: Commit & Clean (default), Commit & Persist, or Never Commit
     - **Final Agent Review**: Enabled or Disabled, then interaction mode if enabled

**What gets created:**

```
.paw/work/<feature-slug>/
  WorkflowContext.md    # Workflow parameters and configuration
```

The workflow directory is created in the **execution checkout**. In Current Checkout mode this is the open workspace. In Dedicated Worktree mode it is the created or reused worktree.

The extension:

- Normalizes your branch name into a valid feature slug
- Handles slug conflicts (prompts for alternatives if directory exists)
- Creates and checks out the target branch in the execution checkout
- Opens `WorkflowContext.md` for review
- In Dedicated Worktree mode, creates or validates a separate worktree, opens that folder in a new VS Code window, and starts the PAW chat there without changing the caller checkout

### PAW: Get Work Status

Provides a comprehensive status report of your current workflow progress.

**How to use:**

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type **"PAW: Get Work Status"**
3. Select from:
    - **Auto-detect from context**: Uses current file or git branch
    - **Specific work item**: Choose from list sorted by most recent activity

**What you get:**

The Status Agent analyzes your workflow and reports:

- Completed artifacts (Spec.md, ImplementationPlan.md, etc.)
- Current phase progress in implementation
- Git branch status and divergence from target
- PR states with review comment analysis (if PRs strategy)
- Actionable next steps

### PAW: Stop Tracking Artifacts

Switches a workflow's artifact lifecycle to `never-commit`, removing artifacts from git while keeping local copies. This is a mid-workflow escape hatch—note that `commit-and-clean` workflows handle cleanup automatically at PR time.

**How to use:**

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type **"PAW: Stop Tracking Artifacts"**
3. Select your work item from the list
4. An agent session opens and executes the git commands

**What happens:**

- Artifacts are untracked from git index (files remain locally)
- A `.gitignore` file is created in the workflow directory
- WorkflowContext.md `Artifact Lifecycle` field is updated to `never-commit`
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

### Custom Prompts Directory

By default, PAW installs agents to the VS Code-standard prompts directory for your platform:

- **Windows**: `%APPDATA%\Code\User\prompts\`
- **macOS**: `~/Library/Application Support/Code/User/prompts/`
- **Linux**: `~/.config/Code/User/prompts/`

To use a custom location, set the `paw.promptDirectory` setting:

```json
{
  "paw.promptDirectory": "/path/to/custom/prompts"
}
```

!!! note "VS Code Variants"
    PAW automatically detects VS Code variants (Insiders, Code-OSS, VSCodium) and uses their appropriate configuration directories.

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

When you install the PAW extension, all PAW agents are automatically installed to your VS Code prompts directory. The extension handles:

- **Fresh installations**: All agents installed on first activation
- **Upgrades**: Old agents removed, new agents installed
- **Downgrades**: Version detection ensures correct agents for extension version
- **Repairs**: Missing agent files are automatically restored

!!! info "Agent Discovery"
    After installation, you may need to reload VS Code for GitHub Copilot to discover the new agents. If agents don't appear in Copilot Chat, try reloading the window (`Ctrl+Shift+P` → "Developer: Reload Window").

## Troubleshooting

### Extension Not Loading

If PAW commands don't appear in Command Palette:

1. Check the Extensions panel for installation status
2. Look for errors in the **PAW Workflow** output channel
3. Try reloading VS Code

### Agents Not Appearing in Copilot

If PAW agents don't show up in GitHub Copilot Chat:

1. Verify agents were installed: Check your prompts directory for `*.agent.md` files
2. Reload VS Code: `Ctrl+Shift+P` → "Developer: Reload Window"
3. Check Copilot is active and signed in

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

PAW stores only portable execution metadata in `WorkflowContext.md`. The machine-specific worktree path stays in VS Code local state, so moving or deleting a worktree outside PAW requires reopening or re-initializing it.

### WSL (Windows Subsystem for Linux)

When using VS Code with WSL:

- **Prompts directory**: The extension resolves the Windows-side path automatically (`/mnt/c/Users/<username>/AppData/Roaming/Code/User/prompts/`)
- **File permissions**: Ensure the WSL user has write access to the Windows prompts directory
- **Git operations**: Git runs in the WSL environment; ensure git is installed in WSL

If agents aren't found, verify the prompts directory exists:

```bash
ls /mnt/c/Users/$USER/AppData/Roaming/Code/User/prompts/
```
