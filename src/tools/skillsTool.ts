import * as vscode from 'vscode';
import { loadSkillCatalog, SkillCatalogEntry } from '../skills/skillLoader';

export function formatSkillCatalogMarkdown(entries: SkillCatalogEntry[]): string {
  if (entries.length === 0) {
    return 'No PAW skills are available.';
  }

  const lines = entries.map(entry => {
    return `- **${entry.name}**: ${entry.description}`;
  });

  return lines.join('\n');
}

export function registerSkillsTool(
  context: vscode.ExtensionContext,
  outputChannel: vscode.OutputChannel
): void {
  const tool = vscode.lm.registerTool<Record<string, never>>(
    'paw_get_skills',
    {
      async prepareInvocation(_options, _token) {
        return {
          invocationMessage: 'Retrieving PAW skills catalog',
          confirmationMessages: {
            title: 'Get PAW Skills Catalog',
            message: new vscode.MarkdownString(
              'This will retrieve the catalog of available PAW skills bundled with the extension.'
            )
          }
        };
      },
      async invoke(_options, token) {
        try {
          if (token.isCancellationRequested) {
            return new vscode.LanguageModelToolResult([
              new vscode.LanguageModelTextPart('Skills catalog retrieval was cancelled.')
            ]);
          }

          const entries = loadSkillCatalog(context.extensionUri);
          const formatted = formatSkillCatalogMarkdown(entries);

          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(formatted)
          ]);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          outputChannel.appendLine(`[ERROR] Failed to load skills catalog: ${message}`);
          return new vscode.LanguageModelToolResult([
            new vscode.LanguageModelTextPart(`Error retrieving skills catalog: ${message}`)
          ]);
        }
      }
    }
  );

  context.subscriptions.push(tool);
}
