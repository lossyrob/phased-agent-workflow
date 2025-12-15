# Getting Started

This guide will help you get up and running with **Phased Agent Workflow (PAW)** in just a few minutes.

## Prerequisites

Before you begin, ensure you have:

- **VS Code** with GitHub Copilot installed and active
- **Git repository** for your project
- One of the following platform integrations (authenticated and configured):
    - **GitHub** with GitHub MCP Tools
    - **Azure DevOps** with Azure DevOps MCP Tools

## Quick Install

1. **Download** the latest `.vsix` from the [Releases page](https://github.com/lossyrob/phased-agent-workflow/releases)

2. **Install** in VS Code using one of these methods:
    - Command Palette: `Extensions: Install from VSIX...`
    - Command line: `code --install-extension paw-workflow-X.X.X.vsix`

3. **Configure MCP Server** (Recommended): Set up the [GitHub MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/github) or [Azure DevOps MCP Server](https://github.com/microsoft/azure-devops-mcp-server) in VS Code for optimal agent integration. See the [MCP Server Setup Guide](https://modelcontextprotocol.io/quickstart/user) for configuration instructions.

## Starting Your First Workflow

### Create a New PAW Workflow

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type **"PAW: New PAW Workflow"**
3. Select the **workflow type** (Implementation or Cross-Repository)
4. (Cross-Repository only) Select a **storage root folder** for `.paw/multi-work/` artifacts
5. (Cross-Repository only) Select affected repositories from the detected git repos
6. Enter the issue or work item URL (optional—press Enter to skip)
7. Enter a branch name (optional—press Enter to auto-derive from issue or description)
8. Select your workflow mode, review strategy, and handoff mode

PAW will create your workflow structure automatically:

```
.paw/work/<feature-slug>/
  WorkflowContext.md    # Your workflow parameters
```

For Cross-Repository workflows, the coordinator structure is created under your selected storage root:

```
<storage-root>/.paw/multi-work/<feature-slug>/
  CrossRepoContext.md   # Cross-repo workflow parameters
```

### Check Workflow Status

At any time during a workflow:

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type **"PAW: Get Work Status"**
3. Select your work item or choose "Auto-detect from context"

The Status Agent will analyze your progress and provide actionable next-step recommendations.

## Workflow Overview

PAW guides you through structured phases:

1. **Specification** — Turn rough ideas into testable requirements
2. **Research** — Understand the codebase and system behavior
3. **Planning** — Create detailed implementation plans
4. **Implementation** — Execute plans with automated verification
5. **Documentation** — Generate comprehensive docs
6. **Final PR** — Open the pull request to main

Each phase produces durable artifacts that feed the next, ensuring nothing falls through the cracks.

## Next Steps

- [Workflow Modes](workflow-modes.md) — Learn about Full, Minimal, and Custom modes
- [Workflows](two-workflows.md) — Understand Implementation vs Cross-Repository vs Review workflows
- [Specification](../specification/index.md) — Deep dive into the PAW specification
