# Spec Research: Finalize Initial Agent Chatmodes

## Summary

This research documents the current state of the PAW chatmode files, identifying which agents exist, their maturity levels, structural differences, and areas requiring standardization. The research reveals that PAW includes 9 chatmode files representing stages 01 through 05 plus a status agent, with varying levels of completeness. Three chatmodes (PAW-01A Spec Agent, PAW-01B Spec Research Agent, PAW-02A Code Researcher, PAW-02B Impl Planner, PAW-03A Implementer) are mature with comprehensive structure, while others (PAW-03B Impl Reviewer, PAW-04 Documenter, PAW-05 PR) are empty first-pass placeholders. Several terminology inconsistencies exist (e.g., "Impl Planner" vs "Implementation Plan Agent"), and some artifact path references need alignment with the canonical paths defined in `paw-specification.md`.

## Internal System Behavior

### Question 1: Current Chatmode Inventory

**Current chatmode files:**

1. **PAW-01A Spec Agent.chatmode.md** - "Spec Agent"
   - Stage: 01 - Specification
   - Role: Converts rough Issue/brief into structured feature specification plus research prompt
   - Status: Mature (comprehensive, well-structured)

2. **PAW-01B Spec Research Agent.chatmode.md** - "Spec Research Agent"
   - Stage: 01 - Specification
   - Role: Answers internal system behavior questions from `spec-research.prompt.md` to produce factual documentation
   - Status: Mature (concise, clear structure)

3. **PAW-02A Code Researcher.chatmode.md** - "Codebase Researcher Agent"
   - Stage: 02 - Implementation Plan
   - Role: Conducts comprehensive codebase research to document what exists, where it exists, and how it works
   - Status: Mature (highly detailed with comprehensive research methodology)

4. **PAW-02B Impl Planner.chatmode.md** - "Implementation Planning Agent"
   - Stage: 02 - Implementation Plan
   - Role: Creates detailed implementation plans through interactive, iterative process
   - Status: Mature (thorough, includes research methodology)

5. **PAW-03A Implementer.chatmode.md** - "Implementation Agent"
   - Stage: 03 - Phased Implementation
   - Role: Implements approved technical implementation plan phases
   - Status: Mature (comprehensive, clear workflow)

6. **PAW-03B Impl Reviewer.chatmode.md** - "Implementation Review Agent" (filename) / not named in content
   - Stage: 03 - Phased Implementation
   - Role: Reviews code changes, suggests improvements, generates documentation
   - Status: Empty placeholder (0 bytes)

7. **PAW-04 Documenter.chatmode.md** - "Documentation Agent" (expected)
   - Stage: 04 - Documentation
   - Role: Produces `Docs.md` and updates project documentation
   - Status: Empty placeholder (0 bytes)

8. **PAW-05 PR.chatmode.md** - "PR Agent" (expected)
   - Stage: 05 - Final PR to main
   - Role: Opens final PR with comprehensive pre-flight checks
   - Status: Empty placeholder (0 bytes)

9. **PAW-X Status Update.chatmode.md** - "Status Updater Agent"
   - Stage: Cross-cutting (used between stages)
   - Role: Maintains Issues and PRs, keeping links and checklists current
   - Status: Mature (concise, clear responsibilities)

**Stage mapping:**
- Stage 01 (Specification): PAW-01A, PAW-01B
- Stage 02 (Implementation Plan): PAW-02A, PAW-02B
- Stage 03 (Phased Implementation): PAW-03A, PAW-03B
- Stage 04 (Documentation): PAW-04
- Stage 05 (Final PR): PAW-05
- Cross-cutting: PAW-X

### Question 2: Role Split Rationale - Implementer vs Implementation Reviewer

**PAW-03A Implementer (Implementation Agent) - Present behaviors:**
- Implements approved technical implementation plan phases
- Creates implementation branches (`_phase[N]` or `_phase[M-N]`)
- Follows plan's intent while adapting to reality
- Runs success criteria checks and fixes issues
- Updates plan progress and checkboxes
- Commits changes with detailed messages
- Creates/updates PRs using github mcp tools
- Addresses PR review comments by creating TODOs for each comment
- Makes commits per review comment, referencing comment in commit message
- Pushes commits and comments on PR review comments when addressed
- Pauses for human verification after automated checks complete
- Emphasis: Forward momentum, implementation execution, verification, handling mismatches between plan and reality

**PAW-03B Impl Reviewer (Implementation Review Agent) - Expected behaviors:**
- File is currently empty (0 bytes)
- Expected per `paw-specification.md`:
  - Reviews code changes made by Implementation Agent
  - Suggests improvements
  - Generates docstrings and code comments for clarity, readability, maintainability
  - Commits changes with clear, descriptive messages
  - Pushes implementation branch and opens Phase PRs
  - When responding to review comments: reviews each change to ensure it addresses comment, replies comment-by-comment on PR
  - Makes overall review comment summarizing changes
- Expected distinction: Reviewer focuses on code quality, documentation, and PR management; Implementer focuses on execution

**Current state:** Only Implementer has content. Reviewer role is defined only in the specification, not in its chatmode file.

### Question 3: Spec vs Spec Research Boundary

**PAW-01A Spec Agent current delineation:**
- Converts rough Issue/brief into structured specification
- Generates `prompts/spec-research.prompt.md` with factual questions about current system (internal) and optional external/context questions
- Focuses on WHAT & WHY (functional/non-functional requirements, acceptance criteria)
- Avoids implementation detail (no tech stack, file paths, library names)
- Does NOT commit, push, open PRs, update Issues, or perform status synchronization
- Produces draft content OR prompt file written to disk
- Pauses for research; integrates `SpecResearch.md` findings

**PAW-01B Spec Research Agent current delineation:**
- Answers internal system behavior questions from `spec-research.prompt.md`
- Produces factual documentation limited to internal behavioral & structural facts (no code line granularity)
- Does NOT perform external/web searches
- Reproduces external/context questions verbatim in "User-Provided External Knowledge" section for manual completion
- Documents how system behaves today at conceptual/behavioral level (no file paths)
- No design, no improvements, no speculation
- Does not commit changes or post comments to GitHub Issues or PRs

**Overlap/Ambiguity:**
- Both agents state they do not commit/push/update GitHub
- Both distinguish between internal questions (must answer) vs external/context questions (manual)
- Clear separation: Spec Agent generates questions and creates requirements; Spec Research Agent answers those questions factually
- Minor wording overlap: both mention "no implementation detail" but Spec Agent means "in requirements" while Spec Research Agent means "no file paths/code specifics"

### Question 4: Research Depth Burden - Code Research Agent

**Directives driving granular code line/filename gathering:**

From PAW-02A Code Researcher:

1. "**Always include file:line references** for claims" (appears 2x in Code Analysis section)
2. "Get specific file paths and line numbers for developer reference"
3. "**File reading**: Always read mentioned files FULLY (no limit/offset) before performing any other research steps"
4. "**Frontmatter (YAML)** ... `git_commit: [Current commit hash]`"
5. "Download logs for a specific workflow job or efficiently get all failed job logs for a workflow run"
6. "**Read files thoroughly** before making statements"
7. "**Trace actual code paths** don't assume"
8. "**Be precise** about function names and variables"
9. Research document structure: "**Code References**: Bulleted list of key file paths with descriptions"
10. "Include specific file paths and line numbers for reference"
11. GitHub Permalinks section: "Format: `https://github.com/{owner}/{repo}/blob/{commit}/{file}#L{line}`"

**Directives promoting higher-level behavioral mapping:**

1. "**CRITICAL: YOUR ONLY JOB IS TO DOCUMENT AND EXPLAIN THE CODEBASE AS IT EXISTS TODAY**"
2. "ONLY describe what exists, where it exists, how it works, and how components interact"
3. "Initial Setup" response text focuses on "research question or area of interest"
4. "Analyze and decompose the research question" - "Break down the user's query into composable research areas"
5. "Highlight patterns, connections, and architectural decisions"
6. Research document includes "## Architecture Documentation" section
7. "THIS STEP'S PURPOSE IS TO DOCUMENT AND SHOW EXISTING PATTERNS AS THEY ARE"

**Balance assessment:** The agent is instructed to provide both granular file:line references AND higher-level architectural/behavioral understanding. The granular directives are predominant in frequency and emphasis.

### Question 5: Guidance Preservation Targets - Missing Guardrail Categories

**Critical negative/guardrail language in mature chatmodes:**

**PAW-01A Spec Agent (mature):**
- Multiple "NEVER" statements:
  - "NEVER: fabricate answers not supported by Issue, SpecResearch, or user-provided inputs"
  - "NEVER: silently assume critical external standards"
  - "NEVER: produce a spec-research prompt that reintroduces removed sections"
  - "NEVER: proceed to final spec if unanswered critical internal clarification questions remain"
