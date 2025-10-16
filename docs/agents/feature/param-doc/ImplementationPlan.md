# Centralized Workflow Parameters Implementation Plan

## Overview

Implement a centralized `WorkflowContext.md` parameter file that eliminates repeated parameter declarations across PAW stage prompts by providing a single source of truth for target branch, GitHub issue reference, remote configuration, artifact paths, and optional inputs. Agents will generate and update this file automatically once they have the required information, so developers no longer need to author it manually for the happy path.

## Current State Analysis

### Existing Parameter Mechanisms

Based on `CodeResearch.md` findings:

1. **YAML frontmatter in `.prompt.md` files** - Specifies the `mode` field for chatmode routing (`.github/chatmodes/PAW-*.chatmode.md`)
2. **Inline parameters in prompt bodies** - Target branch, GitHub issue references, artifact paths repeated across individual stage prompt files
3. **Interactive prompts** - Agents request missing parameters through conversation when not found in files

### Parameter Discovery Patterns

Current chatmode behavior (from `CodeResearch.md`):
- **Spec Agent** (`.github/chatmodes/PAW-01A Spec Agent.chatmode.md:24-30`): Discovers target branch from current branch if not specified; requires issue link or description
- **Code Researcher** (`.github/chatmodes/PAW-02A Code Researcher.chatmode.md:62`): Saves to `docs/agents/<target_branch>/CodeResearch.md`
- **Implementation Planner** (`.github/chatmodes/PAW-02B Impl Planner.chatmode.md:11-16`): Checks for parameters (file path or GitHub Issue), prompts if missing
- **Implementation Agent** (`.github/chatmodes/PAW-03A Implementer.chatmode.md:14`): Reads ImplementationPlan.md first to identify phase

### Artifact Path Conventions

Standard pattern: `docs/agents/<target_branch>/[Artifact].md`

Observed artifacts:
- `Spec.md`, `SpecResearch.md`, `CodeResearch.md`, `ImplementationPlan.md`, `Docs.md`
- `prompts/` subdirectory containing `.prompt.md` files

### Branch and Remote Usage

Branch derivatives (from `paw-specification.md:47-50`):
- Planning: `<target_branch>_plan`
- Implementation phases: `<target_branch>_phase<N>` or `<target_branch>_phase<M-N>`
- Documentation: `<target_branch>_docs`

**Remote handling**: Currently no explicit remote parameter exists. Git operations implicitly use default remote (typically `origin`). Developers working against forks need to specify remote in git operations manually.

### Key Constraints

- No programmatic validation exists; agents rely on LLM interpretation of Markdown
- GitHub MCP tools used exclusively for issue/PR interactions (not `gh` CLI)
- Parameters are manually maintained; no automated sync mechanism today (agents will generate and update Markdown directly)

## Desired End State

PAW agents automatically create and maintain `WorkflowContext.md` for a feature branch as soon as sufficient parameters are known (typically by the first agent invoked, e.g., the Spec Agent). Developers may still supply the file manually, but the baseline flow requires no manual authoring. The file follows a documented structure, provides clear error messages when malformed, and supports both standard origin workflows and fork-based development across all stages without repeated parameter entry.

### Verification Criteria

1. **Agent-Driven Creation**: When `WorkflowContext.md` is absent, the active agent (starting with the Spec Agent) writes the file to `docs/agents/<target_branch>/WorkflowContext.md` using discovered parameters without human intervention.
2. **Multi-Stage Usage**: File is successfully referenced in at least three distinct PAW stages (Spec, Code Research, Implementation) without parameter re-entry or manual edits.
3. **Error Handling**: Missing required fields produce clear error messages identifying missing parameters and the responsible agent updates the file after gathering the data.
4. **Fork Support**: Agents persist non-default remotes (e.g., `fork`, `upstream`) in the file and subsequent git operations use the specified remote.
5. **Default Remote**: Omitted remote field defaults to `origin` without user prompts.

## What We're NOT Doing

- Programmatic validation or schema enforcement (agents rely on LLM interpretation)
- Validation of git remote existence before operations (developer responsible for remote configuration)
- Updating existing stage prompt files to reference `WorkflowContext.md` (legacy prompts continue to embed parameters inline when needed)
- Defining precedence rules for conflicting parameters (agents ask for clarification)
- Migrating historical feature branches to use `WorkflowContext.md` (applies to new workflows only)
- Integration with external configuration systems or CI/CD pipelines

## Implementation Approach

The implementation is broken into three distinct phases:

1. **Phase 1**: Update all chatmode instruction files to recognize and extract parameters from WorkflowContext.md, with minimal inline template
2. **Phase 2**: Add Work Title parameter for consistent PR naming across all workflow stages
3. **Phase 3**: Update paw-specification.md to document WorkflowContext.md usage throughout the workflow

This phasing allows each increment to be independently reviewed and merged, with Phase 1 enabling agent support through inline templates, Phase 2 adding PR naming consistency, and Phase 3 completing user-facing documentation.

---

## Phase 1: Update Chatmode Instructions

### Overview

