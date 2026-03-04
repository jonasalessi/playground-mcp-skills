# JDBC Metrics Reference

## Log Line Format

`currentTime|connectionId|executionTime|sqlSingleLine`

```text
1709424000000|42|15|SELECT id, name FROM users WHERE id = 1
```

## Parsing Rules

- Split on the first three `|` characters only.
- Treat remaining `|` characters as part of `sqlSingleLine`.
- Skip malformed lines without erroring.
- Filter by `min_duration_ms`.
- Order results newest to oldest.
- Apply `offset` and `limit` after filtering and ordering.

## Output Template

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

## Script Usage

```bash
npx ts-node .agents/skills/jdbc-metrics/scripts/read-sql-metrics.ts \
  --metrics_file_path=/abs/path/p6spy.log \
  --min_duration_ms=0 --limit=50 --offset=0
```
