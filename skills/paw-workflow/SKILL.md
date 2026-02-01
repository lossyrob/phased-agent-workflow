---
name: paw-workflow
description: Orchestrates PAW multi-phase software implementation workflows. Use when coordinating activity skills through specification, planning, phased implementation, and PR creation stages. Provides default flow guidance, transition mechanisms, session/review policy behavior, and PR comment routing. Requires WorkflowContext.md to exist (created by paw-init bootstrap skill).
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
- **Utility skills**: support common mechanics used by activity skills:
  - `paw-review-response` for PR comment response workflows
  - `paw-git-operations` for branch naming, strategy-based branching, and selective staging
  - `paw-docs-guidance` for documentation conventions, Docs.md template, and project doc update patterns

Only **activity skills** are listed in the Activities table.

This table documents typical usage patterns for activities, which each have associate skills:

| Skill | Capabilities | Primary Artifacts |
|-------|--------------|-------------------|
| `paw-spec` | Create spec, revise spec, align with downstream artifacts | Spec.md |
| `paw-spec-research` | Answer factual questions about existing system | SpecResearch.md |
| `paw-spec-review` | Review spec for quality, completeness, clarity; return structured feedback | Review feedback |
| `paw-code-research` | Document implementation details with file:line refs, discover docs infrastructure | CodeResearch.md |
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
├── WorkShaping.md          # Pre-spec ideation output (optional, from paw-work-shaping)
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

**Note**: If WorkShaping.md exists (from pre-spec ideation via `paw-work-shaping`), it serves as primary input to `paw-spec`.

**Typical Sequence**:
1. `paw-spec` (initial): Create specification from brief/issue (or WorkShaping.md if available)
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

**Handling Blocked Planning**: If `paw-planning` returns with open questions (no artifact written):
1. Check Review Policy:
   - `never`: Conduct additional `paw-code-research` to resolve questions, then re-invoke `paw-planning` with answers
   - `always`/`milestones`: Ask user for clarification, then re-invoke `paw-planning` with answers
2. Re-invoke `paw-planning` with answers included in delegation prompt

**Stage Gate**: Verify CodeResearch.md and ImplementationPlan.md exist and plan passes plan-review quality criteria before proceeding.

### Implementation Stage

**Skills**: `paw-implement`, `paw-impl-review`

**Typical Sequence** (per phase in ImplementationPlan.md):
1. `paw-implement`: Execute phase, make code changes, run verification
2. `paw-impl-review`: Review changes, add inline documentation, open Phase PR (PRs strategy)

**Repeat** for each phase in the implementation plan.

**Documentation Phase**: The final implementation phase typically includes documentation work—creating Docs.md, updating README, CHANGELOG, and any project guides. The implementer loads `paw-docs-guidance` utility skill for templates and conventions. Documentation research findings from CodeResearch.md inform which project docs to update. This keeps documentation in the same review flow as code changes.

**Stage Gate**: All plan phases completed (including documentation phase) with passing verification.

### Finalization Stage

**Skills**: `paw-pr`

**Typical Sequence**:
1. `paw-pr`: Run pre-flight validation, create final PR to main

**Stage Gate**: Final PR created with all artifacts linked.

## Default Transition Table

This table documents typical stage transitions as default guidance. The table reflects the hybrid execution model—interactive activities execute directly, research/review activities delegate to subagents.

Two separate mechanisms are involved:
- **Orchestrator session boundaries**: When Session Policy is `per-stage`, the PAW orchestrator may start a fresh PAW agent session using `paw_new_session` (a "session reset"). The call should include a resume hint so the new session can pick up correctly.
- **Activity execution**: Interactive activities execute directly in the PAW session; research/review activities delegate via `runSubagent`.

| Transition | Milestone? | Session Policy: `per-stage` | Activity Execution |
|------------|------------|----------------------------|--------------------|
| spec → spec-research | No | (same session) | Subagent |
| spec-research → spec (resume) | No | (same session) | Direct |
| spec → spec-review | No | (same session) | Subagent |
| spec-review → spec (revise) | No | (same session) | Direct |
| spec-review pass → code-research | No | `paw_new_session` | Subagent |
| code-research → planning | No | (same session) | Direct |
| planning → plan-review | No | (same session) | Subagent |
| plan-review → planning (revise) | No | (same session) | Direct |
| plan-review pass → implement | **Yes** | `paw_new_session` | Direct |
| implement → impl-review | No | (same session) | Direct |
| phase N complete → phase N+1 | **Yes** | `paw_new_session` | Direct |
| all phases complete → final-pr | **Yes** | `paw_new_session` | Direct |

