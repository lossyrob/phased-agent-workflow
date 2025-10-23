#!/usr/bin/env node
/**
 * Count tokens in a file using tiktoken
 * Usage: node scripts/count-tokens.js <file-path> [model]
 */

const fs = require('fs');
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

try {
  // Read file content
  const content = fs.readFileSync(filePath, 'utf-8');
  
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
