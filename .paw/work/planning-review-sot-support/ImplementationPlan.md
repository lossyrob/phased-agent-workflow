# Planning Review SoT Support Implementation Plan

## Overview
Add society-of-thought execution mode and perspective overlays to `paw-planning-docs-review` by mirroring `paw-final-review`'s SoT integration pattern. The SoT engine already supports `type: artifacts` with a planning-appropriate preamble — this wires the planning docs review into it. Changes span `paw-init` (config + validation + template), `paw-planning-docs-review` (execution path + smart heuristic + moderator mode), and documentation.

## Current State Analysis
- `paw-init` has 4 planning review config fields (lines 52-55) and 10 final review fields including SoT (lines 42-49). The gap is 5 SoT-specific fields plus 1 perspectives field.
- `paw-planning-docs-review` (277 lines) has two execution branches in Step 4 (single-model + multi-model) and a smart mode heuristic with an "Affected Artifact" dimension unique to planning review.
- `paw-final-review` provides the reference implementation: review context table (lines 140-150), SoT heuristic (lines 222-231), moderator mode (lines 266-276), VS Code degradation (lines 160-163).
- `paw-sot` engine is ready — `type: artifacts` triggers the correct planning preamble, perspectives pass through natively.

## Desired End State
- `planning_review_mode: society-of-thought` is a valid configuration producing specialist reviews + synthesis in `reviews/planning/`
- Smart mode classification uses confidence × grounding × severity × affected artifact
- Moderator mode available for interactive SoT planning review
- Perspective overlays passed to SoT engine via config fields
- VS Code degrades gracefully to single-model
- All documentation reflects the new capability
- Existing single-model and multi-model flows unchanged

