import fs from "fs";

type MetricsRecord = {
  currentTime: number;
  connectionId: number;
  executionTime: number;
  sql: string;
};

type CliArgs = {
  metrics_file_path?: string;
  min_duration_ms?: number;
  limit?: number;
  offset?: number;
};

const DEFAULT_LIMIT = 50;
const DEFAULT_OFFSET = 0;
const DEFAULT_MIN_DURATION = 0;

function parseCliArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let i = 0; i < argv.length; i += 1) {
    const raw = argv[i];
    if (!raw.startsWith("--")) {
      continue;
    }

    const [keyPart, valuePart] = raw.slice(2).split("=");
    const key = keyPart?.trim();
    const value = valuePart ?? argv[i + 1];

    if (!key) {
      continue;
    }

    if (valuePart === undefined && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      i += 1;
    }

    if (key === "metrics_file_path") {
      args.metrics_file_path = value;
      continue;
    }

    if (key === "min_duration_ms") {
      args.min_duration_ms = Number(value);
      continue;
    }

    if (key === "limit") {
      args.limit = Number(value);
      continue;
    }

    if (key === "offset") {
      args.offset = Number(value);
    }
  }

  return args;
}

function parseLine(line: string): MetricsRecord | null {
  const first = line.indexOf("|");
  if (first < 0) {
    return null;
  }

  const second = line.indexOf("|", first + 1);
  if (second < 0) {
    return null;
  }

  const third = line.indexOf("|", second + 1);
  if (third < 0) {
    return null;
  }

  const currentTimeRaw = line.slice(0, first).trim();
  const connectionIdRaw = line.slice(first + 1, second).trim();
  const executionTimeRaw = line.slice(second + 1, third).trim();
  const sql = line.slice(third + 1).trim();

  if (!currentTimeRaw || !connectionIdRaw || !executionTimeRaw) {
    return null;
  }

  const currentTime = Number(currentTimeRaw);
  const connectionId = Number(connectionIdRaw);
  const executionTime = Number(executionTimeRaw);

  if (!Number.isFinite(currentTime) || !Number.isFinite(connectionId) || !Number.isFinite(executionTime)) {
    return null;
  }

  return {
    currentTime,
    connectionId,
    executionTime,
    sql,
  };
}

function formatMarkdown(records: MetricsRecord[], limit: number, offset: number): string {
  const lines: string[] = [
    `## SQL Metrics (count: ${records.length}, limit: ${limit}, offset: ${offset})`,
    "",
  ];

  records.forEach((record, index) => {
    const timestamp = new Date(record.currentTime).toISOString();
    lines.push(`${index + 1}) ${timestamp}`);
    lines.push(`   - connection_id: ${record.connectionId}`);
    lines.push(`   - execution_time_ms: ${record.executionTime}`);
    lines.push(`   - sql: ${record.sql}`);

    if (index < records.length - 1) {
      lines.push("");
    }
  });

  return lines.join("\n");
}

function getUsage(): string {
  return [
    "Usage:",
    "  ts-node read-sql-metrics.ts --metrics_file_path=/abs/path/log.log ",
    "    [--min_duration_ms=0] [--limit=50] [--offset=0]",
  ].join("\n");
}

function run(): void {
  const cliArgs = parseCliArgs(process.argv.slice(2));
  const metricsFilePath = cliArgs.metrics_file_path;

  if (!metricsFilePath) {
    throw new Error(`metrics_file_path is required.\n${getUsage()}`);
  }

  const minDuration = Number.isFinite(cliArgs.min_duration_ms)
    ? cliArgs.min_duration_ms ?? DEFAULT_MIN_DURATION
    : DEFAULT_MIN_DURATION;
  const limit = Number.isFinite(cliArgs.limit) ? cliArgs.limit ?? DEFAULT_LIMIT : DEFAULT_LIMIT;
  const offset = Number.isFinite(cliArgs.offset) ? cliArgs.offset ?? DEFAULT_OFFSET : DEFAULT_OFFSET;

  const content = fs.readFileSync(metricsFilePath, "utf8");
  const records = content
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map(parseLine)
    .filter((record): record is MetricsRecord => record !== null)
    .filter((record) => record.executionTime >= minDuration)
    .sort((a, b) => b.currentTime - a.currentTime);

  const paged = records.slice(offset, offset + limit);
  const markdown = formatMarkdown(paged, limit, offset);
  process.stdout.write(markdown);
}

try {
  run();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}
