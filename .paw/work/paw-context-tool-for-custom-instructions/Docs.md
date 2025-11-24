# PAW Context Tool for Custom Instructions

## Overview

The PAW Context Tool (`paw_get_context`) is a VS Code Language Model Tool that enables PAW agents to dynamically retrieve workspace-specific custom instructions, user-level custom instructions, and workflow metadata at runtime. This solves a fundamental challenge in PAW workflows: how to maintain clean separation between globally-installed agent files and project-specific or user-specific customizations without requiring agents to be reinstalled for every workspace.

When PAW agents are installed globally in VS Code's prompts directory, they are shared across all workspaces. This creates a conflict: different projects have different conventions, standards, and requirements, yet the agent definitions themselves cannot encode project-specific behavior without polluting the global agent files. The Context Tool resolves this by providing a centralized mechanism for agents to load context on-demand based on the current workspace and user environment.

At the beginning of each workflow stage, agents call `paw_get_context` with two parameters: the feature slug identifying the current work item, and the agent's name. The tool searches for custom instruction files at both workspace level (`.paw/instructions/<agent-name>-instructions.md`) and user level (`~/.paw/instructions/<agent-name>-instructions.md`), loads the raw WorkflowContext.md file containing workflow metadata, and returns all three pieces of information in a single structured response. Workspace instructions take precedence over user instructions, allowing projects to enforce specific standards while respecting individual developer preferences for behaviors not overridden by the project.

This design enables flexible, workspace-aware agent behavior while preserving the simplicity of globally installed agent files. Developers can customize PAW workflows at both the user and project levels without manual configuration or context switching overhead.

## Architecture and Design

### High-Level Architecture

The Context Tool follows a three-layer architecture pattern consistent with other PAW tools:

1. **Type Definitions Layer** (`ContextParams`, `ContextResult`, `InstructionStatus`): TypeScript interfaces defining the contract between agents and the tool
2. **Core Business Logic Layer** (`getContext()`, `loadWorkflowContext()`, `loadCustomInstructions()`): Pure functions handling file operations, validation, and data aggregation
3. **VS Code API Integration Layer** (`registerContextTool()`): Registration with VS Code Language Model Tool API including confirmation UI and error handling

The tool is registered in `package.json` under `contributes.languageModelTools` with input schema declaring `feature_slug` and `agent_name` as required parameters. When an agent invokes the tool through VS Code's language model API, the request flows through the registration layer (which handles cancellation tokens and error wrapping), into the core business logic (which performs validation, file loading, and response formatting), and returns a `LanguageModelToolResult` containing tagged XML-style sections for workspace instructions, user instructions, and workflow context.

### Key Components

**contextTool.ts** - Main implementation file containing all tool logic:
- `ContextParams` interface: Defines tool input parameters (feature_slug, agent_name)
- `InstructionStatus` interface: Standardized result structure for file loading operations (exists, content, error fields)
- `ContextResult` interface: Aggregated response containing workspace instructions, user instructions, and workflow context
- `getContext()` function: Main entry point orchestrating validation, path resolution, and file loading
- `loadWorkflowContext()` function: Reads and returns raw WorkflowContext.md content without parsing
- `loadCustomInstructions()` function: Loads agent-specific instruction files from a directory
- `formatContextResponse()` function: Formats structured ContextResult into XML-tagged text for agent consumption
- `registerContextTool()` function: Registers tool with VS Code API including confirmation UI and error handling

**Platform Detection Integration** - Reuses existing `platformDetection.ts` module for consistent user directory resolution across Windows, macOS, Linux, and WSL environments. The tool uses `os.homedir()` for user instruction paths, which automatically adapts to platform conventions.

**Component Registration in extension.ts** - The tool is registered during extension activation via `registerContextTool(context)`, ensuring it's available to agents immediately when the extension activates.

### Design Decisions

**Decision: Return raw WorkflowContext.md content without parsing**

Rationale: WorkflowContext.md format may evolve over time as PAW adds new workflow parameters. Parsing the file would couple the Context Tool to the specific field format, requiring updates whenever new fields are added. By returning raw content and letting agents parse what they need, the tool remains future-proof and agents can extract only the fields relevant to their stage. This also respects the principle that agents should understand the workflow metadata format rather than the tool imposing a specific structure.

**Decision: Use XML-style tags (`<workspace_instructions>`, `<user_instructions>`, `<workflow_context>`) instead of Markdown headers**

