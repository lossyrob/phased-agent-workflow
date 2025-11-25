# Feature Specification: Workflow Handoffs

**Branch**: feature/workflow-handoffs  |  **Created**: 2025-11-24  |  **Status**: Draft
**Input Brief**: Implement contextual stage navigation for PAW workflows with multiple handoff modes (Manual, Semi-Auto, Auto) and enhanced Status Agent for workflow resumption

## Overview

Today's PAW workflows require users to manually navigate between stages: after completing a specification, they must remember which stage comes next, navigate to the correct prompt file in `.paw/work/<slug>/prompts/`, and manually execute it. This creates friction that hinders adoption, especially when returning to a workflow after days or weeks away. Users must remember where they left off, understand the current workflow state, and determine appropriate next steps without automated guidance.

The Workflow Handoffs feature transforms this experience by introducing intelligent, contextual stage transitions. When a PAW agent completes its work—whether finishing a specification, completing code research, or reviewing implementation—it analyzes findings and presents clear, actionable next steps. Users can type simple commands like `research` or `implement Phase 2` to instantly transition to the appropriate agent in a fresh chat session, with all context automatically carried forward through the Work ID. The system adapts to user preferences through three handoff modes: Manual mode provides full control with explicit next-step suggestions, Semi-Auto mode automates routine transitions while pausing at critical decision points, and Auto mode enables complete workflow automation for experienced users working on well-understood tasks.

Supporting this handoff system is an enhanced Status Agent that serves as workflow navigation central. Users can ask "where am I?" at any time and receive comprehensive analysis of completed stages, current phase progress, git state, and PR status. The Status Agent helps users resume workflows after extended breaks by reconstructing state from artifacts, suggests appropriate next actions based on current workflow position, and enables jumping into any stage without pre-generated prompt files through dynamic prompt generation. This creates a resumable, discoverable workflow system that lowers cognitive load while maintaining PAW's core philosophy of stage isolation and fresh context per agent.

Together, these capabilities make PAW workflows feel guided rather than manual, reducing the friction of multi-stage development while preserving user control and the architectural benefits of separate agent contexts. The system works for both standard PAW workflows (Spec through Final PR) and review workflows (Understanding through Feedback), providing consistent handoff patterns across all workflow types.

## Objectives

- Enable single-command stage transitions that eliminate manual prompt file navigation and execution
- Reduce cognitive load by providing context-aware next-step recommendations based on current findings and workflow state
- Support flexible automation levels through three handoff modes (Manual, Semi-Auto, Auto) that adapt to user experience and task complexity
- Enable workflow resumption after arbitrary time away through Status Agent analysis of artifacts and git state
- Maintain PAW's stage isolation philosophy where each agent receives fresh context through tool-based context retrieval (Rationale: preserves architectural benefits of independent agent reasoning without context pollution from prior conversations)
- Minimize file noise by generating prompt files only when customization is needed rather than pre-generating all files upfront
- Provide consistent handoff patterns across both standard and review workflows (Rationale: unified patterns reduce learning curve and enable shared tooling)
- Lower PAW adoption barrier through help mode and workflow state awareness that guide new users through the process

## User Scenarios & Testing

### User Story P1 – Manual Mode Stage Transitions
Narrative: As a developer new to PAW, I want to see clear options for next stages after completing work so I can learn the workflow structure while maintaining full control over transitions.

Independent Test: After Spec Agent completes, user types `research` and lands in fresh Spec Research Agent chat with Work ID context loaded.

Acceptance Scenarios:
1. Given Spec Agent completes specification with 5 research questions identified, When agent presents next steps, Then user sees formatted options: `research`, `code`, `status`, `generate prompt research`
2. Given user types `research` command, When handoff tool executes, Then new chat opens automatically with Spec Research Agent and Work ID passed as parameter
3. Given Spec Research Agent starts, When agent begins work, Then it calls `paw_get_context` tool to retrieve WorkflowContext.md and custom instructions
4. Given user wants to customize before proceeding, When user types `generate prompt research`, Then prompt file is created at `.paw/work/<slug>/prompts/01B-spec-research.prompt.md` and user can edit before execution

