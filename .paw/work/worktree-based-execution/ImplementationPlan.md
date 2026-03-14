# Worktree-Based Execution Implementation Plan

## Overview

Implement worktree-aware PAW initialization as an execution-location feature rather than a wholesale rewrite of branch strategy. The extension should be able to create or reuse a dedicated worktree, launch the PAW session inside that worktree, and leave the caller's original checkout untouched while existing local/PR branch rules continue to operate inside a verified execution checkout.

## Current State Analysis

Current initialization, agent guidance, and integration coverage all assume a single active checkout. The extension gathers branch-centric inputs and starts PAW in the current workspace, `paw-init` and `paw-git-operations` document branch switching in the active checkout, the branch auto-derive prompts are tied to the current branch, and the integration harness models one temporary repo root with one working directory (`.paw/work/worktree-based-execution/CodeResearch.md`). That leaves no explicit UX or implementation path for dedicated worktree execution, no durable execution-checkout contract, and no regression coverage proving the caller checkout stays unchanged while local and PR flows run elsewhere.

## Desired End State

PAW initialization supports an explicit worktree execution path in addition to the current-checkout flow. When worktree execution is selected, initialization provisions or validates a dedicated execution checkout, starts the PAW session there, persists portable workflow metadata plus a deterministic execution contract (never an absolute path), and keeps all branch operations scoped to the execution checkout. The workflow contract, prompts, tests, and docs all describe and verify that separation, including deterministic fail-fast behavior for ambiguous branch/reuse cases and explicit regression coverage for the existing current-checkout behavior.

## Execution Contract

The following terms and invariants are authoritative for implementation, prompts, tests, and docs:

- **Caller checkout** — the checkout/workspace where initialization starts. In dedicated worktree mode it must remain unchanged: branch, `HEAD`, upstream, and working tree status are preserved exactly before and after initialization and later workflow git operations.
- **Execution checkout** — the checkout where PAW runs. In `Execution Mode: worktree`, it is a dedicated git worktree bound to the work item; in `Execution Mode: current-checkout`, it is the caller checkout.
- **Target Branch** — the branch checked out in the execution checkout. In worktree mode it is always explicit user input (no auto-derive in this iteration). If the caller checkout is already on the target branch, initialization must fail fast and ask the user to choose a different target branch or use current-checkout mode.
- **Canonical enforcement** — execution-mode resolution and initialization/reuse execution-binding proof are deterministic TypeScript checks in `src/git/validation.ts` (`resolveExecutionMode()`, `deriveRepositoryIdentity()`, `deriveExecutionBinding()`, `validateExecutionBinding()`). Agent and skill prompts consume those results and keep later work scoped to the established execution checkout; they do not try to rediscover that checkout from the caller workspace.

### Binding Contract

| Record | Value / behavior | Written in | Consumed in |
| --- | --- | --- | --- |
| `Execution Mode` | `current-checkout` or `worktree`; if absent, default to `current-checkout` with no behavior change | Phase 1 `src/commands/initializeWorkItem.ts` | Phase 1/2 validation + current-checkout regression tests |
| `Repository Identity` | Normalized `origin` repository slug plus root commit SHA (portable, path-free) | Phase 1 `src/commands/initializeWorkItem.ts` | Phase 1 reuse validation + Phase 2 agent/skill/runtime checks |
| `Execution Binding` | `worktree:<work-id>:<target-branch>` | Phase 1 `src/commands/initializeWorkItem.ts` | Phase 1 reuse/recovery logic + Phase 2 binding validation |
| Local execution registry (non-committed) | Maps `Repository Identity + Execution Binding` to canonical `fs.realpathSync()` execution path and last-known branch | Phase 1 command layer | Reuse, resume guidance, orphan recovery, and duplicate-init suppression |

Additional rules:

- Phase 1 owns writing `Execution Mode`, `Repository Identity`, and `Execution Binding` into `WorkflowContext.md`; Phase 2 teaches agents/skills/tests to consume them.
- `Execution Binding` is valid only when `Repository Identity`, `Execution Binding`, and the canonical execution path from the local registry all agree.
- If initialization, reuse, or resume cannot prove the binding, the workflow halts before opening or resuming the execution checkout and gives actionable recovery guidance.
- The execution-location picker is now enabled by default; disabling `paw.enableWorktreeExecution` forces current-checkout mode and hides dedicated worktree selection.

### Reuse and Recovery Contract

