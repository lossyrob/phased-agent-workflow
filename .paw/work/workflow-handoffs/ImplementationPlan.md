# Workflow Handoffs Implementation Plan

## Overview

This implementation plan guides the development of contextual stage navigation for PAW workflows, enabling smooth transitions between workflow stages through three handoff modes (manual, semi-auto, auto). The feature introduces three new VS Code language model tools (Stage Transition, Dynamic Prompt Generator, Status Query), updates all 15 PAW agents with standardized handoff patterns, and enhances the Status Agent to provide workflow resumption and help mode capabilities.

## Current State Analysis

PAW currently operates as a collection of specialized agents (Specification, Code Research, Planning, Implementation, Review, Documentation, PR creation) that users navigate manually. Each agent lives in the GitHub Copilot prompts directory and can be invoked via chat, but users must:
- Remember the correct workflow stage sequence
- Locate prompt files in `.paw/work/<feature-slug>/prompts/`
- Manually copy instructions or run prompt files
- Track workflow state mentally or through documentation

The existing foundation provides:
- Language model tool registration pattern via `vscode.lm.registerTool()` (`src/tools/contextTool.ts:310-341`)
- Agent installation system placing `.agent.md` files in prompts directories (`src/agents/installer.ts:279-390`)
- WorkflowContext.md format storing workflow metadata (`src/prompts/workItemInitPrompt.template.md:49-62`)
- Prompt template generation with workflow mode filtering (`src/tools/createPromptTemplates.ts:124-181`)
- Context retrieval through `paw_get_context` tool (`src/tools/contextTool.ts:175-214`)
- Git validation utilities for repository checking (`src/git/validation.ts`)

Gaps requiring implementation:
- No tool for transitioning between agents
- No mechanism for agents to discover and recommend next stages
- No standardized handoff patterns across agents
- No Handoff Mode field in WorkflowContext.md
- No ReviewContext.md specification
- Limited git state analysis beyond uncommitted changes check
- Status Agent lacks workflow state reconstruction capabilities

## Desired End State

After completing this implementation plan, PAW will provide seamless workflow navigation where:

1. **Agents know the workflow**: Every agent understands its position in the workflow, can recommend logical next steps with clear command keywords, and adapts behavior based on handoff mode configuration.

2. **Users control automation level**: Users configure manual mode for full control, semi-auto mode for thoughtful defaults with critical pauses, or auto mode for complete automation—their preference persists throughout the workflow.

3. **Transitions are effortless**: Users type simple commands ("research", "plan", "implement") or let agents automatically invoke the next stage, eliminating file navigation overhead.

4. **Workflow resumption works**: The Status Agent analyzes artifacts, PRs, and git state to provide clear status reports and next step recommendations after arbitrary time gaps.

5. **Customization is flexible**: Users provide inline instructions during handoffs without creating files, but can generate prompt files on demand when deeper customization is needed.

6. **Both workflows are unified**: Standard workflows (Spec → PR) and review workflows (Understanding → Feedback) share consistent handoff patterns and command vocabulary.

**Verification Method**: Complete a full workflow from specification through final PR using semi-auto mode, then resume it after 24 hours using Status Agent, and verify:
- Each agent presents next step recommendations automatically
- Typing a command keyword successfully transitions to the target agent
- Semi-auto mode pauses at predefined points (after Spec finalization, after each phase)
- Status Agent correctly identifies completed stages and recommends next steps
- Inline customization works without creating prompt files
- No manual file navigation required at any point

### Key Discoveries:

- **Tool Registration Pattern**: Extension follows consistent pattern with `prepareInvocation()` for tool approval UI and `invoke()` for execution, returning `LanguageModelToolResult` with text parts (`src/tools/contextTool.ts:310-341`)
- **Agent Structure**: All agents are markdown files with YAML frontmatter, installed to platform-specific prompts directories, with component system for shared instructions (`src/agents/agentTemplates.ts:206-276`)
- **Prompt Templates**: Existing `paw_create_prompt_templates` tool supports workflow mode filtering (full/minimal/custom) and could be extended for on-demand generation (`src/tools/createPromptTemplates.ts:96-181`)
- **Context Files**: WorkflowContext.md stores workflow metadata in `.paw/work/<feature-slug>/`, ReviewContext.md for review workflows in `.paw/reviews/` (referenced but not yet formally specified)
- **Git Integration**: Basic git utilities exist (`validateGitRepository`, `hasUncommittedChanges`) but need expansion for branch analysis, remote comparison, and conflict detection (`src/git/validation.ts`)
- **Artifact Organization**: Standard naming convention (Spec.md, CodeResearch.md, ImplementationPlan.md, etc.) enables reliable stage detection by file existence (`agents/PAW-*.agent.md` references)

## What We're NOT Doing

- Implementing handoffs for non-PAW agents or custom user-created agents
- Creating a graphical UI for workflow visualization or stage navigation
- Supporting workflow branching, parallel stage execution, or non-linear workflows
- Providing workflow execution metrics, timing, or analytics
- Implementing collaborative or multi-user workflow features
- Creating mobile or web-based interfaces for workflow management
- Implementing approval workflows or gates beyond VS Code's built-in tool approval
- Automatic migration of existing WorkflowContext.md files to add Handoff Mode field (users add manually)
- Supporting handoff mode switching via UI commands (users edit context files directly)
- Deep GitHub API integration in extension code (agents use GitHub MCP tools)

## Implementation Approach

The implementation follows a layered approach starting with foundational tool infrastructure, then updating agent instructions to use those tools, then enhancing context file formats, and finally integrating everything through comprehensive testing.

**Phase 1** establishes the core tool infrastructure by implementing three new language model tools that follow the existing registration pattern. The Stage Transition Tool enables agent-to-agent handoffs, the Dynamic Prompt Generator Tool creates prompt files on demand, and the Status Query Tool analyzes workflow state.

