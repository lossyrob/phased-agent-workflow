# Spec Research: Documenter Survey Docs Structure

## Summary

The Documenter agent currently follows a linear 5-step process that focuses on creating Docs.md and updating standard project documentation (README, CHANGELOG) without any explicit survey or discovery of existing documentation structure. No PAW agents perform early project structure surveys—agents either receive explicit inputs or explore code/docs to answer specific questions. The codebase contains no patterns for detecting documentation frameworks; however, the PAW project itself uses MkDocs with a `docs/` directory structure, demonstrating what such discovery would need to identify.

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

## Research Findings

### Question 1: Current Documenter Process Order

**Question**: What is the exact sequence of steps in the Documenter agent's "Process Steps" section? Where specifically would a survey step logically fit (before which existing step)?

**Answer**: The Documenter agent has 5 process steps for initial documentation:

1. **Validate prerequisites** - Read ImplementationPlan.md, verify phases complete, confirm target branch current
2. **Analyze implementation** - Read Spec.md, review ImplementationPlan.md and merged Phase PRs, understand architecture and design decisions
3. **Create comprehensive Docs.md** - Write detailed documentation covering overview, architecture, user functionality, technical details, API reference, configuration, testing
4. **Update project documentation** - Update README, add CHANGELOG entries, refresh API docs, update guides/tutorials, create migration guides, follow project standards
5. **Determine review strategy and commit/push** - Branch logic based on prs vs local strategy

A survey step would logically fit **before step 3** (after "Analyze implementation" but before "Create comprehensive Docs.md"). At this point the agent understands what was implemented but hasn't yet started creating documentation. Surveying project documentation structure here would inform both Docs.md content organization and the subsequent step 4 project documentation updates.

**Evidence**: PAW-04 Documenter.agent.md "Process Steps" → "For Initial Documentation" section

**Implications**: The survey step should be inserted as a new step 3, shifting current steps 3-5 to become steps 4-6.

---

### Question 2: Existing Project Structure Awareness

**Question**: Does the Documenter agent currently perform any file/directory exploration to understand project structure, or does it rely entirely on user-provided input and artifact reading?

**Answer**: The Documenter agent **does not** perform any explicit file/directory exploration to understand project structure. It relies on:

1. **User-provided inputs**: Target branch, path to ImplementationPlan.md, merged Phase PR links, project documentation guidelines
2. **Artifact reading**: Reads Spec.md acceptance criteria, ImplementationPlan.md, and merged Phase PRs
3. **Implicit project conventions**: Instructions like "Update README for new features", "Add CHANGELOG entries", "Update user guides or tutorials" assume these files exist and follow standard patterns

The agent's step 4 instructs to "Follow project documentation standards" but provides no mechanism to discover what those standards are. The guidance to "match existing project documentation style" expects the agent to study existing docs during execution, but this is framed as style-matching rather than structural discovery.

**Evidence**: PAW-04 Documenter.agent.md "Inputs" section and "Process Steps" section

**Implications**: A survey step would add a new capability the agent currently lacks—explicit discovery of documentation structure before documentation creation begins.

---

### Question 3: Update Project Documentation Step Details

**Question**: What does step 4 ("Update project documentation") currently instruct for deciding what files to update? Is there any existing guidance about discovering project-specific documentation patterns?

**Answer**: Step 4 provides a **fixed list of file types** to update without discovery mechanisms:

- Update README for new features (summarized from Docs.md)
- Add CHANGELOG entries
- Refresh API documentation (based on Docs.md)
- Update user guides or tutorials (derived from Docs.md)
- Create migration guides if applicable
- Follow project documentation standards

The guidance for discovery is limited to **style matching**: "STUDY FIRST: Before updating any project documentation, read multiple existing entries/sections to understand the style, length, and detail level." This is reactive (during update) rather than proactive (survey first).

The step also includes critical warnings about matching existing verbosity levels (CHANGELOG single entry, README concise, etc.) but assumes the agent will find these files through implicit knowledge rather than explicit discovery.

