# Feature Specification: Cross-Repository Workflow Supervisor

**Branch**: feature/142-cross-repository-workflow-supervisor  |  **Created**: 2025-12-10  |  **Status**: Draft
**Input Brief**: Enable PAW to orchestrate feature development across multiple git repositories in a VS Code multi-root workspace

## Overview

Development teams frequently encounter features that require coordinated changes across multiple repositories. Consider a VS Code extension project where the extension lives in one repository while its language server resides in another. When implementing a feature that touches both sides, developers currently must juggle separate PAW workflows in each repository, manually tracking context, dependencies, and sequencing. This fragmented approach increases cognitive load and risks inconsistency between repositories. The Cross-Repository Workflow Supervisor introduces a unified coordination layer that understands the feature holistically. Users describe their multi-repository feature once to a supervisor PAW agent. The supervisor creates a comprehensive specification spanning all affected repositories, devises an execution plan with explicit sequencing, and initializes child PAW workflows in each repository with tailored context. Each repository proceeds through standard PAW stages independently, while the supervisor provides the orchestration needed to ensure the pieces fit together. After implementation completes, the supervisor helps validate the integrated result. This workflow transforms what was previously a manual coordination exercise into a structured, guided process that preserves PAW's quality standards across repository boundaries.

## Objectives

- Enable feature work spanning multiple repositories to be specified, planned, and tracked as a unified workflow
- Maintain independence of child repository workflows so each can function as a standard PAW workflow (Rationale: Preserves existing PAW guarantees and allows work to proceed even if supervisor artifacts are unavailable)
- Provide explicit execution sequencing to guide users through multi-repository implementation (Rationale: Reduces cognitive load by eliminating manual coordination decisions)
- Pass repository-specific context excerpts to child workflows to avoid overwhelming them with unrelated details
- Store supervisor artifacts outside any git repository to keep coordination metadata separate from implementation history
- Support standard PAW workflow modes (full/minimal/custom) within each child repository
- Deliver clear validation guidance for testing integrated changes across repositories

## User Scenarios & Testing

### User Story P1 – Initialize Cross-Repository Workflow

**Narrative**: As a developer working on a feature that spans multiple repositories, I want to start a single PAW workflow that understands all affected repositories, so I can coordinate changes without manually tracking context between separate workflows.

**Independent Test**: User selects "Cross-Repository" workflow type, provides feature description, and supervisor successfully creates a multi-repository specification identifying all affected repositories.

**Acceptance Scenarios**:
1. Given a VS Code multi-root workspace with multiple git repositories, When the user invokes "PAW: New PAW Workflow" and selects "Cross-Repository" workflow type, Then the system detects all git repositories and prompts for feature description.
2. Given a user has described their multi-repository feature, When supervisor specification phase completes, Then a holistic spec exists in `.paw/multi-work/<work-id>/` identifying which repositories need changes and how they interact.
3. Given a single-folder workspace with no multi-root setup, When user attempts to select "Cross-Repository" workflow, Then the system provides clear guidance that multi-root workspace is required.

### User Story P2 – Generate Execution Plan with Sequencing

**Narrative**: As a developer implementing a multi-repository feature, I want an explicit execution sequence telling me which repository to work on first and when to move to the next, so I don't have to guess the correct order or risk breaking dependencies.

**Independent Test**: Supervisor creates a plan with numbered execution steps indicating repository work order and dependency relationships.

**Acceptance Scenarios**:
1. Given a completed cross-repository specification, When the supervisor planning phase runs, Then a plan artifact exists with explicit "Execution Sequence" listing repositories in dependency order.
2. Given a feature where repository A must be completed before repository B, When the plan is generated, Then repository A appears earlier in the sequence than repository B with rationale explaining the dependency.
3. Given repositories with no dependency constraints, When the plan is generated, Then any valid sequence is acceptable and the plan explicitly notes that order is flexible.

### User Story P3 – Initialize Child Workflows with Context

**Narrative**: As a developer executing a multi-repository plan, I want each repository's PAW workflow to receive tailored context describing its role in the larger feature, so I understand what needs to be built without being overwhelmed by irrelevant details from other repositories.