### User Story P1 – Semi-Auto Mode Thoughtful Automation
Narrative: As an experienced PAW user, I want routine transitions automated while maintaining control at critical decision points so I can move efficiently through workflows without losing oversight.

Independent Test: After Spec completes in Semi-Auto mode, Spec Research automatically starts, completes research, and automatically returns to Spec Agent, which then pauses for user review before proceeding to Code Research.

Acceptance Scenarios:
1. Given Handoff Mode is "semi-auto" in WorkflowContext.md, When Spec Agent completes, Then Spec Research Agent starts automatically without user command
2. Given Spec Research completes with research findings, When returning to Spec Agent, Then agent automatically invokes handoff without user typing `continue`
3. Given Spec Agent finalizes specification, When presenting next steps, Then agent pauses and displays options rather than automatically proceeding to Code Research
4. Given Implementation Phase 1 completes, When Implementation Review finishes, Then agent pauses with phase PR link and explicitly waits for user to command `implement Phase 2`
5. Given Understanding Agent completes in review workflow Semi-Auto mode, When baseline research needed, Then Baseline Research Agent starts automatically

### User Story P1 – Auto Mode Full Workflow Execution
Narrative: As a developer working on routine tasks with well-understood requirements, I want to initiate a workflow and have agents automatically chain through all stages with minimal intervention so I can focus on approving tool calls rather than managing transitions.

Independent Test: User types "Start PAW workflow for auth feature" and Auto mode executes Spec → Spec Research → Spec → Code Research → Implementation Plan → Implementation → Review → Docs → Final PR with user only approving tool invocations.

Acceptance Scenarios:
1. Given Handoff Mode is "auto" in WorkflowContext.md, When any agent completes, Then next appropriate agent starts automatically without pause
2. Given Implementation Phase 1 completes, When Implementation Review finishes and commits/pushes, Then Implementation Phase 2 starts automatically (if phases remain)
3. Given user has set "Always Allow" for handoff tool, When agents chain transitions, Then no manual approval required per handoff
4. Given Auto mode requires local review strategy, When user initializes workflow with Auto mode, Then review strategy is automatically set to "local" and prs strategy is rejected with error message

### User Story P2 – Inline Customization Without File Generation
Narrative: As a developer making minor adjustments to standard workflows, I want to provide inline instructions during handoffs without managing prompt files so I can customize agent behavior without filesystem noise.

Independent Test: User types "continue Phase 2 but add rate limiting" and Implementation Agent receives Work ID plus inline instruction about rate limiting without prompt file creation.

Acceptance Scenarios:
1. Given Implementation Phase 1 completes, When user types `continue Phase 2 but remember to add rate limiting`, Then handoff tool extracts inline instruction "remember to add rate limiting"
2. Given handoff tool extracts inline instruction, When constructing prompt, Then prompt includes Work ID and appends user instruction
3. Given Implementation Agent starts with inline instruction, When agent begins work, Then inline instruction is visible in agent's initial context
4. Given inline instruction provided, When handoff completes, Then no prompt file is created in `.paw/work/<slug>/prompts/` directory

### User Story P2 – Workflow Resumption After Time Away
Narrative: As a developer returning to a paused workflow after days or weeks, I want to ask "where am I?" and receive comprehensive status so I can understand current state and determine next actions without manually inspecting artifacts.

Independent Test: User returns after 2 weeks, types "where am I in auth-system workflow?", and Status Agent reports completed stages (Spec, Research, Planning, Phase 1-2), current phase (Phase 3 not started), git divergence (15 commits behind main), and next step options.

Acceptance Scenarios:
1. Given user invokes Status Agent with "where am I?", When agent scans `.paw/work/` directories, Then agent identifies all workflows with WorkflowContext.md files
2. Given multiple workflows detected, When Status Agent presents list, Then workflows are sorted by most recent modification time
3. Given user selects specific workflow, When Status Agent analyzes state, Then report includes: completed artifacts (Spec.md, CodeResearch.md, etc.), phase progress from ImplementationPlan.md, git branch status, PR states with links
4. Given target branch is behind remote, When Status Agent checks git state, Then report shows "15 commits behind main" with suggestion to merge or rebase
5. Given Phase 2 PR merged but Phase 3 not started, When Status Agent recommends next steps, Then options include `implement Phase 3` and `generate prompt implementer Phase 3`

