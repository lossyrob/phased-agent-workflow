---
date: 2025-11-24T21:44:15-05:00
git_commit: cee26865794c62cab6478e0afd05c4a466f0693d
branch: feature/workflow-handoffs
repository: phased-agent-workflow
topic: "Workflow Handoffs Implementation Research"
tags: [research, codebase, workflow-handoffs, language-model-tools, agent-framework, context-management]
status: complete
last_updated: 2025-11-24
---

# Research: Workflow Handoffs Implementation Research

**Date**: 2025-11-24 21:44:15 EST
**Git Commit**: cee26865794c62cab6478e0afd05c4a466f0693d
**Branch**: feature/workflow-handoffs
**Repository**: phased-agent-workflow

## Research Question

How is the PAW extension currently structured to support implementing workflow handoffs with three handoff modes (manual, semi-auto, auto), dynamic prompt generation, stage transition tools, and Status Agent enhancements?

## Summary

The PAW extension provides a foundation for implementing workflow handoffs through its existing language model tool infrastructure, agent installation system, and context management patterns. Key findings:

1. **Language Model Tools Pattern**: Extension uses `vscode.lm.registerTool()` to register tools like `paw_get_context` and `paw_create_prompt_templates`. This pattern can be extended to add stage transition and workflow state analysis tools.

2. **Agent Structure**: All agents are markdown files (`.agent.md`) with YAML frontmatter. They're installed to platform-specific prompts directories and use a component system for shared instructions (`paw-context.component.md`).

3. **Context Management**: `WorkflowContext.md` files store workflow metadata (Work ID, target branch, workflow mode, review strategy). The `paw_get_context` tool retrieves workspace-specific and user-level custom instructions.

4. **Prompt Templates**: `paw_create_prompt_templates` already supports workflow mode filtering (full/minimal/custom) for generating stage-specific prompt files. This provides a foundation for dynamic prompt generation on demand.

5. **Git Operations**: Basic git validation utilities exist (`validateGitRepository`, `hasUncommittedChanges`) in `src/git/validation.ts`. Additional git state analysis will be needed for Status Agent.

6. **Artifact Organization**: Artifacts are stored in `.paw/work/<feature-slug>/` with standardized names (Spec.md, CodeResearch.md, ImplementationPlan.md, etc.). Review workflow artifacts go in `.paw/reviews/`.

## Detailed Findings

### Language Model Tool Architecture

**Location**: `src/tools/contextTool.ts` (lines 310-341), `src/tools/createPromptTemplates.ts` (lines 349-384)

The extension registers language model tools using VS Code's Language Model API. Each tool registration follows a consistent pattern:

```typescript
const tool = vscode.lm.registerTool<ParamsType>(
  'tool_name',
  {
    async prepareInvocation(options, _token) {
      return {
        invocationMessage: "User-facing description",
        confirmationMessages: {
          title: "Confirmation Title",
          message: new vscode.MarkdownString("Details...")
        }
      };
    },
    async invoke(options) {
      // Tool implementation
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart("Result text")
      ]);
    }
  }
);
context.subscriptions.push(tool);
```

**Key Integration Points**:
- `src/extension.ts:44-48` - Tools are registered during extension activation
- Tools receive structured parameters via `options.input` property
- Tool results use `LanguageModelToolResult` with text parts
- All tools are added to `context.subscriptions` for lifecycle management

**Implications for Workflow Handoffs**:
- Stage Transition Tool will follow this same registration pattern
- Dynamic Prompt Generator Tool can extend `paw_create_prompt_templates` logic
- Status Query Tool will need new implementation following this pattern
- Tool approval infrastructure already exists via `prepareInvocation` confirmation messages

### Prompt Template and Agent Structure

**Agent File Format**: `agents/*.agent.md` (15 total agents)

All PAW agents are markdown files with consistent structure:
- YAML frontmatter with `description` field (lines 1-3 in each `.agent.md` file)
- Markdown body with agent instructions
- Optional component includes via `{{PAW_CONTEXT}}` placeholder

**Agent Template Loading**: `src/agents/agentTemplates.ts` (lines 206-276)

The `loadAgentTemplates()` function:
- Scans `agents/` directory for `.agent.md` files (line 228)
- Parses YAML frontmatter to extract metadata (lines 237-250)
- Processes component placeholders like `{{PAW_CONTEXT}}` (lines 256-266)
- Returns `AgentTemplate[]` with filename, content, metadata

**Agent Installation**: `src/agents/installer.ts` (lines 279-390)

