# Impl Reviewer Plan Drift

## Overview

This work makes plan/spec drift handling a first-class output of the implementation review stage and adds lightweight git workspace state to `paw_get_context`.

It has two main parts:

- **Reviewer plan alignment**: PAW-03B (Implementation Reviewer) now explicitly reports whether the implementation matches the approved plan (and spec when present), and applies a consistent drift policy.
- **Git context in `paw_get_context`**: The VS Code extension’s context tool now emits a `<git_context>` section so agents can reason about repository state and avoid “reviewing” a dirty, uncommitted working tree by accident.

## Architecture and Design

### `paw_get_context` output structure

`paw_get_context` returns multiple tagged sections (workspace/user instructions, workflow context, handoff instructions). This work adds:

- `<git_context>`: a best-effort, minimal git workspace summary.

The intent is to provide “just enough” git awareness to support commit-aware reasoning without introducing new tools, commands, or complex repo inspection.

### Git context computation

Git context is computed from the resolved workspace root (the workspace folder containing `.paw/work/<work-id>/`).

- Repo validation uses the existing git utilities in `src/git/validation.ts`.
- The overall design is **best-effort**: failures do not break context retrieval.

## Behavior

### PAW-03B: plan alignment and drift policy

PAW-03B review outputs now include a required **Plan alignment** subsection that:

- States whether the implementation is aligned with the approved `ImplementationPlan.md` (and `Spec.md` when present).
- If drift exists, classifies it using stable heuristics:
  - **Magnitude**: minor vs significant
  - **Intent**: likely intentional vs ambiguous

**Local strategy drift handling** (no phase PRs):

- **Minor + likely intentional drift** → update `.paw/work/<work-id>/ImplementationPlan.md` to match implemented reality, preserving history via an appended note with the date and relevant commit SHA(s).
- **Significant drift or ambiguous intent** → stop and request explicit user confirmation before updating plan/spec artifacts.

### `paw_get_context`: `<git_context>` section

`paw_get_context` now emits a `<git_context>` section alongside the other context sections.

Fields:

- `is_git_repo: true|false`
- `has_uncommitted_changes: true|false` (only when `is_git_repo` is true)
- `recommended_commands: git status --porcelain; git log --oneline -n 20` (only when `is_git_repo` is true and `has_uncommitted_changes` is available)

Failure behavior:

- If repo detection or status checks fail, `<git_context>` includes a `<warning>` message and the tool still returns the rest of the context.

## Edge cases and limitations

- Git context is intentionally minimal; it does not attempt to surface branch names, remotes, or commit SHAs.
- `has_uncommitted_changes` is omitted when the workspace is not detected as a git repo.
- The output is “advisory”: agents still need to run the recommended commands when they require specifics.

## Testing guide

### Automated

- Lint agent prompt changes:
  - `./scripts/lint-agent.sh agents/PAW-03B\ Impl\ Reviewer.agent.md`
- Run extension tests:
  - `npm test`

### Manual

- Invoke `paw_get_context` for any work item and confirm the response includes `<git_context>`.
- In a repo with local edits, verify `has_uncommitted_changes: true` is surfaced.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/147
- Work artifacts: `.paw/work/impl-reviewer-plan-drift/`
