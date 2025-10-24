# Feature Specification: Azure DevOps Support

**Branch**: feature/azure-devops  |  **Created**: 2025-10-23  |  **Status**: Draft
**Input Brief**: Enable PAW to work with Azure DevOps repositories, pull requests, and work items as an alternative to GitHub

## User Scenarios & Testing

### User Story P1 – Repository Operations with Azure DevOps
**Narrative**: As a developer using Azure DevOps, I want PAW agents to create branches, commit changes, and open PRs in my Azure DevOps repository so I can follow the same phased workflow as GitHub users without changing my team's existing toolchain.

**Independent Test**: Initialize a PAW workflow on an Azure DevOps repository, have an agent create a branch and open a PR, and verify the PR appears in Azure DevOps with correct links and metadata.

**Acceptance Scenarios**:
1. Given a repository with an Azure DevOps remote URL in the Remote field, When a PAW agent performs repository operations, Then it automatically detects Azure DevOps and uses Azure DevOps MCP tools
2. Given a PAW agent needs to create a branch, When the agent executes branch creation, Then the branch is created in the Azure DevOps repository using the correct naming convention
3. Given a phase is complete, When the Implementation Review Agent runs, Then it opens a PR in Azure DevOps with the correct source and target branches
4. Given a PR is opened in Azure DevOps, When I view the PR, Then the description contains proper artifact links and PAW formatting
5. Given the Azure DevOps MCP server is not configured, When an agent detects an Azure DevOps repository, Then it provides a clear error message with setup instructions
6. Given a GitHub repository, When a PAW agent runs, Then it continues to use GitHub MCP tools without regression

### User Story P2 – Work Item Integration
**Narrative**: As a project manager using Azure DevOps, I want PAW to track work using Azure DevOps work items instead of GitHub Issues so I can maintain my existing project management workflow and keep all project artifacts in one platform.

**Independent Test**: Link a PAW workflow to an Azure DevOps work item, progress through workflow stages, and verify the work item is updated with status comments and PR links at each milestone.

**Acceptance Scenarios**:
1. Given an Azure DevOps work item URL, When I initialize a PAW workflow, Then WorkflowContext.md captures the work item URL in the "Issue URL" field (platform-agnostic)
2. Given an existing WorkflowContext.md with "GitHub Issue" field, When a PAW agent reads the context, Then it successfully extracts the issue/work item URL from the legacy field name
3. Given an Azure DevOps work item URL, When a PAW agent detects the platform, Then it automatically extracts organization, project, and work item ID for work item MCP operations (status updates, comments, PR linking)
4. Given workflow progress through stages, When the Status Agent runs, Then it posts status update comments to the Azure DevOps work item
5. Given a phase PR is merged, When the Status Agent updates status, Then the work item reflects the completed phase with a link to the merged PR
6. Given a work item comment is created, When I view it in Azure DevOps, Then it contains the status dashboard with artifact links and phase checklist

### Edge Cases

- **Missing MCP Server**: Azure DevOps MCP server not configured when Azure DevOps repository detected - agents should provide clear error message with setup instructions
- **Platform Migration**: Repository migrated from GitHub to Azure DevOps mid-workflow - agents should detect platform change and adapt or prompt for explicit confirmation
- **Work Item Type Variations**: Azure DevOps work item types (Bug, Task, User Story, etc.) have different field requirements - agents should handle common types or default to generic "Task" type
- **Organization Access**: User lacks permission to access Azure DevOps organization specified in WorkflowContext.md - MCP server authentication flow should handle this gracefully
- **Repository Not Found**: Azure DevOps project or repository specified in Remote field does not exist or user lacks access - agents should provide clear error messages indicating which resource is inaccessible
- **PR Link Formatting**: Azure DevOps PR links have different URL structure than GitHub - Status Agent must format links correctly for each platform
- **Multiple Remotes**: Repository has multiple git remotes configured - agents use the Remote field value from WorkflowContext.md to determine which remote to use
- **Remote Resolution**: Remote field contains a remote name (e.g., "origin") rather than a URL - agents must resolve the remote name to its URL for platform detection
- **Invalid Remote**: Remote field references a remote that doesn't exist or URL cannot be parsed - agents should provide clear error message prompting user to verify remote configuration
- **Legacy Field Names**: WorkflowContext.md uses "GitHub Issue" instead of "Issue URL" - agents should read from either field name and continue to function correctly

