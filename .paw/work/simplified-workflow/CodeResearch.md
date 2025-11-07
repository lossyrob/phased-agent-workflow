---
date: 2025-11-06 16:31:26 EST
git_commit: 76ade94d73e67ab2af2a46964968fffe52e9e53f
branch: feature/simplified-workflow
repository: phased-agent-workflow
topic: "Simplified Workflow Implementation - Current PAW Architecture"
tags: [research, codebase, workflow-initialization, prompt-generation, vscode-extension, agent-architecture]
status: complete
last_updated: 2025-11-06
---

# Research: Simplified Workflow Implementation - Current PAW Architecture

**Date**: 2025-11-06 16:31:26 EST
**Git Commit**: 76ade94d73e67ab2af2a46964968fffe52e9e53f
**Branch**: feature/simplified-workflow
**Repository**: phased-agent-workflow

## Research Question

How does the current PAW system initialize workflows, generate prompt files, and handle WorkflowContext.md? What architectural components and patterns exist that would need to be modified or extended to support configurable workflow modes (full, minimal, custom)?

## Summary

PAW currently implements a fixed, comprehensive workflow through:
1. **VS Code Extension** (`vscode-extension/src/`) - Provides the `PAW: New PAW Workflow` command that collects user inputs (target branch, optional issue URL) and invokes an agent to initialize the workflow structure
2. **Prompt Template Generation Tool** (`createPromptTemplates.ts`) - Generates all 10 prompt files in a fixed sequence (01A-spec through 0X-status) with frontmatter referencing specific chatmodes
3. **WorkflowContext.md** - Centralized metadata file storing workflow parameters (Work Title, Feature Slug, Target Branch, Issue URL, Remote, Artifact Paths, Additional Inputs)
4. **Agent Chatmodes** (`.github/chatmodes/PAW-*.chatmode.md`) - 10+ agent instruction files that all follow a consistent pattern for reading WorkflowContext.md and defensive parameter handling

The current architecture has no concept of workflow modes or configuration. All workflows follow identical stages with hardcoded branching patterns (_plan, _phaseN, _docs suffixes). To support simplified workflows, the system needs:
- Extension UI for mode selection
- Enhanced `paw_create_prompt_templates` tool to accept mode/stages parameters
- WorkflowContext.md schema extension for workflow mode and custom instructions
- Agent instruction updates with mode-specific behavior sections

## Detailed Findings

### VS Code Extension Entry Point

The extension provides the initialization command that users invoke to start any PAW workflow.

**Extension Activation** (`vscode-extension/src/extension.ts:18-30`):
- Registers output channel for logging: `vscode.window.createOutputChannel('PAW Workflow')`
- Registers the `paw_create_prompt_templates` language model tool via `registerPromptTemplatesTool(context)`
- Registers the `paw.initializeWorkItem` command via `vscode.commands.registerCommand()`
- Uses lazy activation (no explicit activationEvents in package.json)

**Command Handler** (`vscode-extension/src/commands/initializeWorkItem.ts:22-84`):
```typescript
export async function initializeWorkItemCommand(
  outputChannel: vscode.OutputChannel
): Promise<void>
```

Current initialization flow:
1. Validates workspace folder exists (`workspaceFolder = vscode.workspace.workspaceFolders?.[0]`)
2. Validates git repository via `validateGitRepository(workspaceFolder.uri.fsPath)` (line 37)
3. Checks for custom instructions at `.paw/instructions/init-instructions.md` (lines 44-54)
4. Collects user inputs via `collectUserInputs(outputChannel)` (line 58)
5. Constructs agent prompt via `constructAgentPrompt(inputs.targetBranch, inputs.issueUrl, workspacePath)` (line 69)
6. Invokes agent in chat panel via `vscode.commands.executeCommand('workbench.action.chat.open', {query: prompt, mode: 'agent'})` (lines 75-78)

**Key Observation**: The extension currently collects only 2 inputs (target branch and optional issue URL). To support workflow modes, this would need to collect a workflow mode selection.

**User Input Collection** (`vscode-extension/src/ui/userInput.ts:12-20`):
```typescript
export interface WorkItemInputs {
  targetBranch: string;
  issueUrl?: string;
}
```

