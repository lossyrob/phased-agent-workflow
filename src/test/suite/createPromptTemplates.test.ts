import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { createPromptTemplates, WorkflowStage } from '../../tools/createPromptTemplates';

/**
 * Prompt template generation tests.
 * 
 * These unit tests verify that the paw_create_prompt_templates tool correctly
 * generates prompt files based on workflow mode:
 * - Full mode: All 10 prompt files (01A through 0X)
 * - Minimal mode: 8 prompt files (02A, 02B, 03A, 03B, 03C, 03D, 05, 0X)
 * - Custom mode: Only specified stages
 * - Default behavior: All files for backward compatibility
 * 
 * Tests also verify correct frontmatter format and file content structure.
 */
suite('Prompt Template Generation', () => {
  let tempDir: string;

  // Create temporary directory before each test
  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'paw-test-'));
  });

  // Clean up temporary directory after each test
  teardown(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('Full mode generates all 10 prompt files', async () => {
    const result = await createPromptTemplates({
      feature_slug: 'test-feature',
      workspace_path: tempDir,
      workflow_mode: 'full'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.files_created.length, 10);

    // Verify all expected files were created
    const expectedFiles = [
      '01A-spec.prompt.md',
      '02A-code-research.prompt.md',
      '02B-impl-plan.prompt.md',
      '03A-implement.prompt.md',
      '03B-review.prompt.md',
      '03C-pr-review.prompt.md',
      '03D-review-pr-review.prompt.md',
      '04-docs.prompt.md',
      '05-pr.prompt.md',
      '0X-status.prompt.md'
    ];

    const promptsDir = path.join(tempDir, '.paw', 'work', 'test-feature', 'prompts');
    for (const filename of expectedFiles) {
      const filePath = path.join(promptsDir, filename);
      assert.ok(fs.existsSync(filePath), `${filename} should exist`);
    }
  });

  test('Minimal mode generates exactly 8 prompt files', async () => {
    const result = await createPromptTemplates({
      feature_slug: 'test-feature',
      workspace_path: tempDir,
      workflow_mode: 'minimal'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.files_created.length, 9);

    // Verify expected files were created (no spec, but includes docs)
    const expectedFiles = [
      '02A-code-research.prompt.md',
      '02B-impl-plan.prompt.md',
      '03A-implement.prompt.md',
      '03B-review.prompt.md',
      '03C-pr-review.prompt.md',
      '03D-review-pr-review.prompt.md',
      '04-docs.prompt.md',
      '05-pr.prompt.md',
      '0X-status.prompt.md'
    ];

    const promptsDir = path.join(tempDir, '.paw', 'work', 'test-feature', 'prompts');
    for (const filename of expectedFiles) {
      const filePath = path.join(promptsDir, filename);
      assert.ok(fs.existsSync(filePath), `${filename} should exist`);
    }

    // Verify spec files were NOT created
    const unexpectedFiles = [
      '01A-spec.prompt.md'
    ];

    for (const filename of unexpectedFiles) {
      const filePath = path.join(promptsDir, filename);
      assert.ok(!fs.existsSync(filePath), `${filename} should NOT exist in minimal mode`);
    }
  });

  test('Custom mode with explicit stages generates only specified files', async () => {
    const result = await createPromptTemplates({
      feature_slug: 'test-feature',
      workspace_path: tempDir,
      workflow_mode: 'custom',
      stages: [
        WorkflowStage.CodeResearch,
        WorkflowStage.Plan,
        WorkflowStage.Implementation,
        WorkflowStage.FinalPR
      ]
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.files_created.length, 4);

    // Verify only requested files were created
    const expectedFiles = [
      '02A-code-research.prompt.md',
      '02B-impl-plan.prompt.md',
      '03A-implement.prompt.md',
      '05-pr.prompt.md'
    ];

    const promptsDir = path.join(tempDir, '.paw', 'work', 'test-feature', 'prompts');
    for (const filename of expectedFiles) {
      const filePath = path.join(promptsDir, filename);
      assert.ok(fs.existsSync(filePath), `${filename} should exist`);
    }

    // Verify other files were NOT created
    const unexpectedFiles = [
      '01A-spec.prompt.md',
      '03B-review.prompt.md',
      '03C-pr-review.prompt.md',
      '03D-review-pr-review.prompt.md',
      '04-docs.prompt.md',
      '0X-status.prompt.md'
    ];

    for (const filename of unexpectedFiles) {
      const filePath = path.join(promptsDir, filename);
      assert.ok(!fs.existsSync(filePath), `${filename} should NOT exist with custom stages`);
    }
  });

  test('Default behavior (no mode) generates all files for backward compatibility', async () => {
    const result = await createPromptTemplates({
      feature_slug: 'test-feature',
      workspace_path: tempDir
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.files_created.length, 10);

    // Should behave same as full mode
    const expectedFiles = [
      '01A-spec.prompt.md',
      '02A-code-research.prompt.md',
      '02B-impl-plan.prompt.md',
      '03A-implement.prompt.md',
      '03B-review.prompt.md',
      '03C-pr-review.prompt.md',
      '03D-review-pr-review.prompt.md',
      '04-docs.prompt.md',
      '05-pr.prompt.md',
      '0X-status.prompt.md'
    ];

    const promptsDir = path.join(tempDir, '.paw', 'work', 'test-feature', 'prompts');
    for (const filename of expectedFiles) {
      const filePath = path.join(promptsDir, filename);
      assert.ok(fs.existsSync(filePath), `${filename} should exist`);
    }
  });

  test('Generated files have correct frontmatter format', async () => {
    await createPromptTemplates({
      feature_slug: 'test-feature',
      workspace_path: tempDir,
      workflow_mode: 'full'
    });

    const promptsDir = path.join(tempDir, '.paw', 'work', 'test-feature', 'prompts');
    const specFilePath = path.join(promptsDir, '01A-spec.prompt.md');
    const content = fs.readFileSync(specFilePath, 'utf-8');

    // Verify frontmatter format
    assert.ok(content.startsWith('---\n'), 'File should start with frontmatter delimiter');
    assert.ok(content.includes('agent: PAW-01A Specification'), 'Frontmatter should include agent');
    assert.ok(content.includes('Work ID: test-feature'), 'Body should include work ID parameter');
  });

  test('Status stage always included regardless of mode', async () => {
    // Test full mode - should have 10 files including status
    const fullResult = await createPromptTemplates({
      feature_slug: 'test-feature-full',
      workspace_path: tempDir,
      workflow_mode: 'full'
    });
    assert.strictEqual(fullResult.files_created.length, 10);
    const fullStatusFile = path.join(tempDir, '.paw', 'work', 'test-feature-full', 'prompts', '0X-status.prompt.md');
    assert.ok(fs.existsSync(fullStatusFile), 'Status file should exist in full mode');

    // Test minimal mode - should have 9 files including status (documentation was added to minimal)
    const minimalResult = await createPromptTemplates({
      feature_slug: 'test-feature-minimal',
      workspace_path: tempDir,
      workflow_mode: 'minimal'
    });
    assert.strictEqual(minimalResult.files_created.length, 9);
    const minimalStatusFile = path.join(tempDir, '.paw', 'work', 'test-feature-minimal', 'prompts', '0X-status.prompt.md');
    assert.ok(fs.existsSync(minimalStatusFile), 'Status file should exist in minimal mode');

    // Test custom mode with minimal stages
    const customResult = await createPromptTemplates({
      feature_slug: 'test-feature-custom',
      workspace_path: tempDir,
      workflow_mode: 'custom',
      stages: [WorkflowStage.Implementation, WorkflowStage.Status]
    });
    const customStatusFile = path.join(tempDir, '.paw', 'work', 'test-feature-custom', 'prompts', '0X-status.prompt.md');
    assert.ok(fs.existsSync(customStatusFile), 'Status file should exist in custom mode when requested');
  });

  test('Function is idempotent - overwrites existing files', async () => {
    const params = {
      feature_slug: 'test-feature',
      workspace_path: tempDir,
      workflow_mode: 'full' as const
    };

    // First creation
    const firstResult = await createPromptTemplates(params);
    assert.strictEqual(firstResult.success, true);
    assert.strictEqual(firstResult.files_created.length, 10);

    // Modify one of the files
    const promptsDir = path.join(tempDir, '.paw', 'work', 'test-feature', 'prompts');
    const testFile = path.join(promptsDir, '01A-spec.prompt.md');
    fs.writeFileSync(testFile, 'MODIFIED CONTENT', 'utf-8');
    
    const modifiedContent = fs.readFileSync(testFile, 'utf-8');
    assert.strictEqual(modifiedContent, 'MODIFIED CONTENT');

    // Second creation (should overwrite)
    const secondResult = await createPromptTemplates(params);
    assert.strictEqual(secondResult.success, true);
    assert.strictEqual(secondResult.files_created.length, 10);

    // Verify file was overwritten with correct template content
    const restoredContent = fs.readFileSync(testFile, 'utf-8');
    assert.ok(restoredContent.includes('agent: PAW-01A Specification'), 'File should be restored to template content');
    assert.ok(restoredContent !== 'MODIFIED CONTENT', 'Modified content should be overwritten');
  });

  test('PRReviewResponse stage includes both 03C and 03D files', async () => {
    const result = await createPromptTemplates({
      feature_slug: 'test-feature',
      workspace_path: tempDir,
      workflow_mode: 'custom',
      stages: [WorkflowStage.PRReviewResponse]
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.files_created.length, 2);

    const promptsDir = path.join(tempDir, '.paw', 'work', 'test-feature', 'prompts');
    const prReviewFile = path.join(promptsDir, '03C-pr-review.prompt.md');
    const reviewPrReviewFile = path.join(promptsDir, '03D-review-pr-review.prompt.md');

    assert.ok(fs.existsSync(prReviewFile), '03C-pr-review.prompt.md should exist');
    assert.ok(fs.existsSync(reviewPrReviewFile), '03D-review-pr-review.prompt.md should exist');
  });
});
