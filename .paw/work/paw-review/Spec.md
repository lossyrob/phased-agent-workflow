# Feature Specification: PAW Review Workflow

**Branch**: feature/paw-review  |  **Created**: 2025-10-22  |  **Status**: Draft
**Input Brief**: Create a structured code review workflow that helps reviewers understand, evaluate, and provide thoughtful feedback on pull requests—especially large or poorly-documented PRs.

## User Scenarios & Testing

### User Story P1 – Understand PR Changes Before Critiquing

Narrative: As a reviewer examining a PR, I need to comprehensively understand what changed and why before I can provide meaningful feedback. The system should help me reverse-engineer the author's intent, categorize changes, and identify the scope of modifications without making assumptions or jumping to critique. This understanding must be informed by research into how the system worked before the changes.

Independent Test: Given a PR URL, when I invoke the Understanding stage and complete the code research process, then I receive structured artifacts documenting PR metadata, pre-change system behavior, and derived specification that I can verify match my own reading of the PR.

Acceptance Scenarios:
1. Given a GitHub PR URL, When I start the review workflow, Then ReviewContext.md captures PR metadata (number, title, author, description, labels, base/head commits) and serves as the authoritative parameter source for downstream review stages
2. Given PR metadata analyzed, When the system identifies areas needing baseline research, Then code-research.prompt.md is generated with questions about pre-change system behavior, patterns, and integration points
3. Given code-research.prompt.md created, When I run the PAW-R1B Baseline Researcher Agent, Then CodeResearch.md documents how the system worked before the changes at a behavioral level by analyzing the codebase at base commit
4. Given CodeResearch.md available, When deriving intent, Then DerivedSpec.md uses baseline understanding to reverse-engineer specification with observable before/after behavior
5. Given a PR with stated goals in the description, When deriving intent, Then DerivedSpec.md distinguishes between explicit goals (from PR description/issues) and inferred goals (from code analysis) and flags any ambiguities as open questions
6. Given a PR without clear documentation, When I review the derived spec, Then I can validate whether the reverse-engineered intent accurately represents what the code does
7. Given understanding artifacts, When I identify misinterpretations, Then I can correct them in the artifacts before proceeding to evaluation

### User Story P1 – Systematically Identify Gaps and Issues

Narrative: As a reviewer analyzing a PR, I need to systematically evaluate the changes for correctness, safety, completeness, and quality. The system should help me identify what might be missing or concerning through structured impact analysis and gap identification, leveraging the pre-change codebase understanding established in the Understanding stage.

Independent Test: Given Understanding stage artifacts (including CodeResearch.md) and the codebase at both base and head commits, when I invoke the Evaluation stage, then I receive categorized findings (Must/Should/Could) with specific evidence and an impact analysis showing system-wide effects.

Acceptance Scenarios:
1. Given changes affecting integration points, When impact analysis runs, Then ImpactAnalysis.md identifies all downstream effects, breaking changes, and deployment considerations
2. Given new code paths introduced, When gap analysis executes, Then findings include missing test coverage with specific file:line references
3. Given potential correctness issues, When gaps are categorized, Then Must-address items have clear evidence of correctness/safety/security impact
4. Given style preferences vs actual defects, When categorizing findings, Then style issues are not inflated to Must category unless they significantly impact readability or maintainability
5. Given changes with test coverage, When gap analysis reviews tests, Then test coverage assessment includes both quantitative metrics (if available) and qualitative analysis of depth and breadth
6. Given a large PR, When evaluation completes, Then scope assessment flags if the PR is too large to review effectively and suggests splitting approach
7. Given CodeResearch.md from Understanding stage, When gap analysis evaluates changes, Then recommendations are informed by documented pre-change patterns and conventions

### User Story P1 – Generate Comprehensive Filterable Feedback

Narrative: As a reviewer ready to provide feedback, I need the system to generate comprehensive review comments that I can filter and adjust based on my relationship with the author and project context. Nothing should be posted automatically—I maintain full control over what feedback is shared and how it's worded.

Independent Test: Given Evaluation stage artifacts with categorized findings, when I invoke the Feedback Generation stage, then the system creates a markdown document (and a pending GitHub review if applicable) with all findings as structured comments that I can edit, delete, or approve before submission.

Acceptance Scenarios:
1. Given Must/Should/Could findings from gap analysis, When feedback generation runs, Then all findings are transformed into review comments with specific file:line references and actionable suggestions in the review comments document.
2. Given line-specific issues, When creating comments, Then inline comments are posted to the GitHub pending review if applicable. In non-GitHub contexts, inline comments will need to be manually posted from the review comments document.
3. Given broader architectural concerns, When generating feedback, Then thread-level comments are documented in ReviewComments.md for manual addition
4. Given related issues appearing in multiple locations, When batching feedback (One Issue, One Comment policy), Then either one comment mentions all locations or references are made between comments to avoid scatter.
5. Given pending review created on GitHub, When I open the PR, Then I can edit comment text, delete unwanted comments, or add new comments before submitting the review
6. Given feedback requiring tone adjustment, When I request changes, Then the agent can regenerate comments with adjusted tone (or I can edit directly in GitHub UI)
7. Given non-trivial suggestions, When comments are generated, Then code examples are provided to illustrate the recommended approach
8. Given all feedback prepared, When I'm satisfied with comments, Then I manually submit the review (Approve/Comment/Request Changes)—nothing posts automatically
9. Given a non-GitHub PR context with current branch checked out, When I provide the base branch name and invoke feedback generation, Then ReviewComments.md includes manual posting instructions with file paths and line numbers for each comment

