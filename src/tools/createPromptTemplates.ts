import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Workflow stages that can be included in a PAW workflow.
 * 
 * Each stage corresponds to one or more prompt template files:
 * - Spec: 01A-spec.prompt.md
 * - CodeResearch: 02A-code-research.prompt.md
 * - Plan: 02B-impl-plan.prompt.md
 * - Implementation: 03A-implement.prompt.md, 03B-review.prompt.md
 * - PRReviewResponse: 03C-pr-review.prompt.md, 03D-review-pr-review.prompt.md
 * - Documentation: 04-docs.prompt.md
 * - FinalPR: 05-pr.prompt.md
 * - Status: 0X-status.prompt.md
 */
export enum WorkflowStage {
  Spec = 'spec',
  CodeResearch = 'code-research',
  Plan = 'plan',
  Implementation = 'implementation',
  ImplementationReview = 'implementation-review',
  PRReviewResponse = 'pr-review-response',
  Documentation = 'documentation',
  FinalPR = 'final-pr',
  Status = 'status'
}

/**
 * Parameters for the paw_create_prompt_templates language model tool.
 */
interface CreatePromptTemplatesParams {
  /** The normalized work ID (also called feature slug (e.g., "auth-system") */
  feature_slug: string;
  
  /** Absolute path to the workspace root directory */
  workspace_path: string;
  
  /** 
   * Optional workflow mode selection ('full', 'minimal', or 'custom').
   * - full: All stages included
   * - minimal: Core stages only (code-research, plan, implementation, implementation-review, final-pr, status)
   * - custom: Uses explicit stages array or falls back to minimal
   * - undefined: Defaults to all stages (full mode default)
   */
  workflow_mode?: string;
  
  /**
   * Optional explicit list of stages to include.
   * When provided, this overrides workflow_mode stage determination.
   * Used primarily for custom workflow modes.
   */
  stages?: WorkflowStage[];
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
 * Template definition for a single prompt file.
 */
interface PromptTemplate {
  /** The exact filename to use (e.g., "01A-spec.prompt.md") */
  filename: string;
  
  /** The agent to invoke (e.g., "PAW-01A Specification") */
  mode: string;
  
  /** The instruction for the agent (e.g., "Create specification for this work item.") */
  instruction: string;
  
  /** The workflow stage this template belongs to */
  stage: WorkflowStage;
}

/**
 * Template definitions for all PAW prompt files.
 * 
 * Each template includes:
 * - filename: The exact filename to use
 * - mode: The agent to invoke (corresponds to agents/*.agent.md)
 * - instruction: The action the agent should perform
 * - stage: The workflow stage this template belongs to
 */
const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    filename: "01A-spec.prompt.md",
    mode: "PAW-01A Specification",
    instruction: "Create specification for this work item.",
    stage: WorkflowStage.Spec,
  },
  {
    filename: "02A-code-research.prompt.md",
    mode: "PAW-02A Code Researcher",
    instruction: "Research the codebase for this work item.",
    stage: WorkflowStage.CodeResearch,
  },
  {
    filename: "02B-impl-plan.prompt.md",
    mode: "PAW-02B Impl Planner",
    instruction: "Create implementation plan for this work item.",
    stage: WorkflowStage.Plan,
  },
  {
    filename: "03A-implement.prompt.md",
    mode: "PAW-03A Implementer",
    instruction: "Implement the next phase for this work item.",
    stage: WorkflowStage.Implementation,
  },
  {
    filename: "03B-review.prompt.md",
    mode: "PAW-03B Impl Reviewer",
    instruction: "Review the implementation for this work item.",
    stage: WorkflowStage.ImplementationReview,
  },
  {
    filename: "03C-pr-review.prompt.md",
    mode: "PAW-03A Implementer",
    instruction: "Address PR review comments for this work item.",
    stage: WorkflowStage.PRReviewResponse,
  },
  {
    filename: "03D-review-pr-review.prompt.md",
    mode: "PAW-03B Impl Reviewer",
    instruction: "Verify PR comment responses for this work item.",
    stage: WorkflowStage.PRReviewResponse,
  },
  {
    filename: "04-docs.prompt.md",
    mode: "PAW-04 Documenter",
    instruction: "Generate documentation for this work item.",
    stage: WorkflowStage.Documentation,
  },
  {
    filename: "05-pr.prompt.md",
    mode: "PAW-05 PR",
    instruction: "Create final PR for this work item.",
    stage: WorkflowStage.FinalPR,
  },
  {
    filename: "0X-status.prompt.md",
    mode: "PAW-X Status Update",
    instruction: "Update status for this work item.",
    stage: WorkflowStage.Status,
  },
];

