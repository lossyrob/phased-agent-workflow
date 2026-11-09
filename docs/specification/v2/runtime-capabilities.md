# PAW v2 Runtime Capabilities

!!! note "Status: draft for review"
    Phase 0 output for [#322](https://github.com/lossyrob/phased-agent-workflow/issues/322). Findings come from vendor documentation and the locally installed Copilot CLI package, read on 2026-11-09. **None of this was verified by running a workflow.** Phase 1 turns each row into a harness check.

PAW v2 depends on four host capabilities. This page records what each supported runtime offers and what the workflow does when a capability is missing.

## Capability matrix

| Capability | Copilot CLI | Claude Code | VS Code (Local harness) |
|------------|-------------|-------------|-------------------------|
| Follow-up to an existing subagent | Yes: `write_agent` and `read_agent` for multi-turn background agents (changelog only; not in public docs) | Yes: `SendMessage` to the agent ID; history retained | **No**: "Each Local invocation is stateless" |
| Parallel subagents | Yes: background agents, `/fleet` | Yes: background by default | Not stated explicitly |
| Model per subagent call | Yes: `model` parameter on the `task` tool (used by PAW today) | Yes: `model` parameter | Yes: `model` parameter on `runSubagent` |
| Nested subagents | Yes; depth limit undocumented | Yes; three levels by default | Off by default; setting-gated |
| TODO store | SQL `todos` and `todo_deps` in the session database | `TaskCreate` and related tools, with dependencies | `#todos` list; no dependencies documented |
| TODOs survive compaction | Not documented | Yes | Not documented |
| TODOs in subagents | Shared session database (PAW Lite relies on this today) | Not relied on | Unavailable to Local subagents |
| Resume session by ID | `--resume <id>`, `--continue` | `--resume`, `--continue` | Reopen the chat session |
| Skill resource files | Skill directory is available to the agent | Supporting files supported | Full skill directory supported |
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
- VS Code today falls back to single-model review. v2 keeps that fallback until multi-model review is tested there.

## Items to verify in Phase 1

| # | Question | Runtime |
|---|----------|---------|
| 1 | Does `write_agent` reach a subagent that has already returned its result, or only one still running? | Copilot CLI |
| 2 | Do SQL TODOs survive context compaction and `--resume`? | Copilot CLI |
| 3 | Can the Copilot SDK harness observe subagent calls, follow-ups and TODO rows? | Copilot CLI |
| 4 | Does a skill loaded by a plain agent (no `PAW` agent) keep the user's instruction files in effect for subagents? | All |
| 5 | Do subagents run in parallel, and with a per-call model, in the Local harness? | VS Code |
| 6 | Is there a practical way to run integration tests against Claude Code? | Claude Code |
