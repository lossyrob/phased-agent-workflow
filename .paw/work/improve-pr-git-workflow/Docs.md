# Improve PR and Git Workflow Practices

## Overview

This enhancement establishes comprehensive traceability and automation across PAW's PR and git workflows. When developers use PAW to implement features, the workflow now creates properly linked artifacts—Planning PRs, Phase PRs, Documentation PRs, and Final PRs—that connect directly to the originating issue, making progress visible from a single entry point. Every PR includes GitHub issue reference syntax appropriate to its role: intermediate PRs use "Related to #N" for bidirectional visibility without closing the issue, while the Final PR uses "Fixes #N" to automatically close the issue upon merge.

Beyond linking, the implementation addresses workflow friction through structured commit messages, automated git housekeeping, and clear PR differentiation. All commits from PAW agents include work title, phase number (when applicable), and PAW indicators in a consistent format, making git history navigable and meaningful. The Implementer now automatically transitions git state between phases (checkout target branch, pull changes) without manual intervention. Phase PRs explicitly communicate their partial nature through titles and descriptions. The workflow initialization pushes the target branch to remote immediately, preventing Planning PR creation failures.

These improvements deliver a seamless, traceable PAW experience where users focus on implementation while automation handles git mechanics, and stakeholders gain complete visibility into work progress through properly linked artifacts.

## Architecture and Design

### High-Level Architecture

The implementation follows PAW's core architectural principle: **tools provide procedural operations, agents provide decision-making logic**. Rather than creating centralized PR template functions or git workflow tools, we enhanced agent instructions across seven files to add issue linking, commit message structure, git housekeeping automation, and guardrails. Agents continue using existing git CLI commands and GitHub Copilot routing to MCP tools.

**Key Components**:
- **Workflow Initialization**: Template prompts that agents follow when starting new work (handles target branch push)
- **PR-Creating Agents**: Four agents (PAW-02B Planner, PAW-03B Reviewer, PAW-04 Documenter, PAW-05 PR) that create PRs with issue linking
- **Committing Agents**: Three agents (PAW-03A Implementer, PAW-03B Reviewer, PAW-02B Planner) that create commits with structured messages
- **Git Housekeeping Logic**: Implementer agent detects phase completion and automates checkout/pull operations
- **Issue Reference Integration**: WorkflowContext.md stores Issue URL; agents parse and inject references into PR descriptions

**Data Flow**:
1. User initializes workflow → WorkflowContext.md created with Issue URL
2. Agents read WorkflowContext.md → extract Issue URL and Work Title
3. PR creation → Agents inject appropriate issue reference syntax ("Related to #N" or "Fixes #N")
4. Commit creation → Agents construct structured message with work title, phase number, PAW footer
5. Phase completion → Implementer detects merged branch, automates git state transition
6. GitHub → Issue timeline shows all linked PRs, Final PR merge auto-closes issue

### Design Decisions

**Decision 1: Agent Instructions Over Centralized Functions**

**Rationale**: PAW's architecture trusts agents to reason about git operations rather than wrapping them in procedural tools. Creating centralized PR template functions or git workflow wrappers would violate this philosophy. Agents use natural language instructions that GitHub Copilot routes to appropriate MCP tools.

**Alternative Considered**: Centralized `createPAWPullRequest(type, issueNum)` function in a new tool.
**Rejected Because**: Adds complexity, reduces agent flexibility, creates maintenance burden for tool versioning.

**Decision 2: "Related to #N" for Intermediate PRs, "Fixes #N" for Final PR**

**Rationale**: Intermediate PRs (Planning, Phase, Docs) should create bidirectional issue links without closing the issue. Only the Final PR should trigger auto-close when merged, completing the issue lifecycle.

**Alternative Considered**: All PRs use "Fixes #N" with manual issue reopening after intermediate PR merges.
**Rejected Because**: Creates unnecessary manual work and pollutes issue timeline with reopen/close events.

**Decision 3: Structured Commit Message Format**

**Format**: `[<Work Title>] Phase N: <type>: <description>`

**Rationale**: Provides git history navigation through `git log --grep="Work-ID: <slug>"` and `git log --grep="PAW-Phase: N"`. Work title connects commits to their workflow context. Phase number enables filtering implementation progress. PAW footer distinguishes automated commits from manual edits.

