# Implementation Plan: Perspective Shifts for SoT Engine

## Overview

Extend the Society of Thought engine with composable perspective overlays — evaluative lenses (temporal, adversarial, custom) that shift specialist review framing without altering specialist identity. Perspectives are a third diversity axis alongside specialist domain and model assignment. The feature adds 4-level perspective discovery (mirroring specialist discovery), a 5-layer prompt composition model, auto/guided/expert perspective selection, perspective attribution in findings and synthesis, and interaction-mode-aware conflict handling.

All changes are to skill files (`.md`), perspective files, shared rules, and documentation. No TypeScript/runtime code changes.

## Current State Analysis

The SoT engine (`skills/paw-sot/SKILL.md`) currently:
- Accepts 8 review context fields (type, coordinates, output_dir, specialists, interaction_mode, interactive, specialist_models, framing) at `SKILL.md:23-35`
- Discovers specialists via 4-level precedence at `SKILL.md:49-64`: workflow → project (`.paw/personas/`) → user (`~/.paw/personas/`) → built-in (`references/specialists/`)
- Composes prompts from 4 layers at `SKILL.md:87-96`: shared rules → context preamble → specialist content → review coordinates
- Executes via parallel (`SKILL.md:104-121`) or debate mode (`SKILL.md:123-155`)
- Synthesizes into `REVIEW-SYNTHESIS.md` at `SKILL.md:157-218` with confidence-weighted aggregation

Callers construct review contexts from config files:
- `paw-final-review` reads WorkflowContext.md (`SKILL.md:138-149`)
- `paw-review-workflow` reads ReviewContext.md (`SKILL.md:181-189`)

The Toulmin output format (`_shared-rules.md:22-43`) has three finding-level metadata fields: Severity, Confidence, Category. No perspective attribution exists. No `references/perspectives/` directory exists.

## Desired End State

- SoT review context accepts `perspectives` (`none` | `auto` | comma-separated names) and `perspective_cap` (positive integer, default 2)
- Perspective files discovered via 4-level precedence: workflow → project (`.paw/perspectives/`) → user (`~/.paw/perspectives/`) → built-in (`references/perspectives/`)
- Three built-in perspectives: `premortem.md`, `retrospective.md`, `red-team.md`
- Prompt composition uses 5 layers: shared rules → context preamble → specialist content → **perspective overlay** → review coordinates
- Each specialist runs once per assigned perspective, producing perspective-attributed findings in `REVIEW-{SPECIALIST}-{PERSPECTIVE}.md`
- Toulmin output includes `**Perspective**` field; REVIEW-SYNTHESIS.md includes "Perspective Diversity" section
- `perspectives: none` produces behavior identical to the current engine (backward compatible)
- Both callers pass perspective config from their config sources; init templates include perspective fields
- User documentation covers the feature end-to-end

## What We're NOT Doing

- **No preset pack definition files** — v1 uses direct perspective names; named packs are syntactic sugar for later
- **No per-model perspective prompt calibration** — post-v1 if coherence degrades on specific models
- **No perspective-specific metrics/dashboards** — attribution in synthesis is sufficient for v1
- **No automated A/B testing** of perspective effectiveness
- **No interaction between perspectives and model assignment** — perspectives don't change which model runs the specialist
- **No changes to moderator mode** — perspectives are applied during execution, not post-synthesis interaction
- **No changes to `paw-review-feedback`** — perspective attribution embedded in finding text flows through the existing pipeline
- **No explicit similarity-threshold novelty stopping** — the engine is prompt-driven; agents implement novelty assessment through reasoning. `perspective_cap` provides the hard limit. A configurable threshold is deferred until v1 usage data informs defaults.

## Spec Deviations

Two spec requirements are intentionally deferred from v1 implementation. The spec should be amended to reflect these deferrals.

**FR-011 (novelty stopping) — deferred to post-v1**: The spec requires "adaptive novelty-based stopping" with a "configurable similarity threshold." In v1, `perspective_cap` serves as the hard limit and the engine relies on prompt-driven reasoning for novelty assessment. An explicit similarity threshold will be added after v1 usage data informs sensible defaults. Rationale: the inverted U-curve research (2–3 diversity axes) supports a simple cap as sufficient for initial release.