**Independent Test**: User can initialize a child workflow that receives a scoped excerpt of the cross-repository spec relevant to that repository.

**Acceptance Scenarios**:
1. Given a supervisor plan specifying changes needed in repository A, When user initializes the child PAW workflow in repository A, Then the workflow receives context describing requirements specific to repository A plus necessary integration points with other repositories.
2. Given a cross-repository spec with details about three repositories, When a child workflow is initialized for repository A, Then the context does not include implementation details specific to repositories B and C.
3. Given a completed child workflow in repository A, When user returns to supervisor, Then supervisor can reference the child workflow's artifacts when generating context for subsequent repositories.

### User Story P4 – Validate Integrated Changes

**Narrative**: As a developer who has completed all child repository workflows, I want the supervisor to help me verify that the integrated changes work together correctly, so I can confidently merge my PRs knowing the feature is complete.

**Acceptance Scenarios**:
1. Given all child workflows have completed implementation, When user returns to supervisor validation phase, Then supervisor provides integration test guidance describing how to test the combined changes.
2. Given completed child workflow artifacts across multiple repositories, When validation runs, Then supervisor performs consistency checks verifying implementations align with the original cross-repository spec.
3. Given validated changes ready for merge, When user requests PR coordination guidance, Then supervisor suggests PR merge order based on dependencies and provides draft PR descriptions linking related changes.

### Edge Cases

- **Repository not in workspace**: If plan references a repository that user has not added to their multi-root workspace, provide clear error with instructions to add the missing repository.
- **Child workflow already exists**: If user attempts to initialize a child workflow but `.paw/work/<work-id>/` already exists in that repository, detect the collision and prompt user to either use a different work ID or confirm overwriting.
- **Supervisor artifacts lost**: If supervisor artifacts are deleted but child workflows remain, child workflows continue functioning as independent PAW workflows (degraded mode: no supervisor coordination).
- **Mixed workflow types**: If a repository in the workspace already has an active PAW workflow, prevent supervisor from initializing a conflicting child workflow in that repository.
- **Non-git folders in workspace**: If workspace includes folders that are not git repositories, exclude them from repository detection without errors.
- **Empty feature description**: If user provides insufficient detail about the multi-repository feature during initialization, prompt for clarification before proceeding to specification phase.

## Requirements

### Functional Requirements

- **FR-001**: System shall detect git repositories in VS Code multi-root workspace by iterating `vscode.workspace.workspaceFolders` and validating each folder with `git rev-parse --git-dir` (Stories: P1)
- **FR-002**: System shall provide "Workflow Type" selection UI presenting "Implementation", "Cross-Repository", and "Review" options before collecting other workflow parameters (Stories: P1)
- **FR-003**: When "Cross-Repository" is selected in a non-multi-root workspace, system shall display error message with guidance to create multi-root workspace (Stories: P1)
- **FR-004**: System shall store supervisor artifacts in `.paw/multi-work/<work-id>/` directory at workspace root, not inside any git repository (Stories: P1, P3)
- **FR-005**: Supervisor specification phase shall create `CrossRepoSpec.md` artifact identifying affected repositories, their interaction points, and per-repository requirements (Stories: P1, P3)
- **FR-006**: Supervisor planning phase shall create `CrossRepoPlan.md` artifact with numbered "Execution Sequence" listing repositories in dependency order with rationale (Stories: P2, P3)
- **FR-007**: System shall support initializing child PAW workflows with repository-specific context excerpts from cross-repository spec (Stories: P3)
- **FR-008**: Child workflows shall use standard `.paw/work/<work-id>/` structure and function as independent PAW workflows if supervisor artifacts become unavailable (Stories: P3)
- **FR-009**: Supervisor validation phase shall provide integration test guidance describing how to test combined changes across repositories (Stories: P4)
- **FR-010**: Supervisor validation phase shall perform consistency checks comparing child workflow artifacts against original cross-repository spec (Stories: P4)
- **FR-011**: System shall detect when a repository already has an active PAW workflow and prevent supervisor from creating conflicting child workflow in that repository (Edge case: Mixed workflow types)
- **FR-012**: System shall exclude non-git folders from repository detection without error (Edge case: Non-git folders)
- **FR-013**: Supervisor planning phase shall detect when plan references a repository not in the workspace and provide actionable error guidance (Edge case: Repository not in workspace)

