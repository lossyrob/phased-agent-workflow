# Phased Agent Workflow (PAW)

<div align="center" style="margin: 2em 0;">
<img src="https://raw.githubusercontent.com/lossyrob/phased-agent-workflow/main/img/paw-logo.png" alt="PAW Logo" width="200"/>
</div>

**PAW** works with **GitHub Copilot CLI** and **VS Code** to take a task from an issue or prompt to a reviewed pull request, and to help you review other people's pull requests.

## Why PAW?

AI coding agents work best with clear, accumulated context. PAW gives them that context through durable artifacts and keeps the work checkable:

- **Plan before code** — Research and a written plan (and optionally a spec) come before implementation
- **Nothing skipped** — Every configured step is a todo created up front; each closes only with evidence on disk
- **Configured review** — Single-model, multi-model or society-of-thought review of the plan and the final change
- **Git discipline** — Selective staging, your uncommitted changes untouched, history never rewritten, one final PR
- **Resumable and rewindable** — Continue in a new session from evidence; go back to the plan without losing history

## Quick Start

1. Install PAW: [CLI installation](guide/cli-installation.md) or [VS Code extension](guide/index.md#quick-install-vs-code)
2. Open a Git repository
3. Start PAW: `copilot --agent PAW` (CLI) or `PAW: New PAW Workflow` (VS Code)
4. Describe the task or give an issue URL

[Get Started →](guide/index.md){ .md-button .md-button--primary }

## Two Workflows

### Implementation Workflow

```
Task → Plan → Implement → Review → Final PR
```

Optional shaping, spec and dedicated research before the plan, and reviews at the plan, each unit and the end, as configured by the `lite`, `standard` or `thorough` preset.

[Learn more →](guide/two-workflows.md#implementation-workflow)

### Review Workflow

```
PR → Understanding → Evaluation → Feedback → Pending review
```

**Use for:** Significant, thorough reviews of a pull request, especially large or poorly documented ones.

[Learn more →](guide/two-workflows.md#paw-review)

## Documentation

- **[Getting Started](guide/index.md)** — Install PAW and start your first work item
- **[Configuration and Presets](guide/workflow-presets.md)** — Presets, fields, review providers
- **[Migrating from v1](guide/migration.md)** — What changed in PAW v2
- **[Specification](specification/index.md)** — How PAW v2 works and what it guarantees
- **[Release Notes](release-notes.md)** — Changes and known limits

## Requirements

- GitHub Copilot CLI, or VS Code 1.109+ with GitHub Copilot
- A Git repository; the GitHub CLI (`gh`) for the final pull request
