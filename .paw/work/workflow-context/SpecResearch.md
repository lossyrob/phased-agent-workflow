# Spec Research: Centralized Workflow Parameters

## Summary
Prompt files rely on a small, repeated parameter set (agent `mode`, target branch, GitHub issue reference, canonical artifact paths, and occasional "Additional Inputs" lists) to steer each PAW stage; those parameters feed downstream agents through Markdown content rather than automated parsing. Artifact locations derive from the target branch under `docs/agents/<target_branch>/`, branch derivatives (`_plan`, `_phaseN`, `_docs`) are invoked through later-stage chatmodes, and no built-in validation or override precedence exists—agents fall back to inspecting the active branch or supplied files when parameters are missing.

## Internal System Behavior

### Prompt Parameter Inventory
* Behavior summary: Prompt bodies enumerate branch names, issue identifiers, artifact paths, and supporting document lists; YAML frontmatter always sets an agent `mode`, providing the primary routing parameter.
* Entry triggers / interactions (conceptual): When a developer invokes a stage, they open the corresponding prompt file and supply it to the chatmode, so the parameters embedded in that Markdown become the working configuration for that run.
* Data concepts (entities & purposes): Parameter categories include agent mode identifiers, target branch strings, GitHub issue references (both numeric `#` and full URL forms), artifact paths under the branch folder, "Additional Inputs" lists naming reference documents, and ad-hoc cues such as "last commit" for review focus.
* Config / flags influencing behavior: No configurable switches exist inside prompts; the parameter list is static text the agent interprets during the session.

### Prompt File Structure
* Behavior summary: Every prompt begins with minimal YAML frontmatter (`mode: '<PAW code and title>'`) followed by Markdown instructions; complex prompts (e.g., Spec Research) add headings, enumerated question lists, and optional sections for human-provided context.
* Entry triggers / interactions (conceptual): Spec Agent outputs create or update these prompt files, then users re-open them unchanged before invoking research or downstream agents.
* Data concepts (entities & purposes): Frontmatter identifies the chatmode; body sections capture stage context (feature title, target branch, linked documents) and ordered tasks/questions.
* Config / flags influencing behavior: No required frontmatter fields beyond `mode` are present in the repository; conventions keep parameter declarations in plain Markdown (`Target Branch: …`, `GitHub Issue: …`).

### Stage Parameter Patterns
* Behavior summary: Stage prompts reference parameters needed for that stage—Spec prompts cite the issue URL and target branch along with a pointer to SpecResearch; Spec Research prompts restate branch/issue plus inputs; Code Research and Implementation Planning prompts repeat branch context; Implementation prompts call out ImplementationPlan path; Status prompts bind issue number and branch.
* Entry triggers / interactions (conceptual): When a stage begins, the developer opens the relevant prompt file (if present) and the embedded parameters seed the agent session.
* Data concepts (entities & purposes):
  - Spec Stage (PAW-01A): issue URL (`https://github.com/.../issues/<n>`), target branch, link to branch-specific SpecResearch.
  - Spec Research Stage (PAW-01B): target branch, numeric issue ID, "Additional Inputs" (e.g., `paw-specification.md`, prompt directories).
  - Code Research Stage (PAW-02A): textual directive naming the target branch context; no separate parameter block beyond the branch-specific description.
  - Implementation Planning Stage (PAW-02B): target branch mention and dependency on previously generated artifacts.
  - Implementation Stage (PAW-03A): explicit path to `ImplementationPlan.md` under the branch directory.
  - Implementation Review Stage (PAW-03B): focuses on "last commit" reference without reiterating branch or issue.
  - Documentation Stage: no prompt file present; agent instructions in `.github/chatmodes` expect manual parameter handoff (branch, plan path, PR list).
  - Status Stage (PAW-X): issue number `#<n>` and target branch string.
  - PR Stage: no prompt file; chatmode instructions expect target/base branches and ImplementationPlan path via conversation.
* Config / flags influencing behavior: Absence of prompt files for Documentation and PR stages leaves parameter capture to ad hoc chat inputs.

### Artifact Path Conventions
* Behavior summary: All stage outputs live beneath `docs/agents/<target_branch>/`, with `prompts/` holding stage prompt files and fixed artifact names (`Spec.md`, `SpecResearch.md`, `CodeResearch.md`, `ImplementationPlan.md`, `Docs.md`).
* Entry triggers / interactions (conceptual): Each stage writes or reads the artifact tied to its responsibilities; later stages read upstream artifacts from the same branch folder.
* Data concepts (entities & purposes): Branch-named folder acts as namespace for spec, research, plan, docs, plus prompt files; paths encode branch once, avoiding per-artifact customization.
* Config / flags influencing behavior: Artifact locations derive deterministically from the target branch; no alternative path configuration is documented.

