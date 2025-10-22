# Spec Research: PAW Directory Reorganization

**Date**: 2025-10-22 12:05:08 EDT  
**Branch**: feature/move-to-paw-directory  
**Target Branch**: feature/move-to-paw-directory  
**GitHub Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/19

## Summary

Research conducted to understand how PAW agents currently determine artifact paths, manage WorkflowContext.md, and reference the directory structure. Findings show that agents use `docs/agents/<target_branch>/` as the canonical path convention, with "auto-derived" being the only documented option for the Artifact Paths field. WorkflowContext.md lifecycle and creation responsibilities are distributed across agents, with each agent capable of creating or updating it when missing or incomplete.

## Internal System Behavior

### 1. Artifact Path Derivation

**Current Path Logic:**
All PAW agents use a consistent pattern for determining artifact locations:

- **Default convention**: `docs/agents/<target_branch>/<Artifact>.md`
- **Implementation**: Hardcoded in agent instructions as the "canonical path"
- **Examples from agent chatmodes**:
  - Spec Research Agent: "Save at: `docs/agents/<target_branch>/SpecResearch.md` (canonical path)"
  - Code Research Agent: "Save the research document to the canonical path: `docs/agents/<target_branch>/CodeResearch.md`"
  - Implementation Planner: Creates plan at `docs/agents/<target_branch>/ImplementationPlan.md`
  - Documenter: Produces `docs/agents/<target_branch>/Docs.md`

**No Override Mechanism Documented:**
- The Artifact Paths field in WorkflowContext.md accepts "auto-derived" or "explicit" values
- However, no agent instructions explain how to specify or parse explicit custom paths
- No conditional logic exists for reading Artifact Paths and using non-default locations
- The field appears to be a placeholder for future functionality

**Where Logic is Defined:**
- Agent chatmode files in `.github/chatmodes/PAW-*.chatmode.md`
- Each agent's "Output" or "Process Steps" section hardcodes the path pattern
- No centralized path resolution module or shared utility
- All 9 PAW agents follow identical `docs/agents/<target_branch>/` pattern

**Evidence:**
- PAW-01B Spec Research Agent.chatmode.md:101: `Save at: docs/agents/<target_branch>/SpecResearch.md (canonical path)`
- PAW-02A Code Researcher.chatmode.md contains identical patterns
- PAW-02B Impl Planner.chatmode.md, PAW-03A Implementer.chatmode.md, etc. all reference the same path structure

### 2. WorkflowContext.md Artifact Paths Field

**Supported Values:**
The WorkflowContext.md template shown in agent instructions indicates two options:
```markdown
Artifact Paths: <auto-derived or explicit>
```

**"auto-derived" Behavior:**
- Means the agent computes paths using the default convention: `docs/agents/<target_branch>/<Artifact>.md`
- All agents treat this as the canonical behavior
- No special processing needed when Artifact Paths contains "auto-derived"

**"explicit" Behavior:**
- Documented as an option but not implemented
- No agent contains logic to parse explicit custom paths
- No format specification for how explicit paths would be structured
- Appears to be reserved for future enhancement

**Current Usage:**
- Existing WorkflowContext.md files in the repository use "auto-derived"
- Example from `docs/agents/feature/move-to-paw-directory/WorkflowContext.md`:
  ```markdown
  Artifact Paths: auto-derived
  ```
- Example from `docs/agents/feature/param-doc/WorkflowContext.md`:
  ```markdown
  Artifact Paths: auto-derived
  ```

**How Agents Parse This Field:**
- Agents read WorkflowContext.md to extract parameters (Target Branch, GitHub Issue, Remote, etc.)
- The Artifact Paths field is extracted but not acted upon
- Agents always use `docs/agents/<target_branch>/` regardless of the field's value
- The field serves as documentation of intent rather than a runtime configuration

**Evidence:**
- All agent chatmode files contain identical WorkflowContext.md parameter blocks
- No conditional path logic based on Artifact Paths value
- Field exists in the template but has no functional implementation

### 3. WorkflowContext.md Lifecycle

**Creation Responsibility:**
Each PAW agent is capable of creating WorkflowContext.md when it doesn't exist:

