---
agent: PAW-02B Impl Planner
description: Consider feedback on implementation plan for spec narrative section
---

Below is feedback from an agent who was reviewing the plan given the research in .paw/work/spec-narrative-section/context/spec-research.md

Consider this recommendations and identify what changes, if any, should be made to the implementation plan at .paw/work/spec-narrative-section/ImplementationPlan.md. Discuss changes before making them.

---

I'll review the implementation plan against the spec research to identify what remains unimplemented and any differences in approach. 

Read [](file:///home/rob/proj/paw/phased-agent-workflow/.paw/work/spec-narrative-section/ImplementationPlan.md)

Read [](file:///home/rob/proj/paw/phased-agent-workflow/.paw/work/spec-narrative-section/context/spec-research.md)

Now I'll analyze the implementation plan against the spec research to identify gaps and differences:

## Analysis: Implementation Plan vs. Spec Research

### What Remains Unimplemented

1. **Narrative Depth and Guidance**: The research emphasizes creating "vivid and realistic scenarios" (Spolsky) with 3-5 sentence paragraphs focusing on user experience. The implementation plan's inline template guidance is minimal (~150 tokens). The research suggests more detailed guidance about writing narrative prose - the plan could expand on creating coherent stories that describe user journeys step-by-step.

2. **Explicit Anti-Patterns**: The research warns against specific pitfalls (vague words like "fast" or "user-friendly", mixing formal specs into narrative). The implementation plan's quality checklist covers avoiding implementation details but doesn't explicitly address quantifying non-functional requirements or other anti-patterns identified in research.

3. **Rationale/Why Capture**: The research recommends including brief rationale notes attached to stories (e.g., "(Rationale: this allows teachers to manage...)", "Understanding the why helps both humans and AI"). The implementation plan doesn't add guidance for capturing WHY alongside WHAT in the structured sections.

4. **Non-Goals/Out of Scope**: The research highlights Joel Spolsky's practice of explicitly stating "Nongoals" to prevent scope creep and guide AI not to wander. The current PAW template has a "Scope" section, but the implementation plan doesn't enhance guidance about explicitly calling out what's NOT being done.

5. **Story-to-Requirement Linkage**: The research discusses ensuring narrative and structured sections are "well-linked" and "consistent" - the narrative should set the stage for stories that formalize it. The implementation plan doesn't add explicit guidance about maintaining this linkage or cross-referencing between Overview and User Stories.

### Differences in Approach

1. **Token Budget Constraints**: The research doesn't discuss token limits as a constraint. The implementation plan is heavily constrained by the 6500 token chatmode limit, leading to minimal inline guidance. The research would suggest richer narrative guidance, but the plan must balance this against token costs.

2. **Level of Formality**: The research presents options ranging from full Gherkin syntax ("GIVEN... WHEN... THEN...") to informal bullets. The implementation plan doesn't specify whether to recommend more formal acceptance criteria syntax. The research suggests Gherkin can help AI interpret step-by-step while remaining human-readable.

3. **Living Document Perspective**: The research emphasizes "maintaining the spec as a living document throughout the project (spec-anchored development)." The implementation plan focuses solely on initial spec generation, not on how narrative sections should evolve during clarifications or iterations.

4. **Formal Artifact Integration**: The research discusses selectively embedding formal specs (OpenAPI schemas, JSON Schema) as subsections when needed for precision. The implementation plan doesn't address when/how to include such formal elements in the narrative or structured sections.

### Recommendations Not in Plan (Even if Out of Scope)

Several research insights could improve the Spec Agent beyond the narrative sections initiative:

1. **Enhanced Success Criteria Formatting**: Consider recommending Gherkin-style syntax for acceptance criteria to improve clarity for both humans and AI. This would help the AI interpret scenarios step-by-step.

2. **Explicit Rationale Fields**: Add optional rationale annotations to user stories explaining the WHY behind requirements. This helps AI make better implementation decisions and helps reviewers validate intent.

3. **Quantified Non-Functional Requirements**: When the spec includes non-functional goals, add guidance to quantify them (e.g., "load time under 2 seconds" not just "fast"). This reduces ambiguity for AI implementers.

4. **Non-Goals Section**: Consider adding an explicit "Non-Goals" or "Out of Scope" section early in the template (perhaps after Objectives) to prevent scope creep and guide AI focus.

5. **Narrative-to-Structure Traceability**: Add checklist items or workflow guidance about ensuring each Overview paragraph corresponds to user stories and vice versa - maintaining bidirectional consistency.

6. **Formal Artifact Guidance**: For API-heavy or data-model-heavy features, provide guidance on when to include formal specifications (OpenAPI, JSON Schema) as attachments or subsections to reduce ambiguity.

7. **Living Document Workflow**: Enhance the Spec Agent workflow to support spec updates during clarification phases, ensuring narrative sections remain synchronized with evolved requirements.

8. **Scenario-Based Structure**: The research emphasizes "scenarios" heavily. Consider whether User Stories section could be enhanced with fuller scenario descriptions (not just "As a... I want...") that paint more vivid pictures before listing acceptance criteria.

### Strengths of Current Approach

The implementation plan wisely:
- Maintains single-file modification strategy aligned with PAW architecture
- Balances token budget constraints while adding meaningful narrative guidance
- Focuses on behavioral descriptions avoiding implementation details
- Uses quality checklist to enforce narrative standards
- Preserves separation between WHAT (spec) and HOW (plan) phases

The plan is pragmatic and well-scoped, but could be enhanced with deeper narrative guidance and traceability mechanisms if token budget allows.