---
date: 2026-02-11T12:00:00-05:00
git_commit: a822909162b4b74780aba72945910568bb9dd650
branch: feature/artifact-lifecycle-management
repository: phased-agent-workflow
topic: "Artifact Lifecycle Management — Implementation Surface Area"
tags: [research, codebase, artifact-tracking, lifecycle, skills, extension]
status: complete
last_updated: 2026-02-11
---

# Research: Artifact Lifecycle Management

## Research Question

What are the exact file locations, line numbers, and implementation patterns for every component that must change to replace the binary `artifact_tracking` toggle with a three-mode `artifact_lifecycle` setting (`commit-and-clean`, `commit-and-persist`, `never-commit`)?

## Summary

The current artifact tracking implementation is a scattered binary toggle with no centralized state field. State is inferred by checking for `.paw/work/<work-id>/.gitignore` containing `*`. Five skills, one agent, four extension source files, one prompt template, one package.json command registration, and two documentation files need updates. The specification (`paw-specification.md`) has no mention of artifact tracking at all and needs a new section. The WorkflowContext.md template in `paw-init` has no explicit artifact lifecycle field — this must be added for the new three-mode system.

## Documentation System

- **Framework**: MkDocs with Material theme
- **Docs Directory**: `docs/`
- **Navigation Config**: `mkdocs.yml:61-76` (nav section)
- **Style Conventions**: Admonitions via `!!! note`, code blocks with copy, permalink anchors on headings, tabbed light/dark scheme
- **Build Command**: `source .venv/bin/activate && mkdocs build --strict`
- **Standard Files**: `README.md` (root), `DEVELOPING.md` (root), `docs/reference/artifacts.md`, `docs/guide/vscode-extension.md`

## Verification Commands

- **Test Command**: `npm run test:integration:skills` (fast, no LLM) / `npm run test:integration:workflows` (slow, LLM)
- **Lint Command**: `npm run lint` (code), `npm run lint:agent:all` (agents+skills), `./scripts/lint-prompting.sh <file>` (individual)
- **Build Command**: `npm run build`
- **Type Check**: `npm run build` (TypeScript compilation)

## Detailed Findings

### 1. paw-init Skill

**File**: `skills/paw-init/SKILL.md`

**Input parameter table** (`skills/paw-init/SKILL.md:32`):
```
| `track_artifacts` | No | `true` | boolean |
```
Current type is boolean with default `true`. Needs to become `artifact_lifecycle` with type string and default `commit-and-clean`, accepting `commit-and-clean`, `commit-and-persist`, `never-commit`.

**WorkflowContext.md template** (`skills/paw-init/SKILL.md:92-117`):
The template lists all configuration fields but does NOT include an artifact tracking/lifecycle field. The template ends at line 117 with:
```
Additional Inputs: none
```
A new `Artifact Lifecycle: <mode>` field must be added to the template between `Remote: origin` (line 114) and `Artifact Paths: auto-derived` (line 115), or at another logical position.

**Artifact Tracking section** (`skills/paw-init/SKILL.md:133-135`):
```markdown
### Artifact Tracking
- **If tracking enabled**: WorkflowContext.md committed with message `Initialize PAW workflow for <Work Title>`
- **If tracking disabled**: `.gitignore` with `*` created in work directory
```
Needs to become a three-way branch:
- `commit-and-clean`: Same as current "tracking enabled" — commit WorkflowContext.md
- `commit-and-persist`: Same as current "tracking enabled" — commit WorkflowContext.md
- `never-commit`: Same as current "tracking disabled" — create `.gitignore` with `*`, no commit

**Validation checklist** (`skills/paw-init/SKILL.md:150`):
```
- [ ] Artifacts committed (if tracking enabled)
```
Needs rewording to reference new lifecycle modes.

### 2. paw-git-operations Skill

**File**: `skills/paw-git-operations/SKILL.md`

