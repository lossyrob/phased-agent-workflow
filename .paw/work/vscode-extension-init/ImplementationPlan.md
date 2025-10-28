# VS Code Extension - PAW Initializer Implementation Plan

## Overview

This plan details the implementation of a VS Code extension that provides a command palette integration for initializing PAW work items. The extension automates the creation of the `.paw/work/<feature-slug>/` directory structure, generates all required files (WorkflowContext.md and prompt templates), creates and checks out git branches, and optionally fetches GitHub issue metadata to populate Work Title.

## Current State Analysis

**What exists now:**
- PAW specification document at `paw-specification.md` defining workflow structure
- Existing work items in `.paw/work/` showing the target directory pattern
- Example prompt templates in `.paw/work/paw-directory/prompts/` demonstrating the frontmatter format
- No VS Code extension infrastructure exists yet (greenfield project)

**Key Discoveries:**
- Prompt template pattern uses frontmatter with `mode` and `model` fields (`.paw/work/paw-directory/prompts/01A-create-spec.prompt.md`)
- WorkflowContext.md uses simple key-value Markdown format
- Current PAW agents hardcode paths to `docs/agents/<target_branch>/` but spec defines new `.paw/work/<feature-slug>/` convention
- Extension will be first to implement the new directory convention

**Constraints:**
- Must use VS Code Extension API for all UI interactions
- Must use `vscode.workspace.fs` for cross-platform file operations
- Must execute git commands via Node.js `child_process` (no native VS Code git API for extensions)
- Must use `vscode.lm.invokeTool()` for GitHub MCP integration
- Extension must be compatible with VS Code ^1.85.0 (current LTS)

## Desired End State

A fully functional VS Code extension that:
1. Can be installed from `.vsix` package or VS Code Marketplace
2. Provides "PAW: Initialize Work Item" command in command palette
3. Collects user input for target branch, optional GitHub issue URL, and git remote selection
4. Creates `.paw/work/<feature-slug>/` directory with all required files
5. Creates and checks out the target branch
6. Opens WorkflowContext.md for user review
7. Handles errors gracefully with clear user feedback

**Verification:**
- Extension activates without errors in VS Code output panel
- Command appears in command palette with "PAW:" prefix
- Running command creates all expected files and directories
- Git branch is created and checked out successfully
- WorkflowContext.md contains all required fields with correct values
- Extension can be packaged with `vsce package` without errors

## What We're NOT Doing

- Language model tool implementation (`paw_get_workflow_context`) - deferred to future subtask per Issue #35
- Chatmode management and installation - future subtask
- Chatmode upgrade functionality - future subtask
- Sidebar tree view for work item visualization - future subtask
- Smart agent launcher commands - future subtask
- Editing or updating existing work items
- Deletion or archival of work items
- Multi-repository or workspace support
- Authentication for private GitHub issues
- Work item migration between old and new directory structures

## Implementation Approach

**High-level Strategy:**
Build the extension in incremental phases, starting with the foundational extension structure and progressively adding features. Each phase produces a testable, functional increment that builds upon previous work.

**Module Organization:**
- Separate concerns into focused modules (git, filesystem, ui, utils)
- Keep business logic out of extension.ts activation function
- Design for testability with mockable dependencies
- Use TypeScript for type safety and better IDE support

**Error Handling Philosophy:**
- Validate early, fail fast with clear messages
- Preserve partial progress when possible (created files remain on git failure)
- Display actionable error messages via `vscode.window.showErrorMessage()`
- Include underlying error details for debugging

## Phase 1: Extension Project Setup

### Overview
Create the foundational VS Code extension structure with TypeScript configuration, build system, and basic activation. This phase establishes the project scaffolding that all subsequent phases build upon.

### Changes Required:

#### 1. Extension Root Configuration Files

**File**: `paw-vscode-extension/package.json`
**Changes**: Create extension manifest with metadata and command contribution

```json
{
  "name": "paw-workflow",
  "displayName": "PAW Workflow",
  "description": "Phased Agent Workflow automation for VS Code",
  "version": "0.1.0",
  "publisher": "paw",
  "repository": {
    "type": "git",
    "url": "https://github.com/lossyrob/phased-agent-workflow"
  },
  "engines": {
    "vscode": "^1.85.0"
  },
  "categories": ["Other"],
  "keywords": ["paw", "workflow", "agent", "automation"],
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
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "@vscode/test-electron": "^2.3.4",
    "@vscode/vsce": "^2.22.0",
    "eslint": "^8.50.0",
    "typescript": "^5.2.2"
  },
  "dependencies": {}
}
```

**File**: `paw-vscode-extension/tsconfig.json`
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
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src"],
  "exclude": ["node_modules", ".vscode-test"]
}
```

**File**: `paw-vscode-extension/.vscodeignore`
**Changes**: Define files to exclude from packaged extension

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
!node_modules/production-dependency/**
```

**File**: `paw-vscode-extension/.eslintrc.json`
**Changes**: Create ESLint configuration for code quality

```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaVersion": 6,
    "sourceType": "module"
  },
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "@typescript-eslint/naming-convention": "warn",
    "@typescript-eslint/semi": "warn",
    "curly": "warn",
    "eqeqeq": "warn",
    "no-throw-literal": "warn",
    "semi": "off"
  }
}
```

#### 2. Extension Source Code Structure

**File**: `paw-vscode-extension/src/extension.ts`
**Changes**: Create main extension entry point with activation

```typescript
import * as vscode from 'vscode';

/**
 * Extension activation function called when VS Code loads the extension
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('PAW Workflow extension is now active');

  // Register the initialize work item command
  const initializeCommand = vscode.commands.registerCommand(
    'paw.initializeWorkItem',
    async () => {
      // Command implementation will be added in Phase 2
      vscode.window.showInformationMessage(
        'PAW: Initialize Work Item command registered'
      );
    }
  );

  context.subscriptions.push(initializeCommand);
}

/**
 * Extension deactivation function called when VS Code unloads the extension
 */
export function deactivate() {
  // Cleanup if needed
}
```

**File**: `paw-vscode-extension/src/types.ts`
**Changes**: Create TypeScript type definitions

```typescript
/**
 * User input collected during work item initialization
 */
export interface WorkItemInputs {
  targetBranch: string;
  githubIssueUrl?: string;
  remote: string;
}

/**
 * Generated work item metadata
 */
export interface WorkItemMetadata {
  workTitle: string;
  featureSlug: string;
  targetBranch: string;
  githubIssue: string;
  remote: string;
  artifactPaths: string;
  additionalInputs: string;
}

/**
 * GitHub issue metadata fetched from API
 */
export interface GitHubIssue {
  title: string;
  number: number;
  url: string;
}
```

#### 3. Documentation and Licensing

**File**: `paw-vscode-extension/README.md`
**Changes**: Create extension documentation for VS Code Marketplace

