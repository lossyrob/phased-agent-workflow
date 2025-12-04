---
date: 2025-11-24T23:01:18-05:00
git_commit: 52ac40a92bfada83f0dc54cfa58a95f8759173de
branch: feature/workflow-handoffs_plan
repository: phased-agent-workflow
topic: "Workflow Handoffs - Implementation Details"
tags: [research, codebase, workflow-handoffs, vscode-extension, language-model-tools, agents]
status: complete
last_updated: 2025-11-24
---

# Research: Workflow Handoffs - Implementation Details

**Date**: 2025-11-24 23:01:18 EST
**Git Commit**: 52ac40a92bfada83f0dc54cfa58a95f8759173de
**Branch**: feature/workflow-handoffs_plan
**Repository**: phased-agent-workflow

## Research Question

Research the codebase implementation details for the Workflow Handoffs feature, focusing on:
1. VS Code extension structure and Language Model API usage patterns
2. Existing tool implementations (registration, parameters, approval UX)
3. Agent file structure and conventions
4. WorkflowContext.md creation, parsing, and usage
5. Git integration patterns
6. Artifact file structure and dependencies
7. GitHub MCP tool usage patterns

## Summary

The PAW extension follows a clean architecture where the VS Code extension (`src/extension.ts`) registers Language Model Tools that agents invoke during conversations. The existing `paw_get_context` and `paw_create_prompt_templates` tools demonstrate the pattern: tools are registered in `activate()`, implement `prepareInvocation()` for approval UI, and `invoke()` for execution. Chat creation uses `workbench.action.chat.newChat` followed by `workbench.action.chat.open` with `mode: 'agent'`—a fire-and-forget pattern where the extension cannot wait for agent completion.

Agent files (`.agent.md` format) are markdown documents with frontmatter containing a `description` field. They include comprehensive instructions for WorkflowContext.md handling, mode-aware behavior (full/minimal/custom workflow modes, prs/local review strategies), and tool usage patterns. Agents consistently check for WorkflowContext.md at startup, extract parameters, and adapt behavior based on Workflow Mode and Review Strategy fields.

WorkflowContext.md is created during workflow initialization by the Spec Agent, contains essential workflow metadata (Work Title, Work ID, Target Branch, Workflow Mode, Review Strategy, Issue URL, Remote), and serves as the authoritative source of truth that agents read via `paw_get_context`. The file structure follows `.paw/work/<feature-slug>/` with artifacts like Spec.md, CodeResearch.md, ImplementationPlan.md, and a `prompts/` subdirectory for stage-specific prompt files.

Git operations use Node.js `child_process.exec` via promisified wrappers, with commands like `git rev-parse --git-dir` for validation and `git status --porcelain` for detecting uncommitted changes. GitHub MCP tools are referenced throughout agents as `mcp_github_search_pull_requests`, `mcp_github_pull_request_read`, etc., but agents use natural language descriptions ("use GitHub MCP tools") rather than direct tool names, allowing the Language Model to route appropriately.

## Detailed Findings

### VS Code Extension Structure and Language Model API

**Extension Activation (`src/extension.ts:28-62`)**:
- Activates on `onStartupFinished` event to ensure agents are installed before Copilot interaction
- Creates output channel for logging: `vscode.window.createOutputChannel('PAW Workflow')`
- Registers tools via `registerPromptTemplatesTool(context)` and `registerContextTool(context)`
- Registers command `paw.initializeWorkItem` mapped to `initializeWorkItemCommand`
- Agent installation happens via `installAgentsIfNeeded()` before tool/command registration

**Language Model API for Chat Creation (`src/commands/initializeWorkItem.ts:105-115`)**:
```typescript
await vscode.commands.executeCommand('workbench.action.chat.newChat').then(async value => {
  outputChannel.appendLine('[INFO] New chat session created: ' + String(value));
  await vscode.commands.executeCommand('workbench.action.chat.open', {
    query: prompt,
    mode: 'agent'
  });
});
```