### User Story P2 – Dynamic Prompt Generation for Customization
Narrative: As a developer needing deep customization for a specific phase, I want to request prompt file generation on-demand so I can edit detailed instructions without cluttering filesystem with unused prompts.

Independent Test: User types "generate prompt implementer Phase 3 with GraphQL focus" and Status Agent creates `03A-implement-phase3.prompt.md` with Phase 3 context, allowing user to edit before execution.

Acceptance Scenarios:
1. Given user requests prompt generation, When specifying stage and optional phase, Then Status Agent identifies correct template (e.g., Implementer for stage, Phase 3 for phase)
2. Given template identified, When generating file, Then frontmatter includes correct agent name (`PAW-03A Implementer`), body includes Work ID and phase-specific context from ImplementationPlan.md
3. Given prompt file created, When Status Agent reports completion, Then agent provides file path and offers options: edit file or execute immediately
4. Given user edits generated prompt file, When user executes file, Then agent receives customized instructions without inline command syntax

### User Story P3 – Help Mode for New Engineers
Narrative: As a new engineer learning PAW, I want to ask questions about the process and receive guided explanations so I can understand workflow stages and their purposes without external documentation.

Independent Test: User asks "How do I start using PAW for a new feature?" and Status Agent provides step-by-step initialization guide with command examples.

Acceptance Scenarios:
1. Given user asks "How do I start using PAW?", When Status Agent responds, Then agent explains initialization command (`PAW: New PAW Workflow`), workflow mode options, and handoff mode choices
2. Given user asks "What does the Code Research stage do?", When Status Agent explains, Then agent describes purpose (understand existing codebase patterns), inputs (Spec.md), outputs (CodeResearch.md), and when to run it
3. Given user asks "What's the difference between Manual and Semi-Auto mode?", When Status Agent responds, Then agent compares control levels, automation points, and recommends based on user experience level

### User Story P3 – Multi-Work-Item Management
Narrative: As a developer juggling multiple features, I want to see all active PAW workflows and their states so I can quickly switch context to the appropriate work item.

Independent Test: User asks "What PAW work items do I have?" and Status Agent lists 3 workflows with recency, current stage, and branch status.

Acceptance Scenarios:
1. Given user asks for active work items, When Status Agent scans `.paw/work/` directory, Then agent lists all subdirectories containing WorkflowContext.md
2. Given 3 workflows detected, When presenting list, Then each entry includes: Work Title, Work ID, last modified timestamp, current stage, target branch, branch existence status
3. Given user selects workflow from list, When providing Work ID, Then Status Agent displays detailed status for that workflow only

### Edge Cases

- **Handoff tool approval timeout**: User doesn't approve handoff tool within timeout period → Tool invocation fails, agent displays error: "Handoff approval timed out. Type `<command>` again to retry or approve tool with 'Always Allow' for continuous workflows."
- **Invalid handoff mode in WorkflowContext.md**: Mode set to "turbo-fast" (invalid value) → Agent reads mode, detects invalid value, displays error listing valid modes (manual, semi-auto, auto), defaults to "manual" mode with warning
- **Missing prerequisite artifacts**: User attempts `implement Phase 2` but ImplementationPlan.md doesn't exist → Handoff validation checks for plan, displays error: "Cannot start Implementation: ImplementationPlan.md not found. Run `plan` to create implementation plan first."
- **Git branch divergence during Auto mode**: Auto mode chains phases but target branch falls 50 commits behind main → Status Agent (when invoked) warns about divergence but Auto mode continues execution; user should pause and resolve manually
- **Work ID collision during initialization**: Generated slug "auth-system" already exists in `.paw/work/` → Extension detects collision, auto-appends "-2" suffix, creates "auth-system-2", informs user
- **Detached HEAD state**: User in detached HEAD when checking git status → Status Agent detects `git symbolic-ref -q HEAD` failure, reports "Detached HEAD detected at <SHA>", suggests nearby branches containing commit
- **PR search returns no results**: Status Agent searches for Planning PR but none found → Report displays "Planning PR: Not found" without error, suggests creating PR or checking if prs strategy is correctly configured
- **Semi-Auto mode with missing Handoff Mode field**: WorkflowContext.md lacks Handoff Mode field → Agent defaults to "manual" mode, logs informational message, continues execution

