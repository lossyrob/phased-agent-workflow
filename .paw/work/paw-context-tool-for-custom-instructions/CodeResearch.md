---
date: 2025-11-19 00:45:14 EST
git_commit: 46a5821fc4f351b6ef929e11d6091dfbde68ed16
branch: feature/custom-agent-instructions
repository: phased-agent-workflow
topic: "PAW Context Tool Implementation - Code Structure and Patterns"
tags: [research, codebase, language-model-tools, custom-instructions, platform-detection, vscode-extension]
status: complete
last_updated: 2025-11-19
---

# Research: PAW Context Tool Implementation - Code Structure and Patterns

**Date**: 2025-11-19 00:45:14 EST
**Git Commit**: 46a5821fc4f351b6ef929e11d6091dfbde68ed16
**Branch**: feature/custom-agent-instructions
**Repository**: phased-agent-workflow

## Research Question

How should the `paw_get_context` language model tool be implemented to retrieve workspace-specific custom instructions, user-level custom instructions, and workflow metadata? What existing code patterns, file operations, and architectural decisions should be followed for consistency with the codebase?

## Summary

The PAW Context Tool should follow established patterns from the existing `paw_create_prompt_templates` tool, leveraging existing modules for custom instruction loading (`customInstructions.ts`), platform detection (`platformDetection.ts`), and VS Code Language Model Tool API registration. The implementation requires three-layer architecture: TypeScript interfaces for parameters/results, core business logic for file operations, and tool registration for VS Code integration. Custom instructions loading is already implemented with robust error handling, and WorkflowContext.md follows a simple `Field: Value` format that requires line-based parsing.

## Detailed Findings

### 1. VS Code Language Model Tool Registration Pattern

**Location**: `src/tools/createPromptTemplates.ts:347-387`, `src/extension.ts:36-38`

The tool registration follows a standard pattern used throughout the extension:

**Registration in extension.ts** (`src/extension.ts:36-38`):
```typescript
registerPromptTemplatesTool(context);
outputChannel.appendLine('[INFO] Registered language model tool: paw_create_prompt_templates');
```

**Tool registration function** (`src/tools/createPromptTemplates.ts:347-387`):
- Uses `vscode.lm.registerTool<ParamsType>()` with generic type for parameters
- Implements two methods: `prepareInvocation()` (optional) and `invoke()` (required)
- `prepareInvocation()` returns confirmation UI with `invocationMessage` and `confirmationMessages`
- `invoke()` calls business logic function and wraps result in `LanguageModelToolResult`
- Pushes tool registration to `context.subscriptions` for proper disposal
- Tool name in code must match `package.json` declaration exactly

**Return type pattern**:
- Success: `new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(message)])`
- Failure: Same structure but with error message description

**package.json declaration** (`package.json:42-95`):
- Declared under `contributes.languageModelTools` array
- Fields: `name`, `displayName`, `modelDescription`, `toolReferenceName`, `canBeReferencedInPrompt`, `inputSchema`
- `inputSchema` uses JSON Schema format with `type: "object"`, `properties`, `required` array
- Parameter types: `string`, `array`, `enum` for constrained values

### 2. Custom Instructions Loading Architecture

**Location**: `src/prompts/customInstructions.ts:1-79`

Existing module provides reusable functions for loading custom instruction files:

**Interface** (`customInstructions.ts:7-11`):
```typescript
interface CustomInstructions {
  exists: boolean;
  content: string;
  error?: string;
}
```

**Loading function** (`customInstructions.ts:18-56`):
- `loadCustomInstructions(workspacePath: string, relativePath: string): CustomInstructions`
- Uses `path.join()` to construct absolute path from workspace root + relative path
- Returns `{ exists: false, content: '' }` when file doesn't exist (not an error)
- Returns `{ exists: true, content: '', error: 'file is empty' }` for empty files
- Catches read errors: `{ exists: true, content: '', error: 'Failed to read...' }`
- Uses `fs.existsSync()` for existence check, `fs.readFileSync(path, 'utf-8')` for reading
- Trims content with `.trim()` before checking if empty

