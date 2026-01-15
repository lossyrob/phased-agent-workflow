# PAW 01A Specification.annotated (by tag type)

## Context (1)
### @Agent Notes (if any)
- 1. ... 1. ... ``` Constraints:

## agent-identity (2) ⚠️
### @(preamble)
- You convert a rough Issue / feature brie
### @Hand-off Checklist (Output When Finished)
- Operate with rigor: Behavioral clarity f

## artifact-format (4) ⚠️
### @Drafting Workflow (Detailed Steps)
- - Overview: Write 2-4 paragraphs (3-5 se `[phase-bound]`
- Required header & format: ``` --- agent: `[phase-bound]`
### @Questions
- Use this exact minimal structure; remove `[phase-bound]`
### @Hand-off Checklist (Output When Finished)
- ``` Specification Ready for Planning Sta `[phase-bound]`

## classification-logic (4) ⚠️
### @Start / Initial Response
- - Check for existing `SpecResearch.md`:  `[phase-bound]`
### @Explicit Non‑Responsibilities
- | Mode | Trigger | Output |... `[phase-bound]`
### @Drafting Workflow (Detailed Steps)
- - Apply reasonable defaults (drawn from  `[reusable]`
### @Hand-off Checklist (Output When Finished)
- If spec research prompt was generated (r `[workflow]`

## communication-pattern (1)
### @Quality Bar for "Final" Spec (Pass Criteria)
- - When pausing for research, clearly enu `[reusable]`

## context-requirement (2) ⚠️
### @Spec Agent
- {{PAW_CONTEXT}} `[workflow]`
### @Hand-off Checklist (Output When Finished)
- {{HANDOFF_INSTRUCTIONS}} `[workflow]`

## core-principles (1)
### @Spec Agent
- (no content)

## decision-framework (5) ⚠️
### @Core Principles & Guardrails
- Optional external/context questions (sta `[phase-bound]`
### @Start / Initial Response
- Adapt behavior based on Workflow Mode an `[workflow]`
### @Working Modes
- Research questions document existing sys `[phase-bound]`
### @Communication Patterns
- - When implementation details arise in.. `[reusable]`
- - If `SpecResearch.md` content contradic `[reusable]`

## example (4) ⚠️
### @Research Question Guidelines
- Appropriate: "How does the authenticatio
### @Error / Edge Handling
- ``` Discrepancy Detected: Issue states: 
### @Hand-off Checklist (Output When Finished)
- Example handoff message: ``` Specificati
- Example handoff message: ``` Specificati

## guardrail (23) ⚠️
### @Core Principles & Guardrails
- 1. User value focus: Describe WHAT & WHY `[phase-bound]`
- 2. Independently testable stories: Prior `[phase-bound]`
- 3. Resolve before drafting: Clarificatio `[reusable]`
- 4. Enumerated traceability: Use IDs (FR- `[phase-bound]`
- 5. Research vs design: Research document `[phase-bound]`
- 6. Explicit assumptions: Replace low-imp `[reusable]`
- 7. Measurable & tech-agnostic: Success c `[phase-bound]`
- 8. Scope & risk: Maintain explicit In/Ou `[phase-bound]`
- 9. No speculation: Every feature must ma `[reusable]`
- > You DO NOT commit, push, open PRs, upd `[workflow]`
### @High-Level Responsibilities
- - Git add/commit/push operations. - No P `[workflow]`
### @Error / Edge Handling
- - ALWAYS: Check for existing `SpecResear `[reusable]`
### @Guardrails (Enforced)
- - NEVER: Fabricate answers not supported `[reusable]`
- - NEVER: Silently assume critical extern `[reusable]`
- - NEVER: Reintroduce removed prompt sect `[phase-bound]`
- - ALWAYS: Differentiate *requirements* ( `[reusable]`
- - ALWAYS: Pause after writing research p `[workflow]`
- - ALWAYS: Surface if external research w `[reusable]`
- - ALWAYS: Ensure minimal format header l `[phase-bound]`
- - ALWAYS: Use implementation discussions `[reusable]`
- - ALWAYS: Respect user autonomy—if user  `[reusable]`
- - When updating artifacts, modify only i `[reusable]`
### @Hand-off Checklist (Output When Finished)
- - For GitHub: ALWAYS use the github mcp  `[reusable]`

## handoff-instruction (2) ⚠️
### @Guardrails (Enforced)
- (no content) `[phase-bound]`
### @Hand-off Checklist (Output When Finished)
- Conditional next stage based on workflow `[workflow]`

## mission-statement (1)
### @Spec Agent
- Convert rough Issue/feature brief → stru

## quality-gate (2) ⚠️
### @Glossary (omit if not needed)
- Use this during validation (auto-generat `[phase-bound]`
### @Spec Quality Checklist
- - No unresolved clarification questions. `[phase-bound]`

## workflow (3) ⚠️
### @Core Principles & Guardrails
- (no content)
### @Start / Initial Response
- (no content)
### @Research Question Guidelines
- (no content)

## workflow-step (18) ⚠️
### @Start / Initial Response
- After calling `paw_get_context` (see PAW
### @High-Level Responsibilities
- 1. Collect feature intent & constraints 
- 2. Extract key concepts → derive priorit
- 3. Enumerate factual unknowns; classify 
- 4. Generate `prompts/01B-spec-research.p
- 5. Pause for research; integrate...
- 6. Produce the specification using the i
- 7. Validate against the Spec Quality Che
- 8. Output final readiness checklist (spe
### @Drafting Workflow (Detailed Steps)
- 1. Intake & Decomposition: Read the Issu
- 2. User Story Drafting: Derive initial..
- 3. Unknown Classification:
- 4. Research Prompt Generation: Create...
- 5. Handoff: Instruct user to run Spec Re
- 6. Integrate Research: Map each research
- 7. Specification Assembly: Iteratively b
- 8. Quality Checklist Pass: Evaluate spec
- 9. Finalize & Hand‑Off: Present final re