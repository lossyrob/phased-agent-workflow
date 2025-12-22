# PAW-05 PR Agent Analysis

## Category
**Core Workflow**

This is a terminal stage agent in the main development pipeline. It represents the final stage of the PAW workflow, creating the culminating PR that merges all work into main. Stage transitions lead TO this agent as the endpoint.

## Current Responsibilities
- Perform comprehensive pre-flight readiness checks before PR creation
- Validate all prerequisites are complete (phases done, docs done, artifacts exist)
- Block PR creation if validation checks fail
- Adapt PR creation based on Workflow Mode (full/minimal/custom) and Review Strategy (prs/local)
- Craft comprehensive PR descriptions from multiple artifacts
- Create the final PR to main branch
- Provide merge and deployment guidance to reviewers

## Artifacts Produced
- **Final PR** (`<target_branch>` → `main`) - The culminating deliverable
- **PR Description** - Comprehensive description synthesized from all artifacts

## Dependencies

### Inputs from
- `WorkflowContext.md` - Work ID, Target Branch, Work Title, Issue URL, Workflow Mode, Review Strategy
- `Spec.md` - Summary, Acceptance Criteria, Assumptions
- `SpecResearch.md` - Open Unknowns (for resolution tracking)
- `CodeResearch.md` - Open Questions (for resolution tracking)
- `ImplementationPlan.md` - Phases, Testing info, Phase completion status
- `Docs.md` - Documentation status
- Phase PRs (when using `prs` strategy) - Links and merge status
- Planning PR (when using `prs` strategy)
- Docs PR (when using `prs` strategy)

### Outputs to
- **Human reviewers** - PR description, merge guidance, deployment considerations
- **GitHub/Git platform** - The created PR
- No downstream agent; this is the terminal stage

### Tools used
- File read operations (read WorkflowContext.md, all artifacts)
- Git operations (check branch status, commits, merge conflicts)
- GitHub PR creation tools (`mcp_github-emu_*` or platform equivalent)
- Build/test status checking (if applicable)

## Subagent Invocations
- **None** - This agent does not delegate to other agents
- Acts as a "collector" that synthesizes outputs from all previous stages

## V2 Mapping Recommendation

### Suggested v2 home
**Workflow Skill** - This is a terminal workflow stage that orchestrates the final deliverable. It should remain as a distinct stage in the v2 workflow pipeline.

However, several internal capabilities could be extracted:

1. **PR Description Generator** - Could be a capability skill that synthesizes artifacts into PR descriptions
2. **Pre-flight Validator** - Could be a capability skill for validating workflow completion status
3. **Open Questions Resolver** - Could be a capability skill that traces questions through artifacts to resolutions

### Subagent candidate
**No** - This agent is already at the end of the pipeline and doesn't make sense to invoke from other workflows. It's inherently a "terminal" action.

### Skills to extract
1. **`pr-description-generator`** - Standalone skill that takes a set of artifacts and generates a structured PR description. Reusable for any PR creation scenario.
   
2. **`workflow-completion-validator`** - Skill that checks if all workflow prerequisites are met (artifacts exist, PRs merged, branch status). Could be used at any stage transition.

3. **`open-questions-tracer`** - Skill that traces open questions from research artifacts through to their resolutions. Useful for documentation and audit trails.

4. **`artifact-discovery`** - The pattern for dynamically checking which artifacts exist and adapting behavior accordingly. This is a reusable pattern, not necessarily a standalone skill.

## Lessons Learned

### 1. Terminal stages are "collectors" not "delegators"
This agent synthesizes outputs from the entire pipeline rather than delegating work. In v2, terminal workflow stages should be optimized for aggregation and synthesis rather than complex decision trees.

### 2. Mode/Strategy adaptation is a cross-cutting concern
The extensive Workflow Mode and Review Strategy handling (full/minimal/custom × prs/local) suggests this adaptation logic should be centralized, not duplicated in each agent. Consider a **context-aware rendering system** that adjusts all agent behaviors based on workflow configuration.

### 3. Pre-flight validation is a reusable pattern
The structured checklist approach (Phase complete, Docs complete, Artifacts exist, Branch status, Build status, Questions resolved) is a generalizable validation framework that could apply to any stage transition.

### 4. PR creation follows a predictable template
Despite complexity in gathering inputs, the actual PR structure is templated. This suggests **PR description generation** is a good candidate for a deterministic capability skill that takes structured input.

### 5. Open Questions tracking reveals a documentation debt pattern
The agent explicitly tracks questions from SpecResearch → CodeResearch → resolutions. This traceability requirement suggests v2 should have first-class support for **decision/question tracking** across stages.

### 6. "Guardrails" section defines agent boundaries
The explicit "NEVER modify code", "NEVER approve PRs" guardrails indicate that agent role boundaries are important. In v2, these could be enforced structurally rather than through prompt instructions.

### 7. Artifact discovery pattern should be standardized
The `artifacts_to_check` pattern appears here but is likely needed by other agents too. This is a cross-cutting infrastructure concern for v2.

## Additional Observations

### Complexity Drivers
- Multi-mode support (full/minimal/custom) adds significant prompt complexity
- Review strategy variations (prs/local) require different PR description structures
- Backward compatibility defaults when fields are missing

### Token Efficiency Concerns
- Large template sections could be moved to external templates
- Mode-specific behavior could be handled by conditional template rendering
- Checklist sections are verbose; could be data-driven

### Integration Points
- Heavy reliance on GitHub MCP tools for PR creation
- Assumes specific artifact file structure (`.paw/work/<feature-slug>/`)
- Tight coupling to WorkflowContext.md format
