<div align="center">
	<img src="./img/paw-logo.png" alt="PAW Logo" />
    <h1>Phased Agent Workflow (PAW)</h1>
    <h3>A Coding Agent Development Workflow</h3>
</div>

## Quickstart

1. **Download** the latest `.vsix` from the [Releases page](https://github.com/lossyrob/phased-agent-workflow/releases)
2. **Install** in VS Code: `Extensions: Install from VSIX...` from the Command Palette ([detailed instructions](https://code.visualstudio.com/docs/editor/extension-marketplace#_install-from-a-vsix))
3. **Configure MCP Server** (Recommended): Set up the [GitHub MCP Server](https://github.com/github/github-mcp-server) or [Azure DevOps MCP Server](https://github.com/microsoft/azure-devops-mcp-server) in VS Code for optimal agent integration with your platform. While PAW can fall back to GitHub CLI, the MCP servers provide significantly better functionality and reliability. See [MCP Server Setup Guide](https://modelcontextprotocol.io/quickstart/user) for configuration instructions.
4. **Open** the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and type `PAW` to see available commands
5. **Start new work** with `PAW: New PAW Workflow`
6. **Get help** anytime with `PAW: Get Work Status`

---

**Phased Agent Workflow** (PAW) is a structured, multi-phase development practice that transforms feature ideas into production-ready code using AI coding agents with human oversight at critical decision points. Built on GitHub Copilot Agent Mode in VS Code, PAW guides you from initial specification through research, planning, implementation, and documentation—with each phase producing durable artifacts that feed the next. By leveraging GitHub Pull Requests at every implementation step, PAW enables efficient human review and iteration on AI-generated code, helping you maintain high quality standards and avoid AI slop. Every phase is traceable, rewindable, and version-controlled, giving you the clarity to iterate intelligently and the confidence to restart from any layer when context drifts. PAW empowers engineers to deliver fast, high-quality contributions by focusing human attention on high-leverage decision points—refining specifications, reviewing implementation plans, and guiding code at critical junctures—while AI agents handle the systematic execution.

PAW is a system of *collaborating AI chat modes* that emulate the human software development lifecycle — each agent produces durable artifacts (specs, research docs, plans, PRs, and documentation).
The process emphasizes **clarity, traceability, and recoverability**, letting developers iterate intelligently and “rewind” if context or quality drift occurs.

### Implementation Workflow Agents

1. **Spec Agent** — turns a rough issue or work item into a refined feature specification and prompts for system research.
2. **Spec Research Agent** — documents how the current system behaves (facts only, no design).
3. **Code Research Agent** — maps relevant code areas and dependencies.
4. **Implementation Plan Agent** — writes a detailed, multi-phase plan of work.
5. **Implementation Agents** — executes plan phases, managing commits, PRs, and review loops. Split into two steps to allow agentic review and documentation improvements.
6. **Documenter Agent** — produces comprehensive technical documentation (`Docs.md`) that serves as the authoritative reference for understanding what was built, how it works, and how to use it. Updates project documentation according to project guidance.
7. **PR/Status Agent** — maintains issue/work item and PR descriptions, ensuring everything stays in sync and clear.

### Review Workflow Agents

1. **Understanding Agent (R1)** — analyzes PR changes, generates baseline research prompts, and derives specification from implementation
2. **Review Baseline Researcher** — documents how the system worked before changes by analyzing codebase at base commit
3. **Impact Analysis Agent (R2A)** — identifies integration points, breaking changes, and system-wide effects
4. **Gap Analysis Agent (R2B)** — systematically identifies issues across correctness, safety, testing, and quality with Must/Should/Could categorization
5. **Feedback Generation Agent (R3A)** — transforms findings into structured review comments with rationale, creates GitHub pending reviews
6. **Feedback Critic (R3B)** — critically assesses generated comments for usefulness and accuracy

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

A structured three-stage process for thorough code review: systematically understands PR changes, evaluates impacts and gaps, and generates comprehensive evidence-based feedback with full human control over what gets posted.

**Use for**: Reviewing any pull request—especially valuable for large or poorly-documented PRs.

**Three stages**:
1. **Understanding (R1)** - Analyzes PR metadata, generates baseline research prompts, and derives specification from implementation
2. **Evaluation (R2)** - Identifies system-wide impacts, breaking changes, and gaps across correctness/safety/testing/quality with Must/Should/Could categorization
3. **Feedback Generation (R3)** - Transforms findings into structured review comments with rationale, creates GitHub pending reviews (or manual posting instructions for non-GitHub contexts)

**Key benefits**:
- Understand before critiquing - research pre-change system behavior first
- Comprehensive findings - generate all issues, human filters based on context
- Evidence-based feedback - every finding includes file:line references and rationale
- Full human control - nothing posted automatically, edit/delete comments before submitting

See [PAW Review Workflow Documentation](.paw/work/paw-review/Docs.md) for detailed usage guide.

## Requirements

- VS Code with GitHub Copilot
- One of the following platform integrations (authenticated and configured):
  - **GitHub** with GitHub MCP Tools
  - **Azure DevOps** with Azure DevOps MCP Tools

## Getting Started

### Installing PAW Agents

PAW agents are automatically installed when you install the PAW Workflow VS Code extension (see below). Agents will appear in GitHub Copilot Chat after installation.

For manual installation, copy the `agents/` folder contents to VS Code's global prompts directory:
- **Windows**: `%APPDATA%\Code\User\prompts`
- **macOS**: `~/Library/Application Support/Code/User/prompts`
- **Linux**: `~/.config/Code/User/prompts`

Follow the workflow as described below and detailed in the [PAW Specification](paw-specification.md).

### VS Code Extension

The **PAW Workflow Extension** automates PAW agent installation and work item initialization.

#### Features

- **Automatic agent installation**: PAW agents install to VS Code prompts directory on first activation and appear in GitHub Copilot Chat
- **New PAW Workflow command**: One command to create complete `.paw/work/<feature-slug>/` directory structure
  - Creates `.paw/work/<feature-slug>/` with WorkflowContext.md
  - Creates and checks out git branch
  - Opens WorkflowContext.md for immediate editing
  - Navigate stages using simple commands; prompt files generated on-demand when customization needed
- **Custom instructions support**: Tailor the initialization workflow for your project

#### Installation

Download the latest `.vsix` file from [GitHub Releases](https://github.com/lossyrob/phased-agent-workflow/releases) and install it in VS Code via:
- `Extensions: Install from VSIX...` command, or
- `code --install-extension paw-workflow-0.0.1.vsix` from command line

#### Usage

1. Open a git repository in VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "PAW: New PAW Workflow"
4. Enter issue or work item URL (optional - press Enter to skip)
5. Enter branch name (optional - press Enter to auto-derive from issue or description)
6. Watch as your workflow structure is created automatically

#### Getting Workflow Status

At any time during a PAW workflow, you can check your progress and get guidance on next steps:

1. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type "PAW: Get Work Status"
3. Select a work item from the list (sorted by most recently modified) or choose "Auto-detect from context"
4. The Status Agent will analyze your workflow state and provide actionable next-step recommendations

#### Custom Instructions (Optional)

##### Workflow Initialization Instructions

You can tailor the initialization workflow for your project:

1. Create the directory and file:
   ```bash
   mkdir -p .paw/instructions
   touch .paw/instructions/init-instructions.md
   ```

2. Add your project-specific guidance using Markdown format:
   - Naming conventions for feature slugs and branches
   - Required metadata that must appear in `WorkflowContext.md`
   - Stage transition preferences and handoff mode defaults
   - Integration requirements (e.g., mandatory issue URLs)

When present, the extension injects these instructions into the agent prompt so GitHub Copilot follows both PAW defaults and your project rules. If the file is missing or empty, initialization proceeds with standard behavior.

##### Agent Behavior Customization

You can customize how PAW agents behave during workflows at both project and user levels:

**Project-level (workspace) instructions** (`.paw/instructions/<agent-name>-instructions.md`):
- Apply to all users working in the project
- Override user-level instructions when present
- Should be committed to version control for team-wide standards
- Example: `.paw/instructions/PAW-02B Impl Planner-instructions.md` for project planning conventions

**User-level instructions** (`~/.paw/instructions/<agent-name>-instructions.md`):
- Apply across all PAW workflows for a specific user
- Respected unless overridden by workspace instructions
- Personal preferences that follow you across projects
- Example: `~/.paw/instructions/PAW-01A Specification-instructions.md` for your spec format preferences

Agents call the `paw_get_context` tool at startup to retrieve custom instructions and workflow metadata dynamically. This enables workspace-aware agent behavior while keeping agent files globally installed and unchanged.

#### Requirements

- Git repository
- GitHub Copilot extension installed and active

The extension streamlines initialization but is not required—you can create the directory structure manually following the [PAW Specification](paw-specification.md).

#### Uninstalling the Extension

After uninstalling the extension, use the configure agents UI in GitHub Copilot Chat to remove the PAW agents.

## Workflow Modes

PAW supports three workflow modes—**Full**, **Minimal**, and **Custom**—to match your task scope and development style. Each mode determines which workflow stages are included and how work is reviewed (via intermediate PRs or locally on a single branch).

**Quick Overview:**
- **Full Mode**: All stages from Spec through Documentation. Supports both PRs (intermediate reviews) and Local (single branch) strategies.
- **Minimal Mode**: Core stages only (Code Research → Implementation → Final PR). Enforces Local strategy for simplicity.
- **Custom Mode**: User-defined stages and review strategy based on your specific workflow needs.

When using the VS Code extension's `PAW: New PAW Workflow` command, you'll select your workflow mode and review strategy during initialization. Your selections are stored in `WorkflowContext.md` and guide all agents throughout the workflow.

For detailed information about each mode, when to use them, and how review strategies work, see the [PAW Specification](paw-specification.md#workflow-modes).

## Workflow Handoffs

PAW supports intelligent stage navigation through three handoff modes—**Manual**, **Semi-Auto**, and **Auto**—to adapt to your experience level and the nature of your work.

### Handoff Modes

**Manual Mode** (Default)
- Full control over stage transitions
- Agents present next-step options at completion
- You explicitly command each transition
- Best for learning PAW or when you want to review and decide at each step

**Semi-Auto Mode**
- Thoughtful automation at research and review transitions
- Automatic handoffs at designated points (Spec → Research → Spec, Phase → Review)
- Pauses at key decision points (after Planning, before Implementation)
- Best for experienced users who want speed with control at critical moments

**Auto Mode**
- Full automation through all workflow stages
- Agents chain automatically with only tool approval interactions
- Requires local review strategy (incompatible with intermediate PRs)
- Best for routine work where you trust agents to complete the workflow

### Stage Transition Commands

After completing a stage, agents present contextual next-step options. Use simple commands to transition:

- `research` or `start research` → Move to Spec Research Agent
- `code` or `code research` → Move to Code Research Agent
- `plan` → Move to Implementation Plan Agent
- `implement Phase 2` → Start Implementation Agent for Phase 2
- `review` → Move to Implementation Review Agent
- `docs` → Move to Documenter Agent
- `pr` → Move to PR Agent
- `status` → Check workflow status

**Important:** Commands starting with specific keywords (like `feedback:`, `address comments`, `check pr`) are recognized as handoff triggers. Agents will transition to the appropriate stage rather than acting on the command themselves. For example, saying `feedback: add error handling` in local strategy hands off to the Implementation Agent instead of having the current agent make the change.

### The Continue Command

When agents complete their work, they present a handoff message with "Next Steps" listing available commands. Saying `continue` proceeds to the **first option** in that list (the recommended default action). The agent's guidance line explicitly states what `continue` will do:

```
You can ask me to generate a prompt file for the next stage, ask for 'status' or 'help', or say 'continue' to proceed to review.
```

This makes continue behavior predictable—you always know which agent will be invoked next.

### Inline Instructions

Customize agent behavior without creating prompt files by providing inline instructions:

```
implement Phase 2 but add rate limiting
continue but focus on error handling
research but skip external dependencies
```

The inline instruction is passed directly to the target agent alongside the Work ID, allowing for quick customization without filesystem management.

### Dynamic Prompt Generation

To generate a prompt file for editing before execution:
```
generate prompt for implementer Phase 3
```

For detailed information about handoff modes, transition patterns, and customization options, see the [PAW Specification](paw-specification.md#workflow-handoffs).

## Workflow

![full workflow](./img/full-workflow.png)

### Stage 1: Creating the spec

Spec and Spec Research agents collaborate to translate an issue into a measurable `Spec.md`, capture system-behavior facts in `SpecResearch.md` (with a section for optional user-provided external knowledge), and surface any remaining questions so downstream agents start with shared, testable requirements. Each spec includes Overview and Objectives narrative sections that provide big-picture context before diving into detailed user stories and requirements.

![stage 1](./img/workflow-stage-1.png)

### Stage 2: Creating the Implementation Plan

Code Research and Implementation Plan agents map the current codebase, break the work into reviewable phases, and stage the planning branch/PR so every later change traces back to clear technical intentions.

![stage 2](./img/workflow-stage-2.png)

### Stage 3: Phased implementation

Implementation and Implementation Review agents deliver each phase on its own branch, running checks, iterating on feedback, and keeping phase PRs small, auditable, and rewindable before they merge into the target branch.

The implementation process uses a two-agent workflow:

**Implementation Agent** — Makes code changes, runs automated checks, and addresses review comments by grouping related feedback into logical units and committing locally with messages that link to the comments being addressed.

**Implementation Review Agent** — Reviews the Implementation Agent's work, suggests improvements, generates docstrings and code comments, pushes changes to open Phase PRs, and posts comprehensive summary comments documenting which review comments were addressed with which commits (enabling humans to manually resolve comments in the GitHub UI).

This two-agent cycle continues until each Phase PR is approved and merged to the target branch.

![stage 3](./img/workflow-stage-3.png)

### Stage 4: Documentation

The Documenter agent produces comprehensive technical documentation in `Docs.md` that explains what was built, how it works, why design decisions were made, and how to use it. It also updates project-specific documentation according to project guidance and opens a docs PR so documentation evolves in lockstep with the code.

![stage 4](./img/workflow-stage-4.png)

### Stage 5: Final PR

The PR agent performs comprehensive pre-flight readiness checks (verifying all phase and docs PRs are merged, artifacts are current, and the target branch is up to date), crafts the final PR description with links to all artifacts and merged PRs, testing evidence, and deployment considerations, then creates the final PR and provides guidance on the merge process.

If review comments exist on the final PR, the same two-agent workflow from Stage 3 applies: the Implementation Agent addresses comments with local commits on the target branch, and the Implementation Review Agent verifies changes, adds improvements, pushes commits, and posts summary comments for human reviewers.

![stage 5](./img/workflow-stage-5.png)

## Credits

Inspired by Dex Horthy's "Advanced Context Engineering for Coding Agents" [talk](https://youtu.be/IS_y40zY-hc?si=27dVJV7LlYDh7woA) and [writeup](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md). Original agent prompts adapted from HumanLayer's [Claude subagents and commands](https://github.com/humanlayer/humanlayer/tree/main/.claude).

Specification structure and checklist concepts were further informed by ideas from the open-source Spec Kit project (GitHub `github/spec-kit`), whose emphasis on prioritized user stories, explicit clarification markers, measurable success criteria, and structured quality checklists influenced the current spec workflow adaptation.

