# Feature Specification: Implementation Skills Migration

**Branch**: feature/164-implementation-skills-migration  |  **Created**: 2026-01-25  |  **Status**: Draft
**Input Brief**: Migrate 9 implementation agents to a single-agent skills-based architecture following the review workflow pattern

## Overview

Today, developers using PAW's implementation workflow interact with nine separate agent files—each handling a specific stage from specification writing through final pull request creation. While functional, this multi-agent architecture creates cognitive overhead for users who must understand which agent handles what, results in significant prompt token overhead from duplicated scaffolding across agents, and complicates maintenance when workflow changes require updates to multiple files. The review workflow migration (PR #156) demonstrated a compelling alternative: consolidate to a single orchestrator agent that delegates detailed behaviors to specialized skills.

After this migration, users will invoke a single PAW agent that intelligently handles their implementation requests. When a user describes a feature, points to an issue, or asks for specific help (like "update the spec to align with the plan"), the agent reasons about what the user wants to accomplish, consults the workflow skill for available capabilities, and delegates to the appropriate activity skill with meaningful context. The workflow skill serves as a guide—providing an activity catalog, default flow guidance for typical progressions, and validation gates—rather than a rigid state machine that constrains behavior. Activity skills describe capabilities (what they can do) rather than fixed modes, enabling flexible execution based on delegation instructions. Users experience familiar workflow stages and artifact outputs, but through an intent-driven interface that handles both linear progressions and non-linear requests naturally.

The migration preserves full compatibility with existing PAW features: all three workflow modes (full, minimal, custom) continue to function, and all artifacts (Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md) are produced in the same locations with the same formats. The new architecture introduces refined policy configurations: Review Policy (always, milestones, never) controls when workflow pauses for human review of artifacts, while Session Policy (per-stage, continuous) controls whether stages get fresh conversations or share context. Existing Handoff Mode settings are automatically mapped to Review Policy for backward compatibility. The primary change is architectural—moving detailed stage logic from agent files into skill files loaded on demand, with the PAW agent owning all orchestration decisions and activity skills providing flexible capabilities.

## Objectives

- Enable users to complete implementation work through a single PAW agent that reasons about their intent and delegates intelligently, eliminating the need to know which of nine agents handles each capability
- Handle both linear workflow progressions and non-linear requests (like "update spec to align with plan") through intent-driven orchestration rather than rigid state-machine routing
- Preserve all existing workflow behaviors including mode selection and artifact production so current users experience no functional regression
- Introduce refined policy configurations (Review Policy, Session Policy) that give users clearer control over workflow pausing and conversation context management
- Reduce total prompt token consumption compared to the current multi-agent setup by loading capability-based activity skills on demand
- Improve maintainability by separating orchestration logic (intent reasoning, skill selection, delegation) from activity logic (domain-specific capabilities loaded as skills)
- Follow the established pattern from the review workflow migration to maintain architectural consistency across both PAW workflows

## User Scenarios & Testing

### User Story P0 – Unified Entry Point and Initialization

Narrative: A developer wants to start new implementation work. They run the VS Code "PAW: New PAW Workflow" command, select configuration options via quick picks, and the system invokes the `/paw` prompt which routes to the PAW agent. The PAW agent handles initialization (creating WorkflowContext.md, branch setup) and then proceeds to the first workflow stage—all in a single conversation.

Independent Test: User runs "PAW: New PAW Workflow", selects full mode with PRs strategy, and sees the PAW agent create the workflow directory, WorkflowContext.md, and git branch, then prompt for next steps.

Acceptance Scenarios:
1. Given a user running "PAW: New PAW Workflow", When they complete quick pick selections, Then the VS Code command invokes the `/paw` prompt with configuration parameters
2. Given the PAW agent receiving initialization parameters (no existing WorkflowContext.md), When it checks for WorkflowContext.md, Then it delegates directly to the `paw-init` bootstrap skill (without loading the workflow skill first) to create the workflow structure
3. Given the `paw-init` skill completing initialization, When it returns success with feature slug, Then the PAW agent loads the workflow skill and proceeds to the first workflow stage based on Workflow Mode (spec for full, code-research for minimal)
4. Given a user with an existing WorkflowContext.md who invokes `/paw`, When the PAW agent loads, Then it loads the workflow skill and proceeds based on current workflow state

### User Story P1 – Single Entry Point for Implementation

