# Spec Research: Finalize Initial Agent Chatmodes

## Summary

This research examined 9 chatmode files across the PAW workflow to identify gaps, inconsistencies, and maturity differences. Key findings: (1) three chatmodes (Impl Reviewer, Documenter, PR Agent) are empty first-pass files, (2) mature chatmodes (Spec Agent, Code Researcher, Implementer, Impl Planner) contain extensive guardrails and quality checklists absent from first-pass files, (3) naming inconsistencies exist (e.g., "Impl Planner" vs "Implementation Plan Agent"), (4) artifact paths align with canonical spec, (5) stage hand-offs have varying clarity with some missing explicit input/output statements, and (6) Status and PR agents have distinct non-overlapping responsibilities.

## Internal System Behavior

### Q1: Current Chatmode Inventory

**Existing chatmode files by PAW code & title:**

1. **PAW-01A** - Spec Agent (Stage 01: Specification)
2. **PAW-01B** - Spec Research Agent (Stage 01: Specification)
3. **PAW-02A** - Code Researcher (Stage 02: Implementation Plan)
4. **PAW-02B** - Impl Planner (Stage 02: Implementation Plan)
5. **PAW-03A** - Implementer (Stage 03: Phased Implementation)
6. **PAW-03B** - Impl Reviewer (Stage 03: Phased Implementation)
7. **PAW-04** - Documenter (Stage 04: Documentation)
8. **PAW-05** - PR (Stage 05: Final PR)
9. **PAW-X** - Status Update (Cross-stage utility)

**Workflow stage correspondence:**
- Stage 01 (Specification): PAW-01A, PAW-01B
- Stage 02 (Implementation Plan): PAW-02A, PAW-02B
- Stage 03 (Phased Implementation): PAW-03A, PAW-03B
- Stage 04 (Documentation): PAW-04
- Stage 05 (Final PR): PAW-05
- Cross-stage: PAW-X

**Maturity status:**
- **Mature (tested/detailed):** PAW-01A, PAW-01B, PAW-02A, PAW-02B, PAW-03A, PAW-X
- **First-pass (empty or minimal):** PAW-03B (empty), PAW-04 (empty), PAW-05 (empty)

### Q2: Role Split Rationale - Implementer vs Implementation Reviewer

**Current distinctions:**

**Implementer (PAW-03A):**
- Executes approved technical implementation plans
- Implements phases with specific changes and success criteria
- Creates/manages implementation branches (`_phase[N]` or `_phase[M-N]`)
- Addresses PR review comments by creating TODOs for each comment
- Runs automated verification (tests, linting, type checking)
- Updates checkboxes and progress in the implementation plan
- Commits changes with detailed messages
- Uses GitHub MCP tools to push/create PRs
- **Pauses for human verification** after automated checks pass
- Focuses on forward implementation momentum

**Implementation Reviewer (PAW-03B):**
- File is currently **empty** (no instructions exist)

**Expected distinction based on paw-specification.md Stage 03 workflow:**
- Reviewer should: review code changes, suggest improvements, generate docstrings/comments, commit changes, push branches, open Phase PRs
- Reviewer should: reply comment-by-comment on PR reviews, summarize changes
- Distinction suggests Implementer focuses on "making changes work" while Reviewer focuses on "making changes maintainable and documented"

### Q3: Spec vs Spec Research Boundary

**Spec Agent (PAW-01A) responsibilities:**
- Converts Issue/brief into structured feature specification
- Generates `spec-research.prompt.md` with internal (must answer) and optional external/context questions
- Focuses on user value (WHAT & WHY), not implementation
- Prioritizes testable user stories with acceptance criteria
- Resolves clarification questions before drafting spec
- Integrates `SpecResearch.md` findings
- Does **NOT** commit/push/open PRs/update Issues (deferred to Planning stage)
- Output: draft `Spec.md` content and research prompt file

**Spec Research Agent (PAW-01B) responsibilities:**
- Answers internal system behavior questions from `spec-research.prompt.md`
- Produces factual documentation limited to behavioral/structural facts (no code line granularity)
- Does **NOT** perform external/web searches
- Reproduces external/context questions verbatim in "User-Provided External Knowledge" section
- No design, no improvements, no speculation
- Output: `SpecResearch.md` saved to canonical path

**Boundary clarity:**
- Clear separation: Spec Agent produces requirements; Spec Research Agent documents current system behavior
- Spec Agent generates questions; Spec Research Agent answers internal questions only
- Both avoid implementation detail, but Research focuses on "how system behaves today" while Spec focuses on "what new system must do"
- Minor ambiguity: Both documents are drafts not committed by their agents (Planning stage handles commits)

**Overlap/ambiguity:**
- Both emphasize behavioral over implementation detail, but at different abstraction levels
- Research prompt generation by Spec Agent creates tight coupling (appropriate dependency)
- No explicit wording in either chatmode about coordinating on external/context questions handling

### Q4: Research Depth Burden - Code Research Agent

**Directives driving granular code gathering:**

From PAW-02A Code Researcher chatmode:

**Explicit granular directives:**
- "Exact file paths and line numbers for relevant code"
- "Include specific file paths and line numbers for reference"
- "Always include file:line references for claims"
- "Return specific file:line references"
- "Provide full paths from repository root"
- "Read files thoroughly before making statements"
- "Note exact transformations with before/after"
- "Include actual code snippets"
- "Show multiple variations"
- "Include file:line references"

**Section: GitHub Permalinks**
- "Format: `https://github.com/{owner}/{repo}/blob/{commit}/{file}#L{line}`"
- "Ensures links remain valid even as code evolves"

**Higher-level behavioral mapping directives:**
- "Describe what exists, where it exists, how it works, and how components interact"
- "Creating a technical map/documentation of the existing system"
- "Behavioral description" (in contrast to implementation details)
- "Conceptual data flows (no code paths or schema dumps)"
- "Summary: High-level documentation of what was found"

**Tension identified:**
The chatmode contains contradictory guidance:
- Core Principle says: "Conceptual data flows (no code paths)" and focuses on behavioral view
- But COMPREHENSIVE RESEARCH section demands: "file:line references", "exact file paths and line numbers", "Include actual code snippets"
- The distinction from CodeResearch.md is stated as: SpecResearch = behavioral, CodeResearch = implementation with file paths
- However, the chatmode is titled "Code Research Agent" (PAW-02A) not "Spec Research Agent"