### User Story P2 – Understand Pre-Change Codebase State

Narrative: As a reviewer evaluating changes, I need to understand how the code worked before the PR changes to properly assess whether modifications are improvements, breaking changes, or regressions. The system should analyze the codebase at the base commit to document existing patterns and behavior before I derive the specification or evaluate impacts.

Independent Test: Given a PR with changes to existing code, when code research executes at the base commit during the Understanding stage, then CodeResearch.md documents the pre-change system behavior, patterns, and integration points that inform both the derived specification and later gap analysis.

Acceptance Scenarios:
1. Given a PR modifying existing modules, When initial PR analysis identifies affected areas, Then code-research.prompt.md includes questions about how those modules worked before the changes
2. Given code-research.prompt.md created, When PAW-R1B Baseline Researcher Agent runs, Then it checks out the base commit (before PR changes) to analyze the original codebase state
3. Given pre-change analysis complete, When CodeResearch.md is generated, Then it documents existing patterns, conventions, and how the system worked before modifications
4. Given CodeResearch.md available in Understanding stage, When DerivedSpec.md is created, Then the derived specification uses baseline understanding to accurately characterize before/after behavior
5. Given documented baseline state from R1, When gap analysis in R2 evaluates changes, Then recommendations are informed by established codebase patterns and don't conflict with existing conventions without strong rationale
6. Given questions about pre-change behavior during review, When I need clarification, Then CodeResearch.md provides context to answer questions about the original implementation

### User Story P2 – Analyze Test Coverage Comprehensively

Narrative: As a reviewer concerned about quality, I need detailed analysis of test coverage for the changes—both quantitative metrics when available and qualitative assessment of whether the tests adequately cover edge cases, error paths, and integration points.

Independent Test: Given a PR with code changes and tests, when gap analysis executes, then GapAnalysis.md includes a dedicated test coverage section with quantitative metrics (if available) and qualitative depth/breadth analysis.

Acceptance Scenarios:
1. Given a PR with new code paths, When gap analysis reviews tests, Then a dedicated test coverage section reports quantitative coverage metrics if available (e.g., line/branch coverage percentages)
2. Given test coverage data, When qualitative analysis runs, Then findings assess whether coverage has appropriate depth (edge cases, error paths) and breadth (integration points, user scenarios)
3. Given missing test coverage for new code, When gap analysis categorizes findings, Then specific gaps are identified with file:line references and categorized appropriately (Must for critical paths, Should for standard paths)
4. Given existing tests modified, When gap analysis evaluates test quality, Then assessment considers whether tests truly verify the intended behavior vs passing trivially
5. Given coverage analysis complete, When human reviewer examines findings, Then they have sufficient context to judge if coverage balances depth and breadth according to project standards

### User Story P2 – Receive Rationale for Recommendations

Narrative: As a reviewer examining generated feedback, I need to understand why each recommendation is being made so I can make informed decisions about whether to include, modify, or reject suggestions. Each recommendation should cite relevant best practices and provide clear reasoning.

Independent Test: Given review comments generated from gap analysis, when I examine ReviewComments.md, then every recommendation includes a Rationale section explaining why the suggestion matters and citing applicable best practices.

Acceptance Scenarios:
1. Given a recommendation to add error handling, When I read the comment, Then the Rationale section explains the specific risk and cites relevant safety best practices
2. Given a suggestion informed by research notes, When I examine the rationale, Then it references the applicable best practice from review-research-notes.md (e.g., mentorship opportunities, systematic checklists)
3. Given a Must-address finding, When I review the rationale, Then it clearly articulates the correctness/safety/security impact with evidence
4. Given a Could-consider suggestion, When I examine the rationale, Then it explains the potential benefit without overstating importance
5. Given rationale sections present, When I decide whether to include a comment, Then I can make an informed choice based on the reasoning provided

### User Story P3 – Ask Questions and Get Informed Answers

Narrative: As a reviewer with questions about the code changes or pre-change behavior, I want to interact with the Feedback Generation agent to get answers informed by the comprehensive codebase understanding developed during earlier stages.

Independent Test: Given ReviewComments.md and all supporting artifacts, when I ask the Feedback Generation agent a question about the changes, then I receive an answer based on the documented understanding of both pre-change and post-change codebase state.

Acceptance Scenarios:
1. Given a question about why certain code works a particular way, When I ask the agent, Then the answer draws from CodeResearch.md understanding of pre-change patterns
2. Given a question about the author's intent, When I ask the agent, Then the answer references DerivedSpec.md and PR context
3. Given a question about potential impacts, When I ask the agent, Then the answer cites ImpactAnalysis.md findings
4. Given follow-up clarifications needed, When I continue the conversation, Then the agent maintains context across the dialogue
5. Given answers provided, When I need to verify claims, Then specific file:line references are included for validation

