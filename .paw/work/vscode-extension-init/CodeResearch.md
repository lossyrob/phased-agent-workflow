------

date: 2025-10-27 23:09:58 EDTdate: 2025-10-27 15:30:34 EDT

git_commit: c5e22f3b65c05283e83a09d462fa7550efd8aadbgit_commit: f2a1747df27400dad28c39e85efbd9c0a08bf93a

branch: feature/vscode-extension-initbranch: feature/vscode-extension-init

repository: phased-agent-workflow-2repository: phased-agent-workflow-2

topic: "VS Code Extension for PAW Work Item Initialization and Workflow Context Tool"topic: "VS Code Extension Development - PAW Initializer Implementation"

tags: [research, codebase, vscode-extension, paw-workflow, language-model-tools]tags: [research, codebase, vscode-extension, typescript, git-integration, mcp-tools]

status: completestatus: complete

last_updated: 2025-10-27last_updated: 2025-10-27

------



# Research: VS Code Extension for PAW Work Item Initialization and Workflow Context Tool# Research: VS Code Extension Development - PAW Initializer Implementation



**Date**: 2025-10-27 23:09:58 EDT**Date**: 2025-10-27 15:30:34 EDT

**Git Commit**: c5e22f3b65c05283e83a09d462fa7550efd8aadb**Git Commit**: f2a1747df27400dad28c39e85efbd9c0a08bf93a

**Branch**: feature/vscode-extension-init**Branch**: feature/vscode-extension-init

**Repository**: phased-agent-workflow-2**Repository**: phased-agent-workflow-2



## Research Question## Research Question



How do I create a VS Code extension that implements:How should a VS Code extension be structured and implemented to provide:

1. PAW work item initialization command (`PAW: Initialize Work Item`)1. Command palette integration for PAW work item initialization

2. Language model tool for workflow context (`paw_get_workflow_context`)2. User input collection via VS Code UI APIs

3. File system operations for creating work item directories and files

Based on GitHub Issue: https://github.com/lossyrob/phased-agent-workflow/issues/354. Git operations for branch creation and checkout

5. GitHub MCP tool integration for fetching issue metadata

## Summary6. Proper packaging and publishing to VS Code Marketplace



This research documents the implementation patterns for creating a VS Code extension for PAW. The extension has no existing TypeScript/JavaScript code in the repository - this is a greenfield implementation. Key findings include:This research provides implementation-level documentation for building the PAW Initializer VS Code extension as specified in the Spec.md.



- **PAW Directory Structure**: Work items exist in `.paw/work/<feature-slug>/` with specific file patterns (WorkflowContext.md, prompts/ directory)## Summary

- **Chatmode Files**: Located in `.github/chatmodes/` with YAML frontmatter and markdown content

- **Prompt Templates**: Nine standard templates (01A through 0X) with minimal frontmatter structureVS Code extensions are TypeScript/JavaScript Node.js modules that integrate with VS Code through the `vscode` extensibility API. The extension lifecycle begins with an `activate()` function that registers commands and sets up resources. Commands are declared in `package.json` and implemented using `vscode.commands.registerCommand()`. User input is collected through `vscode.window.showInputBox()` and `vscode.window.showQuickPick()` APIs. File operations use `vscode.workspace.fs` for cross-platform compatibility. Git operations are executed via Node.js `child_process` module spawning git CLI commands. GitHub data can be fetched using MCP tools via `vscode.lm.invokeTool()` API. Extensions are packaged with `vsce` tool and published to VS Code Marketplace with metadata in `package.json`.

- **VS Code Language Model Tools API**: New API using `vscode.lm.registerTool()` for agent integration

- **Command Registration**: Standard pattern using `vscode.commands.registerCommand()` with package.json contributions## Detailed Findings

- **User Input**: Collected via `vscode.window.showInputBox()` and `vscode.window.showQuickPick()`

### Extension Structure and Activation

The extension should use an **agent-driven architecture** where the extension gathers inputs and delegates file creation/git operations to GitHub Copilot agent mode via `vscode.commands.executeCommand("workbench.action.chat.open")`.

VS Code extensions follow a standard structure with TypeScript as the primary development language:

## Detailed Findings

**Core Components:**

### 1. PAW Directory Structure and Conventions- `package.json` - Extension manifest with metadata, activation events, and contribution points

- `src/extension.ts` - Main entry point containing `activate()` and `deactivate()` functions

#### Work Item Directory Layout- `tsconfig.json` - TypeScript compiler configuration

- `.vscodeignore` - Files to exclude from packaged extension

The canonical PAW work item structure is:- `README.md` - Marketplace documentation

- `LICENSE` - License information

```

.paw/work/<feature-slug>/**Activation Pattern:**

├── WorkflowContext.md          # Required: Parameters file```typescript

├── Spec.md                     # Created by Spec Agent// From VS Code API documentation

├── SpecResearch.md             # Created by Spec Research Agentimport * as vscode from 'vscode';

├── CodeResearch.md             # Created by Code Research Agent

├── ImplementationPlan.md       # Created by Implementation Plan Agent// Activated when extension is first needed

├── Docs.md                     # Created by Documenter Agentexport function activate(context: vscode.ExtensionContext) {

└── prompts/                    # Required: Prompt templates directory  console.log('Extension is now active!');

    ├── 01A-spec.prompt.md  

    ├── 01B-spec-research.prompt.md (or spec-research.prompt.md)  // Register commands and add to subscriptions for cleanup

    ├── 02A-code-research.prompt.md  let disposable = vscode.commands.registerCommand('extension.commandId', () => {

    ├── 02B-impl-plan.prompt.md    // Command implementation

    ├── 03A-implement.prompt.md  });

    ├── 03B-review.prompt.md  

    ├── 04-docs.prompt.md  context.subscriptions.push(disposable);

    ├── 05-pr.prompt.md}

    └── 0X-status.prompt.md

```// Called when extension is deactivated

export function deactivate() {}

**Evidence**:```

- `.paw/work/paw-directory/` demonstrates this structure

- `.paw/work/vscode-extension-init/` shows variation in naming**package.json Activation Events:**

