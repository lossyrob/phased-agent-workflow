# Azure DevOps Pull Request Capability Evidence and Contract

This document records verified Azure DevOps behavior and explicit evidence gaps for PAW Review integration work in issues #314, #315, and #316. It is an implementation input, not a substitute for re-verifying the production credential, organization configuration, or preview API shape.

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

### Scope of generalization

- Verified platform: Azure DevOps Services (`dev.azure.com`), not Azure DevOps Server.
- Verified identity: one interactive, over-privileged Microsoft Entra user with an existing Azure CLI login.
- Verified surface: direct REST and Azure DevOps CLI behavior in one organization and repository.
- Not verified: service principal, managed identity, workload identity federation, PAT, lower-privilege principal, SDK, or MCP behavior.
- Issues #314-#316 must re-establish authentication and permission behavior using their real runtime principal before relying on mutation rows.

## Capability Evidence Ledger

This ledger preserves the per-row provenance required for re-verification without publishing raw response bodies or identity values.

| ID | Consumer | State | Observed | Oracle or shape fingerprint | Validity, trigger, and owner |
|----|----------|-------|----------|-----------------------------|------------------------------|
| AUTH-1 | #314-#316 | `verified` | 2026-07-22 | JSON connection data; non-anonymous identity; audience, tenant, and identity matched in memory | 30 days; re-run for credential/runtime change; owner: each consuming issue |
| REPO-1 | #314 | `verified` | 2026-07-22 | Repository/project/default branch matched the approved immutable handle | 180 days; re-run on repository rename/move; owner: #314 |
| REF-1 | #314-#315 | `verified` | 2026-07-22 | Ref create returned `success=true`, `updateStatus=succeeded` | 180 days; re-run on Git API change; owner: #315 |
| REF-2 | #314-#315 | `verified` | 2026-07-22 | Duplicate ref create returned HTTP 200 plus `success=false`, `staleOldObjectId` | 180 days; re-run on Git API change; owner: #315 |
| PERM-1 | #314-#316 | `endpoint-reachable` | 2026-07-22 | Repository ACL rows were inherited/`Not set`; successful operations proved access but not minimum grants | Per runtime principal; owner: each consuming issue |
| PR-1 | #314 | `verified` | 2026-07-22 | HTTP 201; source/target refs, draft flag, and active state matched fixture | 180 days; owner: #314 |
| DIFF-1 | #314-#315 | `verified` | 2026-07-22 | Exact fixture paths plus change types and `changeTrackingId`; identical-iteration negative control returned zero | 180 days; owner: #314 |
| THREAD-1 | #315 | `verified` | 2026-07-22 | Two identical creates produced distinct thread IDs and two matching server threads | 180 days; owner: #315 |
| THREAD-2 | #315 | `verified` | 2026-07-22 | Reply create/update/delete and `active -> fixed -> active` round-tripped | 180 days; owner: #315 |
| THREAD-3 | #315 | `verified` | 2026-07-22 | Stale iteration-1 positional write returned HTTP 200 with no rejection signal | 90 days; re-run on iteration/thread API change; owner: #315 |
| THREAD-4 | #315 | `verified` | 2026-07-22 | At iteration 3/base 1, moved/renamed/deleted targets were left-side-only (`rightLine=0`) | 90 days; re-run on tracking behavior change; owner: #315 |
| VOTE-1 | #316 | `verified` | 2026-07-22 | Non-draft self-reviewer votes `-10,-5,5,10,0` persisted; invalid `999` returned 400 | 90 days; re-run on draft/policy/identity change; owner: #316 |
| VOTE-2 | #316 | `verified` | 2026-07-22 | Draft non-zero votes returned HTTP 200 but read back as `0` | 90 days; owner: #316 |
| STATUS-1 | #314-#315 | `verified` | 2026-07-22 | PR status POST/GET matched context, state, description, and iteration | 90 days; re-run on status-policy change; owner: #315 |
| STATUS-2 | #315 | `verified` | 2026-07-22 | Status delete succeeded while active; abandoned delete returned 403 `GitPullRequestStatusNotEditableException` | 90 days; owner: #315 |
| POLICY-1 | #314 | `verified` | 2026-07-22 | Requested 7.1-preview.1; shape `count,value[].{status,configuration.type,configuration.isBlocking}`; four config-specific rows in non-draft fixture | 30 days or policy change; owner: #314 |
| BUILD-1 | #314 | `endpoint-reachable` | 2026-07-22 | Requested 7.1; shape `count,value[]`; zero source and merge-ref builds | 30 days or pipeline change; owner: #314 |
| FAIL-1 | #314 | `verified` | 2026-07-22 | Missing repository returned 404 JSON `GitRepositoryNotFoundException` | 180 days; owner: #314 |
| FAIL-2 | #314-#316 | `verified` | 2026-07-22 | Corrected resolved-repository request with `api-version=0.0` returned 404 HTML | 30 days; re-run on routing/version change; owner: each consuming issue |
| FAIL-3 | #315 | `verified` | 2026-07-22 | `firstComparingIteration=0` returned 400 `ArgumentOutOfRangeException` | 180 days; owner: #315 |
| MINPERM-GAP | #314-#316 | `inferred` | 2026-07-22 | One over-privileged principal cannot establish minimum grants; authorization-masked 404 has no discriminator | Re-run with a lower-privilege principal; owner: each consuming issue |
| DENIAL-GAP | #314-#316 | `not-observed` | 2026-07-22 | No genuine controlled permission-denied 403 was produced | Re-run with a controlled denied operation; owner: each consuming issue |
| THROTTLE-GAP | #314-#316 | `not-observed` | 2026-07-22 | No deliberate load test; no incidental 429 | Re-run only if safely observed; owner: each consuming issue |
| TRANSPORT-GAP | #315 | `not-observed` | 2026-07-22 | Duplicate behavior observed; true transport loss/server partial commit not induced | Resolve in client design/tests; owner: #315 |
| TERMINAL-1 | #314-#315 | `verified` | 2026-07-22 | Abandoned PR remained readable and accepted a new thread | 90 days; owner: #315 |

