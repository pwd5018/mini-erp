import { randomUUID } from "node:crypto";

export interface ToolTrace {
  traceId: string;
  toolName: string;
  input: unknown;
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  success?: boolean;
  error?: { code: string; message: string };
}

export class TraceRecorder {
  private readonly traces: ToolTrace[] = [];

  start(toolName: string, input: unknown): ToolTrace {
    const trace: ToolTrace = { traceId: `trace-${randomUUID()}`, toolName, input, startedAt: new Date().toISOString() };
    this.traces.push(trace);
    return trace;
  }

  complete(trace: ToolTrace, success: boolean, error?: { code: string; message: string }): void {
    trace.completedAt = new Date().toISOString();
    trace.durationMs = Math.max(0, Date.parse(trace.completedAt) - Date.parse(trace.startedAt));
    trace.success = success;
    if (error) trace.error = error;
  }

  list(): ToolTrace[] {
    return this.traces.map((trace) => ({ ...trace, error: trace.error ? { ...trace.error } : undefined }));
  }
}
