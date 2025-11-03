---
mode: 'PAW-01B Spec Research Agent'
---
# Spec Research Prompt: Azure DevOps Support

Perform research to answer the following questions.

Target Branch: feature/azure-devops
GitHub Issue: 31
Additional Inputs: paw-specification.md

## Questions

1. What specific GitHub API operations do the current PAW agents rely on? Map out the core repository operations (branches, commits, PRs), issue operations (create, update, comment), and any GitHub-specific features used.

2. How is GitHub authentication and repository access currently configured across PAW agents? Document the credential management and repository URL handling.

3. What is the current structure of WorkflowContext.md parameters related to GitHub? Identify which fields would need Azure DevOps equivalents.

4. How do PAW agents currently detect and handle GitHub repository contexts? Document the initialization and validation logic.

5. What are the Azure DevOps MCP server's available operations based on its documentation? Map capabilities for repositories, pull requests, work items, and authentication.

6. How do Azure DevOps work items differ from GitHub Issues in terms of workflow states, linking, and metadata? Document key structural differences.

7. What are the different Azure DevOps authentication methods and their typical use cases? Document PAT, OAuth, and managed identity approaches.

8. How do Azure DevOps repository URLs and project structures differ from GitHub? Document organization/project/repository hierarchy.

### Optional External / Context

1. What are Azure DevOps API rate limits and best practices compared to GitHub's?

2. Are there Azure DevOps-specific workflow patterns or conventions that should influence the PAW implementation?

3. What are common Azure DevOps permission models that might affect agent operations?