# Feature Specification: Artifact Lifecycle Management

**Branch**: feature/artifact-lifecycle-management  |  **Created**: 2026-02-11  |  **Status**: Draft
**Input Brief**: Replace binary artifact tracking with a three-mode lifecycle setting that keeps feature branches useful during development while ensuring `main` stays clean after merge.

## Overview

PAW workflows produce Markdown artifacts (specs, plans, research docs, implementation context) stored in `.paw/work/<work-id>/` directories. These artifacts are valuable during active development — they provide PR review context, enable cross-clone workflows, and maintain workflow state. However, once a feature merges to `main`, these artifacts become noise: they pollute search results, create visual clutter, and accumulate across dozens of old work directories.

Today, artifact management is an all-or-nothing choice made at initialization time. Users either commit artifacts (and accept post-merge pollution) or never track them (and lose the during-development benefits). The current binary `track_artifacts` toggle forces a tradeoff that shouldn't be necessary.

Artifact lifecycle management introduces a three-mode setting that decouples the during-development and post-merge concerns. The default mode, `commit-and-clean`, gives users the best of both worlds: artifacts are committed to the feature branch for the full duration of development, then automatically removed from git tracking at final PR time. The result is a clean `main` branch with zero `.paw/` residue, while preserving full artifact visibility in branch history and intermediate PRs.

## Objectives

- Eliminate post-merge artifact pollution on `main` by default, without sacrificing during-development utility
- Provide a clear, intuitive lifecycle model that replaces the current binary toggle
- Automate artifact cleanup at the natural workflow boundary (final PR creation) so users don't need to think about it
- Maintain backward compatibility with existing workflows and artifact tracking states
- Preserve artifact accessibility in branch history and intermediate PRs for future reference

## User Scenarios & Testing

### User Story P1 – Clean Main After Merge

Narrative: A developer completes a feature using PAW. Throughout development, their spec, plan, and research artifacts were committed to the feature branch, visible in planning and phase PRs. When they create the final PR, artifacts are automatically removed from git tracking. After merge, `main` has no `.paw/work/` residue from this feature.

Independent Test: Create a final PR with `commit-and-clean` lifecycle and verify `.paw/` files are absent from the PR diff against `main`.

Acceptance Scenarios:
1. Given a workflow with `artifact_lifecycle: commit-and-clean`, When `paw-pr` creates the final PR, Then artifact files are removed from git index via `git rm --cached`, a local `.gitignore` prevents re-tracking, and the resulting PR diff contains no `.paw/` file additions.
2. Given a workflow with `commit-and-clean` where artifacts were committed across multiple prior commits, When stop-tracking executes, Then all previously committed `.paw/work/<work-id>/` files are removed from the index in a single operation.
3. Given stop-tracking has executed, When the user inspects their local filesystem, Then all artifact files still exist on disk (only removed from git, not deleted).

### User Story P2 – Artifact Links in Final PR

Narrative: A developer using `commit-and-clean` creates their final PR. Even though artifacts are cleaned from the branch, the PR description includes a link to the last commit where artifacts existed, so reviewers or future developers can easily find the spec, plan, and research docs.

Independent Test: Create a final PR with `commit-and-clean` and verify the PR description contains a link to the commit preceding the stop-tracking commit.

Acceptance Scenarios:
1. Given a `commit-and-clean` workflow completing `paw-pr`, When the PR description is generated, Then it includes a link to view artifacts at their last tracked commit.
2. Given a `commit-and-persist` workflow, When the PR description is generated, Then it includes direct links to the artifacts (existing behavior — artifacts still in the branch).

### User Story P3 – Seamless Default Experience

Narrative: A new user initializes a PAW workflow without thinking about artifact management. The default `commit-and-clean` mode is applied silently. Artifacts work normally throughout development — they're committed, visible in PRs, and available across clones. The cleanup happens automatically at the end with no user intervention.

Independent Test: Initialize a workflow without specifying lifecycle preference and verify `commit-and-clean` is applied without prompting.

Acceptance Scenarios:
1. Given a user running `paw-init` without specifying `artifact_lifecycle`, When initialization completes, Then WorkflowContext.md contains `Artifact Lifecycle: commit-and-clean` and artifacts are committed normally.
2. Given a user with `artifact_lifecycle: commit-and-clean`, When they work through spec, plan, and implementation stages, Then artifact staging behavior is identical to the current `track_artifacts: enabled` behavior (no mid-workflow differences).

### User Story P4 – Explicit Persist Mode

Narrative: A team wants to keep artifacts on `main` after merge — perhaps for regulatory compliance, audit trails, or institutional knowledge. They configure `commit-and-persist` and artifacts merge to `main` as they do today.

