# Feature Specification: Finalize Initial Agent Chatmodes

**Branch**: feature/finalize-initial-chatmodes  |  **Created**: 2025-10-13  |  **Status**: Draft  
**Input Brief**: Mature and standardize all PAW agent chatmodes, completing first-pass agents and ensuring consistency across all stages with proven guidance patterns from production-tested agents.

## User Scenarios & Testing

### User Story P1 – Complete Empty Chatmodes
**Narrative**: As a PAW workflow user, I need all agent chatmodes to have complete instructions so that every workflow stage can be executed without encountering empty or placeholder files.

**Independent Test**: Open any chatmode file in `.github/chatmodes/` and verify it contains structured sections with actionable instructions.

**Acceptance Scenarios**:
1. Given the PAW-03B Impl Reviewer chatmode, When I open the file, Then it contains complete review instructions, quality criteria, commit guidance, and PR interaction steps
2. Given the PAW-04 Documenter chatmode, When I open the file, Then it contains documentation generation instructions, scope boundaries, and artifact format specifications
3. Given the PAW-05 PR chatmode, When I open the file, Then it contains pre-flight validation, prerequisite checks, and PR description crafting instructions

### User Story P2 – Standardize Agent Naming
**Narrative**: As a PAW workflow user, I need consistent agent naming across all documentation and files so that I can reference agents unambiguously without confusion.

**Independent Test**: Search all chatmode files and `paw-specification.md` for agent references and verify naming consistency.

**Acceptance Scenarios**:
1. Given all chatmode filenames, titles, and paw-specification.md references, When I compare agent names, Then each agent has one canonical name used consistently
2. Given chatmode file paths, When I inspect artifact path references, Then they use the canonical structure `/docs/agents/<target_branch>/` with standard filenames
3. Given agent-to-agent hand-off instructions, When I read the next-step statements, Then they reference agents by their canonical names

### User Story P3 – Preserve Proven Guidance Patterns
**Narrative**: As a PAW workflow user, I need critical guardrails from production-tested chatmodes (Code Researcher, Impl Planner, Implementer) and useful patterns from lightly tested chatmodes (Spec Agent, Spec Research Agent) propagated to all agents so that hard-won patterns prevent common failure modes across the workflow.

**Independent Test**: Review a chatmode file and verify it contains appropriate guardrail categories (scope boundaries, fabrication prevention, pause points, etc.) relevant to its role.

**Acceptance Scenarios**:
1. Given the Code Researcher's anti-evaluation guardrails (production-tested), When I review the Spec Research Agent, Then it contains similar pure-documentation-role guardrails
2. Given the Implementer's surgical change discipline (production-tested), When I review the Impl Reviewer and Documenter, Then they contain similar unrelated-change exclusion rules
3. Given the Spec Agent's blocking-on-unresolved-questions pattern (lightly tested), When I review planning and implementation agents, Then they have similar question-resolution requirements

### User Story P4 – Clarify Spec vs Code Research Boundary
**Narrative**: As a PAW user executing Stage 01 and 02, I need clear differentiation between Spec Research (behavioral) and Code Research (implementation with file paths) so that I understand what each stage produces and can avoid redundant work.

**Independent Test**: Compare SpecResearch.md and CodeResearch.md outputs and verify one focuses on behavioral system description while the other includes file paths and code snippets.

**Acceptance Scenarios**:
1. Given the Spec Research Agent chatmode, When I read its instructions, Then it emphasizes behavioral documentation without file:line references
2. Given the Code Research Agent chatmode, When I read its instructions, Then it requires file paths and code snippets but builds upon behavioral understanding from SpecResearch.md
3. Given both research chatmodes, When I compare their output specifications, Then SpecResearch.md format excludes code implementation detail while CodeResearch.md format includes it

### User Story P5 – Define Implementer vs Reviewer Split
**Narrative**: As a PAW user executing Stage 03, I need clear role separation between the Implementation Agent (forward momentum, making changes work) and Implementation Review Agent (maintainability, documentation, review responses) so that I can use specialized models for each task.

