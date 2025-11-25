# Feature Specification: Workflow Handoffs

**Branch**: feature/workflow-handoffs  |  **Created**: 2025-11-24  |  **Status**: Draft
**Input Brief**: Implement contextual stage navigation with multiple handoff modes (manual, semi-auto, auto) and PAW Status Agent to reduce friction in workflow transitions and enable workflow resumption.

## Overview

PAW workflows consist of multiple specialized stages executed by different agents—Specification, Code Research, Implementation Planning, Implementation, Review, Documentation, and Final PR creation. Each stage produces artifacts and sets up the next stage, but currently users must manually navigate between stages. They need to know which stage comes next, find the correct prompt file in the `.paw/work/<feature-slug>/prompts/` directory, and either run the prompt file or copy instructions into a new chat. This creates significant friction, especially when resuming workflows after time away or when workflows require many iterations between stages. The manual navigation burden is particularly acute for users new to PAW who haven't yet internalized the workflow sequence, and for experienced users who want to move quickly without managing file navigation overhead.

The Workflow Handoffs feature transforms this experience by introducing intelligent stage transitions where agents understand the workflow context and can guide or automatically transition to the next appropriate stage. An agent completing the Specification stage recognizes that it identified five research questions requiring answers, and either guides the user to run the Spec Research agent next or automatically invokes it depending on the configured handoff mode. When Implementation Phase 1 completes and passes review, the system transitions smoothly into Phase 2 implementation without requiring the user to navigate files or remember what comes next. This contextual awareness extends across both the standard PAW workflow (Spec through Final PR) and the PAW Review workflow (Understanding through Feedback generation), providing consistent handoff patterns regardless of which workflow the user is executing.

Complementing the handoff mechanism is the PAW Status Agent, which serves as workflow navigator and "help mode" for PAW. When a user returns to a workflow after days or weeks, the Status Agent analyzes the workflow state by reading artifacts in the `.paw/work/<feature-slug>/` directory, checking for related PRs, and examining git state to provide a comprehensive status report with clear next step recommendations. It can generate prompt files on demand when users need to customize stage execution, reducing file noise by only creating prompts when customization adds value. The Status Agent also helps new users learn PAW by answering questions about the workflow process, explaining stage purposes, and guiding them through their first feature implementation. Together, the handoff system and Status Agent create a workflow experience where users spend their time on feature development rather than workflow navigation.

The feature supports three handoff modes to accommodate different user preferences and workflow needs. Manual mode provides full control with agents suggesting next steps but waiting for explicit user instructions before transitioning—ideal for learning PAW or workflows requiring careful review at each stage. Semi-auto mode automates transitions at thoughtful defaults while pausing at critical junctures for manual review, such as pausing after Spec Research completes to allow spec review before continuing to Code Research. Auto mode provides full "swarm" behavior where agents automatically call next agents with minimal user intervention beyond approving tool calls, enabling complete workflow automation from start to finish for routine tasks and well-understood workflows. Users can configure their preferred handoff mode in WorkflowContext.md for standard workflows or ReviewContext.md for review workflows, and the mode preference persists across all stages in that workflow.

## Objectives

- Enable contextual stage transitions where agents recommend or automatically invoke the next appropriate stage based on current workflow findings and configured handoff mode
- Provide workflow state awareness through a Status Agent that analyzes artifacts, PRs, and git state to help users understand where they are in a workflow and what to do next
- Support three handoff modes (manual, semi-auto, auto) with varying levels of automation to accommodate different user preferences and workflow types
- Reduce file noise by generating prompt files dynamically on demand rather than pre-generating all prompts upfront during workflow initialization
- Allow inline customization where users provide stage-specific instructions during handoff without creating prompt files, while still supporting file generation when deep customization is needed
- Enable workflow resumption after arbitrary time gaps by providing status analysis and next step recommendations through the Status Agent
- Maintain PAW's stage isolation philosophy where each stage gets a fresh chat context while still providing smooth transitions between stages
- Unify handoff patterns across both standard PAW workflows (Spec → Implementation → PR) and PAW Review workflows (Understanding → Impact → Feedback) for consistent user experience
- Lower cognitive load by eliminating the need for users to remember workflow stage sequences, locate prompt files, or manually navigate between agents
- Provide "help mode" through Status Agent for new users learning PAW, answering process questions and guiding adoption without leaving current workflow context

## User Scenarios & Testing

