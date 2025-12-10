---
date: 2025-12-10 13:53:31 EST
git_commit: 6eb815e9651cd76bc6570ab04c08335802699827
branch: feature/142-cross-repository-workflow-supervisor
repository: phased-agent-workflow
topic: "Cross-Repository Workflow Supervisor Implementation Foundations"
tags: [research, codebase, initialization, context-tools, agent-system, workspace-detection]
status: complete
last_updated: 2025-12-10
---

# Research: Cross-Repository Workflow Supervisor Implementation Foundations

**Date**: 2025-12-10 13:53:31 EST
**Git Commit**: 6eb815e9651cd76bc6570ab04c08335802699827
**Branch**: feature/142-cross-repository-workflow-supervisor
**Repository**: phased-agent-workflow

## Research Question

How does the current PAW implementation handle workflow initialization, context management, agent coordination, and workspace detection? What are the precise code locations and patterns that will inform implementation planning for the Cross-Repository Workflow Supervisor feature?

## Summary

PAW's single-repository workflow provides a robust foundation for building the Cross-Repository Workflow Supervisor. The initialization flow (`src/commands/initializeWorkItem.ts`) uses VS Code commands to collect user inputs, validate git repositories, and construct agent prompts with template variables. The context tool (`src/tools/contextTool.ts`) already supports multi-root workspaces by searching all workspace folders for Work ID directories. The handoff tool (`src/tools/handoffTool.ts`) enables agent coordination through chat session management. The agent template system (`src/agents/`) provides component-based template expansion for creating reusable agent structures. Multi-root workspace support exists via `vscode.workspace.workspaceFolders` API throughout the codebase. Standard artifacts live in `.paw/work/<feature-slug>/` with well-defined structures including WorkflowContext.md, Spec.md, CodeResearch.md, and ImplementationPlan.md.

The supervisor workflow will extend these patterns by: (1) detecting multi-root workspaces during initialization, (2) identifying git repositories across workspace folders, (3) storing supervisor artifacts in `.paw/multi-work/<work-id>/` at workspace root, (4) leveraging existing context and handoff tools for coordination, and (5) initializing standard child workflows in each affected repository. All necessary primitives exist; implementation requires composing these capabilities with supervisor-specific logic.

## Detailed Findings

### 1. Workflow Initialization Flow

**Entry Point**: `src/commands/initializeWorkItem.ts:28-124`

The `initializeWorkItemCommand` function orchestrates workflow initialization:

1. **Workspace Validation** (`src/commands/initializeWorkItem.ts:41-50`):
   ```typescript
   const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
   if (!workspaceFolder) {
     vscode.window.showErrorMessage(
       'No workspace folder open. Please open a workspace to initialize a PAW workflow.'
     );
     return;
   }
   ```
   - Uses `vscode.workspace.workspaceFolders?.[0]` to get first workspace folder
   - Shows error message if no workspace is open
   - Current implementation assumes single-folder workflow

2. **Git Repository Validation** (`src/commands/initializeWorkItem.ts:54-62`, `src/git/validation.ts:10-16`):
   ```typescript
   const isGitRepo = await validateGitRepository(workspaceFolder.uri.fsPath);
   if (!isGitRepo) {
     vscode.window.showErrorMessage(
       'PAW requires a Git repository. Please initialize Git with: git init'
     );
     return;
   }
   ```
   - Validates workspace is a git repository using `git rev-parse --git-dir`
   - Implementation in `src/git/validation.ts:10-16`:
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
   - Reliable detection method that works in subdirectories and various git configurations

3. **Custom Instructions Check** (`src/commands/initializeWorkItem.ts:66-75`):
   ```typescript
   const customInstructionsPath = path.join(
     workspaceFolder.uri.fsPath,
     WORKFLOW_INIT_CUSTOM_INSTRUCTIONS_PATH
   );
   const hasCustomInstructions = fs.existsSync(customInstructionsPath);
   ```
   - Checks for optional `.paw/instructions/init-instructions.md`
   - Logged but not loaded by extension (agent loads it later)

4. **User Input Collection** (`src/commands/initializeWorkItem.ts:79-101`):
   - Delegates to `collectUserInputs()` from `src/ui/userInput.ts`
   - Collects: target branch, workflow mode, review strategy, handoff mode, issue URL
   - Returns `undefined` if user cancels

5. **Agent Prompt Construction** (`src/commands/initializeWorkItem.ts:103-111`):
   ```typescript
   const prompt = constructAgentPrompt(
     inputs.targetBranch,
     inputs.workflowMode,
     inputs.reviewStrategy,
     inputs.handoffMode,
     inputs.issueUrl,
     workspaceFolder.uri.fsPath
   );
   ```
   - Builds complete agent prompt with all parameters
   - Implementation in `src/prompts/workflowInitPrompt.ts`

6. **Agent Invocation** (`src/commands/initializeWorkItem.ts:117-122`):
   ```typescript
   await vscode.commands.executeCommand('workbench.action.chat.newChat').then(async value => {
     await vscode.commands.executeCommand('workbench.action.chat.open', {
       query: prompt,
       mode: 'agent'
     });
   });
   ```
   - Creates new chat session with `workbench.action.chat.newChat`
   - Opens agent mode with constructed prompt
   - Agent handles all file operations, git operations, and slug normalization

**Implications for Supervisor**:
- Extend workspace validation to detect multi-root workspaces
- Add workflow type selection before collecting other inputs
- Iterate `vscode.workspace.workspaceFolders` to identify all git repositories
- Pass multi-repository context to supervisor agent instead of PAW-01A

---

### 2. User Input Collection

**Implementation**: `src/ui/userInput.ts`

**Type Definitions** (`src/ui/userInput.ts:8-24`):
```typescript
export type WorkflowMode = 'full' | 'minimal' | 'custom';
export type ReviewStrategy = 'prs' | 'local';
export type HandoffMode = 'manual' | 'semi-auto' | 'auto';

export interface WorkflowModeSelection {
  mode: WorkflowMode;
  customInstructions?: string;
}

export interface WorkItemInputs {
  targetBranch: string;
  workflowMode: WorkflowModeSelection;
  reviewStrategy: ReviewStrategy;
  handoffMode: HandoffMode;
  issueUrl?: string;
}
```