Rationale: Custom instruction files are Markdown documents that may contain their own headings and structure. If the tool wrapped content in Markdown sections (e.g., `## Workspace Instructions`), agent-visible headers within custom instructions could create ambiguity about where sections begin and end. XML-style tags provide unambiguous delimiters that cannot be confused with user content, making response parsing reliable even when instruction files contain complex Markdown structure.

**Decision: Validate feature slug directory existence rather than just format**

Rationale: Original design only validated feature slug format (alphanumeric and hyphens) to prevent path traversal. However, this meant agents would receive empty results when they provided a typo or incorrect slug, with no clear indication that the slug itself was wrong. By checking if `.paw/work/<feature-slug>/` exists as the primary validation, the tool can throw a descriptive error immediately when the directory is missing, enabling agents to correct the slug and retry. Format validation remains as a secondary security check to prevent path traversal attacks.

**Decision: Graceful handling of missing custom instruction files (exists: false) but error on missing feature slug directory**

Rationale: Custom instructions are optional—many workspaces and users will not have them, so missing instruction files are a normal case that shouldn't produce errors. However, a missing feature slug directory indicates a fundamental problem (wrong slug, workflow not initialized, or workspace mismatch). Throwing an error for missing feature directories provides clear feedback that enables agents to diagnose and fix the underlying issue, while gracefully handling missing instruction files keeps the tool simple to use when customizations don't exist.

**Decision: Return structured InstructionStatus with exists/content/error fields instead of throwing on file read errors**

Rationale: File operations can fail for various reasons (permissions, encoding, filesystem issues). Throwing exceptions for file read errors would require agents to implement complex error handling. The InstructionStatus pattern allows the tool to continue loading remaining files even if one fails, returning partial results with descriptive error messages in the `error` field. Agents receive maximum available context and can decide how to handle partial failures based on their needs.

**Decision: No caching of loaded instructions across tool invocations**

Rationale: Agents call the Context Tool once at the beginning of their workflow stage, not repeatedly during execution. Caching would add complexity for minimal performance benefit, and stale caches could cause agents to miss updated custom instructions if users modify instruction files during a workflow. Fresh reads on each invocation ensure agents always have current context while keeping the tool stateless and simple.

### Integration Points

**VS Code Extension Activation** - `src/extension.ts` calls `registerContextTool(context)` during the `activate()` function, registering the tool with VS Code's Language Model Tool API. The tool becomes discoverable to agents immediately after extension activation.

**Agent Template Files** - All 15 PAW agent files in `agents/` directory include a "PAW Context and Custom Instructions" section generated from the reusable component template `agents/components/paw-context.component.md`. This section instructs agents to call `paw_get_context` at startup with their specific agent name and the feature slug provided in generated prompt files.

**Prompt Template Generation** - `src/tools/createPromptTemplates.ts` generates prompt files for each workflow stage, passing the feature slug as a parameter. Agents read this parameter from their generated prompt file and pass it to `paw_get_context` to retrieve workspace context.

**Custom Instructions Files** - Developers create Markdown files in `.paw/instructions/<agent-name>-instructions.md` (workspace level) or `~/.paw/instructions/<agent-name>-instructions.md` (user level) containing free-form instructions that override or augment agent default behavior. The tool loads these files when they exist but handles their absence gracefully.

**WorkflowContext.md** - The Context Tool reads `.paw/work/<feature-slug>/WorkflowContext.md` to provide workflow metadata (feature slug, target branch, work title, issue URL, workflow mode, review strategy) to agents. This file is created by the workflow initialization process and updated as workflow parameters are determined.

## Technical Reference

### Tool Registration

**Tool Name**: `paw_get_context`  
**Display Name**: "Get PAW Context"  
**Model Description**: "Retrieve workspace-specific custom instructions, user-level custom instructions (if they exist), and workflow context for PAW agents. Returns formatted text with sections wrapped in XML tags: `<workspace_instructions>` for workspace .paw/instructions/, `<user_instructions>` for user ~/.paw/instructions/, and `<workflow_context>` for raw WorkflowContext.md content."  
**Tool Reference Name**: `pawContext` (for `#pawContext` references in prompts)

### Input Parameters

**feature_slug** (required, string): The normalized feature slug identifying the workflow (e.g., "auth-system", "api-refactor-v2"). Must contain only lowercase letters, numbers, and hyphens. The tool validates this slug and verifies that `.paw/work/<feature-slug>/` directory exists.