**FR-001 (preset pack names) — deferred to post-v1**: The spec allows `perspectives` to accept "a perspective preset pack name." In v1, the input grammar is restricted to `none | auto | comma-separated perspective names`. If an unrecognized name is provided that matches neither a discoverable perspective file nor the reserved values `none`/`auto`, the engine warns and skips it — consistent with specialist discovery's malformed-file handling pattern (`SKILL.md:49-64`). Named packs are syntactic sugar that will be added once the direct-name workflow is proven stable.

**Review workflow default `none` vs spec default `auto`**: The spec's FR-001 defaults `perspectives` to `auto` (engine-level default). The plan sets `auto` for the final review workflow (consistent) but `none` for the review workflow (ReviewContext.md). This is deliberate: perspectives are exploratory and better suited to final review by default; PR review users opt-in. The engine-level default remains `auto` per spec; the review workflow's configuration template overrides to `none` as a conservative opt-in choice.

## Phase Status

- [x] **Phase 1: Perspective Schema & Built-in Perspectives** — Define the perspective file format and create three built-in perspective files
- [x] **Phase 2: Engine Core** — Add perspective discovery, 5-layer prompt composition, perspective-aware execution, and attribution to the SoT engine *(depends on: Phase 1)*
- [x] **Phase 3: Configuration Pipeline** — Thread perspective config through init, WorkflowContext, ReviewContext, and both caller skills *(depends on: Phase 2)*
- [ ] **Phase 4: Synthesis & Conflict Handling** — Add perspective attribution to synthesis, Perspective Diversity section, and mode-aware conflict handling *(depends on: Phase 2)*
- [ ] **Phase 5: Documentation & Integration Testing** — Update user guide, reference docs, specification docs; add workflow integration test *(depends on: Phases 3, 4)*

## Phase Candidates

- [ ] Preset pack aliases (e.g., `ship-readiness` = premortem + red-team) after direct-name flow is stable
- [ ] Configurable similarity-threshold tuning for novelty stopping after v1 usage telemetry

---

## Phase 1: Perspective Schema & Built-in Perspectives

### Changes Required

**New directory**: `skills/paw-sot/references/perspectives/`

**New file**: `skills/paw-sot/references/perspectives/premortem.md`
- Prospective hindsight / future failure analysis
- Schema: H1 name, Lens Type (temporal), Parameters (6-month horizon, system failure scenario), Overlay Template (~50–100 words with `{specialist}` placeholder), Novelty Constraint (evidence-anchoring directive)
- Overlay framing: "It is 6 months after launch and this system caused a significant incident. As the {specialist}, identify what failure modes this change introduces or fails to protect against."
- Novelty constraint: "Tie each predicted failure back to evidence in the artifact, or label it as speculative operational risk"

**New file**: `skills/paw-sot/references/perspectives/retrospective.md`
- Post-production operational review
- Lens type: temporal, 6-month horizon
- Overlay framing: "This code has been running in production for 6 months. As the {specialist}, identify what operational issues, maintenance burdens, or observability gaps have emerged."
- Novelty constraint: "Ground operational concerns in concrete code patterns visible in the artifact"

**New file**: `skills/paw-sot/references/perspectives/red-team.md`
- Adversarial exploitation analysis
- Lens type: adversarial
- Overlay framing: "You are an adversary who has been studying this system for months. As the {specialist}, identify attack vectors, exploitation paths, and trust boundary violations."
- Novelty constraint: "Each attack vector must reference a specific entry point or trust boundary visible in the artifact"

**Perspective file schema** (all three files conform to):

```markdown
# {Name} Perspective

## Lens Type
{temporal | adversarial | custom}

## Parameters
- **Temporal Frame**: {duration or "N/A"}
- **Scenario**: {one-sentence scenario assumption}

## Overlay Template
{50–100 word prompt overlay with {specialist} placeholder}

## Novelty Constraint
{Directive requiring evidence-anchoring of findings}
```

### Success Criteria

