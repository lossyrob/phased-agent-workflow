# GoDo-2 (v2): Control Plane + Taxonomy (Agent vs Skills vs Tools vs Prompt-Commands)

> Alternative implementation doc. Do not compare to or rely on the earlier GoDo-2 docs.
> Goal: define PAW v2 control plane taxonomy and provide a concrete mapping from v1 agents to v2 skills.

## Scope (this doc)

- Define a simple taxonomy:
  - **PAW Agent** (single top-level orchestrator)
  - **Skills** (workflow + capability)
  - **Tools** (procedural ops)
  - **Prompt-commands** (user entrypoints)
- Map each v1 agent in `agents/` to its v2 skill “home” (workflow vs capability).
- Produce visuals (Mermaid) that make the system legible.

## Constraints

- VS Code + Copilot centric for v2 MVP.
- Skills are the primary encoding of workflow semantics.
- Tools are procedural substrate; decisions live in the PAW Agent + skills.
- Subagents are used to reduce context load; subagents load skills via tool calls.

---

## Taxonomy

### 1) PAW Agent (single top-level)

Responsibilities (draft):
- Work item awareness: identify work id, stage, artifacts.
- Skill orchestration: select and sequence skills.
- Handoff + context reset decisions (manual / semi-auto / auto modes).
- Subagent invocation: delegate bounded tasks; ensure artifacts are written.
- Guardrails: enforce precedence rules (workspace > user > defaults) for instructions.

Non-responsibilities (draft):
- Not the primary place where phase instructions live.
- Not a dumping ground for templates; those belong in skills/prompt-commands.

### 2) Skills

Types:
- **Workflow skills**: stage/phase sequences + quality gates + artifact expectations.
- **Capability skills**: reusable behaviors (e.g., “write spec”, “code research”, “impact analysis”).
- **Heuristic skills**: judgment frameworks (e.g., review rubric, scope cutting).

### 3) Tools

Tools provide procedural operations and I/O, e.g.:
- read workspace state
- generate prompt files
- open new chat / handoff
- list skills / read skill content
- GitHub MCP (issues/PRs)

### 4) Prompt-commands

Prompt files become the explicit verbs users learn, e.g.:
- `paw-create-spec`
- `paw-create-plan`
- `paw-implement`
- `paw-review-pr`
- `paw-status`

A prompt-command:
- targets the PAW Agent
- instructs it to load and execute a workflow skill
- may accept user-provided parameters

---

## Agent → Skill Mapping

### Mapping table layout

Conventions:
- **Workflow skill** = phase orchestration.
- **Capability skill** = reusable action.
- **Artifacts** = concrete files written to `.paw/…`.

