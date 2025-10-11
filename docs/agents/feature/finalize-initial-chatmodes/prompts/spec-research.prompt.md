# Spec Research Prompt: Finalize Initial Agent Chatmodes

## Research Context

This research aims to understand how the current chatmode files are structured, what patterns exist from the Human Layer-derived agents, and what the PAW specification defines for each agent's role and workflow.

The goal is to gather factual information about:
1. The current state of each chatmode file (completeness, structure, content)
2. The patterns and guidance present in proven chatmodes (Code Researcher, Implementer)
3. The requirements defined in the PAW specification for each agent
4. The gaps between current chatmodes and PAW specification requirements

## Research Questions

### Current Chatmode Analysis

1. **What is the current state of each chatmode file?**
   - Which chatmodes are complete vs incomplete/empty?
   - What is the structure and content of each existing chatmode?
   - Which chatmodes have been tested/proven in production?
   - What formatting conventions are used (frontmatter, sections, code blocks)?

2. **What patterns exist in the proven Human Layer-derived chatmodes?**
   - What specific guidance and instructions appear in the Code Researcher chatmode?
   - What specific guidance and instructions appear in the Implementer chatmode?
   - What "important notes" sections exist and what do they address?
   - What "do not" instructions are present and why?
   - What step-by-step processes are defined?
   - What file reading and research patterns are documented?
   - How do these chatmodes handle edge cases and errors?
   - What communication patterns are used (response formats, status updates)?

3. **What is the chatmode file format and metadata structure?**
   - What YAML frontmatter fields are used?
   - How are sections organized within each chatmode?
   - What markdown formatting conventions are followed?

### PAW Specification Requirements

4. **What does the PAW specification define for each agent?**
   - Spec Agent (PAW-01A): What are its responsibilities, inputs, outputs, and workflow?
   - Spec Research Agent (PAW-01B): What are its responsibilities, inputs, outputs, and workflow?
   - Code Research Agent (PAW-02A): What are its responsibilities, inputs, outputs, and workflow?
   - Implementation Plan Agent (PAW-02B): What are its responsibilities, inputs, outputs, and workflow?
   - Implementation Agent (PAW-03A): What are its responsibilities, inputs, outputs, and workflow?
   - Implementation Review Agent (PAW-03B): What are its responsibilities, inputs, outputs, and workflow?
   - Documentation Agent (PAW-04): What are its responsibilities, inputs, outputs, and workflow?
   - PR Agent (PAW-05): What are its responsibilities, inputs, outputs, and workflow?
   - Status Agent (PAW-X): What are its responsibilities, inputs, outputs, and workflow?

5. **What are the workflow interactions between agents?**
   - How do agents hand off work to each other?
   - What artifacts does each agent consume and produce?
   - What decision points require human interaction?
   - How do agents update and track progress?

### Gap Analysis

6. **What are the gaps between current chatmodes and PAW requirements?**
   - For each chatmode, what PAW-specified functionality is missing?
   - What guidance from proven chatmodes should be propagated to others?
   - What inconsistencies exist between chatmodes and PAW workflows?
   - What new sections or instructions need to be added?

7. **What are the specific issues mentioned in the GitHub Issue?**
   - What problems exist with the current Implementer and Impl Reviewer split?
   - What burden does the Code Researcher's specific code location requirement create?
   - How should Spec Research and Code Research be differentiated?
   - What guidance from Human Layer chatmodes should be preserved?

## Files/Directories Likely Relevant

- `/home/rob/proj/paw/phased-agent-workflow/.github/chatmodes/` - All chatmode files
- `/home/rob/proj/paw/phased-agent-workflow/paw-specification.md` - PAW process specification
- GitHub Issue #1: https://github.com/lossyrob/phased-agent-workflow/issues/1

## Expected Deliverable

A comprehensive `SpecResearch.md` document that:
- Describes the current state of all chatmode files with specific examples
- Catalogs the patterns and guidance from proven chatmodes
- Documents PAW specification requirements for each agent
- Identifies specific gaps and inconsistencies
- Provides evidence from actual file content with line references where helpful
- Stays factual and descriptive without making recommendations