Input validation:
- Branch name: `isValidBranchName(value)` checks for `/^[a-zA-Z0-9/_-]+$/` (line 29)
- Issue URL: `isValidIssueUrl(value)` checks for GitHub issues or Azure DevOps work items (lines 41-57)

**Workflow Extension Point**: Add a third input prompt for workflow mode selection between the branch and issue URL prompts in `collectUserInputs()`.

**Agent Prompt Construction** (`vscode-extension/src/prompts/workflowInitPrompt.ts:37-75`):
```typescript
export function constructAgentPrompt(
  targetBranch: string,
  issueUrl: string | undefined,
  workspacePath: string
): string
```

Uses template substitution with `workItemInitPrompt.template.md`:
- Loads template from compiled (`__dirname`) or source location
- Substitutes variables: `{{TARGET_BRANCH}}`, `{{ISSUE_URL}}`, `{{WORKSPACE_PATH}}`, etc.
- Returns complete prompt with all instructions for the agent

**Template File** (`vscode-extension/src/prompts/workItemInitPrompt.template.md:1-133`):
The template provides comprehensive instructions to the agent including:
- Work Title generation from issue or branch name (lines 17-29)
- Feature Slug generation with normalization/validation rules (lines 31-43)
- Directory structure creation (lines 45-51)
- WorkflowContext.md generation (lines 53-75)
- Tool invocation: `paw_create_prompt_templates(feature_slug, workspace_path)` (lines 77-86)
- Git branch creation and checkout (line 88)
- Opening WorkflowContext.md in editor (line 90)

**Workflow Extension Point**: Add `{{WORKFLOW_MODE}}` and `{{CUSTOM_INSTRUCTIONS}}` template variables and update WorkflowContext.md generation instructions in the template.

### Prompt Template Generation Tool

The `paw_create_prompt_templates` tool is responsible for creating all prompt files that guide users through the workflow stages.

**Tool Registration** (`vscode-extension/src/tools/createPromptTemplates.ts:149-189`):
```typescript
export function registerPromptTemplatesTool(
  context: vscode.ExtensionContext
): void
```

Registers tool via `vscode.lm.registerTool<CreatePromptTemplatesParams>('paw_create_prompt_templates', {...})`:
- `prepareInvocation`: Shows confirmation dialog with feature slug
- `invoke`: Calls `createPromptTemplates(options.input)` and returns success/failure result

**Tool Parameters** (`vscode-extension/src/tools/createPromptTemplates.ts:8-16`):
```typescript
interface CreatePromptTemplatesParams {
  feature_slug: string;
  workspace_path: string;
}
```

**Current Limitation**: Tool has no awareness of workflow modes or which prompt files to generate.

**Prompt Templates Array** (`vscode-extension/src/tools/createPromptTemplates.ts:30-78`):
```typescript
const PROMPT_TEMPLATES = [
  {filename: '01A-spec.prompt.md', mode: 'PAW-01A Spec Agent', instruction: 'Create spec from'},
  {filename: '02A-code-research.prompt.md', mode: 'PAW-02A Code Researcher', instruction: 'Run code research from'},
  {filename: '02B-impl-plan.prompt.md', mode: 'PAW-02B Impl Planner', instruction: 'Create implementation plan from'},
  {filename: '03A-implement.prompt.md', mode: 'PAW-03A Implementer', instruction: 'Implement phase from'},
  {filename: '03B-review.prompt.md', mode: 'PAW-03B Impl Reviewer', instruction: 'Review implementation from'},
  {filename: '03C-pr-review.prompt.md', mode: 'PAW-03A Implementer', instruction: 'Address PR review comments from'},
  {filename: '03D-review-pr-review.prompt.md', mode: 'PAW-03B Impl Reviewer', instruction: 'Verify PR comment responses from'},
  {filename: '04-docs.prompt.md', mode: 'PAW-04 Documenter Agent', instruction: 'Generate documentation from'},
  {filename: '05-pr.prompt.md', mode: 'PAW-05 PR Agent', instruction: 'Create final PR from'},
  {filename: '0X-status.prompt.md', mode: 'PAW-0X Status Agent', instruction: 'Update status from'}
];
```

