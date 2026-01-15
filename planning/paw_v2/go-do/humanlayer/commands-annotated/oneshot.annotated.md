---
annotations:
  labels_used:
    - command-description (NEW)
    - workflow-sequence
    - workflow-step
    - command-relationship
  total_labels: 4
  new_labels: 1
---

<command-description>
---
description: Research ticket and launch planning session
---
</command-description>

<workflow-sequence>
<workflow-step step="1">
1. use SlashCommand() to call /ralph_research with the given ticket number
</workflow-step>
<workflow-step step="2">
<command-relationship type="launch">
2. launch a new session with `npx humanlayer launch --model opus --dangerously-skip-permissions --dangerously-skip-permissions-timeout 14m --title "plan ENG-XXXX" "/oneshot_plan ENG-XXXX"`
</command-relationship>
</workflow-step>
</workflow-sequence>
