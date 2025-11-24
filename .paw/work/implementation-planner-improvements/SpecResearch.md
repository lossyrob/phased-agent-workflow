# Spec Research: Implementation Planner Improvements

## Summary

The Implementation Planner agent (`PAW-02B Impl Planner.agent.md`) is responsible for creating detailed implementation plans through an interactive, iterative process. The agent currently emphasizes thoroughness, includes specific implementation code snippets in plans, and handles PR creation/pushing after planning. Research reveals several areas where the agent's behavior and guidance shape its outputs:

1. The agent is structured around two operating modes (initial planning and PR review response) with extensive instructions for research, interactive collaboration, and detailed plan writing.
2. Plans follow a template that includes code snippets, specific file paths, and detailed technical implementation steps.
3. The agent has explicit instructions to commit and push planning artifacts and create Planning PRs after plan completion.
4. PR comment formatting uses the PAW signature `🐾 Generated with [PAW](...)` but lacks agent-specific identification in comments.
5. Other PAW agents provide examples of phase-level summaries (Implementation Agent phase notes, Documenter summary sections) that focus on high-level accomplishments.
6. The Documenter agent has explicit guidance to avoid implementation detail reproduction and focus on behavioral documentation, creating a separation between plan detail and documentation abstraction.

## Research Findings

### Question 1: Where are the Implementation Planner agent instructions located in the codebase? What is the file path and structure?

**Answer:**

The Implementation Planner agent instructions are located at:
- **File path**: `agents/PAW-02B Impl Planner.agent.md`
- **Format**: Chatagent markdown file with YAML frontmatter
- **Directory structure**: Part of the `agents/` directory containing all PAW agent definitions

The file uses the `.agent.md` extension and includes:
- YAML frontmatter with description metadata
- Markdown-formatted instructions divided into clear sections
- Code blocks showing examples and templates
- Structured hierarchy of headers and subsections

**Evidence:** File read of `agents/PAW-02B Impl Planner.agent.md` confirms location and structure. The agents directory contains 15 total agent definition files following the same naming convention.

**Implications:** Changes to planner behavior require editing this single agent definition file. The file structure follows consistent PAW patterns shared across all agents.

---

### Question 2: What is the current content and organization of the Implementation Planner agent instructions? What sections exist and how detailed are they?

**Answer:**

The Implementation Planner agent instructions are approximately 600 lines and highly detailed. Major sections include:

1. **Role definition and initial response** - Explains the agent's purpose and startup behavior
2. **WorkflowContext.md Parameters** - Defines how to extract and manage workflow metadata
3. **PAW Workflow Mode and Review Strategy Handling** - Detailed branching and PR strategy logic
4. **Agent Operating Modes** - Separates initial planning from PR review response workflows
5. **Process Steps** - Four-step methodology (Context Gathering, Research & Discovery, Plan Structure Development, Detailed Plan Writing, and Review)
6. **Plan template** - Complete markdown template with all sections and structure
7. **Important Guidelines** - Eight principles including "Be Skeptical", "Be Interactive", "Be Thorough", "Be Practical"
8. **Quality Checklist** - Pre-completion validation items
9. **Hand-off** - Messages for transitioning to next agent
10. **Success Criteria Guidelines** - Guidance on automated vs manual verification
11. **Common Patterns** - Domain-specific planning patterns
12. **Comprehensive Research** - Detailed instructions for code location and analysis

The instructions are highly prescriptive with specific workflows, templates, and decision trees. The agent is designed for thorough, interactive planning with multiple human checkpoints.

**Evidence:** Complete file read showing extensive section structure and detailed subsections within each major area.

**Implications:** The agent has substantial existing guidance that shapes its planning approach. Modifications need to consider how changes interact with existing instructions.

---

### Question 3: How does the Implementation Planner currently structure implementation plans? What sections/phases are typically included?

**Answer:**

Implementation plans follow a standardized template structure defined in the agent instructions (Step 4: Detailed Plan Writing). The template includes:

**Plan-level sections:**
1. **Overview** - Brief description of what's being implemented
2. **Current State Analysis** - Existing state and constraints discovered
3. **Desired End State** - Specification of final state and verification
4. **Key Discoveries** - Important findings with file:line references
5. **What We're NOT Doing** - Explicit out-of-scope items
6. **Implementation Approach** - High-level strategy

**Per-phase sections:**
1. **Phase N: [Descriptive Name]**
   - **Overview** - What the phase accomplishes
   - **Changes Required** - Organized by component/file group with file paths and specific code snippets
   - **Success Criteria** - Split into automated and manual verification sections with checkboxes

**Post-phases sections:**
1. **Testing Strategy** - Unit tests, integration tests, manual testing steps
2. **Performance Considerations** - Performance implications
3. **Migration Notes** - Data/system migration handling
4. **References** - Links to artifacts and related code

Each phase contains **specific implementation code** in code blocks showing what to add or modify. Changes include file paths, function names, and actual code snippets.

**Evidence:** Template structure directly from the agent instructions under "Step 4: Detailed Plan Writing". The template explicitly shows code blocks within the Changes Required subsections.

**Implications:** Plans are currently designed to be code-level detailed with specific implementation guidance. Changes to reduce code detail would require template modifications and new guidance.

---

### Question 4: What existing guidance does the Implementation Planner have about code detail level and when to include implementation code vs descriptions?

**Answer:**

The Implementation Planner currently has **extensive guidance emphasizing code-level detail**:

**Guidance favoring implementation code:**
- "Include specific file paths and line numbers"
- "All phases contain specific file paths, functions, or components to change" (Quality Checklist)
- Template shows code blocks within Changes Required sections: ` ```[language] // Specific code to add/modify ```
- "Be Thorough: Read all context files COMPLETELY before planning, Research actual code patterns using parallel sub-tasks, Include specific file paths and line numbers"
- Step 1 emphasizes presenting "Current implementation detail with file:line reference"

**No existing guidance for:**
- When to use high-level descriptions instead of code
- How to decide appropriate detail level
- Balancing strategic overview with tactical specifics
- Keeping plans maintainable as implementation evolves

The agent is explicitly instructed to be thorough and specific, with code examples as the default approach shown in the template.

**Evidence:** Multiple sections throughout the agent instructions emphasize specificity, file:line references, and code-level detail. The plan template includes code block examples as standard practice.

**Implications:** The current instructions actively guide toward detailed code inclusion. Introducing guidance for high-level thinking would require counterbalancing existing detail-oriented instructions.

---

### Question 5: How does the Implementation Planner currently handle workflow transitions after creating a plan? What instructions exist for committing, pushing, and creating PRs?

**Answer:**

The Implementation Planner has **explicit, detailed instructions for committing, pushing, and creating Planning PRs**. These instructions appear in Step 4 (Review, item 5) under "DETERMINE REVIEW STRATEGY AND COMMIT/PUSH":

