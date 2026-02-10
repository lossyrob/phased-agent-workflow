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
- [ ] **Phase 1: Core Review Skills** - Add smart mode resolution logic to paw-final-review and paw-planning-docs-review
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
  - Add `If Interactive = smart` branch in Step 5: Resolution (between current `true` and `false` branches, lines 151-184)
  - Smart mode logic: classify each synthesis finding using the heuristic matrix (agreement × severity × fix clarity), then execute in two phases: (1) batch auto-apply classified `auto-apply` findings, display summary, (2) present classified `interactive` findings one-at-a-time using existing interactive format
  - Define the classification heuristic inline: consensus + must-fix/should-fix + single clear proposed fix → auto-apply; consider → report-only; everything else → interactive
  - Define "fix clarity" criteria: when synthesis shows all agreeing models propose the same fix content, the fix is clear; if models disagree on the fix approach, it's unclear
  - Add batch summary format and final summary format showing all finding dispositions

- **`skills/paw-planning-docs-review/SKILL.md`**:
  - Update config reading (line 29) to accept `true` | `false` | `smart`
  - Add `If Interactive = smart` branch in Step 5: Resolution (between current `true` and `false` branches, lines 155-194)
  - Same classification heuristic as final-review, with additional routing awareness: single-artifact consensus findings are auto-routed to the appropriate skill (paw-spec or paw-planning); multi-artifact (`both`) findings always pause for user routing decision regardless of classification
  - Same batch/final summary format

### Success Criteria:

#### Automated Verification:
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-final-review/SKILL.md`
- [ ] Lint passes: `./scripts/lint-prompting.sh skills/paw-planning-docs-review/SKILL.md`

#### Manual Verification:
- [ ] Smart mode branch is clearly distinct from `true` and `false` branches
- [ ] Classification heuristic is unambiguous — each finding maps to exactly one classification
- [ ] Existing `true`/`false` behavior is unchanged
- [ ] `consider` findings are explicitly handled as report-only in smart mode

---

## Phase 2: Configuration Chain

### Changes Required:

- **`skills/paw-init/SKILL.md`**:
  - Update parameter table (lines 38, 42): change type from `boolean` to `true`, `false`, `smart` and default from `true` to `smart`
  - No template change needed — template uses placeholder `<final_review_interactive>` which will now resolve to `smart`

- **`skills/paw-status/SKILL.md`**:
  - Update display (line 48): add `smart` to valid values `true` | `false` | `smart`

- **`src/ui/userInput.ts`**:
  - Change `FinalReviewConfig.interactive` type from `boolean` to `boolean | 'smart'` (line 44)
  - Add "Smart (Recommended)" option to quick pick (lines 441-455) as the first/default item, with description explaining auto-apply consensus + pause for decisions
  - Keep existing "Interactive" and "Auto-Apply" options for backward compatibility

- **`src/commands/initializeWorkItem.ts`**:
  - Config passthrough (line 40) already passes value directly — should work with `'smart'` string. Verify no boolean coercion occurs.

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
