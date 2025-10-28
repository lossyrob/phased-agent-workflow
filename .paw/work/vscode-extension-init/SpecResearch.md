# Spec Research: VS Code Extension Init

## Summary

This research documents how VS Code extensions interact with the VS Code API to create files and directories, VS Code Marketplace publication requirements, PAW prompt template structures, edge case handling patterns, and filesystem/Git naming constraints. Extensions use the standard VS Code Extension API (`vscode.workspace.fs`, `vscode.commands`) rather than agent modes directly invoking `workbench.action.chat.open`. Marketplace publishing requires specific package.json metadata, icons, README, and licensing. PAW prompt templates follow a simple frontmatter format with `mode` field. Edge cases include directory conflicts and git errors. Filesystem naming rules apply cross-platform constraints.

## Internal System Behavior

### VS Code Extension File Creation and Agent Mode

**No Direct Agent Mode Invocation:**
PAW agents do not directly invoke `workbench.action.chat.open` or create files through agent mode commands. Instead, a VS Code extension provides registered commands that create directory structures and files using the standard VS Code Extension API.

**Extension Command Pattern:**
- Commands registered via `vscode.commands.registerCommand()` in `activate()` function
- Commands declared in `package.json` under `contributes.commands`
- Users invoke commands through Command Palette (Cmd+Shift+P / Ctrl+Shift+P)

**File System API:**
- `vscode.workspace.fs.createDirectory(uri)` - Creates directories with automatic parent creation (mkdirp semantics)
- `vscode.workspace.fs.writeFile(uri, content)` - Writes file content as Buffer
- `vscode.Uri.joinPath()` - Constructs cross-platform file paths
- All operations use Uri objects for cross-platform compatibility

**Git Operations:**
- Extensions execute git commands via Node.js `child_process.exec()` or `execAsync()`
- Common operations: `git checkout -b <branch>`, `git status --porcelain`, `git remote`
- No built-in VS Code Git API for extensions - must use shell commands

**Evidence:** CodeResearch.md lines 158-290 document file system and git patterns

### VS Code Marketplace Publication Requirements

**Required package.json Fields:**
- `name` - Extension identifier (lowercase, no spaces, alphanumeric with hyphens)
- `displayName` - User-friendly name shown in Marketplace
- `description` - Brief description of extension functionality
- `version` - Semantic version (e.g., "0.0.1")
- `publisher` - Publisher ID (must be registered via `vsce create-publisher`)
- `engines.vscode` - Minimum VS Code version (e.g., "^1.51.0")
- `categories` - Array of marketplace categories (e.g., ["Other"], ["Productivity"])
- `main` - Entry point file path (e.g., "./out/extension.js")
- `activationEvents` - When extension activates (modern: empty array for on-demand)
- `contributes` - Contribution points (commands, configuration, etc.)

**Recommended Fields:**
- `repository` - GitHub URL for source code
- `license` - License identifier (e.g., "MIT")
- `icon` - Path to 128x128px PNG icon file
- `keywords` - Search keywords for discoverability
- `bugs` - URL to issue tracker

**Required Files:**
- `README.md` - Marketplace documentation shown on extension page
- `LICENSE` - License text file
- `CHANGELOG.md` - Version history (recommended)
- Icon file (128x128px PNG, referenced in package.json)
- Compiled JavaScript in `out/` directory

**Validation Rules:**
- Extension name must be lowercase alphanumeric with hyphens only
- Publisher must be created and verified before publishing
- Icon must be exactly 128x128 pixels in PNG format
- README must provide clear usage instructions
- Version must follow semantic versioning

**Packaging Process:**
1. Install vsce tool: `npm install -g @vscode/vsce`
2. Compile TypeScript: `npm run vscode:prepublish`
3. Package extension: `vsce package` (creates .vsix file)
4. Test locally: `code --install-extension name-version.vsix`

**Publishing Process:**
1. Create publisher account (one-time): `vsce create-publisher <id>`
2. Login with PAT from Azure DevOps: `vsce login <publisher>`
3. Publish: `vsce publish` or `vsce publish patch/minor/major`

**Common Rejection Reasons:**
- Missing or inadequate README
- Icon not 128x128 pixels or wrong format
- Missing license information
- Broken extension (activation errors)
- Security violations (bundling credentials, unsafe code execution)

**Evidence:** CodeResearch.md lines 291-400 document packaging and publishing patterns

### PAW Prompt Template File Content and Structure

**Standard Frontmatter Format:**
```markdown
---
mode: '<PAW Agent Identifier>'
---

<Instruction text referencing WorkflowContext.md>
```

**PAW Agent Mode Identifiers:**
- `PAW-01A Spec Agent` - Specification creation
- `PAW-01B Spec Research Agent` - System behavior research
- `PAW-02A Code Research Agent` - Code mapping and analysis
- `PAW-02B Impl Planner` - Implementation planning
- `PAW-03A Implementer` - Code implementation
- `PAW-03B Impl Reviewer` - Implementation review
- `PAW-04 Documenter Agent` - Documentation generation
- `PAW-05 PR Agent` - Final PR creation
- `PAW-0X Status Agent` - Status synchronization

**Minimal Content Pattern:**
Instructions reference WorkflowContext.md for parameters:
- `Create specification from .paw/work/<slug>/WorkflowContext.md`
- `Answer research questions from .paw/work/<slug>/WorkflowContext.md`
- `Run code research from .paw/work/<slug>/WorkflowContext.md`
- `Implement phase from .paw/work/<slug>/WorkflowContext.md`

**Standard Prompt Files:**
Based on existing PAW work items, nine standard prompt files should be created:
1. `01A-spec.prompt.md` - Specification creation
2. `01B-spec-research.prompt.md` - Behavioral research
3. `02A-code-research.prompt.md` - Code analysis
4. `02B-impl-plan.prompt.md` - Implementation planning
5. `03A-implement.prompt.md` - Implementation execution
6. `03B-review.prompt.md` - Implementation review
7. `04-docs.prompt.md` - Documentation
8. `05-pr.prompt.md` - Final PR
9. `0X-status.prompt.md` - Status updates

