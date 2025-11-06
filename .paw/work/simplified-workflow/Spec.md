# Feature Specification: Simplified Workflow

**Branch**: feature/simplified-workflow  |  **Created**: 2025-11-06  |  **Status**: Draft
**Input Brief**: Enable flexible workflow paths allowing users to skip unnecessary stages, work locally without multiple branches, and maintain quality while reducing iteration time for smaller tasks.

## User Scenarios & Testing
### User Story P1 – Skip Specification Stage for Well-Defined Issues
Narrative: As a developer working on a small bug fix with a complete issue description, I want to skip the formal specification stage and jump directly to code research and implementation so that I can resolve the issue faster without unnecessary documentation overhead.

Independent Test: Given a GitHub issue with clear acceptance criteria, when I initialize a PAW workflow selecting a mode that skips specification, then no Spec.md or SpecResearch.md artifacts are created, and the workflow proceeds directly to code research using the issue as the requirements source.

Acceptance Scenarios:
1. Given a user selects "minimal" workflow mode during initialization, When the workflow begins, Then no spec-related prompt files (01A-spec.prompt.md, 01B-spec-research.prompt.md) are generated
2. Given no Spec.md exists in the workflow artifacts, When agents require requirements context, Then they reference the Issue URL from WorkflowContext.md as the requirements source
3. Given a minimal workflow is active, When the Implementation Plan Agent runs, Then it successfully creates an ImplementationPlan.md using Issue URL and CodeResearch.md without errors about missing Spec.md

### User Story P1 – Work on Single Branch Without Planning/Phase/Docs PRs
Narrative: As a developer making a focused change, I want to commit all artifacts and code directly to my feature branch without creating separate planning, phase, or documentation branches so that I can reduce PR overhead and merge complexity for straightforward work.

Independent Test: Given a workflow mode configured for single-branch operation, when agents execute through all stages, then all artifacts and code changes are committed to the target branch only, and no planning branch, phase branches, or docs branch are created.

Acceptance Scenarios:
1. Given a user selects a workflow mode with single-branch strategy, When any agent needs to commit artifacts or code, Then it commits directly to the target branch specified in WorkflowContext.md
2. Given a single-branch workflow is active, When the Implementation Plan Agent completes, Then no planning branch (_plan suffix) is created and no Planning PR is opened
3. Given a single-branch workflow is active, When the Implementer Agent completes a phase, Then no phase branch (_phaseN suffix) is created and no Phase PR is opened
4. Given a single-branch workflow is active, When the Documentation Agent completes, Then no docs branch (_docs suffix) is created and no Docs PR is opened
5. Given all workflow stages complete in single-branch mode, When the PR Agent runs, Then it creates only one PR from the target branch to the base branch (e.g., feature/simplified-workflow → main)

### User Story P1 – Configure Workflow Mode During Initialization
Narrative: As a developer starting a new PAW workflow, I want to select my desired workflow mode (full, minimal, custom) during the initial setup so that the system generates appropriate prompt files and agents behave correctly for my chosen workflow path without requiring manual configuration.

Independent Test: Given a user runs the PAW initialization command, when they select a workflow mode from the presented options, then WorkflowContext.md is created with the selected mode, only relevant prompt files are generated, and agents adapt their behavior according to that mode.

Acceptance Scenarios:
1. Given a user runs "PAW: New PAW Workflow" command, When the extension prompts for inputs, Then a "Workflow Mode" selection is presented with options: full, minimal, custom
2. Given a user selects "full" mode, When initialization completes, Then WorkflowContext.md contains "Workflow Mode: full" and all 10 prompt files are generated
3. Given a user selects "minimal" mode, When initialization completes, Then WorkflowContext.md contains "Workflow Mode: minimal" and only 5 prompt files are generated (02A-code-research, 02B-impl-plan, 03A-implement, 05-pr, 0X-status)
4. Given a user selects "custom" mode, When prompted, Then the user can provide free-text custom workflow instructions that are stored in WorkflowContext.md
5. Given WorkflowContext.md contains a workflow mode, When any agent reads WorkflowContext.md, Then it correctly interprets the mode and adapts its behavior (e.g., skipping branch creation in single-branch mode)

