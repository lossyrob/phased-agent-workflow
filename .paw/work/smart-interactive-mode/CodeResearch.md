# Code Research: Smart Interactive Mode

---
work_id: smart-interactive-mode
issue: https://github.com/lossyrob/phased-agent-workflow/issues/219
date: 2025-07-22
---

## 1. Multi-Model Review Skill

**File**: `.github/skills/multi-model-review/SKILL.md`

### Synthesis Output Structure

The synthesis document (`REVIEW-SYNTHESIS.md`) uses a three-tier agreement categorization (lines 77–102):

```
## Consensus Issues (All 3 Models Agree)       ← line 84
## Partial Agreement (2 of 3 Models)            ← line 87
## Single-Model Insights                        ← line 90
```

Below the agreement tiers, findings are re-organized by severity into Priority Actions (lines 93–101):

```
## Priority Actions
### Must Fix         ← line 95
### Should Fix       ← line 98
### Consider         ← line 100
```

### Finding Presentation (Interactive Resolution)

Phase 4 (lines 106–148) defines interactive resolution. Each finding is presented in chat (not a selector) with this structure (lines 112–130):

- `## Finding #N: [Title]`
- `**Issue**: [Description]`
- `**Current**: [code/text]`
- `**Proposed**: [change]`
- `**My Opinion**: [Rationale]`
- User options: `Skip, discuss, or apply?`

### Finding Status Tracking

Three statuses are tracked per finding (lines 133–135):
- `applied` — Change made
- `skipped` — User chose not to apply
- `discussed` — Modified based on discussion, then applied or skipped

### Cross-Model Deduplication

When moving between model reviews, findings are cross-referenced (lines 137–140):
- Already applied → "Already addressed in Finding #N from [Model]"
- Previously skipped → "Previously skipped (Finding #N from [Model]). Revisit?"
- Similar but different angle → Present as new finding

### Non-Interactive Mode

The multi-model-review skill has **no explicit non-interactive mode**. Phase 4 (line 106) always presents findings interactively. The skill description (line 3) says "interactively applies fixes." This is a standalone skill, not a PAW workflow skill — it always runs interactively.

### Completion Report

Lines 143–148: Reports number of findings per model, applied vs skipped counts, summary of changes, and remaining items for future consideration.

---

## 2. paw-final-review Skill

**File**: `skills/paw-final-review/SKILL.md`

### Configuration Reading (Step 1)

Lines 23–28 define the configuration fields read from WorkflowContext.md:
- `Final Review Mode`: `single-model` | `multi-model`
- `Final Review Interactive`: `true` | `false`
- `Final Review Models`: comma-separated model names

### Severity Levels

Three severity levels for findings (line 82):
- `must-fix` — Critical issues
- `should-fix` — High-value improvements
- `consider` — Nice-to-haves

### Review Prompt Finding Structure

Lines 78–84 define what each finding must contain:
- Issue description
- Current code/text
- Proposed fix
- Severity: `must-fix` | `should-fix` | `consider`

### Synthesis Structure (Multi-Model, CLI Only)

Lines 104–136 (inside `{{#cli}}` conditional) define `REVIEW-SYNTHESIS.md`:
- `## Consensus Issues (All Models Agree)` — line 113
- `## Partial Agreement (2+ Models)` — line 116
- `## Single-Model Insights` — line 119
- `## Verification Checklist` — line 121 (interface/data-flow coordination)
- `## Priority Actions` → `Must Fix` / `Should Fix` / `Consider` — lines 127–135

### Interactive Resolution (Step 5)

**Interactive = true** (lines 151–179): Each finding presented with:
- `## Finding #N: [Title]`
- `**Severity**: [must-fix | should-fix | consider]`
- `**Issue**: [Description]`
- `**Current**:` / `**Proposed**:`
- `**My Opinion**: [Rationale]`
- User options: `apply, skip, or discuss?`

Status tracking (lines 173–175):
- `applied` — Change made to codebase
- `skipped` — User chose not to apply
- `discussed` — Modified, then applied or skipped

Multi-model ordering (line 179, inside `{{#cli}}`): Process synthesis first (consensus → partial → single-model). Track cross-finding duplicates.

**Interactive = false** (lines 183–184):
> Auto-apply all findings marked `must-fix` and `should-fix`. Skip `consider` items. Report what was applied.

### Platform Conditionals

