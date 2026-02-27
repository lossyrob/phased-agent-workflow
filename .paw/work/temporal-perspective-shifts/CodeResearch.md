---
date: 2026-02-27T12:00:00-05:00
git_commit: b4df9d1cc6a15f5113b99e51c207f92b3a0418c0
branch: feature/temporal-perspective-shifts
repository: lossyrob/phased-agent-workflow
topic: "SoT Engine Architecture for Perspective Shifts"
tags: [research, codebase, paw-sot, specialists, perspectives]
status: complete
last_updated: 2026-02-27
---

# Research: SoT Engine Architecture for Perspective Shifts

## Research Question

What is the current SoT engine architecture — specialist discovery, prompt composition, execution modes, synthesis, and caller integration — and where would perspective-related logic be added? What is the specialist file schema, shared output format, WorkflowContext configuration structure, and documentation infrastructure that would need updating?

## Summary

The SoT engine (`skills/paw-sot/SKILL.md`) is a scenario-agnostic orchestration engine loaded into the calling agent's session. It has a well-defined review context input contract (8 fields), 4-level specialist discovery with most-specific-wins, 4-layer prompt composition, parallel and debate execution modes, and a confidence-weighted synthesis step. Two callers invoke it: `paw-final-review` (implementation workflow, config from WorkflowContext.md) and `paw-review-workflow` (review workflow, config from ReviewContext.md). Specialist files follow a consistent markdown structure with optional YAML frontmatter. Findings use a Toulmin output format defined in `_shared-rules.md`. The documentation site uses MkDocs Material with a dedicated Society-of-Thought user guide page. WorkflowContext.md stores SoT configuration across 5 fields (Final Review Specialists, Final Review Interaction Mode, Final Review Interactive, Final Review Specialist Models, Final Review Mode), and ReviewContext.md has a parallel set of 5 fields.

## Documentation System

- **Framework**: MkDocs with Material theme (`mkdocs.yml:18-19`)
- **Docs Directory**: `docs/` with `guide/`, `reference/`, `specification/` subdirectories
- **Navigation Config**: `mkdocs.yml:61-78` — declarative `nav` section
- **Style Conventions**: Admonition blocks (`!!! note`, `!!! tip`, `!!! warning`), fenced code blocks, tables for configuration, permalink TOC
- **Build Command**: `mkdocs build --strict` (validates internal links); `mkdocs serve` for local preview
- **Standard Files**: `README.md` (root), `DEVELOPING.md` (root), `LICENSE` (root), `docs/index.md` (home)

## Verification Commands

- **Test Command**: `npm test` (`package.json` → `node ./out/test/runTest.js`)
- **Lint Command**: `npm run lint` (`package.json` → `eslint src --ext ts`)
- **Build Command**: Not found in package.json scripts (no `build` script)
- **Type Check**: Not found in package.json scripts (no `typecheck` script)
- **Agent Lint**: `./scripts/lint-prompting.sh <file>` and `npm run lint:agent:all`

## Detailed Findings

### 1. SoT Engine Skill Architecture

**File**: `skills/paw-sot/SKILL.md`

The SoT engine is a utility skill loaded into the calling agent's session (not spawned as a subagent) — this preserves user interactivity for trade-off decisions and moderator mode (`SKILL.md:8`).

#### 1.1 Review Context Input Contract

Defined at `SKILL.md:23-35`. The contract has 8 fields:

| Field | Required | Current Values |
|-------|----------|----------------|
| `type` | yes | `diff`, `artifacts`, `freeform` |
| `coordinates` | yes | diff range, artifact paths, or content description |
| `output_dir` | yes | directory path |
| `specialists` | no | `all` (default), comma-separated names, `adaptive:<N>` |
| `interaction_mode` | yes | `parallel`, `debate` |
| `interactive` | yes | `true`, `false`, `smart` |
| `specialist_models` | no | `none`, model pool, pinned pairs, mixed |
| `framing` | no | free text (for `freeform` type only) |

**Perspective integration point**: New fields `perspectives` and `perspective_cap` would be added to this contract table. This is the primary input surface for callers.

#### 1.2 Context-Adaptive Preambles

Defined at `SKILL.md:38-47`. Three type-dependent preambles frame how the specialist interprets its cognitive strategy:

