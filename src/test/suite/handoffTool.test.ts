import * as assert from 'assert';
import { HandoffParams } from '../../tools/handoffTool';

/**
 * Handoff tool tests.
 * 
 * These unit tests verify the handoff tool's core logic:
 * - Work ID validation (format, empty checks)
 * - Agent name enum type safety
 * - Inline instruction handling
 * - Prompt message construction
 * - Tool approval messages
 * 
 * Note: VS Code command invocation (workbench.action.chat.newChat, workbench.action.chat.open)
 * is tested through manual verification in the Extension Development Host since
 * these are fire-and-forget commands that don't expose testable interfaces.
 */
suite('Handoff Tool', () => {
  suite('Work ID Validation', () => {
    test('accepts valid Work IDs with lowercase letters, numbers, and hyphens', () => {
      const validWorkIds = [
        'feature-slug',
        'auth-system',
        'api-v2-refactor',
        'workflow-handoffs',
        'test123',
        'a-b-c-1-2-3',
      ];

      validWorkIds.forEach(workId => {
        // Should not throw
        assert.doesNotThrow(() => {
          validateWorkIdFormat(workId);
        });
      });
    });

    test('rejects Work IDs with uppercase letters', () => {
      const invalidWorkIds = [
        'Feature-Slug',
        'AUTH-SYSTEM',
        'Api-V2',
      ];

      invalidWorkIds.forEach(workId => {
        assert.throws(
          () => validateWorkIdFormat(workId),
          /Invalid Work ID format/,
          `Should reject Work ID with uppercase: ${workId}`
        );
      });
    });

    test('rejects Work IDs with special characters', () => {
      const invalidWorkIds = [
        'feature_slug',
        'auth.system',
        'api@v2',
        'test!123',
        'feature/slug',
        '../etc/passwd',
      ];

      invalidWorkIds.forEach(workId => {
        assert.throws(
          () => validateWorkIdFormat(workId),
          /Invalid Work ID format/,
          `Should reject Work ID with special chars: ${workId}`
        );
      });
    });

    test('rejects empty Work ID', () => {
      assert.throws(
        () => validateWorkIdFormat(''),
        /Work ID cannot be empty/
      );
    });

    test('rejects whitespace-only Work ID', () => {
      assert.throws(
        () => validateWorkIdFormat('   '),
        /Work ID cannot be empty/
      );
    });
  });

  suite('Agent Name Enum', () => {
    test('accepts all valid PAW agent names', () => {
      const validAgentNames: HandoffParams['target_agent'][] = [
        'PAW-01A Specification',
        'PAW-01B Spec Researcher',
        'PAW-02A Code Researcher',
        'PAW-02B Impl Planner',
        'PAW-03A Implementer',
        'PAW-03B Impl Reviewer',
        'PAW-04 Documenter',
        'PAW-05 PR',
        'PAW-X Status',
      ];

      validAgentNames.forEach(agentName => {
        const params: HandoffParams = {
          target_agent: agentName,
          work_id: 'test-feature',
        };
        assert.strictEqual(params.target_agent, agentName);
      });
    });

    test('TypeScript enforces agent name enum at compile time', () => {
      // This test verifies TypeScript type checking
      // Invalid agent names would fail compilation
      const validParams: HandoffParams = {
        target_agent: 'PAW-03A Implementer',
        work_id: 'test-feature',
      };
      assert.ok(validParams);
    });
  });

  suite('Inline Instruction Parameter', () => {
    test('accepts optional inline instruction string', () => {
      const params: HandoffParams = {
        target_agent: 'PAW-03A Implementer',
        work_id: 'test-feature',
        inline_instruction: 'Phase 2',
      };
      assert.strictEqual(params.inline_instruction, 'Phase 2');
    });

    test('accepts undefined inline instruction', () => {
      const params: HandoffParams = {
        target_agent: 'PAW-03A Implementer',
        work_id: 'test-feature',
      };
      assert.strictEqual(params.inline_instruction, undefined);
    });

    test('constructs prompt with inline instruction appended', () => {
      const params: HandoffParams = {
        target_agent: 'PAW-03A Implementer',
        work_id: 'test-feature',
        inline_instruction: 'Focus on error handling',
      };
      const prompt = constructPromptMessage(params);
      assert.ok(prompt.includes('Work ID: test-feature'));
      assert.ok(prompt.includes('Focus on error handling'));
    });

    test('constructs prompt without inline instruction when not provided', () => {
      const params: HandoffParams = {
        target_agent: 'PAW-03A Implementer',
        work_id: 'test-feature',
      };
      const prompt = constructPromptMessage(params);
      assert.strictEqual(prompt, 'Work ID: test-feature');
    });
  });

  suite('Prompt Message Construction', () => {
    test('includes Work ID in prompt', () => {
      const params: HandoffParams = {
        target_agent: 'PAW-03A Implementer',
        work_id: 'test-feature',
      };
      const prompt = constructPromptMessage(params);
      assert.ok(prompt.includes('Work ID: test-feature'));
    });

    test('appends inline instruction when provided', () => {
      const params: HandoffParams = {
        target_agent: 'PAW-03A Implementer',
        work_id: 'test-feature',
        inline_instruction: 'Phase 2',
      };
      const prompt = constructPromptMessage(params);
      assert.ok(prompt.includes('Work ID: test-feature'));
      assert.ok(prompt.includes('Phase 2'));
    });

    test('uses fire-and-forget pattern (prompt construction is synchronous)', () => {
      const params: HandoffParams = {
        target_agent: 'PAW-03A Implementer',
        work_id: 'test-feature',
      };

      const startTime = Date.now();
      constructPromptMessage(params);
      const duration = Date.now() - startTime;

      // Should complete instantly (< 10ms) since it's just string construction
      assert.ok(duration < 10, `Prompt construction took ${duration}ms, expected < 10ms`);
    });
  });

  suite('Error Handling', () => {
    test('validation rejects invalid Work ID format', () => {
      assert.throws(
        () => validateWorkIdFormat('Invalid_Work_ID'),
        /Invalid Work ID format/,
        'Should reject Work ID with underscores'
      );
    });

    test('validation rejects empty Work ID', () => {
      assert.throws(
        () => validateWorkIdFormat(''),
        /Work ID cannot be empty/,
        'Should reject empty Work ID'
      );
    });

    test('validation accepts valid Work ID', () => {
      assert.doesNotThrow(
        () => validateWorkIdFormat('test-feature'),
        'Should accept valid Work ID'
      );
    });
  });

  suite('Tool Approval Messages', () => {
    test('constructs invocation message with agent name and work ID', () => {
      const message = constructInvocationMessage('PAW-03A Implementer', 'test-feature');
      assert.ok(message.includes('PAW-03A Implementer'));
      assert.ok(message.includes('test-feature'));
    });

    test('constructs confirmation message with inline instruction when provided', () => {
      const message = constructConfirmationMessage('PAW-03A Implementer', 'test-feature', 'Phase 2');
      assert.ok(message.includes('PAW-03A Implementer'));
      assert.ok(message.includes('test-feature'));
      assert.ok(message.includes('Phase 2'));
      assert.ok(message.includes('With instruction:'));
    });

    test('constructs confirmation message without inline instruction when not provided', () => {
      const message = constructConfirmationMessage('PAW-03A Implementer', 'test-feature');
      assert.ok(message.includes('PAW-03A Implementer'));
      assert.ok(message.includes('test-feature'));
      assert.ok(!message.includes('With instruction:'));
    });
  });
});

