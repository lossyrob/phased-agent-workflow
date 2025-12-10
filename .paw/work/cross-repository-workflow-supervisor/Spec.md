# Feature Specification: Cross-Repository Workflow Supervisor

**Branch**: feature/142-cross-repository-workflow-supervisor  |  **Created**: 2025-12-10  |  **Status**: Draft
**Input Brief**: Enable coordinated PAW workflows across multiple git repositories for features spanning VS Code extensions and language servers

## Overview

A developer working on a VS Code extension feature encounters a common challenge: the feature requires coordinated changes across both the extension repository and its companion language server repository. Currently, they must manually switch between repositories, initialize separate PAW workflows in each, and mentally track dependencies and sequencing as they bounce between the two projects. When the time comes to create pull requests, they must ensure the changes align correctly, are tested together, and are merged in the right order. This manual coordination is tedious and error-prone, particularly when changes in one repository depend on completed changes in another.

The Cross-Repository Workflow Supervisor introduces a higher-level workflow orchestration that understands the holistic feature spanning multiple repositories. When the developer initiates a new workflow, they select "Cross-Repository" as the workflow type from a dropdown menu. The supervisor guides them through providing the feature description once, then creates a unified specification that identifies which repositories need changes and how they interact. A cross-repository implementation plan establishes the execution sequence—which repository to work on first, what each repository needs to accomplish, and where the interdependencies lie. The supervisor initializes child PAW workflows in each affected repository, passing appropriate context so each repository's workflow understands its role in the larger feature.

As the developer progresses through the workflow, they follow the suggested sequence, running standard PAW processes within each repository. Each repository proceeds through its own implementation, review, and PR phases independently, but guided by the context provided from the supervisor. At any point during development—after completing implementation phases, before opening PRs, or even mid-workflow when checking alignment—the developer can invoke the supervisor validation to verify that work across repositories remains consistent with the plan and compatible with each other. The result is a coordinated multi-repository feature implementation that maintains all the structure and quality benefits of PAW workflows while eliminating the manual overhead of cross-repository coordination.

## Objectives

- Enable developers to initiate workflows spanning multiple git repositories from a single starting point (Rationale: eliminates manual setup overhead and provides clear entry point for multi-repository features)
- Create unified specifications that identify which repositories require changes and how they interact (Rationale: ensures holistic understanding of cross-repository dependencies before implementation begins)
- Establish clear execution sequencing across repositories to guide work order and dependency management (Rationale: prevents out-of-order implementation that could lead to incompatible changes)
- Initialize and coordinate child PAW workflows within individual repositories while preserving their independent operation (Rationale: leverages existing single-repository workflow capabilities without requiring changes to child workflow behavior)
- Provide on-demand cross-repository validation to verify consistency and alignment at any stage of child workflow execution (Rationale: catches integration issues early at flexible checkpoints throughout development, not just after completion)

## User Scenarios & Testing

### User Story P1 – Initiate Cross-Repository Workflow

Narrative: As a developer working on a feature spanning multiple repositories, I need to start a coordinated workflow so that I have a clear plan and context for implementing changes across all affected repositories.

Independent Test: Start a new cross-repository workflow from the VS Code command palette and verify that the supervisor creates initialization context without requiring separate workflow creation in each repository.

Acceptance Scenarios:
1. Given a VS Code workspace with multiple git repository folders, When I select "PAW: New PAW Workflow" from the command palette and choose "Cross-Repository" as workflow type, Then the system identifies all git repositories in the workspace and prompts me to select which repositories the feature affects
2. Given I've selected affected repositories and provided a feature description, When the initialization completes, Then the system creates a supervisor workspace at `.paw/multi-work/<work-id>/` with `SupervisorContext.md` containing the list of affected repositories and basic workflow parameters
3. Given I've initiated a cross-repository workflow, When I attempt to access the supervisor context from any workspace folder, Then the `paw_get_context` tool successfully locates and returns the supervisor context

### User Story P2 – Generate Unified Specification

Narrative: As a developer using the cross-repository supervisor, I need a specification that describes how all repositories work together so that I understand the full feature scope and cross-repository dependencies before implementing.

Independent Test: Complete the specification phase and verify that the resulting spec document identifies which repositories need changes, what each repository contributes, and how they interact.