- Multiple "ALWAYS" statements (5 instances)
- "CRITICAL:" prefix used once
- "IMPORTANT:" prefix mentioned in Communication Patterns
- Explicit "Guardrails (Enforced)" section

**PAW-01B Spec Research Agent (mature):**
- Guardrails section with 4 prohibitions:
  - "No proposals, refactors, 'shoulds'"
  - "No speculative claims"
  - "Do not commit changes or post comments"
- No "NEVER"/"ALWAYS" formatting but clear prohibitions

**PAW-02A Code Researcher (mature):**
- "CRITICAL:" used once at top
- "IMPORTANT:" used 3 times
- Multiple "DO NOT" statements (17 instances):
  - "DO NOT suggest improvements"
  - "DO NOT perform root cause analysis"
  - "DO NOT propose future enhancements"
  - "DO NOT critique the implementation"
  - "DO NOT recommend refactoring"
  - etc.
- "NEVER" used twice:
  - "NEVER write the research document with placeholder values"
  - "NEVER read files partially"
- Strong emphasis section headers:
  - "## CRITICAL: YOUR ONLY JOB IS TO DOCUMENT..."
  - "**CRITICAL**: You are a documentarian, not evaluators"
  - "**REMEMBER**: Document what IS, not what SHOULD BE"
  - "**NO RECOMMENDATIONS**: Only describe the current state"

**PAW-02B Impl Planner (mature):**
- Multiple "DO NOT" statements (17 instances, many in Code Analysis/Pattern Finder)
- "NEVER" used once: "NEVER write the plan with unresolved questions"
- No "CRITICAL:" or "IMPORTANT:" prefixes
- "No Open Questions in Final Plan" section with strong prohibition

**PAW-03A Implementer (mature):**
- "ONLY" used once: "ONLY commit changes you made to implement the plan"
- "Do not include unrelated changes" (2 instances)
- "Do not revert or overwrite unrelated changes"
- Less emphasis on prohibitions, more on workflow guidance

**PAW-X Status Update (mature):**
- Guardrails section:
  - "Never change content outside AUTOGEN blocks"
  - "Never assign reviewers, change labels"
  - "Never modify code"
- 3 "Never" statements

**Missing guardrail categories in empty/first-pass chatmodes (PAW-03B, PAW-04, PAW-05):**
- Prohibition against scope creep or out-of-role actions
- Prohibition against making recommendations vs executing tasks
- Prohibition against modifying artifacts outside their responsibility
- Git operation boundaries (what to commit/push, what not to)
- GitHub interaction boundaries (when to comment, when not to)
- File operation boundaries (what files to touch, what to leave alone)
- Idempotency guidance
- Error handling requirements
- When to pause for human input vs proceed autonomously

### Question 6: First-Pass Gaps - Missing Structural Sections

**Identifying untested/first-pass chatmodes:**
- **PAW-03B Impl Reviewer.chatmode.md** - Empty (0 bytes) - UNTESTED
- **PAW-04 Documenter.chatmode.md** - Empty (0 bytes) - UNTESTED  
- **PAW-05 PR.chatmode.md** - Empty (0 bytes) - UNTESTED

**Mature chatmodes for comparison:**
- PAW-01A Spec Agent
- PAW-01B Spec Research Agent
- PAW-02A Code Researcher
- PAW-02B Impl Planner
- PAW-03A Implementer
- PAW-X Status Update

**Major structural sections in mature chatmodes:**

**Common sections across mature chatmodes:**
1. **Start/Initial Response** - What to do when invoked without parameters
2. **Core Principles/Philosophy** - Fundamental approach and values
3. **Method/Process Steps/Workflow** - Detailed step-by-step execution
4. **Output/Document Format** - Structure of artifacts produced
5. **Guardrails** - Explicit prohibitions and boundaries
6. **Quality Standards/Checklist** - Validation criteria
7. **Communication Patterns** - How to interact with user
8. **Error/Edge Handling** - What to do when things go wrong
9. **Hand-off/Next Steps** - What comes after this agent

**Specific sections by chatmode:**

**PAW-01A Spec Agent has:**
- Start / Initial Response
- Core Specification Principles (10 enumerated)
- High-Level Responsibilities
- Explicit Non-Responsibilities
- Working Modes (table)
- Drafting Workflow (Detailed Steps)
- Research Prompt Minimal Format
- Inline Specification Template
- Spec Quality Checklist
- Quality Bar for "Final" Spec
- Communication Patterns
- Error / Edge Handling
- Guardrails (Enforced)
- Hand-off Checklist
- GitHub Issues guidance

**PAW-01B Spec Research Agent has:**
- Start
- Method
- Document format
- Output
- Guardrails
- Coordinator hooks

**PAW-02A Code Researcher has:**
- Initial Setup (start guidance)
- Steps to follow (9 numbered steps)
- Comprehensive Research section (detailed methodology)
  - Code Location
  - Code Analysis
  - Code Pattern Finder
- Web Search guidance
- GitHub Issues guidance
- Important notes (with CRITICAL/REMEMBER emphasis)

**PAW-02B Impl Planner has:**
- Initial Response
- Process Steps (Step 1-4 with sub-steps)
- Important Guidelines (5 principles)
- Success Criteria Guidelines (with format example)
- Common Patterns (3 scenarios)
- Comprehensive Research section (same as Code Researcher)

**PAW-03A Implementer has:**
- Getting Started (with two scenarios)
- Implementation Philosophy
- Verification Approach
- Committing
- Commenting on PRs
- If You Get Stuck
- Resuming Work

**PAW-X Status Update has:**
- Inputs
- What to keep updated (Issue, PRs with examples)
- Triggers
- Guardrails
- Failure handling
- Output

**Missing from all empty chatmodes (PAW-03B, PAW-04, PAW-05):**
- ALL major sections (Start, Method, Steps, Guardrails, Quality Checklist, Error Handling, Hand-off)
- No content whatsoever to analyze

**Missing structural patterns to backfill:**
- Initial Response / Start section (what to ask when invoked)
- Core responsibilities vs non-responsibilities delineation
- Step-by-step process workflow
- Output format / artifact structure
- Success criteria or quality checklist
- Guardrails section with explicit prohibitions
- Communication patterns / tone guidance
- Error and edge case handling
- Hand-off to next stage
- GitHub interaction guidance

### Question 7: Consistency Issues - Terminology

**Terminology inconsistencies across chatmodes:**

1. **Implementation Plan Agent naming:**
   - Filename: `PAW-02B Impl Planner.chatmode.md`
   - Content header: `# Implementation Planning Agent`
   - paw-specification.md: "Implementation Plan Agent"
   - **Inconsistency:** "Impl Planner" (filename) vs "Implementation Planning Agent" (content) vs "Implementation Plan Agent" (spec)

2. **Implementation Review Agent naming:**
   - Filename: `PAW-03B Impl Reviewer.chatmode.md`
   - Content: Empty (no name in content)
   - paw-specification.md: "Implementation Review Agent"
   - **Inconsistency:** "Impl Reviewer" (filename) vs "Implementation Review Agent" (spec), no content to confirm

3. **Implementer vs Implementation Agent:**
   - Filename: `PAW-03A Implementer.chatmode.md`
   - Content header: `# Implementation Agent`
   - paw-specification.md: "Implementation Agent"
   - **Inconsistency:** "Implementer" (filename) vs "Implementation Agent" (content/spec)

4. **Documenter vs Documentation Agent:**
   - Filename: `PAW-04 Documenter.chatmode.md`
   - Content: Empty
   - paw-specification.md: "Documenter Agent"
   - **Inconsistency:** "Documenter" (filename) vs "Documenter Agent" (spec, which itself is consistent) vs expected "Documentation Agent" from stage description

5. **Status Update vs Status Agent:**
   - Filename: `PAW-X Status Update.chatmode.md`
   - Content header: `# Status Updater Agent`
   - paw-specification.md: "Status Agent"
   - **Inconsistency:** "Status Update" (filename) vs "Status Updater Agent" (content) vs "Status Agent" (spec)

6. **Code Researcher vs Code Research Agent:**
   - Filename: `PAW-02A Code Researcher.chatmode.md`
   - Content header: `# Codebase Researcher Agent`
   - paw-specification.md: "Code Research Agent"
   - **Inconsistency:** "Code Researcher" (filename) vs "Codebase Researcher Agent" (content) vs "Code Research Agent" (spec)

7. **Spec vs Specification:**
   - "Spec Agent" used consistently
   - "Spec Research Agent" used consistently
   - But "Specification Stage" in workflow
   - Minor: "Spec" abbreviation in agent names, "Specification" in stage names

