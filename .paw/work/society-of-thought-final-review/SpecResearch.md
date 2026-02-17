---
date: 2025-02-14 19:15:00 PST
git_commit: 5e840f91309635a38f011097a0d8bc819a798192
branch: feature/society-of-thought-final-review
repository: phased-agent-workflow-3
topic: "Society-of-Thought Final Review Spec Research"
tags: [research, specification]
status: complete
---

# Spec Research: Society-of-Thought Final Review

## Summary

The paw-final-review skill provides a mature multi-model review infrastructure that society-of-thought mode can build upon. It already handles model resolution, parallel subagent execution via the `task` tool, synthesis generation, and interactive resolution with smart classification. The skill uses a simple key:value format for WorkflowContext.md parsing and produces gitignored review artifacts. No GapAnalysis.md artifact currently exists—only REVIEW.md and REVIEW-SYNTHESIS.md. PAW has established precedence patterns for config files via `.github/copilot-instructions.md` (project-level) and `~/.copilot/` (user-level), though no four-level precedence system currently exists for persona/specialist files.

## Research Findings

### Question 1: How does the existing `paw-final-review` skill work?

**Answer**: The paw-final-review skill is a direct-execution (not subagent) skill that runs after all implementation phases complete. It reads WorkflowContext.md configuration, generates diff context, executes review(s), produces artifacts in `.paw/work/<work-id>/reviews/`, and presents findings for user resolution based on interactive mode settings.

**Structure**:
- Located at `~/.copilot/skills/paw-final-review/SKILL.md`
- 248 lines organized in sequential procedure steps (Step 1-6)
- Direct execution context (preserves user interactivity)

**Single-model vs multi-model modes**:
- **Single-model**: Executes review once using session's default model, saves to `REVIEW.md`
- **Multi-model**: Spawns parallel subagents via `task` tool with `model` parameter, saves per-model reviews to `REVIEW-{MODEL}.md`, then generates `REVIEW-SYNTHESIS.md`

**Artifacts produced**:
- Review directory: `.paw/work/<work-id>/reviews/`
- Single-model: `REVIEW.md`
- Multi-model: `REVIEW-{MODEL}.md` per model + `REVIEW-SYNTHESIS.md`
- All files gitignored via `.gitignore` with `*` pattern

**Workflow**:
1. Read config from WorkflowContext.md (Final Review Mode, Interactive, Models)
2. Gather context (diff, Spec.md, ImplementationPlan.md, CodeResearch.md)
3. Create reviews directory with `.gitignore`
4. Execute review(s) using shared prompt template
5. Resolve findings (interactive/smart/auto modes)
6. Report completion with counts and status

**Evidence**: `/Users/rob/.copilot/skills/paw-final-review/SKILL.md` lines 1-248

**Implications**: Society-of-thought mode can reuse the multi-model infrastructure (task tool spawning, model parameter passing, synthesis generation) but will need to extend the prompt template to include specialist personas, modify synthesis to handle persona attribution and confidence weighting, and potentially rename or restructure artifacts to reflect specialist-based review paradigm.

---

### Question 2: How would specialist/persona files be discovered at the 4 precedence levels?

**Answer**: No existing four-level precedence system exists in PAW. However, established patterns provide a foundation: project-level config lives in `.github/copilot-instructions.md`, user-level config in `~/.copilot/`, and per-workflow config in `.paw/work/<work-id>/WorkflowContext.md`.

**Existing precedence patterns**:
1. **Workflow level**: WorkflowContext.md stores workflow-specific config at `.paw/work/<work-id>/WorkflowContext.md` with key:value format
2. **Project level**: `.github/copilot-instructions.md` provides project-wide Copilot instructions (observed at `/Users/rob/proj/paw/phased-agent-workflow-3/.github/copilot-instructions.md`)
3. **User level**: `~/.copilot/` directory stores user-level config, agents, and skills (observed at `/Users/rob/.copilot/skills/`, `/Users/rob/.copilot/agents/`)
4. **Built-in defaults**: Skills define defaults directly in SKILL.md (see paw-init SKILL.md lines 39-45 for default values table)

**No specialist file discovery yet**: PAW currently has no persona/specialist file loading mechanism at any level.

