# PAW Review Specification

The PAW Review specification is maintained in [docs/specification/review.md](docs/specification/review.md) (published as [Review Workflow](https://lossyrob.github.io/phased-agent-workflow/specification/review/)). How PAW Review uses the v2 host model, todo graph, return contract and review provider block is in [PAW v2 Design: PAW Review alignment](docs/specification/v2/design.md#paw-review-alignment). The skills are `skills/paw-review-workflow/` and `skills/paw-review-*`.

Earlier text of this file is in its git history. The authorization policy below is unchanged and remains the reference inventory.

## Authorization Policy Inventory

This inventory is the source of truth for PAW Review instruction precedence. The audit scope includes `PAW-Review.agent.md`, every `paw-review-*` skill, review prompts, review control-state contracts, specifications, tests, and generated VS Code skill assets.

| Classification | Policies |
|----------------|----------|
| **True invariants** | Evidence is not fabricated; only finalized comments are posted; internal rationale and skipped comments stay local; executable submission verifies the exact platform target, live head, pending review ID, and event; failed verification preserves the pending review without mutation |
| **Defaults** | GitHub creates a pending review; Azure DevOps and local contexts produce artifacts/manual instructions when executable capability is unavailable |
| **User-configurable** | An explicit request can submit a GitHub review with `APPROVE`, `REQUEST_CHANGES`, or `COMMENT`; users can select review mode/specialists, narrow feedback scope, override critique recommendations before posting, and request tone changes |

Explicit user direction overrides a PAW-owned default. It does not override a true invariant or create an unavailable platform capability.

PAW Review resolves platform, output capability, requested action, authorization state, target, head, pending-review binding, event, and conflict status in preflight and records them in `ReviewContext.md`. Ambiguous requests and authorized-but-unsupported mutations are reported before analysis. Repeated authorization for the same unsubmitted tuple confirms the action; successful submission is terminal. A head change invalidates authorization and requires fresh analysis and authorization.

Azure DevOps uses this policy and preflight contract, but executable Azure DevOps API behavior is outside this specification.
