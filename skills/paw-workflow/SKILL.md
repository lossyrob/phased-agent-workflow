---
name: paw-workflow
description: Guides multi-phase software implementation by coordinating activity skills through specification, planning, phased code changes with review, and PR creation. Assumes WorkflowContext.md exists (created by paw-init bootstrap skill). Provides default flow guidance, transition mechanisms, and PR comment routing.
---

# PAW Implementation Workflow Skill

This workflow skill orchestrates multi-phase software implementation, guiding an agent through specification, planning, implementation, and finalization stages. An agent using this workflow discovers available skills dynamically via `paw_get_skills` and uses this skill as a reference guide for typical patterns and orchestration.

**Prerequisite**: This workflow skill assumes `WorkflowContext.md` already exists. The `paw-init` bootstrap skill must run first to create the workflow directory, WorkflowContext.md, and git branch.

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

This section distinguishes:
- **Activity skills**: produce workflow artifacts and represent major stages (listed in the table below)
- **Bootstrap skills**: set up the workflow workspace (e.g., `paw-init`)
- **Utility skills**: support common mechanics used by activity skills (e.g., `paw-review-response` for PR comment response workflows)

Only **activity skills** are listed in the Activities table.

This table documents typical usage patterns for activities, which each have associate skills:

| Skill | Capabilities | Primary Artifacts |
|-------|--------------|-------------------|
| `paw-spec` | Create spec, revise spec, align with downstream artifacts | Spec.md |
| `paw-spec-research` | Answer factual questions about existing system | SpecResearch.md |
| `paw-spec-review` | Review spec for quality, completeness, clarity; return structured feedback | Review feedback |
| `paw-code-research` | Document implementation details with file:line refs | CodeResearch.md |
| `paw-planning` | Create implementation plan, revise plan, address PR comments | ImplementationPlan.md |
| `paw-plan-review` | Review plan for feasibility, spec alignment; return structured feedback | Review feedback |
| `paw-implement` | Execute plan phases, make code changes, create/update docs, address PR comments | Code files, Docs.md |
| `paw-impl-review` | Review implementation, add inline docs, open PRs | Phase PRs |
| `paw-pr` | Pre-flight validation, create final PR | Final PR |

## Artifact Directory Structure

All implementation artifacts are stored in a consistent directory structure:

```
.paw/work/<work-id>/
├── WorkflowContext.md      # Configuration and state
├── Spec.md                 # Feature specification
├── SpecResearch.md         # Research answers (optional)
├── CodeResearch.md         # Implementation details with file:line refs
├── ImplementationPlan.md   # Phased implementation plan
├── Docs.md                 # Technical documentation (created during final implementation phase)
└── prompts/                # Generated prompt files (optional)
```

**Work ID Derivation**: Normalized from Work Title, lowercase with hyphens (e.g., "Auth System" → "auth-system").

## Default Flow Guidance

This section describes the typical greenfield implementation progression. The agent uses this as guidance—not rigid rules—and adapts based on user intent and workflow state.

### Specification Stage

**Skills**: `paw-spec`, `paw-spec-research`, `paw-spec-review`

**Typical Sequence**:
1. `paw-spec` (initial): Create specification from brief/issue
2. `paw-spec-research` (if needed): Answer factual questions about existing system
3. `paw-spec` (resume): Integrate research findings into specification
4. `paw-spec-review`: Review spec for quality, completeness, and clarity
5. If review identifies issues: `paw-spec` (revise) based on feedback

**Stage Gate**: Verify Spec.md exists and passes spec-review quality criteria before proceeding.

### Planning Stage

**Skills**: `paw-code-research`, `paw-planning`, `paw-plan-review`

**Typical Sequence**:
1. `paw-code-research`: Document implementation details with file:line references
2. `paw-planning`: Create phased implementation plan based on spec and research
3. `paw-plan-review`: Review plan for feasibility, spec alignment, and completeness
4. If review identifies issues: `paw-planning` (revise) based on feedback

**Stage Gate**: Verify CodeResearch.md and ImplementationPlan.md exist and plan passes plan-review quality criteria before proceeding.

### Implementation Stage

**Skills**: `paw-implement`, `paw-impl-review`

**Typical Sequence** (per phase in ImplementationPlan.md):
1. `paw-implement`: Execute phase, make code changes, run verification
2. `paw-impl-review`: Review changes, add inline documentation, open Phase PR (PRs strategy)

