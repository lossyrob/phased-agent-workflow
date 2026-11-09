# Activity: Review

Review the target named in your brief and write the review file. Do not change code, the plan, or git state.

## Target: plan

Read the task source and `ImplementationPlan.md`. Check the plan's claims against the codebase.

- **Coverage**: does the plan deliver the whole task? Anything missing or out of scope without reason?
- **Feasibility**: do the named files, interfaces, and commands exist and behave as the plan assumes?
- **Verifiability**: does each unit have observable "Done when" criteria and tests?
- **Structure**: are units sized and ordered sensibly; are "independent" units truly independent?
- **Host instructions**: does the plan respect the project rules in the brief?

## Target: final

Run `git diff <base>...<target>` from the brief, and read the task source and the plan.

- **Correctness**: does the change do what the task asks? Logic errors, edge cases, error handling.
- **Plan coverage**: compare each unit's Changes and Tests with the repository. A promised deliverable that is missing or empty is at least `should-fix`.
- **Tests**: do the tests exercise the new behaviour? Run the project's test and lint commands and report the result.
- **Consistency**: does the change follow the codebase's patterns and the host instructions?
- **Scope**: does the diff contain changes unrelated to the task, including files that belong to the user's uncommitted work?

## Target: unit

As `final`, limited to the diff range in your brief and to that unit's Changes and Tests in the plan. Later units are out of scope.

## Output

Write the file at the output path in your brief:

```markdown
# Review: <plan | unit | final>

**Verdict**: pass | changes-required
**Reviewed**: <artifact path or diff range>
**Validation**: <commands run and results>

## Findings

### 1. <title>
- Severity: must-fix | should-fix | consider
- Location: <file:line>
- Issue: <what is wrong>
- Proposed fix: <specific change>
```

`changes-required` if there is any `must-fix` or `should-fix`. Report only issues you verified in the code or the plan. If there are no findings, write "No findings."

## Return

```yaml
status: complete | blocked | failed
activity: review
target: plan | unit | final
verdict: pass | changes-required
artifacts:
  - path: <review file>
findings:
  - severity: must-fix | should-fix | consider
    location: <file:line>
    issue: <one line>
    proposed_fix: <one line>
validation:
  - command: <command>
    result: pass | fail
```

Omit empty lists.
