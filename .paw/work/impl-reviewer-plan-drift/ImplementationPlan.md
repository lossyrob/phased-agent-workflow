# Impl Reviewer Plan Drift Implementation Plan

## Overview

Make plan/spec drift detection a first-class output of the PAW-03B Implementation Reviewer. Every implementation review should explicitly state whether the implementation is aligned with the approved plan (and spec, when present), and should handle drift consistently:

- Minor + clearly intentional drift → update `ImplementationPlan.md` to match implemented reality (preserving history).
- Significant or ambiguous drift → stop and request user confirmation before rewriting plan/spec intent.

This work intentionally leverages existing PAW conventions:
- Git context via `git diff` / `git log` instructions already present in agent prompts.
- Existing git utilities in `src/git/validation.ts` for repo/dirty checks.

## Current State Analysis

- PAW-03B already instructs “Compare against `ImplementationPlan.md` requirements” during review, but it does not require an explicit, standardized “Plan alignment” output section. (See the “Read implementation changes” step in `agents/PAW-03B Impl Reviewer.agent.md`.)
- The required PR summary format for PAW-03B review-comment follow-up is a single comment starting with `**🐾 Implementation Reviewer 🤖:**` and containing exactly two major sections (detailed comment tracking + overall summary). Any “Plan alignment” addition must fit this constraint rather than introducing a third top-level section. (See the “Post comprehensive summary comment” instructions in `agents/PAW-03B Impl Reviewer.agent.md`.)
- `paw_get_context` (implemented by `src/tools/contextTool.ts`) provides instruction files and raw `WorkflowContext.md`, but does not currently surface basic git workspace state (repo validity, dirty working tree).
- Existing git helpers are available in `src/git/validation.ts`:
  - `validateGitRepository(workspacePath)`
  - `hasUncommittedChanges(workspacePath)` (currently noted as implemented but not integrated)

## Desired End State

### Behavior
- PAW-03B always produces an explicit “Plan alignment” subsection in its review output.
- PAW-03B uses commit/diff context to classify drift as:
  - **Magnitude**: minor vs significant
  - **Intent**: likely intentional vs ambiguous
- Drift handling is consistent across strategies, with explicit additional rules for **local** strategy:
  - Minor + intentional drift: reviewer updates `ImplementationPlan.md` directly and commits the change.
  - Significant or ambiguous drift: reviewer stops and asks the user to confirm before updating plan/spec artifacts.

### Verification
- Agent prompt lint passes for any modified agent files.
- Extension unit tests pass if `paw_get_context` output shape changes.
- `npm run compile` passes.

## Key Discoveries

- PAW-03B review output formatting constraints are in `agents/PAW-03B Impl Reviewer.agent.md` (not in extension code).
- The extension does not parse or update `ImplementationPlan.md`; plan updates are an agent/human responsibility and occur as direct Markdown edits under `.paw/work/<work-id>/`.
- Git utilities exist but aren’t currently used by the context tool (`src/git/validation.ts`).

## What We’re NOT Doing

- No new standalone “drift report” artifact files.
- No automatic Markdown plan parser/writer in the VS Code extension.
- No new workflow stages or workflow mode definitions.
- No new VS Code UI features.

## Implementation Approach

1. Update the PAW-03B agent prompt to (a) require a dedicated “Plan alignment” subsection in outputs, and (b) define drift classification + actions (auto-update vs request confirmation).
2. Optionally enhance `paw_get_context` output to include lightweight git workspace state, reusing existing validation utilities. This strengthens “commit-aware” behavior without adding new tools.

## Phase Summary

1. **Phase 1: Reviewer output + drift policy** — Add explicit “Plan alignment” output requirements and drift handling rules to PAW-03B without breaking existing summary-comment conventions.
2. **Phase 2: Git context surfaced in `paw_get_context`** — Expose repo validity and dirty-working-tree state using existing `src/git/validation.ts` utilities, with test updates.

---

## Phase 1: Reviewer output + drift policy

### Overview

Make plan alignment a required, standardized part of PAW-03B review outputs while keeping compatibility with existing output format requirements.

### Changes Required

#### 1) PAW-03B reviewer prompt updates
**File**: `agents/PAW-03B Impl Reviewer.agent.md`

**Changes**:
- Add a required **“Plan alignment” subsection** to PAW-03B outputs:
  - For **initial phase review** (prs strategy): include “Plan alignment” in the PR timeline comment content (still starting with `**🐾 Implementation Reviewer 🤖:**`).
  - For **review comment follow-up**: keep the mandated *two major sections*, but include a clearly-labeled “Plan alignment” subsection within **Section 2 – Overall summary**.
  - For **local strategy** (no PR): include “Plan alignment” in the agent’s final summary message and (when applicable) in the `ImplementationPlan.md` notes.

