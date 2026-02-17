---
date: 2026-02-17T12:00:00-05:00
git_commit: d1196618a0a4c355fa5a07179290280d0171b8a6
branch: feature/extract-sot-engine
repository: lossyrob/phased-agent-workflow
topic: "Extract SoT engine from paw-final-review into paw-sot"
tags: [research, codebase, paw-final-review, paw-sot, society-of-thought, specialist-personas]
status: complete
last_updated: 2026-02-17
---

# Research: Extract SoT Engine from paw-final-review into paw-sot

## Research Question

What are the exact boundaries, structures, and references involved in extracting the Society of Thought (SoT) orchestration engine from `paw-final-review` into a standalone `paw-sot` skill?

## Summary

The SoT engine is entirely contained in `skills/paw-final-review/SKILL.md:136-307` (within the `{{#cli}}` conditional block). This 172-line section covers specialist discovery, adaptive selection, prompt composition, parallel/debate execution, model assignment, synthesis, and the REVIEW-SYNTHESIS.md structure. The specialist persona files (9 specialists + shared rules, 1,284 lines total) reside at `skills/paw-final-review/references/specialists/`. Post-extraction, paw-final-review retains ~270 lines covering single-model mode, multi-model mode, review prompt, resolution (apply/skip/discuss), and smart interactive classification. Moderator mode (lines 420-437) moves to paw-sot as a separate invocation entry point. References to paw-final-review exist in 12+ files across agents, skills, docs, specification, source code, and tests.

## Documentation System

- **Framework**: MkDocs (Material theme)
- **Docs Directory**: `docs/`
- **Navigation Config**: `mkdocs.yml:1-82`
- **Style Conventions**: Structured guides with YAML code blocks, tables, admonitions; separate reference/guide/specification sections
- **Build Command**: `source .venv/bin/activate && mkdocs build --strict`
- **Standard Files**: `README.md` (root), `DEVELOPING.md` (root), `LICENSE` (root), `docs/guide/`, `docs/reference/`, `docs/specification/`

## Verification Commands

- **Test Command**: `npm run test` (VS Code extension tests)
- **Lint Command**: `npm run lint` (ESLint for src/)
- **Build Command**: `npm run compile` (TypeScript compilation)
- **Prompt Lint**: `./scripts/lint-prompting.sh skills/<name>/SKILL.md`
- **All Agents/Skills Lint**: `npm run lint:agent:all`
- **Integration Tests**: `cd tests/integration && npx tsx --test tests/workflows/<test>.test.ts`
- **Docs Build**: `source .venv/bin/activate && mkdocs build --strict`

## Detailed Findings

### 1. paw-final-review SKILL.md — SoT Sections (Lines to Extract)

The skill is 461 lines total (`skills/paw-final-review/SKILL.md`). SoT-specific content lives within the `{{#cli}}` block starting at line 85.

**Sections that constitute the SoT engine (to extract to paw-sot):**

| Section | Lines | Description |
|---------|-------|-------------|
| Specialist Discovery | `SKILL.md:139-153` | 4-level precedence chain (workflow → project → user → built-in), resolution rules, edge cases |
| Adaptive Selection | `SKILL.md:155-173` | `adaptive:<N>` mode, selection process, edge cases, fallback logic |
| Prompt Composition | `SKILL.md:175-184` | Three-layer composition: shared rules + specialist content + review coordinates |
| Parallel Mode Execution | `SKILL.md:190-208` | Subagent spawning, model assignment precedence chain, logging |
| Debate Mode Execution | `SKILL.md:210-243` | Thread-based multi-round debate, round summaries, adaptive termination, per-thread continuation, trade-off detection |
| Synthesis | `SKILL.md:245-306` | Synthesis subagent, PR triage lead constraints, clustering, disagreement classification, grounding validation, confidence-weighted aggregation, REVIEW-SYNTHESIS.md structure |

**Total SoT engine content**: ~168 lines (lines 139-306 within `{{#cli}}`)

**Lines that reference SoT but stay in paw-final-review:**

