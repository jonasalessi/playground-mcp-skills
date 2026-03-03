# Product Requirements Document: JDBC Metrics Skill

## Overview
This skill reads a p6spy JDBC metrics log file and formats query performance metrics as markdown for LLM analysis. It focuses only on markdown output.

## Data Format
The log file is written by **p6spy** using a custom pipe-delimited format. Each entry is a single line.

Configured format:
`customLogMessageFormat=%(currentTime)|%(connectionId)|%(executionTime)|%(sqlSingleLine)`

Fields in order:
`currentTime|connectionId|executionTime|sqlSingleLine`

Example:
```text
1709424000000|42|15|SELECT id, name FROM users WHERE id = 1
```

## Inputs
The script accepts the following parameters:
- `metrics_file_path` (string, required): Absolute path to the p6spy log file.
- `min_duration_ms` (number, optional): Minimum execution time in milliseconds. Default: 0.
- `limit` (number, optional): Maximum records to return. Default: 50.
- `offset` (number, optional): Zero-based index of the first record for pagination. Default: 0.

## Output (Markdown Only)
The script returns markdown in this exact format:
```text
## SQL Metrics (count: 2, limit: 50, offset: 0)

1) 2024-03-02T00:00:00.000Z
   - connection_id: 42
   - execution_time_ms: 15
   - sql: SELECT id, name FROM users WHERE id = 1

2) 2024-03-02T00:00:12.000Z
   - connection_id: 43
   - execution_time_ms: 122
   - sql: SELECT * FROM orders WHERE status = 'PENDING'
```

## Script Behavior
- Use NodeJS using `mcp/src/index.ts` as reference. 
- Read the log file from `metrics_file_path`.
- Parse each line into 4 fields; if additional `|` characters appear, treat them as part of `sqlSingleLine`.
- Skip malformed lines without failing the request.
- Filter by `min_duration_ms`.
- Order results from newest to oldest (most recent entries first).
- Apply `offset` and `limit` after filtering and ordering.
- Render output in the markdown format above.

## Acceptance Criteria
- Produces markdown-only output matching the required template.
- Skips malformed lines without erroring the run.
- Uses newest-first ordering.
- Applies filtering before pagination.
- Honors `limit` and `offset` defaults when not provided.
