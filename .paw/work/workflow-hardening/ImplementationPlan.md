# Workflow Hardening Implementation Plan

## Overview

This work hardens PAW and PAW Review around explicit, durable control-plane state. Instead of relying on prompt memory and artifact inference alone, the implementation will embed compact hardened-state sections into the existing workflow and review context artifacts, mirror the active required items into the built-in TODO surface, and use that combined model to gate mandatory transitions and track terminal external-review outcomes that matter to status and progression. Reconciliation will be required before yield, delegation, handoff/resume, status reporting, or GitHub mutation.

The plan keeps the existing runtime split intact: CLI continues to execute `agents/`, `skills/`, and prompt content directly, while `src/` remains VS Code-only plumbing that must preserve and surface the same workflow contract rather than becoming hidden runtime support. The implementation therefore concentrates decision-making in agents/skills and limits extension changes to configuration, status, and parity surfaces.

## Current State Analysis

The current durable workflow record is spread across Markdown artifacts such as `WorkflowContext.md`, `ImplementationPlan.md`, `ReviewContext.md`, and `ReviewComments.md`, while mandatory sequencing and pause behavior are encoded in the PAW agents and transition/review skills (`agents/PAW.agent.md`, `agents/PAW Review.agent.md`, `skills/paw-transition/SKILL.md`, `skills/paw-review-workflow/SKILL.md`). `paw-status` re-derives workflow state from artifacts plus git/PR state, and `paw-review-github` owns review posting but primarily records posted state back into `ReviewComments.md` rather than a distinct review-job control surface.

That split leaves several control-plane seams exposed. Mandatory gates depend on prompt-level enforcement, review posting terminal state is not modeled as a first-class job state, and planning/final review skills currently contain runtime-dependent fallback behavior for configured review modes (`skills/paw-planning-docs-review/SKILL.md`, `skills/paw-final-review/SKILL.md`). The built-in TODO mechanism is likely to be followed closely in-session, but it is not yet the portable source of truth across resume and cross-runtime flows, so the hardened design will treat TODOs as a mirror of compact embedded state rather than the durable contract itself. The VS Code layer also lags the workflow contract: `src/types/workflow.ts` and `src/ui/userInput.ts` do not fully represent the configured review modes already supported by the skill layer.

## Desired End State

After implementation:

1. **Embedded portable control state**: `WorkflowContext.md` and `ReviewContext.md` each carry a compact hardened-state section that records required activities, gates, review-stage state, and terminal states; the built-in TODO surface mirrors the active required items for in-session execution.
2. **Hard gate enforcement**: Transition, status, and posting paths advance only when the required hardened-state items are resolved; unresolved mandatory items block progression with explicit reasons.
3. **Review terminal-state tracking**: Review workflows record required review stages and terminal external-review outcomes, such as pending review creation, so resumed status and progression reflect the actual review job state.
4. **Exact configured procedure handling**: Planning/final/review SoT configuration either runs as configured or produces an explicit blocked state; no silent downgrade to a different procedure.
5. **Cross-runtime parity**: CLI and VS Code preserve the same control-plane outcomes, while VS Code continues to act only as configuration/status plumbing around the agent runtime.
6. **Legacy best-effort continuity**: Workflows and review jobs that do not contain hardened state remain usable in legacy mode, determined by the absence of that embedded state rather than a separate workflow-type field, and explicitly note that the new protections are not active.

### Verification

**Automated Verification:**
- [ ] Prompt linting passes for all changed agent/skill files: `npm run lint:agent:all`
- [ ] Extension linting passes: `npm run lint`
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] Extension/unit test suite passes: `npm test`
- [ ] Workflow integration coverage passes for updated and new orchestration tests in `tests/integration/tests/workflows/`

**Manual Verification:**
- [ ] A `planning-only` local workflow blocks advancement when a required PAW gate item remains unresolved
- [ ] Resuming a review job with an existing pending review reports that terminal review state instead of reverting to an earlier inferred stage
- [ ] A workflow configured for SoT planning-docs review or final review in CLI runs the configured SoT path, while unsupported runtime paths report an explicit block instead of silently changing modes
- [ ] Worktree/bootstrap and VS Code handoff/resume paths re-enter the workflow only after reconciling the same embedded control state, execution binding, and tracked review state seen by CLI
- [ ] Status output after manual artifact or GitHub-state changes reflects reconciled control-state/artifact/live-state reality
- [ ] A legacy workflow or review that lacks hardened state remains usable in best-effort mode and clearly reports that hardened protections are inactive