- **Spec Agent (PAW-01A)**:
  - Checks for WorkflowContext.md at start
  - If missing or lacks Target Branch, gathers info and creates the file
  - Generates Work Title from GitHub Issue title or feature brief
  - Location: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md:48-51`

- **Spec Research Agent (PAW-01B)**:
  - Derives branch from current repository state if missing
  - Writes WorkflowContext.md before continuing research
  - Location: `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md:31`

- **Code Research Agent (PAW-02A)**:
  - Determines branch (uses current branch when necessary)
  - Writes WorkflowContext.md before proceeding with research
  - Location: `.github/chatmodes/PAW-02A Code Researcher.chatmode.md`

- **Implementation Plan Agent (PAW-02B)**:
  - Creates WorkflowContext.md if missing
  - Uses current branch where appropriate
  - Location: `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`

- **All subsequent agents** (Implementer, Reviewer, Documenter, PR Agent, Status Agent) follow the same pattern

**When Created:**
- First invocation of any PAW agent in a workflow
- Typically during Stage 01 (Specification) when Spec Agent is invoked
- Can be created at any stage if invoked without prior context

**What Happens When Missing:**
- Agent detects missing WorkflowContext.md or missing Target Branch field
- Agent gathers required parameters (from chat context, current branch, or user input)
- Agent writes the file to `docs/agents/<target_branch>/WorkflowContext.md`
- Agent proceeds with its primary task

**Parameters That Can Be Inferred:**
1. **Target Branch**: Derived from current git branch if not `main` or repo default
2. **Remote**: Defaults to `origin` when omitted (never prompts user)
3. **Artifact Paths**: Defaults to "auto-derived" when not specified

**Parameters That Must Be Provided:**
1. **Work Title**: Must be generated or provided (Spec Agent generates from Issue title)
2. **GitHub Issue**: Must be provided by user if tracking with an Issue
3. **Additional Inputs**: Must be specified by user if needed

**Update Behavior:**
- Agents update WorkflowContext.md when new parameters are discovered
- Examples: PR numbers, artifact overrides, remote changes
- Updates preserve existing fields and only modify changed values
- Multiple agents may update the same file as workflow progresses

**Evidence:**
- All 9 agent chatmode files contain identical WorkflowContext.md lifecycle instructions
- Pattern is consistent: check → create if missing → update as needed
- Location convention: `docs/agents/<target_branch>/WorkflowContext.md`

### 4. Agent Path References

**Comprehensive Search Results:**
All PAW agents contain hardcoded path references to `docs/agents/<target_branch>/` in their chatmode instruction files. These references occur in multiple contexts:

**WorkflowContext.md Location References:**
Every agent checks for WorkflowContext.md at: `docs/agents/<target_branch>/WorkflowContext.md`
- Appears in "Start" or "Initial Response" sections
- 9 agents × 1-2 references each = ~15 instances

**Artifact Output Path References:**
Agents specify where they save their output artifacts:
- Spec Research Agent: `docs/agents/<target_branch>/SpecResearch.md` (line 101)
- Code Research Agent: `docs/agents/<target_branch>/CodeResearch.md` (lines 99, 105, 378)
- Implementation Plan Agent: `docs/agents/<target_branch>/ImplementationPlan.md` (lines 227, 334, 452)
- Documenter Agent: `docs/agents/<target_branch>/Docs.md` (lines 137, 347)
- PR Agent: `docs/agents/<target_branch>/Docs.md` (line 64 - validation check)

**Artifact Input Path References:**
Agents specify where they read prerequisite artifacts:
- Implementation Plan Agent reads from `docs/agents/<target_branch>/` for:
  - Spec.md (lines 72, 322, 360)
  - SpecResearch.md (lines 73, 323, 360)
  - CodeResearch.md (lines 74, 323, 360)
  - ImplementationPlan.md (line 75, 360)

**Git Staging References:**
Agents use the path pattern when staging files for commit:
- Implementation Plan Agent: `git add docs/agents/<target_branch>/{Spec.md,SpecResearch.md,...}` (line 353)
- Implementation Plan Agent: `git add docs/agents/<target_branch>/<file>` (line 93)

**Branch Naming References:**
While not artifact paths, agents heavily reference `<target_branch>` for branch operations:
- Planning branch: `<target_branch>_plan`
- Phase branches: `<target_branch>_phase<N>` or `<target_branch>_phase<M-N>`
- Docs branch: `<target_branch>_docs`
- These branch references would need updating if target branch naming changes

**Locations Requiring Updates:**
All 9 chatmode files in `.github/chatmodes/`:
1. `PAW-01A Spec Agent.chatmode.md` - 6+ path references
2. `PAW-01B Spec Research Agent.chatmode.md` - 5+ path references  
3. `PAW-02A Code Researcher.chatmode.md` - 7+ path references
4. `PAW-02B Impl Planner.chatmode.md` - 20+ path references
5. `PAW-03A Implementer.chatmode.md` - 3+ path references
6. `PAW-03B Impl Reviewer.chatmode.md` - 3+ path references
7. `PAW-04 Documenter.chatmode.md` - 6+ path references
8. `PAW-05 PR.chatmode.md` - 4+ path references
9. `PAW-X Status Update.chatmode.md` - 2+ path references

**Total Estimated Updates Needed:** 50+ individual line references across all chatmode files

**Additional Locations:**
- `paw-specification.md` - Contains example paths in Repository Layout section
- `README.md` - May contain example paths in documentation

**Evidence:**
- grep search found 100+ matches for `docs/agents/` and `<target_branch>` patterns
- Every agent's "WorkflowContext.md Parameters" section
- Every agent's artifact save/read logic
- Git staging commands in Implementation Plan Agent and Documenter Agent

### 5. Current Directory Structure Examples

**On-Disk Structure:**
The `docs/agents/` directory contains three feature subdirectories:

```
docs/agents/
├── feature/
│   ├── finalize-initial-chatmodes/
│   │   ├── CodeResearch.md
│   │   ├── ImplementationPlan.md
│   │   ├── Phase1-Review.md
│   │   ├── Spec.md
│   │   ├── SpecResearch.md
│   │   └── prompts/
│   │       ├── create-code-research.prompt.md
│   │       ├── create-impl-plan.prompt.md
│   │       ├── create-spec.prompt.md
│   │       ├── implement-plan.prompt.md
│   │       ├── review-implementation.prompt.md
│   │       ├── spec-research.prompt.md
│   │       └── update-status.prompt.md
│   ├── move-to-paw-directory/
│   │   ├── WorkflowContext.md
│   │   └── prompts/
│   │       ├── 01A-create-spec.prompt.md
│   │       └── 01B-spec-research.prompt.md
│   ├── param-doc/
│   │   ├── CodeResearch.md
│   │   ├── ImplementationPlan.md
│   │   ├── Spec.md
│   │   ├── SpecResearch.md
│   │   ├── WorkflowContext.md
│   │   └── prompts/
│   │       ├── code-research.prompt.md
│   │       ├── implement.prompt.md
│   │       ├── make-impl-plan.prompt.md
│   │       ├── make-spec.prompt.md
│   │       └── spec-research.prompt.md
│   └── vs-code-ext/
│       └── prompts/
│           └── make-spec.prompt.md
```

**Pattern Analysis:**
- All features organized under `docs/agents/feature/` prefix
- Branch names used as directory names (with `/` converted to `/`)
- Feature directories contain standard artifacts (Spec.md, SpecResearch.md, etc.)
- `prompts/` subdirectory for research prompts (optional, varies by feature)
- Some features have WorkflowContext.md, some don't (depends on when workflow was run)

**Variations Observed:**
- `finalize-initial-chatmodes/` has all artifacts including a Phase1-Review.md (non-standard)
- `move-to-paw-directory/` only has WorkflowContext.md and prompts (early stage)
- `param-doc/` has all planning artifacts but no Docs.md (not yet documented)
- `vs-code-ext/` only has a prompt file (abandoned or very early)

**Usage Pattern:**
All directories follow the branch naming convention exactly. The structure is flat (no year/month organization), with all features at the same level under `docs/agents/`.

**Evidence:**
- `ls` command output from `docs/agents/feature/`
- File listings from existing feature directories
- Consistent pattern across all completed workflows

### 6. Branch Name Usage Beyond Artifact Paths

**Branch Names in PRs:**
Branch names are embedded in PR titles and descriptions:
- Planning PR title format: `[<Work Title>] Planning: <brief description>`
- Phase PR title format: `[<Work Title>] Implementation Phase <N>: <brief description>`
- Docs PR title format: `[<Work Title>] Documentation`
- Final PR title format: `[<Work Title>] <description>`

Note: Work Title (not branch name) is used for PR prefixes, but PR branch-to-branch relationships use branch names

**Branch Names in Git Operations:**
All phase and workflow branches derive from target branch:
- `<target_branch>_plan` - Planning branch
- `<target_branch>_phase<N>` - Phase implementation branches
- `<target_branch>_phase<M-N>` - Combined phase branches
- `<target_branch>_docs` - Documentation branch

**Branch Names in PR Descriptions:**
PR descriptions contain links to artifacts using branch-based paths:
- Links to `docs/agents/<target_branch>/Spec.md`
- Links to `docs/agents/<target_branch>/ImplementationPlan.md`
- Links to `docs/agents/<target_branch>/Docs.md`
These would break if artifact paths change but branch names don't

**Branch Names in Commit Messages:**
While not mandated by PAW, developers naturally reference branch context in commits

**Branch Names in WorkflowContext.md:**
The Target Branch field stores the branch name as the primary workflow identifier

**Dependency Analysis:**
If artifact storage moves to feature slugs:
- **PRs would still work**: PR titles use Work Title, not branch name
- **PR descriptions would need updating**: Artifact links use branch-based paths
- **Git operations would still work**: Branch naming is independent of artifact storage
- **WorkflowContext.md might need both**: Feature slug for artifacts + branch name for git ops
- **Agent instructions would need updating**: To construct paths from slug, not branch

**Evidence:**
- Implementation Plan Agent chatmode: PR creation logic (lines 352-362)
- Implementation Review Agent chatmode: PR title formatting (line 145)
- Documenter Agent chatmode: PR creation (line 113)
- All agents' branch naming conventions for workflow branches

## Internal System Behavior (Extended Research)

### 7. Work Title Generation and Usage

**When Work Title is Generated:**
Work Title is created by the Spec Agent (PAW-01A) during the initial specification stage:

- Generated automatically from the GitHub Issue title or feature brief when creating WorkflowContext.md
- Format: 2-4 word descriptive name (e.g., "Auth System", "API Refactor", "User Profiles")
- Can be refined during spec iterations for clarity
- User is informed when Work Title is updated

**Generation Logic:**
From PAW-01A Spec Agent chatmode.md:
```markdown
**Work Title**: Generate a short, descriptive name (2-4 words) from the GitHub Issue title 
or feature brief when creating WorkflowContext.md. Refine it during spec iterations if needed for clarity.
```

**Sources for Generation:**
1. Primary: GitHub Issue title (if provided)
2. Fallback: Feature brief or description provided by user
3. Manual: User can provide explicit Work Title

**Auto-Generation Rules:**
- Extract 2-4 most descriptive words from source
- Remove filler words (e.g., "the", "a", "an")
- Capitalize major words
- Examples shown in chatmode: "WorkflowContext", "Auth System", "API Refactor", "User Profiles"

**Always Required:**
Work Title becomes required after the Spec stage completes. It's optional initially but must be generated or provided before completing specification.

**Usage Across PAW Workflow:**
Work Title is used exclusively for PR naming/prefixes:

1. **Planning PR**: `[<Work Title>] Planning: <brief description>`
2. **Phase PRs**: `[<Work Title>] Implementation Phase <N>: <brief description>`
3. **Docs PR**: `[<Work Title>] Documentation`
4. **Final PR**: `[<Work Title>] <description>`

**Storage Location:**
Stored in WorkflowContext.md as a field:
```markdown
Work Title: <work_title>
```

**Agent Responsibilities:**
- **Spec Agent**: Generates Work Title when creating WorkflowContext.md
- **Implementation Review Agent**: Reads Work Title from WorkflowContext.md for Phase PR titles
- **Documenter Agent**: Reads Work Title from WorkflowContext.md for Docs PR title
- **Implementation Plan Agent**: Reads Work Title for Planning PR title
- **All other agents**: Extract Work Title from WorkflowContext.md but don't typically use it directly

**Refinement Process:**
From PAW-01A Spec Agent chatmode.md section "Work Title Refinement":
- As spec evolves and becomes clearer, refine Work Title if needed
- Keep concise (2-4 words maximum)
- Make descriptive enough to identify feature
- Update WorkflowContext.md if title changes
- Inform user when Work Title is updated

**Evidence:**
- PAW-01A Spec Agent.chatmode.md:29 - Generation instructions
- PAW-01A Spec Agent.chatmode.md:48 - Field definition with examples
- PAW-01A Spec Agent.chatmode.md:93-99 - Refinement section
- PAW-03B Impl Reviewer.chatmode.md:145 - Phase PR title format using Work Title
- PAW-04 Documenter.chatmode.md:119 - Docs PR title format using Work Title
- PAW-02B Impl Planner.chatmode.md:358 - Planning PR title format using Work Title

### 8. Artifact Path Hardcoding vs Parameterization

**Current Implementation:**
Artifact paths are hardcoded as string literals with embedded `<target_branch>` placeholder throughout all agent chatmode files. There is no parameterization or computed path resolution.

**Pattern Used:**
Every agent contains hardcoded path references in the format:
```markdown
docs/agents/<target_branch>/<Artifact>.md
```

**Where Hardcoded:**
Path literals appear in multiple contexts within chatmode instruction files:

1. **WorkflowContext.md location checks:**
   - Pattern: `docs/agents/<target_branch>/WorkflowContext.md`
   - Appears in "Start" or "Initial Response" sections
   - All 9 agents check this location

2. **Artifact output path specifications:**
   - Pattern: `Save at: docs/agents/<target_branch>/SpecResearch.md (canonical path)`
   - Appears in output/process sections
   - Examples from each agent:
     - Spec Research: `docs/agents/<target_branch>/SpecResearch.md`
     - Code Research: `docs/agents/<target_branch>/CodeResearch.md`
     - Impl Planner: `docs/agents/<target_branch>/ImplementationPlan.md`
     - Documenter: `docs/agents/<target_branch>/Docs.md`

3. **Artifact input path references:**
   - Pattern: Reading prerequisite artifacts from `docs/agents/<target_branch>/`
   - Implementation Plan Agent reads from:
     - `docs/agents/<target_branch>/Spec.md` (line 72)
     - `docs/agents/<target_branch>/SpecResearch.md` (line 73)
     - `docs/agents/<target_branch>/CodeResearch.md` (line 74)

4. **Git staging commands:**
   - Pattern: `git add docs/agents/<target_branch>/<file>`
   - Implementation Plan Agent (line 93, 353)

5. **PR description links:**
   - Pattern: Links to `docs/agents/<target_branch>/Spec.md` in PR bodies
   - Implementation Plan Agent (line 360)

**No Computed Paths:**
There is no path resolution function, utility, or centralized logic. Each agent independently constructs paths by:
1. Reading Target Branch from WorkflowContext.md or user input
2. Directly substituting the branch value into hardcoded path templates
3. Using the resulting string literal for file operations

**Artifact Paths Field (WorkflowContext.md):**
The `Artifact Paths` field exists in WorkflowContext.md template but is non-functional:
- Documented values: `<auto-derived or explicit>`
- "auto-derived" means use default `docs/agents/<target_branch>/` pattern
- "explicit" is documented but not implemented (no parsing logic exists)
- Field serves as documentation intent only
- All agents ignore this field's value and use hardcoded paths

**Subdirectory Handling:**
The `prompts/` subdirectory is referenced but not systematically created:
- Spec Agent writes to `prompts/spec-research.prompt.md` (relative to artifact directory)
- No explicit directory creation logic documented
- Agents rely on file creation tools to auto-create parent directories
- Path: `docs/agents/<target_branch>/prompts/<prompt-file>.md`

**Evidence:**
- No grep matches for "path resolution", "compute path", "resolve artifact", or similar utilities
- All 9 chatmode files contain literal `docs/agents/<target_branch>/` strings
- No conditional logic based on Artifact Paths field value
- Implementation Plan Agent (lines 72-75, 93, 322-323, 353, 360) shows repeated hardcoded patterns
- Spec Agent (line 58, 74, 86) hardcodes `prompts/spec-research.prompt.md`

### 9. Subdirectory Handling for prompts/

**Current Behavior:**
Agents reference the `prompts/` subdirectory for storing research prompt files, but directory creation is implicit rather than explicit.

**Prompts Directory Usage:**
Only the Spec Agent creates files in the `prompts/` subdirectory:
- File: `prompts/spec-research.prompt.md`
- Full path: `docs/agents/<target_branch>/prompts/spec-research.prompt.md`
- Created by: PAW-01A Spec Agent

**References in Chatmode Files:**
From PAW-01A Spec Agent.chatmode.md:
- Line 58: "Generate `prompts/spec-research.prompt.md` containing questions about the behavior of the system"
- Line 74: Output of Research Preparation mode: `prompts/spec-research.prompt.md` + pause
- Line 86: "Create `prompts/spec-research.prompt.md` using minimal format"

**Directory Creation Mechanism:**
No explicit directory creation is documented or instructed:
- Agents rely on file creation operations (create_file tool) to automatically create parent directories
- VS Code's file creation tools create intermediate directories as needed
- No `mkdir` commands or explicit directory creation steps in agent instructions

**Observed Structure:**
From existing feature directories in `docs/agents/feature/`:
- `finalize-initial-chatmodes/prompts/` - Contains 7 prompt files
- `move-to-paw-directory/prompts/` - Contains 2 prompt files
- `param-doc/prompts/` - Contains 5 prompt files
- `vs-code-ext/prompts/` - Contains 1 prompt file

**Pattern:**
The `prompts/` subdirectory appears in all feature directories that have had research stages run, confirming it's created automatically by file operations rather than explicit commands.

**Other Subdirectories:**
No other subdirectories are currently used or referenced in the artifact structure. The pattern is:
```
docs/agents/<target_branch>/
├── WorkflowContext.md
├── Spec.md
├── SpecResearch.md
├── CodeResearch.md
├── ImplementationPlan.md
├── Docs.md
└── prompts/
    ├── spec-research.prompt.md
    ├── code-research.prompt.md
    └── [other prompt files as needed]
