# Feature Specification: Improve PR and Git Workflow Practices

**Branch**: feature/59-improve-pr-git-workflow  |  **Created**: 2025-12-10  |  **Status**: Draft
**Input Brief**: Enhance PR creation, commit messages, and git workflow automation across PAW agents for better traceability and user experience

## Overview

When developers use PAW to implement features, the workflow generates multiple artifacts—planning PRs, phase PRs, documentation PRs, and a final PR—that shepherd the work from initial specification through to completion. Currently, these artifacts lack cohesive connections to the originating issue, making it difficult to track progress from a single entry point. A maintainer viewing an issue cannot easily see which PRs are associated with that work, or understand whether a given PR represents partial progress or the final deliverable.

The improved workflow transforms this experience by establishing clear traceability from issue to PRs and back. Every PR created during the PAW process—whether planning, phase-specific, documentation, or final—will reference the original issue with appropriate linking syntax. Phase PRs will explicitly communicate their partial nature through titles and descriptions that indicate "Phase N of M" context and clarify these are intermediate checkpoints, not final review targets. The final PR will use GitHub's auto-close syntax (`Fixes #N`) to automatically close the originating issue upon merge, completing the lifecycle loop.

Beyond PR improvements, the workflow addresses friction points that currently require manual intervention. Commit messages will include structured context—work title, phase number, and PAW indicators—making git history more navigable and meaningful. Git housekeeping between phases becomes automated: the Implementer agent detects when a phase PR has merged and automatically transitions the working state (checkout target branch, pull changes) without requiring manual commands. The Implementation Planner will push the target branch before creating the Planning PR to prevent initialization failures. Finally, explicit guardrails prevent agents from using direct file-push MCP tools, ensuring all changes flow through proper git commands that preserve history and enable version control workflows.

This cohesive set of improvements delivers a seamless, traceable PAW experience where users can focus on implementation while automation handles the git mechanics, and stakeholders gain visibility into work progress through properly linked artifacts.

## Objectives

- Establish bidirectional traceability between issues and all PAW-generated PRs (Planning, Phase, Docs, Final)
- Differentiate partial-implementation PRs from final PRs to set appropriate reviewer expectations
- Ensure all file changes use git commands rather than direct push tools to maintain proper version control
- Enrich commit messages with work context (title, phase, PAW indicator) for improved git history navigation
- Enable automatic issue closure through proper GitHub syntax in final PRs (Rationale: completes the issue lifecycle without manual intervention)
- Automate git state transitions between phases to eliminate manual checkout/pull operations (Rationale: reduces friction and potential for user error during phase handoffs)
- Prevent Planning PR creation failures by ensuring target branch exists on remote before PR creation

## User Scenarios & Testing

### User Story P1 – Issue-to-PR Traceability

**Narrative**: As a project maintainer reviewing an issue, I need to see all associated PRs (Planning, Phase, Docs, Final) linked from the issue timeline so I can track implementation progress without searching manually.

**Independent Test**: View an issue in the GitHub UI and verify all PAW-generated PRs appear in the issue's timeline/references section.

**Acceptance Scenarios**:
1. Given a Planning PR is created, When the PR is opened, Then the PR description includes "Related to #N" with the original issue number
2. Given a Phase PR is created for Phase 1, When the PR is opened, Then the PR description includes "Related to #N" with the original issue number
3. Given a Documentation PR is created, When the PR is opened, Then the PR description includes "Related to #N" with the original issue number
4. Given the Final PR is created, When the PR is opened, Then the PR description includes "Fixes #N" with the original issue number
5. Given all PRs include issue references, When viewing the issue in GitHub, Then all PRs appear in the issue's linked PR section

### User Story P1 – Partial vs Final PR Differentiation

**Narrative**: As a reviewer receiving PR notifications, I need phase PRs to clearly indicate they are partial implementations not ready for final review so I can prioritize my review workload appropriately.

**Independent Test**: Read the title and first paragraph of a Phase PR and immediately understand it's an intermediate checkpoint.

**Acceptance Scenarios**:
1. Given a Phase PR is created, When viewing the PR title, Then it includes "Phase N" indicator (e.g., "[Auth System] Phase 1: Database schema")
2. Given a Phase PR is created, When viewing the PR description, Then the first section clearly states this is part of a phased implementation approach
3. Given a Phase PR is created, When viewing the PR description, Then it indicates which phase number this represents and total phase count if available
4. Given a Planning PR is created, When viewing the PR title, Then it includes "Planning:" prefix
5. Given the Final PR is created, When viewing the PR title, Then it uses the work title format without "Phase" or "Planning" indicators

### User Story P1 – Git Command Enforcement