**Pattern:** Filenames use abbreviated forms (Impl, Reviewer, Implementer, Documenter), content headers often use fuller forms with "Agent" suffix, and paw-specification.md uses yet different variants. No single consistent naming convention applied across filename/content/spec.

### Question 8: Artifact Path & Naming Alignment

**Canonical paths defined in `paw-specification.md`:**

```
/docs/agents/
  <target_branch>/
    prompts/
      spec-research.prompt.md
      code-research.prompt.md
    Spec.md    
    SpecResearch.md
    CodeResearch.md
    ImplementationPlan.md
    Docs.md
```

**Chatmode file instructions for artifact paths:**

**PAW-01A Spec Agent:**
- Does not specify explicit save paths
- States: "outputs are *draft content* provided to the human, AND/OR (optionally) a prompt file written to disk"
- Research prompt format shows: "Perform research to answer the following questions" but no path
- Hand-off Checklist mentions: "Spec.md drafted (not committed)"
- ✅ No explicit path discrepancy (defers to Planning stage for commits)

**PAW-01B Spec Research Agent:**
- Output section: "Save at: `docs/agents/<target_branch>/SpecResearch.md` (canonical path)"
- ✅ Matches specification

**PAW-02A Code Researcher:**
- Step 5: "Filename: `docs/agent/description/YYYY-MM-DD-ENG-XXXX-research.md`"
- Format: `description/YYYY-MM-DD-ENG-XXXX-research.md`
- ❌ **DISCREPANCY:** Uses `docs/agent/` (singular) instead of `docs/agents/` (plural)
- ❌ **DISCREPANCY:** Uses `description/YYYY-MM-DD-ENG-XXXX-research.md` pattern instead of `<target_branch>/CodeResearch.md`
- Research document has git commit, date in filename - more detailed than canonical

**PAW-02B Impl Planner:**
- Step 4: "Write the plan to `docs/agent/{description}/YYYY-MM-DD-ENG-XXXX-plan.md`"
- Format: `{description}/YYYY-MM-DD-ENG-XXXX-plan.md`
- ❌ **DISCREPANCY:** Uses `docs/agent/` (singular) instead of `docs/agents/` (plural)
- ❌ **DISCREPANCY:** Uses `{description}/YYYY-MM-DD-ENG-XXXX-plan.md` pattern instead of `<target_branch>/ImplementationPlan.md`

**PAW-03A Implementer:**
- References "the plan" but doesn't specify path
- "Read the plan completely" - assumes path provided by user
- ✅ No explicit path discrepancy

**PAW-03B, PAW-04, PAW-05:**
- Empty - cannot assess

**PAW-X Status Update:**
- References artifacts: "Paths to artifacts: Spec.md, SpecResearch.md, CodeResearch.md, ImplPlan.md, Documentation.md"
- Uses "ImplPlan.md" instead of "ImplementationPlan.md"
- Uses "Documentation.md" instead of "Docs.md"
- ❌ **DISCREPANCY:** Artifact name inconsistencies

**Summary of discrepancies:**
1. Code Researcher and Impl Planner use `docs/agent/` (singular) not `docs/agents/` (plural)
2. Code Researcher uses timestamped research filenames, not `CodeResearch.md`
3. Impl Planner uses timestamped plan filenames, not `ImplementationPlan.md`
4. Status Update uses "ImplPlan.md" and "Documentation.md" instead of canonical names

### Question 9: Stage Hand-off Clarity - Required Inputs and Outputs

**Stage 01 (Specification) → Stage 02 (Implementation Plan):**

**Outputs from Stage 01 (per chatmodes):**
- PAW-01A Spec Agent Hand-off Checklist:
  - "Spec.md drafted (not committed)"
  - "spec-research.prompt.md generated"
  - "SpecResearch.md integrated"
  - "Next: Invoke Implementation Plan Agent (Stage 02)"
- PAW-01B Spec Research Agent:
  - Saves "`docs/agents/<target_branch>/SpecResearch.md`"
  - States coordinator hook: "Comment on the Issue"

**Inputs to Stage 02 (per chatmodes):**
- PAW-02A Code Researcher Initial Setup: "Please provide your research question or area of interest" OR "If the user supplies a Spec.md, analyze the spec"
- PAW-02B Impl Planner Initial Response: "Please provide: 1. The GitHub Issue... 2. Path to the research file... 3. Links to any other related materials"

**Assessment:** 
- ✅ Spec Agent explicitly states next step is Implementation Plan Agent
- ⚠️ Impl Planner expects research file but doesn't explicitly state "SpecResearch.md" from Stage 01
- ✅ Code Researcher accepts Spec.md
- ❌ No explicit "outputs must match inputs" validation described

**Stage 02 (Implementation Plan) → Stage 03 (Phased Implementation):**

**Outputs from Stage 02 (per chatmodes):**
- PAW-02B Impl Planner writes plan to disk, mentions "Continue refining until the user is satisfied"
- No explicit hand-off statement to Implementation stage

**Inputs to Stage 03 (per chatmodes):**
- PAW-03A Implementer "Getting Started": "If no implementation plan path provided, ask for one. When given just a plan path: Read the plan completely"
- References: "All files mentioned in the plan, include specs and GitHub Issues"

**Assessment:**
- ⚠️ Impl Planner doesn't explicitly state "Next: Invoke Implementation Agent"
- ✅ Implementer clearly expects plan path as input
- ❌ Missing explicit statement that planning PR must be merged before implementation

**Stage 03 (Phased Implementation) → Stage 04 (Documentation):**

**Outputs from Stage 03 (per chatmodes):**
- PAW-03A Implementer: Updates plan phase status, commits, pushes, creates/updates PRs
- Pauses for verification per phase
- No explicit "all phases complete, ready for documentation" hand-off

**Inputs to Stage 04 (per chatmodes):**
- PAW-04 Documenter: Empty - cannot assess

**Assessment:**
- ❌ No explicit hand-off from Implementation to Documentation stage
- ❌ Documenter agent has no input requirements defined

**Stage 04 (Documentation) → Stage 05 (Final PR):**

**Outputs from Stage 04 (per chatmodes):**
- PAW-04 Documenter: Empty - cannot assess

**Inputs to Stage 05 (per chatmodes):**
- PAW-05 PR Agent: Empty - cannot assess

**Assessment:**
- ❌ No hand-off defined (both agents empty)

**Summary of missing explicit hand-off statements:**
- Stage 01→02: Partial (Spec Agent mentions next step, but Planner doesn't explicitly require Stage 01 outputs)
- Stage 02→03: Missing (Planner doesn't state "invoke Implementer", Implementer doesn't verify plan is from merged planning PR)
- Stage 03→04: Missing (Implementer doesn't state "ready for docs", no Documenter to check inputs)
- Stage 04→05: Missing (both empty)
- Status Agent triggers are defined in PAW-X and paw-specification.md but not cross-referenced in stage agents

### Question 10: Status / PR Agent Overlap

**PAW-X Status Update Agent (Status Agent) responsibilities:**

**What it maintains:**
1. **Issue top comment** - Dashboard with:
   - Artifacts links (Spec, Research, Plan, Docs)
   - PRs links and states (Planning, Phases, Docs, Final)
   - Checklist (Spec approved, PRs merged, etc.)
2. **PR body blocks** (all PRs: planning, phase, docs, final):
   - Summary section with feature title, current phase, links to artifacts
   - "What changed since last review" based on commits
3. **Milestone comments** - Brief, link-rich updates

**Explicit non-responsibilities:**
- "Never assign reviewers"
- "Never change labels (except status/*)"
- "Never modify code"
- "Never change content outside AUTOGEN blocks"

**Triggers:**
- "Spec approval; planning PR open/merge; phase PR open/update/merge; docs PR merge; final PR open/merge"

**PAW-05 PR Agent (PR Agent) responsibilities (per paw-specification.md):**

**What it does:**
1. Opens final PR from target branch to main
2. **Pre-flight readiness checks:**
   - All phase PRs merged to target branch
   - Documentation PR merged to target branch
   - All required artifacts exist and up to date
   - Target branch up to date with base branch
3. **Blocks PR creation if checks fail**
4. **Crafts comprehensive PR description:**
   - Summary of feature/task
   - Links to specification, implementation plan, documentation
   - Links to all merged phase PRs
   - Summary of changes and impact
   - Testing and validation evidence
   - Deployment/rollout considerations
5. **Creates the final PR**
6. Provides guidance on merge and deployment

**Overlap analysis:**

**Distinct responsibilities:**
- Status Agent: Maintains ALL PRs throughout workflow (planning, phases, docs, final)
- PR Agent: Creates ONLY the final PR to main
- Status Agent: Updates existing PR descriptions in AUTOGEN blocks
- PR Agent: Writes initial comprehensive PR description for final PR
- Status Agent: Updates Issue tracking
- PR Agent: No issue updates mentioned
- Status Agent: Reactive (triggered by milestones)
- PR Agent: Proactive (performs pre-flight validation)

**Potential overlaps:**
1. **Final PR description:** Both agents may write to final PR description
   - Status Agent adds Summary block
   - PR Agent crafts comprehensive description
   - ⚠️ Could conflict if both try to write different content formats
2. **Links to artifacts:** Both reference specs, plans, phase PRs
   - Status Agent maintains links in Summary block
   - PR Agent includes links in description
   - ⚠️ Redundant but not necessarily conflicting
3. **PR body modification:**
   - Status Agent operates in AUTOGEN blocks
   - PR Agent writes initial description
   - ✅ Likely compatible if PR Agent creates and Status Agent updates blocks

**Assessment:**
- Minor overlap in final PR description content
- Status Agent's AUTOGEN block approach should prevent destructive conflicts
- No explicit coordination protocol defined between them
- Status Agent doesn't validate pre-flight checks (PR Agent's job)
- PR Agent doesn't update Issue (Status Agent's job)

