
# MCP

The JDBC Metrics MCP Server reads p6spy JDBC logs and exposes SQL execution metrics for slow query discovery and performance analysis.

## What it does

- Parses a p6spy log file formatted as `currentTime|connectionId|executionTime|sqlSingleLine`.
- Returns SQL metrics ordered newest-first to make recent slow queries easy to spot.
- Supports filtering by minimum execution time and pagination for large log files.

## Tool: get_sql_metrics

Reads SQL execution metrics from a log file.

# Skill
[fill out what the skill does]