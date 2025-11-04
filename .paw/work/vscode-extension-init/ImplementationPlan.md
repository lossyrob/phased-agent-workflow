# VS Code Extension Init Implementation Plan

## Overview

We're implementing a VS Code extension that provides a single command - "PAW: Initialize Work Item" - to streamline the creation of PAW work item directory structures. The extension uses an **agent-driven architecture** where it collects user inputs and delegates complex work (file creation, git operations, slug normalization) to GitHub Copilot agent mode via carefully crafted prompts.

## Current State Analysis

**Repository State:**
- This is a **greenfield implementation** - no TypeScript/extension code exists yet
- Root `package.json` exists but contains only build scripts for documentation (`lint:chatmode`)
- `.paw/work/` directory exists with example work items demonstrating the target structure
- `.github/chatmodes/` contains PAW agent definitions

**Target PAW Directory Structure:**
```
.paw/work/<feature-slug>/
├── WorkflowContext.md          # Required: Centralized parameters
└── prompts/                    # Required: Prompt templates
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

**Agent-Driven Architecture Pattern:**
Per GitHub Issue #35 comment, the extension should:
1. Collect user inputs (target branch, GitHub issue URL)
2. Construct a comprehensive prompt with PAW specification rules
3. Invoke agent mode: `vscode.commands.executeCommand("workbench.action.chat.open", { query: prompt, mode: "agent" })`
4. Let the agent handle file creation, git operations, slug normalization, and validation

**Key Discoveries:**
- VS Code Extension API uses TypeScript as primary development language
- Extensions activate via `activate()` function when commands are invoked
- Commands registered with `vscode.commands.registerCommand()` and declared in `package.json`
- User input collected via `vscode.window.showInputBox()` and `vscode.window.showQuickPick()`
- Output logging via `vscode.window.createOutputChannel()` for transparency
- Extensions packaged with `vsce` tool and published to VS Code Marketplace

## Desired End State

A working VS Code extension that:
1. Appears in Command Palette as "PAW: Initialize Work Item"
2. Prompts user for target branch name and optional GitHub issue URL
3. Logs all operations to "PAW Workflow" output channel
4. Invokes GitHub Copilot agent mode with comprehensive prompt
5. Agent creates complete `.paw/work/<slug>/` structure with WorkflowContext.md
6. Agent calls language model tool `paw_create_prompt_templates` to generate 9 prompt templates
7. Agent creates/checks out git branch and opens WorkflowContext.md
8. Can be packaged and installed as a `.vsix` file

**Verification:**
- Extension loads without errors in VS Code
- Command appears in Command Palette
- Language model tool `paw_create_prompt_templates` is registered and callable
- Complete work item structure created in under 60 seconds
- All 9 prompt files present with valid frontmatter
- Git branch created and checked out
- WorkflowContext.md contains all required parameters
- Output channel shows timestamped logs for each operation

## What We're NOT Doing

- Language model tool `paw_get_workflow_context` for reading workflow context (deferred to future subtask per Issue #35 comment)
- Chatmode management/installation features
- Chatmode upgrade functionality
- UI components (sidebar, tree view, status bar)
- Smart agent launcher commands
- Publishing to VS Code Marketplace (manual packaging only for now)
- Complex error recovery strategies beyond basic validation
- Multi-workspace support (single workspace only)
- Custom git remote configuration UI (defaults to "origin")
- Direct file creation via VS Code FS API (delegated to agent and tools)

## Implementation Approach

**Hybrid Architecture: Agent + Tools Pattern:**
The extension establishes a clean separation of responsibilities:
- **Extension (Orchestrator)**: Collects inputs, constructs prompts, invokes agent mode
- **Agent (Workflow Logic)**: Makes decisions about slugs, branches, conflict resolution, WorkflowContext.md generation, git operations
- **Language Model Tools (Procedural Operations)**: Provide straightforward, repeatable PAW operations like generating prompt template files

This pattern keeps extension code minimal while leveraging agent capabilities for complex decision-making AND providing agents with reliable tools for procedural tasks.

**Extension Responsibilities (Minimal Code):**
- Register command in package.json and activate function
- Collect user inputs via VS Code input APIs
- Validate basic input format (non-empty, basic git branch pattern)
- Check git repository existence before invoking agent
- Construct comprehensive prompt with PAW specification rules
- Invoke agent mode with `workbench.action.chat.open`
- Log operations to output channel
- Implement and register language model tool `paw_create_prompt_templates`

**Agent Responsibilities (via Prompt):**
- Normalize branch name to feature slug per PAW rules
- Validate slug uniqueness and format
- Create `.paw/work/<slug>/` and `prompts/` directories
- Generate WorkflowContext.md with parameters
- **Call language model tool `paw_create_prompt_templates`** to generate all 9 prompt template files
- Create and checkout git branch
- Handle edge cases (existing directories, branch conflicts)
- Open WorkflowContext.md in editor

**Tool Responsibilities (`paw_create_prompt_templates`):**
- Accept feature slug and workspace path as parameters
- Create all 9 prompt template files with correct frontmatter
- Reference feature slug in each template body
- Return success status and list of created files

## Phase 0: Development Environment Setup

### Overview
Configure the VS Code development environment to support debugging the extension with F5. This enables a smooth development workflow where developers can set breakpoints, inspect variables, and step through code during extension development.

### Changes Required:

#### 1. VS Code Launch Configuration
**File**: `.vscode/launch.json` (repository root)
**Changes**: Create launch configuration for Extension Development Host debugging

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}/vscode-extension"
      ],
      "outFiles": [
        "${workspaceFolder}/vscode-extension/out/**/*.js"
      ],
      "preLaunchTask": "npm: compile - vscode-extension",
      "sourceMaps": true
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}/vscode-extension",
        "--extensionTestsPath=${workspaceFolder}/vscode-extension/out/test/suite/index"
      ],
      "outFiles": [
        "${workspaceFolder}/vscode-extension/out/test/**/*.js"
      ],
      "preLaunchTask": "npm: compile - vscode-extension",
      "sourceMaps": true
    }
  ]
}
```

