# Activity: Research

Document how the code the task touches works today. Describe what exists; do not propose changes or critique.

## Do

1. Read the task source, the host instructions in your brief, and `Spec.md` if listed.
2. Find the code, tests, configuration, and docs the task touches. Trace entry points and data flow. Use parallel read-only subagents only for clearly independent areas.
3. Identify the project's build, lint, test, and type-check commands, and how docs are built.
4. Write `<work dir>/CodeResearch.md`.
5. Commit it if the brief's artifact lifecycle is `commit-and-clean` or `commit-and-persist`: stage that one file by path. Do not commit under `never-commit`.

## CodeResearch.md content

```markdown
# <Work Title> Code Research

## Summary
<what the relevant code does today>

## Findings
### <area>
- <fact> (`path/to/file.ts:12`)

## Tests
<test locations, framework, patterns>

## Commands
| Purpose | Command |
|---------|---------|
| Build | <command or "none"> |
| Lint | <command or "none"> |
| Test | <command> |

## Open unknowns
<what the codebase could not answer, or "None">
```

Rules:

- Every claim carries a `file:line` reference. Read before stating; do not invent.

## Return

```yaml
status: complete | blocked | failed
activity: research
summary: <three to six sentences>
artifacts:
  - path: <work dir>/CodeResearch.md
commits:
  - <sha> <subject>
blockers: [<what stops progress and what would resolve it>]
```

Omit empty lists.
