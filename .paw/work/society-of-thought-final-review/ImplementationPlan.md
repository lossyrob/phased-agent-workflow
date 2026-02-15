# Society-of-Thought Final Review Implementation Plan

## Overview

Add `society-of-thought` as a third Final Review mode in PAW. This extends paw-final-review to support a panel of specialist personas — each with a distinct cognitive strategy, narrative backstory, and anti-sycophancy rules — that independently review implementation changes and produce a synthesized GapAnalysis.md with specialist-attributed, confidence-weighted findings.

The implementation modifies four skill files (paw-final-review, paw-init, paw-status, paw-specification) and adds documentation. No TypeScript source code changes are needed — this is entirely a skill/prompt-level feature.

## Current State Analysis

- paw-final-review supports `single-model` and `multi-model` modes with parallel subagent execution via `task` tool
- paw-init defines Final Review config fields (Mode, Interactive, Models) with model intent resolution
- Multi-model synthesis uses agreement-level classification (consensus/partial/single-model)
- No specialist/persona infrastructure exists at any level
- No `.paw/specialists/` or `~/.paw/specialists/` directories exist

## Desired End State

- `society-of-thought` is a valid value for `Final Review Mode` in WorkflowContext.md
- 5 built-in specialist personas with full narrative backstories, cognitive strategies, behavioral rules, example outputs, and anti-sycophancy structural rules are defined in paw-final-review
- Specialist discovery works at 4 precedence levels (workflow > project > user > built-in)
- Both parallel and debate interaction modes function
- GapAnalysis.md produced with specialist attribution, confidence levels, severity classifications, and grounding validation
- Interactive moderator mode allows users to summon/challenge specialists post-review
- paw-init collects society-of-thought configuration during workflow setup
- paw-status displays society-of-thought configuration
- User-facing documentation explains the feature and custom specialist creation

## What We're NOT Doing

- VS Code support (CLI only for v1; VS Code falls back to multi-model with notification)
- Society-of-thought for paw-impl-review, paw-planning-docs-review, or PAW Review workflow
- Per-specialist output files (single GapAnalysis.md only)
- Automated persona drift detection or re-injection
- Specialist effectiveness metrics or scoring
- TypeScript code changes (this is a skill/prompt-level feature)

## Phase Status

- [ ] **Phase 1: Built-in Specialist Personas** - Define 5 specialist personas with full narratives, cognitive strategies, behavioral rules, and example outputs
- [ ] **Phase 2: Core Society-of-Thought Mode** - Extend paw-final-review with society-of-thought execution, specialist discovery, synthesis, and GapAnalysis.md generation
- [ ] **Phase 3: Configuration & Status** - Extend paw-init with society-of-thought config fields and paw-status with display
- [ ] **Phase 4: Documentation** - User guide, specialist template scaffold, specification updates

## Phase Candidates
<!-- None identified yet -->

---

## Phase 1: Built-in Specialist Personas

### Objective
Define the 5 built-in specialist personas as complete persona specifications that can be embedded in paw-final-review. Each persona needs a narrative backstory (500-2000 words per research recommendation), distinct cognitive strategy, behavioral rules, anti-sycophancy structural rules, cross-cutting "demand rationale" rule, and 2-3 example review comments.

### Changes Required

- **`skills/paw-final-review/specialists/`**: Create a directory containing 5 built-in specialist files:
  - `security-paranoid.md` — Cognitive strategy: threat modeling / attack-tree decomposition. Identity: former incident responder. Traces data flows from untrusted boundaries through trust boundaries to sinks.
  - `scalability-skeptic.md` — Cognitive strategy: quantitative back-of-envelope estimation. Identity: performance engineer. Calculates actual impact at projected scale, pragmatic about current vs future concerns.
  - `devils-advocate.md` — Cognitive strategy: Socratic first-principles questioning. Identity: distinguished engineer. Asks questions that expose assumptions, escalates with new challenges each round, acts as rationale auditor.
  - `edge-case-bloodhound.md` — Cognitive strategy: systematic boundary enumeration. Identity: obsessive about boundaries. Methodically enumerates: null, empty, max, concurrent, interrupted, partially failed, timed out, duplicate, out of order.
  - `empathetic-maintainer.md` — Cognitive strategy: narrative code walkthrough. Identity: thinks about future-you reading this at 2 AM. Addresses the largest category of real review findings (75% maintainability per research).

