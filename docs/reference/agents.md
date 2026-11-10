# Agents and Skills Reference

PAW ships two agents and a set of skills. The agents are thin wrappers: each loads one workflow skill, and the skill holds the rules.

> **Platform runtime note:** Copilot CLI runs the installed `agents/` and `skills/` directly. The VS Code extension contributes the same agents and skills and adds commands in `src/` (initialization, status, stop tracking); that TypeScript does not run in CLI sessions.

## Agents

| Agent | Loads | Use for |
|-------|-------|---------|
| **PAW** | `paw-workflow` | Starting, continuing or changing an implementation work item. Status, "about PAW" and "how do I get started?" questions go to `paw-status` |
| **PAW-Review** | `paw-review-workflow` | Significant, thorough reviews of a pull request or branch |

### Starting an Agent

**Copilot CLI:**

```bash
copilot --agent PAW
copilot --agent PAW-Review
```

Or use `/agent` inside a session.

**VS Code (Copilot Chat):**

| Workflow | Command | Prompt |
|----------|---------|--------|
| Implementation | `PAW: New PAW Workflow` | `/paw` |
| Review | — | `/paw-review <PR>` |
| Status | `PAW: Get Work Status` | — |

`/paw` and `/paw-review` are VS Code prompt files.

### Routing Within the PAW Agent

- "What is PAW?" or "How do I get started?" → `paw-status` skill
- "What's the status?", "list my work items", "what presets are available?" → `paw-status` skill
- "Go back to the plan", "redo unit 2" → the rewind procedure in `paw-workflow`
- Anything else about a work item → `paw-workflow`

## Implementation Skills

| Skill | Purpose |
|-------|---------|
| `paw-workflow` | The implementation workflow: host rules, todo graph, delegation and acceptance. Its `references/` hold the [configuration](../guide/workflow-presets.md), review providers, presets, one brief per activity (specify, research, plan, implement, review) and the procedures (git, final PR, resume, rewind), plus the reader for v1 `WorkflowContext.md` files |
| `paw-lite` | Loads `paw-workflow` with the `lite` preset |
| `paw-rewind` | Loads `paw-workflow` and follows its rewind procedure; never resets history |
| `paw-status` | Read-only status of work items, the preset list, and "about PAW" answers; posts updates to issues or PRs only when asked |
| `paw-work-shaping` | Interactive Q&A that turns a vague idea into `WorkShaping.md`; runs in the host session |
| `paw-sot` | The [society-of-thought](../guide/society-of-thought-review.md) review engine, shared by both workflows |
| `paw-docs-guidance` | Conventions for `Docs.md` and project documentation updates, when a plan calls for them |

The activities (specify, research, plan, implement, review) are not separate skills. The host starts each one as a subagent and points it at its brief under `paw-workflow/references/activities/`.

## Review Skills

| Skill | Stage | Output |
|-------|-------|--------|
| `paw-review-workflow` | Host | Todo graph, preflight, delegation, society-of-thought, posting |
| `paw-review-understanding` | Understanding | `ReviewContext.md`, `ResearchQuestions.md`, then `DerivedSpec.md` |
| `paw-review-baseline` | Understanding | `CodeResearch.md` |
| `paw-review-impact` | Evaluation (single-model) | `ImpactAnalysis.md` |
| `paw-review-gap` | Evaluation (single-model) | `GapAnalysis.md` |
| `paw-review-correlation` | Evaluation (multi-repo) | `CrossRepoAnalysis.md` |
| `paw-review-feedback` | Output | `ReviewComments.md` (draft, then finalized) |
| `paw-review-critic` | Output | Assessment of each comment |
| `paw-review-github` | Output, in the host | Pending GitHub review, or a submitted one when explicitly authorized |
| `paw-review-response` | Separate use | Addressing reviewer comments on a PAW pull request; not part of PAW Review |

See the [Review Workflow specification](../specification/review.md).

## Next Steps

- [Artifacts Reference](artifacts.md) — Artifact descriptions
- [Workflows](../guide/two-workflows.md) — How the workflows run