**Evidence**: PAW-04 Documenter.agent.md step 4 content and "Project Documentation Style Matching" guardrail section

**Implications**: The current approach assumes a standard project structure. A survey step would explicitly identify what documentation patterns exist (e.g., mkdocs with `docs/guide/`, VuePress with `docs/.vuepress/`, plain README-only projects) before attempting updates.

---

### Question 4: Existing Survey Patterns in PAW Agents

**Question**: Do any other PAW agents (Spec, Code Researcher, Implementer, etc.) perform early project structure surveys? If so, what patterns do they use that could inform the Documenter's survey approach?

**Answer**: **No PAW agents perform early explicit project structure surveys.** Their approaches differ:

1. **Spec Agent (PAW-01A)**: Focuses on Issue/brief intake without codebase exploration. Generates research prompts for the Spec Researcher.

2. **Spec Researcher (PAW-01B)**: Answers specific questions by exploring repo, but this is question-driven exploration ("explore the repo...to answer factual questions") rather than upfront structure survey.

3. **Code Researcher (PAW-02A)**: Performs comprehensive research but driven by research queries, not structural discovery. Uses patterns like "Find the right files and code patterns" and "Look for integration points" in service of answering specific questions.

4. **Implementation Planner (PAW-02B)**: Context gathering reads "all files identified by research"—relies on prior research rather than independent discovery.

5. **Implementer (PAW-03A)**: Reads CodeResearch.md which "provides critical context about where relevant components live"—again relying on prior research.

The closest pattern is Code Researcher's comprehensive research approach: decompose a research area into subtasks, explore systematically, and synthesize findings. However, this is research-question-driven rather than structure-discovery-driven.

**Evidence**: Review of all PAW agent files (PAW-01A, PAW-01B, PAW-02A, PAW-02B, PAW-03A)

**Implications**: The Documenter survey would be a new pattern in PAW. It could follow the Code Researcher's systematic exploration approach but with a fixed objective: identify documentation structure rather than answer arbitrary questions.

---

### Question 5: Documentation Framework Detection

**Question**: Are there any patterns in the codebase for detecting documentation frameworks (mkdocs.yml, docusaurus.config.js, etc.) that could inform what navigation files to update?

**Answer**: **No explicit detection patterns exist** in the PAW codebase. However, the project itself uses MkDocs, providing an example of what detection would need to identify:

- Configuration file: `mkdocs.yml` at repository root
- Documentation source: `docs/` directory with subdirectories (`guide/`, `reference/`, `specification/`)
- Build output: `site/` directory (typically gitignored)
- Navigation: Defined in `mkdocs.yml` `nav` section

The GitHub Actions workflow (`docs.yml`) shows the MkDocs toolchain: `pip install mkdocs-material`, `mkdocs gh-deploy --force`. This demonstrates that config files at repo root indicate the framework in use.

Common documentation frameworks and their indicators:
- **MkDocs**: `mkdocs.yml` or `mkdocs.yaml`
- **Docusaurus**: `docusaurus.config.js` or `docusaurus.config.ts`
- **VuePress**: `.vuepress/config.js` or `docs/.vuepress/`
- **Sphinx**: `conf.py` with `docs/` or `source/`
- **Jekyll**: `_config.yml` with `docs/` or `_docs/`
- **Plain Markdown**: No config file, `docs/` directory with .md files

**Evidence**: PAW repository structure (mkdocs.yml, docs/ directory), .github/workflows/docs.yml workflow

**Implications**: A survey step could check for common config files to identify the framework, then examine the corresponding structure (nav configuration, source directories) to understand where feature documentation should integrate.

---

## Open Unknowns

*No open unknowns identified. All internal questions could be answered through codebase exploration.*

---

## User-Provided External Knowledge (Manual Fill)

The following optional external/context questions were included in the research prompt. These require external knowledge and are preserved for manual completion if needed:

- [ ] What are common patterns across documentation-focused tools for surveying project structure (e.g., how do documentation generators discover existing content)?
