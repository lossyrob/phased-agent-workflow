---
date: 2026-03-13T13:41:24-04:00
git_commit: 95d7a5d1f148faa560fb54e155c6e3294c85bee2
branch: feature/worktree-based-execution
repository: lossyrob/phased-agent-workflow
topic: "Support worktree-based PAW execution without switching the caller's branch"
tags: [research, codebase, git, worktree, initialization, testing]
status: complete
last_updated: 2026-03-13
---

# Research: Worktree-based PAW execution without switching the caller's branch

## Research Question

How does PAW currently initialize workflow context, choose and switch branches, validate git state, document local-vs-PR workflow behavior, and exercise git behavior in tests, and which existing files currently own those responsibilities for issue #291?

## Summary

PAW's current initialization and execution model is branch-centric. `paw-init` documents bootstrap behavior that creates `WorkflowContext.md`, then checks out the base branch, fast-forwards it, and creates the target branch in the active checkout; the shared git skill continues that model by checking the current branch and switching to target/phase/planning/docs branches before work or PR creation (`skills/paw-init/SKILL.md:12-20`, `skills/paw-init/SKILL.md:236-248`, `skills/paw-git-operations/SKILL.md:21-68`, `skills/paw-git-operations/SKILL.md:103-127`).

The VS Code initialization flow collects branch, workflow, review, session, artifact, final-review, and optional issue inputs, validates only that the opened workspace is a git repository, and serializes branch-oriented prompt arguments to the PAW agent; no worktree-specific field is currently part of `WorkItemInputs`, prompt construction, or the documented `WorkflowContext.md` schema (`src/ui/userInput.ts:55-109`, `src/ui/userInput.ts:208-244`, `src/ui/userInput.ts:350-399`, `src/ui/userInput.ts:513-605`, `src/commands/initializeWorkItem.ts:13-61`, `src/commands/initializeWorkItem.ts:82-150`, `skills/paw-init/SKILL.md:192-233`, `src/git/validation.ts:16-23`).

User-facing documentation and integration tests reflect the same single-checkout model. The workflow guide describes minimal mode as local-only and local strategy as committing directly to the target branch, while the integration harness and `git-branching` workflow test run the agent inside one temporary working directory and assert behavior against that checkout (`docs/guide/workflow-modes.md:35-57`, `docs/guide/workflow-modes.md:115-136`, `tests/integration/lib/harness.ts:39-113`, `tests/integration/lib/fixtures.ts:10-18`, `tests/integration/lib/fixtures.ts:20-35`, `tests/integration/lib/fixtures.ts:47-50`, `tests/integration/tests/workflows/git-branching.test.ts:26-83`).

## Documentation System

- **Framework**: MkDocs with the Material theme, search plugin, and `pymdownx`/admonition extensions (`mkdocs.yml:18-60`, `DEVELOPING.md:184-215`).
- **Docs Directory**: `docs/`, with `guide/`, `specification/`, and `reference/` sections (`DEVELOPING.md:218-234`).
- **Navigation Config**: `mkdocs.yml` `nav:` includes `guide/workflow-modes.md` under User Guide (`mkdocs.yml:61-78`).
- **Style Conventions**: Guide pages use overview tables, hierarchical headings, fenced examples, and MkDocs admonitions such as `!!! note` and `!!! warning` (`docs/guide/workflow-modes.md:5-12`, `docs/guide/workflow-modes.md:55-57`, `docs/guide/workflow-modes.md:75-87`, `docs/guide/workflow-modes.md:137-148`).
- **Build Command**: `mkdocs build` / `mkdocs serve`; developer guidance also requires `mkdocs build --strict` before committing doc updates (`mkdocs.yml:1-5`, `DEVELOPING.md:206-215`, `DEVELOPING.md:237-245`).
- **Standard Files**: Root README, developer guide, and CLI changelog are at `README.md`, `DEVELOPING.md`, and `CHANGELOG-cli-v0.1.0.md` (`README.md:1-24`, `DEVELOPING.md:1-20`, `CHANGELOG-cli-v0.1.0.md:1-18`).

