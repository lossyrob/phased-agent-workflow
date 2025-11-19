# PAW Context Tool for Custom Instructions - Implementation Plan

## Overview

This plan implements a VS Code Language Model Tool (`paw_get_context`) that enables PAW agents to dynamically retrieve workspace-specific custom instructions, user-level custom instructions, and workflow metadata at runtime. This solves the problem of workspace isolation for globally-installed agent files by providing a centralized context retrieval mechanism that prevents configuration leakage between projects.

## Current State Analysis

The codebase already contains key building blocks for this feature:

### Key Discoveries:
- **Tool registration pattern** established in `src/tools/createPromptTemplates.ts:347-387` with three-layer architecture: TypeScript interfaces, core business logic, and VS Code API registration
- **Custom instruction loading** already implemented in `src/prompts/customInstructions.ts:18-56` with robust error handling for missing/inaccessible files
- **Platform detection** fully implemented in `src/agents/platformDetection.ts:92-286` supporting Windows, macOS, Linux, and WSL user directory resolution
- **WorkflowContext.md** will be returned as raw file content without parsing (agents parse fields themselves if needed)
- **Tool response format** follows natural language text pattern, not raw JSON (established by `paw_create_prompt_templates`)

### Constraints Discovered:
- Tools must return `LanguageModelToolResult` with text parts, not structured data directly to agents
- File operations should be synchronous using `fs.existsSync()` and `fs.readFileSync()` patterns
- Error handling must be graceful: missing files are normal cases, not errors
- Package.json `inputSchema` must use JSON Schema format with explicit `required` array
- Agent names in instruction filenames follow pattern: `<agent-name>-instructions.md` (e.g., `PAW-02B Impl Planner-instructions.md`)

## Desired End State

After implementation:
- Agents call `paw_get_context` tool with feature slug parameter and agent name
- Tool returns formatted text containing workspace instructions, user instructions, and raw WorkflowContext.md content
- Workspace isolation ensures custom instructions from different projects don't leak
- Precedence rules enforced: workspace > user > agent defaults
- Platform-specific user directory paths resolved correctly (Windows, macOS, Linux, WSL)
- Tool handles missing files gracefully without requiring error handling by agents

### Verification:
- Agent receives complete context response within 500ms when calling tool
- Custom instructions from `.paw/instructions/` only affect current workspace
- User instructions from `~/.paw/instructions/` apply across workspaces unless overridden
- Empty response returned when no custom instructions exist (not an error)
- Unit tests verify file loading, parsing, and error handling
- Integration tests verify tool registration and invocation through VS Code API

## What We're NOT Doing

- Validation or enforcement of custom instruction content (agents interpret instructions)
- Composition or merging of custom instructions into agent files (tool is read-only)
- Automatic detection of calling agent name (agents must handle instruction filtering)
- Editing or writing custom instruction files (tool only reads)
- Caching of loaded instructions across tool invocations (fresh read each call)
- Integration with GitHub Copilot's `.github/custom-instructions.md` (separate feature)
- Hot-reloading of instructions when files change during execution
- Multi-root workspace support beyond first workspace folder

## Implementation Approach

Follow the established three-layer architecture pattern:

1. **Type definitions**: Define TypeScript interfaces for parameters (`ContextParams`) and results (`ContextResult`)
2. **Core business logic**: Implement `getContext()` function that reads files and returns structured results
3. **Tool registration**: Implement VS Code API integration in `registerContextTool()` function

Use existing modules (`customInstructions.ts`, `platformDetection.ts`) for consistency. Read WorkflowContext.md as raw content without parsing. Format tool response as natural language text with Markdown sections for workspace instructions, user instructions, and raw workflow context content.

## Phase Summary

1. **Phase 1: Implement Context Tool Core Logic** - Create TypeScript interfaces, business logic function, WorkflowContext.md reader, and custom instruction loader with error handling
2. **Phase 2: Register Tool with VS Code Language Model API** - Implement tool registration function with VS Code API integration, add package.json declaration, and register in extension activation
3. **Phase 3: Update Agent Templates and Generated Prompts** - Modify agent files to call context tool at startup, update prompt generation to pass feature slug instead of WorkflowContext.md path
4. **Phase 4: Testing and Validation** - Create unit tests for core logic, integration tests for tool registration, and manual testing across platforms