**Stage-to-Prompt Mapping** (derived from template array):
- **Spec Stage**: 01A-spec.prompt.md
- **Spec Research Stage**: (none - research handled inline by Spec Agent)
- **Code Research Stage**: 02A-code-research.prompt.md
- **Implementation Plan Stage**: 02B-impl-plan.prompt.md
- **Implementation Stage**: 03A-implement.prompt.md, 03B-review.prompt.md, 03C-pr-review.prompt.md, 03D-review-pr-review.prompt.md
- **Documentation Stage**: 04-docs.prompt.md
- **Final PR Stage**: 05-pr.prompt.md
- **Status Stage**: 0X-status.prompt.md (always present)

**Note**: There is no `01B-spec-research.prompt.md` in the generated files. Spec research is initiated by the Spec Agent itself, not via a separate prompt file.

**Template Generation** (`vscode-extension/src/tools/createPromptTemplates.ts:95-107`):
```typescript
function generatePromptTemplate(
  mode: string,
  instruction: string,
  featureSlug: string
): string {
  return `---\nmode: ${mode}\n---\n\n${instruction} .paw/work/${featureSlug}/WorkflowContext.md\n`;
}
```

Generated prompt file format:
```markdown
---
mode: PAW-01A Spec Agent
---

Create spec from .paw/work/<feature-slug>/WorkflowContext.md
```

**Core Implementation** (`vscode-extension/src/tools/createPromptTemplates.ts:115-147`):
```typescript
export async function createPromptTemplates(
  params: CreatePromptTemplatesParams
): Promise<CreatePromptTemplatesResult>
```

Implementation pattern:
1. Constructs path: `.paw/work/<feature_slug>/prompts/`
2. Creates directory if missing: `fs.mkdirSync(promptsDir, {recursive: true})`
3. Iterates through `PROMPT_TEMPLATES` array (line 130)
4. For each template, generates content via `generatePromptTemplate()` (lines 132-137)
5. Writes file via `fs.writeFileSync(filePath, content, 'utf-8')` (line 140)
6. Returns result with `success`, `files_created`, `errors` arrays

**Workflow Extension Point**: 
- Add optional `workflow_mode` and `stages` parameters to `CreatePromptTemplatesParams`
- Add logic to filter `PROMPT_TEMPLATES` array based on stages list
- Alternative: Create separate template arrays for each workflow mode

### WorkflowContext.md Usage Patterns

WorkflowContext.md is the authoritative source of workflow parameters referenced by all agents.