## Verification Commands

- **Test Command**: `npm test`; integration suites also exist as `npm run test:integration`, `npm run test:integration:skills`, and `npm run test:integration:workflows` (`package.json:122-137`).
- **Lint Command**: `npm run lint` (`package.json:122-129`).
- **Build Command**: `npm run compile` (`package.json:122-125`).
- **Type Check**: No separate `typecheck` script is declared; `npm run compile` runs `tsc -p ./` (`package.json:122-125`).

## Detailed Findings

### Initialization bootstrap and persisted workflow context

- `paw-init` is the bootstrap skill and explicitly lists generation of work metadata, `.paw/work/<work-id>/`, `WorkflowContext.md`, branch creation/checkout, optional initial commit, and opening the context file for review as its core capabilities (`skills/paw-init/SKILL.md:6-20`).
- The documented initialization parameter surface includes `base_branch`, `target_branch`, `workflow_mode`, review/session settings, `artifact_lifecycle`, issue/custom-input fields, and review-model settings; the table does not define a worktree path or worktree mode parameter (`skills/paw-init/SKILL.md:22-63`).
- The example `WorkflowContext.md` schema persists `Base Branch`, `Target Branch`, `Remote`, `Artifact Lifecycle`, and `Artifact Paths`, but the template shown in the skill does not include a dedicated worktree field (`skills/paw-init/SKILL.md:192-233`).
- The required branch creation sequence is: checkout base branch, pull base branch with `--ff-only`, then create the feature branch with `git checkout -b`; the skill also says never to create the feature branch from the current `HEAD` without explicitly checking out the base branch first (`skills/paw-init/SKILL.md:236-245`).

### Ongoing branch management during workflow execution

- `paw-git-operations` defines branch naming conventions for planning, phase, multi-phase, and docs branches as suffixes derived from the target branch (`skills/paw-git-operations/SKILL.md:8-18`).
- Under PRs strategy, each workflow branch flow starts by checking the current branch, checking out the target branch, optionally setting upstream, pulling latest, then creating a planning/phase/docs branch from that target branch before push and PR creation (`skills/paw-git-operations/SKILL.md:21-53`).
- Under local strategy, the skill says all work happens directly on the target branch: verify current branch, checkout target if needed, set upstream if needed, pull, commit on target, and push target (`skills/paw-git-operations/SKILL.md:55-68`).
- The artifact-lifecycle section in this skill governs whether `.paw/` files are staged or skipped, which is about git tracking of workflow artifacts rather than execution-directory selection (`skills/paw-git-operations/SKILL.md:84-101`).
- The branch-verification checklist requires agents to confirm they are on the expected branch before every commit and to stop immediately if the wrong branch is active (`skills/paw-git-operations/SKILL.md:103-127`).

### Orchestrator assumptions about environment and branch context

- The PAW agent says it should identify work context from the environment using the current branch and existing `.paw/work/` directories or from user input, and then bootstrap with `paw-init` if no matching workflow context exists (`agents/PAW.agent.md:6-10`).
- Implementation prerequisites explicitly require loading `paw-git-operations` and verifying the correct branch, and PR strategy requires phase branches (`agents/PAW.agent.md:52-59`).
- After implementation review passes, the orchestrator's documented behavior is to load `paw-git-operations` to push and/or create PRs; later stage-boundary handling also refers back to branch-oriented push/PR actions rather than a separate execution-location abstraction (`agents/PAW.agent.md:32-35`, `agents/PAW.agent.md:179-186`).

### VS Code initialization command and input surface

