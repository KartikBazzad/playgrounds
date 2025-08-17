# SQL Basics in DuckDB

DuckDB supports standard SQL. Try these examples in the Playground:

## Select and Filter
```sql
SELECT * FROM people WHERE age >= 30 ORDER BY age DESC LIMIT 5;
```

## Aggregations
```sql
SELECT city, COUNT(*) AS n, AVG(age) AS avg_age
FROM people
GROUP BY city
ORDER BY n DESC;
```

## String functions
```sql
SELECT name, UPPER(city) AS city_upper
FROM people
LIMIT 5;
```

## Joins
Create another small table and join it:
```sql
CREATE OR REPLACE TABLE cities(city TEXT, country TEXT);
INSERT INTO cities VALUES
  ('Bengaluru','India'),
  ('Delhi','India'),
  ('Mumbai','India');

SELECT p.name, p.city, c.country
FROM people p
LEFT JOIN cities c
ON p.city = c.city
LIMIT 10;
```
