---
mode: 'PAW-01B Spec Research Agent'
---

# Spec Research Prompt: Finalize Initial Agent Chatmodes
Perform research to answer the following questions.

Target Branch: feature/finalize-initial-chatmodes
GitHub Issue: 1
Additional Inputs: Existing chatmode markdown files under .github/chatmodes

## Questions
### Internal System
1. What are the explicit behavioral responsibilities, guardrails, and step sequences already defined in each existing chatmode (Spec Agent, Spec Research Agent, Code Researcher, Impl Planner, Implementer, Impl Reviewer, Documenter, PR, Status Update), and where are there inconsistencies or gaps between them? (Focus on behavioral intent; no implementation suggestions.)
2. How do the current chatmodes overlap or duplicate guidance (e.g., repeated instructions about reading files fully, creating TODOs, pausing for verification) and which instructions are unique to a single mode?
3. For each stage (Spec, Spec Research, Code Research, Implementation Planning, Implementation, Implementation Review, Documentation, PR, Status), what concrete inputs, outputs, and transition artifacts are CURRENTLY stated (or implicitly relied upon) in the chatmodes (e.g., Spec.md, SpecResearch.md, Implementation Plan file, branch naming patterns, research documents)?
4. Which mandatory pausing / hand‑off points are explicitly described vs absent across the modes (e.g., pause after research prompt generation, pause after phase implementation, pause for manual verification, pause for re-review)?
5. What risk mitigation or anti-pattern prevention language exists (e.g., "DO NOT" directives) per chatmode, and where are critical risk categories (scope creep, missing traceability, premature optimization, undocumented assumptions) not covered by any mode?
6. How is traceability (stories ↔ FRs ↔ SCs ↔ artifacts) presently enforced or referenced across modes, and where are there missing links or inconsistent terminology?
7. What assumptions about naming conventions (branches, files, document paths) are embedded inconsistently across chatmodes (e.g., plan file locations, research doc paths)?
8. Where do chatmodes instruct actions out of scope for their stage (violations of explicit non-responsibilities), creating potential role bleed?
9. What existing measurable success/quality checklists are defined, and which stages lack an equivalent explicit checklist?
10. How are clarification vs research vs assumption distinctions currently enforced in the Spec and Research related modes, and where are ambiguities or contradictions present?

### External Knowledge & Standards
1. What established best-practice categories (e.g., specification quality, research rigor, code review hygiene, documentation completeness) should minimally be represented as behavioral checklists to reduce omissions, and which are already mirrored internally (to avoid duplication)?
2. What widely recognized risk areas for multi-agent software development workflows (e.g., role overlap, stale artifact drift, unclear handoffs, missing verification gates) should be explicitly represented as guardrails if not already present internally?
3. Which standard forms of traceability (requirements → tests → implementation commits) are generally expected in mature engineering workflows and need to be reflected behaviorally (without specifying tooling) if missing?

## Notes for Research Agent
- Cite internal behavior (behavioral description; do not copy entire files) and summarize by chatmode name.
- Cite external authoritative sources (Title – URL) or mark items as assumptions if no reputable source is used.
- If no external sources are consulted for a question, add a "User-Provided External Knowledge" checklist in the research output for that question.
