---
name: paw-planning
description: Implementation planning activity skill for PAW workflow. Creates phased implementation plans with clear success criteria, documentation phase planning, and strategic architectural descriptions.
---

# Implementation Planning

> **Execution Context**: This skill runs **directly** in the PAW session (not a subagent), preserving user interactivity for phase decisions and blocker handling.

Create detailed implementation plans through interactive refinement. Plans describe WHAT to build (components, interfaces, behaviors) at the architectural level, delegating HOW to implement to the implementer.

> **Reference**: Follow Core Implementation Principles from `paw-workflow` skill.

## Configuration

### Step 1: Read Plan Generation Mode

Read WorkflowContext.md for:
- Work ID and target branch
- `Plan Generation Mode`: `single-model` | `multi-model` | `multi-model-deep`
- `Plan Generation Models`: comma-separated model names (for multi-model modes)

The plan generation mode is set during `paw-init`. If the field is missing (legacy workflow), default to `single-model` (backwards compatibility).

{{#cli}}
If mode is `multi-model` or `multi-model-deep`, parse the models list. Default: `latest GPT, latest Gemini, latest Claude Opus`.
{{/cli}}
{{#vscode}}
**Note**: VS Code only supports `single-model` mode. If `multi-model` or `multi-model-deep` is configured, report to user: "Multi-model plan generation not available in VS Code; running single-model planning." Proceed with single-model.
{{/vscode}}

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
<!-- Lightweight capture of potential phases identified during implementation.
     Add one-liner descriptions here; elaborate into full phases later via promotion. -->

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

**If single-model plan generation mode** (default):
1. Read all context: Issue, Spec.md, SpecResearch.md, CodeResearch.md
2. Analyze and verify requirements against actual code
3. Present understanding and resolve blocking questions
4. Research patterns and design options (if significant choices exist)
5. Write plan incrementally (outline, then phase by phase)
6. Handle branching per Review Strategy (see below)

{{#cli}}
**If multi-model or multi-model-deep plan generation mode**:

1. Read all context: Issue, Spec.md, SpecResearch.md, CodeResearch.md
2. Create `.paw/work/<work-id>/planning/` directory if it doesn't exist
3. Create `.paw/work/<work-id>/planning/.gitignore` with content `*` (if not already present)
4. Resolve model intents to actual model names (e.g., "latest GPT" → current GPT model)
5. Present resolved models for confirmation:
   ```
   About to run multi-model plan generation with:
   - [resolved model 1]
   - [resolved model 2]
   - [resolved model 3]

   Mode: [multi-model | multi-model-deep]
   Estimated LLM calls: [N+1 for multi-model | 2N+1 for multi-model-deep] (N = number of models)

   Proceed?
   ```

6. **Round 1 — Independent Plans (parallel)**: Spawn parallel subagents using `task` tool with `model` parameter for each model. Each subagent receives the planning subagent prompt below along with the full contents of Spec.md, CodeResearch.md, and SpecResearch.md. Save per-model plans to `PLAN-{MODEL}.md` in the `planning/` subfolder.

7. **If multi-model-deep — Round 2 — Critique/Debate (parallel)**: Spawn parallel subagents again. Each model receives all plan drafts (all `PLAN-{MODEL}.md` files) and the critique prompt below. Save critiques to `CRITIQUE-{MODEL}.md` in the `planning/` subfolder.

8. **Synthesis**: Read all per-model plans (and critiques in deep mode). Produce the final `ImplementationPlan.md` using the synthesis prompt below, selecting the best phase structure, architecture decisions, and catching blind spots.

**Failure handling**: If a subagent fails, proceed with remaining results if at least 2 models completed successfully. If fewer than 2 succeed, offer user the choice to retry or fall back to single-model plan generation. Configurations with exactly 2 models are valid — synthesis works with any count ≥ 2.

#### Planning Subagent Prompt

Each subagent receives this prompt (self-contained, since subagents cannot load skills):

> You are creating an implementation plan. You will receive a feature specification (Spec.md), codebase research (CodeResearch.md), and optionally spec research (SpecResearch.md).
>
> Create a complete implementation plan following this template structure: Overview, Current State Analysis, Desired End State, What We're NOT Doing, Phase Status (checkboxes), Phase Candidates, then detailed phases with Changes Required (file paths, components, tests) and Success Criteria (automated and manual verification).
>
> Guidelines:
> - Operate at the C4 container/component abstraction level — describe WHAT to build, not HOW
> - Reference specific file paths, module names, and existing patterns from CodeResearch.md
> - Each phase should be independently reviewable with clear success criteria
> - Include a Documentation phase as the final phase
> - Limit code snippets to 3-10 lines for critical architectural concepts only
> - Zero TBDs — all decisions must be made
> - Include "What We're NOT Doing" to prevent scope creep

#### Critique Prompt (deep mode only)

Each model receives all plan drafts and this prompt:

> You are reviewing multiple independently-created implementation plans for the same feature. Each plan is provided as PLAN-{MODEL}.md. You have access to all plans including your own.
>
> Analyze all plans and produce a structured critique covering:
> 1. **Strengths per plan** — best ideas worth keeping from each approach
> 2. **Where plans disagree** — different phasing strategies, architecture choices, component boundaries, and reasoning for which approach is better
> 3. **Risks and gaps** — issues any plan missed that others caught, or that all plans missed
> 4. **Recommended synthesis** — specific advice on which elements to take from each plan (e.g., "take phasing from Plan A, architecture from Plan B, edge case handling from Plan C")

#### Synthesis Prompt

The session's agent reads all per-model plans (and critiques in deep mode) and applies this approach:

> Synthesize the best elements from all plan drafts into a single final ImplementationPlan.md. Compare section-by-section across all plans:
> - **Phase structure**: Choose the best decomposition — consider granularity, independence, and logical ordering
> - **Architecture decisions**: Pick the strongest approach, noting where plans converged (high confidence) vs. diverged (needs careful selection)
> - **Success criteria**: Merge the most comprehensive and measurable criteria from all plans
> - **Scope boundaries**: Union of all "What We're NOT Doing" items
> - If critiques are available (deep mode), incorporate debate insights and address identified risks
>
> The output must follow the standard ImplementationPlan.md template format exactly.
{{/cli}}

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
- **Planning mode used**: single-model, multi-model, or multi-model-deep
- **Models** (if multi-model): list of models used and any failures
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
