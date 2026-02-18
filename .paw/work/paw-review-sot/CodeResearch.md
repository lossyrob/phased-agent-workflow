# Code Research: Society-of-Thought Review Mode for PAW Review

## Q1: PAW Review Workflow Orchestration

**Source**: `skills/paw-review-workflow/SKILL.md`

### Current Evaluation Stage Routing

The Evaluation Stage is defined at `skills/paw-review-workflow/SKILL.md:150-163`:

```markdown
### Evaluation Stage

**Skills**: `paw-review-impact`, `paw-review-gap`

**Sequence**:
1. Run `paw-review-impact` activity
   - Input: All understanding artifacts
   - Output: `ImpactAnalysis.md`
   
2. Run `paw-review-gap` activity
   - Input: All understanding + impact artifacts
   - Output: `GapAnalysis.md`

**Stage Gate**: Verify ImpactAnalysis.md, GapAnalysis.md exist before proceeding.
```

**Key finding**: The Evaluation Stage currently has **no conditional logic or mode checks**. It always runs both `paw-review-impact` then `paw-review-gap` in sequence. There is no `review_mode` field read, no branching, no alternative paths.

### Where SoT Branch Would Be Inserted

The new `society-of-thought` branch should be inserted **at the start of the Evaluation Stage** (around line 150), replacing the entire impact+gap sequence with a conditional:

- If `review_mode` is `society-of-thought` → load `paw-sot` skill with constructed review context, producing `REVIEW-{SPECIALIST}.md` + `REVIEW-SYNTHESIS.md`
- Otherwise (default/`single-model`) → run existing `paw-review-impact` → `paw-review-gap` sequence

The stage gate would also need updating: instead of checking for `ImpactAnalysis.md` + `GapAnalysis.md`, check for `REVIEW-SYNTHESIS.md` when in SoT mode.

### How Workflow Determines Which Skills to Invoke

The workflow uses **hardcoded skill names** in its orchestration sequence (`skills/paw-review-workflow/SKILL.md:150-163`). There is no dynamic skill discovery or mode-based routing mechanism. Each stage lists explicit skill names. The SoT mode would need to add a conditional branch to the Evaluation Stage section of the workflow skill.

### Subagent Contract

Activity skills are executed via delegated agent sessions (`skills/paw-review-workflow/SKILL.md:62-90`). Each subagent must load its skill first via `paw_get_skill`, then execute. However, for SoT mode, the paw-sot skill is **loaded into the calling agent's session** (not spawned as a subagent) per `skills/paw-sot/SKILL.md:9`.

---

## Q2: ReviewContext.md Structure

### Current Fields

**Source**: `skills/paw-review-understanding/SKILL.md:221-277` (template)

ReviewContext.md currently contains:
- **YAML frontmatter**: `date`, `git_commit`, `branch`, `repository`, `topic`, `tags`, `status`
- **Header fields**: PR Number/Branch, Remote, Base Branch, Head Branch, Base Commit, Base Commit Source, Head Commit, Repository, Author, Title, State, Created, CI Status, Labels, Reviewers, Linked Issues, Changed Files, Artifact Paths
- **Sections**: Description, Flags (CI failures, breaking changes), Artifacts checklist, Metadata

### Where Created

ReviewContext.md is created by `paw-review-understanding` skill during Step 1 (`skills/paw-review-understanding/SKILL.md:82-100`).

### Current `review_mode` Usage

**`review_mode` does NOT exist as a field in ReviewContext.md**. The term `review_mode` appears only in the Spec.md for this feature. The existing PAW Review workflow has no concept of review modes — unlike the implementation workflow which has `Final Review Mode` in WorkflowContext.md (`skills/paw-init/SKILL.md:37,122`).

### New Fields Needed for SoT Configuration

Based on the Spec (FR-001 through FR-009) and the paw-final-review adapter pattern, ReviewContext.md needs:
- `review_mode`: `single-model` (default) | `society-of-thought`
- `review_specialists`: `all` (default) | comma-separated names | `adaptive:<N>`
- `review_interaction_mode`: `parallel` (default) | `debate`
- `review_interactive`: `true` | `false` | `smart`
- `review_specialist_models`: `none` (default) | model pool | pinned pairs | mixed

