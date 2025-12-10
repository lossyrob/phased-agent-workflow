# Cross-Repository Workflow Supervisor Implementation Plan

## Overview

This plan implements a multi-repository workflow coordination system that enables developers to specify, plan, implement, and validate features spanning multiple git repositories within a VS Code multi-root workspace. The Cross-Repository Workflow Supervisor extends PAW's existing single-repository workflow capabilities by introducing a supervisory layer that orchestrates child workflows across repositories while maintaining the independence and standard structure of each child workflow.

## Current State Analysis

PAW provides robust single-repository workflow management with:
- Workflow initialization via `PAW: New PAW Workflow` command collecting branch, mode, strategy, and handoff mode parameters
- Context management through `paw_get_context` tool that already supports multi-root workspaces by searching all workspace folders
- Agent handoff system via `paw_call_agent` tool enabling inter-agent coordination through chat sessions
- Standardized artifact structure in `.paw/work/<feature-slug>/` containing WorkflowContext.md, Spec.md, CodeResearch.md, ImplementationPlan.md, and Docs.md
- Agent template system with `.agent.md` files, YAML frontmatter, and component-based expansion

**Key Constraints Discovered**:
- Current initialization assumes single workspace folder (`vscode.workspace.workspaceFolders?.[0]`) at `src/commands/initializeWorkItem.ts:41`
- Git validation via `git rev-parse --git-dir` works reliably across configurations (`src/git/validation.ts:10-16`)
- Context tool Work ID resolution already iterates all workspace folders (`src/tools/contextTool.ts:251-266`)
- Handoff tool supports cross-repository agent invocation via Work ID resolution without modification
- All artifacts are git-tracked within their repositories; supervisor requires non-git-tracked coordination artifacts

**Missing Capabilities**:
- No workflow type selection (Implementation/Cross-Repository/Review) to distinguish architectural patterns
- No multi-root workspace detection or multi-repository selection UI
- No supervisor artifact location (`.paw/multi-work/`) separate from repository structures
- No supervisor agents for unified specification, cross-repository planning, or validation
- No mechanism to initialize child workflows with scoped context from supervisor plan

## Desired End State

After implementation:
1. Users can select "Cross-Repository" workflow type during initialization when working in multi-root workspaces
2. System detects all git repositories across workspace folders and allows user selection of affected repositories
3. Supervisor artifacts created at `.paw/multi-work/<work-id>/` in workspace root with SupervisorContext.md, CrossRepoSpec.md, CrossRepoPlan.md, and Validation.md
4. Context tool resolves supervisor context from workspace root when Work ID matches supervisor pattern
5. Supervisor agents (SupervisorSpec, SupervisorPlanner, SupervisorValidator) coordinate multi-repository feature work
6. Child workflows initialized in each affected repository maintain standard `.paw/work/<work-id>/` structure and operate independently
7. Validation can be invoked at any child workflow stage to verify cross-repository consistency

**Verification Approach**:
- Initialize cross-repository workflow in test workspace with 2+ git repositories
- Verify SupervisorContext.md contains repository list and execution sequence
- Confirm child workflows created in each repository with scoped context
- Validate that `paw_get_context` resolves supervisor context from workspace root
- Test handoffs between supervisor and child workflow agents
- Invoke validation at different child workflow stages and verify consistency checking

## What We're NOT Doing

**Out of Scope for v1**:
- Phase-level sequencing (granular ordering like "repo A phase 2, then repo B phase 1") - future enhancement requiring cross-repository state management
- Automated integration test execution - validation provides guidance only; users execute tests manually
- PR coordination automation (linked PRs, merge order enforcement, automated merging) - users create and manage PRs following plan guidance
- Progress tracking dashboard showing real-time child workflow states - users track progress manually via validation reports
- Multi-repository refactorings or transformations - supervisor focuses on feature implementation coordination
- Dependency version compatibility checking - assumed to be handled via standard integration testing
- Concurrent multi-developer coordination - standard git collaboration applies; supervisor doesn't manage team workflows
- Non-git version control systems - git is required for all repositories
- Single-folder workspace support for cross-repository workflows - multi-root workspace is mandatory
- Review workflow supervisor coordination - separate workflow type for future implementation

## Implementation Approach

The implementation follows an incremental extension strategy, building on PAW's existing infrastructure:

**Extension Points**:
1. **Initialization Layer**: Add workflow type selection before mode selection, implement multi-repository detection and selection UI, route to supervisor initialization
2. **Context Layer**: Extend `resolveWorkspacePath` to check `.paw/multi-work/` at workspace root, add SupervisorContext.md parsing
3. **Agent Layer**: Create supervisor agent templates using existing component system, add supervisor names to handoff tool enum
4. **Coordination Layer**: Supervisor planning agent generates child workflow initialization prompts with scoped context, validation agent assesses current state

**Design Principles**:
- Supervisor artifacts stored at workspace root (`.paw/multi-work/`) to avoid git conflicts across repositories
- Child workflows maintain standard PAW structure and can function independently if supervisor artifacts lost
- Context passing via both WorkflowContext.md fields and inline instructions for flexibility
- Repository-level sequencing for v1 (complete repo A, then repo B) rather than phase-level interleaving
- On-demand validation invocation rather than automatic stage-based triggers