**Key Pattern**:
- `workbench.action.chat.newChat`: Creates fresh chat panel, returns Promise (value logged but not used)
- `workbench.action.chat.open`: Invokes agent with parameters `{ query: string, mode: 'agent' }`
- Returns `Thenable<void>` - resolves when chat opens, does NOT wait for agent completion
- Extension cannot programmatically access agent output or determine success/failure
- This is a **fire-and-forget pattern** suitable for handoff tool implementation

### Language Model Tool Registration Pattern

**Tool Registration Structure (`src/tools/contextTool.ts:310-365`)**:
```typescript
const tool = vscode.lm.registerTool<ContextParams>(
  'paw_get_context',
  {
    async prepareInvocation(options, _token) {
      const { feature_slug, agent_name } = options.input;
      return {
        invocationMessage: `Retrieving PAW context for feature: ${feature_slug}`,
        confirmationMessages: {
          title: 'Get PAW Context',
          message: new vscode.MarkdownString(
            `This will retrieve custom instructions and workflow context for:\n\n` +
            `- **Feature**: ${feature_slug}\n` +
            `- **Agent**: ${agent_name}`
          )
        }
      };
    },
    async invoke(options, token) {
      // Check cancellation: token.isCancellationRequested
      const result = await getContext(options.input);
      const formattedResponse = formatContextResponse(result);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(formattedResponse)
      ]);
    }
  }
);
context.subscriptions.push(tool);
```

**Tool Approval Mechanism**:
- `prepareInvocation()`: Generates approval UI with `invocationMessage` (brief) and `confirmationMessages` (detailed markdown)
- User sees: Title, markdown message body, buttons (Approve, Always Allow, Deny)
- "Always Allow" is per-tool, persists across sessions
- Timeout controlled by VS Code/Copilot, not extension code
- Extension cannot customize timeout or detect timeout vs. denial programmatically

**Parameter Validation (`src/tools/contextTool.ts:168-187`)**:
- Work ID (feature_slug) validated with regex: `/^[a-z0-9-]+$/`
- Must be non-empty, lowercase letters/numbers/hyphens only
- Agent name must be non-empty string
- Validation happens before tool execution, throws clear error messages

**Context Retrieval (`src/tools/contextTool.ts:212-230`)**:
- Searches all workspace folders for `.paw/work/<feature-slug>/` directory
- Loads three sources: workspace instructions (`.paw/instructions/<agent>-instructions.md`), user instructions (`~/.paw/instructions/<agent>-instructions.md`), workflow context (`WorkflowContext.md`)
- Missing files handled gracefully with `exists: false`
- Missing Work ID directory throws immediate error for agent retry

**Response Formatting (`src/tools/contextTool.ts:278-308`)**:
- Returns XML-tagged sections: `<workspace_instructions>`, `<user_instructions>`, `<workflow_context>`
- Workflow context wrapped in markdown code fence within tags
- Empty result returns `<context status="empty" />`
- This format allows agents to parse sections distinctly

### Prompt Template Tool Implementation

**Tool Structure (`src/tools/createPromptTemplates.ts:347-387`)**:
- Registered as `paw_create_prompt_templates`
- Accepts: `feature_slug`, `workspace_path`, optional `workflow_mode`, optional `stages[]`
- Creates `.paw/work/<feature-slug>/prompts/` directory recursively
- Generates template files with frontmatter and Work ID parameter

**Workflow Mode Stage Determination (`src/tools/createPromptTemplates.ts:161-206`)**:
- **full mode**: All stages (spec, code-research, plan, implementation, implementation-review, pr-review-response, documentation, final-pr, status)
- **minimal mode**: Core stages only (code-research, plan, implementation, implementation-review, pr-review-response, documentation, final-pr, status) - skips spec
- **custom mode**: Uses explicit `stages[]` array if provided, otherwise falls back to minimal
- `undefined` mode defaults to full