| Section | Lines | Description |
|---------|-------|-------------|
| Mode configuration | `SKILL.md:31-38` | Reading `Final Review Mode`, `Final Review Specialists`, etc. from WorkflowContext.md |
| "If society-of-thought mode" entry | `SKILL.md:136-138` | Conditional branching to SoT flow |
| Smart interactive SoT classification | `SKILL.md:373-384` | Classification heuristic table for SoT findings (confidence × grounding × severity) |
| SoT resolution in Step 5 | `SKILL.md:351-354` | Processing REVIEW-SYNTHESIS.md findings by severity, trade-off presentation |
| Moderator Mode | `SKILL.md:420-437` | Post-synthesis interactive specialist engagement (summon, challenge, deeper analysis) |

### 2. paw-final-review SKILL.md — Non-SoT Sections (What Stays)

These sections remain in paw-final-review after extraction:

| Section | Lines | Description |
|---------|-------|-------------|
| Frontmatter + header | `SKILL.md:1-9` | Skill metadata, execution context |
| Capabilities | `SKILL.md:11-19` | Capability list (update to mention paw-sot delegation) |
| Step 1: Read Configuration | `SKILL.md:22-38` | WorkflowContext.md reading (stays, maps to review context) |
| Step 2: Gather Review Context | `SKILL.md:40-47` | Diff and artifact gathering |
| Step 3: Create Reviews Directory | `SKILL.md:49-52` | Directory creation |
| Review Prompt (shared) | `SKILL.md:54-83` | Shared review prompt for single/multi-model |
| Single-model execution | `SKILL.md:88-90` | Single-model mode |
| Multi-model execution | `SKILL.md:92-135` | Multi-model parallel review with synthesis |
| VS Code fallback | `SKILL.md:309-317` | VS Code single-model fallback |
| Step 5: Resolution | `SKILL.md:319-416` | Interactive/smart/auto resolution (apply/skip/discuss) |
| Moderator Mode | `SKILL.md:419-437` | Post-synthesis specialist engagement |
| Step 6: Completion | `SKILL.md:439-449` | Report back |
| Review Artifacts table | `SKILL.md:451-461` | Artifact listing |

### 3. Specialist Persona Files

**Location**: `skills/paw-final-review/references/specialists/`

**Files** (10 total, 1,284 lines):

| File | Lines | Domain |
|------|-------|--------|
| `_shared-rules.md` | 42 | Anti-sycophancy, confidence scoring, Toulmin output format |
| `architecture.md` | 136 | Pattern consistency, dependency direction, YAGNI |
| `assumptions.md` | 136 | Design-level preconditions, undocumented assumptions |
| `correctness.md` | 132 | Specification-implementation fidelity, logic errors |
| `edge-cases.md` | 157 | Boundary enumeration, concurrent/partial failure |
| `maintainability.md` | 129 | Communicative clarity, readability, test-as-documentation |
| `performance.md` | 136 | Quantitative scalability, cardinality estimation |
| `release-manager.md` | 137 | Deployment-path completeness, CI/CD, migration safety |
| `security.md` | 128 | Threat modeling, trust boundaries, attack trees |
| `testing.md` | 151 | Coverage gap analysis, behavior vs implementation testing |

**Structure pattern** (all specialist files follow this):
1. `# [Name] Specialist` heading
2. `## Identity & Narrative Backstory` — detailed narrative with formative incidents
3. `## Cognitive Strategy` — how the specialist analyzes code
4. `## Domain Boundary` — what is and isn't in scope
5. `## Behavioral Rules` — concrete rules for the specialist
6. `## Shared Rules` — reference to `_shared-rules.md`
7. `## Demand Rationale` — pre-evaluation assessment
8. `## Shared Output Format` — reference to `_shared-rules.md` Toulmin structure
9. `## Example Review Comments` — 2-3 examples with full Toulmin format

**Frontmatter**: None of the specialist files currently have YAML frontmatter. The SKILL.md references `model:` and `shared_rules_included:` as optional frontmatter fields that specialist files *may* contain, but no current built-in specialists use them.

**`_shared-rules.md`** is distinct — it contains:
- Anti-Sycophancy Rules (`_shared-rules.md:7-13`)
- Confidence Scoring (`_shared-rules.md:15-22`)
- Required Output Format (Toulmin structure) (`_shared-rules.md:24-42`)

