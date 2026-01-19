import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  ContextResult,
  InstructionStatus,
  WorkspaceInfo,
  formatContextResponse,
  getContext,
  loadWorkflowContext,
  loadCustomInstructions,
  parseHandoffMode,
  getHandoffInstructions,
  HandoffMode,
} from '../../tools/contextTool';

/** Default workspace info for single-folder workspace in tests */
const defaultWorkspaceInfo: WorkspaceInfo = {
  workspaceFolderCount: 1,
  isMultiRootWorkspace: false,
};

function createTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/**
 * Sets up the PAW_EXTENSION_PATH environment variable to point to the src/ directory
 * so that template files can be loaded during tests. Returns a cleanup function.
 */
function setupExtensionPath(): () => void {
  const previous = process.env.PAW_EXTENSION_PATH;
  // Tests run from out/test/suite/, template files are in src/prompts/
  // Use the workspace root and point to src/
  const workspaceRoot = path.resolve(__dirname, '..', '..', '..');
  process.env.PAW_EXTENSION_PATH = path.join(workspaceRoot, 'src');
  return () => {
    if (previous === undefined) {
      delete process.env.PAW_EXTENSION_PATH;
    } else {
      process.env.PAW_EXTENSION_PATH = previous;
    }
  };
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
        async () => getContext({ feature_slug: 'missing-feature-slug', agent_name: 'PAW-Test' }),
        /Work ID 'missing-feature-slug' not found/
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
      workspace_info: defaultWorkspaceInfo,
    } satisfies ContextResult);

    assert.ok(response.includes('<workspace_instructions>'));
    assert.ok(response.includes('</workspace_instructions>'));
    assert.ok(response.includes('<user_instructions>'));
    assert.ok(response.includes('<warning>Failed to read user instructions: EACCES</warning>'));
    assert.ok(response.includes('<workflow_context>'));
    assert.ok(response.includes('```markdown'));
    assert.ok(!response.includes('Follow custom instructions'));
  });

  test('formatContextResponse includes workspace_info section', () => {
    const status = (content: string, error?: string): InstructionStatus => ({ exists: true, content, error });

    const singleRootResponse = formatContextResponse({
      workspace_instructions: status('Workspace data'),
      user_instructions: status(''),
      workflow_context: status('Work Title: Demo'),
      workspace_info: { workspaceFolderCount: 1, isMultiRootWorkspace: false },
    } satisfies ContextResult);

    assert.ok(singleRootResponse.includes('<workspace_info>'));
    assert.ok(singleRootResponse.includes('workspaceFolderCount: 1'));
    assert.ok(singleRootResponse.includes('isMultiRootWorkspace: false'));
    assert.ok(singleRootResponse.includes('</workspace_info>'));

    const multiRootResponse = formatContextResponse({
      workspace_instructions: status('Workspace data'),
      user_instructions: status(''),
      workflow_context: status('Work Title: Demo'),
      workspace_info: { workspaceFolderCount: 3, isMultiRootWorkspace: true },
    } satisfies ContextResult);

    assert.ok(multiRootResponse.includes('workspaceFolderCount: 3'));
    assert.ok(multiRootResponse.includes('isMultiRootWorkspace: true'));
  });

  test('formatContextResponse reports empty context when no sections exist', () => {
    const empty: InstructionStatus = { exists: false, content: '' };
    const response = formatContextResponse({
      workspace_instructions: empty,
      user_instructions: empty,
      workflow_context: empty,
      workspace_info: defaultWorkspaceInfo,
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
          /Invalid Work ID format/
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

  suite('parseHandoffMode', () => {
    test('returns manual when content is empty', () => {
      assert.strictEqual(parseHandoffMode(''), 'manual');
    });

    test('returns manual when field is missing', () => {
      const content = `# WorkflowContext

Work Title: Demo
Target Branch: feature/demo
Workflow Mode: full
Review Strategy: prs`;
      assert.strictEqual(parseHandoffMode(content), 'manual');
    });

    test('returns manual for valid content', () => {
      const content = `# WorkflowContext

Work Title: Demo
Handoff Mode: manual
Target Branch: feature/demo`;
      assert.strictEqual(parseHandoffMode(content), 'manual');
    });

    test('returns semi-auto for valid content', () => {
      const content = `# WorkflowContext

Work Title: Demo
Handoff Mode: semi-auto
Target Branch: feature/demo`;
      assert.strictEqual(parseHandoffMode(content), 'semi-auto');
    });

    test('returns auto for valid content', () => {
      const content = `# WorkflowContext

Work Title: Demo
Handoff Mode: auto
Target Branch: feature/demo`;
      assert.strictEqual(parseHandoffMode(content), 'auto');
    });

    test('is case-insensitive for mode values', () => {
      assert.strictEqual(parseHandoffMode('Handoff Mode: MANUAL'), 'manual');
      assert.strictEqual(parseHandoffMode('Handoff Mode: Semi-Auto'), 'semi-auto');
      assert.strictEqual(parseHandoffMode('Handoff Mode: AUTO'), 'auto');
    });

    test('is case-insensitive for field label', () => {
      assert.strictEqual(parseHandoffMode('handoff mode: auto'), 'auto');
      assert.strictEqual(parseHandoffMode('HANDOFF MODE: semi-auto'), 'semi-auto');
    });

    test('returns manual for invalid mode values', () => {
      assert.strictEqual(parseHandoffMode('Handoff Mode: invalid'), 'manual');
      assert.strictEqual(parseHandoffMode('Handoff Mode: automatic'), 'manual');
      assert.strictEqual(parseHandoffMode('Handoff Mode: '), 'manual');
    });

    test('handles multiline content correctly', () => {
      const content = `# WorkflowContext

Work Title: Test Feature
Work ID: test-feature
Target Branch: feature/test
Workflow Mode: full
Review Strategy: prs
Handoff Mode: auto
Issue URL: https://github.com/owner/repo/issues/1
Remote: origin`;
      assert.strictEqual(parseHandoffMode(content), 'auto');
    });

    test('handles Windows line endings', () => {
      const content = 'Work Title: Test\r\nHandoff Mode: semi-auto\r\nTarget Branch: main';
      assert.strictEqual(parseHandoffMode(content), 'semi-auto');
    });

    test('handles extra whitespace around mode value', () => {
      assert.strictEqual(parseHandoffMode('Handoff Mode:   auto   '), 'auto');
      assert.strictEqual(parseHandoffMode('Handoff Mode:\tmanual'), 'manual');
    });
  });

  suite('getHandoffInstructions', () => {
    let restoreExtensionPath: () => void;

    suiteSetup(() => {
      restoreExtensionPath = setupExtensionPath();
    });

    suiteTeardown(() => {
      restoreExtensionPath();
    });

    test('returns manual mode instructions', () => {
      const instructions = getHandoffInstructions('manual');
      assert.ok(instructions.includes('Manual Mode'));
      assert.ok(instructions.includes('STOP and wait'));
      assert.ok(instructions.includes('Do NOT call `paw_call_agent`'));
      assert.ok(instructions.includes('user controls all stage transitions'));
    });

    test('returns semi-auto mode instructions', () => {
      const instructions = getHandoffInstructions('semi-auto');
      assert.ok(instructions.includes('Semi-Auto Mode'));
      assert.ok(instructions.includes('routine transition'));
      assert.ok(instructions.includes('Decision points'));
      assert.ok(instructions.includes('auto-proceed'));
    });

    test('returns auto mode instructions', () => {
      const instructions = getHandoffInstructions('auto');
      assert.ok(instructions.includes('Auto Mode'));
      assert.ok(instructions.includes('Immediately call `paw_call_agent`'));
      assert.ok(instructions.includes('Do NOT wait for user input'));
      assert.ok(instructions.includes('CRITICAL'));
    });

    test('manual instructions mention waiting for user command', () => {
      const instructions = getHandoffInstructions('manual');
      assert.ok(instructions.includes('wait'));
      assert.ok(!instructions.includes('auto-proceed'));
    });

    test('auto instructions emphasize immediate action', () => {
      const instructions = getHandoffInstructions('auto');
      assert.ok(instructions.includes('Immediately'));
      assert.ok(instructions.includes('MUST call'));
    });

    test('all modes include failure mode exception', () => {
      const manualInstructions = getHandoffInstructions('manual');
      const semiAutoInstructions = getHandoffInstructions('semi-auto');
      const autoInstructions = getHandoffInstructions('auto');
      
      assert.ok(manualInstructions.includes('Failure Mode Exception'));
      assert.ok(manualInstructions.includes('blocked'));
      assert.ok(semiAutoInstructions.includes('Failure Mode Exception'));
      assert.ok(semiAutoInstructions.includes('blocked'));
      assert.ok(autoInstructions.includes('Failure Mode Exception'));
      assert.ok(autoInstructions.includes('blocked'));
    });
  });

  suite('formatContextResponse with handoff instructions', () => {
    let restoreExtensionPath: () => void;

    suiteSetup(() => {
      restoreExtensionPath = setupExtensionPath();
    });

    suiteTeardown(() => {
      restoreExtensionPath();
    });

    test('includes handoff_instructions section in response', () => {
      const status = (content: string, error?: string): InstructionStatus => ({ exists: true, content, error });

      const response = formatContextResponse({
        workspace_instructions: status(''),
        user_instructions: status(''),
        workflow_context: status('Work Title: Demo\nHandoff Mode: auto'),
        workspace_info: defaultWorkspaceInfo,
      } satisfies ContextResult);

      assert.ok(response.includes('<handoff_instructions>'));
      assert.ok(response.includes('</handoff_instructions>'));
    });

    test('includes correct instructions based on parsed mode', () => {
      const status = (content: string, error?: string): InstructionStatus => ({ exists: true, content, error });

      const autoResponse = formatContextResponse({
        workspace_instructions: status(''),
        user_instructions: status(''),
        workflow_context: status('Handoff Mode: auto'),
        workspace_info: defaultWorkspaceInfo,
      } satisfies ContextResult);
      assert.ok(autoResponse.includes('Auto Mode'));

      const manualResponse = formatContextResponse({
        workspace_instructions: status(''),
        user_instructions: status(''),
        workflow_context: status('Handoff Mode: manual'),
        workspace_info: defaultWorkspaceInfo,
      } satisfies ContextResult);
      assert.ok(manualResponse.includes('Manual Mode'));

      const semiAutoResponse = formatContextResponse({
        workspace_instructions: status(''),
        user_instructions: status(''),
        workflow_context: status('Handoff Mode: semi-auto'),
        workspace_info: defaultWorkspaceInfo,
      } satisfies ContextResult);
      assert.ok(semiAutoResponse.includes('Semi-Auto Mode'));
    });

    test('defaults to manual mode when handoff mode is missing', () => {
      const status = (content: string, error?: string): InstructionStatus => ({ exists: true, content, error });

      const response = formatContextResponse({
        workspace_instructions: status(''),
        user_instructions: status(''),
        workflow_context: status('Work Title: Demo\nTarget Branch: main'),
        workspace_info: defaultWorkspaceInfo,
      } satisfies ContextResult);

      assert.ok(response.includes('Manual Mode'));
      assert.ok(response.includes('STOP and wait'));
    });

    test('handoff_instructions appears at end of response for recency', () => {
      const status = (content: string, error?: string): InstructionStatus => ({ exists: true, content, error });

      const response = formatContextResponse({
        workspace_instructions: status('Workspace instructions content'),
        user_instructions: status('User instructions content'),
        workflow_context: status('Work Title: Demo\nHandoff Mode: auto'),
        workspace_info: defaultWorkspaceInfo,
      } satisfies ContextResult);

      const workspaceIndex = response.indexOf('<workspace_instructions>');
      const userIndex = response.indexOf('<user_instructions>');
      const workflowIndex = response.indexOf('<workflow_context>');
      const handoffIndex = response.indexOf('<handoff_instructions>');

      // Handoff should be after all other sections
      assert.ok(handoffIndex > workspaceIndex, 'handoff_instructions should be after workspace_instructions');
      assert.ok(handoffIndex > userIndex, 'handoff_instructions should be after user_instructions');
      assert.ok(handoffIndex > workflowIndex, 'handoff_instructions should be after workflow_context');
    });

    test('returns empty context when only handoff instructions present', () => {
      const empty: InstructionStatus = { exists: false, content: '' };
      const response = formatContextResponse({
        workspace_instructions: empty,
        user_instructions: empty,
        workflow_context: empty,
        workspace_info: defaultWorkspaceInfo,
      });

      assert.strictEqual(response, '<context status="empty" />');
    });
  });
});
