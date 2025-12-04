NOTE: Move this into .paw/work/<work_id>/context/handoff-feedback.md once the PAW work is initialized.

Feedback from a user about recent handoff improvements:

---
In local review mode, in a situation where the impl review agent was getting feedback, it did not successfully hand off to the implementater agent. It appears that the handoff commands can confuse the model if they contain additional instructions. When asked about why the model did this, it had the following reply:

```
You're right to call this out. Let me analyze my behavior against my prompt instructions.
 
## What I Did Wrong
 
When you provided `feedback: check for the need for clarifying comments...`, I should have:
1. Recognized this as a **feedback command for local strategy**
2. Handed off to **PAW-03A Implementer** with your feedback as an inline instruction
 
Instead, I made the change myself (added the clarifying comment) and committed it directly.
 
## Why I Made This Mistake
 
Looking at my prompt, the relevant section says:
 
> **Providing Local Feedback** (local strategy only):
> When using local strategy without PRs, the user provides feedback directly:
> - `feedback: <user's feedback>` - Hand off to PAW-03A Implementer with feedback as inline instruction
> - Example: User says `feedback: add error handling for edge cases` → call `paw_call_agent` with `target_agent: 'PAW-03A Implementer'`, `inline_instruction: 'Address feedback: add error handling for edge cases'`
 
This is clear. So why did I not follow it?
 
### Root Cause Analysis
 
1. **Role confusion**: My prompt says my role is "Maintainability (Making Changes Clear and Reviewable)" and explicitly includes "Generate docstrings and code comments" as my responsibility. The feedback was about adding comments, which I interpreted as within my scope.
 
2. **Ambiguity in "small refactors" guidance**: My prompt says:
> - For **small refactors** (removing a parameter, extracting duplicate utility to shared location): Make the change yourself and commit it
 
   I rationalized adding a comment as a "small refactor" / documentation polish, which my prompt says I can do myself.
 
3. **Missing explicit handoff trigger recognition**: My prompt's handoff section is under "Providing Local Feedback" but the command parsing isn't emphasized enough. I should have recognized `feedback:` as a **command keyword** that triggers a handoff, not as a suggestion within my review scope.
 
## Suggested Prompt Improvements
 
### 1. Add explicit command recognition section at the top of handoff instructions
 
```markdown
### Command Recognition (CRITICAL)
 
When the user's message starts with one of these patterns, it is a COMMAND that triggers a handoff—do NOT perform the work yourself:
 
- `feedback: <text>` → Hand off to PAW-03A Implementer (local strategy)
- `address comments` → Hand off to appropriate agent for PR comments
- `implement`, `review`, `docs`, `pr` → Hand off per Command Mapping table
 
Even if the feedback seems within your documentation/polish scope, the `feedback:` prefix means the user wants the Implementer to address it.
```
 
### 2. Clarify scope boundaries more explicitly
 
```markdown
### What You Do vs What Implementer Does
 
**You (Reviewer) handle:**
- Adding docstrings/comments **during your initial review pass** (before first push)
- Small refactors discovered during review (unused parameters, dead code)
- Verifying Implementer's changes after they address feedback
 
**Implementer handles:**
- All changes requested via `feedback:` command, even documentation changes
- Addressing PR review comments
- Any change requested after your initial review is complete
```
 
### 3. Add a decision gate before making changes
 
```markdown
### Before Making Any Edit (Decision Gate)
 
Ask yourself:
1. Did the user's message start with `feedback:`? → **STOP, hand off to Implementer**
2. Is this my initial review pass, or am I responding to user feedback? 
   - Initial review → I can make documentation/polish changes
   - Responding to feedback → Hand off to Implementer
```
 
---
 
Would you like me to hand off to the Implementer now with your original feedback, or should I proceed differently given we've already made the change?
```

This needs to be improved. The additional instructions around command recognition are important.

---

In addition, the handoff messages always contain a "continue". The instructions say to have continue do what auto mode would do. However, that is not clear to the user - it should be explicit about what "continue" would do.

