# Azure DevOps PR Capabilities

## Overview

Issue #313 established an empirical Azure DevOps pull request capability contract for future PAW Review implementation work. The spike verified authentication, repository and PR reads, iterations and diffs, thread/comment mutations, reviewer votes, PR statuses, policy queries, failure shapes, and cleanup behavior against the approved test repository.

The durable result is `docs/reference/azure-devops-pr-capabilities.md`. Production Azure DevOps integration remains out of scope for this change.

## Architecture and Design

### High-Level Architecture

The probe used an existing Azure CLI session to acquire an Azure DevOps Microsoft Entra token in process memory. Every mutation was built from one resolved organization/project/repository handle and confined to `devtools-test-repo`. A coordination ref prevented concurrent mutation runs, while a local ledger recorded disposable branches, PRs, threads, comments, statuses, and cleanup state.

### Design Decisions

- Use REST APIs as the stable capability baseline for #314-#316.
- Keep mutation-capable probe code outside the repository and delete it after the run.
- Commit a credential-free replay checklist rather than a reusable mutation harness.
- Separate verified behavior from reachable, inferred, not-observed, and unsupported behavior.
- Preserve Azure DevOps PR records as abandoned audit records while deleting refs and custom marker content.

### Integration Points

- #314 consumes the read, iteration, status, policy, build, and error contract.
- #315 consumes the thread/comment, anchoring, retry, state, and cleanup contract.
- #316 consumes the non-draft vote, enum validation, read-after-write, and authorization boundaries.

## User Guide

### Prerequisites

- Existing Azure CLI sign-in for the intended Azure DevOps identity.
- Access to the approved test repository.
- No PAT or reusable credential in the environment.

### Basic Usage

Follow the replay checklist in the reference document. Use fixed non-sensitive markers, verify the target before every mutation, and classify every result by evidence state.

### Advanced Usage

Re-run preview, policy, permission, anchoring, and vote rows when the Azure DevOps version, repository configuration, or production principal class changes.

## API Reference

### Key Components

The reference document catalogs the Azure DevOps 7.1 Git, Policy, Build, Security, and connection-data endpoints required by subsequent issues.

### Configuration Options

There is no production configuration in this change. The test organization, project, and repository were fixed by the issue boundary.

## Testing

### How to Test

Use the credential-free replay checklist and compare results to the evidence-state definitions. Never treat HTTP success or a non-empty response as sufficient without content controls tied to the fixture.

### Edge Cases

- Draft vote calls can return HTTP 200 without persisting the requested vote.
- Stale inline comment requests can be accepted without a rejection signal.
- Thread positions depend on the iteration pair requested during reads.
- Ref conflicts can return HTTP 200 with per-item failure.
- Status deletion fails after PR abandonment.
- Abandoned PRs can still accept new threads.
- 404 can mask either absence or authorization.

## Limitations and Future Work

- Minimum permission boundaries require a second, lower-privilege principal.
- Build association behavior was not observed.
- 429, 409/412, expired-token, and true transport-loss behavior were not induced.
- #314-#316 must implement the production read, posting, and vote pipelines.
