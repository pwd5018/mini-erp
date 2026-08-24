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

export interface TraceEvent {
  eventId: string;
  type: string;
  summary: string;
  details?: unknown;
  recordedAt: string;
}

export class TraceRecorder {
  private readonly traces: ToolTrace[] = [];
  private readonly events: TraceEvent[] = [];

  recordEvent(type: string, summary: string, details?: unknown): TraceEvent {
    const event: TraceEvent = { eventId: `event-${randomUUID()}`, type, summary, details, recordedAt: new Date().toISOString() };
    this.events.push(event);
    return { ...event };
  }

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

  listEvents(): TraceEvent[] {
    return this.events.map((event) => ({ ...event }));
  }
}