### 4. References to paw-final-review Across the Codebase

#### Agent Files

- `agents/PAW.agent.md:25` — Transition table: paw-impl-review → paw-final-review
- `agents/PAW.agent.md:27` — Transition table: paw-final-review → paw-transition → paw-pr
- `agents/PAW.agent.md:28` — Phase PR → paw-final-review routing
- `agents/PAW.agent.md:47` — paw-final-review in pre-conditions for paw-pr
- `agents/PAW.agent.md:125` — Routing after impl-review: proceed to paw-final-review
- `agents/PAW.agent.md:170` — Listed as direct execution skill
- `agents/PAW.agent.md:183` — After paw-final-review: delegate to paw-transition

#### Skills

- `skills/paw-transition/SKILL.md:48,50,56,72-73,85,92,95,125,131` — Transition routing for final review
- `skills/paw-workflow/SKILL.md:67,126-127,145` — Activity table, stage description, execution mode
- `skills/paw-init/SKILL.md:37,75,87-99,122-127` — Configuration fields, society-of-thought validation, WorkflowContext template
- `skills/paw-status/SKILL.md:48-54,113,116` — Configuration display, workflow stage descriptions

#### Specification

- `paw-specification.md:26,43` — Workflow mode stage lists
- `paw-specification.md:419,432` — Stage 03.5 skill reference, mode description
- `paw-specification.md:1040-1049` — Configuration field definitions for Final Review

#### Documentation

- `docs/reference/agents.md:37,56,82-83` — Agent table, activity table, stage list
- `docs/reference/artifacts.md:21,60-64,186,188,197` — Artifact structure, WorkflowContext fields, REVIEW-SYNTHESIS.md
- `docs/specification/implementation.md:143,145,162,171-173,238` — Stage 03.5, skill reference, configuration
- `docs/guide/society-of-thought-review.md:3,17-21,24,81,89,200,214-231` — Comprehensive SoT guide (entire file is relevant)
- `docs/guide/workflow-modes.md:15,37,156-160,164` — Stage lists, configuration table
- `docs/guide/stage-transitions.md:16` — Transition table entry
- `mkdocs.yml:70` — Navigation entry for Society-of-Thought Review guide

#### Source Code (TypeScript)

- `src/commands/initializeWorkItem.ts:37-42,127-130` — VS Code configuration for final review mode/interactive
- `src/ui/userInput.ts:482` — "Final Review Interaction" UI title

#### Tests

- `cli/test/build.test.js:69-77` — Build test verifies `paw-final-review/references/specialists/` are included in dist with at least 10 files
- `tests/integration/tests/workflows/smart-interactive-mode.test.ts:46-47` — Seeds WorkflowContext with `Final Review Mode: multi-model`

### 5. WorkflowContext.md Configuration Fields

Configuration fields read by paw-final-review, written by paw-init (`skills/paw-init/SKILL.md:122-127`):

| Field | Values | Used For |
|-------|--------|----------|
| `Final Review Mode` | `single-model`, `multi-model`, `society-of-thought` | Selecting execution path |
| `Final Review Interactive` | `true`, `false`, `smart` | Resolution behavior |
| `Final Review Models` | comma-separated model names | Multi-model mode model list |
| `Final Review Specialists` | `all`, `adaptive:<N>`, comma-separated names | SoT specialist selection |
| `Final Review Interaction Mode` | `parallel`, `debate` | SoT interaction mode |
| `Final Review Specialist Models` | `none`, model pool, pinned pairs, mixed | SoT model assignment |

**How they flow**:
1. `paw-init` (`skills/paw-init/SKILL.md:87-99`) validates SoT config and writes fields to WorkflowContext.md
2. `paw-final-review` (`skills/paw-final-review/SKILL.md:22-38`) reads them in Step 1
3. `paw-status` (`skills/paw-status/SKILL.md:48-54`) displays them for status reporting

After extraction, paw-final-review continues reading these fields and maps them to the review context for paw-sot. No changes needed to paw-init or the WorkflowContext.md schema.

### 6. paw-planning-docs-review Structure (Context for Future Integration)

**Location**: `skills/paw-planning-docs-review/SKILL.md` (278 lines)