**Formatting function** (`customInstructions.ts:64-76`):
- `formatCustomInstructions(instructions: CustomInstructions): string`
- Returns empty string when file doesn't exist or content is empty
- Wraps content in Markdown section with horizontal rules and instructional text
- Format: `## Custom Instructions\n\n<description>\n\n---\n\n<content>\n\n---\n\n<follow instruction>`

**Current usage** (`src/prompts/workflowInitPrompt.ts:89-92`):
- Loads from `.paw/instructions/init-instructions.md` relative to workspace root
- Formats and injects into agent prompts when present
- No error handling needed - function returns empty string on any failure

### 3. Platform-Specific User Directory Resolution

**Location**: `src/agents/platformDetection.ts:1-286`

Cross-platform user directory resolution is fully implemented:

**Platform detection** (`platformDetection.ts:92-128`):
- `isWSL(nodePlatform, procVersionReader?)`: Detects WSL by checking `/proc/version` for "microsoft" or "wsl"
- Also checks environment variables: `WSL_DISTRO_NAME`, `WSL_INTEROP`
- Returns false if not on Linux platform

**WSL username resolution** (`platformDetection.ts:135-171`):
- `getWindowsUsernameFromWSL(usersDirReader?)`: Reads `/mnt/c/Users` directory
- Filters out system directories: `['Public', 'Default', 'Default User', 'All Users', 'desktop.ini']`
- Returns single username if only one found
- Matches against `LOGNAME` env var if multiple users found
- Falls back to `LOGNAME` env var if directory read fails

**Platform info structure** (`platformDetection.ts:177-231`):
- `getPlatformInfo(appName, nodePlatform, homeDir, procVersionReader?, usersDirReader?): PlatformInfo`
- Returns `{ platform, homeDir, variant }` object
- Maps Node.js platforms: `'win32'` → `'windows'`, `'darwin'` → `'macos'`, `'linux'` → `'linux'` or `'wsl'`
- For WSL: sets `homeDir` to `/mnt/c/Users/<username>` for Windows filesystem access
- Throws `UnsupportedPlatformError` if platform can't be determined or Windows username not found in WSL

**User directory resolution for PAW context tool**:
- Use `os.homedir()` for standard user directory (works on all platforms)
- Construct path: `path.join(os.homedir(), '.paw', 'instructions', '<agent>-instructions.md')`
- On WSL, consider whether to use WSL home (`/home/<user>`) or Windows home (`/mnt/c/Users/<user>`)
- Current agent installer uses Windows home in WSL for consistency with VS Code agent files

**VS Code prompts directory** (`platformDetection.ts:252-286`):
- Separate concern - used for agent installation, not custom instructions
- Windows: `%APPDATA%\<variant>\User\prompts` (e.g., `C:\Users\<user>\AppData\Roaming\Code\User\prompts`)
- macOS: `~/Library/Application Support/<variant>/User/prompts`
- Linux: `~/.config/<variant>/User/prompts`
- WSL: `/mnt/c/Users/<username>/AppData/Roaming/<variant>/User/prompts`

### 4. WorkflowContext.md Format and Parsing

**Location**: Agent files (`agents/PAW-02A Code Researcher.agent.md:46-53`), prompt template (`src/tools/createPromptTemplates.ts:246`)

WorkflowContext.md uses a simple field-value format without explicit parsing code in the codebase:

**Format structure** (from agent files):
```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>
Target Branch: <target_branch>
Issue URL: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
Workflow Mode: <full|minimal|custom>
Review Strategy: <prs|local>
Custom Workflow Instructions: <text or none>
```

**Field characteristics**:
- Format: `<Field Name>: <value>` (colon-space separator)
- Fields appear on separate lines
- No YAML frontmatter or special formatting
- Optional fields may be omitted or have value `none`
- Field order is conventional but not enforced

**Parsing approach** (inferred from usage patterns):
- Read entire file content with `fs.readFileSync(path, 'utf-8')`
- Split by lines: `content.split('\n')`
- For each line matching pattern `Field Name: Value`:
  - Extract field name (before colon)
  - Extract value (after colon and space, trimmed)
- Store in object with field names as keys
- Handle missing fields gracefully (return `undefined` or empty string)

**Current generation** (`src/prompts/workflowInitPrompt.ts:107-112`):
- Custom instructions field is conditionally included when provided
- Uses string concatenation to build field lines
- Format: `${fieldName}: ${value}\n`

