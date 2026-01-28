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

## Be Skeptical

- Question vague requirements—ask "why" and "what about"
- Identify potential issues early
- Don't assume—verify with code research
- If user corrects a misunderstanding, verify the correction against code before accepting

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
[What we're implementing and why]

## Current State Analysis
[Existing state, gaps, key constraints from research]

## Desired End State
[Target state specification and verification approach]

## What We're NOT Doing
[Out-of-scope items]

## Phase Summary
1. **Phase 1: [Name]** - [Objective]
2. **Phase 2: [Name]** - [Objective]
...

---

## Phase 1: [Name]

### Changes Required:
- **`path/to/file.ext`**: [Component changes, pattern references]
- **Tests**: [Test file, key scenarios]

### Success Criteria:

#### Automated Verification:
- [ ] Tests pass: `<command>`
- [ ] Lint/typecheck: `<command>`

#### Manual Verification:
- [ ] [User-observable behavior]
- [ ] [Edge cases requiring human judgment]

---

## Phase N: Documentation (if warranted)

### Changes Required:
- **`.paw/work/<work-id>/Docs.md`**: Technical reference (load `paw-docs-guidance`)
- **Project docs**: Per CodeResearch.md findings

### Success Criteria:
- [ ] Docs build: `<command>`
- [ ] Content accurate, style consistent

---

## References
- Issue: [link or 'none']
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

> **Reference**: Load `paw-git-operations` skill for branch naming, commit mechanics, and PR descriptions.

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

### Blocked on Open Questions

If planning encounters questions that cannot be answered from existing artifacts (Spec.md, CodeResearch.md):

1. **Do NOT write ImplementationPlan.md** — partial artifacts cause confusion on re-invocation
2. **Return to PAW agent** with:
   - Status: `blocked`
   - List of specific open questions
   - What research or clarification would resolve each question
3. **PAW agent handles resolution** based on Review Policy:
   - `never`: PAW agent conducts additional research to resolve questions autonomously
   - `always`/`milestones`: PAW agent asks user for clarification
4. **Re-invocation**: PAW agent calls planning again with answers provided in the delegation prompt