- **Type `diff`** (`SKILL.md:40-41`): Frames review as implementation change analysis with specific file/line citation requirements
- **Type `artifacts`** (`SKILL.md:43-44`): Frames review as design/planning document analysis
- **Type `freeform`** (`SKILL.md:46-47`): Uses caller-provided `framing` field or neutral default

These preambles become the second layer of prompt composition. Perspective overlays would sit between the preamble layer and the specialist content layer (or as an additional layer).

#### 1.3 Specialist Discovery (4-Level Precedence)

Defined at `SKILL.md:49-64`. The precedence order is:

1. **Workflow** (`SKILL.md:53`): Parse `specialists` from review context — if explicit list, resolve only those names
2. **Project** (`SKILL.md:54`): Scan `.paw/personas/<name>.md` files in the repository
3. **User** (`SKILL.md:55`): Scan `~/.paw/personas/<name>.md` files
4. **Built-in** (`SKILL.md:56`): Scan `references/specialists/<name>.md` files (excluding `_shared-rules.md`)

Resolution rules (`SKILL.md:58-64`):
- `all`: include all discovered specialists from all levels
- Fixed list: resolve each name, most-specific-wins
- `adaptive:<N>`: discover all, then select N most relevant
- Same filename at a more specific level overrides less specific
- Skip malformed/empty with warning; zero found → fall back to built-in defaults

**Perspective integration point**: Perspective discovery (FR-003) would use a parallel 4-level mechanism: workflow, project (`.paw/perspectives/`), user (`~/.paw/perspectives/`), built-in (`references/perspectives/`). The spec mirrors this structure.

#### 1.4 Adaptive Selection

Defined at `SKILL.md:66-83`. When `specialists` is `adaptive:<N>`:
1. Analyze review target for dominant change categories (`SKILL.md:70`)
2. Assess each specialist's relevance against change categories (`SKILL.md:71`)
3. Select up to N with highest relevance (`SKILL.md:72`)
4. Document rationale in REVIEW-SYNTHESIS.md (`SKILL.md:73`)

Edge cases: N ≥ available → include all; trivial review → report to caller; 0 relevant → interactive asks user, non-interactive reports to caller (`SKILL.md:76-81`).

**Perspective integration point**: Auto-perspective selection (FR-006) would use similar signal analysis (artifact type, file types, subsystems, complexity) to choose perspectives per specialist.

#### 1.5 Prompt Composition (4 Layers)

Defined at `SKILL.md:87-96`. Each specialist subagent prompt is composed from:

1. **Shared rules** (`SKILL.md:89`): Load `references/specialists/_shared-rules.md` once per review run
2. **Context preamble** (`SKILL.md:90`): Type-dependent preamble (diff/artifacts/freeform)
3. **Specialist content** (`SKILL.md:91`): The discovered specialist `.md` file (identity, cognitive strategy, behavioral rules, examples)
4. **Review coordinates** (`SKILL.md:92`): Target location, output directory, self-gather instructions

Skip shared rules if specialist frontmatter has `shared_rules_included: true` (`SKILL.md:94`).
Replace `[specialist-name]` in shared rules with actual name (`SKILL.md:96`).

**Perspective integration point**: Perspective overlay would become a 5th layer (or inserted between layers 2 and 3). The spec describes a three-layer architecture for the composed prompt: Identity (specialist) → Lens (perspective) → Task (review coordinates). This maps to: shared rules + specialist content = Identity, perspective overlay = Lens, context preamble + review coordinates = Task.

#### 1.6 Parallel Mode Execution

Defined at `SKILL.md:104-121`. Spawns parallel subagents via `task` tool with `agent_type: "general-purpose"`:
- Each specialist gets composed prompt (4 layers) (`SKILL.md:105-106`)
- Model resolved via precedence chain: specialist frontmatter → pinned assignment → model pool → session default (`SKILL.md:110-116`)
- Subagent writes findings to `REVIEW-{SPECIALIST-NAME}.md` in output directory (`SKILL.md:107`)
- Orchestrator receives only completion status, not full findings (`SKILL.md:108`)
- Model→specialist assignment logged at review start (`SKILL.md:119`)

