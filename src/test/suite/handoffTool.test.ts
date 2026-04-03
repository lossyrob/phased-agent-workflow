import * as assert from 'assert';
import { HandoffParams } from '../../tools/handoffTool';

/**
 * Handoff tool tests.
 * 
 * These unit tests verify the handoff tool's core logic:
 * - Work/review identifier validation (format, empty checks)
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
  suite('Context Identifier Validation', () => {
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
          validateContextIdFormat('PAW', workId);
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
          () => validateContextIdFormat('PAW', workId),
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
          () => validateContextIdFormat('PAW', workId),
          /Invalid Work ID format/,
          `Should reject Work ID with special chars: ${workId}`
        );
      });
    });

    test('rejects empty Work ID', () => {
      assert.throws(
        () => validateContextIdFormat('PAW', ''),
        /Work ID cannot be empty/
      );
    });

    test('rejects whitespace-only Work ID', () => {
      assert.throws(
        () => validateContextIdFormat('PAW', '   '),
        /Work ID cannot be empty/
      );
    });

    test('accepts PAW Review identifiers for GitHub and local review contexts', () => {
      const validReviewIds = [
        'PR-123',
        'PR-123-my-api',
        'feature-review-state-test',
      ];

      validReviewIds.forEach(reviewId => {
        assert.doesNotThrow(() => {
          validateContextIdFormat('PAW Review', reviewId);
        });
      });
    });

    test('rejects invalid PAW Review identifiers', () => {
      const invalidReviewIds = [
        'PR_123',
        'PR/123',
        'Review-123',
        '../etc/passwd',
      ];

      invalidReviewIds.forEach(reviewId => {
        assert.throws(
          () => validateContextIdFormat('PAW Review', reviewId),
          /Invalid review identifier format/,
          `Should reject invalid review identifier: ${reviewId}`
        );
      });
    });
  });

  suite('Agent Name Enum', () => {
    test('accepts all valid PAW agent names', () => {
      const validAgentNames: HandoffParams['target_agent'][] = [
        'PAW',
        'PAW Review',
      ];

      validAgentNames.forEach(agentName => {
        const params: HandoffParams = {
          target_agent: agentName,
          work_id: agentName === 'PAW Review' ? 'PR-123' : 'test-feature',
        };
        assert.strictEqual(params.target_agent, agentName);
      });
    });

    test('TypeScript enforces agent name enum at compile time', () => {
      // This test verifies TypeScript type checking
      // Invalid agent names would fail compilation
      const validParams: HandoffParams = {
        target_agent: 'PAW',
        work_id: 'test-feature',
      };
      assert.ok(validParams);
    });
  });

  suite('Inline Instruction Parameter', () => {
    test('accepts optional inline instruction string', () => {
      const params: HandoffParams = {
        target_agent: 'PAW',
        work_id: 'test-feature',
        inline_instruction: 'Phase 2',
      };
      assert.strictEqual(params.inline_instruction, 'Phase 2');
    });

    test('accepts undefined inline instruction', () => {
      const params: HandoffParams = {
        target_agent: 'PAW',
        work_id: 'test-feature',
      };
      assert.strictEqual(params.inline_instruction, undefined);
    });

    test('constructs prompt with inline instruction appended', () => {
      const params: HandoffParams = {
        target_agent: 'PAW',
        work_id: 'test-feature',
        inline_instruction: 'Focus on error handling',
      };
      const prompt = constructPromptMessage(params);
      assert.ok(prompt.includes('Work ID: test-feature'));
      assert.ok(prompt.includes('WorkflowContext.md'));
      assert.ok(prompt.includes('legacy best-effort mode'));
      assert.ok(prompt.includes('Focus on error handling'));
    });

    test('constructs prompt without inline instruction when not provided', () => {
      const params: HandoffParams = {
        target_agent: 'PAW',
        work_id: 'test-feature',
      };
      const prompt = constructPromptMessage(params);
      assert.ok(prompt.includes('Work ID: test-feature'));
      assert.ok(prompt.includes('WorkflowContext.md'));
      assert.ok(prompt.includes('legacy best-effort mode'));
    });

    test('constructs review handoff prompt with ReviewContext guidance', () => {
      const params: HandoffParams = {
        target_agent: 'PAW Review',
        work_id: 'PR-123',
      };
      const prompt = constructPromptMessage(params);
      assert.ok(prompt.includes('Review ID: PR-123'));
      assert.ok(prompt.includes('ReviewContext.md'));
      assert.ok(prompt.includes('legacy best-effort mode'));
    });
  });

  suite('Prompt Message Construction', () => {
    test('includes Work ID in PAW prompt', () => {
      const params: HandoffParams = {
        target_agent: 'PAW',
        work_id: 'test-feature',
      };
      const prompt = constructPromptMessage(params);
      assert.ok(prompt.includes('Work ID: test-feature'));
    });

    test('includes Review ID in PAW Review prompt', () => {
      const params: HandoffParams = {
        target_agent: 'PAW Review',
        work_id: 'PR-123-my-api',
      };
      const prompt = constructPromptMessage(params);
      assert.ok(prompt.includes('Review ID: PR-123-my-api'));
    });

    test('appends inline instruction when provided', () => {
      const params: HandoffParams = {
        target_agent: 'PAW',
        work_id: 'test-feature',
        inline_instruction: 'Phase 2',
      };
      const prompt = constructPromptMessage(params);
      assert.ok(prompt.includes('Work ID: test-feature'));
      assert.ok(prompt.includes('Phase 2'));
    });

    test('uses fire-and-forget pattern (prompt construction is synchronous)', () => {
      const params: HandoffParams = {
        target_agent: 'PAW',
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
        () => validateContextIdFormat('PAW', 'Invalid_Work_ID'),
        /Invalid Work ID format/,
        'Should reject Work ID with underscores'
      );
    });

    test('validation rejects empty Work ID', () => {
      assert.throws(
        () => validateContextIdFormat('PAW', ''),
        /Work ID cannot be empty/,
        'Should reject empty Work ID'
      );
    });

    test('validation accepts valid Work ID', () => {
      assert.doesNotThrow(
        () => validateContextIdFormat('PAW', 'test-feature'),
        'Should accept valid Work ID'
      );
    });
  });

  suite('Tool Approval Messages', () => {
    test('constructs invocation message with agent name and work ID', () => {
      const message = constructInvocationMessage('PAW', 'test-feature');
      assert.ok(message.includes('PAW'));
      assert.ok(message.includes('test-feature'));
    });

    test('constructs review confirmation message with review identifier', () => {
      const message = constructConfirmationMessage('PAW Review', 'PR-123-my-api');
      assert.ok(message.includes('PAW Review'));
      assert.ok(message.includes('PR-123-my-api'));
      assert.ok(message.includes('review'));
    });

    test('constructs confirmation message with inline instruction when provided', () => {
      const message = constructConfirmationMessage('PAW', 'test-feature', 'Phase 2');
      assert.ok(message.includes('PAW'));
      assert.ok(message.includes('test-feature'));
      assert.ok(message.includes('Phase 2'));
      assert.ok(message.includes('With instruction:'));
    });

    test('constructs confirmation message without inline instruction when not provided', () => {
      const message = constructConfirmationMessage('PAW', 'test-feature');
      assert.ok(message.includes('PAW'));
      assert.ok(message.includes('test-feature'));
      assert.ok(!message.includes('With instruction:'));
    });
  });
});

// Helper functions to test tool logic without VS Code Language Model API

/**
 * Validates work/review identifiers (mirrors validation in handoffTool.ts)
 */
