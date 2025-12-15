# Spec Research: Cross-Repository Workflow Supervisor

## Summary

PAW's current single-repository workflow provides a strong foundation for building the Cross-Repository Workflow Supervisor. Key findings:

**Initialization Flow**: The workflow starts via VS Code command, validates workspace and git repository, collects user inputs (branch, mode, strategy, handoff mode, issue URL), constructs an agent prompt with template variables, and delegates all file/git operations to the agent. The supervisor would extend this by detecting multi-root workspaces, identifying git repositories across folders, and invoking supervisor agents instead of standard PAW agents.

**Context Management**: PAW uses `WorkflowContext.md` (simple key-value Markdown) to store workflow parameters. Agents access context via `paw_get_context` tool that searches all workspace folders and returns workspace instructions, user instructions, and workflow context with XML-tagged sections. The tool already supports multi-root workspaces by searching all folders for Work ID directories.

**Agent System**: Agents use a template system with `.agent.md` files, YAML frontmatter, and component expansion. The `paw_call_agent` tool enables inter-agent handoffs by opening new chat sessions with Work ID and optional inline instructions. Work ID resolution automatically searches all workspace folders, making child workflow targeting already functional.

**Standard Artifacts**: PAW stores workflow artifacts in `.paw/work/<feature-slug>/` with standard files (WorkflowContext.md, Spec.md, CodeResearch.md, ImplementationPlan.md, Docs.md). All artifacts are git-committed and version-controlled. The supervisor would use `.paw/multi-work/<work-id>/` for supervisor artifacts while child workflows maintain standard structure in their respective repositories.

**Extensibility**: The current workflow mode system (full/minimal/custom) describes stage selection within single-repository workflows. Cross-repository workflows represent a fundamentally different architecture (workflow type), suggesting a separate UI selection before mode selection. VS Code's multi-root workspace API (`vscode.workspace.workspaceFolders`) and git validation (`git rev-parse --git-dir`) provide the primitives needed for repository detection.

## Agent Notes

The Cross-Repository Workflow Supervisor introduces a new workflow type that coordinates feature work across multiple git repositories in a VS Code multi-root workspace. Key constraints include:
- Supervisor artifacts live in workspace root `.paw/multi-work/` (not in any git repo)
- Child workflows in each repo must function independently as standard PAW workflows
- Context must flow from supervisor to children (scoped excerpts recommended)
- Repository-level sequencing for v1 (not phase-level)
- Integration with existing PAW initialization, agent system, and tooling

The research focuses on understanding current PAW implementation patterns to inform how the supervisor workflow will extend and integrate with the existing system.

## Research Findings

### Question 1: Current PAW Initialization Flow

**Question**: How does the current PAW initialization flow work in `initializeWorkItem` command? What prompts are presented and how is context gathered?

**Answer**: 

The initialization flow is triggered by the `PAW: New PAW Workflow` command registered in the VS Code extension. The flow:

1. **Workspace Validation**: Checks that a workspace folder is open (`vscode.workspace.workspaceFolders?.[0]`)
2. **Git Validation**: Verifies the workspace is a git repository using `git rev-parse --git-dir`
3. **Custom Instructions Check**: Checks for optional custom instructions at `.paw/instructions/init-instructions.md`
4. **User Input Collection**: Gathers parameters via VS Code UI:
   - **Target Branch**: Text input for git branch name, or skip for auto-derivation
   - **Workflow Mode**: Quick pick menu (Full/Minimal/Custom)
   - **Review Strategy**: Quick pick menu (PRs/Local), auto-set to Local for Minimal mode
   - **Handoff Mode**: Quick pick menu (Manual/Semi-Auto/Auto)
   - **Issue URL**: Optional text input for GitHub Issue or Azure DevOps Work Item URL
   - **Custom Instructions**: Text input (required if Custom workflow mode selected)
5. **Prompt Construction**: Builds an agent prompt with all collected parameters and template variables
6. **Agent Invocation**: Opens new chat session with constructed prompt in agent mode

The extension delegates all file operations, git operations, and slug normalization to the agent via the constructed prompt. This keeps extension code minimal and maintainable.

**Evidence**: `src/commands/initializeWorkItem.ts` (full flow), `src/ui/userInput.ts` (input collection), `src/prompts/workflowInitPrompt.ts` (prompt construction)

**Implications**: The supervisor workflow initialization would follow a similar pattern but would need to:
- Detect multi-root workspace instead of single folder
- Present "Workflow Type" selection (Implementation/Cross-Repository/Review)
- Identify which workspace folders are git repositories
- Pass multi-repository context to a supervisor agent instead of standard PAW-01A agent

---