### User Story P3 – Critical Assessment of Generated Comments

Narrative: As a reviewer wanting high-quality feedback, I need a critical second look at generated review comments to identify potential inaccuracies, missing logic, or low-value suggestions before I finalize what to post. This assessment helps me make better decisions about which comments to include.

Independent Test: Given initial review comments generated, when the Feedback Critic evaluates them, then each comment receives an assessment section analyzing usefulness, accuracy, and potential alternative perspectives.

Acceptance Scenarios:
1. Given generated review comments, When Feedback Critic runs, Then each comment in ReviewComments.md gets an Assessment section added below it
2. Given a comment recommendation, When assessment analyzes it, Then the assessment considers accuracy, usefulness, and alternative viewpoints the initial reviewer might have missed
3. Given an assessment identifying potential issues, When I review comments, Then I have additional context to decide whether to include, modify, or skip the comment
4. Given GitHub context, When assessments are added, Then they remain in the local ReviewComments.md file only and do not appear in the pending GitHub review
5. Given assessment sections present, When I ask the agent for modifications, Then the agent can revise comments based on assessment insights

### Edge Cases

- **PR with CI failures**: When CI checks are failing, then ReviewContext.md captures this status and Evaluation stage notes redundancy risk—avoid commenting on issues already caught by CI
- **Non-GitHub PR context**: When reviewing a PR in Azure DevOps, GitLab, Bitbucket, or locally, then reviewer checks out the head branch, provides base branch name at invocation, system uses git diff for change analysis, artifacts are stored in `.paw/reviews/<branch-slug>/` where branch-slug is derived from normalized head branch name, and all review comments are saved to ReviewComments.md with manual posting instructions instead of creating a pending review
- **No PR description or documentation**: When a PR lacks description or linked issues, then DerivedSpec.md relies entirely on inferred goals from code analysis and flags high uncertainty as open questions
- **Author is a novice contributor**: When PR metadata or code patterns suggest inexperience, then mentorship opportunities can be noted in feedback generation (optional, not automatically posted) citing research notes on reviews as mentorship
- **Conflicting information**: When PR description contradicts actual code changes, then DerivedSpec.md raises this discrepancy as a clarification block requiring human resolution
- **Missing test coverage with project-specific exemptions**: When certain code types have project-standard exemptions from test requirements, then gap analysis notes the gap but categorizes appropriately based on project context (requires human knowledge)
- **Pending review gets deleted**: When a human accidentally deletes the GitHub pending review, then ReviewComments.md serves as reference to regenerate comments
- **Multi-file architectural issue**: When a concern spans multiple files, then a single thread comment in ReviewComments.md captures the issue comprehensively rather than scattering inline comments
- **Local branch behind upstream**: When base branch exists locally but is behind upstream (e.g., local `main` 50 commits behind `origin/main`), Understanding Agent prefers remote reference (`origin/main`) to ensure baseline analysis uses latest upstream state. Baseline Researcher fetches remote before checkout. If remote unavailable (offline), warns user and uses local state.

## Platform-Specific Workflows

### GitHub PR Context

**Invocation:**
- Reviewer provides GitHub PR URL (e.g., `https://github.com/owner/repo/pull/123`) or PR number if repository context is known
- System uses GitHub MCP server tools to fetch all PR metadata and context

**PR Identification:**
- PR identified by number from URL or explicit parameter
- Artifacts stored in `.paw/reviews/PR-<number>/` (e.g., `.paw/reviews/PR-123/`)

**ReviewContext.md Content:**
- **PR Metadata**: Number, title, author, state (open/closed/draft)
- **Description**: Full PR description text from GitHub
- **Branches**: Base branch name (e.g., `main`) and head branch name (e.g., `feature/new-auth`)
- **Commits**: Base commit SHA and head commit SHA
- **Repository**: Owner and repository name
- **Labels**: All GitHub labels applied to the PR
- **Reviewers**: Requested reviewers and their status
- **CI Status**: Status of GitHub Actions, checks, and other CI integrations with pass/fail results
- **Linked Issues**: Issues referenced in PR description or linked via GitHub UI
- **Comments**: Count of existing review comments and discussions
- **Changed Files**: File paths with additions/deletions statistics from GitHub API
- **Artifact Paths**: Auto-derived paths to all review artifacts (`.paw/reviews/PR-<number>/`)

This serves as the authoritative parameter source for all review stages, similar to WorkflowContext.md in the PAW development workflow.

**Feedback Posting:**
- System creates `ReviewComments.md` containing ALL review feedback with complete rationale sections and critical assessments for each comment
- System creates GitHub pending review using github MCP tools
- Inline comments posted to pending review using github MCP tools
- **Pending review comments contain ONLY**: comment text and code suggestions (no rationale or assessment sections)
- **ReviewComments.md contains**: comment text, code suggestions, rationale sections, and critical assessment sections
- Pending review visible in GitHub UI under "Files Changed" tab but not visible to PR author until submitted
- Human reviewer edits/deletes comments directly in GitHub's pending review interface
- Human manually submits review (Approve/Comment/Request Changes button in GitHub UI)
- ReviewComments.md serves as reference for understanding reasoning behind each pending review comment