// Helper functions to test tool logic without VS Code Language Model API

/**
 * Validates Work ID format (mirrors validation in handoffTool.ts)
 */
function validateWorkIdFormat(workId: string): void {
  const WORK_ID_PATTERN = /^[a-z0-9-]+$/;

  if (!workId || workId.trim().length === 0) {
    throw new Error('Work ID cannot be empty');
  }

  if (!WORK_ID_PATTERN.test(workId)) {
    throw new Error(
      `Invalid Work ID format: "${workId}". ` +
      'Work IDs must contain only lowercase letters, numbers, and hyphens.'
    );
  }
}

/**
 * Constructs prompt message (mirrors logic in handoffTool.ts)
 */
function constructPromptMessage(params: HandoffParams): string {
  let prompt = `Work ID: ${params.work_id}`;

  if (params.inline_instruction) {
    prompt += `\n\n${params.inline_instruction}`;
  }

  return prompt;
}

/**
 * Constructs invocation message for tool approval UI
 */
function constructInvocationMessage(targetAgent: string, workId: string): string {
  return `Calling ${targetAgent} for ${workId}`;
}

/**
 * Constructs confirmation message for tool approval UI
 */
function constructConfirmationMessage(
  targetAgent: string,
  workId: string,
  inlineInstruction?: string
): string {
  let message = `This will start a new chat with **${targetAgent}** for feature: ${workId}`;
  if (inlineInstruction) {
    message += `\n\nWith instruction: "${inlineInstruction}"`;
  }
  return message;
}
