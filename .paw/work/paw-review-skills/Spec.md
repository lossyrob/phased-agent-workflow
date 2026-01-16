# Feature Specification: PAW Review Skills

**Branch**: feature/paw-review-skills  |  **Created**: 2026-01-15  |  **Status**: Draft
**Input Brief**: Migrate PAW Review workflow from 6 discrete agents to a single agent with dynamically-loaded skills

## Overview

The PAW Review workflow currently operates through six specialized agents (R1A Understanding, R1B Baseline Researcher, R2A Impact Analyzer, R2B Gap Analyzer, R3A Feedback Generator, R3B Feedback Critic) that execute in sequence with manual handoffs between each stage. Users invoke each agent separately, passing state through artifacts written to disk. While this approach provides clear separation of concerns, it requires six separate agent installations, verbose orchestration instructions across multiple files, and manual user intervention at each transition—making the review experience fragmented and time-consuming.

This feature transforms the review workflow into a skills-based architecture where a single PAW Review agent dynamically loads and executes review capabilities from skill definitions. When a user initiates a review, they invoke one prompt command that launches the Review agent. The agent discovers available skills through a catalog tool, identifies the appropriate workflow skill for the situation (single-repo or cross-repo), and orchestrates the review process automatically. Each phase of the review—understanding the PR changes, researching the baseline codebase, analyzing impact, identifying gaps, generating feedback, and critiquing that feedback—executes as a subagent that loads its specific activity skill. The workflow runs to completion without pauses, producing the same artifacts (ReviewContext.md, DerivedSpec.md, CodeResearch.md, ImpactAnalysis.md, GapAnalysis.md, ReviewComments.md) and GitHub pending review as the current system.

The skills architecture also enables graceful handling of cross-repository scenarios where a single VS Code workspace contains multiple projects with their own PRs to review. Rather than requiring entirely different agents or complex conditional logic embedded in agent prompts, the system offers distinct workflow skills that the Review agent selects based on context. Activity skills remain generic—the same understanding, analysis, and feedback generation logic applies whether reviewing one PR or coordinating across several. This separation means the bulk of review logic lives in reusable activity skills, while orchestration variations are isolated to lightweight workflow skills.

Beyond the immediate review workflow improvements, this feature establishes foundational infrastructure for PAW's evolution toward skills-based operation. The `paw_get_skills` and `paw_get_skill` tools provide a distribution mechanism for bundled capabilities that VS Code's native skill discovery (which requires files in workspace directories) cannot address. This positions the extension to incrementally migrate other workflows to skills while maintaining compatibility with the existing implementation agents.

## Objectives

- Enable users to execute the complete PR review workflow through a single entry point that orchestrates all review phases automatically (Rationale: eliminates manual handoffs between six separate agent invocations)
- Provide dynamic skill discovery and loading so the Review agent can adapt its behavior based on available skills and workspace context (Rationale: supports both current single-repo and future cross-repo scenarios without hardcoded branching)
- Preserve all existing review artifacts and outputs so users experience equivalent review quality with less friction (Rationale: validates skills architecture without regression)
- Consolidate review workflow logic into modular, maintainable skill definitions rather than distributed agent prompts (Rationale: reduces token budget per invocation and simplifies evolution)
- Establish the tools infrastructure (`paw_get_skills`, `paw_get_skill`) that enables progressive migration of other PAW workflows to skills (Rationale: this feature is an incremental step toward PAW v2)

## User Scenarios & Testing

### User Story P1 – Single-Repository PR Review
**Narrative**: A developer working in a VS Code workspace containing a single project wants to review a pull request. They invoke the review command, provide the PR number, and receive comprehensive review feedback posted to GitHub without manually advancing through multiple agents.

**Independent Test**: Run `/paw-review` with a PR number and verify ReviewComments.md is generated with pending review created on GitHub.

**Acceptance Scenarios**:
1. Given a workspace with one project and an open PR, When the user runs the review prompt command with PR number, Then the Review agent executes all workflow phases and produces ReviewComments.md
2. Given a review in progress, When any workflow phase completes, Then the next phase begins automatically without user intervention
3. Given a completed review, When the workflow finishes, Then a pending GitHub review exists with comments matching ReviewComments.md

