# Implementation Plan: Update VS Code Extension for PR 34 Changes

## Overview

This plan updates the VS Code extension code to align with the platform-neutral changes introduced in PR 34 (Azure DevOps support). The extension currently uses "GitHub Issue" terminology and only validates GitHub issue URL formats. After PR 34, PAW uses "Issue URL" to support both GitHub Issues and Azure DevOps Work Items.

## Context

**PR 34 Changes:**
- WorkflowContext.md field name changed from "GitHub Issue" to "Issue URL" (with backward compatibility)
- Platform-neutral language throughout PAW (issue/work item instead of GitHub Issue)
- Support for both GitHub Issue URLs and Azure DevOps Work Item URLs
- Removed explicit platform references from agent instructions

**Current Extension Code:**
- Uses "GitHub Issue" terminology in code, comments, and prompts
- Validates only GitHub issue URL format (github.com/owner/repo/issues/123)
- UI prompts refer to "GitHub issue URL"
- Template generates WorkflowContext.md with "GitHub Issue:" field

**Required Updates:**
1. Rename all references from "GitHub Issue" to "Issue URL" (or "issue URL" in lowercase contexts)
2. Update URL validation to accept both GitHub and Azure DevOps work item URLs
3. Update template to generate "Issue URL:" field in WorkflowContext.md
4. Update comments and documentation to reflect platform-neutral terminology

## Scope

### In Scope
- Update TypeScript interface field names (githubIssueUrl → issueUrl)
- Update URL validation function to support both platforms
- Update UI prompts to use platform-neutral language
- Update template file to use "Issue URL" field name
- Update all comments and documentation strings
- Update test file to cover both URL formats

### Out of Scope
- No changes to functionality or behavior (still optional field, still validates URL format)
- No breaking changes to existing code structure
- No new features beyond platform support

## Implementation Phases

### Phase 1: Core Type and Interface Updates

Update the core TypeScript interfaces and types to use platform-neutral naming.

#### Changes Required

**File: `vscode-extension/src/ui/userInput.ts`**

1. Update `WorkItemInputs` interface:
```typescript
export interface WorkItemInputs {
  /** Git branch name for the work item (e.g., "feature/my-feature") */
  targetBranch: string;
  
  /** Optional issue or work item URL to associate with the work item */
  issueUrl?: string;
}
```

2. Rename validation function and update to support both platforms:
```typescript
/**
 * Determine whether the provided value matches expected issue URL formats.
 * Supports:
 * - GitHub Issues: https://github.com/owner/repo/issues/123
 * - Azure DevOps Work Items: https://dev.azure.com/org/project/_workitems/edit/123
 */
export function isValidIssueUrl(value: string): boolean {
  const githubPattern = /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/;
  const azureDevOpsPattern = /^https:\/\/dev\.azure\.com\/[^/]+\/[^/]+\/_workitems\/edit\/\d+$/;
  return githubPattern.test(value) || azureDevOpsPattern.test(value);
}
```

3. Update `collectUserInputs` function:
   - Change prompt text from "Enter GitHub issue URL..." to "Enter issue or work item URL..."
   - Change placeholder from GitHub example to show both formats
   - Update validation error message to mention both platforms
   - Update variable name from `githubIssueUrl` to `issueUrl`
   - Update comments referencing "GitHub issue URL"

**File: `vscode-extension/src/commands/initializeWorkItem.ts`**

1. Update JSDoc comment on line 14:
```typescript
 * 3. Collects user inputs (target branch, optional issue URL)
```

2. Update output logging on line 73:
```typescript
      outputChannel.appendLine(`[INFO] Issue URL: ${inputs.issueUrl}`);
```

#### Success Criteria

- [x] `WorkItemInputs.issueUrl` field exists and is optional
- [x] `isValidIssueUrl()` function validates both GitHub and Azure DevOps URLs
- [x] No references to "githubIssueUrl" remain in userInput.ts
- [x] Comments and JSDoc updated to platform-neutral language
- [x] Code compiles without errors

**Status:** Completed 2025-11-03

