---
date: 2025-11-14 15:46:22 EST
git_commit: 483472beeb2531bb49b35aeddb94c72ce287f4cb
branch: feature/agent-installation-management
repository: phased-agent-workflow
topic: "Agent Installation Management Implementation"
tags: [research, codebase, vscode-extension, agent-management, file-operations]
status: complete
last_updated: 2025-11-14
---

# Research: Agent Installation Management Implementation

**Date**: 2025-11-14 15:46:22 EST
**Git Commit**: 483472beeb2531bb49b35aeddb94c72ce287f4cb
**Branch**: feature/agent-installation-management
**Repository**: phased-agent-workflow

## Research Question

How is the VS Code extension currently structured, and what implementation patterns exist that can be leveraged to implement agent installation management? Specifically:
- Where and how does extension activation occur?
- What file system operations patterns are used?
- How are agent templates structured and stored?
- What logging and error handling patterns exist?
- How is ExtensionContext and global state used?
- What path resolution and platform detection patterns exist?

## Summary

The VS Code extension uses lazy activation (empty `activationEvents` array), activating only when commands are invoked. File operations use Node.js `fs` module with synchronous reads and writes, following a pattern of try-catch error handling with output channel logging and user notifications. Agent templates are `.agent.md` files stored in `.github/agents/` with YAML frontmatter, using a naming pattern like "PAW-##X Agent Name.agent.md". The extension currently has no global state usage or version tracking. Path resolution uses Node.js `path` module exclusively (no os.platform() or os.homedir() calls in source). Custom instructions are loaded from `.paw/instructions/` and formatted for injection into agent prompts with workspace-level precedence. The extension provides a language model tool (`paw_create_prompt_templates`) that demonstrates the agent-extension interaction pattern for file creation operations.

## Detailed Findings

### Extension Activation and Lifecycle

**Location**: `vscode-extension/src/extension.ts`

**Current Implementation** (`extension.ts:14-42`):
- `activate()` function is the entry point when extension activates
- Creates output channel named "PAW Workflow" for logging operations
- Registers the language model tool `paw_create_prompt_templates` via `registerPromptTemplatesTool()`
- Registers command `paw.initializeWorkItem` via `vscode.commands.registerCommand()`
- All resources pushed to `context.subscriptions` for automatic cleanup
- `deactivate()` function exists but relies on automatic cleanup (no manual operations)

**Activation Events** (`package.json:32`):
```json
"activationEvents": []
```
- Empty array means lazy activation - extension activates only when its commands are invoked
- No automatic activation on startup, file open, or extension install/update

**Commands Contributed** (`package.json:34-40`):
```json
"commands": [
  {
    "command": "paw.initializeWorkItem",
    "title": "New PAW Workflow",
    "category": "PAW"
  }
]
```

**Key Pattern**: Extension uses command-driven activation rather than event-driven. For agent installation, would need to add `onStartupFinished` activation event to enable installation during VS Code startup.

### File System Operations

**Location**: `vscode-extension/src/prompts/customInstructions.ts`, `vscode-extension/src/tools/createPromptTemplates.ts`, `vscode-extension/src/commands/initializeWorkItem.ts`

**Custom Instructions Loading** (`customInstructions.ts:24-48`):
```typescript
export function loadCustomInstructions(
  workspacePath: string,
  relativePath: string
): CustomInstructions
```
- Uses `path.join()` to construct absolute paths from workspace root
- Uses `fs.existsSync()` to check file existence (returns early if not found)
- Uses `fs.readFileSync()` with 'utf-8' encoding for content reading
- Wraps operations in try-catch blocks
- Returns structured result object with `exists`, `content`, and optional `error` fields
- Handles empty file case explicitly with error message

**Prompt Template Creation** (`createPromptTemplates.ts:228-268`):
```typescript
export async function createPromptTemplates(
  params: CreatePromptTemplatesParams
): Promise<CreatePromptTemplatesResult>
```
- Uses `fs.mkdirSync()` with `{ recursive: true }` for directory creation
- Uses `fs.writeFileSync()` for file writing with 'utf-8' encoding
- Wraps operations in try-catch blocks at both function level and per-file level
- Returns structured result object with `success`, `files_created`, and `errors` arrays
- Designed to be idempotent - overwrites existing files without checking

**Error Handling Pattern**:
- Try-catch blocks at operation boundaries
- Error messages captured as strings: `error instanceof Error ? error.message : String(error)`
- Errors accumulated in arrays or returned in result objects
- No throwing of errors to caller - graceful degradation pattern

**Path Resolution**:
- All paths constructed using `path.join()` for cross-platform compatibility
- No direct path concatenation with `/` or `\\`
- Absolute paths preferred throughout codebase

### Agent Template Structure

**Location**: `.github/agents/` directory