| v1 Agent File | Primary v2 Skill Home | Skill Type (workflow/capability/heuristic) | Decomposable Component Skills (examples) | Key Artifacts / Outputs | Notes |
|---|---|---|---|---|---|
| agents/PAW-01A Specification.agent.md | paw-workflow-specification | workflow | paw-capability-write-spec; paw-capability-user-story-slicing; paw-capability-spec-traceability; paw-capability-spec-quality-gate; paw-capability-generate-spec-research-prompt; paw-heuristic-classify-unknowns | `.paw/work/<work-id>/Spec.md`; `.paw/work/<work-id>/prompts/01B-spec-research.prompt.md` | Strong “no implementation details” guardrail; explicit pause for research if needed. |
| agents/PAW-01B Spec Researcher.agent.md | paw-capability-spec-research | capability | paw-capability-behavioral-evidence-extraction; paw-capability-specresearch-md-writer; paw-guardrail-no-design-no-eval; paw-guardrail-no-implementation-details | `.paw/work/<work-id>/SpecResearch.md` | Behavioral “how system works today”; explicitly separated from code-structure research. |
| agents/PAW-02A Code Researcher.agent.md | paw-workflow-code-research | workflow | paw-capability-codebase-discovery; paw-capability-code-path-tracing; paw-capability-pattern-mining; paw-capability-permalink-enrichment; paw-guardrail-neutral-documentarian | `.paw/work/<work-id>/CodeResearch.md` | Evidence-heavy with file/line references; no critique unless asked. |
| agents/PAW-02B Impl Planner.agent.md | paw-workflow-implementation-planning | workflow | paw-capability-phase-structuring; paw-capability-success-criteria-authoring; paw-capability-test-co-design; paw-capability-review-comment-triage; paw-capability-planning-pr-management | `.paw/work/<work-id>/ImplementationPlan.md` (+ planning PR when `prs`) | Includes both planning and “planning PR review response” sub-mode. |
| agents/PAW-03A Implementer.agent.md | paw-workflow-implementation-execution | workflow | paw-capability-select-next-plan-phase; paw-capability-branch-strategy; paw-capability-run-success-checks; paw-capability-selective-staging; paw-capability-block-on-mismatch | Code changes + commits; updates to ImplementationPlan checkboxes/notes | Explicit separation of duties: implementer does code+commits; reviewer does push/PR ops. |
| agents/PAW-03B Impl Reviewer.agent.md | paw-workflow-implementation-review | workflow | paw-capability-maintainability-review; paw-capability-test-gatekeeper; paw-capability-phase-pr-create-update; paw-capability-pr-summary-comment | Phase PRs (`prs`); updates to ImplementationPlan links/notes | Encodes a mini “policy engine” driven by Review Strategy (`prs` vs `local`). |
| agents/PAW-04 Documenter.agent.md | paw-workflow-documentation | workflow | paw-capability-authoritative-docs-writer; paw-capability-project-docs-update; paw-capability-docs-pr-management; paw-capability-review-comment-batching | `.paw/work/<work-id>/Docs.md`; docs PR when `prs` | Guardrail: do not change implementation code/tests during docs stage. |
| agents/PAW-05 PR.agent.md | paw-workflow-final-pr | workflow | paw-capability-preflight-readiness; paw-capability-pr-title-compose; paw-capability-pr-description-compose; paw-heuristic-mode-strategy-pr-template | Final PR (platform object) + handoff message | Strict “no edits/merges/review handling”; blocks unless user overrides. |
| agents/PAW-R1A Understanding.agent.md | paw-review-understanding | workflow | paw-review-context-detect-state; paw-review-context-collect-metadata; paw-review-baseline-prompt-generate; paw-review-derivedspec-derive; paw-review-discrepancy-block | `.paw/reviews/<id>/ReviewContext.md`; `.paw/reviews/<id>/DerivedSpec.md`; `.paw/reviews/<id>/prompts/01B-code-research.prompt.md` | Hard gate: do not proceed without baseline CodeResearch once a baseline prompt exists. |
| agents/PAW-R1B Baseline Researcher.agent.md | paw-review-baseline-research | workflow | paw-review-context-parse; paw-git-checkout-restore-base; paw-review-baseline-behavior-doc; paw-review-coderesearch-writer | `.paw/reviews/<id>/CodeResearch.md` | Operates at base commit only; must restore original branch. |
| agents/PAW-R2A Impact Analyzer.agent.md | paw-review-impact-analysis | workflow | paw-review-integration-graph-one-hop; paw-review-detect-breaking-changes; paw-review-assess-security; paw-review-assess-performance; paw-review-assess-deploy-migrations | `.paw/reviews/<id>/ImpactAnalysis.md` | System-wide; bounded dependency discovery (“one hop”). |
| agents/PAW-R2B Gap Analyzer.agent.md | paw-review-gap-analysis | workflow | paw-review-correctness-scan; paw-review-security-scan; paw-review-test-coverage-parse; paw-review-maintainability-scan; paw-review-categorize-must-should-could; paw-review-gap-report-writer | `.paw/reviews/<id>/GapAnalysis.md` | Anti-inflation rules; counts + fixed template; positive observations included. |
| agents/PAW-R3A Feedback Generator.agent.md | paw-review-feedback-generation | workflow | paw-review-one-issue-one-comment; paw-review-comment-objects; paw-review-rationale-writer; paw-review-pending-review-create; paw-review-pending-review-post-comments | `.paw/reviews/<id>/ReviewComments.md` (+ pending GitHub review) | Public comment text excludes internal rationale; draft-only (never auto-submit). |
| agents/PAW-R3B Feedback Critic.agent.md | paw-review-feedback-critic | workflow | paw-review-comment-usefulness-rating; paw-review-accuracy-verification; paw-review-tradeoff-analysis; paw-review-include-modify-skip-decision; paw-review-internal-only-guardrail | Updates `.paw/reviews/<id>/ReviewComments.md` | Advisory-only; assessments must never be posted publicly. |
| agents/PAW-X Status.agent.md | paw-workflow-status | workflow | paw-status-work-item-index; paw-status-artifact-presence-matrix; paw-status-git-state-snapshot; paw-status-pr-resolution; paw-status-next-step-recommender; paw-status-opt-in-github-poster | Status report (chat); optional GitHub issue/PR comment updates | Splits naturally into “state detection” vs “user education/reference”. |

