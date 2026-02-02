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
2. If not on correct phase branch:
   - Checkout target branch: `git checkout <target>`
   - Set upstream if not set: `git branch --set-upstream-to=<remote>/<target>`
   - Pull latest: `git pull`
   - Create phase branch from target: `git checkout -b <target>_phase[N]`
3. Verify: `git branch --show-current`
4. Implement on phase branch, commit locally
5. Push: `git push -u <remote> <target>_phase[N]`
6. Create PR: `<target>_phase[N]` → `<target>`

**Planning work:**
1. Checkout target branch: `git checkout <target>`
2. Set upstream if not set: `git branch --set-upstream-to=<remote>/<target>`
3. Pull latest: `git pull`
4. Create planning branch: `git checkout -b <target>_plan`
5. Commit planning artifacts
6. Push: `git push -u <remote> <target>_plan`
7. Create PR: `<target>_plan` → `<target>`

**Docs work:**
1. Checkout target branch: `git checkout <target>`
2. Set upstream if not set: `git branch --set-upstream-to=<remote>/<target>`
3. Pull latest: `git pull`
4. Create docs branch: `git checkout -b <target>_docs`
5. Commit documentation
6. Push: `git push -u <remote> <target>_docs`
7. Create PR: `<target>_docs` → `<target>`

### Local Strategy

Work directly on target branch; no intermediate branches or PRs between stages.

**All work:**
1. Check current branch: `git branch --show-current`
2. If not on target branch:
   - Checkout target: `git checkout <target>`
   - Set upstream if not set: `git branch --set-upstream-to=<remote>/<target>`
   - Pull latest: `git pull`
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

## Phase PR Creation

After implementation review passes, create Phase PR (PRs strategy only).

### Push and Create PR

```bash
# 1. Verify on phase branch
git branch --show-current  # Should be <target>_phase[N]

# 2. Push branch
git push -u <remote> <target>_phase[N]

# 3. Create PR via gh CLI
gh pr create \
  --base <target> \
  --head <target>_phase[N] \
  --title "[<Work Title>] Phase <N>: <description>" \
  --body "<PR body>"
```

### PR Title Format

`[<Work Title>] Phase <N>: <one-sentence description>`

Example: `[Auth System] Phase 1: Add JWT token validation`

### PR Body Scaling

**Simple phases**:
```
Phase <N>: <one-sentence objective>

🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)
```

**Complex phases**:
```
## Summary
<Key changes and approach>

## Design Decisions
<Noteworthy decisions made>

## Reviewer Notes
<Items for reviewer attention>

🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)
```

### Post-PR Actions

1. Capture PR URL from `gh pr create` output
2. Update ImplementationPlan.md with PR link in phase notes
3. Report PR URL to user

### PR Update Policy

After a PR is opened, post progress updates as **PR comments**, not modifications to the PR body. PR body modifications require explicit user request.

### Reply Format (PR Comments)

When replying to review comments:

```
**🐾 PAW 🤖:**

[What was changed and commit hash reference]
```