**agent_name** (required, string): The name of the calling agent (e.g., "PAW-02B Impl Planner", "PAW-04 Documenter"). Used to construct instruction filenames: `<agent-name>-instructions.md`.

### Output Format

The tool returns a `LanguageModelToolResult` containing natural language text with XML-style tags delimiting sections:

```xml
<workspace_instructions>
[Markdown content from .paw/instructions/<agent-name>-instructions.md]
<warning>[Error message if file read failed]</warning>
</workspace_instructions>

<user_instructions>
[Markdown content from ~/.paw/instructions/<agent-name>-instructions.md]
<warning>[Error message if file read failed]</warning>
</user_instructions>

<workflow_context>
```markdown
[Raw WorkflowContext.md content]
```
<warning>[Error message if file read failed]</warning>
</workflow_context>
```

If no content exists for any section, the tool returns:
```xml
<context status="empty" />
```

### Error Handling

**Validation Errors** (thrown immediately, no partial results returned):
- Missing or empty feature_slug: "Invalid feature_slug: value must be a non-empty string."
- Invalid feature slug format: "Invalid feature_slug format: '...'. Feature slugs must contain only lowercase letters, numbers, and hyphens."
- Feature slug directory doesn't exist: "Feature slug '...' not found in any workspace. Expected directory .paw/work/.../to exist..."
- Missing or empty agent_name: "Invalid agent_name: value must be a non-empty string."
- No workspace open: "Unable to determine workspace path: no workspace folder is currently open."

**File Read Errors** (returned in `error` field of InstructionStatus, partial results still returned):
- Permission denied: "Failed to read [file type]: EACCES: permission denied..."
- File encoding issues: "Failed to read [file type]: [error details]"
- Filesystem errors: "Failed to read [file type]: [error message]"

When file read errors occur, the tool sets `exists: true`, `content: ''`, and includes the error message in the `error` field. This allows agents to receive partial context for files that did load successfully.

### Path Resolution

**Workspace Instructions**: `.paw/instructions/<agent-name>-instructions.md` relative to workspace root