```markdown
# PAW Workflow Extension

Automates Phased Agent Workflow (PAW) work item initialization in VS Code.

## Features

- **Initialize Work Item**: Create complete PAW work item structure with a single command
- **Automatic Directory Setup**: Creates `.paw/work/<feature-slug>/` with all required files
- **Git Integration**: Automatically creates and checks out target branch
- **GitHub Integration**: Optionally fetches issue metadata to populate Work Title

## Usage

1. Open a workspace with a git repository
2. Run command: `PAW: Initialize Work Item` from the command palette
3. Provide target branch name (e.g., `feature/my-feature`)
4. Optionally provide GitHub issue URL
5. Select git remote (if multiple configured)

The extension will create:
- `.paw/work/<feature-slug>/` directory
- `WorkflowContext.md` with workflow metadata
- `prompts/` subdirectory with 9 template files
- Empty `Spec.md` file
- Target git branch (created and checked out)

## Requirements

- VS Code 1.85.0 or higher
- Git installed and configured
- Workspace must be a git repository

## Extension Settings

This extension does not contribute any VS Code settings.

## Known Issues

None currently.

## Release Notes

### 0.1.0

Initial release with work item initialization command.
```

**File**: `paw-vscode-extension/LICENSE`
**Changes**: Copy from repository root or create appropriate license

```
MIT License

Copyright (c) 2025 PAW Workflow

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**File**: `paw-vscode-extension/.gitignore`
**Changes**: Create git ignore patterns

```
out/
node_modules/
.vscode-test/
*.vsix
.DS_Store
```

### Success Criteria:

#### Automated Verification:
- [x] TypeScript compilation succeeds: `npm run compile` (no errors)
- [x] Linting passes: `npm run lint` (no errors)
- [x] Extension can be packaged: `npm run package` (creates .vsix file)
- [x] No TypeScript errors in editor when opening `src/extension.ts`

#### Manual Verification:
- [ ] Extension activates when installed from .vsix: Check "Extensions" view shows "PAW Workflow"
- [ ] Command appears in command palette: Search for "PAW: Initialize Work Item"
- [ ] Running command shows info message: "PAW: Initialize Work Item command registered"
- [ ] Extension host logs show: "PAW Workflow extension is now active"
- [ ] Project structure matches expected layout with all files present

### Phase 1 Implementation Complete

**Status**: ✅ Completed - 2025-10-27

**What was accomplished**:
- Created complete VS Code extension project structure at `paw-vscode-extension/`
- Implemented all configuration files (package.json, tsconfig.json, .eslintrc.json, .vscodeignore, .gitignore)
- Created extension entry point (`src/extension.ts`) with basic activation and command registration
- Created TypeScript type definitions (`src/types.ts`) for work item data structures
- Created marketplace documentation (README.md, LICENSE)
- Successfully installed all npm dependencies
- All automated verification tests passed:
  - TypeScript compilation: ✅ No errors
  - ESLint: ✅ No errors (TypeScript version warning is not blocking)
  - Extension packaging: ✅ Successfully created paw-workflow-0.1.0.vsix (7 files, 4.58 KB)

**Notes for next phase**:
- Phase 2 will implement user input collection UI (branch name, GitHub issue URL, remote selection)
- The extension structure is ready for adding git operations and file system modules
- Manual testing of extension activation should be performed before opening Phase 1 PR

**Review considerations**:
- Verify package.json metadata is appropriate for marketplace publishing
- Consider whether TypeScript version warning requires action (currently using 5.9.3 vs supported <5.4.0)
- Confirm all required files are properly excluded from .vsix package via .vscodeignore

---

## Phase 2: Command Registration and User Input Collection

### Overview
Implement user interface for collecting work item initialization inputs using VS Code's input box and quick pick APIs. This phase creates the interactive experience for gathering target branch name, GitHub issue URL, and git remote selection. Also establishes a dedicated output channel for extension logging.

### Changes Required:

#### 1. Logging Module

**File**: `paw-vscode-extension/src/utils/logger.ts`
**Changes**: Create output channel wrapper for centralized logging

```typescript
import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

/**
 * Initializes the output channel for the extension
 */
export function initializeOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('PAW Workflow');
  }
  return outputChannel;
}

/**
 * Gets the output channel instance
 */
export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    throw new Error('Output channel not initialized. Call initializeOutputChannel first.');
  }
  return outputChannel;
}

/**
 * Logs an info message to the output channel
 */
export function logInfo(message: string): void {
  const channel = getOutputChannel();
  channel.appendLine(`[INFO] ${new Date().toISOString()}: ${message}`);
}

/**
 * Logs an error message to the output channel
 */
export function logError(message: string, error?: Error): void {
  const channel = getOutputChannel();
  channel.appendLine(`[ERROR] ${new Date().toISOString()}: ${message}`);
  if (error) {
    channel.appendLine(`  ${error.stack || error.message}`);
  }
}

/**
 * Logs a debug message to the output channel
 */
export function logDebug(message: string): void {
  const channel = getOutputChannel();
  channel.appendLine(`[DEBUG] ${new Date().toISOString()}: ${message}`);
}

/**
 * Shows the output channel panel
 */
export function showOutputChannel(): void {
  const channel = getOutputChannel();
  channel.show();
}
```

#### 2. User Input Module

**File**: `paw-vscode-extension/src/ui/userInput.ts`
**Changes**: Create module for collecting user inputs with validation

```typescript
import * as vscode from 'vscode';
import { WorkItemInputs } from '../types';

/**
 * Validates branch name against git naming rules
 */
function validateBranchName(value: string): string | undefined {
  if (!value || value.trim().length === 0) {
    return 'Branch name is required';
  }
  
  // Git branch name validation rules
  if (value.includes('..')) {
    return 'Branch name cannot contain ".."';
  }
  if (value.startsWith('/') || value.endsWith('/') || value.endsWith('.')) {
    return 'Branch name cannot start/end with "/" or end with "."';
  }
  if (/[\s~^:?*\[\\]/.test(value)) {
    return 'Branch name contains invalid characters';
  }
  
  return undefined;
}

/**
 * Validates GitHub issue URL format
 */
function validateGitHubIssueUrl(value: string): string | undefined {
  if (!value || value.trim().length === 0) {
    return undefined; // Optional field
  }
  
  const githubIssuePattern = /^https:\/\/github\.com\/[\w-]+\/[\w-]+\/issues\/\d+$/;
  if (!githubIssuePattern.test(value)) {
    return 'Invalid GitHub issue URL format (expected: https://github.com/owner/repo/issues/123)';
  }
  
  return undefined;
}

/**
 * Collects target branch name from user
 */
export async function collectBranchName(): Promise<string | undefined> {
  return await vscode.window.showInputBox({
    prompt: 'Enter target branch name for the work item',
    placeHolder: 'feature/my-feature',
    validateInput: validateBranchName,
    ignoreFocusOut: true
  });
}

/**
 * Collects optional GitHub issue URL from user
 */
export async function collectGitHubIssueUrl(): Promise<string | undefined> {
  return await vscode.window.showInputBox({
    prompt: 'Enter GitHub issue URL (optional, press Enter to skip)',
    placeHolder: 'https://github.com/owner/repo/issues/123',
    validateInput: validateGitHubIssueUrl,
    ignoreFocusOut: true
  });
}

/**
 * Prompts user to select git remote when multiple exist
 */
export async function selectGitRemote(remotes: string[]): Promise<string | undefined> {
  if (remotes.length === 0) {
    throw new Error('No git remotes found in repository');
  }
  
  if (remotes.length === 1) {
    return remotes[0];
  }
  
  // Find 'origin' and make it the default if it exists
  const defaultRemote = remotes.includes('origin') ? 'origin' : remotes[0];
  
  const items = remotes.map(remote => ({
    label: remote,
    description: remote === defaultRemote ? '(default)' : undefined
  }));
  
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select git remote',
    ignoreFocusOut: true
  });
  
  return selected?.label;
}

