# Worktree-Based PAW Execution

## Overview

This work adds a first-class execution-mode concept to PAW workflow initialization. Instead of always running in the checkout that launched `PAW: New PAW Workflow`, users can now choose between:

- **Current Checkout** — preserve the existing single-checkout behavior
- **Dedicated Worktree** — create or reuse a separate execution checkout and run PAW there

The feature solves a practical workflow problem: previously, starting PAW in VS Code meant branch creation, artifact writes, and later workflow git operations all happened in the caller checkout. That made it awkward to keep local exploratory work open while letting PAW execute in isolation. Worktree execution separates those concerns by keeping the caller checkout unchanged while moving PAW's git activity and `.paw/work/<work-id>/` artifacts into a validated execution checkout.

The implementation also adds a durable execution contract so agents, skills, and runtime helpers can prove they are operating in the intended checkout before changing git state. That contract uses portable metadata in `WorkflowContext.md` plus machine-local registry state for canonical path matching and recovery.

## Architecture and Design

### High-Level Architecture

The implementation spans four layers:

1. **VS Code input collection** in `src/ui/userInput.ts`
2. **Initialization orchestration** in `src/commands/initializeWorkItem.ts`
3. **Deterministic git validation** in `src/git/validation.ts`
4. **Agent/skill/runtime contract enforcement** across prompts, skills, and integration tests

The initialization flow now collects:

1. Issue URL
2. Execution Mode
3. Target Branch
4. Worktree strategy/path (Dedicated Worktree only)
5. Workflow and review settings

For worktree execution, the command layer derives an execution contract before launching PAW:

- **Work ID** — derived from the target branch
- **Repository Identity** — normalized `origin` slug plus repository root commit SHA
- **Execution Binding** — `worktree:<work-id>:<target-branch>`

Those values are written into `WorkflowContext.md` and used together with a local execution registry entry to prove checkout identity at resume and git-operation time.

When the user selects **Dedicated Worktree**, initialization creates or validates the execution checkout first, records a pending handoff, opens the worktree in a new VS Code window, and resumes PAW there. The caller checkout remains the launch point only; it is not the execution root.

### Design Decisions

#### Portable committed metadata, local path registry

`WorkflowContext.md` stores only portable execution metadata (`Execution Mode`, `Repository Identity`, `Execution Binding`). Absolute filesystem paths are intentionally excluded so committed workflow artifacts remain reusable across machines and clones.

Machine-specific execution paths are kept in VS Code local state. That local registry maps `Repository Identity + Execution Binding` to the canonical execution path and last-known branch. The split lets PAW validate intent portably while still performing local recovery and duplicate-init checks safely.

#### Fail fast on ambiguous execution binding

When PAW cannot prove it is in the correct execution checkout, it stops before any git mutation. The system does not guess which worktree to use and does not silently "repair" state by switching branches in the caller checkout.

This applies to wrong-checkout resumes, stale registry entries, orphaned bindings, invalid reuse attempts, and repository mismatches. Recovery guidance points the user to concrete actions like reopening the execution checkout, running `git worktree list`, or re-initializing the workflow.

#### Execution mode is independent of review strategy

Execution mode answers **where PAW runs**. Review strategy answers **how branches and PRs flow** inside that execution checkout. This separation keeps the model coherent:

- `current-checkout + local` behaves like the historical single-checkout flow
- `worktree + local` keeps the caller checkout untouched while all commits stay on the target branch in the execution checkout
- `worktree + prs` creates planning/phase/docs branches from the execution checkout without mutating the caller checkout

#### Artifact lifecycle is not worktree lifecycle

`Artifact Lifecycle` continues to control whether `.paw/work/` artifacts are committed, persisted, or kept local-only. It does not create, remove, or garbage-collect worktrees.

Dedicated worktree lifetime is an operator concern. After a workflow completes, cleanup is still a manual git worktree operation.

### Integration Points

| Component | Responsibility |
|----------|----------------|
| `src/ui/userInput.ts` | Collect execution mode and worktree strategy before branch-dependent workflow decisions |
| `src/commands/initializeWorkItem.ts` | Build execution metadata, create/reuse worktrees, record local registry state, open the execution checkout, and resume PAW |
| `src/git/validation.ts` | Resolve execution mode, derive repository identity/binding, validate reusable worktrees, and enforce wrong-checkout rejection |
| `skills/paw-init/SKILL.md` | Persist execution contract fields into `WorkflowContext.md` |
| `skills/paw-git-operations/SKILL.md` | Treat the validated execution checkout as the only place branch and push logic may run |
| Integration harness and workflow tests | Prove caller/execution checkout separation for current-checkout, local, and PR-strategy flows |

## User Guide

### Prerequisites

- VS Code with the PAW extension installed
- GitHub Copilot active
- A git repository with an `origin` remote
- If reusing a worktree, an existing worktree that belongs to the same repository and target branch

By default, the extension shows both execution-mode options. If you want to force historical behavior, set `"paw.enableWorktreeExecution": false`.