Independent Test: Complete a workflow with `commit-and-persist` and verify artifacts remain in the final PR diff.

Acceptance Scenarios:
1. Given `artifact_lifecycle: commit-and-persist`, When `paw-pr` creates the final PR, Then no stop-tracking operation is performed and `.paw/` artifacts appear in the PR diff.

### User Story P5 – Never Commit Mode

Narrative: A developer contributing to a repository where PAW artifacts shouldn't appear in git at all configures `never-commit`. Artifacts exist only locally and are never staged or committed.

Independent Test: Initialize with `never-commit` and verify no `.paw/` files are staged during the workflow.

Acceptance Scenarios:
1. Given `artifact_lifecycle: never-commit`, When `paw-init` completes, Then a `.gitignore` with `*` is created in the work directory and WorkflowContext.md is not committed.
2. Given `artifact_lifecycle: never-commit`, When any workflow stage commits changes, Then no `.paw/` files are included in the commit.

### User Story P6 – Backward Compatibility

Narrative: An existing workflow was initialized with the old `track_artifacts` boolean or `artifact_tracking: enabled/disabled`. The system recognizes the legacy values and maps them to the new lifecycle modes without breaking the workflow.

Independent Test: Load a WorkflowContext.md with legacy `artifact_tracking: enabled` and verify it behaves as `commit-and-clean`.

Acceptance Scenarios:
1. Given a WorkflowContext.md with `artifact_tracking: enabled` (no `Artifact Lifecycle` field), When any skill reads artifact lifecycle state, Then it is interpreted as `commit-and-clean`.
2. Given a WorkflowContext.md with `artifact_tracking: disabled`, When any skill reads artifact lifecycle state, Then it is interpreted as `never-commit`.
3. Given a WorkflowContext.md with `.gitignore` containing `*` in the work directory but no explicit lifecycle field, When any skill reads artifact lifecycle state, Then it is interpreted as `never-commit`.

### Edge Cases

- **Lifecycle field missing entirely (legacy)**: Fall back to `.gitignore` detection (current behavior) — `.gitignore` present → `never-commit`, absent → `commit-and-clean`
- **Stop-tracking already performed mid-workflow**: If a user manually ran "Stop Tracking Artifacts" before `paw-pr`, the stop-tracking step is idempotent and skips gracefully
- **No artifacts to clean**: If the work directory has no tracked files (e.g., all were already untracked), the stop-tracking operation succeeds as a no-op
- **Concurrent changes**: If user has uncommitted changes to `.paw/` files at PR time, stop-tracking preserves local files on disk — only the git index is modified via `git rm --cached`

## Requirements

### Functional Requirements

- FR-001: Replace the `track_artifacts` boolean with a three-mode `artifact_lifecycle` setting accepting values `commit-and-clean`, `commit-and-persist`, and `never-commit` (Stories: P3, P4, P5)
- FR-002: Default `artifact_lifecycle` to `commit-and-clean` in `paw-init` without requiring explicit user choice — the skill default handles CLI mode; VS Code pre-selects `commit-and-clean` in its picker so users can accept with Enter (Stories: P3)
- FR-003: Store `Artifact Lifecycle` as an explicit field in WorkflowContext.md (replacing the implicit `.gitignore`-based detection for new workflows) (Stories: P3, P4, P5)
- FR-004: At `paw-pr` time for `commit-and-clean` mode, execute stop-tracking: remove `.paw/work/<work-id>/` from git index with `git rm --cached -r` and commit the removal; then create a local `.gitignore` with `*` that remains untracked to prevent re-staging (Stories: P1)
- FR-005: The `.gitignore` file created during stop-tracking must NOT be added to git — it exists only locally, preventing `git add` from re-tracking artifacts (Stories: P1)
- FR-006: In the final PR description for `commit-and-clean` mode, include a link to the last commit where artifacts were tracked (Stories: P2)
- FR-007: Map legacy `artifact_tracking: enabled` (or `track_artifacts: true`) to `commit-and-clean` behavior, and `artifact_tracking: disabled` (or `track_artifacts: false`) to `never-commit` behavior (Stories: P6)
- FR-008: Maintain `.gitignore`-based detection as a fallback for WorkflowContexts without an explicit `Artifact Lifecycle` field (Stories: P6)
- FR-009: Update all artifact staging logic in `paw-git-operations` to respect the three lifecycle modes (Stories: P1, P4, P5)
- FR-010: Update `paw-transition` to detect and communicate lifecycle mode (replacing binary `artifact_tracking` output) (Stories: P1, P4, P5)
- FR-011: Update `paw-pr` to conditionally perform stop-tracking based on lifecycle mode (Stories: P1, P4)
- FR-012: Update the VS Code extension `paw-init` UI to replace the Track/Don't Track picker with lifecycle mode selection (Stories: P3, P4, P5)
- FR-013: Update the VS Code "Stop Tracking Artifacts" command to be lifecycle-aware — it remains available as a mid-workflow escape hatch for switching from `commit-and-clean` or `commit-and-persist` to `never-commit` (Stories: P5)
- FR-014: The stop-tracking operation in `paw-pr` must be idempotent — if artifacts are already untracked, the operation succeeds without error (Stories: P1)
- FR-015: Update `paw-impl-review` to respect artifact lifecycle state — when committing changes, do not stage `.paw/` files if lifecycle is `never-commit` (delegate staging to `paw-git-operations` patterns) (Stories: P1, P4, P5)

