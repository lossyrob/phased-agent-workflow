# Feature Specification: Implementation Planner Improvements

**Branch**: feature/impl-planner-improvements  |  **Created**: 2025-11-18  |  **Status**: Draft
**Input Brief**: Enhance Implementation Planner agent to improve output quality, clarity, and user experience

## Overview

The Implementation Planner agent sits at a critical junction in the PAW workflow, translating specifications into actionable implementation strategies. When a specification is complete and validated, developers invoke the Implementation Planner to analyze the codebase, understand existing patterns, and produce a phased implementation plan that guides the Implementation Agent through development work. This plan becomes the roadmap for building the feature, breaking complex changes into manageable phases with clear success criteria and testing strategies.

However, the current Implementation Planner behavior creates friction in the workflow. The agent produces plans that are overly detailed with extensive code snippets, making them feel like coding tutorials rather than strategic guides. This level of detail obscures higher-level architectural thinking—in one documented case, removing code details revealed a simpler implementation approach that had been hidden by premature low-level focus. Additionally, plans sometimes include documentation phases even though documentation is handled separately by the Documenter agent. The workflow transition after planning can be unclear, with agents sometimes pausing for feedback when they should proceed directly to creating a Planning PR. Finally, when the planner does create PRs or leave comments, there's no clear attribution identifying which agent authored them, making it harder to understand the workflow state at a glance.

These issues compound to create a suboptimal planning experience. Developers return to find unclear next steps after context switching. Human reviewers wade through hundreds of lines of code in plans when they need strategic clarity. The system obscures opportunities for simpler solutions by diving into implementation details too early. What should be a clear, efficient planning stage instead introduces confusion and cognitive overhead.

The improvements address these pain points systematically. By guiding the planner to think strategically rather than tactically, we preserve the architectural perspective that enables better design decisions. By clarifying workflow transitions and adding agent identification, we make the process transparent and predictable. By ensuring plans have clear phase summaries at the top, we give both humans and the Status Agent quick insight into progress and structure. Together, these changes transform the Implementation Planner from a detailed code writer into an effective strategic planning partner.

## Objectives

- Maintain strategic focus in implementation planning through guidance that emphasizes architectural thinking over code-level implementation
- Separate planning and documentation concerns by ensuring plans focus on implementation strategy while documentation is handled by the dedicated Documenter agent
- Provide clear visibility into plan structure and progress through phase summaries that enable quick understanding of implementation scope and current state
- Ensure transparent agent identification through signatures on all planner-generated PR comments and descriptions
- Establish clear workflow transitions where the planner proceeds confidently from plan completion to Planning PR creation without unnecessary pauses

## User Scenarios & Testing

### User Story P1 – Strategic Planning Without Implementation Code

Narrative: As a developer reviewing an implementation plan, I need to understand the strategic approach and architectural decisions without wading through hundreds of lines of code snippets, so I can evaluate the plan's soundness and identify simpler alternatives without getting lost in implementation details.

Independent Test: Generate an implementation plan for a multi-phase feature and verify it focuses on describing WHAT needs to be built and WHY, using architectural concepts and component responsibilities, rather than HOW to implement it with code snippets.

Acceptance Scenarios:
1. Given an implementation plan is generated, When reviewing the Changes Required section of any phase, Then the plan describes component responsibilities, interfaces, and behaviors without code blocks longer than a few illustrative lines
2. Given an implementation plan contains architectural decisions, When those decisions involve technology choices or design patterns, Then the plan presents options with trade-offs rather than assuming a single implementation approach
3. Given a complex feature requires multiple phases, When the plan describes changes, Then it references file paths and module names but delegates detailed implementation to the Implementation Agent
4. Given a plan requires explaining a key interaction or data flow, When describing that interaction, Then the plan uses architectural diagrams (described in text) or component relationships rather than code walkthroughs

### User Story P2 – Clear Workflow Transitions to Planning PR

Narrative: As a developer who has kicked off the Implementation Planner, I often context switch to other work and return later to continue the workflow, so I need the planner to proceed confidently to Planning PR creation after completing the plan, with clear messaging about next steps, so I immediately understand what to do when I return.

Independent Test: Monitor the Implementation Planner's behavior after completing an implementation plan and verify it proceeds directly to committing, pushing, and creating a Planning PR (when using prs review strategy) with clear hand-off messaging, without pausing for manual approval.

