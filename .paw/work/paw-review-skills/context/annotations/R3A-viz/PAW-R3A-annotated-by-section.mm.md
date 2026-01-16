# PAW R3A annotated

## (preamble)
- agent-identity: You transform gap analysis findings... `[phase-bound]`

## Core Responsibilities
- guardrail: - Batch related findings into coher... `[reusable]`

## Guardrails
### guardrail (7)
- guardrail: No PAW Artifact References in Poste... `[phase-bound]`
- guardrail: No Automatic Submission: - NEVER su... `[reusable]`
- guardrail: Rationale Required: - EVERY comment... `[reusable]`
- guardrail: Evidence-Based: - All recommendatio... `[reusable]`
- guardrail: Human Control: - Reviewer edits com... `[reusable]`
- guardrail: Comprehensive Coverage: - ALL findi... `[reusable]`
- guardrail: One Issue, One Comment: - Related f... `[reusable]`

## Hand-off to Feedback Critic
- handoff-instruction: After completing feedback generatio... `[workflow]`

## Inline Comments
- Clear: Suggestion: ​```typescript // Propo...
  - Suggestion: Suggestion: ​```typescript // Optio...
    - Discussion: Rationale: ... Posted: ✓ Thread com...
      - workflow-step: For GitHub PRs, create pending revi... `[phase-bound]`
        - decision-framework: CRITICAL - What to Post vs What to ... `[phase-bound]`
      - workflow-step: For non-GitHub workflows (using git... `[phase-bound]`
      - communication-pattern: When reviewer asks questions about ... `[reusable]`
        - example: Example Q&A: ``` Q: "Why is the nul... `[reusable]`
      - communication-pattern: Support tone adjustments while pres... `[reusable]`
        - example: Example Tone Variations: *Direct:* ... `[reusable]`
      - guardrail: No PAW Artifact References in Poste... `[phase-bound]`
      - guardrail: No Automatic Submission: - NEVER su... `[reusable]`
      - guardrail: Rationale Required: - EVERY comment... `[reusable]`
      - guardrail: Evidence-Based: - All recommendatio... `[reusable]`
      - guardrail: Human Control: - Reviewer edits com... `[reusable]`
      - guardrail: Comprehensive Coverage: - ALL findi... `[reusable]`
      - guardrail: One Issue, One Comment: - Related f... `[reusable]`
      - quality-gate: Before completing, verify: - [ ] Al... `[phase-bound]`
      - handoff-instruction: After completing feedback generatio... `[workflow]`
- Suggestion: Suggestion: ​```typescript // Optio...
  - Discussion: Rationale: ... Posted: ✓ Thread com...
    - workflow-step: For GitHub PRs, create pending revi... `[phase-bound]`
      - decision-framework: CRITICAL - What to Post vs What to ... `[phase-bound]`
    - workflow-step: For non-GitHub workflows (using git... `[phase-bound]`
    - communication-pattern: When reviewer asks questions about ... `[reusable]`
      - example: Example Q&A: ``` Q: "Why is the nul... `[reusable]`
    - communication-pattern: Support tone adjustments while pres... `[reusable]`
      - example: Example Tone Variations: *Direct:* ... `[reusable]`
    - guardrail: No PAW Artifact References in Poste... `[phase-bound]`
    - guardrail: No Automatic Submission: - NEVER su... `[reusable]`
    - guardrail: Rationale Required: - EVERY comment... `[reusable]`
    - guardrail: Evidence-Based: - All recommendatio... `[reusable]`
    - guardrail: Human Control: - Reviewer edits com... `[reusable]`
    - guardrail: Comprehensive Coverage: - ALL findi... `[reusable]`
    - guardrail: One Issue, One Comment: - Related f... `[reusable]`
    - quality-gate: Before completing, verify: - [ ] Al... `[phase-bound]`
    - handoff-instruction: After completing feedback generatio... `[workflow]`

## Process Steps
- workflow `[phase-bound]`
  - workflow-step `[phase-bound]`
    - classification-logic: Group findings that share the same ... `[reusable]`
    - example: Examples: - Multiple null checks mi... `[reusable]`
  - workflow-step: For each finding or batched group o... `[phase-bound]`
    - artifact-format: Required Fields: - Type: `inline` (... `[phase-bound]`
    - decision-framework: Inline vs Thread Determination: Use... `[reusable]`
  - workflow-step: For EVERY comment, create comprehen... `[phase-bound]`
    - artifact-format: Evidence: - File:line references fr... `[reusable]`
    - example: Example Rationale: ```markdown Rati... `[reusable]`
  - workflow-step: Generate comprehensive markdown doc... `[phase-bound]`
    - artifact-format: Document Structure: ```markdown ---... `[phase-bound]`
      - Brief
        - Overview: Findings: X Must-address items, Y S...
          - Clear: Suggestion: ​```typescript // Propo...
            - Suggestion: Suggestion: ​```typescript // Optio...
              - Discussion: Rationale: ... Posted: ✓ Thread com...
                - workflow-step: For GitHub PRs, create pending revi... `[phase-bound]`
                  - decision-framework: CRITICAL - What to Post vs What to ... `[phase-bound]`
                - workflow-step: For non-GitHub workflows (using git... `[phase-bound]`
                - communication-pattern: When reviewer asks questions about ... `[reusable]`
                  - example: Example Q&A: ``` Q: "Why is the nul... `[reusable]`
                - communication-pattern: Support tone adjustments while pres... `[reusable]`
                  - example: Example Tone Variations: *Direct:* ... `[reusable]`
                - guardrail: No PAW Artifact References in Poste... `[phase-bound]`
                - guardrail: No Automatic Submission: - NEVER su... `[reusable]`
                - guardrail: Rationale Required: - EVERY comment... `[reusable]`
                - guardrail: Evidence-Based: - All recommendatio... `[reusable]`
                - guardrail: Human Control: - Reviewer edits com... `[reusable]`
                - guardrail: Comprehensive Coverage: - ALL findi... `[reusable]`
                - guardrail: One Issue, One Comment: - Related f... `[reusable]`
                - quality-gate: Before completing, verify: - [ ] Al... `[phase-bound]`
                - handoff-instruction: After completing feedback generatio... `[workflow]`
### workflow-step (4)
- workflow-step `[phase-bound]`
  - classification-logic: Group findings that share the same ... `[reusable]`
  - example: Examples: - Multiple null checks mi... `[reusable]`
- workflow-step: For each finding or batched group o... `[phase-bound]`
  - artifact-format: Required Fields: - Type: `inline` (... `[phase-bound]`
  - decision-framework: Inline vs Thread Determination: Use... `[reusable]`
- workflow-step: For EVERY comment, create comprehen... `[phase-bound]`
  - artifact-format: Evidence: - File:line references fr... `[reusable]`
  - example: Example Rationale: ```markdown Rati... `[reusable]`
- workflow-step: Generate comprehensive markdown doc... `[phase-bound]`
  - artifact-format: Document Structure: ```markdown ---... `[phase-bound]`
    - Brief
      - Overview: Findings: X Must-address items, Y S...
        - Clear: Suggestion: ​```typescript // Propo...
          - Suggestion: Suggestion: ​```typescript // Optio...
            - Discussion: Rationale: ... Posted: ✓ Thread com...
              - workflow-step: For GitHub PRs, create pending revi... `[phase-bound]`
                - decision-framework: CRITICAL - What to Post vs What to ... `[phase-bound]`
              - workflow-step: For non-GitHub workflows (using git... `[phase-bound]`
              - communication-pattern: When reviewer asks questions about ... `[reusable]`
                - example: Example Q&A: ``` Q: "Why is the nul... `[reusable]`
              - communication-pattern: Support tone adjustments while pres... `[reusable]`
                - example: Example Tone Variations: *Direct:* ... `[reusable]`
              - guardrail: No PAW Artifact References in Poste... `[phase-bound]`
              - guardrail: No Automatic Submission: - NEVER su... `[reusable]`
              - guardrail: Rationale Required: - EVERY comment... `[reusable]`
              - guardrail: Evidence-Based: - All recommendatio... `[reusable]`
              - guardrail: Human Control: - Reviewer edits com... `[reusable]`
              - guardrail: Comprehensive Coverage: - ALL findi... `[reusable]`
              - guardrail: One Issue, One Comment: - Related f... `[reusable]`
              - quality-gate: Before completing, verify: - [ ] Al... `[phase-bound]`
              - handoff-instruction: After completing feedback generatio... `[workflow]`
- classification-logic: Group findings that share the same ... `[reusable]`
### example (2)
- example: Examples: - Multiple null checks mi... `[reusable]`
- example: Example Rationale: ```markdown Rati... `[reusable]`
### artifact-format (3)
- artifact-format: Required Fields: - Type: `inline` (... `[phase-bound]`
- artifact-format: Evidence: - File:line references fr... `[reusable]`
- artifact-format: Document Structure: ```markdown ---... `[phase-bound]`
  - Brief
    - Overview: Findings: X Must-address items, Y S...
      - Clear: Suggestion: ​```typescript // Propo...
        - Suggestion: Suggestion: ​```typescript // Optio...
          - Discussion: Rationale: ... Posted: ✓ Thread com...
            - workflow-step: For GitHub PRs, create pending revi... `[phase-bound]`
              - decision-framework: CRITICAL - What to Post vs What to ... `[phase-bound]`
            - workflow-step: For non-GitHub workflows (using git... `[phase-bound]`
            - communication-pattern: When reviewer asks questions about ... `[reusable]`
              - example: Example Q&A: ``` Q: "Why is the nul... `[reusable]`
            - communication-pattern: Support tone adjustments while pres... `[reusable]`
              - example: Example Tone Variations: *Direct:* ... `[reusable]`
            - guardrail: No PAW Artifact References in Poste... `[phase-bound]`
            - guardrail: No Automatic Submission: - NEVER su... `[reusable]`
            - guardrail: Rationale Required: - EVERY comment... `[reusable]`
            - guardrail: Evidence-Based: - All recommendatio... `[reusable]`
            - guardrail: Human Control: - Reviewer edits com... `[reusable]`
            - guardrail: Comprehensive Coverage: - ALL findi... `[reusable]`
            - guardrail: One Issue, One Comment: - Related f... `[reusable]`
            - quality-gate: Before completing, verify: - [ ] Al... `[phase-bound]`
            - handoff-instruction: After completing feedback generatio... `[workflow]`
- decision-framework: Inline vs Thread Determination: Use... `[reusable]`

## Q&A Support
- communication-pattern: When reviewer asks questions about ... `[reusable]`
  - example: Example Q&A: ``` Q: "Why is the nul... `[reusable]`
- example: Example Q&A: ``` Q: "Why is the nul... `[reusable]`

## Quality Checklist
- quality-gate: Before completing, verify: - [ ] Al... `[phase-bound]`

## Questions for Author
### workflow-step (2)
- workflow-step: For GitHub PRs, create pending revi... `[phase-bound]`
  - decision-framework: CRITICAL - What to Post vs What to ... `[phase-bound]`
- workflow-step: For non-GitHub workflows (using git... `[phase-bound]`
- decision-framework: CRITICAL - What to Post vs What to ... `[phase-bound]`

## Start / Initial Response
- context-requirement: Look for Phase 1 and Phase 2 artifa... `[phase-bound]`

## Summary Comment
- Brief
  - Overview: Findings: X Must-address items, Y S...
    - Clear: Suggestion: ​```typescript // Propo...
      - Suggestion: Suggestion: ​```typescript // Optio...
        - Discussion: Rationale: ... Posted: ✓ Thread com...
          - workflow-step: For GitHub PRs, create pending revi... `[phase-bound]`
            - decision-framework: CRITICAL - What to Post vs What to ... `[phase-bound]`
          - workflow-step: For non-GitHub workflows (using git... `[phase-bound]`
          - communication-pattern: When reviewer asks questions about ... `[reusable]`
            - example: Example Q&A: ``` Q: "Why is the nul... `[reusable]`
          - communication-pattern: Support tone adjustments while pres... `[reusable]`
            - example: Example Tone Variations: *Direct:* ... `[reusable]`
          - guardrail: No PAW Artifact References in Poste... `[phase-bound]`
          - guardrail: No Automatic Submission: - NEVER su... `[reusable]`
          - guardrail: Rationale Required: - EVERY comment... `[reusable]`
          - guardrail: Evidence-Based: - All recommendatio... `[reusable]`
          - guardrail: Human Control: - Reviewer edits com... `[reusable]`
          - guardrail: Comprehensive Coverage: - ALL findi... `[reusable]`
          - guardrail: One Issue, One Comment: - Related f... `[reusable]`
          - quality-gate: Before completing, verify: - [ ] Al... `[phase-bound]`
          - handoff-instruction: After completing feedback generatio... `[workflow]`
- Overview: Findings: X Must-address items, Y S...
  - Clear: Suggestion: ​```typescript // Propo...
    - Suggestion: Suggestion: ​```typescript // Optio...
      - Discussion: Rationale: ... Posted: ✓ Thread com...
        - workflow-step: For GitHub PRs, create pending revi... `[phase-bound]`
          - decision-framework: CRITICAL - What to Post vs What to ... `[phase-bound]`
        - workflow-step: For non-GitHub workflows (using git... `[phase-bound]`
        - communication-pattern: When reviewer asks questions about ... `[reusable]`
          - example: Example Q&A: ``` Q: "Why is the nul... `[reusable]`
        - communication-pattern: Support tone adjustments while pres... `[reusable]`
          - example: Example Tone Variations: *Direct:* ... `[reusable]`
        - guardrail: No PAW Artifact References in Poste... `[phase-bound]`
        - guardrail: No Automatic Submission: - NEVER su... `[reusable]`
        - guardrail: Rationale Required: - EVERY comment... `[reusable]`
        - guardrail: Evidence-Based: - All recommendatio... `[reusable]`
        - guardrail: Human Control: - Reviewer edits com... `[reusable]`
        - guardrail: Comprehensive Coverage: - ALL findi... `[reusable]`
        - guardrail: One Issue, One Comment: - Related f... `[reusable]`
        - quality-gate: Before completing, verify: - [ ] Al... `[phase-bound]`
        - handoff-instruction: After completing feedback generatio... `[workflow]`

## Thread Comments
- Discussion: Rationale: ... Posted: ✓ Thread com...
  - workflow-step: For GitHub PRs, create pending revi... `[phase-bound]`
    - decision-framework: CRITICAL - What to Post vs What to ... `[phase-bound]`
  - workflow-step: For non-GitHub workflows (using git... `[phase-bound]`
  - communication-pattern: When reviewer asks questions about ... `[reusable]`
    - example: Example Q&A: ``` Q: "Why is the nul... `[reusable]`
  - communication-pattern: Support tone adjustments while pres... `[reusable]`
    - example: Example Tone Variations: *Direct:* ... `[reusable]`
  - guardrail: No PAW Artifact References in Poste... `[phase-bound]`
  - guardrail: No Automatic Submission: - NEVER su... `[reusable]`
  - guardrail: Rationale Required: - EVERY comment... `[reusable]`
  - guardrail: Evidence-Based: - All recommendatio... `[reusable]`
  - guardrail: Human Control: - Reviewer edits com... `[reusable]`
  - guardrail: Comprehensive Coverage: - ALL findi... `[reusable]`
  - guardrail: One Issue, One Comment: - Related f... `[reusable]`
  - quality-gate: Before completing, verify: - [ ] Al... `[phase-bound]`
  - handoff-instruction: After completing feedback generatio... `[workflow]`

## Tone Adjustment
- communication-pattern: Support tone adjustments while pres... `[reusable]`
  - example: Example Tone Variations: *Direct:* ... `[reusable]`
- example: Example Tone Variations: *Direct:* ... `[reusable]`