#### 2. VS Code Build Tasks
**File**: `.vscode/tasks.json` (repository root)
**Changes**: Create build tasks for compiling the extension

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "compile",
      "path": "vscode-extension/",
      "group": "build",
      "problemMatcher": "$tsc",
      "label": "npm: compile - vscode-extension",
      "detail": "tsc -p ./",
      "presentation": {
        "reveal": "silent"
      }
    },
    {
      "type": "npm",
      "script": "watch",
      "path": "vscode-extension/",
      "group": "build",
      "problemMatcher": "$tsc-watch",
      "label": "npm: watch - vscode-extension",
      "detail": "tsc -watch -p ./",
      "isBackground": true,
      "presentation": {
        "reveal": "silent"
      }
    }
  ]
}
```

#### 3. Package Exclusions
**File**: `vscode-extension/.vscodeignore`
**Changes**: No changes needed - `.vscode` directory at repository root is not part of the extension package

The `.vscode/` directory is located at the repository root (not in `vscode-extension/`), so it won't be included in the packaged extension by default.

### Success Criteria:

#### Automated Verification:
- [x] `.vscode/launch.json` file exists at repository root
- [x] `.vscode/tasks.json` file exists at repository root
- [x] Launch configuration specifies correct `extensionDevelopmentPath` pointing to `vscode-extension/` subdirectory
- [x] Launch configuration references build task `npm: compile - vscode-extension`
- [x] Build task executes `npm run compile` in `vscode-extension/` directory
- [x] Source maps enabled for debugging TypeScript
- [x] `.vscode/` directory at root won't be packaged with extension

#### Manual Verification:
- [ ] Open repository root in VS Code
- [ ] Press F5 to launch Extension Development Host
- [ ] Extension Development Host window opens with extension loaded
- [ ] Set breakpoint in `src/extension.ts` activate function
- [ ] Breakpoint is hit when command is invoked
- [ ] Variables can be inspected in Debug view
- [ ] Step through code works correctly

### Phase 0 Implementation Complete

**Completed**: 2025-11-03

- Created `.vscode/launch.json` at repository root with two debug configurations: "Run Extension" for normal debugging and "Extension Tests" for debugging tests
- Created `.vscode/tasks.json` at repository root with build tasks for compiling and watching the extension
- Both launch configurations reference the `npm: compile - vscode-extension` task to auto-compile before debugging
- Both configurations point to `vscode-extension/` subdirectory as the extension development path
- Build task executes `npm run compile` in the `vscode-extension/` directory with TypeScript problem matcher
- Watch task available for continuous compilation during development
- Source maps enabled for seamless TypeScript debugging experience
- `.vscode/` at repository root is automatically detected by VS Code when workspace is opened at root level

All automated verification checks passed:
- ✅ `.vscode/launch.json` exists at repository root with correct paths to `vscode-extension/` subdirectory
- ✅ `.vscode/tasks.json` exists with compile and watch tasks
- ✅ Launch configurations reference the correct build task
- ✅ Source maps enabled (`sourceMaps: true`)
- ✅ `.vscode/` directory at root won't be packaged in extension `.vsix`

**Notes for Review:**
- Manual verification pending: F5 debugging workflow should be tested to ensure breakpoints work correctly
- The "Run Extension" configuration is the primary workflow for development
- The "Extension Tests" configuration allows debugging test failures

---

## Phase 1: Extension Scaffold and TypeScript Setup

### Overview
Set up the basic VS Code extension project structure with TypeScript, build configuration, and package metadata. This provides the foundation for all subsequent development.

### Changes Required:

#### 1. Extension Package Manifest
**File**: `package.json`
**Changes**: Create VS Code extension package.json (or update existing root package.json)

Since the root `package.json` contains repository-level scripts, we'll create the extension as a subdirectory to avoid conflicts.

**File**: `vscode-extension/package.json`
**Changes**: Create new extension package manifest

```json
{
  "name": "paw-workflow",
  "displayName": "PAW Workflow",
  "description": "Phased Agent Workflow tooling for VS Code - streamlines work item initialization",
  "version": "0.0.1",
  "publisher": "paw-workflow",
  "repository": {
    "type": "git",
    "url": "https://github.com/lossyrob/phased-agent-workflow"
  },
  "license": "MIT",
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": [
    "Other"
  ],
  "keywords": [
    "workflow",
    "ai",
    "agent",
    "productivity"
  ],
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "paw.initializeWorkItem",
        "title": "Initialize Work Item",
        "category": "PAW"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./",
    "pretest": "npm run compile",
    "test": "node ./out/test/runTest.js",
    "lint": "eslint src --ext ts",
    "package": "vsce package"
  },
  "devDependencies": {
    "@types/node": "^18.x",
    "@types/vscode": "^1.85.0",
    "@types/mocha": "^10.0.6",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "@vscode/test-electron": "^2.3.8",
    "@vscode/vsce": "^2.22.0",
    "eslint": "^8.56.0",
    "mocha": "^10.2.0",
    "typescript": "^5.3.3"
  }
}
```

#### 2. TypeScript Configuration
**File**: `vscode-extension/tsconfig.json`
**Changes**: Create TypeScript compiler configuration

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "exclude": ["node_modules", ".vscode-test", "out"]
}
```

#### 3. Extension Entry Point
**File**: `vscode-extension/src/extension.ts`
**Changes**: Create main extension entry point with activate/deactivate functions

```typescript
import * as vscode from 'vscode';

/**
 * Extension activation function called when extension is first needed
 */
export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging
  const outputChannel = vscode.window.createOutputChannel('PAW Workflow');
  context.subscriptions.push(outputChannel);
  
  outputChannel.appendLine('[INFO] PAW Workflow extension activated');
  
  // Register commands (Phase 2)
  // Command registration will be added in next phase
  
  outputChannel.appendLine('[INFO] PAW Workflow extension ready');
}

/**
 * Extension deactivation function called when extension is deactivated
 */
export function deactivate() {
  // Cleanup handled automatically via context.subscriptions
}
```

#### 4. Package Exclusions
**File**: `vscode-extension/.vscodeignore`
**Changes**: Create file to exclude source files from packaged extension

```
.vscode/**
.vscode-test/**
src/**
.gitignore
.eslintrc.json
**/*.map
**/*.ts
**/tsconfig.json
node_modules/**
!node_modules/@types/vscode/**
```

#### 5. ESLint Configuration
**File**: `vscode-extension/.eslintrc.json`
**Changes**: Create linting configuration for code quality

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 2020,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/naming-convention": [
      "warn",
      {
        "selector": "import",
        "format": ["camelCase", "PascalCase"]
      }
    ],
    "@typescript-eslint/semi": "warn",
    "curly": "warn",
    "eqeqeq": "warn",
    "no-throw-literal": "warn",
    "semi": "off"
  }
}
```

#### 6. Git Ignore (Extension-Specific)
**File**: `vscode-extension/.gitignore`
**Changes**: Create gitignore for build artifacts

```
out/
node_modules/
.vscode-test/
*.vsix
```

#### 7. Extension README
**File**: `vscode-extension/README.md`
**Changes**: Create user-facing documentation for Marketplace

```markdown
# PAW Workflow Extension

Streamline your Phased Agent Workflow (PAW) development with automated work item initialization.

## Features

- **Initialize Work Item**: One command to create complete PAW directory structure
  - Creates `.paw/work/<feature-slug>/` with WorkflowContext.md
  - Generates all 9 prompt template files
  - Creates and checks out git branch
  - Opens WorkflowContext.md for immediate editing

## Usage

1. Open a git repository in VS Code
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "PAW: Initialize Work Item"
4. Enter target branch name (e.g., `feature/my-feature`)
5. Optionally enter GitHub issue URL
6. Watch as your work item structure is created automatically

## Requirements

- Git repository
- GitHub Copilot extension installed and active

## Extension Settings

This extension contributes no settings in v0.0.1.

## Known Issues

None reported yet. Please file issues at: https://github.com/lossyrob/phased-agent-workflow/issues

## Release Notes

### 0.0.1

Initial release:
- PAW: Initialize Work Item command
- Automated directory structure creation
- Git branch creation and checkout
```

#### 8. License File
**File**: `vscode-extension/LICENSE`
**Changes**: Create MIT license file (copy from repository root)

Copy LICENSE from repository root to `vscode-extension/LICENSE`.

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `cd vscode-extension && npm run compile`
- [x] No TypeScript errors: `tsc --noEmit`
- [x] Linting passes: `npm run lint`
- [ ] Extension activates without errors when installed locally
- [ ] Output channel "PAW Workflow" appears in VS Code Output panel

#### Manual Verification:
- [ ] Extension appears in Extensions view when installed from .vsix
- [ ] Extension activates (check output channel for activation message)
- [ ] No console errors in Developer Tools
- [ ] package.json metadata displays correctly in Extensions view

### Phase 1 Implementation Complete

**Completed**: 2025-10-28

All automated verification steps passed successfully:
- ✅ TypeScript compilation completed without errors
- ✅ ESLint passed (minor version warning about TypeScript 5.9.3 vs 5.4.0 supported, non-blocking)
- ✅ No TypeScript type errors found
- ✅ All required files created in `vscode-extension/` directory

**Created Files:**
- `package.json` - Extension manifest with command contribution and build scripts
- `tsconfig.json` - TypeScript compiler configuration
- `src/extension.ts` - Main entry point with activate/deactivate functions
- `.vscodeignore` - Package exclusions
- `.eslintrc.json` - ESLint configuration
- `.gitignore` - Git exclusions for build artifacts
- `README.md` - User-facing documentation
- `LICENSE` - MIT license (copied from repository root)

**Dependencies Installed:**
- All npm dependencies installed successfully (387 packages)
- Compiled output generated in `out/extension.js` with source maps

**Notes for Review:**
- Manual verification steps (local installation, activation testing) deferred to Phase 4 testing
- Extension structure follows VS Code extension best practices
- Output channel logging implemented for transparency
- Ready for Phase 2: Command registration and user input collection

**Addressed Review Comments:**

Review feedback addressed on 2025-10-28 for PR #44:

1. **Removed ARCHITECTURE.md** (https://github.com/lossyrob/phased-agent-workflow/pull/44#discussion_r2469734565)
   - Deleted `vscode-extension/ARCHITECTURE.md` file completely
   - Documentation will be handled by the Documenter agent (PAW-04) in a later phase
   - This maintains proper separation of concerns: Implementation Agent focuses on functional code, Documenter Agent creates comprehensive documentation

2. **Added README Update Task to Phase 4** (https://github.com/lossyrob/phased-agent-workflow/pull/44#discussion_r2469775380)
   - Added new item "#### 7. Extension README Update" to Phase 4 Changes Required section
   - Added verification checklist item for README update in Phase 4 Manual Verification
   - This ensures the README content will be revised after implementation to accurately reflect the final state of the extension

All automated verification checks still pass after these changes:
- ✅ TypeScript compilation: `npm run compile`
- ✅ Linting: `npm run lint` (same TypeScript version warning, non-blocking)
- ✅ Type checking: `tsc --noEmit`

---

## Phase 2: Command Registration and User Input Collection

### Overview
Implement the command registration logic and user input collection via VS Code APIs. This phase focuses on the extension orchestration layer that gathers parameters before delegating to the agent.

### Changes Required:

#### 1. Command Handler Module
**File**: `vscode-extension/src/commands/initializeWorkItem.ts`
**Changes**: Create command handler for work item initialization

```typescript
import * as vscode from 'vscode';
import { collectUserInputs } from '../ui/userInput';
import { validateGitRepository } from '../git/validation';
import { constructAgentPrompt } from '../prompts/agentPrompt';

