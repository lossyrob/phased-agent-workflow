---
date: 2025-10-11T00:00:00-00:00
target_branch: feature/finalize-initial-chatmodes
status: draft
last_updated: 2025-10-11
summary: "Plan to align and complete all PAW chatmodes with proven guidance patterns and metadata"
tags: [implementation-plan, chatmodes, alignment, guidance-patterns]
issue: 1
---

# Implementation Plan: Finalize Initial Agent Chatmodes

## Overview
Bring all 9 PAW chatmode files to a consistent, production-ready guidance standard (HumanLayer pattern architecture) adding missing CRITICAL/DO NOT sections, workflows, pause points, role boundaries, YAML frontmatter templates, and artifact path correctness while creating three empty chatmodes (03B, 04, 05) and refactoring Code Researcher focus from exhaustive line numbers to behavioral/architectural mapping. 

## Current State Analysis
- Mixed maturity: Proven (02A, 03A), first-pass (01A, 01B, 02B, X), empty (03B, 04, 05).
- Missing CRITICAL/DO NOT clusters in most first-pass modes.
- Path inconsistencies: `docs/agent/` vs `docs/agents/` in 02A/02B; relative prompt path in 01A.
- No YAML frontmatter templates except Code Researcher.
- No Implementation Reviewer (03B), Documenter (04), PR Agent (05) contents.
- Code Researcher (02A) over-emphasizes line numbers (6 repeated mandates) conflicting with newer behavior-focused requirement.
- Handoff statements absent or incomplete except 01A.
- Status Agent lacks structured workflow and prohibitions.

## Desired End State
Every chatmode contains: CRITICAL section (8–12 DO NOT items), numbered workflow (5–10 steps), >=3 IMPORTANT/CRITICAL inline notes, explicit pause points (where relevant), “What not to do” section, correct artifact paths, correct role boundaries + handoff statement, visible AC coverage mapping block, and (where relevant) frontmatter template snippet for its output artifact(s). Empty chatmodes populated to required length thresholds (03B >200, 04 >200, 05 >150). Code Researcher guidance refocused without losing proven constraints. No proven DO NOT / IMPORTANT content lost unless annotated with rationale.

### Key Discoveries
- 02A + 03A contain patterns to replicate (multi-layer guidance architecture).
- 02B extremely long; re-structure additions must be surgical to avoid bloating further.
- Absence of reviewer/doc/PR roles blocks cross-stage clarity.
- Uniform artifact path is foundational dependency for downstream referencing.

## What We're NOT Doing
- Changing underlying PAW workflow stages or artifact names.
- Adding new agents beyond the 9 enumerated.
- Implementing automation scripts or CI validation (manual/grep-based checks only).
- Altering existing acceptance criteria in `Spec.md`.
- Introducing model-specific enforcement (only descriptive rationale statements).

## Implementation Approach
Incremental, low-risk file edits grouped to minimize rebase conflict potential: normalize foundations (paths/frontmatter) before semantic refactors; create missing files prior to global consistency sweep; embed acceptance mapping after all structural changes to avoid churn. Provide rollback clarity per phase and maintain justification comments for any alteration to proven guidance sections. Verification uses grep/line-count heuristics plus manual review. 

## Phase 1: Baseline Snapshot & Verification Harness
### Overview
Capture current contents for reference and define lightweight verification checklist & grep patterns.
### Changes Required
- (Optional non-committed) Save hashes / line counts for each chatmode.
- Add plan-local section (this file) documenting grep patterns for later phases.
### Success Criteria
Automated:
- [ ] Line count table produced (local/manual) for 9 files.
Manual:
- [ ] Confirm no repository modifications yet.
### Rollback
No changes committed.
### Notes
Creates objective baseline for proving no unintended deletions later.

