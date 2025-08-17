# SQL Cheat Sheet (DuckDB)

Common patterns you'll use frequently.

## Creating tables

```sql
CREATE OR REPLACE TABLE t AS
SELECT * FROM read_csv('https://example.com/data.csv', AUTO_DETECT=TRUE);
```

## Filtering and ordering

```sql
SELECT * FROM t
WHERE col IS NOT NULL AND col > 10
ORDER BY col DESC
LIMIT 20;
```

## Aggregations

```sql
SELECT key, COUNT(*) AS n, SUM(value) AS total, AVG(value) AS avg
FROM t
GROUP BY key
HAVING COUNT(*) > 5
ORDER BY total DESC;
```

## Joins

```sql
SELECT a.id, a.name, b.score
FROM a
LEFT JOIN b ON a.id = b.id;
```

## Window functions

```sql
SELECT id, value,
       ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY value DESC) AS rn
FROM t;
```

## Parquet & CSV

```sql
INSTALL httpfs; LOAD httpfs;
SELECT * FROM parquet_scan('https://duckdb.org/data/tpch/lineitem.parquet') LIMIT 5;
SELECT * FROM read_csv('https://raw.githubusercontent.com/mwaskom/seaborn-data/master/tips.csv', AUTO_DETECT=TRUE, SAMPLE_SIZE=-1) LIMIT 5;
```
