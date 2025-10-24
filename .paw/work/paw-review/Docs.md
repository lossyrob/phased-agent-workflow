# PAW Review Workflow - Code Review Process

## Overview

The PAW Review Workflow is a structured, three-stage code review process that helps reviewers thoroughly understand pull requests, systematically identify issues, and generate comprehensive, evidence-based feedback. It brings the same rigor, traceability, and human-in-the-loop decision-making from PAW's implementation workflow to the code review process.

**Core Philosophy**: Understand first, evaluate systematically, then generate comprehensive feedback with full human control over what gets posted.

The workflow addresses a common problem in code reviews: jumping to critique without first establishing a shared understanding of what changed and why. By separating understanding from evaluation, and evaluation from feedback generation, PAW Review enables thorough, thoughtful reviews even for large or poorly-documented PRs.

## When to Use PAW Review

**Ideal for**:
- Large PRs (500+ lines) requiring systematic analysis
- Poorly-documented PRs lacking clear descriptions or linked issues
- Complex changes affecting multiple subsystems
- Changes to critical systems (auth, data, security)
- Reviews where you need to reverse-engineer the author's intent
- Situations requiring comprehensive, evidence-based feedback

**Not needed for**:
- Small, straightforward PRs (<100 lines, single focused change)
- Trivial fixes (typos, formatting, simple dependency updates)
- PRs you understand immediately from description and changes
- Quick sanity checks or rubber-stamp approvals

## Three-Stage Workflow

### Stage R1: Understanding

**Goal**: Comprehensively understand what changed and why before making any judgments.

**Key Outputs**:
- `ReviewContext.md` - PR metadata and authoritative parameters
- `prompts/code-research.prompt.md` - Research questions about pre-change system
- `CodeResearch.md` - Pre-change baseline understanding (after research)
- `DerivedSpec.md` - Reverse-engineered specification

**Process**:
1. Gather PR metadata (GitHub API or git diff)
2. Document all changed files and categorize them
3. Generate research prompt about pre-change system behavior
4. Pause for baseline research (PAW Review Baseline Researcher)
5. Derive specification from code + baseline understanding
6. Block if any open questions remain

**Testing as a Human User**:
- Provide a PR URL or checkout a branch
- Invoke "PAW-R1 Understanding Agent" chatmode
- Review `ReviewContext.md` - verify metadata is accurate
- Review `DerivedSpec.md` - does it match your understanding?
- Check that `CodeResearch.md` documents how things worked before changes
- Confirm no open questions remain before proceeding

### Stage R2: Evaluation

**Goal**: Systematically identify system-wide impacts, breaking changes, and gaps across correctness, safety, testing, and quality dimensions.

**Key Outputs**:
- `ImpactAnalysis.md` - Integration points, breaking changes, deployment considerations
- `GapAnalysis.md` - Categorized findings (Must/Should/Could)

**Process**:
1. Build integration graph of affected components
2. Detect breaking changes in public APIs
3. Assess performance, security, and architectural implications
4. Identify gaps in correctness, safety, testing, maintainability
5. Categorize findings with evidence (Must/Should/Could)
6. Include positive observations for mentoring value

**Testing as a Human User**:
- After Stage R1 completes, invoke "PAW-R2A Impact Analysis Agent"
- Then invoke "PAW-R2B Gap Analysis Agent"
- Review `ImpactAnalysis.md` - understand system-wide effects
- Review `GapAnalysis.md` - check Must/Should/Could categorization
- Validate findings have file:line references
- Add domain-specific concerns the agent may have missed
- Confirm categorization isn't inflated

### Stage R3: Feedback Generation

**Goal**: Transform findings into structured review comments with rationale, creating a GitHub pending review (GitHub context) or comprehensive markdown document (non-GitHub context).

**Key Outputs**:
- `ReviewComments.md` - Complete feedback with rationale and assessments
- GitHub pending review (GitHub context only) - posted but not submitted