**Risk Mitigation**:
- Validate multi-root workspace before allowing cross-repository workflow type
- Graceful degradation if supervisor artifacts deleted (child workflows continue as independent workflows)
- Clear error messages if Work ID resolution fails to find supervisor or child context
- Validation detects out-of-sequence work and provides updated guidance rather than blocking

## Phase Summary

1. **Phase 1: Workflow Type Selection and Initialization Flow** - Add UI for workflow type selection, implement multi-root workspace detection, create repository selection interface, and build supervisor initialization prompt
2. **Phase 2: Context Tool Extensions for Supervisor Support** - Extend Work ID resolution to check workspace root, implement SupervisorContext.md parsing, and format supervisor-specific context responses
3. **Phase 3: Supervisor Agent Templates** - Create SupervisorSpec, SupervisorPlanner, and SupervisorValidator agent files with component-based structure
4. **Phase 4: Child Workflow Initialization and Integration** - Implement supervisor planning logic to initialize child workflows with scoped context in each affected repository
5. **Phase 5: Cross-Repository Validation** - Implement validation agent to assess consistency across repositories based on current child workflow states

---

## Phase 1: Workflow Type Selection and Initialization Flow

### Overview
Extend PAW initialization to support workflow type selection, detect multi-root workspaces, identify git repositories across folders, and construct supervisor initialization prompts.

### Changes Required:

#### 1. User Input Collection - Workflow Type
**File**: `src/ui/userInput.ts`

**Changes**:
- Add `WorkflowType` type: `'implementation' | 'cross-repository' | 'review'`
- Add `WorkflowType` field to `WorkItemInputs` interface
- Implement `collectWorkflowType()` function with Quick Pick menu following existing pattern (`collectWorkflowMode` at lines 119-162)
- Update `collectUserInputs()` to include workflow type as first prompt
- Validate that cross-repository type requires multi-root workspace (show error if single folder)

**Integration**: Quick Pick menu with three options:
- "Implementation Workflow" (default, single repository)
- "Cross-Repository Workflow" (requires multi-root workspace)
- "Review Workflow" (future, disabled for v1)

**Tests**:
- Unit test for `collectWorkflowType()` with mock Quick Pick
- Unit test for multi-root workspace validation with cross-repository type

**Example**:
```typescript
export type WorkflowType = 'implementation' | 'cross-repository' | 'review';

async function collectWorkflowType(): Promise<WorkflowType | undefined> {
  const options = [
    { label: 'Implementation Workflow', value: 'implementation' },
    { label: 'Cross-Repository Workflow', value: 'cross-repository' },
    { label: 'Review Workflow (coming soon)', value: 'review', description: 'Not yet available' }
  ];
  // ... Quick Pick implementation
}
```

#### 2. Multi-Repository Detection and Selection
**File**: `src/ui/userInput.ts` (new functions)

**Changes**:
- Add `RepositoryInfo` interface: `{ path: string; name: string }`
- Implement `detectGitRepositories()`: iterate `vscode.workspace.workspaceFolders`, validate each with `validateGitRepository`, return `RepositoryInfo[]`
- Implement `collectAffectedRepositories(repos: RepositoryInfo[])`: Multi-select Quick Pick menu for repository selection
- Integration with `collectUserInputs()`: call after workflow type selection if type is 'cross-repository'

**Integration**: Use existing `validateGitRepository` from `src/git/validation.ts:10-16`

**Tests**:
- Unit test for `detectGitRepositories()` with mock workspace folders
- Integration test with actual test workspace containing multiple git repositories

#### 3. Initialization Command Extension
**File**: `src/commands/initializeWorkItem.ts`

**Changes**:
- Modify workspace validation (lines 41-50) to support multi-root: if workflow type is 'cross-repository', validate `workspaceFolders.length > 1`
- Add routing logic after input collection: if workflow type is 'cross-repository', call new `initializeSupervisorWorkflow()` function
- Keep existing `initializeWorkItemCommand` for 'implementation' type
- Extract common validation logic to shared functions

**Integration**: Reuse existing git validation, custom instructions check, agent invocation pattern

**Tests**:
- Integration test for single-folder workspace with implementation type
- Integration test for multi-root workspace with cross-repository type
- Error case: cross-repository type with single-folder workspace

#### 4. Supervisor Initialization Function
**File**: `src/commands/initializeWorkItem.ts` (new function) or new file `src/commands/initializeSupervisorWorkflow.ts`

**Changes**:
- Implement `initializeSupervisorWorkflow()` function taking workspace folders, affected repositories, and standard inputs
- Construct supervisor initialization prompt using new template (see Phase 1.5)
- Create `.paw/multi-work/` directory at workspace root if not exists
- Invoke supervisor specification agent with constructed prompt

**Integration**: Follow pattern from `initializeWorkItemCommand` (lines 103-122) for prompt construction and agent invocation

**Tests**:
- Integration test verifying `.paw/multi-work/` directory creation
- Verify supervisor agent invocation with correct prompt structure