**Notes:** Updated `userInput.ts` to adopt platform-neutral naming, expanded URL validation to accept GitHub and Azure DevOps formats, and refreshed the initialization command logging to use the new property. Renamed the validation helper to `isValidIssueUrl` and adjusted tests to reference the new export.

**Verification:** `npm run compile`, `npm test`

---

### Phase 2: Prompt Template and Agent Prompt Updates

Update the template file and agent prompt construction logic to use "Issue URL" field name and support both platforms.

#### Changes Required

**File: `vscode-extension/src/prompts/workItemInitPrompt.template.md`**

1. Update parameters section (line 8):
```markdown
- **Issue URL**: {{ISSUE_URL}}
```

2. Update WorkflowContext.md template (line 87):
```markdown
Issue URL: {{ISSUE_URL_FIELD}}
```

3. Update field definitions section (line 98):
```markdown
- **Issue URL** (Optional): URL to associated issue or work item (GitHub Issue or Azure DevOps Work Item), or "none" if not provided
```

4. Update error handling section (line 157):
```markdown
- **Network failures**: If the issue cannot be fetched, fall back to branch-derived titles and inform the user
```

**File: `vscode-extension/src/prompts/agentPrompt.ts`**

1. Update `PromptVariables` interface:
```typescript
interface PromptVariables {
  TARGET_BRANCH: string;
  ISSUE_URL: string;
  ISSUE_URL_FIELD: string;
  WORKSPACE_PATH: string;
  WORK_TITLE_STRATEGY: string;
  WORK_TITLE_FALLBACK_INDICATOR: string;
  CUSTOM_INSTRUCTIONS: string;
}
```

2. Update `constructAgentPrompt` function signature:
```typescript
export function constructAgentPrompt(
  targetBranch: string,
  issueUrl: string | undefined,
  workspacePath: string
): string
```

3. Update work title strategy comment and text (lines 61-66):
```typescript
  // Build Work Title strategy section based on whether issue URL is provided
  const workTitleStrategy = issueUrl
    ? `**Preferred - Fetch From Issue:**
- Retrieve the issue or work item title from ${issueUrl}
- Use the title as the Work Title (shorten for clarity if necessary)
- If the fetch fails, fall back to the branch-based generation rules below

`
    : '';
  
  const workTitleFallbackIndicator = issueUrl ? ' (Fallback)' : '';
```

4. Update template variables assignment:
```typescript
  const variables: PromptVariables = {
    TARGET_BRANCH: targetBranch,
    ISSUE_URL: issueUrl || 'Not provided',
    ISSUE_URL_FIELD: issueUrl || 'none',
    WORKSPACE_PATH: workspacePath,
    WORK_TITLE_STRATEGY: workTitleStrategy,
    WORK_TITLE_FALLBACK_INDICATOR: workTitleFallbackIndicator,
    CUSTOM_INSTRUCTIONS: customInstructionsSection
  };
```

**File: `vscode-extension/src/commands/initializeWorkItem.ts`**

1. Update call to `constructAgentPrompt` to pass `inputs.issueUrl` instead of `inputs.githubIssueUrl`

#### Success Criteria

- [ ] Template uses "Issue URL" field name consistently
- [ ] Template documentation mentions both GitHub and Azure DevOps
- [ ] Agent prompt construction uses issueUrl parameter
- [ ] Variable names and placeholders use ISSUE_URL instead of GITHUB_ISSUE_URL
- [ ] Generated WorkflowContext.md uses "Issue URL:" field
- [ ] Code compiles without errors

---

### Phase 3: Test Updates

Update test files to validate both GitHub and Azure DevOps URL formats.

#### Changes Required

**File: `vscode-extension/src/test/suite/userInput.test.ts`**

1. Update suite description comment (line 10):
```typescript
 * - Issue URL format validation (supports GitHub Issues and Azure DevOps Work Items)
```

