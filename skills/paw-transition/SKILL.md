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
- Review Policy (`always` | `milestones` | `planning-only` | `never`)
  - If missing, check for legacy `Handoff Mode:` field and map: `manual`→`always`, `semi-auto`→`milestones`, `auto`→`never`
  - If neither present, default to `milestones`

Identify last completed activity from TODOs or artifacts.

### Step 2: Determine Next Activity

Use the Mandatory Transitions table:

| After Activity | Required Next | Skippable? |
|----------------|---------------|------------|
| paw-init | paw-spec or paw-work-shaping | Per user intent |
| paw-implement (any phase) | paw-impl-review | NO |
| paw-spec | paw-spec-review | NO |
| paw-planning | paw-plan-review | NO |
| paw-impl-review (passes) | paw-implement (next phase) or paw-pr | Per Review Policy |

**Skippable = NO**: Add activity TODO and execute immediately after transition completes.

### Step 2.5: Candidate Promotion Check

When next activity would be `paw-pr` (all planned phases complete), check for phase candidates:

1. Read ImplementationPlan.md `## Phase Candidates` section
2. If unchecked candidates exist (`- [ ]` items): set `promotion_pending = true`
3. If no candidates or all checked/skipped: set `promotion_pending = false`

If `promotion_pending = true`, do NOT proceed to paw-pr. Instead, enter Promotion Flow (see below).

### Step 3: Check Stage Boundary and Milestone Pause

**Stage boundaries** occur when moving between these stages:
- spec-review passes → code-research
- plan-review passes → implement (Phase 1)
- phase N complete → phase N+1
- all phases complete → final-pr

**Milestones** (require pause check): Spec.md complete, ImplementationPlan.md complete, Phase PR completion, Final PR

**Determine pause_at_milestone**:
- If at a milestone AND Review Policy ∈ {`always`, `milestones`}: set `pause_at_milestone = true`
- If Review Policy = `planning-only`:
  - If milestone is Spec.md, ImplementationPlan.md, or Final PR: set `pause_at_milestone = true`
  - If milestone is Phase PR/phase completion: set `pause_at_milestone = false`
- If Review Policy = `never`: set `pause_at_milestone = false`
- If not at a milestone: set `pause_at_milestone = false`

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

**For paw-pr**:
- [ ] All phases complete
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
```

**If pause_at_milestone = true**: The PAW agent must PAUSE and wait for user confirmation before proceeding.

**If session_action = new_session**: The PAW agent must call `paw_new_session` with the provided work_id and inline_instruction.

**If preflight = blocked**: The PAW agent must report the blocker to the user.

Mark the `paw-transition` TODO complete after returning this output.

## Promotion Flow

When `promotion_pending = true`, present each candidate to user before proceeding to paw-pr:

1. **Present candidate**: Show the one-liner description
2. **Await decision**: User chooses:
   - **Promote**: Elaborate candidate into a full phase
   - **Skip**: Mark candidate `[skipped]` but keep in section
   - **Defer**: Leave as-is for future work (outside current workflow)
3. **Handle decision**:
   - Promoted: Invoke `paw-code-research` + `paw-planning` for the new phase, then return to implementation
   - Skipped: Update candidate to `- [x] [skipped] <description>`, continue to next candidate
   - Deferred: Leave unchanged, continue to next candidate
4. **After all candidates processed**:
   - If any were promoted: next_activity = `paw-implement` (new phase)
   - If all skipped/deferred: proceed to `paw-pr`

**Edge cases**:
- Empty Phase Candidates section: Skip promotion flow entirely
- Promotion failure (code research reveals infeasibility): Mark as `[not feasible]`, continue with remaining candidates
- User abandons mid-flow: Candidates retain their state; can resume later

## Guardrails

- Do NOT skip the stage boundary check (Step 3)
- Do NOT return session_action = continue if boundary + per-stage policy
- Do NOT return preflight = passed if checks actually failed
- Do NOT call paw_new_session directly—return the decision for PAW agent to act on