**For 'prs' review strategy (default):**
1. Ensure on planning branch: `git branch --show-current`, create if needed: `git checkout -b <target_branch>_plan`
2. Stage artifacts: `git add .paw/work/<feature-slug>/{Spec.md,SpecResearch.md,CodeResearch.md,ImplementationPlan.md}` and prompt files
3. Verify: `git diff --cached`
4. Commit with detailed message
5. Push: `git push -u <remote> <target_branch>_plan`
6. Create Planning PR (`<target_branch>_plan` → `<target_branch>`):
   - Title: `[<Work Title>] Planning: <brief description>`
   - Summary of deliverables with artifact links
   - Footer: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`
7. Pause for review

**For 'local' review strategy:**
1. Ensure on target branch
2. Stage artifacts, verify, commit
3. Push to target branch
4. Skip Planning PR creation

The agent has complete instructions for git operations, PR creation, and branch management. This is marked as **"REQUIRED"** and **(Initial Planning Only - REQUIRED)** in the instructions.

**Evidence:** Direct quotes from Step 4 item 5 showing the complete workflow transition instructions including git commands, PR creation requirements, and review strategy branching.

**Implications:** The planner currently owns the entire planning-to-PR workflow including git operations. Changes to shift PR responsibilities to another agent would require removing/modifying these sections.

---

### Question 6: What is the current behavior for PR comment formatting? Is there existing guidance about agent identification or signatures?

**Answer:**

The Implementation Planner includes **PAW project signature** but **no agent-specific identification** in PR descriptions:

**Current behavior:**
- Planning PR descriptions end with: `🐾 Generated with [PAW](https://github.com/lossyrob/phased-agent-workflow)`
- This signature identifies the PAW system but not which agent created the PR
- No instructions for including agent identity in PR comments or descriptions

**Comparison with other agents:**
- **Implementation Review Agent (PAW-03B)**: Uses `**🐾 Implementation Reviewer 🤖:**` prefix for PR comments, providing clear agent identification
- **Documenter Agent (PAW-04)**: Uses `**🐾 Documenter 🤖:**` prefix for PR summary comments
- **Final PR Agent (PAW-05)**: Uses the generic PAW signature without agent identification

The Implementation Planner follows the Final PR pattern (generic signature) rather than the Implementation Review/Documenter pattern (agent-specific identification).

**Evidence:** 
- Implementation Planner instructions show only the generic PAW footer for Planning PRs
- Implementation Review Agent instructions explicitly show `**🐾 Implementation Reviewer 🤖:**` prefix (multiple occurrences)
- Documenter Agent instructions show `**🐾 Documenter 🤖:**` prefix for summary comments
- Final PR Agent shows only generic PAW signature

**Implications:** Adding agent identification to Planning PR comments would align with the pattern established by Implementation Review and Documenter agents, improving traceability of agent actions.

---

### Question 7: Are there examples of phase summaries or high-level overviews in other PAW agent outputs that could serve as templates?

**Answer:**

Yes, several PAW agents demonstrate **phase-level summary patterns** that focus on high-level accomplishments:

**Implementation Agent (PAW-03A) - Phase completion summaries:**
- After completing a phase, writes "a new summary and status update to the plan file at the end of the Phase [N] section"
- Notes "that the phase is completed and any notes that can inform agents working on future phases"
- Notes "any review tasks for any specific code reviewers should take a close look at and why"
- When addressing review comments: "Append a new summary that starts with 'Addressed Review Comments:'"

The focus is on **what was accomplished** and **guidance for future work**, not implementation minutiae.

**Spec Researcher Agent (PAW-01B) - Document structure:**
- Includes "Summary (1-2 paragraphs): Key findings overview" section
- Focuses on answering questions factually without exhaustive detail
- Explicitly instructs: "Keep answers concise: Answer questions directly with essential facts only. Avoid exhaustive lists, lengthy examples, or unnecessary detail"

**Implementation Review Agent (PAW-03B) - Summary comments:**
- Posts "comprehensive summary comment" on PRs with two sections
- Section 1: Detailed comment tracking
- Section 2: "Overall summary" of changes and accomplishments
- Uses `**🐾 Implementation Reviewer 🤖:**` prefix for identification

**Documenter Agent (PAW-04) - High-level documentation approach:**
- Explicitly avoids code reproduction: "What NOT to Include in Docs.md: Code reproduction, Internal implementation details, Exhaustive API documentation"
- Focuses on: "Design decisions and rationale, Architecture and integration points, User-facing behavior, How to test/exercise the work"
- Includes "Overview" section with "Comprehensive description of what was implemented, its purpose, and the problem it solves"

**Evidence:** Direct quotes from agent instructions showing summary section requirements and guidance emphasizing high-level overviews over detailed implementation.

**Implications:** The PAW workflow already has established patterns for phase-level summaries focused on accomplishments and guidance. These patterns could inform Implementation Planner output structure to separate strategic overview from tactical detail.

---

### Question 8: What is the relationship between the Implementation Planner and the Documenter agent? Is there explicit guidance about when documentation should be created?

**Answer:**

The relationship between Implementation Planner and Documenter is **sequential and complementary** with clear separation of concerns:

**Implementation Planner responsibilities:**
- Creates `ImplementationPlan.md` with phases, changes, and success criteria
- Includes technical implementation details, code snippets, and file paths
- Focuses on **how to implement** the work

**Documenter responsibilities (PAW-04):**
- Creates `Docs.md` after "all implementation phases must be complete and merged"
- Reads `Spec.md`, `ImplementationPlan.md`, and merged Phase PRs to understand what was implemented
- Documents **what was implemented and why**, not how to implement it
- Explicitly avoids reproducing implementation detail: "DO NOT restate what's already in the code via comments/docstrings, Focus on reusable components/APIs not every function/class"

**Explicit timing guidance:**
- Documenter prerequisites: "All phase PRs are merged, `ImplementationPlan.md` shows all phases with 'Completed' status"
- If prerequisites not met: "STOP and inform the user what's missing"

**Separation of detail levels:**
- Implementation Plan: Tactical, code-level, implementation-focused
- Docs.md: Strategic, behavioral, user-focused
- Documenter instructions state: "Docs.md is comprehensive documentation of the implemented work, not a list of changes"

**No explicit connection from Planner to Documenter:**
- Implementation Planner hand-off mentions "Invoke Implementation Agent (Stage 03)" but doesn't reference documentation stage
- Documenter is invoked after all phases complete, not referenced during planning

**Evidence:** 
- Documenter agent prerequisites section explicitly requiring completed implementation
- Documenter's "What NOT to Include" section showing avoidance of implementation detail
- Implementation Planner template structure showing code-level detail
- Sequential workflow: Planning → Implementation → Documentation

**Implications:** The agents are designed to produce different abstraction levels - plans are tactical implementation guides while documentation is strategic behavioral overview. However, there's no explicit guidance in the Planner about avoiding over-specification or maintaining the right abstraction level for plans.

---

## Open Unknowns

None - all internal questions were successfully answered through codebase exploration.

## User-Provided External Knowledge (Manual Fill)

Below is generated via GPT. These are recommendations, and are not direct instructions.

---

## 1) Best practices for agent instruction design that keep thinking *high level* (architectural, not codey)

**Anchor the abstraction level.**

* Tell the planner to reason explicitly at the **system → container → component → code** ladder and to stop at the *container/component* levels unless a blocking risk demands lower detail. (This mirrors the C4 model’s tiers and helps avoid drift into code.) ([C4 model][1])

**Decide-by-trade‑off, not by taste.**

* Require the agent to present **2–3 viable options with trade‑offs** against quality attributes (performance, reliability, security, operability), then select a preferred option with rationale. This follows architecture evaluation practices like **ATAM**. ([SEI][2])

**Record decisions separately from plans.**

* Instruct the agent to create/update **Architecture Decision Records (ADRs)** for any architecturally‑significant decision; keep the plan clean and link out to ADRs. (This also lowers the urge to stuff codey details into the plan.) ([Cognitect.com][3])

**Plan outcomes and guardrails, not code.**

* Have the planner define **success criteria** tied to **SLIs/SLOs** (e.g., p95 latency, error rate) and **observability hooks** (the SRE “four golden signals”) instead of implementation fragments. ([Google SRE][4])

**Rollout strategies over micro‑optimizations.**

* Require a **feature‑flag/gradual rollout** plan (release toggles, experiment toggles) and explicit rollback/kill‑switch paths; this channels energy into safe delivery rather than early micro‑tuning. ([martinfowler.com][5])

**Phase gates with entry/exit criteria.**

* Structure the plan into **phases** (discovery/spikes, design, implementation, validation, rollout), each with **entry/exit** conditions and produced **artifacts**. Use a “Definition of Done” per phase to focus on outcomes, not code. ([scrumguides.org][6])

**Name non‑goals, assumptions, unknowns.**

* Make the planner enumerate **non‑goals**, **assumptions**, and **unknowns** with **spikes** to de‑risk them. (This prevents the agent from filling gaps with premature detail.)

**Anti‑over‑spec guardrails (explicit).**

* “Do **not** include code or pseudo‑code longer than a few lines; prefer interface names and contracts.”
* “Refer to libraries/frameworks as *options* with trade‑offs; avoid hard commitments unless justified by constraints or existing stack.”
* “Apply **YAGNI** and avoid **premature optimization**; optimize only where the plan’s success criteria demand it.” ([martinfowler.com][7])

---

## 2) Prompt‑engineering patterns that reduce over‑specification & premature optimization

**a) Plan‑then‑solve / least‑to‑most.**
Make the agent draft a **coarse plan first** (subgoals) and only then elaborate *just enough* to execute. Research shows **Plan‑and‑Solve** and **Least‑to‑Most** prompting improve reasoning by decomposing tasks before solving—perfect for keeping PAW‑02B at the right altitude. ([arXiv][8])

