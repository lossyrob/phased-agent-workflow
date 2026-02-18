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

## Skills-Based Architecture

The review workflow uses a **skills-based architecture** for dynamic, maintainable orchestration.

**Invocation:** `/paw-review <PR-number-or-URL>`

**How it works:**

1. The **PAW Review** agent loads the `paw-review-workflow` skill
2. The workflow skill orchestrates **activity skills** via subagent execution
3. Each activity skill produces specific artifacts
4. Complete review runs without manual pauses between stages

**Bundled Skills:**

| Skill | Type | Stage | Output |
|-------|------|-------|--------|
| `paw-review-workflow` | Workflow | — | Orchestration logic, core principles |
| `paw-review-understanding` | Activity | Understanding | ReviewContext.md, DerivedSpec.md |
| `paw-review-baseline` | Activity | Understanding | CodeResearch.md |
| `paw-review-impact` | Activity | Evaluation | ImpactAnalysis.md |
| `paw-review-gap` | Activity | Evaluation | GapAnalysis.md |
| `paw-review-correlation` | Activity | Evaluation | CrossRepoAnalysis.md (multi-repo only) |
| `paw-review-feedback` | Activity | Output | ReviewComments.md (draft → finalized) |
| `paw-review-critic` | Activity | Output | Assessment sections in ReviewComments.md |
| `paw-review-github` | Activity | Output | GitHub pending review (GitHub PRs only) |

**Tool Support:**

- `paw_get_skills` — Retrieves catalog of available skills with metadata
- `paw_get_skill` — Loads specific skill content by name

---

## Cross-Repository Review

PAW Review supports reviewing coordinated changes across multiple repositories—common in monorepo setups, microservice architectures, or multi-package releases.

### Invocation

Review multiple PRs together:

```
/paw-review https://github.com/org/api/pull/123 https://github.com/org/frontend/pull/456
```

Or with shorthand:
```
/paw-review PR-123 PR-456
```

### Detection

Multi-repository mode activates when:
- Multiple PR URLs/numbers provided to the review command
- Multiple workspace folders open in VS Code (detected via multiple `.git` directories)
- PR links reference different repositories

### How It Works

1. **Per-repository processing**: Creates separate artifact directories (`PR-123-api/`, `PR-456-frontend/`)
2. **Independent analysis**: Each PR analyzed through full Understanding, Evaluation stages
3. **Cross-repo correlation**: Impact and Gap skills identify dependencies between repositories
4. **Multi-PR pending reviews**: Creates pending reviews on each PR with cross-references

### Cross-Repository Artifacts

**ReviewContext.md** includes related PRs:
```yaml
repository: org/api
related_prs:
  - number: 456
    repository: org/frontend
    relationship: "depends-on"
```

**CodeResearch.md** includes cross-repository patterns section documenting shared conventions, interface contracts, and dependency relationships.

**ImpactAnalysis.md** includes:
```markdown
## Cross-Repository Dependencies

| This PR Changes | Affects PR | Type | Migration |
|-----------------|------------|------|-----------|
| `api/types.ts` exports | PR-456-frontend | Breaking | Update imports |

### Deployment Order
1. Deploy `api` first
2. Deploy `frontend` second
```

**GapAnalysis.md** includes cross-repository consistency checks:
- Version consistency (package versions, shared types)
- Coordinated changes (API consumer updates, schema propagation)
- Timing dependencies (deployment order, feature flags)

**ReviewComments.md** includes cross-references:
```
This API change requires a frontend update. (See also: org/frontend#456)
```

### Single-PR Unchanged

Single-PR workflows remain unchanged—multi-repo sections only appear when the context triggers multi-repository mode.

---

## Repository Layout

```
.paw/
  reviews/
    PR-<number>/              # Single PR (e.g., PR-123/)
      ReviewContext.md        # Authoritative parameter source
      prompts/
        code-research.prompt.md  # Generated research questions
      CodeResearch.md         # Pre-change baseline understanding
      DerivedSpec.md         # Reverse-engineered specification
      ImpactAnalysis.md      # System-wide effects
      GapAnalysis.md         # Categorized findings
      ReviewComments.md      # Complete feedback with comment history
    PR-<number>-<repo-slug>/  # Multi-repo PR (e.g., PR-123-my-api/)
      ...                     # Same structure per repository
      CrossRepoAnalysis.md    # Cross-repository correlation (multi-repo only)
    <branch-slug>/            # Non-GitHub context
      ...
```