### Agent Context Discovery
* Behavior summary: Chatmode instructions direct agents to inspect conversation inputs, current Git branch, and supplied file paths; there is no automated parsing of prompt files beyond the model reading the Markdown content it receives.
* Entry triggers / interactions (conceptual): On invocation, agents attempt to infer target branch or prompt path from the user message; if unspecified, instructions tell them to ask the user or inspect the active branch name.
* Data concepts (entities & purposes): Context sources include prompt text, branch name via `git branch --show-current`, referenced artifacts (Spec, Plan), and GitHub issues/PRs accessed through MCP tools.
* Config / flags influencing behavior: Lacking centralized config, agents depend on manual prompts; fallback behavior is instruction-driven (e.g., Spec Agent defaults to current branch when target not supplied).

### Branch and Issue Parameter Usage
* Behavior summary: Target branch strings anchor artifact paths and branch derivatives; Stage 02 introduces `<target_branch>_plan`, Stage 03 enforces `_phaseN` naming, Documenter expects `_docs`, and PR agent works directly on `<target_branch>` to `main`.
* Entry triggers / interactions (conceptual): Planning commits target the `_plan` branch, implementation phases create `_phase` branches, documentation opens `_docs` PR, and final PR merges the target branch.
* Data concepts (entities & purposes): Target branch (base namespace), planning branch, phase branches (single or range suffix), docs branch, and final PR branch; issue references appear as URLs in Spec prompts and as `#` numbers in Status prompts.
* Config / flags influencing behavior: Branch naming rules are descriptive within chatmode instructions; no automated derivation occurs beyond string concatenation guidance.

### Parameter Requirements, Defaults, and Validation
* Behavior summary: Prompts treat target branch, issue reference, and artifact paths as required context when present; agents tolerate missing values by asking for them or inferring from environment; no validation step enforces format or presence.
* Entry triggers / interactions (conceptual): If a parameter is omitted from the prompt, chatmode instructions tell the agent to request it; conversely, prompts supply them explicitly to avoid back-and-forth.
* Data concepts (entities & purposes): Required parameters—target branch (for all stages), issue reference (Spec, Spec Research, Status), ImplementationPlan path (Implementation, Documenter, PR), artifact list (PR); optional convenience parameters include "Additional Inputs" and hints like "last commit".
* Config / flags influencing behavior: Default behaviors rely on instructions (e.g., assume current branch, skip research if user directs); there are no regex checks, schema validation, or precedence rules for conflicting values.

### Inter-Stage Parameter Flow and Dynamics
* Behavior summary: Stage outputs create inputs for later stages—Spec stage generates `spec-research.prompt.md` and `Spec.md`; Spec Research answers feed Spec; Code Research references Spec artifacts; Implementation Plan consumes all prior artifacts and introduces phase counts; Implementation phases update plan checkboxes and produce PR numbers; Documenter confirms plan completion and adds Docs artifact; Status agent reads ImplementationPlan to infer phase count; PR agent verifies presence of all artifacts and merged branches.
* Entry triggers / interactions (conceptual): Completion of each stage unlocks the next by producing canonical Markdown files and branch updates that subsequent agents read.
* Data concepts (entities & purposes): Artifacts (`Spec.md`, `SpecResearch.md`, `CodeResearch.md`, `ImplementationPlan.md`, `Docs.md`), PR identifiers, phase status markers, and issue comments form the inter-stage data flow.
* Config / flags influencing behavior: Dynamic elements are housed inside artifacts (e.g., checked boxes, phase status timestamps); no automated system propagates them—agents reread documents each run.

## Endpoints/CLIs/Jobs (if applicable)
* Agents reference standard git commands (`git branch --show-current`, `git checkout -b`, `git pull`) conceptually for branch discovery and management, and rely on GitHub MCP tools for Issue/PR data; there are no custom endpoints or jobs defined for parameter handling.

## Cross-cutting
* Auth, errors, retries, observability (behavioral notes only): Workflow assumes manual GitHub authentication via MCP tools and VS Code environment; no retry/observability mechanisms exist around parameter usage, and error handling defaults to agents asking the user for missing context.

## Open Unknowns
* None – repository artifacts answer every internal question from the prompt.

## User-Provided External Knowledge (Manual Fill)
* [ ] Configuration File Best Practices: What are established best practices for Markdown-based configuration or parameter files in AI/LLM agent systems?
* [ ] Parameter Precedence Patterns: What are common patterns for configuration precedence (file vs inline vs defaults) in development workflows?
* [ ] Validation Standards: Are there standards or common patterns for validating structured data in Markdown files?
* [ ] User Experience Considerations: What UX patterns make parameter files easy to understand and maintain for developers?
