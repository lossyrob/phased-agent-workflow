<div align="center">
	<img src="./img/paw-logo.png" alt="PAW Logo" />
    <h1>Phased Agent Workflow (PAW)</h1>
    <h3>Context-Driven Development for GitHub Copilot</h3>
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

**Phased Agent Workflow** (PAW) enables **Context-Driven Development**—a practice where AI agents build understanding through structured research and planning phases before writing code. Each phase produces durable artifacts (specs, research docs, implementation plans) that accumulate context and feed the next phase. By the time code is written, both agent and human share deep, documented understanding of what's being built and why.

PAW integrates with GitHub Pull Requests at every implementation step, enabling human review and iteration on AI-generated code. Every phase is traceable, rewindable, and version-controlled.

**Why context-driven?** AI agents work best when given clear, accumulated context rather than open-ended prompts. PAW's phased approach ensures agents have the specification, codebase understanding, and implementation plan they need before touching code—reducing hallucination, improving quality, and making the work auditable.

## Key Benefits

- **PR-integrated workflow** — Every implementation phase can create a PR for human review. Unlike local-only approaches, PAW fits into real team code review workflows.
- **Dedicated research phases** — Spec Research and Code Research skills build documented understanding of existing behavior and code before planning begins.
- **Rewindable at any layer** — Artifacts are checkpoints. If context drifts or requirements change, restart from spec, plan, or any phase.
- **AI-powered PR review** — The Review workflow analyzes PRs through understanding → evaluation → feedback stages, generating evidence-based comments.
- **Extensible skills architecture** — Compact orchestrator agents delegate to specialized skills. Add or customize skills for your workflow.

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

## Review Workflow

The **PAW Review** agent reviews pull requests through three automated stages:

1. **Understanding** - Analyzes PR changes, researches pre-change baseline
2. **Evaluation** - Identifies impacts, breaking changes, and gaps
3. **Feedback** - Generates structured review comments with rationale

Human reviews and submits the pending review at the end. See [Review Workflow Documentation](docs/specification/review.md) for details.

## Requirements

### For Copilot CLI (Recommended)

- Node.js 18.0.0 or later
- [GitHub Copilot CLI](https://github.com/github/copilot-cli)

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
2. **Install** in VS Code: `Extensions: Install from VSIX...` from the Command Palette
3. **Configure MCP Server** (Recommended): Set up the [GitHub MCP Server](https://github.com/github/github-mcp-server) or [Azure DevOps MCP Server](https://github.com/microsoft/azure-devops-mcp)
4. **Start new work** with `PAW: New PAW Workflow` command
5. **Check status** with `PAW: Get Work Status` command

The extension creates `.paw/work/<feature-slug>/` directories, manages git branches, and provides commands for workflow navigation. Use `copilot-instructions.md` or `AGENTS.md` for customization.

For manual installation without the extension, copy `agents/` to VS Code's prompts directory or follow the [PAW Specification](paw-specification.md).

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

