# PAW R1A annotated

## (preamble)
- agent-identity: You analyze pull request changes to... `[phase-bound]`

## Artifact Directory Structure
- classification-logic: GitHub Context: `.paw/reviews/PR-<n... `[phase-bound]`

## Complete Means
- quality-gate: - Files: Read entirely without limi... `[reusable]`

## Core Review Principles
- core-principles
  - guardrail: 1. Evidence-Based Understanding: Ev... `[reusable]`
  - guardrail: 2. Baseline Context First: Understa... `[phase-bound]`
  - guardrail: 3. Document, Don't Critique: Unders... `[phase-bound]`
  - guardrail: 4. Zero Open Questions: Block progr... `[reusable]`
  - guardrail: 5. Explicit vs Inferred Goals: Clea... `[reusable]`
  - guardrail: 6. Artifact Completeness: Each arti... `[reusable]`
  - guardrail: > You DO NOT evaluate quality, sugg... `[phase-bound]`
### guardrail (7)
- guardrail: 1. Evidence-Based Understanding: Ev... `[reusable]`
- guardrail: 2. Baseline Context First: Understa... `[phase-bound]`
- guardrail: 3. Document, Don't Critique: Unders... `[phase-bound]`
- guardrail: 4. Zero Open Questions: Block progr... `[reusable]`
- guardrail: 5. Explicit vs Inferred Goals: Clea... `[reusable]`
- guardrail: 6. Artifact Completeness: Each arti... `[reusable]`
- guardrail: > You DO NOT evaluate quality, sugg... `[phase-bound]`

## Description
- PR: [Include full PR description or com...
  - artifact-format: When creating... `[phase-bound]`
  - artifact-format: ```markdown --- date: <YYYY-MM-DD H... `[phase-bound]`
  - handoff-instruction: When all artifacts complete and val... `[workflow]`
    - quality-gate: ``` Understanding Stage Complete - ... `[phase-bound]`
    - decision-framework: Conditional next stage based on wor... `[workflow]`
      - communication-pattern: Example handoff message: ``` Unders... `[phase-bound]`
      - communication-pattern: Example handoff message: ``` Unders... `[phase-bound]`
  - guardrail: Operate with rigor: Evidence first,... `[reusable]`

## Error / Edge Handling
- decision-framework: If CI checks failing: - Record stat... `[reusable]`
  - communication-pattern: If PR description contradicts code:... `[reusable]`
- communication-pattern: If PR description contradicts code:... `[reusable]`

## Explicit Non-Responsibilities
- guardrail: - Quality evaluation or gap identif... `[phase-bound]`

## Guardrails (Enforced)
### guardrail (4)
- guardrail: NEVER: - Fabricate answers not supp... `[reusable]`
- guardrail: - Use local branch for base commit ... `[phase-bound]`
- guardrail: ALWAYS: - Check for ReviewContext.m... `[reusable]`
- guardrail: - Prefer remote branch references (... `[phase-bound]`

## Hand-off Checklist
- handoff-instruction: When all artifacts complete and val... `[workflow]`
  - quality-gate: ``` Understanding Stage Complete - ... `[phase-bound]`
  - decision-framework: Conditional next stage based on wor... `[workflow]`
    - communication-pattern: Example handoff message: ``` Unders... `[phase-bound]`
    - communication-pattern: Example handoff message: ``` Unders... `[phase-bound]`
- quality-gate: ``` Understanding Stage Complete - ... `[phase-bound]`
- decision-framework: Conditional next stage based on wor... `[workflow]`
  - communication-pattern: Example handoff message: ``` Unders... `[phase-bound]`
  - communication-pattern: Example handoff message: ``` Unders... `[phase-bound]`
### communication-pattern (2)
- communication-pattern: Example handoff message: ``` Unders... `[phase-bound]`
- communication-pattern: Example handoff message: ``` Unders... `[phase-bound]`
- guardrail: Operate with rigor: Evidence first,... `[reusable]`

## High-Level Responsibilities
- context-requirement: 1. Gather PR metadata (GitHub API o... `[phase-bound]`

## Inline Artifact Templates
- artifact-format: ```markdown --- date: <YYYY-MM-DD H... `[phase-bound]`
  - PR: [Include full PR description or com...
    - artifact-format: When creating... `[phase-bound]`
    - artifact-format: ```markdown --- date: <YYYY-MM-DD H... `[phase-bound]`
    - handoff-instruction: When all artifacts complete and val... `[workflow]`
      - quality-gate: ``` Understanding Stage Complete - ... `[phase-bound]`
      - decision-framework: Conditional next stage based on wor... `[workflow]`
        - communication-pattern: Example handoff message: ``` Unders... `[phase-bound]`
        - communication-pattern: Example handoff message: ``` Unders... `[phase-bound]`
    - guardrail: Operate with rigor: Evidence first,... `[reusable]`

## Metadata
### artifact-format (2)
- artifact-format: When creating... `[phase-bound]`
- artifact-format: ```markdown --- date: <YYYY-MM-DD H... `[phase-bound]`

## Process Steps (Detailed Workflow)
- workflow
  - workflow-step: 1. Determine Remote Name: - Check..... `[phase-bound]`
    - classification-logic: - GitHub: Use `mcp_github_pull_requ... `[phase-bound]`
  - workflow-step: 1. Identify Research Needs: - For e... `[phase-bound]`
    - quality-gate: 3. Quality Check Research Prompt: -... `[reusable]`
  - workflow-step: 1. Signal Human for Research: `[workflow]`
    - communication-pattern: (Output without code block) ``` Res... `[phase-bound]`
  - workflow-step: 1. Read All Source Material: - Revi... `[phase-bound]`
  - quality-gate: After creating all artifacts, valid... `[phase-bound]`
### workflow-step (4)
- workflow-step: 1. Determine Remote Name: - Check..... `[phase-bound]`
  - classification-logic: - GitHub: Use `mcp_github_pull_requ... `[phase-bound]`
- workflow-step: 1. Identify Research Needs: - For e... `[phase-bound]`
  - quality-gate: 3. Quality Check Research Prompt: -... `[reusable]`
- workflow-step: 1. Signal Human for Research: `[workflow]`
  - communication-pattern: (Output without code block) ``` Res... `[phase-bound]`
- workflow-step: 1. Read All Source Material: - Revi... `[phase-bound]`
- classification-logic: - GitHub: Use `mcp_github_pull_requ... `[phase-bound]`
### quality-gate (2)
- quality-gate: 3. Quality Check Research Prompt: -... `[reusable]`
- quality-gate: After creating all artifacts, valid... `[phase-bound]`
- communication-pattern: (Output without code block) ``` Res... `[phase-bound]`

## Start / Initial Response
- decision-framework: Before responding, inspect the invo... `[workflow]`
  - classification-logic: 1. ALWAYS Check for ReviewContext.m... `[workflow]`
  - communication-pattern: Fresh Start (no ReviewContext.md): ... `[phase-bound]`
- classification-logic: 1. ALWAYS Check for ReviewContext.m... `[workflow]`
- communication-pattern: Fresh Start (no ReviewContext.md): ... `[phase-bound]`