Acceptance Scenarios:
1. Given supervisor context has been initialized, When the specification agent analyzes the feature requirements, Then it produces a unified specification identifying which repositories require changes and describing their interactions
2. Given a unified specification has been created, When I read the specification, Then I can understand what each repository needs to accomplish and how the repositories will communicate or integrate
3. Given the specification identifies repository interactions, When implementation planning begins, Then the planner has clear requirements to work from for establishing execution order

### User Story P3 – Create Cross-Repository Plan with Sequencing

Narrative: As a developer ready to implement a cross-repository feature, I need an execution plan that tells me which repository to work on first and what each repository should accomplish so that I can proceed systematically without creating incompatible changes.

Independent Test: Complete the planning phase and verify that the resulting plan specifies an ordered sequence of repository work with clear context for each child workflow.

Acceptance Scenarios:
1. Given a unified specification exists, When the planning agent creates the cross-repository plan, Then the plan specifies an execution sequence indicating which repository to work on first, second, etc.
2. Given an execution sequence has been established, When the plan describes work for each repository, Then it includes repository-specific context that scopes what that repository needs to accomplish
3. Given a cross-repository plan has been created, When the planner initializes child workflows, Then it creates standard `.paw/work/<work-id>/` structures in each affected repository with appropriate context passed via WorkflowContext.md or initialization prompts

### User Story P4 – Execute Child Workflows in Sequence

Narrative: As a developer following a cross-repository plan, I need to run standard PAW workflows within each repository so that each repository proceeds through implementation, review, and PR creation independently while staying aligned with the overall feature.

Independent Test: Follow the execution sequence to work on one repository, complete its child workflow phases, then proceed to the next repository, verifying that each child workflow operates as a standard PAW workflow.

Acceptance Scenarios:
1. Given a cross-repository plan with execution sequence, When I start work in the first repository, Then I can run standard PAW agents (Code Researcher, Impl Planner, Implementer, etc.) and they operate normally within that repository's context
2. Given I've completed the child workflow in one repository, When I switch to the next repository in the sequence, Then I can start or continue its child workflow with context understanding its role in the larger feature
3. Given all child workflows are progressing, When a child workflow creates a PR, Then the PR includes the standard PAW artifacts and can reference the supervisor workflow for broader context

### User Story P5 – Validate Cross-Repository Consistency

Narrative: As a developer working on child workflows in multiple repositories, I need on-demand cross-repository validation so that I can verify at any point that the work done so far aligns with the original specification and remains compatible across repositories.

Independent Test: Invoke validation at different stages of child workflow execution (mid-implementation, after implementation phase, before PR creation) and verify that it checks consistency across repositories based on current progress.

Acceptance Scenarios:
1. Given child workflows are at various stages of completion (one may be mid-implementation, another nearly complete), When I invoke the supervisor validation agent, Then it reviews the current state of work across repositories to identify inconsistencies or misalignments with the plan
2. Given validation has been performed at a particular checkpoint, When the validation agent produces its report, Then it provides integration testing guidance appropriate to the current stage and describes how to verify the combined changes work together
3. Given validation identifies inconsistencies or integration concerns, When the report is generated, Then it describes the issues clearly, suggests remediation steps, and indicates whether work can proceed or requires alignment fixes

### Edge Cases

- **Mixed workflow progress**: User works on repositories out of suggested sequence order; supervisor validation should detect progress state and provide updated guidance rather than blocking
- **Partial validation requests**: User invokes validation when child workflows are at different stages (one mid-implementation, one in review); validation should assess current state and provide meaningful feedback without requiring completion
- **Repository added mid-workflow**: User realizes additional repository needs changes after supervisor initialization; validation should detect this and recommend re-planning or manual workflow initialization
- **Child workflow failure**: Implementation in one repository fails or is abandoned; supervisor should help assess impact on dependent repositories
- **Workspace folder changes**: Workspace folders added or removed after supervisor initialization; context tool should gracefully handle missing repositories
- **Version compatibility**: Changes in one repository require specific version of another repository; plan should capture this as a dependency
- **Conflicting changes**: Multiple developers working in same repositories on different features; standard git conflict resolution applies, supervisor doesn't manage concurrent work

## Requirements

### Functional Requirements

