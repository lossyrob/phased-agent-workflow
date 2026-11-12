# Activity: Plan

Produce the implementation plan for the task in your brief. You stay available for revisions: keep what you learn.

## Do

1. Read the task source, the host instructions in your brief, and every input listed (`WorkShaping.md`, `Spec.md`, `CodeResearch.md`).
2. Research the codebase yourself: the code the change touches, its tests, conventions, and the commands that build, lint, and test the project. With `CodeResearch.md`, research only what it does not cover. Use parallel read-only subagents only for clearly independent areas.
3. Write `<work dir>/ImplementationPlan.md`.
4. Commit the plan if the brief's artifact lifecycle is `commit-and-clean` or `commit-and-persist`: stage that one file by path. Do not commit under `never-commit`.

## Plan content

```markdown
# <Work Title> Implementation Plan

## Summary
<what will be built and the approach, in a short paragraph>

## Sources
<task source, and the path of each input artifact used>

## Findings
<the facts the plan rests on, each with a file:line reference>

## Decisions
<choices made and why; decisions carried from the brief>

## Units
### Unit 1: <name>
- Depends on: <unit ids or "none">
- Changes: <files to create or modify and what changes in each>
- Tests: <tests to add or update>
- Done when: <observable criteria and the commands that prove them>

## Out of scope
<what this work deliberately does not do>
```

Rules:

- With `Spec.md`, name the requirement ids each unit delivers; every requirement maps to a unit.
- One unit unless the work splits into parts that can each be verified on their own. If the brief says one unit, write exactly one. Mark units independent only if they touch different files.
- Every code claim carries a file:line reference. State unknowns as unknowns; do not invent.
- No placeholders and no open questions that block implementation. If a question blocks the plan and the codebase cannot answer it, return `needs-decision`.
- Describe changes at the level of files, interfaces, and behaviour. Do not write the implementation.

## Revisions

A revision packet lists the requested change, decisions accepted so far, and points that must not regress. Apply the change, re-check every "must not regress" point, and commit the updated plan as above.

## Return

```yaml
status: complete | blocked | needs-decision | failed
activity: plan
summary: <three to six sentences>
artifacts:
  - path: <work dir>/ImplementationPlan.md
commits:
  - <sha> <subject>
validation:
  - command: <project test/lint commands you identified>
    result: identified
deviations: [<where the plan departs from the brief, and why>]
blockers: [<what stops progress and what would resolve it>]
decisions_needed:
  - question: <decision>
    options: [<a>, <b>]
    recommendation: <a>
candidates: [<related work noticed but left out>]
```

Omit empty lists.