#### Automated Verification:
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh skills/paw-sot/references/perspectives/premortem.md` (repeat for all three)
- [ ] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Each overlay template is 50–100 words and contains `{specialist}` placeholder
- [ ] Novelty constraints require evidence-anchoring (no unconstrained speculation)
- [ ] Each file contains all required schema sections (H1, Lens Type, Parameters, Overlay Template, Novelty Constraint)

---

## Phase 2: Engine Core

### Changes Required

**Modified file**: `skills/paw-sot/SKILL.md`

**Review Context Input Contract** (at `SKILL.md:23-35`):
- Add row: `perspectives` | no | `none` \| `auto` (default) \| comma-separated names | Which perspective overlays to apply
- Add row: `perspective_cap` | no | positive integer (default `2`) | Max perspective overlays per specialist

**New section**: "Perspective Discovery" (after Specialist Discovery, before Adaptive Selection ~line 65):
- 4-level precedence mirroring specialist discovery:
  1. Workflow: parse `perspectives` from review context — if explicit comma-separated list, resolve only those names
  2. Project: scan `.paw/perspectives/<name>.md` files in the repository
  3. User: scan `~/.paw/perspectives/<name>.md` files
  4. Built-in: scan `references/perspectives/<name>.md` files
- Resolution rules parallel to specialist discovery: most-specific-wins, skip malformed with warning, `none` → skip discovery entirely, `auto` → discover all then select based on artifact signals
- Unknown name handling: if a name in the comma-separated list matches no discoverable perspective file and is not a reserved value (`none`/`auto`), warn and skip — consistent with specialist discovery's malformed-file pattern (`SKILL.md:49-64`)
- When `perspectives` is `none`: skip all perspective-related processing — engine behaves identically to current implementation

**New section**: "Perspective Auto-Selection" (after Perspective Discovery):
- When `perspectives` is `auto`: analyze review target (artifact type, file types, subsystems, estimated complexity) and select up to `perspective_cap` perspectives per specialist
- Selection heuristics: temporal perspectives (premortem, retrospective) are relevant for code changes with operational or scaling implications; adversarial perspectives (red-team) are relevant for changes touching trust boundaries, external interfaces, or authentication
- If no perspectives meet relevance threshold: proceed with baseline-only review and note in synthesis

**Modified section**: "Prompt Composition" (at `SKILL.md:87-96`):
- Expand from 4 layers to 5:
  1. Shared rules (unchanged)
  2. Context preamble (unchanged)
  3. Specialist content (unchanged)
  4. **Perspective overlay** — load perspective file, resolve `{specialist}` placeholder, inject as evaluative lens framing
  5. Review coordinates (unchanged)
- When no perspective is assigned (`perspectives: none`): skip layer 4, composition identical to current 4-layer model
- **Prompt budget overflow**: If the composed 5-layer prompt approaches model context limits, the perspective overlay (layer 4) is the first candidate for truncation, preserving specialist identity and review coordinates. A warning is emitted when truncation occurs. Given overlays are 50–100 words, this edge case is unlikely in practice.

**Modified section**: "Parallel Mode" (at `SKILL.md:104-121`):
- Each specialist runs once per assigned perspective. With 2 perspectives selected, specialist runs twice (once per perspective).
- Output file naming: `REVIEW-{SPECIALIST-NAME}-{PERSPECTIVE}.md` for perspective runs; `REVIEW-{SPECIALIST-NAME}.md` when no perspective applied (backward compatible)
- Each subagent's composed prompt includes the perspective overlay; findings from that subagent are attributed to the perspective

**Modified section**: "Debate Mode" (at `SKILL.md:123-155`):
- Perspective-variant findings from the same specialist participate in debate rounds as distinct positions
- Thread attribution includes both specialist name and perspective name
- Conflicts between perspectives are resolved through existing cross-examination mechanism (no special handling beyond perspective attribution in thread metadata)

**Modified file**: `skills/paw-sot/references/specialists/_shared-rules.md`

**Toulmin output format** (at `_shared-rules.md:22-43`):
- Add `**Perspective**: baseline | {perspective-name}` field to finding header, after `**Category**`
- This field is **conditional**: only emitted when perspectives are active in the review context. When `perspectives: none`, the Toulmin format remains identical to the pre-change format (preserving byte-identical output per SC-004).

### Success Criteria

#### Automated Verification:
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh skills/paw-sot/SKILL.md`
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh skills/paw-sot/references/specialists/_shared-rules.md`
- [ ] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Review context table has 10 fields (8 existing + perspectives + perspective_cap)
- [ ] Prompt composition section describes 5 layers with perspective overlay as layer 4
- [ ] `perspectives: none` produces byte-identical output to the pre-change engine (no perspective-related content injected)
- [ ] Parallel mode describes perspective-aware execution with `REVIEW-{SPECIALIST}-{PERSPECTIVE}.md` naming
- [ ] Debate mode describes perspective-variant findings participating in thread lifecycle

---

## Phase 3: Configuration Pipeline

### Changes Required

**Modified file**: `skills/paw-init/SKILL.md`

**Input parameters table** (at `SKILL.md:42-47`):
- Add row: `final_review_perspectives` | No | `auto` | `none`, `auto`, comma-separated perspective names
- Add row: `final_review_perspective_cap` | No | `2` | positive integer

**SoT validation section** (at `SKILL.md:95-106`):
- Add perspective validation: validate `final_review_perspectives` is `none`, `auto`, or comma-separated names; validate `final_review_perspective_cap` is positive integer
- Perspective fields only relevant when `final_review_mode` is `society-of-thought`

**WorkflowContext.md template** (at `SKILL.md:117-148`):
- Add after `Final Review Specialist Models` line:
  - `Final Review Perspectives: <final_review_perspectives>`
  - `Final Review Perspective Cap: <final_review_perspective_cap>`

**Modified file**: `skills/paw-final-review/SKILL.md`

**Review context construction table** (at `SKILL.md:138-149`):
- Add row: `perspectives` → `Final Review Perspectives` from WorkflowContext.md
- Add row: `perspective_cap` → `Final Review Perspective Cap` from WorkflowContext.md

**Modified file**: `skills/paw-review-understanding/SKILL.md`

**ReviewContext.md Review Configuration section** (at `SKILL.md:256-264`):
- Add after `Review Specialist Models` line:
  - `**Review Perspectives**: <none (default) | auto | comma-separated names>`
  - `**Review Perspective Cap**: <2 (default) | positive integer>`
- Default is `none` for review workflow (opt-in for PR reviews; perspectives are exploratory and better suited to final review by default)

**Modified file**: `skills/paw-review-workflow/SKILL.md`

**Review context construction table** (at `SKILL.md:181-189`):
- Add row: `perspectives` → `Review Perspectives` from ReviewContext.md
- Add row: `perspective_cap` → `Review Perspective Cap` from ReviewContext.md

### Success Criteria

#### Automated Verification:
- [ ] Prompt lint passes: `npm run lint:skills`
- [ ] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] WorkflowContext.md template includes both perspective fields after `Final Review Specialist Models`
- [ ] ReviewContext.md template includes both perspective fields with `none` as default
- [ ] Both caller skills' review context tables include perspective rows sourced from their respective config files
- [ ] Init validation covers perspective field formats when SoT mode is active

---

## Phase 4: Synthesis & Conflict Handling

### Changes Required

**Modified file**: `skills/paw-sot/SKILL.md`

**Synthesis section** (at `SKILL.md:157-218`):

_Synthesis requirements additions:_
- **File discovery update**: The synthesis agent discovers all `REVIEW-*.md` files in the output directory, covering both legacy `REVIEW-{SPECIALIST}.md` and perspective-attributed `REVIEW-{SPECIALIST}-{PERSPECTIVE}.md` patterns. This ensures perspective-specific findings are included in synthesis regardless of whether perspectives are active.
- The synthesis agent must preserve perspective attribution from specialist findings — each finding in the synthesis includes the `**Perspective**` field from the source (when present)
- When merging findings from different perspectives on the same specialist, treat perspective-attributed findings as distinct positions even if they address the same code location

_Conflict handling additions:_
- **Parallel mode**: Inter-perspective conflicts on the same specialist are surfaced with both positions and their perspective context, flagged as "high-signal perspective disagreement" in the Dissent Log
- **Debate mode**: Perspective-variant findings participate in debate rounds as distinct positions. The debate mechanism resolves them through cross-examination — no special handling beyond perspective attribution in thread metadata
- **Intra-specialist perspective contrast**: When synthesizing debate round summaries, explicitly contrast baseline vs perspective views from the same specialist to ensure the debate loop addresses intra-specialist perspective disagreements rather than glossing over them

**REVIEW-SYNTHESIS.md structure** (at `SKILL.md:180-218`):

_Review Summary additions:_
- `- Perspectives: [list of perspectives applied, or "none"]`
- `- Perspective cap: [configured cap value]`

_New section_ "Perspective Diversity" (after Review Summary, before Must-Fix Findings):

```markdown
## Perspective Diversity
- Perspectives applied: [perspective-name → specialist list, for each active perspective]
- Selection mode: [auto | guided | none]
- Selection rationale: [if auto, why these perspectives were chosen for this artifact]
- Perspectives skipped: [if any, name + reason (cap, relevance threshold)]
```

_Finding format note:_
- Each finding in Must-Fix, Should-Fix, Consider sections preserves the `**Perspective**` attribution from the source specialist. Findings attributed to `baseline` were produced without a perspective overlay.

### Success Criteria

#### Automated Verification:
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh skills/paw-sot/SKILL.md`
- [ ] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] REVIEW-SYNTHESIS.md template includes Perspective Diversity section between Review Summary and Must-Fix Findings
- [ ] Review Summary includes perspective-related metadata fields
- [ ] Synthesis requirements address perspective attribution preservation and inter-perspective conflict handling for both modes
- [ ] Dissent Log description covers perspective disagreements as a category

