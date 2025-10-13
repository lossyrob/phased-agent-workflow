# Finalize Initial Agent Chatmodes Implementation Plan

## Overview

Bring every PAW chatmode to a production-ready baseline by standardizing naming, artifact references, and guardrails; filling the empty Stage 03B–05 prompts; and aligning all agents with the workflow boundaries, quality bars, and hand-offs defined in `Spec.md`.

## Current State Analysis

- `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`, `PAW-04 Documenter.chatmode.md`, and `PAW-05 PR.chatmode.md` are empty (CodeResearch.md §Chatmode File Locations).
- Existing mature prompts show uneven naming (`Code Researcher` vs `Code Research Agent`), path references (`docs/agent/` vs `docs/agents/`), and hand-off language (SpecResearch.md Q7, Q8, Q9).
- Guardrail coverage is inconsistent: anti-evaluation rules live only in `PAW-02A` (lines 8-14), “no open questions” in `PAW-02B` (lines 300-302), and surgical change discipline in `PAW-03A` (Committing section), while Status Agent guardrails are untested and use conflicting "AUTOGEN" terminology.
- Quality checklists exist only for Spec Agent (Spec.md §P7); other prompts lack measurable validation.
- Status Agent trigger list misses `Docs PR` opened/updated events, diverging from `paw-specification.md` (Spec.md §P10).

## Desired End State

- All chatmode files contain complete, testable instructions aligned with Functional Requirements FR-001…FR-030.
- Canonical agent names match `paw-specification.md`, and all artifact paths reference `/docs/agents/<target_branch>/…` filenames.
- Guardrail sets are harmonized across relevant agents without carrying forward unproven Status Agent patterns.
- Every chatmode includes explicit quality checklists and hand-off statements that reference the next stage.
- Status Agent triggers cover planning, phase, docs, and final PR open/update/merge events, using neutral terminology.

### Key Discoveries:
- `.github/chatmodes/PAW-02A Code Researcher.chatmode.md` lines 8-14 hold the anti-evaluation guardrail pattern we need to propagate (CodeResearch.md §Guardrail Patterns).
- `.github/chatmodes/PAW-01A Spec Agent.chatmode.md` lines 233-240 provide the blocking-on-unresolved-questions pattern required by FR-010 (CodeResearch.md §Guardrail Patterns, Spec.md §P3).
- `.github/chatmodes/PAW-02B Impl Planner.chatmode.md` lines 41-84 capture the “Read everything before researching” and “No open questions in final plan” enforcement that must apply to planning/implementation agents (CodeResearch.md §Guardrail Patterns).
- `.github/chatmodes/PAW-03A Implementer.chatmode.md` Committing section records surgical change discipline needed by Impl Reviewer & Documenter (CodeResearch.md §Guardrail Patterns, Spec.md §P3).

## What We're NOT Doing

- Creating new workflow stages, agents, or artifacts beyond those defined in `paw-specification.md`.
- Implementing runtime automation or validation tooling beyond documentation edits (no prompt execution engine changes).
- Refactoring `Spec.md`, `SpecResearch.md`, or `CodeResearch.md` content produced in earlier stages.
- Introducing the untested Status Agent "AUTOGEN" wording into other prompts.

## Implementation Approach

Execute phased updates: first normalize shared surfaces (names, paths), then harmonize guardrails and language, author the missing Stage 03B–05 prompts, refine remaining prompts, and finish by reconciling the Status Agent trigger matrix and performing a repo-wide QA sweep.

---

## Phase 1: Canonical Naming & Artifact Path Alignment

### Overview
Standardize agent naming and artifact path references to the canonical forms from `paw-specification.md`, eliminating `docs/agent/` and abbreviated filenames.

### Changes Required:

#### 1. Chatmode metadata normalization
**Files**: `.github/chatmodes/PAW-02A Code Researcher.chatmode.md`, `.github/chatmodes/PAW-02B Impl Planner.chatmode.md`, `.github/chatmodes/PAW-03A Implementer.chatmode.md`, `.github/chatmodes/PAW-03B Impl Reviewer.chatmode.md`, `.github/chatmodes/PAW-04 Documenter.chatmode.md`, `.github/chatmodes/PAW-05 PR.chatmode.md`, `.github/chatmodes/PAW-X Status Update.chatmode.md`
**Changes**: Update YAML `description`, H1 title, and any internal references to use canonical names (e.g., “Code Research Agent”, “Implementation Plan Agent”, “Implementation Review Agent”, “Documentation Agent”, “PR Agent”, “Status Agent”). Rename files if necessary to match the naming convention `PAW-<code> <canonical-name>.chatmode.md`.

```markdown
---
description: 'Phased Agent Workflow: Code Research Agent'
---
# Code Research Agent
```

#### 2. Artifact path corrections
**Files**: All chatmodes referencing artifacts, plus `paw-specification.md` if inconsistencies remain.
**Changes**: Replace `docs/agent/` with `docs/agents/` and ensure filenames are `Spec.md`, `SpecResearch.md`, `CodeResearch.md`, `ImplementationPlan.md`, `Docs.md`, `prompts/spec-research.prompt.md`, `prompts/code-research.prompt.md`.

```markdown
- Save at: `docs/agents/<target_branch>/ImplementationPlan.md`
```

### Success Criteria:

#### Automated Verification:
- [ ] `npx markdownlint "**/*.md"` passes without new errors.
- [ ] `rg --files-with-matches "docs/agent/" .github/chatmodes docs | wc -l` returns `0`.

#### Manual Verification:
- [ ] Each chatmode header (frontmatter + H1) matches the canonical agent name from `paw-specification.md`.
- [ ] All artifact references point to `/docs/agents/<target_branch>/…` with standard filenames.
- [ ] File names align with the updated titles (rename or adjust as needed).

---

## Phase 2: Guardrail Harmonization & Language Clarity

### Overview
Propagate proven guardrail patterns and clarify ambiguous terminology across mature chatmodes, excluding untested Status Agent guardrails.

### Changes Required:

#### 1. Guardrail propagation
**Files**: `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md`, `.github/chatmodes/PAW-02A Code Research Agent.chatmode.md`, `.github/chatmodes/PAW-02B Implementation Plan Agent.chatmode.md`, `.github/chatmodes/PAW-03A Implementation Agent.chatmode.md`
**Changes**:
- Extend Spec Research Agent with anti-evaluation guardrails adapted from Code Research Agent (no improvement suggestions, no critique).
- Reinforce Implementation Plan Agent with explicit references to the Spec Agent “critical questions must be resolved” guardrail.
- Ensure Implementation Agent reiterates “no unrelated changes” and adds explicit pause/verification language referencing plan checklists.
- Document that Status Agent guardrails are not reused; replace “AUTOGEN” references with neutral phrases (e.g., “designated status block”).

```markdown
- DO NOT propose improvements, refactors, or future work. Your role is factual documentation only.
- NEVER proceed if critical clarification questions remain unresolved.
```

#### 2. Quality checklist and language clarity
**Files**: `.github/chatmodes/PAW-01B Spec Research Agent.chatmode.md`, `.github/chatmodes/PAW-02A Code Research Agent.chatmode.md`, `.github/chatmodes/PAW-02B Implementation Plan Agent.chatmode.md`, `.github/chatmodes/PAW-03A Implementation Agent.chatmode.md`, `.github/chatmodes/PAW-X Status Agent.chatmode.md`
**Changes**:
- Add role-specific quality checklists covering factual accuracy, traceability, testability, and scope adherence (FR-023…FR-026).
- Replace ambiguous verbs ("update", "complete", "comprehensive") with context-specific instructions (e.g., "append a new status section", "stop once every research question has a source-backed answer").
- Add explicit hand-off statements where missing (Spec Research → Spec Agent, Implementation Plan → Implementation Agent, Implementation Agent → Documenter).

### Success Criteria:

