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
 * - Full mode: All 15 prompt files (01A through 0X, including all PR review variants)
 * - Minimal mode: 14 prompt files (all except 01A-spec)
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

  test('Full mode generates all 15 prompt files', async () => {
    const result = await createPromptTemplates({
      feature_slug: 'test-feature',
      workspace_path: tempDir,
      workflow_mode: 'full'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.files_created.length, 15);

    // Verify all expected files were created
    const expectedFiles = [
      '01A-spec.prompt.md',
      '02A-code-research.prompt.md',
      '02B-impl-plan.prompt.md',
      '02C-planning-pr-review.prompt.md',
      '03A-implement.prompt.md',
      '03B-review.prompt.md',
      '03C-pr-review.prompt.md',
      '03D-review-pr-review.prompt.md',
      '04-docs.prompt.md',
      '04B-docs-pr-review.prompt.md',
      '04C-docs-review-pr-review.prompt.md',
      '05-pr.prompt.md',
      '05B-final-pr-review.prompt.md',
      '05C-final-review-pr-review.prompt.md',
      '0X-status.prompt.md'
    ];

    const promptsDir = path.join(tempDir, '.paw', 'work', 'test-feature', 'prompts');
    for (const filename of expectedFiles) {
      const filePath = path.join(promptsDir, filename);
      assert.ok(fs.existsSync(filePath), `${filename} should exist`);
    }
  });

  test('Minimal mode generates exactly 14 prompt files', async () => {
    const result = await createPromptTemplates({
      feature_slug: 'test-feature',
      workspace_path: tempDir,
      workflow_mode: 'minimal'
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.errors.length, 0);
    assert.strictEqual(result.files_created.length, 14);

    // Verify expected files were created (no spec, but includes docs and all PR review responses)
    const expectedFiles = [
      '02A-code-research.prompt.md',
      '02B-impl-plan.prompt.md',
      '02C-planning-pr-review.prompt.md',
      '03A-implement.prompt.md',
      '03B-review.prompt.md',
      '03C-pr-review.prompt.md',
      '03D-review-pr-review.prompt.md',
      '04-docs.prompt.md',
      '04B-docs-pr-review.prompt.md',
      '04C-docs-review-pr-review.prompt.md',
      '05-pr.prompt.md',
      '05B-final-pr-review.prompt.md',
      '05C-final-review-pr-review.prompt.md',
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
    assert.strictEqual(result.files_created.length, 15);

    // Should behave same as full mode
    const expectedFiles = [
      '01A-spec.prompt.md',
      '02A-code-research.prompt.md',
      '02B-impl-plan.prompt.md',
      '02C-planning-pr-review.prompt.md',
      '03A-implement.prompt.md',
      '03B-review.prompt.md',
      '03C-pr-review.prompt.md',
      '03D-review-pr-review.prompt.md',
      '04-docs.prompt.md',
      '04B-docs-pr-review.prompt.md',
      '04C-docs-review-pr-review.prompt.md',
      '05-pr.prompt.md',
      '05B-final-pr-review.prompt.md',
      '05C-final-review-pr-review.prompt.md',
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
    assert.ok(content.includes('Work ID: test-feature'), 'Body should include Work ID parameter');
  });

  test('Status stage always included regardless of mode', async () => {
    // Test full mode - should have 15 files including status
    const fullResult = await createPromptTemplates({
      feature_slug: 'test-feature-full',
      workspace_path: tempDir,
      workflow_mode: 'full'
    });
    assert.strictEqual(fullResult.files_created.length, 15);
    const fullStatusFile = path.join(tempDir, '.paw', 'work', 'test-feature-full', 'prompts', '0X-status.prompt.md');
    assert.ok(fs.existsSync(fullStatusFile), 'Status file should exist in full mode');

    // Test minimal mode - should have 14 files including status (no spec, but includes docs and all PR review responses)
    const minimalResult = await createPromptTemplates({
      feature_slug: 'test-feature-minimal',
      workspace_path: tempDir,
      workflow_mode: 'minimal'
    });
    assert.strictEqual(minimalResult.files_created.length, 14);
    const minimalStatusFile = path.join(tempDir, '.paw', 'work', 'test-feature-minimal', 'prompts', '0X-status.prompt.md');
    assert.ok(fs.existsSync(minimalStatusFile), 'Status file should exist in minimal mode');

    // Test custom mode with minimal stages
    const customResult = await createPromptTemplates({
      feature_slug: 'test-feature-custom',
      workspace_path: tempDir,
      workflow_mode: 'custom',
      stages: [WorkflowStage.Implementation, WorkflowStage.Status]
    });
    assert.strictEqual(customResult.success, true);
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
    assert.strictEqual(firstResult.files_created.length, 15);

    // Modify one of the files
    const promptsDir = path.join(tempDir, '.paw', 'work', 'test-feature', 'prompts');
    const testFile = path.join(promptsDir, '01A-spec.prompt.md');
    fs.writeFileSync(testFile, 'MODIFIED CONTENT', 'utf-8');
    
    const modifiedContent = fs.readFileSync(testFile, 'utf-8');
    assert.strictEqual(modifiedContent, 'MODIFIED CONTENT');

    // Second creation (should overwrite)
    const secondResult = await createPromptTemplates(params);
    assert.strictEqual(secondResult.success, true);
    assert.strictEqual(secondResult.files_created.length, 15);

    // Verify file was overwritten with correct template content
    const restoredContent = fs.readFileSync(testFile, 'utf-8');
    assert.ok(restoredContent.includes('agent: PAW-01A Specification'), 'File should be restored to template content');
    assert.ok(restoredContent !== 'MODIFIED CONTENT', 'Modified content should be overwritten');
  });

  test('PRReviewResponse stage includes all PR review related files', async () => {
    const result = await createPromptTemplates({
      feature_slug: 'test-feature',
      workspace_path: tempDir,
      workflow_mode: 'custom',
      stages: [WorkflowStage.PRReviewResponse]
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.files_created.length, 7);

    const promptsDir = path.join(tempDir, '.paw', 'work', 'test-feature', 'prompts');
    
    // All PR review response files
    const expectedPrReviewFiles = [
      '02C-planning-pr-review.prompt.md',
      '03C-pr-review.prompt.md',
      '03D-review-pr-review.prompt.md',
      '04B-docs-pr-review.prompt.md',
      '04C-docs-review-pr-review.prompt.md',
      '05B-final-pr-review.prompt.md',
      '05C-final-review-pr-review.prompt.md'
    ];

    for (const filename of expectedPrReviewFiles) {
      const filePath = path.join(promptsDir, filename);
      assert.ok(fs.existsSync(filePath), `${filename} should exist`);
    }
  });
});
