import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Parameters for the paw_create_prompt_templates language model tool.
 */
interface CreatePromptTemplatesParams {
  /** The normalized feature slug (e.g., "auth-system") */
  feature_slug: string;
  
  /** Absolute path to the workspace root directory */
  workspace_path: string;
}

/**
 * Result returned by the createPromptTemplates function.
 */
interface CreatePromptTemplatesResult {
  /** Whether all template files were created successfully */
  success: boolean;
  
  /** List of absolute paths to successfully created files */
  files_created: string[];
  
  /** List of error messages encountered during creation */
  errors: string[];
}

/**
 * Template definitions for all 9 PAW prompt files.
 * 
 * Each template includes:
 * - filename: The exact filename to use
 * - mode: The chatmode to invoke (corresponds to .github/chatmodes/*.chatmode.md)
 * - instruction: The action the agent should perform
 */
const PROMPT_TEMPLATES = [
  {
    filename: '01A-spec.prompt.md',
    mode: 'PAW-01A Spec Agent',
    instruction: 'Create spec from'
  },
  {
    filename: '01B-spec-research.prompt.md',
    mode: 'PAW-01B Spec Research Agent',
    instruction: 'Answer research questions from'
  },
  {
    filename: '02A-code-research.prompt.md',
    mode: 'PAW-02A Code Researcher',
    instruction: 'Run code research from'
  },
  {
    filename: '02B-impl-plan.prompt.md',
    mode: 'PAW-02B Impl Planner',
    instruction: 'Create implementation plan from'
  },
  {
    filename: '03A-implement.prompt.md',
    mode: 'PAW-03A Implementer',
    instruction: 'Implement phase from'
  },
  {
    filename: '03B-review.prompt.md',
    mode: 'PAW-03B Impl Reviewer',
    instruction: 'Review implementation from'
  },
  {
    filename: '04-docs.prompt.md',
    mode: 'PAW-04 Documenter Agent',
    instruction: 'Generate documentation from'
  },
  {
    filename: '05-pr.prompt.md',
    mode: 'PAW-05 PR Agent',
    instruction: 'Create final PR from'
  },
  {
    filename: '0X-status.prompt.md',
    mode: 'PAW-0X Status Agent',
    instruction: 'Update status from'
  }
];

/**
 * Generate content for a single prompt template file.
 * 
 * Creates a markdown file with frontmatter specifying the chatmode and a body
 * that references the WorkflowContext.md file for the feature.
 * 
 * @param mode - The chatmode to invoke (e.g., "PAW-01A Spec Agent")
 * @param instruction - The instruction for the agent (e.g., "Create spec from")
 * @param featureSlug - The feature slug to reference in the template body
 * @returns The complete file content with frontmatter and body
 */
function generatePromptTemplate(
  mode: string,
  instruction: string,
  featureSlug: string
): string {
  return `---\nmode: ${mode}\n---\n\n${instruction} .paw/work/${featureSlug}/WorkflowContext.md\n`;
}

/**
 * Create all 9 PAW prompt template files for a work item.
 * 
 * This function is the core implementation of the paw_create_prompt_templates
 * language model tool. It creates the .paw/work/<feature_slug>/prompts/ directory
 * and generates all required prompt template files with correct frontmatter.
 * 
 * The function is designed to be idempotent - it will create the directory if it
 * doesn't exist and overwrite existing files.
 * 
 * @param params - Parameters specifying feature slug and workspace path
 * @returns Result object with success status, created files, and any errors
 */
export async function createPromptTemplates(
  params: CreatePromptTemplatesParams
): Promise<CreatePromptTemplatesResult> {
  const { feature_slug, workspace_path } = params;
  const filesCreated: string[] = [];
  const errors: string[] = [];

  try {
    const promptsDir = path.join(
      workspace_path,
      '.paw',
      'work',
      feature_slug,
      'prompts'
    );

    if (!fs.existsSync(promptsDir)) {
      fs.mkdirSync(promptsDir, { recursive: true });
    }

    for (const template of PROMPT_TEMPLATES) {
      const filePath = path.join(promptsDir, template.filename);
      const content = generatePromptTemplate(
        template.mode,
        template.instruction,
        feature_slug
      );

      try {
        fs.writeFileSync(filePath, content, 'utf-8');
        filesCreated.push(filePath);
      } catch (fileError) {
        const message = fileError instanceof Error ? fileError.message : String(fileError);
        errors.push(`Failed to create ${template.filename}: ${message}`);
      }
    }

    return {
      success: errors.length === 0,
      files_created: filesCreated,
      errors
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      files_created: filesCreated,
      errors: [`Failed to create prompt templates: ${message}`]
    };
  }
}

/**
 * Register the paw_create_prompt_templates language model tool with VS Code.
 * 
 * This tool is made available to GitHub Copilot agents via the Language Model API.
 * When an agent calls this tool, it receives parameters (feature_slug and workspace_path)
 * and returns a result indicating success or failure along with details of created files.
 * 
 * The tool is declared in package.json under contributes.languageModelTools and
 * registered here at extension activation time.
 * 
 * Tool Design Pattern:
 * - Extension provides procedural tools for reliable operations (file creation)
 * - Agent provides decision-making logic (slug validation, error handling)
 * - This separation keeps extension code minimal while leveraging agent intelligence
 * 
 * @param context - Extension context for registering disposable resources
 */
export function registerPromptTemplatesTool(
  context: vscode.ExtensionContext
): void {
  const tool = vscode.lm.registerTool<CreatePromptTemplatesParams>(
    'paw_create_prompt_templates',
    {
      async prepareInvocation(options, _token) {
        const { feature_slug } = options.input;
        return {
          invocationMessage: `Creating 9 PAW prompt template files for feature: ${feature_slug}`,
          confirmationMessages: {
            title: 'Create PAW Prompt Templates',
            message: new vscode.MarkdownString(
              `This will create 9 prompt template files in:\n\n` +
              `\`.paw/work/${feature_slug}/prompts/\`\n\n` +
              `The following files will be created:\n` +
              `- 01A-spec.prompt.md\n` +
              `- 01B-spec-research.prompt.md\n` +
              `- 02A-code-research.prompt.md\n` +
              `- 02B-impl-plan.prompt.md\n` +
              `- 03A-implement.prompt.md\n` +
              `- 03B-review.prompt.md\n` +
              `- 04-docs.prompt.md\n` +
              `- 05-pr.prompt.md\n` +
              `- 0X-status.prompt.md`
            )
          }
        };
      },
      async invoke(options) {
        const result = await createPromptTemplates(options.input);

        if (result.success) {
          const details = result.files_created
            .map(file => `- ${file}`)
            .join('\n');
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
              `Successfully created ${result.files_created.length} prompt template files:\n${details}`
            )
          ]);
        }

        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(
            `Failed to create prompt templates. Errors:\n${result.errors.join('\n')}`
          )
        ]);
      }
    }
  );

  context.subscriptions.push(tool);
}