**PAW Artifact Staging section** (`skills/paw-git-operations/SKILL.md:84-99`):
```markdown
### PAW Artifact Staging

Before staging `.paw/` files, check if artifact tracking is disabled:

```bash
# Check for .gitignore in work directory
if [ -f ".paw/work/<feature-slug>/.gitignore" ]; then
  # Tracking disabled - skip .paw/ artifacts
  git add <non-paw-files-only>
else
  # Tracking enabled - stage all changed files
  git add <all-changed-files>
fi
```
```
Lines 86-99: The entire detection and staging logic is binary. Needs to support three modes:
- `commit-and-clean`: Stage `.paw/` files (same as current "tracking enabled") — artifacts are committed during development
- `commit-and-persist`: Stage `.paw/` files (same behavior as `commit-and-clean` during development)
- `never-commit`: Skip `.paw/` files (same as current "tracking disabled")

Detection should first check WorkflowContext.md for the explicit `Artifact Lifecycle` field. Fall back to `.gitignore` detection only when the field is absent (backward compatibility).

**Explanation line** (`skills/paw-git-operations/SKILL.md:99`):
```
**Why**: Users can disable artifact tracking via `.gitignore`. Respect this by checking before staging `.paw/` files.
```
Needs rewording to reference lifecycle modes.

**Pre-Commit Checklist** (`skills/paw-git-operations/SKILL.md:122`):
```
3. ✓ Check `.paw/work/<slug>/.gitignore` before staging `.paw/` artifacts
```
Needs rewording to reference lifecycle mode check instead of just `.gitignore`.

### 3. paw-transition Skill

**File**: `skills/paw-transition/SKILL.md`

**Artifact Tracking Check** (`skills/paw-transition/SKILL.md:131-134`):
```markdown
**Artifact Tracking Check** (for all activities):
- Check if `.paw/work/<work-id>/.gitignore` exists
- If exists with `*` pattern: artifact_tracking = `disabled`
- Otherwise: artifact_tracking = `enabled`
```
Needs to become a lifecycle mode detection:
1. First check WorkflowContext.md for explicit `Artifact Lifecycle` field
2. Fall back to `.gitignore` detection for legacy contexts
3. Output the lifecycle mode instead of binary enabled/disabled

**Structured output field** (`skills/paw-transition/SKILL.md:153`):
```
- artifact_tracking: [enabled | disabled]
```
Needs to become:
```
- artifact_lifecycle: [commit-and-clean | commit-and-persist | never-commit]
```

### 4. paw-pr Skill

**File**: `skills/paw-pr/SKILL.md`

**Artifact Tracking Detection section** (`skills/paw-pr/SKILL.md:70-79`):
```markdown
## Artifact Tracking Detection

Check if workflow artifacts are tracked in git:
1. Check for `.paw/work/<work-id>/.gitignore`
2. If contains `*` → artifacts **untracked**
3. If no `.gitignore` → artifacts **tracked**

**Impact on PR Description**:
- Tracked: Include Artifacts section with links
- Untracked: Omit Artifacts section; summarize key information in body
```
This section needs significant expansion for the new feature:
- Rename to "Artifact Lifecycle Handling" or similar
- Add detection of lifecycle mode from WorkflowContext.md (with `.gitignore` fallback)
- Add `commit-and-clean` behavior: Execute stop-tracking operation before creating PR (FR-004)
- Add `commit-and-clean` PR description: Include link to last commit where artifacts were tracked (FR-006)
- `commit-and-persist`: Current "tracked" behavior (include artifact links)
- `never-commit`: Current "untracked" behavior (omit artifact links, summarize)

**PR Description Formats — Artifacts element** (`skills/paw-pr/SKILL.md:99`):
```
- Artifacts: Links to workflow artifacts (if tracked)
```
Needs conditional logic for lifecycle modes.

### 5. paw-impl-review Skill

**File**: `skills/paw-impl-review/SKILL.md`

