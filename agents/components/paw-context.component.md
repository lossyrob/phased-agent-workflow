## PAW Context

**Your Agent Name**: {{AGENT_NAME}}

**CRITICAL FIRST STEP**: Before performing any work, you MUST call the `paw_get_context` tool with the work ID (feature slug) and your agent name. This retrieves:
- Workflow context from `WorkflowContext.md` (work ID, target branch, work title, etc.)
- **Mode-specific handoff instructions** (manual/semi-auto/auto behavior) in `<handoff_instructions>` section
- Parsed policies (review_policy, session_policy)

**Why this matters**: The workflow context contains essential configuration for your work. The handoff instructions determine your stage transition behavior.

**Handoff behavior**: The `<handoff_instructions>` section in the tool result contains your specific behavior for stage transitions. Follow those instructions when ready to hand off to the next stage - they tell you whether to wait for user input or auto-proceed.

Example tool call:
```
paw_get_context(feature_slug: "<feature-slug>", agent_name: "{{AGENT_NAME}}")
```

The Work ID (feature slug) is provided in the generated prompt file that invokes this agent.

### WorkflowContext.md Fields

The `paw_get_context` tool returns raw WorkflowContext.md content. Parse these fields:

| Field | Description |
|-------|-------------|
| **Work Title** | Short name (2-4 words) for PR titles, e.g., "Auth System" |
| **Work ID** | Normalized slug for artifact paths, e.g., "auth-system" |
| **Target Branch** | Branch where implementation merges |
| **Issue URL** | GitHub Issue or Azure DevOps Work Item URL (or "none") |
| **Remote** | Git remote name (default: "origin") |
| **Workflow Mode** | `full` (standard), `minimal` (streamlined), or `custom` |
| **Review Strategy** | `prs` (intermediate PRs) or `local` (direct commits) |
| **Handoff Mode** | `manual` (user controls), `semi-auto` (auto at routine transitions), or `auto` (always auto-proceed) |
| **Custom Workflow Instructions** | Free-form text for custom mode (or "none") |
| **Artifact Paths** | Usually "auto-derived" → `.paw/work/<Work ID>/` |
| **Additional Inputs** | Comma-separated extra parameters (or "none") |

**Updating WorkflowContext.md**: If you learn new information during your work (e.g., PR URL, Issue URL discovered), update the file so downstream agents inherit the values.
