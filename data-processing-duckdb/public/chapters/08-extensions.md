# Extensions in WASM

DuckDB-Wasm supports many core and community extensions, with a few WASM-specific differences:

- Extensions are lazily fetched and loaded on demand in the browser
- HTTP requests are upgraded to HTTPS and must pass CORS checks
- Some extensions (e.g., ICU) may require explicit `LOAD`

## Common extensions

```sql
-- HTTP access for CSV/Parquet over the web
INSTALL httpfs; LOAD httpfs;

-- JSON support (autoloads in most cases)
LOAD json;

-- Parquet is autoloaded when used via read_parquet/parquet_scan
SELECT * FROM parquet_scan('https://duckdb.org/data/tpch/lineitem.parquet') LIMIT 5;
```

## Check loaded extensions

```sql
SELECT * FROM duckdb_extensions() WHERE loaded;
```

## Tips

- Use a CDN or servers with proper CORS headers
- Prefer HTTPS URLs
- Cache is your friend: the worker and wasm binaries are cached by the browser
