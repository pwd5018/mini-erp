import { readFileSync } from "node:fs";
import initSqlJs from "sql.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createReadMcpServer } from "./readServer.js";

const SQL = await initSqlJs();
const db = new SQL.Database(new Uint8Array(readFileSync("data/mini-erp.db")));
const { server } = createReadMcpServer(db);
await server.connect(new StdioServerTransport());
