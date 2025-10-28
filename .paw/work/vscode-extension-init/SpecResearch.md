# Spec Research: VS Code Extension Init

## Summary

Research conducted to understand PAW work item initialization requirements, directory structure conventions, WorkflowContext.md format, and workflow stage detection. Findings show that current PAW uses `docs/agents/<target_branch>/` for artifacts with hardcoded path patterns across all agents. The directory structure follows a flat organization under feature branches, with WorkflowContext.md using a simple key-value Markdown format. Six distinct workflow stages are defined with specific artifact patterns for stage detection.

## Internal System Behavior

### Template Files and Content for PAW Work Item Initialization

**Standard Artifact Templates:**
PAW work items require these core artifact files in the target directory:

1. **WorkflowContext.md** (always required):
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

2. **Core artifact templates** (created as empty files, populated by agents):
   - `Spec.md` - Specification document
   - `SpecResearch.md` - Behavioral research findings
   - `CodeResearch.md` - Code implementation research
   - `ImplementationPlan.md` - Detailed implementation plan
   - `Docs.md` - Comprehensive documentation

3. **Prompts subdirectory templates:**
   - `prompts/spec-research.prompt.md` - Research questions for current system behavior
   - `prompts/code-research.prompt.md` - Code analysis prompts (optional)
   - Additional prompt files as needed by specific agents

**Template Content Analysis:**
From existing PAW work items in `.paw/work/paw-directory/prompts/`:
- Prompt files use frontmatter format with mode/model specifications
- Mode references like `PAW-01A Spec Agent`, `PAW-03A Implementer`
- Model typically `Claude Sonnet 4.5 (copilot)`
- Content varies by stage but follows consistent structure

**Standard Prompts from paw-directory example:**
- `01A-create-spec.prompt.md` - Spec creation from GitHub issue
- `01B-spec-research.prompt.md` - Research prompt generation
- `02A-code-research.prompt.md` - Code analysis
- `02B-create-plan.prompt.md` - Implementation planning
- `03A-implement.prompt.md` - Implementation execution
- `03B-review-implementation.prompt.md` - Phase review
- `03C-phase-pr-review.prompt.md` - PR review
- `03D-review-phase-pr-review.prompt.md` - PR review feedback

### Directory Structure Convention for PAW Work Items

**Current Convention:**
PAW work items are stored in `docs/agents/<target_branch>/` following this structure:

```
docs/agents/
├── feature/
│   ├── <feature-name>/
│   │   ├── WorkflowContext.md
│   │   ├── Spec.md
│   │   ├── SpecResearch.md
│   │   ├── CodeResearch.md
│   │   ├── ImplementationPlan.md
│   │   ├── Docs.md
│   │   └── prompts/
│   │       ├── spec-research.prompt.md
│   │       ├── code-research.prompt.md
│   │       └── [other prompt files]
```

**Evidence from repository:**
- `docs/agents/feature/finalize-initial-chatmodes/` - Complete workflow with all artifacts
- `docs/agents/feature/param-doc/` - Planning stage artifacts
- `docs/agents/feature/vs-code-ext/` - Early stage with minimal files

**Path Construction:**
All PAW agents use hardcoded pattern: `docs/agents/<target_branch>/<artifact>.md`
- Target branch name becomes directory name directly
- No normalization or escaping applied to branch names
- Flat organization (no year/month hierarchy)

**Proposed New Convention (from paw-specification.md):**
```
/.paw/work/
  <feature-slug>/
    WorkflowContext.md
    prompts/
      spec-research.prompt.md
      code-research.prompt.md
    Spec.md
    SpecResearch.md
    CodeResearch.md
    ImplementationPlan.md
    Docs.md
```

**Feature Slug Definition:**
From paw-specification.md: "Normalized, filesystem-safe identifier for workflow artifacts (e.g., 'auth-system', 'api-refactor-v2'). Auto-generated from Work Title or GitHub Issue title when not explicitly provided."

### WorkflowContext.md Fields, Format, and Validation