## What We're NOT Doing

- Replacing PAW artifacts with a database-backed workflow engine
- Moving CLI workflow logic into `src/` or treating extension code as hidden CLI runtime behavior
- Adding standalone `WorkflowWorklist.md` / `ReviewWorklist.md` artifacts as the primary design
- Designing a new dedicated TODO UI beyond built-in TODO mirroring of embedded control state
- Automatically reconstructing full hardened state for every pre-existing in-flight workflow or review job
- Preventing PAW Review from launching itself for the same review job, or otherwise fully fixing linked review-side issue-specific mutation bugs in this work
- Building a general concurrent ownership or takeover protocol for review mutations in this work
- Expanding PAW Review comment-writing heuristics beyond the state, terminal-state tracking, and sequencing changes required for this issue
- Solving unrelated workflow bugs that are not part of the explicit-state, review-state, reconciliation, or configured-procedure problems

## Phase Status

- [x] **Phase 1: Embedded Control-State Contract** - Introduce compact hardened-state sections in the existing context artifacts and define how built-in TODOs mirror them.
- [x] **Phase 2: PAW Gate Reconciliation** - Make PAW transition, status, and configured-review paths enforce the embedded control state and block on unresolved gates.
- [x] **Phase 3: Review State Tracking** - Make PAW Review sequence and terminal external-review state derive from explicit review control state.
- [x] **Phase 4: VS Code Contract Parity** - Align extension types, initialization, and status surfaces with the explicit workflow contract without relocating orchestration logic.
- [x] **Phase 5: Documentation** - Record the as-built design and update workflow/spec/reference docs for the new state model.

## Phase Candidates

<!-- None at plan time. -->

## Traceability & Dependencies

- **FR-001, FR-002, SC-001** → Phases 1-2 establish embedded hardened-state sections plus TODO mirroring and make PAW transitions/status/final-PR entrypoints block on unresolved mandatory items.
- **FR-003, FR-006, SC-002** → Phase 3 externalizes review-stage and terminal external-review state into embedded review control state for review progression and status.
- **FR-004, SC-004** → Phases 2-4 add reconciliation before yield, delegation, status reporting, handoff/resume, and external mutation across CLI and VS Code surfaces, including explicit `paw-status` reconciliation coverage.
- **FR-005, SC-003** → Phases 2 and 4 enforce exact configured procedure handling and remove silent runtime downgrades from supported control paths.
- **FR-007, FR-008, SC-005** → Phases 4-5 add cross-runtime parity validation plus the final documentation/spec updates that describe the same outcomes in both runtimes.
- **FR-009, SC-006** → Phases 1-4 define presence-based hardened-state detection, legacy best-effort behavior when that state is absent, and user-visible reporting that hardened protections are inactive.

- **Phase dependency: Phase 2 depends on Phase 1** for the embedded control-state contract and stable item identifiers.
- **Phase dependency: Phase 3 depends on Phase 1** for the review control-state contract and on Phase 2’s reconciliation rules for consistent tracking and blocking semantics.
- **Phase dependency: Phase 4 depends on Phases 1-3** so VS Code surfaces can mirror the finalized contract rather than inventing parallel behavior.
- **Phase dependency: Phase 5 depends on Phases 1-4** so the as-built docs and published specs match the implemented control-plane behavior.

---

## Phase 1: Embedded Control-State Contract

### Changes Required:
- **`skills/paw-workflow/references/control-state-contract.md`** (new): Define the implementation-workflow hardened-state model embedded in `WorkflowContext.md`, anchored on a small shared control-state core for stable item IDs, status values, reconciliation markers, and terminal-state markers, plus implementation-workflow-specific fields and the rule that built-in TODOs mirror active required items.
- **`skills/paw-review-workflow/references/control-state-contract.md`** (new): Define the review-job equivalent embedded in `ReviewContext.md`, reusing that same shared control-state core for common field meanings while adding review-stage and terminal external-review fields specific to review jobs.
- **`skills/paw-init/SKILL.md`**: Seed a compact hardened-state section inside `.paw/work/<work-id>/WorkflowContext.md`, including required PAW activities, gate items, configured procedure items, lifecycle metadata, and no separate workflow-type field; presence of this section indicates hardened behavior.
- **`skills/paw-review-understanding/SKILL.md`**: Seed a compact hardened-state section inside `.paw/reviews/<identifier>/ReviewContext.md` when a review job is initialized, carrying the review-job identifier, configured review mode, and review-stage / terminal-state placeholders into the durable artifact set.
- **`agents/PAW.agent.md`** and **`agents/PAW Review.agent.md`**: Replace prompt-only reminders with explicit instructions to read, update, and reconcile the embedded control-state sections before yield, delegation, or side-effect execution, and to keep built-in TODOs synchronized as an execution mirror rather than the portable source of truth.
- **Tests**: Update `tests/integration/tests/workflows/full-local-workflow.test.ts` and `tests/integration/tests/workflows/minimal-workflow.test.ts` to assert hardened-state section creation in the context artifacts, extend `tests/integration/tests/skills/paw-agent-guardrails.test.ts` to cover the new guardrail language, and add `tests/integration/tests/skills/control-state-contract.test.ts` to validate the shared IDs, status values, terminal markers, and idempotent interpretation of serialized control-state fixtures.

