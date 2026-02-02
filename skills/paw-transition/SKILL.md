---
name: paw-transition
description: Workflow transition gate for PAW. Handles stage boundaries, session policy, preflight checks, and next activity determination.
---

# Workflow Transition

> **Execution Context**: This skill runs **directly** in the PAW session when processing a `transition` TODO. It determines what happens next and whether a session boundary should be crossed.

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

### Step 3: Check Stage Boundary

Stage boundaries occur when moving between these stages:
- spec-review passes → code-research
- plan-review passes → implement (Phase 1)
- phase N complete → phase N+1
- all phases complete → final-pr

**If crossing a stage boundary AND Session Policy = `per-stage`**:
- Call `paw_new_session` with:
  - `target_agent`: "PAW"
  - `work_id`: current work ID
  - `inline_instruction`: next activity and phase (e.g., "Phase 2: Tool Enhancement")
- **STOP** - do not continue in this session

**If NOT crossing boundary OR Session Policy = `continuous`**:
- Continue to Step 4

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

If any check fails, report blocker and stop.

### Step 5: Queue Next Activity

Add TODO for next activity:
- `[ ] <activity-name> (<context>)`
- Follow with `[ ] transition`

## Completion

After completing all steps (or calling `paw_new_session`), mark the `transition` TODO complete.

**Normal completion output**:
```
Transition complete.
Next: <activity-name>
Session: continuing (or: new session started)
Preflight: all checks passed
```

## Guardrails

- Do NOT skip the stage boundary check (Step 3)
- Do NOT proceed past Step 3 if `paw_new_session` is required
- Do NOT mark transition complete if preflight checks fail
