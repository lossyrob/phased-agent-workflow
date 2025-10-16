# Centralized Workflow Parameters Implementation Plan

## Overview

Implement a centralized `WorkflowContext.md` parameter file that eliminates repeated parameter declarations across PAW stage prompts by providing a single source of truth for target branch, GitHub issue reference, remote configuration, artifact paths, and optional inputs.

## Current State Analysis

### Existing Parameter Mechanisms

Based on `CodeResearch.md` findings:

1. **YAML frontmatter in `.prompt.md` files** - Specifies the `mode` field for chatmode routing (`.github/chatmodes/PAW-*.chatmode.md`)
2. **Inline parameters in prompt bodies** - Target branch, GitHub issue references, artifact paths repeated across individual stage prompt files
3. **Interactive prompts** - Agents request missing parameters through conversation when not found in files

### Parameter Discovery Patterns

Current chatmode behavior (from `CodeResearch.md`):
- **Spec Agent** (`.github/chatmodes/PAW-01A Spec Agent.chatmode.md:24-30`): Discovers target branch from current branch if not specified; requires issue link or description
- **Code Researcher** (`.github/chatmodes/PAW-02A Code Researcher.chatmode.md:62`): Saves to `docs/agents/<target_branch>/CodeResearch.md`
- **Implementation Planner** (`.github/chatmodes/PAW-02B Impl Planner.chatmode.md:11-16`): Checks for parameters (file path or GitHub Issue), prompts if missing
- **Implementation Agent** (`.github/chatmodes/PAW-03A Implementer.chatmode.md:14`): Reads ImplementationPlan.md first to identify phase

### Artifact Path Conventions

Standard pattern: `docs/agents/<target_branch>/[Artifact].md`

Observed artifacts:
- `Spec.md`, `SpecResearch.md`, `CodeResearch.md`, `ImplementationPlan.md`, `Docs.md`
- `prompts/` subdirectory containing `.prompt.md` files

### Branch and Remote Usage

Branch derivatives (from `paw-specification.md:47-50`):
- Planning: `<target_branch>_plan`
- Implementation phases: `<target_branch>_phase<N>` or `<target_branch>_phase<M-N>`
- Documentation: `<target_branch>_docs`

**Remote handling**: Currently no explicit remote parameter exists. Git operations implicitly use default remote (typically `origin`). Developers working against forks need to specify remote in git operations manually.

### Key Constraints

- No programmatic validation exists; agents rely on LLM interpretation of Markdown
- Backward compatibility required: existing workflows without WorkflowContext.md must continue functioning
- GitHub MCP tools used exclusively for issue/PR interactions (not `gh` CLI)
- Parameters are manually maintained; no automated sync mechanism

## Desired End State

A developer can create `WorkflowContext.md` for a feature branch and use it across all PAW stages without re-entering target branch, remote, or issue information. The file follows a documented structure, provides clear error messages when malformed, and supports both standard origin workflows and fork-based development.

### Verification Criteria

1. **File Creation**: Developer creates `docs/agents/<target_branch>/WorkflowContext.md` with required parameters
2. **Multi-Stage Usage**: File is successfully referenced in at least three distinct PAW stages (Spec, Code Research, Implementation) without parameter re-entry
3. **Backward Compatibility**: Existing workflows without WorkflowContext.md continue to function with interactive prompts
4. **Error Handling**: Missing required fields produce clear error messages identifying missing parameters
5. **Fork Support**: Developer specifies non-default remote (e.g., `fork`, `upstream`) and PR operations target the specified remote
6. **Default Remote**: Omitted remote field defaults to `origin` without user prompts

## What We're NOT Doing

- Automated generation or update of `WorkflowContext.md` (manual creation only)
- Programmatic validation or schema enforcement (agents rely on LLM interpretation)
- Validation of git remote existence before operations (developer responsible for remote configuration)
- Updating existing stage prompt files to reference `WorkflowContext.md` (prompts remain unchanged for backward compatibility)
- Defining precedence rules for conflicting parameters (agents ask for clarification)
- Migrating historical feature branches to use `WorkflowContext.md` (applies to new workflows only)
- Integration with external configuration systems or CI/CD pipelines

## Implementation Approach

The implementation is broken into two distinct phases:

