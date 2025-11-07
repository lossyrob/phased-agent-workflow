# Simplified Workflow Implementation Plan

## Overview

Implement configurable workflow modes (full, minimal, custom) for PAW, allowing users to skip unnecessary stages and work on single branches for smaller tasks while maintaining code quality requirements. This implementation extends the VS Code extension to capture workflow mode preferences, enhances the prompt template generation tool to create mode-appropriate prompt files, and updates all agent instructions to adapt behavior based on the selected mode.

## Current State Analysis

PAW currently implements a single, comprehensive workflow path:
- **Fixed 10-stage progression**: Spec (01A) → Spec Research → Code Research (02A) → Implementation Plan (02B) → Implementation (03A-03D) → Documentation (04) → Final PR (05) → Status (0X)
- **Multi-branch strategy**: Hardcoded creation of planning branch (_plan), phase branches (_phaseN), and docs branch (_docs) with intermediate PRs
- **No workflow configuration**: All workflows follow identical stages regardless of task scope
- **Extension limitation**: Only collects target branch and optional issue URL during initialization (`vscode-extension/src/ui/userInput.ts:47-88`)
- **Tool limitation**: `paw_create_prompt_templates` generates all 10 prompt files unconditionally (`vscode-extension/src/tools/createPromptTemplates.ts:30-78`)
- **Agent uniformity**: All 10 agents follow identical WorkflowContext.md reading patterns with no mode awareness (`.github/chatmodes/PAW-*.chatmode.md`)

### Key Discoveries:
- Extension already has validation infrastructure for user inputs with typed interfaces (`WorkItemInputs`) at `vscode-extension/src/ui/userInput.ts:12-20`
- Prompt template tool is registered as a language model tool allowing agents to invoke it (`vscode-extension/src/tools/createPromptTemplates.ts:149-189`)
- All agents have defensive WorkflowContext.md creation logic that can be leveraged for backward compatibility (e.g., `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:70-103`)
- Stage-to-prompt mapping follows consistent naming: 01A-spec, 02A-code-research, 02B-impl-plan, 03A-implement, 03B-review, 03C-pr-review, 03D-review-pr-review, 04-docs, 05-pr, 0X-status
- Git operations centralized in agent instructions (no git library usage), allowing mode-based branching to be controlled purely via instruction changes

## Desired End State

After this plan is complete:
1. Users selecting "minimal" mode during initialization generate only 6 prompt files (02A, 02B, 03A, 03B, 05, 0X) and work on single branch
2. Users selecting "custom" mode can provide free-text instructions describing their desired workflow, and agents interpret these to generate appropriate prompt files
3. All agents read Workflow Mode from WorkflowContext.md and adapt branching behavior (single-branch vs multi-branch)
4. WorkflowContext.md contains `Workflow Mode: <full|minimal|custom>` and optionally `Custom Workflow Instructions: <text>`
5. Quality gates (tests, linting, type checking, build) remain mandatory regardless of mode
6. Backward compatibility: existing WorkflowContext.md files without Workflow Mode default to "full" mode

**Verification**:
- Run `PAW: New PAW Workflow` command, select "minimal" mode → verify exactly 6 prompt files created in `.paw/work/<slug>/prompts/`
- Initialize workflow with "full" mode → verify all 10 prompt files created
- Run minimal workflow end-to-end → verify no _plan, _phaseN, or _docs branches created, all commits on target branch
- Check old WorkflowContext.md without Workflow Mode field → agents treat as "full" mode without errors

## What We're NOT Doing

- Creating additional predefined modes beyond full, minimal, and custom in this implementation
- Changing quality gate requirements based on workflow mode (all quality checks remain mandatory)
- Supporting mid-workflow mode changes or mode transitions (requires re-initialization)
- Migrating existing in-progress workflows to new workflow mode system (applies to new workflows only)
- Implementing workflow mode selection in non-VS Code environments (CLI-only usage not supported)
- Automatic detection or recommendation of optimal workflow mode based on issue analysis
- Changing branch naming conventions (planning/phase/docs suffixes remain same in full mode)
- Adding spec research prompt file to generated templates (spec research continues to be generated dynamically by Spec Agent)

## Implementation Approach

This implementation follows a layered approach, building from data capture through tool enhancement to agent behavior adaptation:

1. **Phase 1** extends the extension to capture user's workflow mode preference and persist it in WorkflowContext.md
2. **Phase 2** enhances the prompt template generation tool to conditionally create prompt files based on workflow mode
3. **Phase 3** updates all agent instructions with mode-specific behavior, primarily for branching strategy
4. **Phase 4** adds comprehensive testing and validation