### Basic Usage: Current Checkout

Choose **Current Checkout** when you want the traditional PAW flow:

1. Run `PAW: New PAW Workflow`
2. Enter an issue URL or skip it
3. Select **Current Checkout**
4. Enter a branch name or leave it blank to auto-derive
5. Continue through the workflow/review prompts

In this mode, the currently open workspace is the execution checkout. Legacy `WorkflowContext.md` files without `Execution Mode` continue to behave this way.

### Basic Usage: Dedicated Worktree

Choose **Dedicated Worktree** when you want PAW to run outside the caller checkout:

1. Run `PAW: New PAW Workflow`
2. Enter an issue URL or skip it
3. Select **Dedicated Worktree**
4. Enter an explicit target branch
5. Choose **Create New Worktree** or **Reuse Existing Worktree**
6. Provide an optional path override (create) or required path (reuse)
7. Continue through the remaining prompts

Expected behavior:

- PAW prepares or validates the execution checkout first
- The workflow directory is created under the execution checkout
- VS Code opens the execution checkout in a new window
- PAW resumes there automatically
- The caller checkout keeps its original branch, `HEAD`, upstream, and working tree state

### Advanced Usage

#### Reusing an existing worktree

Reuse is appropriate when a worktree for the same work item already exists and you want to continue there. PAW validates reuse in a fixed order:

1. Canonical path
2. Repository identity
3. Execution binding and local registry
4. Target branch
5. Cleanliness / in-progress git operations

If any check fails, initialization stops with recovery guidance instead of mutating git state.

#### Review strategy interaction

Execution mode does not change PAW's branch naming rules; it changes where those rules apply.

- **Local strategy** — all commits stay on the target branch in the execution checkout
- **PRs strategy** — planning, phase, and docs branches are created and pushed from the execution checkout

In worktree mode, both strategies leave the caller checkout untouched.

#### Cleanup after completion

PAW does not automatically remove dedicated worktrees. After the workflow is merged and the worktree is no longer needed:

```bash
git worktree list
git worktree remove <path>
git worktree prune
```

Run cleanup from the main repository checkout once the execution worktree has no uncommitted changes.

## API Reference

### Key Components

| Component | API / Behavior |
|----------|-----------------|
| `collectExecutionMode()` | Prompts for `current-checkout` or `worktree` when worktree execution is enabled |
| `collectWorktreeConfig()` | Collects `create` vs `reuse` strategy and optional path input |
| `resolveExecutionMode()` | Normalizes configuration into the runtime execution mode |
| `deriveRepositoryIdentity()` | Builds portable repository proof from `origin` + root commit SHA |
| `deriveExecutionBinding()` | Builds `worktree:<work-id>:<target-branch>` |
| `validateExecutionBinding()` | Confirms the active checkout matches the expected workflow contract before git mutation |
| Local execution registry | Maps repository identity + execution binding to canonical local path for reuse and recovery |

### Configuration Options

| Setting / Field | Values | Meaning |
|-----------------|--------|---------|
| `paw.enableWorktreeExecution` | `true`, `false` | Show or hide the Dedicated Worktree option during initialization |
| `Execution Mode` | `current-checkout`, `worktree` | Where PAW executes |
| `Repository Identity` | `<normalized-origin>@<root-commit>` | Portable repository identity used to prove a worktree belongs to the same repo |
| `Execution Binding` | `worktree:<work-id>:<target-branch>` | Portable proof that the execution checkout matches the intended work item |
| Worktree strategy | `create`, `reuse` | Whether to provision a new execution checkout or validate an existing one |

## Testing

### How to Test

Repository validation:

```bash
npm run lint
npm run compile
npm test
```

Targeted integration coverage for the execution contract:

```bash
cd tests/integration
npx tsc --noEmit
npx tsx --test tests/skills/*.test.ts
npx tsx --test tests/workflows/current-checkout-regression.test.ts tests/workflows/worktree-bootstrap.test.ts tests/workflows/git-branching.test.ts tests/workflows/worktree-pr-strategy.test.ts
```

The live workflow suites default to `claude-sonnet-4.6`. Override with `PAW_TEST_LIVE_MODEL` when needed.

### Edge Cases

- **Dedicated worktree requires an explicit target branch** — auto-derive remains current-checkout-only
- **Wrong checkout resume** — PAW fails fast and instructs the user to reopen the execution checkout or inspect `git worktree list`
- **Orphaned binding** — if registry state is missing or stale, PAW reports recovery steps instead of creating a duplicate worktree silently
- **Caller branch collision** — worktree initialization rejects cases where the caller checkout is already on the requested target branch
- **Legacy contexts** — older `WorkflowContext.md` files without `Execution Mode` still resolve to `current-checkout`

## Limitations and Future Work

- Dedicated worktree cleanup is still manual
- Worktree mode does not support branch auto-derive in this iteration
- PAW does not try arbitrary "find the right worktree" discovery from the caller checkout when execution binding cannot be proven
- Committed workflow artifacts intentionally omit machine-specific execution paths
