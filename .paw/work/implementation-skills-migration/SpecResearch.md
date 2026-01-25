# Spec Research: Implementation Skills Migration

## Summary

The current implementation workflow consists of 9 agents totaling ~163KB of character content (excluding PAW Review). The review workflow migration (PAW Review) reduced its agent to ~3.6KB by delegating detailed instructions to skills (~113KB total). Two reusable components (`paw-context.component.md` at ~3KB and `handoff-instructions.component.md` at ~6.6KB) are already shared across agents via template variables. Each agent has distinct responsibilities—from specification writing to final PR creation—but shares significant common scaffolding for context loading, handoff mode behavior, and workflow state handling. The review workflow provides a clear reference pattern: a compact orchestrator agent plus a workflow skill for sequencing plus activity skills for bounded tasks.

## Agent Notes

The goal is to migrate 9 implementation agents (PAW-01A through PAW-05, PAW-X Status) to a skills-based architecture following the pattern from PR #156 (review workflow migration). Key context:

- The issue explicitly states decisions: handoff mode controls pausing, one phase per invocation, `paw-*` skill naming
- The review workflow serves as the reference pattern with a single orchestrator agent + workflow skill + activity skills
- Existing skills in `skills/paw-review-*` demonstrate the format
- Artifact locations must not change

Understanding how the existing implementation agents work and how the review migration was structured is essential for designing equivalent implementation skills.

## Research Findings

### 1. Current Implementation Agent Token Usage

**Question**: What is the approximate token count of each implementation agent file (PAW-01A through PAW-05, PAW-X)? How does this compare to the PAW Review agent + workflow skill combined?

**Answer**: Character counts for implementation agents:
- PAW-01A Specification: 23,266 chars
- PAW-01B Spec Researcher: 6,550 chars
- PAW-02A Code Researcher: 18,201 chars
- PAW-02B Impl Planner: 20,232 chars
- PAW-03A Implementer: 19,377 chars
- PAW-03B Impl Reviewer: 18,538 chars
- PAW-04 Documenter: 21,885 chars
- PAW-05 PR: 12,688 chars
- PAW-X Status: 22,519 chars
- **Total implementation agents**: ~163,256 chars

PAW Review agent after migration: 3,573 chars
Review workflow skill: 9,732 chars
**Combined**: ~13,305 chars

Review activity skills total: ~103,592 chars (including baseline, correlation, critic, feedback, gap, github, impact, understanding)

**Evidence**: `wc -c` output from agent files and skills directories.

**Implications**: The PAW Review agent is dramatically smaller (~3.6KB) than any single implementation agent. The workflow skill + activity skills model allows the orchestrator to be compact while skills contain domain-specific behavior. This pattern should reduce the base agent prompt size significantly.

---

### 2. Shared Content in Implementation Agents

**Question**: What content is duplicated or shared across implementation agents (e.g., PAW Context components, handoff instructions, workflow mode handling)?

**Answer**: Two component files are templated into all implementation agents:

1. **`paw-context.component.md`** (~3,020 chars): Contains PAW context loading instructions, `paw_get_context` usage, WorkflowContext.md field documentation, precedence rules for custom instructions. Inserted via `{{PAW_CONTEXT}}` template variable.

2. **`handoff-instructions.component.md`** (~6,559 chars): Contains command recognition patterns, stage navigation logic, `paw_call_agent` usage, command mapping table, handoff mode behavior (manual/semi-auto/auto), required handoff message format. Inserted via `{{HANDOFF_INSTRUCTIONS}}` template variable.

Beyond these explicit components, agents share:
- **Workflow Mode handling**: Each agent duplicates code blocks for full/minimal/custom mode detection and branching logic
- **Review Strategy handling**: Repeated sections for prs vs local strategy
- **Git operations**: Similar patterns for branch verification, staging, committing
- **Quality checklists**: Similar structure across agents (though specific items differ)
- **Guardrails sections**: Repeated patterns for what agents should/shouldn't do
- **Issues/PRs working patterns**: Instructions for using MCP tools appear in multiple agents