### Question 2: WorkflowContext.md Structure

**Question**: What is the structure of existing workflow context storage (`WorkflowContext.md`)? What fields are required vs. optional?

**Answer**:

`WorkflowContext.md` is a simple key-value Markdown file stored at `.paw/work/<feature-slug>/WorkflowContext.md`. 

**Required Fields**:
- **Work Title**: 2-4 word human-readable name used in PR titles
- **Feature Slug**: Normalized identifier (lowercase letters, numbers, hyphens) used for artifact directory paths
- **Target Branch**: Git branch name where implementation work will be committed
- **Workflow Mode**: `full`, `minimal`, or `custom`
- **Review Strategy**: `prs` or `local`
- **Handoff Mode**: `manual`, `semi-auto`, or `auto`
- **Remote**: Git remote name (default: `origin`)
- **Artifact Paths**: Location hint, usually `auto-derived`

**Optional Fields**:
- **Custom Workflow Instructions**: Free-text description (required when Workflow Mode is `custom`)
- **Initial Prompt**: User's work description (present when no issue URL provided)
- **Issue URL**: GitHub Issue or Azure DevOps Work Item URL, or `none`
- **Additional Inputs**: Comma-separated extra parameters, or `none`

**Format**: Simple line-based format with `Field Name: value` on each line.

**Evidence**: Examined multiple WorkflowContext.md files across `.paw/work/` directories; `src/prompts/workItemInitPrompt.template.md` defines the generated structure

**Implications**: Supervisor workflow will need a similar context file (e.g., `SupervisorContext.md` or `WorkflowContext.md` in `.paw/multi-work/<work-id>/`) with additional fields for multi-repository coordination such as:
- List of affected repositories
- Execution sequence
- Context scope for each child workflow

---

### Question 3: Agent Context Access

**Question**: How do current PAW agents access workspace and work context? What tools/APIs are available?

**Answer**:

Agents access context through two primary mechanisms:

**1. `paw_get_context` Tool** (Language Model Tool):
- Agents call with parameters: `feature_slug` (Work ID) and `agent_name`
- Tool searches all workspace folders for `.paw/work/<feature-slug>/` directory
- Returns formatted response with XML-tagged sections:
  - `<workspace_instructions>`: Content from `.paw/instructions/<agent-name>-instructions.md`
  - `<user_instructions>`: Content from `~/.paw/instructions/<agent-name>-instructions.md`
  - `<workflow_context>`: Raw WorkflowContext.md content in markdown code fence
  - `<handoff_instructions>`: Mode-specific handoff behavior loaded from template files
- Precedence: workspace instructions > user instructions > default agent instructions
- Agents must call this tool as their first step before performing any work

**2. Agent Mode Context Passing**:
- When agents invoke other agents via `paw_call_agent`, they pass `work_id` and optional `inline_instruction`
- New chat session starts with this context
- Target agent receives Work ID and can call `paw_get_context` to load full context

**Multi-Root Workspace Support**:
- Tool searches all workspace folders (`vscode.workspace.workspaceFolders`) to locate Work ID
- Supports test override via `PAW_WORKSPACE_PATH` environment variable
- Throws error if Work ID directory not found in any workspace

**Evidence**: `src/tools/contextTool.ts` (full tool implementation), agent mode instructions

**Implications**: The supervisor workflow can leverage the same tool infrastructure but would need:
- A supervisor-specific context tool or extended parameters to distinguish supervisor context from child workflow context
- Modified workspace resolution to handle `.paw/multi-work/` location
- Ability to pass repository-specific context excerpts when initializing child workflows

---

### Question 4: VS Code Multi-Root Workspace API

**Question**: How does VS Code's multi-root workspace API work? How can we detect git repositories in workspace folders?

**Answer**:

**Multi-Root Workspace Access**:
- API: `vscode.workspace.workspaceFolders` returns an array of `WorkspaceFolder` objects
- Each `WorkspaceFolder` has:
  - `uri`: VS Code URI object (use `.fsPath` to get absolute path)
  - `name`: Folder display name
  - `index`: Position in workspace
- Returns `undefined` when no workspace is open
- Current PAW implementation uses first folder (`workspaceFolders?.[0]`) for single-repo workflows

**Git Repository Detection**:
Current PAW uses two approaches:
1. **Directory Check**: Test for `.git` folder existence using `fs.existsSync(path.join(workspacePath, '.git'))`
2. **Git Command**: Execute `git rev-parse --git-dir` with `cwd` set to workspace path
   - Exit code 0 = valid git repository
   - Non-zero exit code = not a git repository or git not installed

Current implementation in `src/git/validation.ts` uses git command approach for reliability (works in subdirectories and handles various git configurations).

