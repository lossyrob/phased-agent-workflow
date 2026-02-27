# Premortem Perspective

## Lens Type
temporal

## Parameters
- **Temporal Frame**: 6 months post-launch
- **Scenario**: This system caused a significant incident after running in production for 6 months

## Overlay Template

It is 6 months after this change was deployed and the system has caused a significant production incident. As the {specialist}, conduct a prospective hindsight analysis: identify the failure modes this change introduces or fails to protect against. Focus on what would have been obvious in retrospect — the warnings that were visible in the code but easy to dismiss during review. Consider how the system degrades under sustained load, dependency churn, edge-case accumulation, and operational neglect over the 6-month window.

## Novelty Constraint

Tie each predicted failure back to specific evidence in the artifact (code patterns, missing guards, implicit assumptions, dependency relationships). If a concern cannot be grounded in artifact evidence, label it explicitly as speculative operational risk. Do not duplicate findings that would surface under standard present-tense review — focus on what the temporal shift uniquely reveals.
