---
date: 2025-12-03T15:54:42-05:00
git_commit: 4073a99ce7c99874703edd06e9e54528c833a67e
branch: fix/new-paw-workflow-improvements
repository: phased-agent-workflow
topic: "Workflow Init Improvements - Implementation Research"
tags: [research, codebase, workflow-initialization, user-input, branch-derivation, contextTool]
status: complete
last_updated: 2025-12-03
---

# Research: Workflow Init Improvements - Implementation Research

**Date**: 2025-12-03 15:54:42 EST  
**Git Commit**: 4073a99ce7c99874703edd06e9e54528c833a67e  
**Branch**: fix/new-paw-workflow-improvements  
**Repository**: phased-agent-workflow

## Research Question

Document the codebase implementation for the workflow initialization system to support:
1. Reordering input collection (issue URL before branch name)
2. Branch name auto-derivation from issue titles or work descriptions
3. Freeform work description capture when no issue is linked
4. Remote branch convention checking
5. Enhanced WorkflowContext.md with "Initial Prompt" field

## Summary

The PAW workflow initialization system consists of four interconnected components:

1. **Command Handler** (`src/commands/initializeWorkItem.ts`): Orchestrates the workflow by validating the workspace, collecting user inputs, constructing an agent prompt, and invoking GitHub Copilot.

2. **User Input Collection** (`src/ui/userInput.ts`): Sequential input collection using VS Code's `showInputBox` and `showQuickPick` APIs. Currently collects: branch name → workflow mode → review strategy → issue URL.

3. **Prompt Template System** (`src/prompts/workflowInitPrompt.ts` + template): Template-based prompt construction with variable substitution. Includes conditional logic for issue URL presence affecting work title derivation strategy.

4. **Context Tool** (`src/tools/contextTool.ts`): Returns raw WorkflowContext.md content to downstream agents wrapped in XML-style tags. Adding new fields to WorkflowContext.md automatically surfaces them to agents.

5. **Git Validation** (`src/git/validation.ts`): Minimal git operations limited to repository validation and status checking. No existing remote branch listing functionality.

---

## Detailed Findings

### 1. Command Handler: initializeWorkItem.ts

The command handler serves as the entry point for "PAW: New PAW Workflow".