**Process**:
1. Batch related findings (One Issue, One Comment)
2. Build comment objects with type, severity, evidence
3. Generate rationale sections (Evidence, Baseline Pattern, Impact, Best Practice)
4. Create `ReviewComments.md` with all feedback
5. For GitHub: create pending review with inline comments (text/suggestions only)
6. Feedback Critic adds critical assessments to ReviewComments.md
7. Human reviews, edits, deletes comments before submitting

**Testing as a Human User**:
- After Stage R2 completes, invoke "PAW-R3A Feedback Generation Agent"
- Then invoke "PAW-R3B Feedback Critic"
- Review `ReviewComments.md` - comprehensive feedback with rationale/assessment
- **GitHub context**: Open PR in GitHub, view pending review in Files Changed tab
- **GitHub context**: Edit/delete individual comments, adjust tone
- **Non-GitHub context**: Use ReviewComments.md to manually post comments
- Confirm nothing is submitted automatically
- Submit review when satisfied (Approve/Comment/Request Changes)

## Architecture and Design

### Research-Driven Understanding

The Understanding stage follows a research-driven workflow similar to PAW's Spec Research pattern:

1. **Initial Analysis**: Identify areas affected by changes
2. **Generate Research Prompt**: Create questions about pre-change system behavior
3. **Pause for Research**: Human runs PAW Review Baseline Researcher to analyze codebase at base commit
4. **Complete Understanding**: With baseline knowledge, derive accurate specification

This ensures the derived specification is informed by actual pre-change behavior, not speculation.

### Separation of Concerns

The workflow strictly separates three concerns:

**Understanding (R1)**: Documents what changed and why - no evaluation
**Evaluation (R2)**: Identifies impacts and gaps - no feedback generation
**Feedback (R3)**: Transforms findings into comments - human controls posting

This separation enables:
- Rewindability: Restart any stage if new information emerges
- Clarity: Each artifact has a single, well-defined purpose
- Quality: Focus on doing one thing well at each stage

### Authoritative Parameter Source: ReviewContext.md

ReviewContext.md serves the same role as WorkflowContext.md in PAW's implementation workflow:
- Created first in Understanding stage
- Contains all essential parameters (PR/branch, commits, repository, artifact paths)
- Read first by all downstream agents
- Updated when new information discovered
- Single source of truth for workflow state

This ensures parameter continuity across all stages without repeated prompting.

### Evidence-Based Analysis

Every finding, recommendation, and observation must include:
- **File:line references**: Specific code locations
- **Baseline patterns**: How the system worked before changes (from CodeResearch.md)
- **Impact description**: What could go wrong or why it matters
- **Best practice citations**: References to established guidelines

No speculation, no fabricated requirements, no subjective preferences without clear rationale.

### Must/Should/Could Categorization

Findings are categorized with strict evidence requirements to prevent inflation:

**Must**: Correctness, safety, security, data integrity issues with concrete impact evidence
**Should**: Quality, completeness, testing gaps that increase robustness
**Could**: Optional enhancements with clear benefit

Categorization rules prevent style preferences from being inflated to critical issues.

### Rationale and Assessment Sections

Every review comment includes two key sections that remain local (not posted to GitHub/external platforms):

**Rationale**: Explains why the recommendation matters
- Evidence: Specific file:line references
- Baseline Pattern: How it was done before
- Impact: What could go wrong
- Best Practice: Citation from established guidelines

**Assessment**: Critical evaluation by Feedback Critic
- Usefulness: Does this truly improve code quality?
- Accuracy: Are evidence references correct?
- Alternative Perspectives: What might the reviewer have missed?
- Trade-offs: Valid reasons for current approach?
- Recommendation: Include/modify/skip?

This two-layer approach gives reviewers full context for decision-making while keeping the thought process private.

### GitHub vs Non-GitHub Contexts

The workflow supports both GitHub PRs and non-GitHub contexts (Azure DevOps, GitLab, local branches):

