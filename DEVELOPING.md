# Developing PAW (Phased Agent Workflow)

This document contains information for developers working on the Phased Agent Workflow project.

## Development Setup

### Prerequisites

- **Node.js** (v16 or higher) - [Download from nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)

### Install Dependencies

Install all required development dependencies:

```bash
npm install
```

## Development Scripts

### Chatmode Linting

Chatmode files should be kept within reasonable token limits to ensure they work effectively with language models.

**Script**: `scripts/lint-chatmode.sh`

**Usage**:
```bash
# Lint all chatmode files in .github/chatmodes/
./scripts/lint-chatmode.sh

# Lint a specific chatmode file
./scripts/lint-chatmode.sh .github/chatmodes/PAW-01A.chatmode.md
```

**Token Thresholds**:
- **Warning**: 3,500 tokens - Consider refactoring to reduce size
- **Error**: 6,500 tokens - Must be reduced before committing

The linter uses `@dqbd/tiktoken` with the `gpt-4o-mini` model to count tokens, which provides accurate token counts for OpenAI models.

**Best Practices**:
- Keep chatmode files focused and concise
- Break up large instructions into multiple sections
- Remove redundant or overly verbose explanations
- Run the linter before committing changes to chatmode files

## Project Structure

- `.github/chatmodes/` - Contains chatmode definitions for different agents
- `scripts/` - Development and utility scripts