/**
 * Main command handler for PAW: Initialize Work Item
 */
export async function initializeWorkItemCommand(
  outputChannel: vscode.OutputChannel
): Promise<void> {
  outputChannel.appendLine('[INFO] Starting PAW work item initialization...');
  
  try {
    // Get workspace root
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(
        'No workspace folder open. Please open a workspace to initialize a PAW work item.'
      );
      outputChannel.appendLine('[ERROR] No workspace folder open');
      return;
    }
    
    outputChannel.appendLine(`[INFO] Workspace: ${workspaceFolder.uri.fsPath}`);
    
    // Validate git repository
    outputChannel.appendLine('[INFO] Validating git repository...');
    const isGitRepo = await validateGitRepository(workspaceFolder.uri.fsPath);
    if (!isGitRepo) {
      const action = await vscode.window.showErrorMessage(
        'PAW requires a Git repository. Would you like to initialize Git?',
        'Initialize Git',
        'Cancel'
      );
      
      if (action === 'Initialize Git') {
        outputChannel.appendLine('[INFO] Initializing git repository...');
        // Git initialization will be handled by agent in the prompt
        // For now, just inform user
        vscode.window.showInformationMessage(
          'Please initialize Git manually with: git init'
        );
      }
      outputChannel.appendLine('[ERROR] Not a git repository');
      return;
    }
    
    outputChannel.appendLine('[INFO] Git repository validated');
    
    // Collect user inputs
    outputChannel.appendLine('[INFO] Collecting user inputs...');
    const inputs = await collectUserInputs(outputChannel);
    
    if (!inputs) {
      outputChannel.appendLine('[INFO] User cancelled initialization');
      return;
    }
    
    outputChannel.appendLine(`[INFO] Target branch: ${inputs.targetBranch}`);
    if (inputs.githubIssueUrl) {
      outputChannel.appendLine(`[INFO] GitHub issue: ${inputs.githubIssueUrl}`);
    }
    
    // Construct agent prompt
    outputChannel.appendLine('[INFO] Constructing agent prompt...');
    const prompt = constructAgentPrompt(
      inputs.targetBranch,
      inputs.githubIssueUrl,
      workspaceFolder.uri.fsPath
    );
    
    // Invoke agent mode
    outputChannel.appendLine('[INFO] Invoking GitHub Copilot agent mode...');
    outputChannel.show(true); // Show output channel without stealing focus
    
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: prompt,
      mode: 'agent'
    });
    
    outputChannel.appendLine('[INFO] Agent invoked - check chat panel for progress');
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    outputChannel.appendLine(`[ERROR] Initialization failed: ${errorMessage}`);
    vscode.window.showErrorMessage(
      `PAW initialization failed: ${errorMessage}`
    );
  }
}
```

#### 2. User Input Collection Module
**File**: `vscode-extension/src/ui/userInput.ts`
**Changes**: Create module for collecting user inputs via VS Code APIs

```typescript
import * as vscode from 'vscode';

/**
 * User inputs collected for work item initialization
 */
export interface WorkItemInputs {
  targetBranch: string;
  githubIssueUrl?: string;
}

/**
 * Collect user inputs for work item initialization
 */
export async function collectUserInputs(
  outputChannel: vscode.OutputChannel
): Promise<WorkItemInputs | undefined> {
  
  // Collect target branch name
  const targetBranch = await vscode.window.showInputBox({
    prompt: 'Enter target branch name (e.g., feature/my-feature)',
    placeHolder: 'feature/my-feature',
    validateInput: (value: string) => {
      if (!value || value.trim().length === 0) {
        return 'Branch name is required';
      }
      // Basic validation - agent will do detailed normalization
      if (!/^[a-zA-Z0-9/_-]+$/.test(value)) {
        return 'Branch name contains invalid characters';
      }
      return null;
    }
  });
  
  if (!targetBranch) {
    outputChannel.appendLine('[INFO] Branch name input cancelled');
    return undefined;
  }
  
  // Collect optional GitHub issue URL
  const githubIssueUrl = await vscode.window.showInputBox({
    prompt: 'Enter GitHub issue URL (optional, press Enter to skip)',
    placeHolder: 'https://github.com/owner/repo/issues/123',
    validateInput: (value: string) => {
      if (!value || value.trim().length === 0) {
        return null; // Optional field
      }
      // Basic URL validation - agent will do detailed parsing
      if (!value.match(/^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/)) {
        return 'Invalid GitHub issue URL format. Expected: https://github.com/owner/repo/issues/123';
      }
      return null;
    }
  });
  
  if (githubIssueUrl === undefined) {
    outputChannel.appendLine('[INFO] GitHub issue URL input cancelled');
    return undefined;
  }
  
  return {
    targetBranch: targetBranch.trim(),
    githubIssueUrl: githubIssueUrl?.trim() || undefined
  };
}
```

#### 3. Git Validation Module
**File**: `vscode-extension/src/git/validation.ts`
**Changes**: Create module for validating git repository

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check if directory is a git repository
 */
export async function validateGitRepository(workspacePath: string): Promise<boolean> {
  try {
    await execAsync('git rev-parse --git-dir', { cwd: workspacePath });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check for uncommitted changes
 */
export async function hasUncommittedChanges(workspacePath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd: workspacePath });
    return stdout.trim().length > 0;
  } catch (error) {
    throw new Error(`Failed to check git status: ${error}`);
  }
}
```

#### 4. Update Extension Entry Point
**File**: `vscode-extension/src/extension.ts`
**Changes**: Register command handler in activate function

```typescript
import * as vscode from 'vscode';
import { initializeWorkItemCommand } from './commands/initializeWorkItem';

/**
 * Extension activation function called when extension is first needed
 */
export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging
  const outputChannel = vscode.window.createOutputChannel('PAW Workflow');
  context.subscriptions.push(outputChannel);
  
  outputChannel.appendLine('[INFO] PAW Workflow extension activated');
  
  // Register initialize work item command
  const initCommand = vscode.commands.registerCommand(
    'paw.initializeWorkItem',
    () => initializeWorkItemCommand(outputChannel)
  );
  context.subscriptions.push(initCommand);
  
  outputChannel.appendLine('[INFO] Registered command: paw.initializeWorkItem');
  outputChannel.appendLine('[INFO] PAW Workflow extension ready');
}

/**
 * Extension deactivation function called when extension is deactivated
 */
export function deactivate() {
  // Cleanup handled automatically via context.subscriptions
}
```

#### 5. Language Model Tool Implementation
**File**: `vscode-extension/src/tools/createPromptTemplates.ts`
**Changes**: Create language model tool for generating PAW prompt template files

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Tool parameters for creating prompt templates
 */
interface CreatePromptTemplatesParams {
  feature_slug: string;
  workspace_path: string;
}

/**
 * Tool result
 */
interface CreatePromptTemplatesResult {
  success: boolean;
  files_created: string[];
  errors: string[];
}

/**
 * Template definitions for all 9 PAW prompt files
 */
const PROMPT_TEMPLATES = [
  {
    filename: '01A-spec.prompt.md',
    mode: 'PAW-01A Spec Agent',
    instruction: 'Create spec from'
  },
  {
    filename: '01B-spec-research.prompt.md',
    mode: 'PAW-01B Spec Research Agent',
    instruction: 'Answer research questions from'
  },
  {
    filename: '02A-code-research.prompt.md',
    mode: 'PAW-02A Code Researcher',
    instruction: 'Run code research from'
  },
  {
    filename: '02B-impl-plan.prompt.md',
    mode: 'PAW-02B Impl Planner',
    instruction: 'Create implementation plan from'
  },
  {
    filename: '03A-implement.prompt.md',
    mode: 'PAW-03A Implementer',
    instruction: 'Implement phase from'
  },
  {
    filename: '03B-review.prompt.md',
    mode: 'PAW-03B Impl Reviewer',
    instruction: 'Review implementation from'
  },
  {
    filename: '04-docs.prompt.md',
    mode: 'PAW-04 Documenter Agent',
    instruction: 'Generate documentation from'
  },
  {
    filename: '05-pr.prompt.md',
    mode: 'PAW-05 PR Agent',
    instruction: 'Create final PR from'
  },
  {
    filename: '0X-status.prompt.md',
    mode: 'PAW-0X Status Agent',
    instruction: 'Update status from'
  }
];

