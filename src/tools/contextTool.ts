import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Resolves the path to a handoff template file.
 * Checks both compiled (out/prompts) and source (src/prompts) locations
 * to work in both production and development environments.
 * In tests, PAW_EXTENSION_PATH can override this location.
 * 
 * @param templateName - Template filename (e.g., 'handoffManual.template.md')
 * @returns Absolute path to the template file, or empty string if not found
 */
function getHandoffTemplatePath(templateName: string): string {
  // Allow tests to override the extension path
  if (process.env.PAW_EXTENSION_PATH) {
    return path.join(process.env.PAW_EXTENSION_PATH, "prompts", templateName);
  }

  // Check compiled location first (out/prompts/) - for when templates are copied
  const compiledPath = path.join(__dirname, "..", "prompts", templateName);
  if (fs.existsSync(compiledPath)) {
    return compiledPath;
  }

  // Fallback to source location (src/prompts/) - for development and VSIX packages
  // that include src/prompts but not out/prompts templates
  const sourcePath = path.join(
    __dirname,
    "..",
    "..",
    "src",
    "prompts",
    templateName
  );
  if (fs.existsSync(sourcePath)) {
    return sourcePath;
  }

  // Return empty string to signal not found (caller will handle fallback)
  return "";
}

/**
 * Pattern to validate Work ID (feature slug) format.
 * Work IDs must contain only lowercase letters, numbers, and hyphens.
 */
const FEATURE_SLUG_PATTERN = /^[a-z0-9-]+$/;

/**
 * Valid handoff mode values for stage navigation.
 */
export type HandoffMode = "manual" | "semi-auto" | "auto";

/**
 * Workflow type indicating whether this is a standard single-repo or cross-repo workflow.
 */
export type WorkflowType = "implementation" | "cross-repository";

/**
 * Pattern to extract Handoff Mode from WorkflowContext.md content.
 * Matches "Handoff Mode: <mode>" on its own line, case-insensitive.
 */
const HANDOFF_MODE_PATTERN = /^Handoff Mode:\s*(manual|semi-auto|auto)\s*$/im;

/**
 * Parameters for retrieving PAW context information.
 */
export interface ContextParams {
  /** The normalized Work ID (also called feature slug, e.g., 'auth-system') */
  feature_slug: string;
  /** The name of the calling agent (e.g., 'PAW-02B Impl Planner') */
  agent_name: string;
}

/**
 * Status and content of a loaded instruction or context file.
 */
export interface InstructionStatus {
  /** Whether the file exists */
  exists: boolean;
  /** The file content (empty string if file doesn't exist or couldn't be read) */
  content: string;
  /** Error message if file read failed (undefined if no error) */
  error?: string;
}

/**
 * Complete context result containing workspace instructions, user instructions,
 * and workflow context metadata.
 */
export interface ContextResult {
  /** Workspace-specific custom instructions from .paw/instructions/ */
  workspace_instructions: InstructionStatus;
  /** User-level custom instructions from ~/.paw/instructions/ */
  user_instructions: InstructionStatus;
  /** Raw WorkflowContext.md or CrossRepoContext.md content */
  workflow_context: InstructionStatus;
  /** Type of workflow: 'implementation' for .paw/work/, 'cross-repository' for .paw/multi-work/ */
  workflow_type: WorkflowType;
}

/**
 * Normalizes file content by converting Windows line endings to Unix format
 * and trimming leading/trailing whitespace.
 *
 * @param content - The file content to normalize
 * @returns Normalized content with consistent line endings
 */
function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, "\n").trim();
}

/**
 * Parses the Handoff Mode from WorkflowContext.md content.
 * Looks for "Handoff Mode: <mode>" line and extracts the mode value.
 *
 * @param workflowContent - Raw WorkflowContext.md content
 * @returns Parsed handoff mode or 'manual' as default
 */
export function parseHandoffMode(workflowContent: string): HandoffMode {
  if (!workflowContent) {
    return "manual";
  }

  const match = workflowContent.match(HANDOFF_MODE_PATTERN);
  if (match) {
    return match[1].toLowerCase() as HandoffMode;
  }

  return "manual";
}

/**
 * Template filename for each handoff mode.
 */
const HANDOFF_TEMPLATE_FILES: Record<HandoffMode, string> = {
  manual: "handoffManual.template.md",
  "semi-auto": "handoffSemiAuto.template.md",
  auto: "handoffAuto.template.md",
};

