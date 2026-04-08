/**
 * Environment type for conditional block processing.
 * - 'vscode': VS Code extension with Language Model Tools
 * - 'cli': GitHub Copilot CLI without LMTs
 */
export type TemplateEnvironment = 'vscode' | 'cli';

/**
 * Processes conditional blocks in template content based on target environment.
 *
 * Syntax:
 *   {{#vscode}}...content for VS Code...{{/vscode}}
 *   {{#cli}}...content for CLI...{{/cli}}
 *
 * @param content Template content with conditional blocks
 * @param environment Target environment ('vscode' or 'cli')
 * @returns Content with matching blocks preserved and other blocks removed
 */
export function processConditionalBlocks(
  content: string,
  environment: TemplateEnvironment
): string {
  let result = content;

  const environments: TemplateEnvironment[] = ['vscode', 'cli'];

  for (const env of environments) {
    const openTag = `{{#${env}}}`;
    const closeTag = `{{/${env}}}`;
    const regex = new RegExp(
      `${openTag.replace(/[{}#]/g, '\\$&')}([\\s\\S]*?)${closeTag.replace(/[{}/]/g, '\\$&')}`,
      'g'
    );

    if (env === environment) {
      result = result.replace(regex, '$1');
    } else {
      result = result.replace(regex, '');
    }
  }

  return result;
}