### User Story P2 – Maintain Quality Gates Across All Workflow Modes
Narrative: As a project maintainer, I want all quality requirements (tests, linting, type checking, build success) to remain mandatory regardless of workflow mode so that code quality is never compromised even when using simplified workflows.

Independent Test: Given any workflow mode is active, when code changes are ready to merge, then all quality checks must pass before the final PR can be merged, identical to the full workflow requirements.

Acceptance Scenarios:
1. Given a minimal workflow mode is active, When the Implementer Agent prepares to commit code, Then it runs all tests and ensures they pass before proceeding
2. Given a single-branch workflow is active, When the PR Agent creates the final PR, Then all CI checks (linting, type checking, build, tests) are triggered and must pass
3. Given any workflow mode skips certain stages, When agents check code quality, Then no quality gates are bypassed or marked as optional

### User Story P2 – Custom Workflow Instructions for Unique Cases
Narrative: As a developer with a unique workflow need not covered by predefined modes, I want to provide custom free-text instructions during initialization so that agents can interpret my requirements and adapt the workflow accordingly without needing hardcoded support for every variation.

Independent Test: Given a user selects "custom" workflow mode and provides instructions like "skip docs and work on single branch", when agents execute, then they interpret the instructions correctly, generate appropriate prompt files, and follow the described workflow.

Acceptance Scenarios:
1. Given a user enters custom workflow instructions "Skip specification and documentation stages, work on single branch", When the initialization agent processes these instructions, Then it generates prompt files only for code research, planning, implementation, and final PR stages
2. Given custom instructions specify "Use single branch strategy", When any agent needs to commit work, Then it operates on the target branch without creating planning, phase, or docs branches
3. Given custom instructions are ambiguous (e.g., "make it fast"), When an agent encounters uncertainty, Then it asks the user clarifying questions before proceeding

### User Story P3 – Agent Handles Missing Artifacts Gracefully
Narrative: As an agent in a simplified workflow, I want to detect when expected artifacts from skipped stages are missing and use alternative sources (like Issue URL) so that I can continue execution without errors when operating in non-full workflow modes.

Independent Test: Given a workflow skips the specification stage, when the Implementation Plan Agent runs and expects Spec.md, then it detects the file is missing, references the Issue URL instead, and successfully creates the implementation plan without errors.

Acceptance Scenarios:
1. Given Spec.md does not exist in workflow artifacts, When an agent needs requirements context, Then it checks WorkflowContext.md for Issue URL and uses that as the requirements source
2. Given SpecResearch.md does not exist, When the Code Research Agent runs, Then it does not fail but notes that spec research was skipped and proceeds with research based on Issue URL
3. Given an agent encounters a missing artifact that cannot be substituted, When processing, Then it provides a clear error message indicating which artifact is missing and why it's required

### Edge Cases
- **Empty or invalid custom workflow instructions**: If user provides no meaningful instructions in custom mode, agent should prompt for clarification or default to minimal mode with user confirmation
- **Conflicting mode indicators**: If WorkflowContext.md somehow contains contradictory information (e.g., "Workflow Mode: minimal" but all 10 prompt files exist), agents should trust the Workflow Mode field and proceed accordingly, logging a warning
- **Mid-workflow mode change**: If user manually edits WorkflowContext.md to change the mode after initialization, agents should detect the change and warn that behavior may be inconsistent, recommending re-initialization
- **Missing WorkflowContext.md**: If WorkflowContext.md is absent when an agent runs, the agent should fail with a clear error directing the user to run "PAW: New PAW Workflow" command first (no longer attempting to create it defensively)
- **Invalid workflow mode value**: If WorkflowContext.md contains an unrecognized workflow mode (e.g., "Workflow Mode: turbo"), agents should fail with a clear error listing valid modes (full, minimal, custom)
- **Git repository issues in single-branch mode**: If target branch doesn't exist when initialization occurs, extension/agent should create it; if it exists but has diverged significantly from base, warn user before proceeding