The skill uses Mustache-style conditionals:
- `{{#cli}}` ... `{{/cli}}` — CLI-specific sections (lines 87–137, 178–180)
- `{{#vscode}}` ... `{{/vscode}}` — VS Code-specific sections (lines 139–145)

VS Code limitation (line 34): Only supports `single-model` mode.

### Completion (Step 6)

Lines 187–198: Reports total findings, applied/skipped/discussed counts, summary, artifacts location, status: `complete`.

### Artifact Output

Lines 199–207: Single-model produces `REVIEW.md`; multi-model produces `REVIEW-{MODEL}.md` per model plus `REVIEW-SYNTHESIS.md`. Location: `.paw/work/<work-id>/reviews/`. Gitignored via `*` pattern.

---

## 3. paw-planning-docs-review Skill

**File**: `skills/paw-planning-docs-review/SKILL.md`

### Configuration Reading (Step 1)

Lines 25–30 define fields from WorkflowContext.md:
- `Planning Docs Review`: `enabled` | `disabled`
- `Planning Review Mode`: `single-model` | `multi-model`
- `Planning Review Interactive`: `true` | `false`
- `Planning Review Models`: comma-separated model names

Line 32: If `Planning Docs Review` is `disabled`, skip and return `complete`.

### Review Focus

Lines 63–97 define cross-artifact review criteria:
1. **Spec ↔ Plan Traceability** — line 78
2. **Assumption Consistency** — line 80
3. **Scope Coherence** — line 82
4. **Feasibility Validation** — line 84
5. **Completeness** — line 86

### Finding Structure

Lines 89–95 define per-finding fields:
- Issue description (which artifacts conflict and how)
- Evidence from each artifact
- Affected artifact(s): `spec`, `plan`, or `both`
- Suggested resolution direction
- Severity: `must-fix` | `should-fix` | `consider`

### Synthesis Structure (Multi-Model)

Lines 112–139 (inside `{{#cli}}`): Same three-tier agreement structure as paw-final-review but without the Verification Checklist:
- `## Consensus Issues (All Models Agree)` — line 120
- `## Partial Agreement (2+ Models)` — line 123
- `## Single-Model Insights` — line 126
- `## Priority Actions` → `Must Fix` / `Should Fix` / `Consider` — lines 129–137

### Interactive Resolution (Step 5)

**Interactive = true** (lines 155–186): Each finding presented with:
- `## Finding #N: [Title]`
- `**Severity**`, `**Criteria**`, `**Affected Artifact(s)**: [spec | plan | both]`
- `**Issue**`, `**Evidence**` (from spec, plan, research), `**Suggested Resolution**`
- User options: `apply-to-spec, apply-to-plan, apply-to-both, skip, or discuss?`

Resolution routing (lines 179–184):
- `apply-to-spec` → Load `paw-spec` skill (Revise Specification mode)
- `apply-to-plan` → Load `paw-planning` skill (Plan Revision mode)
- `apply-to-both` → Apply to spec first, then plan (sequential)
- `skip` → Record as skipped
- `discuss` → Discuss, then apply or skip

Finding statuses (line 186): `applied-to-spec`, `applied-to-plan`, `applied-to-both`, `skipped`, `discussed`.

**Interactive = false** (lines 192–194):
> Auto-apply all `must-fix` and `should-fix` findings. Skip `consider` items. Route each to the appropriate planning skill based on affected artifact. Report what was applied.

### Re-Review Cycle (Step 6)

Lines 197–204: If revisions were made, re-run review. Cycle limit: 2. After 2 cycles, present remaining findings as informational and proceed.

### Platform Conditionals

Same `{{#cli}}` / `{{#vscode}}` pattern as paw-final-review.
- CLI section: lines 99–141
- VS Code section: lines 143–149

### Artifact Output

Lines 219–227: Same pattern as paw-final-review. Location: `.paw/work/<work-id>/reviews/planning/`. Covered by parent `.gitignore`.

---

## 4. paw-init Skill (Defaults & WorkflowContext)

**File**: `skills/paw-init/SKILL.md`

### Interactive Configuration Defaults

Input parameters table (lines 26–43):