### Candidate v2 skill ids (normalized)

These are candidate skill ids aligned to Agent Skills naming constraints (lowercase + hyphens). The mapping table above uses these as the “primary home” per v1 agent.

Workflow skills (stage orchestration):

- `paw-workflow-specification`
- `paw-workflow-code-research`
- `paw-workflow-implementation-planning`
- `paw-workflow-implementation-execution`
- `paw-workflow-implementation-review`
- `paw-workflow-documentation`
- `paw-workflow-final-pr`
- `paw-workflow-status`

Review workflow skills:

- `paw-review-understanding`
- `paw-review-baseline-research`
- `paw-review-impact-analysis`
- `paw-review-gap-analysis`
- `paw-review-feedback-generation`
- `paw-review-feedback-critic`

Common capability/heuristic skills (reused across workflows):

- `paw-capability-write-spec`
- `paw-capability-spec-research`
- `paw-capability-code-path-tracing`
- `paw-capability-pattern-mining`
- `paw-capability-phase-structuring`
- `paw-capability-success-criteria-authoring`
- `paw-capability-test-co-design`
- `paw-capability-selective-staging`
- `paw-capability-preflight-readiness`
- `paw-heuristic-mode-strategy-policy`

---

## Visuals

### Control plane overview

```mermaid
flowchart TB
  user([User]) --> cmd[Prompt-command]
  cmd --> agent[PAW Agent]

  agent --> ctx[paw_get_context]
  ctx --> instr[Custom instructions + WorkflowContext]

  agent --> cat[paw_list_skills]
  cat --> skills[(Skill catalog)]
  agent --> get[paw_get_skill]
  get --> sk[Skill instructions]

  agent --> wf[Workflow skills]
  wf --> cap[Capability/heuristic skills]
  agent --> tools[Procedural tools]

  tools --> ws[(Artifacts + repo files)]
  cap --> ws

  agent --> sub[Subagents]
  sub --> get
  sub --> tools
  sub --> ws
```

### v1 agents → v2 skills mapping (high-level)