### User Story P1 – Manual Mode Standard Workflow Navigation
**Narrative**: As a developer completing the Specification stage, I want to see clear recommendations for next steps with simple commands to transition between stages, so I can maintain full control over workflow progression without manual file navigation.

**Independent Test**: Complete a Specification stage, receive next step recommendations, type a single command keyword (e.g., "research"), and land in a new chat with the Spec Research agent ready to work.

**Acceptance Scenarios**:
1. Given I complete the Specification stage and the agent identifies 5 research questions, When the agent presents next steps, Then I see options including 'research' (recommended), 'code', 'status', and 'generate prompt research' with brief explanations of each option
2. Given I type 'research' in response to the next steps, When the stage transition tool is invoked, Then a new chat opens with the Spec Research agent and the agent has access to my feature slug and workflow context
3. Given I want to customize the research stage, When I type 'generate prompt research', Then a prompt file is created at `.paw/work/<slug>/prompts/01B-spec-research.prompt.md` and I'm informed I can edit it before running
4. Given I complete Code Research and the agent finds 8 relevant code locations, When the agent presents next steps, Then I see 'plan' as the recommended next step to create the implementation plan

### User Story P1 – Semi-Auto Mode with Thoughtful Pauses
**Narrative**: As an experienced PAW user, I want automated transitions for routine handoffs (like research → spec refinement) while maintaining control at critical decision points (like after spec completion before code research), so I can work efficiently without losing oversight.

**Independent Test**: Configure semi-auto mode, run Spec agent which auto-transitions to Spec Research, which auto-returns to Spec for finalization, which then pauses for manual decision about whether to proceed to Code Research.

**Acceptance Scenarios**:
1. Given my workflow has handoff mode set to 'semi-auto', When I complete initial spec drafting with identified research questions, Then the agent automatically invokes Spec Research agent without waiting for my command
2. Given Spec Research completes and returns findings, When the agent integrates research into the spec, Then it automatically completes spec finalization and pauses with recommendations for next stage (code research or planning)
3. Given I'm in semi-auto mode with Implementation Phase 1 complete, When Implementation Review agent completes review, Then it automatically starts Phase 2 implementation without pausing
4. Given I want to customize Phase 2 approach during the pause, When I respond "continue Phase 2 but add rate limiting", Then the Implementation agent starts with my custom instructions incorporated without creating a prompt file

### User Story P1 – Status Agent Workflow Resumption
**Narrative**: As a developer returning to a workflow after two weeks away, I want to quickly understand where I left off and what to do next, so I can resume work without reconstructing context from files and git history.

**Independent Test**: Return to a workflow after time away, invoke Status Agent, receive a status report showing completed stages and artifacts, see clear next step recommendations, and execute the next step with a single command.

**Acceptance Scenarios**:
1. Given I haven't worked on a feature for 10 days, When I invoke the Status Agent for that feature slug, Then I see a status report listing completed stages (Spec ✅, Code Research ✅, Planning ✅, Phase 1 ✅) with completion dates and current state (Phase 2 not started)
2. Given the Status Agent identifies my branch is 15 commits behind main, When it presents next steps, Then it includes recommendations to either continue implementation or update the plan based on Phase 1 learnings
3. Given I have multiple active work items, When I ask "what PAW work items do I have in progress?", Then the Status Agent lists all work items ordered by recency with brief status and current stage for each
4. Given I select a work item to continue, When I say "implement Phase 3", Then the agent generates the appropriate context and transitions to the Implementation agent

### User Story P2 – Auto Mode Full Workflow Automation
**Narrative**: As a developer working on routine features in a local workflow, I want to kick off a complete workflow from spec to final PR with minimal intervention, so I can maximize automation for well-understood changes.

**Independent Test**: Start a workflow in auto mode, provide initial feature requirements, and have the system automatically progress through all stages (spec → research → code research → planning → implementation → review → docs → final PR) with user only approving tool calls.

**Acceptance Scenarios**:
1. Given I configure a workflow with handoff mode 'auto', When I provide initial feature requirements to the Spec agent, Then the agent completes spec, automatically invokes Research, which automatically returns to Spec for finalization, which automatically invokes Code Research
2. Given the Code Research stage completes in auto mode, When findings are ready, Then the Planning agent is automatically invoked, creates the implementation plan, and automatically invokes the Implementation agent for Phase 1
3. Given Implementation Phase 1 completes in auto mode, When the Implementation Review agent finishes review, Then it automatically invokes Implementation agent for Phase 2 without pausing
4. Given I'm running auto mode with local review strategy, When the final implementation phase completes and passes review, Then the Documenter agent runs automatically followed by Final PR agent to create the PR

