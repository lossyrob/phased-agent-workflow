# Spec Research: PAW Context Tool for Custom Instructions

## Summary

This research examines the VS Code Language Model Tool API and existing PAW patterns to inform the design of a custom instructions context tool. The tool will enable agents to dynamically load workspace-specific and user-level custom instructions at runtime without requiring agent file modifications.

Key findings:
- VS Code Language Model Tool API provides `vscode.lm.registerTool()` with required `invoke()` and optional `prepareInvocation()` methods
- Existing `paw_create_prompt_templates` tool establishes patterns for tool registration, parameter schemas, and result formatting
- Current custom instruction files use simple Markdown format with optional YAML frontmatter, stored under `.paw/instructions/` in workspaces
- Tools return structured `LanguageModelToolResult` objects containing `LanguageModelTextPart` or `LanguageModelPromptTsxPart` content
- Platform-specific user directory resolution is implemented via `platformDetection.ts` for Windows, macOS, Linux, and WSL

## Research Findings

### Question 1: VS Code Language Model Tool API

**Question**: What is the VS Code Language Model Tool API for registering and implementing custom tools that agents can call? What are the required methods, parameters, and return types?

**Answer**: 

The VS Code Language Model Tool API uses `vscode.lm.registerTool<T>()` to register tools that agents can invoke. Tools implement the `LanguageModelTool<T>` interface with two methods:

**Required method**:
- `invoke(options: LanguageModelToolInvocationOptions<T>, token: CancellationToken): ProviderResult<LanguageModelToolResult>`
  - Executes the tool logic with validated input parameters
  - Returns `LanguageModelToolResult` containing text or TSX parts
  - Input parameters match the declared JSON schema and are provided in `options.input`

**Optional method**:
- `prepareInvocation(options: LanguageModelToolInvocationPrepareOptions<T>, token: CancellationToken): ProviderResult<PreparedToolInvocation>`
  - Returns confirmation UI messages shown before tool execution
  - Includes `invocationMessage` (brief description) and `confirmationMessages` (title + markdown body)
  - Users can select "Always Allow" to skip future confirmations

**Tool metadata** (declared in `package.json` under `contributes.languageModelTools`):
- `name`: Unique identifier (e.g., `paw_create_prompt_templates`)
- `displayName`: User-friendly name
- `modelDescription`: Description provided to the language model
- `toolReferenceName`: Optional name for `#` references in chat
- `canBeReferencedInPrompt`: Boolean enabling explicit tool references
- `inputSchema`: JSON Schema defining parameter types and requirements

**Evidence**: VS Code API documentation from `vscode.d.ts`; implementation in `src/tools/createPromptTemplates.ts:347-387`

**Implications**: The new context tool must implement `invoke()` at minimum, with optional `prepareInvocation()` for user confirmation. Tool parameters must be defined in `package.json` with JSON Schema, and results returned as `LanguageModelToolResult`.

---

### Question 2: Existing `paw_create_prompt_templates` Tool Implementation

**Question**: How is the existing `paw_create_prompt_templates` tool implemented in the codebase? What patterns, interfaces, and conventions should be followed for consistency?

**Answer**:

The `paw_create_prompt_templates` tool follows a three-layer architecture:

**1. Type definitions** (TypeScript interfaces):
- `CreatePromptTemplatesParams`: Input parameters with `feature_slug`, `workspace_path`, `workflow_mode`, and optional `stages`
- `CreatePromptTemplatesResult`: Output with `success` boolean, `files_created` array, and `errors` array
- All interfaces exported for testability

**2. Core business logic** (`createPromptTemplates()` function):
- Accepts parameters, performs file operations
- Returns structured result object (not `LanguageModelToolResult`)
- Handles errors gracefully: catches exceptions, collects error messages, continues processing when possible
- Uses synchronous `fs` operations (`fs.existsSync()`, `fs.mkdirSync()`, `fs.writeFileSync()`)

**3. Tool registration** (`registerPromptTemplatesTool()` function):
- Calls `vscode.lm.registerTool<ParamsType>()` with tool name matching `package.json`
- Implements `prepareInvocation()` to show feature slug in confirmation message
- Implements `invoke()` to call business logic and format results as `LanguageModelToolResult`
- Wraps tool registration in `context.subscriptions.push()` for proper disposal
- Returns success with file list or failure with error messages

**Common patterns**:
- Tool name format: `paw_verb_noun` (e.g., `paw_create_prompt_templates`)
- Error handling: try-catch blocks with detailed error messages
- Idempotent operations: creates directories if missing, overwrites files
- Structured results: always return success status + details, even on partial failure
- Logging: tool does not log directly; calling code logs to output channel