**Template Generation (`src/tools/createPromptTemplates.ts:230-250`)**:
```typescript
function generatePromptTemplate(mode: string, instruction: string, featureSlug: string): string {
  return `---\nagent: ${mode}\n---\n\n${instruction}\n\nWork ID: ${featureSlug}\n`;
}
```

**Prompt Template Definitions (`src/tools/createPromptTemplates.ts:97-151`)**:
- Each template: `{ filename, mode, instruction, stage }`
- Filenames follow pattern: `<stage-code><sub-letter>-<name>.prompt.md`
- Stage codes: `01A` (Spec), `01B` (Spec Research), `02A` (Code Research), `02B` (Plan), `03A` (Implementer), `03B` (Reviewer), `03C`/`03D` (PR Review Response), `04` (Docs), `05` (PR), `0X` (Status)
- Phase-specific prompts would extend pattern: `03A-implement-phase2.prompt.md`

### Agent File Structure and Conventions

**File Format** (all `.agent.md` files in `agents/` directory):
- Markdown with frontmatter: `---\ndescription: 'Agent description'\n---`
- Frontmatter delimiter uses `chatagent` tag for VS Code recognition
- Body contains comprehensive markdown instructions

**WorkflowContext.md Handling Pattern** (consistent across all agents):

From `agents/PAW-01A Specification.agent.md:39-66`:
```markdown
### WorkflowContext.md Parameters
- Minimal format to create or update:
```markdown
# WorkflowContext

Work Title: <work_title>
Work ID: <feature-slug>
Target Branch: <target_branch>
Issue URL: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```
- If the file is missing or lacks a Target Branch or Work ID:
  1. Derive Target Branch from current branch if necessary
  2. Generate Work ID from Work Title if Work Title exists (normalize and validate)
  3. If both missing, prompt user for either Work Title or explicit Work ID
  4. Write `.paw/work/<feature-slug>/WorkflowContext.md` before proceeding
```

**Workflow Mode and Review Strategy Handling** (agents/PAW-02B Impl Planner.agent.md:42-88):
- Agents read `Workflow Mode` and `Review Strategy` fields from WorkflowContext.md at startup
- **full mode**: Multi-phase plan; prs strategy creates planning branch+PR, local strategy uses target branch only
- **minimal mode**: Single phase; enforces local strategy (no intermediate PRs)
- **custom mode**: Interprets Custom Workflow Instructions for phases and branching
- Defaults: Missing fields → full mode + prs strategy
- Branching logic:
  - **prs**: `git checkout -b <target>_plan`, commit, push, create PR `<target>_plan` → `<target>`
  - **local**: `git checkout <target>`, commit, push (no PR)

**Agent Invocation Pattern** (agents/PAW-01A Specification.agent.md:7-38):
- Agents check for WorkflowContext.md in chat context or on disk at `.paw/work/<feature-slug>/WorkflowContext.md`
- Extract parameters: Target Branch, Work Title, Work ID, Issue URL, Remote (default `origin`), Artifact Paths, Additional Inputs
- Call `paw_get_context` tool with Work ID and agent name to retrieve full context
- Agents adapt behavior based on Workflow Mode field (full/minimal/custom)

**Handoff References** (current state before this feature):
- Agents end with "Hand-off" sections showing next steps
- Current pattern: "Next: Invoke [Agent Name] with [artifacts]"
- No automated handoff mechanism exists yet—users manually navigate to next agent

### WorkflowContext.md Creation and Usage

**Creation During Initialization** (`src/prompts/workflowInitPrompt.ts:66-103`):
- Prompt template includes variables: `TARGET_BRANCH`, `WORKFLOW_MODE`, `REVIEW_STRATEGY`, `ISSUE_URL`, `CUSTOM_INSTRUCTIONS_FIELD`
- Agent (PAW-01A Specification) creates file at `.paw/work/<feature-slug>/WorkflowContext.md`
- Work Title generation:
  - **Preferred**: Fetch from Issue URL if provided
  - **Fallback**: Derive from branch name (cleanup, capitalize, shorten)
