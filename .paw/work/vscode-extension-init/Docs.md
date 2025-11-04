# VS Code Extension Init - PAW Workflow Initializer

## Overview

The PAW Workflow VS Code Extension provides a single command—**"PAW: New PAW Workflow"**—that automates the creation of complete PAW workflow directory structures. This extension eliminates manual setup time and ensures consistency across all PAW workflows by leveraging an agent-driven architecture where the extension orchestrates user input collection and delegates complex workflow logic to GitHub Copilot's agent mode.

### Problem Solved

Before this extension, developers had to manually:
- Create `.paw/work/<feature-slug>/` directory structures
- Generate all 9 prompt template files with correct frontmatter
- Write `WorkflowContext.md` with proper parameter formatting
- Normalize branch names into valid feature slugs
- Handle slug conflicts and branch creation
- Remember the exact format and structure required by PAW

This manual process was error-prone, time-consuming, and inconsistent across team members.

### Solution

The extension automates the entire initialization workflow in under 60 seconds:
1. User invokes "PAW: New PAW Workflow" from Command Palette
2. Extension collects target branch and optional issue URL
3. Extension constructs a comprehensive prompt with PAW specification rules
4. GitHub Copilot agent executes the workflow (normalization, validation, file creation, git operations)
5. Complete work item structure is ready with all files in place and branch checked out

## Architecture and Design

### High-Level Architecture

The extension follows a **hybrid agent + tools pattern** with clear separation of responsibilities:

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                        │
│                      (Orchestrator)                         │
│  - Command registration                                     │
│  - User input collection                                    │
│  - Basic validation                                         │
│  - Prompt construction                                      │
│  - Agent invocation                                         │
│  - Logging to output channel                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Invokes with comprehensive prompt
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              GitHub Copilot Agent Mode                      │
│                  (Workflow Logic)                           │
│  - Feature slug normalization & validation                  │
│  - Conflict detection & resolution                          │
│  - Work title generation                                    │
│  - WorkflowContext.md creation                              │
│  - Git branch operations                                    │
│  - Tool invocation for file generation                      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Calls tool for procedural operations
                       ▼
┌─────────────────────────────────────────────────────────────┐
│          Language Model Tool (paw_create_prompt_templates)  │
│                 (Procedural Operations)                     │
│  - Create all 9 prompt template files                       │
│  - Generate correct frontmatter                             │
│  - Reference feature slug in template bodies                │
└─────────────────────────────────────────────────────────────┘
```

### Design Decisions

#### 1. Agent-Driven vs Extension-Driven Logic

**Decision**: Delegate complex workflow logic to agent mode rather than implementing in extension code.

**Rationale**:
- **Flexibility**: Agent can handle edge cases and evolving requirements without extension updates
- **Maintainability**: Minimal extension code reduces testing surface area
- **Context awareness**: Agent has full codebase context for intelligent decision-making
- **Natural language handling**: Agent can interpret user intentions and provide helpful feedback

**Trade-offs**: Requires GitHub Copilot extension with agent mode; dependent on agent API stability.

#### 2. Language Model Tools for File Generation

**Decision**: Implement prompt template file generation as a language model tool rather than having agent create files directly.

**Rationale**:
- **Reliability**: Procedural code ensures consistent file generation
- **Reusability**: Tool can be called from other agents/contexts
- **Validation**: Tool validates parameters and provides clear error messages
- **Testability**: Tool implementation can be unit tested independently

#### 3. File-Based Prompt Templating

**Decision**: Store agent prompts as markdown template files with simple variable substitution rather than string concatenation in TypeScript.

**Rationale**:
- **Editability**: Prompts can be modified without changing code
- **Readability**: Full context visible in one file with proper formatting
- **Version control**: Prompt changes tracked separately from code changes
- **No dependencies**: Simple substitution using built-in Node.js string operations

#### 4. Custom Instructions Support

**Decision**: Allow optional project-specific instructions via `.paw/instructions/init-instructions.md`.

**Rationale**:
- **Flexibility**: Teams can enforce project-specific conventions
- **Non-invasive**: Opt-in feature that doesn't affect default behavior
- **Transparent**: Instructions injected into prompt, agent explains how it applies them
- **Reusable pattern**: Establishes template for other PAW agents to adopt

### Integration Points

#### VS Code APIs

- **Commands API**: `vscode.commands.registerCommand()` for command registration
- **Input API**: `vscode.window.showInputBox()` for parameter collection
- **Output Channel API**: `vscode.window.createOutputChannel()` for logging
- **Editor API**: Agent opens `WorkflowContext.md` after creation
- **Language Model API**: `vscode.lm.registerTool()` for tool registration

#### GitHub Copilot Integration

- **Agent Mode**: `vscode.commands.executeCommand('workbench.action.chat.open', { query, mode: 'agent' })`
- **Language Model Tools**: Agent calls `paw_create_prompt_templates` tool for file generation

#### Git Integration

Agent executes git commands via Node.js `child_process`:
- `git rev-parse --git-dir`: Validate repository existence
- `git status --porcelain`: Check for uncommitted changes
- `git checkout -b <branch>`: Create and checkout new branch
- `git rev-parse --verify <branch>`: Check if branch exists

## User Guide

### Prerequisites

- VS Code 1.85.0 or later
- GitHub Copilot extension installed and active
- Git repository (or willingness to initialize one)

### Installation

#### From Release (.vsix file)

1. Download the `.vsix` file from the release
2. Install via command line:
   ```bash
   code --install-extension paw-workflow-0.0.1.vsix
   ```
   Or via VS Code UI:
   - Open Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`)
   - Click `...` menu → "Install from VSIX..."
   - Select the `.vsix` file
