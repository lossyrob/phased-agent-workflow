/**
 * Dynamic prompt generation tool for PAW workflows.
 *
 * This module provides on-demand prompt file generation, allowing users to create
 * customizable prompt files only when needed rather than pre-generating all files
 * at initialization. This reduces filesystem noise and enables inline customization.
 *
 * The tool reuses template definitions from createPromptTemplates.ts to maintain
 * consistency with the standard workflow initialization process.
 *
 * @module promptGenerationTool
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  PROMPT_TEMPLATES,
  PromptTemplate,
  generatePromptTemplate,
} from './createPromptTemplates';

/** Pattern for valid Work ID format: lowercase letters, numbers, and hyphens only */
const WORK_ID_PATTERN = /^[a-z0-9-]+$/;

/** Maximum length for generated filename suffix to avoid filesystem issues */
const MAX_SUFFIX_LENGTH = 48;

/** Standard prompt file extension */
const PROMPT_EXTENSION = '.prompt.md';

/** Unique agent names derived from prompt templates */
const UNIQUE_AGENT_NAMES = [...new Set(PROMPT_TEMPLATES.map(template => template.mode))];

/**
 * Parameters for the paw_generate_prompt language model tool.
 */
export interface PromptGenerationParams {
  /** The normalized Work ID (feature slug, e.g., 'auth-system') */
  work_id: string;

  /** The PAW agent that the generated prompt will target */
  agent_name: string;

  /** Optional instructions to append to the prompt (e.g., 'Phase 3', 'focus on auth logging') */
  additional_content?: string;
}

/**
 * Result returned by the generatePromptFile function.
 */
export interface PromptGenerationResult {
  /** Absolute path to the created prompt file */
  file_path: string;

  /** Human-readable success message */
  message: string;
}

/**
 * Get candidate workspace paths for Work ID resolution.
 *
 * Checks for test/override path first (via PAW_WORKSPACE_PATH env var) to
 * support testing without VS Code workspace API. Falls back to VS Code
 * workspace folders when no override is set.
 *
 * @returns Array of workspace folder paths to search
 */
function getWorkspaceCandidates(): string[] {
  const override = process.env.PAW_WORKSPACE_PATH?.trim();
  if (override) {
    return [override];
  }

  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return [];
  }

  return folders.map(folder => folder.uri.fsPath);
}

/**
 * Resolve the prompts directory for a given Work ID.
 *
 * Searches all workspace candidates for one containing the Work ID's .paw/work
 * directory. Creates the prompts subdirectory if it doesn't exist.
 *
 * @param workId - The Work ID (feature slug) to locate
 * @returns Object with featureDir and promptsDir paths
 * @throws Error if no workspace is open or Work ID directory not found
 */
function resolvePromptsDirectory(workId: string): { featureDir: string; promptsDir: string } {
  const candidates = getWorkspaceCandidates();
  if (candidates.length === 0) {
    throw new Error('Unable to determine workspace path: open a workspace before generating prompts.');
  }

  for (const workspacePath of candidates) {
    const featureDir = path.join(workspacePath, '.paw', 'work', workId);
    if (fs.existsSync(featureDir)) {
      const promptsDir = path.join(featureDir, 'prompts');
      fs.mkdirSync(promptsDir, { recursive: true });
      return { featureDir, promptsDir };
    }
  }

  throw new Error(
    `Work ID '${workId}' not found. Expected .paw/work/${workId}/ to exist in one of: ${candidates.join(', ')}`
  );
}

/**
 * Validate and normalize a Work ID parameter.
 *
 * @param value - Raw Work ID value from tool input
 * @returns Trimmed, validated Work ID
 * @throws Error if Work ID is empty or invalid format
 */
function sanitizeWorkId(value: string | undefined): string {
  const workId = value?.trim();
  if (!workId) {
    throw new Error('Invalid work_id: value must be a non-empty string.');
  }

  if (!WORK_ID_PATTERN.test(workId)) {
    throw new Error(
      `Invalid Work ID format: '${workId}'. Work IDs must use lowercase letters, numbers, and hyphens.`
    );
  }

  return workId;
}

/**
 * Validate an agent name against known PAW agents.
 *
 * @param agentName - Raw agent name value from tool input
 * @returns Trimmed, validated agent name
 * @throws Error if agent name is empty or not recognized
 */
function validateAgentName(agentName: string | undefined): string {
  const trimmed = agentName?.trim();
  if (!trimmed) {
    throw new Error('Invalid agent_name: value must be a non-empty string.');
  }

  if (!UNIQUE_AGENT_NAMES.includes(trimmed)) {
    throw new Error(
      `Unknown agent_name '${trimmed}'. Expected one of: ${UNIQUE_AGENT_NAMES.join(', ')}`
    );
  }

  return trimmed;
}

/**
 * Select the appropriate prompt template for an agent.
 *
 * Some agents (like PAW-03A Implementer) have multiple templates for different
 * contexts (standard implementation vs PR review response). This function uses
 * hints from additional_content to select the right variant.
 *
 * @param agentName - Validated agent name
 * @param hint - Optional additional content that may indicate context (e.g., 'PR review')
 * @returns The most appropriate PromptTemplate for the context
 * @throws Error if no template exists for the agent
 */