/**
 * Orchestrates collection of all user inputs
 */
export async function collectWorkItemInputs(remotes: string[]): Promise<WorkItemInputs | undefined> {
  // Collect branch name
  const targetBranch = await collectBranchName();
  if (!targetBranch) {
    return undefined; // User cancelled
  }
  
  // Collect optional GitHub issue URL
  const githubIssueUrl = await collectGitHubIssueUrl();
  // Note: undefined or empty string both mean no issue URL provided
  
  // Select git remote
  const remote = await selectGitRemote(remotes);
  if (!remote) {
    return undefined; // User cancelled
  }
  
  return {
    targetBranch,
    githubIssueUrl: githubIssueUrl && githubIssueUrl.trim() ? githubIssueUrl : undefined,
    remote
  };
}
```

#### 2. Update Extension Command Handler

**File**: `paw-vscode-extension/src/extension.ts`
**Changes**: Update command implementation to use output channel and collect user inputs

```typescript
import * as vscode from 'vscode';
import { collectWorkItemInputs } from './ui/userInput';
import { getGitRemotes } from './git/gitOperations'; // Will be added in Phase 4
import { initializeOutputChannel, logInfo, logError } from './utils/logger';

export function activate(context: vscode.ExtensionContext) {
  // Initialize output channel for logging
  const outputChannel = initializeOutputChannel();
  context.subscriptions.push(outputChannel);
  
  logInfo('PAW Workflow extension activated');

  const initializeCommand = vscode.commands.registerCommand(
    'paw.initializeWorkItem',
    async () => {
      try {
        logInfo('Starting work item initialization');
        
        // Verify workspace is available
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          const errorMsg = 'No workspace folder open. Please open a folder containing a git repository.';
          logError(errorMsg);
          vscode.window.showErrorMessage(`PAW: ${errorMsg}`);
          return;
        }
        
        logInfo(`Workspace: ${workspaceFolder.uri.fsPath}`);
        
        // Get git remotes (implementation in Phase 4)
        const remotes = await getGitRemotes(workspaceFolder.uri.fsPath);
        logInfo(`Found ${remotes.length} git remote(s): ${remotes.join(', ')}`);
        
        // Collect user inputs
        const inputs = await collectWorkItemInputs(remotes);
        if (!inputs) {
          logInfo('User cancelled input collection');
          return;
        }
        
        logInfo(`Collected inputs: branch=${inputs.targetBranch}, issue=${inputs.githubIssueUrl || 'none'}, remote=${inputs.remote}`);
        
        // Show collected inputs (temporary - full implementation in later phases)
        vscode.window.showInformationMessage(
          `Branch: ${inputs.targetBranch}, Issue: ${inputs.githubIssueUrl || 'none'}, Remote: ${inputs.remote}`
        );
        
      } catch (error) {
        const errorMsg = `Initialization failed: ${error instanceof Error ? error.message : String(error)}`;
        logError(errorMsg, error instanceof Error ? error : undefined);
        vscode.window.showErrorMessage(`PAW: ${errorMsg}`);
      }
    }
  );

  context.subscriptions.push(initializeCommand);
}

export function deactivate() {
  logInfo('PAW Workflow extension deactivated');
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] No linting errors: `npm run lint`
- [ ] Type checking passes for new ui/userInput.ts and utils/logger.ts modules

#### Manual Verification:
- [ ] Extension activation logs appear in "PAW Workflow" output channel
- [ ] Output channel shows timestamped log entries with INFO/ERROR/DEBUG prefixes
- [ ] Running command prompts for branch name with placeholder "feature/my-feature"
- [ ] User input collection is logged to output channel
- [ ] Entering invalid branch name (e.g., "branch..name") shows validation error
- [ ] Entering valid branch name proceeds to GitHub issue URL prompt
- [ ] GitHub issue URL prompt allows pressing Enter to skip
- [ ] Invalid GitHub URL (e.g., "https://example.com") shows validation error
- [ ] Valid GitHub URL (e.g., "https://github.com/owner/repo/issues/1") is accepted
- [ ] If multiple git remotes exist, quick pick shows remote selection with "origin" marked as default
- [ ] If only one git remote exists, no selection prompt appears
- [ ] Pressing Escape at any input cancels the command without error (logged to output channel)
- [ ] After completion, info message shows all collected inputs correctly
- [ ] All operations are logged to the output channel with appropriate detail
- [ ] Errors show full stack traces in output channel for debugging

---

## Phase 3: Feature Slug Generation and File Operations

### Overview
Implement feature slug normalization, validation, and file system operations for creating the work item directory structure with all required files. This phase translates user inputs into the physical `.paw/work/<feature-slug>/` structure.

### Changes Required:

#### 1. Slug Utilities Module

**File**: `paw-vscode-extension/src/utils/slugify.ts`
**Changes**: Create slug normalization and validation logic

```typescript
import * as vscode from 'vscode';
import * as path from 'path';

const RESERVED_NAMES = new Set(['.', '..', 'node_modules', '.git', '.paw']);
const MAX_SLUG_LENGTH = 100;

/**
 * Normalizes a branch name into a filesystem-safe feature slug
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes invalid characters
 * - Collapses consecutive hyphens
 * - Trims leading/trailing hyphens
 * - Truncates to MAX_SLUG_LENGTH characters
 */
export function normalizeFeatureSlug(branchName: string): string {
  let slug = branchName
    .toLowerCase()
    // Replace slashes, spaces, underscores with hyphens
    .replace(/[\/\s_]+/g, '-')
    // Remove all characters except alphanumeric and hyphens
    .replace(/[^a-z0-9-]/g, '')
    // Collapse consecutive hyphens
    .replace(/-+/g, '-')
    // Trim leading/trailing hyphens
    .replace(/^-+|-+$/g, '');
  
  // Truncate to max length
  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.substring(0, MAX_SLUG_LENGTH).replace(/-+$/, '');
  }
  
  return slug;
}

/**
 * Validates that a feature slug is not a reserved name
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_NAMES.has(slug);
}

/**
 * Checks if a feature slug directory already exists
 */
export async function slugExists(
  workspaceRoot: vscode.Uri,
  slug: string
): Promise<boolean> {
  try {
    const slugPath = vscode.Uri.joinPath(workspaceRoot, '.paw', 'work', slug);
    await vscode.workspace.fs.stat(slugPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a unique feature slug by appending numeric suffix if needed
 */
export async function generateUniqueSlug(
  workspaceRoot: vscode.Uri,
  branchName: string
): Promise<{ slug: string; wasAdjusted: boolean }> {
  const baseSlug = normalizeFeatureSlug(branchName);
  
  // Validate not empty after normalization
  if (!baseSlug) {
    throw new Error(
      'Branch name produces empty slug after normalization. Please use a more descriptive branch name.'
    );
  }
  
  // Validate not reserved
  if (isReservedSlug(baseSlug)) {
    throw new Error(
      `"${baseSlug}" is a reserved directory name. Please choose a different branch name.`
    );
  }
  
  // Check if base slug is available
  if (!(await slugExists(workspaceRoot, baseSlug))) {
    return { slug: baseSlug, wasAdjusted: false };
  }
  
  // Generate unique slug by appending -2, -3, etc.
  let suffix = 2;
  while (suffix < 100) { // Safety limit
    const candidateSlug = `${baseSlug}-${suffix}`;
    if (!(await slugExists(workspaceRoot, candidateSlug))) {
      return { slug: candidateSlug, wasAdjusted: true };
    }
    suffix++;
  }
  
  throw new Error(
    `Could not generate unique slug for "${branchName}" (tried up to ${baseSlug}-${suffix})`
  );
}
```

