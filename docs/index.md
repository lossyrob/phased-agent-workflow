# Phased Agent Workflow (PAW)

<div align="center" style="margin: 2em 0;">
<img src="https://raw.githubusercontent.com/lossyrob/phased-agent-workflow/main/img/paw-logo.png" alt="PAW Logo" width="200"/>
</div>

**PAW** is a VS Code extension that coordinates multi-stage AI agent workflows for feature implementation and code review. It transforms complex development tasks into structured, verifiable phases with clear handoffs between specialized agents.

## Why PAW?

Building features with AI coding agents is powerful, but without structure, it's easy to lose track of decisions, introduce inconsistencies, or struggle to iterate when things go wrong.

PAW provides:

- **Structured phases** — Move from spec to implementation to docs with clear checkpoints
- **Durable artifacts** — Every decision is captured in version-controlled Markdown
- **Rewindability** — Fix upstream problems and regenerate downstream work
- **Human oversight** — You approve specs, plans, and PRs at critical decision points
- **Two workflows** — Build new features OR review existing pull requests

## Quick Start

1. [Install the extension](guide/index.md#quick-install) from GitHub Releases
2. Open a Git repository in VS Code
3. Run `PAW: New PAW Workflow` from the Command Palette
4. Follow the guided workflow through each stage

[Get Started →](guide/index.md){ .md-button .md-button--primary }

## Two Workflows

### Implementation Workflow

Build features from scratch through structured phases:

```
Specification → Planning → Implementation → Finalization
```

**Use for:** New features, enhancements, refactors, and bug fixes.

[Learn more →](guide/two-workflows.md#paw-implementation-workflow)

### Review Workflow

Thoroughly review pull requests with evidence-based feedback:

```
PR → Understanding → Evaluation → Feedback Generation
```

**Use for:** Reviewing any PR—especially large or poorly-documented ones.

[Learn more →](guide/two-workflows.md#paw-review-workflow)

## Key Concepts

| Concept | Description |
|---------|-------------|
| **Stages** | Workflow milestones (Specification, Planning, Implementation, Finalization) |
| **Phases** | Discrete implementation chunks within the Implementation stage |
| **Agents** | Specialized AI chat modes that handle specific stages |
| **Artifacts** | Durable Markdown documents produced at each stage |

## Documentation

- **[Getting Started](guide/index.md)** — Install PAW and start your first workflow
- **[Workflow Modes](guide/workflow-modes.md)** — Configure Full, Minimal, or Custom modes
- **[Specification](specification/index.md)** — Deep dive into PAW's workflow design
- **[Agents Reference](reference/agents.md)** — All PAW agents and their purposes

## Requirements

- VS Code with GitHub Copilot
- Git repository
- GitHub MCP Tools or Azure DevOps MCP Tools (recommended)
