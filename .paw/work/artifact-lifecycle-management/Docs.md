# Artifact Lifecycle Management

## Overview

Artifact Lifecycle Management replaces the binary `track_artifacts` toggle with a three-mode `artifact_lifecycle` setting that gives users fine-grained control over how PAW workflow artifacts (`.paw/work/<work-id>/`) are handled in git. The default `commit-and-clean` mode commits artifacts during development for visibility and then automatically removes them from the git index at final PR time, keeping `main` clean of workflow artifacts.

## Architecture and Design

### High-Level Architecture

The lifecycle setting flows through three layers:

1. **Configuration**: `paw-init` collects the mode and writes it to WorkflowContext.md's `Artifact Lifecycle:` field
2. **Runtime**: `paw-transition` detects the mode and communicates it to the orchestrator; `paw-git-operations` and `paw-impl-review` respect it during staging
3. **Finalization**: `paw-pr` executes stop-tracking for `commit-and-clean` before creating the final PR

### Design Decisions

**Three modes instead of two**: The original binary toggle conflated "commit during dev" with "commit permanently." The three-mode design separates the development-time decision (commit vs. don't) from the finalization decision (clean vs. persist), with `commit-and-clean` combining the best of both.

**Detection hierarchy**: WorkflowContext.md field → `.gitignore` with `*` fallback → default `commit-and-clean`. This provides backward compatibility with pre-lifecycle workflows that used `.gitignore` to indicate "don't track" and treats legacy workflows without any signal as `commit-and-clean`.

**Self-ignoring `.gitignore`**: The `*` pattern in `.paw/work/<work-id>/.gitignore` matches the `.gitignore` itself, preventing it from being accidentally staged. This is intentional—the `.gitignore` is purely a local sentinel, never committed.

**Identical staging during development**: `commit-and-clean` and `commit-and-persist` behave identically during development (both stage `.paw/` files). They only diverge at `paw-pr` time, simplifying the staging logic.

### Integration Points

- **`paw-init`**: Collects mode via VS Code QuickPick (three options, `commit-and-clean` pre-selected) or defaults silently in CLI
- **`paw-git-operations`**: Respects lifecycle mode during selective staging
- **`paw-transition`**: Detects and communicates mode with legacy mapping
- **`paw-impl-review`**: References staging discipline from `paw-git-operations`
- **`PAW.agent.md`**: Handles `artifact_lifecycle` field in transition responses
- **`paw-pr`**: Executes stop-tracking operation for `commit-and-clean`
- **VS Code stop-tracking command**: Updates WorkflowContext.md lifecycle field to `never-commit`

## User Guide

### Basic Usage

The default `commit-and-clean` mode requires no configuration. When initializing a workflow, either accept the default or select from the QuickPick:

- **Commit & Clean** (default): Artifacts visible during development, automatically cleaned at PR time
- **Commit & Persist**: Artifacts permanently committed to the repository
- **Never Commit**: Artifacts stay local only

### What Happens at PR Time

For `commit-and-clean` workflows, `paw-pr` automatically:

1. Records the current HEAD commit SHA
2. Removes artifacts from the git index (`git rm --cached -r`)
3. Creates a local `.gitignore` to prevent re-staging
4. Commits the removal
5. Links to artifacts at the recorded SHA in the PR description

The final PR diff against `main` shows zero `.paw/` file changes.

### Mid-Workflow Escape Hatch

Use **"PAW: Stop Tracking Artifacts"** to switch any tracked workflow to `never-commit`. This is useful when you realize mid-workflow that you don't want artifacts committed (e.g., contributing to a non-PAW repository).

### Cleanup Recipe

To remove old `.paw/work/` directories from `main` after merging `commit-and-persist` workflows:

```bash
git rm -r .paw/work/ && git commit -m "Remove PAW workflow artifacts"
```

## Configuration Options

| Mode | WorkflowContext.md Value | During Dev | At PR Time |
|------|------------------------|------------|------------|
| Commit & Clean | `commit-and-clean` | Stage `.paw/` files | Remove from index, link in PR |
| Commit & Persist | `commit-and-persist` | Stage `.paw/` files | Keep in repository |
| Never Commit | `never-commit` | Don't stage `.paw/` files | No action needed |

### Legacy Compatibility

| Legacy Value | Maps To |
|-------------|---------|
| `artifact_tracking: enabled` | `commit-and-clean` |
| `track_artifacts: true` | `commit-and-clean` |
| `artifact_tracking: disabled` | `never-commit` |
| `track_artifacts: false` | `never-commit` |

## Testing

### How to Test

1. **Commit-and-clean flow**: Initialize a workflow with default lifecycle, implement through to `paw-pr`, verify the final PR diff shows no `.paw/` changes and the PR description links to artifacts
2. **Commit-and-persist flow**: Initialize with `commit-and-persist`, verify artifacts remain in the repository after PR merge
3. **Never-commit flow**: Initialize with `never-commit`, verify no `.paw/` files appear in git status
4. **Legacy compatibility**: Open a workflow with `artifact_tracking: enabled` in WorkflowContext.md, verify agents treat it as `commit-and-clean`
5. **Mid-workflow stop-tracking**: Use the VS Code command on a tracked workflow, verify lifecycle field updates

### Edge Cases

- **Idempotent stop-tracking**: Running stop-tracking on an already-untracked workflow succeeds without error
- **Missing WorkflowContext.md field**: Falls back to `.gitignore` detection, then defaults to `commit-and-clean`
- **Stale `.gitignore`**: If `.gitignore` exists but WorkflowContext.md says `commit-and-persist`, the field takes precedence

## Limitations and Future Work

- **No migration script**: Existing workflows must be manually updated if desired (documented in the cleanup recipe above)
- **CLI mode**: Relies on `paw-init` skill defaults (no interactive picker); users must edit WorkflowContext.md to change modes
- **Review artifacts**: The `reviews/` subdirectory is always untracked via its own `.gitignore`, unaffected by lifecycle mode