- Both have WorkflowContext.md and prompts/ subdirectory```json

{

**File Purposes**:  "activationEvents": [],  // Modern: empty array means activate on any command

  "contributes": {

- **WorkflowContext.md** (`.paw/work/<slug>/WorkflowContext.md`):    "commands": [

  - Centralized parameter file for all PAW stages      {

  - Contains: Work Title, Feature Slug, Target Branch, GitHub Issue, Remote, Artifact Paths, Additional Inputs        "command": "extension.commandId",

  - Format documented in SpecResearch.md        "title": "Command Title",

        "category": "Extension Name"

- **prompts/** directory:      }

  - Contains 9 prompt template files for PAW agent invocation    ]

  - Each has YAML frontmatter with `mode` field  }

  - Minimal content referencing WorkflowContext.md}

```

**Naming Variations Observed**:

- `paw-directory/prompts/01A-create-spec.prompt.md` vs `vscode-extension-init/prompts/01A-spec.prompt.md`The extension activates when VS Code starts or when a contributed command is first invoked. Modern extensions use empty `activationEvents` array to activate on-demand when any contributed command is used.

- `paw-directory/prompts/01B-spec-research.prompt.md` vs `vscode-extension-init/prompts/spec-research.prompt.md`

- Both patterns valid; newer pattern appears more concise### Command Registration and User Input



#### WorkflowContext.md Format**Command Registration Pattern:**

Commands declared in `package.json` must be implemented in the activate function:

Example from `.paw/work/vscode-extension-init/WorkflowContext.md`:

```typescript

```markdown// From VS Code API documentation

# WorkflowContextexport function activate(context: vscode.ExtensionContext) {

  const commandHandler = (name: string = 'world') => {

Work Title: VS Code Extension Init    console.log(`Hello ${name}!!!`);

Feature Slug: vscode-extension-init  };

Target Branch: feature/vscode-extension-init  

GitHub Issue: https://github.com/lossyrob/phased-agent-workflow/issues/35  context.subscriptions.push(

Remote: origin    vscode.commands.registerCommand('myExtension.sayHello', commandHandler)

Artifact Paths: auto-derived  );

Additional Inputs: none}

``````



**Field Descriptions** (from SpecResearch.md):**Input Box for Text Input:**

- **Work Title**: 2-4 word descriptive name for PR prefixesThe `window.showInputBox()` API collects single-line text input with validation:

- **Feature Slug**: Normalized filesystem-safe identifier (lowercase, hyphens, 1-100 chars)

- **Target Branch**: Git branch for completed work```typescript

- **GitHub Issue**: Optional full issue URL// From vscode.d.ts API reference

- **Remote**: Git remote (defaults to "origin")interface InputBox {

- **Artifact Paths**: "auto-derived" or explicit paths  value: string;

- **Additional Inputs**: Comma-separated list or "none"  placeholder: string | undefined;  // Placeholder text shown when empty

  prompt: string | undefined;       // Explanation text above input

### 2. Prompt Template Structure and Content  password: boolean;                // Hide input characters

  validationMessage: string | InputBoxValidationMessage | undefined;

#### Example Prompt Files  readonly onDidChangeValue: Event<string>;

  readonly onDidAccept: Event<void>;

From `.paw/work/paw-directory/prompts/01A-create-spec.prompt.md`:}

```

```markdown

---**Quick Pick for Selection:**

mode: PAW-01A Spec AgentThe `window.showQuickPick()` API displays a selection list:

model: Claude Sonnet 4.5 (copilot)

---```typescript

// From vscode.d.ts API reference  

Create a spec from https://github.com/lossyrob/phased-agent-workflow/issues/19. The research was updated, ensure Spec is updated with any new findings.interface QuickPickOptions {

```  placeHolder?: string;  // Guide text in input box

}

From `.paw/work/paw-directory/prompts/02A-code-research.prompt.md`:

interface QuickPick {

```markdown  placeholder: string | undefined;

---}

mode: PAW-02A Code Researcher```

model: Claude Sonnet 4.5 (copilot)

---**Usage Pattern:**

```typescript

Conduct code research.// Collecting branch name

```const branchName = await vscode.window.showInputBox({

  prompt: 'Enter target branch name',

From `.paw/work/vscode-extension-init/prompts/spec-research.prompt.md`:  placeHolder: 'feature/my-feature',

  validateInput: (value) => {

```markdown    if (!value) return 'Branch name is required';

---    if (!/^[a-zA-Z0-9/_-]+$/.test(value)) return 'Invalid branch name';

mode: 'PAW-01B Spec Research Agent'    return null;

---  }

# Spec Research Prompt: VS Code Extension - PAW Work Item Initializer});



Perform research to answer the following questions...// Selecting from options

```const remote = await vscode.window.showQuickPick(

  ['origin', 'upstream', 'fork'],

#### Frontmatter Structure  { placeHolder: 'Select git remote' }

);

**Required Fields**:```

- `mode`: PAW agent identifier (e.g., "PAW-01A Spec Agent", "PAW-02A Code Researcher")

### File System Operations

**Optional Fields**:

- `model`: Specific model selection (e.g., "Claude Sonnet 4.5 (copilot)")VS Code provides the `workspace.fs` API for cross-platform file operations:



**Quoting Variations**:**Creating Directories:**

- Single quotes: `mode: 'PAW-01B Spec Research Agent'````typescript

- No quotes: `mode: PAW-01A Spec Agent`// From vscode.d.ts API reference

- Both valid YAMLinterface FileSystem {

  /**

#### Standard Prompt File Names   * Create a new directory (Note, that new files are created via `write`-calls).

   * Note that missing directories are created automatically, e.g this call has

Nine standard templates observed:   * `mkdirp` semantics.

   */

1. `01A-spec.prompt.md` - Specification creation  createDirectory(uri: Uri): Thenable<void>;

2. `01B-spec-research.prompt.md` or `spec-research.prompt.md` - Behavioral research}

3. `02A-code-research.prompt.md` - Code analysis

4. `02B-impl-plan.prompt.md` - Implementation planning// workspace.fs is the file system instance

5. `03A-implement.prompt.md` - Implementation executionconst fs: FileSystem;

6. `03B-review.prompt.md` - Implementation review```

7. `04-docs.prompt.md` - Documentation generation