**Narrative**: As a PAW workflow designer, I need agents to use git commands exclusively for file changes so version control history remains accurate and all changes are reviewable through standard git workflows.

**Independent Test**: Review agent instructions and verify no GitHub MCP direct-push tools are referenced for workflow file operations.

**Acceptance Scenarios**:
1. Given an agent needs to commit changes, When the agent executes the operation, Then it uses `git add` and `git commit` commands
2. Given an agent needs to push changes, When the agent executes the operation, Then it uses `git push` command
3. Given an agent has access to `mcp_github_push_files`, When the agent is operating on PAW workflow files, Then the agent instructions explicitly prohibit using this tool
4. Given an agent has access to `mcp_github_create_or_update_file`, When the agent is operating on PAW workflow files, Then the agent instructions explicitly prohibit using this tool
5. Given an agent encounters a file operation requirement, When determining the approach, Then git commands are the documented first choice

### User Story P2 – Structured Commit Messages

**Narrative**: As a developer reviewing git history, I need commit messages to include work title and phase context so I can understand the purpose and scope of changes without reading full diffs.

**Independent Test**: Run `git log` on a PAW feature branch and verify each commit message contains work title and phase number.

**Acceptance Scenarios**:
1. Given the Implementer creates a commit in Phase 2, When viewing the commit message, Then it includes the work title from WorkflowContext.md
2. Given the Implementer creates a commit in Phase 2, When viewing the commit message, Then it includes "Phase 2" indicator
3. Given the Implementer creates a commit, When viewing the commit message, Then it includes a PAW workflow indicator (e.g., footer or prefix)
4. Given the Implementation Review Agent creates a commit for documentation, When viewing the commit message, Then it follows the same structured format with work title and context
5. Given multiple commits are made across phases, When viewing `git log`, Then the structured format makes it easy to filter commits by work title or phase number

### User Story P2 – Automated Phase Transitions

**Narrative**: As a developer completing a phase PR merge, I want the Implementer to automatically transition my git state (checkout target, pull changes) when starting the next phase so I don't need to remember manual housekeeping steps.

**Independent Test**: Merge a Phase 1 PR, run the implement prompt for Phase 2, and verify the agent automatically handles git state without user intervention.

**Acceptance Scenarios**:
1. Given a Phase 1 PR has been merged, When the user invokes the Implementer for Phase 2, Then the agent detects the current branch state
2. Given the agent detects it's on a phase branch that was merged, When preparing for the next phase, Then it automatically checks out the target branch
3. Given the agent has checked out the target branch, When preparing for the next phase, Then it automatically pulls the latest changes from remote
4. Given the agent completes git housekeeping, When starting the new phase, Then it creates the new phase branch from the updated target branch
5. Given git housekeeping encounters an error (e.g., conflicts, network failure), When the operation fails, Then the agent reports the issue clearly and prompts for user intervention

### User Story P3 – Target Branch Initialization

**Narrative**: As a developer starting a new PAW workflow in prs strategy, I need the Implementation Planner to ensure the target branch exists on remote before creating the Planning PR so the PR creation succeeds on first attempt.

**Independent Test**: Initialize a new PAW workflow with prs strategy and verify the Planning PR is created successfully without manual git operations.

**Acceptance Scenarios**:
1. Given Implementation Planner is in prs strategy, When preparing to create Planning PR, Then it checks if the target branch exists on remote
2. Given the target branch does not exist on remote, When the agent detects this, Then it pushes the target branch before proceeding
3. Given the target branch exists on remote, When the agent proceeds with Planning PR creation, Then the PR is created successfully without errors
4. Given Implementation Planner is in local strategy, When committing planning artifacts, Then target branch push behavior remains unchanged (existing behavior)

### Edge Cases

- **Issue URL unavailable**: If WorkflowContext.md contains "none" for Issue URL, PRs should note "No associated issue" rather than failing or producing malformed references
- **Phase count unknown**: If ImplementationPlan.md doesn't specify total phase count, commit messages and PR descriptions should reference phase number without "of N" suffix
- **Multiple commits in single phase**: All commits within a phase should use consistent work title and phase number in messages
- **Git housekeeping failure**: Network issues, merge conflicts, or permission errors during automated checkout/pull should halt execution and report specific error details to user
- **Target branch already exists on remote**: Push operation should detect remote branch exists and skip push (or use `git push` which handles this naturally)
- **GitHub MCP tool restrictions**: Guardrail should apply only to PAW workflow files (`.paw/work/*`, agent files, documentation); tools may still be used for non-workflow operations (e.g., reading issue content)

## Requirements

### Functional Requirements

