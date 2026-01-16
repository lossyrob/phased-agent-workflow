# PAW R2A annotated (by tag type)

## Components (1)
### @Integration Points
- | Component | Relationship | Impact |...

## From (1)
### @Baseline State
- (no content)

## Public (1)
### @Breaking Changes
- | Change | Type | Migration Needed |...

## Steps (1)
### @Risk Assessment
- ```

## Why (1)
### @Risk Assessment
- Code Health Trend: - Is this change impr

## agent-identity (1)
### @(preamble)
- You analyze the system-wide impact of PR `[phase-bound]`

## artifact-format (1)
### @Process Steps
- ```markdown --- date: <timestamp> git_co `[phase-bound]`

## classification-logic (8)
### @Process Steps
- Parse Changed Files: - Extract imports,  `[reusable]`
- Function Signature Changes: - Parameter  `[reusable]`
- Algorithmic Complexity: - New nested loo `[reusable]`
- Authentication & Authorization: - Auth m `[reusable]`
- Heuristics: - Check if new code duplicat `[reusable]`
- End-User Impact: - How does this affect. `[reusable]`
- Code Health Indicators: - Is this change `[reusable]`
- Database Migrations: - Schema changes re `[reusable]`

## communication-pattern (1)
### @Hand-off
- After impact analysis completion: - Next `[workflow]`

## context-requirement (1)
### @Start / Initial Response
- Look for Phase 1 artifacts in... `[phase-bound]`

## decision-framework (7)
### @Process Steps
- Heuristics: - Parse import statements us `[reusable]`
- Heuristics: - Diff public function signa `[reusable]`
- Heuristics: - Flag nested loops with dep `[reusable]`
- Heuristics: - Flag auth check removals - `[reusable]`
- Architectural Fit: - Does this change be `[reusable]`
- Heuristics: - Identify public API change `[reusable]`
- Heuristics: - Compare new code complexit `[reusable]`

## example (1)
### @Hand-off
- Example handoff message: ``` Impact anal `[phase-bound]`

## guardrail (6) ⚠️
### @Start / Initial Response
- If any Phase 1 artifact is missing, STOP `[workflow]`
### @Guardrails
- Evidence Required: - All findings must h `[reusable]`
- Baseline-Informed: - Use CodeResearch.md `[phase-bound]`
- No Speculation: - Only flag issues with  `[reusable]`
- Prerequisites Validated: - Confirm... `[workflow]`
- Scope: - Focus on system-wide impact, no `[phase-bound]`

## handoff-instruction (2)
### @Hand-off
- ``` Impact Analysis Complete ImpactAnaly `[workflow]`
- In Semi-Auto and Auto modes: Immediately `[workflow]`

## quality-gate (1)
### @Quality Checklist
- Before completing this stage: - [ ] Inte `[phase-bound]`

## workflow (1)
### @Core Responsibilities
- - Build integration graph showing what d `[phase-bound]`

## workflow-step (9)
### @Process Steps
- Identify what code depends on the change `[reusable]`
- Compare before/after to identify incompa `[reusable]`
- Evaluate algorithmic and resource usage  `[reusable]`
- Assess security-relevant changes: `[reusable]`
- Evaluate whether the change fits well wi `[reusable]`
- Assess impact on both end-users and... `[reusable]`
- Evaluate whether changes improve or degr `[reusable]`
- Document what's needed for safe rollout: `[reusable]`
- Create comprehensive impact analysis doc `[phase-bound]`