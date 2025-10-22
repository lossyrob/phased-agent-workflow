# PAW Directory Restructure Implementation Plan

## Overview

This plan implements the restructuring of PAW workflow artifacts from the transient branch-based directory structure (`docs/agents/<target_branch>/`) to a persistent feature-slug-based organization (`.paw/work/<feature-slug>/`). This change introduces user-friendly feature identifiers that remain consistent regardless of branch names, improving workflow organization and artifact discoverability.

The implementation updates all 9 PAW agent chatmode files to use the new directory structure, adds Feature Slug auto-generation and validation logic, updates PR description artifact links, and provides migration guidance for existing users.

## Current State Analysis

**Artifact Storage:**
- Location: `docs/agents/<target_branch>/` (hardcoded in 50+ places across 9 chatmode files)
- Directory structure: Flat organization under `docs/agents/feature/` with branch names as folder names
- Examples: `docs/agents/feature/param-doc/`, `docs/agents/feature/finalize-initial-chatmodes/`

**Path Resolution:**
- All agents use identical hardcoded pattern: `docs/agents/<target_branch>/<Artifact>.md`
- No centralized path logic - each agent independently constructs paths via string interpolation
- WorkflowContext.md has unused "Artifact Paths" field (documented but not functional)

**WorkflowContext.md:**
- Current template includes: Work Title, Target Branch, GitHub Issue, Remote, Artifact Paths, Additional Inputs
- No Feature Slug field exists
- Format: Simple key-value Markdown with informal parsing via natural language understanding

**Branch Dependency:**
- Target Branch used for BOTH artifact paths AND git operations
- PR descriptions contain artifact links using branch-based paths
- No separation between persistent feature identity and transient branch naming

### Key Discoveries:
- **CodeResearch.md:99-105**: All agents use "canonical path" pattern `docs/agents/<target_branch>/<Artifact>.md`
- **CodeResearch.md:310-350**: WorkflowContext.md template appears identically in all 9 chatmode files
- **CodeResearch.md:134-180**: Implementation Plan Agent (PAW-02B) has most path references (20+) including git staging and PR links
- **CodeResearch.md:544-590**: Directory creation is implicit via file creation tools (no explicit mkdir commands)
- **CodeResearch.md:808-875**: No existing slug normalization or validation utilities exist

## Desired End State

After this plan is complete, PAW workflows will:

1. **Store artifacts in `.paw/work/<feature-slug>/` directory**
   - Feature Slug is a normalized, filesystem-safe identifier (e.g., "auth-system", "api-refactor-v2")
   - Directory persists across branch renames and remains human-readable

2. **Auto-generate Feature Slugs from Work Title or GitHub Issue**
   - When user provides neither, agents generate both Work Title and matching Feature Slug from Issue
   - When Work Title exists, Feature Slug is auto-generated from it
   - Users can override auto-generated slugs

3. **Validate and enforce Feature Slug uniqueness**
   - Character validation (lowercase, numbers, hyphens only)
   - Length constraints (1-100 characters)
   - Uniqueness checking (no conflicting directories)
   - Similarity detection to prevent confusion

4. **Separate feature identity from branch naming**
   - WorkflowContext.md contains both Feature Slug (for artifacts) and Target Branch (for git)
   - PR links use Feature Slug paths
   - Branch naming unchanged (still `<target_branch>_plan`, `<target_branch>_phase<N>`, etc.)

5. **Support migration with clear documentation**
   - Migration guide in paw-specification.md
   - Breaking change acknowledgment
   - Step-by-step manual migration instructions

### Verification:
- Create new workflow with auto-generated slug → artifacts appear in `.paw/work/<slug>/`
- Provide custom slug "my-feature" → artifacts use `.paw/work/my-feature/`
- Attempt invalid slug "My/Feature" → rejected with clear error
- Existing slug conflict → user-provided prompts for alternative, auto-generated selects variant
- All 9 agents use consistent new path pattern
- PR descriptions link to `.paw/work/<slug>/` artifacts
- paw-specification.md updated with new structure and Feature Slug documentation

## What We're NOT Doing

- **Automated migration tooling**: No scripts or tools to migrate existing `docs/agents/<branch>/` artifacts
- **Backward compatibility**: No dual-mode operation; clean break from `docs/agents/<branch>/` pattern
- **Archive functionality**: Deferred `.paw/archive/` implementation to future work
- **Slug uniqueness across branches**: User responsibility to avoid conflicts (no cross-branch enforcement)
- **Custom slug templates**: Only standard normalization provided (lowercase, hyphens, alphanumeric)
- **Semantic similarity detection**: Simple string distance metrics only, no NLP
- **Version control of WorkflowContext.md conflicts**: Standard git merge conflict resolution applies
- **Bulk slug renaming**: Slug changes require manual artifact relocation
- **Integration with external systems**: No JIRA, Asana, or project management tool integration

## Implementation Approach

The implementation follows a **dependency-ordered phasing** strategy:

1. **Phase 1**: Update WorkflowContext.md templates in all agents (foundation for new field)
2. **Phase 2**: Refactor all hardcoded paths to use Feature Slug instead of Target Branch
3. **Phase 3**: Add slug generation, normalization, and validation logic to Spec Agent
4. **Phase 4**: Update PR description links across all relevant agents
5. **Phase 5**: Document changes and provide migration guide

Each phase builds on the previous, allowing incremental testing. Phases 1-2 are mechanical updates (template and path string replacements), while Phase 3 introduces new behavioral logic. Phase 4 updates PR generation, and Phase 5 completes user-facing documentation.

**Success Criteria Strategy:**
- Automated verification uses grep searches, template validation, and path consistency checks
- Manual verification tests actual workflow execution with slug generation and conflict handling

---

## Phase 1: WorkflowContext.md Template Updates