---

## Phase 1: Implement Context Tool Core Logic

### Overview
Create the core TypeScript implementation for the context tool, including type definitions, business logic, and file operations. This phase establishes the foundation for loading custom instructions and parsing workflow metadata.

### Changes Required:

#### 1. Create Context Tool Type Definitions
- [x] Create new file with TypeScript interfaces following pattern established in `src/tools/createPromptTemplates.ts:29-67`
- [x] Define `ContextParams` interface with required `feature_slug: string` and `agent_name: string` parameters
- [x] Define `ContextResult` interface with nested objects for `workspace_instructions`, `user_instructions`, and `workflow_context`
- [x] Define `InstructionStatus` interface with `exists: boolean`, `content: string`, and `error?: string` fields (reused for all three content types)
- [x] Export all interfaces for testing and reuse

#### 2. Implement WorkflowContext.md Reader
- [x] Implement `loadWorkflowContext(filePath: string): InstructionStatus` function
- [x] Use `fs.existsSync()` to check file presence, return `{ exists: false, content: '', error: undefined }` if missing
- [x] Read file content with `fs.readFileSync(filePath, 'utf-8')` and trim whitespace
- [x] Return raw file content as-is without parsing: `{ exists: true, content: fileContent.trim(), error: undefined }`
- [x] Follow error handling pattern from `src/prompts/customInstructions.ts:24-54`
- [x] Catch read errors and return `{ exists: true, content: '', error: 'Failed to read...' }`

#### 3. Implement Custom Instructions Loader
- [x] Implement `loadCustomInstructions(directory: string, agentName: string): InstructionStatus` function
- [x] Use `fs.existsSync()` to check directory existence
- [x] If directory doesn't exist, return `{ exists: false, content: '', error: undefined }`
- [x] Construct instruction file path: `path.join(directory, `${agentName}-instructions.md`)`
- [x] Use `fs.existsSync()` to check if agent-specific file exists
- [x] If file doesn't exist, return `{ exists: false, content: '', error: undefined }`
- [x] Read file content using `fs.readFileSync(filePath, 'utf-8')` and trim whitespace
- [x] Follow error handling pattern from `src/prompts/customInstructions.ts:24-54`
- [x] Return `{ exists: true, content: fileContent.trim(), error: undefined }` on success
- [x] Catch read errors and return `{ exists: true, content: '', error: 'Failed to read...' }`

#### 4. Implement Core Business Logic Function
- [x] Implement `export async function getContext(params: ContextParams): Promise<ContextResult>` function
- [x] Validate feature slug format (alphanumeric and hyphens only) to prevent path traversal
- [x] Validate agent name is provided and non-empty
- [x] Determine workspace path: use `vscode.workspace.workspaceFolders[0].uri.fsPath` or search for workspace containing `.paw/work/<feature-slug>/`
- [x] Construct workspace instructions directory: `path.join(workspacePath, '.paw', 'instructions')`
- [x] Load workspace instructions using `loadCustomInstructions(directory, params.agent_name)`
- [x] Construct user instructions directory: `path.join(os.homedir(), '.paw', 'instructions')`
- [x] Load user instructions using `loadCustomInstructions(directory, params.agent_name)`
- [x] Construct WorkflowContext.md path: `path.join(workspacePath, '.paw', 'work', featureSlug, 'WorkflowContext.md')`
- [x] Load raw WorkflowContext.md content using `loadWorkflowContext()`
- [x] Wrap all operations in try-catch blocks, returning partial results on errors
- [x] Return complete `ContextResult` object

