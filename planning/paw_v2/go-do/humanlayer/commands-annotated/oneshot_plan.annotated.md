<!--
ANNOTATION METADATA
==================
Labels used:
- command-relationship (existing) - References to other commands
- workflow-sequence (existing) - Container for workflow steps
- workflow-step (existing) - Individual steps

New labels:
- command-frontmatter - YAML frontmatter with command description
-->

<command-frontmatter>
---
description: Execute ralph plan and implementation for a ticket
---
</command-frontmatter>

<workflow-sequence>
<workflow-step>
1. use SlashCommand() to call /ralph_plan with the given ticket number
</workflow-step>
<workflow-step>
<command-relationship>
2. use SlashCommand() to call /ralph_impl with the given ticket number
</command-relationship>
</workflow-step>
</workflow-sequence>
