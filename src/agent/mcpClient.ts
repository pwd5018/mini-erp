import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Database } from "sql.js";
import { createReadMcpServer } from "../mcp/readServer.js";
import { createWriteMcpServer } from "../mcp/writeServer.js";
import { TraceRecorder } from "../observability/trace.js";
import type { ActorContext } from "../actions/replenishment.js";

export interface AgentMcpClient {
  call(name: string, arguments_: unknown): Promise<{ data?: unknown; traceId?: string; error?: string }>;
  close(): Promise<void>;
}

export async function createEmbeddedMcpClient(db: Database, recorder = new TraceRecorder()): Promise<{ client: AgentMcpClient; recorder: TraceRecorder }> {
  const { server } = createReadMcpServer(db, recorder);
  return connectEmbeddedMcpClient(server, recorder, "mini-erp-agent-read");
}

export async function createEmbeddedWriteMcpClient(db: Database, actor: ActorContext, recorder = new TraceRecorder()): Promise<{ client: AgentMcpClient; recorder: TraceRecorder }> {
  const { server } = createWriteMcpServer(db, actor, recorder);
  return connectEmbeddedMcpClient(server, recorder, `mini-erp-agent-write-${actor.userId}`);
}

async function connectEmbeddedMcpClient(server: import("@modelcontextprotocol/sdk/server/mcp.js").McpServer, recorder: TraceRecorder, clientName: string): Promise<{ client: AgentMcpClient; recorder: TraceRecorder }> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const sdkClient = new Client({ name: clientName, version: "0.5.0" });
  await Promise.all([server.connect(serverTransport), sdkClient.connect(clientTransport)]);
  return {
    recorder,
    client: {
      async call(name, arguments_) {
        const result = await sdkClient.callTool({ name, arguments: arguments_ as Record<string, unknown> });
        if (result.isError) {
          const text = readText(result);
          try {
            const parsed = JSON.parse(text) as { error?: unknown; traceId?: string };
            return { error: typeof parsed.error === "string" ? parsed.error : JSON.stringify(parsed.error), traceId: parsed.traceId };
          } catch { return { error: text }; }
        }
        const structured = (result as { structuredContent?: { data: unknown; traceId?: string } }).structuredContent;
        if (structured) return structured;
        return JSON.parse(readText(result)) as { data: unknown; traceId?: string };
      },
      async close() { await sdkClient.close(); await server.close(); },
    },
  };
}

function readText(result: unknown): string {
  const content = (result as { content?: Array<{ text?: string }> }).content ?? [];
  return content[0]?.text ?? "The MCP tool returned no readable result.";
}
