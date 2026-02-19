# Research Questions: Society-of-Thought Final Review

These questions will inform the specification for adding society-of-thought as a third Final Review mode.

## Internal Research Questions

### Question 1: How does the existing `paw-final-review` skill work?
- What is its structure and organization?
- How does it handle single-model vs multi-model modes?
- What artifacts does it produce?
- What is its overall workflow?

### Question 2: How would specialist/persona files be discovered at the 4 precedence levels?
- Workflow level (per-work-item in WorkflowContext.md)
- Project level (`.paw/specialists/` or similar)
- User level (`~/.paw/specialists/`)
- Built-in defaults (defined in the skill itself)
- Are there existing patterns in PAW for this kind of multi-level precedence?

### Question 3: How are existing Final Review config fields consumed?
- `Final Review Mode` field
- `Final Review Interactive` field
- `Final Review Models` field
- Where and how are these fields read from WorkflowContext.md?
- What code paths consume these values?

### Question 4: What does the current GapAnalysis.md artifact format look like?
- Does paw-final-review currently produce a GapAnalysis.md?
- If so, what is its structure and content format?
- What information does it contain?

### Question 5: How does multi-model review launch parallel subagents with different models?
- What is the mechanism for launching multiple model instances?
- How are different models specified and invoked?
- How are results collected and merged?

## External Context Questions
(These require domain knowledge outside the codebase)

- [ ] None for this research phase
