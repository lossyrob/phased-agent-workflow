import * as vscode from 'vscode';

/**
 * Valid PAW agent names that can be targeted for handoff.
 */
export type AgentName =
  | 'PAW-01A Specification'
  | 'PAW-01B Spec Researcher'
  | 'PAW-02A Code Researcher'
  | 'PAW-02B Impl Planner'
  | 'PAW-03A Implementer'
  | 'PAW-03B Impl Reviewer'
  | 'PAW-04 Documenter'
  | 'PAW-05 PR'
  | 'PAW-X Status Update';

/**
 * Parameters for calling a PAW agent.
 */
export interface HandoffParams {
  /** The target agent to invoke */
  target_agent: AgentName;
  /** The normalized Work ID (feature slug) */
  work_id: string;
  /** Optional inline instruction to pass to the target agent */
  inline_instruction?: string;
}

/**
 * Pattern to validate Work ID (feature slug) format.
 * Work IDs must contain only lowercase letters, numbers, and hyphens.
 */
const WORK_ID_PATTERN = /^[a-z0-9-]+$/;

/**
 * Validates Work ID format.
 * 
 * @param workId - Work ID to validate
 * @throws Error if Work ID is invalid
 */
function validateWorkId(workId: string): void {
  if (!workId || workId.trim().length === 0) {
    throw new Error('Work ID cannot be empty');
  }

  if (!WORK_ID_PATTERN.test(workId)) {
    throw new Error(
      `Invalid Work ID format: "${workId}". ` +
      'Work IDs must contain only lowercase letters, numbers, and hyphens.'
    );
  }
}

/**
 * Constructs the prompt message for the target agent.
 * 
 * @param params - Handoff parameters
 * @returns Formatted prompt string
 */
function constructPrompt(params: HandoffParams): string {
  let prompt = `Work ID: ${params.work_id}`;

  if (params.inline_instruction) {
    prompt += `\n\n${params.inline_instruction}`;
  }

  return prompt;
}

/**
 * Invokes a new chat with the target agent.
 * Uses fire-and-forget pattern - cannot wait for agent completion.
 * 
 * @param params - Handoff parameters
 * @param outputChannel - Output channel for logging
 */
async function invokeAgent(
  params: HandoffParams,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  const prompt = constructPrompt(params);

  outputChannel.appendLine(`[INFO] Invoking agent: ${params.target_agent}`);
  outputChannel.appendLine(`[INFO] Work ID: ${params.work_id}`);
  if (params.inline_instruction) {
    outputChannel.appendLine(`[INFO] Inline instruction provided`);
  }

  // Create new chat and open with agent mode
  await vscode.commands.executeCommand('workbench.action.chat.newChat').then(async (value) => {
    outputChannel.appendLine('[INFO] New chat session created: ' + String(value));
    await vscode.commands.executeCommand('workbench.action.chat.open', {
      query: prompt,
      mode: 'agent'
    });
  });
}

/**
 * Registers the PAW handoff tool with the Language Model API.
 * 
 * @param context - Extension context for subscription management
 */
export function registerHandoffTool(context: vscode.ExtensionContext): void {
  const outputChannel = vscode.window.createOutputChannel('PAW Handoff');

  const tool = vscode.lm.registerTool<HandoffParams>(
    'paw_call_agent',
    {
      async prepareInvocation(options, _token) {
        const { target_agent, work_id, inline_instruction } = options.input;

        let message = `This will start a new chat with **${target_agent}** for feature: ${work_id}`;
        if (inline_instruction) {
          message += `\n\nWith instruction: "${inline_instruction}"`;
        }

        return {
          invocationMessage: `Calling ${target_agent} for ${work_id}`,
          confirmationMessages: {
            title: 'Call PAW Agent',
            message: new vscode.MarkdownString(message)
          }
        };
      },
      async invoke(options, token) {
        try {
          // Check for cancellation before starting
          if (token.isCancellationRequested) {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart('Agent handoff was cancelled.')
            ]);
          }

          const params = options.input;

          // Validate Work ID
          validateWorkId(params.work_id);

          // Invoke the target agent
          await invokeAgent(params, outputChannel);

          // Return empty string on success (new chat interrupts conversation)
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart('')
          ]);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          outputChannel.appendLine(`[ERROR] Handoff failed: ${message}`);
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(
              `Error calling agent: ${message}`
            )
          ]);
        }
      }
    }
  );

  context.subscriptions.push(tool);
}