- FR-001: System shall detect all git repositories within a VS Code multi-root workspace during initialization (Stories: P1)
- FR-002: System shall present a workflow type selection (Implementation/Cross-Repository/Review) during PAW workflow initialization (Stories: P1)
- FR-003: System shall allow user to select which detected repositories are affected by the cross-repository feature (Stories: P1)
- FR-004: System shall create supervisor artifacts in `.paw/multi-work/<work-id>/` directory within the workspace root (not in any git repository) (Stories: P1)
- FR-005: System shall store supervisor parameters in `SupervisorContext.md` including workflow metadata, list of affected repositories, and execution state (Stories: P1, P3)
- FR-006: Supervisor specification agent shall produce a unified specification identifying required changes in each repository and their interactions (Stories: P2)
- FR-007: Supervisor planning agent shall create an execution plan with repository-level sequencing indicating work order (Stories: P3)
- FR-008: Supervisor planning agent shall generate scoped context excerpts for each child repository describing its role in the feature (Stories: P3)
- FR-009: System shall initialize child PAW workflows in affected repositories using standard `.paw/work/<work-id>/` structure (Stories: P3)
- FR-010: Child workflows shall operate as standard single-repository PAW workflows without requiring supervisor presence (Stories: P4)
- FR-011: `paw_get_context` tool shall resolve supervisor context when invoked with supervisor work ID from any workspace folder (Stories: P1, P4)
- FR-012: `paw_call_agent` tool shall support handoffs to supervisor agents using supervisor work ID (Stories: P4, P5)
- FR-013: Supervisor validation agent shall review child workflows at any stage of execution to identify cross-repository inconsistencies based on current progress (Stories: P5)
- FR-014: Supervisor validation agent shall provide integration testing guidance appropriate to the current stage describing how to verify combined changes (Stories: P5)

### Key Entities

- **Supervisor Workflow**: A cross-repository workflow that coordinates child workflows across multiple repositories
- **Supervisor Context**: Workflow parameters including affected repositories, execution sequence, and validation state stored in `SupervisorContext.md`
- **Unified Specification**: A specification document describing the complete feature spanning all repositories and identifying their interactions
- **Cross-Repository Plan**: An execution plan with repository-level sequencing and scoped context for each child workflow
- **Child Workflow**: A standard PAW workflow running within an individual repository as part of a larger cross-repository feature
- **Execution Sequence**: Ordered list of repositories indicating which to work on first, second, etc., based on dependencies
- **Scoped Context**: Repository-specific excerpt from the unified specification describing that repository's role and requirements

### Cross-Cutting / Non-Functional

- **Workspace Compatibility**: Must operate correctly in VS Code multi-root workspaces with any number of folders
- **Child Independence**: Child workflows must function correctly even if supervisor artifacts are lost or removed
- **Git Repository Detection**: Must reliably detect git repositories across different git configurations (standard `.git` folder, worktrees, submodules)
- **Context Discoverability**: Supervisor context must be accessible from agents invoked in any workspace folder

## Success Criteria

- SC-001: User can select "Cross-Repository" workflow type during PAW initialization and system detects all git repositories in the workspace (FR-002, FR-001)
- SC-002: System creates supervisor artifacts at `.paw/multi-work/<work-id>/` containing list of affected repositories and workflow parameters (FR-004, FR-005)
- SC-003: Supervisor specification agent produces a unified spec identifying which repositories need changes and describing their interactions (FR-006)
- SC-004: Supervisor planning agent creates an execution plan with clear repository ordering (e.g., "1. Complete language-server workflow 2. Complete extension workflow") (FR-007)
- SC-005: Child workflows initialized in each affected repository contain standard PAW structure and can be executed as independent workflows (FR-009, FR-010)
- SC-006: Agents can resolve supervisor context via `paw_get_context` and hand off to supervisor agents via `paw_call_agent` (FR-011, FR-012)
- SC-007: Supervisor validation agent can be invoked at any stage of child workflow execution, identifies inconsistencies across repositories based on current progress, and provides integration testing guidance appropriate to the stage (FR-013, FR-014)

## Assumptions

- VS Code multi-root workspace is the supported environment (not single folder workspaces or no workspace); single folder workspaces would need separate initialization flow
- Repositories are peers within the workspace; supervisor doesn't handle nested repositories or git submodules as separate entities
- Repository-level sequencing (complete repo A, then repo B) is sufficient for v1; phase-level sequencing (repo A phase 1, repo B phase 2, repo A phase 3) is out of scope
- Supervisor artifacts are not git-tracked by default; users may choose to version control them separately but it's not required
- Standard PAW workflow modes (full/minimal/custom) apply to supervisor workflows; each mode would adapt its supervisor agents accordingly
- Child workflows use the same work ID as the supervisor workflow for traceability
- Integration testing is performed manually by the user following validation guidance; automated integration test execution is out of scope
- Validation can be invoked at any point during child workflow execution (implementation, review, pre-PR, etc.); it is not restricted to post-completion only