Each phase is independently testable and produces a working (though incomplete) system. This allows for iterative review and adjustment.

## Phase 1: Extension UI and WorkflowContext.md Schema

### Overview
Extend the VS Code extension to prompt users for workflow mode selection during initialization and store the mode in WorkflowContext.md. This phase establishes the data model and user interface for workflow mode configuration.

### Changes Required:

#### 1. User Input Interface
**File**: `vscode-extension/src/ui/userInput.ts`
**Changes**:
- Add `WorkflowMode` type: string literal union of 'full', 'minimal', 'custom'
- Add `WorkflowModeSelection` interface with `mode: WorkflowMode` and optional `customInstructions?: string`
- Update `WorkItemInputs` interface to include `workflowMode: WorkflowModeSelection` field
- Create new `collectWorkflowMode()` function that:
  - Shows Quick Pick with 3 mode options (full, minimal, custom) with descriptions
  - If custom mode selected, prompts for custom instructions with validation (min 10 chars)
  - Returns WorkflowModeSelection object
- Update `collectUserInputs()` to call `collectWorkflowMode()` after target branch, before issue URL
- Add workflow mode to returned WorkItemInputs object

#### 2. Initialization Prompt Template
**File**: `vscode-extension/src/prompts/workItemInitPrompt.template.md`
**Changes**:
- Add workflow mode template variable after ISSUE_URL variable
- Add conditional custom instructions template variable (only rendered if present)
- Update WorkflowContext.md generation instructions to include:
  - `Workflow Mode: {{WORKFLOW_MODE}}` field
  - Conditional `Custom Workflow Instructions: {{CUSTOM_INSTRUCTIONS}}` field
- Add section instructing agent to determine stages based on workflow mode:
  - Full mode → all stages
  - Minimal mode → CodeResearch, Plan, Implementation, ImplementationReview, FinalPR, Status only
  - Custom mode → interpret instructions to determine stages

#### 3. Prompt Construction Function
**File**: `vscode-extension/src/prompts/workflowInitPrompt.ts`
**Changes**:
- Import `WorkflowModeSelection` type from userInput module
- Add `workflowMode: WorkflowModeSelection` parameter to `constructAgentPrompt()` function
- Add template substitution for `{{WORKFLOW_MODE}}` variable
- Handle conditional `{{CUSTOM_INSTRUCTIONS}}` section:
  - If customInstructions present: replace placeholders with actual value
  - If absent: remove entire conditional section from template

#### 4. Command Handler Update
**File**: `vscode-extension/src/commands/initializeWorkItem.ts`
**Changes**:
- Pass `inputs.workflowMode` to `constructAgentPrompt()` call

