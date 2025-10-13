# Spec Research: Finalize Initial Agent Chatmodes

## Summary
Internal review identified comprehensive behavioral definitions for Spec, Spec Research, Code Research, Implementation Planning, Implementation Execution, and Status Update modes, with missing/empty definitions for Implementation Reviewer, Documenter, and PR Agent. Core internal strengths: explicit specification quality checklist, rigorous research vs clarification taxonomy at spec stage, execution phase pause gates, and status surface maintenance. Gaps: absent review/documentation/PR behaviors, inconsistent artifact directory conventions (`docs/agents/<branch>` vs `docs/agent/<description>`), incomplete traceability past specification, lack of unified quality checklists for research, planning, implementation review, documentation, PR readiness, and no defined documentation or reviewer artifacts. External standards (requirements quality—ISO/IEC/IEEE 29148; traceability & test documentation—IEEE 829; security assurance—OWASP ASVS & Top 10; code review hygiene—Google Engineering Practices; documentation structure—Diátaxis & Write the Docs; multi‑agent workflow risks—industry articles; empirical research rigor—ACM SIGSOFT empirical standards) highlight additional best‑practice categories not fully mirrored internally (systematic review rigor checklist, documentation content taxonomy, formal code review criteria, security risk referencing, RTM maintenance, multi‑agent handoff validation). No design changes proposed—only current state documented with external context.

## Internal System Behavior