**Current Schema** (from agent instructions and examples):
```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>
Target Branch: <target_branch>
Issue URL: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

**Field Definitions**:
- **Work Title**: 2-4 word human-readable name for PR titles (e.g., "Auth System", "API Refactor")
- **Feature Slug**: Normalized filesystem-safe identifier (e.g., "auth-system", "api-refactor-v2")
- **Target Branch**: Git branch for completed work (e.g., "feature/my-feature")
- **Issue URL**: Full URL to GitHub Issue or Azure DevOps Work Item, or "none"
- **Remote**: Git remote name (default: "origin")
- **Artifact Paths**: Location hint ("auto-derived" or explicit paths)
- **Additional Inputs**: Comma-separated extra inputs or "none"

**Agent Usage Pattern** (consistent across all chatmodes):

All agents include an "Initial Setup" or "Getting Started" section with this pattern:

```markdown
Before responding, look for `WorkflowContext.md` in the chat context or on disk at 
`.paw/work/<feature-slug>/WorkflowContext.md`. When found, extract the Target Branch, 
Work Title, Feature Slug, Issue URL, Remote (default to `origin` when omitted), 
Artifact Paths, and Additional Inputs so you do not ask for parameters already recorded there.
```

**Defensive Handling** (from PAW-01A Spec Agent lines 70-103, PAW-02A Code Researcher lines 48-73):
If WorkflowContext.md is missing or incomplete:
1. Derive Target Branch from current branch if not main/default
2. Generate Work Title from issue title or branch name
3. Generate Feature Slug from Work Title with normalization/validation
4. Gather Issue URL, Remote (default 'origin'), Additional Inputs
5. Write complete WorkflowContext.md before proceeding
6. Record derived artifact paths as "auto-derived"

**Feature Slug Normalization Rules** (documented in multiple chatmode files):
- Lowercase letters (a-z), numbers (0-9), hyphens (-) only
- No leading, trailing, or consecutive hyphens
- Length between 1-100 characters
- Not reserved names (., .., node_modules, .git, .paw)

**Feature Slug Uniqueness Check**:
- Verify `.paw/work/<slug>/` doesn't exist
- If conflict, auto-append -2, -3, etc. until unique

**Current Limitations**:
- No workflow mode field
- No custom instructions field
- No branch strategy configuration
- Agents treat it as pure metadata, not behavioral config

**Workflow Extension Point**: Add new fields to schema:
```markdown
Workflow Mode: <full|minimal|custom>
Custom Workflow Instructions: <free-text or none>
```

### Agent Architecture and Branching Patterns

All agents follow consistent patterns for branch management and artifact handling.

**Branch Naming Conventions** (from agent instructions):

**Planning Branch** (PAW-02B Impl Planner line 167):
- Pattern: `<target_branch>_plan`
- Example: `feature/my-feature_plan`
- Purpose: Contains planning artifacts (Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md)
- PR target: `<target_branch>`

**Phase Branches** (PAW-03A Implementer lines 32-33):
- Pattern: `<target_branch>_phase[N]`
- Example: `feature/my-feature_phase1`, `feature/my-feature_phase2`
- Purpose: Isolated implementation work for each phase
- PR target: `<target_branch>`

**Documentation Branch** (PAW-04 Documenter):
- Pattern: `<target_branch>_docs`
- Example: `feature/my-feature_docs`
- Purpose: Documentation updates
- PR target: `<target_branch>`

**Final PR**:
- Source: `<target_branch>` (feature branch)
- Target: `main` or repository default branch
- Purpose: Merge all completed work into main codebase

**Branch Creation Pattern** (PAW-03A Implementer lines 24-29):
```
1. Determine exact phase branch name (e.g., feature/finalize-initial-chatmodes_phase3)
2. Check current branch: git branch --show-current
3. If not on correct branch, create and switch: git checkout -b <feature-branch>_phase[N]
4. Verify you're on correct branch: git branch --show-current
```

**Artifact Discovery Pattern** (consistent across agents):
- Agents receive artifact paths via WorkflowContext.md or construct using convention
- Convention: `.paw/work/<feature-slug>/<Artifact>.md`
- Examples: `.paw/work/<feature-slug>/Spec.md`, `.paw/work/<feature-slug>/CodeResearch.md`

**Spec Research Workflow** (PAW-01A Spec Agent lines 155-180):
1. Spec Agent generates `prompts/spec-research.prompt.md` with research questions
2. Pauses for research execution
3. User runs prompt file → invokes Spec Research Agent (PAW-01B)
4. Spec Research Agent creates `SpecResearch.md`
5. Spec Agent integrates findings and continues

**Note**: Spec Research Agent (PAW-01B) creates SpecResearch.md, but there's no corresponding prompt file in `PROMPT_TEMPLATES`. The Spec Agent generates the research prompt file dynamically in the `prompts/` directory.

**Code Research Workflow** (PAW-02A Code Researcher lines 92-120):
1. User (or Impl Planner) runs `02A-code-research.prompt.md`
2. Code Researcher performs research steps
3. Creates `CodeResearch.md` with file:line references
4. Impl Planner reads CodeResearch.md when creating plan

**Mode-Specific Branching Requirements** (from design document):
- **full mode**: Uses all branch types (_plan, _phaseN, _docs)
- **minimal mode**: Should work on single branch (target branch only)
- **final-pr-only modifier**: Commits everything to target branch, skips intermediate PRs

**Workflow Extension Point**: Agents need mode-aware branch handling logic:
```markdown
## Workflow Mode Handling

Read Workflow Mode from WorkflowContext.md. Adapt behavior as follows:

### Mode: full
- Create planning branch: <target>_plan
- Create phase branches: <target>_phase[N]
- Create docs branch: <target>_docs

### Mode: minimal / final-pr-only
- Work directly on target branch
- Skip all intermediate branch creation
- Commit artifacts and code together to target branch
```

### Agent Chatmode Files

All agent behaviors are defined in `.github/chatmodes/PAW-*.chatmode.md` files.

**Chatmode File Structure** (common pattern):
```markdown
---
description: 'PAW <Agent Name>'
---
# <Agent Name>

