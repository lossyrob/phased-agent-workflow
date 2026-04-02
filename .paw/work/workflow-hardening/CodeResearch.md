---
date: 2026-03-31T17:57:24.0560297-04:00
git_commit: 4dac23c3f1cb79ea439b65158a9380c8386078e8
branch: feature/workflow-hardening
repository: phased-agent-workflow
topic: "Workflow state, gates, review ownership, and status surfaces across PAW and PAW Review"
tags: [research, workflow, paw, paw-review, status]
status: complete
last_updated: 2026-03-31
---

# Research: Workflow state, gates, review ownership, and status surfaces across PAW and PAW Review

## Research Question

Document the current implementation surfaces that govern workflow state, mandatory gates, external side-effect ownership, configured review procedure enforcement, reconciliation, and status reporting across PAW and PAW Review.

## Summary

PAW’s durable workflow record is the `.paw/work/<work-id>/WorkflowContext.md` artifact created by `paw-init`; the PAW reference skill describes it as the configuration/state file, while the PAW agent derives in-session TODO state from completed artifacts and uses `paw-transition` to queue the next TODOs (`skills/paw-init/SKILL.md:197-242`, `skills/paw-workflow/SKILL.md:75-99`, `agents/PAW.agent.md:10`, `agents/PAW.agent.md:106-123`, `skills/paw-transition/SKILL.md:147-179`).  
Mandatory stage boundaries and pause rules are encoded primarily in the PAW agent and the `paw-transition` skill: the agent enumerates non-skippable follow-on activities and requires `paw-transition` after every boundary, while `paw-transition` maps review policies to `pause_at_milestone`, runs preflight checks, and returns the next activity plus lifecycle/session decisions (`agents/PAW.agent.md:14-57`, `agents/PAW.agent.md:36-57`, `skills/paw-transition/SKILL.md:39-52`, `skills/paw-transition/SKILL.md:65-106`, `skills/paw-transition/SKILL.md:108-179`).  
PAW Review keeps review state in `.paw/reviews/<identifier>/` artifacts, with `ReviewContext.md` as the authoritative parameter source and `ReviewComments.md` evolving from draft → assessed → finalized → posted; GitHub side effects are assigned to `paw-review-github`, which only creates pending reviews from finalized comments and never auto-submits them (`skills/paw-review-understanding/SKILL.md:17-18`, `skills/paw-review-understanding/SKILL.md:183-199`, `skills/paw-review-workflow/SKILL.md:97-120`, `skills/paw-review-workflow/SKILL.md:219-257`, `skills/paw-review-github/SKILL.md:12-34`, `skills/paw-review-github/SKILL.md:70-89`, `skills/paw-review-github/SKILL.md:227-252`).  
Configured planning/final review modes are read from `WorkflowContext.md` by `paw-planning-docs-review` and `paw-final-review`; both load `paw-sot` for `society-of-thought`, and both VS Code branches explicitly degrade to single-model execution instead of running multi-model or SoT review in the extension runtime (`skills/paw-planning-docs-review/SKILL.md:24-47`, `skills/paw-planning-docs-review/SKILL.md:107-178`, `skills/paw-final-review/SKILL.md:23-41`, `skills/paw-final-review/SKILL.md:86-165`).  
The VS Code runtime adds orchestration support around the CLI-facing agents/skills rather than replacing them: `package.json` exposes PAW commands and LM tools, `extension.ts` registers those tools/commands on activation, `initializeWorkItem.ts` stores execution bindings in extension state, and the docs/reference page explicitly says CLI runs `agents/`, `skills/`, and prompts directly while `src/` is VS Code-only automation (`package.json:27-145`, `src/extension.ts:40-77`, `src/commands/initializeWorkItem.ts:25-46`, `src/commands/initializeWorkItem.ts:157-197`, `src/commands/initializeWorkItem.ts:257-350`, `docs/reference/agents.md:12-15`).

## Documentation System