Agents are installed to platform-specific prompts directories:
- macOS: `~/Library/Application Support/GitHub Copilot/prompts/`
- Linux: `~/.config/github-copilot/prompts/`
- Windows: `%APPDATA%\GitHub Copilot\prompts\`
- Custom: User-configurable via `paw.promptDirectory` setting

**PAW Context Component**: `agents/components/paw-context.component.md` (lines 1-20)

Provides reusable pattern for agents to retrieve workflow context:
```markdown
At the beginning of your work, call the `paw_get_context` tool with the work ID (feature slug)
and your agent name to retrieve:
- Workspace-specific custom instructions from `.paw/instructions/{{AGENT_NAME}}-instructions.md`
- User-level custom instructions from `~/.paw/instructions/{{AGENT_NAME}}-instructions.md`
- Workflow context from `WorkflowContext.md`
```

**Implications for Handoff Patterns**:
- Handoff instructions can be added to each agent's markdown following existing section patterns
- Agent frontmatter doesn't need modification (description only)
- Component system allows shared handoff pattern documentation
- All agents would need new handoff sections defining next step recommendations

### Existing PAW Agent Patterns

**Standard Workflow Agents** (9 agents):
- `PAW-01A Specification.agent.md` - Creates feature spec
- `PAW-01B Spec Researcher.agent.md` - Answers research questions
- `PAW-02A Code Researcher.agent.md` - Investigates codebase
- `PAW-02B Impl Planner.agent.md` - Creates implementation plan
- `PAW-03A Implementer.agent.md` - Writes implementation code
- `PAW-03B Impl Reviewer.agent.md` - Reviews implementation
- `PAW-04 Documenter.agent.md` - Generates documentation
- `PAW-05 PR.agent.md` - Creates final PR
- `PAW-X Status Update.agent.md` - Updates workflow status

**Review Workflow Agents** (5 agents):
- `PAW-R1A Understanding.agent.md` - PR baseline analysis
- `PAW-R1B Baseline Researcher.agent.md` - Gathers context
- `PAW-R2A Impact Analyzer.agent.md` - System-wide impact
- `PAW-R2B Gap Analyzer.agent.md` - Identifies issues
- `PAW-R3A Feedback Generator.agent.md` - Creates review comments
- `PAW-R3B Feedback Critic.agent.md` - Reviews feedback quality

**Common Agent Structure Patterns**:
- Initial Setup section checking for `WorkflowContext.md` or `ReviewContext.md`
- Workflow Mode and Review Strategy handling sections
- WorkflowContext.md Parameters documentation
- Hand-off sections at completion (currently informal)

**Current Hand-off Language** (informal, not standardized):

Agents currently use informal completion language like:
- "Next: Return to Implementation Plan Agent..." (PAW-02A Code Researcher.agent.md:241)
- "Your next steps..." (PAW-01A Specification.agent.md)
- No standardized command keywords
- No mode-aware automatic transitions
- No tool-based stage transitions

**Implications for Handoff Implementation**:
- Need to add standardized handoff sections to all 15 agents
- Each agent needs mode-specific behavior (manual/semi-auto/auto)
- Review agents use `ReviewContext.md` instead of `WorkflowContext.md`
- Handoff patterns must distinguish between standard and review workflows

### WorkflowContext.md Format and Usage

**Format Definition**: Multiple sources define WorkflowContext.md structure

Minimal format from `src/prompts/workItemInitPrompt.template.md` (lines 49-62):
```markdown
# WorkflowContext

Work Title: <generated_work_title>
Feature Slug: <generated_feature_slug>
Target Branch: <target_branch>
Workflow Mode: <full|minimal|custom>
Review Strategy: <prs|local>
Custom Workflow Instructions: <text or none>
Issue URL: <issue_url_or_none>
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

**Current Fields**:
- **Work Title**: 2-4 word human-readable name for PR titles
- **Feature Slug**: Normalized identifier (lowercase, hyphens, 1-100 chars)
- **Target Branch**: Git branch that will hold completed work
- **Workflow Mode**: full, minimal, or custom
- **Review Strategy**: prs (intermediate PRs) or local (single final PR)
- **Custom Workflow Instructions**: Free-text for custom mode
- **Issue URL**: GitHub or Azure DevOps work item URL
- **Remote**: Git remote name (default: "origin")
- **Artifact Paths**: Location hint (default: "auto-derived")
- **Additional Inputs**: Comma-separated extras

