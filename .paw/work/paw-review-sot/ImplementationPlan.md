# SoT Review Mode for PAW Review — Implementation Plan

## Overview

Integrate society-of-thought review mode into PAW Review by adding a conditional branch in the Evaluation Stage that invokes `paw-sot` instead of the sequential `paw-review-impact` → `paw-review-gap` pipeline, extending ReviewContext.md with SoT configuration fields, and updating the Output Stage prerequisites to accept `REVIEW-SYNTHESIS.md` as an alternative to `ImpactAnalysis.md` + `GapAnalysis.md`.

The implementation follows the proven adapter pattern from `paw-final-review/SKILL.md:136-150`: construct a review context from the configuration source (ReviewContext.md), invoke paw-sot, and map output back into the downstream pipeline.

## Current State Analysis

- **Evaluation Stage** (`paw-review-workflow/SKILL.md:150-163`): Unconditional two-skill sequence with no mode branching — SoT introduces the first conditional
- **ReviewContext.md template** (`paw-review-understanding/SKILL.md:221-277`): No `review_mode` or SoT configuration fields exist
- **Output Stage prerequisites** (`paw-review-feedback/SKILL.md:14-21`, `paw-review-critic/SKILL.md:17-22`): Hard requirements on `ImpactAnalysis.md` + `GapAnalysis.md` — these don't exist in SoT mode
- **paw-sot engine**: Already extracted and stable on main; proven adapter pattern in `paw-final-review`
- **Documentation**: `docs/guide/society-of-thought-review.md` exists but covers only paw-final-review

## Desired End State

- PAW Review's Evaluation Stage conditionally routes through paw-sot when `review_mode: society-of-thought` is configured in ReviewContext.md
- SoT artifacts (`REVIEW-{SPECIALIST}.md`, `REVIEW-SYNTHESIS.md`) are written to `.paw/reviews/<identifier>/` and listed in the artifact directory structure
- Output Stage skills accept `REVIEW-SYNTHESIS.md` as an alternative evaluation input
- Existing single-model path remains the default and is completely unchanged
- Specification and user documentation cover the new review mode

## What We're NOT Doing

- Modifying paw-sot engine internals
- Creating PAW Review-specific specialist personas
- Adding multi-model mode to PAW Review (separate feature)
- Changing the Output Stage pipeline logic (feedback → critic → github) — only updating prerequisites
- Adding moderator mode to PAW Review (may be a future enhancement)
- Modifying paw-review-gap or paw-review-impact skills

## Phase Status
- [x] **Phase 1: SoT Evaluation Path** - Add SoT config to ReviewContext.md and conditional routing in Evaluation Stage
- [ ] **Phase 2: Output Stage Adaptation** - Update feedback/critic prerequisites and workflow artifact references for SoT mode
- [ ] **Phase 3: Specification & Documentation** - Update paw-review-specification.md and user-facing documentation

## Phase Candidates
<!-- Lightweight capture of potential phases identified during implementation. -->
- Moderator mode support for PAW Review (post-synthesis interactive specialist engagement)
- Multi-model mode for PAW Review Evaluation Stage (complement to SoT)

---

## Phase 1: SoT Evaluation Path

### Changes Required:

- **`skills/paw-review-understanding/SKILL.md`**: Add SoT configuration fields to the ReviewContext.md template (lines ~221-277). New fields: `Review Mode` (default: single-model), `Review Specialists` (default: all), `Review Interaction Mode` (default: parallel), `Review Interactive` (default: false), `Review Specialist Models` (default: none). Fields placed in a new "## Review Configuration" section after metadata, following the naming pattern from WorkflowContext.md's "Agent Review Configuration" section. Add guidance on how these fields are populated (from user invocation parameters with defaults applied by paw-review-understanding when values are not provided).

- **`skills/paw-review-workflow/SKILL.md`**: 
  - **Evaluation Stage** (lines 150-163): Replace the unconditional sequence with a conditional branch. When `review_mode: society-of-thought` in ReviewContext.md: load `paw-sot` skill directly (not as subagent — per `paw-sot/SKILL.md:9`) with review context constructed from ReviewContext.md fields. Adapter mapping table follows `paw-final-review` pattern: `type: diff`, `coordinates: git diff <base>...<head>` plus understanding artifact paths, `output_dir: .paw/reviews/<identifier>/`, remaining fields from ReviewContext.md SoT config. When `review_mode` is absent or `single-model`: existing impact → gap sequence unchanged. Include error handling: if paw-sot skill cannot be loaded, report error to user — do not fall back to single-model silently.
  - **Stage Gate** (line 163): Make mode-aware — verify `REVIEW-SYNTHESIS.md` exists (SoT) OR `ImpactAnalysis.md` + `GapAnalysis.md` exist (single-model).
  - **Artifact Directory Structure** (lines 97-107): Add `REVIEW-{SPECIALIST}.md` and `REVIEW-SYNTHESIS.md` entries with "(Stage: Evaluation, SoT mode)" annotation. Keep existing `ImpactAnalysis.md` and `GapAnalysis.md` entries (used in single-model mode).

- **Lint**: `./scripts/lint-prompting.sh skills/paw-review-understanding/SKILL.md && ./scripts/lint-prompting.sh skills/paw-review-workflow/SKILL.md`

### Success Criteria:

#### Automated Verification:
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh skills/paw-review-understanding/SKILL.md`
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh skills/paw-review-workflow/SKILL.md`
- [ ] Code lint passes: `npm run lint`

