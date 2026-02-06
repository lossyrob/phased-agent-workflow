# Multi-model Planning Documents Review Implementation Plan

## Overview
Add a new `paw-planning-docs-review` skill and integrate it into the PAW workflow as a holistic review gate between plan-review and implementation. The skill mirrors `paw-final-review`'s multi-model parallel review pattern, adapted for cross-artifact planning document analysis.

## Current State Analysis
- `paw-final-review` provides the complete blueprint for multi-model review skills (219 lines, direct execution, WorkflowContext config, parallel dispatch, synthesis, interactive resolution)
- PAW agent's post-plan-review flow goes directly to Planning PR (PRs strategy) or implementation (local strategy) — no holistic review gate exists
- `paw-transition` routes after plan-review passes but has no awareness of planning-docs-review
- `paw-init` has 4 Final Review fields that serve as the naming pattern for the new fields
- `reviews/.gitignore` with `*` already covers subdirectories — `reviews/planning/` needs no separate gitignore

## Desired End State
- New `paw-planning-docs-review` skill that reviews Spec.md + ImplementationPlan.md + CodeResearch.md as a bundle
- Workflow gates implementation behind this review when enabled
- WorkflowContext.md configuration controls enablement, mode, and models
- All documentation reflects the new gate position and behavior

## What We're NOT Doing
- Renaming `paw-plan-review` (follow-up issue)
- Society-of-Thought review mode (future, #201)
- Non-interactive auto-apply mode for planning revisions
- VS Code extension command updates
- Changes to existing `spec-review` or `plan-review` skills

## Phase Status
- [ ] **Phase 1: Core Skill** - Create paw-planning-docs-review SKILL.md
- [ ] **Phase 2: Workflow Integration** - Update paw-init, paw-transition, PAW agent, paw-status, paw-workflow for new gate
- [ ] **Phase 3: Specification & Documentation** - Update paw-specification.md and docs/

---

## Phase 1: Core Skill

### Changes Required:

- **`skills/paw-planning-docs-review/SKILL.md`** (new): Create the skill following `paw-final-review` structure. Key sections:
  - YAML frontmatter with name and description
  - Execution context note (direct, not subagent)
  - Configuration reading (Planning Docs Review, Planning Review Mode, Planning Review Interactive, Planning Review Models)
  - Review context gathering (read Spec.md, ImplementationPlan.md, CodeResearch.md — not a diff)
  - Cross-artifact review prompt with 5 criteria: spec↔plan traceability, assumption consistency, scope coherence, feasibility validation, completeness
  - Multi-model execution (CLI): parallel dispatch via `task` tool with `model` parameter, per-model `REVIEW-{MODEL}.md`, synthesis `REVIEW-SYNTHESIS.md`
  - Single-model execution (CLI + VS Code): single review pass, `REVIEW.md`
  - Interactive resolution: present findings with apply-to-spec / apply-to-plan / apply-to-both / skip / discuss options
  - Resolution routing: paw-spec (Revise Specification mode) for spec issues, paw-planning (Plan Revision mode) for plan issues
  - Re-review loop: after revisions, re-run review; 2-cycle limit before presenting remaining as informational
  - Edge case handling: CodeResearch.md missing → proceed with reduced coverage; VS Code → single-model only; model failure during multi-model → synthesize with available results, noting gap
  - Artifacts go to `.paw/work/<work-id>/reviews/planning/`
  - Completion report with findings counts and resolution summary

### Success Criteria:

#### Automated Verification:
- [ ] Skill lint passes: `./scripts/lint-prompting.sh skills/paw-planning-docs-review/SKILL.md`

#### Manual Verification:
- [ ] Skill structure mirrors paw-final-review section headings
- [ ] Review criteria focus on cross-artifact analysis (not implementation quality)
- [ ] Resolution routing differentiates spec vs plan vs both
- [ ] Artifact paths use `reviews/planning/` subdirectory
- [ ] Re-review loop respects 2-cycle limit before proceeding with informational findings

---

## Phase 2: Workflow Integration

### Changes Required:

- **`skills/paw-init/SKILL.md`**: Add 4 new input parameters (planning_docs_review, planning_review_mode, planning_review_interactive, planning_review_models) with defaults mirroring Final Review fields. Add 4 new lines to WorkflowContext.md template. Add validation: Full mode defaults to enabled, Minimal mode defaults to disabled.

- **`skills/paw-transition/SKILL.md`**: Add `paw-planning-docs-review complete` as a stage boundary. Add stage-to-milestone mapping entry. Add preflight checks (Spec.md exists, ImplementationPlan.md exists). Update pause determination: planning-docs-review milestone follows ImplementationPlan.md pause rules (pauses for `always`, `milestones`, `planning-only`; skips for `never`). Note: routing through planning-docs-review is handled by the PAW agent (matching existing post-plan-review pattern), not the transition table.

- **`agents/PAW.agent.md`**: Update Mandatory Transitions table — insert `paw-plan-review (passes, planning-docs-review enabled)` → `paw-planning-docs-review` row. Add `paw-planning-docs-review` → `Planning PR (prs strategy)` row. Update Stage Boundary list to include `paw-planning-docs-review complete`. Add to Direct execution list. Update Handoff Messaging table with planning docs review entry. Update post-plan-review flow description to include conditional gate.

- **`skills/paw-status/SKILL.md`**: Add workflow stage progression entry for planning-docs-review between plan completion and Phase 1 start. Update Full mode description to include `→ Planning Docs Review (if enabled)`.

- **`skills/paw-workflow/SKILL.md`**: Add `paw-planning-docs-review` to activities table. Add `reviews/planning/` to artifact directory structure. Add to Planning Stage flow. Add to Direct execution list.

### Success Criteria:

#### Automated Verification:
- [ ] All modified skills lint: `npm run lint:skills`
- [ ] Agent lint: `./scripts/lint-prompting.sh agents/PAW.agent.md`

#### Manual Verification:
- [ ] paw-init template includes 4 new fields with correct defaults
- [ ] paw-transition routes through planning-docs-review when enabled, bypasses when disabled
- [ ] PAW agent mandatory transitions table is complete and consistent
- [ ] paw-status accurately reflects new workflow position
- [ ] paw-workflow activities table and directory structure are updated

---

## Phase 3: Specification & Documentation

### Changes Required:

- **`paw-specification.md`**: Add planning-docs-review to Full mode stage list. Add new activity row to Activity Skills table. Add planning-docs-review step in Stage 02 — Planning workflow (after plan-review, before Planning PR). Update skill count reference.

- **`docs/specification/implementation.md`**: Add planning-docs-review gate to Stage 02 description. Add activity to skills table.

- **`docs/reference/agents.md`**: Add `paw-planning-docs-review` to Hybrid Execution Model (Direct) table and Activity Skills table.

- **`docs/reference/artifacts.md`**: Add `reviews/planning/` to directory structure. Add 4 new WorkflowContext.md fields to field table.

- **`docs/guide/stage-transitions.md`**: Update review policy sections to note planning-docs-review as a planning-stage milestone.

- **`.paw/work/multi-model-planning-documents-review/Docs.md`**: Technical reference (load `paw-docs-guidance`)

### Success Criteria:

#### Automated Verification:
- [ ] Docs build: `source .venv/bin/activate && mkdocs build --strict`
- [ ] Lint: `npm run lint`

#### Manual Verification:
- [ ] Specification accurately describes new workflow position and behavior
- [ ] Documentation cross-references are consistent
- [ ] Content accurate, style consistent with existing docs

---

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/212
- Spec: `.paw/work/multi-model-planning-documents-review/Spec.md`
- Research: `.paw/work/multi-model-planning-documents-review/CodeResearch.md`
