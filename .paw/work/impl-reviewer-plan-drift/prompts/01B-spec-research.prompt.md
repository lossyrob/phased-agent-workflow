---
agent: 'PAW-01B Spec Researcher'
---
# Spec Research Prompt: Impl Reviewer Plan Drift
Perform research to answer the following questions.

Target Branch: auto
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/147
Additional Inputs: none

## Agent Notes
- Scope is intentionally minimal: this is primarily a PAW-03B agent-behavior update.
- Key behavior requested: during review, compare implementation vs approved plan (and spec when present), detect drift, use commit history to infer intent, then either (a) update plan for minor/clear drift or (b) ask user before changing artifacts for significant/ambiguous drift.
- Open decision in the issue (“what update the plan means”) should be informed by existing PAW conventions; prefer the simplest approach consistent with existing artifacts and review strategy.

## Questions
1. Where does PAW currently store the Implementation Plan artifact for a work item (filenames and location patterns), and how does the plan get created/updated today?
2. Where does PAW currently store the Spec artifact (if any), and how is it referenced across stages?
3. What does the current PAW-03B Impl Reviewer agent do today regarding validating implementation against plan/spec (if anything)?
4. What is the existing expected structure/format of PAW-03B review output (e.g., sections, required checklists), and where would a “Plan alignment” section fit without breaking conventions?
5. Are there existing conventions for updating artifacts during review (e.g., editing Plan.md vs adding a deviations/clarifications section)? If so, what patterns are used elsewhere in PAW?
6. Are there existing conventions for referencing commit intent in artifacts or reviews (e.g., including commit SHAs, commit message excerpts, timestamps)?
7. How do other agents in PAW decide whether to ask the user vs proceed automatically when there’s ambiguity? Identify any comparable “stop and ask” patterns.
8. What facilities exist in the codebase/tools to inspect git history and associate changes with commits (high level capabilities only; focus on what data is available)?
9. In local review strategy (no PRs), what artifacts or context are typically available to PAW-03B for “commit-aware” checks?
10. Are there any existing tests or fixtures related to PAW-03B behavior that would be impacted by adding plan/spec drift detection?

### Optional External / Context
1. None
