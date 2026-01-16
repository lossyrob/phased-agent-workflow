# PAW R2B annotated

## (preamble)
- agent-identity: You systematically identify gaps an... `[phase-bound]`

## Core Responsibilities
- guardrail: - Identify correctness issues (logi... `[phase-bound]`

## Guardrails
### guardrail (2)
- guardrail: Evidence-Based Categorization: - Ev... `[reusable]`
- guardrail: Coverage Context: - Always note whe... `[phase-bound]`

## Hand-off
### handoff-instruction (2)
- handoff-instruction: ``` Gap Analysis Complete GapAnalys... `[workflow]`
- handoff-instruction: In Semi-Auto mode: Pause here (deci... `[workflow]`
- communication-pattern: After gap analysis completion: - Ne... `[workflow]`
- example: Example handoff message: ``` Gap an... `[phase-bound]`

## Heuristics
- decision-framework: Coverage Report Parsing: - Look for... `[reusable]`
- classification-logic: Must Indicators: - Null/undefined a... `[reusable]`

## Positive Observations
- List: - ✅ Excellent test coverage: Added ...
  - If: - Line Coverage: X% - Branch Covera...
    - If: Quantitative metrics not available....
      - Do: Breadth:
        - Do: Quality:
          - Do
            - List: Overall Test Assessment: Adequate |...
              - decision-framework: Coverage Report Parsing: - Look for... `[reusable]`
              - classification-logic: Must Indicators: - Null/undefined a... `[reusable]`
              - guardrail: Evidence-Based Categorization: - Ev... `[reusable]`
              - guardrail: Coverage Context: - Always note whe... `[phase-bound]`
              - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
              - handoff-instruction: ``` Gap Analysis Complete GapAnalys... `[workflow]`
              - communication-pattern: After gap analysis completion: - Ne... `[workflow]`
              - example: Example handoff message: ``` Gap an... `[phase-bound]`
              - handoff-instruction: In Semi-Auto mode: Pause here (deci... `[workflow]`

## Process Steps
### workflow-step (9)
- workflow-step: Identify logic and implementation e... `[phase-bound]`
- workflow-step: Find security vulnerabilities and r... `[phase-bound]`
- workflow-step: Assess test coverage and quality: Q... `[reusable]`
- workflow-step: Evaluate code quality and long-term... `[reusable]`
- workflow-step: Identify inefficient code patterns:... `[phase-bound]`
- workflow-step: Apply Must/Should/Could categorizat... `[phase-bound]`
- workflow-step: Recognize what the developer did we... `[reusable]`
- workflow-step: Evaluate adherence to style guideli... `[reusable]`
- workflow-step: Create comprehensive gap analysis d... `[phase-bound]`
### decision-framework (2)
- decision-framework: Comment Quality Assessment: - Do co... `[reusable]`
- decision-framework: Over-engineering Detection: - Is co... `[reusable]`
### classification-logic (2)
- classification-logic: Must - Correctness/Safety/Security ... `[reusable]`
- classification-logic: Could - Optional Enhancements: - Co... `[reusable]`
- guardrail: Categorization Rules: - Don't infla... `[reusable]`
- artifact-format: ```markdown --- date: <timestamp> g... `[phase-bound]`
  - Brief: ---
    - List: - ✅ Excellent test coverage: Added ...
      - If: - Line Coverage: X% - Branch Covera...
        - If: Quantitative metrics not available....
          - Do: Breadth:
            - Do: Quality:
              - Do
                - List: Overall Test Assessment: Adequate |...
                  - decision-framework: Coverage Report Parsing: - Look for... `[reusable]`
                  - classification-logic: Must Indicators: - Null/undefined a... `[reusable]`
                  - guardrail: Evidence-Based Categorization: - Ev... `[reusable]`
                  - guardrail: Coverage Context: - Always note whe... `[phase-bound]`
                  - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
                  - handoff-instruction: ``` Gap Analysis Complete GapAnalys... `[workflow]`
                  - communication-pattern: After gap analysis completion: - Ne... `[workflow]`
                  - example: Example handoff message: ``` Gap an... `[phase-bound]`
                  - handoff-instruction: In Semi-Auto mode: Pause here (deci... `[workflow]`

## Quality Checklist
- quality-gate: Before completing this stage: - [ ]... `[phase-bound]`

## Start / Initial Response
- context-requirement: Look for required artifacts in... `[phase-bound]`

## Summary
- Brief: ---
  - List: - ✅ Excellent test coverage: Added ...
    - If: - Line Coverage: X% - Branch Covera...
      - If: Quantitative metrics not available....
        - Do: Breadth:
          - Do: Quality:
            - Do
              - List: Overall Test Assessment: Adequate |...
                - decision-framework: Coverage Report Parsing: - Look for... `[reusable]`
                - classification-logic: Must Indicators: - Null/undefined a... `[reusable]`
                - guardrail: Evidence-Based Categorization: - Ev... `[reusable]`
                - guardrail: Coverage Context: - Always note whe... `[phase-bound]`
                - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
                - handoff-instruction: ``` Gap Analysis Complete GapAnalys... `[workflow]`
                - communication-pattern: After gap analysis completion: - Ne... `[workflow]`
                - example: Example handoff message: ``` Gap an... `[phase-bound]`
                - handoff-instruction: In Semi-Auto mode: Pause here (deci... `[workflow]`

## Test Coverage Assessment
### If (2)
- If: - Line Coverage: X% - Branch Covera...
  - If: Quantitative metrics not available....
    - Do: Breadth:
      - Do: Quality:
        - Do
          - List: Overall Test Assessment: Adequate |...
            - decision-framework: Coverage Report Parsing: - Look for... `[reusable]`
            - classification-logic: Must Indicators: - Null/undefined a... `[reusable]`
            - guardrail: Evidence-Based Categorization: - Ev... `[reusable]`
            - guardrail: Coverage Context: - Always note whe... `[phase-bound]`
            - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
            - handoff-instruction: ``` Gap Analysis Complete GapAnalys... `[workflow]`
            - communication-pattern: After gap analysis completion: - Ne... `[workflow]`
            - example: Example handoff message: ``` Gap an... `[phase-bound]`
            - handoff-instruction: In Semi-Auto mode: Pause here (deci... `[workflow]`
- If: Quantitative metrics not available....
  - Do: Breadth:
    - Do: Quality:
      - Do
        - List: Overall Test Assessment: Adequate |...
          - decision-framework: Coverage Report Parsing: - Look for... `[reusable]`
          - classification-logic: Must Indicators: - Null/undefined a... `[reusable]`
          - guardrail: Evidence-Based Categorization: - Ev... `[reusable]`
          - guardrail: Coverage Context: - Always note whe... `[phase-bound]`
          - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
          - handoff-instruction: ``` Gap Analysis Complete GapAnalys... `[workflow]`
          - communication-pattern: After gap analysis completion: - Ne... `[workflow]`
          - example: Example handoff message: ``` Gap an... `[phase-bound]`
          - handoff-instruction: In Semi-Auto mode: Pause here (deci... `[workflow]`
### Do (3)
- Do: Breadth:
  - Do: Quality:
    - Do
      - List: Overall Test Assessment: Adequate |...
        - decision-framework: Coverage Report Parsing: - Look for... `[reusable]`
        - classification-logic: Must Indicators: - Null/undefined a... `[reusable]`
        - guardrail: Evidence-Based Categorization: - Ev... `[reusable]`
        - guardrail: Coverage Context: - Always note whe... `[phase-bound]`
        - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
        - handoff-instruction: ``` Gap Analysis Complete GapAnalys... `[workflow]`
        - communication-pattern: After gap analysis completion: - Ne... `[workflow]`
        - example: Example handoff message: ``` Gap an... `[phase-bound]`
        - handoff-instruction: In Semi-Auto mode: Pause here (deci... `[workflow]`
- Do: Quality:
  - Do
    - List: Overall Test Assessment: Adequate |...
      - decision-framework: Coverage Report Parsing: - Look for... `[reusable]`
      - classification-logic: Must Indicators: - Null/undefined a... `[reusable]`
      - guardrail: Evidence-Based Categorization: - Ev... `[reusable]`
      - guardrail: Coverage Context: - Always note whe... `[phase-bound]`
      - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
      - handoff-instruction: ``` Gap Analysis Complete GapAnalys... `[workflow]`
      - communication-pattern: After gap analysis completion: - Ne... `[workflow]`
      - example: Example handoff message: ``` Gap an... `[phase-bound]`
      - handoff-instruction: In Semi-Auto mode: Pause here (deci... `[workflow]`
- Do
  - List: Overall Test Assessment: Adequate |...
    - decision-framework: Coverage Report Parsing: - Look for... `[reusable]`
    - classification-logic: Must Indicators: - Null/undefined a... `[reusable]`
    - guardrail: Evidence-Based Categorization: - Ev... `[reusable]`
    - guardrail: Coverage Context: - Always note whe... `[phase-bound]`
    - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
    - handoff-instruction: ``` Gap Analysis Complete GapAnalys... `[workflow]`
    - communication-pattern: After gap analysis completion: - Ne... `[workflow]`
    - example: Example handoff message: ``` Gap an... `[phase-bound]`
    - handoff-instruction: In Semi-Auto mode: Pause here (deci... `[workflow]`
- List: Overall Test Assessment: Adequate |...
  - decision-framework: Coverage Report Parsing: - Look for... `[reusable]`
  - classification-logic: Must Indicators: - Null/undefined a... `[reusable]`
  - guardrail: Evidence-Based Categorization: - Ev... `[reusable]`
  - guardrail: Coverage Context: - Always note whe... `[phase-bound]`
  - quality-gate: Before completing this stage: - [ ]... `[phase-bound]`
  - handoff-instruction: ``` Gap Analysis Complete GapAnalys... `[workflow]`
  - communication-pattern: After gap analysis completion: - Ne... `[workflow]`
  - example: Example handoff message: ``` Gap an... `[phase-bound]`
  - handoff-instruction: In Semi-Auto mode: Pause here (deci... `[workflow]`