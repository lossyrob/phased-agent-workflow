---
date: 2025-10-27 15:30:34 EDT
git_commit: f2a1747df27400dad28c39e85efbd9c0a08bf93a
branch: feature/vscode-extension-init
repository: phased-agent-workflow-2
topic: "VS Code Extension Development - PAW Initializer Implementation"
tags: [research, codebase, vscode-extension, typescript, git-integration, mcp-tools]
status: complete
last_updated: 2025-10-27
---

# Research: VS Code Extension Development - PAW Initializer Implementation

**Date**: 2025-10-27 15:30:34 EDT
**Git Commit**: f2a1747df27400dad28c39e85efbd9c0a08bf93a
**Branch**: feature/vscode-extension-init
**Repository**: phased-agent-workflow-2

## Research Question

How should a VS Code extension be structured and implemented to provide:
1. Command palette integration for PAW work item initialization
2. User input collection via VS Code UI APIs
3. File system operations for creating work item directories and files
4. Git operations for branch creation and checkout
5. GitHub MCP tool integration for fetching issue metadata
6. Proper packaging and publishing to VS Code Marketplace

This research provides implementation-level documentation for building the PAW Initializer VS Code extension as specified in the Spec.md.

## Summary

VS Code extensions are TypeScript/JavaScript Node.js modules that integrate with VS Code through the `vscode` extensibility API. The extension lifecycle begins with an `activate()` function that registers commands and sets up resources. Commands are declared in `package.json` and implemented using `vscode.commands.registerCommand()`. User input is collected through `vscode.window.showInputBox()` and `vscode.window.showQuickPick()` APIs. File operations use `vscode.workspace.fs` for cross-platform compatibility. Git operations are executed via Node.js `child_process` module spawning git CLI commands. GitHub data can be fetched using MCP tools via `vscode.lm.invokeTool()` API. Extensions are packaged with `vsce` tool and published to VS Code Marketplace with metadata in `package.json`.

## Detailed Findings

### Extension Structure and Activation

VS Code extensions follow a standard structure with TypeScript as the primary development language:

**Core Components:**
- `package.json` - Extension manifest with metadata, activation events, and contribution points
- `src/extension.ts` - Main entry point containing `activate()` and `deactivate()` functions
- `tsconfig.json` - TypeScript compiler configuration
- `.vscodeignore` - Files to exclude from packaged extension
- `README.md` - Marketplace documentation
- `LICENSE` - License information

**Activation Pattern:**
```typescript
// From VS Code API documentation
import * as vscode from 'vscode';

// Activated when extension is first needed
export function activate(context: vscode.ExtensionContext) {
  console.log('Extension is now active!');
  
  // Register commands and add to subscriptions for cleanup
  let disposable = vscode.commands.registerCommand('extension.commandId', () => {
    // Command implementation
  });
  
  context.subscriptions.push(disposable);
}

// Called when extension is deactivated
export function deactivate() {}
```

**package.json Activation Events:**
```json
{
  "activationEvents": [],  // Modern: empty array means activate on any command
  "contributes": {
    "commands": [
      {
        "command": "extension.commandId",
        "title": "Command Title",
        "category": "Extension Name"
      }
    ]
  }
}
```

The extension activates when VS Code starts or when a contributed command is first invoked. Modern extensions use empty `activationEvents` array to activate on-demand when any contributed command is used.

### Command Registration and User Input

**Command Registration Pattern:**
Commands declared in `package.json` must be implemented in the activate function:

```typescript
// From VS Code API documentation
export function activate(context: vscode.ExtensionContext) {
  const commandHandler = (name: string = 'world') => {
    console.log(`Hello ${name}!!!`);
  };
  
  context.subscriptions.push(
    vscode.commands.registerCommand('myExtension.sayHello', commandHandler)
  );
}
```

**Input Box for Text Input:**
The `window.showInputBox()` API collects single-line text input with validation:

```typescript
// From vscode.d.ts API reference
interface InputBox {
  value: string;
  placeholder: string | undefined;  // Placeholder text shown when empty
  prompt: string | undefined;       // Explanation text above input
  password: boolean;                // Hide input characters
  validationMessage: string | InputBoxValidationMessage | undefined;
  readonly onDidChangeValue: Event<string>;
  readonly onDidAccept: Event<void>;
}
```