Update all PAW chatmode instruction files to recognize WorkflowContext.md when present in chat context, extract parameters without additional prompts, and automatically create the file (or update it) when it is missing or incomplete. Include a minimal inline template in each chatmode for reference so the agent can write a well-formed document without human input.

### Minimal WorkflowContext.md Format

Each chatmode will reference this minimal format for WorkflowContext.md:

```markdown
# WorkflowContext

Work Title: <work_title>
Target Branch: <target_branch>
GitHub Issue: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

Agents understand parameter meanings from context. Work Title is generated by the Spec Agent and becomes required after the Spec stage is complete. GitHub Issue and all other fields except Target Branch are optional.

### Changes Required

Update all PAW chatmode files (`.github/chatmodes/PAW-*.chatmode.md`) to include the minimal WorkflowContext.md format in their instructions, add parameter extraction logic, and codify automatic creation/update responsibilities.

For each chatmode file:
1. Add the minimal WorkflowContext.md format (shown above) to the initial instructions.
2. Add WorkflowContext.md recognition to the "Start / Initial Response" section.
3. Include parameter extraction logic with validation for required fields.
4. When the file is missing or missing required fields, instruct the agent to gather the data (from branch, prompts, or user-provided info) and write `docs/agents/<target_branch>/WorkflowContext.md` itself before proceeding.
5. Whenever the agent discovers new parameter values (e.g., a GitHub issue or remote), update the existing WorkflowContext.md to keep it authoritative.

**Chatmode files to update:**
- PAW-01A Spec Agent.chatmode.md
- PAW-01B Spec Research Agent.chatmode.md
- PAW-02A Code Researcher.chatmode.md
- PAW-02B Impl Planner.chatmode.md
- PAW-03A Implementer.chatmode.md
- PAW-03B Impl Reviewer.chatmode.md
- PAW-04 Documenter.chatmode.md
- PAW-05 PR.chatmode.md
- PAW-X Status Update.chatmode.md

### Success Criteria

#### Automated Verification:
- [x] All 9 chatmode files updated with inline WorkflowContext.md format and recognition logic
- [ ] No syntax errors in chatmode Markdown files: `markdownlint .github/chatmodes/` (skipped per user request on 2025-10-15)
- [x] Git diff shows expected changes in "Start / Initial Response" sections
- [x] Changes are committed to the feature branch

#### Manual Verification:
- [x] Each chatmode's WorkflowContext.md extraction logic is clear and correct
- [x] Minimal inline template format is consistent across all chatmode files
- [x] Agents explicitly create or update WorkflowContext.md when it is missing or incomplete before continuing their primary workflow
- [x] Parameter validation mentions specific missing fields and instructs the agent to fill them using discovered data
- [x] Remote parameter defaults to 'origin' when omitted
- [x] Instructions are internally consistent across all chatmode files

### Status

Completed (2025-10-15). Updated all nine PAW chatmode instruction files to load, create, and maintain `WorkflowContext.md`, including the shared minimal template, explicit missing-parameter handling, and remote default guidance. Markdownlint was skipped at the user's request; no additional automated checks were required. Ready for Implementation Review Agent once documentation polish is added.

---

## Phase 2: Add Work Title for PR Naming Consistency

### Overview

Add a "Work Title" parameter to WorkflowContext.md that provides a short, descriptive name for the work (e.g., "WorkflowContext", "Auth", "API Refactor"). This title is generated by the Spec Agent during the Spec stage and is used to prefix all PR titles throughout the workflow (Planning PR, Phase PRs, Docs PR, Final PR) with the format `[<Work Title>] ...`. This ensures consistent PR naming and makes it easy to identify related PRs for a feature at a glance.

### Changes Required

#### 1. Update Spec Agent Chatmode - Work Title Generation

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`
**Changes**: Add Work Title generation to the initial WorkflowContext.md creation and update instructions

In the "WorkflowContext.md Parameters" section (after the existing minimal format), add Work Title as the first parameter:

```markdown
### WorkflowContext.md Parameters
- Minimal format to create or update:
```markdown
# WorkflowContext

Work Title: <work_title>
Target Branch: <target_branch>
GitHub Issue: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```
- **Work Title** is a short, descriptive name (2-4 words) for the feature or work that will prefix all PR titles. Generate this from the GitHub Issue title or feature brief when creating WorkflowContext.md. Refine it during spec iterations if needed for clarity. Examples: "WorkflowContext", "Auth System", "API Refactor", "User Profiles".
- If the file is missing or lacks a Target Branch, determine the branch (use the current branch where appropriate), then write `docs/agents/<target_branch>/WorkflowContext.md` before proceeding.
```

In the "Initial Response" section, update the instructions to generate Work Title:

```markdown
When this agent is invoked:

1. **Check if parameters were provided**:
   - If a file path or GitHub Issue reference was provided as a parameter, skip the default message
   - Immediately read any provided files FULLY
   - Generate a Work Title from the issue/brief (2-4 words, e.g., "User Auth", "API Refactor")
   - Begin the research process
```

