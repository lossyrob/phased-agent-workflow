import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  PROMPT_TEMPLATES,
  PromptTemplate,
  generatePromptTemplate,
} from './createPromptTemplates';

const WORK_ID_PATTERN = /^[a-z0-9-]+$/;
const MAX_SUFFIX_LENGTH = 48;
const PROMPT_EXTENSION = '.prompt.md';
const UNIQUE_AGENT_NAMES = [...new Set(PROMPT_TEMPLATES.map(template => template.mode))];

export interface PromptGenerationParams {
  work_id: string;
  agent_name: string;
  additional_content?: string;
}

export interface PromptGenerationResult {
  file_path: string;
  message: string;
}

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
