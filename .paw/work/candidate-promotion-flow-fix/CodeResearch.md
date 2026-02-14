# Code Research: Candidate Promotion Flow Fix

**Work ID**: candidate-promotion-flow-fix
**Issue**: lossyrob/phased-agent-workflow#234
**Date**: 2025-07-25

## Research Questions

### 1. paw-pr Pre-flight Validation — Unresolved Phase Candidates

**File**: `skills/paw-pr/SKILL.md`

The pre-flight validation section (lines 22–52) lists "Required Checks" that must pass before PR creation. The relevant check is under **Phase Implementation** (lines 27–31):

```markdown
**Phase Implementation**:
- All phases in ImplementationPlan.md marked complete
- All phase PRs merged (prs strategy) or commits pushed (local strategy)
- Target branch exists with implementation commits
- No unresolved phase candidates (`- [ ]` items in `## Phase Candidates`)
```
— `skills/paw-pr/SKILL.md:27-31`

The blocking behavior is defined at line 23:

```markdown
Before creating the PR, verify and report status. Block on failures unless user explicitly confirms.
```
— `skills/paw-pr/SKILL.md:23`

Additionally, under **Open Questions Resolved** (lines 48–52):

```markdown
- Unresolved items → block and report with recommendation
```
— `skills/paw-pr/SKILL.md:52`

**Gap identified**: The pre-flight check at line 31 detects unresolved candidates and blocks, but it only says "Block on failures unless user explicitly confirms" (line 23). There is **no instruction to route back to the Candidate Promotion Flow**. The agent can (and did) unilaterally resolve the candidates itself or ask the user to confirm proceeding despite the blocker, rather than routing to the proper Candidate Promotion Flow in PAW.agent.md. The pre-flight needs to explicitly instruct: "report as blocker and direct orchestrator to run Candidate Promotion Flow before proceeding."

---

### 2. paw-transition Step 2.5 — Candidate Promotion Check

**File**: `skills/paw-transition/SKILL.md`

Step 2.5 is defined at lines 54–63:

```markdown
### Step 2.5: Candidate Promotion Check

When next activity would be `paw-pr` (all planned phases complete), check for phase candidates:

1. Read ImplementationPlan.md `## Phase Candidates` section
2. Count **unresolved** candidates: `- [ ]` items WITHOUT terminal tags (`[skipped]`, `[deferred]`, `[not feasible]`)
3. If unresolved candidates exist: set `promotion_pending = true` and extract candidate descriptions
4. Otherwise: set `promotion_pending = false`

If `promotion_pending = true`, return candidates in structured output. PAW orchestrator handles user interaction.
```
— `skills/paw-transition/SKILL.md:54-63`

The structured output includes `promotion_pending` and `candidates` fields (lines 157–158):

```markdown
- promotion_pending: [true | false] (only when next would be paw-pr)
- candidates: [list of unresolved candidate descriptions] (only if promotion_pending)
```
— `skills/paw-transition/SKILL.md:157-158`

Terminal resolution markers are defined at lines 169–177:

```markdown
## Candidate Resolution Markers

Terminal markers used in Step 2.5 to identify resolved candidates:
- `- [x] [promoted] <desc>` — Elaborated into a full phase
- `- [x] [skipped] <desc>` — User chose not to pursue
- `- [x] [deferred] <desc>` — Future work outside current workflow
- `- [x] [not feasible] <desc>` — Code research revealed infeasibility

Unresolved: `- [ ]` items without terminal tags. Empty section or all-resolved → `promotion_pending = false`.
```
— `skills/paw-transition/SKILL.md:169-177`

**Observation**: The mechanism is well-defined. The issue is that paw-transition must actually be **delegated as a subagent** for this to fire. If the agent handles the transition inline (as happened in breakpoint 1), Step 2.5 is skipped entirely.

---

### 3. PAW.agent.md — Candidate Promotion Flow & Pre-paw-pr Checks

**File**: `agents/PAW.agent.md`

#### Candidate Promotion Flow (lines 115–124)

```markdown
### Candidate Promotion Flow

When `paw-transition` returns `promotion_pending = true` with a `candidates` list:

1. Present each candidate to user with options: **Promote**, **Skip**, **Defer**
2. For each decision:
   - **Promote**: Update candidate to `- [x] [promoted] <desc>` in ImplementationPlan.md. Run `paw-code-research` + `paw-planning` to elaborate into a full phase, then follow standard mandatory transitions (plan-review → implement → impl-review). If research reveals infeasibility, update to `- [x] [not feasible] <desc>` and continue with remaining candidates. User may request a lightweight promote (skip plan-review) for trivial changes.
   - **Skip**: Update candidate to `- [x] [skipped] <desc>` in ImplementationPlan.md
   - **Defer**: Update candidate to `- [x] [deferred] <desc>` in ImplementationPlan.md
3. After all candidates resolved: proceed to `paw-pr`
```
— `agents/PAW.agent.md:115-124`

#### Transition Response Handling (lines 104–113)

```markdown
- `promotion_pending`: If `true` **and not paused**, run Candidate Promotion Flow (see below)
```
— `agents/PAW.agent.md:107`

#### Stage Boundary Rule (lines 36–51)

```markdown
### Stage Boundary Rule (CRITICAL)

**After EVERY stage boundary, delegate to `paw-transition` before proceeding.**
```
— `agents/PAW.agent.md:36-38`

The post-final-review boundary is listed at line 47:

```markdown
- paw-final-review complete
```
— `agents/PAW.agent.md:47`

And the Hybrid Execution Model (line 182) confirms paw-transition is a subagent:

```markdown
- After `paw-final-review` completes: **Delegate to `paw-transition`** (this is a stage boundary)
```
— `agents/PAW.agent.md:182`

#### Before Yielding Control (lines 126–140)

```markdown
## Before Yielding Control

