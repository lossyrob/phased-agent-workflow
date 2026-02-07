# Documentation Changes: Integration Testing Framework

## Summary

Added a local-first integration testing framework that programmatically drives Copilot SDK sessions to verify PAW skill behavior. Tests create isolated contexts (SDK session + temp git repo + auto-answerer + tool policy sandbox) and assert on produced artifacts and tool traces.

## Changes

### DEVELOPING.md

Added "Integration Testing" section covering:
- Prerequisites (Copilot CLI auth)
- Install and run commands
- Test architecture overview (harness, fixtures, answerer, tool policy)
- Debug mode and workspace preservation
- Writing new tests guide

### Project Structure

Updated the project structure section to include `tests/integration/`.