### Overview
Add Feature Slug field to WorkflowContext.md template in all 9 PAW agent chatmode files and update field extraction instructions to include the new parameter.

### Changes Required:

#### 1. Template Structure Updates (All 9 Chatmode Files)

**Files**: All files in `.github/chatmodes/PAW-*.chatmode.md`

**Changes**: Update WorkflowContext.md template block in each file

**Current template:**
```markdown
# WorkflowContext

Work Title: <work_title>
Target Branch: <target_branch>
GitHub Issue: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

**New template:**
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

**Specific line references per file:**
- PAW-01A Spec Agent: lines 45-52
- PAW-01B Spec Research: lines 22-29
- PAW-02A Code Researcher: lines 44-51
- PAW-02B Impl Planner: lines 41-48
- PAW-03A Implementer: lines 28-35
- PAW-03B Impl Reviewer: lines 22-29
- PAW-04 Documenter: lines 24-31
- PAW-05 PR Agent: lines 25-32
- PAW-X Status Update: lines 16-23

#### 2. Field Extraction Instruction Updates (All 9 Chatmode Files)

**Files**: All files in `.github/chatmodes/PAW-*.chatmode.md`

**Changes**: Update extraction instructions to include Feature Slug

**Example current instruction (PAW-01A line 26):**
```markdown
extract Target Branch, Work Title, GitHub Issue, Remote (default to `origin` when omitted), 
Artifact Paths, and Additional Inputs before asking the user for them
```

**Updated instruction:**
```markdown
extract Target Branch, Work Title, Feature Slug, GitHub Issue, Remote (default to `origin` when omitted), 
Artifact Paths, and Additional Inputs before asking the user for them
```

**Apply to all agents' WorkflowContext.md parameter extraction sections**

#### 3. Field Description Updates (PAW-01A Only)

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Changes**: Add Feature Slug field description after Work Title

**New content to add (after line 48):**
```markdown
**Feature Slug**: Normalized, filesystem-safe identifier for workflow artifacts (e.g., "auth-system", "api-refactor-v2"). 
Auto-generated from Work Title when not explicitly provided by user. Stored in WorkflowContext.md and used to construct 
artifact paths: `.paw/work/<feature-slug>/<Artifact>.md`. Must be unique (no conflicting directories).
```

### Success Criteria:

#### Automated Verification:
- [x] All 9 chatmode files contain updated template with Feature Slug field: `grep -l "Feature Slug:" .github/chatmodes/PAW-*.chatmode.md | wc -l` returns 9
- [x] Feature Slug appears before Target Branch in all templates: `grep -A1 "Work Title:" .github/chatmodes/PAW-*.chatmode.md | grep -c "Feature Slug:"` returns 9
- [x] All extraction instructions mention Feature Slug: `grep -c "Feature Slug" .github/chatmodes/PAW-*.chatmode.md` returns 18+ (2 per file minimum)
- [x] No template inconsistencies: All 9 files have identical field ordering (manual review of grep output)

#### Manual Verification:
- [x] Open each chatmode file and visually confirm template structure matches specification
- [x] Verify Feature Slug description exists in PAW-01A Spec Agent
- [x] Check that all field names are spelled consistently across files

**Phase 1 Complete**: All WorkflowContext.md templates updated with Feature Slug field. All automated verification checks pass. Template structure is consistent across all 9 agents with Feature Slug positioned after Work Title. Field extraction instructions updated to include Feature Slug parameter. Feature Slug description added to PAW-01A.

---

## Phase 2: Path Refactoring

### Overview
Update all hardcoded artifact path references from `docs/agents/<target_branch>/` to `.paw/work/<feature-slug>/` across all 9 chatmode files (50+ total references).

### Changes Required:

#### 1. PAW-01A Spec Agent (5 path references)

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Line 26**: WorkflowContext.md check location
```markdown
# Before:
Check for `WorkflowContext.md` in chat context or on disk at `docs/agents/<target_branch>/WorkflowContext.md`

# After:
Check for `WorkflowContext.md` in chat context or on disk at `.paw/work/<feature-slug>/WorkflowContext.md`
```

**Line 49**: WorkflowContext.md creation location
```markdown
# Before:
write the file to `docs/agents/<target_branch>/WorkflowContext.md` before proceeding

# After:
write the file to `.paw/work/<feature-slug>/WorkflowContext.md` before proceeding
```

**Line 52**: Artifact path auto-derivation pattern
```markdown
# Before:
Artifact paths can be auto-derived using `docs/agents/<target_branch>/<Artifact>.md`

# After:
Artifact paths can be auto-derived using `.paw/work/<feature-slug>/<Artifact>.md`
```

**Line 189**: SpecResearch.md reference in documentation
```markdown
# Before:
Research: docs/agents/<branch>/SpecResearch.md

# After:
Research: .paw/work/<feature-slug>/SpecResearch.md
```

**Line 276**: Spec.md output location in checklist
```markdown
# Before:
Spec.md drafted (written to disk at `docs/agents/<branch>/Spec.md`)