```

**Evidence:**
- PAW-01A Spec Agent.chatmode.md:58, 74, 86 - prompt file path references
- Directory structure from `docs/agents/feature/` subdirectories
- No grep matches for "mkdir", "create directory", or explicit directory creation instructions
- File creation tools in VS Code workspace automatically handle parent directory creation

### 10. WorkflowContext.md Parsing and Extensibility

**Current Format:**
WorkflowContext.md uses a simple key-value Markdown format with minimal structure:

```markdown
# WorkflowContext

Work Title: <work_title>
Target Branch: <target_branch>
GitHub Issue: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

**Parsing Mechanism:**
Agents parse WorkflowContext.md informally through natural language understanding:
- Files are read into chat context as Markdown
- Agents extract values by pattern matching field labels
- No formal parser, schema, or validation logic
- Agents rely on LLM's ability to understand "Work Title: X" → extract "X"

**Field Recognition:**
Agents are instructed to extract specific fields by name:
- "Extract Target Branch, GitHub Issue, Remote, Artifact Paths, and Additional Inputs"
- Field names are hardcoded in agent instructions
- Adding new fields requires updating agent instructions to mention them

**Extensibility:**
The format is extensible in practice due to its informal nature:

**Easy to Add Fields:**
- Agents can be instructed to look for new field names
- No schema validation to break
- Markdown format allows arbitrary key-value pairs
- Agents naturally ignore unknown fields they're not instructed to extract