Acceptance Scenarios:
1. Given the Implementation Planner completes an implementation plan, When all research is integrated and the plan is written, Then the planner proceeds automatically to commit the plan to the planning branch
2. Given the planner has committed the plan, When pushing to the remote, Then the planner creates a Planning PR without asking for user confirmation to proceed
3. Given the Planning PR is created, When the planner hands off to the user, Then the message clearly states "Planning PR created at [URL]. Review the plan and provide feedback through PR comments. When ready, invoke the Implementation Agent."
4. Given the planner encounters a blocking issue (e.g., missing context, unclear specification), When pausing for user input, Then the message explicitly states what information is needed and what the user should provide before proceeding

### User Story P3 – Phase Summary for Quick Understanding

Narrative: As a developer or Status Agent reviewing an implementation plan, I need a high-level summary of all phases at the top of the plan so I can quickly understand the scope, structure, and current progress without reading through all phase details.

Independent Test: Generate an implementation plan with multiple phases and verify a Phase Summary section appears at the top with a brief description of each phase's objective.

Acceptance Scenarios:
1. Given an implementation plan with N phases, When opening the plan file, Then a "Phase Summary" section appears after the Introduction/Overview but before detailed phase descriptions
2. Given the Phase Summary lists all phases, When reading a phase entry, Then it includes the phase number, name, and a one-sentence objective describing what the phase accomplishes
3. Given a developer scans the Phase Summary, When determining total work, Then they can count phases and understand relative complexity without reading detailed Changes Required sections
4. Given the Status Agent reads the Phase Summary, When updating issue status, Then it can accurately report phase count and current progress by comparing summary to phase completion markers

### User Story P4 – Documentation Excluded from Implementation Plans

Narrative: As a developer following the PAW workflow, I understand that documentation is handled by the Documenter agent after implementation is complete, so implementation plans should focus solely on implementation phases and exclude documentation tasks to avoid confusion about workflow sequencing.

Independent Test: Generate multiple implementation plans and verify none include a "Documentation Phase" or similar documentation-focused phase in the plan structure.

Acceptance Scenarios:
1. Given the Implementation Planner creates a phased implementation plan, When listing phases, Then no phase is titled "Documentation" or has a primary objective of writing documentation
2. Given a phase includes work that produces code requiring documentation, When describing success criteria, Then the criteria may mention "code is documented via inline comments" but do not include "write Docs.md" or similar documentation artifact creation
3. Given a plan's hand-off checklist references next steps, When describing what happens after implementation, Then it may mention "invoke Documenter agent" but does not include documentation tasks within the implementation phases
4. Given a developer reads an implementation plan, When understanding the workflow, Then it's clear that documentation is a separate post-implementation step handled by a different agent

### User Story P5 – Agent Identification in PR Comments

Narrative: As a developer reviewing PRs across multiple workflow stages, I need to quickly identify which agent created a PR or comment so I understand the workflow state and can follow the appropriate process for feedback without confusion.

Independent Test: Have the Implementation Planner create a Planning PR and verify the PR description and any comments include clear agent identification (e.g., "Implementation Planner" signature).

Acceptance Scenarios:
1. Given the Implementation Planner creates a Planning PR, When viewing the PR description, Then it starts with or includes "Implementation Planner" as a clear identifier before the PR content
2. Given the Implementation Planner adds a comment to a PR (e.g., during PR review response mode), When reading that comment, Then it begins with "Implementation Planner" to distinguish it from comments by other agents or humans
3. Given a developer views a PR with multiple agent comments, When scanning the comment thread, Then they can quickly identify which comments came from the Implementation Planner vs Implementation Agent vs Implementation Reviewer
4. Given the PAW project signature is included, When it appears in a Planning PR, Then it complements rather than replaces the agent-specific identification

### Edge Cases

- Large codebase: Plans for projects with hundreds of files should still maintain strategic focus by grouping related changes and describing patterns rather than enumerating every file
- Unclear specifications: When specifications lack detail, planner should ask clarifying questions rather than filling gaps with premature implementation assumptions
- Complex architectural decisions: Plans involving significant architecture changes should explicitly present options with trade-offs to justify the chosen approach
- Minimal changes: Even single-phase plans with small scope should include Phase Summary and maintain appropriate abstraction level
- PR creation failures: If git operations or PR creation fails, error messages should clearly state the issue and what manual steps the user should take

## Requirements

### Functional Requirements

