# Review of PR #198: Fix `planning-only` review policy pause logic

This PR addresses the bug where the `planning-only` review policy incorrectly paused *before* Final PR creation (at the "all phases complete" boundary) instead of *after* it.

## 1. Correctness
**The fix appears correct.**
By introducing a specific "stage-to-milestone mapping" table, the PR explicitly separates the "All phases complete" boundary from the "Final PR" milestone.
- **Old Behavior**: "All phases complete" was implicitly treated as the "Final PR" milestone, causing a pause before `paw-pr` ran.
- **New Behavior**:
    - "All phases complete" maps to "Phase completion (last phase)".
    - "paw-pr complete" maps to "Final PR".
    - `planning-only` policy is explicitly configured to **not pause** at "Phase completion (including last phase)" and **pause** at "Final PR".
This ensures the workflow proceeds automatically through the final phase completion and `paw-pr` execution, only pausing once the Final PR is actually created.

## 2. Consistency
The changes are consistent between `agents/PAW.agent.md` and `skills/paw-transition/SKILL.md`.
- Both files add the new stage boundary: `paw-pr complete` (referred to as "Final PR created" in the agent file).
- The transition skill's logic for determining `pause_at_milestone` aligns with the new boundaries.

## 3. Edge Cases
- **`milestones` and `always` policies**: With the new mapping, these policies will likely trigger a pause at **both** "Phase completion (last phase)" and "Final PR".
    - *Scenario*: User finishes implementation -> Pause (Last phase complete) -> User resumes -> `paw-pr` runs -> Pause (Final PR complete).
    - This seems technically correct (reviewing the phase work vs reviewing the final PR artifact), but creates a double-pause at the end of the workflow. This is acceptable but worth noting.
- **`never` policy**: Correctly handled (always returns `false`).
- **Missing boundaries**: The `PAW.agent.md` lists "Planning PR created" and "Phase PR created" as boundaries, but they are not explicitly in the new mapping table. If these trigger `paw-transition`, the skill will likely fall through to "not at a milestone" (implied default), which is safe (no pause).

## 4. Token Efficiency
The added mapping table uses some tokens (~10 lines), but provides necessary clarity and decoupling. The logic section is reasonably concise. No significant waste identified.

## 5. Documentation Clarity
The new **Stage-to-milestone mapping** table is a significant improvement. It clearly defines what "milestone" is reached at each boundary, resolving the ambiguity that caused the original bug.

## 6. Potential Issues
- **Double Pause for non-planning policies**: As noted in Edge Cases, users on `milestones` or `always` policies will experience two pauses in quick succession at the end of a workflow. This behavior should be verified as intended.

## Conclusion
The changes logically fix the reported bug and improve the architectural clarity of workflow transitions. **Approved.**
