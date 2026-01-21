# Work Item URL Parsing Implementation Plan

## Overview

Remove URL validation entirely from the issue/work item input, delegating all interpretation to agents. Users can enter full URLs, issue numbers, or any identifier—the agent determines context from git remotes and handles errors gracefully. This fully embraces PAW architecture philosophy: "tools provide procedural operations, agents provide decision-making logic and reasoning."

## Current State Analysis

The `isValidIssueUrl` function at [src/ui/userInput.ts#L102-L106](src/ui/userInput.ts#L102-L106) uses strict regex patterns that block valid inputs like:
- Legacy Azure DevOps: `https://msdata.visualstudio.com/Database%20Systems/_workitems/edit/123`
- Simple issue numbers: `123` (agent could infer repo from git remote)

## Desired End State

1. Input box accepts any non-empty string without validation
2. Agents interpret input contextually (URL, issue number, or identifier)
3. For GitHub repos, entering just `123` works—agent infers `owner/repo` from git remote
4. Invalid inputs result in graceful agent error handling, not UI blocking

### Verification:
- `npm run compile` completes without errors
- `npm run lint` shows no issues  
- Tests pass with updated expectations
- Any input accepted in URL prompt field

## What We're NOT Doing

- Adding more regex patterns for different URL formats
- Implementing URL fetching in the extension
- Changing the prompt text (placeholder still shows example formats as guidance)

## Implementation Approach

Remove the `validateInput` callback from the issue URL input box. Delete `isValidIssueUrl` function and its tests as they're no longer needed.

## Phase Summary

1. **Phase 1: Remove URL Validation** - Delete validation function and remove validateInput callback

---

## Phase 1: Remove URL Validation

### Overview
Remove `isValidIssueUrl` function and the `validateInput` callback, allowing any input to pass through to agents.

### Changes Required:

#### 1. Remove validateInput from Input Box
**File**: `src/ui/userInput.ts`
**Changes**: 
- Remove the `validateInput` callback from the `showInputBox` call at lines 322-331
- Delete `isValidIssueUrl` function (lines 102-106)
- Delete associated JSDoc (lines 85-100)

#### 2. Remove Tests for Deleted Function
**File**: `src/test/suite/userInput.test.ts`
**Changes**:
- Delete test suite for `isValidIssueUrl` (lines 58-93)
- Remove import of `isValidIssueUrl` if present

**Tests**:
- Existing tests for other functions (`isValidBranchName`, workflow modes) remain unchanged
- No new tests needed—validation is delegated to agents

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] Linting passes: `npm run lint`
- [ ] Tests pass: `npm test`

#### Manual Verification:
- [ ] Any URL accepted: `https://msdata.visualstudio.com/Database%20Systems/_workitems/edit/123`
- [ ] Issue number accepted: `123`
- [ ] Full GitHub URL still works: `https://github.com/owner/repo/issues/789`
- [ ] Empty input (skip) still works

---

## Cross-Phase Testing Strategy

### Manual Testing Steps:
1. Open VS Code with the extension
2. Run "PAW: Initialize Work Item"  
3. Enter just `123` as the issue input
4. Verify input is accepted
5. Verify the value appears in the generated prompt for agent interpretation

## References

- Initial Prompt: Bug with `https://msdata.visualstudio.com/Database%20Systems` URLs
- Research: `.paw/work/work-item-parsing/CodeResearch.md`
- PAW Philosophy: `.github/copilot-instructions.md` ("tools provide procedural operations, agents provide reasoning")