**Required Fields:**
1. **Work Title** - Short descriptive name (2-4 words), generated from GitHub Issue title or user input
2. **Feature Slug** - Normalized filesystem-safe identifier (new field in target convention)
3. **Target Branch** - Git branch for the complete work
4. **GitHub Issue** - Issue URL for tracking (optional but recommended)
5. **Remote** - Git remote name (defaults to "origin" if omitted)
6. **Artifact Paths** - Path resolution strategy ("auto-derived" or "explicit")
7. **Additional Inputs** - Comma-separated list or "none"

**Optional Fields:**
- Remote (defaults to "origin")
- GitHub Issue (can be omitted)
- Additional Inputs (can be "none")

**Format Rules:**
- Markdown format with h1 header "# WorkflowContext"
- Field format: `Field Name: <value>`
- Field order as shown in template (Work Title first, Additional Inputs last)
- Values can be URLs, simple strings, or comma-separated lists

**Data Types:**
- Work Title: String (2-4 words recommended)
- Feature Slug: String (filesystem-safe, normalized)
- Target Branch: String (valid git branch name)
- GitHub Issue: URL string or omitted
- Remote: String (git remote name)
- Artifact Paths: Enum ("auto-derived" | "explicit")
- Additional Inputs: String (comma-separated) or "none"

**Current Validation:**
No formal validation exists. Agents check for:
- Missing WorkflowContext.md file
- Missing or empty Target Branch field
- Use pattern matching and LLM understanding to extract values

**Field Behavior:**
- **Work Title**: Generated by Spec Agent from Issue title, can be refined
- **Target Branch**: Derived from current git branch if missing
- **Remote**: Never prompts user, defaults to "origin"
- **Artifact Paths**: Only "auto-derived" is functional, "explicit" not implemented
- **Additional Inputs**: User must specify if needed

### PAW Agent Detection and Parsing of Workflow Context

**Detection Mechanism:**
All PAW agents check for WorkflowContext.md using identical logic:

1. **Location Check**: Look for file at `docs/agents/<target_branch>/WorkflowContext.md`
2. **Chat Context**: Check if WorkflowContext.md is provided in chat attachments
3. **Fallback Creation**: If missing or lacks Target Branch, create/update file
4. **Parameter Extraction**: Read values using natural language understanding

**Parsing Logic:**
- Agents read WorkflowContext.md as Markdown text
- Extract field values by pattern matching "Field Name: value"
- No formal parser - relies on LLM ability to understand key-value pairs
- Agents extract: Target Branch, GitHub Issue, Remote, Artifact Paths, Additional Inputs

**Error Handling:**
- Missing file: Create with derived/prompted values
- Missing Target Branch: Derive from current git branch or prompt user
- Missing other fields: Use defaults or prompt as needed
- Malformed format: Would cause extraction failure, no specific handling documented

**Agent Responsibilities:**
- **Any agent**: Can create WorkflowContext.md when missing
- **Spec Agent**: Typically creates it first with Work Title generation
- **All agents**: Update file when learning new parameters
- **All agents**: Extract Target Branch and other values for path construction

**Parameter Sources:**
- Target Branch: Current git branch, user input, or chat context
- Work Title: GitHub Issue title, user input, or generated
- GitHub Issue: User input or chat context
- Remote: Defaults to "origin", rarely user-specified
- Additional Inputs: User input only

### PAW Workflow Stages and Phases

**Six Defined Stages:**
Based on paw-specification.md and agent chatmodes:

1. **Specification Stage**
   - Agents: PAW-01A Spec Agent, PAW-01B Spec Research Agent
   - Artifacts: Spec.md, SpecResearch.md, prompts/spec-research.prompt.md
   - Purpose: Define requirements and behavioral research

2. **Planning Stage** 
   - Agents: PAW-02A Code Research Agent, PAW-02B Implementation Plan Agent
   - Artifacts: CodeResearch.md, ImplementationPlan.md
   - Purpose: Research existing code and create detailed implementation plan

3. **Implementation Stage**
   - Agents: PAW-03A Implementer, PAW-03B Implementation Review Agent
   - Artifacts: Code changes, Phase PRs
   - Purpose: Execute implementation in reviewable phases

