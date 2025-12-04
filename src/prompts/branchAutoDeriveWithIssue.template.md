1. **Check Current Branch First:**
   - Run `git branch --show-current` to see current branch
   - If already on a feature/fix branch (not main/master/develop), offer to use it
   - Ask user: "You're on branch '<current>'. Use this branch or derive a new one from the issue?"

2. **Derive From Issue Title:**
   - Fetch the issue title from {{ISSUE_URL}}
   - Extract the issue number from the URL
   - Generate branch name: `feature/<issue-number>-<slugified-title>`
   - Slugify: lowercase, replace spaces with hyphens, remove special characters
   - Keep title portion to 3-5 words
   - Example: Issue #42 "Add User Authentication Flow" → `feature/42-add-user-authentication`

3. **Check Remote Branch Conventions:**
   - Run `git branch -r` to list remote branches
   - Analyze existing branch naming patterns
   - Common prefixes: feature/, bugfix/, fix/, hotfix/, feat/
   - Use detected convention or fall back to `feature/` for features, `fix/` for bugs

4. **Check for Conflicts:**
   - Compare derived name against remote branches
   - If conflict exists, append suffix (-2, -3, etc.) until unique
   - Inform user of the derived branch name before creating
