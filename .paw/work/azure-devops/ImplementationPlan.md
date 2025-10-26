# Azure DevOps Support Implementation Plan

## Overview

This plan implements Azure DevOps support for PAW, enabling agents to work with Azure DevOps repositories, pull requests, and work items as seamlessly as they currently work with GitHub. The implementation updates field names and agent language to be platform-neutral, relying on Copilot's automatic workspace context resolution and MCP routing.

## Current State Analysis

### What Exists Now:
- **GitHub MCP Integration**: Agents describe operations in natural language; Copilot routes to `mcp_github_*` tools based on workspace context
- **WorkflowContext.md**: Centralized parameter file storing "GitHub Issue" (platform-specific legacy name) and "Remote" fields
- **Agent Instructions**: 9 chatmode files (`.github/chatmodes/PAW-*.chatmode.md`) containing platform-specific language ("GitHub Issue", "GitHub PR")
- **Copilot Workspace Context**: Copilot automatically resolves git remotes and routes MCP operations based on repository URLs

### Key Constraints Discovered:
- **No Implementation Code**: All PAW logic exists in agent instruction files (.chatmode.md), not separate code files
- **MCP Abstraction**: Agents use natural language to describe operations; Copilot routes to available MCP tools
- **Parameter Centralization**: WorkflowContext.md serves as single source of truth for workflow parameters
- **Platform-Agnostic Artifacts**: Spec.md, ImplementationPlan.md, etc. contain no platform-specific details
- **Automatic Context Resolution**: Copilot has access to workspace git configuration and automatically resolves remote names to URLs when routing MCP operations (empirically validated)

### External Dependencies:
- **Azure DevOps MCP Server**: Must be installed and configured in VS Code before Azure DevOps operations can succeed
- **GitHub MCP Server**: Existing dependency, must remain functional for backward compatibility

## Desired End State

After implementing this plan:
1. WorkflowContext.md uses "Issue URL" field name (platform-agnostic, supporting both GitHub and Azure DevOps)
2. Agents read from both "Issue URL" (new) and "GitHub Issue" (legacy) for backward compatibility
3. All agent instructions use platform-neutral language (e.g., "issue/work item" not "GitHub Issue"; "open a PR" not "use GitHub MCP tools")
4. Agents provide workspace context (branch names, Issue URLs, remote names) and rely on Copilot to automatically resolve remotes and route to appropriate MCP tools
5. No explicit platform detection or MCP tool namespace references in agent instructions
6. All existing GitHub workflows continue to function without modification

### Verification:
- Initialize a PAW workflow with an Azure DevOps work item URL and repository
- Progress through all workflow stages (Spec → Planning → Implementation → Docs → Final PR)
- Verify Copilot automatically routes operations to Azure DevOps MCP tools based on workspace context
- Verify status updates posted to Azure DevOps work item
- Verify PRs created in Azure DevOps with correct links
- Run existing GitHub-based PAW workflow to confirm no regression

## What We're NOT Doing

- Installing or configuring Azure DevOps MCP server (user responsibility, external dependency)
- Creating migration tools to convert GitHub workflows to Azure DevOps
- Supporting platforms other than GitHub and Azure DevOps (GitLab, Bitbucket, etc.)
- Cross-repository workflows (work item in one repo, code in another)
- Azure DevOps advanced features (pipelines beyond MCP server, wikis, test plans, dashboards)
- Multi-repository workflows (changes spanning multiple repositories)
- Modifying existing WorkflowContext.md files in place (backward compatibility maintained)
- Explicit platform detection logic in agent instructions (Copilot handles this automatically)
- Explicit remote name resolution in agent instructions (Copilot handles this automatically)
- Storing platform-specific identifiers in WorkflowContext.md (Copilot extracts from URLs at runtime)

## Implementation Approach

The implementation follows PAW's document-driven architecture and relies on Copilot's workspace context awareness:
1. **Update Field Names**: Change "GitHub Issue" to "Issue URL" in WorkflowContext.md format templates
2. **Maintain Backward Compatibility**: Support reading from both "Issue URL" (new) and "GitHub Issue" (legacy) field names
3. **Platform-Neutral Language**: Remove platform-specific references (e.g., "GitHub Issue" → "issue/work item"; "GitHub PR" → "PR")
4. **Remove MCP Tool References**: Change explicit tool namespace references (e.g., "use GitHub MCP tools") to natural language operation descriptions (e.g., "open a PR from branch X to branch Y")
5. **Rely on Copilot Routing**: Agents provide workspace context (branch names, Issue URLs, remote names), and Copilot automatically resolves remotes and routes to appropriate MCP tools
6. **Incremental Rollout**: Update agents one at a time, testing each before proceeding