#### 5. TypeScript Compilation
**File**: `vscode-extension/tsconfig.json`
**Verification**: Confirm `strict` mode enabled for type safety

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd vscode-extension && npm run compile`
- [ ] No TypeScript errors in modified files: `npx tsc --noEmit`
- [ ] Extension builds successfully: `npm run compile` in vscode-extension directory

#### Manual Verification:
- [ ] Run `PAW: New PAW Workflow` command in VS Code
- [ ] Verify workflow mode selection UI appears with 3 options (full, minimal, custom)
- [ ] Select "minimal" mode → verify WorkflowContext.md created with `Workflow Mode: minimal`
- [ ] Select "custom" mode → verify prompted for custom instructions
- [ ] Provide custom instructions "skip docs, single branch" → verify WorkflowContext.md contains both mode and instructions
- [ ] Check that target branch and issue URL collection still work as before (no regressions)

---

## Phase 2: Prompt Template Tool Enhancement

### Overview
Enhance the `paw_create_prompt_templates` tool to accept workflow mode and optional stages parameters, enabling conditional generation of prompt files based on the selected workflow mode.

### Changes Required:

#### 1. Tool Parameter Interface
**File**: `vscode-extension/src/tools/createPromptTemplates.ts`
**Changes**:
- Add `WorkflowStage` enum with values: spec, code-research, plan, implementation, implementation-review, pr-review-response, documentation, final-pr, status
- Update `CreatePromptTemplatesParams` interface to add:
  - `workflow_mode?: string` (optional parameter for 'full' | 'minimal' | 'custom')
  - `stages?: WorkflowStage[]` (optional array for explicit stage list)

#### 2. Stage-to-Prompt Mapping
**File**: `vscode-extension/src/tools/createPromptTemplates.ts`
**Changes**:
- Add `PromptTemplate` interface with fields: filename, mode, instruction, stage
- Update `PROMPT_TEMPLATES` array to include `stage: WorkflowStage` field for each template
- Map templates to stages:
  - 01A-spec.prompt.md → Spec stage
  - 02A-code-research.prompt.md → CodeResearch stage
  - 02B-impl-plan.prompt.md → Plan stage
  - 03A-implement.prompt.md → Implementation stage
  - 03B-review.prompt.md → ImplementationReview stage
  - 03C-pr-review.prompt.md, 03D-review-pr-review.prompt.md → PRReviewResponse stage
  - 04-docs.prompt.md → Documentation stage
  - 05-pr.prompt.md → FinalPR stage
  - 0X-status.prompt.md → Status stage

#### 3. Stage Determination Logic
**File**: `vscode-extension/src/tools/createPromptTemplates.ts`
**Changes**:
- Create `determineStagesFromMode()` function that:
  - If `explicitStages` provided, return them (custom mode behavior)
  - If workflow_mode is 'minimal', return: CodeResearch, Plan, Implementation, ImplementationReview, FinalPR, Status
  - If workflow_mode is 'custom' without explicit stages, fall back to minimal
  - If workflow_mode is 'full' or undefined, return all stages

#### 4. Core Template Generation Update
**File**: `vscode-extension/src/tools/createPromptTemplates.ts`
**Changes**:
- In `createPromptTemplates()` function:
  - Call `determineStagesFromMode()` with workflow_mode and stages parameters
  - Filter `PROMPT_TEMPLATES` array to only templates matching determined stages
  - Generate only filtered templates (existing generation logic unchanged)

#### 5. Tool Invocation Schema Update
**File**: `vscode-extension/src/tools/createPromptTemplates.ts`
**Changes**:
- Update tool registration description to document new parameters
- Add `workflow_mode` to parametersSchema properties with enum constraint
- Add `stages` to parametersSchema properties as array of stage enum values
- Keep feature_slug and workspace_path as required parameters only

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation passes: `cd vscode-extension && npm run compile`
- [ ] No type errors in createPromptTemplates.ts: `npx tsc --noEmit`
- [ ] Tool parameter validation accepts workflow_mode and stages parameters

#### Manual Verification:
- [ ] Initialize workflow with "full" mode → verify 10 prompt files created (01A, 02A, 02B, 03A, 03B, 03C, 03D, 04, 05, 0X)
- [ ] Initialize workflow with "minimal" mode → verify exactly 6 prompt files created (02A, 02B, 03A, 03B, 05, 0X)
- [ ] Verify no 01A-spec.prompt.md or 04-docs.prompt.md in minimal mode
- [ ] Check that generated prompt files have correct frontmatter (`mode: PAW-XX`) and content
- [ ] Initialize workflow with "full" mode twice → verify files are overwritten correctly (idempotent)

---

## Phase 3: Agent Instruction Updates

### Overview
Update all PAW agent chatmode files to include workflow mode handling sections that adapt branching behavior and artifact discovery based on the workflow mode in WorkflowContext.md.

### Changes Required:

#### 1. Common Workflow Mode Handling Pattern

All 10 agent chatmode files need a new "Workflow Mode Handling" section added after their "WorkflowContext.md Parameters" section. Each agent's section should:
- Read Workflow Mode from WorkflowContext.md at startup
- Describe behavior for full mode (standard multi-branch workflow)
- Describe behavior for minimal mode (single-branch, skip certain stages)
- Describe behavior for custom mode (interpret Custom Workflow Instructions)
- Handle backward compatibility (missing Workflow Mode field defaults to full)

#### 2. PAW-01A Spec Agent
**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`
**Changes**: Add workflow mode handling section after WorkflowContext.md Parameters
**Behavior**:
- Full mode: Standard spec creation with Spec.md and SpecResearch.md
- Minimal mode: Agent should not be invoked (spec stage skipped)
- Custom mode: Check if spec stage included in instructions
- Backward compatibility: Default to full mode if field missing

#### 3. PAW-02A Code Researcher
**File**: `.github/chatmodes/PAW-02A Code Researcher.chatmode.md`
**Changes**: Add workflow mode handling section
**Behavior**:
- Full mode: Read Spec.md and SpecResearch.md for context
- Minimal mode: Use Issue URL as requirements source (Spec.md may not exist)
- Add artifact discovery logic: check if Spec.md exists before reading
- If Spec.md missing in minimal/custom mode, note it and continue