| Parameter | Default | Valid Values |
|-----------|---------|--------------|
| `final_review_interactive` | `true` | boolean (line 38) |
| `planning_review_interactive` | `true` | boolean (line 42) |
| `final_review_mode` | `multi-model` | `single-model`, `multi-model` (line 37) |
| `planning_review_mode` | `multi-model` | `single-model`, `multi-model` (line 41) |
| `final_review_models` | `latest GPT, latest Gemini, latest Claude Opus` (line 39) | comma-separated |
| `planning_review_models` | `latest GPT, latest Gemini, latest Claude Opus` (line 43) | comma-separated |

### WorkflowContext.md Template

Lines 92–117 define the full template. The interactive fields appear at:
- `Final Review Interactive: <final_review_interactive>` — line 105
- `Planning Review Interactive: <planning_review_interactive>` — line 109

The template is plain `key: value` format, one per line, no YAML or structured format.

### Model Resolution

Lines 75–81: Model intents are resolved to concrete names during init (e.g., "latest GPT" → `gpt-5.2`). Resolved names are stored in WorkflowContext.md so downstream skills don't need to resolve again.

### Current WorkflowContext.md (This Work Item)

**File**: `.paw/work/smart-interactive-mode/WorkflowContext.md`

Lines 13–18 show the current values:
```
Final Review Interactive: true
Final Review Models: gpt-5.2, gemini-3-pro-preview, claude-opus-4.6
Planning Docs Review: enabled
Planning Review Mode: multi-model
Planning Review Interactive: true
Planning Review Models: gpt-5.2, gemini-3-pro-preview, claude-opus-4.6
```

---

## 5. VS Code Extension (TypeScript)

### FinalReviewConfig Interface

**File**: `src/ui/userInput.ts:36-45`

```typescript
export interface FinalReviewConfig {
  enabled: boolean;
  mode: 'single-model' | 'multi-model';
  interactive: boolean;   // ← boolean type, not string
}
```

The `interactive` field is typed as `boolean`. There is no `'smart'` value in the current type definition.

### Quick Pick UI for Interactive Mode

**File**: `src/ui/userInput.ts:441-471`

Two options presented (lines 442–455):
- "Interactive" → `true` (default)
- "Auto-Apply" → `false`

No "Smart" option exists currently.

### Config Passed to PAW Agent

**File**: `src/commands/initializeWorkItem.ts:37-42`

```typescript
config.final_review_interactive = inputs.finalReview.interactive;
```

The boolean value from `FinalReviewConfig.interactive` is passed directly as a config parameter.

### Unit Tests for FinalReviewConfig

**File**: `src/test/suite/userInput.test.ts:113-149`

Three test cases validate the interface:
- `FinalReviewConfig works when disabled` (line 116) — `interactive: true`
- `FinalReviewConfig works with single-model mode` (line 128) — `interactive: true`
- `FinalReviewConfig works with multi-model mode` (line 139) — `interactive: false`

All tests use boolean values only.

---

## 6. Consuming Skills — How Interactive Values Flow

### paw-final-review reads `Final Review Interactive`

**File**: `skills/paw-final-review/SKILL.md:27`
```
- `Final Review Interactive`: `true` | `false`
```

Binary decision at line 149/151: `If Interactive = true` → present findings; `If Interactive = false` → auto-apply.

### paw-planning-docs-review reads `Planning Review Interactive`

**File**: `skills/paw-planning-docs-review/SKILL.md:29`
```
- `Planning Review Interactive`: `true` | `false`
```

Binary decision at line 155/192: same pattern.

### paw-status displays the value

**File**: `skills/paw-status/SKILL.md:48`
```
- Final Review Interactive: `true` | `false`
```

Status skill only reads and reports the value, does not branch on it.

### Summary: All consumers currently expect `true` | `false` only

No skill currently handles a `smart` value. Adding `smart` requires updates to:
1. `skills/paw-init/SKILL.md` — parameter table (line 38, 42) and template (line 105, 109)
2. `skills/paw-final-review/SKILL.md` — config reading (line 27) and resolution branching (lines 149–184)
3. `skills/paw-planning-docs-review/SKILL.md` — config reading (line 29) and resolution branching (lines 155–194)
4. `skills/paw-status/SKILL.md` — display (line 48)
5. `src/ui/userInput.ts` — `FinalReviewConfig.interactive` type (line 44) and quick pick (lines 441–455)
6. `src/commands/initializeWorkItem.ts` — config passthrough (line 40)
7. `src/test/suite/userInput.test.ts` — test cases (lines 113–149)
8. `docs/specification/implementation.md` — field docs (line 172)
9. `docs/guide/workflow-modes.md` — field table (line 157)
10. `docs/reference/artifacts.md` — WorkflowContext field docs (lines 59, 63)

