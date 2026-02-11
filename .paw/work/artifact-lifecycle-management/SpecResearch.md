# Spec Research: Artifact Lifecycle Management

## Findings

### Q1: How does `paw-init` currently handle the `artifact_tracking` parameter?

The `paw-init` skill accepts a `track_artifacts` boolean parameter (default: `true`) via its input parameters table (`skills/paw-init/SKILL.md:32`).

**Code paths that differ between enabled and disabled:**

1. **If tracking enabled** (`skills/paw-init/SKILL.md:134`): WorkflowContext.md is committed with message `Initialize PAW workflow for <Work Title>`.
2. **If tracking disabled** (`skills/paw-init/SKILL.md:135`): A `.gitignore` file with content `*` is created in the work directory (`.paw/work/<work-id>/.gitignore`). No commit is made of WorkflowContext.md.

**WorkflowContext.md template** (`skills/paw-init/SKILL.md:92-117`): The template does **NOT** include an explicit `Artifact Tracking:` field. The tracking state is inferred at runtime by checking for the existence of `.paw/work/<work-id>/.gitignore` — this is the detection mechanism used by `paw-transition` and `paw-pr`. The actual WorkflowContext.md for the current work item (`WorkflowContext.md:1-24`) confirms no tracking field is present.

**VS Code extension flow** (`src/ui/userInput.ts:350-382`): The `collectArtifactTracking()` function presents a Quick Pick with "Track" (default) and "Don't Track" options. The boolean result is passed via `src/commands/initializeWorkItem.ts:33` as `track_artifacts` in the prompt arguments sent to the PAW agent.

### Q2: How does `paw-pr` (final PR creation) handle artifacts?

The `paw-pr` skill (`skills/paw-pr/SKILL.md`) has an explicit **Artifact Tracking Detection** section (`skills/paw-pr/SKILL.md:70-79`):

1. Checks for `.paw/work/<work-id>/.gitignore` (`skills/paw-pr/SKILL.md:73`)
2. If contains `*` → artifacts **untracked** (`skills/paw-pr/SKILL.md:74`)
3. If no `.gitignore` → artifacts **tracked** (`skills/paw-pr/SKILL.md:75`)

**Impact on PR Description** (`skills/paw-pr/SKILL.md:78-79`):
- **Tracked**: Include an Artifacts section with links to workflow artifacts in the PR description
- **Untracked**: Omit Artifacts section; summarize key information in the PR body instead

`paw-pr` does **not** perform any git operations related to `.paw/work/` files itself — it only reads the tracking state to decide what to include in the PR description. Pre-flight checks verify artifact existence (`skills/paw-pr/SKILL.md:36-39`) but don't stage or commit anything.

### Q3: How does `paw-git-operations` handle artifact staging?

The `paw-git-operations` skill (`skills/paw-git-operations/SKILL.md`) has a dedicated **PAW Artifact Staging** section (`skills/paw-git-operations/SKILL.md:86-99`):

**Detection mechanism** (`skills/paw-git-operations/SKILL.md:90-98`):
```bash
if [ -f ".paw/work/<feature-slug>/.gitignore" ]; then
  # Tracking disabled - skip .paw/ artifacts
  git add <non-paw-files-only>
else
  # Tracking enabled - stage all changed files
  git add <all-changed-files>
fi
```

**Key rules:**
- **CRITICAL**: Never use `git add .` or `git add -A` — always stage files explicitly (`skills/paw-git-operations/SKILL.md:72`)
- Before staging `.paw/` files, always check if artifact tracking is disabled (`skills/paw-git-operations/SKILL.md:86-87`)
- Pre-commit checklist item #3: Check `.paw/work/<slug>/.gitignore` before staging `.paw/` artifacts (`skills/paw-git-operations/SKILL.md:122`)

The logic is purely binary: if `.gitignore` exists → skip all `.paw/` files; otherwise → stage everything including `.paw/` files.

### Q4: How does the VS Code extension's "Stop Tracking Artifacts" command work?

The command is registered in `src/extension.ts:6` (import) and `src/extension.ts:71` (logging), with the handler at `src/commands/stopTrackingArtifacts.ts`.

**Flow** (`src/commands/stopTrackingArtifacts.ts:80-155`):

1. **Scan work items**: Calls `scanWorkItems()` to find `.paw/work/` directories (`src/commands/stopTrackingArtifacts.ts:87`)
2. **QuickPick selection**: Presents work items sorted by most recently modified (`src/commands/stopTrackingArtifacts.ts:96-108`)
3. **Pre-check**: If `.gitignore` already exists in the work directory, shows warning and returns (`src/commands/stopTrackingArtifacts.ts:116-129`)
4. **Render prompt**: Uses `stopTrackingArtifacts.template.md` with `WORK_ID` and `WORK_DIR` variables (`src/commands/stopTrackingArtifacts.ts:132-135`)
5. **Delegate to agent**: Opens a new chat session and sends the prompt to an agent (`src/commands/stopTrackingArtifacts.ts:142-149`)