- **Framework**: MkDocs with the Material theme (`mkdocs.yml:1-25`).
- **Docs Directory**: `docs/`, with `guide/`, `specification/`, and `reference/` sections in both `mkdocs.yml` nav and `DEVELOPING.md` (`mkdocs.yml:61-78`, `DEVELOPING.md:218-245`).
- **Navigation Config**: `mkdocs.yml` defines the site nav, including workflow guides, specifications, and references (`mkdocs.yml:61-78`).
- **Style Conventions**: Human docs use short sectioned Markdown pages with heading-driven structure, ordered quick-start steps, tables for concepts/policies, and inline links between guide/spec/reference pages (`docs/index.md:21-70`, `docs/guide/index.md:17-69`, `docs/reference/agents.md:5-16`).
- **Build Command**: `mkdocs build` / `mkdocs serve` are documented in `mkdocs.yml`; `DEVELOPING.md` also requires `mkdocs build --strict` when adding pages (`mkdocs.yml:1-7`, `DEVELOPING.md:204-216`, `DEVELOPING.md:237-245`).
- **Standard Files**: Top-level project docs include `README.md`, `DEVELOPING.md`, `paw-specification.md`, and `paw-review-specification.md`; the published docs entrypoint is `docs/index.md` (`README.md:39-65`, `DEVELOPING.md:1-20`, `paw-specification.md:20-28`, `paw-review-specification.md:17-29`, `docs/index.md:65-70`).

## Verification Commands

- **Test Command**: `npm test` for extension tests; integration suites are `npm run test:integration`, `npm run test:integration:skills`, and `npm run test:integration:workflows` (`package.json:133-145`, `DEVELOPING.md:99-107`).
- **Lint Command**: `npm run lint` for `src`, plus `npm run lint:agent:all` / `npm run lint:skills` and direct `./scripts/lint-prompting.sh ...` for agent/skill prompt linting (`package.json:133-145`, `DEVELOPING.md:20-56`).
- **Build Command**: `npm run compile` compiles the extension, and `npm run package` builds the VSIX (`package.json:128-136`, `DEVELOPING.md:87-108`).
- **Type Check**: The repository uses `tsc -p ./` through `npm run compile`; there is no separate `typecheck` script in `package.json` (`package.json:128-145`).

## Detailed Findings

### 1. Where workflow state currently lives

#### PAW implementation workflow

- `paw-init` defines `WorkflowContext.md` as the required bootstrap artifact and writes all workflow control fields there, including workflow mode, review strategy/policy, session policy, artifact lifecycle, final review settings, planning review settings, execution metadata, and issue linkage (`skills/paw-init/SKILL.md:10-18`, `skills/paw-init/SKILL.md:22-67`, `skills/paw-init/SKILL.md:197-242`).
- The PAW reference skill describes `.paw/work/<work-id>/WorkflowContext.md` as “Configuration and state” and lists the rest of the work directory as the durable artifact surface the orchestrator reads (`skills/paw-workflow/SKILL.md:75-99`).
- The PAW agent does not describe a separate persisted control-plane store; instead it says resumed sessions “derive TODO state from completed artifacts,” uses TODOs to externalize steps, and depends on `paw-transition` results to decide whether to pause, continue, promote candidates, or hand off (`agents/PAW.agent.md:10`, `agents/PAW.agent.md:106-135`).
- `paw-transition` reads `WorkflowContext.md`, identifies the last completed activity “from TODOs or artifacts,” and then queues the next activity by adding `[ ] <activity>` and `[ ] paw-transition` TODOs in its completion procedure (`skills/paw-transition/SKILL.md:24-35`, `skills/paw-transition/SKILL.md:147-179`).
- `paw-status` re-derives current state from artifacts plus git/PR state rather than from a dedicated workflow database: it checks which artifacts exist, reads configuration back out of `WorkflowContext.md`, parses phase counts and candidate states from `ImplementationPlan.md`, and inspects git/PR status before synthesizing next-step guidance (`skills/paw-status/SKILL.md:27-113`, `skills/paw-status/SKILL.md:191-216`).
- `paw-lite` is the exception inside this repository: it explicitly uses SQL `todos` / `todo_deps` for coordination, queries ready work items from SQL, and checks SQL completion before invoking `paw-pr` (`skills/paw-lite/SKILL.md:25-64`, `skills/paw-lite/SKILL.md:92-120`).

