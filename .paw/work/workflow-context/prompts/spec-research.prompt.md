---
mode: 'PAW-01B Spec Research Agent'
---
# Spec Research Prompt: Centralized Workflow Parameters

Perform research to answer the following questions.

Target Branch: feature/param-doc
GitHub Issue: 12
Additional Inputs: paw-specification.md, existing prompt files in docs/agents/feature/*/prompts/

## Questions

1. **Current Parameter Inventory**: What parameters are currently specified across existing prompt files in the repository? List all unique parameter types found (e.g., target branch, issue number, file paths, mode) with examples from different stages.

2. **Prompt File Structure**: What is the current structure and format of prompt files? Document the YAML frontmatter format, required fields, and any conventions for parameter specification within prompt content.

3. **Parameter Patterns by Stage**: For each PAW stage (Spec, Spec Research, Code Research, Impl Planning, Implementation, Review, Documentation, Status, PR), what parameters does each stage's prompt file currently reference or require? Create a matrix showing stage vs parameters.

4. **Artifact Path Conventions**: What are the established file path patterns for PAW artifacts (Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md, Docs.md)? Are these paths derivable from target branch name alone, or do they vary?

5. **Agent Parameter Discovery**: How do PAW agents currently discover their configuration and context? Do they parse prompt files, read from specific locations, expect parameters in chat attachments, or use other mechanisms? Document the actual behavior.

6. **Branching Parameter Usage**: How do different stages use the target branch parameter? Do any stages need to reference planning branch (`_plan` suffix), phase branches (`_phaseN` suffix), or other derived branch names?

7. **Issue Reference Usage**: How is the GitHub issue number/link currently used across stages? Which stages need it, and in what format (number only, full URL, link syntax)?

8. **Required vs Optional Parameters**: Based on how prompt files are currently structured, which parameters appear to be required for basic workflow operation vs optional/convenience parameters? Look for patterns where prompts fail or succeed without certain parameters.

9. **Parameter Validation**: Are there any existing validation mechanisms in agents or prompts that check for required parameters, valid formats, or parameter consistency?

10. **Inter-Stage Parameter Flow**: How do parameters flow between stages currently? Are there parameters that one stage produces that subsequent stages need to reference (e.g., PR numbers, commit hashes, phase numbers)?

11. **File Path References**: What file paths are commonly referenced across prompts? List the patterns (e.g., `docs/agents/<branch>/Spec.md`, `.github/chatmodes/*.chatmode.md`) and identify which are absolute vs relative, static vs dynamic.

12. **Parameter Override Examples**: Are there any existing examples in the codebase where parameters can be specified in multiple places with override behavior? How is precedence currently handled?

13. **Additional Inputs Pattern**: In existing prompt files, what types of values appear in "Additional Inputs" fields? Are these file paths, artifact names, or other context descriptions?

14. **Default Values**: Do any agents use default values when parameters are not specified? Document the fallback behavior (e.g., discovering current branch, assuming main repository, deriving paths).

15. **Dynamic Parameter Updates**: Are there any parameters that change during workflow execution? For example, do phase numbers increment, do artifact paths get created, does status change? Which agents would need to update vs read these?

### Optional External / Context

1. **Configuration File Best Practices**: What are established best practices for Markdown-based configuration or parameter files in AI/LLM agent systems? (Manual)

2. **Parameter Precedence Patterns**: What are common patterns for configuration precedence (file vs inline vs defaults) in development workflows? (Manual)

3. **Validation Standards**: Are there standards or common patterns for validating structured data in Markdown files? (Manual)

4. **User Experience Considerations**: What UX patterns make parameter files easy to understand and maintain for developers? (Manual)
