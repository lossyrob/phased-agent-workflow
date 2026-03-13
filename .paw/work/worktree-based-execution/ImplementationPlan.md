# Worktree-Based Execution Implementation Plan

## Overview

Implement worktree-aware PAW initialization as an execution-location feature rather than a wholesale rewrite of branch strategy. The extension should be able to create or reuse a dedicated worktree, launch the PAW session inside that worktree, and leave the caller's original checkout untouched while existing local/PR branch rules continue to operate inside a verified execution checkout.

## Current State Analysis

Current initialization, agent guidance, and integration coverage all assume a single active checkout. The extension gathers branch-centric inputs and starts PAW in the current workspace, `paw-init` and `paw-git-operations` document branch switching in the active checkout, the branch auto-derive prompts are tied to the current branch, and the integration harness models one temporary repo root with one working directory (`.paw/work/worktree-based-execution/CodeResearch.md`). That leaves no explicit UX or implementation path for dedicated worktree execution, no durable execution-checkout contract, and no regression coverage proving the caller checkout stays unchanged while local and PR flows run elsewhere.

## Desired End State

PAW initialization supports an explicit worktree execution path in addition to the current-checkout flow. When worktree execution is selected, initialization provisions or validates a dedicated execution checkout, starts the PAW session there, persists only portable workflow metadata plus a portable execution binding (never an absolute path), and keeps all branch operations scoped to the execution checkout. The workflow contract, prompts, tests, and docs all describe and verify that separation, including fail-fast handling for ambiguous branch/reuse cases and explicit regression coverage for the existing current-checkout behavior.

## Execution Contract

The following terms and invariants are authoritative for implementation, prompts, tests, and docs:

- **Caller checkout** — the checkout/workspace where initialization starts. In dedicated worktree mode it must remain unchanged: branch, `HEAD`, upstream, and working tree status are preserved exactly before and after initialization and later workflow git operations.
- **Execution checkout** — the checkout where PAW runs. In `Execution Mode: worktree`, it is a dedicated git worktree bound to the work item; in `Execution Mode: current-checkout`, it is the caller checkout.
- **Target Branch** — the branch checked out in the execution checkout. In worktree mode, if the caller checkout is already on the target branch, initialization must fail fast and ask the user to choose a different target branch or use current-checkout mode.
- **Execution Binding** — a portable, non-path-specific identifier that lets the workflow prove it is in the intended execution checkout before any git mutation. An acceptable implementation can use a deterministic worktree identifier derived from the work ID plus repository identity; if the binding cannot be proven, the workflow halts with guidance instead of guessing.
- **Reuse policy** — an existing worktree is reusable only when repository identity/common-dir, canonical path, target branch, work-item binding, and cleanliness all match expectations. Foreign, symlinked, dirty, wrong-branch, or half-initialized worktrees are rejected with actionable guidance.
- **Duplicate-init bound** — rerunning initialization for the same work item must reuse the verified execution checkout or fail fast; it must never silently create unbounded duplicate worktrees.
- **Release gate** — worktree execution is not considered user-releasable until Phase 2 contract alignment and regression coverage land for both worktree and current-checkout modes.

### Branch-State Matrix

| Execution Mode / Strategy | Caller checkout | Execution checkout |
| --- | --- | --- |
| `current-checkout` | Existing behavior; caller checkout is the execution checkout | `Target Branch` and any planning/phase/docs branches behave as they do today |
| `worktree` + local | Branch, `HEAD`, upstream, and status remain unchanged for the full run | Starts on `Target Branch`; all local-strategy commits and pushes happen here |
| `worktree` + PRs | Branch, `HEAD`, upstream, and status remain unchanged for the full run | Starts on `Target Branch`; planning/phase/docs branches are created, pushed, and reviewed from here |

## What We're NOT Doing

- Adding automatic cleanup or garbage collection for completed worktrees
- Supporting arbitrary resume-from-caller-checkout discovery of a previously created worktree; if the execution binding cannot be proven, the workflow stops and tells the user to reopen the execution checkout
- Reworking PAW Review / review-only flows beyond any shared initialization or git abstractions needed by implementation workflow support
- Introducing path-specific committed metadata that would make `WorkflowContext.md` machine-dependent

