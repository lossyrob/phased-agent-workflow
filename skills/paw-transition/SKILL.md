---
name: paw-transition
description: Workflow transition gate for PAW. Handles stage boundaries, session policy, preflight checks, and next activity determination.
---

# Workflow Transition

> **Execution Context**: This skill runs in a **subagent** session, delegated by the PAW orchestrator when processing a `paw-transition` TODO. Return structured output—do not make orchestration decisions beyond the transition.

## Purpose

Gate between workflow activities. Ensures:
- Session policy is respected at stage boundaries
- Correct branch state before implementation
- Required artifacts exist before proceeding
- Next activity is correctly identified and queued

## Procedure

Execute these steps in order. Do not skip steps.

### Step 1: Identify Current State

Read WorkflowContext.md to determine:
- Work ID and target branch
- Session Policy (`per-stage` | `continuous`)
- Review Strategy (`prs` | `local`)
- Review Policy (`every-stage` | `milestones` | `planning-only` | `final-pr-only`)
  - If missing, check for legacy `Handoff Mode:` field and map: `manual`→`every-stage`, `semi-auto`→`milestones`, `auto`→`final-pr-only`
  - Also map legacy Review Policy values: `always`→`every-stage`, `never`→`final-pr-only`
  - If neither present, default to `milestones`
- Final Agent Review (`enabled` | `disabled`)
  - If missing, default to `enabled`

Identify last completed activity from TODOs or artifacts.

### Step 2: Determine Next Activity

Use the Mandatory Transitions table:

| After Activity | Required Next | Skippable? |
|----------------|---------------|------------|
| paw-init | paw-spec or paw-work-shaping | Per user intent |
| paw-implement (any phase) | paw-impl-review | NO |
| paw-spec | paw-spec-review | NO |
| paw-planning | paw-plan-review | NO |
| paw-impl-review (passes, more phases) | paw-implement (next phase) | NO |
| paw-impl-review (passes, last phase, review enabled) | paw-final-review | NO |
| paw-impl-review (passes, last phase, review disabled) | paw-pr | Per Review Policy |
| paw-final-review | paw-pr | NO |

**Skippable = NO**: Add activity TODO and execute immediately after transition completes.

### Step 2.5: Candidate Promotion Check

When next activity would be `paw-pr` (all planned phases complete), check for phase candidates:

1. Read ImplementationPlan.md `## Phase Candidates` section
2. Count **unresolved** candidates: `- [ ]` items WITHOUT terminal tags (`[skipped]`, `[deferred]`, `[not feasible]`)
3. If unresolved candidates exist: set `promotion_pending = true` and extract candidate descriptions
4. Otherwise: set `promotion_pending = false`

If `promotion_pending = true`, return candidates in structured output. PAW orchestrator handles user interaction.

### Step 3: Check Stage Boundary and Milestone Pause

**Stage boundaries** occur when moving between these stages:
- spec-review passes → code-research
- plan-review passes → implement (Phase 1)
- paw-planning-docs-review complete → implement (Phase 1)
- phase N complete → phase N+1
- all phases complete → paw-final-review (if enabled) or paw-pr (if disabled)
- paw-final-review complete → paw-pr
- paw-pr complete → workflow complete

**Stage-to-milestone mapping** (determines which milestone is reached at each boundary):

| Stage Boundary | Milestone Reached |
|----------------|-------------------|
| spec-review passes | Spec.md complete |
| plan-review passes | ImplementationPlan.md complete |
| paw-planning-docs-review complete | Planning Documents Review complete |
| phase N complete (not last) | Phase completion |
| all phases complete | Phase completion (last phase) |
| paw-final-review complete | Final Review complete |
| paw-pr complete | Final PR |

**Determine pause_at_milestone**:
- If Review Policy ∈ {`every-stage`, `milestones`}: pause at ALL milestones
- If Review Policy = `planning-only`:
  - Spec.md, ImplementationPlan.md, Planning Documents Review complete, Final PR: `pause_at_milestone = true`
  - Phase completion (including last phase): `pause_at_milestone = false`
- If Review Policy = `final-pr-only`:
  - Final PR: `pause_at_milestone = true`
  - All other milestones: `pause_at_milestone = false`

**Determine session_action**:
- If crossing a stage boundary AND Session Policy = `per-stage`: set `session_action = new_session`
- Otherwise: set `session_action = continue`

If `session_action = new_session`, set inline_instruction to: next activity and phase (e.g., "Phase 2: Tool Enhancement")

Continue to Step 4 (preflight still needed for inline_instruction context).

### Step 4: Preflight Checks

Before the next activity can start, verify:

**For paw-implement**:
- [ ] On correct branch per Review Strategy
  - `prs`: phase branch (e.g., `<target>_phase1`)
  - `local`: target branch
- [ ] ImplementationPlan.md exists and has the target phase

**For paw-code-research**:
- [ ] Spec.md exists (unless minimal mode)

**For paw-planning-docs-review**:
- [ ] Spec.md exists (unless minimal mode)
- [ ] ImplementationPlan.md exists

**For paw-final-review**:
- [ ] All implementation phases complete
- [ ] On target branch (local strategy) or phase branches merged (prs strategy)

**For paw-pr**:
- [ ] All phases complete
- [ ] paw-final-review complete (if enabled) or skipped (if disabled)
- [ ] On target branch or ready to merge

**Artifact Tracking Check** (for all activities):
- Check if `.paw/work/<work-id>/.gitignore` exists
- If exists with `*` pattern: artifact_tracking = `disabled`
- Otherwise: artifact_tracking = `enabled`

If any check fails, report blocker and stop.

### Step 5: Queue Next Activity

Add TODO for next activity:
- `[ ] <activity-name> (<context>)`
- `[ ] paw-transition`

## Completion

After completing all steps, return structured output:

```
TRANSITION RESULT:
- session_action: [continue | new_session]
- pause_at_milestone: [true | false]
- next_activity: [activity name and context]
- artifact_tracking: [enabled | disabled]
- preflight: [passed | blocked: <reason>]
- work_id: [current work ID]
- inline_instruction: [for new_session only: resume hint]
- promotion_pending: [true | false] (only when next would be paw-pr)
- candidates: [list of unresolved candidate descriptions] (only if promotion_pending)
```

**If pause_at_milestone = true**: The PAW agent must PAUSE and wait for user confirmation before proceeding.

**If session_action = new_session**: The PAW agent must call `paw_new_session` with the provided work_id and inline_instruction.

**If preflight = blocked**: The PAW agent must report the blocker to the user.

Mark the `paw-transition` TODO complete after returning this output.

## Candidate Resolution Markers

Terminal markers used in Step 2.5 to identify resolved candidates:
- `- [x] [promoted] <desc>` — Elaborated into a full phase
- `- [x] [skipped] <desc>` — User chose not to pursue
- `- [x] [deferred] <desc>` — Future work outside current workflow
- `- [x] [not feasible] <desc>` — Code research revealed infeasibility

Unresolved: `- [ ]` items without terminal tags. Empty section or all-resolved → `promotion_pending = false`.

## Guardrails

- Do NOT skip the stage boundary check (Step 3)
- Do NOT return session_action = continue if boundary + per-stage policy
- Do NOT return preflight = passed if checks actually failed
- Do NOT call paw_new_session directly—return the decision for PAW agent to act on
