# Feature Specification: VS Code Extension - PAW Work Item Initializer

**Branch**: feature/vscode-extension-init  |  **Created**: 2025-10-27  |  **Status**: Draft
**Input Brief**: VS Code extension command that initializes PAW work item directory structure, eliminating manual setup time and ensuring consistency

## User Scenarios & Testing

### User Story P1 – Quick Work Item Setup
**Narrative**: As a developer starting new PAW work, I need to create the complete directory structure, scaffold files, and set up git branches in under a minute, so I can focus on actual development instead of manual setup tasks.

**Independent Test**: Run the "PAW: Initialize Work Item" command, provide target branch and optional GitHub issue URL, verify complete `.paw/work/<slug>/` structure exists with all prompt templates and WorkflowContext.md populated.

**Acceptance Scenarios**:
1. **Given** a VS Code workspace with a git repository and no existing `.paw/work/<slug>/` directory, **When** user invokes "PAW: Initialize Work Item" command and provides target branch name "feature/auth-system", **Then** the system creates `.paw/work/auth-system/` with `WorkflowContext.md` and `prompts/` subdirectory containing all 9 prompt template files.

2. **Given** the user provides a GitHub issue URL during initialization, **When** the initialization completes, **Then** `WorkflowContext.md` contains the GitHub issue URL and the Work Title is derived from the issue title.

