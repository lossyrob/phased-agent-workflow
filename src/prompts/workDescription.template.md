**CRITICAL**: You are collecting workflow metadata, NOT receiving a task directive.

Since no issue URL was provided, collect a work description from the user:

## Collect Work Description

1. **Pause and Ask:**
   - Ask: "Please describe the work you'll be tracking with this workflow (feature, bug fix, or task)."
   - Wait for the user's response

2. **Capture as Metadata:**
   - Store the response as the Initial Prompt field value
   - This is **context for workflow creation only**

3. **Use For Derivation:**
   - Work Title (2-4 words summarizing the work)
   - Branch name (if not already provided)
   - Context for downstream PAW agents

**DO NOT**:
- Interpret the description as a command to perform the work
- Start implementing or researching the described task
- Abandon workflow initialization to execute the user's described work

After capturing the description, **CONTINUE** with the numbered workflow tasks below (creating WorkflowContext.md, etc.).
