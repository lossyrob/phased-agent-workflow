---
name: multi-model-review
description: Reviews PRs or code changes using multiple AI models, synthesizes findings, and interactively applies fixes. Uses GPT 5.2, Gemini 3 Pro, and Opus 4.5 for diverse perspectives.
---

# Multi-Model Review

Review PRs or code changes across multiple AI models to get diverse perspectives, then interactively work through findings with the user.

## Capabilities

- Review PRs using GPT 5.2, Gemini 3 Pro, and Claude Opus 4.5 in parallel
- Generate individual model reviews and a synthesized summary
- Track issue status (applied, skipped, discussed) across all model reviews
- Present findings interactively for user decision

## When to Use

- PR review requiring thorough analysis
- Skills or prompts where token efficiency matters
- Architectural changes benefiting from multiple perspectives
- Any code where catching edge cases is critical

## Execution

### Phase 1: Gather Context

**Desired end state**: Full understanding of what's being reviewed

**Required context**:
- PR number/URL or branch with changes
- Output location (user-specified or repo root)
- Any specific review focus areas (optional)

**Gather**:
- PR diff and changed files
- Related specs, plans, or reference materials
- Relevant context from the codebase

### Phase 2: Parallel Model Reviews

**Desired end state**: Three independent reviews saved to output location

**Models**: GPT 5.2, Gemini 3 Pro, Claude Opus 4.5

**Review prompt template**:
```
You are reviewing [description of changes]. Review critically against [context].

## Changes Being Reviewed
[Include full content of changed files]

## Reference Context
[Specs, plans, related patterns]

## Review Task
Write a review covering:
1. **Correctness**: Do changes implement requirements? Any gaps?
2. **Pattern Comparison**: What patterns from [reference] could improve these? Missing concepts?
3. **Mistakes and Issues**: Bugs, inconsistencies, problematic patterns
4. **Improvement Suggestions**: Concrete, actionable improvements
5. **Token Efficiency**: Opportunities to reduce verbosity (for prompts/skills)
6. **[Domain-specific criteria]**

Write in markdown format suitable for saving to a file.
```

**Output files**:
- `REVIEW-{MODEL}.md` for each model
- Use `task` tool with `model` parameter for each review

### Phase 3: Synthesis

**Desired end state**: Consolidated findings document identifying consensus and unique insights

**Synthesis structure**:
```markdown
# Review Synthesis: [Subject]

**Date**: [date]
**Reviewers**: GPT-5.2, Gemini 3 Pro, Claude Opus 4.5
**PR/Changes**: [reference]

## Consensus Issues (All 3 Models Agree)
[Issues flagged by all models - highest priority]

## Partial Agreement (2 of 3 Models)
[Issues flagged by two models]

## Single-Model Insights
[Unique findings worth considering]

## Priority Actions
### Must Fix
[Critical issues]

### Should Fix
[High-value improvements]

### Consider
[Nice-to-haves]
```

**Output file**: `REVIEW-SYNTHESIS.md`

### Phase 4: Interactive Resolution

**Desired end state**: All findings addressed (applied, skipped, or discussed)

**For each model review** (start with most comprehensive, typically Opus):

Present each finding to user:
```
## Finding #N: [Title]

**Issue**: [Description]

**Current**:
[Show current code/text]

**Proposed**:
[Show proposed change]

---

**Your call**: Skip, discuss, or apply?
```

**Track status**:
- `applied` - Change made
- `skipped` - User chose not to apply
- `discussed` - Modified based on discussion, then applied or skipped

**Cross-reference**: When moving to next model's review, check if finding was already addressed:
- If same issue was applied → "Already addressed in Finding #N from [Model]"
- If same issue was skipped → "Previously skipped (Finding #N from [Model]). Revisit?"
- If similar but different angle → Present as new finding

### Completion

**Report back**:
- Number of findings per model
- Applied vs skipped counts
- Summary of key changes made
- Any remaining items flagged for future consideration

## Output Location

Ask user for output location. Options:
- Specific directory path
- Default: Repository root as `reviews/[PR-or-branch-name]/`

## Quality Criteria

- Each model review should be independent (don't share results between model calls)
- Synthesis should identify true consensus vs coincidental overlap
- Interactive phase should be efficient—group related findings when possible
- Track cross-model duplicates to avoid re-presenting same issue