#### 4. PAW-02B Impl Planner
**File**: `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`
**Changes**: Add workflow mode handling and update branching instructions
**Behavior**:
- Full mode: Create planning branch (`<target>_plan`), open Planning PR
- Minimal mode: Work on target branch, no planning branch, no Planning PR
- Custom mode: Interpret branch strategy from instructions
- Update existing branching section to be mode-aware

#### 5. PAW-03A Implementer
**File**: `.github/chatmodes/PAW-03A Implementer.chatmode.md`
**Changes**: Add workflow mode handling and update phase branch creation logic
**Behavior**:
- Full mode: Create phase branches (`<target>_phase[N]`), open Phase PRs
- Minimal mode: Work on target branch, no phase branches, no Phase PRs
- Custom mode: Interpret branch strategy from instructions
- Update existing phase branch section to be mode-aware

#### 6. PAW-03B Impl Reviewer
**File**: `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`
**Changes**: Add workflow mode handling for PR creation
**Behavior**:
- Full mode: Push phase branch, create Phase PR
- Minimal mode: Push target branch, no Phase PR
- Custom mode: Adapt based on branch strategy

#### 7. PAW-04 Documenter
**File**: `.github/chatmodes/PAW-04 Documenter.chatmode.md`
**Changes**: Add workflow mode handling
**Behavior**:
- Full mode: Create docs branch (`<target>_docs`), open Docs PR
- Minimal mode: Agent should not be invoked (docs stage skipped)
- Custom mode: Check if docs included, adapt branch strategy

#### 8. PAW-05 PR Agent
**File**: `.github/chatmodes/PAW-05 PR.chatmode.md`
**Changes**: Add workflow mode handling (final PR always created)
**Behavior**:
- Full mode: Reference all intermediate PRs in description
- Minimal mode: No intermediate PRs to reference, describe work directly
- Custom mode: Adapt PR description based on which PRs exist
- Note: Final PR creation is mandatory in all modes

#### 9. PAW-0X Status Agent
**File**: `.github/chatmodes/PAW-X Status Update.chatmode.md`
**Changes**: Add workflow mode handling for status reporting
**Behavior**:
- Full mode: Report all stages and branches
- Minimal mode: Report only included stages, single branch
- Custom mode: Infer stages from instructions and existing artifacts

### Success Criteria:

#### Automated Verification:
- [ ] All chatmode files pass linting: `./scripts/lint-chatmode.sh .github/chatmodes/*.chatmode.md`
- [ ] No markdown syntax errors in updated chatmode files

#### Manual Verification:
- [ ] Initialize minimal workflow → run 02A-code-research.prompt.md → verify agent doesn't error about missing Spec.md
- [ ] Complete minimal workflow end-to-end → verify no planning branch, phase branches, or docs branch created
- [ ] Run `git branch -a` after minimal workflow → see only target branch and remote tracking branches
- [ ] Initialize full workflow → verify all agents still create appropriate branches (_plan, _phaseN, _docs)
- [ ] Test backward compatibility: Remove "Workflow Mode" from WorkflowContext.md → run agent → verify treats as "full" mode with log message
- [ ] Initialize custom workflow with "single branch, skip docs" → verify agents adapt correctly

---

## Phase 4: Testing, Validation, and Documentation

### Overview
Add comprehensive testing for all workflow modes, implement validation for invalid configurations, and update user-facing documentation with workflow mode selection guidance.

### Changes Required:

#### 1. Extension Unit Tests
**File**: `vscode-extension/src/test/suite/userInput.test.ts`
**Changes**: Add test suite for workflow mode selection
**Tests**:
- WorkflowMode type accepts valid values (full, minimal, custom)
- WorkflowModeSelection interface with and without custom instructions
- Type safety verification

#### 2. Prompt Template Tool Tests
**File**: `vscode-extension/src/test/suite/createPromptTemplates.test.ts` (new file)
**Changes**: Create comprehensive test suite
**Tests**:
- Full mode generates all 10 prompt files
- Minimal mode generates exactly 6 files (02A, 02B, 03A, 03B, 05, 0X)
- Custom mode with explicit stages generates only specified files
- Default behavior (no mode) generates all files
- Generated files have correct frontmatter format
- Status stage handling in different modes

#### 3. Integration Test Script
**File**: `scripts/test-workflow-modes.sh` (new file)
**Changes**: Create bash script for manual E2E testing
**Purpose**: Provides test checklist for manual verification of workflow modes

