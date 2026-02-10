# Smart Interactive Mode Implementation Plan

## Overview
Add a `smart` value to the `Final Review Interactive` and `Planning Review Interactive` configuration fields. Smart mode classifies synthesis findings using the existing agreement level (consensus/partial/single-model) and severity (must-fix/should-fix/consider) metadata, auto-applying clear consensus fixes and only pausing for findings that need user judgment. This touches skill prompts, VS Code extension TypeScript, and documentation.

## Current State Analysis
- Both review skills (`paw-final-review`, `paw-planning-docs-review`) have binary interactive branching: `true` → present each finding, `false` → auto-apply must-fix/should-fix
- The synthesis structure already organizes findings by agreement level (Consensus/Partial/Single-Model) and severity (Must Fix/Should Fix/Consider)
- VS Code extension types `interactive` as `boolean`; quick pick offers two options
- All downstream consumers expect `true` | `false` only — no skill handles `smart`
- No integration test exists for final-review; planning-docs-review test exists but doesn't test interactive mode

## Desired End State
- `smart` is a valid value for both interactive config fields, recognized by all consuming skills
- Smart mode auto-applies consensus must-fix/should-fix findings with clear single fixes, pauses for ambiguous findings, and reports consider-severity findings in summary only
- `smart` is the default for new workflows
- Backward compatibility: `true` and `false` continue to work identically to current behavior
- All lint, build, and existing tests pass

## What We're NOT Doing
- Modifying the multi-model-review synthesis skill output format
- Adding new synthesis fields or structured metadata beyond what already exists
- Implementing smart mode for single-model reviews (degrades to interactive)
- Making heuristic thresholds user-configurable
- Adding new integration tests (out of scope per issue; may be a phase candidate)

## Phase Status
- [x] **Phase 1: Core Review Skills** - Add smart mode resolution logic to paw-final-review and paw-planning-docs-review
- [ ] **Phase 2: Configuration Chain** - Update paw-init defaults, paw-status display, VS Code extension types/UI, and unit tests
- [ ] **Phase 3: Documentation** - Update specification, guide, reference docs, and create Docs.md

## Phase Candidates
<!-- Lightweight capture of potential phases identified during implementation. -->
- [ ] Integration test for smart mode classification behavior

---

## Phase 1: Core Review Skills

### Changes Required:

- **`skills/paw-final-review/SKILL.md`**:
  - Update config reading (line 27) to accept `true` | `false` | `smart`
  - Add `If Interactive = smart` branch in Step 5: Resolution (between current `true` and `false` branches, lines 151-184). Place the synthesis-dependent classification logic within `{{#cli}}` conditionals, consistent with existing multi-model sections. For `{{#vscode}}`, smart mode degrades to `true` (interactive) behavior since single-model has no agreement signal
  - Smart mode logic: classify each synthesis finding using the heuristic matrix (agreement × severity × fix clarity), then execute in two phases: (1) batch auto-apply classified `auto-apply` findings, display summary, (2) present classified `interactive` findings one-at-a-time using existing interactive format
  - Define the classification heuristic inline: consensus + must-fix/should-fix → auto-apply; partial/single-model → interactive; consider (any agreement) → report-only. Consensus agreement in the synthesis implies models converged on the fix — no per-model cross-referencing needed
  - Add batch summary format and final summary format showing all finding dispositions