### Key Entities

- **Supervisor Workflow**: Coordination workflow managing feature development across multiple repositories; stores artifacts in workspace root `.paw/multi-work/<work-id>/`
- **Child Workflow**: Standard PAW workflow in an individual repository; initialized by supervisor with scoped context; stores artifacts in repository's `.paw/work/<work-id>/` directory
- **Execution Sequence**: Ordered list of repositories in supervisor plan specifying implementation order with dependency rationale
- **Context Excerpt**: Repository-specific requirements and integration points extracted from cross-repository spec and passed to child workflow during initialization
- **Repository Detection Result**: List of workspace folders validated as git repositories, used for supervisor initialization

### Cross-Cutting / Non-Functional

- **Compatibility**: Child workflows must remain compatible with standard PAW workflows to ensure users can work in individual repositories without supervisor coordination
- **Workspace Independence**: Supervisor artifact storage must not require any repository to be checked out at a specific path or have knowledge of sibling repositories
- **Context Scoping**: Repository-specific context excerpts must include enough information for independent implementation while avoiding unrelated implementation details from other repositories
- **Error Recovery**: If supervisor artifacts are lost, child workflows must continue functioning as standard PAW workflows without data loss or corruption

## Success Criteria

- **SC-001**: User can successfully initiate cross-repository workflow from multi-root workspace by selecting workflow type and providing feature description (FR-002, FR-003)
- **SC-002**: Supervisor creates specification artifact identifying all affected repositories and their interaction points with 100% accuracy based on feature requirements (FR-005)
- **SC-003**: Supervisor generates execution plan with explicit repository sequencing where dependencies are correctly ordered (measured by user verification during planning review) (FR-006)
- **SC-004**: Child workflows can be initialized with context excerpts containing only repository-specific requirements plus necessary integration points (measured by context size being subset of full spec) (FR-007)
- **SC-005**: Child workflow operates as standard PAW workflow if supervisor artifacts are deleted (measured by ability to complete all standard PAW stages without supervisor) (FR-008)
- **SC-006**: Validation phase detects inconsistencies between child workflow implementations and cross-repository spec (measured by comparison of artifact content) (FR-010)
- **SC-007**: System prevents conflicting workflow initialization when repository already has active PAW workflow (measured by error detection before file creation) (FR-011)
- **SC-008**: Repository detection excludes non-git folders and only presents valid git repositories to user (measured by 0% false positives in repository list) (FR-001, FR-012)

## Assumptions

- **VS Code Multi-Root Workspace**: Users will create multi-root workspaces using VS Code's built-in workspace file feature (`.code-workspace` files) before initiating cross-repository workflows.
- **Git Repository Organization**: All repositories involved in a feature are accessible in the same workspace simultaneously; repositories are not nested within each other.
- **Repository-Level Sequencing Sufficient**: For v1, specifying which repository to complete before another is sufficient granularity; phase-level sequencing (e.g., "complete Phase 2 in repo A before starting Phase 1 in repo B") is not required.
- **Supervisor Artifact Lifecycle**: Supervisor artifacts in `.paw/multi-work/` are treated as ephemeral coordination metadata; essential information flows to child workflows which are git-committed, so loss of supervisor artifacts does not lose critical project information.
- **Context Scoping Strategy**: Repository-specific context excerpts will be manually curated by supervisor agents during planning phase; automated semantic extraction of "relevant" context is not required for v1.
- **Validation Scope**: Validation phase provides guidance and consistency checks but does not execute integration tests automatically; actual testing remains a manual user activity.
- **Single Active Workflow Per Repository**: A repository should not have multiple active PAW workflows simultaneously; this applies to both standard workflows and cross-repository child workflows.

## Scope

