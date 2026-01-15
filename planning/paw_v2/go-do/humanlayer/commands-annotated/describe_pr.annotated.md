<!--
ANNOTATION METADATA
==================
Labels Used:
- <mission-statement> - One-sentence description
- <workflow-sequence> - Container for workflow steps
- <workflow-step> - Individual step
- <tool-guidance> - Instructions for specific tools
- <error-handling> - How to handle errors
- <verification-step> - Actions to confirm correctness
- <artifact-format> - Schema/template for output
- <important-notes> - Critical reminders
- <behavioral-directive> - Specific behavior instruction
- <conditional-logic> (NEW) - Branching based on state/conditions
- <user-interaction> (NEW) - Points requiring user input/confirmation
-->

---
description: Generate comprehensive PR descriptions following repository templates
---

# Generate PR Description

<mission-statement>
You are tasked with generating a comprehensive pull request description following the repository's standard template.
</mission-statement>

## Steps to follow:

<workflow-sequence>

<workflow-step id="1">
1. **Read the PR description template:**
   <tool-guidance tool="filesystem">
   - First, check if `thoughts/shared/pr_description.md` exists
   </tool-guidance>
   <error-handling>
   - If it doesn't exist, inform the user that their `humanlayer thoughts` setup is incomplete and they need to create a PR description template at `thoughts/shared/pr_description.md`
   </error-handling>
   <behavioral-directive>
   - Read the template carefully to understand all sections and requirements
   </behavioral-directive>
</workflow-step>

<workflow-step id="2">
2. **Identify the PR to describe:**
   <tool-guidance tool="gh-cli">
   - Check if the current branch has an associated PR: `gh pr view --json url,number,title,state 2>/dev/null`
   </tool-guidance>
   <conditional-logic>
   - If no PR exists for the current branch, or if on main/master, list open PRs: `gh pr list --limit 10 --json number,title,headRefName,author`
   </conditional-logic>
   <user-interaction>
   - Ask the user which PR they want to describe
   </user-interaction>
</workflow-step>

<workflow-step id="3">
3. **Check for existing description:**
   <tool-guidance tool="filesystem">
   - Check if `thoughts/shared/prs/{number}_description.md` already exists
   </tool-guidance>
   <conditional-logic>
   - If it exists, read it and inform the user you'll be updating it
   - Consider what has changed since the last description was written
   </conditional-logic>
</workflow-step>

<workflow-step id="4">
4. **Gather comprehensive PR information:**
   <tool-guidance tool="gh-cli">
   - Get the full PR diff: `gh pr diff {number}`
   </tool-guidance>
   <error-handling>
   - If you get an error about no default remote repository, instruct the user to run `gh repo set-default` and select the appropriate repository
   </error-handling>
   <tool-guidance tool="gh-cli">
   - Get commit history: `gh pr view {number} --json commits`
   - Review the base branch: `gh pr view {number} --json baseRefName`
   - Get PR metadata: `gh pr view {number} --json url,title,number,state`
   </tool-guidance>
</workflow-step>

<workflow-step id="5">
5. **Analyze the changes thoroughly:** (ultrathink about the code changes, their architectural implications, and potential impacts)
   <behavioral-directive>
   - Read through the entire diff carefully
   - For context, read any files that are referenced but not shown in the diff
   - Understand the purpose and impact of each change
   - Identify user-facing changes vs internal implementation details
   - Look for breaking changes or migration requirements
   </behavioral-directive>
</workflow-step>

<workflow-step id="6">
6. **Handle verification requirements:**
   <behavioral-directive>
   - Look for any checklist items in the "How to verify it" section of the template
   </behavioral-directive>
   - For each verification step:
     <verification-step>
     <conditional-logic>
     - If it's a command you can run (like `make check test`, `npm test`, etc.), run it
     - If it passes, mark the checkbox as checked: `- [x]`
     - If it fails, keep it unchecked and note what failed: `- [ ]` with explanation
     - If it requires manual testing (UI interactions, external services), leave unchecked and note for user
     </conditional-logic>
     </verification-step>
   <behavioral-directive>
   - Document any verification steps you couldn't complete
   </behavioral-directive>
</workflow-step>

<workflow-step id="7">
7. **Generate the description:**
   <artifact-format>
   - Fill out each section from the template thoroughly:
     - Answer each question/section based on your analysis
     - Be specific about problems solved and changes made
     - Focus on user impact where relevant
     - Include technical details in appropriate sections
     - Write a concise changelog entry
   - Ensure all checklist items are addressed (checked or explained)
   </artifact-format>
</workflow-step>

<workflow-step id="8">
8. **Save and sync the description:**
   <tool-guidance tool="filesystem">
   - Write the completed description to `thoughts/shared/prs/{number}_description.md`
   </tool-guidance>
   <tool-guidance tool="humanlayer-cli">
   - Run `humanlayer thoughts sync` to sync the thoughts directory
   </tool-guidance>
   <user-interaction>
   - Show the user the generated description
   </user-interaction>
</workflow-step>

<workflow-step id="9">
9. **Update the PR:**
   <tool-guidance tool="gh-cli">
   - Update the PR description directly: `gh pr edit {number} --body-file thoughts/shared/prs/{number}_description.md`
   </tool-guidance>
   <verification-step>
   - Confirm the update was successful
   </verification-step>
   <user-interaction>
   - If any verification steps remain unchecked, remind the user to complete them before merging
   </user-interaction>
</workflow-step>

</workflow-sequence>

<important-notes>
## Important notes:
- This command works across different repositories - always read the local template
- Be thorough but concise - descriptions should be scannable
- Focus on the "why" as much as the "what"
- Include any breaking changes or migration notes prominently
- If the PR touches multiple components, organize the description accordingly
- Always attempt to run verification commands when possible
- Clearly communicate which verification steps need manual testing
</important-notes>