#### 4. Documentation Updates
**File**: `README.md`
**Changes**: Add "Workflow Modes" section after existing content
**Content**:
- Overview of three modes (full, minimal, custom)
- When to use each mode
- How to select mode during initialization
- Clarification that quality gates remain mandatory
- Examples for each mode

#### 5. Validation and Error Handling
**Location**: Agent chatmode files (already added in Phase 3)
**Purpose**: Validate Workflow Mode field, provide clear errors for invalid values

#### 6. Error Handling Test Cases
**File**: `vscode-extension/src/test/suite/errorHandling.test.ts` (new file)
**Changes**: Test error conditions
**Tests**:
- Custom mode requires instructions
- Invalid mode string in WorkflowContext.md detected
- Clear error messages for configuration issues

### Success Criteria:

#### Automated Verification:
- [ ] All unit tests pass: `cd vscode-extension && npm test`
- [ ] New test files compile without errors: `npm run compile`
- [ ] Test coverage includes workflow mode selection, prompt generation, and validation

#### Manual Verification:
- [ ] Complete full workflow end-to-end → verify all branches created, all PRs opened
- [ ] Complete minimal workflow end-to-end → verify single branch, no intermediate PRs, 5 prompt files
- [ ] Initialize custom workflow with "skip spec and docs, single branch" → verify correct prompt files generated and single-branch behavior
- [ ] Test invalid mode in WorkflowContext.md → verify clear error message displayed
- [ ] Test backward compatibility: Use old WorkflowContext.md → verify treats as full mode
- [ ] Run Status Agent in each mode → verify reports appropriate status for that mode
- [ ] Verify quality gates enforced in all modes (tests, linting, type checking)
- [ ] Check documentation clarity: Can a new user understand how to select appropriate mode?

---

## Testing Strategy

### Unit Tests

**Extension Tests** (`vscode-extension/src/test/suite/`):
- Workflow mode type validation
- WorkflowModeSelection interface usage
- User input collection with mode parameter
- Prompt template generation with different modes
- Stage-to-prompt-file mapping correctness

**Key Test Cases**:
1. Full mode generates exactly 10 prompt files
2. Minimal mode generates exactly 5 prompt files (02A, 02B, 03A, 05, 0X)
3. Custom mode with explicit stages generates only specified files
4. Default behavior (no mode) generates all files for backward compatibility
5. Generated files have correct frontmatter and content format
6. Invalid custom instructions rejected during input collection

### Integration Tests

**End-to-End Workflow Tests**:
1. **Full Mode E2E**:
   - Initialize workflow with full mode
   - Complete all stages: Spec → Code Research → Planning → Implementation → Docs → PR
   - Verify branches: _plan, _phaseN, _docs all created
   - Verify PRs: Planning PR, Phase PR(s), Docs PR, Final PR all opened
   - Verify artifacts: All 6 markdown files created

2. **Minimal Mode E2E**:
   - Initialize workflow with minimal mode
   - Complete stages: Code Research → Planning → Implementation → PR
   - Verify branches: Only target branch exists (no _plan, _phaseN, _docs)
   - Verify PRs: Only Final PR created
   - Verify artifacts: CodeResearch.md and ImplementationPlan.md (single phase) created
   - Verify no Spec.md or Docs.md

3. **Custom Mode E2E**:
   - Initialize with instructions: "skip docs, single branch, multi-phase plan"
   - Verify prompt files: No 01A-spec or 04-docs generated
   - Verify branching: Single branch (no intermediate branches)
   - Verify planning: Multi-phase ImplementationPlan.md created despite minimal branching

4. **Backward Compatibility**:
   - Create WorkflowContext.md without Workflow Mode field
   - Run various agents
   - Verify all treat as full mode with informational log messages
   - Verify no errors or crashes

### Manual Testing Steps

**Scenario 1: New User with Bug Fix**
1. Open PAW-enabled workspace
2. Run `PAW: New PAW Workflow` command
3. Enter branch name: `fix/login-timeout`
3. Select "minimal" mode → verify UI shows clear description
4. Enter GitHub issue URL
5. Verify WorkflowContext.md created with `Workflow Mode: minimal`
6. Verify exactly 6 prompt files in `.paw/work/fix-login-timeout/prompts/`
7. Run `02A-code-research.prompt.md` → verify agent doesn't error about missing Spec.md
9. Run `02B-impl-plan.prompt.md` → verify single-phase plan created
10. Run `03A-implement.prompt.md` → verify no phase branch created
11. Verify all commits on `fix/login-timeout` branch
12. Run `05-pr.prompt.md` → verify Final PR opened from `fix/login-timeout` → `main`