## Requirements

### Functional Requirements

- FR-001: WorkflowContext.md must include a "Handoff Mode" field with values: manual, semi-auto, auto (Stories: P1-Manual, P1-Semi-Auto, P1-Auto)
- FR-002: VS Code extension must register a language model tool `paw_call_agent` that accepts target agent name, Work ID, and optional inline instructions, creates new chat session, and invokes specified agent with constructed prompt (Stories: P1-Manual, P1-Semi-Auto, P1-Auto, P2-Inline)
- FR-003: Agent handoff prompts must pass only Work ID as required parameter; target agent retrieves full context via `paw_get_context` tool (Stories: P1-Manual)
- FR-004: All PAW agents must present formatted next-step options with code-formatted command keywords (e.g., `research`, `implement Phase 2`) after completing work (Stories: P1-Manual, P1-Semi-Auto)
- FR-005: Agents must read Handoff Mode from WorkflowContext.md and adapt handoff behavior: manual waits for user command, semi-auto auto-invokes at designated transitions, auto always auto-invokes (Stories: P1-Manual, P1-Semi-Auto, P1-Auto)
- FR-006: VS Code extension must register a language model tool `paw_generate_prompt` that accepts stage name, Work ID, and optional phase number, generates prompt file with frontmatter and phase-specific context at `.paw/work/<slug>/prompts/<stage-code>-<name>-phase<N>.prompt.md` (Stories: P2-Dynamic, P2-Resumption)
- FR-007: Status Agent must scan `.paw/work/` directory for WorkflowContext.md files to identify all active workflows without recursing into artifact subdirectories (Stories: P2-Resumption, P3-Multi-Work)
- FR-008: Status Agent must report workflow state including: completed artifacts with existence checks, current implementation phase from ImplementationPlan.md, git branch status with ahead/behind counts, PR states with links and merge status (Stories: P2-Resumption)
- FR-009: Status Agent must suggest next appropriate stages based on completed artifacts: if Spec.md exists but CodeResearch.md doesn't, suggest `code`; if ImplementationPlan.md exists but no phase branches, suggest `implement Phase 1` (Stories: P2-Resumption)
- FR-010: Handoff tool must validate stage prerequisites before invoking target agent: Implementation requires ImplementationPlan.md existence, Implementation Phase N requires Phase N heading in plan (Stories: Edge Cases)
- FR-011: Prompt file naming must follow established pattern: `<stage-code><sub-stage-letter>-<descriptive-name>-phase<N>.prompt.md` where stage codes are 01-05 and 0X for utility (Stories: P2-Dynamic)
- FR-012: Both standard workflow agents (Spec, Implementation, etc.) and review workflow agents (Understanding, Impact Analyzer, etc.) must support handoff tool invocation and follow same handoff mode behavior (Stories: P1-Semi-Auto for review workflows)
- FR-013: Semi-Auto mode for standard workflows must auto-chain: Spec → Spec Research → Spec (pause), Code Research → Implementation Plan (pause), Implementation Phase N → Implementation Review (pause before Phase N+1) (Stories: P1-Semi-Auto)
- FR-014: Semi-Auto mode for review workflows must auto-chain: Understanding → Baseline Research → Understanding (pause), Impact Analyzer → Gap Analyzer (pause), Feedback Generator → Feedback Critic (pause) (Stories: P1-Semi-Auto)
- FR-015: Auto mode must only be available with local review strategy; if user attempts auto with prs strategy, extension must reject with error message (Stories: P1-Auto, Edge Cases)
- FR-016: Status Agent must cache workflow state and PR status for 5 minutes to reduce filesystem scans and API calls during single session (Stories: P2-Resumption)
- FR-017: Handoff tool must parse inline instructions from user commands (e.g., "continue Phase 2 but add rate limiting") by extracting text after "but" or "with" keywords, append to prompt without creating file (Stories: P2-Inline)
- FR-018: Status Agent must answer help-mode questions about PAW process, stage purposes, workflow mode differences, and initialization steps (Stories: P3-Help)
- FR-019: Status Agent must list multiple work items sorted by most recent modification time when user requests active workflows (Stories: P3-Multi-Work)
- FR-020: Handoff tool must determine target agent from prompt file frontmatter `agent:` field with fallback to filename pattern matching (Stories: P2-Dynamic, P1-Manual)

