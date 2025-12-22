# PAW-02A Code Researcher Agent Analysis

## Category
**Core Workflow**

This agent is essential to the main development pipeline. It sits in Stage 2 (Planning) and is the first step after spec research, producing the `CodeResearch.md` artifact that the Implementation Planner depends on. Without code research, planning lacks the implementation context needed to create viable phases.

## Current Responsibilities

1. **Codebase Documentation** - Document existing code without suggesting improvements or critiques
2. **File/Component Location** - Find WHERE files and components live using search strategies
3. **Code Analysis** - Understand HOW specific code works with precise file:line references
4. **Pattern Discovery** - Find examples of existing patterns that can serve as templates
5. **Data Flow Tracing** - Follow data from entry to exit points, mapping transformations
6. **Architecture Documentation** - Recognize design patterns and integration points
7. **Research Question Decomposition** - Break down complex queries into composable research areas
8. **GitHub Permalink Generation** - Add permanent references when on pushed commits

## Artifacts Produced

- **`CodeResearch.md`** - Primary output at `.paw/work/<feature-slug>/CodeResearch.md`
  - Contains YAML frontmatter (date, git_commit, branch, repository, topic, tags, status)
  - Structured sections: Research Question, Summary, Detailed Findings, Code References, Architecture Documentation, Open Questions
  - File:line references for all claims
  - GitHub permalinks when applicable

## Dependencies

### Inputs from
- **`Spec.md`** (if exists) - Requirements context from specification stage
- **`SpecResearch.md`** (if exists) - Behavioral understanding from spec research
- **`WorkflowContext.md`** - Work ID, Target Branch, Workflow Mode, Review Strategy
- **Issue URL** - Falls back to this as requirements source in minimal mode
- **User research query** - The specific question/topic to investigate

### Outputs to
- **PAW-02B Impl Planner** - Provides `CodeResearch.md` for implementation planning
- The research document becomes the foundation for creating implementation phases

### Tools used
- **`paw_get_context`** - Retrieves workflow context and custom instructions (mandatory first step)
- **`paw_call_agent`** - Hands off to PAW-02B Impl Planner
- **`paw_generate_prompt`** - Creates prompt files for next stage
- **File operations** - Read files fully (no limit/offset), write CodeResearch.md
- **Search tools** - grep, glob, semantic search for code location
- **Terminal commands** - `date`, `git rev-parse HEAD`, `git branch --show-current`, `gh repo view`
- **GitHub MCP tools** - For interacting with issues and PRs
- **Web search** - For external documentation and resources

## Subagent Invocations

**No subagent invocations** - This agent performs all research itself. It does mention:
- Using TodoWrite for tracking research subtasks
- Breaking down research into composable areas
- But these are internal task management, not subagent calls

## V2 Mapping Recommendation

### Suggested v2 home
**Capability Skill** invoked by Planner Workflow

Rationale:
- Code research is a discrete, reusable capability (understanding codebase implementation)
- The Planner workflow agent should orchestrate when/how much code research is needed
- Could be invoked with different scopes: full codebase survey vs. targeted component research
- Same skill could be invoked by Implementation Agent when encountering unfamiliar code

### Subagent candidate
**Yes** - This is an excellent subagent candidate:
- Well-defined scope: "document existing code without critique"
- Clear input contract: research query + optional spec context
- Clear output contract: structured CodeResearch.md
- Reusable across contexts: planning, implementation debugging, onboarding

### Skills to extract

1. **Code Location Skill** (`locate-code`)
   - Find files by topic/feature
   - Categorize by purpose (implementation, tests, config, docs)
   - Return structured file paths

2. **Code Analysis Skill** (`analyze-code`)
   - Trace data flow through components
   - Document function purposes and interactions
   - Include file:line references

3. **Pattern Finder Skill** (`find-patterns`)
   - Locate similar implementations
   - Extract reusable patterns with examples
   - Show variations and conventions

4. **GitHub Permalink Generator** (utility)
   - Generate permalinks for code references
   - Check if on pushed commit
   - Format references correctly

## Lessons Learned

### Insights for analyzing other agents

1. **Strict behavioral guardrails are skill-defining**
   - This agent's identity is defined by what it does NOT do (no critiques, no suggestions)
   - "Document, don't evaluate" constraint is its core value
   - V2 skills should preserve these behavioral boundaries

2. **Workflow mode adaptation pattern**
   - Agent handles `full`, `minimal`, `custom` modes differently
   - Uses graceful degradation (try Spec.md, fall back to Issue URL)
   - V2 should make mode handling a framework concern, not per-skill

3. **Multi-step research pattern**
   - Location → Analysis → Pattern Finding → Synthesis
   - Each step is potentially a separate skill
   - Orchestration logic could be extracted to workflow agent

4. **Artifact paths are conventional**
   - `.paw/work/<feature-slug>/CodeResearch.md` is hardcoded
   - V2 should consider parameterized artifact paths

5. **Terminal commands for metadata collection**
   - Uses git commands for commit, branch, repo info
   - This pattern appears in multiple agents - candidate for shared utility

6. **No subagent delegation despite complexity**
   - Agent handles all research internally
   - V2 could explore breaking into locate/analyze/pattern subagents
   - Current monolithic approach keeps context but limits reuse

7. **Handoff pattern is standardized**
   - Uses shared handoff instructions component
   - Presents "Next Steps" with command mapping
   - V2 should preserve this stage transition contract

8. **Quality checklist pattern**
   - Explicit checklist before completion
   - Could become a framework-level verification step
   - V2 should standardize quality gates across skills

### V2 Architecture Notes

The Code Researcher represents a **pure research capability** without decision-making authority. It:
- Gathers and structures information
- Does not decide what to do with findings
- Passes structured output to Planner for decisions

This aligns with V2's principle that skills provide capabilities while workflows provide decision-making logic.