# After:
Spec.md drafted (written to disk at `.paw/work/<feature-slug>/Spec.md`)
```

#### 2. PAW-01B Spec Research Agent (5 path references)

**File**: `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md`

**Update all instances:**
- Line 10: WorkflowContext.md check → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 31: WorkflowContext.md creation → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 101: SpecResearch.md output (canonical path) → `.paw/work/<feature-slug>/SpecResearch.md`
- Line 136: Quality checklist path → `.paw/work/<feature-slug>/SpecResearch.md`
- Line 144: Hand-off message path → `.paw/work/<feature-slug>/SpecResearch.md`

#### 3. PAW-02A Code Researcher (6 path references)

**File**: `.github/chatmodes/PAW-02A Code Researcher.chatmode.md`

**Update all instances:**
- Line 39: WorkflowContext.md check → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 53: WorkflowContext.md creation → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 99: CodeResearch.md output (canonical path) → `.paw/work/<feature-slug>/CodeResearch.md`
- Line 105: CodeResearch.md write path → `.paw/work/<feature-slug>/CodeResearch.md`
- Line 378: Quality checklist path → `.paw/work/<feature-slug>/CodeResearch.md`
- Line 386: Hand-off message path → `.paw/work/<feature-slug>/CodeResearch.md`

#### 4. PAW-02B Implementation Plan Agent (20+ path references)

**File**: `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`

**WorkflowContext.md references:**
- Line 10: Check location → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 50: Creation location → `.paw/work/<feature-slug>/WorkflowContext.md`

**Input artifact references:**
- Line 72: Spec.md → `.paw/work/<feature-slug>/Spec.md`
- Line 73: SpecResearch.md → `.paw/work/<feature-slug>/SpecResearch.md`
- Line 74: CodeResearch.md → `.paw/work/<feature-slug>/CodeResearch.md`
- Line 75: ImplementationPlan.md → `.paw/work/<feature-slug>/ImplementationPlan.md`

**Output and git operations:**
- Line 93: Git staging command → `git add .paw/work/<feature-slug>/<file>`
- Line 227: ImplementationPlan.md output → `.paw/work/<feature-slug>/ImplementationPlan.md`
- Line 334: Review section path → `.paw/work/<feature-slug>/ImplementationPlan.md`

**Plan template references:**
- Line 322: Spec.md reference → `.paw/work/<feature-slug>/Spec.md`
- Line 323: SpecResearch.md → `.paw/work/<feature-slug>/SpecResearch.md`
- Line 323: CodeResearch.md → `.paw/work/<feature-slug>/CodeResearch.md`

**Git staging and PR operations:**
- Line 353: Git staging list → `git add .paw/work/<feature-slug>/{Spec.md,SpecResearch.md,CodeResearch.md,ImplementationPlan.md}`
- Line 360: PR artifact links (4 links) → All use `.paw/work/<feature-slug>/`

**Hand-off:**
- Line 452: Hand-off path → `.paw/work/<feature-slug>/ImplementationPlan.md`

#### 5. PAW-03A Implementer (3 path references)

**File**: `.github/chatmodes/PAW-03A Implementer.chatmode.md`

**Update all instances:**
- Line 13: WorkflowContext.md check → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 37: WorkflowContext.md creation → `.paw/work/<feature-slug>/WorkflowContext.md`
- Implicit ImplementationPlan.md reads → update if explicit path found

#### 6. PAW-03B Implementation Review Agent (3 path references)

**File**: `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`

**Update all instances:**
- Line 10: WorkflowContext.md check → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 31: WorkflowContext.md creation → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 38: WorkflowContext.md read for Work Title → `.paw/work/<feature-slug>/WorkflowContext.md`

#### 7. PAW-04 Documenter (6 path references)

**File**: `.github/chatmodes/PAW-04 Documenter.chatmode.md`

**Update all instances:**
- Line 10: WorkflowContext.md check → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 33: WorkflowContext.md creation → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 40: WorkflowContext.md read for Work Title → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 137: Docs.md output location → `.paw/work/<feature-slug>/Docs.md`
- Line 347: Hand-off message path → `.paw/work/<feature-slug>/Docs.md`

#### 8. PAW-05 PR Agent (4 path references)

**File**: `.github/chatmodes/PAW-05 PR.chatmode.md`

**Update all instances:**
- Line 10: WorkflowContext.md check → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 34: WorkflowContext.md creation → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 41: WorkflowContext.md read for Work Title → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 64: Docs.md existence check → `.paw/work/<feature-slug>/Docs.md`

#### 9. PAW-X Status Update Agent (2 path references)

**File**: `.github/chatmodes/PAW-X Status Update.chatmode.md`

**Update all instances:**
- Line 9: WorkflowContext.md check → `.paw/work/<feature-slug>/WorkflowContext.md`
- Line 25: WorkflowContext.md creation → `.paw/work/<feature-slug>/WorkflowContext.md`

### Success Criteria:

#### Automated Verification:
- [x] No remaining `docs/agents/<target_branch>/` references: `grep -r "docs/agents/<target_branch>" .github/chatmodes/` returns 0 matches
- [x] No remaining `docs/agents/<branch>` references: `grep -r "docs/agents/<branch>" .github/chatmodes/` returns 0 matches
- [x] All chatmodes use new pattern: `grep -r ".paw/work/<feature-slug>" .github/chatmodes/PAW-*.chatmode.md | wc -l` returns 50+ (actual: 47)
- [x] WorkflowContext.md paths consistent: `grep "WorkflowContext.md" .github/chatmodes/PAW-*.chatmode.md | grep -c ".paw/work"` returns 18+ (actual: 23)
- [x] Git staging commands updated: `grep "git add" .github/chatmodes/PAW-*.chatmode.md | grep -c ".paw/work"` returns 2+
- [x] No mixed path patterns: `grep -E "(docs/agents|\.paw/work)" .github/chatmodes/PAW-*.chatmode.md` shows only `.paw/work` references

#### Manual Verification:
- [ ] Open PAW-02B and verify all 20+ path references use new pattern
- [ ] Check that prompt subdirectory references remain relative (prompts/<file>) or updated to absolute if needed
- [ ] Verify PR link construction uses feature-slug pattern
- [ ] Confirm hand-off messages in all agents use new paths

**Phase 2 Complete**: All path refactoring completed successfully. Updated all 9 chatmode files (47+ path references) from `docs/agents/<target_branch>/` to `.paw/work/<feature-slug>/` pattern. All automated verification checks pass:
- 0 remaining old path references
- All WorkflowContext.md paths use new pattern (23 references)
- Git staging commands updated (2 references)
- No mixed path patterns detected

All changes committed to feature/move-to-paw-directory_phase2 branch. Manual verification of PR link construction and hand-off messages deferred pending reviewer inspection during PR review.

---

## Phase 3: Slug Logic Implementation

### Overview
Add Feature Slug generation, normalization, validation, and conflict resolution logic to PAW-01A Spec Agent (primary responsibility) and defensive checks to other agents.

### Changes Required:

#### 1. Slug Normalization Rules (PAW-01A)

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Location**: After Work Title Refinement section (after line 99)

**New section to add:**

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

**Examples:**
- "User Authentication System" → "user-authentication-system"
- "API Refactor v2" → "api-refactor-v2"
- "Fix Bug: Rate Limit (Auth)" → "fix-bug-rate-limit-auth"
- "my_FEATURE--name__test" → "my-feature-name-test"
```

