---
date: 2025-12-14T14:09:45-05:00
git_commit: 3338234217d6b1a507cfa731e16214e06349403f
branch: feature/147-impl-reviewer-plan-drift-sync
repository: phased-agent-workflow
topic: "Impl Reviewer plan drift: review output format, plan alignment, ImplementationPlan IO, commit context"
tags: [research, codebase, paw-03b, implementation-plan, git]
status: complete
last_updated: 2025-12-14
---

# Research: Impl Reviewer plan drift (codebase)

**Date**: 2025-12-14 14:09:45 EST
**Git Commit**: 3338234217d6b1a507cfa731e16214e06349403f
**Branch**: feature/147-impl-reviewer-plan-drift-sync
**Repository**: phased-agent-workflow

## Research Question
Where does the PAW-03B Impl Reviewer agent prompt define review output format; where/if “Plan alignment” sections already exist; how `ImplementationPlan.md` is read/updated in local strategy; and what existing utilities exist for commit-history context.

## Summary
- The review output format is defined in the agent prompt text for PAW-03B itself, especially around the required “single comprehensive summary comment” format and its required prefix string.
- The phrase “Plan alignment” does not currently appear in any existing agent prompt; the repo uses “alignment” in other contexts (e.g., “alignment with paw-specification.md” in prior work artifacts), but not as a standardized Implementation Reviewer output section.
- In local strategy, `ImplementationPlan.md` handling is primarily “human/agent edits the Markdown file”; the VS Code extension code does not parse or update plan contents (it mainly inventories files and reads `WorkflowContext.md`).
- Commit-history context is primarily accessed via git CLI instructions embedded in agent prompts; the extension code contains minimal git utilities (repo validation + dirty working tree detection) and does not provide a commit-history abstraction.

## Detailed Findings

### 1) Where PAW-03B defines the review output format
The output format requirements for Implementation Review live in the agent prompt at:
- https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md

Key places where “review output format” is specified:

1) **Initial phase review (prs strategy):** requires a PR timeline comment starting with a specific prefix
- The “initial phase review” flow instructs posting a PR timeline comment starting with `**🐾 Implementation Reviewer 🤖:**` after opening the Phase PR.
- Reference: https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md#L221

2) **Review comment follow-up:** requires a single comprehensive summary comment with a two-section structure
- “Post comprehensive summary comment” requires:
  - ONE summary comment (not individual replies)
  - Two sections: (1) detailed comment tracking (including commit hash(es)); (2) overall summary
  - Must start the comment with `**🐾 Implementation Reviewer 🤖:**`
- References:
  - Two-section structure: https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md#L264-L280
  - “Start the comment with …”: https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md#L279
  - Checklist reinforcement: https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md#L329-L339

3) **Plan comparison is an explicit step (but not a dedicated output section):**
- “Read implementation changes” includes “Compare against `ImplementationPlan.md` requirements”.
- Reference: https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md#L162

### 2) Where/if “Plan alignment” sections already exist

**Agent prompt text:**
- No existing agent prompt contains the phrase “Plan alignment”.
  - Evidence: repository-wide search in `agents/**/*.agent.md` for “Plan alignment” returned no matches.

**Related existing “alignment” sections (not plan-vs-implementation alignment):**
- Prior work artifact includes an “Alignment with paw-specification.md” review section:
  - https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/.paw/work/finalize-initial-chatmodes/Phase1-Review.md#L75
- A historical plan artifact includes an “Alignment Requirement:” heading:
  - https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/.paw/work/paw-directory/ImplementationPlan.md#L590

### 3) How ImplementationPlan.md is read/updated in local strategy

#### 3.1 Where the plan is expected to live
The canonical artifact location is `.paw/work/<work-id>/ImplementationPlan.md`.
- Reference directory structure: https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/docs/reference/artifacts.md#L9-L23
- Artifact section header: https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/docs/reference/artifacts.md#L103

#### 3.2 How it’s updated (agent behavior)
In local strategy, plan updates are described as edits to the markdown file:

- Implementer responsibility includes “Update ImplementationPlan.md with progress” and “Update checkboxes in the plan as you complete sections”.
  - References:
    - https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03A%20Implementer.agent.md#L156
    - https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03A%20Implementer.agent.md#L176

- Reviewer local strategy flow includes “Document phase completion in ImplementationPlan.md notes if needed” when review strategy is `local`.
  - Reference: https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md#L223-L227

- Status agent guidance describes parsing phases from ImplementationPlan.md by regex on headings, implying that plan structure is relied upon by agents (rather than extension code) for phase discovery:
  - https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-X%20Status.agent.md#L294-L305

#### 3.3 What the VS Code extension code reads/updates
The extension code does not implement a plan parser/writer; it primarily:

- **Inventories** the file (used for “last modified” timestamp calculations and status UI ordering).
  - In the work status scan, `ImplementationPlan.md` is one of the artifacts whose mtime is checked.
  - Reference: https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/src/commands/getWorkStatus.ts#L33-L49

- Loads and returns **WorkflowContext.md** and agent instruction files via the `paw_get_context` tool.
  - Reference: https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/src/tools/contextTool.ts#L321-L356

Separately, documentation notes that “implement auto-detects the current phase from ImplementationPlan.md”, but this is a behavior described in agent-level guidance (not implemented by the extension handoff tool).
- Documentation reference: https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/docs/guide/stage-transitions.md#L24-L26
- The handoff tool just invokes the target agent with Work ID; it does not parse plan state:
  - https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/src/tools/handoffTool.ts#L43-L68

### 4) Existing utilities for commit-history context

#### 4.1 Extension code: minimal git utilities
The extension’s built-in git helpers are limited to:
- Checking the workspace is a git repo via `git rev-parse --git-dir`.
- Checking for uncommitted changes via `git status --porcelain`.

References:
- https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/src/git/validation.ts#L9-L20
- https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/src/git/validation.ts#L28-L46

No extension-side helper for commit history (e.g., `git log`) is present in `src/` at this commit.

#### 4.2 Agent prompts: commit history is accessed via git CLI instructions
Commit and history context is typically obtained by agent-directed git commands:

- PAW-03B: instructs using `git diff` / `git log` to see what Implementer did.
  - https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md#L161
  - Also used for review comment follow-up commit reading: https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md#L239

- PAW-X Status: instructs git commands that provide commit/divergence context (upstream rev-parse + rev-list counts).
  - https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-X%20Status.agent.md#L301-L305

## Code References (index)
- https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md#L161
- https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md#L221
- https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md#L223-L227
- https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03B%20Impl%20Reviewer.agent.md#L264-L280
- https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-03A%20Implementer.agent.md#L156
- https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/src/commands/getWorkStatus.ts#L33-L49
- https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/src/git/validation.ts#L9-L20
- https://github.com/lossyrob/phased-agent-workflow/blob/3338234217d6b1a507cfa731e16214e06349403f/agents/PAW-X%20Status.agent.md#L301-L305

## Open Questions
- None for the requested scope (prompt output format, existing alignment sections, ImplementationPlan IO, commit-context utilities).
