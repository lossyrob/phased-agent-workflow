# Spec Research: Azure DevOps Support

## Summary

This research documents how PAW currently integrates with GitHub through the GitHub MCP server and defines the functional requirements for Azure DevOps support via the Azure DevOps MCP server. The findings reveal that GitHub operations are centralized through MCP tools exposed to all agents, with no direct API calls or credential management within agent prompts. Azure DevOps support will follow the same architectural pattern, leveraging the Azure DevOps MCP server as the abstraction layer.

## Internal System Behavior

### Question 1: GitHub API Operations Used by PAW Agents

**Repository Operations:**
- **Branch Management**: Agents reference branch creation and checkout operations but do not directly invoke GitHub APIs. The git commands are executed through `run_in_terminal` tool (e.g., `git checkout -b <branch>`, `git push origin <branch>`).
- **Commit Operations**: Implemented via local git commands (`git commit`, `git add`), not GitHub APIs.
- **Push Operations**: Executed through `git push <remote> <branch>` terminal commands.

**Pull Request Operations:**
- **Create PR**: Agents reference PR creation but rely on the GitHub MCP server tools (prefixed with `mcp_github_`).
- **Update PR**: PR descriptions contain agent-managed comment blocks (`<!-- BEGIN:AGENT-SUMMARY -->` / `<!-- END:AGENT-SUMMARY -->`).
- **Read PR**: Agents read PR status, comments, and review threads through GitHub MCP tools.
- **Comment on PR**: Review responses and summary comments posted via MCP tools.

**Issue Operations:**
- **Read Issue**: Status Agent reads issues via `mcp_github_github_get_issue`.
- **Comment on Issue**: Status Agent posts status updates as new comments via `mcp_github_github_add_issue_comment`.
- **Link PR to Issue**: PR descriptions reference issues; explicit API linking not observed in agent instructions.

**GitHub-Specific Features:**
- **PR Review Comments**: Implementation Review Agent posts comprehensive summary comments after addressing review feedback.
- **PR Status Checks**: Referenced conceptually (e.g., "automated checks pass") but not directly managed by agents.
- **Branch Protection**: Not directly manipulated by agents; assumed to be pre-configured.

### Question 2: GitHub Authentication and Repository Access Configuration

**Authentication:**
- PAW agents do not handle GitHub authentication directly. The GitHub MCP server manages authentication outside the agent scope.
- Agents assume GitHub credentials are already configured when MCP tools are available.
- No explicit credential parameters appear in WorkflowContext.md or agent prompts.

**Repository Context:**
- **Remote**: WorkflowContext.md includes a `Remote` field (defaults to `origin` if omitted).
- **Repository Discovery**: Agents determine the current repository from the workspace context, not through explicit configuration.
- **Owner/Repo Extraction**: When calling GitHub MCP tools, agents appear to need owner and repo parameters, which they must derive from the repository context or prompt the user.

**URL Handling:**
- GitHub Issue links stored in WorkflowContext.md (format: `https://github.com/<owner>/<repo>/issues/<number>`).
- Agents parse these URLs to extract owner, repo, and issue numbers for MCP tool calls.

### Question 3: WorkflowContext.md Structure and GitHub-Related Parameters

**Current WorkflowContext.md Format:**
```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>
Target Branch: <target_branch>
GitHub Issue: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

**GitHub-Specific Fields:**
- **GitHub Issue**: Full URL to the GitHub issue (`https://github.com/<owner>/<repo>/issues/<number>`).
- **Remote**: Git remote name, typically `origin` (defaults if omitted).

**Azure DevOps Equivalent Fields Needed:**
- **Azure DevOps Work Item**: Full URL to the work item (format: `https://dev.azure.com/<organization>/<project>/_workitems/edit/<id>`).
- **Azure DevOps Organization**: Organization name (e.g., `contoso`).
- **Azure DevOps Project**: Project name within the organization.
- **Remote**: Git remote name (unchanged concept, applies to both GitHub and Azure DevOps repositories).

### Question 4: GitHub Repository Context Detection and Validation

**Initialization:**
- Agents rely on the workspace being opened in a Git repository.
- Repository owner and name are not explicitly stored in WorkflowContext.md but derived when needed.
- The `Remote` field in WorkflowContext.md indicates which git remote to use.

