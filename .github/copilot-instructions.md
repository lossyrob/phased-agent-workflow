# GitHub Copilot Instructions

This file contains instructions for GitHub Copilot when working with the Phased Agent Workflow (PAW) project.

## Chatmode Development

When creating or modifying chatmode files in `.github/chatmodes/`, be mindful of token count:

- **Keep chatmodes concise and focused** - Avoid unnecessary verbosity
- **Token limits**:
  - **Warning threshold**: 3,500 tokens
  - **Error threshold**: 6,500 tokens
- **Run the linter** before committing:
  ```bash
  ./scripts/lint-chatmode.sh .github/chatmodes/<filename>.chatmode.md
  ```

The linter uses `@dqbd/tiktoken` with the `gpt-4o-mini` model for accurate token counting.

### Tips for Reducing Token Count

- Remove redundant instructions or explanations
- Use clear, concise language
- Break complex instructions into bullet points
- Remove examples that don't add significant value
- Consolidate similar instructions

## General Development

- See `DEVELOPING.md` for complete development setup and guidelines
- Ensure all dependencies are installed with `npm install` before running scripts
- Follow the phased workflow process when implementing features