### Key Entities

- **Handoff Mode**: Workflow configuration (manual, semi-auto, auto) stored in WorkflowContext.md that controls whether agents automatically invoke next stages or wait for user commands
- **Stage Transition**: Logical workflow progression from one PAW agent to another (e.g., Spec → Code Research), may be manual (user-commanded) or automatic (agent-invoked based on mode)
- **Work ID**: Normalized filesystem-safe identifier (feature slug) used to locate workflow artifacts and pass context between agents
- **Inline Instruction**: Optional user-provided customization text extracted from handoff commands (e.g., "but add rate limiting") that modifies agent behavior without prompt file generation
- **Workflow State**: Aggregate status derived from artifact existence (Spec.md, ImplementationPlan.md, etc.), git branch status, PR states, and phase progress

### Cross-Cutting / Non-Functional

- **Performance**: Status Agent directory scans must complete within 2 seconds for workspaces with up to 10 active workflows; cache state for 5 minutes to avoid repeated scans
- **Reliability**: Handoff tool must handle missing prerequisites gracefully with actionable error messages rather than silent failures or cryptic exceptions
- **Usability**: Command keywords must be intuitive (single words like `research`, `code`, `implement`) and agents must parse flexible variations (e.g., "implement Phase 2" == "implement phase 2" == "implement 2")
- **Consistency**: Handoff patterns (next-step formatting, command keywords, mode behavior) must be identical across standard and review workflows to minimize learning curve

## Success Criteria

- SC-001: Given user completes Spec stage in Manual mode, when typing `research` command, then new chat opens with Spec Research Agent within 2 seconds with Work ID context loaded (FR-002, FR-003, FR-004)
- SC-002: Given Handoff Mode is "semi-auto", when Spec Agent completes, then Spec Research Agent starts automatically without user command and returns to Spec Agent automatically after research completes (FR-005, FR-013)
- SC-003: Given Handoff Mode is "auto" with local review strategy, when user initiates workflow, then agents chain automatically from Spec through Final PR with only tool approval interactions required (FR-005, FR-015)
- SC-004: Given user types "continue Phase 2 but add rate limiting", when handoff executes, then Implementation Agent receives Work ID and inline instruction without prompt file creation (FR-017, P2-Inline)
- SC-005: Given user invokes Status Agent after 2 weeks away, when asking "where am I?", then agent reports completed stages, current phase, git divergence (X commits behind main), and suggests next actions within 3 seconds (FR-007, FR-008, FR-009)
- SC-006: Given user requests "generate prompt implementer Phase 3", when Status Agent executes, then prompt file created at `.paw/work/<slug>/prompts/03A-implement-phase3.prompt.md` with correct frontmatter and phase context (FR-006, FR-011)
- SC-007: Given ImplementationPlan.md missing, when user attempts `implement Phase 1`, then handoff validation fails with error message: "Cannot start Implementation: ImplementationPlan.md not found" (FR-010, Edge Cases)
- SC-008: Given workspace with 8 active workflows, when Status Agent scans directory, then listing completes within 2 seconds and workflows sorted by most recent modification (FR-007, FR-019, Performance)
- SC-009: Given user asks "What does Code Research stage do?", when Status Agent responds, then explanation includes stage purpose, inputs, outputs, and timing guidance (FR-018, P3-Help)
- SC-010: Given HandoffMode field missing from WorkflowContext.md, when agent reads configuration, then defaults to "manual" mode with informational log message and continues execution without error (FR-001, Edge Cases)