**Workflow Mode Collection** (`src/ui/userInput.ts:119-162`):
- Quick Pick menu with three options: Full, Minimal, Custom
- Full: All stages (spec, research, planning, implementation, docs, PR)
- Minimal: Core stages only (research, planning, implementation, PR)
- Custom: User-defined stages via custom instructions (min 10 characters)
- Returns `WorkflowModeSelection` or `undefined` if cancelled

**Review Strategy Collection** (`src/ui/userInput.ts:180-220`):
- Quick Pick menu with two options: PRs, Local
- PRs: Create intermediate PRs (planning, phase, docs branches)
- Local: Single branch workflow with only final PR
- Minimal mode auto-selects 'local' strategy without prompting (`src/ui/userInput.ts:186-189`)

**Handoff Mode Collection** (`src/ui/userInput.ts:235-292`):
- Quick Pick menu with Manual, Semi-Auto options always available
- Auto option only available with local review strategy (`src/ui/userInput.ts:265-271`)
- Validates that auto mode requires local strategy

**Main Collection Function** (`src/ui/userInput.ts:294-396`):
- Sequentially collects: target branch, workflow mode, review strategy, handoff mode, issue URL
- Validates branch name format (`/^[a-zA-Z0-9/_-]+$/`)
- Validates issue URL format (GitHub and Azure DevOps patterns)
- Returns `undefined` if user cancels at any step

**Implications for Supervisor**:
- Add workflow type selection (Implementation/Cross-Repository/Review) before workflow mode
- Reuse existing Quick Pick patterns for consistency
- Collect affected repository selection after detecting multi-root workspace
- Pass repository list as new parameter to supervisor initialization

---

### 3. Prompt Template System

**Main Template File**: `src/prompts/workItemInitPrompt.ts`

**Template Loading** (`src/prompts/workflowInitPrompt.ts:57-93`):
```typescript
function loadTemplate(filename: string): string {
  const compiledPath = path.join(__dirname, filename);
  if (fs.existsSync(compiledPath)) {
    return fs.readFileSync(compiledPath, 'utf-8');
  }

  const sourcePath = path.join(__dirname, '..', '..', 'src', 'prompts', filename);
  if (fs.existsSync(sourcePath)) {
    return fs.readFileSync(sourcePath, 'utf-8');
  }

  throw new Error(`${filename} not found in compiled or source locations`);
}
```
- Checks compiled location first (`out/prompts/`)
- Falls back to source location (`src/prompts/`)
- Works in both production (compiled) and development (TypeScript) environments

**Available Templates**:
- `workItemInitPrompt.template.md`: Main initialization prompt
- `branchAutoDeriveWithIssue.template.md`: Branch derivation with issue URL
- `branchAutoDeriveWithDescription.template.md`: Branch derivation from description
- `workDescription.template.md`: Work description collection
- `handoffManual.template.md`, `handoffSemiAuto.template.md`, `handoffAuto.template.md`: Handoff instructions

**Variable Substitution** (`src/prompts/workflowInitPrompt.ts:115-123`):
```typescript
function substituteVariables(template: string, variables: PromptVariables): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value);
  }
  
  return result;
}
```
- Simple string replacement of `{{VARIABLE_NAME}}` placeholders
- No nested variable support or conditional logic

**Prompt Construction** (`src/prompts/workflowInitPrompt.ts:155-258`):
- Builds `PromptVariables` object with all substitution values
- Includes: target branch, workflow mode, review strategy, handoff mode, issue URL, workspace path
- Adds conditional sections: branch auto-derive, work description, custom instructions
- Loads custom instructions from `.paw/instructions/init-instructions.md` if present
- Substitutes all variables in main template
- Returns complete prompt string

**Implications for Supervisor**:
- Create supervisor initialization template (`supervisorInitPrompt.template.md`)
- Add variables for multi-repository context (repository list, workspace root)
- Reuse template loading and substitution infrastructure
- Template should invoke supervisor specification agent instead of PAW-01A

---

### 4. Context Tool Implementation

**File**: `src/tools/contextTool.ts`

**Tool Registration** (`src/tools/contextTool.ts:432-494`):
```typescript
export function registerContextTool(context: vscode.ExtensionContext): void {
  const tool = vscode.lm.registerTool<ContextParams>(
    'paw_get_context',
    {
      async prepareInvocation(options, _token) { ... },
      async invoke(options, token) {
        const result = await getContext(options.input);
        const formattedResponse = formatContextResponse(result);
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(formattedResponse)
        ]);
      }
    }
  );
  context.subscriptions.push(tool);
}
```
- Registers as Language Model Tool with name `paw_get_context`
- Takes parameters: `feature_slug` (Work ID), `agent_name`
- Returns formatted response with XML-tagged sections

**Workspace Path Resolution** (`src/tools/contextTool.ts:229-266`):
```typescript
function getWorkspaceFolderPaths(): string[] {
  const paths: string[] = [];

  // Check for test/override path first
  const override = process.env.PAW_WORKSPACE_PATH?.trim();
  if (override) {
    paths.push(override);
  }

  // Only access VS Code workspace API if no override is set
  if (paths.length === 0) {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      paths.push(...folders.map(folder => folder.uri.fsPath));
    }
  }

  return paths;
}

function resolveWorkspacePath(featureSlug: string): { workspacePath: string; featureDir: string } {
  const folderPaths = getWorkspaceFolderPaths();
  if (folderPaths.length === 0) {
    throw new Error('Unable to determine workspace path: no workspace folder is currently open.');
  }

  // Search for workspace containing the Work ID
  for (const folderPath of folderPaths) {
    const featureDir = path.join(folderPath, '.paw', 'work', featureSlug);
    if (fs.existsSync(featureDir)) {
      return { workspacePath: folderPath, featureDir };
    }
  }

  throw new Error(
    `Work ID '${featureSlug}' not found in any workspace. ` +
    `Expected directory .paw/work/${featureSlug}/ to exist in one of: ${workspacePaths}`
  );
}
```
- **Already supports multi-root workspaces**: Iterates all workspace folders
- Searches each folder for `.paw/work/<feature-slug>/` directory
- Returns first match found
- Throws error if Work ID not found in any workspace