**Independent Test**: Execute a phase with Implementer followed by Reviewer and verify Implementer focuses on functionality while Reviewer adds documentation and polish.

**Acceptance Scenarios**:
1. Given the Implementer chatmode, When I read its responsibilities, Then it focuses on executing plan phases, running verification, and pausing for human approval
2. Given the Impl Reviewer chatmode, When I read its responsibilities, Then it focuses on code review, docstring generation, comment responses, and maintainability improvements
3. Given both chatmodes, When I compare their commit instructions, Then Implementer commits functional changes while Reviewer commits documentation and review-response changes

### User Story P6 – Add Explicit Stage Hand-offs
**Narrative**: As a PAW user progressing through workflow stages, I need explicit input requirements and next-agent invocations at each stage boundary so that I know when prerequisites are met and which agent to invoke next.

**Independent Test**: Read any chatmode's hand-off section and verify it lists required outputs, prerequisite checks, and the next agent name.

**Acceptance Scenarios**:
1. Given the Spec Research Agent, When it completes, Then it states "return to Spec Agent with SpecResearch.md"
2. Given the Impl Planner, When it completes, Then it states "Invoke Implementation Agent (Stage 03) with ImplementationPlan.md"
3. Given the Implementer, When all phases complete, Then it states "Invoke Documenter Agent (Stage 04) when all Phase PRs merged"

### User Story P7 – Add Quality Checklists
**Narrative**: As a PAW agent, I need explicit quality checklists to validate my outputs so that I can self-verify completeness before handing off to the next stage.

**Independent Test**: Review a chatmode and verify it contains a quality checklist with measurable criteria relevant to its outputs.

**Acceptance Scenarios**:
1. Given research agents (Spec Research, Code Research), When I review their checklists, Then they include factual accuracy, precision, and neutrality checks
2. Given planning agents (Spec, Impl Planner), When I review their checklists, Then they include traceability, testability, and completeness checks
3. Given implementation agents (Implementer, Reviewer, Documenter), When I review their checklists, Then they include verification, documentation quality, and scope adherence checks

### User Story P8 – Reduce Ambiguous Language
**Narrative**: As a PAW agent, I need actionable instructions with clear thresholds instead of ambiguous verbs so that I can execute my role without interpretation variance.

**Independent Test**: Search chatmode instructions for ambiguous verbs (update, refine, comprehensive, relevant, complete) and verify each has clarifying context or examples.

**Acceptance Scenarios**:
1. Given any instruction using "update", When I read the context, Then it specifies what to update (checkboxes, AUTOGEN blocks, etc.) and how (append, replace, modify)
2. Given any instruction using "comprehensive", When I read the context, Then it provides stopping conditions or scope boundaries
3. Given any instruction using "complete", When I read the context, Then it defines completion criteria (all checkboxes, all questions answered, human approval, etc.)

### User Story P9 – Align Artifact Paths
**Narrative**: As a PAW workflow user, I need all agents to reference the canonical artifact path structure so that documents are consistently located and linked across stages.

**Independent Test**: Search all chatmode files for artifact path references and verify they use `/docs/agents/<target_branch>/` with standard filenames.

**Acceptance Scenarios**:
1. Given any chatmode referencing research documents, When I read the path, Then it uses `docs/agents/<target_branch>/SpecResearch.md` or `CodeResearch.md`
2. Given any chatmode referencing the implementation plan, When I read the path, Then it uses `docs/agents/<target_branch>/ImplementationPlan.md` (not ImplPlan.md)
3. Given any chatmode referencing documentation, When I read the path, Then it uses `docs/agents/<target_branch>/Docs.md` (not Documentation.md)

### User Story P10 – Standardize Status Agent Triggers
**Narrative**: As a PAW workflow coordinator, I need complete trigger documentation for the Status Agent so that I know when to invoke it for Issue and PR updates.

**Independent Test**: Compare Status Agent triggers to paw-specification.md Stage descriptions and verify all PR lifecycle events are covered.

