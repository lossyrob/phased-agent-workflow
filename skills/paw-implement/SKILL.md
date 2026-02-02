---
name: paw-implement
description: Implementation activity skill for PAW workflow. Executes plan phases with code changes, documentation phases, and PR review comment handling. One phase per invocation.
---

# Implementation

> **Execution Context**: This skill runs **directly** in the PAW session (not a subagent), preserving user interactivity for course-correction during implementation.

Execute implementation plan phases by making code changes, running verification, and committing locally. Operates one phase per invocation by default.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Critical: Preserve Existing Changes

**DO NOT modify, revert, or stage existing uncommitted changes** in the working directory. The user may have in-progress work they haven't committed yet.

- Before making changes, check `git status` to understand current state
- Only stage files YOU modified for the current phase
- Never use `git add .` or `git add -A` (can capture unrelated changes)
- If existing uncommitted changes conflict with plan work, report as `blocked` and ask user how to proceed

## Capabilities

- Execute one or more plan phases based on delegation instructions
- Make focused code changes with appropriate verification (tests, lint) per repository norms
- Execute documentation phases (create/update Docs.md, update project documentation)
- Address PR review comments on implementation work (load `paw-review-response` for mechanics)
- Handle non-linear requests (e.g., "adjust implementation to match updated spec") when delegated by PAW agent

## Role: Forward Momentum

Focus on making changes work and getting automated verification passing.

**Responsibilities:**
- Implement plan phases with functional code
- Run automated verification (tests, linting, type checking)
- Address PR review comments by making code changes
- Update ImplementationPlan.md with progress
- Commit functional changes locally

**Not responsibilities** (handled by `paw-impl-review`):
- Docstrings or code comments
- Code formatting or style polish
- Opening Phase PRs
- Replying to PR review comments

## Implementation Philosophy

Plans are carefully designed, but reality can be messy:

- Follow the plan's intent while adapting to what you find
- Implement each phase fully before moving to the next
- Verify your work makes sense in the broader codebase context
- Update checkboxes in the plan as you complete sections

When things don't match the plan exactly, think about why and communicate clearly. The plan is your guide, but your judgment matters too.

## Blocking Behavior

When plan conflicts with codebase reality or leaves critical gaps: **STOP immediately**. No TODO comments, placeholders, or speculative code. Return status `blocked` with specific blockers and what would resolve each.

**Exception**: If delegation explicitly allows degraded verification for non-critical checks (e.g., flaky tests, optional linters), report as `⚠️ warning` and proceed.

## Execution Contexts

### Initial Phase Development

**Desired end state**: Phase implemented, tests passing, changes committed locally on correct branch

**Required context**:
- Current phase requirements from ImplementationPlan.md
- Codebase conventions and verification commands from CodeResearch.md
- Branch state per Review Strategy (load `paw-git-operations`)

**Constraints**:
- All verification commands from CodeResearch.md must pass before committing
- Update ImplementationPlan.md: mark phase complete in Phase Status (`- [ ]` → `- [x]`)
- Commit locally with descriptive message
- **DO NOT push** — `paw-impl-review` handles that

### Documentation Phase Execution

**Desired end state**: Docs.md created/updated, project docs updated (if warranted), docs build passing

**Required context**:
- Load `paw-docs-guidance` utility skill for templates and conventions
- Docs build command from CodeResearch.md (if framework discovered)

**Constraints**:
- Use same branch strategy and review flow as code phases
- Verify docs build passes before committing
- **DO NOT push** — `paw-impl-review` handles that

### PR Review Comment Response

**Desired end state**: All review comments addressed with focused commits, ready for verification

**Required context**:
- PR metadata (URL or number) from delegation—if absent, return `blocked`
- PR type determined from PR description/metadata (Phase PR vs Final PR)
- Load `paw-review-response` for commit/reply mechanics
- Pull latest to include any reviewer commits

**Constraints**:
- One focused commit per comment group (related comments addressed together)
- Complete each group fully (changes + commit) before starting next
- **DO NOT push** — `paw-impl-review` verifies and pushes

## Branching and Commits

> **Reference**: Load `paw-git-operations` skill for branch naming, commit mechanics, and selective staging.

## Resuming Work

If the plan has existing checkmarks:
- Trust that completed work is done
- Pick up from the first unchecked item
- Verify previous work only if something seems off

## Artifact Update Discipline

- Only update checkboxes for work actually completed in current session
- DO NOT mark phases complete preemptively
- Preserve prior notes; append new summaries
- Limit edits to sections affected by current phase
- Re-running same phase should produce no additional plan changes

## Quality Checklist

### Initial Phase Implementation

- [ ] All automated success criteria green
- [ ] Phase Status checkbox marked complete in ImplementationPlan.md
- [ ] Changes committed locally (NOT pushed)

### PR Review Comment Response

- [ ] All automated checks passing
- [ ] Each comment group addressed with focused commit
- [ ] ImplementationPlan.md updated with "Addressed Review Comments:" section
- [ ] All commits local (NOT pushed)

## Completion Response

Report back:
- Phase(s) completed and brief summary
- Verification results (tests, lint)
- Branch name and commit hash(es)
- Any items requiring user decision or review attention
- Status: `complete` or `blocked` (with specific blockers)