**Evidence**: Complete implementation in `src/tools/createPromptTemplates.ts`; package.json declaration at lines 42-95

**Implications**: The context tool should follow the same pattern: separate business logic from tool registration, return structured result objects, handle errors gracefully, and use `LanguageModelToolResult` only in the `invoke()` method.

---

### Question 3: Custom Instruction File Structure and Format

**Question**: What is the expected structure and format for custom instruction files (`.paw/instructions/<agent>-instructions.md` and `~/.paw/instructions/<agent>-instructions.md`)? Are there existing examples or conventions?

**Answer**:

Custom instruction files are plain Markdown documents with optional YAML frontmatter, stored in `.paw/instructions/` directories. Current implementation shows these characteristics:

**File naming conventions**:
- Workspace-level: `.paw/instructions/<operation>-instructions.md` (e.g., `init-instructions.md`)
- User-level: `~/.paw/instructions/<operation>-instructions.md` (currently undefined in codebase)
- Agent-specific: Pattern would be `<agent-name>-instructions.md` (not yet implemented)

**Content structure**:
- Plain Markdown with headings, lists, and formatting
- Optional YAML frontmatter (delimited by `---`)
- Free-form content - no enforced schema
- Semantic sections recommended: Role, Goals, Style, Constraints, Tools/APIs, Workflow

**Loading behavior**:
- Files are optional - absence does not cause errors
- Content is read as UTF-8 text and trimmed
- Empty files return `exists: true, content: '', error: 'file is empty'`
- Read errors return `exists: true, content: '', error: '<error message>'`

**Composition pattern**:
- Current implementation loads single file per operation
- Formatted with section header and horizontal rules for visual separation
- Injected into agent prompts with instruction to follow custom rules in addition to standard rules
- Note indicates custom instructions take precedence on conflicts

**Evidence**: Implementation in `src/prompts/customInstructions.ts`; usage pattern in `workItemInitPrompt.template.md`; architectural discussion in `.paw/work/agent-installation-management/SpecResearch.md:236-290`

**Implications**: The context tool should support optional custom instruction files at both workspace and user levels, return empty content when missing, and provide structured metadata about file existence and load status.

---

### Question 4: Tool Response Schema

**Question**: What should the tool's response schema be? What fields should be included for workspace instructions, user instructions, and workspace metadata?

**Answer**:

Based on existing patterns and the separation between business logic results and tool API results, the response should have two layers:

**Business logic result** (TypeScript interface for internal use):
```typescript
interface ContextResult {
  workspace_instructions: {
    exists: boolean;
    content: string;
    error?: string;
  };
  user_instructions: {
    exists: boolean;
    content: string;
    error?: string;
  };
  workspace_metadata: {
    feature_slug?: string;
    target_branch?: string;
    work_title?: string;
  };
}
```

**Tool API result** (returned from `invoke()` method):
- Success case: `LanguageModelToolResult` with formatted text describing available instructions
- Error case: `LanguageModelToolResult` with error message

**Response content characteristics**:
- Structured data for programmatic use (workspace vs user instructions)
- Clear indication of file existence vs. successful content loading
- Optional error messages for debugging
- Workspace metadata extracted from `WorkflowContext.md` when available
- Text response formatted for agent consumption (not JSON - agents read natural language)

**Formatting approach** (based on `customInstructions.ts:formatCustomInstructions()`):
- Separate sections for workspace and user instructions
- Markdown headings and horizontal rules for visual separation
- Instructional text guiding agent behavior
- Empty sections omitted from output

**Evidence**: `CustomInstructions` interface in `src/prompts/customInstructions.ts:7-11`; `CreatePromptTemplatesResult` interface in `src/tools/createPromptTemplates.ts:57-67`; `formatCustomInstructions()` implementation at `src/prompts/customInstructions.ts:64-76`

**Implications**: The tool should return structured data internally for testability, but format results as natural language text in the `LanguageModelToolResult` for agent consumption. Separate workspace and user instructions clearly, and include metadata when available.

---

### Question 5: Error Handling in Language Model Tools

**Question**: How do VS Code language model tools handle and report errors? What error response format should be used when files are missing or inaccessible?

**Answer**:

Language model tools handle errors through a graceful degradation pattern at multiple levels:

**Error handling approaches**:

1. **Non-critical failures** (e.g., missing optional files):
   - Return successful `LanguageModelToolResult` with descriptive text
   - Indicate file absence in natural language: "No custom instructions found"
   - Do not throw exceptions for expected missing files

