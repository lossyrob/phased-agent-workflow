<!-- 
ANNOTATION METADATA
===================
Labels used:
  - <agent-identity> - Agent mission statement
  - <workflow-sequence> - Container for workflow steps
  - <workflow-step> - Individual step
  - <tool-guidance> - Instructions for specific tools
  - <verification-step> - Actions to confirm correctness
  - <error-handling> (NEW) - Recovery instructions for failure cases
  - <output-guidance> (NEW) - Instructions for generating/formatting output
  - <behavioral-constraints> (NEW) - Rules governing agent behavior
-->

---
description: Generate comprehensive PR descriptions following repository templates
---

# Generate PR Description

<agent-identity>
You are tasked with generating a comprehensive pull request description following the repository's standard template.
</agent-identity>

## Steps to follow:

<workflow-sequence>

<workflow-step>
1. **Read the PR description template:**
   - First, check if `thoughts/shared/pr_description.md` exists
   <error-handling>
   - If it doesn't exist, inform the user that their `humanlayer thoughts` setup is incomplete and they need to create a PR description template at `thoughts/shared/pr_description.md`
   </error-handling>
   - Read the template carefully to understand all sections and requirements
</workflow-step>

<workflow-step>
2. **Identify the PR to describe:**
   <tool-guidance>
   - Check if the current branch has an associated PR: `gh pr view --json url,number,title,state 2>/dev/null`
   - If no PR exists for the current branch, or if on main/master, list open PRs: `gh pr list --limit 10 --json number,title,headRefName,author`
   </tool-guidance>
   - Ask the user which PR they want to describe
</workflow-step>

<workflow-step>
3. **Check for existing description:**
   - Check if `thoughts/shared/prs/{number}_description.md` already exists
   - If it exists, read it and inform the user you'll be updating it
   - Consider what has changed since the last description was written
</workflow-step>

<workflow-step>
4. **Gather comprehensive PR information:**
   <tool-guidance>
   - Get the full PR diff: `gh pr diff {number}`
   <error-handling>
   - If you get an error about no default remote repository, instruct the user to run `gh repo set-default` and select the appropriate repository
   </error-handling>
   - Get commit history: `gh pr view {number} --json commits`
   - Review the base branch: `gh pr view {number} --json baseRefName`
   - Get PR metadata: `gh pr view {number} --json url,title,number,state`
   </tool-guidance>
</workflow-step>

<workflow-step>
5. **Analyze the changes thoroughly:** (ultrathink about the code changes, their architectural implications, and potential impacts)
   - Read through the entire diff carefully
   - For context, read any files that are referenced but not shown in the diff
   - Understand the purpose and impact of each change
   - Identify user-facing changes vs internal implementation details
   - Look for breaking changes or migration requirements
</workflow-step>

<workflow-step>
<verification-step>
6. **Handle verification requirements:**
   - Look for any checklist items in the "How to verify it" section of the template
   - For each verification step:
     - If it's a command you can run (like `make check test`, `npm test`, etc.), run it
     - If it passes, mark the checkbox as checked: `- [x]`
     - If it fails, keep it unchecked and note what failed: `- [ ]` with explanation
     - If it requires manual testing (UI interactions, external services), leave unchecked and note for user
   - Document any verification steps you couldn't complete
</verification-step>
</workflow-step>

<workflow-step>
<output-guidance>
7. **Generate the description:**
   - Fill out each section from the template thoroughly:
     - Answer each question/section based on your analysis
     - Be specific about problems solved and changes made
     - Focus on user impact where relevant
     - Include technical details in appropriate sections
     - Write a concise changelog entry
   - Ensure all checklist items are addressed (checked or explained)
</output-guidance>
</workflow-step>

<workflow-step>
8. **Save and sync the description:**
   <tool-guidance>
   - Write the completed description to `thoughts/shared/prs/{number}_description.md`
   - Run `humanlayer thoughts sync` to sync the thoughts directory
   </tool-guidance>
   - Show the user the generated description
</workflow-step>

<workflow-step>
9. **Update the PR:**
   <tool-guidance>
   - Update the PR description directly: `gh pr edit {number} --body-file thoughts/shared/prs/{number}_description.md`
   </tool-guidance>
   <verification-step>
   - Confirm the update was successful
   </verification-step>
   - If any verification steps remain unchecked, remind the user to complete them before merging
</workflow-step>

</workflow-sequence>

<behavioral-constraints>
## Important notes:
- This command works across different repositories - always read the local template
- Be thorough but concise - descriptions should be scannable
- Focus on the "why" as much as the "what"
- Include any breaking changes or migration notes prominently
- If the PR touches multiple components, organize the description accordingly
- Always attempt to run verification commands when possible
- Clearly communicate which verification steps need manual testing
</behavioral-constraints>