---

## 7. Documentation System

### MkDocs Configuration

**File**: `mkdocs.yml`

- Theme: Material for MkDocs (line 19)
- Site URL: `https://lossyrob.github.io/phased-agent-workflow` (line 11)
- Build: `mkdocs build` / `mkdocs serve` (lines 3–4)
- Deploy: `mkdocs gh-deploy --force` (line 5)
- Strict build validation: `mkdocs build --strict` (per copilot-instructions)

### Docs Structure

**Directory**: `docs/`

```
docs/
├── index.md
├── guide/
│   ├── index.md
│   ├── cli-installation.md
│   ├── stage-transitions.md
│   ├── two-workflows.md
│   ├── vscode-extension.md
│   └── workflow-modes.md
├── specification/
│   ├── index.md
│   ├── implementation.md
│   └── review.md
└── reference/
    ├── agents.md
    └── artifacts.md
```

### Nav Structure (mkdocs.yml lines 61–76)

- Home → User Guide (6 pages) → Specification (3 pages) → Reference (2 pages)

### Files That Need Updates

- `docs/specification/implementation.md:172` — `Final Review Interactive` valid values
- `docs/guide/workflow-modes.md:157` — Configuration table
- `docs/reference/artifacts.md:59,63` — WorkflowContext field reference

---

## 8. Verification Commands

**File**: `package.json`

### Build & Lint
- `npm run compile` — TypeScript compilation (`tsc -p ./`) — line 126
- `npm run lint` — ESLint on `src/` — line 128
- `npm run lint:agent` — Prompt linter for single agent — line 130
- `npm run lint:agent:all` — All agents and skills — line 131
- `npm run lint:skills` — Skills only — line 132

### Tests
- `npm run test` — VS Code extension tests (`node ./out/test/runTest.js`) — line 127
- `npm run test:integration` — All integration tests — line 135
- `npm run test:integration:skills` — Skills-only (fast, no LLM) — line 136
- `npm run test:integration:workflows` — Workflow tests (slow, requires Copilot auth) — line 137

### Individual Test Execution
```bash
cd tests/integration && npx tsx --test tests/workflows/<test-file>.test.ts
```

### Documentation Build
```bash
source .venv/bin/activate && mkdocs build --strict
```

---

## 9. Integration Tests

### Existing Test for Planning Docs Review

**File**: `tests/integration/tests/workflows/planning-docs-review.test.ts`

- Seeds three planning artifacts using `seedWorkflowState(workId, "planning-review")` (line 53)
- Seeds directory: `tests/integration/fixtures/seeds/planning-review/` containing `Spec.md`, `ImplementationPlan.md`, `CodeResearch.md`
- Uses `RuleBasedAnswerer` with default first-choice strategy (lines 41–43)
- Verifies review artifact at `reviews/planning/REVIEW.md` (lines 78–79)
- Checks for FR references, plan references, severity/finding structure (lines 85–103)
- Asserts no git push or commit (lines 106–108)
- Uses `Judge` with cross-artifact rubric for quality evaluation (lines 117–133)
- Timeout: 180 seconds (line 28)
- **Does NOT test interactive mode** — no WorkflowContext seeded, no interactive field checked

### No Existing Test for Final Review

No dedicated integration test exists for `paw-final-review`. The `full-local-workflow` test exercises spec → plan → implement but does not include a final review stage.

### Test Infrastructure

**Harness** (`tests/integration/lib/harness.ts`):
- `createTestContext()` — Creates isolated test with SDK session, fixture, and hooks (lines 40–121)
- `destroyTestContext()` — Cleanup (lines 124–145)
- Supports `onUserInputRequest` callback for ask_user handling (lines 69–75)
- Tool hooks: `onPreToolUse` / `onPostToolUse` for logging and policy (lines 78–105)

**Fixtures** (`tests/integration/lib/fixtures.ts`):
- `TestFixture.clone(templateName)` — Clones template into temp dir with git init (lines 21–35)
- `seedWorkflowState(workId, stage)` — Seeds from `fixtures/seeds/<stage>/` (lines 38–45)
- Valid stages: `"spec" | "plan" | "planning-review" | "phase1"` (line 38)

