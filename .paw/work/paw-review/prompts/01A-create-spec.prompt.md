---
agent: PAW-01A Spec Agent
model: Claude Sonnet 4.5 (copilot)
---

Generate the feature spec for https://github.com/lossyrob/phased-agent-workflow/issues/20. A specification that was meant to match the style of paw-specification.md, which is a broad specification that is kept up to date for the PAW process, is at paw-review-specification.md - this was already committed to the feature branch.

Note that the review-research-notes.md file and the below comments are authoritative over the paw-review-specification.md where there are differences. The Spec.md can deviate from the paw-review-specification.md as needed to incorporate the latest thinking, and aligning paw-review-specification.md to the final spec can be a follow up task to do later.

.paw/work/paw-review/context/review-research-notes.md contains research notes on code review best practices that should inform the spec.

Other notes:
- Part of the review process should be to report on the test coverage (quantitative if available and/or qualitative) of the changes. Gap analysis should have a separate section on test coverage gap. It's up to the human reviewer to decide if the coverage has the right balance of depth and breadth based on project standards, but this decision should be informed by the analysis.
- In the agent acting in the Feedback Generation stage, it should have specific instructions about answering questions that the human reviewer may have, and basing those on the understanding and analysis of the code changes.
- Review comments for specific code changes should have recommendations for how to address the issues found when possible. Ensure recommendations are informed by the context of the codebase; avoid code suggestions that are at risk of being wrong for the codebase.

Thinking about a code research step. In the first stage, it's likely that there's a lot of context to gather about the changes that requires a deeper understanding of the codebase and how it works. This is similar to the Code Research step for the implementation PAW. Similarly, the first stage of the reviewer should produce a code research prompt, that another agent can use to gather the necessary context. This review code researcher is basically the same as the implementation code researcher; however the code researcher should be focused on the system before the PR changes. So that agent should actually rewind git history to the commit before the PR changes, and analyze the codebase as it was before the changes. This is important because the reviewer needs to understand how the code worked before the changes to be able to evaluate the changes properly. The CodeResearch.md can then be passed back into the first stage agent to give the best possible understanding. It will also be useful in the analysis step and the feedback generation stage, especially for being able to answer any human reviewer questions based on the pre-change codebase.

For every review comment recommendation, in the markdown file, there should be a "Rationale" section that explains why this recommendation is being made, citing relevant best practices from the research notes when applicable. This will help the human reviewer understand the reasoning behind each suggestion and make informed decisions about whether to accept or modify them.

The review should work in a non-github context. If not using github (e.g. Azure DevOps), then it will be run with the PR branch checked out locally, and a diff between the base branch (e.g. main) and the PR branch should be used to identify changes. If it is GitHub, then the agents should use the GitHub MCP server tools to get all context possible, including PR description, comments, related issues, etc. Also checking PR checks (CI results, etc) is important to avoid redundant comments for issues enforced by CI.

One Issue, One Comment Policy: The agent to not scatter feedback for one logical issue
 across many comments. E.g., if the same mistake is in 3 places, either comment on the first and
 mention others, or comment on all but reference the first (“Same as above in function Y”). Or if an
 issue spans multiple lines (like a block of code), use a single comment on the block (some review
 systems let you comment on a range). This ties into deduplication but specifically ensures coherence– the author sees one comment per unique issue, making resolution tracking easier. How this helps:
 Reduces noise and simplifies the author's task list.

After the review comment phase, there should be another agent that is the review comment reviewer (needs a better name). This agent takes a critical look at the review comments and adds a section after each with an assessment of the usefulness and accuracy of the comment. This agent is guided to think critically and consider avenues of logic that the initial reviewer might have missed. This will help give additional context to the human reviewer when considering whether to include a review comment, not include it, or ask the PAW agents for modifications. When in the GitHub context, the review agent sections won't go on the pending review -it will only update the relevant sections in the local markdown file.
 