**File**: [`src/commands/initializeWorkItem.ts`](https://github.com/lossyrob/phased-agent-workflow/blob/4073a99ce7c99874703edd06e9e54528c833a67e/src/commands/initializeWorkItem.ts)

**Execution Flow** (lines 33-99):
1. Validates workspace folder exists (line 43)
2. Validates git repository via `validateGitRepository()` (line 53)
3. Checks for custom instructions at `.paw/instructions/init-instructions.md` (lines 62-71)
4. Collects user inputs via `collectUserInputs()` (line 75)
5. Constructs agent prompt via `constructAgentPrompt()` (line 88)
6. Opens new chat session and invokes agent (lines 95-100)

**Key Integration Points**:
- **Input Collection Entry**: `collectUserInputs(outputChannel)` at line 75 returns `WorkItemInputs | undefined`
- **Prompt Construction**: `constructAgentPrompt(targetBranch, workflowMode, reviewStrategy, issueUrl, workspacePath)` at line 88
- All collected inputs pass through to the prompt constructor

**Current Input Sequence**:
```
Branch Name → Workflow Mode → Review Strategy → Issue URL
```

**For Reordering**: The input collection order is determined by `collectUserInputs()` in `userInput.ts`. The command handler simply passes through whatever `collectUserInputs()` returns.

---

### 2. User Input Collection: userInput.ts

**File**: [`src/ui/userInput.ts`](https://github.com/lossyrob/phased-agent-workflow/blob/4073a99ce7c99874703edd06e9e54528c833a67e/src/ui/userInput.ts)

**Core Types** (lines 1-60):
```typescript
// Line 8-14
export type WorkflowMode = 'full' | 'minimal' | 'custom';
export type ReviewStrategy = 'prs' | 'local';

// Line 25-31 - WorkflowModeSelection
export interface WorkflowModeSelection {
  mode: WorkflowMode;
  customInstructions?: string;
}

// Line 38-56 - WorkItemInputs
export interface WorkItemInputs {
  targetBranch: string;
  workflowMode: WorkflowModeSelection;
  reviewStrategy: ReviewStrategy;
  issueUrl?: string;
}
```

**Validation Functions**:

- **Branch Name Validation** (lines 63-65):
  ```typescript
  export function isValidBranchName(value: string): boolean {
    return /^[a-zA-Z0-9/_-]+$/.test(value);
  }
  ```
  Allows: letters, digits, `/`, `_`, `-`

- **Issue URL Validation** (lines 85-89):
  ```typescript
  const githubPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/;
  const azureDevOpsPattern = /^https:\/\/dev\.azure\.com\/[^/]+\/[^/]+\/_workitems\/edit\/\d+$/;
  ```

**Main Input Collection Function** (lines 199-253):

`collectUserInputs()` collects inputs sequentially:

1. **Target Branch** (lines 200-216):
   - Uses `vscode.window.showInputBox()`
   - Validation: Required, must pass `isValidBranchName()`
   - Returns `undefined` on cancel
   
2. **Workflow Mode** (lines 220-221):
   - Calls `collectWorkflowMode()` (lines 97-149)
   - Quick pick with 'Full', 'Minimal', 'Custom' options
   - Custom mode prompts for additional instructions
   
3. **Review Strategy** (lines 224-227):
   - Calls `collectReviewStrategy()` (lines 165-197)
   - Auto-selects 'local' for minimal mode
   - Quick pick with 'PRs', 'Local' options for other modes
   
4. **Issue URL** (lines 229-247):
   - Optional (empty string allowed)
   - Validates format if provided
   - Returns `undefined` on cancel (not skip)

**Branch Name Input Details** (lines 200-216):
```typescript
const targetBranch = await vscode.window.showInputBox({
  prompt: 'Enter target branch name (e.g., feature/my-feature)',
  placeHolder: 'feature/my-feature',
  validateInput: (value: string) => {
    if (!value || value.trim().length === 0) {
      return 'Branch name is required';  // Currently required
    }
    if (!isValidBranchName(value)) {
      return 'Branch name contains invalid characters';
    }
    return undefined;
  }
});
```

**For Auto-Derivation**: The current validation requires a non-empty branch name. To support skipping, the validation logic at line 203 would need modification to allow empty input when branch auto-derivation is enabled.

---

### 3. Prompt Template System

**Files**:
- [`src/prompts/workflowInitPrompt.ts`](https://github.com/lossyrob/phased-agent-workflow/blob/4073a99ce7c99874703edd06e9e54528c833a67e/src/prompts/workflowInitPrompt.ts)
- [`src/prompts/workItemInitPrompt.template.md`](https://github.com/lossyrob/phased-agent-workflow/blob/4073a99ce7c99874703edd06e9e54528c833a67e/src/prompts/workItemInitPrompt.template.md)

**Template Variables** (workflowInitPrompt.ts lines 18-39):
```typescript
interface PromptVariables {
  TARGET_BRANCH: string;
  WORKFLOW_MODE: string;
  REVIEW_STRATEGY: string;
  CUSTOM_INSTRUCTIONS_SECTION: string;
  CUSTOM_INSTRUCTIONS_FIELD: string;
  ISSUE_URL: string;
  ISSUE_URL_FIELD: string;
  WORKSPACE_PATH: string;
  WORK_TITLE_STRATEGY: string;
  WORK_TITLE_FALLBACK_INDICATOR: string;
  CUSTOM_INSTRUCTIONS: string;
}
```

**Work Title Strategy Construction** (lines 111-122):
```typescript
const workTitleStrategy = issueUrl
  ? `**Preferred - Fetch From Issue:**
- Retrieve the issue or work item title from ${issueUrl}
- Use the title as the Work Title (shorten for clarity if necessary)
- If the fetch fails, fall back to the branch-based generation rules below

`
  : '';
```

When issue URL is provided, the template includes instructions to fetch the issue title. Otherwise, branch-based derivation is used exclusively.

**Branch-Based Work Title Generation** (template lines 17-25):
```markdown
**Branch-Based Generation{{WORK_TITLE_FALLBACK_INDICATOR}}:**
- Remove standard prefixes (feature/, bugfix/, hotfix/)
- Split on hyphens, underscores, and slashes
- Capitalize first letter of each word
- Keep concise (ideally 2-4 words)
- Example: feature/user-auth-system → User Auth System
```

**WorkflowContext.md Template** (template lines 45-56):
```markdown
# WorkflowContext

Work Title: <generated_work_title>
Feature Slug: <generated_feature_slug>
Target Branch: {{TARGET_BRANCH}}
Workflow Mode: {{WORKFLOW_MODE}}
Review Strategy: {{REVIEW_STRATEGY}}
{{CUSTOM_INSTRUCTIONS_FIELD}}Issue URL: {{ISSUE_URL_FIELD}}
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

**For New "Initial Prompt" Field**: Adding a new field to WorkflowContext.md requires:
1. New template variable in `PromptVariables` interface
2. Conditional construction in `constructAgentPrompt()`
3. Placeholder in the template file

---

### 4. Context Tool: contextTool.ts

**File**: [`src/tools/contextTool.ts`](https://github.com/lossyrob/phased-agent-workflow/blob/4073a99ce7c99874703edd06e9e54528c833a67e/src/tools/contextTool.ts)

**Key Behavior**: The context tool returns raw WorkflowContext.md content without parsing. This means any new fields added to WorkflowContext.md are automatically available to agents.

**WorkflowContext Loading** (lines 62-77):
```typescript
export function loadWorkflowContext(filePath: string): InstructionStatus {
  try {
    if (!fs.existsSync(filePath)) {
      return { exists: false, content: '' };
    }
    const fileContent = normalizeContent(fs.readFileSync(filePath, 'utf-8'));
    return { exists: true, content: fileContent };
  } catch (error) {
    // Error handling...
  }
}
```

**Response Formatting** (lines 190-220):
```typescript
export function formatContextResponse(result: ContextResult): string {
  // Wraps workflow_context in:
  // <workflow_context>
  // ```markdown
  // [raw content]
  // ```
  // </workflow_context>
}
```

**For "Initial Prompt" Field**: No changes needed to contextTool.ts. Adding the field to WorkflowContext.md during initialization automatically surfaces it to all downstream agents through `paw_get_context`.

---

### 5. Git Validation Module

**File**: [`src/git/validation.ts`](https://github.com/lossyrob/phased-agent-workflow/blob/4073a99ce7c99874703edd06e9e54528c833a67e/src/git/validation.ts)

**Current Functions**:

1. **Repository Validation** (lines 16-24):
   ```typescript
   export async function validateGitRepository(workspacePath: string): Promise<boolean> {
     try {
       await execAsync('git rev-parse --git-dir', { cwd: workspacePath });
       return true;
     } catch {
       return false;
     }
   }
   ```

2. **Uncommitted Changes Check** (lines 38-47):
   ```typescript
   export async function hasUncommittedChanges(workspacePath: string): Promise<boolean> {
     try {
       const { stdout } = await execAsync('git status --porcelain', { cwd: workspacePath });
       return stdout.trim().length > 0;
     } catch (error) {
       // ...
     }
   }
   ```

**For Remote Branch Checking**: The module uses `child_process.exec` via `promisify(exec)` (lines 1-5). New functions for remote branch listing would follow the same pattern:
- `git branch -r` for listing remote branches
- `git ls-remote --heads origin` for listing remote refs
- Pattern analysis on returned branch names to detect conventions

---

### 6. Custom Instructions System

**File**: [`src/prompts/customInstructions.ts`](https://github.com/lossyrob/phased-agent-workflow/blob/4073a99ce7c99874703edd06e9e54528c833a67e/src/prompts/customInstructions.ts)

This module handles loading custom instructions from `.paw/instructions/init-instructions.md` for workflow initialization.

**Loading Function** (lines 17-45):
```typescript
export function loadCustomInstructions(
  workspacePath: string,
  relativePath: string
): CustomInstructions {
  // Returns { exists, content, error? }
}
```

**Formatting Function** (lines 53-65):
```typescript
export function formatCustomInstructions(instructions: CustomInstructions): string {
  // Returns Markdown section for prompt injection
  // Empty string if no instructions
}
```

**Integration Point**: Custom instructions are loaded in `constructAgentPrompt()` at line 83 of `workflowInitPrompt.ts` and injected into the template via the `CUSTOM_INSTRUCTIONS` variable.

---

## Code References

| File | Lines | Description |
|------|-------|-------------|
| `src/commands/initializeWorkItem.ts` | 33-99 | Main command handler orchestrating workflow initialization |
| `src/commands/initializeWorkItem.ts` | 75 | Entry point for input collection |
| `src/ui/userInput.ts` | 63-65 | Branch name validation regex |
| `src/ui/userInput.ts` | 85-89 | Issue URL validation patterns |
| `src/ui/userInput.ts` | 199-253 | Main `collectUserInputs()` function with input sequence |
| `src/ui/userInput.ts` | 200-216 | Target branch input box configuration |
| `src/ui/userInput.ts` | 229-247 | Issue URL input box configuration |
| `src/prompts/workflowInitPrompt.ts` | 18-39 | Template variable interface |
| `src/prompts/workflowInitPrompt.ts` | 111-122 | Work title strategy construction |
| `src/prompts/workItemInitPrompt.template.md` | 17-25 | Branch-based work title generation rules |
| `src/prompts/workItemInitPrompt.template.md` | 45-56 | WorkflowContext.md template structure |
| `src/tools/contextTool.ts` | 62-77 | Raw WorkflowContext.md loading |
| `src/tools/contextTool.ts` | 190-220 | Context response formatting |
| `src/git/validation.ts` | 1-47 | Git validation utilities (entire file) |
| `src/prompts/customInstructions.ts` | 17-45 | Custom instructions loading |

---

## Architecture Documentation

### Input Collection Sequence

Current flow in `collectUserInputs()`:
```
1. showInputBox(branch) → Required validation
2. collectWorkflowMode() → Quick pick
3. collectReviewStrategy() → Quick pick (auto for minimal)
4. showInputBox(issueUrl) → Optional, format validation if provided
```

### Template Variable Flow

```
User Inputs → constructAgentPrompt() → substituteVariables() → Agent Prompt
                    ↓
             loadCustomInstructions()
```

### WorkflowContext.md Consumption

```
initializeWorkItem → Agent creates WorkflowContext.md
                              ↓
         Downstream agents → paw_get_context() → loadWorkflowContext()
                              ↓
                     Raw content in <workflow_context> tags
```

### Validation Patterns

- **Branch names**: `/^[a-zA-Z0-9/_-]+$/` - alphanumeric plus `/`, `_`, `-`
- **GitHub issues**: `/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/`
- **Azure DevOps**: `/^https:\/\/dev\.azure\.com\/[^/]+\/[^/]+\/_workitems\/edit\/\d+$/`

---

## Open Questions

1. **VS Code Chat Panel API**: The spec mentions prompting for freeform descriptions in the chat panel. The current implementation uses `vscode.window.showInputBox()`. Investigation needed on whether VS Code's chat API supports mid-flow user prompts or if input boxes are the only option.

2. **Azure DevOps MCP Tools**: The template references Azure DevOps work item URLs for fetching titles. Whether corresponding MCP tools exist (analogous to `mcp_github_issue_read` for GitHub) needs verification during implementation.

3. **Slug Derivation Logic**: The template describes slug derivation rules (lowercase, hyphens, uniqueness checking) but this is agent-executed. For branch auto-derivation from descriptions, similar logic would need to be implemented or the agent instructed to derive branch names.
