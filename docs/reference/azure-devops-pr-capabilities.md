# Azure DevOps Pull Request Capability Contract

This document records the Azure DevOps behavior that was verified for PAW Review integration work in issues #314, #315, and #316.

**Observed:** 2026-07-22

**Mutation boundary:** `msdata/Database Systems/devtools-test-repo`

**Production status:** Capability evidence only. PAW Review does not yet execute the Azure DevOps read, posting, or vote flows described here.

## Evidence States

| State | Meaning |
|-------|---------|
| `verified` | The operation and its asserted result were observed against the test repository. |
| `endpoint-reachable` | The endpoint returned its documented envelope, but the test repository had no configured data to prove the capability. |
| `inferred` | Documentation, endpoint shape, or observed permissions support the conclusion, but the exact boundary was not exercised. |
| `not-observed` | The behavior was intentionally not induced or did not occur during the bounded test. |
| `unsupported` | The platform rejected the operation as unavailable for the tested target or state. |

HTTP success alone is not sufficient evidence. A capability is `verified` only when the response contains the expected content tied to injected test data.

## Test Provenance

| Item | Observed value |
|------|----------------|
| Azure CLI | 2.80.0 |
| Azure DevOps CLI extension | 1.0.3 |
| Identity class | Interactive Microsoft Entra user |
| Token acquisition | Azure CLI existing session; no PAT environment variable |
| REST baseline | Azure DevOps REST 7.1; preview versions called out per endpoint |
| Pull request shape | Draft and non-draft PRs; three iterations in the primary fixture |
| Credential handling | Token held in process memory; not passed in process arguments or written to evidence |

Concrete user, tenant, project, repository, and identity IDs were used only in memory or local cleanup ledgers. They are intentionally omitted here.

## Authentication Contract

### Verified paths

1. `az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798` returned an Azure DevOps bearer token from the existing Azure CLI session.
2. `az account get-access-token --scope 499b84ac-1321-427f-aa17-267ca6975798/.default` also returned a token with the expected Azure DevOps audience.
3. `GET /_apis/connectionData?api-version=7.1-preview.1` returned JSON and a non-anonymous identity.
4. The token audience, tenant, and preferred username matched the active Azure CLI and Azure DevOps identities when compared in memory.
5. `az repos pr show` read a PR non-interactively while `AZURE_DEVOPS_EXT_PAT` was unset.

### Constraints

- An existing Azure CLI login is required. This spike did not initiate interactive authentication.
- The observed token lifetime was approximately one hour. Long operations must check expiry and reacquire before a phase or cleanup.
- A 401 must be compared with token expiry before it is classified as a permission failure.
- The resource ID is the documented Azure DevOps audience. The `.default` scope form should be retained as the forward-compatible acquisition path.
- Do not log the token response, raw authorization headers, or decoded identity claims.

## Permission Contract

The Git repository security namespace is `2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87`. The repository token format is `repoV2/{projectId}/{repositoryId}`.

The test identity's repository ACL entries were inherited and displayed as `Not set`, so the minimum permission boundary was not empirically isolated. Successful operations prove that the identity had effective access through inherited group membership, not that every listed permission is individually required.

| Operation | Azure DevOps permission or scope | Evidence |
|-----------|----------------------------------|----------|
| Read repository, PR, commits, diffs, iterations, threads | `GenericRead` / `vso.code` | Behavior verified; minimum bit inferred |
| Push source commits | `GenericContribute` and `CreateBranch` | Behavior verified; minimum combination inferred |
| Create the coordination tag | `CreateTag` | Behavior verified |
| Delete disposable branches and tags | `ForcePush` | Behavior verified; minimum bit inferred |
| Create/update PRs and reviewer votes | `PullRequestContribute` / `vso.code_write` | Behavior verified; minimum bit inferred |
| Read/write PR threads | `PullRequestContribute` and/or `vso.threads_full` | Behavior verified; exact minimum inferred |
| Read/write PR status | `vso.code_status` or `vso.code_write` | Behavior verified; exact minimum inferred |
| Read build associations | `ViewBuilds` plus repository read | Endpoint reachable; no build observed |
| Read policy evaluations | Policy evaluation read access | Non-empty behavior verified on a non-draft PR |

### Permission failures

A genuine permission-denied contrast was not available with the single, over-privileged interactive identity. Therefore:

- Minimum permissions remain `inferred`.
- A 403 authorization boundary remains `not-observed`.
- A 404 may mean absent or authorization-masked; the client has no reliable discriminator without an independently authorized existence check.
- Issues #314-#316 must fail early and describe the missing capability rather than interpreting all 404 responses as absence.

## Read Capability Matrix

