# Workflow Init Improvements Implementation Plan

## Overview

This plan improves PAW workflow initialization by reordering input collection (issue URL first), making branch names optional with auto-derivation, and supporting freeform work descriptions when no issue is linked. The key architectural decision is that the **agent handles all intelligent derivation logic**—the TypeScript extension remains a thin layer that collects minimal inputs and passes context to the agent.

## Current State Analysis

The workflow initialization currently:
1. Collects inputs in order: Branch → Mode → Strategy → Issue URL
2. Requires branch name (validation enforces non-empty)
3. Provides no mechanism for users to describe work when skipping issue URL
4. Delegates work title derivation to the agent (existing pattern)

### Key Discoveries:
- `src/ui/userInput.ts:200-216` - Branch name validation requires non-empty value
- `src/ui/userInput.ts:229-247` - Issue URL collection is already optional
- `src/prompts/workItemInitPrompt.template.md` - Template already instructs agent to fetch issue titles
- `src/tools/contextTool.ts` - Returns raw WorkflowContext.md content (no changes needed for new fields)
- Issue #121 comment clarifies: agent handles branch derivation, work description in chat, remote convention detection

## Desired End State

After implementation:
1. Input order is: Issue URL → Branch (optional) → Mode → Strategy
2. Pressing Enter on branch name triggers auto-derivation by the agent
3. When no issue URL is provided, agent asks "What would you like to work on?" conversationally
4. Agent derives branch from issue title or work description, checking remote conventions
5. WorkflowContext.md includes "Initial Prompt" field when user provides a freeform description
6. All downstream agents receive Initial Prompt via `paw_get_context` (automatic—no code changes needed)

### Verification:
- Start workflow with issue URL, skip branch → agent derives branch from issue title
- Start workflow without issue URL, skip branch → agent asks for description, derives branch from it
- WorkflowContext.md contains "Initial Prompt:" field when description was provided
- Existing behavior unchanged when values are explicitly provided

## What We're NOT Doing

- **Agent behavior changes**: How agents interpret Initial Prompt is out of scope
- **Issue tracker expansion**: Only GitHub and Azure DevOps supported
- **Branch validation changes**: Existing character rules preserved
- **Automatic issue creation**: No creating issues from descriptions
- **VS Code Chat API integration**: Agent asks for description conversationally in the existing chat

## Implementation Approach

The implementation leverages the existing architecture where the agent performs intelligent operations. Changes are minimal in TypeScript code:

1. **Reorder input collection** in `userInput.ts`
2. **Make branch name optional** with "auto" sentinel value
3. **Update template** to instruct agent on:
   - Branch auto-derivation from issue or description
   - Asking for work description when no issue URL
   - Remote branch convention detection
   - Storing Initial Prompt in WorkflowContext.md
4. **Update prompt construction** to handle "auto" branch and new template variables

This approach keeps the extension simple and leverages the agent's conversational capabilities.

## Phase Summary

1. **Phase 1: Input Reordering** - Reorder user input collection to gather issue URL before branch name
2. **Phase 2: Optional Branch Name** - Make branch name optional with "auto" sentinel value for agent derivation
3. **Phase 3: Template Updates** - Update agent prompt template with derivation logic and work description handling

---

## Phase 1: Input Reordering

### Overview
Reorder the user input collection sequence so that issue URL is collected before branch name. This allows the branch input prompt to inform users they can skip for auto-derivation when an issue URL was provided.

### Changes Required:

#### 1. User Input Module
**File**: `src/ui/userInput.ts`
**Changes**: 
- Modify `collectUserInputs()` function to reorder the input sequence
- Move issue URL collection to occur first (before branch name)
- Update function documentation to reflect new order

The current sequence in `collectUserInputs()`:
```
1. Branch name (required)
2. Workflow mode
3. Review strategy
4. Issue URL (optional)
```

New sequence:
```
1. Issue URL (optional)
2. Branch name (required - will become optional in Phase 2)
3. Workflow mode
4. Review strategy
```

**Tests**:
- Unit tests for input ordering are implicit in integration behavior
- Existing validation tests in `src/test/suite/userInput.test.ts` remain valid
- Follow patterns in existing test file for any new test cases

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles without errors: `npm run compile`
- [ ] Existing unit tests pass: `npm test`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Running "PAW: New PAW Workflow" prompts for Issue URL first
- [ ] Pressing Enter on Issue URL allows skipping (existing behavior)
- [ ] Branch name prompt appears after Issue URL
- [ ] Workflow mode and review strategy prompts appear in expected order
- [ ] Cancelling at any stage properly aborts initialization

---

## Phase 2: Optional Branch Name

### Overview
Make the branch name input optional. When the user skips by pressing Enter, pass a sentinel value "auto" to the agent, which will derive the branch name from the issue title or work description.

