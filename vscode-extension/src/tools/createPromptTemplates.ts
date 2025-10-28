import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

interface CreatePromptTemplatesParams {
  feature_slug: string;
  workspace_path: string;
}

interface CreatePromptTemplatesResult {
  success: boolean;
  files_created: string[];
  errors: string[];
}

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

function generatePromptTemplate(
  mode: string,
  instruction: string,
  featureSlug: string
): string {
  return `---\nmode: ${mode}\n---\n\n${instruction} .paw/work/${featureSlug}/WorkflowContext.md\n`;
}

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

export function registerPromptTemplatesTool(
  context: vscode.ExtensionContext
): void {
  const tool = vscode.lm.registerTool<CreatePromptTemplatesParams>(
    'paw_create_prompt_templates',
    {
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
