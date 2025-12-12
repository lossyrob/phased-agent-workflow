# Cross-Repository Workflow Implementation Plan

## Overview

This plan implements a cross-repository workflow coordination system that enables PAW to orchestrate feature development across multiple git repositories in a VS Code multi-root workspace. Users will select "Cross-Repository" workflow type during initialization, and cross-repository agents (PAW-M## series) will create holistic specifications, generate execution plans with repository sequencing, and initialize standard PAW child workflows in each affected repository with scoped context.

Cross-repo artifacts live in `.paw/multi-work/<work-id>/` under a **user-selected storage root folder** (one of the workspace folders). The storage root **does not need to be a git repository** and is intended to support “notes / coordination” folders. Child workflows maintain the standard `.paw/work/<work-id>/` structure inside each selected git repository and function independently.

## Current State Analysis

PAW currently supports single-repository workflows with:
- Initialization flow via VS Code command (`paw.initializeWorkItem`) collecting branch, mode, strategy, handoff parameters
- Context management using `WorkflowContext.md` in `.paw/work/<feature-slug>/` directories
- Agent system with `paw_call_agent` tool for handoffs and `paw_get_context` tool for retrieving workflow/custom instructions
- Multi-root workspace support in context tool (already searches all workspace folders for Work ID directories)
- Standard PAW agents (PAW-01A through PAW-05) plus Review workflow agents (PAW-R## series)

### Key Discoveries:
- `src/commands/initializeWorkItem.ts:41-50`: Uses `vscode.workspace.workspaceFolders?.[0]` for single-folder detection
- `src/ui/userInput.ts:119-162`: Workflow mode selection (full/minimal/custom) happens in `collectWorkflowMode()`
- `src/tools/contextTool.ts:229-266`: `getWorkspaceFolderPaths()` and `resolveWorkspacePath()` already iterate all workspace folders
- `src/git/validation.ts:10-16`: `validateGitRepository()` uses `git rev-parse --git-dir` for reliable detection
- Review agents follow PAW-R## naming pattern (PAW-R1A, PAW-R1B, PAW-R2A, etc.) established in `agents/` directory

## Desired End State

After implementation:
- Users can select "Cross-Repository" workflow type from a dropdown during initialization
- Users can select a **storage root folder** (any workspace folder, git not required) for cross-repo artifacts
- System detects all git repositories in multi-root workspace and prompts for affected repository selection
- Cross-repository agents (PAW-M01A Cross-Repo Spec, PAW-M01B Cross-Repo Spec Researcher, PAW-M02A Cross-Repo Code Researcher, PAW-M02B Cross-Repo Impl Planner, PAW-M03 Cross-Repo Validator) coordinate multi-repository features
- Cross-repo artifacts stored in `.paw/multi-work/<work-id>/` with `CrossRepoContext.md`, `CrossRepoSpec.md`, `CrossRepoPlan.md`
- Child workflows initialized with repository-specific context excerpts, functioning as standard PAW workflows
- Execution plan provides numbered repository sequence with dependency rationale
- Validation phase performs consistency checks and integration test guidance

### Verification:
- User can complete end-to-end cross-repository workflow from initialization to validation
- Cross-repo workflow works when the storage root folder is non-git (e.g., notes folder)
- Child workflows operate independently if cross-repo artifacts are deleted
- All five PAW-M## agents can be invoked via `paw_call_agent` tool
- Context tool resolves `.paw/multi-work/` locations correctly
- Standard PAW workflows remain unaffected (backward compatible)

## What We're NOT Doing

- Automated integration test execution (validation provides guidance only)
- Phase-level sequencing within repositories (repository-level sequencing only for v1)
- Automatic PR creation across multiple repositories
- Real-time progress tracking of child workflows by cross-repository agents
- Cross-repository dependency management at package/module level
- Nested repository support (repositories within repositories)
- Automatic merge order enforcement (validation provides suggestions)
- Migration of existing single-repository PAW workflows to cross-repository workflows
- Modifications to Review workflow (PAW-R##) implementation

## Implementation Approach

The implementation follows PAW's existing extension architecture by adding workflow type as a pre-flight selection before workflow mode. The cross-repository workflow type triggers alternate initialization logic that detects multi-root workspaces, validates multiple git repositories, and invokes cross-repository agents (PAW-M## series) instead of standard PAW agents. Cross-repository agents follow the same template structure, component system, and handoff patterns as existing agents. The context tool is extended to resolve both `.paw/work/` and `.paw/multi-work/` locations, maintaining backward compatibility while supporting the new coordinator pattern. Child workflow initialization reuses the existing workflow initialization flow but passes repository-specific context excerpts derived from the cross-repository specification.

## Phase Summary

1. **Phase 1: Workflow Type Selection** - Add workflow type dropdown (Implementation/Cross-Repository/Review) to initialization flow before workflow mode collection
2. **Phase 2: Multi-Repository Detection** - Implement repository detection across multi-root workspace with git validation for each folder
2.5. **Phase 2.5: Cross-Repo Storage Root Selection** - Prompt for a workspace folder to store `.paw/multi-work/<work-id>/` artifacts (git not required)
3. **Phase 3: Cross-Repository Agent Definitions** - Create five PAW-M## agent files with instructions, components, and handoff logic
4. **Phase 4: Cross-Repo Artifact Management** - Implement `.paw/multi-work/` directory structure, CrossRepoContext.md format, and initialization prompt templates
5. **Phase 5: Context Tool Extensions** - Extend `paw_get_context` to resolve cross-repository contexts and load CrossRepoContext.md
6. **Phase 6: Child Workflow Initialization** - Implement mechanism for initializing standard PAW workflows in individual repositories with scoped context

---

## Phase 1: Workflow Type Selection

### Overview
Add workflow type selection as the first step in PAW initialization, presenting users with Implementation (single-repo), Cross-Repository (multi-repo), and Review workflow options. This phase modifies the extension's UI layer to collect workflow type before existing workflow mode collection.

### Changes Required:

#### 1. Workflow Type Input Collection
**File**: `src/ui/userInput.ts`
**Changes**:
- Add `WorkflowType` enum with values: `'implementation' | 'cross-repository' | 'review'`
- Add `workflowType` field to `WorkItemInputs` interface
- Implement `collectWorkflowType()` function returning `WorkflowType | undefined`
- Quick Pick menu with three options:
  - "Implementation" (description: "Standard single-repository workflow", detail: "Work within one git repository")
  - "Cross-Repository" (description: "Multi-repository coordination workflow", detail: "Coordinate changes across multiple repositories in a workspace")
  - "Review" (description: "Code review workflow", detail: "Structured review of existing code changes")
- Update `collectUserInputs()` to call `collectWorkflowType()` first, before target branch collection
- Follow existing Quick Pick patterns established in `collectWorkflowMode()` at lines 119-162

**Tests**:
- Unit tests for `collectWorkflowType()` in `src/test/suite/userInput.test.ts`
- Test cases: user selects each option, user cancels selection
- Follow test patterns for existing input collection functions

#### 2. Multi-Root Workspace Validation
**File**: `src/commands/initializeWorkItem.ts`
**Changes**:
- After collecting workflow type, add validation: if type is `'cross-repository'`, check `vscode.workspace.workspaceFolders.length > 1`
- If cross-repository selected but only one folder open, show error: "Cross-Repository workflow requires a multi-root workspace. Please add multiple folders to your workspace."
- Integrate validation between lines 41-62 (after git validation, before custom instructions check)
- Follow error message patterns established at lines 45-48 and 57-62

**Tests**:
- Integration tests in `src/test/suite/extension.test.ts`
- Test cases: single folder + cross-repo selection → error, multi-root + cross-repo → proceeds
- Mock `vscode.workspace.workspaceFolders` for different workspace configurations

#### 3. Prompt Construction Branch Logic
**File**: `src/prompts/workflowInitPrompt.ts`
**Changes**:
- Add `workflowType` parameter to `constructAgentPrompt()` function signature
- Add conditional prompt construction:
  - If `workflowType === 'implementation'`, use existing logic (current behavior)
  - If `workflowType === 'cross-repository'`, construct prompt invoking `PAW-M01A Cross-Repo Spec` agent
  - If `workflowType === 'review'`, construct prompt invoking `PAW-R1A Understanding` agent
- Create template variable `WORKFLOW_TYPE` for substitution
- Follow existing branching patterns for review strategy at lines 155-258

**Tests**:
- Unit tests for prompt construction with each workflow type
- Verify correct agent invocation for each type
- Test cases: implementation type uses PAW-01A, cross-repository uses PAW-M01A, review uses PAW-R1A

#### 4. Extension Command Integration
**File**: `src/commands/initializeWorkItem.ts`
**Changes**:
- Update `constructAgentPrompt()` call at line 103 to pass `inputs.workflowType` parameter
- Add logging for workflow type at line 95: `outputChannel.appendLine(\`[INFO] Workflow type: ${inputs.workflowType}\`)`
- No changes to command registration or activation logic in `src/extension.ts`

**Tests**:
- End-to-end test verifying workflow type flows through initialization
- Test cases: complete initialization with each workflow type, verify correct agent invoked

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `npm run compile`
- [ ] All unit tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Extension activates without errors in VS Code Extension Host

#### Manual Verification:
- [ ] Running "PAW: New PAW Workflow" command shows workflow type selection as first prompt
- [ ] Selecting "Implementation" proceeds to existing workflow (backward compatible)
- [ ] Selecting "Cross-Repository" in single-folder workspace shows error message
- [ ] Selecting "Cross-Repository" in multi-root workspace proceeds to workflow mode collection
- [ ] Selecting "Review" proceeds to review workflow initialization (when Review agents exist)

### Phase 1 Implementation Complete

**Status**: Phase 1 implementation complete. All automated verification passing (TypeScript compilation, unit tests, linting).

**Changes Completed**:
- Added `WorkflowType` enum with three values: 'implementation', 'cross-repository', 'review'
- Implemented `collectWorkflowType()` function with Quick Pick UI showing all three workflow type options
- Added `workflowType` field to `WorkItemInputs` interface
- Updated `collectUserInputs()` to call `collectWorkflowType()` as first step
- Added multi-root workspace validation in `initializeWorkItem.ts` - shows error if cross-repository selected with single folder
- Updated `constructAgentPrompt()` signature to accept `workflowType` as first parameter
- Added `WORKFLOW_TYPE` template variable to `PromptVariables` interface
- Updated prompt template to display workflow type and provide conditional handoff instructions based on workflow type
- Updated all 15 test calls to `constructAgentPrompt()` to include workflow type parameter (all using 'implementation' for backward compatibility)

**Verification Results**:
- ✅ TypeScript compilation: Success (no errors)
- ✅ Unit tests: 143 passing (925ms)
- ✅ Linting: No new errors in changed files (pre-existing errors in other test files unaffected)
- ✅ Git commit: a81c645

**Commit**: Phase 1 changes committed to target branch `feature/142-cross-repository-workflow-supervisor` (local strategy)

**Manual Testing**: Deferred to user - requires VS Code Extension Host environment to test UI interactions.

**Review Notes for Implementation Review Agent**:
- Verify workflow type selection UI provides clear descriptions for each workflow type
- Check that multi-root workspace validation error message is helpful and actionable
- Confirm prompt template conditional logic correctly maps workflow types to appropriate first-stage agents
- Ensure backward compatibility: existing single-repository workflows use 'implementation' type seamlessly

---

## Phase 2: Multi-Repository Detection

### Overview
Implement repository detection and selection for cross-repository workflows. When workflow type is "Cross-Repository", iterate all workspace folders, validate each as a git repository, and present a multi-select list for user to choose affected repositories.

### Changes Required:

#### 1. Git Repository Detection Utility
**File**: `src/git/validation.ts`
**Changes**:
- Add `detectGitRepositories()` async function taking `workspaceFolders: vscode.WorkspaceFolder[]` parameter
- Returns `Promise<GitRepository[]>` where `GitRepository = { path: string; name: string; isValid: boolean }`
- Iterate folders, call `validateGitRepository()` for each, collect results
- Include folder name from `workspaceFolder.name` for display purposes
- Integration with existing `validateGitRepository()` at lines 10-16

**Tests**:
- Unit tests for `detectGitRepositories()` with mocked workspace folders
- Test cases: all folders are repos, some are repos, none are repos, mixed git/non-git

#### 2. Repository Selection UI
**File**: `src/ui/userInput.ts`
**Changes**:
- Add `RepositorySelection` interface: `{ path: string; name: string }[]`
- Implement `collectAffectedRepositories()` function taking detected repositories as parameter
- Use `vscode.window.showQuickPick()` with `canPickMany: true` option
- Quick Pick items show repository name with path as description
- Returns `RepositorySelection[] | undefined` (undefined if user cancels)
- Validate at least one repository selected before returning
- Follow multi-select patterns from VS Code API documentation

**Tests**:
- Unit tests for `collectAffectedRepositories()`
- Test cases: select multiple repos, select one repo, cancel selection, attempt to select zero repos

#### 3. Cross-Repository Initialization Flow
**File**: `src/commands/initializeWorkItem.ts`
**Changes**:
- After workflow type validation (Phase 1), add branch for `workflowType === 'cross-repository'`:
  - Call `detectGitRepositories(vscode.workspace.workspaceFolders)`
  - Filter to only valid repositories
  - If zero valid repos found, show error: "No git repositories detected in workspace"
  - Call `collectAffectedRepositories()` with valid repos
  - Store selected repositories in variable for prompt construction
- Integrate between existing validation (lines 54-62) and custom instructions check (lines 66-75)
- Log detected and selected repositories to output channel

**Tests**:
- Integration tests for complete cross-repository initialization flow
- Test cases: successful multi-repo detection and selection, no repos detected, user cancels repo selection

#### 4. Prompt Template Variable Addition
**File**: `src/prompts/workflowInitPrompt.ts`
**Changes**:
- Add `affectedRepositories?: RepositorySelection[]` to `PromptVariables` type
- When `workflowType === 'cross-repository'`, format repository list as markdown:
  ```
  Affected Repositories:
  - repository-name-1 (path: /full/path/to/repo1)
  - repository-name-2 (path: /full/path/to/repo2)
  ```
- Add `{{AFFECTED_REPOSITORIES}}` placeholder to cross-repository template
- Substitute variable during prompt construction

**Tests**:
- Unit tests for prompt construction with affected repositories
- Test cases: one repo, multiple repos, repository list formatting

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compiles: `npm run compile`
- [x] Unit tests pass: `npm test`
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Multi-root workspace with 3+ folders: repository detection shows all git repos, excludes non-git folders
- [ ] Selecting repositories from multi-select list proceeds to workflow mode collection
- [ ] Selected repository information appears in constructed agent prompt
- [ ] Single-root workspace with cross-repository type shows appropriate error
- [ ] Canceling repository selection returns to VS Code without errors

### Phase 2 Implementation Complete

**Status**: Phase 2 implementation complete. All automated verification passing (TypeScript compilation, unit tests, linting in modified files).

**Changes Completed**:
- Added `GitRepository` interface with path, name, and isValid fields
- Implemented `detectGitRepositories()` function that validates all workspace folders in parallel using existing `validateGitRepository()`
- Added `RepositorySelection` interface for cross-repository workflow data
- Implemented `collectAffectedRepositories()` function with multi-select Quick Pick UI (pre-selects all repos by default)
- Updated `collectUserInputs()` to accept optional detected repositories and call `collectAffectedRepositories()` when workflow type is cross-repository
- Added `affectedRepositories` field to `WorkItemInputs` interface
- Updated `initializeWorkItem.ts` to detect repositories in multi-root workspaces before collecting user inputs
- Updated `constructAgentPrompt()` signature to accept optional affected repositories
- Added `formatAffectedRepositories()` helper function to format repository list as markdown
- Added `AFFECTED_REPOSITORIES` to `PromptVariables` interface and template substitution
- Added `{{AFFECTED_REPOSITORIES}}` placeholder to prompt template in Parameters Provided section

**Verification Results**:
- ✅ TypeScript compilation: Success (no errors)
- ✅ Unit tests: 143 passing
- ✅ Linting: No new errors in changed files (pre-existing errors in test files unaffected)
- ✅ Git commit: 760c65a

**Commit**: Phase 2 changes committed to target branch `feature/142-cross-repository-workflow-supervisor` (local strategy)

**Manual Testing**: Deferred to user - requires VS Code Extension Host environment to test multi-root workspace UI interactions.

**Review Notes for Implementation Review Agent**:
- Verify repository detection correctly validates each workspace folder as a git repository
- Check that multi-select Quick Pick provides clear presentation of repository names and paths
- Confirm affected repositories are formatted correctly in the agent prompt
- Ensure backward compatibility: single-repository workflows continue working without affected repositories

### Phase 2 Review Complete

**Reviewed by**: PAW-03B Impl Reviewer
**Review Date**: December 11, 2025

**Review Summary**:
Phase 2 implementation reviewed and approved. Code is well-structured with clear separation of concerns:
- Git detection utilities properly placed in `src/git/validation.ts`
- UI collection functions in `src/ui/userInput.ts` follow established patterns
- Prompt construction integrates cleanly with existing template system

**Quality Assessment**:
- ✅ All tests passing (143 tests)
- ✅ TypeScript compilation successful
- ✅ No lint errors in modified files
- ✅ Code follows project conventions
- ✅ Excellent documentation with JSDoc comments and examples
- ✅ Parallel processing used efficiently in `detectGitRepositories()`

**Small Refactor Applied**:
- Simplified `detectGitRepositories()` by removing unnecessary intermediate `results` array and returning `Promise.all` directly (commit: ac423d1)

**Design Notes**:
- Repository detection happens early in initialization flow, before user inputs collection - this is correct as the workflow type selection depends on knowing if multi-root workspace is available
- Pre-selecting all repositories in multi-select UI is good UX - users typically want all repos affected
- Affected repositories formatting with indented bullet list integrates well with prompt template structure

**No Issues Found**:
- All docstrings present and descriptive
- Error handling covers cancellation and empty selection scenarios
- Backward compatibility maintained - single-repo workflows unaffected

**Pushed**: Changes pushed to `origin/feature/142-cross-repository-workflow-supervisor`

---

## Phase 2.5: Cross-Repo Storage Root Selection

### Overview
Add an explicit **storage root folder** selection when initializing a cross-repository workflow. This folder is where cross-repo coordinator artifacts will be stored under `.paw/multi-work/<work-id>/`.

Key requirement: **The storage root does not need to be a git repository.** This supports workspaces that include non-git folders for notes and coordination.

### Changes Required

#### 1. Storage Root Selection UI
**File**: `src/ui/userInput.ts`
**Changes**:
- Add a new input field to `WorkItemInputs`, e.g. `storageRoot?: { name: string; path: string }` (present only for cross-repository workflows)
- Implement `collectStorageRoot()` that presents a Quick Pick of all workspace folders (label: folder name, description: folder path)
- Call `collectStorageRoot()` when `workflowType === 'cross-repository'` before collecting affected repositories

**Tests**:
- Unit tests for `collectStorageRoot()` selection and cancel

#### 2. Cross-Repo Validation Logic (Drop Git Requirement For Storage Root)
**File**: `src/commands/initializeWorkItem.ts`
**Changes**:
- For cross-repository workflows, stop assuming `workspaceFolders?.[0]` is the git repo to validate
- Instead, validate:
  - Workspace is multi-root (already implemented)
  - At least one affected repository is a valid git repository (from the existing selection flow)
  - The selected storage root folder exists (no git requirement)

**Tests**:
- Integration tests for cross-repo init when the first workspace folder is non-git but other folders are git repos

#### 3. Prompt / Context Plumbing
**File**: `src/prompts/workflowInitPrompt.ts` and `src/prompts/workItemInitPrompt.template.md`
**Changes**:
- Add a template variable (e.g. `STORAGE_ROOT`) and include it in the “Parameters Provided” section
- Ensure the generated instructions for cross-repo agents make it explicit that `.paw/multi-work/<work-id>/` lives under the selected storage root

### Success Criteria
- Cross-repo initialization works even if the “notes” folder is first in the workspace folder order
- Cross-repo initialization stores coordinator artifacts under the selected storage root (git not required)
- Existing single-repo initialization remains unchanged

### Phase 2.5 Implementation Complete

**Status**: Phase 2.5 implementation complete.

**Changes Completed**:
- Added storage root selection UI for cross-repository workflows (`collectStorageRoot()` + `WorkItemInputs.storageRoot`)
- Updated initialization flow so cross-repository workflows no longer require `workspaceFolders[0]` to be a git repository
- Added `STORAGE_ROOT` prompt variable and included explicit cross-repo storage root guidance in the initialization prompt

**Verification Results**:
- ✅ TypeScript compilation: `npm run compile`
- ✅ Extension tests: `npm test`

**Manual Testing**: Deferred to user (VS Code UI prompts).

---

## Phase 3: Cross-Repository Agent Definitions

### Overview
Create five cross-repository agents (PAW-M01A, PAW-M01B, PAW-M02A, PAW-M02B, PAW-M03) following established agent template structure with YAML frontmatter, instruction content, and component integration. These agents coordinate multi-repository workflows and hand off to each other using `paw_call_agent` tool.

### Changes Required:

#### 1. PAW-M01A Cross-Repo Spec Agent
**File**: `agents/PAW-M01A Cross-Repo Spec.agent.md`
**Changes**:
- Create agent file with YAML frontmatter: `description: 'Phased Agent Workflow: Cross-Repo Spec Agent'`
- Adapt instructions from `PAW-01A Specification.agent.md` with cross-repository focus:
  - Accept list of affected repositories from initialization prompt
  - Create holistic specification considering all repositories
  - Identify which repositories need changes and how they interact
  - Output `CrossRepoSpec.md` instead of `Spec.md`
  - Store artifacts in `.paw/multi-work/<work-id>/` directory
- Include {{PAW_CONTEXT}} component placeholder (will reference cross-repo context component)
- Handoff logic: after spec complete, hand off to `PAW-M01B Cross-Repo Spec Researcher` if research needed
- Follow template structure from PAW-01A at lines 1-80

**Tests**:
- Verify agent file lints successfully: `./scripts/lint-agent.sh agents/PAW-M01A\ Cross-Repo\ Spec.agent.md`
- Manual test: invoke agent via chat, verify it creates CrossRepoSpec.md in correct location

#### 2. PAW-M01B Cross-Repo Spec Researcher
**File**: `agents/PAW-M01B Cross-Repo Spec Researcher.agent.md`
**Changes**:
- Create agent with YAML frontmatter: `description: 'Phased Agent Workflow: Cross-Repo Spec Researcher'`
- Adapt from `PAW-01B Spec Researcher.agent.md`
- Research existing patterns across multiple repositories
- Support repository-specific research questions
- Create `CrossRepoSpecResearch.md` artifact
- Hand off back to PAW-M01A after research completion
- Include instructions for researching integration points between repositories

**Tests**:
- Agent linting: `./scripts/lint-agent.sh agents/PAW-M01B\ Cross-Repo\ Spec\ Researcher.agent.md`
- Manual test: agent creates research artifact with findings from multiple repos

#### 3. PAW-M02A Cross-Repo Code Researcher
**File**: `agents/PAW-M02A Cross-Repo Code Researcher.agent.md`
**Changes**:
- Create agent with YAML frontmatter: `description: 'Phased Agent Workflow: Cross-Repo Code Researcher'`
- Adapt from `PAW-02A Code Researcher.agent.md`
- Research code structure across repositories
- Identify integration points, shared interfaces, API boundaries
- Create `CrossRepoCodeResearch.md` artifact
- Hand off to PAW-M02B Cross-Repo Impl Planner after research
- Include repository context awareness in research scope

**Tests**:
- Agent linting: `./scripts/lint-agent.sh agents/PAW-M02A\ Cross-Repo\ Code\ Researcher.agent.md`
- Manual test: agent analyzes code across multiple repositories

#### 4. PAW-M02B Cross-Repo Impl Planner
**File**: `agents/PAW-M02B Cross-Repo Impl Planner.agent.md`
**Changes**:
- Create agent with YAML frontmatter: `description: 'Phased Agent Workflow: Cross-Repo Impl Planner'`
- Adapt from `PAW-02B Impl Planner.agent.md`
- Create `CrossRepoPlan.md` with **Execution Sequence** section
- Numbered sequence listing repositories in dependency order with rationale
- For each repository, specify changes needed and context excerpt for child workflow
- Include instructions for scoping context (what to pass to child workflows)
- Hand off to child workflow initialization (described in Phase 6)
- Store plan in `.paw/multi-work/<work-id>/` directory

**Tests**:
- Agent linting: `./scripts/lint-agent.sh agents/PAW-M02B\ Cross-Repo\ Impl\ Planner.agent.md`
- Manual test: agent creates plan with clear execution sequence

#### 5. PAW-M03 Cross-Repo Validator
**File**: `agents/PAW-M03 Cross-Repo Validator.agent.md`
**Changes**:
- Create agent with YAML frontmatter: `description: 'Phased Agent Workflow: Cross-Repo Validator'`
- New agent (no single-repo equivalent to adapt from)
- Responsibilities:
  - Load child workflow artifacts from each affected repository
  - Compare implementations against original CrossRepoSpec.md
  - Perform consistency checks across repositories
  - Provide integration test guidance
  - Suggest PR merge order based on dependencies
- Can be invoked at any stage via `paw_call_agent` tool
- Output validation report to `.paw/multi-work/<work-id>/ValidationReport.md`

**Tests**:
- Agent linting: `./scripts/lint-agent.sh agents/PAW-M03\ Cross-Repo\ Validator.agent.md`
- Manual test: agent reads artifacts from multiple repos and generates validation report

#### 6. Cross-Repository Context Component (Optional)
**File**: `agents/components/cross-repo-context.component.md`
**Changes**:
- Create reusable component for cross-repository context instructions
- Content includes:
  - How to call `paw_get_context` with work ID
  - CrossRepoContext.md structure explanation
  - Affected repositories list format
  - Repository-specific context scoping guidelines
- Component can be included in all PAW-M## agents via `{{CROSS_REPO_CONTEXT}}` placeholder
- Follow component structure from `agents/components/paw-context.component.md`

**Tests**:
- Verify component expands correctly in agent template rendering
- Manual test: agents using component display correct context instructions

#### 7. Agent Registration
**File**: `src/tools/handoffTool.ts`
**Changes**:
- Add five new agent names to `AgentName` enum at lines 6-15:
  - `"PAW-M01A Cross-Repo Spec"`
  - `"PAW-M01B Cross-Repo Spec Researcher"`
  - `"PAW-M02A Cross-Repo Code Researcher"`
  - `"PAW-M02B Cross-Repo Impl Planner"`
  - `"PAW-M03 Cross-Repo Validator"`
- Follow existing enum pattern
- Enables `paw_call_agent` tool to invoke cross-repository agents

**Tests**:
- TypeScript compiles with new enum values
- Unit tests for handoff tool with cross-repository agent names

### Success Criteria:

#### Automated Verification:
- [ ] All agent files pass linting: `./scripts/lint-agent.sh agents/PAW-M*.agent.md`
- [ ] TypeScript compiles: `npm run compile`
- [ ] Handoff tool unit tests pass

#### Manual Verification:
- [ ] Each PAW-M## agent can be invoked via chat with agent mode
- [ ] Agents create artifacts in `.paw/multi-work/<work-id>/` directory
- [ ] Agent handoffs work correctly (M01A → M01B → M01A → M02A → M02B → M03)
- [ ] Agents display context instructions when invoked
- [ ] Cross-repository terminology used consistently throughout agent instructions

---

## Phase 4: Cross-Repo Artifact Management

### Overview
Implement `.paw/multi-work/<work-id>/` directory structure and CrossRepoContext.md format for storing cross-repository workflow metadata. Create initialization prompt templates for cross-repository workflows.

### Changes Required:

#### 1. CrossRepoContext.md Structure Definition
**File**: `src/prompts/crossRepoWorkflowContext.template.md` (new file)
**Changes**:
- Create template defining CrossRepoContext.md format:
  ```markdown
  # CrossRepoContext
  
  Work Title: {{WORK_TITLE}}
  Work ID: {{WORK_ID}}
  Workflow Type: Cross-Repository
  Workflow Mode: {{WORKFLOW_MODE}}
  Review Strategy: {{REVIEW_STRATEGY}}
  Handoff Mode: {{HANDOFF_MODE}}
  Issue URL: {{ISSUE_URL}}
  Affected Repositories:
  {{AFFECTED_REPOSITORIES}}
  Artifact Paths: .paw/multi-work/{{WORK_ID}}/
  ```
- Follow structure from existing WorkflowContext.md (described in CodeResearch.md lines 70-95)
- Add "Affected Repositories" field listing selected repositories
- Add "Workflow Type: Cross-Repository" to distinguish from standard workflows

**Tests**:
- Template loads correctly from both compiled and source locations
- Variable substitution produces valid CrossRepoContext.md

#### 2. Cross-Repository Initialization Prompt Template
**File**: `src/prompts/crossRepoInit.template.md` (new file)
**Changes**:
- Create prompt template for invoking PAW-M01A Cross-Repo Spec agent
- Include:
  - Work ID: `{{WORK_ID}}`
  - Affected repositories list: `{{AFFECTED_REPOSITORIES}}`
  - Issue URL or work description: `{{ISSUE_CONTEXT}}`
  - Instructions to create `.paw/multi-work/{{WORK_ID}}/` directory
  - Instructions to write CrossRepoContext.md
  - Instructions to begin specification phase
- Follow structure from `workItemInitPrompt.template.md`

**Tests**:
- Template renders with all variables substituted
- Generated prompt correctly invokes PAW-M01A agent

#### 3. Prompt Construction for Cross-Repository Type
**File**: `src/prompts/workflowInitPrompt.ts`
**Changes**:
- Add `loadCrossRepoTemplate()` function following pattern from `loadTemplate()` at lines 57-93
- Add `constructCrossRepoPrompt()` function:
  - Takes workflow parameters plus affected repositories
  - Loads `crossRepoInit.template.md` template
  - Substitutes variables including repository list
  - Returns complete prompt string
- Update `constructAgentPrompt()` to call `constructCrossRepoPrompt()` when `workflowType === 'cross-repository'`
- Follow branching pattern for different workflow types

**Tests**:
- Unit tests for `constructCrossRepoPrompt()`
- Test cases: with issue URL, with work description, multiple repositories
- Verify prompt invokes PAW-M01A agent correctly

#### 4. Directory Structure Creation Instructions
**File**: `agents/PAW-M01A Cross-Repo Spec.agent.md`
**Changes**:
- Add initialization section instructing agent to:
  - Create `.paw/multi-work/<work-id>/` directory at workspace root
  - Write CrossRepoContext.md using provided template variables
  - Create `prompts/` subdirectory for research prompts
  - Verify directory is NOT inside any git repository
- Include error handling if `.paw/multi-work/<work-id>/` already exists
- Follow patterns from PAW-01A Specification agent initialization

**Tests**:
- Manual test: agent creates directory structure at correct location
- Manual test: CrossRepoContext.md contains all required fields

### Success Criteria:

#### Automated Verification:
- [ ] Template files load correctly: verify in unit tests
- [ ] TypeScript compiles: `npm run compile`
- [ ] Prompt construction unit tests pass

#### Manual Verification:
- [ ] PAW-M01A agent creates `.paw/multi-work/<work-id>/` at workspace root
- [ ] CrossRepoContext.md file contains all fields with correct values
- [ ] Directory is not created inside any git repository
- [ ] Multiple cross-repository workflows can coexist (different work IDs)
- [ ] Artifacts directory structure matches `.paw/work/` structure conventions

---

## Phase 5: Context Tool Extensions

### Overview
Extend `paw_get_context` tool to resolve both `.paw/work/` (standard) and `.paw/multi-work/` (cross-repository) locations, load CrossRepoContext.md alongside WorkflowContext.md, and maintain backward compatibility with existing workflows.

### Changes Required:

#### 1. Multi-Work Directory Resolution
**File**: `src/tools/contextTool.ts`
**Changes**:
- Extend `resolveWorkspacePath()` function at lines 244-266:
  - First search for `.paw/work/<feature-slug>/` (existing behavior)
  - If not found, search for `.paw/multi-work/<feature-slug>/`
  - Return `{ workspacePath, featureDir, workflowType }` where `workflowType` is `'implementation' | 'cross-repository'`
  - Maintain backward compatibility: standard workflows continue working unchanged
- Update error message if neither location found: "Work ID '{feature-slug}' not found in .paw/work/ or .paw/multi-work/ directories"

**Tests**:
- Unit tests for path resolution with both directory types
- Test cases: standard workflow, cross-repo workflow, non-existent work ID, both directories exist (prioritize .paw/work/)

#### 2. Context File Loading
**File**: `src/tools/contextTool.ts`
**Changes**:
- Update `getContext()` function at lines 320-341:
  - After resolving workspace path, check `workflowType`
  - If `workflowType === 'cross-repository'`, load `CrossRepoContext.md` instead of `WorkflowContext.md`
  - Use same loading logic (`loadWorkflowContext()` function) but with different filename
  - Return context with workflow type indicator
- Maintain existing behavior for standard workflows

**Tests**:
- Unit tests for context loading from both file types
- Test cases: load WorkflowContext.md, load CrossRepoContext.md, missing context file

#### 3. Context Result Extension
**File**: `src/tools/contextTool.ts`
**Changes**:
- Add `workflowType` field to `ContextResult` interface
- Update `formatContextResponse()` function at lines 365-428:
  - Include workflow type in formatted output
  - Add `<workflow_type>` XML tag in response: `<workflow_type>cross-repository</workflow_type>` or `<workflow_type>implementation</workflow_type>`
  - Position after `<workflow_context>` section
- Enables agents to adapt behavior based on workflow type

**Tests**:
- Unit tests for response formatting with workflow type
- Test cases: implementation type response, cross-repository type response

#### 4. Custom Instructions Resolution
**File**: `src/tools/contextTool.ts`
**Changes**:
- Update `loadCustomInstructions()` at lines 197-219:
  - Support cross-repository agent names (e.g., `PAW-M01A Cross-Repo Spec-instructions.md`)
  - No changes to function logic (already filename-based)
  - Verify file naming conventions match agent names exactly
- Test with cross-repository agent names to ensure compatibility

**Tests**:
- Unit tests loading custom instructions for PAW-M## agents
- Test cases: PAW-M01A instructions exist, PAW-M01B instructions missing

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] Context tool unit tests pass: `npm test`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Standard PAW workflow agents can load context (backward compatibility verified)
- [ ] PAW-M## agents can load CrossRepoContext.md via `paw_get_context`
- [ ] Cross-repository custom instructions load correctly
- [ ] Workflow type appears in context tool response
- [ ] Error messages are clear when Work ID not found in either location
- [ ] Multiple workflow types can coexist in same workspace

---

## Phase 6: Child Workflow Initialization

### Overview
Implement mechanism for initializing standard PAW workflows in individual repositories with scoped context excerpts from cross-repository specifications. This enables the execution sequence defined in CrossRepoPlan.md.

### Changes Required:

#### 1. Child Workflow Context Excerpt Definition
**File**: `agents/PAW-M02B Cross-Repo Impl Planner.agent.md`
**Changes**:
- Add instructions for creating repository-specific context excerpts in CrossRepoPlan.md
- Format for each repository in execution sequence:
  ```markdown
  ## Repository: <repo-name>
  
  ### Changes Required:
  [Repository-specific requirements from CrossRepoSpec.md]
  
  ### Integration Points:
  [How this repository interacts with other repositories]
  
  ### Context Excerpt for Child Workflow:
  ```
  [Scoped context to pass during initialization]
  ```
  ```
- Excerpt includes: requirements for this repo, integration points, relevant dependencies
- Excludes: implementation details from other repositories, unrelated requirements

**Tests**:
- Manual test: PAW-M02B agent creates plan with context excerpts for each repository

#### 2. Child Workflow Initialization Instructions
**File**: `agents/PAW-M02B Cross-Repo Impl Planner.agent.md`
**Changes**:
- After creating CrossRepoPlan.md, provide user instructions for initializing child workflows:
  ```
  To initialize child workflow in <repo-name>:
  1. Switch to repository directory: cd <repo-path>
  2. Run: PAW: New PAW Workflow command
  3. Workflow Type: Implementation
  4. When prompted for issue/description, provide the context excerpt from the plan
  5. Continue with standard PAW workflow
  ```
- Include instructions in plan document as "Child Workflow Initialization" section
- Note: Manual initialization for v1; automated initialization is future enhancement

**Tests**:
- Manual test: follow provided instructions to initialize child workflow
- Verify child workflow receives scoped context correctly

#### 3. Child Workflow Independent Operation
**File**: Documentation in `CrossRepoPlan.md` (created by agent)
**Changes**:
- Document that child workflows operate as standard PAW workflows
- Child workflows stored in repository's `.paw/work/<work-id>/` directory
- If `.paw/multi-work/` directory is deleted, child workflows continue functioning
- Child workflow artifacts are git-committed and version-controlled independently
- Use same Work ID across all repositories for consistency

**Tests**:
- Manual test: delete `.paw/multi-work/` directory, verify child workflow continues
- Manual test: complete child workflow end-to-end using standard PAW agents

#### 4. Validation Coordination
**File**: `agents/PAW-M03 Cross-Repo Validator.agent.md`
**Changes**:
- Add instructions for reading child workflow artifacts:
  - For each repository in affected repositories list
  - Read `.paw/work/<work-id>/ImplementationPlan.md` from repository
  - Read `.paw/work/<work-id>/Docs.md` if present
  - Compare against CrossRepoSpec.md requirements
- Perform consistency checks:
  - All required repositories have completed implementations
  - Integration points match between repositories
  - API contracts align across repository boundaries
- Generate validation report with findings and integration test suggestions

**Tests**:
- Manual test: validator reads artifacts from multiple repositories
- Manual test: validator detects inconsistencies when they exist

### Success Criteria:

#### Automated Verification:
- [ ] Agent linting passes: `./scripts/lint-agent.sh agents/PAW-M02B*.agent.md agents/PAW-M03*.agent.md`
- [ ] TypeScript compiles: `npm run compile`

#### Manual Verification:
- [ ] CrossRepoPlan.md contains clear context excerpts for each repository
- [ ] Following initialization instructions creates working child workflow
- [ ] Child workflow functions independently as standard PAW workflow
- [ ] Same Work ID used across cross-repo and all child workflows
- [ ] Child workflow artifacts are git-committed in their respective repositories
- [ ] Validator successfully reads and compares artifacts across repositories
- [ ] Deleting `.paw/multi-work/` does not break child workflows

---

## Cross-Phase Testing Strategy

### Integration Tests:
- **End-to-end cross-repository workflow**: Initialize cross-repo workflow → create spec → create plan → initialize child workflows → implement in each repo → validate
- **Multi-root workspace scenarios**: 2 repositories, 3+ repositories, mixed git/non-git folders
- **Workflow type switching**: Start implementation workflow, then start cross-repository workflow in same workspace
- **Context tool resolution**: Access both standard and cross-repository contexts in same workspace
- **Agent handoffs**: Verify all PAW-M## agents can hand off to each other correctly
- **Child workflow independence**: Complete child workflow without cross-repo agent coordination

### Manual Testing Steps:
1. Create VS Code multi-root workspace with 2+ git repositories
2. Run "PAW: New PAW Workflow" command
3. Select "Cross-Repository" workflow type
4. Verify repository detection shows all git repos
5. Select affected repositories (at least 2)
6. Complete spec and planning phases with PAW-M## agents
7. Initialize child workflows in each selected repository following plan instructions
8. Implement changes in each repository using standard PAW agents
9. Return to workspace root, invoke PAW-M03 Cross-Repo Validator
10. Verify validation report identifies all repositories and checks consistency
11. Test edge case: delete `.paw/multi-work/` directory, verify child workflows still accessible
12. Verify standard PAW workflow still works in single-folder workspace (backward compatibility)

*Note: Unit tests are specified within each phase alongside the code they test.*

## Performance Considerations

- Repository detection may be slow in workspaces with many folders; consider caching detection results during single initialization session
- Context tool must search both `.paw/work/` and `.paw/multi-work/` directories; prioritize `.paw/work/` to minimize search time for standard workflows
- Agent template rendering with component expansion should remain performant even with new PAW-M## agents added

## Migration Notes

No migration required. This is a new feature that adds cross-repository workflow capabilities alongside existing implementation workflows. All existing PAW workflows continue functioning without modification.

Workspace-level considerations:
- Users with existing `.paw/work/` directories can add `.paw/multi-work/` without conflicts
- Cross-repository workflows and standard workflows can coexist in the same multi-root workspace
- No changes to existing git repositories or their `.paw/work/` structures

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/142
- Spec: `.paw/work/cross-repository-workflow-supervisor/Spec.md`
- Spec Research: `.paw/work/cross-repository-workflow-supervisor/SpecResearch.md`
- Code Research: `.paw/work/cross-repository-workflow-supervisor/CodeResearch.md`
- Similar patterns: PAW-R## agents in `agents/` directory (Review workflow structure)
- Workflow initialization: `src/commands/initializeWorkItem.ts:28-124`
- Context tool multi-root support: `src/tools/contextTool.ts:229-266`
