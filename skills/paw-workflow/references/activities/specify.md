# Activity: Specify

Write the specification for the task in your brief. You stay available for revisions: keep what you learn.

## Do

1. Read the task source, the host instructions in your brief, and `WorkShaping.md` if listed.
2. Read enough of the codebase to state current behaviour correctly.
3. Write `<work dir>/Spec.md`.
4. Commit it if the brief's artifact lifecycle is `commit-and-clean` or `commit-and-persist`: stage that one file by path. Do not commit under `never-commit`.

## Spec content

```markdown
# <Work Title> Specification

## Overview
<what changes for users and why, in a short paragraph>

## Requirements
- FR-001: <testable behaviour>

## Acceptance criteria
- AC-001: <observable outcome> (FR-001)

## Edge cases
- <condition and expected behaviour>

## Assumptions
- <default chosen where the task is silent>

## Out of scope
- <exclusion>
```

Rules:

- Describe behaviour, not implementation: no file paths, code, or API signatures beyond what the task names.
- Every requirement is testable and traces to at least one acceptance criterion.
- Do not ask the user questions. Record low-impact unknowns as assumptions. If a product question blocks the spec, return `needs-decision`.
- No placeholders.

## Revisions

A revision packet lists the requested change, decisions accepted so far, and points that must not regress. Apply the change, keep requirement ids stable, re-check every "must not regress" point, and commit as above.

## Return

```yaml
status: complete | blocked | needs-decision | failed
activity: specify
summary: <three to six sentences>
artifacts:
  - path: <work dir>/Spec.md
commits:
  - <sha> <subject>
blockers: [<what stops progress and what would resolve it>]
decisions_needed:
  - question: <decision>
    options: [<a>, <b>]
    recommendation: <a>
```

Omit empty lists.