---

## Phase 5: Documentation & Integration Testing

### Changes Required

**New file**: `.paw/work/temporal-perspective-shifts/Docs.md`
- Technical reference capturing as-built architecture: review context fields, discovery precedence, 5-layer composition, execution changes, synthesis semantics, perspective file schema
- Load `paw-docs-guidance` utility skill for template and conventions

**Modified file**: `docs/guide/society-of-thought-review.md`

_Configuration tables_ (lines 30–36 and 42–48):
- Add `Final Review Perspectives` row: `none`, `auto`, or comma-separated names | `auto`
- Add `Final Review Perspective Cap` row: positive integer | `2`
- Add `Review Perspectives` row: `none`, `auto`, or comma-separated names | `none`
- Add `Review Perspective Cap` row: positive integer | `2`

_New section_: "Perspective Overlays" (after "Why Perspective Diversity Matters", before "Configuration"):
- Concept explanation: perspectives are evaluative lenses that shift when/how a specialist reviews without changing who they are
- Three built-in perspectives: premortem, retrospective, red-team
- Three configuration tiers: auto (engine selects), guided (specify by name), none (opt out)
- `perspective_cap` controls cost
- Perspective attribution in findings

_New section_: "Custom Perspectives" (after "Custom Specialists"):
- File placement: `.paw/perspectives/<name>.md` (project) or `~/.paw/perspectives/<name>.md` (user)
- 4-level precedence: project overrides user overrides built-in
- Schema scaffold showing required sections
- `{specialist}` placeholder documentation