- FR-001: The Implementation Planner shall include guidance that instructs it to focus on describing WHAT needs to be built (component responsibilities, interfaces, behaviors, data flows) rather than HOW to implement it with detailed code (Stories: P1)
- FR-002: The Implementation Planner shall include guidance that limits code blocks in implementation plans to brief illustrative examples (a few lines) when necessary to clarify a concept, avoiding extensive code snippets or pseudo-code (Stories: P1)
- FR-003: The Implementation Planner shall include guidance that encourages presenting multiple implementation options with trade-offs for significant architectural decisions rather than assuming a single approach (Stories: P1)
- FR-004: The Implementation Planner shall maintain references to file paths, module names, and component boundaries without generating detailed implementation code (Stories: P1)
- FR-005: The Implementation Planner shall include explicit guidance preventing the creation of documentation phases within implementation plans (Stories: P4)
- FR-006: The Implementation Planner shall generate a "Phase Summary" section at the top of every implementation plan that lists all phases with their objectives (Stories: P3)
- FR-007: The Phase Summary shall appear after the plan overview/introduction and before detailed phase descriptions (Stories: P3)
- FR-008: Each entry in the Phase Summary shall include phase number, phase name, and a one-sentence description of the phase objective (Stories: P3)
- FR-009: The Implementation Planner shall proceed automatically from plan completion to committing the plan to the planning branch when using the prs review strategy (Stories: P2)
- FR-010: The Implementation Planner shall create the Planning PR automatically after pushing the planning branch, without pausing for user confirmation (Stories: P2)
- FR-011: The Implementation Planner shall include clear hand-off messaging after Planning PR creation that states the PR URL and next steps for the user (Stories: P2)
- FR-012: When the Implementation Planner must pause for user input due to blocking issues, the message shall explicitly state what information is needed (Stories: P2)
- FR-013: The Implementation Planner shall include "Implementation Planner" as an identifying signature at the beginning of Planning PR descriptions (Stories: P5)
- FR-014: The Implementation Planner shall include "Implementation Planner" as an identifying signature at the beginning of PR comments it creates (Stories: P5)
- FR-015: Agent identification shall appear in addition to (not replacing) the PAW project signature (Stories: P5)

### Cross-Cutting / Non-Functional

- Guidance changes shall be applied to the Implementation Planner agent definition file without modifying other PAW agents unless explicitly required
- Updated guidance shall maintain compatibility with existing plan templates and workflow stages
- Phase Summary format shall be machine-readable to enable Status Agent automation
- Agent identification format shall be consistent with patterns used by Implementation Review Agent and Documenter Agent

## Success Criteria

- SC-001: When generating implementation plans after guidance updates, the Implementation Planner produces plans where code blocks are absent or limited to fewer than 10 lines per phase, with phase content focused on architectural descriptions (FR-001, FR-002)
- SC-002: When generating implementation plans involving architectural decisions, the plan includes at least two implementation options with documented trade-offs for at least 50% of significant decisions (FR-003)
- SC-003: When reviewing 10 newly generated implementation plans, zero plans contain phases titled "Documentation" or with documentation creation as a primary phase objective (FR-005, FR-006)
- SC-004: When generating any implementation plan, the plan includes a "Phase Summary" section positioned after the overview and before detailed phases, containing one entry per phase with phase number, name, and objective (FR-006, FR-007, FR-008)
- SC-005: When the Implementation Planner completes a plan using prs review strategy, it proceeds from plan completion through commit, push, and PR creation without pausing for user confirmation, completing the workflow in a single agent invocation (FR-009, FR-010)
- SC-006: When the Implementation Planner creates a Planning PR, the PR description begins with "Implementation Planner" or includes "**🐾 Implementation Planner 🤖:**" as a clear identifier (FR-013)
- SC-007: When the Implementation Planner adds comments to PRs, each comment begins with "Implementation Planner" or includes "**🐾 Implementation Planner 🤖:**" as a clear identifier (FR-014)
- SC-008: When the Implementation Planner completes PR creation, the hand-off message includes the PR URL and explicitly states "Review the plan and provide feedback through PR comments" as the next step (FR-011)
- SC-009: When reviewing updated agent guidance, the changes are confined to the Implementation Planner agent file unless cross-agent consistency requires updates (Cross-Cutting)
- SC-010: When comparing Phase Summary format across multiple plans, the structure is consistent and includes the same fields (phase number, name, objective) in the same order (Cross-Cutting)

## Assumptions

- The Implementation Planner agent definition file (`agents/PAW-02B Impl Planner.agent.md`) follows the same format and structure as other PAW agent files, allowing guidance updates through text additions/modifications
- Claude Sonnet (the underlying model) responds effectively to prompt engineering techniques that emphasize abstraction level, strategic thinking, and workflow clarity
- The existing plan template structure can accommodate a Phase Summary section without breaking downstream agents that parse ImplementationPlan.md
- Users prefer concise, strategic plans over exhaustive implementation details based on feedback from issue #58 and PR #85
- The pattern established by Implementation Review Agent (**🐾 Implementation Reviewer 🤖:**) and Documenter Agent (**🐾 Documenter 🤖:**) for agent identification is the desired standard for Implementation Planner
- "Brief illustrative examples" means code blocks of approximately 3-10 lines that clarify a concept without providing complete implementation
- The concept of "significant architectural decisions" includes choices about system structure, component boundaries, data flow patterns, technology selection, and integration approaches
- Phase Summary format requirements (phase number, name, objective) provide sufficient information for human understanding and Status Agent automation without requiring additional metadata