**Conclusion:** The Code Research Agent (PAW-02A) directive language emphasizes **granular code line/filename gathering** through repeated file:line reference requirements, specific code snippets, and GitHub permalinks. This contrasts with higher-level behavioral mapping which appears more in summary/principle sections.

### Q5: Guidance Preservation Targets - Critical Guardrails

**Mature chatmodes with guardrail language:**

**PAW-01A Spec Agent:**
- "NEVER: fabricate answers not supported by Issue, SpecResearch, or user-provided inputs"
- "NEVER: silently assume critical external standards"
- "NEVER: produce a spec-research prompt that reintroduces removed sections"
- "NEVER: proceed to final spec if unanswered **critical** internal clarification questions remain"
- "ALWAYS: differentiate *requirements* (what) from *acceptance criteria* (verification)"
- "ALWAYS: pause after writing the research prompt"
- "ALWAYS: surface if external research was skipped and note potential risk areas"
- "ALWAYS: ensure minimal format header lines are present"
- "IMPORTANT:" and "CRITICAL:" prefixes used throughout
- Section: "Guardrails (Enforced)" with 8 explicit rules

**PAW-01B Spec Research Agent:**
- "No design, no improvements"
- "No proposals, refactors, 'shoulds'"
- "No speculative claims—state only what exists or mark as open unknown"
- "Do not commit changes or post comments to GitHub Issues or PRs"
- "Keep answers concise: Answer questions directly with essential facts only. Avoid exhaustive lists"

**PAW-02A Code Researcher:**
- "CRITICAL: YOUR ONLY JOB IS TO DOCUMENT AND EXPLAIN THE CODEBASE AS IT EXISTS TODAY"
- "DO NOT suggest improvements or changes unless the user explicitly asks"
- "DO NOT perform root cause analysis unless the user explicitly asks"
- "DO NOT propose future enhancements"
- "DO NOT critique the implementation or identify problems"
- "DO NOT recommend refactoring, optimization, or architectural changes"
- "ONLY describe what exists, where it exists, how it works"
- "IMPORTANT: Ensure there are no other research steps to complete before proceeding"
- "IMPORTANT: Use the Read tool WITHOUT limit/offset parameters"
- "CRITICAL: DO NOT proceed to research tasks before reading these files"
- "NEVER read files partially"
- Multiple sections with "What not to do" lists

**PAW-02B Impl Planner:**
- "IMPORTANT: Use the Read tool WITHOUT limit/offset parameters to read entire files"
- "CRITICAL: DO NOT proceed to research tasks before reading these files yourself"
- "NEVER read files partially"
- "DO NOT just accept the correction" (when user corrects misunderstanding)
- "DO NOT write the plan with unresolved questions"
- "No Open Questions in Final Plan" section
- "What not to do" lists in research sections

**PAW-03A Implementer:**
- "ONLY commit changes you made to implement the plan. Do not include unrelated changes"
- "Do not revert or overwrite unrelated changes"
- Explicit pause instructions: "Pause for human verification"

**PAW-X Status Update:**
- "Never change content outside AUTOGEN blocks"
- "Never assign reviewers, change labels, or modify code"
- "Be idempotent: re-running should not produce diffs without state changes"

**Missing from first-pass chatmodes (PAW-03B, PAW-04, PAW-05):**

Since these files are empty, ALL guardrail categories are absent:

1. **Scope boundaries** ("DO NOT", "NEVER", "ONLY")
2. **Fabrication prevention** (no making up data/answers)
3. **Idempotency** (re-running safety)
4. **Commit/push restrictions** (what not to modify)
5. **Pause points** (when to wait for human)
6. **File reading completeness** (no partial reads)
7. **Question resolution** (no proceeding with unknowns)
8. **External tool boundaries** (no unauthorized GitHub actions)
9. **Format compliance** (required structures)
10. **Error handling** (what to do when things fail)

### Q6: First-Pass Gaps - Missing Structural Sections

**Untested/First-pass chatmodes:**
- **PAW-03B Impl Reviewer** - empty file
- **PAW-04 Documenter** - empty file
- **PAW-05 PR** - empty file

**Structural sections present in mature chatmodes:**

**Common mature structure:**
1. Description header (YAML frontmatter)
2. Title and role statement
3. Start/Initial Response section
4. Core principles or philosophy
5. Inputs/Parameters section
6. Process Steps or Workflow section
7. Detailed instructions per step
8. Output specifications
9. Guardrails section
10. Error/Edge Handling section
11. Communication Patterns section (some)
12. Quality standards or checklist section (some)
13. Hand-off checklist or completion criteria (some)

**Missing from PAW-03B Impl Reviewer (expected based on Stage 03 workflow description):**
- ALL sections (file empty)
- Expected: Review agent role statement
- Expected: Instructions for reviewing code changes
- Expected: Instructions for suggesting improvements
- Expected: Instructions for generating docstrings/comments
- Expected: Commit and push instructions
- Expected: PR opening instructions
- Expected: Comment-by-comment review reply instructions
- Expected: Summary comment instructions
- Expected: Guardrails on what not to change
- Expected: Quality checklist for code review

**Missing from PAW-04 Documenter (expected based on Stage 04 workflow description):**
- ALL sections (file empty)
- Expected: Documentation agent role statement
- Expected: Inputs specification (ImplementationPlan.md, Phase PRs)
- Expected: Output specification (Docs.md format/structure)
- Expected: Instructions for project documentation updates
- Expected: Boundary clarifications (what not to change)
- Expected: PR creation instructions for docs branch
- Expected: Review comment handling
- Expected: Guardrails on scope
- Expected: Quality checklist for documentation

**Missing from PAW-05 PR (expected based on Stage 05 workflow description):**
- ALL sections (file empty)
- Expected: PR agent role statement
- Expected: Pre-flight validation checks section
- Expected: Prerequisite verification (all phases merged, docs merged, branch updated)
- Expected: PR description crafting instructions
- Expected: Comprehensive summary generation (links to artifacts, phase PRs, changes, impact, testing)
- Expected: Merge/deployment guidance instructions
- Expected: Blocking conditions when checks fail
- Expected: Clear guidance on what must be completed first
- Expected: Guardrails on when to proceed vs block
- Expected: Quality checklist for final PR readiness

