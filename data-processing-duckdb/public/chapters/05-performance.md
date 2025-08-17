# Performance Tips

- Use column projection: select only needed columns.
- Prefer Parquet over CSV for repeated reads.
- Use filters early to reduce data scanned.
- Avoid unnecessary casts; keep types consistent.
- Use `EXPLAIN` to inspect plans.

Examples:
```sql
EXPLAIN SELECT city, COUNT(*) FROM people GROUP BY city;
```

Vectorized execution and columnar storage make DuckDB fast for analytics workloads.
