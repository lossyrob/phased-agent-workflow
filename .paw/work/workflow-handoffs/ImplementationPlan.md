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
- Create `HandoffParams` interface with fields: `target_agent` (string, required), `work_id` (string, required), `inline_instruction` (string, optional)
- Implement validation: Work ID matches `/^[a-z0-9-]+$/`, target agent non-empty, inline instruction max 500 chars
- Implement `determineAgentFromIdentifier()` function mapping friendly names to agent strings:
  - `research` → `PAW-01B Spec Researcher`
  - `code` → `PAW-02A Code Researcher`
  - `plan` → `PAW-02B Impl Planner`
  - `implement` or `implement Phase N` → `PAW-03A Implementer`
  - `review` → `PAW-03B Impl Reviewer`
  - `docs` → `PAW-04 Documenter`
  - `pr` → `PAW-05 PR`
  - `status` → `PAW-X Status Update`
- Implement prerequisite validation `validateHandoffPrerequisites()`:
  - Check WorkflowContext.md exists in `.paw/work/<work_id>/`
  - For `plan`, verify Spec.md exists
  - For `implement`, verify ImplementationPlan.md exists
  - For `implement Phase N`, verify `## Phase N` heading exists in ImplementationPlan.md
  - Return actionable error messages on failure
- Implement inline instruction parsing: extract text after "but", "with", "remember to" keywords
- Construct prompt: frontmatter with agent name, instruction for stage, `Work ID: <work_id>`, appended inline instruction if provided
- Use Language Model API: `vscode.commands.executeCommand('workbench.action.chat.newChat')` followed by `vscode.commands.executeCommand('workbench.action.chat.open', { query: prompt, mode: 'agent' })`
- Return success message with target agent name and Work ID

**Brief Example**:
```typescript
interface HandoffParams {
  target_agent: string;
  work_id: string;
  inline_instruction?: string;
}

async function validateHandoffPrerequisites(targetAgent: string, workId: string): Promise<void> {
  const workDir = path.join(workspaceRoot, '.paw', 'work', workId);
  
  if (!fs.existsSync(path.join(workDir, 'WorkflowContext.md'))) {
    throw new Error(`WorkflowContext.md not found for ${workId}`);
  }
  
  if (targetAgent.includes('Implementer')) {
    const planPath = path.join(workDir, 'ImplementationPlan.md');
    if (!fs.existsSync(planPath)) {
      throw new Error('Cannot start Implementation: ImplementationPlan.md not found. Run `plan` to create implementation plan first.');
    }
  }
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
  - `modelDescription`: Tool description explaining handoff functionality
  - `inputSchema`: JSON schema with `target_agent`, `work_id`, `inline_instruction` properties

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
- [ ] Unit tests pass for `handoffTool.ts`: `npm test`
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] Tool registered and discoverable in Extension Development Host
- [ ] Validation tests pass: missing ImplementationPlan.md throws error, invalid Work ID rejected
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Extension activates without errors
- [ ] Handoff tool appears in tool approval UI when agent invokes
- [ ] Manual mode: Typing `research` after Spec completion opens Spec Research Agent chat
- [ ] Work ID correctly passed and `paw_get_context` succeeds in target agent
- [ ] Inline instruction ("continue but add logging") appears in target agent's initial context
- [ ] Prerequisite validation: `implement Phase 1` without ImplementationPlan.md shows error message
- [ ] Agent name mapping: `implement Phase 2` resolves to `PAW-03A Implementer`

---

## Phase 2: Status Agent Core Enhancements

### Overview
Transform the Status Agent into a comprehensive workflow navigation hub by adding directory scanning for active workflows, artifact detection, git status checking, PR querying, and actionable next-step suggestions.

### Changes Required:

#### 1. Workflow Scanning Logic
**File**: `src/tools/statusTool.ts` (new)
**Changes**:
- Create `StatusParams` interface with optional `work_id` field (if omitted, list all workflows)
- Implement `scanActiveWorkflows()`: list top-level directories in `.paw/work/`, check for WorkflowContext.md, return workflow metadata (Work ID, Title, last modified)
- Implement caching: 5-minute TTL, cache key includes workspace path
- Sort workflows by most recent modification time (descending)
- Return structured data: array of `{ workId, title, targetBranch, lastModified, branchExists }`

#### 2. Artifact Detection
**File**: `src/tools/statusTool.ts`
**Changes**:
- Implement `detectArtifacts(workId: string)` checking existence of: Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md
- For ImplementationPlan.md, parse phase count: search for `## Phase \d+:` pattern, count unique phase numbers
- Return structured object: `{ spec: boolean, specResearch: boolean, codeResearch: boolean, plan: boolean, planPhaseCount: number, docs: boolean }`

