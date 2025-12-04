# Feature Specification: Workflow Init Improvements

**Branch**: fix/new-paw-workflow-improvements  |  **Created**: 2025-12-03  |  **Status**: Draft
**Input Brief**: Improve PAW workflow initialization with auto-derived branch names and freeform work descriptions

## Overview

When developers start a new PAW workflow, they currently face an unintuitive experience that prioritizes technical details over workflow context. The command asks for a branch name first—before the user has even specified what they're working on. This forces developers to context-switch between "what am I building" and "what should I name this branch" at the very moment they're trying to get started quickly.

The improved workflow initialization reverses this logic. Users first provide the context that matters: an issue URL if they have one, or a description of what they want to build if they don't. The branch name then becomes optional—it can be automatically derived from the issue title or work description. A user linking to GitHub issue #42 titled "Add user authentication" would see the system propose `feature/42-add-user-authentication` without typing a single character of branch name.

For developers without a tracked issue, the workflow now captures their intent directly. Instead of requiring an issue URL, the system prompts them to describe their work in natural language. This description becomes stored as the "Initial Prompt" in the workflow context, providing all downstream PAW agents with crucial context about what the user intends to build. The branch name is then derived from this description, transforming "Add rate limiting to the API endpoints to prevent abuse" into something like `feature/api-rate-limiting`.

This improvement reduces friction for quick-start workflows while ensuring that every PAW workflow—whether linked to an issue or not—begins with clear, documented user intent that agents can leverage throughout the development process.

## Objectives

- Enable branch name auto-derivation from issue titles or work descriptions (Rationale: eliminates manual naming when context already provides meaningful names)
- Capture user intent through freeform work descriptions when no issue is linked (Rationale: ensures agents have context even for ad-hoc work)
- Reorder inputs to collect context before technical details (Rationale: aligns with natural developer thought process)
- Check remote branches for naming conventions and conflicts (Rationale: produces branch names that fit project standards)
- Preserve backwards compatibility for explicit value entry (Rationale: power users retain full control)

## User Scenarios & Testing

### User Story P1 – Reorder Input Collection
Narrative: A developer initiating a PAW workflow provides the issue URL first, allowing the system to use that context for subsequent auto-derivation.
Independent Test: Start workflow initialization and verify issue URL prompt appears before branch name prompt.
Acceptance Scenarios:
1. Given a user runs "PAW: New PAW Workflow", When the first input prompt appears, Then it asks for issue/work item URL (not branch name)
2. Given a user provides an issue URL, When the next prompt appears, Then it asks for branch name with option to skip

### User Story P1 – Auto-Derive Branch from Issue
Narrative: A developer with a GitHub issue skips the branch name input and receives an automatically derived branch name based on the issue title.
Independent Test: Provide issue URL, skip branch name, verify derived branch matches issue title.
Acceptance Scenarios:
1. Given user provides issue URL "https://github.com/owner/repo/issues/42" for an issue titled "Add User Authentication", When user presses Enter to skip branch name, Then system derives branch as "feature/42-add-user-authentication"
2. Given user provides Azure DevOps work item URL, When user skips branch name, Then system derives branch from work item title with appropriate prefix

### User Story P1 – Freeform Work Description
Narrative: A developer without a tracked issue skips the issue URL and is prompted to describe their work, which is stored for agent context.
Independent Test: Skip issue URL, provide description, verify it appears in WorkflowContext.md.
Acceptance Scenarios:
1. Given user presses Enter to skip issue URL, When prompted "What would you like to work on?", Then user can type a freeform description
2. Given user provides description "Add rate limiting to API endpoints", When workflow initialization completes, Then WorkflowContext.md contains "Initial Prompt: Add rate limiting to API endpoints"
3. Given user provided a freeform description, When downstream agents invoke paw_get_context, Then they receive the Initial Prompt field in their context

### User Story P2 – Auto-Derive Branch from Description
Narrative: A developer who provided a freeform description but skipped branch name receives a branch derived from their description.
Independent Test: Skip issue URL, provide description, skip branch name, verify derived branch.
Acceptance Scenarios:
1. Given user skipped issue URL and provided description "Add rate limiting to API endpoints", When user skips branch name, Then system derives branch as "feature/api-rate-limiting" or similar
2. Given the description contains many words, When branch is derived, Then it is reasonably shortened while remaining meaningful

### User Story P2 – Check Remote Branch Conventions
Narrative: A developer auto-deriving a branch name has the system check remote branches to avoid conflicts and match project conventions.
Independent Test: Derive branch name in repo with existing branches, verify no conflicts and prefix matches common patterns.
Acceptance Scenarios:
1. Given remote has branches like "feature/xyz", "bugfix/abc", When auto-deriving branch, Then system uses matching prefix convention
2. Given derived branch name already exists on remote, When auto-derivation occurs, Then system appends suffix (-2, -3) to avoid conflict