### Q7: Consistency Issues - Terminology Inconsistencies

**Agent naming variations:**

1. **Implementation Plan Agent vs Impl Planner**
   - paw-specification.md uses: "Implementation Plan Agent"
   - Chatmode file name: "PAW-02B Impl Planner.chatmode.md"
   - Chatmode title: "Implementation Planning Agent"
   - Inconsistency: Three different names for same agent

2. **Implementation Review Agent vs Impl Reviewer**
   - paw-specification.md Stage 03 uses: "Implementation Review Agent"
   - Chatmode file name: "PAW-03B Impl Reviewer.chatmode.md"
   - Inconsistency: Abbreviated vs full name

3. **Implementer vs Implementation Agent**
   - paw-specification.md Stage 03 uses: "Implementation Agent"
   - Chatmode file name: "PAW-03A Implementer.chatmode.md"
   - Chatmode title: "Implementation Agent"
   - Inconsistency: File name abbreviation

4. **Code Research Agent vs Code Researcher**
   - Chatmode file name: "PAW-02A Code Researcher.chatmode.md"
   - Chatmode title: "Codebase Researcher Agent"
   - Inconsistency: "Code" vs "Codebase", "Researcher" vs "Research Agent"

5. **Documenter vs Documentation Agent**
   - paw-specification.md uses: "Documenter Agent"
   - Chatmode file name: "PAW-04 Documenter.chatmode.md"
   - Consistent, but abbreviated from "Documentation Agent"

6. **Status Update vs Status Agent**
   - Chatmode file name: "PAW-X Status Update.chatmode.md"
   - Chatmode title: "Status Updater Agent"
   - paw-specification.md uses: "Status Agent"
   - Inconsistency: "Update" vs "Updater" vs "Agent"

**Artifact naming:**
- paw-specification.md uses: "ImplementationPlan.md"
- All chatmodes reference: "ImplementationPlan.md" or "ImplPlan.md"
- Minor inconsistency: "ImplPlan.md" abbreviation used in Status Agent

**Terminology concept inconsistencies:**
- "Planning PR" vs "Plan PR" - consistently "Planning PR"
- "Phase PR" vs "Implementation Phase PR" - mostly "Phase PR"
- "Docs PR" vs "Documentation PR" - mostly "Docs PR"
- "Final PR" - consistent

### Q8: Artifact Path & Naming Alignment

**Canonical paths from paw-specification.md:**
```
/docs/agents/<target_branch>/
  prompts/
    spec-research.prompt.md
    code-research.prompt.md
  Spec.md
  SpecResearch.md
  CodeResearch.md
  ImplementationPlan.md
  Docs.md
```

**Chatmode references:**

**PAW-01A Spec Agent:**
- Research prompt: `prompts/spec-research.prompt.md` ✓
- Spec: `/docs/agents/<target_branch>/Spec.md` (in Hand-off Checklist context) ✓

**PAW-01B Spec Research Agent:**
- Output: `docs/agents/<target_branch>/SpecResearch.md` ✓

**PAW-02A Code Researcher:**
- Research doc: `docs/agent/{description}/YYYY-MM-DD-ENG-XXXX-research.md` ✗
  - **DISCREPANCY**: Uses different path structure with date and ticket number
  - **DISCREPANCY**: Uses "agent" (singular) not "agents"
  - **DISCREPANCY**: Uses "research.md" suffix not "CodeResearch.md"

**PAW-02B Impl Planner:**
- Plan: `docs/agent/{description}/YYYY-MM-DD-ENG-XXXX-plan.md` ✗
  - **DISCREPANCY**: Uses different path structure with date and ticket number
  - **DISCREPANCY**: Uses "agent" (singular) not "agents"
  - **DISCREPANCY**: Uses "plan.md" suffix not "ImplementationPlan.md"
- Mentions: "Original ticket: `thoughts/allison/tickets/eng_XXXX.md`" ✗
  - **DISCREPANCY**: References non-PAW path structure ("thoughts/allison/tickets")

**PAW-03A Implementer:**
- No specific artifact path references (reads plan path provided by user) ✓

**PAW-X Status Update:**
- Inputs listed: "Spec.md, SpecResearch.md, CodeResearch.md, ImplPlan.md, Documentation.md"
  - **DISCREPANCY**: Uses "ImplPlan.md" not "ImplementationPlan.md"
  - **DISCREPANCY**: Uses "Documentation.md" not "Docs.md"

**Summary:**
- Spec Agent and Spec Research Agent align with canonical paths
- Code Researcher uses completely different path structure (dates, ticket numbers, singular "agent")
- Impl Planner uses completely different path structure (dates, ticket numbers, singular "agent")
- Status Agent uses abbreviated names ("ImplPlan.md", "Documentation.md")
- Implementer does not hard-code paths (flexible)

### Q9: Stage Hand-off Clarity - Input/Output Statements

**Stage 01 → Stage 02 (Specification → Planning):**

**PAW-01A Spec Agent hand-off:**
- Explicit outputs: "Spec.md drafted (not committed)", "spec-research.prompt.md generated", "SpecResearch.md integrated"
- Explicit next step: "Invoke Implementation Plan Agent (Stage 02). Optionally run Status Agent"
- ✓ Clear outputs, clear next agent

**PAW-01B Spec Research Agent hand-off:**
- Explicit output: Save at `docs/agents/<target_branch>/SpecResearch.md`
- Coordinator hook: Comment on Issue with link
- ✗ Missing explicit "next: return to Spec Agent" statement

**Stage 02 inputs (Planning):**

**PAW-02A Code Researcher:**
- No explicit input statement in Start section
- Mentions reading "GitHub Issues, Research documents, Related implementation plans"
- ✗ Missing explicit prerequisite: "Requires Spec.md and SpecResearch.md"

**PAW-02B Impl Planner:**
- Explicit inputs in Step 1: "GitHub Issues, Research documents, Related implementation plans, Any JSON/data files"
- ✗ Missing explicit prerequisite: "Requires CodeResearch.md from PAW-02A"