**Naming Scheme**:
- **Single PR**: `PR-<number>/` (e.g., `PR-123/`)
- **Multi-repo PRs**: `PR-<number>-<repo-slug>/` per repository (e.g., `PR-123-my-api/`, `PR-456-my-frontend/`)
- **Non-GitHub**: `<branch-slug>/` (slugified branch name)

**Multi-repo detection** triggers naming when:
- Multiple workspace folders open in VS Code (detected via multiple `.git` directories)
- Multiple PR URLs/numbers provided to review command

---

## Workflow Stages

### Stage R1 — Understanding

**Goal:** Comprehensively understand what changed and why

**Skills:** `paw-review-understanding`, `paw-review-baseline`

**Inputs:**
* PR URL or number (GitHub context)
* Base branch name (non-GitHub context, with current branch as head)
* Repository context

**Outputs:**
* `.paw/reviews/<identifier>/ReviewContext.md` – PR metadata, changed files, flags (authoritative parameter source)
* `.paw/reviews/<identifier>/CodeResearch.md` – Pre-change baseline understanding
* `.paw/reviews/<identifier>/DerivedSpec.md` – Reverse-engineered intent and acceptance criteria

**Process:**

1. **Fetch PR metadata and create ReviewContext.md**
   - **GitHub**: Use GitHub MCP tools for PR metadata, files, status
   - **Non-GitHub**: Use git diff for changes, derive from commits
   - Document all changed files with additions/deletions
   - Set flags: CI failures, breaking changes suspected
   - **ReviewContext.md becomes authoritative parameter source** for all downstream stages

2. **Research pre-change baseline**
   - Analyze codebase at base commit (pre-change state)
   - Document how system worked before changes
   - Record patterns, conventions, and integration points
   - Create `CodeResearch.md` with file:line references

3. **Derive specification**
   - Use CodeResearch.md to understand how system worked before changes
   - Reverse-engineer author intent from code analysis and PR description
   - Extract acceptance criteria from implementation
   - Document observable before/after behavior
   - Distinguish stated goals (PR description) vs inferred goals (code analysis)
   - **Block if open questions remain** - no placeholders, no "TBD"

**Human Workflow:**

* Invoke `/paw-review <PR-number-or-URL>` or run PAW Review agent
* Agent orchestrates all R1 activities automatically
* Review artifacts to ensure understanding is accurate
* Correct any misinterpretations in `DerivedSpec.md`
* Proceed to Stage R2 once understanding complete and zero open questions

---

### Stage R2 — Evaluation

**Goal:** Assess impact and identify what might be missing or concerning

**Review Modes:**

* **Single-model** (default): Sequential impact analysis and gap identification via `paw-review-impact` and `paw-review-gap`
* **Society-of-thought**: Multi-perspective specialist review via `paw-sot` engine, replacing both impact analysis and gap identification with unified specialist evaluation

**Inputs:**
* All Stage R1 artifacts (ReviewContext.md, CodeResearch.md, DerivedSpec.md)
* Repository codebase at base and head commits
* Review Mode and SoT configuration from ReviewContext.md

**Outputs (single-model):**
* `.paw/reviews/<identifier>/ImpactAnalysis.md` – System-wide effects, integration points, breaking changes, design/architecture assessment
* `.paw/reviews/<identifier>/GapAnalysis.md` – Findings organized by Must/Should/Could with evidence, including positive observations

**Outputs (society-of-thought):**
* `.paw/reviews/<identifier>/REVIEW-{SPECIALIST}.md` – Per-specialist findings with cognitive strategy and evidence
* `.paw/reviews/<identifier>/REVIEW-SYNTHESIS.md` – Confidence-weighted synthesis with specialist attribution and conflict resolution

**Process (single-model):**

1. **Analyze impact**
   - Build integration graph: parse imports/exports, identify public API surfaces, map downstream consumers
   - Detect breaking changes: function signature diffs, config schema changes, data model modifications
   - Assess performance: new loops/recursion, database queries, algorithmic complexity
   - Review security: auth middleware changes, permission checks, input validation
   - **Assess design & architecture**: Does this belong in codebase vs library? Integrates well with system? Timing appropriate?
   - **Evaluate user impact**: End-users (UX, performance) and developer-users (API clarity, ease of use)
   - **Code health trend**: Improving or degrading system health? Technical debt impact?
   - Document deployment considerations and risk assessment