**Quick Pick for Selection:**
The `window.showQuickPick()` API displays a selection list:

```typescript
// From vscode.d.ts API reference  
interface QuickPickOptions {
  placeHolder?: string;  // Guide text in input box
}

interface QuickPick {
  placeholder: string | undefined;
}
```

**Usage Pattern:**
```typescript
// Collecting branch name
const branchName = await vscode.window.showInputBox({
  prompt: 'Enter target branch name',
  placeHolder: 'feature/my-feature',
  validateInput: (value) => {
    if (!value) return 'Branch name is required';
    if (!/^[a-zA-Z0-9/_-]+$/.test(value)) return 'Invalid branch name';
    return null;
  }
});

// Selecting from options
const remote = await vscode.window.showQuickPick(
  ['origin', 'upstream', 'fork'],
  { placeHolder: 'Select git remote' }
);
```

### File System Operations

VS Code provides the `workspace.fs` API for cross-platform file operations:

**Creating Directories:**
```typescript
// From vscode.d.ts API reference
interface FileSystem {
  /**
   * Create a new directory (Note, that new files are created via `write`-calls).
   * Note that missing directories are created automatically, e.g this call has
   * `mkdirp` semantics.
   */
  createDirectory(uri: Uri): Thenable<void>;
}

// workspace.fs is the file system instance
const fs: FileSystem;
```

**Implementation Pattern:**
```typescript
import * as vscode from 'vscode';
import * as path from 'path';

// Get workspace root
const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;
if (!workspaceRoot) {
  throw new Error('No workspace folder open');
}

// Create directory with automatic parent creation
const workItemPath = vscode.Uri.joinPath(
  workspaceRoot, 
  '.paw', 
  'work', 
  featureSlug
);
await vscode.workspace.fs.createDirectory(workItemPath);

// Create prompts subdirectory
const promptsPath = vscode.Uri.joinPath(workItemPath, 'prompts');
await vscode.workspace.fs.createDirectory(promptsPath);

// Write file
const fileContent = Buffer.from('# WorkflowContext\n\n...', 'utf8');
const filePath = vscode.Uri.joinPath(workItemPath, 'WorkflowContext.md');
await vscode.workspace.fs.writeFile(filePath, fileContent);

// Open file in editor
const doc = await vscode.workspace.openTextDocument(filePath);
await vscode.window.showTextDocument(doc);
```

The `workspace.fs` API uses `Uri` objects instead of file paths for cross-platform compatibility. The `joinPath()` function constructs paths safely across operating systems.

### Git Integration

Git operations are executed via Node.js `child_process` module since VS Code doesn't provide a built-in Git API for extensions:

**Executing Git Commands:**
```typescript
// From Node.js child_process documentation
import { exec, spawn, execSync } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Check for uncommitted changes
async function hasUncommittedChanges(cwd: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd });
    return stdout.trim().length > 0;
  } catch (error) {
    throw new Error(`Git status failed: ${error.message}`);
  }
}

// Get list of remotes
async function getGitRemotes(cwd: string): Promise<string[]> {
  const { stdout } = await execAsync('git remote', { cwd });
  return stdout.trim().split('\n').filter(r => r.length > 0);
}

// Create and checkout branch
async function createAndCheckoutBranch(
  branchName: string, 
  cwd: string
): Promise<void> {
  // Check if branch exists
  try {
    await execAsync(`git rev-parse --verify ${branchName}`, { cwd });
    // Branch exists, ask user
    const action = await vscode.window.showQuickPick(
      ['Checkout existing branch', 'Choose different name'],
      { placeHolder: `Branch '${branchName}' already exists` }
    );
    if (action === 'Checkout existing branch') {
      await execAsync(`git checkout ${branchName}`, { cwd });
    } else {
      throw new Error('Branch already exists');
    }
  } catch {
    // Branch doesn't exist, create it
    await execAsync(`git checkout -b ${branchName}`, { cwd });
  }
}

// Get current branch
async function getCurrentBranch(cwd: string): Promise<string> {
  const { stdout } = await execAsync('git branch --show-current', { cwd });
  return stdout.trim();
}
```

**Error Handling Pattern:**
```typescript
// From Node.js child_process examples
const { stderr, stdout, status } = childProcess.spawnSync('git', ['status']);
if (status !== 0) {
  const errorText = stderr.toString();
  throw new Error(`Git command failed: ${errorText}`);
}
```