3. **Given** successful directory structure creation, **When** initialization completes, **Then** the target branch is created (if it doesn't exist), checked out, and `WorkflowContext.md` is opened in the editor.

### User Story P2 – Intelligent Normalization and Conflict Resolution
**Narrative**: As a developer, I want to provide branch names or issue titles in any reasonable format and have the system automatically generate valid, conflict-free feature slugs, so I don't have to manually format identifiers or worry about collisions.

**Independent Test**: Provide a non-normalized branch name (e.g., "Feature/User Auth System!") and verify a valid feature slug is generated, conflicts are detected if directory exists, and resolution options are presented.

**Acceptance Scenarios**:
1. **Given** user provides target branch "feature/My-Complex_Branch Name!", **When** initialization completes, **Then** a valid feature slug is generated following PAW normalization rules (lowercase, hyphens only, 1-100 chars).

2. **Given** a feature slug that conflicts with an existing directory in `.paw/work/`, **When** the conflict is detected, **Then** user is prompted to choose an alternative slug with auto-generated suggestions.

3. **Given** the workspace has uncommitted changes, **When** git operations are about to occur, **Then** user is warned and must confirm or cancel before branch creation proceeds.

### User Story P3 – Extension Output Transparency
**Narrative**: As a developer, I want to see detailed logging of what the extension and agent are doing during initialization, so I can understand the process, troubleshoot issues, and verify operations completed successfully.

**Independent Test**: Run initialization and verify the PAW Workflow output channel shows parameter collection, agent invocation, and completion status messages.

**Acceptance Scenarios**:
1. **Given** the command is invoked, **When** each major step occurs (parameter collection, agent invocation, completion), **Then** a timestamped log entry appears in the "PAW Workflow" output channel.

2. **Given** an error occurs during initialization (e.g., git repository not found), **When** the error is encountered, **Then** a clear error message is logged to the output channel and shown to the user.

### Edge Cases
- **No git repository**: User invokes command in a workspace without a git repository → agent detects this and displays error message instructing user to initialize git first.
- **Existing directory conflict**: `.paw/work/<slug>/` already exists → agent prompts user to choose alternative slug or cancel.
- **Uncommitted changes**: Workspace has uncommitted git changes → agent warns user before branch creation and requires confirmation.
- **Invalid branch name**: User provides branch name with disallowed characters → agent sanitizes or prompts for correction.
- **GitHub API failure**: Optional issue title fetch fails → agent proceeds using target branch name for Work Title generation and logs warning.
- **Malformed GitHub issue URL**: User provides invalid issue URL → agent validates format and prompts for correction or allows user to skip.

## Requirements

### Functional Requirements

**Extension Responsibilities (Orchestration):**

- **FR-001**: System shall provide a "PAW: Initialize Work Item" command accessible via Command Palette (Stories: P1)

- **FR-002**: System shall collect target branch name from user via input box with validation for non-empty input (Stories: P1)

- **FR-003**: System shall collect optional GitHub issue URL from user via input box (Stories: P1, P2)

- **FR-004**: System shall optionally fetch GitHub issue title via API when issue URL is provided to suggest Work Title (Stories: P1)

- **FR-005**: System shall construct a comprehensive prompt containing all collected parameters, workspace context, and PAW specification rules for agent execution (Stories: P1, P2)

- **FR-006**: System shall invoke GitHub Copilot agent mode with the constructed prompt to perform initialization tasks (Stories: P1, P2)

- **FR-007**: System shall log all operations to "PAW Workflow" output channel for transparency (Stories: P3)

- **FR-008**: System shall display clear error messages when operations fail, with recovery guidance (Stories: P3)

**Agent Responsibilities (via Prompt Delegation):**

- **FR-009**: System shall normalize feature slugs according to PAW rules: lowercase, replace spaces/special chars with hyphens, remove invalid chars, collapse consecutive hyphens, trim leading/trailing hyphens, truncate to 100 chars (Stories: P2)

- **FR-010**: System shall validate feature slugs meet requirements: lowercase letters/numbers/hyphens only, 1-100 chars, no leading/trailing/consecutive hyphens, not reserved names (Stories: P2)

- **FR-011**: System shall detect existing `.paw/work/<slug>/` directories and prompt user for conflict resolution when found (Stories: P2)

- **FR-012**: System shall validate workspace is a git repository before attempting git operations (Stories: P1, P2)

- **FR-013**: System shall detect uncommitted changes and warn user before branch operations (Stories: P2)

- **FR-014**: System shall create `.paw/work/<slug>/` directory structure when it doesn't exist (Stories: P1)

- **FR-015**: System shall create `.paw/work/<slug>/prompts/` subdirectory (Stories: P1)

- **FR-016**: System shall generate `WorkflowContext.md` with all required parameters: Work Title, Feature Slug, Target Branch, GitHub Issue (if provided), Remote (default: origin), Artifact Paths (auto-derived), Additional Inputs (default: none) (Stories: P1)

- **FR-017**: System shall generate all 9 prompt template files in `prompts/` subdirectory with correct frontmatter and PAW-compliant structure (Stories: P1)

- **FR-018**: System shall create target branch if it doesn't exist (Stories: P1)

- **FR-019**: System shall checkout target branch after creation or verification (Stories: P1)

- **FR-020**: System shall open `WorkflowContext.md` in the editor after successful initialization (Stories: P1)

### Key Entities

- **Work Item**: A discrete unit of PAW work (feature, bugfix, enhancement) tracked through workflow stages
- **Feature Slug**: Normalized filesystem-safe identifier for work item (e.g., "auth-system", "api-refactor-v2")
- **Work Title**: Human-readable 2-4 word name for work item used in PR titles (e.g., "Auth System", "API Refactor")
- **Prompt Template**: Pre-structured markdown file with frontmatter for PAW agent invocation

### Cross-Cutting / Non-Functional

- **Agent-Driven Architecture**: Extension acts as orchestrator, gathering inputs and delegating complex logic (validation, normalization, conflict resolution, file generation, git operations) to GitHub Copilot agent mode via well-crafted prompts (FR-005, FR-006)
- **Transparency**: All operations logged to output channel for user visibility and debugging (FR-007, FR-008)
- **Input Validation**: User inputs validated for basic format before agent invocation (FR-002, FR-003)
- **Error Handling**: Clear, actionable error messages for all failure conditions (FR-008)
- **Minimal Extension Code**: Extension code remains simple by delegating complex behavior to agent (FR-005, FR-006)

## Success Criteria

- **SC-001**: Command "PAW: Initialize Work Item" appears in Command Palette and is invokable (FR-001)

- **SC-002**: User can complete work item initialization from command invocation to opened WorkflowContext.md in under 60 seconds with zero manual file operations (FR-001, FR-002, FR-003, FR-014, FR-015, FR-016, FR-017, FR-020)

- **SC-003**: All 9 prompt template files exist in `.paw/work/<slug>/prompts/` with valid frontmatter matching PAW specification (FR-017)

- **SC-004**: Feature slugs are normalized correctly for all reasonable branch name and issue title inputs following PAW rules (FR-009, FR-010)

- **SC-005**: Git branch is created (if needed) and checked out successfully when workspace is a valid git repository (FR-012, FR-018, FR-019)

- **SC-006**: Output channel "PAW Workflow" contains timestamped log entries for all major operations: parameter collection, agent invocation, directory creation, git operations, completion status (FR-007)

- **SC-007**: Error conditions (no git repository, directory conflicts, uncommitted changes) produce clear error messages and prevent incomplete initialization (FR-008, FR-011, FR-012, FR-013)

- **SC-008**: When GitHub issue URL is provided and API is accessible, Work Title is derived from issue title; when unavailable, Work Title is generated from target branch name (FR-004, FR-016)

- **SC-009**: WorkflowContext.md contains all required parameters with correct values: Work Title, Feature Slug, Target Branch, GitHub Issue, Remote, Artifact Paths, Additional Inputs (FR-016)

- **SC-010**: Directory conflicts at `.paw/work/<slug>/` are detected and user is prompted with resolution options before any files are created (FR-011)

## Assumptions

- Users have VS Code installed with GitHub Copilot extension active and agent mode available
- Workspaces are git repositories or users understand requirement to initialize git before using command
- GitHub issue URLs follow standard format: `https://github.com/{owner}/{repo}/issues/{number}`
- The 9 prompt template files follow the minimal format defined in PAW specification with frontmatter including `mode: 'PAW-XXX Agent Name'`
- Default git remote is named "origin" unless user specifies otherwise in future versions
- Feature slug conflicts are rare in single-user workflows; multi-user workflows may see conflicts requiring resolution
- Users have network access for optional GitHub API calls; failures are handled gracefully
- Agent mode has access to necessary tools for file operations, git commands, and user prompts

## Scope

**In Scope**:
- VS Code extension scaffold (package.json, activation events, command registration)
- "PAW: Initialize Work Item" command implementation
- Parameter collection via VS Code input boxes (target branch, GitHub issue URL)
- Optional GitHub issue title fetching for Work Title generation
- Prompt construction and Copilot agent mode invocation
- Agent-delegated directory structure creation, file scaffolding, git operations, slug normalization/validation
- Output channel logging for transparency
- Error handling and user feedback

**Out of Scope**:
- Language model tool (`paw_get_workflow_context`) - deferred to future subtask per issue comment
- Chatmode management/installation features
- Chatmode upgrade functionality  
- UI components (sidebar, tree view)
- Smart agent launcher commands
- Editing or modification of existing work items
- Deletion or cleanup of work items
- Multi-workspace support (assumes single workspace)
- Custom git remote configuration UI (defaults to "origin")
- Advanced conflict resolution strategies beyond prompting user for alternative slug

## Dependencies

- VS Code Extension API (commands, input boxes, output channels, editor operations)
- GitHub Copilot extension with agent mode support (`vscode.commands.executeCommand("workbench.action.chat.open")`)
- Git CLI available in system PATH for agent to execute git commands
- Optional: GitHub API access for issue title fetching (graceful degradation if unavailable)

## Risks & Mitigations

- **Risk**: Agent mode API changes or becomes unavailable. **Impact**: Extension cannot delegate complex logic. **Mitigation**: Document agent mode dependency; monitor VS Code/Copilot extension API stability; design prompt to be robust against minor API variations.

- **Risk**: Agent fails to follow prompt instructions correctly (e.g., doesn't create all files, creates invalid slugs). **Impact**: Incomplete or incorrect initialization. **Mitigation**: Craft detailed, explicit prompt with step-by-step instructions, validation requirements, and expected outcomes; include examples in prompt; test with various inputs during development.

- **Risk**: GitHub API rate limiting or network failures prevent issue title fetching. **Impact**: Work Title generation falls back to branch name. **Mitigation**: Implement graceful fallback to branch-based Work Title; log warning but continue initialization; document optional nature of GitHub integration.

- **Risk**: Workspace has uncommitted changes and user doesn't understand git state. **Impact**: User confusion or unintended branch switching. **Mitigation**: Agent detects uncommitted changes, displays clear warning with explanation, requires explicit confirmation before proceeding.

- **Risk**: Feature slug conflicts in collaborative environments cause repeated user interruptions. **Impact**: User frustration with conflict resolution prompts. **Mitigation**: Agent auto-appends numeric suffix for auto-generated slugs; provide clear conflict resolution options; document slug persistence across branch renames to reduce conflicts.

## References

- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/35
- **Research**: (to be created) .paw/work/vscode-extension-init/SpecResearch.md
- **External**: 
  - PAW Specification: /home/rob/proj/paw/phased-agent-workflow-2/paw-specification.md (Feature Slug, WorkflowContext.md, Prompt Template formats)
  - VS Code Extension API: https://code.visualstudio.com/api
  - GitHub API Issues: https://docs.github.com/en/rest/issues

## Glossary

- **Agent Mode**: VS Code Copilot feature that allows extensions to invoke AI agent with structured prompts for complex task automation
- **Feature Slug**: Normalized, filesystem-safe identifier for PAW work items (e.g., "auth-system")
- **Work Title**: Short 2-4 word descriptive name prefixing PR titles (e.g., "Auth System")
- **Prompt Template**: Pre-structured markdown file with frontmatter used to invoke PAW agents with specific instructions
- **WorkflowContext.md**: Centralized parameter file containing target branch, GitHub issue, remote, artifact paths, and additional inputs for PAW workflow stages
- **Output Channel**: VS Code logging mechanism that displays messages in the Output panel for user visibility
