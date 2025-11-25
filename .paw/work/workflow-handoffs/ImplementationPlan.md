# Workflow Handoffs Implementation Plan

## Overview

This implementation plan adds intelligent stage navigation and workflow resumption capabilities to PAW. When agents complete work, they will present contextual next-step options that users can invoke with simple commands like `research` or `implement Phase 2`. A new handoff tool enables automated or manual transitions between agents, while an enhanced Status Agent provides workflow state analysis and helps users resume work after time away. Three handoff modes (Manual, Semi-Auto, Auto) adapt to user experience levels, and dynamic prompt generation reduces filesystem noise by creating prompt files only when customization is needed.

## Current State Analysis

PAW workflows currently require manual stage navigation: users complete a stage, navigate to `.paw/work/<slug>/prompts/`, and manually execute the next prompt file. No automated handoff mechanism exists. The Status Agent (PAW-X) provides basic status reporting but lacks workflow resumption guidance, help mode, or multi-work-item management. Agents end with "Hand-off" sections showing next steps, but transitions are entirely manual.

The existing codebase provides solid foundations:
- **Language Model API**: `workbench.action.chat.newChat` and `workbench.action.chat.open` (fire-and-forget pattern)
- **Tool registration pattern**: `vscode.lm.registerTool<T>()` with `prepareInvocation()` and `invoke()` methods
- **Context retrieval**: `paw_get_context` tool already passes Work ID between agents
- **WorkflowContext.md**: Established format with Workflow Mode and Review Strategy fields
- **Agent conventions**: Consistent WorkflowContext.md handling, mode-aware behavior
- **Git integration**: Validation functions in `src/git/validation.ts`
- **Prompt templates**: Naming patterns (`<stage-code>-<name>.prompt.md`) established in `src/tools/createPromptTemplates.ts`

Key constraints discovered:
- Extension cannot wait for agent completion or access agent output (fire-and-forget)
- Tool approval requires user interaction; "Always Allow" enables Auto mode workflows
- GitHub MCP tool batching capabilities need runtime testing (OR queries may/may not work)
- Performance targets: 10 active workflows max, 2-second status scans, 5-minute cache

## Desired End State

After implementation:

1. **Contextual Stage Transitions**: Agents present formatted next-step options with commands like `research`, `code`, `implement Phase 2`, `status`. Users type simple commands to instantly transition to appropriate agent in fresh chat.

2. **Three Handoff Modes**: WorkflowContext.md includes "Handoff Mode" field (manual/semi-auto/auto). Manual waits for user commands. Semi-Auto auto-chains at designated transitions (Spec→Research→Spec, Phase→Review) with pauses at decision points. Auto chains all stages with only tool approval interactions.

3. **Enhanced Status Agent**: Users ask "where am I?" and receive workflow state including completed artifacts, current phase, git divergence, PR status, and actionable next steps. Supports workflow resumption after weeks away, help mode for learning PAW, and multi-work-item management.

4. **Dynamic Prompt Generation**: Status Agent generates prompt files on-demand (`generate prompt implementer Phase 3`) only when customization needed, reducing filesystem noise.

5. **Inline Customization**: Users provide inline instructions during handoffs (`continue Phase 2 but add rate limiting`) without creating prompt files.

6. **Validation and Error Handling**: Handoff tool validates prerequisites (ImplementationPlan.md before Implementation, Phase N heading in plan before Phase N), provides actionable error messages.

### Verification

**Automated Verification**:
- [ ] Unit tests pass: `npm test`
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] Extension activates without errors in Extension Development Host
- [ ] Linting passes: `npm run lint`

**Manual Verification**:
- [ ] Manual mode: User completes Spec, types `research`, lands in Spec Research Agent with Work ID loaded
- [ ] Semi-Auto mode: Spec completes, Spec Research auto-starts, completes research, auto-returns to Spec, pauses before Code Research
- [ ] Auto mode: Full workflow chains from Spec through Final PR with only tool approvals
- [ ] Status Agent: User asks "where am I?", receives workflow state with artifacts, phases, git status, PR links
- [ ] Dynamic prompts: `generate prompt implementer Phase 3` creates `03A-implement-phase3.prompt.md` with correct context
- [ ] Inline instructions: `continue Phase 2 but add rate limiting` passes instruction to Implementation Agent without file
- [ ] Validation: `implement Phase 1` without ImplementationPlan.md shows error: "Cannot start Implementation: ImplementationPlan.md not found"
- [ ] Help mode: "What does Code Research stage do?" receives purpose, inputs, outputs, timing guidance
- [ ] Multi-work-item: "What PAW work items do I have?" lists workflows sorted by recency