- FR-001: All Planning PRs must include "Related to #N" reference in PR description linking to original issue (Stories: P1)
- FR-002: All Phase PRs must include "Related to #N" reference in PR description linking to original issue (Stories: P1)
- FR-003: All Documentation PRs must include "Related to #N" reference in PR description linking to original issue (Stories: P1)
- FR-004: Final PRs must include "Fixes #N" reference in PR description to auto-close issue on merge (Stories: P1)
- FR-005: Phase PR titles must include "Phase N" indicator clearly distinguishing them from final PRs (Stories: P1)
- FR-006: Phase PR descriptions must include opening statement explaining partial implementation context (Stories: P1)
- FR-007: Planning PR titles must include "Planning:" prefix to indicate planning stage (Stories: P1)
- FR-008: All PAW agents must use git commands (`git add`, `git commit`, `git push`) for workflow file changes (Stories: P1)
- FR-009: Agent instructions must explicitly prohibit use of `mcp_github_push_files` for PAW workflow operations (Stories: P1)
- FR-010: Agent instructions must explicitly prohibit use of `mcp_github_create_or_update_file` for PAW workflow operations (Stories: P1)
- FR-011: Implementer commit messages must include work title from WorkflowContext.md (Stories: P2)
- FR-012: Implementer commit messages must include phase number indicator (Stories: P2)
- FR-013: Implementer commit messages must include PAW workflow indicator (Stories: P2)
- FR-014: Implementation Review Agent commit messages must follow same structured format as Implementer (Stories: P2)
- FR-015: Implementation Planner commit messages must follow same structured format when committing planning artifacts (Stories: P2)
- FR-016: Implementer must detect current git branch state when starting new phase (Stories: P2)
- FR-017: Implementer must automatically checkout target branch when current branch is merged phase branch (Stories: P2)
- FR-018: Implementer must automatically pull latest changes after checking out target branch (Stories: P2)
- FR-019: Implementer must report git housekeeping errors clearly and halt execution for user intervention (Stories: P2)
- FR-020: Implementation Planner in prs strategy must push target branch to remote before creating Planning PR (Stories: P3)
- FR-021: Implementation Planner must verify target branch exists on remote before Planning PR creation (Stories: P3)

### Key Entities

- **PR Types**: Planning PR, Phase PR, Documentation PR, Final PR (four distinct PR categories with different linking requirements)
- **Commit Message Structure**: Work title + Phase number + PAW indicator + Conventional commit type/scope + Description
- **Git State**: Current branch, sync status with remote, phase completion status (tracked to enable automated transitions)
- **Issue Reference Syntax**: "Related to #N" (Planning, Phase, Docs PRs) vs "Fixes #N" (Final PR only)

### Cross-Cutting / Non-Functional

- **Consistency**: Commit message format must be consistent across all three committing agents (Implementer, Reviewer, Planner)
- **Traceability**: Every PR created by PAW must be traceable back to the originating issue through GitHub's issue timeline
- **Error Transparency**: Git operation failures must provide specific error messages (not generic "git failed" messages)
- **Tool Usage Policy**: Guardrails apply only to PAW workflow files; GitHub MCP tools remain available for other purposes (reading issues, external repos)

## Success Criteria

- SC-001: 100% of PAW-generated PRs include issue reference syntax in PR description (FR-001, FR-002, FR-003, FR-004)
- SC-002: Final PR merges automatically close originating issue without manual intervention (FR-004)
- SC-003: Reviewers can identify phase PRs as partial implementations from title alone (FR-005, FR-007)
- SC-004: Git history shows structured commit messages with work title and phase context for all PAW commits (FR-011, FR-012, FR-013, FR-014, FR-015)
- SC-005: Developers starting new phases after phase PR merge experience zero manual git commands for state transition (FR-016, FR-017, FR-018)
- SC-006: Planning PR creation succeeds on first attempt without manual target branch push (FR-020, FR-021)
- SC-007: Agent instructions contain explicit prohibitions against using direct-push MCP tools for workflow files (FR-009, FR-010)
- SC-008: All workflow file changes appear in git log with proper commit history (FR-008)

## Assumptions

- **GitHub Platform**: Assumes GitHub-hosted repositories; issue linking syntax follows GitHub conventions (`Fixes #N`, `Related to #N`)
- **Issue Availability**: Assumes most PAW workflows start from an issue; when Issue URL is "none", PRs gracefully handle absence without errors
- **Conventional Commits**: Assumes commit message format can include conventional commit prefixes (feat, fix, docs, refactor) as optional enhancement to base structure
- **Git CLI Access**: Assumes agents have access to git command-line interface through terminal execution
- **Remote Connectivity**: Assumes network access for git push/pull operations; failures are exceptional cases requiring user intervention
- **Branch Naming**: Assumes existing branch naming conventions (`<target>_plan`, `<target>_phaseN`) remain unchanged
- **Merge Detection**: Assumes merged phase branches can be detected through git status and branch existence checks (reasonable default; alternative is explicit user signal)
- **Commit Message Length**: Assumes work titles are concise enough (≤50 chars) to fit in commit message subject lines with phase indicator; longer titles may wrap