1. **Phase 1**: Update all chatmode instruction files to recognize and extract parameters from WorkflowContext.md, with minimal inline template
2. **Phase 2**: Update paw-specification.md to document WorkflowContext.md usage throughout the workflow

This phasing allows each increment to be independently reviewed and merged, with Phase 1 enabling agent support through inline templates, and Phase 2 completing user-facing documentation.

---

## Phase 1: Update Chatmode Instructions

### Overview

Update all PAW chatmode instruction files to recognize WorkflowContext.md when present in chat context and extract parameters without additional user prompts. Include a minimal inline template in each chatmode for reference. Maintain backward compatibility by falling back to existing parameter discovery behavior when the file is absent.

### Minimal WorkflowContext.md Format

Each chatmode will reference this minimal format for WorkflowContext.md:

```markdown
# WorkflowContext

Target Branch: <target_branch>
GitHub Issue: <issue_url>
Remote: <remote_name>
Artifact Paths: <auto-derived or explicit>
Additional Inputs: <comma-separated or none>
```

Agents understand parameter meanings from context. GitHub Issue and all other fields except Target Branch are optional.

### Changes Required

#### 1. Update Spec Agent (PAW-01A)

#### 3. Create README for Template Usage

**File**: `docs/templates/README.md`
**Changes**: Create documentation explaining template usage

```markdown
# PAW Templates

This directory contains templates for various PAW (Phased Agent Workflow) artifacts.

## WorkflowContext.md

**Purpose**: Centralized parameter document that eliminates repeated parameter declarations across PAW stage prompts.

**Location in your workflow**: `docs/agents/<target_branch>/WorkflowContext.md`

**When to create**: At the start of a new feature workflow, before invoking the first PAW stage agent.

**How to use**:

1. Copy `WorkflowContext.md` to your feature branch folder:
   ```bash
   mkdir -p docs/agents/<your_target_branch>
   cp docs/templates/WorkflowContext.md docs/agents/<your_target_branch>/WorkflowContext.md
   ```

2. Edit the file to replace all `<placeholder>` values with your actual parameters

3. Commit the file to your feature branch:
   ```bash
   git add docs/agents/<your_target_branch>/WorkflowContext.md
   git commit -m "Add workflow context for <your_target_branch>"
   ```

4. Reference the file when invoking PAW agents by including it in your chat context

**See also**: `docs/examples/WorkflowContext-example.md` for a concrete example with populated values.

## Required Parameters

- **Target Branch**: Your feature branch name (e.g., `feature/add-authentication`)
- **GitHub Issue**: Issue URL or `#number` format

## Optional Parameters

- **Remote**: Git remote name (defaults to `origin` if omitted)
- **Artifact Paths**: Paths to workflow artifacts (auto-derived if omitted)
- **Additional Inputs**: Supporting documents for research stages

## Parameter Extraction

PAW agents use LLM interpretation to extract parameters from the Markdown structure. No programmatic parsing occurs.

## Error Handling

If required parameters are missing, agents will report which parameters are absent and request them interactively.

## Backward Compatibility

WorkflowContext.md is optional. Existing workflows without this file continue to function with interactive parameter prompts.
```

### Success Criteria

#### Automated Verification:
- [ ] Template file exists at `docs/templates/WorkflowContext.md` with all required sections
- [ ] Example file exists at `docs/examples/WorkflowContext-example.md` with populated values
- [ ] README exists at `docs/templates/README.md` with usage instructions
- [ ] All files are valid Markdown: `markdownlint docs/templates/ docs/examples/`
- [ ] Files are committed to the feature branch

#### Manual Verification:
- [ ] Template structure is clear and easy to understand
- [ ] Example demonstrates realistic usage with appropriate values
- [ ] README provides sufficient guidance for developers to create their own WorkflowContext.md
- [ ] All required and optional parameters are documented
- [ ] Inline comments in template are helpful and accurate

### Status

Not started

---

## Phase 2: Update paw-specification.md Documentation

### Overview

Update the main PAW specification document to introduce WorkflowContext.md, explain its purpose, document its structure, and integrate its usage into the workflow stage descriptions. This phase completes the user-facing documentation.

### Changes Required

#### 1. Add WorkflowContext.md to Repository Layout Section

**File**: `paw-specification.md`
**Changes**: Update the "Repository Layout & Naming" section (around line 11) to include WorkflowContext.md

```markdown
## Repository Layout & Naming

