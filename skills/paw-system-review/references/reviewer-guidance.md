# Reviewer guidance

## Shared review rules

- Review the assigned pinned target in `planning` or `implementation` mode. Work independently from the evidence map; verify relevant source/contracts yourself and follow consequential causal chains beyond mapped context, without a one-hop limit. Your approach is not a domain prohibition.
- Follow the supplied verification permissions and output boundary. No implied permission for source edits, checkout switching, fetches, installation, provider mutations, or unapproved test side effects. Use authorized scratch surfaces for bounded checks or report unavailable verification.
- During your first pass, do not read other reviewers' reports. Exclude prior review findings and comparison-run findings throughout this run. Write only your assigned report; do not delegate or execute the lead workflow.
- Separate owner-stated requirements, documented guarantees, observed behavior, and inference. Establish supported operating conditions and applicable mandatory constraints; do not promote hypothetical future scope or an agent-inferred stricter risk posture into requirements.
- In **planning**, compare proposed behavior against current source, authoritative intent, relevant contracts, and supplied context. Examine design gaps, feasibility, missing/excess work, and unnecessary complexity. Do not claim nonexistent implementation has been verified; missing documents reduce coverage rather than justify invented inputs.
- In **implementation**, examine the actual change and relevant system behavior alongside available planning documentation. Specifications and plans remain open to challenge in both modes: distinguish an agent-inferred mechanism/requirement from an explicit owner-approved obligation. Recommend reconsideration where warranted, but do not grant yourself authority to rewrite owner decisions.
- A clean report is valid; do not invent findings to satisfy a quota. Record evidence gaps, uncompleted work, and inaccessible context separately from verified conclusions.

Make each finding checkable. Include a local identifier, claim, source evidence with revision and file/line or document-section references, reasoning connecting evidence to consequence, reachability and assumptions where applicable, rebuttal or falsification conditions, severity and confidence with reasons, and the minimum complete correction. Separate verified facts from hypotheses and proposed remedies.

Use `MUST-FIX` for substantive defects or material unjustified complexity, `SHOULD-FIX` for meaningful non-blocking improvements, and `CONSIDER` for minor cleanup/advice. These are recommendations, not provider review events. Match confidence to evidence rather than agreement with another reviewer.

For complexity findings, establish material burden, insufficient justification under applicable obligations, and a credible simpler complete approach; a functional failure is not required. Fewer lines alone is not simplicity.

Record your approach, actual target/revisions and inputs examined, completion status, limitations, and model settings/identity only as exposed by the caller or harness (otherwise unknown). Durably write the assigned first-pass report and return only its path and status.

## forward

Reconstruct promised behavior and follow the execution or proposed design to determine how obligations are established and preserved. Trace relevant entry points, consumers, state ownership, lifecycle transitions, failure handling, and exits. Distinguish what each mechanism actually guarantees from what its name or intent suggests.

## counterexample

Search for reachable inputs, states, interleavings, failure sequences, and supported operating conditions that violate obligations. Connect the triggering conditions to a concrete consequence and examine what would rule the case out. Distinguish real supported cases from hypothetical future scope; do not require protection against every conceivable environment.

## relational

Compare behaviors that must agree: caller/callee contracts, old/new versions, primary/fallback paths, equivalent entry points, producer/consumer expectations, and plan/spec/design relationships. Establish why agreement is required, inspect both sides, and identify consequential mismatches rather than treating every difference as a defect.

## simplicity

Independently seek the simplest complete design consistent with actual requirements and the project's accepted risk posture.

- Examine relevant project-wide context, existing controls, and patterns under comparable trust, state, and lifecycle boundaries. Prefer established patterns over bespoke mechanisms when they achieve the required outcome. Existing code is evidence, not automatic proof of owner acceptance in every context.
- Compare actual obligations, incremental protection/capability, and added lifecycle, operational, and maintenance burden against credible simpler alternatives. Examine controls added for an agent-inferred stricter risk posture. Generic "defense in depth", future-proofing, and "safer" are claims to examine, not sufficient justification.
- Reason under applicable requirements and accepted operating assumptions; you need not prove elimination of every conceivable risk. Preserve explicit owner authority and mandatory constraints. Name guarantees a simpler alternative preserves or loses.
- Challenge overcomplicated specifications and plans in BOTH planning and final implementation review. Distinguish simplifying an agent-inferred mechanism from recommending revision of an owner-approved obligation; the latter still requires owner authority.
- Recommend `MUST-FIX` for material unjustified complexity even when functional behavior is correct, supported by material burden, insufficient justification, and a credible simpler complete approach. Keep minor cleanup advisory; fewer lines alone is not the goal.

## Remedy assessment

Only after all four initial reports are durably written and complete, and at least one other reviewer proposes a remedy, examine those remedies using the original target, obligations, and your simplicity analysis. This is one bounded assessment, not another full review, a repeat of your first pass, or forced debate. Preserve all first-pass artifacts.

Write the separate assigned remedy assessment with references to original finding identifiers and evidence. Distinguish:

- **Valid defect, proportionate remedy**: retain the defect and correction.
- **Valid defect, oversized remedy**: retain the defect and propose a smaller complete correction that preserves the required guarantee.
- **Unadopted requirement or stricter posture**: challenge the finding's premise with evidence; distinguish uncertainty about authority from an established absence of obligation.
- **Justified complexity**: explain which required guarantee a simpler alternative loses and why the additional mechanism is proportionate.

Leave unverified premises unresolved; do not force a classification without evidence. Preserve disagreement and explain what evidence or authority would settle it. An excessive fix does not invalidate a real defect, and an unverified security label does not automatically defeat a supported simplification argument. Report completion and limitations.