#### Automated Verification:
- [ ] `rg --files-with-matches "AUTOGEN" .github/chatmodes/PAW-X Status Agent.chatmode.md` returns `0`.
- [ ] `rg --files-with-matches "\b(comprehensive|complete|update|refine|relevant)\b" .github/chatmodes | wc -l` decreases, and each remaining usage is accompanied by clarifying context in the same paragraph.

#### Manual Verification:
- [ ] Guardrail sections explicitly cite anti-evaluation, question-resolution, and surgical-change directives where applicable.
- [ ] Every chatmode now contains a measurable quality checklist tailored to its role.
- [ ] All hand-off statements reference the correct next agent by canonical name.

---

## Phase 3: Implementation Review Agent Authoring

### Overview
Create the full PAW-03B Implementation Review Agent prompt covering review responsibilities, coordination with Implementer, and quality gates.

### Changes Required:

#### 1. Author prompt structure
**File**: `.github/chatmodes/PAW-03B Implementation Review Agent.chatmode.md`
**Changes**:
- Add YAML frontmatter, role description, start instructions, review workflow, guardrails, quality checklist, and hand-off sections.
- Emphasize responsibilities: code review, docstring/comment generation, commit scope limited to review improvements, PR comment responses, manual verification coordination.
- Include guidance for both initial review of Implementation Agent work and follow-up review cycles.

```markdown
## Guardrails
- ONLY modify files necessary to address review findings or documentation gaps.
- NEVER merge or approve PRs without human instruction.
- DO NOT remove or rewrite Implementation Plan notes; append clarifications instead.
```

#### 2. Integrate coordination with Implementation Agent and Documenter
**Files**: `.github/chatmodes/PAW-03A Implementation Agent.chatmode.md`, `.github/chatmodes/PAW-04 Documentation Agent.chatmode.md`
**Changes**:
- Update Implementation Agent hand-off to explicitly signal when to invoke the Implementation Review Agent.
- Add references in Documenter prompt (Phase 4) to consume finalized review summaries.

### Success Criteria:

#### Automated Verification:
- [ ] `test -s .github/chatmodes/PAW-03B Implementation Review Agent.chatmode.md` (file is non-empty).
- [ ] `rg --files-with-matches "Implementation Review Agent" .github/chatmodes/PAW-03B Implementation Review Agent.chatmode.md` returns matches in title, guardrails, and hand-offs.

#### Manual Verification:
- [ ] Prompt covers initial review, follow-up review comments, docstring guidance, and summary comment expectations.
- [ ] Guardrails enforce surgical change discipline and prevent scope creep.
- [ ] Hand-off directs next step (Documenter or human approval) after review completion.

---

## Phase 4: Documentation & PR Agent Authoring

### Overview
Author full prompts for Stage 04 and Stage 05, ensuring they support documentation generation and final PR readiness checks.

### Changes Required:

#### 1. Documentation Agent prompt
**File**: `.github/chatmodes/PAW-04 Documentation Agent.chatmode.md`
**Changes**:
- Define inputs (ImplementationPlan.md, merged phase PRs), scope boundaries (no code changes), documentation workflow, and Docs.md template usage.
- Add guardrails for documentation-only commits and review comment handling.
- Provide quality checklist covering coverage, traceability to acceptance criteria, and style adherence.

#### 2. PR Agent prompt
**File**: `.github/chatmodes/PAW-05 PR Agent.chatmode.md`
**Changes**:
- Lay out pre-flight checklist verifying merged PRs, artifact availability, branch freshness, and blocking conditions.
- Provide structure for final PR description (summary, links, testing evidence, deployment notes).
- Include guardrails around blocking when prerequisites fail and coordinating with Status Agent.

#### 3. Cross-agent hand-offs
**Files**: `.github/chatmodes/PAW-03B Implementation Review Agent.chatmode.md`, `.github/chatmodes/PAW-04 Documentation Agent.chatmode.md`, `.github/chatmodes/PAW-05 PR Agent.chatmode.md`
**Changes**:
- Ensure Stage 03B hand-off instructs invoking Documentation Agent once review remediations merge.
- Documentation Agent hand-off instructs running Status Agent and invoking PR Agent after docs PR merge.
- PR Agent hand-off includes final instructions for human merge/rollout and optional Status Agent update.

