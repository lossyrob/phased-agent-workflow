---
date: 2025-10-11T00:00:00-00:00
target_branch: feature/finalize-initial-chatmodes
status: complete
last_updated: 2025-10-11
summary: "Specification for aligning all PAW chatmodes with proven HumanLayer patterns and adding YAML frontmatter"
tags: [specification, chatmodes, alignment, frontmatter]
issue: 1
---

# Finalize Initial Agent Chatmodes Spec

## Problem & Goals

The PAW (Phased Agent Workflow) system currently has 9 chatmode files in varying states of completeness and alignment with the PAW specification. Some chatmodes were adapted from proven HumanLayer implementations with battle-tested guidance patterns, while others are untested first-pass outputs or empty placeholders. This inconsistency creates risks for workflow reliability and prevents the PAW system from operating at its full potential.

**Success Definition**: All PAW chatmode files are complete, tested-ready, aligned with the PAW specification, and incorporate proven guidance patterns (CRITICAL/Important notes, explicit DO NOT lists, numbered workflows, pause points) from HumanLayer-derived chatmodes.

## Scope

### In-Scope

- **Spec Agent Chatmode (PAW-01A)**: Align with proven HumanLayer guidance patterns (was first-pass output)
- **Spec Research Agent Chatmode (PAW-01B)**: Align with proven HumanLayer guidance patterns (was first-pass output)
- **Code Researcher Chatmode (PAW-02A)**: Refactor to focus on behavioral understanding over line-number specificity while preserving all proven guidance patterns
- **Implementation Planner Chatmode (PAW-02B)**: Align with proven HumanLayer guidance patterns (was first-pass output)
- **Implementer Chatmode (PAW-03A)**: Update to align with two-agent split (Implementation + Review) and current PAW specification
- **Implementation Review Chatmode (PAW-03B)**: Create complete chatmode incorporating proven patterns and model-specific strengths (Claude for documentation/review)
- **Documenter Chatmode (PAW-04)**: Create complete chatmode with HumanLayer-style guidance patterns
- **PR Agent Chatmode (PAW-05)**: Create complete chatmode with HumanLayer-style guidance patterns
- **Status Update Agent Chatmode (PAW-X)**: Align with proven HumanLayer guidance patterns (was first-pass output)
- **All Chatmodes**: Ensure consistent application of proven guidance patterns (DO NOT lists, CRITICAL/Important notes, numbered workflows, pause points, explicit role boundaries)
- **Validation**: Each chatmode clearly states what it does NOT do and where human handoffs occur
- **Cross-references**: Each chatmode correctly references artifact locations and next-stage agents

### Out-of-Scope

