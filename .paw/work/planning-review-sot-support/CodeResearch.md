---
date: 2026-02-27T12:00:00-05:00
git_commit: aa754f5cf6407cd7a0cde52428f6a58cbdfdf549
branch: feature/planning-review-sot-support
repository: phased-agent-workflow
topic: "Planning Review SoT Support — Implementation Research"
tags: [research, codebase, paw-init, paw-planning-docs-review, paw-final-review, paw-sot, society-of-thought, perspectives]
status: complete
last_updated: 2026-02-27
---

# Research: Planning Review SoT Support

## Research Question

How are the three target files (`paw-init`, `paw-planning-docs-review`, and WorkflowContext.md template) currently structured, and how does the existing `paw-final-review` + `paw-sot` integration work as the reference implementation to mirror?

## Summary

The implementation touches three files across two skills. `paw-init` already has full SoT config for final review (specialists, interaction mode, specialist models, perspectives, perspective cap) but planning review only has `single-model`/`multi-model` modes. `paw-planning-docs-review` has a well-structured 7-step procedure with mode branching in Step 4 and smart mode heuristic in Step 5, but lacks any SoT path. `paw-final-review` provides the exact reference implementation: it constructs a review context table mapping WorkflowContext fields to SoT engine inputs, has a separate SoT classification heuristic for smart mode, and invokes moderator mode as a second paw-sot call. The `paw-sot` engine expects a review context with `type`, `coordinates`, `output_dir`, `specialists`, `interaction_mode`, `interactive`, `specialist_models`, `perspectives`, and `perspective_cap` fields. The `artifacts` type triggers a design/planning preamble. Perspectives use `REVIEW-{SPECIALIST-NAME}-{PERSPECTIVE}.md` file naming.

## Documentation System

- **Framework**: mkdocs (Material theme)
- **Docs Directory**: `docs/`
- **Navigation Config**: `mkdocs.yml:61-78`
- **Style Conventions**: admonition blocks, Material features (instant nav, search), code copy; guide pages use practical tone, specification pages use technical reference tone
- **Build Command**: `mkdocs build --strict` (validates links)
- **Standard Files**: `README.md` (root), `CHANGELOG-cli-v0.1.0.md` (root), `DEVELOPING.md` (root)

## Verification Commands

- **Test Command**: `npm run test:integration:skills` (fast, no LLM), `npm run test:integration:workflows` (slow, requires auth)
- **Lint Command**: `npm run lint` (code), `npm run lint:agent:all` (agents+skills), `./scripts/lint-prompting.sh skills/<name>/SKILL.md` (individual skill)
- **Build Command**: `npm run build`
- **Type Check**: included in `npm run build` (TypeScript)

## Detailed Findings

### 1. paw-init Current Structure

**Input Parameters Table** (`skills/paw-init/SKILL.md:24-55`)

The input parameters table defines all configurable fields. Planning review fields are at lines 52-55:

- `planning_docs_review`: `enabled`/`disabled` (default: `enabled`, `disabled` if minimal) — line 52
- `planning_review_mode`: `single-model`/`multi-model` (default: `multi-model`) — line 53
- `planning_review_interactive`: `true`/`false`/`smart` (default: `smart`) — line 54
- `planning_review_models`: comma-separated model names (default: latest GPT, latest Gemini, latest Claude Opus) — line 55

Final review SoT fields are at lines 42-49:

- `final_review_mode`: `single-model`/`multi-model`/`society-of-thought` — line 42
- `final_review_specialists`: `all`, comma-separated, or `adaptive:<N>` — line 45
- `final_review_interaction_mode`: `parallel`/`debate` — line 46
- `final_review_specialist_models`: `none`, model pool, pinned pairs, or mixed — line 47
- `final_review_perspectives`: `none`/`auto`/comma-separated names — line 48
- `final_review_perspective_cap`: positive integer (default: `2`) — line 49

**Key observation**: Planning review has 4 config fields; final review has 10 (including SoT-specific ones). The spec requires adding 5 new planning review fields to achieve parity: `planning_review_specialists`, `planning_review_interaction_mode`, `planning_review_specialist_models`, `planning_review_perspectives`, `planning_review_perspective_cap`.

**Configuration Validation** (`skills/paw-init/SKILL.md:81-85`)

Current validation rules at lines 81-85:
- `minimal` mode → `review_strategy` MUST be `local`
- `planning-only`/`final-pr-only` → `review_strategy` MUST be `local`
- `final_review_mode` is `society-of-thought` → `final_agent_review` MUST be `enabled`