Narrative: A developer wants to build a new feature. They invoke the PAW agent with a feature description or issue link and progress through specification, planning, implementation, and PR creation without needing to switch between different agents.

Independent Test: User invokes PAW agent with Review Policy set to "milestones", completes the specification stage, and sees the workflow proceed to the research stage automatically.

Acceptance Scenarios:
1. Given a user with a new feature brief, When they invoke the PAW agent, Then the agent loads the workflow skill and begins the specification stage
2. Given a user completing a specification, When the workflow transitions to research, Then the appropriate research skill is loaded without user intervention
3. Given a user with Review Policy set to "always", When a stage completes, Then the agent presents next-step options and waits for user command

### User Story P2 – Workflow Mode Preservation

Narrative: A developer working on a quick fix wants to skip the detailed specification stage using minimal mode. They select minimal workflow mode and proceed directly to planning and implementation.

Independent Test: User selects minimal mode and successfully bypasses spec stage to reach planning.

Acceptance Scenarios:
1. Given a user with Workflow Mode set to "minimal" in WorkflowContext.md, When they invoke the PAW agent, Then the workflow skill routes them directly to code research/planning
2. Given a user with Workflow Mode set to "full", When they invoke the PAW agent, Then the workflow skill includes all stages including detailed specification

### User Story P3 – Review and Session Policy Control

Narrative: A developer wants fine-grained control over workflow progression and conversation context. They configure Review Policy to pause at milestones and Session Policy to maintain continuous conversation for tighter collaboration.

Independent Test: User with Review Policy "milestones" completes a non-milestone transition and sees automatic progression, then completes a milestone transition and receives prompt with explicit options.

Acceptance Scenarios:
1. Given a user with Review Policy set to "always", When any artifact is produced, Then the agent pauses and presents explicit command options for review and iteration
2. Given a user with Review Policy set to "never", When an artifact is produced, Then the agent automatically proceeds to the next appropriate activity
3. Given a user with Review Policy set to "milestones", When a milestone artifact is produced (e.g., Spec.md, ImplementationPlan.md), Then the agent pauses for review; when a non-milestone artifact is produced (e.g., SpecResearch.md), Then the agent proceeds automatically
4. Given a user with Session Policy set to "continuous", When delegating to an activity skill, Then the conversation context is preserved across delegated activities
5. Given a user with Session Policy set to "per-stage", When crossing a stage boundary, Then the PAW orchestrator starts a fresh PAW agent session via `paw_call_agent` and includes enough state/hints for the new session to resume at the correct next activity
6. Given a new PAW agent session started via `paw_call_agent`, When it initializes, Then it loads the workflow skill and delegates the next activity via `runSubagent` (not inline) based on workflow state
6. Given an existing WorkflowContext.md with legacy Handoff Mode field, When the agent reads configuration, Then it correctly maps to Review Policy (manual→always, semi-auto→milestones, auto→never)

### User Story P4 – Artifact Compatibility

Narrative: A developer using PAW for an existing project wants to ensure their artifacts remain in familiar locations. They complete a full workflow and find all artifacts where expected.

Independent Test: User completes implementation and verifies Spec.md, ImplementationPlan.md, and Docs.md appear in `.paw/work/<feature-slug>/`.

Acceptance Scenarios:
1. Given a user completing the specification stage, When Spec.md is created, Then it exists at `.paw/work/<feature-slug>/Spec.md`
2. Given a user completing planning, When ImplementationPlan.md is created, Then it exists at `.paw/work/<feature-slug>/ImplementationPlan.md`
3. Given artifact formats, When the migration is complete, Then artifact content structure matches pre-migration format

### User Story P5 – Status and Help

Narrative: A developer mid-workflow is uncertain about their progress or next steps. They invoke the status capability and receive clear guidance on current state and available actions.

Independent Test: User invokes status and receives accurate workflow position and recommended next command.

Acceptance Scenarios:
1. Given a user mid-workflow, When they request status, Then the status skill reports current stage, completed artifacts, and next steps
2. Given a user who is confused about PAW, When they request help, Then the status skill explains the workflow stages and how to proceed

### User Story P6 – Non-Linear Request Handling

Narrative: A developer mid-workflow realizes the specification needs updating based on learnings from implementation planning. They ask the PAW agent to "update the spec to align with the plan" and the agent intelligently routes to the specification skill with appropriate context.

Independent Test: User mid-planning requests spec revision; agent delegates to specification skill with alignment context without requiring explicit stage navigation.

