# PAW R1A annotated (by tag type)

## PR (1)
### @Description
- [Include full PR description or commit m

## agent-identity (1)
### @(preamble)
- You analyze pull request changes to crea `[phase-bound]`

## artifact-format (3) ⚠️
### @Inline Artifact Templates
- ```markdown --- date: <YYYY-MM-DD HH:MM: `[phase-bound]`
### @Metadata
- When creating... `[phase-bound]`
- ```markdown --- date: <YYYY-MM-DD HH:MM: `[phase-bound]`

## classification-logic (3) ⚠️
### @Start / Initial Response
- 1. ALWAYS Check for ReviewContext.md: -  `[workflow]`
### @Process Steps (Detailed Workflow)
- - GitHub: Use `mcp_github_pull_request_r `[phase-bound]`
### @Artifact Directory Structure
- GitHub Context: `.paw/reviews/PR-<number `[phase-bound]`

## communication-pattern (5) ⚠️
### @Start / Initial Response
- Fresh Start (no ReviewContext.md): ``` I `[phase-bound]`
### @Process Steps (Detailed Workflow)
- (Output without code block) ``` Research `[phase-bound]`
### @Error / Edge Handling
- If PR description contradicts code: ```  `[reusable]`
### @Hand-off Checklist
- Example handoff message: ``` Understandi `[phase-bound]`
- Example handoff message: ``` Understandi `[phase-bound]`

## context-requirement (1)
### @High-Level Responsibilities
- 1. Gather PR metadata (GitHub API or git `[phase-bound]`

## core-principles (1)
### @Core Review Principles
- (no content)

## decision-framework (3) ⚠️
### @Start / Initial Response
- Before responding, inspect the invocatio `[workflow]`
### @Error / Edge Handling
- If CI checks failing: - Record status in `[reusable]`
### @Hand-off Checklist
- Conditional next stage based on workflow `[workflow]`

## guardrail (13) ⚠️
### @Core Review Principles
- 1. Evidence-Based Understanding: Every.. `[reusable]`
- 2. Baseline Context First: Understand ho `[phase-bound]`
- 3. Document, Don't Critique: Understandi `[phase-bound]`
- 4. Zero Open Questions: Block progressio `[reusable]`
- 5. Explicit vs Inferred Goals: Clearly.. `[reusable]`
- 6. Artifact Completeness: Each artifact  `[reusable]`
- > You DO NOT evaluate quality, suggest.. `[phase-bound]`
### @Explicit Non-Responsibilities
- - Quality evaluation or gap identificati `[phase-bound]`
### @Guardrails (Enforced)
- NEVER: - Fabricate answers not supported `[reusable]`
- - Use local branch for base commit when  `[phase-bound]`
- ALWAYS: - Check for ReviewContext.md fir `[reusable]`
- - Prefer remote branch references (e.g., `[phase-bound]`
### @Hand-off Checklist
- Operate with rigor: Evidence first, base `[reusable]`

## handoff-instruction (1)
### @Hand-off Checklist
- When all artifacts complete and validate `[workflow]`

## quality-gate (4) ⚠️
### @Process Steps (Detailed Workflow)
- 3. Quality Check Research Prompt: - Ques `[reusable]`
- After creating all artifacts, validate a `[phase-bound]`
### @Complete Means
- - Files: Read entirely without limit/off `[reusable]`
### @Hand-off Checklist
- ``` Understanding Stage Complete - Ready `[phase-bound]`

## workflow (1)
### @Process Steps (Detailed Workflow)
- (no content)

## workflow-step (4)
### @Process Steps (Detailed Workflow)
- 1. Determine Remote Name: - Check... `[phase-bound]`
- 1. Identify Research Needs: - For each c `[phase-bound]`
- 1. Signal Human for Research: `[workflow]`
- 1. Read All Source Material: - ReviewCon `[phase-bound]`