#### PAW Review workflow

- `paw-review-understanding` creates `ReviewContext.md` as the authoritative parameter source for review runs and uses it together with `CodeResearch.md` to resume into `DerivedSpec.md` generation (`skills/paw-review-understanding/SKILL.md:14-18`, `skills/paw-review-understanding/SKILL.md:27-42`, `skills/paw-review-understanding/SKILL.md:183-199`).
- `paw-review-workflow` documents a fixed review artifact directory where `ReviewContext.md`, `CodeResearch.md`, `DerivedSpec.md`, evaluation artifacts, and `ReviewComments.md` together represent review progress (`skills/paw-review-workflow/SKILL.md:97-120`).
- `ReviewComments.md` is the main review-state progression artifact: the workflow skill documents its evolution from draft → assessed → finalized → posted, and the GitHub posting skill updates it with pending review IDs and posted/not-posted markers (`skills/paw-review-workflow/SKILL.md:115-120`, `skills/paw-review-github/SKILL.md:125-146`, `skills/paw-review-github/SKILL.md:244-252`).

### 2. Where mandatory transitions, stage boundaries, and pause rules are encoded for PAW

- The PAW agent contains the top-level mandatory transition table. It marks spec review, plan review, implementation review, planning-docs-review, final review, and PR transitions as non-skippable, and states that “Skippable = NO” steps should execute immediately without pausing for confirmation (`agents/PAW.agent.md:14-35`).
- The same agent declares a “Stage Boundary Rule (CRITICAL)” requiring `paw-transition` after every boundary, enumerates the boundaries, and says milestone pauses only happen through the transition call (`agents/PAW.agent.md:36-57`).
- Review policy semantics are also encoded in the PAW agent: it separates human-review pauses from automated gates, defines the four current review policies, and maps legacy `never`/`always` and legacy handoff modes onto current values (`agents/PAW.agent.md:69-85`).
- `paw-transition` re-encodes the follow-on activity table, computes whether phase candidates are pending, maps stage boundaries to milestone names, derives `pause_at_milestone` from review policy, and computes `session_action` and `inline_instruction` for stage-crossing handoffs (`skills/paw-transition/SKILL.md:37-64`, `skills/paw-transition/SKILL.md:65-106`).
- `paw-transition` also performs the boundary preflight checks that gate entry into `paw-code-research`, `paw-implement`, `paw-planning-docs-review`, `paw-final-review`, and `paw-pr`, and it carries artifact-lifecycle decisions forward through `artifact_lifecycle` / `artifact_lifecycle_action` in the structured result (`skills/paw-transition/SKILL.md:108-179`).
- The reference `paw-workflow` skill explicitly says workflow enforcement lives in `PAW.agent.md`, not in the reference skill, which distinguishes descriptive documentation from the actual gate-owning prompt surfaces (`skills/paw-workflow/SKILL.md:6-10`).

### 3. Where PAW Review manages sequencing, GitHub side effects, and pending-review behavior