#### 5. Implement Response Formatter
- [x] Implement `formatContextResponse(result: ContextResult): string` function
- [x] Format as natural language Markdown text following pattern from `src/prompts/customInstructions.ts:64-76`
- [x] Create sections for workspace instructions, user instructions, and workflow context (raw WorkflowContext.md content)
- [x] Indicate precedence rules: "Workspace instructions take precedence over user instructions"
- [x] Include instructional text: "Follow custom instructions in addition to your standard instructions. Custom instructions take precedence where conflicts exist."
- [x] Omit empty sections (files that don't exist or have no content)
- [x] Include raw WorkflowContext.md content in a dedicated section with Markdown code fence for readability
- [x] Return formatted string suitable for agent consumption

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `npm run compile`
- [x] No linting errors: `npm run lint` (if lint script exists)
- [x] `ContextParams` interface exports with required `feature_slug` field
- [x] `ContextResult` interface exports with nested structures
- [x] `getContext()` function exports and has correct signature
- [x] File can be imported without errors: `import { getContext } from './tools/contextTool'`

#### Manual Verification:
- [x] Feature slug validation rejects strings with path traversal characters (`../`, `./`, absolute paths)
- [x] Agent name validation rejects empty strings or invalid characters
- [x] WorkflowContext.md reader returns complete raw file content without modification
- [x] Missing WorkflowContext.md returns `exists: false` without throwing errors
- [x] Custom instructions loader correctly finds agent-specific instruction files
- [x] Missing agent-specific instruction file returns `exists: false` not an error
- [x] Response formatter creates readable Markdown with clear sections including raw workflow context

Phase 1 Implementation Complete - Ready for Review

Automated verification passed:
- TypeScript compilation succeeded
- Manual verification script passed all tests (validation, file loading, formatting)

All changes committed locally. Please ask the Implementation Review Agent to review my changes, add documentation, and open the Phase PR.


---

## Phase 2: Register Tool with VS Code Language Model API

### Overview
Integrate the context tool with VS Code's Language Model Tool API, enabling agents to discover and invoke the tool through the standard tool registry.

### Changes Required:

#### 1. Implement Tool Registration Function
**File**: `src/tools/contextTool.ts`
**Changes**:
- Implement `export function registerContextTool(context: vscode.ExtensionContext): void` function following pattern from `src/tools/createPromptTemplates.ts:347-387`
- Call `vscode.lm.registerTool<ContextParams>('paw_get_context', { ... })` with tool name matching package.json
- Implement `prepareInvocation()` method returning confirmation UI:
  - `invocationMessage`: "Retrieving PAW context for feature: {feature_slug}"
  - `confirmationMessages`: Title "Get PAW Context" with description of what will be loaded
- Implement `invoke()` method:
  - Extract `feature_slug` from `options.input`
  - Call `await getContext({ feature_slug })`
  - Format result using `formatContextResponse()`
  - Wrap in `new vscode.LanguageModelToolResult([new vscode.LanguageModelTextPart(formattedText)])`
  - Handle exceptions with try-catch, returning error result with descriptive message
- Check `token.isCancellationRequested` before expensive operations
- Push tool registration to `context.subscriptions.push()` for proper disposal

#### 2. Add Package.json Tool Declaration
**File**: `package.json`
**Changes**:
- Add new entry to `contributes.languageModelTools` array following format at `package.json:42-95`
- Set `name: "paw_get_context"` matching registration call
- Set `displayName: "Get PAW Context"`
- Set `modelDescription` to detailed description for language model: "Retrieve workspace-specific custom instructions, user-level custom instructions, and workflow context for PAW agents. Returns formatted text with custom instructions from .paw/instructions/ (workspace) and ~/.paw/instructions/ (user), plus raw WorkflowContext.md content."
- Set `toolReferenceName: "pawContext"` for `#pawContext` references
- Set `canBeReferencedInPrompt: true`
- Define `inputSchema`:
  - `type: "object"`
  - `properties.feature_slug`: `{ type: "string", description: "The normalized feature slug (e.g., 'auth-system')" }`
  - `properties.agent_name`: `{ type: "string", description: "The name of the calling agent (e.g., 'PAW-02B Impl Planner')" }`
  - `required: ["feature_slug", "agent_name"]`

#### 3. Register Tool in Extension Activation
**File**: `src/extension.ts`
**Changes**:
- Import `registerContextTool` from `./tools/contextTool` at top of file
- Add call to `registerContextTool(context)` after existing tool registrations (around line 36-38)
- Add log message: `outputChannel.appendLine('[INFO] Registered language model tool: paw_get_context')`
- Ensure registration happens during extension activation, before agents might call tool

### Success Criteria:

#### Automated Verification:
- [ ] Extension compiles without errors: `npm run compile`
- [ ] Package.json validates against VS Code extension schema
- [ ] Tool name in code matches package.json declaration: `paw_get_context`
- [ ] `inputSchema` in package.json includes both `feature_slug` and `agent_name` in required array
- [ ] Extension activates successfully when loaded in VS Code

#### Manual Verification:
- [ ] Tool appears in VS Code's language model tool registry after extension activation
- [ ] Confirmation dialog shows "Get PAW Context" with feature slug and agent name when tool is invoked
- [ ] Tool can be referenced in agent prompts using `#pawContext`
- [ ] Calling tool with valid feature slug and agent name returns formatted context response
- [ ] Calling tool with missing feature slug or agent name returns error message about required parameter
- [ ] Cancelling tool invocation (via CancellationToken) terminates within 100ms

---

## Phase 3: Update Agent Templates and Generated Prompts

### Overview
Modify PAW agent templates to call the context tool at startup and update the prompt generation logic to pass feature slug instead of WorkflowContext.md path, enabling dynamic context loading.

### Changes Required:

#### 1. Update Agent Template Files with Context Tool Instructions
**Files**: `agents/PAW-01A Specification.agent.md`, `agents/PAW-01B Spec Researcher.agent.md`, `agents/PAW-02A Code Researcher.agent.md`, `agents/PAW-02B Impl Planner.agent.md`, `agents/PAW-03A Implementer.agent.md`, `agents/PAW-03B Impl Reviewer.agent.md`, `agents/PAW-04 Documenter.agent.md`, `agents/PAW-05 PR.agent.md`, `agents/PAW-R1A Understanding.agent.md`, `agents/PAW-R1B Baseline Researcher.agent.md`, `agents/PAW-R2A Impact Analyzer.agent.md`, `agents/PAW-R2B Gap Analyzer.agent.md`, `agents/PAW-R3A Feedback Generator.agent.md`, `agents/PAW-R3B Feedback Critic.agent.md`, `agents/PAW-X Status Update.agent.md`

**Changes**:
- Add new section titled "## PAW Context and Custom Instructions" after initial instructions
- Add agent identity line: "**Your Agent Name**: <agent-specific-name>" (e.g., "PAW-02B Impl Planner" for the Implementation Planner agent)
- Add instruction: "At the beginning of your work, call the `paw_get_context` tool with the feature slug and your agent name to retrieve workspace-specific custom instructions, user-level custom instructions, and workflow context."
- Include example tool call with the agent's specific name
- Add precedence rule: "Workspace custom instructions take precedence over user custom instructions. Custom instructions take precedence over your default instructions where conflicts exist."
- Add note about feature slug: "The feature slug is provided in the generated prompt file that invokes this agent."
- Position before "Initial Response" or workflow-specific sections
- Each agent file gets its own specific agent name (must match the agent file name exactly)

**Brief Example** (add to each agent, with agent-specific name):
```markdown
## PAW Context and Custom Instructions

**Your Agent Name**: PAW-02B Impl Planner

At the beginning of your work, call the `paw_get_context` tool with the feature slug and your agent name to retrieve:
- Workspace-specific custom instructions from `.paw/instructions/PAW-02B Impl Planner-instructions.md`
- User-level custom instructions from `~/.paw/instructions/PAW-02B Impl Planner-instructions.md`
- Workflow context from `WorkflowContext.md` (feature slug, target branch, work title, etc.)

Example tool call:
```
paw_get_context(feature_slug: "<feature-slug>", agent_name: "PAW-02B Impl Planner")
```

Precedence rules:
- Workspace custom instructions override user custom instructions
- Custom instructions override your default instructions where conflicts exist

The feature slug is provided in the generated prompt file that invokes this agent.
```

#### 2. Update Prompt Template Generation to Pass Feature Slug
**File**: `src/tools/createPromptTemplates.ts`
**Changes**:
- Locate prompt file generation logic for each stage (around lines 100-246)
- Update template content for each stage to include feature slug parameter instead of WorkflowContext.md path
- Replace instructions like "Read WorkflowContext.md at <path>" with "Feature slug: <feature-slug>"
- Remove any references to reading WorkflowContext.md directly from generated prompts
- Ensure feature slug is passed consistently across all stage templates (spec, code-research, plan, implementation, etc.)
- Template format: Simple parameter declaration like `Feature slug: ${params.feature_slug}`
- Do NOT include instructions about calling `paw_get_context` tool (those instructions are in agent .agent.md files)

**Brief Example**:
```typescript
// Before:
Note:
- Read WorkflowContext.md at .paw/work/${params.feature_slug}/WorkflowContext.md

// After:
Note:
- Feature slug: ${params.feature_slug}
```

#### 3. Lint Updated Agent Files
**File**: All agent files in `agents/` directory
**Changes**:
- Run `./scripts/lint-agent.sh` on each modified agent file per `.github/copilot-instructions.md` requirement
- Fix any linting errors or warnings identified by the script
- Ensure consistent formatting and structure across all agent files
- Verify no syntax errors or malformed Markdown

### Success Criteria:

#### Automated Verification:
- [ ] All agent files pass linter: `./scripts/lint-agent.sh agents/*.agent.md`
- [ ] TypeScript compilation succeeds after updating createPromptTemplates.ts: `npm run compile`
- [ ] Generated prompt files contain feature slug parameter: manually inspect generated files
- [ ] No references to WorkflowContext.md path remain in generated prompts (verify with grep)

#### Manual Verification:
- [ ] Agent template instructions are clear and consistent across all 15 agent files
- [ ] Precedence rules are correctly stated in each agent file
- [ ] Generated prompt files include correct feature slug parameter
- [ ] Agents can successfully call `paw_get_context` tool when following prompt instructions
- [ ] Custom instructions are correctly applied by agents (test with sample instruction file)
- [ ] Agents no longer attempt to read WorkflowContext.md directly

---

## Phase 4: Testing and Validation

### Overview
Comprehensive testing to verify correct behavior across platforms, error cases, and integration scenarios. Includes unit tests for core logic, integration tests for VS Code API, and manual testing for platform-specific paths.

### Changes Required:

#### 1. Create Unit Tests for Core Logic
**File**: `src/test/suite/contextTool.test.ts`
**Changes**:
- Create new test file following structure from `src/test/suite/createPromptTemplates.test.ts`
- Import test functions: `describe`, `it`, `before`, `after` from Mocha
- Import assertion library: `assert` from Node.js or `chai`
- Test `loadWorkflowContext()`:
  - Valid WorkflowContext.md returns complete raw file content
  - Missing file returns `exists: false`
  - Empty file returns `exists: true` with empty content
  - File read errors return `exists: true` with error message
- Test `loadCustomInstructions()`:
  - Missing directory returns `exists: false`
  - Missing agent-specific instruction file returns `exists: false`
  - Valid agent-specific instruction file returns file content
  - File read errors return `exists: true` with error message
- Test `getContext()`:
  - Valid feature slug and agent name loads all three sources (workspace, user, workflow)
  - Invalid feature slug format throws error or returns error result
  - Missing or empty agent name throws error or returns error result
  - Missing workspace instructions returns partial results (user + workflow only)
  - All files missing returns empty results without throwing errors
- Use temporary directories for file system tests: `fs.mkdtempSync()`
- Clean up temp files in `after()` hooks

#### 2. Create Integration Tests for Tool Registration
**File**: `src/test/suite/contextTool.test.ts`
**Changes**:
- Test tool registration with VS Code API (requires VS Code test environment)
- Verify tool appears in `vscode.lm` registry after registration
- Mock `vscode.ExtensionContext` with subscriptions array
- Test `invoke()` method:
  - Valid parameters return `LanguageModelToolResult` with text content
  - Missing feature slug returns error result
  - Result content is formatted Markdown text, not raw JSON
- Test `prepareInvocation()` method returns confirmation messages
- Test cancellation token handling: invoke tool with pre-cancelled token, verify quick termination

#### 3. Platform-Specific Path Testing
**File**: `src/test/suite/contextTool.test.ts`
**Changes**:
- Test user instructions path resolution on each platform (mock `os.platform()` and `os.homedir()`)
- Windows: verify path is `<homedir>\.paw\instructions`
- macOS: verify path is `<homedir>/.paw/instructions`
- Linux: verify path is `<homedir>/.paw/instructions`
- WSL: verify path uses `os.homedir()` result (may be `/home/user` or `/mnt/c/Users/user` depending on platform detection)
- Use `path.join()` assertions to verify cross-platform path construction

#### 4. Manual End-to-End Testing
**Description**: Manual testing across platforms and real workspace scenarios
**Changes**:
- Test on Windows, macOS, and Linux (or WSL)
- Create sample workspace with `.paw/instructions/PAW-02B Impl Planner-instructions.md`
- Create user instructions at `~/.paw/instructions/PAW-02B Impl Planner-instructions.md`
- Create WorkflowContext.md with all fields populated
- Invoke Implementation Planner agent with generated prompt
- Verify agent calls `paw_get_context` tool successfully
- Verify agent receives formatted context response with all three sources
- Verify workspace instructions take precedence in agent behavior
- Test with missing files: remove workspace instructions, verify user instructions still loaded
- Test with missing WorkflowContext.md: verify tool doesn't fail, returns empty metadata
- Verify agent behavior adapts to custom instructions (e.g., test instruction: "Always include ADRs in plans")

### Success Criteria:

#### Automated Verification:
- [ ] All unit tests pass: `npm test`
- [ ] Test coverage for core functions (getContext, parseWorkflowContext, loadAllCustomInstructions) exceeds 80%
- [ ] TypeScript compilation of test files succeeds: `npm run compile`
- [ ] No linting errors in test files

#### Manual Verification:
- [ ] Tool successfully loads workspace instructions on sample project
- [ ] Tool successfully loads user instructions from home directory
- [ ] Tool returns complete raw WorkflowContext.md content without parsing
- [ ] Response format is readable Markdown with clear sections
- [ ] Missing files handled gracefully (no errors, empty sections omitted)
- [ ] Precedence rules enforced: workspace overrides user instructions
- [ ] Platform-specific paths resolve correctly on Windows, macOS, Linux
- [ ] Agents successfully call tool and adapt behavior based on custom instructions
- [ ] Tool invocation completes within 500ms on typical workspace

---

## Testing Strategy

### Unit Tests:
- Test WorkflowContext.md reader with valid, empty, and missing files
- Test custom instruction loader with agent-specific files (missing, valid, error cases)
- Test core `getContext()` function with all success and error scenarios
- Test response formatter produces correct Markdown structure with raw workflow context
- Test feature slug and agent name validation rejects invalid inputs

### Integration Tests:
- Test tool registration with VS Code Language Model API
- Test tool appears in registry after extension activation
- Test `invoke()` method with valid and invalid parameters
- Test cancellation token handling during tool invocation
- Test confirmation UI messages from `prepareInvocation()`

### Manual Testing Steps:
1. Install extension in VS Code development instance
2. Create workspace with `.paw/instructions/<agent>-instructions.md` files
3. Create user instructions at `~/.paw/instructions/<agent>-instructions.md`
4. Generate prompt file with feature slug parameter
5. Invoke agent from generated prompt
6. Verify agent calls `paw_get_context` tool successfully
7. Verify agent receives complete context response
8. Verify agent behavior adapts to custom instructions
9. Test missing files scenario (remove workspace instructions, verify graceful handling)
10. Test on multiple platforms (Windows, macOS, Linux)

## Performance Considerations

- File reads are synchronous but typically complete in <50ms for files under 1MB
- Multiple file reads (workspace + user + WorkflowContext) complete in <150ms total
- No network calls or external dependencies
- Memory footprint minimal: holds file contents in memory only during tool invocation
- No caching implemented: fresh reads each invocation (acceptable for infrequent calls at agent startup)

## Migration Notes

No migration required - this is a new feature. Existing workspaces without custom instructions continue working unchanged. Agents that don't call the tool continue using default behavior.

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/86
- Spec: `.paw/work/paw-context-tool-for-custom-instructions/Spec.md`
- Research: `.paw/work/paw-context-tool-for-custom-instructions/SpecResearch.md`, `.paw/work/paw-context-tool-for-custom-instructions/CodeResearch.md`
- Similar implementation: `src/tools/createPromptTemplates.ts` (tool registration pattern)
- Custom instructions loading: `src/prompts/customInstructions.ts:18-56`
- Platform detection: `src/agents/platformDetection.ts:92-286`