/**
 * Generate content for a single prompt template file
 */
function generatePromptTemplate(
  mode: string,
  instruction: string,
  featureSlug: string
): string {
  return `---
mode: ${mode}
---

${instruction} .paw/work/${featureSlug}/WorkflowContext.md
`;
}

/**
 * Language model tool: Create all 9 PAW prompt template files
 */
export async function createPromptTemplates(
  params: CreatePromptTemplatesParams
): Promise<CreatePromptTemplatesResult> {
  const { feature_slug, workspace_path } = params;
  const filesCreated: string[] = [];
  const errors: string[] = [];

  try {
    // Construct prompts directory path
    const promptsDir = path.join(
      workspace_path,
      '.paw',
      'work',
      feature_slug,
      'prompts'
    );

    // Create prompts directory if it doesn't exist
    if (!fs.existsSync(promptsDir)) {
      fs.mkdirSync(promptsDir, { recursive: true });
    }

    // Generate each template file
    for (const template of PROMPT_TEMPLATES) {
      const filePath = path.join(promptsDir, template.filename);
      const content = generatePromptTemplate(
        template.mode,
        template.instruction,
        feature_slug
      );

      try {
        fs.writeFileSync(filePath, content, 'utf-8');
        filesCreated.push(filePath);
      } catch (fileError) {
        const errorMsg = `Failed to create ${template.filename}: ${fileError}`;
        errors.push(errorMsg);
      }
    }

    return {
      success: errors.length === 0,
      files_created: filesCreated,
      errors
    };
  } catch (error) {
    return {
      success: false,
      files_created: filesCreated,
      errors: [`Failed to create prompt templates: ${error}`]
    };
  }
}

/**
 * Register the language model tool with VS Code
 */
export function registerPromptTemplatesTool(
  context: vscode.ExtensionContext
): void {
  // Register tool using VS Code Language Model API
  // Note: API details depend on VS Code version and may evolve
  const tool = vscode.lm.registerTool('paw_create_prompt_templates', {
    description: 'Create all 9 PAW prompt template files for a work item',
    parametersSchema: {
      type: 'object',
      properties: {
        feature_slug: {
          type: 'string',
          description: 'The normalized feature slug (e.g., "auth-system")'
        },
        workspace_path: {
          type: 'string',
          description: 'Absolute path to the workspace root'
        }
      },
      required: ['feature_slug', 'workspace_path']
    },
    invoke: async (parameters: CreatePromptTemplatesParams) => {
      const result = await createPromptTemplates(parameters);
      
      // Format result for language model
      if (result.success) {
        return {
          content: `Successfully created ${result.files_created.length} prompt template files:\n${result.files_created.map(f => `- ${f}`).join('\n')}`
        };
      } else {
        return {
          content: `Failed to create prompt templates. Errors:\n${result.errors.join('\n')}`
        };
      }
    }
  });

  context.subscriptions.push(tool);
}
```

#### 6. Register Tool in Extension Entry Point
**File**: `vscode-extension/src/extension.ts`
**Changes**: Import and register the language model tool

```typescript
import * as vscode from 'vscode';
import { initializeWorkItemCommand } from './commands/initializeWorkItem';
import { registerPromptTemplatesTool } from './tools/createPromptTemplates';

/**
 * Extension activation function called when extension is first needed
 */
export function activate(context: vscode.ExtensionContext) {
  // Create output channel for logging
  const outputChannel = vscode.window.createOutputChannel('PAW Workflow');
  context.subscriptions.push(outputChannel);
  
  outputChannel.appendLine('[INFO] PAW Workflow extension activated');
  
  // Register language model tools
  registerPromptTemplatesTool(context);
  outputChannel.appendLine('[INFO] Registered language model tool: paw_create_prompt_templates');
  
  // Register initialize work item command
  const initCommand = vscode.commands.registerCommand(
    'paw.initializeWorkItem',
    () => initializeWorkItemCommand(outputChannel)
  );
  context.subscriptions.push(initCommand);
  
  outputChannel.appendLine('[INFO] Registered command: paw.initializeWorkItem');
  outputChannel.appendLine('[INFO] PAW Workflow extension ready');
}

/**
 * Extension deactivation function called when extension is deactivated
 */