**b) Explore alternatives before committing.**
Use **Tree‑of‑Thoughts** to generate a *small* set of competing high‑level approaches and pick one via self‑evaluation; this encourages breadth over depth early. Combine with **Self‑Consistency** to avoid locking into one arbitrary detailed path. ([arXiv][9])

**c) Reason–act separation.**
Adopt a **ReAct‑style loop** where “reasoning” (trade‑offs, risks) is separated from “actions” (e.g., create ADR, schedule spike). This keeps the planner’s *thinking* strategic and its *actions* procedural—not code. ([arXiv][10])

**d) Meta‑prompting & output schemas.**
Use meta‑instructions that: define **persona** (“architect, not coder”), **goals**, **constraints**, and a **strict output schema** (sections below). Meta‑prompting patterns and prompt catalogs emphasize role, constraints, and format to control scope and verbosity. ([Prompting Guide][11])

**e) Quality‑attribute orientation.**
Force evaluation against **ISO/IEC 25010** quality characteristics (security, reliability, performance efficiency, maintainability, portability, etc.). This steers the agent toward **cross‑cutting concerns** instead of code. ([ISO][12])

**f) Delivery‑first patterns.**
Bake in **feature‑flag rollouts** and **PR slicing** as required outputs; these patterns nudge toward iterative delivery rather than polishing internals too soon. ([martinfowler.com][5])

