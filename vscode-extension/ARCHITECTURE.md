# PAW Workflow Extension - Architecture

## Overview

The PAW Workflow extension provides automated work item initialization for the Phased Agent Workflow (PAW) methodology. It uses an **agent-driven architecture** where the extension acts as an orchestrator, delegating complex work to GitHub Copilot's agent mode.

## Design Philosophy

### Minimal Extension, Maximum Agent Leverage

The extension follows a "thin orchestrator" pattern:
- **Extension responsibilities**: User input collection, basic validation, prompt construction
- **Agent responsibilities**: Complex decision-making, file creation, git operations, slug normalization
- **Tool responsibilities**: Repeatable procedural operations (e.g., prompt template generation)

This approach keeps the extension codebase small and maintainable while leveraging AI capabilities for complex workflows.

## Architecture Components

### 1. Extension Entry Point (`src/extension.ts`)

**Purpose**: Extension lifecycle management

**Responsibilities**:
- Create output channel for transparent logging
- Register commands with VS Code
- Register language model tools for agent integration
- Clean up resources on deactivation

**Key Design Decisions**:
- Uses lazy activation (no explicit activationEvents in package.json)
- All disposables registered via `context.subscriptions` for automatic cleanup
- Output channel provides visibility into all operations

### 2. Command Handler (Phase 2: `src/commands/initializeWorkItem.ts`)

**Purpose**: Orchestrate work item initialization workflow

**Workflow**:
1. Validate workspace and git repository
2. Collect user inputs (target branch, GitHub issue URL)
3. Construct comprehensive agent prompt with PAW rules
4. Invoke GitHub Copilot agent mode
5. Monitor and log progress

**Error Handling**:
- Non-git repository: Prompt to initialize Git
- Missing workspace: Clear error message
- User cancellation: Graceful abort with logging

### 3. User Input Module (Phase 2: `src/ui/userInput.ts`)

**Purpose**: Collect and validate user inputs

**Inputs Collected**:
- **Target Branch**: Required, validated for basic git branch format
- **GitHub Issue URL**: Optional, validated for GitHub issue URL format

**Validation Strategy**:
- Basic format validation in extension (prevent obvious errors)
- Detailed normalization and validation delegated to agent (handle edge cases)

### 4. Agent Prompt Builder (Phase 3: `src/prompts/agentPrompt.ts`)

**Purpose**: Construct comprehensive prompt for agent

**Prompt Components**:
1. User-provided parameters (branch, issue URL, workspace path)
2. PAW specification rules (slug normalization, validation, uniqueness)
3. Work Title generation logic (from issue or branch name)
4. Directory structure requirements
5. WorkflowContext.md format specification
6. Language model tool invocation instructions
7. Git branch operation steps
8. Error handling guidance
9. Success criteria

**Design Notes**:
- Includes full PAW specification if available in workspace
- Provides fallback rules if specification not found
- Guides agent through step-by-step workflow
- Emphasizes error handling and user communication

### 5. Language Model Tools (Phase 2: `src/tools/createPromptTemplates.ts`)

**Purpose**: Provide reliable procedural operations for agents

**Tool: `paw_create_prompt_templates`**

**Parameters**:
- `feature_slug`: The normalized feature slug
- `workspace_path`: Absolute path to workspace root

**Operations**:
1. Create `.paw/work/<slug>/prompts/` directory
2. Generate all 9 prompt template files with correct frontmatter
3. Reference feature slug in each template body
4. Return success status and file list

**Why a Tool?**
- Prompt template generation is highly procedural (exact format required)
- Agents excel at decision-making, tools excel at repeatable operations
- Reduces prompt complexity and improves reliability
- Future-proof: Easy to extend with additional template types

### 6. Git Validation (Phase 2: `src/git/validation.ts`)

**Purpose**: Validate git repository state

**Functions**:
- `validateGitRepository()`: Check if directory is a git repository
- `hasUncommittedChanges()`: Check for uncommitted changes

**Design Notes**:
- Uses child_process to invoke git CLI (no dependencies)
- Async operations for non-blocking validation
- Clear error messages for troubleshooting

## Data Flow

```
User invokes "PAW: Initialize Work Item" command
    ↓
Extension validates workspace and git repository
    ↓
Extension collects user inputs (branch, issue URL)
    ↓
Extension constructs comprehensive agent prompt
    ↓
Extension invokes agent mode with prompt
    ↓
Agent:
  - Normalizes branch to feature slug
  - Generates Work Title (from issue or branch)
  - Creates directory structure
  - Generates WorkflowContext.md
  - Calls paw_create_prompt_templates tool
  - Creates and checks out git branch
  - Opens WorkflowContext.md in editor
    ↓
User reviews WorkflowContext.md and proceeds with PAW workflow
```

## Extension Configuration

