# Plan: Azure DevOps Review Context

## Approach Summary

Extend the existing PAW Review Understanding stage rather than introducing a second artifact owner. Azure DevOps reviews will explicitly load a dedicated read-context reference that defines canonical target validation, current-principal Microsoft Entra authentication, GET-only REST acquisition, snapshot consistency, state preservation, redaction, and failure classification. The Understanding skill will own live read preflight and map sanitized results into the same `ReviewContext.md` consumed by downstream review stages.

## Work Items

- [x] **Define the Azure DevOps read contract**
  - Add `skills/paw-review-understanding/references/azure-devops-read-context.md` and an explicit Understanding-skill directive to load it for every Azure DevOps review; block if the reference is unavailable rather than silently degrading.
  - Parse only HTTPS Azure DevOps PR URLs, reject userinfo/authority confusion and unsupported hosts, normalize names/encoding, resolve the target repository in memory, and verify that the resolved repository and PR match the supplied target before attaching a bearer token to follow-up requests.
  - Keep the production target generic within allowlisted Azure DevOps hosts. Restrict this implementation's live validation and disposable fixtures to `https://dev.azure.com/msdata/Database%20Systems/_git/devtools-test-repo`.
  - Acquire the Azure DevOps `.default` token from the actual runtime principal through the existing Azure CLI session, keep the token and connection identity in one process's memory, verify remaining lifetime and non-anonymous connection data, reacquire on expiry, and distinguish expired-token 401 from unavailable credentials or denied access.
  - Route acquisition through a GET-only endpoint allowlist. Posting, voting, status mutation, comment mutation, ref mutation, and any non-GET request remain out of scope even when the current principal has write permissions.
  - Define every required endpoint, API version, pagination mechanism, and completeness oracle: repository, PR metadata, commits, commit diff, iterations, iteration changes, iteration-relative threads, reviewers, PR statuses, policy evaluations, and source/merge-ref builds.
  - Pin the source head, target head, and iteration at acquisition start; revalidate them after all reads and restart or block on a push, retarget, or inconsistent snapshot. Treat `hasMultipleMergeBases` or conflicting common-commit evidence as an ambiguous baseline requiring an actionable block.
  - Validate `Content-Type` before parsing every response, including 2xx. Classify repository-level 404 as ambiguous, child 404 as absent only with prior trusted provenance, 403 as denied, expired 401 separately from authorization, preview/version drift as unsupported or ambiguous, and remaining transport failures as unreachable.
  - Use runtime states `observed`, `empty-reachable`, `partial`, `unsupported`, `denied`, `ambiguous`, and `unreachable`. Keep capability-report provenance states such as `not-observed` separate from live result states.
  - Never claim an empty collection proves configuration absence without endpoint-specific permission evidence. Preserve policy queued/running/approved/rejected/broken and build observed/empty-reachable distinctions.
  - Apply default-drop mapping at the acquisition boundary: raw responses, tokens, authorization headers, challenges, tenant/principal claims, project/repository IDs, participant identities, and verbatim thread bodies never enter artifacts or logs. Retain thread state, iteration-relative position, and a sanitized review-relevant summary without stable participant pseudonyms.
- [x] **Wire acquisition into PAW Review**
  - Narrow existing "do not probe Azure DevOps" rules to output/mutation capability only. The agent and workflow route Azure DevOps reviews and preserve artifact-only output; `paw-review-understanding` is the single owner of hosted read preflight, acquisition, redaction, and `ReviewContext.md` mapping.
  - Update identifier derivation so hosted Azure DevOps PRs use the same `PR-<number>` / `PR-<number>-<repo-slug>` artifact scheme as GitHub.
  - Expand the `ReviewContext.md` template and validation criteria with platform-neutral read-preflight, snapshot, change, discussion, status, policy, build, and capability sections.
  - Record the platform common commit as `Base Commit`, source tip as `Head Commit`, target tip separately, and the exact source of each value. Preserve ADO-native iteration/policy details in clearly scoped subsections rather than forcing them into lossy generic fields.
  - Record current net changes with paths/change types, iteration history and tracking changes, stale/left-only thread positions, reviewer vote-state counts without identities, PR status contexts, policy blocking/state, and build state. Preserve unknown policy/build types with an explicit passthrough marker.
  - Make downstream review skills consume `ReviewContext.md` as before; no posting or voting skill is added.