## Authentication Contract

### Verified paths

1. The following acquisition forms returned an Azure DevOps bearer token from the existing Azure CLI session:

   ```powershell
   # Capture directly into memory. Do not print the response or token.
   $tokenResponse = az account get-access-token `
       --resource 499b84ac-1321-427f-aa17-267ca6975798 `
       --output json | ConvertFrom-Json
   $token = $tokenResponse.accessToken
   ```

   The equivalent `--scope 499b84ac-1321-427f-aa17-267ca6975798/.default` form also returned the expected audience.

3. `GET /_apis/connectionData?api-version=7.1-preview.1` returned JSON and a non-anonymous identity.
4. The token audience, tenant, and preferred username matched the active Azure CLI and Azure DevOps identities when compared in memory.
5. `az repos pr show` read a PR non-interactively while `AZURE_DEVOPS_EXT_PAT` was unset.

### Constraints

- An existing Azure CLI login is required. This spike did not initiate interactive authentication.
- The observed token lifetime was approximately one hour. Long operations must check expiry and reacquire before a phase or cleanup.
- A 401 must be compared with token expiry before it is classified as a permission failure.
- The resource ID is the documented Azure DevOps audience. The `.default` scope form should be retained as the forward-compatible acquisition path.
- Do not log the token response, raw authorization headers, or decoded identity claims.
- The capture snippet is safe only when its output remains assigned in-process. Consumers must retain the expiry check, 401-vs-expiry classification, and no-log rules with the snippet.
- Service-principal, managed-identity, and workload-federation acquisition remain `not-observed`; production implementation must verify its real credential class.

## Permission Contract

The Git repository security namespace is `2e9eb7ed-3c0a-47d4-87c1-0ffdd275fd87`. The repository token format is `repoV2/{projectId}/{repositoryId}`.

