# PAW-01A Specification Agent Analysis

## Category
**Core Workflow**

This agent is an essential stage in the main development pipeline (Stage 01A) that drives stage-to-stage transitions. It is the entry point for feature development, converting rough requirements into structured specifications that feed subsequent planning and implementation stages.

## Current Responsibilities
- Collect feature intent & constraints from Issue/brief/user input
- Extract key concepts and derive prioritized user stories (P1-P3)
- Classify unknowns: reasonable defaults → assumptions, high-impact → clarifications, fact gaps → research questions
- Generate research prompts (`prompts/01B-spec-research.prompt.md`) for the Spec Researcher
- Integrate research findings from `SpecResearch.md` when available
- Produce structured `Spec.md` with: Overview, Objectives, User Stories, FRs, SCs, Assumptions, Scope, Dependencies, Risks
- Validate spec against quality checklist before handoff
- Adapt behavior based on Workflow Mode (full/minimal/custom)

## Artifacts Produced
- **Primary output**: `.paw/work/<feature-slug>/Spec.md` - The feature specification
- **Research prompt**: `.paw/work/<feature-slug>/prompts/01B-spec-research.prompt.md` - Questions for Spec Researcher
- **Reads**: `WorkflowContext.md`, Issue body + comments, `SpecResearch.md` (when available)

## Dependencies
- **Inputs from**: 
  - User or Issue containing feature brief
  - `WorkflowContext.md` for work ID, target branch, workflow mode
  - Custom instructions via `paw_get_context`
  - `SpecResearch.md` (optional, if Spec Researcher has run)
  
- **Outputs to**: 
  - PAW-01B Spec Researcher (research prompt for clarification)
  - PAW-02A Code Researcher (spec for implementation planning)
  
- **Tools used**:
  - `paw_get_context` - Retrieve workflow context and custom instructions
  - `paw_call_agent` - Hand off to next stage
  - `paw_generate_prompt` - Create research prompt file
  - GitHub MCP tools - Read Issue body and comments
  - File operations - Write Spec.md, read SpecResearch.md

## Subagent Invocations
- **No**: This agent does not delegate to subagents
- It hands off to PAW-01B Spec Researcher when research questions exist
- It hands off to PAW-02A Code Researcher when spec is complete
- All transitions are sequential workflow progression, not subagent delegation

## V2 Mapping Recommendation
- **Suggested v2 home**: **Workflow Skill** (Primary Stage 01A orchestrator)
  - This is a core workflow stage that should remain as a first-class workflow skill
  - Heavy decision-making logic around clarification handling, assumption classification, quality validation
  
- **Subagent candidate**: **No**
  - This is a primary workflow entry point, not a supporting capability
  - Contains significant state management (research vs integration modes)
  - Drives the spec→research→spec→plan flow
  
- **Skills to extract**:
  1. **User Story Derivation** - Could become a capability skill for extracting prioritized user stories from requirements text
  2. **Unknown Classification** - Logic for categorizing unknowns into assumptions/clarifications/research questions
  3. **Spec Quality Validation** - Checklist-based validation that could be reusable for any specification review
  4. **Research Question Generation** - Generating well-formed research prompts from identified unknowns
  5. **Narrative Writing** - Creating Overview/Objectives prose from technical requirements

## Lessons Learned
1. **Mode-Aware Behavior**: Agent adapts significantly based on workflow mode (full/minimal/custom). V2 architecture should consider how mode configuration affects skill behavior - possibly through parameterized skill invocation.

2. **State Machine Pattern**: This agent has distinct working modes (Research Preparation, Research Integration, Direct Spec) based on artifact presence. V2 should explicitly model these state transitions.

3. **Quality Gate Pattern**: The extensive quality checklist before handoff is a reusable pattern. Consider extracting validation checklists as composable capabilities.

4. **Guardrails as First-Class Citizens**: The agent has explicit guardrails (ALWAYS/NEVER rules) that prevent certain behaviors. V2 architecture should have a standard way to express and enforce guardrails.

5. **Template-Driven Output**: Uses inline templates for structured output. These templates could become shared prompt components in v2.

6. **Handoff Complexity**: Conditional handoff logic (research needed → Researcher, spec complete → Code Research) suggests v2 needs clear handoff routing rules, not hardcoded in agent prompts.

7. **Issue Integration Required**: Heavy reliance on GitHub/AzDO MCP tools for reading issues. V2 should ensure issue integration is a standard capability available to workflow skills.

8. **Incremental File Writing**: "Write sections to Spec.md as you create them" pattern - good for token efficiency and resumability. V2 should encourage this pattern.

---

**Analysis Date**: 2025-12-21
**Analyst**: Claude (via PAW v2 migration analysis)
