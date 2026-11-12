# PAW Specification Overview

**Phased Agent Workflow (PAW)** supports Context-Driven Development: agents build understanding through durable artifacts (spec, research, plan) before they write code, and every step is recorded in git.

This section specifies PAW v2. The user guide describes how to use it; these pages describe how it works and what it guarantees.

## Implementation Workflow

One workflow skill, `paw-workflow`, loaded by a host agent. The host builds a todo graph from the resolved configuration, runs each activity (specify, research, plan, implement, review) in a subagent with a brief, checks every result against git and the files on disk, and opens one final pull request.

| Page | Contents |
|------|----------|
| [Design](v2/design.md) | Shape, activities, host rules, todo graph, delegation and return contracts, configuration model, presets, artifacts, git and lifecycle, compatibility, PAW Review alignment, decisions |
| [Invariant Catalogue](v2/invariants.md) | The rules learned from past failures that v2 guarantees, their owners and regression tests, and the v1 machinery v2 dropped |
| [Runtime Capabilities](v2/runtime-capabilities.md) | What Copilot CLI, Claude Code and VS Code offer (subagent follow-up, parallelism, todo store, skill files), probe results, and baseline runs |

The workflow's own reference files are in `skills/paw-workflow/references/`: `configuration.md`, `review-providers.md`, `presets/`, `activities/`, `procedures/` and `v1-context.md`.

## Review Workflow

PAW Review is a separate workflow for reviewing pull requests: understanding, evaluation and feedback, ending in a pending review that you control. It uses the same host model and return contract. See [Review Workflow](review.md).

## Repository Layout

```
.paw/
  work/<work-id>/       # Implementation workflow artifacts
  reviews/<identifier>/ # PAW Review artifacts
```

See the [Artifacts Reference](../reference/artifacts.md) for the files in each.

## Branches and Pull Requests

| Item | Convention |
|------|------------|
| Target branch | Your project's conventions; derived from the task if you do not give one |
| Worktree (`execution_mode: worktree`) | `<parent of repo root>/<repo dir name>-<work-id>`, on the target branch |
| Pull request | One, from the target branch to the base branch |

Every commit is made on the target branch. PAW v2 creates no planning, phase or docs branches.