**Tone Adjustment:**
- If reviewer requests tone changes, agent deletes existing pending review and recreates with adjusted comments
- Alternative: Reviewer edits individual comments directly in GitHub UI
- ReviewComments.md updated to reflect tone changes

### Non-GitHub PR Context (Azure DevOps, Local Branches, etc.)

**Invocation:**
- Reviewer checks out the PR/feature branch locally
- Reviewer provides base branch name (e.g., `--base-branch main` or prompted interactively)
- Current checked-out branch treated as the PR/head branch

**PR Identification:**
- PR identified by head branch name (current branch)
- Branch slug derived from head branch name by normalizing: lowercase, replace `/` and special chars with `-`, remove invalid chars
- Artifacts stored in `.paw/reviews/<branch-slug>/` (e.g., `.paw/reviews/feature-new-auth/` for branch `feature/new-auth`)

**ReviewContext.md Content:**
- **Branch Information**: Base branch name, head branch name, current commit SHAs
- **Author**: Derived from git commit author of recent commits on the branch
- **Commit Messages**: Recent commit messages from the branch (used to infer intent)
- **Changed Files**: From `git diff <base-branch>...<head-branch> --stat` and `--numstat`
- **CI Status**: Noted as "Not available (non-GitHub context)" unless reviewer manually provides information
- **Description**: Marked as "Not available - inferred from commits" unless reviewer manually provides PR description text
- **Labels/Reviewers**: Noted as "Not applicable (non-GitHub context)"
- **Artifact Paths**: Auto-derived paths to all review artifacts (`.paw/reviews/<branch-slug>/`)

This serves as the authoritative parameter source for all review stages, similar to WorkflowContext.md in the PAW development workflow.

**Feedback Posting:**
- System creates `ReviewComments.md` containing ALL review feedback with complete rationale sections and critical assessments for each comment
- `ReviewComments.md` structured with file:line references for each inline comment
- No automatic posting to any platform—all feedback remains in ReviewComments.md
- Reviewer manually copies comment text and suggestions (excluding rationale/assessment) to their review platform (Azure DevOps, GitLab, Bitbucket, etc.)
- For inline comments, file path and line numbers provided to facilitate manual posting
- Thread comments documented with clear scope indicators for manual addition as PR-level comments
- Rationale and assessment sections remain in ReviewComments.md for reviewer's reference (not posted to external platform)

**Example ReviewComments.md Structure for Non-GitHub:**
```markdown
# Review Comments for Branch: feature/new-auth

**Base Branch**: main
**Head Branch**: feature/new-auth
**Context**: Non-GitHub PR review

## Summary Comment (Post manually to PR)

[Review summary text...]

---

## Inline Comments (Post manually to specific file locations)

### File: `src/auth/validator.ts` | Lines: 45-50

**Type**: Must  
**Category**: Safety

[Comment text...]

**Suggestion:**
```typescript
// Code example...
```

**Rationale:** [Why this matters, citing best practices from review-research-notes.md...]

**Assessment:** [Critical evaluation of this comment's usefulness, accuracy, alternative perspectives to consider...]

**Manual Posting Instructions:** In your PR review platform, add this comment to file `src/auth/validator.ts` at lines 45-50. Post only the comment text and suggestion—keep rationale and assessment for your reference.

---

[Additional comments...]
```

**Note:** The example above shows the complete structure. For GitHub PRs, the same ReviewComments.md format is used, but the pending review posted to GitHub contains only comment text and suggestions (no rationale or assessment sections).

**Workflow Differences:**
- No pending review creation—all feedback remains in local markdown file
- Reviewer responsible for transferring comments to their platform
- Artifact structure identical except for path naming convention
- All analysis and gap identification functions identically to GitHub context

## Workflow Stages and Agent Structure

The PAW Review workflow is organized into three logical stages, each producing multiple artifacts. The specification defines stages as units of work from the human reviewer's perspective, but allows implementation flexibility in how agents are structured.

### Stage Organization

**Stage R1 — Understanding** produces:
- `ReviewContext.md` - PR metadata, branch information, changed files, and artifact paths (authoritative parameter source)
- `prompts/code-research.prompt.md` - Generated research prompt for baseline codebase analysis
- `CodeResearch.md` - Pre-change codebase understanding (created after research)
- `DerivedSpec.md` - Reverse-engineered specification

**Stage R2 — Evaluation** produces:
- `ImpactAnalysis.md` - System-wide effects and integration points
- `GapAnalysis.md` - Categorized findings (Must/Should/Could)

**Stage R3 — Feedback Generation** produces:
- `ReviewComments.md` - Complete review feedback with rationale and assessments

### Agent Implementation Options

Implementation may use either approach or a hybrid:

**Option A: One Agent Per Stage**
- PAW-R1A Understanding Agent produces ReviewContext, code-research prompt; pauses for baseline research
- PAW-R1B Baseline Researcher Agent analyzes pre-change codebase at base commit, produces CodeResearch.md
- PAW-R1A Understanding Agent resumes to produce DerivedSpec after research
- Evaluation Agent produces all R2 artifacts (ImpactAnalysis, GapAnalysis)
- Feedback Agent produces ReviewComments.md
- Feedback Critic adds assessments to ReviewComments.md

