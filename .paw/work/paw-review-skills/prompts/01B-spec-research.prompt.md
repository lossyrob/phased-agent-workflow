---
agent: 'PAW-01B Spec Researcher'
---
# Spec Research Prompt: PAW Review Skills

Perform research to answer the following questions about existing system behavior.

Target Branch: feature/paw-review-skills
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/154
Additional Inputs: none

## Agent Notes

This work introduces a skills-based architecture for the PAW Review workflow. The goal is to consolidate 6 PAW-R* agents into a single PAW Review agent that loads skills dynamically via `paw_get_skills` and `paw_get_skill` tools.

**Key decisions already made:**
- Subagents write artifacts directly (parent receives file path, not content)
- Only built-in skills for this work (no workspace/user skill discovery)
- Entry point is `paw-review-pr.prompt.md` prompt file installed in user directory
- Cross-repo review support is in scope, but differentiation needs analysis

**Skills structure planned:**
- `paw-review-workflow` – Orchestrates the sequence, runs activities as subagents
- `paw-review-understanding` – Activity: R1A logic (create ReviewContext, DerivedSpec)
- `paw-review-baseline` – Activity: R1B logic (CodeResearch.md)
- `paw-review-impact` – Activity: R2A logic (ImpactAnalysis.md)
- `paw-review-gap` – Activity: R2B logic (GapAnalysis.md)
- `paw-review-feedback` – Activity: R3A logic (ReviewComments.md, pending review)
- `paw-review-critic` – Activity: R3B logic (assessment sections)

## Questions

### Current Review Agent Analysis

1. **Review workflow sequence**: What is the exact sequence of agents in the current review workflow? Document the flow including any loops or conditional branches (e.g., R1A → R1B → R1A return → R2A → R2B → R3A → R3B).

2. **Agent responsibilities by artifact**: For each PAW-R* agent, what artifact(s) does it produce? What inputs does it require? Document the artifact dependency graph.

3. **Cross-repo differentiation analysis**: Analyze each PAW-R* agent's prompt content. Identify any instructions or logic that would need to differ between:
   - Single-repo review (one workspace = one PR)
   - Multi-repo review (workspace contains multiple projects, potentially multiple PRs)
   
   Specifically look for: references to "workspace root", assumptions about single PR context, git operations, file path handling, GitHub MCP usage patterns.

4. **Handoff patterns**: How do current review agents hand off to each other? What information is passed between stages? Is there any state beyond the artifacts themselves?

### Agent Installation Mechanism

5. **Current installer behavior**: How does `src/agents/installer.ts` currently install agent files? What directory does it target? How does it determine which files to install?

6. **Prompt file installation**: Does the current installer support installing prompt files (`.prompt.md`)? If not, what would be required to add this capability? Where should prompt files be installed in the user's VS Code directory?

### Subagent Execution

7. **Subagent tool access**: When a subagent is spawned via `runSubagent`, does it have access to tools like `paw_get_skill`? Are there any documented limitations on tool access in subagent contexts?

8. **Subagent return contract**: What is the expected format for subagent responses? How does the parent agent receive confirmation of completed work (file paths, summaries, status)?

### Skills Integration

9. **Skill metadata extraction**: How should the `paw_get_skills` tool extract metadata from SKILL.md files? The Agent Skills spec uses YAML frontmatter—what fields should be parsed and returned in the catalog?

10. **Skill location**: Where should built-in skills be stored in the extension source? Consider: bundling in extension package, runtime accessibility, and the pattern used for existing bundled content (e.g., agent templates).

### Other research

1. What is the exact YAML frontmatter schema for Agent Skills spec SKILL.md files? (Reference: https://agentskills.io/specification)

2. How does VS Code's native skill support (`.github/skills/`) handle skill discovery and loading? (Reference: https://code.visualstudio.com/docs/copilot/customization/agent-skills)