## Requirements
### Functional Requirements
- FR-001: WorkflowContext.md must contain a "Workflow Mode" field with values limited to: full, minimal, custom (Stories: P1-Configure)
- FR-002: When workflow mode is "custom", WorkflowContext.md must contain a "Custom Workflow Instructions" field with user-provided free-text instructions (Stories: P2-Custom)
- FR-003: VS Code extension "PAW: New PAW Workflow" command must prompt user to select workflow mode during initialization (Stories: P1-Configure)
- FR-004: Initialization agent must call paw_create_prompt_templates tool with workflow mode parameter to generate only relevant prompt files for the selected mode (Stories: P1-Configure)
- FR-005: paw_create_prompt_templates tool must accept workflow_mode parameter and optional stages array to control which prompt files are generated (Stories: P1-Configure)
- FR-006: When workflow mode is "full", all 10 prompt files must be generated: 01A-spec, 01B-spec-research, 02A-code-research, 02B-impl-plan, 03A-implement, 03B-review, 03C-pr-review, 03D-review-pr-review, 04-docs, 05-pr, 0X-status (Stories: P1-Configure)
- FR-007: When workflow mode is "minimal", only 5 prompt files must be generated: 02A-code-research, 02B-impl-plan, 03A-implement, 05-pr, 0X-status (Stories: P1-Skip, P1-Configure)
- FR-008: When workflow mode is "custom", initialization agent must parse custom instructions to determine which stages are needed and generate corresponding prompt files (Stories: P2-Custom, P1-Configure)
- FR-009: All PAW agents must read Workflow Mode from WorkflowContext.md at start and adapt behavior according to mode-specific instructions (Stories: P1-Skip, P1-SingleBranch, P1-Configure, P2-Custom)
- FR-010: When workflow mode indicates single-branch strategy (minimal or specified in custom instructions), no agent shall create planning branch (_plan), phase branches (_phaseN), or docs branch (_docs) (Stories: P1-SingleBranch)
- FR-011: When workflow mode indicates single-branch strategy, all agents must commit artifacts and code changes directly to the target branch specified in WorkflowContext.md (Stories: P1-SingleBranch)
- FR-012: When workflow mode is "minimal", Implementation Plan Agent must create ImplementationPlan.md with a single phase only (Stories: P1-Skip)
- FR-013: When Spec.md or SpecResearch.md artifacts are missing (due to skipped specification stage), agents requiring requirements context must reference Issue URL from WorkflowContext.md as the requirements source (Stories: P1-Skip, P3-MissingArtifacts)
- FR-014: When an agent encounters a missing artifact that has no valid substitution, it must fail with a clear error message indicating which artifact is missing and why it's required (Stories: P3-MissingArtifacts)
- FR-015: All quality gates (tests pass, linting pass, type checking pass, build success) must remain mandatory and enforced regardless of workflow mode (Stories: P2-QualityGates)
- FR-016: When workflow mode is "custom" and instructions are ambiguous or insufficient, agents must prompt user for clarification before proceeding (Stories: P2-Custom)
- FR-017: When WorkflowContext.md is missing at agent runtime, agent must fail with error message directing user to run "PAW: New PAW Workflow" command (no defensive creation) (Stories: P1-Configure)
- FR-018: When WorkflowContext.md contains invalid or unrecognized workflow mode value, agents must fail with error message listing valid modes: full, minimal, custom (Stories: Edge Cases)
- FR-019: PR Agent must create final PR from target branch to base branch (e.g., main) in all workflow modes, including single-branch modes (Stories: P1-SingleBranch)
- FR-020: Generated prompt files must reference WorkflowContext.md using standard path format: `.paw/work/<feature-slug>/WorkflowContext.md` (Stories: P1-Configure)

### Key Entities
- **Workflow Mode**: Enumerated configuration value (full, minimal, custom) stored in WorkflowContext.md that determines which stages are executed and which prompt files are generated
- **Custom Workflow Instructions**: Free-text field in WorkflowContext.md (when mode=custom) containing user's description of desired workflow behavior
- **Prompt Template**: Generated .prompt.md file in `.paw/work/<feature-slug>/prompts/` directory that invokes a specific PAW agent with context
- **Stage**: Logical workflow phase (Spec, Code Research, Implementation Plan, Implementation, Documentation, Final PR, Status) that may be included or skipped based on workflow mode
- **Single-Branch Strategy**: Workflow behavior modifier where all work commits to target branch without creating separate planning, phase, or docs branches
- **Target Branch**: Git branch specified in WorkflowContext.md where all work occurs in single-branch strategy, or where planning/phase/docs branches merge to in multi-branch strategy