8. `05-pr.prompt.md` - Final PR creation**Implementation Pattern:**

9. `0X-status.prompt.md` - Status synchronization```typescript

import * as vscode from 'vscode';

**Evidence**: Directory listings from both work items show these patternsimport * as path from 'path';



### 3. Chatmode File Structure and Agent Definitions// Get workspace root

const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri;

#### Chatmode File Location and Formatif (!workspaceRoot) {

  throw new Error('No workspace folder open');

Chatmode files are in `.github/chatmodes/` directory with naming pattern: `PAW-{ID} {Name}.chatmode.md`}



**Examples**:// Create directory with automatic parent creation

- `PAW-01A Spec Agent.chatmode.md`const workItemPath = vscode.Uri.joinPath(

- `PAW-02A Code Researcher.chatmode.md`  workspaceRoot, 

- `PAW-03A Implementer.chatmode.md`  '.paw', 

  'work', 

#### Chatmode File Structure  featureSlug

);

From `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` (lines 1-7):await vscode.workspace.fs.createDirectory(workItemPath);



```markdown// Create prompts subdirectory

---const promptsPath = vscode.Uri.joinPath(workItemPath, 'prompts');

description: 'Phased Agent Workflow: Spec Agent'await vscode.workspace.fs.createDirectory(promptsPath);

---

# Spec Agent// Write file

const fileContent = Buffer.from('# WorkflowContext\n\n...', 'utf8');

You convert a rough Issue / feature brief into a **structured feature specification**...const filePath = vscode.Uri.joinPath(workItemPath, 'WorkflowContext.md');

```await vscode.workspace.fs.writeFile(filePath, fileContent);



From `.github/chatmodes/PAW-02A Code Researcher.chatmode.md` (lines 1-5):// Open file in editor

const doc = await vscode.workspace.openTextDocument(filePath);

```markdownawait vscode.window.showTextDocument(doc);

---```

description: 'PAW Researcher agent'

---The `workspace.fs` API uses `Uri` objects instead of file paths for cross-platform compatibility. The `joinPath()` function constructs paths safely across operating systems.

# Codebase Researcher Agent

### Git Integration

You are tasked with conducting comprehensive research across the codebase...

```Git operations are executed via Node.js `child_process` module since VS Code doesn't provide a built-in Git API for extensions:



**Frontmatter**:**Executing Git Commands:**

- Single field: `description` with agent purpose```typescript

- Markdown content contains full agent instructions// From Node.js child_process documentation

import { exec, spawn, execSync } from 'child_process';

#### Agent Mode Identifiersimport { promisify } from 'util';



From chatmode files:const execAsync = promisify(exec);

- `PAW-01A Spec Agent` - Specification creation

- `PAW-01B Spec Research Agent` - System behavior research// Check for uncommitted changes

- `PAW-02A Code Researcher` - Code mapping and analysisasync function hasUncommittedChanges(cwd: string): Promise<boolean> {

- `PAW-02B Impl Planner` - Implementation planning  try {

- `PAW-03A Implementer` - Code implementation    const { stdout } = await execAsync('git status --porcelain', { cwd });

- `PAW-03B Impl Reviewer` - Implementation review    return stdout.trim().length > 0;

- `PAW-04 Documenter` - Documentation generation  } catch (error) {

- `PAW-05 PR` - Final PR creation    throw new Error(`Git status failed: ${error.message}`);

- `PAW-X Status Update` - Status synchronization  }

}

Additional review workflow agents exist (PAW-R1A, PAW-R1B, PAW-R2A, PAW-R2B, PAW-R3A, PAW-R3B).

// Get list of remotes

#### WorkflowContext.md Parameter Handling in Chatmodesasync function getGitRemotes(cwd: string): Promise<string[]> {

  const { stdout } = await execAsync('git remote', { cwd });

From `PAW-01A Spec Agent.chatmode.md` (lines 45-73):  return stdout.trim().split('\n').filter(r => r.length > 0);

}

```markdown

### WorkflowContext.md Parameters// Create and checkout branch

- Minimal format to create or update:async function createAndCheckoutBranch(

```markdown  branchName: string, 

# WorkflowContext  cwd: string

): Promise<void> {

Work Title: <work_title>  // Check if branch exists

Feature Slug: <feature-slug>  try {

Target Branch: <target_branch>    await execAsync(`git rev-parse --verify ${branchName}`, { cwd });

GitHub Issue: <issue_url>    // Branch exists, ask user

Remote: <remote_name>    const action = await vscode.window.showQuickPick(

Artifact Paths: <auto-derived or explicit>      ['Checkout existing branch', 'Choose different name'],

Additional Inputs: <comma-separated or none>      { placeHolder: `Branch '${branchName}' already exists` }

```    );