**Evidence**: Component files in `agents/components/`, inspection of agent file structures.

**Implications**: ~9.5KB of shared content is already factored into components. Additional patterns (workflow mode, review strategy, git operations) are duplicated and could be consolidated into the workflow skill or shared utilities.

---

### 3. Distinct Capabilities per Agent

**Question**: For each implementation agent, what are its unique responsibilities that should become skill content vs orchestration content?

**Answer**:

**PAW-01A Specification**:
- **Unique responsibilities**: Convert issue/brief into structured specification, prioritize user stories, enumerate requirements (FR-001, SC-001), generate research prompt, integrate research findings, validate against quality checklist
- **Skill content candidates**: Spec template, quality checklist, research prompt format, requirement enumeration patterns, user story structure
- **Orchestration content**: Handoff to Spec Researcher, research-integration loop, artifact location management

**PAW-01B Spec Researcher**:
- **Unique responsibilities**: Answer factual questions about existing system behavior, document behavioral descriptions (not implementation details), produce SpecResearch.md
- **Skill content candidates**: Research methodology, behavioral documentation focus, evidence requirements, open unknowns handling
- **Orchestration content**: Return to Spec Agent after completion

**PAW-02A Code Researcher**:
- **Unique responsibilities**: Document implementation details with file:line references, analyze codebase patterns, produce CodeResearch.md with YAML frontmatter
- **Skill content candidates**: Research methodology, file:line reference format, document template, GitHub permalink generation
- **Orchestration content**: Handoff to Impl Planner

**PAW-02B Impl Planner**:
- **Unique responsibilities**: Create phased implementation plans, design component architecture, specify success criteria (automated vs manual), create Planning PR (prs strategy), address Planning PR review comments
- **Skill content candidates**: Plan template, phase structure guidelines, success criteria format, C4-level abstraction guidance, anti-patterns
- **Orchestration content**: PR mode branching, Planning PR creation, handoff to Implementer

**PAW-03A Implementer**:
- **Unique responsibilities**: Execute plan phases, write functional code, run tests, commit locally, address PR review comments (code changes only)
- **Skill content candidates**: Implementation philosophy, verification approach, blocking criteria, artifact update discipline
- **Orchestration content**: Phase branch management, commit workflow, handoff to Impl Reviewer

**PAW-03B Impl Reviewer**:
- **Unique responsibilities**: Review code for maintainability, add documentation/docstrings, question design decisions, push and open Phase PRs, verify addressed review comments
- **Skill content candidates**: Review criteria, documentation standards, small vs large refactor distinction, PR description templates
- **Orchestration content**: Push/PR operations, reply to comments, handoff decisions

**PAW-04 Documenter**:
- **Unique responsibilities**: Create Docs.md technical reference, update project docs (README, CHANGELOG), create Docs PR
- **Skill content candidates**: Docs.md template, project doc update guidelines, style matching requirements
- **Orchestration content**: Docs branch management, PR creation, handoff to PR Agent

**PAW-05 PR**:
- **Unique responsibilities**: Run pre-flight validation, craft comprehensive PR description, create final PR to main, provide merge guidance
- **Skill content candidates**: Pre-flight checklist, PR description templates (simple vs complex), artifact linking format
- **Orchestration content**: Validation sequencing, PR creation, terminal workflow handling

**PAW-X Status**:
- **Unique responsibilities**: Diagnose workflow state, recommend next steps, list active work items, post updates to Issues/PRs (opt-in), explain PAW process
- **Skill content candidates**: Workflow stages overview, two-agent pattern explanation, common errors/resolutions, PR review comment analysis
- **Orchestration content**: Stage transition handoffs, multi-work-item discovery

**Evidence**: Full reading of each agent file.

**Implications**: Each agent has a mix of domain-specific behavior (skill candidates) and workflow coordination (orchestration). The orchestration logic (branching, PR creation, handoffs) should largely consolidate into the workflow skill, while domain-specific activities become activity skills.

---