### Success Criteria:

#### Automated Verification:
- [ ] `test -s .github/chatmodes/PAW-04 Documentation Agent.chatmode.md`
- [ ] `test -s .github/chatmodes/PAW-05 PR Agent.chatmode.md`
- [ ] `rg "Docs.md" .github/chatmodes/PAW-04 Documentation Agent.chatmode.md` returns expected references.

#### Manual Verification:
- [ ] Documentation Agent prompt enumerates required doc surfaces and quality checks (coverage, links, style).
- [ ] PR Agent prompt lists every prerequisite from Spec.md §Stage 05 and enforces blocking rules.
- [ ] Hand-offs chain Documenter → PR Agent → Status Agent with explicit instructions.

---

## Phase 5: Status Agent Alignment & Global QA

### Overview
Update the Status Agent trigger matrix and perform repository-wide consistency checks.

### Changes Required:

#### 1. Status Agent trigger revisions
**File**: `.github/chatmodes/PAW-X Status Agent.chatmode.md`
**Changes**:
- Update trigger list to include planning/phase/docs PR opened, updated, and merged events, matching `paw-specification.md`.
- Replace “AUTOGEN” terminology with “designated status block” or similar neutral language.
- Align artifact names (`ImplementationPlan.md`, `Docs.md`) and clarify update scope.

#### 2. Global QA sweep
**Files**: All updated chatmodes, `paw-specification.md`
**Changes**:
- Verify every chatmode includes explicit hand-off and quality checklist sections.
- Ensure guardrail lists use consistent formatting (`NEVER`, `ALWAYS`, `DO NOT`).
- Confirm canonical names across `paw-specification.md` references.

### Success Criteria:

#### Automated Verification:
- [ ] `rg --files-with-matches "AUTOGEN" .github/chatmodes` returns `0`.
- [ ] `rg "Docs PR" .github/chatmodes/PAW-X Status Agent.chatmode.md` shows opened/updated/merged triggers.
- [ ] `rg --files-with-matches "Implementation Plan Agent" paw-specification.md .github/chatmodes` confirms consistent naming.

#### Manual Verification:
- [ ] Status Agent instructions reference all PR lifecycle events and avoid untested guardrail language.
- [ ] Random sampling of chatmodes confirms hand-off statements point to the correct next agent.
- [ ] Plan reviewers confirm ambiguous verbs now include clarifying context or examples.

---

## Testing Strategy

### Unit Tests:
- Not applicable (documentation-only changes).

### Integration Tests:
- Run `npx markdownlint "**/*.md"` to ensure prompt files format cleanly.
- Use `rg` searches from success criteria to confirm canonical naming and trigger coverage.

### Manual Testing Steps:
1. Walk through each chatmode to ensure section ordering follows the established pattern (title, start, workflow, guardrails, quality checklist, hand-off).
2. Simulate Stage transitions (Spec → Planning → Implementation → Documentation → PR) and verify each hand-off statement provides the required inputs/outputs.
3. Review new prompts (Implementation Review, Documentation, PR) with a dry-run scenario to ensure instructions are actionable without additional improvisation.

## Performance Considerations

- Prompt edits do not impact runtime performance. Ensure markdown remains readable within editor context limits.

## Migration Notes

- If chatmode files are renamed, update any tooling or documentation that references old filenames (search the repo for `PAW-02B Impl Planner`-style references).
- Communicate new guardrail expectations to users who previously leveraged the prompts.

## References

- Specification: `docs/agents/feature/finalize-initial-chatmodes/Spec.md`
- Research: `docs/agents/feature/finalize-initial-chatmodes/SpecResearch.md`
- Code Research: `docs/agents/feature/finalize-initial-chatmodes/CodeResearch.md`
- Workflow Overview: `paw-specification.md`