**Adding Feature Slug Field:**
Based on the current pattern, adding a Feature Slug field would require:
1. Update WorkflowContext.md template in all 9 agent chatmode files
2. Update extraction instructions to include "Feature Slug"
3. Update creation/update instructions to write the new field
4. No format changes needed - just add line: `Feature Slug: <feature_slug>`

**Field Ordering:**
Current template shows specific order:
1. Work Title
2. Target Branch
3. GitHub Issue
4. Remote
5. Artifact Paths
6. Additional Inputs

No evidence that order matters for parsing (agents extract by field name, not position).

**Default Values:**
Some fields have default behaviors:
- Remote: Defaults to `origin` when omitted (agents never prompt for it)
- Artifact Paths: Defaults to "auto-derived" when not specified
- Other fields: Agents prompt or derive when missing

**Validation:**
No formal validation exists:
- Agents check for "missing or lacks a Target Branch"
- Missing fields trigger prompts or derivation
- Invalid field values (e.g., malformed URLs) not validated
- Format errors (e.g., missing colons) would cause extraction failures

**Update Mechanism:**
Agents update WorkflowContext.md by:
1. Reading entire file
2. Modifying specific field values
3. Writing entire file back
4. Preserving other fields unchanged

From agent instructions: "Update the file whenever you learn a new parameter... persist the updated value so later stages inherit it"