**Repeat** for each phase in the implementation plan.

**Documentation Phase**: The final implementation phase typically includes documentation work—creating Docs.md, updating README, CHANGELOG, and any project guides. This keeps documentation in the same review flow as code changes.

**Stage Gate**: All plan phases completed (including documentation phase) with passing verification.

### Finalization Stage

**Skills**: `paw-pr`

**Typical Sequence**:
1. `paw-pr`: Run pre-flight validation, create final PR to main

**Stage Gate**: Final PR created with all artifacts linked.

## Default Transition Table

This table documents typical stage transitions as default guidance.

Two separate mechanisms are involved:
- **Orchestrator session boundaries**: When Session Policy is `per-stage`, the PAW orchestrator may start a fresh PAW agent session using `paw_call_agent` (a "session reset"). The call should include a resume hint (what workflow point to resume at) so the new session can pick up correctly.
- **Activity execution**: The actual work of each activity skill is executed in a delegated worker session (a subagent) via `runSubagent`, regardless of Session Policy.

| Transition | Milestone? | Session Policy: `per-stage` (orchestrator) | Activity execution |
|------------|------------|------------------------------------------|------------------|
| spec → spec-research | No | (same session) | `runSubagent` (`paw-spec-research`) |
| spec-research → spec (resume) | No | (same session) | `runSubagent` (`paw-spec`) |
| spec → spec-review | No | (same session) | `runSubagent` (`paw-spec-review`) |
| spec-review → spec (revise) | No | (same session) | `runSubagent` (`paw-spec`) |
| spec-review pass → code-research | No | `paw_call_agent` (new PAW session w/ resume hint) | `runSubagent` (`paw-code-research`) |
| code-research → planning | No | (same session) | `runSubagent` (`paw-planning`) |
| planning → plan-review | No | (same session) | `runSubagent` (`paw-plan-review`) |
| plan-review → planning (revise) | No | (same session) | `runSubagent` (`paw-planning`) |
| plan-review pass → implement | **Yes** | `paw_call_agent` (new PAW session w/ resume hint) | `runSubagent` (`paw-implement`) |
| implement → impl-review (within phase) | No | (same session) | `runSubagent` (`paw-impl-review`) |
| phase N complete → phase N+1 | **Yes** | `paw_call_agent` (new PAW session w/ resume hint) | `runSubagent` (`paw-implement`) |
| all phases complete → final-pr | **Yes** | `paw_call_agent` (new PAW session w/ resume hint) | `runSubagent` (`paw-pr`) |

**Mechanism Selection**:
- **per-stage Session Policy**: Use `paw_call_agent` only at stage boundaries to start a fresh PAW agent session, then delegate the intended activity via `runSubagent`
- **continuous Session Policy**: Keep a single PAW agent session throughout; still delegate activities via `runSubagent`

**Review Activity Notes**:
- `paw-spec-review` and `paw-plan-review` run in subagents to manage context isolation
- Review activities return structured feedback (pass/fail + specific issues), NOT orchestration decisions
- The PAW agent decides whether to proceed or iterate based on review feedback

## Review Policy Behavior

Review Policy controls when the workflow pauses for human review. Boundaries are at the **artifact level**, not stage level.

### Policy Values

**`always`** (setting value): When Review Policy is set to `always`, pause after every artifact is produced for potential iteration
- Pause after: WorkflowContext.md, Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, each Phase PR completion, Final PR

**`milestones`**: Pause only at milestone artifacts; auto-proceed at non-milestone artifacts
- **Milestone artifacts** (pause): Spec.md, ImplementationPlan.md, Phase PR completion, Final PR creation
- **Non-milestone artifacts** (auto-proceed): WorkflowContext.md, SpecResearch.md, CodeResearch.md, Docs.md (part of implementation phase), intermediate commits

**`never`**: Never pause, proceed continuously without review pauses
- Workflow continues automatically through all stages
- Human can still intervene at any time

### Applying Review Policy

After producing an artifact:
1. Determine if artifact is a milestone (see list above)
2. Check Review Policy from WorkflowContext.md
3. If pause required: Present status and wait for user
4. If auto-proceed: Continue to next activity

## Session Policy Behavior

Session Policy controls conversation context management across stage transitions.

### Policy Values

