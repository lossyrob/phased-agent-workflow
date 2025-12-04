Since no issue URL was provided, ask the user to describe their work:

1. **Pause and Ask:**
   - Ask: "What would you like to work on? Please describe the feature, bug fix, or task."
   - Wait for the user's response in the chat

2. **Capture the Response:**
   - Store the user's description as the Initial Prompt
   - This will be saved to WorkflowContext.md for downstream agents

3. **Use the Description For:**
   - Deriving the branch name (if branch was skipped)
   - Deriving the Work Title (extract key concepts, 2-4 words)
   - Providing context to downstream agents via the Initial Prompt field

4. **Example Flow:**
   - User says: "I want to add rate limiting to the API endpoints to prevent abuse"
   - Initial Prompt: "I want to add rate limiting to the API endpoints to prevent abuse"
   - Derived Work Title: "API Rate Limiting"
   - Derived Branch: `feature/api-rate-limiting`