Acceptance Scenarios:
1. Given a user who has completed planning, When they request "update spec to align with plan changes", Then the agent reasons about intent and delegates to the specification skill with alignment context
2. Given a user mid-implementation, When they request "do more research on X", Then the agent delegates to the appropriate research skill with the research question
3. Given any non-linear request, When the agent processes it, Then it constructs a meaningful delegation prompt that includes the user's specific context

### User Story P7 – Specification Quality Review

Narrative: A developer completes a specification and wants it reviewed for quality, completeness, and clarity before proceeding to planning. The PAW agent delegates to a spec review activity running in a separate subagent to manage context, which validates the spec against quality criteria and provides structured feedback.

Independent Test: User completes Spec.md and triggers spec review; review runs in subagent and returns structured feedback with pass/fail status.

Acceptance Scenarios:
1. Given a user with a completed Spec.md, When spec review is triggered (automatically after spec completion or manually), Then the PAW agent delegates to the spec-review skill in a subagent
2. Given the spec-review skill executing, When it analyzes Spec.md, Then it validates against quality criteria (completeness, clarity, testability, no ambiguities)
3. Given the spec-review skill completing, When issues are found, Then it returns structured feedback identifying specific sections needing revision
4. Given the spec-review skill completing, When spec passes review, Then the workflow proceeds to the planning stage

### User Story P8 – Implementation Plan Quality Review

Narrative: A developer completes an implementation plan and wants it reviewed for feasibility, completeness, and alignment with the spec before proceeding to implementation. The PAW agent delegates to a plan review activity running in a separate subagent to manage context, which validates the plan and provides structured feedback.

Independent Test: User completes ImplementationPlan.md and triggers plan review; review runs in subagent and returns structured feedback with pass/fail status.

Acceptance Scenarios:
1. Given a user with a completed ImplementationPlan.md, When plan review is triggered (automatically after planning completion or manually), Then the PAW agent delegates to the plan-review skill in a subagent
2. Given the plan-review skill executing, When it analyzes ImplementationPlan.md, Then it validates against quality criteria (spec alignment, feasibility, phase completeness, clear success criteria)
3. Given the plan-review skill completing, When issues are found, Then it returns structured feedback identifying specific phases or sections needing revision
4. Given the plan-review skill completing, When plan passes review, Then the workflow proceeds to the implementation stage

### Edge Cases

- User invokes PAW agent with no WorkflowContext.md initialized and no initialization parameters: Agent prompts user to run "PAW: New PAW Workflow" command or provide initialization parameters
- User invokes `/paw` with initialization parameters when WorkflowContext.md already exists: Agent skips initialization, proceeds with existing workflow
- User attempts to skip to implementation without completing prerequisite stages: Workflow skill identifies missing artifacts and blocks progression with clear error
- Multi-phase implementation plan with user wanting to stop mid-way: Agent saves progress and allows resume from current phase
- Custom workflow mode with non-standard stage order: Workflow skill respects Custom Workflow Instructions field

## Requirements

### Functional Requirements

