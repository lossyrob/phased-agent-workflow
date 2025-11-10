---
mode: 'PAW-01B Spec Research Agent'
---
# Spec Research Prompt: Simplified Workflow

Perform research to answer the following questions.

Target Branch: feature/simplified-workflow
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/13
Additional Inputs: .paw/work/simplified-workflow/context/workflow-mode-configuration-design.md

## Questions

1. What are the existing patterns in PAW for agent adaptation based on context parameters? (e.g., how do agents currently check for optional vs required artifacts, how do they handle conditional logic)

2. How does the current `paw_create_prompt_templates` tool implementation work? What is the exact signature and what prompt files does it generate currently?

3. What is the structure and content of existing prompt files (01A-spec.prompt.md, 02A-code-research.prompt.md, etc.)? Are they already parameterized or mode-aware in any way?

4. How do agents currently discover and reference artifacts? Do they fail gracefully when expected artifacts are missing?

5. What is the current branching strategy implementation in PAW agents? Which agents are responsible for creating/checking out branches, and how is this orchestrated?

6. How does the VS Code extension currently invoke agents via chat? What is the initialization prompt structure?

7. What validation/error handling exists in WorkflowContext.md parsing by agents? How are malformed or incomplete WorkflowContext.md files handled?

8. Are there existing patterns for "modifier" configurations or boolean flags in WorkflowContext.md that could inform the final-pr-only syntax decision?

### Optional External / Context

1. What are industry best practices for workflow configuration syntax (compound names vs separate fields vs flags)?

2. Are there established patterns for LLM-based interpretation of free-text configuration vs structured heuristics in agent systems?

3. What are common approaches to versioning workflow configuration files to support backward compatibility?