**Comparable pattern**: Skills themselves follow a two-level precedence:
- User-level: `~/.copilot/skills/<skill-name>/`
- Project-level: `skills/<skill-name>/` (in repo)

**Evidence**: 
- `.github/copilot-instructions.md` at `/Users/rob/proj/paw/phased-agent-workflow-3/.github/copilot-instructions.md`
- User-level skills at `~/.copilot/skills/`
- WorkflowContext.md parsing in `src/utils/workItemScanner.ts` lines 25-28 (simple regex: `^Work Title:\s*(.+)$/m`)

**Implications**: Society-of-thought will need to establish new discovery paths. Recommended structure mirrors skill precedence:
- Workflow: `.paw/work/<work-id>/specialists/` or inline in WorkflowContext.md as a field
- Project: `.paw/specialists/` or `specialists/`
- User: `~/.copilot/specialists/` or `~/.paw/specialists/`
- Built-in: Embedded in paw-final-review skill or separate built-in files

The spec should define explicit search paths, filename conventions (e.g., `<specialist-name>.md`), and precedence rules (most specific wins, with override vs merge semantics).

---

### Question 3: How are existing Final Review config fields consumed?

**Answer**: Config fields are stored in WorkflowContext.md as simple `key: value` lines. Skills read the file directly and parse via regex or line scanning. Model resolution happens once at init time; concrete model names (not intents) are stored.

**Config field format** (WorkflowContext.md):
```
Final Agent Review: enabled
Final Review Mode: multi-model
Final Review Interactive: smart
Final Review Models: gpt-5.3-codex, gemini-3-pro-preview, claude-opus-4.6
```

**Storage and resolution**:
- Fields written during `paw-init` (see paw-init SKILL.md lines 106-108)
- Model intents (e.g., "latest GPT") resolved to concrete names during init, then stored (paw-init SKILL.md lines 76-83)
- Skills read WorkflowContext.md at runtime (paw-final-review SKILL.md line 26-30)
- No centralized parsing library—each skill performs ad-hoc parsing

**Parsing pattern**:
- Simple regex matching (e.g., `/^Work Title:\s*(.+)$/m` in workItemScanner.ts line 26)
- Skills typically read full file and scan for relevant keys

**Consumption locations**:
- `paw-init`: Writes all fields (lines 94-119)
- `paw-final-review`: Reads Final Review Mode, Interactive, Models (line 26-30)
- `paw-planning-docs-review`: Reads Planning Review Mode, Interactive, Models (line 29-32)
- `paw-status`: Displays all fields (mentioned in paw-status SKILL.md grep results)

**Evidence**:
- WorkflowContext.md template at paw-init SKILL.md lines 94-119
- Model resolution at paw-init SKILL.md lines 76-83
- Config reading at paw-final-review SKILL.md lines 26-30
- Parsing example at src/utils/workItemScanner.ts lines 25-28

**Implications**: Society-of-thought config can follow the same pattern:
- New fields: `Final Review Society Mode`, `Final Review Specialists`, `Final Review Interaction Mode` (parallel/debate), `Final Review Selection Mode` (fixed/adaptive)
- Add to paw-init for initialization with defaults
- Parse in paw-final-review alongside existing fields
- Consider whether specialist list should be inline (comma-separated names) or external (file paths)

---

### Question 4: What does the current GapAnalysis.md artifact format look like?

**Answer**: GapAnalysis.md does not currently exist in paw-final-review. The skill produces REVIEW.md (single-model) or REVIEW-{MODEL}.md + REVIEW-SYNTHESIS.md (multi-model) with structured findings.

**Current artifact formats**:

**REVIEW.md** (single-model):
- Free-form markdown from review execution
- Expected structure per prompt: issue description, current code/text, proposed fix, severity (must-fix | should-fix | consider)

**REVIEW-SYNTHESIS.md** (multi-model) structure:
```markdown
# Review Synthesis

**Date**: [date]
**Reviewers**: [model list]
**Changes**: [branch/diff reference]

## Consensus Issues (All Models Agree)
[Highest priority - all models flagged these]

## Partial Agreement (2+ Models)
[High priority - multiple models flagged]

## Single-Model Insights
[Unique findings worth considering]

## Verification Checklist
[Populated with specific touchpoints for interface/data-flow changes]
- [ ] [Component A] updated
- [ ] [Component B] updated  
- [ ] Data flows end-to-end from [source] → [target]

## Priority Actions
### Must Fix
[Critical issues]

### Should Fix
[High-value improvements]

### Consider
[Nice-to-haves]
```