**Acceptance Scenarios**:
1. Given the Status Agent chatmode, When I read the Triggers section, Then it lists "Planning PR opened/updated/merged"
2. Given the Status Agent chatmode, When I read the Triggers section, Then it lists "Docs PR opened/updated/merged" (not just merged)
3. Given the Status Agent chatmode, When I read the Triggers section, Then all trigger types from paw-specification.md are represented

### Edge Cases
- **Empty chatmode files**: PAW-03B, PAW-04, PAW-05 currently have no content; must be fully populated
- **Legacy path structures**: Code Researcher and Impl Planner reference old path patterns (`docs/agent/{description}/YYYY-MM-DD-ENG-XXXX-*.md`); must migrate to canonical paths
- **Naming variations within single chatmode**: Implementation Plan Agent has three different names in PAW-02B; must standardize internally
- **Contradictory guidance**: Code Researcher contains "no code paths" in principles but "file:line references" in instructions; must resolve tension
- **Optional external questions**: SpecResearch.md contains manual-fill section that may remain unanswered; agents must handle gracefully
- **Cross-stage guardrail applicability**: Some guardrails (e.g., idempotency) valuable across multiple agents but currently only in Status Agent; must migrate selectively

## Requirements

### Functional Requirements

#### Chatmode Completeness
- **FR-001**: All chatmode files (PAW-03B Impl Reviewer, PAW-04 Documenter, PAW-05 PR) SHALL contain complete structured instructions including: role statement, start/initial response, core principles, inputs, process steps, outputs, guardrails, error handling, and quality checklist. (Stories: P1)
- **FR-002**: Impl Reviewer chatmode SHALL specify code review criteria, docstring generation instructions, commit structuring, PR comment handling, and coordination with Implementer. (Stories: P1, P5)
- **FR-003**: Documenter chatmode SHALL specify scope boundaries (what not to change), input validation, documentation types, Docs.md artifact format, and project documentation update guidance. (Stories: P1)
- **FR-004**: PR chatmode SHALL specify pre-flight validation checks, prerequisite verification (phases merged, docs merged, branch updated), blocking conditions, and comprehensive PR description generation. (Stories: P1)

#### Naming and Path Consistency
- **FR-005**: All agent references across chatmode files, filenames, and paw-specification.md SHALL use a single canonical name per agent. (Stories: P2)
- **FR-006**: All artifact path references in chatmode instructions SHALL use the canonical structure `/docs/agents/<target_branch>/` with standard filenames: `Spec.md`, `SpecResearch.md`, `CodeResearch.md`, `ImplementationPlan.md`, `Docs.md`. (Stories: P2, P9)
- **FR-007**: Chatmode filenames SHALL follow the pattern `PAW-<code> <canonical-name>.chatmode.md` where canonical-name matches the name used in paw-specification.md. (Stories: P2)

#### Guardrail Propagation
- **FR-008**: Spec Research Agent chatmode SHALL include anti-evaluation guardrails (no suggestions, no critique, no improvements) consistent with Code Researcher pattern. (Stories: P3)
- **FR-009**: Impl Reviewer and Documenter chatmodes SHALL include surgical change discipline guardrails (only related changes, no unrelated modifications) consistent with Implementer pattern. (Stories: P3)
- **FR-010**: Planning and implementation chatmodes SHALL include question-resolution requirements (block if critical questions unresolved) consistent with Spec Agent pattern. (Stories: P3)
- **FR-011**: All chatmodes that modify existing files SHALL include idempotency and block-boundary enforcement guardrails consistent with Status Agent pattern. (Stories: P3)

#### Research Differentiation
- **FR-012**: Spec Research Agent chatmode SHALL emphasize behavioral system documentation without file:line references or code snippets. (Stories: P4)
- **FR-013**: Code Research Agent chatmode SHALL require file paths and code snippets while building upon behavioral understanding documented in SpecResearch.md. (Stories: P4)
- **FR-014**: Code Research Agent chatmode SHALL resolve contradictory guidance between "no code paths" principle and "file:line references" instruction by clarifying that behavioral mapping is high-level summary while comprehensive research requires implementation detail. (Stories: P4)

