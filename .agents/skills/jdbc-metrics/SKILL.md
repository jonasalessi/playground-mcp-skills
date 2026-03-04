---
name: jdbc-metrics
description: Parse p6spy JDBC metrics logs and render newest-first markdown metrics with filtering and pagination.
---

# JDBC Metrics Skill

## Overview

Use this skill to read a p6spy JDBC metrics log file and return markdown-only query performance metrics. Focus on the exact markdown template and newest-first ordering.

## When to Use

- Extract query timing metrics from a p6spy log file.
- Filter by minimum duration and paginate results.
- Produce markdown output for LLM analysis.

## How to Use

- Use `./scripts/read-sql-metrics.ts` as the reference implementation.
- Provide inputs:
  - `metrics_file_path` (absolute path, required)
  - `min_duration_ms` (default 0)
  - `limit` (default 50)
  - `offset` (default 0)
- Return markdown only and match the template in `./references/format.md`.
- Skip malformed log lines without failing the request.
- Order results from newest to oldest, then apply `offset` and `limit`.

## Implementation Notes

- Treat extra `|` characters as part of `sqlSingleLine`.

## References

- Output template and parsing rules: `./references/format.md`
- Reference script: `./scripts/read-sql-metrics.ts`
