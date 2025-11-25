# Implementation Review Custom Instructions

## PAW Specification and Status Agent Synchronization

**CRITICAL**: The PAW specification (`paw-specification.md`) and Status Agent (`agents/PAW-X Status Update.agent.md`) must remain synchronized.

### When Reviewing Changes to `paw-specification.md`:

If the Implementation Agent modifies the PAW specification, verify that the Status Agent includes corresponding updates:

- **New workflow stages**: Status Agent's "Workflow Stages Overview" section must list the new stage with inputs, outputs, duration, and commands
- **Changed stage behavior**: Status Agent's stage descriptions must reflect the updated behavior
- **New workflow modes**: Status Agent's "Workflow Mode Behavior" section must document the new mode
- **Changed review strategies**: Status Agent's "Review Strategy Behavior" section must reflect the changes
- **New branching patterns**: Status Agent's branching conventions must match the spec
- **Updated agent responsibilities**: Status Agent's stage descriptions must align with agent role changes
- **New artifacts or deliverables**: Status Agent's artifact detection logic and common scenarios must include new artifacts

If synchronization is missing:
1. Document the discrepancy in your review
2. Ask the Implementation Agent to update the Status Agent in a follow-up commit
3. Verify the synchronization in your next review pass

### When Reviewing Changes to `agents/PAW-X Status Update.agent.md`:

If the Implementation Agent modifies the Status Agent, verify that changes reflect the PAW specification:

- Status Agent stage descriptions must match `paw-specification.md` stage definitions
- Workflow mode behaviors must align with the specification's mode descriptions
- Review strategy patterns must match the specification's branching conventions
- Duration estimates should be consistent with specification guidance
- Navigation commands must map to actual agent names defined in the specification

If discrepancies exist:
1. Document which Status Agent content conflicts with the specification
2. Ask the Implementation Agent to align the Status Agent with the spec
3. If the spec needs updating instead, note that and request spec updates first

### General Synchronization Principles:

- **PAW Specification is the source of truth** for workflow architecture, stage definitions, and agent responsibilities
- **Status Agent is the user-facing guide** that must accurately reflect the specification in an accessible format
- **Changes flow specification → Status Agent** (not vice versa) unless the specification has documented gaps
- When in doubt, ensure both documents tell the same story about how PAW works

### Rationale:

The Status Agent serves as the primary in-editor guide for users navigating PAW workflows. If it provides incorrect or outdated guidance about stages, modes, or agent behavior, users will be confused or follow incorrect procedures. Keeping these documents synchronized ensures users receive accurate, trustworthy guidance that matches how PAW actually works.