## Assumptions

- **VS Code API Stability**: `workbench.action.chat.newChat` and `workbench.action.chat.open` commands remain stable across VS Code versions; if APIs change, handoff tool will require updates to maintain compatibility
- **Tool Approval UX**: Users understand VS Code's tool approval mechanism; "Always Allow" option is discoverable enough for Auto mode users to enable continuous chaining without explicit tutorial
- **Workspace Performance**: Filesystem operations (directory listing, file reads) complete quickly enough (<2 seconds) for Status Agent scans even with 10+ active workflows; workspaces with 50+ workflows may experience degraded performance
- **Git Availability**: Git command-line tool is installed and accessible in user's PATH; Status Agent git checks (branch status, ahead/behind counts) rely on spawned git commands succeeding
- **Work ID Uniqueness**: Feature slug generation during initialization produces unique identifiers; collisions are rare and handled by auto-appending numeric suffixes (-2, -3, etc.)
- **Handoff Mode Defaults**: Defaulting to "manual" mode when field is missing provides safe, predictable behavior for users with existing workflows; users can explicitly set mode to opt into automation
- **Inline Instruction Parsing**: Simple keyword-based extraction ("but", "with", "remember to") captures majority of inline customization patterns; complex multi-clause instructions may require prompt file generation
- **PR Query Efficiency**: GitHub MCP Server's `search_pull_requests` tool supports OR queries to batch multiple branch searches; if not, sequential queries are acceptable with caching mitigation
- **Command Keyword Intuitiveness**: Single-word command keywords (`research`, `code`, `implement`, `status`) map clearly to PAW stages without requiring reference documentation; users learn keywords through agent next-step presentations
- **Review Workflow Similarity**: Review workflow stages (Understanding, Impact Analyzer, etc.) follow similar transition patterns to standard workflow stages, allowing shared handoff tool implementation

## Scope

In Scope:
- Handoff tool implementation (`paw_call_agent`) for agent-to-agent transitions
- Prompt generation tool implementation (`paw_generate_prompt`) for on-demand file creation
- Enhanced Status Agent for workflow state analysis, resumption guidance, and help mode
- WorkflowContext.md Handoff Mode field and agent behavior adaptation (manual, semi-auto, auto)
- Next-step presentation formatting in all PAW agents (standard and review workflows)
- Inline instruction parsing and injection into handoff prompts
- Stage prerequisite validation before handoff execution
- Git state checking (branch existence, ahead/behind counts, detached HEAD detection)
- PR status querying via GitHub MCP Server tools
- Multi-work-item listing and selection in Status Agent
- Dynamic prompt file generation with correct naming and frontmatter
- Help mode responses for PAW process questions

