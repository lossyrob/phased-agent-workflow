## PAW Context and Custom Instructions

**Your Agent Name**: {{AGENT_NAME}}

At the beginning of your work, call the `paw_get_context` tool with the feature slug and your agent name to retrieve (if they exist):
- Workspace-specific custom instructions from `.paw/instructions/{{AGENT_NAME}}-instructions.md`
- User-level custom instructions from `~/.paw/instructions/{{AGENT_NAME}}-instructions.md`
- Workflow context from `WorkflowContext.md` (feature slug, target branch, work title, etc.)

Example tool call:
```
paw_get_context(feature_slug: "<feature-slug>", agent_name: "{{AGENT_NAME}}")
```

Precedence rules:
- Workspace custom instructions override user custom instructions
- Custom instructions override your default instructions where conflicts exist

The feature slug is provided in the generated prompt file that invokes this agent.