Git operations should validate repository state before making changes and provide clear error messages when operations fail.

### GitHub MCP Tool Integration

VS Code extensions can invoke MCP tools (including GitHub tools) using the Language Model API:

**Tool Discovery and Invocation:**
```typescript
// From vscode.lm API documentation and Roo-Code implementation
import * as vscode from 'vscode';

// Discover available tools
const tools = vscode.lm.tools;  // Array of LanguageModelToolInformation

// Invoke a tool
async function callGitHubMCPTool(
  toolName: string, 
  parameters: any, 
  token: vscode.CancellationToken
): Promise<any> {
  try {
    const result = await vscode.lm.invokeTool(
      toolName,
      { parameters },
      token
    );
    return result;
  } catch (error) {
    throw new Error(`Failed to invoke MCP tool: ${error.message}`);
  }
}

// Example: Fetch GitHub issue
async function fetchGitHubIssue(issueUrl: string): Promise<any> {
  // Parse issue URL: https://github.com/owner/repo/issues/123
  const match = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
  if (!match) {
    throw new Error('Invalid GitHub issue URL');
  }
  
  const [, owner, repo, issueNumber] = match;
  
  // Call GitHub MCP tool
  const result = await callGitHubMCPTool(
    'mcp_github_issue_read',
    {
      method: 'get',
      owner,
      repo,
      issue_number: parseInt(issueNumber)
    },
    new vscode.CancellationTokenSource().token
  );
  
  return result;
}
```

**Integration with Extension:**
MCP tools are invoked asynchronously and require a cancellation token. The extension can use GitHub MCP tools to fetch issue titles and metadata without implementing GitHub API authentication directly.

**Pattern from Roo-Code Extension:**
```typescript
// Tool discovery pattern
const vsCodeTools = vscode.lm.tools;  // Get all available tools
const githubTools = vsCodeTools.filter(t => t.name.startsWith('mcp_github_'));

// Monitor for tool changes
vscode.extensions.onDidChange(() => {
  // Re-fetch available tools when extensions change
});
```

### Extension Packaging and Publishing

**package.json Requirements:**
```json
{
  "name": "extension-name",
  "displayName": "Display Name",
  "description": "Extension description",
  "version": "0.0.1",
  "publisher": "publisher-id",
  "repository": "https://github.com/user/repo",
  "engines": {
    "vscode": "^1.51.0"
  },
  "categories": ["Other"],
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": []
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/node": "^8.10.25",
    "@types/vscode": "^1.51.0",
    "typescript": "^3.4.5"
  }
}
```

**Key Fields:**
- `name` - Extension identifier (lowercase, no spaces)
- `displayName` - User-friendly name shown in Marketplace
- `publisher` - Publisher ID (must be registered)
- `engines.vscode` - Minimum VS Code version (^1.X.0 for compatibility)
- `categories` - Marketplace categories for discovery
- `icon` - Path to 128x128px PNG icon
- `repository` - GitHub URL for source code
- `license` - License identifier (e.g., "MIT")

**Packaging with vsce:**
```bash
# Install vsce globally
npm install -g @vscode/vsce

# Package extension
cd extension-directory
vsce package
# Creates extension-name-0.0.1.vsix

# Install locally for testing
code --install-extension extension-name-0.0.1.vsix
```

**Publishing to Marketplace:**
```bash
# Create publisher (one-time)
vsce create-publisher publisher-id

# Login with Personal Access Token from Azure DevOps
vsce login publisher-id

# Publish extension
vsce publish
# Or publish with version bump
vsce publish patch  # 0.0.1 -> 0.0.2
vsce publish minor  # 0.1.0 -> 0.2.0
vsce publish major  # 1.0.0 -> 2.0.0
```

**Marketplace Integration:**
- `README.md` - Shown on extension page
- `CHANGELOG.md` - Version history
- `LICENSE` - License information
- `.vscodeignore` - Exclude files from package (e.g., `**/*.ts`, `**/tsconfig.json`)

**Pre-publish Script:**
The `vscode:prepublish` script runs before packaging to compile TypeScript:
```json
{
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "tsc -p ./"
  }
}
```

### TypeScript Project Structure

