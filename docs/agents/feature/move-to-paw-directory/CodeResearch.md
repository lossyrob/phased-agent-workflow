---
date: 2025-10-22T12:43:07-04:00
git_commit: 8ab036b4afdbeccc4d0885a3fdf60bc7d201f842
branch: feature/move-to-paw-directory
repository: phased-agent-workflow
topic: "PAW Directory Restructure - Implementation Details"
tags: [research, codebase, paw, chatmodes, path-refactoring, directory-structure]
status: complete
last_updated: 2025-10-22
---

# Research: PAW Directory Restructure - Implementation Details

**Date**: 2025-10-22 12:43:07 EDT  
**Git Commit**: 8ab036b4afdbeccc4d0885a3fdf60bc7d201f842  
**Branch**: feature/move-to-paw-directory  
**Repository**: phased-agent-workflow

## Research Question

Document the exact implementation details needed to restructure PAW artifact storage from `docs/agents/<target_branch>/` to `.paw/work/<feature-slug>/`, including:
- Every hardcoded path reference requiring updates across all 9 chatmode files
- WorkflowContext.md template structure and where Feature Slug field needs addition
- PR description generation logic for artifact links
- File creation and directory handling patterns
- Approaches for implementing slug normalization, validation, and conflict detection in chatmode instruction format

## Summary

The PAW workflow system stores artifacts in `docs/agents/<target_branch>/` via hardcoded path references across 9 chatmode files (`.github/chatmodes/PAW-*.chatmode.md`). All agents use identical WorkflowContext.md template and path resolution patterns. Implementing the new `.paw/work/<feature-slug>/` structure requires updating 50+ path references, adding Feature Slug field to WorkflowContext.md, implementing slug generation/normalization/validation logic as prose instructions, and updating PR description artifact links.

**Key Finding**: Chatmode files are natural language instructions (not executable code), so slug normalization and validation must be expressed as clear English rules within agent instructions. Agents rely on file creation tools that automatically create parent directories.

## Detailed Findings

### 1. Hardcoded Path References in Chatmode Files

All 9 PAW chatmode files contain hardcoded path references using the pattern `docs/agents/<target_branch>/<Artifact>.md`. Total estimated updates: **50+ individual references**.

#### PAW-01A Spec Agent (`.github/chatmodes/PAW-01A Spec Agent.chatmode.md`)

**Path references requiring updates:**

- Line 26: WorkflowContext.md check location
  ```markdown
  Check for `WorkflowContext.md` in chat context or on disk at `docs/agents/<target_branch>/WorkflowContext.md`
  ```

- Line 49: WorkflowContext.md creation location
  ```markdown
  write the file to `docs/agents/<target_branch>/WorkflowContext.md` before proceeding
  ```

- Line 52: Artifact path auto-derivation pattern
  ```markdown
  Artifact paths can be auto-derived using `docs/agents/<target_branch>/<Artifact>.md`
  ```

- Line 189: SpecResearch.md reference in documentation
  ```markdown
  Research: docs/agents/<branch>/SpecResearch.md
  ```

- Line 276: Spec.md output location in checklist
  ```markdown
  Spec.md drafted (written to disk at `docs/agents/<branch>/Spec.md`)
  ```

**Additional context:**
- Prompt file reference (line 58, 74, 86): `prompts/spec-research.prompt.md` (relative path, needs directory context)
- Work Title usage: Generates Work Title for PR naming (lines 29, 48, 93-99)

**Impact**: 5 direct path references + prompt subdirectory handling

---

#### PAW-01B Spec Research Agent (`.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md`)

**Path references requiring updates:**

- Line 10: WorkflowContext.md check location
  ```markdown
  Check for `WorkflowContext.md` in the chat context or on disk at `docs/agents/<target_branch>/WorkflowContext.md`
  ```

- Line 31: WorkflowContext.md creation location
  ```markdown
  write `docs/agents/<target_branch>/WorkflowContext.md` before continuing
  ```

- Line 101: SpecResearch.md output location (marked as "canonical path")
  ```markdown
  Save at: `docs/agents/<target_branch>/SpecResearch.md` (canonical path)
  ```

- Line 136: Quality checklist save path verification
  ```markdown
  `SpecResearch.md` saved to `docs/agents/<target_branch>/SpecResearch.md`
  ```

- Line 144: Hand-off message path
  ```markdown
  docs/agents/<target_branch>/SpecResearch.md
  ```

**Impact**: 5 path references

---