### Changes Required:

#### 1. User Input Module Updates
**File**: `src/ui/userInput.ts`
**Changes**:
- Modify the branch name `validateInput` callback to allow empty input
- Update `WorkItemInputs` interface JSDoc to document optional branch semantics
- Update prompt text to indicate user can press Enter to auto-derive
- Pass the collected issue URL to the branch input prompt (to customize messaging)

The branch input's `validateInput` function currently requires non-empty:
```typescript
if (!value || value.trim().length === 0) {
  return 'Branch name is required';
}
```

Change to allow empty input (indicating auto-derive):
```typescript
// Empty is valid (triggers auto-derivation)
if (value.trim().length === 0) {
  return undefined;  // Valid - agent will auto-derive
}
```

Update prompt text based on whether issue URL was provided:
- With issue URL: "Enter branch name (or press Enter to auto-derive from issue)"
- Without issue URL: "Enter branch name (or press Enter to auto-derive)"

#### 2. Prompt Construction Updates
**File**: `src/prompts/workflowInitPrompt.ts`
**Changes**:
- Handle empty/undefined branch name by using "auto" sentinel value
- Add `BRANCH_MODE` template variable to indicate derivation mode

When `targetBranch` is empty:
- Set `TARGET_BRANCH` to "auto" in template variables
- Add `BRANCH_MODE: "auto-derive"` variable
- Template will instruct agent on derivation logic

When `targetBranch` is provided:
- Use provided value for `TARGET_BRANCH`
- Add `BRANCH_MODE: "explicit"` variable

**Tests**:
- Add unit tests in `src/test/suite/userInput.test.ts` for empty branch validation
- Add tests for prompt construction with "auto" branch mode
- Follow patterns in `src/test/suite/extension.test.ts` for integration tests

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] Unit tests pass: `npm test`
- [ ] Linting passes: `npm run lint`

#### Manual Verification:
- [ ] Pressing Enter on branch name is accepted (no validation error)
- [ ] Agent prompt contains "auto" when branch is skipped
- [ ] Agent prompt contains explicit branch name when provided
- [ ] Workflow completes when explicit branch name is provided (backwards compatibility)

---

## Phase 3: Template Updates

### Overview
Update the agent prompt template to handle branch auto-derivation, work description collection, remote convention detection, and Initial Prompt storage in WorkflowContext.md.

### Changes Required:

#### 1. Template Variable Interface
**File**: `src/prompts/workflowInitPrompt.ts`
**Changes**:
- Add `BRANCH_MODE` to `PromptVariables` interface
- Add `BRANCH_AUTO_DERIVE_SECTION` for conditional derivation instructions
- Add `WORK_DESCRIPTION_SECTION` for conditional description prompt instructions
- Add `INITIAL_PROMPT_FIELD` for WorkflowContext.md template

Interface additions:
```typescript
interface PromptVariables {
  // ... existing fields ...
  BRANCH_MODE: string;                    // "explicit" or "auto-derive"
  BRANCH_AUTO_DERIVE_SECTION: string;     // Branch derivation instructions (conditional)
  WORK_DESCRIPTION_SECTION: string;       // Work description prompt (conditional)
  INITIAL_PROMPT_FIELD: string;           // For WorkflowContext.md
}
```

#### 2. Conditional Section Construction
**File**: `src/prompts/workflowInitPrompt.ts`
**Changes**:
- Build `BRANCH_AUTO_DERIVE_SECTION` when branch is "auto"
- Build `WORK_DESCRIPTION_SECTION` when no issue URL is provided
- Construct `INITIAL_PROMPT_FIELD` placeholder for template

When branch mode is "auto-derive":
- Include instructions for deriving branch from issue title (if issue URL provided)
- Include instructions for deriving branch from work description (if no issue URL)
- Include remote branch convention detection instructions

When no issue URL provided:
- Include instructions for agent to pause and ask "What would you like to work on?"
- Store user's response as Initial Prompt

#### 3. Prompt Template Updates
**File**: `src/prompts/workItemInitPrompt.template.md`
**Changes**:
- Add new section for branch auto-derivation logic
- Add conditional section for work description collection
- Update WorkflowContext.md template to include Initial Prompt field
- Add instructions for remote branch convention detection

New template sections to add:

**Branch Auto-Derivation Section** (inserted when `BRANCH_MODE` is "auto-derive"):
```markdown
### Branch Auto-Derivation

Since no branch name was provided, derive one:

{{BRANCH_AUTO_DERIVE_SECTION}}
```

**Work Description Collection Section** (inserted when no issue URL):
```markdown
### Collect Work Description

{{WORK_DESCRIPTION_SECTION}}
```

