# PAW v2 Scope & Non-Goals

**Status**: Draft  
**Created**: 2025-12-21  
**Last Updated**: 2025-12-21 (reviewed against Issue #153, #155)  
**Purpose**: Define the boundary between "v2 Must Have" and "Deferred" to prevent scope drift in subsequent decisions.

---

## Guiding Principles

1. **VS Code + GitHub Copilot first** — v2 is optimized for this runtime; other runtimes are future work.
2. **Skills-first architecture** — Lean into Agent Skills spec for future portability, but don't require portability now.
3. **Single agent, multiple skills** — Replace 15 agents with 1 PAW agent that dynamically loads skills.
4. **Subagent delegation** — Research and review activities run as subagents, not manual handoffs.
5. **Artifacts remain local** — `.paw/work/<id>/` structure unchanged; skills write artifacts directly.
6. **Progressive disclosure** — Only load detailed phase/role instructions when needed (reduces base prompt tokens).

---

## V2 Must Have

| Capability | Description | Validation Criteria |
|------------|-------------|---------------------|
| **Single PAW Agent** | One top-level agent replaces 15 specialized agents. Agent provides orchestration awareness; skills provide stage-specific instructions. | Installing extension installs exactly 1 agent file + tools. |
| **Skills Architecture** | Workflow skills (Spec, Planning, Implementation, Docs, PR, Review) + Capability skills (Code Research, Spec Research, Review Heuristics, Artifact Conventions). Skills follow Agent Skills spec format (SKILL.md + YAML frontmatter). | `paw_list_skills` returns catalog; `paw_get_skill` returns full content. |
| **Subagent Orchestration** | Workflow skills invoke subagents for bounded research/review tasks. Subagents write artifacts directly and return (path, summary, status). No "phase chopping" — research happens within parent conversation. Subagents load skills via `paw_get_skill` since VS Code subagents can't be invoked with custom agent definitions. | Spec workflow spawns Spec Research subagent; Planning workflow spawns Code Research subagent(s). |
| **Skills Catalog + Loading** | New tools: `paw_list_skills` discovers skills from: built-in → workspace → work-item → user (precedence order). `paw_get_skill` retrieves full instruction document. System skills via tool; custom skills via file path reference. | Catalog includes id, name, description, source, path. |
| **Prompt Commands** | User-initiated verbs as prompt files: `paw-spec`, `paw-plan`, `paw-implement`, `paw-docs`, `paw-pr`, `paw-review`, `paw-status`. Each invokes PAW agent and loads corresponding workflow skill. | User can run `/paw-spec` to start spec workflow. |
| **Handoff + Context Reset** | Stage transitions open new chat with fresh context. Handoff modes (manual/semi-auto/auto) preserved. New chat can invoke prompt command as first message. | Semi-auto pauses at decision points; auto continues through routine transitions (requires local review strategy). |
| **Custom Instructions Precedence** | Workspace > User > Defaults. Existing `.paw/instructions/` and `~/.paw/instructions/` locations unchanged. File naming: `<agent-name>-instructions.md`. | Custom instructions override defaults; workspace overrides user. |
| **Artifact Compatibility** | Existing `.paw/work/<id>/` structure, artifact names, and WorkflowContext.md format unchanged. Work ID validation: lowercase letters, numbers, hyphens only. | Existing v1 work items discoverable by v2. |
| **Review Workflow Migration** | PAW-R* agents become Review workflow skill + review capability skills. Artifacts at `.paw/reviews/PR-<number>/` (not under work/). Includes: ReviewContext.md, CodeResearch.md, DerivedSpec.md, ImpactAnalysis.md, GapAnalysis.md, ReviewComments.md. | `paw-review` command initiates review workflow. |
| **User-Level Install** | Default: agent + skills installed to user directories; available in any workspace. Extension provides system-wide PAW. Note: VS Code skills are workspace-scoped only; user-level works because we use agent + dynamic tool-based skill loading. | No workspace setup required to use PAW. |
| **Cross-Cutting Skill Reuse** | Extract shared patterns as capability skills: PR review response handling, workflow completion validation, artifact discovery, evidence-based guardrails. | Review heuristics reusable by multiple workflow skills. |

---

## Explicit Non-Goals (V2 Scope Boundary)

Per Issue #153, v2 explicitly excludes:
- Not making PAW fully cross-IDE in this change (MCP-only, standalone CLI)
- Not redesigning UI/UX beyond what's required to replace multi-agent selection with single agent + commands/prompts
- Not guaranteeing model-level instruction priority changes; will design mitigation strategies instead

---

## Deferred (Post-V2)

| Capability | Reason for Deferral | Future Consideration |
|------------|--------------------|--------------------|
| **Multi-Runtime Portability** | V2 is VS Code-first; Claude Code, Codex, GitHub Coding Agent support requires runtime abstraction we don't have yet. | Skills spec alignment enables future portability. |
| **Workspace Export / Install Mode** | Optional "export PAW to workspace" (`.github/skills/`, `.github/agents/`) adds complexity. System-wide install covers primary use case. | Enables GitHub Coding Agent visibility when ready. |
| **Design Workflow** | New workflow (constraint discovery, trade-off analysis, scope cutting). Good proving ground, but not required for v2 launch. | Use as spike to validate skills architecture. |
| **Per-Skill `allowed-tools` Constraints** | Agent Skills spec has experimental `allowed-tools` field. Security/scoping value unclear; adds complexity. | Revisit if security concerns emerge. |
| **Skill Aliasing / Renaming** | Same-name skills override by precedence; no aliasing mechanism. Simplifies v2 catalog logic. | May add if user customization patterns demand it. |
| **Non-GitHub PR Workflows** | Azure DevOps work item URLs supported; but PR workflows assume GitHub. | ADO PR integration is separate feature. |
| **Workspace-Only Mode (No Extension)** | Running PAW without extension requires replacing tools with skill-only equivalents. Complex; low demand. | Skills-first architecture enables this path. |
| **Cross-Workspace Work Items** | Work items are workspace-scoped. Multi-repo orchestration is a different problem. | PAW-M* agents exist but are niche. |

---

## Validation Against Issue #153 Goals

| Goal | V2 Coverage | Notes |
|------|-------------|-------|
| **G1: Reduce installed agents to one** | ✅ Must Have | Single PAW agent replaces 15. |
| **G2: Progressive disclosure** | ✅ Must Have | Only load detailed phase/role instructions when needed via `paw_get_skill`. |
| **G3: Improve composability** | ✅ Must Have | Cross-cutting skills (review heuristics, PR handling) reusable by any phase. |
| **G4: Enable better subagent usage** | ✅ Must Have | Subagents load skills via tool calls, compatible with Copilot constraints. |
| **G5: Preserve artifact-driven workflow** | ✅ Must Have | Spec/research/plan/review artifacts unchanged; handoffs preserved. |

### Issue #153 Success Metrics (for v2 validation)

1. Installed custom agent count reduced from 15 to 1
2. Prompt duplication reduced (measured by total token count across shipped prompts/skills)
3. Cross-cutting skills reuse increases (e.g., review heuristics reused by multiple phases)
4. Reduced installation/migration code complexity

---

## Agent → V2 Mapping (Reference)

| V1 Agent | V2 Home | Type | Subagent? |
|----------|---------|------|-----------|
| PAW-01A Specification | Spec Workflow Skill | Workflow | No |
| PAW-01B Spec Researcher | Spec Research Skill | Capability | **Yes** |
| PAW-02A Code Researcher | Code Research Skill | Capability | **Yes** |
| PAW-02B Impl Planner | Planning Workflow Skill | Workflow | No |
| PAW-03A Implementer | Implementation Workflow Skill | Workflow | No |
| PAW-03B Impl Reviewer | Implementation Review Skill | Capability | **Yes** |
| PAW-04 Documenter | Docs Workflow Skill | Workflow | No |
| PAW-05 PR | PR Workflow Skill | Workflow | No |
| PAW-R1A Understanding | Review Workflow Skill | Workflow | No |
| PAW-R1B Baseline Researcher | Baseline Research Skill | Capability | **Yes** |
| PAW-R2A Impact Analyzer | Impact Analysis Skill | Workflow | No |
| PAW-R2B Gap Analyzer | Gap Analysis Skill | Workflow | No |
| PAW-R3A Feedback Generator | Feedback Workflow Skill | Workflow | No |
| PAW-R3B Feedback Critic | Feedback Critic Skill | Capability | **Yes** |
| PAW-X Status | Status Command + Skills | Cross-cutting | No |

---

## Open Questions (To Resolve in Go-Do 2+)

1. **Taxonomy clarity**: Is "Workflow Skill" vs "Capability Skill" the right split, or should we use different names?
2. **Skill nesting**: Can a workflow skill invoke another workflow skill, or only capability skills?
3. **Subagent contract**: What exactly does a subagent return? File path + summary + status? JSON? Markdown section?
4. **Prompt command invocation**: Can handoff reliably invoke a prompt command as the first message in a new chat?
5. **Skills catalog format**: JSON vs YAML vs tool-specific format?
6. **Skill naming conventions**: Agent Skills spec requires lowercase + hyphens, directory name = `name` field. How do we map v1 agent names (e.g., "PAW-01A Specification") to valid skill names (e.g., "paw-spec-workflow")?
7. **SKILL.md size limits**: Agent Skills spec recommends <500 lines, <5000 tokens for main body. Do current agents fit? Need measurement pass.
8. **Custom agent in subagent approach**: VS Code has experimental `chat.customAgentInSubagent.enabled` setting that allows subagents to use custom agents directly (see Appendix D). Should v2 rely on this, or continue with "subagent loads skill via tool" pattern? Trade-offs:
   - **Custom agent approach**: Cleaner mental model (subagent *is* the specialized agent), but requires experimental feature flag and agent's `infer` property must not be `false`.
   - **Skill loading approach**: Works today without feature flags, more portable, but subagent is a generic agent that loads instructions dynamically.

---

## Identified Risks & Mitigations (from Issue #153)

| Risk | Mitigation |
|------|------------|
| **R1**: Tool-loaded instructions followed less strictly than system prompts | Re-load workflow skill at start of each major step; use "pinned context" pattern |
| **R2**: Skills feel "optional" to the agent | Use "workflow" terminology for required behavior; enforce artifact generation cites active workflow |
| **R3**: Increased complexity in state inference | Make workflow state explicit in context files |
| **R4**: Prompt quality regression during conversion | Start 1:1 conversion; quality gate checklist; iterate on failures |

---

## Migration Strategy (from Issue #153)

Stepwise migration to minimize regression risk:

1. **Introduce skills infrastructure** while keeping existing agents
2. **Convert one phase to skills** and spike to evaluate (Design workflow per Issue #155)
3. **Add single PAW agent** and route workflow initiation
4. **Convert remaining phases** (Spec → Planning → Implementation → Review → Docs → PR)
5. **Deprecate multi-agent installation**, keep compatibility shims for one release

---

## Next Steps

1. ✅ Go-Do 1: This document (scope boundary)
2. → Go-Do 2: Define v2 control plane (agent vs skills vs tools vs prompt-commands taxonomy)
3. → Go-Do 3: Pick install + distribution model (filesystem layout)
4. → Go-Do 4: Lock skills catalog + loading rules

---

## Appendix A: Agent Skills Spec Constraints

Key constraints from https://agentskills.io/specification that v2 must satisfy:

| Constraint | Requirement |
|------------|-------------|
| **Naming** | 1-64 chars, lowercase alphanumeric + hyphens only, no leading/trailing/consecutive hyphens |
| **Directory structure** | `skill-name/SKILL.md` where directory name = `name` field |
| **Required fields** | `name`, `description` (1-1024 chars) |
| **Optional fields** | `license`, `compatibility`, `metadata`, `allowed-tools` (experimental) |
| **Size guidance** | <500 lines, <5000 tokens for main body; move details to referenced files |
| **File references** | Relative paths from skill root, one level deep recommended |

**VS Code discovery locations** (workspace-scoped only):
- `.github/skills/` (recommended)
- `.claude/skills/` (legacy)

**Critical limitation**: VS Code does NOT support user-level skills. PAW v2 works around this via agent + dynamic tool-based skill loading.

---

## Appendix B: V1 Artifact Structure (for compatibility validation)

### Implementation Workflow (`.paw/work/<work-id>/`)

| Artifact | Purpose |
|----------|---------|
| `WorkflowContext.md` | Centralized parameters (required) |
| `Spec.md` | Specification document |
| `SpecResearch.md` | System behavior research |
| `CodeResearch.md` | Codebase analysis |
| `ImplementationPlan.md` | Phased implementation plan |
| `Docs.md` | Documentation |
| `prompts/*.prompt.md` | Generated research/handoff prompts |

### Review Workflow (`.paw/reviews/PR-<number>/`)

| Artifact | Purpose |
|----------|---------|
| `ReviewContext.md` | Authoritative parameter source |
| `CodeResearch.md` | Pre-change baseline understanding |
| `DerivedSpec.md` | Reverse-engineered specification |
| `ImpactAnalysis.md` | System-wide effects analysis |
| `GapAnalysis.md` | Categorized findings (Must/Should/Could) |
| `ReviewComments.md` | Complete feedback with rationale/assessment |

### WorkflowContext.md Fields

- Work Title
- Feature Slug (work-id)
- Target Branch
- Workflow Mode (full/minimal)
- Review Strategy (local/prs)
- Handoff Mode (manual/semi-auto/auto)

---

## Appendix C: Issue #155 — Design Workflow Spike

Issue #155 proposes using a **Design Workflow** as the proving ground for skills architecture:

**Why Design Workflow first:**
- Greenfield — no regression risk to existing workflows
- Exercises workflow skill → activity skills composition
- Provides immediate user value (iterative design exploration)
- Foundation for later migrating implementation/review workflows

**Proposed Design Activity Skills:**
- Constraint Discovery
- Alternative Exploration  
- Trade-off Analysis
- Scope Cutting ("smallest coherent system")

**Relationship to v2**: Issue #155 implements #153's architecture in a controlled, non-throwaway way. Success criteria include: correct artifact shape, comparable content quality, correct handoff behavior, no repeated instruction-ignoring failures.

**Decision**: Design Workflow is in "Deferred" because it's a new workflow, not migration of existing. However, it's the recommended first spike to validate the skills architecture before migrating Implementation/Review workflows.

---

## Appendix D: Custom Agents in Subagents (Experimental)

VS Code has an **experimental feature** that allows subagents to use custom agents directly, rather than inheriting the parent agent.

### How to Enable

1. Enable the setting: `chat.customAgentInSubagent.enabled`
2. Ensure the custom agent's `infer` property is NOT set to `false` (agents with `infer: false` cannot be used as subagents)

### Usage

Once enabled, you can prompt the AI to use a specific custom agent in a subagent:
- "Run the research agent as a subagent to research the best auth methods for this project."
- "Use the plan agent in a subagent to create an implementation plan for myfeature."

You can also ask "Which subagents can you use?" to see available agents.

### PAW v2 Implications

Two approaches are possible for subagent orchestration:

| Approach | Pros | Cons |
|----------|------|------|
| **Custom agent subagent** (experimental) | Cleaner mental model—subagent *is* the specialized agent; agent instructions are first-class | Requires experimental feature flag; agent must have `infer: true`; less portable |
| **Generic subagent + skill loading** | Works without feature flags; more portable; skills are the unit of composition | Subagent is generic, loads skill via `paw_get_skill` tool; extra tool call overhead |

**Current v2 recommendation**: Use the skill loading approach for v2 launch (no dependency on experimental features). Revisit when `chat.customAgentInSubagent.enabled` graduates from experimental.

**Open question**: If v2 keeps 15 agent files (as subagent targets) alongside the single PAW orchestrator agent, would this provide a migration path? Trade-off is installation complexity vs cleaner subagent UX.