Out of Scope:
- Cross-workspace workflow management (Status Agent operates within single VS Code workspace)
- Automatic conflict resolution or git merge operations (Status Agent reports divergence, user resolves manually)
- Reviewer assignment or PR label management (Status Agent reads PR state, doesn't modify)
- Workflow execution history tracking beyond artifact modification times (no persistent state database)
- IDE integration beyond VS Code (no JetBrains, Visual Studio, or other editor support)
- Agent execution failure detection or automatic retry (agents run independently; user observes completion)
- Custom handoff mode definitions beyond manual, semi-auto, auto (users can use custom workflow mode instructions for stage selection, but handoff automation levels are fixed)
- Azure DevOps Work Item integration for Status Agent (GitHub Issues only for status comments)
- Workflow templates or saved configurations (each workflow initialized independently)
- Performance optimizations for 50+ concurrent workflows (design targets 10 workflows)

## Dependencies

- VS Code Language Model API (`vscode.lm` commands for chat creation and agent invocation)
- `paw_get_context` tool for context retrieval by agents (already implemented)
- `paw_create_prompt_templates` tool for understanding template structure patterns
- GitHub MCP Server tools for PR status queries (`mcp_github_search_pull_requests`, `mcp_github_pull_request_read`)
- Git command-line tool availability in user's system PATH
- WorkflowContext.md file presence in `.paw/work/<slug>/` directories (created by initialization)
- Existing PAW agent chatmode files in `agents/` directory for next-step instruction updates
- Prompt template definitions in `src/tools/createPromptTemplates.ts` for stage-code mappings

## Risks & Mitigations

- **Risk**: VS Code API changes break handoff tool chat creation. **Impact**: High - handoff system unusable. **Mitigation**: Monitor VS Code API changelog, maintain compatibility shim layer, test against VS Code Insiders builds proactively
- **Risk**: Tool approval timeout frustrates Auto mode users. **Impact**: Medium - workflows stall without user intervention. **Mitigation**: Document "Always Allow" setup prominently in initialization flow, provide clear error messages on timeout with retry instructions
- **Risk**: Large workspace with 50+ workflows causes Status Agent scan timeout. **Impact**: Low - affects users with many concurrent features. **Mitigation**: Document performance limits (10 workflows recommended), implement caching, suggest archiving completed workflows
- **Risk**: GitHub API rate limit exceeded during PR status queries. **Impact**: Medium - Status Agent fails to report PR states. **Mitigation**: Implement 5-minute cache for PR status, batch queries using search instead of individual lookups, handle 403 rate limit errors gracefully with reset time message
- **Risk**: Inline instruction parsing misinterprets complex user commands. **Impact**: Low - wrong instruction passed to agent. **Mitigation**: Keep parsing simple (keyword-based), document expected patterns, fallback to prompt file generation for complex customizations
- **Risk**: Semi-Auto mode auto-chains at undesired points, removing user control. **Impact**: Medium - users feel workflow automation is too aggressive. **Mitigation**: Research-informed pause points, allow mode switching mid-workflow, provide "Always Allow" control via tool approval to give per-tool granularity
- **Risk**: Handoff mode conflicts with review strategy (e.g., auto + prs). **Impact**: Medium - unclear behavior, potential broken workflows. **Mitigation**: Enforce auto mode requires local strategy at initialization, validate configuration and reject invalid combinations with clear error
- **Risk**: Missing prerequisite artifacts cause cryptic handoff failures. **Impact**: Medium - user confusion about why handoff failed. **Mitigation**: Validate prerequisites before handoff, provide actionable error messages with fix steps (e.g., "Run `plan` to create implementation plan first")

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/69 (Workflow Handoffs)
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/60 (PAW Workflow Status Capability)
- Research: .paw/work/workflow-handoffs/SpecResearch.md
- External: None (optional external research questions remained unanswered; assumptions documented above)
- Architecture Clarification: Issue #69 Comment by lossyrob (https://github.com/lossyrob/phased-agent-workflow/issues/69#issuecomment-3573623459) documenting handoff tool proof-of-concept and Status Agent clarifications
- Voice Notes: zignore-notes/2025-11-24_workflow-handoff.md (transcribed design discussions on handoff modes)

## Glossary

- **Work ID**: Also called "feature slug"; normalized, filesystem-safe identifier for workflow artifacts (e.g., "auth-system", "api-refactor-v2")
- **Stage**: Discrete phase of PAW workflow handled by specific agent (e.g., Spec, Code Research, Implementation)
- **Handoff**: Transition from one agent to another, either manual (user-commanded) or automatic (agent-invoked)
- **Handoff Mode**: Configuration controlling automation level (manual, semi-auto, auto)
- **Review Strategy**: Branching approach (prs or local) configured in WorkflowContext.md that affects PR creation patterns
- **Workflow Mode**: Stage inclusion configuration (full, minimal, custom) configured in WorkflowContext.md that affects which stages are active
- **Semi-Auto Pause Point**: Designated workflow transition where Semi-Auto mode stops automatic chaining and waits for explicit user command
- **Inline Instruction**: User-provided text appended to handoff command (e.g., "but add rate limiting") that customizes agent behavior without file creation
- **Dynamic Prompt Generation**: On-demand creation of prompt files by Status Agent when user requests customization
- **Stage Prerequisite**: Required artifact (file) that must exist before target stage can execute (e.g., ImplementationPlan.md before Implementation)