#### 3. Git Status Checking
**File**: `src/tools/statusTool.ts`
**Changes**:
- Implement `getGitStatus(targetBranch: string, remote: string)` using child_process patterns from `src/git/validation.ts`
- Check branch existence: `git rev-parse --verify <branch>`
- Check current branch: `git branch --show-current`
- Check detached HEAD: `git symbolic-ref -q HEAD` (non-zero exit = detached)
- Check ahead/behind: `git rev-list --left-right --count <remote>/<branch>...<branch>` (parse output "X   Y")
- Check uncommitted changes: `git status --porcelain` (non-empty = changes exist)
- Return object: `{ branchExists: boolean, currentBranch: string, isDetached: boolean, aheadCount: number, behindCount: number, hasUncommitted: boolean }`

#### 4. PR Status Querying
**File**: `src/tools/statusTool.ts`
**Changes**:
- Implement `getPRStatus(workId: string, targetBranch: string, planPhaseCount: number)` 
- Build search query for GitHub MCP: construct OR query for all branches (`<target>_plan`, `<target>_phase1`, `<target>_phase2`, ..., `<target>_docs`, `<target>`)
- If OR batching fails at runtime, fall back to sequential queries per branch
- Parse results: extract PR number, state (open/merged/closed), link
- Return structured object: `{ planningPR?, phase1PR?, phase2PR?, ..., docsPR?, finalPR? }` with each PR object containing `{ number, state, url }`
- Implement 5-minute cache for PR query results

#### 5. Next-Step Suggestions
**File**: `src/tools/statusTool.ts`
**Changes**:
- Implement `suggestNextSteps(artifacts: ArtifactStatus, prStatus: PRStatus)` logic:
  - If Spec.md missing: suggest `spec`
  - If Spec.md exists but CodeResearch.md missing: suggest `code`
  - If CodeResearch.md exists but ImplementationPlan.md missing: suggest `plan`
  - If ImplementationPlan.md exists but no phase PRs: suggest `implement Phase 1`
  - If Phase N PR merged but Phase N+1 not started: suggest `implement Phase N+1`
  - If all phases complete but Docs.md missing: suggest `docs`
  - If Docs.md exists but no final PR: suggest `pr`
- Return array of command strings with descriptions

#### 6. Tool Registration
**File**: `src/extension.ts`
**Changes**:
- Import `registerStatusTool` from `./tools/statusTool`
- Add tool registration in `activate()`: `registerStatusTool(context)`

**File**: `package.json`
**Changes**:
- Add tool definition to `contributes.languageModelTools`: `paw_get_workflow_status` with optional `work_id` parameter

### Success Criteria:

#### Automated Verification:
- [ ] Unit tests pass for `statusTool.ts`: `npm test`
- [ ] Workflow scanning returns correct count for test workspace with 3 workflows
- [ ] Artifact detection correctly identifies all files and counts phases (test with fixture plan)
- [ ] Git status parsing correctly handles ahead/behind counts (test with mocked git output)
- [ ] Next-step suggestions return expected commands for various workflow states
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Status Agent lists multiple work items sorted by recency
- [ ] Selecting specific work item shows detailed status with artifacts checked
- [ ] Git divergence correctly reported ("5 commits behind main")
- [ ] PR status shows all phase PRs with states and links
- [ ] Next-step suggestions contextually appropriate ("implement Phase 3" when Phase 2 merged)
- [ ] Cache prevents repeated filesystem scans during single session (observable via logging)
- [ ] Detached HEAD detected and reported with nearby branch suggestions

