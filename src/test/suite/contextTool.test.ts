import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  ContextResult,
  InstructionStatus,
  formatContextResponse,
  getContext,
  loadWorkflowContext,
  loadCustomInstructions,
} from '../../tools/contextTool';

function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeFileRecursive(targetPath: string, content: string): void {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf-8');
}

function overrideEnv(values: Record<string, string | undefined>): () => void {
  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  return () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  };
}

suite('Context Tool', () => {
  test('getContext loads workspace, user, and workflow content when present', async () => {
    const featureSlug = 'ctx-tool-e2e';
    const agentName = 'PAW-Test Agent';
    const workspaceRoot = createTempDir('paw-ctx-workspace-');
    const tempHome = createTempDir('paw-ctx-home-');

    try {
      const workflowContextPath = path.join(workspaceRoot, '.paw', 'work', featureSlug, 'WorkflowContext.md');
      writeFileRecursive(workflowContextPath, 'Work Title: Demo\nTarget Branch: feature/demo');

      const workspaceInstructionsPath = path.join(
        workspaceRoot,
        '.paw',
        'instructions',
        `${agentName}-instructions.md`
      );
      writeFileRecursive(workspaceInstructionsPath, 'Workspace instructions line');

      const userInstructionsPath = path.join(
        tempHome,
        '.paw',
        'instructions',
        `${agentName}-instructions.md`
      );
      writeFileRecursive(userInstructionsPath, 'User instructions line');

      const restoreEnv = overrideEnv({
        HOME: tempHome,
        USERPROFILE: tempHome,
        PAW_WORKSPACE_PATH: workspaceRoot,
      });

      try {
        const result = await getContext({ feature_slug: featureSlug, agent_name: agentName });
        assert.strictEqual(result.workspace_instructions.content, 'Workspace instructions line');
        assert.strictEqual(result.user_instructions.content, 'User instructions line');
        assert.ok(result.workflow_context.content.includes('Work Title: Demo'));
      } finally {
        restoreEnv();
      }
    } finally {
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
      fs.rmSync(tempHome, { recursive: true, force: true });
    }
  });

  test('getContext throws descriptive error when feature slug directory is missing', async () => {
    const workspaceRoot = createTempDir('paw-ctx-missing-');
    const restoreEnv = overrideEnv({ PAW_WORKSPACE_PATH: workspaceRoot });

    try {
      await assert.rejects(
        () => getContext({ feature_slug: 'missing-feature-slug', agent_name: 'PAW-Any Agent' }),
        /Feature slug 'missing-feature-slug' not found/
      );
    } finally {
      restoreEnv();
      fs.rmSync(workspaceRoot, { recursive: true, force: true });
    }
  });

  test('formatContextResponse uses tagged sections and warning metadata', () => {
    const status = (content: string, error?: string): InstructionStatus => ({ exists: true, content, error });

    const response = formatContextResponse({
      workspace_instructions: status('Workspace data'),
      user_instructions: status('', 'Failed to read user instructions: EACCES'),
      workflow_context: status('Work Title: Demo Feature'),
    } satisfies ContextResult);

    assert.ok(response.includes('<workspace_instructions>'));
    assert.ok(response.includes('</workspace_instructions>'));
    assert.ok(response.includes('<user_instructions>'));
    assert.ok(response.includes('<warning>Failed to read user instructions: EACCES</warning>'));
    assert.ok(response.includes('<workflow_context>'));
    assert.ok(response.includes('```markdown'));
    assert.ok(!response.includes('Follow custom instructions'));
  });

  test('formatContextResponse reports empty context when no sections exist', () => {
    const empty: InstructionStatus = { exists: false, content: '' };
    const response = formatContextResponse({
      workspace_instructions: empty,
      user_instructions: empty,
      workflow_context: empty,
    });

    assert.strictEqual(response, '<context status="empty" />');
  });

  suite('loadWorkflowContext', () => {
    test('returns complete raw file content for valid file', () => {
      const tempDir = createTempDir('paw-wf-ctx-valid-');
      const filePath = path.join(tempDir, 'WorkflowContext.md');
      
      try {
        const content = '# WorkflowContext\n\nWork Title: Demo\nTarget Branch: feature/demo';
        writeFileRecursive(filePath, content);
        
        const result = loadWorkflowContext(filePath);
        
        assert.strictEqual(result.exists, true);
        assert.strictEqual(result.content, content);
        assert.strictEqual(result.error, undefined);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('returns exists: false for missing file', () => {
      const nonExistentPath = '/tmp/this-file-definitely-does-not-exist-12345.md';
      
      const result = loadWorkflowContext(nonExistentPath);
      
      assert.strictEqual(result.exists, false);
      assert.strictEqual(result.content, '');
      assert.strictEqual(result.error, undefined);
    });

    test('returns exists: true with empty content for empty file', () => {
      const tempDir = createTempDir('paw-wf-ctx-empty-');
      const filePath = path.join(tempDir, 'WorkflowContext.md');
      
      try {
        writeFileRecursive(filePath, '');
        
        const result = loadWorkflowContext(filePath);
        
        assert.strictEqual(result.exists, true);
        assert.strictEqual(result.content, '');
        assert.strictEqual(result.error, undefined);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('returns exists: true with empty content and error message for file read errors', () => {
      const tempDir = createTempDir('paw-wf-ctx-error-');
      const filePath = path.join(tempDir, 'WorkflowContext.md');
      
      try {
        // Create file then make it unreadable
        writeFileRecursive(filePath, 'test content');
        fs.chmodSync(filePath, 0o000);
        
        const result = loadWorkflowContext(filePath);
        
        assert.strictEqual(result.exists, true);
        assert.strictEqual(result.content, '');
        assert.ok(result.error?.includes('Failed to read WorkflowContext.md'));
      } finally {
        // Restore permissions before cleanup
        try {
          fs.chmodSync(filePath, 0o644);
        } catch (e) {
          // Ignore if file doesn't exist
        }
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('normalizes line endings (CRLF to LF) and trims whitespace', () => {
      const tempDir = createTempDir('paw-wf-ctx-norm-');
      const filePath = path.join(tempDir, 'WorkflowContext.md');
      
      try {
        const contentWithCRLF = 'Line 1\r\nLine 2\r\n  ';
        writeFileRecursive(filePath, contentWithCRLF);
        
        const result = loadWorkflowContext(filePath);
        
        assert.strictEqual(result.exists, true);
        assert.strictEqual(result.content, 'Line 1\nLine 2');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  suite('loadCustomInstructions', () => {
    test('returns exists: false for missing directory', () => {
      const nonExistentDir = '/tmp/this-directory-definitely-does-not-exist-12345';
      const agentName = 'PAW-Test Agent';
      
      const result = loadCustomInstructions(nonExistentDir, agentName);
      
      assert.strictEqual(result.exists, false);
      assert.strictEqual(result.content, '');
      assert.strictEqual(result.error, undefined);
    });

    test('returns exists: false for missing agent-specific instruction file', () => {
      const tempDir = createTempDir('paw-custom-inst-dir-');
      const agentName = 'PAW-Test Agent';
      
      try {
        fs.mkdirSync(tempDir, { recursive: true });
        
        const result = loadCustomInstructions(tempDir, agentName);
        
        assert.strictEqual(result.exists, false);
        assert.strictEqual(result.content, '');
        assert.strictEqual(result.error, undefined);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('returns file content for valid agent-specific instruction file', () => {
      const tempDir = createTempDir('paw-custom-inst-valid-');
      const agentName = 'PAW-Test Agent';
      const filePath = path.join(tempDir, `${agentName}-instructions.md`);
      const content = '# Custom Instructions\n- Always include tests\n- Use TypeScript';
      
      try {
        writeFileRecursive(filePath, content);
        
        const result = loadCustomInstructions(tempDir, agentName);
        
        assert.strictEqual(result.exists, true);
        assert.strictEqual(result.content, content);
        assert.strictEqual(result.error, undefined);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('returns exists: true with error message for file read errors', () => {
      const tempDir = createTempDir('paw-custom-inst-error-');
      const agentName = 'PAW-Test Agent';
      const filePath = path.join(tempDir, `${agentName}-instructions.md`);
      
      try {
        // Create file then make it unreadable
        writeFileRecursive(filePath, 'test content');
        fs.chmodSync(filePath, 0o000);
        
        const result = loadCustomInstructions(tempDir, agentName);
        
        assert.strictEqual(result.exists, true);
        assert.strictEqual(result.content, '');
        assert.ok(result.error?.includes('Failed to read custom instructions'));
      } finally {
        // Restore permissions before cleanup
        try {
          fs.chmodSync(filePath, 0o644);
        } catch (e) {
          // Ignore if file doesn't exist
        }
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    test('normalizes line endings and trims whitespace', () => {
      const tempDir = createTempDir('paw-custom-inst-norm-');
      const agentName = 'PAW-Test Agent';
      const filePath = path.join(tempDir, `${agentName}-instructions.md`);
      const contentWithCRLF = 'Instruction 1\r\nInstruction 2\r\n  ';
      
      try {
        writeFileRecursive(filePath, contentWithCRLF);
        
        const result = loadCustomInstructions(tempDir, agentName);
        
        assert.strictEqual(result.exists, true);
        assert.strictEqual(result.content, 'Instruction 1\nInstruction 2');
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  suite('getContext validation', () => {
    test('throws error for invalid feature slug format with path traversal', async () => {
      const workspaceRoot = createTempDir('paw-ctx-validation-');
      const restoreEnv = overrideEnv({ PAW_WORKSPACE_PATH: workspaceRoot });

      try {
        await assert.rejects(
          () => getContext({ feature_slug: '../../../etc/passwd', agent_name: 'PAW-Test Agent' }),
          /Invalid feature_slug format/
        );
      } finally {
        restoreEnv();
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
      }
    });

    test('throws error for empty feature slug', async () => {
      const workspaceRoot = createTempDir('paw-ctx-validation-');
      const restoreEnv = overrideEnv({ PAW_WORKSPACE_PATH: workspaceRoot });

      try {
        await assert.rejects(
          () => getContext({ feature_slug: '', agent_name: 'PAW-Test Agent' }),
          /Invalid feature_slug: value must be a non-empty string/
        );
      } finally {
        restoreEnv();
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
      }
    });

    test('throws error for empty agent name', async () => {
      const workspaceRoot = createTempDir('paw-ctx-validation-');
      const restoreEnv = overrideEnv({ PAW_WORKSPACE_PATH: workspaceRoot });

      try {
        await assert.rejects(
          () => getContext({ feature_slug: 'valid-slug', agent_name: '' }),
          /Invalid agent_name: value must be a non-empty string/
        );
      } finally {
        restoreEnv();
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
      }
    });

    test('returns partial results when workspace instructions missing', async () => {
      const featureSlug = 'partial-test';
      const agentName = 'PAW-Test Agent';
      const workspaceRoot = createTempDir('paw-ctx-partial-');
      const tempHome = createTempDir('paw-ctx-partial-home-');

      try {
        const workflowContextPath = path.join(workspaceRoot, '.paw', 'work', featureSlug, 'WorkflowContext.md');
        writeFileRecursive(workflowContextPath, 'Work Title: Partial Test');

        const userInstructionsPath = path.join(
          tempHome,
          '.paw',
          'instructions',
          `${agentName}-instructions.md`
        );
        writeFileRecursive(userInstructionsPath, 'User instructions only');

        const restoreEnv = overrideEnv({
          HOME: tempHome,
          USERPROFILE: tempHome,
          PAW_WORKSPACE_PATH: workspaceRoot,
        });

        try {
          const result = await getContext({ feature_slug: featureSlug, agent_name: agentName });
          
          // Workspace instructions should be missing
          assert.strictEqual(result.workspace_instructions.exists, false);
          
          // User instructions and workflow context should exist
          assert.strictEqual(result.user_instructions.exists, true);
          assert.strictEqual(result.user_instructions.content, 'User instructions only');
          assert.strictEqual(result.workflow_context.exists, true);
          assert.ok(result.workflow_context.content.includes('Work Title: Partial Test'));
        } finally {
          restoreEnv();
        }
      } finally {
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
        fs.rmSync(tempHome, { recursive: true, force: true });
      }
    });

    test('returns empty results when all files missing (no errors thrown)', async () => {
      const featureSlug = 'empty-test';
      const agentName = 'PAW-Test Agent';
      const workspaceRoot = createTempDir('paw-ctx-empty-');
      const tempHome = createTempDir('paw-ctx-empty-home-');

      try {
        // Create feature directory but no files
        const featureDir = path.join(workspaceRoot, '.paw', 'work', featureSlug);
        fs.mkdirSync(featureDir, { recursive: true });

        const restoreEnv = overrideEnv({
          HOME: tempHome,
          USERPROFILE: tempHome,
          PAW_WORKSPACE_PATH: workspaceRoot,
        });

        try {
          const result = await getContext({ feature_slug: featureSlug, agent_name: agentName });
          
          // All should be missing
          assert.strictEqual(result.workspace_instructions.exists, false);
          assert.strictEqual(result.user_instructions.exists, false);
          assert.strictEqual(result.workflow_context.exists, false);
        } finally {
          restoreEnv();
        }
      } finally {
        fs.rmSync(workspaceRoot, { recursive: true, force: true });
        fs.rmSync(tempHome, { recursive: true, force: true });
      }
    });
  });
});