**Standard Extension Layout:**
```
extension-root/
├── src/
│   └── extension.ts          # Main entry point
├── out/                       # Compiled JavaScript (gitignored)
│   └── extension.js
├── package.json               # Extension manifest
├── tsconfig.json              # TypeScript config
├── .vscodeignore              # Package exclusions
├── README.md                  # Marketplace documentation
├── LICENSE                    # License file
├── CHANGELOG.md               # Version history
└── node_modules/              # Dependencies (gitignored)
```

**tsconfig.json:**
```json
{
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2020",
    "outDir": "out",
    "lib": ["ES2020"],
    "sourceMap": true,
    "rootDir": "src",
    "strict": true
  },
  "exclude": ["node_modules", ".vscode-test"]
}
```

**.vscodeignore:**
```
**/*.ts
**/tsconfig.json
**/.eslintrc.json
**/*.map
.gitignore
.vscode/**
src/**
node_modules/**
!node_modules/production-dependency/**
```

## Code References

Since this is a greenfield project with no existing implementation, code references are from:
- VS Code Extension API documentation (https://code.visualstudio.com/api)
- VS Code API TypeScript definitions (vscode.d.ts)
- Node.js child_process module documentation
- Third-party extension examples (Roo-Code GitHub issue #3811)
- VS Code publishing documentation

## Architecture Documentation

**Recommended Implementation Architecture:**

1. **Main Extension Module** (`src/extension.ts`)
   - Exports `activate()` and `deactivate()` functions
   - Registers commands in activate function
   - Stores disposables in `context.subscriptions`

2. **Command Handler Module** (`src/commands/initializeWorkItem.ts`)
   - Implements PAW initialization logic
   - Coordinates user input collection
   - Orchestrates file creation and git operations

3. **User Input Module** (`src/ui/userInput.ts`)
   - Collects branch name via `showInputBox()`
   - Collects GitHub issue URL via `showInputBox()`
   - Selects remote via `showQuickPick()` when multiple exist

4. **Git Operations Module** (`src/git/gitOperations.ts`)
   - Executes git commands via `child_process`
   - Validates repository state
   - Creates and checks out branches

5. **GitHub Integration Module** (`src/github/githubClient.ts`)
   - Invokes GitHub MCP tools via `vscode.lm.invokeTool()`
   - Fetches issue metadata
   - Handles network errors gracefully

6. **File System Module** (`src/fs/fileOperations.ts`)
   - Creates directory structure via `workspace.fs`
   - Generates WorkflowContext.md content
   - Creates prompt template files
   - Opens files in editor

7. **Utilities Module** (`src/utils/slugify.ts`)
   - Normalizes feature slugs
   - Validates slug uniqueness
   - Rejects reserved names

**Data Flow:**
1. User invokes "PAW: Initialize Work Item" command
2. Extension collects user input (branch, issue URL, remote)
3. Extension validates git repository state
4. Extension generates feature slug from branch name
5. Extension fetches GitHub issue metadata if URL provided
6. Extension creates `.paw/work/<slug>/` directory structure
7. Extension creates WorkflowContext.md with metadata
8. Extension creates prompt template files
9. Extension creates and checks out git branch
10. Extension opens WorkflowContext.md for review

**Error Handling Strategy:**
- Validate inputs before executing operations
- Check git repository state before branch operations
- Provide clear, actionable error messages
- Gracefully handle network failures for GitHub API
- Allow continuation when optional operations fail
- Display errors via `vscode.window.showErrorMessage()`

**Testing Considerations:**
- Unit tests for slug normalization and validation
- Integration tests for file system operations
- Mock git command execution for testing
- Mock MCP tool invocation for GitHub integration
- Test error handling paths

## Open Questions

None. All implementation questions have been answered through research of VS Code Extension API documentation, TypeScript/Node.js patterns, and third-party extension examples.

## External Resources Referenced

- **VS Code Extension API**: https://code.visualstudio.com/api
- **Language Model Tools API**: https://code.visualstudio.com/api/extension-guides/ai/tools
- **Publishing Extensions**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- **Node.js child_process**: Standard Node.js module for executing shell commands
- **Roo-Code MCP Integration**: GitHub issue #3811 documenting vscode.lm.invokeTool() usage pattern
- **VS Code Extension Samples**: https://github.com/microsoft/vscode-extension-samples