## Phase 2: Path & Frontmatter Normalization
### Overview
Fix artifact path references and insert frontmatter template guidance where missing (01A, 01B, 02B) without other structural edits.
### Changes Required
- 01A: Change `prompts/spec-research.prompt.md` → `docs/agents/<target_branch>/prompts/spec-research.prompt.md`.
- 02A & 02B: Replace `docs/agent/` patterns → `docs/agents/<target_branch>/...` canonical names.
- Insert YAML frontmatter template snippet (commented or fenced markdown) for Spec.md, SpecResearch.md, ImplementationPlan.md in respective agents.
### Success Criteria
Automated:
- [ ] Grep finds no `docs/agent/` literal strings.
- [ ] Grep finds newly added `docs/agents/<target_branch>/prompts/spec-research.prompt.md` in 01A.
Manual:
- [ ] Templates match required fields (`date`, `target_branch`, `status`, `last_updated`, `summary`).
Rollback: Revert individual files.
Risks: Accidental additional edits—mitigate by minimal diff.

## Phase 3: Code Researcher Behavioral Refactor (02A)
### Overview
Adjust line-number emphasis while preserving prohibitions.
### Changes Required
- Replace each absolute requirement “Always include file:line references” with wording: “Cite exact file paths and selective line references for key entry points or critical logic; focus narrative on behavioral responsibilities and architecture.”
- Add single new IMPORTANT note summarizing behavioral focus.
- Add inline HTML comments (`<!-- rationale: behavioral refocus per Spec FR-3 -->`).
### Success Criteria
Automated:
- [ ] Grep count of phrase `line numbers` reduced (from 6) but still >=1 (historical context kept in docs) OR replaced systematically.
Manual:
- [ ] All original DO NOT bullets intact.
- [ ] IMPORTANT notes preserved plus new behavioral note present.
Rollback: Restore file from baseline hash.

## Phase 4: Spec & Spec Research Agents Alignment (01A, 01B)
### Overview
Add CRITICAL/DO NOT cluster, pause points, “What not to do”, frontmatter templates, handoff clarity.
### Changes Required
- 01A: Insert CRITICAL section at top (8–12 DO NOT items including no commits / PRs / fabrication / skipping unanswered critical questions).
- 01A: Add explicit pause outputs after prompt generation & before final spec.
- 01A: Add “What not to do” section consolidating scattered guardrails.
- 01B: Add CRITICAL section & DO NOT list (sources fabrication, skipping file reads, mixing internal/external facts).
- 01B: Add pause point instruction for external search unavailability resolution.
- 01B: Add frontmatter template guidance for SpecResearch.md.
- Both: Add handoff lines per AC-13.
### Success Criteria
Automated:
- [ ] Grep finds `CRITICAL:` in both files.
- [ ] Each file has >=8 occurrences of `DO NOT`.
Manual:
- [ ] Pause point templates present.
- [ ] Handoff statements match spec wording.
Rollback: Revert files one by one.

## Phase 5: Implementation Planner Reinforcement (02B)
### Overview
Introduce missing CRITICAL section, DO NOT list, pause before Planning PR, frontmatter template, path corrections (if any remaining), explicit handoff.
### Changes Required
- Prepend CRITICAL section referencing phase sizing, verification criteria, no open questions, no speculative placeholders.
- Add consolidated DO NOT section (8–12 items) distinct from existing guidelines.
- Insert pause block: “Plan Draft Ready – Await Human Review Before Opening Planning PR”.
- Add frontmatter template for ImplementationPlan.md (if not already from Phase 2 insertion) with example.
- Add final handoff line to Implementation Agent 03A.
### Success Criteria
Automated:
- [ ] Grep finds `Plan Draft Ready` pause marker.
- [ ] DO NOT count >=8.
Manual:
- [ ] Existing research methodology retained (no deletions except path adjustments).
Rollback: Single file revert.