Add a note in the spec refinement process:

```markdown
### Work Title Refinement

As the spec evolves and becomes clearer, refine the Work Title if needed:
- Keep it concise (2-4 words maximum)
- Make it descriptive enough to identify the feature
- Update WorkflowContext.md if the title changes
- Inform the user when the Work Title is updated
```

#### 2. Update Implementation Plan Agent Chatmode - Planning PR Title Prefix

**File**: `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`
**Changes**: Add Work Title prefix to Planning PR titles

In the "Commit, push, and open/update the Planning PR" section (around line 356), update the PR creation instructions:

```markdown
    - Use the `github mcp` pull-request tools to open or update the Planning PR (`<target_branch>_plan` → `<target_branch>`). Include:
       - **Title**: `[<Work Title>] Planning: <brief description>` where Work Title comes from WorkflowContext.md
       - Summary of the spec, research, and planning deliverables
       - Links to `docs/agents/<target_branch>/Spec.md`, `docs/agents/<target_branch>/SpecResearch.md`, `docs/agents/<target_branch>/CodeResearch.md`, and `docs/agents/<target_branch>/ImplementationPlan.md`
       - Outstanding questions or risks that require human attention (should be zero)
```

#### 3. Update Implementation Review Agent Chatmode - Phase PR Title Prefix

**File**: `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`
**Changes**: Add Work Title prefix to Phase PR titles

In the "Push and open PR" section (around line 121), update the PR creation instructions:

```markdown
   - Open phase PR with description referencing plan
   - **Title**: `[<Work Title>] Phase <N>: <brief description>` where Work Title comes from WorkflowContext.md
   - Include phase objectives, changes made, and testing performed
```

Add a note in the initial instructions about reading WorkflowContext.md:

```markdown
### Work Title for PR Naming

All Phase PRs must be prefixed with the Work Title from WorkflowContext.md:
- Read `docs/agents/<target_branch>/WorkflowContext.md` to get the Work Title
- Format: `[<Work Title>] Phase <N>: <description>`
- Example: `[Auth System] Phase 1: Database schema and migrations`
```

#### 4. Update Documentation Agent Chatmode - Docs PR Title Prefix

**File**: `.github/chatmodes/PAW-04 Documenter.chatmode.md`
**Changes**: Add Work Title prefix to Documentation PR titles

In the "Open docs PR" section (around line 85), update the PR creation instructions:

```markdown
   - Open docs PR with description
   - **Title**: `[<Work Title>] Documentation` where Work Title comes from WorkflowContext.md
   - Include summary of documentation added and reference to ImplementationPlan.md
```

Add a note in the initial instructions:

```markdown
### Work Title for PR Naming

The Documentation PR must be prefixed with the Work Title from WorkflowContext.md:
- Read `docs/agents/<target_branch>/WorkflowContext.md` to get the Work Title
- Format: `[<Work Title>] Documentation`
- Example: `[Auth System] Documentation`
```

#### 5. Update PR Agent Chatmode - Final PR Title Prefix

**File**: `.github/chatmodes/PAW-05 PR.chatmode.md`
**Changes**: Add Work Title prefix to Final PR titles

In the "Open PR" section (around line 161), update the PR creation instructions:

```markdown
   - Open PR from `<target_branch>` → `main` (or specified base)
   - **Title**: `[<Work Title>] <description>` where Work Title comes from WorkflowContext.md
   - Include comprehensive description with links to all artifacts
   - Reference the GitHub Issue if available
```

Add a note in the initial instructions:

```markdown
### Work Title for PR Naming

The Final PR must be prefixed with the Work Title from WorkflowContext.md:
- Read `docs/agents/<target_branch>/WorkflowContext.md` to get the Work Title
- Format: `[<Work Title>] <description>`
- Example: `[Auth System] Add user authentication system`
```

#### 6. Update Phase 1 Minimal Template to Include Work Title

**File**: `.github/chatmodes/PAW-02B Impl Planner.chatmode.md` (and all other chatmodes updated in Phase 1)
**Changes**: Ensure the minimal WorkflowContext.md format includes Work Title

Update the inline template to match the new format:

```markdown
# WorkflowContext

Work Title: <work_title>
Target Branch: <target_branch>
GitHub Issue: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

This change should be applied to all chatmode files updated in Phase 1:
- PAW-01A Spec Agent.chatmode.md
- PAW-01B Spec Research Agent.chatmode.md
- PAW-02A Code Researcher.chatmode.md
- PAW-02B Impl Planner.chatmode.md
- PAW-03A Implementer.chatmode.md
- PAW-03B Impl Reviewer.chatmode.md
- PAW-04 Documenter.chatmode.md
- PAW-05 PR.chatmode.md
- PAW-X Status Update.chatmode.md

### Success Criteria

#### Automated Verification:
- [ ] All 5 chatmode files updated with Work Title prefix instructions for PR titles
- [ ] All 9 chatmode files from Phase 1 updated with Work Title in minimal template format
- [ ] No syntax errors in chatmode Markdown files: `markdownlint .github/chatmodes/`
- [ ] Git diff shows expected changes in PR creation sections
- [ ] Changes are committed to the feature branch

#### Manual Verification:
- [ ] Spec Agent instructions clearly describe Work Title generation (2-4 words, based on issue/brief)
- [ ] Spec Agent instructions include Work Title refinement guidance
- [ ] Implementation Plan Agent instructions prefix Planning PR with `[<Work Title>] Planning: ...`
- [ ] Implementation Review Agent instructions prefix Phase PRs with `[<Work Title>] Phase <N>: ...`
- [ ] Documentation Agent instructions prefix Docs PR with `[<Work Title>] Documentation`
- [ ] PR Agent instructions prefix Final PR with `[<Work Title>] ...`
- [ ] All Work Title references are consistent across chatmode files
- [ ] Work Title appears as the first parameter in all WorkflowContext.md templates
- [ ] Instructions clearly state Work Title is generated by Spec Agent and required after Spec stage

### Status

Not started

---

## Phase 3: Update paw-specification.md Documentation

### Overview

Update the main PAW specification document to introduce WorkflowContext.md (including Work Title), explain its purpose, document its structure, and integrate its usage into the workflow stage descriptions. This phase completes the user-facing documentation.

### Changes Required

#### 1. Add WorkflowContext.md to Repository Layout Section

**File**: `paw-specification.md`
**Changes**: Update the "Repository Layout & Naming" section (around line 11) to include WorkflowContext.md

```markdown
## Repository Layout & Naming

```
/.github/chatmodes                       # chat-mode prompts (final outputs of this work)
  PAW-01A Spec Agent.chatmode.md
  PAW-01B Spec Research Agent.chatmode.md
  PAW-02A Code Research Agent.chatmode.md
  PAW-02B Impl Plan Agent.chatmode.md
  PAW-03A Impl Agent.chatmode.md
  PAW-03B Impl Review Agent.chatmode.md
  PAW-04 Documentation Agent.chatmode.md
  PAW-05 PR Agent.chatmode.md
  PAW-0X Status Agent.chatmode.md

/docs/agents/                   # artifacts created by the PAW process
  <target_branch>/              # e.g., feature/add-authentication or user/rde/bugfix-123
    WorkflowContext.md          # Centralized parameter file (optional)
    prompts/
      spec-research.prompt.md   # Optional: generated by Spec Agent if required, refined by developer
      code-research.prompt.md   # Optional: generated if additional code research is needed
    Spec.md    
    SpecResearch.md
    CodeResearch.md
    ImplementationPlan.md
    Docs.md
```
```

#### 2. Add Prerequisites Section for WorkflowContext.md

**File**: `paw-specification.md`
**Changes**: Update the "Prerequisites" section (around line 60) to mention WorkflowContext.md

```markdown
### Prerequisites

**Inputs:** 

* GitHub Issue if available, otherwise rough brief about the goals of the work.
* A clean branch to track work (e.g., `feature/paw-prompts` or `user/rde/bugfix-123`).

**Human Prerequisite Actions:**

* Create a GitHub Issue if none exists (title, description, links), or write up a brief description of the work that can be pasted into chat.
* Create branch to track work; e.g., `feature/paw-prompts` or `user/rde/bugfix-123`.
* **(Optional)** Create WorkflowContext.md to centralize parameters and eliminate repetition across stages. Refer to the minimal inline format provided in each chatmode instruction for the structure.

**Artifacts:** issue link (optional), branches created, WorkflowContext.md (optional).
```

#### 3. Update Stage 01 Documentation

**File**: `paw-specification.md`
**Changes**: Update "Stage 01 - Specification" inputs section (around line 74) to reference WorkflowContext.md

```markdown
### Stage 01 - Specification

**Agents:** 

* Spec Agent
* Spec Research Agent

**Inputs**:

* **WorkflowContext.md** (optional): If present at `docs/agents/<target_branch>/WorkflowContext.md`, provides target branch, GitHub issue, remote, and additional inputs automatically. Otherwise:
  * GitHub Issue link/ID (or brief describing the work)
  * Target branch name (agent can also discover this from the current branch)
  * Any design documents or traditional feature specs that provide additional context for this or a broader set of related work.

**Outputs**:

* `/docs/agents/<target_branch>/Spec.md`
* `/docs/agents/<target_branch>/prompts/spec-research.prompt.md`
* `/docs/agents/<target_branch>/SpecResearch.md` containing System Behavior answers and a "User-Provided External Knowledge" section listing any optional unanswered external/context questions and user-provided context.

**Human Workflow:**

* Ensure a clean and up-to-date feature branch is checked out locally.
* (Optional) If WorkflowContext.md exists, include it in the chat context when invoking the Spec Agent.
* Ask the Spec Agent to draft the spec, providing the Issue link/ID (or brief describing the work), feature branch name, and any hard constraints.
* The Spec Agent will interactively refine the spec with the developer. It will also provide the `spec-research.prompt.md` file with factual questions about the current system.
* Review and refine `spec-research.prompt.md` to add any additional clarifying questions.
* Run the Spec Research Agent to answer the questions in `spec-research.prompt.md` and produce `SpecResearch.md`. If external research tooling is unavailable, fill (or consciously skip) the "External Knowledge" checklist the agent outputs.
* Iterate with the Spec Agent to refine the spec based on findings from `SpecResearch.md`.
* Continue iterating with the above steps until the spec is clear, complete, and testable.