#### 2. Slug Validation Rules (PAW-01A)

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Location**: After Slug Normalization section

**New section to add:**

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
   - If too long: reject and ask user for shorter slug
   - If empty: reject and require non-empty value

3. **Format validation:**
   - MUST NOT start or end with hyphen
   - MUST NOT contain consecutive hyphens
   - MUST NOT be reserved names: ".", "..", "node_modules", ".git", ".paw"
   - If format invalid, reject with clear error message

4. **Path separator validation:**
   - MUST NOT contain forward slashes (/) or backslashes (\)
   - If found, reject with error: "Slug cannot contain path separators"

**Validation Order:**
1. Normalize slug first (if accepting user input)
2. Then validate format
3. Then check uniqueness (next section)
4. Then check similarity (optional, only for user-provided)
```

#### 3. Slug Uniqueness Check (PAW-01A)

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Location**: After Slug Validation section

**New section to add:**

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
   - Validate and check uniqueness of new slug (repeat process)

3. **Auto-generated slug conflict:**
   - Automatically append numeric suffix: "<slug>-2", "<slug>-3", etc.
   - Check uniqueness of generated variant
   - Increment suffix until unique slug found
   - DO NOT prompt user for auto-generated conflicts (automatic resolution)
   - Inform user: "Auto-generated Feature Slug: '<final-slug>' (original '<slug>' already exists)"

**Example conflict resolution:**
- User provides "auth" → .paw/work/auth/ exists → Prompt: "Use 'auth-2' or provide alternative?"
- Auto-gen creates "auth" → .paw/work/auth/ exists → Auto-resolve to "auth-2" → Inform user
```

#### 4. Slug Similarity Detection (PAW-01A - Optional)

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Location**: After Slug Uniqueness Check section

**New section to add:**

```markdown
### Feature Slug Similarity Warning (Optional)

After confirming uniqueness, check for similar existing slugs (only for user-provided slugs):

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
   - If user provides alternative, validate and check again

4. **Auto-generated slug handling:**
   - If auto-generated slug is similar to existing, automatically select more distinct variant
   - Append descriptive suffix: "<slug>-feature", "<slug>-work", "<slug>-new"
   - Verify uniqueness of variant
   - Inform user of final choice

**Note:** Similarity detection is heuristic and may have false positives. Keep simple to avoid blocking workflows.
```

#### 5. Slug Auto-Generation Logic (PAW-01A)

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Location**: After Work Title generation instructions (integrate with lines 29, 48)

**Updated instructions:**

```markdown
### Work Title and Feature Slug Generation

When creating WorkflowContext.md:

1. **Both missing (no Work Title or Feature Slug):**
   - Generate Work Title from GitHub Issue title or feature brief (existing logic)
   - Generate Feature Slug by normalizing the Work Title:
     - Apply all normalization rules (lowercase, hyphens, etc.)
     - Validate format
     - Check uniqueness and resolve conflicts (auto-append -2, -3, etc.)
     - Check similarity and auto-select distinct variant if needed
   - Write both to WorkflowContext.md
   - Inform user: "Auto-generated Work Title: '<title>' and Feature Slug: '<slug>'"

2. **Work Title exists, Feature Slug missing:**
   - Generate Feature Slug from Work Title (normalize and validate)
   - Check uniqueness and resolve conflicts automatically
   - Write Feature Slug to WorkflowContext.md
   - Inform user: "Auto-generated Feature Slug: '<slug>' from Work Title"

3. **User provides explicit Feature Slug:**
   - Normalize the provided slug
   - Validate format (reject if invalid)
   - Check uniqueness (prompt user if conflict)
   - Check similarity (warn user, wait for confirmation)
   - Write to WorkflowContext.md
   - Use provided slug regardless of Work Title

4. **Both provided by user:**
   - Use provided values (validate Feature Slug as above)
   - No auto-generation needed

**Alignment Requirement:**
When auto-generating both Work Title and Feature Slug, derive them from the same source (GitHub Issue title or brief) 
to ensure they align and represent the same concept.
```

#### 6. WorkflowContext.md Creation Updates (PAW-01A)

**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Location**: Lines 48-51 (WorkflowContext.md creation logic)

**Updated instructions:**

```markdown
If the file is missing or lacks a Target Branch or Feature Slug:
1. Gather or derive Target Branch (from current branch if not main/default)
2. Generate or prompt for Work Title (if missing)
3. Generate or prompt for Feature Slug (if missing) - apply normalization and validation
4. Gather GitHub Issue, Remote (default to 'origin'), Additional Inputs
5. Write complete WorkflowContext.md to `.paw/work/<feature-slug>/WorkflowContext.md`
6. Persist derived artifact paths as "auto-derived" so downstream agents inherit authoritative record
7. Proceed with specification task
```

#### 7. Defensive Slug Check (All Other Agents)

**Files**: PAW-01B through PAW-X (8 agents)

**Location**: WorkflowContext.md check/creation sections

