# WASM Troubleshooting

WebAssembly in the browser has a few constraints. Common issues and fixes:

## CORS and HTTPS

- Always prefer HTTPS-hosted files.
- Remote files must allow Cross-Origin Resource Sharing (CORS).
- If you see network errors, check DevTools > Network for blocked requests.

```sql
INSTALL httpfs; LOAD httpfs;
-- Test a simple remote fetch
SELECT COUNT(*) FROM read_csv('https://raw.githubusercontent.com/mwaskom/seaborn-data/master/tips.csv');
```

## Large files and memory

- WASM runs in a sandbox; avoid huge single-file reads.
- Prefer Parquet over CSV for repeated queries.

## ICU and autoloading

- Some locales or functions need `icu`.

```sql
LOAD icu; -- If string collation or locale features fail, try loading ICU
```

## Worker blocked or MIME type issues

- Ensure the dev server serves JS with correct MIME types (Vite handles this).
- Reload the page, clear cache if the worker fails to initialize.

## General tips

- Use `EXPLAIN` to diagnose query plans.
- Keep the browser console open for errors and stack traces.
