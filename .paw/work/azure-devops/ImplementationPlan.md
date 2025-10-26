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
- [ ] PR Agent chatmode file parses without errors
- [ ] No "GitHub PR" or "GitHub Issue" outside backward compat notes: `grep -E "GitHub (PR|Issue)" .github/chatmodes/PAW-05*.chatmode.md` (minimal/none)
- [ ] No explicit `mcp_github_` references: `grep "mcp_github" .github/chatmodes/PAW-05*.chatmode.md` (should be empty)
- [ ] Platform-neutral terms present: `grep -E "PR|pull request|issue" .github/chatmodes/PAW-05*.chatmode.md`

#### Manual Verification:
- [ ] PR Agent creates final PR to main in GitHub repository correctly
- [ ] PR description comprehensive and platform-agnostic
- [ ] PR linked to issue correctly
- [ ] Agent describes operation as "open a PR from <Target Branch> to main" not "use GitHub MCP tools"
- [ ] No regression in GitHub workflow functionality

---4. **Read Issue URL** from WorkflowContext.md (check "Issue URL" first, fall back to "GitHub Issue")
5. **Parse Issue URL** to extract platform-specific identifiers:
   - **GitHub**: `https://github.com/<owner>/<repo>/issues/<number>`
     - Extract: owner, repo, issue number
   - **Azure DevOps**: `https://dev.azure.com/<org>/<project>/_workitems/edit/<id>`
     - Extract: organization, project, work item ID

6. **Verify platform consistency**: Confirm Issue URL platform matches Remote URL platform
   - If mismatch → **Warning**: "Issue URL points to [platform A] but Remote URL points to [platform B]. Please verify WorkflowContext.md configuration."

**Error Handling**:
- If Remote field is missing → Error: "Remote field not found in WorkflowContext.md. Please add Remote field or it will default to 'origin'."
- If remote name cannot be resolved → Error: "Remote '<name>' not found in git configuration. Run `git remote -v` to see available remotes."
- If Issue URL is missing → Error: "Issue URL field not found in WorkflowContext.md. Please add Issue URL pointing to GitHub Issue or Azure DevOps Work Item."
- If URL parsing fails → Error with specific URL format expected for each platform
- If Azure DevOps MCP server not available when needed → Error: "Azure DevOps MCP server not configured. Please install and configure the Azure DevOps MCP server (https://github.com/microsoft/azure-devops-mcp) in VS Code."
```

2. Update "Step 3: Generate Status Dashboard" section (~line 60):

```markdown
### Step 3: Generate Status Dashboard

Create the status dashboard using the actual phase count from Step 1.

**Post status comment** using platform-specific operations:

#### For GitHub:
- Use `mcp_github_github_add_issue_comment` with:
  - owner: extracted from Remote URL
  - repo: extracted from Remote URL
  - issue_number: extracted from Issue URL
  - body: status dashboard content (see format below)

#### For Azure DevOps:
- Use `mcp_azuredevops_wit_add_work_item_comment` with:
  - organization: extracted from Remote URL
  - project: extracted from Remote URL
  - work_item_id: extracted from Issue URL
  - comment: status dashboard content (see format below)

**Status Dashboard Format** (platform-agnostic, same for both):
```markdown
**🐾 Status Update Agent 🤖:**

## Artifacts
- Spec: [Link to .paw/work/<feature-slug>/Spec.md]
- Spec Research: [Link to .paw/work/<feature-slug>/SpecResearch.md]
- Code Research: [Link to .paw/work/<feature-slug>/CodeResearch.md]
- Implementation Plan: [Link to .paw/work/<feature-slug>/ImplementationPlan.md]
- Docs: [Link to .paw/work/<feature-slug>/Docs.md]

## PRs
- Planning PR: [Link] — [state]
- Phase 1: [Link] — [state]
- Phase 2: [Link] — [state]
- ... (continue for all phases)
- Docs PR: [Link] — [state]
- Final PR: [Link] — [state]

## Checklist
- [ ] Spec approved
- [ ] Planning PR merged
- [ ] Phase 1 merged
- [ ] Phase 2 merged
- ... (continue for all phases)
- [ ] Docs merged
- [ ] Final PR to main
```
```

3. Add PR link formatting logic after status dashboard format (~line 100):

```markdown
**PR Link Formatting** (platform-specific):