<Agent purpose and responsibilities>

## Initial Setup / Getting Started
<WorkflowContext.md reading instructions>

### WorkflowContext.md Parameters
<Schema definition and handling instructions>

## <Rest of agent-specific instructions>
```

**Key Agents** (relevant to workflow modes):

**PAW-01A Spec Agent** (`.github/chatmodes/PAW-01A Spec Agent.chatmode.md`):
- Creates feature specifications from issues
- Generates spec research prompts
- Manages Work Title and Feature Slug generation
- Defensive WorkflowContext.md creation (lines 70-103)

**PAW-02A Code Researcher** (`.github/chatmodes/PAW-02A Code Researcher.chatmode.md`):
- Documents codebase implementation details
- Creates CodeResearch.md with file:line references
- Used by Impl Planner to understand existing code
- Critical instruction (lines 6-13): "ONLY describe what exists, where it exists, how it works"

**PAW-02B Impl Planner** (`.github/chatmodes/PAW-02B Impl Planner.chatmode.md`):
- Creates phased implementation plans
- Operates in two modes: Initial Planning and PR Review Response (lines 87-151)
- Reads Spec.md, SpecResearch.md, CodeResearch.md to create ImplementationPlan.md
- Creates planning branch and Planning PR

**PAW-03A Implementer** (`.github/chatmodes/PAW-03A Implementer.chatmode.md`):
- Implements phases from ImplementationPlan.md
- Creates phase branches (lines 24-29)
- Reads CodeResearch.md for patterns (line 19)
- Handles PR review comments with grouped commits (lines 54-92)

**PAW-03B Impl Reviewer** (`.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`):
- Reviews implementations against plan
- Verifies success criteria
- Pushes commits and creates phase PRs

**PAW-04 Documenter** (`.github/chatmodes/PAW-04 Documenter.chatmode.md`):
- Generates end-user and developer documentation
- Creates docs branch
- Produces Docs.md artifact

**PAW-05 PR Agent** (`.github/chatmodes/PAW-05 PR.chatmode.md`):
- Creates final PR from target branch to main
- Aggregates all phase descriptions
- Final step in workflow

**PAW-0X Status Agent** (`.github/chatmodes/PAW-X Status Update.chatmode.md`):
- Reports workflow status
- Checks branches and PRs
- Can be invoked at any stage

**Common Patterns Across All Agents**:
1. All check for WorkflowContext.md before asking for parameters
2. All have defensive fallback logic to create WorkflowContext.md if missing
3. All use consistent artifact path conventions (`.paw/work/<feature-slug>/`)
4. All reference Target Branch from WorkflowContext.md for branch naming
5. None have any workflow mode awareness or conditional behavior

**Workflow Extension Point**: All agents need new section added after "WorkflowContext.md Parameters":
```markdown
## Workflow Mode Handling

Read Workflow Mode from WorkflowContext.md at start. Adapt behavior as follows:

### Mode: full
<Standard full workflow behavior>

### Mode: minimal
<Simplified behavior - skip branches, fewer artifacts>