The test identity's repository ACL entries were inherited and displayed as `Not set`, so the minimum permission boundary was not empirically isolated. Successful operations prove that the identity had effective access through inherited group membership, not that every listed permission is individually required.

Azure DevOps security permissions and OAuth/PAT scopes are separate enforcement layers, not interchangeable alternatives. The verified Microsoft Entra token did not expose the legacy `vso.*` scope boundary. Scope values below come from endpoint documentation and remain `inferred/not exercised`.

| Operation | Azure DevOps security permission (resource ACL) | OAuth/PAT scope reference (not exercised) | Evidence |
|-----------|--------------------------------------------------|--------------------------------------------|----------|
| Read repository, PR, commits, diffs, iterations, threads | `GenericRead` (minimum inferred) | `vso.code` | Behavior verified |
| Push source commits | `GenericContribute` plus `CreateBranch` (minimum combination inferred) | `vso.code_write` | Behavior verified |
| Create the coordination tag | `CreateTag` (minimum inferred) | `vso.code_write` | Behavior verified |
| Delete disposable branches and tags | `ForcePush` (minimum inferred) | `vso.code_write` | Behavior verified |
| Create/update PRs and reviewer votes | `PullRequestContribute` (minimum inferred) | `vso.code_write` | Behavior verified |
| Read/write PR threads | `PullRequestContribute` (exact minimum inferred) | `vso.threads_full` or `vso.code_write`, per endpoint docs | Behavior verified |
| Read/write PR status | Exact ACL permission not isolated | `vso.code_status` or `vso.code_write` | Behavior verified |
| Read build associations | `ViewBuilds` plus repository read (minimum inferred) | `vso.build` / repository read scopes, per endpoint docs | Endpoint reachable; populated shape not observed |
| Read policy evaluations | Exact ACL permission not isolated | Endpoint-specific read scope | Non-empty behavior verified for the test configuration |

### Permission failures

A genuine permission-denied contrast was not available with the single, over-privileged interactive identity. Therefore:

- Minimum permissions remain `inferred`.
- A 403 authorization boundary remains `not-observed`.
- A 404 may mean absent or authorization-masked; the client has no reliable discriminator without an independently authorized existence check.
- For a repository-level 404, fail as ambiguous unless an independently authorized lookup proves absence.
- For a deterministic child resource under an already verified repository handle, absence can be accepted only when the exact ID/ref came from the run ledger or a prior successful read.
- Empty build, policy, or status collections also do not prove configuration absence when the production principal's read permission has not been independently established.

!!! warning "Authorization boundary"

    The read/write API shapes are verified. Permission minima, genuine denial behavior, and authorization-masked 404 handling are not. Do not copy a matrix row into a production grant without re-testing the real principal.

## Read Capability Matrix

**Git base path:** `https://dev.azure.com/{organization}/{project}/_apis/git`

Use the resolved `{repositoryId}` rather than the repository name after target validation.