#### PAW-02A Code Researcher (`.github/chatmodes/PAW-02A Code Researcher.chatmode.md`)

**Path references requiring updates:**

- Line 39: WorkflowContext.md check location
  ```markdown
  look for `WorkflowContext.md` in the chat context or on disk at `docs/agents/<target_branch>/WorkflowContext.md`
  ```

- Line 53: WorkflowContext.md creation location
  ```markdown
  write it to `docs/agents/<target_branch>/WorkflowContext.md` before proceeding
  ```

- Line 99: CodeResearch.md output location (marked as "canonical path")
  ```markdown
  Save the research document to the canonical path: `docs/agents/<target_branch>/CodeResearch.md`
  ```

- Line 105: CodeResearch.md write path
  ```markdown
  Write the document to `docs/agents/<target_branch>/CodeResearch.md`
  ```

- Line 378: Quality checklist save path verification
  ```markdown
  `CodeResearch.md` saved to `docs/agents/<target_branch>/CodeResearch.md`
  ```

- Line 386: Hand-off message path
  ```markdown
  docs/agents/<target_branch>/CodeResearch.md
  ```

**Impact**: 6 path references

---

#### PAW-02B Implementation Plan Agent (`.github/chatmodes/PAW-02B Impl Planner.chatmode.md`)

**Path references requiring updates (most extensive):**

- Line 10: WorkflowContext.md check location
  ```markdown
  look for `WorkflowContext.md` in chat context or on disk at `docs/agents/<target_branch>/WorkflowContext.md`
  ```

- Line 50: WorkflowContext.md creation location
  ```markdown
  write `docs/agents/<target_branch>/WorkflowContext.md` before proceeding
  ```

- Line 72: Spec.md input artifact location
  ```markdown
  `docs/agents/<target_branch>/Spec.md`
  ```

- Line 73: SpecResearch.md input artifact location
  ```markdown
  `docs/agents/<target_branch>/SpecResearch.md`
  ```

- Line 74: CodeResearch.md input artifact location
  ```markdown
  `docs/agents/<target_branch>/CodeResearch.md`
  ```

- Line 75: ImplementationPlan.md input artifact location (for reading existing plan)
  ```markdown
  `docs/agents/<target_branch>/ImplementationPlan.md`
  ```

- Line 93: Git staging command for artifact files
  ```markdown
  Stage ONLY the changed files: `git add docs/agents/<target_branch>/<file>`
  ```

- Line 227: ImplementationPlan.md output location
  ```markdown
  Incrementally write the plan to `docs/agents/<target_branch>/ImplementationPlan.md`
  ```

- Line 322: Spec.md reference in plan template
  ```markdown
  Spec: `docs/agents/<target_branch>/Spec.md`
  ```

- Line 323: SpecResearch.md and CodeResearch.md references in plan template (2 occurrences)
  ```markdown
  Research: `docs/agents/<target_branch>/SpecResearch.md`, `docs/agents/<target_branch>/CodeResearch.md`
  ```

- Line 334: ImplementationPlan.md output path in review section
  ```markdown
  `docs/agents/<target_branch>/ImplementationPlan.md`
  ```

- Line 353: Git staging for planning artifacts (complete list)
  ```markdown
  git add docs/agents/<target_branch>/{Spec.md,SpecResearch.md,CodeResearch.md,ImplementationPlan.md}
  ```

- Line 360: PR description artifact links (4 artifact links)
  ```markdown
  Links to `docs/agents/<target_branch>/Spec.md`, `docs/agents/<target_branch>/SpecResearch.md`, 
  `docs/agents/<target_branch>/CodeResearch.md`, and `docs/agents/<target_branch>/ImplementationPlan.md`
  ```

- Line 452: Hand-off message path
  ```markdown
  docs/agents/<target_branch>/ImplementationPlan.md
  ```

**Impact**: 20+ path references (most complex agent)

---

#### PAW-03A Implementer (`.github/chatmodes/PAW-03A Implementer.chatmode.md`)

**Path references requiring updates:**

- Line 13: WorkflowContext.md check location
  ```markdown
  Look for `WorkflowContext.md` in chat context or on disk at `docs/agents/<target_branch>/WorkflowContext.md`
  ```

- Line 37: WorkflowContext.md creation location
  ```markdown
  write it to `docs/agents/<target_branch>/WorkflowContext.md` before proceeding
  ```