2. **Identify gaps**
   - **Correctness:** Logic errors, edge cases, error handling, invariants
   - **Safety & Security:** Input validation, authorization checks, concurrency, data integrity
   - **Testing:** Coverage quantitative (if available) and qualitative (depth/breadth), test effectiveness (will fail when broken)
   - **Maintainability:** Code clarity, documentation completeness (user-facing), orphaned docs, **comment quality** (WHY vs WHAT)
   - **Performance:** N+1 queries, unbounded operations, resource usage
   - **Complexity:** **Over-engineering** (solving future vs current problems, unnecessary abstractions)
   - **Style & Conventions:** Style guide adherence with "Nit:" labeling for preferences
   - **Positive Observations:** Identify and commend good practices for mentoring value

3. **Categorize findings**
   - **Must** – Correctness, safety, security, data integrity issues with concrete impact evidence
   - **Should** – Quality, completeness, testing gaps that increase robustness
   - **Could** – Optional enhancements with clear benefit
   - **Evidence required**: All findings have file:line references
   - **Not inflated**: Style preferences not elevated to Must without clear impact

**Process (society-of-thought):**

1. **Construct review context** from ReviewContext.md configuration fields and pass PR diff + understanding artifacts to `paw-sot`
2. **Specialist execution** — Specialists review independently (parallel) or engage in structured debate, each applying their cognitive strategy
3. **Synthesis** — Confidence-weighted merge of specialist findings with conflict resolution and specialist attribution

**Human Workflow:**

* Agent orchestrates R2 activities automatically after R1 completion
* **Single-model**: Review `ImpactAnalysis.md` and `GapAnalysis.md` findings; validate categorization
* **Society-of-thought**: Review `REVIEW-SYNTHESIS.md` for prioritized findings with specialist attribution and confidence levels; review individual `REVIEW-{SPECIALIST}.md` for detailed perspectives
* Add domain-specific concerns the agent might have missed
* Proceed to Stage R3 to generate feedback

---

### Stage R3 — Output

**Goal:** Generate comprehensive review comments, critically assess them, and create GitHub pending review

**Skills:** `paw-review-feedback`, `paw-review-critic`, `paw-review-github`

**Inputs:**
* All prior artifacts (ReviewContext.md, CodeResearch.md, DerivedSpec.md, ImpactAnalysis.md, GapAnalysis.md)
* CrossRepoAnalysis.md (multi-repo reviews only)

**Outputs:**
* `.paw/reviews/<identifier>/ReviewComments.md` – Complete feedback with full comment history (original → assessment → updated → posted status)
* **GitHub pending review** (GitHub context only) – Draft review with filtered comments (only those marked ready after critique)

**Process:**

The Output stage uses an **iterative feedback-critique pattern** to refine comments before posting:

1. **Initial Feedback Pass** (`paw-review-feedback`)
   - Batch related findings (One Issue, One Comment policy)
   - Transform all findings from GapAnalysis.md into review comments
   - Include Must, Should, and Could items; incorporate CrossRepoAnalysis.md gaps for multi-repo
   - Provide specific, actionable suggestions with code examples
   - Add **Rationale sections** to each comment:
     - Evidence: file:line references
     - Baseline Pattern: from CodeResearch.md
     - Impact: what could go wrong
     - Best Practice: citation from established guidelines
   - Create `ReviewComments.md` with status: `draft`
   - **Does NOT post to GitHub** in this pass

2. **Critical Assessment** (`paw-review-critic`)
   - Read and evaluate each comment
   - Add **Assessment sections** (local only, never posted):
     - Usefulness: Does this truly improve code quality?
     - Accuracy: Are evidence references correct?
     - Alternative Perspectives: What might the reviewer have missed?
     - Trade-offs: Valid reasons for current approach?
     - Recommendation: Include/Modify/Skip
   - Generate Iteration Summary with skip and modify recommendations

3. **Critique Response Pass** (`paw-review-feedback`)
   - Detect Assessment sections → enter Critique Response Mode
   - For comments marked "Modify": Add `**Updated Comment:**` with improvements
   - For comments marked "Skip": Note `**Final**: Skipped per critique`
   - For comments marked "Include": Note `**Final**: ✓ Ready for GitHub posting`
   - Update ReviewComments.md status to: `finalized`

4. **GitHub Posting** (`paw-review-github`, GitHub PRs only)
   - Filter to only comments marked "Ready for GitHub posting"
   - Create pending review with filtered comments
   - Update ReviewComments.md with posted status and review IDs
   - Skipped comments remain in artifact for reference but are NOT posted
   - **Non-GitHub context**: Provides manual posting instructions instead

**Human Workflow:**

