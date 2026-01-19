import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { loadPromptTemplates } from '../../agents/promptTemplates';

function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFileRecursive(targetPath: string, content: string): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function createPrompt(root: string, filename: string, content: string): void {
  const promptFile = path.join(root, 'prompts', filename);
  writeFileRecursive(promptFile, content);
}

suite('Prompt Templates', () => {
  test('loadPromptTemplates loads valid prompt templates', () => {
    const tempDir = createTempDir('paw-prompts-valid-');
    try {
      createPrompt(
        tempDir,
        'paw-review.prompt.md',
        [
          '---',
          'agent: PAW Review',
          'description: Starts a PAW review workflow',
          '---',
          '',
          'Start the PAW Review workflow for the specified PR.',
        ].join('\n')
      );

      createPrompt(
        tempDir,
        'paw-implement.prompt.md',
        [
          '---',
          'agent: PAW-03A Implementer',
          '---',
          '',
          'Implementation prompt body.',
        ].join('\n')
      );

      const templates = loadPromptTemplates(vscode.Uri.file(tempDir));
      assert.strictEqual(templates.length, 2);
      
      const reviewTemplate = templates.find(t => t.filename === 'paw-review.prompt.md');
      assert.ok(reviewTemplate, 'Should find paw-review.prompt.md');
      assert.strictEqual(reviewTemplate?.agent, 'PAW Review');
      assert.ok(reviewTemplate?.content.includes('Start the PAW Review workflow'));
      
      const implementTemplate = templates.find(t => t.filename === 'paw-implement.prompt.md');
      assert.ok(implementTemplate, 'Should find paw-implement.prompt.md');
      assert.strictEqual(implementTemplate?.agent, 'PAW-03A Implementer');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('loadPromptTemplates returns empty array for missing prompts directory', () => {
    const tempDir = createTempDir('paw-prompts-missing-');
    try {
      // Don't create any prompts directory
      const templates = loadPromptTemplates(vscode.Uri.file(tempDir));
      assert.strictEqual(templates.length, 0);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('loadPromptTemplates handles malformed frontmatter gracefully', () => {
    const tempDir = createTempDir('paw-prompts-malformed-');
    try {
      // Valid prompt
      createPrompt(
        tempDir,
        'valid.prompt.md',
        [
          '---',
          'agent: Valid Agent',
          '---',
          'Body',
        ].join('\n')
      );

      // Malformed - no closing delimiter
      createPrompt(
        tempDir,
        'no-closing.prompt.md',
        [
          '---',
          'agent: No Closing',
          'Body without closing delimiter',
        ].join('\n')
      );

      // Malformed - no frontmatter at all
      createPrompt(
        tempDir,
        'no-frontmatter.prompt.md',
        'Just some content without frontmatter'
      );

      const templates = loadPromptTemplates(vscode.Uri.file(tempDir));
      // All should load but malformed ones will have empty agent
      assert.strictEqual(templates.length, 3);
      
      const validTemplate = templates.find(t => t.filename === 'valid.prompt.md');
      assert.strictEqual(validTemplate?.agent, 'Valid Agent');
      
      const noClosingTemplate = templates.find(t => t.filename === 'no-closing.prompt.md');
      assert.strictEqual(noClosingTemplate?.agent, '', 'Missing closing delimiter should return empty agent');
      
      const noFrontmatterTemplate = templates.find(t => t.filename === 'no-frontmatter.prompt.md');
      assert.strictEqual(noFrontmatterTemplate?.agent, '', 'No frontmatter should return empty agent');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('loadPromptTemplates extracts agent field correctly with various formats', () => {
    const tempDir = createTempDir('paw-prompts-agent-');
    try {
      // Agent with quotes
      createPrompt(
        tempDir,
        'quoted.prompt.md',
        [
          '---',
          'agent: "Quoted Agent Name"',
          '---',
          'Body',
        ].join('\n')
      );

      // Agent with single quotes
      createPrompt(
        tempDir,
        'single-quoted.prompt.md',
        [
          '---',
          "agent: 'Single Quoted'",
          '---',
          'Body',
        ].join('\n')
      );

      // Agent with colon in value
      createPrompt(
        tempDir,
        'colon.prompt.md',
        [
          '---',
          'agent: Agent: With Colon',
          '---',
          'Body',
        ].join('\n')
      );

      // Case insensitive field name
      createPrompt(
        tempDir,
        'uppercase.prompt.md',
        [
          '---',
          'AGENT: Uppercase Field',
          '---',
          'Body',
        ].join('\n')
      );

      const templates = loadPromptTemplates(vscode.Uri.file(tempDir));
      assert.strictEqual(templates.length, 4);
      
      const quotedTemplate = templates.find(t => t.filename === 'quoted.prompt.md');
      assert.strictEqual(quotedTemplate?.agent, 'Quoted Agent Name');
      
      const singleQuotedTemplate = templates.find(t => t.filename === 'single-quoted.prompt.md');
      assert.strictEqual(singleQuotedTemplate?.agent, 'Single Quoted');
      
      const colonTemplate = templates.find(t => t.filename === 'colon.prompt.md');
      assert.strictEqual(colonTemplate?.agent, 'Agent: With Colon');
      
      const uppercaseTemplate = templates.find(t => t.filename === 'uppercase.prompt.md');
      assert.strictEqual(uppercaseTemplate?.agent, 'Uppercase Field');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('loadPromptTemplates skips subdirectories', () => {
    const tempDir = createTempDir('paw-prompts-subdir-');
    try {
      // Create a valid prompt at the root level
      createPrompt(
        tempDir,
        'root-prompt.prompt.md',
        [
          '---',
          'agent: Root Agent',
          '---',
          'Body',
        ].join('\n')
      );

      // Create a subdirectory with a prompt file that should be ignored
      const subdir = path.join(tempDir, 'prompts', 'subdir');
      fs.mkdirSync(subdir, { recursive: true });
      fs.writeFileSync(
        path.join(subdir, 'nested.prompt.md'),
        [
          '---',
          'agent: Nested Agent',
          '---',
          'Body',
        ].join('\n')
      );

      // Create a directory named like a prompt file
      fs.mkdirSync(path.join(tempDir, 'prompts', 'fake.prompt.md'), { recursive: true });

      const templates = loadPromptTemplates(vscode.Uri.file(tempDir));
      // Should only load the root-level prompt, not the subdirectory or nested files
      assert.strictEqual(templates.length, 1);
      assert.strictEqual(templates[0].filename, 'root-prompt.prompt.md');
      assert.strictEqual(templates[0].agent, 'Root Agent');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('loadPromptTemplates ignores non-prompt files', () => {
    const tempDir = createTempDir('paw-prompts-ignore-');
    try {
      // Create a valid prompt
      createPrompt(
        tempDir,
        'valid.prompt.md',
        [
          '---',
          'agent: Valid Agent',
          '---',
          'Body',
        ].join('\n')
      );

      // Create a non-prompt markdown file
      writeFileRecursive(
        path.join(tempDir, 'prompts', 'README.md'),
        '# Not a prompt file'
      );

      // Create a text file
      writeFileRecursive(
        path.join(tempDir, 'prompts', 'notes.txt'),
        'Some notes'
      );

      const templates = loadPromptTemplates(vscode.Uri.file(tempDir));
      assert.strictEqual(templates.length, 1);
      assert.strictEqual(templates[0].filename, 'valid.prompt.md');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
