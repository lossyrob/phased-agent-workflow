# PAW R1B annotated

## (preamble)
- agent-identity: You analyze the codebase at the bas... `[phase-bound]`
- core-principles
  - guardrail: - DO NOT analyze the PR changes or ... `[phase-bound]`
  - guardrail: 1. Baseline Focus: Analyze the syst... `[phase-bound]`
  - guardrail: 2. Behavioral Documentation: Docume... `[reusable]`
  - guardrail: 3. Pattern Recognition: Identify es... `[reusable]`
  - guardrail: 4. Integration Mapping: Document ho... `[reusable]`
  - guardrail: 5. Context Preservation: Capture en... `[reusable]`
  - guardrail: 6. Evidence-Based: Include specific... `[reusable]`

## COMPREHENSIVE RESEARCH
- guardrail: CRITICAL: All analysis must be at t... `[phase-bound]`
- handoff-instruction: - Fetch remote first: Always `git f... `[workflow]`

## CRITICAL: YOUR ONLY JOB IS TO DOCUMENT THE PRE-CHANGE CODEBASE AS IT EXISTED
- guardrail: - DO NOT analyze the PR changes or ... `[phase-bound]`

## Core Principles
### guardrail (6)
- guardrail: 1. Baseline Focus: Analyze the syst... `[phase-bound]`
- guardrail: 2. Behavioral Documentation: Docume... `[reusable]`
- guardrail: 3. Pattern Recognition: Identify es... `[reusable]`
- guardrail: 4. Integration Mapping: Document ho... `[reusable]`
- guardrail: 5. Context Preservation: Capture en... `[reusable]`
- guardrail: 6. Evidence-Based: Include specific... `[reusable]`
- classification-logic: This agent documents the baseline s... `[phase-bound]`

## Initial Setup
- context-requirement: Look for `prompts/01B-code-research... `[phase-bound]`
- communication-pattern: When starting, unless research prom... `[reusable]`
- workflow
  - workflow-step: 1. Sync Remote State (Pre-flight) -... `[phase-bound]`
    - decision-framework: - If fetch fails (offline, no remot... `[reusable]`
  - workflow-step: 2. Verify base commit and checkout:... `[phase-bound]`
  - workflow-step: 3. Read research prompt and changed... `[phase-bound]`
  - workflow-step: 4. Analyze pre-change codebase: - F... `[reusable]`
  - workflow-step: 5. Synthesize findings: - Compile a... `[reusable]`
  - workflow-step: 6. Gather metadata: - Current date/... `[reusable]`
  - workflow-step: 7. Generate baseline research docum... `[phase-bound]`
  - workflow-step: 8. Update ReviewContext.md with art... `[phase-bound]`
  - workflow-step: 9. Restore original state: - Return... `[reusable]`
  - workflow-step: 10. Present findings: - Summarize w... `[phase-bound]`

## Open Questions
- classification-logic: Locate relevant files at base commi... `[reusable]`

## Scope: Pre-Change System Understanding
- context-requirement: Before responding, look for `Review... `[phase-bound]`

## Steps to Follow
### workflow-step (10)
- workflow-step: 1. Sync Remote State (Pre-flight) -... `[phase-bound]`
  - decision-framework: - If fetch fails (offline, no remot... `[reusable]`
- workflow-step: 2. Verify base commit and checkout:... `[phase-bound]`
- workflow-step: 3. Read research prompt and changed... `[phase-bound]`
- workflow-step: 4. Analyze pre-change codebase: - F... `[reusable]`
- workflow-step: 5. Synthesize findings: - Compile a... `[reusable]`
- workflow-step: 6. Gather metadata: - Current date/... `[reusable]`
- workflow-step: 7. Generate baseline research docum... `[phase-bound]`
- workflow-step: 8. Update ReviewContext.md with art... `[phase-bound]`
- workflow-step: 9. Restore original state: - Return... `[reusable]`
- workflow-step: 10. Present findings: - Summarize w... `[phase-bound]`
- decision-framework: - If fetch fails (offline, no remot... `[reusable]`
- artifact-format: ```markdown --- date: [Current date... `[phase-bound]`