**Validation:**
- Agents verify branches exist using terminal commands (`git branch --list <branch_name>`).
- Agents check if they're on the correct branch using `git branch --show-current`.
- No explicit "repository type" detection (GitHub vs. other) observed in agent instructions.

**Implication for Azure DevOps:**
- Agents will need a mechanism to determine if the workspace uses GitHub or Azure DevOps.
- This could be indicated by:
  - Presence of Azure DevOps Work Item URL vs. GitHub Issue URL in WorkflowContext.md
  - Detection of repository remote URL format (github.com vs. dev.azure.com)
  - Explicit platform field in WorkflowContext.md

### Question 5: Azure DevOps MCP Server Available Operations

Based on the Azure DevOps MCP server documentation (https://github.com/microsoft/azure-devops-mcp):

**Core Operations:**
- `core_list_projects`: List projects in the organization
- `core_list_project_teams`: List teams for a project
- `core_get_identity_ids`: Get identity IDs for unique names

**Work Item Operations:**
- `wit_my_work_items`: List user's work items
- `wit_get_work_item`: Get work item by ID
- `wit_create_work_item`: Create new work item
- `wit_update_work_item`: Update work item fields
- `wit_add_work_item_comment`: Add comment to work item
- `wit_list_work_item_comments`: List comments on work item
- `wit_link_work_item_to_pull_request`: Link work item to PR
- `wit_add_artifact_link`: Link to branches, PRs, commits, builds

**Repository Operations:**
- `repo_list_repos_by_project`: List repositories in a project
- `repo_get_repo_by_name_or_id`: Get repository details
- `repo_list_branches_by_repo`: List branches in repository
- `repo_create_branch`: Create new branch
- `repo_list_pull_requests_by_repo_or_project`: List pull requests
- `repo_get_pull_request_by_id`: Get pull request details
- `repo_create_pull_request`: Create new pull request
- `repo_update_pull_request`: Update PR title, description, draft status, target branch
- `repo_update_pull_request_reviewers`: Add/remove reviewers
- `repo_list_pull_request_threads`: List comment threads on PR
- `repo_list_pull_request_thread_comments`: List comments in thread
- `repo_reply_to_comment`: Reply to PR comment
- `repo_resolve_comment`: Resolve comment thread
- `repo_create_pull_request_thread`: Create new comment thread

**Pipeline Operations:**
- `pipelines_get_builds`: List builds
- `pipelines_get_build_status`: Get build status
- `pipelines_run_pipeline`: Start pipeline run

**Mapping to PAW Needs:**

| PAW Operation | GitHub MCP Equivalent | Azure DevOps MCP Equivalent |
|---------------|----------------------|----------------------------|
| List user's work items | `github_search_issues` with author filter | `wit_my_work_items` |
| Get work item details | `github_get_issue` | `wit_get_work_item` |
| Comment on work item | `github_add_issue_comment` | `wit_add_work_item_comment` |
| Create branch | Local git + push | `repo_create_branch` |
| Create PR | `github_create_pull_request` | `repo_create_pull_request` |
| Update PR description | `github_update_pull_request` | `repo_update_pull_request` |
| List PR comments | `github_pull_request_read` (method: get_review_comments) | `repo_list_pull_request_threads` + `repo_list_pull_request_thread_comments` |
| Reply to PR comment | `github_add_comment_to_pending_review` or direct reply | `repo_reply_to_comment` |
| Link work item to PR | Embedded in PR description | `wit_link_work_item_to_pull_request` |

### Question 6: Azure DevOps Work Items vs. GitHub Issues

**GitHub Issues:**
- **States**: Open, Closed
- **State Reasons**: completed, not_planned, duplicate (when closing)
- **Types**: Issues (single type in base GitHub; Projects/Issues can have custom types)
- **Linking**: Issues linked to PRs through PR descriptions or keywords (Closes #123)
- **Comments**: Threaded comments on issue
- **Metadata**: Labels, Assignees, Milestones, Projects

**Azure DevOps Work Items:**
- **States**: New, Active, Resolved, Closed (state model varies by work item type)
- **Types**: Multiple built-in types (User Story, Task, Bug, Feature, Epic, etc.)
- **Hierarchy**: Work items can have parent-child relationships (e.g., Epic → Feature → User Story → Task)
- **Linking**: Explicit link types (Parent, Child, Related, Duplicate, etc.)
- **Comments**: Comments with discussion threads
- **Metadata**: Area Path, Iteration Path, Tags, Assigned To, custom fields

**Key Differences for PAW:**
1. **Type Specification**: Azure DevOps requires specifying work item type when creating (PAW may default to "Task" or "User Story").
2. **State Transitions**: Azure DevOps has richer state workflows; PAW should use common states (New, Active, Closed).
3. **Hierarchy Support**: Azure DevOps natively supports parent-child relationships; PAW could leverage this for phase tracking.
4. **Link Semantics**: Azure DevOps has explicit link types for relating work items to artifacts; PAW should use `wit_link_work_item_to_pull_request` and `wit_add_artifact_link`.

### Question 7: Azure DevOps Authentication Methods

Based on Azure DevOps MCP documentation and standard Azure DevOps practices:

**Personal Access Token (PAT):**
- **Use Case**: Individual developer access, CI/CD pipelines, automated tools
- **Scope**: Fine-grained permissions (Code: Read/Write, Work Items: Read/Write, etc.)
- **Management**: Created in user settings, can be scoped to specific organizations
- **MCP Server**: The Azure DevOps MCP server uses PAT for authentication (browser-based OAuth flow on first use)

**OAuth 2.0:**
- **Use Case**: Third-party applications requiring user consent
- **Flow**: Authorization code flow with refresh tokens
- **MCP Server**: The Azure DevOps MCP server documentation mentions browser-based OAuth login

**Managed Identity:**
- **Use Case**: Azure-hosted services (VMs, App Services, Functions) accessing Azure DevOps
- **Scope**: System-assigned or user-assigned identities
- **MCP Server**: Not explicitly mentioned in MCP server docs; typically used for service-to-service scenarios

**For PAW Integration:**
- **Primary Method**: PAT (same pattern as GitHub PAT)
- **MCP Server Handling**: Authentication handled by the Azure DevOps MCP server via browser-based OAuth flow
- **Agent Responsibility**: None—agents assume MCP server is authenticated

### Question 8: Azure DevOps Repository URLs and Project Structure

**Azure DevOps URL Structure:**
```
https://dev.azure.com/<organization>/<project>/_git/<repository>
```

Or legacy format:
```
https://<organization>.visualstudio.com/<project>/_git/<repository>
```

**Components:**
- **Organization**: Top-level container (e.g., `contoso`)
- **Project**: Container for repositories, work items, pipelines, etc.
- **Repository**: Git repository within a project

**GitHub URL Structure (for comparison):**
```
https://github.com/<owner>/<repository>
```

**Key Differences:**
1. **Three-Level Hierarchy**: Azure DevOps has Organization → Project → Repository (vs. GitHub's Owner → Repository)
2. **Multiple Repositories per Project**: A single Azure DevOps project can contain many repositories
3. **Work Item Scope**: Work items are scoped to projects, not repositories
4. **URL Patterns**:
   - Repository: `https://dev.azure.com/<org>/<project>/_git/<repo>`
   - Work Item: `https://dev.azure.com/<org>/<project>/_workitems/edit/<id>`
   - Pull Request: `https://dev.azure.com/<org>/<project>/_git/<repo>/pullrequest/<id>`

**Implications for PAW:**
- WorkflowContext.md needs to capture Organization and Project (not just repository)
- Agents need to pass organization and project parameters to Azure DevOps MCP tools
- Repository names alone are insufficient; project context is required

## Open Unknowns

**None** - All internal system behavior questions have been answered through examination of existing agent prompts, PAW specification, and Azure DevOps MCP server documentation.

## User-Provided External Knowledge (Manual Fill)

### Optional External/Context Questions

* [ ] **Azure DevOps API rate limits and best practices**: What are the rate limits for Azure DevOps REST APIs compared to GitHub? Are there throttling patterns PAW should implement?

* [ ] **Azure DevOps workflow patterns**: Are there organization-specific or team-specific workflow conventions in Azure DevOps (e.g., required work item states, mandatory fields) that PAW should accommodate?

* [ ] **Azure DevOps permission models**: What are common permission configurations in Azure DevOps that might affect agent operations? For example, do users typically have permission to create branches, open PRs, or comment on work items in enterprise settings?

---

**Research Complete**: All internal questions answered. External knowledge section available for manual completion if desired.