* Agent orchestrates all R3 activities automatically after R2 completion
* **GitHub context**: 
  - Open PR in GitHub Files Changed tab
  - View pending review comments (only those that passed critique)
  - Edit comment text to adjust tone/wording
  - Delete unwanted comments; manually add skipped comments if you disagree with critique
  - Consult ReviewComments.md for full comment history (original → assessment → updated)
  - Submit review when satisfied (Approve/Comment/Request Changes)
* **Non-GitHub context**:
  - Use ReviewComments.md to manually post to review platform
  - Post only comment text and suggestions (keep rationale/assessment for reference)
* **Optional**: Ask agent to adjust tone – regenerates comments with new tone
* **Optional**: Ask agent questions about findings – answers based on artifacts

---

## Artifacts

### ReviewContext.md

**Authoritative parameter source** for the review workflow, analogous to WorkflowContext.md in PAW's implementation workflow.

**Contents:**
- **PR Number** (GitHub) OR **Branch** (non-GitHub)
- Base Branch, Head Branch
- Base Commit SHA, Head Commit SHA
- Repository (owner/repo or local)
- Author (username or git author)
- Title (PR title or derived from commits)
- State (open/closed/draft for GitHub, active for non-GitHub)
- Created date (GitHub only)
- CI Status (passing/failing/pending for GitHub, "Not available" for non-GitHub)
- Labels (GitHub only)
- Reviewers (GitHub only)
- Linked Issues (GitHub URLs or "Inferred from commits" for non-GitHub)
- Changed Files summary (count, additions, deletions)
- **Artifact Paths**: auto-derived
- Description (PR description or "Derived from commit messages")
- Flags (CI failures present, breaking changes suspected)
- Metadata (created timestamp, git commit SHA, reviewer)

**Purpose:** Single source of truth for all review parameters; read first by all downstream stages; updated when new information discovered.

---

### CodeResearch.md

**Contents:**
- How system worked before changes (behavioral view)
- Existing patterns and conventions
- Integration points and dependencies
- Test coverage baseline
- Relevant documentation context
- File:line references for all observations

**Purpose:** Informs DerivedSpec.md with accurate before/after behavior; guides Gap Analysis recommendations to align with established patterns.

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

**Purpose:** Creates a testable specification even when the author didn't provide one; informed by baseline understanding from CodeResearch.md; serves as input for gap analysis.

---

### ImpactAnalysis.md

System-wide effects, integration analysis, and design assessment.

**Contents:**
- **Baseline State** – How the system worked before changes (from CodeResearch.md)
- **Integration Points** – Component dependencies and downstream consumers
- **Breaking Changes** – Public API changes, removed features, incompatibilities
- **Performance Implications** – Hot paths, algorithmic changes, resource usage
- **Security & Authorization Changes** – Auth modifications, validation changes
- **Design & Architecture Assessment** – Does this belong in codebase vs library? Integrates well? Timing appropriate?
- **User Impact Evaluation** – End-user impact (UX, performance) and developer-user impact (API clarity, ease of use)
- **Deployment Considerations** – Migration steps, feature flags, rollout strategy
- **Dependencies & Versioning** – New libraries, version changes, external services
- **Risk Assessment** – Overall risk level with rationale, including code health trend

**Purpose:** Ensures reviewer understands ripple effects and system-wide context; evaluates design fit and user impact.

---

### GapAnalysis.md

Findings organized by severity and category, with positive observations.

**Structure:**

```markdown
## Positive Observations (Mentoring Value)

### [Good Practice Title]
**File:** `path/to/file.ts:123`
**Observation:** [What was done well]
**Impact:** [Why this is valuable]

## Must Address (Correctness/Safety/Security)

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
- **Safety & Security:** Input validation, authorization, concurrency, data integrity
- **Testing:** Coverage gaps, test quality, test effectiveness
- **Maintainability:** Code clarity, documentation, comment quality (WHY vs WHAT), naming
- **Performance:** N+1 patterns, unbounded operations, resource efficiency
- **Complexity:** Over-engineering, unnecessary abstractions
- **Style & Conventions:** Style guide adherence (with "Nit:" labeling for preferences)

**Purpose:** Provides structured, evidence-based findings with positive observations; human reviewer selects which to include in final comments.

---

### ReviewComments.md

Complete review feedback with full comment history showing the evolution from original to posted.

**Status Field:**
- `draft` — Initial feedback pass complete, awaiting critique
- `finalized` — Critique response complete, ready for GitHub posting

**Structure:**

```markdown
# Review Comments for <PR Number or Branch Slug>

