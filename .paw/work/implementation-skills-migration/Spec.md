# Feature Specification: Implementation Skills Migration

**Branch**: feature/164-implementation-skills-migration  |  **Created**: 2026-01-25  |  **Status**: Draft
**Input Brief**: Migrate 9 implementation agents to a single-agent skills-based architecture following the review workflow pattern

## Overview

Today, developers using PAW's implementation workflow interact with nine separate agent files—each handling a specific stage from specification writing through final pull request creation. While functional, this multi-agent architecture creates cognitive overhead for users who must understand which agent handles what, results in significant prompt token overhead from duplicated scaffolding across agents, and complicates maintenance when workflow changes require updates to multiple files. The review workflow migration (PR #156) demonstrated a compelling alternative: consolidate to a single orchestrator agent that delegates detailed behaviors to specialized skills.

After this migration, users will invoke a single PAW agent that intelligently sequences their entire implementation workflow. When a user describes a feature or points to an issue, the agent loads the workflow skill to determine the appropriate stage, then delegates to activity skills for specific capabilities—specification drafting, research, planning, implementation, review, documentation, and PR creation. The workflow skill encodes the dependency graph between stages, validation gates, and handoff mode behavior (manual pauses, semi-automatic routine transitions, or fully automatic progression). Users experience the same familiar workflow stages and artifact outputs, but through a unified interface that reduces confusion and improves discoverability.

The migration preserves full compatibility with existing PAW features: all three workflow modes (full, minimal, custom) continue to function, all three handoff modes (manual, semi-auto, auto) control progression as before, and all artifacts (Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md) are produced in the same locations with the same formats. The primary change is architectural—moving detailed stage logic from agent files into skill files that are loaded on demand, reducing the base prompt size while improving maintainability through a cleaner separation of orchestration from activity.

## Objectives

- Enable users to complete the full implementation workflow through a single PAW agent entry point, eliminating the need to know which of nine agents handles each stage
- Preserve all existing workflow behaviors including mode selection, handoff pausing, and artifact production so current users experience no functional regression
- Reduce total prompt token consumption compared to the current multi-agent setup by consolidating shared scaffolding into the workflow skill and loading activity skills on demand
- Improve maintainability by separating orchestration logic (stage sequencing, handoff decisions, validation gates) from activity logic (specification templates, research methodology, implementation philosophy)
- Follow the established pattern from the review workflow migration to maintain architectural consistency across both PAW workflows

## User Scenarios & Testing

### User Story P1 – Single Entry Point for Implementation

Narrative: A developer wants to build a new feature. They invoke the PAW agent with a feature description or issue link and progress through specification, planning, implementation, and PR creation without needing to switch between different agents.

Independent Test: User invokes PAW agent, completes spec stage, and sees workflow progress to research stage automatically (semi-auto mode).

Acceptance Scenarios:
1. Given a user with a new feature brief, When they invoke the PAW agent, Then the agent loads the workflow skill and begins the specification stage
2. Given a user completing a specification, When the workflow transitions to research, Then the appropriate research skill is loaded without user intervention
3. Given a user in manual handoff mode, When a stage completes, Then the agent presents next-step options and waits for user command

### User Story P2 – Workflow Mode Preservation

Narrative: A developer working on a quick fix wants to skip the detailed specification stage using minimal mode. They select minimal workflow mode and proceed directly to planning and implementation.

Independent Test: User selects minimal mode and successfully bypasses spec stage to reach planning.

Acceptance Scenarios:
1. Given a user with Workflow Mode set to "minimal" in WorkflowContext.md, When they invoke the PAW agent, Then the workflow skill routes them directly to code research/planning
2. Given a user with Workflow Mode set to "full", When they invoke the PAW agent, Then the workflow skill includes all stages including detailed specification

### User Story P3 – Handoff Mode Control

Narrative: A developer wants fine-grained control over workflow progression. They use manual handoff mode to pause after each stage, review artifacts, and decide when to continue.

Independent Test: User in manual mode completes implementation phase and receives prompt with explicit options rather than automatic progression.

Acceptance Scenarios:
1. Given a user with Handoff Mode set to "manual", When any stage completes, Then the agent pauses and presents explicit command options
2. Given a user with Handoff Mode set to "auto", When a stage completes, Then the agent automatically proceeds to the next appropriate stage
3. Given a user with Handoff Mode set to "semi-auto" at a routine transition (e.g., spec → research), When the stage completes, Then the agent automatically proceeds

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

### Edge Cases

- User invokes PAW agent with no WorkflowContext.md initialized: Agent prompts user to initialize work item first
- User attempts to skip to implementation without completing prerequisite stages: Workflow skill identifies missing artifacts and blocks progression with clear error
- Multi-phase implementation plan with user wanting to stop mid-way: Agent saves progress and allows resume from current phase
- Custom workflow mode with non-standard stage order: Workflow skill respects Custom Workflow Instructions field

## Requirements

### Functional Requirements