**Stage 02 → Stage 03 (Planning → Implementation):**

**PAW-02B Impl Planner hand-off:**
- Outputs: Plan file at specific path
- ✗ Missing explicit next step statement (no "Invoke Implementation Agent" instruction)

**Stage 03 inputs (Implementation):**

**PAW-03A Implementer:**
- Explicit: "When given just a plan path: Read the plan completely"
- Explicit: "All files mentioned in the plan, include specs and GitHub Issues"
- ✓ Clear input requirements

**Stage 03 → Stage 04 (Implementation → Documentation):**

**PAW-03A Implementer hand-off:**
- After completing phases: pause for manual verification
- ✗ Missing explicit "Invoke Documenter Agent when all phases complete"

**Stage 04 inputs (Documentation):**
- **Missing** (PAW-04 empty) - no input specification exists

**Stage 04 → Stage 05 (Documentation → Final PR):**
- **Missing** (both PAW-04 and PAW-05 empty)

**Summary of missing hand-offs:**
1. Spec Research → Spec Agent: missing "return to Spec Agent" statement
2. Code Researcher: missing explicit Spec.md/SpecResearch.md prerequisite statement
3. Impl Planner: missing explicit CodeResearch.md prerequisite statement
4. Impl Planner → Implementer: missing "Invoke Implementation Agent" statement
5. Implementer → Documenter: missing "Invoke Documenter Agent when all phases complete"
6. All Stage 04 and Stage 05 hand-offs: completely missing (empty files)

### Q10: Status / PR Agent Overlap

**Status Agent (PAW-X) responsibilities:**

**What it does:**
- Maintains Issue top comment with agent-status dashboard
- Updates PR body blocks with summary and changes
- Tracks artifacts (Spec, SpecResearch, CodeResearch, ImplPlan, Documentation)
- Tracks PR states (Planning PR, Phase PRs, Docs PR, Final PR)
- Maintains checklist in Issue
- Posts milestone comments with links
- Updates "AGENT-STATUS" and "AGENT-SUMMARY" blocks

**What it does NOT do:**
- "You do **not** manage merges or reviewers"
- "Never assign reviewers, change labels (except `status/*`), or modify code"
- Does not craft PR descriptions (only updates summary blocks)
- Does not perform validation checks
- Does not create PRs

**PR Agent (PAW-05) responsibilities:**

From paw-specification.md (chatmode file is empty):
- Opens the final PR from target branch to main
- Performs comprehensive pre-flight readiness checks
- Validates prerequisites: all phase PRs merged, docs PR merged, artifacts exist, branch updated
- Blocks PR creation if checks fail
- Provides guidance on what must be completed first
- Crafts comprehensive PR description with: summary, links, changes, impact, testing, deployment considerations
- Creates the final PR
- Provides merge/deployment guidance

**Overlap analysis:**

**Non-overlapping (distinct):**
- Status Agent: maintains existing Issues/PRs - PR Agent: creates new final PR
- Status Agent: updates dashboard blocks - PR Agent: crafts full PR description
- Status Agent: tracks status across workflow - PR Agent: validates readiness for final merge
- Status Agent: runs at multiple milestones - PR Agent: runs once at Stage 05
- Status Agent: no validation - PR Agent: blocks if prerequisites not met

**No factual overlaps identified.** Status Agent maintains/updates existing surfaces; PR Agent creates and validates the final PR. Their triggers and scopes are distinct.

### Q11: External Dependencies Mentions

**Chatmodes referencing external tools/capabilities:**

**PAW-01A Spec Agent:**
- GitHub Issues/PRs: "ALWAYS use the **github mcp** tools to interact with GitHub issues and PRs. Do not fetch pages directly or use the gh cli."
- Scope: Viewing Issues (input), explicitly does NOT post comments/updates

**PAW-01B Spec Research Agent:**
- No external tool references
- Explicitly does NOT perform external/web searches
- Explicitly does NOT commit or post to GitHub

**PAW-02A Code Researcher:**
- Web search: "Use the **websearch** tool for external documentation and resources. IF you use websearch tool, please INCLUDE those links in your final report"
- GitHub: "Use the **github mcp** tools to interact with GitHub issues and PRs"
- Git commands: References `git branch --show-current`, `git status`, `gh repo view --json owner,name`
- Scope: Reading/researching, not modifying

**PAW-02B Impl Planner:**
- No explicit external tool references
- References build/test commands generically: "Ensure you use the appropriate build and test commands/scripts for the repository"
- Mentions migration commands: `make migrate`, `make test-component`, `npm run typecheck`, `make lint`
- Scope: Example commands in plan template, not agent execution

**PAW-03A Implementer:**
- GitHub MCP tools: "Uses GitHub MCP tools to push/create PRs"
- "Use github mcp tools to push the changes to the PR or create a new PR"
- Git branching: Creates implementation branches locally
- Scope: Creating branches, pushing code, managing PRs

**PAW-X Status Update:**
- Implied GitHub API access for updating Issues and PRs
- No explicit tool naming
- Scope: Updating Issue comments and PR body blocks only

**Summary of external references:**
- **GitHub MCP tools**: PAW-01A (read), PAW-02A (read), PAW-03A (write - push/PR)
- **Web search**: PAW-02A only
- **Git CLI commands**: PAW-02A (for metadata gathering)
- **Build/test commands**: PAW-02B (examples only), PAW-03A (executes)

**Outside described scope:**
- PAW-02A web search capability: documented in scope ("Use the **websearch** tool")
- All GitHub tool usage: within scope (reading Issues for research, creating PRs for implementation)
- No unauthorized external capabilities identified

### Q12: Assumed Human Actions

**Explicit human-in-the-loop steps by chatmode:**

**PAW-01A Spec Agent:**
- "Pause & Instruct: Instruct user to run Spec Research Agent"
- "Iterate with the developer to eliminate ambiguity"
- "Offer to write `Spec.md` (requires user confirmation)"
- User must: answer clarification questions, refine research prompt, run Spec Research Agent, approve final spec

**PAW-01B Spec Research Agent:**
- Manual fill: "User-Provided External Knowledge (Manual Fill)" section
- Human must: provide external/context answers if desired, not required for completion