- The PAW Review agent sets the stage order to Understanding → Evaluation → Output and defines the Output-stage sub-sequence as feedback → critic → feedback (critique response) → GitHub posting (`agents/PAW Review.agent.md:66-84`).
- `paw-review-workflow` repeats that sequence with stage gates: it requires understanding artifacts before evaluation, requires either `ImpactAnalysis.md` + `GapAnalysis.md` or `REVIEW-SYNTHESIS.md` before output, requires `**Final**:` markers before GitHub posting, and defines the human control point after the pending review is created (`skills/paw-review-workflow/SKILL.md:136-197`, `skills/paw-review-workflow/SKILL.md:219-257`).
- `paw-review-feedback` is responsible for turning evaluation findings into comment objects and notes that GitHub posting is handled later by `paw-review-github`; it also mode-gates its required inputs on `Review Mode` from `ReviewContext.md` (`skills/paw-review-feedback/SKILL.md:12-24`, `skills/paw-review-feedback/SKILL.md:35-45`).
- `paw-review-github` owns the external GitHub mutation surface: it requires a finalized `ReviewComments.md`, filters only comments marked ready for posting, creates a pending review, adds inline comments to that pending review, and then records the pending review/comment IDs back into `ReviewComments.md` (`skills/paw-review-github/SKILL.md:12-34`, `skills/paw-review-github/SKILL.md:38-69`, `skills/paw-review-github/SKILL.md:70-146`).
- Pending-review behavior is explicitly non-terminal until a human submits it: the review workflow’s core principles and the GitHub posting guardrails both say pending reviews are never auto-submitted and remain editable/deletable by the reviewer (`skills/paw-review-workflow/SKILL.md:47-54`, `skills/paw-review-workflow/SKILL.md:252-257`, `skills/paw-review-github/SKILL.md:234-252`).
- Multi-PR review posting is handled inside `paw-review-github` by iterating per-PR artifact directories, creating a separate pending review for each PR, and continuing other PRs if one pending-review creation fails (`skills/paw-review-github/SKILL.md:148-186`).

### 4. Where configured review modes are selected and enforced

#### PAW planning and final review paths

- `paw-init` defines the configuration fields that drive both planning and final review execution, including `Planning Review Mode`, `Planning Review Interactive`, `Planning Review Specialists`, `Planning Review Perspectives`, `Final Review Mode`, `Final Review Interactive`, and the related specialist/model settings (`skills/paw-init/SKILL.md:46-67`, `skills/paw-init/SKILL.md:166-189`, `skills/paw-init/SKILL.md:197-242`).
- `paw-planning-docs-review` reads its mode directly from `WorkflowContext.md`, skips entirely when planning review is disabled, runs single-model or multi-model review for the configured mode, and for `society-of-thought` loads `paw-sot` with a constructed artifact review context sourced from the planning review fields (`skills/paw-planning-docs-review/SKILL.md:24-47`, `skills/paw-planning-docs-review/SKILL.md:107-168`).
- `paw-final-review` follows the same pattern for final review: it reads `Final Review Mode` and related settings from `WorkflowContext.md`, runs single-model or multi-model review for those modes, and invokes `paw-sot` for `society-of-thought` using diff + artifact coordinates and the final-review specialist settings (`skills/paw-final-review/SKILL.md:23-41`, `skills/paw-final-review/SKILL.md:86-155`).
- Both planning-docs-review and final-review document a VS Code runtime downgrade: if the extension runtime encounters multi-model or SoT configuration, it reports the limitation and executes a single-model review instead (`skills/paw-planning-docs-review/SKILL.md:45-47`, `skills/paw-planning-docs-review/SKILL.md:170-178`, `skills/paw-final-review/SKILL.md:39-41`, `skills/paw-final-review/SKILL.md:157-165`).

#### PAW Review evaluation/output paths

- The PAW Review agent has a dedicated “SoT Mode Handling” section that forwards `Review Mode: society-of-thought`, specialist selection defaults, interaction mode, interactive setting, and model preferences into the delegated review flow without selecting specialists itself (`agents/PAW Review.agent.md:43-50`).
- `paw-review-understanding`’s ReviewContext template includes review-configuration fields, making `ReviewContext.md` the persisted source for review mode and specialist settings downstream (`skills/paw-review-understanding/SKILL.md:183-199`, `skills/paw-review-understanding/SKILL.md:256-260`).
- `paw-review-workflow` enforces the review mode value at the evaluation gate: it errors on unknown modes, runs `paw-review-impact` + `paw-review-gap` for `single-model`, and loads `paw-sot` directly for `society-of-thought`, with an explicit “do not fall back to single-model silently” rule if `paw-sot` cannot be loaded (`skills/paw-review-workflow/SKILL.md:156-197`).
- Downstream review comment generation is also mode-gated: `paw-review-feedback` requires `ImpactAnalysis.md` + `GapAnalysis.md` for single-model review and `REVIEW-SYNTHESIS.md` for SoT review, reporting inconsistency if the artifact set does not match the configured mode (`skills/paw-review-feedback/SKILL.md:12-24`, `skills/paw-review-feedback/SKILL.md:26-33`).

