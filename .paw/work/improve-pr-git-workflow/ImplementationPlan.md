# Improve PR and Git Workflow Practices Implementation Plan

## Overview

This implementation enhances PR creation, git workflow automation, and commit message practices across PAW agents to provide better traceability, clarity, and developer experience. The work establishes bidirectional links between issues and all PAW-generated PRs, differentiates partial vs final PRs through clear titles and descriptions, enriches commit messages with work context, automates git housekeeping between phases, and prevents use of direct-push MCP tools that bypass version control.

## Current State Analysis

PAW currently creates four types of PRs (Planning, Phase, Docs, Final) through natural language instructions distributed across agent files. Only the Final PR Agent attempts issue linking using generic "Closes issue at <URL>" format without GitHub auto-close keywords. Planning, Phase, and Docs PRs have no issue linking mechanism, making workflow progress invisible from the originating issue timeline.

**Key Discoveries:**
- **PR Creation**: Distributed across four agent files (PAW-02B, PAW-03B, PAW-04, PAW-05) with no centralized function. Agents describe PR creation naturally to GitHub Copilot which routes to GitHub MCP tools
- **Commit Messages**: Three agents create commits (PAW-03A Implementer, PAW-03B Reviewer, PAW-02B Planner) with generic "detailed commit message" guidance. No structured format exists; messages lack work title, phase number, or PAW context indicators
- **Git Workflow**: Uses direct CLI commands throughout with no abstraction layer. Implementer performs basic branch verification but no automated sync operations between phases. After merging phase PRs, users manually checkout target branch and pull changes
- **GitHub MCP Tools**: No guardrails exist preventing agents from using `mcp_github_push_files` or `mcp_github_create_or_update_file` which bypass proper git workflow
- **Target Branch Push**: Workflow initialization commits WorkflowContext.md but does NOT push target branch to remote, causing Planning PR creation to fail when PR target doesn't exist on remote
- **Phase Detection**: Agents check ImplementationPlan.md "Completed" status but have no automated detection of merged phase branches or git state transitions

**References:**
- Current PR title formats: `agents/PAW-02B Impl Planner.agent.md:324`, `agents/PAW-03B Impl Reviewer.agent.md:136`, `agents/PAW-04 Documenter.agent.md:140`, `agents/PAW-05 PR.agent.md:201`
- Commit message guidance: `agents/PAW-03A Implementer.agent.md:217-221`, `agents/PAW-03B Impl Reviewer.agent.md:79-85`, `agents/PAW-02B Impl Planner.agent.md:51-52`
- Git workflow operations: `agents/PAW-03A Implementer.agent.md:20-25,56-72`
- Workflow initialization: `src/prompts/workItemInitPrompt.template.md:106-113`

## Desired End State

After implementation:

**PR Traceability**: Every PR created by PAW includes issue reference syntax. Planning, Phase, and Docs PRs use "Related to #N" to create bidirectional links without closing the issue. Final PR uses "Fixes #N" to automatically close the issue upon merge. Viewing an issue in GitHub shows all associated PRs in the timeline, providing complete progress visibility.

**PR Differentiation**: Phase PR titles explicitly include "Phase N" indicator and descriptions open with clear statements about partial implementation context. Reviewers can immediately identify intermediate checkpoints vs final deliverables from title alone.

**Structured Commit Messages**: All commits from PAW agents include work title, phase number (when applicable), and PAW indicator in a consistent format: `[<Work Title>] Phase N: <conventional-type>: <description>` with optional PAW footer. Git history becomes filterable and navigable, enabling developers to understand commit purpose without reading full diffs.

**Automated Phase Transitions**: When Implementer starts a new phase after phase PR merge, it automatically detects current branch state, checks out target branch, pulls latest changes, and creates new phase branch from updated target—all without manual intervention. Git housekeeping errors (conflicts, network failures) halt execution with specific error messages and recovery guidance.

**Target Branch Initialization**: Workflow initialization pushes target branch to remote immediately after committing WorkflowContext.md, ensuring Planning PR creation succeeds on first attempt.

**Git Workflow Enforcement**: Agent instructions explicitly prohibit use of `mcp_github_push_files` and `mcp_github_create_or_update_file` for PAW workflow files, with clear rationale about preserving git history. All file changes flow through proper git commands.

### Verification

**Automated Verification**:
- [x] Agent linter passes: `./scripts/lint-agent.sh agents/PAW-*.agent.md`
- [x] No references to prohibited MCP tools in workflow file context: `grep -r "mcp_github_push_files\|mcp_github_create_or_update_file" agents/`
- [x] All agent files updated include issue linking instructions
- [x] Commit message format documented consistently across three committing agents
- [x] Git log filtering works: `git log --grep="Work-ID: improve-pr-git-workflow"` and `git log --grep="PAW-Phase: 3"`

**Manual Verification**:
- [ ] Initialize new PAW workflow with prs strategy, verify Planning PR creates successfully without manual target branch push
- [ ] Create Planning PR, verify description includes "Related to #<N>" and PR appears in issue timeline
- [ ] Complete Phase 1, merge Phase PR, start Phase 2, verify Implementer automatically transitions git state (checkout target, pull)
- [ ] View Phase PR title, verify includes "Phase N" indicator clearly distinguishing from final PR
- [ ] Run `git log` on PAW feature branch, verify commits include work title and phase number
- [ ] Attempt to address Planning PR comments, verify commit messages follow structured format
- [ ] Create Final PR, verify description includes "Fixes #<N>" syntax
- [ ] Merge Final PR, verify originating issue automatically closes
- [ ] Trigger git housekeeping error (e.g., network failure during pull), verify clear error message with recovery steps

## What We're NOT Doing