**Evidence**: `vscode.workspace` API documentation, `src/git/validation.ts`, multiple uses across codebase showing workspace folder access patterns

**Implications**: Supervisor workflow initialization would:
- Iterate `vscode.workspace.workspaceFolders` to find all folders
- Run git validation on each folder to identify repositories
- Present list of detected repositories to user for selection
- Store selected repositories in supervisor context file

---

### Question 5: Agent Template Rendering System

**Question**: What is the current agent template rendering system? How are agent prompts generated with context?

**Answer**:

PAW uses a template system for both agent definitions and workflow initialization prompts:

**Agent Template Structure**:
- Agent files stored in `agents/` directory with `.agent.md` extension
- YAML frontmatter with `description` field
- Body contains agent instructions in Markdown
- Component system for shared sections: `agents/components/*.component.md`
- Component placeholders like `{{COMPONENT_NAME}}` are expanded during rendering
- Variable substitution in components (e.g., `{{AGENT_NAME}}` replaced with agent identifier)

**Template Loading and Processing**:
1. `loadAgentTemplates()` reads all `.agent.md` files from `agents/` directory
2. Extracts frontmatter `description` field
3. Loads components from `agents/components/` directory
4. `processAgentTemplate()` expands component placeholders and substitutes variables
5. Returns `AgentTemplate[]` with processed content

**Workflow Initialization Prompts**:
- Template files in `src/prompts/` with `.template.md` extension
- Variable substitution using `{{VARIABLE_NAME}}` syntax
- Conditional sections included based on parameters (e.g., `{{BRANCH_AUTO_DERIVE_SECTION}}`)
- Templates loaded from both compiled (`out/prompts/`) and source (`src/prompts/`) locations

**Current Templates**:
- `workItemInitPrompt.template.md`: Main initialization prompt
- `branchAutoDeriveWithIssue.template.md`: Branch derivation with issue URL
- `branchAutoDeriveWithDescription.template.md`: Branch derivation from description
- `workDescription.template.md`: Work description collection
- Handoff templates: `handoffManual.template.md`, `handoffSemiAuto.template.md`, `handoffAuto.template.md`

**Evidence**: `src/agents/agentTemplateRenderer.ts`, `src/agents/agentTemplates.ts`, `src/prompts/workflowInitPrompt.ts`, agent component files

**Implications**: Supervisor workflow would use similar template approach:
- Create supervisor-specific agent templates (e.g., `SupervisorSpec.agent.md`, `SupervisorPlanner.agent.md`)
- Create initialization prompt template for cross-repository workflows
- Reuse component system for shared sections
- Pass multi-repository context through template variables

---

### Question 6: `paw_call_agent` Tool Functionality

**Question**: How does the `paw_call_agent` tool work? Can it target child workflows in subdirectories?

**Answer**:

**Tool Signature**:
- Parameters: `target_agent` (agent name enum), `work_id` (feature slug), optional `inline_instruction` (free-text context)
- Returns: Empty result (new chat session interrupts current conversation)

**Behavior**:
1. Validates `work_id` format (lowercase letters, numbers, hyphens only)
2. Constructs prompt: `"Work ID: <work_id>\n\n<inline_instruction>"`
3. Opens new chat session via `workbench.action.chat.newChat`
4. Invokes target agent with constructed prompt via `workbench.action.chat.open` with `mode: <target_agent>`

**Work ID Resolution**:
The tool itself only passes the Work ID string. Resolution happens when the target agent calls `paw_get_context`:
- Tool searches all workspace folders for `.paw/work/<work_id>/` directory
- Returns context from whichever workspace contains the Work ID
- Throws error if Work ID not found in any workspace

**Multi-Root Capability**:
Current implementation already supports multi-root workspaces:
- `getWorkspaceFolderPaths()` returns all workspace folders
- `resolveWorkspacePath()` searches all folders for Work ID match
- Child workflows in subdirectories work if they have proper `.paw/work/<work-id>/` structure

**Supported Agent Names** (enum values):
- PAW-01A Specification, PAW-01B Spec Researcher
- PAW-02A Code Researcher, PAW-02B Impl Planner
- PAW-03A Implementer, PAW-03B Impl Reviewer
- PAW-04 Documenter, PAW-05 PR
- PAW-X Status

**Evidence**: `src/tools/handoffTool.ts` (tool implementation), `src/tools/contextTool.ts` (Work ID resolution)

**Implications**: 
- Supervisor can use `paw_call_agent` to invoke standard agents in child repositories
- Child workflows are discovered via standard `.paw/work/<work-id>/` structure in each repository
- No modification needed to support cross-repository handoffs
- Supervisor would pass repository-specific Work IDs and context via `inline_instruction`