### 5. Existing tests covering orchestration, transitions, SoT, and related workflow surfaces

- `full-local-workflow.test.ts` is the broad long-session orchestration coverage in the integration suite: it exercises spec → plan → implement in one session, installs fixture dependencies, asserts structural artifacts, checks code changes, and forbids pushes/PR creation (`tests/integration/tests/workflows/full-local-workflow.test.ts:2-10`, `tests/integration/tests/workflows/full-local-workflow.test.ts:34-99`, `tests/integration/tests/workflows/full-local-workflow.test.ts:101-208`).
- `transition-review-policy.test.ts` covers transition pause behavior across both current and legacy review policy values by seeding `WorkflowContext.md`, invoking `paw-transition`, and asserting `pause_at_milestone` behavior for `never`, `final-pr-only`, `always`, and `every-stage` (`tests/integration/tests/workflows/transition-review-policy.test.ts:2-15`, `tests/integration/tests/workflows/transition-review-policy.test.ts:24-80`, `tests/integration/tests/workflows/transition-review-policy.test.ts:130-187`).
- `artifact-lifecycle.test.ts` covers another `paw-transition` responsibility: lifecycle detection, legacy field mapping, and the stop-tracking action required before a final PR in `commit-and-clean` mode (`tests/integration/tests/workflows/artifact-lifecycle.test.ts:2-15`, `tests/integration/tests/workflows/artifact-lifecycle.test.ts:25-121`, `tests/integration/tests/workflows/artifact-lifecycle.test.ts:153-220`).
- `planning-docs-review.test.ts` exercises the planning review gate as a holistic artifact review and checks that it creates structured findings without mutating code or creating PRs (`tests/integration/tests/workflows/planning-docs-review.test.ts:2-10`, `tests/integration/tests/workflows/planning-docs-review.test.ts:37-133`).
- `smart-interactive-mode.test.ts` covers the smart-mode resolution logic around planning review, including single-model degradation behavior, severity classification, and resolution-summary output (`tests/integration/tests/workflows/smart-interactive-mode.test.ts:2-15`, `tests/integration/tests/workflows/smart-interactive-mode.test.ts:63-181`).
- `sot-perspectives.test.ts` is the clearest SoT compliance test: it runs `paw-sot` with explicit specialists/perspectives, verifies synthesis output, checks per-specialist/perspective filenames, and confirms perspective metadata disappears when `perspectives: none` (`tests/integration/tests/workflows/sot-perspectives.test.ts:2-9`, `tests/integration/tests/workflows/sot-perspectives.test.ts:25-134`, `tests/integration/tests/workflows/sot-perspectives.test.ts:136-233`).
- `worktree-bootstrap.test.ts` and `worktree-pr-strategy.test.ts` cover long-running execution-checkout behavior and external git mutations in worktree mode, including preservation of the caller checkout, proof of execution binding, and branch-specific push behavior for PR-strategy branches (`tests/integration/tests/workflows/worktree-bootstrap.test.ts:32-80`, `tests/integration/tests/workflows/worktree-bootstrap.test.ts:92-140`, `tests/integration/tests/workflows/worktree-bootstrap.test.ts:142-240`, `tests/integration/tests/workflows/worktree-pr-strategy.test.ts:60-117`, `tests/integration/tests/workflows/worktree-pr-strategy.test.ts:128-220`).
- `paw-status-about-paw.test.ts` and `scratch-ignore-marker-policy.test.ts` cover two support surfaces that affect status/reporting and artifact lifecycle guidance: the former checks that `paw-status` stays grounded in the documented onboarding sources, and the latter checks scratch-ignore lifecycle documentation across spec/skills (`tests/integration/tests/skills/paw-status-about-paw.test.ts:10-38`, `tests/integration/tests/skills/scratch-ignore-marker-policy.test.ts:10-70`).