Note the spec will be committed and pushed to the planning branch (`<target_branch>_plan`) at the end of the next stage.
```

#### 4. Update Stage 02 Documentation

**File**: `paw-specification.md`
**Changes**: Update "Stage 02 - Implementation Plan" inputs section (around line 102) to reference WorkflowContext.md

```markdown
### Stage 02 - Implementation Plan

**Agents:**

* Code Research Agent
* Implementation Plan Agent

**Inputs:**

* **WorkflowContext.md** (optional): If present at `docs/agents/<target_branch>/WorkflowContext.md`, provides target branch, GitHub issue, remote, and artifact paths automatically. Otherwise:
  * Target branch name (agent can also discover this from the current branch)
  * `Spec.md` and `SpecResearch.md` from Stage 01 must be available in the expected location (`/docs/agents/<target_branch>/`), or have their paths provided.

**Outputs:**
* `/docs/agents/<target_branch>/CodeResearch.md`
* `/docs/agents/<target_branch>/ImplementationPlan.md`
* `/docs/agents/<target_branch>/prompts/code-research.prompt.md` (optional)
* Planning PR opened/updated (`<target_branch>_plan` → `<target_branch>`)

**Human Workflow:**
- Ensure feature branch is checked out locally and updated with merged planning branch.
- (Optional) If WorkflowContext.md exists, include it in the chat context when invoking agents.
- Ask the Code Research Agent to map relevant code areas and dependencies based on the Spec and Spec Research documents, producing `CodeResearch.md`.
- Review `CodeResearch.md` for completeness and accuracy. If necessary, create `prompts/code-research.prompt.md` with guidance and run it with the Code Research Agent to regenerate `CodeResearch.md`.
- Ask the Implementation Plan Agent to draft a detailed implementation plan based on the Spec, Spec Research, and Code Research documents.
- Collaborate with the Implementation Plan Agent to refine the plan and answer open questions.
- If the Implementation Plan Agent makes requests for additional research via edits or creation of `code-research.prompt.md`, run the Code Research Agent as needed.
- Continue iterating with the above steps until the plan is clear, complete, and broken into discrete Implementation Phases.
- The Implementation Plan Agent will open or update the Planning PR with the final output documents from Stage 01 and Stage 02.
- The developer will then review the PR and provide feedback or request changes as needed.
- The developer will ask the Implementation Plan Agent to address any review comments.
- The Implementation Plan Agent will address each comment with focused commits.
- The developer will then review the PR again to ensure all comments have been addressed satisfactorily.
- Once the Planning PR is approved, the developer will merge it and update the local target branch.
- If tracking with a GitHub Issue, use the Status Agent to update the Issue with status and links. This can occur when the Planning PR is opened, updated, or merged.
```

#### 5. Update Remaining Stage Documentation

**File**: `paw-specification.md`
**Changes**: Add WorkflowContext.md reference to Stage 03, 04, and 05 inputs sections

For **Stage 03 — Phased Implementation** (around line 144):
```markdown
**Inputs:**

* **WorkflowContext.md** (optional): If present, provides target branch, remote, and ImplementationPlan.md path automatically. Otherwise:
  * Target branch name (agent can also discover this from the current branch)
  * `ImplementationPlan.md` from Stage 02 must be available in the expected location (`/docs/agents/<target_branch>/`), or have its path provided. This provides paths to `Spec.md`, `SpecResearch.md`, along with other related context.
  * The `CodeResearch.md` file.
```

For **Stage 04 — Documentation** (around line 218):
```markdown
**Inputs:**

* **WorkflowContext.md** (optional): If present, provides target branch, remote, and ImplementationPlan.md path automatically. Otherwise:
  * `ImplementationPlan.md` from Stage 02 must be available in the expected location (`/docs/agents/<target_branch>/`), or have its path provided. All Phases must be complete and merged to the target branch, with status updated in the plan.
  * All PRs from the implementation phases (agent can search for these or refer to GitHub Issue).
```

For **Stage 05 — Final PR to `main`** (around line 236):
```markdown
**Inputs:**

* **WorkflowContext.md** (optional): If present, provides target branch, remote, and all artifact paths automatically. Otherwise:
  * Target branch name (agent can also discover this from the current branch)
  * All inputs and outputs from the Stage 04 Documentation stage
```

#### 6. Add New Artifacts Section for WorkflowContext.md

**File**: `paw-specification.md`
**Changes**: Add new section after "Docs.md" artifact section (around line 600)

```markdown
### WorkflowContext.md

The **Workflow Context** document provides centralized parameters for all PAW stages, eliminating the need to re-specify target branch, GitHub issue, remote, and artifact paths across multiple stage invocations.