**Missing for Handoff Feature** (from Spec.md FR-014, FR-015):
- **Handoff Mode** field (manual, semi-auto, auto) - not yet implemented

**Context Retrieval**: `src/tools/contextTool.ts` (lines 175-214)

The `getContext()` function loads three sources:
1. Workspace custom instructions: `.paw/instructions/<agent-name>-instructions.md`
2. User custom instructions: `~/.paw/instructions/<agent-name>-instructions.md`
3. Workflow context: `.paw/work/<feature-slug>/WorkflowContext.md`

**ReviewContext.md**: Review workflows use separate context files stored in `.paw/reviews/PR-<number>/` or `.paw/reviews/<branch-slug>/` (from PAW-R3A agent, line 14).

**Implications for Handoff Implementation**:
- Need to add "Handoff Mode" field to WorkflowContext.md format
- Need to create ReviewContext.md specification with same field
- Context retrieval already supports reading these files
- Agents already check for and parse WorkflowContext.md at startup

### Prompt Template Generation System

**Tool Implementation**: `src/tools/createPromptTemplates.ts`

**Workflow Mode Support** (lines 124-181):

The `determineStagesFromMode()` function already implements stage filtering:
```typescript
function determineStagesFromMode(
  workflowMode: string | undefined,
  explicitStages: WorkflowStage[] | undefined
): WorkflowStage[] {
  // Returns different stage arrays based on mode:
  // - full: All 9 stages
  // - minimal: 6 core stages (skips spec and docs)
  // - custom: Uses explicitStages or falls back to minimal
}
```

**Prompt File Structure** (lines 183-208):

Prompt files contain:
- Frontmatter with `agent: <agent-name>` field
- Instruction text
- Work ID parameter

Example:
```markdown
---
agent: PAW-02A Code Researcher
---

Research the codebase for this work item.

Work ID: workflow-handoffs
```

**Template Definitions** (lines 96-122):

All prompt templates are defined with stage mapping:
```typescript
const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    filename: "01A-spec.prompt.md",
    mode: "PAW-01A Specification",
    instruction: "Create specification for this work item.",
    stage: WorkflowStage.Spec,
  },
  // ... 9 more templates
];
```

**Implications for Dynamic Prompt Generation**:
- Existing logic can be extended for on-demand generation
- Phase-specific prompts will need new template generation logic
- Can filter by stage for any workflow mode
- Tool already handles directory creation and file writing

### Git and GitHub Integration Patterns

**Git Validation Utilities**: `src/git/validation.ts`

Currently provides:
- `validateGitRepository(workspacePath)` - Checks if directory is git repo (lines 16-22)
- `hasUncommittedChanges(workspacePath)` - Detects uncommitted changes (lines 39-47)

Both use `child_process.exec` with promisified async interface.

**Missing for Status Agent**:
- Current branch detection (need `git branch --show-current`)
- Branch relationship checking (need `git rev-list --count main..feature`)
- Remote branch comparison (need `git fetch` + `git status`)
- Conflict detection

**GitHub Integration**:

No GitHub API integration in extension code. Agents use GitHub MCP tools (Model Context Protocol) which are separate from the extension.

From agent instructions, GitHub MCP tools available:
- `mcp_github_pull_request_read` - Get PR details
- `mcp_github_search_pull_requests` - Search for PRs
- `mcp_github_issue_read` - Read issues
- `mcp_github_list_commits` - List commits

**Implications for Status Agent**:
- Extension tools should provide git operations
- GitHub queries should use MCP tools in agent instructions
- Status Query Tool needs git command execution utilities
- Can extend `src/git/validation.ts` with new git operations

### Workflow Artifact Organization

**Standard Workflow Artifacts**: Stored in `.paw/work/<feature-slug>/`

Based on agent references and existing examples:
- `WorkflowContext.md` - Workflow metadata and configuration
- `Spec.md` - Feature specification (full mode)
- `SpecResearch.md` - Research answers (full mode)
- `CodeResearch.md` - Codebase investigation findings
- `ImplementationPlan.md` - Multi-phase implementation plan
- `Docs.md` - Generated documentation (full mode)
- `prompts/` directory - Stage-specific prompt files

**Prompt Files** (in `prompts/` subdirectory):
- `01A-spec.prompt.md` - Specification stage
- `01B-spec-research.prompt.md` - Spec research stage (generated on demand)
- `02A-code-research.prompt.md` - Code research stage
- `02B-impl-plan.prompt.md` - Implementation planning
- `03A-implement.prompt.md` - Implementation
- `03B-review.prompt.md` - Implementation review
- `03C-pr-review.prompt.md` - PR review response
- `03D-review-pr-review.prompt.md` - Review of PR responses
- `04-docs.prompt.md` - Documentation generation
- `05-pr.prompt.md` - Final PR creation
- `0X-status.prompt.md` - Status update