```
/.github/chatmodes                       # chat-mode prompts (final outputs of this work)
  PAW-01A Spec Agent.chatmode.md
  PAW-01B Spec Research Agent.chatmode.md
  PAW-02A Code Research Agent.chatmode.md
  PAW-02B Impl Plan Agent.chatmode.md
  PAW-03A Impl Agent.chatmode.md
  PAW-03B Impl Review Agent.chatmode.md
  PAW-04 Documentation Agent.chatmode.md
  PAW-05 PR Agent.chatmode.md
  PAW-0X Status Agent.chatmode.md

/docs/agents/                   # artifacts created by the PAW process
  <target_branch>/              # e.g., feature/add-authentication or user/rde/bugfix-123
    WorkflowContext.md          # Centralized parameter file (optional)
    prompts/
      spec-research.prompt.md   # Optional: generated by Spec Agent if required, refined by developer
      code-research.prompt.md   # Optional: generated if additional code research is needed
    Spec.md    
    SpecResearch.md
    CodeResearch.md
    ImplementationPlan.md
    Docs.md

/docs/templates/                # Templates for PAW artifacts
  WorkflowContext.md            # Template for centralized parameters
  README.md                     # Template usage documentation

/docs/examples/                 # Example artifacts
  WorkflowContext-example.md    # Example WorkflowContext.md with populated values
```
```

#### 2. Add Prerequisites Section for WorkflowContext.md

**File**: `paw-specification.md`
**Changes**: Update the "Prerequisites" section (around line 60) to mention WorkflowContext.md

```markdown
### Prerequisites

**Inputs:** 

* GitHub Issue if available, otherwise rough brief about the goals of the work.
* A clean branch to track work (e.g., `feature/paw-prompts` or `user/rde/bugfix-123`).

**Human Prerequisite Actions:**

* Create a GitHub Issue if none exists (title, description, links), or write up a brief description of the work that can be pasted into chat.
* Create branch to track work; e.g., `feature/paw-prompts` or `user/rde/bugfix-123`.
* **(Optional)** Create WorkflowContext.md to centralize parameters and eliminate repetition across stages:
  ```bash
  mkdir -p docs/agents/<your_target_branch>
  cp docs/templates/WorkflowContext.md docs/agents/<your_target_branch>/WorkflowContext.md
  # Edit the file to populate parameters
  git add docs/agents/<your_target_branch>/WorkflowContext.md
  git commit -m "Add workflow context for <your_target_branch>"
  ```

**Artifacts:** issue link (optional), branches created, WorkflowContext.md (optional).
```

#### 3. Update Stage 01 Documentation

**File**: `paw-specification.md`
**Changes**: Update "Stage 01 - Specification" inputs section (around line 74) to reference WorkflowContext.md

```markdown
### Stage 01 - Specification

**Agents:** 

* Spec Agent
* Spec Research Agent

**Inputs**:

* **WorkflowContext.md** (optional): If present at `docs/agents/<target_branch>/WorkflowContext.md`, provides target branch, GitHub issue, remote, and additional inputs automatically. Otherwise:
  * GitHub Issue link/ID (or brief describing the work)
  * Target branch name (agent can also discover this from the current branch)
  * Any design documents or traditional feature specs that provide additional context for this or a broader set of related work.

**Outputs**:

* `/docs/agents/<target_branch>/Spec.md`
* `/docs/agents/<target_branch>/prompts/spec-research.prompt.md`
* `/docs/agents/<target_branch>/SpecResearch.md` containing System Behavior answers and a "User-Provided External Knowledge" section listing any optional unanswered external/context questions and user-provided context.

**Human Workflow:**

* Ensure a clean and up-to-date feature branch is checked out locally.
* (Optional) If WorkflowContext.md exists, include it in the chat context when invoking the Spec Agent.
* Ask the Spec Agent to draft the spec, providing the Issue link/ID (or brief describing the work), feature branch name, and any hard constraints.
* The Spec Agent will interactively refine the spec with the developer. It will also provide the `spec-research.prompt.md` file with factual questions about the current system.
* Review and refine `spec-research.prompt.md` to add any additional clarifying questions.
* Run the Spec Research Agent to answer the questions in `spec-research.prompt.md` and produce `SpecResearch.md`. If external research tooling is unavailable, fill (or consciously skip) the "External Knowledge" checklist the agent outputs.
* Iterate with the Spec Agent to refine the spec based on findings from `SpecResearch.md`.
* Continue iterating with the above steps until the spec is clear, complete, and testable.