#### Manual Verification:
- [ ] ReviewContext.md template includes all 5 SoT configuration fields with defaults
- [ ] Evaluation Stage has clear conditional: SoT path vs single-model path
- [ ] SoT adapter mapping table present with all paw-sot contract fields
- [ ] Stage gate is mode-aware (checks correct artifacts per mode)
- [ ] Artifact directory structure includes SoT artifacts
- [ ] Single-model path reads identically to current behavior
- [ ] Error handling present: paw-sot skill load failure → error reported, no silent fallback
- [ ] Specialist selection config (all/list/adaptive) passes through to paw-sot contract correctly
- [ ] Interaction mode config (parallel/debate) passes through to paw-sot contract correctly
- [ ] Specialist models config passes through to paw-sot contract correctly
- [ ] Edge cases delegated to paw-sot are acknowledged: adapter passes sufficient diff metadata (file types, change size) for adaptive selection to handle docs-only, small PR, and security-sensitive scenarios
- [ ] SC-004 (debate traces) and SC-006 (model diversity) runtime validation noted as paw-sot responsibility; adapter verifies correct pass-through
- [ ] All SoT artifact references use REVIEW-* naming convention; no GapAnalysis-* naming used for SoT mode artifacts

---

## Phase 2: Output Stage Adaptation

### Changes Required:

- **`skills/paw-review-feedback/SKILL.md`**: Update prerequisites section (lines ~14-21) to accept `REVIEW-SYNTHESIS.md` as an alternative to `ImpactAnalysis.md` + `GapAnalysis.md`. When `REVIEW-SYNTHESIS.md` exists: use it as the findings source (severity mapping: must-fix → Must, should-fix → Should, consider → Could; exclude Observations section; trade-offs from "Trade-offs Requiring Decision" section should be included as Should-tier findings with a "[Trade-off]" prefix so the human reviewer sees them). When it doesn't exist: require `ImpactAnalysis.md` + `GapAnalysis.md` as before. Add brief guidance on how SoT findings map to the comment generation pipeline (file:line references from specialist citations, impact from synthesis evidence).

- **`skills/paw-review-critic/SKILL.md`**: Update prerequisites section (lines ~17-22) to accept `REVIEW-SYNTHESIS.md` as an alternative supporting artifact to `ImpactAnalysis.md` + `GapAnalysis.md`. Same conditional logic — if REVIEW-SYNTHESIS.md exists, use it; otherwise require the traditional artifacts.

- **`skills/paw-review-workflow/SKILL.md`**: Update Output Stage section (lines 185-216) to note that artifact references are mode-dependent. The feedback skill input list (line 194) should reference "evaluation artifacts" generically rather than hardcoding `ImpactAnalysis, GapAnalysis`, with a note that SoT mode provides `REVIEW-SYNTHESIS.md` instead.

- **Lint**: `./scripts/lint-prompting.sh skills/paw-review-feedback/SKILL.md && ./scripts/lint-prompting.sh skills/paw-review-critic/SKILL.md && ./scripts/lint-prompting.sh skills/paw-review-workflow/SKILL.md`

### Success Criteria:

#### Automated Verification:
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh skills/paw-review-feedback/SKILL.md`
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh skills/paw-review-critic/SKILL.md`
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh skills/paw-review-workflow/SKILL.md`
- [ ] Code lint passes: `npm run lint`

#### Manual Verification:
- [ ] paw-review-feedback accepts REVIEW-SYNTHESIS.md as alternative input with severity mapping documented
- [ ] Trade-offs from REVIEW-SYNTHESIS.md mapped as Should-tier with [Trade-off] prefix
- [ ] paw-review-critic accepts REVIEW-SYNTHESIS.md as alternative supporting artifact
- [ ] Output Stage artifact references are mode-aware
- [ ] Single-model path prerequisites unchanged
- [ ] No hard requirement on ImpactAnalysis.md or GapAnalysis.md when REVIEW-SYNTHESIS.md present

---

## Phase 3: Specification & Documentation

### Changes Required:

- **`paw-review-specification.md`**: Update Stage R2 Evaluation (lines ~207-248) to document the SoT alternative path. Add a "Review Modes" subsection describing `single-model` (default, current behavior) and `society-of-thought` (paw-sot invocation). Update the R2 outputs to include SoT artifacts conditionally.

- **`docs/guide/society-of-thought-review.md`**: Restructure to cover both PAW Review and paw-final-review SoT modes. Add a section on PAW Review integration: how to configure `review_mode`, specialist selection, interaction mode, and model diversity in the review invocation. Clarify the difference (PAW Review: findings → GitHub comments pipeline; final review: findings → apply/skip resolution).

- **`docs/specification/review.md`**: Update R2 Evaluation to mention SoT mode, mirroring `paw-review-specification.md` changes.

- **`docs/reference/artifacts.md`**: Add `REVIEW-{SPECIALIST}.md` and `REVIEW-SYNTHESIS.md` as PAW Review artifacts (alongside their existing listing for paw-final-review, if present).

- **`.paw/work/paw-review-sot/Docs.md`**: Technical reference (load `paw-docs-guidance`)

- **Docs build verification**: `source .venv/bin/activate && mkdocs build --strict`

### Success Criteria:

#### Automated Verification:
- [ ] Docs build passes: `source .venv/bin/activate && mkdocs build --strict`
- [ ] Prompt lint passes: `npm run lint:agent:all` (if specification changes affect any agent/skill files)
- [ ] Code lint passes: `npm run lint`

#### Manual Verification:
- [ ] paw-review-specification.md documents both review modes in R2 Evaluation
- [ ] SoT guide covers PAW Review integration alongside final review
- [ ] Review specification docs mention SoT evaluation path
- [ ] Artifact reference includes SoT artifacts for PAW Review context
- [ ] Docs.md captures implementation details and verification approach

---

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/209
- Spec: `.paw/work/paw-review-sot/Spec.md`
- Research: `.paw/work/paw-review-sot/CodeResearch.md`