/**
 * Returns mode-specific handoff behavior instructions by loading from template files.
 * These instructions tell the agent exactly how to behave when completing work,
 * based on the handoff mode configured in WorkflowContext.md.
 *
 * @param mode - The handoff mode (manual, semi-auto, or auto)
 * @returns Markdown instructions for the agent
 */
export function getHandoffInstructions(mode: HandoffMode): string {
  const templateFile =
    HANDOFF_TEMPLATE_FILES[mode] || HANDOFF_TEMPLATE_FILES["manual"];
  const templatePath = getHandoffTemplatePath(templateFile);

  try {
    if (templatePath && fs.existsSync(templatePath)) {
      return normalizeContent(fs.readFileSync(templatePath, "utf-8"));
    }
  } catch (error) {
    // Fall through to fallback
  }

  // Fallback if template file is missing or unreadable
  return `## Your Handoff Behavior (${
    mode.charAt(0).toUpperCase() + mode.slice(1)
  } Mode)

Handoff instructions template not found. Please check your PAW installation.

Default behavior: Present "Next Steps" and wait for user command.`;
}

/**
 * Loads WorkflowContext.md file content from the specified path.
 * Returns raw file content without parsing.
 * 
 * @param filePath - Absolute path to the WorkflowContext.md file
 * @returns InstructionStatus with file content or error information
 */
export function loadWorkflowContext(filePath: string): InstructionStatus {
  try {
    if (!fs.existsSync(filePath)) {
      return { exists: false, content: '' };
    }

    const fileContent = normalizeContent(fs.readFileSync(filePath, 'utf-8'));
    return { exists: true, content: fileContent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exists: true,
      content: '',
      error: `Failed to read WorkflowContext.md: ${message}`,
    };
  }
}

/**
 * Loads custom instruction file for a specific agent from the given directory.
 * Looks for a file named `<agentName>-instructions.md`.
 * 
 * @param directory - Directory path containing instruction files (e.g., .paw/instructions/)
 * @param agentName - Name of the agent (e.g., 'PAW-02B Impl Planner')
 * @returns InstructionStatus with file content or error information
 */
export function loadCustomInstructions(directory: string, agentName: string): InstructionStatus {
  try {
    if (!fs.existsSync(directory)) {
      return { exists: false, content: '' };
    }

    const filePath = path.join(directory, `${agentName}-instructions.md`);
    if (!fs.existsSync(filePath)) {
      return { exists: false, content: '' };
    }

    const fileContent = normalizeContent(fs.readFileSync(filePath, 'utf-8'));
    return { exists: true, content: fileContent };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      exists: true,
      content: '',
      error: `Failed to read custom instructions: ${message}`,
    };
  }
}

/**
 * Result from resolving a workspace path for a Work ID.
 */
interface ResolvedWorkspacePath {
  /** Absolute path to the workspace folder containing the Work ID */
  workspacePath: string;
  /** Absolute path to the feature directory (.paw/work/ or .paw/multi-work/) */
  featureDir: string;
  /** Type of workflow determined by which directory structure was found */
  workflowType: WorkflowType;
  /** Name of the context file to load (WorkflowContext.md or CrossRepoContext.md) */
  contextFileName: string;
}

/**
 * Resolves the workspace path for a given Work ID (feature slug).
 * Searches all workspace folders for one containing .paw/work/<featureSlug>
 * (standard workflows) or .paw/multi-work/<featureSlug> (cross-repository workflows).
 * 
 * Standard workflows (.paw/work/) are checked first, then cross-repository workflows.
 * 
 * @param featureSlug - The Work ID (feature slug) to search for
 * @returns Workspace folder path, feature directory path, workflow type, and context file name
 * @throws Error if no workspace is open or Work ID directory doesn't exist
 */
function getWorkspaceFolderPaths(): string[] {
  const paths: string[] = [];

  // Check for test/override path first to avoid VS Code API calls in test environments
  const override = process.env.PAW_WORKSPACE_PATH?.trim();
  if (override) {
    paths.push(override);
  }

  // Only access VS Code workspace API if no override is set
  // This prevents hanging in test environments where workspace API may not be fully initialized
  if (paths.length === 0) {
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      paths.push(...folders.map(folder => folder.uri.fsPath));
    }
  }

  return paths;
}