- Work ID generation: Normalize Work Title (lowercase, hyphens, remove invalid chars, truncate to 100 chars)

**Field Definitions**:
- **Work Title**: Short descriptive name (2-4 words) used as PR title prefix
- **Work ID**: Normalized filesystem-safe identifier (feature slug)
- **Target Branch**: Branch where completed work will be merged
- **Workflow Mode**: `full`, `minimal`, or `custom`
- **Review Strategy**: `prs` or `local`
- **Issue URL**: Full URL to GitHub issue or Azure DevOps work item
- **Remote**: Git remote name (defaults to `origin`)
- **Artifact Paths**: `auto-derived` or explicit overrides
- **Additional Inputs**: Comma-separated list or `none`
- **Custom Workflow Instructions**: Text for custom mode (omitted for full/minimal)

**Usage Pattern** (agents consistently):
1. Check for WorkflowContext.md at startup
2. Read file if exists, extract fields
3. Update file when learning new parameters
4. Default missing Remote to `origin` without prompting
5. Persist artifact path overrides when supplied

### Git Integration Patterns

**Repository Validation** (`src/git/validation.ts:11-29`):
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
- Uses `child_process.exec` via `promisify(exec)`
- Command: `git rev-parse --git-dir` - reliable check that works in subdirectories
- Returns boolean, no exception thrown on failure

**Uncommitted Changes Detection** (`src/git/validation.ts:31-54`):
```typescript
export async function hasUncommittedChanges(workspacePath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd: workspacePath });
    return stdout.trim().length > 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to check git status: ${message}`);
  }
}
```
- Command: `git status --porcelain` - detects staged and unstaged changes
- Non-empty output indicates changes exist
- Throws error on failure (not a git repo, command failed)

**Git Commands in Agents** (consistent pattern across agents):
- Branch checking: `git branch --show-current`
- Branch creation: `git checkout -b <branch_name>`
- Branch switching: `git checkout <branch_name>`
- Staging: `git add <file1> <file2>` (selective, never `git add .`)
- Verification: `git diff --cached` before committing
- Pushing: `git push -u <remote> <branch>` or `git push <remote> <branch>`
- Commands executed via natural language instructions to agents, not extension code

### Artifact File Structure and Dependencies

**Directory Structure**:
```
.paw/
├── instructions/               # Workspace-specific custom instructions
│   ├── PAW-01A Specification-instructions.md
│   ├── PAW-02A Code Researcher-instructions.md
│   └── init-instructions.md
└── work/
    └── <feature-slug>/
        ├── WorkflowContext.md  # Workflow metadata (authoritative source)
        ├── Spec.md            # Feature specification (optional in minimal mode)
        ├── SpecResearch.md    # Spec research findings (optional)
        ├── CodeResearch.md    # Codebase research findings
        ├── ImplementationPlan.md  # Implementation plan
        ├── Docs.md            # Documentation (optional in minimal mode)
        └── prompts/           # Stage-specific prompt files
            ├── 01A-spec.prompt.md
            ├── 01B-spec-research.prompt.md
            ├── 02A-code-research.prompt.md
            ├── 02B-impl-plan.prompt.md
            ├── 03A-implement-phase1.prompt.md
            ├── 03B-review-phase1.prompt.md
            ├── 04-docs.prompt.md
            ├── 05-pr.prompt.md
            └── 0X-status.prompt.md
```

**User-Level Instructions**:
```
~/.paw/
└── instructions/
    ├── PAW-01A Specification-instructions.md
    └── PAW-02A Code Researcher-instructions.md