### Spec Agent (PAW-01A)
* Responsibilities: Convert issue/brief to structured specification (user stories, FR-###, SC-###, edge cases, assumptions, risks, scope, traceability, references). Generates research prompt when needed; pauses until research and clarifications resolved; produces readiness checklist.
* Guardrails: Prohibits implementation details, commits, PR/Issue updates; never fabricate; must pause after research prompt creation; ensures all clarifications resolved before drafting; enumerated “NEVER/ALWAYS” rules and Spec Quality Checklist.
* Step Sequence: Intake → Story drafting → Unknown classification (clarification vs research vs assumption) → Research prompt file creation → Pause → Integrate research → Assemble spec (traceability mapping) → Quality checklist validation → Hand-off.
* Traceability: Explicit story ↔ FR ↔ SC linkage, IDs FR-### / SC-###; references research doc path.
* Inputs/Outputs: Inputs (Issue, constraints, SpecResearch.md); Outputs (`prompts/spec-research.prompt.md`, spec text, optional `Spec.md`).
* Pauses: After prompt generation; if clarifications unresolved; before finalization pending checklist pass.
* Naming: Research prompt path fixed; research doc referenced at `docs/agents/<branch>/SpecResearch.md`.

### Spec Research Agent (PAW-01B)
* Responsibilities: Answer internal system & external knowledge questions from `SpecResearch.prompt.md`; produce `SpecResearch.md` with separated sections; cite sources; list open unknowns.
* Guardrails: No proposals; no speculative external claims without citation; must separate internal vs external; list unanswered questions; no commits/issue updates.
* Step Sequence: Read prompt → Explore repo for internal answers → Perform external searches → If tools absent, produce manual checklist → Produce `SpecResearch.md` at `docs/agents/<branch>/SpecResearch.md` → Provide content.
* Traceability: Provides research evidence and citations; does not create requirement IDs.
* Inputs/Outputs: Input (prompt file); Output (`SpecResearch.md`).
* Pauses: Not explicitly defined (single pass behavior).
* Naming: Branch-based directory under `docs/agents/<branch>/`.

### Codebase Researcher Agent (PAW-02A)
* Responsibilities: Document existing codebase (what, where, how) via code location, analysis, pattern finder; produce research document with frontmatter and sections (Summary, Detailed Findings, Architecture, etc.).
* Guardrails: Extensive DO NOT list—no improvements, critiques, refactors, recommendations, or speculation; must read mentioned files fully first.
* Step Sequence: Initial query intake → Read mentioned files fully → Decompose research → Todo plan → Comprehensive research (location, analysis, patterns) → Synthesize → Gather metadata (script) → Generate document → Present findings → Handle follow-ups with versioned updates.
* Traceability: Provides file:line references; no structured FR/SC mapping.
* Inputs/Outputs: Input (research question or Spec.md); Output (`docs/agent/<description>/YYYY-MM-DD(-ENG-XXXX)-research.md`).
* Pauses: Wait after initial prompt if no query; otherwise continuous until presenting findings.
* Naming: Uses `docs/agent/` (singular) path and date/topic naming differing from Spec Research.

### Implementation Planner (PAW-02B)
* Responsibilities: Create detailed implementation plan (phases, success criteria—automated vs manual, what not doing, testing strategy, performance, migration notes). Requires full context gathering and code verification.
* Guardrails: Mandates full file reading, skepticism, interactive iteration, no open questions in final plan; lacks explicit formal “DO NOT” list.
* Step Sequence: Gather & read context → Verify understanding & ask focused questions → Research & discovery with todos → Present design options → Plan structure proposal (pause for feedback) → Detailed plan writing using template → Review & iterate.
* Traceability: Not formally linking back to FR/SC IDs; references research docs optionally.
* Inputs/Outputs: Inputs (Issue, spec, research docs); Output (`docs/agent/{description}/YYYY-MM-DD(-ENG-XXXX)-plan.md`).
* Pauses: After structure proposal; iterative questions.
* Naming: Same `docs/agent/` pattern as code research.

### Implementation Agent (PAW-03A)
* Responsibilities: Execute plan phases; manage phase branches (`_phaseN` or `_phaseM-N`); update plan checkboxes; handle PR review comments individually; enforce pause for manual verification per phase.
* Guardrails: Only commit related changes; pause on plan mismatch; structured phase completion status message; do not mark manual tests without user confirmation.
* Step Sequence: Ensure branch naming & plan reading → Phase implementation → Automated verification → Pause for manual verification → Commit & PR updates → Next phase / review cycle.
* Traceability: Indirect—depends on plan; no mandated FR/SC/test mapping.
* Inputs/Outputs: Inputs (implementation plan, PR review comments); Outputs (code commits, updated plan, phase PRs).
* Pauses: After each phase (unless multi-phase directive); after addressing review comments.
* Naming: Branch suffix `_phaseN` / `_phaseM-N` pattern; no explicit doc file creation.

### Implementation Reviewer (PAW-03B)
* File empty: No responsibilities, guardrails, steps, artifacts defined.

### Documenter (PAW-04)
* File empty: No documentation process, artifact naming, completeness criteria.

### PR Agent (PAW-05)
* File empty: No PR creation strategy, description template, readiness checklist.

### Status Updater Agent (PAW-X)
* Responsibilities: Maintain Issue top status block and PR summary blocks with artifacts list, PR states, checklist; idempotent updates; add milestone comments.
* Guardrails: Never alter content outside markers; not merging, assigning reviewers, or modifying code; idempotency enforced; add TODO lines if missing artifacts.
* Step Sequence: Trigger-driven updates (spec approval, PR open/merge events, etc.)—no defined interactive pause.
* Traceability: Lists artifacts and phase states but no FR/SC/test linkage.
* Inputs/Outputs: Inputs (artifact paths, Issue/PR references); Outputs (updated Issue/PR text blocks, milestone comments).
* Pauses: None defined.
* Naming: Uses generic artifact file names; does not enforce directory conventions.

### Cross-Cutting Internal Observations
* Auth/security/observability: Not addressed in any chatmode definitions (left to future design or plan content).
* Error handling patterns: Only spec stage defines discrepancy handling (Issue vs research). Implementation Agent defines mismatch reporting between plan and code reality.
* Quality checklists exist only for spec stage (Spec Quality Checklist) and partially embedded success criteria patterns in planning/implementation. No formal research, code review, documentation, or PR readiness checklists.
* Consistency Gaps: Directory naming mismatch (`docs/agents/<branch>` vs `docs/agent/<description>`), absent roles, mixed pause semantics, only partial traceability continuation past specification.

## Endpoints/CLIs/Jobs
(No code endpoints or scripts enumerated inside chatmode definitions except reference to running a metadata script in Codebase Researcher; details of that script not described.)

## Cross-cutting (Internal)
* Pausing/Gating: Implemented at spec research handoff, spec drafting readiness, plan structure approval, per implementation phase; absent for review, documentation, final PR, and status updates.
* Traceability: Strong at spec stage; weak downstream (no enforcement to tie plan phases or tests back to FR/SC).
* Risk Controls: Fabrication prevention and scope boundaries present early; drift, review quality, documentation completeness, and security oversight not explicitly controlled later.

## External Knowledge & Best Practices
### Standards & Guidelines
* ISO/IEC/IEEE 29148 – Requirements engineering quality characteristics (completeness, unambiguity, consistency, traceability, feasibility, verifiability). (https://cdn.standards.iteh.ai/...)
* IEEE 829 – Structured test documentation enabling traceability from test plans to test cases. (https://people.eecs.ku.edu/~hossein/Teaching/Stds/829-1998.pdf)
* OWASP ASVS – Application security verification levels (1–3) guiding security control depth. (https://devguide.owasp.org/en/03-requirements/05-asvs/)
* OWASP Top 10 (2021) – Common web application risk categories (Broken Access Control, Injection, etc.). (https://sucuri.net/guides/owasp_top_10_2021_edition/)
* ACM SIGSOFT Empirical Standards – Criteria for empirical research rigor, transparency, and reporting. (https://www2.sigsoft.org/EmpiricalStandards/)

### Comparable Patterns / Industry Norms
* Google Engineering Code Review Practices – Emphasis on code health improvement, design/functionality validation, adequate tests, respectful feedback. (https://sourceforge.net/projects/google-engineering-docs.mirror/)
* Diátaxis Framework – Documentation partitioned into Tutorials, How-To Guides, Reference, Explanation, clarifying content purpose separation. (https://diataxis.fr/)
* Write the Docs Guide – Documentation lifecycle: audience targeting, structure, accuracy, maintenance, feedback loops. (https://www.writethedocs.org/guide/index.html)
* Multi-agent Workflow Orchestration Best Practices – Emphasis on reliable handoffs, artifact schema validation, role specialization, drift prevention. (https://skywork.ai/blog/ai-agent-orchestration-best-practices-handoffs/)

### Performance / Reliability Benchmarks (If applicable)
* (Not explicitly sourced in current internal materials; external sources above focus on quality, security, documentation, process. No specific numeric performance benchmarks gathered—outside scope of chatmode finalization.)

### Risks / Compliance / Regulatory Notes
* Security verification depth (OWASP ASVS) aligns with need for stage-specific security consideration (currently absent internally outside spec assumptions).
* Common vulnerability classes (OWASP Top 10) indicate risk categories not explicitly referenced in any chatmode guidance.
* Requirements/test traceability (IEEE 829) underscores missing end-to-end FR→Test mapping in downstream roles.
* Research rigor standards (ACM SIGSOFT) highlight absent formal research quality checklist for Spec Research and Codebase Research roles.
* Documentation taxonomy (Diátaxis) indicates missing structured documentation role behaviors (Documenter empty file).

### Source Citations
1. ISO/IEC/IEEE 29148:2018 – Requirements engineering characteristics – https://cdn.standards.iteh.ai/samples/72089/d67a2360308046938cad282e229a39ca/ISO-IEC-IEEE-29148-2018.pdf (accessed 2025-10-12)
2. IEEE 829 Standard for Software Test Documentation – https://people.eecs.ku.edu/~hossein/Teaching/Stds/829-1998.pdf (accessed 2025-10-12)
3. OWASP ASVS Developer Guide – https://devguide.owasp.org/en/03-requirements/05-asvs/ (accessed 2025-10-12)
4. OWASP Top Ten 2021 (summary) – https://sucuri.net/guides/owasp_top_10_2021_edition/ (accessed 2025-10-12)
5. Google Engineering Practices (Code Review) – https://sourceforge.net/projects/google-engineering-docs.mirror/ (accessed 2025-10-12)
6. Diátaxis Framework – https://diataxis.fr/ (accessed 2025-10-12)
7. Write the Docs Guide – https://www.writethedocs.org/guide/index.html (accessed 2025-10-12)
8. Multi-Agent Orchestration Handoffs – https://skywork.ai/blog/ai-agent-orchestration-best-practices-handoffs/ (accessed 2025-10-12)
9. ACM SIGSOFT Empirical Standards – https://www2.sigsoft.org/EmpiricalStandards/ (accessed 2025-10-12)
10. IEEE 829 overview (Reqtest) – https://reqtest.com/en/knowledgebase/how-to-write-a-test-plan-2/ (accessed 2025-10-12)

## Evidence
* Internal: Chatmode files in `.github/chatmodes/` (see Internal System Behavior section for per-file mapping). Empty files: Implementation Reviewer, Documenter, PR Agent.
* External: Source list above (1–10) underpinning quality, security, documentation, code review, traceability, multi-agent coordination, research rigor categories.

## Open unknowns
* Intended behavioral definitions for Implementation Reviewer (scope, checklist, artifact naming, handoff points) – file empty.
* Intended behavioral definitions for Documenter (documentation artifact type, completeness checklist, taxonomy usage) – file empty.
* Intended behavioral definitions for PR Agent (when to open planning/phase/final PRs, description template, readiness checklist) – file empty.
* Decision on unifying directory naming (`docs/agents/<branch>` vs `docs/agent/<description>`) – currently inconsistent; no internal guidance.
* Mechanism (if any) for maintaining traceability (FR/SC) through planning, implementation, tests, PRs – absent.
* Strategy for documenting or validating security considerations across phases (beyond spec assumptions) – undefined.
* Formal research quality checklist (Spec Research & Codebase Research) – not defined internally.
* Code review quality criteria and Reviewer role responsibilities – undefined.
* Documentation artifact path and required sections (e.g., alignment to Diátaxis types) – unspecified.
* Final PR readiness or release checklist (integration of all artifacts) – absent.

## User-Provided External Knowledge (Optional Manual Fill Section)
(No external tool limitations encountered; all required external categories sourced. Leave blank unless user wants to augment with organization-specific standards.)