- `initializeWorkItemCommand` uses the first open workspace folder as the initialization root, validates that folder as a git repository, collects user inputs, builds prompt arguments, and opens a new PAW chat session with mode `PAW` (`src/commands/initializeWorkItem.ts:82-150`).
- `constructPawPromptArguments()` serializes `target_branch`, `workflow_mode`, `review_strategy`, `review_policy`, `session_policy`, `artifact_lifecycle`, `final_agent_review`, and optional issue/custom instructions; the `_workspacePath` parameter is not emitted into the prompt arguments, and there is no worktree-related field in the constructed config object (`src/commands/initializeWorkItem.ts:13-61`).
- `WorkItemInputs` contains `targetBranch`, workflow/review/session settings, `artifactLifecycle`, `finalReview`, and optional `issueUrl`; no worktree field is present in the input model (`src/ui/userInput.ts:55-109`).
- Minimal mode auto-selects `local` review strategy in the UI, which keeps the issue's current workflow mode aligned with single-target-branch behavior (`src/ui/userInput.ts:195-244`).
- `collectUserInputs()` prompts sequentially for issue URL, branch name (with auto-derive allowed via empty input), workflow mode, review strategy, review policy, session policy, artifact lifecycle, and final review settings (`src/ui/userInput.ts:498-605`).
- The artifact lifecycle picker is explicitly about whether `.paw/work/<slug>` files are committed, persisted, or kept local-only; it does not represent a checkout/worktree-location choice (`src/ui/userInput.ts:23-28`, `src/ui/userInput.ts:84-92`, `src/ui/userInput.ts:350-399`).

### Repository validation and branch auto-derivation prompts

- The repo-validation helper runs `git rev-parse --git-dir` against the workspace path and returns only a boolean result, which is enough to confirm that the opened folder is inside a git repository but does not expose additional repository metadata (`src/git/validation.ts:7-23`).
- `hasUncommittedChanges()` is implemented with `git status --porcelain`, and its own comment says it is not currently used in Phase 2 (`src/git/validation.ts:25-47`).
- Both auto-derive prompt templates begin by asking the agent to inspect the current branch with `git branch --show-current` and, when already on a feature/fix branch, offer reusing that branch before deriving a new one (`src/prompts/branchAutoDeriveWithIssue.template.md:1-5`, `src/prompts/branchAutoDeriveWithDescription.template.md:1-5`).
- Both templates then instruct the agent to inspect remote branches with `git branch -r`, infer naming conventions, check for conflicts, and inform the user about the derived branch name before creation (`src/prompts/branchAutoDeriveWithIssue.template.md:14-23`, `src/prompts/branchAutoDeriveWithDescription.template.md:15-24`).

### UX and configuration implications documented in the current repository

- The workflow guide describes minimal mode as local-only and states that no intermediate planning/phase/docs branches or PRs are created; all work happens on the target branch with only a final PR (`docs/guide/workflow-modes.md:35-57`).
- The Local Strategy section of the same guide documents a branch structure in which all work is committed directly to the target branch before the final PR to the base branch (`docs/guide/workflow-modes.md:115-136`).
- The guide's "Selecting Your Mode" section describes VS Code initialization around workflow mode, review strategy, and custom instructions, while the actual extension code adds prompts for issue URL, branch name, session policy, artifact lifecycle, and final review configuration; neither source currently documents or collects a worktree-specific choice (`docs/guide/workflow-modes.md:206-214`, `src/ui/userInput.ts:513-605`).
- The documented `WorkflowContext.md` example persists `Remote: origin` and `Artifact Paths: auto-derived`, but not a worktree-location field, so the current persisted initialization contract is branch- and artifact-oriented (`skills/paw-init/SKILL.md:192-233`).
- Because the auto-derive prompts explicitly ask whether to reuse the current branch, branch selection UX is presently tied to the active branch of the current working directory (`src/prompts/branchAutoDeriveWithIssue.template.md:1-5`, `src/prompts/branchAutoDeriveWithDescription.template.md:1-5`).

### Test coverage and harness implications documented in the current repository