#### 5. Supervisor Initialization Prompt Template
**File**: `src/prompts/supervisorInitPrompt.template.md` (new)

**Changes**:
- Create template following structure of `workItemInitPrompt.template.md`
- Add variables: `{{AFFECTED_REPOSITORIES}}`, `{{REPOSITORY_COUNT}}`, `{{WORKFLOW_MODE}}`, `{{REVIEW_STRATEGY}}`, `{{HANDOFF_MODE}}`, `{{ISSUE_URL}}`
- Invoke SupervisorSpec agent to create unified specification
- Include instructions for creating SupervisorContext.md with repository list

**Integration**: Load template in `src/prompts/supervisorInitPrompt.ts` (new file) following pattern from `src/prompts/workflowInitPrompt.ts:57-93`

**Example**:
```markdown
You are initializing a cross-repository PAW workflow spanning {{REPOSITORY_COUNT}} repositories.

Affected Repositories:
{{AFFECTED_REPOSITORIES}}

Create `.paw/multi-work/<work-id>/SupervisorContext.md` with workflow parameters and repository list.
Then create a unified specification identifying which repositories need changes and how they interact.
```

#### 6. TypeScript Type Definitions
**File**: `src/ui/userInput.ts`

**Changes**:
- Update `WorkItemInputs` interface to include `workflowType: WorkflowType`
- Add `affectedRepositories?: RepositoryInfo[]` field (populated when workflow type is cross-repository)
- Export new types for use in initialization commands

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `npm run typecheck`
- [ ] Unit tests pass: `npm test`
- [ ] Extension compiles: `npm run compile`

#### Manual Verification:
- [ ] "PAW: New PAW Workflow" command presents workflow type selection
- [ ] Selecting "Implementation Workflow" follows existing single-repository flow
- [ ] Selecting "Cross-Repository Workflow" in single-folder workspace shows error
- [ ] Selecting "Cross-Repository Workflow" in multi-root workspace detects git repositories
- [ ] Repository selection UI allows multi-select with clear folder names
- [ ] Supervisor initialization creates `.paw/multi-work/<work-id>/` directory at workspace root
- [ ] Supervisor agent invoked with correct prompt containing repository list

---

## Phase 2: Context Tool Extensions for Supervisor Support

### Overview
Extend the context tool to resolve supervisor workflows at workspace root `.paw/multi-work/` location, implement SupervisorContext.md parsing, and format supervisor-specific context responses.

### Changes Required:

#### 1. Workspace Root Resolution
**File**: `src/tools/contextTool.ts`

**Changes**:
- Add `getWorkspaceRoot()` function: returns VS Code workspace file location if available, otherwise first workspace folder path
- Add `resolveSupervisorWorkspacePath(featureSlug: string)` function: checks for `.paw/multi-work/<feature-slug>/SupervisorContext.md` at workspace root
- Modify `resolveWorkspacePath()` (lines 251-266) to try supervisor location first, then fall back to child workflow location
- Update error messages to distinguish between supervisor and child workflow Work IDs

**Integration**: Use existing `getWorkspaceFolderPaths()` pattern, add workspace root detection

**Tests**:
- Unit test for `getWorkspaceRoot()` with mock workspace configuration
- Unit test for `resolveSupervisorWorkspacePath()` with supervisor artifacts
- Integration test verifying supervisor context resolution from workspace root

**Example**:
```typescript
function resolveSupervisorWorkspacePath(featureSlug: string): { workspaceRoot: string; supervisorDir: string } | null {
  const workspaceRoot = getWorkspaceRoot();
  const supervisorDir = path.join(workspaceRoot, '.paw', 'multi-work', featureSlug);
  
  if (fs.existsSync(supervisorDir)) {
    const contextPath = path.join(supervisorDir, 'SupervisorContext.md');
    if (fs.existsSync(contextPath)) {
      return { workspaceRoot, supervisorDir };
    }
  }
  
  return null;
}
```

#### 2. SupervisorContext.md Structure and Parsing
**File**: `src/tools/contextTool.ts`

**Changes**:
- Add `SupervisorContext` interface: extends standard WorkflowContext with `affectedRepositories: string[]`, `executionSequence: string[]`, `childWorkIds: Record<string, string>`
- Implement `loadSupervisorContext(contextPath: string)` function: reads SupervisorContext.md, parses standard fields plus supervisor-specific fields
- Handle multi-line repository list parsing (each repository on separate line or comma-separated)

**Integration**: Follow pattern from `loadWorkflowContext()` for simple key-value parsing

**Tests**:
- Unit test for `loadSupervisorContext()` with sample SupervisorContext.md
- Verify parsing of repository list and execution sequence fields

**Example SupervisorContext.md**:
```markdown
# SupervisorContext

Work Title: Multi-Repo Feature
Feature Slug: multi-repo-feature
Target Branch: feature/multi-repo
Workflow Mode: full
Review Strategy: local
Handoff Mode: semi-auto
Issue URL: https://github.com/org/repo/issues/123
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none

Affected Repositories:
- /path/to/extension-repo
- /path/to/language-server-repo

Execution Sequence:
1. language-server-repo
2. extension-repo

Child Work IDs:
- extension-repo: multi-repo-feature
- language-server-repo: multi-repo-feature
```