### Success Criteria:

#### Automated Verification:
- [x] Prompt linting passes for the changed agent/skill files: `npm run lint:agent:all`
- [x] Workflow artifact initialization coverage passes: `cd tests/integration && npx tsx --test tests/workflows/full-local-workflow.test.ts tests/workflows/minimal-workflow.test.ts`
- [x] Guardrail coverage passes: `cd tests/integration && npx tsx --test tests/skills/paw-agent-guardrails.test.ts`
- [x] Shared control-state fixture coverage passes: `cd tests/integration && npx tsx --test tests/skills/control-state-contract.test.ts`

#### Manual Verification:
- [ ] Initializing a new PAW workflow creates a hardened-state section inside `WorkflowContext.md` and mirrors active required items into TODOs
- [ ] Initializing a new PAW Review run creates a hardened-state section inside `ReviewContext.md` with explicit stage and terminal-state placeholders
- [ ] The same serialized hardened-state fixture yields the same core status interpretation in CLI-facing and VS Code-facing readers
- [ ] Resuming a hardened workflow uses the embedded control state as the portable source of truth rather than reconstructing all state from prompt prose alone
- [ ] Resuming a legacy workflow or review without hardened state remains usable in best-effort mode and reports that hardened protections are inactive

**Dependencies:** None; this phase establishes the portable artifact contract that all later phases consume.

---

## Phase 2: PAW Gate Reconciliation

### Changes Required:
- **`skills/paw-transition/SKILL.md`**: Make the hardened-state section in `WorkflowContext.md` the authoritative source for mandatory next activities, unresolved gates, candidate promotion readiness, milestone completion, and preflight reconciliation before returning transition results; mutation-affecting decisions must block on unknown or conflicting reconciled state. When hardened state is absent, fall back to legacy best-effort behavior and flag hardened protections as inactive.
- **`skills/paw-status/SKILL.md`**: Derive PAW status from the hardened-state section plus artifact/git/PR checks, and report blocked/incomplete states from reconciliation rather than inferred progress alone; when full reconciliation cannot complete, return explicit stale/unverified read-only status instead of implied freshness. When the section is absent, report legacy mode explicitly.
- **`skills/paw-planning-docs-review/SKILL.md`** and **`skills/paw-final-review/SKILL.md`**: Record configured review procedure items in the embedded control state, mark them resolved only when the configured mode actually runs, preserve the configured mode in status/control-state surfaces, and emit explicit blocked states for unsupported SoT/runtime combinations instead of downgrading silently.
- **`skills/paw-git-operations/SKILL.md`** and **`agents/PAW.agent.md`**: Require control-state reconciliation before delegation, execution-checkout handoff, branch mutation, and resume paths so worktree/current-checkout flows cannot bypass unresolved mandatory items, while keeping TODOs synchronized as a mirror of active required work.
- **`skills/paw-pr/SKILL.md`**: Verify all required hardened-state items and lifecycle actions are resolved before final PR creation and stop-tracking work begins.
- **Tests**: Add `tests/integration/tests/skills/control-state-reconciliation-content.test.ts`, `tests/integration/tests/workflows/final-review.test.ts`, `tests/integration/tests/workflows/workflow-control-state-guards.test.ts`, `tests/integration/tests/workflows/paw-status-reconciliation.test.ts`, and `tests/integration/tests/workflows/legacy-control-state-mode.test.ts`; extend `tests/integration/tests/workflows/worktree-pr-strategy.test.ts`; and keep the Phase 1 control-state regressions in the focused verification set. Cover unresolved-gate blocking, worktree reconciliation refusal before git mutation, exact-procedure enforcement, named regressions for planning-docs review and final-review SoT mode enforcement, negative assertions that silent single-model fallback never occurs, clearly labeled stale/unverified read-only status after incomplete reconciliation, and legacy-mode detection when hardened state is absent.