- Creating new stages or agents beyond the 9 existing chatmodes
- Testing chatmodes in production workflows (that's implementation validation work)
- Changing the PAW specification itself (chatmodes must align TO the spec, not vice versa)
- Creating scripts or tooling referenced by chatmodes (e.g., metadata generation scripts)

## Stakeholders & Interfaces

**Human Developers**:
- Read chatmode files to understand agent responsibilities and invoke agents correctly
- Review agent outputs at defined pause points
- Provide clarifications when agents encounter ambiguities

**AI Agent Runtime (VS Code Copilot Chat)**:
- Loads chatmode content as system prompts
- Executes agent workflows following chatmode instructions
- Respects role boundaries and non-responsibilities defined in chatmodes

**PAW Workflow Stages**:
- Stage 01 (Specification): Uses PAW-01A, PAW-01B
- Stage 02 (Implementation Plan): Uses PAW-02A, PAW-02B
- Stage 03 (Phased Implementation): Uses PAW-03A, PAW-03B
- Stage 04 (Documentation): Uses PAW-04
- Stage 05 (Final PR): Uses PAW-05
- Cross-stage: PAW-X (Status Update)

**Artifact Files**:
- Each chatmode references correct paths for reading/writing artifacts in `/docs/agents/<target_branch>/`
- Chatmodes specify correct prompt file naming conventions in `/docs/agents/<target_branch>/prompts/`

## Functional Requirements

### FR-1: Spec Agent Alignment
As a Spec Agent, when drafting specifications from GitHub Issues, then I SHALL incorporate all proven HumanLayer guidance patterns to ensure rigorous, testable requirement generation.

**Specific Behaviors**:
- Chatmode includes CRITICAL section with 8+ DO NOT items (e.g., "DO NOT fabricate answers", "DO NOT proceed to final spec if unanswered critical questions remain")
- Chatmode includes numbered workflow (currently has detailed steps, ensure all proven patterns applied)
- Chatmode includes 3+ IMPORTANT notes about pausing for research, integrating external knowledge, quality standards
- Chatmode includes "What not to do" section
- Chatmode includes explicit pause points (after research prompt generation, before final spec draft)
- Chatmode preserves existing detailed template and quality bar sections
- Chatmode explicitly states: "DO NOT commit, push, open PRs, or update Issues"
- Chatmode specifies YAML frontmatter template for `Spec.md` with fields: `date`, `target_branch`, `status`, `last_updated`, `summary` (one-sentence description), optional `tags` and `issue`

### FR-2: Spec Research Agent Alignment
As a Spec Research Agent, when gathering internal system facts and external knowledge, then I SHALL incorporate all proven HumanLayer guidance patterns to ensure comprehensive, cited research.

**Specific Behaviors**:
- Chatmode includes CRITICAL section with 8+ DO NOT items (e.g., "DO NOT fabricate sources", "DO NOT skip internal file reading")
- Chatmode includes numbered workflow for research execution
- Chatmode includes 3+ IMPORTANT notes about file reading discipline, citation requirements, handling missing external search tools
- Chatmode includes "What not to do" section
- Chatmode preserves existing internal vs external knowledge separation
- Chatmode explicitly states output path: `docs/agents/<target_branch>/SpecResearch.md`
- Chatmode specifies YAML frontmatter template for `SpecResearch.md` with fields: `date`, `target_branch`, `status`, `last_updated`, `summary` (one-sentence description), optional `tags` and `issue`

### FR-3: Code Researcher Behavioral Focus
As a Code Research Agent, when analyzing the current system to inform implementation planning, then I SHALL produce research that emphasizes behavioral understanding and architectural patterns over exhaustive file:line mappings, WHILE retaining all proven HumanLayer guidance patterns (CRITICAL/DO NOT lists, numbered workflows, Important notes).

**Specific Behaviors**:
- Research output describes WHAT the system does and WHERE relevant code lives, without requiring line-by-line citations for every behavior
- File paths and key entry points are cited, but not every implementation detail
- Architectural patterns and code organization principles are explicitly documented
- All existing DO NOT items are preserved
- All existing IMPORTANT/CRITICAL notes are preserved
- Numbered step-by-step workflow is preserved
- Chatmode preserves existing YAML frontmatter template (already includes proper metadata structure with `date`, `git_commit`, `branch`, `repository`, `topic`, `tags`, `status`, `last_updated`)

### FR-4: Implementation Planner Alignment
As an Implementation Planner Agent, when creating phased implementation plans, then I SHALL incorporate all proven HumanLayer guidance patterns to ensure executable, testable phase definitions.

**Specific Behaviors**:
- Chatmode includes CRITICAL section with 8+ DO NOT items (e.g., "DO NOT create phases without clear verification criteria", "DO NOT skip dependency analysis")
- Chatmode includes numbered workflow for plan creation
- Chatmode includes 3+ IMPORTANT notes about phase sizing, dependency management, verification planning
- Chatmode includes "What not to do" section
- Chatmode includes pause point before creating Planning PR
- Chatmode explicitly states output path: `docs/agents/<target_branch>/ImplementationPlan.md`
- Chatmode defines Planning PR workflow (branch: `<target_branch>_plan`)
- Chatmode specifies YAML frontmatter template for `ImplementationPlan.md` with fields: `date`, `target_branch`, `status`, `last_updated`, `summary` (one-sentence description), optional `tags` and `issue`

### FR-5: Implementer/Reviewer Split Alignment
As a Code Research Agent, when analyzing the current system to inform implementation planning, then I SHALL produce research that emphasizes behavioral understanding and architectural patterns over exhaustive file:line mappings, WHILE retaining all proven HumanLayer guidance patterns (CRITICAL/DO NOT lists, numbered workflows, Important notes).

**Specific Behaviors**:
- Research output describes WHAT the system does and WHERE relevant code lives, without requiring line-by-line citations for every behavior
- File paths and key entry points are cited, but not every implementation detail
- Architectural patterns and code organization principles are explicitly documented
- All existing DO NOT items are preserved
- All existing IMPORTANT/CRITICAL notes are preserved
- Numbered step-by-step workflow is preserved

### FR-5: Implementer/Reviewer Split Alignment
As an Implementation Agent (PAW-03A), when executing implementation phases, then I SHALL focus on code changes and automated quality checks, explicitly delegating documentation, code commenting, and PR creation to the Implementation Review Agent (PAW-03B).

As an Implementation Review Agent (PAW-03B), when reviewing implementation phase outputs, then I SHALL add docstrings and code comments for maintainability, create/update Phase PRs, and respond to review comments with detailed replies.

**Specific Behaviors**:
- PAW-03A chatmode explicitly states: "DO NOT generate docstrings or code comments — Implementation Review Agent handles that"
- PAW-03A chatmode explicitly states: "DO NOT open Phase PRs — Implementation Review Agent handles that"
- PAW-03A workflow ends with: "Phase [N] Complete - Handoff to Implementation Review Agent"
- PAW-03B chatmode explicitly states: "DO NOT make functional code changes unless addressing review comments — Implementation Agent handles that"
- PAW-03B chatmode includes conditional logic: "When invoked post-implementation" vs "When responding to PR review comments"
- Both chatmodes reference the model-testing rationale (GPT Codex for implementation, Claude for documentation)

### FR-6: Implementation Review Chatmode Creation
As an Implementation Agent (PAW-03A), when executing implementation phases, then I SHALL focus on code changes and automated quality checks, explicitly delegating documentation, code commenting, and PR creation to the Implementation Review Agent (PAW-03B).

As an Implementation Review Agent (PAW-03B), when reviewing implementation phase outputs, then I SHALL add docstrings and code comments for maintainability, create/update Phase PRs, and respond to review comments with detailed replies.

**Specific Behaviors**:
- PAW-03A chatmode explicitly states: "DO NOT generate docstrings or code comments — Implementation Review Agent handles that"
- PAW-03A chatmode explicitly states: "DO NOT open Phase PRs — Implementation Review Agent handles that"
- PAW-03A workflow ends with: "Phase [N] Complete - Handoff to Implementation Review Agent"
- PAW-03B chatmode explicitly states: "DO NOT make functional code changes unless addressing review comments — Implementation Agent handles that"
- PAW-03B chatmode includes conditional logic: "When invoked post-implementation" vs "When responding to PR review comments"
- Both chatmodes reference the model-testing rationale (GPT Codex for implementation, Claude for documentation)

### FR-6: Implementation Review Chatmode Creation
As a PAW system user, when I invoke the Implementation Review Agent (PAW-03B), then I SHALL receive a complete, tested-ready chatmode with all proven guidance patterns from HumanLayer-derived chatmodes.

**Specific Behaviors**:
- File `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` exists and contains > 200 lines
- Chatmode includes CRITICAL section with 8+ DO NOT items
- Chatmode includes numbered workflow with clear steps
- Chatmode includes 3+ IMPORTANT notes about tool usage, file reading, or handoff protocols
- Chatmode includes "What not to do" section
- Chatmode includes explicit pause points with formatted output templates
- Chatmode references correct artifact paths: `/docs/agents/<target_branch>/ImplementationPlan.md`
- Chatmode defines Phase PR creation workflow (branch naming, PR title format, description template)

### FR-7: Documenter Chatmode Creation
As a PAW system user, when I invoke the Implementation Review Agent (PAW-03B), then I SHALL receive a complete, tested-ready chatmode with all proven guidance patterns from HumanLayer-derived chatmodes.

**Specific Behaviors**:
- File `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` exists and contains > 200 lines
- Chatmode includes CRITICAL section with 8+ DO NOT items
- Chatmode includes numbered workflow with clear steps
- Chatmode includes 3+ IMPORTANT notes about tool usage, file reading, or handoff protocols
- Chatmode includes "What not to do" section
- Chatmode includes explicit pause points with formatted output templates
- Chatmode references correct artifact paths: `/docs/agents/<target_branch>/ImplementationPlan.md`
- Chatmode defines Phase PR creation workflow (branch naming, PR title format, description template)

### FR-7: Documenter Chatmode Creation
As a PAW system user, when I invoke the Documenter Agent (PAW-04), then I SHALL receive a complete chatmode that produces comprehensive documentation artifacts aligned with industry standards (ISO/IEC 26514).

**Specific Behaviors**:
- File `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-04 Documenter.chatmode.md` exists and contains > 200 lines
- Chatmode includes CRITICAL section with 8+ DO NOT items (e.g., "DO NOT suggest code changes", "DO NOT reimplement features")
- Chatmode includes numbered workflow for documentation generation
- Chatmode includes IMPORTANT notes about accuracy verification and consistency
- Chatmode defines output path: `/docs/agents/<target_branch>/Docs.md`
- Chatmode specifies documentation components: API reference, user guide, architectural overview, change summary
- Chatmode includes "What not to do" section emphasizing documentation-only role
- Chatmode includes pause point before opening Docs PR
- Chatmode references next stage: "Handoff to PR Agent (Stage 05)"
- Chatmode specifies YAML frontmatter template for `Docs.md` with fields: `date`, `target_branch`, `status`, `last_updated`, `summary` (one-sentence description), optional `tags` and `issue`

### FR-8: PR Agent Chatmode Creation
As a PAW system user, when I invoke the Documenter Agent (PAW-04), then I SHALL receive a complete chatmode that produces comprehensive documentation artifacts aligned with industry standards (ISO/IEC 26514).

**Specific Behaviors**:
- File `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-04 Documenter.chatmode.md` exists and contains > 200 lines
- Chatmode includes CRITICAL section with 8+ DO NOT items (e.g., "DO NOT suggest code changes", "DO NOT reimplement features")
- Chatmode includes numbered workflow for documentation generation
- Chatmode includes IMPORTANT notes about accuracy verification and consistency
- Chatmode defines output path: `/docs/agents/<target_branch>/Docs.md`
- Chatmode specifies documentation components: API reference, user guide, architectural overview, change summary
- Chatmode includes "What not to do" section emphasizing documentation-only role
- Chatmode includes pause point before opening Docs PR
- Chatmode references next stage: "Handoff to PR Agent (Stage 05)"

### FR-8: PR Agent Chatmode Creation
As a PAW system user, when I invoke the PR Agent (PAW-05), then I SHALL receive a complete chatmode that orchestrates final PR creation with comprehensive validation checks.

**Specific Behaviors**:
- File `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-05 PR.chatmode.md` exists and contains > 150 lines
- Chatmode includes CRITICAL section with 8+ DO NOT items (e.g., "DO NOT merge PRs", "DO NOT skip validation checks")
- Chatmode includes numbered workflow: validate all phase PRs merged, consolidate documentation, create final PR, add comprehensive description
- Chatmode includes IMPORTANT notes about PR description formatting and validation requirements
- Chatmode defines PR title format: `[Feature] <brief description>` based on target branch
- Chatmode defines PR description template sections: Overview, Changes Summary, Testing Notes, Documentation, References
- Chatmode includes validation checklist: all phase PRs merged, tests passing, docs updated, no merge conflicts
- Chatmode includes pause point after PR creation: "Final PR created - ready for human review"
- Chatmode explicitly states: "DO NOT merge the PR — human approval required"

### FR-9: Status Update Agent Alignment
As a Status Update Agent, when synchronizing workflow state with GitHub Issues and PRs, then I SHALL incorporate all proven HumanLayer guidance patterns to ensure accurate, non-intrusive status management.

**Specific Behaviors**:
- Chatmode includes CRITICAL section with 8+ DO NOT items (e.g., "DO NOT modify issue content", "DO NOT close issues without explicit instruction")
- Chatmode includes numbered workflow for status synchronization
- Chatmode includes 3+ IMPORTANT notes about comment formatting, label management, status validation
- Chatmode includes "What not to do" section
- Chatmode explicitly states it does NOT make code changes or perform implementation work
- Chatmode defines status comment templates for each workflow stage

### FR-10: Consistent Guidance Pattern Application
As a PAW system user, when I invoke the PR Agent (PAW-05), then I SHALL receive a complete chatmode that orchestrates final PR creation with comprehensive validation checks.

**Specific Behaviors**:
- File `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/PAW-05 PR.chatmode.md` exists and contains > 150 lines
- Chatmode includes CRITICAL section with 8+ DO NOT items (e.g., "DO NOT merge PRs", "DO NOT skip validation checks")
- Chatmode includes numbered workflow: validate all phase PRs merged, consolidate documentation, create final PR, add comprehensive description
- Chatmode includes IMPORTANT notes about PR description formatting and validation requirements
- Chatmode defines PR title format: `[Feature] <brief description>` based on target branch
- Chatmode defines PR description template sections: Overview, Changes Summary, Testing Notes, Documentation, References
- Chatmode includes validation checklist: all phase PRs merged, tests passing, docs updated, no merge conflicts
- Chatmode includes pause point after PR creation: "Final PR created - ready for human review"
- Chatmode explicitly states: "DO NOT merge the PR — human approval required"

### FR-10: Consistent Guidance Pattern Application
As a chatmode author, when creating or updating any PAW chatmode, then I SHALL apply all proven guidance patterns identified in HumanLayer-derived chatmodes (PAW-02A, PAW-03A).

**Specific Behaviors**:
- Each chatmode includes a CRITICAL section at or near the top defining core responsibilities
- Each chatmode includes 8-12 DO NOT items preventing common mistakes
- Each chatmode includes 3+ IMPORTANT or CRITICAL inline notes about tool usage, context management, or workflow discipline
- Each chatmode includes numbered workflow steps (5-10 steps) for primary execution path
- Each chatmode includes "What not to do" sections after major procedures
- Each chatmode includes conditional logic for different invocation scenarios (where applicable)
- Each chatmode includes explicit pause points with formatted output templates for human handoffs
- Each chatmode includes explicit role boundary statements (what the agent does NOT do)
- Each chatmode uses consistent formatting: CRITICAL in all caps, Important with **bold**, numbered lists with sub-bullets

### FR-11: Artifact Path Correctness
As a chatmode author, when creating or updating any PAW chatmode, then I SHALL apply all proven guidance patterns identified in HumanLayer-derived chatmodes (PAW-02A, PAW-03A).

**Specific Behaviors**:
- Each chatmode includes a CRITICAL section at or near the top defining core responsibilities
- Each chatmode includes 8-12 DO NOT items preventing common mistakes
- Each chatmode includes 3+ IMPORTANT or CRITICAL inline notes about tool usage, context management, or workflow discipline
- Each chatmode includes numbered workflow steps (5-10 steps) for primary execution path
- Each chatmode includes "What not to do" sections after major procedures
- Each chatmode includes conditional logic for different invocation scenarios (where applicable)
- Each chatmode includes explicit pause points with formatted output templates for human handoffs
- Each chatmode includes explicit role boundary statements (what the agent does NOT do)
- Each chatmode uses consistent formatting: CRITICAL in all caps, Important with **bold**, numbered lists with sub-bullets

### FR-11: Artifact Path Correctness
As any PAW agent, when reading or writing workflow artifacts, then I SHALL use paths conforming to the PAW specification: `/docs/agents/<target_branch>/` for documents and `/docs/agents/<target_branch>/prompts/` for prompt files.

**Specific Behaviors**:
- PAW-01A references: `docs/agents/<target_branch>/prompts/spec-research.prompt.md` (output), `docs/agents/<target_branch>/Spec.md` (output)
- PAW-01B references: `docs/agents/<target_branch>/prompts/spec-research.prompt.md` (input), `docs/agents/<target_branch>/SpecResearch.md` (output)
- PAW-02A references: `docs/agents/<target_branch>/SpecResearch.md` (input), `docs/agents/<target_branch>/prompts/code-research.prompt.md` (output), `docs/agents/<target_branch>/CodeResearch.md` (output)
- PAW-02B references: `docs/agents/<target_branch>/CodeResearch.md` (input), `docs/agents/<target_branch>/ImplementationPlan.md` (output)
- PAW-03A references: `docs/agents/<target_branch>/ImplementationPlan.md` (input)
- PAW-03B references: `docs/agents/<target_branch>/ImplementationPlan.md` (input), creates Phase PRs
- PAW-04 references: `docs/agents/<target_branch>/Spec.md`, `docs/agents/<target_branch>/ImplementationPlan.md`, all Phase PRs (inputs); `docs/agents/<target_branch>/Docs.md` (output)
- PAW-05 references: all Phase PRs, `docs/agents/<target_branch>/Docs.md` (inputs); creates final PR to main

### FR-12: Cross-Stage Handoff Clarity
As any PAW agent, when reading or writing workflow artifacts, then I SHALL use paths conforming to the PAW specification: `/docs/agents/<target_branch>/` for documents and `/docs/agents/<target_branch>/prompts/` for prompt files.

**Specific Behaviors**:
- PAW-02A references: `docs/agents/<target_branch>/SpecResearch.md` (input), `docs/agents/<target_branch>/prompts/code-research.prompt.md` (output), `docs/agents/<target_branch>/CodeResearch.md` (output)
- PAW-02B references: `docs/agents/<target_branch>/CodeResearch.md` (input), `docs/agents/<target_branch>/ImplementationPlan.md` (output)
- PAW-03A references: `docs/agents/<target_branch>/ImplementationPlan.md` (input)
- PAW-03B references: `docs/agents/<target_branch>/ImplementationPlan.md` (input), creates Phase PRs
- PAW-04 references: `docs/agents/<target_branch>/Spec.md`, `docs/agents/<target_branch>/ImplementationPlan.md`, all Phase PRs (inputs); `docs/agents/<target_branch>/Docs.md` (output)
- PAW-05 references: all Phase PRs, `docs/agents/<target_branch>/Docs.md` (inputs); creates final PR to main

### FR-12: YAML Frontmatter for Artifacts
As any PAW agent producing non-prompt artifacts (Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md), when writing these documents, then I SHALL include standardized YAML frontmatter at the top of each file for metadata tracking and document identification.

**Specific Behaviors**:
- All non-prompt artifact files include YAML frontmatter delimited by `---`
- Frontmatter includes required fields: `date` (ISO 8601 with timezone), `target_branch`, `status`, `last_updated` (YYYY-MM-DD), `summary` (one-sentence description)
- Frontmatter may include optional fields: `tags` (array), `issue` (Issue number)
- Status values align with workflow stage: `draft`, `in-review`, `approved`, `complete`
- Summary provides human-readable context for quick document identification when browsing artifacts
- Format example:
  ```yaml
  ---
  date: 2025-10-11T14:23:45-07:00
  target_branch: feature/finalize-initial-chatmodes
  status: complete
  last_updated: 2025-10-11
  summary: "Specification for aligning all PAW chatmodes with proven HumanLayer patterns"
  tags: [specification, chatmodes, alignment]
  issue: 1
  ---
  ```

### FR-13: Cross-Stage Handoff Clarity
As any PAW agent, when completing my stage, then I SHALL explicitly state the next stage and agent in my final output, providing the human user with clear instructions for workflow continuation.

**Specific Behaviors**:
- PAW-01A final output includes: "Next: Invoke Implementation Plan Agent (Stage 02). Optionally run Status Agent to update Issue."
- PAW-01B final output includes: "Return to Spec Agent with this research."
- PAW-02A final output includes: "Next: Invoke Implementation Plan Agent (PAW-02B)."
- PAW-02B final output includes: "Next: Invoke Implementation Agent (PAW-03A) for Phase [N]."
- PAW-03A final output includes: "Phase [N] Complete - Handoff to Implementation Review Agent (PAW-03B)."
- PAW-03B final output includes: "Phase [N] PR created. Next: Continue with Implementation Agent (PAW-03A) for Phase [N+1] or proceed to Documenter Agent (PAW-04) if all phases complete."
- PAW-04 final output includes: "Docs PR created. Next: Invoke PR Agent (PAW-05) to create final PR."
- PAW-05 final output includes: "Final PR created. Ready for human review and merge."
- PAW-X describes when it should be invoked (optionally at stage transitions to update Issue status)
As any PAW agent, when completing my stage, then I SHALL explicitly state the next stage and agent in my final output, providing the human user with clear instructions for workflow continuation.

**Specific Behaviors**:
- PAW-01A final output includes: "Next: Invoke Implementation Plan Agent (Stage 02). Optionally run Status Agent to update Issue."
- PAW-01B final output includes: "Return to Spec Agent with this research."
- PAW-02A final output includes: "Next: Invoke Implementation Plan Agent (PAW-02B)."
- PAW-02B final output includes: "Next: Invoke Implementation Agent (PAW-03A) for Phase [N]."
- PAW-03A final output includes: "Phase [N] Complete - Handoff to Implementation Review Agent (PAW-03B)."
- PAW-03B final output includes: "Phase [N] PR created. Next: Continue with Implementation Agent (PAW-03A) for Phase [N+1] or proceed to Documenter Agent (PAW-04) if all phases complete."
- PAW-04 final output includes: "Docs PR created. Next: Invoke PR Agent (PAW-05) to create final PR."
- PAW-05 final output includes: "Final PR created. Ready for human review and merge."

## Non-Functional Requirements

### NFR-1: Maintainability
- Each chatmode is structured with clear section headings
- Guidance patterns are consistent across all chatmodes (same terminology, same formatting conventions)
- Changes to proven patterns (from HumanLayer-derived chatmodes) are explicitly justified in comments or documentation

### NFR-2: Clarity
- Each chatmode can be understood by a developer unfamiliar with PAW in < 10 minutes of reading
- DO NOT lists use specific, actionable language (not vague prohibitions)
- Workflows use imperative verbs and avoid ambiguous language ("might", "should consider", "could")

### NFR-3: Completeness
- No chatmode contains TODO, TBD, or placeholder text
- All referenced scripts, files, or commands are either: (a) existing and functional, or (b) clearly marked as "to be created separately"
- Each chatmode addresses error handling (what to do if a file doesn't exist, a command fails, or research is incomplete)

### NFR-4: Consistency with PAW Specification
- No chatmode contradicts the workflow stages, artifact locations, or agent responsibilities defined in `/home/rob/proj/paw/phased-agent-workflow/paw-specification.md`
- Branch naming conventions match specification: `feature/<slug>`, `<target_branch>_plan`, `<target_branch>_phase<N>`
- Artifact naming conventions match specification: `Spec.md`, `SpecResearch.md`, `CodeResearch.md`, `ImplementationPlan.md`, `Docs.md`

### NFR-5: Preservation of Proven Patterns
- Zero DO NOT items from PAW-02A or PAW-03A are removed unless explicitly justified
- Zero IMPORTANT/CRITICAL notes from PAW-02A or PAW-03A are removed unless explicitly justified
- Numbered workflow steps from PAW-02A or PAW-03A are retained in updated versions
- Any removal or modification of proven patterns is documented in the chatmode with a comment explaining the rationale

## Data / Schema (Behavioral Description)

### Chatmode File Entities

**Chatmode File**:
- Path: `.github/chatmodes/PAW-<stage><letter> <name>.chatmode.md`
- Format: Markdown with structured sections
- Required Sections: CRITICAL (responsibilities), Workflow (numbered steps), DO NOT list, IMPORTANT notes, Handoff instructions
- Optional Sections: Conditional logic blocks, What not to do, Error handling, Examples

**Guidance Pattern Types**:
- **CRITICAL Section**: All-caps header, bullet list of core responsibilities and prohibitions (8-12 items)
- **IMPORTANT Note**: Inline **bold** prefix, specific instruction about tool usage or workflow discipline
- **Numbered Workflow**: Sequential steps (1, 2, 3...) with sub-bullets (a, b, c...) for details
- **Pause Point**: Formatted block with template output, explicit "wait for human" instruction
- **Handoff Statement**: Final sentence or paragraph directing user to next agent/stage

### Artifact References

Each chatmode must correctly reference:
- **Input artifacts**: Files read at workflow start (e.g., `SpecResearch.md`, `ImplementationPlan.md`)
- **Output artifacts**: Files written during workflow (e.g., `CodeResearch.md`, `Docs.md`)
- **Prompt files**: Prompt templates written for sub-agents (e.g., `prompts/code-research.prompt.md`)

## Acceptance Criteria

### AC-1: Spec Agent Alignment (FR-1)
- [ ] PAW-01A chatmode includes CRITICAL section with 8+ DO NOT items
- [ ] PAW-01A chatmode includes numbered workflow (currently detailed, ensure all proven patterns applied)
- [ ] PAW-01A chatmode includes 3+ IMPORTANT notes about research pausing, external knowledge integration, quality standards
- [ ] PAW-01A chatmode includes "What not to do" section
- [ ] PAW-01A chatmode includes explicit pause points (after research prompt generation, before final spec)
- [ ] PAW-01A chatmode includes DO NOT item: "DO NOT commit, push, open PRs, or update Issues"
- [ ] PAW-01A chatmode preserves existing template and quality bar sections
- [ ] PAW-01A chatmode specifies YAML frontmatter template for `Spec.md` including fields: `date`, `target_branch`, `status`, `last_updated`, `summary`
- [ ] Manual review confirms: chatmode aligns with proven HumanLayer patterns

### AC-2: Spec Research Agent Alignment (FR-2)
- [ ] PAW-01B chatmode includes CRITICAL section with 8+ DO NOT items
- [ ] PAW-01B chatmode includes numbered workflow for research execution
- [ ] PAW-01B chatmode includes 3+ IMPORTANT notes about file reading discipline, citation requirements
- [ ] PAW-01B chatmode includes "What not to do" section
- [ ] PAW-01B chatmode preserves internal vs external knowledge separation
- [ ] PAW-01B chatmode references correct output path: `docs/agents/<target_branch>/SpecResearch.md`
- [ ] PAW-01B chatmode specifies YAML frontmatter template for `SpecResearch.md` including fields: `date`, `target_branch`, `status`, `last_updated`, `summary`
- [ ] Manual review confirms: chatmode aligns with proven HumanLayer patterns

### AC-3: Code Researcher Refactor (FR-3)
- [ ] PAW-02A chatmode contains explicit guidance: "Focus on behavioral descriptions and architectural patterns; cite file paths for key components but avoid exhaustive line-number listings"
- [ ] PAW-02A chatmode retains all existing DO NOT items (count: 10 in current version)
- [ ] PAW-02A chatmode retains all existing IMPORTANT/CRITICAL notes (count: 5+ in current version)
- [ ] PAW-02A chatmode retains numbered workflow structure (9 main steps in current version)
- [ ] PAW-02A chatmode includes "What not to do" section after research strategies
- [ ] PAW-02A chatmode preserves existing YAML frontmatter template (currently has proper structure)
- [ ] Manual review confirms: no proven guidance removed without justification

### AC-4: Implementation Planner Alignment (FR-4)
- [ ] PAW-02B chatmode includes CRITICAL section with 8+ DO NOT items
- [ ] PAW-02B chatmode includes numbered workflow for plan creation
- [ ] PAW-02B chatmode includes 3+ IMPORTANT notes about phase sizing, dependency management, verification
- [ ] PAW-02B chatmode includes "What not to do" section
- [ ] PAW-02B chatmode includes pause point before creating Planning PR
- [ ] PAW-02B chatmode references correct paths: `docs/agents/<target_branch>/CodeResearch.md` (input), `docs/agents/<target_branch>/ImplementationPlan.md` (output)
- [ ] PAW-02B chatmode defines Planning PR workflow (branch: `<target_branch>_plan`)
- [ ] PAW-02B chatmode specifies YAML frontmatter template for `ImplementationPlan.md` including fields: `date`, `target_branch`, `status`, `last_updated`, `summary`
- [ ] Manual review confirms: chatmode aligns with proven HumanLayer patterns

### AC-5: Implementer Split Alignment (FR-5)
- [ ] PAW-02A chatmode contains explicit guidance: "Focus on behavioral descriptions and architectural patterns; cite file paths for key components but avoid exhaustive line-number listings"
- [ ] PAW-02A chatmode retains all existing DO NOT items (count: 10 in current version)
- [ ] PAW-02A chatmode retains all existing IMPORTANT/CRITICAL notes (count: 5+ in current version)
- [ ] PAW-02A chatmode retains numbered workflow structure (9 main steps in current version)
- [ ] PAW-02A chatmode includes "What not to do" section after research strategies
- [ ] Manual review confirms: no proven guidance removed without justification

### AC-5: Implementer Split Alignment (FR-5)
- [ ] PAW-03A chatmode includes DO NOT item: "DO NOT generate docstrings or code comments — Implementation Review Agent handles that"
- [ ] PAW-03A chatmode includes DO NOT item: "DO NOT open Phase PRs — Implementation Review Agent handles that"
- [ ] PAW-03A workflow ends with: "Phase [N] Complete - Handoff to Implementation Review Agent (PAW-03B)"
- [ ] PAW-03A chatmode retains all existing proven guidance (DO NOTs, IMPORTANT notes, conditional logic, pause points from current version)
- [ ] Manual review confirms: role boundaries between 03A and 03B are unambiguous

### AC-6: Implementation Review Chatmode (FR-6)
- [ ] PAW-03A chatmode includes DO NOT item: "DO NOT generate docstrings or code comments — Implementation Review Agent handles that"
- [ ] PAW-03A chatmode includes DO NOT item: "DO NOT open Phase PRs — Implementation Review Agent handles that"
- [ ] PAW-03A workflow ends with: "Phase [N] Complete - Handoff to Implementation Review Agent (PAW-03B)"
- [ ] PAW-03A chatmode retains all existing proven guidance (DO NOTs, IMPORTANT notes, conditional logic, pause points from current version)
- [ ] Manual review confirms: role boundaries between 03A and 03B are unambiguous

### AC-6: Implementation Review Chatmode (FR-6)
- [ ] File `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` exists
- [ ] PAW-03B chatmode contains > 200 lines
- [ ] PAW-03B chatmode includes CRITICAL section with 8+ DO NOT items
- [ ] PAW-03B chatmode includes numbered workflow (5+ steps)
- [ ] PAW-03B chatmode includes 3+ IMPORTANT notes
- [ ] PAW-03B chatmode includes "What not to do" section
- [ ] PAW-03B chatmode includes pause point before opening Phase PR
- [ ] PAW-03B chatmode references artifact path: `docs/agents/<target_branch>/ImplementationPlan.md`
- [ ] PAW-03B chatmode defines Phase PR creation workflow (branch naming: `<target_branch>_phase<N>`)
- [ ] PAW-03B chatmode includes conditional logic: "When invoked post-implementation" vs "When responding to PR review comments"

### AC-7: Documenter Chatmode (FR-7)
- [ ] File `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` exists
- [ ] PAW-03B chatmode contains > 200 lines
- [ ] PAW-03B chatmode includes CRITICAL section with 8+ DO NOT items
- [ ] PAW-03B chatmode includes numbered workflow (5+ steps)
- [ ] PAW-03B chatmode includes 3+ IMPORTANT notes
- [ ] PAW-03B chatmode includes "What not to do" section
- [ ] PAW-03B chatmode includes pause point before opening Phase PR
- [ ] PAW-03B chatmode references artifact path: `docs/agents/<target_branch>/ImplementationPlan.md`
- [ ] PAW-03B chatmode defines Phase PR creation workflow (branch naming: `<target_branch>_phase<N>`)
- [ ] PAW-03B chatmode includes conditional logic: "When invoked post-implementation" vs "When responding to PR review comments"

### AC-7: Documenter Chatmode (FR-7)
- [ ] File `.github/chatmodes/PAW-04 Documenter.chatmode.md` exists
- [ ] PAW-04 chatmode contains > 200 lines
- [ ] PAW-04 chatmode includes CRITICAL section with 8+ DO NOT items
- [ ] PAW-04 chatmode includes numbered workflow (5+ steps)
- [ ] PAW-04 chatmode includes 3+ IMPORTANT notes
- [ ] PAW-04 chatmode includes "What not to do" section
- [ ] PAW-04 chatmode defines output path: `docs/agents/<target_branch>/Docs.md`
- [ ] PAW-04 chatmode specifies documentation components: API reference, user guide, architectural overview, change summary
- [ ] PAW-04 chatmode includes pause point before opening Docs PR
- [ ] PAW-04 chatmode includes handoff statement: "Next: Invoke PR Agent (PAW-05)"
- [ ] PAW-04 chatmode specifies YAML frontmatter template for `Docs.md` including fields: `date`, `target_branch`, `status`, `last_updated`, `summary`

### AC-8: PR Agent Chatmode (FR-8)
- [ ] File `.github/chatmodes/PAW-04 Documenter.chatmode.md` exists
- [ ] PAW-04 chatmode contains > 200 lines
- [ ] PAW-04 chatmode includes CRITICAL section with 8+ DO NOT items
- [ ] PAW-04 chatmode includes numbered workflow (5+ steps)
- [ ] PAW-04 chatmode includes 3+ IMPORTANT notes
- [ ] PAW-04 chatmode includes "What not to do" section
- [ ] PAW-04 chatmode defines output path: `docs/agents/<target_branch>/Docs.md`
- [ ] PAW-04 chatmode specifies documentation components: API reference, user guide, architectural overview, change summary
- [ ] PAW-04 chatmode includes pause point before opening Docs PR
- [ ] PAW-04 chatmode includes handoff statement: "Next: Invoke PR Agent (PAW-05)"

### AC-8: PR Agent Chatmode (FR-8)
- [ ] File `.github/chatmodes/PAW-05 PR.chatmode.md` exists
- [ ] PAW-05 chatmode contains > 150 lines
- [ ] PAW-05 chatmode includes CRITICAL section with 8+ DO NOT items
- [ ] PAW-05 chatmode includes numbered workflow (5+ steps)
- [ ] PAW-05 chatmode includes 3+ IMPORTANT notes
- [ ] PAW-05 chatmode defines PR title format based on target branch
- [ ] PAW-05 chatmode defines PR description template with sections: Overview, Changes Summary, Testing Notes, Documentation, References
- [ ] PAW-05 chatmode includes validation checklist: all phase PRs merged, tests passing, docs updated, no merge conflicts
- [ ] PAW-05 chatmode includes pause point after PR creation
- [ ] PAW-05 chatmode includes DO NOT item: "DO NOT merge the PR — human approval required"

### AC-9: Status Update Agent Alignment (FR-9)
- [ ] PAW-X chatmode includes CRITICAL section with 8+ DO NOT items
- [ ] PAW-X chatmode includes numbered workflow for status synchronization
- [ ] PAW-X chatmode includes 3+ IMPORTANT notes about comment formatting, label management
- [ ] PAW-X chatmode includes "What not to do" section
- [ ] PAW-X chatmode explicitly states: "DO NOT make code changes or perform implementation work"
- [ ] PAW-X chatmode defines status comment templates for each workflow stage
- [ ] Manual review confirms: chatmode aligns with proven HumanLayer patterns

### AC-10: Guidance Pattern Consistency (FR-10)
- [ ] All 9 chatmodes (PAW-01A, PAW-01B, PAW-02A, PAW-02B, PAW-03A, PAW-03B, PAW-04, PAW-05, PAW-X) include CRITICAL section
- [ ] All 9 chatmodes include 8+ DO NOT items
- [ ] All 9 chatmodes include 3+ IMPORTANT/CRITICAL inline notes
- [ ] All 9 chatmodes include numbered workflows
- [ ] All 9 chatmodes include "What not to do" or equivalent prohibitive guidance section
- [ ] All 9 chatmodes include explicit pause points for human handoffs (where applicable)
- [ ] All 9 chatmodes use consistent formatting: CRITICAL (all caps), Important (**bold**), numbered lists

### AC-11: Artifact Path Correctness (FR-11)
- [ ] PAW-01A references correct paths: `docs/agents/<target_branch>/prompts/spec-research.prompt.md`, `docs/agents/<target_branch>/Spec.md`
- [ ] PAW-01B references correct paths: `docs/agents/<target_branch>/prompts/spec-research.prompt.md`, `docs/agents/<target_branch>/SpecResearch.md`
- [ ] PAW-02A references correct paths: `docs/agents/<target_branch>/SpecResearch.md`, `docs/agents/<target_branch>/prompts/code-research.prompt.md`, `docs/agents/<target_branch>/CodeResearch.md`
- [ ] PAW-02B references correct paths: `docs/agents/<target_branch>/CodeResearch.md`, `docs/agents/<target_branch>/ImplementationPlan.md`
- [ ] PAW-03A references correct path: `docs/agents/<target_branch>/ImplementationPlan.md`
- [ ] PAW-03B references correct path: `docs/agents/<target_branch>/ImplementationPlan.md`
- [ ] PAW-04 references correct paths: `docs/agents/<target_branch>/Spec.md`, `docs/agents/<target_branch>/ImplementationPlan.md`, `docs/agents/<target_branch>/Docs.md`
- [ ] PAW-05 references correct path: `docs/agents/<target_branch>/Docs.md`

### AC-12: Cross-Stage Handoff Clarity (FR-13)
- [ ] PAW-01A final output template includes: "Next: Invoke Implementation Plan Agent (Stage 02)"
- [ ] PAW-01B final output template includes: "Return to Spec Agent with this research"
- [ ] PAW-02A final output template includes: "Next: Invoke Implementation Plan Agent (PAW-02B)"
- [ ] PAW-02B final output template includes: "Next: Invoke Implementation Agent (PAW-03A) for Phase [N]"
- [ ] PAW-03A final output template includes: "Handoff to Implementation Review Agent (PAW-03B)"
- [ ] PAW-03B final output template includes conditional: "Next phase" or "Proceed to Documenter Agent (PAW-04)"
- [ ] PAW-04 final output template includes: "Next: Invoke PR Agent (PAW-05)"
- [ ] PAW-05 final output template includes: "Final PR created. Ready for human review and merge"
- [ ] PAW-X describes when it should be invoked (stage transitions)

### AC-13: YAML Frontmatter for Artifacts (FR-12)
- [ ] PAW-01A chatmode specifies YAML frontmatter template for `Spec.md` with required fields: `date`, `target_branch`, `status`, `last_updated`, `summary`
- [ ] PAW-01B chatmode specifies YAML frontmatter template for `SpecResearch.md` with required fields
- [ ] PAW-02A chatmode specifies YAML frontmatter template for `CodeResearch.md` with required fields
- [ ] PAW-02B chatmode specifies YAML frontmatter template for `ImplementationPlan.md` with required fields
- [ ] PAW-04 chatmode specifies YAML frontmatter template for `Docs.md` with required fields
- [ ] All frontmatter templates exclude `git_commit` and `repository` fields (unlike Code Researcher pattern)
- [ ] All frontmatter templates use `summary` field instead of `topic` field
- [ ] Frontmatter format example included in each relevant chatmode showing proper YAML structure
- [ ] Status field values are defined: `draft`, `in-review`, `approved`, `complete`

### AC-14: Preservation of Proven Patterns (NFR-5)
- [ ] Manual review of PAW-02A diff confirms: zero DO NOT items removed
- [ ] Manual review of PAW-02A diff confirms: zero IMPORTANT/CRITICAL notes removed
- [ ] Manual review of PAW-03A diff confirms: zero DO NOT items removed
- [ ] Manual review of PAW-03A diff confirms: zero IMPORTANT/CRITICAL notes removed
- [ ] Manual review of PAW-03A diff confirms: numbered workflow structure preserved
- [ ] Any modifications to proven patterns include inline comment explaining rationale

### AC-15: Completeness (NFR-3)
- [ ] File `.github/chatmodes/PAW-05 PR.chatmode.md` exists
- [ ] PAW-05 chatmode contains > 150 lines
- [ ] PAW-05 chatmode includes CRITICAL section with 8+ DO NOT items
- [ ] PAW-05 chatmode includes numbered workflow (5+ steps)
- [ ] PAW-05 chatmode includes 3+ IMPORTANT notes
- [ ] PAW-05 chatmode defines PR title format based on target branch
- [ ] PAW-05 chatmode defines PR description template with sections: Overview, Changes Summary, Testing Notes, Documentation, References
- [ ] PAW-05 chatmode includes validation checklist: all phase PRs merged, tests passing, docs updated, no merge conflicts
- [ ] PAW-05 chatmode includes pause point after PR creation
- [ ] PAW-05 chatmode includes DO NOT item: "DO NOT merge the PR — human approval required"

### AC-6: Guidance Pattern Consistency (FR-6)
- [ ] All 5 updated/created chatmodes (PAW-02A, PAW-03A, PAW-03B, PAW-04, PAW-05) include CRITICAL section
- [ ] All 5 chatmodes include 8+ DO NOT items
- [ ] All 5 chatmodes include 3+ IMPORTANT/CRITICAL inline notes
- [ ] All 5 chatmodes include numbered workflows
- [ ] All 5 chatmodes include "What not to do" or equivalent prohibitive guidance section
- [ ] All 5 chatmodes include explicit pause points for human handoffs
- [ ] All 5 chatmodes use consistent formatting: CRITICAL (all caps), Important (**bold**), numbered lists

### AC-7: Artifact Path Correctness (FR-7)
- [ ] PAW-02A references correct paths: `docs/agents/<target_branch>/SpecResearch.md`, `docs/agents/<target_branch>/prompts/code-research.prompt.md`, `docs/agents/<target_branch>/CodeResearch.md`
- [ ] PAW-02B references correct paths: `docs/agents/<target_branch>/CodeResearch.md`, `docs/agents/<target_branch>/ImplementationPlan.md`
- [ ] PAW-03A references correct path: `docs/agents/<target_branch>/ImplementationPlan.md`
- [ ] PAW-03B references correct path: `docs/agents/<target_branch>/ImplementationPlan.md`
- [ ] PAW-04 references correct paths: `docs/agents/<target_branch>/Spec.md`, `docs/agents/<target_branch>/ImplementationPlan.md`, `docs/agents/<target_branch>/Docs.md`
- [ ] PAW-05 references correct path: `docs/agents/<target_branch>/Docs.md`

### AC-8: Cross-Stage Handoff Clarity (FR-8)
- [ ] PAW-02A final output template includes: "Next: Invoke Implementation Plan Agent (PAW-02B)"
- [ ] PAW-02B final output template includes: "Next: Invoke Implementation Agent (PAW-03A) for Phase [N]"
- [ ] PAW-03A final output template includes: "Handoff to Implementation Review Agent (PAW-03B)"
- [ ] PAW-03B final output template includes conditional: "Next phase" or "Proceed to Documenter Agent (PAW-04)"
- [ ] PAW-04 final output template includes: "Next: Invoke PR Agent (PAW-05)"
- [ ] PAW-05 final output template includes: "Final PR created. Ready for human review and merge."

### AC-13: Preservation of Proven Patterns (NFR-5)
- [ ] Manual review of PAW-02A diff confirms: zero DO NOT items removed
- [ ] Manual review of PAW-02A diff confirms: zero IMPORTANT/CRITICAL notes removed
- [ ] Manual review of PAW-03A diff confirms: zero DO NOT items removed
- [ ] Manual review of PAW-03A diff confirms: zero IMPORTANT/CRITICAL notes removed
- [ ] Manual review of PAW-03A diff confirms: numbered workflow structure preserved
- [ ] Any modifications to proven patterns include inline comment explaining rationale

### AC-14: Completeness (NFR-3)
- [ ] Manual review of PAW-02A diff confirms: zero DO NOT items removed
- [ ] Manual review of PAW-02A diff confirms: zero IMPORTANT/CRITICAL notes removed
- [ ] Manual review of PAW-03A diff confirms: zero DO NOT items removed
- [ ] Manual review of PAW-03A diff confirms: zero IMPORTANT/CRITICAL notes removed
- [ ] Manual review of PAW-03A diff confirms: numbered workflow structure preserved
- [ ] Any modifications to proven patterns include inline comment explaining rationale

### AC-15: Completeness (NFR-3)
- [ ] Zero chatmodes contain "TODO", "TBD", or "[placeholder]" text
- [ ] All referenced scripts/commands either exist or are marked "to be created separately"
- [ ] All 9 chatmodes include error handling guidance (what to do if inputs missing or commands fail)

## Risks & Constraints

### Risks

**R-1: Unintended Removal of Critical Guidance**
- Risk: During refactoring, subtle but important guidance from HumanLayer chatmodes is accidentally removed
- Mitigation: Line-by-line comparison of before/after versions; manual review checklist; preserve original versions in git history

**R-2: Code Researcher Over-Simplification**
- Risk: Removing line-number emphasis makes research too vague for implementation planning
- Mitigation: Retain file path citations and key entry point references; emphasize "WHERE the code lives" even if not "every line"

**R-3: Implementer/Reviewer Boundary Confusion**
- Risk: Unclear role split causes agents to duplicate work or leave gaps
- Mitigation: Explicit DO NOT items in both chatmodes; clear handoff statements; model-specific rationale documented

**R-4: Chatmode Length and Complexity**
- Risk: Longer, more detailed chatmodes may hit token limits or reduce effectiveness
- Mitigation: Industry research shows detailed system prompts improve consistency (PromptLayer, 2024); prioritize clarity over brevity; remove only truly redundant content

### Constraints

**C-1: No PAW Specification Changes**
- Chatmodes must align to the current PAW specification; any discovered misalignment in the spec itself is out of scope

**C-2: Preserve HumanLayer Patterns**
- DO NOT items, IMPORTANT notes, and numbered workflows from PAW-02A and PAW-03A must be retained unless explicitly justified

**C-3: No Testing Infrastructure**
- This work produces chatmode files; actual testing in production workflows is a separate effort

**C-4: Model Availability**
- Chatmodes reference specific models (GPT Codex, Claude Sonnet 4.5) but cannot enforce model selection at runtime

## References

- **GitHub Issue**: [#1 - Finalize initial agent chatmodes](https://github.com/lossyrob/phased-agent-workflow/issues/1)
- **Target Branch**: `feature/finalize-initial-chatmodes`
- **PAW Specification**: `/home/rob/proj/paw/phased-agent-workflow/paw-specification.md`
- **Spec Research**: `/home/rob/proj/paw/phased-agent-workflow/docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md`
- **External Research Sources**: 21 cited sources in SpecResearch.md covering prompt engineering best practices (PromptHub, God of Prompt, Forbes), system prompt design (PromptLayer, Microsoft), hallucination prevention (yW!an, OpenAI), multi-agent workflows (Strands Agents, Microsoft), documentation standards (Guidde, DataCalculus), and code review best practices (Graphite)
- **Current Chatmode Files**:
  - `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` (first-pass, needs alignment with proven patterns)
  - `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md` (first-pass, needs alignment with proven patterns)
  - `.github/chatmodes/PAW-02A Code Researcher.chatmode.md` (HumanLayer-derived, proven)
  - `.github/chatmodes/PAW-02B Impl Planner.chatmode.md` (first-pass, needs alignment with proven patterns)
  - `.github/chatmodes/PAW-03A Implementer.chatmode.md` (HumanLayer-derived, proven, needs split alignment)
  - `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md` (empty, needs creation)
  - `.github/chatmodes/PAW-04 Documenter.chatmode.md` (empty, needs creation)
  - `.github/chatmodes/PAW-05 PR.chatmode.md` (empty, needs creation)
  - `.github/chatmodes/PAW-X Status Update.chatmode.md` (first-pass, needs alignment with proven patterns)

---

## Specification Readiness Checklist

- [x] All requirements are observable and testable (no vague adjectives)
- [x] Each acceptance criterion ties to at least one functional requirement
- [x] No open questions, TBDs, or speculative language
- [x] Scope boundaries clearly prevent creep
- [x] External considerations explicitly referenced in References section
- [x] Implementation details (specific file editing) excluded from requirements
- [x] SpecResearch.md integrated (version: 2025-10-11)
- [x] All research questions answered (internal + external)

---

**Ready for Planning Stage**

Artifacts:
- [x] `Spec.md` (this document)
- [x] `prompts/spec-research.prompt.md` (existing)
- [x] `SpecResearch.md` (existing, integrated)

**Next Steps**: Invoke Implementation Plan Agent (Stage 02) to create CodeResearch and ImplementationPlan. Optionally invoke Status Agent to update GitHub Issue #1.