**Perspective integration point**: With perspectives, each specialist may run multiple times (once per perspective + optional baseline). Each run would produce findings tagged with perspective attribution. The output file format (`REVIEW-{SPECIALIST-NAME}.md`) may need adaptation — either one file per specialist with perspective-tagged sections, or separate files per specialist×perspective pair.

#### 1.7 Debate Mode Execution

Defined at `SKILL.md:123-155`. Multi-round threaded debate:
- Round 1 (`SKILL.md:129`): All specialists in parallel (same as parallel mode). Each finding becomes an `open` thread.
- Rounds 2-3 (`SKILL.md:131-141`): Synthesis agent generates round summary. Specialists re-run with shared rules + context preamble + specialist content + review coordinates + round summary. Can refine positions, respond to counterarguments, add new threads.
- Hub-and-spoke mediation: specialists see only synthesis summary, never raw findings from other specialists (`SKILL.md:135`).
- Adaptive termination: no new threads and no position changes → early end. Hard cap: 3 global rounds (`SKILL.md:142`).
- Per-thread continuation for contested threads: max 2 additional exchanges per thread, 30 subagent call aggregate budget (`SKILL.md:144-148`).
- Thread states: `open` → `agreed` | `contested` | `trade-off` | `resolved` (`SKILL.md:151`).
- Trade-off detection: flag for user decision (interactive) or conservative default (auto) (`SKILL.md:149`).

**Perspective integration point**: In debate mode, perspective-variant findings from the same specialist participate in debate rounds (FR-010). Conflicts are resolved through cross-examination rather than surfaced as unresolved.

#### 1.8 Synthesis

Defined at `SKILL.md:157-218`. Synthesis subagent spawned as `agent_type: "general-purpose"`:
- Reads all `REVIEW-{SPECIALIST}.md` files via `view` tool (`SKILL.md:159`)
- Operates as PR triage lead: may only merge, deduplicate, classify conflicts, flag trade-offs (`SKILL.md:161-162`)
- Must NOT generate new findings (`SKILL.md:162`)
- Must link every output claim to a specific specialist finding (`SKILL.md:163`)
- Must randomize specialist input ordering to prevent position bias (`SKILL.md:164`)

Synthesis requirements (`SKILL.md:166-174`):
- Cluster by code location before merging
- Classify disagreements (factual dispute vs. trade-off)
- Validate grounding (Direct/Inferential/Contextual)
- Confidence-weighted aggregation
- Merge agreements, preserve dissent

REVIEW-SYNTHESIS.md structure (`SKILL.md:180-218`): Review Summary, Must-Fix Findings, Should-Fix Findings, Consider, Trade-offs Requiring Decision, Observations, Dissent Log, Debate Trace, Synthesis Trace.

**Perspective integration point**: FR-013 requires a "Perspective Diversity" section in REVIEW-SYNTHESIS.md documenting which perspectives were applied, selection rationale, and any skipped perspectives. FR-008 requires each finding in the synthesis to include a `perspective` attribution field. FR-009 requires inter-perspective conflicts to be surfaced with both positions and temporal/contextual framing.

#### 1.9 Moderator Mode

Defined at `SKILL.md:232-249`. Separate invocation from orchestration+synthesis. Supports three interaction patterns: summon specialist, challenge finding, request deeper analysis. Exit on "done"/"continue"/"proceed". Skip if `interactive: false`, no findings, or `smart` with no significant findings.

#### 1.10 Output Artifacts

Defined at `SKILL.md:222-229`:
- `REVIEW-{SPECIALIST-NAME}.md` per specialist (all modes)
- `REVIEW-SYNTHESIS.md` (all modes)
- `.gitignore` with `*` in output directory

### 2. Specialist File Format (Schema)

**Directory**: `skills/paw-sot/references/specialists/`

Nine built-in specialist files plus `_shared-rules.md`:
- `architecture.md`, `assumptions.md`, `correctness.md`, `edge-cases.md`, `maintainability.md`, `performance.md`, `release-manager.md`, `security.md`, `testing.md`

#### 2.1 YAML Frontmatter

None of the built-in specialist files contain YAML frontmatter. The frontmatter is optional and supports:
- `shared_rules_included: true|false` — if `true`, skip shared rules injection (`SKILL.md:94`)
- `model: <model-name>` — per-specialist model override, highest precedence (`SKILL.md:111`)

