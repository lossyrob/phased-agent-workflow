---
labels_used:
  - workflow-sequence (existing)
  - workflow-step (existing)
  - role-assignment (NEW) - defines agent persona/task framing
  - embedded-template (NEW) - literal template content to be used
  - tool-invocation (NEW) - specific CLI commands to execute
  - conditional-logic (NEW) - branching/decision points
  - state-check (NEW) - checking for existing state/artifacts
  - analysis-directive (NEW) - instructions for reasoning/analysis
  - output-artifact (NEW) - file/artifact to produce
  - follow-up-action (NEW) - actions after main task
  - behavioral-guidance (NEW) - general guidelines/principles
---

```markdown
---
description: Generate comprehensive PR descriptions following repository templates
---

# Generate PR Description

<role-assignment>
You are tasked with generating a comprehensive pull request description following the repository's standard template.
</role-assignment>

## Steps to follow:

<workflow-sequence>

<workflow-step id="1" name="read-template">
1. **Read the PR description template:**

    - Use the following PR description template:

        <embedded-template name="pr-description-template">
        ```md
        ## What problem(s) was I solving?

        ## What user-facing changes did I ship?

        ## How I implemented it

        ## How to verify it

        ### Manual Testing

        ## Description for the changelog
        ```
        </embedded-template>

    - Read the template carefully to understand all sections and requirements
</workflow-step>

<workflow-step id="2" name="identify-pr">
2. **Identify the PR to describe:**
   <conditional-logic>
   - Check if the current branch has an associated PR: <tool-invocation>`gh pr view --json url,number,title,state 2>/dev/null`</tool-invocation>
   - If no PR exists for the current branch, or if on main/master, list open PRs: <tool-invocation>`gh pr list --limit 10 --json number,title,headRefName,author`</tool-invocation>
   - Ask the user which PR they want to describe
   </conditional-logic>
</workflow-step>

<workflow-step id="3" name="check-existing">
3. **Check for existing description:**
   <state-check>
   - Check if `/tmp/{repo_name}/prs/{number}_description.md` already exists
   - If it exists, read it and inform the user you'll be updating it
   - Consider what has changed since the last description was written
   </state-check>
</workflow-step>

<workflow-step id="4" name="gather-info">
4. **Gather comprehensive PR information:**
   - Get the full PR diff: <tool-invocation>`gh pr diff {number}`</tool-invocation>
   <conditional-logic>
   - If you get an error about no default remote repository, instruct the user to run `gh repo set-default` and select the appropriate repository
   </conditional-logic>
   - Get commit history: <tool-invocation>`gh pr view {number} --json commits`</tool-invocation>
   - Review the base branch: <tool-invocation>`gh pr view {number} --json baseRefName`</tool-invocation>
   - Get PR metadata: <tool-invocation>`gh pr view {number} --json url,title,number,state`</tool-invocation>
</workflow-step>

<workflow-step id="5" name="analyze-changes">
5. **Analyze the changes thoroughly:** <analysis-directive>(ultrathink about the code changes, their architectural implications, and potential impacts)</analysis-directive>
   <analysis-directive>
   - Read through the entire diff carefully
   - For context, read any files that are referenced but not shown in the diff
   - Understand the purpose and impact of each change
   - Identify user-facing changes vs internal implementation details
   - Look for breaking changes or migration requirements
   </analysis-directive>
</workflow-step>

<workflow-step id="6" name="handle-verification">
6. **Handle verification requirements:**
   - Look for any checklist items in the "How to verify it" section of the template
   - For each verification step:
     <conditional-logic>
     - If it's a command you can run (like `make check test`, `npm test`, etc.), run it
     - If it passes, mark the checkbox as checked: `- [x]`
     - If it fails, keep it unchecked and note what failed: `- [ ]` with explanation
     - If it requires manual testing (UI interactions, external services), leave unchecked and note for user
     </conditional-logic>
   - Document any verification steps you couldn't complete
</workflow-step>

<workflow-step id="7" name="generate-description">
7. **Generate the description:**
   <analysis-directive>
   - Fill out each section from the template thoroughly:
     - Answer each question/section based on your analysis
     - Be specific about problems solved and changes made
     - Focus on user impact where relevant
     - Include technical details in appropriate sections
     - Write a concise changelog entry
   - Ensure all checklist items are addressed (checked or explained)
   </analysis-directive>
</workflow-step>

<workflow-step id="8" name="save-output">
8. **Save and sync the description:**
   <output-artifact path="/tmp/{repo_name}/prs/{number}_description.md">
   - Write the completed description to `/tmp/{repo_name}/prs/{number}_description.md`
   </output-artifact>
   - Show the user the generated description
</workflow-step>

<workflow-step id="9" name="update-pr">
9. **Update the PR:**
   <follow-up-action>
   - Update the PR description directly: <tool-invocation>`gh pr edit {number} --body-file /tmp/{repo_name}/prs/{number}_description.md`</tool-invocation>
   - Confirm the update was successful
   - If any verification steps remain unchecked, remind the user to complete them before merging
   </follow-up-action>
</workflow-step>

</workflow-sequence>

## Important notes:
<behavioral-guidance>
- This command works across different repositories - always read the local template
- Be thorough but concise - descriptions should be scannable
- Focus on the "why" as much as the "what"
- Include any breaking changes or migration notes prominently
- If the PR touches multiple components, organize the description accordingly
- Always attempt to run verification commands when possible
- Clearly communicate which verification steps need manual testing
</behavioral-guidance>

```