## Phase 6: Implementer & Impl Reviewer Role Split (03A, 03B)
### Overview
Update 03A to delegate docstrings/PR creation; create full 03B with review + documentation + PR management responsibilities.
### Changes Required
- 03A: Add DO NOT items (docstrings/comments, PR creation). Modify phase completion message to include handoff to 03B.
- 03A: Remove PR creation sentence; optionally annotate removal rationale.
- 03B (new content >200 lines) including:
  - CRITICAL + DO NOT (8–12) including prohibition on functional changes unless addressing review comment.
  - Conditional logic: post-implementation vs responding-to-review.
  - Workflow steps (numbered 1–7) from reading ImplementationPlan.md through PR creation.
  - Phase PR workflow guidance (branch naming, PR title `[Phase N] <concise summary>`, PR description template with sections: Overview, Changes Implemented, Review Notes, Docstring Additions, Remaining Risks, Next Steps).
  - Pause point: “Phase [N] Review Complete – Ready for Human Reviewer” prior to pushing (if manual approval desired) OR after push if automatic.
  - IMPORTANT notes (minimal functional edits, ensure docstrings added, per-comment replies).
  - Handoff logic: either new phase (03A) or proceed to Documenter (04) when final phase merged.
### Success Criteria
Automated:
- [ ] 03B line count >200.
- [ ] 03A contains updated phrase `Handoff to Implementation Review Agent`.
Manual:
- [ ] Removed PR responsibility from 03A.
- [ ] Role boundaries unambiguous.
Rollback: Re-add removed line in 03A; delete 03B file.

## Phase 7: Documenter & PR Agent Creation (04, 05)
### Overview
Author Documenter (04) and PR Agent (05) per length and content requirements.
### Changes Required
- 04: >200 lines; CRITICAL + DO NOT (no code changes, no reimplementation, no scope expansion), enumerated documentation components, frontmatter template for Docs.md, pause before docs PR, handoff to PR Agent.
- 05: >150 lines; CRITICAL + DO NOT list (no merge, no skipping validation), validation workflow, PR title format `[Feature] <brief description>`, PR description template (Overview, Changes Summary, Testing Notes, Documentation, References), final pause message.
### Success Criteria
Automated:
- [ ] Line count thresholds satisfied.
- [ ] Grep finds PR title format pattern in 05 (`[Feature]`).
Manual:
- [ ] Each required template section present.
Rollback: Delete new files.

## Phase 8: Status Agent Enhancement (X)
### Overview
Add standardized pattern set to Status Agent.
### Changes Required
- Add CRITICAL section + DO NOT list (avoid modifying outside markers, no closing issues, no code changes, no reviewer assignment, no fabrication of links).
- Add numbered workflow (collect artifacts, update Issue block, update PR summaries, verify idempotency).
- Add IMPORTANT notes (idempotency, minimal surface edits, label discipline if any future config).
- Add “What not to do” section.
- Add invocation timing explanation.
### Success Criteria
Automated:
- [ ] Grep finds `CRITICAL:` and >=8 `DO NOT`.
Manual:
- [ ] Workflow enumerated with numbers.
Rollback: Revert single file.

## Phase 9: Consistency & Handoff Sweep
### Overview
Uniform formatting and cross-stage handoff alignment across all 9 files.
### Changes Required
- Ensure each file contains final handoff line as per AC-13 table.
- Standardize headings (single `#` title, `##` subsections) where inconsistent.
- Ensure all IMPORTANT/CRITICAL prefixes capitalized consistently.
- Add acceptance coverage block (visible) at end of each chatmode referencing AC IDs it satisfies.
### Success Criteria
Automated:
- [ ] Each file contains `AC Coverage` marker.
- [ ] Each file contains at least one `Handoff` phrase.
Manual:
- [ ] Visual consistency & no lost proven guidance text.
Rollback: Per-file revert.

## Phase 10: Acceptance Matrix & Verification Commands
### Overview
Embed matrix linking AC-1..AC-15 to phases & files; provide repeatable grep commands.
### Changes Required
- Add `## Acceptance Coverage Matrix` to this plan mapping AC → Phase(s) → File(s).
- Provide verification command list.
### Success Criteria
Manual: Matrix present, complete.
Rollback: Remove matrix section.

## Phase 11: Final Review & Rollback Guidance
### Overview
Summarize diffs, risk mitigation, and supply rollback guidance.
### Changes Required
- Add final summary section to this file.
- Provide per-file revert instructions.
### Success Criteria
Manual: Section present.

---