### User Story P2 – Dynamic Prompt Generation with Customization
**Narrative**: As a developer who occasionally needs stage-specific customization, I want to request prompt file generation only when I need deep customization, so I avoid file noise while retaining customization capability.

**Independent Test**: Work through a workflow using inline customization for most stages (no prompt files created), then request prompt generation for one specific stage requiring detailed instructions, edit the generated file, and run it.

**Acceptance Scenarios**:
1. Given I complete Specification and want to provide context for implementation, When I say "implement Phase 1 but use async/await pattern", Then the Implementation agent starts with my instructions without creating a prompt file
2. Given I need to provide detailed phase-specific instructions, When I say "generate prompt implementer Phase 3", Then a prompt file is created at `.paw/work/<slug>/prompts/Implementer-Phase3.prompt.md` with phase context from the implementation plan
3. Given I generated a prompt file for customization, When I edit the file to add my specific requirements and run it, Then the agent receives my custom instructions along with the standard workflow context
4. Given I complete a workflow mostly using inline customization, When I check the prompts directory, Then I see only prompt files for stages where I explicitly requested generation

### User Story P2 – Review Workflow Handoffs
**Narrative**: As a developer using PAW Review workflow to analyze a PR, I want the same handoff patterns available in the standard workflow, so I experience consistent stage transitions whether doing feature development or PR review.

**Independent Test**: Start a review workflow with Understanding agent, have it automatically invoke Baseline Research (semi-auto), return to Understanding for finalization, then manually transition to Impact Analyzer.

**Acceptance Scenarios**:
1. Given I'm in semi-auto mode for a review workflow, When the Understanding agent completes initial PR analysis, Then it automatically invokes Baseline Research to gather context on modified areas
2. Given Baseline Research completes and returns to Understanding, When the Understanding agent integrates baseline context, Then it pauses with recommendations for next steps including 'analyze impact', 'pause', or 'generate prompt impact'
3. Given I want to proceed to impact analysis, When I type 'analyze', Then the Impact Analyzer agent starts in a new chat with access to the Understanding and Baseline Research findings
4. Given I'm in manual mode for review workflow, When Gap Analyzer completes, Then it presents next step recommendations including 'generate feedback', 'status', and option to customize the feedback generation

### User Story P3 – Status Agent Help Mode for Onboarding
**Narrative**: As a new engineer learning PAW, I want to ask questions about the workflow process and receive guidance on what to do at each stage, so I can adopt PAW without extensive documentation reading.

**Independent Test**: As a new user, ask the Status Agent "How do I start using PAW for a new feature?" and receive step-by-step guidance that helps initialize a workflow and understand the first steps.

**Acceptance Scenarios**:
1. Given I'm new to PAW, When I ask "How do I start using PAW for a new feature?", Then the Status Agent explains the workflow initialization command, describes the Specification starting point, and outlines the handoff mode choices
2. Given I'm mid-workflow and unsure what a stage does, When I ask "What does the Code Research stage do?", Then the Status Agent explains the purpose, what artifacts it produces, and when I should run it
3. Given I completed a stage and see next step recommendations, When I ask "What's the difference between research and code?", Then the Status Agent explains that research answers spec questions while code research investigates the existing codebase
4. Given I want to understand handoff modes, When I ask "Should I use manual or semi-auto mode?", Then the Status Agent describes each mode's benefits and provides recommendations based on experience level and workflow type

### User Story P3 – Mode Preference Persistence
**Narrative**: As a developer who prefers semi-auto mode for my standard workflows, I want my handoff mode preference to persist throughout the workflow lifecycle, so I don't need to reconfigure mode at each stage.

**Independent Test**: Configure semi-auto mode during workflow initialization, complete multiple stages across different days, and verify each agent respects the semi-auto configuration without re-prompting.

**Acceptance Scenarios**:
1. Given I initialize a workflow with semi-auto mode, When WorkflowContext.md is created, Then it contains "Handoff Mode: semi-auto" field
2. Given my WorkflowContext.md specifies semi-auto mode, When each agent starts (Spec Research, Code Research, Planning, Implementation), Then the agent reads the mode from WorkflowContext.md and applies semi-auto behavior
3. Given I'm using semi-auto mode in a standard workflow, When an agent completes a stage at an automatic transition point, Then it automatically invokes the next agent without prompting for mode confirmation
4. Given I want to switch from semi-auto to manual mid-workflow, When I update the Handoff Mode field in WorkflowContext.md, Then subsequent stages respect the new mode setting

