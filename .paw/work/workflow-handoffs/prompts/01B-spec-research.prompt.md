---
agent: 'PAW-01B Spec Researcher'
---
# Spec Research Prompt: Workflow Handoffs

Perform research to answer the following questions.

Target Branch: feature/workflow-handoffs
Issue URL: https://github.com/lossyrob/phased-agent-workflow/issues/69
Additional Inputs: https://github.com/lossyrob/phased-agent-workflow/issues/60

## Questions

1. What are the exact VS Code Language Model API methods for creating new chat sessions and invoking agents programmatically? Document the complete API signature, required parameters, and example usage.

2. How does VS Code's tool approval mechanism work for Language Model Tools? What configuration options exist for auto-approval? What happens when tool approval times out?

3. What is the best practice for passing context between agent invocations when creating new chat sessions? Should context be embedded in the prompt string, passed via tool parameters, or retrieved dynamically by the target agent?

4. What are the optimal Semi-Auto mode pause points for standard workflows? Specifically:
   - Should Spec → Spec Research → Spec be fully automated or pause after research input?
   - Should Implementation → Implementation Review → Implementation (next phase) be continuous or pause between phases?
   - Should Documentation generation pause for review before Docs PR creation?

5. What are the optimal Semi-Auto mode pause points for review workflows? Specifically:
   - Should Understanding → Baseline Research → Understanding be fully automated?
   - Should Impact Analyzer → Gap Analyzer be continuous or pause for impact confirmation?
   - Should Feedback Generator → Feedback Critic iterations be continuous or pause after each iteration?

6. How should the Status Agent efficiently scan `.paw/work/` directory to detect all active work items without performance degradation? What file system patterns indicate "active" vs "abandoned" workflows?

7. What git commands most reliably detect branch divergence from remote (commits ahead/behind, conflicting changes)? How should the system handle detached HEAD state or branches without remote tracking?

8. What is the best UX pattern for command keywords in handoff recommendations? Should they be quoted ('research'), code-formatted (`research`), or plain text (research)? How should multi-word commands be formatted?

9. How can the system detect whether stage prerequisites are met (e.g., ImplementationPlan.md exists and is valid before allowing Implementation)? What validation is sufficient vs. overly strict?

10. What prompt file naming convention minimizes conflicts while remaining intuitive? Should phase-specific prompts use "Implementer-Phase3.prompt.md", "03A-impl-phase3.prompt.md", or another pattern?

11. How should the handoff tool determine which agent to invoke from prompt file frontmatter? What fallback logic should apply if frontmatter is missing or malformed?

12. What GitHub MCP tool methods are available for querying PR status? Can we query multiple PRs in a single call, or must we make individual requests per PR? What rate limiting considerations exist?

### Optional External / Context

1. Are there established UX patterns in VS Code extensions for "workflow wizard" or "guided task completion" that we should align with?

2. What are industry best practices for "agentic workflow orchestration" in AI-assisted development tools? Are there patterns from Cursor, Windsurf, or other AI IDEs we should consider?

3. Are there academic papers or industry research on optimal automation levels in developer workflows that could inform Semi-Auto pause point defaults?

4. What are common failure modes in multi-agent systems that we should proactively guard against (e.g., infinite loops, context explosion, cascade failures)?