**In Scope**:
- Multi-root workspace detection and git repository identification
- Workflow type selection UI (Implementation / Cross-Repository / Review)
- Supervisor workflow initialization flow specific to cross-repository workflows
- Supervisor specification phase creating holistic multi-repository specs
- Supervisor planning phase with explicit repository-level execution sequencing
- Child workflow initialization with repository-specific context excerpts
- Supervisor validation phase with consistency checks and integration test guidance
- Prevention of conflicting workflow initialization in already-active repositories
- Documentation and user guidance for cross-repository workflow usage

**Out of Scope**:
- Automated integration test execution (validation provides guidance only)
- Phase-level sequencing within execution plan (repository-level only for v1)
- Automatic PR creation across multiple repositories
- Real-time progress tracking of child workflows by supervisor
- Cross-repository dependency management at the package/module level
- Nested repository support (repositories within repositories)
- Automatic merge order enforcement (validation provides suggestions only)
- Migration of existing single-repository PAW workflows to cross-repository workflows
- Review workflow (PAW-R) implementation (separate from this feature, though shares workflow type selection UI)

## Dependencies

- **VS Code Multi-Root Workspace API**: `vscode.workspace.workspaceFolders` must be available to detect workspace folders
- **Git CLI**: `git rev-parse --git-dir` command must be available in system PATH for repository validation
- **Existing PAW Agent System**: Supervisor agents will use existing `paw_call_agent` tool to initialize child workflows and existing agent template rendering system
- **WorkflowContext.md Format**: Child workflows use existing WorkflowContext.md structure; supervisor introduces new `SupervisorContext.md` format
- **Existing Initialization Flow**: Cross-repository workflow extends existing `initializeWorkItem` command with new workflow type branch

## Risks & Mitigations

- **Risk**: User confusion about when to use cross-repository vs. standard workflow. **Impact**: Users may select wrong workflow type, leading to suboptimal experience or errors. **Mitigation**: Provide clear workflow type descriptions in UI and include "workspace type mismatch" error detection (FR-003) with actionable guidance.

- **Risk**: Context excerpt scoping is too narrow, omitting critical integration details needed by child workflow. **Impact**: Child workflow implementer lacks information to build correct integration. **Mitigation**: Include explicit "integration points" section in context excerpts describing how the repository interacts with others; planning phase review by user before child workflow initialization.

- **Risk**: Execution sequence is incorrect, causing user to implement repositories in wrong order. **Impact**: Later repository implementation discovers it needs changes in earlier repository, requiring rework. **Mitigation**: Supervisor planning agent performs dependency analysis explicitly; execution sequence includes rationale for ordering; user reviews plan before proceeding.

- **Risk**: Supervisor artifacts lost before workflow completion. **Impact**: User loses coordination context mid-workflow. **Mitigation**: Document that child workflows remain functional as standard PAW workflows (FR-008); provide guidance for manually coordinating remaining work; consider adding "reconstruct supervisor context" recovery tool in future.

- **Risk**: Workspace folder structure changes during workflow. **Impact**: Supervisor cannot locate child workflows or repositories. **Mitigation**: Store absolute paths in supervisor context; detect missing repositories during validation phase; provide actionable error messages.

- **Risk**: Child workflow Work ID collisions across repositories. **Impact**: Different repositories use same Work ID for unrelated features, causing confusion. **Mitigation**: Supervisor ensures all child workflows for a single feature use the same Work ID derived from the feature description; document convention that Work ID should be unique to the feature, not the repository.

## References

- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/142
- **Research**: .paw/work/cross-repository-workflow-supervisor/SpecResearch.md
- **External**: None

## Glossary

- **Multi-Root Workspace**: VS Code feature allowing multiple folders to be open simultaneously in a single workspace, typically defined in a `.code-workspace` file
- **Supervisor Workflow**: The cross-repository coordination workflow that orchestrates multiple child workflows across repositories
- **Child Workflow**: A standard PAW workflow in an individual repository, initialized and guided by the supervisor workflow
- **Work ID**: Normalized feature slug (lowercase letters, numbers, hyphens) used for artifact directory naming; shared between supervisor and all child workflows for a single feature
- **Execution Sequence**: Ordered list in supervisor plan specifying which repository workflows to complete in which order
- **Context Excerpt**: Repository-specific subset of the cross-repository specification passed to a child workflow during initialization

