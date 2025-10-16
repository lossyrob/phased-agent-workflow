---
date: 2025-10-15T13:01:32-04:00
git_commit: 419e27d8df184fbd9d493faaa7f0be01de9b6829
branch: feature/param-doc
repository: strata-workflow
topic: "Implementation of WorkflowContext.md parameter centralization"
tags: [research, codebase, parameters, chatmodes, prompts, workflow]
status: complete
last_updated: 2025-10-15
---

# Research: Implementation of WorkflowContext.md Parameter Centralization

**Date**: 2025-10-15T13:01:32-04:00  
**Git Commit**: 419e27d8df184fbd9d493faaa7f0be01de9b6829  
**Branch**: feature/param-doc  
**Repository**: strata-workflow

## Research Question

How do PAW stage agents currently discover and handle workflow parameters (target branch, GitHub issue, artifact paths, remote)? What patterns exist for parameter passing across stages, and how can WorkflowContext.md be integrated into the existing chatmode and prompt file architecture?

## Summary

PAW stage agents currently receive parameters through three mechanisms: (1) YAML frontmatter in `.prompt.md` files specifying the `mode` field, (2) inline parameter text within prompt file bodies (target branch, GitHub issue references, artifact paths), and (3) interactive prompts when parameters are missing. Chatmode definitions (`.chatmode.md` files in `.github/chatmodes/`) contain agent instructions that reference parameter discovery patterns, with agents typically inspecting the current branch as a fallback for target branch discovery. Artifact paths follow the convention `docs/agents/<target_branch>/[Artifact].md`, and derivative branches (`_plan`, `_phaseN`, `_docs`) are created by specific agents during their stages. No centralized parameter file currently exists; parameters are repeated across individual stage prompt files. The GitHub MCP tools are used for issue and PR interactions. No metadata collection scripts exist in the `scripts/` directory.

## Detailed Findings

### Prompt File Structure and Parameter Passing

**Location**: `docs/agents/feature/*/prompts/*.prompt.md`

Prompt files follow a minimal structure with YAML frontmatter and parameter specifications:

```markdown
---
mode: 'PAW-[STAGE] [Agent Name]'
---

[Instruction text with inline parameters]

Target Branch: <target_branch>
GitHub Issue: <issue_reference>
Additional Inputs: <comma-separated list or 'none'>
```

**Examples found**:
- `/home/rob/proj/paw/phased-agent-workflow/docs/agents/feature/finalize-initial-chatmodes/prompts/create-spec.prompt.md`:
  - Mode: `PAW-01A Spec Agent`
  - Includes GitHub issue URL: `https://github.com/lossyrob/phased-agent-workflow/issues/1`
  - Includes artifact path: `docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md`

- `/home/rob/proj/paw/phased-agent-workflow/docs/agents/feature/finalize-initial-chatmodes/prompts/create-code-research.prompt.md`:
  - Mode: `PAW-02A Code Researcher`
  - Specifies target branch: `feature/finalize-initial-chatmodes`
  - Simple instruction format without explicit parameter section

- `/home/rob/proj/paw/phased-agent-workflow/docs/agents/feature/finalize-initial-chatmodes/prompts/create-impl-plan.prompt.md`:
  - Mode: `PAW-02B Impl Planner`
  - Specifies target branch: `feature/finalize-initial-chatmodes`
  - References "generated documents" implicitly

**Parameter Repetition Pattern**: Each stage prompt file currently duplicates the target branch name, though the exact format varies (sometimes inline in instructions, sometimes in a structured parameter section).

### Chatmode Definitions and Agent Instructions

**Location**: `.github/chatmodes/PAW-*.chatmode.md`

Chatmode files define agent behavior and include instructions for parameter discovery:

#### Spec Agent (PAW-01A)
**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Parameter Discovery Logic** (documented at lines 24-30):
- Issue link: If GitHub link supplied, treat as issue; otherwise use description; if neither, ask user
- Target branch: If user specifies, use it; otherwise inspect current branch; if not main/default, assume that branch is target
- Research preference: Default to running research unless user explicitly skips

**Research Prompt Generation Format** (lines 73-89):
```markdown
---
mode: 'PAW-01B Spec Research Agent'
---
# Spec Research Prompt: <feature>

Target Branch: <target_branch>
GitHub Issue: <issue number or 'none'>
Additional Inputs: <comma-separated list or 'none'>

## Questions
1. ...

### Optional External / Context
1. ...
```