**No GapAnalysis.md**: The artifact name "GapAnalysis.md" appears in PAW Review workflow artifacts (docs/reference/artifacts.md line 30) for the review workflow (different from implementation workflow), but not in paw-final-review.

**Evidence**:
- paw-final-review SKILL.md lines 104-136 (REVIEW-SYNTHESIS.md structure)
- paw-final-review SKILL.md lines 241-244 (artifact table: single-model = REVIEW.md, multi-model = REVIEW-{MODEL}.md + REVIEW-SYNTHESIS.md)
- docs/reference/artifacts.md line 30 (GapAnalysis.md mentioned for review workflow, not implementation workflow)

**Implications**: Society-of-thought should either:
1. Extend REVIEW-SYNTHESIS.md to include specialist attribution, confidence levels, and persona-based categorization, OR
2. Introduce GapAnalysis.md as a new artifact specific to society-of-thought mode with specialist-attributed findings

The WorkShaping.md (line 46) specifies "Single synthesized GapAnalysis.md with specialist attribution and confidence levels" as the desired output, indicating a new artifact rather than extending REVIEW-SYNTHESIS.md. The spec should define GapAnalysis.md structure explicitly.

---

### Question 5: How does multi-model review launch parallel subagents with different models?

**Answer**: Multi-model review uses the `task` tool with `agent_type: "general-purpose"` and `model` parameter to spawn parallel subagents. Each subagent receives the same review prompt but runs with a different model. The orchestrating skill waits for all subagents to complete, saves per-model outputs, then generates synthesis.

**Mechanism**:
1. Parse resolved model names from WorkflowContext.md (e.g., `gpt-5.3-codex, gemini-3-pro-preview, claude-opus-4.6`)
2. For each model, call `task` tool with:
   - `agent_type: "general-purpose"` (or potentially `"task"` for simpler reviews)
   - `model: "<model-name>"` parameter override
   - `prompt: "<review-prompt>"` containing full context
   - `description: "Review with <model-name>"`
   - `mode: "sync"` (wait for completion) or spawn all async then collect
3. Each subagent runs independently with its assigned model
4. Collect outputs and save to `REVIEW-{MODEL}.md`
5. Generate synthesis by analyzing all per-model reviews

**Task tool behavior**:
- Launches specialized agents in separate context windows
- `model` parameter overrides agent's default model
- Available for agent types: explore, task, general-purpose, code-review (from PAW.agent.md task tool description)
- Supports both sync (wait for completion) and background modes

**Example pattern** (from paw-final-review SKILL.md line 98, paw-planning-docs-review SKILL.md line 108):
```
spawn parallel subagents using `task` tool with `model` parameter for each model
```

**Per-model output handling**:
- Save each subagent's output to separate file: `REVIEW-{MODEL}.md` or `reviews/planning/REVIEW-{MODEL}.md`
- Model name slugified for filename (implied by pattern `REVIEW-{MODEL}.md`)

**Evidence**:
- paw-final-review SKILL.md line 98: "spawn parallel subagents using `task` tool with `model` parameter for each model"
- paw-planning-docs-review SKILL.md line 108: same pattern
- PAW.agent.md task tool documentation (from context): 17 models available, `model` parameter overrides default

**Implications**: Society-of-thought can reuse this exact mechanism for launching specialist reviews, with extensions:
1. **Parallel mode**: Spawn N subagents (one per specialist) with:
   - Specialist-specific prompt (persona description + review criteria + code context)
   - Optional per-specialist model override (if specialist defines preferred model)
   - Unique description for each specialist
2. **Debate mode**: Sequential rounds with hub-and-spoke communication via synthesis agent
3. **Synthesis generation**: After collection, synthesis agent (potentially another task call) examines all specialist outputs, validates grounding, and produces GapAnalysis.md

Key difference from current multi-model: instead of same prompt + different models, society-of-thought uses different prompts (per specialist) + optionally different models.

---

## Open Unknowns

None. All internal research questions were answered with existing codebase patterns.

## User-Provided External Knowledge (Manual Fill)

- [ ] None required for this research phase
