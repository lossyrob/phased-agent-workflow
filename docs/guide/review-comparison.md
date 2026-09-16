# Experimental review comparison

`paw-review-compare` compares four independent review configurations on one pinned target and produces artifacts for human selection. It supports enabled planning reviews and implementation commit/diff reviews. It does not enable reviews, change PAW defaults, publish feedback, or establish that either method is equivalent or faster.

Select this skill explicitly in a host that can launch isolated leads and pass the requested native model settings to their nested stages. Packaging makes the skill discoverable; it does not add host capabilities or install a new runtime. Existing PAW Review, `paw-sot`, and [`paw-system-review`](system-review.md) remain separate methods.

## Four profiles

All review leads and non-specialist stages, including understanding, baseline, feedback, critic, synthesis, adjudication, and the independent comparison assessor, request `gpt-6-astra`, `reasoning_effort=high`, and `context_tier=long_context`. The requested tier is sometimes described as "1M"; that label does not establish the actual context capacity. Runtime metadata is recorded only when exposed.

| Profile | Evaluation reviewers | Models and effort | Perspectives |
|---------|----------------------|-------------------|--------------|
| `sot-astra-opus` | Nine built-in SoT specialists, debate | `gpt-6-astra` / `claude-opus-5`, both medium | None |
| `sot-sonnet-terra` | Nine built-in SoT specialists, debate | `claude-sonnet-5` / `gpt-5.6-terra`, both high | Premortem and retrospective for every specialist, cap 2 |
| `system-astra-opus` | Four system-review approaches | `gpt-6-astra` / `claude-opus-5`, both medium | No added overlays |
| `system-sonnet-terra` | Four system-review approaches | `claude-sonnet-5` / `gpt-5.6-terra`, both high | No added overlays |

Specialist context tiers use caller/host defaults; these profiles do not prescribe them. The two SoT arms retain existing debate mechanics and the existing PAW Review non-interactive default. Their implementation route is the fully qualified `paw-workflow:PAW-Review` agent, including understanding, baseline, derived specification, inner SoT evaluation, feedback, critic, and local finalization. Provider posting is excluded even for GitHub targets. Their planning route uses the existing SoT engine on actual planning artifacts and relevant source, without creating a fictional PR or requiring named PAW files.

The configuration IDs above are outer labels, not valid inner PAW `Review Mode` values. Reference evaluation explicitly selects `society-of-thought`. The comparison's profile data is not a new PAW configuration API.

## Repeatable assignments

Supply a positive case ordinal within a caller-owned comparison series. The bundled profile reference stores short cyclic assignment tables; no global counter or scheduler is involved. The concrete role/model/effort map is recorded before dispatch and stays fixed throughout the case.

SoT uses these nine built-in identities: architecture, assumptions, correctness, edge-cases, maintainability, performance, release-manager, security, and testing. Odd cases assign five alternating specialists to the first model and four to the second; even cases reverse those assignments. A specialist keeps its model through debate and both perspectives. Thus profile 2 starts with **10/8** model-instance counts on odd cases and **8/10** on even cases, not 9/9. The roster is not doubled to manufacture balance. Unexpected project/user persona or source overrides are reported rather than silently treated as the requested roster.

System-review assignments rotate in a four-case cycle:

| Case slot | First model's approaches | Second model's approaches |
|-----------|--------------------------|---------------------------|
| 1 | Forward, counterexample | Relational, simplicity |
| 2 | Counterexample, relational | Forward, simplicity |
| 3 | Relational, simplicity | Forward, counterexample |
| 4 | Forward, simplicity | Counterexample, relational |

The simplicity reviewer retains its assigned model and effort for any remedy assessment. The existing no-peer-remedy behavior remains: after all initial reports complete, the lead records `not-needed` without an unnecessary reviewer call.

## Inputs and boundaries

Give all arms the same pinned raw target, requirements/supporting-document versions, scope, and verification permissions. Planning inputs may be minimal. Implementation inputs must identify the exact diff semantics as well as commits; working-tree content needs hashes or an authorized snapshot.

Each arm derives its own context and findings. It cannot read another arm's evidence map, derived specification, questions, synthesis, or prior review findings. Leads use separate contexts and, when needed, separate authorized review workspaces. Sharing immutable source can be safe; sharing a checkout that baseline research switches is not.

The caller authorizes a fresh case directory and any workspace preparation or checks. Review alone does not authorize source edits, fetches, checkout switching, dependency installation, or provider actions. Native launch arguments must actually carry requested model, effort, and applicable context-tier settings. A heading or `specialist_models` value alone does not set all three.

If a host cannot honor artifact-only output or isolation, the affected arm stops. If settings, agent availability, source identity, or roster differ, the protocol preserves output and reports blocked or nonconforming execution. It does not silently substitute, rerun costly arms, or call a non-start coverage. Unknown runtime identity is distinct from an observed dispatch failure.

## Outputs and assessment

The case directory contains:

| Location | Purpose |
|----------|---------|
| `Case.md` | Input pins, ordinal, profile/role mappings, arm labels, report paths, and status |
| `arms/A/` through `arms/D/` | Four independent artifact areas, each with a `Run.md` provenance/status record and the method's original outputs |
| `COMPARISON.md` | Evidence-backed comparison, limitations, unresolved findings, and recommendation for human selection |

For implementation reference arms, the original final report is `ReviewComments.md`, retaining the full critique history. Planning reference arms and system-review arms finish with `REVIEW-SYNTHESIS.md`. Partial runs retain available artifacts and explicitly identify missing final reports.

Only after all four arms finalize or record terminal incompleteness does an independent assessor receive results. It assesses content and evidence before configuration and timing where practical, using neutral labels and preserving originals. Method/style cues can remain visible, so this is not claimed to be a blind experiment.

The comparison considers valid and consequential findings, unsupported claims, duplicates and evidence-supported misses, proportionality of remedies, actionability, uncertainty, and documented coverage. An absent finding does not prove the arm checked and cleared that behavior. Disputed decisive claims receive bounded permitted verification, not another whole-codebase review. Assessor-only discoveries remain separately attributed.

Timing and usage are reported only from available observations, with queue and concurrency effects distinguished from review work. Incomplete traces do not establish accuracy, token or dollar savings, or universal performance. A recommendation may be inconclusive; repeated cases provide evidence over time.

The operator chooses what to use or post. Choosing one report does not dispose of consequential findings from other arms, accept the current head, or turn system-review output into a PAW Review report. Publication, provider markers, readiness, design/CI gates, node policy, and owner routing remain the caller's responsibility.

Repository tests check the profile tables, rotation/distribution rules, prompt contracts, and packaging without launching reviewers. They do not establish live native-setting propagation, reviewer compliance, quality, or latency. No comparison runs or plugin installation are required by those tests.
