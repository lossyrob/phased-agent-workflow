import * as path from 'path';
import { runTests } from '@vscode/test-electron';

/**
 * Main entry point for executing VS Code extension tests.
 * 
 * This script:
 * 1. Downloads and runs a local instance of VS Code (if not already cached)
 * 2. Loads the extension in development mode
 * 3. Executes the test suite defined in suite/index.ts
 * 
 * Used by `npm test` command.
 */
async function main() {
  try {
    // Path to the extension root (where package.json lives)
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    // Path to the compiled test suite entry point
    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    // Download VS Code (if needed), launch it, and run the tests
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath
    });
  } catch (error) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();