**Gap**: This skill makes commits (`skills/paw-impl-review/SKILL.md:100-101`, `skills/paw-impl-review/SKILL.md:103`) for documentation additions and small refactors. It has NO artifact tracking awareness:
- No `.gitignore` check
- No WorkflowContext.md lifecycle field check
- No reference to avoiding `.paw/` file staging

Lines 98-103:
```markdown
**Allowed improvements**:
- Add docstrings to new functions/classes
- Add inline comments for complex logic
- Small refactors (remove unused parameters, simplify)
- **Do NOT modify core functional logic**

**Constraints**:
- Commit improvements with clear messages
```

The skill's constraint at line 105 says "Do NOT push or create PRs (orchestrator handles this)" — commits happen locally. If the review modifies `.paw/` files (e.g., checking off ImplementationPlan.md items), those modifications could be committed even when lifecycle is `never-commit`.

A lifecycle-aware staging note needs to be added near the commit constraints (around line 103-105), instructing the reviewer to follow `paw-git-operations` staging discipline when committing.

### 6. PAW Agent (Orchestrator)

**File**: `agents/PAW.agent.md`

**Transition response handling** (`agents/PAW.agent.md:105`):
```markdown
- `artifact_tracking`: Pass to next activity (if `disabled`, don't stage `.paw/` files)
```
Needs to become:
```markdown
- `artifact_lifecycle`: Pass to next activity (if `never-commit`, don't stage `.paw/` files)
```

The full transition response handling block is at `agents/PAW.agent.md:104-113`:
```markdown
- `pause_at_milestone`: If `true`, PAUSE and wait for user confirmation. ...
- `artifact_tracking`: Pass to next activity (if `disabled`, don't stage `.paw/` files)
- `preflight`: Report blocker if not `passed`
- `promotion_pending`: If `true` **and not paused**, run Candidate Promotion Flow (see below)
```

### 7. VS Code Extension — userInput.ts

**File**: `src/ui/userInput.ts`

**Type field** (`src/ui/userInput.ts:77-82`):
```typescript
/**
 * Whether to track workflow artifacts in git.
 * ...
 */
trackArtifacts: boolean;
```
Needs to become a string type with lifecycle mode values, e.g.:
```typescript
artifactLifecycle: 'commit-and-clean' | 'commit-and-persist' | 'never-commit';
```

**collectArtifactTracking function** (`src/ui/userInput.ts:350-382`):
The entire function presents a binary "Track" / "Don't Track" Quick Pick returning boolean. Needs replacement with a three-option picker:
- `commit-and-clean` (default): "Artifacts committed during development, cleaned from main at PR time"
- `commit-and-persist`: "Artifacts committed permanently (appear on main after merge)"
- `never-commit`: "Artifacts never committed to git (local only)"

Function signature at line 350-352:
```typescript
export async function collectArtifactTracking(
  outputChannel: vscode.OutputChannel
): Promise<boolean | undefined> {
```
Return type changes from `boolean | undefined` to `ArtifactLifecycle | undefined`.

**Main collection flow** (`src/ui/userInput.ts:565-567`):
```typescript
// Collect artifact tracking preference
const trackArtifacts = await collectArtifactTracking(outputChannel);
if (trackArtifacts === undefined) {
```
Variable name and function call need updating.

**Return object** (`src/ui/userInput.ts:577-586`):
```typescript
return {
    targetBranch: targetBranch.trim(),
    workflowMode,
    reviewStrategy,
    reviewPolicy,
    sessionPolicy,
    trackArtifacts,
    finalReview,
    issueUrl: issueUrl.trim() === '' ? undefined : issueUrl.trim()
};
```
`trackArtifacts` field becomes `artifactLifecycle`.

### 8. VS Code Extension — initializeWorkItem.ts

**File**: `src/commands/initializeWorkItem.ts`

