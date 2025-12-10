---
agent: 'PAW-01B Spec Researcher'
---
# Spec Research Prompt: Cross-Repository Workflow Supervisor

Perform research to answer the following questions.

Target Branch: feature/142-cross-repository-workflow-supervisor
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/142
Additional Inputs: none

## Agent Notes
The Cross-Repository Workflow Supervisor introduces a new workflow type that coordinates feature work across multiple git repositories in a VS Code multi-root workspace. Key constraints include:
- Supervisor artifacts live in workspace root `.paw/multi-work/` (not in any git repo)
- Child workflows in each repo must function independently as standard PAW workflows
- Context must flow from supervisor to children (scoped excerpts recommended)
- Repository-level sequencing for v1 (not phase-level)
- Integration with existing PAW initialization, agent system, and tooling

The research focuses on understanding current PAW implementation patterns to inform how the supervisor workflow will extend and integrate with the existing system.

## Questions

1. How does the current PAW initialization flow work in `initializeWorkItem` command? What prompts are presented and how is context gathered?
2. What is the structure of existing workflow context storage (`WorkflowContext.md`)? What fields are required vs. optional?
3. How do current PAW agents access workspace and work context? What tools/APIs are available?
4. How does VS Code's multi-root workspace API work? How can we detect git repositories in workspace folders?
5. What is the current agent template rendering system? How are agent prompts generated with context?
6. How does the `paw_call_agent` tool work? Can it target child workflows in subdirectories?
7. What is the existing file structure convention in `.paw/work/<feature-slug>/`? What artifacts are standard across workflows?
8. How does the current workflow mode system work? Is it extensible for new workflow types?

### Optional External / Context
1. What are common patterns for coordinating multi-repository features in software development?
2. How do other development tools handle cross-repository workflows?
