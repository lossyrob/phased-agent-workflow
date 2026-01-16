import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  loadSkillCatalog,
  loadSkillContent,
  parseSkillFrontmatter,
} from '../../skills/skillLoader';

function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFileRecursive(targetPath: string, content: string): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function createSkill(root: string, name: string, content: string): void {
  const skillFile = path.join(root, 'skills', name, 'SKILL.md');
  writeFileRecursive(skillFile, content);
}

suite('Skill Loader', () => {
  test('parseSkillFrontmatter extracts required fields and metadata', () => {
    const content = [
      '---',
      'name: paw-review-workflow',
      'description: Orchestrates the review workflow',
      'metadata:',
      '  type: workflow',
      '  version: "1.0"',
      '---',
      '',
      '# Body',
    ].join('\n');

    const result = parseSkillFrontmatter(content);
    assert.strictEqual(result.name, 'paw-review-workflow');
    assert.strictEqual(result.description, 'Orchestrates the review workflow');
    assert.strictEqual(result.metadata?.type, 'workflow');
    assert.strictEqual(result.metadata?.version, '1.0');
  });

  test('parseSkillFrontmatter rejects missing frontmatter', () => {
    assert.throws(
      () => parseSkillFrontmatter('# No frontmatter'),
      /frontmatter is missing or malformed/
    );
  });

  test('parseSkillFrontmatter rejects missing required fields', () => {
    const content = [
      '---',
      'description: Missing name',
      '---',
      'Body',
    ].join('\n');

    assert.throws(
      () => parseSkillFrontmatter(content),
      /must include name and description/
    );
  });

  test('loadSkillCatalog reads skills from bundled directory', () => {
    const tempDir = createTempDir('paw-skill-catalog-');
    try {
      createSkill(
        tempDir,
        'paw-review-workflow',
        [
          '---',
          'name: paw-review-workflow',
          'description: Workflow skill',
          'metadata:',
          '  type: workflow',
          '---',
          'Body',
        ].join('\n')
      );

      createSkill(
        tempDir,
        'paw-review-understanding',
        [
          '---',
          'name: paw-review-understanding',
          'description: Understanding skill',
          'metadata:',
          '  type: activity',
          '---',
          'Body',
        ].join('\n')
      );

      const catalog = loadSkillCatalog(vscode.Uri.file(tempDir));
      assert.strictEqual(catalog.length, 2);
      assert.ok(catalog.some(entry => entry.name === 'paw-review-workflow'));
      assert.ok(catalog.some(entry => entry.type === 'activity'));
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('loadSkillCatalog skips skills with invalid frontmatter', () => {
    const tempDir = createTempDir('paw-skill-invalid-');
    try {
      // Valid skill
      createSkill(
        tempDir,
        'valid-skill',
        [
          '---',
          'name: valid-skill',
          'description: A valid skill',
          '---',
          'Body',
        ].join('\n')
      );

      // Invalid skill - missing required fields
      createSkill(
        tempDir,
        'invalid-skill',
        [
          '---',
          'description: Missing name field',
          '---',
          'Body',
        ].join('\n')
      );

      const catalog = loadSkillCatalog(vscode.Uri.file(tempDir));
      // Should only contain the valid skill
      assert.strictEqual(catalog.length, 1);
      assert.strictEqual(catalog[0].name, 'valid-skill');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('loadSkillContent returns error when skill is missing', () => {
    const tempDir = createTempDir('paw-skill-missing-');
    try {
      fs.mkdirSync(path.join(tempDir, 'skills'), { recursive: true });
      const result = loadSkillContent(vscode.Uri.file(tempDir), 'paw-review-workflow');
      assert.ok(result.error);
      assert.strictEqual(result.content, '');
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('loadSkillContent returns skill content when present', () => {
    const tempDir = createTempDir('paw-skill-content-');
    const content = [
      '---',
      'name: paw-review-workflow',
      'description: Workflow skill',
      '---',
      'Body',
    ].join('\n');

    try {
      createSkill(tempDir, 'paw-review-workflow', content);
      const result = loadSkillContent(vscode.Uri.file(tempDir), 'paw-review-workflow');
      assert.strictEqual(result.content, content);
      assert.strictEqual(result.error, undefined);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