| Capability | Endpoint and version | State | Observed contract |
|------------|----------------------|-------|-------------------|
| Repository metadata | `GET .../repositories/{repository}` 7.1 | `verified` | Repository, project, default branch, and IDs were present and matched the approved target. |
| PR metadata | `GET .../pullRequests/{id}` 7.1 | `verified` | Source/target refs and commits, draft/status state, reviewers, and `supportsIterations` were available. |
| PR commits | `GET .../pullRequests/{id}/commits` 7.1 | `verified` | Three source commits were returned for the primary fixture. |
| Current net diff | `GET .../diffs/commits` 7.1 | `verified` | The final source-to-target tree returned the current net changes. |
| Iterations | `GET .../pullRequests/{id}/iterations` 7.1 | `verified` | Three iterations were returned after three pushes. |
| Iteration changes | `GET .../iterations/{id}/changes` 7.1 | `verified` | Exact fixture paths, change types, and `changeTrackingId` values were returned. |
| Identical-iteration negative control | Same endpoint with `compareTo` equal to the iteration | `verified` | Returned zero changes. |
| PR threads | `GET .../threads` 7.1 | `verified` | Summary, inline, reply, status, and deletion state were returned. |
| Iteration-relative thread positions | `GET .../threads?$iteration=N&$baseIteration=M` 7.1 | `verified` | Current position depends on the requested iteration pair. |
| Reviewers and votes | PR metadata and reviewer endpoints 7.1 | `verified` | Reviewer presence and persisted vote were readable. |
| PR statuses | `GET .../statuses` 7.1 | `verified` | A posted status was returned by context and iteration. |
| Policy evaluations | `GET .../policy/evaluations` 7.1-preview.1 | `verified` | A non-draft PR produced four policy evaluations in the test repository. |
| Build associations | `GET .../build/builds` 7.1 | `endpoint-reachable` | Source and merge-ref queries returned the documented envelope with zero builds. |

### Diff and iteration semantics

The current commit diff and iteration changes answer different questions:

- The final commit diff described the net source-to-target tree.
- Iteration changes preserved intermediate edit, rename, and delete transitions needed for review anchoring.

Issue #314 should acquire both when later stages need current code plus iteration history.

### Thread position semantics

Inline threads were created on:

- a line moved between iterations;
- a file renamed in a later iteration;
- a file deleted in a later iteration.

When threads were listed against iteration 3 with iteration 1 as the base, the tested comments became left-side-only (`rightLine = 0`) and retained their original paths. No populated tracking criteria remapped them to the moved line or renamed path.

Consequences for #314 and #315:

- Always provide `$iteration` and `$baseIteration` when current diff-relative positions are needed.
- Preserve original context because an outdated thread may have no current right-side position.
- Do not assume Azure DevOps follows a moved line or renamed file automatically.

## Mutation Capability Matrix

| Capability | Endpoint and version | State | Observed contract |
|------------|----------------------|-------|-------------------|
| Create PR | `POST .../pullRequests` 7.1 | `verified` | Returned HTTP 201 with matching source/target refs and draft state. |
| Update/abandon PR | `PATCH .../pullRequests/{id}` 7.1 | `verified` | Active/abandoned transitions were accepted. |
| Create summary thread | `POST .../threads` 7.1 | `verified` | Returned a thread and initial comment immediately; there is no pending-review bundle. |
| Create inline thread | `POST .../threads` 7.1 | `verified` | Required file/line context, `changeTrackingId`, and a valid iteration context. |
| Reply | `POST .../threads/{threadId}/comments` 7.1 | `verified` | Reply creation succeeded. |
| Update comment | `PATCH .../comments/{commentId}` 7.1 | `verified` | Updated content was returned. |
| Delete comment | `DELETE .../comments/{commentId}` 7.1 | `verified` | Returned HTTP 200 and soft-deleted the comment. Initial comments were also deleted during cleanup. |
| Update thread status | `PATCH .../threads/{threadId}` 7.1 | `verified` | `active -> fixed -> active` round-tripped. |
| Post PR status | `POST .../statuses` 7.1 | `verified` | Status context, state, iteration, and description persisted. |
| Delete PR status while active | `DELETE .../statuses/{statusId}` 7.1 | `verified` | Cleanup succeeded after temporarily reactivating the disposable PR. |
| Delete PR status while abandoned | Same endpoint | `unsupported` for that state | Returned 403 `GitPullRequestStatusNotEditableException`. Delete statuses before abandonment. |
| Write thread after abandonment | `POST .../threads` 7.1 | `verified` | Azure DevOps accepted a new thread on an abandoned PR. Clients must enforce their own active-state precondition. |
| Reviewer vote | `PUT .../reviewers/{selfId}` 7.1 | `verified` on non-draft PR | Votes `-10`, `-5`, `5`, `10`, and `0` persisted and read back. |
| Invalid reviewer vote | Same endpoint with `999` | `verified` failure | Returned 400 `InvalidEnumArgumentException`. |

