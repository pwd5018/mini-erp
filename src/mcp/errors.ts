export type ToolErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "INTERNAL_ERROR";

export class ToolError extends Error {
  public traceId?: string;

  constructor(public readonly code: ToolErrorCode, message: string) {
    super(message);
    this.name = "ToolError";
  }
}

export function asToolError(error: unknown): ToolError {
  return error instanceof ToolError ? error : new ToolError("INTERNAL_ERROR", "The ERP read operation failed.");
}
