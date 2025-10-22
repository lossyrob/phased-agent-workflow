## Overview

The **PAW Review Workflow** is a structured, three-stage process for thoughtful code review of any pull request. It helps reviewers understand changes, evaluate their impact, identify gaps, and provide considerate, actionable feedback—especially valuable for large or poorly-documented PRs.

PAW Review applies the same principles as the implementation workflow: **traceable reasoning**, **rewindable analysis**, and **human-in-the-loop decision making**. Instead of building code forward from a spec, it works backward from implementation to understanding, then strategically decides what feedback to provide.

**Key properties**

* **Understanding before critique** – Analyze what changed and why before evaluating quality
* **Comprehensive feedback** – Generate all findings; human filters and adjusts based on context
* **Artifact-based** – Durable markdown documents trace reasoning from changes to comments
* **Rewindable** – Any stage can restart if new information changes understanding
* **Human-controlled** – Nothing posted automatically; reviewer selects what to post and can ask agent to adjust tone

---

## Repository Layout

```
.paw/
  reviews/
    PR-<number>/              # e.g., PR-123/
      PRContext.md
      DerivedSpec.md
      ChangeAnalysis.md
      ImpactAnalysis.md
      GapAnalysis.md
      ReviewComments.md
```

---

## Workflow Stages

### Stage R1 — Understanding

**Goal:** Comprehensively understand what changed and why

**Agent:** Review Understanding Agent

**Inputs:**
* PR URL or number
* Repository context

**Outputs:**
* `.paw/reviews/PR-<number>/PRContext.md` – PR metadata, author, description, CI status, changed files summary
* `.paw/reviews/PR-<number>/DerivedSpec.md` – Reverse-engineered intent and acceptance criteria
* `.paw/reviews/PR-<number>/ChangeAnalysis.md` – Categorized changes (feature code, tests, docs, mechanical vs semantic)

**Process:**

1. **Fetch PR metadata and diff**
   - Read PR description, linked issues, commit messages
   - Get file changes with additions/deletions statistics
   - Check CI/test status, code quality results
   - Note labels, reviewers, current state

2. **Analyze changes**
   - Categorize files by type (implementation, tests, docs, config, generated)
   - Identify mechanical changes (formatting, renames, bulk updates) vs semantic changes
   - Map affected components and subsystems
   - Detect patterns: new features, refactoring, bug fixes, migrations

3. **Derive intent**
   - Reverse-engineer what the author was trying to accomplish
   - Extract acceptance criteria from the implementation
   - Document observable before/after behavior
   - Identify stated goals (from PR description) vs inferred goals (from code)
   - List assumptions and open questions

**Human Workflow:**

* Invoke the Review Understanding Agent with PR number
* Review the generated artifacts to ensure understanding is accurate
* Correct any misinterpretations in `DerivedSpec.md`
* Add context the agent couldn't infer from the PR itself
* Proceed to Stage R2 once understanding feels complete

---

### Stage R2 — Evaluation

**Goal:** Assess impact and identify what might be missing or concerning

**Agent:** Review Evaluation Agent

**Inputs:**
* All Stage R1 artifacts
* Repository codebase at base and head commits

**Outputs:**
* `.paw/reviews/PR-<number>/ImpactAnalysis.md` – System-wide effects, integration points, breaking changes
* `.paw/reviews/PR-<number>/GapAnalysis.md` – Findings organized by Must/Should/Could with evidence

**Process:**

1. **Research baseline state**
   - Investigate how the system worked before these changes
   - Document existing patterns, conventions, and constraints
   - Identify integration points and dependent components
   - Review relevant test coverage and documentation

2. **Analyze impact**
   - Map downstream effects of the changes
   - Identify public API changes, schema migrations, wire format changes
   - Check for potential breaking changes or compatibility issues
   - Assess performance implications (hot paths, new queries, data volume)
   - Note security and authorization changes

3. **Identify gaps**
   - **Correctness:** Logic errors, edge cases, error handling, invariants
   - **Safety:** Input validation, authorization checks, concurrency issues, data integrity
   - **Compatibility:** Breaking changes, migration paths, backward compatibility
   - **Testing:** Missing test coverage, untested edge cases, test quality
   - **Reliability:** Retry logic, idempotency, failure modes, observability
   - **Maintainability:** Code clarity, documentation, naming, duplication
   - **Performance:** N+1 queries, unbounded operations, resource usage

4. **Categorize findings**
   - **Must** – Correctness, safety, security, data integrity issues that must be addressed
   - **Should** – Missing tests, unclear behavior, maintainability concerns, compatibility issues that should be addressed
   - **Could** – Style improvements, documentation enhancements, minor refactors that could optionally be addressed

