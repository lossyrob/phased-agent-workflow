<div align="center">
	<img src="./img/paw-logo.png" alt="PAW Logo" />
    <h1>Phased Agent Workflow (PAW)</h1>
    <h3>A Coding Agent Development Workflow</h3>
</div>

## Try It Now

```bash
npx @paw-workflow/cli install copilot
```

This installs PAW agents and skills to your [GitHub Copilot CLI](https://github.com/github/copilot-cli). Then start a workflow:

```bash
copilot --agent PAW          # Implementation workflow
copilot --agent PAW-Review   # PR review workflow
```

Or use `/agent` inside your session to switch agents.

**Requirements**: Node.js 18+ and [GitHub Copilot CLI](https://github.com/github/copilot-cli) installed.

---

## What is PAW?

**Phased Agent Workflow** (PAW) is a structured, multi-phase development practice that transforms feature ideas into production-ready code using AI coding agents with human oversight at critical decision points. PAW guides you from initial specification through research, planning, implementation, and documentation—with each phase producing durable artifacts that feed the next. By leveraging GitHub Pull Requests at every implementation step, PAW enables efficient human review and iteration on AI-generated code, helping you maintain high quality standards and avoid AI slop. Every phase is traceable, rewindable, and version-controlled, giving you the clarity to iterate intelligently and the confidence to restart from any layer when context drifts.

PAW uses a **skills-based architecture** where compact orchestrator agents delegate to specialized activity skills. This enables efficient token usage while maintaining comprehensive workflow capabilities.

## Two Platforms

PAW works with both **GitHub Copilot CLI** (terminal) and **VS Code** (GUI):

| Platform | Installation | Best For |
|----------|--------------|----------|
| **Copilot CLI** | `npx @paw-workflow/cli install copilot` | Terminal workflows, quick iteration |
| **VS Code Extension** | Download `.vsix` from [Releases](https://github.com/lossyrob/phased-agent-workflow/releases) | IDE integration, visual workflow |

Both platforms use the same PAW agents and skills—choose based on your preferred workflow.

---

## Implementation Workflow

The **PAW agent** orchestrates the implementation workflow by loading the `paw-workflow` skill and delegating to activity skills:

**Activity Skills:**

| Skill | Purpose |
|-------|---------|
| `paw-init` | Bootstrap workflow, create WorkflowContext.md |
| `paw-spec` | Create specifications from issues/briefs |
| `paw-spec-research` | Document current system behavior |
| `paw-code-research` | Map code areas and dependencies |
| `paw-planning` | Create phased implementation plans |
| `paw-implement` | Execute plan phases, make code changes |
| `paw-impl-review` | Review changes, add docs, open PRs |
| `paw-pr` | Open final PR to main |
| `paw-status` | Check progress, recommend next steps |

**Key benefits:**
- Single orchestrator agent (~4KB) + on-demand skill loading
- Intelligent routing based on user intent
- Flexible execution—skills adapt to delegation context
- Full workflow mode support (full/minimal/custom)

### Review Workflow

The **PAW Review** agent orchestrates the review workflow using `paw-review-workflow` skill.

**How it works:**

1. The **PAW Review** agent loads the `paw-review-workflow` skill
2. The workflow skill orchestrates activity skills via subagent execution
3. Complete review runs automatically through all three stages
4. Human reviews and submits the pending review at the end

**Three stages:**
1. **Understanding (R1)** - Analyzes PR changes, researches pre-change baseline, derives specification from implementation
2. **Evaluation (R2)** - Identifies system-wide impacts, breaking changes, and gaps across correctness/safety/testing/quality with Must/Should/Could categorization
3. **Feedback Generation (R3)** - Transforms findings into structured review comments with rationale, creates GitHub pending reviews (or manual posting instructions for non-GitHub contexts)

**Key benefits:**
- Automated workflow - no manual pauses between stages
- Understand before critiquing - research pre-change system behavior first
- Comprehensive findings - generate all issues, human filters based on context
- Evidence-based feedback - every finding includes file:line references and rationale
- Cross-repository support - review related PRs across multiple repositories together
- Full human control - nothing posted automatically, edit/delete comments before submitting

See [Review Workflow Documentation](docs/specification/review.md) for detailed usage guide.

### Characteristics

* **Layered, iterative flow** — each artifact feeds the next.
* **Rewindable** — any phase can restart cleanly if an upstream document is wrong or incomplete.
* **Transparent** — every output is text-based and version-controlled in Git.
* **Collaborative** — humans guide, agents execute and record progress.
* **Toolchain** — Git (GitHub or Azure DevOps), VS Code, GitHub Copilot Agent Mode, markdown artifacts.

## Two Workflows: Implementation and Review

PAW provides two complementary workflows:

### PAW Implementation Workflow

The core workflow for building features: turns GitHub Issues into production-ready code through structured phases (Specification → Research → Planning → Implementation → Documentation → Final PR). Each phase produces durable artifacts that feed the next, with human oversight at critical decision points.

**Use for**: Building new features, enhancements, refactors, and bug fixes.

### PAW Review Workflow

A structured three-stage process for thorough code review using a **skills-based architecture**: systematically understands PR changes, evaluates impacts and gaps, and generates comprehensive evidence-based feedback with full human control over what gets posted.

**Use for**: Reviewing any pull request—especially valuable for large or poorly-documented PRs.

**Invocation:** `/paw-review <PR-number-or-URL>`

**Three stages** (automated via skill orchestration):
1. **Understanding (R1)** - Analyzes PR metadata, researches pre-change baseline, and derives specification from implementation
2. **Evaluation (R2)** - Identifies system-wide impacts, breaking changes, and gaps across correctness/safety/testing/quality with Must/Should/Could categorization
3. **Feedback Generation (R3)** - Transforms findings into structured review comments with rationale, creates GitHub pending reviews (or manual posting instructions for non-GitHub contexts)

**Key benefits**:
- Automated workflow - no manual pauses between stages
- Understand before critiquing - research pre-change system behavior first
- Comprehensive findings - generate all issues, human filters based on context
- Evidence-based feedback - every finding includes file:line references and rationale
- Cross-repository support - review related PRs across multiple repositories together
- Full human control - nothing posted automatically, edit/delete comments before submitting

See [PAW Review Workflow Documentation](docs/specification/review.md) for detailed usage guide.

## Requirements

### For Copilot CLI (Recommended)

- Node.js 18.0.0 or later
- [GitHub Copilot CLI](https://docs.github.com/en/copilot/using-github-copilot/using-github-copilot-in-the-command-line)

### For VS Code Extension

- VS Code with GitHub Copilot
- One of the following platform integrations (authenticated and configured):
  - **GitHub** with GitHub MCP Tools
  - **Azure DevOps** with Azure DevOps MCP Tools

## Getting Started

### Using the CLI (Recommended)

```bash
# Install PAW to Copilot CLI
npx @paw-workflow/cli install copilot

# Manage your installation
npx @paw-workflow/cli list      # Show installed version
npx @paw-workflow/cli upgrade   # Check for updates
npx @paw-workflow/cli uninstall # Remove PAW
```

Files are installed to:
- `~/.copilot/agents/` - Agent files
- `~/.copilot/skills/` - Skill directories

Then use PAW in any `copilot` session:
```bash
copilot
# Use /agent to select PAW or PAW Review
```

### Using VS Code Extension

1. **Download** the latest `.vsix` from the [Releases page](https://github.com/lossyrob/phased-agent-workflow/releases)
2. **Install** in VS Code: `Extensions: Install from VSIX...` from the Command Palette ([detailed instructions](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix))
3. **Configure MCP Server** (Recommended): Set up the [GitHub MCP Server](https://github.com/github/github-mcp-server) or [Azure DevOps MCP Server](https://github.com/microsoft/azure-devops-mcp) in VS Code for optimal agent integration
4. **Open** the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type `PAW` to see available commands
5. **Start new work** with `PAW: New PAW Workflow`
6. **Get help** anytime with `PAW: Get Work Status`

For manual agent installation, copy the `agents/` folder contents to VS Code's global prompts directory:
- **Windows**: `%APPDATA%\Code\User\prompts`
- **macOS**: `~/Library/Application Support/Code/User/prompts`
- **Linux**: `~/.config/Code/User/prompts`

Follow the workflow as described below and detailed in the [PAW Specification](paw-specification.md).

### VS Code Extension Features

The **PAW Workflow Extension** automates PAW agent installation and work item initialization.

- **Automatic agent installation**: PAW agents install to VS Code prompts directory on first activation and appear in GitHub Copilot Chat
- **New PAW Workflow command**: One command to create complete `.paw/work/<feature-slug>/` directory structure
  - Creates `.paw/work/<feature-slug>/` with WorkflowContext.md
  - Creates and checks out git branch
  - Opens WorkflowContext.md for immediate editing
  - Navigate stages using simple commands; prompt files generated on-demand when customization needed

**Usage:**

1. Open a git repository in VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "PAW: New PAW Workflow"
4. Enter issue or work item URL (optional - press Enter to skip)
5. Enter branch name (optional - press Enter to auto-derive from issue or description)
6. Watch as your workflow structure is created automatically

**Workflow Status:** At any time, run "PAW: Get Work Status" to check progress and get next-step recommendations.

**Artifact Tracking:** PAW commits workflow artifacts to git by default. Select "Don't Track" at initialization, or run "PAW: Stop Tracking Artifacts" mid-workflow to exclude artifacts from commits.

**Customization:** Use VS Code's standard `copilot-instructions.md` (project-level) or `AGENTS.md` files rather than PAW-specific instructions.

**Requirements:** Git repository and GitHub Copilot extension installed and active.

The extension streamlines initialization but is not required—you can create the directory structure manually following the [PAW Specification](paw-specification.md).

**Uninstalling:** After uninstalling the extension, use the configure agents UI in GitHub Copilot Chat to remove the PAW agents.

## Workflow Modes

PAW supports three workflow modes to match your task scope:

- **Full Mode**: All stages (Spec → Research → Planning → Implementation → Final PR). Supports both PRs strategy (intermediate reviews) and Local strategy (single branch).
- **Minimal Mode**: Core stages only (Code Research → Implementation → Final PR). Uses Local strategy.
- **Custom Mode**: User-defined stages and strategy.

Mode and strategy are set in `WorkflowContext.md` during initialization. See the [PAW Specification](paw-specification.md#workflow-modes) for details.

## Review Policy

PAW supports different review policies controlling when the workflow pauses for human input:

- **always**: Pause after every artifact
- **milestones**: Pause at Spec.md, ImplementationPlan.md, Phase PR completion, and Final PR
- **planning-only**: Pause at Spec.md, ImplementationPlan.md, and Final PR only (requires Local strategy)
- **never**: Auto-proceed unless blocked

Say `continue` to proceed after any pause, or make changes to the current artifact before continuing.

## Workflow

### Stage 1: Specification

The Spec skill translates an issue or brief into a measurable `Spec.md` with user stories, requirements, and success criteria. The Spec Research skill captures system-behavior facts in `SpecResearch.md` so downstream stages start with shared context.

### Stage 2: Planning

The Code Research skill maps relevant code areas and dependencies into `CodeResearch.md`. The Planning skill then creates a phased `ImplementationPlan.md` breaking work into reviewable increments.

### Stage 3: Implementation

The Implementation skill executes each phase, making code changes and running checks. The Implementation Review skill reviews changes, adds documentation, and (with PRs strategy) opens Phase PRs for human review before merging to the target branch.

### Stage 4: Final PR

The PR skill performs pre-flight checks, crafts the final PR description with links to artifacts and testing evidence, and creates the PR to main.

## Credits

Inspired by Dex Horthy's "Advanced Context Engineering for Coding Agents" [talk](https://youtu.be/IS_y40zY-hc?si=27dVJV7LlYDh7woA) and [writeup](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md). Original agent prompts adapted from HumanLayer's [Claude subagents and commands](https://github.com/humanlayer/humanlayer/tree/main/.claude).

Specification structure and checklist concepts were further informed by ideas from the open-source Spec Kit project (GitHub `github/spec-kit`), whose emphasis on prioritized user stories, explicit clarification markers, measurable success criteria, and structured quality checklists influenced the current spec workflow adaptation.