**Evidence:**
- All 9 chatmode files contain identical WorkflowContext.md template
- No schema files, validators, or parsing utilities in codebase
- Agent instructions use phrase "extract Target Branch, GitHub Issue, Remote..."
- PAW-01A Spec Agent.chatmode.md:48: Template shows field structure
- PAW-01B Spec Research Agent.chatmode.md:31: "derive the branch... and write `docs/agents/<target_branch>/WorkflowContext.md`"
- PAW-02B Impl Planner.chatmode.md:43: Shows same template format

### 11. Error Handling for Missing Paths

**Current Behavior:**
Agents handle missing artifact directories and files through automatic creation and prompting, with no explicit error handling documented.

**Missing WorkflowContext.md:**
When `docs/agents/<target_branch>/WorkflowContext.md` doesn't exist:

**All Agents Follow Same Pattern:**
1. Check for file in chat context or on disk
2. If missing or lacks Target Branch, derive/gather required parameters
3. Write WorkflowContext.md to `docs/agents/<target_branch>/WorkflowContext.md`
4. Proceed with primary task

**Examples from Agent Instructions:**

From PAW-01B Spec Research Agent (line 31):
```markdown
If the file is missing or lacks a Target Branch, derive the branch from the current repository state 
(or ask the user) and write `docs/agents/<target_branch>/WorkflowContext.md` before continuing.
```