/**
 * Determine which workflow stages to include based on workflow mode.
 * 
 * This function maps workflow modes to their corresponding stage arrays:
 * - full: All stages (spec, code-research, plan, implementation, implementation-review, 
 *         pr-review-response, documentation, final-pr, status)
 * - minimal: Core stages only (code-research, plan, implementation, implementation-review, 
 *           final-pr, status) - skips spec and documentation
 * - custom: Uses explicit stages array if provided, otherwise falls back to minimal
 * - undefined: Defaults to all stages (full mode default)
 * 
 * @param workflowMode - The workflow mode ('full', 'minimal', 'custom', or undefined)
 * @param explicitStages - Optional explicit list of stages (used for custom mode)
 * @returns Array of WorkflowStage values to include in the workflow
 */
function determineStagesFromMode(
  workflowMode: string | undefined,
  explicitStages: WorkflowStage[] | undefined
): WorkflowStage[] {
  // If explicit stages provided (custom mode with specific requirements), use them
  if (explicitStages && explicitStages.length > 0) {
    return explicitStages;
  }

  // Handle predefined workflow modes
  switch (workflowMode) {
    case 'minimal':
      // Minimal mode: Skip spec and docs, include only core implementation stages
      return [
        WorkflowStage.CodeResearch,
        WorkflowStage.Plan,
        WorkflowStage.Implementation,
        WorkflowStage.ImplementationReview,
        WorkflowStage.PRReviewResponse,
        WorkflowStage.Documentation,
        WorkflowStage.FinalPR,
        WorkflowStage.Status
      ];

    case 'custom':
      // Custom mode without explicit stages: Fall back to minimal
      return [
        WorkflowStage.CodeResearch,
        WorkflowStage.Plan,
        WorkflowStage.Implementation,
        WorkflowStage.ImplementationReview,
        WorkflowStage.PRReviewResponse,
        WorkflowStage.Documentation,
        WorkflowStage.FinalPR,
        WorkflowStage.Status
      ];

    case 'full':
    case undefined:
    default:
      // Full mode or undefined (defaults to full mode): Include all stages
      return [
        WorkflowStage.Spec,
        WorkflowStage.CodeResearch,
        WorkflowStage.Plan,
        WorkflowStage.Implementation,
        WorkflowStage.ImplementationReview,
        WorkflowStage.PRReviewResponse,
        WorkflowStage.Documentation,
        WorkflowStage.FinalPR,
        WorkflowStage.Status
      ];
  }
}

/**
 * Generate content for a single prompt template file.
 * 
 * Creates a markdown file with frontmatter specifying the agent and a body
 * that provides the work ID (feature slug) parameter for the agent to use with paw_get_context.
 * Agents will call paw_get_context with this work ID to retrieve workspace context,
 * custom instructions, and workflow metadata.
 * 
 * @param mode - The agent to invoke (e.g., "PAW-01A Specification")
 * @param instruction - The instruction for the agent (e.g., "Create specification for this work item.")
 * @param featureSlug - The work ID (feature slug) to pass as a parameter
 * @returns The complete file content with frontmatter and body
 */
function generatePromptTemplate(
  mode: string,
  instruction: string,
  featureSlug: string
): string {
  return `---\nagent: ${mode}\n---\n\n${instruction}\n\nWork ID: ${featureSlug}\n`;
}

/**
 * Create PAW prompt template files for a workflow based on workflow mode.
 * 
 * This function is the core implementation of the paw_create_prompt_templates
 * language model tool. It creates the .paw/work/<feature_slug>/prompts/ directory
 * and generates prompt template files based on the selected workflow mode.
 * 
 * The function:
 * 1. Determines which stages to include based on workflow_mode and stages parameters
 * 2. Filters PROMPT_TEMPLATES to only include templates for those stages
 * 3. Generates and writes the filtered prompt files
 * 
 * The function is designed to be idempotent - it will create the directory if it
 * doesn't exist and overwrite existing files.
 * 
 * @param params - Parameters including work ID (feature slug), workspace path, and optional workflow configuration
 * @returns Result object with success status, created files, and any errors
 */
export async function createPromptTemplates(
  params: CreatePromptTemplatesParams
): Promise<CreatePromptTemplatesResult> {
  const { feature_slug, workspace_path, workflow_mode, stages } = params;
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

    // Determine which stages to include based on workflow mode
    const stagesToInclude = determineStagesFromMode(workflow_mode, stages);

    // Filter templates to only include those matching the determined stages
    const templatesToGenerate = PROMPT_TEMPLATES.filter(template =>
      stagesToInclude.includes(template.stage)
    );

    for (const template of templatesToGenerate) {
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
          invocationMessage: `Creating PAW prompt template files for feature: ${feature_slug}`,
          confirmationMessages: {
            title: 'Create PAW Prompt Templates',
            message: new vscode.MarkdownString(
              `This will create prompt template files as part of the PAW workflow in:\n\n` +
              `\`.paw/work/${feature_slug}/prompts/\``
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
