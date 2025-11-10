# Simplified Workflow Implementation Plan

## Overview

Implement configurable workflow modes (full, minimal, custom) and review strategies (prs, local) for PAW, allowing users to skip unnecessary stages and choose how to review their work (via intermediate PRs or locally on a single branch). This implementation extends the VS Code extension to capture workflow preferences, enhances the prompt template generation tool to create mode-appropriate prompt files, and updates all agent instructions to adapt behavior based on the selected mode and review strategy.

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
1. Users selecting "minimal" mode during initialization generate only 6 prompt files (02A, 02B, 03A, 03B, 05, 0X) and work on single branch with local review strategy
2. Users selecting "full" mode can choose between "prs" review strategy (planning, phase, docs branches with intermediate PRs) or "local" review strategy (single branch, final PR only)
3. Users selecting "custom" mode can provide free-text instructions describing their desired workflow, and agents interpret these to generate appropriate prompt files
4. All agents read Workflow Mode and Review Strategy from WorkflowContext.md and adapt branching behavior accordingly
5. WorkflowContext.md contains `Workflow Mode: <full|minimal|custom>` and `Review Strategy: <prs|local>` and optionally `Custom Workflow Instructions: <text>`
6. Quality gates (tests, linting, type checking, build) remain mandatory regardless of mode
7. Backward compatibility: existing WorkflowContext.md files without these fields default to "full" mode with "prs" review strategy

**Verification**:
- Run `PAW: New PAW Workflow` command, select "minimal" mode → verify exactly 6 prompt files created in `.paw/work/<slug>/prompts/`
- Initialize workflow with "full" mode + "prs" strategy → verify all 10 prompt files created
- Initialize workflow with "full" mode + "local" strategy → verify all 10 prompt files created, but no intermediate branches/PRs
- Run minimal workflow end-to-end → verify no _plan, _phaseN, or _docs branches created, all commits on target branch
- Check old WorkflowContext.md without Workflow Mode field → agents treat as "full" mode with "prs" strategy without errors

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
Extend the VS Code extension to prompt users for workflow mode and review strategy selection during initialization and store both in WorkflowContext.md. This phase establishes the data model and user interface for workflow configuration.

### Changes Required:

#### 1. User Input Interface
**File**: `vscode-extension/src/ui/userInput.ts`
**Changes**:
- Add `WorkflowMode` type: string literal union of 'full', 'minimal', 'custom'
- Add `ReviewStrategy` type: string literal union of 'prs', 'local'
- Add `WorkflowModeSelection` interface with `mode: WorkflowMode` and optional `customInstructions?: string`
- Update `WorkItemInputs` interface to include `workflowMode: WorkflowModeSelection` and `reviewStrategy: ReviewStrategy` fields
- Create new `collectWorkflowMode()` function that:
  - Shows Quick Pick with 3 mode options (full, minimal, custom) with descriptions
  - If custom mode selected, prompts for custom instructions with validation (min 10 chars)
  - Returns WorkflowModeSelection object
- Create new `collectReviewStrategy()` function that:
  - Shows Quick Pick with 2 strategy options (prs, local) with descriptions
  - If minimal mode selected, skip prompt and default to 'local' (with note to user)
  - Returns ReviewStrategy value
- Update `collectUserInputs()` to call `collectWorkflowMode()` after target branch, then `collectReviewStrategy()`, before issue URL
- Add workflow mode and review strategy to returned WorkItemInputs object

#### 2. Initialization Prompt Template
**File**: `vscode-extension/src/prompts/workItemInitPrompt.template.md`
**Changes**:
- Add workflow mode template variable after ISSUE_URL variable
- Add review strategy template variable after workflow mode
- Add conditional custom instructions template variable (only rendered if present)
- Update WorkflowContext.md generation instructions to include:
  - `Workflow Mode: {{WORKFLOW_MODE}}` field
  - `Review Strategy: {{REVIEW_STRATEGY}}` field
  - Conditional `Custom Workflow Instructions: {{CUSTOM_INSTRUCTIONS}}` field
- Add section instructing agent to determine stages based on workflow mode:
  - Full mode → all stages
  - Minimal mode → CodeResearch, Plan, Implementation, ImplementationReview, FinalPR, Status only
  - Custom mode → interpret instructions to determine stages