**Additional context:**
- Reads ImplementationPlan.md (implied, not explicit path in visible content)
- Reads CodeResearch.md (mentioned in instructions but path not hardcoded in visible excerpt)

**Impact**: 2-3 path references

---

#### PAW-03B Implementation Review Agent (`.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`)

**Path references requiring updates:**

- Line 10: WorkflowContext.md check location
  ```markdown
  Look for `WorkflowContext.md` in chat context or on disk at `docs/agents/<target_branch>/WorkflowContext.md`
  ```

- Line 31: WorkflowContext.md creation location
  ```markdown
  write it to `docs/agents/<target_branch>/WorkflowContext.md` before starting review work
  ```

- Line 38: WorkflowContext.md read for Work Title
  ```markdown
  Read `docs/agents/<target_branch>/WorkflowContext.md` to get the Work Title
  ```

**Additional context:**
- Work Title used in PR title (line 145): `[<Work Title>] Implementation Phase <N>: <brief description>`
- References implementation plan (not explicit path shown)

**Impact**: 3 path references

---

#### PAW-04 Documenter (`.github/chatmodes/PAW-04 Documenter.chatmode.md`)

**Path references requiring updates:**

- Line 10: WorkflowContext.md check location
  ```markdown
  Check for `WorkflowContext.md` in chat context or on disk at `docs/agents/<target_branch>/WorkflowContext.md`
  ```

- Line 33: WorkflowContext.md creation location
  ```markdown
  write it to `docs/agents/<target_branch>/WorkflowContext.md` before producing documentation
  ```

- Line 40: WorkflowContext.md read for Work Title
  ```markdown
  Read `docs/agents/<target_branch>/WorkflowContext.md` to get the Work Title
  ```

- Line 137: Docs.md output location (canonical documentation artifact)
  ```markdown
  `docs/agents/<target_branch>/Docs.md` - Comprehensive feature documentation
  ```

- Line 347: Docs.md output location in hand-off message
  ```markdown
  Detailed documentation serving as the authoritative technical reference at docs/agents/<target_branch>/Docs.md
  ```

**Additional context:**
- Work Title used in PR title (line 119): `[<Work Title>] Documentation`

**Impact**: 5-6 path references

---

#### PAW-05 PR Agent (`.github/chatmodes/PAW-05 PR.chatmode.md`)

**Path references requiring updates:**

- Line 10: WorkflowContext.md check location
  ```markdown
  look for `WorkflowContext.md` in chat context or on disk at `docs/agents/<target_branch>/WorkflowContext.md`
  ```

- Line 34: WorkflowContext.md creation location
  ```markdown
  write it to `docs/agents/<target_branch>/WorkflowContext.md` before running pre-flight checks
  ```

- Line 41: WorkflowContext.md read for Work Title
  ```markdown
  Read `docs/agents/<target_branch>/WorkflowContext.md` to get the Work Title
  ```

- Line 64: Docs.md existence check in pre-flight validation
  ```markdown
  Docs.md exists at `docs/agents/<target_branch>/Docs.md`
  ```

**Additional context:**
- Work Title used in PR title (line 159): `[<Work Title>] <description>`
- PR description template includes artifact links (template structure, not specific paths shown in excerpts)

**Impact**: 4 path references

---

#### PAW-X Status Update Agent (`.github/chatmodes/PAW-X Status Update.chatmode.md`)

**Path references requiring updates:**

- Line 9: WorkflowContext.md check location
  ```markdown
  look for `WorkflowContext.md` in chat context or on disk at `docs/agents/<target_branch>/WorkflowContext.md`
  ```

- Line 25: WorkflowContext.md creation location
  ```markdown
  write it to `docs/agents/<target_branch>/WorkflowContext.md` before generating status updates
  ```

**Additional context:**
- References artifacts in status dashboard (implied links)

**Impact**: 2 path references

---

#### Summary of Path References by File

| Chatmode File | Direct Path References | Notes |
|--------------|------------------------|-------|
| PAW-01A Spec Agent | 5 | + prompt subdirectory |
| PAW-01B Spec Research | 5 | |
| PAW-02A Code Researcher | 6 | |
| PAW-02B Impl Planner | 20+ | Most complex, includes PR links |
| PAW-03A Implementer | 3 | |
| PAW-03B Impl Reviewer | 3 | |
| PAW-04 Documenter | 6 | |
| PAW-05 PR Agent | 4 | + PR template links |
| PAW-X Status Update | 2 | + dashboard links |
| **Total** | **50+** | Across all 9 chatmode files |

