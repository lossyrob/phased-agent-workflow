import * as vscode from "vscode";

/**
 * Valid PAW agent names that can be targeted for handoff.
 * 
 * - "PAW" is the unified implementation workflow orchestrator
 * - "PAW-Review" is the PR review workflow agent
 */
export type AgentName = "PAW" | "PAW-Review";

/**
 * Parameters for calling a PAW agent.
 */
export interface HandoffParams {
  /** The target agent to invoke */
  target_agent: AgentName;
  /** Workflow work ID or review identifier, depending on the target agent */
  work_id: string;
  /** Optional inline instruction to pass to the target agent (e.g., user feedback, prompt file paths, or agent-to-agent context) */
  inline_instruction?: string;
}

/**
 * Patterns to validate PAW workflow and review resume identifiers.
 */
const WORK_ID_PATTERN = /^[a-z0-9-]+$/;
const REVIEW_ID_PATTERN = /^(?:PR-\d+(?:-[a-z0-9-]+)?|[a-z0-9-]+)$/;

/**
 * Validates the workflow work ID or review identifier for a handoff target.
 */
function getContextLabel(targetAgent: AgentName): string {
  return targetAgent === "PAW Review" ? "Review ID" : "Work ID";
}

function getConfirmationTarget(targetAgent: AgentName): string {
  return targetAgent === "PAW Review" ? "review" : "feature";
}

function validateContextId(targetAgent: AgentName, contextId: string): void {
  if (!contextId || contextId.trim().length === 0) {
    throw new Error(`${getContextLabel(targetAgent)} cannot be empty`);
  }

  if (targetAgent === "PAW Review") {
    if (!REVIEW_ID_PATTERN.test(contextId)) {
      throw new Error(
        `Invalid review identifier format: "${contextId}". ` +
          'Review identifiers must be PR IDs like "PR-123" or "PR-123-my-repo", or lowercase local review slugs.'
      );
    }

    return;
  }

  if (!WORK_ID_PATTERN.test(contextId)) {
    throw new Error(
      `Invalid Work ID format: "${contextId}". ` +
        "Work IDs must contain only lowercase letters, numbers, and hyphens."
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
  let prompt = `${getContextLabel(params.target_agent)}: ${params.work_id}`;
  prompt += `\n\n${buildResumeInstructions(params.target_agent)}`;

  if (params.inline_instruction) {
    prompt += `\n\n${params.inline_instruction}`;
  }

  return prompt;
}

function buildResumeInstructions(targetAgent: AgentName): string {
  if (targetAgent === 'PAW Review') {
    return [
      'Before acting, read the existing review artifacts for this review identifier.',
      'Use `ReviewContext.md` as the durable review-state source when embedded control state is present.',
      'If review control state is absent, continue in legacy best-effort mode and say so explicitly.',
    ].join('\n');
  }

  return [
    'Before acting, read the existing workflow artifacts for this work item.',
    'Use `WorkflowContext.md` as the durable workflow-state source when embedded control state is present.',
    'If workflow control state is absent, continue in legacy best-effort mode and say so explicitly.',
  ].join('\n');
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
  const contextLabel = getContextLabel(params.target_agent);

  outputChannel.appendLine(`[INFO] Invoking agent: ${params.target_agent}`);
  outputChannel.appendLine(`[INFO] ${contextLabel}: ${params.work_id}`);
  if (params.inline_instruction) {
    outputChannel.appendLine(`[INFO] Inline instruction provided`);
  }

  // Create new chat and open with agent mode
  await vscode.commands
    .executeCommand("workbench.action.chat.newChat")
    .then(async (value) => {
      outputChannel.appendLine(
        "[INFO] New chat session created: " + String(value)
      );
      await vscode.commands.executeCommand("workbench.action.chat.open", {
        query: prompt,
        mode: params.target_agent,
      });
    });
}

/**
 * Registers the PAW handoff tool with the Language Model API.
 *
 * @param context - Extension context for subscription management
 * @param outputChannel - Output channel for logging
 */
export function registerHandoffTool(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): void {
  const tool = vscode.lm.registerTool<HandoffParams>("paw_new_session", {
    async prepareInvocation(options, _token) {
      const { target_agent, work_id, inline_instruction } = options.input;
      const contextLabel = getContextLabel(target_agent);
      const contextTarget = getConfirmationTarget(target_agent);

      let message = `This will start a new chat with **${target_agent}** for ${contextTarget}: ${work_id}`;
      if (inline_instruction) {
        message += `\n\nWith instruction: "${inline_instruction}"`;
      }

      return {
        invocationMessage: `Calling ${target_agent} for ${work_id}`,
        confirmationMessages: {
          title: "Call PAW Agent",
          message: new vscode.MarkdownString(
            `${contextLabel}: ${work_id}\n\n${message}`
          ),
        },
      };
    },
    async invoke(options, token) {
      try {
        // Check for cancellation before starting
        if (token.isCancellationRequested) {
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart("Agent handoff was cancelled."),
          ]);
        }

        const params = options.input;

        // Validate work/review identifier
        validateContextId(params.target_agent, params.work_id);

        // Invoke the target agent
        await invokeAgent(params, outputChannel);

        // Return empty string on success (new chat interrupts conversation)
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(""),
        ]);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        outputChannel.appendLine(`[ERROR] Handoff failed: ${message}`);
        return new vscode.LanguageModelToolResult([
          new vscode.LanguageModelTextPart(`Error calling agent: ${message}`),
        ]);
      }
    },
  });

  context.subscriptions.push(tool);
}