function chooseTemplate(agentName: string, hint: string | undefined): PromptTemplate {
  const matches = PROMPT_TEMPLATES.filter(template => template.mode === agentName);
  if (matches.length === 0) {
    throw new Error(`No prompt template registered for agent ${agentName}.`);
  }

  if (matches.length === 1 || !hint) {
    return matches[0];
  }

  const loweredHint = hint.toLowerCase();
  const impliesPrReview = loweredHint.includes('pr review') ||
    (loweredHint.includes('pr') && loweredHint.includes('review')) ||
    loweredHint.includes('review comment');

  if (impliesPrReview) {
    const prTemplate = matches.find(template => template.filename.includes('pr-review'));
    if (prTemplate) {
      return prTemplate;
    }
  }

  return matches[0];
}

/**
 * Convert additional content text into a URL-safe filename slug.
 *
 * Transforms input like "Phase 3" into "phase3" for use in filenames.
 * Handles special cases like "phase-N" → "phaseN" for cleaner naming.
 *
 * @param source - Raw additional content text
 * @returns Normalized slug suitable for filename suffix, or empty string
 */
function buildSlug(source: string | undefined): string {
  if (!source) {
    return '';
  }

  const normalized = source
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return '';
  }

  const slug = normalized
    .split(' ')
    .filter(Boolean)
    .slice(0, 6)
    .join('-')
    .replace(/-+/g, '-')
    .replace(/phase-(\d+)/g, 'phase$1')
    .slice(0, MAX_SUFFIX_LENGTH)
    .replace(/^-|-$/g, '');

  return slug;
}

/**
 * Build a dynamic prompt filename with optional context suffix.
 *
 * Appends a slugified version of additional content to the base filename.
 * For example: "03A-implement.prompt.md" + "Phase 3" → "03A-implement-phase3.prompt.md"
 *
 * @param baseFilename - Original template filename (e.g., "03A-implement.prompt.md")
 * @param additionalContent - Optional context to append as suffix
 * @returns Filename with optional suffix before .prompt.md extension
 */
export function buildDynamicPromptFilename(baseFilename: string, additionalContent?: string): string {
  const slug = buildSlug(additionalContent);
  if (!slug) {
    return baseFilename;
  }

  if (!baseFilename.endsWith(PROMPT_EXTENSION)) {
    return `${baseFilename}-${slug}${PROMPT_EXTENSION}`;
  }

  const withoutExtension = baseFilename.slice(0, -PROMPT_EXTENSION.length);
  return `${withoutExtension}-${slug}${PROMPT_EXTENSION}`;
}

/**
 * Generate a customizable prompt file for a PAW agent.
 *
 * This is the core function that creates on-demand prompt files. It:
 * 1. Validates the Work ID and agent name
 * 2. Selects the appropriate template based on agent and context
 * 3. Generates a filename with optional context suffix
 * 4. Writes the prompt file with frontmatter and optional additional context
 *
 * @param params - Generation parameters including work_id, agent_name, and optional additional_content
 * @returns Result with file path and success message
 * @throws Error if validation fails or Work ID directory not found
 */
export async function generatePromptFile(
  params: PromptGenerationParams
): Promise<PromptGenerationResult> {
  const workId = sanitizeWorkId(params.work_id);
  const agentName = validateAgentName(params.agent_name);
  const additionalContent = params.additional_content?.trim();

  const template = chooseTemplate(agentName, additionalContent);
  const { promptsDir } = resolvePromptsDirectory(workId);
  const filename = buildDynamicPromptFilename(template.filename, additionalContent);
  const filePath = path.join(promptsDir, filename);

  let content = generatePromptTemplate(template.mode, template.instruction, workId);
  if (additionalContent) {
    content += `\nAdditional Context:\n${additionalContent}\n`;
  }

  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    file_path: filePath,
    message: `Generated prompt for ${agentName}: ${filePath}`,
  };
}

/**
 * Register the paw_generate_prompt language model tool with VS Code.
 *
 * This tool enables agents to create customizable prompt files on demand,
 * reducing filesystem noise by generating prompts only when customization
 * is needed. The tool is declared in package.json and registered here
 * at extension activation.
 *
 * @param context - Extension context for registering disposable resources
 */
export function registerPromptGenerationTool(context: vscode.ExtensionContext): void {
  const tool = vscode.lm.registerTool<PromptGenerationParams>(
    'paw_generate_prompt',
    {
      async prepareInvocation(options) {
        const { work_id, agent_name } = options.input;
        return {
          invocationMessage: `Generating prompt for ${agent_name} (Work ID: ${work_id})`,
          confirmationMessages: {
            title: 'Generate PAW Prompt',
            message: new vscode.MarkdownString(
              `This will create a customizable prompt file in:\n\n` +
              `\`.paw/work/${work_id}/prompts/\``
            )
          }
        };
      },
      async invoke(options) {
        try {
          const result = await generatePromptFile(options.input);
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
              `${result.message}\n\nEdit the file if needed, then run it from the prompts directory.`
            )
          ]);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(`Failed to generate prompt: ${message}`)
          ]);
        }
      }
    }
  );

  context.subscriptions.push(tool);
}
