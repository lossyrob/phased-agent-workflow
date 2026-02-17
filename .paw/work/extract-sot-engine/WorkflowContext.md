# Workflow Context

## Work Identity
- **Work ID**: extract-sot-engine
- **Title**: Extract Society of Thought (SoT) Engine into paw-sot Skill
- **Issue**: https://github.com/lossyrob/phased-agent-workflow/issues/242
- **Repository**: lossyrob/phased-agent-workflow

## Branch Configuration
- **Base Branch**: main
- **Target Branch**: feature/extract-sot-engine

## Workflow Configuration
- **Mode**: full
- **Strategy**: local
- **Review Policy**: final-pr-only
- **Session Policy**: continuous
- **Planning Docs Review**: enabled

## Agent Review Configuration
- **Final Agent Review**: enabled
- **Final Review Mode**: society-of-thought
- **Final Review Interactive**: smart
- **Final Review Specialists**: adaptive
- **Final Review Interaction Mode**: debate
- **Final Review Specialist Models**: gpt-5.3-codex, gemini-3-pro-preview, claude-opus-4.6

## Planning Review Configuration
- **Planning Review Mode**: multi-model
- **Planning Review Interactive**: smart
- **Planning Review Models**: gpt-5.3-codex, gemini-3-pro-preview, claude-opus-4.6

## Artifact Lifecycle
- **Lifecycle**: commit-and-clean

## Current Stage
- **Stage**: implementation
- **Phase**: 1