```

**Artifact Dependencies** (stage progression):
1. **Spec** → `Spec.md` (created by PAW-01A)
2. **Spec Research** → `SpecResearch.md` (created by PAW-01B, requires Spec.md optional)
3. **Code Research** → `CodeResearch.md` (created by PAW-02A, requires Spec.md)
4. **Planning** → `ImplementationPlan.md` (created by PAW-02B, requires Spec.md + CodeResearch.md)
5. **Implementation** → Code changes (PAW-03A, requires ImplementationPlan.md)
6. **Implementation Review** → PR creation (PAW-03B, requires implementation commits)
7. **Documentation** → `Docs.md` (PAW-04, requires all phases complete)
8. **Final PR** → Final PR creation (PAW-05, requires Docs.md in full mode)

**Prompt File Generation**:
- Created by `paw_create_prompt_templates` tool
- Generated during workflow initialization (full mode: all files, minimal mode: subset)
- Can be generated on-demand for specific stages (planned for Status Agent)
- Naming convention: `<stage-code><sub>-<name>-phase<N>.prompt.md` for phase-specific prompts

### GitHub MCP Tool Usage Patterns

**Tool References in Agents**:
- Agents instructed to "use GitHub MCP tools" or "use github mcp tools" (lowercase)
- Specific tools mentioned in research/specs: `mcp_github_search_pull_requests`, `mcp_github_pull_request_read`
- Review workflow agents reference: `mcp_github_pull_request_review_write`, `mcp_github_add_comment_to_pending_review`
- Pattern: Agents describe operations naturally, Language Model routes to appropriate MCP tools

**PR Querying Tools** (from SpecResearch.md findings):
1. **`mcp_github_search_pull_requests`**:
   - Search PRs using GitHub issues search syntax (pre-scoped to `is:pr`)
   - Parameters: `query`, `sort`, `order`, `page`, `perPage`, `owner`, `repo`
   - Example query: `repo:owner/repo state:open head:branch_name`
   - Can potentially batch multiple branch searches with OR operators

2. **`mcp_github_pull_request_read`**:
   - Read individual PR by number
   - Methods: `get` (metadata), `get_status` (CI status), `get_files` (changed files)

**Rate Limiting Considerations**:
- GitHub API: 5,000 requests/hour for authenticated users
- MCP tools inherit GitHub API rate limits
- Status Agent should implement 5-minute caching to reduce API calls
- Error handling: Catch 403 responses with `X-RateLimit-Remaining: 0` header

**Azure DevOps Support**:
- Extension designed for platform-agnostic issue URL support
- Issue URL validation supports both GitHub and Azure DevOps formats
- MCP tool selection based on URL pattern (not yet implemented in current codebase)

### User Input Collection

**Input Flow** (`src/ui/userInput.ts:126-184`):
1. **Target Branch**: Input box with validation (`isValidBranchName` - alphanumeric, slashes, hyphens, underscores)
2. **Workflow Mode**: Quick Pick menu (Full/Minimal/Custom)
   - Custom mode prompts for custom instructions (min 10 chars)
3. **Review Strategy**: Quick Pick menu (PRs/Local)
   - Auto-selected to `local` for minimal mode
4. **Issue URL**: Optional input box with validation (`isValidIssueUrl` - GitHub or Azure DevOps formats)

**Validation Functions** (`src/ui/userInput.ts:47-87`):
- `isValidBranchName(value)`: `/^[a-zA-Z0-9/_-]+$/` pattern
- `isValidIssueUrl(value)`: Matches GitHub (`https://github.com/{owner}/{repo}/issues/{number}`) or Azure DevOps (`https://dev.azure.com/{org}/{project}/_workitems/edit/{id}`) formats

**Workflow Mode Definitions** (`src/ui/userInput.ts:11-32`):
```typescript
export type WorkflowMode = 'full' | 'minimal' | 'custom';
export type ReviewStrategy = 'prs' | 'local';

export interface WorkflowModeSelection {
  mode: WorkflowMode;
  customInstructions?: string;  // Required when mode is 'custom'
}
```

## Code References

### Extension and Tool Registration
- `src/extension.ts:28-62` - Extension activation and tool registration
- `src/extension.ts:76-149` - Agent installation logic
- `src/commands/initializeWorkItem.ts:30-115` - Workflow initialization command
- `src/tools/contextTool.ts:310-365` - Context tool registration and implementation
- `src/tools/createPromptTemplates.ts:347-387` - Prompt templates tool registration

