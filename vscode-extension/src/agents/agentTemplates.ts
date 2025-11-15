/**
 * Agent template loading and management
 *
 * This module loads bundled agent templates from extension resources,
 * parses YAML frontmatter, and provides structured agent metadata.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

/**
 * Agent template metadata
 */
export interface AgentTemplate {
	/** Original filename (e.g., "PAW-01A Specification.agent.md") */
	filename: string;
	/** Clean agent name without prefix and extension (e.g., "Specification") */
	name: string;
	/** Description from YAML frontmatter */
	description: string;
	/** Full file content including frontmatter and instructions */
	content: string;
}

/**
 * Extracts clean agent name from filename by removing PAW-##X prefix and .agent.md extension
 *
 * Examples:
 * - "PAW-01A Specification.agent.md" → "Specification"
 * - "PAW-03B Impl Reviewer.agent.md" → "Impl Reviewer"
 *
 * @param filename Original agent filename
 * @returns Clean agent name
 */
function extractAgentName(filename: string): string {
	// Remove .agent.md extension
	let name = filename.replace(/\.agent\.md$/, '');
	
	// Remove PAW-##X prefix (e.g., "PAW-01A ", "PAW-03B ", "PAW-R1A ")
	name = name.replace(/^PAW-[0-9]+[A-Z]?\s+/, '');
	
	return name.trim();
}

/**
 * Parses YAML frontmatter from agent markdown content
 *
 * Expects frontmatter in the format:
 * ---
 * description: 'Agent description'
 * ---
 *
 * @param content Full file content
 * @returns Description from frontmatter, or empty string if not found
 */
function parseFrontmatter(content: string): string {
	// Match YAML frontmatter between --- delimiters
	const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---/;
	const match = content.match(frontmatterRegex);
	
	if (!match) {
		return '';
	}
	
	const frontmatter = match[1];
	
	// Extract description field
	const descriptionRegex = /description:\s*['"](.+?)['"]/;
	const descMatch = frontmatter.match(descriptionRegex);
	
	return descMatch ? descMatch[1] : '';
}

/**
 * Loads all agent templates from extension resources
 *
 * Reads agent files from <extensionPath>/resources/agents/ directory,
 * parses YAML frontmatter for metadata, and returns structured templates.
 *
 * @param context Extension context for resolving resource paths
 * @returns Array of agent templates
 * @throws Error if resources/agents directory is missing
 */
export function loadAgentTemplates(context: vscode.ExtensionContext): AgentTemplate[] {
	const agentsDir = path.join(context.extensionPath, 'resources', 'agents');
	
	// Verify agents directory exists
	if (!fs.existsSync(agentsDir)) {
		throw new Error(
			`Agent templates directory not found: ${agentsDir}. ` +
			'Please ensure the extension was built correctly with agent templates bundled.'
		);
	}
	
	// Read directory contents
	const files = fs.readdirSync(agentsDir);
	const templates: AgentTemplate[] = [];
	
	for (const filename of files) {
		// Skip non-.agent.md files
		if (!filename.endsWith('.agent.md')) {
			continue;
		}
		
		const filePath = path.join(agentsDir, filename);
		
		try {
			// Read file content
			const content = fs.readFileSync(filePath, 'utf-8');
			
			// Parse metadata
			const name = extractAgentName(filename);
			const description = parseFrontmatter(content);
			
			templates.push({
				filename,
				name,
				description,
				content
			});
		} catch (error) {
			// Log error but continue loading other templates
			console.error(`Failed to load agent template ${filename}: ${error}`);
		}
	}
	
	return templates;
}
