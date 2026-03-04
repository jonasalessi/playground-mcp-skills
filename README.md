
# MCP vs Skill

## Overview
This project is an experimental playground designed to compare the usage, implementation, and Developer Experience (DX) of using the **Model Context Protocol (MCP)** versus **AI Agent Skills**. Both approaches implement the exact same functionality: parsing p6spy JDBC execution metrics from log files to help discover slow queries.

# MCP

The JDBC Metrics MCP Server reads p6spy JDBC logs and exposes SQL execution metrics for slow query discovery and performance analysis.

## What it does

- Parses a p6spy log file formatted as `currentTime|connectionId|executionTime|sqlSingleLine`.
- Returns SQL metrics ordered newest-first to make recent slow queries easy to spot.
- Supports filtering by minimum execution time and pagination for large log files.

## Tool: get_sql_metrics

Reads SQL execution metrics from a log file.

# Skill

The JDBC Metrics Skill provides instructions and a reference script to read a p6spy JDBC metrics log file and return markdown-formatted query performance metrics.

## What it does

- Parses a p6spy log file formatted as `currentTime|connectionId|executionTime|sqlSingleLine`.
- Returns SQL metrics formatted as markdown, ordered newest-first to make recent slow queries easy to spot.
- Supports filtering by minimum duration (`min_duration_ms`) and pagination (`limit`, `offset`) for large log files.
- Skips malformed log lines without failing the request.

## Script: read-sql-metrics.ts

Uses `./scripts/read-sql-metrics.ts` as the reference implementation to read SQL execution metrics and produce markdown output for LLM analysis.