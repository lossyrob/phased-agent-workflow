# Plan: Azure DevOps Review Context

## Approach Summary

Extend the existing PAW Review Understanding stage rather than introducing a second artifact owner. Azure DevOps reviews will load a dedicated read-context reference that defines target validation, Microsoft Entra token handling, REST acquisition, state preservation, redaction, and failure classification. The Understanding skill will map the acquired data into the same `ReviewContext.md` consumed by downstream review stages.

## Work Items

- [ ] **Define the Azure DevOps read contract**
  - Add an Understanding-skill reference for canonical target parsing, current-principal authentication, endpoint coverage, pagination, explicit evidence states, content-type-aware errors, and sensitive-data handling.
  - Keep posting and voting explicitly out of scope.
- [ ] **Wire acquisition into PAW Review**
  - Update the PAW Review agent, workflow skill, and Understanding skill so Azure DevOps target/read preflight runs before expensive analysis.
  - Record source/target/common commits, current net diff, iterations and changes, iteration-relative threads, anonymized reviewer/discussion state, PR statuses, policies, and builds in platform-neutral `ReviewContext.md` sections.
  - Fail closed on target mismatch and distinguish empty, endpoint-reachable, not-observed, unsupported, denied, and ambiguous results.
- [ ] **Align specifications and user-facing references**
  - Update the canonical review specification and mirrored documentation to describe production Azure DevOps read support while retaining artifact-only output.
  - Document the expanded ReviewContext contract and approved validation boundary.
- [ ] **Add regression coverage and validate**
  - Add fast integration tests for endpoint coverage, authentication/redaction invariants, state semantics, failure handling, ReviewContext mapping, and the no-post/no-vote boundary.
  - Run targeted integration tests, prompt lint with before/after token counts, repository lint/build checks, and strict documentation validation.
  - Re-run read-only live validation against `devtools-test-repo` without persisting credentials or concrete identity data.

## Key Decisions

- Keep `paw-review-understanding` as the sole owner of `ReviewContext.md`; store the detailed Azure DevOps mechanics in `skills/paw-review-understanding/references/azure-devops-read-context.md`.
- Separate output-capability preflight from Azure DevOps read-capability preflight. Artifact-only output does not imply hosted read context is unavailable.
- Use Azure DevOps REST 7.1 for stable endpoints and 7.1-preview.1 only for policy evaluations.
- Treat the net diff common commit as the review baseline, while recording target and source commit tips separately.
- Preserve state provenance instead of collapsing empty collections into success or failure.
- Redact runtime-principal and opaque platform identity data; retain only review-relevant, platform-neutral role and state information.
- Validate only against `https://dev.azure.com/msdata/Database%20Systems/_git/devtools-test-repo`; use read-only probes unless a future issue explicitly owns mutation fixtures.

## Open Questions

None.
