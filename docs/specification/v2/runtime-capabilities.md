# PAW v2 Runtime Capabilities

!!! note "Status: partly verified"
    Phase 0 output for [#322](https://github.com/lossyrob/phased-agent-workflow/issues/322). The Copilot CLI column was verified on 2026-11-09 with the probe in `tests/integration/tests/probes/` against Copilot CLI 1.0.108. The Claude Code and VS Code columns come from vendor documentation and have not been run.

PAW v2 depends on four host capabilities. This page records what each supported runtime offers and what the workflow does when a capability is missing.

## Capability matrix

| Capability | Copilot CLI | Claude Code | VS Code (Local harness) |
|------------|-------------|-------------|-------------------------|
| Follow-up to an existing subagent | **Verified**: `write_agent` reaches a finished subagent and it keeps its context. Only for subagents started with `mode: "background"`; a `sync` task returns no agent ID | Yes: `SendMessage` to the agent ID; history retained | **No**: "Each Local invocation is stateless" |
| Parallel subagents | Yes: background agents, `/fleet` | Yes: background by default | Not stated explicitly |
| Model per subagent call | Yes: `model` parameter on the `task` tool (used by PAW today) | Yes: `model` parameter | Yes: `model` parameter on `runSubagent` |
| Nested subagents | Yes; depth limit undocumented | Yes; three levels by default | Off by default; setting-gated |
| TODO store | **Verified**: SQL `todos` and `todo_deps` in the session database, readable by the test harness | `TaskCreate` and related tools, with dependencies | `#todos` list; no dependencies documented |
| TODOs survive compaction | Not documented | Yes | Not documented |
| TODOs in subagents | Shared session database (PAW Lite relies on this today) | Not relied on | Unavailable to Local subagents |
| Resume session by ID | `--resume <id>`, `--continue` | `--resume`, `--continue` | Reopen the chat session |
| Skill resource files | **Verified**: a plain host loads a skill with the `skill` tool and reads its `references/` files | Supporting files supported | Full skill directory supported |
| Skill discovery paths | `.github/skills`, `.claude/skills`, `.agents/skills`, `~/.copilot/skills` | `.claude/skills`, `~/.claude/skills`, plugins | `.github/skills`, `.claude/skills`, `.agents/skills` and personal equivalents |

Sources: [Copilot CLI docs](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/use-copilot-cli), the Copilot CLI 1.0.108 `changelog.json`, [Claude Code subagents](https://code.claude.com/docs/en/sub-agents), [VS Code subagents](https://code.visualstudio.com/docs/copilot/agents/subagents).

## Consequences for the design

### Persistent activity subagents

Two of three runtimes can keep one subagent across revision rounds. VS Code's Local harness cannot.

The design therefore treats the **revision packet** as the contract and subagent persistence as an optimisation:

- The host always sends a complete revision packet (current artifact, requested change, accepted decisions, constraints, points that must not regress).
- Where follow-up is available, the packet goes to the existing subagent.
- Where it is not, the packet goes to a fresh subagent, which reads the artifact from disk.

The workflow skill states this as one rule with no per-runtime branches. A host that has a follow-up tool uses it.

### TODO graph

Dependencies are native on Copilot CLI and Claude Code. On VS Code the list is flat.

- The graph template is written as nodes with `blocked by` relations.
- On a flat list, the host records the blocking relation in the item text and keeps items in dependency order.
- Subagents never write to the TODO store. They report in their return and the host updates the graph. This removes the Copilot-only pattern in PAW Lite where subagents run `UPDATE todos`.

### Compaction

Only Claude Code documents that TODOs survive compaction. Phase 1 must test this on Copilot CLI, because invariant W1 depends on it. If the store does not survive, the fallback is rebuilding the graph from configuration, git state and artifacts, which is the same path used for best-effort reconstruction in a new session.

### Skill loading

All three runtimes read resource files from the skill directory. The VS Code extension's `paw_get_skill` tool returns `SKILL.md` text only, so activity briefs in `references/` must be readable from the installed skill path on disk. This already holds for `paw-sot` and `paw-init`.

### Nesting

Review providers fan out (multi-model, SoT). If the review activity runs in a subagent, the fan-out is nested. VS Code disables nesting by default.

- The review activity is the one activity the host may run directly as a fan-out, so that reviewers are first-level subagents on every runtime.
- Multi-model and society-of-thought reviews have not been run in VS Code. The skill has no fallback: a configured review that cannot run blocks the workflow.

## Probe results

Run with `npm run probe:runtime` in `tests/integration`, with `PAW_TEST_CLI_PATH` set to the installed CLI.

| # | Question | Runtime | Result |
|---|----------|---------|--------|
| 1 | Does `write_agent` reach a subagent that has already returned? | Copilot CLI 1.0.108 | **Yes.** The subagent returned a codeword it was given in round one, and the host's follow-up did not contain it. |
| 2 | Is follow-up available for every subagent? | Copilot CLI 1.0.108 | **No.** Only background-mode subagents get an agent ID. The workflow skill must start persistent activities in background mode. |
| 3 | Does the SDK's bundled CLI support follow-up? | Copilot CLI 1.0.5 | **No.** It has no `write_agent`. Tests that need follow-up must run against an installed CLI. |
| 4 | Can the harness observe subagent calls, follow-ups and TODO rows? | Copilot CLI | **Yes.** Session events carry subagent tool calls and per-initiator token usage; TODOs are read from the session database. |
| 5 | Do host instructions reach subagents on their own? | Copilot CLI | **No.** A project rule in the host's instructions reached a subagent's output only when the host wrote it into the delegation prompt. The delegation brief must carry relevant host instructions. |
| 6 | Do SQL TODOs survive context compaction? | Copilot CLI | **Not tested.** SDK 0.1.32 cannot force compaction on CLI 1.0.108. TODOs live in the session database, outside the context window, so survival is expected. |
| 7 | Do subagents run in parallel, with a per-call model, in the Local harness? | VS Code | Not tested. |
| 8 | Is there a practical way to run integration tests against Claude Code? | Claude Code | Not tested. |

## Baseline and v2 runs

All runs use the same task and fixture on Copilot CLI 1.0.108 (`npm run test:v2` in `tests/integration`). The v2 column covers three runs of the default suite; the v1 column is one run of the `PAW` agent and skills from `main` (`v1-baseline.test.ts`).

| Observation | v1 `PAW` agent (1 run) | v2 skill (3 runs) |
|-------------|------------------------|-------------------|
| Wall-clock time | 106 s | 135–153 s |
| Peak host prompt size | 74k tokens | 46–49k tokens |
| Model calls, host | 21 | 19–22 |
| Model calls, subagents | 4 | 20–24 |
| Skills loaded by the host | 7 | 1 |
| Subagents started | 2 | 4 |
| TODO nodes | 0 | 7, with dependencies, all closed |
| Pull requests opened | 1 | 1, 1, 2 |
| User's uncommitted change | Reported in a workflow commit (not verified) | Untouched |
| Project commit-message rule | Followed | Followed |

Notes:

- The v1 run needed an explicit instruction to act as the PAW agent. Without it the host ignored PAW entirely.
- The second pull request in one v2 run followed a history rewrite by the host. Invariant G12 and a matching rule in the git procedure were added in response; they have not been rerun.
- Each default-suite run passed 15 of 16 checks. Two failures were a test defect (since fixed); the third was the double pull request.

Three further suites each passed on their last run: plan revision through the same subagent (8 of 8), configured procedures with phase review on a three-unit plan (8 of 8, 263 s), and the `never-commit` lifecycle (5 of 5).

Phase 4 suites, last run each: resume from the base branch (11 of 11, 78 s), rewind to the plan after Unit 1 (8 of 8, 147 s), `commit-and-persist` (7 of 7, 120 s) and worktree mode (6 of 6, 99 s). The default suite passed 17 of 17 afterwards (170 s).

Observed in these runs:

- Hosts name unit todos `implement:<unit>` or `implement-<unit>`, even when the skill and the resume procedure give the colon form. Tests match both.
- With the v1 `skills/` directory on the skill path, a host asked to "go back to the plan" loaded `paw-rewind` as well as the workflow skill in one of two runs. It still followed the v2 rewind procedure (no reset).
- Test sessions run under `node --test`, so the CLI inherits `NODE_TEST_CONTEXT`, which makes a fixture's own `node --test` report nothing. Hosts and subagents worked around it with `env -u NODE_TEST_CONTEXT`.