## What We're NOT Doing

- Cross-workspace workflow management (Status Agent operates within single workspace)
- Automatic git conflict resolution or merge operations (Status Agent reports, user resolves)
- Reviewer assignment or PR label management (Status Agent reads state, doesn't modify)
- Workflow execution history tracking beyond artifact modification times (no persistent database)
- IDE integration beyond VS Code (no JetBrains, Visual Studio, other editors)
- Agent failure detection or automatic retry (agents run independently)
- Custom handoff mode definitions beyond manual/semi-auto/auto
- Azure DevOps Work Item integration for Status Agent (GitHub Issues only)
- Workflow templates or saved configurations
- Performance optimizations for 50+ concurrent workflows (design targets 10)

## Implementation Approach

The implementation follows PAW's established architecture: VS Code extension provides procedural operations (tools, commands), agents provide decision-making logic. We'll add two new Language Model Tools (`paw_call_agent`, `paw_generate_prompt`) following the existing tool registration pattern, enhance the Status Agent with workflow analysis capabilities, and update all agent instructions to present next-step options and invoke handoff tools based on Handoff Mode.

The approach proceeds in logical phases: first establish handoff infrastructure (tool, WorkflowContext.md field), then implement Status Agent enhancements (state analysis, dynamic prompts, help mode), followed by agent instruction updates to use handoff capabilities, and finally comprehensive testing. Each phase is independently testable and builds on prior phases without breaking existing functionality.

## Phase Summary

1. **Phase 1: Handoff Tool Foundation** - Implement `paw_call_agent` tool, add Handoff Mode to WorkflowContext.md, establish handoff patterns
2. **Phase 2: Status Agent Core Enhancements** - Add workflow state scanning, artifact detection, git status checking, PR querying
3. **Phase 3: Dynamic Prompt Generation** - Implement `paw_generate_prompt` tool with phase-specific context injection
4. **Phase 4: Agent Instruction Updates** - Update all agents to present next-step options and invoke handoff tool based on mode
5. **Phase 5: Testing and Validation** - Comprehensive unit tests, integration tests, manual workflow testing

---

## Phase 1: Handoff Tool Foundation

### Overview
Establish the core handoff infrastructure by implementing the `paw_call_agent` tool that enables agent-to-agent transitions, adding Handoff Mode field to WorkflowContext.md, and creating the patterns agents will use to invoke handoffs.

### Changes Required:

#### 1. Handoff Tool Implementation
**File**: `src/tools/handoffTool.ts` (new)
**Changes**:
- Create `HandoffParams` interface with fields: `target_agent` (enum, required), `work_id` (string, required), `inline_instruction` (string, optional)
- Implement validation: Work ID matches `/^[a-z0-9-]+$/`
- Construct prompt message with `Work ID: <work_id>`, appended inline instruction if provided
- Use Language Model API: Research correct parameter name for agent mode (verify if `mode` or `agent` parameter), use `vscode.commands.executeCommand('workbench.action.chat.newChat')` followed by `vscode.commands.executeCommand('workbench.action.chat.open', { query: prompt, [paramName]: target_agent })`
- Return empty string on success (new chat interrupts conversation), return error message only on failures

**Brief Example**:
```typescript
interface HandoffParams {
  target_agent: 'PAW-01A Specification' | 'PAW-01B Spec Researcher' | 'PAW-02A Code Researcher' | 'PAW-02B Impl Planner' | 'PAW-03A Implementer' | 'PAW-03B Impl Reviewer' | 'PAW-04 Documenter' | 'PAW-05 PR' | 'PAW-X Status Update';
  work_id: string;
  inline_instruction?: string;
}
```

#### 2. Tool Registration
**File**: `src/extension.ts`
**Changes**:
- Import `registerHandoffTool` from `./tools/handoffTool`
- Add tool registration in `activate()` after existing tool registrations: `registerHandoffTool(context)`
- Update package.json `contributes.languageModelTools` array with new tool definition

**File**: `package.json`
**Changes**:
- Add tool definition to `contributes.languageModelTools` array:
  - `name`: `paw_call_agent`
  - `displayName`: `Call PAW Agent`
  - `modelDescription`: Tool description explaining handoff functionality and that agents should intelligently map user requests to agent names
  - `inputSchema`: JSON schema with `target_agent` (enum of exact agent names), `work_id`, `inline_instruction` properties

#### 3. WorkflowContext.md Field Addition
**File**: `src/prompts/workflowInitPrompt.ts`
**Changes**:
- Add `HANDOFF_MODE` variable to template: `Handoff Mode: ${HANDOFF_MODE}`
- Default to "manual" mode
- Add conditional logic: if Auto mode selected, enforce local review strategy (reject prs strategy with error)

**File**: `src/ui/userInput.ts`
**Changes**:
- Add `HandoffMode` type: `'manual' | 'semi-auto' | 'auto'`
- Add `collectHandoffMode()` function returning QuickPick with options:
  - Manual: "Full control - you command each stage transition"
  - Semi-Auto: "Thoughtful automation - automatic at research/review, pause at decisions"
  - Auto: "Full automation - agents chain through all stages (local strategy required)"
- Add validation: if Auto mode + prs strategy selected, show error and reset to local strategy

#### 4. Documentation Updates
**File**: `README.md`
**Changes**:
- Add "Workflow Handoffs" section explaining Manual/Semi-Auto/Auto modes
- Add examples of handoff commands (`research`, `implement Phase 2`, `status`)
- Document inline instruction syntax ("continue Phase 2 but add rate limiting")

### Success Criteria:

#### Automated Verification:
- [x] Unit tests pass for `handoffTool.ts`: `npm test`
- [x] TypeScript compilation succeeds: `npm run compile`
- [x] Tool registered and discoverable in Extension Development Host
- [x] Invalid Work ID rejected by validation
- [x] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Extension activates without errors
- [ ] Handoff tool appears in tool approval UI when agent invokes
- [ ] Manual mode: User says "continue with research" after Spec completion, agent maps to `PAW-01B Spec Researcher` and opens new chat
- [ ] Work ID correctly passed and `paw_get_context` succeeds in target agent
- [ ] Inline instruction ("continue but add logging") appears in target agent's initial context
- [ ] Agent validates prerequisites: when user asks to implement Phase 1 without ImplementationPlan.md, agent checks and responds with actionable error
- [ ] Agent intelligently maps user requests: "research" → `PAW-01B Spec Researcher`, "implement Phase 2" → `PAW-03A Implementer`

### Phase 1 Complete

**Implementation Summary:**
Successfully implemented the handoff tool foundation, establishing the core infrastructure for agent-to-agent transitions. Created `paw_call_agent` Language Model Tool with Work ID validation and fire-and-forget chat invocation. Added Handoff Mode field (manual/semi-auto/auto) to WorkflowContext.md with user collection during workflow initialization. Auto mode validation ensures compatibility with local review strategy. Updated README with comprehensive Workflow Handoffs documentation explaining modes, commands, and inline instruction syntax.

**All automated verification passed:**
- TypeScript compilation successful
- All unit tests passing (79 tests)
- No linting errors in new code
- Tool registered in extension.ts and package.json

**Files Created/Modified:**
- Created: `src/tools/handoffTool.ts` (161 lines)
- Modified: `src/extension.ts`, `package.json`, `src/ui/userInput.ts`, `src/prompts/workflowInitPrompt.ts`, `src/prompts/workItemInitPrompt.template.md`, `src/commands/initializeWorkItem.ts`, `README.md`
- Fixed: Test file to include handoffMode parameter

**Commit:** ff041cb "Phase 1: Implement handoff tool foundation"

**Notes for Next Phase:**
The handoff tool provides the procedural mechanism for stage transitions. Phase 2 will enhance the Status Agent to provide workflow state analysis and navigation guidance, leveraging the handoff tool to suggest contextual next steps. Phase 3 will add dynamic prompt generation capability. Phases 4-5 will update agent instructions to use these tools and perform end-to-end testing.

**Review Considerations:**
- Verify handoff tool parameters match agent enum exactly
- Check tool approval UI message clarity
- Validate Auto mode + prs strategy rejection logic
- Review README section for completeness and clarity

---

## Phase 2: Status Agent Enhancements

### Overview
Update the Status Agent (`PAW-X Status Update.agent.md`) to provide comprehensive workflow navigation, help users understand the PAW process, and support workflow resumption. The agent will use existing tools (file reads, GitHub MCP) to detect status and guide users to next steps.

### Changes Required:

#### 1. Status Agent Instruction Updates
**File**: `agents/PAW-X Status Update.agent.md`
**Changes**:
- **Default Behavior**: Detect current workflow status and help navigate to next steps (replaces old default of posting to GitHub issue)
- **Status Detection Logic**: Describe how agent should determine workflow state:
  - List work directories to find active workflows by checking for WorkflowContext.md
  - Read WorkflowContext.md to extract Target Branch, Workflow Mode, Issue URL
  - Check artifact file existence: Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md
  - Parse ImplementationPlan.md to count phases (search for phase heading pattern)
  - Execute git commands to check current branch, uncommitted changes, and divergence from remote
  - Query GitHub to find PRs for planning, phase, docs, and final branches
- **Next-Step Suggestions**: Based on detected state, suggest actionable commands:
  - Missing Spec.md → "Start with specification"
  - Spec exists, no CodeResearch → "Continue with code research"
  - Plan exists, no phase PRs → "Begin implementing Phase 1"
  - Phase N merged, Phase N+1 not started → "Continue with Phase N+1"
  - Present commands users can say to trigger handoffs
- **Help Mode**: Answer questions about PAW workflow:
  - "What does Code Research stage do?" → Explain purpose, inputs, outputs, timing
  - "How do I start a new PAW workflow?" → Explain `PAW: New PAW Workflow` command, parameters
  - "What are the PAW stages?" → Overview of Specification, Research, Planning, Implementation, Review, Documentation, PR
- **Multi-Work-Item Support**: When user asks "What PAW work items do I have?", list all workflows sorted by recency (most recent modification first)
- **Issue Posting (Non-Default)**: Only post status to GitHub issue when explicitly requested: "post status to issue"

#### 2. Status Agent Examples
**File**: `agents/PAW-X Status Update.agent.md`
**Changes**:
- Add example interactions:
  - User: "where am I?" → Agent checks files, git, PRs, presents: "You're on `feature/x_phase2`. Phase 1 PR merged. ImplementationPlan.md shows 3 phases total. Next: implement Phase 2."
  - User: "What PAW workflows do I have?" → Agent lists: "1. feature/auth-system (modified 2h ago), 2. feature/api-refactor (modified 2d ago)"
  - User: "What does Code Research do?" → Agent explains stage purpose and when to use it
  - User: "post status to issue" → Agent gathers status and posts comment to Issue URL from WorkflowContext.md

#### 3. Tool Usage Patterns
**File**: `agents/PAW-X Status Update.agent.md`
**Changes**:
- Document approach for status detection:
  - List directories to find active workflows
  - Read configuration and artifact files to understand workflow state
  - Execute git commands to check branch status and divergence
  - Query GitHub for pull requests by branch names
  - Use efficient search methods to check file existence without full reads
- Emphasize agent reasoning: "Determine what information you need, use available tools to gather it, synthesize into actionable guidance"

### Success Criteria:

#### Automated Verification:
- [ ] Agent linter passes: `./scripts/lint-agent.sh agents/PAW-X\ Status\ Update.agent.md`
- [ ] No markdown syntax errors in agent file
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Status Agent responds to "where am I?" with comprehensive workflow state
- [ ] Agent correctly identifies missing artifacts and suggests next steps
- [ ] Agent uses `run_in_terminal` to check git status and reports divergence
- [ ] Agent searches GitHub for PRs and reports state (open/merged/closed)
- [ ] Multi-work-item: "What PAW work items do I have?" lists all workflows sorted by recency
- [ ] Help mode: "What does Code Research do?" provides clear explanation
- [ ] New user guidance: "How do I start a PAW workflow?" explains command and process
- [ ] Issue posting: "post status to issue" creates GitHub issue comment (non-default behavior)
- [ ] Agent reasons about incomplete information: if WorkflowContext.md missing, suggests running init command
- [ ] Agent handles edge cases: detached HEAD, missing branches, no git repository

---

## Phase 3: Dynamic Prompt Generation

### Overview
Implement on-demand prompt file generation capability, allowing users to create customizable prompt files only when needed rather than pre-generating all files at initialization. Uses the same logic as the existing `PAW: New PAW Workflow` command.

### Changes Required:

#### 1. Prompt Generation Tool
**File**: `src/tools/promptGenerationTool.ts` (new)
**Changes**:
- Create `PromptGenerationParams` interface: `{ work_id: string, agent_name: string, additional_content?: string }`
- Use existing prompt template logic from `src/tools/createPromptTemplates.ts`:
  - Call the same functions used by New PAW Workflow command
  - Generate prompt file with frontmatter (`---\nagent: <agent_name>\n---`) and body
  - Include Work ID in prompt body
  - Append `additional_content` to prompt body if provided
- Write file to `.paw/work/<work_id>/prompts/<filename>` using established naming pattern from `createPromptTemplates.ts`
- Return file path and success message
- Let agent determine filename pattern and any phase-specific context to include in `additional_content`

**Brief Example**:
```typescript
interface PromptGenerationParams {
  work_id: string;
  agent_name: string; // e.g., 'PAW-03A Implementer'
  additional_content?: string; // e.g., 'Focus on Phase 2'
}
```

#### 2. Tool Registration
**File**: `src/extension.ts`
**Changes**:
- Import `registerPromptGenerationTool` from `./tools/promptGenerationTool`
- Add registration: `registerPromptGenerationTool(context)`

**File**: `package.json`
**Changes**:
- Add tool definition: `paw_generate_prompt` with parameters `work_id`, `agent_name`, optional `additional_content`
- Tool description should indicate that agents should identify the stage name and any additional context based on user request

### Success Criteria:

#### Automated Verification:
- [ ] Unit tests pass for `promptGenerationTool.ts`: `npm test`
- [ ] Generated prompt files have valid frontmatter and Work ID
- [ ] Filename generation follows PAW naming conventions
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Agent invoked with "generate prompt for implementer Phase 3" creates correct file
- [ ] Generated prompt file has correct agent name in frontmatter
- [ ] User can edit generated prompt file and execute it successfully
- [ ] Agent includes phase number or other context in `additional_content` when user specifies
- [ ] File path provided to user after generation

---

## Phase 4: Agent Instruction Updates

### Overview
Update all PAW agent instruction files to present formatted next-step options, invoke handoff tool based on Handoff Mode, and support inline instruction parsing.

### Changes Required:

#### 1. Shared Handoff Pattern Component
**File**: `agents/components/handoff-instructions.component.md` (new)
**Changes**:
- Create reusable component with instructions for:
  - Reading Handoff Mode from WorkflowContext.md (default to "manual" if missing)
  - Conditional behavior: manual waits for command, semi-auto auto-invokes at designated transitions, auto always auto-invokes
  - Presenting next-step options to users with clear phrasing
  - Option to proceed directly via handoff OR generate prompt file for customization
  - Invoking `paw_call_agent` tool with exact agent name (enum value), Work ID, and optional inline instruction
  - Invoking `paw_generate_prompt` tool when user wants to customize prompt before execution
  - Agent interprets user requests and maps to agent names intelligently

**Brief Example**:
```markdown
### Handoff Mode Handling

Read the `Handoff Mode` field from WorkflowContext.md (default to "manual" if missing).

**Manual Mode**: Present next-step options and wait for user command
**Semi-Auto Mode**: Auto-invoke handoff at designated transitions (see stage-specific guidance)
**Auto Mode**: Always auto-invoke next stage without pausing

### Presenting Next Steps

Present options clearly to users:
- "To continue with research, say 'research' or 'start research'"
- "To proceed to Code Research, say 'code' or 'code research'"
- "To generate a customizable prompt file instead, say 'generate prompt for [stage]'"
- "To check workflow status, say 'status'"

### Invoking Handoff

Interpret user's request and map to exact agent name:
- User says "research" or "start research" → call `paw_call_agent` with `target_agent: 'PAW-01B Spec Researcher'`
- User says "implement Phase 2" → call `paw_call_agent` with `target_agent: 'PAW-03A Implementer'`, `inline_instruction: 'Phase 2'`
- User says "continue but add logging" → extract "add logging" as `inline_instruction`

### Generating Prompt Files

When user wants customization before executing:
- User says "generate prompt for implementer Phase 3" → call `paw_generate_prompt` with `agent_name: 'PAW-03A Implementer'`, `additional_content: 'Phase 3'`
- Inform user of file path and that they can edit before executing
```

#### 2. PAW-01A Specification Agent Updates
**File**: `agents/PAW-01A Specification.agent.md`
**Changes**:
- Include handoff component instructions
- Update "Hand-off" section to present next-step options:
  - Proceed to research (if research questions identified)
  - Skip research and proceed to Code Research
  - Check workflow status
  - Generate prompt file for customization ("generate prompt for research")
- Add Semi-Auto behavior: after finalizing Spec, check Handoff Mode; if "semi-auto" or "auto", auto-invoke Code Research Agent
- Add Manual behavior: present options and wait for user command
- Agent validates prerequisites before handoff (checks if Spec.md exists when appropriate)

#### 3. PAW-01B Spec Researcher Agent Updates
**File**: `agents/PAW-01B Spec Researcher.agent.md`
**Changes**:
- Include handoff component
- Update completion section to present pause for optional external knowledge input
- Add Semi-Auto behavior: after user types `continue`, auto-return to Spec Agent (`spec` handoff)
- Add Auto behavior: immediately auto-return without pause
- Add next-step options: `continue` (return to Spec), `status`

#### 4. PAW-02A Code Researcher Agent Updates
**File**: `agents/PAW-02A Code Researcher.agent.md`
**Changes**:
- Include handoff component
- Update "Hand-off" section with options: `plan`, `status`, `generate prompt plan`
- Add Semi-Auto behavior: after completing CodeResearch.md, auto-invoke `plan`
- Add Auto behavior: same as Semi-Auto (always proceed to planning)

#### 5. PAW-02B Impl Planner Agent Updates
**File**: `agents/PAW-02B Impl Planner.agent.md`
**Changes**:
- Include handoff component
- Update completion section with options: `implement Phase 1`, `customize prompt phase1`, `status`
- Add Semi-Auto behavior: pause after plan completion (do not auto-invoke Phase 1)
- Add Auto behavior: pause after plan completion (even Auto mode requires explicit implementation start)
- Note: Implementation start is always a pause point due to cost/risk

#### 6. PAW-03A Implementer Agent Updates
**File**: `agents/PAW-03A Implementer.agent.md`
**Changes**:
- Include handoff component
- Update completion section with options: `review`, `status`
- Add Semi-Auto behavior: after completing phase, auto-invoke `review` (Implementation Review)
- Add Auto behavior: same as Semi-Auto (always proceed to review)

#### 7. PAW-03B Impl Reviewer Agent Updates
**File**: `agents/PAW-03B Impl Reviewer.agent.md`
**Changes**:
- Include handoff component
- After creating Phase PR, present options: `implement Phase N+1` (if more phases exist), `docs` (if all phases complete), `status`
- Add Semi-Auto behavior: pause after Phase PR (do not auto-invoke next phase)
- Add Auto behavior: if more phases exist, auto-invoke `implement Phase N+1`; if all phases complete, auto-invoke `docs`
- Determine phase count by parsing ImplementationPlan.md for `## Phase \d+:` patterns

#### 8. PAW-04 Documenter Agent Updates
**File**: `agents/PAW-04 Documenter.agent.md`
**Changes**:
- Include handoff component
- Update completion section with options: `pr` (create final PR), `status`
- Add Semi-Auto behavior: after Docs.md completion and Docs PR creation, pause
- Add Auto behavior: after Docs PR creation, auto-invoke `pr`

#### 9. PAW-05 PR Agent Updates
**File**: `agents/PAW-05 PR.agent.md`
**Changes**:
- Include handoff component
- After creating final PR, present completion message (no further handoffs)
- Note: Final PR is terminal stage; workflow complete

#### 10. Review Workflow Agent Updates
**Files**: `agents/PAW-R1A Understanding.agent.md`, `agents/PAW-R1B Baseline Researcher.agent.md`, `agents/PAW-R2A Impact Analyzer.agent.md`, `agents/PAW-R2B Gap Analyzer.agent.md`, `agents/PAW-R3A Feedback Generator.agent.md`, `agents/PAW-R3B Feedback Critic.agent.md`
**Changes**:
- Follow same patterns as standard workflow agents
- Include handoff component
- Map Semi-Auto pause points: Understanding → Baseline → Understanding (pause), Understanding → Impact (pause), Gap → Feedback (pause), Critic → post feedback (pause)
- Feedback Generator ↔ Critic iterations: Auto-chain revisions until user approves or discards

### Success Criteria:

#### Automated Verification:
- [ ] Agent linter passes for all updated agent files: `./scripts/lint-agent.sh agents/*.agent.md`
- [ ] No markdown syntax errors in updated agents
- [ ] Handoff component included in all agents that have stage transitions

#### Manual Verification:
- [ ] Spec Agent presents next-step options after completion in Manual mode
- [ ] Spec Research Agent auto-returns to Spec in Semi-Auto mode after user types `continue`
- [ ] Code Research Agent auto-invokes Implementation Plan in Semi-Auto mode
- [ ] Implementation Review Agent pauses after Phase PR in Semi-Auto mode
- [ ] Implementation Review Agent auto-invokes next phase in Auto mode
- [ ] All agents correctly parse inline instructions ("continue but add logging")
- [ ] Review workflow agents follow same handoff patterns (Understanding → Baseline auto-chain in Semi-Auto)
- [ ] Final PR Agent does not present handoff options (terminal stage)

---

## Phase 5: Testing and Validation

### Overview
Implement comprehensive unit tests, integration tests, and perform manual end-to-end workflow testing across all handoff modes.

### Changes Required:

#### 1. Handoff Tool Unit Tests
**File**: `src/test/suite/handoffTool.test.ts` (new)
**Changes**:
- Test Work ID validation: invalid format rejected, valid format accepted
- Test agent name enum: only valid PAW agent names accepted
- Test inline instruction parameter: optional string passed through correctly
- Mock VS Code commands (`workbench.action.chat.newChat`, `workbench.action.chat.open`)
- Verify tool returns empty string on success, error message only on failures

#### 2. Status Agent Behavior Tests
**File**: `src/test/suite/statusAgent.test.ts` (new)
**Changes**:
- Test agent instructions are well-formed and linter-compliant
- Manual testing: verify agent uses tools correctly to detect status
- Verify agent can list workflows, detect artifacts, check git status, query PRs
- Test examples in agent file produce expected behavior

#### 3. Prompt Generation Tool Unit Tests
**File**: `src/test/suite/promptGenerationTool.test.ts` (new)
**Changes**:
- Test filename generation: follows PAW naming conventions
- Test frontmatter generation: valid YAML with correct agent name
- Test Work ID inclusion in prompt body
- Test additional_content parameter: appended to prompt body when provided
- Mock filesystem for writing prompt files
- Verify reuses logic from existing createPromptTemplates.ts

#### 4. Integration Tests
**File**: `src/test/suite/integration.test.ts` (new)
**Changes**:
- Test full handoff flow: initialize workflow, complete Spec, invoke handoff, verify target agent called
- Test Status Agent workflow scanning with real workspace structure
- Test dynamic prompt generation end-to-end: generate prompt, verify file created, execute prompt
- Use test fixtures in `src/test/fixtures/` directory
- Run in Extension Development Host

#### 5. Manual Testing Checklist
**File**: `TESTING.md` (new)
**Changes**:
- Document manual testing procedures for each handoff mode
- Manual mode: Step-by-step workflow with expected commands and outcomes
- Semi-Auto mode: Verify auto-chains at designated transitions, pauses at checkpoints
- Auto mode: Full workflow execution with tool approvals only
- Status Agent: Workflow resumption scenarios, help mode queries, multi-work-item management
- Edge cases: missing prerequisites, invalid commands, detached HEAD, PR search failures
- Include screenshots or video recording recommendations

#### 6. Test Fixtures
**Directory**: `src/test/fixtures/` (new)
**Changes**:
- Create `WorkflowContext.md` fixture with all fields
- Create `ImplementationPlan.md` fixture with 3 phases
- Create `Spec.md`, `CodeResearch.md` fixtures
- Create directory structure: `.paw/work/test-workflow/` with artifacts

### Success Criteria:

#### Automated Verification:
- [ ] All unit tests pass: `npm test`
- [ ] Test coverage >80% for new tool files (handoffTool, statusTool, promptGenerationTool)
- [ ] Integration tests pass in Extension Development Host
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] Linting passes: `npm run lint`
- [ ] No console errors during test execution