### User Story P3 – Git State Assistance
**Narrative**: As a developer who sometimes gets confused about git branch state during multi-phase workflows, I want the Status Agent to help identify and resolve git state issues, so I can keep my local work synchronized with remote changes.

**Independent Test**: Complete Phase 1 and merge the PR, then ask Status Agent about workflow state, and receive recommendations that include git operations to synchronize local branch with merged changes.

**Acceptance Scenarios**:
1. Given Phase 1 PR was merged to main and my branch is behind, When I invoke Status Agent, Then it identifies "Your branch feature/auth is 15 commits behind main" in the status report
2. Given the Status Agent identifies divergence from remote, When it presents next steps, Then recommendations include git operations like rebasing or merging main into the feature branch
3. Given I have uncommitted changes when checking status, When the Status Agent analyzes git state, Then it reports uncommitted changes and suggests either committing or stashing before proceeding to next stage
4. Given I'm uncertain about which branch to be on, When I ask the Status Agent, Then it identifies the correct branch based on current workflow phase and review strategy (phase branch for prs strategy, target branch for local strategy)

### Edge Cases

- **No SpecResearch.md in Minimal Mode**: When workflow mode is minimal and spec stage is skipped, agents attempting to read Spec.md handle its absence gracefully by using Issue URL as requirements source without blocking (Code Research agent already has this pattern)
- **Mode Switching Mid-Workflow**: When a user manually updates Handoff Mode in WorkflowContext.md from manual to semi-auto or vice versa mid-workflow, subsequent stages respect the new mode without requiring workflow reinitialization
- **Status Agent with Missing Artifacts**: When Status Agent encounters a workflow with missing expected artifacts (e.g., ImplementationPlan.md doesn't exist), it reports the gap and suggests running the missing stage rather than failing
- **Conflicting Handoff Commands**: When a user provides an ambiguous command like "continue" when multiple next steps are possible, the agent clarifies by listing the ambiguous options and asking the user to be more specific
- **Auto Mode Tool Approval Timeout**: When running auto mode and a tool approval times out or is rejected, the workflow pauses gracefully with status information rather than continuing or failing silently
- **Prompt File Already Exists**: When a user requests dynamic prompt generation and the file already exists, the agent informs the user and asks whether to overwrite, append to, or use the existing file
- **ReviewContext vs WorkflowContext**: When determining handoff mode for a review workflow, agents read from ReviewContext.md rather than WorkflowContext.md to ensure review workflows have independent mode configuration from standard workflows
- **Status Agent Multi-Workspace**: When Status Agent is invoked in a VS Code workspace with multiple root folders, it searches all folders for `.paw/work/` directories and presents all found work items if the feature slug is ambiguous

## Requirements

### Functional Requirements

- FR-001: Extension must provide a Stage Transition Tool that agents can invoke to hand off workflow execution to another agent (Stories: P1-Manual, P1-Semi-Auto, P2-Auto, P2-Review)
- FR-002: Stage Transition Tool must read prompt template files from `.paw/work/<feature-slug>/prompts/` directory or accept inline prompt content when files don't exist (Stories: P1-Manual, P2-Dynamic)
- FR-003: Stage Transition Tool must parse frontmatter to determine target agent and create new chat with that agent, passing workflow context including feature slug (Stories: P1-Manual, P1-Semi-Auto, P2-Auto)
- FR-004: Extension must provide a Dynamic Prompt Generator Tool that creates prompt files on demand for any workflow stage (Stories: P2-Dynamic)
- FR-005: Dynamic Prompt Generator Tool must support phase-specific customization by accepting phase number parameter and incorporating phase context from ImplementationPlan.md (Stories: P2-Dynamic)
- FR-006: Extension must provide a Status Query Tool that analyzes workflow state by scanning `.paw/work/<feature-slug>/` directory for artifacts and checking git/PR state (Stories: P1-Status)
- FR-007: Status Query Tool must identify completed stages by checking for existence of stage artifacts (Spec.md, CodeResearch.md, ImplementationPlan.md, etc.) and parse WorkflowContext.md for last known stage (Stories: P1-Status, P3-Git)
- FR-008: Status Query Tool must check for related PRs by searching GitHub for PRs from workflow branches and report their states (open, merged, closed) (Stories: P1-Status)
- FR-009: Status Query Tool must assess git state including current branch, relationship to remote branches, and uncommitted changes (Stories: P3-Git)
- FR-010: All PAW agents (standard workflow: PAW-01A through PAW-05; review workflow: PAW-R1A through PAW-R3B) must include handoff pattern sections in their instructions (Stories: P1-Manual, P1-Semi-Auto, P2-Auto, P2-Review)
- FR-011: Agent handoff pattern sections must define stage-specific next step recommendations including command keywords, brief explanations, and context-aware guidance based on stage findings (Stories: P1-Manual, P2-Review)
- FR-012: Agent handoff pattern sections must specify automatic transition points for semi-auto mode where agents invoke next stage without pausing (Stories: P1-Semi-Auto)
- FR-013: Agent handoff pattern sections must specify manual review pause points for semi-auto mode where agents present recommendations and wait for user input (Stories: P1-Semi-Auto)
- FR-014: WorkflowContext.md must include a "Handoff Mode" field with values limited to: manual, semi-auto, auto (Stories: P3-Persistence)
- FR-015: ReviewContext.md must include a "Handoff Mode" field with values limited to: manual, semi-auto, auto, independently configured from standard workflow mode (Stories: P2-Review)
- FR-016: Agents must read Handoff Mode from WorkflowContext.md (for standard workflows) or ReviewContext.md (for review workflows) at startup and adapt handoff behavior accordingly (Stories: P3-Persistence)
- FR-017: Manual mode agents must present next step recommendations as formatted options and wait for explicit user command before invoking stage transition (Stories: P1-Manual)
- FR-018: Semi-auto mode agents must automatically invoke stage transitions at predefined automatic transition points without user command (Stories: P1-Semi-Auto)
- FR-019: Semi-auto mode agents must pause at predefined manual review points, present next step recommendations, and wait for user confirmation before transitioning (Stories: P1-Semi-Auto)
- FR-020: Auto mode agents must automatically invoke stage transitions at all transition points with user only approving tool calls (Stories: P2-Auto)
- FR-021: Auto mode must be restricted to local review strategy workflows only (Stories: P2-Auto)
- FR-022: Stage transition tool invocations must support inline customization by accepting optional instruction text that is incorporated into the target agent's prompt (Stories: P2-Dynamic)
- FR-023: Agents must not create prompt files when receiving inline customization during stage transitions (Stories: P2-Dynamic)
- FR-024: Status Agent (PAW-X Status Update) must provide workflow resumption capability by analyzing workflow state and suggesting appropriate next stages (Stories: P1-Status)
- FR-025: Status Agent must support listing multiple active work items ordered by most recent activity when feature slug is not specified (Stories: P1-Status)
- FR-026: Status Agent must provide help mode capability by answering questions about PAW process, stage purposes, and workflow guidance (Stories: P3-Help)
- FR-027: Status Agent must invoke Dynamic Prompt Generator Tool when user requests prompt generation for specific stage or phase (Stories: P2-Dynamic)
- FR-028: All handoff patterns must use consistent command keyword vocabulary across standard and review workflows for equivalent transitions (Stories: P2-Review)
- FR-029: When Handoff Mode field is missing from WorkflowContext.md or ReviewContext.md, agents must default to manual mode behavior (Stories: P3-Persistence)
- FR-030: Stage transition must preserve workflow isolation by creating new chat for target agent rather than continuing in current chat context (Stories: P1-Manual)

### Key Entities

- **Handoff Mode**: Configuration setting (manual, semi-auto, auto) determining automation level for stage transitions
- **Stage Transition**: Moving workflow execution from current agent to next agent with context preservation
- **Transition Point**: Location in agent execution where handoff to next stage can occur (automatic or manual pause)
- **Prompt Template**: File containing agent frontmatter and instructions for stage execution
- **Workflow State**: Current position in workflow determined by completed artifacts, PR states, git state
- **Next Step Recommendation**: Formatted presentation of available stage transitions with command keywords and explanations
- **Command Keyword**: Short natural language phrase users type to trigger stage transitions (e.g., "research", "plan", "implement")
- **Inline Customization**: User-provided instructions passed during handoff without creating prompt file
- **Dynamic Prompt**: Prompt file generated on demand rather than during workflow initialization
- **Status Report**: Comprehensive analysis of workflow state including completed stages, artifacts, PRs, git state, and next step recommendations
- **Work Item**: PAW workflow instance identified by feature slug with associated artifacts and WorkflowContext.md
- **Auto Transition Point**: Stage completion location where semi-auto or auto mode automatically invokes next agent
- **Manual Pause Point**: Stage completion location where semi-auto mode stops for user review before continuing
- **Review Workflow**: PAW workflow for analyzing PRs, distinct from standard feature development workflow, using ReviewContext.md

### Cross-Cutting / Non-Functional

- **Consistency**: Handoff patterns, command keywords, and next step presentation format must be consistent across all agents within workflow type (standard or review) to reduce cognitive load
- **Discoverability**: Next step recommendations must clearly explain what each option does so users can make informed decisions without consulting documentation
- **Learnability**: Status Agent help mode must provide answers understandable to engineers new to PAW without assuming deep PAW knowledge
- **Reliability**: Stage transitions must successfully create new chats with correct agent and context 99% of the time across different workflow states
- **Responsiveness**: Status Query Tool must complete analysis and present status report within 5 seconds for typical workflows with up to 10 stages and 20 PRs
- **Resumability**: Status Agent must enable workflow resumption at any point after arbitrary time gaps by reconstructing workflow state from artifacts and git/PR state

## Success Criteria

- SC-001: Agent completing a stage presents next step recommendations to user within 2 seconds of stage completion (FR-011)
- SC-002: User typing a command keyword results in new chat with target agent opening within 3 seconds (FR-001, FR-003)
- SC-003: New agent chat has access to workflow context including correct feature slug and can retrieve WorkflowContext.md (FR-003)
- SC-004: Semi-auto mode completes automatic transitions from Spec → Spec Research → Spec finalization without user intervention (FR-012, FR-018)
- SC-005: Semi-auto mode pauses after Spec finalization and presents next step recommendations before proceeding to Code Research (FR-013, FR-019)
- SC-006: Auto mode completes entire workflow from Spec through Final PR with user only approving tool calls, no manual stage commands needed (FR-020)
- SC-007: Status Agent invoked with feature slug presents status report including completed stages, missing artifacts, PR states, and git status within 5 seconds (FR-006, FR-007, FR-008, FR-009)
- SC-008: Status Agent presents next step recommendations with at least 2 actionable options based on current workflow state (FR-024)
- SC-009: User requesting dynamic prompt generation receives prompt file at correct path within 2 seconds and can edit before running (FR-004)
- SC-010: Inline customization during handoff ("implement Phase 2 but add rate limiting") results in Implementation agent receiving custom instructions without creating prompt file (FR-022, FR-023)
- SC-011: Workflow initialized with semi-auto mode maintains semi-auto behavior across all stages for the duration of the workflow without re-prompting for mode (FR-014, FR-016)
- SC-012: Review workflow (Understanding → Impact → Feedback) handoffs function identically to standard workflow handoffs with mode configuration independent in ReviewContext.md (FR-015, FR-028)
- SC-013: Status Agent listing multiple work items presents them ordered by most recent update with status visible for each (FR-025)
- SC-014: Status Agent answering PAW process questions provides responses understandable to new users within 3 seconds (FR-026)
- SC-015: WorkflowContext.md or ReviewContext.md missing Handoff Mode field results in agents defaulting to manual mode behavior without errors (FR-029)
- SC-016: Stage transition creates new chat rather than continuing current chat, maintaining stage isolation (FR-030)
- SC-017: Agent completing a workflow stage with 5 possible next steps presents all 5 options with distinguishable descriptions in under 10 lines of text (FR-011)
- SC-018: User switching from manual to semi-auto mode mid-workflow by editing WorkflowContext.md results in subsequent stages respecting new mode (FR-016)

## Assumptions

- **Tool Approval Infrastructure Exists**: VS Code's Language Model Tool API provides sufficient tool approval mechanisms for auto mode to function safely with user oversight
- **Agent-to-Agent Context Passing**: Creating a new chat with a target agent and passing feature slug enables the target agent to retrieve all necessary workflow context via paw_get_context tool
- **Three Handoff Modes Sufficient**: Manual, semi-auto, and auto modes cover the spectrum of automation preferences users need; additional modes can be added later based on usage patterns
- **Command Keywords Natural and Discoverable**: Single-word or two-word command keywords (research, plan, implement, analyze, generate feedback) are intuitive enough that users can guess or remember them after seeing them once
- **Git State Analysis Feasible**: Analyzing git branch relationships, divergence from remote, and uncommitted changes provides sufficient information for meaningful status reporting without deep git internals knowledge
- **PR Search by Branch Pattern**: Searching GitHub for PRs from branches matching PAW naming patterns (<target>_plan, <target>_phase1, <target>_docs) reliably identifies workflow-related PRs
- **Prompt Template Frontmatter Parseable**: All prompt template files follow consistent frontmatter format with 'agent' field, making agent identification reliable
- **Status Agent as Conversational Agent**: Implementing Status Agent as a GitHub Copilot agent (rather than VS Code command) provides sufficient natural language flexibility for help mode and workflow guidance
- **Dual Context Files Acceptable**: Maintaining both WorkflowContext.md (standard workflows) and ReviewContext.md (review workflows) with independent handoff mode configuration is acceptable overhead for users
- **Semi-Auto Pause Points Definable**: Thoughtful pause points for semi-auto mode can be predefined in agent instructions and align well with typical workflow needs across most use cases
- **Inline Customization Without Files**: Passing custom instructions to agents without creating prompt files maintains equivalent functionality to file-based prompts for most customization needs
- **Workflow State Reconstruction**: Reading artifacts, PRs, and git state provides sufficient information to reconstruct workflow position accurately enough for resumption guidance
- **Auto Mode Local Only**: Restricting auto mode to local review strategy (no intermediate PRs) reduces complexity while still enabling full automation for the primary use case

## Scope

**In Scope:**
- Implementing Stage Transition Tool, Dynamic Prompt Generator Tool, and Status Query Tool as VS Code extension language model tools
- Updating all 9 standard PAW agent instructions (PAW-01A through PAW-05, PAW-X) to include handoff pattern sections
- Updating all review PAW agent instructions (PAW-R1A through PAW-R3B) to include handoff pattern sections
- Adding "Handoff Mode" field to WorkflowContext.md specification
- Creating ReviewContext.md specification with "Handoff Mode" field for review workflows
- Defining manual, semi-auto, and auto handoff mode behaviors with clear transition points and pause points
- Implementing Status Agent enhancements for workflow state analysis, next step recommendations, and help mode
- Defining consistent command keyword vocabulary for stage transitions across all workflows
- Implementing dynamic prompt generation capability for on-demand file creation
- Supporting inline customization during handoffs without file creation
- Implementing workflow resumption capability in Status Agent
- Defining git state analysis requirements for Status Agent
- Implementing multi-work-item listing and selection in Status Agent

**Out of Scope:**
- Automatic WorkflowContext.md or ReviewContext.md mode field migration for existing workflows (users can add manually if desired)
- Implementing handoffs for non-PAW agents or custom user-created agents
- Creating a graphical UI for workflow visualization or stage navigation beyond text-based recommendations
- Implementing workflow branching or parallel stage execution (workflows remain linear)
- Supporting handoff mode switching via UI commands (users edit context file directly)
- Implementing workflow templates or predefined stage sequences beyond the existing PAW workflow structure
- Creating persistent workflow state tracking beyond what's stored in artifacts and context files
- Implementing rollback or undo capability for stage transitions (users navigate manually if needed)
- Providing workflow execution metrics, timing, or analytics
- Implementing collaborative or multi-user workflow features where multiple developers share handoff state
- Creating mobile or web-based interfaces for workflow handoff or status checking
- Implementing approval workflows or human-in-the-loop gates beyond VS Code tool approval

## Dependencies

- VS Code Language Model Tool API for registering Stage Transition Tool, Dynamic Prompt Generator Tool, and Status Query Tool
- GitHub Copilot agent framework for implementing Status Agent as conversational agent
- GitHub MCP tools for PR state checking (pull_request_read, search_pull_requests)
- Git command-line tools for branch and remote state analysis
- Existing paw_get_context tool for workflow context retrieval during handoffs
- Existing paw_create_prompt_templates tool as foundation for dynamic prompt generation
- WorkflowContext.md format and location conventions established in prior work
- Existing PAW agent instruction format and frontmatter conventions

## Risks & Mitigations

- **Risk**: Command keyword ambiguity where same keyword could mean different things in different contexts. **Impact**: Users type "implement" after Spec but agent doesn't know which phase. **Mitigation**: Agents use workflow state context to disambiguate (e.g., if ImplementationPlan.md doesn't exist, "implement" means "create plan first"); provide clear error messages when ambiguous and list options.