**Agent prompt template** (`src/prompts/stopTrackingArtifacts.template.md:1-62`):

The agent is instructed to perform these git operations:

1. **Untrack existing artifacts**: `git rm --cached -r .paw/work/{{WORK_ID}}/` (removes from git index, preserves local files) (`src/prompts/stopTrackingArtifacts.template.md:30`)
2. **Create .gitignore**: Creates `.paw/work/{{WORK_ID}}/.gitignore` with content `*` (`src/prompts/stopTrackingArtifacts.template.md:39-40`)
3. **Commit removal**: `git commit -m "Stop tracking PAW artifacts for {{WORK_ID}}"` — only the deletions, NOT the `.gitignore` (`src/prompts/stopTrackingArtifacts.template.md:49`)
4. **Verify**: Run `git status` to confirm artifacts are untracked (`src/prompts/stopTrackingArtifacts.template.md:57-59`)

**Important detail**: The `.gitignore` file containing `*` ignores itself — so the `.gitignore` is also untracked. The entire workflow directory stays completely out of the repository.

The command is registered in `package.json:51` as `paw.stopTrackingArtifacts` with title "Stop Tracking Artifacts" under category "PAW".

**No reverse operation exists** — there is no "Start Tracking Artifacts" command to re-enable tracking after it's been stopped.

### Q5: Full surface area of `artifact_tracking` references

**Agents:**
- `agents/PAW.agent.md:105` — Transition response handling: `artifact_tracking: Pass to next activity (if disabled, don't stage .paw/ files)`

**Skills:**
- `skills/paw-init/SKILL.md:32` — Input parameter `track_artifacts` (boolean, default true)
- `skills/paw-init/SKILL.md:133-135` — Artifact Tracking section (commit vs .gitignore behavior)
- `skills/paw-init/SKILL.md:150` — Validation checklist: "Artifacts committed (if tracking enabled)"
- `skills/paw-git-operations/SKILL.md:86-99` — PAW Artifact Staging section (check .gitignore before staging)
- `skills/paw-git-operations/SKILL.md:122` — Pre-Commit Checklist item #3
- `skills/paw-transition/SKILL.md:131-134` — Artifact Tracking Check (detects enabled/disabled via .gitignore)
- `skills/paw-transition/SKILL.md:153` — Completion output field: `artifact_tracking: [enabled | disabled]`
- `skills/paw-pr/SKILL.md:70-79` — Artifact Tracking Detection section
- `skills/paw-final-review/SKILL.md:53` — Creates `reviews/.gitignore` with `*` (always, regardless of tracking)
- `skills/paw-planning-docs-review/SKILL.md:57` — Creates `reviews/.gitignore` with `*` (always, regardless of tracking)

**Extension source code:**
- `src/ui/userInput.ts:77-82` — `trackArtifacts: boolean` field definition
- `src/ui/userInput.ts:350-382` — `collectArtifactTracking()` function (QuickPick UI)
- `src/ui/userInput.ts:565-567` — Artifact tracking collection in main input flow
- `src/commands/initializeWorkItem.ts:20` — `trackArtifacts: boolean` in inputs interface
- `src/commands/initializeWorkItem.ts:33` — Passes `track_artifacts` to prompt args
- `src/commands/initializeWorkItem.ts:126` — Logs track artifacts value
- `src/commands/stopTrackingArtifacts.ts` — Entire file (174 lines) — stop tracking command
- `src/prompts/stopTrackingArtifacts.template.md` — Entire file (62 lines) — agent prompt
- `src/extension.ts:6` — Import of `registerStopTrackingCommand`
- `src/extension.ts:71` — Registration logging
- `package.json:51-54` — Command registration for `paw.stopTrackingArtifacts`

**Documentation:**
- `docs/guide/vscode-extension.md:21` — Mentions "Artifact tracking" in init flow
- `docs/guide/vscode-extension.md:59-80` — "PAW: Stop Tracking Artifacts" command docs

**Specification:**
- `paw-specification.md` — No explicit mention of `artifact_tracking` as a setting. References "artifacts" extensively but as a general concept (durable Markdown files committed to Git), not as a configurable tracking mode.

**Tests:**
- No test files reference `artifact_tracking`, `track_artifact`, or `stopTracking`.

### Q6: How does `paw-transition` handle artifact tracking?

The `paw-transition` skill (`skills/paw-transition/SKILL.md`) handles artifact tracking in **Step 4: Preflight Checks** (`skills/paw-transition/SKILL.md:130-135`):

**Detection** (`skills/paw-transition/SKILL.md:131-134`):
- Checks if `.paw/work/<work-id>/.gitignore` exists
- If exists with `*` pattern → `artifact_tracking = disabled`
- Otherwise → `artifact_tracking = enabled`

This check is performed **for all activities** (not just specific ones) (`skills/paw-transition/SKILL.md:131`).

**Communication** (`skills/paw-transition/SKILL.md:147-158`): The structured output includes `artifact_tracking: [enabled | disabled]` (`skills/paw-transition/SKILL.md:153`).

