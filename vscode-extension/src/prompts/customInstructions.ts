import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents the state of the optional custom instructions file.
 */
export interface CustomInstructions {
  exists: boolean;
  content: string;
  error?: string;
}

const CUSTOM_INSTRUCTIONS_RELATIVE_PATH = path.join(
  '.paw',
  'instructions',
  'init-instructions.md'
);

/**
 * Load custom initialization instructions for the workspace if they exist.
 *
 * @param workspacePath Absolute path to the workspace root.
 * @returns CustomInstructions describing the presence and content of the file.
 */
export function loadCustomInstructions(workspacePath: string): CustomInstructions {
  const absolutePath = path.join(workspacePath, CUSTOM_INSTRUCTIONS_RELATIVE_PATH);

  try {
    if (!fs.existsSync(absolutePath)) {
      return {
        exists: false,
        content: ''
      };
    }

    const fileContent = fs.readFileSync(absolutePath, 'utf-8');
    const trimmedContent = fileContent.trim();

    if (trimmedContent.length === 0) {
      return {
        exists: true,
        content: '',
        error: 'Custom instructions file exists but is empty'
      };
    }

    return {
      exists: true,
      content: trimmedContent
    };
  } catch (error) {
    return {
      exists: true,
      content: '',
      error: `Failed to read custom instructions: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Format the custom instructions content for inclusion in the agent prompt.
 * Returns an empty string when no usable instructions are present.
 *
 * @param instructions Custom instructions metadata and content.
 * @returns Markdown section ready for prompt injection, or empty string.
 */
export function formatCustomInstructions(instructions: CustomInstructions): string {
  if (!instructions.exists || instructions.content.length === 0) {
    return '';
  }

  return `\n## Custom Instructions\n\n` +
    'The following custom instructions have been provided for this workspace:\n\n' +
    '---\n\n' +
    `${instructions.content}\n\n` +
    '---\n\n' +
    '**Follow the custom instructions above in addition to the standard PAW workflow rules.**\n';
}