**WorkflowContext.md Template Update**:
```markdown
# WorkflowContext

Work Title: <generated_work_title>
Feature Slug: <generated_feature_slug>
Target Branch: {{TARGET_BRANCH}}
Workflow Mode: {{WORKFLOW_MODE}}
Review Strategy: {{REVIEW_STRATEGY}}
{{CUSTOM_INSTRUCTIONS_FIELD}}{{INITIAL_PROMPT_FIELD}}Issue URL: {{ISSUE_URL_FIELD}}
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

#### 4. Branch Derivation Instructions Content
**Included in template when branch mode is "auto-derive"**

The template should instruct the agent to:

1. **Check if user is already on a feature branch**:
   - Run `git branch --show-current`
   - If current branch looks like a feature branch (not main/master/develop), offer to use it

2. **Derive from Issue Title** (when issue URL provided):
   - Fetch issue title using MCP tools (`mcp_github_issue_read`)
   - Extract issue number from URL
   - Generate branch: `feature/<issue-number>-<slugified-title>`
   - Example: Issue #42 "Add User Authentication" → `feature/42-add-user-authentication`

3. **Derive from Work Description** (when no issue URL):
   - Use the Initial Prompt provided by the user
   - Slugify: lowercase, replace spaces with hyphens, remove special chars
   - Keep reasonably short (3-5 words worth)
   - Add appropriate prefix
   - Example: "Add rate limiting to API" → `feature/api-rate-limiting`

4. **Check Remote Branch Conventions**:
   - Run `git branch -r` to list remote branches
   - Analyze naming patterns (feature/, bugfix/, fix/, etc.)
   - Use detected convention or fall back to `feature/` or `fix/` based on description

5. **Check for Conflicts**:
   - Compare derived name against remote branches
   - If conflict exists, append suffix (-2, -3, etc.)

#### 5. Work Description Instructions Content
**Included in template when no issue URL is provided**

The template should instruct the agent to:

1. **Pause and ask the user**: "What would you like to work on?"
2. **Wait for user response** in the chat
3. **Capture the response** as the Initial Prompt
4. **Use the description** for:
   - Deriving branch name (if branch was skipped)
   - Deriving Work Title
   - Storing in WorkflowContext.md

**Tests**:
- Add test in `src/test/suite/extension.test.ts` for template variable substitution
- Verify template compiles with new variables
- Follow test patterns in existing test suite

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] Unit tests pass: `npm test`
- [ ] Linting passes: `npm run lint`
- [ ] Template loads without errors

#### Manual Verification:
- [ ] With issue URL + skip branch: Agent derives branch from issue title
- [ ] Without issue URL + skip branch: Agent asks "What would you like to work on?"
- [ ] Agent uses work description to derive branch and Work Title
- [ ] WorkflowContext.md contains "Initial Prompt:" field when description provided
- [ ] Agent checks remote branches for naming conventions
- [ ] Agent handles branch naming conflicts with suffixes
- [ ] All existing scenarios continue to work (explicit branch, explicit issue URL)

---

## Cross-Phase Testing Strategy

### Integration Tests:
- End-to-end flow: Issue URL provided, branch auto-derived, workflow initializes
- End-to-end flow: No issue URL, work description provided, branch auto-derived
- End-to-end flow: All inputs explicitly provided (backwards compatibility)

### Manual Testing Steps:
1. Run "PAW: New PAW Workflow" with a valid GitHub issue URL
2. Press Enter to skip branch name
3. Verify agent fetches issue title and derives branch
4. Verify WorkflowContext.md is created with correct fields

5. Run "PAW: New PAW Workflow" and press Enter to skip issue URL
6. Press Enter to skip branch name
7. Verify agent asks "What would you like to work on?"
8. Provide a description and verify:
   - Branch is derived from description
   - Work Title is derived from description
   - Initial Prompt appears in WorkflowContext.md

9. Run "PAW: New PAW Workflow" with explicit values for all inputs
10. Verify no auto-derivation occurs and provided values are used

## Performance Considerations

- Issue title fetch (by agent) should timeout gracefully if network is slow
- Remote branch listing should have reasonable timeout
- Agent should provide feedback during derivation operations

## Migration Notes

No migration needed—changes are additive and backwards compatible:
- Existing workflows with explicit inputs continue to work
- New "Initial Prompt" field is optional in WorkflowContext.md
- Agents without updated instructions will simply not use Initial Prompt

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/121
- Design Clarifications: Issue #121 comment on branch derivation approach
- Spec: `.paw/work/workflow-init-improvements-2/Spec.md`
- Research: `.paw/work/workflow-init-improvements-2/SpecResearch.md`, `.paw/work/workflow-init-improvements-2/CodeResearch.md`