| Capability | Endpoint and version | State | Observed contract |
|------------|----------------------|-------|-------------------|
| Repository metadata | `GET /repositories/{repositoryId}` 7.1 | `verified` | Repository, project, default branch, and IDs were present and matched the approved target. |
| PR metadata | `GET /repositories/{repositoryId}/pullRequests/{pullRequestId}` 7.1 | `verified` | Source/target refs and commits, draft/status state, reviewers, and `supportsIterations` were available. |
| PR commits | `GET /repositories/{repositoryId}/pullRequests/{pullRequestId}/commits` 7.1 | `verified` | Three source commits were returned for the primary fixture. |
| Current net diff | `GET /repositories/{repositoryId}/diffs/commits` 7.1 | `verified` | The final source-to-target tree returned the current net changes. |
| Iterations | `GET /repositories/{repositoryId}/pullRequests/{pullRequestId}/iterations` 7.1 | `verified` | Three iterations were returned after three pushes. |
| Iteration changes | `GET /repositories/{repositoryId}/pullRequests/{pullRequestId}/iterations/{iterationId}/changes` 7.1 | `verified` | Exact fixture paths, change types, and `changeTrackingId` values were returned. |
| Identical-iteration negative control | Same endpoint with `compareTo` equal to the iteration | `verified` | Returned zero changes. |
| PR threads | `GET /repositories/{repositoryId}/pullRequests/{pullRequestId}/threads` 7.1 | `verified` | Summary, inline, reply, status, and deletion state were returned. |
| Iteration-relative thread positions | Same endpoint with `$iteration` and `$baseIteration` | `verified` | Current position depends on the requested iteration pair. |
| Reviewers and votes | PR metadata and reviewer endpoints 7.1 | `verified` | Reviewer presence and persisted vote were readable. |
| PR statuses | `GET .../statuses` 7.1 | `verified` | A posted status was returned by context and iteration. |
| Policy evaluations | `GET /_apis/policy/evaluations` 7.1-preview.1 | `verified` | Endpoint returned a non-empty, configuration-specific snapshot on a non-draft PR; see POLICY-1. |
| Build associations | `GET /_apis/build/builds` 7.1 | `endpoint-reachable` | Source and merge-ref queries returned `count,value[]` with zero builds; populated build shape remains `not-observed`. |

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

!!! danger "Fail-closed target guard required"

    These writes were authorized only for `msdata/Database Systems/devtools-test-repo`. Resolve the canonical organization, project, repository ID, and PR ID once; assemble every mutation URL from that immutable handle; and abort before the request if the reconstructed target differs.

| Capability | Endpoint and version | State | Observed contract |
|------------|----------------------|-------|-------------------|
| Create PR | `POST /repositories/{repositoryId}/pullRequests` 7.1 | `verified` | Returned HTTP 201 with matching source/target refs and draft state. |
| Update/abandon PR | `PATCH /repositories/{repositoryId}/pullRequests/{pullRequestId}` 7.1 | `verified` | Active/abandoned transitions were accepted. |
| Create summary thread | `POST /repositories/{repositoryId}/pullRequests/{pullRequestId}/threads` 7.1 | `verified` | Returned a thread and initial comment immediately; there is no pending-review bundle. |
| Create inline thread | Same endpoint with file/iteration context | `verified` | Required file/line context, `changeTrackingId`, and a valid iteration context. |
| Reply | `POST .../threads/{threadId}/comments` 7.1 | `verified` | Reply creation succeeded. |
| Update comment | `PATCH .../threads/{threadId}/comments/{commentId}` 7.1 | `verified` | Updated content was returned. |
| Delete comment | `DELETE .../threads/{threadId}/comments/{commentId}` 7.1 | `verified` | Returned HTTP 200 and soft-deleted the comment. Initial comments were also deleted during cleanup. |
| Update thread status | `PATCH .../threads/{threadId}` 7.1 | `verified` | `active -> fixed -> active` round-tripped. |
| Post PR status | `POST .../pullRequests/{pullRequestId}/statuses` 7.1 | `verified` | PR status context, state, iteration, and description persisted. |
| Delete PR status while active | `DELETE .../statuses/{statusId}` 7.1 | `verified` | Cleanup succeeded after temporarily reactivating the disposable PR. |
| Delete PR status while abandoned | Same endpoint | `unsupported` | For the abandoned state, returned 403 `GitPullRequestStatusNotEditableException`. Delete PR statuses before abandonment. |
| Write thread after abandonment | `POST .../threads` 7.1 | `verified` | Azure DevOps accepted a new thread on an abandoned PR. Clients must enforce their own active-state precondition. |
| Reviewer vote | `PUT .../reviewers/{selfId}` 7.1 | `verified` | On a non-draft PR, votes `-10`, `-5`, `5`, `10`, and `0` persisted and read back. |
| Invalid reviewer vote | Same endpoint with `999` | `verified` | Returned 400 `InvalidEnumArgumentException`. |

### Draft vote constraint

The caller created each fixture PR, added itself as the reviewer through the vote endpoint, and updated its own reviewer slot. Distinct-reviewer behavior remains `inferred`.