**Purpose:** Serve as a single source of truth for workflow parameters, reducing repetition and potential inconsistencies when invoking PAW agents.

**Location:** `/docs/agents/<target_branch>/WorkflowContext.md`

**Dependencies:** None (created manually at workflow start or generated by agents when parameters are provided)

#### Core Principle: Single Source of Truth

WorkflowContext.md centralizes all recurring parameters used throughout the PAW workflow:

**What it DOES include:**
- Work Title (short descriptive name, 2-4 words, used to prefix all PR titles; required after Spec stage)
- Target branch name (required)
- GitHub issue reference in URL format (optional, preferred when provided)
- Git remote name for branch and PR operations (optional, defaults to 'origin')
- Artifact paths for Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md (optional, auto-derived if omitted)
- Additional inputs for research stages (optional)

**What it does NOT include:**
- Implementation details or code
- Transient state like current phase or PR numbers
- Agent instructions or chatmode configurations

#### Structure & Content

The document follows a simple Markdown structure with clearly labeled sections:

**Header**
- Document title: "Workflow Context"
- Brief purpose statement

**Parameters Section**
Each parameter includes:
- Parameter name (e.g., "Work Title", "Target Branch")
- Required/Optional indicator
- Description of the parameter's purpose
- Value placeholder or actual value
- Example value
- For optional parameters: default behavior when omitted

**Usage Section**
- Instructions for including the file in chat context
- Quick start guide for creating WorkflowContext.md
- Stage compatibility information

#### Parameter Definitions

**Work Title** (Required after Spec stage)
- Short, descriptive name for the work that prefixes all PR titles
- Format: 2-4 words (e.g., `WorkflowContext`, `Auth System`, `API Refactor`, `User Profiles`)
- Generated by Spec Agent from GitHub Issue title or feature brief
- Can be refined during Spec iterations for clarity
- Used to prefix all PRs: Planning PR, Phase PRs, Docs PR, Final PR
- Example PR titles: `[Auth System] Planning: User authentication implementation`, `[Auth System] Phase 1: Database schema and migrations`, `[Auth System] Documentation`, `[Auth System] Add user authentication system`

**Target Branch** (Required)
- The feature branch serving as the namespace for all workflow artifacts
- Format: Standard git branch name (e.g., `feature/add-authentication`)
- Used by agents to derive artifact paths and branch derivatives

**Remote** (Optional, defaults to 'origin')
- Git remote name for branch and PR operations
- Format: Git remote name (e.g., `origin`, `fork`, `upstream`)
- Useful for fork workflows where developer works against a non-default remote
- When omitted, agents default to 'origin' for all git operations

**GitHub Issue** (Optional, URL format preferred)
- Reference to the driving issue for this workflow
- Format: Full URL (`https://github.com/owner/repo/issues/N`) preferred for repo information
- Used by agents to link artifacts and updates back to the issue when provided

**Artifact Paths** (Optional, auto-derived if omitted)
- Locations of canonical workflow artifacts
- When omitted, agents derive paths using convention: `docs/agents/<target_branch>/<Artifact>.md`
- Can be explicitly specified for non-standard layouts:
  - Spec.md path
  - SpecResearch.md path
  - CodeResearch.md path
  - ImplementationPlan.md path
  - Docs.md path

**Additional Inputs** (Optional)
- Comma-separated list of supplementary documents referenced during research
- Examples: `paw-specification.md`, `docs/architecture.md`
- Use `none` if no additional inputs are needed

#### Creation & Usage

**When to Create:**
- Automatically at the start of a new feature workflow when the Spec Agent (or first invoked agent) has gathered the required parameters
- Manually by a developer when they need to seed or override values before invoking agents

**How to Create:**
1. Allow the active agent to write `docs/agents/<target_branch>/WorkflowContext.md` using the minimal format and discovered parameters.
2. When manual edits are necessary, update the generated file directly (maintaining the documented structure) and commit the changes.
3. Include the file in chat context when invoking any PAW agent so subsequent stages reuse the recorded parameters.

**Work Title Generation:**
- The Spec Agent generates the Work Title from the GitHub Issue title or feature brief
- The title is refined during Spec iterations if needed for clarity
- The Work Title becomes required after the Spec stage is complete
- All subsequent agents use the Work Title to prefix PR titles

**Agent Recognition:**
All PAW agents recognize WorkflowContext.md when included in chat context:
- Agents extract parameters automatically without additional prompts
- If required parameters are missing, agents report which parameters are absent and update the file after acquiring the information
- If the file is absent, the agent that detects the gap gathers the necessary parameters (branch discovery, user-provided details, or existing artifacts) and writes `WorkflowContext.md` before proceeding

#### Quality Standards

