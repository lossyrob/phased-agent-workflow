# Extract SoT Engine into paw-sot Skill — Implementation Plan

## Overview
Extract the Society of Thought (SoT) orchestration engine from `skills/paw-final-review/SKILL.md` into a standalone `skills/paw-sot/SKILL.md`, move specialist persona files to `skills/paw-sot/references/specialists/`, add context-adaptive review type preambles, and refactor `paw-final-review` to delegate SoT orchestration to `paw-sot`. Update all referencing files (agents, skills, docs, tests, specification) to reflect the new architecture.

## Current State Analysis
The SoT engine occupies lines 136-306 of `paw-final-review/SKILL.md` (168 lines) within a `{{#cli}}` block. It covers specialist discovery, adaptive selection, prompt composition, parallel/debate execution, model assignment, and synthesis. Specialist persona files (10 files, 1,284 lines) live at `skills/paw-final-review/references/specialists/`. Moderator mode (lines 420-437) spawns specialist subagents and needs SoT infrastructure. 12+ files across the codebase reference paw-final-review's SoT components.

## Desired End State
- `skills/paw-sot/SKILL.md` contains the complete SoT engine with review context input contract, specialist discovery, execution modes, synthesis, moderator mode, and context-adaptive preambles
- `skills/paw-sot/references/specialists/` contains all specialist persona files (moved from paw-final-review)
- `skills/paw-final-review/SKILL.md` is a thin adapter for SoT mode: reads WorkflowContext, constructs review context, delegates to paw-sot, handles post-synthesis resolution
- All referencing files updated to reflect paw-sot as the SoT engine location
- CLI build test updated for new specialist file location
- Zero behavioral regression for existing SoT workflows

