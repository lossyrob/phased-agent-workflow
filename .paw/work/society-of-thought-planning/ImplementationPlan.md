# Society-of-Thought Planning Implementation Plan

## Overview
Add multi-model consensus support to the PAW Planning stage by extending `paw-planning` with three execution modes (single-model, multi-model, multi-model-deep) and `paw-plan-review` with multi-model weighted verdicts. The implementation follows the established multi-model pattern from `paw-final-review` — parallel subagent spawning via `task` tool, per-model artifacts, and synthesis. Configuration is added to `paw-init` and WorkflowContext.md following the existing final-review field pattern.

## Current State Analysis
- `paw-final-review` has a complete multi-model implementation: model intent resolution, parallel `task` tool subagents, per-model `REVIEW-{MODEL}.md` artifacts, `REVIEW-SYNTHESIS.md`, and interactive resolution — all gated by `{{#cli}}` / `{{#vscode}}` conditionals (`skills/paw-final-review/SKILL.md:87-156`)
- `paw-planning` runs directly in the PAW session with no multi-model support (`skills/paw-planning/SKILL.md:8`); has three execution contexts: initial, revision, PR response
- `paw-plan-review` runs as a subagent returning PASS/FAIL with BLOCKING/IMPROVE/NOTE categories (`skills/paw-plan-review/SKILL.md:8,79-84`); cannot spawn sub-subagents
- `paw-init` has an input parameter table with final-review config fields as the pattern to follow (`skills/paw-init/SKILL.md:26-39`)
- `paw-workflow` documents artifact directory structure with only `reviews/` as a gitignored subfolder (`skills/paw-workflow/SKILL.md:77-92`)
- `.gitignore` has `.paw/reviews/` entry; `reviews/` uses in-directory `.gitignore` with `*` content; no `planning/` pattern exists

## Desired End State
- `paw-planning` supports `single-model` (current behavior), `multi-model` (3 parallel plans → synthesis), and `multi-model-deep` (plans → debate → synthesis) modes
- `paw-plan-review` multi-model mode is orchestrated by `PAW.agent.md` spawning parallel subagents, with weighted verdict synthesis
- New config fields in `paw-init` and WorkflowContext.md template: `Planning Mode`, `Planning Models`, `Plan Review Mode`, `Plan Review Models`
- Per-model artifacts stored in gitignored `planning/` subfolder
- `paw-workflow` reference docs updated with new artifact structure and activities
- All existing single-model behavior preserved as default
- VS Code gracefully falls back to single-model