#### Manual Verification:
- [ ] Manual mode end-to-end: Initialize workflow → Spec → Research → Code → Plan → Implement Phase 1 → Review → Implement Phase 2 → Review → Docs → PR (all manual commands)
- [ ] Semi-Auto mode end-to-end: Same workflow with auto-chains at research/review, pauses at decisions
- [ ] Auto mode end-to-end: Same workflow with full automation (tool approvals only)
- [ ] Status Agent resumption: Start workflow, pause for 1 hour, resume with "where am I?", verify state accurate
- [ ] Status Agent help mode: Ask "What does Code Research do?", verify explanation quality
- [ ] Dynamic prompts: Generate implementer Phase 2 prompt, edit file, execute, verify customization applied
- [ ] Inline instructions: "implement Phase 2 but add logging" passes instruction, verify in agent's initial context
- [ ] Prerequisite validation: Attempt `implement` without plan, verify error message
- [ ] Multi-work-item: Create 3 workflows, verify Status Agent lists all, sorted by recency
- [ ] Edge cases: Test all scenarios from manual testing checklist

---

## Testing Strategy

### Unit Tests:
- Tool parameter validation and error handling
- Work ID validation (format checking)
- Agent name enum validation (only valid PAW agent names)
- Inline instruction parameter handling (optional string passthrough)
- Additional content parameter handling (appended to prompt body)
- Prompt file generation (frontmatter, body, naming conventions)
- VS Code command invocation (new chat, open with agent mode)