- **Work Title** is a short, descriptive name (2-4 words) for the feature...    if (action === 'Checkout existing branch') {

- **Feature Slug**: Normalized, filesystem-safe identifier...      await execAsync(`git checkout ${branchName}`, { cwd });

- If `WorkflowContext.md` is missing or lacks a Target Branch or Feature Slug:    } else {

  1. Gather or derive Target Branch...      throw new Error('Branch already exists');

  2. Generate or prompt for Work Title...    }

  3. Generate or prompt for Feature Slug...  } catch {

```    // Branch doesn't exist, create it

    await execAsync(`git checkout -b ${branchName}`, { cwd });

From `PAW-02A Code Researcher.chatmode.md` (lines 44-68):  }

}

```markdown

### WorkflowContext.md Parameters// Get current branch

- Minimal format to create or update:async function getCurrentBranch(cwd: string): Promise<string> {

[same format as above]  const { stdout } = await execAsync('git branch --show-current', { cwd });

- If the file is missing or lacks a Target Branch or Feature Slug:  return stdout.trim();

  1. Derive Target Branch from current branch if necessary}

  2. Generate Feature Slug from Work Title if Work Title exists (normalize and validate):```

     - Apply normalization rules: lowercase, replace spaces/special chars with hyphens...

     - Validate format: only lowercase letters, numbers, hyphens...**Error Handling Pattern:**

     - Check uniqueness: verify `.paw/work/<slug>/` doesn't exist...```typescript

  3. If both missing, prompt user for either Work Title or explicit Feature Slug// From Node.js child_process examples

  4. Write `.paw/work/<feature-slug>/WorkflowContext.md` before proceedingconst { stderr, stdout, status } = childProcess.spawnSync('git', ['status']);

```if (status !== 0) {

  const errorText = stderr.toString();

**Pattern**: All PAW agents check for WorkflowContext.md and extract parameters before starting work.  throw new Error(`Git command failed: ${errorText}`);

}

### 4. VS Code Language Model Tools API```



#### API OverviewGit operations should validate repository state before making changes and provide clear error messages when operations fail.



From web search (https://code.visualstudio.com/api/extension-guides/ai/tools):### GitHub MCP Tool Integration



Language model tools extend LLM functionality in VS Code chat/agent mode. Tools are functions invoked as part of language model requests, automatically called by agent mode based on conversation context.VS Code extensions can invoke MCP tools (including GitHub tools) using the Language Model API:



#### Tool Registration Pattern**Tool Discovery and Invocation:**

```typescript

**Registration API**:// From vscode.lm API documentation and Roo-Code implementation

import * as vscode from 'vscode';

```typescript

export function registerChatTools(context: vscode.ExtensionContext) {// Discover available tools

  context.subscriptions.push(const tools = vscode.lm.tools;  // Array of LanguageModelToolInformation

    vscode.lm.registerTool('chat-tools-sample_tabCount', new TabCountTool())

  );// Invoke a tool

}async function callGitHubMCPTool(

```  toolName: string, 

  parameters: any, 

- Call `vscode.lm.registerTool()` on extension activation  token: vscode.CancellationToken

- First parameter: tool name matching `package.json` `name` field): Promise<any> {

- Second parameter: class implementing `vscode.LanguageModelTool<>` interface  try {

    const result = await vscode.lm.invokeTool(

#### package.json Configuration      toolName,

      { parameters },

Tools defined in `contributes.languageModelTools` section:      token

    );

```json    return result;

{  } catch (error) {

  "contributes": {    throw new Error(`Failed to invoke MCP tool: ${error.message}`);

    "languageModelTools": [  }

      {}

        "name": "chat-tools-sample_tabCount",

        "displayName": "Tab Counter",// Example: Fetch GitHub issue

        "description": "Counts the number of open tabs",async function fetchGitHubIssue(issueUrl: string): Promise<any> {

        "canBeReferencedInPrompt": true,  // Parse issue URL: https://github.com/owner/repo/issues/123

        "toolReferenceName": "tabCount",  const match = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);

        "icon": "$(symbol-file)",  if (!match) {

        "userDescription": "Count open editor tabs",    throw new Error('Invalid GitHub issue URL');

        "inputSchema": {  }

          "type": "object",  

          "properties": {  const [, owner, repo, issueNumber] = match;

            "tabGroup": {  

              "type": "number",  // Call GitHub MCP tool

              "description": "Tab group number (optional)"  const result = await callGitHubMCPTool(

            }    'mcp_github_issue_read',

          }    {

        }      method: 'get',

      }      owner,

    ]      repo,

  }      issue_number: parseInt(issueNumber)

}    },

```    new vscode.CancellationTokenSource().token

  );

**Key Properties**:  

- `name`: Unique tool identifier (format: `{verb}_{noun}`)  return result;

- `displayName`: User-friendly name for UI}

- `description`: Tool purpose for LLM```

- `canBeReferencedInPrompt`: Enable `#` reference in chat (true/false)

- `toolReferenceName`: Name for `#` reference in prompts**Integration with Extension:**

- `icon`: Codicon for UI displayMCP tools are invoked asynchronously and require a cancellation token. The extension can use GitHub MCP tools to fetch issue titles and metadata without implementing GitHub API authentication directly.

- `userDescription`: User-facing description

- `inputSchema`: JSON Schema for input parameters**Pattern from Roo-Code Extension:**

```typescript

#### Tool Implementation Class// Tool discovery pattern

const vsCodeTools = vscode.lm.tools;  // Get all available tools

Implements `vscode.LanguageModelTool<IParameters>` interface:const githubTools = vsCodeTools.filter(t => t.name.startsWith('mcp_github_'));



```typescript// Monitor for tool changes

export interface ITabCountParameters {vscode.extensions.onDidChange(() => {

  tabGroup?: number;  // Re-fetch available tools when extensions change

}});

```

class TabCountTool implements vscode.LanguageModelTool<ITabCountParameters> {

  async prepareInvocation(### Extension Packaging and Publishing

    options: vscode.LanguageModelToolInvocationPrepareOptions<ITabCountParameters>,

    _token: vscode.CancellationToken**package.json Requirements:**

  ) {```json

    const confirmationMessages = {{

      title: 'Count the number of open tabs',  "name": "extension-name",

      message: new vscode.MarkdownString(  "displayName": "Display Name",

        `Count the number of open tabs?` +  "description": "Extension description",

        (options.input.tabGroup !== undefined  "version": "0.0.1",

          ? ` in tab group ${options.input.tabGroup}`  "publisher": "publisher-id",

          : '')  "repository": "https://github.com/user/repo",

      ),  "engines": {

    };    "vscode": "^1.51.0"

    return {  },

      invocationMessage: 'Counting the number of tabs',  "categories": ["Other"],

      confirmationMessages,  "activationEvents": [],

    };  "main": "./out/extension.js",

  }  "contributes": {

    "commands": []

  async invoke(  },

    options: vscode.LanguageModelToolInvocationOptions<ITabCountParameters>,  "scripts": {

    _token: vscode.CancellationToken    "vscode:prepublish": "npm run compile",

  ) {    "compile": "tsc -p ./",

    const params = options.input;    "watch": "tsc -watch -p ./"

    if (typeof params.tabGroup === 'number') {  },

      const group = vscode.window.tabGroups.all[Math.max(params.tabGroup - 1, 0)];  "devDependencies": {

      const nth = params.tabGroup === 1 ? '1st' : params.tabGroup === 2 ? '2nd' :     "@types/node": "^8.10.25",

                   params.tabGroup === 3 ? '3rd' : `${params.tabGroup}th`;    "@types/vscode": "^1.51.0",

      return new vscode.LanguageModelToolResult([    "typescript": "^3.4.5"

        new vscode.LanguageModelTextPart(  }

          `There are ${group.tabs.length} tabs open in the ${nth} tab group.`}

        )```

      ]);

    } else {**Key Fields:**

      const group = vscode.window.tabGroups.activeTabGroup;- `name` - Extension identifier (lowercase, no spaces)

      return new vscode.LanguageModelToolResult([- `displayName` - User-friendly name shown in Marketplace

        new vscode.LanguageModelTextPart(`There are ${group.tabs.length} tabs open.`)- `publisher` - Publisher ID (must be registered)

      ]);- `engines.vscode` - Minimum VS Code version (^1.X.0 for compatibility)

    }- `categories` - Marketplace categories for discovery

  }- `icon` - Path to 128x128px PNG icon

}- `repository` - GitHub URL for source code

```- `license` - License identifier (e.g., "MIT")



**Required Methods**:**Packaging with vsce:**

- `prepareInvocation()`: Return confirmation message and invocation message```bash

  - Always shown for extension tools (can customize)# Install vsce globally

  - User can select "Always Allow" to skipnpm install -g @vscode/vsce

- `invoke()`: Execute tool logic

  - Receives validated input parameters (against inputSchema)# Package extension

  - Returns `vscode.LanguageModelToolResult` with text/partscd extension-directory

  - Throw errors with LLM-friendly messages on failurevsce package

# Creates extension-name-0.0.1.vsix

#### Naming Conventions

# Install locally for testing

From web search documentation:code --install-extension extension-name-0.0.1.vsix

```

- **Tool name**: `{verb}_{noun}` format (e.g., `get_weather`, `get_azure_deployment`, `paw_get_workflow_context`)

- **Parameter name**: `{noun}` format (e.g., `destination_location`, `ticker`, `work_item_path`)**Publishing to Marketplace:**

- **Descriptions**: Detailed, including what tool does, when to use/not use, parameter purposes, limitations```bash

# Create publisher (one-time)

#### Error Handlingvsce create-publisher publisher-id



```typescript# Login with Personal Access Token from Azure DevOps

async invoke(options, token) {vsce login publisher-id

  try {

    // Tool logic# Publish extension

    return new vscode.LanguageModelToolResult([...]);vsce publish

  } catch (error) {# Or publish with version bump

    throw new Error(vsce publish patch  # 0.0.1 -> 0.0.2

      `Failed to retrieve data: ${error.message}. ` +vsce publish minor  # 0.1.0 -> 0.2.0

      `Please retry with different parameters or check the input.`vsce publish major  # 1.0.0 -> 2.0.0

    );```

  }

}**Marketplace Integration:**

```- `README.md` - Shown on extension page

- `CHANGELOG.md` - Version history

Errors should:- `LICENSE` - License information

- Make sense to LLM (not just human developers)- `.vscodeignore` - Exclude files from package (e.g., `**/*.ts`, `**/tsconfig.json`)

- Include guidance on next steps (retry, different params, alternative actions)

**Pre-publish Script:**

### 5. VS Code Command RegistrationThe `vscode:prepublish` script runs before packaging to compile TypeScript:

```json

#### Command Registration Pattern{

  "scripts": {

From web search (https://code.visualstudio.com/api/extension-guides/command):    "vscode:prepublish": "npm run compile",

    "compile": "tsc -p ./"

```typescript  }

import * as vscode from 'vscode';}

```

export function activate(context: vscode.ExtensionContext) {

  const command = 'myExtension.sayHello';### TypeScript Project Structure

  const commandHandler = (name: string = 'world') => {

    console.log(`Hello ${name}!!!`);**Standard Extension Layout:**

  };```

  context.subscriptions.push(extension-root/

    vscode.commands.registerCommand(command, commandHandler)├── src/

  );│   └── extension.ts          # Main entry point

}├── out/                       # Compiled JavaScript (gitignored)

```│   └── extension.js

├── package.json               # Extension manifest

**API**: `vscode.commands.registerCommand(commandId, handler)`├── tsconfig.json              # TypeScript config

- `commandId`: Unique command identifier (convention: `publisher.commandName`)├── .vscodeignore              # Package exclusions

- `handler`: Function invoked when command executed├── README.md                  # Marketplace documentation

- Returns `Disposable` - push to `context.subscriptions` for cleanup├── LICENSE                    # License file

├── CHANGELOG.md               # Version history

#### package.json Command Contribution└── node_modules/              # Dependencies (gitignored)

```

Commands must be declared in `package.json` to appear in Command Palette:

**tsconfig.json:**

```json```json

{{

  "contributes": {  "compilerOptions": {

    "commands": [    "module": "commonjs",

      {    "target": "ES2020",

        "command": "myExtension.sayHello",    "outDir": "out",

        "title": "Say Hello",    "lib": ["ES2020"],

        "category": "My Extension"    "sourceMap": true,

      }    "rootDir": "src",

    ]    "strict": true

  }  },

}  "exclude": ["node_modules", ".vscode-test"]

```}

```

**Properties**:

- `command`: Command ID matching registration**.vscodeignore:**

- `title`: Display name in Command Palette```

- `category`: Optional grouping prefix**/*.ts

**/tsconfig.json

#### Activation Events**/.eslintrc.json

**/*.map

From web search and SpecResearch.md:.gitignore

.vscode/**

For VS Code 1.74.0+, activation events are optional for commands. Extension activates automatically when command invoked.src/**

node_modules/**

For earlier versions, explicit activation required:!node_modules/production-dependency/**

```

```json

{## Code References

  "activationEvents": [

    "onCommand:myExtension.sayHello"Since this is a greenfield project with no existing implementation, code references are from:

  ]- VS Code Extension API documentation (https://code.visualstudio.com/api)

}- VS Code API TypeScript definitions (vscode.d.ts)

```- Node.js child_process module documentation

- Third-party extension examples (Roo-Code GitHub issue #3811)

**Best Practice**: Use `onCommand:` activation for:- VS Code publishing documentation

- Commands invoked via Command Palette

- Commands with keybindings## Architecture Documentation

- Commands in UI (editor title bar, context menus)

- Commands as API for other extensions**Recommended Implementation Architecture:**



Avoid broad activations (`*`, `onStartupFinished`) - activate only when needed.1. **Main Extension Module** (`src/extension.ts`)

   - Exports `activate()` and `deactivate()` functions

#### User Input Collection   - Registers commands in activate function

   - Stores disposables in `context.subscriptions`

**showInputBox** for text input:

2. **Command Handler Module** (`src/commands/initializeWorkItem.ts`)

```typescript   - Implements PAW initialization logic

const searchQuery = await vscode.window.showInputBox({   - Coordinates user input collection

  placeHolder: "Search query",   - Orchestrates file creation and git operations

  prompt: "Search my snippets on Codever",

  value: selectedText3. **User Input Module** (`src/ui/userInput.ts`)

});   - Collects branch name via `showInputBox()`

   - Collects GitHub issue URL via `showInputBox()`

if (searchQuery === '') {   - Selects remote via `showQuickPick()` when multiple exist

  vscode.window.showErrorMessage('A search query is mandatory');

}4. **Git Operations Module** (`src/git/gitOperations.ts`)

if (searchQuery !== undefined) {   - Executes git commands via `child_process`

  // User provided input (not cancelled)   - Validates repository state

  const searchUrl = `https://example.com/search?q=${searchQuery}`;   - Creates and checks out branches

  vscode.env.openExternal(vscode.Uri.parse(searchUrl));

}5. **GitHub Integration Module** (`src/github/githubClient.ts`)

```   - Invokes GitHub MCP tools via `vscode.lm.invokeTool()`

   - Fetches issue metadata

**InputBoxOptions**:   - Handles network errors gracefully

- `placeHolder`: Hint text in empty box

- `prompt`: Description above input6. **File System Module** (`src/fs/fileOperations.ts`)

- `value`: Pre-filled text   - Creates directory structure via `workspace.fs`

- Returns: `string | undefined` (undefined if cancelled/ESC)   - Generates WorkflowContext.md content

   - Creates prompt template files

**showQuickPick** for selection:   - Opens files in editor



```typescript7. **Utilities Module** (`src/utils/slugify.ts`)

const options = ['Option 1', 'Option 2', 'Option 3'];   - Normalizes feature slugs

const selected = await vscode.window.showQuickPick(options, {   - Validates slug uniqueness

  placeHolder: 'Select an option',   - Rejects reserved names

  canPickMany: false

});**Data Flow:**

```1. User invokes "PAW: Initialize Work Item" command

2. Extension collects user input (branch, issue URL, remote)

**QuickPickOptions**:3. Extension validates git repository state

- `placeHolder`: Hint text4. Extension generates feature slug from branch name

- `canPickMany`: Allow multiple selections5. Extension fetches GitHub issue metadata if URL provided

- `ignoreFocusOut`: Keep open when focus lost6. Extension creates `.paw/work/<slug>/` directory structure

- Returns: `string | string[] | undefined`7. Extension creates WorkflowContext.md with metadata

8. Extension creates prompt template files

### 6. Agent Mode Invocation (Critical for PAW Extension)9. Extension creates and checks out git branch

10. Extension opens WorkflowContext.md for review

#### API Signature

**Error Handling Strategy:**

From SpecResearch.md and GitHub Issue #35 comment:- Validate inputs before executing operations

- Check git repository state before branch operations

```typescript- Provide clear, actionable error messages

vscode.commands.executeCommand(- Gracefully handle network failures for GitHub API

  "workbench.action.chat.open",- Allow continuation when optional operations fail

  {- Display errors via `vscode.window.showErrorMessage()`

    query: string,      // Required: Prompt text to send to agent

    mode: "agent"       // Required: Invoke in agent mode**Testing Considerations:**

  }- Unit tests for slug normalization and validation

): Thenable<void>- Integration tests for file system operations

```- Mock git command execution for testing

- Mock MCP tool invocation for GitHub integration

**Parameters**:- Test error handling paths

- `query`: Complete prompt text with instructions and context

- `mode`: Must be `"agent"` (vs normal chat mode)## Open Questions



**Return Value**:None. All implementation questions have been answered through research of VS Code Extension API documentation, TypeScript/Node.js patterns, and third-party extension examples.

- Returns `Thenable<void>` (Promise-like)

- Resolves when chat panel opens## External Resources Referenced

- Does NOT wait for agent completion

- No programmatic access to agent response- **VS Code Extension API**: https://code.visualstudio.com/api

- **Language Model Tools API**: https://code.visualstudio.com/api/extension-guides/ai/tools

#### Usage Pattern for PAW Initialization- **Publishing Extensions**: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

- **Node.js child_process**: Standard Node.js module for executing shell commands

```typescript- **Roo-Code MCP Integration**: GitHub issue #3811 documenting vscode.lm.invokeTool() usage pattern

const prompt = `- **VS Code Extension Samples**: https://github.com/microsoft/vscode-extension-samples

Create PAW work item structure:

Parameters:
- Feature Slug: ${featureSlug}
- Target Branch: ${targetBranch}
- GitHub Issue: ${githubIssue}
- Work Title: ${workTitle}

Instructions:
1. Create .paw/work/${featureSlug}/ directory
2. Create .paw/work/${featureSlug}/prompts/ subdirectory
3. Generate WorkflowContext.md with parameters
4. Generate all 9 prompt template files
5. Create and checkout target branch
6. Open WorkflowContext.md in editor
`;

await vscode.commands.executeCommand("workbench.action.chat.open", {
  query: prompt,
  mode: "agent"
});
```

**Limitations**:
- Extension cannot wait for agent completion
- No access to agent output or created files
- Cannot verify agent success/failure programmatically
- Agent execution is asynchronous and independent

**What Extension CAN do**:
- Open chat panel with pre-filled prompt
- Provide comprehensive instructions in query
- Log invocation to output channel for transparency

**What Extension CANNOT do**:
- Wait for agent to complete
- Receive agent response
- Access files created by agent
- Verify success/failure in code

From SpecResearch.md (line 12):
> "PAW agents do not directly invoke `workbench.action.chat.open` or create files through agent mode commands. Instead, a VS Code extension provides registered commands that create directory structures and files using the standard VS Code Extension API."

**Important Note**: The SpecResearch.md indicates two possible architectures:
1. Extension creates files directly using VS Code FS API
2. Extension delegates to agent via `workbench.action.chat.open`

GitHub Issue #35 comment shows preference for **agent-driven architecture** where extension orchestrates by gathering inputs and delegating complex work to AI agent.

### 7. File System Operations (Alternative to Agent Delegation)

From SpecResearch.md (lines 19-22):

```typescript
// Create directories
await vscode.workspace.fs.createDirectory(uri);  // mkdirp semantics

// Write files
await vscode.workspace.fs.writeFile(uri, content);  // content as Buffer

// Construct paths
const filePath = vscode.Uri.joinPath(workspaceUri, '.paw', 'work', slug, 'WorkflowContext.md');
```

**File System API**:
- `vscode.workspace.fs.createDirectory(uri)`: Auto-creates parent directories
- `vscode.workspace.fs.writeFile(uri, content)`: Writes Buffer content
- `vscode.Uri.joinPath()`: Cross-platform path construction
- All operations use Uri objects for compatibility

**Git Operations**:
From SpecResearch.md (lines 25-28):

```typescript
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Create branch
await execAsync(`git checkout -b ${branchName}`, { cwd: workspacePath });

// Check status
const { stdout } = await execAsync('git status --porcelain', { cwd: workspacePath });
```

Extensions execute git via Node.js `child_process.exec()` - no built-in VS Code Git API.

### 8. Output Channel Logging

From SpecResearch.md and web search:

#### Creation

```typescript
const outputChannel = vscode.window.createOutputChannel('PAW Workflow');
context.subscriptions.push(outputChannel);  // Auto-dispose on deactivation
```

#### Write Methods

```typescript
outputChannel.append('text');          // No newline
outputChannel.appendLine('text');      // With newline
outputChannel.show(preserveFocus);     // Show panel (optional focus)
outputChannel.hide();                  // Hide panel
outputChannel.clear();                 // Clear content
```

#### Logging Pattern

```typescript
class Logger {
  constructor(private channel: vscode.OutputChannel) {}
  
  info(message: string) {
    const timestamp = new Date().toISOString();
    this.channel.appendLine(`[${timestamp}] INFO: ${message}`);
  }
  
  error(message: string) {
    const timestamp = new Date().toISOString();
    this.channel.appendLine(`[${timestamp}] ERROR: ${message}`);
    this.channel.show(true);  // Show on errors
  }
}
```

### 9. Extension Packaging Requirements

From SpecResearch.md (lines 34-90):

#### Minimal package.json Fields

```json
{
  "name": "my-extension",
  "publisher": "myPublisher",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.70.0"
  },
  "activationEvents": [],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "myExtension.doSomething",
        "title": "Do Something"
      }
    ]
  }
}
```

**Required**:
- `name`: Extension identifier (lowercase, alphanumeric with hyphens)
- `publisher`: Publisher ID (must be registered)
- `version`: Semantic version
- `engines.vscode`: Minimum VS Code version
- `main` or `browser`: Entry point file
- `contributes`: Contribution points (commands, etc.)

**Recommended**:
- `displayName`: User-friendly name
- `description`: Brief description
- `repository`: GitHub URL
- `license`: License identifier
- `icon`: 128x128px PNG path
- `categories`: Marketplace categories

### 10. GitHub API Integration (for Issue Title Fetching)

From SpecResearch.md:

#### Rate Limits

- **Unauthenticated**: 60 requests/hour per IP
- **Authenticated**: Higher limits (token required)

#### Best Practices

1. Use authenticated requests when possible (via token/GitHub App)
2. Respect rate limit headers:
   - `X-RateLimit-Remaining`
   - `X-RateLimit-Reset`
3. Handle 403 errors gracefully (pause until reset time)
4. Cache responses to reduce API calls
5. Show user-friendly error messages on rate limit

#### Issue Title Extraction

From SpecResearch.md (Work Title Generation section):

```typescript
// Extract from URL
const match = issueUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/);
const [, owner, repo, number] = match;