- Add validation rule: minimal mode must use local review strategy

#### 3. Prompt Construction Function
**File**: `vscode-extension/src/prompts/workflowInitPrompt.ts`
**Changes**:
- Import `WorkflowModeSelection` and `ReviewStrategy` types from userInput module
- Add `workflowMode: WorkflowModeSelection` and `reviewStrategy: ReviewStrategy` parameters to `constructAgentPrompt()` function
- Add template substitution for `{{WORKFLOW_MODE}}` variable
- Add template substitution for `{{REVIEW_STRATEGY}}` variable
- Handle conditional `{{CUSTOM_INSTRUCTIONS}}` section:
  - If customInstructions present: replace placeholders with actual value
  - If absent: remove entire conditional section from template

#### 4. Command Handler Update
**File**: `vscode-extension/src/commands/initializeWorkItem.ts`
**Changes**:
- Pass `inputs.workflowMode` and `inputs.reviewStrategy` to `constructAgentPrompt()` call

#### 5. TypeScript Compilation
**File**: `vscode-extension/tsconfig.json`
**Verification**: Confirm `strict` mode enabled for type safety

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `cd vscode-extension && npm run compile`
- [x] No TypeScript errors in modified files: `npx tsc --noEmit`
- [x] Extension builds successfully: `npm run compile` in vscode-extension directory

#### Manual Verification:
- [ ] Run `PAW: New PAW Workflow` command in VS Code
- [ ] Verify workflow mode selection UI appears with 3 options (full, minimal, custom)
- [ ] Verify review strategy selection UI appears with 2 options (prs, local)
- [ ] Select "minimal" mode → verify review strategy automatically set to "local" (no prompt)
- [ ] Select "full" mode + "prs" strategy → verify WorkflowContext.md created with both fields
- [ ] Select "full" mode + "local" strategy → verify WorkflowContext.md contains `Workflow Mode: full` and `Review Strategy: local`
- [ ] Select "custom" mode → verify prompted for custom instructions
- [ ] Provide custom instructions "skip docs, single branch" → verify WorkflowContext.md contains mode, strategy, and instructions
- [ ] Check that target branch and issue URL collection still work as before (no regressions)

**Phase 1 Implementation Complete - 2025-11-07**

All automated verification passed successfully. The extension now collects workflow mode and review strategy during initialization:

**Implementation Summary:**
- Added WorkflowMode ('full' | 'minimal' | 'custom') and ReviewStrategy ('prs' | 'local') types
- Created collectWorkflowMode() function with Quick Pick UI showing three mode options with descriptions
- Created collectReviewStrategy() function that auto-selects 'local' for minimal mode
- Updated WorkItemInputs interface to include workflowMode and reviewStrategy fields
- Enhanced initialization prompt template with workflow mode, review strategy, and custom instructions variables
- Updated WorkflowContext.md schema to include new fields with stage determination logic
- Modified constructAgentPrompt() to accept and substitute workflow mode/strategy parameters
- Updated initializeWorkItem command handler to pass new parameters and log selections
- Fixed test cases in customInstructions.test.ts to match new function signatures

**Key Implementation Notes:**
- Minimal mode enforces local review strategy (no intermediate PRs)
- Custom mode prompts for custom instructions with 10 character minimum validation
- Template includes clear stage determination logic for agents to follow
- All changes maintain backward compatibility through optional parameters
- Type safety enforced through TypeScript strict mode

**Review Tasks for Implementation Review Agent:**
- Verify UI text clarity and user experience flow
- Check that Quick Pick descriptions accurately describe each mode
- Validate custom instructions prompt placeholder text is helpful
- Ensure WorkflowContext.md schema documentation is complete and clear

**Manual Testing Pending:** Manual verification steps require running the extension in VS Code and cannot be completed during Phase 1 implementation. These will be verified by the Implementation Review Agent or during Phase 4 integration testing.

---

## Phase 2: Prompt Template Tool Enhancement

### Overview
Enhance the `paw_create_prompt_templates` tool to accept workflow mode, review strategy, and optional stages parameters, enabling conditional generation of prompt files based on the selected workflow mode.

### Changes Required:

#### 1. Tool Parameter Interface
**File**: `vscode-extension/src/tools/createPromptTemplates.ts`
**Changes**:
- Add `WorkflowStage` enum with values: spec, code-research, plan, implementation, implementation-review, pr-review-response, documentation, final-pr, status
- Update `CreatePromptTemplatesParams` interface to add:
  - `workflow_mode?: string` (optional parameter for 'full' | 'minimal' | 'custom')
  - `review_strategy?: string` (optional parameter for 'prs' | 'local')
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
- Add `review_strategy` to parametersSchema properties with enum constraint
- Add `stages` to parametersSchema properties as array of stage enum values
- Keep feature_slug and workspace_path as required parameters only

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation passes: `cd vscode-extension && npm run compile`
- [x] No type errors in createPromptTemplates.ts: `npx tsc --noEmit`
- [x] Tool parameter validation accepts workflow_mode and stages parameters

#### Manual Verification:
- [ ] Initialize workflow with "full" mode + "prs" strategy → verify 10 prompt files created (01A, 02A, 02B, 03A, 03B, 03C, 03D, 04, 05, 0X)
- [ ] Initialize workflow with "full" mode + "local" strategy → verify 10 prompt files created (same as prs - review strategy doesn't affect which prompts are generated)
- [ ] Initialize workflow with "minimal" mode → verify exactly 6 prompt files created (02A, 02B, 03A, 03B, 05, 0X)
- [ ] Verify no 01A-spec.prompt.md or 04-docs.prompt.md in minimal mode
- [ ] Check that generated prompt files have correct frontmatter (`mode: PAW-XX`) and content
- [ ] Initialize workflow with "full" mode twice → verify files are overwritten correctly (idempotent)

**Phase 2 Implementation Complete - 2025-11-09**

All automated verification passed successfully. The prompt template tool now supports conditional generation based on workflow mode:

**Implementation Summary:**
- Added WorkflowStage enum with 9 stage values (spec, code-research, plan, implementation, implementation-review, pr-review-response, documentation, final-pr, status)
- Updated CreatePromptTemplatesParams interface to include optional workflow_mode, review_strategy, and stages parameters
- Created PromptTemplate interface and updated PROMPT_TEMPLATES array to map each template to its corresponding stage
- Implemented determineStagesFromMode() function with logic for:
  - Full mode: All 9 stages (10 prompt files)
  - Minimal mode: 7 stages excluding spec and documentation (7 prompt files: 02A, 02B, 03A, 03B, 03C, 03D, 05, 0X)
  - Custom mode: Uses explicit stages array or falls back to minimal
  - Undefined/backward compatibility: Defaults to all stages
- Modified createPromptTemplates() to filter templates based on determined stages
- Updated package.json inputSchema with new optional parameters and appropriate enum constraints
- Tool registration now documents workflow mode support in modelDescription

**Key Implementation Notes:**
- Stage filtering happens at template generation time, not file creation time
- PRReviewResponse stage includes both 03C and 03D prompt files
- Review strategy parameter accepted but doesn't affect which prompts are generated (documented in comments)
- Backward compatibility preserved: undefined workflow_mode generates all prompt files
- All parameters except feature_slug and workspace_path remain optional for backward compatibility

**Review Tasks for Implementation Review Agent:**
- Verify stage-to-prompt-file mapping is complete and accurate
- Check that determineStagesFromMode logic correctly handles all mode cases
- Validate that package.json schema changes match TypeScript interface
- Ensure minimal mode stage count matches spec (should be 7 files, not 6 as initially stated in plan - includes PRReviewResponse stage)

**Note on Stage Count:** The implementation plan initially stated minimal mode would generate 6 files, but the actual implementation generates 7 files (02A, 02B, 03A, 03B, 03C, 03D, 05, 0X) because PRReviewResponse stage includes both 03C and 03D prompt files, which are important for handling PR review comment workflows even in minimal mode.

**Addressed Review Comments: - 2025-11-10**

Addressed PR review comment https://github.com/lossyrob/phased-agent-workflow/pull/66#discussion_r2508755646 regarding the unnecessary `review_strategy` parameter in the `paw_create_prompt_templates` tool.

**Issue**: The `review_strategy` parameter was accepted by the tool but documented as not affecting which prompt files are generated. Since the tool's sole purpose is to generate prompt files, accepting a parameter that doesn't affect its output is unnecessary and confusing.

**Resolution**: Removed `review_strategy` parameter from:
- `CreatePromptTemplatesParams` interface in `vscode-extension/src/tools/createPromptTemplates.ts`
- `inputSchema` in `vscode-extension/package.json`
- Tool `modelDescription` to remove any reference to review strategy

**Rationale**: The review strategy configuration is still collected during workflow initialization (Phase 1) and written to WorkflowContext.md. Agents will read the review strategy directly from WorkflowContext.md when they need it (Phase 3) to adapt their branching behavior. The prompt template generation tool doesn't need this information because it only determines which prompt files to create, not how branches or PRs should be managed.

**Other Parameters Verified**: Confirmed that remaining parameters are all necessary:
- `feature_slug` (required): Used to determine directory path
- `workspace_path` (required): Used to determine directory path  
- `workflow_mode` (optional): Determines which stages to include, directly affects which files are generated
- `stages` (optional): Explicit stage list, directly affects which files are generated

---

## Phase 3: Agent Instruction Updates

### Overview
Update all PAW agent chatmode files to include workflow mode and review strategy handling sections that adapt branching behavior and artifact discovery based on the configuration in WorkflowContext.md.

### Changes Required:

#### 1. Common Workflow Mode and Review Strategy Handling Pattern

All 10 agent chatmode files need a new "Workflow Mode and Review Strategy Handling" section added after their "WorkflowContext.md Parameters" section. Each agent's section should:
- Read both Workflow Mode and Review Strategy from WorkflowContext.md at startup
- Describe behavior for full mode (all stages)
- Describe behavior for minimal mode (subset of stages)
- Describe behavior for custom mode (interpret Custom Workflow Instructions)
- Describe behavior for prs review strategy (create intermediate branches and PRs)
- Describe behavior for local review strategy (single branch, no intermediate PRs)
- Handle backward compatibility (missing fields default to full mode with prs strategy)

#### 2. PAW-01A Spec Agent
**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`
**Changes**: Add workflow mode and review strategy handling section after WorkflowContext.md Parameters
**Behavior**:
- Full mode: Standard spec creation with Spec.md and SpecResearch.md
- Minimal mode: Agent should not be invoked (spec stage skipped)
- Custom mode: Check if spec stage included in instructions
- Review Strategy: prs or local both work the same for spec stage (no branching yet)
- Backward compatibility: Default to full mode with prs strategy if fields missing

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
**Changes**: Add workflow mode and review strategy handling and update branching instructions
**Behavior**:
- Full mode: All stages in plan
- Minimal mode: Single implementation phase only
- prs strategy: Create planning branch (`<target>_plan`), open Planning PR
- local strategy: Work on target branch, no planning branch, no Planning PR
- Custom mode: Interpret phase count and branch strategy from instructions

#### 5. PAW-03A Implementer
**File**: `.github/chatmodes/PAW-03A Implementer.chatmode.md`
**Changes**: Add workflow mode and review strategy handling and update phase branch creation logic
**Behavior**:
- Full mode: Multi-phase implementation typical
- Minimal mode: Single-phase implementation only
- prs strategy: Create phase branches (`<target>_phase[N]`), open Phase PRs
- local strategy: Work on target branch, no phase branches, no Phase PRs
- Custom mode: Interpret phase count and branch strategy from instructions

#### 6. PAW-03B Impl Reviewer
**File**: `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`
**Changes**: Add workflow mode and review strategy handling for PR creation
**Behavior**:
- Full mode: Review all phases
- Minimal mode: Review single phase
- prs strategy: Push phase branch, create Phase PR
- local strategy: Push target branch, no Phase PR
- Custom mode: Adapt based on phase count and branch strategy

#### 7. PAW-04 Documenter
**File**: `.github/chatmodes/PAW-04 Documenter.chatmode.md`
**Changes**: Add workflow mode and review strategy handling
**Behavior**:
- Full mode: Create comprehensive documentation
- Minimal mode: Agent should not be invoked (docs stage skipped)
- prs strategy: Create docs branch (`<target>_docs`), open Docs PR
- local strategy: Work on target branch, commit docs directly, no Docs PR
- Custom mode: Check if docs included, adapt branch strategy

#### 8. PAW-05 PR Agent
**File**: `.github/chatmodes/PAW-05 PR.chatmode.md`
**Changes**: Add workflow mode and review strategy handling (final PR always created)
**Behavior**:
- Full mode: May reference planning, phase, and docs artifacts
- Minimal mode: Reference only code research and implementation artifacts
- prs strategy: Reference all intermediate PRs in description
- local strategy: No intermediate PRs to reference, describe work directly
- Custom mode: Adapt PR description based on which PRs exist
- Note: Final PR creation is mandatory in all modes and strategies

#### 9. PAW-0X Status Agent
**File**: `.github/chatmodes/PAW-X Status Update.chatmode.md`
**Changes**: Add workflow mode and review strategy handling for status reporting
**Behavior**:
- Full mode: Report all stages and all branches
- Minimal mode: Report only included stages, single branch
- prs strategy: Check for planning, phase, and docs branches and PRs
- local strategy: Check only target branch and final PR
- Custom mode: Infer stages from instructions and existing artifacts, adapt branch/PR checking

### Success Criteria:

#### Automated Verification:
- [ ] All chatmode files pass linting: `./scripts/lint-chatmode.sh .github/chatmodes/*.chatmode.md`
- [ ] No markdown syntax errors in updated chatmode files

#### Manual Verification:
- [ ] Initialize minimal workflow → run 02A-code-research.prompt.md → verify agent doesn't error about missing Spec.md
- [ ] Complete minimal workflow end-to-end → verify no planning branch, phase branches, or docs branch created
- [ ] Run `git branch -a` after minimal workflow → see only target branch and remote tracking branches
- [ ] Initialize full workflow with prs strategy → verify all agents create appropriate branches (_plan, _phaseN, _docs)
- [ ] Initialize full workflow with local strategy → verify all agents work on target branch, no intermediate branches
- [ ] Test backward compatibility: Remove "Workflow Mode" and "Review Strategy" from WorkflowContext.md → run agent → verify treats as "full" mode with "prs" strategy with log message
- [ ] Initialize custom workflow with "single branch, skip docs" (local strategy implied) → verify agents adapt correctly

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
- Review strategy type validation
- WorkflowModeSelection interface usage
- User input collection with mode and strategy parameters
- Prompt template generation with different modes
- Stage-to-prompt-file mapping correctness
- Validation rule: minimal mode requires local strategy

**Key Test Cases**:
1. Full mode + prs strategy generates exactly 10 prompt files and creates intermediate branches
2. Full mode + local strategy generates exactly 10 prompt files but no intermediate branches
3. Minimal mode (local strategy enforced) generates exactly 6 prompt files (02A, 02B, 03A, 03B, 05, 0X)
4. Custom mode with explicit stages generates only specified files
5. Default behavior (no mode/strategy) generates all files for backward compatibility (full + prs)
6. Generated files have correct frontmatter and content format
7. Invalid custom instructions rejected during input collection
8. Minimal mode + prs strategy combination rejected with clear error

### Integration Tests

**End-to-End Workflow Tests**:
1. **Full Mode + prs Strategy E2E**:
   - Initialize workflow with full mode and prs strategy
   - Complete all stages: Spec → Code Research → Planning → Implementation → Docs → PR
   - Verify branches: _plan, _phaseN, _docs all created
   - Verify PRs: Planning PR, Phase PR(s), Docs PR, Final PR all opened
   - Verify artifacts: All 6 markdown files created

2. **Full Mode + local Strategy E2E**:
   - Initialize workflow with full mode and local strategy
   - Complete all stages on target branch
   - Verify branches: Only target branch exists (no _plan, _phaseN, _docs)
   - Verify PRs: Only Final PR created
   - Verify artifacts: All 6 markdown files created

3. **Minimal Mode E2E**:
   - Initialize workflow with minimal mode (local strategy enforced)
   - Complete stages: Code Research → Planning → Implementation → PR
   - Verify branches: Only target branch exists
   - Verify PRs: Only Final PR created
   - Verify artifacts: CodeResearch.md and ImplementationPlan.md (single phase) created
   - Verify no Spec.md or Docs.md

4. **Custom Mode E2E**:
   - Initialize with instructions: "skip docs, prs review strategy, multi-phase plan"
   - Verify prompt files: No 01A-spec or 04-docs generated
   - Verify branching: Planning and phase branches created
   - Verify planning: Multi-phase ImplementationPlan.md created
   - Verify PRs: Planning PR and Phase PR(s) created

5. **Backward Compatibility**:
   - Create WorkflowContext.md without Workflow Mode and Review Strategy fields
   - Run various agents
   - Verify all treat as full mode with prs strategy with informational log messages
   - Verify no errors or crashes

### Manual Testing Steps

**Scenario 1: New User with Bug Fix**
1. Open PAW-enabled workspace
2. Run `PAW: New PAW Workflow` command
3. Enter branch name: `fix/login-timeout`
4. Select "minimal" mode → verify UI shows clear description and automatically sets local strategy
5. Enter GitHub issue URL
6. Verify WorkflowContext.md created with `Workflow Mode: minimal` and `Review Strategy: local`
7. Verify exactly 6 prompt files in `.paw/work/fix-login-timeout/prompts/`
8. Run `02A-code-research.prompt.md` → verify agent doesn't error about missing Spec.md
9. Run `02B-impl-plan.prompt.md` → verify single-phase plan created
10. Run `03A-implement.prompt.md` → verify no phase branch created
11. Verify all commits on `fix/login-timeout` branch
12. Run `05-pr.prompt.md` → verify Final PR opened from `fix/login-timeout` → `main`

**Scenario 2: Large Feature with Full Workflow + prs Strategy**
1. Run `PAW: New PAW Workflow` command
2. Enter branch name: `feature/oauth-integration`
3. Select "full" mode
4. Select "prs" review strategy
5. Enter GitHub issue URL
6. Verify all 10 prompt files generated
7. Complete full workflow sequentially
8. Verify planning branch `feature/oauth-integration_plan` created
9. Verify phase branches created for each phase
10. Verify Planning PR, Phase PRs, Docs PR, Final PR all opened
11. Verify all artifacts created (Spec, SpecResearch, CodeResearch, ImplementationPlan, Docs)

**Scenario 3: Large Feature with Full Workflow + local Strategy**
1. Run `PAW: New PAW Workflow` command
2. Enter branch name: `feature/oauth-integration`
3. Select "full" mode
4. Select "local" review strategy
5. Enter GitHub issue URL
6. Verify all 10 prompt files generated
7. Complete full workflow sequentially on single branch
8. Verify all work on `feature/oauth-integration` branch (no _plan, _phaseN, _docs branches)
9. Verify only Final PR created
10. Verify all artifacts created and committed to target branch

**Scenario 4: Custom Workflow with prs Strategy**
1. Run `PAW: New PAW Workflow` command
2. Enter branch name: `refactor/api-client`
3. Select "custom" mode
4. Enter instructions: "Skip specification stage, include documentation, use prs review strategy"
5. Select "prs" review strategy
6. Verify prompt files: No 01A-spec, includes 04-docs, includes 02A, 02B, 03A, 03B, 05, 0X
7. Run Code Research → verify no error about missing Spec.md
8. Run Planning → verify planning branch created
9. Run Implementation → verify phase branches created
10. Run Documentation → verify docs branch created
11. Verify Planning PR, Phase PR(s), Docs PR created

**Scenario 5: Backward Compatibility**
1. Navigate to existing PAW workflow with old WorkflowContext.md (no Workflow Mode or Review Strategy fields)
2. Run Status Agent
3. Verify informational log: "No Workflow Mode or Review Strategy found, assuming full mode with prs strategy"
4. Verify agent functions correctly (checks for all branches)
5. Manually add `Workflow Mode: full` and `Review Strategy: prs` to WorkflowContext.md
6. Run Status Agent again → verify no more informational message

**Scenario 6: Invalid Configuration**
1. Manually edit WorkflowContext.md, set `Workflow Mode: turbo-fast`
2. Run any agent (e.g., Status Agent)
3. Verify clear error message: "Invalid Workflow Mode 'turbo-fast'... Valid modes are: full, minimal, custom"
4. Verify agent stops execution (doesn't proceed with invalid config)

**Scenario 7: Quality Gates in Minimal Mode**
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