#### 3. Supervisor-Specific Context Response Formatting
**File**: `src/tools/contextTool.ts`

**Changes**:
- Modify `getContext()` (lines 320-341) to detect supervisor vs. child workflow based on resolution result
- Add `formatSupervisorContextResponse()` function: similar to `formatContextResponse()` but includes supervisor-specific sections
- Add `<supervisor_repositories>` and `<execution_sequence>` XML sections in response
- Load supervisor-specific custom instructions from `.paw/instructions/SupervisorSpec-instructions.md`, etc.

**Integration**: Reuse `formatInstructionSection()` pattern, add new XML-tagged sections

**Tests**:
- Unit test for `formatSupervisorContextResponse()` with mock supervisor context
- Verify XML structure matches agent expectations

**Example Response**:
```xml
<workspace_instructions>
...
</workspace_instructions>

<workflow_context>
```markdown
# SupervisorContext
...
```
</workflow_context>

<supervisor_repositories>
- /path/to/extension-repo
- /path/to/language-server-repo
</supervisor_repositories>

<execution_sequence>
1. language-server-repo
2. extension-repo
</execution_sequence>
```

#### 4. Context Tool Registration Update
**File**: `src/tools/contextTool.ts`

**Changes**:
- Update `registerContextTool()` (lines 432-494) to handle supervisor context type
- Add `context_type` field to tool result: 'standard' | 'supervisor'
- Update tool description in schema to document supervisor support

**Integration**: No breaking changes to existing tool interface

**Tests**:
- Integration test invoking `paw_get_context` with supervisor Work ID
- Integration test invoking with child workflow Work ID in multi-root workspace

### Success Criteria:

#### Automated Verification:
- [ ] Type checking passes: `npm run typecheck`
- [ ] Unit tests pass for new functions: `npm test -- contextTool`
- [ ] Context tool resolves supervisor Work ID at workspace root
- [ ] Context tool resolves child Work ID within repository folders

#### Manual Verification:
- [ ] Supervisor agent can call `paw_get_context` and receives SupervisorContext.md content
- [ ] Supervisor context response includes repository list and execution sequence
- [ ] Child workflow agent in multi-repo workspace can still resolve standard context
- [ ] Error message distinguishes between "supervisor Work ID not found" and "child Work ID not found"

---

## Phase 3: Supervisor Agent Templates

### Overview
Create supervisor agent templates (SupervisorSpec, SupervisorPlanner, SupervisorValidator) using existing component system and add supervisor agent names to handoff tool.

### Changes Required:

#### 1. Supervisor Specification Agent
**File**: `agents/SupervisorSpec.agent.md` (new)

**Changes**:
- Create agent template with YAML frontmatter: `description: "Creates unified specifications for cross-repository features"`
- Include `{{PAW_CONTEXT}}` component for context retrieval instructions
- Include `{{HANDOFF_INSTRUCTIONS}}` component for handoff behavior
- Agent instructions: analyze feature requirements across repositories, identify inter-repository interactions, create CrossRepoSpec.md with repository-specific sections
- Follow pattern from `agents/PAW-01A Specification.agent.md` but adapted for multi-repository coordination

**Integration**: Agent template loader automatically discovers `.agent.md` files in `agents/` directory

**Tests**:
- Verify agent template loads successfully: check `loadAgentTemplates()` output
- Manual test: invoke SupervisorSpec agent and verify CrossRepoSpec.md creation

**Example Structure**:
```markdown
---
description: "Creates unified specifications for cross-repository features"
---

# Supervisor Specification Agent

You create unified specifications for features spanning multiple repositories...

{{PAW_CONTEXT}}

## Specification Structure

Create `.paw/multi-work/<work-id>/CrossRepoSpec.md` with:
- Overall feature description
- Repository-specific requirements (which repos need which changes)
- Inter-repository interactions and dependencies
- Integration testing considerations

{{HANDOFF_INSTRUCTIONS}}
```

#### 2. Supervisor Planning Agent
**File**: `agents/SupervisorPlanner.agent.md` (new)

**Changes**:
- Create agent template with YAML frontmatter: `description: "Creates execution plans with repository-level sequencing"`
- Agent instructions: analyze specification dependencies, establish repository work order, generate scoped context for each repository, create CrossRepoPlan.md
- Include logic to initialize child workflows: create `.paw/work/<work-id>/WorkflowContext.md` in each affected repository with scoped context excerpt
- Follow pattern from `agents/PAW-02B Impl Planner.agent.md` but at repository level

**Integration**: Agent uses standard file operations to create child workflow directories

**Tests**:
- Manual test: invoke SupervisorPlanner and verify CrossRepoPlan.md with execution sequence
- Verify child WorkflowContext.md files created in each repository with scoped context

**Example Structure**:
```markdown
---
description: "Creates execution plans with repository-level sequencing"
---

# Supervisor Planning Agent

You create cross-repository execution plans establishing repository work order...

## Planning Process

1. Analyze dependencies between repository changes
2. Establish execution sequence (which repo to work on first)
3. Generate scoped context for each repository describing its role
4. Initialize child workflows in each repository

For each affected repository:
- Create `.paw/work/<work-id>/WorkflowContext.md` with standard fields
- Add scoped context excerpt in `Additional Inputs` or custom field
- Repository can now run standard PAW workflow

{{HANDOFF_INSTRUCTIONS}}
```