**Alternative Considered**: Free-form commit messages with optional work title.
**Rejected Because**: Loses git history traceability and makes it difficult to understand commit scope without reading full diffs.

**Decision 4: Automated Git Housekeeping in Implementer**

**Rationale**: After merging a Phase PR, developers must manually checkout target branch and pull changes before starting the next phase. This manual step is error-prone (developers might forget, causing conflicts) and adds friction to workflow transitions. Automating detection of merged phase branches and git state transitions eliminates this friction.

**Alternative Considered**: Continue requiring manual git commands between phases.
**Rejected Because**: Reduces developer experience and increases likelihood of errors during phase handoffs.

**Decision 5: Git CLI Commands Over Direct-Push MCP Tools**

**Rationale**: Tools like `mcp_github_push_files` and `mcp_github_create_or_update_file` bypass local git state, creating commits directly on GitHub without local branch updates. This breaks git workflows by:
- Skipping local staging area (can't review changes before commit)
- Creating commits not in local history (requires pull to sync)
- Preventing use of git hooks, linters, or other pre-commit checks
- Making it impossible to amend or rebase commits locally

All workflow file changes must flow through proper git commands to maintain version control integrity.

**Alternative Considered**: Allow direct-push tools with mandatory post-push git pull.
**Rejected Because**: Still breaks pre-commit checks and local review workflows; pull after push creates confusing "behind remote" states.

**Decision 6: Target Branch Push During Workflow Initialization**

**Rationale**: Planning PR creation fails if the target branch doesn't exist on the remote. By pushing the target branch immediately after committing WorkflowContext.md during workflow initialization, we guarantee the PR target exists before the Planner attempts PR creation.

**Alternative Considered**: Let Planning PR creation fail, user manually pushes target branch, retry.
**Rejected Because**: Poor user experience; failure happens at beginning of workflow when user expectations are highest.

### Integration Points

**GitHub MCP Server**: Agents route PR creation through GitHub Copilot to GitHub MCP tools (`mcp_github_issue_write` for creating PRs). Issue linking syntax in PR descriptions enables GitHub's issue-PR linking mechanism.

**Git CLI**: All git operations (add, commit, push, checkout, pull) execute through terminal commands using `run_in_terminal` tool.

**WorkflowContext.md**: Central artifact storing Issue URL, Work Title, Review Strategy, and Workflow Mode. Agents read this file to extract context for PR descriptions and commit messages.

**ImplementationPlan.md**: Agents check phase completion status ("Status: Completed" markers) to determine when automated git housekeeping should trigger.

## User Guide

### Prerequisites

This feature is fully integrated into PAW agents. No additional setup or configuration required. Works with existing PAW workflows.

### Basic Usage

**Starting a New Workflow with Issue Linking**

When initializing a new PAW workflow through the Status Agent or Init command:

1. Provide the GitHub Issue URL when prompted (or enter "none" if no issue exists)
2. The workflow stores the Issue URL in WorkflowContext.md
3. All subsequent PRs (Planning, Phase, Docs, Final) automatically include issue references

**Viewing Issue-Linked PRs**

Navigate to your GitHub Issue → Review the timeline/linked PR section → See all PAW-generated PRs listed with their relationship to the issue.

**Understanding PR Types from Titles**

- **Planning PR**: `[<Work Title>] Planning: <description>` - Initial planning artifacts
- **Phase PR**: `[<Work Title>] Phase N: <description>` - Partial implementation checkpoint
- **Docs PR**: `[<Work Title>] Documentation` - Documentation changes
- **Final PR**: `[<Work Title>] <description>` - Complete implementation ready for merge

**Navigating Git History**

Filter commits by work:
```bash
git log --grep="Work-ID: <feature-slug>"
```

Filter commits by phase:
```bash
git log --grep="PAW-Phase: 2"
```

View PAW-generated commits only:
```bash
git log --grep="🐾 Generated with PAW"
```

**Automated Phase Transitions**

When starting a new phase after merging a Phase PR:

1. Invoke PAW-03A Implementer for the next phase
2. Agent automatically detects merged phase branch
3. Agent checks out target branch and pulls latest changes
4. Agent creates new phase branch from updated target
5. Implementation proceeds without manual git commands

If git housekeeping encounters errors (merge conflicts, network issues), the agent reports the specific error and halts for user intervention.

### Advanced Usage

**Workflows Without Issues**

When initializing a workflow, enter "none" for Issue URL. PRs will include "No associated issue" note instead of issue reference syntax. All other functionality works normally.

**Custom Commit Messages**

While PAW agents generate structured commit messages automatically, you can still create manual commits with any format. The structured format applies only to agent-generated commits.

**Addressing PR Review Comments**

When reviewers comment on Planning, Phase, or Docs PRs:

1. Agent reads review comments and conversation threads
2. Agent groups comments into logical commit groups
3. For each group, agent makes changes and commits with message linking to review comment
4. Agent pushes all commits and posts comprehensive summary comment

All review-addressing commits follow the structured format: `[<Work Title>] Phase N: <type>: <description>`

### Configuration

**Workflow Mode**: Set during workflow initialization. Determines documentation depth and workflow steps.
- `full` - Complete documentation, all phases
- `minimal` - Streamlined documentation, essential phases only
- `custom` - User-defined workflow steps

**Review Strategy**: Set during workflow initialization. Determines PR creation behavior.
- `prs` - Creates intermediate PRs (Planning, Phase, Docs) with reviews
- `local` - Commits directly to target branch, no intermediate PRs

**Issue URL**: Set during workflow initialization. Can be GitHub Issue URL or "none".

Configuration values stored in `WorkflowContext.md` at `.paw/work/<feature-slug>/WorkflowContext.md`.

## Technical Reference

### Key Components

**WorkflowContext.md Fields Used**:
- `Issue URL` - GitHub issue URL or "none" (read by all PR-creating agents)
- `Work Title` - Short work name (used in PR titles and commit messages)
- `Target Branch` - Branch where work merges (used for git housekeeping)
- `Review Strategy` - `prs` or `local` (determines PR creation logic)
- `Workflow Mode` - `full`, `minimal`, or `custom` (determines documentation depth)

**Agent Responsibilities**:
- **PAW-02B Impl Planner**: Creates Planning PR with "Related to #N", structured commits, target branch push (prs strategy)
- **PAW-03A Implementer**: Creates commits with structured format, automated git housekeeping between phases
- **PAW-03B Impl Reviewer**: Creates Phase PRs with "Related to #N" and "Phase N" titles, structured commits for review fixes
- **PAW-04 Documenter**: Creates Docs PR with "Related to #N", structured commits (prs strategy)
- **PAW-05 PR**: Creates Final PR with "Fixes #N" syntax for auto-close

### Commit Message Structure

**Format**:
```
[<Work Title>] Phase N: <type>: <description>

<optional body paragraphs>

Work-ID: <feature-slug>
PAW-Phase: <N>

🐾 Generated with PAW
```

**Examples**:
```
[Auth System] Phase 2: feat: add JWT token validation

Implements token signature verification, expiration checks, and
refresh token rotation.

Work-ID: auth-system
PAW-Phase: 2

🐾 Generated with PAW
```

```
[API Client] docs: update README with new endpoints

Work-ID: api-client

🐾 Generated with PAW
```

**Field Meanings**:
- `[<Work Title>]` - Identifies which work item this commit belongs to
- `Phase N` - Optional, included only when commit is part of phased implementation
- `<type>` - Conventional commit type (feat, fix, docs, refactor, test, chore)
- `<description>` - Brief description of changes (imperative mood, lowercase)
- `Work-ID` - Normalized feature slug for git log filtering
- `PAW-Phase` - Numeric phase identifier for phase-specific filtering
- `🐾 Generated with PAW` - PAW indicator footer

**Omissions for Non-Phase Commits**:
For commits not associated with phases (e.g., documentation, planning artifacts), omit "Phase N" and "PAW-Phase" fields:
```
[Work Title] <type>: <description>

Work-ID: <feature-slug>

🐾 Generated with PAW
```

### PR Description Structure

**Planning PR**:
```markdown
# Planning: <Work Title>

Related to <Issue URL or "No associated issue">

This PR introduces planning artifacts for <brief description>.

**Artifacts Included**:
- ImplementationPlan.md
- ...

<Additional context>

🐾 Generated with PAW
```

**Phase PR**:
```markdown
# Phase N: <Phase Description>

Related to <Issue URL or "No associated issue">

This PR implements Phase N of the phased implementation approach for <Work Title>.

**⚠️ Partial Implementation - Phase N of M**
This PR represents an intermediate checkpoint in a multi-phase implementation.
It is not the complete feature and is not intended as the final review target.

**Phase Scope**:
- <What's included in this phase>

**Testing**:
- <How to test this phase>

<Links to artifacts>

🐾 Generated with PAW
```

**Documentation PR**:
```markdown
# Documentation

Related to <Issue URL or "No associated issue">

This PR adds comprehensive documentation for <Work Title>.

**Documentation Includes**:
- Docs.md (detailed technical reference)
- Updated README
- CHANGELOG entries
- ...

<Links to artifacts>

🐾 Generated with PAW
```

**Final PR**:
```markdown
# <Work Title>

Fixes <Issue URL or "No associated issue">

<Complete feature description>

**Implementation Details**:
- <High-level overview>

**Testing**:
- <How to test>

<Links to artifacts>

🐾 Generated with PAW
```

### Git Housekeeping Logic

**Trigger Conditions** (PAW-03A Implementer):
1. User invokes agent to start a new phase
2. Agent reads ImplementationPlan.md to verify previous phase marked "Status: Completed"
3. Agent checks current git branch with `git branch --show-current`

**Automated Steps**:
1. If current branch is a phase branch (matches `*_phase*` pattern):
   - Checkout target branch: `git checkout <target_branch>`
   - Verify checkout: `git branch --show-current`
   - Pull latest changes: `git pull <remote> <target_branch>`
   - Verify no conflicts or errors
2. If current branch is already target branch:
   - Pull latest changes: `git pull <remote> <target_branch>`
3. Create new phase branch: `git checkout -b <target>_phaseN`
4. Verify on new phase branch: `git branch --show-current`

**Error Handling**:
- Merge conflicts during pull → Report conflict details, halt, prompt user to resolve manually
- Network failures during pull → Report error, halt, prompt user to check connectivity
- Permission errors → Report error, halt, prompt user to verify git credentials
- Branch creation failures → Report error with git output, halt

All error messages include specific error text from git commands and clear recovery instructions.

### Issue Reference Parsing

**WorkflowContext.md Issue URL Formats**:
- Full URL: `https://github.com/owner/repo/issues/123` → Extracts `#123`
- "none" → No issue reference included in PRs

**Extraction Logic** (used by agents):
1. Read WorkflowContext.md → parse Issue URL field
2. If Issue URL is "none" → Use "No associated issue" in PR descriptions
3. If Issue URL contains GitHub issue pattern → Extract issue number with regex
4. Construct reference syntax:
   - Intermediate PRs: `Related to <issue_url>`
   - Final PR: `Fixes <issue_url>`

GitHub automatically parses these references and creates bidirectional links in the issue timeline.

### Target Branch Push Logic

**Trigger** (PAW-02B Impl Planner in prs strategy):
1. After committing WorkflowContext.md and ImplementationPlan.md to target branch
2. Before creating Planning PR

**Steps**:
1. Verify on target branch: `git branch --show-current`
2. Push target branch to remote: `git push -u <remote> <target_branch>`
3. Verify push succeeded (check command exit code)
4. Proceed with Planning PR creation

**local strategy**: Target branch push NOT needed (no Planning PR in local strategy).

## Usage Examples

### Example 1: Full Workflow with Issue Linking

**Scenario**: Implementing authentication system from GitHub Issue #42

```
1. Initialize workflow:
   - Issue URL: https://github.com/org/repo/issues/42
   - Work Title: "Auth System"
   - Target Branch: feature/auth-system
   - Review Strategy: prs

2. Planning Stage:
   - PAW-02B creates Planning PR: "[Auth System] Planning: Implementation plan"
   - PR description: "Related to https://github.com/org/repo/issues/42"
   - GitHub links PR to Issue #42 timeline

3. Implementation Phase 1:
   - PAW-03A implements database schema
   - Commit: "[Auth System] Phase 1: feat: add user authentication schema"
   - PAW-03B creates Phase PR: "[Auth System] Phase 1: Database schema"
   - PR description: "Related to #42" + partial implementation notice

4. Implementation Phase 2:
   - User merges Phase 1 PR
   - User invokes PAW-03A for Phase 2
   - Agent automatically: checkout feature/auth-system, pull, create feature/auth-system_phase2
   - PAW-03A implements JWT token validation
   - Commit: "[Auth System] Phase 2: feat: add JWT token validation"
   - PAW-03B creates Phase PR: "[Auth System] Phase 2: Token validation"

5. Documentation:
   - User merges Phase 2 PR
   - PAW-04 creates Docs.md and updates README
   - Commit: "[Auth System] docs: add authentication documentation"
   - PAW-04 creates Docs PR: "[Auth System] Documentation"
   - PR description: "Related to #42"

6. Final PR:
   - User merges Docs PR
   - PAW-05 creates Final PR: "[Auth System] Implement JWT authentication"
   - PR description: "Fixes https://github.com/org/repo/issues/42"
   - User merges Final PR → Issue #42 automatically closes
```

**Result**: Issue #42 timeline shows 4 linked PRs (Planning, Phase 1, Phase 2, Docs) + Final PR. Git history contains structured commits filterable by `--grep="Work-ID: auth-system"`.

### Example 2: Local Strategy Without Issue

**Scenario**: Quick refactoring without GitHub Issue tracking

```
1. Initialize workflow:
   - Issue URL: none
   - Work Title: "Config Refactor"
   - Target Branch: feature/config-refactor
   - Review Strategy: local

2. Implementation (all on feature/config-refactor):
   - PAW-03A implements changes
   - Commit: "[Config Refactor] refactor: consolidate configuration files"
   - PAW-03A commits directly to target branch (no Phase PRs)

3. Documentation (on feature/config-refactor):
   - PAW-04 creates Docs.md and updates README
   - Commit: "[Config Refactor] docs: update configuration guide"
   - PAW-04 commits directly to target branch (no Docs PR)

4. Final PR:
   - PAW-05 creates Final PR: "[Config Refactor] Consolidate configuration files"
   - PR description: "No associated issue"
   - User merges Final PR
```

**Result**: No issue linking (none provided). Git history contains structured commits. No intermediate PRs (local strategy).

## Edge Cases and Limitations

**Issue URL Unavailable**: When WorkflowContext.md contains "none" for Issue URL, PRs note "No associated issue" rather than failing. All other functionality works normally (commit structure, git housekeeping, PR differentiation).

**Phase Count Unknown**: If ImplementationPlan.md doesn't specify total phase count, PR descriptions and commit messages reference phase number without "of N" suffix. Example: "Phase 2" instead of "Phase 2 of 4".

**Multiple Commits in Single Phase**: All commits within a phase use the same phase number in messages. Commit descriptions differentiate specific changes.

**Git Housekeeping Failures**:
- **Merge Conflicts**: Agent reports conflict files, halts, prompts user to resolve manually and retry
- **Network Issues**: Agent reports error, halts, prompts user to check connectivity and retry
- **Permission Errors**: Agent reports error, halts, prompts user to verify git credentials

Git housekeeping errors do NOT auto-retry; user intervention required to ensure conflicts/errors are properly addressed.

**Target Branch Already Exists on Remote**: Push operation uses `git push` which handles existing remote branches naturally (either reports "Everything up-to-date" or pushes new commits). No special handling needed.

**GitHub MCP Tool Restrictions**: Guardrails prohibit using direct-push tools (`mcp_github_push_files`, `mcp_github_create_or_update_file`) for PAW workflow files (`.paw/work/*`, agent files, documentation). Tools remain available for other operations like reading issue content or managing external repositories.

**Long Work Titles**: Work titles exceeding ~40 characters may cause commit message subject lines to exceed 72-character convention. Recommendation: Keep work titles concise (2-4 words, ≤30 characters).

**Manual Commits Mixed with PAW Commits**: Users can create manual commits with any format between PAW-generated commits. Git history filtering (`--grep="🐾 Generated with PAW"`) distinguishes PAW commits from manual commits.

**Branch Naming Conflicts**: Automated git housekeeping assumes standard PAW branch naming (`<target>_phaseN`). Custom branch names may not trigger automation; agent falls back to manual git commands.

**Issue Number Extraction**: Agents parse GitHub issue URLs to extract issue numbers. Non-GitHub issue trackers (Azure DevOps, GitLab, Jira) require manual URL entry in PR descriptions; bidirectional linking won't work.

**Workflow Mode Interactions**: Issue linking and commit structure work identically across all workflow modes (full, minimal, custom). Documentation depth varies by mode, but git/PR practices remain consistent.

## Testing Guide

### How to Test This Work

**Test 1: Issue-to-PR Traceability (prs strategy)**

1. Create a test GitHub Issue in your repository
2. Initialize new PAW workflow:
   ```
   - Provide GitHub Issue URL when prompted
   - Choose prs review strategy
   - Choose full workflow mode
   ```
3. Complete Planning stage → Verify Planning PR created with "Related to #<N>" in description
4. Navigate to GitHub Issue → Verify Planning PR appears in issue timeline
5. Complete Phase 1 implementation and review → Verify Phase PR title includes "Phase 1" and description includes "Related to #<N>"
6. Navigate to GitHub Issue → Verify Phase PR appears in issue timeline
7. Complete documentation → Verify Docs PR includes "Related to #<N>"
8. Navigate to GitHub Issue → Verify Docs PR appears in issue timeline
9. Create Final PR → Verify description includes "Fixes #<N>"
10. Merge Final PR → Verify issue automatically closes

**Expected Behavior**: All four PR types appear in issue timeline with bidirectional links. Final PR merge closes issue without manual intervention.

**Test 2: Structured Commit Messages**

1. Complete Phase 1 of any implementation
2. Run: `git log --grep="Work-ID: <feature-slug>"`
3. Verify commits include:
   - Work title in subject line
   - Phase number in subject line
   - Conventional commit type (feat, fix, docs, etc.)
   - Work-ID footer
   - PAW-Phase footer
   - PAW indicator footer

**Expected Behavior**: All PAW-generated commits follow structured format. Filtering by Work-ID or PAW-Phase returns relevant commits only.

**Test 3: Automated Git Housekeeping**

1. Complete Phase 1 implementation
2. Merge Phase 1 PR to target branch
3. WITHOUT manually running git commands, invoke PAW-03A Implementer for Phase 2
4. Observe agent output for:
   - "Checking current branch state"
   - "Checking out target branch"
   - "Pulling latest changes"
   - "Creating new phase branch"
5. Verify agent proceeds with Phase 2 implementation on correct branch

**Expected Behavior**: Agent automatically transitions from merged phase branch to updated target branch to new phase branch without user intervention.

**Test 4: Target Branch Push (prs strategy)**

1. Create new feature branch that doesn't exist on remote
2. Initialize PAW workflow with prs strategy
3. Observe workflow initialization output
4. Verify target branch pushed to remote
5. Complete planning stage
6. Verify Planning PR created successfully without errors

**Expected Behavior**: Planning PR creation succeeds on first attempt. No manual git push needed before Planning PR.

**Test 5: PR Differentiation**

1. Create Phase PR for any implementation
2. View PR title → Should clearly indicate "Phase N"
3. View PR description → First paragraph should state "Partial Implementation - Phase N of M" or similar
4. Create Final PR for same implementation
5. View PR title → Should use work title without "Phase" indicator
6. View PR description → Should describe complete feature without partial implementation notices

**Expected Behavior**: Reviewers can distinguish phase PRs from final PRs by title alone. Phase PR descriptions explicitly communicate intermediate checkpoint status.

**Test 6: Git Workflow Enforcement**

1. Review agent instruction files:
   - `agents/PAW-02B Impl Planner.agent.md`
   - `agents/PAW-03A Implementer.agent.md`
   - `agents/PAW-03B Impl Reviewer.agent.md`
   - `agents/PAW-04 Documenter.agent.md`
2. Search for references to `mcp_github_push_files` and `mcp_github_create_or_update_file`
3. Verify references are prohibition statements (NEVER use, DO NOT use, etc.)
4. Complete any PAW implementation
5. Review git log for all commits
6. Verify all workflow file changes have proper commit history

**Expected Behavior**: Agent instructions explicitly prohibit direct-push tools. All workflow file changes appear in git log with proper commits.

**Test 7: Error Handling**

1. Complete Phase 1 implementation and merge PR
2. Before invoking Phase 2, manually edit a file on target branch and commit
3. Invoke PAW-03A Implementer for Phase 2 while local target branch is behind remote
4. Observe agent behavior during automated pull
5. Verify agent reports error clearly if conflicts occur

**Expected Behavior**: Agent detects git state issues (conflicts, behind remote) and reports specific error messages. Agent halts execution and prompts user for resolution.

**Test 8: Workflow Without Issue**

1. Initialize workflow with Issue URL = "none"
2. Complete Planning stage → Verify Planning PR description includes "No associated issue" instead of issue reference
3. Complete Phase 1 → Verify Phase PR description includes "No associated issue"
4. Create Final PR → Verify description includes "No associated issue"

**Expected Behavior**: Workflow functions normally without GitHub issue tracking. PRs note absence of issue gracefully.

## Migration and Compatibility

### For Existing PAW Workflows

**No Migration Required**: This implementation is backward compatible with existing PAW workflows. Changes apply only to NEW commits and PRs created after deployment.

**Existing PRs**: PRs created before this implementation remain unchanged. Historical state preserved—no retroactive issue linking or PR description updates.

**Existing Commits**: Commits created before this implementation retain their original messages. Historical git log preserved—no commit message rewriting.

**Workflows in Progress**: Can adopt new practices incrementally:
- Each phase uses new commit format for new commits
- Next PR created includes issue linking
- Automated git housekeeping activates when starting NEW phases

### For New Workflows After Deployment

**Workflow Initialization**: Automatically pushes target branch to remote (prs strategy), preventing Planning PR creation failures.

**All PRs**: Include issue reference syntax appropriate to PR type:
- Planning, Phase, Docs → "Related to #N"
- Final → "Fixes #N"

**All Commits**: Follow structured format with work title, phase number, and PAW footer.

**Phase Transitions**: Automated git housekeeping activates automatically when Implementer starts new phases after merged phase PRs.

### Breaking Changes

**None**: This implementation introduces NO breaking changes. All existing functionality preserved. New features are additive enhancements.

### Compatibility

**Git Versions**: Requires git 2.0+ (standard for git push/pull/checkout). No special git features or recent version requirements.

**GitHub**: Requires GitHub-hosted repositories for issue linking. Works with GitHub Enterprise. Other platforms (GitLab, Azure DevOps) can use "none" for Issue URL and get all non-issue-linking features.

**PAW Workflow Modes**: Compatible with all modes (full, minimal, custom). Issue linking and commit structure work identically across modes.

**PAW Review Strategies**: Fully compatible with both strategies:
- `prs` - All intermediate PRs include issue linking
- `local` - No intermediate PRs, but Final PR includes issue linking; all commits use structured format

## References

- **Original Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/59
- **Specification**: `.paw/work/improve-pr-git-workflow/Spec.md`
- **Research Artifacts**: 
  - `.paw/work/improve-pr-git-workflow/SpecResearch.md`
  - `.paw/work/improve-pr-git-workflow/CodeResearch.md`
- **Implementation Plan**: `.paw/work/improve-pr-git-workflow/ImplementationPlan.md`
- **Related GitHub Issues**:
  - #69 - Workflow Handoffs (infrastructure for stage transitions)
  - #60 - Workflow Status Capability (status agent integration)
  - #108 - Automated Git Workflow Between Phases (integrated into issue #59 item 6)
- **External Documentation**:
  - [GitHub Issue Linking Docs](https://docs.github.com/en/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue)
  - [Conventional Commits](https://www.conventionalcommits.org/)
  - [PAW Documentation](https://github.com/lossyrob/phased-agent-workflow)
