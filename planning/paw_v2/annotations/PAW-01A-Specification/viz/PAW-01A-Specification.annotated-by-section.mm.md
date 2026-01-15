# PAW 01A Specification.annotated

## (preamble)
- agent-identity: You convert a rough Issue / feature...
  - mission-statement: Convert rough Issue/feature brief →...

## Agent Notes (if any)
- Context: 1. ... 1. ... ``` Constraints:
  - artifact-format: Use this exact minimal structure; r... `[phase-bound]`
  - quality-gate: Use this during validation (auto-ge... `[phase-bound]`
  - quality-gate: - No unresolved clarification quest... `[phase-bound]`
  - communication-pattern: - When pausing for research, clearl... `[reusable]`
    - decision-framework: - When implementation details arise... `[reusable]`
  - decision-framework: - If `SpecResearch.md` content cont... `[reusable]`
    - example: ``` Discrepancy Detected: Issue sta...
  - guardrail: - ALWAYS: Check for existing `SpecR... `[reusable]`
  - guardrail: - NEVER: Fabricate answers not supp... `[reusable]`
  - guardrail: - NEVER: Silently assume critical e... `[reusable]`
  - guardrail: - NEVER: Reintroduce removed prompt... `[phase-bound]`
  - guardrail: - ALWAYS: Differentiate *requiremen... `[reusable]`
  - guardrail: - ALWAYS: Pause after writing resea... `[workflow]`
  - guardrail: - ALWAYS: Surface if external resea... `[reusable]`
  - guardrail: - ALWAYS: Ensure minimal format hea... `[phase-bound]`
  - guardrail: - ALWAYS: Use implementation discus... `[reusable]`
  - guardrail: - ALWAYS: Respect user autonomy—if ... `[reusable]`
  - guardrail: - When updating artifacts, modify o... `[reusable]`
  - handoff-instruction `[phase-bound]`
    - artifact-format: ``` Specification Ready for Plannin... `[phase-bound]`
  - context-requirement: {{HANDOFF_INSTRUCTIONS}} `[workflow]`
  - handoff-instruction: Conditional next stage based on wor... `[workflow]`
    - classification-logic: If spec research prompt was generat... `[workflow]`
      - example: Example handoff message: ``` Specif...
      - example: Example handoff message: ``` Specif...
  - guardrail: - For GitHub: ALWAYS use the github... `[reusable]`
  - agent-identity: Operate with rigor: Behavioral clar...

## Communication Patterns
### decision-framework (2)
- decision-framework: - When implementation details arise... `[reusable]`
- decision-framework: - If `SpecResearch.md` content cont... `[reusable]`
  - example: ``` Discrepancy Detected: Issue sta...

## Core Principles & Guardrails
### guardrail (10)
- guardrail: 1. User value focus: Describe WHAT ... `[phase-bound]`
- guardrail: 2. Independently testable stories: ... `[phase-bound]`
- guardrail: 3. Resolve before drafting: Clarifi... `[reusable]`
- guardrail: 4. Enumerated traceability: Use IDs... `[phase-bound]`
- guardrail: 5. Research vs design: Research doc... `[phase-bound]`
- guardrail: 6. Explicit assumptions: Replace lo... `[reusable]`
- guardrail: 7. Measurable & tech-agnostic: Succ... `[phase-bound]`
- guardrail: 8. Scope & risk: Maintain explicit ... `[phase-bound]`
- guardrail: 9. No speculation: Every feature mu... `[reusable]`
- guardrail: > You DO NOT commit, push, open PRs... `[workflow]`
- decision-framework: Optional external/context questions... `[phase-bound]`
- workflow
  - workflow-step: After calling `paw_get_context` (se...
    - classification-logic: - Check for existing `SpecResearch.... `[phase-bound]`
  - decision-framework: Adapt behavior based on Workflow Mo... `[workflow]`