- Changes to branch naming conventions (`<target>_plan`, `<target>_phaseN` remain unchanged)
- Changes to WorkflowContext.md structure beyond adding issue reference fields
- Git commit squashing or rewriting of existing history
- Changes to PR merge strategies (squash vs merge commit)
- Integration with non-GitHub platforms (Azure DevOps, GitLab) for issue linking
- Automated PR approval or merge logic
- Validation of PR description content beyond issue linking
- Enforcement of git workflow through technical constraints (e.g., GitHub branch protection rules)
- Centralized PR template files (formatting remains in agent instructions per current architecture)
- Retry logic for transient git operation failures (network timeouts, temporary unavailability)
- Comprehensive error recovery automation (conflicts require manual resolution)

## Implementation Approach

The implementation follows PAW's architecture philosophy: tools provide procedural operations, agents provide decision-making logic. We update agent instructions across seven files (PAW-02B, PAW-03A, PAW-03B, PAW-04, PAW-05, and workflow initialization) to add issue linking, commit message structure, git housekeeping automation, and guardrails. No new tools or centralized functions are introduced—agents continue using existing git CLI commands and GitHub Copilot routing to MCP tools.

The approach proceeds in logical phases: first enhance workflow initialization to push target branch (prevents Planning PR failures), then add issue linking and PR differentiation to all PR-creating agents, followed by commit message structure for all committing agents, automated git housekeeping for the Implementer, and finally explicit guardrails against direct-push tools. Each phase can be independently tested and delivers immediate value without breaking existing functionality.

## Phase Summary

1. **Phase 1: Workflow Initialization Enhancement** - Push target branch to remote after committing WorkflowContext.md to ensure Planning PR target exists
2. **Phase 2: Issue Linking and PR Differentiation** - Add issue reference syntax and partial implementation context to all four PR types
3. **Phase 3: Structured Commit Messages** - Implement consistent commit message format across Implementer, Reviewer, and Planner
4. **Phase 4: Automated Git Housekeeping** - Add phase transition detection and automated git state management to Implementer
5. **Phase 5: Git Workflow Guardrails** - Add explicit prohibitions against direct-push MCP tools with rationale

---

## Phase 1: Workflow Initialization Enhancement

### Overview
Ensure target branch exists on remote before Planning PR creation by pushing the target branch immediately after committing WorkflowContext.md during workflow initialization. This prevents Planning PR creation failures when the PR target branch doesn't exist remotely.

### Changes Required:

#### 1. Update Workflow Initialization Template
**File**: `src/prompts/workItemInitPrompt.template.md`
**Changes**:
- Locate "### 7. Commit WorkflowContext.md" section (currently lines 106-113)
- Add new step "### 8. Push Target Branch to Remote" between commit and open steps
- New step instructions:
  - Push target branch to establish remote reference: `git push -u origin <target_branch>`
  - Note this enables Planning PR creation in prs strategy (PR target must exist on remote)
  - Handle case where push fails (e.g., branch already exists): Report specific error but continue (not a blocker)
- Renumber existing "### 8. Open WorkflowContext.md" to "### 9"

**Brief Example**:
```markdown
### 8. Push Target Branch to Remote

After committing WorkflowContext.md, push the target branch to remote to ensure it exists for PR creation:

1. Push target branch: `git push -u origin <target_branch>`
2. If push fails because branch exists remotely, this is not an error (branch already initialized)
3. If push fails for other reasons (network, permissions), report the specific error but continue

This step ensures that when using prs review strategy, the Planning PR can be created successfully (PR targets must exist on remote).

### 9. Open WorkflowContext.md
```

**Tests**:
- Initialize workflow with new target branch, verify `git push` executes after commit
- Initialize workflow with existing remote branch, verify push failure handled gracefully
- Verify error messages distinguish between "branch exists" (acceptable) vs network/permission errors

### Success Criteria:

#### Automated Verification:
- [x] Template file compiles without errors: `npm run compile`
- [x] TypeScript validation passes: `tsc --noEmit`

#### Manual Verification:
- [ ] Initialize PAW workflow with new feature branch, verify target branch pushed to remote after WorkflowContext.md commit
- [ ] Check remote: `git ls-remote origin <target_branch>` shows branch exists
- [ ] Continue to Planning PR creation (Phase 2 implementation), verify PR creates without "target branch not found" errors
- [ ] Initialize workflow with branch that already exists on remote, verify push failure handled gracefully without blocking workflow

**Phase 1 Implementation Complete - 2025-12-10**