**PAW-02A Code Researcher:**
- "Wait for the user's research query"
- "Ask if they have follow-up questions or need clarification"
- Human must: provide research query, review findings, ask follow-ups

**PAW-02B Impl Planner:**
- "Then wait for the user's input" (after initial response)
- "Get feedback on structure before writing details"
- "Get buy-in at each major step"
- "Allow course corrections"
- "Continue refining until the user is satisfied"
- "If you encounter open questions during planning, STOP... Research or ask for clarification immediately"
- Human must: provide Issue/research files, answer clarifications, approve structure, approve final plan

**PAW-03A Implementer:**
- "**Pause for human verification**: After completing all automated verification for a phase, pause and inform the human that the phase is ready for manual testing"
- "Let me know when manual testing is complete so I can proceed to Phase [N+1]"
- "Pause and let the human know the PR is ready for re-review"
- "do not check off items in the manual testing steps until confirmed by the user"
- "If you aren't sure if a change is related, pause and ask"
- Human must: perform manual verification, confirm manual test completion, approve PR, merge PRs, provide clarification on unclear changes

**PAW-X Status Update:**
- No explicit human pause points (runs on-demand at milestones)
- Implicitly: human triggers the agent at appropriate milestones

**Empty chatmodes (PAW-03B, PAW-04, PAW-05):**
- No human-in-the-loop steps documented (files empty)

**Summary of critical preserved human steps:**
1. Clarification question resolution (Spec Agent)
2. Research prompt refinement (Spec Agent)
3. Running dependent agents (human triggers Spec Research, Code Research)
4. Approval gates (spec approval, plan approval, structure approval)
5. Manual testing verification (Implementer critical pause)
6. PR review and merge decisions (Implementer waits for approval)
7. Change relatedness judgment (Implementer asks if uncertain)

### Q13: Risk Phrases Source

**Strong corrective phrases by chatmode and section:**

**PAW-01A Spec Agent:**

Sections with emphasis:
- "Core Specification Principles" - numbered principles (no special markers)
- "Guardrails (Enforced)" section:
  - 6 "NEVER:" statements
  - 4 "ALWAYS:" statements
- Throughout: "IMPORTANT:" prefix not found; "CRITICAL:" not used
- Note: Uses bold/italics but fewer all-caps emphasis markers than other agents

**PAW-01B Spec Research Agent:**

No strong emphasis markers ("CRITICAL:", "IMPORTANT:", "NEVER:", "ALWAYS:")
Uses bold for key points but minimal corrective emphasis

**PAW-02A Code Researcher:**

Heavy use of emphasis:
- Title section: "CRITICAL: YOUR ONLY JOB IS TO DOCUMENT..."
- 6 "DO NOT" bullet points in opening
- Multiple "IMPORTANT:" statements:
  - "IMPORTANT: Use the Read tool WITHOUT limit/offset parameters"
  - "IMPORTANT: Ensure there are no other research steps to complete"
- Multiple "CRITICAL:" statements:
  - "CRITICAL: DO NOT proceed to research tasks before reading"
  - "CRITICAL: You are a documentarian, not evaluators"
- "NEVER read files partially"
- "REMEMBER:" statement
- "NO RECOMMENDATIONS:" statement
- Multiple "What not to do" lists with "Don't" statements (15+ items)
- Section: "Code Pattern Finder" has: "DO NOT suggest", "DO NOT critique", "ONLY show"

**PAW-02B Impl Planner:**

Multiple "IMPORTANT:" statements:
- "IMPORTANT: Use the Read tool WITHOUT limit/offset parameters" (2 instances)
- "IMPORTANT Guidelines" section
Multiple "CRITICAL:" statements:
- "CRITICAL: DO NOT just accept the correction"
- "CRITICAL Requirement: The final plan must be complete..."
"NEVER" statements:
- "NEVER read files partially"
Section headers:
- "No Open Questions in Final Plan" (strong negative statement as header)
- "Success Criteria Guidelines" with "Always separate"
- "COMPREHENSIVE RESEARCH" section with "DO NOT" lists

**PAW-03A Implementer:**

Minimal emphasis markers:
- "ONLY commit changes you made" 
- No "CRITICAL:", no "IMPORTANT:", no "NEVER:"
- Uses "do not" in lowercase/normal text
- Least emphasis of mature chatmodes

**PAW-X Status Update:**

"Never" statements (3 instances, not all-caps):
- "Never change content outside AUTOGEN blocks"
- "Never assign reviewers, change labels, or modify code"

**First-pass chatmodes (PAW-03B, PAW-04, PAW-05):**
- **Completely lack** any emphasis markers (files empty)

**Summary table:**

| Chatmode | CRITICAL | IMPORTANT | NEVER/Never | ALWAYS | DO NOT | Emphasis Level |
|----------|----------|-----------|-------------|--------|--------|----------------|
| PAW-01A  | 0        | 0         | 6           | 4      | 0      | Medium         |
| PAW-01B  | 0        | 0         | 0           | 0      | 0      | Low            |
| PAW-02A  | 2        | 2         | 1           | 1      | 20+    | Very High      |
| PAW-02B  | 2        | 3         | 1           | 1      | 10+    | High           |
| PAW-03A  | 0        | 0         | 0           | 0      | 2      | Low            |
| PAW-X    | 0        | 0         | 3           | 0      | 0      | Low            |
| PAW-03B  | 0        | 0         | 0           | 0      | 0      | None (empty)   |
| PAW-04   | 0        | 0         | 0           | 0      | 0      | None (empty)   |
| PAW-05   | 0        | 0         | 0           | 0      | 0      | None (empty)   |

### Q14: Branching Conventions

**Canonical conventions from paw-specification.md:**

- Target Branch: `feature/<slug>` or `user/rde/<slug>`
- Planning branch: `<target_branch>_plan`
- Implementation phase branches: `<target_branch>_phase<N>` or `<target_branch>_phase<M-N>`
- Docs branch: `<target_branch>_docs`
- Examples: `feature/auth_phase1`, `feature/auth_phase2-3`

**Chatmode references:**

**PAW-01A Spec Agent:**
- No branch naming instructions (operates before branch creation for planning)
- Creates/checks out planning branch: `<target_branch>_plan` ✓