**Review Workflow Artifacts**: Stored in `.paw/reviews/PR-<number>/` or `.paw/reviews/<branch-slug>/`

Based on PAW-R3A agent references (lines 14-18):
- `ReviewContext.md` - PR metadata and parameters
- `CodeResearch.md` - Baseline codebase understanding
- `DerivedSpec.md` - What the PR is trying to achieve
- `ImpactAnalysis.md` - System-wide impact assessment
- `GapAnalysis.md` - Categorized findings with evidence
- `ReviewComments.md` - Generated review comments

**Artifact Naming Conventions**:
- PascalCase with `.md` extension
- Descriptive names indicating content type
- Consistent locations (workflow vs. review directories)

**Implications for Status Agent**:
- Can scan directory to identify completed stages
- Standard artifact names enable reliable stage detection
- Missing artifacts indicate incomplete stages
- Separate directories for standard vs. review workflows

## Code References

### Extension Tool Registration
- `src/extension.ts:44` - `registerPromptTemplatesTool(context)` call
- `src/extension.ts:47` - `registerContextTool(context)` call
- `src/tools/contextTool.ts:310-341` - `paw_get_context` tool registration
- `src/tools/createPromptTemplates.ts:349-384` - `paw_create_prompt_templates` tool registration

### Agent System
- `src/agents/installer.ts:279-390` - `installAgents()` function - agent installation logic
- `src/agents/agentTemplates.ts:206-276` - `loadAgentTemplates()` - reads and processes .agent.md files
- `src/agents/agentTemplates.ts:92-108` - `deriveAgentName()` - extracts agent name from filename
- `src/agents/platformDetection.ts:144-178` - `resolvePromptsDirectory()` - platform-specific paths

### Context Management
- `src/tools/contextTool.ts:175-214` - `getContext()` - loads workspace/user instructions and workflow context
- `src/tools/contextTool.ts:54-74` - `loadWorkflowContext()` - reads WorkflowContext.md file
- `src/tools/contextTool.ts:88-111` - `loadCustomInstructions()` - reads agent-specific instructions
- `src/tools/contextTool.ts:246-275` - `formatContextResponse()` - formats context as XML-wrapped markdown

### Prompt Template System
- `src/tools/createPromptTemplates.ts:124-181` - `determineStagesFromMode()` - stage filtering by workflow mode
- `src/tools/createPromptTemplates.ts:96-122` - `PROMPT_TEMPLATES` - array of all template definitions
- `src/tools/createPromptTemplates.ts:183-208` - `generatePromptTemplate()` - creates prompt file content
- `src/tools/createPromptTemplates.ts:223-277` - `createPromptTemplates()` - main implementation function

### Git Operations
- `src/git/validation.ts:16-22` - `validateGitRepository()` - checks if directory is git repo
- `src/git/validation.ts:39-47` - `hasUncommittedChanges()` - detects uncommitted changes

### Agent Instruction Patterns
- `agents/PAW-01A Specification.agent.md:1-100` - Spec agent structure and WorkflowContext handling
- `agents/PAW-02A Code Researcher.agent.md:1-100` - Code research agent structure
- `agents/PAW-X Status Update.agent.md:1-100` - Status agent structure (existing)
- `agents/components/paw-context.component.md:1-20` - Shared PAW context component

## Architecture Documentation

### Language Model Tool Registration Pattern

The extension follows a consistent pattern for registering language model tools:

1. **Tool Registration** (`src/extension.ts:44-48`):
   - Tools are registered during `activate()` function
   - Each tool gets its own registration function (e.g., `registerContextTool()`)
   - Tool disposables are added to `context.subscriptions` for lifecycle management

2. **Tool Implementation Structure**:
   ```typescript
   // Define parameter interface
   interface ToolParams {
     param1: string;
     param2?: string;
   }
   
   // Register with VS Code's LM API
   const tool = vscode.lm.registerTool<ToolParams>('tool_name', {
     async prepareInvocation(options, _token) {
       // Return user-facing messages for tool approval UI
       return {
         invocationMessage: "What the tool will do",
         confirmationMessages: {
           title: "Confirmation Dialog Title",
           message: new vscode.MarkdownString("Details...")
         }
       };
     },
     async invoke(options, _token) {
       // Implement tool logic
       const result = await doWork(options.input);
       
       // Return result as language model text
       return new vscode.LanguageModelToolResult([
         new vscode.LanguageModelTextPart(result)
       ]);
     }
   });
   
   context.subscriptions.push(tool);
   ```