### User Story P2 – Skill-Driven Workflow Selection
**Narrative**: An advanced user with multiple projects in their workspace wants the Review agent to automatically detect whether a single-repo or cross-repo workflow is appropriate and execute accordingly.

**Independent Test**: Open a multi-project workspace, invoke review, and observe the agent load the cross-repo workflow skill.

**Acceptance Scenarios**:
1. Given a single-project workspace, When review is initiated, Then the agent loads `paw-review-workflow` skill
2. Given a multi-project workspace with multiple PRs, When review is initiated, Then the agent identifies and loads the cross-repo workflow skill
3. Given available skills returned by `paw_get_skills`, When the agent evaluates context, Then it selects the workflow skill matching its situation

### User Story P3 – Extension Developer Adds New Skills
**Narrative**: A contributor to PAW wants to add a new review capability (e.g., security-focused analysis) by creating a new skill file in the `skills/` directory without modifying agent prompts.

**Independent Test**: Add a new skill directory with SKILL.md, rebuild extension, and verify it appears in `paw_get_skills` catalog.

**Acceptance Scenarios**:
1. Given a new skill directory in `skills/` with valid SKILL.md frontmatter, When `paw_get_skills` is called, Then the new skill appears in the catalog with correct name and description
2. Given a skill with `metadata.type: activity`, When listed in catalog, Then the type is included for agent decision-making

### Edge Cases
- Invalid or malformed SKILL.md frontmatter: Tool returns error message indicating the problematic skill, workflow continues with valid skills
- Skill not found by name: `paw_get_skill` returns clear error; workflow skill handles missing activity gracefully
- Subagent fails mid-workflow: Parent agent receives failure indication and reports to user with partial progress
- Cross-repo detection with single PR: Falls back to standard workflow, doesn't require cross-repo skill
- Large skill file (>5000 tokens): Still returned but may impact context window; documented as best practice limit

## Requirements

### Functional Requirements

- FR-001: System shall provide `paw_get_skills` tool that returns a catalog of available skills with name, description, type (if present), and source (Stories: P2, P3)
- FR-002: System shall provide `paw_get_skill` tool that returns the full SKILL.md content for a specified skill name (Stories: P1, P2, P3)
- FR-003: Extension shall bundle built-in skills in `skills/` directory, organized as `<skill-name>/SKILL.md` (Stories: P1, P2, P3)
- FR-004: Extension installer shall install `paw-review.prompt.md` prompt file to user's VS Code prompts directory as entry point (Stories: P1)
- FR-005: System shall install a single PAW Review agent that loads skills dynamically via tools (Stories: P1, P2)
- FR-006: Workflow skill shall orchestrate activity skills by instructing the agent to run each as a subagent (Stories: P1)
- FR-007: Activity skills shall produce the same artifacts as their corresponding current agents: ReviewContext.md, DerivedSpec.md, CodeResearch.md, ImpactAnalysis.md, GapAnalysis.md, ReviewComments.md (Stories: P1)
- FR-008: Feedback activity skill shall create GitHub pending review with line-specific comments matching ReviewComments.md content (Stories: P1)
- FR-009: Skills shall follow Agent Skills specification frontmatter schema with required `name` and `description` fields (Stories: P3)
- FR-010: Existing implementation workflow agents (PAW-01A through PAW-05) shall remain unchanged and functional (Stories: P1)
- FR-011: Current PAW-R* review agents shall be removed from the extension after migration (Stories: P1)

### Key Entities

- **Skill**: A SKILL.md file containing YAML frontmatter (name, description, optional metadata) and markdown body with instructions
- **Workflow Skill**: A skill with `metadata.type: workflow` that orchestrates a sequence of activity skills
- **Activity Skill**: A skill with `metadata.type: activity` that performs a specific review task and produces artifacts
- **Skill Catalog**: The list of available skills returned by `paw_get_skills` containing metadata only (~100 tokens per skill)
- **PAW Review Agent**: Single agent that dynamically loads skills to perform reviews

### Cross-Cutting / Non-Functional