- **Validation order**: canonical path (`fs.realpathSync()`) → repository identity → execution binding / local registry → target branch → cleanliness.
- **Half-initialized worktree** — a git-valid worktree exists but its `WorkflowContext.md` and/or local registry entry is missing or does not prove the expected `Execution Binding`.
- **Orphaned binding** — `WorkflowContext.md` contains the expected binding but the local registry path is missing; recovery guidance must offer `git worktree list`, explicit re-initialization, or reopening the located execution checkout.
- **Concurrent initialization** — duplicate creation is serialized by `git worktree add`; the second caller must receive actionable guidance, not raw git plumbing output.
- **Performance bound** — worktree enumeration is a single `git worktree list --porcelain` pass, repeated initialization reuses or rejects duplicates instead of creating more worktrees, and the initialization path stays under **500ms with ≤50 existing worktrees** in local validation tests.
- **Canonical rejection catalog** — this plan is the planning source; once implemented, `skills/paw-init/SKILL.md` becomes the runtime canonical catalog for reuse/rejection cases and user-facing guidance.

### Branch-State Matrix

| Execution Mode / Strategy | Caller checkout | Execution checkout |
| --- | --- | --- |
| `current-checkout` | Existing behavior; caller checkout is the execution checkout | `Target Branch` and any planning/phase/docs branches behave as they do today |
| `worktree` + local | Branch, `HEAD`, upstream, and status remain unchanged for the full run | Starts on explicit `Target Branch`; all local-strategy commits and pushes happen here |
| `worktree` + PRs | Branch, `HEAD`, upstream, and status remain unchanged for the full run | Starts on explicit `Target Branch`; planning/phase/docs branches are created, pushed, and reviewed from here |

## What We're NOT Doing

- Adding automatic cleanup or garbage collection for completed worktrees
- Supporting arbitrary resume-from-caller-checkout discovery of a previously created worktree; if the execution binding cannot be proven, the workflow stops and provides recovery guidance instead of guessing
- Supporting branch auto-derive in dedicated worktree mode in this first iteration; worktree execution requires an explicit target branch
- Reworking PAW Review / review-only flows beyond any shared initialization or git abstractions needed by implementation workflow support
- Introducing path-specific committed metadata that would make `WorkflowContext.md` machine-dependent

## Phase Status

- [x] **Phase 1: Worktree Bootstrap Flow** - Add the initialization inputs and git helpers needed to provision a dedicated execution worktree, write the execution contract fields, and launch PAW there.
- [x] **Phase 2: Workflow Contract Alignment** - Update agent/skill/prompt/test surfaces so worktree execution is treated as a first-class execution context instead of a special case.
- [x] **Phase 3: Documentation** - Capture the as-built design and update user/reference docs for the new workflow option.

> Phase 1 was internal-only. Dedicated worktree execution is now enabled by default because Phase 2 contract alignment, regression coverage, and docs updates are complete.

## Phase Candidates

---

## Phase 1: Worktree Bootstrap Flow

### Changes Required:
- **`src/ui/userInput.ts`**: Extend `WorkItemInputs` and the initialization prompt flow with an execution-location choice (`current checkout` vs `dedicated worktree`) collected *before* branch input. When worktree mode is selected, require an explicit target branch, disable empty-input auto-derive, and keep the execution-location picker hidden/disabled behind a feature flag until Phase 2 is complete.
- **`src/commands/initializeWorkItem.ts`**: Carry the new execution-location inputs through prompt construction so `paw-init` writes `Execution Mode`, `Repository Identity`, and `Execution Binding` into `WorkflowContext.md`, capture caller-checkout state before initialization, maintain the non-committed local execution registry, enforce the target-branch collision rule, create or validate the execution worktree before launching the PAW session, route all `.paw/work/` artifact paths through the execution checkout root, and wrap invalid-reuse / concurrent-init failures with actionable guidance.
- **`src/git/validation.ts`**: Add deterministic helpers for `resolveExecutionMode()`, `deriveRepositoryIdentity()`, `deriveExecutionBinding()`, and `validateExecutionBinding()`. Use `fs.realpathSync()` for path comparison, `git worktree list --porcelain` for single-pass discovery, explicit repository-identity checks (`origin` slug + root commit SHA), ordered reuse validation, dirty-state detection via `hasUncommittedChanges()`, half-initialized/orphaned-binding detection, and duplicate-init suppression.
- **`src/test/suite/userInput.test.ts`** and adjacent command/git helper tests: Cover feature-flag behavior, execution-location-before-branch ordering, explicit-branch requirement in worktree mode, target-branch collision rejection, repository-identity/path-trust checks, binding + local-registry writes, ordered reuse acceptance/rejection cases, dirty-state detection (staged, unstaged, untracked, in-progress operations), orphaned-binding recovery, symlink normalization, concurrent-init error wrapping, and the performance bound for ≤50 existing worktrees.