### 6. Documentation infrastructure and repository verification surfaces

- The published docs are MkDocs-based, organized into guide/specification/reference sections, and presented as the user-facing documentation entrypoints from both the README and the docs site (`README.md:55-65`, `mkdocs.yml:10-25`, `mkdocs.yml:61-78`, `docs/index.md:21-70`).
- Developer documentation centralizes the workflow for prompt linting, extension build/test/package steps, and documentation authoring, including `mkdocs build --strict` before committing new pages (`DEVELOPING.md:20-76`, `DEVELOPING.md:87-108`, `DEVELOPING.md:184-245`).
- The package scripts surface the default repo verification commands: `compile`, `test`, `lint`, prompt linting, packaging, and integration-test entrypoints (`package.json:127-145`).
- The extension activation path only registers VS Code commands/tools and resumes pending worktree initialization; it does not embed PAW workflow logic itself, which remains in the agent/skill content (`src/extension.ts:40-77`, `docs/reference/agents.md:12-15`).

### 7. Current neutral constraints and visible implementation limits

- CLI and VS Code do not expose the same session-management surface. `paw-init` defaults `session_policy` to `continuous` for CLI but allows `per-stage` in VS Code, and the PAW agent explicitly says `per-stage` is unavailable in CLI sessions (`skills/paw-init/SKILL.md:35-41`, `agents/PAW.agent.md:87-104`).
- VS Code setup stores execution-checkout continuity in extension state (`paw.executionRegistry` and `paw.pendingWorktreeInit`) and reuses that state to resume worktree sessions, while the agent/skill layer treats `WorkflowContext.md` plus git/worktree state as the portable execution contract (`src/commands/initializeWorkItem.ts:25-46`, `src/commands/initializeWorkItem.ts:257-350`, `skills/paw-init/SKILL.md:244-259`, `skills/paw-git-operations/SKILL.md:19-29`).
- The extension-side workflow typings currently encode only `single-model | multi-model` for `FinalReviewMode`, and `FinalReviewConfig` in `userInput.ts` also only types those two values, while `paw-init` and the workflow skills document `society-of-thought` as a valid final/planning review mode (`src/types/workflow.ts:23-25`, `src/ui/userInput.ts:67-78`, `skills/paw-init/SKILL.md:46-67`, `skills/paw-final-review/SKILL.md:23-41`, `skills/paw-planning-docs-review/SKILL.md:24-47`).
- Review policies `planning-only` and `final-pr-only` are constrained to local strategy during initialization, so those policies are not described as valid PR-strategy configurations by `paw-init` (`skills/paw-init/SKILL.md:154-160`).
- The docs/reference page and README both describe `src/` as VS Code-only automation and the CLI runtime as direct execution of installed agents/skills/prompts, so code research for issue 299 needs to treat `src/` as extension control surfaces rather than hidden CLI runtime behavior (`docs/reference/agents.md:12-15`, `README.md:55-65`).

## Code References