**GitHub Context**:
- Use GitHub MCP tools for PR metadata and pending review creation
- Artifacts stored in `.paw/reviews/PR-<number>/`
- Create pending review with inline comments
- Rationale/assessment stay in ReviewComments.md

**Non-GitHub Context**:
- Use git diff for changes, derive metadata from commits
- Artifacts stored in `.paw/reviews/<branch-slug>/` (normalized branch name)
- All feedback in ReviewComments.md with manual posting instructions
- Same analysis, just different posting mechanism

## User Guide

### Prerequisites

- VS Code with GitHub Copilot
- GitHub MCP Tools (for GitHub PRs)
- Git command-line tools
- Repository with PAW Review chatmodes in `.github/chatmodes/`

### Basic Usage: GitHub PR Review

1. **Start Understanding Stage**:
   ```
   @workspace /mode PAW-R1 Understanding Agent
   
   Please analyze PR #123
   ```

2. **Run Baseline Research**:
   ```
   # After code-research.prompt.md is generated
   @workspace /mode PAW Review Baseline Researcher
   
   Follow the research prompt at .paw/reviews/PR-123/prompts/code-research.prompt.md
   ```

3. **Complete Understanding**:
   - Understanding Agent automatically continues after CodeResearch.md exists
   - Review `ReviewContext.md` and `DerivedSpec.md`
   - Correct any misinterpretations

4. **Run Evaluation**:
   ```
   @workspace /mode PAW-R2A Impact Analysis Agent
   # Review ImpactAnalysis.md
   
   @workspace /mode PAW-R2B Gap Analysis Agent
   # Review GapAnalysis.md
   ```

5. **Generate Feedback**:
   ```
   @workspace /mode PAW-R3A Feedback Generation Agent
   # Creates ReviewComments.md and GitHub pending review
   
   @workspace /mode PAW-R3B Feedback Critic
   # Adds assessments to ReviewComments.md
   ```

6. **Edit and Submit**:
   - Open PR in GitHub
   - View pending review in Files Changed tab
   - Edit/delete comments as needed
   - Submit review (Approve/Comment/Request Changes)

### Advanced Usage: Non-GitHub PR

1. **Checkout branch**:
   ```bash
   git checkout feature/new-auth
   ```

2. **Start Understanding**:
   ```
   @workspace /mode PAW-R1 Understanding Agent
   
   Please analyze the current branch against main
   ```

3. **Continue with evaluation and feedback** as above

4. **Manual Posting**:
   - Use ReviewComments.md to manually post comments to your platform
   - File paths and line numbers provided for each inline comment

### Tone Adjustment

If feedback tone needs adjustment:
```
@workspace /mode PAW-R3A Feedback Generation Agent

Please regenerate the pending review with a more encouraging tone
```

The agent will delete the existing pending review and recreate with adjusted tone while preserving IDs, evidence, and rationale.

### Asking Questions

The Feedback Generation Agent can answer questions based on all artifacts:
```
@workspace /mode PAW-R3A Feedback Generation Agent

Why did you recommend adding that null check in auth/validator.ts?
```

The agent references CodeResearch.md, DerivedSpec.md, and other artifacts to provide evidence-based answers.

## Configuration

### Artifact Storage

All artifacts stored in `.paw/reviews/<identifier>/`:
- **GitHub**: `.paw/reviews/PR-<number>/` (e.g., `PR-123`)
- **Non-GitHub**: `.paw/reviews/<branch-slug>/` (normalized branch name)

### Branch Slug Normalization

For non-GitHub contexts, branch names are normalized:
- Lowercase
- Replace `/` and special characters with `-`
- Remove invalid characters
- Example: `feature/new-auth` → `feature-new-auth`

## Edge Cases and Limitations

### PR with CI Failures

When CI checks are failing:
- ReviewContext.md captures CI status
- Evaluation stage notes redundancy risk
- Avoid commenting on issues already caught by CI