**Option B: Specialized Agents Per Artifact**
- Stage R1: PAW-R1A Understanding Agent → Code Research Prompt Generator → PAW-R1B Baseline Researcher Agent → Derived Spec Agent
- Stage R2: Impact Analysis Agent → Gap Analysis Agent
- Stage R3: Feedback Generation Agent → Feedback Critic

**Human Interaction Model:**
Regardless of agent structure, human reviewers invoke stages as logical units:
- "Run Understanding stage" → receives all R1 artifacts
- "Run Evaluation stage" → receives all R2 artifacts  
- "Run Feedback Generation stage" → receives R3 artifact

Artifacts are always produced in the defined order within each stage to maintain dependencies (e.g., CodeResearch.md must exist before DerivedSpec.md, GapAnalysis.md depends on ImpactAnalysis.md).

### Stage R1 Research Flow

The Understanding stage follows a research-driven workflow similar to the Spec Research flow in the implementation PAW:

1. **Initial Understanding**: Analyze PR metadata and changes to identify areas requiring baseline codebase research
2. **Generate Research Prompt**: Create `prompts/code-research.prompt.md` with questions about pre-change system behavior, patterns, and integration points
3. **Pause for Research**: Human reviewer runs PAW-R1B Baseline Researcher Agent (or separate research process) to answer questions by analyzing codebase at base commit
4. **Complete Understanding**: With CodeResearch.md available, complete DerivedSpec.md with informed understanding of baseline state

This ensures the derived specification is informed by actual pre-change system behavior rather than speculation.

## Requirements

### Functional Requirements

- FR-001: System shall extract PR metadata including number, title, author, description, and labels (Stories: P1-Understand)
- FR-002: System shall reverse-engineer author intent from code analysis and produce a derived specification with observable before/after behavior (Stories: P1-Understand)
- FR-003: System shall distinguish between explicitly stated goals (from PR description/issues) and inferred goals (from code analysis) in derived specification (Stories: P1-Understand)
- FR-004: System shall flag ambiguities and uncertainties as open questions without fabricating assumptions about unstated intent (Stories: P1-Understand)
- FR-005: System shall allow human reviewer to correct misinterpretations in understanding artifacts before proceeding to evaluation (Stories: P1-Understand)
- FR-006: System shall generate code-research.prompt.md with questions about pre-change system behavior, patterns, and integration points for areas affected by PR changes (Stories: P1-Understand, P2-PreChange)
- FR-007: System shall analyze codebase at base commit (pre-change state) to document existing patterns, conventions, and behavior in CodeResearch.md during Understanding stage (Stories: P1-Understand, P2-PreChange)
- FR-008: System shall use CodeResearch.md to inform DerivedSpec.md with accurate before/after behavior characterization (Stories: P1-Understand, P2-PreChange)
- FR-009: System shall identify all integration points, downstream effects, and breaking changes in impact analysis (Stories: P1-Identify)
- FR-010: System shall assess performance implications including hot paths, new queries, and resource usage (Stories: P1-Identify)
- FR-011: System shall evaluate security and authorization changes (Stories: P1-Identify)
- FR-012: System shall provide file:line references for all findings (Stories: P1-Identify)
- FR-013: System shall report test coverage quantitatively (if metrics available) and qualitatively (depth and breadth analysis) (Stories: P2-TestCoverage)
- FR-014: System shall identify specific test coverage gaps with file:line references (Stories: P2-TestCoverage)
- FR-015: System shall assess whether tests verify intended behavior vs passing trivially (Stories: P2-TestCoverage)
- FR-016: System shall transform all gap analysis findings into review comments with actionable suggestions (Stories: P1-Generate)
- FR-017: System shall batch related issues into cohesive comments per One Issue, One Comment policy (Stories: P1-Generate)
- FR-018: System shall distinguish inline comments (line-specific) from thread comments (file/concept-level) (Stories: P1-Generate)
- FR-019: System shall create GitHub pending review with inline comments posted but not submitted (Stories: P1-Generate)
- FR-020: System shall save comprehensive ReviewComments.md as reference copy of all feedback including thread comments, rationale sections for every recommendation, and critical assessment sections for every comment—created for both GitHub and non-GitHub contexts (Stories: P1-Generate, P2-Rationale, P3-Assessment)
- FR-021: System shall include code examples for non-trivial suggestions (Stories: P1-Generate)
- FR-022: System shall never automatically submit reviews—all posting requires human approval (Stories: P1-Generate)
- FR-023: System shall support regenerating pending review with adjusted tone when requested (Stories: P1-Generate)
- FR-024: System shall include Rationale section for every recommendation citing relevant best practices (Stories: P2-Rationale)
- FR-025: System shall answer reviewer questions based on understanding of pre-change and post-change codebase state (Stories: P3-Questions)
- FR-026: System shall generate critical assessment of each review comment evaluating usefulness, accuracy, and alternative perspectives (Stories: P3-Assessment)
- FR-027: System shall add assessment sections to ReviewComments.md without posting them to GitHub pending review or external platforms (Stories: P3-Assessment)
- FR-028: System shall support non-GitHub PR contexts by accepting base branch name, using current checked-out branch as head branch, deriving branch slug for artifact naming, using git diff for changes, and providing manual posting instructions in ReviewComments.md (Stories: P1-Generate, Edge Cases)
- FR-029: System shall capture CI/test status and avoid redundant comments on issues already caught by CI (Stories: Edge Cases)
- FR-030: System shall raise discrepancy blocks when PR description contradicts code changes (Stories: Edge Cases)
- FR-031: System shall evaluate architectural fit of changes (belongs in this codebase vs library, integrates well with system design, timing appropriateness) in Impact Analysis (Stories: P1-Identify)
- FR-032: System shall assess user impact from both end-user and developer-user perspectives in Impact Analysis (Stories: P1-Identify)
- FR-033: System shall include code health trend assessment (improving or degrading system health) in Impact Analysis risk evaluation (Stories: P1-Identify)
- FR-034: System shall identify and commend good practices in Gap Analysis with positive observations section (Stories: P1-Identify)
- FR-035: System shall assess comment quality (WHY vs WHAT, necessity, whether code should be simpler) in Gap Analysis maintainability section (Stories: P1-Identify)
- FR-036: System shall detect over-engineering (solving future vs current problems, unnecessary abstractions) in Gap Analysis complexity analysis (Stories: P1-Identify)
- FR-037: System shall check style guide adherence and label preferences as "Nit:" in Gap Analysis (Stories: P1-Identify)
- FR-038: System shall verify user-facing documentation completeness and identify orphaned documentation in Gap Analysis (Stories: P1-Identify)
- FR-039: System shall assess test effectiveness (will fail when broken, meaningful assertions) and maintainability in Gap Analysis (Stories: P2-TestCoverage)
- FR-040: System shall prefer remote branch references (e.g., `origin/<base-branch>`) over local branches when determining base commit for baseline analysis to ensure comparison against latest upstream state (Stories: Edge Cases)
- FR-041: System shall fetch remote state before checking out base commit to ensure commit is available and up-to-date (Stories: Edge Cases)