**Consumption by PAW agent** (`agents/PAW.agent.md:105`): The PAW orchestrator receives this value and passes it to the next activity — specifically, if `disabled`, it instructs the next activity to not stage `.paw/` files.

**Key insight**: `paw-transition` is the **relay point** — it detects the current tracking state and passes it forward. It does not itself modify tracking state or perform any git operations related to tracking.

### Q7: How does `paw-impl-review` handle artifacts?

The `paw-impl-review` skill (`skills/paw-impl-review/SKILL.md`) does **not** reference artifact tracking, `.gitignore`, or `.paw/` staging at all.

**What it does with commits** (`skills/paw-impl-review/SKILL.md:100-101`):
- Makes commits for documentation additions (docstrings, comments) and small refactors
- Commits are local only — it does NOT push or create PRs (`skills/paw-impl-review/SKILL.md:109`, `skills/paw-impl-review/SKILL.md:136`)

**Key constraint** (`skills/paw-impl-review/SKILL.md:154`): "The PAW orchestrator will handle push/PR creation (via `paw-git-operations`) and then invoke `paw-transition`. This skill does NOT push or create PRs—it only returns the verdict."

**Implication**: `paw-impl-review` commits changes but does not handle any artifact staging logic. The artifact tracking check happens later when `paw-git-operations` stages and pushes, and when `paw-transition` does its preflight checks. However, if `paw-impl-review` commits `.paw/` files as part of its review (e.g., updating ImplementationPlan.md checkboxes), it doesn't check tracking state first — this is a potential gap where `.paw/` files could be committed even when tracking is disabled.

### Q8: What does the specification and user-facing docs say about artifact tracking?

**Specification** (`paw-specification.md`):

The specification does **not** define `artifact_tracking` as a configurable parameter. It mentions artifacts extensively as a core concept:
- Line 3: "Each phase produces durable artifacts that accumulate context"
- Line 9: "Every stage produces durable Markdown artifacts committed to Git"
- Line 204: Work ID defined as "Normalized, filesystem-safe identifier for workflow artifacts"
- Lines 966-1006: WorkflowContext.md parameter definitions — no tracking field listed

The specification implicitly assumes artifacts are always tracked (committed to git). There is no mention of `.gitignore`-based exclusion or a tracking toggle in the specification.

**User-facing documentation** (`docs/guide/vscode-extension.md`):

- Line 21: Lists "Artifact tracking: Track (default) or Don't Track" as an init parameter
- Lines 59-80: Full section on "PAW: Stop Tracking Artifacts" command with usage instructions and use cases:
  - Contributing to non-PAW repositories
  - Small changes where artifact overhead is disproportionate
  - Mid-workflow discovery that tracking isn't needed

**Gap**: The specification and user docs are misaligned — docs describe the feature but the spec doesn't define it. The actual behavior is entirely implemented in skills and extension code without specification backing.

## Summary

**Current artifact tracking is a simple binary toggle** with these characteristics:

1. **Storage mechanism**: No explicit field in WorkflowContext.md. State is inferred from the presence of `.paw/work/<work-id>/.gitignore` containing `*`.

2. **Init-time decision**: Set via `track_artifacts` boolean in `paw-init` (default: `true`). Extension UI offers "Track" / "Don't Track" Quick Pick.

3. **Mid-workflow toggle**: The "Stop Tracking Artifacts" VS Code command can disable tracking after init. There is **no reverse operation** to re-enable tracking.

4. **Detection pattern**: Every consumer checks for `.gitignore` independently — `paw-transition` (Step 4), `paw-git-operations` (staging), `paw-pr` (PR description). This is a scattered detection pattern with no centralized state.

5. **Behavioral impact**:
   - **Tracked (no .gitignore)**: All `.paw/` files staged and committed; PR descriptions include artifact links
   - **Untracked (.gitignore with `*`)**: `.paw/` files skipped during staging; PR descriptions summarize instead of linking; `.gitignore` ignores itself so the entire directory is invisible to git

6. **Review artifacts are always untracked**: `paw-final-review` and `paw-planning-docs-review` always create `reviews/.gitignore` with `*`, regardless of the main tracking setting.

7. **Gaps identified**:
   - `paw-impl-review` commits without checking tracking state (potential for `.paw/` files to be committed when disabled)
   - No explicit tracking field in WorkflowContext.md — state is inferred from filesystem
   - Specification doesn't document the tracking feature at all
   - No test coverage for artifact tracking behavior
   - One-directional only (can stop tracking, cannot restart)

**Surface area for the new three-mode `artifact_lifecycle` setting**: 5 skills (`paw-init`, `paw-git-operations`, `paw-transition`, `paw-pr`, `paw-impl-review`), 1 agent (`PAW.agent.md`), 4 extension source files (`userInput.ts`, `initializeWorkItem.ts`, `stopTrackingArtifacts.ts`, `extension.ts`), 1 prompt template, 2 doc files, and the specification itself.