### Conflicting Information

When PR description contradicts code changes:
- DerivedSpec.md raises discrepancy as open question
- Blocks progression until human resolves
- No speculation about "correct" interpretation

### Missing Test Coverage with Exemptions

Some projects have exemptions for certain code types:
- Gap analysis notes missing tests
- Categorizes based on general principles (Must for critical paths, Should for standard)
- Human reviewer applies project-specific judgment

### Pending Review Accidentally Deleted

If GitHub pending review is deleted:
- ReviewComments.md serves as reference
- Can regenerate pending review from artifacts
- Comment IDs tracked for consistency

### Large PRs (1000+ Lines)

For very large PRs:
- Scope assessment flags if too large to review effectively
- Suggests splitting approach (politely)
- Reviewer decides whether to proceed or request split

### Multi-File Architectural Issues

When concern spans multiple files:
- Create single thread comment in ReviewComments.md
- Avoid scattering inline comments
- Comprehensive explanation in one place

## Migration and Compatibility

### Integration with Existing Workflow

PAW Review is a standalone workflow that complements PAW's implementation workflow:
- Use PAW Implementation for building features
- Use PAW Review for reviewing PRs (including PRs created by PAW)
- Both share artifact-based, traceable, rewindable philosophy

### Artifact Directory Structure

Review artifacts separate from implementation artifacts:
- Implementation: `.paw/work/<feature-slug>/`
- Review: `.paw/reviews/<identifier>/`

No conflicts or cross-dependencies.

### Failure Recovery

If a stage is interrupted:
- Resume from last completed artifact
- Artifacts are idempotent (re-running overwrites target artifact)
- ReviewContext.md provides authoritative state

### Rollback

To remove PAW Review from a repository:
1. Delete review chatmode files from `.github/chatmodes/`
2. Remove `.paw/reviews/` directory
3. No impact on implementation workflow

## References

### Specifications
- **Feature Spec**: `.paw/work/paw-review/Spec.md` - Functional requirements and acceptance criteria
- **Implementation Plan**: `.paw/work/paw-review/ImplementationPlan.md` - Detailed implementation breakdown
- **Root Specification**: `paw-review-specification.md` - Earlier draft (superseded by Spec.md where they differ)

### GitHub Issue
- https://github.com/lossyrob/phased-agent-workflow/issues/20

### External References
- Google Engineering Practices: Code Review Guidelines
- Microsoft Code Review Best Practices
- PAW Implementation Workflow: `paw-specification.md`

## Glossary

**Artifact**: Durable markdown document produced by a workflow stage (e.g., ReviewContext.md, GapAnalysis.md)

**Baseline State**: How the system worked before PR changes, analyzed at base commit

**Branch Slug**: Normalized branch name for artifact directory naming (e.g., `feature-new-auth`)

**Code Research**: Analysis of pre-change codebase to understand patterns, behavior, and context

**Derived Specification**: Reverse-engineered documentation of PR intent based on code analysis

**Evidence-Based**: All findings supported by specific file:line references, not speculation

**Feedback Critic**: Agent that critically assesses generated comments for usefulness and accuracy

**Gap Analysis**: Systematic identification of missing elements, issues, or concerns in PR changes

**Inline Comment**: Review comment tied to specific file path and line number

**Mechanical Changes**: Code modifications that don't alter semantic behavior (formatting, renames)

**Must/Should/Could**: Categorization scheme for findings based on severity and impact

**One Issue, One Comment**: Policy of batching related issues into single comments

**Pending Review**: GitHub draft review with comments posted but not yet submitted to author

**Rationale Section**: Explanation of why a recommendation matters (Evidence, Baseline Pattern, Impact, Best Practice)

**ReviewContext.md**: Authoritative parameter source for review workflow, analogous to WorkflowContext.md

**Semantic Changes**: Code modifications that alter logic, behavior, or functionality

**Thread Comment**: Review comment at file or PR level rather than specific line