### Key Entities

- **Artifact Lifecycle Mode**: One of `commit-and-clean`, `commit-and-persist`, `never-commit` — determines how workflow artifacts are handled across the git lifecycle
- **Stop-Tracking Operation**: The git sequence that removes artifacts from the index while preserving local files — `git rm --cached -r` + local `.gitignore` creation (not committed)

### Cross-Cutting / Non-Functional

- Stop-tracking operation must complete in under 5 seconds for work directories with up to 50 artifact files
- Backward compatibility must be maintained for all existing WorkflowContext.md files without requiring migration

## Success Criteria

- SC-001: A workflow using the default lifecycle (`commit-and-clean`) produces a final PR with zero `.paw/` file changes in the diff against `main` (FR-004, FR-005)
- SC-002: The final PR description for `commit-and-clean` workflows includes a navigable link to artifacts at their last tracked commit (FR-006)
- SC-003: `paw-init` applies `commit-and-clean` as the default without prompting, and the mode is stored as an explicit field in WorkflowContext.md (FR-002, FR-003)
- SC-004: Existing workflows with legacy `artifact_tracking` values continue to function without modification (FR-007, FR-008)
- SC-005: All five affected skills (`paw-init`, `paw-git-operations`, `paw-transition`, `paw-pr`, `paw-impl-review`) correctly respect the three lifecycle modes (FR-009, FR-010, FR-011, FR-015)
- SC-006: The VS Code extension UI reflects the new lifecycle modes in both init and stop-tracking flows (FR-012, FR-013)

## Assumptions

- The `.gitignore` containing `*` pattern ignoring itself is reliable across all supported git versions (verified in existing stop-tracking implementation)
- Users who need `commit-and-persist` or `never-commit` can select it in the VS Code picker or edit WorkflowContext.md; CLI users rely on the skill default or custom instructions
- The stop-tracking commit as part of `paw-pr` is acceptable as a separate commit on the feature branch (not squashed into the PR commit)
- Review artifacts (in `.paw/work/<work-id>/reviews/`) are already always untracked via their own `.gitignore` — this behavior is unchanged

## Scope

In Scope:
- Three-mode `artifact_lifecycle` setting with `commit-and-clean` default
- Automatic stop-tracking at `paw-pr` time for `commit-and-clean`
- Artifact commit link in final PR description for `commit-and-clean`
- Backward compatibility mapping for legacy `artifact_tracking` values
- Updates to all affected skills (paw-init, paw-git-operations, paw-transition, paw-pr, paw-impl-review)
- Updates to PAW agent orchestrator
- VS Code extension UI updates (init picker, stop-tracking command)
- Documentation updates (specification, user guide, reference)
- Manual cleanup recipe documentation for existing repos

Out of Scope:
- Automated migration script for cleaning old `.paw/work/` directories from `main`
- Self-healing cleanup of old artifact directories when a new PR is created
- "Start Tracking" reverse operation (re-enabling tracking after stopping)
- Changes to review artifact handling (already always untracked)

## Dependencies

- Existing stop-tracking implementation in `src/prompts/stopTrackingArtifacts.template.md` (provides proven git operations pattern)
- VS Code extension build and publish pipeline

## Risks & Mitigations

- **Stop-tracking fails mid-operation**: If `git rm --cached` succeeds but the commit fails, artifacts are in an inconsistent state. Mitigation: The operation is idempotent and can be re-run; `paw-pr` should detect partial state and retry.
- **Legacy detection ambiguity**: A work directory might have a `.gitignore` from manual intervention unrelated to artifact tracking. Mitigation: Prefer the explicit `Artifact Lifecycle` field in WorkflowContext.md; fall back to `.gitignore` detection only when the field is absent.
- **User surprise at automatic cleanup**: Users unfamiliar with the feature might be surprised when artifacts disappear from git at PR time. Mitigation: `paw-pr` should log a clear message about what stop-tracking is doing and why, and the PR description explains where artifacts can be found.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/220
- Research: .paw/work/artifact-lifecycle-management/SpecResearch.md