- [x] **Align specifications and user-facing references**
  - Update the canonical review specification and mirrored documentation to describe production Azure DevOps read support while retaining artifact-only output.
  - Document the expanded ReviewContext contract, read/output preflight separation, runtime state taxonomy, privacy boundary, and approved validation target.
- [x] **Add regression coverage and validate**
  - Add fast contract tests for reference loading, endpoint/version/pagination coverage, target/auth/redaction invariants, state semantics, failure mapping, ReviewContext fields, and the no-post/no-vote boundary.
  - Add workflow tests that give the Understanding skill deterministic synthetic Azure DevOps response fixtures for one successful multi-surface acquisition and one ambiguous repository 404. Assert concrete `ReviewContext.md` output or an actionable pre-artifact block, plus sentinel absence for credentials and identities.
  - Cover expired-token, empty-reachable, pagination, and 2xx HTML semantics with fast contract assertions; deeper agent-level fixture coverage remains follow-up validation.
  - Keep synthetic fixtures credential-free and identity-free; do not commit raw live HTTP recordings.
  - Run targeted integration tests, prompt lint with before/after token counts, repository lint/build checks, and strict documentation validation.
  - Re-run read-only live validation against `devtools-test-repo` as an acceptance gate, not a regression substitute. Record only redacted state classifications and fail explicitly if the approved target is unreachable.

## Key Decisions

- Keep `paw-review-understanding` as the sole owner of `ReviewContext.md`; store the detailed Azure DevOps mechanics in `skills/paw-review-understanding/references/azure-devops-read-context.md`.
- Make the reference load seam explicit and tested because `paw_get_skill` returns only `SKILL.md`; filesystem loading failure is blocking.
- Separate output-capability preflight from Azure DevOps read-capability preflight. Artifact-only output does not imply hosted read context is unavailable.
- Use Azure DevOps REST 7.1 for stable endpoints and 7.1-preview.1 only for endpoints that require it; version/content-type drift is never treated as an empty result.
- Treat the validated net-diff/iteration common commit as the review baseline, while recording target and source commit tips separately and blocking on multiple or inconsistent merge-base evidence.
- Use endpoint-specific `empty-reachable` rather than claiming "no data" when the principal's visibility cannot be independently proven.
- Accept that the current-principal token may be write-capable; compensate with a GET-only endpoint allowlist and negative no-mutation tests.
- Read thread content only in memory. Commit sanitized state/location/summary context, never verbatim discussion text or participant identity.
- Preserve unknown Azure DevOps policy/build concepts as scoped passthrough data instead of dropping them from the platform-neutral artifact.
- Treat live validation as dated acceptance evidence. Deterministic synthetic fixtures provide regression coverage.

### Accepted Evidence Gaps

- The capability report verified one interactive Azure CLI principal; service principal, managed identity, workload federation, PAT, and minimum-permission behavior remain unobserved. Production preflight reports the actual credential class and effective access without claiming minimum grants.
- Azure DevOps cannot reliably distinguish an authorization-masked repository 404 from absence. Repository 404 remains ambiguous and blocks review.
- Empty build/policy/status envelopes prove endpoint reachability only. They do not prove no configuration or no CI.
- Policy evaluation remains a preview API dependency and must surface drift explicitly.
- Agent-level synthetic fixtures currently cover successful mapping and ambiguous repository 404. Expired-token, multi-page, empty-reachable, and 2xx HTML workflow cases are specified and contract-tested but not separately driven through an LLM session.

## Open Questions

None. The unresolved platform evidence above is handled as explicit runtime state and accepted risk rather than inferred capability.
