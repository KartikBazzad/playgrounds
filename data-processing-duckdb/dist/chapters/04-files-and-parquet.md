# Working with CSV & Parquet

DuckDB reads CSV and Parquet efficiently.

## CSV over HTTP
```sql
INSTALL httpfs; LOAD httpfs;
CREATE OR REPLACE TABLE t AS SELECT *
FROM read_csv('https://raw.githubusercontent.com/mwaskom/seaborn-data/master/tips.csv', AUTO_DETECT=TRUE);
SELECT * FROM t LIMIT 5;
```

## Parquet over HTTP
```sql
INSTALL httpfs; LOAD httpfs;
SELECT * FROM parquet_scan('https://duckdb.org/data/tpch/lineitem.parquet') LIMIT 5;
```

## Write to Parquet (local environments)
```sql
COPY t TO 'tips.parquet' (FORMAT PARQUET);
```
