<div align="center">
	<img src="./img/paw-logo.png" alt="PAW Logo" />
    <h1>Phased Agent Workflow (PAW)</h1>
    <h3>Context-Driven Development for GitHub Copilot</h3>
</div>

## Try It Now

### Copilot CLI Plugin (Recommended)

```bash
copilot plugin marketplace add lossyrob/phased-agent-workflow
copilot plugin marketplace browse paw-workflow
copilot plugin install paw-workflow@paw-workflow
```

This installs PAW as a [Copilot CLI plugin](https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace) from the PAW marketplace, with native update and uninstall support. If you previously installed PAW directly from the repository, uninstall that copy first with `copilot plugin uninstall paw-workflow`. Then start a workflow:

```bash
copilot --agent PAW          # Implementation workflow
copilot --agent PAW-Review   # PR review workflow
```

Or use `/agent` inside your session to switch agents.

Refresh the marketplace catalog with `copilot plugin marketplace update paw-workflow`, update with `copilot plugin update paw-workflow`, and uninstall with `copilot plugin uninstall paw-workflow`.

**Requirements**: [GitHub Copilot CLI](https://github.com/github/copilot-cli) installed.

### Alternative: NPM CLI

If you prefer the npm-based installer (also supports Claude Code):

```bash
npx @paw-workflow/cli install copilot   # Copilot CLI
npx @paw-workflow/cli install claude    # Claude Code
```

---

## What is PAW?

**Phased Agent Workflow** (PAW) enables **Context-Driven Development**—a practice where AI agents build understanding through research and planning before writing code. Each step produces durable artifacts (plan, and optionally a spec and code research) that feed the next. By the time code is written, both agent and human share a documented understanding of what's being built and why.

The agent you talk to orchestrates: it builds a todo graph of every configured step up front, runs each activity (specify, research, plan, implement, review) in a subagent, checks each result against git and the files on disk, and opens one pull request at the end.

## Key Benefits

- **Nothing skipped** — Every configured step is a todo created before work starts; a todo closes only with evidence.
- **Configurable rigor** — Three presets (`lite`, `standard`, `thorough`) and user presets choose spec, research, planning models, and review providers (single-model, multi-model, society-of-thought).
- **Git discipline** — Selective staging, your uncommitted changes untouched, history never rewritten, one final PR.
- **Resumable and rewindable** — A new session continues from evidence; a rewind reopens the affected steps and adds new commits.
- **AI-assisted code review** — PAW Review helps human reviewers by analyzing PRs, surfacing impacts, and drafting evidence-based comments as a pending review. You control what gets posted.

## Two Platforms

PAW works with both **GitHub Copilot CLI** (terminal) and **VS Code** (GUI):

| Platform | Installation | Best For |
|----------|--------------|----------|
| **Copilot CLI** (Plugin) | `copilot plugin marketplace add lossyrob/phased-agent-workflow` then `copilot plugin install paw-workflow@paw-workflow` | Terminal workflows, quick iteration |
| **Copilot CLI** (NPM) | `npx @paw-workflow/cli install copilot` | Fallback, or if you also use Claude Code |
| **VS Code Extension** | Download `.vsix` from [Releases](https://github.com/lossyrob/phased-agent-workflow/releases) | IDE integration |

Both platforms use the same PAW agents and skills. PAW v2 has been verified on Copilot CLI; VS Code and Claude Code are not yet verified end to end (see [Known limits](docs/release-notes.md#known-limits)).

---

## Implementation Workflow

The **PAW agent** takes a task from an issue or prompt to one pull request:

1. **Setup** — Resolves the configuration, creates the target branch (or a worktree), and writes `WorkflowContext.md`
2. **Plan** — Researches the code and writes `ImplementationPlan.md`; optional shaping, spec, dedicated research, plan review and a plan checkpoint come first
3. **Implement** — One subagent per plan unit (independent units may run in parallel), each checked against the plan; optional review after each unit
4. **Final review and PR** — Runs the configured final review, then opens one PR to the base branch

## Review Workflow

The **PAW Review** agent assists human reviewers by analyzing pull requests and drafting feedback:

1. **Understanding** — Analyzes PR changes, researches pre-change baseline
2. **Evaluation** — Identifies impacts, breaking changes, and gaps
3. **Feedback** — Drafts structured review comments with rationale

All comments are created as a pending review—you edit, delete, or add to them before submitting. See [Review Workflow Documentation](docs/specification/review.md) for details.

---

## Getting Started

### Copilot CLI (Recommended)

Install as a Copilot CLI plugin:
```bash
copilot plugin marketplace add lossyrob/phased-agent-workflow
copilot plugin marketplace browse paw-workflow
copilot plugin install paw-workflow@paw-workflow
```

Then start a session with `copilot --agent PAW` or `copilot --agent PAW-Review`.

Manage your installation:
```bash
copilot plugin marketplace update paw-workflow  # Refresh PAW marketplace catalog
copilot plugin list                             # Show installed plugins
copilot plugin update paw-workflow              # Update installed plugin
copilot plugin uninstall paw-workflow           # Remove PAW
```

<details>
<summary>Alternative: NPM CLI (also supports Claude Code)</summary>

```bash
npx @paw-workflow/cli install copilot   # Copilot CLI
npx @paw-workflow/cli install claude    # Claude Code
npx @paw-workflow/cli list              # Show installed version
npx @paw-workflow/cli upgrade           # Check for updates
npx @paw-workflow/cli uninstall         # Remove PAW
```

**Note**: If switching from NPM CLI or the old direct repository plugin install to the marketplace plugin, uninstall the previous copy first to avoid duplicate agents (user-level files take precedence over plugin files).
</details>

### VS Code Extension

1. Download the latest `.vsix` from [Releases](https://github.com/lossyrob/phased-agent-workflow/releases)
2. Install via `Extensions: Install from VSIX...` in the Command Palette
3. Run `PAW: New PAW Workflow` to start

The extension asks for preset, plan checkpoint, artifact lifecycle and execution mode, then opens a PAW chat. It also provides status and stop-tracking commands. See the [VS Code guide](docs/guide/vscode-extension.md).

---

## Configuration

Name a preset or setting when you start: `paw this with thorough, plan checkpoint on`.

| Preset | What it does |
|--------|--------------|
| `lite` | Inline research, one implementation unit, single-model reviews |
| `standard` (default) | Single-model plan review, multi-model final review |
| `thorough` | Spec, dedicated research, multi-model planning, society-of-thought reviews, phase review |

Configuration is recorded in `.paw/work/<work-id>/WorkflowContext.md` at setup. See [Configuration and Presets](docs/guide/workflow-presets.md). Upgrading from PAW v1? See [Migrating from v1](docs/guide/migration.md).

## Credits

Inspired by Dex Horthy's "Advanced Context Engineering for Coding Agents" [talk](https://youtu.be/IS_y40zY-hc?si=27dVJV7LlYDh7woA) and [writeup](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md). Original agent prompts adapted from HumanLayer's [Claude subagents and commands](https://github.com/humanlayer/humanlayer/tree/main/.claude).

Specification structure and checklist concepts were further informed by ideas from the open-source [Spec Kit](https://github.com/github/spec-kit) project, whose emphasis on prioritized user stories, explicit clarification markers, measurable success criteria, and structured quality checklists influenced the current spec workflow adaptation.