**Context**: GitHub PR #X OR Non-GitHub branch `feature/...`
**Base Branch**: <base>
**Head Branch**: <head>
**Review Date**: <date>
**Reviewer**: <name>
**Status**: draft | finalized
**Pending Review ID**: <id> (GitHub, after posting) OR "Manual posting required" (non-GitHub)

## Summary

**Total Findings**: X Must-address, Y Should-address, Z optional suggestions
**Posted**: N comments | **Skipped**: M comments (per critique)

Full review artifacts: `.paw/reviews/<identifier>/`

---

## Inline Comments

### File: `path/to/file.ts` | Lines: 45-50

**Type:** Must
**Category:** Safety

<Original comment text explaining the issue>

**Suggestion:**
```typescript
// Original proposed fix
```

**Rationale:**
- **Evidence**: `file.ts:45` shows unchecked null access
- **Baseline Pattern**: CodeResearch.md (`file.ts:100`) shows standard null checks
- **Impact**: Potential null pointer exception in production
- **Best Practice**: "Always validate inputs before use"

**Assessment:** (added by critic)
- **Usefulness**: High - Prevents crash
- **Accuracy**: Evidence references confirmed
- **Alternative Perspective**: None identified
- **Trade-offs**: No valid reason to skip null check
- **Recommendation**: Include as-is

**Updated Comment:** (added if critic recommended modification)
<Refined comment text addressing critique feedback>

**Updated Suggestion:** (if suggestion was modified)
```typescript
// Improved proposed fix
```

**Final**: ✓ Ready for GitHub posting
**Posted**: ✓ Pending review comment ID: <id>

---

### File: `path/to/another.ts` | Lines: 78-82

**Type:** Could
**Category:** Style

<Original suggestion about naming convention>

**Rationale:**
...

**Assessment:**
- **Usefulness**: Low - Stylistic preference
- **Accuracy**: Valid but minor
- **Trade-offs**: Current naming follows existing pattern
- **Recommendation**: Skip

**Final**: Skipped per critique
**Posted**: — (not posted)

---

## Thread Comments
...

## Questions for Author
...
```

**Comment Evolution:**

Each comment shows its complete history:
1. **Original** — Initial feedback from first pass
2. **Assessment** — Critic evaluation (Include/Modify/Skip recommendation)
3. **Updated** — Refined version if modification was recommended
4. **Final** — Ready for posting or skipped per critique
5. **Posted** — GitHub pending review ID (after GitHub posting)

**Key Sections:**
- **Rationale** (local only, not posted): Evidence, Baseline Pattern, Impact, Best Practice
- **Assessment** (local only, not posted): Usefulness, Accuracy, Trade-offs, Recommendation
- **Updated** (if modified): Refined comment/suggestion addressing critique
- **Final**: Posting status (`✓ Ready for GitHub posting` or `Skipped per critique`)
- **Posted**: Tracks what's in pending review vs skipped

**Purpose:** 
- Complete reference with full comment history for decision-making
- Shows evolution: original → assessment → updated → posted
- Human can manually add skipped comments if they disagree with critique
- For non-GitHub: source for manual posting with instructions

---

## Guardrails

### Understanding Stage

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

### Evaluation Stage

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

### Feedback Stage

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
1. Invoke `/paw-review <PR-number>` in Copilot Chat
2. Agent runs Understanding and Baseline stages automatically
3. Read generated `ReviewContext.md` and `DerivedSpec.md`
4. Verify understanding matches your reading of the PR
5. Note any open questions in `DerivedSpec.md`

**Stage R2 (15-25 minutes):**
1. Agent continues to Evaluation stage automatically
2. Read `ImpactAnalysis.md` to understand system effects
3. Review findings in `GapAnalysis.md`
4. Validate categorization feels appropriate
5. Add any domain-specific concerns

**Stage R3 (10-20 minutes):**
1. Agent continues to Feedback stage automatically
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
1. Invoke `/paw-review <PR-number>`
2. Agent runs all R1 stages automatically
3. Review change categorization
4. If mechanical changes dominate, note for quick acknowledgment
5. Focus on semantic changes for deep review
6. Consider suggesting PR split if too complex

**Stage R2 (30-45 minutes):**
1. Agent continues to Evaluation automatically
2. Focus on high-risk areas (auth, data, public APIs)
3. Check for missing tests on complex logic
4. Review integration points carefully
5. Note if "too large to review thoroughly"

**Stage R3 (15-25 minutes):**
1. Agent generates comprehensive feedback automatically
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