#### 3. Supervisor Validation Agent
**File**: `agents/SupervisorValidator.agent.md` (new)

**Changes**:
- Create agent template with YAML frontmatter: `description: "Validates consistency across repositories at any workflow stage"`
- Agent instructions: assess current state of child workflows (check which phases completed), verify alignment with specification, identify integration concerns, provide stage-appropriate testing guidance
- Create or update `Validation.md` with findings, inconsistencies, integration test recommendations
- Support invocation at any child workflow stage (mid-implementation, post-implementation, pre-PR)

**Integration**: Agent reads child workflow artifacts from each repository's `.paw/work/<work-id>/` directory

**Tests**:
- Manual test: invoke SupervisorValidator at different child workflow stages
- Verify Validation.md identifies inconsistencies and provides guidance

**Example Structure**:
```markdown
---
description: "Validates consistency across repositories at any workflow stage"
---

# Supervisor Validation Agent

You validate cross-repository consistency based on current child workflow states...

## Validation Process

1. Locate child workflows: check each repository's `.paw/work/<work-id>/` directory
2. Assess completion state: identify which phases completed in each repository
3. Review artifacts: read CodeResearch.md, ImplementationPlan.md, implementation files
4. Check alignment: verify changes match specification and are compatible
5. Generate report: create Validation.md with findings and integration testing guidance

Report structure:
- Current state summary (which repos at which stages)
- Alignment verification (matches spec? compatible?)
- Integration concerns (API contracts, data flow, version dependencies)
- Testing guidance (how to verify combined changes at this stage)
- Recommendations (proceed, address issues, re-plan)

{{HANDOFF_INSTRUCTIONS}}
```

#### 4. Handoff Tool Agent Name Extension
**File**: `src/tools/handoffTool.ts`

**Changes**:
- Update `AgentName` type (lines 6-15) to include supervisor agents: `"SupervisorSpec" | "SupervisorPlanner" | "SupervisorValidator"`
- No changes to tool logic (handoff works via Work ID resolution)

**Integration**: Extension provides supervisor agent names in VS Code agent mode

**Tests**:
- Type checking verifies new agent names accepted
- Manual test: invoke `paw_call_agent` with supervisor agent name

#### 5. Supervisor Component (Optional)
**File**: `agents/components/supervisor-context.component.md` (optional new)

**Changes**:
- Create shared component for supervisor-specific context instructions
- Include guidance on resolving supervisor context, parsing repository lists, accessing child workflow artifacts
- Use `{{SUPERVISOR_CONTEXT}}` placeholder in supervisor agent templates

**Integration**: Component loader automatically discovers `.component.md` files

**Tests**:
- Verify component expands correctly in agent templates

### Success Criteria:

#### Automated Verification:
- [ ] Agent templates load successfully: `loadAgentTemplates()` includes supervisor agents
- [ ] Type checking passes with new agent names: `npm run typecheck`
- [ ] Extension compiles: `npm run compile`

#### Manual Verification:
- [ ] SupervisorSpec agent creates CrossRepoSpec.md with repository-specific sections
- [ ] SupervisorPlanner agent creates CrossRepoPlan.md with execution sequence
- [ ] SupervisorPlanner initializes child WorkflowContext.md in each repository
- [ ] SupervisorValidator agent reads child workflow artifacts and generates Validation.md
- [ ] Handoff tool accepts supervisor agent names and opens chat sessions
- [ ] Components expand correctly in supervisor agent content

---

## Phase 4: Child Workflow Initialization and Integration

### Overview
Implement supervisor planning logic to initialize child workflows in each affected repository with scoped context, verify child workflow independence, and test handoffs between supervisor and child agents.

### Changes Required:

#### 1. Child Workflow Context Structure
**File**: Defined in SupervisorPlanner agent instructions (Phase 3.2)

**Changes**:
- SupervisorPlanner creates standard WorkflowContext.md in each repository's `.paw/work/<work-id>/` directory
- Include all standard fields: Work Title, Feature Slug, Target Branch, Workflow Mode, Review Strategy, Handoff Mode, Issue URL, Remote
- Add `Scoped Context` field: excerpt from unified specification describing this repository's role
- Use same Work ID as supervisor workflow for traceability

**Integration**: Follow standard WorkflowContext.md format from `src/prompts/workItemInitPrompt.template.md`

**Tests**:
- Verify child WorkflowContext.md contains all required fields
- Verify `Scoped Context` field contains repository-specific requirements

**Example Child WorkflowContext.md**:
```markdown
# WorkflowContext

Work Title: Multi-Repo Feature
Feature Slug: multi-repo-feature
Target Branch: feature/multi-repo
Workflow Mode: full
Review Strategy: local
Handoff Mode: semi-auto
Issue URL: https://github.com/org/repo/issues/123
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none

Scoped Context:
This repository (extension-repo) needs to implement UI components for the new feature.
Dependencies: Requires language-server-repo to provide protocol methods XYZ.
Integration: UI will communicate with language server via existing LSP connection.
```