### Tool Core Logic
- `src/tools/contextTool.ts:87-154` - `getContext()` implementation with workspace resolution
- `src/tools/contextTool.ts:212-249` - Context loading from multiple sources
- `src/tools/contextTool.ts:278-308` - Response formatting with XML tags
- `src/tools/createPromptTemplates.ts:161-206` - Workflow mode stage determination
- `src/tools/createPromptTemplates.ts:230-290` - Prompt template generation and file creation

### User Input and Validation
- `src/ui/userInput.ts:47-87` - Input validation functions
- `src/ui/userInput.ts:95-137` - Workflow mode collection
- `src/ui/userInput.ts:139-184` - Review strategy collection
- `src/ui/userInput.ts:186-242` - Complete user input collection flow

### Git Operations
- `src/git/validation.ts:11-29` - Git repository validation
- `src/git/validation.ts:31-54` - Uncommitted changes detection

### Prompt Construction
- `src/prompts/workflowInitPrompt.ts:66-103` - Agent prompt construction with variable substitution
- `src/prompts/customInstructions.ts:11-51` - Custom instructions loading and formatting

### Agent Instructions
- `agents/PAW-01A Specification.agent.md:7-66` - Spec agent WorkflowContext.md handling and mode adaptation
- `agents/PAW-02A Code Researcher.agent.md:7-122` - Code researcher context and mode handling
- `agents/PAW-02B Impl Planner.agent.md:7-88` - Planner branching and review strategy logic
- `agents/PAW-03A Implementer.agent.md:7-114` - Implementer phase branch management

## Architecture Documentation

**Extension Component Architecture**:
1. **Extension Host** (`src/extension.ts`): Registers tools and commands, manages lifecycle
2. **Language Model Tools** (`src/tools/`): Procedural operations agents can invoke
3. **Command Handlers** (`src/commands/`): VS Code command implementations
4. **UI Layer** (`src/ui/`): User input collection and validation
5. **Git Layer** (`src/git/`): Git repository operations
6. **Agent Layer** (`agents/`): Markdown instruction files for agent behavior

**Tool Design Pattern**:
- Extension provides procedural, reliable operations (file I/O, git, system calls)
- Agents provide decision-making logic and natural language understanding
- Clear separation: Extension handles "can do", agents handle "should do"
- Fire-and-forget invocation: Extension cannot wait for agent completion

**Context Retrieval Flow**:
```
Agent starts → Reads WorkflowContext.md → Calls paw_get_context(Work ID, Agent Name)
                                            ↓
                            Tool searches workspaces for .paw/work/<Work ID>/
                                            ↓
                            Loads: workspace instructions, user instructions, WorkflowContext.md
                                            ↓
                            Returns XML-tagged formatted response
                                            ↓
Agent parses → Extracts parameters → Adapts behavior based on mode/strategy
```

**Workflow Initialization Flow**:
```
User: PAW: New PAW Workflow
    ↓
Extension collects: Branch, Mode, Strategy, Issue URL
    ↓
Extension constructs prompt with variables
    ↓
Extension: workbench.action.chat.newChat → workbench.action.chat.open (mode: 'agent')
    ↓
Agent (PAW-01A): Reads issue → Generates Work Title → Creates Work ID → Writes WorkflowContext.md
    ↓
Agent: Calls paw_create_prompt_templates → Writes Spec.md → Completes
```

## Open Questions

None - all research objectives completed with concrete file references.

## References

- Spec.md: `.paw/work/workflow-handoffs/Spec.md`
- SpecResearch.md: `.paw/work/workflow-handoffs/SpecResearch.md`
- VS Code Language Model API: Used throughout extension for tool registration and chat invocation
- GitHub MCP Server: Referenced in agents for PR operations (tools not directly used by extension code)
- PAW Specification: `paw-specification.md` (workflow stages and conventions)