### Draft vote constraint

On a draft PR, vote requests returned HTTP 200 but the requested non-zero values did not persist. On a non-draft PR, all documented vote values round-tripped.

Issue #316 must:

1. Verify the PR is non-draft before attempting a vote.
2. Add or resolve the authenticated caller as the reviewer being updated.
3. Read the vote back after mutation.
4. Treat HTTP 200 without the requested persisted vote as a failed mutation.
5. Keep vote mutation independent from comment posting.

The effect of each vote on branch-policy completion was not isolated. It remains configuration-dependent and must not be inferred from the integer label alone.

## Concurrency, Retry, and Idempotency

### Verified

- Git ref creation used `oldObjectId = 000...000`; a duplicate create returned HTTP 200 with `success = false` and `updateStatus = staleOldObjectId`.
- Two identical summary-thread creates produced two distinct threads. Thread creation is duplicate-producing.
- A stale inline thread request using iteration 1 after later pushes was accepted with HTTP 200 and no stale-target rejection signal.

### Required integration behavior

| Operation | Required behavior |
|-----------|-------------------|
| Create thread/comment | Add a deterministic marker and read before retrying. Never blind-retry POST. |
| Update thread/comment/vote/status | Read current state before retry; treat the operation as state-setting, not transactionally idempotent. |
| Positional inline comment | Re-fetch the latest head, iterations, and change tracking immediately before every write. |
| Ref create/delete | Inspect each result object's `success` and `updateStatus`; HTTP 200 is not sufficient. |
| PR create | Look up the deterministic source ref/title before retrying to avoid duplicate PRs. |

True transport-loss and server-side partial-commit behavior were not safely induced. Those rows remain `not-observed`.

## Status, Policy, and Build Contract

The non-draft vote fixture produced four policy evaluations:

| Policy type | Observed state | Blocking |
|-------------|----------------|----------|
| Comment requirements | approved | no |
| Work item linking | queued | no |
| Status | queued | yes |
| Minimum number of reviewers | queued | yes |

This is repository configuration, not a platform guarantee. #314 must distinguish:

- no policy configured (`endpoint-reachable`);
- policy present but queued/running;
- policy approved/rejected;
- policy blocked by missing status/reviewer/work-item data.

No build was associated with either the source branch or PR merge ref during the observation window. The build list API is reachable, but build-shape behavior remains `not-observed` in this repository.

PR status read/write is separately `verified`. A configured status policy does not mean an arbitrary status context satisfies it.

## Failure Contract

| Scenario | HTTP result | Body/result contract | Classification |
|----------|-------------|----------------------|----------------|
| Missing repository | 404 | JSON `GitRepositoryNotFoundException` | `verified` |
| Authorization-masked repository | expected 404 | No reliable client-visible discriminator | `inferred` |
| Unsupported `api-version=0.0` | 404 | HTML, not JSON | `verified` |
| Invalid inline `firstComparingIteration=0` | 400 | `ArgumentOutOfRangeException` | `verified` |
| Invalid vote `999` | 400 | `InvalidEnumArgumentException` | `verified` |
| Stale ref create | 200 | Per-item `success=false`, `staleOldObjectId` | `verified` |
| Delete status after PR abandonment | 403 | `GitPullRequestStatusNotEditableException` | `verified` state failure, not authorization proof |
| Genuine permission denial | not observed | Single identity could not produce a controlled contrast | `inferred` |
| 409/412 conditional conflict | not observed | No safe endpoint-specific fixture | `not-observed` |
| 429 throttling | not observed | Deliberate load testing was prohibited | `not-observed` |
| Expired token/non-JSON sign-in response | not observed | Token was refreshed before expiry | `not-observed` |

Clients must inspect:

1. HTTP status;
2. `Content-Type`;
3. JSON `typeKey`/`typeName` when present;
4. per-item result fields such as `success` and `updateStatus`;
5. the resulting server state.

## Cleanup Contract and Test Record

Disposable branches and the coordination tag were deleted. Votes were reset to `0`. Custom marker comments were deleted. The three PR records remain abandoned because Azure DevOps PRs are auditable records rather than deletable disposable objects.

| PR | Purpose | Final state |
|----|---------|-------------|
| 2211554 | Initial thread API and invalid iteration-context diagnosis | abandoned; branch deleted; marker comments deleted; vote `0` |
| 2211563 | Primary three-iteration thread/status probe | abandoned; branch deleted; marker comments and PR status deleted; vote `0` |
| 2211583 | Non-draft reviewer vote probe | abandoned; branch deleted; vote `0` |

Final verification found:

- no `paw-capability-probe/*` branches;
- no `paw-capability-probe-lease` tag;
- no live custom marker comments;
- no remaining probe status;
- all three PRs abandoned;
- all author votes reset to `0`.

Two earlier pre-PR attempts created and deleted only the coordination tag before failing closed. They created no source branch or pull request.

Cleanup order matters:

1. Reset vote.
2. Delete PR statuses while the PR is active.
3. Delete comments that should not remain.
4. Abandon the PR.
5. Delete source refs.
6. Verify absence/state through independent list and object reads.

## Replay Checklist

Use this checklist for re-verification. It is intentionally credential-free and is not a production integration script.

1. Confirm the Azure CLI session, expected tenant/identity, token audience, and remaining lifetime.
2. Resolve the project and repository once; build every mutation URL from that immutable handle.
3. Acquire an atomic coordination ref with `oldObjectId = 000...000`; stop if it already exists.
4. Create a uniquely named source branch and a non-draft PR.
5. Add deterministic files for edit, move, rename, and delete behavior.
6. Push at least three iterations and assert exact paths/change types for each iteration.
7. Create fixed-marker summary and inline threads; exercise reply, update, delete, and status transitions.
8. Re-list threads with explicit `$iteration` and `$baseIteration`.
9. Repeat one create request to prove duplicate behavior.
10. Attempt one stale positional write and confirm whether it is rejected or silently accepted.
11. Exercise documented vote values on the non-draft PR; read after every write; reset to `0`.
12. Post/read/delete a PR status before abandonment.
13. Read policy and build data; label empty envelopes as reachable, not verified.
14. Abandon the PR and confirm whether terminal-state writes remain possible.
15. Delete comments, refs, and the coordination tag; verify no live marker content remains.
16. Scan durable output for bearer/JWT/token patterns, concrete identities, and replacement characters before commit.

## Integration Boundaries

### Issue #314: PR read and CI context

Implement:

- Azure CLI/Entra preflight before expensive evaluation;
- metadata, source/target commits, commit list, net diff, iterations, iteration changes, threads, reviewers, statuses, policies, and build queries;
- explicit empty/configuration-dependent states;
- iteration-relative thread reads;
- content-type-aware errors and 404 ambiguity.

Do not claim:

- minimum permissions from the current developer identity;
- build behavior when no build was observed;
- authorization failure from a missing-resource 404.

### Issue #315: summary and inline posting

Implement:

- immediate summary and inline thread posting with no GitHub-style pending-review assumption;
- exact target, head, iteration, and change-tracking verification before mutation;
- deterministic markers and read-before-write deduplication;
- re-fetch-before-positional-write;
- reply/update/delete/status support;
- active-state precondition even though Azure DevOps accepts threads after abandonment;
- status cleanup before abandonment.

Treat full transport-loss idempotency as a design requirement, not a verified platform guarantee.

### Issue #316: optional vote and status

Implement:

- independent explicit authorization for vote mutation;
- non-draft preflight;
- caller/reviewer identity verification;
- documented vote enum validation;
- read-after-write verification;
- reset/recovery behavior;
- independent comment and vote failure handling.

Keep branch-policy gating, distinct-reviewer behavior, and least-privilege vote permissions as explicit gaps until a second principal and controlled policy fixture are available.

## Re-verification

| Evidence class | Suggested validity |
|----------------|--------------------|
| GA endpoint shape | 180 days or Azure DevOps REST version change |
| Preview endpoint shape | 30 days |
| Repository policy/build behavior | Re-run after configuration changes |
| Identity/permission behavior | Re-run for every production principal class |
| Thread anchoring behavior | Re-run before #315 and after iteration API changes |
| Vote behavior | Re-run before #316 or after draft/policy changes |

## Sources

- [Azure CLI access tokens](https://learn.microsoft.com/cli/azure/account#az-account-get-access-token)
- [Azure DevOps authentication with Microsoft Entra tokens](https://learn.microsoft.com/azure/devops/integrate/get-started/authentication/entra-oauth)
- [Azure DevOps Git REST API 7.1](https://learn.microsoft.com/rest/api/azure/devops/git/)
- [Pull request threads](https://learn.microsoft.com/rest/api/azure/devops/git/pull-request-threads/)
- [Pull request reviewers](https://learn.microsoft.com/rest/api/azure/devops/git/pull-request-reviewers/)
- [Pull request statuses](https://learn.microsoft.com/rest/api/azure/devops/git/pull-request-statuses/)
- [Pull request iterations](https://learn.microsoft.com/rest/api/azure/devops/git/pull-request-iterations/)
- [Policy evaluations](https://learn.microsoft.com/rest/api/azure/devops/policy/evaluations/)
- [Security namespace reference](https://learn.microsoft.com/azure/devops/organizations/security/namespace-reference)