### Cross-Cutting / Non-Functional
- **Backward Compatibility**: Existing WorkflowContext.md files without "Workflow Mode" field should be treated as "full" mode by agents to preserve current behavior
- **Usability**: Workflow mode selection during initialization must use clear labels with brief descriptions to guide users toward appropriate mode choice
- **Extensibility**: Adding new predefined workflow modes in the future must not require changes to agent instructions beyond adding new mode-specific behavior sections
- **Error Recovery**: When agents detect workflow mode inconsistencies or invalid configurations, error messages must provide actionable guidance (e.g., "run X command" or "edit Y field to Z")

## Success Criteria
- SC-001: Given a user initializes workflow with "minimal" mode, when initialization completes, then WorkflowContext.md contains "Workflow Mode: minimal" and exactly 5 prompt files exist in prompts/ directory (FR-001, FR-007)
- SC-002: Given a user initializes workflow with "full" mode, when initialization completes, then exactly 10 prompt files exist in prompts/ directory matching the full workflow sequence (FR-006)
- SC-003: Given a user initializes workflow with "custom" mode and provides instructions "skip spec, single branch", when initialization completes, then no spec-related prompt files are generated and WorkflowContext.md contains the custom instructions (FR-002, FR-008)
- SC-004: Given workflow mode is "minimal", when Implementation Plan Agent executes, then it creates ImplementationPlan.md referencing Issue URL from WorkflowContext.md (not Spec.md) and completes without errors (FR-012, FR-013)
- SC-005: Given workflow mode indicates single-branch strategy, when any agent commits artifacts or code, then git log shows all commits on target branch only with no _plan, _phaseN, or _docs branches created (FR-010, FR-011)
- SC-006: Given workflow mode is "minimal", when PR Agent executes, then it creates exactly one PR from target branch to base branch, and no other PRs exist for this feature (FR-019)
- SC-007: Given WorkflowContext.md is missing, when any PAW agent starts, then it fails immediately with error message containing "run PAW: New PAW Workflow command" (FR-017)
- SC-008: Given WorkflowContext.md contains "Workflow Mode: invalid-mode", when any PAW agent starts, then it fails with error listing valid modes: full, minimal, custom (FR-018)
- SC-009: Given workflow mode is "full" or "minimal", when code changes are ready to merge, then CI pipeline shows all quality checks (tests, linting, type checking, build) executed and passed (FR-015)
- SC-010: Given workflow mode is "custom" with ambiguous instructions, when initialization agent processes them, then it prompts user with clarifying questions before generating prompt files (FR-016)
- SC-011: Given paw_create_prompt_templates tool is called with workflow_mode="minimal" and stages array, when tool executes, then only prompt files corresponding to specified stages are created in prompts/ directory (FR-004, FR-005)
- SC-012: Given an existing WorkflowContext.md lacks "Workflow Mode" field, when an agent reads it, then agent treats it as "full" mode and logs informational message about assumed mode (Cross-Cutting: Backward Compatibility)

## Assumptions
- **Three Initial Modes Sufficient**: The three predefined modes (full, minimal, custom) cover the majority of workflow variations users need; additional modes can be added later based on usage patterns
- **Custom Mode Interpretation**: Agents using LLM reasoning can effectively parse and interpret free-text custom workflow instructions without requiring structured configuration syntax
- **Single-Branch as Implicit Strategy**: When workflow mode is "minimal", single-branch strategy is implied and does not require separate configuration field; "full" mode implies multi-branch strategy
- **Extension Required**: All PAW workflows must begin via VS Code extension's "PAW: New PAW Workflow" command; manual WorkflowContext.md creation is no longer supported
- **Prompt File Naming Stable**: The existing prompt file naming convention (01A-, 02A-, etc.) remains stable and does not need to change for workflow mode support
- **Issue URL Always Available**: For workflows skipping specification stage, a valid Issue URL must be present in WorkflowContext.md to serve as requirements source; workflows without issue URL must use full mode
- **Git Operations Reliable**: Git commands executed by agents (branch creation, checkout, commit, push) succeed reliably in typical developer environments without manual intervention
- **Quality Gate Enforcement**: Existing CI/CD pipeline configuration enforces quality checks (tests, linting, build) for all PRs regardless of PAW workflow mode
- **Mode Immutability**: Workflow mode is set once during initialization and not changed mid-workflow; mode changes require re-initialization with new feature slug