No validation for planning review mode currently. The spec's FR-010 requires adding SoT-specific validation when `planning_review_mode` is `society-of-thought`.

**Society-of-Thought Configuration Section** (`skills/paw-init/SKILL.md:97-111`)

This section describes how SoT fields are validated and stored when `final_review_mode` is `society-of-thought`. Key patterns at lines 97-111:
- Specialist values validated: `all`, comma-separated names, or `adaptive:<N>` (line 99)
- Interaction mode validated: `parallel` or `debate` (line 100)
- Specialist models format validated: `none`, pool, pinning, mixed (lines 101-106)
- Model intents resolved via existing resolution (line 106)
- `final_review_models` is ignored when SoT is active (line 107)
- Perspectives validated: `none`, `auto`, or comma-separated names (line 108)
- Perspective cap validated: positive integer (line 109)
- SoT config presented as part of configuration summary (line 110)

This entire section needs a parallel for planning review SoT config.

**WorkflowContext.md Template** (`skills/paw-init/SKILL.md:121-154`)

Template at lines 121-154 contains all fields in key-value format. Planning review fields at lines 148-151:

```
Planning Docs Review: <planning_docs_review>
Planning Review Mode: <planning_review_mode>
Planning Review Interactive: <planning_review_interactive>
Planning Review Models: <planning_review_models>
```

Final review SoT fields at lines 138-145:

```
Final Review Specialists: <final_review_specialists>
Final Review Interaction Mode: <final_review_interaction_mode>
Final Review Specialist Models: <final_review_specialist_models>
Final Review Perspectives: <final_review_perspectives>
Final Review Perspective Cap: <final_review_perspective_cap>
```

New planning review SoT fields need to be inserted after line 151 (after `Planning Review Models`), mirroring the final review SoT field pattern.

### 2. paw-planning-docs-review Current Structure

**Full Skill Structure** (`skills/paw-planning-docs-review/SKILL.md:1-278`)

The skill is a 278-line file organized as:
- YAML frontmatter: lines 1-4
- Title + execution context: lines 6-11
- Capabilities: lines 13-20
- Procedure (7 steps): lines 22-268
- Review Artifacts table: lines 269-278

**Step 1: Read Configuration** (`skills/paw-planning-docs-review/SKILL.md:24-39`)

Reads 4 fields from WorkflowContext.md (lines 26-30):
- `Planning Docs Review`: enabled/disabled
- `Planning Review Mode`: single-model/multi-model
- `Planning Review Interactive`: true/false/smart
- `Planning Review Models`: comma-separated

Lines 32-33: If disabled, skip and return `complete`.
Lines 34-36 (CLI): If multi-model, parse models list.
Lines 37-39 (VS Code): Only supports single-model, degrade if multi-model configured.

**Step 4: Execute Review (CLI)** (`skills/paw-planning-docs-review/SKILL.md:100-141`)

Two branches:
- Single-model (lines 102-104): Execute review, save to `REVIEW.md`
- Multi-model (lines 106-140): Resolve model intents, spawn parallel subagents, save `REVIEW-{MODEL}.md`, then generate `REVIEW-SYNTHESIS.md`

No SoT branch exists. The SoT path needs to be added as a third branch after multi-model, mirroring `paw-final-review`'s pattern.

**Step 4: Execute Review (VS Code)** (`skills/paw-planning-docs-review/SKILL.md:143-149`)

Lines 146-147: VS Code only supports single-model, reports if multi-model configured.
No mention of SoT degradation. Needs to add SoT → single-model degradation message (FR-009).

**Step 5: Resolution — Smart Mode** (`skills/paw-planning-docs-review/SKILL.md:192-240`)

Smart mode heuristic at lines 192-240:
- Single-model smart → degrades to interactive (lines 194-195)
- Multi-model smart → classification heuristic table at lines 199-207:

| Agreement Level | Severity | Affected Artifact | Classification |
|---|---|---|---|
| Consensus | must-fix/should-fix | spec or plan (single) | `auto-apply` |
| Consensus | must-fix/should-fix | both | `interactive` |
| Partial | must-fix/should-fix | any | `interactive` |
| Single-model | must-fix/should-fix | any | `interactive` |
| Any | consider | any | `report-only` |

Key difference from final review: planning review heuristic includes an **Affected Artifact** column (spec/plan/both) because findings route to different skills. Final review's heuristic does not have this column.