The user guide documents the scaffold with frontmatter (`docs/guide/society-of-thought-review.md:143-146`):
```yaml
---
shared_rules_included: false
---
```

#### 2.2 Section Structure (Consistent Across All Specialists)

Every specialist file follows this structure:

1. **`# {Name} Specialist`** — H1 heading with specialist identity
2. **`## Identity & Narrative Backstory`** — Second-person narrative ("You are...") with 3+ formative incidents, each teaching a lesson. Establishes expertise through concrete scenarios.
3. **`## Cognitive Strategy`** — Named strategy (e.g., "Threat modeling via attack-tree decomposition") with structured analytical process steps. Unique per specialist — different WAY of analyzing, not just different topic.
4. **`## Domain Boundary`** — Explicit in/out scope. States what IS the specialist's territory and what to leave to other specialists.
5. **`## Behavioral Rules`** — 5-6 actionable bullet-point rules guiding review behavior. Includes what to look for and what to refuse.
6. **`## Shared Rules`** — Reference to `_shared-rules.md` for Anti-Sycophancy Rules and Confidence Scoring.
7. **`## Demand Rationale`** — What context the specialist needs before evaluating; what to flag if missing.
8. **`## Shared Output Format`** — Reference to `_shared-rules.md` for Toulmin structure. Uses `**Category**: <specialist-name>`.
9. **`## Example Review Comments`** — 2-3 example findings in full Toulmin format demonstrating the cognitive strategy.

**Perspective integration point**: Perspective files need a compatible but distinct schema. Per the spec, perspective files define: name, lens type, parameters, prompt overlay template (with `{specialist}` placeholder), and novelty constraint directive (FR-004). This is a fundamentally different document type — it's a composable overlay, not a persona. It should NOT follow the specialist structure (no backstory, no cognitive strategy, no examples).

### 3. Shared Rules and Toulmin Output Format

**File**: `skills/paw-sot/references/specialists/_shared-rules.md`

#### 3.1 Anti-Sycophancy Rules (`_shared-rules.md:1-12`)

- Must identify at least one substantive concern OR explain analysis and why no issues found
- Prioritize real issues over harmony
- State uncertainty explicitly rather than omitting

#### 3.2 Confidence Scoring (`_shared-rules.md:14-20`)

Three levels:
- **HIGH**: Direct evidence from diff, specific code citations
- **MEDIUM**: Inference-based, plausible but needs verification
- **LOW**: Hunch or pattern-match, worth flagging but could be wrong

#### 3.3 Toulmin Output Format (`_shared-rules.md:22-43`)

Each finding structure:

```
### Finding: [one-sentence claim]

**Severity**: must-fix | should-fix | consider
**Confidence**: HIGH | MEDIUM | LOW
**Category**: [specialist-name]

#### Grounds (Evidence)
[Diff-anchored evidence: file, line numbers, quoted code]

#### Warrant (Rule)
[Rule connecting evidence to conclusion]

#### Rebuttal Conditions
[What would falsify this finding]

#### Suggested Verification
[How to verify: static check, test, runtime assertion]
```

**Perspective integration point**: FR-008 requires a `perspective` attribution field in each finding. This would be added to the finding header alongside Severity, Confidence, and Category:
```
**Perspective**: premortem | retrospective | red-team | baseline | <custom-name>
```
The rest of the Toulmin structure (Grounds, Warrant, Rebuttal, Verification) remains unchanged.

### 4. Callers of the SoT Engine

Two skills invoke the SoT engine:

#### 4.1 paw-final-review (Implementation Workflow)

**File**: `skills/paw-final-review/SKILL.md`

**Config source**: WorkflowContext.md (`SKILL.md:26-37`)

Reads SoT-specific fields:
- `Final Review Specialists` (`SKILL.md:35`)
- `Final Review Interaction Mode` (`SKILL.md:36`)
- `Final Review Specialist Models` (`SKILL.md:37`)

**Review context construction** (`SKILL.md:138-149`):

