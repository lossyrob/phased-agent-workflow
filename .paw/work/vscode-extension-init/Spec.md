# Feature Specification: VS Code Extension - PAW Initializer

**Branch**: feature/vscode-extension-init  |  **Created**: 2025-10-27  |  **Status**: Draft  
**Input Brief**: Create VS Code extension with PAW work item initialization command to automate setup and ensure consistent directory structure.

## User Scenarios & Testing

### User Story P1 – Quick Work Item Initialization
**Narrative**: As a developer starting new PAW work, I want to initialize the work item structure with a single command so that I can begin specification work immediately without manual file/directory setup.

**Independent Test**: Run the initialization command, provide required inputs, and verify that all necessary files and directories are created in the correct locations with the branch checked out.

**Acceptance Scenarios**:
1. Given a repository with no existing PAW work item for a feature, When I run "PAW: Initialize Work Item" and provide target branch name and optional GitHub issue URL, Then the extension creates `.paw/work/<feature-slug>/` directory with WorkflowContext.md and all prompt templates, generates the feature slug from the branch name, creates and checks out the target branch, and opens WorkflowContext.md for review.

2. Given I provide a GitHub issue URL during initialization, When the extension creates WorkflowContext.md, Then the GitHub Issue field contains the provided URL and the Work Title is generated from the issue title.

3. Given I do not provide a GitHub issue URL during initialization, When the extension creates WorkflowContext.md, Then the GitHub Issue field is set to "none" and the Work Title is generated from the target branch name.

4. Given my repository has multiple git remotes configured, When I run the initialization command, Then the extension prompts me to select a remote with "origin" as the default selection, and the selected remote is saved in WorkflowContext.md.

5. Given my repository has only one git remote configured, When I run the initialization command, Then the extension automatically uses that remote without prompting and saves it in WorkflowContext.md.

### User Story P2 – Feature Slug Validation and Uniqueness
**Narrative**: As a developer initializing a work item, I want the extension to ensure my feature slug is valid and unique so that I don't encounter file system conflicts or invalid directory names.

**Independent Test**: Attempt to initialize a work item with an invalid or conflicting feature slug and verify that the extension either auto-corrects or prompts for resolution.

**Acceptance Scenarios**:
1. Given a target branch name with special characters or spaces, When the extension generates a feature slug, Then the slug is normalized to lowercase with hyphens replacing invalid characters, and truncated to 100 characters maximum.

2. Given a feature slug that would create a directory that already exists, When the extension validates the slug, Then it automatically appends a numeric suffix (-2, -3, etc.) and informs the user of the adjusted slug.

3. Given a reserved directory name (., .., node_modules, .git, .paw), When the extension validates the slug, Then it rejects the slug and prompts the user to provide an alternative branch name.

### User Story P3 – Branch Creation with Error Handling
**Narrative**: As a developer initializing work, I want the extension to handle branch creation errors gracefully so that I can resolve conflicts or uncommitted changes without losing initialization progress.

**Independent Test**: Attempt to initialize with uncommitted changes or an existing branch and verify the extension provides clear error messages and recovery options.

**Acceptance Scenarios**:
1. Given I have uncommitted changes in my working directory, When I run the initialization command, Then the extension detects the uncommitted changes, provides a clear error message explaining the issue, and suggests stashing changes or committing them before retrying.

2. Given a branch with the target name already exists locally, When the extension attempts to create the branch, Then it detects the conflict, informs the user that the branch exists, and asks whether to check out the existing branch or choose a different name.

3. Given the branch creation or checkout fails for any reason (e.g., git error), When the extension encounters the error, Then it displays the git error message to the user and preserves the created work item directory structure for manual recovery.

### Edge Cases

- **Invalid branch names**: Branch names with characters invalid for git are rejected with a clear error message indicating which characters are not allowed.

- **Missing git repository**: If the workspace is not a git repository, the initialization command displays an error explaining that PAW requires a git repository and suggests running `git init`.

- **Permission errors**: If file system permissions prevent directory or file creation, the extension displays the OS error message and suggests checking directory permissions.

- **Network errors for GitHub issue**: If a GitHub issue URL is provided but cannot be fetched (network error, invalid URL, private issue), the extension warns the user but continues initialization with a Work Title generated from the branch name.

- **Feature slug normalization edge cases**: Empty slugs after normalization (e.g., all special characters), slugs that are too long, or slugs with only hyphens are rejected with guidance to choose a more descriptive branch name.

## Requirements

### Functional Requirements

