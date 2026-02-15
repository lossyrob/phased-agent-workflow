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

- VS Code support (CLI only for v1; VS Code disables society-of-thought with fallback to multi-model — see #240 for chatSkills migration)
- Society-of-thought for paw-impl-review, paw-planning-docs-review, or PAW Review workflow
- Per-specialist output files (single GapAnalysis.md only)
- Automated persona drift detection or re-injection
- Specialist effectiveness metrics or scoring
- TypeScript code changes (this is a skill/prompt-level feature)

## Phase Status

- [ ] **Phase 1: Built-in Specialist Personas** - Define 5 specialist personas with full narratives, cognitive strategies, behavioral rules, and example outputs
- [ ] **Phase 2: Parallel Society-of-Thought Mode** - Extend paw-final-review with specialist discovery, parallel execution, GapAnalysis.md synthesis, and VS Code fallback
- [ ] **Phase 3: Debate Mode & Adaptive Selection** - Add debate interaction mode with hub-and-spoke mediation and adaptive specialist selection
- [ ] **Phase 4: Interactive Moderator Mode** - Add post-review moderator hooks for summoning, challenging, and requesting deeper analysis from specialists
- [ ] **Phase 5: Configuration & Status** - Extend paw-init with society-of-thought config fields and paw-status with display
- [ ] **Phase 6: Documentation** - User guide, specialist template scaffold, specification updates

## Phase Candidates
<!-- None identified yet -->

---

## Phase 1: Built-in Specialist Personas

### Objective
Define the 5 built-in specialist personas as complete persona specifications that can be embedded in paw-final-review. Each persona needs a narrative backstory (500-2000 words per research recommendation), distinct cognitive strategy, behavioral rules, anti-sycophancy structural rules, cross-cutting "demand rationale" rule, and 2-3 example review comments.

### Changes Required

- **`skills/paw-final-review/references/specialists/`**: Create a directory containing 5 built-in specialist files, following the [Agent Skills specification](https://agentskills.io/specification#optional-directories) `references/` directory pattern:
  - `security.md` — Cognitive strategy: threat modeling / attack-tree decomposition. Traces data flows from untrusted boundaries through trust boundaries to sinks.
  - `performance.md` — Cognitive strategy: quantitative back-of-envelope estimation. Calculates actual impact at projected scale, pragmatic about current vs future concerns.
  - `assumptions.md` — Cognitive strategy: Socratic first-principles questioning. Asks questions that expose assumptions, escalates with new challenges each round, acts as rationale auditor.
  - `edge-cases.md` — Cognitive strategy: systematic boundary enumeration. Methodically enumerates: null, empty, max, concurrent, interrupted, partially failed, timed out, duplicate, out of order.
  - `maintainability.md` — Cognitive strategy: narrative code walkthrough. Addresses the largest category of real review findings (75% maintainability per research).

- Each specialist file includes:
  - Full persona narrative (identity, background, what they've seen, what drives them)
  - Cognitive strategy description (how they analyze, not just what they look for)
  - Behavioral rules (specific analytical moves this persona always makes)
  - Anti-sycophancy structural rules: "You MUST identify at least one substantive concern. You MUST present independent evidence before agreeing. Prioritize finding real issues over maintaining harmony."
  - Cross-cutting rule: "Before evaluating code, assess whether you understand WHY this change was made. If rationale is unclear, flag it."
  - Confidence scoring instruction: "For each finding, state your confidence (HIGH/MEDIUM/LOW) and what evidence supports it."
  - 2-3 example review comments demonstrating the persona's cognitive strategy and communication style
  - Optional `model:` field (unset for built-in defaults)

- **Tests**: Lint specialist files with `./scripts/lint-prompting.sh skills/paw-final-review/references/specialists/*.md` (if applicable, or verify markdown is well-formed)

### Success Criteria

#### Automated Verification:
- [ ] All 5 specialist files exist in `skills/paw-final-review/references/specialists/`
- [ ] Each file contains required sections (identity, cognitive strategy, behavioral rules, anti-sycophancy rules, examples)
- [ ] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] Each persona reads as a distinct character with a unique voice and analytical approach
- [ ] Example review comments clearly demonstrate different cognitive strategies (not just different topics)
- [ ] Anti-sycophancy rules are structural constraints, not suggestions

---

## Phase 2: Parallel Society-of-Thought Mode

### Objective
Extend paw-final-review SKILL.md to support `society-of-thought` as a third review mode with specialist discovery at 4 precedence levels, parallel execution, and GapAnalysis.md synthesis with confidence weighting and grounding validation. This is the core execution path — debate, adaptive selection, and interactive moderator are added in subsequent phases.

### Design Decision: Specialist Storage
Built-in specialists are stored as separate markdown files in `skills/paw-final-review/references/specialists/` following the [Agent Skills specification](https://agentskills.io/specification#optional-directories) `references/` directory pattern. This keeps the format consistent across all precedence levels (project, user, built-in all use the same file format), makes specialists discoverable and editable, loads them on demand (not with every SKILL.md load), and aligns with the custom instructions precedence pattern from PR #113.

### Changes Required

- **`skills/paw-final-review/SKILL.md`**: Core extension with the following new/modified sections:

  - **Step 1 (Configuration)**: Extend to read new fields when mode is `society-of-thought`:
    - `Final Review Specialists`: fixed list (comma-separated names) or `adaptive:<N>` — defaults to `all` (all discovered specialists)
    - `Final Review Interaction Mode`: `parallel` | `debate` — defaults to `parallel`
    - `Final Review Interactive`: reused for moderator mode behavior (existing field)

  - **New section: Specialist Discovery**: Define 4-level precedence discovery algorithm:
    1. Workflow: Parse `Final Review Specialists` from WorkflowContext.md — if explicit list, use only those names
    2. Project: Scan `.paw/specialists/<name>.md` files
    3. User: Scan `~/.paw/specialists/<name>.md` files
    4. Built-in: Scan `skills/paw-final-review/references/specialists/<name>.md` files
    - Most-specific-wins for name conflicts (same filename at project overrides user overrides built-in)
    - If `Final Review Specialists` is `all`: include all discovered specialists from all levels
    - If fixed list: resolve each name against discovered specialists at all levels (most-specific-wins)
    - Skip malformed/empty specialist files with warning; continue with remaining roster
    - If no specialists found at any level, fall back to built-in defaults (guard against misconfiguration)

  - **Step 4 (Execute Review)**: Add society-of-thought parallel execution alongside existing single-model/multi-model:
    - For each selected specialist: compose prompt = specialist file content + shared review context (diff, spec, plan, CodeResearch patterns)
    - Spawn parallel subagents using `task` tool with `agent_type: "general-purpose"`. If specialist file contains a `model:` field, use that model; otherwise use session default
    - Save per-specialist output to `REVIEW-{SPECIALIST-NAME}.md` in the reviews directory
    - After all specialists complete, run neutral synthesis

  - **New section: Synthesis (society-of-thought)**: Define GapAnalysis.md generation:
    - Neutral agent (no persona) performs synthesis
    - Confidence-weighted aggregation: weigh findings by stated confidence and evidence quality, not count of specialists
    - Grounding validation: verify each finding references code present in the actual diff; exclude or demote ungrounded findings
    - Evidence-based adjudication: examine reasoning traces, not just conclusions
    - Severity classification: must-fix, should-fix, consider (consistent with existing review format)
    - Specialist attribution: each finding attributed to originating specialist(s)

  - **GapAnalysis.md structure**: Define the artifact format as a new artifact type

  - **Step 5 (Resolution)**: Extend for society-of-thought:
    - `interactive: false` → auto-apply must-fix and should-fix, skip consider (same as existing)
    - `interactive: true` → present findings from GapAnalysis.md using existing finding presentation format
    - `interactive: smart` → auto-apply high-confidence consensus must-fix/should-fix, interactive for contested findings
    - Note: Interactive moderator mode (summon/challenge) added in Phase 4

  - **Review Artifacts table**: Add society-of-thought row: `REVIEW-{SPECIALIST}.md` per specialist + `GapAnalysis.md`
    - Note: FR-019 (gitignore review artifacts) is satisfied by existing `.gitignore` with `*` pattern in `reviews/` — no new work needed

  - **VS Code handling**: If mode is `society-of-thought` in VS Code, disable society-of-thought and fall back to `multi-model` (or `single-model` if multi-model also unavailable) with notification directing users to issue #240 (VS Code chatSkills migration needed for `references/` directory access)

- **Tests**:
  - Lint: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
  - Lint: `npm run lint`

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
- [ ] Lint passes: `npm run lint`

#### Manual Verification:
- [ ] SKILL.md contains society-of-thought execution path for parallel mode
- [ ] Specialist discovery covers all 4 precedence levels with clear override semantics and edge cases (malformed files, no specialists found)
- [ ] GapAnalysis.md format includes: specialist attribution, confidence levels per finding, severity classifications, grounding validation status
- [ ] Synthesis instructions specify confidence-weighted aggregation (not majority voting) and grounding validation against actual diff
- [ ] VS Code fallback disables society-of-thought with notification referencing issue #240

---

## Phase 3: Debate Mode & Adaptive Selection

### Objective
Add debate interaction mode with hub-and-spoke mediation and adaptive specialist selection to the society-of-thought mode established in Phase 2.

### Changes Required

- **`skills/paw-final-review/SKILL.md`**: Add two new capabilities:

  - **Debate mode execution** (when `Final Review Interaction Mode: debate`):
    - Round 1: Run all selected specialists in parallel (reuse Phase 2 parallel execution)
    - After round 1: Neutral synthesis agent generates a round summary highlighting agreements, disagreements, and open questions — this summary is the only inter-specialist communication (hub-and-spoke, not full visibility)
    - Round 2+: Feed round summary (not raw findings from other specialists) to each specialist as additional context alongside original diff. Specialists can refine positions, challenge summarized claims, or add new findings.
    - Adaptive termination: After each round, synthesis agent evaluates whether new substantive findings emerged. If not, debate terminates early. Hard cap at 3 rounds regardless.
    - Final synthesis: Produce GapAnalysis.md with all rounds' findings merged, including a debate trace section showing how disagreements were resolved

  - **GapAnalysis.md debate trace section**: When debate mode was used, include:
    - Round progression summary
    - Disagreements identified and how they were resolved
    - Findings that evolved across rounds with specialist attribution

  - **Adaptive specialist selection** (when `Final Review Specialists: adaptive:<N>`):
    - After discovering all available specialists (Phase 2 discovery algorithm), agent analyzes the diff content
    - Agent selects up to N specialists most relevant to the changes
    - Selection rationale documented in GapAnalysis.md header ("Selected specialists: X, Y, Z because the diff primarily affects [areas]")
    - No user confirmation required (auto-selects silently per spec)
    - Edge case: If diff is too small/trivial for meaningful selection, report and suggest single-model mode

- **Tests**:
  - Lint: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
  - Lint: `npm run lint`

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`

#### Manual Verification:
- [ ] Debate mode instructions clearly describe hub-and-spoke: specialists see synthesis summaries, not each other's raw findings
- [ ] Adaptive termination criteria are clear: "no new substantive findings" + hard cap at 3 rounds
- [ ] GapAnalysis.md debate trace format shows round progression and disagreement resolution
- [ ] Adaptive selection instructions describe diff analysis approach and rationale documentation
- [ ] Edge cases covered: debate with 1 specialist (skip debate, use parallel), adaptive selects 0 (suggest single-model)

---

## Phase 4: Interactive Moderator Mode

### Objective
Add post-review interactive moderator mode where users can summon specialists, challenge findings, and request deeper analysis. Specialists maintain their persona when responding.

### Changes Required

- **`skills/paw-final-review/SKILL.md`**: Extend the Resolution section:

  - **Moderator mode activation**: After initial finding resolution completes (the existing Step 5 flow from Phase 2 — auto-apply/present/smart), if `Final Review Interactive` is `true` or (`smart` and significant findings exist):
    - Moderator mode *extends* existing interactive resolution — it does not replace it
    - Sequence: findings resolution → moderator loop → exit to paw-pr

  - **Moderator hooks** (3 interaction patterns):
    1. **Summon specialist**: User references a specialist by name for follow-up (e.g., "What does the Security Paranoid think about the auth flow?"). The specialist's persona file is loaded and the specialist responds in-character using its cognitive strategy, with access to the full diff and GapAnalysis.md context.
    2. **Challenge finding**: User disagrees with a specific finding and provides reasoning. The originating specialist must respond with independent evidence (not just agree), maintaining anti-sycophancy behavioral rules.
    3. **Request deeper analysis**: User asks for more detailed analysis on a specific code area. The most relevant specialist (or user-specified specialist) provides focused analysis using its cognitive strategy.

  - **Moderator exit**: User says "done", "continue", or "proceed" to exit moderator mode and continue to paw-pr

  - **Specialist persona maintenance**: When responding in moderator mode, each specialist's full persona file is included in the prompt to maintain character consistency

- **Tests**:
  - Lint: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
  - Lint: `npm run lint`

### Success Criteria

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`

#### Manual Verification:
- [ ] Moderator mode entry/exit conditions clearly defined
- [ ] Three interaction patterns described with examples: summon by name, challenge with reasoning, request deeper analysis
- [ ] Anti-sycophancy maintained during challenges (specialist must provide independent evidence)
- [ ] Specialist persona loading described for maintaining character consistency

---

## Phase 5: Configuration & Status

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

## Phase 6: Documentation

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
