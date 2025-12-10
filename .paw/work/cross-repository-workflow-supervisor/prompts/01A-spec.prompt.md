---
agent: PAW-01A Specification
---

Create spec for this work item.

Work ID: cross-repository-workflow-supervisor

Additional Context:
## CRITICAL: Naming Convention for Cross-Repository Feature

**Use "Cross-Repository" or "Cross-Repo" terminology throughout, NOT "Supervisor".**

### Agent Naming Structure (PAW-M## Pattern)

Follow the established PAW naming pattern where:
- `M` prefix indicates Multi-repository/Cross-repository workflow (parallel to `R` for Review workflows)
- Numeric stages group related agents (01 = spec, 02 = planning, 03 = validation)
- Letter variants distinguish different roles within a stage (A/B)

**Required Agent Names:**
- `PAW-M01A Cross-Repo Spec` - Creates unified specifications for cross-repository features
- `PAW-M01B Cross-Repo Spec Researcher` - Researches cross-repository requirements and dependencies
- `PAW-M02A Cross-Repo Code Researcher` - Analyzes code structure across multiple repositories
- `PAW-M02B Cross-Repo Impl Planner` - Creates execution plans with repository-level sequencing
- `PAW-M03 Cross-Repo Validator` - Validates consistency across repositories at any workflow stage

### File and Directory Naming

- Artifact directory: `.paw/multi-work/<work-id>/` (at workspace root, NOT in git repos)
- Context file: `SupervisorContext.md` (keep this name for backward compatibility with existing code patterns)
- Agent files: `agents/PAW-M01A Cross-Repo Spec.agent.md`, etc.
- Component file (if created): `agents/components/cross-repo-context.component.md`
- Custom instructions: `.paw/instructions/PAW-M01A Cross-Repo Spec-instructions.md`, etc.

### Terminology Guidelines

**Use consistently:**
- "Cross-repository" or "cross-repo" (primary terms)
- "Multi-repository" or "multi-repo" (acceptable alternatives)
- "Workflow type: Cross-Repository" (UI labels)
- "Cross-repository agents" (when referring to the PAW-M## agent set)
- "Child workflows" (for standard PAW workflows in individual repositories)

**Avoid or minimize:**
- "Supervisor" (legacy term, only use where absolutely necessary for clarity about the coordination layer concept)
- If "supervisor" must be used, prefer phrases like "cross-repository coordination" or "multi-repo orchestration"

### Implementation Plan Requirements

When creating the implementation plan:

1. **Consistently use cross-repo terminology** in all descriptions, comments, and documentation
2. **Agent references** must use full PAW-M## names (e.g., "PAW-M01A Cross-Repo Spec agent")
3. **File paths** should reflect cross-repo naming where appropriate
4. **TypeScript types and interfaces** should use CrossRepo* naming (e.g., `CrossRepoContext`, not `SupervisorContext` - except where maintaining backward compatibility)
5. **Success criteria** should validate cross-repo agent functionality, not "supervisor" functionality
6. **All five PAW-M## agents** must be included in the plan (M01A, M01B, M02A, M02B, M03)

### Context

This naming decision aligns with:
- User-facing terminology: "Cross-Repository Workflow" option in UI
- Existing PAW patterns: Review workflows use PAW-R##, so Cross-Repo uses PAW-M##
- Clarity: "Cross-repo" is more descriptive than "supervisor" for the feature's purpose
- Consistency: Matches how users think about the feature (working across repositories)
