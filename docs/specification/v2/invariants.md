# PAW v2 Invariant Catalogue

!!! note "Status: draft for review"
    Phase 0 output for [#322](https://github.com/lossyrob/phased-agent-workflow/issues/322). Nothing here is implemented yet.

This catalogue classifies the rules PAW carries today, plus the rules proposed in the unmerged hardening PRs, as either:

- **Durable invariant** — a rule learned from a real failure that v2 must still guarantee. Each has one owner in v2 and one regression test.
- **Compensating machinery** — a mechanism that exists to work around the current execution model. v2 drops it and relies on the new model instead.

## Sources

| Source | What it contributes |
|--------|---------------------|
| `agents/PAW.agent.md`, `skills/paw-transition`, `skills/paw-lite` | Current routing, pause and yield rules |
| `skills/paw-pr`, `skills/paw-git-operations`, `skills/paw-implement`, `skills/paw-impl-review`, `skills/paw-final-review`, `skills/paw-rewind`, `skills/paw-init` | Operation-level guardrails |
| [#298](https://github.com/lossyrob/phased-agent-workflow/issues/298) | 14 mandatory steps skipped in a long `auto-full` run |
| [#268](https://github.com/lossyrob/phased-agent-workflow/issues/268) | Configured SoT final review replaced with an ad-hoc review |
| [#297](https://github.com/lossyrob/phased-agent-workflow/issues/297) | PAW Review self-delegated and produced conflicting GitHub side effects |
| [#299](https://github.com/lossyrob/phased-agent-workflow/issues/299), [#306](https://github.com/lossyrob/phased-agent-workflow/issues/306) | Two proposed directions for hardening |
| [#300](https://github.com/lossyrob/phased-agent-workflow/pull/300) and its field report | Embedded control state; unscoped `git rm -rf .paw/` at PR stage |
| [#307](https://github.com/lossyrob/phased-agent-workflow/pull/307) | Boundary checkpoints and persisted boundary TODOs for PAW Lite |

!!! warning "#300 and #307 are not merged"
    Neither hardening PR is on `main`. Their rules and tests are treated here as failure knowledge to mine, not as existing behaviour to preserve.

## Failure classes

The observed failures reduce to six classes. Every durable invariant below maps to at least one.

| Class | Description | Seen in |
|-------|-------------|---------|
| F1 | A configured or mandatory activity is skipped | #298 RC-1, RC-3, RC-4 |
| F2 | A configured activity is rationalised away or replaced with an ad-hoc equivalent | #298 RC-2, #268 |
| F3 | A side effect is performed from memory instead of through its procedure | #298 RC-5, #300 field report |
| F4 | A destructive git operation exceeds its scope | #300 field report |
| F5 | More than one actor performs the same external side effect | #297 |
| F6 | Reported state differs from actual state | #297, #300 field report |

## Durable invariants

"Owner" is the single place in v2 that enforces the rule. "Host" means the workflow skill loaded by the host agent.

### Workflow control

| ID | Invariant | Class | v2 owner and mechanism | Regression test |
|----|-----------|-------|------------------------|-----------------|
| W1 | Every activity the resolved configuration requires exists as a TODO before work starts. | F1 | Host builds the full TODO graph from configuration when the skill loads, including reviews and the final PR. | After load, the graph contains a node for each configured activity. |
| W2 | Gates are TODO nodes with dependencies, not prose. The final PR depends on final review, which depends on all implementation. | F1 | Host; TODO dependency edges. | The final PR node is blocked while a review node is open. |
| W3 | A required TODO closes only with evidence: an artifact, a commit or a review output. | F1, F6 | Host acceptance step. | A run that closes a review node with no review output fails. |
| W4 | A required TODO is cancelled only on explicit user instruction. Host judgement about relevance, duplication or speed is not grounds. | F2 | Host; cancellation rule in the TODO model. | Long-run scenario with docs-only work still runs every configured review. |
| W5 | A configured procedure runs as configured or the workflow blocks. A configured SoT review runs through `paw-sot`. | F2 | Review activity; the review provider is named in the TODO node and in the delegation brief. | SoT configured → SoT artifacts exist; ad-hoc reviewers fail the test. |
| W6 | An earlier activity never satisfies a later one. Plan review is not final review. | F2 | Host; each node has its own evidence requirement (W3). | Planning-stage SoT followed by final SoT produces two distinct outputs. |
| W7 | Human-pause settings never change which automated activities run. | F1 | Configuration model: the plan checkpoint is a separate field from review settings. | Checkpoint off and on produce the same automated nodes. |
| W8 | Before yielding, the host checks for open unblocked TODOs and continues if any exist. Valid yields are: workflow complete, blocked on a user decision, configured checkpoint, or user request. | F1 | Host; one yield rule. | Autonomous run does not stop between implementation and review. |
| W9 | Mid-implementation ideas are recorded as candidate work and resolved before the final PR. | F1 | Subagent return (`candidates`); host adds a TODO per candidate. | Unresolved candidate blocks the PR node. |

### Delegation

| ID | Invariant | Class | v2 owner and mechanism | Regression test |
|----|-----------|-------|------------------------|-----------------|
| D1 | The host never delegates the workflow itself. Subagents run activities; they do not load the workflow skill or orchestrate. | F5 | Host; delegation brief names one activity and forbids orchestration. | No subagent loads the workflow skill. |
| D2 | A subagent return is a claim. The host checks it against git state and artifacts before closing the TODO. | F6 | Host acceptance step. | A return that claims a commit that does not exist is rejected. |
| D3 | Implementation is accepted only when every planned deliverable exists in the repository with real content. | F1 | Host acceptance step; optional independent phase review. | Plan promises three files, two delivered → not accepted. |
| D4 | A subagent that cannot proceed returns `blocked` with specifics. It does not leave placeholders or speculative code. | F6 | Activity brief. | Blocked scenario returns `blocked` and no placeholder code. |
| D5 | Subagents do not push, open PRs or change artifact tracking. | F3, F5 | Delegation brief; host owns external side effects. | No subagent issues `git push` or `gh pr create`. |

### Git and side effects

| ID | Invariant | Class | v2 owner and mechanism | Regression test |
|----|-----------|-------|------------------------|-----------------|
| G1 | Staging is selective. `git add .` and `git add -A` are never used. | F4 | Git operation procedure. | Tool-policy check on git commands. |
| G2 | Existing uncommitted changes are never modified, reverted or staged. | F4 | Git operation procedure; activity brief. | Fixture with a dirty file ends with that file untouched. |
| G3 | Artifact removal is scoped to `.paw/work/<work-id>/` and uses `git rm --cached`. Other work directories are never touched. | F4 | Final PR procedure. | Fixture with a second work directory keeps it intact. |
| G4 | The final PR is created only through the final PR procedure, after its pre-flight passes. | F3 | Host; the PR TODO node names the procedure. | Inline `gh pr create` before procedure load fails the test. |
| G5 | Artifact lifecycle is honoured at every commit: `never-commit` stages no `.paw/` files; `commit-and-clean` stops tracking before the PR. | F3 | Git operation and final PR procedures. | Existing `artifact-lifecycle` tests, ported. |
| G6 | Scratch ignore markers are never committed. | F4 | Git operation procedure. | Existing `scratch-ignore-marker-policy` test, ported. |
| G7 | Commits happen only on the verified target branch. | F4 | Git operation procedure. | Existing `git-branching` tests, ported. |
| G8 | In worktree mode all mutations happen in the proven execution checkout. The caller checkout is never mutated. If the checkout cannot be proven, stop. | F4 | Git operation procedure. | Existing `worktree-*` tests, ported. |
| G9 | Each external side effect has one owner: the host. | F5 | Host (D5). | Single PR created per run. |
| G10 | Final status is reported from live git and PR state, not from memory. | F6 | Host completion step. | Reported PR URL matches `gh pr view`. |
| G11 | Rewind and other destructive operations show a preview and require confirmation. | F4 | Rewind procedure. | Rewind without confirmation leaves state unchanged. |

### Content quality

| ID | Invariant | Class | v2 owner and mechanism | Regression test |
|----|-----------|-------|------------------------|-----------------|
| Q1 | Code claims in artifacts carry file and line evidence. Nothing is fabricated; unknowns are stated. | F6 | Research and planning briefs. | Existing judge-based artifact tests. |
| Q2 | Artifacts contain no placeholders and no unresolved blocking questions when accepted. | F6 | Host acceptance step. | Plan with open questions is not accepted. |
| Q3 | Project instruction files are discovered and their required commands pass before work is accepted. | F1 | Implementation and review briefs. | Fixture lint failure blocks acceptance. |

## Compensating machinery

These mechanisms are not carried forward. The column on the right names what replaces each.

| Mechanism | Where | Why it existed | v2 disposition |
|-----------|-------|----------------|----------------|
| `paw-transition` subagent and the Stage Boundary Rule | `PAW.agent.md`, `paw-transition` | Re-inject routing rules after long main-session work | Dropped. The host stays small, and W1–W2 put routing in the TODO graph. |
| Mandatory Transitions table, duplicated | `PAW.agent.md`, `paw-transition` | State the routing twice so one copy survives | One TODO graph template in the workflow skill. |
| "Before Yielding Control" checklist | `PAW.agent.md` | Catch skipped transitions | Replaced by the single yield rule W8. |
| `pause_at_milestone` matrix for four review policies | `paw-transition` | Human checkpoints as the core of the design | One optional plan checkpoint (W7). |
| Session policy and `paw_new_session` hand-offs | `PAW.agent.md`, `paw-transition`, `src/tools/handoffTool.ts` | Reset context between stages | Dropped. Subagents isolate context; the session resumes by ID. |
| Legacy review-policy and handoff-mode mappings | `PAW.agent.md`, `paw-transition` | Read old `WorkflowContext.md` files | Moved to a one-time compatibility reader. |
| Embedded `## Control State` in `WorkflowContext.md` | #300 | Durable copy of workflow progress | Dropped. Rejected in #306; contradicts the artifact principle. |
| Reconciliation-on-read preamble in every skill | #300 | Detect drift in the embedded state | Dropped with the embedded state. D2 and G10 cover reported-versus-actual. |
| Persistent `reconcile:<work-id>` TODO and activity mirror rows | #300 | Keep a second ledger in step with the first | Dropped. The TODO graph is the only ledger. |
| PAW Lite boundary checkpoints and briefs | #307 | Give Lite the attention refresh that `paw-transition` gave Standard | Dropped. There is one workflow; W1–W5 carry the obligations. |
| Resolved-configuration summaries repeated at boundaries | #307 | Keep preset obligations visible | Obligations are written into TODO nodes once (W1, W5). |
| Content-pinning tests that assert prompt wording | #300, #307 | Stop guardrail text being deleted | Replaced by behavioural tests per invariant. |
| Hybrid execution lists (direct versus subagent) | `PAW.agent.md`, `paw-workflow` | Mixed model | One rule: activities run in subagents; shaping and checkpoints run in the host. |
| PRs review strategy: planning, phase and docs branches and PRs | `paw-git-operations`, `paw-transition` | Human review at each stage | Removed; see the [design decisions](design.md#decisions). |

## Rules that change shape

| Rule today | v2 form |
|------------|---------|
| `paw-implement` → `paw-impl-review` is mandatory after every phase | The plan-completeness check becomes host acceptance (D3). An independent phase review is configurable. |
| Phase candidates are checkboxes in `ImplementationPlan.md` resolved by a promotion flow | Candidates return in the subagent result and become TODOs (W9). The plan records the decision, not the queue. |
| `paw-pr` pre-flight requires `Spec.md`, `CodeResearch.md` and `Docs.md` by workflow mode | Pre-flight checks the artifacts that the resolved configuration produced. Subsumes [#330](https://github.com/lossyrob/phased-agent-workflow/pull/330). |
| Final review interactive modes `true`, `false`, `smart` | Findings are applied autonomously; trade-offs that need a decision return as `needs-decision`. |

## PAW Review

PAW Review stays a separate workflow. Three invariants from #297 apply to it and are recorded here so the shared contracts account for them:

- A PAW Review session never delegates the review workflow to another PAW Review agent (same rule as D1).
- One review job has one owner for GitHub side effects (same rule as G9).
- A pending review is terminal unless the user asks for a further change.
