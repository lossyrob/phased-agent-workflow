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

Upgrade with `npx @paw-workflow/cli upgrade`, uninstall with `npx @paw-workflow/cli uninstall`.

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
- **AI-assisted code review** — The Review workflow helps human reviewers by analyzing PRs, surfacing impacts, and drafting evidence-based comments. You control what gets posted.
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

The **PAW agent** guides features from issue to merged PR through four stages:

1. **Specification** — Translates issues into measurable specs; researches existing system behavior
2. **Planning** — Maps relevant code areas; creates phased implementation plans
3. **Implementation** — Executes each phase, with optional PRs for human review at each step
4. **Finalization** — Opens final PR to main with comprehensive description

## Review Workflow

The **PAW Review** agent assists human reviewers by analyzing pull requests and drafting feedback:

1. **Understanding** — Analyzes PR changes, researches pre-change baseline
2. **Evaluation** — Identifies impacts, breaking changes, and gaps
3. **Feedback** — Drafts structured review comments with rationale

All comments are created as a pending review—you edit, delete, or add to them before submitting. See [Review Workflow Documentation](docs/specification/review.md) for details.

---

## Getting Started

### Copilot CLI (Recommended)

```bash
npx @paw-workflow/cli install copilot
```

Then start a session with `copilot --agent PAW` or `copilot --agent PAW-Review`.

Manage your installation:
```bash
npx @paw-workflow/cli list      # Show installed version
npx @paw-workflow/cli upgrade   # Check for updates
npx @paw-workflow/cli uninstall # Remove PAW
```

### VS Code Extension

1. Download the latest `.vsix` from [Releases](https://github.com/lossyrob/phased-agent-workflow/releases)
2. Install via `Extensions: Install from VSIX...` in the Command Palette
3. Run `PAW: New PAW Workflow` to start

The extension manages workflow directories, git branches, and provides status commands. See the [PAW Specification](paw-specification.md) for details.

---

## Configuration

**Workflow Modes** control which stages are included:
- **Full** — Spec → Research → Planning → Implementation → Final PR
- **Minimal** — Code Research → Implementation → Final PR (faster for small changes)

**Review Policies** control when the workflow pauses for human input:
- **milestones** — Pause at spec, plan, and PR completion (recommended)
- **every-stage** — Pause after every artifact
- **planning-only** — Pause at spec and plan only
- **final-pr-only** — Auto-proceed through all stages, pause at final PR

Configuration is set in `WorkflowContext.md` during initialization. See the [PAW Specification](paw-specification.md) for details.

## Credits

Inspired by Dex Horthy's "Advanced Context Engineering for Coding Agents" [talk](https://youtu.be/IS_y40zY-hc?si=27dVJV7LlYDh7woA) and [writeup](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md). Original agent prompts adapted from HumanLayer's [Claude subagents and commands](https://github.com/humanlayer/humanlayer/tree/main/.claude).

Specification structure and checklist concepts were further informed by ideas from the open-source [Spec Kit](https://github.com/github/spec-kit) project, whose emphasis on prioritized user stories, explicit clarification markers, measurable success criteria, and structured quality checklists influenced the current spec workflow adaptation.

