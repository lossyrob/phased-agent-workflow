# Plan

## Problem

Copilot CLI currently describes dedicated-worktree mode as valid only when the session already runs inside the execution checkout. For issue #295, relax the CLI contract so the session may remain elsewhere while the agent proves the execution checkout and confines all mutations to that worktree.

## Phase 1: Tighten scope and preserve safety guarantees

### Files / surfaces
- `agents/PAW.agent.md`
- `skills/paw-init/SKILL.md`
- `skills/paw-git-operations/SKILL.md`
- `docs/guide/workflow-modes.md`
- `docs/specification/implementation.md`
- `tests/integration/tests/skills/execution-contract-content.test.ts`
- `tests/integration/tests/workflows/worktree-bootstrap.test.ts`
- `src/test/suite/initializeWorkItem.test.ts`

### Success criteria
- The plan explicitly treats this as a CLI contract change.
- The proof chain stays explicit: `WorkflowContext.md`, `Repository Identity`, `Execution Binding`, and current git worktree state still determine the execution checkout.
- Caller-checkout immutability remains non-negotiable.
- Failure behavior remains for ambiguous, missing, or unproven execution checkouts.

## Phase 2: Update CLI contract wording

### Scope
Revise CLI-facing agent and skill instructions so they no longer require the session cwd to already equal the execution checkout.

### Success criteria
- CLI text allows operating on a proven execution checkout from outside that directory.
- CLI text still requires all git mutations and artifact writes to occur only in the execution checkout.
- Recovery guidance still exists when the execution checkout cannot be proven.

## Phase 3: Align docs and tests

### Scope
Update documentation/spec text and CLI-oriented tests so they describe and enforce the relaxed contract.

### Success criteria
- Docs/spec text no longer says “start PAW there yourself” or “already running from the dedicated worktree” for CLI.
- Prompt-content tests assert the new wording.
- Integration coverage includes the relaxed CLI contract without weakening caller-checkout isolation.

## Phase 4: Validate and review

### Scope
Install worktree dependencies if needed, run repository validation, lint changed prompts, then run the requested reviews.

### Success criteria
- `npm run compile`, `npm run lint`, and `npm test` succeed from the worktree.
- `./scripts/lint-prompting.sh` succeeds for each touched file under `agents/` or `skills/`.
- Final review runs with `claude-opus-4.6` and `gpt-5.4` before PR handoff.

## Key Decisions

- This change targets CLI-facing content; it does not rewrite VS Code-only runtime logic in `src/`.
- Proof of the execution checkout matters more than the session cwd.
- The caller checkout must remain untouched in worktree mode.

## What We’re NOT Doing

- We are not weakening execution proof requirements.
- We are not allowing mutations in the caller checkout.
- We are not changing VS Code’s local execution registry or worktree handoff behavior.
- We are not introducing a separate `Docs.md` artifact for this small contract fix; the relevant permanent documentation updates live in `docs/guide/` and `docs/specification/`.
