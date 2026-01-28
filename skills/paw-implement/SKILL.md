---
name: paw-implement
description: Implementation activity skill for PAW workflow. Executes plan phases with code changes, documentation phases, and PR review comment handling. One phase per invocation.
---

# Implementation

Execute implementation plan phases by making code changes, running verification, and committing locally. Operates one phase per invocation by default.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

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

## Blocking on Uncertainties

When the plan or codebase conflicts with reality or leaves critical gaps:

- **STOP immediately** — do not guess or partially complete work
- DO NOT leave TODO comments, placeholder code, or speculative logic
- DO NOT proceed if prerequisites are missing or failing

**Common blocking situations:**
- Plan references files, modules, or APIs that don't exist or differ materially
- Dependencies unavailable, incompatible, or failing
- Success criteria cannot be executed with current tooling
- Plan, spec, and repository instructions contradict
- External services, credentials, or feature flags unavailable

**When blocked**: Return to PAW agent with status `blocked`, specific blockers, and what would resolve each.

## Execution Contexts

### Initial Phase Development

**Desired end state**: Phase implemented, tests passing, changes committed locally on correct branch

1. Read ImplementationPlan.md completely to identify current phase
2. Read CodeResearch.md for codebase patterns and conventions
3. Handle branching per Review Strategy (load `paw-git-operations`)
4. Implement phase changes
5. Run success criteria checks (tests, lint)
6. Fix any issues before proceeding
7. Update ImplementationPlan.md with phase status and notes
8. Check off completed items in plan
9. Commit locally with descriptive message
10. **DO NOT push** — `paw-impl-review` handles that

### Documentation Phase Execution

When executing a documentation phase (as specified in ImplementationPlan.md):

**Desired end state**: Docs.md created/updated, project docs updated (if warranted), docs build passing

1. Load `paw-docs-guidance` utility skill for templates and conventions
2. Create or update Docs.md using template
3. Update project documentation (README, CHANGELOG, guides) if warranted
4. Verify docs build correctly using command from CodeResearch.md (if framework discovered)
5. Commit documentation changes
6. **DO NOT push** — `paw-impl-review` handles that

Documentation phases are executed like any other phase—same branch strategy, same review flow.

### PR Review Comment Response

When addressing PR review comments:

**Desired end state**: All review comments addressed with focused commits, ready for verification

1. **Determine PR type** from target branch:
   - Targets feature branch → Phase PR (work on phase branch)
   - Targets `main` → Final PR (work on target branch, load all phase contexts)
2. **Update local branch**: Pull latest to include any reviewer commits
3. **Load `paw-review-response`** for mechanics
4. **Determine which comments need work**: Read all comment threads, skip already-addressed
5. **Group comments into commit groups**: Related comments addressed together
6. **Address groups sequentially**: For each group:
   - Make changes
   - Stage selectively: `git add <file1> <file2>`
   - Verify: `git diff --cached`
   - Commit with message referencing comment(s)
   - Mark group complete
7. **DO NOT push** — `paw-impl-review` verifies and pushes

**CRITICAL**: Complete each group fully (changes + commit) before starting the next.

## Branching and Commits

> **Reference**: Load `paw-git-operations` skill for branch naming, commit mechanics, and selective staging.

### Branch Verification

Before every commit:
- Verify current branch: `git branch --show-current`
- For prs strategy: Must be on `<target>_phase[N]`
- For local strategy: Must be on `<target>`
- If on wrong branch, STOP and switch immediately

### Selective Staging

- Use `git add <file1> <file2>` for specific files
- NEVER use `git add .` or `git add -A`
- Verify with `git diff --cached` before commit
- Check `.paw/work/<work-id>/.gitignore` before staging `.paw/` artifacts

## Workflow Mode Handling

### Full Mode
- Standard multi-phase implementation
- Implement one phase at a time
- Each phase has its own phase branch (prs strategy) or commits to target (local strategy)

### Minimal Mode
- Single-phase implementation
- Implement the complete phase
- Uses local strategy (no phase branches)

### Custom Mode
- Follow phase structure from Custom Workflow Instructions
- Review Strategy determines branching

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

- [ ] All automated success criteria in active phase are green
- [ ] Changes committed locally with clear messages
- [ ] ImplementationPlan.md updated with phase status and notes
- [ ] Phase checkbox marked complete
- [ ] Commits contain only related changes
- [ ] On correct branch (verify with `git branch --show-current`)
- [ ] **Branch NOT pushed**

### PR Review Comment Response

- [ ] All automated checks passing
- [ ] Each comment group addressed with focused commit
- [ ] Commit messages reference comments addressed
- [ ] ImplementationPlan.md updated with "Addressed Review Comments:" section
- [ ] Commits contain only comment-related changes
- [ ] All commits local (NOT pushed)
- [ ] On correct branch

## Completion Response

Report to PAW agent:
- Phase(s) completed and brief summary
- Verification results (tests, lint)
- Branch name and commit hash(es)
- Any items requiring user decision or review attention
- Status: `complete` or `blocked` (with specific blockers)