5. **Assess review scope**
   - Flag if PR is too large to review effectively
   - Note if changes are high-risk due to size × complexity × criticality
   - Suggest splitting approach if needed (politely)

**Human Workflow:**

* Review `ImpactAnalysis.md` to understand system-wide effects
* Read through `GapAnalysis.md` findings in each category
* Validate that categorization (Must/Should/Could) feels appropriate
* Add domain-specific concerns the agent might have missed
* Decide which findings warrant feedback based on relationship context
* Proceed to Stage R3 to generate comments

---

### Stage R3 — Feedback Generation

**Goal:** Generate comprehensive, well-structured review comments

**Agent:** Review Feedback Agent

**Inputs:**
* All prior artifacts

**Outputs:**
* `.paw/reviews/PR-<number>/ReviewComments.md` – Comprehensive review feedback organized by priority (for reference)
* **GitHub pending review** – Draft review with all comments posted but not yet visible to author

**Process:**

1. **Generate comprehensive feedback**
   - Transform all findings from `GapAnalysis.md` into review comments
   - Include Must, Should, and Could items
   - Provide specific, actionable suggestions with code examples where helpful
   - Link to review artifacts for detailed reasoning
   - Batch related issues into cohesive comments

2. **Structure feedback**
   - **Summary comment** – Brief, positive opening with overview of feedback
   - **Inline comments** – Line-specific comments for code issues tied to specific locations
   - **Thread comments** – File or concept-level comments for broader issues
   - **Must-address items** – Critical issues with clear rationale and suggestions
   - **Should-address items** – Important improvements with reasoning
   - **Could-consider items** – Optional enhancements offered constructively
   - **Questions** – Clarifying questions about intent or approach

3. **Create pending review on GitHub**
   - Use `mcp_github_pull_request_review_write` (method: create) to start a pending review
   - Add inline comments using `mcp_github_add_comment_to_pending_review` for each line-specific issue
   - Save comprehensive version to `ReviewComments.md` for reference

**Human Workflow:**

* Invoke Review Feedback Agent to generate and post pending review
* **Open the PR in GitHub** to view the pending review
* **Review all comments** in GitHub's pending review interface
* **Delete unwanted comments** that don't fit the context or relationship
* **Edit comment text** to adjust tone, wording, or emphasis
* **Add new comments** inline if additional issues found
* **Option: Ask agent to adjust tone** - Agent can update pending comments if tone needs broad changes
* **Submit the review** when satisfied (Approve/Comment/Request Changes)

---

## Artifacts

### PRContext.md

Captures the initial state and metadata of the pull request.

