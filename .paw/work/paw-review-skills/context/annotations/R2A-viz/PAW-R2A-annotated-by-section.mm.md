# PAW R2A annotated

## (preamble)
- agent-identity: You analyze the system-wide impact ... `[phase-bound]`

## Baseline State
- From
  - Components: | Component | Relationship | Impact...
    - Public: | Change | Type | Migration Needed ...
      - Why: Code Health Trend: - Is this change...
        - Steps: ```
          - guardrail: Evidence Required: - All findings m... `[reusable]`
          - guardrail: Baseline-Informed: - Use CodeResear... `[phase-bound]`
          - guardrail: No Speculation: - Only flag issues ... `[reusable]`
          - guardrail: Prerequisites Validated: - Confirm.... `[workflow]`
          - guardrail: Scope: - Focus on system-wide impac... `[phase-bound]`
          - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
          - handoff-instruction: ``` Impact Analysis Complete Impact... `[workflow]`
          - communication-pattern: After impact analysis completion: -... `[workflow]`
            - example: Example handoff message: ``` Impact... `[phase-bound]`
          - handoff-instruction: In Semi-Auto and Auto modes: Immedi... `[workflow]`

## Breaking Changes
- Public: | Change | Type | Migration Needed ...
  - Why: Code Health Trend: - Is this change...
    - Steps: ```
      - guardrail: Evidence Required: - All findings m... `[reusable]`
      - guardrail: Baseline-Informed: - Use CodeResear... `[phase-bound]`
      - guardrail: No Speculation: - Only flag issues ... `[reusable]`
      - guardrail: Prerequisites Validated: - Confirm.... `[workflow]`
      - guardrail: Scope: - Focus on system-wide impac... `[phase-bound]`
      - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
      - handoff-instruction: ``` Impact Analysis Complete Impact... `[workflow]`
      - communication-pattern: After impact analysis completion: -... `[workflow]`
        - example: Example handoff message: ``` Impact... `[phase-bound]`
      - handoff-instruction: In Semi-Auto and Auto modes: Immedi... `[workflow]`

## Core Responsibilities
- workflow: - Build integration graph showing w... `[phase-bound]`

## Guardrails
### guardrail (5)
- guardrail: Evidence Required: - All findings m... `[reusable]`
- guardrail: Baseline-Informed: - Use CodeResear... `[phase-bound]`
- guardrail: No Speculation: - Only flag issues ... `[reusable]`
- guardrail: Prerequisites Validated: - Confirm.... `[workflow]`
- guardrail: Scope: - Focus on system-wide impac... `[phase-bound]`

## Hand-off
### handoff-instruction (2)
- handoff-instruction: ``` Impact Analysis Complete Impact... `[workflow]`
- handoff-instruction: In Semi-Auto and Auto modes: Immedi... `[workflow]`
- communication-pattern: After impact analysis completion: -... `[workflow]`
  - example: Example handoff message: ``` Impact... `[phase-bound]`
- example: Example handoff message: ``` Impact... `[phase-bound]`

## Integration Points
- Components: | Component | Relationship | Impact...
  - Public: | Change | Type | Migration Needed ...
    - Why: Code Health Trend: - Is this change...
      - Steps: ```
        - guardrail: Evidence Required: - All findings m... `[reusable]`
        - guardrail: Baseline-Informed: - Use CodeResear... `[phase-bound]`
        - guardrail: No Speculation: - Only flag issues ... `[reusable]`
        - guardrail: Prerequisites Validated: - Confirm.... `[workflow]`
        - guardrail: Scope: - Focus on system-wide impac... `[phase-bound]`
        - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
        - handoff-instruction: ``` Impact Analysis Complete Impact... `[workflow]`
        - communication-pattern: After impact analysis completion: -... `[workflow]`
          - example: Example handoff message: ``` Impact... `[phase-bound]`
        - handoff-instruction: In Semi-Auto and Auto modes: Immedi... `[workflow]`

## Process Steps
### workflow-step (9)
- workflow-step: Identify what code depends on the c... `[reusable]`
  - classification-logic: Parse Changed Files: - Extract impo... `[reusable]`
  - decision-framework: Heuristics: - Parse import statemen... `[reusable]`
- workflow-step: Compare before/after to identify in... `[reusable]`
  - classification-logic: Function Signature Changes: - Param... `[reusable]`
  - decision-framework: Heuristics: - Diff public function ... `[reusable]`
- workflow-step: Evaluate algorithmic and resource u... `[reusable]`
  - classification-logic: Algorithmic Complexity: - New neste... `[reusable]`
  - decision-framework: Heuristics: - Flag nested loops wit... `[reusable]`
- workflow-step: Assess security-relevant changes: `[reusable]`
  - classification-logic: Authentication & Authorization: - A... `[reusable]`
  - decision-framework: Heuristics: - Flag auth check remov... `[reusable]`
- workflow-step: Evaluate whether the change fits we... `[reusable]`
  - decision-framework: Architectural Fit: - Does this chan... `[reusable]`
  - classification-logic: Heuristics: - Check if new code dup... `[reusable]`
- workflow-step: Assess impact on both end-users and... `[reusable]`
  - classification-logic: End-User Impact: - How does this af... `[reusable]`
  - decision-framework: Heuristics: - Identify public API c... `[reusable]`