- Each specialist file includes:
  - Full persona narrative (identity, background, what they've seen, what drives them)
  - Cognitive strategy description (how they analyze, not just what they look for)
  - Behavioral rules (specific analytical moves this persona always makes)
  - Anti-sycophancy structural rules: "You MUST identify at least one substantive concern. You MUST present independent evidence before agreeing. Prioritize finding real issues over maintaining harmony."
  - Cross-cutting rule: "Before evaluating code, assess whether you understand WHY this change was made. If rationale is unclear, flag it."
  - Confidence scoring instruction: "For each finding, state your confidence (HIGH/MEDIUM/LOW) and what evidence supports it."
  - 2-3 example review comments demonstrating the persona's cognitive strategy and communication style
  - Optional `model:` field (unset for built-in defaults)

- **Tests**: Lint specialist files with `./scripts/lint-prompting.sh skills/paw-final-review/specialists/*.md` (if applicable, or verify markdown is well-formed)

### Success Criteria

#### Automated Verification:
- [ ] All 5 specialist files exist in `skills/paw-final-review/specialists/`
- [ ] Each file contains required sections (identity, cognitive strategy, behavioral rules, anti-sycophancy rules, examples)
- [ ] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Each persona reads as a distinct character with a unique voice and analytical approach
- [ ] Example review comments clearly demonstrate different cognitive strategies (not just different topics)
- [ ] Anti-sycophancy rules are structural constraints, not suggestions

---

## Phase 2: Core Society-of-Thought Mode

### Objective
Extend paw-final-review SKILL.md to support `society-of-thought` as a third review mode. This includes specialist discovery at 4 precedence levels, parallel and debate interaction modes, GapAnalysis.md synthesis with confidence weighting and grounding validation, and interactive moderator mode.

### Changes Required

- **`skills/paw-final-review/SKILL.md`**: Major extension — this is the core implementation. Changes include:

  - **Step 1 (Configuration)**: Extend to read new fields: `Final Review Mode: society-of-thought`, `Final Review Specialists` (fixed list or `adaptive:<N>`), `Final Review Interaction Mode` (`parallel` | `debate`), `Final Review Interactive` (reused for moderator mode)
  
  - **New section: Specialist Discovery**: Define 4-level precedence discovery:
    1. Workflow: Parse `Final Review Specialists` from WorkflowContext.md — if fixed list, resolve names against all levels; if adaptive, discover all available
    2. Project: Scan `.paw/specialists/<name>.md` files
    3. User: Scan `~/.paw/specialists/<name>.md` files
    4. Built-in: Load from `skills/paw-final-review/specialists/` directory
    - Most-specific-wins for name conflicts (same filename at workflow > project > user > built-in)
    - Skip malformed/empty specialist files with warning
  
  - **New section: Adaptive Selection**: When `Final Review Specialists` is `adaptive:<N>`:
    - Agent analyzes the diff to determine which specialists are most relevant
    - Selects up to N specialists from the discovered roster
    - Documents selection rationale in GapAnalysis.md header
    - No user confirmation required (auto-selects silently)
  
  - **Step 4 (Execute Review)**: Add society-of-thought execution alongside existing single-model/multi-model:
    
    **Parallel mode** (default):
    - For each selected specialist: compose prompt = specialist persona content + shared review context (diff, spec, plan, CodeResearch patterns)
    - Spawn parallel subagents using `task` tool. If specialist has `model:` field, use that model; otherwise use session default
    - Save per-specialist output to `REVIEW-{SPECIALIST-NAME}.md`
    - After all complete, run neutral synthesis agent
    
    **Debate mode** (opt-in):
    - Round 1: Run all specialists in parallel (same as parallel mode)
    - Synthesis: Generate round summary highlighting agreements, disagreements, and open questions
    - Round 2+: Feed round summary (not raw findings) to each specialist. Specialists can refine, challenge, or add new findings.
    - Adaptive termination: If round N produces no new substantive findings, stop. Hard cap at 3 rounds.
    - Final synthesis produces GapAnalysis.md
  
  - **New section: Synthesis (society-of-thought)**: Define GapAnalysis.md generation:
    - Neutral agent (no persona) performs synthesis
    - Confidence-weighted aggregation: weigh findings by stated confidence and evidence quality, not count of specialists
    - Grounding validation: verify each finding references code present in the actual diff; exclude or demote ungrounded findings
    - Evidence-based adjudication: examine reasoning traces, not just conclusions
    - Severity classification: must-fix, should-fix, consider (consistent with existing review format)
    - Specialist attribution: each finding attributed to originating specialist(s)
    - Adaptive selection rationale (if adaptive mode): document which specialists were chosen and why
    - Debate trace (if debate mode): show how disagreements were resolved across rounds
  
  - **GapAnalysis.md structure**: Define the artifact format (new artifact alongside REVIEW.md and REVIEW-SYNTHESIS.md)
  
  - **Step 5 (Resolution)**: Extend interactive resolution for society-of-thought:
    - `interactive: false` → auto-apply must-fix and should-fix, skip consider
    - `interactive: true` → present findings from GapAnalysis.md, then enter moderator mode
    - `interactive: smart` → auto-apply high-confidence consensus must-fix/should-fix, interactive for contested findings, then moderator mode if significant findings exist
    - Moderator mode hooks: user can summon specialist by name ("@security-paranoid why did you flag X?"), request deeper analysis on an area, or challenge a finding (specialist responds with independent evidence maintaining persona)
  
  - **Review Artifacts table**: Add society-of-thought row: `REVIEW-{SPECIALIST}.md` per specialist + `GapAnalysis.md`
  
  - **VS Code handling**: If mode is `society-of-thought` in VS Code, fall back to `multi-model` (or `single-model` if multi-model also unavailable) with notification

- **Tests**: 
  - Lint: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
  - Lint: `npm run lint`

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
- [ ] Lint passes: `npm run lint`
- [ ] SKILL.md contains society-of-thought execution path with parallel and debate modes
- [ ] GapAnalysis.md structure defined in SKILL.md

#### Manual Verification:
- [ ] Specialist discovery instructions cover all 4 precedence levels with clear override semantics
- [ ] Parallel mode execution path is clear: discover specialists → compose prompts → spawn parallel → synthesize
- [ ] Debate mode execution path is clear: round 1 parallel → synthesis summary → round 2+ with summaries only → adaptive termination
- [ ] Interactive moderator mode hooks are described (summon, challenge, deeper analysis)
- [ ] VS Code fallback behavior documented
- [ ] GapAnalysis.md format includes specialist attribution, confidence levels, severity, and grounding validation status

---

## Phase 3: Configuration & Status

### Objective
Extend paw-init to collect society-of-thought configuration during workflow setup and paw-status to display it. Also update the paw-specification.md to reference the new review mode.

### Changes Required

- **`skills/paw-init/SKILL.md`**:
  - Add new input parameters to the parameters table:
    - `final_review_specialists` | No | `all` | `all`, comma-separated names, or `adaptive:<N>` (e.g., `adaptive:3`)
    - `final_review_interaction_mode` | No | `parallel` | `parallel`, `debate`
  - Update `Final Review Mode` valid values: `single-model`, `multi-model`, `society-of-thought`
  - Add conditional display: society-of-thought fields only shown/relevant when `final_review_mode` is `society-of-thought`
  - Add new fields to WorkflowContext.md template:
    - `Final Review Specialists: <final_review_specialists>`
    - `Final Review Interaction Mode: <final_review_interaction_mode>`
  - Update configuration validation: if `final_review_mode` is `society-of-thought`, validate specialist and interaction mode values
  - Lint: `./scripts/lint-prompting.sh skills/paw-init/SKILL.md`

- **`skills/paw-status/SKILL.md`**:
  - Update Configuration Detection section to read:
    - `Final Review Mode: single-model | multi-model | society-of-thought`
    - `Final Review Specialists: all | adaptive:<N> | <comma-separated list>` (when society-of-thought)
    - `Final Review Interaction Mode: parallel | debate` (when society-of-thought)
  - Update Status Dashboard to display society-of-thought config when active
  - Lint: `./scripts/lint-prompting.sh skills/paw-status/SKILL.md`

- **`paw-specification.md`**:
  - Add `society-of-thought` to the Final Review Mode options in the specification document
  - Document the new configuration fields and their behavior
  - Reference specialist precedence levels

- **Tests**:
  - Lint: `npm run lint:skills`

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `npm run lint:skills`
- [ ] paw-init SKILL.md contains society-of-thought parameters and WorkflowContext.md template fields
- [ ] paw-status SKILL.md references society-of-thought configuration fields

#### Manual Verification:
- [ ] paw-init parameter defaults are sensible (specialists: `all`, interaction mode: `parallel`)
- [ ] Configuration validation catches invalid society-of-thought field values
- [ ] paw-status would display society-of-thought config clearly when active

---

## Phase 4: Documentation

### Objective
Create user-facing documentation explaining society-of-thought review, custom specialist creation, and persona template guidance. Update project documentation to reference the new feature.

### Changes Required

- **`.paw/work/society-of-thought-final-review/Docs.md`**: Technical reference (load `paw-docs-guidance`)
  - Implementation details, architecture decisions, verification approach
  - Research sources summary (reference ResearchSources.md)

- **`docs/guide/society-of-thought-review.md`**: User guide
  - What is society-of-thought review and why use it
  - Configuration options (mode, specialists, interaction mode, interactive)
  - Built-in specialist roster overview
  - How to create custom specialists (with persona template scaffold)
  - Parallel vs debate modes explained
  - Interactive moderator mode usage
  - Tips for effective custom personas (informed by research: narrative backstories, distinct cognitive strategies, anti-sycophancy rules)

- **`docs/reference/artifacts.md`**: Add GapAnalysis.md to the implementation workflow artifacts table

- **`mkdocs.yml`**: Add `society-of-thought-review.md` to the Guide navigation section

- **Tests**:
  - Docs build: `source .venv/bin/activate && mkdocs build --strict`
  - Content accurate and style consistent with existing docs

### Success Criteria

#### Automated Verification:
- [ ] Docs build: `source .venv/bin/activate && mkdocs build --strict`
- [ ] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] User guide explains the feature clearly for someone who hasn't read the spec
- [ ] Custom specialist creation guide includes persona template scaffold with examples
- [ ] Artifacts reference updated with GapAnalysis.md
- [ ] Navigation updated in mkdocs.yml

---

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/201
- Spec: `.paw/work/society-of-thought-final-review/Spec.md`
- Research: `.paw/work/society-of-thought-final-review/SpecResearch.md`, `.paw/work/society-of-thought-final-review/CodeResearch.md`
- Work Shaping: `.paw/work/society-of-thought-final-review/WorkShaping.md`
- Research Sources: `.paw/work/society-of-thought-final-review/ResearchSources.md`