**User Instructions**: `~/.paw/instructions/<agent-name>-instructions.md` where `~` resolves to:
- Windows: `%USERPROFILE%` (e.g., `C:\Users\username\.paw\instructions\`)
- macOS: `/Users/username/.paw/instructions/`
- Linux: `/home/username/.paw/instructions/`
- WSL: Uses `os.homedir()` result (typically `/home/username/` in WSL filesystem)

**WorkflowContext.md**: `.paw/work/<feature-slug>/WorkflowContext.md` relative to workspace root

The tool searches all open workspace folders for the feature slug directory. If multiple workspaces are open, it uses the first workspace containing `.paw/work/<feature-slug>/`. For testing, the environment variable `PAW_WORKSPACE_PATH` can override workspace folder detection.

## Usage Examples

### Example 1: Agent Calls Context Tool at Startup

An Implementation Planner agent begins work on feature "auth-system" and needs to retrieve custom instructions:

**Agent Action**:
```
paw_get_context(feature_slug: "auth-system", agent_name: "PAW-02B Impl Planner")
```

**Tool Response** (when both workspace and user instructions exist):
```xml
<workspace_instructions>
# Implementation Planning Guidelines

When creating implementation plans:
- Always include an ADR section for major architectural decisions
- Break phases at natural PR boundaries (no phase should exceed 15 files changed)
- Include rollback strategy in each phase
</workspace_instructions>

<user_instructions>
# Personal Planning Preferences

- Keep plan descriptions concise (1-2 paragraphs per phase)
- Always verify dependencies before planning implementation
</user_instructions>

<workflow_context>
```markdown
# WorkflowContext

Work Title: Authentication System
Feature Slug: auth-system
Target Branch: feature/auth-system
Workflow Mode: full
Review Strategy: prs
Issue URL: https://github.com/example/project/issues/123
Remote: origin
```
</workflow_context>
```

**Agent Interpretation**: The agent follows workspace instructions (ADRs, phase size limits, rollback strategy) as these take precedence. It also respects user preference for concise descriptions unless workspace instructions specify otherwise. It extracts target branch "feature/auth-system" and workflow mode "full" from the workflow context for its planning work.

### Example 2: Missing Custom Instructions (Normal Case)

A Documenter agent works in a workspace with no custom instructions:

**Agent Action**:
```
paw_get_context(feature_slug: "feature-docs", agent_name: "PAW-04 Documenter")
```

**Tool Response**:
```xml
<workflow_context>
```markdown
# WorkflowContext

Work Title: Feature Documentation
Feature Slug: feature-docs
Target Branch: feature/feature-docs
Workflow Mode: full
Review Strategy: prs
```
</workflow_context>
```

**Agent Interpretation**: No custom instructions exist, so the agent proceeds with default behavior. It still receives workflow context and can extract target branch and workflow mode for its documentation work.

### Example 3: Workspace Instructions Override User Preferences

Both workspace and user instructions exist with conflicting directives:

**Workspace Instructions** (`.paw/instructions/PAW-01A Specification-instructions.md`):
```markdown
# Specification Guidelines

All specifications must be detailed and comprehensive:
- Minimum 3 user stories per feature
- Every requirement must include rationale
- Success criteria must be measurable and specific
```

**User Instructions** (`~/.paw/instructions/PAW-01A Specification-instructions.md`):
```markdown
# My Spec Preferences

Keep specs concise - focus on essential requirements only.
```

**Tool Response**:
```xml
<workspace_instructions>
# Specification Guidelines

All specifications must be detailed and comprehensive:
- Minimum 3 user stories per feature
- Every requirement must include rationale
- Success criteria must be measurable and specific
</workspace_instructions>

<user_instructions>
# My Spec Preferences

Keep specs concise - focus on essential requirements only.
</user_instructions>

<workflow_context>
[...workflow metadata...]
</workflow_context>
```

**Agent Interpretation**: The agent prioritizes workspace instructions requiring comprehensive specs over user preference for conciseness, ensuring project standards are maintained despite individual preferences.

## Edge Cases and Limitations

**Multiple Workspaces Open**: The tool searches all open workspace folders and uses the first one containing `.paw/work/<feature-slug>/`. If the same feature slug exists in multiple workspaces (unusual), the tool cannot disambiguate—developers should use unique feature slugs across projects or work in single-workspace mode.

**Large Custom Instruction Files**: The tool reads entire file contents synchronously. Extremely large instruction files (>1MB) may cause performance issues or timeouts. Recommended limit: keep custom instruction files under 100KB for responsive tool invocations.

**Custom Instruction Files with Non-ASCII Characters**: The tool reads files using UTF-8 encoding and normalizes line endings. Files with non-UTF-8 encoding will produce read errors. Custom instructions should use plain ASCII or UTF-8 encoded Markdown.

**Agent Name Mismatch**: If an agent provides an agent name that doesn't match its actual name (e.g., "PAW-02B Impl Planner" calls with `agent_name: "PAW-01A Specification"`), the tool loads instructions for the wrong agent. Agents must pass their exact name as it appears in their agent file and instruction filename.

**WorkflowContext.md Format Changes**: The tool returns raw WorkflowContext.md content without parsing. If the file format changes significantly in future PAW versions, agents must adapt their parsing logic. The tool remains agnostic to file content, providing forward compatibility at the cost of requiring agent-side parsing knowledge.

**Path Traversal in Feature Slug**: The tool validates feature slug format and rejects strings containing path traversal characters (`../`, `./`, absolute paths). However, extremely unusual filesystem setups or symbolic links might circumvent validation. The tool assumes standard filesystem configurations and workspace structures.

**Concurrent Tool Invocations**: Multiple agents calling `paw_get_context` simultaneously (unusual in typical workflows) will each perform independent file reads. Node.js filesystem operations are synchronous and atomic at the OS level, preventing race conditions. However, if custom instruction files are being edited simultaneously by external processes, agents may see partial/inconsistent content.

**Cancellation During File Operations**: The tool checks `CancellationToken.isCancellationRequested` before and after expensive operations. However, synchronous file reads cannot be interrupted mid-operation. If a user cancels tool invocation during a file read, the tool completes the current read before returning the cancellation response.

## Testing Guide

### How to Test This Work

**Prerequisites**:
- VS Code with GitHub Copilot extension installed
- PAW Workflow Extension installed
- Git repository with PAW workflow structure (`.paw/work/<feature-slug>/`)

**Test 1: Verify Tool Registration**

1. Open VS Code with PAW extension active
2. Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
3. Start a new Copilot chat
4. Type `@workspace /tools` to list registered tools
5. **Expected**: `paw_get_context` appears in the tools list with description

**Test 2: Agent Retrieves Context with Custom Instructions**

1. Create workspace custom instructions:
   ```bash
   mkdir -p .paw/instructions
   cat > .paw/instructions/PAW-02B\ Impl\ Planner-instructions.md << 'EOF'
   # Planning Rules
   - Always include rollback strategy
   - Maximum 10 files per phase
   EOF
   ```

2. Create a test workflow:
   ```bash
   mkdir -p .paw/work/test-feature
   cat > .paw/work/test-feature/WorkflowContext.md << 'EOF'
   # WorkflowContext
   
   Work Title: Test Feature
   Feature Slug: test-feature
   Target Branch: feature/test
   EOF
   ```

3. Invoke Implementation Planner agent with context tool call:
   - Start GitHub Copilot chat
   - Send message: `@PAW-02B\ Impl\ Planner call paw_get_context with feature_slug "test-feature" and agent_name "PAW-02B Impl Planner" and show me the result`

4. **Expected**: Agent returns formatted response showing:
   - `<workspace_instructions>` section with "Planning Rules" content
   - `<user_instructions>` section (empty if no user instructions exist)
   - `<workflow_context>` section with WorkflowContext.md content
   
5. **Expected**: Agent acknowledges reading the custom instructions about rollback strategy and file limits

**Test 3: User-Level Instructions Across Workspaces**

1. Create user-level instructions:
   ```bash
   mkdir -p ~/.paw/instructions
   cat > ~/.paw/instructions/PAW-01A\ Specification-instructions.md << 'EOF'
   # My Spec Preferences
   - Keep success criteria concise
   - Always verify with stakeholders
   EOF
   ```

2. Open a different workspace (or remove workspace-level instructions from current workspace)

3. Invoke Specification agent with context tool call in the new workspace

4. **Expected**: Agent receives user instructions even though workspace has no project-specific instructions

**Test 4: Workspace Instructions Override User Instructions**

1. Create both workspace and user instructions with conflicting content:
   - Workspace: "Detailed specs required"
   - User: "Keep specs concise"

2. Invoke agent with context tool call

3. **Expected**: Response shows both sections but agent prioritizes workspace instructions

**Test 5: Missing Feature Slug Produces Clear Error**

1. Start Copilot chat and invoke:
   ```
   @PAW-02B Impl Planner call paw_get_context with feature_slug "nonexistent-feature" and agent_name "PAW-02B Impl Planner"
   ```

2. **Expected**: Tool returns error message: "Feature slug 'nonexistent-feature' not found in any workspace. Expected directory .paw/work/nonexistent-feature/ to exist..."

**Test 6: Empty Context (No Instructions, No Workflow)**

1. Create feature directory without WorkflowContext.md:
   ```bash
   mkdir -p .paw/work/empty-test
   ```

2. Invoke agent with feature_slug "empty-test"

3. **Expected**: Tool returns `<context status="empty" />` indicating no content available

**Test 7: Cross-Platform Path Resolution** (requires testing on multiple platforms)

On Windows:
1. Create user instructions at `%USERPROFILE%\.paw\instructions\`
2. Invoke agent and verify user instructions load from Windows user profile

On macOS/Linux:
1. Create user instructions at `~/.paw/instructions/`
2. Invoke agent and verify user instructions load from home directory

**Test 8: Component Template in Agent Files**

1. Open any agent file in `agents/` directory (e.g., `agents/PAW-02B Impl Planner.agent.md`)
2. Search for "PAW Context and Custom Instructions" section
3. **Expected**: Section exists with agent-specific name and example tool call
4. Verify all 15 agent files include this section with correct agent names

**Test 9: Generated Prompts Include Feature Slug**

1. Initialize a new workflow:
   ```
   PAW: New PAW Workflow
   ```

2. Provide target branch and work title

3. Open generated prompt files in `.paw/work/<feature-slug>/prompts/`

4. **Expected**: Each prompt file includes "Feature slug: <slug>" parameter

5. **Expected**: Prompts do NOT include instructions to read WorkflowContext.md directly (agents use tool instead)

### Automated Test Verification

Run the test suite to verify core functionality:

```bash
npm test
```

**Expected**: All 79 tests pass, including:
- `Context Tool > getContext loads workspace, user, and workflow content when present`
- `Context Tool > formatContextResponse uses tagged sections and warning metadata`
- `Context Tool > loadWorkflowContext > returns complete raw file content for valid file`
- `Context Tool > loadCustomInstructions > returns file content for valid agent-specific instruction file`
- `Context Tool > getContext validation > throws error for invalid feature slug format with path traversal`

## Migration and Compatibility

### For Existing PAW Users

No migration required. The Context Tool is a new feature that enhances agent capabilities without changing existing workflows:

**Agents continue working without custom instructions**: All agents include instructions to call `paw_get_context`, but the tool handles missing instruction files gracefully. If no custom instructions exist, agents receive empty context and proceed with default behavior.

**WorkflowContext.md format unchanged**: The tool reads WorkflowContext.md as raw content and returns it to agents. No changes to WorkflowContext.md structure are required.

**Existing workflows remain valid**: Workflows initialized before the Context Tool was added continue functioning. Agents call the tool, receive empty results for custom instructions (normal case), and proceed with default behavior.

### For Projects Adopting Custom Instructions

**Workspace-Level Customization** (project-specific standards):
1. Create `.paw/instructions/` directory in your repository
2. Add instruction files for agents you want to customize: `<agent-name>-instructions.md`
3. Commit these files to version control so all team members benefit from project standards
4. Example: `.paw/instructions/PAW-02B Impl Planner-instructions.md` for planning conventions

**User-Level Customization** (personal preferences across all projects):
1. Create `~/.paw/instructions/` directory in your home directory
2. Add instruction files for your personal workflow preferences
3. These instructions apply to all PAW workflows unless overridden by workspace instructions
4. Example: `~/.paw/instructions/PAW-01A Specification-instructions.md` for personal spec format preferences

### Breaking Changes

None. The Context Tool is an additive feature with no breaking changes to existing PAW workflows.

### Future Compatibility

**Custom Instruction Format**: Custom instructions are free-form Markdown documents. No specific structure is required, giving developers flexibility to provide instructions in whatever format is clearest for agents. This format is expected to remain stable indefinitely.

**WorkflowContext.md Parsing**: Agents parse WorkflowContext.md content themselves rather than the tool imposing a structure. If new fields are added to WorkflowContext.md in future PAW versions, agents can be updated to parse those fields without requiring changes to the Context Tool.

**Tool API Stability**: The tool follows VS Code Language Model Tool API conventions. As long as VS Code maintains API stability, the Context Tool will continue functioning. The tool is designed to be forward-compatible with potential API enhancements.

## References

### Implementation Artifacts

- **Specification**: `.paw/work/paw-context-tool-for-custom-instructions/Spec.md`
- **Implementation Plan**: `.paw/work/paw-context-tool-for-custom-instructions/ImplementationPlan.md`
- **Spec Research**: `.paw/work/paw-context-tool-for-custom-instructions/SpecResearch.md`
- **Code Research**: `.paw/work/paw-context-tool-for-custom-instructions/CodeResearch.md`

### Merged Pull Requests

- **Phase 1 PR #102**: Implement context tool core logic (business logic, file loaders, validation, response formatting)
- **Phase 2 PR #107**: Register tool with VS Code Language Model API (API integration, package.json declaration, extension activation)
- **Phase 3 PR #110**: Update agent templates with PAW Context tool integration (agent file updates, prompt template generation)
- **Phase 4 PR #111**: Comprehensive unit tests for PAW context tool (test coverage for all core functions and error paths)

### Source Files

- **Main Implementation**: `src/tools/contextTool.ts` (363 lines)
- **Extension Integration**: `src/extension.ts` (registration call at line 47)
- **Package Manifest**: `package.json` (tool declaration lines 98-122)
- **Agent Component Template**: `agents/components/paw-context.component.md`
- **Test Suite**: `src/test/suite/contextTool.test.ts` (comprehensive test coverage)

### Related Documentation

- **PAW Specification**: `paw-specification.md` (overall workflow structure)
- **VS Code Language Model Tool API**: VS Code extension API documentation for `vscode.lm.registerTool`
- **Platform Detection**: `src/agents/platformDetection.ts` (cross-platform path resolution)
- **Custom Instructions Loading**: `src/prompts/customInstructions.ts` (similar file loading patterns)

### External Resources

- **GitHub Issue #86**: Original feature request and discussion
- **VS Code Extension API**: https://code.visualstudio.com/api/references/vscode-api#lm