```mermaid
flowchart LR
  subgraph v1[PAW v1 agents]
    a01a[PAW-01A]
    a01b[PAW-01B]
    a02a[PAW-02A]
    a02b[PAW-02B]
    a03a[PAW-03A]
    a03b[PAW-03B]
    a04[PAW-04]
    a05[PAW-05]
    r1a[PAW-R1A]
    r1b[PAW-R1B]
    r2a[PAW-R2A]
    r2b[PAW-R2B]
    r3a[PAW-R3A]
    r3b[PAW-R3B]
    x[PAW-X]
  end

  subgraph v2[PAW v2 skill homes]
    s_spec[paw-workflow-specification]
    s_specr[paw-capability-spec-research]
    s_cr[paw-workflow-code-research]
    s_plan[paw-workflow-implementation-planning]
    s_impl[paw-workflow-implementation-execution]
    s_ir[paw-workflow-implementation-review]
    s_docs[paw-workflow-documentation]
    s_pr[paw-workflow-final-pr]
    s_ru[paw-review-understanding]
    s_rb[paw-review-baseline-research]
    s_ri[paw-review-impact-analysis]
    s_rg[paw-review-gap-analysis]
    s_rfg[paw-review-feedback-generation]
    s_rfc[paw-review-feedback-critic]
    s_status[paw-workflow-status]
  end

  a01a --> s_spec
  a01b --> s_specr
  a02a --> s_cr
  a02b --> s_plan
  a03a --> s_impl
  a03b --> s_ir
  a04 --> s_docs
  a05 --> s_pr
  r1a --> s_ru
  r1b --> s_rb
  r2a --> s_ri
  r2b --> s_rg
  r3a --> s_rfg
  r3b --> s_rfc
  x --> s_status

  subgraph art[Primary artifacts]
    art_work[.paw/work/<work-id>/*]
    art_review[.paw/reviews/<id>/*]
  end

  s_spec --> art_work
  s_specr --> art_work
  s_cr --> art_work
  s_plan --> art_work
  s_impl --> art_work
  s_ir --> art_work
  s_docs --> art_work
  s_pr --> art_work
  s_ru --> art_review
  s_rb --> art_review
  s_ri --> art_review
  s_rg --> art_review
  s_rfg --> art_review
  s_rfc --> art_review
  s_status --> art_work
```

### Implementation workflow: agents → skills (detailed)

#### Skill consolidation rationale

The fine-grained "skill grains" from the mapping table are grouped into loadable skills based on:

1. **Load trigger**: When would the model need this information? (stage entry, specific sub-task, error recovery)
2. **Separation justification**: Why can't this live in PAW Agent instructions or workflow skill?
3. **Cardinality constraint**: Target ~5-8 capability skills to avoid selection overhead

| Loadable Skill | Skill Grains (from table) | Load Trigger | Separation Justification |
|---|---|---|---|
| `paw-skill-spec-authoring` | write-spec, user-story-slicing, spec-traceability, spec-quality-gate | Spec stage entry | Domain-specific templates + quality rubrics too large for agent prompt |
| `paw-skill-research` | behavioral-evidence-extraction, codebase-discovery, code-path-tracing, pattern-mining, permalink-enrichment | Any research sub-task | Reusable across spec-research + code-research; heavy examples |
| `paw-skill-planning` | phase-structuring, success-criteria-authoring, test-co-design | Plan creation | Plan format + success criteria templates; shared by planner + implementer |
| `paw-skill-pr-management` | planning-pr-management, phase-pr-create-update, docs-pr-management, pr-title-compose, pr-description-compose, pr-summary-comment | Any PR operation | GitHub-specific mechanics + templates; loaded on-demand |
| `paw-skill-git-workflow` | branch-strategy, selective-staging, run-success-checks | Commit/push operations | Git mechanics that don't belong in high-level workflow |
| `paw-skill-review-response` | review-comment-triage, review-comment-batching | Responding to PR feedback | Loaded only when PR has comments; distinct decision framework |
| `paw-skill-quality-gates` | block-on-mismatch, test-gatekeeper, maintainability-review, preflight-readiness | Before stage transitions | Checkpoint logic; loaded at decision points |
| `paw-skill-status` | work-item-index, artifact-presence-matrix, git-state-snapshot, pr-resolution, next-step-recommender | Status check | Self-contained diagnostic; doesn't pollute other workflows |

#### Guardrails (inlined into workflow skills, not separate)