// Fetch via GitHub API
const response = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/issues/${number}`
);
const data = await response.json();
const workTitle = data.title;
```

**Fallback**: If API fails, generate Work Title from branch name:
1. Remove prefixes (`feature/`, `bugfix/`, `hotfix/`)
2. Split on hyphens/underscores/slashes
3. Capitalize first letter of each word
4. Join with spaces
5. Limit to 2-4 words

### 11. Feature Slug Normalization and Validation

From SpecResearch.md:

#### Normalization Steps

1. Convert to lowercase
2. Replace spaces with hyphens
3. Replace special characters with hyphens (except alphanumeric)
4. Remove invalid characters
5. Collapse consecutive hyphens to single hyphen
6. Trim leading/trailing hyphens
7. Enforce 100 character maximum (truncate)

#### Validation Rules

```typescript
function validateSlug(slug: string): boolean {
  // Length: 1-100 characters
  if (slug.length < 1 || slug.length > 100) return false;
  
  // Format: lowercase letters, numbers, hyphens only
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  
  // No leading/trailing hyphens
  if (slug.startsWith('-') || slug.endsWith('-')) return false;
  
  // No consecutive hyphens
  if (slug.includes('--')) return false;
  
  // Not reserved
  const reserved = ['.', '..', 'node_modules', '.git', '.paw'];
  if (reserved.includes(slug)) return false;
  
  return true;
}
```