## Acceptance Coverage Matrix (Planned)
| AC | Description (Abbrev) | Phase(s) | Target Files |
|----|----------------------|----------|--------------|
| AC-1 | Spec Agent alignment | 4,9 | 01A |
| AC-2 | Spec Research alignment | 4,9 | 01B |
| AC-3 | Code Research refactor | 3,9 | 02A |
| AC-4 | Impl Planner alignment | 5,9 | 02B |
| AC-5 | Implementer split (03A side) | 6,9 | 03A |
| AC-6 | Impl Reviewer creation | 6,9 | 03B |
| AC-7 | Documenter creation | 7,9 | 04 |
| AC-8 | PR Agent creation | 7,9 | 05 |
| AC-9 | Status alignment | 8,9 | X |
| AC-10 | Pattern consistency | 9 | All 9 |
| AC-11 | Artifact paths | 2,5 | 01A,01B,02A,02B,03A,03B,04,05,X |
| AC-12 | Handoff clarity | 4,5,6,7,8,9 | All 9 |
| AC-13 | YAML frontmatter templates | 2,4,5,7 | 01A,01B,02A,02B,04 |
| AC-14 | Preservation proven patterns | 3,5,6,9 | 02A,03A (+ others for checks) |
| AC-15 | Completeness / no TODOs | 9,11 | All 9 |

## Verification Strategy
### Automated (Manual Commands to Run)
(Use from repo root; examples—adapt as needed.)
```
# Find any lingering singular path usage
grep -R "docs/agent/" .github/chatmodes || true

# Ensure every chatmode has CRITICAL section
for f in .github/chatmodes/PAW-*; do echo "Checking $f"; grep -q "CRITICAL:" "$f" || echo "MISSING CRITICAL in $f"; done

# Count DO NOT occurrences (expect >=8)
for f in .github/chatmodes/PAW-*; do echo -n "$f: "; grep -c "DO NOT" "$f"; done

# Ensure handoff phrases present
grep -R "Handoff" .github/chatmodes/ || true

# Ensure AC Coverage block exists
grep -R "AC Coverage" .github/chatmodes/ || true
```

### Manual Checklist
- Each new/modified file readable <10 minutes.
- Behavior vs implementation focus clear (02A after refactor).
- No proven DO NOT / IMPORTANT removed without inline rationale comment.
- Each output artifact template present where required.
- Handoff phrasing matches spec list exactly (typo check).
- New files meet line count thresholds (03B>200,04>200,05>150).
- No `TODO`, `TBD`, `[placeholder]` tokens remain.

## Risk Mitigation & Rollback
| Risk | Phase | Mitigation | Rollback |
|------|-------|------------|----------|
| R-1 Guidance loss | 3–9 | Baseline snapshot + diff review | Git checkout original file hash |
| R-2 Over-simplify 02A | 3 | Keep at least one example line-ref phrase + add rationale comments | Revert 02A file |
| R-3 Role confusion 03A/03B | 6 | Explicit DO NOT reciprocity + handoff line | Revert 03A edits + remove 03B |
| R-4 Chatmode bloat/token limits | 6–8 | Only additive essential sections, avoid duplication | Trim non-essential examples (future) |

## Rollback Guidance (General)
To revert a single file to last commit:
```
git checkout HEAD -- .github/chatmodes/PAW-02A\ Code\ Researcher.chatmode.md
```
To discard all uncommitted changes:
```
git reset --hard HEAD
```
To revert a committed phase set (e.g. Phase 6): identify commit(s) and:
```
git revert <commit_sha>
```

## Open Questions
None (User approved plan structure; AC mapping embedded; visible coverage required). 

## Next Steps / Handoff
Proceed with Phase 2 implementation (Phase 1 is conceptual / baseline). After completion of each phase, run automated grep checks and update this plan status section (optional) before moving forward.

---

## Phase Status Tracking
(Will be populated during execution)

| Phase | State | Notes |
|-------|-------|-------|
| 1 | Complete (conceptual) | Baseline captured manually | 
| 2 | Pending |  |
| 3 | Pending |  |
| 4 | Pending |  |
| 5 | Pending |  |
| 6 | Pending |  |
| 7 | Pending |  |
| 8 | Pending |  |
| 9 | Pending |  |
| 10 | Pending |  |
| 11 | Pending |  |