These are short enough to template directly into workflow skills:
- `no-implementation-details` → spec + spec-research workflows
- `neutral-documentarian` → code-research workflow
- `no-design-no-eval` → spec-research workflow

```mermaid
flowchart LR
  subgraph agents[v1 Agents]
    a01a[PAW-01A<br/>Specification]
    a01b[PAW-01B<br/>Spec Researcher]
    a02a[PAW-02A<br/>Code Researcher]
    a02b[PAW-02B<br/>Impl Planner]
    a03a[PAW-03A<br/>Implementer]
    a03b[PAW-03B<br/>Impl Reviewer]
    a04[PAW-04<br/>Documenter]
    a05[PAW-05<br/>PR]
    ax[PAW-X<br/>Status]
  end

  subgraph workflow[Workflow Skills]
    wf_spec[paw-workflow-specification]
    wf_specr[paw-workflow-spec-research]
    wf_cr[paw-workflow-code-research]
    wf_plan[paw-workflow-planning]
    wf_impl[paw-workflow-implementation]
    wf_rev[paw-workflow-impl-review]
    wf_docs[paw-workflow-documentation]
    wf_pr[paw-workflow-final-pr]
    wf_status[paw-workflow-status]
  end

  subgraph capability[Capability Skills]
    c_spec[paw-skill-spec-authoring]
    c_research[paw-skill-research]
    c_planning[paw-skill-planning]
    c_pr_mgmt[paw-skill-pr-management]
    c_git[paw-skill-git-workflow]
    c_review_resp[paw-skill-review-response]
    c_gates[paw-skill-quality-gates]
    c_status[paw-skill-status]
  end

  subgraph grains[Skill Grains ⟨grouped⟩]
    %% spec-authoring grains
    g_write_spec[write-spec]
    g_story_slice[user-story-slicing]
    g_trace[spec-traceability]
    g_spec_gate[spec-quality-gate]

    %% research grains
    g_behav[behavioral-evidence]
    g_discover[codebase-discovery]
    g_path_trace[code-path-tracing]
    g_pattern[pattern-mining]
    g_permalink[permalink-enrichment]

    %% planning grains
    g_phase[phase-structuring]
    g_success[success-criteria]
    g_test_co[test-co-design]

    %% pr-management grains
    g_plan_pr[planning-pr-mgmt]
    g_phase_pr[phase-pr-ops]
    g_docs_pr[docs-pr-mgmt]
    g_pr_title[pr-title-compose]
    g_pr_desc[pr-description]
    g_pr_summary[pr-summary-comment]

    %% git-workflow grains
    g_branch[branch-strategy]
    g_staging[selective-staging]
    g_checks[run-success-checks]

    %% review-response grains
    g_triage[comment-triage]
    g_batch[comment-batching]

    %% quality-gates grains
    g_block[block-on-mismatch]
    g_test_gate[test-gatekeeper]
    g_maint[maintainability-review]
    g_preflight[preflight-readiness]

    %% status grains
    g_index[work-item-index]
    g_matrix[artifact-matrix]
    g_git_snap[git-state-snapshot]
    g_pr_res[pr-resolution]
    g_next[next-step-recommender]
  end

  %% Agent → Primary Workflow Skill
  a01a ==> wf_spec
  a01b ==> wf_specr
  a02a ==> wf_cr
  a02b ==> wf_plan
  a03a ==> wf_impl
  a03b ==> wf_rev
  a04 ==> wf_docs
  a05 ==> wf_pr
  ax ==> wf_status

  %% Workflow → Capability Skills (on-demand loading)
  wf_spec --> c_spec
  wf_spec -.-> c_research

  wf_specr --> c_research

  wf_cr --> c_research

  wf_plan --> c_planning
  wf_plan -.-> c_pr_mgmt
  wf_plan -.-> c_review_resp

  wf_impl --> c_git
  wf_impl -.-> c_planning
  wf_impl -.-> c_gates

  wf_rev --> c_gates
  wf_rev --> c_pr_mgmt

  wf_docs -.-> c_pr_mgmt
  wf_docs -.-> c_review_resp

  wf_pr --> c_pr_mgmt
  wf_pr --> c_gates

  wf_status --> c_status

  %% Capability → Grains (composition)
  c_spec --- g_write_spec
  c_spec --- g_story_slice
  c_spec --- g_trace
  c_spec --- g_spec_gate

  c_research --- g_behav
  c_research --- g_discover
  c_research --- g_path_trace
  c_research --- g_pattern
  c_research --- g_permalink

  c_planning --- g_phase
  c_planning --- g_success
  c_planning --- g_test_co

  c_pr_mgmt --- g_plan_pr
  c_pr_mgmt --- g_phase_pr
  c_pr_mgmt --- g_docs_pr
  c_pr_mgmt --- g_pr_title
  c_pr_mgmt --- g_pr_desc
  c_pr_mgmt --- g_pr_summary

  c_git --- g_branch
  c_git --- g_staging
  c_git --- g_checks

  c_review_resp --- g_triage
  c_review_resp --- g_batch

  c_gates --- g_block
  c_gates --- g_test_gate
  c_gates --- g_maint
  c_gates --- g_preflight

  c_status --- g_index
  c_status --- g_matrix
  c_status --- g_git_snap
  c_status --- g_pr_res
  c_status --- g_next
```