**Agent Files Discovered**:
- PAW-01A Specification.agent.md
- PAW-01B Spec Researcher.agent.md
- PAW-02A Code Researcher.agent.md
- PAW-02B Impl Planner.agent.md
- PAW-03A Implementer.agent.md
- PAW-03B Impl Reviewer.agent.md
- PAW-04 Documenter.agent.md
- PAW-05 PR.agent.md
- PAW-R1A Understanding.agent.md
- PAW-R1B Baseline Researcher.agent.md
- PAW-R2A Impact Analyzer.agent.md
- PAW-R2B Gap Analyzer.agent.md
- PAW-R3A Feedback Generator.agent.md
- PAW-R3B Feedback Critic.agent.md
- PAW-X Status Update.agent.md

**File Format** (examining `PAW-01A Specification.agent.md:1-5`):
```markdown
---
description: 'Phased Agent Workflow: Spec Agent'
---
# Spec Agent

[Agent instructions follow...]
```

**Naming Pattern**: `PAW-##X Agent Name.agent.md`
- Prefix: "PAW-"
- Phase number: "01", "02", "03", etc.
- Variant letter: "A", "B" (for multiple agents in same phase)
- Space-separated name
- Extension: ".agent.md"

**YAML Frontmatter**: Contains `description` field with human-readable agent description

**Content**: Plain markdown after frontmatter with agent instructions

### Output Channel and Logging

**Location**: `vscode-extension/src/extension.ts`, `vscode-extension/src/commands/initializeWorkItem.ts`

**Output Channel Creation** (`extension.ts:23-24`):
```typescript
const outputChannel = vscode.window.createOutputChannel('PAW Workflow');
context.subscriptions.push(outputChannel);
```
- Single output channel named "PAW Workflow" created during activation
- Channel pushed to subscriptions for automatic disposal
- Channel passed to command handlers as parameter

**Logging Pattern** (`initializeWorkItem.ts:37-114` shows consistent usage):
```typescript
outputChannel.appendLine('[INFO] Starting PAW workflow initialization...');
outputChannel.appendLine('[ERROR] No workspace folder open');
outputChannel.appendLine(`[INFO] Workspace: ${workspaceFolder.uri.fsPath}`);
```
- Format: `[LEVEL] Message` where LEVEL is INFO, ERROR, etc.
- Interpolation used for dynamic values
- No timestamps (VS Code adds these automatically)
- Sequential logging of operation steps for transparency

**User Notifications** (`initializeWorkItem.ts` examples):
```typescript
vscode.window.showErrorMessage('No workspace folder open. Please open a workspace...');
vscode.window.showErrorMessage(`PAW initialization failed: ${errorMessage}`);
```
- Used for critical errors that require user attention
- Always paired with output channel logging
- Messages are user-friendly (not technical stack traces)

**Pattern**: Detailed logging to output channel for debugging, concise error messages to user for actionability

### ExtensionContext and Global State Usage

**Location**: `vscode-extension/src/extension.ts`, `vscode-extension/src/tools/createPromptTemplates.ts`

**Current Usage** (`extension.ts:14`):
```typescript
export function activate(context: vscode.ExtensionContext)
```
- `context.subscriptions` used to register disposable resources (commands, tools, output channel)
- No usage of `context.globalState` for persistent storage found in codebase
- No usage of `context.workspaceState` found
- No version tracking or state management implemented yet

**Extension Context Properties Available** (from VS Code API):
- `context.subscriptions` - Disposable resources that are cleaned up on deactivation
- `context.globalState` - Key-value storage that persists across VS Code sessions
- `context.extensionUri` - URI of the extension's installation directory
- `context.extensionPath` - File system path of the extension (deprecated, use extensionUri)
- `context.storageUri` - Workspace-specific storage location
- `context.globalStorageUri` - Global storage location for extension data

**Language Model Tool Registration** (`createPromptTemplates.ts:296-337`):
```typescript
export function registerPromptTemplatesTool(
  context: vscode.ExtensionContext
): void {
  const tool = vscode.lm.registerTool<CreatePromptTemplatesParams>(
    'paw_create_prompt_templates',
    { prepareInvocation, invoke }
  );
  context.subscriptions.push(tool);
}
```
- Tools registered via `vscode.lm.registerTool()` API
- Tool registration returns disposable that must be added to subscriptions
- Tools declared in `package.json` under `contributes.languageModelTools`

**Pattern**: Extension context primarily used for resource registration, not state management. No existing version tracking infrastructure.

### Custom Instruction Composition

**Location**: `vscode-extension/src/prompts/customInstructions.ts`

**Custom Instructions Interface** (`customInstructions.ts:7-11`):
```typescript
export interface CustomInstructions {
  exists: boolean;
  content: string;
  error?: string;
}
```