## What We're NOT Doing
- Multi-model perspective support (#269)
- Changes to `paw-sot` engine
- Changes to `paw-plan-review` (the simpler subagent skill)
- New specialist personas or perspective files
- Integration tests (separate follow-up)

## Phase Status
- [x] **Phase 1: paw-init SoT Configuration** - Add planning review SoT config fields, validation, and WorkflowContext template
- [x] **Phase 2: paw-planning-docs-review SoT Execution** - Add SoT execution path, smart mode heuristic, moderator mode, VS Code degradation
- [x] **Phase 3: Documentation** - Update docs to reflect planning review SoT support

## Phase Candidates
<!-- No candidates at this time -->

---

## Phase 1: paw-init SoT Configuration

### Changes Required:

- **`skills/paw-init/SKILL.md`**:
  - **Input Parameters Table** (line 53): Update `planning_review_mode` row to add `society-of-thought` as a valid value: `single-model`, `multi-model`, `society-of-thought`
  - **Input Parameters Table** (after line 55): Add 5 new rows for `planning_review_specialists` (default: `all`), `planning_review_interaction_mode` (default: `parallel`), `planning_review_specialist_models` (default: `none`), `planning_review_perspectives` (default: `auto`), `planning_review_perspective_cap` (default: `2`)
  - **Configuration Validation** (after line 84): Add rule: `planning_review_mode` is `society-of-thought` → `planning_docs_review` MUST be `enabled`. This is an init-time guardrail preventing contradictory configuration; the spec edge case (stored-but-unused) covers post-init manual WorkflowContext edits.
  - **Society-of-Thought Configuration section** (after line 110): Add parallel section for planning review SoT — validate specialist values, interaction mode, specialist models, perspectives, perspective cap when `planning_review_mode` is `society-of-thought`. Mirror the final review section structure but reference `planning_review_*` fields. Note that `planning_review_models` is ignored when SoT is active.
  - **WorkflowContext.md Template** (after line 146, after `Planning Review Models`): Add 5 new template fields: `Planning Review Specialists`, `Planning Review Interaction Mode`, `Planning Review Specialist Models`, `Planning Review Perspectives`, `Planning Review Perspective Cap`

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-init/SKILL.md`
- [ ] Token count delta reasonable (measure before/after)

#### Manual Verification:
- [ ] All 5 new fields present in parameters table with correct defaults and valid values
- [ ] Validation rule ensures `planning_docs_review` is `enabled` when SoT mode selected
- [ ] SoT config section mirrors final review structure but references `planning_review_*` fields
- [ ] WorkflowContext template includes all 5 new fields in correct position (after `Planning Review Models`)
- [ ] Existing final review and planning review fields unchanged

---

## Phase 2: paw-planning-docs-review SoT Execution

### Changes Required:

- **`skills/paw-planning-docs-review/SKILL.md`**:
  - **Step 1: Read Configuration** (lines 24-39): Add SoT-specific field reading when mode is `society-of-thought`: `Planning Review Specialists`, `Planning Review Interaction Mode`, `Planning Review Specialist Models`, `Planning Review Perspectives`, `Planning Review Perspective Cap`.
  - **Step 4: Execute Review (CLI)** (after line 140, after multi-model section): Add third branch `**If society-of-thought mode**:` — load `paw-sot` skill, construct review context table mapping WorkflowContext fields to SoT input contract. Include the full field-to-source mapping table (mirroring `paw-final-review` lines 140-150). Key differences from final review: `type` is `artifacts` (not `diff`), `coordinates` are artifact paths (Spec.md, ImplementationPlan.md, CodeResearch.md), `output_dir` is `.paw/work/<work-id>/reviews/planning/`. All other fields map from their `Planning Review *` WorkflowContext counterparts. The existing shared review prompt already requires `Affected artifact(s): spec, plan, or both` tagging per finding — this is essential for smart mode artifact routing.
  - **Step 4: Execute Review (VS Code)** (line 146): Add SoT degradation message: "Society-of-thought requires CLI for specialist persona loading (see issue #240). Running single-model review." Mirror `paw-final-review` line 161.
  - **Step 5: Resolution — Interactive = true (CLI)** (after line 189): Add SoT-specific processing — process REVIEW-SYNTHESIS.md findings by severity, present trade-offs, track cross-finding duplicates. Resolution routing remains the same (apply-to-spec, apply-to-plan, apply-to-both, skip, discuss).
  - **Step 5: Resolution — Smart mode (CLI)**: Add SoT heuristic after multi-model heuristic. The SoT classification table combines confidence/grounding dimensions with the affected artifact routing dimension:

    | Confidence | Grounding | Severity | Affected Artifact | Classification |
    |------------|-----------|----------|-------------------|----------------|
    | HIGH | Direct | must-fix/should-fix | spec or plan (single) | `auto-apply` → auto-route to affected artifact skill |
    | HIGH | Direct | must-fix/should-fix | both | `interactive` → user chooses routing |
    | HIGH | Inferential | must-fix/should-fix | any | `interactive` |
    | MEDIUM/LOW | any | must-fix/should-fix | any | `interactive` |
    | Any | any | consider | any | `report-only` |
    | — | — | trade-off | any | `interactive` (always) |

    Smart mode classification applies independently per re-review cycle.

  - **After Step 6 Re-Review / Before Step 7** (CLI only): Add Moderator Mode section. Condition: `Planning Review Mode` is `society-of-thought` AND (`Planning Review Interactive` is `true`, or `smart` with significant findings remaining). Invoke `paw-sot` a second time with review context `type: artifacts`, `output_dir` (`.paw/work/<work-id>/reviews/planning/`), and artifact coordinates. Exit on "done"/"continue"/"proceed". Skip if `interactive` is `false` or no findings. Moderator mode is advisory — specialist engagement informs user understanding but does not trigger re-review cycles.
  - **Review Artifacts table** (lines 269-278): Add SoT row: `society-of-thought` → `REVIEW-{SPECIALIST-NAME}.md` per specialist, `REVIEW-{SPECIALIST-NAME}-{PERSPECTIVE}.md` (when perspectives active), `REVIEW-SYNTHESIS.md` (produced by `paw-sot`)

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-planning-docs-review/SKILL.md`
- [ ] Token count delta reasonable (measure before/after)

#### Manual Verification:
- [ ] SoT execution path constructs review context with `type: artifacts` and correct coordinates
- [ ] Review context table maps all Planning Review WorkflowContext fields to paw-sot input contract
- [ ] Smart mode SoT heuristic includes both confidence/grounding and affected artifact dimensions
- [ ] Moderator mode conditions mirror final review pattern but reference `Planning Review *` fields
- [ ] VS Code degradation message present for SoT
- [ ] Review artifacts table includes SoT row with perspective-aware file naming
- [ ] Existing single-model and multi-model paths unchanged

---

## Phase 3: Documentation

### Changes Required:

- **`.paw/work/planning-review-sot-support/Docs.md`**: Technical reference (load `paw-docs-guidance`)
- **`docs/guide/workflow-modes.md`** (lines 191-199): Add `society-of-thought` to Planning Docs Review Configuration table. Add SoT-specific fields (specialists, interaction mode, specialist models, perspectives, perspective cap) with defaults and descriptions.
- **`docs/guide/society-of-thought-review.md`**: Add planning docs review as a third integration point alongside implementation workflow and review workflow. Include: calling skill, config source, review type (`artifacts`), post-synthesis routing (apply-to-spec/apply-to-plan), and planning review configuration table.
- **`docs/specification/implementation.md`** (lines 243-256): Update `paw-planning-docs-review` activity skill description and configuration table to include `society-of-thought` mode and new fields.
- **`docs/reference/artifacts.md`** (lines 70-75): Add new planning review SoT WorkflowContext fields to the field table.
- **`docs/reference/agents.md`** (line 53): Update `paw-planning-docs-review` entry to note SoT delegation (similar to `paw-final-review` line 56).

### Success Criteria:

#### Automated Verification:
- [ ] Docs build: `source .venv/bin/activate && mkdocs build --strict`
- [ ] Agent lint: `npm run lint:agent:all`

#### Manual Verification:
- [ ] Docs.md captures implementation details, usage, and verification approach
- [ ] All doc pages consistently describe planning review SoT as `type: artifacts`
- [ ] SoT guide includes planning review integration point with correct routing description
- [ ] Workflow modes guide has updated configuration table
- [ ] Content accurate, style consistent with existing doc pages

---

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/272
- Spec: `.paw/work/planning-review-sot-support/Spec.md`
- Research: `.paw/work/planning-review-sot-support/CodeResearch.md`