2. Update test case for valid URLs (line 44):
```typescript
  test('Valid issue URLs pass validation (GitHub and Azure DevOps)', () => {
    // GitHub Issues
    assert.strictEqual(isValidIssueUrl('https://github.com/owner/repo/issues/123'), true);
    assert.strictEqual(isValidIssueUrl('https://github.com/microsoft/vscode/issues/99999'), true);
    
    // Azure DevOps Work Items
    assert.strictEqual(isValidIssueUrl('https://dev.azure.com/myorg/myproject/_workitems/edit/123'), true);
    assert.strictEqual(isValidIssueUrl('https://dev.azure.com/microsoft/vscode/_workitems/edit/54321'), true);
  });
```

3. Update test case for invalid URLs (line 55):
```typescript
  test('Invalid issue URLs fail validation', () => {
    // Invalid formats for both platforms
    assert.strictEqual(isValidIssueUrl('not a url'), false);
    assert.strictEqual(isValidIssueUrl('https://example.com'), false);
    
    // Invalid GitHub Issue URLs
    assert.strictEqual(isValidIssueUrl('https://github.com/owner/repo/pull/123'), false);
    assert.strictEqual(isValidIssueUrl('github.com/owner/repo/issues/123'), false);
    
    // Invalid Azure DevOps URLs
    assert.strictEqual(isValidIssueUrl('https://dev.azure.com/org/project/workitems/123'), false);
    assert.strictEqual(isValidIssueUrl('https://visualstudio.com/org/project/_workitems/edit/123'), false);
  });
```

4. Update any test helper comments that reference "GitHub issue URL"

#### Success Criteria

- [ ] Tests validate both GitHub Issue and Azure DevOps Work Item URL formats
- [ ] Test descriptions reflect platform-neutral terminology
- [ ] All tests pass
- [ ] Test coverage maintained or improved

---

### Phase 4: Documentation and Examples

Update documentation files and examples to reflect platform-neutral terminology.

#### Changes Required

**File: `vscode-extension/README.md`** (if it mentions GitHub Issues)

Check for and update any references to "GitHub Issue" to use "issue or work item" or "Issue URL".

**File: `vscode-extension/examples/init-instructions.example.md`** (if exists)

Check for and update any example text that references "GitHub Issue" specifically.

**File: `vscode-extension/package.json`**

Check command descriptions and update if they mention "GitHub Issue":
```json
"commands": [
  {
    "command": "paw.initializeWorkItem",
    "title": "Initialize PAW Work Item (with optional issue URL)"
  }
]
```

#### Success Criteria

- [ ] README.md uses platform-neutral language (if applicable)
- [ ] Examples reflect both GitHub and Azure DevOps (if applicable)
- [ ] package.json command descriptions are platform-neutral
- [ ] No GitHub-specific language in user-facing documentation

---

## Verification

After completing all phases:

1. **Compilation Check:**
   ```bash
   cd vscode-extension && npm run compile
   ```
   Verify no TypeScript errors.

2. **Test Execution:**
   ```bash
   npm test
   ```
   Verify all tests pass.

3. **Manual Testing:**
   - Initialize work item with GitHub Issue URL
   - Verify WorkflowContext.md contains "Issue URL:" field
   - Initialize work item with Azure DevOps Work Item URL
   - Verify validation accepts it and WorkflowContext.md is correct
   - Initialize work item without issue URL
   - Verify it still works with "none" value

4. **Backward Compatibility:**
   - Existing code that reads WorkflowContext.md should handle both "Issue URL" and "GitHub Issue" fields (handled by PAW agents, not extension)

## Notes

- **No Breaking Changes:** Field is still optional, URL validation is expanded (not restricted)
- **Backward Compatibility:** Extension generates new "Issue URL" field, but PAW agents (updated in PR 34) read from both field names
- **Consistent with PR 34:** Follows exact same patterns as chatmode updates in PR 34
- **User Experience:** More inclusive terminology that doesn't limit to GitHub

## References

- PR 34: https://github.com/lossyrob/phased-agent-workflow/pull/34
- Azure DevOps Work Item URL format: `https://dev.azure.com/{organization}/{project}/_workitems/edit/{id}`
- GitHub Issue URL format: `https://github.com/{owner}/{repo}/issues/{number}`