#### For GitHub PR Links:
- Format: `https://github.com/<owner>/<repo>/pull/<number>`
- Example: `https://github.com/lossyrob/phased-agent-workflow/pull/42`

#### For Azure DevOps PR Links:
- Format: `https://dev.azure.com/<org>/<project>/_git/<repo>/pullrequest/<id>`
- Example: `https://dev.azure.com/contoso/MyProject/_git/MyRepo/pullrequest/123`

When searching for PRs related to this feature, format the links according to the detected platform before including them in the status dashboard.
```

4. Update "Guardrails" section (~line 120):
```markdown
## Guardrails
- **ALWAYS perform platform detection** (Step 0) before any status operations
- **ALWAYS verify phase count** by searching for `^## Phase \d+:` patterns in ImplementationPlan.md (do NOT assume phase counts)
- **Never edit the Issue description or Work Item description** (post comments instead)
- Never change content outside `<!-- BEGIN:AGENT-SUMMARY -->` / `<!-- END:AGENT-SUMMARY -->` blocks in PRs
- Never assign reviewers, change labels (except `status/*` if configured), or modify code
- Be idempotent: re-running should not produce diffs without state changes
- Handle Azure DevOps MCP server unavailability gracefully with clear error messages
```

**Locations to update**:
- Line ~50: Add Step 0 (Platform Detection) before existing steps
- Line ~60: Update Step 3 with platform-specific routing logic
- Line ~100: Add PR link formatting documentation
- Line ~120: Update Guardrails with platform detection requirement

### Success Criteria:

#### Automated Verification:
- [ ] Status Agent chatmode file parses without errors: `ls chatmodes/PAW-X*.chatmode.md`
- [ ] Platform detection logic added to Status Agent (verify with `grep -l "Platform Detection" chatmodes/PAW-X*`)
- [ ] Both GitHub and Azure DevOps MCP tool references present (verify with `grep "mcp_github_github_add_issue_comment\|mcp_azuredevops_wit_add_work_item_comment" chatmodes/PAW-X*`)

#### Manual Verification:
- [ ] Initialize PAW workflow with GitHub Issue, invoke Status Agent, verify status comment posted to GitHub Issue
- [ ] Initialize PAW workflow with Azure DevOps Work Item, invoke Status Agent, verify status comment posted to Azure DevOps Work Item
- [ ] Status Agent detects Azure DevOps platform but MCP server not configured, verify clear error message displayed
- [ ] Status dashboard format is identical for both GitHub and Azure DevOps (only links differ)
- [ ] PR links formatted correctly for each platform in status dashboard

---

## Phase 6: Implementation Review Agent Platform-Specific PR Operations

### Overview
Update Implementation Review Agent to detect platform and route PR operations (create PR, update PR, post PR comments) to appropriate MCP tools.

### Changes Required:

#### 1. Implementation Review Agent Platform Detection and PR Routing
**File**: `chatmodes/PAW-03B Impl Reviewer.chatmode.md`

**Changes**:

1. Add platform detection section after "Process Steps" (~line 80):

```markdown
### Platform Detection for PR Operations

**Before opening or updating PRs**, detect the platform and extract repository context:

1. **Read Remote field** from WorkflowContext.md (defaults to "origin")
2. **Resolve remote to URL** if Remote field contains a name:
   ```bash
   git config --get remote.<name>.url
   ```
