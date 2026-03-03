#!/usr/bin/env node

import { createReadStream } from "node:fs";
import { access, constants } from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

type SqlMetric = {
  timestamp_ms: number;
  timestamp: string;
  connection_id: string;
  execution_time_ms: number;
  sql: string;
};

type ToolOutput = {
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  next_offset: number | null;
  metrics: SqlMetric[];
};

const SqlMetricsInputSchema = z
  .object({
    metrics_file_path: z.string().min(1).describe("Absolute path to the p6spy log file"),
    min_duration_ms: z
      .number()
      .min(0)
      .default(0)
      .describe("Minimum execution time in milliseconds"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(500)
      .default(50)
      .describe("Maximum number of records to return"),
    offset: z
      .number()
      .int()
      .min(0)
      .default(0)
      .describe("Zero-based index of the first record to return"),
    response_format: z
      .nativeEnum(ResponseFormat)
      .default(ResponseFormat.MARKDOWN)
      .describe("Output format: markdown or json"),
  })
  .strict();

const SqlMetricsOutputSchema = z.object({
  count: z.number().int().min(0),
  limit: z.number().int().min(1),
  offset: z.number().int().min(0),
  has_more: z.boolean(),
  next_offset: z.number().int().min(0).nullable(),
  metrics: z.array(
    z.object({
      timestamp_ms: z.number().int(),
      timestamp: z.string(),
      connection_id: z.string(),
      execution_time_ms: z.number().int(),
      sql: z.string(),
    }),
  ),
});

type SqlMetricsInput = z.infer<typeof SqlMetricsInputSchema>;

const server = new McpServer({
  name: "jdbc-metrics",
  version: "1.0.0",
});

function validatePath(filePath: string): string | null {
  if (!path.isAbsolute(filePath)) {
    return "Error: metrics_file_path must be an absolute path.";
  }
  return null;
}

function parseMetricLine(line: string): SqlMetric | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  const firstSplit = trimmed.indexOf("|");
  if (firstSplit === -1) {
    return null;
  }

  const secondSplit = trimmed.indexOf("|", firstSplit + 1);
  if (secondSplit === -1) {
    return null;
  }

  const thirdSplit = trimmed.indexOf("|", secondSplit + 1);
  if (thirdSplit === -1) {
    return null;
  }

  const timestampMs = Number(trimmed.slice(0, firstSplit));
  const connectionId = trimmed.slice(firstSplit + 1, secondSplit);
  const executionMs = Number(trimmed.slice(secondSplit + 1, thirdSplit));
  const sql = trimmed.slice(thirdSplit + 1);

  if (!Number.isFinite(timestampMs) || !Number.isFinite(executionMs)) {
    return null;
  }

  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return {
    timestamp_ms: timestampMs,
    timestamp: date.toISOString(),
    connection_id: connectionId,
    execution_time_ms: executionMs,
    sql,
  };
}

async function readMetrics(filePath: string, minDurationMs: number): Promise<SqlMetric[]> {
  await access(filePath, constants.R_OK);

  const stream = createReadStream(filePath, { encoding: "utf8" });
  const reader = readline.createInterface({
    input: stream,
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  const metrics: SqlMetric[] = [];

  for await (const line of reader) {
    const metric = parseMetricLine(line);
    if (!metric) {
      continue;
    }
    if (metric.execution_time_ms < minDurationMs) {
      continue;
    }
    metrics.push(metric);
  }

  return metrics;
}

function paginateMetrics(
  metrics: SqlMetric[],
  limit: number,
  offset: number,
): { page: SqlMetric[]; hasMore: boolean; nextOffset: number | null } {
  const page = metrics.slice(offset, offset + limit);
  const hasMore = offset + page.length < metrics.length;
  const nextOffset = hasMore ? offset + page.length : null;

  return { page, hasMore, nextOffset };
}

function buildOutput(
  metrics: SqlMetric[],
  limit: number,
  offset: number,
  hasMore: boolean,
  nextOffset: number | null,
): ToolOutput {
  return {
    count: metrics.length,
    limit,
    offset,
    has_more: hasMore,
    next_offset: nextOffset,
    metrics,
  };
}

function formatMarkdown(output: ToolOutput): string {
  const lines = [
    `## SQL Metrics (count: ${output.count}, limit: ${output.limit}, offset: ${output.offset})`,
  ];

  if (output.metrics.length === 0) {
    return lines.join("\n");
  }

  lines.push("");

  output.metrics.forEach((metric, index) => {
    lines.push(`${index + 1}) ${metric.timestamp}`);
    lines.push(`   - connection_id: ${metric.connection_id}`);
    lines.push(`   - execution_time_ms: ${metric.execution_time_ms}`);
    lines.push(`   - sql: ${metric.sql}`);
    if (index < output.metrics.length - 1) {
      lines.push("");
    }
  });

  return lines.join("\n");
}

function buildError(message: string): {
  isError: true;
  content: { type: "text"; text: string }[];
} {
  return {
    isError: true,
    content: [{ type: "text", text: message }],
  };
}

function detectErrno(error: unknown): string | null {
  if (!error || typeof error !== "object") {
    return null;
  }
  if (!("code" in error)) {
    return null;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

server.registerTool(
  "get_sql_metrics",
  {
    title: "Get SQL Metrics",
    description:
      "Read JDBC query performance metrics from a p6spy log file, ordered newest first, with optional filtering and pagination.",
    inputSchema: SqlMetricsInputSchema,
    outputSchema: SqlMetricsOutputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  async (params: SqlMetricsInput) => {
    const pathError = validatePath(params.metrics_file_path);
    if (pathError) {
      return buildError(pathError);
    }

    try {
      const metrics = await readMetrics(params.metrics_file_path, params.min_duration_ms);
      const ordered = [...metrics].reverse();
      const { page, hasMore, nextOffset } = paginateMetrics(ordered, params.limit, params.offset);
      const output = buildOutput(page, params.limit, params.offset, hasMore, nextOffset);
      const text =
        params.response_format === ResponseFormat.JSON
          ? JSON.stringify(output, null, 2)
          : formatMarkdown(output);

      return {
        content: [{ type: "text", text }],
        structuredContent: output,
      };
    } catch (error) {
      const code = detectErrno(error);
      if (code === "ENOENT") {
        return buildError(
          "Error: metrics_file_path does not exist. Provide an absolute path to a p6spy log file.",
        );
      }
      if (code === "EACCES") {
        return buildError(
          "Error: permission denied reading metrics_file_path. Check file permissions.",
        );
      }
      if (error instanceof Error) {
        return buildError(`Error: ${error.message}`);
      }
      return buildError("Error: unexpected failure reading metrics.");
    }
  },
);

async function startServer(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

startServer().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Server error: ${message}\n`);
  process.exit(1);
});