On a draft PR, vote requests returned HTTP 200 but each requested non-zero value read back as `0`. On a non-draft PR, all documented vote values round-tripped.

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

The non-draft vote fixture produced the following point-in-time policy snapshot:

| Policy type | Observed state | Blocking |
|-------------|----------------|----------|
| Comment requirements | approved | no |
| Work item linking | queued | no |
| PR Status policy | queued | yes |
| Minimum number of reviewers | queued | yes |

This snapshot was read immediately after fixture operations; no settle-window conclusion was claimed. It is repository configuration, not a platform guarantee. #314 must distinguish:

- no policy configured (`endpoint-reachable`);
- policy present but queued/running;
- policy approved/rejected;
- policy blocked by missing status/reviewer/work-item data.

No pipeline build was associated with either the source branch or PR merge ref during the point-in-time observation. The Build API returned its envelope, but the populated build shape remains `not-observed`; zero rows could reflect configuration, filtering, timing, or the production principal's authorization.

PR status API read/write is separately `verified`. A configured PR Status policy does not mean an arbitrary status context/genre satisfies it, and neither should be confused with pipeline build status.

## Failure Contract

| Scenario | HTTP result | Body/result contract | Classification |
|----------|-------------|----------------------|----------------|
| Missing repository | 404 | JSON `GitRepositoryNotFoundException` | `verified` |
| Authorization-masked repository | expected 404 | No reliable client-visible discriminator | `inferred` |
| Unsupported `api-version=0.0` on a resolved repository ID | 404 | HTML, not JSON | `verified` |
| Invalid inline `firstComparingIteration=0` | 400 | `ArgumentOutOfRangeException` | `verified` |
| Invalid vote `999` | 400 | `InvalidEnumArgumentException` | `verified` |
| Stale ref create | 200 | Per-item `success=false`, `staleOldObjectId` | `verified` |
| Delete status after PR abandonment | 403 | `GitPullRequestStatusNotEditableException` | `verified` |
| Genuine controlled permission denial | not observed | Single identity could not produce a controlled contrast | `not-observed` |
| 409/412 conditional conflict | not observed | No safe endpoint-specific fixture | `not-observed` |
| 429 throttling | not observed | Deliberate load testing was prohibited | `not-observed` |
| Expired token/non-JSON sign-in response | not observed | Token was refreshed before expiry | `not-observed` |

The initial broad probe contained an invalid PowerShell interpolation for the unsupported-version URL and accidentally requested a repository named `-version=0.0`, producing the same JSON not-found shape as FAIL-1. That row was invalidated. FAIL-2 records the corrected request against the already resolved repository ID.

For 404 handling:

1. First verify the canonical organization/project/repository handle through a successful read.
2. Treat repository-level 404 as ambiguous unless an independently authorized lookup proves absence.
3. Accept a child resource as absent only when its exact ID/ref came from a trusted ledger or prior successful response.
4. Never create or mutate a replacement resource solely because a 404 was returned.

Clients must inspect:

1. HTTP status;
2. `Content-Type`;
3. JSON `typeKey`/`typeName` when present;
4. per-item result fields such as `success` and `updateStatus`;
5. the resulting server state.

## Cleanup Contract and Test Record

Disposable branches and the coordination tag were deleted. Vote cleanup is defined by the final server read, not by the reset request alone. Custom marker comments were deleted. The three PR records remain abandoned because Azure DevOps PRs are auditable records rather than deletable disposable objects.

| Fixture | Purpose | Final state |
|---------|---------|-------------|
| A | Initial thread API and invalid iteration-context diagnosis | abandoned; branch deleted; marker comments deleted; vote read back as `0` |
| B | Primary three-iteration thread/status probe | abandoned; branch deleted; marker comments and PR status deleted; vote read back as `0` |
| C | Non-draft reviewer vote probe | abandoned; branch deleted; vote read back as `0` |

Final verification found:

- no `paw-capability-probe/*` branches;
- no `paw-capability-probe-lease` tag;
- no live custom marker comments;
- no remaining probe status;
- all three PRs abandoned;
- all author votes reset to `0`.

Two earlier pre-PR attempts created and deleted only the coordination tag before failing closed. They created no source branch or pull request.

The primary fixture's redundant reset attempt after abandonment failed, but the server already read `0`. The dedicated non-draft fixture confirmed a successful reset request followed by a `0` read-back. #316 must use the read-back as the cleanup oracle.

Abandoned PR records and soft-deleted comments remain subject to Azure DevOps retention. Replays must use fixed non-sensitive markers and a recognizable title prefix so administrators can identify historical fixtures without exposing code or credentials.

Deleting initial and reply comments from abandoned fixture PRs returned HTTP 200 and removed all live custom markers. This verifies abandoned-state comment cleanup, but the standard replay should still remove comments before abandonment when possible.

Cleanup order matters:

1. Reset vote.
2. Delete PR statuses while the PR is active.
3. Delete comments that should not remain.
4. Abandon the PR.
5. Delete source refs.
6. Verify absence/state through independent list and object reads.

Recovery case: if a PR status remains after abandonment, restore the disposable source ref, reactivate the PR, delete the status, re-abandon the PR, and delete the ref again. This recovery path was verified.

## Replay Checklist

Use this checklist for re-verification. It is intentionally credential-free and is not a production integration script.

1. **AUTH-1:** Confirm the Azure CLI session, expected tenant/identity, token audience, remaining lifetime, and no-log capture behavior.
2. **REPO-1:** Resolve the canonical organization/project/repository ID once. Reconstruct and compare the approved target before every write; fail closed on mismatch.
3. **REF-1/REF-2:** Acquire `refs/tags/paw-capability-probe-lease` with `oldObjectId = 000...000`; stop if it already exists.
4. **PR-1:** Create `refs/heads/paw-capability-probe/{run-id}` and a non-draft PR with fixed non-sensitive markers.
5. **DIFF-1:** Add `paw-capability-probe-move.txt`, `paw-capability-probe-rename-old.txt`, `paw-capability-probe-delete.txt`, and `paw-capability-probe-edit.txt`.
6. **DIFF-1/THREAD-4:** Push at least three iterations covering edit, line move, rename, and delete. Record iteration IDs and each path's `changeTrackingId`.
7. **THREAD-1/THREAD-2:** Create fixed-marker summary and inline threads; exercise reply, update, delete, and `active -> fixed -> active`.
8. **THREAD-4:** Re-list threads with explicit `$iteration=3` and `$baseIteration=1`; assert the expected left/right positions.
9. **THREAD-1:** Repeat one create request and assert two distinct matching server threads.
10. **THREAD-3:** Attempt one stale positional write using the recorded iteration/context and classify rejection vs silent acceptance.
11. **VOTE-1/VOTE-2:** Exercise documented values on non-draft and draft PRs; read after every write; reset and confirm `0`.
12. **STATUS-1/STATUS-2:** Post/read/delete a PR status before abandonment. If resuming after abandonment, use the verified reactivate/delete/re-abandon recovery.
13. **POLICY-1/BUILD-1:** Read policy and Build API data once; record the actual query time; label empty envelopes as reachable, not verified.
14. Reset the vote and delete PR statuses and all comments that should not remain while the PR is active.
15. Abandon the PR, delete source refs and the coordination tag, and verify no live marker content or probe status remains.
16. **TERMINAL-1 (optional dedicated fixture):** After abandonment, post one fixed non-sensitive marker, delete that comment using the verified abandoned-state delete path, and re-read zero live markers. If deletion fails, record an explicit cleanup failure and accept only the retained non-sensitive marker.
17. Scan durable output for bearer/JWT/token patterns, concrete identities, and replacement characters before commit.

If the coordination tag already exists, stop. Reclaim it only after an operator confirms no replay is active and independent reads show no remaining probe branches, PR statuses, or live marker comments. Then delete the stale tag and restart from the beginning; never expire or steal the lease automatically.