**No existing parser found**: Agents read WorkflowContext.md directly and extract fields ad-hoc. The context tool will need to implement parsing logic.

### 5. File System Operations Pattern

**Location**: Multiple files across `src/` directory

Standard patterns for file operations:

**Synchronous operations** (preferred for tool implementation):
- `fs.existsSync(path)`: Check if file/directory exists
- `fs.readFileSync(path, 'utf-8')`: Read file content as UTF-8 string
- `fs.writeFileSync(path, content, 'utf-8')`: Write file content
- `fs.mkdirSync(path, { recursive: true })`: Create directory tree

**Path construction**:
- Always use `path.join()` for cross-platform compatibility
- Example: `path.join(workspacePath, '.paw', 'work', featureSlug, 'WorkflowContext.md')`
- Avoid string concatenation with `/` or `\\` separators

**Error handling pattern** (`customInstructions.ts:24-54`, `createPromptTemplates.ts:287-307`):
```typescript
try {
  if (!fs.existsSync(filePath)) {
    return { success: false, reason: 'not found' };
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  return { success: true, content };
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  return { success: false, error: message };
}
```

**Error message formatting**:
- Extract message: `error instanceof Error ? error.message : String(error)`
- Provide context: `Failed to <operation>: ${message}`
- Don't expose stack traces or internal details to language model

**Cancellation token handling**:
- Tools receive `CancellationToken` parameter in `invoke()` method
- Check `token.isCancellationRequested` before long operations
- Synchronous file reads are typically fast enough to skip checks
- For multiple file reads, check between reads

### 6. Business Logic Separation Pattern

**Location**: `src/tools/createPromptTemplates.ts:254-307`

Clear separation between business logic and tool API:

**Core function** (`createPromptTemplates.ts:254-307`):
- Exported `async function createPromptTemplates(params: ParamsType): Promise<ResultType>`
- Accepts plain TypeScript interface for parameters
- Returns plain TypeScript interface for result (not `LanguageModelToolResult`)
- Handles all file operations, error collection, and business logic
- Independent of VS Code APIs (uses only Node.js `fs` and `path`)
- Testable without VS Code context

**Tool wrapper** (`createPromptTemplates.ts:347-387`):
- `registerPromptTemplatesTool(context: ExtensionContext)` function
- Calls `vscode.lm.registerTool()` with tool name and implementation
- `invoke()` method: calls core function, formats result as `LanguageModelToolResult`
- Converts structured result object into natural language text for agent consumption
- Minimal logic - primarily format conversion

**Benefits of separation**:
- Business logic testable with unit tests (no VS Code context needed)
- Tool wrapper testable with VS Code integration tests
- Core function reusable from command handlers or other contexts
- Clear responsibility boundaries

**Result formatting** (`createPromptTemplates.ts:377-385`):
- Success: List files created with file paths
- Failure: List errors encountered
- Uses `result.files_created.map(file => \`- ${file}\`).join('\\n')` for formatting
- Returns natural language description, not JSON or structured data

### 7. Type Safety and Interface Design

**Location**: `src/tools/createPromptTemplates.ts:29-67`

TypeScript interfaces define contracts:

**Parameter interface** (`createPromptTemplates.ts:29-53`):
- Document each field with JSDoc comments
- Use descriptive property names (snake_case for tool parameters, camelCase for internal)
- Mark optional fields with `?` operator
- Provide examples in comments: `feature_slug: string; // e.g., "auth-system"`
- Include constraints in documentation: `stages?: WorkflowStage[]`

**Result interface** (`createPromptTemplates.ts:57-67`):
- Always include `success: boolean` field for quick status check
- Separate successful outputs (`files_created: string[]`) from errors (`errors: string[]`)
- Use arrays for multiple items, not single values
- Allow partial success (some files created, some failed)

**Enum usage** (`createPromptTemplates.ts:14-27`):
- Define enums for constrained values: `enum WorkflowStage`
- Use string enums for JSON serialization: `Spec = 'spec'`
- Match enum values to package.json schema enums
- Document enum values with comments