---

## Phase 3: Dynamic Prompt Generation

### Overview
Implement on-demand prompt file generation capability in Status Agent, allowing users to create customizable prompt files only when needed rather than pre-generating all files at initialization.

### Changes Required:

#### 1. Prompt Generation Logic
**File**: `src/tools/promptGenerationTool.ts` (new)
**Changes**:
- Create `PromptGenerationParams` interface: `{ work_id: string, stage: string, phase_number?: number }`
- Implement stage-to-template mapping using patterns from `src/tools/createPromptTemplates.ts`:
  - `spec` → `01A-spec.prompt.md`, `PAW-01A Specification`
  - `research` → `01B-spec-research.prompt.md`, `PAW-01B Spec Researcher`
  - `code` → `02A-code-research.prompt.md`, `PAW-02A Code Researcher`
  - `plan` → `02B-impl-plan.prompt.md`, `PAW-02B Impl Planner`
  - `implementer` or `implement` → `03A-implement-phase<N>.prompt.md`, `PAW-03A Implementer`
  - `reviewer` or `review` → `03B-review-phase<N>.prompt.md`, `PAW-03B Impl Reviewer`
  - `docs` → `04-docs.prompt.md`, `PAW-04 Documenter`
  - `pr` → `05-pr.prompt.md`, `PAW-05 PR`
  - `status` → `0X-status.prompt.md`, `PAW-X Status Update`
- For phases: construct filename `03A-implement-phase<N>.prompt.md`
- Inject phase-specific context by reading ImplementationPlan.md and extracting Phase N section (from `## Phase N:` to next `## Phase` or EOF)
- Generate frontmatter: `---\nagent: <agent_name>\n---`
- Generate body: stage instruction, `Work ID: <work_id>`, phase context if applicable
- Write file to `.paw/work/<work_id>/prompts/<filename>`
- Return file path and success message

#### 2. Phase Context Extraction
**File**: `src/tools/promptGenerationTool.ts`
**Changes**:
- Implement `extractPhaseContext(planPath: string, phaseNumber: number)` parsing ImplementationPlan.md
- Search for `## Phase ${phaseNumber}:` heading
- Extract all content until next `## Phase` heading or EOF
- Include: phase overview, changes required, success criteria
- Return as string to append to prompt body

#### 3. Tool Registration
**File**: `src/extension.ts`
**Changes**:
- Import `registerPromptGenerationTool` from `./tools/promptGenerationTool`
- Add registration: `registerPromptGenerationTool(context)`

**File**: `package.json`
**Changes**:
- Add tool definition: `paw_generate_prompt` with parameters `work_id`, `stage`, optional `phase_number`

#### 4. Status Agent Integration
**File**: `agents/PAW-X Status Update.agent.md`
**Changes**:
- Add instructions for invoking `paw_generate_prompt` tool when user requests dynamic prompt generation
- Add examples: "generate prompt implementer Phase 3", "generate prompt code"
- Document that generated prompts can be edited before execution

### Success Criteria:

#### Automated Verification:
- [ ] Unit tests pass for `promptGenerationTool.ts`: `npm test`
- [ ] Phase context extraction correctly parses test ImplementationPlan.md fixture
- [ ] Generated prompt files have valid frontmatter and Work ID
- [ ] Filename generation follows PAW naming conventions (`03A-implement-phase2.prompt.md`)
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Status Agent invoked with "generate prompt implementer Phase 3" creates correct file
- [ ] Generated prompt file contains Phase 3-specific context from ImplementationPlan.md
- [ ] Frontmatter contains correct agent name (`PAW-03A Implementer`)
- [ ] User can edit generated prompt file and execute it successfully
- [ ] File not created if prerequisites missing (ImplementationPlan.md for implementer prompts)
- [ ] Status Agent provides file path after generation with edit/execute options

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
  - Presenting next-step options in code-formatted style: `research`, `code`, `implement Phase N`
  - Invoking `paw_call_agent` tool with target agent identifier, Work ID, and optional inline instruction
  - Parsing inline instructions from user commands (text after "but", "with", "remember to")

