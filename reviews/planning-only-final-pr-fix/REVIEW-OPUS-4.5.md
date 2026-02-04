# PR #198 Review: Fix `planning-only` Review Policy Final PR Pause Timing

## Summary

This PR correctly addresses Issue #197 by adding `paw-pr complete (Final PR created)` as a stage boundary and clarifying the stage-to-milestone mapping to distinguish "all phases complete" from "Final PR".

---

## 1. Correctness ✅

**The fix correctly addresses the bug.** The root cause analysis is accurate:

| Before | After |
|--------|-------|
| "all phases complete" was mapped to "Final PR" milestone | "all phases complete" maps to "Phase completion (last phase)" |
| `planning-only` paused before `paw-pr` ran | `planning-only` auto-proceeds to `paw-pr`, pauses after |

**The logic chain now correctly implements:**
- `all phases complete` → milestone = "Phase completion (last phase)" → `planning-only` does NOT pause
- `paw-pr complete` → milestone = "Final PR" → `planning-only` DOES pause

---

## 2. Consistency ✅

**Both files are updated consistently:**

| Change | PAW.agent.md | paw-transition/SKILL.md |
|--------|--------------|------------------------|
| New stage boundary | `paw-pr complete (Final PR created)` | `paw-pr complete → workflow complete` |
| Last phase milestone | _(implicitly part of "Phase PR completion")_ | Explicitly "Phase completion (last phase)" |

**Minor observation:** PAW.agent.md line 55 mentions "Phase PR completion" as a milestone for `milestones` policy, but the transition skill now distinguishes "phase N complete (not last)" from "all phases complete". The agent doesn't distinguish these explicitly, which is fine since both are Phase completion milestones—it's the transition skill that needs the distinction for `planning-only` logic.

---

## 3. Edge Cases

### ✅ Covered
- `planning-only` policy: Correctly pauses at Final PR (not before)
- `always`/`milestones` policies: Pause at ALL milestones including Final PR
- `never` policy: No pauses at any milestone

### ⚠️ Potential Gap
**What happens at `paw-pr complete` for `never` policy?**

The skill says `pause_at_milestone = false` for `never`, but when the milestone is "Final PR" and we've reached workflow completion, should there be special handling? Currently the transition returns:
```
next_activity: [activity name and context]
```

For `paw-pr complete`, there IS no next activity—the workflow is done. The skill should likely return something like `next_activity: workflow_complete` or similar. This isn't introduced by this PR but becomes more visible with the new stage boundary.

**Recommendation:** Verify Step 2 (Determine Next Activity) handles `paw-pr complete` correctly—it's not in the Mandatory Transitions table.

---

## 4. Token Efficiency

The changes increase verbosity slightly but are justified:

| Change | Tokens | Justified? |
|--------|--------|------------|
| Stage-to-milestone table | +~25 | ✅ Clarity over bullets |
| Removed "If at a milestone" condition | -~5 | ✅ Less nesting |
| Explicit "Phase completion (last phase)" | +~5 | ✅ Required for correct logic |

**Overall: +~25 tokens** for substantially improved clarity—acceptable.

**Opportunity:** The `pause_at_milestone` section could be condensed:

```markdown
**Determine pause_at_milestone**:
- `always`/`milestones`: true at all milestones
- `planning-only`: true for Spec.md, ImplementationPlan.md, Final PR only
- `never`: always false
```

This saves ~10 tokens and is equivalently clear.

---

## 5. Documentation Clarity ✅

The stage-to-milestone mapping table is **clear and complete**:

| Stage Boundary | Milestone Reached |
|----------------|-------------------|
| spec-review passes | Spec.md complete |
| plan-review passes | ImplementationPlan.md complete |
| phase N complete (not last) | Phase completion |
| all phases complete | Phase completion (last phase) |
| paw-pr complete | Final PR |

This explicitly disambiguates the bug's root cause. Good choice to use a table over prose.

---

## 6. Potential Issues

### 1. Documentation sync needed
`docs/guide/stage-transitions.md` line 83 says `planning-only` pauses at "Final PR creation"—this phrasing could be interpreted as "when the PR is created" vs "after paw-pr completes". Consider clarifying:

```diff
 - Final PR creation
+- Final PR (after paw-pr creates it)
```

### 2. Step 2 table incomplete
The Mandatory Transitions table in the skill doesn't include `paw-pr`. After `paw-pr` completes, what's the "Required Next"? Currently undefined. Should add:

```markdown
| paw-pr | workflow complete | N/A |
```

### 3. `milestones` policy edge case
With this change, `milestones` policy now pauses at "Final PR" milestone (via `paw-pr complete`). Previously it would have paused at "all phases complete" (which was incorrectly treated as Final PR). **Net effect is the same**—pausing after Final PR creation—but verify this doesn't regress the pause timing for `milestones` policy.

---

## Verdict

**Approve with minor suggestions:**

1. ✅ Fix is correct and addresses the bug
2. ⚠️ Consider adding `paw-pr | workflow complete` to Mandatory Transitions table
3. ⚠️ Consider clarifying `docs/guide/stage-transitions.md` language
4. 💡 Optional: Condense `pause_at_milestone` bullets for token savings
