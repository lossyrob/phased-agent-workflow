# Plan: Azure DevOps PR Capabilities

## Approach Summary

Use the existing Azure CLI sign-in to obtain an in-memory Azure DevOps Entra token, then exercise Azure DevOps REST APIs directly against `msdata/Database Systems/devtools-test-repo`. Create one disposable branch and pull request for mutation tests, capture sanitized request/response evidence, clean up all disposable state, and publish a platform-neutral capability contract for issues #314-#316. Do not add production Azure DevOps integration code.

## Work Items

- [ ] **Verify authentication and effective identity**
  - Confirm a Copilot CLI process can obtain an Azure DevOps resource token non-interactively from the existing Azure CLI session without persisting or printing it.
  - Resolve the authenticated Azure DevOps identity and record token, tenant, identity, and expiration constraints without committing personal identifiers or secrets.

- [ ] **Inventory repository, permission, and API behavior**
  - Read the target project and repository, determine effective Git permissions, and identify supported API versions.
  - Exercise representative invalid, stale, unsupported, and permission-sensitive requests to distinguish authorization failures from validation and conflict failures.

- [ ] **Exercise pull request read capabilities**
  - Create a disposable source branch and pull request in `devtools-test-repo`.
  - Verify PR metadata, source/target commits, changed files, diffs, commits, iterations, threads, reviewer data, statuses, policy evaluations, and build associations.

- [ ] **Exercise pull request mutation capabilities**
  - Test summary threads, iteration-aware inline threads, replies, comment/thread updates, resolution, and safe retry/idempotency implications.
  - Test reviewer vote mutation for the authenticated reviewer and representative identity/permission failure behavior without mutating repositories outside the approved target.

- [ ] **Publish the capability contract and follow-up guidance**
  - Add a durable reference document that separates verified behavior from inference, maps required permissions and failure behavior, records disposable state and cleanup, and gives concrete integration boundaries for #314, #315, and #316.
  - Update directly related documentation navigation and authorization language where the new contract replaces the current artifact-only assumption.

- [ ] **Clean up and validate**
  - Abandon or close the disposable pull request as appropriate and delete disposable branches.
  - Confirm no token, reusable credential, personal identifier, or unredacted sensitive response is present in repository changes.
  - Run the repository's existing documentation, lint, and targeted tests required by the changed surfaces.

## Key Decisions

- Use Azure DevOps REST APIs as the capability baseline because production implementation issues need exact endpoint, API-version, HTTP-status, and concurrency behavior independent of transient MCP tool catalogs.
- Keep access tokens only in process memory and acquire them with `az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798`.
- Use only `https://dev.azure.com/msdata/Database%20Systems/_git/devtools-test-repo` for mutations.
- Treat missing observable permission-denied cases as an explicit evidence gap; do not claim a denial path was verified when only documentation or permission metadata supports it.
- Prefer a documentation-only deliverable unless repeated testing demonstrates that a small reusable probe materially improves reproducibility without becoming production integration.

## Open Questions

None.
