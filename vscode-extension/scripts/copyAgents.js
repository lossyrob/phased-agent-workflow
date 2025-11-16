#!/usr/bin/env node

/**
 * Copy agent template files from repository to extension resources
 *
 * This script copies all .agent.md files from .github/agents/ to
 * vscode-extension/resources/agents/ during the build process.
 */

const fs = require('fs');
const path = require('path');

// Paths relative to the vscode-extension directory
const SOURCE_DIR = path.join(__dirname, '..', '..', '.github', 'agents');
const TARGET_DIR = path.join(__dirname, '..', 'resources', 'agents');

/**
 * Main execution
 */
function main() {
	console.log('[Copy Agents] Starting agent template bundling...');
	console.log(`[Copy Agents] Source: ${SOURCE_DIR}`);
	console.log(`[Copy Agents] Target: ${TARGET_DIR}`);

	// Verify source directory exists
	if (!fs.existsSync(SOURCE_DIR)) {
		console.error(`[Copy Agents] ERROR: Source directory not found: ${SOURCE_DIR}`);
		process.exit(1);
	}

	// Create target directory recursively if needed
	if (!fs.existsSync(TARGET_DIR)) {
		console.log(`[Copy Agents] Creating target directory: ${TARGET_DIR}`);
		fs.mkdirSync(TARGET_DIR, { recursive: true });
	}

	// Read source directory
	const files = fs.readdirSync(SOURCE_DIR);
	console.log(`[Copy Agents] Found ${files.length} files in source directory`);

	// Filter and copy .agent.md files
	let copiedCount = 0;
	let skippedCount = 0;

	for (const file of files) {
		// Only copy .agent.md files
		if (!file.endsWith('.agent.md')) {
			console.log(`[Copy Agents] Skipping non-agent file: ${file}`);
			skippedCount++;
			continue;
		}

		const sourcePath = path.join(SOURCE_DIR, file);
		const targetPath = path.join(TARGET_DIR, file);

		try {
			// Copy file
			fs.copyFileSync(sourcePath, targetPath);
			console.log(`[Copy Agents] Copied: ${file}`);
			copiedCount++;
		} catch (error) {
			console.error(`[Copy Agents] ERROR copying ${file}: ${error.message}`);
			process.exit(1);
		}
	}

	console.log(`[Copy Agents] Complete: ${copiedCount} files copied, ${skippedCount} files skipped`);

	if (copiedCount === 0) {
		console.warn('[Copy Agents] WARNING: No agent files were copied');
	}
}

// Execute
main();