- `agents/PAW.agent.md:14-57` - Mandatory transition table, stage-boundary rule, and review-policy semantics.
- `agents/PAW.agent.md:106-175` - TODO tracking, transition result handling, candidate promotion, and before-yield checks.
- `agents/PAW Review.agent.md:43-50` - Review-mode forwarding for society-of-thought review.
- `agents/PAW Review.agent.md:66-89` - Review stage sequence and pending-review human control point.
- `skills/paw-init/SKILL.md:22-67` - WorkflowContext input parameters and defaults.
- `skills/paw-init/SKILL.md:154-189` - Validation rules and society-of-thought configuration.
- `skills/paw-init/SKILL.md:197-259` - WorkflowContext template and execution-contract fields.
- `skills/paw-transition/SKILL.md:24-35` - Current-state discovery from WorkflowContext plus TODOs/artifacts.
- `skills/paw-transition/SKILL.md:39-106` - Mandatory next-activity logic, candidate promotion, stage-boundary mapping, and pause/session decisions.
- `skills/paw-transition/SKILL.md:108-179` - Preflight checks and structured transition result contract.
- `skills/paw-status/SKILL.md:27-113` - Artifact/config/git/PR-based status derivation.
- `skills/paw-review-workflow/SKILL.md:97-120` - Review artifact directory and ReviewComments lifecycle.
- `skills/paw-review-workflow/SKILL.md:136-257` - Review stage sequencing, SoT enforcement, and pending-review control point.
- `skills/paw-review-github/SKILL.md:12-146` - Pending-review creation prerequisites, filtering, posting, and ReviewComments updates.
- `skills/paw-final-review/SKILL.md:23-41` - Final-review mode selection from WorkflowContext.
- `skills/paw-final-review/SKILL.md:86-165` - Final-review single/multi/SoT execution paths and VS Code fallback.
- `skills/paw-planning-docs-review/SKILL.md:24-47` - Planning-review mode selection from WorkflowContext.
- `skills/paw-planning-docs-review/SKILL.md:107-178` - Planning-review single/multi/SoT execution paths and VS Code fallback.
- `skills/paw-review-understanding/SKILL.md:82-199` - ReviewContext creation/resumption and review-configuration requirements.
- `src/commands/initializeWorkItem.ts:25-46` - Extension-global worktree execution metadata types/keys.
- `src/commands/initializeWorkItem.ts:157-197` - Prompt argument construction from initialization settings.
- `src/commands/initializeWorkItem.ts:257-350` - Execution registry and pending-worktree-init persistence.
- `src/commands/getWorkStatus.ts:49-103` - VS Code status command opening PAW with a Work ID query.
- `src/commands/stopTrackingArtifacts.ts:80-149` - VS Code stop-tracking flow via agent handoff.
- `src/tools/handoffTool.ts:103-156` - VS Code `paw_new_session` tool opening a new PAW/PAW Review chat.

## Architecture Documentation

- PAW’s control model is split between durable Markdown artifacts (`.paw/work/...` and `.paw/reviews/...`) and prompt-level orchestration logic in agents/skills; the implementation reference skill explicitly positions itself as descriptive while the PAW agent owns enforcement (`skills/paw-workflow/SKILL.md:6-10`, `skills/paw-workflow/SKILL.md:75-99`, `agents/PAW.agent.md:14-57`).
- Git and GitHub side effects are assigned to named skills rather than spread across the orchestrators: `paw-git-operations` handles planning/phase/docs branch mechanics and phase PR creation, `paw-pr` owns final PR creation and artifact stop-tracking, and `paw-review-github` owns review-comment posting as pending GitHub reviews (`agents/PAW.agent.md:187-194`, `skills/paw-git-operations/SKILL.md:38-88`, `skills/paw-git-operations/SKILL.md:157-215`, `skills/paw-pr/SKILL.md:14-20`, `skills/paw-pr/SKILL.md:75-99`, `skills/paw-review-github/SKILL.md:27-34`, `skills/paw-review-github/SKILL.md:70-146`).
- The VS Code runtime adds launch/resume/status/help plumbing around the agent runtime: commands register workflow entrypoints, LM tools register skill/handoff capabilities, and extension state stores execution-checkout mappings for worktree workflows (`package.json:44-125`, `src/extension.ts:54-77`, `src/commands/getWorkStatus.ts:49-103`, `src/commands/initializeWorkItem.ts:257-350`, `src/tools/handoffTool.ts:103-156`).

## Open Questions

- I did not review every workflow/review test file in `tests/integration/tests/`; the test section above documents the files I inspected directly for this work item.
- I did not generate GitHub permalinks because this research was produced from the local checkout and file:line references were sufficient for traceability.