function resolveWorkspacePath(featureSlug: string): ResolvedWorkspacePath {
  const folderPaths = getWorkspaceFolderPaths();
  if (folderPaths.length === 0) {
    throw new Error('Unable to determine workspace path: no workspace folder is currently open.');
  }

  // Search for workspace containing the Work ID - check standard workflows first
  for (const folderPath of folderPaths) {
    const standardFeatureDir = path.join(folderPath, '.paw', 'work', featureSlug);
    if (fs.existsSync(standardFeatureDir)) {
      return {
        workspacePath: folderPath,
        featureDir: standardFeatureDir,
        workflowType: 'implementation',
        contextFileName: 'WorkflowContext.md',
      };
    }
  }

  // Check cross-repository workflows (.paw/multi-work/)
  for (const folderPath of folderPaths) {
    const crossRepoFeatureDir = path.join(folderPath, '.paw', 'multi-work', featureSlug);
    if (fs.existsSync(crossRepoFeatureDir)) {
      return {
        workspacePath: folderPath,
        featureDir: crossRepoFeatureDir,
        workflowType: 'cross-repository',
        contextFileName: 'CrossRepoContext.md',
      };
    }
  }

  // Work ID directory not found in any workspace
  const workspacePaths = folderPaths.join(', ');
  throw new Error(
    `Work ID '${featureSlug}' not found in any workspace. ` +
    `Expected directory .paw/work/${featureSlug}/ or .paw/multi-work/${featureSlug}/ to exist in one of: ${workspacePaths}. ` +
    `Please verify the Work ID is correct.`
  );
}

/**
 * Validates and normalizes context parameters.
 * 
 * @param params - Parameters to validate
 * @returns Validated and trimmed Work ID and agent name
 * @throws Error if Work ID format is invalid or agent name is empty
 */
function validateParams(params: ContextParams): { featureSlug: string; agentName: string } {
  const featureSlug = params.feature_slug?.trim();
  if (!featureSlug) {
    throw new Error('Invalid feature_slug: value must be a non-empty string.');
  }

  // Basic format validation to prevent path traversal and clearly invalid inputs
  // The primary validation (existence check) happens in resolveWorkspacePath
  if (!FEATURE_SLUG_PATTERN.test(featureSlug)) {
    throw new Error(
      `Invalid Work ID format: '${featureSlug}'. ` +
      `Work IDs must contain only lowercase letters, numbers, and hyphens.`
    );
  }

  const agentName = params.agent_name?.trim();
  if (!agentName) {
    throw new Error('Invalid agent_name: value must be a non-empty string.');
  }

  return { featureSlug, agentName };
}

/**
 * Retrieves complete PAW context including workspace instructions, user instructions,
 * and workflow metadata for a specific work item and agent.
 * 
 * This function:
 * 1. Validates the Work ID (feature slug) format and agent name
 * 2. Verifies the Work ID directory exists (.paw/work/<work-id>/ or .paw/multi-work/<work-id>/)
 * 3. Loads workspace-specific custom instructions from .paw/instructions/
 * 4. Loads user-level custom instructions from ~/.paw/instructions/
 * 5. Loads raw context file (WorkflowContext.md or CrossRepoContext.md)
 * 
 * Standard workflows are searched first (.paw/work/), then cross-repository workflows
 * (.paw/multi-work/). The workflow type is determined by which directory exists.
 * 
 * Missing instruction files are handled gracefully and returned with exists=false.
 * However, if the Work ID directory itself doesn't exist, an error is thrown
 * immediately to allow the agent to correct the Work ID and retry.
 * 
 * @param params - Context parameters with feature_slug (Work ID) and agent_name
 * @returns Promise resolving to ContextResult with all loaded content
 * @throws Error if Work ID format is invalid, Work ID directory doesn't exist,
 *         agent name is empty, or no workspace is open
 */
export async function getContext(params: ContextParams): Promise<ContextResult> {
  const { featureSlug, agentName } = validateParams(params);

  // Validate that Work ID directory exists - throws error if not found
  // Checks .paw/work/ first (standard), then .paw/multi-work/ (cross-repository)
  const { workspacePath, featureDir, workflowType, contextFileName } = resolveWorkspacePath(featureSlug);

  const workspaceInstructionsDir = path.join(workspacePath, '.paw', 'instructions');
  const userInstructionsDir = path.join(os.homedir(), '.paw', 'instructions');
  const workflowContextPath = path.join(featureDir, contextFileName);

  const workspaceInstructions = loadCustomInstructions(workspaceInstructionsDir, agentName);
  const userInstructions = loadCustomInstructions(userInstructionsDir, agentName);
  const workflowContext = loadWorkflowContext(workflowContextPath);

  return {
    workspace_instructions: workspaceInstructions,
    user_instructions: userInstructions,
    workflow_context: workflowContext,
    workflow_type: workflowType,
  };
}

/**
 * Formats an instruction section with a distinct XML-style tag wrapper to avoid
 * ambiguity with the content's own Markdown structure.
 * 
 * @param tagName - Wrapper tag name (e.g., 'workspace_instructions')
 * @param status - Instruction status containing content and optional error
 * @returns Tagged section or an empty string when no content exists
 */
