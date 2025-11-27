/**
 * Dynamic prompt generation tool for PAW workflows.
 *
 * This module provides on-demand prompt file generation, allowing users to create
 * customizable prompt files only when needed rather than pre-generating all files
 * at initialization. This reduces filesystem noise and enables inline customization.
 *
 * Architecture Philosophy: The agent does the decision-making (determining which
 * template to use, what filename to generate), while this tool provides the
 * procedural operation of writing the file. The tool validates inputs but doesn't
 * make choices about template selection or filename derivation.
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
  generatePromptTemplate,
} from './createPromptTemplates';

/** Pattern for valid Work ID format: lowercase letters, numbers, and hyphens only */
const WORK_ID_PATTERN = /^[a-z0-9-]+$/;

/** Pattern for valid prompt filename format */
const FILENAME_PATTERN = /^[\w-]+\.prompt\.md$/;

/**
 * Map of template keys to their definitions.
 * Template keys are the base filename without extension (e.g., '03A-implement').
 * Agents use these keys to specify exactly which template variant they want.
 */
export const TEMPLATE_KEY_MAP = new Map(
  PROMPT_TEMPLATES.map(template => {
    const key = template.filename.replace('.prompt.md', '');
    return [key, template];
  })
);

/** List of valid template keys for validation and documentation */
export const VALID_TEMPLATE_KEYS = Array.from(TEMPLATE_KEY_MAP.keys());

/**
 * Parameters for the paw_generate_prompt language model tool.
 *
 * The agent is responsible for determining the appropriate template_key and filename
 * based on user requests. This follows the PAW architecture philosophy where agents
 * provide decision-making logic and tools provide procedural operations.
 */
export interface PromptGenerationParams {
  /** The normalized Work ID (feature slug, e.g., 'auth-system') */
  work_id: string;

  /**
   * The template key identifying which prompt template to use.
   * This is the base filename without .prompt.md extension.
   * Examples: '01A-spec', '03A-implement', '03C-pr-review'
   *
   * The agent determines this based on user intent:
   * - "generate prompt for implementer" → '03A-implement'
   * - "generate prompt for PR review" → '03C-pr-review'
   * - "generate prompt for planning" → '02B-impl-plan'
   */
  template_key: string;

  /**
   * The exact filename to use for the generated prompt file.
   * Must end with .prompt.md extension.
   *
   * The agent determines this based on context:
   * - Standard prompts: use template filename (e.g., '03A-implement.prompt.md')
   * - Phase-specific: append phase (e.g., '03A-implement-phase3.prompt.md')
   * - Custom context: descriptive suffix (e.g., '03A-implement-auth-logging.prompt.md')
   */
  filename: string;

  /** Optional instructions to append to the prompt (e.g., 'Focus on Phase 3', 'add rate limiting') */
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
 * Validate a template key against known PAW templates.
 *
 * Template keys are the base filenames without .prompt.md extension.
 * The agent is responsible for choosing the correct template key based on user intent.
 *
 * @param templateKey - Raw template key value from tool input
 * @returns Trimmed, validated template key
 * @throws Error if template key is empty or not recognized
 */
function validateTemplateKey(templateKey: string | undefined): string {
  const trimmed = templateKey?.trim();
  if (!trimmed) {
    throw new Error('Invalid template_key: value must be a non-empty string.');
  }

  if (!TEMPLATE_KEY_MAP.has(trimmed)) {
    throw new Error(
      `Unknown template_key '${trimmed}'. Expected one of: ${VALID_TEMPLATE_KEYS.join(', ')}`
    );
  }

  return trimmed;
}

/**
 * Validate a filename for prompt file creation.
 *
 * The agent is responsible for generating appropriate filenames based on context.
 * This function validates the filename format but doesn't derive or modify it.
 *
 * @param filename - Raw filename value from tool input
 * @returns Trimmed, validated filename
 * @throws Error if filename is empty or invalid format
 */
function validateFilename(filename: string | undefined): string {
  const trimmed = filename?.trim();
  if (!trimmed) {
    throw new Error('Invalid filename: value must be a non-empty string.');
  }

  if (!FILENAME_PATTERN.test(trimmed)) {
    throw new Error(
      `Invalid filename format: '${trimmed}'. Filename must match pattern: alphanumeric, hyphens, underscores, ending with .prompt.md`
    );
  }

  return trimmed;
}

/**
 * Generate a customizable prompt file for a PAW agent.
 *
 * This is the core function that creates on-demand prompt files. It:
 * 1. Validates the Work ID, template key, and filename
 * 2. Looks up the template by key
 * 3. Writes the prompt file with frontmatter and optional additional context
 *
 * Architecture: The agent determines which template to use and what filename
 * to generate. This function simply validates and executes the write operation.
 *
 * @param params - Generation parameters including work_id, template_key, filename, and optional additional_content
 * @returns Result with file path and success message
 * @throws Error if validation fails or Work ID directory not found
 */
export async function generatePromptFile(
  params: PromptGenerationParams
): Promise<PromptGenerationResult> {
  const workId = sanitizeWorkId(params.work_id);
  const templateKey = validateTemplateKey(params.template_key);
  const filename = validateFilename(params.filename);
  const additionalContent = params.additional_content?.trim();

  const template = TEMPLATE_KEY_MAP.get(templateKey)!;
  const { promptsDir } = resolvePromptsDirectory(workId);
  const filePath = path.join(promptsDir, filename);

  let content = generatePromptTemplate(template.mode, template.instruction, workId);
  if (additionalContent) {
    content += `\nAdditional Context:\n${additionalContent}\n`;
  }

  fs.writeFileSync(filePath, content, 'utf-8');

  return {
    file_path: filePath,
    message: `Generated prompt for ${template.mode}: ${filePath}`,
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
 * Architecture Philosophy: The agent determines which template to use and
 * what filename to generate based on user intent. This tool validates
 * the parameters and executes the file write operation.
 *
 * @param context - Extension context for registering disposable resources
 */
export function registerPromptGenerationTool(context: vscode.ExtensionContext): void {
  const tool = vscode.lm.registerTool<PromptGenerationParams>(
    'paw_generate_prompt',
    {
      async prepareInvocation(options) {
        const { work_id, template_key, filename } = options.input;
        return {
          invocationMessage: `Generating prompt '${filename}' using template '${template_key}' (Work ID: ${work_id})`,
          confirmationMessages: {
            title: 'Generate PAW Prompt',
            message: new vscode.MarkdownString(
              `This will create a customizable prompt file:\n\n` +
              `\`.paw/work/${work_id}/prompts/${filename}\``
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