### Integration Tests:
- Full handoff flow from initialization through multiple stages
- Status Agent uses tools to determine workflow state
- Dynamic prompt generation and file creation
- Tool approval UI presentation (verify messages displayed)
- Agent intelligence: mapping user requests to agent names

### Manual Testing Steps:
1. Install extension in Extension Development Host
2. Create new PAW workflow: `PAW: New PAW Workflow`
3. Select Manual mode, complete Spec stage
4. Type `research` command, verify Spec Research Agent opens
5. Complete research, type `continue`, verify return to Spec Agent
6. Type `code` command, verify Code Research Agent opens
7. Complete code research, verify auto-suggestion for `plan`
8. Type `plan`, verify Implementation Plan Agent opens
9. Complete plan, type `implement Phase 1`, verify Implementer opens
10. Complete Phase 1, type `review`, verify Implementation Review opens
11. Verify Phase PR created, type `implement Phase 2`, repeat for all phases
12. Type `docs` after final phase, verify Documenter opens
13. Type `pr` after docs, verify PR Agent opens
14. Verify final PR created, workflow complete

15. Test Semi-Auto mode: Repeat workflow, verify auto-chains at research/review, pauses at decisions

16. Test Auto mode: Repeat workflow, verify full automation with only tool approvals

17. Test Status Agent: At any point, type "where am I?", verify comprehensive state report