From PAW-02A Code Researcher (line 37):
```markdown
If the file is missing or lacks a Target Branch, determine the branch (use the current branch when necessary) 
and write it to `docs/agents/<target_branch>/WorkflowContext.md` before proceeding with research.
```

**Missing Artifact Directory:**
No explicit handling for missing `docs/agents/<target_branch>/` directory:
- Agents rely on file creation operations to create parent directories automatically
- VS Code's create_file tool creates intermediate directories as needed
- No defensive checks for directory existence
- No `mkdir` commands in agent instructions

**Missing Prerequisite Artifacts:**
When expected input artifacts don't exist:

**Implementation Plan Agent Pattern:**
Expects these artifacts to exist:
- `docs/agents/<target_branch>/Spec.md`
- `docs/agents/<target_branch>/SpecResearch.md`
- `docs/agents/<target_branch>/CodeResearch.md`

If missing, the agent would likely:
1. Attempt to read the file
2. Receive error from file read operation
3. Report to user that prerequisite is missing
4. Request user provide the artifact or run prerequisite stage

No explicit error handling is documented - agents rely on tool failures and natural language to communicate issues.

**Missing Prompts Directory:**
The `prompts/` subdirectory is created automatically:
- Spec Agent writes `prompts/spec-research.prompt.md`
- File creation tool creates parent `prompts/` directory
- No explicit check or creation step needed

**Directory Creation Timing:**
Directories are created implicitly when:
1. Agent writes WorkflowContext.md → creates `docs/agents/<target_branch>/`
2. Agent writes first artifact → `docs/agents/<target_branch>/` exists from WorkflowContext.md
3. Agent writes prompt file → creates `docs/agents/<target_branch>/prompts/`

**No Failure Scenarios Documented:**
Agent instructions don't cover:
- Filesystem permission errors
- Invalid branch names creating invalid paths
- Disk space issues
- Path length limits
- Race conditions (multiple agents running simultaneously)

**Assumption of Success:**
Agents assume file operations succeed and directories can be created freely. Error handling relies on:
1. Tool error messages bubbling up to agent
2. Agent explaining error to user in natural language
3. User intervention to resolve issues