When **stopping work or pausing the workflow**, verify:

1. **Check stage boundary**—Did you just complete an activity at a stage boundary?
2. **If yes**—Run `paw-transition` first (don't yield yet)
3. **If transition returned `pause_at_milestone: true`**—Safe to yield (milestone pause)
4. **If transition returned `pause_at_milestone: false`**—Continue to next activity

**Valid reasons to yield:**
- Transition returned `pause_at_milestone: true`
- Blocked and need user decision
- User explicitly requested pause
- Workflow complete

**NEVER yield after a stage boundary without running paw-transition first.**
```
— `agents/PAW.agent.md:126-140`

**Gap identified**: There is **no explicit pre-paw-pr guardrail** in PAW.agent.md that independently checks for unresolved candidates. The Candidate Promotion Flow is only triggered by `promotion_pending = true` from `paw-transition`. If `paw-transition` is not delegated (breakpoint 1), or if the agent reaches paw-pr through a code path that doesn't pass through the transition check, there is no safety net. The "Before Yielding Control" section (lines 126–140) enforces running paw-transition at stage boundaries, but doesn't specifically mention candidate promotion as a verification step before paw-pr.

---

### 4. paw-planning-docs-review — Minimal Mode Handling

**File**: `skills/paw-planning-docs-review/SKILL.md`

The skill handles minimal mode (no Spec.md) through graceful degradation rather than a hard block:

**Step 2: Gather Review Context** (lines 43–52):

```markdown
**Required context**:
- ImplementationPlan.md — phases, architecture, file paths, success criteria

**Contextual**:
- Spec.md — requirements, user stories, success criteria, scope boundaries (absent in minimal mode — note reduced scope in review output)

**Optional context**:
- CodeResearch.md — existing patterns, conventions, system behavior

If Spec.md or CodeResearch.md is missing, proceed with available artifacts. Note reduced coverage in the review output.
```
— `skills/paw-planning-docs-review/SKILL.md:43-52`

In the review prompt template (line 74):

```markdown
[Include CodeResearch.md content, or note "Not available — reduced coverage review"]
```
— `skills/paw-planning-docs-review/SKILL.md:74`

**Summary**: Only `ImplementationPlan.md` is required. Spec.md and CodeResearch.md are gracefully handled when absent — the review proceeds with reduced scope and notes the limitation in output.

---

### 5. Integration Tests — Candidate Promotion & paw-pr Pre-flight

**Directory**: `tests/integration/tests/workflows/`

#### No candidate promotion tests exist

A search for `candidate`, `promotion`, `promotion_pending`, `unresolved candidate`, and `phase candidate` across the entire `tests/` directory returned **zero matches**. There are no integration tests covering:
- Candidate Promotion Flow
- `promotion_pending` handling in paw-transition
- paw-pr pre-flight detection of unresolved candidates
- Resolution marker handling (`[promoted]`, `[skipped]`, `[deferred]`, `[not feasible]`)

#### Related existing tests

**`transition-review-policy.test.ts`** (`tests/integration/tests/workflows/transition-review-policy.test.ts`):
- Tests paw-transition's review policy handling (legacy mapping, pause_at_milestone)
- Seeds WorkflowContext.md with various review policy values
- Does **not** seed ImplementationPlan.md with Phase Candidates section
- Does **not** test Step 2.5 or `promotion_pending` output
- Runtime: ~2-4 minutes

Available workflow tests (none cover candidate promotion):
- `full-local-workflow.test.ts` — Golden path: spec → plan → implement
- `minimal-workflow.test.ts` — Minimal mode: plan → implement
- `transition-review-policy.test.ts` — Review policy values and pause behavior
- `paw-spec.test.ts`, `paw-planning.test.ts`, `paw-implement.test.ts` — Individual activity tests
- `spec-review.test.ts`, `code-research.test.ts`, `work-shaping.test.ts` — Other activity tests
- `planning-docs-review.test.ts`, `smart-interactive-mode.test.ts` — Planning docs review tests
- `git-branching.test.ts`, `tool-policy.test.ts` — Infrastructure tests

---

## Summary of Gaps for Option C Fix

### Gap 1: paw-pr pre-flight lacks routing instruction (Option A)
- **Location**: `skills/paw-pr/SKILL.md:23,31`
- **Current**: Detects unresolved candidates and blocks, but allows user to "explicitly confirm" to bypass
- **Problem**: Agent can unilaterally resolve candidates or bypass with user confirm, rather than routing to Candidate Promotion Flow
- **Fix**: When unresolved phase candidates are detected, report as a hard blocker and explicitly instruct the orchestrator to run the Candidate Promotion Flow — not a user-confirmable skip

### Gap 2: PAW.agent.md lacks independent pre-paw-pr guardrail (Option B)
- **Location**: `agents/PAW.agent.md:115-124` (Candidate Promotion Flow), no pre-paw-pr check exists
- **Current**: Candidate Promotion Flow only triggers via `promotion_pending` from paw-transition
- **Problem**: If paw-transition is skipped/handled inline, no safety net catches unresolved candidates before paw-pr
- **Fix**: Add guardrail in PAW.agent.md — before loading paw-pr, independently verify all candidates resolved; if not, run Candidate Promotion Flow

### Gap 3: No integration test coverage
- **Location**: `tests/integration/tests/workflows/` — no candidate promotion tests
- **Fix**: Add integration test that seeds ImplementationPlan.md with unresolved Phase Candidates and validates paw-transition returns `promotion_pending = true`