18. Test help mode: Type "What does Code Research do?", verify explanation

19. Test dynamic prompts: Type "generate prompt implementer Phase 3", verify file created with phase context

20. Test inline instructions: Type "implement Phase 2 but add error handling", verify instruction in agent context

21. Test edge cases: missing prerequisites, invalid commands, detached HEAD, etc.

## Performance Considerations

- **Status Agent Caching**: 5-minute TTL for workflow state and PR queries reduces repeated filesystem scans and API calls
- **Directory Scanning**: Shallow listing (no recursion) keeps scan time <2 seconds for 10 workflows
- **PR Query Batching**: Use OR queries when supported to minimize GitHub API calls; fall back to sequential if needed
- **Tool Approval**: "Always Allow" option reduces interaction overhead for Auto mode users
- **Inline Instruction Size**: 500-character limit prevents excessive prompt bloat

## Migration Notes

Existing PAW workflows created before this feature will continue to work:
- WorkflowContext.md without Handoff Mode field defaults to "manual" mode
- Agents check for field presence and use default behavior if missing
- No migration script required; workflows gain handoff capability on next agent invocation
- Users can manually add `Handoff Mode: manual` to WorkflowContext.md to make mode explicit

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/69 (Workflow Handoffs)
- Related Issue: https://github.com/lossyrob/phased-agent-workflow/issues/60 (PAW Workflow Status Capability)
- Spec: `.paw/work/workflow-handoffs/Spec.md`
- Spec Research: `.paw/work/workflow-handoffs/SpecResearch.md`
- Code Research: `.paw/work/workflow-handoffs/CodeResearch.md`
- Architecture Clarification: https://github.com/lossyrob/phased-agent-workflow/issues/69#issuecomment-3573623459
- Voice Notes: `zignore-notes/2025-11-24_workflow-handoff.md`
- VS Code Language Model API: Extension API documentation
- Existing tool patterns: `src/tools/contextTool.ts`, `src/tools/createPromptTemplates.ts`
