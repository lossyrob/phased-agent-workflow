# Workflow Initialization Improvements

## Overview

The workflow initialization improvements enhance the `PAW: New PAW Workflow` command to provide a more intuitive and streamlined experience when starting new PAW workflows. The changes address a fundamental UX issue: previously, developers were asked for a branch name first—before specifying what they were working on—which forced unnecessary context-switching at the moment they wanted to get started quickly.

The improved workflow reverses this logic by collecting the issue URL first (providing context about what's being built), then making the branch name optional with automatic derivation from either the issue title or a freeform work description. This reduces friction significantly: a developer linking to GitHub issue #42 titled "Add user authentication" can skip the branch input entirely and have the system derive `feature/42-add-user-authentication` automatically.

For developers without a tracked issue, the workflow now captures intent directly. When the user skips both the issue URL and branch name, the agent prompts them to describe what they want to build. This description becomes the "Initial Prompt" stored in WorkflowContext.md, providing all downstream agents with context about the work being performed.

## Architecture and Design

### High-Level Architecture

The implementation follows PAW's established architecture where the VS Code extension is a "thin layer" that collects minimal inputs, while agents perform intelligent operations like branch derivation and convention detection. This design keeps the extension simple and leverages the agent's conversational capabilities.

The changes span three components:
1. **User Input Module** (`src/ui/userInput.ts`) - Collects user inputs in the new order and allows empty branch names
2. **Prompt Construction** (`src/prompts/workflowInitPrompt.ts`) - Builds conditional template sections for branch derivation and work description collection
3. **Prompt Template** (`src/prompts/workItemInitPrompt.template.md`) - Contains new template sections that instruct the agent on derivation logic

### Design Decisions

**Decision: Agent handles all intelligent derivation logic, not the extension**

Rationale: The extension could theoretically implement branch derivation by fetching issue titles and slugifying them. However, this would require embedding GitHub/Azure DevOps API calls, URL parsing, remote branch convention detection, and naming conflict resolution into the TypeScript extension code. Instead, the agent already has access to MCP tools for fetching issue data and running git commands. Delegating derivation to the agent keeps the extension simple (collecting inputs only) and leverages capabilities the agent already possesses.

**Decision: Use sentinel value "auto" for auto-derived branches**

Rationale: The template system uses placeholder substitution (`{{TARGET_BRANCH}}`), and downstream template logic needs to distinguish between "user explicitly provided a branch" and "user wants auto-derivation." Rather than adding separate boolean flags, using the sentinel value "auto" allows a single field to convey both the derivation mode and the eventual branch name (once derived). When `TARGET_BRANCH` equals "auto", the agent knows to derive the branch; otherwise, it uses the provided value directly.

**Decision: Store work description as "Initial Prompt" field in WorkflowContext.md**

Rationale: When no issue URL is provided, the user's description of their work is valuable context for downstream agents. By storing it in WorkflowContext.md (rather than passing it through transient variables), the description persists across agent invocations and is available to any agent that calls `paw_get_context`. The name "Initial Prompt" was chosen to distinguish it from the issue title or branch name while clearly indicating its origin as user-provided input.

**Decision: Ask for work description conversationally rather than through VS Code input box**

Rationale: When users skip the issue URL, they're indicating they don't have a tracked work item and want to describe their task. A rich freeform description is better captured through conversational interaction in GitHub Copilot chat (where users can provide context, explain goals, and iterate) than through a single-line VS Code input box. The agent asks "What would you like to work on?" and captures the response naturally.

**Decision: Branch derivation includes current branch checking and remote convention detection**

Rationale: Users may already be on an appropriate feature branch when starting a workflow. Rather than blindly creating a new branch, the agent checks the current branch and offers to use it if appropriate. Similarly, projects have naming conventions (feature/, bugfix/, fix/, feat/) that vary. By analyzing remote branches before deriving a name, the agent produces branch names that fit existing project patterns.

### Integration Points

**Workflow Initialization Command** - The `PAW: New PAW Workflow` command calls `collectUserInputs()` to gather inputs in the new order (issue URL → branch → mode → strategy), then passes these to `constructAgentPrompt()` which builds the agent instruction prompt with conditional sections based on what was provided.

**paw_get_context Tool** - Downstream agents receive the Initial Prompt field (when present) through the Context Tool. No changes were required to the Context Tool itself since it returns raw WorkflowContext.md content and agents parse what they need.

**Agent Template Files** - The workflow initialization agent (invoked through the generated prompt) receives the new template sections (`{{BRANCH_AUTO_DERIVE_SECTION}}`, `{{WORK_DESCRIPTION_SECTION}}`, `{{INITIAL_PROMPT_FIELD}}`) which provide detailed instructions for derivation logic.

## User Guide

### Prerequisites

- VS Code with PAW Workflow extension installed
- Git repository
- GitHub Copilot extension installed and active

### Basic Usage: Starting a Workflow with an Issue

1. Open a git repository in VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "PAW: New PAW Workflow"
4. **Issue URL prompt** (first): Enter your GitHub issue or Azure DevOps work item URL
5. **Branch name prompt**: Press Enter to auto-derive from issue, or enter a custom branch name
6. **Workflow mode**: Select Full, Minimal, or Custom
7. **Review strategy**: Select PRs or Local

When you skip the branch name with an issue URL provided, the agent will:
- Fetch the issue title
- Check current branch (offer to use it if already on a feature branch)
- Check remote branches for naming conventions
- Derive a branch like `feature/42-add-user-authentication`

### Basic Usage: Starting a Workflow Without an Issue

1. Open a git repository in VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "PAW: New PAW Workflow"
4. **Issue URL prompt**: Press Enter to skip
5. **Branch name prompt**: Press Enter to auto-derive
6. **Workflow mode**: Select Full, Minimal, or Custom
7. **Review strategy**: Select PRs or Local

When you skip both the issue URL and branch name:
1. The agent will ask: "What would you like to work on?"
2. Describe your task (e.g., "Add rate limiting to API endpoints to prevent abuse")
3. The agent derives:
   - **Branch**: `feature/api-rate-limiting`
   - **Work Title**: "API Rate Limiting"
   - **Initial Prompt**: Your description (stored in WorkflowContext.md)

### Configuration

The new fields in WorkflowContext.md:

**Initial Prompt** (optional): User's work description when no issue URL was provided. Stored as free-form text that downstream agents can reference for context about what the user wants to build.

Example WorkflowContext.md with Initial Prompt:
```markdown
# WorkflowContext

Work Title: API Rate Limiting
Feature Slug: api-rate-limiting
Target Branch: feature/api-rate-limiting
Workflow Mode: full
Review Strategy: local
Initial Prompt: Add rate limiting to API endpoints to prevent abuse
Issue URL: none
Remote: origin
```

## Technical Reference

### Input Collection Order

The `collectUserInputs()` function in `src/ui/userInput.ts` now collects inputs in this order:
1. Issue URL (optional) - validates GitHub or Azure DevOps format if provided
2. Branch name (optional) - empty triggers auto-derivation
3. Workflow mode (required) - full, minimal, or custom
4. Review strategy (required, but auto-selected for minimal mode)

### Branch Validation Changes

The branch name input validation was changed to allow empty values:

**Before**: Empty branch name returned error "Branch name is required"
**After**: Empty branch name is valid and triggers auto-derivation by agent

When a branch is provided, existing character validation still applies (alphanumeric, hyphens, underscores, slashes only).

### Template Variables

Three new template variables were added to `PromptVariables` interface:

| Variable | Type | Description |
|----------|------|-------------|
| `BRANCH_MODE` | string | "explicit" when user provided branch, "auto-derive" when empty |
| `BRANCH_AUTO_DERIVE_SECTION` | string | Derivation instructions (conditional) |
| `WORK_DESCRIPTION_SECTION` | string | Work description prompt instructions (conditional) |
| `INITIAL_PROMPT_FIELD` | string | WorkflowContext.md field placeholder |

### Prompt Construction Logic

In `constructAgentPrompt()`:
- Empty branch → `BRANCH_MODE: "auto-derive"`, `TARGET_BRANCH: "auto"`
- Provided branch → `BRANCH_MODE: "explicit"`, `TARGET_BRANCH: <branch>`
- No issue URL → `WORK_DESCRIPTION_SECTION` populated, `INITIAL_PROMPT_FIELD` set
- Issue URL provided → `WORK_DESCRIPTION_SECTION` empty, `INITIAL_PROMPT_FIELD` empty

### Branch Auto-Derivation Instructions

When `BRANCH_MODE` is "auto-derive", the template instructs the agent to:

1. **Check current branch first** - If already on a feature branch, offer to use it
2. **Derive from issue title** (if URL provided):
   - Fetch issue title using MCP tools
   - Extract issue number from URL
   - Generate: `feature/<number>-<slugified-title>`
3. **Derive from work description** (if no URL):
   - Use Initial Prompt captured from user
   - Slugify description to 3-5 words
   - Apply appropriate prefix based on content
4. **Check remote branch conventions** - Analyze existing remote branches for naming patterns
5. **Check for conflicts** - Append suffix (-2, -3) if derived name conflicts

### Error Handling

**Network failures during issue fetch**: Agent falls back to branch-based derivation with user notification

**Branch naming conflicts**: Agent appends numeric suffix (-2, -3, etc.) until unique

**Cancellation**: Pressing Escape at any input stage cancels workflow initialization with no partial state

## Edge Cases and Limitations

**Extremely short work descriptions**: A description like "fix bug" will derive to something like `fix/bug`. The agent accepts these but produces simple branch names.

**Remote branch check failure**: If `git branch -r` fails, the agent proceeds with standard prefix conventions (feature/ for features, fix/ for bugs) and logs a warning.

**Issue fetch timeout**: The agent should timeout gracefully (implementation depends on MCP tool behavior) if network is slow. Users can cancel and provide an explicit branch name.

**Multiple feature branches exist with similar names**: Auto-derivation may produce branches like `feature/42-add-auth-2`, `feature/42-add-auth-3`. Users who prefer cleaner names should provide explicit branch names.

**Current branch is main/master/develop**: The agent won't offer to use these branches and will proceed with derivation.

## Testing Guide

### How to Test This Work

**Test 1: Input Order Verification**
1. Run "PAW: New PAW Workflow"
2. **Verify**: First prompt asks for issue URL (not branch name)
3. **Verify**: After issue URL, branch name prompt appears
4. **Verify**: Workflow mode and review strategy follow in order

**Test 2: Auto-Derive from Issue**
1. Run "PAW: New PAW Workflow"
2. Enter a valid GitHub issue URL (e.g., `https://github.com/owner/repo/issues/123`)
3. Press Enter to skip branch name
4. Select workflow mode and strategy
5. **Verify**: Agent fetches issue title and proposes derived branch
6. **Verify**: Derived branch includes issue number prefix

**Test 3: Auto-Derive from Description**
1. Run "PAW: New PAW Workflow"
2. Press Enter to skip issue URL
3. Press Enter to skip branch name
4. Select workflow mode and strategy
5. **Verify**: Agent asks "What would you like to work on?"
6. Provide description: "Add rate limiting to API endpoints"
7. **Verify**: Agent derives branch from description
8. **Verify**: WorkflowContext.md contains "Initial Prompt:" field

**Test 4: Explicit Values (Backwards Compatibility)**
1. Run "PAW: New PAW Workflow"
2. Enter issue URL (any valid format)
3. Enter explicit branch name (e.g., `feature/custom-branch`)
4. Select mode and strategy
5. **Verify**: Agent uses provided branch without derivation
6. **Verify**: No auto-derivation prompts appear

**Test 5: Dynamic Branch Prompt Text**
1. Run "PAW: New PAW Workflow"
2. Enter an issue URL
3. **Verify**: Branch prompt says "Enter branch name (or press Enter to auto-derive from issue)"
4. Cancel and repeat
5. Skip issue URL (press Enter)
6. **Verify**: Branch prompt says "Enter branch name (or press Enter to auto-derive)"

### Automated Test Verification

Run the test suite:
```bash
npm test
```

**Expected**: All 93 tests pass, including new tests for:
- Empty branch validation acceptance
- Branch mode handling (explicit vs auto-derive)
- Branch auto-derivation section generation (with/without issue URL)
- Work description section generation
- Initial Prompt field generation

## Migration and Compatibility

### Backwards Compatibility

All existing workflows continue to function unchanged:
- **Explicit values work**: Providing explicit branch names and issue URLs produces identical behavior to before
- **Input validation unchanged**: Character restrictions on branch names still apply when values are provided
- **WorkflowContext.md format preserved**: Initial Prompt is an optional addition, not a required field

### New WorkflowContext.md Fields

**Initial Prompt** (optional): Only appears when user skipped issue URL and provided a work description. Downstream agents can access this via `paw_get_context` but are not required to use it. Agents without updated instructions will simply ignore the field.

### Agent Compatibility

The workflow initialization agent receives new template sections with derivation instructions. Agents that don't call workflow initialization are unaffected. The changes are additive—no existing agent behavior is modified.

## References

### Specification and Planning Artifacts
- **Specification**: `.paw/work/workflow-init-improvements-2/Spec.md`
- **Implementation Plan**: `.paw/work/workflow-init-improvements-2/ImplementationPlan.md`
- **Spec Research**: `.paw/work/workflow-init-improvements-2/SpecResearch.md`
- **Code Research**: `.paw/work/workflow-init-improvements-2/CodeResearch.md`

### Source Files Modified
- `src/ui/userInput.ts` - Input collection order and branch validation
- `src/prompts/workflowInitPrompt.ts` - Prompt construction with conditional sections
- `src/prompts/workItemInitPrompt.template.md` - Template with derivation instructions

### Test Files
- `src/test/suite/userInput.test.ts` - Empty branch validation test
- `src/test/suite/customInstructions.test.ts` - Branch mode and template section tests

### Related Issue
- GitHub Issue #121: https://github.com/lossyrob/phased-agent-workflow/issues/121