## Scope

**In Scope**:
- PR description templates for all four PR types (Planning, Phase, Docs, Final)
- Commit message format guidance for all three committing agents
- Git housekeeping automation in Implementer for phase transitions
- Target branch push logic in Implementation Planner (prs strategy)
- Explicit guardrails against direct-push MCP tools for workflow files
- Agent instruction updates to implement requirements

**Out of Scope**:
- Changes to branch naming conventions
- Changes to WorkflowContext.md structure or fields
- Git commit squashing or rewriting of existing history
- Changes to PR merge strategies (squash vs merge commit)
- Integration with non-GitHub platforms (Azure DevOps, GitLab)
- Automated PR approval or merge logic
- Validation of PR description content beyond issue linking
- Enforcement of git workflow through technical constraints (e.g., GitHub branch protection rules)
- Centralized PR template files (formatting remains in agent instructions per current architecture)
- Retry logic for transient git operation failures (network timeouts, temporary unavailability)

## Dependencies

- GitHub MCP tools: `mcp_github_issue_read` (for reading issue details when populating PR descriptions)
- Git CLI commands: `git checkout`, `git pull`, `git push`, `git add`, `git commit`, `git branch`, `git status`
- WorkflowContext.md: Work Title, Work ID, Issue URL, Target Branch, Remote fields
- ImplementationPlan.md: Phase structure and phase completion status
- Existing agent files: PAW-02B Impl Planner, PAW-03A Implementer, PAW-03B Impl Reviewer, PAW-04 Documenter, PAW-05 PR Agent

## Risks & Mitigations

- **Risk**: Automated git housekeeping could checkout target branch when user has uncommitted work on phase branch, losing changes
  - **Impact**: High (data loss)
  - **Mitigation**: Implementer must check `git status` before automated checkout; halt and warn user if uncommitted changes detected

- **Risk**: Network failures during automated pull could leave repository in inconsistent state
  - **Impact**: Medium (requires manual recovery)
  - **Mitigation**: Wrap pull operations in error handling; report specific failure and current state; provide recovery instructions

- **Risk**: Multiple agents committing with same structured format could create verbose git history if format is too lengthy
  - **Impact**: Low (cosmetic)
  - **Mitigation**: Keep commit message format concise; use footer metadata rather than long subject lines

- **Risk**: Issue linking syntax variations across platforms (GitHub vs Azure DevOps) could create broken references
  - **Impact**: Low (links fail but PRs still functional)
  - **Mitigation**: Document assumption of GitHub platform; leave Azure DevOps enhancements for future iteration

- **Risk**: Guardrails against direct-push tools might be circumvented if agent reasoning determines it's necessary
  - **Impact**: Medium (bypasses version control for workflow files)
  - **Mitigation**: Make guardrail explicit and emphatic in agent instructions; include rationale (preserves git history)

- **Risk**: Phase count may be unavailable when creating commit messages if ImplementationPlan.md structure doesn't include total count
  - **Impact**: Low (commit messages slightly less informative)
  - **Mitigation**: Format commit message to gracefully handle missing total count (use "Phase N" instead of "Phase N of M")

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/59
- Research: .paw/work/improve-pr-git-workflow/SpecResearch.md
- Related Issues:
  - #69 (Workflow Handoffs) - Infrastructure for stage transitions
  - #60 (Workflow Status Capability) - Status agent integration
  - #108 (Automated Git Workflow Between Phases) - Integrated into issue #59 item 6

## Glossary

- **Planning PR**: Pull request created by Implementation Planner containing planning artifacts (Spec.md, ImplementationPlan.md, research files)
- **Phase PR**: Pull request created by Implementation Review Agent containing code and test changes for a specific implementation phase
- **Documentation PR**: Pull request created by Documenter containing Docs.md and related documentation updates
- **Final PR**: Pull request created by Final PR Agent merging complete implementation from target branch to main branch
- **PAW workflow files**: Files within `.paw/work/<feature-slug>/` directory and agent files (`.agent.md`)
- **Direct-push MCP tools**: GitHub MCP tools that create commits remotely without local git operations (e.g., `mcp_github_push_files`, `mcp_github_create_or_update_file`)
- **Git housekeeping**: Routine git operations (checkout, pull, status check) required to transition between phases
- **Issue linking syntax**: GitHub-recognized keywords (`Fixes`, `Closes`, `Resolves`) or reference format (`Related to #N`) in PR descriptions that create bidirectional links