## Scope

In Scope:
- Workflow type selection UI during PAW initialization
- Git repository detection across workspace folders
- Supervisor artifact creation in workspace root `.paw/multi-work/` directory
- Supervisor-specific agents for specification, planning, and validation
- Child workflow initialization with context passing
- Repository-level execution sequencing in cross-repository plans
- On-demand cross-repository consistency validation at any workflow stage
- Stage-appropriate integration testing guidance generation

Out of Scope:
- Phase-level sequencing (granular ordering like "repo A phase 2, then repo B phase 1") - future enhancement
- Automated integration test execution - validation provides guidance only
- PR coordination automation (linked PRs, merge order enforcement) - user creates PRs manually following plan
- Progress tracking dashboard showing child workflow states - user tracks progress manually
- Multi-repository refactorings or transformations - supervisor focuses on feature implementation
- Dependency version compatibility checking - assumed to be handled via standard testing
- Concurrent multi-developer coordination - standard git collaboration applies
- Non-git version control systems

## Dependencies

- VS Code multi-root workspace support (`vscode.workspace.workspaceFolders` API)
- Git CLI availability for repository detection (`git rev-parse --git-dir`)
- Existing PAW agent system and tool infrastructure (`paw_get_context`, `paw_call_agent`, `paw_generate_prompt`)
- Agent template rendering system for creating supervisor agents
- WorkflowContext.md structure and parsing logic

## Risks & Mitigations

- **Risk**: Users attempt to use cross-repository workflow in single-folder workspace. **Impact**: Workflow fails or creates confusing structure. **Mitigation**: Validate workspace type during initialization; show clear error message if multi-root workspace is not detected
- **Risk**: Git repository detection fails in non-standard configurations (worktrees, unusual `.git` setups). **Impact**: Supervisor cannot identify all repositories. **Mitigation**: Use `git rev-parse --git-dir` for reliable detection; provide manual repository selection fallback if auto-detection misses repositories
- **Risk**: Child workflows diverge from plan after initialization (user makes unplanned changes). **Impact**: Validation finds unexpected inconsistencies. **Mitigation**: Validation phase documents discrepancies as findings; does not block workflow progression
- **Risk**: Supervisor artifacts location conflicts with repository structures or tools. **Impact**: Confusion about artifact ownership or version control. **Mitigation**: Use workspace root `.paw/multi-work/` location explicitly; document that supervisor artifacts are separate from repository histories
- **Risk**: Context tool cannot locate supervisor context from child repository agents. **Impact**: Handoffs fail or agents cannot access supervisor state. **Mitigation**: Extend `paw_get_context` to search both `.paw/work/` and `.paw/multi-work/` directories; add supervisor work ID type indicator
- **Risk**: Users lose supervisor artifacts (workspace closed, directory deleted). **Impact**: Child workflows continue working but cross-repository coordination is lost. **Mitigation**: Document supervisor artifact location and recommend workspace persistence; child workflows remain functional as independent workflows
- **Risk**: Execution sequence proves incorrect (dependencies discovered during implementation). **Impact**: User must work out of order or re-plan. **Mitigation**: Validation phase can detect this; planning documentation should note that sequence may need adjustment based on implementation findings

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/142
- Research: .paw/work/cross-repository-workflow-supervisor/SpecResearch.md
- External: None

## Glossary

- **Supervisor Workflow**: A PAW workflow type that orchestrates child workflows across multiple git repositories for features spanning multiple projects
- **Child Workflow**: A standard single-repository PAW workflow that is part of a larger cross-repository feature, initialized and coordinated by a supervisor workflow
- **Multi-Root Workspace**: VS Code workspace containing multiple folder roots, each potentially being a separate git repository
- **Repository-Level Sequencing**: Execution ordering at the granularity of complete repositories (e.g., finish repo A before starting repo B), as opposed to phase-level sequencing
- **Unified Specification**: A specification document describing a feature holistically across all affected repositories, identifying interactions and dependencies
- **Scoped Context**: A subset of the unified specification focusing on a single repository's role and requirements, passed to that repository's child workflow
- **Supervisor Context**: Workflow metadata stored in `SupervisorContext.md` including affected repositories, execution state, and workflow parameters