#### 2. Supervisor Planning Agent Logic
**File**: `agents/SupervisorPlanner.agent.md` (implementation details)

**Changes**:
- Detailed instructions for analyzing dependencies: look for API contracts, data flow, protocol changes, shared types
- Algorithm for establishing execution sequence: build dependency graph (implicit, not persisted), topological sort, present as ordered list
- Scoped context generation: extract relevant sections from CrossRepoSpec.md, focus on repository-specific requirements and dependencies
- File operations: create directory structure, write WorkflowContext.md files, commit supervisor artifacts

**Integration**: Agent uses file write operations and git commands (commit supervisor artifacts to workspace location if desired)

**Tests**:
- Manual test: run SupervisorPlanner with sample specification
- Verify execution sequence matches logical dependency order
- Verify scoped context accurately represents repository requirements

#### 3. Child Workflow Agent Invocation Pattern
**File**: SupervisorPlanner agent instructions

**Changes**:
- After initializing child workflows, provide handoff guidance to user
- User switches to first repository in execution sequence, runs standard PAW agents (Code Researcher, Impl Planner, Implementer)
- Child agents call `paw_get_context` with Work ID, context tool resolves to child workflow location
- Child agents operate normally within repository without awareness of supervisor

**Integration**: No code changes needed; leverages existing Work ID resolution

**Tests**:
- Manual test: initialize child workflows, switch to first repository, run Code Researcher
- Verify Code Researcher resolves child WorkflowContext.md correctly
- Verify child workflow operates as standard PAW workflow

#### 4. Cross-Repository Handoff Testing
**File**: Test scenarios

**Changes**:
- Test handoff from SupervisorPlanner to child workflow: user invokes child agents with Work ID
- Test handoff from child workflow back to supervisor: user invokes SupervisorValidator with supervisor Work ID
- Verify Work ID resolution works correctly in both directions

**Integration**: Uses existing `paw_call_agent` and context resolution

**Tests**:
- Manual test: handoff from supervisor to child and back
- Verify Work ID resolution does not confuse supervisor and child contexts

#### 5. Child Workflow Independence Verification
**File**: Test scenarios

**Changes**:
- Test scenario: delete supervisor artifacts (`.paw/multi-work/`), verify child workflows continue working
- Child workflows should operate as independent single-repository workflows if supervisor lost
- Verify no hard dependencies on supervisor artifacts in child workflow execution

**Integration**: Standard PAW workflow behavior

**Tests**:
- Manual test: remove `.paw/multi-work/` directory, run child workflow agents
- Verify child agents still resolve child WorkflowContext.md and operate normally

### Success Criteria:

#### Automated Verification:
- [ ] Child WorkflowContext.md files parse correctly with standard context tool
- [ ] Work ID resolution finds child context in repository folders

#### Manual Verification:
- [ ] SupervisorPlanner creates child WorkflowContext.md in each repository with scoped context
- [ ] Execution sequence reflects logical dependency order (dependencies first)
- [ ] Switching to child repository and running Code Researcher works correctly
- [ ] Child Impl Planner creates ImplementationPlan.md using scoped context
- [ ] Child Implementer proceeds with implementation following child plan
- [ ] Child workflows operate independently if supervisor artifacts deleted
- [ ] Handoff from child back to supervisor (invoke SupervisorValidator) resolves correctly
- [ ] No confusion between supervisor and child Work ID resolution

---

## Phase 5: Cross-Repository Validation

### Overview
Implement validation agent to assess consistency across repositories at any workflow stage, generate integration testing guidance, and produce validation reports.

### Changes Required:

#### 1. Child Workflow State Detection
**File**: `agents/SupervisorValidator.agent.md` (implementation details)

**Changes**:
- Instructions for locating child workflows: iterate affected repositories from SupervisorContext.md, check each for `.paw/work/<work-id>/` directory
- Instructions for assessing completion state: check existence of CodeResearch.md, ImplementationPlan.md, implementation files, test files, Docs.md
- Map file existence to workflow stage: research complete, planning complete, implementation in progress, implementation complete, docs complete
- Handle missing child workflows gracefully (report as not started)

**Integration**: Agent uses file read operations to check artifact existence and content

**Tests**:
- Manual test: invoke SupervisorValidator with children at different stages
- Verify state detection accurately reflects completion status

**Example State Detection Logic**:
```
For each repository:
- Check .paw/work/<work-id>/CodeResearch.md exists → research complete
- Check ImplementationPlan.md exists → planning complete
- Check plan phases against implementation files → implementation stage N
- Check test files → testing in progress
- Check Docs.md exists → documentation complete
```

#### 2. Alignment Verification Logic
**File**: `agents/SupervisorValidator.agent.md` (implementation details)

**Changes**:
- Instructions for verifying specification alignment: compare child artifacts against CrossRepoSpec.md, check that implementation matches scoped context
- Instructions for checking inter-repository compatibility:
  - API contracts: compare protocol definitions, type signatures, endpoint paths
  - Data flow: verify data structures match across boundaries
  - Dependencies: check version compatibility, shared library usage
