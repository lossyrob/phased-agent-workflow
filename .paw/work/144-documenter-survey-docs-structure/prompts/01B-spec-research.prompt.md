---
agent: 'PAW-01B Spec Researcher'
---
# Spec Research Prompt: Documenter Survey Docs Structure

Perform research to answer the following questions.

Target Branch: feature/144-documenter-survey-docs-structure
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/144
Additional Inputs: none

## Agent Notes

The Spec Agent has reviewed:
- Issue #144 which identifies a gap in the Documenter agent's process: it creates comprehensive Docs.md but doesn't survey project documentation structure to identify where feature guides should be integrated.
- The current Documenter agent file (PAW-04 Documenter.agent.md) which shows the process steps focus on Docs.md creation and updating README/CHANGELOG.
- The project has an established docs structure: `docs/guide/`, `docs/reference/`, `docs/specification/` with mkdocs.yml navigation.

The enhancement should add an early survey step and modify the "Update project documentation" step to leverage survey findings.

Key constraints from issue:
- Docs.md remains authoritative technical reference
- New capability is additive—survey informs where to create/update guides
- Must work with various documentation patterns (mkdocs, plain markdown, etc.)

## Questions

1. **Current Documenter Process Order**: What is the exact sequence of steps in the Documenter agent's "Process Steps" section? Where specifically would a survey step logically fit (before which existing step)?

2. **Existing Project Structure Awareness**: Does the Documenter agent currently perform any file/directory exploration to understand project structure, or does it rely entirely on user-provided input and artifact reading?

3. **Update Project Documentation Step Details**: What does step 4 ("Update project documentation") currently instruct for deciding what files to update? Is there any existing guidance about discovering project-specific documentation patterns?

4. **Existing Survey Patterns in PAW Agents**: Do any other PAW agents (Spec, Code Researcher, Implementer, etc.) perform early project structure surveys? If so, what patterns do they use that could inform the Documenter's survey approach?

5. **Documentation Framework Detection**: Are there any patterns in the codebase for detecting documentation frameworks (mkdocs.yml, docusaurus.config.js, etc.) that could inform what navigation files to update?

### Optional External / Context

1. What are common patterns across documentation-focused tools for surveying project structure (e.g., how do documentation generators discover existing content)?