- **`skills/paw-planning-docs-review/SKILL.md`**:
  - Update config reading (line 29) to accept `true` | `false` | `smart`
  - Add `If Interactive = smart` branch in Step 5: Resolution (between current `true` and `false` branches, lines 155-194). Place within `{{#cli}}` conditionals. For `{{#vscode}}`, smart mode degrades to `true` (interactive) behavior
  - Same classification heuristic as final-review, with additional routing awareness: single-artifact consensus must-fix/should-fix findings are auto-routed to the appropriate skill (paw-spec or paw-planning); multi-artifact (`both`) must-fix/should-fix findings always pause for user routing decision; consider-severity findings are report-only regardless of artifact scope
  - Same batch/final summary format
  - Note: smart mode classification applies independently per re-review cycle (Step 6) since synthesis is regenerated from modified artifacts each cycle

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-planning-docs-review/SKILL.md`

#### Manual Verification:
- [ ] Smart mode branch is clearly distinct from `true` and `false` branches
- [ ] Classification heuristic is unambiguous — each finding maps to exactly one classification
- [ ] Existing `true`/`false` behavior is unchanged
- [ ] Batch summary of auto-applied findings is specified before interactive findings begin (SC-003)
- [ ] Final summary format covers all dispositions: auto-applied, user-applied, user-skipped, reported (SC-004, SC-005)
- [ ] Single-artifact consensus findings in planning-docs-review are auto-routed without user interaction (SC-006)
- [ ] `consider` findings are explicitly handled as report-only in smart mode
- [ ] Edge case: all findings auto-applicable → no interactive phase, batch summary only
- [ ] Edge case: single-model mode → smart degrades to fully interactive (no auto-apply)

---

## Phase 2: Configuration Chain

> Depends on Phase 1: consuming skills must recognize `smart` before the config chain pipes it.

### Changes Required:

- **`skills/paw-init/SKILL.md`**:
  - Update parameter table (lines 38, 42): change type from `boolean` to `true`, `false`, `smart` and default from `true` to `smart`
  - No template change needed — template uses placeholder `<final_review_interactive>` which will now resolve to `smart`

- **`skills/paw-status/SKILL.md`**:
  - Update display (line 48): add `smart` to valid values `true` | `false` | `smart`

- **`src/ui/userInput.ts`**:
  - Change `FinalReviewConfig.interactive` type from `boolean` to `boolean | 'smart'` (line 44)
  - VS Code quick pick (lines 441-455): keep existing "Interactive" and "Auto-Apply" options only. Do NOT add "Smart" — VS Code only supports single-model mode where smart degrades to interactive, making the option misleading. Smart is available via CLI paw-init only.

- **`src/commands/initializeWorkItem.ts`**:
  - Verify config passthrough (line 40) doesn't coerce `'smart'` to boolean — no change expected since value is passed directly to config object

- **`src/test/suite/userInput.test.ts`**:
  - Add test case for `interactive: 'smart'` value
  - Existing boolean test cases remain unchanged

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `npm run lint`
- [ ] Build passes: `npm run compile`
- [ ] Unit tests pass: `npm run test`
- [ ] Skill lint: `./scripts/lint-prompting.sh skills/paw-init/SKILL.md`
- [ ] Skill lint: `./scripts/lint-prompting.sh skills/paw-status/SKILL.md`

#### Manual Verification:
- [ ] New workflows would get `smart` as default interactive value
- [ ] Existing workflows with `true`/`false` continue to work

---

## Phase 3: Documentation

> Depends on Phase 1 and 2: document final behavior and configuration after implementation is stable.

### Changes Required:

- **`.paw/work/smart-interactive-mode/Docs.md`**: Technical reference (load `paw-docs-guidance`)

- **`docs/specification/implementation.md`** (line 172):
  - Update `Final Review Interactive` valid values to `true` | `false` | `smart` (default: smart)

- **`docs/guide/workflow-modes.md`** (line 157):
  - Update table: add `smart` to Options column, update Default to `smart`, update Description to cover all three modes

- **`docs/reference/artifacts.md`** (lines 59, 63):
  - Update both `Final Review Interactive` and `Planning Review Interactive` field values to include `smart`

### Success Criteria:
- [ ] Docs build: `source .venv/bin/activate && mkdocs build --strict`
- [ ] Content accurately describes smart mode behavior, heuristic, and configuration
- [ ] All three mode values documented consistently across all doc files

---

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/219
- Spec: `.paw/work/smart-interactive-mode/Spec.md`
- Research: `.paw/work/smart-interactive-mode/CodeResearch.md`