**Input interface parameter** (`src/commands/initializeWorkItem.ts:20`):
```typescript
trackArtifacts: boolean;
```
Part of the `inputs` parameter destructured at line 13-23. Needs to become `artifactLifecycle: string`.

**Prompt argument construction** (`src/commands/initializeWorkItem.ts:33`):
```typescript
track_artifacts: inputs.trackArtifacts,
```
Needs to become:
```typescript
artifact_lifecycle: inputs.artifactLifecycle,
```

**Log line** (`src/commands/initializeWorkItem.ts:126`):
```typescript
outputChannel.appendLine(`[INFO] Track artifacts: ${inputs.trackArtifacts}`);
```
Needs updating to reference `artifactLifecycle`.

### 9. VS Code Extension — stopTrackingArtifacts.ts

**File**: `src/commands/stopTrackingArtifacts.ts` (174 lines)

This command remains available as a mid-workflow escape hatch (FR-013). The core logic doesn't need to change significantly — it already performs the stop-tracking operation correctly:
1. Scan work items (`src/commands/stopTrackingArtifacts.ts:87`)
2. QuickPick selection (`src/commands/stopTrackingArtifacts.ts:96-108`)
3. Pre-check for existing `.gitignore` (`src/commands/stopTrackingArtifacts.ts:116-129`)
4. Render prompt and delegate to agent (`src/commands/stopTrackingArtifacts.ts:132-149`)

Potential update at pre-check (`src/commands/stopTrackingArtifacts.ts:116-129`): The warning message says `"Artifacts for "${selection.slug}" are already excluded from git tracking."` — this could be enhanced to mention the lifecycle mode if WorkflowContext.md has an explicit field.

The command could also update WorkflowContext.md's `Artifact Lifecycle` field to `never-commit` after executing — but this may be better handled by the agent prompt template.

### 10. VS Code Extension — stopTrackingArtifacts.template.md

**File**: `src/prompts/stopTrackingArtifacts.template.md` (62 lines)

The template instructs the agent to:
1. `git rm --cached -r .paw/work/{{WORK_ID}}/` (line 30)
2. Create `.gitignore` with `*` (lines 39-40)
3. Commit removal (line 49)
4. Verify with `git status` (lines 57-59)

For lifecycle-awareness, the template should also instruct the agent to update WorkflowContext.md's `Artifact Lifecycle` field to `never-commit` (if the field exists). This makes the lifecycle change durable in the workflow context rather than only inferred from `.gitignore`.

### 11. VS Code Extension — extension.ts

**File**: `src/extension.ts`

**Import** (`src/extension.ts:6`):
```typescript
import { registerStopTrackingCommand } from './commands/stopTrackingArtifacts';
```

**Registration** (`src/extension.ts:70-71`):
```typescript
registerStopTrackingCommand(context, outputChannel);
outputChannel.appendLine('[INFO] Registered command: paw.stopTrackingArtifacts');
```

No changes needed — the command registration itself stays the same. The command name and registration are stable.

### 12. package.json — Command Registration

**File**: `package.json:50-54`:
```json
{
  "command": "paw.stopTrackingArtifacts",
  "title": "Stop Tracking Artifacts",
  "category": "PAW"
}
```

No changes needed to the command registration. The command title and ID remain the same since the "Stop Tracking" command continues to exist as an escape hatch (FR-013).

### 13. paw-specification.md — Missing Artifact Tracking Section

**File**: `paw-specification.md`

The specification has NO mention of artifact tracking as a configurable parameter. Relevant existing sections:

- Line 3: Mentions "durable artifacts" as a core concept
- Line 9: "Every stage produces durable Markdown artifacts committed to Git"
- Lines 966-1003: WorkflowContext.md parameter definitions — no tracking/lifecycle field listed
- Lines 998-999: `Artifact Paths` parameter exists but is about file locations, not tracking behavior