---

### 2. WorkflowContext.md Template Structure

**Current Template** (used identically in all 9 agents):

```markdown
# WorkflowContext

Work Title: <work_title>
Target Branch: <target_branch>
GitHub Issue: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

**Template location in each chatmode file:**
- PAW-01A Spec Agent: lines 45-52
- PAW-01B Spec Research: lines 22-29
- PAW-02A Code Researcher: lines 44-51
- PAW-02B Impl Planner: lines 41-48
- PAW-03A Implementer: lines 28-35
- PAW-03B Impl Reviewer: lines 22-29
- PAW-04 Documenter: lines 24-31
- PAW-05 PR Agent: lines 25-32
- PAW-X Status Update: lines 16-23

**Field Definitions:**

1. **Work Title**: 
   - Auto-generated by Spec Agent from GitHub Issue title or feature brief
   - Format: 2-4 word descriptive name (e.g., "Auth System", "API Refactor")
   - Used exclusively for PR title prefixes: `[<Work Title>] <description>`
   - Defined in PAW-01A lines 29, 48, 93-99
   - Read for PR naming by: PAW-02B (line 358), PAW-03B (line 145), PAW-04 (line 119), PAW-05 (line 159)

2. **Target Branch**:
   - Git branch containing completed work (e.g., "feature/add-authentication")
   - Currently used for BOTH: artifact path construction AND git operations
   - Required field; agents derive from current branch if missing
   - Authoritative for branch naming and PR operations

3. **GitHub Issue**:
   - URL or ID of related GitHub Issue
   - Optional but tracked for linking

4. **Remote**:
   - Git remote name (defaults to `origin` when omitted)
   - Never prompts user if missing (silent default)

5. **Artifact Paths**:
   - Documented values: `<auto-derived or explicit>`
   - "auto-derived" = use `docs/agents/<target_branch>/<Artifact>.md`
   - "explicit" = documented but NOT IMPLEMENTED (no parsing logic exists)
   - Field serves documentation purpose only; all agents ignore value and use hardcoded paths

6. **Additional Inputs**:
   - Comma-separated list or 'none'
   - Flexible field for workflow-specific parameters

**Field Extraction Logic:**

Agents extract fields through natural language understanding (no formal parser):
- Read WorkflowContext.md as Markdown into chat context
- Extract values by recognizing field labels (e.g., "Work Title: X" → extract "X")
- No schema validation or error handling for malformed files
- Missing fields trigger prompts or derivation (except Remote, which silently defaults)

**Example extraction instruction (PAW-01A line 26):**
```
extract Target Branch, Work Title, GitHub Issue, Remote (default to `origin` when omitted), 
Artifact Paths, and Additional Inputs before asking the user for them
```

**Where Feature Slug Field Needs Addition:**

To support `.paw/work/<feature-slug>/` paths, add new field to template:

```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>        # <-- NEW FIELD (required for path resolution)
Target Branch: <target_branch>
GitHub Issue: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

**Required template updates:**
- All 9 chatmode files: Update WorkflowContext.md template block
- All 9 chatmode files: Update field extraction instructions to include "Feature Slug"
- All 9 chatmode files: Update creation/update logic to generate or write Feature Slug

---

### 3. PR Description Artifact Link Generation

PR descriptions contain artifact links constructed using the hardcoded path pattern. When paths change to `.paw/work/<feature-slug>/`, these links must be updated.

#### Planning PR (PAW-02B Implementation Plan Agent)

**Location:** `.github/chatmodes/PAW-02B Impl Planner.chatmode.md:360`

**Current link format:**
```markdown
Links to `docs/agents/<target_branch>/Spec.md`, 
`docs/agents/<target_branch>/SpecResearch.md`, 
`docs/agents/<target_branch>/CodeResearch.md`, 
and `docs/agents/<target_branch>/ImplementationPlan.md`
```

**PR title format** (line 358):
```
[<Work Title>] Planning: <brief description>
```
Where `<Work Title>` is read from `WorkflowContext.md`

**Required changes:**
- Replace `docs/agents/<target_branch>/` with `.paw/work/<feature-slug>/`
- Update instructions to construct links using Feature Slug instead of Target Branch

---

#### Phase PRs (PAW-03B Implementation Review Agent)

**Location:** `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md:145`

**PR title format:**
```
[<Work Title>] Implementation Phase <N>: <brief description>
```

**Artifact links:**
- Not explicitly documented in excerpt, but phase PRs reference ImplementationPlan.md
- Implicit links to artifact locations

