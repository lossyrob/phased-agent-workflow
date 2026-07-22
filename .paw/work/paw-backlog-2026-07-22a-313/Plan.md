# Plan: Azure DevOps PR Capabilities

## Approach Summary

Use the existing Azure CLI sign-in to obtain an in-memory Azure DevOps Entra token, then exercise Azure DevOps REST APIs directly against `msdata/Database Systems/devtools-test-repo`. Create disposable objects named with a stable family prefix plus a per-run unique suffix and one pull request with multiple iterations for mutation tests, capture only allow-listed request/response facts, clean up all disposable state, and publish a REST capability contract with explicit single-organization constraints for issues #314-#316. Do not add production Azure DevOps integration code.

## Work Items

- [x] **Verify authentication and effective identity**
  - Preflight `az account show` and fail closed when the existing session is missing, expired, or in the wrong tenant; record whether interactive login was a prerequisite.
  - Capture the Azure DevOps resource token directly into a process variable with output suppressed from the console, never pass it in process arguments, and never write it or raw headers to disk.
  - Compare the runtime tenant and identity to expected operator-provided values without committing those values; an audience-only or non-anonymous check is insufficient for attribution.
  - Prove positive authentication with JSON `Content-Type`, a non-anonymous `connectionData` identity, and token audience/tenant/identity checks before any API probe counts.
  - Require sufficient remaining token lifetime at the start of each probe phase, reacquire when needed, and cross-check every 401 against token expiry before classifying it as authorization behavior.
  - Record only identity class/role, token lifetime behavior, tooling version, and observation time; redact concrete tenant IDs, object IDs, descriptors, UPNs, and email addresses.

- [x] **Inventory repository, permission, and API behavior**
  - Resolve `devtools-test-repo` once and guard every mutating call with exact organization, project, repository ID, and pull request checks.
  - Read effective Git permissions and map each capability to the observed grant, principal type/role, and whether the current identity is over-privileged. Mark minimum-permission recommendations as inferred unless a lower-privilege identity proves the boundary.
  - Record the exact requested `api-version` per endpoint and whether it is GA or preview. For preview rows, require an observed served version or response-shape fingerprint and a re-verification warning.
  - Exercise an enumerated failure taxonomy: 400, 403, authorization-masked 404, 409, 412, 429/`Retry-After`, expired-token/non-JSON response, unsupported API version, and stale head/iteration.
  - Use A/B controls where the available identity can genuinely vary the invalid, stale, unsupported, or permission dimension; otherwise label the discriminator and minimum-permission result inferred.
  - Capture status, response content type, and discriminating fields such as `typeKey`, `typeName`, `WWW-Authenticate`, and retry headers. Record authorization-masked 404 as irreducibly ambiguous when no client-visible discriminator exists.
  - Honor any incidental 429 and `Retry-After` with bounded backoff. Do not intentionally load-test the shared service; record throttling behavior as inferred/not-observed unless a safe bounded event occurs.
  - Attempt one safe, non-mutating denial observation. If no genuine denied operation is available to this identity, label authorization-denied behavior as inferred rather than verified.

- [x] **Exercise pull request read capabilities**
  - Before testing, sweep stale prior-run orphans matching a stable family prefix, but reclaim only objects older than a stated age and never objects with a live-run marker. Record swept object IDs.
  - Create a disposable source branch and pull request named `<stable-family-prefix>-<per-run-unique-suffix>`, with an object ledger sufficient for resumable cleanup.
  - Generate at least three iterations containing add, edit, rename, delete, and line-move changes.
  - Verify PR metadata, source/target commits, changed files and change types, diffs, commits, iterations, threads, reviewer data, statuses, policy evaluations, and build associations.
  - For every capability, assert an expected status plus exact content controls tied to the injected test data, such as expected paths, change types, commits, and thread markers; a status-only or merely non-empty response never counts as verified.
  - Add paired negative controls, such as identical-iteration diffs and a fresh PR with no threads, to prove populated responses are not defaults.
  - Treat immediate-empty policy, build, or status collections as `endpoint-reachable` with no configuration observed. Treat a poll timeout separately as `not-observed (timing)` and record the actual wait, using a conservative minimum window that is explicitly not a production timeout.
  - Distinguish build/status reads from PR-status writes; verify a write only if the test repository safely supports it, otherwise record it as an explicit gap.

- [x] **Exercise pull request mutation capabilities**
  - Post only fixed, non-sensitive test markers in summary and inline threads. Test replies, comment/thread updates, resolution, and terminal-state reads/writes.
  - Anchor inline threads in iteration 1 on a moved line, a file that will be renamed, and a file that will be deleted. Push later iterations, then record whether each thread tracks, detaches, becomes outdated, mis-anchors, or errors at deeper iteration depth.
  - Attempt one stale positional write and classify it as `rejected(status/typeKey)` or `silently-misplaced(no-signal)`. Require re-fetching the latest head and iteration before every production positional write regardless of the observed result.
  - For thread create, reply, update, resolution, vote, branch, and PR operations, repeat the request and record whether behavior is idempotent, duplicate-producing, conflict-rejecting, or ambiguous.
  - Attempt lost-response and composite partial-failure probes only when the failure can be genuinely induced by discarding a response or interrupting a multi-call sequence. Otherwise record the row `not-observed` or `inferred`; a back-to-back successful resend never proves lost-response behavior.
  - For every duplicate-producing or non-idempotent operation, prescribe the production mitigation: client marker/dedupe, read-before-write, checkpointing, bounded retry, or no blind retry.
  - Enumerate Azure DevOps reviewer vote values, labels, caller-own-vote constraint, and observed branch-policy/completion gating effect. Exercise blocking and approval-family values, reset to zero, and one out-of-domain value. Do not generalize this result to a distinct production identity.
  - Run terminal-state probes only after all active-state probes: abandon the PR, then attempt the defined read/write checks before teardown.