**Phase 2** updates all 15 PAW agent instructions with standardized handoff patterns that define next step recommendations, command keywords, and mode-specific behavior. Each agent receives a new handoff section following a consistent template that distinguishes between manual, semi-auto, and auto mode transitions.

**Phase 3** enhances context file formats by adding the Handoff Mode field to WorkflowContext.md and creating the ReviewContext.md specification. It updates the workflow initialization logic to include handoff mode selection and ensures agents read and respect the mode configuration.

**Phase 4** validates the implementation through comprehensive testing covering all three handoff modes, both workflow types (standard and review), dynamic prompt generation, status agent functionality, and edge cases.

The phased approach allows incremental progress with testable milestones at each stage. Tools can be implemented and tested independently before agent updates begin. Agent updates can proceed in batches (standard workflow agents, then review workflow agents). Context file changes integrate once agents are ready to use them.

## Phase Summary

1. **Phase 1: Core Tool Infrastructure** - Implement Stage Transition Tool, Dynamic Prompt Generator Tool, and Status Query Tool with git state analysis utilities
2. **Phase 2: Agent Instruction Updates** - Update all 15 PAW agents with standardized handoff patterns, command keywords, and mode-specific behavior
3. **Phase 3: Context File Enhancements** - Add Handoff Mode field to WorkflowContext.md, create ReviewContext.md specification, update initialization logic
4. **Phase 4: Testing and Integration** - Comprehensive testing of all handoff modes, workflow types, dynamic generation, status reporting, and edge cases

---

## Phase 1: Core Tool Infrastructure

### Overview
Implement three new language model tools following the existing registration pattern established in the codebase. These tools provide the foundational capabilities for workflow handoffs: transitioning between agents, generating prompts on demand, and analyzing workflow state.

### Changes Required:

#### 1. Stage Transition Tool
**File**: `src/tools/stageTransition.ts` (new file)
**Changes**:
- Create `StageTransitionParams` interface with fields: `target_agent` (string, required), `feature_slug` (string, required), `inline_instructions` (string, optional), `phase_number` (number, optional)
- Implement `registerStageTransitionTool(context)` function following the pattern from `src/tools/contextTool.ts:310-341`
- In `prepareInvocation()`, validate target_agent against known PAW agents (PAW-01A through PAW-05, PAW-R1A through PAW-R3B, PAW-X), return invocation message indicating transition to target agent
- In `invoke()`:
  - Validate feature_slug format matches normalization rules (lowercase, hyphens, 1-100 chars)
  - Resolve workspace path containing `.paw/work/<feature-slug>/` or `.paw/reviews/<feature-slug>/`
  - Check for prompt file at `.paw/work/<feature-slug>/prompts/<stage>.prompt.md` matching target agent
  - If prompt file exists, read content and parse frontmatter to extract agent name
  - If no prompt file and inline_instructions provided, construct prompt content with frontmatter `agent: <target_agent>`, inline instructions, and `Work ID: <feature_slug>`
  - If no prompt file and no inline instructions, construct minimal prompt with frontmatter and work ID only
  - Return success message with instructions: "Stage transition prepared. To continue, open a new chat with @<agent-name> and use the following prompt: [prompt content]"
- Handle errors: feature slug not found, target agent unknown, workspace path unresolvable
- Register tool in extension activation

**Note**: VS Code Language Model API doesn't provide direct "create new chat" functionality. The tool returns formatted prompt content that the user or agent can use to start a new chat. This aligns with the GitHub Copilot multi-agent pattern where agents guide users to invoke other agents rather than programmatically creating chats.

#### 2. Dynamic Prompt Generator Tool
**File**: `src/tools/dynamicPromptGenerator.ts` (new file)
**Changes**:
- Create `DynamicPromptParams` interface with fields: `feature_slug` (string, required), `stage` (string, required, one of the WorkflowStage enum values), `phase_number` (number, optional), `custom_instructions` (string, optional)
- Implement `registerDynamicPromptGeneratorTool(context)` function
- In `prepareInvocation()`, return invocation message indicating prompt file creation for specified stage/phase
- In `invoke()`:
  - Validate feature_slug and resolve workspace path
  - Map stage parameter to template using existing `PROMPT_TEMPLATES` definitions from `src/tools/createPromptTemplates.ts:96-122`
  - If phase_number provided, check that stage is 'implementation' or 'review', read `ImplementationPlan.md` or review plan, extract phase-specific context
  - Generate prompt content using `generatePromptTemplate()` pattern from `src/tools/createPromptTemplates.ts:183-208`, incorporating phase context and custom instructions if provided
  - Write prompt file to `.paw/work/<feature-slug>/prompts/<filename>` with appropriate filename (e.g., `03A-implement-phase2.prompt.md` for phase-specific prompts)
  - If file exists, check timestamp and prompt user about overwrite vs. append
  - Return success message with file path: "Prompt file created at <path>. You can edit it and then run it to start the <stage> stage."
- Handle errors: invalid stage, implementation plan not found when phase_number specified, file write failures
- Register tool in extension activation