**Required changes:**
- Update any artifact path references in PR descriptions to use `.paw/work/<feature-slug>/`

---

#### Documentation PR (PAW-04 Documenter)

**Location:** `.github/chatmodes/PAW-04 Documenter.chatmode.md:119`

**PR title format:**
```
[<Work Title>] Documentation
```

**PR description structure** (line 120):
```
Include summary of documentation added (highlight that Docs.md is the detailed feature reference) 
and reference to ImplementationPlan.md
```

**Required changes:**
- Update ImplementationPlan.md reference path from `docs/agents/<target_branch>/` to `.paw/work/<feature-slug>/`
- Update Docs.md reference path

---

#### Final PR (PAW-05 PR Agent)

**Location:** `.github/chatmodes/PAW-05 PR.chatmode.md:159`

**PR title format:**
```
[<Work Title>] <description>
```

**PR description template** (lines 78-143):

```markdown
## Artifacts
- Specification: [link to Spec.md]
- Spec Research: [link to SpecResearch.md]
- Code Research: [link to CodeResearch.md]
- Implementation Plan: [link to ImplementationPlan.md]
- Documentation: [link to Docs.md]
```

**Required changes:**
- All 5 artifact links must use `.paw/work/<feature-slug>/` instead of `docs/agents/<target_branch>/`
- Update PR creation instructions to construct links using Feature Slug field

---

#### Artifact Link Pattern

**Current pattern:**
```
[Artifact Name](docs/agents/<target_branch>/<Artifact>.md)
```

**New pattern:**
```
[Artifact Name](.paw/work/<feature-slug>/<Artifact>.md)
```

**Implementation approach:**
- Agents must read Feature Slug from WorkflowContext.md
- Construct artifact paths by substituting `<feature-slug>` into `.paw/work/<feature-slug>/<Artifact>.md`
- Update all PR description instructions to use new pattern

---

### 4. File Creation and Directory Handling Patterns

**Key Finding:** Agents rely on implicit directory creation via file operation tools; no explicit `mkdir` commands exist.

#### Directory Creation Mechanism

**Implicit creation** (all agents):
- Agents write files using `create_file` tool (VS Code workspace tool)
- Tool automatically creates parent directories as needed
- No explicit directory creation steps in agent instructions
- Pattern confirmed by existing feature directories in `docs/agents/feature/`

**Evidence:**
- No `mkdir` commands found in any chatmode file
- No "create directory" instructions
- Prompt subdirectory creation (e.g., `prompts/spec-research.prompt.md`) works without explicit directory commands
- Spec Agent (line 58, 74, 86) references `prompts/` subdirectory without creation step

**Example file write instruction** (PAW-01B line 101):
```
Save at: `docs/agents/<target_branch>/SpecResearch.md` (canonical path)
```
→ Implicitly creates `docs/agents/<target_branch>/` if needed

#### Subdirectory Handling

**Prompts subdirectory:**
- Used by Spec Agent for research prompts
- Path: `docs/agents/<target_branch>/prompts/<prompt-file>.md`
- Created automatically when Spec Agent writes prompt file
- No other subdirectories currently used

**Pattern:**
```
docs/agents/<target_branch>/
├── WorkflowContext.md
├── Spec.md
├── SpecResearch.md
├── CodeResearch.md
├── ImplementationPlan.md
├── Docs.md
└── prompts/
    └── spec-research.prompt.md
```

#### New Directory Structure Implementation

For `.paw/work/<feature-slug>/` implementation:

**Approach:**
- Rely on same implicit directory creation
- When agent writes first artifact to `.paw/work/<feature-slug>/Spec.md`, directory will be created automatically
- No explicit `mkdir .paw/work/<feature-slug>` command needed
- Maintains consistency with current pattern

**Validation:**
- Agents should check for directory existence when validating Feature Slug uniqueness
- Use file system tools to check if `.paw/work/<slug>/` already exists before creating new workflow
- If exists → conflict (prompt user for alternative slug or confirm override)

---

### 5. Slug Normalization Implementation Approach

**Critical Constraint:** Chatmode files are natural language instructions, not executable code. Normalization must be expressed as clear English rules.

#### Existing String Transformation Pattern: Work Title Generation

**Reference:** PAW-01A Spec Agent lines 29, 48, 93-99

**Current Work Title generation instructions:**
```markdown
**Work Title**: Generate a short, descriptive name (2-4 words) from the GitHub Issue title 
or feature brief when creating WorkflowContext.md. Refine it during spec iterations if needed for clarity.
```

