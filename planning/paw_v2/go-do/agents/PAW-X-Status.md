# PAW-X Status Agent Analysis

## Category
**Specialized Role**

This agent is explicitly a supporting capability, not a stage in the main development pipeline. The "X" designation signals it's outside the numbered workflow stages (01-05). It serves as a workflow navigator and historian that can be invoked anytime, doesn't produce development artifacts, and doesn't drive stage-to-stage transitions on its own.

## Current Responsibilities
- **Workflow state diagnosis**: Inspect artifacts, git state, and PRs to build an accurate workflow dashboard
- **Next-step recommendation**: Guide users to the most relevant action with exact command syntax
- **Resume assistance**: Help users recover after workflow interruption or downtime
- **Multi-work-item management**: List and summarize all active work items in `.paw/work/`
- **Help/education mode**: Explain what each PAW stage does, its inputs/outputs, and typical duration
- **External updates (opt-in only)**: Post status comments to GitHub Issues/PRs when explicitly requested
- **Agent handoff routing**: Dispatch to appropriate agents when user requests stage transitions

## Artifacts Produced
- **None for workflow progression** — Status agent is read-only for the development workflow
- **Issue/PR comments** (opt-in only) — Status update comments with `**🐾 Status Update Agent 🤖:**` prefix
- **PR body updates** (opt-in only) — Updates only within `<!-- BEGIN:AGENT-SUMMARY -->` blocks

## Dependencies
- **Inputs from**:
  - `WorkflowContext.md` — Configuration and state
  - All workflow artifacts (Spec.md, CodeResearch.md, ImplementationPlan.md, Docs.md) — Presence detection
  - Git state — Current branch, divergence, staged/unstaged changes
  - GitHub PRs — Status, review comments, CI status
- **Outputs to**:
  - **None directly to workflow** — Produces guidance for humans
  - Optionally updates GitHub Issues/PRs with status comments
- **Tools used**:
  - `list_dir` / `read_file` — Artifact and WorkflowContext inspection
  - Git CLI commands — Branch state, divergence, commit history
  - GitHub MCP tools — PR search, review comments, issue comments
  - `paw_call_agent` — Handoff to stage agents when user requests transitions

## Subagent Invocations
- **Yes** — Routes to other agents via `paw_call_agent` for stage transitions
- Does not invoke subagents for its own work; purely a router/dispatcher for user-requested transitions
- Maps user commands to agent invocations:
  - `spec` → PAW-01A Specification
  - `research` → PAW-02A Code Researcher (or 01B Spec Researcher)
  - `plan` → PAW-02B Impl Planner
  - `implement Phase N` → PAW-03A Implementer
  - `review` → PAW-03B Impl Reviewer
  - `docs` → PAW-04 Documenter
  - `pr` → PAW-05 PR

## V2 Mapping Recommendation
- **Suggested v2 home**: **Prompt command** (invoked directly by user) or **Utility skill** (invoked by workflow agents)
- **Subagent candidate**: **No** — This is a top-level utility, not something a workflow stage would invoke as a subagent
- **Skills to extract**:
  1. **`skill_workflow_state`** — Artifact detection, phase counting, git state analysis, PR status collection
  2. **`skill_next_step_advisor`** — Maps workflow state to recommended next action with command syntax
  3. **`skill_work_item_lister`** — Enumerate and summarize all `.paw/work/` items
  4. **`skill_pr_comment_analyzer`** — Analyze addressed vs outstanding review comments (timestamps, commit SHAs)
  5. **`skill_issue_status_poster`** — Format and post status updates to GitHub Issues/PRs

### V2 Integration Pattern
The Status agent's capabilities split naturally into:
1. **Reusable skills** that other agents could invoke (e.g., workflow state detection)
2. **User-facing command** that orchestrates these skills for status reports

In v2, this could become:
- A `paw status` prompt command that uses workflow state and next-step skills
- Skills that workflow agents use for self-awareness (e.g., 03A checking phase completion before signaling ready)

## Lessons Learned

### 1. "X" Agents Are Cross-Cutting Utilities
The "X" designation indicates this isn't a workflow stage but a supporting capability. When analyzing other agents, the naming convention signals:
- Numbered agents (01-05, R1-R3) = workflow stages with transitions
- Letter-suffix agents (A, B) = stage variants or sub-phases
- "X" agents = utilities that operate across all stages

### 2. Agent Responsibilities Include Embedded Documentation
This agent contains extensive PAW process documentation:
- Complete workflow stage overview (140+ lines of stage descriptions)
- Two-agent implementation pattern explanation
- Workflow mode/review strategy behavior
- Common errors and resolutions

**V2 Implication**: This documentation should be extracted into a separate knowledge resource. Agents shouldn't duplicate the full workflow reference; they should reference external docs and focus on their specific role.

### 3. Read-Only vs Write Agents
Status agent is fundamentally **read-only** for the workflow:
- Doesn't create development artifacts
- Doesn't commit code
- Only writes to external systems (GitHub) on explicit user opt-in

**V2 Implication**: Classify agents by their mutation surface — read-only observers vs artifact producers. This informs permission models and rollback strategies.

### 4. Routing/Dispatch Is a Distinct Capability
Status agent serves as a **router** to other agents. This is a meta-capability:
- Understands all agent responsibilities
- Maps user commands to agent invocations
- Could be the entry point for a workflow orchestrator

**V2 Implication**: The routing logic could become a core orchestrator skill that any workflow agent uses, rather than being embedded in a utility agent.

### 5. Status Agent Knows the Full Process Model
Unlike stage agents that focus on their phase, Status agent holds the complete workflow model:
- All stage relationships
- Artifact dependencies
- Mode/strategy variations
- Phase counting logic

**V2 Implication**: This "workflow model knowledge" should be a shared resource, not duplicated across agents. Status agent just happens to be the one that exposes it to users.

### 6. Idempotency Requirement
The guardrails emphasize: "Be idempotent: identical state should yield identical summaries."

**V2 Implication**: Status/diagnostic skills should be pure functions of state with no side effects. This enables caching, testing, and reliability.