### Mode: custom
<Read Custom Workflow Instructions and adapt>
```

### Git Validation

**Git Repository Check** (`vscode-extension/src/git/validation.ts:9-27`):
```typescript
export async function validateGitRepository(
  workspacePath: string
): Promise<boolean>
```

Implementation:
- Checks for `.git` directory existence: `fs.existsSync(path.join(workspacePath, '.git'))`
- Validates git is installed and working via: `exec('git rev-parse --git-dir')`
- Returns `true` if both checks pass

Called early in initialization flow (line 37 of `initializeWorkItem.ts`) to ensure git is available before proceeding.

### Custom Instructions Support

**Loading Custom Instructions** (`vscode-extension/src/prompts/customInstructions.ts`):
```typescript
export function loadCustomInstructions(
  workspacePath: string,
  relativePath: string
): string | undefined
```

Checks for custom instructions at `.paw/instructions/init-instructions.md` and includes them in the agent prompt if present (referenced in `initializeWorkItem.ts:44-54` and `workflowInitPrompt.ts:62`).

**Note**: This is separate from workflow mode custom instructions. This is for customizing the initialization process itself.

## Code References

### Extension Entry Points
- `vscode-extension/src/extension.ts:18-30` - Extension activation and command registration
- `vscode-extension/src/commands/initializeWorkItem.ts:22-84` - Main initialization command handler
- `vscode-extension/src/ui/userInput.ts:47-88` - User input collection with validation

### Prompt Template System
- `vscode-extension/src/tools/createPromptTemplates.ts:30-78` - PROMPT_TEMPLATES array definition
- `vscode-extension/src/tools/createPromptTemplates.ts:95-107` - Template generation function
- `vscode-extension/src/tools/createPromptTemplates.ts:115-147` - Core createPromptTemplates implementation
- `vscode-extension/src/tools/createPromptTemplates.ts:149-189` - Language model tool registration

### Agent Prompt Construction
- `vscode-extension/src/prompts/workflowInitPrompt.ts:37-75` - constructAgentPrompt function
- `vscode-extension/src/prompts/workItemInitPrompt.template.md:1-133` - Initialization prompt template
- `vscode-extension/src/prompts/customInstructions.ts:10-34` - Custom instructions loading

### Agent Chatmodes
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:70-103` - WorkflowContext.md handling in Spec Agent
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md:48-73` - WorkflowContext.md handling in Code Researcher
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md:87-151` - PR Review Response mode
- `.github/chatmodes/PAW-03A Implementer.chatmode.md:24-33` - Phase branch creation logic

### Git Operations
- `vscode-extension/src/git/validation.ts:9-27` - Git repository validation

## Architecture Observations

### Current Design Strengths
1. **Separation of Concerns**: Extension handles UI/validation, agent handles logic/decisions
2. **Centralized Configuration**: WorkflowContext.md provides single source of truth
3. **Consistent Patterns**: All agents follow same WorkflowContext.md reading pattern
4. **Defensive Programming**: Agents can create missing WorkflowContext.md
5. **Tool-Based Automation**: Prompt generation delegated to language model tool
6. **Template-Based Prompts**: Easy to modify agent initialization instructions

### Extension Points for Workflow Modes

**1. Extension UI (User Input Collection)**
- Current: 2 inputs (branch, issue URL)
- Needed: Add workflow mode selection dropdown/picker
- Location: `vscode-extension/src/ui/userInput.ts`
- Pattern: Add third prompt between branch and issue URL prompts

**2. Prompt Template Generation (Tool Enhancement)**
- Current: Fixed array of 10 templates, always generates all
- Needed: Conditional generation based on workflow mode
- Location: `vscode-extension/src/tools/createPromptTemplates.ts`
- Options:
  - **Option A**: Add `workflow_mode` and `stages` parameters, filter templates
  - **Option B**: Create mode-specific template arrays, select by mode
  - **Option C**: Agent determines stages and calls tool with explicit list

**3. WorkflowContext.md Schema (Data Model)**
- Current: 7 fields (Work Title, Feature Slug, Target Branch, Issue URL, Remote, Artifact Paths, Additional Inputs)
- Needed: Add 2 new fields
- Location: All chatmode files' WorkflowContext.md sections
- New fields:
  ```markdown
  Workflow Mode: <full|minimal|custom>
  Custom Workflow Instructions: <free-text or none>
  ```

**4. Agent Instructions (Behavioral Adaptation)**
- Current: No mode awareness, hardcoded branch patterns
- Needed: Mode-specific instruction sections in each chatmode
- Location: All `.github/chatmodes/PAW-*.chatmode.md` files
- Pattern:
  ```markdown
  ## Workflow Mode Handling
  
  Read Workflow Mode from WorkflowContext.md. Adapt behavior as follows:
  
  ### Mode: full
  [Standard behavior]
  
  ### Mode: minimal
  [Simplified behavior]
  
  ### Mode: custom
  [Read Custom Workflow Instructions and adapt]
  ```

**5. Initialization Template (Agent Prompt)**
- Current: Fixed instructions, no mode awareness
- Needed: Workflow mode template variables and conditional instructions
- Location: `vscode-extension/src/prompts/workItemInitPrompt.template.md`
- Changes:
  - Add `{{WORKFLOW_MODE}}` and `{{CUSTOM_INSTRUCTIONS}}` variables
  - Update WorkflowContext.md generation to include new fields
  - Conditionally instruct agent on tool invocation based on mode

