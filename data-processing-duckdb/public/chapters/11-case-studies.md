# Case Studies & Patterns

Practical examples to solidify concepts.

## 1) Log analysis (CSV)

- Goal: count requests per status code.

```sql
INSTALL httpfs; LOAD httpfs;
CREATE OR REPLACE TABLE logs AS
SELECT * FROM read_csv('https://raw.githubusercontent.com/wittydeveloper/elk-datasets/master/logstash-tutorial-dataset.log',
  columns={
    message: 'TEXT'
  },
  delim='\n', header=false);

-- Extract status code (simple pattern example)
CREATE OR REPLACE VIEW status AS
SELECT regexp_extract(message, '(?:\s|\")([0-9]{3})(?:\s|\")', 1) AS code
FROM logs;

SELECT code, COUNT(*) AS n
FROM status
GROUP BY code
ORDER BY n DESC;
```

## 2) Sales analytics (Parquet)

- Goal: top categories by revenue.

```sql
INSTALL httpfs; LOAD httpfs;
CREATE OR REPLACE VIEW sales AS
SELECT * FROM parquet_scan('https://duckdb.org/data/tpch/lineitem.parquet');

SELECT l_returnflag AS flag, SUM(l_extendedprice * (1 - l_discount)) AS revenue
FROM sales
GROUP BY flag
ORDER BY revenue DESC;
```

## 3) Data quality checks

- Goal: detect missing values and invalid ranges.

```sql
-- Example on local sample 'people' table
SELECT 'age_missing' AS check, COUNT(*) AS n FROM people WHERE age IS NULL
UNION ALL
SELECT 'age_negative', COUNT(*) FROM people WHERE age < 0
UNION ALL
SELECT 'city_missing', COUNT(*) FROM people WHERE city IS NULL;
```

## Patterns

- Read remote files via `httpfs` and cache small derived tables for repeated queries.
- Prefer Parquet for analytics; use CSV only for ingest or small demos.
- Encapsulate logic in `VIEW`s for readability and reuse.