**Brief Example**:
```markdown
### Handoff Mode Handling

Read the `Handoff Mode` field from WorkflowContext.md (default to "manual" if missing).

**Manual Mode**: Present next-step options and wait for user command
**Semi-Auto Mode**: Auto-invoke handoff at designated transitions (see stage-specific guidance)
**Auto Mode**: Always auto-invoke next stage without pausing

### Presenting Next Steps

Format options as code-formatted commands:
- Type `research` to start Spec Research Agent
- Type `code` to proceed to Code Research
- Type `status` to see workflow state

### Invoking Handoff

Call `paw_call_agent` tool with:
- `target_agent`: Identifier (e.g., "research", "implement Phase 2")
- `work_id`: Current Work ID from WorkflowContext.md
- `inline_instruction`: (optional) Extract from user command after "but", "with", "remember to"
```

#### 2. PAW-01A Specification Agent Updates
**File**: `agents/PAW-01A Specification.agent.md`
**Changes**:
- Include handoff component instructions
- Update "Hand-off" section to present next-step options:
  - `research` (if research questions identified)
  - `code` (skip research, go to Code Research)
  - `status`
  - `generate prompt research` (for customization)
- Add Semi-Auto behavior: after finalizing Spec, check Handoff Mode; if "semi-auto" or "auto", auto-invoke `code` (Code Research stage)
- Add Manual behavior: present options and wait for user command

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
- Test agent name resolution: `research` → `PAW-01B Spec Researcher`, `implement Phase 2` → `PAW-03A Implementer`
- Test prerequisite validation: missing ImplementationPlan.md throws error, missing Phase N heading throws error
- Test inline instruction parsing: "continue but add logging" extracts "add logging"
- Test Work ID validation: invalid format rejected, valid format accepted
- Mock filesystem for WorkflowContext.md and ImplementationPlan.md checks
- Mock VS Code commands (`workbench.action.chat.newChat`, `workbench.action.chat.open`)

#### 2. Status Tool Unit Tests
**File**: `src/test/suite/statusTool.test.ts` (new)
**Changes**:
- Test workflow scanning: returns correct count, sorts by recency, filters by WorkflowContext.md presence
- Test artifact detection: correctly identifies files, counts phases from fixture ImplementationPlan.md
- Test git status parsing: ahead/behind counts parsed correctly, detached HEAD detected
- Test next-step suggestions: returns expected commands for various workflow states
- Mock filesystem for artifact checks
- Mock git commands with known outputs

#### 3. Prompt Generation Tool Unit Tests
**File**: `src/test/suite/promptGenerationTool.test.ts` (new)
**Changes**:
- Test filename generation: follows PAW naming conventions, includes phase numbers
- Test phase context extraction: correctly parses fixture ImplementationPlan.md
- Test frontmatter generation: valid YAML with correct agent name
- Test prerequisite validation: rejects invalid stage names, missing ImplementationPlan.md for implementer prompts
- Mock filesystem for reading ImplementationPlan.md and writing prompt files

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
- Agent name resolution logic (friendly names to full agent strings)
- Prerequisite validation rules (artifact existence, phase heading checks)
- Inline instruction parsing (keyword extraction)
- Git status parsing (ahead/behind counts, detached HEAD)
- Workflow scanning logic (directory listing, filtering, sorting)
- Phase context extraction (ImplementationPlan.md parsing)
- Next-step suggestion logic (workflow state → commands)

### Integration Tests:
- Full handoff flow from initialization through multiple stages
- Status Agent workflow state reporting with real workspace structure
- Dynamic prompt generation and file creation
- Tool approval UI presentation (verify messages displayed)
- Cache behavior (verify filesystem scans not repeated within TTL)

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