- Token efficiency: Each skill body should target <5000 tokens to fit within context alongside other materials
- Backward compatibility: Implementation workflow (PAW-01A through PAW-05, PAW-X) unaffected by this change
- Subagent execution: Activities run as subagents, returning artifact paths (not content) to parent

## Success Criteria

- SC-001: User can execute complete review workflow via single prompt command invocation (FR-004, FR-005, FR-006)
- SC-002: `paw_get_skills` returns catalog containing all bundled review skills with correct metadata (FR-001, FR-003)
- SC-003: `paw_get_skill` returns full skill content when called with valid skill name (FR-002)
- SC-004: Review workflow produces all six expected artifacts in `.paw/reviews/` directory (FR-007)
- SC-005: GitHub pending review is created with comments when PR context is available (FR-008)
- SC-006: Implementation workflow agents execute normally with no changes to behavior (FR-010)
- SC-007: Six PAW-R* agent files are removed from extension installation (FR-011)
- SC-008: New skills added to `skills/` directory appear in catalog after extension rebuild (FR-001, FR-009)

## Assumptions

- VS Code subagent execution via `runSubagent` provides tool access equivalent to parent agent context (research indicates this is the case)
- Subagents can parse and follow skill instructions loaded via `paw_get_skill` without additional scaffolding
- GitHub MCP tools remain available for pending review creation and comment posting
- Users have authenticated GitHub access when reviewing PRs that require posting comments
- Extension bundling includes `skills/` directory contents in VSIX package (follows existing `agents/` pattern)

## Scope

**In Scope:**
- `paw_get_skills` and `paw_get_skill` tool implementations (built-in skills only)
- Seven built-in skills: workflow (1) + activities (6)
- Single PAW Review agent that loads skills dynamically
- `paw-review.prompt.md` entry point prompt file
- Extension installer updates for prompt file installation
- Removal of six PAW-R* agent files
- Documentation updates to reflect skills architecture

**Out of Scope:**
- Workspace skills (`.github/skills/` discovery)
- User-level skills (`~/.paw/skills/` discovery)
- Custom skill override mechanisms
- Implementation workflow migration to skills
- Changes to implementation agents (PAW-01A through PAW-05)
- Cross-repo workflow skill (structure prepared, implementation deferred unless time permits)
- Skill dependency resolution or versioning

## Dependencies

- VS Code extension context for skill file access via `vscode.Uri.joinPath(extensionUri, 'skills')`
- GitHub MCP tools for pending review creation (`mcp_github_pull_request_review_write`, `mcp_github_add_comment_to_pending_review`)
- `runSubagent` tool for activity skill execution
- Existing artifact directory structure (`.paw/reviews/<identifier>/`)

## Risks & Mitigations

- **Subagent skill loading complexity**: Subagents may have difficulty following complex skill instructions. Mitigation: Keep activity skills focused and under 5000 tokens; test each skill independently.
- **Token budget pressure**: Loading workflow skill plus activity skill per phase may consume significant context. Mitigation: Design skills for minimal footprint; activity skills are loaded one at a time by subagent, not accumulated.
- **Regression in review quality**: Skills-based approach may miss nuances from current agent prompts. Mitigation: Directly migrate agent content to skills; validate artifact equivalence in testing.
- **Cross-repo complexity deferred**: Multi-repo scenario support is architecturally enabled but not fully implemented. Mitigation: Document as known limitation; single-repo is fully supported.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/154
- Research: .paw/work/paw-review-skills/SpecResearch.md
- Initial Notes: .paw/work/paw-review-skills/context/initial-notes.md
- Agent Skills Specification: https://agentskills.io/specification
- VS Code Skills Documentation: https://code.visualstudio.com/docs/copilot/customization/agent-skills
- Current Review Specification: paw-review-specification.md

## Glossary

- **Skill**: A self-contained capability definition following the Agent Skills specification, stored as SKILL.md with YAML frontmatter
- **Workflow Skill**: Orchestration skill that sequences activity skills via subagent execution
- **Activity Skill**: Task-specific skill that produces artifacts as part of a workflow
- **Subagent**: A child agent spawned via `runSubagent` that executes independently and returns results to parent
- **Pending Review**: GitHub PR review in draft state that can accumulate comments before submission
