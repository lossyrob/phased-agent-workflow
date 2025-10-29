# Feature Specification: Azure DevOps Support

**Branch**: feature/azure-devops  |  **Created**: 2025-10-23  |  **Status**: Draft
**Input Brief**: Enable PAW to work with Azure DevOps repositories, pull requests, and work items as an alternative to GitHub

## User Scenarios & Testing

### User Story P1 – Repository Operations with Azure DevOps
**Narrative**: As a developer using Azure DevOps, I want PAW agents to create branches, commit changes, and open PRs in my Azure DevOps repository so I can follow the same phased workflow as GitHub users without changing my team's existing toolchain.

**Independent Test**: Initialize a PAW workflow on an Azure DevOps repository, have an agent create a branch and open a PR, and verify the PR appears in Azure DevOps with correct links and metadata.

**Acceptance Scenarios**:
1. Given a repository with an Azure DevOps remote configured, When a PAW agent performs repository operations using natural language ("open a PR from branch X to branch Y"), Then Copilot resolves the remote context and operations succeed in the Azure DevOps repository
2. Given a PAW agent needs to create a branch, When the agent executes branch creation, Then the branch is created in the repository using the correct naming convention
3. Given a phase is complete, When the Implementation Review Agent runs, Then it opens a PR with the correct source and target branches
4. Given a PR is opened, When I view the PR, Then the description contains proper artifact links and PAW formatting
5. Given the MCP server is not configured, When an agent attempts repository operations, Then it provides a clear error message with setup instructions
6. Given a GitHub repository, When a PAW agent runs, Then it continues to work without regression

### User Story P2 – Work Item Integration
**Narrative**: As a project manager using Azure DevOps, I want PAW to track work using Azure DevOps work items instead of GitHub Issues so I can maintain my existing project management workflow and keep all project artifacts in one platform.

**Independent Test**: Link a PAW workflow to an Azure DevOps work item, progress through workflow stages, and verify the work item is updated with status comments and PR links at each milestone.

**Acceptance Scenarios**:
1. Given an Azure DevOps work item URL, When I initialize a PAW workflow, Then WorkflowContext.md captures the work item URL in the "Issue URL" field (platform-agnostic)
2. Given workflow progress through stages, When the Status Agent runs with the Issue URL, Then Copilot routes to the correct platform and posts status update comments to the work item
3. Given a phase PR is merged, When the Status Agent updates status, Then the work item reflects the completed phase with a link to the merged PR
4. Given a work item comment is created, When I view it in the work tracking system, Then it contains the status dashboard with artifact links and phase checklist

### Edge Cases

- **Missing MCP Server**: MCP server not configured for the repository platform - agents should provide clear error message with setup instructions
- **Platform Migration**: Repository migrated from one platform to another mid-workflow - Copilot adapts automatically based on current workspace remote URLs
- **Organization Access**: User lacks permission to access organization/project - MCP server authentication flow should handle this gracefully
- **Repository Not Found**: Repository specified in Remote field does not exist or user lacks access - agents should provide clear error messages
- **Multiple Remotes**: Repository has multiple git remotes configured - agents use the Remote field value from WorkflowContext.md; Copilot resolves the specified remote
- **Invalid Remote**: Remote field references a remote that doesn't exist - Copilot's git commands will fail with clear error messages prompting user to verify remote configuration

## Requirements

### Functional Requirements

- **FR-001**: When creating new WorkflowContext.md files, agents shall use "Issue URL" as the field name (Stories: P2)

- **FR-002**: Agents shall use platform-neutral language in all instructions (e.g., "issue/work item" not "GitHub Issue"; "open a PR" not "use github mcp tools") (Stories: P1, P2)