**Evidence:**
- All 9 agents have identical "if missing... write WorkflowContext.md" pattern
- No grep matches for "error", "try/catch", "handle failure", "permission denied"
- No defensive programming patterns in agent instructions
- Implementation Plan Agent (lines 72-75) reads prerequisites without error handling instructions
- Spec Agent (line 86) writes prompt file without directory creation step

### 12. Cross-Agent Path Consistency

**Consistency Status:**
All PAW agents use identical path resolution logic - the same hardcoded pattern with no variations.

**Universal Pattern:**
Every agent uses: `docs/agents/<target_branch>/<Artifact>.md`

**Agent-by-Agent Analysis:**

**PAW-01A Spec Agent:**
- WorkflowContext.md: `docs/agents/<target_branch>/WorkflowContext.md`
- Output: Not applicable (doesn't directly write Spec.md path is in template)
- Prompts: `prompts/spec-research.prompt.md` (relative to agent dir)

**PAW-01B Spec Research Agent:**
- WorkflowContext.md: `docs/agents/<target_branch>/WorkflowContext.md`
- Output: `docs/agents/<target_branch>/SpecResearch.md` (line 101: "canonical path")

**PAW-02A Code Researcher:**
- WorkflowContext.md: `docs/agents/<target_branch>/WorkflowContext.md`
- Output: `docs/agents/<target_branch>/CodeResearch.md` (lines 99, 105, 378)

**PAW-02B Implementation Plan Agent:**
- WorkflowContext.md: `docs/agents/<target_branch>/WorkflowContext.md`
- Input artifacts: `docs/agents/<target_branch>/{Spec,SpecResearch,CodeResearch}.md` (lines 72-74)
- Output: `docs/agents/<target_branch>/ImplementationPlan.md` (line 227, 334, 452)
- Git staging: `docs/agents/<target_branch>/<file>` (line 93)
- PR links: `docs/agents/<target_branch>/{Spec,SpecResearch,CodeResearch,ImplementationPlan}.md` (line 360)

**PAW-03A Implementer:**
- WorkflowContext.md: `docs/agents/<target_branch>/WorkflowContext.md`
- Reads: ImplementationPlan.md from standard location (inferred, not explicit)

**PAW-03B Implementation Review Agent:**
- WorkflowContext.md: `docs/agents/<target_branch>/WorkflowContext.md`
- Reads: WorkflowContext.md to get Work Title (line 38)

**PAW-04 Documenter:**
- WorkflowContext.md: `docs/agents/<target_branch>/WorkflowContext.md`
- Output: `docs/agents/<target_branch>/Docs.md` (lines 137, 347)

**PAW-05 PR Agent:**
- WorkflowContext.md: `docs/agents/<target_branch>/WorkflowContext.md`
- Validation: Checks existence of `docs/agents/<target_branch>/Docs.md` (line 64)

**PAW-X Status Update Agent:**
- WorkflowContext.md: `docs/agents/<target_branch>/WorkflowContext.md`

**No Variations Found:**
- Zero agents use alternative path patterns
- Zero agents compute paths differently
- Zero agents parameterize paths beyond `<target_branch>` substitution
- Zero agents support custom artifact locations

**Shared Terminology:**
All agents use phrase "canonical path" when describing artifact location:
- Example: "Save at: `docs/agents/<target_branch>/SpecResearch.md` (canonical path)"

**Consistency Mechanism:**
Path consistency is maintained through:
1. Manual duplication across chatmode files (copy-paste pattern)
2. All chatmode files authored/updated together
3. No centralized logic to enforce consistency
4. No tests to verify path agreement

**Risk of Drift:**
If a single agent's path is updated incorrectly:
- Other agents would look in wrong location
- Artifacts could be scattered
- No runtime enforcement or validation
- Only testing would catch the issue

**Evidence:**
- Grep search for `docs/agents/` found 100+ matches with identical pattern
- No conditional logic or alternative paths found
- All agents use same WorkflowContext.md location check
- Implementation Plan Agent shows most path references (20+ instances) all following same pattern
- No centralized path resolution module found in codebase

### 13. Existing Slug or Normalization Utilities

**Search Results:**
No slug normalization utilities, functions, or patterns exist in the current codebase.

**Searches Performed:**
- Grep for "slug": No matches
- Grep for "normalize": No matches  
- Grep for "sanitize": No matches
- Grep for "filesystem": No matches in code context
- Semantic search for string manipulation utilities: No relevant results

**No String Normalization Code:**
The PAW repository contains only:
- Markdown documentation files
- Chatmode instruction files (.chatmode.md)
- No executable code (Python, JavaScript, etc.)
- No utility libraries or helper functions

**Chatmode Files Are Instructions:**
Agent chatmode files are natural language instructions for LLMs, not executable code:
- Define agent behavior through prose
- Contain no functions, classes, or code modules
- Cannot contain reusable utilities

**Implication:**
Slug normalization logic must be implemented as:
1. Instructions in agent chatmode files (prose description)
2. Agents perform normalization using their general capabilities
3. No reusable code module can be created within current architecture

**Existing String Manipulation:**
The only existing string transformations are:
1. Work Title generation (extracting 2-4 words from Issue title)
2. Branch name usage (verbatim from git)
3. Path construction (string interpolation with `<target_branch>`)

None of these involve filesystem-safe normalization or slug generation.

**External Dependencies:**
PAW agents run in VS Code using:
- GitHub Copilot Chat
- Built-in VS Code tools (file operations, terminal)
- GitHub API (via mcp tools)
- No custom libraries or external utilities

Agents cannot import or use external slug normalization libraries directly.

**Pattern from Other Features:**
Looking at existing PAW features for comparison:
- `feature/finalize-initial-chatmodes/` - branch name used as-is
- `feature/param-doc/` - branch name used as-is
- `feature/move-to-paw-directory/` - branch name used as-is (current feature)

All directory names match branch names exactly with no normalization.

**Evidence:**
- Empty `scripts/` directory (from param-doc CodeResearch.md:243)
- No matches for normalization-related terms in codebase
- Repository structure shows only documentation and chatmode files
- No programming language files (.py, .js, .ts, .go, etc.) in repository root or subdirectories

### 14. String Similarity Detection Utilities

**Search Results:**
No string similarity detection utilities, fuzzy matching functions, or edit distance implementations exist in the current codebase.

**Searches Performed:**
- Grep for "similarity": No matches
- Grep for "fuzzy": No matches
- Grep for "edit distance": No matches
- Grep for "levenshtein": No matches
- Grep for "match": Only generic references, no utility functions

**No Similarity Detection Code:**
Same as slug normalization (see question 11):
- Repository contains only documentation and instructions
- No executable code or utility libraries
- Agent chatmode files are prose, not code
- Cannot contain reusable similarity functions

**Specification References:**
The Spec.md for move-to-paw-directory mentions similarity detection:

From Spec.md line 152:
```markdown
Similarity detection uses simple string distance metrics (e.g., edit distance, common prefixes) 
rather than semantic analysis
```

This is a requirement for the new feature, not an existing capability.

**Implication:**
Similarity detection must be implemented as:
1. Instructions in agent chatmode files describing the algorithm
2. Agents using their general reasoning to compare strings
3. No code module - agents perform comparison through LLM capabilities

**Potential Approaches:**
Based on Spec.md, similarity detection would use:
- Edit distance (Levenshtein distance)
- Common prefix detection
- Character difference counting
- Simple heuristics rather than advanced NLP

**Agent Capabilities:**
LLMs (including Copilot) can perform similarity comparisons without explicit code:
- Understand string similarity conceptually
- Compare strings character-by-character if instructed
- Apply rules like "warn if strings differ by less than 3 characters"
- No need for imported library - reasoning handles it

**Evidence:**
- No matches for similarity-related terms in existing codebase
- Spec.md defines similarity as new requirement, not existing capability
- Repository architecture (prose instructions) doesn't support code utilities
- Same constraint as slug normalization - must be implemented through instructions

## Open Unknowns

None. All internal research questions were answered through examination of the codebase and existing PAW agent chatmode files.

## User-Provided External Knowledge (Manual Fill)

The following external/context questions from the research prompt are listed for optional manual completion by the user. These are not required for specification writing but may provide additional context:

### External Question 1: Feature slug naming conventions
**Question:** Are there established industry standards or best practices for feature identifiers in version control systems or project management tools (e.g., JIRA issue keys, GitHub project slugs)? What constraints (length, character set, uniqueness) are commonly enforced?

**User Answer:** (To be filled in by user if desired)

### External Question 2: Migration strategies  
**Question:** What are common approaches for migrating file-based workflow systems from one directory structure to another while maintaining backward compatibility? Are there examples of dual-mode operation during transitions?

**User Answer:** (To be filled in by user if desired)

---

## Summary of Key Findings

1. **Path Derivation**: All agents hardcode `docs/agents/<target_branch>/` pattern; no override mechanism exists despite "Artifact Paths" field
2. **Artifact Paths Field**: Documents intent but has no functional implementation; only "auto-derived" works
3. **WorkflowContext.md**: Created by any agent at any stage when missing; distributed creation responsibility
4. **Update Scope**: 50+ path references across 9 chatmode files + paw-specification.md
5. **Directory Structure**: Flat organization under `docs/agents/feature/`, branch names as folder names
6. **Branch Usage**: Heavy reliance on `<target_branch>` for both paths and branch naming conventions

**Implications for Specification:**
- Migration requires updating all chatmode files with new path construction logic
- Need to decide how feature slugs relate to branch names (same? different? stored in WorkflowContext.md?)
- PR description artifact links will need updating if paths change
- Backward compatibility strategy needed for existing `docs/agents/` artifacts