Note the spec will be committed and pushed to the planning branch (`<target_branch>_plan`) at the end of the next stage.
```

#### 4. Update Stage 02 Documentation

**File**: `paw-specification.md`
**Changes**: Update "Stage 02 - Implementation Plan" inputs section (around line 102) to reference WorkflowContext.md

```markdown
### Stage 02 - Implementation Plan

**Agents:**

* Code Research Agent
* Implementation Plan Agent

**Inputs:**

* **WorkflowContext.md** (optional): If present at `docs/agents/<target_branch>/WorkflowContext.md`, provides target branch, GitHub issue, remote, and artifact paths automatically. Otherwise:
  * Target branch name (agent can also discover this from the current branch)
  * `Spec.md` and `SpecResearch.md` from Stage 01 must be available in the expected location (`/docs/agents/<target_branch>/`), or have their paths provided.

**Outputs:**
* `/docs/agents/<target_branch>/CodeResearch.md`
* `/docs/agents/<target_branch>/ImplementationPlan.md`
* `/docs/agents/<target_branch>/prompts/code-research.prompt.md` (optional)
* Planning PR opened/updated (`<target_branch>_plan` → `<target_branch>`)

**Human Workflow:**
- Ensure feature branch is checked out locally and updated with merged planning branch.
- (Optional) If WorkflowContext.md exists, include it in the chat context when invoking agents.
- Ask the Code Research Agent to map relevant code areas and dependencies based on the Spec and Spec Research documents, producing `CodeResearch.md`.
- Review `CodeResearch.md` for completeness and accuracy. If necessary, create `prompts/code-research.prompt.md` with guidance and run it with the Code Research Agent to regenerate `CodeResearch.md`.
- Ask the Implementation Plan Agent to draft a detailed implementation plan based on the Spec, Spec Research, and Code Research documents.
- Collaborate with the Implementation Plan Agent to refine the plan and answer open questions.
- If the Implementation Plan Agent makes requests for additional research via edits or creation of `code-research.prompt.md`, run the Code Research Agent as needed.
- Continue iterating with the above steps until the plan is clear, complete, and broken into discrete Implementation Phases.
- The Implementation Plan Agent will open or update the Planning PR with the final output documents from Stage 01 and Stage 02.
- The developer will then review the PR and provide feedback or request changes as needed.
- The developer will ask the Implementation Plan Agent to address any review comments.
- The Implementation Plan Agent will address each comment with focused commits.
- The developer will then review the PR again to ensure all comments have been addressed satisfactorily.
- Once the Planning PR is approved, the developer will merge it and update the local target branch.
- If tracking with a GitHub Issue, use the Status Agent to update the Issue with status and links. This can occur when the Planning PR is opened, updated, or merged.
```

#### 5. Update Remaining Stage Documentation

**File**: `paw-specification.md`
**Changes**: Add WorkflowContext.md reference to Stage 03, 04, and 05 inputs sections

For **Stage 03 — Phased Implementation** (around line 144):
```markdown
**Inputs:**

* **WorkflowContext.md** (optional): If present, provides target branch, remote, and ImplementationPlan.md path automatically. Otherwise:
  * Target branch name (agent can also discover this from the current branch)
  * `ImplementationPlan.md` from Stage 02 must be available in the expected location (`/docs/agents/<target_branch>/`), or have its path provided. This provides paths to `Spec.md`, `SpecResearch.md`, along with other related context.
  * The `CodeResearch.md` file.
```

For **Stage 04 — Documentation** (around line 218):
```markdown
**Inputs:**

* **WorkflowContext.md** (optional): If present, provides target branch, remote, and ImplementationPlan.md path automatically. Otherwise:
  * `ImplementationPlan.md` from Stage 02 must be available in the expected location (`/docs/agents/<target_branch>/`), or have its path provided. All Phases must be complete and merged to the target branch, with status updated in the plan.
  * All PRs from the implementation phases (agent can search for these or refer to GitHub Issue).
```

For **Stage 05 — Final PR to `main`** (around line 236):
```markdown
**Inputs:**