**GitHub Integration** (line 263):
- Uses `github mcp` tools exclusively (not `gh` CLI or direct page fetches)

#### Code Researcher (PAW-02A)
**File**: `.github/chatmodes/PAW-02A Code Researcher.chatmode.md`

**Initial Response Pattern** (lines 36-42):
- If no research query or spec provided, responds with ready message
- If Spec.md supplied, generates own research query
- Waits for user's research query before proceeding

**File Reading Requirement** (lines 52-55):
- Reads mentioned files FULLY first (no limit/offset parameters)
- Reads in main context before spawning sub-tasks
- Critical for full context before decomposing research

**Metadata Collection** (line 60):
- Mentions `scripts/copilot/spec-metadata.sh` script for metadata generation
- Note: This script does not currently exist in the repository

**Output Location** (line 62):
- Saves to canonical path: `docs/agents/<target_branch>/CodeResearch.md`
- Target branch determines directory structure

#### Implementation Planner (PAW-02B)
**File**: `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`

**Parameter Detection** (lines 11-16):
- Checks if parameters provided (file path or GitHub Issue reference)
- If provided, skips default message and begins immediately
- If not, prompts for GitHub Issue, research file path, and related materials

**File Reading Requirements** (lines 34-42):
- Reads all mentioned files immediately and FULLY
- Never uses limit/offset parameters
- Critical: Must complete all file reading before proceeding to research

**Planning Branch Operations** (line 262):
- Creates or checks out `<target_branch>_plan` branch
- Opens Planning PR: `<target_branch>_plan` → `<target_branch>`

#### Implementation Agent (PAW-03A)
**File**: `.github/chatmodes/PAW-03A Implementer.chatmode.md`

**Branch Discovery** (lines 11-23):
- Reads ImplementationPlan.md first to identify active/next phase
- Determines exact phase branch name (e.g., `feature/finalize-initial-chatmodes_phase3`)
- Checks current branch with `git branch --show-current`
- Creates phase branch if needed: `git checkout -b <feature-branch>_phase[N]`

**Phase Branch Naming** (lines 75-78):
- Single phase: `<feature-branch>_phase[N]`
- Multiple consecutive phases: `<feature-branch>_phase[M-N]`

**GitHub MCP Usage** (line 23):
- Uses `github mcp` tools for specs and GitHub Issues

#### PR Agent (PAW-05)
**File**: `.github/chatmodes/PAW-05 PR.chatmode.md`

**Parameter Requirements** (lines 16-20):
- Target branch name
- Base branch (usually 'main')
- Path to ImplementationPlan.md

**Artifact Validation** (lines 35-40):
- Checks existence of: Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md

#### Status Update Agent (PAW-X)
**File**: `.github/chatmodes/PAW-X Status Update.chatmode.md`

**Inputs** (lines 15-17):
- Feature Issue ID or URL
- Paths to artifacts: Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md

**Phase Count Discovery** (lines 21-25):
- Uses grep/search to find all lines matching `^## Phase \d+:` in ImplementationPlan.md
- Counts unique phase numbers
- Does NOT assume phase counts from other sources

### Artifact Path Conventions

**Standard Pattern**: `docs/agents/<target_branch>/[Artifact].md`

**Observed Artifacts**:
- `Spec.md` - Feature specification
- `SpecResearch.md` - Behavioral research
- `CodeResearch.md` - Implementation research with file:line references
- `ImplementationPlan.md` - Phased implementation plan
- `Docs.md` - Documentation artifact
- `prompts/` subdirectory containing `.prompt.md` files

**Example Structure** (`docs/agents/feature/finalize-initial-chatmodes/`):
```
CodeResearch.md
ImplementationPlan.md
Phase1-Review.md
Spec.md
SpecResearch.md
prompts/
  create-code-research.prompt.md
  create-impl-plan.prompt.md
  create-spec.prompt.md
  implement-plan.prompt.md
  review-implementation.prompt.md
  spec-research.prompt.md
  update-status.prompt.md
```

### Derivative Branch Patterns