**Scenario 2: Large Feature with Full Workflow**
1. Run `PAW: New PAW Workflow` command
2. Enter branch name: `feature/oauth-integration`
3. Select "full" mode
4. Enter GitHub issue URL
5. Verify all 10 prompt files generated
6. Complete full workflow sequentially
7. Verify planning branch `feature/oauth-integration_plan` created
8. Verify phase branches created for each phase
9. Verify Planning PR, Phase PRs, Docs PR, Final PR all opened
10. Verify all artifacts created (Spec, SpecResearch, CodeResearch, ImplementationPlan, Docs)

**Scenario 3: Custom Workflow**
1. Run `PAW: New PAW Workflow` command
2. Enter branch name: `refactor/api-client`
3. Select "custom" mode
4. Enter instructions: "Skip specification stage, include documentation, work on single branch"
5. Verify prompt files: No 01A-spec, includes 04-docs, includes 02A, 02B, 03A, 05, 0X
6. Run Code Research → verify no error about missing Spec.md
7. Run Implementation → verify no phase branches created
8. Run Documentation → verify Docs.md committed to target branch (no docs branch)
9. Verify all work on `refactor/api-client` branch

**Scenario 4: Backward Compatibility**
1. Navigate to existing PAW workflow with old WorkflowContext.md (no Workflow Mode field)
2. Run Status Agent
3. Verify informational log: "No Workflow Mode found, assuming full mode"
4. Verify agent functions correctly (checks for all branches)
5. Manually add `Workflow Mode: full` to WorkflowContext.md
6. Run Status Agent again → verify no more informational message

**Scenario 5: Invalid Configuration**
1. Manually edit WorkflowContext.md, set `Workflow Mode: turbo-fast`
2. Run any agent (e.g., Status Agent)
3. Verify clear error message: "Invalid Workflow Mode 'turbo-fast'... Valid modes are: full, minimal, custom"
4. Verify agent stops execution (doesn't proceed with invalid config)

**Scenario 6: Quality Gates in Minimal Mode**
1. Initialize minimal workflow
2. Implement phase with intentional test failure
3. Run tests → verify failure detected
4. Verify PR cannot be merged until tests pass
5. Fix tests → verify quality gates now pass
6. Verify linting, type checking also enforced

## Performance Considerations

- **Prompt File Generation**: File I/O operations are synchronous but should be fast (generating 10 small text files). No optimization needed unless extension feels slow during initialization.
- **WorkflowContext.md Reading**: All agents read this file at startup. File size is minimal (<1KB) so no performance concerns.
- **Branch Operations**: Git operations (checkout, branch creation) are delegated to agents via terminal commands. Performance depends on repository size, but no new overhead introduced.
- **User Input Collection**: Sequential prompts may feel slower than form-based input. Consider multi-step input box if user feedback indicates UX issue.

## Migration Notes

### For Existing Workflows
- In-progress workflows created before workflow mode support will continue to work
- Agents treat missing Workflow Mode field as "full" mode (backward compatible)
- No migration required for existing `.paw/work/` directories
- Users can optionally add `Workflow Mode: full` to old WorkflowContext.md files for clarity

### For Future Mode Additions
- To add new predefined mode:
  1. Add mode name to `WorkflowMode` type in `userInput.ts`
  2. Add mode to Quick Pick items with description
  3. Add case to `determineStagesFromMode()` in `createPromptTemplates.ts`
  4. Update all agent chatmode files with new mode section
  5. Update documentation and tests
- No breaking changes required for existing modes

### Extension Version Compatibility
- Extension version should be bumped to indicate workflow mode support
- package.json version: Consider 1.1.0 (minor version bump for new feature)
- VS Code version requirement: No change (existing APIs sufficient)

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/13
- Spec: `.paw/work/simplified-workflow/Spec.md`
- Spec Research: `.paw/work/simplified-workflow/SpecResearch.md`
- Code Research: `.paw/work/simplified-workflow/CodeResearch.md`
- Design Document: `.paw/work/simplified-workflow/context/workflow-mode-configuration-design.md`
- Extension Entry Point: `vscode-extension/src/commands/initializeWorkItem.ts:22-84`
- Prompt Template Tool: `vscode-extension/src/tools/createPromptTemplates.ts:30-78`
- User Input Handling: `vscode-extension/src/ui/userInput.ts:47-88`
