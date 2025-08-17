# Data Quality with DuckDB

Practical checks and patterns to assess and improve data quality directly in DuckDB.

## Quick profiling

```sql
-- Row count
SELECT COUNT(*) AS rows FROM people;

-- Column completeness (NULL counts)
SELECT
  SUM(CASE WHEN name IS NULL THEN 1 ELSE 0 END) AS name_nulls,
  SUM(CASE WHEN age IS NULL THEN 1 ELSE 0 END) AS age_nulls,
  SUM(CASE WHEN city IS NULL THEN 1 ELSE 0 END) AS city_nulls
FROM people;

-- Distinct values
SELECT COUNT(DISTINCT city) AS distinct_cities FROM people;

-- Min/Max
SELECT MIN(age) AS min_age, MAX(age) AS max_age FROM people;
```

## Outlier scans

```sql
-- Simple invalid range checks
SELECT
  SUM(CASE WHEN age < 0 THEN 1 ELSE 0 END) AS age_negative,
  SUM(CASE WHEN age > 130 THEN 1 ELSE 0 END) AS age_over_130
FROM people;
```

## Consistency via views

```sql
-- Create a view encapsulating business rules
CREATE OR REPLACE VIEW people_valid AS
SELECT *
FROM people
WHERE age IS NOT NULL AND age BETWEEN 0 AND 120
  AND name IS NOT NULL AND LENGTH(TRIM(name)) > 0;

-- Consumers can select from people_valid
SELECT * FROM people_valid LIMIT 10;
```

## One-shot quality report

```sql
-- Summarized checks in a single result set
SELECT 'row_count' AS check, COUNT(*)::BIGINT AS n FROM people
UNION ALL
SELECT 'age_missing', COUNT(*) FROM people WHERE age IS NULL
UNION ALL
SELECT 'age_negative', COUNT(*) FROM people WHERE age < 0
UNION ALL
SELECT 'city_missing', COUNT(*) FROM people WHERE city IS NULL;
```

## Tips

- Start with quick profiling, then iterate with targeted checks.
- Store reusable rules in `VIEW`s.
- Export reports to CSV/Parquet for sharing or historical tracking.