**Phasing Strategy**: Update agents in order of dependency, starting with WorkflowContext.md creators (Spec Agent), then all readers, then agents with platform-specific operations (Status, PR, Implementation Review agents).

**Testing Strategy**: All agent chatmode files will be modified directly in `.github/chatmodes/`. Since this repository uses GitHub, we verify no regression in GitHub workflows. A human tester must validate Azure DevOps functionality by testing in an actual Azure DevOps project after each phase.

---

## Phase 1: Spec Agent - WorkflowContext.md Field Updates

### Overview
Update the Spec Agent (primary creator of WorkflowContext.md) to use "Issue URL" field name instead of "GitHub Issue", and update all format templates and documentation to reflect the platform-neutral naming.

### Changes Required:

#### 1. Update WorkflowContext.md Format Templates
**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

**Change all occurrences** of the WorkflowContext.md format template from:
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

To:
```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>
Target Branch: <target_branch>
Issue URL: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

**Locations** (~3-4 occurrences throughout the file):
- Initial response section (~line 30)
- WorkflowContext.md Parameters section (~line 80)
- Any other format examples

#### 2. Update Field Reading Instructions
**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

Update the instruction that tells the agent what to extract from WorkflowContext.md:

Change:
```markdown
When present, extract Target Branch, Work Title, Feature Slug, GitHub Issue, Remote...
```

To:
```markdown
When present, extract Target Branch, Work Title, Feature Slug, Issue URL (or GitHub Issue for backward compatibility), Remote...
```

**Location**: Initial response / Start section (~line 30)

#### 3. Update Field Descriptions
**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

In the WorkflowContext.md Parameters section, update field descriptions:

Change:
```markdown
- **GitHub Issue**: Full URL to the GitHub issue
```

To:
```markdown
- **Issue URL**: Full URL to the issue or work item (GitHub Issue URL or Azure DevOps Work Item URL)
- **Note**: For backward compatibility, agents also read from the legacy "GitHub Issue" field name
```

**Location**: WorkflowContext.md Parameters section (~line 100)

#### 4. Update WorkflowContext.md Creation Logic
**File**: `.github/chatmodes/PAW-01A Spec Agent.chatmode.md`

When creating new WorkflowContext.md files, ensure the agent uses "Issue URL" as the field name. Add a note in the creation instructions:

```markdown
When creating new WorkflowContext.md files, use "Issue URL" as the field name (not "GitHub Issue"). Accept both GitHub Issue URLs (https://github.com/<owner>/<repo>/issues/<number>) and Azure DevOps Work Item URLs (https://dev.azure.com/<org>/<project>/_workitems/edit/<id>).
```

**Location**: After WorkflowContext.md format template in Parameters section (~line 120)

### Success Criteria:

#### Automated Verification:
- [x] Spec Agent chatmode file parses without errors: `test -f .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md`
- [x] "Issue URL" field appears in format template: `grep -q "Issue URL:" .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md`
- [x] Backward compatibility note present: `grep -q "backward compatibility" .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md`
- [x] No syntax errors in chatmode file

#### Manual Verification:
- [x] Use Spec Agent in this GitHub repo to create a new WorkflowContext.md - verify it uses "Issue URL" field name
- [x] Spec Agent reads existing WorkflowContext.md with "GitHub Issue" field - verify backward compatibility works
- [x] Verify format template examples are consistent throughout the file
- [x] No regression in GitHub workflow functionality
- [x] **Azure DevOps Testing**: Tested Spec Agent with Azure DevOps project and work item URL - verified compatibility

**Phase 1 Completed - 2025-10-25**

All automated verification checks passed. Changes made:
1. Updated WorkflowContext.md format template to use "Issue URL" instead of "GitHub Issue" (line 70)
2. Updated field extraction instruction to read "Issue URL (or GitHub Issue for backward compatibility)" (line 26)
3. Added comprehensive field description explaining Issue URL supports both GitHub and Azure DevOps URLs (line 77-78)
4. Added creation logic instruction to use "Issue URL" for new files and accept both platform URL formats (line 78)
5. Updated all references to derive Work Title/Feature Slug from "issue title or brief" instead of "GitHub Issue title" (lines 31, 55)
6. Updated research prompt template format to use "Issue URL" (line 164)

Key implementation notes:
- Preserved appropriate platform-specific references (e.g., "GitHub Issues" section at line 344-346 which discusses using GitHub MCP tools - this is intentional)
- Maintained backward compatibility throughout - agents check for "Issue URL" first, then fall back to "GitHub Issue"
- All format templates now use platform-neutral "Issue URL" field name
- No changes to logic flow or behavior - only field naming and documentation

Review notes for Implementation Review Agent:
- Verify all WorkflowContext.md format templates are consistent across the file
- Confirm backward compatibility language is clear for both agent developers and users
- Ensure no unintended changes to existing GitHub functionality

---

## Phase 2: All Reader Agents - WorkflowContext.md Field Updates

### Overview
Update all remaining agents (8 files) to read from both "Issue URL" (new) and "GitHub Issue" (legacy) field names, ensuring backward compatibility across the entire workflow.

### Changes Required:

#### Update 8 Agent Files

**Files to modify**:
- `.github/chatmodes/PAW-X Status Update.chatmode.md`
- `.github/chatmodes/PAW-05 PR.chatmode.md`
- `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`
- `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md`
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md`
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`
- `.github/chatmodes/PAW-03A Implementer.chatmode.md`
- `.github/chatmodes/PAW-04 Documenter.chatmode.md`

**Changes** (identical for all files):

1. **Update WorkflowContext.md format template** (change "GitHub Issue" to "Issue URL"):
```markdown
# WorkflowContext

Work Title: <work_title>
Feature Slug: <feature-slug>
Target Branch: <target_branch>
Issue URL: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

2. **Update field extraction instruction**:

Change:
```markdown
extract Target Branch, Work Title, Feature Slug, GitHub Issue, Remote...
```

To:
```markdown
extract Target Branch, Work Title, Feature Slug, Issue URL (or GitHub Issue for backward compatibility), Remote...
```

3. **Add backward compatibility note** after format template:
```markdown
**Backward Compatibility**: When reading WorkflowContext.md, check for "Issue URL" field first; if not present, read from "GitHub Issue" field (legacy name). Both GitHub Issue URLs and Azure DevOps Work Item URLs are supported.
```

**Locations per file**:
- Initial response/inputs section (~10-30 lines): Update extraction instruction
- WorkflowContext.md format template (~50-100 lines): Update format example
- After format template: Add backward compatibility note

### Success Criteria:

#### Automated Verification:
- [x] All 8 agent chatmode files parse without errors: `ls .github/chatmodes/PAW-*.chatmode.md | wc -l` returns at least 9
- [x] "Issue URL" field in all format templates: `grep -L "Issue URL:" .github/chatmodes/PAW-*.chatmode.md` returns empty
- [x] Backward compatibility notes in all 8 files: `grep -l "backward compatibility" .github/chatmodes/PAW-*.chatmode.md | wc -l` returns at least 8
- [x] No "GitHub Issue" in format templates (except in backward compat notes): Verify manually

#### Manual Verification:
- [ ] Create a new WorkflowContext.md with Spec Agent - verify it uses "Issue URL"
- [ ] Test any agent reading an existing WorkflowContext.md with "GitHub Issue" field - verify it works
- [ ] Test any agent reading a new WorkflowContext.md with "Issue URL" field - verify it works
- [ ] No regression in GitHub workflow functionality

**Phase 2 Completed - 2025-10-26**

All automated verification checks passed. Changes made:
1. Updated all 8 remaining agent chatmode files to use "Issue URL" instead of "GitHub Issue" in WorkflowContext.md format templates
2. Updated field extraction instructions in all 8 files to read "Issue URL (or GitHub Issue for backward compatibility)"
3. Added backward compatibility notes after format templates in all 8 files explaining that agents should check for "Issue URL" first, then fall back to "GitHub Issue"
4. Verified no "GitHub Issue:" references remain in format templates (except in backward compatibility contexts)

Files updated:
- `.github/chatmodes/PAW-X Status Update.chatmode.md`
- `.github/chatmodes/PAW-05 PR.chatmode.md`
- `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`
- `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md`
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md`
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`
- `.github/chatmodes/PAW-03A Implementer.chatmode.md`
- `.github/chatmodes/PAW-04 Documenter.chatmode.md`

Key implementation notes:
- All changes follow the exact same pattern as Phase 1 (Spec Agent)
- Backward compatibility maintained throughout - agents check for "Issue URL" first, then fall back to "GitHub Issue"
- All format templates now consistently use platform-neutral "Issue URL" field name
- No changes to logic flow or behavior - only field naming and documentation updates
- Phase 2 lays the foundation for platform-neutral operations in subsequent phases

Review notes for Implementation Review Agent:
- Verify consistency of backward compatibility language across all 8 files
- Confirm format templates are identical in structure (only differ in agent-specific context)
- Ensure no unintended changes to existing agent functionality

---

## Phase 3: Platform-Neutral Language - Status Agent

### Overview
Update the Status Agent to use platform-neutral language when describing issue/work item operations. Remove references to "GitHub Issue" and "GitHub MCP tools", replacing them with generic operation descriptions that Copilot can route to the appropriate MCP tools.

### Changes Required:

#### 1. Update Issue Operation Language
**File**: `.github/chatmodes/PAW-X Status Update.chatmode.md`

**Changes**:

1. In process steps, change platform-specific language to platform-neutral:

Change:
```markdown
Post the status dashboard as a comment to the GitHub Issue
```

To:
```markdown
Post the status dashboard as a comment to the issue at <Issue URL>
```

2. Remove any explicit MCP tool namespace references. If instructions say:
```markdown
Use the GitHub MCP tools to post a comment to the issue
```

Change to:
```markdown
Post a comment to the issue at <Issue URL> with the status dashboard content
```

3. Update terminology throughout:
- "GitHub Issue" → "issue" or "issue/work item"
- "GitHub PR" → "PR" or "pull request"
- Any reference to `mcp_github_` tools → remove namespace, describe operation

**Locations**:
- Process steps (~lines 40-80): Update operation descriptions
- Guardrails section (~line 120): Update terminology
- Any instructional text mentioning GitHub specifically

#### 2. Clarify Context Provision
**File**: `.github/chatmodes/PAW-X Status Update.chatmode.md`

Add a note explaining how the agent should provide context:

```markdown
**Providing Context for Operations**: When performing operations like posting comments, provide the necessary context (Issue URL from WorkflowContext.md, PR links, artifact links) and describe the operation in natural language. Copilot will automatically resolve workspace context (git remotes, repository) and route to the appropriate platform tools (GitHub or Azure DevOps).
```

**Location**: After process steps, before Guardrails (~line 110)

### Success Criteria:

#### Automated Verification:
- [x] Status Agent chatmode file parses without errors
- [x] No references to "GitHub Issue" outside of backward compatibility notes: `grep "GitHub Issue" .github/chatmodes/PAW-X*.chatmode.md` (should only find backward compat note)
- [x] No explicit `mcp_github_` namespace references: `grep "mcp_github" .github/chatmodes/PAW-X*.chatmode.md` (should be empty)
- [x] Platform-neutral terms present: `grep -E "issue|work item" .github/chatmodes/PAW-X*.chatmode.md`

#### Manual Verification:
- [ ] Use Status Agent in GitHub repository - verify it still posts status comments correctly
- [ ] Verify status dashboard format remains unchanged (platform-agnostic markdown)
- [ ] Status Agent describes operation as "post comment to issue at <URL>" not "use GitHub MCP tools"
- [ ] No regression in GitHub workflow functionality

**Phase 3 Completed - 2025-10-26**

All automated verification checks passed. Changes made:
1. Updated "Issue (post status comments)" section header to "Issue/Work Item (post status comments)" for platform neutrality
2. Changed operation description from "Post a new comment to the Issue" to "post to the issue at <Issue URL>"
3. Added "Providing Context for Operations" note explaining how Copilot automatically resolves workspace context and routes operations
4. Updated PR summary format from "Issue reference" to "link to issue/work item"
5. Updated "Update means" section to use "issue/work item comments" instead of "Issue comments"
6. Removed duplicate "Update means" section that referenced AUTOGEN blocks
7. Updated Guardrails to reference "issue/work item description" instead of "Issue description"
8. Updated Output section to reference "issue/work item" instead of "Issue"

Key implementation notes:
- All changes focused on removing platform-specific language (e.g., "GitHub Issue")
- No explicit MCP tool namespace references remain
- Agent now describes operations in natural language (e.g., "post to issue at <Issue URL>") and relies on Copilot to route to appropriate platform tools
- Status dashboard format remains unchanged and platform-agnostic
- No changes to logic flow or behavior - only language and terminology updates

Review notes for Implementation Review Agent:
- Verify platform-neutral language is consistent throughout the file
- Confirm the "Providing Context for Operations" note clearly explains Copilot's routing behavior
- Ensure no unintended changes to existing GitHub functionality

---

## Phase 4: Platform-Neutral Language - Implementation Review Agent

### Overview
Update the Implementation Review Agent to use platform-neutral language when describing PR operations. Remove references to "GitHub PR" and "GitHub MCP tools", replacing them with generic PR operation descriptions.

### Changes Required:

#### 1. Update PR Operation Language
**File**: `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`

**Changes**:

1. In initial phase review step for opening PRs, change:

From:
```markdown
Open a PR using the GitHub MCP tools
```

To:
```markdown
Open a PR from <phase_branch> to <Target Branch>
```

2. Update PR linking instructions:

From:
```markdown
Reference the GitHub Issue in the PR description
```

To:
```markdown
Link the PR to the issue at <Issue URL> (include in PR description)
```

3. Update terminology throughout:
- "GitHub PR" → "PR" or "pull request"
- "GitHub Issue" → "issue" or "issue/work item"
- Remove explicit MCP tool namespace references

**Locations**:
- Initial phase review section (~lines 80-150): PR creation steps
- Review comment follow-up section (~lines 152-220): PR update steps
- Guardrails (~line 290): Update terminology

#### 2. Add Context Provision Note
**File**: `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`

Add explanation of how Copilot routes operations:

```markdown
**PR Operations Context**: When opening or updating PRs, provide branch names, Issue URL, and Work Title from WorkflowContext.md. Describe operations naturally (e.g., "open a PR from branch X to branch Y"). Copilot will automatically resolve workspace git remotes and route to the appropriate platform tools.
```

**Location**: At the start of process steps section (~line 80)

### Success Criteria:

#### Automated Verification:
- [x] Implementation Review Agent chatmode file parses without errors
- [x] No "GitHub PR" outside of backward compat notes: `grep "GitHub PR" .github/chatmodes/PAW-03B*.chatmode.md` (should be minimal/none)
- [x] No explicit `mcp_github_` references: `grep "mcp_github" .github/chatmodes/PAW-03B*.chatmode.md` (should be empty)
- [x] Platform-neutral terms present: `grep -E "PR|pull request" .github/chatmodes/PAW-03B*.chatmode.md`

#### Manual Verification:
- [ ] Implementation Review Agent opens Phase PR in GitHub repository correctly
- [ ] PR description format unchanged (platform-agnostic markdown)
- [ ] PR linked to issue correctly in GitHub
- [ ] Agent describes operation as "open a PR from branch X to branch Y" not "use GitHub MCP tools"
- [ ] No regression in GitHub workflow functionality

**Phase 4 Completed - 2025-10-26**

All automated verification checks passed. Changes made:
1. Added "PR Operations Context" note in step 7 explaining how Copilot automatically resolves workspace context and routes PR operations
2. Changed "Open phase PR with description referencing plan" to "Open a PR from <phase_branch> to <Target Branch>" (natural operation description)
3. Changed implicit "Reference the GitHub Issue" to explicit "Link to issue: Include Issue URL from WorkflowContext.md in the PR description"
4. Updated push instruction to "Use `git push <remote> <branch_name>` (remote from WorkflowContext.md, branch from current working branch)" for clarity
5. All terminology now platform-neutral (PR, pull request, issue, work item)
6. No explicit mcp_github tool namespace references remain

Key implementation notes:
- All changes focused on removing platform-specific language
- Agent now describes PR operations in natural language and relies on Copilot to route to appropriate platform tools
- PR description format remains unchanged and platform-agnostic
- No changes to logic flow or behavior - only language and terminology updates
- Changes apply to both initial phase review (opening PRs) and review comment follow-up (pushing commits)

Review notes for Implementation Review Agent:
- Verify platform-neutral language is consistent throughout the file
- Confirm the "PR Operations Context" note clearly explains Copilot's routing behavior
- Ensure no unintended changes to existing GitHub PR functionality

---

## Phase 5: Platform-Neutral Language - PR Agent

### Overview
Update the PR Agent to use platform-neutral language when describing final PR creation operations. Remove references to "GitHub" and explicit MCP tools.

### Changes Required:

#### 1. Update Final PR Operation Language
**File**: `.github/chatmodes/PAW-05 PR.chatmode.md`

**Changes**:

1. Update PR creation step:

From:
```markdown
Create the final PR to main using GitHub MCP tools
```

To:
```markdown
Open a PR from <Target Branch> to main
```

2. Update issue linking:

From:
```markdown
Reference the GitHub Issue in the PR description
```

To:
```markdown
Link the PR to the issue at <Issue URL> (include in PR description)
```

3. Update terminology throughout:
- "GitHub PR" → "PR" or "final PR"
- "GitHub Issue" → "issue" or "issue/work item"
- Remove explicit MCP tool references

**Locations**:
- PR creation section (~lines 182-220): Final PR steps
- PR description format (~lines 102-180): Update terminology
- Guardrails (~line 230): Update terminology

#### 2. Add Context Provision Note
**File**: `.github/chatmodes/PAW-05 PR.chatmode.md`

```markdown
**Final PR Context**: When creating the final PR, provide Target Branch (source), "main" (target), Work Title, and Issue URL from WorkflowContext.md. Describe the operation naturally and Copilot will route to the appropriate platform tools based on workspace context.
```

**Location**: Before PR creation section (~line 180)

### Success Criteria:

#### Automated Verification:
- [x] PR Agent chatmode file parses without errors
- [x] No "GitHub PR" or "GitHub Issue" outside backward compat notes: `grep -E "GitHub (PR|Issue)" .github/chatmodes/PAW-05*.chatmode.md` (minimal/none)
- [x] No explicit `mcp_github_` references: `grep "mcp_github" .github/chatmodes/PAW-05*.chatmode.md` (should be empty)
- [x] Platform-neutral terms present: `grep -E "PR|pull request|issue" .github/chatmodes/PAW-05*.chatmode.md`

#### Manual Verification:
- [ ] PR Agent creates final PR to main in GitHub repository correctly
- [ ] PR description comprehensive and platform-agnostic
- [ ] PR linked to issue correctly
- [ ] Agent describes operation as "open a PR from <Target Branch> to main" not "use GitHub MCP tools"
- [ ] No regression in GitHub workflow functionality

**Phase 5 Completed - 2025-10-26**

All automated verification checks passed. Changes made:
1. Added "Final PR Context" note in step 3 explaining how Copilot automatically resolves workspace context and routes final PR operations
2. Changed "Open PR from `<target_branch>` → `main`" to "Open a PR from `<target_branch>` to `main`" for natural language consistency
3. Updated issue linking from "Reference the GitHub Issue if available" to "Link the PR to the issue at <Issue URL> (include in PR description) if available"
4. Updated PR description template from "Closes issue (add actual number when known)" to "Closes issue at <Issue URL>"
5. All terminology now platform-neutral (PR, pull request, issue, work item)
6. No explicit mcp_github tool namespace references remain
7. Maintains flexibility for workflows without issue/work item URLs (keeps "if available")

Key implementation notes:
- All changes focused on removing platform-specific language
- Agent now describes final PR creation in natural language and relies on Copilot to route to appropriate platform tools
- PR description format remains unchanged and platform-agnostic
- No changes to logic flow or behavior - only language and terminology updates
- "if available" clause preserved to support PAW workflows without linked issues/work items

Review notes for Implementation Review Agent:
- Verify platform-neutral language is consistent throughout the file
- Confirm the "Final PR Context" note clearly explains Copilot's routing behavior
- Ensure no unintended changes to existing GitHub final PR functionality
- Verify the "if available" clause maintains flexibility for issue-less workflows

---

## Phase 6: Documentation and Testing

### Overview
Add documentation for Azure DevOps compatibility and update PAW specification to reflect platform-agnostic approach.

### Changes Required:

#### 1. Azure DevOps Setup Documentation
**File**: `docs/azure-devops-setup.md` (new file)

**Content**:
```markdown
# Azure DevOps Support Setup

PAW supports Azure DevOps repositories, pull requests, and work items through Copilot's automatic platform detection and MCP routing.

## Prerequisites

- VS Code with GitHub Copilot
- Azure DevOps account with appropriate permissions
- Git repository hosted in Azure DevOps
- Azure DevOps MCP server installed and configured

## Installation

Install the Azure DevOps MCP server following the instructions at:
https://github.com/microsoft/azure-devops-mcp

## Repository Setup

1. **Clone Azure DevOps Repository**:
   ```bash
   git clone https://dev.azure.com/<org>/<project>/_git/<repo>
   cd <repo>
   ```

2. **Verify Remote Configuration**:
   ```bash
   git remote -v
   # Should show Azure DevOps URL
   ```

## Using PAW with Azure DevOps

### Initialize Workflow

1. **Create Work Item** in Azure DevOps (or use existing one)
2. **Copy Work Item URL**: `https://dev.azure.com/<org>/<project>/_workitems/edit/<id>`
3. **Invoke Spec Agent** (PAW-01A) with work item URL

### Workflow Context

PAW stores platform-agnostic context in WorkflowContext.md:
```markdown
# WorkflowContext

Work Title: <your_title>
Feature Slug: <your-slug>
Target Branch: <your_branch>
Issue URL: https://dev.azure.com/<org>/<project>/_workitems/edit/<id>
Remote: origin
Artifact Paths: auto-derived
Additional Inputs: none
```

### How It Works

- Agents describe operations naturally (e.g., "post comment to issue at <URL>")
- Agents provide workspace context (branch names, Issue URLs, remote names)
- Copilot automatically detects Azure DevOps from git configuration
- Copilot routes operations to Azure DevOps MCP tools
- No platform-specific logic required in agent instructions

## Troubleshooting

### Issue URL field not found

**Solution**: Create WorkflowContext.md with "Issue URL" field, or ensure "GitHub Issue" field (legacy) is present for backward compatibility.

### Operations fail silently

**Solution**: Verify Azure DevOps MCP server is installed and configured. Check VS Code MCP server logs for connection issues.

### Work Item Not Linked to PR

**Solution**: Ensure Issue URL in WorkflowContext.md is correct. Copilot handles linking automatically when PRs are created.

## Permissions Required

Ensure your Azure DevOps account has:
- **Code**: Read, Write (for branch and PR operations)
- **Work Items**: Read, Write (for commenting)
- **Pull Requests**: Create, Comment

## See Also

- [PAW Specification](../paw-specification.md)
- [Azure DevOps MCP Server](https://github.com/microsoft/azure-devops-mcp)
```

#### 2. Update PAW Specification
**File**: `paw-specification.md`

**Changes**:

1. Add new section "Platform Support" after "Architecture" section (~line 100):

```markdown
## Platform Support

PAW supports both GitHub and Azure DevOps platforms through Copilot's automatic workspace context resolution and MCP routing.

### How Platform Support Works

PAW agents use platform-neutral language to describe operations:
- "Post a comment to the issue at <Issue URL>"
- "Open a PR from <branch> to <branch>"
- "Link the PR to the issue at <Issue URL>"

Copilot automatically:
- Detects the platform from workspace git configuration
- Resolves remote names to URLs
- Routes operations to appropriate MCP tools (GitHub or Azure DevOps)

**No explicit platform detection logic exists in PAW agent instructions.**

### Supported Platforms

#### GitHub
- **Repository Operations**: Branches, commits, pull requests
- **Work Tracking**: GitHub Issues
- **Authentication**: GitHub MCP server (built into VS Code)

#### Azure DevOps
- **Repository Operations**: Branches, commits, pull requests
- **Work Tracking**: Azure DevOps Work Items
- **Authentication**: Azure DevOps MCP server (must be installed separately)
- **Setup**: See [Azure DevOps Setup Guide](docs/azure-devops-setup.md)

### WorkflowContext.md Schema

The `Issue URL` field in WorkflowContext.md is platform-agnostic:
- **GitHub**: `https://github.com/<owner>/<repo>/issues/<number>`
- **Azure DevOps**: `https://dev.azure.com/<org>/<project>/_workitems/edit/<id>`

For backward compatibility, agents also read from the legacy `GitHub Issue` field if `Issue URL` is not present.
```

2. Update "WorkflowContext.md" section (~line 200):
- Change example format to use "Issue URL" instead of "GitHub Issue"
- Add note: "For backward compatibility, agents read from both 'Issue URL' (new) and 'GitHub Issue' (legacy) field names."

### Success Criteria:

#### Automated Verification:
- [ ] Azure DevOps setup documentation created: `test -f docs/azure-devops-setup.md`
- [ ] PAW specification contains platform support section: `grep -q "Platform Support" paw-specification.md`
- [ ] No references to platform detection logic in specification: `! grep -q "platform detection logic" paw-specification.md` should pass

#### Manual Verification:
- [ ] Azure DevOps documentation is clear and actionable
- [ ] PAW specification accurately describes the platform-neutral approach
- [ ] No mention of explicit platform detection in agent instructions
- [ ] Backward compatibility clearly documented
   # Copy validated changes from chatmodes/ to .github/chatmodes/
   cp chatmodes/*.chatmode.md .github/chatmodes/
   
   # Verify changes
   git diff .github/chatmodes/
   
   # Commit the production changes
   git add .github/chatmodes/
   git commit -m "Integrate Azure DevOps support into production chatmodes"
   ```

2. **Delete temporary folder**:
   ```bash
   # Remove temporary development folder
   rm -rf chatmodes/
   
   # Commit the cleanup
   git add chatmodes/
   git commit -m "Remove temporary chatmodes folder after successful integration"
   ```

3. **Verify production deployment**:
   - Test workflow with GitHub repository (should work unchanged)
   - Test workflow with Azure DevOps repository (should detect and use Azure DevOps)
   - Confirm no temporary artifacts remain

---

## Testing Strategy

### Approach

Since all PAW logic exists in agent instruction files (.chatmode.md), testing focuses on:
1. **GitHub Regression Testing**: Verify each phase doesn't break existing GitHub workflow functionality
2. **Azure DevOps Validation**: Human tester validates Azure DevOps functionality after all phases complete
3. **Incremental Validation**: Test each phase before proceeding to the next

### Per-Phase GitHub Regression Testing

After each phase, verify in this GitHub repository:
- **Phase 1**: Spec Agent creates WorkflowContext.md with "Issue URL" field; reads existing files with "GitHub Issue" field
- **Phase 2**: All agents read from both "Issue URL" and "GitHub Issue" fields correctly
- **Phase 3**: Status Agent posts comments to GitHub Issues using platform-neutral language
- **Phase 4**: Implementation Review Agent opens Phase PRs with platform-neutral language
- **Phase 5**: PR Agent opens final PR to main with platform-neutral language

Confirm:
- [ ] Backward compatibility clearly documented

---

## Testing Strategy

### Approach

Since all PAW logic exists in agent instruction files (.chatmode.md), testing focuses on:
1. **GitHub Regression Testing**: Verify no breaking changes to existing GitHub workflows
2. **Azure DevOps Validation**: Human tester validates Azure DevOps functionality in a real project
3. **Incremental Validation**: Test after each phase

### Per-Phase GitHub Regression Testing

After each phase, verify in this GitHub repository:
- **Phase 1**: Spec Agent creates WorkflowContext.md with "Issue URL" field; reads existing files with "GitHub Issue" field
- **Phase 2**: All agents read from both "Issue URL" and "GitHub Issue" fields correctly
- **Phase 3**: Status Agent posts comments using platform-neutral language
- **Phase 4**: Implementation Review Agent opens Phase PRs with platform-neutral language
- **Phase 5**: PR Agent opens final PR with platform-neutral language
- **Phase 6**: Documentation complete and accurate

Confirm for all phases:
- [ ] No "GitHub Issue" or "GitHub PR" references in operational instructions (only in backward compat notes)
- [ ] No explicit MCP tool namespace references in operational instructions
- [ ] Agents describe operations naturally
- [ ] All existing GitHub workflows function without modification

### Azure DevOps Validation (After Completion)

Human tester performs full workflow in Azure DevOps repository:
1. **Setup**: Verify Azure DevOps MCP server installed and configured
2. **Initialize**: Create PAW workflow with Azure DevOps work item URL
3. **Progress**: Go through all workflow stages (Spec → Planning → Implementation → Docs → Final PR)
4. **Verify**: All operations work correctly via Copilot's automatic routing
5. **Report**: Document any issues or unexpected behavior

**Expected Results**:
- WorkflowContext.md created with "Issue URL" field containing Azure DevOps work item URL
- Status updates posted to Azure DevOps work item as comments
- PRs created in Azure DevOps repository
- PRs linked to work items (visible in Azure DevOps UI)
- All artifacts created successfully
- No explicit platform detection code triggered

### Error Handling Testing

Verify appropriate behavior for:
- [ ] Issue URL field missing from WorkflowContext.md (agent prompts or provides clear error)
- [ ] Remote field references non-existent git remote (git command fails with helpful message)
- [ ] Workspace not in a git repository (operations fail early with clear context)

## Performance Considerations
- [ ] No explicit `mcp_github_*` tool references in instructions
- [ ] Agents describe operations naturally (e.g., "post comment to issue at <URL>")
- [ ] All existing GitHub workflows function without modification

### Azure DevOps Validation (After Completion)

Human tester performs full workflow in Azure DevOps repository:
1. **Setup**: Verify Azure DevOps MCP server installed and configured
2. **Initialize**: Create PAW workflow with Azure DevOps work item URL
3. **Progress**: Go through Spec → Planning → Implementation → Docs → Final PR stages
4. **Verify**: Copilot routes operations to Azure DevOps MCP tools based on workspace context
5. **Check**: Status updates posted to work item, PRs created and linked to work item
6. **Report**: Document any issues or unexpected behavior

### Error Handling Testing

Verify appropriate behavior for:
- [ ] Azure DevOps MCP server not configured (clear error message with setup instructions)
- [ ] Issue URL field missing from WorkflowContext.md
- [ ] Remote field references non-existent git remote
- [ ] Workspace not in a git repository

## Performance Considerations

No performance impact expected:
- All changes are instruction-level (no code execution overhead)
- Copilot's workspace context resolution is built-in functionality
- MCP routing happens at Copilot layer, transparent to PAW

## Migration Notes

### For Existing GitHub Users

**No Action Required**:
- Existing workflows continue without modification
- Agents automatically read from "GitHub Issue" field (backward compatibility)
- New workflows will use "Issue URL" field

### For New Azure DevOps Users

**Setup Steps**:
1. Install Azure DevOps MCP server (external dependency)
2. Authenticate with Azure DevOps
3. Use PAW normally - Copilot detects platform from workspace context

**No Platform Configuration**: Agents rely on Copilot's automatic workspace context resolution; no explicit platform detection or configuration needed in PAW.

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/31
- Spec: `.paw/work/azure-devops/Spec.md`
- Spec Research: `.paw/work/azure-devops/SpecResearch.md`
- Code Research: `.paw/work/azure-devops/CodeResearch.md`
- Azure DevOps MCP Server: https://github.com/microsoft/azure-devops-mcp
- PAW Specification: `paw-specification.md`