**Contents:**
- PR number, title, author
- Repository and branches (base → head)
- PR description (author's stated intent)
- Linked issues and references
- Labels and current reviewers
- CI/test status summary
- Changed files with statistics (additions/deletions)
- File categorization (implementation, tests, docs, config)

**Purpose:** Quick reference for PR basics; establishes shared context for all subsequent stages.

---

### DerivedSpec.md

A reverse-engineered specification inferred from the implementation.

**Contents:**
- **Intent Summary** – What problem this appears to solve
- **Scope** – What's in scope and explicitly out of scope
- **Assumptions** – Inferences made from the code
- **Measurable Outcomes** – Observable behaviors before and after
- **Changed Interfaces** – Public APIs, routes, CLI options, schemas, data models
- **Risks & Invariants** – System properties that must hold
- **User-Visible Changes** – UI, UX, configuration, behavior changes
- **Migration Notes** – Data migrations, upgrade paths, compatibility
- **Open Questions** – Ambiguities or uncertainties about intent

**Purpose:** Creates a testable specification even when the author didn't provide one; serves as the baseline for gap analysis.

---

### ChangeAnalysis.md

Structured categorization of what changed.

**Contents:**
- **Summary Statistics** – Total files, lines added/removed, languages
- **Change Categories:**
  - Feature code (new functionality)
  - Bug fixes (corrections)
  - Refactoring (structural improvements)
  - Tests (new or modified tests)
  - Documentation (README, API docs, comments)
  - Configuration (settings, dependencies, build)
  - Generated code (auto-generated, vendored)
  - Infrastructure (CI, deployment, tooling)
- **Mechanical vs Semantic:**
  - Mechanical: formatting, renames, bulk updates, generated changes
  - Semantic: logic changes, new behavior, algorithm modifications
- **Component Mapping** – Which subsystems/modules are affected
- **Hot Spots** – Files with highest churn or complexity

**Purpose:** Helps prioritize review focus; identifies what deserves deep attention vs quick acknowledgment.

---

### ImpactAnalysis.md

System-wide effects and integration analysis.

**Contents:**
- **Baseline State** – How the system worked before these changes (behavioral view)
- **Integration Points** – Where these changes connect to other components
- **Public API Changes** – Routes, RPC methods, exported functions, CLI commands
- **Data Changes** – Schema migrations, data format changes, new tables/fields
- **Breaking Changes** – Backward compatibility implications
- **Performance Implications** – Hot paths touched, new queries, resource usage
- **Security Implications** – Authentication, authorization, input validation changes
- **Deployment Considerations** – Migration requirements, feature flags, rollout strategy
- **Dependencies** – New libraries, version changes, external service interactions
- **Historical Context** – Prior issues or PRs in these areas, related TODOs

**Purpose:** Ensures reviewer understands ripple effects; surfaces non-obvious impacts.

---

### GapAnalysis.md

Findings organized by severity and category.

**Structure:**

```markdown
## Must Address (Correctness/Safety)

### [Finding Title]
**File:** `path/to/file.ts:123`
**Category:** [Correctness | Safety | Security | Data Integrity]
**Issue:** [Clear description]
**Evidence:** [Specific code references or test results]
**Impact:** [What could go wrong]
**Suggestion:** [Specific fix or approach]

## Should Address (Quality/Completeness)

### [Finding Title]
**File:** `path/to/file.ts:456`
**Category:** [Testing | Maintainability | Compatibility | Reliability]
**Issue:** [Clear description]
**Evidence:** [Specific references]
**Rationale:** [Why this matters]
**Suggestion:** [Recommended improvement]

## Could Consider (Optional Improvements)

### [Finding Title]
**File:** `path/to/file.ts:789`
**Category:** [Documentation | Code Quality | Performance]
**Observation:** [What could be improved]
**Benefit:** [Why this would help]
**Suggestion:** [Optional enhancement]
```

**Categories:**
- **Correctness:** Logic errors, edge cases, error handling, invariants
- **Safety:** Input validation, authorization, concurrency, data integrity
- **Security:** Authentication, injection vulnerabilities, sensitive data handling
- **Compatibility:** Breaking changes, migration paths, version compatibility
- **Testing:** Coverage gaps, missing edge cases, test quality
- **Reliability:** Retry logic, idempotency, failure modes, observability
- **Maintainability:** Code clarity, documentation, naming, duplication
- **Performance:** N+1 patterns, unbounded operations, resource efficiency

**Purpose:** Provides structured, evidence-based findings; human reviewer selects which to include in final comments.

---

### ReviewComments.md

Reference copy of all review feedback (actual comments are in GitHub pending review).

**Structure:**

```markdown
# Review Comments for PR #[number]

**Note:** These comments have been posted as a pending review on GitHub. 
Review and edit them at: [PR review URL]

## Summary Comment (Pending review body)

[Opening acknowledgment]

[Brief overview of feedback]

**Findings:** X Must-address items, Y Should-address items, Z optional suggestions

Full review artifacts: `.paw/reviews/PR-[number]/`

---

## Inline Comments (Posted to pending review)

These comments are posted to specific lines in the GitHub pending review.

### `path/to/file.ts` Line 123-127

**Type:** Must | Should | Could  
**Category:** [Correctness | Safety | Testing | etc.]

[Specific comment about this code block]

**Suggestion:**
```[language]
// Proposed fix or approach
```

**Posted:** ✓ (pending review comment ID: [id])

### `path/to/another.ts` Line 45

**Type:** Should  
**Category:** Testing

[Comment about missing test coverage for this specific function]

**Posted:** ✓ (pending review comment ID: [id])

---

## Thread Comments (Not yet supported in pending reviews)

File-level or PR-level comments to add manually if needed.

### File: `path/to/file.ts`

**Type:** Must  
**Category:** Security

[Discussion about overall approach to security in this file]

### General: Architecture

**Type:** Should  
**Category:** Maintainability

[Broader concern about the architectural approach across multiple files]

---

## Questions

1. [Clarifying question about intent - add manually to review or as inline comment]
2. [Question about edge case or design decision]
```

**Comment Type Guidance:**

- **Inline comments** – Posted directly to specific lines via pending review:
  - Logic errors in a specific function
  - Missing null check at a particular location
  - Incorrect usage of an API
  - Performance issue in a specific loop
  - Missing test for a specific code path

- **Thread comments** – Add manually to the review body or as follow-up:
  - Overall file organization or structure
  - Missing integration tests across components
  - Architectural concerns affecting multiple files
  - Consistent pattern violations throughout
  - Cross-cutting concerns (logging, error handling approach)

**Purpose:** 
- Serves as reference copy of all generated comments
- Documents what was posted to the pending review
- Includes thread-level comments that need manual posting
- Can be used to regenerate comments if pending review is deleted

---

## Guardrails

### Review Understanding Agent

**Documentation, Not Critique:**
- NEVER critique or suggest improvements during understanding phase
- ONLY document what exists and what changed
- DO NOT make assumptions about unstated intent; flag ambiguities explicitly
- ALWAYS distinguish between stated goals (from PR description) and inferred goals (from code analysis)
- DO NOT skip reading the full PR description, linked issues, and commit messages
- NEVER fabricate intent; if unclear, mark as "Open Question" in DerivedSpec

**Mechanical Change Detection:**
- ALWAYS identify and separate mechanical changes (formatting, renames) from semantic changes
- DO NOT treat mechanical changes as requiring deep review
- Collapse mechanical changes into brief acknowledgment

**Accuracy:**
- Read files completely to understand context (no partial reads)
- Include specific file:line references for all observations
- Cross-reference PR description claims against actual code changes
- Note discrepancies between stated and implemented behavior

---

### Review Evaluation Agent

**Evidence-Based Analysis:**
- NEVER inflate severity to justify more comments
- ALWAYS provide concrete evidence (file:line references, test results, data)
- DO NOT flag style preferences as "Must" items
- Distinguish between actual gaps and "not how I would do it"
- ONLY categorize as "Must" if there's a clear correctness, safety, or security impact

**Baseline Research:**
- Research the codebase at the base commit to understand pre-change state
- Document patterns and conventions that existed before
- DO NOT recommend changes that conflict with established patterns without strong rationale
- Check for similar implementations in the codebase for consistency

**Impact Analysis:**
- Map all integration points and downstream effects
- Check for breaking changes in public APIs
- Identify data migration requirements
- Consider deployment and rollout implications
- NEVER assume changes are isolated; verify

**Gap Identification:**
- Focus on objective gaps: missing tests, unhandled errors, unchecked inputs
- Check edge cases, error paths, and boundary conditions
- Verify test coverage for new code paths
- Look for race conditions, concurrency issues, resource leaks
- DO NOT invent requirements not in the DerivedSpec

---

### Review Feedback Agent

**Human Control:**
- NEVER submit the review automatically; always create as pending
- ALWAYS save a reference copy to ReviewComments.md
- DO NOT filter findings based on assumptions about relationship or context
- Include ALL findings from GapAnalysis.md organized by Must/Should/Could
- Post all inline comments to the pending review
- Human will delete, edit, or adjust comments in GitHub's UI before submitting

**Pending Review Creation:**
- Create a new pending (draft) review on the PR using GitHub MCP tools
- Add inline comments to the pending review for each line-specific finding:
  - Specify file path relative to repository root
  - Specify line number (or line range for multi-line comments)
  - Specify which side of the diff (new code vs old code)
  - Include comment text with suggestion
- Save the pending review for human to edit and submit
- Do not submit the review automatically

**Tone Adjustment Support:**
- If human requests tone changes, delete the pending review and recreate with adjusted tone
- Use GitHub MCP tools to remove the pending review
- Regenerate all comments with requested tone adjustments
- Recreate pending review with updated comments
- Alternative: Human can edit individual comments directly in GitHub's UI

**Comment Quality:**
- Batch related issues into single, cohesive comments
- Provide specific, actionable suggestions with code examples
- Link to review artifacts for detailed reasoning in review body
- Use professional, constructive tone throughout
- Use inclusive language ("we", "let's") rather than accusatory ("you didn't")
- **Distinguish inline vs thread comments** based on whether the issue is location-specific or broader
- For inline comments, specify exact file path and line numbers/ranges
- Document any thread comments in ReviewComments.md for manual addition

**Noise Reduction:**
- DO NOT create separate inline comments for every minor issue on adjacent lines; batch them
- Group related items by file or concept
- Collapse minor items into fewer comprehensive comments
- NEVER comment on code the PR didn't touch
- Skip style feedback unless it impacts readability significantly
- Use thread comments for patterns that appear multiple times instead of commenting each instance inline

---

## Quality Checklist

Each stage produces artifacts that should meet these quality standards:

### Understanding Stage (R1)

- [ ] `PRContext.md` includes all PR metadata and change statistics
- [ ] `DerivedSpec.md` clearly states both explicit and inferred intent
- [ ] Open questions in `DerivedSpec.md` are specific and answerable
- [ ] `ChangeAnalysis.md` categorizes all changed files
- [ ] Mechanical changes are identified and separated from semantic changes
- [ ] No assumptions about intent without supporting evidence

### Evaluation Stage (R2)

- [ ] `ImpactAnalysis.md` covers integration points and downstream effects
- [ ] Baseline state is documented for affected components
- [ ] All findings in `GapAnalysis.md` have specific file:line references
- [ ] Must/Should/Could categorization is evidence-based
- [ ] Breaking changes and compatibility issues are identified
- [ ] Test coverage gaps are specifically noted

### Feedback Stage (R3)

- [ ] Pending review created on GitHub (not submitted)
- [ ] `ReviewComments.md` saved as reference copy
- [ ] All inline comments from GapAnalysis.md posted to pending review
- [ ] Inline comments specify exact file paths and line numbers
- [ ] Thread comments documented in ReviewComments.md for manual addition
- [ ] All comments are actionable with clear suggestions
- [ ] Related issues are batched to reduce noise
- [ ] Tone is constructive and professional
- [ ] Summary/body comment is brief and welcoming
- [ ] Code examples provided for non-trivial suggestions

---

## Example Workflow

### Reviewing a Medium-Sized PR (200-500 lines)

**Stage R1 (10-15 minutes):**
1. Invoke Review Understanding Agent with PR number
2. Read generated `PRContext.md` and `DerivedSpec.md`
3. Verify understanding matches your reading of the PR
4. Note any open questions in `DerivedSpec.md`

**Stage R2 (15-25 minutes):**
1. Invoke Review Evaluation Agent
2. Read `ImpactAnalysis.md` to understand system effects
3. Review findings in `GapAnalysis.md`
4. Validate categorization feels appropriate
5. Add any domain-specific concerns

**Stage R3 (10-20 minutes):**
1. Invoke Review Feedback Agent to create pending review
2. **Agent creates pending review** with all inline comments via GitHub MCP tools
3. **Agent saves** ReviewComments.md as reference
4. **Open the PR in GitHub** to view pending review
5. **Review all pending comments** in GitHub's Files Changed tab
6. **Delete unwanted comments** by clicking X on each comment
7. **Edit comment text** by clicking Edit on any comment to adjust tone/wording
8. **Add new comments** directly in GitHub if needed
9. **Optional: Ask agent for tone adjustment** - Agent will delete and recreate pending review with new tone
10. **Submit review** when satisfied (Approve/Comment/Request Changes)

**Total time:** 35-60 minutes for thorough, structured review

---

### Reviewing a Large PR (1000+ lines)

**Stage R1 (20-30 minutes):**
1. Start with Review Understanding Agent
2. Review change categorization
3. If mechanical changes dominate, note for quick acknowledgment
4. Focus on semantic changes for deep review
5. Consider suggesting PR split if too complex

**Stage R2 (30-45 minutes):**
1. Run Review Evaluation Agent
2. Focus on high-risk areas (auth, data, public APIs)
3. Check for missing tests on complex logic
4. Review integration points carefully
5. Note if "too large to review thoroughly"

**Stage R3 (15-25 minutes):**
1. Generate comprehensive feedback with agent
2. Agent creates pending review with all comments
3. **Open PR in GitHub** to review all pending comments
4. **Edit or delete** comments to fit PR scope and relationship
5. May suggest splitting PR in review body
6. Adjust tone for critical Must items if needed
7. **Submit review** when ready

**Total time:** 65-110 minutes, with possible recommendation to split PR

---

## Relationship to Implementation Workflow

### Similarities

- **Staged with artifacts:** Each stage produces durable markdown documents
- **Rewindable:** Can restart earlier stages if understanding changes
- **Human-in-loop:** Critical decisions require human judgment
- **Evidence-based:** All findings traced to specific code references
- **Traceable:** Clear lineage from changes → understanding → evaluation → feedback

### Differences

- **Direction:** Reverse engineering (implementation → spec) vs forward design (spec → implementation)
- **Output:** Analysis and feedback vs code changes
- **Cycle time:** Hours vs days/weeks
- **Iteration:** Typically single-pass per stage vs multiple implementation phases

### Integration Points

- **Post-review:** Can create implementation issues/PRs from Must/Should items using PAW implementation workflow
- **Artifacts:** Review artifacts can inform future implementation planning
- **Patterns:** Gap analysis categories can improve future Spec and Implementation Plan quality

