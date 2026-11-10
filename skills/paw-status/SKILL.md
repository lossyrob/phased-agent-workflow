---
name: paw-status
description: PAW status and help. Reports the state of PAW work items, lists presets, explains PAW and how to get started, and posts status updates to issues or PRs on request.
---

# PAW Status

Read-only unless the user explicitly asks you to post an update. Never push, merge, commit, or rewrite history.

## Work item status

For a work item `.paw/work/<work-id>/` (in this checkout, on another branch via `git log --all`, or in a worktree via `git worktree list`):

- Configuration: `WorkflowContext.md`. A file without a `## Configuration` block is from PAW v1; report its fields as written and say that continuing it maps them to the current configuration.
- Artifacts present: `WorkShaping.md`, `Spec.md`, `CodeResearch.md`, `ImplementationPlan.md` (v1 Lite: `Plan.md`), review output under `reviews/` and `reviews/planning/`.
- Plan units: the units or phases `ImplementationPlan.md` lists, and which ones commits on the target branch deliver. Count them from the plan; never assume.
- Git: current branch, target branch, uncommitted changes, commits ahead of or behind the remote.
- PR: `gh pr list --head <target-branch>`; state, checks, unresolved review comments.
- Todos: if this session's todo store holds the work item's todos, report the open ones.

Recommend the next step: continue the work item with the `paw-workflow` skill, which rebuilds its todos from this evidence.

When asked which work items exist, list every `.paw/work/*/WorkflowContext.md` with work title, work id, target branch, and last modified time, most recent first.

## Presets

Built-in: `lite` (inline research, one implementation unit, single-model reviews), `standard` (default: single-model plan review, multi-model final review), `thorough` (spec, dedicated research, multi-model planning, society-of-thought reviews, phase review). Old names map: `quick`, `paw-lite` → `lite`; `auto`, `team` → `standard`; `auto-full`, `shaping-full` → `thorough`.

User presets: `~/.paw/presets/*.yaml`; show name, description, `extends`, and `default: true`. A user preset overrides a built-in one of the same name.

## About PAW

- Use the exact name **Phased Agent Workflow**. Never invent an acronym expansion.
- PAW enables Context-Driven Development: agents build understanding through durable artifacts (spec, research, plan) before writing code.
- Two workflows: implementation (`paw-workflow`: plan, implement, configured reviews, one final PR) and review (PAW Review, for reviewing a PR).
- It runs in GitHub Copilot CLI and VS Code. Getting started:
{{#cli}}
    - Install with `npx @paw-workflow/cli install copilot`, then `copilot --agent PAW` and describe the task.
{{/cli}}
{{#vscode}}
    - Run `PAW: New PAW Workflow`, or select the PAW agent in chat and describe the task.
{{/vscode}}
- Ground answers in the project docs: README.md, docs/index.md, docs/guide/index.md, docs/guide/cli-installation.md (published at https://lossyrob.github.io/phased-agent-workflow/).

## Posting updates (on explicit request only)

- Issue comment prefixed `**🐾 Status Update 🤖:**` with artifacts, plan units, and PR links.
- PR body: change only the content between `<!-- BEGIN:AGENT-SUMMARY -->` and `<!-- END:AGENT-SUMMARY -->`.
- Never edit issue descriptions, assign reviewers, or change labels.