#### Uniqueness Check

```typescript
const workItemPath = vscode.Uri.joinPath(
  workspaceUri, '.paw', 'work', slug
);
try {
  await vscode.workspace.fs.stat(workItemPath);
  // Directory exists - conflict!
  // Auto-append -2, -3, etc. for generated slugs
  // Prompt user for alternative if user-provided
} catch {
  // Directory doesn't exist - slug is unique
}
```

### 12. Error Handling and User Feedback

From SpecResearch.md:

#### Error Message Types

```typescript
// Critical errors - modal
vscode.window.showErrorMessage(
  'Git authentication required. Configure Git credentials.',
  'View Docs', 'Cancel'
);

// Warnings - non-blocking
vscode.window.showWarningMessage(
  'Uncommitted changes detected. Continue anyway?',
  'Continue', 'Cancel'
);

// Information - success/status
vscode.window.showInformationMessage(
  'Work item initialized successfully'
);
```

#### Best Practices

From SpecResearch.md (Extension Edge Case Handling section):

1. **Clear explanations**: What happened, why, what user can do
2. **Actionable next steps**: Include buttons for recovery options
3. **Avoid spam**: Use status bar/output for non-critical issues
4. **Log diagnostics**: Write to output channel for troubleshooting
5. **Respect workflows**: Non-modal prompts for recoverable errors