### Key Entities

- **PR Context**: Metadata about the pull request including number/identifier, title, author, description, base and head branches, labels, reviewers, CI status, changed files with statistics
- **Code Research Prompt**: Generated questions about pre-change system behavior, patterns, integration points, and conventions for areas affected by PR changes—used to guide baseline codebase analysis
- **Code Research**: Pre-change baseline documentation (created during Understanding stage) including how system worked before changes, existing patterns and conventions, integration points and dependencies, relevant test coverage and documentation context
- **Derived Specification**: Reverse-engineered intent (informed by CodeResearch.md) including intent summary, scope boundaries, assumptions, measurable outcomes, changed interfaces, risks/invariants, user-visible changes, migration notes, open questions
- **Impact Analysis**: System-wide effects including baseline state, integration points, public API changes, data changes, breaking changes, performance implications, security implications, deployment considerations, dependencies, historical context
- **Gap Analysis**: Categorized findings (Must/Should/Could) each with file:line reference, category (Correctness/Safety/Security/Compatibility/Testing/Reliability/Maintainability/Performance), issue description, evidence, impact/rationale, suggestion
- **Review Comments**: Generated feedback including summary comment, inline comments (file path, line range, type, category, comment text, suggestion, rationale, posted status), thread comments (scope, type, category, discussion text), questions for author
- **Comment Assessment**: Critical evaluation of review comments including usefulness analysis, accuracy check, alternative perspectives, recommendation for inclusion/modification/skip

### Cross-Cutting / Non-Functional

- **Evidence-Based Analysis**: All findings must be supported by concrete evidence (file:line references, test results, specific code patterns) rather than subjective preferences
- **Human Control**: No automatic posting or submission—all review feedback requires explicit human approval and can be edited before submission
- **Traceability**: Clear lineage from changes → understanding → evaluation → feedback with all reasoning documented in artifacts
- **Rewindability**: Each stage can be restarted if new information changes understanding or evaluation
- **Tone**: Professional, constructive tone using inclusive language ("we", "let's") rather than accusatory ("you didn't")
- **Noise Reduction**: Batch related issues, avoid commenting on untouched code, skip style trivia enforced by linters
- **Context Awareness**: Recommendations informed by existing codebase patterns and conventions from baseline research

## Success Criteria