#### 2. File Operations Module

**File**: `paw-vscode-extension/src/fs/fileOperations.ts`
**Changes**: Create file system operations for work item structure

```typescript
import * as vscode from 'vscode';
import { WorkItemMetadata } from '../types';

/**
 * Prompt template definitions with their filenames and content
 */
const PROMPT_TEMPLATES = [
  {
    filename: '01A-spec.prompt.md',
    mode: 'PAW-01A Spec Agent',
    instruction: 'Create specification from .paw/work/{slug}/WorkflowContext.md'
  },
  {
    filename: '01B-spec-research.prompt.md',
    mode: 'PAW-01B Spec Research Agent',
    instruction: 'Answer research questions from .paw/work/{slug}/WorkflowContext.md'
  },
  {
    filename: '02A-code-research.prompt.md',
    mode: 'PAW-02A Code Research Agent',
    instruction: 'Research code implementation from .paw/work/{slug}/WorkflowContext.md'
  },
  {
    filename: '02B-impl-plan.prompt.md',
    mode: 'PAW-02B Impl Planner',
    instruction: 'Create implementation plan from .paw/work/{slug}/WorkflowContext.md'
  },
  {
    filename: '03A-implement.prompt.md',
    mode: 'PAW-03A Implementer',
    instruction: 'Implement next phase from .paw/work/{slug}/WorkflowContext.md'
  },
  {
    filename: '03B-review.prompt.md',
    mode: 'PAW-03B Implementation Review Agent',
    instruction: 'Review implementation from .paw/work/{slug}/WorkflowContext.md'
  },
  {
    filename: '04-docs.prompt.md',
    mode: 'PAW-04 Documenter',
    instruction: 'Create documentation from .paw/work/{slug}/WorkflowContext.md'
  },
  {
    filename: '05-pr.prompt.md',
    mode: 'PAW-05 PR Agent',
    instruction: 'Create final PR from .paw/work/{slug}/WorkflowContext.md'
  },
  {
    filename: '0X-status.prompt.md',
    mode: 'PAW-0X Status Agent',
    instruction: 'Update status from .paw/work/{slug}/WorkflowContext.md'
  }
];

/**
 * Generates WorkflowContext.md content
 */
function generateWorkflowContextContent(metadata: WorkItemMetadata): string {
  return `# WorkflowContext

Work Title: ${metadata.workTitle}
Feature Slug: ${metadata.featureSlug}
Target Branch: ${metadata.targetBranch}
GitHub Issue: ${metadata.githubIssue}
Remote: ${metadata.remote}
Artifact Paths: ${metadata.artifactPaths}
Additional Inputs: ${metadata.additionalInputs}
`;
}

/**
 * Generates prompt template file content
 */
function generatePromptTemplateContent(
  template: typeof PROMPT_TEMPLATES[0],
  featureSlug: string
): string {
  return `---
mode: ${template.mode}
---

${template.instruction.replace('{slug}', featureSlug)}
`;
}

/**
 * Creates the complete work item directory structure with all files
 */
export async function createWorkItemStructure(
  workspaceRoot: vscode.Uri,
  metadata: WorkItemMetadata
): Promise<vscode.Uri> {
  const workItemPath = vscode.Uri.joinPath(
    workspaceRoot,
    '.paw',
    'work',
    metadata.featureSlug
  );
  
  // Create main directory
  await vscode.workspace.fs.createDirectory(workItemPath);
  
  // Create prompts subdirectory
  const promptsPath = vscode.Uri.joinPath(workItemPath, 'prompts');
  await vscode.workspace.fs.createDirectory(promptsPath);
  
  // Create WorkflowContext.md
  const workflowContextContent = generateWorkflowContextContent(metadata);
  const workflowContextPath = vscode.Uri.joinPath(workItemPath, 'WorkflowContext.md');
  await vscode.workspace.fs.writeFile(
    workflowContextPath,
    Buffer.from(workflowContextContent, 'utf8')
  );
  
  // Create prompt template files
  for (const template of PROMPT_TEMPLATES) {
    const templateContent = generatePromptTemplateContent(template, metadata.featureSlug);
    const templatePath = vscode.Uri.joinPath(promptsPath, template.filename);
    await vscode.workspace.fs.writeFile(
      templatePath,
      Buffer.from(templateContent, 'utf8')
    );
  }
  
  // Create empty Spec.md
  const specPath = vscode.Uri.joinPath(workItemPath, 'Spec.md');
  await vscode.workspace.fs.writeFile(specPath, Buffer.from('', 'utf8'));
  
  return workflowContextPath;
}

/**
 * Opens a file in the VS Code editor
 */
export async function openFileInEditor(fileUri: vscode.Uri): Promise<void> {
  const document = await vscode.workspace.openTextDocument(fileUri);
  await vscode.window.showTextDocument(document);
}
```

#### 3. Work Title Generation Module

**File**: `paw-vscode-extension/src/utils/workTitleGenerator.ts`
**Changes**: Create Work Title generation from branch names

```typescript
/**
 * Generates a 2-4 word Work Title from a branch name
 * Examples:
 *   feature/add-user-auth -> Add User Auth
 *   bugfix/fix-login-error -> Fix Login Error
 *   user/rde/improve-perf -> Improve Perf
 */
export function generateWorkTitle(branchName: string): string {
  // Remove common prefixes
  let cleaned = branchName
    .replace(/^(feature|bugfix|hotfix|chore|user\/[^\/]+)\//i, '');
  
  // Split on hyphens, underscores, slashes
  const words = cleaned
    .split(/[-_\/]+/)
    .filter(word => word.length > 0)
    .slice(0, 4); // Take first 4 words max
  
  // Capitalize each word
  const titleWords = words.map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
  
  return titleWords.join(' ') || 'Work Item';
}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] Slug normalization tests pass (unit tests for various inputs)
- [ ] Reserved name validation works correctly
- [ ] Work Title generation produces expected outputs

#### Manual Verification:
- [ ] Branch name "feature/add-user-auth!" normalizes to "feature-add-user-auth"
- [ ] Branch name with consecutive hyphens "my---feature" becomes "my-feature"
- [ ] Branch name exceeding 100 chars is truncated correctly
- [ ] Attempting to use reserved name "node_modules" shows clear error
- [ ] Creating work item when slug exists appends "-2" and informs user
- [ ] `.paw/work/<slug>/` directory is created with correct structure
- [ ] `WorkflowContext.md` contains all required fields with correct values
- [ ] All 9 prompt template files created in `prompts/` subdirectory
- [ ] Each prompt file has correct frontmatter mode identifier
- [ ] Empty `Spec.md` file is created
- [ ] Work Title is generated correctly from branch name (e.g., "feature/test-auth" -> "Test Auth")

---

## Phase 4: Git Integration

### Overview
Implement git repository operations for validating repository state, listing remotes, creating branches, and checking out branches. This phase provides the git functionality needed to prepare the working environment for PAW workflow execution.

### Changes Required:

#### 1. Git Operations Module

**File**: `paw-vscode-extension/src/git/gitOperations.ts`
**Changes**: Create git command execution and validation logic

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const GIT_TIMEOUT_MS = 5000;

/**
 * Executes a git command in the specified directory
 */
async function executeGitCommand(
  cwd: string,
  command: string
): Promise<{ stdout: string; stderr: string }> {
  try {
    const result = await execAsync(command, {
      cwd,
      timeout: GIT_TIMEOUT_MS
    });
    return result;
  } catch (error: any) {
    throw new Error(`Git command failed: ${error.message}`);
  }
}

/**
 * Checks if the directory is a git repository
 */
export async function isGitRepository(cwd: string): Promise<boolean> {
  try {
    await executeGitCommand(cwd, 'git rev-parse --git-dir');
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks for uncommitted changes in the working directory
 */
export async function hasUncommittedChanges(cwd: string): Promise<boolean> {
  const { stdout } = await executeGitCommand(cwd, 'git status --porcelain');
  return stdout.trim().length > 0;
}

/**
 * Gets the current branch name
 */
export async function getCurrentBranch(cwd: string): Promise<string> {
  const { stdout } = await executeGitCommand(cwd, 'git branch --show-current');
  return stdout.trim();
}

/**
 * Gets list of all git remotes
 */
export async function getGitRemotes(cwd: string): Promise<string[]> {
  const { stdout } = await executeGitCommand(cwd, 'git remote');
  return stdout
    .trim()
    .split('\n')
    .filter(remote => remote.length > 0);
}

/**
 * Checks if a branch exists (locally)
 */
export async function branchExists(cwd: string, branchName: string): Promise<boolean> {
  try {
    await executeGitCommand(cwd, `git rev-parse --verify ${branchName}`);
    return true;
  } catch {
    return false;
  }
}

/**
 * Creates and checks out a new branch
 */
export async function createAndCheckoutBranch(
  cwd: string,
  branchName: string
): Promise<void> {
  await executeGitCommand(cwd, `git checkout -b ${branchName}`);
}

/**
 * Checks out an existing branch
 */
export async function checkoutBranch(cwd: string, branchName: string): Promise<void> {
  await executeGitCommand(cwd, `git checkout ${branchName}`);
}
```

