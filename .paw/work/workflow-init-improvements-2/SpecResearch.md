# Spec Research: Workflow Init Improvements

**Work ID**: workflow-init-improvements-2  
**Created**: 2025-12-03

## Summary

The current PAW workflow initialization prompts agents to fetch issue titles from GitHub/Azure DevOps using MCP tools when an issue URL is provided. Branch name validation in `userInput.ts` uses a regex that allows alphanumeric characters plus `/`, `_`, and `-`. Downstream agents access WorkflowContext.md fields via two mechanisms: the `paw_get_context` tool (which returns raw file content) and direct file parsing. Work title derivation from branch names follows a template-defined algorithm that removes prefixes and capitalizes segments. No existing mechanisms check remote branch names or naming conventions.

---

## Research Findings

### Question 1: How does the workflow initialization prompt template currently instruct the agent to fetch issue titles? What mechanism is used (MCP tools, fetch, etc.)?

**Answer**: The workflow initialization prompt template (`workItemInitPrompt.template.md`) instructs the agent to "Retrieve the issue or work item title from [URL]" when an issue URL is provided. The template does not specify a particular mechanism—it relies on the agent's available tools (MCP tools like `mcp_github_issue_read` for GitHub issues or equivalent Azure DevOps tools).

The template uses a conditional work title strategy section:

```
**Preferred - Fetch From Issue:**
- Retrieve the issue or work item title from ${issueUrl}
- Use the title as the Work Title (shorten for clarity if necessary)
- If the fetch fails, fall back to the branch-based generation rules below
```

**Evidence**: `src/prompts/workItemInitPrompt.template.md` lines 52-58 and `src/prompts/workflowInitPrompt.ts` lines 111-122 show this conditional strategy construction.

**Implications**: The current approach delegates issue fetching to the agent's runtime tool capabilities rather than implementing it directly in the extension code. This design would naturally extend to auto-deriving branch names from issue titles.

---

### Question 2: What validation is currently performed on branch names in `userInput.ts`? What characters are allowed?

**Answer**: Branch name validation uses the regex `/^[a-zA-Z0-9/_-]+$/`, which allows:
- Uppercase and lowercase letters (a-z, A-Z)
- Digits (0-9)
- Forward slash (`/`)
- Underscore (`_`)
- Hyphen (`-`)

The validation function `isValidBranchName()` returns true if the input matches this pattern. Additionally, the input prompt requires the branch name to be non-empty.

**Evidence**: `src/ui/userInput.ts` lines 63-65 define `isValidBranchName()`:
```typescript
export function isValidBranchName(value: string): boolean {
  return /^[a-zA-Z0-9/_-]+$/.test(value);
}
```

**Implications**: Auto-derived branch names must be normalized to use only these characters. Any auto-derivation logic should strip or replace invalid characters to pass this validation.

---

### Question 3: How do downstream PAW agents access WorkflowContext.md fields? Do they parse the file directly or use a tool?

**Answer**: Downstream agents access WorkflowContext.md through two mechanisms:

1. **`paw_get_context` tool**: Agents call this tool with `feature_slug` and `agent_name` parameters. The tool loads and returns the raw WorkflowContext.md content wrapped in `<workflow_context>` tags. Agents must parse the returned content themselves.

2. **Direct file parsing**: Agent instructions describe manual file reading from `.paw/work/<feature-slug>/WorkflowContext.md` and extracting specific fields (Target Branch, Work Title, Work ID, Issue URL, Remote, Artifact Paths, Additional Inputs).

The `paw_get_context` tool returns unstructured raw file content—it does not parse fields into a structured response. The tool formats the response with XML-style tags for sections but returns WorkflowContext.md content as-is within code fences.

**Evidence**: 
- `src/tools/contextTool.ts` `loadWorkflowContext()` reads raw file content
- `formatContextResponse()` wraps content in `<workflow_context>` tags with markdown code fences
- Agent files (e.g., PAW-02A) instruct agents to "extract Target Branch, Work Title, Work ID..." from WorkflowContext.md

**Implications**: Adding a new "Initial Prompt" field to WorkflowContext.md would automatically be returned by `paw_get_context` since it returns raw content. However, agent instructions may need updates to reference the new field.

---

### Question 4: What is the current flow for deriving Work Title from branch names in `workItemInitPrompt.template.md`?

**Answer**: The template defines a branch-based work title generation algorithm:

1. Remove standard prefixes: `feature/`, `bugfix/`, `hotfix/`
2. Split the remaining text on hyphens, underscores, and slashes
3. Capitalize the first letter of each word
4. Keep the result concise (ideally 2-4 words)

Example: `feature/user-auth-system` → `User Auth System`

When an issue URL is provided, the template marks this as a fallback method with "(Fallback)" appended to the section header.

**Evidence**: `src/prompts/workItemInitPrompt.template.md` lines 19-25:
```markdown
**Branch-Based Generation{{WORK_TITLE_FALLBACK_INDICATOR}}:**
- Remove standard prefixes (feature/, bugfix/, hotfix/)
- Split on hyphens, underscores, and slashes
- Capitalize first letter of each word
- Keep concise (ideally 2-4 words)
- Example: feature/user-auth-system → User Auth System
```

**Implications**: The inverse operation (deriving branch names from descriptions/titles) would follow similar logic: lowercase, hyphenate words, add prefix. The existing derivation logic provides a template for the reverse transformation.

---

### Question 5: Are there any existing mechanisms for checking remote branch names or naming conventions?

**Answer**: No. The codebase does not contain any mechanisms for checking remote branch names or detecting naming conventions. The `src/git/validation.ts` file provides only:
- `validateGitRepository()` - checks if directory is a git repo
- `hasUncommittedChanges()` - checks for uncommitted changes via `git status`

There are no functions that list remote branches, compare branch names for conflicts, or analyze branch naming patterns.

**Evidence**: 
- `src/git/validation.ts` contains only repository validation and status checking
- grep search for "remote" in TypeScript files shows no branch-listing functionality
- The workflow initialization template does not reference remote branch checking

**Implications**: Implementing FR-007 (check remote branches for conventions and conflicts) requires new git operations—likely `git ls-remote` or `git branch -r` equivalents—to list remote branches and analyze their naming patterns.

---

## Open Unknowns

1. **VS Code Chat Panel API availability**: The spec assumes freeform description prompts can appear in the chat panel. The actual VS Code API capabilities for mid-flow chat prompting versus input boxes require investigation during implementation. (Internal investigation deferred to Code Research phase)

2. **Azure DevOps MCP tool availability**: The template references Azure DevOps work item URLs, but whether corresponding MCP tools exist for fetching work item titles is unclear. (May affect Azure DevOps branch auto-derivation)

---

## User-Provided External Knowledge (Manual Fill)

The following optional questions may be answered by providing external context:

- [ ] What are common branch naming conventions in open-source projects (prefixes like feature/, bugfix/, patterns)?
- [ ] Are there any VS Code extension APIs for prompting users within the chat panel rather than input boxes?