- [x] **Publish the capability contract and follow-up guidance**
  - Read #314, #315, and #316 before drafting the mapping, then add a durable reference document with one row per capability: setup/preconditions, method/path, requested and served API version, maturity, expected status, asserted response content, observed result, evidence class per field, observed-on date, tooling version, identity class/role, observed and inferred permissions, config dependence, failure behavior, retry behavior, required production mitigation, validity window, re-verification trigger, and trigger owner.
  - Separate `verified`, `endpoint-reachable`, `inferred`, `not-observed`, and `unsupported` states so empty/default responses cannot look successful.
  - Include a credential-free replay checklist keyed one-to-one to matrix rows and capable of recreating every setup/precondition; do not commit a token-bearing harness.
  - Map the verified capabilities and explicit gaps separately to the acceptance criteria and implementation boundaries of #314, #315, and #316.
  - Require #314-#316 intake to replay any row past its validity window or whose API version, identity class, repository policy, or organization configuration changed.
  - Document token refresh and checkpoint/resume guidance for long-running production mutation batches.
  - Update directly related documentation navigation and authorization language where the new contract replaces the current artifact-only assumption.

- [x] **Clean up and validate**
  - Reset the reviewer vote, remove test-only comments/threads where the API permits it, abandon the disposable pull request, and delete disposable branches.
  - Re-read each object through independent list and object endpoints with a bounded consistency window. Classify cleanup as `confirmed-absent-after-window`, `pending-within-window`, or `still-present-after-window`; record residual object IDs rather than claiming success.
  - Re-read the abandoned PR's surviving threads, comments, and reviewer state to prove fixed marker content contains no sensitive data and record any non-deletable collaboration-surface residue.
  - Confirm the token acquisition produces no tool-boundary stdout/stderr. Run a named pattern/entropy scan with a non-live positive-control marker across artifacts, repository changes, branch history, and available session/tool logs, then remove the marker and require zero live-secret matches. Treat Azure CLI's managed token cache as pre-existing authentication state that must never be copied into evidence, not as an artifact expected to scan empty.
  - Confirm no token, reusable credential, concrete identity/tenant identifier, authorization header, raw sensitive response, replacement character, or secret-like high-entropy value is present in committed or posted content.
  - Run the repository's existing documentation, lint, and targeted tests required by the changed surfaces.

## Verification Contract

Each probe must produce a sanitized evidence row with:

1. Capability and issue consumer (`#314`, `#315`, or `#316`)
2. Reproducible setup/preconditions and injected positive/negative controls
3. HTTP method and path template
4. Requested API version, served-version/shape fingerprint, and GA/preview status
5. Expected status plus asserted response content
6. Observed status, content type, discriminating fields, and observation time
7. Evidence state per capability and derived field: `verified`, `endpoint-reachable`, `inferred`, `not-observed`, or `unsupported`
8. Identity class/role plus observed grant and inferred minimum permission, without concrete personal identifiers
9. Configuration dependence, validity window, re-verification trigger, and trigger owner
10. Retry/idempotency, required production mitigation, and stale-target detectability
11. Token-lifetime and checkpoint/resume implications
12. Cleanup object ledger entry and verified cleanup state when the probe mutates state

## Key Decisions

- Use Azure DevOps REST APIs as the capability baseline because production implementation issues need exact endpoint, API-version, HTTP-status, and concurrency behavior independent of transient MCP tool catalogs.
- Keep access tokens only in process memory and acquire them with `az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798`.
- Use only `https://dev.azure.com/msdata/Database%20Systems/_git/devtools-test-repo` for mutations.
- Treat missing observable permission-denied cases as an explicit evidence gap; do not claim a denial path was verified when only documentation or permission metadata supports it.
- Retain Entra authentication instead of introducing a reusable PAT; enforce the repository boundary with an application-layer target guard and document the difference between ambient developer permission and minimum production permission.
- Assemble every mutation URL only from the single validated organization/project/repository/PR handle; never re-type target segments after validation.
- Publish a credential-free replay checklist rather than a committed token-bearing harness.
- Empirically verify multi-iteration, content-control, retry, and cleanup behavior; label second-identity, unavailable policy/pipeline, deliberate throttling, and uninducible fault-injection behavior as explicit gaps.
- Record non-sensitive provenance while replacing concrete identity and tenant values with placeholders.
- Label the Azure DevOps resource ID as a documented well-known audience and record the scope-based `.default` acquisition path as a forward-compatible alternative and re-verification trigger.
- Treat all findings as observed in `msdata/Database Systems`; organization policies and production principal behavior may differ.

## Open Questions

None. Planning review decisions were resolved in `## Key Decisions`; environment-dependent observations that cannot be produced safely become explicit evidence gaps rather than unanswered design questions.