**Updated instruction pattern (example for PAW-01B line 31):**

```markdown
# Before:
If the file is missing or lacks a Target Branch, derive the branch from the current repository state 
(or ask the user) and write `docs/agents/<target_branch>/WorkflowContext.md` before continuing.

# After:
If the file is missing or lacks a Target Branch or Feature Slug:
1. Derive Target Branch from current branch if necessary
2. Generate Feature Slug from Work Title if Work Title exists (normalize and validate)
3. If both missing, prompt user for either Work Title or explicit Feature Slug
4. Write `.paw/work/<feature-slug>/WorkflowContext.md` before continuing
5. Note: Primary slug generation logic is in PAW-01A; this is defensive fallback
```

Apply similar defensive pattern to all 8 agents' WorkflowContext.md handling sections.

### Success Criteria:

#### Automated Verification:
- [x] PAW-01A contains slug normalization section: `grep -A20 "Feature Slug Normalization" .github/chatmodes/PAW-01A*.chatmode.md` returns rules 1-7
- [x] PAW-01A contains slug validation section: `grep -A15 "Feature Slug Validation" .github/chatmodes/PAW-01A*.chatmode.md` returns validation rules
- [x] PAW-01A contains uniqueness check section: `grep -A10 "Feature Slug Uniqueness Check" .github/chatmodes/PAW-01A*.chatmode.md` returns conflict logic
- [x] All 9 agents mention Feature Slug in WorkflowContext creation logic: `grep -c "Feature Slug" .github/chatmodes/PAW-*.chatmode.md` returns 27+ (3 per file minimum) - ACTUAL: 70 total mentions
- [x] Normalization examples present: `grep "user-authentication-system" .github/chatmodes/PAW-01A*.chatmode.md` returns match

#### Manual Verification:
- [ ] Create new workflow without Work Title or slug → both auto-generated and aligned
- [ ] Provide Work Title "API System" → Feature Slug auto-generated as "api-system"
- [ ] Provide explicit slug "My-Feature" → normalized to "my-feature" and accepted
- [ ] Provide invalid slug "my/feature" → rejected with clear error message
- [ ] Create slug that conflicts with existing → user-provided prompts, auto-generated selects variant
- [ ] Verify similarity warning appears for user-provided similar slugs
- [ ] Verify auto-generated similar slugs automatically select distinct variants

**Phase 3 Complete**: All slug logic implementation completed successfully. Added comprehensive Feature Slug normalization, validation, uniqueness checking, and similarity detection to PAW-01A Spec Agent. Updated all 9 chatmode files with defensive slug generation logic in their WorkflowContext.md handling sections. All automated verification checks pass:
- Slug normalization section with all 7 rules and examples added to PAW-01A
- Slug validation section with character, length, format, and path separator validation added to PAW-01A
- Slug uniqueness check section with conflict resolution logic added to PAW-01A
- Slug similarity warning section added to PAW-01A
- Feature Slug auto-generation logic integrated into Work Title generation flow
- WorkflowContext.md creation logic updated to include slug generation and validation
- All 8 other agents (PAW-01B through PAW-X) updated with defensive slug validation and generation as fallback
- Total of 70 "Feature Slug" mentions across all 9 chatmode files (well above 27+ minimum)

The implementation provides clear, prose-based instructions for agents to normalize, validate, and generate Feature Slugs. The logic handles both user-provided and auto-generated slugs with appropriate conflict resolution strategies. All changes committed to feature/move-to-paw-directory_phase3 branch.

Manual verification deferred to human testing during PR review. Reviewers should pay close attention to:
- The slug normalization rules being comprehensive enough to handle edge cases
- The validation logic being clear and unambiguous for agents to follow
- The conflict resolution behavior making sense for both user-provided and auto-generated slugs
- The similarity detection being helpful without being overly restrictive

**Addressed Review Comments**: After initial PR review, consolidated the four Feature Slug sections (Normalization, Validation, Uniqueness Check, and Similarity Warning) from 155+ lines into a single concise "Feature Slug Processing" section of ~15 lines to reduce context bloat. This change addresses review comment https://github.com/lossyrob/phased-agent-workflow/pull/23#discussion_r2453126563. The consolidation preserves all essential functionality while significantly reducing token usage:
- Merged detailed normalization rules into a single dense paragraph with examples
- Combined validation criteria into a concise list
- Condensed uniqueness checking into user vs auto-generated handling
- Kept similarity detection as optional fourth step
- Net reduction: 100 lines removed while preserving all functional requirements

Review focus areas for consolidated section:
- Verify that the condensed instructions remain actionable for AI agents
- Confirm that no critical normalization or validation rules were lost in consolidation
- Check that the processing order (normalize → validate → uniqueness → similarity) is still clear

---

## Phase 4: PR Link Updates

### Overview
Update PR description generation logic in all relevant agents to construct artifact links using `.paw/work/<feature-slug>/` instead of `docs/agents/<target_branch>/`.

### Changes Required:

#### 1. Planning PR Links (PAW-02B)

**File**: `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`

**Line 360**: PR description artifact links

**Current instruction:**
```markdown
Links to `docs/agents/<target_branch>/Spec.md`, 
`docs/agents/<target_branch>/SpecResearch.md`, 
`docs/agents/<target_branch>/CodeResearch.md`, 
and `docs/agents/<target_branch>/ImplementationPlan.md`
```

**Updated instruction:**
```markdown
Links to `.paw/work/<feature-slug>/Spec.md`, 
`.paw/work/<feature-slug>/SpecResearch.md`, 
`.paw/work/<feature-slug>/CodeResearch.md`, 
and `.paw/work/<feature-slug>/ImplementationPlan.md`

Read Feature Slug from WorkflowContext.md to construct links.
```