2. **Partial failures** (e.g., some files succeed, others fail):
   - Return structured result with both successes and errors
   - Continue processing remaining items after individual failures
   - Report all errors in result object

3. **Critical failures** (e.g., invalid parameters, unexpected exceptions):
   - Catch exceptions in `invoke()` method
   - Return `LanguageModelToolResult` with error explanation
   - Format errors as LLM-friendly messages, not stack traces

**Error result format**:
```typescript
return new vscode.LanguageModelToolResult([
  new vscode.LanguageModelTextPart(
    `Failed to <operation>. Errors:\n${errors.join('\n')}`
  )
]);
```

**Error message characteristics**:
- Natural language descriptions (not technical error codes)
- Actionable information when possible (e.g., "Set paw.promptDirectory to...")
- Contextual details (which file, what operation)
- Avoid exposing internal implementation details

**Exception propagation**:
- Tools do not throw exceptions from `invoke()` - catch and format all errors
- `UnsupportedPlatformError` is thrown by helper functions but caught before returning to tool API
- Cancellation tokens should be checked during long operations

**Evidence**: Error handling in `src/tools/createPromptTemplates.ts:217-232`; `customInstructions.ts:48-55`; `platformDetection.ts:39-43`; pattern documentation in `.paw/work/agent-installation-management/CodeResearch.md:376-407`

**Implications**: The context tool should not throw exceptions for missing custom instruction files (expected case). Return successful results with descriptive text indicating what was found or not found. Only return error results for truly exceptional conditions.

---

### Question 6: Platform-Specific User Directory Paths

**Question**: What are the platform-specific user directory paths for Linux, macOS, and Windows? How should the tool resolve `~/.paw/instructions/` on each platform?

**Answer**:

Platform-specific user directory paths are resolved using the `platformDetection.ts` module, which handles four platform scenarios:

**Home directory paths** (from `os.homedir()` or platform-specific resolution):
- **Windows**: `C:\Users\<username>\` (or `%USERPROFILE%`)
- **macOS**: `/Users/<username>/`
- **Linux**: `/home/<username>/`
- **WSL**: `/mnt/c/Users/<windows-username>/` (maps to Windows filesystem)

**VS Code configuration paths** (for reference - not used by context tool):
- **Windows**: `%APPDATA%\<Code-Variant>\User\prompts` (typically `C:\Users\<username>\AppData\Roaming\Code\User\prompts`)
- **macOS**: `~/Library/Application Support/<Code-Variant>/User/prompts`
- **Linux**: `~/.config/<Code-Variant>/User/prompts`
- **WSL**: `/mnt/c/Users/<username>/AppData/Roaming/<Code-Variant>/User/prompts`

**PAW user instructions path** (for the context tool):
- All platforms: `<home-directory>/.paw/instructions/`
- Resolved using `path.join(os.homedir(), '.paw', 'instructions', '<filename>')`
- Uses POSIX-style path on Unix systems, Windows-style on Windows
- WSL uses POSIX paths but `os.homedir()` returns appropriate system home

**Platform detection approach**:
- `os.platform()` returns Node.js platform identifier: `'win32'`, `'darwin'`, `'linux'`
- WSL detected via `/proc/version` containing "microsoft" or "wsl", or `WSL_DISTRO_NAME` env var
- `os.homedir()` provides platform-appropriate home directory
- No special handling needed for `~` expansion - `os.homedir()` replaces it

**Special case - WSL**:
- PAW user instructions should use Windows home directory for consistency with VS Code
- `getPlatformInfo()` returns `/mnt/c/Users/<username>` as homeDir when WSL detected
- Ensures instructions persist when accessing from both Windows and WSL environments

**Evidence**: Complete implementation in `src/agents/platformDetection.ts`; home directory usage patterns in `customInstructions.ts`; WSL detection logic at `platformDetection.ts:92-171`

**Implications**: The context tool should use `os.homedir()` for cross-platform home directory resolution. On WSL, consider whether user instructions should be WSL-local (`/home/<user>/.paw/`) or Windows-shared (`/mnt/c/Users/<user>/.paw/`) - current installer uses Windows-shared approach for consistency with VS Code agent files.

---

## Open Unknowns

No open unknowns remain - all internal questions were answered through codebase exploration.

---

## User-Provided External Knowledge (Manual Fill)

The following optional external/context questions appear in the prompt for manual completion if desired:

- [ ] Are there VS Code extension API best practices or examples for language model tools that we should reference?

- [ ] Are there security considerations for reading custom instruction files (e.g., preventing path traversal, limiting file sizes)?
