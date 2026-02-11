# Artifact Lifecycle Management Implementation Plan

## Overview

Replace the binary `artifact_tracking` toggle with a three-mode `artifact_lifecycle` setting (`commit-and-clean`, `commit-and-persist`, `never-commit`). The default `commit-and-clean` mode commits artifacts during development and automatically stop-tracks them at final PR time, keeping `main` clean.

## Current State Analysis

Artifact tracking is a scattered binary toggle with no explicit state field. Detection relies on checking for `.paw/work/<work-id>/.gitignore` containing `*`. Five skills independently implement this check. The VS Code extension presents a boolean Track/Don't Track picker. The project specification (`paw-specification.md`) doesn't mention artifact tracking at all.

Key gaps: no centralized lifecycle field in WorkflowContext.md, `paw-pr` doesn't perform any git operations for artifacts, and `paw-impl-review` commits without checking tracking state.

## Desired End State

- WorkflowContext.md has an explicit `Artifact Lifecycle` field with one of three values
- `paw-init` defaults to `commit-and-clean` silently (no prompt)
- During development, `commit-and-clean` and `commit-and-persist` behave identically (artifacts staged/committed)
- At `paw-pr` time, `commit-and-clean` runs stop-tracking (git rm --cached + local .gitignore) before PR creation
- Final PR description for `commit-and-clean` includes link to last commit with artifacts
- Legacy `artifact_tracking` / `.gitignore` detection works as fallback
- All five affected skills, the PAW agent, VS Code extension, docs, and specification updated

## What We're NOT Doing

- Migration script for cleaning old `.paw/work/` directories from `main`
- Self-healing cleanup of old artifact directories on new PRs
- "Start Tracking" reverse operation
- Changes to review artifact handling (already always untracked via own .gitignore)

## Phase Status
- [ ] **Phase 1: Core skill updates** - Update paw-init, paw-git-operations, paw-transition, paw-impl-review, and PAW agent for three-mode lifecycle
- [ ] **Phase 2: paw-pr stop-tracking** - Add stop-tracking operation and artifact links to paw-pr
- [ ] **Phase 3: VS Code extension** - Update init UI, initializeWorkItem, and stop-tracking command for lifecycle modes
- [ ] **Phase 4: Specification and documentation** - Update paw-specification.md, user guide, and reference docs
- [ ] **Phase 5: Documentation** - Create Docs.md and cleanup recipe

## Phase Candidates
- [ ] Integration tests for artifact lifecycle behavior (default mode at init, `commit-and-clean` stop-tracking at paw-pr, `never-commit` prevents staging, legacy backward compatibility)

---

## Phase 1: Core Skill Updates

Update the four skills and PAW agent that read/communicate artifact tracking state to use the new three-mode lifecycle model.

### Changes Required:

- **`skills/paw-init/SKILL.md`**:
  - Replace `track_artifacts` boolean parameter (line 32) with `artifact_lifecycle` string parameter, default `commit-and-clean`, accepting `commit-and-clean`, `commit-and-persist`, `never-commit`
  - Add `Artifact Lifecycle: <mode>` field to WorkflowContext.md template (between Remote and Artifact Paths, ~line 114)
  - Replace "Artifact Tracking" section (lines 133-135) with "Artifact Lifecycle" section: `commit-and-clean`/`commit-and-persist` → commit WorkflowContext.md; `never-commit` → create `.gitignore` with `*`
  - Update validation checklist (line 150) to reference lifecycle modes
  - **CLI note**: `cli/dist/` contains copies of skill/agent files and will be updated at release time. No CLI-specific code passes `track_artifacts` — CLI relies on the skill's default value.

- **`skills/paw-git-operations/SKILL.md`**:
  - Replace "PAW Artifact Staging" section (lines 84-99) with lifecycle-aware detection: first check WorkflowContext.md `Artifact Lifecycle` field, fall back to `.gitignore` for legacy. `commit-and-clean`/`commit-and-persist` → stage `.paw/` files; `never-commit` → skip
  - Update "Why" explanation (line 99) to reference lifecycle modes
  - Update Pre-Commit Checklist item #3 (line 122) to reference lifecycle check