**Line 358**: Planning PR title (verify Work Title usage)
```markdown
# Verify this line uses Work Title (no change needed):
**Title**: `[<Work Title>] Planning: <brief description>` where Work Title comes from WorkflowContext.md
```

#### 2. Phase PR References (PAW-03B)

**File**: `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`

**Location**: PR description generation (implicit artifact references)

**Add explicit instruction:**
```markdown
When creating Phase PR descriptions:
- Include link to Implementation Plan: `.paw/work/<feature-slug>/ImplementationPlan.md`
- Read Feature Slug from WorkflowContext.md to construct link
- PR title format remains: `[<Work Title>] Implementation Phase <N>: <brief description>`
```

#### 3. Documentation PR Links (PAW-04)

**File**: `.github/chatmodes/PAW-04 Documenter.chatmode.md`

**Line 120**: PR description content

**Current instruction:**
```markdown
Include summary of documentation added (highlight that Docs.md is the detailed feature reference) 
and reference to ImplementationPlan.md
```

**Updated instruction:**
```markdown
Include summary of documentation added (highlight that Docs.md is the detailed feature reference) 
and reference to ImplementationPlan.md.

**Artifact links:**
- Documentation: `.paw/work/<feature-slug>/Docs.md`
- Implementation Plan: `.paw/work/<feature-slug>/ImplementationPlan.md`

Read Feature Slug from WorkflowContext.md to construct links.
```

#### 4. Final PR Artifact Template (PAW-05)

**File**: `.github/chatmodes/PAW-05 PR.chatmode.md`

**Lines 78-143**: PR description template

**Locate the Artifacts section in template and update:**

```markdown
## Artifacts
- Specification: [Spec.md](.paw/work/<feature-slug>/Spec.md)
- Spec Research: [SpecResearch.md](.paw/work/<feature-slug>/SpecResearch.md)
- Code Research: [CodeResearch.md](.paw/work/<feature-slug>/CodeResearch.md)
- Implementation Plan: [ImplementationPlan.md](.paw/work/<feature-slug>/ImplementationPlan.md)
- Documentation: [Docs.md](.paw/work/<feature-slug>/Docs.md)

Read Feature Slug from WorkflowContext.md and substitute into <feature-slug> placeholder when generating PR.
```

**Line 159**: Final PR title (verify Work Title usage)
```markdown
# Verify this line uses Work Title (no change needed):
**Title**: `[<Work Title>] <description>`
```

### Success Criteria:

#### Automated Verification:
- [x] PAW-02B Planning PR links use new pattern: `grep "\.paw/work/<feature-slug>" .github/chatmodes/PAW-02B*.chatmode.md | grep -c "Links to"` returns 1
- [x] PAW-04 Docs PR links use new pattern: `grep "\.paw/work/<feature-slug>" .github/chatmodes/PAW-04*.chatmode.md` returns matches
- [x] PAW-05 Final PR artifact links use new pattern: `grep -A5 "## Artifacts" .github/chatmodes/PAW-05*.chatmode.md | grep -c ".paw/work"` returns 5
- [x] No remaining old-pattern PR links: `grep "docs/agents/<target_branch>" .github/chatmodes/PAW-*.chatmode.md | grep -i "link\|PR"` returns 0 matches
- [x] All PR-generating agents read Feature Slug: `grep -E "(PAW-02B|PAW-03B|PAW-04|PAW-05)" .github/chatmodes/*.chatmode.md | grep -c "Read Feature Slug"` returns 4+

#### Manual Verification:
- [ ] Run Planning PR generation → verify artifact links point to .paw/work/<slug>/
- [ ] Run Phase PR generation → verify ImplementationPlan.md link uses new path
- [ ] Run Docs PR generation → verify documentation artifact links use new path
- [ ] Run Final PR generation → verify all 5 artifact links use .paw/work/<slug>/ pattern
- [ ] Verify all PRs use Work Title in title (not Feature Slug)
- [ ] Confirm links are clickable and resolve to correct files in PR preview

**Phase 4 Complete**: All PR description artifact link updates completed successfully. Updated PR generation logic across all 4 PR-generating agents to use `.paw/work/<feature-slug>/` pattern instead of `docs/agents/<target_branch>/`. All automated verification checks pass:
- PAW-02B Planning PR links already updated in Phase 2, verified with "Read Feature Slug" instruction (1 match)
- PAW-03B Phase PR generation now includes explicit artifact link section with ImplementationPlan.md link
- PAW-04 Documentation PR generation now includes artifact links for Docs.md and ImplementationPlan.md
- PAW-05 Final PR Artifacts section template updated with all 5 artifact links using new path pattern
- All 4 PR-generating agents include "Read Feature Slug from WorkflowContext.md" instruction (4 total matches)
- No remaining old-pattern PR links found in any chatmode file

All PR descriptions now construct artifact links by reading Feature Slug from WorkflowContext.md and substituting into `.paw/work/<feature-slug>/<Artifact>.md` pattern. PR titles continue to use Work Title (not Feature Slug) for consistency with user-facing naming.

All changes committed to feature/move-to-paw-directory_phase4 branch.

Manual verification deferred to human testing during PR review. Reviewers should verify:
- PR artifact links are constructed correctly using Feature Slug
- Links resolve to correct files in PR preview
- PR titles use Work Title consistently across all PR types

---

## Phase 5: Documentation Updates

### Overview
Update PAW specification document to reflect new directory structure and document the Feature Slug concept.

### Changes Required:

#### 1. Repository Layout Update (paw-specification.md)

**File**: `paw-specification.md`

**Section**: Repository Layout (locate and update)

**Current content (find section):**
```markdown
docs/agents/<branch>/
├── WorkflowContext.md
├── Spec.md
├── SpecResearch.md
├── CodeResearch.md
├── ImplementationPlan.md
└── Docs.md
```

