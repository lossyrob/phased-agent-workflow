---
agent: 'PAW-01B Spec Researcher'
---
# Spec Research Prompt: Implementation Skills Migration

Perform research to answer the following questions.

Target Branch: feature/164-implementation-skills-migration
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/164
Additional Inputs: none

## Agent Notes

The goal is to migrate 9 implementation agents (PAW-01A through PAW-05, PAW-X Status) to a skills-based architecture following the pattern from PR #156 (review workflow migration). Key context:

- The issue explicitly states decisions: handoff mode controls pausing, one phase per invocation, `paw-*` skill naming
- The review workflow serves as the reference pattern with a single orchestrator agent + workflow skill + activity skills
- Existing skills in `skills/paw-review-*` demonstrate the format
- Artifact locations must not change

Understanding how the existing implementation agents work and how the review migration was structured is essential for designing equivalent implementation skills.

## Questions

### Internal/Codebase Questions

1. **Current Implementation Agent Token Usage**: What is the approximate token count of each implementation agent file (PAW-01A through PAW-05, PAW-X)? How does this compare to the PAW Review agent + workflow skill combined?

2. **Shared Content in Implementation Agents**: What content is duplicated or shared across implementation agents (e.g., PAW Context components, handoff instructions, workflow mode handling)? This identifies candidates for consolidation.

3. **Distinct Capabilities per Agent**: For each implementation agent, what are its unique responsibilities that should become skill content vs orchestration content?
   - PAW-01A Specification: Core behavior
   - PAW-01B Spec Researcher: Core behavior  
   - PAW-02A Code Researcher: Core behavior
   - PAW-02B Impl Planner: Core behavior
   - PAW-03A Implementer: Core behavior
   - PAW-03B Impl Reviewer: Core behavior
   - PAW-04 Documenter: Core behavior
   - PAW-05 PR: Core behavior
   - PAW-X Status: Core behavior

4. **Artifact Flow Between Agents**: How do implementation artifacts (WorkflowContext.md, Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md) flow between agents? What validation occurs at stage boundaries?

5. **Handoff Mode Implementation**: How is handoff mode (manual/semi-auto/auto) currently implemented in the agent files? Is this logic duplicated or shared?

6. **Review Workflow Skill Structure**: What is the structure of `paw-review-workflow/SKILL.md`? How does it orchestrate activity skills (subagent delegation pattern)?

7. **Activity Skill Pattern**: What does an activity skill look like (e.g., `paw-review-understanding`)? What metadata, responsibilities, and execution modes do they define?

8. **PAW Review Agent Size**: How large is `PAW Review.agent.md` after migration? What does it retain vs delegate to skills?

### Optional External / Context

1. **Token Reduction Benchmarks**: What token reduction was achieved in the review workflow migration (PR #156)? This establishes expectations for implementation migration.