- The integration harness clones a fixture into a single temporary `workDir`, applies tool policy relative to that directory, and creates the Copilot session with `workingDirectory: fixture.workDir` (`tests/integration/lib/harness.ts:39-69`).
- `TestFixture` is also single-rooted: it initializes one git repository at `workDir`, seeds artifacts into `.paw/work/<work-id>` beneath that root, and reports branch state from that same repository via `getBranch()` (`tests/integration/lib/fixtures.ts:10-18`, `tests/integration/lib/fixtures.ts:20-35`, `tests/integration/lib/fixtures.ts:37-50`).
- The `git-branching` workflow test instructs the agent to create a new feature branch from the current branch, make two selective commits, and report back; the assertions then inspect files under the same fixture checkout and verify that no `git push` tool call happened (`tests/integration/tests/workflows/git-branching.test.ts:26-83`).
- Existing unit coverage in `src/test/suite/userInput.test.ts` focuses on branch-name validation and on the rule that empty branch input is handled separately for auto-derive behavior, which makes this file part of the current branch-input test surface (`src/test/suite/userInput.test.ts:12-23`, `src/test/suite/userInput.test.ts:25-57`).

### Likely touchpoints based on current ownership of responsibilities

- `skills/paw-init/SKILL.md` currently owns the initialization contract: workflow-context schema, branch-creation sequence, and artifact-lifecycle behavior (`skills/paw-init/SKILL.md:12-20`, `skills/paw-init/SKILL.md:192-255`).
- `skills/paw-git-operations/SKILL.md` currently owns strategy-specific branch switching, branch verification, staging discipline, and push/PR mechanics (`skills/paw-git-operations/SKILL.md:19-127`).
- `agents/PAW.agent.md` currently owns environment-based work detection and the orchestration points where branch verification and git operations are invoked (`agents/PAW.agent.md:6-10`, `agents/PAW.agent.md:52-59`, `agents/PAW.agent.md:179-186`).
- `src/commands/initializeWorkItem.ts` and `src/ui/userInput.ts` currently own the VS Code initialization UX and the serialized parameter set passed to the PAW agent (`src/commands/initializeWorkItem.ts:13-61`, `src/commands/initializeWorkItem.ts:82-150`, `src/ui/userInput.ts:55-109`, `src/ui/userInput.ts:498-605`).
- `src/git/validation.ts` currently owns the repository validation primitives available to that command path (`src/git/validation.ts:16-47`).
- `src/prompts/branchAutoDeriveWithIssue.template.md` and `src/prompts/branchAutoDeriveWithDescription.template.md` currently own the agent-facing auto-derive branch UX (`src/prompts/branchAutoDeriveWithIssue.template.md:1-23`, `src/prompts/branchAutoDeriveWithDescription.template.md:1-24`).
- `tests/integration/lib/harness.ts`, `tests/integration/lib/fixtures.ts`, and `tests/integration/tests/workflows/git-branching.test.ts` currently own the single-checkout integration test model for git behavior (`tests/integration/lib/harness.ts:39-113`, `tests/integration/lib/fixtures.ts:10-55`, `tests/integration/tests/workflows/git-branching.test.ts:26-83`).
- `docs/guide/workflow-modes.md` and `mkdocs.yml` currently own the user-facing explanation and navigation for workflow-mode and local-branch behavior (`docs/guide/workflow-modes.md:35-57`, `docs/guide/workflow-modes.md:115-136`, `mkdocs.yml:61-78`).

## Code References

