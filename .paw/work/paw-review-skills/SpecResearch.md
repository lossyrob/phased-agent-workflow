# Spec Research: PAW Review Skills

## Summary

The current PAW Review workflow consists of 6 agents (R1A, R1B, R2A, R2B, R3A, R3B) that execute in sequence with a human-controlled handoff at each stage. Each agent produces specific artifacts, with the workflow progressing from Understanding → Evaluation → Feedback Generation. The agent installer (`installer.ts`) installs agent `.agent.md` files to the VS Code prompts directory but currently does not support prompt files (`.prompt.md`). Cross-repo differentiation analysis reveals that most agent logic is generic, with limited references to workspace root assumptions. The Agent Skills specification defines a clear YAML frontmatter schema with `name` and `description` as required fields, and VS Code supports skills via `.github/skills/` directories with progressive disclosure loading.

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

## Research Findings

### Current Review Agent Analysis

#### 1. Review workflow sequence

**Question:** What is the exact sequence of agents in the current review workflow? Document the flow including any loops or conditional branches.

**Answer:** The workflow follows this sequence:

```
R1A (Understanding) → R1B (Baseline Researcher) → R1A (Understanding, resumed) → R2A (Impact Analyzer) → R2B (Gap Analyzer) → R3A (Feedback Generator) → R3B (Feedback Critic)
```

The key flow characteristic is that R1A has a **pause-and-resume pattern**:
1. R1A creates ReviewContext.md and generates the research prompt
2. R1A pauses and signals human to invoke R1B
3. R1B analyzes the codebase at base commit and creates CodeResearch.md
4. R1A resumes (detects CodeResearch.md exists) and completes DerivedSpec.md
5. Sequential progression through R2A → R2B → R3A → R3B

There are no loops in the workflow. The only conditional branch is R1A's start logic which checks for existing artifacts to determine resumption state.

**Evidence:** `paw-review-specification.md` (Stage R1 — Understanding section), PAW-R1A Understanding.agent.md (Start / Initial Response section shows artifact detection logic)

**Implications:** The workflow skill will need to handle the R1A-R1B-R1A interaction pattern, which differs from a simple linear sequence.

---

#### 2. Agent responsibilities by artifact

**Question:** For each PAW-R* agent, what artifact(s) does it produce? What inputs does it require?

**Answer:**

| Agent | Inputs | Outputs |
|-------|--------|---------|
| **PAW-R1A Understanding** | PR URL/number or base branch name | `ReviewContext.md`, `prompts/01B-code-research.prompt.md`, `DerivedSpec.md` |
| **PAW-R1B Baseline Researcher** | ReviewContext.md, research prompt | `CodeResearch.md` (also updates ReviewContext.md with artifact reference) |
| **PAW-R2A Impact Analyzer** | ReviewContext.md, CodeResearch.md, DerivedSpec.md | `ImpactAnalysis.md` |
| **PAW-R2B Gap Analyzer** | ReviewContext.md, CodeResearch.md, DerivedSpec.md, ImpactAnalysis.md | `GapAnalysis.md` |
| **PAW-R3A Feedback Generator** | All prior artifacts (ReviewContext, CodeResearch, DerivedSpec, ImpactAnalysis, GapAnalysis) | `ReviewComments.md`, GitHub pending review (if GitHub context) |
| **PAW-R3B Feedback Critic** | ReviewComments.md, all prior artifacts | Adds Assessment sections to ReviewComments.md |

**Artifact dependency graph:**
```
ReviewContext.md (R1A)
       │
       ├──> prompts/01B-code-research.prompt.md (R1A)
       │           │
       │           └──> CodeResearch.md (R1B)
       │                      │
       │                      └──> DerivedSpec.md (R1A, resumed)
       │                                  │
       │                                  ├──> ImpactAnalysis.md (R2A)
       │                                  │           │
       │                                  │           └──> GapAnalysis.md (R2B)
       │                                  │                      │
       │                                  │                      └──> ReviewComments.md (R3A)
       │                                  │                                  │
       │                                  │                                  └──> ReviewComments.md + assessments (R3B)
       └──────────────────────────────────┴──────────────────────────────────┘
                                          All artifacts flow forward
```

**Evidence:** PAW-R* agent files document inputs/outputs in their headers and process steps.

---

#### 3. Cross-repo differentiation analysis

**Question:** Analyze each PAW-R* agent's prompt content. Identify any instructions or logic that would need to differ between single-repo and multi-repo review.