- **FR-001**: The extension shall provide a command "PAW: Initialize Work Item" accessible from the VS Code command palette. (Stories: P1)

- **FR-002**: The initialization command shall prompt the user for a target branch name (required input). (Stories: P1)

- **FR-003**: The initialization command shall prompt the user for an optional GitHub issue URL. (Stories: P1)

- **FR-003a**: If multiple git remotes are defined, the initialization command shall prompt the user to select a remote, defaulting to "origin" if it exists. (Stories: P1)

- **FR-003b**: If only one git remote is defined, the extension shall automatically use that remote without prompting. (Stories: P1)

- **FR-004**: The extension shall generate a feature slug by normalizing the target branch name according to PAW slug conventions (lowercase, hyphen-separated, alphanumeric only, max 100 chars). (Stories: P1, P2)

- **FR-005**: The extension shall validate that the generated feature slug does not conflict with existing directories in `.paw/work/`. (Stories: P2)

- **FR-006**: If a feature slug conflict is detected, the extension shall automatically append a numeric suffix (-2, -3, etc.) and inform the user of the adjusted slug. (Stories: P2)

- **FR-007**: The extension shall reject feature slugs that match reserved directory names (., .., node_modules, .git, .paw). (Stories: P2)

- **FR-008**: The extension shall create the directory structure `.paw/work/<feature-slug>/` with a `prompts/` subdirectory. (Stories: P1)

- **FR-009**: The extension shall create a `WorkflowContext.md` file in the work item directory containing: Work Title, Feature Slug, Target Branch, GitHub Issue (or "none"), Remote (selected or auto-detected), Artifact Paths ("auto-derived"), and Additional Inputs ("none"). (Stories: P1)

- **FR-010**: The extension shall generate a Work Title (2-4 words) from the GitHub issue title if provided, or from the target branch name if no issue is provided. (Stories: P1)

- **FR-011**: The extension shall create prompt template files in the `prompts/` subdirectory for each PAW workflow stage with prefixes matching agent identifiers: `01A-spec.prompt.md`, `01B-spec-research.prompt.md`, `02A-code-research.prompt.md`, `02B-impl-plan.prompt.md`, `03A-implement.prompt.md`, `03B-review.prompt.md`, `04-docs.prompt.md`, `05-pr.prompt.md`, `0X-status.prompt.md`. (Stories: P1)

- **FR-012**: Each prompt template file shall contain frontmatter with `mode` field set to the appropriate PAW agent mode identifier and minimal content instructing the agent to run its stage using WorkflowContext.md. (Stories: P1)

- **FR-013**: The extension shall create an empty `Spec.md` file in the work item directory. (Stories: P1)

- **FR-014**: The extension shall create the target git branch if it does not already exist. (Stories: P1, P3)

- **FR-015**: The extension shall check out the target branch after creation. (Stories: P1, P3)

- **FR-016**: If the target branch already exists, the extension shall prompt the user to either check out the existing branch or choose a different branch name. (Stories: P3)

- **FR-017**: If uncommitted changes exist in the working directory, the extension shall display an error and refuse to create or switch branches until changes are committed or stashed. (Stories: P3)

- **FR-018**: After successful initialization, the extension shall open the `WorkflowContext.md` file in the editor for user review. (Stories: P1)

- **FR-019**: If a GitHub issue URL is provided, the extension shall attempt to fetch the issue title using the GitHub API. (Stories: P1)

- **FR-020**: If the GitHub issue cannot be fetched, the extension shall warn the user but continue initialization using the branch name for Work Title generation. (Stories: Edge Cases)

- **FR-021**: The extension package shall include all required metadata for VS Code Marketplace publishing: name, display name, description, version, publisher, categories, keywords, icon, repository URL, and license. (Stories: P1)

### Key Entities

- **Work Item**: A PAW workflow instance with associated artifacts, identified by feature slug and target branch.

- **Feature Slug**: Normalized, filesystem-safe identifier (e.g., "auth-system", "api-refactor-v2") used as directory name in `.paw/work/`.

- **Work Title**: Short descriptive name (2-4 words) used to prefix PR titles and identify the work.

- **WorkflowContext.md**: Central metadata file containing target branch, GitHub issue, remote, Work Title, Feature Slug, and artifact paths.

- **Prompt Template**: Markdown file in `prompts/` subdirectory with frontmatter specifying the PAW agent mode.

### Prompt Template File Naming

The extension creates prompt template files during initialization for launching each PAW workflow stage. These are lightweight launcher prompts that instruct agents to execute their stage using the WorkflowContext.md file:

