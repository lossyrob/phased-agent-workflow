import * as fs from 'fs';
import * as path from 'path';

/**
 * Load a template file from either compiled (out/prompts) or source (src/prompts) locations.
 * 
 * This function handles both production (VSIX) and development environments by checking
 * both locations. Templates are bundled via .vscodeignore rule `!src/prompts/*.template.md`.
 * 
 * @param filename - The template filename (e.g., 'workItemInitPrompt.template.md')
 * @returns The template content as a string
 * @throws Error if template not found in either location
 */
export function loadTemplate(filename: string): string {
  // Check compiled location (out/prompts/) - relative to out/utils/
  const compiledPath = path.join(__dirname, '..', 'prompts', filename);
  if (fs.existsSync(compiledPath)) {
    return fs.readFileSync(compiledPath, 'utf-8');
  }

  // Fallback to source location (src/prompts/) - for VSIX packages
  const sourcePath = path.join(__dirname, '..', '..', 'src', 'prompts', filename);
  if (fs.existsSync(sourcePath)) {
    return fs.readFileSync(sourcePath, 'utf-8');
  }

  throw new Error(`Template file not found: ${filename}`);
}