### 4. Artifact Flow Between Agents

**Question**: How do implementation artifacts (WorkflowContext.md, Spec.md, SpecResearch.md, CodeResearch.md, ImplementationPlan.md) flow between agents? What validation occurs at stage boundaries?

**Answer**: Artifact flow follows a sequential dependency chain:

```
WorkflowContext.md (created at initialization, updated throughout)
       ↓
Spec.md (01A) ← SpecResearch.md (01B)
       ↓
CodeResearch.md (02A)
       ↓
ImplementationPlan.md (02B)
       ↓
[Phase implementations] (03A/03B per phase)
       ↓
Docs.md (04)
       ↓
Final PR (05)
```

**Validation at boundaries**:
- **Spec Agent**: Checks for existing SpecResearch.md before generating research prompt
- **Code Researcher**: Reads Spec.md for context (graceful handling if minimal mode skips spec)
- **Impl Planner**: Reads Spec.md, SpecResearch.md, CodeResearch.md
- **Implementer**: Reads ImplementationPlan.md, CodeResearch.md; determines current phase from plan
- **Impl Reviewer**: Reads ImplementationPlan.md to verify phase completion
- **Documenter**: Validates all phases marked complete in ImplementationPlan.md, Docs.md doesn't exist yet
- **PR Agent**: Pre-flight checks verify all artifacts exist, phases complete, Docs PR merged

Each agent uses `paw_get_context` to load WorkflowContext.md fields and relies on file existence checks for other artifacts.

**Evidence**: Agent file sections on "Start / Initial Response" and process steps.

**Implications**: The workflow skill needs to encode this dependency graph and validation logic. Activity skills should produce their artifacts without needing to understand the full workflow sequence.

---

### 5. Handoff Mode Implementation

**Question**: How is handoff mode (manual/semi-auto/auto) currently implemented in the agent files? Is this logic duplicated or shared?

**Answer**: Handoff mode is implemented through the shared component `handoff-instructions.component.md`:

1. **Detection**: Agents call `paw_get_context`, which returns a `<handoff_instructions>` section based on the WorkflowContext.md Handoff Mode field
2. **Behavior mapping**: The component defines which transitions are "routine" (auto-proceed in semi-auto) vs "decision points" (pause for user input)
3. **Per-agent handoff sections**: Each agent has a unique "### [Agent Name] Handoff" section appended after `{{HANDOFF_INSTRUCTIONS}}` that specifies:
   - What options to present (e.g., `research`, `plan`, `implement`)
   - Which mode triggers immediate handoff vs waiting

**Routine transitions** (semi-auto proceeds automatically):
- Spec → Spec Research (if research needed)
- Spec Research → Spec Agent
- Code Research → Impl Planner
- Implementer phase completion → Impl Reviewer

**Decision points** (semi-auto pauses):
- Impl Planner completion → wait for `implement`
- Impl Reviewer phase completion → wait for `implement Phase N+1` or `docs`
- Documenter completion → wait for `pr`

**Evidence**: `handoff-instructions.component.md` content, agent handoff sections.

**Implications**: The handoff mode logic is already centralized in the component. The workflow skill can inherit this pattern, encoding the transition graph and routine vs decision point designations.

---

### 6. Review Workflow Skill Structure

**Question**: What is the structure of `paw-review-workflow/SKILL.md`? How does it orchestrate activity skills (subagent delegation pattern)?

**Answer**: The workflow skill contains:

1. **YAML frontmatter**: `name`, `description`
2. **Core Review Principles** (~6 principles): Evidence-based documentation, file:line requirements, no fabrication, document-don't-critique, human control, artifact completeness
3. **Subagent Contract**: Instructions for how activity skills are loaded and executed via delegated agent sessions
4. **Artifact Directory Structure**: Defines `.paw/reviews/<identifier>/` with all artifact files
5. **Workflow Orchestration**: Three stages with explicit sequences:
   - **Understanding Stage**: `paw-review-understanding` → `paw-review-baseline` → `paw-review-understanding` (resume)
   - **Evaluation Stage**: `paw-review-impact` → `paw-review-gap`
   - **Output Stage**: `paw-review-feedback` → `paw-review-critic` → `paw-review-feedback` (critique response) → `paw-review-github`