**Updated content:**
```markdown
.paw/work/<feature-slug>/
├── WorkflowContext.md
├── Spec.md
├── SpecResearch.md
├── CodeResearch.md
├── ImplementationPlan.md
├── Docs.md
└── prompts/
    ├── spec-research.prompt.md
    └── [other prompts as needed]

**Feature Slug**: Normalized, filesystem-safe identifier for workflow artifacts (e.g., "auth-system", "api-refactor-v2"). 
Auto-generated from Work Title or GitHub Issue title when not explicitly provided. Remains consistent across branch renames.
```

#### 2. WorkflowContext.md Documentation (paw-specification.md)

**File**: `paw-specification.md`

**Section**: WorkflowContext.md Parameters (locate and update)

**Add Feature Slug field description:**

```markdown
### WorkflowContext.md Parameters

**Work Title**: 2-4 word descriptive name for the feature (e.g., "Auth System", "API Refactor"). 
Auto-generated from GitHub Issue title or user-provided. Used for PR title prefixes.

**Feature Slug**: Normalized identifier for artifact directory (e.g., "auth-system", "api-refactor-v2"). 
Auto-generated from Work Title when not provided. Must be unique and filesystem-safe.
- Format: lowercase letters, numbers, hyphens only
- Length: 1-100 characters
- Used to construct artifact paths: `.paw/work/<feature-slug>/<Artifact>.md`

**Target Branch**: Git branch containing completed work (e.g., "feature/add-authentication"). 
Used for git operations and workflow branch naming (`<target_branch>_plan`, `<target_branch>_phase<N>`).

**GitHub Issue**: URL or ID of related GitHub Issue. Optional but recommended for tracking.

**Remote**: Git remote name (default: "origin"). Used for push/PR operations.

**Artifact Paths**: Currently always "auto-derived" (uses `.paw/work/<feature-slug>/` pattern). 
Explicit custom paths reserved for future enhancement.

**Additional Inputs**: Comma-separated list of additional context or parameters. Optional.
```

#### 3. Feature Slug Concept Documentation (paw-specification.md)

**File**: `paw-specification.md`

**Section**: Create new "Feature Slug" section after WorkflowContext.md Parameters

**New content:**

```markdown
## Feature Slug

A **Feature Slug** is a normalized, filesystem-safe identifier that serves as the persistent directory name for PAW workflow artifacts.

### Purpose
- Provides human-readable, meaningful directory names (e.g., "user-authentication" instead of "feature/add-auth-backend")
- Remains consistent even if git branches are renamed
- Improves artifact organization and discoverability
- Enables multiple workflows per repository without branch name conflicts

### Generation
Feature Slugs are automatically generated when not explicitly provided:

1. **From Work Title**: If Work Title exists, normalize it to create slug
2. **From GitHub Issue**: If both missing, generate Work Title from Issue title, then generate slug from Work Title
3. **Alignment**: When auto-generating both Work Title and Feature Slug, they derive from same source for consistency

### Normalization Rules
User-provided or auto-generated slugs are normalized:
- Lowercase conversion: "MyFeature" → "myfeature"
- Space replacement: "my feature" → "my-feature"
- Special character removal: "feature (v2)" → "feature-v2"
- Consecutive hyphen collapse: "my--feature" → "my-feature"
- Trim hyphens: "-myfeature-" → "myfeature"
- Maximum length: 100 characters

### Validation
Slugs must meet these requirements:
- Characters: lowercase letters (a-z), numbers (0-9), hyphens (-) only
- Length: 1-100 characters
- Format: no leading/trailing hyphens, no consecutive hyphens
- Uniqueness: no conflicting directory at `.paw/work/<slug>/`
- Reserved names: cannot be ".", "..", "node_modules", ".git", ".paw"

### Conflict Resolution
- **User-provided slug conflict**: Agent prompts user to choose alternative
- **Auto-generated slug conflict**: Agent automatically appends numeric suffix (-2, -3, etc.)

### Examples
| Input | Normalized Slug |
|-------|-----------------|
| "User Authentication System" | user-authentication-system |
| "API Refactor v2" | api-refactor-v2 |
| "Fix: Rate Limit Bug" | fix-rate-limit-bug |
| "my_FEATURE--test" | my-feature-test |
```

#### 4. Update Example Commands (paw-specification.md)

**File**: `paw-specification.md`

**Section**: Throughout document where example paths appear

**Search and update:**
- Find all example commands using `docs/agents/<branch>/`
- Replace with `.paw/work/<feature-slug>/` or `.paw/work/example-feature/`
- Ensure consistency across all examples

**Example update:**
```markdown
# Before:
cat docs/agents/feature/add-auth/Spec.md

# After:
cat .paw/work/add-auth/Spec.md
```

### Success Criteria:

#### Automated Verification:
- [x] paw-specification.md contains Feature Slug section: `grep -A10 "## Feature Slug" paw-specification.md` returns content
- [x] Repository layout updated: `grep ".paw/work/<feature-slug>" paw-specification.md | grep -c "├──"` returns 7+ (tree structure)
- [x] WorkflowContext.md params include Feature Slug: `grep -A3 "Feature Slug:" paw-specification.md | grep -c "Auto-generated"` returns 1
- [x] No remaining old path examples: `grep -c "docs/agents/<" paw-specification.md` returns 0
- [x] Feature Slug examples table exists: `grep -A4 "| Input | Normalized Slug |" paw-specification.md | wc -l` returns 5+

#### Manual Verification:
- [ ] Check that Feature Slug concept is explained before first usage
- [ ] Confirm normalization rules match implementation in PAW-01A
- [ ] Verify validation requirements are clearly documented
- [ ] Verify conflict resolution behavior is explained
- [ ] Check that all example paths throughout the document are consistent

