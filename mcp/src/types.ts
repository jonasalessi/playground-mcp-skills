import { z } from "zod";

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json",
}

export type SqlMetric = {
  timestamp_ms: number;
  timestamp: string;
  connection_id: string;
  execution_time_ms: number;
  sql: string;
};

export type ToolOutput = {
  count: number;
  limit: number;
  offset: number;
  has_more: boolean;
  next_offset: number | null;
  metrics: SqlMetric[];
};

export const SqlMetricsInputSchema = z
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

export const SqlMetricsOutputSchema = z.object({
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

export type SqlMetricsInput = z.infer<typeof SqlMetricsInputSchema>;