## What We're NOT Doing
- Multi-model spec review (`paw-spec-review`) — separate future work
- Multi-model code research — low value for documentary tasks
- Society-of-Thought specialist personas (sequential role-based) — different pattern
- Smart interactive mode for synthesis (#219) — future enhancement
- Holistic planning documents review (#212) — complementary separate feature
- Changes to downstream stages (implementation, final review, PR)
- Changes to `paw-transition` routing — existing transitions work as-is since multi-model planning still produces a single `ImplementationPlan.md`

## Phase Status
- [x] **Phase 1: Configuration & Initialization** - Add planning config fields to paw-init and WorkflowContext.md template
- [x] **Phase 2: Multi-Model Planning** - Extend paw-planning with multi-model and multi-model-deep modes
- [x] **Phase 3: Multi-Model Plan Review** - Extend PAW orchestrator to spawn parallel plan-review subagents with weighted synthesis
- [x] **Phase 4: Reference Documentation & Workflow Updates** - Update paw-workflow, artifact structure docs, and gitignore patterns
- [x] **Phase 5: Documentation** - Create Docs.md and update project documentation

## Phase Candidates
<!-- None identified — scope is well-bounded by the spec -->

---

## Phase 1: Configuration & Initialization

### Changes Required:

- **`skills/paw-init/SKILL.md`**: Add four new input parameters to the parameter table (after `final_review_models`, line 39), matching the existing table format:

  | Parameter | Required | Default | Values |
  |-----------|----------|---------|--------|
  | `planning_mode` | No | `single-model` | `single-model`, `multi-model`, `multi-model-deep` |
  | `planning_models` | No | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated model names or intents |
  | `plan_review_mode` | No | `single-model` | `single-model`, `multi-model` |
  | `plan_review_models` | No | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated model names or intents |

  Note: No `planning_interactive` field needed — planning runs directly in the session (always interactive), so model confirmation is always available. This differs from final-review which has an explicit interactive toggle.
  
  Add corresponding fields to the WorkflowContext.md template (after `Final Review Models`, line 93):
  ```
  Planning Mode: <planning_mode>
  Planning Models: <planning_models>
  Plan Review Mode: <plan_review_mode>
  Plan Review Models: <plan_review_models>
  ```

- **Tests**: Verify by running `paw-init` and confirming the new fields appear in generated WorkflowContext.md with correct defaults

### Success Criteria:

#### Automated Verification:
- [ ] Agent/skill lint passes: `npm run lint:agent:all`
- [ ] Token thresholds met (skills: 8000 warning / 12000 hard limit)

#### Manual Verification:
- [ ] `paw-init` parameter table has all four new parameters with correct defaults and allowed values
- [ ] WorkflowContext.md template includes new fields after final review fields
- [ ] Existing workflows with no planning fields continue to work (backwards compatibility)

---

## Phase 2: Multi-Model Planning

### Changes Required:

- **`skills/paw-planning/SKILL.md`**: Add multi-model planning support to the skill. Key additions:

  1. **Configuration section** (new, after Capabilities): Read `Planning Mode` and `Planning Models` from WorkflowContext.md. If fields are missing, default to `single-model`. Document the three modes with cost/call table.

  2. **Planning directory setup** (in execution flow): Create `.paw/work/<work-id>/planning/` directory and `.paw/work/<work-id>/planning/.gitignore` with content `*` when in multi-model modes (following the `reviews/` pattern from `paw-final-review/SKILL.md:52-53`).

  3. **Multi-model execution block** (new section, gated by `{{#cli}}`): Following the pattern from `paw-final-review/SKILL.md:87-148`:
     - Resolve model intents to actual model names
     - Present resolved models for user confirmation (planning is interactive/direct-execution)
     - Define the **planning subagent prompt** — a self-contained prompt derived from the existing planning guidelines, focused on producing a single `ImplementationPlan.md`-format document. Subagents execute only the **initial planning** context (not revision or PR response, since those require interactive session state). Each subagent receives the template, strategic guidelines, and quality checklist from the skill, along with the full contents of Spec.md, CodeResearch.md, and SpecResearch.md.
     - **Simple mode** (`multi-model`): Spawn parallel subagents → save per-model plans as `PLAN-{MODEL}.md` in `planning/` → run synthesis
     - **Deep mode** (`multi-model-deep`): Same as simple, then spawn a second round of parallel subagents — each receives all plans and produces `CRITIQUE-{MODEL}.md` analyzing strengths, disagreements, gaps, and synthesis recommendations → save critiques in `planning/` → run synthesis with both plans and critiques
     - **Synthesis**: The session's agent reads all per-model plans (and critiques in deep mode) and produces the final `ImplementationPlan.md`, selecting best phase structure, architecture, and catching blind spots

  4. **VS Code fallback block** (gated by `{{#vscode}}`): If multi-model configured, report fallback message and run single-model (following `paw-final-review/SKILL.md:150-156`)

  5. **Failure handling**: If a subagent fails, proceed with remaining results (minimum 2 models required). If all fail, offer retry or single-model fallback. Note: 2-model configurations are explicitly valid (not just a degraded 3-model scenario) — synthesis works with any count ≥ 2.

  6. **Updated Completion Response**: Report planning mode used, number of models, and per-model artifact paths

- **Tests**: Verify by running multi-model planning with test inputs and checking per-model artifacts and synthesized plan

### Success Criteria:

#### Automated Verification:
- [ ] Agent/skill lint passes: `npm run lint:agent:all`
- [ ] Token thresholds met for paw-planning skill

#### Manual Verification:
- [ ] Single-model mode produces identical behavior to current implementation
- [ ] Multi-model mode spawns 3 parallel subagents, saves `PLAN-{MODEL}.md` files, produces synthesized `ImplementationPlan.md`
- [ ] Deep mode additionally produces `CRITIQUE-{MODEL}.md` files after plan drafts
- [ ] Synthesis references insights from multiple plans (and critiques in deep mode)
- [ ] Planning directory has `.gitignore` with `*` content
- [ ] VS Code fallback works correctly
- [ ] Partial failure (1 model fails) still produces synthesis from remaining 2

---

## Phase 3: Multi-Model Plan Review

### Changes Required:

- **`agents/PAW.agent.md`**: Add orchestrator-level multi-model plan review handling. Since `paw-plan-review` runs as a subagent (cannot spawn sub-subagents), the orchestrator must:

  1. **Read config**: Parse `Plan Review Mode` and `Plan Review Models` from WorkflowContext.md
  2. **If multi-model**: At the plan-review delegation point (`PAW.agent.md:162-163`), instead of spawning a single `paw-plan-review` subagent, resolve model intents and spawn N parallel `paw-plan-review` subagents (one per model) using `task` tool with `model` parameter
  3. **Save per-model verdicts**: Save each model's verdict as `PLAN-REVIEW-{MODEL}.md` in the `planning/` subfolder
  4. **Synthesize verdicts**: Apply weighted verdict logic:
     - PASS if majority of models return PASS
     - All BLOCKING and IMPROVE items from all models surfaced regardless of overall verdict
     - Produce `PLAN-REVIEW-SYNTHESIS.md` in `planning/` subfolder
  5. **If single-model** (or field missing): Delegate to paw-plan-review as a single subagent (current behavior)

  Add this logic in the "Orchestrator-handled" section after subagent returns (`agents/PAW.agent.md:166-172`). The mandatory transition `paw-planning → paw-plan-review` still applies — the orchestrator just spawns multiple instances when multi-model is configured.

  Update the "Subagent delegation" section to note that multi-model plan review spawns multiple parallel instances.

- **Tests**: Verify by configuring multi-model plan review and checking per-model verdict artifacts and synthesis

### Success Criteria:

#### Automated Verification:
- [ ] Agent/skill lint passes: `npm run lint:agent:all`
- [ ] Token thresholds met for PAW.agent.md (agents: 5000 warning / 7000 hard limit)

#### Manual Verification:
- [ ] Single-model plan review works identically to current behavior
- [ ] Multi-model plan review spawns parallel subagents, saves `PLAN-REVIEW-{MODEL}.md` files
- [ ] `PLAN-REVIEW-SYNTHESIS.md` contains weighted verdict with all concerns surfaced
- [ ] When 2/3 models PASS and 1 FAILs: overall verdict is PASS, failing model's concerns surfaced
- [ ] When all 3 models FAIL: overall verdict is FAIL with combined feedback
- [ ] Partial failure (1 model fails): synthesis from remaining 2

---

## Phase 4: Reference Documentation & Workflow Updates

### Changes Required:

- **`skills/paw-workflow/SKILL.md`**: 
  - Update the Activities table (`SKILL.md:57-68`) to note multi-model support for `paw-planning` and `paw-plan-review`
  - Update the Artifact Directory Structure (`SKILL.md:77-92`) to add `planning/` subfolder:
    ```
    ├── planning/               # Multi-model planning artifacts (gitignored)
    │   ├── PLAN-{MODEL}.md     # Per-model plan drafts
    │   ├── CRITIQUE-{MODEL}.md # Debate artifacts (deep mode)
    │   ├── PLAN-REVIEW-{MODEL}.md    # Per-model review verdicts
    │   └── PLAN-REVIEW-SYNTHESIS.md  # Weighted review synthesis
    ```

- **`.gitignore`** (repo root): Add `.paw/work/*/planning/` entry as secondary safeguard (following the `.paw/reviews/` pattern at `.gitignore:78`). The primary gitignore mechanism is the in-directory `.gitignore` with `*` content created in Phase 2; this root entry is a safety net for the nested `work/<work-id>/planning/` path.

- **Tests**: Verify gitignore patterns work by checking `git status` after creating planning artifacts

### Success Criteria:

#### Automated Verification:
- [ ] Agent/skill lint passes: `npm run lint:agent:all`
- [ ] `git status` does not show files in `planning/` subfolder after creating test artifacts

#### Manual Verification:
- [ ] `paw-workflow` Activities table reflects multi-model capabilities
- [ ] Artifact directory structure documentation includes `planning/` subfolder
- [ ] `.gitignore` has `.paw/planning/` entry

---

## Phase 5: Documentation

### Changes Required:
- **`.paw/work/society-of-thought-planning/Docs.md`**: Technical reference covering:
  - Multi-model planning modes (single, multi, deep) with cost comparison
  - Configuration fields and their defaults
  - Artifact structure (planning/ subfolder contents)
  - How synthesis works (simple vs deep)
  - Multi-model plan review weighted verdict logic
  - VS Code fallback behavior
  - Relationship to other multi-model features (#212, #201)
  Load `paw-docs-guidance` for template and conventions.

- **Project docs**: Update `docs/` if planning/review documentation pages exist. Update `DEVELOPING.md` if skill development patterns are documented there (noting the multi-model pattern).

### Success Criteria:
- [ ] Docs.md created with accurate content
- [ ] `mkdocs build` succeeds (if docs infrastructure changes)
- [ ] Content accurately reflects implementation

---

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/221
- Spec: `.paw/work/society-of-thought-planning/Spec.md`
- Research: `.paw/work/society-of-thought-planning/CodeResearch.md`
