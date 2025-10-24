# Azure DevOps Support Implementation Plan

## Overview

This plan implements Azure DevOps support for PAW, enabling agents to work with Azure DevOps repositories, pull requests, and work items as seamlessly as they currently work with GitHub. The implementation adds platform detection logic and Azure DevOps MCP tool routing to all PAW agents while maintaining backward compatibility with existing GitHub workflows.

## Current State Analysis

### What Exists Now:
- **GitHub MCP Integration**: All agents invoke GitHub operations through `mcp_github_*` tools without handling authentication
- **WorkflowContext.md**: Centralized parameter file storing "GitHub Issue" (GitHub-specific) and "Remote" fields
- **Agent Instructions**: 9 chatmode files (`.github/chatmodes/PAW-*.chatmode.md`) containing GitHub-specific operations
- **No Platform Detection**: Agents assume GitHub and do not determine platform from repository context

### Key Constraints Discovered:
- **No Implementation Code**: All PAW logic exists in agent instruction files (.chatmode.md), not separate code files
- **MCP Abstraction**: Agents use natural language to describe operations; Copilot routes to available MCP tools
- **Parameter Centralization**: WorkflowContext.md serves as single source of truth for workflow parameters
- **Platform-Agnostic Artifacts**: Spec.md, ImplementationPlan.md, etc. contain no platform-specific details

### External Dependencies:
- **Azure DevOps MCP Server**: Must be installed and configured in VS Code before Azure DevOps operations can succeed
- **GitHub MCP Server**: Existing dependency, must remain functional for backward compatibility

## Desired End State

After implementing this plan:
1. Agents detect platform (GitHub or Azure DevOps) by parsing Remote field URL in WorkflowContext.md
2. WorkflowContext.md uses "Issue URL" field name (supporting both GitHub and Azure DevOps)
3. Agents read from both "Issue URL" (new) and "GitHub Issue" (legacy) for backward compatibility
4. Platform-specific operations route to appropriate MCP tools (`mcp_github_*` or `mcp_azuredevops_*`)
5. Status Agent posts status updates to Azure DevOps work items when platform is Azure DevOps
6. Implementation Review Agent and PR Agent create PRs in Azure DevOps when platform is Azure DevOps
7. All existing GitHub workflows continue to function without modification

### Verification:
- Initialize a PAW workflow with an Azure DevOps work item URL and repository
- Progress through all workflow stages (Spec → Planning → Implementation → Docs → Final PR)
- Verify agents correctly detect Azure DevOps platform at each stage
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

## Implementation Approach

The implementation follows PAW's document-driven architecture:
1. **Update Agent Instructions**: Modify chatmode files to add platform detection and routing logic
2. **Maintain Backward Compatibility**: Support both "Issue URL" (new) and "GitHub Issue" (legacy) field names
3. **Runtime Detection**: Parse Remote field URL to determine platform (GitHub vs Azure DevOps)
4. **Conditional Routing**: Use platform-appropriate MCP tools based on detection results
5. **Incremental Rollout**: Update agents one at a time, testing each before proceeding

**Phasing Strategy**: Update agents in order of dependency and risk, starting with WorkflowContext.md creators (Spec Agent) and readers (all agents), then moving to platform-specific operations (Status, PR, Implementation Review agents).

**Testing Strategy**: Since this repository uses GitHub and the Azure DevOps changes cannot be tested locally, all chatmode modifications will be made in a separate `chatmodes/` folder at the project root. A human tester must copy these files to an Azure DevOps project for validation after each phase before proceeding.

---

## Phase 0: Create Test Chatmodes Folder

### Overview
Create a separate `chatmodes/` folder at the project root and copy all `.github/chatmodes/` files to it. All Azure DevOps implementation work will modify only the files in `chatmodes/`, leaving `.github/chatmodes/` untouched for this GitHub-based project.

### Rationale
The current repository uses GitHub and modifying `.github/chatmodes/` would change agent behavior for this project without the ability to test Azure DevOps functionality locally. By working in a separate folder, we:
1. Preserve working GitHub-based agent files in `.github/chatmodes/`
2. Create modified versions in `chatmodes/` for Azure DevOps support
3. Enable human testers to copy `chatmodes/` files to Azure DevOps projects for validation
4. Reduce risk of breaking the current GitHub workflow

### Changes Required:

#### 1. Create chatmodes/ Directory and Copy Files
**Location**: Project root

**Commands**:
```bash
# Create chatmodes folder at project root
mkdir -p chatmodes

# Copy all chatmode files from .github/chatmodes/
cp .github/chatmodes/*.chatmode.md chatmodes/

# Verify copy successful
ls -la chatmodes/
```