**Answer:** After analyzing all 6 agent files, the cross-repo differentiation requirements are minimal:

| Agent | Single-repo vs Multi-repo Differences | Key References |
|-------|--------------------------------------|----------------|
| **PAW-R1A Understanding** | Uses `ReviewContext.md` artifact paths; references "workspace root" implicitly via `.paw/reviews/` path. GitHub MCP tool usage assumes single PR context. | "Repository: owner/repo OR local" in template |
| **PAW-R1B Baseline Researcher** | Checkouts base commit, assumes single repo. Path to artifact directory from ReviewContext.md. | `git checkout <base-commit-sha>`, artifact paths |
| **PAW-R2A Impact Analyzer** | Searches codebase for imports/exports - scope implicitly workspace-wide. No explicit single-PR assumptions. | "Search for files that import modified modules" |
| **PAW-R2B Gap Analyzer** | Coverage analysis checks workspace test files. No explicit single-repo assumptions. | References to coverage reports at standard paths |
| **PAW-R3A Feedback Generator** | GitHub MCP calls assume single PR (`pullNumber`). Pending review creation is PR-scoped. | `mcp_github_pull_request_review_write`, `mcp_github_add_comment_to_pending_review` |
| **PAW-R3B Feedback Critic** | Operates on ReviewComments.md only - no repo-specific logic. | Local-only assessment additions |

**Cross-repo considerations identified:**
1. **Artifact path structure**: Currently `.paw/reviews/PR-<number>/` assumes single PR. Multi-repo would need `.paw/reviews/<workspace-slug>/` or similar.
2. **GitHub MCP usage in R3A**: `mcp_github_add_comment_to_pending_review` takes single `pullNumber` parameter. Multi-PR would need iteration or aggregation strategy.
3. **Base commit checkout in R1B**: Would need to handle multiple repos, potentially checking out different commits per directory.
4. **PR metadata in R1A**: `mcp_github_pull_request_read` fetches single PR. Multi-PR would need to gather metadata for each.

**Key finding:** Most agent logic is generic. The main differentiation points are:
- Entry parameters (single PR vs list of PRs)
- Artifact directory structure
- GitHub API interactions in R3A for posting comments

**Evidence:** Agent file analysis, particularly GitHub MCP tool parameters in R1A and R3A.

**Implications:** A cross-repo workflow skill could orchestrate the same activity skills with modified parameters, rather than requiring separate activity skill variants.

---

#### 4. Handoff patterns

**Question:** How do current review agents hand off to each other? What information is passed between stages?

**Answer:** Current review agents use **artifact-based state passing** with **human-controlled handoffs**:

**Handoff mechanism:**
- Each agent presents a handoff message with next-step options
- Human invokes the next agent manually (e.g., "continue", "understanding", "status")
- State is passed entirely via artifacts on disk in `.paw/reviews/<identifier>/`
- No in-memory state transfer; each agent reads artifacts fresh

**Information passed:**
1. **ReviewContext.md**: Authoritative parameter source read by all downstream agents
2. **Artifact files**: Each agent reads prior artifacts and produces new ones
3. **Artifact path**: Derived from ReviewContext.md's `Artifact Paths` field

**Example handoff messages from agents:**

- R1A (after creating research prompt): "Please invoke PAW Review Baseline Researcher"
- R1B: "Return to Understanding Agent to complete DerivedSpec.md"
- R2A/R2B/R3A: Standard "Next Steps:" format with command options
- R3B: Terminal stage, presents "Review comments in GitHub UI"

**Evidence:** Agent handoff sections in each PAW-R* agent file, paw-review-specification.md "Human Workflow" sections.

**Implications:** The skills-based workflow can maintain artifact-based state passing. The parent agent receives file paths from subagent completion messages rather than artifact content directly (per initial notes decision).

---

### Agent Installation Mechanism

#### 5. Current installer behavior

**Question:** How does `src/agents/installer.ts` currently install agent files? What directory does it target?

**Answer:** The installer:

1. **Determines prompts directory** via `resolvePromptsDirectory()`:
   - Uses platform detection (`getPlatformInfo()`) to find VS Code prompts path
   - Supports custom override via `paw.promptDirectory` configuration
   - Targets platform-specific paths (e.g., `~/.vscode/prompts` on Linux)