3. **Key Design Principles**:
   - Tools are procedural (do specific tasks reliably)
   - Agents provide decision-making logic
   - Tools return structured text results
   - Error handling returns error messages, doesn't throw
   - Cancellation token support for long-running operations

### Agent Installation and Discovery

Agents are installed to platform-specific directories where GitHub Copilot can discover them:

1. **Directory Resolution** (`src/agents/platformDetection.ts:144-178`):
   - Platform detection via `os.platform()` and `process.env.VSCODE_CWD`
   - WSL detection via `/proc/version` file parsing
   - Variant detection (Cursor, VS Code, other)
   - Fallback to custom directory from `paw.promptDirectory` setting

2. **Agent Template Processing** (`src/agents/agentTemplates.ts:206-276`):
   - Scans `agents/` directory for `.agent.md` files
   - Parses YAML frontmatter with `yaml.load()`
   - Processes component placeholders (e.g., `{{PAW_CONTEXT}}`)
   - Returns structured templates with metadata

3. **Installation Logic** (`src/agents/installer.ts:279-390`):
   - Creates prompts directory if missing
   - Cleans up previous installation on version change
   - Writes agent files to prompts directory
   - Tracks installation state in VS Code globalState
   - Development builds (-dev suffix) reinstall on every activation

### Workflow Context Management

Context retrieval follows a three-layer precedence model:

1. **Workspace Instructions** (highest precedence):
   - Location: `.paw/instructions/<agent-name>-instructions.md`
   - Scope: Specific to current workspace
   - Use case: Project-specific agent customizations

2. **User Instructions** (medium precedence):
   - Location: `~/.paw/instructions/<agent-name>-instructions.md`
   - Scope: User's global preferences
   - Use case: Personal agent preferences across projects

3. **Workflow Context** (baseline):
   - Location: `.paw/work/<feature-slug>/WorkflowContext.md`
   - Scope: Specific work item metadata
   - Use case: Work item parameters and configuration

**Context Retrieval Flow** (`src/tools/contextTool.ts:175-214`):
```
1. Validate feature_slug format and agent_name
2. Resolve workspace path containing .paw/work/<feature-slug>/
3. Load workspace instructions (if exists)
4. Load user instructions (if exists)
5. Load WorkflowContext.md (required - error if missing)
6. Return formatted result with XML-wrapped sections
```

**Format Response** (`src/tools/contextTool.ts:246-275`):
- Workspace instructions wrapped in `<workspace_instructions>` tags
- User instructions wrapped in `<user_instructions>` tags
- Workflow context wrapped in `<workflow_context>` with markdown code fence
- Empty state: `<context status="empty" />`

## Open Questions

1. **Frontmatter Parsing for Stage Transition**: How should the Stage Transition Tool parse agent frontmatter from prompt files to determine which agent to invoke? The current prompt template format only includes `agent: <name>` field - is this sufficient?

2. **New Chat Creation**: How does a language model tool create a new chat with a specific agent? The VS Code LM API doesn't appear to have explicit "create chat" functionality - investigation needed.

3. **Mode-Specific Tool Behavior**: Should the Stage Transition Tool itself be mode-aware (reading WorkflowContext.md), or should agents control all mode logic and invoke the tool unconditionally?

4. **ReviewContext.md Specification**: ReviewContext.md is referenced in review agents but no formal specification exists. What fields should it contain beyond what's in WorkflowContext.md?

5. **GitHub MCP Tool Availability**: Are GitHub MCP tools (for PR queries) automatically available to all agents, or do they need special activation? How should Status Agent invoke GitHub tools?

6. **Status Query Tool Scope**: Should Status Query Tool be a single tool that returns comprehensive status, or multiple smaller tools (scan artifacts, check git, query PRs) that agents compose?

7. **Dynamic Prompt Generation Timing**: When generating prompts on demand, should the tool create the file and return the path, or should it create the file and automatically invoke the agent? What's the expected user flow?

8. **Phase-Specific Prompt Context**: How should dynamic phase prompts incorporate phase context from ImplementationPlan.md? Parse the plan file in the tool, or have the agent pass phase context as a parameter?