### Success Criteria:

#### Automated Verification:
- [x] Tests pass: `npm run lint`
- [x] Tests pass: `npm run compile`
- [x] Tests pass: `npm test`
- [x] Updated unit/command suites explicitly assert: feature flag keeps worktree mode unavailable by default, worktree mode requires an explicit target branch, prompt args plus `paw-init`'s `WorkflowContext.md` template persist `Execution Mode` / `Repository Identity` / `Execution Binding`, the local execution registry receives the same execution contract, reuse validation follows the documented evaluation order, dirty-state detection covers supported states, invalid-reuse failures return actionable guidance, and initialization stays under 500ms with ≤50 existing worktrees.

> `npm test` now passes after `npm run compile` cleans stale `out/` artifacts before rebuilding, matching CI's clean-checkout behavior.

#### Manual Verification:
- [x] With the feature flag enabled for internal testing, worktree mode writes the execution contract fields, records the local registry entry, launches PAW inside the execution checkout, and writes `.paw/work/` artifacts under the execution checkout instead of the caller workspace.
- [x] Invalid reuse, orphaned binding, symlink-path, and concurrent-init scenarios produce deterministic recovery guidance rather than raw git errors.
- [x] Re-running initialization for the same work item reuses or rejects duplicates instead of silently creating another worktree.

---

## Phase 2: Workflow Contract Alignment

### Changes Required:
- **`agents/PAW.agent.md`**: Update work-context and git-behavior guidance so the agent reasons about the execution checkout/worktree using the canonical vocabulary, treats the established execution checkout as the only valid place for git mutations, and halts with recovery guidance when execution state is ambiguous.
- **`skills/paw-init/SKILL.md`**: Extend the initialization contract and `WorkflowContext.md` schema to document `Execution Mode`, `Repository Identity`, `Execution Binding`, and `Execution Mode`-absent backward compatibility (`current-checkout`). Make this skill the runtime canonical owner of the rejection/recovery catalog and local-registry guidance.
- **`skills/paw-git-operations/SKILL.md`**: Clarify that branch verification, pull/push steps, local strategy behavior, and PR-strategy planning/phase/docs branch creation all operate inside a *validated* execution checkout; include the branch-state matrix and the rule that the caller checkout must never be mutated under worktree mode.
- **`src/prompts/branchAutoDeriveWithIssue.template.md`** and **`src/prompts/branchAutoDeriveWithDescription.template.md`**: Restrict auto-derive guidance to current-checkout mode, explain that worktree mode requires an explicit target branch, and surface the standardized recovery guidance for invalid binding / wrong-checkout resume cases.
- **`tests/integration/lib/harness.ts`** and **`tests/integration/lib/fixtures.ts`**: Add a multi-checkout fixture API (for example `createCallerAndExecution()` returning independent caller/execution handles with branch/status/read/write helpers), explicit teardown / `git worktree prune`, and path assertions proving artifacts land in the execution checkout.
- **`tests/integration/tests/workflows/worktree-bootstrap.test.ts`**, **`tests/integration/tests/workflows/git-branching.test.ts`**, **`tests/integration/tests/workflows/worktree-pr-strategy.test.ts`**, and **`tests/integration/tests/workflows/current-checkout-regression.test.ts`**: Define scenario-level intent up front:
  - `worktree-bootstrap` — writes execution contract fields + local registry, keeps artifacts in execution checkout, preserves caller checkout branch/HEAD/upstream/status, exercises orphaned-binding and invalid-reuse guidance
  - `git-branching` — current-checkout baseline remains unchanged
  - `worktree-pr-strategy` — planning/phase/docs branches, push/PR prep, and caller-checkout immutability under PR strategy
  - `current-checkout-regression` — explicit-branch flow, legacy `WorkflowContext.md` without `Execution Mode`, and current-checkout auto-derive remain unchanged

### Success Criteria:

#### Automated Verification:
- [x] Tests pass: `npm run lint`
- [x] Tests pass: `npm run compile`
- [x] Tests pass: `npm test`
- [x] Tests pass: `cd tests/integration && npx tsx --test tests/workflows/worktree-bootstrap.test.ts`
- [x] Tests pass: `cd tests/integration && npx tsx --test tests/workflows/git-branching.test.ts`
- [x] Tests pass: `cd tests/integration && npx tsx --test tests/workflows/worktree-pr-strategy.test.ts`
- [x] Tests pass: `cd tests/integration && npx tsx --test tests/workflows/current-checkout-regression.test.ts`

> Phase 2 contract-alignment updates for `agents/PAW.agent.md`, `skills/paw-git-operations/SKILL.md`, and the branch auto-derive prompt templates are linted. The integration harness supports caller/execution multi-checkout fixtures, secondary-root tool policy checks, and `@github/copilot-sdk@^0.1.32` for protocol-v3 permission handling. Full targeted integration validation now passes with `claude-sonnet-4.6` as the default live-workflow model (overridable with `PAW_TEST_LIVE_MODEL`): `cd tests/integration && npx tsc --noEmit && npx tsx --test tests/skills/*.test.ts && npx tsx --test tests/workflows/current-checkout-regression.test.ts tests/workflows/worktree-bootstrap.test.ts tests/workflows/git-branching.test.ts tests/workflows/worktree-pr-strategy.test.ts`.

#### Manual Verification:
- [x] The workflow contract and prompts consistently describe branch operations as acting on the established execution checkout and do not permit caller-checkout discovery or auto-repair when execution state is ambiguous.
- [x] A worktree-backed minimal/local workflow can complete its git preparation without changing the caller checkout’s branch, `HEAD`, upstream, or working tree status, and the committed `WorkflowContext.md` contains only portable execution metadata.
- [x] A paused worktree-backed workflow resumed from the wrong checkout fails fast with actionable recovery guidance (`git worktree list`, reopen execution checkout, or re-initialize) instead of guessing or mutating git state.
- [x] A worktree-backed PR workflow can create planning/phase/docs branches, push them, and prepare PRs from the execution checkout without mutating the caller checkout.
- [x] Existing current-checkout flows — including explicit-branch, auto-derive, and pre-existing `WorkflowContext.md` files without `Execution Mode` — continue to behave as before.
- [x] The feature flag is enabled only after all Phase 2 criteria pass.

---

## Phase 3: Documentation

### Changes Required:
- **`.paw/work/worktree-based-execution/Docs.md`**: Record the implemented execution contract, glossary, branch-state matrix, binding fields, local-registry behavior, reuse/rejection catalog, duplicate-init / orphan recovery behavior, performance bound, cleanup responsibility, verification commands, and worktree-specific caveats for future maintenance.
- **`docs/guide/workflow-modes.md`**: Document when to choose worktree execution, how it relates to minimal/local and PR strategies, the explicit-target-branch requirement, current-checkout compatibility expectations, and the expectation that the caller checkout remains untouched.
- **`docs/guide/vscode-extension.md`**: Update the initialization walkthrough so it shows execution-location selection before branch input, explains that worktree mode requires an explicit target branch, surfaces fail-fast cases (collision, invalid reuse, orphaned binding, ambiguous resume), and includes recovery guidance (`git worktree list`, reopen execution checkout, or re-initialize).
- **`docs/reference/artifacts.md`** and/or **`docs/specification/implementation.md`**: Update workflow-context/reference material for `Execution Mode`, `Repository Identity`, `Execution Binding`, current-checkout backward compatibility defaults, the distinction between artifact lifecycle and worktree lifetime, and the deliberate exclusion of path-specific committed metadata.

### Success Criteria:

#### Automated Verification:
- [x] Tests pass: `npm run lint`
- [x] Tests pass: `npm run compile`
- [x] Docs build: `mkdocs build --strict`

#### Manual Verification:
- [x] The docs clearly distinguish execution mode from review strategy and artifact lifecycle, explicitly state that worktree lifetime/cleanup is a separate operator concern, and provide manual cleanup commands at workflow completion.
- [x] The docs call out excluded behaviors and caveats: no automatic cleanup, no arbitrary resume-from-caller-checkout discovery, worktree mode requires an explicit target branch, fail-fast behavior on ambiguous execution binding, and recovery/reuse rejection cases.
- [x] The as-built documentation matches the final behavior, verification steps, current-checkout compatibility story, and local-registry / recovery guidance used during implementation.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/291
- Spec: none (minimal workflow)
- Research: `.paw/work/worktree-based-execution/CodeResearch.md`