| Review Context Field | Source |
|---------------------|--------|
| `type` | `diff` |
| `coordinates` | Diff + artifact paths |
| `output_dir` | `.paw/work/<work-id>/reviews/` |
| `specialists` | `Final Review Specialists` from WorkflowContext.md |
| `interaction_mode` | `Final Review Interaction Mode` from WorkflowContext.md |
| `interactive` | `Final Review Interactive` from WorkflowContext.md |
| `specialist_models` | `Final Review Specialist Models` from WorkflowContext.md |

**Post-synthesis**: Processes findings through interactive resolution (apply/skip/discuss) at `SKILL.md:164-273`. Moderator mode at `SKILL.md:265-274`.

**Perspective integration point**: Two new rows would be added to the review context construction table:
- `perspectives` → `Final Review Perspectives` from WorkflowContext.md
- `perspective_cap` → `Final Review Perspective Cap` from WorkflowContext.md

#### 4.2 paw-review-workflow (Review Workflow)

**File**: `skills/paw-review-workflow/SKILL.md`

**Config source**: ReviewContext.md (`SKILL.md:177-191`)

Reads SoT-specific fields from ReviewContext.md: Review Specialists, Review Interaction Mode, Review Interactive, Review Specialist Models.

**Review context construction** (`SKILL.md:181-189`):

| Review Context Field | Source |
|---------------------|--------|
| `type` | `diff` |
| `coordinates` | Diff + artifact paths |
| `output_dir` | `.paw/reviews/<identifier>/` |
| `specialists` | `Review Specialists` from ReviewContext.md |
| `interaction_mode` | `Review Interaction Mode` from ReviewContext.md |
| `interactive` | `Review Interactive` from ReviewContext.md |
| `specialist_models` | `Review Specialist Models` from ReviewContext.md |

**Post-synthesis**: Proceeds to Output stage (feedback → critic → GitHub posting pipeline) at `SKILL.md:191`.

**Perspective integration point**: Two new rows added to review context construction, sourced from ReviewContext.md:
- `perspectives` → `Review Perspectives` from ReviewContext.md
- `perspective_cap` → `Review Perspective Cap` from ReviewContext.md

#### 4.3 paw-review-feedback (Downstream Consumer)

**File**: `skills/paw-review-feedback/SKILL.md`

Reads `REVIEW-SYNTHESIS.md` as evaluation source when mode is `society-of-thought` (`SKILL.md:20`). Maps SoT findings to comment pipeline (`SKILL.md:26-28`):
- Must-fix/Should-fix/Consider findings flow directly
- Trade-offs → Should-tier with `[Trade-off]` prefix (when interactive)
- Trade-offs auto-resolved by paw-sot appear as regular findings (when non-interactive)

**Perspective integration point**: Finding attribution in REVIEW-SYNTHESIS.md would include perspective names. The feedback skill would pass perspective attribution through to review comments. No structural change needed to the feedback skill if perspective attribution is embedded in finding text.

#### 4.4 Workflow Skill Reference

**File**: `skills/paw-workflow/SKILL.md:67,73`

References `paw-sot` in the activity table: `paw-final-review` delegates SoT orchestration to `paw-sot`. Listed as a utility skill alongside `paw-git-operations`, `paw-review-response`, `paw-docs-guidance`.

No agents reference `paw-sot` directly — it is always accessed through skills.

### 5. WorkflowContext.md Configuration Fields

#### 5.1 Init Skill Configuration (paw-init)

**File**: `skills/paw-init/SKILL.md`

SoT-related input parameters (`SKILL.md:42-47`):

| Parameter | Default | Values |
|-----------|---------|--------|
| `final_review_mode` | `multi-model` | `single-model`, `multi-model`, `society-of-thought` |
| `final_review_interactive` | `smart` | `true`, `false`, `smart` |
| `final_review_models` | `latest GPT, latest Gemini, latest Claude Opus` | comma-separated model names or intents |
| `final_review_specialists` | `all` | `all`, comma-separated names, `adaptive:<N>` |
| `final_review_interaction_mode` | `parallel` | `parallel`, `debate` |
| `final_review_specialist_models` | `none` | `none`, model pool, pinned pairs, mixed |

Validation (`SKILL.md:82-83`): If `final_review_mode` is `society-of-thought`, `final_agent_review` MUST be `enabled`.