- **`01A-spec.prompt.md`**: Launch PAW-01A Spec Agent to create the specification from WorkflowContext.md.

- **`01B-spec-research.prompt.md`**: Launch PAW-01B Spec Research Agent to answer research questions (note: the actual research questions file `spec-research.prompt.md` is generated by the Spec Agent, not during initialization).

- **`02A-code-research.prompt.md`**: Launch PAW-02A Code Research Agent to map code implementation from WorkflowContext.md.

- **`02B-impl-plan.prompt.md`**: Launch PAW-02B Implementation Plan Agent to create the implementation plan from WorkflowContext.md.

- **`03A-implement.prompt.md`**: Launch PAW-03A Implementation Agent to execute a phase from WorkflowContext.md.

- **`03B-review.prompt.md`**: Launch PAW-03B Implementation Review Agent to review implementation changes from WorkflowContext.md.

- **`04-docs.prompt.md`**: Launch PAW-04 Documenter Agent to create documentation from WorkflowContext.md.

- **`05-pr.prompt.md`**: Launch PAW-05 PR Agent to create the final PR from WorkflowContext.md.

- **`0X-status.prompt.md`**: Launch PAW-0X Status Agent to update issue/PR status from WorkflowContext.md.

**Naming Convention**:
- Prefix matches PAW agent identifier (01A, 01B, 02A, 02B, 03A, 03B, 04, 05, 0X)
- Descriptive name matches the agent's primary function
- `.prompt.md` extension indicates PAW prompt template file

**Frontmatter Structure and Content**:
Each template file contains minimal frontmatter and a simple instruction:
```markdown
---
mode: 'PAW-0XY Agent Name'
---

[Brief instruction to run the stage from WorkflowContext.md]
```

**Rationale**: Creating launcher prompt files for all stages during initialization ensures they are ready for immediate use at any workflow stage. Each file serves as a quick-launch mechanism that simply tells the agent to execute its stage using the WorkflowContext.md file, eliminating the need to manually type instructions for each stage. File names match the exact PAW agent identifiers for clarity and consistency. It also provides a clear place for the user to add custom instructions for the stage if needed.

### Cross-Cutting / Non-Functional

- **Performance**: Initialization command shall complete within 3 seconds for typical cases (excluding network delays for GitHub issue fetching).

- **Error Recovery**: All file system operations shall be atomic where possible; partial failures shall leave the work item directory in a recoverable state with clear error messages indicating what failed.

- **User Experience**: All user prompts shall include helpful placeholder text and validation feedback; error messages shall be actionable and include suggested resolutions.

- **Git Integration**: All git operations shall respect the user's configured git remote name and branch settings; errors shall display the underlying git error for debugging.

## Success Criteria

- **SC-001**: A developer can run "PAW: Initialize Work Item" from the command palette, provide a branch name, and have a complete work item structure created and ready for specification work within 10 seconds. (FR-001, FR-002, FR-003, FR-008, FR-009, FR-011, FR-013, FR-014, FR-015, FR-018)

- **SC-002**: Running initialization with a branch name "Feature: Add User Auth!" creates a normalized feature slug "feature-add-user-auth" and validates it for uniqueness. (FR-004, FR-005, FR-006, FR-007)

- **SC-003**: If `.paw/work/auth-system/` already exists, initializing with a branch that generates "auth-system" slug results in "auth-system-2" being created and the user being informed. (FR-006)

- **SC-004**: Attempting to initialize when uncommitted changes exist results in a clear error message without creating any files or branches. (FR-017)

- **SC-005**: Providing a valid GitHub issue URL during initialization populates the WorkflowContext.md with the issue link and generates a Work Title from the issue's title. (FR-009, FR-010, FR-019)

- **SC-006**: Providing an unreachable GitHub issue URL results in a warning but successful initialization with Work Title generated from branch name. (FR-020)

- **SC-007**: All created prompt template files contain valid frontmatter with the correct PAW agent mode identifiers. (FR-012)

- **SC-008**: After successful initialization, the WorkflowContext.md file opens in the editor showing all populated fields including auto-generated Work Title and Feature Slug. (FR-018)

- **SC-009**: The extension package contains complete marketplace metadata and can be successfully packaged using `vsce package` and published to the VS Code Marketplace. (FR-021)

## Assumptions

- **Git installed and configured**: The user has git installed and configured in their environment with appropriate credentials for the repository.

- **VS Code workspace**: The extension is activated in a workspace with a valid git repository.