The spec's FR-006 requires a **SoT-specific** heuristic that adds confidence × grounding dimensions while preserving the affected artifact routing dimension. This combines both: the planning review's artifact-aware routing + final review's confidence/grounding dimensions.

**Resolution Routing** (`skills/paw-planning-docs-review/SKILL.md:179-186`)

Lines 179-186 define 5 routing options:
- `apply-to-spec`: Load `paw-spec` (Revise mode)
- `apply-to-plan`: Load `paw-planning` (Plan Revision mode)
- `apply-to-both`: Apply to spec first, then plan (sequential)
- `skip`: Record as skipped
- `discuss`: Discuss, then apply or skip

**Review Artifacts Table** (`skills/paw-planning-docs-review/SKILL.md:269-278`)

Lines 269-278:

| Mode | Files Created |
|---|---|
| single-model | `REVIEW.md` |
| multi-model | `REVIEW-{MODEL}.md` per model, `REVIEW-SYNTHESIS.md` |

Location: `.paw/work/<work-id>/reviews/planning/`

FR-008 requires adding SoT row: `REVIEW-{SPECIALIST-NAME}.md`, `REVIEW-{SPECIALIST-NAME}-{PERSPECTIVE}.md`, `REVIEW-SYNTHESIS.md`.

### 3. paw-final-review SoT Integration (Reference Implementation)

**Step 1: SoT Config Reading** (`skills/paw-final-review/SKILL.md:33-38`)

Lines 33-38 (CLI section): When mode is `society-of-thought`, reads:
- `Final Review Specialists`: `all` | comma-separated | `adaptive:<N>`
- `Final Review Interaction Mode`: `parallel` | `debate`
- `Final Review Specialist Models`: `none` | pool | pinned | mixed

**Step 4: SoT Execution** (`skills/paw-final-review/SKILL.md:136-153`)

Lines 136-153: The SoT execution path constructs a review context table:

| Review Context Field | Source |
|---|---|
| `type` | `diff` |
| `coordinates` | Diff + artifact paths |
| `output_dir` | `.paw/work/<work-id>/reviews/` |
| `specialists` | `Final Review Specialists` from WorkflowContext |
| `interaction_mode` | `Final Review Interaction Mode` from WorkflowContext |
| `interactive` | `Final Review Interactive` from WorkflowContext |
| `specialist_models` | `Final Review Specialist Models` from WorkflowContext |
| `perspectives` | `Final Review Perspectives` from WorkflowContext |
| `perspective_cap` | `Final Review Perspective Cap` from WorkflowContext |

For planning docs review, the changes needed:
- `type` → `artifacts` (not `diff`)
- `coordinates` → Spec.md, ImplementationPlan.md, CodeResearch.md paths (not diff range)
- `output_dir` → `.paw/work/<work-id>/reviews/planning/`
- All other fields → map from `Planning Review *` WorkflowContext fields

**Step 5: SoT Resolution — Interactive** (`skills/paw-final-review/SKILL.md:198-201`)

Lines 198-201: SoT mode processes REVIEW-SYNTHESIS.md findings by severity, presents trade-offs from "Trade-offs Requiring Decision" section.

**Step 5: SoT Smart Mode Heuristic** (`skills/paw-final-review/SKILL.md:222-231`)

Lines 222-231: The SoT classification heuristic:

| Confidence | Grounding | Severity | Classification |
|---|---|---|---|
| HIGH | Direct | must-fix | `auto-apply` |
| HIGH | Direct | should-fix | `auto-apply` |
| HIGH | Inferential | must-fix/should-fix | `interactive` |
| MEDIUM/LOW | any | must-fix/should-fix | `interactive` |
| Any | any | consider | `report-only` |
| — | — | trade-off | `interactive` (always) |

This is the heuristic to mirror for planning review SoT, **plus** adding the Affected Artifact dimension from the existing planning review multi-model heuristic. Per the spec (FR-006): single-artifact consensus → auto-route, multi-artifact → always interactive.

**VS Code Degradation** (`skills/paw-final-review/SKILL.md:160-163`)

Lines 160-163: If `society-of-thought` configured in VS Code, reports: "Society-of-thought requires CLI for specialist persona loading (see issue #240). Running single-model review." This is the degradation message pattern to mirror for planning docs review (FR-009).

**Moderator Mode** (`skills/paw-final-review/SKILL.md:266-276`)