**Example from Existing Work Item:**
```markdown
---
mode: PAW-01A Spec Agent
---

Create spec from https://github.com/lossyrob/phased-agent-workflow/issues/35. Be sure to read all comments on the issue.
```

**Template Generation Pattern:**
For each prompt file, use the minimal format with mode identifier and instruction that references the WorkflowContext.md path using the feature slug variable.

**Evidence:** Existing prompt files in `.paw/work/vscode-extension-init/prompts/` and `.paw/work/paw-directory/prompts/`

### Extension Edge Case Handling Patterns

**Directory Conflict (`.paw/work/<slug>/` exists):**
Best practice pattern from extension development:
1. Check directory existence before creation using `vscode.workspace.fs.stat(uri)`
2. If exists, show user options via `vscode.window.showQuickPick()`:
   - "Overwrite existing work item" - Delete and recreate
   - "Choose different name" - Prompt for new slug
   - "Cancel operation" - Abort initialization
3. For auto-generated slugs, append numeric suffix (-2, -3, etc.) automatically
4. For user-provided slugs, require manual confirmation

**Git Branch Already Exists Locally:**
Pattern:
1. Check branch existence: `git rev-parse --verify <branch>` (exit code 0 = exists)
2. If exists locally, show options:
   - "Checkout existing branch" - Switch to branch with `git checkout <branch>`
   - "Choose different name" - Prompt for new branch name
   - "Cancel operation" - Abort without branch creation
3. Validate no uncommitted changes before checkout

**Git Branch Exists Remotely:**
Pattern:
1. List remote branches: `git ls-remote --heads <remote> <branch>`
2. If exists remotely but not locally, show options:
   - "Create tracking branch" - `git checkout -b <branch> <remote>/<branch>`
   - "Create new local branch" - `git checkout -b <branch>` (diverge from remote)
   - "Choose different name" - Prompt for alternative
3. Warn user about potential conflicts with remote work

**Not a Git Repository:**
Pattern:
1. Verify git repository: `git rev-parse --git-dir` (non-zero exit = not a repo)
2. Show error message: "PAW requires a Git repository. Initialize Git first."
3. Offer action via `vscode.window.showErrorMessage()` with actions:
   - "Initialize Git" - Run `git init` in workspace root
   - "Cancel" - Abort initialization
4. Do not proceed without git repository

**Git Authentication Issues:**
Pattern:
1. Catch git command failures related to authentication (stderr contains "Authentication failed")
2. Show error: "Git authentication required. Configure Git credentials."
3. Provide guidance:
   - For HTTPS: Configure credential helper or personal access token
   - For SSH: Verify SSH key is added to ssh-agent
   - Link to Git credential documentation
4. Allow local operations to continue (branch creation works without remote access)

**Error Message Best Practices:**
- Use `vscode.window.showErrorMessage()` for errors
- Use `vscode.window.showWarningMessage()` for warnings
- Use `vscode.window.showInformationMessage()` for success/info
- Provide actionable next steps in error messages
- Include specific error details from git/filesystem operations
- Offer recovery options when possible

**Evidence:** CodeResearch.md lines 215-290 document git error handling patterns; VS Code Extension API provides UI feedback mechanisms

### Feature Slug Validation Rules

**Filesystem Naming Constraints (Cross-Platform):**

**Linux/macOS:**
- Allowed characters: a-z, A-Z, 0-9, hyphen (-), underscore (_), period (.)
- Path separator: `/` (forbidden in names)
- Max filename length: 255 bytes
- Case-sensitive but case-preserving
- Reserved names: `.`, `..`