_Update section_: "Why Perspective Diversity Matters" (lines 18–22):
- Add paragraph on perspective overlays as third diversity axis

**Modified file**: `docs/reference/artifacts.md`
- Add `REVIEW-{SPECIALIST-NAME}-{PERSPECTIVE}.md` file documentation
- Note `**Perspective**` field in finding format

**Modified files**: `docs/specification/implementation.md`, `docs/specification/review.md`
- Add mention of perspective overlay support in SoT evaluation sections

**Spec alignment verification**: Verify Spec.md amendments (FR-001, FR-011, SC-001, SC-005 changes made during planning) remain consistent with implemented behavior. Update if any implementation decisions altered the deferred items.

**New/modified test**: `tests/integration/tests/workflows/` — Workflow integration test for perspective discovery and synthesis attribution
- Test scenario: seed a SoT review with `perspectives: premortem,red-team` and 2 specialists
- Assert: perspective discovery resolves built-in files, synthesis output includes Perspective Diversity section, finding format includes `**Perspective**` field, output files follow `REVIEW-{SPECIALIST}-{PERSPECTIVE}.md` naming
- Use `createTestContext()`, `RuleBasedAnswerer`, and structural assertions per project integration test patterns

### Success Criteria

#### Automated Verification:
- [ ] Docs build passes: `source .venv/bin/activate && mkdocs build --strict`
- [ ] Prompt lint passes: `npm run lint:skills`
- [ ] Lint passes: `npm run lint`
- [ ] Integration test passes: `cd tests/integration && npx tsx --test tests/workflows/sot-perspectives.test.ts`

#### Manual Verification:
- [ ] SoT guide page covers perspectives with config tables, concept explanation, built-in presets, custom perspective guide, and precedence rules
- [ ] Docs.md captures implementation details sufficient for future maintenance
- [ ] Configuration defaults match implementation (`perspectives: auto` for final review, `none` for review workflow)
- [ ] Integration test validates perspective discovery, attribution in findings, and synthesis output structure

---

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/261
- Spec: `.paw/work/temporal-perspective-shifts/Spec.md`
- Research: `.paw/work/temporal-perspective-shifts/CodeResearch.md`
