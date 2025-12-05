## Review Workflow Navigation

This section describes how to navigate between stages in the PAW Review workflow.

### Command Mapping

When the user requests to move to another review stage, map their command to the appropriate agent:

| Command | Agent |
|---------|-------|
| `understanding`, `understand` | PAW-R1A Understanding |
| `baseline`, `baseline research` | PAW-R1B Baseline Researcher |
| `impact`, `impact analysis` | PAW-R2A Impact Analyzer |
| `gaps`, `gap analysis` | PAW-R2B Gap Analyzer |
| `feedback`, `generate feedback` | PAW-R3A Feedback Generator |
| `critique`, `review feedback` | PAW-R3B Feedback Critic |
| `status`, `help` | PAW-X Status |

### Stage Transitions

**From Understanding Agent (PAW-R1A)**:
- Next stage depends on whether baseline research is needed
- If research questions generated: `baseline` → PAW-R1B Baseline Researcher
- If research complete: `impact` → PAW-R2A Impact Analyzer

**From Baseline Researcher (PAW-R1B)**:
- Always returns to: PAW-R1A Understanding (to complete derived spec)

**From Impact Analyzer (PAW-R2A)**:
- Next stage: `gaps` → PAW-R2B Gap Analyzer

**From Gap Analyzer (PAW-R2B)**:
- Next stage: `feedback` → PAW-R3A Feedback Generator

**From Feedback Generator (PAW-R3A)**:
- Next stage: `critique` → PAW-R3B Feedback Critic

**From Feedback Critic (PAW-R3B)**:
- Review workflow complete
- User manually posts feedback or requests revisions

### Getting Help

Users can always ask the Status Agent for help navigating the workflow. Include in handoff messages: "Say `status` or `help` for workflow guidance."

### Continue Behavior

When user says `continue`, proceed to the **first command** in your presented "Next Steps" list. Place your recommended default action first—this becomes the `continue` target. The guidance line must explicitly state what `continue` does (e.g., `say 'continue' to proceed to impact analysis`).

**Terminal stage** (PAW-R3B Feedback Critic): Workflow ends with human reviewer action. If the user says `continue`, offer to revise feedback or clarify next steps.
