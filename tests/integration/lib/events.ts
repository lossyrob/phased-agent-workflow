/**
 * Records SDK session events for post-run assertions on skill loading,
 * subagent delegation, compaction and token usage.
 */

export interface RecordedEvent {
  type: string;
  data: Record<string, unknown>;
  at: number;
}

export interface ToolStart {
  toolCallId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  /** Set when the call was made by a subagent rather than the host. */
  parentToolCallId?: string;
}

export interface UsageTotals {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cost: number;
}

/** Event types too chatty to keep. */
const IGNORED = new Set([
  "assistant.message_delta",
  "assistant.reasoning_delta",
  "assistant.streaming_delta",
  "tool.execution_partial_result",
  "tool.execution_progress",
]);

function emptyUsage(): UsageTotals {
  return { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cost: 0 };
}

export class SessionEventLog {
  readonly events: RecordedEvent[] = [];
  readonly startedAt = Date.now();

  record(event: { type: string; data?: unknown }): void {
    if (IGNORED.has(event.type)) {
      return;
    }
    this.events.push({
      type: event.type,
      data: (event.data as Record<string, unknown>) ?? {},
      at: Date.now(),
    });
  }

  ofType(type: string): RecordedEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /** Names of skills loaded through the runtime's skill system. */
  skillsInvoked(): string[] {
    return this.ofType("skill.invoked").map((e) => String(e.data.name));
  }

  /** Every tool call, by host and by subagents. */
  toolStarts(): ToolStart[] {
    return this.ofType("tool.execution_start").map((e) => ({
      toolCallId: String(e.data.toolCallId),
      toolName: String(e.data.toolName),
      arguments: (e.data.arguments as Record<string, unknown>) ?? {},
      parentToolCallId: e.data.parentToolCallId ? String(e.data.parentToolCallId) : undefined,
    }));
  }

  /** Tool calls made by the host session itself. */
  hostToolStarts(): ToolStart[] {
    return this.toolStarts().filter((t) => !t.parentToolCallId);
  }

  /** Tool calls made inside subagents. */
  subagentToolStarts(): ToolStart[] {
    return this.toolStarts().filter((t) => !!t.parentToolCallId);
  }

  /** Subagents started, in order. */
  subagentsStarted(): Array<{ toolCallId: string; agentName: string }> {
    return this.ofType("subagent.started").map((e) => ({
      toolCallId: String(e.data.toolCallId),
      agentName: String(e.data.agentName),
    }));
  }

  compactions(): RecordedEvent[] {
    return this.ofType("session.compaction_complete");
  }

  /** Token usage split between the host session and its subagents. */
  usage(): { host: UsageTotals; subagents: UsageTotals } {
    const host = emptyUsage();
    const subagents = emptyUsage();
    for (const e of this.ofType("assistant.usage")) {
      const bucket = e.data.initiator === "sub-agent" ? subagents : host;
      bucket.calls += 1;
      bucket.inputTokens += Number(e.data.inputTokens ?? 0);
      bucket.outputTokens += Number(e.data.outputTokens ?? 0);
      bucket.cacheReadTokens += Number(e.data.cacheReadTokens ?? 0);
      bucket.cost += Number(e.data.cost ?? 0);
    }
    return { host, subagents };
  }

  /** Largest single host prompt, a proxy for peak host context size. */
  peakHostInputTokens(): number {
    let peak = 0;
    for (const e of this.ofType("assistant.usage")) {
      if (e.data.initiator !== "sub-agent") {
        peak = Math.max(peak, Number(e.data.inputTokens ?? 0));
      }
    }
    return peak;
  }

  elapsedMs(): number {
    return Date.now() - this.startedAt;
  }

  /** Compact summary for budget records and debugging. */
  summary(): Record<string, unknown> {
    const counts: Record<string, number> = {};
    for (const e of this.events) {
      counts[e.type] = (counts[e.type] ?? 0) + 1;
    }
    return {
      elapsedMs: this.elapsedMs(),
      skillsInvoked: this.skillsInvoked(),
      subagentsStarted: this.subagentsStarted().map((s) => s.agentName),
      hostTools: tally(this.hostToolStarts().map((t) => t.toolName)),
      subagentTools: tally(this.subagentToolStarts().map((t) => t.toolName)),
      compactions: this.compactions().length,
      usage: this.usage(),
      peakHostInputTokens: this.peakHostInputTokens(),
      eventCounts: counts,
    };
  }
}

function tally(names: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const n of names) {
    out[n] = (out[n] ?? 0) + 1;
  }
  return out;
}
