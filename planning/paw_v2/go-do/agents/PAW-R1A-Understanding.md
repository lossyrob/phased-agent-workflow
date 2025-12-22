# PAW-R1A Understanding Agent Analysis

## Category
**Core Workflow**

This agent is the first stage in the PAW Review workflow pipeline. It drives stage transitions (to PAW-R1B Baseline Researcher, then to PAW-R2A Impact Analyzer) and produces artifacts that downstream stages depend on.

## Current Responsibilities
- Gather PR metadata (GitHub API or git diff) and document changed files
- Generate research prompt for baseline codebase analysis
- Pause workflow for PAW-R1B Baseline Researcher to analyze pre-change state
- Derive specification from PR description, code analysis, and baseline understanding
- Create ReviewContext.md as authoritative parameter source for downstream stages
- Detect workflow resumption state (fresh start vs resumption after research)
- Validate all artifacts meet quality standards before handoff

## Artifacts Produced
- `ReviewContext.md` - PR metadata, flags, artifact paths, authoritative context source
- `prompts/01B-code-research.prompt.md` - Research prompt for baseline researcher
- `DerivedSpec.md` - Explicit/inferred goals, before/after behavior characterization

## Dependencies
- **Inputs from**: 
  - PR URL/number (GitHub context) OR branch name (non-GitHub context)
  - Base branch name
  - GitHub API or git repository access
  - `CodeResearch.md` from PAW-R1B (required before deriving specification)
- **Outputs to**: 
  - PAW-R1B Baseline Researcher (receives research prompt)
  - PAW-R2A Impact Analyzer (receives DerivedSpec.md, ReviewContext.md)
- **Tools used**: 
  - GitHub MCP tools (`mcp_github_pull_request_read` for PR metadata, status, files)
  - Git commands (log, diff, rev-parse, remote)
  - File operations (read/write artifacts)

## Subagent Invocations
- **Yes** - Explicitly delegates to PAW-R1B Baseline Researcher for code research
- Workflow pauses after generating research prompt and resumes when CodeResearch.md exists
- This is a **synchronous handoff pattern** - cannot proceed until subagent completes

## V2 Mapping Recommendation
- **Suggested v2 home**: **Workflow Skill** - This is a stage orchestrator in the review pipeline
- **Subagent candidate**: **No** - This is a primary workflow stage, not a supporting capability
- **Skills to extract**:
  1. **PR Metadata Gatherer** - Reusable skill for fetching PR info (GitHub) or diff info (non-GitHub)
  2. **Artifact Directory Manager** - Creates/manages `.paw/reviews/<identifier>/` structure
  3. **Resumption State Detector** - Detects workflow state by checking which artifacts exist
  4. **Research Question Generator** - Creates contextual research prompts from changed files

## Lessons Learned

### Pattern: Synchronous Subagent Handoff
This agent demonstrates a **pause-and-resume pattern** where:
1. Agent generates output (research prompt)
2. Explicitly pauses for human to invoke subagent (PAW-R1B)
3. Resumes only when subagent artifact (CodeResearch.md) exists

**V2 Implication**: Need a mechanism for workflows to invoke subagents and block until completion, or restructure as sequential workflow stages.

### Pattern: Context Detection on Entry
Complex entry logic checks multiple conditions:
- Does ReviewContext.md exist? (resumption vs fresh start)
- Does CodeResearch.md exist? (post-research vs pre-research)
- GitHub vs non-GitHub context

**V2 Implication**: State detection could be extracted as a reusable skill or standardized workflow checkpoint pattern.

### Pattern: Artifact as Source of Truth
ReviewContext.md serves as the "authoritative parameter source" - downstream agents read from it rather than re-gathering context.

**V2 Implication**: This is a good pattern. V2 should preserve the concept of "context artifact" that flows through workflow stages.

### Pattern: Explicit Guardrails
Strong "NEVER/ALWAYS" section prevents scope creep:
- Never evaluate quality (that's PAW-R2A)
- Never suggest improvements (that's PAW-R3A)
- Always include file:line references

**V2 Implication**: Each skill should have clear boundaries. The separation of "understanding" from "evaluation" from "feedback" is a good decomposition.

### Observation: Dual Context Support
Supports both GitHub PRs (API-based) and non-GitHub branches (git-based). This adds complexity but provides flexibility.

**V2 Implication**: Consider whether to maintain dual-context support or have separate skills for each context type.

### Observation: Heavy Template Usage
Contains large inline templates for ReviewContext.md, DerivedSpec.md, and research prompt guidance.

**V2 Implication**: Templates could be externalized as files or skills, reducing agent token footprint and enabling reuse.