- `skills/paw-init/SKILL.md:22-63` - Initialization parameter surface for workflow bootstrap.
- `skills/paw-init/SKILL.md:192-245` - Documented `WorkflowContext.md` fields and required branch-creation sequence.
- `skills/paw-git-operations/SKILL.md:21-68` - PRs/local branching behavior during workflow execution.
- `skills/paw-git-operations/SKILL.md:84-127` - Artifact staging rules and branch verification requirements.
- `agents/PAW.agent.md:6-10` - Environment-based work detection using current branch and `.paw/work/` directories.
- `agents/PAW.agent.md:52-59` - Implementation prerequisite to verify the correct branch.
- `src/commands/initializeWorkItem.ts:13-61` - Prompt-argument construction for the PAW agent.
- `src/commands/initializeWorkItem.ts:82-150` - Extension command flow from workspace validation to PAW chat invocation.
- `src/ui/userInput.ts:55-109` - `WorkItemInputs` shape.
- `src/ui/userInput.ts:195-244` - Minimal mode local-strategy auto-selection.
- `src/ui/userInput.ts:350-399` - Artifact lifecycle input surface.
- `src/ui/userInput.ts:498-605` - Full initialization prompt flow.
- `src/git/validation.ts:16-47` - Git repository and working-tree validation helpers.
- `src/prompts/branchAutoDeriveWithIssue.template.md:1-23` - Issue-based branch auto-derive UX.
- `src/prompts/branchAutoDeriveWithDescription.template.md:1-24` - Description-based branch auto-derive UX.
- `tests/integration/lib/harness.ts:39-113` - Single-working-directory integration harness setup.
- `tests/integration/lib/fixtures.ts:10-50` - Temp repository fixture and branch inspection helper.
- `tests/integration/tests/workflows/git-branching.test.ts:26-83` - Current git-branching workflow test behavior.
- `docs/guide/workflow-modes.md:35-57` - Minimal mode local-only documentation.
- `docs/guide/workflow-modes.md:115-136` - Local strategy branch structure and trade-offs.

## Architecture Documentation

- The current workflow architecture separates concerns between command-layer input gathering (`src/commands/initializeWorkItem.ts`, `src/ui/userInput.ts`), agent/skill orchestration (`agents/PAW.agent.md`), and git procedure descriptions (`skills/paw-init/SKILL.md`, `skills/paw-git-operations/SKILL.md`) (`src/commands/initializeWorkItem.ts:82-150`, `src/ui/userInput.ts:498-605`, `agents/PAW.agent.md:169-186`, `skills/paw-init/SKILL.md:6-20`, `skills/paw-git-operations/SKILL.md:19-68`).
- Within that architecture, branch state is the primary execution-location primitive: bootstrap stores base/target branches, orchestration detects current branch, and git procedures verify/switch branches as part of routine stage execution (`skills/paw-init/SKILL.md:192-245`, `agents/PAW.agent.md:6-10`, `agents/PAW.agent.md:52-59`, `skills/paw-git-operations/SKILL.md:21-68`, `skills/paw-git-operations/SKILL.md:103-127`).
- The test architecture mirrors that model by giving each integration session one temporary repo root and one working directory, then checking branch state and file creation within that repo (`tests/integration/lib/harness.ts:39-69`, `tests/integration/lib/fixtures.ts:10-35`, `tests/integration/tests/workflows/git-branching.test.ts:63-83`).

## Open Questions

- The inspected initialization contract exposes branch-centric fields but no worktree field in either the prompt arguments or the documented `WorkflowContext.md` schema; the issue asks planning to determine the eventual UX/architecture for worktree-aware execution (`src/commands/initializeWorkItem.ts:13-61`, `skills/paw-init/SKILL.md:192-233`).
- The current repository validation helper returns only a boolean, so any later plan that needs repository-root, main-worktree, or alternate-worktree metadata would require additional implementation research beyond the helper as it exists today (`src/git/validation.ts:16-23`).
- The current integration harness and fixtures are centered on one `fixture.workDir`; the present test files do not yet specify how a future worktree-oriented scenario should be represented in test setup (`tests/integration/lib/harness.ts:39-69`, `tests/integration/lib/fixtures.ts:10-35`, `tests/integration/tests/workflows/git-branching.test.ts:26-83`).