- **GitHub MCP server**: For GitHub issue URL fetching, the user has the GitHub MCP server installed and connected to the appropriate GitHub account; the extension uses GitHub MCP tools to fetch issue metadata.

- **File system permissions**: The user has write permissions to create directories and files in the workspace.

- **Branch naming conventions**: The extension does not enforce specific branch prefixes (e.g., `feature/`, `bugfix/`) but accepts any valid git branch name as input.

- **Remote selection**: If only one git remote exists, it is used automatically; if multiple remotes exist, the user is prompted with "origin" as the default; custom remotes can be configured by editing WorkflowContext.md after initialization.

- **Template content standardization**: Prompt template files are created with minimal frontmatter; specific content is added by users or agents during workflow stages.

## Scope

### In Scope
- VS Code extension package structure and activation
- Command palette integration for initialization command
- User input prompts for branch name and optional GitHub issue URL
- Feature slug generation and validation logic
- Directory and file creation for work item structure
- WorkflowContext.md generation with all required fields
- Work Title generation from issue or branch name
- Prompt template file creation with frontmatter
- Git branch creation and checkout operations
- Error handling for file system, git, and GitHub API operations
- Opening WorkflowContext.md in editor after initialization
- Extension metadata and configuration for VS Code Marketplace publishing (package.json, README, LICENSE, icon, etc.)
- Extension packaging and publishing documentation

### Out of Scope
- Language model tool implementation (deferred to future subtask)
- Smart agent launcher commands (future subtask)
- Sidebar tree view for work item visualization (future subtask)
- Chatmode management and upgrade functionality (future subtask)
- Editing or updating existing work items
- Deletion or archival of work items
- Multi-repository or workspace support
- Custom template content beyond frontmatter
- Authentication for private GitHub issues
- Work item migration or restructuring

## Dependencies

- **VS Code Extension API**: Command registration, quick input prompts, file system operations, text editor control.

- **Git CLI**: For branch creation, checkout, and status checking operations via child process execution.

- **GitHub MCP server**: For fetching issue titles and metadata when GitHub issue URL is provided during initialization.

- **Node.js file system APIs**: For directory creation, file writing, and existence checks.

## Risks & Mitigations

- **Risk**: Git operations fail due to complex repository states (rebase in progress, merge conflicts, detached HEAD).  
  **Impact**: User cannot initialize work item until git state is resolved.  
  **Mitigation**: Detect problematic git states upfront and provide clear error messages with resolution steps; delegate complex git operations to user's git client or agent mode.

- **Risk**: Feature slug normalization produces non-unique slugs for similar branch names.  
  **Impact**: Numeric suffixes may create confusing directory names (e.g., "auth-system-2", "auth-system-3").  
  **Mitigation**: Display the final slug to the user during initialization; provide clear messaging when conflicts are auto-resolved.

- **Risk**: Network failures when fetching GitHub issue titles leave Work Title incomplete.  
  **Impact**: User must manually edit WorkflowContext.md to set meaningful Work Title.  
  **Mitigation**: Fall back to branch-name-derived Work Title with a warning; ensure WorkflowContext.md is still valid and usable.

- **Risk**: File system permissions prevent directory or file creation.  
  **Impact**: Initialization fails partway through, leaving incomplete work item structure.  
  **Mitigation**: Check write permissions to workspace root before starting initialization; provide clear error messages referencing the OS-level permission error.

- **Risk**: User provides invalid branch names (spaces, special characters that git rejects).  
  **Impact**: Git branch creation fails with cryptic error.  
  **Mitigation**: Validate branch name against git naming rules before attempting creation; provide user-friendly error messages suggesting valid alternatives.

## References

- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/35
- **Research**: .paw/work/vscode-extension-init/SpecResearch.md
- **External**: 
  - PAW Specification: paw-specification.md
  - VS Code Extension API: https://code.visualstudio.com/api
  - GitHub REST API: https://docs.github.com/en/rest (for issue fetching)

## Glossary

- **Feature Slug**: Normalized, filesystem-safe identifier used as directory name for PAW work items.
- **Work Title**: Short descriptive name (2-4 words) that identifies the work and prefixes PR titles.
- **WorkflowContext.md**: Central metadata file for PAW work items containing target branch, issue URL, and configuration.
- **Prompt Template**: Markdown file with PAW agent mode frontmatter used to guide agent research and planning stages.
- **PAW**: Phased Agent Workflow, a structured development methodology using staged artifacts and agent-driven work.