**Open question**: How are these fields populated? The implementation workflow uses `paw-init` to configure WorkflowContext.md. PAW Review has no `paw-init` equivalent — ReviewContext.md is created by `paw-review-understanding`. Either:
1. Fields are passed as parameters during `/paw-review` invocation
2. Fields are read from a user-level or project-level config file
3. The `paw-review-workflow` skill reads them from some configuration source before delegating to understanding

---

## Q3: paw-sot Engine Contract

**Source**: `skills/paw-sot/SKILL.md`

### Review Context Contract

Defined at `skills/paw-sot/SKILL.md:22-34`:

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `type` | yes | `diff` \| `artifacts` \| `freeform` | What kind of content is being reviewed |
| `coordinates` | yes | diff range, artifact paths, or content description | What to point specialists at |
| `output_dir` | yes | directory path | Where to write REVIEW-*.md files |
| `specialists` | no | `all` (default) \| comma-separated names \| `adaptive:<N>` | Which specialists to invoke |
| `interaction_mode` | yes | `parallel` \| `debate` | How specialists interact |
| `interactive` | yes | `true` \| `false` \| `smart` | Whether to pause for user decisions |
| `specialist_models` | no | `none` \| model pool \| pinned pairs \| mixed | Model assignment for specialists |
| `framing` | no | free text | Caller-provided preamble for `freeform` type |

### How paw-sot Is Invoked

Per `skills/paw-sot/SKILL.md:9`:
> This skill is **loaded into the calling agent's session** (not spawned as a subagent), preserving user interactivity for trade-off decisions and moderator mode.

The calling skill loads paw-sot, provides the review context, and paw-sot orchestrates subagents internally. This is distinct from the usual PAW Review subagent pattern where each activity skill is a separate subagent session.

### Artifacts Produced

Per `skills/paw-sot/SKILL.md:222-229`:
- `REVIEW-{SPECIALIST-NAME}.md` per specialist (all modes)
- `REVIEW-SYNTHESIS.md` (all modes)
- `.gitignore` with `*` in the output directory

All artifacts written to the review context's `output_dir`.

### `type: diff` Preamble

Per `skills/paw-sot/SKILL.md:40-41`:
> **Type `diff`** (code/implementation review):
> You are reviewing implementation changes (code diff). Apply your cognitive strategy and domain expertise to the actual code changes. Look for bugs, security issues, performance problems, pattern violations, and correctness gaps in the diff. Cite specific file paths and line numbers.

This is appropriate for PR review — same preamble used by paw-final-review.

### `interactive: smart` Behavior

Per `skills/paw-sot/SKILL.md:153`:
- Trade-off detection pauses in `smart` mode to present trade-offs to the user
- Moderator mode skip condition (`skills/paw-sot/SKILL.md:249`): If `interactive` is `smart` with no significant findings (only `consider`-tier), skip moderator mode

### Moderator Mode

Per `skills/paw-sot/SKILL.md:232-249`: Moderator mode is a **separate invocation** from orchestration+synthesis. The calling skill invokes paw-sot once for orchestration, handles its own resolution flow, then optionally invokes paw-sot again for moderator mode.

---

## Q4: paw-final-review Adapter Pattern (Reference Implementation)

**Source**: `skills/paw-final-review/SKILL.md`

### Review Context Construction

The adapter mapping is defined at `skills/paw-final-review/SKILL.md:138-149`:

```markdown
| Review Context Field | Source |
|---------------------|--------|
| `type` | `diff` |
| `coordinates` | Diff: `git diff <base-branch>...<target-branch>`; Artifacts: Spec.md, ImplementationPlan.md, CodeResearch.md paths |
| `output_dir` | `.paw/work/<work-id>/reviews/` |
| `specialists` | `Final Review Specialists` value from WorkflowContext.md |
| `interaction_mode` | `Final Review Interaction Mode` value from WorkflowContext.md |
| `interactive` | `Final Review Interactive` value from WorkflowContext.md |
| `specialist_models` | `Final Review Specialist Models` value from WorkflowContext.md |
```

### Key Adapter Patterns to Replicate for PAW Review

