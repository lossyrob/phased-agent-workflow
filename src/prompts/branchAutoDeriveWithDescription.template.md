1. **Check Current Branch First:**
   - Run `git branch --show-current` to see current branch
   - If already on a feature/fix branch (not main/master/develop), offer to use it
   - Ask user: "You're on branch '<current>'. Use this branch or derive a new one?"

2. **Derive From Work Description:**
   - Use the Initial Prompt (work description) provided by the user
   - Slugify: lowercase, replace spaces with hyphens, remove special characters
   - Keep reasonably short (3-5 words worth)
   - Determine appropriate prefix based on description content:
     - Bug/fix descriptions → `fix/`
     - Feature/add/implement descriptions → `feature/`
   - Example: "Add rate limiting to API" → `feature/api-rate-limiting`

3. **Check Remote Branch Conventions:**
   - Run `git branch -r` to list remote branches
   - Analyze existing branch naming patterns
   - Common prefixes: feature/, bugfix/, fix/, hotfix/, feat/
   - Use detected convention or fall back to `feature/` for features, `fix/` for bugs

4. **Check for Conflicts:**
   - Compare derived name against remote branches
   - If conflict exists, append suffix (-2, -3, etc.) until unique
   - Inform user of the derived branch name before creating