### Package Manifest (`package.json`)

**Key Fields**:
- `activationEvents: []`: Lazy activation (loads only when needed)
- `main: "./out/extension.js"`: Compiled entry point
- `contributes.commands`: Declares "PAW: Initialize Work Item" command
- `engines.vscode`: Requires VS Code 1.85.0+ for language model tool APIs

### TypeScript Configuration (`tsconfig.json`)

**Key Settings**:
- `target: ES2020`: Modern JavaScript features
- `strict: true`: Maximum type safety
- `sourceMap: true`: Enable debugging
- `rootDir: src, outDir: out`: Clean source/build separation

### ESLint Configuration (`.eslintrc.json`)

**Rules**:
- TypeScript-recommended rules
- Semi-colon warnings
- Naming conventions for imports
- No-throw-literal (ensures proper error types)

## Testing Strategy

### Unit Tests (Phase 4)

**Test Coverage**:
- Input validation logic (branch names, URLs)
- Prompt construction (includes all required sections)
- Git validation helpers

**Test Framework**: Mocha with VS Code Test Runner

### Integration Tests (Phase 4)

**Test Scenarios**:
- Extension activation and command registration
- End-to-end command execution flow
- Output channel logging
- Agent mode invocation

### Manual Testing (Phase 4)

**Critical Paths**:
- Happy path with valid inputs
- GitHub issue integration
- Error handling (non-git repo, invalid inputs)
- User cancellation scenarios

## Dependencies

### Runtime Dependencies

None! The extension uses only:
- VS Code API (`vscode` module)
- Node.js built-ins (`child_process`, `fs`, `path`)

### Development Dependencies

- TypeScript compiler and type definitions
- ESLint for code quality
- Mocha for testing
- VS Code Test Runner for integration tests
- VSCE for packaging

## Future Enhancements

### Deferred to Future Work

These features are mentioned in Issue #35 but deferred to maintain focus:

1. **Language Model Tool: `paw_get_workflow_context`**
   - Read and parse WorkflowContext.md
   - Provide parameters to other agents
   
2. **Chatmode Management**
   - Install/update chatmode definitions
   - Detect chatmode version mismatches
   
3. **Smart Agent Launchers**
   - Commands that pre-populate agent prompts based on WorkflowContext.md
   - One-click spec creation, implementation, etc.
   
4. **UI Components**
   - Sidebar tree view showing work items
   - Status bar integration
   - Quick pick menus for phase navigation

### Extension Points for Expansion

The current architecture is designed for easy extension:

1. **Additional Language Model Tools**: Add tools by implementing and registering in `activate()`
2. **Additional Commands**: Follow the same pattern as `initializeWorkItem`
3. **Configuration Options**: Add settings via `contributes.configuration` in package.json
4. **Custom Views**: Add via `contributes.views` and `vscode.window.createTreeView()`

## Performance Characteristics

**Extension Activation**: < 100ms (lazy activation, minimal initialization)

**Command Execution**: < 2 seconds (user input collection + agent invocation)

**Memory Footprint**: < 10MB (no background processes, minimal state)

**Agent Execution**: 5-30 seconds (depends on agent response time, network)

## Security Considerations

1. **No External Network Calls**: Extension doesn't make HTTP requests (agent may)
2. **Git Operations**: Uses local git CLI (inherits user's git configuration)
3. **File System Access**: Limited to workspace directory
4. **No Secrets Storage**: Relies on GitHub Copilot authentication

## Maintainability Guidelines

### Code Style

- **Clear Function Names**: Describe what the function does
- **JSDoc Comments**: Document all exported functions, parameters, and return types
- **Error Messages**: User-friendly, actionable guidance
- **Logging**: Prefix with [INFO], [ERROR], [WARN] for easy filtering

### Adding New Features

1. Update ImplementationPlan.md with phased approach
2. Implement in small, testable increments
3. Add tests before merging
4. Update this ARCHITECTURE.md
5. Update README.md for user-facing features

### Debugging

**Output Channel**: Check "PAW Workflow" output channel for operation logs

**Developer Tools**: Open VS Code Developer Tools (Help → Toggle Developer Tools)

**Extension Host**: Use F5 in extension development workspace to launch debugger

**Breakpoints**: Set breakpoints in TypeScript source (source maps enabled)

## References

- **PAW Specification**: [`paw-specification.md`](../paw-specification.md)
- **GitHub Issue**: [#35](https://github.com/lossyrob/phased-agent-workflow/issues/35)
- **Implementation Plan**: [`.paw/work/vscode-extension-init/ImplementationPlan.md`](../.paw/work/vscode-extension-init/ImplementationPlan.md)
- **VS Code Extension API**: https://code.visualstudio.com/api
- **VS Code Extension Samples**: https://github.com/microsoft/vscode-extension-samples