---

### Question 7: Standard Artifact Structure

**Question**: What is the existing file structure convention in `.paw/work/<feature-slug>/`? What artifacts are standard across workflows?

**Answer**:

**Standard Directory Structure**:
```
.paw/work/<feature-slug>/
├── WorkflowContext.md           # Required: workflow parameters
├── prompts/                     # Optional: generated prompt files
│   ├── 01B-spec-research.prompt.md
│   ├── 02A-code-research.prompt.md
│   └── ...
├── Spec.md                      # Full mode: feature specification
├── SpecResearch.md              # Full mode: spec research findings
├── CodeResearch.md              # All modes: code mapping
├── ImplementationPlan.md        # All modes: implementation plan
├── ImplementationPlan-UpdateFor-PR-<N>.md  # Optional: plan updates
├── Docs.md                      # Full mode: documentation
└── (other mode-specific artifacts)
```

**Artifact Ownership by Agent**:
- **WorkflowContext.md**: Created by initialization, read by all agents
- **Spec.md**: Created by PAW-01A Specification
- **SpecResearch.md**: Created by PAW-01B Spec Researcher
- **CodeResearch.md**: Created by PAW-02A Code Researcher
- **ImplementationPlan.md**: Created by PAW-02B Impl Planner
- **Docs.md**: Created by PAW-04 Documenter
- **Prompts**: Created by `paw_generate_prompt` tool, edited by user before passing to agents

**Artifact Persistence**:
- All artifacts committed to git and version-controlled
- Stored in target branch, included in PRs for review
- Idempotent updates: agents update artifacts incrementally

**Evidence**: Examined artifact directories across `.paw/work/` folders, `docs/reference/artifacts.md`

**Implications**: Supervisor workflow structure would mirror this pattern:
```
.paw/multi-work/<work-id>/
├── SupervisorContext.md         # Multi-repository parameters
├── prompts/                     # Supervisor-specific prompts
├── CrossRepoSpec.md             # Holistic specification
├── CrossRepoPlan.md             # Execution plan with sequencing
└── Validation.md                # Cross-repository validation
```

Child workflows maintain standard `.paw/work/<child-work-id>/` structure in their respective repositories.

---

### Question 8: Workflow Mode System Extensibility

**Question**: How does the current workflow mode system work? Is it extensible for new workflow types?

**Answer**:

**Current Workflow Mode Values**:
- `full`: All stages (spec → research → planning → implementation → docs → PR)
- `minimal`: Core stages only (skips spec and docs, enforces local strategy)
- `custom`: User-defined stages via custom instructions

**Implementation**:
- Stored as string field in WorkflowContext.md: `Workflow Mode: <value>`
- Collected during initialization via Quick Pick menu in `src/ui/userInput.ts`
- Agents read from WorkflowContext.md via `paw_get_context` tool
- Agents adapt behavior based on mode (skip stages, adjust expectations)

**Extensibility**:
The system is currently a simple string field with no formal enum or validation. Extension points:

1. **UI Layer** (`src/ui/userInput.ts`):
   - Add new Quick Pick options to `collectWorkflowMode()`
   - TypeScript type `WorkflowMode` would need new literal value

2. **Prompt Template** (`src/prompts/workItemInitPrompt.template.md`):
   - Template uses `{{WORKFLOW_MODE}}` variable
   - No special handling of mode values in template logic

3. **Agent Layer**:
   - Agents check mode value from WorkflowContext.md
   - Would need mode-specific logic for new workflow types
   - No centralized mode registry

**Current Limitation**: 
Workflow mode currently describes which stages to execute within a single-repository workflow. It does not describe fundamentally different workflow architectures (like supervisor workflows).

**Evidence**: `src/ui/userInput.ts` (mode collection), `src/prompts/workItemInitPrompt.ts` (prompt construction), agent instructions referencing workflow mode

**Implications**: 
- "Workflow Type" (Implementation/Cross-Repository/Review) is architecturally distinct from "Workflow Mode" (full/minimal/custom)
- Workflow Type selection should be a separate UI prompt before mode selection
- Cross-Repository workflow would have its own mode variations (equivalent to full/minimal/custom)
- Alternative: Create workflow type dropdown first, then route to appropriate initialization flow

---

## Open Unknowns

None - all internal questions successfully answered.

## User-Provided External Knowledge (Manual Fill)

The following questions pertain to external knowledge or development patterns beyond the current PAW implementation. These are optional context questions for manual completion:

- [ ] What are common patterns for coordinating multi-repository features in software development?
- [ ] How do other development tools handle cross-repository workflows?