A well-formed WorkflowContext.md:
- **Is Complete**: Contains required parameters (target branch; work title after Spec stage)
- **Is Clear**: Uses exact values without ambiguity
- **Is Consistent**: Values match actual branch names and issue references if provided; Work Title is concise (2-4 words)
- **Is Maintained**: Updated when workflow parameters change (e.g., issue reference updates, Work Title refinements during Spec)
```

### Success Criteria

#### Automated Verification:
- [ ] paw-specification.md updated with WorkflowContext.md references in all relevant sections
- [ ] New WorkflowContext.md artifact section added to specification with Work Title documentation
- [ ] No Markdown syntax errors: `markdownlint paw-specification.md`
- [ ] All internal links to WorkflowContext.md are valid
- [ ] Changes are committed to the feature branch

#### Manual Verification:
- [ ] Repository layout diagram accurately reflects WorkflowContext.md location
- [ ] Prerequisites section clearly explains that agents will create WorkflowContext.md and how developers can supply it manually if desired
- [ ] Each stage's inputs section mentions WorkflowContext.md appropriately
- [ ] WorkflowContext.md artifact section is comprehensive and follows the same format as other artifact sections
- [ ] Documentation highlights agent-driven creation and update responsibilities
- [ ] Work Title parameter is documented with clear examples showing PR title format
- [ ] Work Title generation by Spec Agent is documented
- [ ] Work Title usage for PR naming is clearly explained
- [ ] Examples and usage instructions are clear and actionable

### Status

Not started

---

## Testing Strategy

### Phase 1 Testing

**Unit-Level Verification:**
- Each chatmode file contains WorkflowContext.md recognition logic
- Parameter extraction logic handles missing required fields correctly
- Remote parameter defaults to 'origin' when omitted
- Agents create or update WorkflowContext.md automatically when it is absent or incomplete
- Minimal inline template format is consistent across all chatmode files

**Integration Testing:**
- Test each agent with WorkflowContext.md present in chat context
- Verify parameters are extracted correctly without additional prompts
- Test each agent when WorkflowContext.md is missing to confirm the agent creates it before continuing
- Test with malformed WorkflowContext.md (missing required fields) to verify the agent repairs the document or requests the missing details before proceeding

**Manual Testing:**
1. Invoke Spec Agent without an existing WorkflowContext.md, verify it gathers parameters and writes the file automatically.
2. Invoke Spec Agent again with the generated WorkflowContext.md in context, verify it uses extracted parameters without re-asking for them.
3. Invoke Code Research Agent with WorkflowContext.md, verify automatic parameter extraction.
4. Invoke Implementation Planner with WorkflowContext.md, verify it reads correct artifact paths.
5. Test with WorkflowContext.md specifying `remote: fork`, verify agents reference the fork remote and update the file if the remote changes.
6. Provide an incomplete WorkflowContext.md (missing target branch), verify the agent fills the missing fields before continuing.

### Phase 2 Testing

**Unit-Level Verification:**
- Spec Agent generates a Work Title (2-4 words) from GitHub Issue or brief
- Spec Agent stores Work Title in WorkflowContext.md
- All PR-creating agents (Impl Plan, Impl Review, Doc, PR) read Work Title from WorkflowContext.md
- All PR titles are formatted with `[<Work Title>] ` prefix
- Work Title can be refined during Spec iterations

**Integration Testing:**
- Test Spec Agent with GitHub Issue, verify Work Title is generated and stored
- Test Spec Agent with feature brief, verify Work Title is generated appropriately
- Test Implementation Plan Agent, verify Planning PR uses `[<Work Title>] Planning: ...` format
- Test Implementation Review Agent, verify Phase PRs use `[<Work Title>] Phase <N>: ...` format
- Test Documentation Agent, verify Docs PR uses `[<Work Title>] Documentation` format
- Test PR Agent, verify Final PR uses `[<Work Title>] ...` format

**Manual Testing:**
1. Run complete workflow with Spec Agent creating WorkflowContext.md with Work Title "TestFeature"
2. Verify Planning PR title starts with `[TestFeature] Planning:`
3. Verify Phase 1 PR title starts with `[TestFeature] Phase 1:`
4. Verify Docs PR title starts with `[TestFeature] Documentation`
5. Verify Final PR title starts with `[TestFeature]`
6. Refine Work Title during Spec stage, verify it updates in WorkflowContext.md
7. Test with multiple features in progress, verify PR titles are distinguishable by Work Title

### Phase 3 Testing

**Documentation Verification:**
- All stage sections reference WorkflowContext.md appropriately
- Repository layout diagram includes WorkflowContext.md
- Prerequisites section explains WorkflowContext.md creation
- New artifact section is comprehensive and accurate
- Work Title parameter is documented with examples

**Cross-Reference Validation:**
- Verify all internal links to WorkflowContext.md are valid
- Confirm documentation matches inline template structure from Phase 1 and Phase 2
- Ensure examples align with documented parameter formats
- Verify Work Title examples are clear and match PR title format

**Manual Testing:**
1. Read through updated paw-specification.md as a new PAW user
2. Follow documented workflow where the Spec Agent creates WorkflowContext.md automatically; optionally verify manual creation guidance for developers who choose to author it themselves
3. Verify instructions are clear, complete, and accurate
4. Confirm artifact section matches inline template structure including Work Title
5. Verify Work Title documentation clearly explains generation, refinement, and usage for PR naming

### End-to-End Testing

**Complete Workflow Test:**
1. Create a test feature branch: `feature/e2e-test-workflow-context`
2. Invoke the Spec Agent without a pre-existing WorkflowContext.md and confirm it writes the file using discovered parameters
3. Run through Stages 01-05 using the agent-generated WorkflowContext.md in all subsequent invocations
4. Verify no parameter re-entry is required across stages
5. Confirm all agents extract parameters correctly from WorkflowContext.md and update it if new values emerge (e.g., remote changes)
6. Validate that remote parameter is used correctly for git operations

**Fork Workflow Test:**
1. Start a workflow on a developer fork and allow the Spec Agent to create WorkflowContext.md.
2. Ensure the agent records `remote: upstream` (or the appropriate non-`origin` remote) and that subsequent stages honor the recorded remote for branch/PR operations.

### Success Metrics

- [ ] All 3 phases pass automated verification criteria
- [ ] Manual testing confirms parameter extraction works correctly
- [ ] Work Title generation and PR title prefixing works across all PR-creating agents
- [ ] Fork workflow scenario functions correctly with non-default remote
- [ ] Error messages for malformed WorkflowContext.md are clear and actionable
- [ ] Documentation is complete, accurate, and understandable

---

## Performance Considerations

WorkflowContext.md introduces no performance implications:
- File is read by LLM as part of chat context (same as any Markdown file)
- No programmatic parsing or validation overhead
- No impact on agent response times
- File size is negligible (typically <2KB)

**Optimization Notes:**
- Keep WorkflowContext.md concise; avoid including unnecessary documentation in the parameter file
- Use auto-derived artifact paths when possible to reduce file size
- Update WorkflowContext.md only when parameters actually change

---

## Migration Notes

### Existing Workflows

**Low-touch migration** for existing feature branches:
- The next time a PAW agent runs (starting with the Spec Agent), it creates or updates WorkflowContext.md automatically using the branch's existing parameters.
- Developers can optionally seed or edit the file manually, but no manual migration is required.
- Legacy prompt files (`*.prompt.md`) continue to function; agents simply persist the parameters they derive into WorkflowContext.md for subsequent stages.

### New Workflows

**Recommended approach** for new feature branches:
1. Start the workflow as usual; provide the Spec Agent with the target branch, GitHub issue, remote (if known), and any additional inputs.
2. Allow the Spec Agent to create `docs/agents/<target_branch>/WorkflowContext.md` automatically once it has the parameters.
3. Review or adjust the generated file if custom artifact paths or remotes are required.
4. Ensure later stages load the agent-generated WorkflowContext.md (no copy/paste of parameters needed).

### Gradual Adoption

Teams can adopt WorkflowContext.md gradually without manual intervention:
- Agents generate the file on-demand for in-progress features when they next run.
- Developers can still backfill or customize the file manually if beneficial.
- Historical or completed features do not require updates unless future work resumes on those branches.

### Format Updates

If the inline format changes in the future:
- Existing WorkflowContext.md files remain valid without requiring migration
- New optional parameters can be added without breaking existing files
- Agents will continue to support both old and new formats

---

## References

- **Original Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/12
- **Spec**: `docs/agents/feature/param-doc/Spec.md`
- **Spec Research**: `docs/agents/feature/param-doc/SpecResearch.md`
- **Code Research**: `docs/agents/feature/param-doc/CodeResearch.md`
- **PAW Specification**: `paw-specification.md` (sections on Repository Layout, Artifacts, and Workflow Stages)
- **Chatmode Files**: `.github/chatmodes/PAW-*.chatmode.md` (parameter discovery patterns)
- **Similar Implementation**: None (new capability)

---

## Implementation Notes

### Key Design Decisions

1. **LLM-Based Extraction**: No programmatic parsing allows flexibility and maintains simplicity
2. **Agent Ownership**: Agents are responsible for creating and updating WorkflowContext.md, removing boilerplate work for developers
3. **Auto-Derived Paths**: Default artifact path derivation reduces file maintenance burden
4. **Remote Default**: Defaulting to 'origin' supports the most common workflow scenario
5. **Manual Override Friendly**: Developers can still author or edit WorkflowContext.md manually when they need to override agent choices

### Potential Future Enhancements (Out of Scope)

- Automated WorkflowContext.md generation by Spec Agent when parameters are provided
- Schema validation tool to check WorkflowContext.md completeness before stages
- Parameter precedence rules when both WorkflowContext.md and prompt files provide values
- Automated sync mechanism to update WorkflowContext.md when parameters change
- Support for environment-specific parameter overrides (dev/staging/prod)

### Review Focus

When reviewing this implementation:
- **Phase 1**: Verify inline template format is consistent across all chatmodes; confirm parameter extraction logic is correct
- **Phase 2**: Validate documentation accuracy and completeness; check cross-references
- **Integration**: Test end-to-end workflow with WorkflowContext.md across all stages
- **Edge Cases**: Test malformed files, missing parameters, and fork workflows