- **`skills/paw-transition/SKILL.md`**:
  - Replace "Artifact Tracking Check" (lines 131-134) with lifecycle detection: check WorkflowContext.md field first, `.gitignore` fallback for legacy
  - Replace output field `artifact_tracking: [enabled | disabled]` (line 153) with `artifact_lifecycle: [commit-and-clean | commit-and-persist | never-commit]`

- **`skills/paw-impl-review/SKILL.md`**:
  - Add lifecycle-aware staging note near commit constraints (around line 103-105): when committing improvements, follow `paw-git-operations` staging discipline — check artifact lifecycle before staging `.paw/` files

- **`agents/PAW.agent.md`**:
  - Replace `artifact_tracking` reference (line 105) with `artifact_lifecycle`: pass to next activity (if `never-commit`, don't stage `.paw/` files)

### Success Criteria:

#### Automated Verification:
- [ ] Agent/skill lint passes: `npm run lint:agent:all`
- [ ] Prompting lint passes for each changed file: `./scripts/lint-prompting.sh <file>`

#### Manual Verification:
- [ ] All five files consistently use `artifact_lifecycle` terminology
- [ ] Detection hierarchy documented: WorkflowContext.md field → `.gitignore` fallback → default `commit-and-clean`
- [ ] Legacy backward compatibility mapping is described in each detection point
- [ ] `commit-and-clean` and `commit-and-persist` have identical staging behavior (both stage `.paw/` files)

---

## Phase 2: paw-pr Stop-Tracking

Add the `commit-and-clean` stop-tracking operation to `paw-pr` and update PR description generation.

### Changes Required:

- **`skills/paw-pr/SKILL.md`**:
  - Replace "Artifact Tracking Detection" section (lines 70-79) with "Artifact Lifecycle Handling" section that:
    - Detects lifecycle mode from WorkflowContext.md (with `.gitignore` fallback)
    - For `commit-and-clean`: describes the stop-tracking operation to execute before PR creation:
      1. Record the current HEAD commit SHA (this is the "last artifact commit")
      2. `git rm --cached -r .paw/work/<work-id>/` (remove from index, preserve local)
      3. Create `.paw/work/<work-id>/.gitignore` with `*` — this file self-ignores (the `*` pattern matches the `.gitignore` itself), so it cannot be accidentally staged
      4. `git commit -m "Stop tracking PAW artifacts for <work-id>"` — only the deletions from step 2 are committed
      5. Operation is idempotent — skip gracefully if no tracked `.paw/` files exist
    - For `commit-and-persist`: no stop-tracking, include artifact links in PR description (current behavior)
    - For `never-commit`: no stop-tracking, omit artifact section from PR description (current behavior)
  - Update PR description elements (line 99): for `commit-and-clean`, include a link to artifacts at the recorded last-artifact-commit SHA; for `commit-and-persist`, include direct artifact links; for `never-commit`, omit
  - Add a note that `paw-pr` should log what stop-tracking is doing (user awareness)

### Success Criteria:

#### Automated Verification:
- [ ] Prompting lint passes: `./scripts/lint-prompting.sh skills/paw-pr/SKILL.md`

#### Manual Verification:
- [ ] Stop-tracking operation matches the proven pattern from `src/prompts/stopTrackingArtifacts.template.md`
- [ ] Idempotency handling is explicit (what happens if already untracked)
- [ ] Artifact link generation for `commit-and-clean` is clear (uses pre-stop-tracking commit SHA)
- [ ] All three lifecycle modes have defined PR description behavior
- [ ] After stop-tracking, `git diff <base-branch>` shows zero `.paw/` file changes (validates SC-001)

---

## Phase 3: VS Code Extension

Update the VS Code extension UI and command handler for the new lifecycle modes.

### Changes Required:

- **`src/ui/userInput.ts`**:
  - Add `ArtifactLifecycle` type: `'commit-and-clean' | 'commit-and-persist' | 'never-commit'` (near existing type definitions)
  - Replace `trackArtifacts: boolean` field (line 82) with `artifactLifecycle: ArtifactLifecycle`
  - Replace `collectArtifactTracking()` function (lines 350-382) with `collectArtifactLifecycle()` returning `ArtifactLifecycle | undefined`. Three-option QuickPick:
    - "Commit & Clean" (default): description about artifacts committed during dev, cleaned at PR time
    - "Commit & Persist": description about artifacts permanently committed
    - "Never Commit": description about local-only artifacts
  - Update main flow (lines 565-567): call `collectArtifactLifecycle()` instead
  - Update return object (line 583): `artifactLifecycle` instead of `trackArtifacts`

- **`src/commands/initializeWorkItem.ts`**:
  - Update input interface (line 20): `artifactLifecycle: ArtifactLifecycle` instead of `trackArtifacts: boolean`
  - Update prompt arg (line 33): `artifact_lifecycle: inputs.artifactLifecycle`
  - Update log line (line 126): reference `artifactLifecycle`

- **`src/prompts/stopTrackingArtifacts.template.md`**:
  - Add instruction to update WorkflowContext.md's `Artifact Lifecycle` field to `never-commit` if the field exists (makes lifecycle change durable)

- **`src/commands/stopTrackingArtifacts.ts`**:
  - Update pre-check warning message (~line 116-129) to mention lifecycle mode context

- **`src/test/suite/userInput.test.ts`**:
  - Add test validating `ArtifactLifecycle` type values are the three expected modes
  - Add test verifying the exported type/constant covers all three lifecycle options

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript build passes: `npm run build`
- [ ] Code lint passes: `npm run lint`
- [ ] Unit tests pass: `npm run test` (if applicable in VS Code test runner)

#### Manual Verification:
- [ ] QuickPick shows three lifecycle options with clear descriptions
- [ ] Default selection is "Commit & Clean"
- [ ] Prompt arguments correctly pass `artifact_lifecycle` to agent
- [ ] Stop-tracking template instructs updating WorkflowContext.md lifecycle field

---

## Phase 4: Specification and Documentation

Update the specification and user-facing docs to reflect the new lifecycle model.

### Changes Required:

- **`paw-specification.md`**:
  - Add Artifact Lifecycle section covering: parameter definition with three modes, behavioral description for each mode during development and at PR time, the stop-tracking operation sequence, backward compatibility mapping table (`enabled` → `commit-and-clean`, `disabled` → `never-commit`), and interaction with VS Code stop-tracking command
  - Add `Artifact Lifecycle` to WorkflowContext.md parameters section (~lines 966-1003) with description, valid values, and default

- **`docs/guide/vscode-extension.md`**:
  - Update init flow parameter (line 21): replace "Artifact tracking: Track/Don't Track" with lifecycle mode selection
  - Update "Stop Tracking Artifacts" section (lines 59-80): explain it now switches lifecycle to `never-commit`, note that `commit-and-clean` handles cleanup automatically at PR time
  - Add manual cleanup recipe for bulk-removing old `.paw/work/` directories from `main` with `git rm -r .paw/work/`

- **`docs/reference/artifacts.md`**:
  - Add `Artifact Lifecycle` row to WorkflowContext.md field table (~lines 44-64)

### Success Criteria:

#### Automated Verification:
- [ ] Docs build passes: `source .venv/bin/activate && mkdocs build --strict`

#### Manual Verification:
- [ ] Specification accurately describes all three modes with clear behavioral differences
- [ ] Backward compatibility mapping is documented
- [ ] User guide reflects the new UI flow
- [ ] Reference docs include the new field

---

## Phase 5: Documentation

### Changes Required:
- **`.paw/work/artifact-lifecycle-management/Docs.md`**: Technical reference covering the implementation (load `paw-docs-guidance`)

### Success Criteria:
- [ ] Docs build passes: `source .venv/bin/activate && mkdocs build --strict`
- [ ] Content accurate and style consistent with project conventions

---

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/220
- Spec: `.paw/work/artifact-lifecycle-management/Spec.md`
- Research: `.paw/work/artifact-lifecycle-management/SpecResearch.md`, `.paw/work/artifact-lifecycle-management/CodeResearch.md`