2. **Loads agent templates** via `loadAgentTemplates()`:
   - Reads all `.agent.md` files from extension's `agents/` directory
   - Processes component templates (expands `{{COMPONENT_NAME}}` references)
   - Extracts metadata from YAML frontmatter

3. **Installation logic**:
   - Creates prompts directory if needed (`fs.mkdirSync` recursive)
   - Cleans up previous installation when version changes
   - Writes each agent file to prompts directory (`fs.writeFileSync`)
   - Tracks installed files in globalState for cleanup/repair

4. **Version tracking**:
   - Stores `InstallationState` with version, filesInstalled, timestamp
   - Reinstalls on version change or when files are missing (repair)
   - Development builds (version contains `-dev`) always reinstall

**Evidence:** `src/agents/installer.ts` lines 1-467

---

#### 6. Prompt file installation

**Question:** Does the current installer support installing prompt files (`.prompt.md`)?

**Answer:** No, the current installer does **not** support prompt files:

1. **File filter**: `loadAgentTemplates()` only processes `.agent.md` files:
   ```typescript
   if (!file.toLowerCase().endsWith('.agent.md')) {
     continue;
   }
   ```

2. **Template pattern**: Only files from `agents/` directory are loaded; no support for separate prompt files

**What would be required to add prompt file support:**

1. **New template loader**: Add `loadPromptTemplates()` function to load `.prompt.md` files from a `prompts/` directory in the extension
2. **Installation target**: Prompt files would be installed to the same prompts directory as agents
3. **Tracking**: Add to `InstallationState.filesInstalled` array for cleanup

**Prompt file installation location:**
- Same directory as agent files: `~/.vscode/prompts/` (or platform equivalent)
- VS Code discovers prompt files in this directory and shows them as slash commands
- Format: Standard markdown with YAML frontmatter

**Evidence:** `src/agents/installer.ts` lines 137-152 (file filter), `src/agents/agentTemplates.ts` lines 122-154

---

### Subagent Execution

#### 7. Subagent tool access

**Question:** When a subagent is spawned via `runSubagent`, does it have access to tools like `paw_get_skill`?

**Answer:** Based on the system prompt documentation for `runSubagent`:

- Subagents operate in a **stateless invocation** context
- "Each agent invocation is stateless. You will not be able to send additional messages to the agent"
- The tool description states "The agent's outputs should generally be trusted"

**Tool access implications:**
- Subagents should have access to the same tools as the parent agent (they run in the same VS Code extension context)
- The `paw_get_skill` and `paw_get_skills` tools would be registered at extension level and available to all agents
- No documented limitations on tool access in subagent contexts

**Evidence:** System prompt `runSubagent` tool description in the conversation context.

**Implications:** The workflow skill can instruct subagents to load their activity skills via `paw_get_skill`. This is the expected execution pattern per the initial notes.

---

#### 8. Subagent return contract

**Question:** What is the expected format for subagent responses?

**Answer:** From the `runSubagent` tool description:

- "When the agent is done, it will return a single message back to you"
- "The result returned by the agent is not visible to the user"
- "Your prompt should contain...exactly what information the agent should return back to you in its final and only message"

**Expected contract for activity skills:**
- Subagent should return confirmation of completed work
- Include artifact file path(s) written
- Brief status summary
- The parent agent would parse this response to determine completion

**Example expected response format:**
```
Activity complete.
Artifact saved: .paw/reviews/PR-123/ImpactAnalysis.md
Status: Success
```

**Evidence:** `runSubagent` tool description.

**Implications:** Each activity skill should specify the response format expected by the workflow skill. The workflow skill needs to handle parsing subagent responses to track progress.

---

### Skills Integration

#### 9. Skill metadata extraction

**Question:** How should `paw_get_skills` extract metadata from SKILL.md files?

**Answer:** Based on the Agent Skills specification:

**Required frontmatter fields:**
- `name` (1-64 chars, lowercase alphanumeric + hyphens)
- `description` (1-1024 chars)

**Optional fields to include in catalog:**
- `metadata` (arbitrary key-value map - can include `type: workflow` or `type: activity`)
- `license`
- `compatibility`
- `allowed-tools` (experimental)

**Catalog response structure (~100 tokens per skill):**
```typescript
interface SkillCatalogEntry {
  name: string;           // Required: from frontmatter
  description: string;    // Required: from frontmatter
  type?: string;         // From metadata.type if present
  metadata?: Record<string, string>; // Full metadata map if present
  source: 'builtin' | 'workspace' | 'user'; // Origin indicator
}
```