- FR-001: The PAW agent loads the workflow skill on invocation and determines current workflow stage from artifact state (Stories: P1, P4)
- FR-002: The workflow skill sequences stages according to the dependency graph: Spec → SpecResearch → CodeResearch → Planning → Implementation phases → Review phases → Docs → Final PR (Stories: P1)
- FR-003: Activity skills are loaded on-demand when the corresponding stage begins, not preloaded in the agent prompt (Stories: P1)
- FR-004: Workflow mode detection routes users through appropriate stages: full mode includes all stages, minimal mode skips spec (Stories: P2)
- FR-005: Handoff mode controls stage transition behavior: manual pauses at all boundaries, semi-auto pauses at decision points, auto proceeds continuously (Stories: P3)
- FR-006: Each activity skill produces its designated artifact in the standard location under `.paw/work/<feature-slug>/` (Stories: P4)
- FR-007: Artifact formats remain compatible with existing specifications (Stories: P4)
- FR-008: The status skill can diagnose workflow state from artifacts and provide accurate next-step guidance (Stories: P5)
- FR-009: The workflow skill validates prerequisites before allowing stage entry (e.g., Spec.md must exist before implementation) (Stories: P1)
- FR-010: Phase-based implementation spawns separate subagent calls for each phase as specified in ImplementationPlan.md (Stories: P1)

### Key Entities

- **PAW Agent**: Single orchestrator agent that replaces the nine implementation agents; loads workflow skill and coordinates activity delegation
- **Workflow Skill**: Contains stage sequencing logic, handoff mode behavior, validation gates, and subagent delegation patterns
- **Activity Skills**: Self-contained skills for each capability: specification, spec-research, code-research, planning, implementation, review, documentation, final-pr, status
- **Artifact State**: Collection of files in `.paw/work/<feature-slug>/` that encode workflow progress

### Cross-Cutting / Non-Functional

- Token Efficiency: Combined agent + active skill tokens should be measurably lower than the equivalent multi-agent prompt
- Maintainability: Shared logic (context loading, handoff behavior) consolidated rather than duplicated across skills

## Success Criteria

- SC-001: User can complete full workflow (spec → PR) using only the PAW agent without invoking specific stage agents (FR-001, FR-002, FR-010)
- SC-002: All three workflow modes (full, minimal, custom) produce correct stage sequences when tested (FR-004)
- SC-003: All three handoff modes (manual, semi-auto, auto) exhibit correct pausing behavior at stage boundaries (FR-005)
- SC-004: Artifacts produced by the new system are location-compatible and format-compatible with existing tools and documentation (FR-006, FR-007)
- SC-005: Status capability correctly identifies current stage and next steps for any valid workflow state (FR-008)
- SC-006: The new PAW agent file is smaller than any single current implementation agent (under 5KB) (FR-003)
- SC-007: Workflow skill blocks progression when required predecessor artifacts are missing (FR-009)

## Assumptions

- The review workflow migration pattern (single agent + workflow skill + activity skills) is the established standard for PAW and should be followed for consistency
- The existing handoff-instructions.component.md logic correctly encodes routine transitions vs decision points and can be adapted for the workflow skill
- Activity skills can be loaded via `paw_get_skill` tool calls at runtime, consistent with how review skills are currently loaded
- Users familiar with the current multi-agent workflow will quickly adapt to the single-agent interface since stage names and concepts remain identical
- Token reduction is expected to be achieved primarily through on-demand skill loading rather than significant content reduction

## Scope

In Scope:
- Create single PAW agent file that replaces PAW-01A through PAW-05 and PAW-X Status
- Create `paw-workflow` skill with stage sequencing, validation, and handoff logic
- Create activity skills: `paw-spec`, `paw-spec-research`, `paw-code-research`, `paw-planning`, `paw-implement`, `paw-review`, `paw-docs`, `paw-pr`, `paw-status`
- Update extension installer to deploy new agent and skills instead of individual agent files
- Remove deprecated individual agent files after migration

Out of Scope:
- Changing artifact locations or formats
- Modifying the review workflow (already migrated per PR #156)
- Multi-runtime portability (Claude Code, Codex, etc.)
- Changes to the existing component files (paw-context.component.md, handoff-instructions.component.md)—these may be referenced by skills but not modified

## Dependencies

- `paw_get_skill` tool must be available for runtime skill loading
- `paw_call_agent` tool must support subagent delegation for phase-based implementation
- Extension installer (`src/agents/installer.ts`) must be updated to deploy skills directory structure

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

- **Orchestrator Agent**: An agent that coordinates workflow but delegates detailed work to skills
- **Workflow Skill**: A skill that encodes stage sequencing, validation gates, and handoff behavior
- **Activity Skill**: A self-contained skill that performs a specific capability (e.g., specification drafting)
- **Routine Transition**: A stage boundary where semi-auto mode automatically proceeds (e.g., spec → research)
- **Decision Point**: A stage boundary where semi-auto mode pauses for user input (e.g., planning → implementation)
