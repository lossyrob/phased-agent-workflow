# Plan

## Problem

Issue `#273` reports that when users ask what PAW is, the workflow can invent an incorrect acronym expansion and give approximate onboarding guidance. The authoritative project description already exists in the README and installation docs, but `paw-status` does not currently have a grounded “about PAW” response path.

## Approach

Add explicit “what is PAW?” and “how do I get started?” guidance to `paw-status`, route those requests there more clearly from `PAW.agent.md`, and align the most visible docs so they reinforce the same cross-platform description and startup paths.

## Work Items

1. **Authoritative about/onboarding guidance**
   - Update `skills/paw-status/SKILL.md` to answer about/onboarding questions using the exact project name, README terminology, and existing install/start docs.
   - Add a small routing hint in `agents/PAW.agent.md` for “what is PAW?” and similar onboarding questions.

2. **Doc alignment**
   - Update key docs so they do not imply PAW is VS Code-only and so they point users to the right platform-specific getting-started path.

3. **Regression coverage**
   - Add an offline regression test for the canonical PAW description/onboarding guardrails.

## Key Decisions

- Treat README + installation docs as the authoritative source material rather than inventing new product language.
- Use the exact name **Phased Agent Workflow** and never expand PAW into an invented phrase.
- Keep the fix lightweight and prompt/documentation-focused; no runtime code changes are needed.