## Requirements

### Functional Requirements

- **FR-001**: PAW agents shall detect the platform (GitHub or Azure DevOps) by examining the git remote URL specified in the Remote field of WorkflowContext.md (Stories: P1)

- **FR-002**: PAW agents shall support Azure DevOps repository operations (branch creation, PR creation, PR updates) through Azure DevOps MCP tools when platform is Azure DevOps (Stories: P1)

- **FR-003**: PAW agents shall support Azure DevOps work item operations (read, comment, link to PRs) through Azure DevOps MCP tools when platform is Azure DevOps (Stories: P2)

- **FR-004**: Agents shall accept both "Issue URL" (preferred) and "GitHub Issue" (legacy) field names when reading WorkflowContext.md to maintain backward compatibility with existing workflows (Stories: P2)

- **FR-004A**: When creating new WorkflowContext.md files, agents shall use "Issue URL" as the field name to accommodate both GitHub Issues and Azure DevOps Work Items (Stories: P2)

- **FR-005**: Agents shall extract repository identifiers (organization/project/repository for Azure DevOps; owner/repository for GitHub) from the Remote field URL in WorkflowContext.md (Stories: P1)

- **FR-006**: When the Remote field contains a remote name (e.g., "origin"), agents shall resolve it to its URL using git configuration before performing platform detection (Stories: P1)

- **FR-007**: Agents shall extract platform-specific work item identifiers (organization, project, work item ID for Azure DevOps; owner, repo, issue number for GitHub) at runtime from the Issue URL rather than storing them separately in WorkflowContext.md (Stories: P2)

- **FR-008**: Status Agent shall post status update comments to Azure DevOps work items with the same structure as GitHub issue comments (Stories: P2)

- **FR-009**: Status Agent shall format PR links correctly for Azure DevOps (`https://dev.azure.com/<org>/<project>/_git/<repo>/pullrequest/<id>`) (Stories: P2)

- **FR-010**: Implementation Review Agent shall open PRs in Azure DevOps with PR titles prefixed by Work Title (Stories: P1)

- **FR-011**: Implementation Review Agent shall link Azure DevOps PRs to work items using `wit_link_work_item_to_pull_request` (Stories: P2)

- **FR-012**: PR Agent shall craft final PR descriptions with Azure DevOps-compatible artifact links and format (Stories: P1)

- **FR-013**: All agents shall continue to support GitHub operations without regression when platform is GitHub (Stories: P1)

- **FR-014**: Agents shall provide clear error messages when Azure DevOps MCP server is not configured but Azure DevOps operations are required (Stories: P1)

- **FR-015**: Platform detection shall parse Azure DevOps remote URLs (both `dev.azure.com` and legacy `visualstudio.com` formats) (Stories: P1)

- **FR-016**: When work item URL is provided, agents shall extract organization, project, and work item ID for MCP tool calls (Stories: P2)

- **FR-017**: Agents shall handle authentication failures from Azure DevOps MCP server by providing actionable error messages (Stories: P1)

- **FR-018**: Agents shall validate that the remote specified in the Remote field exists and is accessible before proceeding with workflow operations (Stories: P1)

- **FR-019**: When platform detection fails due to invalid or missing Remote field, agents shall provide clear error messages prompting user to verify remote configuration (Stories: P1)

### Key Entities

- **Platform**: Enumeration indicating source control platform (GitHub or Azure DevOps)
- **Work Item Context**: Container for platform-specific work tracking identifiers (GitHub Issue URL or Azure DevOps Work Item URL with organization/project)
- **Repository Context**: Container for platform-specific repository identifiers (GitHub owner/repo or Azure DevOps organization/project/repo) derived from the Remote field in WorkflowContext.md
- **MCP Tool Router**: Conceptual routing mechanism that directs operations to appropriate MCP server based on platform detection
- **Remote URL**: The git remote URL stored in the Remote field of WorkflowContext.md, used as the authoritative source for platform and repository detection

### Cross-Cutting / Non-Functional

- **Backward Compatibility**: Existing GitHub-based PAW workflows must continue to function without modification
- **Error Handling**: All platform detection and routing failures must produce clear, actionable error messages
- **Configuration Simplicity**: Platform detection should be automatic in 90% of cases; explicit configuration only for edge cases
- **Documentation Clarity**: Users must be able to set up Azure DevOps support by following clear setup instructions in PAW documentation

