# Feature Specification: Exclude PAW Artifacts

**Branch**: feature/130-exclude-paw-artifacts  |  **Created**: 2026-01-21  |  **Status**: Ready for Planning
**Input Brief**: Option to exclude PAW workflow artifacts from git tracking when contributing to non-PAW repositories

## Overview

Developers benefit from PAW's structured workflow even for changes where committing the artifacts would be counterproductive. Two common scenarios drive this need. First, when contributing to repositories that don't use PAW, external maintainers reviewing pull requests may find workflow artifacts unexpected or unwanted—creating friction in the contribution process. Second, for quick bug fixes or small features, the artifacts themselves may represent disproportionate overhead: a three-line fix doesn't warrant a specification and implementation plan that constitute 90% of the PR's changed files. In both cases, developers want PAW's guidance without the artifact footprint.

This feature introduces artifact tracking control—the ability to choose whether PAW workflow artifacts are committed to git or kept only locally for the developer's reference. At workflow initialization time, developers select whether to track artifacts normally or exclude them via a workflow-specific `.gitignore`. The artifacts remain on the local filesystem for the developer's benefit throughout the workflow, but never appear in commits or pull requests.

The mid-workflow escape hatch proves especially valuable when the scope of a change becomes clear only during implementation. A developer might start with PAW's full workflow expecting a complex change, then discover the fix is simpler than anticipated. Rather than abandoning the workflow or accepting artifact-heavy commits, they can switch to non-tracking mode—keeping their local reference materials while producing a clean, focused PR that's easier to review and accept. This also prevents the `.paw/work/` directory from accumulating entries for every small change, reducing long-term complexity in PAW-enabled repositories.

The implementation uses a simple, discoverable convention: the presence of a `.gitignore` file in the workflow directory (`.paw/work/<work-id>/`) serves as both the mechanism and the indicator for artifact exclusion. Agents check for this file to determine whether to include artifact commits in their operations, and users can inspect it to understand the current tracking state.

## Objectives

- Enable PAW users to produce artifact-free PRs when appropriate (Rationale: supports external contributions and keeps lightweight changes focused)
- Preserve local access to workflow artifacts regardless of git tracking state (Rationale: artifacts remain valuable for developer reference even when excluded from commits)
- Support both upfront decisions and mid-workflow changes in artifact tracking preference (Rationale: change complexity often becomes clear only during implementation)
- Prevent artifact accumulation for small changes in PAW-enabled repositories (Rationale: reduces long-term complexity in `.paw/work/` directory)
- Use filesystem conventions as the source of truth for tracking behavior (Rationale: makes behavior discoverable, debuggable, and portable)

## User Scenarios & Testing

### User Story P1 – Initialize Workflow Without Artifact Tracking
Narrative: A developer starting a PAW workflow for an external contribution decides upfront to exclude artifacts from git.
Independent Test: Complete workflow initialization with "Don't Track" selected and verify `.paw/work/<work-id>/.gitignore` exists.
Acceptance Scenarios:
1. Given I am initializing a new PAW workflow, When I reach the artifact tracking prompt and select "Don't Track", Then a `.gitignore` file is created in the workflow directory containing `*`
2. Given I am initializing a new PAW workflow, When I reach the artifact tracking prompt and select "Track" (or accept the default), Then no `.gitignore` file is created in the workflow directory
3. Given artifact tracking prompt appears, When I view the options, Then "Track" is presented as the default selection

### User Story P2 – Stop Tracking Artifacts Mid-Workflow
Narrative: A developer discovers mid-workflow that artifact tracking is unnecessary—either because the change is simpler than expected, or because external contribution guidelines discourage extra files.
Independent Test: Run "Stop Tracking Artifacts" command on a workflow with committed artifacts and verify artifacts are untracked but not deleted.
Acceptance Scenarios:
1. Given I have an active PAW workflow with committed artifacts, When I run the "PAW: Stop Tracking Artifacts" command, Then artifacts are removed from git index but remain in the filesystem
2. Given I have run "Stop Tracking Artifacts", When I check the workflow directory, Then a `.gitignore` file exists containing `*`
3. Given I have run "Stop Tracking Artifacts", When I run `git status`, Then workflow artifacts no longer appear as tracked or staged
4. Given I complete a workflow after stopping tracking, When I view the final PR diff, Then only code changes appear (no `.paw/` files)

### User Story P3 – Agents Respect Tracking Preference
Narrative: PAW agents automatically adjust their commit behavior based on the tracking preference.
Independent Test: Complete a workflow phase with artifact exclusion enabled and verify no artifact commits are made.
Acceptance Scenarios:
1. Given `.gitignore` exists in the workflow directory, When an agent would normally commit artifacts to `.paw/work/<work-id>/`, Then the agent skips committing those artifacts
2. Given no `.gitignore` exists in the workflow directory, When an agent commits artifacts, Then artifacts are committed normally
3. Given artifact exclusion is enabled, When the initialization prompt runs, Then WorkflowContext.md is written locally but not committed