**PAW-01B Spec Research Agent:**
- No branch instructions (works on existing branch)

**PAW-02A Code Researcher:**
- No branch instructions (research only)

**PAW-02B Impl Planner:**
- No branch instructions (planning only)
- Mentions: "Planning PR opened/updated (`<target_branch>_plan` → `<target_branch>`)" in comments ✓

**PAW-03A Implementer:**
- "Creates/manages implementation branches (`_phase[N]` or `_phase[M-N]`)" ✓
- "Implementation branches are name it by appending `_phase[N]` or `_phase[M-N]` to the feature branch name" ✓
- Example: `feature-branch_phase1-3` ✓
- "If instructed to execute multiple phases consecutively, create a branch representing the phase range as `_phase[M-N]`" ✓
- Checks: "If not already on an implementation branch (branch ending in `_phase[N]` or `_phase[M-N]`)" ✓

**PAW-X Status Update:**
- Tracks: "Planning PR", "Phases: Phase 1: <link>", "Docs merged", "Final PR to main"
- Implicit understanding of branch structure but no explicit naming ✓

**No deviations identified.** All chatmodes that reference branches use conventions consistent with paw-specification.md.

### Q15: Quality / Checklist Coverage

**Chatmodes with explicit quality checklists:**

**PAW-01A Spec Agent:**
- **"Spec Quality Checklist"** section (explicit embedded checklist):
  - Content Quality (5 items)
  - Requirement Completeness (6 items)
  - Ambiguity Control (2 items)
  - Scope & Risk (2 items)
  - Research Integration (2 items)
- **"Quality Bar for 'Final' Spec"** section (pass criteria list, 10 items)
- **"Hand-off Checklist"** section (7 items)
- Coverage: Clarity ✓, Traceability ✓, Testability ✓, Guardrails ✗ (not in checklist)

**PAW-02A Code Researcher:**
- **"Quality Standards"** section (implicit checklist):
  - Is Factual
  - Is Precise
  - Is Comprehensive
  - Is Organized
  - Is Traceable
  - Is Neutral
- Coverage: Clarity ✓ (Precise), Traceability ✓, Testability ✗, Guardrails ✗

**PAW-02B Impl Planner:**
- **"Success Criteria Guidelines"** section (format guidance)
- **"Quality Standards"** section (implicit, in narrative):
  - Is Specific
  - Is Testable
  - Is Incremental
  - Is Complete
  - Is Traceable
- **"Important Guidelines"** section (process quality, 5 numbered points)
- Coverage: Clarity ✓ (Specific), Traceability ✓, Testability ✓, Guardrails ✗

**PAW-03A Implementer:**
- **"Verification Approach"** section (process steps, not explicit checklist)
- **"Success Criteria"** mentioned (from plan, automated vs manual)
- No embedded quality checklist for agent's own work
- Coverage: Testability ✓ (via plan criteria), others implicit through process

**PAW-01B Spec Research Agent:**
- No explicit quality checklist
- Coverage: implicit through method

**PAW-X Status Update:**
- **"Guardrails"** section (3 items, more restrictions than quality dimensions)
- No quality checklist
- Coverage: minimal (idempotency mentioned)

**Empty chatmodes (PAW-03B, PAW-04, PAW-05):**
- No checklists

**Missing quality dimensions by chatmode:**

| Chatmode | Clarity | Traceability | Testability | Guardrails Coverage |
|----------|---------|--------------|-------------|---------------------|
| PAW-01A  | ✓       | ✓            | ✓           | Partial (not in checklist) |
| PAW-01B  | Implicit| Implicit     | Implicit    | ✗                   |
| PAW-02A  | ✓       | ✓            | ✗           | ✗                   |
| PAW-02B  | ✓       | ✓            | ✓           | ✗                   |
| PAW-03A  | Implicit| Implicit     | ✓           | ✗                   |
| PAW-X    | ✗       | ✗            | ✗           | Partial (3 rules)   |
| PAW-03B  | ✗       | ✗            | ✗           | ✗                   |
| PAW-04   | ✗       | ✗            | ✗           | ✗                   |
| PAW-05   | ✗       | ✗            | ✗           | ✗                   |

**Absent dimensions:**
- **Testability**: Missing from Code Researcher, Spec Research Agent, Status Agent
- **Guardrails as quality dimension**: Not explicitly in checklists (though guardrail sections exist)
- **All dimensions**: Missing from Impl Reviewer, Documenter, PR Agent (empty files)
- **Explicit checklist format**: Missing from Spec Research, Status Agent, Implementer

### Q16: Reviewer Responsibilities Granularity

**Expected reviewer behaviors from paw-specification.md Stage 03:**

From "Implementation Review Agent" description:
- Reviews code changes made by Implementation Agent
- Suggests improvements
- Generates docstrings and code comments for clarity, readability, maintainability
- Commits changes with clear, descriptive messages
- Pushes the implementation branch and opens Phase PRs
- If responding to review comments: reviews each change to ensure it addresses the comment
- Replies comment-by-comment on the PR
- Pushes changes and makes an overall review comment summarizing the changes

**Current PAW-03B Impl Reviewer chatmode:**
- **File is empty** - zero instructions

**Missing concrete reviewer actions:**

1. **Code review instructions:**
   - How to review code changes (what to look for)
   - Quality criteria for code review (readability, maintainability, correctness)
   - When to suggest improvements vs accept as-is
   
2. **Documentation improvements:**
   - Specific instructions for generating docstrings (format, completeness)
   - Instructions for code comments (when, what level of detail)
   - Standards for documentation quality
   
3. **Commit structuring:**
   - How to structure review-driven commits
   - Commit message format/conventions
   - What to include in each commit
   
4. **PR interaction:**
   - How to reply to review comments (format, detail level)
   - How to structure overall summary comment
   - When to request re-review vs continue
   
5. **Process coordination:**
   - How to coordinate with Implementer (what was already done)
   - When to pause for human review vs proceed
   - How to update implementation plan status

6. **Quality gates:**
   - What checks to run before pushing
   - When to request changes vs approve
   - How to verify improvements are sufficient