## Drafting Workflow (Detailed Steps)
### workflow-step (9)
- workflow-step: 1. Intake & Decomposition: Read the...
- workflow-step: 2. User Story Drafting: Derive init...
- workflow-step: 3. Unknown Classification:
  - classification-logic: - Apply reasonable defaults (drawn ... `[reusable]`
- workflow-step: 4. Research Prompt Generation: Crea...
- workflow-step: 5. Handoff: Instruct user to run Sp...
- workflow-step: 6. Integrate Research: Map each res...
- workflow-step: 7. Specification Assembly: Iterativ...
  - artifact-format: - Overview: Write 2-4 paragraphs (3... `[phase-bound]`
- workflow-step: 8. Quality Checklist Pass: Evaluate...
- workflow-step: 9. Finalize & Hand‑Off: Present fin...
- classification-logic: - Apply reasonable defaults (drawn ... `[reusable]`
### artifact-format (2)
- artifact-format: - Overview: Write 2-4 paragraphs (3... `[phase-bound]`
- artifact-format: Required header & format: ``` --- a... `[phase-bound]`
  - Context: 1. ... 1. ... ``` Constraints:
    - artifact-format: Use this exact minimal structure; r... `[phase-bound]`
    - quality-gate: Use this during validation (auto-ge... `[phase-bound]`
    - quality-gate: - No unresolved clarification quest... `[phase-bound]`
    - communication-pattern: - When pausing for research, clearl... `[reusable]`
      - decision-framework: - When implementation details arise... `[reusable]`
    - decision-framework: - If `SpecResearch.md` content cont... `[reusable]`
      - example: ``` Discrepancy Detected: Issue sta...
    - guardrail: - ALWAYS: Check for existing `SpecR... `[reusable]`
    - guardrail: - NEVER: Fabricate answers not supp... `[reusable]`
    - guardrail: - NEVER: Silently assume critical e... `[reusable]`
    - guardrail: - NEVER: Reintroduce removed prompt... `[phase-bound]`
    - guardrail: - ALWAYS: Differentiate *requiremen... `[reusable]`
    - guardrail: - ALWAYS: Pause after writing resea... `[workflow]`
    - guardrail: - ALWAYS: Surface if external resea... `[reusable]`
    - guardrail: - ALWAYS: Ensure minimal format hea... `[phase-bound]`
    - guardrail: - ALWAYS: Use implementation discus... `[reusable]`
    - guardrail: - ALWAYS: Respect user autonomy—if ... `[reusable]`
    - guardrail: - When updating artifacts, modify o... `[reusable]`
    - handoff-instruction `[phase-bound]`
      - artifact-format: ``` Specification Ready for Plannin... `[phase-bound]`
    - context-requirement: {{HANDOFF_INSTRUCTIONS}} `[workflow]`
    - handoff-instruction: Conditional next stage based on wor... `[workflow]`
      - classification-logic: If spec research prompt was generat... `[workflow]`
        - example: Example handoff message: ``` Specif...
        - example: Example handoff message: ``` Specif...
    - guardrail: - For GitHub: ALWAYS use the github... `[reusable]`
    - agent-identity: Operate with rigor: Behavioral clar...

## Error / Edge Handling
- example: ``` Discrepancy Detected: Issue sta...
- guardrail: - ALWAYS: Check for existing `SpecR... `[reusable]`

## Explicit Non‑Responsibilities
- classification-logic: | Mode | Trigger | Output |... `[phase-bound]`

## Glossary (omit if not needed)
- quality-gate: Use this during validation (auto-ge... `[phase-bound]`

## Guardrails (Enforced)
### guardrail (10)
- guardrail: - NEVER: Fabricate answers not supp... `[reusable]`
- guardrail: - NEVER: Silently assume critical e... `[reusable]`
- guardrail: - NEVER: Reintroduce removed prompt... `[phase-bound]`
- guardrail: - ALWAYS: Differentiate *requiremen... `[reusable]`
- guardrail: - ALWAYS: Pause after writing resea... `[workflow]`
- guardrail: - ALWAYS: Surface if external resea... `[reusable]`
- guardrail: - ALWAYS: Ensure minimal format hea... `[phase-bound]`
- guardrail: - ALWAYS: Use implementation discus... `[reusable]`
- guardrail: - ALWAYS: Respect user autonomy—if ... `[reusable]`
- guardrail: - When updating artifacts, modify o... `[reusable]`
- handoff-instruction `[phase-bound]`
  - artifact-format: ``` Specification Ready for Plannin... `[phase-bound]`

## Hand-off Checklist (Output When Finished)
- artifact-format: ``` Specification Ready for Plannin... `[phase-bound]`
- context-requirement: {{HANDOFF_INSTRUCTIONS}} `[workflow]`
- handoff-instruction: Conditional next stage based on wor... `[workflow]`
  - classification-logic: If spec research prompt was generat... `[workflow]`
    - example: Example handoff message: ``` Specif...
    - example: Example handoff message: ``` Specif...
- classification-logic: If spec research prompt was generat... `[workflow]`
  - example: Example handoff message: ``` Specif...
  - example: Example handoff message: ``` Specif...
### example (2)
- example: Example handoff message: ``` Specif...
- example: Example handoff message: ``` Specif...
- guardrail: - For GitHub: ALWAYS use the github... `[reusable]`
- agent-identity: Operate with rigor: Behavioral clar...

## High-Level Responsibilities
### workflow-step (8)
- workflow-step: 1. Collect feature intent & constra...
- workflow-step: 2. Extract key concepts → derive pr...
- workflow-step: 3. Enumerate factual unknowns; clas...
- workflow-step: 4. Generate `prompts/01B-spec-resea...
- workflow-step: 5. Pause for research; integrate...
- workflow-step: 6. Produce the specification using ...
- workflow-step: 7. Validate against the Spec Qualit...
- workflow-step: 8. Output final readiness checklist...
- guardrail: - Git add/commit/push operations. -... `[workflow]`

## Quality Bar for "Final" Spec (Pass Criteria)
- communication-pattern: - When pausing for research, clearl... `[reusable]`
  - decision-framework: - When implementation details arise... `[reusable]`

## Questions
- artifact-format: Use this exact minimal structure; r... `[phase-bound]`

## Research Question Guidelines
- example: Appropriate: "How does the authenti...
- workflow
  - workflow-step: 1. Intake & Decomposition: Read the...
  - workflow-step: 2. User Story Drafting: Derive init...
  - workflow-step: 3. Unknown Classification:
    - classification-logic: - Apply reasonable defaults (drawn ... `[reusable]`
  - workflow-step: 4. Research Prompt Generation: Crea...
  - workflow-step: 5. Handoff: Instruct user to run Sp...
  - workflow-step: 6. Integrate Research: Map each res...
  - workflow-step: 7. Specification Assembly: Iterativ...
    - artifact-format: - Overview: Write 2-4 paragraphs (3... `[phase-bound]`
  - workflow-step: 8. Quality Checklist Pass: Evaluate...
  - workflow-step: 9. Finalize & Hand‑Off: Present fin...

## Spec Agent
- mission-statement: Convert rough Issue/feature brief →...
- context-requirement: {{PAW_CONTEXT}} `[workflow]`
- core-principles
  - guardrail: 1. User value focus: Describe WHAT ... `[phase-bound]`
  - guardrail: 2. Independently testable stories: ... `[phase-bound]`
  - guardrail: 3. Resolve before drafting: Clarifi... `[reusable]`
  - guardrail: 4. Enumerated traceability: Use IDs... `[phase-bound]`
  - guardrail: 5. Research vs design: Research doc... `[phase-bound]`
  - guardrail: 6. Explicit assumptions: Replace lo... `[reusable]`
  - guardrail: 7. Measurable & tech-agnostic: Succ... `[phase-bound]`
  - guardrail: 8. Scope & risk: Maintain explicit ... `[phase-bound]`
  - guardrail: 9. No speculation: Every feature mu... `[reusable]`
  - decision-framework: Optional external/context questions... `[phase-bound]`
  - guardrail: > You DO NOT commit, push, open PRs... `[workflow]`

## Spec Quality Checklist
- quality-gate: - No unresolved clarification quest... `[phase-bound]`

## Start / Initial Response
- workflow-step: After calling `paw_get_context` (se...
  - classification-logic: - Check for existing `SpecResearch.... `[phase-bound]`
- classification-logic: - Check for existing `SpecResearch.... `[phase-bound]`
- decision-framework: Adapt behavior based on Workflow Mo... `[workflow]`
- workflow
  - workflow-step: 1. Collect feature intent & constra...
  - workflow-step: 2. Extract key concepts → derive pr...
  - workflow-step: 3. Enumerate factual unknowns; clas...
  - workflow-step: 4. Generate `prompts/01B-spec-resea...
  - workflow-step: 5. Pause for research; integrate...
  - workflow-step: 6. Produce the specification using ...
  - workflow-step: 7. Validate against the Spec Qualit...
  - workflow-step: 8. Output final readiness checklist...

## Working Modes
- decision-framework: Research questions document existin... `[phase-bound]`
  - example: Appropriate: "How does the authenti...