- workflow-step: Evaluate whether changes improve or... `[reusable]`
  - classification-logic: Code Health Indicators: - Is this c... `[reusable]`
  - decision-framework: Heuristics: - Compare new code comp... `[reusable]`
- workflow-step: Document what's needed for safe rol... `[reusable]`
  - classification-logic: Database Migrations: - Schema chang... `[reusable]`
- workflow-step: Create comprehensive impact analysi... `[phase-bound]`
  - artifact-format: ```markdown --- date: <timestamp> g... `[phase-bound]`
    - From
      - Components: | Component | Relationship | Impact...
        - Public: | Change | Type | Migration Needed ...
          - Why: Code Health Trend: - Is this change...
            - Steps: ```
              - guardrail: Evidence Required: - All findings m... `[reusable]`
              - guardrail: Baseline-Informed: - Use CodeResear... `[phase-bound]`
              - guardrail: No Speculation: - Only flag issues ... `[reusable]`
              - guardrail: Prerequisites Validated: - Confirm.... `[workflow]`
              - guardrail: Scope: - Focus on system-wide impac... `[phase-bound]`
              - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
              - handoff-instruction: ``` Impact Analysis Complete Impact... `[workflow]`
              - communication-pattern: After impact analysis completion: -... `[workflow]`
                - example: Example handoff message: ``` Impact... `[phase-bound]`
              - handoff-instruction: In Semi-Auto and Auto modes: Immedi... `[workflow]`
### classification-logic (8)
- classification-logic: Parse Changed Files: - Extract impo... `[reusable]`
- classification-logic: Function Signature Changes: - Param... `[reusable]`
- classification-logic: Algorithmic Complexity: - New neste... `[reusable]`
- classification-logic: Authentication & Authorization: - A... `[reusable]`
- classification-logic: Heuristics: - Check if new code dup... `[reusable]`
- classification-logic: End-User Impact: - How does this af... `[reusable]`
- classification-logic: Code Health Indicators: - Is this c... `[reusable]`
- classification-logic: Database Migrations: - Schema chang... `[reusable]`
### decision-framework (7)
- decision-framework: Heuristics: - Parse import statemen... `[reusable]`
- decision-framework: Heuristics: - Diff public function ... `[reusable]`
- decision-framework: Heuristics: - Flag nested loops wit... `[reusable]`
- decision-framework: Heuristics: - Flag auth check remov... `[reusable]`
- decision-framework: Architectural Fit: - Does this chan... `[reusable]`
- decision-framework: Heuristics: - Identify public API c... `[reusable]`
- decision-framework: Heuristics: - Compare new code comp... `[reusable]`
- artifact-format: ```markdown --- date: <timestamp> g... `[phase-bound]`
  - From
    - Components: | Component | Relationship | Impact...
      - Public: | Change | Type | Migration Needed ...
        - Why: Code Health Trend: - Is this change...
          - Steps: ```
            - guardrail: Evidence Required: - All findings m... `[reusable]`
            - guardrail: Baseline-Informed: - Use CodeResear... `[phase-bound]`
            - guardrail: No Speculation: - Only flag issues ... `[reusable]`
            - guardrail: Prerequisites Validated: - Confirm.... `[workflow]`
            - guardrail: Scope: - Focus on system-wide impac... `[phase-bound]`
            - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
            - handoff-instruction: ``` Impact Analysis Complete Impact... `[workflow]`
            - communication-pattern: After impact analysis completion: -... `[workflow]`
              - example: Example handoff message: ``` Impact... `[phase-bound]`
            - handoff-instruction: In Semi-Auto and Auto modes: Immedi... `[workflow]`

## Quality Checklist
- quality-gate: Before completing this stage: - [ ]... `[phase-bound]`

## Risk Assessment
- Why: Code Health Trend: - Is this change...
  - Steps: ```
    - guardrail: Evidence Required: - All findings m... `[reusable]`
    - guardrail: Baseline-Informed: - Use CodeResear... `[phase-bound]`
    - guardrail: No Speculation: - Only flag issues ... `[reusable]`
    - guardrail: Prerequisites Validated: - Confirm.... `[workflow]`
    - guardrail: Scope: - Focus on system-wide impac... `[phase-bound]`
    - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
    - handoff-instruction: ``` Impact Analysis Complete Impact... `[workflow]`
    - communication-pattern: After impact analysis completion: -... `[workflow]`
      - example: Example handoff message: ``` Impact... `[phase-bound]`
    - handoff-instruction: In Semi-Auto and Auto modes: Immedi... `[workflow]`
- Steps: ```
  - guardrail: Evidence Required: - All findings m... `[reusable]`
  - guardrail: Baseline-Informed: - Use CodeResear... `[phase-bound]`
  - guardrail: No Speculation: - Only flag issues ... `[reusable]`
  - guardrail: Prerequisites Validated: - Confirm.... `[workflow]`
  - guardrail: Scope: - Focus on system-wide impac... `[phase-bound]`
  - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
  - handoff-instruction: ``` Impact Analysis Complete Impact... `[workflow]`
  - communication-pattern: After impact analysis completion: -... `[workflow]`
    - example: Example handoff message: ``` Impact... `[phase-bound]`
  - handoff-instruction: In Semi-Auto and Auto modes: Immedi... `[workflow]`

## Start / Initial Response
- context-requirement: Look for Phase 1 artifacts in... `[phase-bound]`
- guardrail: If any Phase 1 artifact is missing,... `[workflow]`