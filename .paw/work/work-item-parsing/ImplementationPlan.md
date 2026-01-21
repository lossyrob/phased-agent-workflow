# Work Item URL Parsing Implementation Plan

## Overview

Fix validation for Azure DevOps work item URLs by relaxing procedural validation and delegating URL validity assessment to agents. This aligns with PAW architecture philosophy: "tools provide procedural operations, agents provide decision-making logic and reasoning."

## Current State Analysis

The `isValidIssueUrl` function at [src/ui/userInput.ts#L102-L106](src/ui/userInput.ts#L102-L106) uses strict regex patterns that only match:
- GitHub: `https://github.com/{owner}/{repo}/issues/{number}`
- Azure DevOps: `https://dev.azure.com/{org}/{project}/_workitems/edit/{id}`

This fails for:
1. **Legacy visualstudio.com format**: `https://msdata.visualstudio.com/Database%20Systems/_workitems/edit/123`
2. **URL-encoded project names**: Any project with spaces or special characters
3. **Future platforms**: Would require additional regex patterns for Jira, Linear, etc.

## Desired End State

1. URLs that appear to be issue/work item links are accepted during input collection
2. Agents attempt to fetch from the URL and handle errors gracefully
3. Users can provide any plausible issue tracker URL without being blocked by validation
4. Tests pass and validate the relaxed validation behavior

### Verification:
- `npm run compile` completes without errors
- `npm run lint` shows no issues
- Tests at `src/test/suite/userInput.test.ts` pass with `npm test`
- Manually entering `https://msdata.visualstudio.com/Database%20Systems/_workitems/edit/123` is accepted

## What We're NOT Doing

- Adding more specific regex patterns for legacy Azure DevOps formats
- Implementing actual URL fetching/validation in the extension
- Supporting PR URLs or other GitHub link types (issues only)
- Adding support for Jira, Linear, or other platforms (but this approach enables future support without code changes)

## Implementation Approach

Replace strict platform-specific regex validation with a permissive "looks like an issue URL" check. The heuristic accepts URLs that:
1. Start with `https://`
2. Contain keywords suggesting an issue/work item context (`issue`, `workitem`, `_workitems`, `ticket`, etc.)
3. End with what appears to be an issue number

This delegates platform-specific validation to agents, who can attempt to fetch and report meaningful errors.

## Phase Summary

1. **Phase 1: Relax URL Validation** - Replace strict regex with permissive heuristic and update tests

---

## Phase 1: Relax URL Validation

### Overview
Modify `isValidIssueUrl` to accept any URL that plausibly points to an issue or work item, updating tests and documentation to reflect the new behavior.

### Changes Required:

#### 1. Update isValidIssueUrl Function
**File**: `src/ui/userInput.ts`
**Changes**: 
- Replace strict platform regex patterns with permissive heuristic
- Update JSDoc to document new behavior and rationale
- Keep function signature unchanged for backward compatibility

**Tests**:
- Update tests in `src/test/suite/userInput.test.ts`
- Test cases:
  - Legacy visualstudio.com URLs now pass
  - URL-encoded project names now pass
  - Generic HTTPS URLs with issue-related keywords pass
  - Non-HTTPS URLs still fail
  - URLs without issue-related keywords still fail
- Follow existing test patterns in the file

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compiles: `npm run compile`
- [ ] Linting passes: `npm run lint`
- [ ] Tests pass: `npm test` (will require running VS Code extension tests)

#### Manual Verification:
- [ ] Input `https://msdata.visualstudio.com/Database%20Systems/_workitems/edit/123` is accepted in URL prompt
- [ ] Input `https://dev.azure.com/org/project/_workitems/edit/456` still works
- [ ] Input `https://github.com/owner/repo/issues/789` still works
- [ ] Input `https://example.com` (no issue keywords) is rejected
- [ ] Empty input (skip) still works

---

## Cross-Phase Testing Strategy

### Integration Tests:
- Run the full PAW initialization flow with a legacy Azure DevOps URL
- Verify the agent receives the URL in the prompt

### Manual Testing Steps:
1. Open VS Code with the extension
2. Run "PAW: Initialize Work Item"
3. Enter `https://msdata.visualstudio.com/Database%20Systems/_workitems/edit/123`
4. Verify URL is accepted without validation error
5. Verify the URL appears in the generated prompt

## References

- Initial Prompt: Bug with `https://msdata.visualstudio.com/Database%20Systems` URLs
- Research: `.paw/work/work-item-parsing/CodeResearch.md`
- PAW Philosophy: `.github/copilot-instructions.md` ("tools provide procedural operations, agents provide decision-making logic")
