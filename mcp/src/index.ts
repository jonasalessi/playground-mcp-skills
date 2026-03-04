#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { handleSqlMetricsTool, sqlMetricsToolName, sqlMetricsToolSpec } from "./tool.js";

const server = new McpServer({
  name: "jdbc-metrics",
  version: "1.0.0",
});

server.registerTool(sqlMetricsToolName, sqlMetricsToolSpec, handleSqlMetricsTool);

async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Server error: ${message}\n`);
  process.exit(1);
});