**Generation rules** (inferred from examples):
- Extract 2-4 most descriptive words from source
- Remove filler words ("the", "a", "an")
- Capitalize major words
- Examples: "WorkflowContext", "Auth System", "API Refactor", "User Profiles"

**Work Title refinement** (lines 93-99):
```markdown
As the spec evolves and becomes clearer, refine Work Title if needed:
- Keep concise (2-4 words maximum)
- Make descriptive enough to identify feature
- Update WorkflowContext.md if title changes
- Inform user when Work Title is updated
```

This demonstrates how to express string transformation rules in natural language for agent instructions.

---

#### Feature Slug Normalization Rules

Following the Work Title pattern, slug normalization should be expressed as:

**Proposed instruction format for agents:**

```markdown
### Feature Slug Normalization

When generating or accepting a Feature Slug, normalize it according to these rules:

1. **Convert to lowercase:** "MyFeature" → "myfeature"

2. **Replace spaces with hyphens:** "my feature" → "my-feature"

3. **Replace special characters with hyphens:**
   - Underscores: "my_feature" → "my-feature"
   - Slashes: "api/refactor" → "api-refactor"
   - Colons: "fix: bug" → "fix-bug"
   - Parentheses, brackets: "feature (v2)" → "feature-v2"

4. **Remove invalid characters:** Keep only lowercase letters (a-z), numbers (0-9), and hyphens (-)

5. **Collapse consecutive hyphens:** "my--feature" → "my-feature"

6. **Trim leading/trailing hyphens:** "-myfeature-" → "myfeature"

7. **Enforce maximum length:** Truncate to 100 characters if longer

8. **Examples:**
   - "User Authentication System" → "user-authentication-system"
   - "API Refactor v2" → "api-refactor-v2"
   - "Fix Bug: Rate Limit (Auth)" → "fix-bug-rate-limit-auth"
   - "my_FEATURE--name__test" → "my-feature-name-test"
```

**Where to add:**
- All agents that create or modify WorkflowContext.md
- Spec Agent (PAW-01A): When creating WorkflowContext.md for first time
- All other agents: When Feature Slug is missing and needs generation

**Auto-generation from Work Title:**
```markdown
When Feature Slug is missing and Work Title exists, auto-generate the slug:
- Apply normalization rules to Work Title
- Verify uniqueness (check if `.paw/work/<generated-slug>/` exists)
- If conflict, append "-2", "-3", etc. until unique
- Write to WorkflowContext.md
```

**Auto-generation from GitHub Issue title:**
```markdown
When both Feature Slug and Work Title are missing:
- Generate Work Title from GitHub Issue title (existing logic)
- Generate Feature Slug by normalizing Work Title
- Verify uniqueness and handle conflicts
- Write both to WorkflowContext.md
```

---

### 6. Conflict Detection and Validation Patterns

**Challenge:** No existing validation logic in chatmode files. All validation must be expressed as new prose instructions.

#### Slug Validation Rules

**Proposed validation instruction format:**

```markdown
### Feature Slug Validation

Before accepting a Feature Slug (user-provided or auto-generated), validate it:

1. **Character validation:**
   - MUST contain only: lowercase letters (a-z), numbers (0-9), hyphens (-)
   - MUST NOT contain: uppercase, spaces, underscores, slashes, special characters
   - If invalid characters found, reject with error: "Slug contains invalid characters: [list]. Only lowercase letters, numbers, and hyphens allowed."

2. **Length validation:**
   - MUST be between 1 and 100 characters
   - MUST NOT be empty or whitespace-only
   - If too long: truncate to 100 characters (or reject and ask for shorter)

3. **Format validation:**
   - MUST NOT start or end with hyphen
   - MUST NOT contain consecutive hyphens
   - MUST NOT be reserved names: ".", "..", "node_modules", ".git", ".paw"
   - If format invalid, reject with clear error message

4. **Path separator validation:**
   - MUST NOT contain forward slashes (/) or backslashes (\)
   - If found, reject with error: "Slug cannot contain path separators"
```

**Where to add:**
- Spec Agent (PAW-01A): Validates slug when creating or updating WorkflowContext.md
- All other agents: Validates slug when checking WorkflowContext.md (defensive)

---

#### Directory Existence Check (Uniqueness Validation)

**Proposed instruction format:**