**Assertions** (`tests/integration/lib/assertions.ts`):
- `assertArtifactExists(workDir, workId, artifactName)` — File exists and non-empty (lines 7–21)
- `assertSpecStructure()` — Checks overview, FRs, SCs (lines 24–52)
- `assertPlanStructure()` — Checks phases, success criteria (lines 55–75)
- `assertToolCalls()` — Required/forbidden tool patterns (lines 78–109)

**Answerer** (`tests/integration/lib/answerer.ts`):
- `RuleBasedAnswerer` — Rule-based with fail-closed default (lines 25–55)
- `HybridAnswerer` — Rules first, LLM fallback (lines 61–163)
- `pawCommonRules()` — Default rules for workflow init questions (lines 166–191)

### Seeded WorkflowContext Pattern

The `transition-review-policy.test.ts` (lines 27–49) shows how to seed a custom WorkflowContext.md with specific field values using `writeFile`. This pattern can be used to seed `Final Review Interactive: smart` or `Planning Review Interactive: smart` for new tests.

---

## 10. Key Code References Summary

| Component | File | Lines | What |
|-----------|------|-------|------|
| Synthesis agreement tiers | `.github/skills/multi-model-review/SKILL.md` | 84–90 | Consensus / Partial / Single-Model |
| Synthesis severity tiers | `.github/skills/multi-model-review/SKILL.md` | 93–101 | Must Fix / Should Fix / Consider |
| Finding presentation format | `.github/skills/multi-model-review/SKILL.md` | 112–130 | Interactive finding template |
| Finding status tracking | `.github/skills/multi-model-review/SKILL.md` | 133–135 | applied / skipped / discussed |
| Final review config fields | `skills/paw-final-review/SKILL.md` | 23–28 | WorkflowContext fields read |
| Final review interactive branch | `skills/paw-final-review/SKILL.md` | 149–184 | true/false branching logic |
| Final review auto-apply rule | `skills/paw-final-review/SKILL.md` | 183–184 | must-fix + should-fix applied |
| Final review synthesis structure | `skills/paw-final-review/SKILL.md` | 104–136 | CLI multi-model synthesis |
| Planning review config fields | `skills/paw-planning-docs-review/SKILL.md` | 25–30 | WorkflowContext fields read |
| Planning review interactive branch | `skills/paw-planning-docs-review/SKILL.md` | 155–194 | true/false branching logic |
| Planning review resolution routing | `skills/paw-planning-docs-review/SKILL.md` | 179–184 | apply-to-spec/plan/both/skip/discuss |
| Planning review auto-apply rule | `skills/paw-planning-docs-review/SKILL.md` | 192–194 | must-fix + should-fix applied |
| Planning review re-review cycle | `skills/paw-planning-docs-review/SKILL.md` | 197–204 | Max 2 cycles |
| paw-init interactive defaults | `skills/paw-init/SKILL.md` | 38, 42 | Default: `true` (boolean) |
| paw-init WorkflowContext template | `skills/paw-init/SKILL.md` | 105, 109 | Template placeholders |
| VS Code FinalReviewConfig type | `src/ui/userInput.ts` | 36–45 | `interactive: boolean` |
| VS Code quick pick options | `src/ui/userInput.ts` | 441–471 | Interactive / Auto-Apply |
| VS Code config passthrough | `src/commands/initializeWorkItem.ts` | 37–42 | Boolean passed to config |
| Unit tests for config | `src/test/suite/userInput.test.ts` | 113–149 | Three boolean test cases |
| paw-status display | `skills/paw-status/SKILL.md` | 48 | `true` \| `false` display |
| Docs: spec implementation | `docs/specification/implementation.md` | 172 | `true` \| `false` |
| Docs: workflow modes table | `docs/guide/workflow-modes.md` | 157 | `true`, `false` |
| Docs: artifacts reference | `docs/reference/artifacts.md` | 59, 63 | `true` or `false` |
| Integration test: planning review | `tests/integration/tests/workflows/planning-docs-review.test.ts` | 1–153 | Cross-artifact review test |
| Test fixture seeding | `tests/integration/lib/fixtures.ts` | 38–45 | seedWorkflowState |
| Custom WorkflowContext seeding | `tests/integration/tests/workflows/transition-review-policy.test.ts` | 27–49 | writeFile pattern |
| Test assertions | `tests/integration/lib/assertions.ts` | 7–109 | Artifact + tool assertions |
| Test answerer | `tests/integration/lib/answerer.ts` | 25–55 | RuleBasedAnswerer |
