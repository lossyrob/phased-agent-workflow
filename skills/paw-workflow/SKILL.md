---
name: paw-workflow
description: Reference documentation for PAW multi-phase implementation workflows. Provides activity tables, artifact structure, stage guidance, and PR routing patterns. Workflow enforcement rules are in PAW.agent.md.
---

# PAW Implementation Workflow Skill

**Reference Documentation**: This skill provides guidance on typical patterns, artifact structure, and stage sequences. Workflow enforcement (mandatory transitions, TODO tracking, pause rules) is in the PAW agent, not this skill.

Prerequisite: WorkflowContext.md must exist (created by `paw-init`).

## Core Implementation Principles

These principles apply to ALL implementation stages.

### 1. Evidence-Based Documentation

Code-related claims in any artifact MUST be supported by:
- Specific file:line references for code claims
- Concrete code patterns or test results
- Direct evidence from the codebase

For non-code claims (e.g., requirements or planning decisions), cite the source when available (issue/discussion/user input) and clearly label assumptions.

Do not present speculation, assumptions, or unverified claims as fact.

### 2. File:Line Reference Requirement

All code-related claims require specific file:line citations:
- `[src/module.ts:45](src/module.ts#L45)` for single lines
- `[src/module.ts:45-52](src/module.ts#L45-L52)` for ranges
- Multiple locations listed explicitly

### 3. No Fabrication Guardrail

**CRITICAL**: Do not fabricate, invent, or assume information:
- If information is unavailable, state "Not found" or "Unable to determine"
- Do not hallucinate file contents, function behaviors, or patterns
- When uncertain, document the uncertainty explicitly

### 4. Artifact Completeness

Each stage produces complete, well-structured artifacts:
- No placeholders or "TBD" markers
- No unresolved questions blocking downstream stages
- Each artifact is self-contained and traceable to sources

### 5. Human Authority

Humans have final authority over all workflow decisions:
- Review pauses honor human review preferences
- Implementation choices can be overridden
- Artifacts are advisory until human-approved

## Activities

| Skill | Capabilities | Primary Artifacts |
|-------|--------------|-------------------|
| `paw-spec` | Create spec, revise spec | Spec.md |
| `paw-spec-research` | Answer factual questions about existing system | SpecResearch.md |
| `paw-spec-review` | Review spec for quality, completeness, clarity | Review feedback |
| `paw-code-research` | Document implementation details with file:line refs | CodeResearch.md |
| `paw-planning` | Create implementation plan, revise plan (single/multi-model) | ImplementationPlan.md, planning/ |
| `paw-plan-review` | Review plan for feasibility, spec alignment (single/multi-model) | Review feedback, PLAN-REVIEW-*.md in planning/ |
| `paw-implement` | Execute plan phases, make code changes | Code files, Docs.md |
| `paw-impl-review` | Review implementation quality, return verdict | Review feedback |
| `paw-final-review` | Pre-PR review with multi-model or single-model | REVIEW*.md in reviews/ |
| `paw-pr` | Pre-flight validation, create final PR | Final PR |

**Note**: Phase PR creation is handled by PAW agent (using `paw-git-operations`) after `paw-impl-review` passes.

**Utility skills**: `paw-git-operations` (branching, Phase PRs), `paw-review-response` (PR comments), `paw-docs-guidance` (documentation).

## Artifact Directory Structure

All implementation artifacts are stored in a consistent directory structure:

```
.paw/work/<work-id>/
├── WorkflowContext.md      # Configuration and state
├── WorkShaping.md          # Pre-spec ideation output (optional, from paw-work-shaping)
├── Spec.md                 # Feature specification
├── SpecResearch.md         # Research answers (optional)
├── CodeResearch.md         # Implementation details with file:line refs
├── ImplementationPlan.md   # Phased implementation plan
├── Docs.md                 # Technical documentation (created during final implementation phase)
├── prompts/                # Generated prompt files (optional)
├── planning/              # Multi-model planning artifacts (gitignored)
│   ├── PLAN-{MODEL}.md          # Per-model plan drafts
│   ├── CRITIQUE-{MODEL}.md      # Debate artifacts (deep mode only)
│   ├── PLAN-REVIEW-{MODEL}.md   # Per-model review verdicts
│   └── PLAN-REVIEW-SYNTHESIS.md # Weighted review synthesis
└── reviews/                # Final Agent Review artifacts (gitignored)
    ├── REVIEW.md           # Single-model review
    ├── REVIEW-{MODEL}.md   # Per-model reviews (multi-model)
    └── REVIEW-SYNTHESIS.md # Synthesis (multi-model)
```

**Work ID Derivation**: Normalized from Work Title, lowercase with hyphens (e.g., "Auth System" → "auth-system").

## Default Flow Guidance

Typical greenfield progression (adapt based on user intent and workflow state):

### Specification Stage
1. `paw-spec`: Create specification from brief/issue
2. `paw-spec-research` (if needed): Answer factual questions
3. `paw-spec-review`: Review spec quality

### Planning Stage
1. `paw-code-research`: Document implementation details with file:line references
2. `paw-planning`: Create phased implementation plan
3. `paw-plan-review`: Review plan feasibility

### Implementation Stage
Per phase in ImplementationPlan.md:
1. `paw-implement`: Execute phase, make code changes
2. `paw-impl-review`: Review changes (returns verdict)
3. Phase PR created (PRs strategy) or push (local strategy)

**Phase Candidates**: During implementation, new ideas can be captured in the `## Phase Candidates` section of ImplementationPlan.md. When all planned phases complete, `paw-transition` returns `promotion_pending = true` if unresolved candidates exist. The orchestrator presents each candidate to the user with options: Promote (elaborate into a full phase), Skip, or Defer. Terminal markers (`[promoted]`, `[skipped]`, `[deferred]`, `[not feasible]`) resolve candidates.

Final phase typically includes documentation (Docs.md, README, CHANGELOG).

### Final Review Stage (if enabled)
1. `paw-final-review`: Review full implementation against spec
2. Interactive: apply/skip/discuss findings; Non-interactive: auto-apply

### Finalization Stage
1. `paw-pr`: Pre-flight validation, create final PR

## PR Comment Response Routing

| PR Type | Skill to Load | Notes |
|---------|--------------|-------|
| Planning PR | `paw-planning` | Comments on ImplementationPlan.md |
| Phase PR | `paw-implement` → `paw-impl-review` | Code changes then verify |
| Final PR | `paw-implement` → `paw-impl-review` | May require code changes |

Load `paw-review-response` utility skill for comment mechanics.

## Execution Model

**Direct execution**: `paw-spec`, `paw-planning`, `paw-implement`, `paw-final-review`, `paw-pr`, `paw-init`, `paw-status`, `paw-work-shaping`

**Subagent delegation**: `paw-spec-research`, `paw-code-research`, `paw-spec-review`, `paw-plan-review`, `paw-impl-review`

**Orchestrator-handled**: Push and Phase PR creation (after `paw-impl-review` passes, using `paw-git-operations`)

Activities may return `blocked` status with open questions. Apply Review Policy to determine resolution approach (`never`: research autonomously; `always`/`milestones`: ask user).

## Workflow Mode

- **Full**: All stages, multiple phases, PRs or local strategy
- **Minimal**: May skip spec stage, single phase, forces local strategy
- **Custom**: Read Custom Workflow Instructions from WorkflowContext.md
