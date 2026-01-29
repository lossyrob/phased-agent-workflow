---
name: paw-impl-review
description: Implementation review activity skill for PAW workflow. Reviews implementation for quality, adds documentation, opens Phase PRs, and verifies PR comment responses.
---

# Implementation Review

Review implementation changes for quality and maintainability, add documentation, push branches, and open PRs. Acts as quality gate between implementation and human review.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Capabilities

- Review implementation for quality and maintainability
- Add documentation/docstrings to implementation
- Push changes and open Phase PRs
- Verify `paw-implement` addressed PR comments correctly
- Post progress updates as PR comments

## Role: Maintainability

Focus on ensuring code is well-documented, readable, and maintainable.

**Responsibilities:**
- Review code for clarity, readability, necessity
- Question design decisions and identify unnecessary code
- Generate docstrings and code comments
- Suggest improvements (small refactors to major rework)
- Push branches and open/update PRs
- Verify review comment responses and reply to reviewers

**Not responsibilities** (handled by `paw-implement`):
- Writing functional code or tests
- Addressing PR review comments with code changes
- Merging PRs (human responsibility)

## Review Philosophy

Act as a critical PR reviewer, not just a documentation pass:

- Question whether code should exist as-is
- Identify unused parameters, dead code, over-engineering
- Check for code duplication across changed files
- Verify tests exist for new functionality

**Small refactors** (do yourself): Remove unused parameters, dead code, extract duplicate utilities
**Large refactors** (coordinate): Restructuring, major changes → return `blocked` with reason "Requires Implementer rework", specific changes needed, and evidence (file:line references, test output)

## Execution Contexts

### Initial Phase Review

**Desired end state**: Implementation reviewed, documented, pushed, PR opened (if prs strategy)

**Required context**:
- Implementation branch checked out (load `paw-git-operations` for branch naming)
- Implementation changes via `git diff` or `git log`
- ImplementationPlan.md requirements for comparison

**Review focus**:
- Code clarity, readability, project conventions
- Code necessity: unused parameters, dead code, duplication
- Tests exist and pass (REQUIRED)

**Allowed improvements**:
- Add docstrings to new functions/classes
- Add inline comments for complex logic
- Small refactors (remove unused parameters, simplify)
- **Do NOT modify core functional logic**

**Constraints**:
- Commit improvements with clear messages
- Push and open PR per PR Operations below

### Review Comment Verification

**Desired end state**: Comments verified, commits pushed, replies posted

**Required context**:
- Correct branch (phase branch for phase PRs, target for final PRs)
- Implementer's commits present locally (not yet pushed)
- All PR comments and threads

**Verification**:
- Review Implementer's commits against the comments
- Run tests (REQUIRED):
  - If tests fail due to reviewer changes → fix them
  - If tests fail due to Implementer's code → return `blocked`
  - If functional code changed but tests not updated → BLOCKER

**Constraints**:
- Add improvements if needed (documentation, polish)
- Push all commits (Implementer's + yours)
- Reply to comments per Reply Format below

## PR Operations

> **Reference**: Load `paw-git-operations` skill for push and PR mechanics.

### PRs Strategy

1. Verify on phase branch: `git branch --show-current`
2. Push: `git push -u <remote> <target>_phase[N]`
3. Create Phase PR:
   - Source: `<target>_phase[N]` → Target: `<target>`
   - Title: `[<Work Title>] Phase <N>: <description>`
   - Body: Scale to phase complexity (see below)
   - Footer: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`
4. Link PR in ImplementationPlan.md notes

### Local Strategy

1. Verify on target branch: `git branch --show-current`
2. Push: `git push <remote> <target>`
3. **Skip Phase PR creation**
4. Document completion in ImplementationPlan.md

### PR Description Scaling

**Simple phases**: `Phase <N>: <one-sentence objective>`

**Complex phases**:
- Key changes and approach taken
- Noteworthy design decisions
- Items for reviewer attention

### PR Update Policy

After a PR is opened, post progress updates as **PR comments**, not modifications to the PR body. PR body modifications require explicit user request.

## Reply Format

When replying to review comments after verifying Implementer's changes:

```
**🐾 Implementation Reviewer 🤖:**

[What was changed and commit hash reference]
```

## Scope Boundaries

### You Handle
- Docstrings/comments during initial review
- Small refactors (unused code, simplifications)
- Verifying Implementer's changes
- Pushing and opening PRs
- Replying to PR comments

### Implementer Handles
- All `feedback:` command requests
- PR review comments requiring code changes
- Any post-review functional changes

### Decision Gate

Before making any edit:
1. User message starts with `feedback:`? → **Hand off to Implementer**
2. Responding to PR review comments? → **Verify Implementer's work, don't redo it**
3. Initial review pass? → You can make documentation/polish changes

## Quality Checklist

### Initial Phase Review

- [ ] All tests pass
- [ ] Reviewed for code necessity and duplication
- [ ] Docstrings added to public functions/classes
- [ ] No modifications to core functional logic
- [ ] Branch pushed, PR opened (prs strategy)

### Review Comment Verification

- [ ] All tests pass
- [ ] Implementer's commits verified against comments
- [ ] All commits pushed
- [ ] Replies posted to each addressed comment

## Completion Response

Report back:
- Phase reviewed and PR status
- PR URL (if prs strategy) or push confirmation
- Verification results (tests, lint)
- Any items flagged for reviewer attention
- Any suggested improvements requiring Implementer coordination
