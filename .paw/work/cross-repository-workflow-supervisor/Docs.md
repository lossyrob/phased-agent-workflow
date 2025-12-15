# Cross-Repository Workflow Supervisor

## Overview

This work adds **first-class cross-repository workflow support** to PAW when running inside a VS Code **multi-root** workspace.

The cross-repository workflow is designed for features that span multiple git repositories. Instead of forcing everything into a single repo-local `.paw/work/<work-id>/` directory, PAW now supports a coordinator workflow stored under a user-selected **storage root folder**:

- Coordinator artifacts: `<storage-root>/.paw/multi-work/<work-id>/...` (may be non-git)
- Child workflows: `<repo>/.paw/work/<work-id>/...` (one per participating repository; normal PAW implementation workflows)

This preserves the normal “single repository” PAW workflow and adds a coordination layer for multi-repo work.

## What Was Implemented

### New Workflow Type: Cross-Repository

Initialization now begins by selecting a **Workflow Type**:

- **Implementation**: existing single-repository workflow
- **Cross-Repository**: new multi-repository coordination workflow (multi-root workspaces only)
- **Review**: currently surfaced as “coming soon” and not started from the extension

For cross-repository workflows, the initialization flow collects two additional inputs:

1. **Storage Root Folder**: which workspace folder will hold `.paw/multi-work/<work-id>/` coordinator artifacts (does not need to be a git repo)
2. **Affected Repositories**: multi-select list of detected git repositories in the workspace

### Cross-Repository Artifact Root (`.paw/multi-work/`)

Cross-repository coordinator artifacts are stored under:

```
<storage-root>/.paw/multi-work/<work-id>/
  CrossRepoContext.md
  prompts/
```

The extension’s initialization prompt instructs the initializer agent to create `CrossRepoContext.md` instead of `WorkflowContext.md`.

### New Cross-Repository Agents (PAW-M##)

Five cross-repository agents were added to coordinate multi-repo work:

- **PAW-M01A Cross-Repo Spec**: drafts `CrossRepoSpec.md` and optionally generates cross-repo research prompts
- **PAW-M01B Cross-Repo Spec Researcher**: answers factual questions across repositories
- **PAW-M02A Cross-Repo Code Researcher**: maps where/how relevant code works across repositories
- **PAW-M02B Cross-Repo Impl Planner**: sequences work across repos and produces `CrossRepoPlan.md`, including child workflow initialization instructions and per-repo context excerpts
- **PAW-M03 Cross-Repo Validator**: checks consistency across repos and produces a `ValidationReport.md` in `.paw/multi-work/<work-id>/`

These agents follow the same “handoff command” patterns as existing PAW agents.

### `paw_get_context` Supports Cross-Repository Context

The `paw_get_context` tool now resolves context from either:

- `.paw/work/<work-id>/WorkflowContext.md` (standard workflows)
- `.paw/multi-work/<work-id>/CrossRepoContext.md` (cross-repository workflows)

Resolution is **workspace-wide** (multi-root aware). Standard `.paw/work/` contexts are preferred if both exist.

## Architecture and Design

### Key Concepts

**Coordinator workflow**
- Lives in `.paw/multi-work/` under the storage root folder.
- Stores cross-repository artifacts and planning/validation documents.
- May live outside git (for “notes / coordination” folders).

**Child workflows**
- One per repository, stored in that repository’s `.paw/work/<work-id>/` directory.
- Run as standard PAW implementation workflows.
- Are independent: removing `.paw/multi-work/` must not break child workflows.

### Initialization Flow (Extension)

The VS Code command `PAW: New PAW Workflow` orchestrates initialization:

- Detects multi-root workspace and scans workspace folders for git repositories.
- Collects user inputs in this order:
  1. Workflow Type
  2. (Cross-repo only) Storage Root
  3. (Cross-repo only) Affected Repositories
  4. Issue URL (optional)
  5. Branch name (optional; empty triggers agent auto-derivation)
  6. Workflow Mode
  7. Review Strategy
  8. Handoff Mode

For cross-repository workflows, the extension validates:

- Workspace is multi-root
- Storage root exists on disk
- At least one affected repository is selected

Then it generates a workflow initialization prompt which instructs the initializer agent to:

- Create `.paw/multi-work/<work-id>/CrossRepoContext.md`
- Create `prompts/` under the same coordinator directory
- Use `PAW-M01A Cross-Repo Spec` as the next stage

### Context Resolution (`paw_get_context`)

Context resolution uses a “search all workspace roots” approach:

1. Look for `.paw/work/<work-id>/` in any workspace folder
2. If not found, look for `.paw/multi-work/<work-id>/` in any workspace folder
3. Load the appropriate context file (`WorkflowContext.md` or `CrossRepoContext.md`)

This enables cross-repository coordination artifacts to live in a different workspace folder than the participating git repositories.

## User Guide

### Prerequisites

- A VS Code **multi-root** workspace with 2+ folders
- At least one of the workspace folders is a valid git repository
- A chosen storage root folder (can be a non-git folder)

### Basic Usage

1. Open a VS Code multi-root workspace containing all relevant repositories (and optionally a coordination/notes folder).
2. Run `PAW: New PAW Workflow`.
3. Select **Cross-Repository** as workflow type.
4. Select a **Storage Root**.
5. Select **Affected Repositories** (one or more).
6. Provide issue URL and/or branch (optional; you can leave branch empty to auto-derive).
7. Proceed to `spec` to start cross-repository specification with **PAW-M01A**.

### Planning and Execution Pattern

A typical cross-repository workflow looks like:

1. **Coordinator Spec**: PAW-M01A (and optionally PAW-M01B)
2. **Coordinator Code Research**: PAW-M02A
3. **Coordinator Plan**: PAW-M02B generates `CrossRepoPlan.md`
4. **Initialize child workflows** in each repository (guided by `CrossRepoPlan.md`)
5. Implement changes repo-by-repo using standard PAW implementation agents inside each repository
6. Run **PAW-M03 Validator** to check consistency and generate `ValidationReport.md`

### Configuration Notes

- **Review Strategy**: cross-repo coordinator workflows respect `prs` vs `local` strategy for how the coordinator repo (if in git) is reviewed, but child workflows are still independent and may choose their own review strategy per repo.
- **Storage root is not required to be git**: the initializer will only commit coordinator artifacts if the storage root is inside a git repository.

## Technical Reference

### Key Files

- Extension entrypoint for initialization: `src/commands/initializeWorkItem.ts`
- User input collection for workflow type / repo selection / storage root: `src/ui/userInput.ts`
- Prompt generation and CrossRepoContext.md template: `src/prompts/workflowInitPrompt.ts` and `src/prompts/workItemInitPrompt.template.md`
- Cross-repo context support in `paw_get_context`: `src/tools/contextTool.ts`
- Cross-repo agent definitions: `agents/PAW-M01A Cross-Repo Spec.agent.md`, `agents/PAW-M01B Cross-Repo Spec Researcher.agent.md`, `agents/PAW-M02A Cross-Repo Code Researcher.agent.md`, `agents/PAW-M02B Cross-Repo Impl Planner.agent.md`, `agents/PAW-M03 Cross-Repo Validator.agent.md`

### CrossRepoContext.md Fields

`CrossRepoContext.md` extends the standard context concept with cross-repo-specific fields:

- **Storage Root**: where `.paw/multi-work/` is stored
- **Affected Repositories**: list of repositories participating
- **Artifact Paths**: hint for where coordinator artifacts live

## Edge Cases and Limitations

- **Cross-Repository option requires multi-root**: it is not offered / not supported in single-folder workspaces.
- **Storage root may be non-git**: coordinator artifacts may not be version controlled; child workflows remain version controlled inside repos.
- **No automated cross-repo PR orchestration**: cross-repo planning/validation guides humans; it does not create/manage PRs across repositories.
- **Review workflow via extension is not enabled**: the workflow type selection currently treats Review as “coming soon”.

## Testing Guide

### Automated Checks

- TypeScript build: `npm run compile`
- Unit tests: `npm test`
- Agent linting: `./scripts/lint-agent.sh agents/PAW-M*.agent.md`

### Manual Testing (Recommended)

1. Create a VS Code multi-root workspace containing:
   - 2+ git repos
   - optionally, a non-git coordination folder
2. Run `PAW: New PAW Workflow`.
3. Select Cross-Repository and choose the coordination folder as Storage Root.
4. Verify `<storage-root>/.paw/multi-work/<work-id>/CrossRepoContext.md` is created.
5. Use `spec` to invoke PAW-M01A and generate coordinator artifacts.
6. Use PAW-M02B plan output to initialize child workflows in each repo.
7. Delete the `.paw/multi-work/<work-id>/` folder and verify each repo’s `.paw/work/<work-id>/` child workflows remain intact.

## References

- Work artifacts for this feature: `.paw/work/cross-repository-workflow-supervisor/`
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/142