Lines 266-276: Moderator mode invocation:
- Condition: `Final Review Mode` is `society-of-thought` AND (`Final Review Interactive` is `true`, or `smart` with significant findings remaining)
- Invokes `paw-sot` a **second time** with review context `type` (same as orchestration), `output_dir`, and review coordinates
- Exit: user says "done"/"continue"/"proceed"
- Skip: `interactive` is `false`, no findings, or `smart` with only consider-tier findings

For planning review: same pattern but with `type: artifacts` and planning artifact coordinates.

### 4. paw-sot Review Context Contract

**Input Contract** (`skills/paw-sot/SKILL.md:23-37`)

Lines 23-37: Full review context field table:

| Field | Required | Values |
|---|---|---|
| `type` | yes | `diff` / `artifacts` / `freeform` |
| `coordinates` | yes | diff range, artifact paths, or content description |
| `output_dir` | yes | directory path |
| `specialists` | no | `all` (default) / comma-separated / `adaptive:<N>` |
| `interaction_mode` | yes | `parallel` / `debate` |
| `interactive` | yes | `true` / `false` / `smart` |
| `specialist_models` | no | `none` / model pool / pinned pairs / mixed |
| `framing` | no | free text (for `freeform` type) |
| `perspectives` | no | `none` / `auto` (default) / comma-separated names |
| `perspective_cap` | no | positive integer (default `2`) |

**Context-Adaptive Preambles** (`skills/paw-sot/SKILL.md:40-49`)

Lines 40-49: Three type-dependent preambles:

- `diff` (line 43): Code/implementation review — "Look for bugs, security issues, performance problems, pattern violations, and correctness gaps in the diff. Cite specific file paths and line numbers."
- `artifacts` (line 46): Design/planning review — "Apply your cognitive strategy to design decisions, architectural choices, and unstated assumptions... look for gaps in reasoning, missing edge cases, feasibility risks, and cross-concern conflicts. Reference specific sections and claims in the documents rather than code lines."
- `freeform` (line 49): Use caller's `framing` field or neutral default.

The `artifacts` type preamble is exactly what planning docs review needs — no custom framing required. This validates the spec's assumption that `paw-sot`'s artifacts type is sufficient.

### 5. paw-sot Perspective Support

**Perspective Discovery** (`skills/paw-sot/SKILL.md:87-101`)

Lines 87-101: 4-level precedence discovery (workflow → project → user → built-in), mirroring specialist discovery. Resolution rules:
- Most-specific-wins for name conflicts
- Skip malformed files with warning
- `none` → skip entirely
- `auto` → discover all, then select based on artifact signals

**Perspective Auto-Selection** (`skills/paw-sot/SKILL.md:103-113`)

Lines 103-113: When `auto`, analyze review target and select up to `perspective_cap` per specialist:
- Temporal perspectives (premortem, retrospective): relevant for operational implications, scaling, dependencies
- Adversarial perspectives (red-team): relevant for trust boundaries, external interfaces, auth, data handling
- No relevant perspectives → use built-in `baseline` perspective
- Budget-aware: total calls = specialists × assigned perspectives

**Perspective in Prompt Composition** (`skills/paw-sot/SKILL.md:116-128`)

Lines 121-122: Layer 4 of prompt composition is the perspective overlay. When assigned, load perspective file, resolve `{specialist}` placeholder, inject as evaluative lens. When no perspective (`perspectives: none`), skip this layer entirely.

**Perspective File Naming** (`skills/paw-sot/SKILL.md:139-142`)

Lines 139-142: Output file naming:
- With perspective: `REVIEW-{SPECIALIST-NAME}-{PERSPECTIVE}.md`
- Without perspective: `REVIEW-{SPECIALIST-NAME}.md` (backward compatible)

**Perspective-Aware Synthesis** (`skills/paw-sot/SKILL.md:214-219`)

Lines 214-219: Synthesis preserves `**Perspective**` attribution, treats perspective-attributed findings as distinct positions, and surfaces inter-perspective conflicts in Dissent Log.

**Perspectives in Review Context** (`skills/paw-sot/SKILL.md:35-36`)

- `perspectives` field (line 35): `none` / `auto` (default) / comma-separated names
- `perspective_cap` field (line 36): positive integer (default `2`)

Both fields are passed directly from the calling skill's WorkflowContext mapping. The planning docs review needs to map `Planning Review Perspectives` → `perspectives` and `Planning Review Perspective Cap` → `perspective_cap`.

### 6. paw-transition Planning-Docs-Review Handling

**Mandatory Transitions Table** (`skills/paw-transition/SKILL.md:40-50`)