**Missing expected behaviors relative to Issue goal "solidifying":**
- All behaviors missing (file empty)
- No distinction between review-for-improvement vs review-for-merge
- No instructions on balancing thoroughness vs forward momentum
- No guidance on agentic vs human review boundaries
- No quality checklist for review completeness
- No guardrails on scope of review changes

### Q17: Documentation Agent Scope

**Expected from paw-specification.md Stage 04 description:**

**Required inputs (consistent with Stage 04):**
- `ImplementationPlan.md` from Stage 02 (all phases complete and merged)
- All PRs from implementation phases
- Target branch checked out and up to date

**Outputs:**
- `Docs.md` artifact
- Project-specific documentation updates
- Docs PR (`<target_branch>_docs` → `<target_branch>`)

**Expected boundaries:**
- Produces documentation based on completed implementation
- Opens docs PR for review
- Addresses review comments with focused commits
- Does not modify code or implementation
- Does not change requirements or specifications

**Current PAW-04 Documenter chatmode:**
- **File is empty** - zero instructions

**Missing boundary clarifications:**

1. **Scope boundaries (what not to change):**
   - Do not modify implementation code
   - Do not change Spec.md or ImplementationPlan.md
   - Do not update artifacts from earlier stages
   - Do not create new features or fix bugs
   
2. **Required input validation:**
   - Verify all phases are marked complete in ImplementationPlan.md
   - Verify all Phase PRs are merged
   - Verify target branch is current
   - Verify artifacts exist at expected paths
   
3. **Documentation scope:**
   - What types of documentation to create (user-facing, technical, API, etc.)
   - What project documentation to update (README, CHANGELOG, guides)
   - How to map implementation to documentation needs
   - What to document vs what to reference
   
4. **Docs.md artifact format:**
   - Structure and sections required
   - How to link to updated documentation files
   - How to reference acceptance criteria from Spec.md
   - Quality standards for documentation
   
5. **PR creation instructions:**
   - Branch naming (`<target_branch>_docs`)
   - PR description format
   - What to include in PR body
   - When to pause for review
   
6. **Review comment handling:**
   - How to address documentation review comments
   - Commit message format
   - When to ask for clarification
   
7. **Project-specific guidance:**
   - How to discover project documentation standards
   - Where to look for style guidelines
   - How to follow existing patterns

**All boundary clarifications are missing** (file empty).

### Q18: Status Agent Trigger Points

**Triggers from paw-specification.md:**

"The Status Agent should be invoked at key milestones:"
1. After the Planning PR is opened, updated, or merged
2. After each Phase PR is opened, updated, or merged
3. After the Docs PR is opened, updated, or merged
4. After the final PR is opened or merged

**Triggers from PAW-X Status Update chatmode:**

From "Triggers" section:
- "Spec approval"
- "planning PR open/merge"
- "phase PR open/update/merge"
- "docs PR merge"
- "final PR open/merge"

**Comparison:**

| Trigger Type | paw-specification.md | PAW-X Status Update | Match |
|--------------|---------------------|---------------------|-------|
| Planning PR opened | ✓ | ✓ | ✓ |
| Planning PR updated | ✓ | ✗ (implied by "open/merge") | Partial |
| Planning PR merged | ✓ | ✓ | ✓ |
| Phase PR opened | ✓ | ✓ | ✓ |
| Phase PR updated | ✓ | ✓ | ✓ |
| Phase PR merged | ✓ | ✓ | ✓ |
| Docs PR opened | ✓ | ✗ (only "merge") | ✗ |
| Docs PR updated | ✓ | ✗ | ✗ |
| Docs PR merged | ✓ | ✓ | ✓ |
| Final PR opened | ✓ | ✓ | ✓ |
| Final PR merged | ✓ | ✓ | ✓ |
| Spec approval | ✗ | ✓ | Addition |

**Omissions in chatmode:**
- "Planning PR updated" not explicitly listed (may be implied)
- "Docs PR opened" missing
- "Docs PR updated" missing

**Additions in chatmode:**
- "Spec approval" trigger (not in paw-specification.md trigger list)

**Note:** The chatmode lists triggers more tersely ("open/merge", "open/update/merge") which creates ambiguity about whether all combinations are intended.

### Q19: Guardrail Migration Candidates

**Guardrail categories present in one mature chatmode but absent in all others:**

**Unique to PAW-02A Code Researcher:**
1. **Anti-evaluation guardrails** (absent in all others):
   - "DO NOT suggest improvements or changes"
   - "DO NOT perform root cause analysis"
   - "DO NOT critique the implementation or identify problems"
   - "DO NOT recommend refactoring, optimization, or architectural changes"
   - "DO NOT identify bugs, issues, or potential problems"
   - "DO NOT comment on performance or efficiency"
   - "DO NOT evaluate security implications"
   - Category: **Pure documentation role enforcement**

2. **Documentation vs evaluation boundaries** (absent in all others):
   - "ONLY describe what exists, where it exists, how it works"
   - "You are creating a technical map/documentation of the existing system"
   - "CRITICAL: You are a documentarian, not evaluators"
   - Category: **Role boundary clarification for neutral research**

**Unique to PAW-01A Spec Agent:**
1. **Clarification resolution requirement** (absent in all others):
   - "NEVER: proceed to final spec if unanswered **critical** internal clarification questions remain"
   - "Clarification questions must be resolved before drafting specification sections"
   - Category: **Blocking on unresolved questions**

2. **Fabrication prevention** (absent in all others):
   - "NEVER: fabricate answers not supported by Issue, SpecResearch, or user-provided inputs"
   - Category: **Evidence-based output requirement**

3. **Format compliance enforcement** (absent in all others):
   - "ALWAYS: ensure minimal format header lines are present and correctly ordered"
   - Category: **Template adherence**

**Unique to PAW-02B Impl Planner:**
1. **Verification-before-acceptance** (absent in all others):
   - "DO NOT just accept the correction" (when user corrects misunderstanding)
   - "Perform COMPREHENSIVE RESEARCH steps to verify the correct information"
   - Category: **Independent verification requirement**

2. **No-open-questions finalization rule** (absent in all others):
   - "The final plan must be complete and actionable with zero open questions"
   - "DO NOT write the plan with unresolved questions"
   - Category: **Completeness gate**