- FR-001: The PAW agent loads the workflow skill on invocation to understand available capabilities, default flow guidance, and orchestration patterns (Stories: P0, P1, P4)
- FR-002: The workflow skill retrieves activity capabilities dynamically via the `paw_get_skills` tool rather than embedding a static catalog; this enables the PAW agent to discover all available skills (including non-implementation skills like review skills) for potential non-linear paths. The workflow skill provides default flow guidance for typical progressions and validation gates—serving as a guide rather than a rigid state machine. **Prerequisite**: The workflow skill assumes WorkflowContext.md already exists (created by `paw-init` bootstrap skill) (Stories: P1, P6)
- FR-003: Activity skills are loaded on-demand when delegated to, describing capabilities (what they can do) rather than fixed modes, enabling flexible execution based on delegation instructions (Stories: P1, P6)
- FR-004: The PAW agent reasons about user intent and constructs activity-specific delegation prompts that contextualize what the activity should accomplish. For linear progressions, the delegation prompt describes the activity goal (e.g., "complete spec research for the questions in the research prompt"); for non-linear requests, the delegation prompt includes the user's specific request (e.g., "update the spec to align with implementation plan changes") as part of the activity context. Not every delegation includes the original user request verbatim—only when relevant to the delegated activity (Stories: P1, P6)
- FR-005: Workflow mode detection routes users through appropriate stages: full mode includes all stages, minimal mode skips spec (Stories: P2)
- FR-006: Review Policy controls when workflow pauses for human review—boundaries are defined at the artifact level, not stage level: "always" pauses after every artifact is produced for potential iteration, "milestones" pauses at significant artifacts that represent stage completions (e.g., Spec.md, ImplementationPlan.md), "never" proceeds continuously without pausing for review (Stories: P3)
- FR-007: Session Policy controls conversation context: "per-stage" uses fresh conversations at transitions, "continuous" preserves conversation context throughout (Stories: P3)
- FR-007: Session Policy controls orchestrator conversation context: "per-stage" starts a fresh PAW agent session at stage boundaries via `paw_call_agent` (with resume state), "continuous" preserves orchestrator context throughout (Stories: P3)
- FR-008: Legacy Handoff Mode values are automatically mapped to Review Policy for backward compatibility (Stories: P3)
- FR-009: Each activity skill produces its designated artifact in the standard location under `.paw/work/<feature-slug>/` (Stories: P4)
- FR-010: Artifact formats remain compatible with existing specifications (Stories: P4)
- FR-011: The status skill can diagnose workflow state from artifacts and provide accurate next-step guidance (Stories: P5)
- FR-012: The workflow skill validates prerequisites before allowing stage entry (e.g., Spec.md must exist before implementation) (Stories: P1)
- FR-013: Phase-based implementation spawns separate subagent calls for each phase as specified in ImplementationPlan.md (Stories: P1)
- FR-013: Phase-based implementation spawns separate delegated worker executions (subagents) for each phase as specified in ImplementationPlan.md, regardless of Session Policy (Stories: P1)
- FR-014: Shared utility skills provide common mechanics that activity skills load conditionally: paw-review-response for PR comment handling, paw-git-operations for branch naming conventions and strategy-based branching logic (Stories: P1)
- FR-015: Activity skills report completion status back to the PAW agent and do not make orchestration decisions (e.g., pausing, next-step selection); the PAW agent applies policies and determines what happens next (Stories: P1, P3, P6)
- FR-015: Activity skills execute in delegated worker sessions (subagents), report completion status back to the PAW agent, and do not make orchestration decisions (e.g., pausing, next-step selection). The PAW agent applies policies and determines what happens next, including whether to start a fresh orchestrator session via `paw_call_agent` (Stories: P1, P3, P6)
- FR-023: When the PAW agent starts a fresh orchestrator session via `paw_call_agent`, it includes a resume hint sufficient for the new session to pick up at the intended workflow point (e.g., next activity name and relevant artifact paths), and the new session validates/derives actual workflow state from artifacts before delegating work (Stories: P3)
- FR-016: The `/paw` prompt file serves as the entry point for the PAW implementation workflow; it passes configuration parameters to the PAW agent and accepts optional arguments (Stories: P0)
- FR-017: The `paw-init` skill is a **bootstrap skill** that handles workflow initialization: creating `.paw/work/<feature-slug>/` directory, generating WorkflowContext.md, creating/checking out git branch, and committing initial artifacts if tracking is enabled. Unlike activity skills, `paw-init` is invoked directly by the PAW agent before the workflow skill is loaded—it is not part of the workflow stages (Stories: P0)
- FR-018: When the PAW agent receives initialization parameters and no WorkflowContext.md exists, it delegates directly to the `paw-init` bootstrap skill (without loading workflow skill first); upon successful initialization, it loads the workflow skill and proceeds to the first workflow stage based on Workflow Mode (Stories: P0)
- FR-019: The VS Code "PAW: New PAW Workflow" command invokes the `/paw` prompt with configuration parameters instead of the current template-based prompt to a bare agent (Stories: P0)
- FR-020: The `paw-spec-review` skill runs in a subagent to review Spec.md for quality, completeness, and clarity; it validates against quality criteria and returns structured feedback that the PAW agent uses to determine whether to proceed to planning or iterate on the specification (Stories: P7)
- FR-021: The `paw-plan-review` skill runs in a subagent to review ImplementationPlan.md for feasibility, spec alignment, and phase completeness; it validates against quality criteria and returns structured feedback that the PAW agent uses to determine whether to proceed to implementation or iterate on the plan (Stories: P8)
- FR-022: Planning artifact review activities (spec-review, plan-review) execute in separate subagent sessions to manage context, following the same pattern as impl-review for implementation phases (Stories: P7, P8)