## Success Criteria

- **SC-001**: A PAW workflow initialized with an Azure DevOps work item URL successfully creates WorkflowContext.md with the URL in the "Issue URL" field, and agents correctly detect the platform and extract organization/project/work-item-id at runtime (FR-001, FR-004A, FR-007)

- **SC-002**: A PAW workflow detects the repository platform and identifiers by parsing the Remote field URL in WorkflowContext.md (FR-001, FR-005)

- **SC-003**: When the Remote field contains a remote name (e.g., "origin"), agents successfully resolve it to its URL and perform platform detection (FR-006)

- **SC-004**: Implementation Review Agent successfully opens a phase PR in Azure DevOps with correct source/target branches and Work Title prefix (FR-002, FR-010)

- **SC-005**: Status Agent successfully posts status update comments to an Azure DevOps work item with formatted artifact links and phase checklist (FR-003, FR-008, FR-009)

- **SC-006**: PR Agent successfully creates a final PR in Azure DevOps with Azure DevOps-compatible artifact links (FR-002, FR-012)

- **SC-007**: All existing PAW GitHub workflows continue to function without modification after Azure DevOps support is added (FR-013)

- **SC-008**: When an Azure DevOps repository is detected but the MCP server is not configured, agents display an error message with setup instructions (FR-014)

- **SC-009**: Agents successfully read issue/work item URLs from both "Issue URL" (new) and "GitHub Issue" (legacy) field names in WorkflowContext.md (FR-004)

- **SC-010**: Azure DevOps PRs are automatically linked to their corresponding work items (FR-011, FR-016)

- **SC-011**: Platform detection correctly identifies Azure DevOps repositories from both `dev.azure.com` and legacy `visualstudio.com` remote URLs (FR-015)

- **SC-012**: Authentication errors from Azure DevOps MCP server result in clear error messages guiding users to authentication setup (FR-017)

- **SC-013**: When the Remote field references an invalid or inaccessible remote, agents provide clear error messages before attempting operations (FR-018, FR-019)

## Assumptions

