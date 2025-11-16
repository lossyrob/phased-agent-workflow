import * as path from 'path';
import Mocha from 'mocha';
import glob from 'glob';

/**
 * Test runner entry point for VS Code extension tests.
 * 
 * Configures and executes the Mocha test suite by:
 * 1. Discovering all .test.js files in the compiled test directory
 * 2. Adding them to the Mocha test suite
 * 3. Running tests with TDD interface and colored output
 * 
 * @returns Promise that resolves on success or rejects with error details on failure
 */
export function run(): Promise<void> {
  // Configure Mocha with TDD interface (suite/test style) and color output
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((resolve, reject) => {
    // Discover all compiled test files
    glob('**/**.test.js', { cwd: testsRoot }, (err: Error | null, files: string[]) => {
      if (err) {
        return reject(err);
      }

      // Add each test file to the suite
      files.forEach((file: string) => {
        mocha.addFile(path.resolve(testsRoot, file));
      });

      try {
        // Run the test suite
        mocha.run((failures: number) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  });
}