Expected files in `chatmodes/`:
- `PAW-01A Spec Agent.chatmode.md`
- `PAW-01B Spec Research Agent.chatmode.md`
- `PAW-02A Code Researcher.chatmode.md`
- `PAW-02B Impl Planner.chatmode.md`
- `PAW-03A Implementer.chatmode.md`
- `PAW-03B Impl Reviewer.chatmode.md`
- `PAW-04 Documenter.chatmode.md`
- `PAW-05 PR.chatmode.md`
- `PAW-X Status Update.chatmode.md`

#### 2. Add README to chatmodes/ Folder
**File**: `chatmodes/README.md` (new file)

**Content**:
```markdown
# Azure DevOps Support - Test Chatmodes

This folder contains modified versions of PAW agent chatmode files that add Azure DevOps platform support.

## Purpose

These files are maintained separately from `.github/chatmodes/` because:
1. The main repository uses GitHub and cannot test Azure DevOps functionality locally
2. Modifying `.github/chatmodes/` would affect the current GitHub-based workflow
3. Human testers need to copy these files to Azure DevOps projects for validation

## Usage for Testing

To test Azure DevOps support:

1. **Set up an Azure DevOps test project**:
   - Create or use an existing Azure DevOps repository
   - Install and configure the Azure DevOps MCP server
   - Create a test work item

2. **Copy chatmode files to test project**:
   ```bash
   # In your Azure DevOps test project:
   mkdir -p .github/chatmodes
   cp /path/to/phased-agent-workflow/chatmodes/*.chatmode.md .github/chatmodes/
   ```

3. **Run PAW workflow**:
   - Initialize workflow with Azure DevOps work item URL
   - Progress through phases as documented in ImplementationPlan.md
   - Verify all platform detection and Azure DevOps operations work correctly

4. **Report results**:
   - Document what worked and what didn't
   - Note any error messages or unexpected behavior
   - Provide feedback on GitHub Planning PR

## Implementation Phases

All implementation phases modify files in THIS folder, not `.github/chatmodes/`:

- **Phase 0**: Setup (this folder creation) ✅
- **Phase 1**: WorkflowContext.md field updates and platform detection
- **Phase 2**: Status Agent platform-specific operations
- **Phase 3**: Implementation Review Agent platform-specific PR operations
- **Phase 4**: PR Agent platform-specific final PR operations
- **Phase 5**: Documentation and end-to-end testing

After each phase, human testing in an Azure DevOps project is required before proceeding to the next phase.

## Future Integration

Once Azure DevOps support is fully tested and validated:
1. Merge changes from `chatmodes/` into `.github/chatmodes/`
2. Deploy to production (users can choose GitHub or Azure DevOps)
3. Archive or remove this test folder

## See Also

- Implementation Plan: `.paw/work/azure-devops/ImplementationPlan.md`
- Azure DevOps Setup: `docs/azure-devops-setup.md` (to be created in Phase 5)
- Planning PR: [Link to Planning PR]
```

#### 3. Update .gitignore (Optional)
**File**: `.gitignore`

**Consider adding** (optional - discuss with team):
```
# Azure DevOps test chatmodes (if you want to exclude from version control)
# chatmodes/
```

**Note**: We likely want to keep `chatmodes/` in version control for review and testing purposes. This .gitignore entry is optional and only relevant if the team prefers to exclude test artifacts.

### Success Criteria:

#### Automated Verification:
- [ ] `chatmodes/` folder exists: `test -d chatmodes && echo "EXISTS"`
- [ ] All 9 chatmode files copied: `test $(ls -1 chatmodes/*.chatmode.md | wc -l) -eq 9 && echo "ALL FILES PRESENT"`
- [ ] README.md exists in chatmodes/: `test -f chatmodes/README.md && echo "README EXISTS"`
- [ ] File content matches source: `diff .github/chatmodes/PAW-01A\ Spec\ Agent.chatmode.md chatmodes/PAW-01A\ Spec\ Agent.chatmode.md` (should show no differences)

#### Manual Verification:
- [ ] Verify all chatmode filenames match exactly between `.github/chatmodes/` and `chatmodes/`
- [ ] Verify README.md explains testing strategy clearly
- [ ] Confirm with human reviewer that this approach addresses testing concerns
- [ ] Verify `chatmodes/` folder committed to Planning PR branch

### Hand-off:
Phase 0 complete. All chatmode files copied to `chatmodes/` folder. Proceeding to Phase 1: All subsequent phases will modify files in `chatmodes/` only, preserving `.github/chatmodes/` for the current GitHub workflow.

---

## Phase 1: WorkflowContext.md Field Updates and Platform Detection

### Overview
Update WorkflowContext.md schema and reading logic across all agents to support "Issue URL" field (platform-agnostic) while maintaining backward compatibility with "GitHub Issue" (legacy). Add platform detection logic based on Remote field URL parsing.

### Changes Required:

#### 1. Spec Agent (PAW-01A) - WorkflowContext.md Creator
**File**: `chatmodes/PAW-01A Spec Agent.chatmode.md`

**Changes**:

1. Update WorkflowContext.md format template (appears in multiple locations):
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

2. Update "Start / Initial Response" section instructions:
- Change "extract Target Branch, Work Title, Feature Slug, **GitHub Issue**, Remote" to "extract Target Branch, Work Title, Feature Slug, **Issue URL** (or **GitHub Issue** for backward compatibility), Remote"

3. Update "WorkflowContext.md Parameters" section:
- Change field description from "**GitHub Issue**: Full URL to the GitHub issue" to "**Issue URL**: Full URL to the GitHub issue or Azure DevOps work item"
- Add note: "For backward compatibility, agents also read from **GitHub Issue** field if **Issue URL** is not present"

4. Update WorkflowContext.md creation logic in "Start / Initial Response":
- When creating new WorkflowContext.md files, use "Issue URL" field name
- Accept GitHub Issue URLs (`https://github.com/<owner>/<repo>/issues/<number>`)
- Accept Azure DevOps Work Item URLs (`https://dev.azure.com/<org>/<project>/_workitems/edit/<id>`)

**Locations to update**:
- Line ~30: Initial response section (WorkflowContext.md extraction logic)
- Line ~60: WorkflowContext.md Parameters format template
- Line ~80: WorkflowContext.md creation/update logic

#### 2. All Agent Files - WorkflowContext.md Readers (8 files)

Update all remaining agent chatmode files to read from both "Issue URL" (new) and "GitHub Issue" (legacy):

**Files**:
- `chatmodes/PAW-X Status Update.chatmode.md`
- `chatmodes/PAW-03B Impl Reviewer.chatmode.md`
- `chatmodes/PAW-05 PR.chatmode.md`
- `chatmodes/PAW-01B Spec Research Agent.chatmode.md`
- `chatmodes/PAW-02A Code Researcher.chatmode.md`
- `chatmodes/PAW-02B Impl Planner.chatmode.md`
- `chatmodes/PAW-03A Implementer.chatmode.md`
- `chatmodes/PAW-04 Documenter.chatmode.md`

**Changes** (identical for all files):

1. Update WorkflowContext.md format template:
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

2. Update "Start / Initial Response" or "Inputs" section:
- Change "extract... **GitHub Issue**" to "extract... **Issue URL** (or **GitHub Issue** for backward compatibility)"

3. Add backward compatibility note after format template:
- "**Backward Compatibility**: When reading WorkflowContext.md, check for **Issue URL** first; if not present, read from **GitHub Issue** field."

**Locations to update** (per file):
- Initial response/inputs section (~10-30 lines): Update extraction instruction
- WorkflowContext.md Parameters section (~50-80 lines): Update format template
- WorkflowContext.md Parameters section (~50-80 lines): Add backward compatibility note

#### 3. Add Platform Detection Logic Documentation

**File**: `chatmodes/PAW-01A Spec Agent.chatmode.md`
**Location**: After "WorkflowContext.md Parameters" section (~line 150)

**Add new section**:

```markdown
### Platform Detection

PAW agents detect the source control platform by examining the Remote field in WorkflowContext.md:

1. **Read Remote field** from WorkflowContext.md (defaults to "origin" if omitted)
2. **Resolve remote to URL** if Remote field contains a name (not a URL):
   - Run: `git config --get remote.<name>.url`
   - Use the resulting URL for detection
3. **Parse URL to detect platform**:
   - **GitHub**: Domain contains "github.com"
     - Extract: owner, repo from URL pattern `github.com/<owner>/<repo>`
   - **Azure DevOps**: Domain contains "dev.azure.com" or "visualstudio.com"
     - Modern format: `https://dev.azure.com/<org>/<project>/_git/<repo>`
     - Legacy format: `https://<org>.visualstudio.com/<project>/_git/<repo>`
     - Extract: organization, project, repository
   - **Unknown**: Error with message directing user to verify Remote field
4. **Extract platform-specific identifiers** from URL for use in MCP tool calls

**Platform Detection is performed at runtime** when agents need to invoke platform-specific operations (create PR, post work item comment, etc.). The platform and identifiers are NOT stored in WorkflowContext.md; they are derived on-demand from the Remote field URL.
```

### Success Criteria:

#### Automated Verification:
- [ ] All agent chatmode files parse and load without errors: `ls chatmodes/*.chatmode.md` lists all files
- [ ] WorkflowContext.md format template updated in all 9 agent files (verify with `grep -l "Issue URL" chatmodes/*.chatmode.md`)
- [ ] Backward compatibility notes added to all 8 non-creator agent files (verify with `grep -l "Backward Compatibility" chatmodes/*.chatmode.md`)
- [ ] Platform detection documentation added to PAW-01A (verify with `grep -l "Platform Detection" chatmodes/PAW-01A*`)

#### Manual Verification:
- [ ] Create new WorkflowContext.md with GitHub Issue URL using Spec Agent - verify "Issue URL" field is used
- [ ] Create new WorkflowContext.md with Azure DevOps Work Item URL using Spec Agent - verify "Issue URL" field is used
- [ ] Read existing WorkflowContext.md with "GitHub Issue" field using any agent - verify backward compatibility works
- [ ] Verify platform detection logic is clearly documented and understandable

---

## Phase 2: Status Agent Platform-Specific Operations

### Overview
Update Status Agent to detect platform and route status update operations to appropriate MCP tools (GitHub Issues or Azure DevOps Work Items).

### Changes Required:

#### 1. Status Agent Platform Detection and Routing
**File**: `chatmodes/PAW-X Status Update.chatmode.md`

**Changes**:

1. Add platform detection instructions after "Process Steps" section (~line 50):

```markdown
### Step 0: Platform Detection and Context Extraction

**Before performing any status operations**, detect the platform and extract identifiers:

1. **Read Remote field** from WorkflowContext.md (defaults to "origin")
2. **Resolve remote to URL** if Remote field contains a name:
   ```bash
   git config --get remote.<name>.url
   ```
3. **Parse URL to detect platform**:
   - If domain contains "github.com" → **GitHub**
     - Extract: owner, repo from pattern `github.com/<owner>/<repo>`
   - If domain contains "dev.azure.com" or "visualstudio.com" → **Azure DevOps**
     - Modern: `https://dev.azure.com/<org>/<project>/_git/<repo>`
     - Legacy: `https://<org>.visualstudio.com/<project>/_git/<repo>`
     - Extract: organization, project, repository
   - Otherwise → **Error**: "Unknown platform. Please verify Remote field in WorkflowContext.md points to a GitHub or Azure DevOps repository."

4. **Read Issue URL** from WorkflowContext.md (check "Issue URL" first, fall back to "GitHub Issue")
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

## Phase 3: Implementation Review Agent Platform-Specific PR Operations

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

## Phase 4: PR Agent Platform-Specific Final PR Operations

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

## Phase 5: Documentation and Testing

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

---

## Testing Strategy

### Unit Tests:
No unit tests required - PAW logic exists in agent instruction files, not code. Testing is manual and integration-focused.

### Integration Tests:
Manual integration testing as described in Phase 5:
- Azure DevOps workflow end-to-end test
- GitHub workflow regression test
- Error handling scenarios test

### Manual Testing Steps:

#### Azure DevOps Full Workflow Test:
1. Set up Azure DevOps repository and work item
2. Initialize PAW workflow with work item URL
3. Progress through all stages (Spec → Planning → Implementation → Docs → Final PR)
4. Verify platform detected correctly at each stage
5. Verify status updates posted to work item
6. Verify PRs created and linked correctly
7. Verify PR descriptions formatted correctly

#### GitHub Regression Test:
1. Initialize PAW workflow with GitHub Issue
2. Progress through all stages
3. Verify no functionality regressions
4. Verify backward compatibility with "GitHub Issue" field

#### Error Handling Test:
1. Test each error scenario documented in agent instructions
2. Verify error messages are clear and actionable
3. Verify agents halt gracefully when errors occur

## Performance Considerations

- **Platform Detection Overhead**: Minimal - one git command execution and URL parsing per agent invocation
- **MCP Server Latency**: Azure DevOps MCP operations may have similar latency to GitHub MCP operations (network-dependent)
- **No Caching**: Platform detection performed on-demand each time (acceptable given low frequency and overhead)

## Migration Notes

### For Existing PAW Users:

**No Migration Required**: Existing GitHub-based PAW workflows continue to function without modification.

**Backward Compatibility**:
- Existing WorkflowContext.md files with "GitHub Issue" field will continue to work
- Agents read from both "Issue URL" (new) and "GitHub Issue" (legacy)
- No need to update existing workflow directories

**New Workflows**:
- New workflows will use "Issue URL" field name
- Agents will automatically detect platform from Remote URL
- No manual platform configuration required in most cases

### For Azure DevOps Users:

**Setup Required**:
1. Install Azure DevOps MCP server (one-time setup)
2. Configure authentication (one-time setup)
3. Use Azure DevOps work item URLs when initializing workflows

**No Code Changes**: All configuration is in WorkflowContext.md and agent detection is automatic

## References

- Original Issue: https://github.com/lossyrob/phased-agent-workflow/issues/31
- Spec: `.paw/work/azure-devops/Spec.md`
- Spec Research: `.paw/work/azure-devops/SpecResearch.md`
- Code Research: `.paw/work/azure-devops/CodeResearch.md`
- Azure DevOps MCP Server: https://github.com/microsoft/azure-devops-mcp
- PAW Specification: `paw-specification.md`