**Loading Function** (`customInstructions.ts:24-48`):
```typescript
export function loadCustomInstructions(
  workspacePath: string,
  relativePath: string
): CustomInstructions
```
- Generic loader that accepts workspace path and relative path
- Returns early with `exists: false` if file doesn't exist
- Returns with error if file is empty or unreadable
- Trims content before returning

**Formatting Function** (`customInstructions.ts:57-70`):
```typescript
export function formatCustomInstructions(instructions: CustomInstructions): string
```
- Returns empty string if no usable instructions
- Wraps content in markdown section with heading "## Custom Instructions"
- Adds explanatory text and horizontal rules for visual separation
- Includes instruction to follow custom instructions in addition to standard rules

**Current Usage** (`initializeWorkItem.ts:64-73`):
```typescript
const WORKFLOW_INIT_CUSTOM_INSTRUCTIONS_PATH = path.join(
  '.paw',
  'instructions',
  'init-instructions.md'
);
```
- Custom instructions loaded from `.paw/instructions/` directory
- Single file checked: `init-instructions.md` for workflow initialization
- File existence checked with `fs.existsSync()`, logged but not loaded into prompt (yet)

**Pattern**: Custom instructions are optional, workspace-scoped, and injected into agent prompts with clear delineation. No user-level custom instructions (from `~/.paw/instructions/`) implemented yet. No composition/merging of multiple instruction files - single file per operation.

### Platform Detection and Path Resolution

**Current Implementation**:
- No usage of `os.platform()` found in source code
- No usage of `os.homedir()` found in source code
- All path operations use `path.join()` for cross-platform compatibility
- Test code uses `os.tmpdir()` for temporary directory creation (`test/suite/customInstructions.test.ts:16`, `test/suite/createPromptTemplates.test.ts:24`)

**Path Construction Pattern**:
```typescript
path.join(workspacePath, '.paw', 'instructions', 'init-instructions.md')
path.join(workspace_path, '.paw', 'work', feature_slug, 'prompts')
```
- Relative path segments passed as separate arguments to `path.join()`
- No hardcoded path separators (`/` or `\\`)
- Workspace root used as anchor for all relative paths

**Platform-Specific Requirements** (from SpecResearch.md):
- Windows: `%APPDATA%\Code\User\prompts`
- macOS: `~/Library/Application Support/Code/User/prompts`
- Linux: `~/.config/Code/User/prompts`
- VSCodium: `~/.config/VSCodium/User/prompts`

**Implementation Gap**: No existing code to determine platform-specific VS Code configuration directories. Would need to add:
- `os.platform()` to detect OS
- `os.homedir()` to resolve user home directory
- Platform-specific path construction logic
- VS Code distribution variant detection (Code, Insiders, Code-OSS, VSCodium)

### Language Model Tool Pattern

**Location**: `vscode-extension/src/tools/createPromptTemplates.ts`, `package.json`

**Tool Declaration** (`package.json:42-69`):
```json
"languageModelTools": [
  {
    "name": "paw_create_prompt_templates",
    "displayName": "Create PAW Prompt Templates",
    "modelDescription": "Generate PAW prompt template files...",
    "toolReferenceName": "pawPromptTemplates",
    "canBeReferencedInPrompt": true,
    "inputSchema": { /* JSON Schema */ }
  }
]
```
- Tool exposed to GitHub Copilot agents via Language Model API
- Input schema defines parameters with types, descriptions, and validation
- Required fields specified in schema
- Tool can be referenced in prompts by agents

**Tool Implementation Pattern** (`createPromptTemplates.ts:296-337`):
```typescript
const tool = vscode.lm.registerTool<CreatePromptTemplatesParams>(
  'paw_create_prompt_templates',
  {
    async prepareInvocation(options, _token) {
      // Return confirmation UI messages
      return {
        invocationMessage: '...',
        confirmationMessages: { title: '...', message: new vscode.MarkdownString('...') }
      };
    },
    async invoke(options) {
      // Perform operation
      const result = await createPromptTemplates(options.input);
      // Return result wrapped in LanguageModelToolResult
      return new vscode.LanguageModelToolResult([
        new vscode.LanguageModelTextPart('...')
      ]);
    }
  }
);
```

**Design Pattern**:
- Extension provides procedural tools for reliable file operations
- Agents provide decision-making logic and error handling
- Separation keeps extension code minimal while leveraging agent intelligence
- Tool results returned as structured objects with success/failure status

**Application to Agent Installation**:
- Could create tool for installing agent files to user prompts directory
- Tool would handle platform detection, path resolution, and file operations
- Agent would handle version checking, error recovery, and user communication
- Follows established pattern of procedural tools + intelligent agents

## Code References