Lines 40-50: The transition table does not have an explicit entry for `paw-planning-docs-review`. The planning docs review is handled by the orchestrator based on the `Planning Docs Review` field in WorkflowContext.md — it is invoked after `paw-plan-review` passes if enabled.

**Stage Boundary References** (`skills/paw-transition/SKILL.md:69-70`)

Lines 69-70: Two relevant stage boundaries:
- `plan-review passes → code-research` (this is wrong for full mode; plan-review → planning-docs-review when enabled)
- `paw-planning-docs-review complete → implement (Phase 1)`

**Stage-to-Milestone Mapping** (`skills/paw-transition/SKILL.md:76-86`)

Line 82: `paw-planning-docs-review complete` → milestone "Planning Documents Review complete"

**Preflight Checks** (`skills/paw-transition/SKILL.md:122-123`)

Lines 122-123: For `paw-planning-docs-review`:
- Spec.md exists (unless minimal mode)
- ImplementationPlan.md exists

No references to review mode in paw-transition. The transition skill is mode-agnostic — it checks artifact existence, not review configuration. No changes needed to paw-transition for this work.

### 7. Documentation Infrastructure

**Files referencing planning docs review or its configuration:**

| File | References | Lines |
|---|---|---|
| `docs/specification/implementation.md` | Activity skill description, configuration table | Lines 67-68, 90, 243-256 |
| `docs/guide/workflow-modes.md` | Planning Docs Review Configuration table | Lines 191-199 |
| `docs/reference/agents.md` | Skills table entry, workflow stages list | Lines 53, 76-77 |
| `docs/reference/artifacts.md` | WorkflowContext field table, directory structure | Lines 22-23, 70-75 |

**Files referencing society-of-thought or perspectives:**

| File | References |
|---|---|
| `docs/guide/society-of-thought-review.md` | Full SoT guide — specialists, perspectives, config, interaction modes (278 lines) |
| `docs/guide/workflow-modes.md` | Final Review Mode configuration table (line 156), SoT mentioned in options |
| `docs/specification/implementation.md` | Stage 03.5 SoT description (lines 145-147), activity skill entry (lines 239-241) |
| `docs/specification/review.md` | Stage R2 SoT mode (lines 128-182), artifacts note (line 309) |
| `docs/reference/agents.md` | paw-sot utility skill entry (line 67), paw-final-review SoT delegation (line 56) |
| `docs/reference/artifacts.md` | SoT artifact file patterns (lines 34-37), REVIEW-SYNTHESIS.md section (lines 191-208) |

**Docs that need updating for this work:**

1. **`docs/guide/workflow-modes.md:191-199`** — Planning Docs Review Configuration table currently lists only `single-model`/`multi-model`. Needs `society-of-thought` added and new SoT-specific fields.

2. **`docs/guide/society-of-thought-review.md`** — Currently describes two integration points (implementation + review workflows). Needs a third row for planning docs review: calling skill = `paw-planning-docs-review`, config source = WorkflowContext.md, post-synthesis flow = apply-to-spec/apply-to-plan routing. Also needs planning review configuration table.

3. **`docs/specification/implementation.md:243-256`** — `paw-planning-docs-review` activity skill description and configuration table. Currently lists only `single-model`/`multi-model`. Needs `society-of-thought` and new fields.

4. **`docs/reference/artifacts.md:70-75`** — WorkflowContext.md field table. Currently missing `Final Review Specialist Models`, `Final Review Perspectives`, `Final Review Perspective Cap`, and all new planning review SoT fields.

5. **`docs/reference/agents.md:53`** — `paw-planning-docs-review` skills table entry mentions "REVIEW*.md in reviews/planning/" which is correct but may need SoT delegation note (like `paw-final-review` has on line 56).

**What docs were updated when SoT was added to final review:**
- `docs/guide/society-of-thought-review.md` was created as the primary SoT guide
- `docs/guide/workflow-modes.md` was updated with SoT in Final Review Mode options
- `docs/specification/implementation.md` was updated with Stage 03.5 SoT description
- `docs/specification/review.md` was updated with SoT evaluation mode
- `docs/reference/artifacts.md` was updated with SoT artifact patterns and REVIEW-SYNTHESIS.md section
- `docs/reference/agents.md` was updated with `paw-sot` utility skill entry

## Code References