## Phase Status

- [x] **Phase 1: Worktree Bootstrap Flow** - Add the initialization inputs and git helpers needed to provision a dedicated execution worktree, enforce the execution contract, and launch PAW there.
- [ ] **Phase 2: Workflow Contract Alignment** - Update agent/skill/prompt/test surfaces so worktree execution is treated as a first-class execution context instead of a special case.
- [ ] **Phase 3: Documentation** - Capture the as-built design and update user/reference docs for the new workflow option.

> Phase 1 is a bootstrap milestone, not a release milestone. The worktree feature is not ready to ship until Phase 2 contract alignment and regression coverage are complete.

## Phase Candidates

---

## Phase 1: Worktree Bootstrap Flow

### Changes Required:
- **`src/ui/userInput.ts`**: Extend `WorkItemInputs` and the initialization prompt flow with an execution-location choice (`current checkout` vs `dedicated worktree`) that is collected *before* branch-name entry/auto-derive. In worktree mode, never offer “reuse the caller’s current branch”; instead, distinguish creating a new execution worktree from reusing a validated existing one.
- **`src/commands/initializeWorkItem.ts`**: Carry the new execution-location inputs through prompt construction, capture caller-checkout state before initialization, enforce the target-branch collision rule, create or validate the execution worktree before launching the PAW session, and start the session with `workingDirectory` pointing at the execution checkout instead of always using the caller workspace.
- **`src/git/validation.ts`**: Add repository/worktree helpers that resolve repository root/common-dir, canonicalize requested paths, inspect existing worktrees, validate repo identity and remote provenance, reject foreign/symlinked/dirty/wrong-branch/half-initialized reuse targets, and ensure repeated initialization for the same work item reuses or rejects duplicates instead of silently creating another worktree.
- **`src/test/suite/userInput.test.ts`** and adjacent command/git helper tests: Cover execution-location-before-branch ordering, target-branch collision rejection, repo-identity/path-trust checks, safe reuse acceptance/rejection cases, duplicate-init handling, and caller-checkout state preservation (including dirty callers).

### Success Criteria:

#### Automated Verification:
- [x] Tests pass: `npm run lint`
- [x] Tests pass: `npm run compile`
- [ ] Tests pass: `npm test`
- [x] Updated unit/command suites explicitly assert execution-location ordering, target-branch collision rejection, canonical-path/repo-identity validation, safe worktree reuse, duplicate-init suppression, and caller-checkout state preservation.

> `npm test` still reports the pre-existing 22 baseline failures in `Context Tool` / `customInstructions` caused by the missing `workItemInitPrompt.template.md`. The new Phase 1 worktree suites pass inside the full run.

#### Manual Verification:
- [x] Selecting dedicated worktree execution leaves the caller checkout’s branch, `HEAD`, upstream, and working tree status unchanged before and after initialization.
- [x] Selecting worktree mode while the caller checkout is already on the target branch fails fast with guidance to choose a different target branch or use current-checkout mode.
- [x] Reusing an existing worktree succeeds only for a clean, matching execution checkout and rejects foreign, dirty, wrong-branch, or half-initialized worktrees with actionable guidance.
- [x] Re-running initialization for the same work item reuses or rejects duplicates instead of silently creating another worktree.

---

## Phase 2: Workflow Contract Alignment

### Changes Required:
- **`agents/PAW.agent.md`**: Update work-context and git-behavior guidance so the agent reasons about the execution checkout/worktree, uses the canonical execution-contract vocabulary, and fails fast when `Execution Mode: worktree` is set but the current checkout cannot prove the execution binding.
- **`skills/paw-init/SKILL.md`**: Extend the initialization contract and `WorkflowContext.md` schema to record portable execution metadata (at minimum `Execution Mode` plus a portable execution binding), document current-checkout backward compatibility for older `WorkflowContext.md` files, and state that worktree-mode continuous sessions may continue only from a checkout that proves that binding.
- **`skills/paw-git-operations/SKILL.md`**: Clarify that branch verification, pull/push steps, local strategy behavior, and PR-strategy planning/phase/docs branch creation all operate inside the execution checkout; include the branch-state matrix and the rule that the caller checkout must never be mutated under worktree mode.
- **`src/prompts/branchAutoDeriveWithIssue.template.md`** and **`src/prompts/branchAutoDeriveWithDescription.template.md`**: Make execution-location choice available before branch derivation, ensure worktree-backed initialization never encourages reusing the caller’s current branch, and surface explicit messaging for target-branch collisions and fail-fast resume cases.
- **`tests/integration/lib/harness.ts`**, **`tests/integration/lib/fixtures.ts`**, **`tests/integration/tests/workflows/git-branching.test.ts`**, and dedicated worktree workflow tests: Add harness support for multi-checkout scenarios, add a `worktree-bootstrap` workflow test, add a `worktree-pr-strategy` workflow test, add a `current-checkout-regression` workflow test, and add artifact-level assertions that `WorkflowContext.md` persists only portable execution metadata.

