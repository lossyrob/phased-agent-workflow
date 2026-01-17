/**
 * Shared frontmatter utilities for extracting fields from YAML frontmatter.
 */

/**
 * Extracts a specific field from YAML frontmatter.
 * 
 * This is a simplified YAML parser that extracts a single top-level field.
 * It handles quoted and unquoted values, and colons within values.
 * 
 * @param content - The full file content
 * @param fieldName - The name of the field to extract (case-insensitive)
 * @returns The field value, or empty string if not found
 */
export function extractFrontmatterField(content: string, fieldName: string): string {
  // Check if content starts with YAML frontmatter delimiter
  if (!content.startsWith('---')) {
    return '';
  }

  // Find the closing delimiter
  const closingIndex = content.indexOf('\n---', 3);
  if (closingIndex === -1) {
    return '';
  }

  // Extract and parse the frontmatter
  const frontmatter = content.substring(3, closingIndex).trim();
  const lines = frontmatter.split(/\r?\n/);
  const normalizedFieldName = fieldName.toLowerCase();

  for (const line of lines) {
    const [rawKey, ...rawValue] = line.split(':');
    if (!rawKey || rawValue.length === 0) {
      continue;
    }

    const key = rawKey.trim().toLowerCase();
    if (key === normalizedFieldName) {
      // Join value parts (in case value contains colons)
      const value = rawValue.join(':').trim();
      // Remove surrounding quotes if present
      return value.replace(/^['"]|['"]$/g, '');
    }
  }

  return '';
}