#### Role Separation (Stage 03)
- **FR-015**: Implementer chatmode SHALL focus on executing plan phases, running automated verification, committing functional changes, and pausing for human verification. (Stories: P5)
- **FR-016**: Impl Reviewer chatmode SHALL focus on code review, docstring generation, comment handling, committing documentation changes, and maintainability improvements. (Stories: P5)
- **FR-017**: Implementer and Impl Reviewer chatmodes SHALL have distinct commit scopes with Implementer committing functionality and Reviewer committing documentation/polish. (Stories: P5)

#### Stage Hand-offs
- **FR-018**: Each chatmode SHALL include explicit hand-off section listing: required outputs, completion checklist, and next agent invocation statement. (Stories: P6)
- **FR-019**: Spec Research Agent hand-off SHALL state "Return to Spec Agent with completed SpecResearch.md". (Stories: P6)
- **FR-020**: Code Research Agent start section SHALL state prerequisite: "Requires Spec.md and SpecResearch.md from Stage 01". (Stories: P6)
- **FR-021**: Impl Planner hand-off SHALL state "Invoke Implementation Agent (Stage 03) with ImplementationPlan.md". (Stories: P6)
- **FR-022**: Implementer hand-off (after all phases) SHALL state "Invoke Documenter Agent (Stage 04) when all Phase PRs merged". (Stories: P6)

#### Quality Standards
- **FR-023**: Each chatmode SHALL include role-appropriate quality checklist with measurable criteria for output validation. (Stories: P7)
- **FR-024**: Research agent checklists SHALL include: factual accuracy, precision, traceability, neutrality, and completeness dimensions. (Stories: P7)
- **FR-025**: Planning agent checklists SHALL include: traceability, testability, completeness, ambiguity control, and scope clarity dimensions. (Stories: P7)
- **FR-026**: Implementation agent checklists SHALL include: verification passing, documentation quality, scope adherence, and commit discipline dimensions. (Stories: P7)

#### Language Clarity
- **FR-027**: All chatmode instructions SHALL provide clarifying context or examples for ambiguous verbs (update, refine, comprehensive, relevant, complete). (Stories: P8)
- **FR-028**: Instructions using "update" SHALL specify target (what to update) and method (append, replace, modify in-place). (Stories: P8)
- **FR-029**: Instructions using "comprehensive" or "complete" SHALL provide stopping conditions, scope boundaries, or completion criteria. (Stories: P8)

#### Status Agent Triggers
- **FR-030**: Status Agent triggers section SHALL list all PR lifecycle events: Planning PR opened/updated/merged, Phase PR opened/updated/merged, Docs PR opened/updated/merged, Final PR opened/merged. (Stories: P10)

### Key Entities

- **Chatmode File**: Markdown file in `.github/chatmodes/` containing agent instructions, structured with YAML frontmatter and markdown sections
- **Agent**: Role-specific AI assistant executing one stage or sub-stage of the PAW workflow
- **Stage Hand-off**: Transition point between workflow stages with explicit input/output requirements and next-agent invocation
- **Guardrail**: Directive constraining agent behavior using NEVER/ALWAYS/DO NOT patterns to prevent failure modes
- **Quality Checklist**: Enumerated validation criteria for agent outputs
- **Artifact Path**: Canonical file location under `/docs/agents/<target_branch>/` for workflow documents

## Success Criteria