**Legend**:
- `==>` Agent maps to primary workflow skill
- `-->` Workflow always loads this capability
- `-.->` Workflow loads on-demand (conditional)
- `---` Capability skill contains these grains

### Review workflow: agents → skills (detailed)

#### Skill consolidation rationale

| Loadable Skill | Skill Grains (from table) | Load Trigger | Separation Justification |
|---|---|---|---|
| `paw-skill-review-context` | context-detect-state, context-collect-metadata, context-parse, derivedspec-derive | Review entry or context refresh | PR metadata extraction + derived spec templates; heavy examples |
| `paw-skill-baseline-analysis` | git-checkout-restore-base, baseline-behavior-doc, coderesearch-writer | Baseline research stage | Git operations + behavior documentation format; isolated checkout |
| `paw-skill-impact-assessment` | integration-graph-one-hop, detect-breaking-changes, assess-security, assess-performance, assess-deploy-migrations | Impact analysis stage | System-wide analysis rubrics; distinct from gap-level detail |
| `paw-skill-gap-detection` | correctness-scan, security-scan, test-coverage-parse, maintainability-scan, categorize-must-should-could, gap-report-writer | Gap analysis stage | Code-level scanning heuristics + MoSCoW framework |
| `paw-skill-feedback-authoring` | one-issue-one-comment, comment-objects, rationale-writer, pending-review-create, pending-review-post-comments | Feedback generation | Comment formatting + GitHub API mechanics |
| `paw-skill-feedback-critique` | comment-usefulness-rating, accuracy-verification, tradeoff-analysis, include-modify-skip-decision | Feedback critic stage | Meta-review rubric; must not leak to public comments |

#### Guardrails (inlined into workflow skills)

- `discrepancy-block` → understanding workflow (hard gate)
- `internal-only-guardrail` → feedback-critic workflow