**Structure overview**:
- Supports `single-model` and `multi-model` modes (no society-of-thought currently)
- Has its own configuration fields: `Planning Review Mode`, `Planning Review Interactive`, `Planning Review Models` (`SKILL.md:26-30`)
- Uses a different review prompt focused on cross-artifact consistency (`SKILL.md:62-97`)
- Has its own resolution flow with routing to paw-spec or paw-planning (`SKILL.md:155-184`)
- Re-review cycle with limit (`SKILL.md:246-254`)
- Output to `reviews/planning/` subdirectory (`SKILL.md:270-278`)

**Future SoT integration**: The skill's multi-model pattern is structurally similar to what paw-final-review does — it could theoretically delegate to paw-sot with an `artifacts` type review context. This is explicitly out of scope for this issue (Spec.md Assumptions, line 111).

### 7. Documentation Files Needing Updates

| File | Lines | What References SoT/Final Review |
|------|-------|----------------------------------|
| `docs/guide/society-of-thought-review.md` | entire file | Comprehensive SoT guide — will need update to mention paw-sot as underlying engine |
| `docs/guide/workflow-modes.md:156-164` | 9 lines | Configuration table with SoT options |
| `docs/reference/agents.md:56` | 1 line | paw-final-review activity description |
| `docs/reference/artifacts.md:60-64` | 5 lines | WorkflowContext SoT fields |
| `docs/reference/artifacts.md:186-197` | 12 lines | REVIEW-SYNTHESIS.md description mentions society-of-thought and specialists |
| `docs/specification/implementation.md:143-173,238` | ~30 lines | Stage 03.5 description, configuration fields |

### 8. Skills Directory Structure Patterns

All skills in `skills/` follow this pattern:
```
skills/<skill-name>/
  SKILL.md          # Required — skill content
  references/       # Optional — only paw-final-review uses this currently
    specialists/    # Specialist persona files
```

Only `paw-final-review` currently has a `references/` subdirectory. The new `paw-sot` skill would be the second skill with this structure:
```
skills/paw-sot/
  SKILL.md
  references/
    specialists/    # Moved from paw-final-review/references/specialists/
```

**CLI build inclusion**: The CLI build test (`cli/test/build.test.js:69-77`) explicitly verifies that `paw-final-review/references/specialists/` files are included in the dist. This test will need updating to check `paw-sot/references/specialists/` instead.

**Skill loading**: Per project `DEVELOPING.md` and `.github/copilot-instructions.md`, skills in `skills/` are loaded via the `paw_get_skill` tool, which returns only SKILL.md content. The `references/` directory content is accessed via filesystem tools (`view`, `glob`, `grep`) by subagents.

### 9. Model Assignment Precedence Chain

Defined in `skills/paw-final-review/SKILL.md:198-207`:

1. **Specialist frontmatter** — `model:` field in specialist `.md` YAML frontmatter (none currently use this)
2. **WorkflowContext pinning** — `Final Review Specialist Models` contains `specialist:model` pairs
3. **WorkflowContext pool** — Unpinned model names distributed round-robin (alphabetical specialist order)
4. **Session default** — Fallback to session's default model

This entire precedence chain moves to paw-sot. paw-final-review maps the WorkflowContext fields to the review context's `specialist_models` parameter.

## Code References