- **FR-003**: Agents shall respect existing conventions for remote references in chatmode files (e.g., if current instructions mention "origin" or "remote", maintain that pattern; if they don't, no change needed) (Stories: P1)

- **FR-004**: When performing repository operations, agents shall provide necessary context (branch names, Issue URLs, remote names per convention) and rely on Copilot's automatic workspace context resolution and MCP tool routing (Stories: P1, P2)

### Key Entities

- **Issue URL**: URL pointing to a GitHub Issue or Azure DevOps Work Item, stored in WorkflowContext.md
- **Remote**: Git remote name (e.g., "origin") stored in WorkflowContext.md, used by Copilot to resolve repository context

### Cross-Cutting / Non-Functional

- **Backward Compatibility**: Existing GitHub-based PAW workflows must continue to function without modification
- **Error Handling**: All platform detection and routing failures must produce clear, actionable error messages
- **Configuration Simplicity**: Platform detection should be automatic in 90% of cases; explicit configuration only for edge cases
- **Documentation Clarity**: Users must be able to set up Azure DevOps support by following clear setup instructions in PAW documentation
- **Testing Strategy**: All chatmode modifications shall be developed in a separate `chatmodes/` folder at the project root to avoid impacting the current GitHub-based workflow; each implementation phase shall require human testing in an actual Azure DevOps project before proceeding to the next phase

## Success Criteria

- **SC-001**: New WorkflowContext.md files created by agents use "Issue URL" as the field name (FR-001)

- **SC-002**: All agent chatmode files use platform-neutral language without referencing specific platforms or MCP tool prefixes (FR-002)

- **SC-003**: Agents follow existing conventions for remote references (maintain current patterns where present) (FR-003)

- **SC-004**: When agents perform operations like "open a PR from branch X to branch Y" with workspace context, Copilot successfully routes to the correct MCP tools for both GitHub and Azure DevOps repositories (FR-004)

- **SC-006**: All existing PAW GitHub workflows continue to function without modification (implicit requirement)

## Assumptions

- **Azure DevOps MCP Server Availability**: The Azure DevOps MCP server is installed and configured in the user's VS Code environment before attempting Azure DevOps operations

- **Copilot Workspace Context Resolution**: Copilot has access to workspace git context (remotes, branches, repository URL) and can autonomously resolve remote names to URLs using git commands (empirically validated through testing)

- **Copilot MCP Routing**: Copilot's MCP integration examines workspace context (git remotes, Issue URLs) and automatically routes operations to the appropriate MCP server (GitHub or Azure DevOps) without requiring explicit platform detection or URL parsing in agent instructions (empirically validated through testing)

- **Authentication Handled by MCP Server**: Authentication with GitHub or Azure DevOps is managed entirely by the respective MCP servers; PAW agents do not handle credentials directly

- **Remote Field Exists**: WorkflowContext.md always contains a valid Remote field pointing to a git remote (defaulting to "origin" if not explicitly specified)

- **Repository Access**: Users have appropriate permissions to create branches, open PRs, and comment on issues/work items in their platform of choice

- **Git Operations Unchanged**: Local git operations (commit, branch, checkout) remain platform-agnostic and work identically for both GitHub and Azure DevOps

## Scope

### In Scope:
- WorkflowContext.md field name updates (use "Issue URL" for new files; support both "Issue URL" and "GitHub Issue" when reading)
- Platform-neutral language in all agent instructions (e.g., "issue/work item" instead of "GitHub Issue")
- Platform-neutral language in all agent instructions (e.g., "issue/work item" instead of "GitHub Issue")
- Removing explicit MCP tool namespace references from agent instructions (e.g., "use github mcp tools" → "open a PR")
- Respecting existing conventions for remote references in chatmode files
- Error handling for missing MCP servers with clear setup instructions
- Documentation of Azure DevOps setup process

### Out of Scope:
- Installation or configuration of the Azure DevOps MCP server itself (external dependency)
- Explicit platform detection logic in agent instructions (Copilot handles this automatically via workspace context)
- Explicit remote name resolution in agent instructions (Copilot handles this automatically)
- Storing platform-specific identifiers (organization, project, etc.) in WorkflowContext.md (extracted from URLs at runtime by MCP layer)
- URL format parsing or validation in agent instructions (Copilot and MCP servers handle this)
- Cross-repository workflows where work item and code repository are in different locations
- Azure DevOps pipeline/build integration (beyond what's provided by MCP server)
- Azure DevOps wiki, test plan, or advanced feature integration
- Migration tools to convert GitHub workflows to Azure DevOps
- Support for platforms other than GitHub and Azure DevOps (GitLab, Bitbucket, etc.)
- Multi-repository workflows (changes spanning multiple repositories in a single workflow)

## Dependencies

- **Azure DevOps MCP Server**: External MCP server package (`@azure-devops/mcp`) must be installed and configured in VS Code
- **GitHub MCP Server**: Existing dependency, must remain functional for GitHub workflows
- **VS Code MCP Support**: VS Code must support MCP server configuration and tool routing
- **Git**: Local git installation for repository operations (platform-agnostic)

## Risks & Mitigations

- **Risk**: MCP server not configured when user attempts Azure DevOps operations
  - **Impact**: High - Workflow cannot proceed without MCP server
  - **Mitigation**: Clear error messages with setup instructions; documentation with step-by-step MCP server installation guide

- **Risk**: Backward compatibility issues with existing GitHub workflows
  - **Impact**: High - Would break existing users
  - **Mitigation**: Support both "Issue URL" and "GitHub Issue" field names; comprehensive regression testing; default to current behavior when ambiguous

- **Risk**: Copilot's MCP routing may not correctly identify platform from URLs in some edge cases
  - **Impact**: Medium - Operations routed to wrong platform
  - **Mitigation**: Rely on VS Code's MCP routing behavior (external dependency); document known limitations; provide troubleshooting guidance

- **Risk**: Remote field may contain invalid or non-existent remote name
  - **Impact**: Medium - User cannot proceed until Remote field is corrected
  - **Mitigation**: Validate Remote field early; provide clear error messages with guidance on checking `git remote -v`; suggest common remote names

## References

- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/31
- **Research**: .paw/work/azure-devops/SpecResearch.md (see Appendix for empirical Copilot MCP routing experiments)
- **External**: 
  - Azure DevOps MCP Server: https://github.com/microsoft/azure-devops-mcp
  - Azure DevOps REST API Documentation: https://learn.microsoft.com/en-us/rest/api/azure/devops/
  - PAW Specification: paw-specification.md

## Glossary

- **Issue URL**: Platform-agnostic field name in WorkflowContext.md that contains either a GitHub Issue URL or Azure DevOps Work Item URL (replaces legacy "GitHub Issue" field name)
- **Remote**: Git remote name (e.g., "origin") stored in WorkflowContext.md; Copilot resolves to URL automatically when needed
- **Work Item**: Azure DevOps term for trackable work units (equivalent to GitHub Issues)
- **MCP Server**: Model Context Protocol server providing tools for platform-specific operations
- **Platform-Neutral Language**: Agent instructions that describe operations generically (e.g., "open a PR from branch X to branch Y") without referencing specific platforms or MCP tool names, allowing Copilot to autonomously resolve workspace context and route to appropriate MCP tools
- **Copilot MCP Routing**: Automatic mechanism by which Copilot examines workspace context (git remotes, Issue URLs) and selects appropriate MCP server tools without explicit instruction from agents