### Success Criteria:

#### Automated Verification:
- [x] Prompt linting passes for changed skills/agents: `npm run lint:agent:all`
- [x] Focused control-state reconciliation coverage passes: `cd tests/integration && npx tsx --test tests/skills/control-state-contract.test.ts tests/skills/paw-agent-guardrails.test.ts tests/skills/control-state-reconciliation-content.test.ts tests/workflows/paw-init-hardened-state.test.ts tests/workflows/final-review.test.ts tests/workflows/workflow-control-state-guards.test.ts tests/workflows/paw-status-reconciliation.test.ts tests/workflows/legacy-control-state-mode.test.ts tests/workflows/worktree-pr-strategy.test.ts`

#### Manual Verification:
- [ ] A local PAW workflow cannot advance into implementation while required plan/review/transition control-state items remain unresolved
- [ ] `paw-status` reports blocked or pending gate items after artifacts or git state are changed outside the current session, and clearly labels stale/unverified read-only output when reconciliation cannot fully complete
- [ ] Worktree and current-checkout resume paths refuse git mutation until the execution binding and required control-state items are reconciled
- [ ] Configured SoT planning-docs review and final review either run the configured path in CLI or report an explicit blocked state instead of silently switching modes
- [ ] A workflow without hardened state enters legacy best-effort behavior and explicitly reports that the new protections are inactive

**Dependencies:** Requires the embedded control-state contract from Phase 1.

---

## Phase 3: Review State Tracking

### Changes Required:
- **`skills/paw-review-workflow/SKILL.md`**: Use the hardened-state section in `ReviewContext.md` to gate understanding, evaluation, output, and terminal external-review progression, and require reconciliation before the workflow yields or advances.
- **`skills/paw-review-feedback/SKILL.md`** and **`skills/paw-review-critic/SKILL.md`**: Respect review control-state sequencing so draft feedback, critique assessment, and critique-response/finalization only occur when their prerequisite review items are resolved and can be marked complete in order.
- **`skills/paw-review-github/SKILL.md`**: Persist terminal external-review outcomes, such as pending review creation, back into the hardened-state section of `ReviewContext.md` so resumed status and progression reflect the actual review job state.
- **`agents/PAW Review.agent.md`**: Align handoff and stage messaging with the embedded review control state before posting or handing off.
- **`skills/paw-review-understanding/SKILL.md`**: Ensure resume paths restore the same review-job identifier and tracked review-stage state into the embedded control state before evaluation/output continues, and leave older reviews without that state in legacy best-effort mode.
- **Tests**: Add `tests/integration/tests/workflows/review-control-state-sequencing.test.ts`, `tests/integration/tests/workflows/review-terminal-state-tracking.test.ts`, and `tests/integration/tests/workflows/review-legacy-control-state-mode.test.ts` to cover sequencing, terminal external-review state tracking, and legacy-mode behavior when hardened review state is absent.

### Success Criteria:

#### Automated Verification:
- [x] Prompt linting passes for changed review agents/skills: `bash -lc "./scripts/lint-prompting.sh agents/'PAW Review.agent.md' skills/paw-review-workflow/SKILL.md skills/paw-review-understanding/SKILL.md skills/paw-review-feedback/SKILL.md skills/paw-review-critic/SKILL.md skills/paw-review-github/SKILL.md"`
- [x] Review workflow coverage passes: `cd tests/integration && npx tsx --test tests/skills/control-state-contract.test.ts tests/workflows/review-control-state-sequencing.test.ts tests/workflows/review-terminal-state-tracking.test.ts tests/workflows/review-legacy-control-state-mode.test.ts`

#### Manual Verification:
- [ ] A review workflow cannot advance past required feedback, critique, or finalization stages while tracked review-state items remain unresolved
- [ ] A resumed review with an existing pending review preserves and reports that terminal review state instead of reverting to earlier inferred progress
- [ ] A legacy review without hardened state remains usable in best-effort mode and clearly reports that the new review-state protections are inactive

**Dependencies:** Requires the embedded review control-state contract from Phase 1 and the reconciliation semantics established in Phase 2.

---

## Phase 4: VS Code Contract Parity