**Branch Naming Conventions** (from `paw-specification.md` lines 47-50):
- Planning branch: `<target_branch>_plan`
- Implementation phase branches: `<target_branch>_phase<N>` or `<target_branch>_phase<M-N>` for ranges
- Documentation branch: `<target_branch>_docs`
- Examples:
  - Single phase: `feature/auth_phase1`
  - Combined phases: `feature/auth_phase2-3`

**PR Conventions** (from `paw-specification.md` lines 54-56):
- Planning PR: `<target_branch>_plan` → `<target_branch>`
- Phase PRs: `<target_branch>_phase<N>` → `<target_branch>`
- Docs PR: `<target_branch>_docs` → `<target_branch>`
- Final PR: `<target_branch>` → `main`

**Branch Creation Responsibility**:
- Planning branch: Created by Implementation Planner (PAW-02B, line 262)
- Phase branches: Created by Implementation Agent (PAW-03A, lines 14-23)
- Docs branch: Created by Documenter Agent (PAW-04)

**Derivative Branch Context**:
According to SpecResearch.md, derivative branches (`_plan`, `_phaseN`, `_docs`) reference the original target branch's artifacts. WorkflowContext.md would reside on the base target branch and be referenced by derivative branches via relative path or agent instruction.

### GitHub MCP Integration

**Current Usage Pattern**:
- Agents are explicitly instructed to use `github mcp` tools
- Direct references found in:
  - PAW-01A Spec Agent (line 263): "ALWAYS use the **github mcp** tools to interact with GitHub issues and PRs. Do not fetch pages directly or use the gh cli."
  - PAW-02A Code Researcher (line 323): "Use the **github mcp** tools to interact with GitHub issues and PRs"
  - PAW-03A Implementer (line 23): "GitHub Issues using `github mcp` tools when relevant"

**GitHub Issue Reference Formats**:
- Full URL: `https://github.com/lossyrob/phased-agent-workflow/issues/1`
- Short form: `#1` (mentioned in Spec.md requirements)

**No Local Scripts**: The `scripts/` directory is empty, indicating no local GitHub CLI wrappers or helper scripts exist.

### Remote Parameter Usage

**Current State**: No explicit remote parameter exists in current prompt files or chatmode definitions. Git operations implicitly use the default remote (typically `origin`).

**Remote References in Chatmodes**:
- Implementation Planner mentions pushing to remote (line 264): "Push the planning branch using the `github mcp` git tools (do **not** run raw git commands)"
- No explicit remote specification found in any chatmode or prompt file
- Default behavior assumes `origin` remote

**Fork Workflow Support**: Currently implicit; developers working against forks would need to specify remote in git operations, but no centralized parameter exists for this.

## Code References

- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:24-30` - Parameter discovery logic for Issue link and target branch
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:73-89` - Research prompt generation format
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:263` - GitHub MCP tool usage directive
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md:36-42` - Initial response pattern
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md:52-55` - File reading requirements
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md:60` - Metadata script reference
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md:62` - Canonical output location
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md:11-16` - Parameter detection logic
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md:262` - Planning branch creation
- `.github/chatmodes/PAW-03A Implementer.chatmode.md:14` - Phase branch naming example
- `.github/chatmodes/PAW-03A Implementer.chatmode.md:75-78` - Phase branch naming conventions
- `.github/chatmodes/PAW-05 PR.chatmode.md:16-20` - Parameter requirements
- `.github/chatmodes/PAW-05 PR.chatmode.md:35-40` - Artifact validation
- `.github/chatmodes/PAW-X Status Update.chatmode.md:15-17` - Input parameters
- `.github/chatmodes/PAW-X Status Update.chatmode.md:21-25` - Phase count discovery
- `docs/agents/feature/finalize-initial-chatmodes/prompts/create-spec.prompt.md` - Example spec prompt with GitHub issue
- `docs/agents/feature/finalize-initial-chatmodes/prompts/create-code-research.prompt.md` - Example code research prompt
- `paw-specification.md:47-50` - Branch naming conventions
- `paw-specification.md:54-56` - PR conventions

## Architecture Documentation

### Current Parameter Flow

**Stage 01 (Specification)**:
1. User provides GitHub Issue link/ID and target branch to Spec Agent
2. Spec Agent discovers target branch from current branch if not provided
3. Spec Agent generates `prompts/spec-research.prompt.md` with target branch, GitHub Issue, and Additional Inputs
4. Spec Research Agent reads the prompt file and saves `SpecResearch.md` to `docs/agents/<target_branch>/`

**Stage 02 (Planning)**:
1. User provides GitHub Issue, research file path to Implementation Planner
2. Implementation Planner reads Spec.md and SpecResearch.md from `docs/agents/<target_branch>/`
3. Code Researcher saves `CodeResearch.md` to `docs/agents/<target_branch>/`
4. Implementation Planner creates `<target_branch>_plan` branch
5. Implementation Planner saves `ImplementationPlan.md` to `docs/agents/<target_branch>/`

**Stage 03 (Implementation)**:
1. Implementation Agent reads `ImplementationPlan.md` from `docs/agents/<target_branch>/`
2. Implementation Agent creates phase branches: `<target_branch>_phase<N>`
3. Implementation Agent commits to phase branch, Review Agent opens Phase PR

**Stage 04 (Documentation)**:
1. Documenter reads `ImplementationPlan.md` and merged Phase PRs
2. Documenter creates `<target_branch>_docs` branch
3. Documenter saves `Docs.md` to `docs/agents/<target_branch>/`

**Stage 05 (Final PR)**:
1. PR Agent receives target branch, base branch, path to ImplementationPlan.md
2. PR Agent validates all artifacts exist at `docs/agents/<target_branch>/`
3. PR Agent creates final PR: `<target_branch>` → `main`

### Parameter Repetition Pattern

Currently repeated across stages:
- **Target Branch**: Specified in prompt files, discovered from current branch, or provided interactively
- **GitHub Issue**: Specified in initial prompt files (Spec Agent), referenced in later artifacts
- **Artifact Paths**: Derived from target branch using convention `docs/agents/<target_branch>/[Artifact].md`
- **Additional Inputs**: Listed in Spec Research prompt, not propagated to later stages

### Chatmode Architecture

**File Format**:
```markdown
---
description: 'Description text'
---
# Agent Name

[Agent instructions in Markdown]
```

**Chatmode Naming Convention**: `PAW-[STAGE][SUBSTAGE] [Agent Name].chatmode.md`
- Stage 01A: Spec Agent
- Stage 01B: Spec Research Agent
- Stage 02A: Code Researcher
- Stage 02B: Impl Planner
- Stage 03A: Implementer
- Stage 03B: Impl Reviewer
- Stage 04: Documenter
- Stage 05: PR Agent
- Stage X: Status Update Agent

**Instruction Content**: Each chatmode contains:
- Initial response patterns (what to do when invoked)
- Parameter discovery logic
- Step-by-step process instructions
- Output specifications
- Quality checklists
- Hand-off messages

## Integration Points for WorkflowContext.md

Based on the research, WorkflowContext.md would need to be:

1. **Read by all stage agents** when supplied in chat context (instead of requiring parameters in prompt files)
2. **Located** at `docs/agents/<target_branch>/WorkflowContext.md` (following artifact convention)
3. **Referenced** in chatmode instructions as an optional context source
4. **Parsed by LLM interpretation** (no programmatic validation required)
5. **Created** either manually by developer or generated by Spec Agent when parameters are provided
6. **Used by derivative branches** (`_plan`, `_phaseN`, `_docs`) via relative path reference

### Chatmode Instruction Updates Needed

Each chatmode would need to acknowledge WorkflowContext.md in their "Start / Initial Response" sections:
- Check if WorkflowContext.md is supplied in context
- Extract parameters from WorkflowContext.md if present
- Fall back to existing parameter discovery behavior if absent

### Parameter Extraction Pattern

Agents would extract from WorkflowContext.md:
- Target Branch (required)
- Remote (optional, defaults to `origin`)
- GitHub Issue (required)
- Artifact Paths (optional, can auto-derive from target branch)
- Additional Inputs (optional)

## Open Questions

1. Should WorkflowContext.md be created automatically by the Spec Agent, or should it be a manual pre-requisite?
2. How should agents handle conflicts if both WorkflowContext.md and prompt file parameters are present?
3. Should the Status Update Agent also maintain WorkflowContext.md, or is it a read-only artifact?
4. Should WorkflowContext.md be committed to the planning branch (`_plan`) or the target branch directly?
5. Should there be a validation step to ensure the specified remote exists in the local git configuration?