4. **Documentation Stage**
   - Agents: PAW-04 Documenter
   - Artifacts: Docs.md, documentation PR
   - Purpose: Create comprehensive technical documentation

5. **Integration Stage**
   - Agents: PAW-05 PR Agent
   - Artifacts: Final PR from target branch to main
   - Purpose: Final integration and deployment preparation

6. **Status Management** (cross-cutting)
   - Agents: PAW-X Status Agent
   - Purpose: Keep Issues and PRs synchronized throughout workflow

**Implementation Phases (within Implementation Stage):**
- Phase 1, Phase 2, ..., Phase N
- Each phase produces a separate PR: `<target_branch>_phase<N>` → `<target_branch>`
- Phases can be combined: `<target_branch>_phase<M-N>` for ranges
- Defined in ImplementationPlan.md by Implementation Plan Agent

**Stage Detection Logic:**
Extension can determine current stage by checking artifact existence:

- **Stage 1 (Specification)**: WorkflowContext.md exists, Spec.md may exist
- **Stage 2 (Planning)**: Spec.md and SpecResearch.md exist, ImplementationPlan.md may exist
- **Stage 3 (Implementation)**: ImplementationPlan.md exists, phase branches may exist
- **Stage 4 (Documentation)**: Implementation complete, Docs.md may exist
- **Stage 5 (Integration)**: Docs.md exists, final PR may be open
- **Complete**: Final PR merged to main

**Phase Detection Logic:**
- Parse ImplementationPlan.md to extract phase definitions
- Check git branches for `<target_branch>_phase<N>` pattern
- Check PR status for phase PRs (open/merged)
- Current phase = highest incomplete phase number

### Branch Naming Conventions and Git Workflow Patterns

**Target Branch Naming:**
PAW doesn't mandate specific target branch naming - uses project conventions:
- Examples: `feature/<slug>`, `user/rde/<slug>`, `bugfix/<issue-id>`
- Target branch becomes the base for all workflow branches
- Target branch name used directly as directory name in current system

**Workflow Branch Patterns:**
All workflow branches derive from target branch name:

1. **Planning Branch**: `<target_branch>_plan`
   - Used for planning PR if desired
   - Contains Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md

2. **Phase Branches**: `<target_branch>_phase<N>`
   - One branch per implementation phase
   - Examples: `feature/auth_phase1`, `feature/auth_phase2`
   - Can combine phases: `<target_branch>_phase<M-N>`

3. **Documentation Branch**: `<target_branch>_docs`
   - Contains Docs.md and related documentation updates
   - Creates docs PR to target branch

**PR Workflow:**
- **Planning PR**: `<target_branch>_plan` → `<target_branch>` (optional)
- **Phase PRs**: `<target_branch>_phase<N>` → `<target_branch>` (required)
- **Docs PR**: `<target_branch>_docs` → `<target_branch>` (required)
- **Final PR**: `<target_branch>` → `main` (required)

**Branch Lifecycle:**
1. Create target branch from main
2. Create planning branch (optional)
3. Create phase branches sequentially
4. Merge phase PRs to target branch
5. Create docs branch and merge
6. Create final PR from target branch to main

**Git Operations:**
- Agents create and check out branches as needed
- Phase PRs merged before subsequent phases begin
- Target branch accumulates all changes before final PR
- All workflow artifacts committed to appropriate branches

## Open Unknowns

None. All internal questions about PAW work item initialization, directory structure, WorkflowContext.md format, agent parsing, workflow stages, and branch conventions were answered through examination of existing PAW artifacts, chatmode files, and specification documents.

## User-Provided External Knowledge (Manual Fill)

The following external/context questions are listed for optional manual completion:

- [ ] **VS Code Language Model Tool API best practices for custom tools**: Best practices for implementing language model tools in VS Code extensions, including error handling, performance, and user experience considerations.

- [ ] **VS Code extension security considerations for Git operations and file system access**: Security guidelines for VS Code extensions that perform git operations and file system access, including permission models and sandboxing.

- [ ] **TypeScript/JavaScript project structure conventions for VS Code extensions**: Standard project organization, build processes, and development workflows for VS Code extension development.