### Edge Cases
- User cancels during freeform description prompt → workflow initialization cancelled, no partial state
- Issue fetch fails (network error) → fall back to branch-based derivation, warn user
- Freeform description is extremely short (e.g., "fix bug") → accept but derive simple branch name
- Remote branch check fails → proceed with standard prefix, log warning
- User explicitly provides branch name → no auto-derivation occurs, use provided value

## Requirements

### Functional Requirements
- FR-001: Reorder input prompts to collect issue URL before branch name (Stories: P1-Reorder)
- FR-002: Allow branch name input to be skipped by pressing Enter (Stories: P1-AutoDeriveIssue, P2-AutoDeriveDescription)
- FR-003: When issue URL provided and branch skipped, derive branch name from issue title with issue number prefix (Stories: P1-AutoDeriveIssue)
- FR-004: When issue URL skipped, prompt user for freeform work description in chat (Stories: P1-Freeform)
- FR-005: Store freeform description as "Initial Prompt" field in WorkflowContext.md (Stories: P1-Freeform)
- FR-006: When description provided and branch skipped, derive branch name from description (Stories: P2-AutoDeriveDescription)
- FR-007: Check remote branches to detect naming conventions and conflicts before finalizing branch name (Stories: P2-RemoteCheck)
- FR-008: Continue to accept explicitly provided values for all inputs without auto-derivation (Stories: all)

### Key Entities
- WorkflowContext.md: Enhanced with optional "Initial Prompt" field for freeform descriptions
- Branch Name: Can be explicitly provided or auto-derived from issue/description

### Cross-Cutting / Non-Functional
- Performance: Issue title fetch should timeout after reasonable period (5s) to avoid blocking
- Error Handling: Network failures should produce graceful fallbacks, not workflow failures

## Success Criteria
- SC-001: Issue URL prompt appears as first input when starting workflow initialization (FR-001)
- SC-002: Pressing Enter on branch name prompt without input triggers auto-derivation (FR-002, FR-003, FR-006)
- SC-003: Derived branch names include issue number when available (e.g., "42-add-auth") (FR-003)
- SC-004: When no issue URL provided, user is prompted for work description in chat panel (FR-004)
- SC-005: WorkflowContext.md contains "Initial Prompt:" field when description was provided (FR-005)
- SC-006: paw_get_context tool returns Initial Prompt field to agents (FR-005)
- SC-007: Derived branch names avoid conflicts with existing remote branches (FR-007)
- SC-008: Explicitly provided branch names are used without modification (FR-008)

## Assumptions
- Default branch prefix is "feature/" when no convention can be detected from remote branches (common industry pattern)
- Issue number appears at start of derived branch slug (e.g., "feature/42-add-auth") for chronological sorting
- Freeform description prompt appears in chat panel using VS Code's chat API capabilities
- Work Title can be derived from freeform description using similar logic to branch derivation
- Agents should treat Initial Prompt as descriptive context, not direct instructions to execute

## Scope

In Scope:
- Reordering of input prompts during workflow initialization
- Branch name auto-derivation from issue titles
- Freeform work description collection and storage
- Branch name auto-derivation from descriptions
- Remote branch checking for conventions and conflicts
- WorkflowContext.md schema enhancement for Initial Prompt
- paw_get_context tool enhancement to return Initial Prompt

Out of Scope:
- Changes to how agents interpret or act on Initial Prompt (agent behavior)
- Support for issue trackers beyond GitHub and Azure DevOps
- Branch name validation rules changes (existing validation preserved)
- Changes to workflow modes or review strategies
- Automatic issue creation from freeform descriptions

## Dependencies
- GitHub MCP tools for fetching issue titles from GitHub URLs
- Azure DevOps MCP tools for fetching work item titles (if available)
- VS Code chat API for prompting in chat panel
- Git remote access for branch listing

## Risks & Mitigations
- Issue title fetch may fail due to network or permissions: Mitigation - fall back to branch-based derivation with clear user feedback
- Chat API may not support mid-flow prompting: Mitigation - fall back to VS Code input box if chat prompting unavailable
- Remote branch check may be slow on large repos: Mitigation - implement timeout and proceed with standard conventions
- Derived branch names may be awkward for some descriptions: Mitigation - users can always provide explicit branch names

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/121
- Research: .paw/work/workflow-init-improvements-2/SpecResearch.md
- External: None

## Glossary
- Initial Prompt: The freeform work description provided by users when no issue URL is linked, stored in WorkflowContext.md
- Auto-derivation: The process of generating a branch name from issue title or work description without user input