## Integration Boundaries

### Issue #314: PR read and CI context

Implement:

- authentication preflight under the actual #314 runtime principal before expensive evaluation; the interactive Azure CLI acquisition path is not sufficient proof for a service principal or managed identity;
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
- PR status posting/cleanup ownership (read belongs to #314; mutation and cleanup belong to #315);
- status cleanup before abandonment, including the verified recovery branch for interrupted runs;
- a final status/head/iteration re-check immediately before each write to handle a PR abandoned or updated between preflight and mutation.

Treat full transport-loss idempotency as a design requirement, not a verified platform guarantee.

### Issue #316: optional reviewer vote

Implement:

- independent explicit authorization for vote mutation;
- non-draft preflight;
- caller/reviewer identity verification and self-add/read-back behavior;
- documented vote enum validation;
- read-after-write verification;
- reset/recovery behavior;
- independent comment and vote failure handling.

Keep branch-policy gating, distinct-reviewer behavior, and least-privilege vote permissions as explicit gaps until a second principal and controlled policy fixture are available.

## Re-verification

Row-specific validity governs capability observations and configuration-sensitive behavior. The class-level windows below are fallback guidance for endpoint shapes; when multiple triggers apply, use the earliest one.

| Evidence class | Suggested validity |
|----------------|--------------------|
| GA endpoint shape | 180 days or Azure DevOps REST version change |
| Preview endpoint shape | 30 days |
| Repository policy/build behavior | Re-run after configuration changes |
| Identity/permission behavior | Re-run for every production principal class |
| Thread anchoring behavior | Re-run before #315 and after iteration API changes |
| Vote behavior | Re-run before #316 or after draft/policy changes |
| Token audience/acquisition | Re-run if Azure DevOps deprecates the well-known resource ID or changes `.default` scope guidance |

## Sources

- [Azure CLI access tokens](https://learn.microsoft.com/cli/azure/account#az-account-get-access-token)
- [Azure DevOps authentication with Microsoft Entra tokens](https://learn.microsoft.com/azure/devops/integrate/get-started/authentication/entra-oauth)
- [Update Git refs](https://learn.microsoft.com/rest/api/azure/devops/git/refs/update-refs?view=azure-devops-rest-7.1)
- [Create pull request thread](https://learn.microsoft.com/rest/api/azure/devops/git/pull-request-threads/create?view=azure-devops-rest-7.1)
- [List pull request threads](https://learn.microsoft.com/rest/api/azure/devops/git/pull-request-threads/list?view=azure-devops-rest-7.1)
- [Delete pull request comment](https://learn.microsoft.com/rest/api/azure/devops/git/pull-request-thread-comments/delete?view=azure-devops-rest-7.1)
- [Create reviewer or cast vote](https://learn.microsoft.com/rest/api/azure/devops/git/pull-request-reviewers/create-pull-request-reviewer?view=azure-devops-rest-7.1)
- [Create pull request status](https://learn.microsoft.com/rest/api/azure/devops/git/pull-request-statuses/create?view=azure-devops-rest-7.1)
- [Delete pull request status](https://learn.microsoft.com/rest/api/azure/devops/git/pull-request-statuses/delete?view=azure-devops-rest-7.1)
- [Get pull request iteration changes](https://learn.microsoft.com/rest/api/azure/devops/git/pull-request-iteration-changes/get?view=azure-devops-rest-7.1)
- [List policy evaluations](https://learn.microsoft.com/rest/api/azure/devops/policy/evaluations/list?view=azure-devops-rest-7.1)
- [List builds](https://learn.microsoft.com/rest/api/azure/devops/build/builds/list?view=azure-devops-rest-7.1)
- [Evaluate permissions](https://learn.microsoft.com/rest/api/azure/devops/security/permissions/has-permissions?view=azure-devops-rest-7.1)
- [Security namespace reference](https://learn.microsoft.com/azure/devops/organizations/security/namespace-reference)
