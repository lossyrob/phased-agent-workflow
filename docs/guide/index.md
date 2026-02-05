# Getting Started

This guide will help you get up and running with **Phased Agent Workflow (PAW)** in just a few minutes.

## Prerequisites

- **Git repository** for your project
- One of:
    - [GitHub Copilot CLI](https://github.com/github/copilot-cli) + Node.js 18+
    - VS Code with GitHub Copilot

## Installation

### Option 1: Copilot CLI (Recommended)

```bash
npx @paw-workflow/cli install copilot
```

Then start a workflow:

```bash
copilot --agent PAW
```

### Option 2: VS Code Extension

1. **Download** the latest `.vsix` from the [Releases page](https://github.com/lossyrob/phased-agent-workflow/releases)
2. **Install** via Command Palette: `Extensions: Install from VSIX...`
3. Run `PAW: New PAW Workflow` to start

Both options use the same PAW agents and skills—choose based on your preferred interface.

## Starting Your First Workflow

### With Copilot CLI

```bash
copilot --agent PAW
# Then tell PAW what you want to build, e.g.:
# "Start a new workflow for adding user authentication"
```

### With VS Code

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type **"PAW: New PAW Workflow"**
3. Enter the issue URL or description
4. Select your workflow mode

PAW will create your workflow structure:

```
.paw/work/<feature-slug>/
  WorkflowContext.md    # Your workflow parameters
```

## Workflow Overview

PAW guides you through structured stages:

1. **Specification** — Turn ideas into testable requirements
2. **Research** — Understand the codebase and system behavior
3. **Planning** — Create phased implementation plans
4. **Implementation** — Execute plans with optional PR review at each phase

Each stage produces durable artifacts that accumulate context and feed the next.

## Next Steps

- [Workflow Modes](workflow-modes.md) — Learn about Full and Minimal modes
- [Two Workflows](two-workflows.md) — Understand Implementation vs Review workflows
- [CLI Installation](cli-installation.md) — Detailed CLI setup and management