export function deactivate() {
  // Cleanup handled automatically via context.subscriptions
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds with new modules: `npm run compile`
- [x] No linting errors: `npm run lint`
- [x] Command `paw.initializeWorkItem` is registered (check via developer tools)
- [x] Language model tool `paw_create_prompt_templates` is registered

#### Manual Verification:
- [ ] Command "PAW: Initialize Work Item" appears in Command Palette
- [ ] Invoking command shows input box for branch name
- [ ] Branch name validation works (rejects empty, accepts valid patterns)
- [ ] Second input box appears for GitHub issue URL
- [ ] GitHub issue URL validation works (accepts valid URLs, allows skip)
- [ ] Error shown when invoked in non-git repository
- [ ] Output channel logs all operations with timestamps
- [ ] Cancelling at any input step aborts gracefully
- [ ] Tool registration logged to output channel on activation

### Phase 2 Implementation Complete

**Completed**: 2025-10-28

- Added command handler, user input, and git validation modules under `vscode-extension/src` with minimal validation and logging.
- Updated `src/extension.ts` to register the initialize command and the `paw_create_prompt_templates` language model tool; tool responses now use `LanguageModelToolResult` per API requirements.
- Declared the language model tool metadata in `vscode-extension/package.json` and kept activation events lazy.
- Introduced stub `constructAgentPrompt` implementation that will be replaced during Phase 3.
- Automated verification run locally:
  - ✅ `npm run compile`
  - ✅ `npm run lint` (TypeScript support warning persists, non-blocking)
- Manual verification scenarios remain pending for later phases.

**Notes for Review Agent:** When validating tool registration, confirm the `languageModelTools` manifest entry meets current VS Code schema expectations; adjust descriptions if the schema evolves.

**Addressed Review Comments (2025-10-28):**

PR #45 review feedback addressed in commits 06246ff and dad32f4:

1. **Git Init UX Issue** (https://github.com/lossyrob/phased-agent-workflow/pull/45#discussion_r2470453151)
   - Removed placeholder "Initialize Git" action prompt that didn't actually perform initialization
   - Changed to simple error message directing users to run `git init` manually
   - Improves UX by avoiding misleading prompts

2. **Chat Thread Behavior** (https://github.com/lossyrob/phased-agent-workflow/pull/45#discussion_r2470463405)
   - Added code comment documenting that `workbench.action.chat.open` creates a new thread when invoked programmatically
   - Clarifies expected behavior for future maintainers

3. **Tool Confirmation Flow** (https://github.com/lossyrob/phased-agent-workflow/pull/45#discussion_r2470839780)
   - Implemented `prepareInvocation` callback for `paw_create_prompt_templates` tool
   - Returns invocation message and confirmation details for user approval in agent mode
   - Lists all 9 files that will be created with their paths
   - Updated ESLint config to allow underscore-prefixed unused parameters (for required API token parameter)

All automated verification checks pass after addressing review comments:
- ✅ TypeScript compilation: `npm run compile`
- ✅ Linting: `npm run lint` (TypeScript version warning persists, non-blocking)

---

## Phase 3: Agent Prompt Construction

### Overview
Create the comprehensive prompt that instructs the GitHub Copilot agent on how to create the PAW work item structure according to PAW specification rules. This is the critical integration point where we delegate complex logic to the agent.

### Changes Required:

#### 1. Agent Prompt Builder
**File**: `vscode-extension/src/prompts/agentPrompt.ts`
**Changes**: Create module that constructs the agent prompt with PAW rules

```typescript
import * as fs from 'fs';
import * as path from 'path';

/**
 * Construct comprehensive prompt for GitHub Copilot agent to create PAW work item
 */
export function constructAgentPrompt(
  targetBranch: string,
  githubIssueUrl: string | undefined,
  workspacePath: string
): string {
  // Read PAW specification if available for context
  let pawSpec = '';
  try {
    const specPath = path.join(workspacePath, 'paw-specification.md');
    if (fs.existsSync(specPath)) {
      pawSpec = fs.readFileSync(specPath, 'utf-8');
    }
  } catch {
    // Spec not available - prompt will include inline rules
  }
  
  const prompt = `# PAW Work Item Initialization

You are tasked with creating a complete PAW (Phased Agent Workflow) work item directory structure.

## Parameters Provided

- **Target Branch**: ${targetBranch}
${githubIssueUrl ? `- **GitHub Issue URL**: ${githubIssueUrl}` : '- **GitHub Issue URL**: Not provided'}
- **Workspace Path**: ${workspacePath}

## Your Tasks

### 1. Generate Feature Slug

Normalize the target branch name into a valid feature slug following PAW rules:

**Normalization Steps:**
1. Extract meaningful portion (remove prefixes like 'feature/', 'bugfix/', 'hotfix/')
2. Convert to lowercase
3. Replace spaces and special characters with hyphens
4. Remove invalid characters (only allow: a-z, 0-9, hyphens)
5. Collapse consecutive hyphens to single hyphen
6. Trim leading/trailing hyphens
7. Enforce 100 character maximum

**Validation Requirements:**
- Length: 1-100 characters
- Format: Only lowercase letters, numbers, hyphens
- No leading/trailing hyphens
- No consecutive hyphens
- Not reserved names: '.', '..', 'node_modules', '.git', '.paw'

**Uniqueness Check:**
- Verify \`.paw/work/<slug>/\` does not already exist
- If conflict, append -2, -3, etc. until unique

### 2. Generate Work Title

${githubIssueUrl ? `**From GitHub Issue** (Preferred):
- Fetch issue title from: ${githubIssueUrl}
- Use issue title as Work Title (may shorten for PR prefix later)
- If fetch fails, fall back to branch-based generation

` : ''}**From Branch Name** (Fallback${!githubIssueUrl ? ' - Primary' : ''}):
- Extract meaningful portion from target branch
- Split on hyphens, underscores, slashes
- Capitalize first letter of each word
- Join with spaces
- Limit to 2-4 words for brevity

Example: "feature/user-auth-system" → "User Auth System"

### 3. Create Directory Structure

Create the following directory structure in the workspace:

\`\`\`
.paw/work/<feature-slug>/
├── WorkflowContext.md
└── prompts/
    ├── 01A-spec.prompt.md
    ├── 01B-spec-research.prompt.md
    ├── 02A-code-research.prompt.md
    ├── 02B-impl-plan.prompt.md
    ├── 03A-implement.prompt.md
    ├── 03B-review.prompt.md
    ├── 04-docs.prompt.md
    ├── 05-pr.prompt.md
    └── 0X-status.prompt.md
\`\`\`

### 4. Generate WorkflowContext.md

Create \`.paw/work/<feature-slug>/WorkflowContext.md\` with this exact format:

\`\`\`markdown
# WorkflowContext

Work Title: <generated_work_title>
Feature Slug: <generated_feature_slug>
Target Branch: ${targetBranch}
${githubIssueUrl ? `GitHub Issue: ${githubIssueUrl}` : 'GitHub Issue: none'}
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
\`\`\`

### 5. Call Language Model Tool to Generate Prompt Templates

After WorkflowContext.md is created, call the language model tool to generate all prompt template files:

**Tool Call:**
\`\`\`
paw_create_prompt_templates(
  feature_slug: "<generated_feature_slug>",
  workspace_path: "${workspacePath}"
)
\`\`\`

The tool will:
- Create \`.paw/work/<feature-slug>/prompts/\` directory if needed
- Generate all 9 prompt template files with correct frontmatter
- Each template will reference the feature slug in its body
- Return success status and list of created files

**Expected Files Created:**
- 01A-spec.prompt.md
- 01B-spec-research.prompt.md
- 02A-code-research.prompt.md
- 02B-impl-plan.prompt.md
- 03A-implement.prompt.md
- 03B-review.prompt.md
- 04-docs.prompt.md
- 05-pr.prompt.md
- 0X-status.prompt.md

### 6. Git Branch Operations

1. Check if branch \`${targetBranch}\` already exists locally:
   - Run: \`git rev-parse --verify ${targetBranch}\`
   - If exists: Ask user to choose existing or pick different name
   - If not exists: Proceed to create

2. Check for uncommitted changes:
   - Run: \`git status --porcelain\`
   - If changes exist: Warn user and ask for confirmation to continue

3. Create and checkout branch:
   - Run: \`git checkout -b ${targetBranch}\`
   - Handle errors gracefully (show clear messages)

### 7. Open WorkflowContext.md

After all files are created and branch is checked out:
- Open \`.paw/work/<feature-slug>/WorkflowContext.md\` in the editor
- Position cursor for user to review/edit

## Error Handling

- **Slug conflict**: Prompt user with options (auto-append number, choose different name, cancel)
- **Branch exists**: Ask user to checkout existing or choose different name
- **Uncommitted changes**: Warn and require confirmation before branch operations
- **Git errors**: Display clear error messages with recovery guidance
- **Network failures** (GitHub API): Fall back to branch-based Work Title generation
- **Tool errors**: If `paw_create_prompt_templates` fails, display error details and abort initialization

## Success Output

When complete, confirm:
✅ Created directory: \`.paw/work/<feature-slug>/\`
✅ Created WorkflowContext.md with all parameters
✅ Called tool paw_create_prompt_templates successfully
✅ Created 9 prompt template files in prompts/ subdirectory
✅ Created and checked out branch: ${targetBranch}
✅ Opened WorkflowContext.md in editor

## PAW Specification Reference

${pawSpec ? `The full PAW specification is available for reference:\n\n${pawSpec.substring(0, 10000)}...` : 'PAW specification not found in workspace - using inline rules above.'}

---

**Begin initialization now.** Show progress as you complete each step.
`;

  return prompt;
}
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `npm run compile`
- [x] No linting errors: `npm run lint`
- [x] Prompt construction function executes without errors
- [x] Generated prompt includes all required sections

#### Manual Verification:
- [ ] Prompt includes target branch and GitHub issue (if provided)
- [ ] Prompt contains complete PAW specification rules
- [ ] Prompt includes all 9 prompt template structures with correct frontmatter
- [ ] Prompt specifies WorkflowContext.md format exactly
- [ ] Prompt includes error handling guidance for common scenarios
- [ ] Prompt references PAW specification if available in workspace

---

### Phase 3 Implementation Complete

**Completed**: 2025-10-28

- Replaced the placeholder agent prompt builder with a comprehensive prompt generator that assembles instructions line-by-line, including slug normalization, directory creation, tool invocation, git workflow, and error handling guidance.
- Added logic to load and truncate `paw-specification.md` so the agent receives inline rules plus specification context when available.
- Verified the generated prompt content to ensure all required sections and success criteria are represented before delegating to agent mode.

Automated verification executed:
- ✅ `npm run compile`
- ✅ `npm run lint` (TypeScript 5.9.3 support warning persists but lint passes)

**Notes for Review Agent:** Manual checks for prompt rendering in VS Code remain outstanding. Confirm the prompt formatting inside the chat experience and ensure specification truncation messaging is clear.

### Addressed Review Comments (2025-10-28)

PR #46 review feedback addressed in response to comments from lossyrob:

1. **Remove PAW Specification Loading** (https://github.com/lossyrob/phased-agent-workflow/pull/46#discussion_r2471258725)
   - Removed `loadPawSpecificationSnippet()` function and `SPEC_SNIPPET_LIMIT` constant
   - Extension no longer attempts to load or bundle `paw-specification.md`
   - All required PAW specification rules (slug normalization, validation, WorkflowContext.md format) are now fully inlined in the prompt template
   - Added normalization examples table directly in template for clarity
   - Added WorkflowContext.md field definitions with descriptions
   - This change reflects the decision that the extension will NOT ship with the PAW specification; all necessary rules must be explicitly stated in prompts

2. **Implement File-Based Prompt Templating** (https://github.com/lossyrob/phased-agent-workflow/pull/46#discussion_r2471266243)
   - Created `vscode-extension/src/prompts/workItemInitPrompt.template.md` containing the full prompt as a template file
   - Implemented simple variable substitution using `{{VAR_NAME}}` placeholders (no external dependencies)
   - Replaced line-by-line string concatenation with template loading and substitution
   - Template variables: `TARGET_BRANCH`, `GITHUB_ISSUE_URL`, `GITHUB_ISSUE_FIELD`, `WORKSPACE_PATH`, `WORK_TITLE_STRATEGY`, `WORK_TITLE_FALLBACK_INDICATOR`
   - This makes prompts easy to edit directly in markdown without modifying TypeScript code
   - Lightweight implementation uses only Node.js built-in string operations
   - Reusable pattern for future prompt templates in the extension

All automated verification checks pass after addressing review comments:
- ✅ TypeScript compilation: `npm run compile`
- ✅ Linting: `npm run lint` (TypeScript version warning persists, non-blocking)

**Implementation Plan Updates Needed:** The spec and plan should be updated to reflect that the extension does NOT ship with `paw-specification.md`. All PAW rules required for work item initialization are explicitly documented in the prompt template file.

## Phase 4: Testing and Packaging

### Overview
Create basic tests for the extension functionality and set up packaging for local installation. This ensures the extension works correctly before distribution.

### Changes Required:

#### 1. Test Runner Setup
**File**: `vscode-extension/src/test/runTest.ts`
**Changes**: Create test runner configuration

```typescript
import * as path from 'path';
import { runTests } from '@vscode/test-electron';

async function main() {
  try {
    // The folder containing the Extension Manifest package.json
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // The path to the extension test script
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();
```

#### 2. Test Suite Index
**File**: `vscode-extension/src/test/suite/index.ts`
**Changes**: Create Mocha test suite configuration

```typescript
import * as path from 'path';
import * as Mocha from 'mocha';
import * as glob from 'glob';

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((resolve, reject) => {
    glob('**/**.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) {
        return reject(err);
      }

      // Add files to the test suite
      files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

      try {
        // Run the mocha test
        mocha.run(failures => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}
```

#### 3. Extension Tests
**File**: `vscode-extension/src/test/suite/extension.test.ts`
**Changes**: Create basic extension tests

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.');

  test('Extension should be present', () => {
    assert.ok(vscode.extensions.getExtension('paw-workflow.paw-workflow'));
  });

  test('Extension should activate', async () => {
    const ext = vscode.extensions.getExtension('paw-workflow.paw-workflow');
    await ext?.activate();
    assert.ok(ext?.isActive);
  });

  test('Command should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('paw.initializeWorkItem'));
  });
});
```

#### 4. User Input Tests
**File**: `vscode-extension/src/test/suite/userInput.test.ts`
**Changes**: Create tests for input validation

```typescript
import * as assert from 'assert';

suite('User Input Validation Tests', () => {
  
  test('Valid branch names should pass validation', () => {
    const validNames = [
      'feature/my-feature',
      'bugfix/fix-123',
      'feature/user_auth',
      'main',
      'develop'
    ];
    
    validNames.forEach(name => {
      const result = /^[a-zA-Z0-9/_-]+$/.test(name);
      assert.ok(result, `${name} should be valid`);
    });
  });

  test('Invalid branch names should fail validation', () => {
    const invalidNames = [
      'feature/my feature',  // space
      'feature/my@feature',  // special char
      'feature/my#feature',  // special char
      ''                     // empty
    ];
    
    invalidNames.forEach(name => {
      if (name === '') {
        assert.ok(!name, 'Empty string should fail');
      } else {
        const result = /^[a-zA-Z0-9/_-]+$/.test(name);
        assert.ok(!result, `${name} should be invalid`);
      }
    });
  });

  test('Valid GitHub issue URLs should pass validation', () => {
    const validUrls = [
      'https://github.com/owner/repo/issues/123',
      'https://github.com/microsoft/vscode/issues/1'
    ];
    
    validUrls.forEach(url => {
      const result = /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/.test(url);
      assert.ok(result, `${url} should be valid`);
    });
  });

  test('Invalid GitHub issue URLs should fail validation', () => {
    const invalidUrls = [
      'https://github.com/owner/repo/pull/123',  // PR not issue
      'github.com/owner/repo/issues/123',        // Missing https
      'https://github.com/owner/issues/123',     // Missing repo
      'https://gitlab.com/owner/repo/issues/123' // Wrong domain
    ];
    
    invalidUrls.forEach(url => {
      const result = /^https:\/\/github\.com\/[^/]+\/[^/]+\/issues\/\d+$/.test(url);
      assert.ok(!result, `${url} should be invalid`);
    });
  });
});
```

#### 5. Missing Dependencies
**File**: `vscode-extension/package.json`
**Changes**: Add missing glob dependency for tests

```json
{
  "devDependencies": {
    "@types/node": "^18.x",
    "@types/vscode": "^1.85.0",
    "@types/mocha": "^10.0.6",
    "@types/glob": "^8.1.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0",
    "@typescript-eslint/parser": "^6.15.0",
    "@vscode/test-electron": "^2.3.8",
    "@vscode/vsce": "^2.22.0",
    "eslint": "^8.56.0",
    "glob": "^8.1.0",
    "mocha": "^10.2.0",
    "typescript": "^5.3.3"
  }
}
```

#### 6. Installation Instructions
**File**: `vscode-extension/INSTALL.md`
**Changes**: Create installation instructions for local testing

```markdown
# PAW Workflow Extension - Installation Guide

## Development Installation

### Prerequisites
- Node.js 16.x or later
- npm 7.x or later
- VS Code 1.85.0 or later

### Build and Install

1. **Navigate to extension directory:**
   ```bash
   cd vscode-extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile TypeScript:**
   ```bash
   npm run compile
   ```

4. **Run tests (optional):**
   ```bash
   npm test
   ```

5. **Package extension:**
   ```bash
   npm run package
   ```
   
   This creates `paw-workflow-0.0.1.vsix` in the extension directory.

6. **Install in VS Code:**
   ```bash
   code --install-extension paw-workflow-0.0.1.vsix
   ```
   
   Or via VS Code UI:
   - Open Extensions view (Cmd+Shift+X / Ctrl+Shift+X)
   - Click "..." menu → "Install from VSIX..."
   - Select `paw-workflow-0.0.1.vsix`

### Verify Installation

1. Reload VS Code window
2. Open Command Palette (Cmd+Shift+P / Ctrl+Shift+P)
3. Type "PAW: Initialize Work Item"
4. Command should appear in the list

### Development Mode

For active development with auto-reload:

1. Open `vscode-extension/` folder in VS Code
2. Press F5 to launch Extension Development Host
3. Make changes to TypeScript files
4. Extension auto-recompiles (if watch mode running: `npm run watch`)
5. Reload Extension Development Host window (Cmd+R / Ctrl+R)

## Uninstall

```bash
code --uninstall-extension paw-workflow.paw-workflow
```

Or via VS Code Extensions view: Find extension → Uninstall
```

#### 7. Extension README Update
**File**: `vscode-extension/README.md`
**Changes**: Revamp README after implementation is complete to ensure content aligns with the end state of work

The README created in Phase 1 contains placeholder information about features not yet implemented. After completing Phases 2-4, update the README to accurately reflect:
- Actual features implemented in the extension
- Accurate usage instructions based on final implementation
- Real examples and screenshots if applicable
- Correct requirements and dependencies
- Updated Known Issues section if any issues were discovered during implementation
- Final release notes reflecting what was actually delivered

This task should be completed after all implementation phases are done and before creating the final pull request.

### Success Criteria:

#### Automated Verification:
- [x] All tests pass: `npm test`
- [x] Extension packages successfully: `npm run package`
- [x] No TypeScript compilation errors: `npm run compile`
- [x] No linting errors: `npm run lint`
- [x] .vsix file created (paw-workflow-0.0.1.vsix, ~19 KB due to minimal code footprint)

#### Manual Verification:
- [ ] Extension installs from .vsix without errors
- [ ] Extension activates after installation
- [ ] Command appears in Command Palette
- [ ] Extension can be uninstalled cleanly
- [ ] Tests run successfully in VS Code Test Explorer
- [ ] Watch mode works for development (auto-recompile on changes)
- [ ] README.md updated to reflect final implementation state

---

### Phase 4 Implementation Complete

- Added Mocha-based integration tests and runner under `vscode-extension/src/test/`, covering extension activation and command registration.
- Exposed `isValidBranchName` and `isValidGitHubIssueUrl` helpers to support focused unit tests for input validation logic.
- Documented setup steps in `vscode-extension/INSTALL.md` and recorded required `glob` dependencies for the new test harness.
- Automated verification succeeded (`npm run compile`, `npm run lint`, `npm test`, `npm run package`), producing `paw-workflow-0.0.1.vsix` (~19 KB, small due to lean codebase).
- Manual verification tasks remain outstanding (VSIX installation smoke test, watch-mode check, README refresh). Review Agent should prioritize these items and confirm the lighter VSIX size is acceptable.

**Addressed Review Comments (2025-10-29):**

PR #47 review feedback addressed:

1. **Move INSTALL.md to DEVELOPING.md** (https://github.com/lossyrob/phased-agent-workflow/pull/47#discussion_r2475043489)
   - Moved content from `vscode-extension/INSTALL.md` to top-level `DEVELOPING.md`
   - Created new "VS Code Extension Development" section in `DEVELOPING.md` with all development and installation instructions
   - Deleted `vscode-extension/INSTALL.md` file
   - This makes `DEVELOPING.md` a comprehensive guide for developers working on PAW, covering both chatmode development and VS Code extension development
   - Updated `DEVELOPING.md` project structure section to include `vscode-extension/` directory

All automated verification checks still pass after addressing review comments:
- ✅ TypeScript compilation: `npm run compile`
- ✅ Linting: `npm run lint`
- ✅ Tests: `npm test` (7/7 passing)
- ✅ Packaging: `npm run package` (18.86 KB .vsix created)

---

## Phase 5: Custom Instructions Support

### Overview
Add support for loading optional custom instructions from `.paw/instructions/init-instructions.md` and injecting them into the agent prompt. This establishes a clean, repeatable pattern for customizing PAW workflow prompts that can be applied to other agents in the future.

### Changes Required:

#### 1. Custom Instructions Loader Module
**File**: `vscode-extension/src/prompts/customInstructions.ts`
**Changes**: Create module for loading and parsing custom instructions

```typescript
import * as fs from 'fs';
import * as path from 'path';

/**
 * Result of loading custom instructions
 */
export interface CustomInstructions {
  exists: boolean;
  content: string;
  error?: string;
}

/**
 * Load custom instructions from .paw/instructions/init-instructions.md
 * 
 * @param workspacePath Absolute path to workspace root
 * @returns CustomInstructions object with exists flag, content, and optional error
 */
export function loadCustomInstructions(workspacePath: string): CustomInstructions {
  const customInstructionsPath = path.join(
    workspacePath,
    '.paw',
    'instructions',
    'init-instructions.md'
  );

  try {
    // Check if file exists
    if (!fs.existsSync(customInstructionsPath)) {
      return {
        exists: false,
        content: ''
      };
    }

    // Read file content
    const content = fs.readFileSync(customInstructionsPath, 'utf-8');

    // Basic validation - must have some non-whitespace content
    if (content.trim().length === 0) {
      return {
        exists: true,
        content: '',
        error: 'Custom instructions file exists but is empty'
      };
    }

    return {
      exists: true,
      content: content.trim()
    };

  } catch (error) {
    // Graceful degradation on read errors
    return {
      exists: true,
      content: '',
      error: `Failed to read custom instructions: ${error}`
    };
  }
}

/**
 * Format custom instructions for inclusion in agent prompt
 * 
 * @param instructions CustomInstructions object
 * @returns Formatted markdown section, or empty string if no valid instructions
 */
export function formatCustomInstructions(instructions: CustomInstructions): string {
  if (!instructions.exists || !instructions.content) {
    return '';
  }

  return `
## Custom Instructions

The following custom instructions have been provided for this workspace's work item initialization:

---

${instructions.content}

---

**Note**: Follow the custom instructions above in addition to the standard PAW workflow rules. If there are any conflicts, the custom instructions take precedence for this workspace.
`;
}
```

#### 2. Update Agent Prompt Template
**File**: `vscode-extension/src/prompts/workItemInitPrompt.template.md`
**Changes**: Add placeholder for custom instructions section

Add the following section after the "## Parameters Provided" section and before "## Your Tasks":

```markdown
{{CUSTOM_INSTRUCTIONS}}
```

This placeholder will be replaced with either:
- An empty string (if no custom instructions exist)
- The formatted custom instructions section (if they exist)

#### 3. Update Agent Prompt Builder
**File**: `vscode-extension/src/prompts/agentPrompt.ts`
**Changes**: Integrate custom instructions loading and template substitution

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { loadCustomInstructions, formatCustomInstructions } from './customInstructions';

/**
 * Construct comprehensive prompt for GitHub Copilot agent to create PAW work item
 */
export function constructAgentPrompt(
  targetBranch: string,
  githubIssueUrl: string | undefined,
  workspacePath: string
): string {
  // Load prompt template
  const templatePath = path.join(__dirname, 'workItemInitPrompt.template.md');
  let template = fs.readFileSync(templatePath, 'utf-8');

  // Load custom instructions
  const customInstructions = loadCustomInstructions(workspacePath);
  const customInstructionsSection = formatCustomInstructions(customInstructions);

  // Prepare substitution variables
  const substitutions: Record<string, string> = {
    TARGET_BRANCH: targetBranch,
    WORKSPACE_PATH: workspacePath,
    GITHUB_ISSUE_URL: githubIssueUrl || 'Not provided',
    GITHUB_ISSUE_FIELD: githubIssueUrl 
      ? `GitHub Issue: ${githubIssueUrl}` 
      : 'GitHub Issue: none',
    WORK_TITLE_STRATEGY: githubIssueUrl
      ? '**From GitHub Issue** (Preferred):\n- Fetch issue title from: ' + githubIssueUrl + '\n- Use issue title as Work Title (may shorten for PR prefix later)\n- If fetch fails, fall back to branch-based generation\n\n'
      : '',
    WORK_TITLE_FALLBACK_INDICATOR: githubIssueUrl ? ' (Fallback' : ' (Primary',
    CUSTOM_INSTRUCTIONS: customInstructionsSection
  };

  // Perform substitutions
  let prompt = template;
  for (const [key, value] of Object.entries(substitutions)) {
    prompt = prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }

  return prompt;
}
```

#### 4. Update Command Handler Logging
**File**: `vscode-extension/src/commands/initializeWorkItem.ts`
**Changes**: Add logging for custom instructions status

Add after git validation and before user input collection:

```typescript
    // Check for custom instructions
    outputChannel.appendLine('[INFO] Checking for custom instructions...');
    const customInstructionsPath = path.join(
      workspaceFolder.uri.fsPath,
      '.paw',
      'instructions',
      'init-instructions.md'
    );
    const hasCustomInstructions = fs.existsSync(customInstructionsPath);
    
    if (hasCustomInstructions) {
      outputChannel.appendLine('[INFO] Custom instructions found at .paw/instructions/init-instructions.md');
    } else {
      outputChannel.appendLine('[INFO] No custom instructions found (optional)');
    }
```

Don't forget to import `fs` and `path` at the top of the file:
```typescript
import * as fs from 'fs';
import * as path from 'path';
```

#### 5. Example Custom Instructions File
**File**: `vscode-extension/examples/init-instructions.example.md`
**Changes**: Create example showing custom instructions format

```markdown
---
# Custom Instructions for Work Item Initialization
# Place this file at .paw/instructions/init-instructions.md in your workspace
---

# Project-Specific Initialization Rules

## Naming Conventions

For this project, all feature slugs should:
- Include the component prefix (e.g., "api-", "ui-", "db-")
- Use project-standard abbreviations (e.g., "auth" not "authentication")

## Required Metadata

Always include the following in WorkflowContext.md Additional Inputs field:
- Component: [api|ui|db|infra]
- Priority: [P0|P1|P2|P3]

## Branch Naming

Target branches must follow the pattern:
- feature/<component>-<slug>
- bugfix/<component>-<slug>
- hotfix/<component>-<slug>

## Custom Prompt Templates

This project uses additional prompt templates beyond the standard 9:
- 0Y-security-review.prompt.md - Security review checklist
- 0Z-performance-test.prompt.md - Performance testing plan

Please create these additional templates when initializing work items.

## GitHub Integration

Always require a GitHub issue URL for this project. The Work Title must exactly match the issue title (do not abbreviate or modify).
```

#### 6. Documentation Update
**File**: `vscode-extension/README.md`
**Changes**: Add section documenting custom instructions feature

Add a new section after "Usage":

```markdown
## Custom Instructions

You can customize the work item initialization behavior for your project by creating a custom instructions file.

### Setup

1. Create the directory:
   ```bash
   mkdir -p .paw/instructions
   ```

2. Create the file:
   ```bash
   touch .paw/instructions/init-instructions.md
   ```

3. Add your custom instructions using markdown format. See `examples/init-instructions.example.md` for a template.

### What Can You Customize?

Custom instructions allow you to:
- Enforce project-specific naming conventions for feature slugs
- Require additional metadata in WorkflowContext.md
- Specify custom branch naming patterns
- Add project-specific prompt templates beyond the standard 9
- Customize GitHub integration behavior
- Add workspace-specific validation rules

### How It Works

When you run "PAW: Initialize Work Item", the extension:
1. Checks for `.paw/instructions/init-instructions.md`
2. If found, loads the content
3. Injects it into the agent prompt with context
4. The agent follows both standard PAW rules AND your custom instructions
5. If conflicts exist, custom instructions take precedence

### Example

```markdown
# Project XYZ Custom Rules

## Feature Slug Format
All slugs must start with component prefix: api-, ui-, or db-

## Required Fields
Include in WorkflowContext.md Additional Inputs:
- Component: [api|ui|db]
- Jira Ticket: XYZ-####
```

This ensures consistent naming and metadata across all work items in your project.
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `npm run compile`
- [x] No linting errors: `npm run lint`
- [x] Custom instructions loader handles missing file gracefully
- [x] Custom instructions loader handles empty file gracefully
- [x] Custom instructions loader handles read errors gracefully
- [x] Template substitution includes custom instructions when present
- [x] Template substitution works when custom instructions absent

#### Manual Verification:
- [ ] Create `.paw/instructions/init-instructions.md` with test content
- [ ] Run "PAW: Initialize Work Item" command
- [ ] Verify output channel logs "Custom instructions found"
- [ ] Verify agent prompt includes custom instructions section
- [ ] Delete custom instructions file
- [ ] Run command again
- [ ] Verify output channel logs "No custom instructions found"
- [ ] Verify agent prompt works without custom instructions
- [ ] Test with empty custom instructions file
- [ ] Verify initialization completes successfully (graceful degradation)
- [ ] Example file demonstrates common customization patterns

### Phase 5 Implementation Complete

- Added `loadCustomInstructions` and `formatCustomInstructions` helpers to manage optional workspace guidance with clear error handling.
- Injected formatted instructions into the agent prompt template and surfaced status logs in `initializeWorkItemCommand`, including warnings for unreadable files.
- Expanded prompt template loading to locate the source file when running from compiled output and updated `.vscodeignore` to ship the markdown with packaged builds.
- Delivered example instructions at `vscode-extension/examples/init-instructions.example.md` plus README guidance so teams can adopt the customization workflow quickly.
- Introduced targeted unit tests covering loader scenarios and prompt injection to satisfy success criteria.
- Automated verification executed:
  - ✅ `npm run compile`
  - ✅ `npm run lint`
  - ✅ `npm test`

**Notes for Review Agent:** Manual walkthroughs of the new customization flow remain outstanding. Please run the Command Palette scenarios with and without `.paw/instructions/init-instructions.md` to validate the end-to-end behavior in the Extension Development Host.

---

## Testing Strategy

### Unit Tests

**Scope:**
- Input validation logic (branch names, GitHub URLs)
- Feature slug normalization rules
- Prompt construction logic
- Git validation helpers

**Approach:**
- Use Mocha test framework with VS Code Test Runner
- Mock VS Code APIs where needed (input boxes, commands)
- Test edge cases (empty strings, special characters, long inputs)
- Validate error messages are user-friendly

**Key Test Cases:**
- ✅ Valid branch names pass validation
- ✅ Invalid branch names fail with clear messages
- ✅ GitHub issue URL format validation
- ✅ Empty/undefined input handling
- ✅ Prompt includes all required sections
- ✅ Git repository detection works
- ✅ Custom instructions loader returns exists=false for missing file
- ✅ Custom instructions loader returns valid content for existing file
- ✅ Custom instructions loader handles empty files gracefully
- ✅ Custom instructions formatter produces correct markdown section
- ✅ Template substitution works with and without custom instructions

### Integration Tests

**Scope:**
- End-to-end command execution flow
- Agent mode invocation
- Output channel logging
- Extension activation and command registration

**Approach:**
- Run tests in VS Code Extension Development Host
- Use temporary workspace folders for file operations
- Verify command registration and execution
- Check output channel messages

**Key Test Cases:**
- ✅ Extension activates successfully
- ✅ Command registered in Command Palette
- ✅ User input collection workflow
- ✅ Output channel created and logs messages
- ✅ Agent mode command invocation succeeds
- ✅ Error handling for non-git repository

### Manual Testing Steps

**Pre-requisites:**
- Install extension from .vsix
- Open a git repository in VS Code
- Have GitHub Copilot extension installed and active

**Test Scenario 1: Happy Path**
1. Open Command Palette
2. Run "PAW: Initialize Work Item"
3. Enter target branch: `feature/test-init`
4. Enter GitHub issue: Skip (press Enter)
5. Verify:
   - Chat panel opens with agent mode
   - Agent creates `.paw/work/test-init/` directory
   - WorkflowContext.md exists with correct parameters
   - 9 prompt files exist in `prompts/` subdirectory
   - Git branch `feature/test-init` created and checked out
   - WorkflowContext.md opens in editor
   - Output channel shows all operations logged

**Test Scenario 2: With GitHub Issue**
1. Run command
2. Enter target branch: `feature/auth-system`
3. Enter GitHub issue: `https://github.com/owner/repo/issues/123`
4. Verify:
   - Agent attempts to fetch issue title
   - Work Title in WorkflowContext.md uses issue title (or fallback)
   - GitHub Issue URL recorded in WorkflowContext.md

**Test Scenario 3: Error - Not a Git Repository**
1. Open a non-git folder in VS Code
2. Run command
3. Verify:
   - Error message shown: "PAW requires a Git repository"
   - Option to initialize Git offered
   - Command aborts gracefully

**Test Scenario 4: User Cancellation**
1. Run command
2. Cancel at branch name input (press Escape)
3. Verify:
   - Command aborts gracefully
   - No error messages shown
   - Output channel logs cancellation

**Test Scenario 5: Invalid Input**
1. Run command
2. Enter branch name with spaces: `feature/my feature`
3. Verify:
   - Validation error shown immediately
   - User can correct input
   - Valid input proceeds normally

**Test Scenario 6: Slug Conflict**
1. Create `.paw/work/test-conflict/` directory manually
2. Run command with branch: `feature/test-conflict`
3. Verify:
   - Agent detects conflict
   - User prompted for resolution (different name, overwrite, cancel)
   - Resolution handled correctly

**Test Scenario 7: Branch Already Exists**
1. Create branch `feature/existing-branch` locally
2. Run command with same branch name
3. Verify:
   - Agent detects existing branch
   - User prompted: checkout existing or choose different name
   - Choice handled correctly

**Test Scenario 8: With Custom Instructions**
1. Create `.paw/instructions/init-instructions.md` with content:
   ```markdown
   # Test Custom Rules
   - All slugs must start with "test-"
   - Include Priority field in WorkflowContext.md
   ```
2. Run "PAW: Initialize Work Item"
3. Enter target branch: `feature/example-feature`
4. Verify:
   - Output channel logs "Custom instructions found"
   - Agent prompt contains "Custom Instructions" section
   - Custom rules are visible to agent
   - Agent follows custom rules (slug starts with "test-")

**Test Scenario 9: Without Custom Instructions**
1. Ensure `.paw/instructions/init-instructions.md` does NOT exist
2. Run "PAW: Initialize Work Item"
3. Enter target branch: `feature/normal-feature`
4. Verify:
   - Output channel logs "No custom instructions found (optional)"
   - Initialization proceeds normally
   - Standard PAW rules applied without custom modifications

**Test Scenario 10: Empty Custom Instructions File**
1. Create empty `.paw/instructions/init-instructions.md`
2. Run command
3. Verify:
   - Initialization completes successfully
   - No errors thrown
   - Graceful degradation (treats as if file doesn't exist)

### Performance Considerations

**Expected Timing:**
- Command invocation to agent prompt: < 2 seconds
- Total user interaction time: < 60 seconds (per spec)
- Agent execution time: 5-30 seconds (depends on agent response time)

**Resource Usage:**
- Extension activation: < 100ms
- Memory footprint: < 10MB
- No background processes or watchers

**Optimization Notes:**
- Extension uses lazy activation (only loads when command invoked)
- Minimal dependencies (VS Code API, Node.js built-ins only)
- No heavy computation in extension code (delegated to agent)
- Custom instructions file read once per command invocation (not watched/cached)
- Custom instructions limited to reasonable size (< 100KB) for prompt injection

## Migration Notes

N/A - This is a greenfield implementation with no existing data or systems to migrate.

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/35
- Spec: `.paw/work/vscode-extension-init/Spec.md`
- Research: `.paw/work/vscode-extension-init/SpecResearch.md`, `.paw/work/vscode-extension-init/CodeResearch.md`
- PAW Specification: `paw-specification.md`
- VS Code Extension API: https://code.visualstudio.com/api
- Extension Examples: https://github.com/microsoft/vscode-extension-samples