**Context Loading** (`src/tools/contextTool.ts:320-341`):
```typescript
export async function getContext(params: ContextParams): Promise<ContextResult> {
  const { featureSlug, agentName } = validateParams(params);

  // Validate that Work ID directory exists - throws error if not found
  const { workspacePath, featureDir } = resolveWorkspacePath(featureSlug);

  const workspaceInstructionsDir = path.join(workspacePath, '.paw', 'instructions');
  const userInstructionsDir = path.join(os.homedir(), '.paw', 'instructions');
  const workflowContextPath = path.join(featureDir, 'WorkflowContext.md');

  const workspaceInstructions = loadCustomInstructions(workspaceInstructionsDir, agentName);
  const userInstructions = loadCustomInstructions(userInstructionsDir, agentName);
  const workflowContext = loadWorkflowContext(workflowContextPath);

  return {
    workspace_instructions: workspaceInstructions,
    user_instructions: userInstructions,
    workflow_context: workflowContext,
  };
}
```
- Validates Work ID format (lowercase letters, numbers, hyphens)
- Resolves workspace path and feature directory
- Loads three sources: workspace instructions, user instructions, workflow context
- Returns structured result with status flags

**Custom Instructions Loading** (`src/tools/contextTool.ts:197-219`):
```typescript
export function loadCustomInstructions(directory: string, agentName: string): InstructionStatus {
  try {
    if (!fs.existsSync(directory)) {
      return { exists: false, content: '' };
    }

    const filePath = path.join(directory, `${agentName}-instructions.md`);
    if (!fs.existsSync(filePath)) {
      return { exists: false, content: '' };
    }

    const fileContent = normalizeContent(fs.readFileSync(filePath, 'utf-8'));
    return { exists: true, content: fileContent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exists: true,
      content: '',
      error: `Failed to read custom instructions: ${message}`,
    };
  }
}
```
- Looks for `<agentName>-instructions.md` in provided directory
- Returns `{ exists: false, content: '' }` if file not found (graceful handling)
- Returns error in result if file exists but read fails

**Response Formatting** (`src/tools/contextTool.ts:365-428`):
```typescript
export function formatContextResponse(result: ContextResult): string {
  // ... checks for content existence ...
  
  const sections: string[] = [];

  const workspaceSection = formatInstructionSection('workspace_instructions', result.workspace_instructions);
  if (workspaceSection) {
    sections.push(workspaceSection);
  }

  const userSection = formatInstructionSection('user_instructions', result.user_instructions);
  if (userSection) {
    sections.push(userSection);
  }

  if (hasWorkflowContent) {
    const workflowParts: string[] = ['<workflow_context>'];
    if (result.workflow_context.content) {
      workflowParts.push('```markdown');
      workflowParts.push(result.workflow_context.content);
      workflowParts.push('```');
    }
    if (result.workflow_context.error) {
      workflowParts.push(`<warning>${result.workflow_context.error}</warning>`);
    }
    workflowParts.push('</workflow_context>');
    sections.push(workflowParts.join('\n'));
  }

  // Parse handoff mode and add instructions at END for recency bias
  const handoffMode = parseHandoffMode(result.workflow_context.content || '');
  const handoffInstructions = getHandoffInstructions(handoffMode);
  sections.push(`<handoff_instructions>\n${handoffInstructions}\n</handoff_instructions>`);

  return sections.join('\n\n');
}
```
- Returns XML-tagged sections: `<workspace_instructions>`, `<user_instructions>`, `<workflow_context>`, `<handoff_instructions>`
- Workflow context wrapped in markdown code fence
- Handoff instructions added at end for recency bias
- Returns `<context status="empty" />` if no content exists

**Handoff Mode Parsing** (`src/tools/contextTool.ts:122-133`):
```typescript
const HANDOFF_MODE_PATTERN = /^Handoff Mode:\s*(manual|semi-auto|auto)\s*$/im;

export function parseHandoffMode(workflowContent: string): HandoffMode {
  if (!workflowContent) {
    return "manual";
  }

  const match = workflowContent.match(HANDOFF_MODE_PATTERN);
  if (match) {
    return match[1].toLowerCase() as HandoffMode;
  }

  return "manual";
}
```
- Extracts handoff mode from WorkflowContext.md content
- Pattern matches "Handoff Mode: <mode>" line (case-insensitive)
- Returns 'manual' as default if not found

**Handoff Instructions Loading** (`src/tools/contextTool.ts:144-172`):
```typescript
const HANDOFF_TEMPLATE_FILES: Record<HandoffMode, string> = {
  manual: "handoffManual.template.md",
  "semi-auto": "handoffSemiAuto.template.md",
  auto: "handoffAuto.template.md",
};