- Define a **drift classification rubric** (stable, predictable heuristics):
  - **Minor drift examples**: renames, small refactors, file moves, extracting helpers, updated test structure, reordered internal steps with unchanged externally observable behavior.
  - **Significant drift examples**: changed public API/CLI behavior, changed acceptance criteria outcomes, added/removed features, substantial architectural pivots, or changes that invalidate plan phases.
  - **Intent signals (commit-aware)**: commit messages like “refactor/rename/simplify”, commits that explicitly mention plan adjustments, and cohesive commits that match the drift.
  - **Ambiguity signals**: mixed commits, unclear messages, broad changes without narrative.

- Add explicit **local strategy drift handling** (this is the key behavior definition):
  - If drift is **minor + likely intentional**:
    - Update `.paw/work/<work-id>/ImplementationPlan.md` to reflect the implemented reality.
    - Preserve history: do not delete prior intent; add an appended note like “Plan alignment note (YYYY-MM-DD): …” including relevant commit SHA(s) and a 1–2 sentence rationale.
    - Commit the plan update with a narrowly-scoped message (e.g., `docs(paw): align ImplementationPlan with implementation`).
  - If drift is **significant OR intent is ambiguous**:
    - Stop and request user confirmation before editing plan/spec artifacts.
    - Present the evidence to the user (what differed; what `git diff` / `git log` suggests) and ask a direct choice:
      1) Update plan/spec to match implementation
      2) Adjust implementation to match plan/spec

- Leverage existing git-context conventions by adding/reinforcing explicit commands the reviewer should run when determining drift intent:
  - `git log --oneline -n <N>` (recent intent)
  - `git diff <base>..<head>` or `git diff <upstream>...HEAD` (scope)
  - `git status --porcelain` (ensure review is based on committed or clearly identified changes)

**Tests**:
- Run agent lint on the modified agent file:
  - `./scripts/lint-agent.sh agents/PAW-03B\ Impl\ Reviewer.agent.md`
- No TypeScript unit tests are expected to directly validate prompt semantics, but ensure the repo builds.

### Success Criteria

#### Automated Verification
- [ ] Agent lint passes for PAW-03B prompt: `./scripts/lint-agent.sh agents/PAW-03B\ Impl\ Reviewer.agent.md`
- [ ] TypeScript compile passes: `npm run compile`

#### Manual Verification
- [ ] In a reviewer run, output includes a visible “Plan alignment” subsection.
- [ ] For a “minor intentional” drift scenario, reviewer updates `ImplementationPlan.md` and records a rationale note.
- [ ] For a “significant/ambiguous” drift scenario, reviewer pauses and requests explicit confirmation before editing plan/spec.

---

## Phase 2: Git context surfaced in `paw_get_context`

### Overview

Expose minimal git workspace context to agents to support commit-aware reasoning and reduce footguns (e.g., reviewing a dirty working tree without realizing).

### Changes Required

#### 1) Add git context to the context tool output
**Files**:
- `src/tools/contextTool.ts`
- `src/git/validation.ts` (reuse as-is; only change if needed for errors/types)

**Changes**:
- Extend `ContextResult` to include a `git_context` payload (or equivalent), computed in `getContext()` using the resolved `workspacePath`:
  - `is_git_repo: boolean`
  - `has_uncommitted_changes: boolean` (only when git repo)
  - Optional warning/error string if checks fail
- Update `formatContextResponse()` to emit a new section, e.g.:
  - `<git_context>`
    - `is_git_repo: true|false`
    - `has_uncommitted_changes: true|false`
    - (optional) `recommended_commands: git status --porcelain; git log --oneline -n 20`
  - `</git_context>`

This aligns with the feature’s “commit-aware intent support” while reusing the existing `validateGitRepository()` / `hasUncommittedChanges()` utilities.

#### 2) Update unit tests for `contextTool`
**File**: `src/test/suite/contextTool.test.ts`

**Changes**:
- Update the `ContextResult` test fixtures to include the new `git_context` field.
- Update string assertions/snapshots to account for the new `<git_context>` section when present.

**Tests**:
- Run unit tests: `npm test`

### Success Criteria

#### Automated Verification
- [x] Unit tests pass: `npm test`
- [x] TypeScript compile passes: `npm run compile`

#### Manual Verification
- [ ] Calling `paw_get_context` shows a `<git_context>` section indicating repo validity and dirty/clean status.

**Phase 2 Status (2025-12-15):** Implemented `<git_context>` output in `paw_get_context` using `src/git/validation.ts` (repo detection + uncommitted change detection) with best-effort warnings; updated `Context Tool` unit tests accordingly. Automated verification passed via `npm test` (includes compile).

---

## Cross-Phase Testing Strategy

- Keep Phase 1 changes validated via agent lint + compile.
- Validate Phase 2 changes via `npm test` (context tool suite) + compile.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/147
- Spec: `.paw/work/impl-reviewer-plan-drift/Spec.md`
- Research: `.paw/work/impl-reviewer-plan-drift/SpecResearch.md`, `.paw/work/impl-reviewer-plan-drift/CodeResearch.md`
