---
mode: 'PAW-01B Spec Research Agent'
---
# Spec Research Prompt: Finalize Initial Agent Chatmodes
Perform research to answer the following questions.

Target Branch: feature/finalize-initial-chatmodes
GitHub Issue: 1
Additional Inputs: paw-specification.md, README.md, existing chatmode files (.github/chatmodes/*.chatmode.md)

## Questions
1. Current Chatmode Inventory: What chatmode files currently exist (list by PAW code & title) and which PAW workflow stages / roles do they correspond to conceptually (without redesign)?
2. Role Split Rationale: What present behaviors, instructions, or emphases distinguish the Implementer vs Implementation Reviewer chatmodes today (summarize factual differences only)?
3. Spec vs Spec Research Boundary: How do the existing Spec Agent and Spec Research Agent chatmodes currently delineate responsibilities (any overlap or ambiguity in wording)?
4. Research Depth Burden: In the Code Research Agent chatmode, which instructions might drive granular code line/filename gathering versus higher-level behavioral mapping (quote or summarize the exact directive language)?
5. Guidance Preservation Targets: Which sections in the mature (Human Layer derived) chatmodes (Spec Agent, Code Researcher, Implementer) contain critical negative / guardrail language ("DO NOT", "NEVER", "IMPORTANT") that is absent from first-pass chatmodes (list missing guardrail categories)?
6. First-Pass Gaps: For each first-pass / untested chatmode (identify which are untested), what major structural sections (e.g., Start, Method, Steps, Guardrails, Quality Checklist) are missing compared to the mature ones?
7. Consistency Issues: Are there terminology inconsistencies across chatmodes for the same concept (e.g., Implementation Plan Agent vs Impl Planner, Implementation Review Agent naming variations)? List each inconsistency.
8. Artifact Path & Naming Alignment: Do any chatmodes instruct producing or referencing artifact names / paths that differ from the canonical paths defined in `paw-specification.md` (list discrepancies)?
9. Stage Hand-off Clarity: For each transition (Spec -> Plan, Plan -> Implementation, Implementation -> Documentation, Documentation -> Final PR), do the chatmodes explicitly state required input artifacts and outputs? Identify any missing explicit hand-off statements.
10. Status / PR Agent Overlap: Do the Status Agent and PR Agent chatmodes duplicate responsibilities for updating issues / PR descriptions? Summarize factual overlaps.
11. External Dependencies Mentions: Do any chatmodes reference external tools, APIs, or web search behavior outside their described scope (list which and the referenced external capability)?
12. Assumed Human Actions: What explicit human-in-the-loop steps are referenced inside chatmodes (verbatim or summarized) that must be preserved to maintain process integrity?
13. Risk Phrases Source: Where (which chatmodes & sections) are strong corrective phrases (e.g., "CRITICAL:", "IMPORTANT:") currently used, and which first-pass chatmodes lack any such emphasis markers?
14. Branching Conventions: Do chatmodes accurately reflect branching conventions (planning branch suffix _plan, phase branches _phaseN, etc.)? List any deviations.
15. Quality / Checklist Coverage: Which chatmodes currently embed an explicit quality checklist; which required workflow quality dimensions (clarity, traceability, testability, guardrails) are absent in others?
16. Reviewer Responsibilities Granularity: What concrete reviewer actions (documentation improvements, code comments, commit structuring) are presently specified in the Implementation Reviewer chatmode, and which expected reviewer behaviors (if any) appear missing relative to the Issue goal of "solidifying" chatmodes?
17. Documentation Agent Scope: Does the Documenter Agent chatmode specify boundaries (what it must not change) and required inputs consistent with Stage 04 description? List any missing boundary clarifications.
18. Status Agent Trigger Points: Do documented triggers in Status Agent chatmode match those enumerated in `paw-specification.md`? Note any omissions or additions.
19. Guardrail Migration Candidates: Identify guardrail / negative instruction categories present in any one mature chatmode but absent in all others (produce category list & source chatmode).
20. Ambiguity Hotspots: List any phrases across chatmodes that could be interpreted variably (e.g., "update", "refine", "research" without scope qualifiers) along with file & line reference if feasible.

### Optional External / Context
1. Industry Prompting Patterns: Are there external established prompt structuring patterns (e.g., widely cited specification or research agent frameworks) that could inspire missing sections? (Manual)
2. Comparative Agent Benchmarks: What benchmark criteria (latency, accuracy, reusability) might be used later to evaluate improved chatmodes? (Manual)
3. Legal / Compliance Considerations: Any domain compliance constraints that would affect prompt guardrails? (Manual)
4. Accessibility / Inclusion Prompting Guidelines: Are there standards to reflect in documentation or review prompts? (Manual)
5. External taxonomy alignment: Should naming align with any recognized industry lifecycle terminology beyond PAW? (Manual)