### Edge Cases
- User attempts "Stop Tracking Artifacts" when no active workflow exists → command displays informative error
- User attempts "Stop Tracking Artifacts" when `.gitignore` already exists → command completes gracefully (idempotent)
- Workflow directory contains `.gitignore` with custom contents → preserve existing entries and append `*` if not present

## Requirements

### Functional Requirements
- FR-001: The workflow initialization sequence includes an artifact tracking prompt after handoff mode selection (Stories: P1)
- FR-002: Selecting "Don't Track" creates `.paw/work/<work-id>/.gitignore` with content `*` (Stories: P1)
- FR-003: The artifact tracking preference is persisted via the presence/absence of the `.gitignore` file (Stories: P1, P3)
- FR-004: A "PAW: Stop Tracking Artifacts" command is available in the command palette (Stories: P2)
- FR-005: The "Stop Tracking Artifacts" command runs `git rm --cached -r` on the workflow directory without deleting files (Stories: P2)
- FR-006: The "Stop Tracking Artifacts" command creates the workflow `.gitignore` if it doesn't exist (Stories: P2)
- FR-007: Four PAW components that commit artifacts check for `.gitignore` presence before committing (Stories: P3)
- FR-008: When `.gitignore` is present, agents skip git add/commit operations for workflow artifacts but continue with code commits (Stories: P3)
- FR-009: The workflow initialization prompt template instructs the agent to skip artifact commits when tracking is disabled (Stories: P1, P3)

### Key Entities
- **Artifact-committing agents**: PAW-02B Impl Planner, PAW-03B Impl Reviewer, PAW-04 Documenter
- **Initialization prompt template**: Commits WorkflowContext.md during workflow setup

### Cross-Cutting / Non-Functional
- The artifact tracking prompt must follow PAW's existing UI patterns (Quick Pick menu with descriptive options)
- The "Stop Tracking Artifacts" command must be discoverable via VS Code command palette search

## Success Criteria
- SC-001: User can complete workflow initialization with "Don't Track" selected and observe `.gitignore` in workflow directory (FR-001, FR-002)
- SC-002: User can run "Stop Tracking Artifacts" and verify artifacts are removed from git index while remaining on filesystem (FR-004, FR-005, FR-006)
- SC-003: Agents completing workflow phases with `.gitignore` present do not create commits containing `.paw/` artifacts (FR-007, FR-008, FR-009)
- SC-004: Existing workflows without `.gitignore` continue to function with normal artifact tracking (FR-003, FR-007)
- SC-005: Code changes are still committed normally even when artifact tracking is disabled (FR-008)

## Assumptions
- The workflow directory (`.paw/work/<work-id>/`) always exists by the time artifact tracking decisions are made
- Creating a `.gitignore` with `*` is sufficient to ignore all files in that directory (standard git behavior)
- Agents have access to filesystem operations to check for `.gitignore` presence
- The `git rm --cached` command is available in the user's environment
- Agents that do not commit artifacts (PAW-01A Specification, PAW-01B Spec Researcher, PAW-02A Code Researcher, PAW-03A Implementer, PAW-05 PR) require no modifications

## Scope

In Scope:
- Artifact tracking prompt in workflow initialization
- "Stop Tracking Artifacts" command
- Agent behavior modification based on tracking preference
- Documentation updates for the new options

Out of Scope:
- "Re-enable Tracking" command (can be added in a future iteration if requested)
- Squashing commits to remove artifact history (new commit that untracks is sufficient)
- Global/workspace-level default for artifact tracking (per-workflow setting only)
- Selective artifact tracking (e.g., track some artifacts but not others)

## Dependencies
- VS Code extension APIs for command registration and Quick Pick menus
- Git CLI availability for untracking operations
- Existing workflow initialization flow that collects user preferences

## Risks & Mitigations
- **Agent instruction drift**: Agents may not consistently check for `.gitignore` if instructions aren't updated carefully. Mitigation: Update all four affected components (PAW-02B, PAW-03B, PAW-04, init prompt) with clear, consistent guidance.
- **Partial implementation**: Some agents commit artifacts while others don't, creating inconsistent behavior. Mitigation: Research identified exactly which agents commit artifacts—implement changes for all four.
- **Code commit confusion**: Users may expect "don't track artifacts" to mean "don't commit anything". Mitigation: Documentation should clarify that code changes are always committed; only workflow artifacts are affected.

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/130
- Research: .paw/work/exclude-paw-artifacts/SpecResearch.md
- External: None

## Glossary
- **Artifact tracking**: Whether PAW workflow files in `.paw/work/<work-id>/` are included in git commits
- **Workflow directory**: The `.paw/work/<work-id>/` directory containing all artifacts for a specific PAW workflow