**Windows:**
- Allowed characters: Same as Linux/macOS except forbids: `< > : " / \ | ? *`
- Path separator: `\` (forbidden in names; `/` also treated as separator)
- Max filename length: 255 characters
- Case-insensitive but case-preserving
- Reserved names: `CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9` (case-insensitive)
- Reserved name with extension: `CON.txt` is also forbidden

**Git Branch Naming Restrictions:**
- Cannot begin with hyphen (`-`) or period (`.`)
- Cannot end with period (`.`) or slash (`/`)
- Cannot contain `..` (double period)
- Cannot contain `@{` sequence
- Cannot contain ASCII control characters (< 32 decimal)
- Cannot contain space, tilde (`~`), caret (`^`), colon (`:`), question mark (`?`), asterisk (`*`), open bracket (`[`)
- Cannot have consecutive slashes (`//`)
- Cannot end with `.lock` suffix
- Case-sensitive on most systems

**PAW Feature Slug Rules (from paw-specification.md):**
- Format: lowercase letters (a-z), numbers (0-9), hyphens (-) only
- Length: 1-100 characters
- No leading/trailing hyphens
- No consecutive hyphens
- Not reserved names: `.`, `..`, `node_modules`, `.git`, `.paw`
- No path separators (`/`, `\`)

**Normalization Process:**
1. Convert to lowercase
2. Replace spaces with hyphens
3. Replace special characters (except alphanumeric and hyphen) with hyphens
4. Remove invalid characters entirely
5. Collapse consecutive hyphens to single hyphen
6. Trim leading/trailing hyphens
7. Enforce 100 character maximum (truncate if needed)

**Validation Algorithm:**
```typescript
function validateSlug(slug: string): boolean {
  // Check length
  if (slug.length < 1 || slug.length > 100) return false;
  
  // Check format (only lowercase, numbers, hyphens)
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  
  // Check no leading/trailing hyphens
  if (slug.startsWith('-') || slug.endsWith('-')) return false;
  
  // Check no consecutive hyphens
  if (slug.includes('--')) return false;
  
  // Check not reserved
  const reserved = ['.', '..', 'node_modules', '.git', '.paw'];
  if (reserved.includes(slug)) return false;
  
  return true;
}
```

**Maximum Length Recommendation:**
- Feature slugs limited to 100 characters for:
  - Combined path length constraints (Windows MAX_PATH = 260)
  - Readability and usability
  - Git branch name practicality
  - Marketplace extension name limits

**Evidence:** paw-specification.md Feature Slug section defines normalization and validation rules; cross-platform constraints from POSIX/Windows filesystem documentation

## Open Unknowns

None. All internal questions were answered through examination of existing PAW artifacts, CodeResearch.md documentation, paw-specification.md, and cross-platform filesystem/Git documentation.

### PAW Directory Structure

**Complete Required Structure After Initialization:**

```
.paw/work/<feature-slug>/
├── WorkflowContext.md          # Required: Centralized workflow parameters
└── prompts/                    # Required: Subdirectory for prompt templates
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

**Artifact Files Created During Workflow (NOT Created at Initialization):**
- `Spec.md` - Created by Spec Agent (Stage 01)
- `SpecResearch.md` - Created by Spec Research Agent (Stage 01)
- `CodeResearch.md` - Created by Code Research Agent (Stage 02)
- `ImplementationPlan.md` - Created by Implementation Plan Agent (Stage 02)
- `Docs.md` - Created by Documenter Agent (Stage 04)

**File Purposes:**

**WorkflowContext.md:**
- Centralized parameter file eliminating repetition across PAW stage invocations
- Contains: Work Title, Feature Slug, Target Branch, GitHub Issue, Remote, Artifact Paths, Additional Inputs
- Format: Markdown with simple field structure (see Question 3)

**Prompt Templates (9 files in `prompts/` subdirectory):**
- Pre-structured markdown files with frontmatter for PAW agent invocation
- Enable quick agent launching with consistent structure
- Include mode identifier and minimal instruction text
- Named with numeric prefix for stage ordering

**Evidence:** paw-specification.md "Repository Layout & Naming" section defines canonical structure; WorkflowContext.md section documents parameter file purpose; Artifacts section lists workflow-created files

---

### Prompt Template Structure

**Nine Required Prompt Template Files:**

1. **01A-spec.prompt.md** - Specification creation (PAW-01A Spec Agent)
2. **01B-spec-research.prompt.md** - Behavioral research (PAW-01B Spec Research Agent)
3. **02A-code-research.prompt.md** - Code analysis (PAW-02A Code Research Agent)
4. **02B-impl-plan.prompt.md** - Implementation planning (PAW-02B Impl Planner)
5. **03A-implement.prompt.md** - Implementation execution (PAW-03A Implementer)
6. **03B-review.prompt.md** - Implementation review (PAW-03B Impl Reviewer)
7. **04-docs.prompt.md** - Documentation generation (PAW-04 Documenter Agent)
8. **05-pr.prompt.md** - Final PR creation (PAW-05 PR Agent)
9. **0X-status.prompt.md** - Status synchronization (PAW-0X Status Agent)

**Exact Frontmatter Structure:**

```yaml
---
mode: '<PAW Agent Identifier>'
---
```

**Required Frontmatter Field:**
- `mode` - PAW agent identifier (e.g., "PAW-01A Spec Agent", "PAW-02A Code Researcher")

**Optional Frontmatter Fields (observed in examples):**
- `model` - Specific model selection (e.g., "Claude Sonnet 4.5 (copilot)")

**Minimal Content Template:**

Each prompt file contains an instruction that references WorkflowContext.md for parameters:

**01A-spec.prompt.md:**
```markdown
---
mode: PAW-01A Spec Agent
---

Create spec from .paw/work/<feature-slug>/WorkflowContext.md
```

**01B-spec-research.prompt.md:**
```markdown
---
mode: PAW-01B Spec Research Agent
---

Answer research questions from .paw/work/<feature-slug>/WorkflowContext.md
```

**02A-code-research.prompt.md:**
```markdown
---
mode: PAW-02A Code Researcher
---

Run code research from .paw/work/<feature-slug>/WorkflowContext.md
```

**02B-impl-plan.prompt.md:**
```markdown
---
mode: PAW-02B Impl Planner
---

Create implementation plan from .paw/work/<feature-slug>/WorkflowContext.md
```

**03A-implement.prompt.md:**
```markdown
---
mode: PAW-03A Implementer
---

Implement phase from .paw/work/<feature-slug>/WorkflowContext.md
```

**03B-review.prompt.md:**
```markdown
---
mode: PAW-03B Impl Reviewer
---

Review implementation from .paw/work/<feature-slug>/WorkflowContext.md
```

**04-docs.prompt.md:**
```markdown
---
mode: PAW-04 Documenter Agent
---

Generate documentation from .paw/work/<feature-slug>/WorkflowContext.md
```

**05-pr.prompt.md:**
```markdown
---
mode: PAW-05 PR Agent
---

Create final PR from .paw/work/<feature-slug>/WorkflowContext.md
```

**0X-status.prompt.md:**
```markdown
---
mode: PAW-0X Status Agent
---

Update status from .paw/work/<feature-slug>/WorkflowContext.md
```

**Evidence:** Existing prompt files in `.paw/work/vscode-extension-init/prompts/` and `.paw/work/paw-directory/prompts/` demonstrate frontmatter structure; paw-specification.md "PAW Prompt Template File Content and Structure" section (from SpecResearch.md) defines standard format

---

### WorkflowContext.md Format

**Exact Format and Required Fields:**

```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>
Target Branch: <target_branch>
GitHub Issue: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

**Field Definitions:**

**Work Title** (Required after Spec stage):
- 2-4 word descriptive name prefixing PR titles
- Generated by Spec Agent or derived from GitHub Issue title / branch name
- Example: "Auth System", "API Refactor", "Bug Fix Rate Limit"

**Feature Slug** (Required):
- Normalized filesystem-safe identifier
- Auto-generated from Work Title when not explicitly provided
- Format: lowercase letters (a-z), numbers (0-9), hyphens (-) only
- Length: 1-100 characters
- Used for artifact directory: `.paw/work/<feature-slug>/`
- Example: "auth-system", "api-refactor-v2", "bug-fix-rate-limit"

**Target Branch** (Required):
- Git branch containing completed work
- User-provided via extension input or derived from current branch
- Example: "feature/add-authentication", "bugfix/rate-limit"

**GitHub Issue** (Optional):
- Full issue URL for tracking
- Format: `https://github.com/{owner}/{repo}/issues/{number}`
- Example: "https://github.com/lossyrob/phased-agent-workflow/issues/35"

**Remote** (Optional, defaults to `origin`):
- Git remote for branch/PR operations
- Default: "origin"
- Example: "origin", "fork", "upstream"

**Artifact Paths** (Optional, auto-derived):
- Default: "auto-derived" (uses `.paw/work/<feature-slug>/<Artifact>.md` pattern)
- Can be explicit paths for non-standard layouts
- Example: "auto-derived" or explicit paths like "custom/path/Spec.md"

**Additional Inputs** (Optional):
- Supplementary documents for research
- Comma-separated list or "none"
- Example: "paw-specification.md, architecture-doc.md" or "none"

**Default Values:**
- Remote: "origin" if omitted
- Artifact Paths: "auto-derived" if omitted
- Additional Inputs: "none" if omitted

**Example Content:**

```markdown
# WorkflowContext

Work Title: VS Code Extension Init
Feature Slug: vscode-extension-init
Target Branch: feature/vscode-extension-init
GitHub Issue: https://github.com/lossyrob/phased-agent-workflow/issues/35
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: paw-specification.md
```

**Evidence:** paw-specification.md "WorkflowContext.md" section defines format and fields; existing `.paw/work/vscode-extension-init/WorkflowContext.md` demonstrates actual usage

---

### Feature Slug Normalization Rules

**Complete Step-by-Step Normalization Process:**

1. **Lowercase Conversion:**
   - Convert all characters to lowercase
   - Example: "MyFeature" → "myfeature"

2. **Space Replacement:**
   - Replace all spaces with hyphens
   - Example: "my feature" → "my-feature"

3. **Special Character Replacement:**
   - Replace special characters (except alphanumeric and hyphens) with hyphens
   - Includes: `!@#$%^&*()_+=[]{}|;:'",.<>?/\`~`
   - Example: "feature (v2)" → "feature--v2-" (before collapse)

4. **Invalid Character Removal:**
   - Remove any remaining invalid characters
   - Valid: lowercase letters (a-z), numbers (0-9), hyphens (-)

5. **Consecutive Hyphen Collapse:**
   - Replace consecutive hyphens with single hyphen
   - Example: "my--feature" → "my-feature"

6. **Leading/Trailing Hyphen Trim:**
   - Remove hyphens from start and end
   - Example: "-myfeature-" → "myfeature"

7. **Length Enforcement:**
   - Truncate to 100 characters maximum if needed
   - Example: 150-char string → 100-char string

**Reserved Names to Avoid:**
- "." (current directory)
- ".." (parent directory)
- "node_modules" (npm convention)
- ".git" (git repository)
- ".paw" (PAW system directory)

**Transformation Examples:**

| Input | Normalized Output |
|-------|------------------|
| "User Authentication System" | "user-authentication-system" |
| "API Refactor v2" | "api-refactor-v2" |
| "Fix: Rate Limit Bug" | "fix-rate-limit-bug" |
| "my_FEATURE--test" | "my-feature-test" |
| "Feature/User Auth!" | "feature-user-auth" |
| "---start---" | "start" |
| ".hidden" | "hidden" |

**Evidence:** paw-specification.md "Feature Slug" section defines normalization rules; "Feature Slug Validation Rules" section in prior SpecResearch.md research documents constraints

---

### Feature Slug Validation Rules

**Complete Validation Constraints:**

**Character Set:**
- MUST contain only: lowercase letters (a-z), numbers (0-9), hyphens (-)
- MUST NOT contain: uppercase letters, spaces, special characters, underscores, periods, slashes

**Length:**
- Minimum: 1 character
- Maximum: 100 characters

**Format Patterns:**
- MUST NOT start with hyphen (-)
- MUST NOT end with hyphen (-)
- MUST NOT contain consecutive hyphens (--)

**Forbidden Values:**
- MUST NOT be: ".", "..", "node_modules", ".git", ".paw"

**Uniqueness:**
- MUST NOT conflict with existing `.paw/work/<slug>/` directory

**Validation Algorithm (TypeScript-style pseudocode):**

```typescript
function validateSlug(slug: string): boolean {
  // Check length
  if (slug.length < 1 || slug.length > 100) return false;
  
  // Check format (only lowercase, numbers, hyphens)
  if (!/^[a-z0-9-]+$/.test(slug)) return false;
  
  // Check no leading/trailing hyphens
  if (slug.startsWith('-') || slug.endsWith('-')) return false;
  
  // Check no consecutive hyphens
  if (slug.includes('--')) return false;
  
  // Check not reserved
  const reserved = ['.', '..', 'node_modules', '.git', '.paw'];
  if (reserved.includes(slug)) return false;
  
  return true;
}
```

**Conflict Resolution:**
- **User-provided slug conflict:** Agent prompts user to choose alternative name
- **Auto-generated slug conflict:** Agent automatically appends numeric suffix (-2, -3, etc.)

**Example Validation Results:**

| Slug | Valid? | Reason |
|------|--------|--------|
| "auth-system" | ✅ Yes | Meets all criteria |
| "api-refactor-v2" | ✅ Yes | Numbers allowed |
| "my-feature-123" | ✅ Yes | Valid format |
| "-myfeature" | ❌ No | Starts with hyphen |
| "myfeature-" | ❌ No | Ends with hyphen |
| "my--feature" | ❌ No | Consecutive hyphens |
| "MyFeature" | ❌ No | Contains uppercase |
| "my_feature" | ❌ No | Contains underscore |
| "." | ❌ No | Reserved name |
| "a" | ✅ Yes | Minimum valid length |
| (101 chars) | ❌ No | Exceeds maximum length |

**Evidence:** paw-specification.md "Feature Slug" section defines validation constraints; prior SpecResearch.md research documents filesystem naming constraints

---

### Work Title Generation

**From GitHub Issue URL (Preferred Method):**

**Process:**
1. Extract issue number from URL: `https://github.com/{owner}/{repo}/issues/{number}`
2. Fetch issue data via GitHub API: `GET /repos/{owner}/{repo}/issues/{number}`
3. Extract `title` field from JSON response
4. Use issue title as Work Title (no transformation needed for display name)

**Example:**
- Issue URL: `https://github.com/lossyrob/phased-agent-workflow/issues/35`
- API Response: `{ "title": "Subtask 1: VS Code Extension - Initial Setup with PAW Initializer and Workflow Context Tool" }`
- Work Title: "VS Code Extension - Initial Setup with PAW Initializer and Workflow Context Tool" (may be shortened for PR prefix)

**From Target Branch Name (Fallback Method):**

**Transformation Rules:**
1. Extract meaningful portion from branch name (remove prefixes like `feature/`, `bugfix/`, `hotfix/`)
2. Split on hyphens, underscores, or slashes
3. Capitalize first letter of each word
4. Join with spaces
5. Limit to 2-4 words for brevity

**Examples:**

| Branch Name | Work Title |
|-------------|-----------|
| "feature/add-authentication" | "Add Authentication" |
| "feature/api-refactor-v2" | "API Refactor V2" |
| "bugfix/rate-limit" | "Rate Limit" |
| "feature/user-auth-system" | "User Auth System" |
| "fix/memory-leak-handler" | "Memory Leak Handler" |

**Prioritization:**
1. If GitHub issue URL provided and API accessible: Use issue title
2. If no issue URL or API fails: Generate from target branch name
3. Log method used for transparency

**Graceful Degradation:**
- API failure (network, rate limit, 404): Fall back to branch name method
- Log warning but continue initialization
- User can manually edit Work Title in WorkflowContext.md after creation

**Evidence:** GitHub Issues API documentation; paw-specification.md "WorkflowContext.md" section defines Work Title field; Issue #35 comment demonstrates architecture preference for agent-driven logic

---

### Git Repository Detection

**Reliable Detection Methods:**

**Method 1: Check for `.git` Directory (File System)**

```typescript
const gitDir = vscode.Uri.joinPath(workspaceUri, '.git');
try {
  await vscode.workspace.fs.stat(gitDir);
  // .git exists → is a git repository
} catch {
  // .git doesn't exist → not a git repository
}
```

**Method 2: Execute `git rev-parse --git-dir` (Git Command)**

```typescript
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

try {
  const { stdout } = await execAsync('git rev-parse --git-dir', { cwd: workspacePath });
  // Exit code 0 and stdout contains path → is a git repository
} catch (error) {
  // Non-zero exit code → not a git repository
}
```

**Method 3: VS Code Git Extension API**

```typescript
const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
const git = gitExtension?.getAPI(1);
if (git && git.repositories.length > 0) {
  // VS Code Git extension has detected repository
}
```

**Recommended Approach for Agent:**
- Agent should use git CLI commands (Method 2) for reliability
- Command: `git rev-parse --git-dir`
- Success (exit 0): Repository exists
- Failure (non-zero): Not a repository or git not installed

**Error Handling:**
- If not a repository: Display error "PAW requires a Git repository. Initialize Git first."
- Offer action: "Initialize Git" → run `git init` in workspace root
- Allow user to cancel initialization

**Evidence:** VS Code Extension API documentation for workspace.fs; git CLI documentation for rev-parse; existing PAW implementations use git CLI for reliability

---

### Uncommitted Changes Detection

**Detection Method: `git status --porcelain`**

**Command:**
```bash
git status --porcelain
```

**Expected Output Formats:**

**No Changes (Empty Output):**
```
(empty string)
```

**Uncommitted Changes Present:**
```
 M file1.txt
?? file2.txt
A  file3.txt
D  file4.txt
```

**Porcelain Format Codes:**
- ` M` - Modified, not staged
- `M ` - Modified, staged
- `MM` - Modified, staged and modified again
- `A ` - Added, staged
- `D ` - Deleted, staged
- `??` - Untracked
- `!!` - Ignored

**Detection Logic:**

```typescript
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function hasUncommittedChanges(workspacePath: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync('git status --porcelain', { cwd: workspacePath });
    return stdout.trim().length > 0;
  } catch (error) {
    // Handle git command failure
    throw new Error('Failed to check git status');
  }
}
```

**Integration with VS Code Git Extension (Alternative):**

```typescript
const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
const git = gitExtension?.getAPI(1);
const repository = git?.repositories[0];
if (repository) {
  const changes = repository.state.workingTreeChanges.length > 0 ||
                  repository.state.indexChanges.length > 0;
  // changes = true if uncommitted changes exist
}
```

**Recommended Approach for Agent:**
- Use `git status --porcelain` for simplicity and reliability
- Check if output is non-empty
- If changes detected: Warn user before branch creation
- Require explicit confirmation to proceed

**Warning Message Example:**
"The workspace has uncommitted changes. Creating a new branch now may cause conflicts. Do you want to commit, stash, or continue anyway?"

**Evidence:** git documentation for status --porcelain format; VS Code Git extension API for repository state; existing PAW implementations use git CLI for consistency

---

### Agent Mode Invocation

**Exact API Signature:**

```typescript
vscode.commands.executeCommand(
  "workbench.action.chat.open",
  {
    query: string,      // Required: Prompt text to send to agent
    mode: "agent"       // Required: Invoke in agent mode
  }
): Thenable<void>
```

**Required Parameters:**

**`query` (string):**
- The complete prompt text containing instructions for the agent
- Should include all context, parameters, and step-by-step instructions
- Can be multi-line markdown text
- Example: "Create PAW work item structure in `.paw/work/auth-system/` with WorkflowContext.md containing..."

**`mode` (string):**
- Must be `"agent"` to invoke agent mode (vs normal chat)
- Ensures Copilot processes request through agent workflow rather than conversational mode

**Optional Parameters:**
- None documented for basic agent invocation
- Future versions may support additional options

**Return Value / Behavior:**
- Returns `Thenable<void>` (Promise-like)
- Resolves when chat panel opens (does not wait for agent completion)
- Agent execution is asynchronous and independent
- No programmatic access to agent response or completion status

**Extension cannot:**
- Wait for agent to complete task
- Receive agent output programmatically
- Verify agent success/failure in code
- Access files created by agent directly

**Extension can:**
- Open chat panel with pre-filled prompt
- Provide comprehensive instructions in query parameter
- Log invocation to output channel for user visibility

**Usage Pattern:**

```typescript
const prompt = `
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

**Evidence:** Issue #35 comment demonstrates API usage; VS Code Copilot documentation for workbench.action.chat.open command; GitHub Issue comment shows exact signature

---

### Output Channel Logging

**Creation API:**

```typescript
const outputChannel = vscode.window.createOutputChannel('PAW Workflow');
```

**Parameters:**
- `name` (string): Channel name shown in Output panel dropdown
- Returns: `OutputChannel` object with write methods

**Write Methods:**

**`append(value: string)`:**
- Appends text without newline
- Use for partial messages or streaming output

**`appendLine(value: string)`:**
- Appends text with newline
- Use for complete log entries

**`clear()`:**
- Clears all content from channel

**`show(preserveFocus?: boolean)`:**
- Shows Output panel and selects this channel
- `preserveFocus=true`: Show without stealing focus

**`hide()`:**
- Hides Output panel

**`dispose()`:**
- Disposes channel (cleanup on deactivation)

**Best Practices:**

**1. Timestamp Formatting:**
```typescript
function logWithTimestamp(channel: vscode.OutputChannel, message: string) {
  const timestamp = new Date().toISOString();
  channel.appendLine(`[${timestamp}] ${message}`);
}
```

**2. Log Levels (Manual Implementation):**
```typescript
enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

function log(channel: vscode.OutputChannel, level: LogLevel, message: string) {
  const timestamp = new Date().toISOString();
  channel.appendLine(`[${timestamp}] [${level}] ${message}`);
}
```

**3. Lifecycle Management:**
```typescript
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('PAW Workflow');
  context.subscriptions.push(outputChannel); // Auto-dispose on deactivation
  
  outputChannel.appendLine('PAW Workflow extension activated');
  
  return { outputChannel };
}
```

**4. Visibility Control:**
```typescript
// Show on errors
outputChannel.show(true); // preserveFocus=true

// Show for important operations
outputChannel.show(); // steal focus for critical info
```

**Recommended Logging Pattern:**

```typescript
class Logger {
  constructor(private channel: vscode.OutputChannel) {}
  
  info(message: string) {
    const timestamp = new Date().toISOString();
    this.channel.appendLine(`[${timestamp}] INFO: ${message}`);
  }
  
  warn(message: string) {
    const timestamp = new Date().toISOString();
    this.channel.appendLine(`[${timestamp}] WARN: ${message}`);
  }
  
  error(message: string) {
    const timestamp = new Date().toISOString();
    this.channel.appendLine(`[${timestamp}] ERROR: ${message}`);
    this.channel.show(true); // Show on errors
  }
}
```

**Evidence:** VS Code Extension API documentation for OutputChannel; existing extension patterns demonstrate timestamp and level conventions; CodeResearch.md documents logging best practices

---

## User-Provided External Knowledge (Manual Fill)

The following optional external/context questions are listed for manual completion:

- [ ] **Are there existing VS Code extensions for similar workflow automation that could inform UX patterns?** (e.g., project scaffolding, template generators, workflow tools)

- [ ] **What are best practices for VS Code extension testing frameworks?** (integration vs unit, mocking VS Code API, CI/CD considerations)

- [ ] **Are there specific accessibility requirements for Marketplace extensions?** (keyboard navigation, screen reader support, color contrast)


# 1) Comparable VS Code extensions to borrow UX patterns from

* **Project scaffolding / template generators**

  * *Project Templates* – creates new projects from custom directory templates with placeholders and interactive prompts; good model for “pick a template → confirm variables → generate files/folders.” ([Visual Studio Marketplace][1])
  * *Template Hub* / *Code Template Hub* – manages templates stored in git repos and generates files with variable substitution; nice precedent for a tree view of templates + on-demand generation. ([Visual Studio Marketplace][2])
  * *BoilerPlater* – opinionated boilerplate generator focused on scaffolding entire structures; demonstrates a simple “one command → scaffold” flow. ([Visual Studio Marketplace][3])
  * *Yo* (Yeoman) extension – front-end to Yeoman generators inside VS Code; patterns for palette commands, progress UI, and post-generate “open workspace” prompts. ([Visual Studio Marketplace][4])
  * *Yeoman generator-code* and “Your First Extension” docs – canonical “select template → prompt → scaffold” flow that translates well to custom workflows. ([GitHub][5])

**UX takeaways:** surface commands via the Command Palette, show a quick pick for template/type selection, prompt for variables in sequence, show a progress notification while scaffolding, then offer to open the generated workspace or created files. ([Visual Studio Code][6])

---

# 2) Best practices for VS Code extension testing (frameworks, mocking, CI/CD)

* **Prefer integration tests with the official harnesses.** Use `@vscode/test-electron` for desktop extensions and `@vscode/test-web` for web extensions; these download a VS Code build and run your Mocha tests in an Extension Development Host. ([Visual Studio Code][7])
* **Structure:** generator-code scaffolds a ready-to-run test setup (`src/test/runTest.ts`, `suite/*.test.ts`). Keep tests close to extension code and run via `npm test`. ([Visual Studio Code][7])
* **Unit-level logic:** isolate pure logic for standard unit tests; when you must isolate from the VS Code API, mock only thin seams (commands, workspace FS) with Sinon/Chai. (Community guides show patterns; integration still does the heavy lifting.) ([Microsoft for Developers][8])
* **Webviews:** follow UX guidance; dedicated webview testing is limited—lean on integration tests for message passing plus functional tests in a browser context when using `test-web`. ([Visual Studio Code][9])
* **CI/CD:** run tests on push/PR with GitHub Actions; VS Code docs provide templates and tips (cache VS Code downloads, matrix OS/version). Monitor runs in-editor with the GitHub Actions extension. ([Visual Studio Code][10])

---

# 3) Accessibility requirements that matter on the Marketplace (keyboard, screen readers, contrast)

* **Follow VS Code’s accessibility & UX guidelines** for extension UI: ensure keyboard navigation works everywhere, provide ARIA labels for webview elements, and respect color tokens/themes (including High Contrast). ([Visual Studio Code][9])
* **Screen reader & keyboard support:** VS Code highlights tab-stop order (F6) and screen reader optimization; your contribution points and webviews should be reachable without a mouse and expose semantic roles/labels. ([Microsoft Learn][11])
* **Color/contrast:** don’t hardcode colors in webviews—use themable variables; verify sufficient contrast and support High Contrast themes. ([Visual Studio Code][9])
* **General references and checklists:** official accessibility docs/wiki outline expectations and common assistive tech (NVDA/JAWS/VoiceOver) to test against. ([GitHub][12])

[1]: https://marketplace.visualstudio.com/items?itemName=cantonios.project-templates&utm_source=chatgpt.com "Project Templates - Visual Studio Marketplace"
[2]: https://marketplace.visualstudio.com/items?itemName=SherinJosephRoy.vscode-project-templates&utm_source=chatgpt.com "Template Hub - Visual Studio Marketplace"
[3]: https://marketplace.visualstudio.com/items?itemName=Giovanni-Curry.boilerplater&utm_source=chatgpt.com "BoilerPlater - Visual Studio Marketplace"
[4]: https://marketplace.visualstudio.com/items?itemName=camel-tooling.yo&utm_source=chatgpt.com "yo - Visual Studio Marketplace"
[5]: https://github.com/microsoft/vscode-generator-code?utm_source=chatgpt.com "GitHub - microsoft/vscode-generator-code: Visual Studio Code extension ..."
[6]: https://code.visualstudio.com/api/get-started/your-first-extension?utm_source=chatgpt.com "Your First Extension | Visual Studio Code Extension API"
[7]: https://code.visualstudio.com/api/working-with-extensions/testing-extension?utm_source=chatgpt.com "Testing Extensions | Visual Studio Code Extension API"
[8]: https://devblogs.microsoft.com/ise/testing-vscode-extensions-with-typescript/?utm_source=chatgpt.com "Testing VSCode Extensions with TypeScript - ISE Developer Blog"
[9]: https://code.visualstudio.com/api/ux-guidelines/webviews?utm_source=chatgpt.com "Webviews | Visual Studio Code Extension API"
[10]: https://code.visualstudio.com/api/working-with-extensions/continuous-integration?utm_source=chatgpt.com "Continuous Integration | Visual Studio Code Extension API"
[11]: https://learn.microsoft.com/en-us/shows/vs-code-livestreams/accessibility-in-vs-code?utm_source=chatgpt.com "Accessibility in VS Code | Microsoft Learn"
[12]: https://github.com/microsoft/vscode/wiki/Accessibility-Guidelines?utm_source=chatgpt.com "Accessibility Guidelines · microsoft/vscode Wiki · GitHub"

---

Additional Questions:

### 1. **VS Code Extension Activation Events**

For a command-only extension (i.e., the extension contributes commands and should only activate when a user invokes one of them) you should use:

* `onCommand:<yourCommandId>` in the `activationEvents` array. For example:

  ```json
  "activationEvents": [
    "onCommand:myExtension.doSomething"
  ]
  ```

  This ensures the extension activates **only when** that command is invoked. ([Visual Studio Code][1])
* You should *not* use broad activation events like `*` or `onStartupFinished` because they load the extension at startup (or at window open) and can hurt performance. The docs warn:

  > “It is best practice to activate only when a user needs your extension.” ([Visual Studio Code][1])
* If your extension contributes multiple commands, list each one as its own `onCommand` activation event.
* Avoid using generic events like `onLanguage`, `workspaceContains`, or `onStartupFinished` unless you truly need activation on file opens or workspace conditions.

In summary: for your use-case (scaffolding via a command), use one or more `onCommand:` activation events and nothing else (unless there are other triggers you need). That minimizes startup impact while ensuring the extension is available exactly when needed.

---

### 2. **GitHub API Rate Limiting (Unauthenticated Requests) & Handling Best Practices**

* According to the official GitHub REST API docs: the basic “core” rate-limit for **unauthenticated** requests is **60 requests per hour** per IP address. ([GitHub Docs][2])
* The blog entry also indicates recent changes to unauthenticated rate limits, with GitHub encouraging use of authentication for higher, more reliable quotas. ([GitHub Blog][3])
* Best practices for handling rate limits include:

  * Use **authenticated requests** whenever possible (e.g., via a token, GitHub App) to get higher limits. ([GitHub Docs][4])
  * Respect the HTTP response headers (e.g., `X-RateLimit-Remaining`, `X-RateLimit-Reset`) and if you get a 403 due to rate limit, pause requests until the `reset` time. ([GitHub Docs][4])
  * Avoid frequent polling; use caching or webhooks (where applicable) to reduce API call volume. ([GitHub Docs][4])
  * Handle errors gracefully: if rate-limit exceeded, show a user-friendly message (or retry later) rather than letting the extension crash or hang.
* For your scenario (fetching issue titles), assume you’ll hit the 60/hour cap unless you include authentication and reuse responses (cache result, only fetch when necessary).

---

### 3. **Extension Packaging Requirements: Minimal `package.json` Fields for a Command-only Extension**

For a minimal VS Code extension that registers commands, the essential (required) fields in `package.json` are (based on VS Code extension manifest docs) ([Visual Studio Code][5]):

* `name` (string) — the *name* of the extension; unique under the publisher.
* `publisher` — the publisher id/name. (The docs make it clear that `publisher.name` + `name` form the unique ID of the extension. ([Visual Studio Code][6]))
* `version` — the version of your extension (semver).
* `engines` — at minimum you must specify `"vscode": "<some version constraint>"` so VS Code knows compatibility. ([GitHub][7])
* `activationEvents` — declare the activation trigger(s), e.g. `["onCommand:myExtension.doSomething"]`.
* `main` or `browser` (depending if it supports web) — the entry point of your extension code (for desktop). Without that VS Code wouldn’t know what to load.
* `contributes` — to register commands you must list the `commands` contribution point under `contributes`, e.g:

  ```json
  "contributes": {
    "commands": [
      {
        "command": "myExtension.doSomething",
        "title": "Do Something",
        "category": "My Extension"
      }
    ]
  }
  ```

So putting that together, a minimal `package.json` could look like:

```json
{
  "name": "my-extension",
  "publisher": "myPublisher",
  "version": "0.0.1",
  "engines": {
    "vscode": "^1.70.0"
  },
  "activationEvents": [
    "onCommand:myExtension.doSomething"
  ],
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

You will of course typically include additional metadata (`displayName`, `description`, `repository`, `license`, `categories`, `icon`, etc.) but the above are the *minimum* required fields to register a command-only extension.

---

### 4. **Error Message Best Practices in VS Code Extensions (UX for error presentation)**

When presenting errors in a VS Code extension’s UX, best practices include:

* **Use the right channel for the right severity/context**:

  * For **critical errors** (that block the user from continuing a workflow, e.g., scaffolding failed, Git command failed), show a modal error dialog via `vscode.window.showErrorMessage(...)`. This ensures the user notices the issue.
  * For **non-blocking errors or updates**, use status bar messages or `showWarningMessage`/`showInformationMessage` rather than interrupting.
  * For **detailed diagnostics, logs, or less urgent failures**, write to an Output Channel (via `vscode.window.createOutputChannel`) or log to the Extension Host, so the user can inspect details without being interrupted.
* **Provide actionable messages**:

  * Error messages should clearly explain *what happened*, *why it happened*, and *what the user can do next*. Avoid generic “Something went wrong.”
  * Where relevant, include a clickable link or button to view logs, retry, open documentation, or report the issue.
* **Avoid spamming the user**:

  * Don’t flood the user with repeated modal dialogs on minor issues. Use status bar or output channel for repeated/non-critical notifications.
* **Respect performance and workflows**:

  * For background operations (scaffolding, network calls, Git operations), if something fails silently, log in output rather than leave the user guessing.
  * If the error is recoverable (e.g., Git branch exists), present a non-modal prompt with options (e.g., “Use existing branch”, “Create new branch”, “Cancel”) rather than immediate failure.
* **Logging for diagnostics**:

  * Use an Output Channel dedicated to your extension (e.g., `ExtensionName` channel) for stack traces, debug info. This helps users/support diagnose issues. Logging only to the console may lose information.
* **Accessibility and localization**:

  * Ensure error dialogs and messages support screen-readers (they inherit VS Code ribbon UX). Keep error messages short but clear.
  * Consider localizing error strings if you support multiple locales.

Stack Overflow discussions reinforce many of these. ([stackoverflow.com][8])

[1]: https://code.visualstudio.com/api/references/activation-events?utm_source=chatgpt.com "Activation Events | Visual Studio Code Extension API"
[2]: https://docs.github.com/en/actions/reference/limits?utm_source=chatgpt.com "Actions limits - GitHub Docs"
[3]: https://github.blog/changelog/2025-05-08-updated-rate-limits-for-unauthenticated-requests/?utm_source=chatgpt.com "Updated rate limits for unauthenticated requests - The GitHub Blog"
[4]: https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api?utm_source=chatgpt.com "Best practices for using the REST API - GitHub Docs"
[5]: https://code.visualstudio.com/api/references/extension-manifest?utm_source=chatgpt.com "Extension Manifest | Visual Studio Code Extension API"
[6]: https://code.visualstudio.com/api/get-started/extension-anatomy?utm_source=chatgpt.com "Extension Anatomy | Visual Studio Code Extension API"
[7]: https://github.com/microsoft/vscode-extension-samples/blob/main/configuration-sample/package.json?utm_source=chatgpt.com "vscode-extension-samples/configuration-sample/package.json at main ..."
[8]: https://stackoverflow.com/questions/67014002/error-handling-in-extensions-to-visual-studio-code?utm_source=chatgpt.com "Error handling in extensions to visual studio code"