1. **Type is always `diff`** — both final review and PR review operate on code diffs
2. **Coordinates include both diff command AND artifact paths** — specialists need both the raw diff and contextual documents
3. **Output directory is the review artifacts directory** — for PAW Review this would be `.paw/reviews/<identifier>/`
4. **Configuration fields map 1:1** from the config source (WorkflowContext.md for final review → ReviewContext.md for PAW Review)
5. **Post-SoT flow**: After paw-sot completes, paw-final-review proceeds to Step 5 (Resolution) to process REVIEW-SYNTHESIS.md findings

### Output Handling

Per `skills/paw-final-review/SKILL.md:291-296`:
- SoT mode produces `REVIEW-{SPECIALIST}.md` per specialist + `REVIEW-SYNTHESIS.md` (produced by paw-sot)
- All files in `.paw/work/<work-id>/reviews/`, gitignored
- Resolution processes findings by severity (must-fix → should-fix → consider), with trade-offs from "Trade-offs Requiring Decision" section

### Moderator Mode Invocation

Per `skills/paw-final-review/SKILL.md:265-273`: After finding resolution, if mode is SoT and interactive is `true` or `smart` with significant findings, invoke paw-sot a second time for moderator mode with `type`, `output_dir`, and review coordinates.

**Key difference for PAW Review**: PAW Review doesn't have a resolution step like paw-final-review (apply/skip/discuss). Instead, SoT findings feed into the Output Stage (feedback → critic → github). Moderator mode may not be applicable to PAW Review's flow, or it may need to be inserted differently.

---

## Q5: paw-review-feedback Input Format

**Source**: `skills/paw-review-feedback/SKILL.md`

### Expected Input Artifacts

Per `skills/paw-review-feedback/SKILL.md:14-21`:
```markdown
- `ReviewContext.md` (PR metadata and parameters)
- `CodeResearch.md` (baseline codebase understanding)
- `DerivedSpec.md` (what the PR is trying to achieve)
- `ImpactAnalysis.md` (system-wide impact assessment)
- `GapAnalysis.md` (categorized findings with evidence)
- `CrossRepoAnalysis.md` (optional—only for multi-repo reviews)
```

If any required artifact is missing, it reports blocked status.

### How It Receives GapAnalysis.md Findings

The feedback skill transforms GapAnalysis.md findings directly (`skills/paw-review-feedback/SKILL.md:39-98`):
1. **Step 1**: Batch related findings from GapAnalysis.md (One Issue, One Comment)
2. **Step 2**: Build comment objects with fields: Type (inline/thread), File+lines, Severity (Must/Should/Could from GapAnalysis categorization), Category, Description, Suggestion
3. **Step 3**: Generate rationale sections citing Evidence + Baseline Pattern + Impact + Best Practice
4. **Step 4**: Create ReviewComments.md

GapAnalysis.md finding fields referenced: File, Category, Evidence, Issue, Impact, Suggestion, Related.

### Mapping Needed for REVIEW-SYNTHESIS.md → Feedback Pipeline

REVIEW-SYNTHESIS.md structure (from `skills/paw-sot/SKILL.md:180-218`) organizes findings as:
- **Must-Fix Findings**: severity: must-fix, with specialist attribution, confidence, grounding tier
- **Should-Fix Findings**: severity: should-fix
- **Consider**: severity: consider
- **Trade-offs Requiring Decision**: trade-off items
- **Observations**: contextual-tier, not actionable

The mapping from REVIEW-SYNTHESIS.md to paw-review-feedback input requires:
1. **Severity mapping**: must-fix → Must, should-fix → Should, consider → Could
2. **File:line references**: REVIEW-SYNTHESIS.md findings include specialist citations with file:line — these map to the feedback skill's File+lines fields
3. **Impact from specialist evidence**: Instead of ImpactAnalysis.md as a separate source, impact information is embedded in specialist findings and synthesis
4. **Observations section**: Should be excluded from comment generation (contextual-tier, not actionable per `skills/paw-sot/SKILL.md:178`)
5. **Trade-offs**: Need special handling — either resolved by user before feeding into feedback, or passed through as a special category

**Critical**: paw-review-feedback currently has a **hard prerequisite** on `ImpactAnalysis.md` and `GapAnalysis.md` (`skills/paw-review-feedback/SKILL.md:14-21`). In SoT mode, these don't exist. The feedback skill needs to accept REVIEW-SYNTHESIS.md as an alternative input, or the workflow skill needs to mediate.

Similarly, `paw-review-critic` has prerequisites on `ImpactAnalysis.md` and `GapAnalysis.md` (`skills/paw-review-critic/SKILL.md:20-22`).

