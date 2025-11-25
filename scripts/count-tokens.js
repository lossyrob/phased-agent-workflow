#!/usr/bin/env node
/**
 * Count tokens in a file using tiktoken
 * Usage: node scripts/count-tokens.js <file-path> [model]
 */

const fs = require('fs');
const path = require('path');
const { encoding_for_model } = require('@dqbd/tiktoken');

// Get command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: count-tokens.js <file-path> [model]');
  process.exit(1);
}

const filePath = args[0];
const model = args[1] || 'gpt-4o-mini';

// Check if file exists
if (!fs.existsSync(filePath)) {
  console.error(`Error: File not found: ${filePath}`);
  process.exit(1);
}

let rendererModule;

/**
 * Lazily loads the shared agent template renderer from the TypeScript source so that
 * the lint script reuses the exact same logic as the VS Code extension.
 */
function getRendererModule() {
  if (rendererModule) {
    return rendererModule;
  }

  try {
    require('ts-node').register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        target: 'ES2020',
        esModuleInterop: true
      }
    });
  } catch (error) {
    console.error('Error: ts-node is required to process agent templates.');
    console.error('Please run: npm install');
    process.exit(1);
  }

  rendererModule = require('../src/agents/agentTemplateRenderer');
  return rendererModule;
}

/**
 * Expands component placeholders (e.g., {{PAW_CONTEXT}}) before token counting so the
 * script measures the true prompt size after template rendering.
 */
function expandAgentContent(content, absolutePath) {
  if (!absolutePath.toLowerCase().endsWith('.agent.md')) {
    return content;
  }

  const { loadComponentTemplatesFromDirectory, processAgentTemplate } = getRendererModule();
  const componentsDir = path.join(path.dirname(absolutePath), 'components');
  const components = loadComponentTemplatesFromDirectory(componentsDir);
  const agentIdentifier = path.basename(absolutePath).replace(/\.agent\.md$/i, '');
  return processAgentTemplate(content, agentIdentifier, components);
}

try {
  // Read file content
  const absolutePath = path.resolve(filePath);
  const rawContent = fs.readFileSync(absolutePath, 'utf-8');
  const content = expandAgentContent(rawContent, absolutePath);
  
  // Get encoding for the model
  const encoding = encoding_for_model(model);
  
  // Encode and count tokens
  const tokens = encoding.encode(content);
  const tokenCount = tokens.length;
  
  // Clean up
  encoding.free();
  
  // Output token count
  console.log(tokenCount);
  
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