function formatInstructionSection(tagName: string, status: InstructionStatus): string {
  if (!status.content && !status.error) {
    return '';
  }

  const parts: string[] = [`<${tagName}>`];

  if (status.content) {
    parts.push(status.content);
  }

  if (status.error) {
    parts.push(`<warning>${status.error}</warning>`);
  }

  parts.push(`</${tagName}>`);
  return parts.join('\n');
}

/**
 * Formats a complete context result as a natural language Markdown response
 * suitable for agent consumption.
 * 
 * The formatted response is purely structural data:
 * - Workflow type wrapped in `<workflow_type>` (implementation or cross-repository)
 * - Workspace custom instructions wrapped in `<workspace_instructions>`
 * - User custom instructions wrapped in `<user_instructions>`
 * - Workflow context wrapped in `<workflow_context>` with code fencing
 * - Mode-specific handoff instructions wrapped in `<handoff_instructions>` (at END for recency)
 * - `<context status="empty" />` when no sections are available
 * 
 * @param result - Context result to format
 * @returns Tagged Markdown text ready for agent consumption
 */
export function formatContextResponse(result: ContextResult): string {
  // Check if any actual context exists before building response
  const hasWorkspaceContent = result.workspace_instructions.content || result.workspace_instructions.error;
  const hasUserContent = result.user_instructions.content || result.user_instructions.error;
  const hasWorkflowContent = result.workflow_context.content || result.workflow_context.error;
  
  // Return early if no actual context sections have content
  if (!hasWorkspaceContent && !hasUserContent && !hasWorkflowContent) {
    return '<context status="empty" />';
  }

  const sections: string[] = [];

  // Add workflow type at the beginning for agent awareness
  sections.push(`<workflow_type>${result.workflow_type}</workflow_type>`);

  const workspaceSection = formatInstructionSection('workspace_instructions', result.workspace_instructions);
  if (workspaceSection) {
    sections.push(workspaceSection);
  }

  const userSection = formatInstructionSection('user_instructions', result.user_instructions);
  if (userSection) {
    sections.push(userSection);
  }

  if (hasWorkflowContent) {
    const workflowParts: string[] = ['<workflow_context>'];
    if (result.workflow_context.content) {
      workflowParts.push('```markdown');
      workflowParts.push(result.workflow_context.content);
      workflowParts.push('```');
    }
    if (result.workflow_context.error) {
      workflowParts.push(`<warning>${result.workflow_context.error}</warning>`);
    }
    workflowParts.push('</workflow_context>');
    sections.push(workflowParts.join('\n'));
  }

  // Parse handoff mode and add instructions at END for recency bias
  const handoffMode = parseHandoffMode(result.workflow_context.content || '');
  const handoffInstructions = getHandoffInstructions(handoffMode);
  sections.push(`<handoff_instructions>\n${handoffInstructions}\n</handoff_instructions>`);

  return sections.join('\n\n');
}

/**
 * Registers the PAW context tool with VS Code's Language Model Tool API.
 * This enables agents to retrieve workspace-specific custom instructions,
 * user-level custom instructions, and workflow context at runtime.
 * 
 * @param context - VS Code extension context for managing subscriptions
 */
export function registerContextTool(context: vscode.ExtensionContext): void {
  const tool = vscode.lm.registerTool<ContextParams>(
    'paw_get_context',
    {
      async prepareInvocation(options, _token) {
        const { feature_slug, agent_name } = options.input;
        return {
          invocationMessage: `Retrieving PAW context for feature: ${feature_slug} (agent: ${agent_name})`,
          confirmationMessages: {
            title: 'Get PAW Context',
            message: new vscode.MarkdownString(
              `This will retrieve custom instructions and workflow context for:\n\n` +
              `- **Feature**: ${feature_slug}\n` +
              `- **Agent**: ${agent_name}`
            )
          }
        };
      },
      async invoke(options, token) {
        try {
          // Check for cancellation before starting
          if (token.isCancellationRequested) {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart('Context retrieval was cancelled.')
            ]);
          }

          const result = await getContext(options.input);

          // Check for cancellation after expensive operations
          if (token.isCancellationRequested) {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart('Context retrieval was cancelled.')
            ]);
          }

          const formattedResponse = formatContextResponse(result);
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(formattedResponse)
          ]);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
              `Error retrieving PAW context: ${message}`
            )
          ]);
        }
      }
    }
  );

  context.subscriptions.push(tool);
}