## What We're NOT Doing
- Converting paw-planning-docs-review to use paw-sot (future issue)
- PAW Review workflow integration with paw-sot (#209)
- Direct user invocation of paw-sot from PAW agent
- Adding new specialist personas
- Changing the WorkflowContext.md schema or paw-init configuration
- Any TypeScript source code changes (src/) — build/test infrastructure changes for file relocation are in scope

## Phase Status
- [x] **Phase 1: Create paw-sot skill and move specialist personas** - Build the new skill with extracted SoT engine, review context contract, context-adaptive preambles, and relocated specialist files
- [x] **Phase 2: Refactor paw-final-review as thin adapter** - Replace SoT engine sections with delegation to paw-sot, update moderator mode to invoke paw-sot
- [x] **Phase 3: Update references across codebase** - Update agents, skills, docs, specification, and tests to reflect paw-sot architecture
- [x] **Phase 4: Documentation** - Create Docs.md, update project documentation

## Phase Candidates
<!-- Lightweight capture of potential phases identified during implementation. -->

---

## Phase 1: Create paw-sot skill and move specialist personas

### Changes Required:

- **`skills/paw-sot/SKILL.md`** (new file): Create the SoT engine skill containing:
  - Frontmatter with name `paw-sot` and description establishing "SoT" abbreviation per issue naming decision
  - Execution context note: loaded into calling agent's session (not subagent)
  - **Review Context Input Contract**: Define the structured input with fields `type` (diff|artifacts|freeform), `coordinates` (diff range, artifact paths, or user-provided content), `output_dir`, `specialists` (all|list|adaptive:N), `interaction_mode` (parallel|debate), `interactive` (true|false|smart), `specialist_models` (model assignment config), and optional `framing` (for freeform type)
  - **Context-Adaptive Preambles**: Define preambles for each review type — `diff` frames as code/implementation review, `artifacts` frames as design/planning review (redirecting cognitive strategies to design decisions and assumptions per dogfooding observations), `freeform` uses caller-provided framing
  - **Specialist Discovery**: Extract lines 138-153 (4-level precedence, resolution rules) — update built-in path from `references/specialists/` (relative to paw-sot)
  - **Adaptive Selection**: Extract lines 155-173 (selection process, edge cases)
  - **Prompt Composition**: Extract lines 174-184 (three-layer composition) — add review context preamble as a fourth layer, making the order: shared rules → **context preamble** → specialist content → review coordinates. The preamble precedes specialist content so it frames how the specialist interprets its persona for the review type.
  - **Parallel Mode Execution**: Extract lines 190-208 (model assignment precedence chain, subagent spawning)
  - **Debate Mode Execution**: Extract lines 210-243 (thread-based multi-round debate, adaptive termination)
  - **Synthesis**: Extract lines 245-306 (PR triage lead constraints, clustering, disagreement classification, grounding validation, REVIEW-SYNTHESIS.md structure)
  - **Moderator Mode**: Relocate from paw-final-review lines 420-437 — specialist summoning, challenge, deeper analysis; paw-sot owns this since it requires specialist personas and SoT infrastructure. Moderator mode is exposed as a **separate invocation** from the main orchestration: the calling skill invokes paw-sot once for orchestration+synthesis, handles resolution (apply/skip/discuss) itself, then invokes paw-sot a second time for moderator mode if conditions are met. The moderator mode section accepts the synthesis output path and review coordinates as input.
  - **Output Artifacts**: REVIEW-{SPECIALIST}.md per specialist + REVIEW-SYNTHESIS.md in output_dir, .gitignore with `*`

- **`skills/paw-sot/references/specialists/`** (move): Move all 10 files from `skills/paw-final-review/references/specialists/` to `skills/paw-sot/references/specialists/`:
  - `_shared-rules.md`, `architecture.md`, `assumptions.md`, `correctness.md`, `edge-cases.md`, `maintainability.md`, `performance.md`, `release-manager.md`, `security.md`, `testing.md`

### Success Criteria:

#### Automated Verification:
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh skills/paw-sot/SKILL.md`
- [ ] paw-sot directory structure matches skill conventions: `skills/paw-sot/SKILL.md` + `skills/paw-sot/references/specialists/` with 10 files

#### Manual Verification:
- [ ] All SoT engine sections from paw-final-review lines 136-306 are present in paw-sot (no content lost)
- [ ] Review context input contract covers all fields from Spec FR-002
- [ ] Context-adaptive preambles defined for all three types (diff, artifacts, freeform) per FR-008
- [ ] Specialist discovery path references `references/specialists/` (relative to paw-sot)
- [ ] Moderator mode section present with all three interaction patterns (summon, challenge, deeper analysis)
- [ ] REVIEW-SYNTHESIS.md structure preserved identically

---

## Phase 2: Refactor paw-final-review as thin adapter

### Changes Required:

- **`skills/paw-final-review/SKILL.md`**: Transform the society-of-thought section into a thin adapter:
  - **Remove**: Lines 136-306 (SoT engine — specialist discovery, adaptive selection, prompt composition, parallel/debate execution, synthesis)
  - **Remove**: Lines 420-437 (moderator mode — moved to paw-sot)
  - **Remove**: `skills/paw-final-review/references/specialists/` directory (moved in Phase 1)
  - **Add (SoT delegation)**: Replace the `"If society-of-thought mode"` section with review context construction and delegation:
    - Read WorkflowContext.md SoT fields (already done in Step 1)
    - Construct review context: `type: diff`, coordinates from Step 2 (diff range, artifact paths), output_dir from Step 3, map `Final Review Specialists` → `specialists`, `Final Review Interaction Mode` → `interaction_mode`, `Final Review Interactive` → `interactive`, `Final Review Specialist Models` → `specialist_models`
    - Load paw-sot skill and execute with the review context
  - **Add (moderator delegation)**: After resolution completes, if SoT mode and interactive conditions met, invoke paw-sot a **second time** for moderator mode — pass synthesis output path and review coordinates. This is a separate invocation from the orchestration+synthesis call, with paw-final-review's resolution happening in between.
  - **Preserve unchanged**: Single-model mode (lines 88-90), multi-model mode (lines 92-135), review prompt (lines 54-83), Step 5 Resolution (lines 319-418 minus moderator), Step 6 Completion (lines 439-461)
  - **Update**: Capabilities list to mention paw-sot delegation for SoT mode
  - **Update**: Review Artifacts table — SoT artifacts produced by paw-sot, not directly by paw-final-review
  - **Keep**: Smart interactive SoT classification heuristic (lines 373-384) — operates on REVIEW-SYNTHESIS.md output from paw-sot
  - **Keep**: SoT resolution in Step 5 (lines 351-354) — processes paw-sot's synthesis output

### Success Criteria:

#### Automated Verification:
- [ ] Prompt lint passes: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
- [ ] No specialist files remain in `skills/paw-final-review/references/` (directory removed or empty)
- [ ] Existing integration tests pass: `cd tests/integration && npx tsx --test tests/workflows/smart-interactive-mode.test.ts`

#### Manual Verification:
- [ ] SoT delegation constructs complete review context with all fields mapped from WorkflowContext.md
- [ ] Single-model and multi-model modes are unchanged
- [ ] Resolution flow (apply/skip/discuss) and smart classification are unchanged
- [ ] Moderator mode invocation delegates to paw-sot
- [ ] No orphaned references to `references/specialists/` within paw-final-review

---

## Phase 3: Update references across codebase

### Changes Required:

- **`agents/PAW.agent.md`**: No changes needed — PAW agent references paw-final-review (which is the adapter), not the SoT engine directly. paw-sot is loaded by paw-final-review, not by the PAW agent.

- **`skills/paw-workflow/SKILL.md`**: Add paw-sot to the skills catalog/activity table as a utility skill (loaded by paw-final-review, not independently orchestrated). Verify paw-final-review description reflects "delegates SoT to paw-sot."

- **`skills/paw-transition/SKILL.md`**: No changes needed — transitions reference paw-final-review (the adapter), not the engine.

- **`skills/paw-init/SKILL.md`**: No changes needed — paw-init writes WorkflowContext.md config fields; paw-final-review still reads them.

- **`skills/paw-status/SKILL.md`**: No changes needed — displays WorkflowContext.md fields, which are unchanged.

- **`paw-specification.md`**: Update Stage 03.5 description to mention paw-sot as the underlying SoT engine invoked by paw-final-review. Add paw-sot to the skills listing.

- **`cli/test/build.test.js`**: Update specialist file assertions: change path from `paw-final-review/references/specialists/` to `paw-sot/references/specialists/`, update test description to reference paw-sot, and increment the `skills.length >= 26` assertion to `>= 27` to account for the new paw-sot skill directory.

- **`docs/guide/society-of-thought-review.md`**: Update to mention paw-sot as the engine skill. Explain that paw-final-review delegates to paw-sot. Update architecture description to reflect three-tier design (engine → adapter → user).

- **`docs/reference/artifacts.md`**: Update REVIEW-SYNTHESIS.md description to mention paw-sot as the producer. Update WorkflowContext field descriptions if they reference paw-final-review as the SoT executor.

- **`docs/specification/implementation.md`**: Update Stage 03.5 to reference paw-sot for SoT orchestration.

- **`docs/guide/workflow-modes.md`**: Update SoT configuration table if it references paw-final-review as executor.

- **`docs/reference/agents.md`**: Update paw-final-review description in activity table. Add paw-sot as a utility skill.

### Success Criteria:

#### Automated Verification:
- [ ] `npm run lint` passes
- [ ] `npm run lint:agent:all` passes (all agents and skills lint clean)
- [ ] CLI build test passes: `cd cli && npm test`
- [ ] Docs build passes: `source .venv/bin/activate && mkdocs build --strict`

#### Manual Verification:
- [ ] No remaining references to `paw-final-review/references/specialists/` anywhere in the codebase
- [ ] paw-sot appears in skills catalog, specification, and documentation
- [ ] SoT user guide accurately describes the engine → adapter architecture

---

## Phase 4: Documentation

### Changes Required:

- **`.paw/work/extract-sot-engine/Docs.md`**: Technical reference (load `paw-docs-guidance` skill)
  - Architecture: three-tier design (paw-sot engine → paw-final-review adapter → user)
  - Review context contract: field definitions and usage
  - Context-adaptive preamble design: rationale from dogfooding observations
  - Specialist persona relocation and discovery precedence
  - Migration notes: what changed for existing users

- **Project docs**: Already handled in Phase 3 (docs/ updates)

### Success Criteria:
- [ ] Docs build: `source .venv/bin/activate && mkdocs build --strict`
- [ ] Content accurate, style consistent with existing documentation

---

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/242
- Spec: `.paw/work/extract-sot-engine/Spec.md`
- Research: `.paw/work/extract-sot-engine/CodeResearch.md`