### Success Criteria:

#### Automated Verification:
- [ ] Tests pass: `npm run lint`
- [ ] Tests pass: `npm run compile`
- [ ] Tests pass: `npm test`
- [ ] Tests pass: `cd tests/integration && npx tsx --test tests/workflows/worktree-bootstrap.test.ts`
- [ ] Tests pass: `cd tests/integration && npx tsx --test tests/workflows/git-branching.test.ts`
- [ ] Tests pass: `cd tests/integration && npx tsx --test tests/workflows/worktree-pr-strategy.test.ts`
- [ ] Tests pass: `cd tests/integration && npx tsx --test tests/workflows/current-checkout-regression.test.ts`

#### Manual Verification:
- [ ] The workflow contract and prompts consistently describe branch operations as acting on the execution checkout and halting when the execution binding cannot be proven.
- [ ] A worktree-backed minimal/local workflow can complete its git preparation without changing the caller checkout’s branch, `HEAD`, upstream, or working tree status, and the committed `WorkflowContext.md` contains only portable execution metadata.
- [ ] A paused worktree-backed workflow resumed from the wrong checkout fails fast with guidance instead of guessing or mutating git state.
- [ ] A worktree-backed PR workflow can create planning/phase/docs branches, push them, and prepare PRs from the execution checkout without mutating the caller checkout.
- [ ] Existing current-checkout flows — including explicit-branch, auto-derive, and pre-existing `WorkflowContext.md` files without `Execution Mode` — continue to behave as before.

---

## Phase 3: Documentation

### Changes Required:
- **`.paw/work/worktree-based-execution/Docs.md`**: Record the implemented execution contract, glossary, branch-state matrix, execution-binding rules, reuse/rejection cases, duplicate-init behavior, performance/reuse bounds, cleanup responsibility, verification commands, and worktree-specific caveats for future maintenance.
- **`docs/guide/workflow-modes.md`**: Document when to choose worktree execution, how it relates to minimal/local and PR strategies, the target-branch collision rule, current-checkout compatibility expectations, and the expectation that the caller checkout remains untouched.
- **`docs/guide/vscode-extension.md`**: Update the initialization walkthrough so it shows execution-location selection before branch derivation, explains fail-fast cases (collision, invalid reuse, ambiguous resume), and no longer implies that the extension always creates and checks out the target branch in the caller workspace.
- **`docs/reference/artifacts.md`** and/or **`docs/specification/implementation.md`**: Update workflow-context/reference material for new persisted execution fields, current-checkout backward compatibility defaults, the distinction between artifact lifecycle and worktree lifetime, and the deliberate exclusion of path-specific committed metadata.

### Success Criteria:

#### Automated Verification:
- [ ] Tests pass: `npm run lint`
- [ ] Tests pass: `npm run compile`
- [ ] Docs build: `mkdocs build --strict`

#### Manual Verification:
- [ ] The docs clearly distinguish execution mode from review strategy and artifact lifecycle, and explicitly state that worktree lifetime/cleanup is a separate operator concern.
- [ ] The docs call out excluded behaviors and caveats: no automatic cleanup, no arbitrary resume-from-caller-checkout discovery, fail-fast behavior on ambiguous execution binding, and reuse rejection cases.
- [ ] The as-built documentation matches the final behavior, verification steps, and current-checkout compatibility story used during implementation.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/291
- Spec: none (minimal workflow)
- Research: `.paw/work/worktree-based-execution/CodeResearch.md`