**Factual overlaps:**
- Both agents interact with the final PR description
- Both include links to artifacts and phase PRs
- No clear protocol for which agent runs first or coordination mechanism

### Question 11: External Dependencies Mentions

**External tools, APIs, or web search behavior referenced in chatmodes:**

**PAW-02A Code Researcher:**
- **Web Search section:** "Use the **websearch** tool for external documentation and resources. IF you use websearch tool, please INCLUDE those links in your final report"
- **GitHub Issues section:** "Use the **github mcp** tools to interact with GitHub issues and PRs"
- **Scope:** Research agent can search web for external docs (in scope for code research)

**PAW-01A Spec Agent:**
- **GitHub Issues section:** "ALWAYS use the **github mcp** tools to interact with GitHub issues and PRs. Do not fetch pages directly or use the gh cli."
- **Scope:** Spec agent interacts with GitHub (reading issues, not modifying)

**PAW-01B Spec Research Agent:**
- **Method:** "For internal questions: explore the repo, including code and documentation"
- **Does NOT perform external/web searches:** Explicitly stated in guardrails
- **Scope:** No external tools mentioned (internal-only research)

**PAW-02B Impl Planner:**
- No explicit external tool mentions
- Inherits "Comprehensive Research" section from Code Researcher (includes web search)
- **Scope:** Could potentially use websearch via inherited methodology

**PAW-03A Implementer:**
- "Use github mcp tools to push the changes to the PR or create a new PR"
- "Ensure all there are replies to all review comments on the PR"
- **Scope:** GitHub interaction for PR management

**PAW-X Status Update:**
- Operates on "Issue and PRs"
- "Post milestone comments"
- No explicit mention of tools but implies GitHub API/MCP usage
- **Scope:** GitHub interaction for status updates

**Summary of external dependencies:**
1. **github mcp tools** - Used by: Spec Agent, Code Researcher, Implementer, Status Update (implied)
2. **websearch tool** - Used by: Code Researcher (and potentially Impl Planner via inheritance)
3. **gh cli** - Explicitly prohibited in Spec Agent ("Do not fetch pages directly or use the gh cli")

**References outside described scope:**
- ✅ Code Researcher's web search is within scope (researching external docs)
- ✅ GitHub MCP tools are appropriate for all agents that need to read/write issues/PRs
- ❌ Spec Research Agent correctly does NOT reference external tools (internal-only mandate)
- ⚠️ Impl Planner inherits web search capability from Code Researcher methodology section but doesn't explicitly state when to use it

### Question 12: Assumed Human Actions

**Explicit human-in-the-loop steps referenced in chatmodes:**

**PAW-01A Spec Agent:**
1. "The Implementation Plan Agent (Stage 02) handles committing/planning PR creation" - implies human runs next agent
2. "Offer to write Spec.md (requires user confirmation)" - human must approve file write
3. Clarification questions require human answers: "pauses until clarified"
4. Research prompt: "pause for research" - human must run Spec Research Agent
5. "Optional external/context questions - NOT answered automatically; surfaced so the user may fill them later if helpful"
6. Quality Checklist: "user explicitly overrides (override logged...)"
7. Hand-off Checklist: "Next: Invoke Implementation Plan Agent (Stage 02). Optionally run Status Agent to update Issue."
8. "continue iterating with the above steps until the spec is clear, complete, and testable" - human judges completion

**PAW-01B Spec Research Agent:**
1. Start: "Share the path to SpecResearch.prompt.md (or paste the questions). Also share the feature branch name"
2. User-Provided External Knowledge section is manually filled
3. Coordinator hooks: "Comment on the Issue" - implies human could trigger Status Agent

**PAW-02A Code Researcher:**
1. Initial Setup: "Then wait for the user's input" - human provides research query
2. "If the user supplies a Spec.md, analyze the spec"
3. Step 1: "Read any directly mentioned files first" - assumes human mentions files
4. No automatic progression to next stage

**PAW-02B Impl Planner:**
1. Initial Response: "Then wait for the user's input"
2. Step 1: "If the user corrects any misunderstanding... perform COMPREHENSIVE RESEARCH"
3. Step 2: "Present findings and design options... Which approach aligns best with your vision?"
4. Step 3: "Get feedback on structure before writing details"
5. Review section: "Please review it and let me know..."
6. "Continue refining until the user is satisfied"
7. No explicit statement about human merging planning PR or proceeding to implementation

**PAW-03A Implementer:**
1. "If no implementation plan path provided, ask for one"
2. "Pause for human verification: After completing all automated verification for a phase, pause..."
3. Manual verification steps: "do not check off items in the manual testing steps until confirmed by the user"
4. "Let me know when manual testing is complete so I can proceed to Phase [N+1]"
5. "If instructed to execute multiple phases consecutively..." - human decides single vs multi-phase execution
6. "Please re-review the PR and let me know if further changes are needed"
7. Committing section: "If you aren't sure if a change is related, pause and ask"
8. "If You Get Stuck... Present the mismatch clearly and ask for guidance"
9. "Resuming Work: If the plan has existing checkmarks: Trust that completed work is done"

**PAW-X Status Update:**
1. Inputs: "Feature Issue ID or URL" - human must provide
2. "Paths to artifacts" - human must provide paths
3. Triggers section lists when to invoke (implies human or workflow trigger)
4. Failure handling: "post a short Issue comment tagging the responsible agent" - human may need to interpret

**paw-specification.md Human Workflow sections:**
- "Ensure a clean and up-to-date feature branch is checked out locally" (all stages)
- "Ask the [Agent] to..." (all stages) - human invokes agents
- "Review and refine..." (Stage 01)
- "Run the Spec Research Agent..." (Stage 01)
- "Continue iterating... until the spec is clear, complete, and testable" (Stage 01)
- "Review CodeResearch.md for completeness and accuracy" (Stage 02)
- "Collaborate with the Implementation Plan Agent..." (Stage 02)
- "The developer will then review the PR..." (Stage 02, 03)
- "Once the Planning PR is approved, the developer will merge it" (Stage 02)
- "The developer will ask the Implementation Agent..." (Stage 03)
- "Optional Secondary Review: The developer may request another developer to review..." (Stage 02, 03)
- "If tracking with a GitHub Issue, use the Status Agent to update..." (Stage 02, 04)

**Summary of human actions required for process integrity:**
1. **Agent invocation** - Humans must explicitly invoke each agent at appropriate stages
2. **Clarification responses** - Answer agent questions before proceeding
3. **Research execution** - Run Spec Research Agent after Spec Agent generates prompt
4. **Approval gates** - Review and approve specs, plans, PRs before proceeding
5. **Manual verification** - Perform manual testing steps that cannot be automated
6. **Merge operations** - Merge planning PR, phase PRs, docs PR (not done by agents)
7. **Iteration decisions** - Decide when quality is sufficient to proceed
8. **Design decisions** - Choose between technical approaches presented by agents
9. **Branch management** - Ensure proper branch checkout and updates
10. **Status coordination** - Optionally invoke Status Agent at milestones
11. **Scope guidance** - Provide constraints, hard requirements, out-of-scope boundaries
12. **File path provision** - Supply paths to artifacts when agents need them
13. **Optional external knowledge** - Fill in external/context questions in SpecResearch.md

### Question 13: Risk Phrases Source - Strong Corrective Phrases

**Where strong corrective phrases are currently used:**