#### 2. Git Validation and Workflow Module

**File**: `paw-vscode-extension/src/git/gitValidation.ts`
**Changes**: Create high-level git workflow validation

```typescript
import * as vscode from 'vscode';
import {
  isGitRepository,
  hasUncommittedChanges,
  branchExists,
  createAndCheckoutBranch,
  checkoutBranch
} from './gitOperations';

/**
 * Validates that workspace is a git repository
 */
export async function validateGitRepository(workspacePath: string): Promise<void> {
  if (!(await isGitRepository(workspacePath))) {
    throw new Error(
      'Workspace is not a git repository. Please run "git init" or open a git repository.'
    );
  }
}

/**
 * Validates that working directory is clean (no uncommitted changes)
 */
export async function validateCleanWorkingDirectory(workspacePath: string): Promise<void> {
  if (await hasUncommittedChanges(workspacePath)) {
    throw new Error(
      'You have uncommitted changes. Please commit or stash your changes before initializing a work item.'
    );
  }
}

/**
 * Creates or checks out the target branch with user interaction
 */
export async function prepareTargetBranch(
  workspacePath: string,
  branchName: string
): Promise<void> {
  const exists = await branchExists(workspacePath, branchName);
  
  if (exists) {
    // Branch already exists - ask user what to do
    const action = await vscode.window.showQuickPick(
      [
        { label: 'Checkout existing branch', value: 'checkout' },
        { label: 'Choose different name', value: 'cancel' }
      ],
      {
        placeHolder: `Branch "${branchName}" already exists. What would you like to do?`,
        ignoreFocusOut: true
      }
    );
    
    if (!action || action.value === 'cancel') {
      throw new Error('Branch already exists. Please choose a different branch name.');
    }
    
    // Checkout existing branch
    await checkoutBranch(workspacePath, branchName);
    vscode.window.showInformationMessage(`Checked out existing branch: ${branchName}`);
  } else {
    // Create new branch
    await createAndCheckoutBranch(workspacePath, branchName);
    vscode.window.showInformationMessage(`Created and checked out branch: ${branchName}`);
  }
}
```

#### 3. Update Extension Command Handler

**File**: `paw-vscode-extension/src/extension.ts`
**Changes**: Integrate git validation and branch creation into workflow

```typescript
import * as vscode from 'vscode';
import { collectWorkItemInputs } from './ui/userInput';
import { getGitRemotes } from './git/gitOperations';
import {
  validateGitRepository,
  validateCleanWorkingDirectory,
  prepareTargetBranch
} from './git/gitValidation';
import { generateUniqueSlug } from './utils/slugify';
import { generateWorkTitle } from './utils/workTitleGenerator';
import { createWorkItemStructure, openFileInEditor } from './fs/fileOperations';
import { WorkItemMetadata } from './types';

export function activate(context: vscode.ExtensionContext) {
  console.log('PAW Workflow extension is now active');

  const initializeCommand = vscode.commands.registerCommand(
    'paw.initializeWorkItem',
    async () => {
      try {
        // Verify workspace is available
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          vscode.window.showErrorMessage(
            'PAW: No workspace folder open. Please open a folder containing a git repository.'
          );
          return;
        }
        
        const workspacePath = workspaceFolder.uri.fsPath;
        
        // Validate git repository
        await validateGitRepository(workspacePath);
        
        // Validate clean working directory
        await validateCleanWorkingDirectory(workspacePath);
        
        // Get git remotes
        const remotes = await getGitRemotes(workspacePath);
        if (remotes.length === 0) {
          vscode.window.showErrorMessage(
            'PAW: No git remotes found. Please add a remote with "git remote add origin <url>"'
          );
          return;
        }
        
        // Collect user inputs
        const inputs = await collectWorkItemInputs(remotes);
        if (!inputs) {
          return; // User cancelled
        }
        
        // Generate unique feature slug
        const { slug: featureSlug, wasAdjusted } = await generateUniqueSlug(
          workspaceFolder.uri,
          inputs.targetBranch
        );
        
        if (wasAdjusted) {
          vscode.window.showInformationMessage(
            `Feature slug adjusted to "${featureSlug}" to avoid conflict.`
          );
        }
        
        // Generate Work Title (will be enhanced in Phase 5 with GitHub integration)
        const workTitle = generateWorkTitle(inputs.targetBranch);
        
        // Create metadata object
        const metadata: WorkItemMetadata = {
          workTitle,
          featureSlug,
          targetBranch: inputs.targetBranch,
          githubIssue: inputs.githubIssueUrl || 'none',
          remote: inputs.remote,
          artifactPaths: 'auto-derived',
          additionalInputs: 'none'
        };
        
        // Create work item directory structure
        const workflowContextPath = await createWorkItemStructure(
          workspaceFolder.uri,
          metadata
        );
        
        // Create and checkout target branch
        await prepareTargetBranch(workspacePath, inputs.targetBranch);
        
        // Open WorkflowContext.md for review
        await openFileInEditor(workflowContextPath);
        
        vscode.window.showInformationMessage(
          `PAW work item initialized successfully at .paw/work/${featureSlug}/`
        );
        
      } catch (error) {
        vscode.window.showErrorMessage(
          `PAW: Initialization failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  context.subscriptions.push(initializeCommand);
}

export function deactivate() {}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] No linting errors: `npm run lint`
- [ ] Git operations module passes type checking