### Key Entities

- **PAW Agent**: Single orchestrator agent that replaces the nine implementation agents; reasons about user intent, loads appropriate skills, and constructs meaningful delegation prompts
- **Workflow Skill**: Provides activity catalog with capabilities, default flow guidance (not rigid state machine), validation gates, transition table (default guidance for typical flow), and policy behavior documentation
- **Bootstrap Skill**: The `paw-init` skill that runs before the workflow skill is loaded; creates WorkflowContext.md and sets up the workflow directory and git branch
- **Activity Skills**: Capability-based skills that execute flexibly based on delegation instructions: specification, spec-research, spec-review, code-research, planning, plan-review, implementation (includes final documentation phase), impl-review, final-pr, status (note: `paw-init` is a bootstrap skill, not an activity skill)
- **Utility Skills**: Shared mechanics loaded conditionally by activity skills (paw-review-response for PR comment handling, paw-git-operations for branch naming, strategy-based branching, and selective staging)
- **Artifact State**: Collection of files in `.paw/work/<feature-slug>/` that encode workflow progress
- **Review Policy**: Configuration controlling when workflow pauses for human review at artifact boundaries (always, milestones, never)
- **Session Policy**: Configuration controlling conversation context management (per-stage, continuous)
- **Initialization Parameters**: Configuration values captured by VS Code quick picks and passed to PAW agent via `/paw` prompt (target branch, workflow mode, review strategy, etc.)

### Cross-Cutting / Non-Functional

- Token Efficiency: Combined agent + active skill tokens should be measurably lower than the equivalent multi-agent prompt
- Maintainability: Shared logic (context loading, handoff behavior) consolidated rather than duplicated across skills

## Success Criteria

- SC-001: User can complete full workflow (spec → PR) using only the PAW agent, which reasons about intent and delegates to appropriate skills (FR-001, FR-002, FR-004, FR-013)
- SC-002: All three workflow modes (full, minimal, custom) produce correct stage sequences when tested (FR-005)
- SC-003: All three Review Policy values (always, milestones, never) exhibit correct pausing behavior at artifact boundaries (FR-006)
- SC-004: Both Session Policy values (per-stage, continuous) correctly control conversation context management (FR-007)
- SC-005: Legacy Handoff Mode values are correctly mapped to Review Policy when present in existing WorkflowContext.md files (FR-008)
- SC-006: Artifacts produced by the new system are location-compatible and format-compatible with existing tools and documentation (FR-009, FR-010)
- SC-007: Status capability correctly identifies current stage and next steps for any valid workflow state (FR-011)
- SC-008: The new PAW agent file is smaller than any single current implementation agent (under 5KB) (FR-003)
- SC-009: Workflow skill blocks progression when required predecessor artifacts are missing (FR-012)
- SC-010: Non-linear requests (e.g., "update spec to align with plan") are handled by reasoning about intent and delegating to appropriate skill with context (FR-004)
- SC-011: Delegated activities reliably return completion signals that allow the PAW agent to apply Review/Session Policy and select an appropriate next action without requiring the activity skill to perform orchestration (FR-015)
- SC-012: The `/paw` prompt file exists and is invoked by the VS Code "PAW: New PAW Workflow" command (FR-016, FR-019)
- SC-013: New workflow initialization via `/paw` creates WorkflowContext.md, git branch, and proceeds to first stage without requiring user to say "continue" (FR-017, FR-018)
- SC-014: Spec review runs in a subagent after spec completion and returns structured feedback for iteration or proceed decisions (FR-020, FR-022)
- SC-015: Plan review runs in a subagent after planning completion and returns structured feedback for iteration or proceed decisions (FR-021, FR-022)

## Assumptions

- The review workflow migration pattern (single agent + workflow skill + activity skills) is the established standard for PAW and should be followed for consistency
- The workflow skill serves as a guide (activity catalog, default flow, validation gates) rather than a rigid state machine, enabling the PAW agent to reason about intent and handle non-linear requests
- Activity skills describe capabilities flexibly, executing intelligently based on delegation instructions rather than requiring specific modes
- Activity skills can be loaded via `paw_get_skill` tool calls at runtime, consistent with how review skills are currently loaded
- Shared mechanics can be extracted to utility skills that activity skills load conditionally, reducing duplication: paw-review-response for PR comment handling, paw-git-operations for branch naming and git operations
- Users familiar with the current multi-agent workflow will quickly adapt to the intent-driven interface since stage names and concepts remain identical
- Mapping legacy Handoff Mode to Review Policy provides seamless backward compatibility for existing WorkflowContext.md files
- Token reduction is expected to be achieved primarily through on-demand skill loading and consolidating shared mechanics

