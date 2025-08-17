# Playground Tutorial

1. Click "Load Sample". This creates `people` from `/data/people.csv`.
2. Run:
```sql
SELECT city, COUNT(*) AS n
FROM people
GROUP BY city
ORDER BY n DESC;
```
3. Try filtering by age:
```sql
SELECT * FROM people WHERE age BETWEEN 25 AND 35 LIMIT 10;
```
4. Create a view:
```sql
CREATE OR REPLACE VIEW adults AS
SELECT * FROM people WHERE age >= 18;
SELECT COUNT(*) FROM adults;
```