export function getHandoffInstructions(mode: HandoffMode): string {
  const templateFile = HANDOFF_TEMPLATE_FILES[mode] || HANDOFF_TEMPLATE_FILES["manual"];
  const templatePath = getHandoffTemplatePath(templateFile);

  try {
    if (templatePath && fs.existsSync(templatePath)) {
      return normalizeContent(fs.readFileSync(templatePath, "utf-8"));
    }
  } catch (error) {
    // Fall through to fallback
  }

  // Fallback if template file is missing or unreadable
  return `## Your Handoff Behavior (${mode.charAt(0).toUpperCase() + mode.slice(1)} Mode)

Handoff instructions template not found. Please check your PAW installation.

Default behavior: Present "Next Steps" and wait for user command.`;
}
```
- Loads mode-specific handoff instructions from template files
- Templates located in `src/prompts/` directory
- Checks both compiled and source locations
- Returns fallback message if template not found

**Implications for Supervisor**:
- Context tool already supports multi-root workspaces - no modification needed
- Add supervisor-specific context resolution for `.paw/multi-work/` location
- Extend `resolveWorkspacePath` to check both `.paw/work/` and `.paw/multi-work/`
- Create `SupervisorContext.md` structure analogous to `WorkflowContext.md`
- Consider supervisor-specific custom instructions (e.g., `SupervisorSpec-instructions.md`)

---

### 5. Agent Handoff System

**File**: `src/tools/handoffTool.ts`

**Agent Name Enumeration** (`src/tools/handoffTool.ts:6-15`):
```typescript
export type AgentName =
  | "PAW-01A Specification"
  | "PAW-01B Spec Researcher"
  | "PAW-02A Code Researcher"
  | "PAW-02B Impl Planner"
  | "PAW-03A Implementer"
  | "PAW-03B Impl Reviewer"
  | "PAW-04 Documenter"
  | "PAW-05 PR"
  | "PAW-X Status";
```
- TypeScript enum of valid agent names
- Enforces type safety for handoff calls
- Used in tool registration and validation

**Handoff Parameters** (`src/tools/handoffTool.ts:20-28`):
```typescript
export interface HandoffParams {
  target_agent: AgentName;
  work_id: string;
  inline_instruction?: string;
}
```
- `target_agent`: Which agent to invoke
- `work_id`: Feature slug (normalized Work ID)
- `inline_instruction`: Optional context to pass (user feedback, prompt paths, phase info)

**Work ID Validation** (`src/tools/handoffTool.ts:34-47`):
```typescript
const WORK_ID_PATTERN = /^[a-z0-9-]+$/;