**`per-stage`**: Stage boundaries start a fresh PAW agent session via `paw_call_agent`
- Reduces context accumulation in the orchestrator
- `paw_call_agent` should include a resume hint (e.g., intended next activity + relevant artifact paths)
- The new PAW agent session re-loads this workflow skill, validates/derives actual workflow state from artifacts, then delegates the intended activity via `runSubagent`

**`continuous`**: Single PAW agent session throughout the workflow
- Preserves orchestrator context across stage boundaries
- Activities are still executed via delegated worker sessions (`runSubagent`)
- *Implementation note*: Verify delegated-worker behavior matches expectations in VS Code's model

### Applying Session Policy

When transitioning to next activity:
1. Check Session Policy from WorkflowContext.md
2. If `per-stage`: Use `paw_call_agent` at stage boundaries to start a fresh PAW agent session with a resume hint; the new session delegates the intended activity via `runSubagent`
3. If `continuous`: Keep the same PAW agent session and delegate the intended activity via `runSubagent`

## PR Comment Response Guidance

When PRs have review comments that need addressing, route to the appropriate skill:

| PR Type | Skill to Load | Notes |
|---------|--------------|-------|
| Planning PR | `paw-planning` | Comments on ImplementationPlan.md |
| Phase PR | `paw-implement` → `paw-impl-review` | Implementer makes changes, reviewer verifies and pushes |
| Final PR | `paw-implement` → `paw-impl-review` | May require code changes; reviewer verifies |

Subagents performing these activities load `paw-review-response` utility skill for the mechanics of:
- Reading unresolved comments
- Creating TODO lists per comment
- Committing with comment references
- Pushing and replying to comments

## Subagent Completion Contract

All activity execution MUST occur in delegated worker sessions (subagents):
- Subagents execute activities by loading the appropriate activity skill via `paw_get_skill`.
- Ensure sufficient prompting to the subagent, including telling them which activity skill to load first
- Subagents do NOT make handoff decisions
- The agent executing the workflow (you) owns routing and transition logic

### Response Format

Upon completion, subagents respond where the artifact was written, if artifacts were produced, otherwise a textual response (e.g., review feedback). If there were errors or the activity was not completed, the subagent MUST indicate failure with an explanation.

### Skill Loading Requirement

**Every subagent MUST load their skill FIRST**:
1. Call `paw_get_skill` with the skill name
2. Read and internalize the skill instructions
3. Only then begin executing the activity

### Delegation Prompt Construction

The orchestrating agent constructs delegation prompts that include:
- Skill to load
- Activity goal (what to accomplish)
- Relevant artifact paths
- User context (only when relevant to the activity)

## Intelligent Routing Guidance

The agent reasons about user intent and routes requests intelligently. This section provides guidance—not rigid rules.

### Intent-Based Routing

1. **Analyze user request**: What do they want to accomplish?
2. **Consult skill catalog**: Which skill has this capability?
3. **Consider workflow state**: What artifacts exist? What's the current stage?
4. **Construct delegation**: Build meaningful prompt with context

### Non-Linear Request Examples

The workflow supports non-linear paths when appropriate:

| User Request | Routing |
|-------------|---------|
| "Update spec to align with plan changes" | `paw-spec` with alignment context |
| "Do more research on X" | `paw-spec-research` or `paw-code-research` based on X |
| "Revise phase 2 of the plan" | `paw-planning` with revision context |
| "Review the spec for quality" | `paw-spec-review` in subagent |
| "Check if the plan is ready" | `paw-plan-review` in subagent |
| "Add error handling to implementation" | `paw-implement` with specific request |

### Request vs Activity Goal

Not every delegation includes the original user request verbatim. The orchestrating agent constructs an **activity goal** appropriate for the skill:

- **Direct request**: "Create the specification" → goal: "Create specification from issue brief"
- **Contextual request**: "Update spec to match plan" → goal: "Revise specification to align with ImplementationPlan.md changes, specifically [details from user]"

## Workflow Mode Handling

Read Workflow Mode from WorkflowContext.md and adapt behavior:

### Full Mode

Standard multi-phase implementation:
- All stages apply (spec → planning → implementation → finalization)
- Multiple phases in implementation plan
- Review Strategy determines branching (PRs or local)

### Minimal Mode

Simplified single-phase implementation:
- May skip specification stage if already exists
- Single phase in implementation plan
- Forces local Review Strategy (no intermediate PRs)

### Custom Mode

User-defined workflow:
- Read Custom Workflow Instructions from WorkflowContext.md
- Adapt stage sequence and phase structure per instructions
- May skip or reorder stages