3. Reload VS Code when prompted

#### From Source (Development)

See the [DEVELOPING.md](/DEVELOPING.md#vs-code-extension-development) section for development installation instructions.

### Basic Usage

1. **Open a git repository in VS Code**
   - The extension requires an initialized git repository
   - If not initialized, run `git init` first

2. **Invoke the command**
   - Open Command Palette: `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type "PAW: New PAW Workflow"
   - Press Enter

3. **Enter target branch name**
   - Example: `feature/auth-system`
   - The extension validates basic format (no spaces or special characters)
   - The agent normalizes this into a valid feature slug

4. **Optionally enter issue URL** (press Enter to skip)
   - GitHub format: `https://github.com/owner/repo/issues/123`
   - Azure DevOps format: `https://dev.azure.com/org/project/_workitems/edit/456`
   - If provided, agent attempts to fetch issue/work item title for Work Title
   - If skipped, Work Title is derived from branch name

5. **Monitor progress**
   - Chat panel opens with agent mode active
   - Watch agent create directory structure and files
   - Check "PAW Workflow" output channel for detailed logs

6. **Review WorkflowContext.md**
   - File opens automatically when initialization completes
   - Verify parameters are correct
   - Edit Additional Inputs if needed

### Advanced Usage

#### Custom Instructions

Customize initialization behavior for your project:

1. **Create custom instructions file:**
   ```bash
   mkdir -p .paw/instructions
   touch .paw/instructions/init-instructions.md
   ```

2. **Add project-specific rules:**
   ```markdown
   # Project ABC Custom Rules
   
   ## Naming Conventions
   All feature slugs must start with component prefix: `api-`, `ui-`, or `db-`
   
   ## Required Metadata
   Include in WorkflowContext.md Additional Inputs:
   - Component: [api|ui|db]
   - Priority: [P0|P1|P2|P3]
   
   ## Branch Naming
   Target branches must follow: feature/<component>-<slug>
   ```

3. **Run initialization as normal**
   - Extension loads custom instructions automatically
   - Agent follows both PAW rules and custom instructions
   - Custom instructions take precedence on conflicts

See `vscode-extension/examples/init-instructions.example.md` for more examples.

#### Multiple Work Items

The extension can initialize multiple work items in the same repository:

```bash
# Initialize first work item
# Creates .paw/work/feature-a/

# Initialize second work item
# Creates .paw/work/feature-b/

# Both coexist independently
```

#### Slug Conflicts

If `.paw/work/<slug>/` already exists:
1. Agent detects conflict
2. User prompted with options:
   - Choose different branch name
   - Accept auto-generated slug with numeric suffix (`-2`, `-3`, etc.)
   - Cancel initialization

### Configuration

**Extension Settings**: None in v0.0.1

**File Locations**:
- Work item directories: `.paw/work/<feature-slug>/`
- Custom instructions: `.paw/instructions/init-instructions.md`
- Output logs: VS Code Output panel → "PAW Workflow"

## Technical Reference

### Extension Command

**Command ID**: `paw.initializeWorkItem`

**Command Title**: "PAW: New PAW Workflow"

**Activation**: Lazy (extension only loads when command is invoked)

**Implementation**: `vscode-extension/src/commands/initializeWorkItem.ts`

### Language Model Tool

**Tool Name**: `paw_create_prompt_templates`

**Purpose**: Create all 9 PAW prompt template files with correct structure and frontmatter

**Parameters**:
```typescript
{
  feature_slug: string;    // Normalized feature slug (e.g., "auth-system")
  workspace_path: string;  // Absolute path to workspace root
}
```

**Return Value**:
```typescript
{
  success: boolean;
  files_created: string[];  // Absolute paths to created files
  errors: string[];         // Error messages if any failures
}
```

**Implementation**: `vscode-extension/src/tools/createPromptTemplates.ts`

**Registration**: Tool is registered during extension activation via `vscode.lm.registerTool()`

### Generated Files

The extension (via agent and tool) creates the following structure:

```
.paw/work/<feature-slug>/
├── WorkflowContext.md          # Workflow parameters
└── prompts/                    # Agent invocation templates
    ├── 01A-spec.prompt.md
    ├── 01B-spec-research.prompt.md
    ├── 02A-code-research.prompt.md
    ├── 02B-impl-plan.prompt.md
    ├── 03A-implement.prompt.md
    ├── 03B-review.prompt.md
    ├── 04-docs.prompt.md
    ├── 05-pr.prompt.md
    └── 0X-status.prompt.md
```

#### WorkflowContext.md Format

```markdown
# WorkflowContext

Work Title: <Generated Work Title>
Feature Slug: <normalized-feature-slug>
Target Branch: <user-provided-branch>
GitHub Issue: <issue-url-or-none>
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

**Field Descriptions**:
- **Work Title**: 2-4 word descriptive name for PR prefixes (e.g., "Auth System")
- **Feature Slug**: Normalized identifier for directories/artifacts (e.g., "auth-system")
- **Target Branch**: Git branch where implementation PRs merge
- **GitHub Issue**: Optional issue/work item URL linking to requirements
- **Remote**: Git remote name (default: "origin")
- **Artifact Paths**: Location hint for PAW artifacts (default: auto-derived from .paw/work/)
- **Additional Inputs**: Comma-separated extra parameters (default: none)

#### Prompt Template Format

Each prompt file follows this structure:

```markdown
---
mode: PAW-XX <Agent Name>
---

<Instruction> from .paw/work/<feature-slug>/WorkflowContext.md
```

**Example** (`01A-spec.prompt.md`):
```markdown
---
mode: PAW-01A Spec Agent
---

Create spec from .paw/work/auth-system/WorkflowContext.md
```

### Feature Slug Normalization

The agent applies these rules (defined in prompt, not extension code):

1. **Extract meaningful portion**: Remove prefixes like `feature/`, `bugfix/`, `hotfix/`
2. **Convert to lowercase**: All characters lowercase
3. **Replace separators**: Spaces, underscores, slashes → hyphens
4. **Remove invalid characters**: Only keep `a-z`, `0-9`, hyphens
5. **Collapse consecutive hyphens**: Multiple hyphens → single hyphen
6. **Trim hyphens**: Remove leading/trailing hyphens
7. **Enforce length**: Maximum 100 characters

**Examples**:
- `feature/User-Auth_System!` → `user-auth-system`
- `bugfix/Fix API/V2 (2024)` → `fix-api-v2-2024`
- `feature/my___complex---branch` → `my-complex-branch`

### Error Handling

The extension handles errors at multiple levels:

**Extension-Level Errors**:
- No workspace open → Show error message, abort
- Not a git repository → Show error with instructions to run `git init`
- User cancels input → Log cancellation, abort gracefully
- Custom instructions read failure → Log warning, continue without custom instructions

**Agent-Level Errors** (via prompt):
- Invalid feature slug format → Prompt user for correction
- Slug conflict detected → Present resolution options
- Branch already exists → Ask user to checkout existing or choose new name
- Uncommitted changes → Warn and require confirmation
- Git command failures → Display error with recovery guidance

**Tool-Level Errors**:
- Directory creation failure → Return error in result object
- File write failure → Include file-specific error message
- All errors returned to agent for handling (no exceptions thrown)

## Edge Cases and Limitations

### Known Limitations

1. **GitHub Copilot Required**: Extension requires active GitHub Copilot subscription with agent mode support
2. **Git Repository Required**: Cannot initialize workflows in non-git workspaces
3. **Single Workspace**: Multi-root workspaces use first workspace folder only
4. **Network Dependency**: Optional issue title fetching requires network access (graceful fallback)
5. **Agent API Dependency**: Extension behavior depends on agent mode API stability and agent quality

### Edge Cases Handled

- **Empty branch name**: Input validation rejects empty strings
- **Invalid branch characters**: Input validation rejects special characters
- **Malformed issue URL**: Input validation checks format before agent invocation
- **Existing directory**: Agent detects conflict and prompts for resolution
- **Existing branch**: Agent checks and prompts user for action
- **Uncommitted changes**: Agent warns before branch operations
- **Custom instructions file empty**: Gracefully ignored, no error
- **Custom instructions file unreadable**: Warning logged, initialization continues
- **Tool invocation failure**: Agent receives error message and can inform user

### Edge Cases NOT Handled

- **Agent mode unavailable**: Extension fails if agent mode command doesn't exist (no graceful degradation)
- **Multiple concurrent initializations**: Undefined behavior if user runs command twice simultaneously
- **Workspace folder moved during initialization**: May result in incomplete initialization
- **Git remote "origin" doesn't exist**: Agent may fail on remote-related operations (workaround: create remote first)

## Testing Guide

### How to Test This Work

#### Scenario 1: Basic Initialization (Happy Path)

1. Open a git repository in VS Code
2. Run "PAW: New PAW Workflow"
3. Enter branch: `feature/test-basic`
4. Skip issue URL (press Enter)
5. **Verify**:
   - `.paw/work/test-basic/` directory created
   - `WorkflowContext.md` exists with correct parameters
   - All 9 prompt files exist in `prompts/` subdirectory
   - Branch `feature/test-basic` created and checked out
   - WorkflowContext.md opened in editor
   - "PAW Workflow" output channel shows timestamped logs

#### Scenario 2: With Issue URL

1. Run command
2. Enter branch: `feature/github-integration`
3. Enter issue URL: `https://github.com/owner/repo/issues/123`
4. **Verify**:
   - Work Title in WorkflowContext.md derived from issue title (or branch name if fetch fails)
   - GitHub Issue field contains the URL
   - All other files created as expected

#### Scenario 3: Custom Instructions

1. Create `.paw/instructions/init-instructions.md`:
   ```markdown
   # Test Rules
   All slugs must start with "test-"
   ```
2. Run command with branch: `feature/example`
3. **Verify**:
   - Output channel logs "Custom instructions found"
   - Agent applies custom rule (slug becomes `test-example`)

#### Scenario 4: Slug Conflict

1. Manually create `.paw/work/conflict-test/`
2. Run command with branch: `feature/conflict-test`
3. **Verify**:
   - Agent detects conflict
   - User prompted for alternative slug or cancel
   - Resolution works correctly

#### Scenario 5: Not a Git Repository

1. Open a non-git folder in VS Code
2. Run command
3. **Verify**:
   - Error message: "PAW requires a Git repository"
   - Instructions to run `git init` shown
   - Command aborts gracefully

#### Scenario 6: User Cancellation

1. Run command
2. Press Escape at branch name input
3. **Verify**:
   - Command aborts
   - No error messages shown
   - Output channel logs cancellation

#### Scenario 7: Invalid Input

1. Run command
2. Enter branch with spaces: `feature/my feature`
3. **Verify**:
   - Validation error shown immediately
   - User can correct and continue

### Automated Tests

The extension includes unit and integration tests:

```bash
cd vscode-extension
npm test
```

**Test Coverage**:
- Extension activation
- Command registration
- Input validation (branch names, issue URLs)
- Custom instructions loader (missing file, empty file, valid content)
- Prompt template substitution

See `vscode-extension/src/test/suite/` for test implementations.

## Migration and Compatibility

### Version Compatibility

- **VS Code**: Requires 1.85.0 or later (for Language Model API)
- **GitHub Copilot**: Requires version with agent mode support
- **Node.js**: 16.x or later for development

### Breaking Changes

None - this is the initial release (v0.0.1).

### Future Migration Notes

If upgrading from v0.0.1 to future versions:
- Existing `.paw/work/` structures remain compatible
- Extension settings may be introduced in future versions
- Custom instructions format is stable (markdown with optional frontmatter)

## References

- **GitHub Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/35
- **Implementation Plan**: `.paw/work/vscode-extension-init/ImplementationPlan.md`
- **Specification**: `.paw/work/vscode-extension-init/Spec.md`
- **PAW Specification**: `paw-specification.md`
- **VS Code Extension API**: https://code.visualstudio.com/api
- **GitHub Copilot Documentation**: https://docs.github.com/en/copilot

### Merged Phase PRs

1. **Phase 1 - Extension Scaffold**: PR #44
   - Initial TypeScript setup and extension structure
   - Updated via PR #49 for issue URL terminology

2. **Phase 2 - Command Registration**: PR #45
   - User input collection and validation
   - Git validation and tool registration
   - Updated via PR #50 for issue URL support

3. **Phase 3 - Agent Prompt Construction**: PR #46
   - File-based prompt templating
   - PAW specification integration
   - Updated via PR #51 for issue URL validation

4. **Phase 4 - Testing and Packaging**: PR #47
   - Automated test suite
   - Packaging configuration
   - Updated via PR #52 for documentation

5. **Phase 5 - Custom Instructions**: PR #48
   - Custom instructions loader
   - Prompt template injection
   - Example instructions file