## Scope
In Scope:
- Adding Workflow Mode field to WorkflowContext.md specification
- Extending VS Code extension to prompt for workflow mode during initialization
- Implementing workflow_mode and stages parameters in paw_create_prompt_templates tool
- Updating all 9 PAW agent instructions to include workflow mode handling sections
- Generating mode-appropriate prompt files based on selected workflow
- Implementing single-branch strategy behavior in relevant agents (no planning/phase/docs branches)
- Documenting predefined workflow modes (full, minimal, custom) with clear usage guidance
- Implementing graceful artifact handling when specification stage skipped
- Validation and error handling for invalid or missing workflow mode values

Out of Scope:
- Creating additional predefined modes beyond full, minimal, and custom in initial implementation
- Changing quality gate requirements based on workflow mode (all remain mandatory)
- Supporting mid-workflow mode changes or mode transitions
- Migrating existing in-progress workflows to new workflow mode system
- Modifying prompt file content templates beyond adding workflow mode references
- Implementing workflow mode selection in non-VS Code environments (e.g., CLI-only usage)
- Automatic detection or recommendation of optimal workflow mode based on issue analysis
- Branch naming convention changes (planning, phase, docs branch suffixes remain unchanged in full mode)

## Dependencies
- VS Code Extension: Must be installed and active to initialize workflows with mode selection
- paw_create_prompt_templates Tool: Must be enhanced to accept workflow_mode and stages parameters
- WorkflowContext.md Format: All agents depend on consistent WorkflowContext.md structure including Workflow Mode field
- Git Repository: Valid git repository required for branch operations and version control
- GitHub API or Azure DevOps API: Required when Issue URL provided to fetch issue details for requirements context

## Risks & Mitigations
- **Custom Mode Ambiguity**: Free-text custom instructions may be ambiguous or contradictory, leading to agent confusion or incorrect behavior. Mitigation: Agents prompt for clarification when instructions unclear; provide examples of good custom instructions in documentation.
- **Incomplete Agent Updates**: Missing or inconsistent workflow mode handling in one or more agents causes runtime errors or unexpected behavior. Mitigation: Comprehensive testing of all workflow mode combinations across all agents; quality checklist for agent instruction updates.
- **User Confusion on Mode Selection**: Users unsure which workflow mode to choose, leading to suboptimal workflow selection or repeated re-initialization. Mitigation: Provide clear descriptions and use-case examples for each mode during VS Code extension prompt; include decision flowchart in documentation.
- **Backward Compatibility Breakage**: Existing WorkflowContext.md files without Workflow Mode field cause errors when agents expect the field. Mitigation: Agents treat missing Workflow Mode as "full" mode default; log informational message about assumed mode.
- **Single-Branch Merge Conflicts**: Working entirely on target branch increases risk of merge conflicts if multiple developers work on same feature. Mitigation: Document single-branch strategy as intended for single-developer focused work; recommend full mode for collaborative features.
- **Quality Gate Bypass Temptation**: Users may expect simplified workflows to skip quality checks, leading to frustration when checks remain mandatory. Mitigation: Clearly communicate in documentation that workflow modes affect stages/branches, not quality requirements; prominently display this in mode descriptions.
- **Tool Parameter Validation**: Invalid stages array passed to paw_create_prompt_templates tool generates incorrect or incomplete prompt files. Mitigation: Tool validates stages enum values and fails fast with clear error; agent instructions document valid stage values.

## References
- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/13
- Research: .paw/work/simplified-workflow/SpecResearch.md
- Design Document: .paw/work/simplified-workflow/context/workflow-mode-configuration-design.md
- VS Code Extension Source: vscode-extension/src/commands/initializeWorkItem.ts
- Prompt Templates Tool: vscode-extension/src/tools/createPromptTemplates.ts