- `vscode-extension/src/extension.ts:14-42` - Extension activation, command and tool registration
- `vscode-extension/package.json:32` - Empty activationEvents array (lazy activation)
- `vscode-extension/src/prompts/customInstructions.ts:24-48` - File loading pattern with error handling
- `vscode-extension/src/tools/createPromptTemplates.ts:228-268` - Idempotent file creation with structured results
- `vscode-extension/src/tools/createPromptTemplates.ts:296-337` - Language model tool registration pattern
- `.github/agents/PAW-01A Specification.agent.md:1-5` - Agent file format with YAML frontmatter
- `vscode-extension/src/commands/initializeWorkItem.ts:64-73` - Custom instructions path construction
- `vscode-extension/src/ui/userInput.ts:20-35` - WorkItemInputs interface with workflow mode support
- `vscode-extension/src/git/validation.ts:13-19` - Git repository validation pattern
- `vscode-extension/package.json:42-69` - Language model tool declaration

## Architecture Documentation

### Extension Structure

The extension follows a modular architecture with clear separation of concerns:

**Core Components**:
- `extension.ts` - Entry point for activation and resource registration
- `commands/` - Command handlers (currently only `initializeWorkItem`)
- `prompts/` - Prompt construction and custom instruction handling
- `tools/` - Language model tools exposed to agents
- `ui/` - User input collection and validation
- `git/` - Git repository operations and validation

**Interaction Pattern**:
1. User invokes command (e.g., "New PAW Workflow")
2. Extension collects inputs via sequential prompts
3. Extension constructs agent prompt with collected inputs
4. Extension invokes GitHub Copilot agent via `workbench.action.chat.open`
5. Agent uses language model tools to perform file operations
6. Results logged to output channel and displayed to user

**File Operation Pattern**:
- Synchronous operations with try-catch error handling
- Structured result objects (`{ success, data, errors }`)
- Graceful degradation (operations continue on non-critical failures)
- Detailed logging to output channel for debugging
- User-friendly error messages via `showErrorMessage()`

**Agent Integration Pattern**:
- Extension provides procedural tools (file creation, validation)
- Agents provide decision-making (slug normalization, error recovery)
- Tools declared in `package.json`, registered in `activate()`
- Tools return `LanguageModelToolResult` with structured data

### Workflow Mode Support

The extension implements workflow mode configuration (`userInput.ts:10-34`):
- **full**: All stages (spec, code-research, plan, implementation, docs, PR, status)
- **minimal**: Core stages only (skips spec and docs)
- **custom**: User-defined stages via custom instructions

Workflow mode is collected during initialization and affects:
- Which prompt template files are generated (`createPromptTemplates.ts:149-202`)
- Which agent stages are invoked during workflow execution
- Review strategy constraints (minimal mode enforces local strategy)

### Current Limitations for Agent Installation

**No Platform Detection**:
- No code to detect OS or VS Code distribution variant
- No code to resolve user home directory or VS Code config paths

**No Global State Usage**:
- No version tracking mechanism implemented
- No persistent storage of installation state

**No Activation on Startup**:
- Empty `activationEvents` means no automatic activation
- Would need `onStartupFinished` event for installation during VS Code startup

**No VS Code API for Profile Path**:
- VS Code does not expose profile path through extension API
- Must hardcode platform-specific paths (confirmed in SpecResearch.md)

**No Agent File Bundling**:
- Agent files currently stored in `.github/agents/` (workspace-level)
- No mechanism to bundle agent files with extension for installation
- Would need to add agent templates to extension resources

**No Migration Infrastructure**:
- No version manifest or migration logic
- No cleanup of obsolete files from previous versions

## Open Questions

- **Should agent files be bundled in the extension or referenced from the repository?** 
  - Bundling pros: Extension self-contained, no external dependencies
  - Bundling cons: Extension size increases, updates require extension republish
  - Repository reference pros: Agents update independently of extension
  - Repository reference cons: Requires network access, versioning complexity

- **Should installation be a language model tool or a direct extension operation?**
  - Tool pros: Follows established pattern, agent can provide intelligent error handling
  - Tool cons: Requires user confirmation for each installation, slower
  - Direct pros: Faster, no confirmation needed for automatic installation
  - Direct cons: Less visibility, harder to debug failures

- **How should version markers be stored - globalState or file-based?**
  - globalState pros: Built-in persistence, survives VS Code upgrades
  - globalState cons: Tied to VS Code profile, may be cleared
  - File-based pros: Explicit, inspectable by user, version-controlled
  - File-based cons: Must handle file I/O errors, cleanup complexity

- **Should the extension install agents for all profiles or only the active profile?**
  - According to SpecResearch.md, prompts directory is global across all profiles
  - Single installation covers all profiles (no per-profile installation needed)
  - But should extension verify this assumption at runtime?