SoT-specific validation (`SKILL.md:95-106`):
- Validate specialist values format
- Validate interaction mode
- Validate specialist_models format (none, pool, pinning, mixed)
- Resolve model intents
- `final_review_models` is ignored when SoT mode

#### 5.2 WorkflowContext.md Template

**File**: `skills/paw-init/SKILL.md:117-148`

Current SoT-related fields in the template:
```
Final Agent Review: <final_agent_review>
Final Review Mode: <final_review_mode>
Final Review Interactive: <final_review_interactive>
Final Review Models: <final_review_models>
Final Review Specialists: <final_review_specialists>
Final Review Interaction Mode: <final_review_interaction_mode>
Final Review Specialist Models: <final_review_specialist_models>
```

**Perspective integration point**: Two new fields would be added after `Final Review Specialist Models`:
```
Final Review Perspectives: <final_review_perspectives>
Final Review Perspective Cap: <final_review_perspective_cap>
```

The init skill's input parameters table (`SKILL.md:25-53`) would gain two new rows:
- `final_review_perspectives` (default: `auto`, values: `none`, `auto`, comma-separated names)
- `final_review_perspective_cap` (default: `2`, values: positive integer)

The SoT-specific validation section (`SKILL.md:95-106`) would gain perspective validation.

#### 5.3 ReviewContext.md Template (Review Workflow)

**File**: `skills/paw-review-understanding/SKILL.md:256-264`

Current SoT-related fields in the Review Configuration section:
```
## Review Configuration

**Review Mode**: <single-model (default) | society-of-thought>
**Review Specialists**: <all (default) | comma-separated names | adaptive:<N>>
**Review Interaction Mode**: <parallel (default) | debate>
**Review Interactive**: <false (default) | true | smart>
**Review Specialist Models**: <none (default) | model pool | pinned:model pairs | mixed>
```

**Perspective integration point**: Two new fields added to the Review Configuration section:
```
**Review Perspectives**: <none (default) | auto | comma-separated names>
**Review Perspective Cap**: <2 (default) | positive integer>
```

The validation criteria at `SKILL.md:187` lists "Review Configuration fields present with valid values" — perspective fields would be added to this list.

#### 5.4 Current WorkflowContext.md Instance

**File**: `.paw/work/temporal-perspective-shifts/WorkflowContext.md`

Current SoT fields:
```
Final Review Mode: society-of-thought
Final Review Interactive: smart
Final Review Specialists: adaptive:3
Final Review Interaction Mode: debate
Final Review Specialist Models: none
```

No perspective fields exist yet.

### 6. Documentation Infrastructure

#### 6.1 SoT User Guide

**File**: `docs/guide/society-of-thought-review.md`

Comprehensive user-facing documentation covering:
- Two integration points table (implementation workflow + review workflow) (lines 8-12)
- Why Perspective Diversity Matters section (lines 18-22)
- Configuration tables for both workflows (lines 26-48)
- Built-in Specialists table (9 specialists) (lines 57-69)
- Interaction Modes (parallel + debate) (lines 73-97)
- Specialist Selection Modes (all, fixed list, adaptive) (lines 99-121)
- Custom Specialists guide with scaffold (lines 123-213)
- Synthesis Agent description (lines 215-224)
- Interactive Moderator Mode (lines 227-235)
- Model Assignment with precedence (lines 237-283)

**Perspective integration point**: This is the primary user-facing doc that would need updating. New sections needed:
- Perspective Overlays section (explain concept, built-in presets, auto selection)
- Configuration fields for perspectives in both workflow tables
- Custom Perspectives guide (schema, placement, precedence)
- Update "Why Perspective Diversity Matters" to reference the new feature

#### 6.2 Other Docs Referencing SoT

**File**: `docs/reference/agents.md` — references society-of-thought
**File**: `docs/reference/artifacts.md` — references REVIEW-SYNTHESIS.md and specialist review files
**File**: `docs/specification/review.md` — review workflow specification, references SoT evaluation path
**File**: `docs/specification/implementation.md` — implementation workflow specification, references SoT final review
**File**: `docs/guide/workflow-modes.md` — mentions society-of-thought as a review mode option

All five docs contain references to society-of-thought that may need updating to mention perspectives.

#### 6.3 MkDocs Navigation

**File**: `mkdocs.yml:70`