- SC-001: Given a GitHub PR URL, understanding stage produces ReviewContext.md and code-research.prompt.md within 5-10 minutes with accurate PR metadata and research questions about affected system areas (FR-001, FR-006)
- SC-002: Given code-research.prompt.md, PAW-R1B Baseline Researcher Agent produces CodeResearch.md documenting pre-change system behavior by analyzing codebase at base commit (FR-007)
- SC-003: Given CodeResearch.md available, understanding stage completes with DerivedSpec.md within 10-15 minutes that accurately reflects PR intent informed by baseline understanding (FR-002, FR-003, FR-004, FR-008)
- SC-004: Given understanding artifacts, human reviewer can validate accuracy and correct any misinterpretations before proceeding to evaluation (FR-005)
- SC-005: Given understanding artifacts including CodeResearch.md, evaluation stage produces ImpactAnalysis.md and GapAnalysis.md identifying integration points, breaking changes, and categorized findings with evidence within 15-25 minutes (FR-009, FR-010, FR-011, FR-012)
- SC-006: Given a PR with test changes, gap analysis includes test coverage section with quantitative metrics (if available) and qualitative depth/breadth assessment (FR-013, FR-014, FR-015)
- SC-007: Given evaluation artifacts, feedback generation creates ReviewComments.md with all feedback including rationale and assessment sections for both GitHub and non-GitHub contexts; for GitHub additionally creates pending review with inline comments (text/suggestions only) posted within 10-20 minutes (FR-016, FR-017, FR-018, FR-019, FR-020, FR-021)
- SC-008: Given pending review created, human reviewer can edit, delete, or add comments in GitHub UI before manually submitting—nothing posts automatically (FR-022)
- SC-009: Given request for tone adjustment, agent regenerates pending review with modified tone (FR-023)
- SC-010: Given generated review comments, every recommendation includes Rationale section citing relevant best practices or evidence (FR-024)
- SC-011: Given artifacts from all stages, reviewer can ask agent questions and receive answers based on documented codebase understanding (FR-025)
- SC-012: Given initial review comments, Feedback Critic adds assessment sections to ReviewComments.md evaluating usefulness and accuracy without posting to GitHub (FR-026, FR-027)
- SC-013: Given a non-GitHub PR context (e.g., Azure DevOps, local branches), workflow functions using branch names and git diff, producing same artifacts with branch-based naming (FR-028)
- SC-014: Given PR with failing CI checks, ReviewContext.md captures status and evaluation notes redundancy risk for CI-detected issues (FR-029)
- SC-015: Given PR description contradicting code changes, derived specification raises discrepancy block requiring human resolution (FR-030)
- SC-016: Given a PR with changes to existing code, Impact Analysis includes architectural fit evaluation (belongs in codebase vs library, design integration, timing) and user impact assessment (end-users and developer-users) (FR-031, FR-032)
- SC-017: Given Impact Analysis complete, risk assessment includes code health trend (improving or degrading system health) (FR-033)
- SC-018: Given Gap Analysis complete, positive observations section identifies and commends good practices (well-designed code, comprehensive tests, clear naming, proper error handling) (FR-034)
- SC-019: Given a PR with comments, Gap Analysis maintainability section includes comment quality assessment (WHY vs WHAT, necessity, whether code should be simpler) (FR-035)
- SC-020: Given a PR with complex or generic code, Gap Analysis complexity section detects over-engineering (solving future vs current problems, unnecessary abstractions) (FR-036)
- SC-021: Given a PR with style variations, Gap Analysis includes style guide adherence check with "Nit:" labeling for preferences vs requirements (FR-037)
- SC-022: Given a PR with documentation changes, Gap Analysis verifies user-facing documentation completeness and identifies orphaned documentation (FR-038)
- SC-023: Given a PR with tests, Gap Analysis assesses test effectiveness (will fail when broken, meaningful assertions) and maintainability (FR-039)
- SC-024: Given a base branch that exists on remote, Understanding Agent resolves base commit SHA from remote reference (e.g., `origin/main`) rather than local branch (FR-040)
- SC-025: Given base commit SHA from remote reference, Baseline Researcher successfully fetches remote and checks out commit even if local branch is behind (FR-041)

## Assumptions

- GitHub MCP server tools are available and functional for GitHub PR contexts; git command-line tools available for non-GitHub contexts
- Reviewers have read access to the repository at both base and head commits
- PR branches are available locally or can be fetched remotely for analysis
- Code coverage tools (if used) produce parseable output that can be integrated into test coverage analysis
- Project has established conventions and patterns that can be inferred from codebase analysis
- Review workflow is invoked on a single PR at a time (not batch review of multiple PRs)
- Artifacts are stored in `.paw/reviews/` directory structure with write permissions
- Human reviewer has GitHub access to view and edit pending reviews in GitHub contexts
- Reviewers understand the Must/Should/Could categorization scheme for prioritizing findings
- Feedback Critic agent runs after initial comment generation but before human final review
- Tone adjustment requests can specify desired tone characteristics (e.g., "more encouraging", "more direct")
- Baseline code research analyzes behavior and patterns, not line-by-line implementation details

## Scope

In Scope:
- Three-stage review workflow (Understanding → Evaluation → Feedback Generation)
- Analysis of PR changes including mechanical vs semantic distinction
- Reverse-engineering author intent into derived specification
- Pre-change codebase research to understand baseline behavior
- System-wide impact analysis including breaking changes, performance, security
- Systematic gap identification across correctness, safety, testing, maintainability, performance categories
- Test coverage analysis with quantitative and qualitative assessment
- Comprehensive review comment generation with rationale sections
- GitHub pending review creation and management
- Critical assessment of generated comments (Feedback Critic)
- Support for non-GitHub PR contexts (Azure DevOps, local branches)
- Human-controlled filtering and editing of all feedback before submission
- Interactive question-answering about changes based on codebase understanding
- One Issue, One Comment policy for deduplication and coherence
- Artifact-based workflow with traceability from changes to feedback