6. **Stage Gates**: Verification between stages
7. **Terminal Behavior**: What to report on completion
8. **Cross-Repository Support**: Multi-repo handling logic

**Subagent delegation pattern**:
- Each activity is delegated to a separate agent session
- Delegation prompt includes: "First load your skill using `paw_get_skill('paw-review-<skill-name>')`, then execute the activity"
- Subagent receives skill name, PR context, artifact path
- Subagent returns completion status with artifact confirmation

**Evidence**: Full content of `skills/paw-review-workflow/SKILL.md`.

**Implications**: The implementation workflow skill should follow this same structure: core principles, subagent contract, artifact structure, stage sequences with gates, and terminal behavior.

---

### 7. Activity Skill Pattern

**Question**: What does an activity skill look like (e.g., `paw-review-understanding`)? What metadata, responsibilities, and execution modes do they define?

**Answer**: Activity skills follow a consistent pattern:

**YAML frontmatter**:
```yaml
---
name: paw-review-understanding
description: Brief description of capability and when to use it
---
```

**Sections**:
1. **Title and introduction**: One-sentence description
2. **Reference to workflow principles**: "Follow Core Review Principles from `paw-review-workflow` skill"
3. **Responsibilities**: What this skill does
4. **Non-Responsibilities**: Explicit boundaries
5. **Execution Modes**: Different behaviors based on artifact state (e.g., Initial Mode vs Resumption Mode)
6. **Context Detection**: How to identify the context (GitHub PR vs local branch)
7. **Step-by-step process**: Numbered steps with specific actions
8. **Artifact templates**: Markdown templates for outputs
9. **Validation Criteria**: What makes the artifact complete
10. **Completion Response**: What to report when done

**Key characteristics**:
- Skills are self-contained with complete instructions
- They reference workflow principles rather than duplicating them
- They define clear input/output contracts
- They specify different execution modes for different states

**Evidence**: Full content of `skills/paw-review-understanding/SKILL.md`.

**Implications**: Implementation activity skills should follow this template: frontmatter, responsibilities/non-responsibilities, execution modes, step-by-step process, artifact templates, validation criteria, completion response.

---

### 8. PAW Review Agent Size

**Question**: How large is `PAW Review.agent.md` after migration? What does it retain vs delegate to skills?

**Answer**: PAW Review agent is ~3,573 chars (compared to 13-23KB for implementation agents).

**What it retains**:
- Agent metadata (description)
- One-sentence role description
- Initialization: "Load the `paw-review-workflow` skill"
- Context Detection: Identify PR or local branch
- Multi-Repository Detection Triggers: High-level detection conditions
- Skill-Based Execution: "Use the skills catalog to discover available review skills, then execute each activity by delegating to a separate agent session"
- Output Stage Flow summary (overview of feedback-critique pattern)
- Human Control Point: "Pending reviews are NEVER auto-submitted"
- Error Handling: "If any stage fails, report and seek guidance"
- Guardrails: Brief list of core principles

**What it delegates to skills**:
- All detailed process steps
- Artifact templates and formats
- Stage-specific logic
- Validation criteria
- Tool usage patterns
- Completion responses

**Evidence**: Full content of `agents/PAW Review.agent.md`.

**Implications**: The migrated PAW agent should similarly retain only high-level orchestration guidance (skill loading, stage flow summary, control points, error handling, guardrails) while delegating all detailed behavior to skills.

---

## Open Unknowns

1. **Token reduction in review migration**: The exact token reduction achieved in PR #156 is not available in the codebase. The issue requests this as external context to establish expectations.

---

## User-Provided External Knowledge (Manual Fill)

- [ ] **Token Reduction Benchmarks**: What token reduction was achieved in the review workflow migration (PR #156)? This establishes expectations for implementation migration.
