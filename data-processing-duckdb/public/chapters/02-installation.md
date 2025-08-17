# Getting Started (Browser & Local)

You can use DuckDB in two primary ways:

## In the Browser (WASM)
- No install required. This site uses `@duckdb/duckdb-wasm`.
- Data is loaded from URLs (e.g., CSV/Parquet over HTTP).
- Great for learning and sharing small demos.

Quick start:
1. Open the Playground.
2. Click "Load Sample" to create a `people` table.
3. Run SQL queries directly.

## Local (CLI)
Install DuckDB CLI on macOS:
```bash
brew install duckdb
```

Basic usage:
```bash
duckdb
-- inside the prompt:
CREATE TABLE t AS SELECT 1 AS x;
SELECT * FROM t;
.quit
```

## Python & Node Bindings
- Python: `pip install duckdb`
- Node: `npm i duckdb`

Bindings allow reading local files, S3, GCS, and more.
