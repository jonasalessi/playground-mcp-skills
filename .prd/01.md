# Product Requirements Document: JDBC Metrics MCP Server

## Overview
An MCP (Model Context Protocol) server designed to read and expose query performance metrics from a JDBC DataSource log file. This server allows an LLM to analyze SQL query performance, identify slow queries, and monitor database execution patterns.

## Data Format
The metrics are appended to a log file by **p6spy** using a custom format. Each log entry is a single line, separated by the pipe character (`|`).

Configured format:
`customLogMessageFormat=%(currentTime)|%(connectionId)|%(executionTime)|%(sqlSingleLine)`

The format includes the following fields in order:
`currentTime|connectionId|executionTime|sqlSingleLine`

**Example:**
```text
1709424000000|42|15|SELECT id, name FROM users WHERE id = 1
```

For the purpose of capturing performance metrics, the MCP server will primarily parse:
- **`currentTime`**: The epoch timestamp in milliseconds of when the operation occurred.
- **`connectionId`**: The JDBC connection identifier associated with the execution.
- **`executionTime`**: The duration of the query execution in milliseconds.
- **`sqlSingleLine`**: The executed SQL rendered as a single line.

## Tools

### 1. `get_sql_metrics`
Retrieves SQL execution metrics from the configured log file, primarily filtering by execution duration to find slow queries.

Behavior:
- Reads metrics from `metrics_file_path` (a p6spy log file using the configured custom format).
- Results are ordered from newest to oldest (most recent entries first) to make it easy to find current slow queries.
- Malformed lines are skipped (the tool should not fail the whole request because of a partial/corrupt log line).
- Parsing splits the line into 4 fields; if additional `|` characters appear in the SQL, they are treated as part of the SQL field.

**Input Schema:**
- `metrics_file_path` (string, required): The absolute path to the log file containing the JDBC performance metrics.
- `min_duration_ms` (number, optional): The minimum execution time in milliseconds. If provided, the tool only returns queries that took longer than this duration. Default: 0 (returns all).
- `limit` (number, optional): Maximum number of relevant records to return to avoid context overflow. Default: 50.
- `offset` (number, optional): Zero-based index of the first record to return for pagination. Default: 0.
- `response_format` (string, optional): Output format. Allowed: `"markdown"` (default) or `"json"`.

**Output:**
The tool supports both structured JSON and human-readable Markdown output.

- **JSON format** (`response_format="json"`):
  ```json
  {
    "count": 2,
    "limit": 50,
    "offset": 0,
    "has_more": false,
    "next_offset": null,
    "metrics": [
      {
        "timestamp_ms": 1709424000000,
        "timestamp": "2024-03-02T00:00:00.000Z",
        "connection_id": "42",
        "execution_time_ms": 15,
        "sql": "SELECT id, name FROM users WHERE id = 1"
      },
      {
        "timestamp_ms": 1709424012000,
        "timestamp": "2024-03-02T00:00:12.000Z",
        "connection_id": "43",
        "execution_time_ms": 122,
        "sql": "SELECT * FROM orders WHERE status = 'PENDING'"
      }
    ]
  }
  ```

  Pagination semantics:
  - `count`: Number of records returned in the current page.
  - `limit`: Effective page size used for the query.
  - `offset`: Zero-based index used to fetch the current page.
  - `has_more`: `true` when additional records exist beyond this page.
  - `next_offset`: `offset + count` when `has_more=true`; otherwise `null`.

- **Markdown format** (`response_format="markdown"`, default):
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

## Documentation
Create `README.md` that documents how to install, run, and use this MCP server, including end-to-end setup for producing p6spy logs.

README requirements:
- Explain what the server does and what problem it solves (slow query discovery from a JDBC DataSource).
- List available tools and their schemas (at minimum: `get_sql_metrics`).
- Provide at least 2 copy/paste usage examples for `get_sql_metrics` (one "all queries", one "slow queries" via `min_duration_ms`).
- Document tool semantics that affect results: ordering (newest first), pagination (`limit`/`offset`), and how malformed lines are handled (skipped).
- Document how to run the server locally (build + run) and how to configure an MCP client to launch it.
- Add a troubleshooting section: missing log file, permission errors, empty output, and log rotation behavior.

p6spy setup section (must be included in README):
- Add the p6spy dependency. In the provided Spring example it is in `examples/jpa-playground/build.gradle.kts` (`implementation("p6spy:p6spy:3.9.1")`).
- Configure the DataSource to use the p6spy driver and URL prefix. Example (Spring):
  - `examples/jpa-playground/src/main/resources/application.properties`
    - `spring.datasource.url=jdbc:p6spy:h2:mem:testdb`
    - `spring.datasource.driverClassName=com.p6spy.engine.spy.P6SpyDriver`
- Configure p6spy to log to a file using the required custom format. Example:
  - `examples/jpa-playground/src/main/resources/spy.properties`
    - `appender=com.p6spy.engine.spy.appender.FileLogger`
    - `logfile=database.log`
    - `logMessageFormat=com.p6spy.engine.spy.appender.CustomLineFormat`
    - `customLogMessageFormat=%(currentTime)|%(connectionId)|%(executionTime)|%(sqlSingleLine)`
- Clearly state where the log file is written (relative vs absolute paths) and recommend using an absolute path in production.