- **SC-001**: All chatmode files compile without syntax errors and render correctly in Markdown viewers. (FR-001, FR-002, FR-003, FR-004)
- **SC-002**: Zero naming inconsistencies when comparing agent references across all chatmode files and paw-specification.md. (FR-005, FR-007)
- **SC-003**: Zero artifact path mismatches when comparing references across all chatmode files. (FR-006)
- **SC-004**: All research and planning agents contain at least 5 explicit guardrail directives in dedicated Guardrails section. (FR-008, FR-009, FR-010, FR-011)
- **SC-005**: Spec Research Agent produces SpecResearch.md without file paths or code snippets; Code Research Agent produces CodeResearch.md with file paths and code snippets. (FR-012, FR-013, FR-014)
- **SC-006**: Implementer and Impl Reviewer have zero overlapping responsibilities in their respective scope sections. (FR-015, FR-016, FR-017)
- **SC-007**: Every chatmode contains explicit "Next: Invoke [Agent Name]" or "Return to [Agent Name]" statement. (FR-018, FR-019, FR-020, FR-021, FR-022)
- **SC-008**: Every chatmode contains quality checklist with minimum 5 measurable criteria appropriate to agent role. (FR-023, FR-024, FR-025, FR-026)
- **SC-009**: Zero instances of ambiguous verbs (update, refine, comprehensive, relevant, complete) without clarifying context when searched across all chatmodes. (FR-027, FR-028, FR-029)
- **SC-010**: Status Agent triggers section matches all trigger types enumerated in paw-specification.md without omissions. (FR-030)

## Assumptions

- **Assumption 1**: The PAW-02A Code Researcher, PAW-02B Impl Planner, and PAW-03A Implementer chatmodes are production-tested from Human Layer and their detailed guidance patterns (specific steps, strong corrective language, "important notes") should serve as primary templates for other agents. The PAW-01A Spec Agent and PAW-01B Spec Research Agent are lightly tested and provide additional structural patterns. PAW-X Status Update provides specialized patterns for idempotent updates. *Rationale*: Issue explicitly states Code Researcher and Impl Planner are "taken from Human Layer and have been used effectively," and Implementer was "modified from Human Layer and used effectively in another codebase."

- **Assumption 2**: Canonical agent names will follow the pattern used in paw-specification.md Stage descriptions (e.g., "Implementation Plan Agent" not "Impl Planner"). *Rationale*: Main specification document is the authoritative source for terminology.

- **Assumption 3**: The split between Implementation Agent and Implementation Review Agent is finalized and both will be used in Stage 03 sequentially (Implementer then Reviewer per phase). *Rationale*: Issue description states this split is based on testing with multiple models showing specialization benefits.

- **Assumption 4**: Guardrails using strong corrective language (CRITICAL, NEVER, ALWAYS, DO NOT) are valuable and should be preserved/propagated, not softened. *Rationale*: Issue description states these patterns come from production experience fixing model failures.

- **Assumption 5**: Optional external/context questions in SpecResearch.md may remain unanswered without blocking subsequent stages; agents should handle missing optional knowledge gracefully. *Rationale*: Research distinguishes between internal (must answer) and optional external (manual) questions.

- **Assumption 6**: The human verification pause in Implementer is non-negotiable and should be reflected in Reviewer and potentially other agents. *Rationale*: Critical safety gate preventing automated propagation of implementation errors.

- **Assumption 7**: All chatmodes will be updated in-place (overwriting empty files, modifying mature files) rather than creating new versioned files. *Rationale*: Standard practice for evolving prompt templates.

- **Assumption 8**: The Code Research Agent's emphasis on file:line granularity is intentional for Stage 02 (planning needs implementation detail) despite tension with behavioral focus. *Rationale*: Research findings note this is explicitly for implementation planning, contrasting with Spec Research's behavioral abstraction.

- **Assumption 9**: Status Agent will be updated to include Docs PR opened/updated triggers even though paw-specification.md shows it, as this was identified as an omission not an intentional exclusion. *Rationale*: Consistency across all PR types throughout workflow.

- **Assumption 10**: Quality checklists are for agent self-validation and should be embedded in chatmode instructions, not external rubrics. *Rationale*: Pattern from Spec Agent showing checklist as part of workflow instructions.

## Scope