function validateWorkId(workId: string): void {
  if (!workId || workId.trim().length === 0) {
    throw new Error("Work ID cannot be empty");
  }

  if (!WORK_ID_PATTERN.test(workId)) {
    throw new Error(
      `Invalid Work ID format: "${workId}". ` +
        "Work IDs must contain only lowercase letters, numbers, and hyphens."
    );
  }
}
```
- Validates Work ID format before invocation
- Prevents path traversal and invalid characters
- Throws error with clear message if invalid

**Prompt Construction** (`src/tools/handoffTool.ts:53-61`):
```typescript
function constructPrompt(params: HandoffParams): string {
  let prompt = `Work ID: ${params.work_id}`;

  if (params.inline_instruction) {
    prompt += `\n\n${params.inline_instruction}`;
  }

  return prompt;
}
```
- Minimal prompt with Work ID and optional inline instruction
- Target agent receives prompt in new chat session

**Agent Invocation** (`src/tools/handoffTool.ts:69-89`):
```typescript
async function invokeAgent(
  params: HandoffParams,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const prompt = constructPrompt(params);

  outputChannel.appendLine(`[INFO] Invoking agent: ${params.target_agent}`);
  outputChannel.appendLine(`[INFO] Work ID: ${params.work_id}`);

  // Create new chat and open with agent mode
  await vscode.commands
    .executeCommand("workbench.action.chat.newChat")
    .then(async (value) => {
      outputChannel.appendLine("[INFO] New chat session created: " + String(value));
      await vscode.commands.executeCommand("workbench.action.chat.open", {
        query: prompt,
        mode: params.target_agent,
      });
    });
}
```
- Creates new chat session with `workbench.action.chat.newChat`
- Opens chat with target agent mode and constructed prompt
- Fire-and-forget pattern: cannot wait for agent completion
- New chat session interrupts current conversation

**Tool Registration** (`src/tools/handoffTool.ts:96-155`):
```typescript
export function registerHandoffTool(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): void {
  const tool = vscode.lm.registerTool<HandoffParams>("paw_call_agent", {
    async prepareInvocation(options, _token) {
      const { target_agent, work_id, inline_instruction } = options.input;

      let message = `This will start a new chat with **${target_agent}** for feature: ${work_id}`;
      if (inline_instruction) {
        message += `\n\nWith instruction: "${inline_instruction}"`;
      }

      return {
        invocationMessage: `Calling ${target_agent} for ${work_id}`,
        confirmationMessages: {
          title: "Call PAW Agent",
          message: new vscode.MarkdownString(message),
        },
      };
    },
    async invoke(options, token) {
      // ... cancellation check ...
      const params = options.input;
      validateWorkId(params.work_id);
      await invokeAgent(params, outputChannel);
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart(""),
      ]);
    }
  });

  context.subscriptions.push(tool);
}
```
- Registers as Language Model Tool with name `paw_call_agent`
- Shows confirmation dialog with target agent and Work ID
- Validates Work ID before invocation
- Returns empty string on success (new chat interrupts)

**Work ID Resolution**:
- Tool only passes Work ID string; resolution happens when target agent calls `paw_get_context`
- Context tool searches all workspace folders for `.paw/work/<work-id>/` directory
- **Already supports child workflows in subdirectories**: No modification needed

**Implications for Supervisor**:
- Add supervisor agent names to `AgentName` enum (e.g., "SupervisorSpec", "SupervisorPlanner", "SupervisorValidator")
- Handoff tool works as-is for invoking child workflows (pass child Work ID)
- Supervisor can invoke standard agents in child repositories using existing tool
- Child workflows discovered via standard `.paw/work/<work-id>/` structure

---

### 6. Agent Template System

**Agent Template Loading**: `src/agents/agentTemplates.ts`

**Template Structure** (`src/agents/agentTemplates.ts:9-18`):
```typescript
export interface AgentTemplate {
  filename: string;         // e.g., 'PAW-01A Specification.agent.md'
  name: string;             // e.g., 'Specification'
  description: string;      // From YAML frontmatter
  content: string;          // Full processed content
}
```

**Directory Validation** (`src/agents/agentTemplates.ts:26-35`):
```typescript
function ensureAgentsDirectory(extensionUri: vscode.Uri): string {
  const agentsUri = vscode.Uri.joinPath(extensionUri, 'agents');
  const agentsPath = agentsUri.fsPath;

  if (!fs.existsSync(agentsPath)) {
    throw new Error(`Agents directory not found at ${agentsPath}`);
  }

  return agentsPath;
}
```

**Frontmatter Parsing** (`src/agents/agentTemplates.ts:45-73`):
```typescript
function extractFrontmatterDescription(content: string): string {
  if (!content.startsWith('---')) {
    return '';
  }

  const closingIndex = content.indexOf('\n---', 3);
  if (closingIndex === -1) {
    return '';
  }

  const frontmatter = content.substring(3, closingIndex).trim();
  const lines = frontmatter.split(/\r?\n/);
  for (const line of lines) {
    const [rawKey, ...rawValue] = line.split(':');
    if (!rawKey || rawValue.length === 0) {
      continue;
    }

    const key = rawKey.trim().toLowerCase();
    if (key === 'description') {
      const value = rawValue.join(':').trim();
      return value.replace(/^['"]|['"]$/g, '');
    }
  }

  return '';
}
```
- Extracts `description` field from YAML frontmatter
- Handles values with colons (joins value parts)
- Removes surrounding quotes if present

**Name Derivation** (`src/agents/agentTemplates.ts:85-89`):
```typescript
function deriveAgentName(filename: string): string {
  const withoutExtension = filename.replace(/\.agent\.md$/i, '');
  return withoutExtension.replace(/^PAW-[^\s]+\s*/i, '').trim();
}
```
- Removes `.agent.md` extension
- Removes `PAW-##X ` prefix (e.g., 'PAW-01A ', 'PAW-R1B ')
- Example: 'PAW-01A Specification.agent.md' → 'Specification'

**Template Loading** (`src/agents/agentTemplates.ts:118-153`):
```typescript
export function loadAgentTemplates(extensionUri: vscode.Uri): AgentTemplate[] {
  const agentsPath = ensureAgentsDirectory(extensionUri);
  const agentFiles = fs.readdirSync(agentsPath);
  const componentsDir = vscode.Uri.joinPath(extensionUri, 'agents', 'components').fsPath;
  const components = loadComponentTemplatesFromDirectory(componentsDir);
  const templates: AgentTemplate[] = [];

  for (const file of agentFiles) {
    if (!file.toLowerCase().endsWith('.agent.md')) {
      continue;
    }

    const absolutePath = path.join(agentsPath, file);
    const rawContent = fs.readFileSync(absolutePath, 'utf-8');
    const description = extractFrontmatterDescription(rawContent);
    const name = deriveAgentName(file);
    const agentIdentifier = deriveAgentIdentifier(file);
    
    // Process template substitutions
    const processedContent = processAgentTemplate(rawContent, agentIdentifier, components);

    templates.push({
      filename: file,
      name,
      description,
      content: processedContent
    });
  }

  return templates;
}
```
- Reads all `.agent.md` files from `agents/` directory
- Loads components from `agents/components/` directory
- Processes each template with component expansion
- Returns array of agent templates

**Component Processing**: `src/agents/agentTemplateRenderer.ts`

**Component Loading** (`src/agents/agentTemplateRenderer.ts:10-31`):
```typescript
export function loadComponentTemplatesFromDirectory(
  componentsDir: string
): Map<string, string> {
  const components = new Map<string, string>();

  if (!fs.existsSync(componentsDir)) {
    return components;
  }

  const componentFiles = fs.readdirSync(componentsDir);
  for (const file of componentFiles) {
    if (!file.toLowerCase().endsWith('.component.md')) {
      continue;
    }

    const componentPath = path.join(componentsDir, file);
    const componentName = file
      .replace(/\.component\.md$/i, '')
      .replace(/-/g, '_')
      .toUpperCase();

    components.set(componentName, fs.readFileSync(componentPath, 'utf-8'));
  }

  return components;
}
```
- Reads all `.component.md` files
- Converts filename to placeholder name: `paw-context.component.md` → `PAW_CONTEXT`
- Returns map of component names to content

**Variable Substitution** (`src/agents/agentTemplateRenderer.ts:37-43`):
```typescript
function substituteVariables(content: string, variables: Map<string, string>): string {
  let result = content;
  for (const [key, value] of variables.entries()) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value);
  }
  return result;
}
```
- Replaces `{{VARIABLE}}` placeholders in component content
- Currently supports `{{AGENT_NAME}}` variable

**Template Processing** (`src/agents/agentTemplateRenderer.ts:51-72`):
```typescript
export function processAgentTemplate(
  content: string,
  agentIdentifier: string,
  components: Map<string, string>
): string {
  let result = content;

  for (const [componentName, componentContent] of components.entries()) {
    const componentPlaceholder = `{{${componentName}}}`;
    if (!result.includes(componentPlaceholder)) {
      continue;
    }

    const expandedComponent = substituteVariables(
      componentContent,
      new Map<string, string>([['AGENT_NAME', agentIdentifier]])
    );

    result = result.split(componentPlaceholder).join(expandedComponent);
  }

  return result;
}
```
- Expands component placeholders in agent content
- Substitutes `{{AGENT_NAME}}` variable in components
- Returns fully processed agent content

**Existing Components**:
- `agents/components/paw-context.component.md`: PAW context retrieval instructions
- `agents/components/handoff-instructions.component.md`: Handoff behavior instructions
- Additional components for review workflow

**Implications for Supervisor**:
- Create supervisor agent files: `SupervisorSpec.agent.md`, `SupervisorPlanner.agent.md`, `SupervisorValidator.agent.md`
- Add supervisor agents to `AgentName` enum in `src/tools/handoffTool.ts`
- Reuse component system for shared sections (context retrieval, handoff)
- Create supervisor-specific components if needed (multi-repository context)

---

### 7. VS Code Workspace and Git APIs

**Multi-Root Workspace Access**:

**API Usage Locations**:
- `src/commands/initializeWorkItem.ts:41`: Gets first workspace folder for single-repo flow
- `src/tools/contextTool.ts:244-246`: Iterates all workspace folders for Work ID resolution
- `src/tools/promptGenerationTool.ts:226`: Gets workspace folders for prompt tool
- `src/commands/getWorkStatus.ts:76`: Gets workspace folders for status command

**Workspace Folder Structure**:
```typescript
interface WorkspaceFolder {
  uri: vscode.Uri;      // VS Code URI (use .fsPath for absolute path)
  name: string;         // Folder display name
  index: number;        // Position in workspace
}
```

**Access Pattern** (`src/tools/contextTool.ts:229-249`):
```typescript
function getWorkspaceFolderPaths(): string[] {
  const paths: string[] = [];

  const override = process.env.PAW_WORKSPACE_PATH?.trim();
  if (override) {
    paths.push(override);
  }

  if (paths.length === 0) {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      paths.push(...folders.map(folder => folder.uri.fsPath));
    }
  }

  return paths;
}
```
- Returns array of workspace folder paths
- Supports test override via `PAW_WORKSPACE_PATH` environment variable
- Maps `WorkspaceFolder` objects to absolute file paths

**Git Repository Detection**:

**Implementation** (`src/git/validation.ts:10-16`):
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
- Uses `git rev-parse --git-dir` command with `cwd` option
- Reliable method that works in subdirectories
- Handles various git configurations (standard `.git`, worktrees)
- Returns `true` if git repository, `false` otherwise

**Uncommitted Changes Check** (`src/git/validation.ts:32-43`):
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
- Uses `git status --porcelain` for machine-readable output
- Returns `true` if any uncommitted changes exist
- Currently implemented but not used in initialization flow

**Implications for Supervisor**:
- Iterate `vscode.workspace.workspaceFolders` to find all workspace folders
- Run `validateGitRepository` on each folder to identify git repositories
- Present list of detected repositories to user for selection
- Store selected repository paths in `SupervisorContext.md`
- Validate that workspace is multi-root before allowing cross-repository workflow

---

### 8. Artifact Structure and Conventions

**Standard Directory Structure**:

**Single-Repository Workflow** (`.paw/work/<feature-slug>/`):
```
.paw/work/<feature-slug>/
├── WorkflowContext.md           # Required: workflow parameters
├── prompts/                     # Optional: generated prompt files
│   ├── 01B-spec-research.prompt.md
│   ├── 02A-code-research.prompt.md
│   └── ...
├── Spec.md                      # Full mode: feature specification
├── SpecResearch.md              # Full mode: spec research findings
├── CodeResearch.md              # All modes: code mapping
├── ImplementationPlan.md        # All modes: implementation plan
├── ImplementationPlan-UpdateFor-PR-<N>.md  # Optional: plan updates
└── Docs.md                      # Full mode: documentation
```

**WorkflowContext.md Structure** (`.paw/work/cross-repository-workflow-supervisor/WorkflowContext.md`):
```markdown
# WorkflowContext

Work Title: Cross Repository Workflow Supervisor
Feature Slug: cross-repository-workflow-supervisor
Target Branch: feature/142-cross-repository-workflow-supervisor
Workflow Mode: full
Review Strategy: local
Handoff Mode: semi-auto
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/142
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

**Field Descriptions**:
- **Work Title**: 2-4 word human-readable name (used in PR titles)
- **Feature Slug**: Normalized identifier (lowercase letters, numbers, hyphens)
- **Target Branch**: Git branch name where implementation commits go
- **Workflow Mode**: `full`, `minimal`, or `custom`
- **Review Strategy**: `prs` or `local`
- **Handoff Mode**: `manual`, `semi-auto`, or `auto`
- **Issue URL**: GitHub Issue or Azure DevOps Work Item URL, or `none`
- **Remote**: Git remote name (default: `origin`)
- **Artifact Paths**: Location hint, usually `auto-derived`
- **Additional Inputs**: Comma-separated extra parameters, or `none`
- **Custom Workflow Instructions**: Free-text (present when Workflow Mode is `custom`)
- **Initial Prompt**: User's work description (present when no issue URL provided)

**Artifact Ownership**:
- `WorkflowContext.md`: Created by initialization, read by all agents
- `Spec.md`: Created by PAW-01A Specification
- `SpecResearch.md`: Created by PAW-01B Spec Researcher
- `CodeResearch.md`: Created by PAW-02A Code Researcher
- `ImplementationPlan.md`: Created by PAW-02B Impl Planner
- `Docs.md`: Created by PAW-04 Documenter
- Prompts: Created by `paw_generate_prompt` tool, edited by user

**Artifact Persistence**:
- All artifacts committed to git and version-controlled
- Stored in target branch, included in PRs for review
- Idempotent updates: agents update artifacts incrementally
- No automatic deletion (persist across workflow stages)

**Implications for Supervisor**:

**Supervisor Artifact Structure** (`.paw/multi-work/<work-id>/` at workspace root):
```
.paw/multi-work/<work-id>/
├── SupervisorContext.md         # Multi-repository parameters
├── prompts/                     # Supervisor-specific prompts
├── CrossRepoSpec.md             # Holistic specification
├── CrossRepoPlan.md             # Execution plan with sequencing
└── Validation.md                # Cross-repository validation reports
```

**SupervisorContext.md Fields** (proposed):
- Standard WorkflowContext.md fields (Work Title, Feature Slug, etc.)
- **Affected Repositories**: List of workspace folders/paths
- **Execution Sequence**: Ordered repository work list
- **Child Work IDs**: Map of repository → child Work ID
- **Validation State**: Last validation timestamp, status

**Child Workflow Structure** (standard `.paw/work/<work-id>/` in each repository):
- Child workflows maintain standard structure
- Same Work ID as supervisor workflow for traceability
- Independent operation (can function if supervisor artifacts lost)
- Context passed via `WorkflowContext.md` or initialization prompts

**Location Strategy**:
- Supervisor artifacts NOT in any git repository (workspace root only)
- Child artifacts IN respective repository (git-tracked)
- Supervisor artifacts can be version-controlled separately if desired
- Clear separation: supervisor coordination vs. repository implementation

---

### 9. Extension Activation and Tool Registration

**Main Entry Point**: `src/extension.ts`

**Activation Function** (`src/extension.ts:31-48`):
```typescript
export async function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
  context.subscriptions.push(outputChannel);
  
  outputChannel.appendLine('[INFO] PAW Workflow extension activated');

  await installAgentsIfNeeded(context, outputChannel);

  registerContextTool(context);
  outputChannel.appendLine('[INFO] Registered language model tool: paw_get_context');

  registerHandoffTool(context, outputChannel);
  outputChannel.appendLine('[INFO] Registered language model tool: paw_call_agent');

  registerPromptGenerationTool(context, outputChannel);
  outputChannel.appendLine('[INFO] Registered language model tool: paw_generate_prompt');
```
- Creates output channel for logging
- Installs or updates PAW agents
- Registers all language model tools
- Registers commands

**Command Registration**:
- `PAW: New PAW Workflow`: Calls `initializeWorkItemCommand` (`src/commands/initializeWorkItem.ts`)
- `PAW: Get Work Status`: Calls work status command (`src/commands/getWorkStatus.ts`)

**Tool Registration Order**:
1. `paw_get_context`: Context retrieval tool
2. `paw_call_agent`: Agent handoff tool
3. `paw_generate_prompt`: Prompt generation tool

**Implications for Supervisor**:
- No changes needed to extension activation
- Tools already support multi-root workspaces
- Consider adding "PAW: New Cross-Repository Workflow" command
- Alternatively, extend existing initialization command with workflow type selection

---

## Code References Summary

| Component | File:Line | Description |
|-----------|-----------|-------------|
| **Initialization Entry** | `src/commands/initializeWorkItem.ts:28-124` | Main workflow initialization command |
| **Workspace Validation** | `src/commands/initializeWorkItem.ts:41-50` | Single folder check (extend for multi-root) |
| **Git Validation** | `src/git/validation.ts:10-16` | Repository detection using `git rev-parse` |
| **User Input Collection** | `src/ui/userInput.ts:294-396` | Sequential input gathering with validation |
| **Workflow Mode UI** | `src/ui/userInput.ts:119-162` | Quick Pick menu for full/minimal/custom |
| **Review Strategy UI** | `src/ui/userInput.ts:180-220` | Quick Pick menu for prs/local |
| **Handoff Mode UI** | `src/ui/userInput.ts:235-292` | Quick Pick menu for manual/semi-auto/auto |
| **Prompt Construction** | `src/prompts/workflowInitPrompt.ts:155-258` | Template variable substitution |
| **Template Loading** | `src/prompts/workflowInitPrompt.ts:57-93` | Compiled and source location handling |
| **Context Tool Registration** | `src/tools/contextTool.ts:432-494` | Language Model Tool for `paw_get_context` |
| **Workspace Resolution** | `src/tools/contextTool.ts:229-266` | Multi-root workspace folder iteration |
| **Context Loading** | `src/tools/contextTool.ts:320-341` | Workspace/user instructions and workflow context |
| **Response Formatting** | `src/tools/contextTool.ts:365-428` | XML-tagged sections for agent consumption |
| **Handoff Tool Registration** | `src/tools/handoffTool.ts:96-155` | Language Model Tool for `paw_call_agent` |
| **Agent Invocation** | `src/tools/handoffTool.ts:69-89` | Chat session creation and agent mode |
| **Work ID Validation** | `src/tools/handoffTool.ts:34-47` | Format checking (lowercase, numbers, hyphens) |
| **Agent Template Loading** | `src/agents/agentTemplates.ts:118-153` | Read and process `.agent.md` files |
| **Component Loading** | `src/agents/agentTemplateRenderer.ts:10-31` | Read `.component.md` files |
| **Template Processing** | `src/agents/agentTemplateRenderer.ts:51-72` | Component expansion and variable substitution |
| **Multi-Root Access** | `src/tools/contextTool.ts:229-249` | `vscode.workspace.workspaceFolders` iteration |
| **Extension Activation** | `src/extension.ts:31-48` | Tool and command registration |

---

## Integration Points for Supervisor Implementation

### 1. Initialization Flow Extensions

**Current**: Single workspace folder validation at `src/commands/initializeWorkItem.ts:41-50`

**Required**:
- Detect multi-root workspace (check `vscode.workspace.workspaceFolders.length > 1`)
- Add workflow type selection (Implementation/Cross-Repository/Review) before mode selection
- Iterate workspace folders to identify git repositories
- Present repository selection UI for affected repositories
- Pass multi-repository context to supervisor initialization prompt

**Recommended Location**: Create new command `initializeSupervisorWorkflow` or extend existing with workflow type parameter

### 2. Context Tool Extensions

**Current**: `resolveWorkspacePath` searches `.paw/work/` in all workspace folders (`src/tools/contextTool.ts:251-266`)

**Required**:
- Extend to check `.paw/multi-work/` at workspace root for supervisor workflows
- Add supervisor context type detection (check for `SupervisorContext.md` vs. `WorkflowContext.md`)
- Handle supervisor-specific custom instructions
- Parse supervisor context fields (affected repositories, execution sequence)

**Recommended Approach**: Add `resolveSupervisorWorkspacePath` function, modify `getContext` to check both locations

### 3. Handoff Tool Extensions

**Current**: `AgentName` enum at `src/tools/handoffTool.ts:6-15` lists standard agents

**Required**:
- Add supervisor agent names: `"SupervisorSpec"`, `"SupervisorPlanner"`, `"SupervisorValidator"`
- No changes needed to invocation logic (already supports Work ID resolution across workspaces)

**Recommended Approach**: Extend `AgentName` type union with supervisor agents

### 4. Agent Template System

**Current**: Loads `.agent.md` files from `agents/` directory, processes components (`src/agents/agentTemplates.ts`)

**Required**:
- Create supervisor agent files in `agents/` directory
- Reuse existing component system for shared sections
- Consider supervisor-specific components (multi-repository context)

**Recommended Files**:
- `agents/SupervisorSpec.agent.md`: Unified specification agent
- `agents/SupervisorPlanner.agent.md`: Cross-repository planning agent
- `agents/SupervisorValidator.agent.md`: Consistency validation agent
- `agents/components/supervisor-context.component.md`: Multi-repository context instructions

### 5. Prompt Template System

**Current**: Templates in `src/prompts/` with variable substitution (`src/prompts/workflowInitPrompt.ts`)

**Required**:
- Create supervisor initialization template
- Add variables for multi-repository context (repository list, workspace root)
- Template should invoke supervisor specification agent

**Recommended File**: `src/prompts/supervisorInitPrompt.template.md`

### 6. Artifact Structure

**Current**: Single-repository artifacts at `.paw/work/<feature-slug>/`

**Required**:
- Define supervisor artifact location: `.paw/multi-work/<work-id>/`
- Create `SupervisorContext.md` structure with multi-repository fields
- Define supervisor-specific artifacts (CrossRepoSpec.md, CrossRepoPlan.md, Validation.md)
- Child workflows maintain standard `.paw/work/<work-id>/` structure in repositories

**Key Distinction**: Supervisor artifacts NOT git-tracked (workspace root), child artifacts git-tracked (repositories)

---

## Open Questions

1. **Supervisor Context Storage Location**: Should supervisor artifacts be at workspace root `.paw/multi-work/` (not in any git repo) or in a designated "primary" repository? *Spec indicates workspace root to avoid git conflicts.*

2. **Child Work ID Naming**: Should child workflows use same Work ID as supervisor for traceability, or unique IDs per repository? *Recommend same Work ID for consistency.*

3. **Validation Timing**: Should validation be invoked manually at checkpoints or triggered automatically at stage transitions? *Spec indicates on-demand invocation for flexibility.*

4. **Context Passing Mechanism**: Should supervisor pass scoped context to children via WorkflowContext.md fields or via initialization prompt inline instructions? *Recommend both: WorkflowContext.md for structure, inline instructions for specifics.*

5. **Repository Ordering UI**: How should users specify execution sequence during initialization—drag-and-drop, numbered input, or let planning agent determine? *Recommend planning agent determines based on dependencies.*

6. **Workspace Root Detection**: How to reliably find workspace root when multi-root workspace has no common parent? *Use VS Code workspace file location if available, otherwise first workspace folder.*

7. **Error Handling**: What should happen if supervisor artifacts exist but one or more child repositories are missing from workspace? *Validation agent should detect and report; allow manual resolution.*

8. **Integration Testing Guidance**: Should validation provide executable test commands or descriptive guidance? *Spec indicates descriptive guidance; executable commands are future enhancement.*

---

## Architectural Patterns Observed

### 1. Agent-Driven Operations
- Extension provides UI and tool infrastructure
- Agents handle all file operations, git operations, slug normalization
- Extension keeps code minimal, delegates complexity to agents
- Agents have full context and reasoning capabilities

### 2. Multi-Root Workspace Support
- Context tool already iterates all workspace folders for Work ID resolution
- No assumption of single workspace folder in context/handoff tools
- Test override via environment variable for unit testing
- Graceful handling of missing workspace (clear error messages)

### 3. Template-Based Extensibility
- Agents defined in markdown files with YAML frontmatter
- Component system for shared sections (DRY principle)
- Variable substitution for agent-specific customization
- Clear separation: templates (data) vs. processing logic (code)

### 4. Fire-and-Forget Handoffs
- Handoff tool creates new chat session, cannot wait for completion
- Agents coordinate via artifacts and context passing
- Each agent completes its work, writes artifacts, hands off to next
- No synchronous agent communication or return values

### 5. Graceful Degradation
- Missing custom instructions handled gracefully (exists: false)
- Template loading falls back from compiled to source locations
- Context tool returns empty sections when files don't exist
- Clear error messages with actionable guidance

### 6. XML-Tagged Context Sections
- Context formatted with `<workspace_instructions>`, `<user_instructions>`, `<workflow_context>`, `<handoff_instructions>` tags
- Prevents ambiguity with content's own markdown structure
- Enables agents to parse and extract specific sections reliably
- Handoff instructions at end for recency bias

---

## Recommendations for Implementation

### Phase 1: Foundation
1. Extend initialization command to detect multi-root workspaces
2. Add workflow type selection UI (Implementation/Cross-Repository/Review)
3. Implement repository detection and selection UI
4. Create supervisor initialization prompt template

### Phase 2: Context Infrastructure
1. Extend context tool to support `.paw/multi-work/` resolution
2. Define `SupervisorContext.md` structure and parsing
3. Implement supervisor context loading and formatting
4. Add supervisor agent names to handoff tool enum

### Phase 3: Supervisor Agents
1. Create SupervisorSpec agent for unified specification
2. Create SupervisorPlanner agent for execution planning
3. Create SupervisorValidator agent for consistency checking
4. Implement supervisor-specific components

### Phase 4: Child Workflow Integration
1. Test child workflow initialization from supervisor plan
2. Verify context passing from supervisor to children
3. Test handoffs between supervisor and child workflows
4. Validate multi-repository Work ID resolution

### Phase 5: Validation and Testing
1. Implement cross-repository validation logic
2. Test validation at various child workflow stages
3. Create integration testing guidance generation
4. End-to-end testing with sample multi-repository feature

---

## Success Metrics

- [ ] Multi-root workspace detected and git repositories identified
- [ ] Workflow type selection UI presented before mode selection
- [ ] Supervisor artifacts created at `.paw/multi-work/<work-id>/`
- [ ] SupervisorContext.md contains affected repositories and execution sequence
- [ ] Context tool resolves supervisor context from workspace root
- [ ] Handoff tool invokes supervisor agents successfully
- [ ] Child workflows initialized in each affected repository with standard structure
- [ ] Agents can hand off from supervisor to children and back
- [ ] Validation agent can assess consistency across repositories at any stage
- [ ] Integration testing guidance generated based on current child workflow states