- `skills/paw-init/SKILL.md:24-55` — Input parameters table (all config fields)
- `skills/paw-init/SKILL.md:42-49` — Final review SoT fields in parameters table
- `skills/paw-init/SKILL.md:52-55` — Planning review fields in parameters table (current, no SoT)
- `skills/paw-init/SKILL.md:81-85` — Configuration validation rules
- `skills/paw-init/SKILL.md:97-111` — Society-of-Thought Configuration section (final review)
- `skills/paw-init/SKILL.md:121-154` — WorkflowContext.md template
- `skills/paw-init/SKILL.md:138-145` — Final review SoT fields in template
- `skills/paw-init/SKILL.md:148-151` — Planning review fields in template (current, no SoT)
- `skills/paw-planning-docs-review/SKILL.md:24-39` — Step 1: Read Configuration
- `skills/paw-planning-docs-review/SKILL.md:100-141` — Step 4: Execute Review (CLI) — single-model + multi-model branches
- `skills/paw-planning-docs-review/SKILL.md:143-149` — Step 4: Execute Review (VS Code)
- `skills/paw-planning-docs-review/SKILL.md:155-191` — Step 5: Resolution (interactive = true)
- `skills/paw-planning-docs-review/SKILL.md:192-240` — Step 5: Resolution (smart mode) — classification heuristic
- `skills/paw-planning-docs-review/SKILL.md:199-207` — Multi-model smart mode heuristic table
- `skills/paw-planning-docs-review/SKILL.md:269-278` — Review Artifacts table
- `skills/paw-final-review/SKILL.md:33-38` — SoT config reading in Step 1
- `skills/paw-final-review/SKILL.md:136-153` — SoT execution: review context construction table
- `skills/paw-final-review/SKILL.md:160-163` — VS Code SoT degradation message
- `skills/paw-final-review/SKILL.md:198-201` — SoT resolution in interactive mode
- `skills/paw-final-review/SKILL.md:222-231` — SoT smart mode classification heuristic
- `skills/paw-final-review/SKILL.md:266-276` — Moderator mode invocation and conditions
- `skills/paw-sot/SKILL.md:23-37` — Review Context Input Contract table
- `skills/paw-sot/SKILL.md:40-49` — Context-Adaptive Preambles (diff, artifacts, freeform)
- `skills/paw-sot/SKILL.md:87-101` — Perspective Discovery
- `skills/paw-sot/SKILL.md:103-113` — Perspective Auto-Selection
- `skills/paw-sot/SKILL.md:121-122` — Perspective overlay in prompt composition (layer 4)
- `skills/paw-sot/SKILL.md:139-142` — Perspective file naming conventions
- `skills/paw-sot/SKILL.md:214-219` — Perspective-aware synthesis
- `skills/paw-transition/SKILL.md:69-70` — Stage boundaries referencing planning-docs-review
- `skills/paw-transition/SKILL.md:82` — Planning Docs Review milestone
- `skills/paw-transition/SKILL.md:122-123` — Preflight checks for planning-docs-review
- `docs/guide/workflow-modes.md:191-199` — Planning Docs Review Configuration table
- `docs/guide/society-of-thought-review.md:1-359` — Full SoT guide (needs planning review section)
- `docs/specification/implementation.md:243-256` — Planning docs review activity skill description
- `docs/reference/artifacts.md:70-75` — WorkflowContext field table
- `docs/reference/agents.md:53` — Planning docs review entry in skills table

## Architecture Documentation

**Review Context Construction Pattern**: Both `paw-final-review` and `paw-planning-docs-review` construct review contexts by mapping WorkflowContext field names to `paw-sot` input contract fields. The mapping is a table in the skill's Step 4. For planning review, the pattern is identical except `type` is `artifacts` instead of `diff`, and `coordinates` are artifact paths instead of a diff range.

**Smart Mode Heuristic Duplication**: The spec explicitly accepts structural duplication between final review and planning review heuristics. The planning review heuristic has a unique "Affected Artifact" dimension not present in final review, because findings route to different skills (paw-spec vs paw-planning). The SoT heuristic for planning review combines both dimensions: confidence/grounding (from SoT synthesis) + affected artifact (from planning context).

**Three-Branch Step 4 Pattern**: After this change, both `paw-final-review` and `paw-planning-docs-review` will have three execution branches in Step 4: single-model → multi-model → society-of-thought, each behind template conditionals (`{{#cli}}`/`{{#vscode}}`).

**Moderator Mode as Separate Invocation**: The `paw-sot` moderator mode is always a **second** invocation, not part of the first orchestration+synthesis call. The calling skill handles resolution first, then invokes moderator mode if conditions are met.

## Open Questions

None — all research questions resolved with file:line evidence.