**g) YAGNI / avoid premature optimization.**
Make these principles explicit in the system prompt so the model treats them as constraints, not suggestions. ([martinfowler.com][7])

---

## Drop‑in changes you can make to **PAW‑02B** (Implementation Planner)

**A. System prompt (excerpt):**

> **Role & altitude.** You are PAW‑02B, the *Implementation Planner*. Operate at **C4 container/component** level. Deliver **phases, success criteria, risks, and decision records**.
> **Do not** include code or pseudo‑code longer than a few lines. Prefer interface names, contracts, and data‑flow notes.
> **Approach.**
>
> 1. Generate 2–3 approach **options** with trade‑offs against quality attributes (ISO/IEC 25010). Select one and justify.
> 2. Convert the selection into **phased work** with **entry/exit** criteria and artifacts (Definition of Done per phase).
> 3. Define **SLIs/SLOs** and an **observability plan** (four golden signals) as success criteria.
> 4. Identify **unknowns** and propose **spikes**, time‑boxed.
> 5. Create/update **ADRs** for significant choices.
> 6. Plan **rollout** using **feature flags** with fallback/rollback.
>    **Guardrails.** Avoid library lock‑in unless required by constraints or prior stack. Apply **YAGNI**. Avoid **premature optimization**; justify any optimization via SLOs.

(References: C4, ADRs, ATAM, ISO 25010, SRE golden signals, feature flags, YAGNI.) ([C4 model][1])