* **WorkflowContext.md** (optional): If present, provides target branch, remote, and all artifact paths automatically. Otherwise:
  * Target branch name (agent can also discover this from the current branch)
  * All inputs and outputs from the Stage 04 Documentation stage
```

#### 6. Add New Artifacts Section for WorkflowContext.md

**File**: `paw-specification.md`
**Changes**: Add new section after "Docs.md" artifact section (around line 600)

```markdown
### WorkflowContext.md

The **Workflow Context** document provides centralized parameters for all PAW stages, eliminating the need to re-specify target branch, GitHub issue, remote, and artifact paths across multiple stage invocations.

**Purpose:** Serve as a single source of truth for workflow parameters, reducing repetition and potential inconsistencies when invoking PAW agents.

**Location:** `/docs/agents/<target_branch>/WorkflowContext.md`

**Dependencies:** None (created manually at workflow start or generated by agents when parameters are provided)

#### Core Principle: Single Source of Truth

WorkflowContext.md centralizes all recurring parameters used throughout the PAW workflow:

**What it DOES include:**
- Target branch name (required)
- GitHub issue reference in URL format (optional, preferred when provided)
- Git remote name for branch and PR operations (optional, defaults to 'origin')
- Artifact paths for Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md (optional, auto-derived if omitted)
- Additional inputs for research stages (optional)

**What it does NOT include:**
- Implementation details or code
- Transient state like current phase or PR numbers
- Agent instructions or chatmode configurations

#### Structure & Content

The document follows a simple Markdown structure with clearly labeled sections:

**Header**
- Document title: "Workflow Context"
- Brief purpose statement

**Parameters Section**
Each parameter includes:
- Parameter name (e.g., "Target Branch")
- Required/Optional indicator
- Description of the parameter's purpose
- Value placeholder or actual value
- Example value
- For optional parameters: default behavior when omitted

**Usage Section**
- Instructions for including the file in chat context
- Quick start guide for creating WorkflowContext.md
- Stage compatibility information

#### Parameter Definitions

**Target Branch** (Required)
- The feature branch serving as the namespace for all workflow artifacts
- Format: Standard git branch name (e.g., `feature/add-authentication`)
- Used by agents to derive artifact paths and branch derivatives

**Remote** (Optional, defaults to 'origin')
- Git remote name for branch and PR operations
- Format: Git remote name (e.g., `origin`, `fork`, `upstream`)
- Useful for fork workflows where developer works against a non-default remote
- When omitted, agents default to 'origin' for all git operations

**GitHub Issue** (Optional, URL format preferred)
- Reference to the driving issue for this workflow
- Format: Full URL (`https://github.com/owner/repo/issues/N`) preferred for repo information
- Used by agents to link artifacts and updates back to the issue when provided

**Artifact Paths** (Optional, auto-derived if omitted)
- Locations of canonical workflow artifacts
- When omitted, agents derive paths using convention: `docs/agents/<target_branch>/<Artifact>.md`
- Can be explicitly specified for non-standard layouts:
  - Spec.md path
  - SpecResearch.md path
  - CodeResearch.md path
  - ImplementationPlan.md path
  - Docs.md path

**Additional Inputs** (Optional)
- Comma-separated list of supplementary documents referenced during research
- Examples: `paw-specification.md`, `docs/architecture.md`
- Use `none` if no additional inputs are needed

#### Creation & Usage

**When to Create:**
- At the start of a new feature workflow, before invoking the first PAW stage agent
- Optionally generated by Spec Agent or Implementation Planner when parameters are provided

**How to Create:**
1. Copy template from `docs/templates/WorkflowContext.md` to `docs/agents/<target_branch>/WorkflowContext.md`
2. Replace all `<placeholder>` values with actual parameters
3. Commit to feature branch
4. Include in chat context when invoking any PAW agent

**Agent Recognition:**
All PAW agents recognize WorkflowContext.md when included in chat context:
- Agents extract parameters automatically without additional prompts
- If required parameters are missing, agents report which parameters are absent
- If the file is absent, agents fall back to existing parameter discovery behavior (interactive prompts or branch inspection)

#### Backward Compatibility

WorkflowContext.md is entirely optional:
- Existing workflows without this file continue to function normally
- Agents maintain existing parameter discovery mechanisms
- No breaking changes to current workflows

