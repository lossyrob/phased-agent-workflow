export interface ToolCall {
  name: string;
  input: unknown;
  startedAt: number;
  endedAt?: number;
  result?: unknown;
  error?: string;
  denied?: boolean;
  stubbed?: boolean;
}

/** Records tool invocations for post-test assertions. */
export class ToolCallLog {
  readonly calls: ToolCall[] = [];

  start(name: string, input: unknown): ToolCall {
    const call: ToolCall = { name, input, startedAt: Date.now() };
    this.calls.push(call);
    return call;
  }

  end(call: ToolCall, result: unknown): void {
    call.endedAt = Date.now();
    call.result = result;
  }

  fail(call: ToolCall, error: unknown): void {
    call.endedAt = Date.now();
    call.error = error instanceof Error ? error.message : String(error);
  }

  /** Find the most recent pending (unfinished) call matching a tool name. */
  findPending(name: string): ToolCall | undefined {
    for (let i = this.calls.length - 1; i >= 0; i--) {
      if (this.calls[i].name === name && this.calls[i].endedAt == null) {
        return this.calls[i];
      }
    }
    return undefined;
  }

  /** Get all calls to a specific tool. */
  callsTo(name: string): ToolCall[] {
    return this.calls.filter((c) => c.name === name);
  }

  /** Get bash commands executed. */
  bashCommands(): string[] {
    return this.callsTo("bash")
      .map((c) => String((c.input as Record<string, unknown>)?.command ?? ""));
  }
}