3. **Parse URL to detect platform and extract identifiers**:
   - **GitHub**: Domain contains "github.com"
     - Extract: owner, repo from pattern `github.com/<owner>/<repo>`
   - **Azure DevOps**: Domain contains "dev.azure.com" or "visualstudio.com"
     - Modern: `https://dev.azure.com/<org>/<project>/_git/<repo>`
     - Legacy: `https://<org>.visualstudio.com/<project>/_git/<repo>`
     - Extract: organization, project, repository
   - Otherwise → **Error**: "Unknown platform. Please verify Remote field in WorkflowContext.md."

4. **Read Issue URL** from WorkflowContext.md (check "Issue URL" first, fall back to "GitHub Issue")
5. **Extract work item identifiers** from Issue URL (for linking PRs):
   - **GitHub**: Extract issue number from `https://github.com/<owner>/<repo>/issues/<number>`
   - **Azure DevOps**: Extract work item ID from `https://dev.azure.com/<org>/<project>/_workitems/edit/<id>`

**Error Handling**:
- If Remote resolution fails → Error: "Cannot resolve remote '<name>'. Run `git remote -v` to see available remotes."
- If platform cannot be determined → Error: "Unknown platform. Verify Remote field points to GitHub or Azure DevOps repository."
- If Azure DevOps MCP server not available → Error: "Azure DevOps MCP server not configured. Install from https://github.com/microsoft/azure-devops-mcp."
```

2. Update "For Initial Phase Review" section, step 7 "Push and open PR" (~line 120):

```markdown
7. **Push and open PR** (REQUIRED):
   - Push implementation branch (includes both Implementation Agent's commits and your documentation commits)
   - Open phase PR with description referencing plan

   **Platform-Specific PR Creation**:

   #### For GitHub:
   - Use `mcp_github_github_create_pull_request` with:
     - owner: extracted from Remote URL
     - repo: extracted from Remote URL
     - head: `<target_branch>_phase<N>`
     - base: `<target_branch>`
     - title: `[<Work Title>] Phase <N>: <description>`
     - body: PR description (see format below)

   #### For Azure DevOps:
   - Use `mcp_azuredevops_repo_create_pull_request` with:
     - organization: extracted from Remote URL
     - project: extracted from Remote URL
     - repository: extracted from Remote URL
     - source_ref_name: `refs/heads/<target_branch>_phase<N>`
     - target_ref_name: `refs/heads/<target_branch>`
     - title: `[<Work Title>] Phase <N>: <description>`
     - description: PR description (see format below)
   - **Link to Work Item**: Use `mcp_azuredevops_wit_link_work_item_to_pull_request` with:
     - organization: extracted from Remote URL
     - project: extracted from Remote URL
     - work_item_id: extracted from Issue URL
     - pull_request_id: ID returned from PR creation

   **PR Description Format** (platform-agnostic, same for both):
   ```markdown
   # Phase [N]: [Phase Name from ImplementationPlan.md]

   ## Phase Objectives
   [Objectives from ImplementationPlan.md Phase N]

   ## Changes Made
   [Summary of changes from Implementation Agent commits]

   ## Testing Performed
   [Reference success criteria from ImplementationPlan.md Phase N]

   ## Artifacts
   - Implementation Plan: `.paw/work/<feature-slug>/ImplementationPlan.md`
   - Spec: `.paw/work/<feature-slug>/Spec.md`

   🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)
   ```

   - **Title**: `[<Work Title>] Phase <N>: <description>` where Work Title comes from WorkflowContext.md
   - Pause for human review
   - Post a PR timeline comment summarizing the review, starting with `**🐾 Implementation Reviewer 🤖:**` and covering whether additional commits were made, verification status, and any next steps
   - If no commits were necessary, explicitly state that the review resulted in no additional changes
```

3. Update "Guardrails" section (~line 290):
```markdown
## Guardrails
- **ALWAYS perform platform detection** before PR operations (opening, updating, commenting)
- **For Azure DevOps**: ALWAYS link PRs to work items using `wit_link_work_item_to_pull_request`
- **For GitHub**: Reference issue in PR description (e.g., "Related to #123")
- NEVER modify functional code or tests (Implementation Agent's responsibility)
- ONLY commit documentation, comments, docstrings, and polish
- DO NOT revert or overwrite Implementer's changes
- DO NOT address review comments yourself; verify the Implementer addressed them
- If you aren't sure if a change is documentation vs functional, pause and ask
- DO NOT approve or merge PRs (human responsibility)
- For initial phase review: ALWAYS push and open the PR (Implementation Agent does not do this)
- For review comment follow-up: ALWAYS push all commits after verification (Implementation Agent commits locally only)
- For review comment follow-up: Post ONLY ONE comprehensive summary comment that includes both detailed comment tracking and overall summary
- NEVER create new standalone artifacts or documents (e.g., `Phase1-Review.md`) as part of the review; update only existing files when necessary
- Prefer making no commits over introducing cosmetic or no-op changes
- Handle Azure DevOps MCP server unavailability with clear error messages
```

**Locations to update**:
- Line ~80: Add Platform Detection section before existing Process Steps
- Line ~120: Update step 7 with platform-specific PR creation logic
- Line ~290: Update Guardrails with platform detection and work item linking requirements

### Success Criteria:

#### Automated Verification:
- [ ] Implementation Review Agent chatmode file parses without errors: `ls chatmodes/PAW-03B*.chatmode.md`
- [ ] Platform detection logic added (verify with `grep -l "Platform Detection for PR Operations" chatmodes/PAW-03B*`)
- [ ] Both GitHub and Azure DevOps PR creation references present (verify with `grep "mcp_github_github_create_pull_request\|mcp_azuredevops_repo_create_pull_request" chatmodes/PAW-03B*`)
- [ ] Azure DevOps work item linking reference present (verify with `grep "wit_link_work_item_to_pull_request" chatmodes/PAW-03B*`)

#### Manual Verification:
- [ ] Implementation Review Agent creates Phase PR in GitHub repository with correct format and issue reference
- [ ] Implementation Review Agent creates Phase PR in Azure DevOps repository with correct format
- [ ] Azure DevOps Phase PR is automatically linked to work item (verify in Azure DevOps UI)
- [ ] PR description format is identical for both platforms
- [ ] Implementation Review Agent detects Azure DevOps but MCP server not configured, verify clear error message

---

## Phase 7: PR Agent Platform-Specific Final PR Operations

### Overview
Update PR Agent to detect platform and route final PR creation to appropriate MCP tools, maintaining comprehensive PR descriptions for both platforms.

### Changes Required:

#### 1. PR Agent Platform Detection and Final PR Routing
**File**: `chatmodes/PAW-05 PR.chatmode.md`

**Changes**:

1. Add platform detection section after "Core Responsibilities" (~line 30):

```markdown
### Platform Detection for Final PR

**Before creating the final PR**, detect the platform and extract repository context:

1. **Read Remote field** from WorkflowContext.md (defaults to "origin")
2. **Resolve remote to URL** if Remote field contains a name:
   ```bash
   git config --get remote.<name>.url
   ```
3. **Parse URL to detect platform and extract identifiers**:
   - **GitHub**: Domain contains "github.com"
     - Extract: owner, repo from pattern `github.com/<owner>/<repo>`
   - **Azure DevOps**: Domain contains "dev.azure.com" or "visualstudio.com"
     - Modern: `https://dev.azure.com/<org>/<project>/_git/<repo>`
     - Legacy: `https://<org>.visualstudio.com/<project>/_git/<repo>`
     - Extract: organization, project, repository
   - Otherwise → **Error**: "Unknown platform. Please verify Remote field in WorkflowContext.md."

4. **Read Issue URL** from WorkflowContext.md (check "Issue URL" first, fall back to "GitHub Issue")
5. **Extract work item identifiers** from Issue URL:
   - **GitHub**: Extract issue number from `https://github.com/<owner>/<repo>/issues/<number>`
   - **Azure DevOps**: Extract work item ID from `https://dev.azure.com/<org>/<project>/_workitems/edit/<id>`

**Error Handling**:
- If Remote resolution fails → Error: "Cannot resolve remote '<name>'. Run `git remote -v` to see available remotes."
- If platform cannot be determined → Error: "Unknown platform. Verify Remote field points to GitHub or Azure DevOps repository."
- If Azure DevOps MCP server not available → Error: "Azure DevOps MCP server not configured. Install from https://github.com/microsoft/azure-devops-mcp."
```

2. Update "Process Steps" section, step 4 "Create final PR" (~line 170):

```markdown
4. **Create final PR**:

   **Platform-Specific PR Creation**:

   #### For GitHub:
   - Use `mcp_github_github_create_pull_request` with:
     - owner: extracted from Remote URL
     - repo: extracted from Remote URL
     - head: `<target_branch>`
     - base: `main` (or specified base branch)
     - title: `[<Work Title>] <description>`
     - body: PR description (see template above)
   - Reference issue in PR description: "Closes #<issue_number>" or "Resolves #<issue_number>"

   #### For Azure DevOps:
   - Use `mcp_azuredevops_repo_create_pull_request` with:
     - organization: extracted from Remote URL
     - project: extracted from Remote URL
     - repository: extracted from Remote URL
     - source_ref_name: `refs/heads/<target_branch>`
     - target_ref_name: `refs/heads/main` (or specified base branch)
     - title: `[<Work Title>] <description>`
     - description: PR description (see template above)
   - **Link to Work Item**: Use `mcp_azuredevops_wit_link_work_item_to_pull_request` with:
     - organization: extracted from Remote URL
     - project: extracted from Remote URL
     - work_item_id: extracted from Issue URL
     - pull_request_id: ID returned from PR creation
   - Optionally reference work item in description: "Related to Work Item <work_item_id>"

   **PR Title Format**:
   - `[<Work Title>] <description>` where Work Title comes from WorkflowContext.md
   - Example: `[Auth System] Add user authentication system`

   **PR Description**: Use the template from "PR Description Template" section above (platform-agnostic format, same for both GitHub and Azure DevOps)

   - Confirm PR created successfully
   - Note the final PR number/ID for reference
```

3. Update "Guardrails" section (~line 220):
```markdown
## Guardrails
- **ALWAYS perform platform detection** before creating the final PR
- **For Azure DevOps**: ALWAYS link PRs to work items using `wit_link_work_item_to_pull_request`
- **For GitHub**: Reference issue in PR description using "Closes" or "Resolves" keywords
- NEVER modify code or documentation
- NEVER approve or merge PRs
- NEVER address review comments (Implementation Agent and Implementation Review Agent handle this)
- DO NOT guess at artifact locations; verify they exist
- Report pre-flight check status and recommendations
- Handle Azure DevOps MCP server unavailability with clear error messages
```

**Locations to update**:
- Line ~30: Add Platform Detection section after Core Responsibilities
- Line ~170: Update step 4 with platform-specific final PR creation logic
- Line ~220: Update Guardrails with platform detection and work item linking requirements

### Success Criteria:

#### Automated Verification:
- [ ] PR Agent chatmode file parses without errors: `ls chatmodes/PAW-05*.chatmode.md`
- [ ] Platform detection logic added (verify with `grep -l "Platform Detection for Final PR" chatmodes/PAW-05*`)
- [ ] Both GitHub and Azure DevOps PR creation references present (verify with `grep "mcp_github_github_create_pull_request\|mcp_azuredevops_repo_create_pull_request" chatmodes/PAW-05*`)
- [ ] Azure DevOps work item linking reference present (verify with `grep "wit_link_work_item_to_pull_request" chatmodes/PAW-05*`)

#### Manual Verification:
- [ ] PR Agent creates final PR in GitHub repository with correct format and "Closes #N" reference
- [ ] PR Agent creates final PR in Azure DevOps repository with correct format
- [ ] Azure DevOps final PR is automatically linked to work item (verify in Azure DevOps UI)
- [ ] PR description format is identical for both platforms
- [ ] PR Agent detects Azure DevOps but MCP server not configured, verify clear error message

---

## Phase 8: Documentation and Testing

### Overview
Add comprehensive documentation for Azure DevOps setup and usage, update PAW specification to reflect platform support, and perform end-to-end testing of both GitHub and Azure DevOps workflows.

### Changes Required:

#### 1. Azure DevOps Setup Documentation
**File**: `docs/azure-devops-setup.md` (new file)

**Content**:
```markdown
# Azure DevOps Support Setup

PAW supports Azure DevOps repositories, pull requests, and work items through the Azure DevOps MCP server.

## Prerequisites

- VS Code with MCP support
- Azure DevOps account with appropriate permissions
- Git repository hosted in Azure DevOps

## Installation

1. **Install Azure DevOps MCP Server**:
   ```bash
   npm install -g @azure-devops/mcp
   ```

2. **Configure MCP Server in VS Code**:
   - Open VS Code settings
   - Add Azure DevOps MCP server configuration
   - Provide organization URL and authentication

3. **Authenticate with Azure DevOps**:
   - The MCP server will prompt for authentication on first use
   - Follow browser-based OAuth flow
   - Grant necessary permissions (Code: Read/Write, Work Items: Read/Write)

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

PAW automatically detects Azure DevOps from your repository's remote URL. The WorkflowContext.md will store:
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

### Agent Behavior

- **Platform Detection**: Agents parse the Remote URL to detect Azure DevOps
- **Work Item Operations**: Status updates posted as work item comments
- **PR Operations**: PRs created in Azure DevOps repository
- **Work Item Linking**: PRs automatically linked to work items

## Troubleshooting

### Error: "Azure DevOps MCP server not configured"

**Solution**: Install and configure the Azure DevOps MCP server (see Installation above)

### Error: "Cannot resolve remote 'origin'"

**Solution**: Verify your git repository has the remote configured:
```bash
git remote -v
```

If missing, add it:
```bash
git remote add origin https://dev.azure.com/<org>/<project>/_git/<repo>
```

### Error: "Unknown platform"

**Solution**: Verify your Remote URL points to Azure DevOps (should contain "dev.azure.com" or "visualstudio.com")

### Work Item Not Linked to PR

**Solution**: Verify the work item ID in WorkflowContext.md matches your work item URL. The link is created automatically when PRs are opened.

## Permissions Required

Ensure your Azure DevOps account has:
- **Code**: Read, Write (for branch and PR operations)
- **Work Items**: Read, Write (for commenting and linking)
- **Pull Requests**: Create, Comment (for PR operations)

## Differences from GitHub

- **Three-level hierarchy**: Organization → Project → Repository (vs GitHub's Owner → Repository)
- **Work Item linking**: Explicit MCP call vs GitHub's "Closes #N" syntax
- **URL format**: Different URL structure for PRs and work items

## See Also

- [PAW Specification](../paw-specification.md)
- [Azure DevOps MCP Server](https://github.com/microsoft/azure-devops-mcp)
- [Azure DevOps REST API Documentation](https://learn.microsoft.com/en-us/rest/api/azure/devops/)
```

#### 2. Update PAW Specification
**File**: `paw-specification.md`

**Changes**:
1. Add new section "Platform Support" after "Architecture" section (~line 100):
```markdown
## Platform Support

PAW supports both GitHub and Azure DevOps platforms for source control and work tracking.

### Platform Detection

Agents automatically detect the platform by examining the `Remote` field in WorkflowContext.md:
- Remote URL contains "github.com" → GitHub platform
- Remote URL contains "dev.azure.com" or "visualstudio.com" → Azure DevOps platform

Platform-specific identifiers (owner/repo for GitHub, organization/project/repository for Azure DevOps) are extracted from the Remote URL at runtime.

### GitHub Support

- **Repository Operations**: Branches, commits, pull requests
- **Work Tracking**: GitHub Issues
- **Authentication**: GitHub MCP server with PAT or OAuth

### Azure DevOps Support

- **Repository Operations**: Branches, commits, pull requests
- **Work Tracking**: Azure DevOps Work Items
- **Authentication**: Azure DevOps MCP server with PAT or OAuth
- **Setup**: See [Azure DevOps Setup Guide](docs/azure-devops-setup.md)

### WorkflowContext.md Schema

The `Issue URL` field in WorkflowContext.md is platform-agnostic:
- GitHub: `https://github.com/<owner>/<repo>/issues/<number>`
- Azure DevOps: `https://dev.azure.com/<org>/<project>/_workitems/edit/<id>`

For backward compatibility, agents also read from the legacy `GitHub Issue` field if `Issue URL` is not present.
```

2. Update "WorkflowContext.md" section (~line 200):
- Change example format to use "Issue URL" instead of "GitHub Issue"
- Add note about backward compatibility with "GitHub Issue" field

#### 3. End-to-End Testing

**Test Suite 1: Azure DevOps Workflow**
1. **Setup**:
   - Clone Azure DevOps repository
   - Create work item in Azure DevOps
   - Verify Azure DevOps MCP server configured

2. **Spec Stage**:
   - Invoke Spec Agent with Azure DevOps work item URL
   - Verify WorkflowContext.md created with "Issue URL" field
   - Verify Platform Detection identifies Azure DevOps
   - Verify Spec.md created successfully

3. **Planning Stage**:
   - Invoke Planning Agent
   - Verify CodeResearch.md and ImplementationPlan.md created
   - Verify Planning PR created in Azure DevOps
   - Verify work item linked to Planning PR

4. **Implementation Stage**:
   - Invoke Implementation Agent for Phase 1
   - Invoke Implementation Review Agent
   - Verify Phase PR created in Azure DevOps
   - Verify work item linked to Phase PR
   - Verify PR description format correct

5. **Status Updates**:
   - Invoke Status Agent at each milestone
   - Verify status comments posted to Azure DevOps work item
   - Verify PR links formatted correctly for Azure DevOps

6. **Final PR**:
   - Complete all phases
   - Invoke PR Agent
   - Verify final PR created in Azure DevOps
   - Verify work item linked to final PR
   - Verify PR description comprehensive and correct

**Test Suite 2: GitHub Workflow (Regression Testing)**
1. Repeat all steps above using GitHub repository and GitHub Issue
2. Verify no regressions in GitHub functionality
3. Verify platform detection identifies GitHub
4. Verify WorkflowContext.md backward compatibility (read from "GitHub Issue" field)

**Test Suite 3: Error Handling**
1. Azure DevOps repository with no MCP server configured
2. Invalid Remote field in WorkflowContext.md
3. Mismatched platforms (GitHub Issue with Azure DevOps repository)
4. Invalid work item URL format
5. Non-existent remote name in Remote field

### Success Criteria:

#### Automated Verification:
- [ ] Azure DevOps setup documentation exists: `ls docs/azure-devops-setup.md`
- [ ] PAW specification updated with platform support section (verify with `grep -l "Platform Support" paw-specification.md`)
- [ ] All test suite scripts documented in test plan

#### Manual Verification:
- [ ] Complete Azure DevOps workflow test suite successfully
- [ ] Complete GitHub regression test suite successfully (no regressions)
- [ ] Complete error handling test suite successfully
- [ ] Documentation is clear and actionable for new Azure DevOps users
- [ ] All error messages are helpful and guide users to solutions

#### Final Integration:
After all testing is complete and validated:
1. **Merge modified chatmodes to production**:
   ```bash
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
- [ ] No "GitHub Issue" or "GitHub PR" references in operational instructions (only in backward compat notes)
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