#### Example

See `docs/examples/WorkflowContext-example.md` for a complete example with populated values.

#### Quality Standards

A well-formed WorkflowContext.md:
- **Is Complete**: Contains required parameter (target branch)
- **Is Clear**: Uses exact values without ambiguity
- **Is Consistent**: Values match actual branch names and issue references if provided
- **Is Maintained**: Updated when workflow parameters change (e.g., issue reference updates)
```

### Success Criteria

#### Automated Verification:
- [ ] paw-specification.md updated with WorkflowContext.md references in all relevant sections
- [ ] New WorkflowContext.md artifact section added to specification
- [ ] No Markdown syntax errors: `markdownlint paw-specification.md`
- [ ] All internal links to WorkflowContext.md are valid
- [ ] Changes are committed to the feature branch

#### Manual Verification:
- [ ] Repository layout diagram accurately reflects WorkflowContext.md location
- [ ] Prerequisites section clearly explains when and how to create WorkflowContext.md
- [ ] Each stage's inputs section mentions WorkflowContext.md appropriately
- [ ] WorkflowContext.md artifact section is comprehensive and follows the same format as other artifact sections
- [ ] Documentation emphasizes optional nature and backward compatibility
- [ ] Examples and usage instructions are clear and actionable

### Status

Not started

---

## Testing Strategy

### Phase 1 Testing

**Unit-Level Verification:**
- Validate template file structure matches documented schema
- Verify example file contains realistic, consistent values
- Check README provides complete usage instructions

**Integration Testing:**
- Create WorkflowContext.md from template for a test feature branch
- Verify all required sections are present and properly formatted
- Confirm documentation is understandable to developers unfamiliar with PAW

**Manual Testing:**
1. Follow README instructions to create WorkflowContext.md for a dummy feature
2. Verify all placeholders are easily identifiable and replaceable
3. Confirm example file demonstrates all parameter types (required, optional, defaults)

### Phase 2 Testing

**Unit-Level Verification:**
- Each chatmode file contains WorkflowContext.md recognition logic
- Parameter extraction logic handles missing required fields correctly
- Remote parameter defaults to 'origin' when omitted
- Backward compatibility is maintained (agents work without WorkflowContext.md)

**Integration Testing:**
- Test each agent with WorkflowContext.md present in chat context
- Verify parameters are extracted correctly without additional prompts
- Test each agent without WorkflowContext.md to confirm fallback behavior
- Test with malformed WorkflowContext.md (missing required fields) to verify error messages

**Manual Testing:**
1. Create WorkflowContext.md for a test feature: `feature/test-workflow-context`
2. Invoke Spec Agent with WorkflowContext.md in context, verify it uses extracted parameters
3. Invoke Code Research Agent with WorkflowContext.md, verify automatic parameter extraction
4. Invoke Implementation Planner with WorkflowContext.md, verify it reads correct artifact paths
5. Test with WorkflowContext.md specifying `remote: fork`, verify agents reference the fork remote
6. Test without WorkflowContext.md, verify agents prompt for parameters as before
7. Test with incomplete WorkflowContext.md (missing GitHub issue), verify clear error message

### Phase 3 Testing

**Documentation Verification:**
- All stage sections reference WorkflowContext.md appropriately
- Repository layout diagram includes WorkflowContext.md
- Prerequisites section explains WorkflowContext.md creation
- New artifact section is comprehensive and accurate

**Cross-Reference Validation:**
- Verify all internal links to WorkflowContext.md are valid
- Confirm documentation matches actual template structure
- Ensure examples align with documented parameter formats

**Manual Testing:**
1. Read through updated paw-specification.md as a new PAW user
2. Follow documented workflow to create WorkflowContext.md
3. Verify instructions are clear, complete, and accurate
4. Confirm artifact section matches template structure

### End-to-End Testing

**Complete Workflow Test:**
1. Create a test feature branch: `feature/e2e-test-workflow-context`
2. Create WorkflowContext.md using the template with all required parameters
3. Run through Stages 01-05 using WorkflowContext.md in all agent invocations
4. Verify no parameter re-entry is required across stages
5. Confirm all agents extract parameters correctly from WorkflowContext.md
6. Validate that remote parameter is used correctly for git operations

**Fork Workflow Test:**
1. Create WorkflowContext.md specifying `remote: upstream` for a fork scenario
2. Run through implementation stages, verify agents use `upstream` for branch/PR operations
3. Confirm PR creation targets the correct remote repository

**Backward Compatibility Test:**
1. Create a test feature branch without WorkflowContext.md
2. Run through Stages 01-05 using traditional parameter passing
3. Verify all agents continue to function as before
4. Confirm no regressions in existing workflows

### Success Metrics

- [ ] All 3 phases pass automated verification criteria
- [ ] Manual testing confirms parameter extraction works correctly
- [ ] Backward compatibility is maintained (existing workflows unaffected)
- [ ] Fork workflow scenario functions correctly with non-default remote
- [ ] Error messages for malformed WorkflowContext.md are clear and actionable
- [ ] Documentation is complete, accurate, and understandable

---

## Performance Considerations

WorkflowContext.md introduces no performance implications:
- File is read by LLM as part of chat context (same as any Markdown file)
- No programmatic parsing or validation overhead
- No impact on agent response times
- File size is negligible (typically <2KB)

**Optimization Notes:**
- Keep WorkflowContext.md concise; avoid including unnecessary documentation in the parameter file
- Use auto-derived artifact paths when possible to reduce file size
- Update WorkflowContext.md only when parameters actually change

---

## Migration Notes

### Existing Workflows

**No migration required** for existing feature branches:
- WorkflowContext.md is entirely optional
- Agents maintain existing parameter discovery mechanisms
- Existing prompt files (.prompt.md) continue to work as before
- No breaking changes to current workflows

### New Workflows

**Recommended approach** for new feature branches:
1. Create WorkflowContext.md at workflow start (before Stage 01)
2. Populate all known parameters (target branch, GitHub issue, remote if working against fork)
3. Commit WorkflowContext.md to feature branch
4. Reference WorkflowContext.md when invoking all PAW agents
5. Update WorkflowContext.md if parameters change (e.g., issue reference updates)

### Gradual Adoption

Teams can adopt WorkflowContext.md gradually:
- Start using it for new feature branches
- Optionally backfill for in-progress features if beneficial
- No pressure to migrate historical or completed features
- Developers choose whether to use it per-workflow

### Template Updates

If template structure changes in the future:
- Existing WorkflowContext.md files remain valid (backward compatible)
- New optional parameters can be added without breaking existing files
- Agents will continue to support both old and new formats

---

## References

- **Original Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/12
- **Spec**: `docs/agents/feature/param-doc/Spec.md`
- **Spec Research**: `docs/agents/feature/param-doc/SpecResearch.md`
- **Code Research**: `docs/agents/feature/param-doc/CodeResearch.md`
- **PAW Specification**: `paw-specification.md` (sections on Repository Layout, Artifacts, and Workflow Stages)
- **Chatmode Files**: `.github/chatmodes/PAW-*.chatmode.md` (parameter discovery patterns)
- **Similar Implementation**: None (new capability)

---

## Implementation Notes

### Key Design Decisions

1. **LLM-Based Extraction**: No programmatic parsing allows flexibility and maintains simplicity
2. **Backward Compatibility**: Making WorkflowContext.md optional ensures zero breaking changes
3. **Auto-Derived Paths**: Default artifact path derivation reduces file maintenance burden
4. **Remote Default**: Defaulting to 'origin' supports the most common workflow scenario
5. **Manual Creation**: Keeping file creation manual maintains human control and awareness

### Potential Future Enhancements (Out of Scope)

- Automated WorkflowContext.md generation by Spec Agent when parameters are provided
- Schema validation tool to check WorkflowContext.md completeness before stages
- Parameter precedence rules when both WorkflowContext.md and prompt files provide values
- Automated sync mechanism to update WorkflowContext.md when parameters change
- Support for environment-specific parameter overrides (dev/staging/prod)

### Review Focus

When reviewing this implementation:
- **Phase 1**: Verify template clarity and completeness; ensure examples are realistic
- **Phase 2**: Confirm backward compatibility is maintained; test parameter extraction logic
- **Phase 3**: Validate documentation accuracy and completeness; check cross-references
- **Integration**: Test end-to-end workflow with WorkflowContext.md across all stages
- **Edge Cases**: Test malformed files, missing parameters, fork workflows, backward compatibility