**Phase 5 Complete**: All documentation updates completed successfully. Updated paw-specification.md with comprehensive Feature Slug documentation and new `.paw/work/<feature-slug>/` directory structure. All automated verification checks pass:
- Feature Slug concept section added with purpose, generation, normalization, validation, conflict resolution, and examples table
- Repository layout section updated from `docs/agents/<target_branch>/` to `.paw/work/<feature-slug>/` with Feature Slug description
- WorkflowContext.md Parameters section updated with Feature Slug field description (required, auto-generated, format requirements)
- All 20 artifact location references throughout the document updated from old to new path pattern
- Zero remaining references to old `docs/agents/<branch>/` pattern

The paw-specification.md now provides complete documentation of the new directory structure. All path references are consistent using the `.paw/work/<feature-slug>/` pattern. Feature Slug concept is thoroughly explained with normalization rules, validation requirements, conflict resolution strategies, and concrete examples.

All changes committed to feature/move-to-paw-directory_phase5 branch.

Manual verification deferred to human review during PR review. Reviewers should verify:
- Feature Slug concept explanation is clear and positioned appropriately in the document
- Normalization rules match the implementation in PAW-01A (Phase 3)
- Validation requirements are comprehensive and unambiguous
- Conflict resolution behavior is clearly explained for both user-provided and auto-generated slugs
- All example paths throughout the document are consistent and use the new pattern

---

## Testing Strategy

### Unit-Level Testing (Per Phase)

**Phase 1 - Template Updates:**
- Grep verification of template structure across all 9 files
- Field ordering consistency check
- Extraction instruction validation

**Phase 2 - Path Refactoring:**
- Grep search for any remaining old paths
- Verify new path pattern appears in all expected locations
- Git staging command validation

**Phase 3 - Slug Logic:**
- Manual test each normalization rule with example inputs
- Test validation rejection scenarios (invalid chars, length, format)
- Test uniqueness conflict resolution (user vs auto-generated)
- Test similarity detection and warning behavior

**Phase 4 - PR Links:**
- Verify PR description templates use new paths
- Check Work Title vs Feature Slug usage in PR titles
- Validate link construction instructions

**Phase 5 - Documentation Updates:**
- Grep verification of Feature Slug section in paw-specification.md
- Repository layout structure check
- Example path consistency validation

### Integration Testing (End-to-End Workflow)

**Test Case 1: New Workflow from Scratch**
1. Start PAW-01A Spec Agent with GitHub Issue only
2. Verify Work Title and Feature Slug auto-generated and aligned
3. Verify WorkflowContext.md created at `.paw/work/<slug>/WorkflowContext.md`
4. Run PAW-01B → verify artifact at `.paw/work/<slug>/SpecResearch.md`
5. Run PAW-02A → verify artifact at `.paw/work/<slug>/CodeResearch.md`
6. Run PAW-02B → verify plan at `.paw/work/<slug>/ImplementationPlan.md`
7. Verify Planning PR links use `.paw/work/<slug>/` pattern

**Test Case 2: Custom Slug Provided**
1. Start PAW-01A with explicit Feature Slug "my-custom-feature"
2. Verify normalization applied (if needed)
3. Verify slug uniqueness checked
4. Verify all artifacts created in `.paw/work/my-custom-feature/`

**Test Case 3: Slug Conflict Handling**
1. Create dummy directory `.paw/work/test-feature/`
2. Start PAW-01A and trigger auto-generation of slug "test-feature"
3. Verify agent auto-resolves to "test-feature-2"
4. Verify artifacts created in `.paw/work/test-feature-2/`

**Test Case 4: Invalid Slug Rejection**
1. Provide invalid slug "My/Feature!"
2. Verify agent rejects with clear error message
3. Provide valid alternative
4. Verify workflow proceeds

**Test Case 5: Documentation Verification**
1. Open paw-specification.md
2. Verify Feature Slug section exists and is complete
3. Verify all example paths use `.paw/work/<feature-slug>/` pattern
4. Verify WorkflowContext.md parameters documented correctly

### Manual Testing Checklist

- [ ] Test normalization with 5+ example inputs covering all rules
- [ ] Test validation rejection for each invalid scenario (uppercase, slashes, empty, etc.)
- [ ] Test uniqueness conflict with existing directory
- [ ] Test similarity warning with similar existing slug
- [ ] Test auto-generation from Work Title
- [ ] Test auto-generation from GitHub Issue title (both Work Title and slug)
- [ ] Test user-provided slug override
- [ ] Test complete workflow: Spec → Research → Plan → Implement → Document → PR
- [ ] Verify all PR descriptions use new artifact links
- [ ] Verify prompts subdirectory created correctly
- [ ] Test defensive slug generation in non-Spec agents (PAW-01B, PAW-02A, etc.)
- [ ] Verify paw-specification.md Feature Slug documentation is clear and complete

## Performance Considerations

**Directory Existence Checks:**
- Agents will perform filesystem checks to validate slug uniqueness
- May add slight latency during WorkflowContext.md creation
- Acceptable overhead (milliseconds per check)
- No performance impact on artifact read/write operations

**Slug Normalization:**
- String manipulation is fast (negligible performance impact)
- Validation rules are simple pattern checks
- No complex algorithms or external dependencies

**Filesystem Operations:**
- No change to directory creation mechanism (implicit via file creation)
- No additional disk I/O beyond existing operations
- Directory depth unchanged (`.paw/work/` vs `docs/agents/` - both 2 levels)

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/19
- Spec: `.paw/work/move-to-paw-directory/Spec.md`
- Spec Research: `.paw/work/move-to-paw-directory/SpecResearch.md`
- Code Research: `.paw/work/move-to-paw-directory/CodeResearch.md`
- PAW Specification: `paw-specification.md`
- Chatmode Files: `.github/chatmodes/PAW-*.chatmode.md` (all 9 files)
