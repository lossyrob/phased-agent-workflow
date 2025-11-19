import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  ContextResult,
  InstructionStatus,
  formatContextResponse,
  getContext,
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
      user_instructions: status('', 'User instructions not found'),
      workflow_context: status('Work Title: Demo Feature'),
    } satisfies ContextResult);

    assert.ok(response.includes('<workspace_instructions>'));
    assert.ok(response.includes('</workspace_instructions>'));
    assert.ok(response.includes('<user_instructions>'));
    assert.ok(response.includes('<warning>User instructions not found</warning>'));
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
});