- `skills/paw-final-review/SKILL.md:1-461` — Full skill file (461 lines)
- `skills/paw-final-review/SKILL.md:136-306` — SoT engine (to extract)
- `skills/paw-final-review/SKILL.md:85-135` — Multi-model mode (stays)
- `skills/paw-final-review/SKILL.md:319-437` — Resolution + moderator mode (stays)
- `skills/paw-final-review/references/specialists/_shared-rules.md:1-42` — Shared rules
- `skills/paw-final-review/references/specialists/architecture.md:1-136` — Architecture specialist
- `skills/paw-final-review/references/specialists/security.md:1-128` — Security specialist
- `skills/paw-final-review/references/specialists/correctness.md:1-132` — Correctness specialist
- `skills/paw-final-review/references/specialists/performance.md:1-136` — Performance specialist
- `skills/paw-final-review/references/specialists/testing.md:1-151` — Testing specialist
- `skills/paw-final-review/references/specialists/edge-cases.md:1-157` — Edge-cases specialist
- `skills/paw-final-review/references/specialists/maintainability.md:1-129` — Maintainability specialist
- `skills/paw-final-review/references/specialists/assumptions.md:1-136` — Assumptions specialist
- `skills/paw-final-review/references/specialists/release-manager.md:1-137` — Release-manager specialist
- `skills/paw-planning-docs-review/SKILL.md:1-278` — Planning docs review (future integration context)
- `skills/paw-init/SKILL.md:87-99` — SoT configuration validation
- `skills/paw-init/SKILL.md:122-127` — WorkflowContext SoT field template
- `skills/paw-transition/SKILL.md:48-131` — Transition routing referencing paw-final-review
- `skills/paw-workflow/SKILL.md:67,126-127,145` — Workflow activity table and stage list
- `skills/paw-status/SKILL.md:48-54` — SoT configuration display
- `agents/PAW.agent.md:25-28,47,125,170,183` — PAW agent references to paw-final-review
- `paw-specification.md:419-432,1040-1049` — Specification references
- `cli/test/build.test.js:69-77` — Build test for specialist file inclusion
- `tests/integration/tests/workflows/smart-interactive-mode.test.ts:46-47` — Integration test with Final Review config
- `src/commands/initializeWorkItem.ts:37-42` — VS Code config setup
- `src/ui/userInput.ts:482` — VS Code UI label
- `docs/guide/society-of-thought-review.md:1-231` — Full SoT user guide
- `docs/guide/workflow-modes.md:156-164` — Configuration table
- `docs/reference/artifacts.md:60-64,186-197` — Artifact documentation
- `docs/specification/implementation.md:143-173,238` — Implementation spec
- `mkdocs.yml:70` — Navigation entry

## Architecture Documentation

### Extraction Boundary

The SoT engine in paw-final-review is cleanly bounded within the `{{#cli}}` Mustache conditional (lines 85-307). The engine's sections are contiguous (lines 136-306) and do not interleave with non-SoT logic, making extraction straightforward.

**Key architectural pattern**: The SoT engine is orchestration logic — it doesn't perform reviews itself, it spawns subagents (via `task` tool) that do the actual reviewing. This spawning pattern (compose prompt → assign model → spawn subagent → collect results) is the core of what paw-sot encapsulates.

### Moderator Mode Boundary Decision

Moderator mode (`SKILL.md:420-437`) is a post-synthesis interactive feature. Per the Spec (FR-009, FR-012), moderator mode moves to paw-sot (FR-009 says "paw-sot enables post-synthesis interactive specialist engagement"), while paw-final-review retains post-synthesis resolution (apply/skip/discuss). This creates a design question: moderator mode needs both the specialist personas (paw-sot's domain) and the interactive resolution context (paw-final-review's domain).

### Smart Interactive Classification for SoT

The smart interactive classification heuristic for SoT mode (`SKILL.md:373-384`) uses SoT-specific concepts (confidence, grounding tier) that differ from the multi-model heuristic. This classification logic stays in paw-final-review since it's part of the resolution flow, but it operates on REVIEW-SYNTHESIS.md output produced by paw-sot.

### Mustache Conditionals

The skill uses `{{#cli}}` and `{{#vscode}}` Mustache conditionals to provide platform-specific behavior. All SoT content is within `{{#cli}}` blocks since SoT is CLI-only. The new paw-sot skill will not need Mustache conditionals since it's inherently CLI-only (specialist personas require filesystem access).

## Open Questions

1. **Moderator mode location** (**Resolved**): Moderator mode moves to paw-sot (FR-009) as a separate invocation entry point. The calling skill (paw-final-review) invokes paw-sot twice: once for orchestration+synthesis, then after resolution for moderator mode. paw-sot owns moderator mode since it requires specialist personas and SoT infrastructure.

2. **Review context preamble**: The Spec introduces context-adaptive preambles (FR-008) for non-code artifact review. This is new functionality — the current paw-final-review has no equivalent. Implementation should define the preamble content for `diff`, `artifacts`, and `freeform` types.