#### Manual Verification:
- [ ] Running command in non-git workspace shows error: "Workspace is not a git repository"
- [ ] With uncommitted changes, command shows error: "You have uncommitted changes"
- [ ] With clean working directory, command proceeds to input collection
- [ ] If target branch doesn't exist, it is created successfully
- [ ] If target branch exists, user is prompted with two options
- [ ] Choosing "Checkout existing branch" switches to that branch
- [ ] Choosing "Choose different name" cancels the command
- [ ] After successful initialization, correct branch is checked out (verify with `git branch --show-current`)
- [ ] Info message shows successful initialization with correct feature slug path
- [ ] WorkflowContext.md opens in editor automatically

---

## Phase 5: GitHub MCP Integration

### Overview
Integrate GitHub MCP tools to fetch issue metadata when a GitHub issue URL is provided. This phase enhances Work Title generation by using the actual issue title instead of deriving it from the branch name.

### Changes Required:

#### 1. GitHub Client Module

**File**: `paw-vscode-extension/src/github/githubClient.ts`
**Changes**: Create GitHub MCP tool integration

```typescript
import * as vscode from 'vscode';
import { GitHubIssue } from '../types';

/**
 * Parses a GitHub issue URL into owner, repo, and issue number
 */
export function parseGitHubIssueUrl(url: string): {
  owner: string;
  repo: string;
  issueNumber: number;
} | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) {
    return null;
  }
  
  const [, owner, repo, issueNumberStr] = match;
  return {
    owner,
    repo,
    issueNumber: parseInt(issueNumberStr, 10)
  };
}

/**
 * Fetches GitHub issue metadata using MCP tools
 */
export async function fetchGitHubIssue(
  issueUrl: string,
  cancellationToken: vscode.CancellationToken
): Promise<GitHubIssue | null> {
  const parsed = parseGitHubIssueUrl(issueUrl);
  if (!parsed) {
    return null;
  }
  
  try {
    // Invoke GitHub MCP tool to get issue details
    const result = await vscode.lm.invokeTool(
      'mcp_github_issue_read',
      {
        parameters: {
          method: 'get',
          owner: parsed.owner,
          repo: parsed.repo,
          issue_number: parsed.issueNumber
        }
      },
      cancellationToken
    );
    
    // Parse the result to extract issue title
    // Note: MCP tool returns JSON-like structure
    if (result && typeof result === 'object') {
      const issueData = result as any;
      return {
        title: issueData.title || '',
        number: parsed.issueNumber,
        url: issueUrl
      };
    }
    
    return null;
  } catch (error) {
    // MCP tool not available or network error
    console.error('Failed to fetch GitHub issue:', error);
    return null;
  }
}

/**
 * Generates Work Title from GitHub issue title
 * Extracts 2-4 significant words from the title
 */
export function generateWorkTitleFromIssue(issueTitle: string): string {
  // Remove common prefixes and noise words
  let cleaned = issueTitle
    .replace(/^(Feature|Bug|Bugfix|Hotfix|Chore|Task|Issue):/i, '')
    .replace(/\[.*?\]/g, '') // Remove [tags]
    .trim();
  
  // Split into words and filter out common words
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
  const words = cleaned
    .split(/\s+/)
    .filter(word => word.length > 0 && !stopWords.has(word.toLowerCase()))
    .slice(0, 4);
  
  // Capitalize each word
  const titleWords = words.map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
  
  return titleWords.join(' ') || 'Work Item';
}
```

#### 2. Update Work Title Generation Logic

**File**: `paw-vscode-extension/src/utils/workTitleGenerator.ts`
**Changes**: Export Work Title generation for reuse

```typescript
/**
 * Generates a 2-4 word Work Title from a branch name
 * Examples:
 *   feature/add-user-auth -> Add User Auth
 *   bugfix/fix-login-error -> Fix Login Error
 *   user/rde/improve-perf -> Improve Perf
 */
export function generateWorkTitleFromBranch(branchName: string): string {
  // Remove common prefixes
  let cleaned = branchName
    .replace(/^(feature|bugfix|hotfix|chore|user\/[^\/]+)\//i, '');
  
  // Split on hyphens, underscores, slashes
  const words = cleaned
    .split(/[-_\/]+/)
    .filter(word => word.length > 0)
    .slice(0, 4); // Take first 4 words max
  
  // Capitalize each word
  const titleWords = words.map(word =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
  
  return titleWords.join(' ') || 'Work Item';
}

// Re-export for backwards compatibility
export const generateWorkTitle = generateWorkTitleFromBranch;
```

#### 3. Update Extension Command Handler with GitHub Integration

**File**: `paw-vscode-extension/src/extension.ts`
**Changes**: Integrate GitHub issue fetching into initialization flow

```typescript
import * as vscode from 'vscode';
import { collectWorkItemInputs } from './ui/userInput';
import { getGitRemotes } from './git/gitOperations';
import {
  validateGitRepository,
  validateCleanWorkingDirectory,
  prepareTargetBranch
} from './git/gitValidation';
import { generateUniqueSlug } from './utils/slugify';
import { generateWorkTitleFromBranch } from './utils/workTitleGenerator';
import { createWorkItemStructure, openFileInEditor } from './fs/fileOperations';
import {
  fetchGitHubIssue,
  generateWorkTitleFromIssue
} from './github/githubClient';
import { WorkItemMetadata } from './types';

export function activate(context: vscode.ExtensionContext) {
  console.log('PAW Workflow extension is now active');

  const initializeCommand = vscode.commands.registerCommand(
    'paw.initializeWorkItem',
    async () => {
      try {
        // Verify workspace is available
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          vscode.window.showErrorMessage(
            'PAW: No workspace folder open. Please open a folder containing a git repository.'
          );
          return;
        }
        
        const workspacePath = workspaceFolder.uri.fsPath;
        
        // Validate git repository
        await validateGitRepository(workspacePath);
        
        // Validate clean working directory
        await validateCleanWorkingDirectory(workspacePath);
        
        // Get git remotes
        const remotes = await getGitRemotes(workspacePath);
        if (remotes.length === 0) {
          vscode.window.showErrorMessage(
            'PAW: No git remotes found. Please add a remote with "git remote add origin <url>"'
          );
          return;
        }
        
        // Collect user inputs
        const inputs = await collectWorkItemInputs(remotes);
        if (!inputs) {
          return; // User cancelled
        }
        
        // Generate unique feature slug
        const { slug: featureSlug, wasAdjusted } = await generateUniqueSlug(
          workspaceFolder.uri,
          inputs.targetBranch
        );
        
        if (wasAdjusted) {
          vscode.window.showInformationMessage(
            `Feature slug adjusted to "${featureSlug}" to avoid conflict.`
          );
        }
        
        // Generate Work Title from GitHub issue if URL provided
        let workTitle = generateWorkTitleFromBranch(inputs.targetBranch);
        
        if (inputs.githubIssueUrl) {
          const cancellationTokenSource = new vscode.CancellationTokenSource();
          try {
            const issue = await fetchGitHubIssue(
              inputs.githubIssueUrl,
              cancellationTokenSource.token
            );
            
            if (issue) {
              workTitle = generateWorkTitleFromIssue(issue.title);
              vscode.window.showInformationMessage(
                `Fetched issue title: "${issue.title}"`
              );
            } else {
              vscode.window.showWarningMessage(
                'Could not fetch GitHub issue. Using branch name for Work Title.'
              );
            }
          } catch (error) {
            vscode.window.showWarningMessage(
              `Failed to fetch GitHub issue: ${error instanceof Error ? error.message : 'Unknown error'}. Using branch name for Work Title.`
            );
          } finally {
            cancellationTokenSource.dispose();
          }
        }
        
        // Create metadata object
        const metadata: WorkItemMetadata = {
          workTitle,
          featureSlug,
          targetBranch: inputs.targetBranch,
          githubIssue: inputs.githubIssueUrl || 'none',
          remote: inputs.remote,
          artifactPaths: 'auto-derived',
          additionalInputs: 'none'
        };
        
        // Create work item directory structure
        const workflowContextPath = await createWorkItemStructure(
          workspaceFolder.uri,
          metadata
        );
        
        // Create and checkout target branch
        await prepareTargetBranch(workspacePath, inputs.targetBranch);
        
        // Open WorkflowContext.md for review
        await openFileInEditor(workflowContextPath);
        
        vscode.window.showInformationMessage(
          `PAW work item initialized successfully at .paw/work/${featureSlug}/`
        );
        
      } catch (error) {
        vscode.window.showErrorMessage(
          `PAW: Initialization failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  );

  context.subscriptions.push(initializeCommand);
}

