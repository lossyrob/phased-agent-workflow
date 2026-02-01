import * as fs from 'fs';
import * as path from 'path';

/**
 * Loads component templates from the provided directory.
 *
 * @param componentsDir Absolute path to the components directory (agents/components)
 * @returns Map of component placeholder names to their markdown content
 */
export function loadComponentTemplatesFromDirectory(
  componentsDir: string
): Map<string, string> {
  const components = new Map<string, string>();

  if (!fs.existsSync(componentsDir)) {
    return components;
  }

  const componentFiles = fs.readdirSync(componentsDir);
  for (const file of componentFiles) {
    if (!file.toLowerCase().endsWith('.component.md')) {
      continue;
    }

    const componentPath = path.join(componentsDir, file);
    const componentName = file
      .replace(/\.component\.md$/i, '')
      .replace(/-/g, '_')
      .toUpperCase();

    components.set(componentName, fs.readFileSync(componentPath, 'utf-8'));
  }

  return components;
}

/**
 * Performs {{VARIABLE}} substitution in component content. Currently limited to
 * variables supported by PAW components (e.g., {{AGENT_NAME}}).
 */
function substituteVariables(content: string, variables: Map<string, string>): string {
  let result = content;
  for (const [key, value] of variables.entries()) {
    const placeholder = `{{${key}}}`;
    result = result.split(placeholder).join(value);
  }
  return result;
}

/**
 * Expands component placeholders within an agent template using the provided component map.
 *
 * @param content Raw agent markdown with component placeholders
 * @param agentIdentifier Agent identifier (e.g., 'PAW', 'PAW Review')
 * @param components Map of component names to their markdown content
 * @returns Agent markdown with all known components expanded
 */
export function processAgentTemplate(
  content: string,
  agentIdentifier: string,
  components: Map<string, string>
): string {
  let result = content;

  for (const [componentName, componentContent] of components.entries()) {
    const componentPlaceholder = `{{${componentName}}}`;
    if (!result.includes(componentPlaceholder)) {
      continue;
    }

    const expandedComponent = substituteVariables(
      componentContent,
      new Map<string, string>([['AGENT_NAME', agentIdentifier]])
    );

    result = result.split(componentPlaceholder).join(expandedComponent);
  }

  return result;
}
