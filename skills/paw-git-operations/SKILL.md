---
name: paw-git-operations
description: Shared git mechanics for PAW activity skills including branch naming conventions, strategy-based branching logic, and selective staging discipline.
---

# Git Operations

## Branch Naming Conventions

| Branch Type | Pattern | Example |
|-------------|---------|---------|
| Phase branch | `<target>_phase[N]` | `feature/auth-system_phase1` |
| Multi-phase | `<target>_phase[M-N]` | `feature/auth-system_phase1-3` |
| Planning branch | `<target>_plan` | `feature/auth-system_plan` |
| Docs branch | `<target>_docs` | `feature/auth-system_docs` |

**Target branch** is the feature branch from WorkflowContext.md (e.g., `feature/auth-system`).

## Strategy-Based Branching Logic

### PRs Strategy

Create intermediate branches for each workflow stage; push and create PRs for review.

**Phase work:**
1. Check current branch: `git branch --show-current`
2. If not on correct phase branch, create: `git checkout -b <target>_phase[N]`
3. Verify: `git branch --show-current`
4. Implement on phase branch, commit locally
5. Push: `git push -u <remote> <target>_phase[N]`
6. Create PR: `<target>_phase[N]` → `<target>`

**Planning work:**
1. Create planning branch: `git checkout -b <target>_plan`
2. Commit planning artifacts
3. Push: `git push -u <remote> <target>_plan`
4. Create PR: `<target>_plan` → `<target>`

**Docs work:**
1. Create docs branch: `git checkout -b <target>_docs`
2. Commit documentation
3. Push: `git push -u <remote> <target>_docs`
4. Create PR: `<target>_docs` → `<target>`

### Local Strategy

Work directly on target branch; no intermediate branches or PRs between stages.

**All work:**
1. Check current branch: `git branch --show-current`
2. If not on target branch: `git checkout <target>`
3. Verify: `git branch --show-current`
4. Implement, commit to target branch
5. Push: `git push <remote> <target>`
6. Skip intermediate PR creation

## Selective Staging Discipline

**CRITICAL**: Never use `git add .` or `git add -A`. Always stage files explicitly.

### Standard Staging

```bash
# Stage specific files
git add <file1> <file2> <file3>

# Verify staged changes before commit
git diff --cached
```

### PAW Artifact Staging

Before staging `.paw/` files, check if artifact tracking is disabled:

```bash
# Check for .gitignore in work directory
if [ -f ".paw/work/<feature-slug>/.gitignore" ]; then
  # Tracking disabled - skip .paw/ artifacts
  git add <non-paw-files-only>
else
  # Tracking enabled - stage all changed files
  git add <all-changed-files>
fi
```

**Why**: Users can disable artifact tracking via `.gitignore`. Respect this by checking before staging `.paw/` files.

## Branch Verification

Before every commit, verify you're on the expected branch:

```bash
# Get current branch
git branch --show-current

# Expected patterns by work type:
# - Phase work (prs): *_phase[N] or *_phase[M-N]
# - Planning (prs): *_plan
# - Docs (prs): *_docs
# - Any work (local): <target> (no suffix)
```

**If on wrong branch**: STOP immediately. Do not commit. Switch to correct branch first.

## Pre-Commit Checklist

1. ✓ Verify current branch matches expected pattern
2. ✓ Stage only related files (no `git add .`)
3. ✓ Check `.paw/work/<slug>/.gitignore` before staging `.paw/` artifacts
4. ✓ Review staged changes: `git diff --cached`
5. ✓ Commit with descriptive message
