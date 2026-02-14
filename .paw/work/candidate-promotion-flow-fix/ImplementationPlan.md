# Candidate Promotion Flow Fix — Implementation Plan

## Overview
Fix the Candidate Promotion Flow bypass (issue #234) using defense-in-depth (Option C): harden the `paw-pr` pre-flight to be an explicit hard gate for unresolved candidates, and add an independent pre-paw-pr guardrail in `PAW.agent.md` that catches unresolved candidates even when `paw-transition` is bypassed.

## Current State Analysis
- `paw-pr` SKILL.md pre-flight detects unresolved candidates (`- [ ]` items) but treats them as a generic blocker with "block unless user explicitly confirms" — allowing the agent to resolve them unilaterally or bypass with user confirmation
- `PAW.agent.md` Candidate Promotion Flow only triggers from `promotion_pending = true` returned by `paw-transition` subagent — no independent check exists
- `paw-transition` Step 2.5 correctly implements candidate detection, but only fires when properly delegated as a subagent
- No integration tests cover candidate promotion flow

## Desired End State
- `paw-pr` pre-flight explicitly identifies unresolved candidates as a **non-bypassable blocker** that requires Candidate Promotion Flow — not user confirmation
- `PAW.agent.md` contains an independent pre-paw-pr check that verifies candidate resolution before loading `paw-pr`, running Candidate Promotion Flow if needed
- Prompt linter passes for both modified files
- Token budget impact is minimal (targeting <5% increase per file)

## What We're NOT Doing
- Modifying `paw-transition` SKILL.md — Step 2.5 works correctly when properly delegated
- Adding integration tests for candidate promotion (out of scope — tracked as separate work item)
- Changing how `paw-transition` is delegated (the inline-transition root cause is a context compaction behavior, not a prompt gap)

## Phase Status
- [x] **Phase 1: Defense in Depth** - Harden paw-pr pre-flight and add PAW.agent.md guardrail
- [x] **Phase 2: Documentation** - Create Docs.md for the fix

## Phase Candidates
<!-- None identified yet -->

---

## Phase 1: Defense in Depth

### Changes Required:

- **`skills/paw-pr/SKILL.md`** (lines 27-31, Pre-flight Validation → Phase Implementation):
  - Replace the generic "No unresolved phase candidates" check with explicit routing instruction
  - Add a dedicated subsection or callout making unresolved candidates a **hard blocker** that requires the orchestrator to run Candidate Promotion Flow — not a user-confirmable skip
  - Keep change minimal: 1-2 bullet points or a brief callout block

- **`agents/PAW.agent.md`** (Mandatory Transitions table, line 27):
  - Fix row 27 to read `paw-transition → paw-pr` (matching the `paw-transition →` prefix pattern used by rows 22, 23, 28) — this inconsistency contributed to the original root cause
- **`agents/PAW.agent.md`** (Prerequisites table, lines 52-56):
  - Add prerequisite row: `| paw-pr | All phase candidates resolved (run Candidate Promotion Flow if not) |`
  - This creates an independent safety net that doesn't depend on `paw-transition` having run correctly
  - Follow same logic as paw-transition Step 2.5: missing `## Phase Candidates` section or all-resolved = pass

### Success Criteria:

#### Automated Verification:
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh skills/paw-pr/SKILL.md`
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh agents/PAW.agent.md`
- [ ] Code lint passes: `npm run lint`

#### Manual Verification:
- [ ] `paw-pr` SKILL.md pre-flight explicitly names Candidate Promotion Flow as the resolution path for unresolved candidates
- [ ] `paw-pr` SKILL.md does NOT allow user confirmation to bypass unresolved candidates
- [ ] `PAW.agent.md` Mandatory Transitions table row 27 includes `paw-transition →` prefix
- [ ] `PAW.agent.md` Prerequisites table contains a pre-paw-pr candidate check that doesn't depend on `paw-transition` output
- [ ] Token delta is <5% per file vs baseline (paw-pr: 1138, PAW.agent.md: 2437)

---

## Phase 2: Documentation

### Changes Required:
- **`.paw/work/candidate-promotion-flow-fix/Docs.md`**: Technical reference capturing the fix, affected files, and verification approach (load `paw-docs-guidance`)

### Success Criteria:
- [ ] Docs.md created with accurate description of changes
- [ ] Content references correct file paths and line numbers

---

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/234
- Research: `.paw/work/candidate-promotion-flow-fix/CodeResearch.md`