## Scope

In Scope:
- Modifications to Implementation Planner agent guidance and instructions
- Addition of Phase Summary section to implementation plan template
- Updates to PR description and comment formatting for agent identification
- Clarification of workflow transitions from plan completion to PR creation
- Guidance that encourages strategic thinking and architectural focus
- Instructions that prevent documentation phase inclusion in implementation plans

Out of Scope:
- Modifications to other PAW agents (Spec Agent, Implementation Agent, Documenter, etc.) unless required for consistency
- Changes to WorkflowContext.md format or structure
- Modifications to underlying LLM model parameters or selection
- Automated enforcement of plan quality metrics (e.g., counting code lines)
- Changes to the Planning PR review process or review strategy options
- Updates to Status Agent logic for parsing Phase Summaries (future enhancement)
- Retrospective updates to existing implementation plans already in use

## Dependencies

- `agents/PAW-02B Impl Planner.agent.md` - The Implementation Planner agent definition file that requires modification
- `agents/PAW-03B Impl Reviewer.agent.md` - Reference for agent identification pattern (🐾 Implementation Reviewer 🤖:)
- `agents/PAW-04 Documenter.agent.md` - Reference for agent identification pattern and guidance on avoiding implementation detail reproduction
- Implementation Plan template structure - Existing template within PAW-02B agent definition that defines plan section order and format
- PAW workflow documentation - Establishes the sequence of Specification → Planning → Implementation → Documentation stages

## Risks & Mitigations

- **Risk**: Agent guidance changes may not be sufficient to change model behavior; Claude may continue generating code-heavy plans despite updated instructions
  - **Impact**: High - Core objective (strategic focus) not achieved
  - **Mitigation**: Include explicit anti-pattern examples in guidance showing what NOT to do; use strong directive language ("Do NOT include code blocks longer than X lines"); test with multiple feature scenarios to validate behavior change

- **Risk**: Phase Summary addition may conflict with existing plan parsing logic in downstream agents or tools
  - **Impact**: Medium - Status Agent or other automation may break
  - **Mitigation**: Review Status Agent and other agents that read ImplementationPlan.md; ensure Phase Summary uses standard markdown heading structure that won't disrupt existing parsers; test with Status Agent after changes

- **Risk**: Removing code details may reduce plan usefulness for complex technical features where implementation approach significantly impacts feasibility
  - **Impact**: Medium - Plans may become too abstract to guide implementation effectively
  - **Mitigation**: Guidance should clarify that brief code examples (3-10 lines) are acceptable when necessary to illustrate a critical concept; emphasize describing interfaces, contracts, and patterns rather than completely avoiding technical detail

- **Risk**: Automatic PR creation may fail due to git/GitHub issues (permissions, branch conflicts, network errors)
  - **Impact**: Low - Workflow interrupted but recoverable
  - **Mitigation**: Ensure error messages clearly state what went wrong and what manual steps to take; existing error handling in agent should surface git operation failures

- **Risk**: Agent identification format may diverge from future PAW conventions if other agents adopt different patterns
  - **Impact**: Low - Minor inconsistency in presentation
  - **Mitigation**: Document the chosen pattern in PAW workflow documentation; align with established patterns from Implementation Review Agent and Documenter

- **Risk**: Users may prefer current code-heavy plans for certain project types or personal preferences
  - **Impact**: Low - User dissatisfaction with change
  - **Mitigation**: Issue #58 and PR #85 feedback indicate strong preference for strategic plans; if feedback suggests otherwise, guidance can be adjusted to allow more detail for specific contexts

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/58
- Research: .paw/work/implementation-planner-improvements/SpecResearch.md
- Example (too much code): https://github.com/lossyrob/phased-agent-workflow/pull/85 - Agent Installation Management implementation plan reduced from 1,387 to 557 lines by removing code details
- External: C4 Model (https://c4model.com) - Referenced in SpecResearch.md for architectural thinking at appropriate abstraction levels
- External: ATAM (Architecture Tradeoff Analysis Method) - Referenced in SpecResearch.md for evaluating architectural decisions via trade-offs
- External: ADRs (Architecture Decision Records) - Referenced in SpecResearch.md for documenting significant architectural choices
- External: YAGNI (You Aren't Gonna Need It) - Referenced in SpecResearch.md as principle for avoiding premature optimization and over-specification