- **Risk**: Auto mode creates runaway agent chains that consume excessive API quota. **Impact**: User cost concerns, accidental resource exhaustion. **Mitigation**: Restrict auto mode to local review strategy only (fewer stages); rely on VS Code tool approval to give user control; implement safety limits on automatic transition depth if needed.

- **Risk**: Handoff patterns create inconsistent expectations across agents. **Impact**: Users confused by different handoff presentation styles. **Mitigation**: Define strict handoff pattern template in this spec; include pattern in agent linting checks; review all agent updates for consistency before merge.

- **Risk**: Status Agent can't reliably reconstruct workflow state when artifacts are manually edited or moved. **Impact**: Status reports mislead users about workflow position. **Mitigation**: Status Agent reports what it finds rather than making assumptions; include warnings when state appears inconsistent (e.g., Phase 2 artifact exists but Phase 1 doesn't); suggest running Status Agent regularly to maintain awareness.

- **Risk**: Dynamic prompt generation timing issues where agent tries to read file before it's fully written. **Impact**: Agent gets partial content or file not found errors. **Mitigation**: Dynamic Prompt Generator Tool returns success confirmation only after file write completes; agents wait for tool confirmation before attempting to read generated files.

- **Risk**: Semi-auto pause points don't align with user needs, creating frustration. **Impact**: Users want automation to stop earlier or continue longer than defaults. **Mitigation**: Document that semi-auto pause points are thoughtful defaults but users can switch to manual mode for full control or auto mode for maximum automation; gather usage feedback to refine pause points over time.