A new section needs to be added to the specification defining:
- The `Artifact Lifecycle` parameter and its three modes
- Default behavior (`commit-and-clean`)
- Stop-tracking operation mechanics
- Backward compatibility mapping from legacy values
- Where the field is stored (WorkflowContext.md)

The WorkflowContext.md parameters section (`paw-specification.md:974-1003`) needs a new `Artifact Lifecycle` parameter entry.

### 14. Documentation — VS Code Extension Guide

**File**: `docs/guide/vscode-extension.md`

**Init flow parameter list** (`docs/guide/vscode-extension.md:21`):
```markdown
    - **Artifact tracking**: Track (default) or Don't Track
```
Needs to become lifecycle mode selection with three options.

**Stop Tracking Artifacts section** (`docs/guide/vscode-extension.md:59-80`):
Full section describing the command, its usage, and when to use it. The section remains relevant but needs updates to mention it now changes lifecycle mode to `never-commit`, and to explain the new default `commit-and-clean` behavior where cleanup happens automatically at PR time.

### 15. Documentation — Artifacts Reference

**File**: `docs/reference/artifacts.md`

**WorkflowContext.md field table** (`docs/reference/artifacts.md:44-64`):
Lists all WorkflowContext.md fields. Missing any artifact tracking/lifecycle field. A new row for `Artifact Lifecycle` needs to be added:
```
| Artifact Lifecycle | `commit-and-clean`, `commit-and-persist`, or `never-commit` |
```

### 16. Skills That Do NOT Need Changes

**`skills/paw-final-review/SKILL.md`** (`skills/paw-final-review/SKILL.md:53`):
Creates `reviews/.gitignore` with `*` — this is for review artifacts which are ALWAYS untracked regardless of lifecycle mode. No change needed.

**`skills/paw-planning-docs-review/SKILL.md`** (`skills/paw-planning-docs-review/SKILL.md:57`):
Creates `reviews/.gitignore` with `*` — same as above. No change needed.

### 17. Existing Stop-Tracking Operation Pattern

The proven stop-tracking git sequence (from `src/prompts/stopTrackingArtifacts.template.md:28-59`):

```bash
# Step 1: Remove from git index (preserves local files)
git rm --cached -r .paw/work/<work-id>/

# Step 2: Create .gitignore to prevent re-tracking
echo "*" > .paw/work/<work-id>/.gitignore

# Step 3: Commit the removal (do NOT stage .gitignore)
git commit -m "Stop tracking PAW artifacts for <work-id>"

# Step 4: Verify
git status
```

The `.gitignore` with `*` ignores itself — so the entire work directory becomes invisible to git. This pattern will be reused by `paw-pr` for the `commit-and-clean` stop-tracking at PR time (FR-004).

### 18. Backward Compatibility Detection Pattern

Current detection used by `paw-transition`, `paw-git-operations`, and `paw-pr`:
```bash
if [ -f ".paw/work/<work-id>/.gitignore" ]; then
  # disabled
else
  # enabled
fi
```

New detection hierarchy (FR-007, FR-008):
1. Check WorkflowContext.md for `Artifact Lifecycle: <mode>` field → use explicit value
2. If field absent, check for `.gitignore` with `*` → map to `never-commit`
3. If no `.gitignore` and no field → map to `commit-and-clean` (preserves current default behavior)

Legacy mapping (FR-007):
- `artifact_tracking: enabled` or `track_artifacts: true` → `commit-and-clean`
- `artifact_tracking: disabled` or `track_artifacts: false` → `never-commit`

### 19. Integration Tests

**Directory**: `tests/integration/`

No existing tests reference `artifact_tracking`, `track_artifacts`, or `stopTracking`. The following test files exist and may need updates or new companion tests:

- `tests/integration/tests/workflows/full-local-workflow.test.ts` — Golden path test; may need a lifecycle mode assertion
- `tests/integration/tests/workflows/paw-spec.test.ts` — Spec creation
- `tests/integration/tests/workflows/git-branching.test.ts` — Git operations