#### 3. Status Query Tool
**File**: `src/tools/statusQuery.ts` (new file)
**Changes**:
- Create `StatusQueryParams` interface with fields: `feature_slug` (string, optional - if omitted, lists all work items), `include_pr_status` (boolean, optional, default true), `include_git_status` (boolean, optional, default true)
- Implement `registerStatusQueryTool(context)` function
- In `prepareInvocation()`, return invocation message indicating workflow state analysis
- In `invoke()`:
  - If feature_slug omitted, scan workspace for all `.paw/work/*/` directories, read WorkflowContext.md from each, return list sorted by last modified time with work title, feature slug, and current stage
  - If feature_slug provided:
    - Scan `.paw/work/<feature-slug>/` for artifacts (Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md, etc.)
    - Read WorkflowContext.md to get workflow mode, review strategy, target branch, handoff mode
    - Identify completed stages by artifact existence
    - If include_git_status, call git utilities to check current branch, uncommitted changes, branch relationship to remote and target branch
    - If include_pr_status, return information that agents can use GitHub MCP tools to query (don't make GitHub calls from extension code)
    - Format status report with sections: Work Item Info, Completed Stages, Current State, Git Status, Next Step Recommendations
  - Return formatted status report as markdown text
- Handle errors: workspace not found, WorkflowContext.md missing, git command failures
- Register tool in extension activation

#### 4. Git State Analysis Utilities
**File**: `src/git/analysis.ts` (new file)
**Changes**:
- Implement `getCurrentBranch(workspacePath: string): Promise<string>` using `git branch --show-current`
- Implement `getBranchRelationship(workspacePath: string, baseBranch: string, compareBranch: string): Promise<{ ahead: number, behind: number }>` using `git rev-list --count --left-right base...compare`
- Implement `getRemoteBranches(workspacePath: string): Promise<string[]>` using `git branch -r`
- Implement `hasConflicts(workspacePath: string): Promise<boolean>` using `git diff --check` or `git status --porcelain`
- Follow existing pattern from `src/git/validation.ts` using promisified `child_process.exec`
- Export all functions for use by Status Query Tool
- Add error handling for git command failures (not in git repo, git not installed, command timeouts)

#### 5. Extension Tool Registration
**File**: `src/extension.ts`
**Changes**:
- Import `registerStageTransitionTool` from `src/tools/stageTransition.ts`
- Import `registerDynamicPromptGeneratorTool` from `src/tools/dynamicPromptGenerator.ts`
- Import `registerStatusQueryTool` from `src/tools/statusQuery.ts`
- Add tool registration calls in `activate()` function after existing tool registrations:
  ```typescript
  registerStageTransitionTool(context);
  registerDynamicPromptGeneratorTool(context);
  registerStatusQueryTool(context);
  ```
- Follow existing pattern at `src/extension.ts:44-48`

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `npm run compile`
- [ ] All tool registration functions export correctly
- [ ] Extension activates without errors in VS Code Extension Host
- [ ] Tools appear in VS Code Language Model tool registry (verify via `vscode.lm.tools`)
- [ ] Unit tests pass for git analysis utilities: `npm test -- src/test/suite/git.test.ts` (new test file)
- [ ] Tool invocation with valid parameters returns success results
- [ ] Tool invocation with invalid parameters returns error messages without throwing

#### Manual Verification:
- [ ] Stage Transition Tool invoked from agent chat returns formatted prompt content
- [ ] Dynamic Prompt Generator Tool creates prompt file at correct path
- [ ] Status Query Tool returns status report with completed stages, git status, and next steps
- [ ] Git analysis utilities correctly identify branch relationships and uncommitted changes
- [ ] Tool approval UI displays appropriate confirmation messages before execution
- [ ] Multiple work items listed by Status Query Tool when feature_slug omitted

---

## Phase 2: Agent Instruction Updates

### Overview
Update all 15 PAW agent instructions with standardized handoff patterns. Each agent receives a new section defining next step recommendations, command keywords, and mode-specific behavior. Updates distinguish between standard workflow agents (PAW-01A through PAW-05, PAW-X) and review workflow agents (PAW-R1A through PAW-R3B), ensuring each workflow type has appropriate handoff patterns.

### Changes Required:

#### 1. Standard Workflow Agents - Handoff Pattern Template
**Files**: All standard workflow agents need a new "Handoff Pattern" section
**Pattern Structure**:
```markdown
## Handoff Pattern

### Next Step Recommendations

When you complete this stage, present next step options to the user:

**Available Transitions**:
- **[primary-keyword]** (recommended): [Description of what this does and why it's recommended based on your findings]
- **[secondary-keyword]**: [Alternative transition description]
- **generate prompt [stage]**: Create customizable prompt file for [stage] before running it
- **status**: Check workflow status and get resumption guidance

**Command Keywords**: Users type these keywords to trigger transitions.

### Handoff Mode Behavior

Read "Handoff Mode" from WorkflowContext.md at startup. Adapt behavior:

**Manual Mode** (default if field missing):
- Present next step recommendations at completion
- Wait for explicit user command before transitioning
- Do NOT invoke stage transition tool automatically

**Semi-Auto Mode**:
- **Automatic Transition Points**: [List points where this agent auto-transitions without pausing]
- **Manual Pause Points**: [List points where this agent pauses for user review]
- At automatic points, invoke stage transition tool without user command
- At pause points, present recommendations and wait for user input

**Auto Mode**:
- Automatically invoke stage transition tool at all completion points
- Only pause for tool approval (VS Code built-in mechanism)
- Note: Auto mode only available for local review strategy workflows

### Stage Transition Invocation

When transitioning (manual command, semi-auto automatic point, or auto mode):

1. **With Inline Customization**:
   ```
   User says: "research but focus on authentication patterns"
   Invoke: stage_transition(target_agent="PAW-01B Spec Researcher", feature_slug="<slug>", 
                           inline_instructions="Focus research on authentication patterns")
   ```

2. **Without Customization**:
   ```
   Invoke: stage_transition(target_agent="PAW-01B Spec Researcher", feature_slug="<slug>")
   ```

3. **Dynamic Prompt Generation**:
   ```
   User says: "generate prompt research"
   Invoke: dynamic_prompt_generator(feature_slug="<slug>", stage="spec-research")
   Then inform user: "Prompt file created at .paw/work/<slug>/prompts/01B-spec-research.prompt.md"
   ```
```

#### 2. PAW-01A Specification Agent
**File**: `agents/PAW-01A Specification.agent.md`
**Changes**:
- Add Handoff Pattern section after "Agent Operating Modes" section (around line 90)
- Define next step recommendations:
  - **research** (recommended when research questions identified): "Run Spec Researcher to answer identified research questions"
  - **code**: "Skip research and proceed to Code Researcher to investigate codebase"
  - **plan**: "Skip research and code research, proceed directly to Implementation Planning"
  - **generate prompt research**: "Create customizable prompt file for research stage"
  - **status**: "Check workflow status"
- Define semi-auto transition points:
  - Automatic: After initial spec draft completes → invoke Spec Researcher (if research questions exist)
  - Manual Pause: After spec finalization (post-research or if no research) → wait for user to choose code research or planning
- Define auto mode: Automatic transition to Spec Researcher if research questions exist, otherwise Code Researcher
- Add stage transition tool invocations at appropriate completion points

#### 3. PAW-01B Spec Researcher Agent
**File**: `agents/PAW-01B Spec Researcher.agent.md`
**Changes**:
- Add Handoff Pattern section after main instructions
- Define next step recommendations:
  - **return** (recommended): "Return findings to Specification agent for spec finalization"
  - **generate prompt spec**: "Create customizable prompt file to return to spec with custom instructions"
- Define semi-auto transition points:
  - Automatic: After research completion → invoke Specification agent with inline instruction "Integrate research findings and finalize spec"
- Define auto mode: Automatic return to Specification agent
- Note: This agent always returns to Specification agent, so only one primary path

#### 4. PAW-02A Code Researcher Agent
**File**: `agents/PAW-02A Code Researcher.agent.md`
**Changes**:
- Add Handoff Pattern section after main instructions
- Define next step recommendations:
  - **plan** (recommended): "Proceed to Implementation Planning with code research findings"
  - **generate prompt plan**: "Create customizable prompt file for planning stage"
  - **status**: "Check workflow status"
- Define semi-auto transition points:
  - Automatic: After code research completion → invoke Implementation Planner
- Define auto mode: Automatic transition to Implementation Planner
- Update existing informal handoff at line 241 to use standardized pattern

#### 5. PAW-02B Impl Planner Agent
**File**: `agents/PAW-02B Impl Planner.agent.md`
**Changes**:
- Add Handoff Pattern section after "Complete means" section (around line 220)
- Define next step recommendations:
  - **implement** (recommended): "Start implementation of Phase 1 from the plan"
  - **implement phase [N]**: "Start specific phase implementation"
  - **generate prompt implement [phase]**: "Create customizable prompt file for implementation phase"
  - **status**: "Check workflow status"
- Define semi-auto transition points:
  - Manual Pause: After planning completion → wait for user to review plan and choose to start implementation
- Define auto mode: Automatic transition to Implementer for Phase 1
- Handle Planning PR review response mode: When addressing review comments, return to same mode (present recommendations after updates)

#### 6. PAW-03A Implementer Agent
**File**: `agents/PAW-03A Implementer.agent.md`
**Changes**:
- Add Handoff Pattern section after main instructions
- Define next step recommendations:
  - **review** (recommended): "Submit implementation for review by Implementation Reviewer"
  - **generate prompt review**: "Create customizable prompt file for review stage"
  - **status**: "Check workflow status"
- Define semi-auto transition points:
  - Manual Pause: After implementation phase completion → wait for user to trigger review
- Define auto mode: Automatic transition to Implementation Reviewer after phase completion

#### 7. PAW-03B Impl Reviewer Agent
**File**: `agents/PAW-03B Impl Reviewer.agent.md`
**Changes**:
- Add Handoff Pattern section after main instructions
- Define next step recommendations:
  - **implement phase [N]** (recommended when more phases exist): "Proceed to next implementation phase"
  - **document** (recommended when all phases complete in full workflow mode): "Generate documentation"
  - **pr** (recommended when all phases complete in minimal workflow mode): "Create final PR"
  - **generate prompt implement [phase]**: "Create customizable prompt file for next phase"
  - **status**: "Check workflow status"
- Define semi-auto transition points:
  - Automatic: After review passes and more phases exist → invoke Implementer for next phase
  - Manual Pause: After final phase review passes → wait for user to choose documentation or PR
- Define auto mode: Automatic transition to next phase, then to Documenter (full mode) or PR Agent (minimal mode)

#### 8. PAW-04 Documenter Agent
**File**: `agents/PAW-04 Documenter.agent.md`
**Changes**:
- Add Handoff Pattern section after main instructions
- Define next step recommendations:
  - **pr** (recommended): "Create final PR with all implementation and documentation"
  - **generate prompt pr**: "Create customizable prompt file for PR creation"
  - **status**: "Check workflow status"
- Define semi-auto transition points:
  - Manual Pause: After documentation completion → wait for user to trigger PR creation
- Define auto mode: Automatic transition to PR Agent

#### 9. PAW-05 PR Agent
**File**: `agents/PAW-05 PR.agent.md`
**Changes**:
- Add Handoff Pattern section after main instructions
- Define next step recommendations:
  - **status**: "Check overall workflow status and review PR"
  - No further workflow transitions (terminal stage)
- Define semi-auto and auto mode: No automatic transitions (terminal stage)
- Note: This agent completes the workflow

#### 10. PAW-X Status Update Agent
**File**: `agents/PAW-X Status Update.agent.md`
**Changes**:
- Comprehensive rewrite to add workflow state analysis and help mode capabilities
- Add Status Query Tool invocation section explaining how to use `status_query` tool
- Add help mode section answering common PAW questions:
  - "How do I start using PAW?" → explain workflow initialization
  - "What does [stage] do?" → explain stage purposes
  - "Should I use manual or semi-auto mode?" → provide mode recommendations
  - "What PAW work items do I have?" → invoke status_query without feature_slug
- Add next step recommendation logic based on workflow state:
  - If no artifacts exist → recommend starting with Specification
  - If Spec.md exists but no CodeResearch.md → recommend Code Research
  - If plan exists but no implementation → recommend starting Phase 1
  - If some phases complete → recommend continuing next phase
  - If all implementation done but no docs → recommend Documentation (full mode)
  - If docs done or minimal mode → recommend Final PR
- Add git state guidance section:
  - If branch behind main → recommend rebase or merge
  - If uncommitted changes → recommend commit or stash
  - If wrong branch → recommend checkout correct branch based on review strategy
- Add dynamic prompt generation guidance: when to use inline vs. file-based customization

#### 11. Review Workflow Agents - Handoff Pattern Template
**Files**: All review workflow agents (PAW-R1A through PAW-R3B)
**Pattern Structure**: Same as standard workflow template but:
- Read "Handoff Mode" from **ReviewContext.md** instead of WorkflowContext.md
- Use review-specific command keywords: "analyze", "identify gaps", "generate feedback", "critique"
- Reference review workflow stage sequence: Understanding → Baseline Research → Impact → Gap → Feedback → Critic

#### 12. PAW-R1A Understanding Agent
**File**: `agents/PAW-R1A Understanding.agent.md`
**Changes**:
- Add Handoff Pattern section reading from ReviewContext.md
- Define next step recommendations:
  - **research** (recommended when baseline research needed): "Gather context on modified code areas"
  - **analyze** (when understanding complete): "Proceed to Impact Analyzer"
  - **generate prompt baseline**: "Create customizable prompt for baseline research"
  - **status**: "Check review workflow status"
- Define semi-auto transition points:
  - Automatic: After initial PR analysis → invoke Baseline Researcher
  - Manual Pause: After understanding finalization (post-baseline research) → wait for user to proceed to impact analysis
- Define auto mode: Automatic transition to Baseline Researcher, then to Impact Analyzer

#### 13. PAW-R1B Baseline Researcher Agent
**File**: `agents/PAW-R1B Baseline Researcher.agent.md`
**Changes**:
- Add Handoff Pattern section reading from ReviewContext.md
- Define next step recommendations:
  - **return** (recommended): "Return findings to Understanding agent"
- Define semi-auto and auto mode: Automatic return to Understanding agent
- Similar to Spec Researcher pattern (always returns to parent agent)

#### 14. PAW-R2A Impact Analyzer Agent
**File**: `agents/PAW-R2A Impact Analyzer.agent.md`
**Changes**:
- Add Handoff Pattern section reading from ReviewContext.md
- Define next step recommendations:
  - **identify gaps** (recommended): "Proceed to Gap Analyzer to find issues"
  - **generate prompt gaps**: "Create customizable prompt for gap analysis"
  - **status**: "Check review workflow status"
- Define semi-auto transition points:
  - Automatic: After impact analysis completion → invoke Gap Analyzer
- Define auto mode: Automatic transition to Gap Analyzer

#### 15. PAW-R2B Gap Analyzer Agent
**File**: `agents/PAW-R2B Gap Analyzer.agent.md`
**Changes**:
- Add Handoff Pattern section reading from ReviewContext.md
- Define next step recommendations:
  - **generate feedback** (recommended): "Create review comments from identified gaps"
  - **generate prompt feedback**: "Create customizable prompt for feedback generation"
  - **status**: "Check review workflow status"
- Define semi-auto transition points:
  - Manual Pause: After gap analysis → wait for user to trigger feedback generation
- Define auto mode: Automatic transition to Feedback Generator

#### 16. PAW-R3A Feedback Generator Agent
**File**: `agents/PAW-R3A Feedback Generator.agent.md`
**Changes**:
- Add Handoff Pattern section reading from ReviewContext.md
- Define next step recommendations:
  - **critique** (recommended): "Submit feedback for quality review"
  - **generate prompt critic**: "Create customizable prompt for feedback critique"
  - **status**: "Check review workflow status"
- Define semi-auto transition points:
  - Manual Pause: After feedback generation → wait for user to trigger critique
- Define auto mode: Automatic transition to Feedback Critic

#### 17. PAW-R3B Feedback Critic Agent
**File**: `agents/PAW-R3B Feedback Critic.agent.md`
**Changes**:
- Add Handoff Pattern section reading from ReviewContext.md
- Define next step recommendations:
  - **status**: "Check review workflow status"
  - No further workflow transitions (terminal stage for review workflow)
- Define semi-auto and auto mode: No automatic transitions (terminal stage)
- Note: This agent completes the review workflow

### Success Criteria:

#### Automated Verification:
- [ ] All 15 agent files pass agent linter: `./scripts/lint-agent.sh agents/PAW-*.agent.md`
- [ ] YAML frontmatter remains valid in all agent files
- [ ] Agent component placeholder `{{PAW_CONTEXT}}` still processed correctly
- [ ] Agent installation succeeds: extension activates and installs updated agents
- [ ] No TypeScript errors when extension loads agent templates

#### Manual Verification:
- [ ] Specification agent presents "research", "code", "plan" options after spec completion
- [ ] Typing "research" in Specification agent triggers stage transition tool
- [ ] Semi-auto mode Specification agent automatically invokes Spec Researcher when research questions exist
- [ ] Auto mode completes full workflow without manual stage commands (only tool approvals)
- [ ] Review workflow agents use ReviewContext.md instead of WorkflowContext.md
- [ ] Command keywords are consistent and discoverable across all agents
- [ ] Dynamic prompt generation requests ("generate prompt research") create prompt files
- [ ] Status agent provides help mode answers to PAW process questions
- [ ] Handoff pattern sections follow consistent format across all agents

---

## Phase 3: Context File Enhancements

### Overview
Add Handoff Mode field to WorkflowContext.md format, create ReviewContext.md specification, and update workflow initialization logic to include mode selection. Ensure agents can read and respect handoff mode configuration from appropriate context files.

### Changes Required:

#### 1. WorkflowContext.md Format Update
**File**: `src/prompts/workItemInitPrompt.template.md`
**Changes**:
- Add "Handoff Mode" field to WorkflowContext.md minimal format (around line 57)
- Updated format:
  ```markdown
  # WorkflowContext
  
  Work Title: <generated_work_title>
  Feature Slug: <generated_feature_slug>
  Target Branch: <target_branch>
  Workflow Mode: <full|minimal|custom>
  Review Strategy: <prs|local>
  Handoff Mode: <manual|semi-auto|auto>
  Custom Workflow Instructions: <text or none>
  Issue URL: <issue_url_or_none>
  Remote: origin
  Artifact Paths: auto-derived
  Additional Inputs: none
  ```
- Add validation that auto mode requires local review strategy
- Add description of each handoff mode in the initialization prompt template

#### 2. Workflow Initialization Command Enhancement
**File**: `src/commands/initializeWorkItem.ts`
**Changes**:
- Add handoff mode selection to workflow initialization flow
- After review strategy selection (around line 120), prompt for handoff mode:
  - Present options: "Manual (full control)", "Semi-Auto (thoughtful defaults)", "Auto (maximum automation)"
  - Provide brief descriptions of each mode
  - Default to "Manual" if user skips
- Validate that auto mode is only selectable when review strategy is "local"
- If user selects auto + prs, show error: "Auto mode requires local review strategy. Please choose local strategy or use semi-auto mode."
- Pass selected handoff mode to WorkflowContext.md creation
- Update WorkflowContext.md template rendering to include Handoff Mode field

#### 3. ReviewContext.md Specification
**File**: `docs/ReviewContext.md` (new documentation file)
**Changes**:
- Create specification document for ReviewContext.md format
- Define structure:
  ```markdown
  # ReviewContext
  
  PR URL: <github_pr_url>
  PR Number: <number>
  Review Branch: <branch_name>
  Repository: <owner/repo>
  Handoff Mode: <manual|semi-auto|auto>
  Review Scope: <full|targeted|quick>
  Focus Areas: <comma_separated_or_none>
  Additional Context: <text_or_none>
  ```
- Document field meanings:
  - **PR URL**: GitHub pull request URL to review
  - **PR Number**: Numeric PR identifier
  - **Review Branch**: Branch containing changes being reviewed
  - **Repository**: GitHub repository in owner/repo format
  - **Handoff Mode**: Automation level for review workflow transitions
  - **Review Scope**: How thorough the review should be
  - **Focus Areas**: Specific areas to emphasize in review
  - **Additional Context**: Any extra information for reviewers
- Note that Handoff Mode is independent from standard workflow mode
- Add example ReviewContext.md files for reference

#### 4. Review Workflow Initialization (Future Work Note)
**Note**: This plan assumes review workflow initialization already exists or will be added separately. If not yet implemented:
- Create `src/commands/initializeReview.ts` following pattern from `initializeWorkItem.ts`
- Add handoff mode selection similar to standard workflow
- Create `.paw/reviews/PR-<number>/ReviewContext.md` or `.paw/reviews/<branch-slug>/ReviewContext.md`
- Register command in `package.json` contributions

#### 5. Context Tool Enhancement for Handoff Mode
**File**: `src/tools/contextTool.ts`
**Changes**:
- Update `loadWorkflowContext()` function (around line 54) to parse Handoff Mode field
- If Handoff Mode field missing, default to "manual" in the returned context
- Add validation that parsed handoff mode is one of: manual, semi-auto, auto
- Update `formatContextResponse()` to include Handoff Mode in the formatted output
- Ensure ReviewContext.md parsing (if loaded instead of WorkflowContext.md) also extracts Handoff Mode

#### 6. Documentation Updates
**File**: `README.md`
**Changes**:
- Add section explaining handoff modes under "PAW Workflows" or "User Guide"
- Document three modes with recommendations:
  - **Manual**: Best for learning PAW, workflows requiring careful review, or when you want full control at each stage
  - **Semi-Auto**: Best for experienced users who want efficiency with thoughtful pauses at critical decision points
  - **Auto**: Best for routine features in local workflows, maximum automation for well-understood changes
- Document command keywords users can type at handoff points
- Add examples of typical workflow flows in each mode
- Document Status Agent help mode capabilities

**File**: `DEVELOPING.md` or new `docs/HANDOFFS.md`
**Changes**:
- Add developer documentation for extending handoff patterns
- Document handoff pattern template structure
- Document how to add new transition points
- Document command keyword conventions
- Document how agents should invoke stage transition tool
- Provide examples of handoff implementations from existing agents

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes after context tool enhancements: `npm run compile`
- [ ] Workflow initialization creates WorkflowContext.md with Handoff Mode field
- [ ] Context tool successfully parses Handoff Mode from WorkflowContext.md
- [ ] Invalid handoff mode values trigger validation errors
- [ ] Auto mode + prs strategy combination blocked during initialization
- [ ] Missing Handoff Mode field defaults to "manual" without errors

#### Manual Verification:
- [ ] Workflow initialization prompts for handoff mode selection with clear descriptions
- [ ] Created WorkflowContext.md files include Handoff Mode field with selected value
- [ ] Agents reading WorkflowContext.md via `paw_get_context` receive Handoff Mode field
- [ ] ReviewContext.md specification provides clear format and examples
- [ ] Documentation clearly explains when to use each handoff mode
- [ ] Auto mode blocked when prs strategy selected with helpful error message

---

## Phase 4: Testing and Integration

### Overview
Validate the complete handoff system through comprehensive testing covering all three handoff modes, both workflow types, tool functionality, edge cases, and integration scenarios. Ensure the feature works end-to-end across different user workflows and handles failure modes gracefully.

### Changes Required:

#### 1. Unit Tests for Core Tools
**File**: `src/test/suite/stageTransition.test.ts` (new file)
**Changes**:
- Test Stage Transition Tool with valid parameters returns success
- Test with invalid target_agent returns error
- Test with invalid feature_slug returns error
- Test with inline_instructions incorporates custom text in prompt
- Test with phase_number passes phase context
- Test prompt file discovery when file exists
- Test prompt content generation when no file exists
- Mock file system operations for prompt file reading

**File**: `src/test/suite/dynamicPromptGenerator.test.ts` (new file)
**Changes**:
- Test Dynamic Prompt Generator with valid stage creates prompt file
- Test with invalid stage returns error
- Test with phase_number reads ImplementationPlan.md and extracts phase context
- Test with custom_instructions incorporates text in prompt
- Test file overwrite detection and prompt
- Test prompt file naming for standard stages and phase-specific prompts
- Mock file system operations for reading/writing

**File**: `src/test/suite/statusQuery.test.ts` (new file)
**Changes**:
- Test Status Query Tool with feature_slug returns status report
- Test without feature_slug returns list of work items
- Test completed stage detection by artifact existence
- Test WorkflowContext.md parsing for workflow metadata
- Test git status analysis integration
- Test error handling for missing WorkflowContext.md
- Mock file system for artifact scanning
- Mock git utilities for branch analysis

**File**: `src/test/suite/gitAnalysis.test.ts` (new file)
**Changes**:
- Test `getCurrentBranch()` returns correct branch name
- Test `getBranchRelationship()` returns ahead/behind counts
- Test `getRemoteBranches()` returns list of remote branches
- Test `hasConflicts()` detects conflict markers
- Test error handling for not a git repository
- Test error handling for git command failures
- Mock child_process.exec for git commands

#### 2. Integration Tests for Handoff Patterns
**File**: `src/test/suite/handoffIntegration.test.ts` (new file)
**Changes**:
- Test manual mode workflow: Spec → Research → Code → Plan → Implement → Review → Docs → PR
  - Verify each agent presents next step recommendations
  - Verify stage transition tool invocations return correct prompts
  - Verify no automatic transitions occur
- Test semi-auto mode workflow:
  - Verify Spec → Research automatic transition
  - Verify Research → Spec finalization automatic transition
  - Verify pause after Spec finalization before Code Research
  - Verify Code → Plan automatic transition
  - Verify pause after Plan before Implementation
  - Verify automatic phase transitions during implementation
- Test auto mode workflow:
  - Verify fully automatic transitions from Spec through PR
  - Verify only pauses for tool approvals
  - Verify local review strategy requirement
- Test review workflow handoffs:
  - Verify Understanding → Baseline Research → Understanding → Impact → Gap → Feedback → Critic
  - Verify ReviewContext.md used instead of WorkflowContext.md
  - Verify independent handoff mode configuration
- Test inline customization:
  - Verify custom instructions passed to target agent
  - Verify no prompt file created when using inline customization
- Test dynamic prompt generation:
  - Verify prompt file created at correct path
  - Verify phase-specific prompts include phase context
  - Verify file overwrite handling
- Mock agent invocations and file operations for integration testing

#### 3. Status Agent Testing
**File**: `src/test/suite/statusAgent.test.ts` (new file)
**Changes**:
- Test workflow state reconstruction from artifacts
- Test git state analysis integration
- Test next step recommendations based on workflow state
- Test multi-work-item listing
- Test help mode responses to common questions
- Test handling of missing artifacts
- Test handling of incomplete workflows
- Mock file system, git utilities, and agent interactions

#### 4. Edge Case Tests
**File**: `src/test/suite/handoffEdgeCases.test.ts` (new file)
**Changes**:
- Test mode switching mid-workflow (updating WorkflowContext.md)
- Test missing Handoff Mode field defaults to manual
- Test minimal workflow mode with missing Spec.md
- Test status agent with missing WorkflowContext.md
- Test conflicting handoff commands (ambiguous "continue")
- Test auto mode tool approval timeout
- Test prompt file already exists when requesting generation
- Test ReviewContext vs WorkflowContext file selection
- Test multi-workspace with multiple .paw/work directories
- Test agent command keyword variations (synonyms)

#### 5. Manual Testing Checklist
**File**: `docs/testing/HANDOFF_MANUAL_TESTS.md` (new file)
**Changes**:
- Create manual testing checklist covering:
  - **Manual Mode Full Workflow**: Complete a feature from spec to PR using manual transitions
  - **Semi-Auto Mode Full Workflow**: Complete a feature with automatic research and phase transitions
  - **Auto Mode Full Workflow**: Complete a feature with maximum automation
  - **Review Workflow**: Execute full review workflow using semi-auto mode
  - **Workflow Resumption**: Leave workflow incomplete, return after time, use Status Agent to resume
  - **Inline Customization**: Provide custom instructions during handoffs without creating files
  - **Dynamic Prompt Generation**: Request prompt files for specific stages and phases
  - **Help Mode**: Ask Status Agent PAW process questions and verify helpful responses
  - **Mode Switching**: Change handoff mode mid-workflow and verify subsequent stages respect change
  - **Error Handling**: Trigger various error conditions and verify graceful handling
- Include expected behaviors and success criteria for each test
- Document commands to run and expected outputs

#### 6. Linting and Consistency Checks
**File**: `scripts/lint-agent.sh`
**Changes**:
- Add checks for handoff pattern section presence in all PAW agents
- Verify command keywords are documented
- Verify mode behavior sections exist
- Verify stage transition tool invocation examples present
- Run on all 15 agents and report any missing handoff patterns
- Add to CI/CD pipeline if not already included

**File**: `.github/workflows/test.yml` or CI configuration
**Changes**:
- Add agent linting step to CI pipeline
- Run unit tests for new tools and utilities
- Run integration tests for handoff patterns
- Ensure all tests pass before merge

#### 7. End-to-End Validation Script
**File**: `scripts/test-handoffs.sh` (new file)
**Changes**:
- Create bash script to validate handoff implementation
- Steps:
  1. Initialize a test workflow with semi-auto mode
  2. Verify WorkflowContext.md created with Handoff Mode field
  3. Create mock Spec.md artifact
  4. Invoke Status Query Tool and verify status report
  5. Verify stage transition tool creates correct prompt content
  6. Verify dynamic prompt generator creates prompt file
  7. Clean up test artifacts
- Report pass/fail for each step
- Use for pre-merge validation

### Success Criteria:

#### Automated Verification:
- [ ] All unit tests pass: `npm test`
- [ ] TypeScript compilation passes: `npm run compile`
- [ ] Agent linter passes on all agents: `./scripts/lint-agent.sh agents/*.agent.md`
- [ ] Integration tests cover manual, semi-auto, and auto modes
- [ ] Edge case tests cover all identified edge cases from spec
- [ ] CI pipeline includes handoff testing and passes
- [ ] End-to-end validation script passes all steps

#### Manual Verification:
- [ ] Manual testing checklist completed with all items passing
- [ ] Manual mode workflow completed from spec to PR without automatic transitions
- [ ] Semi-auto mode workflow pauses at expected points and auto-transitions at others
- [ ] Auto mode workflow completes with only tool approval pauses
- [ ] Review workflow handoffs function correctly with ReviewContext.md
- [ ] Status Agent provides accurate workflow status and next step recommendations
- [ ] Inline customization works without creating prompt files
- [ ] Dynamic prompt generation creates files at correct paths with proper content
- [ ] Help mode answers PAW questions helpfully for new users
- [ ] Mode switching mid-workflow respected by subsequent stages
- [ ] Error conditions handled gracefully with clear messages
- [ ] No regression in existing PAW functionality

---

## Testing Strategy

### Unit Tests:
- Stage Transition Tool parameter validation, prompt generation, file discovery
- Dynamic Prompt Generator stage mapping, phase context extraction, file writing
- Status Query Tool artifact scanning, WorkflowContext.md parsing, git integration
- Git analysis utilities branch detection, relationship calculation, conflict checking
- Context tool Handoff Mode parsing, default handling, validation

### Integration Tests:
- End-to-end workflows in all three handoff modes (manual, semi-auto, auto)
- Review workflow handoffs with ReviewContext.md
- Inline customization passing instructions to target agents
- Dynamic prompt generation from agent requests
- Status Agent workflow state reconstruction and recommendations
- Mode switching mid-workflow

### Manual Testing Steps:
1. Initialize a new workflow with semi-auto mode
2. Complete Specification stage and verify automatic transition to Spec Research
3. Verify Spec Research returns to Spec for finalization
4. Verify pause after Spec finalization with next step recommendations
5. Type "code" and verify transition to Code Research agent
6. Complete Code Research and verify automatic transition to Planning
7. Complete Planning and verify pause before implementation
8. Type "implement" and verify transition to Implementer for Phase 1
9. Complete Phase 1 and trigger review
10. Verify automatic transition to next phase after review passes
11. Leave workflow incomplete, return later, invoke Status Agent
12. Verify Status Agent provides accurate state and next step recommendations
13. Continue workflow to completion using Status Agent guidance
14. Test review workflow separately with Understanding → Impact → Feedback flow
15. Test auto mode full workflow from initialization to PR creation

### Edge Cases to Test:
- Missing Handoff Mode field in WorkflowContext.md (should default to manual)
- Mode switching mid-workflow (update file, verify next agent respects change)
- Minimal workflow mode with missing Spec.md (agents handle gracefully)
- Ambiguous commands requiring clarification
- Auto mode tool approval timeout or rejection
- Prompt file already exists when requesting generation
- Multiple work items with Status Agent listing
- ReviewContext.md vs WorkflowContext.md selection in review workflows

## Performance Considerations

- Status Query Tool should complete analysis within 5 seconds for typical workflows with up to 10 stages
- Git state analysis should use efficient git commands (`git rev-list --count`, `git status --porcelain`) rather than log parsing
- Artifact scanning should use file system stat calls rather than reading full file contents when only checking existence
- Dynamic prompt generation should reuse existing template generation logic rather than duplicating code
- Stage transition tool should cache prompt file lookups to avoid repeated file system access
- Agent instruction updates should not significantly increase agent file size (aim for <500 line increase per agent for handoff pattern section)

## Migration Notes

### Existing Workflows
- Existing WorkflowContext.md files without Handoff Mode field will continue to work (agents default to manual mode)
- Users can manually add "Handoff Mode: semi-auto" or "Handoff Mode: auto" to existing WorkflowContext.md files if desired
- No automated migration of existing context files planned (users opt-in to handoff modes)

### Agent Updates
- All 15 agents receive instruction updates; no frontmatter changes needed
- Agent installation will update agents on extension activation after merge
- Development builds (-dev suffix) reinstall on every activation for testing

### Tool Registration
- New tools (stage_transition, dynamic_prompt_generator, status_query) register on extension activation
- No changes to existing tool registrations (`paw_get_context`, `paw_create_prompt_templates`)
- Tools appear in Language Model tool registry automatically after registration

## References

- Original Issue: [#69 - Implement Contextual Stage Navigation for Workflow Handoffs](https://github.com/lossyrob/phased-agent-workflow/issues/69)
- Additional Issue: [#60 - Add PAW Workflow Status Capability](https://github.com/lossyrob/phased-agent-workflow/issues/60)
- Spec: `.paw/work/workflow-handoffs/Spec.md`
- Research: `.paw/work/workflow-handoffs/CodeResearch.md`
- VS Code Language Model API: `vscode.lm` namespace documentation
- Existing Tool Pattern: `src/tools/contextTool.ts:310-341`, `src/tools/createPromptTemplates.ts:349-384`
- Agent System: `src/agents/installer.ts`, `src/agents/agentTemplates.ts`
- Git Utilities: `src/git/validation.ts`
