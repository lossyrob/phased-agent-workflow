---
name: paw-planning
description: Implementation planning activity skill for PAW workflow. Creates phased implementation plans with clear success criteria, documentation phase planning, and strategic architectural descriptions.
---

# Implementation Planning

Create detailed implementation plans through interactive refinement. Plans describe WHAT to build (components, interfaces, behaviors) at the architectural level, delegating HOW to implement to the implementer.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Capabilities

- Create implementation plan from spec and research
- Revise plan based on learnings or feedback
- Address PR review comments (load `paw-review-response` for mechanics)
- Plan documentation phases when documentation updates are warranted

## Core Principles

1. **Be Skeptical**: Question vague requirements, identify issues early, verify with code
2. **Be Thorough**: Read all context completely, research patterns, include file:line references
3. **Be Practical**: Incremental testable changes, consider migration/rollback, handle edge cases
4. **No Open Questions**: Resolve all unknowns before finalizing—no TBD or placeholder content
5. **Idempotent Updates**: Same inputs produce minimal diffs; preserve completed sections
6. **Strategic Not Tactical**: Describe component purposes and interfaces, not implementation code

## Strategic Planning Guidelines

Operate at the **C4 container/component abstraction level**:

**Do**:
- Describe component responsibilities and interfaces
- Reference file paths, module names, existing patterns
- Present 2-3 options with trade-offs for significant decisions
- Define success via observable outcomes (tests, SLOs, acceptance criteria)
- Limit code snippets to 3-10 lines for critical architectural concepts only

**Don't**:
- Include complete function implementations
- Provide pseudo-code walkthroughs
- Specify library choices without trade-off analysis
- Write tutorial-style code examples

**Example descriptions**:
- ✅ "Implement `UserRepository` interface with CRUD methods, following pattern in `models/repositories/`"
- ✅ "Add auth middleware validating JWT tokens, integrating with `services/auth/`"
- ❌ "Create function that loops through array and filters..."

## Documentation Phase Planning

Include documentation as the **final implementation phase** when warranted.

### When to Include

- Work creates user-facing features
- APIs are added or changed
- Existing behavior is modified in ways worth documenting
- CodeResearch.md shows documentation infrastructure exists

### When to Omit

- Purely internal changes
- Refactors without behavior changes
- User explicitly indicates no docs needed

### What to Specify

When including a documentation phase:

1. **Docs.md creation**: Comprehensive technical reference for the feature
2. **Project documentation updates**: README, CHANGELOG, guides following project conventions
3. **Documentation build verification**: Command from CodeResearch.md (if framework discovered)

**Note**: Implementer loads `paw-docs-guidance` utility skill for templates and conventions during documentation phases.

## ImplementationPlan.md Template

Save to: `.paw/work/<work-id>/ImplementationPlan.md`