Out of Scope:
- Automatic submission of reviews without human approval
- Batch review of multiple PRs simultaneously
- Real-time review during PR creation (workflow runs on-demand)
- Integration with external code quality platforms beyond CI status capture
- Custom rule engines or configurable finding categories (uses fixed Must/Should/Could scheme)
- Detailed line-by-line code understanding in baseline research (behavioral analysis only)
- Automated merging or PR status changes based on review outcomes
- Review of commits not associated with a PR or branch
- Historical review of already-merged PRs (focus on active PRs)
- Customizable tone profiles beyond ad-hoc adjustment requests
- Machine learning or adaptive categorization of findings based on feedback history

## Dependencies

- GitHub MCP server (for GitHub PR contexts): PR metadata retrieval, pending review creation, inline comment posting
- Git command-line tools: Branch checkout, diff generation, commit history access
- File system access: Read/write to `.paw/reviews/` directory for artifact storage
- VS Code or terminal environment: Agent execution context
- Code coverage tools (optional): Quantitative test coverage metrics if project uses coverage reporting
- Review research notes: `review-research-notes.md` for best practices citations in rationale sections

## Risks & Mitigations

- **Risk**: Large PRs may take excessive time for comprehensive analysis, frustrating reviewers. **Mitigation**: Include scope assessment in evaluation stage that flags oversized PRs and suggests splitting; provide time estimates based on PR size; allow reviewers to skip stages if needed.

- **Risk**: Reverse-engineered specifications may misinterpret author intent, leading to irrelevant feedback. **Mitigation**: Clearly distinguish stated vs inferred goals; flag uncertainties as open questions; allow human reviewer to correct understanding artifacts before evaluation; encourage reviewer to validate DerivedSpec.md accuracy.

- **Risk**: Gap analysis may generate excessive low-value findings, overwhelming the reviewer. **Mitigation**: Strict Must/Should/Could categorization with evidence requirements; One Issue, One Comment batching; Feedback Critic provides critical assessment to help filter; human maintains full control over what gets posted.

- **Risk**: Code research of pre-change state may analyze wrong commit or miss relevant context. **Mitigation**: Explicitly check out base commit before research; document commit SHA in CodeResearch.md; focus on behavioral patterns rather than line-level details; allow human to validate baseline understanding.

- **Risk**: Generated comments may have inaccurate code suggestions that don't fit codebase context. **Mitigation**: Code research documents existing patterns to inform suggestions; rationale sections explain reasoning; Feedback Critic assesses accuracy; human edits comments before posting; recommendations focus on approaches rather than exact code when context is uncertain.

- **Risk**: Non-GitHub contexts may lack sufficient metadata for complete analysis. **Mitigation**: Use git diff and branch names as fallback; document limitations in ReviewContext.md; focus on code-level analysis rather than platform features; allow manual metadata input when available.

- **Risk**: Pending review may be accidentally deleted before submission. **Mitigation**: Save comprehensive ReviewComments.md as reference copy; support regeneration of pending review from artifacts; document posted comment IDs for tracking.

- **Risk**: Test coverage analysis may misinterpret metrics or miss project-specific testing conventions. **Mitigation**: Report quantitative metrics without interpretation when available; qualitative assessment flags gaps but notes human judgment needed; allow reviewer to override categorization based on project standards.

- **Risk**: Feedback Critic may introduce bias or incorrectly assess comment quality. **Mitigation**: Assessments are advisory only, not filtering decisions; human reviewer retains final control; assessment prompts critical thinking rather than automatic dismissal; focus on alternative perspectives rather than binary accept/reject.

- **Risk**: Tone adjustment may fail to capture reviewer's desired communication style. **Mitigation**: Support iterative refinement; allow manual editing of individual comments; provide tone adjustment as option, not requirement; reviewer can edit directly in GitHub UI as alternative.

## References

- Issue: https://github.com/lossyrob/phased-agent-workflow/issues/20
- Research: .paw/work/paw-review/context/review-research-notes.md
- Related Specifications: paw-review-specification.md (earlier draft, superseded by this spec where they differ), paw-specification.md (implementation workflow)
- External: Code review best practices from Microsoft, Google, and open-source research cited in review-research-notes.md

## Glossary

- **Mechanical Changes**: Code modifications that don't alter semantic behavior (formatting, renames, bulk updates, generated code)
- **Semantic Changes**: Code modifications that alter logic, behavior, or functionality
- **Derived Specification**: Reverse-engineered documentation of PR intent and acceptance criteria based on code analysis
- **Baseline State**: How the system worked before PR changes, analyzed at base commit
- **Gap Analysis**: Systematic identification of missing elements, issues, or concerns in PR changes
- **Must/Should/Could**: Categorization scheme for findings (Must = correctness/safety/security; Should = quality/completeness; Could = optional improvements)
- **One Issue, One Comment**: Policy of batching related issues into single comments rather than scattering feedback
- **Pending Review**: GitHub draft review with comments posted but not yet submitted to author
- **Thread Comment**: Review comment at file or PR level rather than specific line
- **Inline Comment**: Review comment tied to specific file path and line number(s)
- **Feedback Critic**: Agent that critically assesses generated comments for usefulness and accuracy
- **Code Research**: Analysis of codebase to understand patterns, behavior, and context