**B. Output schema (what PAW‑02B should emit):**

1. **Scope & Non‑Goals**
2. **Constraints & Assumptions**
3. **Options & Trade‑offs (ATAM‑style)** → *Preferred approach*
4. **Architecture at the right level** (C4: context, containers, key components & interfaces; data flows)
5. **Phases & Milestones** (each with *objective, entry/exit criteria, artifacts*, and *handoff notes to next PAW agent*)
6. **Risks, Unknowns & Spikes** (with owners & time boxes)
7. **Quality Attributes & Success Criteria** (ISO 25010), **SLIs/SLOs** & **Observability plan** (golden signals)
8. **Rollout/Release Strategy** (feature flags, canary/gradual, rollback)
9. **ADRs to create/update** (titles + short “why now”)
10. **Handoff Checklist for Implementation Agent** (files/folders to touch at a *path level*, test strategy outline, docs to author)
11. **Open Questions**

**C. Anti‑over‑spec checks (have the agent self‑evaluate before finalizing):**

* Did I include **code** or concrete algorithm/pseudo‑code beyond brief illustrations? *Remove it.*
* Did I lock in a **specific library** without listing alternatives and trade‑offs? *Add options/ADRs.*
* Can each phase’s **exit** be measured via SLOs/acceptance tests rather than reading code? *If not, fix.*
* Do risks/unknowns have **spikes** and owners? *Add them.*
  (These checks operationalize ReAct/plan‑then‑solve without drifting into implementation.) ([arXiv][10])

---

### Why this works

* **Architectural lenses (C4 + ADR + ATAM)** keep the agent at the strategic layer and encode how to **justify** choices without code. ([C4 model][1])
* **Decomposition patterns (Plan‑and‑Solve, Least‑to‑Most, ToT, Self‑Consistency)** make the model explore and compare **approaches** before elaborating, which naturally curbs over‑spec. ([arXiv][8])
* **SRE metrics & feature flags** move “what good looks like” to **measurable outcomes and safe delivery**, not lines of code. ([Google SRE][4])
* **YAGNI / anti‑premature optimization** are spelled out as *hard constraints*, not slogans, preventing the common failure mode you’re observing. ([martinfowler.com][7])


[1]: https://c4model.com/?utm_source=chatgpt.com "Home | C4 model"
[2]: https://www.sei.cmu.edu/documents/629/2000_005_001_13706.pdf?utm_source=chatgpt.com "ATAM:Method for Architecture Evaluation - Carnegie Mellon University's ..."
[3]: https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions?utm_source=chatgpt.com "Documenting Architecture Decisions - Cognitect.com"
[4]: https://sre.google/sre-book/monitoring-distributed-systems/?utm_source=chatgpt.com "Google SRE monitoring ditributed system - sre golden signals"
[5]: https://martinfowler.com/articles/feature-toggles.html?utm_source=chatgpt.com "Feature Toggles (aka Feature Flags) - Martin Fowler"
[6]: https://scrumguides.org/docs/scrumguide/v2020/2020-Scrum-Guide-US.pdf?utm_source=chatgpt.com "The Scrum Guide"
[7]: https://martinfowler.com/bliki/Yagni.html?utm_source=chatgpt.com "Yagni - Martin Fowler"
[8]: https://arxiv.org/abs/2305.04091?utm_source=chatgpt.com "Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models"
[9]: https://arxiv.org/abs/2305.10601?utm_source=chatgpt.com "Tree of Thoughts: Deliberate Problem Solving with Large Language Models"
[10]: https://arxiv.org/abs/2210.03629?utm_source=chatgpt.com "ReAct: Synergizing Reasoning and Acting in Language Models"
[11]: https://www.promptingguide.ai/?utm_source=chatgpt.com "Prompt Engineering Guide | Prompt Engineering Guide"
[12]: https://www.iso.org/standard/78176.html?utm_source=chatgpt.com "ISO/IEC 25010:2023 - Systems and software engineering — Systems and ..."