#### Common Error Scenarios

**Directory conflict**:
```typescript
const options = await vscode.window.showQuickPick(
  ['Overwrite existing', 'Choose different name', 'Cancel'],
  { placeHolder: 'Work item directory already exists' }
);
```

**Git branch exists**:
```typescript
const options = await vscode.window.showQuickPick(
  ['Checkout existing', 'Choose different name', 'Cancel'],
  { placeHolder: 'Branch already exists locally' }
);
```

**Not a git repository**:
```typescript
const action = await vscode.window.showErrorMessage(
  'PAW requires a Git repository. Initialize Git first.',
  'Initialize Git', 'Cancel'
);
if (action === 'Initialize Git') {
  await execAsync('git init', { cwd: workspacePath });
}
```

## Code References

### Existing PAW Work Items (Structure Examples)

- `.paw/work/paw-directory/WorkflowContext.md` - Example WorkflowContext.md file
- `.paw/work/paw-directory/prompts/01A-create-spec.prompt.md` - Spec prompt template
- `.paw/work/paw-directory/prompts/02A-code-research.prompt.md` - Code research prompt
- `.paw/work/vscode-extension-init/WorkflowContext.md` - Current work item context
- `.paw/work/vscode-extension-init/prompts/spec-research.prompt.md` - Research prompt with questions