**Parsing approach:**
1. Find `---` delimiters marking frontmatter
2. Parse YAML between delimiters
3. Extract required fields (`name`, `description`)
4. Include optional fields if present
5. Return catalog array without body content

**Evidence:** https://agentskills.io/specification (frontmatter specification), initial notes (metadata.type for skill type distinction)

---

#### 10. Skill location

**Question:** Where should built-in skills be stored in the extension source?

**Answer:** Based on existing patterns and bundling requirements:

**Recommended location:** `skills/` directory at repository root

**Rationale:**
1. **Parallel to existing patterns**: `agents/` directory is at repo root and bundled
2. **Extension bundling**: Files in extension root are included in VSIX package
3. **Runtime accessibility**: Extension can read via `vscode.Uri.joinPath(extensionUri, 'skills')`

**File structure:**
```
skills/
├── paw-review-workflow/
│   └── SKILL.md
├── paw-review-understanding/
│   └── SKILL.md
├── paw-review-baseline/
│   └── SKILL.md
├── paw-review-impact/
│   └── SKILL.md
├── paw-review-gap/
│   └── SKILL.md
├── paw-review-feedback/
│   └── SKILL.md
└── paw-review-critic/
    └── SKILL.md
```

**Tool implementation:**
- `paw_get_skills`: Lists skill directories, parses frontmatter from each SKILL.md
- `paw_get_skill`: Returns full SKILL.md content for specified skill name

**Evidence:** `src/agents/agentTemplates.ts` (uses `vscode.Uri.joinPath(extensionUri, 'agents')` pattern), initial notes (file structure section)

---

### Other Research

#### 11. Agent Skills YAML frontmatter schema

**Question:** What is the exact YAML frontmatter schema for SKILL.md files?

**Answer:** From https://agentskills.io/specification:

**Required fields:**
| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | 1-64 chars, lowercase alphanumeric + hyphens, must match directory name |
| `description` | Yes | 1-1024 chars, describes what skill does and when to use it |

**Optional fields:**
| Field | Constraints |
|-------|-------------|
| `license` | License name or reference to bundled file |
| `compatibility` | 1-500 chars, environment requirements |
| `metadata` | Map of string keys to string values |
| `allowed-tools` | Space-delimited list of pre-approved tools (experimental) |

**Example with all fields:**
```yaml
---
name: paw-review-workflow
description: Orchestrates the PAW Review workflow, running activity skills as subagents to analyze PRs and generate review comments.
license: MIT
metadata:
  type: workflow
  version: "1.0"
---
```

**Evidence:** https://agentskills.io/specification

---

#### 12. VS Code skill support

**Question:** How does VS Code's native skill support handle skill discovery and loading?

**Answer:** From https://code.visualstudio.com/docs/copilot/customization/agent-skills:

**Skill locations:**
- **Project skills**: `.github/skills/` (recommended) or `.claude/skills/` (legacy)
- **Personal skills**: `~/.copilot/skills/` (recommended) or `~/.claude/skills/` (legacy)

**Discovery mechanism:**
- VS Code reads `name` and `description` from frontmatter at startup
- Skills are automatically activated based on prompt matching (no manual selection)

**Progressive disclosure loading:**
1. **Level 1 - Discovery**: `name` and `description` loaded for all skills (~100 tokens)
2. **Level 2 - Instructions**: Full SKILL.md body loaded when skill activated
3. **Level 3 - Resources**: Additional files (`scripts/`, `references/`, `assets/`) loaded on demand

**Key constraint identified:**
- VS Code native skills are **workspace-scoped** (require files in project directory)
- No built-in distribution mechanism beyond copying to `.github/skills/`
- This is why PAW uses tools-based approach (`paw_get_skills`, `paw_get_skill`) for extension-bundled skills

**Evidence:** https://code.visualstudio.com/docs/copilot/customization/agent-skills, initial notes (distribution mechanism decision)

---

## Open Unknowns

1. **Cross-repo artifact directory structure**: The exact directory naming convention for multi-repo reviews (e.g., `.paw/reviews/<workspace-slug>/`) needs design decision. Current single-repo pattern uses PR number or branch slug.

2. **Multi-PR comment aggregation**: When reviewing multiple PRs, should comments be posted to each PR separately or aggregated somehow? The GitHub MCP tools work per-PR.

---

## User-Provided External Knowledge (Manual Fill)

*No external/context questions were included in the research prompt.*