---

## Q6: paw-review-gap and paw-review-impact Artifacts

### GapAnalysis.md Output Structure

**Source**: `skills/paw-review-gap/SKILL.md:448-570`

```markdown
# Gap Analysis for <PR Title or Branch>

## Summary
**Must Address**: X findings
**Should Address**: Y findings
**Could Consider**: Z findings

## Positive Observations
- ✅ [specific good practices]

## Must Address (Correctness/Safety/Security)
### Finding M1: <Title>
**File**: `path/to/file.ext:123-130`
**Category**: Correctness | Safety | Security
**Evidence**: <exact code reference>
**Issue**: <description>
**Impact**: <consequences>
**Suggestion**: <fix>
**Related**: <related finding IDs>

## Should Address (Quality/Completeness)
### Finding S1: <Title>
[same structure with Rationale instead of Impact]

## Could Consider (Optional Improvements)
### Finding C1: <Title>
[structure with Observation + Benefit]

## Test Coverage Assessment
[quantitative + qualitative]

## Scope Assessment
```

### ImpactAnalysis.md Output Structure

**Source**: `skills/paw-review-impact/SKILL.md:379-513`

```markdown
# Impact Analysis for <PR Title or Branch>

## Summary
## Baseline State
## Integration Points (table)
## Breaking Changes (table)
## Performance Implications
## Security & Authorization Changes
## Design & Architecture Assessment
## User Impact Evaluation
## Deployment Considerations
## Dependencies & Versioning
## Risk Assessment (with Code Health Trend)
```

### How These Are Referenced Downstream

1. **paw-review-gap** consumes `ImpactAnalysis.md` as Phase 2 prerequisite (`skills/paw-review-gap/SKILL.md:32`)
2. **paw-review-feedback** consumes both as prerequisites (`skills/paw-review-feedback/SKILL.md:19-20`), references findings for comment generation
3. **paw-review-critic** consumes both as supporting artifacts (`skills/paw-review-critic/SKILL.md:20-22`)
4. **paw-review-workflow Output Stage** passes them to feedback skill (`skills/paw-review-workflow/SKILL.md:194`)

---

## Q7: Existing Review Mode Support

### `review_mode` as a Field

`review_mode` **does not currently exist** as a recognized field in PAW Review. The grep across all skills found zero matches outside the Spec.md feature file.

The implementation workflow uses `Final Review Mode` and `Planning Review Mode` in WorkflowContext.md (configured via `paw-init`), but PAW Review has no equivalent configuration mechanism.

### Existing Mode Switching Patterns

**paw-final-review** (`skills/paw-final-review/SKILL.md:86-161`) is the reference for mode switching:
- Reads `Final Review Mode` from WorkflowContext.md
- Branches: `single-model` → single subagent, `multi-model` → parallel per-model subagents + synthesis, `society-of-thought` → paw-sot invocation
- VS Code conditionals: `{{#vscode}}` / `{{#cli}}` template guards for CLI-only features

**paw-planning-docs-review** (`skills/paw-planning-docs-review/SKILL.md`) has similar `single-model` vs `multi-model` branching.

### Multi-Model Patterns in PAW Review

**None exist**. PAW Review currently has no multi-model or mode-switching capability. The Evaluation Stage always runs single-perspective `paw-review-impact` + `paw-review-gap`.

The SoT feature would be the **first mode-switching mechanism** added to PAW Review's evaluation stage.

---

## Q8: Documentation Infrastructure

### Existing PAW Review Documentation

- `docs/specification/review.md` — Full specification of the 3-stage review workflow (R1 Understanding, R2 Evaluation, R3 Output)
- `docs/guide/society-of-thought-review.md` — **Already exists** as a user guide for SoT in the context of paw-final-review (implementation workflow). Covers configuration, specialists, interaction modes, model assignment, custom specialists, synthesis, moderator mode.

### Where SoT Review Mode Docs Would Go

- **User Guide**: `docs/guide/society-of-thought-review.md` already exists but is scoped to paw-final-review. It would need updating to cover PAW Review's SoT mode as well.
- **Specification**: `docs/specification/review.md` needs updating to document the SoT alternative path in Stage R2 (Evaluation).
- **Reference**: `docs/reference/artifacts.md` may need REVIEW-SYNTHESIS.md and REVIEW-{SPECIALIST}.md added as PAW Review artifacts.