- **Azure DevOps MCP Server Availability**: The Azure DevOps MCP server (https://github.com/microsoft/azure-devops-mcp) is installed and configured in the user's VS Code environment before attempting Azure DevOps operations

- **MCP Tool Naming Convention**: Azure DevOps MCP tools follow the naming pattern `mcp_azuredevops_*` or similar distinctive prefix that allows routing logic to distinguish them from GitHub tools

- **Authentication Handled by MCP Server**: Authentication with Azure DevOps (via PAT or OAuth) is managed entirely by the Azure DevOps MCP server; PAW agents do not handle credentials directly

- **Work Item Default Type**: When creating work items (if needed), PAW will default to "Task" or "User Story" work item type unless specified otherwise

- **Single Platform Per Workflow**: Each PAW workflow operates within a single platform context (either GitHub or Azure DevOps) determined by the Remote field in WorkflowContext.md

- **Remote Field Exists**: WorkflowContext.md always contains a valid Remote field pointing to a git remote (defaulting to "origin" if not explicitly specified)

- **Remote Name Resolution**: When the Remote field contains a remote name rather than a URL, the git repository has that remote configured and it can be resolved via git configuration

- **Repository Access**: Users have appropriate permissions in Azure DevOps to create branches, open PRs, and comment on work items (same permission model as GitHub assumption)

- **Git Operations Unchanged**: Local git operations (commit, branch, checkout) remain platform-agnostic and work identically for both GitHub and Azure DevOps

- **WorkflowContext.md Schema Evolution**: The WorkflowContext.md schema can be extended with new fields without breaking existing workflows (backward compatible field additions)

## Scope

### In Scope:
- Platform detection logic based on Remote field URL in WorkflowContext.md
- Remote name resolution (e.g., "origin" → URL) for platform detection
- WorkflowContext.md schema updates to support Azure DevOps (use "Issue URL" for new files; support both "Issue URL" and "GitHub Issue" when reading)
- Azure DevOps repository operations (branches, PRs, PR comments)
- Azure DevOps work item operations (read, comment, link to PRs)
- Status Agent updates for Azure DevOps work item status tracking
- Implementation Review Agent updates for Azure DevOps PR creation
- PR Agent updates for Azure DevOps final PR creation
- Error handling for missing Azure DevOps MCP server
- Error handling for invalid or inaccessible Remote field references
- Documentation of Azure DevOps setup process

### Out of Scope:
- Installation or configuration of the Azure DevOps MCP server itself (external dependency)
- Cross-repository workflows where work item and code repository are in different locations
- Azure DevOps pipeline/build integration (beyond what's provided by MCP server)
- Azure DevOps wiki integration
- Azure DevOps test plan integration
- Migration tools to convert GitHub workflows to Azure DevOps
- Support for platforms other than GitHub and Azure DevOps (GitLab, Bitbucket, etc.)
- Advanced Azure DevOps features (work item queries, dashboards, reports)
- Multi-repository workflows (changes spanning multiple repositories in a single workflow)

## Dependencies

- **Azure DevOps MCP Server**: External MCP server package (`@azure-devops/mcp`) must be installed and configured in VS Code
- **GitHub MCP Server**: Existing dependency, must remain functional for GitHub workflows
- **VS Code MCP Support**: VS Code must support MCP server configuration and tool routing
- **Git**: Local git installation for repository operations (platform-agnostic)

## Risks & Mitigations

- **Risk**: Azure DevOps MCP server API changes could break PAW integration
  - **Impact**: Medium - Would affect all Azure DevOps users
  - **Mitigation**: Pin to stable Azure DevOps MCP server versions; test against documented API surface; monitor MCP server releases

- **Risk**: Platform detection may incorrectly identify platform in edge cases
  - **Impact**: Medium - Could route operations to wrong platform
  - **Mitigation**: Provide explicit platform override in WorkflowContext.md; comprehensive detection testing; clear error messages

- **Risk**: Azure DevOps work item types have varying field requirements
  - **Impact**: Low - Some work item operations might fail due to missing required fields
  - **Mitigation**: Use common work item types (Task, User Story); document known limitations; handle errors gracefully with field-specific guidance

- **Risk**: Users may not have Azure DevOps MCP server configured when needed
  - **Impact**: High - Workflow cannot proceed without MCP server
  - **Mitigation**: Early detection with clear setup instructions; documentation with step-by-step MCP server installation; fallback to clear error messages

- **Risk**: Backward compatibility issues with existing GitHub workflows
  - **Impact**: High - Would break existing users
  - **Mitigation**: Comprehensive regression testing; careful field naming to avoid conflicts; maintain GitHub as default when platform is ambiguous

- **Risk**: Azure DevOps URL formats may vary or change
  - **Impact**: Low - Platform detection or link formatting could break
  - **Mitigation**: Support both modern and legacy URL formats; use URL parsing rather than string matching; test against known URL variations

- **Risk**: Repository inference may fail when the Remote field is invalid or the remote doesn't exist
  - **Impact**: Medium - User cannot proceed until Remote field is corrected
  - **Mitigation**: Provide clear error messages with guidance on verifying git remote configuration; suggest using `git remote -v` to check available remotes; validate Remote field early in workflow initialization

## References

- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/31
- **Research**: .paw/work/azure-devops/SpecResearch.md
- **External**: 
  - Azure DevOps MCP Server: https://github.com/microsoft/azure-devops-mcp
  - Azure DevOps REST API Documentation: https://learn.microsoft.com/en-us/rest/api/azure/devops/
  - PAW Specification: paw-specification.md

## Glossary

- **Platform**: The source control and work tracking platform (GitHub or Azure DevOps)
- **Work Item**: Azure DevOps term for trackable work units (equivalent to GitHub Issues)
- **Organization**: Azure DevOps top-level container (equivalent to GitHub Owner/Organization)
- **Project**: Azure DevOps container for repositories and work items (no direct GitHub equivalent)
- **MCP Server**: Model Context Protocol server providing tools for platform-specific operations
- **Platform Detection**: Logic to identify which platform (GitHub or Azure DevOps) the current repository uses by parsing the Remote field URL
- **Repository Context**: The organization/project/repository identifiers needed for platform-specific operations, derived from the Remote field
- **Remote Field**: The WorkflowContext.md field containing the git remote name (e.g., "origin") or URL used for platform and repository detection
- **Issue URL**: Platform-agnostic field name in WorkflowContext.md that contains either a GitHub Issue URL or Azure DevOps Work Item URL (replaces legacy "GitHub Issue" field name)
- **Legacy Field Support**: Backward compatibility mechanism where agents read from either "Issue URL" (preferred) or "GitHub Issue" (legacy) field names
