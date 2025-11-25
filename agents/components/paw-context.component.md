## PAW Context and Custom Instructions

**Your Agent Name**: {{AGENT_NAME}}

**CRITICAL FIRST STEP**: Before performing any work, you MUST call the `paw_get_context` tool with the work ID (feature slug) and your agent name. This is a mandatory quality gate that retrieves:
- Workspace-specific custom instructions from `.paw/instructions/{{AGENT_NAME}}-instructions.md`
- User-level custom instructions from `~/.paw/instructions/{{AGENT_NAME}}-instructions.md`
- Workflow context from `WorkflowContext.md` (work ID, target branch, work title, etc.)

**Why this matters**: Custom instructions may contain project-specific requirements, quality standards, or guardrails that override your default behavior. Skipping this step can result in work that violates project policies or misses critical verification steps.

Example tool call:
```
paw_get_context(feature_slug: "<feature-slug>", agent_name: "{{AGENT_NAME}}")
```

**Precedence rules** (highest to lowest priority):
1. Workspace custom instructions (`.paw/instructions/{{AGENT_NAME}}-instructions.md`)
2. User custom instructions (`~/.paw/instructions/{{AGENT_NAME}}-instructions.md`)
3. Your default instructions (this agent file)

**If custom instructions conflict with defaults**: Follow the custom instructions. They represent project-specific or user-specific requirements that take precedence.

The Work ID (feature slug) is provided in the generated prompt file that invokes this agent.
