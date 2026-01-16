import * as vscode from 'vscode';
import { loadSkillContent, SkillContent } from '../skills/skillLoader';

export function formatSkillContentResult(result: SkillContent): string {
  if (result.error) {
    return `Error retrieving skill '${result.name}': ${result.error}`;
  }

  return result.content;
}

export function registerSkillTool(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): void {
  const tool = vscode.lm.registerTool<{ skill_name: string }>(
    'paw_get_skill',
    {
      async prepareInvocation(options, _token) {
        const { skill_name } = options.input;
        return {
          invocationMessage: `Retrieving PAW skill: ${skill_name}`,
          confirmationMessages: {
            title: 'Get PAW Skill Content',
            message: new vscode.MarkdownString(
              `This will retrieve the full content for skill **${skill_name}**.`
            )
          }
        };
      },
      async invoke(options, token) {
        try {
          if (token.isCancellationRequested) {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart('Skill retrieval was cancelled.')
            ]);
          }

          const { skill_name } = options.input;
          const result = loadSkillContent(context.extensionUri, skill_name);
          const formatted = formatSkillContentResult(result);

          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(formatted)
          ]);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          outputChannel.appendLine(`[ERROR] Failed to load skill content: ${message}`);
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(`Error retrieving skill: ${message}`)
          ]);
        }
      }
    }
  );

  context.subscriptions.push(tool);
}