**PAW-01A Spec Agent:**
- **"CRITICAL:"** - Not present
- **"IMPORTANT:"** - Communication Patterns section: "Prefix critical warnings with: `IMPORTANT:` or `CRITICAL:`" (instructs usage but doesn't use it)
- **"NEVER:"** - Guardrails section (4 instances):
  - "NEVER: fabricate answers..."
  - "NEVER: silently assume critical external standards..."
  - "NEVER: produce a spec-research prompt that reintroduces removed sections..."
  - "NEVER: proceed to final spec if unanswered critical internal clarification questions remain..."
- **"ALWAYS:"** - Guardrails section (5 instances):
  - "ALWAYS: differentiate *requirements* (what) from *acceptance criteria*..."
  - "ALWAYS: pause after writing the research prompt..."
  - "ALWAYS: surface if external research was skipped..."
  - "ALWAYS: ensure minimal format header lines are present..."

**PAW-01B Spec Research Agent:**
- No "CRITICAL:" or "IMPORTANT:" markers
- No "NEVER:" or "ALWAYS:" formatting
- Guardrails section uses plain prohibitions: "No proposals", "No speculative claims", "Do not commit"

**PAW-02A Code Researcher:**
- **"CRITICAL:"** - Used 3 times:
  - "## CRITICAL: YOUR ONLY JOB IS TO DOCUMENT..." (section header)
  - "**CRITICAL**: DO NOT proceed to research tasks before reading these files..."
  - "**CRITICAL**: You are a documentarian, not evaluators"
- **"IMPORTANT:"** - Used 3 times:
  - "**IMPORTANT**: Use the Read tool WITHOUT limit/offset parameters..."
  - "**IMPORTANT**: Ensure there are no other researech steps to complete..."
- **"NEVER:"** - Used 2 times:
  - "**NEVER** read files partially..."
  - "NEVER write the research document with placeholder values"
- **"REMEMBER:"** - Used 1 time:
  - "**REMEMBER**: Document what IS, not what SHOULD BE"
- **"NO [X]:"** - Used 1 time:
  - "**NO RECOMMENDATIONS**: Only describe the current state"
- **"DO NOT:"** - Used 17 times throughout (primary corrective pattern)

**PAW-02B Impl Planner:**
- No "CRITICAL:" markers
- No "IMPORTANT:" markers
- **"NEVER:"** - Used 1 time:
  - "NEVER write the plan with unresolved questions" (in "No Open Questions" section)
- **"DO NOT:"** - Used 17 times (inherited from Comprehensive Research section)
- Section header: **"No Open Questions in Final Plan"** (emphasis via header)

**PAW-03A Implementer:**
- No "CRITICAL:" markers
- No "IMPORTANT:" markers
- No "NEVER:" markers
- **"ONLY:"** - Used 1 time:
  - "ONLY commit changes you made to implement the plan"
- **"Do not:"** - Used 3 times (lowercase, less emphasis):
  - "Do not include unrelated changes"
  - "Do not revert or overwrite unrelated changes"
  - "do not check off items in the manual testing steps..."

**PAW-X Status Update:**
- No "CRITICAL:" or "IMPORTANT:" markers
- **"Never:"** - Guardrails section (3 instances):
  - "Never change content outside AUTOGEN blocks"
  - "Never assign reviewers, change labels (except status/*)"
  - (implied third: "or modify code")

**First-pass chatmodes lacking emphasis markers:**
- **PAW-03B Impl Reviewer** - Empty (no phrases)
- **PAW-04 Documenter** - Empty (no phrases)
- **PAW-05 PR** - Empty (no phrases)

**Distribution of strong emphasis by chatmode:**
| Chatmode | CRITICAL | IMPORTANT | NEVER | ALWAYS | DO NOT | Other Strong |
|----------|----------|-----------|-------|---------|---------|--------------|
| PAW-01A Spec Agent | 0 (instructs) | 0 (instructs) | 4 | 5 | 0 | - |
| PAW-01B Spec Research | 0 | 0 | 0 | 0 | 3 | "No [X]" |
| PAW-02A Code Researcher | 3 | 3 | 2 | 0 | 17 | REMEMBER, NO [X] |
| PAW-02B Impl Planner | 0 | 0 | 1 | 0 | 17 | Section headers |
| PAW-03A Implementer | 0 | 0 | 0 | 0 | 3 | ONLY |
| PAW-X Status Update | 0 | 0 | 3 | 0 | 0 | - |
| PAW-03B (empty) | 0 | 0 | 0 | 0 | 0 | - |
| PAW-04 (empty) | 0 | 0 | 0 | 0 | 0 | - |
| PAW-05 (empty) | 0 | 0 | 0 | 0 | 0 | - |

**Patterns:**
- Code Researcher has most emphasis markers (25 total strong phrases)
- Spec Agent uses NEVER/ALWAYS pattern (9 total)
- Impl Planner inherits DO NOT from research section
- Implementer uses softer tone (lowercase "do not", single "ONLY")
- Status Update uses "Never" consistently (3)
- Empty chatmodes have zero emphasis markers

### Question 14: Branching Conventions

**Branching conventions defined in paw-specification.md:**

**From Branching Conventions section:**
1. **Target Branch:** The branch that will hold all completed work. Format: `feature/<slug>` or `user/rde/<slug>`
2. **Planning branch:** `<target_branch>_plan`
3. **Implementation phase branches:** `<target_branch>_phase<N>` or `<target_branch>_phase<M-N>`
   - Single phase: `feature/auth_phase1`
   - Combined phases: `feature/auth_phase2-3`
4. **Docs branch:** `<target_branch>_docs`

**Chatmode references to branching:**

**PAW-01A Spec Agent:**
- "Target branch name (agent can also discover this from the current branch)"
- "creates or checks out the planning branch (`<target_branch>_plan`)"
- ✅ Correctly references `_plan` suffix

**PAW-01B Spec Research Agent:**
- Start: "Also share the feature branch name so I save outputs in the right folder"
- ✅ No specific branch convention mentioned (appropriate for research agent)

**PAW-02A Code Researcher:**
- No branching convention references
- ✅ Appropriate (research doesn't create branches)

**PAW-02B Impl Planner:**
- Initial Response: "Path to the research file compiled by the research agent"
- No explicit branch convention references
- ⚠️ Missing: Should mention planning branch or that plan will be committed to `_plan` branch

**PAW-03A Implementer:**
- "Before doing any work, ensure the proper branch setup:"
- "If not already on an implementation branch (branch ending in `_phase[N]` or `_phase[M-N]`), create one from the current local branch"
- "Implementation branches are name it by appending `_phase[N]` or `_phase[M-N]` to the feature branch name"
- "If instructed to execute multiple phases consecutively, create a branch representing the phase range as `_phase[M-N]`, e.g. `feature-branch_phase1-3`"
- ✅ Correctly describes phase branch conventions
- ⚠️ Example uses `_phase1-3` (dash) instead of `_phase1-3` - consistent with spec

**PAW-X Status Update:**
- References "Planning PR: <link>" and "Phase 1: <link>" in Issue dashboard
- "PRs (planning + each phase + docs + final)"
- ✅ Implicit understanding of branch structure via PR references

**PAW-04 Documenter:**
- Empty
- ⚠️ Missing: Should reference `<target_branch>_docs` branch

**PAW-05 PR:**
- Empty
- ⚠️ Missing: Should reference final PR from `<target_branch>` to `main`

**Deviations found:**
1. ✅ No actual deviations in implemented chatmodes
2. ⚠️ Impl Planner doesn't explicitly mention that planning PR uses `_plan` branch
3. ⚠️ Empty chatmodes (Documenter, PR) lack branch convention references
4. ✅ Implementer correctly describes phase branch naming with hyphen for ranges

**Assessment:** Existing chatmodes accurately reflect branching conventions where mentioned. Empty chatmodes need convention guidance added.

### Question 15: Quality / Checklist Coverage

**Chatmodes with explicit quality checklists:**

**PAW-01A Spec Agent:**
- **"Spec Quality Checklist"** section with categories:
  - Content Quality (5 items)
  - Requirement Completeness (6 items)
  - Ambiguity Control (2 items)
  - Scope & Risk (2 items)
  - Research Integration (2 items)
  - Total: 17 checklist items
- **"Quality Bar for 'Final' Spec"** - 8 pass criteria
- **"Hand-off Checklist"** - 7 items before proceeding to Stage 02
- ✅ Comprehensive quality coverage

**PAW-02A Code Researcher:**
- No explicit checklist section
- **"Important notes"** section with quality guidance:
  - "Focus on finding concrete file paths and line numbers"
  - "Research documents should be self-contained"
  - "Document cross-component connections"
  - File reading requirements (FULLY, no placeholders)
  - Frontmatter consistency requirements
- Implicit quality expectations embedded in methodology
- ⚠️ Quality expectations present but not formatted as checklist

**PAW-02B Impl Planner:**
- No explicit checklist section
- **"Important Guidelines"** section with 5 principles:
  1. Be Skeptical
  2. Be Interactive
  3. Be Thorough
  4. Be Practical
  5. Track Progress
  6. No Open Questions in Final Plan
- **"Success Criteria Guidelines"** with format requirements
- **"Quality Standards"** - 5 criteria in markdown:
  - Is Specific
  - Is Testable
  - Is Incremental
  - Is Complete
  - Is Traceable
- ⚠️ Quality standards listed but not as checklist format

**PAW-03A Implementer:**
- **"Verification Approach"** section describes process but not checklist
- Success criteria in plan define quality per phase
- "Pause for human verification" protocol
- ⚠️ Relies on plan's success criteria, no inherent checklist

**PAW-01B Spec Research Agent:**
- No explicit checklist
- **"Guardrails"** section defines quality boundaries
- ⚠️ Minimal quality guidance (correctness via guardrails only)

**PAW-X Status Update:**
- No explicit checklist
- **"Guardrails"** section: "Be idempotent: re-running should not produce diffs without state changes"
- ⚠️ Quality implied via idempotency requirement

**Empty chatmodes (PAW-03B, PAW-04, PAW-05):**
- ❌ No checklists (no content)

**Required workflow quality dimensions per prompt:**

From paw-specification.md and chatmode analysis:

1. **Clarity** - Requirements are unambiguous and understandable
2. **Traceability** - Artifacts link back to requirements and forward to implementation
3. **Testability** - Success criteria are measurable and verifiable
4. **Guardrails** - Boundaries prevent scope creep and out-of-role actions

**Coverage by chatmode:**

| Chatmode | Clarity | Traceability | Testability | Guardrails | Format |
|----------|---------|--------------|-------------|------------|--------|
| PAW-01A Spec Agent | ✅ | ✅ | ✅ | ✅ | Explicit checklist |
| PAW-01B Spec Research | ⚠️ Implicit | ❌ | ❌ | ✅ | Guardrails only |
| PAW-02A Code Researcher | ⚠️ Implicit | ⚠️ Permalinks | ⚠️ File refs | ✅ | Important notes |
| PAW-02B Impl Planner | ✅ | ✅ | ✅ | ⚠️ Partial | Guidelines & standards |
| PAW-03A Implementer | ⚠️ Via plan | ⚠️ Via plan | ✅ | ⚠️ Minimal | Process-based |
| PAW-X Status Update | ✅ | ✅ | ❌ | ✅ | Guardrails only |
| PAW-03B Impl Reviewer | ❌ | ❌ | ❌ | ❌ | Empty |
| PAW-04 Documenter | ❌ | ❌ | ❌ | ❌ | Empty |
| PAW-05 PR | ❌ | ❌ | ❌ | ❌ | Empty |

**Absent quality dimensions in non-empty chatmodes:**
- **Spec Research Agent:** No traceability requirements (should reference source questions), no testability criteria (how to verify research completeness)
- **Code Researcher:** Testability not explicitly defined (when is research "complete"?), clarity expectations embedded in methodology not checklisted
- **Impl Planner:** Guardrails section missing (has DO NOTs but no dedicated Guardrails section like others)
- **Implementer:** Minimal guardrails (only about commits), no clarity checklist (relies on plan quality)
- **Status Update:** No testability criteria (how to verify status is correct and complete)

**Absent in all empty chatmodes:** All four quality dimensions completely missing

### Question 16: Reviewer Responsibilities Granularity

**Current PAW-03B Impl Reviewer chatmode content:**
- File is empty (0 bytes)
- No concrete reviewer actions specified

**Expected reviewer behaviors from paw-specification.md (Stage 03):**

**Implementation Review Agent responsibilities:**
1. **Reviews code changes** made by Implementation Agent
2. **Suggests improvements**
3. **Generates docstrings and code comments** for clarity, readability, and maintainability
4. **Commits changes** with clear, descriptive messages
5. **Pushes implementation branch** and opens Phase PRs
6. When responding to review comments:
   - Reviews each change to ensure it addresses the comment
   - Replies comment-by-comment on the PR
   - Pushes changes
   - Makes overall review comment summarizing the changes

**Comparison with PAW-03A Implementer (to identify split):**

**Implementer does:**
- Implements plan phases
- Runs automated verification
- Commits implementation changes
- Addresses PR review comments (creates TODOs, makes commits)
- Pushes commits and comments on individual review comments

**Reviewer should do (per spec):**
- Reviews Implementer's changes
- Suggests improvements (quality review)
- Adds documentation (docstrings, comments)
- Opens/updates Phase PRs
- Reviews Implementer's review comment responses
- Makes summary PR comments

**Missing expected reviewer behaviors from chatmode:**

Since the file is empty, ALL behaviors are missing:

1. **Code review actions:**
   - What to review (readability, maintainability, correctness)
   - How to suggest improvements
   - When to approve vs request changes

2. **Documentation improvements:**
   - Docstring generation criteria
   - Code comment standards
   - What deserves comments vs what's self-documenting

3. **Commit structuring:**
   - Commit message format
   - What changes to group in single commits
   - How to reference review feedback in commits

4. **PR management:**
   - When to open PR (after first review pass)
   - How to structure PR description
   - What to include in PR body

5. **Review comment handling workflow:**
   - How to verify Implementer addressed comments
   - Format for comment-by-comment replies
   - Structure of overall summary comment

6. **Quality gates:**
   - When to push changes vs request more work from Implementer
   - What level of documentation is sufficient
   - How to handle disagreements with Implementer's approach

7. **Coordination with Implementer:**
   - When Reviewer takes over from Implementer
   - How to hand back if more implementation needed
   - Protocol for iterative review cycles

**Expected reviewer behaviors missing relative to Issue goal:**

The Issue goal is to "solidify" chatmodes. Missing concrete actions that would solidify the Reviewer role:

1. **Initial review trigger:** When to start reviewing (after Implementer indicates "ready for review")
2. **Review scope:** What to review comprehensively vs what to spot-check
3. **Documentation standards:** Specific guidelines for docstring/comment quality
4. **PR description requirements:** What must be in Phase PR description
5. **Success criteria verification:** How to validate phase meets success criteria
6. **Review iteration protocol:** How many review rounds before escalating to human
7. **Pause points:** When to pause for human input vs proceed autonomously
8. **Quality checklist:** Specific items to verify before opening PR
9. **Guardrails:** What Reviewer must NOT do (e.g., don't rewrite implementation, don't change logic)
10. **Tool usage:** How to use github mcp tools for PR operations

### Question 17: Documentation Agent Scope

**Current PAW-04 Documenter chatmode content:**
- File is empty (0 bytes)
- No scope boundaries or required inputs specified

**Expected scope from paw-specification.md Stage 04:**

**Inputs:**
1. `ImplementationPlan.md` from Stage 02 (expected location: `/docs/agents/<target_branch>/`)
2. All Phases must be complete and merged to target branch
3. Status updated in the plan
4. All PRs from implementation phases (agent can search or refer to GitHub Issue)
5. Any specific documentation guidelines or templates from copilot-instructions.md or other project docs

**Outputs:**
1. `/docs/agents/<target_branch>/Docs.md`
2. Project-specific documentation

**Agent responsibilities:**
1. Produces `Docs.md`
2. Updates project docs according to project guidance
3. Opens a docs PR (`<target_branch>_docs` → `<target_branch>`)
4. Addresses review comments with focused commits

**What Documenter must NOT change (boundaries):**

From specification and workflow logic:

1. **Must NOT modify implementation code** - Implementation phases are complete and merged
2. **Must NOT change test files** - Tests are part of implementation phases
3. **Must NOT modify Spec, SpecResearch, CodeResearch, or ImplementationPlan** - These are inputs, not outputs
4. **Must NOT reopen or modify merged Phase PRs** - Only works on docs PR
5. **Must NOT modify artifacts from other stages** - Only creates Docs.md and updates project docs
6. **Must NOT change functionality** - Only documents what was implemented

**Implicit boundaries:**
- Operates on target branch (not phase branches)
- Creates new branch `_docs` for documentation PR
- Does not merge its own PR (human approval required)

**Required inputs consistent with Stage 04:**

Per specification:
- ✅ ImplementationPlan.md location specified
- ✅ All phases complete requirement
- ✅ Phase PRs as reference
- ✅ Project-specific guidelines

**Missing boundary clarifications in empty chatmode:**

ALL boundaries missing since file is empty. Needed clarifications:

1. **File modification scope:**
   - What files CAN be modified (project docs, README, CHANGELOG)
   - What files CANNOT be modified (implementation, tests, prior stage artifacts)

2. **Documentation depth:**
   - How detailed should documentation be
   - When to reference existing docs vs create new content
   - What level of API documentation is required

3. **Docs.md artifact purpose:**
   - What goes in Docs.md vs project docs
   - Is Docs.md a summary/index or detailed documentation
   - How Docs.md relates to Acceptance Criteria from Spec

4. **Branch and PR protocol:**
   - Must create `_docs` branch
   - Must open docs PR to target branch
   - Must wait for approval before proceeding

5. **Dependencies on other agents:**
   - Status Agent updates Issue after docs PR (coordination)
   - No interaction with Implementer or Reviewer (phases complete)

6. **Guardrails:**
   - Do not document unimplemented features
   - Do not modify implementation decisions
   - Do not change code to match documentation preferences

7. **Quality requirements:**
   - Documentation clarity standards
   - Completeness criteria (all acceptance criteria documented)
   - Consistency with existing project documentation style

8. **Input validation:**
   - What to do if ImplementationPlan shows incomplete phases
   - How to handle missing project documentation guidelines
   - When to pause if inputs are inconsistent

### Question 18: Status Agent Trigger Points

**Triggers documented in PAW-X Status Update chatmode:**

From "Triggers" section:
> "Spec approval; planning PR open/merge; phase PR open/update/merge; docs PR merge; final PR open/merge"

Breaking down into discrete trigger points from chatmode:
1. Spec approval
2. Planning PR open
3. Planning PR merge
4. Phase PR open
5. Phase PR update
6. Phase PR merge
7. Docs PR merge
8. Final PR open
9. Final PR merge

**Triggers enumerated in paw-specification.md:**

From "Status Agent" section:
> "The Status Agent should be invoked at key milestones:
> - After the Planning PR is opened, updated, or merged
> - After each Phase PR is opened, updated, or merged
> - After the Docs PR is opened, updated, or merged
> - After the final PR is opened or merged"

Breaking down into discrete trigger points from spec:
1. Planning PR opened
2. Planning PR updated
3. Planning PR merged
4. Phase PR opened (each phase)
5. Phase PR updated (each phase)
6. Phase PR merged (each phase)
7. Docs PR opened
8. Docs PR updated
9. Docs PR merged
10. Final PR opened
11. Final PR merged

**Comparison - Omissions in chatmode:**

**Missing from PAW-X chatmode:**
1. ❌ "Docs PR open" - Chatmode says "docs PR merge" but not "open"
2. ❌ "Docs PR updated" - Not mentioned in chatmode
3. ❌ "Planning PR updated" - Chatmode says "planning PR open/merge" but not "updated"

**Missing from paw-specification.md:**
1. ❌ "Spec approval" - Chatmode mentions this but spec doesn't list it as a trigger

**Additions in chatmode not in spec:**
1. ➕ "Spec approval" - Chatmode includes this, spec doesn't

**Interpretation differences:**

Chatmode uses shorthand "planning PR open/merge" which could mean:
- Open OR merge (2 events)
- Or could be interpreted as "open through merge" (including updates)

Spec explicitly lists "opened, updated, or merged" (3 events) making it clearer.

**Summary:**
- ⚠️ Chatmode missing "updated" triggers for Planning PR and Docs PR
- ⚠️ Chatmode missing "open" trigger for Docs PR
- ⚠️ Chatmode adds "Spec approval" not listed in spec
- ⚠️ Ambiguous notation ("open/merge") vs explicit enumeration ("opened, updated, or merged")

### Question 19: Guardrail Migration Candidates

**Guardrail/negative instruction categories analysis:**

**Categories present in mature chatmodes:**

**1. Fabrication/Speculation Prohibitions:**
- PAW-01A: "NEVER: fabricate answers not supported by Issue, SpecResearch, or user-provided inputs"
- PAW-01B: "No speculative claims—state only what exists or mark as open unknown"
- PAW-02A: "CRITICAL: YOUR ONLY JOB IS TO DOCUMENT... ONLY describe what exists"
- **Absent in:** PAW-02B (partial), PAW-03A, PAW-X

**2. Scope Creep Prevention:**
- PAW-01A: "NEVER: proceed to final spec if unanswered critical internal clarification questions remain"
- PAW-02A: "DO NOT suggest improvements or changes unless the user explicitly asks"
- PAW-02B: "What We're NOT Doing" section guidance
- PAW-X: "Never change content outside AUTOGEN blocks"
- **Absent in:** PAW-03A

**3. File/Content Modification Boundaries:**
- PAW-01A: Does NOT commit/push (Explicit Non-Responsibilities)
- PAW-01B: "Do not commit changes or post comments to GitHub Issues or PRs"
- PAW-02A: "NEVER write the research document with placeholder values"
- PAW-03A: "ONLY commit changes you made to implement the plan. Do not include unrelated changes"
- PAW-X: "Never modify code"
- **Present in most, weak in:** PAW-02B (no explicit file modification guardrails)

**4. Root Cause Analysis Prohibition:**
- PAW-02A: "DO NOT perform root cause analysis unless the user explicitly asks"
- PAW-02B: (inherited via Comprehensive Research section)
- **Absent in:** PAW-01A, PAW-01B, PAW-03A, PAW-X

**5. Implementation Detail Avoidance:**
- PAW-01A: "Focus on user value (WHAT & WHY), not implementation (no tech stack, file paths, library names)"
- PAW-01B: "no code line granularity... conceptual, no file refs"
- **Absent in:** PAW-02A, PAW-02B, PAW-03A, PAW-X (appropriate - they need implementation details)

**6. Quality Critique Prohibition:**
- PAW-02A: "DO NOT critique the implementation or identify problems"
- PAW-02A: "DO NOT recommend refactoring, optimization, or architectural changes"
- PAW-02B: (inherited)
- **Absent in:** PAW-01A, PAW-01B, PAW-03A, PAW-X

**7. Assumption Documentation Requirement:**
- PAW-01A: "ALWAYS: ensure minimal format header lines are present and correctly ordered"
- PAW-01A: Assumptions section mandatory when skipping research
- **Absent in:** All others

**8. Idempotency Requirement:**
- PAW-X: "Be idempotent: re-running should not produce diffs without state changes"
- **Absent in:** All others

**9. Complete Reading Before Action:**
- PAW-02A: "NEVER read files partially - if a file is mentioned, read it completely"
- PAW-02A: "Read all mentioned files FULLY"
- PAW-02B: (inherited)
- **Absent in:** PAW-01A, PAW-01B, PAW-03A, PAW-X

**10. External Research Boundaries:**
- PAW-01B: "Does NOT perform external/web searches"
- PAW-01A: "NEVER: silently assume critical external standards; if needed list as optional external/context question + assumption"
- **Absent in:** PAW-02A (can search), PAW-02B, PAW-03A, PAW-X

**11. Git Operation Restrictions:**
- PAW-01A: Explicit Non-Responsibilities: "Git add/commit/push operations. No Planning PR creation."
- PAW-01B: "Do not commit changes"
- **Absent in:** PAW-02A, PAW-02B (no git operations mentioned)
- **Present but weak in:** PAW-03A (does commit, needs boundaries)

**12. GitHub Interaction Boundaries:**
- PAW-01A: "No posting comments / status to GitHub Issues or PRs (Status Agent does that)"
- PAW-03A: "Commenting on PRs: prefix your comment with **Implementation Agent:**"
- PAW-X: "Never assign reviewers, change labels (except status/*)"
- **Absent in:** PAW-01B, PAW-02A, PAW-02B

**Guardrail categories present in ONE mature chatmode but absent in all others:**

**Category: Idempotency Requirement**
- **Source:** PAW-X Status Update
- **Wording:** "Be idempotent: re-running should not produce diffs without state changes"
- **Absent in:** PAW-01A, PAW-01B, PAW-02A, PAW-02B, PAW-03A
- **Relevance:** Potentially applicable to all agents that write files or update state

**Category: Root Cause Analysis Prohibition**
- **Source:** PAW-02A Code Researcher
- **Wording:** "DO NOT perform root cause analysis unless the user explicitly asks for them"
- **Absent in:** PAW-01A, PAW-01B, PAW-03A, PAW-X
- **Relevance:** Could apply to Implementer (just implement, don't analyze why things were wrong)

**Category: Complete File Reading Requirement**
- **Source:** PAW-02A Code Researcher
- **Wording:** "NEVER read files partially - if a file is mentioned, read it completely"
- **Absent in:** PAW-01A, PAW-01B, PAW-03A, PAW-X
- **Relevance:** Should apply to all agents reading files (Spec Agent reads Issue, Implementer reads plan)

**Category: Placeholder Value Prohibition**
- **Source:** PAW-02A Code Researcher
- **Wording:** "NEVER write the research document with placeholder values"
- **Absent in:** All others
- **Relevance:** Could generalize to "Never write any artifact with placeholder values"

**Category: Assumption Documentation When Skipping Steps**
- **Source:** PAW-01A Spec Agent
- **Wording:** "If research was skipped: include an Assumptions section and Risks section note"
- **Absent in:** All others
- **Relevance:** Could apply to any agent that can skip optional research/verification steps

**Migration candidates list:**

1. **Idempotency** (PAW-X) → All agents that write files
2. **No root cause analysis** (PAW-02A) → Implementer, potentially others
3. **Complete file reading** (PAW-02A) → All agents reading files
4. **No placeholder values** (PAW-02A) → All agents creating artifacts
5. **Document assumptions when skipping** (PAW-01A) → Agents with optional steps
6. **No quality critique** (PAW-02A) → Documenters, potentially Implementer
7. **External research boundaries** (PAW-01B) → Clarify for all agents which can/cannot

### Question 20: Ambiguity Hotspots

**Phrases across chatmodes that could be interpreted variably:**

**1. "update" without scope qualifier:**

**PAW-X Status Update:**
- "What to keep updated" - could mean any change vs specific defined changes
- Context: Section defines specific content to update (Issue dashboard, PR blocks)
- **Ambiguity:** Mild - defined in context but word itself is broad

**PAW-01A Spec Agent:**
- "updating assumptions" - could mean revise existing vs add new
- Context: "Integrate Research... updating assumptions"
- **Ambiguity:** Moderate - unclear if append, replace, or refine

**PAW-03A Implementer:**
- "Update your progress in both the plan and your todos"
- "Update checkboxes in the plan"
- Context: Verification Approach section
- **Ambiguity:** Low - context clarifies checkboxes and status notes

**PAW-02B Impl Planner:**
- "Update backend logic"
- Context: Common Patterns for Database Changes
- **Ambiguity:** High - no specificity on what kind of update

**2. "refine" without scope:**

**PAW-01A Spec Agent:**
- "Review and refine `spec-research.prompt.md`"
- "ask the developer directly and pauses until clarified. It does **not** block on optional external/context questions; the specification proceeds using explicit assumptions where needed"
- "Continue iterating with the above steps until the spec is clear, complete, and testable"
- Context: Human Workflow in paw-specification
- **Ambiguity:** Moderate - could mean minor edits vs major restructuring

**PAW-02B Impl Planner:**
- "Continue refining until the user is satisfied"
- Context: Review section
- **Ambiguity:** High - no definition of what aspects to refine or exit criteria

**3. "research" without depth qualifier:**

**PAW-01A Spec Agent:**
- "pause for research" vs "skip research"
- Context: Working Modes
- **Ambiguity:** Low in context but "research" could mean many things

**PAW-02A Code Researcher:**
- "Perform comprehensive research"
- Context: Steps section
- **Ambiguity:** Low - methodology section defines "comprehensive"

**PAW-02B Impl Planner:**
- "Research & Discovery" (step name)
- "Perform comprehensive research"
- Context: Process Steps
- **Ambiguity:** Low - inherits Code Researcher's methodology

**Multiple interpretations:**
- Spec Agent: behavioral/conceptual research
- Code Researcher: file/implementation research
- Impl Planner: technical feasibility research
- **Cross-chatmode ambiguity:** "research" means different depths in different contexts

**4. "review" without criteria:**

**PAW-03A Implementer:**
- "Review comments" vs "ready for review" vs "review the PR"
- Context: Throughout Getting Started
- **Ambiguity:** High - sometimes means PR review comments, sometimes means review action, sometimes means state

**PAW-02B Impl Planner:**
- "Please review it and let me know"
- Context: After writing plan
- **Ambiguity:** Moderate - unclear what constitutes sufficient review

**PAW-03B Expected (empty):**
- File name "Impl Reviewer" implies "review" action
- **Ambiguity:** Currently undefined - needs criteria for what review entails

**5. "complete" without verification:**

**PAW-02A Code Researcher:**
- "Ensure all research is complete"
- Context: Step 4
- **Ambiguity:** Moderate - how to know research is complete vs could dig deeper

**PAW-02B Impl Planner:**
- "final plan must be complete"
- Context: Quality Standards
- **Ambiguity:** Low - defined as "No Open Questions"

**PAW-03A Implementer:**
- "Phase N Complete"
- Context: Verification Approach
- **Ambiguity:** Low - defined by success criteria

**6. "relevant" without boundaries:**

**PAW-02A Code Researcher:**
- "Find WHERE files and components live: Locate relevant files"
- Context: Code Location section
- **Ambiguity:** High - what makes a file "relevant"? Direct references? Indirect? Similar patterns?

**PAW-03A Implementer:**
- "Read the plan completely and check for any existing checkmarks"
- "All files mentioned in the plan"
- Context: Getting Started
- **Ambiguity:** Low - "mentioned" is specific

**7. "appropriate" or "sufficient" without standards:**

**PAW-01A Spec Agent:**
- "appropriate for research agent" - in Spec Research boundary discussion
- Context: Question 3 answer in this document
- **Ambiguity:** Moderate - subjective judgment

**PAW-02B Impl Planner:**
- "Does this phasing make sense?" 
- Context: Plan Structure Development
- **Ambiguity:** High - no objective criteria for "makes sense"

**8. "clear" without definition:**

**PAW-01A Spec Agent:**
- "until the spec is clear, complete, and testable"
- Context: Human Workflow
- **Ambiguity:** Moderate - "testable" is defined but "clear" is subjective

**PAW-02B Impl Planner:**
- "Add/remove/clarify" 
- Context: Various
- **Ambiguity:** Moderate - degree of clarification not specified

**9. "necessary" or "needed" without criteria:**

**PAW-02A Code Researcher:**
- "Use tools and research steps as needed"
- Context: Handle follow-up questions
- **Ambiguity:** High - agent must decide what's "needed"

**PAW-03A Implementer:**
- "asking for clarification if needed"
- Context: Addressing review comments
- **Ambiguity:** Moderate - when is clarification "needed" vs proceeding with best guess

**10. "properly" or "correctly" without specification:**

**PAW-01A Spec Agent:**
- "ALWAYS: ensure minimal format header lines are present and correctly ordered"
- Context: Guardrails
- **Ambiguity:** Low - "correct" order is defined in Research Prompt Minimal Format

**PAW-03A Implementer:**
- "ensure the proper branch setup"
- Context: Getting Started
- **Ambiguity:** Low - defined in same section

**Phrases with file & line references (where feasible):**

Due to chatmode format (not line-numbered in repository), providing section references:

| Phrase | Chatmode | Section | Ambiguity Level | Reason |
|--------|----------|---------|----------------|---------|
| "update" | PAW-02B | Common Patterns | High | No specifics on what to update |
| "refine" | PAW-02B | Review | High | No exit criteria |
| "research" | Multiple | Various | Medium | Means different depths |
| "review" | PAW-03A | Throughout | High | Multiple meanings |
| "complete" | PAW-02A | Step 4 | Medium | No completeness test |
| "relevant" | PAW-02A | Code Location | High | Boundary unclear |
| "makes sense" | PAW-02B | Step 3 | High | Subjective |
| "clear" | PAW-01A | Quality Bar | Medium | Defined elsewhere |
| "needed" | Multiple | Various | High | Agent decides |
| "sufficient" | PAW-02B | Review | High | No standard |

**Highest ambiguity hotspots requiring clarification:**

1. **"relevant" in Code Researcher** - needs heuristics for relevance (direct imports? same domain? similar names?)
2. **"update" in Impl Planner Common Patterns** - needs specific change types
3. **"refine" in Impl Planner** - needs definition of refinement scope and completion
4. **"review" in Implementer** - conflates PR comments, review action, and readiness state
5. **"makes sense" in Impl Planner** - needs objective criteria for phase structure
6. **"complete" in Code Researcher** - needs test for research completeness

## Open Unknowns

*(None at this stage - all internal questions answered through document analysis)*

## User-Provided External Knowledge (Manual Fill)

### Optional External / Context Questions

1. **Industry Prompting Patterns:** Are there external established prompt structuring patterns (e.g., widely cited specification or research agent frameworks) that could inspire missing sections? (Manual)

2. **Comparative Agent Benchmarks:** What benchmark criteria (latency, accuracy, reusability) might be used later to evaluate improved chatmodes? (Manual)

3. **Legal / Compliance Considerations:** Any domain compliance constraints that would affect prompt guardrails? (Manual)

4. **Accessibility / Inclusion Prompting Guidelines:** Are there standards to reflect in documentation or review prompts? (Manual)

5. **External taxonomy alignment:** Should naming align with any recognized industry lifecycle terminology beyond PAW? (Manual)

*(User may add answers inline when available)*
