# Phased Agent Workflow (PAW)

<div align="center" style="margin: 2em 0;">
<img src="https://raw.githubusercontent.com/lossyrob/phased-agent-workflow/main/img/paw-logo.png" alt="PAW Logo" width="200"/>
<h3>Context-Driven Development for GitHub Copilot</h3>
</div>

**PAW** enables **Context-Driven Development**—a practice where AI agents build understanding through structured research and planning phases before writing code. Each phase produces durable artifacts that accumulate context and feed the next phase.

## Why PAW?

AI agents work best when given clear, accumulated context rather than open-ended prompts. Without structure, it's easy to lose track of decisions, introduce inconsistencies, or struggle to iterate when things go wrong.

PAW provides:

- **PR-integrated workflow** — Every implementation phase can create a PR for human review
- **Dedicated research phases** — Build documented understanding before planning begins
- **Rewindable at any layer** — Artifacts are checkpoints; restart from spec, plan, or any phase
- **AI-assisted code review** — Review workflow helps human reviewers by surfacing impacts and drafting feedback
- **Extensible skills architecture** — Compact orchestrator agents delegate to specialized skills

## Quick Start

### Copilot CLI (Recommended)

```bash
npx @paw-workflow/cli install copilot
copilot --agent PAW
```

### VS Code Extension

1. [Download the extension](https://github.com/lossyrob/phased-agent-workflow/releases) from GitHub Releases
2. Install via `Extensions: Install from VSIX...`
3. Run `PAW: New PAW Workflow` from the Command Palette

Both platforms use the same PAW agents and skills.

[Get Started →](guide/index.md){ .md-button .md-button--primary }

## Two Workflows

### Implementation Workflow

Build features from issue to merged PR through four stages:

```
Specification → Research → Planning → Implementation
```

**Use for:** New features, enhancements, refactors, and bug fixes.

[Learn more →](guide/two-workflows.md#paw-implementation-workflow)

### Review Workflow

Assist human reviewers with evidence-based feedback:

```
Understanding → Evaluation → Feedback
```

**Use for:** Reviewing any PR—especially large or poorly-documented ones.

[Learn more →](guide/two-workflows.md#paw-review-workflow)

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Stages** | Workflow milestones (Specification, Planning, Implementation) |
| **Phases** | Discrete implementation chunks within the Implementation stage |
| **Skills** | Specialized capabilities loaded by orchestrator agents |
| **Artifacts** | Durable Markdown documents produced at each stage |

## Documentation

- **[Getting Started](guide/index.md)** — Install PAW and start your first workflow
- **[Workflow Modes](guide/workflow-modes.md)** — Configure Full or Minimal modes
- **[Specification](specification/index.md)** — Deep dive into PAW's workflow design
- **[Reference](reference/agents.md)** — PAW agents and skills

## Requirements

- [GitHub Copilot CLI](https://github.com/github/copilot-cli) or VS Code with GitHub Copilot
- Node.js 18+ (for CLI installation)
- Git repository