### mkdocs.yml Structure

Per `mkdocs.yml:61-78`:
```yaml
nav:
  - Home: index.md
  - User Guide:
    - Getting Started: guide/index.md
    - VS Code Extension: guide/vscode-extension.md
    - CLI Installation: guide/cli-installation.md
    - Workflow Modes: guide/workflow-modes.md
    - Stage Transitions: guide/stage-transitions.md
    - Two Workflows: guide/two-workflows.md
    - Society-of-Thought Review: guide/society-of-thought-review.md
  - Specification:
    - Overview: specification/index.md
    - Implementation Workflow: specification/implementation.md
    - Review Workflow: specification/review.md
  - Reference:
    - Agents: reference/agents.md
    - Artifacts: reference/artifacts.md
```

The `Society-of-Thought Review` page is already in the nav. No new pages needed — just updates to existing pages.

---

## Key Implementation Insights

### 1. Thin Adapter Pattern is Validated
The paw-final-review adapter pattern (`skills/paw-final-review/SKILL.md:136-150`) proves the approach: construct a review context from workflow config, invoke paw-sot, map output back. PAW Review needs the same pattern but sourcing config from ReviewContext.md instead of WorkflowContext.md.

### 2. Evaluation Stage Has No Existing Branching
The entire Evaluation Stage in `paw-review-workflow` is unconditional (`skills/paw-review-workflow/SKILL.md:150-163`). Adding SoT mode requires introducing the **first conditional branch** in this stage.

### 3. Prerequisite Chain Break is the Main Challenge
`paw-review-feedback` and `paw-review-critic` have hard prerequisites on `ImpactAnalysis.md` and `GapAnalysis.md` (`skills/paw-review-feedback/SKILL.md:14-21`, `skills/paw-review-critic/SKILL.md:17-22`). In SoT mode, these artifacts don't exist — `REVIEW-SYNTHESIS.md` replaces them. Both downstream skills need updated prerequisite logic to accept the SoT alternative.

### 4. ReviewContext.md Needs Extension Mechanism
ReviewContext.md has no `review_mode` field and no mechanism for SoT configuration (`skills/paw-review-understanding/SKILL.md:221-277`). New fields must be added, and a mechanism for setting them must be defined (invocation parameters, config file, or workflow-level defaults).

### 5. paw-sot Loads Into Calling Session (Not Subagent)
Unlike other activity skills that run as subagents, paw-sot loads into the calling agent's session (`skills/paw-sot/SKILL.md:9`). This means the `paw-review-workflow` orchestrator (or a dedicated SoT evaluation activity skill) must load paw-sot directly, not delegate it as a subagent.

### 6. Output Directory Alignment
paw-final-review writes to `.paw/work/<work-id>/reviews/`. PAW Review writes to `.paw/reviews/<identifier>/`. The SoT output_dir for PAW Review should be `.paw/reviews/<identifier>/` to stay consistent with the existing artifact directory structure (`skills/paw-review-workflow/SKILL.md:96-107`).

### 7. Findings Severity Mapping
REVIEW-SYNTHESIS.md uses `must-fix` / `should-fix` / `consider` severity. GapAnalysis.md uses `Must` / `Should` / `Could`. The mapping is straightforward but must be documented in the adapter.

### 8. No Moderator Mode for PAW Review (Likely)
paw-final-review uses moderator mode because it has interactive resolution (apply/skip/discuss). PAW Review's Output Stage generates comments for GitHub posting — there's no interactive resolution step. Moderator mode may be skipped for the initial implementation, or optionally offered after REVIEW-SYNTHESIS.md is produced.

### 9. Existing SoT Documentation Covers Final Review Only
`docs/guide/society-of-thought-review.md` is comprehensive but scoped to paw-final-review. It needs updating to mention PAW Review's SoT mode, or the page could be restructured to cover both use cases.

### 10. Stage Gate Needs Mode-Aware Verification
The Evaluation Stage gate (`skills/paw-review-workflow/SKILL.md:163`) checks for `ImpactAnalysis.md` + `GapAnalysis.md`. In SoT mode, it should check for `REVIEW-SYNTHESIS.md` instead. The Output Stage's artifact references also need conditional logic.