export function deactivate() {}
```

### Success Criteria:

#### Automated Verification:
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] No linting errors: `npm run lint`
- [ ] GitHub URL parsing correctly extracts owner, repo, and issue number

#### Manual Verification:
- [ ] Providing valid GitHub issue URL fetches issue title successfully
- [ ] Work Title is generated from issue title (e.g., "Feature: Add User Authentication" -> "Add User Authentication")
- [ ] Info message displays fetched issue title
- [ ] Providing invalid GitHub issue URL shows warning but continues initialization
- [ ] When GitHub MCP tools unavailable, warning is shown and fallback Work Title from branch name is used
- [ ] Network errors during issue fetch are handled gracefully with warning message
- [ ] Without GitHub issue URL, Work Title is generated from branch name as before
- [ ] WorkflowContext.md contains Work Title derived from issue when provided
- [ ] WorkflowContext.md contains GitHub Issue URL in the correct field

---

## Phase 6: Testing and Packaging

### Overview
Create comprehensive test suite for unit and integration testing, add extension packaging configuration, complete marketplace metadata, and document publishing process. This phase ensures quality and prepares the extension for distribution.

### Changes Required:

#### 1. Unit Tests for Core Utilities

**File**: `paw-vscode-extension/src/test/suite/slugify.test.ts`
**Changes**: Create tests for slug normalization and validation

```typescript
import * as assert from 'assert';
import { normalizeFeatureSlug, isReservedSlug } from '../../utils/slugify';

suite('Slug Normalization Tests', () => {
  test('Normalizes simple branch name', () => {
    assert.strictEqual(
      normalizeFeatureSlug('feature/add-auth'),
      'feature-add-auth'
    );
  });
  
  test('Converts to lowercase', () => {
    assert.strictEqual(
      normalizeFeatureSlug('Feature/Add-User-Auth'),
      'feature-add-user-auth'
    );
  });
  
  test('Replaces spaces with hyphens', () => {
    assert.strictEqual(
      normalizeFeatureSlug('my feature name'),
      'my-feature-name'
    );
  });
  
  test('Removes special characters', () => {
    assert.strictEqual(
      normalizeFeatureSlug('feature/add-auth!@#$%'),
      'feature-add-auth'
    );
  });
  
  test('Collapses consecutive hyphens', () => {
    assert.strictEqual(
      normalizeFeatureSlug('feature---add---auth'),
      'feature-add-auth'
    );
  });
  
  test('Trims leading and trailing hyphens', () => {
    assert.strictEqual(
      normalizeFeatureSlug('-feature-add-auth-'),
      'feature-add-auth'
    );
  });
  
  test('Truncates to 100 characters', () => {
    const longName = 'a'.repeat(150);
    const normalized = normalizeFeatureSlug(longName);
    assert.strictEqual(normalized.length, 100);
  });
  
  test('Handles empty string after normalization', () => {
    assert.strictEqual(normalizeFeatureSlug('!!!'), '');
  });
});

suite('Reserved Slug Validation Tests', () => {
  test('Detects reserved names', () => {
    assert.strictEqual(isReservedSlug('.'), true);
    assert.strictEqual(isReservedSlug('..'), true);
    assert.strictEqual(isReservedSlug('node_modules'), true);
    assert.strictEqual(isReservedSlug('.git'), true);
    assert.strictEqual(isReservedSlug('.paw'), true);
  });
  
  test('Allows non-reserved names', () => {
    assert.strictEqual(isReservedSlug('feature-auth'), false);
    assert.strictEqual(isReservedSlug('my-feature'), false);
  });
});
```

**File**: `paw-vscode-extension/src/test/suite/workTitleGenerator.test.ts`
**Changes**: Create tests for Work Title generation

```typescript
import * as assert from 'assert';
import { generateWorkTitleFromBranch } from '../../utils/workTitleGenerator';
import { generateWorkTitleFromIssue } from '../../github/githubClient';

suite('Work Title Generation Tests', () => {
  test('Generates title from simple branch', () => {
    assert.strictEqual(
      generateWorkTitleFromBranch('feature/add-auth'),
      'Add Auth'
    );
  });
  
  test('Removes feature prefix', () => {
    assert.strictEqual(
      generateWorkTitleFromBranch('feature/improve-performance'),
      'Improve Performance'
    );
  });
  
  test('Removes bugfix prefix', () => {
    assert.strictEqual(
      generateWorkTitleFromBranch('bugfix/fix-login-error'),
      'Fix Login Error'
    );
  });
  
  test('Limits to 4 words', () => {
    assert.strictEqual(
      generateWorkTitleFromBranch('feature/add-user-authentication-system-module'),
      'Add User Authentication System'
    );
  });
  
  test('Capitalizes words', () => {
    assert.strictEqual(
      generateWorkTitleFromBranch('feature/api-refactor'),
      'Api Refactor'
    );
  });
  
  test('Generates title from GitHub issue', () => {
    assert.strictEqual(
      generateWorkTitleFromIssue('Feature: Add User Authentication'),
      'Add User Authentication'
    );
  });
  
  test('Removes common prefixes from issue title', () => {
    assert.strictEqual(
      generateWorkTitleFromIssue('Bug: Fix login error'),
      'Fix Login Error'
    );
  });
  
  test('Filters stop words from issue title', () => {
    assert.strictEqual(
      generateWorkTitleFromIssue('Add the user authentication for the system'),
      'Add User Authentication System'
    );
  });
});
```

**File**: `paw-vscode-extension/src/test/suite/githubClient.test.ts`
**Changes**: Create tests for GitHub URL parsing

```typescript
import * as assert from 'assert';
import { parseGitHubIssueUrl } from '../../github/githubClient';

