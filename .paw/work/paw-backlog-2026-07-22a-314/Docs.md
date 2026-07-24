# Azure DevOps Review Context

## Overview

PAW Review can acquire Azure DevOps pull request and CI context before evaluation. The Understanding activity validates the hosted target, authenticates the current runtime principal, captures a stable read snapshot, and maps privacy-filtered data into the platform-neutral `ReviewContext.md` used by later review stages.

Azure DevOps output remains artifact-only. This work does not add comment posting, status mutation, or reviewer voting.

## Architecture and Design

### High-Level Architecture

The PAW Review agent continues to resolve output authorization. For an Azure DevOps target, `paw-review-understanding` separately loads its Azure DevOps read-context reference and owns hosted read preflight, acquisition, redaction, and `ReviewContext.md` creation.

The read path uses the current Azure CLI principal and Azure DevOps REST:

1. Validate the HTTPS URL shape and host before authentication.
2. Resolve and verify the repository and PR target.
3. Acquire metadata, commits, net diff, iterations, iteration changes, threads, reviewer vote states, PR statuses, policies, and builds with GET-only requests.
4. Revalidate source/target commits and iteration state so the artifact describes one stable snapshot.
5. Map only approved fields into `ReviewContext.md`.

### Design Decisions

- Detailed endpoint and failure mechanics live in an on-demand reference so the Understanding skill stays within its prompt budget.
- Output capability and read capability are independent. Successful Azure DevOps reads never enable posting or voting.
- Empty status, policy, or build collections are recorded as reachable with unproven visibility; they do not prove no configuration or CI exists.
- Runtime states are distinct from the dated capability report's evidence provenance.
- Thread bodies and participant identities are not persisted. Downstream reviewers receive structured state, position, and count data.
- The common commit is the review baseline. Source and target tips remain separate fields.

### Integration Points

- `PAW-Review.agent.md` routes Azure DevOps targets to hosted read preflight.
- `paw-review-workflow` separates output authorization from Azure DevOps read acquisition.
- `paw-review-understanding` loads the reference and writes the expanded `ReviewContext.md`.
- Existing baseline, evaluation, and feedback stages continue to consume `ReviewContext.md`.

## User Guide

### Prerequisites

- An Azure DevOps Services pull request URL.
- Azure CLI installed with an existing login that can read the target repository and required PR context.
- A local checkout containing the commits needed for baseline research after context acquisition.

### Basic Usage

Run PAW Review with a canonical Azure DevOps pull request URL:

```text
https://dev.azure.com/{organization}/{project}/_git/{repository}/pullrequest/{id}
```

PAW Review performs hosted read preflight before baseline research. When access is available, `ReviewContext.md` includes the pinned commits, current changes, iterations, discussion positions, reviewer state, statuses, policies, builds, and per-surface evidence.

When access, target identity, response content type, pagination completeness, or snapshot stability cannot be established, PAW Review blocks before evaluation with an actionable classification.

## API Reference

### Key Components

- `skills/paw-review-understanding/references/azure-devops-read-context.md`: authoritative authentication, endpoint, state, privacy, and mapping contract.
- `ReviewContext.md` hosted sections: read preflight, snapshot, surface summary, current changes, iteration context, discussion context, reviewer state, PR statuses, policy state, and build state.

### Configuration Options

Azure DevOps uses the existing PAW Review output configuration. Output remains `artifact-only`; review mode and specialist settings continue to work unchanged.

## Testing

### How to Test

- Run the fast Azure DevOps contract and authorization tests under `tests/integration/tests/skills/`.
- Run the synthetic success and ambiguous-404 workflow tests under `tests/integration/tests/workflows/azure-devops-read-context.test.ts`.
- Perform the read-only acceptance probe only against `devtools-test-repo`.

### Edge Cases

- Authorization-masked repository 404 responses remain ambiguous and block.
- Empty policy/build/status envelopes preserve unproven visibility.
- Non-JSON responses, including 2xx HTML sign-in pages, block before parsing.
- Multiple merge bases, changed heads, retargeting, incomplete pagination, and repeated snapshot drift block.
- Pull requests without iteration support retain the net diff while marking iteration context unsupported.

## Limitations and Future Work

- The verified authentication path uses the current Azure CLI principal. Minimum permissions and non-interactive credential classes remain unverified.
- Policy evaluations depend on a preview API and surface version drift explicitly.
- Populated build behavior is covered synthetically because the approved live repository currently returns empty build collections.
- Azure DevOps posting and reviewer voting remain deferred to separate work.
