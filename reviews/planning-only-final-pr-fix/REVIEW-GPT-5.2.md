## PR #198 Review — Fix `planning-only` pause timing around Final PR

### 1) Correctness
This change fixes the stated root cause: it stops treating **"all phases complete"** as the **Final PR** milestone, and instead maps it to **"Phase completion (last phase)"**, with **Final PR** only reached at **"paw-pr complete"**. Under `planning-only`, that means the workflow will **auto-proceed into `paw-pr`** after the last phase, and only **pause after `paw-pr` completes**, which matches the expected behavior in Issue #197.  
One thing to sanity-check is the *actual* place where `paw-pr complete` is detected/declared in the workflow (i.e., that the orchestrator reliably triggers `paw-transition` after `paw-pr` finishes) — the PAW agent change explicitly adds that boundary, so it should.

### 2) Consistency (agents vs skill)
These changes are consistent:
- `agents/PAW.agent.md` now lists `paw-pr complete (Final PR created)` as a stage boundary requiring a `paw-transition` call.
- `skills/paw-transition/SKILL.md` adds `paw-pr complete → workflow complete` and maps it to the **Final PR** milestone.

Minor mismatch in wording: the agent file says "Final PR created" while the transition skill's stage boundary implies "paw-pr complete" (which *should* mean Final PR created). That's acceptable, but if `paw-pr` can "complete" without actually creating the PR in some failure mode, you'd want the boundary keyed to the *creation event*, not just "completion".

### 3) Edge cases / other review policies
- **`milestones`**: The skill currently says: "If Review Policy ∈ {`always`, `milestones`}: pause at ALL milestones". That's correct for `milestones` (pause at Spec/Plan/Phase/Final) and for `always` (it's actually *more* than milestones, but "pause at ALL milestones" is still true). If the intended semantics of `always` is "pause after every artifact, not just milestones", that logic likely exists elsewhere; this section is specifically stage-boundary/milestone related, so it's fine.
- **`never`**: Explicitly never pauses — consistent.
- **`planning-only`**: Now behaves correctly for Final PR timing.
- **Local vs PRs strategy**: The mapping is framed in terms of "phase completion", which covers both "Phase PR created" and "push complete" cases conceptually, but Step 3's stage boundaries list doesn't mention Planning PR / Phase PR boundaries (those exist in the PAW agent's stage boundary list). If `paw-transition` is also invoked after "Planning PR created" and "Phase PR created/push complete" (as the PAW agent requires), ensure the skill's "Stage boundaries occur when…" section is either (a) intentionally limited to *stage* changes only, or (b) updated to reflect those boundaries too. Right now it risks confusion about what `paw-transition` should consider a boundary.

### 4) Token efficiency (skill verbosity)
The new table is clearer but adds tokens. Potential reductions:
- Collapse "phase N complete (not last)" and "all phases complete" into one row like `phase completion` with a note "includes last phase", and derive "last vs not last" from context if needed (or just treat both as the same milestone for pause logic).
- Replace the prose bullets under `planning-only` with a single line like: "planning-only pauses at {Spec, Plan, FinalPR}; not at phase completion."
- Consider removing repetition like "(determines which milestone is reached at each boundary)" if the table header is self-explanatory.

### 5) Documentation clarity (mapping table)
The table is understandable and directly addresses the bug. A small clarity improvement would be to explicitly state whether "phase N complete" corresponds to **Phase PR merged/closed**, **Phase PR created**, or **implementation/review passed** (depending on strategy), because "phase complete" can be interpreted multiple ways across the workflow.  
Also, if "Planning PR created" is considered a boundary in the agent, but not represented in the transition skill's mapping, readers may wonder what milestone (if any) that boundary corresponds to.

### 6) Potential issues introduced
- The updated line "If Review Policy ∈ {`always`, `milestones`}: pause at ALL milestones" is slightly imprecise for `always` if someone reads it as defining *full* pause behavior (since `always` should pause more frequently than milestones). If this section is the sole source of pause logic, that would be a bug; if pause logic elsewhere covers non-milestone pauses, then it's fine but could be misread.
- Ensure `paw-transition` is actually called after `paw-pr` completes in all execution paths (success/failure). The PAW agent rule now requires it, but if orchestration skips it on some "finalization" code path, the fix won't take effect.

Overall, the fix is directionally correct and addresses Issue #197 cleanly; the main follow-up is making sure the "stage boundary" concept is consistently described between the agent and transition skill (especially around PR-created boundaries) so the documentation doesn't drift.