### Changes Required:
- **`src/types/workflow.ts`**: Align extension workflow types with the agent/skill contract, including explicit SoT-capable review-mode values and any extension-visible control-state/status types needed for parity.
- **`src/ui/userInput.ts`**: Collect and validate planning/final review configuration so the extension either preserves exact configured procedures or blocks unsupported combinations explicitly.
- **`src/commands/initializeWorkItem.ts`**: Propagate the full review/control-state contract into PAW initialization arguments, including exact configured procedure settings and the rule that hardened behavior is inferred from presence of embedded state rather than a dedicated workflow-type field.
- **`src/commands/getWorkStatus.ts`**, **`src/commands/stopTrackingArtifacts.ts`**, and **`src/tools/handoffTool.ts`**: Surface the portable control-state/status contract in the VS Code entrypoints that resume PAW, request artifact lifecycle actions, or hand work to a fresh chat so those paths re-enter the same reconciled state machine as CLI and can report legacy mode when hardened state is absent.
- **`package.json`**: Update any relevant command/tool descriptions or configuration schemas that need to reflect the explicit workflow-state contract.
- **Tests**: Extend `src/test/suite/userInput.test.ts`, `src/test/suite/initializeWorkItem.test.ts`, `src/test/suite/handoffTool.test.ts`, and add `src/test/suite/getWorkStatus.test.ts` to cover SoT configuration propagation, explicit blocked/unsupported runtime behavior, negative coverage for dropped or remapped SoT mode values, control-state-aware handoff/status entrypoints, presence-based hardened detection, and parity of the emitted contract. Extend `tests/integration/tests/skills/execution-contract-content.test.ts` so the extension-emitted initialization contract and shared serialized control-state fixtures match the agent-side control-plane expectations without introducing a separate migration framework.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `npm run compile`
- [x] Extension/unit tests covering parity changes pass: `npm test`
- [x] Extension linting passes: `npm run lint`
- [x] Contract-parity coverage passes: `cd tests/integration && npx tsx --test tests/skills/execution-contract-content.test.ts`

#### Manual Verification:
- [ ] Initializing PAW from VS Code preserves explicit review-mode selections instead of narrowing them to the old type surface
- [ ] VS Code status/resume entrypoints describe the same blocked or pending control-state items the CLI agent sees
- [ ] VS Code handoff into a fresh PAW chat carries enough context for the agent to reconcile the same execution binding and pending gate / review-state context before continuing
- [ ] Unsupported VS Code-only execution paths explain the block explicitly rather than silently running a different review mode
- [ ] VS Code surfaces infer hardened versus legacy behavior from presence of embedded state rather than a dedicated workflow-type flag

**Dependencies:** Requires the embedded control-state and reconciliation semantics from Phases 1-3.

---

## Phase 5: Documentation

### Changes Required:
- **`.paw/work/workflow-hardening/Docs.md`**: Capture the implemented control-plane model, artifact responsibilities, runtime split, and verification approach.
- **`paw-specification.md`** and **`paw-review-specification.md`**: Update the workflow specifications to describe embedded hardened state, TODO mirroring, legacy best-effort behavior when that state is absent, reconciliation checkpoints, review-stage / terminal-state tracking, and exact configured-procedure handling.
- **`docs/reference/artifacts.md`**: Document the hardened-state sections within `WorkflowContext.md` and `ReviewContext.md`, including their responsibilities, TODO mirroring behavior, and relationship to existing context/comment artifacts.
- **`docs/specification/implementation.md`** and **`docs/specification/review.md`**: Reflect the new control-plane semantics and gating rules in the published specification docs.
- **`docs/guide/stage-transitions.md`** and **`docs/reference/agents.md`**: Update user-facing transition/runtime guidance where the new explicit-state behavior changes what users should expect at pauses, resumes, and unsupported runtime paths.

### Success Criteria:

#### Automated Verification:
- [x] Documentation build passes: `mkdocs build --strict`
- [x] Repository verification passes after documentation updates: `npm run lint && npm run compile && npm test`

#### Manual Verification:
- [ ] Docs.md accurately describes the as-built control-state, review-state, and reconciliation model
- [ ] Published docs explain the new artifacts and blocked-mode behavior without implying that `src/` executes PAW logic in CLI
- [ ] Workflow/reference docs remain consistent with the final implementation behavior across CLI and VS Code
- [ ] Workflow/reference docs explain that hardened behavior is inferred from embedded state presence, while older workflows without that state remain in legacy best-effort mode

**Dependencies:** Requires completed implementation across Phases 1-4.

---

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/299
- Spec: `.paw/work/workflow-hardening/Spec.md`
- Research: `.paw/work/workflow-hardening/CodeResearch.md`