- **Risk**: Review workflows and standard workflows have different optimal handoff patterns but shared implementation. **Impact**: One workflow type gets suboptimal experience. **Mitigation**: Design handoff tools to be flexible enough for both workflow types; allow different command keywords for review vs standard where natural (e.g., "analyze impact" vs "plan"); test both workflow types thoroughly.

- **Risk**: WorkflowContext.md and ReviewContext.md mode configuration can drift out of sync or conflict. **Impact**: User confusion about which mode applies. **Mitigation**: Agents strictly read from correct context file based on workflow type; documentation clearly states standard workflows use WorkflowContext.md and review workflows use ReviewContext.md; Status Agent reports handoff mode as part of status check.

## References

- Issue: [#69 - Implement Contextual Stage Navigation for Workflow Handoffs](https://github.com/lossyrob/phased-agent-workflow/issues/69)
- Issue: [#60 - Add PAW Workflow Status Capability](https://github.com/lossyrob/phased-agent-workflow/issues/60)
- Research: (No SpecResearch.md yet - will be created if research stage is executed)
- External: None

## Glossary

- **Stage**: A distinct phase in PAW workflow executed by a specialized agent (Specification, Code Research, Implementation Planning, Implementation, Review, Documentation, Final PR)
- **Handoff**: The act of transitioning workflow execution from one agent to another with context preservation
- **Transition Point**: A location in agent execution where a handoff can occur
- **Automatic Transition Point**: A transition point where semi-auto or auto mode agents automatically invoke the next stage without user command
- **Manual Pause Point**: A transition point where semi-auto mode agents stop and present options before continuing
- **Command Keyword**: A short natural language phrase users type to trigger stage transitions
- **Feature Slug**: The normalized identifier for a workflow instance (also called Work ID)
- **Workflow Context**: The set of parameters and state information defining a workflow instance (stored in WorkflowContext.md or ReviewContext.md)
- **Prompt Template**: A markdown file with agent frontmatter and instructions for executing a workflow stage
- **Inline Customization**: Providing stage-specific instructions during handoff without creating a prompt file
- **Dynamic Prompt**: A prompt file generated on demand during workflow execution rather than pre-generated during initialization
- **Status Report**: A comprehensive analysis of workflow state including completed stages, artifacts, PRs, git state, and next step recommendations
- **Help Mode**: Status Agent capability to answer questions about PAW process and provide workflow guidance
- **Standard Workflow**: The primary PAW workflow for feature development (Spec → Implementation → PR)
- **Review Workflow**: The PAW workflow for PR analysis and feedback generation (Understanding → Impact → Feedback)
- **Swarm Behavior**: Auto mode characteristic where agents automatically call subsequent agents without pauses, creating chain of automated execution