The Society-of-Thought Review page is at `guide/society-of-thought-review.md` in the nav. No new page is needed — perspective documentation belongs in the existing SoT guide page.

## Code References

- `skills/paw-sot/SKILL.md:23-35` — Review context input contract (where `perspectives` and `perspective_cap` fields go)
- `skills/paw-sot/SKILL.md:49-64` — Specialist discovery 4-level precedence (model for perspective discovery)
- `skills/paw-sot/SKILL.md:87-96` — Prompt composition 4 layers (where perspective overlay layer inserts)
- `skills/paw-sot/SKILL.md:104-121` — Parallel mode execution (per-specialist subagent spawning)
- `skills/paw-sot/SKILL.md:123-155` — Debate mode execution (round-based threading)
- `skills/paw-sot/SKILL.md:157-218` — Synthesis and REVIEW-SYNTHESIS.md structure
- `skills/paw-sot/references/specialists/_shared-rules.md:22-43` — Toulmin output format (where `Perspective` field goes)
- `skills/paw-sot/references/specialists/security.md:1-129` — Representative specialist file (no frontmatter, full section structure)
- `skills/paw-sot/references/specialists/architecture.md:1-137` — Representative specialist file (no frontmatter, full section structure)
- `skills/paw-sot/references/specialists/performance.md:1-137` — Representative specialist file (no frontmatter, full section structure)
- `skills/paw-init/SKILL.md:42-47` — SoT input parameters (where perspective params go)
- `skills/paw-init/SKILL.md:95-106` — SoT validation section (where perspective validation goes)
- `skills/paw-init/SKILL.md:117-148` — WorkflowContext.md template (where perspective fields go)
- `skills/paw-final-review/SKILL.md:138-149` — Review context construction table (where perspective rows go)
- `skills/paw-final-review/SKILL.md:265-274` — Moderator mode invocation
- `skills/paw-review-workflow/SKILL.md:177-191` — SoT evaluation path and review context construction
- `skills/paw-review-understanding/SKILL.md:256-264` — ReviewContext.md Review Configuration section
- `skills/paw-review-feedback/SKILL.md:20,26-28` — SoT mode input mapping for comment pipeline
- `docs/guide/society-of-thought-review.md:1-289` — Primary user-facing SoT documentation
- `mkdocs.yml:70` — Navigation entry for SoT guide page

## Architecture Documentation

### Prompt Composition Architecture

The current 4-layer prompt composition (`SKILL.md:87-96`) stacks: shared rules → context preamble → specialist content → review coordinates. The spec proposes a three-layer conceptual model (Identity → Lens → Task), which maps onto the existing layers as:

- **Identity** = shared rules + specialist content (layers 1 & 3)
- **Lens** = perspective overlay (NEW — inserted between specialist content and review coordinates)
- **Task** = context preamble + review coordinates (layers 2 & 4)

The practical insertion point is between layers 3 and 4 in the current system, making the new composition: shared rules → context preamble → specialist content → **perspective overlay** → review coordinates.

### Discovery Architecture Pattern

Specialist discovery and perspective discovery share the same 4-level precedence pattern. Both use filesystem scanning at defined paths with most-specific-wins resolution:

| Level | Specialists | Perspectives (proposed) |
|-------|------------|------------------------|
| Workflow | From review context | From review context |
| Project | `.paw/personas/<name>.md` | `.paw/perspectives/<name>.md` |
| User | `~/.paw/personas/<name>.md` | `~/.paw/perspectives/<name>.md` |
| Built-in | `references/specialists/<name>.md` | `references/perspectives/<name>.md` |

### Configuration Flow

Configuration flows from init → WorkflowContext.md → caller skill → review context → SoT engine:

```
paw-init (user input) → WorkflowContext.md fields
                              ↓
paw-final-review (reads fields) → constructs review context
                              ↓
paw-sot (receives review context) → discovers specialists + perspectives → composes prompts → executes
```

For the review workflow, the parallel flow is:
```
User invocation params → paw-review-understanding → ReviewContext.md fields
                              ↓
paw-review-workflow (reads fields) → constructs review context
                              ↓
paw-sot (receives review context) → discovers specialists + perspectives → composes prompts → executes
```

## Open Questions

None — all research objectives addressed with file:line evidence.