New tests should validate:
- Default lifecycle mode applied during init
- `commit-and-clean` stop-tracking at `paw-pr` time
- `never-commit` prevents staging
- Legacy value backward compatibility

## Code References

- `skills/paw-init/SKILL.md:32` — `track_artifacts` parameter definition
- `skills/paw-init/SKILL.md:92-117` — WorkflowContext.md template (no lifecycle field)
- `skills/paw-init/SKILL.md:133-135` — Artifact Tracking section (binary if/else)
- `skills/paw-init/SKILL.md:150` — Validation checklist item
- `skills/paw-git-operations/SKILL.md:84-99` — PAW Artifact Staging section
- `skills/paw-git-operations/SKILL.md:122` — Pre-Commit Checklist item #3
- `skills/paw-transition/SKILL.md:131-134` — Artifact Tracking Check
- `skills/paw-transition/SKILL.md:153` — Output field `artifact_tracking`
- `skills/paw-pr/SKILL.md:70-79` — Artifact Tracking Detection section
- `skills/paw-pr/SKILL.md:99` — Artifacts element in PR description
- `skills/paw-impl-review/SKILL.md:98-105` — Commit constraints (no tracking check)
- `agents/PAW.agent.md:105` — Transition response: `artifact_tracking` field
- `src/ui/userInput.ts:77-82` — `trackArtifacts: boolean` field definition
- `src/ui/userInput.ts:350-382` — `collectArtifactTracking()` function
- `src/ui/userInput.ts:565-567` — Artifact tracking collection in flow
- `src/ui/userInput.ts:577-586` — Return object with `trackArtifacts`
- `src/commands/initializeWorkItem.ts:20` — `trackArtifacts: boolean` in inputs
- `src/commands/initializeWorkItem.ts:33` — `track_artifacts` prompt arg
- `src/commands/initializeWorkItem.ts:126` — Log line for track artifacts
- `src/commands/stopTrackingArtifacts.ts:80-155` — Main command handler
- `src/commands/stopTrackingArtifacts.ts:116-129` — Pre-check for existing `.gitignore`
- `src/prompts/stopTrackingArtifacts.template.md:1-62` — Agent prompt template
- `src/extension.ts:6` — Import of `registerStopTrackingCommand`
- `src/extension.ts:70-71` — Command registration
- `package.json:50-54` — Command registration for `paw.stopTrackingArtifacts`
- `docs/guide/vscode-extension.md:21` — Init flow artifact tracking mention
- `docs/guide/vscode-extension.md:59-80` — Stop Tracking Artifacts section
- `docs/reference/artifacts.md:44-64` — WorkflowContext.md field table
- `paw-specification.md:966-1003` — WorkflowContext.md parameter definitions
- `mkdocs.yml:61-76` — Documentation navigation structure

## Architecture Documentation

**Detection pattern**: All consumers independently check for `.gitignore` — there is no centralized state or shared utility function. Each skill contains its own detection logic inline.

**Commit-and-clean is a new behavior path**: No existing skill performs stop-tracking. The `paw-pr` skill currently only reads tracking state for PR description formatting. The `commit-and-clean` mode adds an active git operation (stop-tracking) to `paw-pr`'s responsibilities before PR creation.

**Agent prompt template as operation spec**: The stop-tracking git sequence is defined in `src/prompts/stopTrackingArtifacts.template.md`. For `paw-pr`'s built-in stop-tracking, the same operation pattern applies but is described in the skill prompt rather than a separate template.

**WorkflowContext.md as source of truth**: Adding an explicit `Artifact Lifecycle` field to WorkflowContext.md moves the system from filesystem-inferred state (`.gitignore` presence) to explicitly declared state. The `.gitignore` check becomes a fallback for legacy compatibility only.

## Open Questions

- None. All implementation locations and patterns have been identified.