function validateContextIdFormat(targetAgent: HandoffParams['target_agent'], workId: string): void {
  const WORK_ID_PATTERN = /^[a-z0-9-]+$/;
  const REVIEW_ID_PATTERN = /^(?:PR-\d+(?:-[a-z0-9-]+)?|[a-z0-9-]+)$/;

  if (!workId || workId.trim().length === 0) {
    throw new Error(targetAgent === 'PAW Review' ? 'Review ID cannot be empty' : 'Work ID cannot be empty');
  }

  if (targetAgent === 'PAW Review') {
    if (!REVIEW_ID_PATTERN.test(workId)) {
      throw new Error(
        `Invalid review identifier format: "${workId}". ` +
        'Review identifiers must be PR IDs like "PR-123" or "PR-123-my-repo", or lowercase local review slugs.'
      );
    }

    return;
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
  const contextLabel = params.target_agent === 'PAW Review' ? 'Review ID' : 'Work ID';
  let prompt = `${contextLabel}: ${params.work_id}`;

  if (params.target_agent === 'PAW Review') {
    prompt += '\n\nBefore acting, read the existing review artifacts for this review identifier.';
    prompt += '\nUse `ReviewContext.md` as the durable review-state source when embedded hardened state is present.';
    prompt += '\nIf hardened review state is absent, continue in legacy best-effort mode and say so explicitly.';
  } else {
    prompt += '\n\nBefore acting, read the existing workflow artifacts for this work item.';
    prompt += '\nUse `WorkflowContext.md` as the durable workflow-state source when embedded hardened state is present.';
    prompt += '\nIf hardened workflow state is absent, continue in legacy best-effort mode and say so explicitly.';
  }

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
  const targetLabel = targetAgent === 'PAW Review' ? 'review' : 'feature';
  let message = `This will start a new chat with **${targetAgent}** for ${targetLabel}: ${workId}`;
  if (inlineInstruction) {
    message += `\n\nWith instruction: "${inlineInstruction}"`;
  }
  return message;
}