```mermaid
flowchart LR
  subgraph agents[v1 Agents]
    r1a[PAW-R1A<br/>Understanding]
    r1b[PAW-R1B<br/>Baseline Researcher]
    r2a[PAW-R2A<br/>Impact Analyzer]
    r2b[PAW-R2B<br/>Gap Analyzer]
    r3a[PAW-R3A<br/>Feedback Generator]
    r3b[PAW-R3B<br/>Feedback Critic]
  end

  subgraph workflow[Workflow Skills]
    wf_under[paw-review-understanding]
    wf_base[paw-review-baseline]
    wf_impact[paw-review-impact]
    wf_gap[paw-review-gap]
    wf_feedback[paw-review-feedback]
    wf_critic[paw-review-critic]
  end

  subgraph capability[Capability Skills]
    c_context[paw-skill-review-context]
    c_baseline[paw-skill-baseline-analysis]
    c_impact[paw-skill-impact-assessment]
    c_gap[paw-skill-gap-detection]
    c_author[paw-skill-feedback-authoring]
    c_critique[paw-skill-feedback-critique]
  end

  subgraph grains[Skill Grains ⟨grouped⟩]
    %% review-context grains
    g_detect[context-detect-state]
    g_collect[context-collect-metadata]
    g_parse[context-parse]
    g_derive[derivedspec-derive]

    %% baseline-analysis grains
    g_checkout[git-checkout-restore]
    g_behav_doc[baseline-behavior-doc]
    g_cr_write[coderesearch-writer]

    %% impact-assessment grains
    g_graph[integration-graph]
    g_breaking[detect-breaking]
    g_sec_assess[assess-security]
    g_perf[assess-performance]
    g_deploy[assess-deploy]

    %% gap-detection grains
    g_correct[correctness-scan]
    g_sec_scan[security-scan]
    g_test_cov[test-coverage-parse]
    g_maint[maintainability-scan]
    g_moscow[categorize-MoSCoW]
    g_gap_write[gap-report-writer]

    %% feedback-authoring grains
    g_one_issue[one-issue-one-comment]
    g_comment_obj[comment-objects]
    g_rationale[rationale-writer]
    g_pending[pending-review-create]
    g_post[pending-review-post]

    %% feedback-critique grains
    g_useful[usefulness-rating]
    g_accuracy[accuracy-verification]
    g_tradeoff[tradeoff-analysis]
    g_decision[include-modify-skip]
  end

  %% Agent → Primary Workflow Skill
  r1a ==> wf_under
  r1b ==> wf_base
  r2a ==> wf_impact
  r2b ==> wf_gap
  r3a ==> wf_feedback
  r3b ==> wf_critic

  %% Workflow → Capability Skills
  wf_under --> c_context

  wf_base --> c_baseline
  wf_base -.-> c_context

  wf_impact --> c_impact
  wf_impact -.-> c_gap

  wf_gap --> c_gap

  wf_feedback --> c_author
  wf_feedback -.-> c_gap

  wf_critic --> c_critique
  wf_critic -.-> c_author

  %% Capability → Grains
  c_context --- g_detect
  c_context --- g_collect
  c_context --- g_parse
  c_context --- g_derive

  c_baseline --- g_checkout
  c_baseline --- g_behav_doc
  c_baseline --- g_cr_write

  c_impact --- g_graph
  c_impact --- g_breaking
  c_impact --- g_sec_assess
  c_impact --- g_perf
  c_impact --- g_deploy

  c_gap --- g_correct
  c_gap --- g_sec_scan
  c_gap --- g_test_cov
  c_gap --- g_maint
  c_gap --- g_moscow
  c_gap --- g_gap_write

  c_author --- g_one_issue
  c_author --- g_comment_obj
  c_author --- g_rationale
  c_author --- g_pending
  c_author --- g_post

  c_critique --- g_useful
  c_critique --- g_accuracy
  c_critique --- g_tradeoff
  c_critique --- g_decision
```

**Legend**:
- `==>` Agent maps to primary workflow skill
- `-->` Workflow always loads this capability
- `-.->` Workflow loads on-demand (conditional)
- `---` Capability skill contains these grains

---

## Decisions to lock (fill in)

- Where workflow sequencing lives (skill vs agent):
- What becomes a prompt-command vs an implicit skill:
- Skill catalog loading strategy (single tool vs list/get split):
- Precedence rules across builtin/user/workspace/work-item:

---

## Open questions

- Can handoff reliably invoke a prompt-command as the first message in the new chat?
- What is the minimum stable contract for subagent outputs (paths + summary + status)?