```markdown
### Feature Slug Uniqueness Check

After validating slug format, check for conflicts:

1. **Check directory existence:**
   - Use file system tools to check if `.paw/work/<slug>/` directory exists
   - If exists → CONFLICT DETECTED

2. **User-provided slug conflict:**
   - Inform user: "Feature Slug '<slug>' conflicts with existing directory at .paw/work/<slug>/"
   - Suggest alternatives: "<slug>-2", "<slug>-new", or prompt user for custom alternative
   - WAIT for user to provide alternative slug before proceeding
   - Validate and check uniqueness of new slug

3. **Auto-generated slug conflict:**
   - Automatically append numeric suffix: "<slug>-2", "<slug>-3", etc.
   - Check uniqueness of generated variant
   - Increment suffix until unique slug found
   - DO NOT prompt user for auto-generated conflicts (automatic resolution)
   - Inform user: "Auto-generated Feature Slug: '<final-slug>' (original '<slug>' already exists)"
```

**Implementation approach:**
- Use `list_dir` or similar file system tool to check `.paw/work/<slug>/` existence
- Express as conditional logic in prose
- Different behavior for user-provided vs auto-generated slugs

---

#### Similarity Detection

**Proposed instruction format:**

```markdown
### Feature Slug Similarity Warning

After confirming uniqueness, check for similar existing slugs (optional - only for user-provided slugs):

1. **List existing slugs:**
   - List all directories in `.paw/work/` to get existing feature slugs
   - Compare new slug against each existing slug

2. **Similarity detection:**
   - Check for common prefixes (first 5+ characters match)
   - Check for edit distance (differ by 1-3 characters)
   - Examples of similar slugs:
     - "user-profile" vs "user-profiles" (1 character difference)
     - "auth-system" vs "auth-system-v2" (common prefix)
     - "api-refactor" vs "api-refactoring" (3 character difference)

3. **User warning (user-provided slug only):**
   - If similar slug found, warn user: "Feature Slug '<slug>' is similar to existing '<existing-slug>'. This may cause confusion. Confirm or choose more distinct name?"
   - WAIT for user confirmation or alternative
   - If user confirms, proceed with slug

4. **Auto-generated slug handling:**
   - If auto-generated slug is similar to existing, automatically select more distinct variant
   - Append descriptive suffix: "<slug>-feature", "<slug>-work", "<slug>-new"
   - Verify uniqueness of variant
   - Inform user of final choice
```

**Where to add:**
- Spec Agent (PAW-01A): When creating WorkflowContext.md
- Optional for other agents (defensive check)

**Note:** Similarity detection is heuristic-based, not exact science. Keep simple (prefix matching, character difference count) rather than complex string distance algorithms.

---

### 7. Implementation Strategy Summary

#### Phase 1: Template Updates (All 9 Chatmode Files)

**Update WorkflowContext.md template:**
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

**Update field extraction instructions:**
- Add "Feature Slug" to extraction list
- Update all 9 agents' WorkflowContext.md parameter sections

---

#### Phase 2: Path Refactoring (All 9 Chatmode Files)

**Replace all hardcoded paths:**
- Search: `docs/agents/<target_branch>/`
- Replace: `.paw/work/<feature-slug>/`

**Files requiring updates:** All 9 chatmode files (50+ total references)

**Validation:**
- Grep for remaining `docs/agents/` references
- Verify all artifact paths use new pattern

---

#### Phase 3: Slug Logic (Primarily PAW-01A Spec Agent)

**Add to Spec Agent:**
1. Feature Slug normalization rules
2. Feature Slug validation rules
3. Feature Slug uniqueness checking
4. Feature Slug similarity detection
5. Auto-generation logic (from Work Title or Issue title)
6. Conflict resolution (user-provided vs auto-generated)

**Add to other agents (defensive):**
- Validation check when reading WorkflowContext.md
- Auto-generation if Feature Slug missing

---

#### Phase 4: PR Link Updates

**Update PR description instructions:**
- PAW-02B (Planning PR): Update artifact link construction (line 360)
- PAW-03B (Phase PRs): Update artifact references (implicit)
- PAW-04 (Docs PR): Update artifact references (line 120)
- PAW-05 (Final PR): Update artifact links template (lines 78-143)

---

#### Phase 5: Documentation

**Update paw-specification.md:**
- Document `.paw/work/<feature-slug>/` structure
- Explain Feature Slug concept and normalization
- Provide migration guide for users with existing `docs/agents/<branch>/` work

---

## Code References