Updated `src/prompts/workItemInitPrompt.template.md` to add Step 8 "Push Target Branch to Remote" between commit and open steps. The new step pushes the target branch with `git push -u origin {{TARGET_BRANCH}}` and handles failures gracefully (branch already exists is acceptable, other errors reported but don't block workflow).

TypeScript compilation verified successful. Manual testing will occur after completing PR differentiation phases when Planning PRs can be created.

---

## Phase 2: Issue Linking and PR Differentiation

### Overview
Add issue reference syntax to all four PR types and enhance Phase PR descriptions to clearly communicate partial implementation context. Planning, Phase, and Docs PRs use "Related to #N" linking; Final PR uses "Fixes #N" auto-close syntax.

### Changes Required:

#### 1. Helper Function for Issue Number Extraction
**File**: `agents/PAW-02B Impl Planner.agent.md` (add to "Process Steps" section)
**Changes**:
- Add subsection "Issue Number Extraction Pattern" before "Step 4: Detailed Plan Writing"
- Document pattern for extracting issue number from Issue URL field:
  ```
  If Issue URL == "none" → No issue reference
  Else extract number from URL:
    - Pattern: https://github.com/<owner>/<repo>/issues/<N>
    - Extract <N> as the issue number
    - Use as "#<N>" in PR descriptions
  ```
- Note this pattern applies to all PR-creating agents

**Brief Example**:
```markdown
### Issue Number Extraction Pattern

When creating PRs, extract the issue number from WorkflowContext.md's Issue URL field:

**If Issue URL is "none"**:
- PR description notes: "No associated issue"
- Skip issue linking syntax

**If Issue URL is provided**:
- Extract number from GitHub URL format: `https://github.com/<owner>/<repo>/issues/<N>`
- Use `#<N>` format in PR descriptions
- Examples:
  - `https://github.com/lossyrob/phased-agent-workflow/issues/59` → `#59`
  - `https://github.com/org/project/issues/123` → `#123`

This pattern ensures GitHub creates bidirectional links between issues and PRs.
```

#### 2. Planning PR Issue Linking
**File**: `agents/PAW-02B Impl Planner.agent.md`
**Changes**:
- Locate Planning PR creation instructions (currently line 323-332)
- Update body format to include issue reference as first line after header:
  ```markdown
  **🐾 Implementation Planner 🤖:**
  
  Related to #<N>
  
  [Summary of deliverables, links to artifacts]
  ```
- Add conditional: If Issue URL is "none", replace with "No associated issue"

**Tests**:
- Create Planning PR with Issue URL present, verify "Related to #<N>" appears
- Create Planning PR with Issue URL = "none", verify "No associated issue" appears
- View issue in GitHub, verify Planning PR appears in issue timeline

#### 3. Phase PR Issue Linking and Differentiation
**File**: `agents/PAW-03B Impl Reviewer.agent.md`
**Changes**:
- Locate Phase PR creation instructions (currently line 132-141)
- Update title format to emphasize "Phase N" indicator: `[<Work Title>] Phase <N>: <description>`
- Add opening statement to body emphasizing partial implementation:
  ```markdown
  **🐾 Implementation Review Agent 🤖:**
  
  Related to #<N>
  
  **This is Phase <N> of a phased implementation approach.** This PR represents an intermediate checkpoint in the implementation process, not the final deliverable.
  
  [Phase objectives, changes made, testing performed]
  ```
- Extract phase number from ImplementationPlan.md Phase Summary or current phase context
- If total phase count available, include "Phase N of M" instead of just "Phase N"
- Add conditional for Issue URL = "none"

**Brief Example**:
```markdown
- **REQUIRED**: Create Phase PR:
  - Source: `<target>_phase[N]` → Target: `<target_branch>`
  - Title: `[<Work Title>] Phase <N>: <brief description>`
  - Body format:
    ```
    **🐾 Implementation Review Agent 🤖:**
    
    Related to #<N>
    
    **This is Phase <N> [of <M>] of a phased implementation approach.** This PR represents an intermediate checkpoint in the implementation process, not the final deliverable.
    
    ### Phase Objectives
    [What this phase accomplishes]
    
    ### Changes Made
    [Summary of implementation]
    
    ### Testing Performed
    [Verification results]
    
    ### Artifacts
    - Implementation Plan: `.paw/work/<feature-slug>/ImplementationPlan.md`
    
    ---
    🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)
    ```
  - Extract phase number from ImplementationPlan.md or current work context
  - If Issue URL is "none", replace "Related to #<N>" with "No associated issue"
```

**Tests**:
- Create Phase 1 PR with Issue URL, verify title includes "Phase 1" and description opens with partial implementation statement
- Verify "Related to #<N>" appears after header
- View issue, verify Phase PR appears in timeline
- Create Phase PR when total count known, verify "Phase N of M" format

#### 4. Docs PR Issue Linking
**File**: `agents/PAW-04 Documenter.agent.md`
**Changes**:
- Locate Docs PR creation instructions (currently line 138-144)
- Update body to include issue reference:
  ```markdown
  **🐾 Documenter 🤖:**
  
  Related to #<N>
  
  [Summary of Docs.md and project documentation updates]
  ```
- Add conditional for Issue URL = "none"

**Tests**:
- Create Docs PR with Issue URL, verify "Related to #<N>" appears
- View issue, verify Docs PR in timeline

#### 5. Final PR Auto-Close Syntax
**File**: `agents/PAW-05 PR.agent.md`
**Changes**:
- Locate Final PR description template (currently line 96-98)
- Update "Related Issues" section to use GitHub auto-close keyword:
  ```markdown
  ## Related Issues
  Fixes #<N>
  ```
- Change instruction from "Closes issue at <Issue URL>" to "Fixes #<N>" (GitHub recognizes Fixes, Closes, Resolves keywords)
- Add conditional: If Issue URL is "none", replace with "No associated issue"

**Brief Example**:
```markdown
## Related Issues
Fixes #<N>

[If Issue URL is "none", use: "No associated issue"]
```

**Tests**:
- Create Final PR with Issue URL, verify "Fixes #<N>" syntax
- Merge Final PR, verify issue automatically closes
- Create Final PR with Issue URL = "none", verify "No associated issue" appears

### Success Criteria:

#### Automated Verification:
- [x] Agent linter passes for all modified agent files: `./scripts/lint-agent.sh agents/PAW-02B*.agent.md agents/PAW-03B*.agent.md agents/PAW-04*.agent.md agents/PAW-05*.agent.md`
- [x] All PR body formats include issue reference syntax or "No associated issue" conditional

#### Manual Verification:
- [ ] Create full PAW workflow (prs strategy) with Issue URL, verify all four PRs include appropriate issue reference
- [ ] View issue in GitHub, verify all four PRs appear in issue timeline with bidirectional links
- [ ] Read Phase PR title and first paragraph, immediately understand it's partial implementation not ready for final review
- [ ] Merge Final PR, verify issue auto-closes without manual intervention
- [ ] Create workflow with Issue URL = "none", verify all PRs note "No associated issue" without errors

**Phase 2 Implementation Complete - 2025-12-10**

Updated all four PR-creating agents with issue linking and PR differentiation:
- PAW-02B Impl Planner: Added "Related to #N" syntax to Planning PR with issue number extraction pattern
- PAW-03B Impl Reviewer: Enhanced Phase PR with "Related to #N" and opening statement emphasizing partial implementation, explicit "Phase N:" in title
- PAW-04 Documenter: Added "Related to #N" syntax to Docs PR  
- PAW-05 PR Agent: Changed Final PR from generic "Closes issue at URL" to GitHub auto-close syntax "Fixes #N"

All agents now extract issue number from WorkflowContext.md Issue URL field with graceful handling for "none" value. Phase PRs clearly communicate intermediate checkpoint status to set appropriate reviewer expectations.

Agent linter passed for all four modified agents.

---

## Phase 3: Structured Commit Messages

### Overview
Implement consistent commit message format across all three committing agents (Implementer, Reviewer, Planner). Format includes work title, phase number (when applicable), optional conventional commit type, and description. Messages become filterable in git history.

### Changes Required:

#### 1. Commit Message Format Specification
**File**: `agents/PAW-03A Implementer.agent.md` (add to "Process Steps" section)
**Changes**:
- Add subsection "Commit Message Format" before "Committing and Pushing" section
- Document structured format:
  ```
  [<Work Title>] Phase <N>: <type>: <description>
  
  [Optional body with additional context]
  
  PAW-Phase: <N>
  Work-ID: <feature-slug>
  ```
- Specify conventional commit types (optional): feat, fix, docs, refactor, test, chore
- Note phase number should be omitted for non-phase commits (e.g., Planner addressing Planning PR comments)
- Explain footer metadata enables git log filtering

**Brief Example**:
```markdown
### Commit Message Format

All PAW commits must follow this structured format for traceability:

**Format**:
```
[<Work Title>] Phase <N>: <type>: <description>

[Optional body with details, rationale, or context]

PAW-Phase: <N>
Work-ID: <feature-slug>
```

**Field Definitions**:
- **Work Title**: From WorkflowContext.md (2-4 word identifier)
- **Phase N**: Current phase number from ImplementationPlan.md (omit for non-phase work)
- **type** (optional): Conventional commit type (feat, fix, docs, refactor, test, chore)
- **description**: Brief summary of changes (50 chars or less recommended)
- **body** (optional): Additional context, reasoning, or implementation notes
- **PAW-Phase footer**: Enables filtering commits by phase
- **Work-ID footer**: Enables filtering commits by work item

**Examples**:
```
[Auth System] Phase 2: feat: add JWT validation middleware

Implements token verification following the pattern in services/auth/.
Integrates with existing auth service at services/auth/index.ts.

PAW-Phase: 2
Work-ID: auth-system
```

```
[Improve PR Workflow] docs: add docstrings to git workflow functions

PAW-Phase: none
Work-ID: improve-pr-git-workflow
```

**Rationale**: Structured format enables git log filtering (`git log --grep="Work-ID: auth-system"`) and provides context without reading diffs.
```

#### 2. Implementer Commit Message Application
**File**: `agents/PAW-03A Implementer.agent.md`
**Changes**:
- Locate "Committing and Pushing" section (currently line 217-221)
- Replace "detailed commit message" guidance with reference to Commit Message Format section
- Add step to extract work title and phase number before committing:
  ```
  Before committing:
  1. Extract Work Title and Work ID from WorkflowContext.md
  2. Determine current phase number from ImplementationPlan.md or work context
  3. Apply Commit Message Format with appropriate type (feat, fix, refactor, etc.)
  ```
- Update example to show structured format

**Tests**:
- Implement Phase 2, commit changes, verify message includes "[<Work Title>] Phase 2:" prefix
- Run `git log --oneline`, verify commit messages show work title and phase
- Run `git log --grep="PAW-Phase: 2"`, verify phase 2 commits filter correctly

#### 3. Reviewer Commit Message Application
**File**: `agents/PAW-03B Impl Reviewer.agent.md`
**Changes**:
- Locate commit guidance (currently line 79-85)
- Update to reference Commit Message Format (copy from Implementer or reference it)
- Emphasize docs and refactor types for documentation and polish commits
- Add same extraction steps (work title, phase number from context)

**Brief Example**:
```markdown
6. **Commit improvements**:
   - Follow structured Commit Message Format:
     - `[<Work Title>] Phase <N>: docs: <description>` for documentation
     - `[<Work Title>] Phase <N>: refactor: <description>` for small refactors
   - Extract Work Title and Work ID from WorkflowContext.md
   - Use current phase number from review context
   - Add PAW footer metadata for filtering
   - DO NOT modify core functional logic or business rules
```

**Tests**:
- Review Phase 1 implementation, add docs, commit, verify message follows structured format
- Verify commit includes docs or refactor type appropriately

#### 4. Planner Commit Message Application
**File**: `agents/PAW-02B Impl Planner.agent.md`
**Changes**:
- Locate Planning PR review comment addressing (currently line 51-52)
- Update commit guidance to follow structured format
- Note: Planner commits are not phase-specific, so omit "Phase N" component
- Format becomes: `[<Work Title>] <type>: <description>` with PAW-Phase: none footer

**Brief Example**:
```markdown
- Commit with structured message following Commit Message Format:
  - Format: `[<Work Title>] <type>: <description>`
  - Reference review comment in description
  - Omit Phase N component (planning work is not phase-specific)
  - Add footer: `PAW-Phase: none`, `Work-ID: <feature-slug>`
- Use `github mcp` tools to push the commit
```

**Tests**:
- Address Planning PR comment, commit, verify message includes work title without phase number
- Verify PAW footer present with Phase: none

### Success Criteria:

#### Automated Verification:
- [x] Agent linter passes for all modified agent files
- [x] Commit message format documented consistently across three agents
- [x] All commit examples show structured format with work title and PAW footer

#### Manual Verification:
- [ ] Implement Phase 2, verify commits include "[<Work Title>] Phase 2:" prefix and PAW footer
- [ ] Run `git log` on feature branch, verify all PAW commits follow structured format
- [ ] Filter commits by work ID: `git log --grep="Work-ID: <slug>"` returns only relevant commits
- [ ] Filter commits by phase: `git log --grep="PAW-Phase: 2"` returns only Phase 2 commits
- [ ] Address Planning PR comment, verify commit omits phase number but includes work title
- [ ] Review Phase 1, add docs, verify commit uses "docs:" type

**Phase 3 Implementation Complete - 2025-12-10**

Added structured commit message format across all three committing agents:
- PAW-03A Implementer: Added "Commit Message Format" section with full format specification, examples, and rationale. Updated commit guidance in verification sections to reference the format.
- PAW-03B Impl Reviewer: Updated commit improvements section to reference structured format with emphasis on docs/refactor types common for reviewers.
- PAW-02B Impl Planner: Updated commit guidance in both PR review response mode and Planning PR creation (prs and local strategies) to use structured format with PAW-Phase: none for planning work.

Format: `[<Work Title>] Phase <N>: <type>: <description>` with PAW footer enabling git log filtering by phase and work ID.

Agent linter passed for all three modified agents. Commit messages in this implementation already demonstrate the format.

---

## Phase 4: Automated Git Housekeeping

### Overview
Enable Implementer to automatically detect phase completion, transition git state (checkout target branch, pull changes), and prepare for next phase without manual intervention. Errors halt execution with specific recovery guidance.

### Changes Required:

#### 1. Phase Transition Detection Logic
**File**: `agents/PAW-03A Implementer.agent.md` (add to "Getting Started" section)
**Changes**:
- Add new subsection "Automated Git Housekeeping" before existing branch selection logic
- Document detection pattern:
  ```
  When starting new phase, check if previous phase completed:
  1. Check current branch: `git branch --show-current`
  2. If on phase branch (<target>_phaseN):
     - Check if phase PR merged (prs strategy only)
     - If merged or user signals readiness: Perform git housekeeping
  3. Git housekeeping steps:
     - Verify working tree clean: `git status --porcelain`
     - If uncommitted changes: STOP with error, warn about data loss
     - Checkout target branch: `git checkout <target_branch>`
     - Pull latest changes: `git pull <remote> <target_branch>`
     - If conflicts or errors: STOP with specific error message and recovery steps
  ```

**Brief Example**:
```markdown
### Automated Git Housekeeping

Before starting a new phase, the Implementer automatically transitions git state when appropriate:

**Detection Logic**:
1. Check current branch: `git branch --show-current`
2. Determine if on previous phase branch: matches `<target>_phase[N-1]` pattern
3. Check if phase work completed:
   - **prs strategy**: Phase PR merged (check GitHub or ImplementationPlan.md status)
   - **local strategy**: Phase marked complete in ImplementationPlan.md

**Housekeeping Steps** (when phase completed):
1. **Safety check**: `git status --porcelain` to detect uncommitted changes
   - If output non-empty: STOP with error
   - Message: "Cannot transition: uncommitted changes on <branch>. Commit or stash changes before proceeding."
2. **Checkout target branch**: `git checkout <target_branch>`
   - If fails: STOP with error: "Failed to checkout <target_branch>: <git_error>. Verify branch exists and no conflicts."
3. **Pull latest changes**: `git pull <remote> <target_branch>`
   - If fails: STOP with error: "Failed to pull <target_branch>: <git_error>. Check network, resolve conflicts, or pull manually."
4. **Success**: Report transition complete, ready to create next phase branch

**Error Recovery**:
- Uncommitted changes: `git status` to review, then `git commit` or `git stash`
- Checkout failure: `git branch -a` to verify branch exists, resolve detached HEAD if needed
- Pull failure: Check network, `git fetch` to verify connectivity, `git merge --abort` if conflicts, manual pull and resolve

**Skip Housekeeping**:
- Already on target branch (manual transition completed)
- On correct phase branch for current phase (resuming work)
- User explicitly signals no housekeeping needed
```

**Tests**:
- Complete Phase 1, merge PR, start implement Phase 2, verify automatic checkout and pull
- Start Phase 2 with uncommitted changes on Phase 1 branch, verify error halts execution
- Simulate network failure during pull, verify specific error message with recovery steps
- Already on target branch, start Phase 2, verify housekeeping skipped

#### 2. Integration with Existing Getting Started Logic
**File**: `agents/PAW-03A Implementer.agent.md`
**Changes**:
- Update "Getting Started" section (currently line 13-25) to invoke housekeeping first
- Add step 0: "Perform Automated Git Housekeeping if transitioning between phases"
- Existing steps become conditional on housekeeping completion
- Add fallback: If housekeeping detects already in correct state, skip to phase implementation

**Brief Example**:
```markdown
## Getting Started

0. **Automated Git Housekeeping** (see subsection above):
   - If transitioning from completed phase, automatically checkout target and pull
   - If errors occur, stop and report with recovery guidance
   - If already in correct git state, skip to implementation

1. Look for `WorkflowContext.md` in chat context or on disk...
[existing steps continue]
```

#### 3. Phase Completion Detection
**File**: `agents/PAW-03A Implementer.agent.md`
**Changes**:
- Add helper logic to determine if phase PR merged (for prs strategy)
- Pattern:
  ```
  For prs strategy:
    - Check ImplementationPlan.md for "Phase N PR: <url>" link
    - Check if PR shows "merged" status in GitHub (optional, may use GitHub MCP tools)
    - Or rely on user signal ("Phase 1 complete, starting Phase 2")
  
  For local strategy:
    - Check ImplementationPlan.md for "Phase N: Complete" or similar marker
    - Or check commit history for phase completion commit
  ```
- Note: Initial implementation can rely on user signal; future iterations may add GitHub API checks

### Success Criteria:

#### Automated Verification:
- [x] Agent linter passes: `./scripts/lint-agent.sh agents/PAW-03A*.agent.md`
- [x] Housekeeping logic documented with safety checks and error handling

#### Manual Verification:
- [ ] Complete Phase 1 (prs strategy), merge PR, say "implement Phase 2", verify Implementer automatically checks out target and pulls
- [ ] Start Phase 2 with uncommitted changes on Phase 1 branch, verify error: "Cannot transition: uncommitted changes"
- [ ] Disconnect network, start Phase 2 after phase 1 merge, verify pull failure reports specific error with recovery steps
- [ ] Already on target branch, start Phase 2, verify housekeeping skipped gracefully
- [ ] Simulate merge conflict during pull, verify error reports conflict and suggests manual resolution
- [ ] Complete Phase 1 (local strategy), start Phase 2, verify housekeeping detects completion and transitions

**Phase 4 Implementation Complete - 2025-12-10**

Added automated git housekeeping to PAW-03A Implementer agent:
- Added "Automated Git Housekeeping" subsection in Getting Started with detection logic and housekeeping steps
- Housekeeping automatically transitions git state (checkout target, pull) when starting new phase after previous phase completion
- Safety checks prevent data loss (uncommitted changes detection)
- Error handling provides specific recovery guidance for checkout/pull failures
- Condensed format to stay within 7000 token limit while preserving critical functionality

When user says "implement Phase 2" after Phase 1 complete, agent now automatically:
1. Detects on phase1 branch
2. Verifies no uncommitted changes
3. Checks out target branch
4. Pulls latest changes
5. Proceeds to create phase2 branch

Agent linter passed. Manual testing will verify automated transitions work correctly.

---

## Phase 5: Git Workflow Guardrails

### Overview
Add explicit prohibitions against using GitHub MCP direct-push tools (`mcp_github_push_files`, `mcp_github_create_or_update_file`) for PAW workflow files, with clear rationale about preserving git history. Guardrails apply only to workflow files; tools remain available for other purposes.

### Changes Required:

#### 1. Implementation Planner Guardrails
**File**: `agents/PAW-02B Impl Planner.agent.md`
**Changes**:
- Locate "Important Guidelines" section (currently line 291-395)
- Add new guideline "11. Use Git Commands for Workflow Files" after "10. Co-Develop Unit Tests with Code"
- Document prohibition and rationale:
  ```
  11. **Use Git Commands for Workflow Files**:
     - For PAW workflow files (.paw/work/<feature-slug>/, agent files, docs), ALWAYS use git commands (git add, git commit, git push)
     - NEVER use mcp_github_push_files or mcp_github_create_or_update_file for workflow files
     - Rationale: These tools create commits remotely without local git operations, bypassing version control and preventing proper history tracking
     - GitHub MCP tools remain available for reading issues, creating PRs, and interacting with GitHub platform—just not for pushing workflow files
     - This ensures all workflow changes appear in git log and can be reviewed through standard git workflows
  ```

**Brief Example**:
```markdown
11. **Use Git Commands for Workflow Files**:
   - **ALWAYS** use git commands for PAW workflow files:
     - Git operations: `git add`, `git commit`, `git push`
     - Applies to: `.paw/work/<feature-slug>/` directory, agent files (`.agent.md`), documentation
   - **NEVER** use these GitHub MCP tools for workflow files:
     - `mcp_github_push_files` - Bypasses local git history
     - `mcp_github_create_or_update_file` - Bypasses local git history
   - **Rationale**: Direct-push tools create commits remotely without local git operations, preventing proper version control and code review
   - **GitHub MCP tools remain available for**:
     - Reading issue content
     - Creating PRs
     - Querying GitHub platform
     - Operations on non-workflow files (external repos, etc.)
   - This guardrail ensures all workflow changes are traceable through git log and reviewable through standard git workflows
```

**Tests**:
- Review Implementation Planner instructions, verify explicit prohibition present
- Check no references to prohibited tools in Planning PR commit guidance

#### 2. Implementer Guardrails
**File**: `agents/PAW-03A Implementer.agent.md`
**Changes**:
- Locate commit guidance section
- Add note referencing git commands requirement:
  ```
  - Use git commands exclusively for all file operations (git add, git commit)
  - Do not use GitHub MCP direct-push tools (mcp_github_push_files, mcp_github_create_or_update_file) for workflow files—these bypass proper version control
  ```
- Can reference Implementation Planner guideline for detailed rationale

#### 3. Implementation Review Agent Guardrails
**File**: `agents/PAW-03B Impl Reviewer.agent.md`
**Changes**:
- Locate push instructions section (currently line 47, 57)
- Add note before push commands:
  ```
  - Use git push command exclusively—do not use GitHub MCP direct-push tools
  - Rationale: Preserves git history and enables proper version control workflow
  ```

#### 4. Documenter Guardrails
**File**: `agents/PAW-04 Documenter.agent.md`
**Changes**:
- Locate commit and push sections (currently line 32, 45)
- Add same git commands note as other agents
- Reference Implementation Planner guideline for full rationale

#### 5. Final PR Agent Check
**File**: `agents/PAW-05 PR.agent.md`
**Changes**:
- Review agent instructions to confirm it doesn't create commits (it only reads artifacts and creates PR)
- If no commit operations present, no guardrail needed (agent doesn't have file push capabilities in workflow)
- Add note in "Process Steps" if useful: "Note: This agent only reads artifacts and creates PR—all file changes should already be committed by previous agents using git commands"

### Success Criteria:

#### Automated Verification:
- [x] Agent linter passes for all modified agent files
- [x] Grep search for prohibited tools in workflow file context returns no matches: `grep -r "mcp_github_push_files\|mcp_github_create_or_update_file" agents/ | grep -v "NEVER use" | grep -v "Do not use"`
- [x] All committing agents (PAW-02B, PAW-03A, PAW-03B, PAW-04) include git commands guardrail

#### Manual Verification:
- [ ] Review all agent instructions, verify explicit prohibition language present in relevant agents
- [ ] Review rationale statement, verify emphasizes "preserves git history" and "enables version control"
- [ ] Check that guardrail scopes correctly (workflow files only, not all GitHub operations)
- [ ] Verify GitHub MCP tools still documented for reading issues, creating PRs, platform queries

**Phase 5 Implementation Complete - 2025-12-10**

Added explicit git workflow guardrails across all four committing agents:
- PAW-02B Impl Planner: Added Important Guidelines section 11 prohibiting direct-push MCP tools for workflow files
- PAW-03A Implementer: Added "Git Commands Only" note in Committing and Pushing section
- PAW-03B Impl Reviewer: Added guardrail note in push instructions (Step 7.2a)
- PAW-04 Documenter: Added guardrail notes in both prs and local strategy sections

All agents now explicitly prohibit `mcp_github_push_files` and `mcp_github_create_or_update_file` for PAW workflow files with rationale about preserving git history and enabling proper code review. GitHub MCP tools remain available for reading issues, creating PRs, and non-workflow operations.

Agent linter passed for all four agents. Grep verification confirms no prohibited tool usage outside of prohibition statements.

---

## Cross-Phase Testing Strategy

### Integration Tests:
- **End-to-end PAW workflow (prs strategy)**:
  1. Initialize workflow with Issue URL
  2. Verify target branch pushed to remote after WorkflowContext.md commit
  3. Complete spec and planning, verify Planning PR includes "Related to #N"
  4. Implement Phase 1, verify commits follow structured format with work title and phase number
  5. Merge Phase 1 PR
  6. Start Phase 2, verify Implementer automatically transitions git state (checkout, pull)
  7. Complete Phase 2, verify Phase PR includes "Related to #N" and partial implementation statement
  8. Complete documentation, verify Docs PR includes "Related to #N"
  9. Create Final PR, verify "Fixes #N" syntax
  10. Merge Final PR, verify issue automatically closes
  11. View issue timeline, verify all four PRs linked bidirectionally

- **End-to-end PAW workflow (local strategy)**:
  1. Initialize workflow with Issue URL and local strategy
  2. Verify target branch pushed to remote after WorkflowContext.md commit
  3. Complete spec and planning, verify no Planning PR created (planning artifacts committed to target)
  4. Implement Phase 1, verify commits follow structured format
  5. Verify Phase 1 commits pushed to target branch (no Phase PR)
  6. Start Phase 2, verify Implementer detects Phase 1 complete and transitions appropriately
  7. Complete all phases, verify no intermediate PRs
  8. Create Final PR, verify "Fixes #N" syntax and issue auto-closes on merge

- **Error handling scenarios**:
  1. Simulate uncommitted changes during phase transition, verify error halts execution
  2. Simulate network failure during git pull, verify specific error with recovery steps
  3. Simulate merge conflict during pull, verify error reports conflict and suggests resolution
  4. Initialize workflow when target branch exists remotely, verify graceful handling
  5. Create PR with Issue URL = "none", verify "No associated issue" appears

### Manual Testing Steps:
1. Initialize PAW workflow with GitHub issue
2. Complete spec stage
3. Complete code research
4. Complete planning, verify Planning PR created with issue link
5. Implement Phase 1 with at least 2 commits, verify commit messages include work title and phase number
6. Run `git log --oneline`, visually inspect commit format
7. Run `git log --grep="PAW-Phase: 1"`, verify only Phase 1 commits returned
8. Merge Phase 1 PR in GitHub
9. In new terminal, start Phase 2 implementation
10. Verify Implementer automatically: checks out target branch, pulls changes, creates phase 2 branch
11. Repeat steps 5-10 for Phase 2
12. Complete documentation, verify Docs PR includes issue link
13. Create Final PR, verify "Fixes #<N>" syntax in description
14. Merge Final PR, verify issue automatically closes in GitHub UI
15. View issue page, verify all PRs (Planning, Phase 1, Phase 2, Docs, Final) appear in timeline
16. Grep agent files for `mcp_github_push_files`, verify only prohibition statements appear

## Performance Considerations

- **Commit message parsing**: Extracting work title and phase number from WorkflowContext.md and ImplementationPlan.md requires file reads at commit time. Impact is minimal (1-2 file reads per commit, files <10KB typically)
- **Git housekeeping**: Automated checkout/pull adds network latency (typically 1-5 seconds) but eliminates manual steps worth 30-60 seconds
- **Issue number extraction**: URL parsing is O(1) with regex; negligible performance impact
- **PR description rendering**: Adding issue links increases PR body size by ~20 chars; no significant GitHub API impact

## Migration Notes

**For existing PAW workflows**:
- No migration required for artifacts or git history
- Existing PRs without issue links remain unchanged (historical state preserved)
- New PRs created after Phase 2 implementation will include issue links
- Existing commits without structured format remain unchanged
- New commits after Phase 3 implementation follow structured format
- Workflows in progress can adopt new practices incrementally (each phase independent)

**For workflows initiated before Phase 1**:
- Target branch may not exist on remote, causing Planning PR creation failure
- Workaround: Manually push target branch before invoking Implementation Planner
- After Phase 1 deployment: All new workflows automatically push target branch

**For workflows paused mid-phase**:
- Phase 4 automated git housekeeping applies only when starting NEW phases
- Workflows resumed mid-phase continue with existing manual git state management
- To benefit from automation: Complete current phase, merge PR, then start next phase

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/59
- Spec: `.paw/work/improve-pr-git-workflow/Spec.md`
- Research: `.paw/work/improve-pr-git-workflow/SpecResearch.md`, `.paw/work/improve-pr-git-workflow/CodeResearch.md`
- Related Issues:
  - #69 (Workflow Handoffs) - Infrastructure for stage transitions
  - #60 (Workflow Status Capability) - Status agent integration
  - #108 (Automated Git Workflow Between Phases) - Integrated into issue #59 item 6
- GitHub Issue Linking Docs: https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue
- Conventional Commits: https://www.conventionalcommits.org/
- PAW Agent Linter: `./scripts/lint-agent.sh`

---

## Implementation Summary

**All Five Phases Complete - 2025-12-10**

Successfully implemented all PR and git workflow improvements across PAW agents. All automated verification criteria passed, and implementation ready for manual testing and review.

**What Was Delivered**:
1. **Workflow Initialization** - Target branch automatically pushed to remote during workflow setup (prevents Planning PR failures)
2. **Issue Linking** - All four PR types include GitHub issue reference syntax ("Related to #N" for intermediate PRs, "Fixes #N" for final PR)
3. **PR Differentiation** - Phase PRs clearly communicate partial implementation status through titles and descriptions
4. **Structured Commits** - All PAW commits include work title, phase number, conventional type, and PAW footer for git history navigation
5. **Automated Housekeeping** - Implementer automatically transitions git state (checkout target, pull) between phases
6. **Git Workflow Guardrails** - All committing agents explicitly prohibit direct-push MCP tools to preserve git history

**Files Modified**:
- `src/prompts/workItemInitPrompt.template.md` - Added target branch push step
- `agents/PAW-02B Impl Planner.agent.md` - Issue linking, commit format, guardrails
- `agents/PAW-03A Implementer.agent.md` - Commit format, automated housekeeping, guardrails
- `agents/PAW-03B Impl Reviewer.agent.md` - Issue linking, commit format, guardrails
- `agents/PAW-04 Documenter.agent.md` - Issue linking, guardrails
- `agents/PAW-05 PR.agent.md` - Auto-close syntax

**Verification Results**:
- All agent linters passed (condensed sections to stay within token limits)
- Git log filtering tested and working (`--grep="Work-ID:"`, `--grep="PAW-Phase:"`)
- No prohibited MCP tool usage detected in workflow file operations
- Structured commit messages applied throughout this implementation (demonstrating the format)

**Next Steps**:
- Manual testing: Initialize new workflow with prs strategy, verify Planning PR creation
- Manual testing: Complete Phase 1, merge PR, start Phase 2, verify automated git housekeeping
- Manual testing: Create PRs through full workflow, verify issue timeline shows all PRs
- Manual testing: Merge Final PR, verify issue auto-closes

---

## Implementation Review Complete - 2025-12-10

**Review Summary:**

Reviewed all implementation changes from PAW-03A Implementer across six commits implementing five phases. Verified:
- ✅ All tests pass (135 passing)
- ✅ Agent linter passes for all modified agents (warnings for token counts acceptable, all under 7000)
- ✅ Commit messages follow structured format with PAW footer
- ✅ Git log filtering works correctly (`--grep="Work-ID:"`, `--grep="PAW-Phase: N"`)
- ✅ No prohibited MCP tool usage detected (only prohibition statements found)
- ✅ Code quality: No unused parameters, dead code, or unnecessary complexity
- ✅ Documentation: All changes well-documented in agent instructions
- ✅ Design decisions: Sound architecture following PAW philosophy

**Changes Pushed:**
All six commits pushed to remote target branch `feature/59-improve-pr-git-workflow`:
- Phase 1: Target branch push to workflow initialization
- Phase 2: Issue linking and PR differentiation
- Phase 3: Structured commit message format
- Phase 4: Automated git housekeeping
- Phase 5: Git workflow guardrails
- Summary: Implementation documentation

**Review Strategy: local** - No Phase PR created (changes pushed directly to target branch per local strategy).

**Ready for**: Final PR creation by PAW-05 PR Agent to close issue #59

---

## Addressed Review Comments - 2025-12-10

**PR**: #146 (Final PR targeting main)
**Reviewer**: lossyrob
**Theme**: Reduce verbosity, save tokens. Remove procedural details, let agent reason from desired end state.

**9 Line-Specific Comments Addressed:**

All review comments addressed in 3 focused commits:

**Commit 1: Remove agent tags from PR body templates** (`57f3d0e`)
- PAW-04 Documenter.agent.md:165 - Removed "🐾 Documenter 🤖:" tag from Docs PR body
- PAW-03B Impl Reviewer.agent.md:223 - Removed "🐾 Implementation Review Agent 🤖:" tag from Phase PR body

**Commit 2: Simplify PAW-02B commit format and issue extraction** (`7079b0e`)
- PAW-02B Impl Planner.agent.md:292 - Removed "PAW-Phase: none" footer (agents can infer from context)
- PAW-02B Impl Planner.agent.md:291 - Changed commit type from "docs:/chore:" to "planning" for clarity
- PAW-02B Impl Planner.agent.md:308-312 - Condensed issue number extraction to single line

**Commit 3: Remove verbose/duplicate guidance** (`3b88039`)
- PAW-04 Documenter.agent.md:188 - Removed duplicate "Git Commands Only" guidance from local strategy section
- PAW-05 PR.agent.md:160 - Removed line explaining where to extract issue numbers
- src/prompts/workItemInitPrompt.template.md:115 - Condensed "Push Target Branch" section to one-liner
- PAW-03A Implementer.agent.md:14 - Condensed "Automated Git Housekeeping" to single numbered list entry

**Verification:**
- ✅ All agent linters pass (5 modified agent files)
- ✅ All 135 tests pass
- ✅ TypeScript compilation successful
- ✅ All commits follow structured format with PAW footer

**Result**: Token usage reduced by removing procedural explanations. Agents can reason from desired end state without step-by-step guidance. All changes maintain functional equivalence while reducing instruction verbosity.