```markdown
# [Feature/Task Name] Implementation Plan

## Overview

[Brief description of what we're implementing and why]

## Current State Analysis

[What exists now, what's missing, key constraints discovered]

## Desired End State

[Specification of the desired end state and how to verify it]

### Key Discoveries:
- [Important finding with file:line reference]
- [Pattern to follow]
- [Constraint to work within]

## What We're NOT Doing

[Explicitly list out-of-scope items to prevent scope creep]

## Implementation Approach

[High-level strategy and reasoning]

## Phase Summary

1. **Phase 1: [Name]** - [One-sentence objective]
2. **Phase 2: [Name]** - [One-sentence objective]
...

---

## Phase 1: [Descriptive Name]

### Overview
[What this phase accomplishes]

### Changes Required:

#### 1. [Component/File Group]
**File**: `path/to/file.ext`
**Changes**: 
- Implement `ComponentName` following pattern in `path/to/reference.ext`
- Add methods: `methodName()`, `propertyName`
- Integrate with `DependencyName` at `path/to/dependency.ext`

**Tests**:
- Unit tests in `path/to/component.test.ext`
- Test cases: [key scenarios]
- Follow patterns in `path/to/existing.test.ext`

### Success Criteria:

#### Automated Verification:
- [ ] Tests pass: `<test command>`
- [ ] Linting passes: `<lint command>`
- [ ] Type checking passes: `<typecheck command>`

#### Manual Verification:
- [ ] Feature works as expected when tested
- [ ] Edge cases handled correctly

---

## Phase N: Documentation (if warranted)

### Overview
Create feature documentation and update project docs.

### Changes Required:

#### 1. Feature Documentation
**File**: `.paw/work/<work-id>/Docs.md`
**Changes**: Create comprehensive technical reference (load `paw-docs-guidance` for template)

#### 2. Project Documentation
**Files**: Based on CodeResearch.md Documentation System findings
**Changes**: Update README, CHANGELOG, guides following project conventions

### Success Criteria:

#### Automated Verification:
- [ ] Documentation builds: `<build command from CodeResearch.md>`
- [ ] Links valid: `<link check command if available>`

#### Manual Verification:
- [ ] Documentation accurately describes feature
- [ ] Style matches existing project docs

---

## References

- Original Issue: [link or 'none']
- Spec: `.paw/work/<work-id>/Spec.md`
- Research: `.paw/work/<work-id>/SpecResearch.md`, `.paw/work/<work-id>/CodeResearch.md`
```

## Execution Contexts

### Initial Planning

**Desired end state**: Complete ImplementationPlan.md with all phases defined

1. Read all context: Issue, Spec.md, SpecResearch.md, CodeResearch.md
2. Analyze and verify requirements against actual code
3. Present understanding and resolve blocking questions
4. Research patterns and design options (if significant choices exist)
5. Write plan incrementally (outline, then phase by phase)
6. Handle branching per Review Strategy (see below)

### PR Review Response

When addressing Planning PR comments, load `paw-review-response` utility for mechanics.

**Desired end state**: All review comments addressed, artifacts consistent

1. Verify on planning branch (`<target>_plan`)
2. Read all unresolved PR comments
3. Create TODOs for comments (group related, separate complex)
4. For each TODO: make changes → commit → push → reply
5. Verify all comments addressed and artifacts consistent

## Branching and Commits

> **Reference**: Load `paw-git-operations` skill for branch naming and staging mechanics.

### PRs Strategy

1. Checkout target branch, pull latest
2. Create planning branch: `<target>_plan`
3. Commit planning artifacts
4. Push and create PR: `<target>_plan` → `<target>`

**PR Description**:
- Title: `[<Work Title>] Planning: <brief description>`
- Body: Scale to plan complexity (simple → link to plan; complex → include summary)
- Footer: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`

### Local Strategy

1. Ensure on target branch
2. Commit planning artifacts directly
3. Push to target branch
4. Skip intermediate PR

### Selective Staging

Before staging `.paw/` artifacts, check if `.paw/work/<work-id>/.gitignore` exists:
- If exists: skip `.paw/` artifacts (tracking disabled)
- If not: stage all changed files

Always use `git add <file1> <file2>` (never `git add .`).

## Quality Checklist

- [ ] All phases contain specific file paths, components, or interfaces
- [ ] Every phase has measurable automated and manual success criteria
- [ ] Phases build incrementally and can be reviewed independently
- [ ] Zero open questions or TBDs remain
- [ ] All references trace to Spec.md and CodeResearch.md
- [ ] Unit tests specified alongside code they test within each phase
- [ ] "What We're NOT Doing" section prevents scope creep
- [ ] Code blocks absent or limited to <10 lines for architectural concepts
- [ ] Documentation phase included (or explicitly omitted with reason)
- [ ] Phase Summary exists with numbered phases and one-sentence objectives

## Completion Response

Report to PAW agent:
- Artifact path: `.paw/work/<work-id>/ImplementationPlan.md`
- Number of phases and brief summary
- Review Strategy used (PR created or committed to target)
- Any items requiring user decision
