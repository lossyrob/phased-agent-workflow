---
name: paw-planning
description: Implementation planning activity skill for PAW workflow. Creates phased implementation plans with clear success criteria, documentation phase planning, and strategic architectural descriptions.
---

# Implementation Planning

> **Execution Context**: This skill runs **directly** in the PAW session (not a subagent), preserving user interactivity for phase decisions and blocker handling.

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

Include documentation as the **final implementation phase**. The documentation phase is standard for all non-trivial changes.

### What the Documentation Phase Produces

1. **Docs.md** (always): Technical reference capturing implementation details, usage, and verification approach—serves as the "as-built" record even for internal changes
2. **Project documentation updates** (when warranted): README, CHANGELOG, guides following project conventions
3. **Documentation build verification**: Command from CodeResearch.md (if framework discovered)

### When to Include Project Docs

- Work creates user-facing features
- APIs are added or changed
- Existing behavior is modified in ways users should know about

### When to Omit Project Docs

- Purely internal changes (Docs.md still required)
- Refactors without behavior changes (Docs.md still required)
- User explicitly indicates no project docs needed

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

## Phase Status
- [ ] **Phase 1: [Name]** - [Objective]
- [ ] **Phase 2: [Name]** - [Objective]
- [ ] **Phase N: Documentation** - [If warranted]

## Phase Candidates
<!-- Use checkbox format for each candidate so transition checks can detect unresolved items.
     Example: - [ ] Moderator mode support -->

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

**Phase Status format**: Use checkboxes `- [ ]` for pending, `- [x]` for complete. This provides at-a-glance status without heavy tables.

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

### Plan Revision

When revising based on paw-plan-review feedback:

**Desired end state**: ImplementationPlan.md updated to address all BLOCKING issues

1. Read paw-plan-review feedback completely
2. Address BLOCKING issues first (these prevent implementation)
3. Address IMPROVE issues if scope permits
4. Acknowledge NOTE items in commit message if applicable
5. Re-run quality checklist to verify fix didn't introduce new issues

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
- [ ] Phase Status exists with checkbox phases and one-sentence objectives
- [ ] Phase Candidates section present (may be empty initially)

## Completion Response

Report to PAW agent:
- Artifact path: `.paw/work/<work-id>/ImplementationPlan.md`
- **Plan summary** for quick review:
  - Architecture approach (1-2 sentences)
  - Phase overview (numbered list with one-line objective each)
  - What's explicitly NOT being done (scope boundaries)
- Review Strategy used (PR created or committed to target)
- Any items requiring user decision or observations worth noting

### Blocked on Open Questions

If planning encounters questions that cannot be answered from existing artifacts (Spec.md, CodeResearch.md):

1. **Do NOT write ImplementationPlan.md** — partial artifacts cause confusion on re-invocation
2. **Return to PAW agent** with:
   - Status: `blocked`
   - List of specific open questions
   - What research or clarification would resolve each question
3. **PAW agent handles resolution** based on Review Policy:
   - `final-pr-only`: PAW agent conducts additional research to resolve questions autonomously
   - `every-stage`/`milestones`: PAW agent asks user for clarification
4. **Re-invocation**: PAW agent calls planning again with answers provided in the delegation prompt