## Scope

In Scope:
- Create single PAW agent file that replaces PAW-01A through PAW-05 and PAW-X Status, with intent-driven orchestration
- Create `paw-workflow` skill with activity catalog, default flow guidance, validation gates, transition table, and policy behavior documentation
- Create activity skills: `paw-init`, `paw-spec`, `paw-spec-research`, `paw-spec-review`, `paw-code-research`, `paw-planning`, `paw-plan-review`, `paw-implement`, `paw-impl-review`, `paw-pr`, `paw-status`
- Create utility skills: `paw-review-response` for shared PR comment response mechanics, `paw-git-operations` for branch naming and git operations
- Create `/paw` entry point prompt file (`prompts/paw.prompt.md`) that invokes PAW agent with configuration parameters
- Update VS Code "PAW: New PAW Workflow" command to invoke `/paw` prompt instead of template-based prompt to bare agent
- Update extension tooling to support new Review Policy and Session Policy fields in WorkflowContext.md
- Update context tool to parse new policy fields with backward compatibility mapping for legacy Handoff Mode
- Update extension installer to deploy new agent, skills, and prompt files
- Remove deprecated individual agent files and old initialization template after migration

Out of Scope:
- Changing artifact locations or formats
- Modifying the review workflow (already migrated per PR #156)
- Multi-runtime portability (Claude Code, Codex, etc.)
- Changes to `paw-context.component.md`—this component may be referenced by skills but not modified

In Scope (Component Updates):
- `handoff-instructions.component.md` requires minimal updates to route commands to the PAW agent instead of individual agents

## Dependencies

- `paw_get_skill` tool must be available for runtime skill loading
- `paw_call_agent` tool must support the new "PAW" agent name for handoffs
- `paw_get_context` tool must be updated to parse Review Policy and Session Policy fields
- Extension installer (`src/agents/installer.ts`) must be updated to deploy skills directory structure
- WorkflowContext.md initialization must include new policy fields

## Risks & Mitigations

- **Risk**: Users accustomed to specific agent names may be confused by consolidation. **Impact**: Medium—user friction during transition. **Mitigation**: Clear documentation, status skill explains the change, familiar stage terminology preserved.
- **Risk**: Skill loading adds latency compared to inline agent content. **Impact**: Low—skill files are small text files. **Mitigation**: Measure and optimize if needed; consider caching patterns.
- **Risk**: Complex stage logic is harder to debug when split across workflow skill and activity skills. **Impact**: Medium—maintenance complexity. **Mitigation**: Clear logging in workflow skill, status skill provides diagnostic capability.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/164
- Research: .paw/work/implementation-skills-migration/SpecResearch.md
- Related: PR #156 (review workflow migration pattern)
- Planning docs: `planning/paw_v2/` on branch `planning/paw_v2`

## Glossary

- **Orchestrator Agent**: An agent that reasons about user intent and delegates work to skills, owning all orchestration decisions
- **Workflow Skill**: A skill that provides activity catalog, default flow guidance, validation gates, and policy behavior documentation—serving as a guide rather than a rigid state machine
- **Activity Skill**: A capability-based skill that executes flexibly based on delegation instructions (e.g., specification skill can create, revise, or align specs)
- **Utility Skill**: A shared skill providing common mechanics that activity skills load conditionally (e.g., PR comment response handling)
- **Review Policy**: Configuration controlling when workflow pauses for human review at artifact boundaries (always, milestones, never)—replaces legacy Handoff Mode
- **Session Policy**: Configuration controlling whether stages get fresh conversations or share context (per-stage, continuous)
- **Milestone Artifact**: A significant artifact where "milestones" Review Policy pauses for human review. Complete list: Spec.md, ImplementationPlan.md, Phase PR completion, Final PR creation. Non-milestones (auto-proceed): WorkflowContext.md, SpecResearch.md, CodeResearch.md, Docs.md (part of implementation phase), intermediate commits
- **Intent-Driven Orchestration**: The PAW agent reasons about what the user wants to accomplish and delegates to appropriate skills with meaningful context