### In Scope
- Completing empty chatmode files (PAW-03B, PAW-04, PAW-05) with full structured content
- Standardizing agent naming across all chatmode files and paw-specification.md
- Migrating proven guardrail patterns from mature chatmodes to all agents
- Clarifying Spec Research vs Code Research differentiation in respective chatmodes
- Defining Implementer vs Impl Reviewer role split and coordination
- Adding explicit stage hand-offs to all chatmodes
- Adding quality checklists to all chatmodes
- Clarifying ambiguous language throughout all chatmodes
- Aligning artifact path references to canonical structure
- Completing Status Agent trigger documentation

### Out of Scope
- Creating new workflow stages or agents beyond the existing PAW structure
- Modifying paw-specification.md structure or stage definitions (only terminology alignment)
- Implementing automated testing for chatmode effectiveness
- Creating example outputs or sample runs for each agent
- Integrating chatmodes with GitHub Copilot features beyond file structure
- Performance optimization of agent execution
- Multi-language translations of chatmodes
- Version control or rollback mechanisms for chatmode changes
- External LLM provider configuration or model selection
- UI/UX improvements to chatmode invocation in VS Code

## Dependencies

- Access to all existing chatmode files in `.github/chatmodes/`
- SpecResearch.md (already completed and provided)
- CodeResearch.md (to be generated during Stage 02)
- paw-specification.md as authoritative source for workflow structure
- GitHub repository structure at `/docs/agents/<target_branch>/` for artifact paths

## Risks & Mitigations

- **Risk: Overwriting production-tested chatmodes breaks working agents**: Impact: High. Mitigation: Create implementation phases where production-tested chatmodes (Code Researcher, Impl Planner, Implementer) are modified incrementally with validation after each change; preserve proven patterns explicitly in implementation plan. Lightly tested chatmodes (Spec Agent, Spec Research Agent) have lower risk but still require careful validation.

- **Risk: Guardrail propagation introduces contradictions between agents**: Impact: Medium. Mitigation: Map guardrails to agent roles during planning; only propagate guardrails relevant to specific agent capabilities and scope.

- **Risk: Ambiguous language clarification makes instructions overly verbose**: Impact: Low. Mitigation: Provide clarifying context inline or in footnotes; use examples where brief text is insufficient.

- **Risk: Canonical naming changes break existing workflows**: Impact: Medium. Mitigation: Document name mappings in implementation plan; update all references atomically in a single phase to avoid partial state.

- **Risk: Stage hand-off additions create circular dependencies**: Impact: Low. Mitigation: Validate hand-off chain during planning to ensure linear or branching flow without cycles.

- **Risk: Quality checklists become maintenance burden**: Impact: Low. Mitigation: Keep checklists concise (5-10 items); focus on high-impact validation criteria; use consistent categories across similar agents.

- **Risk: Contradictory guidance resolution in Code Researcher misinterprets intent**: Impact: Medium. Mitigation: During Stage 03 implementation, pause after resolving contradiction for human review before proceeding with remaining changes.

- **Risk: Missing external research knowledge creates false assumptions**: Impact: Low. Mitigation: Explicitly document assumptions derived from research gaps; flag in hand-off to implementation stage as areas requiring extra validation.

## References

- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/1
- **Research**: docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md
- **Specification**: paw-specification.md (repository root)
- **External**: None (optional external research questions remain unanswered per SpecResearch.md)

## Glossary

- **PAW**: Phased Agent Workflow - structured multi-stage development process with specialized AI agents
- **Chatmode**: VS Code / GitHub Copilot agent instruction file defining role, behavior, and constraints
- **Human Layer**: Prior agent framework from which several PAW chatmodes were adapted
- **Canonical Name**: Standardized agent name used consistently across all documentation
- **Guardrail**: Behavioral constraint directive preventing common failure modes
- **Stage Hand-off**: Explicit transition between workflow stages with input/output specification
- **Surgical Change Discipline**: Practice of committing only related changes, excluding unrelated modifications
- **Anti-evaluation Guardrail**: Directive preventing agents from suggesting improvements or critiquing existing systems
- **Blocking Question**: Clarification or research question that must be resolved before proceeding to next step
- **Artifact Path**: Canonical file location for workflow documents under `/docs/agents/<target_branch>/`