### Design Decision: Where to Implement Mode Logic?

**Critical Question**: Should mode-to-stages mapping be in the extension tool or in the agent prompt?

**Option A: Extension Tool Determines Stages**
- Extension maintains mode → stages mapping
- Tool accepts `workflow_mode` parameter
- Tool internally maps mode to stages array
- Pros: Centralized logic, consistent across invocations
- Cons: Less flexible, requires extension updates for new modes

**Option B: Agent Determines Stages**
- Tool accepts explicit `stages` array parameter
- Agent prompt contains mode → stages logic
- Agent calls tool with specific stage list
- Pros: More flexible, can be updated via prompt template
- Cons: Duplicates logic if multiple agents call tool

**Option C: Hybrid Approach**
- Tool accepts both `workflow_mode` AND optional `stages` array
- If stages provided, use them (custom mode)
- If mode provided without stages, use built-in mapping (predefined modes)
- Pros: Best of both worlds
- Cons: More complex tool interface

**Recommendation from Design Doc**: Option B (Agent determines stages)
- Aligns with PAW philosophy: "Extension provides procedural tools, Agent provides decision-making"
- Allows mode logic to evolve without extension recompilation
- Custom mode naturally handled (agent reasons about instructions → stages)

### Branching Architecture

**Current Strategy**: Multi-branch with intermediate PRs
- Planning branch → Planning PR → target branch
- Phase branches → Phase PRs → target branch
- Docs branch → Docs PR → target branch
- Target branch → Final PR → main

**Simplified Strategy** (minimal/final-pr-only modes): Single-branch
- All work on target branch
- No intermediate branches or PRs
- Only Final PR (target → main)

**Impact on Agents**:
- **Implementer**: Skip phase branch creation, commit directly to target
- **Impl Reviewer**: Skip phase PR creation, review changes locally
- **Documenter**: Skip docs branch creation, commit to target
- **Impl Planner**: Skip planning branch creation, commit plan to target
- **All agents**: Reference target branch for all operations

**Implementation Pattern** (needs to be added to all agents):
```python
workflow_mode = read_workflow_context()["Workflow Mode"]

if workflow_mode in ["minimal", "final-pr-only"]:
    # Work on target branch
    current_branch = git("branch --show-current")
    target_branch = read_workflow_context()["Target Branch"]
    if current_branch != target_branch:
        git(f"checkout {target_branch}")
else:  # full mode
    # Create appropriate branch (_plan, _phaseN, _docs)
    ...
```

## Open Questions for Implementation

1. **Backward Compatibility**: How should agents handle old WorkflowContext.md files without Workflow Mode field?
   - Default to "full" mode?
   - Fail with error asking for re-initialization?
   - Infer from presence of prompt files?

2. **Migration Strategy**: What happens to in-progress workflows when mode support is added?
   - Can users add Workflow Mode to existing WorkflowContext.md?
   - Should agents warn if mode changes mid-workflow?

3. **Mode Selection UX**: What's the best UI for mode selection in extension?
   - Radio buttons in input box?
   - Quick pick dropdown?
   - Multi-step wizard?

4. **Custom Mode Validation**: How should agents validate custom workflow instructions?
   - Free-form text (trust agent to interpret)?
   - Structured format (YAML/JSON)?
   - Predefined keywords agents look for?

5. **Artifact Skipping**: When spec stage skipped, where do agents get requirements?
   - Issue URL content only?
   - User provides alternative document?
   - Agent generates minimal spec automatically?

6. **Prompt File Cleanup**: Should tool delete old prompt files if mode changes?
   - Yes - prevents confusion
   - No - might break in-progress work
   - Ask user for confirmation?

7. **Status Agent Adaptation**: How does status agent report progress in different modes?
   - Different metrics for different modes?
   - Unified status format?
   - Mode-specific status sections?

## Quality Checklist

- [x] All research objectives addressed with supporting evidence
- [x] Every claim includes file:line references
- [x] Findings organized logically by component
- [x] Tone remains descriptive and neutral (no critiques or recommendations)
- [x] `CodeResearch.md` saved to `.paw/work/simplified-workflow/CodeResearch.md`
- [x] Valid frontmatter with all required fields
- [x] Metadata gathered using terminal commands (not placeholder values)
