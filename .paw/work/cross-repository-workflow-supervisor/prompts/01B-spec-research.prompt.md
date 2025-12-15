---
agent: 'PAW-01B Spec Researcher'
---
# Spec Research Prompt: Cross-Repository Workflow Supervisor

Perform research to answer the following questions.

Target Branch: feature/142-cross-repository-workflow-supervisor
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/142
Additional Inputs: none

## Agent Notes

**Feature Context**: Cross-repository workflow coordination allowing PAW to manage features spanning multiple git repositories through a supervisor workflow with child PAW workflows in each repository.

**Key Design Decisions**:
- Use "Cross-Repository" terminology (not "Supervisor") throughout
- Agent naming: PAW-M## pattern (M01A, M01B, M02A, M02B, M03)
- Artifact location: `.paw/multi-work/<work-id>/` at workspace root
- Context scoping: Scoped excerpts to child workflows
- Sequencing: Repository-level for v1
- Validation focus: Consistency checking, drift detection, course correction

**Validation Agent Role** (PAW-M03):
Checks consistency across repositories after independent child workflow execution. Validates that changes align with each other and with the cross-repo plan, checks documentation consistency, detects unsynchronized drift, and suggests course corrections (including adding phases to child implementation plans).

**Constraints**:
- Must work with VS Code multi-root workspaces
- Must detect git repositories in workspace folders
- Child workflows remain independently functional
- Supervisor artifacts outside individual git repositories

## Questions

### Current PAW Initialization and Context
1. How does the current `initializeWorkItem` command structure its initialization flow? What prompts are shown, what information is collected, and in what order?
2. What is the exact structure and required fields of WorkflowContext.md files? What optional fields exist?
3. How does the initialization flow determine artifact paths? What is the "auto-derived" path pattern?
4. How does `paw_get_context` discover and load custom instructions from `.paw/instructions/`? What file naming pattern is used?
5. How do agents parse WorkflowContext.md to extract field values?

### Workspace and Repository Detection
6. How does the VS Code extension detect multi-root workspaces? What APIs are available for enumerating workspace folders?
7. What is the pattern for determining which workspace folders are git repositories?
8. How does the codebase differentiate between workspace root and individual repository roots?

### Agent System and Handoff
9. How does `paw_call_agent` resolve agent names to agent files? What is the agent discovery mechanism?
10. What is the structure and usage pattern of the `inline_instruction` parameter in agent handoffs?
11. How are agent prompt templates stored, named, and loaded?
12. Can `paw_call_agent` target workflows in subdirectories or only workspace-root workflows?

### Artifact Organization and Workflow Modes
13. What is the standard artifact directory structure in `.paw/work/<work-id>/`? What files are created during spec, planning, and implementation?
14. How does the current workflow mode system (`full`, `minimal`, `custom`) work? Is it extensible for new workflow types?
15. Are there existing patterns for hierarchical or nested workflow artifacts?

### Validation and Consistency Patterns
16. How do existing PAW agents (particularly review agents PAW-R##) perform consistency checking?
17. What patterns exist for comparing implementation against plans or specifications?

### Optional External / Context
1. What are common patterns in multi-repository workflow tools (e.g., meta, lerna, rush) for artifact organization and context passing?
2. What approaches exist for validating consistency across multiple codebases in coordinated changes?

### Optional External / Context
1. What are common patterns for coordinating multi-repository features in software development?
2. How do other development tools handle cross-repository workflows?