**Session Policy Application**:
- **per-stage**: Use `paw_new_session` at stage boundaries for fresh PAW session
- **continuous**: Single PAW session throughout

**Notes**:
- `paw-spec-review` and `paw-plan-review` run in subagents for context isolation
- Review activities return structured feedback (pass/fail + issues), NOT orchestration decisions
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

**`per-stage`**: Stage boundaries start a fresh PAW agent session via `paw_new_session`
- Reduces context accumulation in the orchestrator
- `paw_new_session` should include a resume hint (e.g., intended next activity + relevant artifact paths)
- The new PAW agent session re-loads this workflow skill, validates/derives actual workflow state from artifacts, then delegates the intended activity via `runSubagent`

**`continuous`**: Single PAW agent session throughout the workflow
- Preserves orchestrator context across stage boundaries
- Activities are still executed via delegated worker sessions (`runSubagent`)
- *Implementation note*: Verify delegated-worker behavior matches expectations in VS Code's model

### Applying Session Policy

When transitioning to next activity:
1. Check Session Policy from WorkflowContext.md
2. If `per-stage`: Use `paw_new_session` at stage boundaries to start a fresh PAW agent session with a resume hint; the new session delegates the intended activity via `runSubagent`
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

## Execution Model

The PAW workflow uses a **hybrid execution model**: interactive activities execute directly in the PAW session, while research and review activities delegate to subagents.

### Activity Classification

| Activity | Execution | Rationale |
|----------|-----------|----------|
| `paw-spec` | Direct | User clarifies requirements interactively |
| `paw-planning` | Direct | Phase decisions, handling blockers |
| `paw-implement` | Direct | Adapting to reality, user course-correction |
| `paw-impl-review` | Direct | May need user input on review scope |
| `paw-pr` | Direct | PR description, final checks |
| `paw-init` | Direct | Bootstrap needs user input |
| `paw-status` | Direct | Simple, no context isolation benefit |
| `paw-work-shaping` | Direct | Interactive Q&A by design |
| `paw-spec-research` | Subagent | "Answer these questions" - returns results |
| `paw-code-research` | Subagent | "Document details" - returns results |
| `paw-spec-review` | Subagent | "Review and report" - returns feedback |
| `paw-plan-review` | Subagent | "Review and report" - returns feedback |

### Direct Execution Pattern

For interactive activities, the PAW agent:
1. Loads the skill via `paw_get_skill`
2. Executes the activity directly in the current session
3. Interacts with user as needed during execution
4. Continues workflow after completion

### Subagent Delegation Pattern

For research and review activities:
- Subagents execute by loading the appropriate activity skill via `paw_get_skill`
- Ensure sufficient prompting, including which skill to load first
- Subagents do NOT make handoff decisions
- The PAW agent owns routing and transition logic

### Subagent Response Format

Upon completion, subagents respond where the artifact was written (if produced) or provide textual feedback (e.g., review results). Subagents MUST indicate failure with explanation if activity was not completed.

### Blocked Activity Response

Activities may return `blocked` status with open questions instead of producing an artifact when:
- Required information is not available in existing artifacts
- Questions require user clarification or additional research

When an activity returns blocked:
1. **Read the open questions** from the response
2. **Apply Review Policy** to determine resolution approach:
   - `never`: Resolve questions via additional research autonomously
   - `always`/`milestones`: Ask user for clarification
3. **Re-invoke the activity** with answers

The activity skill should NOT write partial artifacts when blocked—clean re-invocation is preferred.

### Delegation Prompt Construction

For subagent delegation, construct prompts including:
- Skill to load
- Activity goal (what to accomplish)
- Relevant artifact paths
- Workflow configuration as needed by the activity
- User context (only when relevant)

## Intelligent Routing Guidance

The agent reasons about user intent and routes requests intelligently. This section provides guidance—not rigid rules.

### Intent-Based Routing

1. **Analyze user request**: What do they want to accomplish?
2. **Consult skill catalog**: Which skill has this capability?
3. **Consider workflow state**: What artifacts exist? What's the current stage?
4. **Construct delegation**: Build meaningful prompt with context

### Non-Linear Request Examples

The workflow supports non-linear paths when appropriate:

| User Request | Activity | Execution |
|-------------|----------|----------|
| "Update spec to align with plan changes" | `paw-spec` | Direct |
| "Do more research on X" | `paw-spec-research` or `paw-code-research` | Subagent |
| "Revise phase 2 of the plan" | `paw-planning` | Direct |
| "Review the spec for quality" | `paw-spec-review` | Subagent |
| "Check if the plan is ready" | `paw-plan-review` | Subagent |
| "Add error handling to implementation" | `paw-implement` | Direct |

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