- Identify discrepancies: missing implementations, incompatible interfaces, version mismatches, out-of-sequence work

**Integration**: Agent uses file read and semantic analysis (LLM reasoning)

**Tests**:
- Manual test: introduce intentional mismatch (API signature change in one repo but not other)
- Verify SupervisorValidator detects and reports the incompatibility

#### 3. Integration Testing Guidance Generation
**File**: `agents/SupervisorValidator.agent.md` (implementation details)

**Changes**:
- Instructions for stage-appropriate testing guidance:
  - Mid-implementation: "Verify API contracts defined in both repos match"
  - Post-implementation: "Test end-to-end flow: UI action → LSP request → server response"
  - Pre-PR: "Run integration test suite, check for regressions in cross-repo interactions"
- Testing guidance describes WHAT to verify and HOW to verify (manual steps, not automated execution)
- Include sample commands if applicable (e.g., `npm run test:integration`)

**Integration**: Agent generates descriptive guidance based on current state

**Tests**:
- Manual test: invoke SupervisorValidator at different stages
- Verify guidance is specific to current completion state and actionable

**Example Guidance**:
```
Integration Testing Guidance (Current Stage: Implementation In Progress)

1. API Contract Verification:
   - Repo A has defined protocol method `xyz(param: string): Promise<Result>`
   - Verify Repo B implements matching signature in LSP handler
   - Test: Call method from UI, verify server logs show correct parameter type

2. Data Flow Verification:
   - Verify shared type definitions match (check Result interface in both repos)
   - Test: Send sample data through protocol, inspect payload format

3. Dependency Verification:
   - Both repos use shared library `@org/common` version 1.2.x
   - No action needed (versions compatible)
```

#### 4. Validation Report Structure
**File**: `.paw/multi-work/<work-id>/Validation.md` (created/updated by SupervisorValidator)

**Changes**:
- Report sections:
  - **Validation Summary**: Timestamp, child workflow states, overall status (aligned/issues found)
  - **Current State**: Which repos at which stages, completion percentages
  - **Alignment Verification**: Matches spec? Compatible across repos?
  - **Integration Concerns**: API mismatches, data flow issues, dependency problems
  - **Testing Guidance**: Stage-appropriate verification steps
  - **Recommendations**: Proceed/address issues/re-plan
- Support incremental updates: each validation run appends or updates report
- Include validation history: previous validations with timestamps

**Integration**: Agent writes Validation.md to supervisor artifact directory

**Tests**:
- Manual test: invoke SupervisorValidator multiple times
- Verify Validation.md updates with new findings and history

**Example Validation.md**:
```markdown
# Cross-Repository Validation Report

## Validation Summary

**Timestamp**: 2025-12-10 14:30:00
**Status**: Issues Found

## Current State

- extension-repo: Implementation Phase 2/3 complete
- language-server-repo: Implementation Phase 3/3 complete

## Alignment Verification

✅ Specification alignment: Both repos implementing correct features
❌ API compatibility: Method signature mismatch detected

## Integration Concerns

1. **API Contract Mismatch**:
   - extension-repo calls `xyz(param: string)`
   - language-server-repo implements `xyz(params: string[])`
   - Impact: Runtime type error on method invocation
   - Recommendation: Align signatures before proceeding

## Testing Guidance

[Stage-appropriate guidance as above]

## Recommendations

⚠️ Address API contract mismatch before opening PRs.
Update extension-repo Phase 3 to match server's array parameter.
Re-run validation after fix.
```

#### 5. On-Demand Validation Invocation
**File**: User workflow (documented in supervisor agent handoff messages)

**Changes**:
- Users invoke SupervisorValidator at checkpoints: after completing phases, before opening PRs, when detecting integration issues
- Validation not triggered automatically; users decide when to verify
- Users can continue child workflows without validation if confident in alignment

**Integration**: Standard agent invocation via `paw_call_agent` or manual chat prompt

**Tests**:
- Manual test: complete work in one repo, invoke validation
- Verify validation assesses current state without requiring completion

### Success Criteria:

#### Automated Verification:
- [ ] SupervisorValidator agent template loads successfully
- [ ] Extension compiles with validator agent: `npm run compile`

#### Manual Verification:
- [ ] SupervisorValidator detects child workflow states correctly (research/planning/implementation stages)
- [ ] Validation identifies missing implementations or incomplete stages
- [ ] Validation detects API contract mismatches across repositories
- [ ] Validation detects incompatible data structures or type definitions
- [ ] Integration testing guidance is specific to current completion state
- [ ] Validation.md report includes all required sections
- [ ] Multiple validation runs append to Validation.md with history
- [ ] Validation works when invoked mid-implementation (partial completion)
- [ ] Validation provides actionable recommendations (proceed/fix/re-plan)

---

## Cross-Phase Testing Strategy

### Integration Tests:

**Multi-Repository Initialization End-to-End**:
1. Create test workspace with 2 git repositories (mock extension and mock language server)
2. Initialize cross-repository workflow with test feature description
3. Verify SupervisorContext.md created with repository list
4. Verify CrossRepoSpec.md identifies both repositories and interactions
5. Verify CrossRepoPlan.md establishes execution sequence
6. Verify child WorkflowContext.md files created in both repositories
7. Switch to first repository, run Code Researcher, verify standard workflow
8. Complete implementation in first repository
9. Invoke SupervisorValidator, verify state detection and alignment check
10. Switch to second repository, run Code Researcher with context from first repo's completion
11. Complete implementation in second repository
12. Invoke SupervisorValidator, verify both repos complete and compatible
13. Create PRs following CrossRepoPlan.md guidance

**Child Workflow Independence**:
1. Initialize cross-repository workflow with child workflows
2. Delete `.paw/multi-work/` supervisor artifacts
3. Verify child workflows continue operating as standard PAW workflows
4. Run Impl Planner, Implementer, Reviewer in child repository
5. Verify no errors referencing missing supervisor artifacts

**Work ID Resolution Across Contexts**:
1. Initialize supervisor workflow with Work ID `multi-repo-test`
2. Initialize child workflows with same Work ID in each repository
3. Invoke supervisor agent with Work ID from workspace root
4. Verify context tool resolves supervisor context at `.paw/multi-work/multi-repo-test/`
5. Invoke child agent with Work ID from repository folder
6. Verify context tool resolves child context at `.paw/work/multi-repo-test/`
7. Verify no confusion between supervisor and child contexts

### Manual Testing Steps:

1. **Workflow Type Selection**:
   - Open multi-root workspace with 2+ git repositories
   - Run `PAW: New PAW Workflow` command
   - Verify workflow type selection presented first
   - Select "Cross-Repository Workflow"
   - Verify repository detection shows all git folders
   - Select 2 repositories
   - Complete standard inputs (branch, mode, strategy, handoff mode)
   - Verify supervisor agent invoked with repository list

2. **Supervisor Specification**:
   - Allow SupervisorSpec agent to analyze feature requirements
   - Verify CrossRepoSpec.md created with repository-specific sections
   - Check that specification identifies inter-repository interactions
   - Check that specification includes integration testing considerations

3. **Cross-Repository Planning**:
   - Invoke SupervisorPlanner agent
   - Verify CrossRepoPlan.md created with execution sequence
   - Verify child WorkflowContext.md files created in each repository
   - Verify scoped context in each child accurately represents requirements
   - Verify execution sequence reflects logical dependencies

4. **Child Workflow Execution**:
   - Switch to first repository in execution sequence
   - Run Code Researcher with child Work ID
   - Verify CodeResearch.md created in repository
   - Run Impl Planner
   - Verify ImplementationPlan.md uses scoped context from supervisor
   - Run Implementer to complete first phase
   - Verify implementation matches scoped requirements

5. **Mid-Workflow Validation**:
   - Invoke SupervisorValidator after completing work in first repository
   - Verify Validation.md shows first repository complete, second repository not started
   - Verify integration testing guidance appropriate for current stage
   - Check alignment verification against specification

6. **Second Repository Workflow**:
   - Switch to second repository in execution sequence
   - Run Code Researcher with child Work ID
   - Run Impl Planner (should reference first repository's completion)
   - Run Implementer to complete implementation
   - Verify API contracts compatible with first repository

7. **Final Validation**:
   - Invoke SupervisorValidator after both repositories complete
   - Verify Validation.md shows both repositories complete and aligned
   - Verify integration testing guidance includes end-to-end scenarios
   - Verify no incompatibilities detected
   - Follow integration testing guidance manually to verify combined changes

8. **Edge Case: Child Independence**:
   - Delete `.paw/multi-work/` directory
   - Switch to child repository
   - Run standard PAW agents (Reviewer, Documenter)
   - Verify child workflow continues functioning without supervisor

*Note: Integration tests verify tool infrastructure; manual tests verify end-to-end user workflow and artifact quality.*

## Performance Considerations

- **Multi-Repository Detection**: Iterating workspace folders and validating git repositories is fast (O(n) where n is folder count, typically < 10)
- **Context Resolution**: Supervisor context check adds one additional file system access (check workspace root before checking repositories); negligible overhead
- **Validation Agent**: Reading child workflow artifacts across repositories involves multiple file reads; acceptable latency (< 1 second for typical workspace sizes)
- **No Persistent State Management**: Supervisor doesn't maintain real-time child workflow state; validation reads current state on-demand, avoiding synchronization complexity

## Migration Notes

No migration needed for existing PAW workflows. Cross-repository workflows are a new workflow type that coexists with standard implementation workflows. Users with existing single-repository workflows continue using them without changes.

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/142
- Spec: `.paw/work/cross-repository-workflow-supervisor/Spec.md`
- Spec Research: `.paw/work/cross-repository-workflow-supervisor/SpecResearch.md`
- Code Research: `.paw/work/cross-repository-workflow-supervisor/CodeResearch.md`
- Initialization command: `src/commands/initializeWorkItem.ts:28-124`
- Context tool: `src/tools/contextTool.ts:320-428`
- Handoff tool: `src/tools/handoffTool.ts:96-155`
- Agent template system: `src/agents/agentTemplates.ts:118-153`