**Unique to PAW-03A Implementer:**
1. **Unrelated changes exclusion** (absent in all others):
   - "ONLY commit changes you made to implement the plan. Do not include unrelated changes"
   - "Do not revert or overwrite unrelated changes. Just avoid adding them to your commit"
   - Category: **Surgical change discipline**

2. **Pause-for-manual-verification** (absent in all others):
   - "**Pause for human verification**: After completing all automated verification for a phase"
   - "do not check off items in the manual testing steps until confirmed by the user"
   - Category: **Human verification gates**

**Unique to PAW-X Status Update:**
1. **Idempotency requirement** (absent in all others):
   - "Be idempotent: re-running should not produce diffs without state changes"
   - Category: **Stateless execution safety**

2. **Block-boundary enforcement** (absent in all others):
   - "Never change content outside AUTOGEN blocks"
   - Category: **Surgical text modification**

**Categories absent in ALL mature chatmodes:**
- Security validation guardrails (no chatmode validates security implications)
- Performance impact guardrails (no chatmode checks performance implications)
- Backward compatibility guardrails (no chatmode enforces compatibility checks)
- Rollback instructions (no chatmode provides rollback guidance)

**Migration candidate summary:**

High-value categories to migrate:
1. **Pure documentation role** (from Code Researcher) → migrate to Spec Research Agent
2. **Blocking on unresolved questions** (from Spec Agent) → migrate to Impl Planner, potentially to Implementer
3. **Independent verification** (from Impl Planner) → migrate to all research/planning agents
4. **Surgical change discipline** (from Implementer) → migrate to Impl Reviewer, Documenter
5. **Human verification gates** (from Implementer) → migrate to Impl Reviewer, potentially PR Agent
6. **Idempotency** (from Status Agent) → migrate to all agents that modify artifacts
7. **Block-boundary enforcement** (from Status Agent) → migrate to any agent that updates existing files

### Q20: Ambiguity Hotspots

**Phrases interpretable variably across chatmodes:**

1. **"update" (used without scope qualifiers):**
   - PAW-01A: "updating assumptions" (in spec)
   - PAW-03A: "Update checkboxes in the plan", "update your progress", "Update your progress in both the plan and your todos"
   - PAW-X: "What to keep updated" (Issue and PRs)
   - **Ambiguity**: Does "update" mean append, replace, or modify in place? What happens to existing content?

2. **"refine" (scope unclear):**
   - PAW-01A: "Refine spec based on findings", "developer may refine it"
   - PAW-02B: "Continue refining until the user is satisfied"
   - **Ambiguity**: How extensive can refinement be? Is refine incremental or wholesale revision?

3. **"research" (depth unclear):**
   - PAW-01B: "Perform research to answer the following questions"
   - PAW-02A: "Perform comprehensive research"
   - PAW-02B: "Perform comprehensive research" (in caps)
   - **Ambiguity**: What constitutes sufficient research? When to stop researching?

4. **"review" (rigor/scope unclear):**
   - PAW-03A: "ready for review", "Addressed Review Comments"
   - paw-specification.md: "review changes", "review the PR"
   - **Ambiguity**: What level of review? Code correctness only, or style, docs, tests? Who reviews?

5. **"complete" / "completed" (definition unclear):**
   - PAW-02B: "The final plan must be complete"
   - PAW-03A: "After completing a phase", "until manual testing is complete"
   - **Ambiguity**: What defines completeness? All checkboxes? Human approval? Automated tests passing?

6. **"relevant" (subjectivity):**
   - PAW-02A: "Exact file paths and line numbers for relevant code"
   - PAW-03A: "All files mentioned in the plan, include specs and GitHub Issues"
   - **Ambiguity**: Who determines relevance? How broad to search?

7. **"comprehensive" (extent unclear):**
   - PAW-02A: Multiple uses of "comprehensive research"
   - PAW-02B: "COMPREHENSIVE RESEARCH" section
   - **Ambiguity**: How comprehensive? What's the stopping condition?

8. **"clarification" vs "question" vs "unknown":**
   - PAW-01A: "clarification questions must be resolved", "Unknown Classification"
   - PAW-01B: "Open Unknowns", "internal questions"
   - **Ambiguity**: Are these synonyms or distinct categories? Different resolution paths?

9. **"summarize" (detail level unclear):**
   - PAW-01A: "Summarize: primary goal, actors, core value propositions"
   - PAW-02B: Multiple summary instructions
   - **Ambiguity**: How brief? What to include/exclude?

10. **"validate" / "verify" (rigor unclear):**
    - PAW-01A: "Validate against the Spec Quality Checklist"
    - PAW-03A: "Verification Approach", "Automated verification", "Manual verification"
    - **Ambiguity**: Is validation a check (boolean) or improvement process? Who/what validates?

**File & line references (selected examples):**

- PAW-03A Implementer, line context: "Verification Approach" section (no specific line numbers in markdown, appears ~mid-file after "Implementation Philosophy")
- PAW-01A Spec Agent, line context: "Unknown Classification" in "Drafting Workflow" step 3
- PAW-02A Code Researcher, throughout "COMPREHENSIVE RESEARCH" section
- PAW-X Status Update: "What to keep updated" section

**Pattern**: Most ambiguity stems from verbs of judgment or effort (update, refine, complete, comprehensive, relevant) without quantitative thresholds, examples, or decision trees.

## Open Unknowns

None. All internal questions answered from existing chatmode files and paw-specification.md.

## User-Provided External Knowledge (Manual Fill)

### Optional External / Context Questions from Prompt

* [ ] **Industry Prompting Patterns**: Are there external established prompt structuring patterns (e.g., widely cited specification or research agent frameworks) that could inspire missing sections?
* [ ] **Comparative Agent Benchmarks**: What benchmark criteria (latency, accuracy, reusability) might be used later to evaluate improved chatmodes?
* [ ] **Legal / Compliance Considerations**: Any domain compliance constraints that would affect prompt guardrails?
* [ ] **Accessibility / Inclusion Prompting Guidelines**: Are there standards to reflect in documentation or review prompts?
* [ ] **External taxonomy alignment**: Should naming align with any recognized industry lifecycle terminology beyond PAW?