### Chatmode Files (All Requiring Updates)

- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` - 5+ path references
- `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md` - 5 path references
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md` - 6 path references
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md` - 20+ path references
- `.github/chatmodes/PAW-03A Implementer.chatmode.md` - 3 path references
- `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` - 3 path references
- `.github/chatmodes/PAW-04 Documenter.chatmode.md` - 6 path references
- `.github/chatmodes/PAW-05 PR.chatmode.md` - 4 path references
- `.github/chatmodes/PAW-X Status Update.chatmode.md` - 2 path references

### Key Line References by Implementation Task

**WorkflowContext.md Template Updates:**
- PAW-01A: lines 45-52
- PAW-01B: lines 22-29
- PAW-02A: lines 44-51
- PAW-02B: lines 41-48
- PAW-03A: lines 28-35
- PAW-03B: lines 22-29
- PAW-04: lines 24-31
- PAW-05: lines 25-32
- PAW-X: lines 16-23

**Slug Generation Logic Location:**
- PAW-01A: lines 29, 48 (Work Title generation - pattern to follow)
- PAW-01A: lines 93-99 (Work Title refinement - pattern to follow)

**PR Description Artifact Links:**
- PAW-02B: line 360 (Planning PR links)
- PAW-03B: line 145 (Phase PR title)
- PAW-04: line 119-120 (Docs PR title and description)
- PAW-05: lines 78-143 (Final PR description template)

**Work Title Usage for PR Naming:**
- PAW-02B: line 358
- PAW-03B: line 145
- PAW-04: line 119
- PAW-05: line 159

---

## Architecture Documentation

### Current Architecture

**Artifact Storage:**
- Location: `docs/agents/<target_branch>/`
- Path construction: Hardcoded string interpolation with `<target_branch>` substitution
- Directory creation: Implicit (file creation tools auto-create parent directories)

**WorkflowContext.md:**
- Format: Simple key-value Markdown
- Parsing: Natural language understanding (no formal parser)
- Extensibility: Easy to add fields (just update template and extraction instructions)

**Path Resolution:**
- No centralized logic
- Each agent independently constructs paths using hardcoded pattern
- Consistency maintained via copy-paste across chatmode files

### New Architecture

**Artifact Storage:**
- Location: `.paw/work/<feature-slug>/`
- Path construction: Substitution using Feature Slug from WorkflowContext.md
- Directory creation: Same implicit approach (no changes needed)

**Feature Slug:**
- Purpose: Persistent, user-friendly identifier for workflow artifacts
- Source: Auto-generated from Work Title/Issue title, or user-provided
- Normalization: Lowercase, hyphens, alphanumeric only
- Validation: Format, uniqueness, similarity checks
- Storage: WorkflowContext.md (new field)

**Path Resolution:**
- Same approach (no centralized logic)
- Update all hardcoded patterns from `docs/agents/<target_branch>/` to `.paw/work/<feature-slug>/`

### Design Decisions

**Why prose instructions instead of code:**
- Chatmode files are LLM prompts, not executable programs
- Agents use general reasoning capabilities to apply rules
- Normalization/validation expressed as clear English instructions
- Agents have access to file system tools for existence checks

**Why implicit directory creation:**
- Maintains consistency with current approach
- Simplifies agent instructions (no mkdir steps)
- Relies on proven behavior (VS Code file creation tools)

**Why Feature Slug separate from Target Branch:**
- Target Branch: Transient git branch name (may change, has `/` separators)
- Feature Slug: Persistent identifier for artifact organization
- Allows meaningful directory names independent of branch naming conventions
- WorkflowContext.md stores both: slug for artifacts, branch for git operations

---

## Open Questions

None. All research objectives were addressed through analysis of chatmode files and existing codebase patterns.

---

## References

- **Spec.md**: `docs/agents/feature/move-to-paw-directory/Spec.md` - Feature requirements and acceptance criteria
- **SpecResearch.md**: `docs/agents/feature/move-to-paw-directory/SpecResearch.md` - Behavioral understanding of current system
- **GitHub Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/19
- **Chatmode Files**: `.github/chatmodes/PAW-*.chatmode.md` (all 9 agent instruction files)
- **WorkflowContext.md Examples**:
  - `docs/agents/feature/move-to-paw-directory/WorkflowContext.md`
  - `docs/agents/feature/param-doc/WorkflowContext.md`
  - `docs/agents/feature/finalize-initial-chatmodes/WorkflowContext.md`