**Export strategy**:
- Export interfaces for testing and type checking: `export interface CreatePromptTemplatesParams`
- Export core function for reuse: `export async function createPromptTemplates`
- Export registration function for extension.ts: `export function registerPromptTemplatesTool`
- Keep internal helpers private (don't export)

### 8. Testing Patterns

**Location**: `src/test/suite/createPromptTemplates.test.ts`, `src/test/suite/customInstructions.test.ts`

Testing approach for language model tools:

**Unit tests for business logic**:
- Test core function independently of VS Code APIs
- Use temporary directories for file system tests
- Test success cases: files created, correct content
- Test error cases: missing directories, permission errors
- Test edge cases: empty inputs, special characters

**Integration tests for tool registration**:
- Test that tool is registered with correct name
- Test that parameters match schema
- Test tool invocation through VS Code API
- Mock file system when appropriate

**Error handling tests** (`src/test/suite/errorHandling.test.ts:159-180`):
- Test missing files return graceful errors
- Test malformed content returns descriptive errors
- Test partial failures (some succeed, some fail)
- Verify error messages are agent-friendly

### 9. Agent Name Pattern for Custom Instructions

**Location**: Agent files (`agents/*.agent.md`), custom instructions path patterns

Custom instruction filenames follow agent naming convention:

**Agent naming pattern**:
- Format: `PAW-<number><letter> <Name>` (e.g., `PAW-01A Specification`, `PAW-02B Impl Planner`)
- Filename convention: `<agent-name>-instructions.md`
- Examples:
  - `PAW-01A Specification-instructions.md`
  - `PAW-02A Code Researcher-instructions.md`
  - `PAW-02B Impl Planner-instructions.md`

**Location structure**:
- Workspace-level: `.paw/instructions/<agent-name>-instructions.md`
- User-level: `~/.paw/instructions/<agent-name>-instructions.md`
- Generic operation: `.paw/instructions/init-instructions.md` (used by workflow initialization)

**Determining agent context**:
- The calling agent is NOT automatically detected
- Agents would need to pass their own name as a parameter, OR
- Tool loads ALL custom instruction files from directory and returns them, OR
- Tool accepts optional agent name parameter to filter specific instructions

**Recommendation**: For MVP, load all instruction files from both directories and return their contents. Agents can parse the structured response to find their specific instructions. Future enhancement: add optional `agent_name` parameter to filter results.

### 10. Workspace Root Detection

**Location**: `src/commands/initializeWorkItem.ts:15-19`, `src/extension.ts:71-73`

Workspace path resolution:

**Getting workspace root**:
```typescript
const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
if (!workspaceFolder) {
  // Handle no workspace open
  return;
}
const workspacePath = workspaceFolder.uri.fsPath;
```

**Multi-root workspace handling**:
- `vscode.workspace.workspaceFolders` returns array of workspace folders
- Current implementation uses first workspace folder (`[0]`)
- Feature slug determines which workspace to use: find workspace containing `.paw/work/<feature-slug>/`

**For context tool**:
- Accept `feature_slug` parameter
- Derive workspace path from feature slug location
- OR: accept explicit `workspace_path` parameter (like `paw_create_prompt_templates` does)

## Code References

- `src/tools/createPromptTemplates.ts:1-387` - Complete tool implementation pattern
- `src/extension.ts:36-38` - Tool registration in extension activation
- `package.json:42-95` - Tool declaration in package.json
- `src/prompts/customInstructions.ts:1-79` - Custom instruction loading and formatting
- `src/agents/platformDetection.ts:1-286` - Cross-platform user directory resolution
- `src/prompts/workflowInitPrompt.ts:1-154` - WorkflowContext.md generation and usage
- `agents/PAW-02A Code Researcher.agent.md:46-53` - WorkflowContext.md format specification

## Architecture Documentation

### Recommended Implementation Structure

**File structure**:
```
src/tools/
  contextTool.ts           # Main implementation
  contextTool.test.ts      # Unit tests

src/prompts/
  customInstructions.ts    # Existing module (reuse)

src/agents/
  platformDetection.ts     # Existing module (reuse)
```

**Three-layer architecture**:

1. **Type definitions**:
   - `ContextParams` interface with `feature_slug` (required)
   - `ContextResult` interface with `workspace_instructions`, `user_instructions`, `workflow_metadata`
   - Nested interfaces for instruction status (exists, content, error)

2. **Core business logic**:
   - `getContext(params: ContextParams): Promise<ContextResult>` function
   - Reads workspace custom instructions from `.paw/instructions/`
   - Reads user custom instructions from `~/.paw/instructions/`
   - Reads and parses WorkflowContext.md
   - Returns structured result with all findings
   - Handles errors gracefully (partial failures allowed)

3. **Tool registration**:
   - `registerContextTool(context: ExtensionContext)` function
   - Calls `vscode.lm.registerTool<ContextParams>('paw_get_context', ...)`
   - Implements `prepareInvocation()` for confirmation UI
   - Implements `invoke()` to call core logic and format as text
   - Pushes to `context.subscriptions`

**Workflow metadata parsing**:
- Read `.paw/work/<feature-slug>/WorkflowContext.md`
- Parse line-by-line for `Field: Value` pattern
- Extract fields: `feature_slug`, `target_branch`, `work_title`, `issue_url`, `remote`, `workflow_mode`, `review_strategy`
- Return object with extracted fields (missing fields = undefined)
- Handle malformed file gracefully (return empty metadata, log warning)

**Error handling strategy**:
- Missing custom instruction files: not an error (return `exists: false`)
- Missing WorkflowContext.md: not a critical error (return empty metadata)
- File read errors: return partial results with error messages
- Invalid feature slug: validate format, return error if malformed
- Tool always succeeds, but may return empty/partial results

**Response formatting**:
- Natural language text describing available instructions
- Separate sections for workspace, user, and workflow metadata
- Clear indication when files don't exist or are empty
- Markdown formatting for readability

### Integration Points

**Extension activation** (`src/extension.ts`):
```typescript
import { registerContextTool } from './tools/contextTool';

export async function activate(context: vscode.ExtensionContext) {
  // ... existing code ...
  registerContextTool(context);
  outputChannel.appendLine('[INFO] Registered language model tool: paw_get_context');
  // ... existing code ...
}
```

**Package.json declaration**:
```json
{
  "contributes": {
    "languageModelTools": [
      {
        "name": "paw_get_context",
        "displayName": "Get PAW Context",
        "modelDescription": "Retrieve workspace custom instructions, user custom instructions, and workflow metadata for PAW agents",
        "toolReferenceName": "pawContext",
        "canBeReferencedInPrompt": true,
        "inputSchema": {
          "type": "object",
          "properties": {
            "feature_slug": {
              "type": "string",
              "description": "The normalized feature slug (e.g., 'auth-system')"
            }
          },
          "required": ["feature_slug"]
        }
      }
    ]
  }
}
```

**Agent usage**:
Agents call the tool at startup:
```markdown
Call the `paw_get_context` tool with `feature_slug: "<feature-slug>"` to retrieve:
- Workspace-specific custom instructions
- User-level custom instructions  
- Workflow metadata (target branch, work title, etc.)
```

### Design Decisions

**Decision: Use simple line-based parsing for WorkflowContext.md**
- Rationale: Format is simple `Field: Value` structure, no nested data
- Alternative considered: YAML parser - rejected as over-engineered for simple format
- Implementation: Split by lines, regex match `^(.+?):\s*(.+)$`, extract field/value pairs

**Decision: Load all custom instruction files, not filtered by agent**
- Rationale: Agents may want to see instructions for other agents (cross-agent coordination)
- Alternative considered: Agent-specific filtering - deferred to future enhancement
- Implementation: Read all `*-instructions.md` files from both directories, return all contents

**Decision: Use `os.homedir()` for user directory, not Windows home in WSL**
- Rationale: User instructions are personal preferences, should follow user's active environment
- Alternative considered: Follow VS Code agent pattern (Windows home in WSL) - may revisit
- Implementation: `path.join(os.homedir(), '.paw', 'instructions')`

**Decision: Return natural language text, not JSON**
- Rationale: Agents consume text responses better than structured data
- Follows pattern from `paw_create_prompt_templates` tool
- Implementation: Format as Markdown with sections and headings

**Decision: Make WorkflowContext.md optional (don't fail if missing)**
- Rationale: Agents may call tool before WorkflowContext.md exists
- Return empty metadata object, agent handles missing fields
- Implementation: Check `fs.existsSync()`, return empty object if not found

## Open Questions

None - all research objectives have been addressed with concrete file references and implementation patterns documented.