### Chatmode Definitions

- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:1-7` - Spec Agent frontmatter and title
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:45-73` - WorkflowContext.md parameter handling
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md:1-5` - Code Researcher frontmatter
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md:44-68` - Feature slug generation logic

### Specification and Research Documents

- `.paw/work/vscode-extension-init/SpecResearch.md` - Behavioral research (full file analyzed)
- `.paw/work/vscode-extension-init/Spec.md` - Feature specification
- `.paw/work/vscode-extension-init/WorkflowContext.md` - Workflow parameters

### Repository Structure

- `package.json` - Root package.json (no extension code yet)
- `scripts/count-tokens.js` - Token counting utility (unrelated to extension)
- `scripts/lint-chatmode.sh` - Chatmode linting script

## Architecture Documentation

### Agent-Driven Architecture Pattern

From GitHub Issue #35 comment and SpecResearch.md:

The extension follows an **agent-driven architecture** where:

1. **Extension Responsibilities (Minimal)**:
   - Register commands in package.json
   - Collect user inputs (target branch, GitHub issue, etc.)
   - Validate inputs (slug format, uniqueness, git status)
   - Construct comprehensive prompt with all parameters
   - Invoke GitHub Copilot agent mode via `vscode.commands.executeCommand()`
   - Log operations to output channel

2. **Agent Responsibilities (Complex Logic)**:
   - Create directory structures
   - Generate WorkflowContext.md file
   - Generate all 9 prompt template files
   - Execute git commands (branch creation, checkout)
   - Open files in editor
   - Handle edge cases and errors during execution

**Key Principle**: Extension orchestrates by gathering inputs and delegating complex work to AI agent via well-crafted prompt. Extension code stays minimal.

### Alternative: Direct File Creation Architecture

SpecResearch.md also documents pattern for extension to create files directly using VS Code FS API:

```typescript
// Extension creates files directly
const workItemPath = vscode.Uri.joinPath(
  workspaceUri, '.paw', 'work', slug
);
await vscode.workspace.fs.createDirectory(workItemPath);
await vscode.workspace.fs.writeFile(
  vscode.Uri.joinPath(workItemPath, 'WorkflowContext.md'),
  Buffer.from(workflowContextContent)
);
```

**Trade-off**: More code in extension, but deterministic behavior vs agent unpredictability.

### Language Model Tool Architecture

For `paw_get_workflow_context` tool:

1. **Tool Definition** (package.json):
   - Name: `paw_get_workflow_context`
   - Input: `{ workItemPath?: string }` (optional, defaults to current workspace)
   - Output: WorkflowContext data structure

2. **Tool Implementation**:
   - Read `.paw/work/<slug>/WorkflowContext.md`
   - Parse fields (Work Title, Feature Slug, Target Branch, etc.)
   - Read artifact files if they exist (Spec.md, CodeResearch.md, etc.)
   - Determine current stage/phase from file existence
   - Return structured data to LLM

3. **Agent Usage**:
   - Agent calls tool during conversation
   - Tool provides context without manual file attachment
   - Reduces conversation setup time
   - Enables agent self-discovery of workflow state

## Open Questions

None. All research objectives addressed with supporting evidence from:
- Existing PAW work items in `.paw/work/`
- Chatmode definitions in `.github/chatmodes/`
- SpecResearch.md behavioral documentation
- GitHub Issue #35 and parent issue #11
- Web search for VS Code Extension API documentation

## External Resources

### VS Code Extension API Documentation

- Language Model Tools API: https://code.visualstudio.com/api/extension-guides/ai/tools
- Command Registration: https://code.visualstudio.com/api/extension-guides/command
- Extension Manifest: https://code.visualstudio.com/api/references/extension-manifest
- Activation Events: https://code.visualstudio.com/api/references/activation-events

### User Input APIs

- showInputBox: https://code.visualstudio.com/api/references/vscode-api#window.showInputBox
- Example usage: https://www.codepedia.org/snippets/60dbfb494095c204661309bf/get-user-input-from-input-box-in-visual-studio-code

### GitHub API

- REST API Documentation: https://docs.github.com/en/rest
- Rate Limiting: https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api

### Extension Development Best Practices

- Testing Extensions: https://code.visualstudio.com/api/working-with-extensions/testing-extension
- Continuous Integration: https://code.visualstudio.com/api/working-with-extensions/continuous-integration
- Publishing Extensions: https://code.visualstudio.com/api/working-with-extensions/publishing-extension
