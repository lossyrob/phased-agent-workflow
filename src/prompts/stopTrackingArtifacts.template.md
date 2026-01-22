# Stop Tracking PAW Workflow Artifacts

You are tasked with stopping git tracking for PAW (Phased Agent Workflow) workflow artifacts. This allows users to use PAW's structured workflow locally without committing workflow artifacts to the repository.

## Context

PAW stores workflow artifacts in `.paw/work/<work-id>/` directories including:
- `WorkflowContext.md` - Workflow configuration and metadata
- `Spec.md` - Feature specification
- `SpecResearch.md` - Specification research findings
- `CodeResearch.md` - Code research findings
- `ImplementationPlan.md` - Implementation plan with phases
- `Docs.md` - Documentation changes
- `prompts/` - Generated prompt files for agents

These artifacts help agents understand context and maintain state across workflow stages. However, some users prefer not to commit them (e.g., contributing to non-PAW repositories).

## Parameters

- **Work ID**: {{WORK_ID}}
- **Work Directory**: {{WORK_DIR}}

## Your Tasks

### 1. Untrack Existing Artifacts from Git Index

Remove the workflow directory from git tracking while preserving the files locally:

```
git rm --cached -r .paw/work/{{WORK_ID}}/
```

This removes files from git's index (staging area) but leaves them in the filesystem.

### 2. Create .gitignore for Future Exclusion

Create a `.gitignore` file in the workflow directory containing `*` to exclude all files:

**File path**: `.paw/work/{{WORK_ID}}/.gitignore`
**File content**: `*`

This single-character gitignore pattern ensures all current and future artifacts in this workflow directory are ignored by git.

### 3. Stage the .gitignore File

Stage the newly created `.gitignore` file:

```
git add .paw/work/{{WORK_ID}}/.gitignore
```

### 4. Verify Changes

Confirm the operation succeeded:
- Run `git status` to verify artifacts are no longer tracked and `.gitignore` is staged
- Verify `.paw/work/{{WORK_ID}}/.gitignore` exists and contains `*`

Report the results. If any step fails, explain what went wrong and suggest recovery options.