suite('GitHub URL Parsing Tests', () => {
  test('Parses valid GitHub issue URL', () => {
    const result = parseGitHubIssueUrl('https://github.com/owner/repo/issues/123');
    assert.deepStrictEqual(result, {
      owner: 'owner',
      repo: 'repo',
      issueNumber: 123
    });
  });
  
  test('Returns null for invalid URL', () => {
    assert.strictEqual(parseGitHubIssueUrl('https://example.com'), null);
  });
  
  test('Returns null for malformed GitHub URL', () => {
    assert.strictEqual(
      parseGitHubIssueUrl('https://github.com/owner/repo/pull/123'),
      null
    );
  });
});
```

#### 2. Test Runner Configuration

**File**: `paw-vscode-extension/src/test/runTest.ts`
**Changes**: Create test runner entry point

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
    await runTests({ extensionDevelopmentPath, extensionTestsPath });
  } catch (err) {
    console.error('Failed to run tests:', err);
    process.exit(1);
  }
}

main();
```

**File**: `paw-vscode-extension/src/test/suite/index.ts`
**Changes**: Create test suite index

```typescript
import * as path from 'path';
import * as Mocha from 'mocha';
import { glob } from 'glob';

export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  });
  
  const testsRoot = path.resolve(__dirname, '.');
  
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

#### 3. Additional Package Dependencies

**File**: `paw-vscode-extension/package.json`
**Changes**: Add test dependencies

```json
{
  "devDependencies": {
    "@types/mocha": "^10.0.3",
    "@types/node": "^18.x",
    "@types/vscode": "^1.85.0",
    "@typescript-eslint/eslint-plugin": "^6.7.0",
    "@typescript-eslint/parser": "^6.7.0",
    "@vscode/test-electron": "^2.3.4",
    "@vscode/vsce": "^2.22.0",
    "eslint": "^8.50.0",
    "glob": "^10.3.10",
    "mocha": "^10.2.0",
    "typescript": "^5.2.2"
  }
}
```

#### 4. Extension Icon and Branding

**File**: `paw-vscode-extension/icon.png`
**Changes**: Add 128x128px extension icon
(Create a simple icon with "PAW" text or paw print symbol)

**File**: `paw-vscode-extension/CHANGELOG.md`
**Changes**: Create changelog

```markdown
# Change Log

All notable changes to the "paw-workflow" extension will be documented in this file.

## [0.1.0] - 2025-10-27

### Added
- Initial release
- `PAW: Initialize Work Item` command for automated work item setup
- Automatic directory structure creation (`.paw/work/<feature-slug>/`)
- WorkflowContext.md generation with all required fields
- 9 prompt template files for PAW workflow stages
- Git branch creation and checkout
- GitHub issue integration for Work Title generation
- Feature slug normalization and uniqueness validation
- Clean error handling with user-friendly messages
```

#### 5. VSCode Extension Configuration

**File**: `paw-vscode-extension/.vscode/launch.json`
**Changes**: Create debug configuration

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}"
      ],
      "outFiles": [
        "${workspaceFolder}/out/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    },
    {
      "name": "Extension Tests",
      "type": "extensionHost",
      "request": "launch",
      "args": [
        "--extensionDevelopmentPath=${workspaceFolder}",
        "--extensionTestsPath=${workspaceFolder}/out/test/suite/index"
      ],
      "outFiles": [
        "${workspaceFolder}/out/test/**/*.js"
      ],
      "preLaunchTask": "${defaultBuildTask}"
    }
  ]
}
```

**File**: `paw-vscode-extension/.vscode/tasks.json`
**Changes**: Create build tasks

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "type": "npm",
      "script": "watch",
      "problemMatcher": "$tsc-watch",
      "isBackground": true,
      "presentation": {
        "reveal": "never"
      },
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
```

#### 6. Publishing Documentation

**File**: `paw-vscode-extension/PUBLISHING.md`
**Changes**: Create publishing guide

```markdown
# Publishing the PAW Workflow Extension

## Prerequisites

1. Install vsce globally: `npm install -g @vscode/vsce`
2. Create a publisher account at https://marketplace.visualstudio.com/manage
3. Generate a Personal Access Token (PAT) from Azure DevOps

## Local Testing

1. Build the extension: `npm run compile`
2. Run tests: `npm test`
3. Package the extension: `npm run package`
4. Install locally: `code --install-extension paw-workflow-0.1.0.vsix`

## Publishing Steps

1. Update version in package.json
2. Update CHANGELOG.md with release notes
3. Ensure README.md is complete
4. Build and test: `npm run compile && npm test`
5. Login to publisher account: `vsce login <publisher>`
6. Publish: `vsce publish`

## Version Bumping

- Patch release: `vsce publish patch` (0.1.0 -> 0.1.1)
- Minor release: `vsce publish minor` (0.1.0 -> 0.2.0)
- Major release: `vsce publish major` (0.1.0 -> 1.0.0)

## Verification

After publishing, verify:
- Extension appears in VS Code Marketplace
- README displays correctly
- Icon shows properly
- Installation works: `code --install-extension paw.paw-workflow`
```

### Success Criteria:

#### Automated Verification:
- [ ] All unit tests pass: `npm test`
- [ ] TypeScript compilation succeeds: `npm run compile`
- [ ] Linting passes: `npm run lint`
- [ ] Extension packages successfully: `npm run package` (creates .vsix)
- [ ] Package size is reasonable (<500KB)
- [ ] No security vulnerabilities: `npm audit`

#### Manual Verification:
- [ ] Extension loads in debug mode (F5) without errors
- [ ] All unit tests for slug normalization pass
- [ ] All unit tests for Work Title generation pass
- [ ] All unit tests for GitHub URL parsing pass
- [ ] Extension can be installed from .vsix file
- [ ] README.md displays correctly in marketplace preview
- [ ] CHANGELOG.md lists all features accurately
- [ ] Icon appears in extensions view
- [ ] Running end-to-end initialization creates all expected files and directories
- [ ] Manual testing covers all error scenarios (uncommitted changes, invalid inputs, etc.)

---

## Testing Strategy

### Unit Tests:
- Feature slug normalization (various inputs: spaces, special chars, length limits)
- Feature slug validation (reserved names, uniqueness checking)
- GitHub issue URL parsing
- Work Title generation from branch names and issue titles

### Integration Tests:
- End-to-end initialization flow with all user inputs
- File system operations (directory creation, file writing)
- Git operations (branch creation, checkout)
- Error handling scenarios (uncommitted changes, existing branches, permission errors)

### Manual Testing Steps:
1. Install extension from .vsix package in VS Code
2. Open workspace with git repository
3. Run "PAW: Initialize Work Item" command
4. Provide branch name "feature/test-auth"
5. Verify `.paw/work/feature-test-auth/` directory created
6. Verify WorkflowContext.md contains correct values
7. Verify all 9 prompt template files created with correct frontmatter
8. Verify git branch created and checked out
9. Test error cases: uncommitted changes, existing branch, invalid branch name

## Performance Considerations

- File operations use asynchronous APIs to avoid blocking UI
- Git commands execute with timeout protection (5 second default)
- GitHub issue fetching is optional and non-blocking (warns on failure)
- Extension activation is lazy (only when command invoked)
- Minimal dependencies to keep extension size small (<500KB packaged)

## Migration Notes

Not applicable - this is a new extension with no existing users or data to migrate.

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/35
- Spec: `.paw/work/vscode-extension-init/Spec.md`
- Spec Research: `.paw/work/vscode-extension-init/SpecResearch.md`
- Code Research: `.paw/work/vscode-extension-init/CodeResearch.md`
- Existing prompt templates: `.paw/work/paw-directory/prompts/`
- VS Code Extension API: https://code.visualstudio.com/api
- VS Code Language Model API: https://code.visualstudio.com/api/extension-guides/language-model
