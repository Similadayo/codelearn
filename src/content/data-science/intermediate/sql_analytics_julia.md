# Phase 3 — Machine Learning: Advanced SQL for Analytics (Julia)

Analytics teams increasingly rely on advanced SQL for data wrangling, deep aggregations, and analytics pipelines that feed ML models. In a Julia-centric workflow, you can push heavy analytic computations into the database engine (where it’s fast and scalable) and then pull compact, analysis-ready results into Julia for modeling. This lesson covers essential advanced SQL techniques for analytics and demonstrates how to drive them from Julia using a Postgres-compatible interface.

## 1. Advanced querying with CTEs and window functions

This section introduces common table expressions (CTEs) and window functions to build readable, maintainable analytics queries and to compute analytics across time and groups.

```julia
using LibPQ, DataFrames

# Establish a connection to the analytics database (fill in your credentials)
conn = LibPQ.Connection("dbname=analytics user=analyst password=secret host=localhost port=5432")

# SQL: Use CTEs to compute monthly regional totals and a running total via a window function
qry = """
WITH regional_sales AS (
  SELECT
    region,
    date_trunc('month', order_date) AS month,
    SUM(amount) AS monthly_sales
  FROM sales_orders
  GROUP BY region, date_trunc('month', order_date)
),
regional_running_total AS (
  SELECT
    region,
    month,
    monthly_sales,
    SUM(monthly_sales) OVER (
      PARTITION BY region
      ORDER BY month
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
  FROM regional_sales
)
SELECT region, month, monthly_sales, running_total
FROM regional_running_total
ORDER BY region, month;
"""
df = DataFrame(LibPQ.execute(conn, qry))
println("Rows retrieved: ", size(df, 1))
LibPQ.close(conn)
```

### Line-by-line explanation

- Line 1-2: Import LibPQ for DB access and DataFrames for convenient results handling.
- Line 5: Create a database connection string with your environment's credentials.
- Line 8-22: Define a SQL query using two CTEs:
  - regional_sales computes monthly regional totals.
  - regional_running_total adds a running_total using a window function partitioned by region and ordered by month.
- Line 25: Execute the SQL and convert the result into a DataFrame for Julia-side analysis.
- Line 26: Print the number of rows retrieved to verify work.
- Line 27: Close the database connection to free resources.

## 2. Grouping sets and pivoting for multi-dimensional summaries

Grouping sets let you produce multiple aggregation levels in a single query, which is powerful for dashboards that require regional, product-level, and grand totals without multiple scans.

```julia
using LibPQ, DataFrames

conn = LibPQ.Connection("dbname=analytics user=analyst password=secret host=localhost")

qry = """
SELECT region,
       COALESCE(product_category, 'ALL') AS product_category,
       SUM(amount) AS total_amount
FROM sales_orders
GROUP BY GROUPING SETS ((region, product_category), (region), ())
ORDER BY region, product_category;
"""
df = DataFrame(LibPQ.execute(conn, qry))
close(conn)
```

### Line-by-line explanation

- Line 1-2: Import necessary packages.
- Line 5: Open a connection to the database.
- Line 8-16: The SQL uses GROUPING SETS to produce three levels:
  - (region, product_category): region-by-category totals
  - (region): region totals across all categories
  - (): overall grand total
  The COALESCE provides a readable label for the “all” rows.
- Line 17-18: Execute and load results into a DataFrame.
- Line 19: Close the connection.

## 3. Window functions for analytics: ranking, running totals, and moving averages

Window functions enable analytics across ordered partitions without collapsing rows, making them ideal for time-series and ranking tasks.

```julia
using LibPQ, DataFrames

conn = LibPQ.Connection("dbname=analytics user=analyst password=secret host=localhost")

qry = """
SELECT
  region,
  order_date,
  amount,
  SUM(amount) OVER (PARTITION BY region ORDER BY order_date
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS six_day_running_total,
  AVG(amount) OVER (PARTITION BY region ORDER BY order_date
      ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS six_day_running_avg,
  ROW_NUMBER() OVER (PARTITION BY region ORDER BY order_date) AS seq
FROM sales_orders
ORDER BY region, order_date;
"""
df = DataFrame(LibPQ.execute(conn, qry))
close(conn)
```

### Line-by-line explanation

- Line 1-2: Import libraries.
- Line 5: Open a DB connection.
- Line 8-16: SQL window functions:
  - six_day_running_total computes a rolling sum over the last 7 rows per region.
  - six_day_running_avg computes a running average over the same window.
  - seq assigns a sequence number per region by order_date (useful for trend analysis).
- Line 17-18: Execute and load results into a DataFrame.
- Line 19: Close the connection.

## 4. Lateral joins and analytic patterns

LATERAL joins let you apply a correlated subquery to each row of an outer query, enabling per-region, per-row analytics without duplicating data movement.

```julia
using LibPQ, DataFrames

conn = LibPQ.Connection("dbname=analytics user=analyst password=secret host=localhost")

qry = """
SELECT r.region, t.product_id, t.top_sales
FROM regions r
CROSS JOIN LATERAL (
  SELECT o.product_id, SUM(o.amount) AS top_sales
  FROM orders o
  WHERE o.region = r.region
  GROUP BY o.product_id
  ORDER BY top_sales DESC
  LIMIT 1
) t;
"""
df = DataFrame(LibPQ.execute(conn, qry))
close(conn)
```

### Line-by-line explanation

- Line 1-2: Import libraries.
- Line 5: Open a DB connection.
- Line 8-18: The SQL performs a lateral join:
  - For each region in regions, it runs a subquery (the LATERAL portion) to find the top_product by summed amount in that region.
  - LIMIT 1 ensures a single top product per region.
- Line 19-20: Execute and fetch results into a DataFrame.
- Line 21: Close the connection.

## 5. Performance and integration patterns: materialized views and indexing

Pushing heavy aggregations into the database and reusing precomputed results reduces latency for dashboards and ML pipelines.

### 5a. Create a materialized view (pre-aggregated results)

```julia
using LibPQ, DataFrames

conn = LibPQ.Connection("dbname=analytics user=analyst password=secret host=localhost")

qry = """
CREATE MATERIALIZED VIEW IF NOT EXISTS region_monthly_sales_mv AS
SELECT region,
       date_trunc('month', order_date) AS month,
       SUM(amount) AS total_amount
FROM sales_orders
GROUP BY region, date_trunc('month', order_date);
"""
LibPQ.execute(conn, qry)
close(conn)
```

### Line-by-line explanation

- Line 1-2: Import libraries.
- Line 5: Open a database connection.
- Line 8-14: SQL to create a materialized view that stores region-month totals.
- Line 15: Execute the DDL (materialized view creation).
- Line 16: Close the connection.

### 5b. Query from the materialized view (faster analytics)

```julia
using LibPQ, DataFrames

conn = LibPQ.Connection("dbname=analytics user=analyst password=secret host=localhost")

qry = """
SELECT region, month, total_amount
FROM region_monthly_sales_mv
ORDER BY region, month;
"""
df = DataFrame(LibPQ.execute(conn, qry))
close(conn)
```

### Line-by-line explanation

- Line 1-2: Import libraries.
- Line 5: Open a DB connection.
- Line 8-13: Simple projection from the pre-aggregated MV, enabling fast reads for dashboards.
- Line 14-15: Execute and load results; close the connection.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Overusing SELECT * in analytical queries
  - Bad:
    ```sql
    SELECT * FROM sales_orders;
    ```
  - Good:
    ```sql
    SELECT region, order_date, amount FROM sales_orders;
    ```
  Explanation: Explicitly listing columns reduces I/O, improves readability, and avoids breaking changes when schemas evolve.

- Pitfall 2: Misdefining window frames
  - Bad:
    ```sql
    SELECT
      region,
      order_date,
      SUM(amount) OVER (PARTITION BY region ORDER BY order_date) AS running_total
    FROM sales_orders;
    ```
  - Good:
    ```sql
    SELECT
      region,
      order_date,
      SUM(amount) OVER (
        PARTITION BY region
        ORDER BY order_date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
      ) AS running_total
    FROM sales_orders;
    ```
  Explanation: Without an explicit frame, the default for ORDER BY is RANGE, which can yield surprising results with gaps; using ROWS provides a predictable window.

- Pitfall 3: Building queries via string concatenation (SQL injection risk)
  - Bad:
    ```julia
    region = "North"
    sql = "SELECT * FROM sales_orders WHERE region = '" * region * "'"
    ```
  - Good:
    ```julia
    region = "North"
    stmt = LibPQ.prepare(conn, "SELECT * FROM sales_orders WHERE region = $1")
    df = DataFrame(LibPQ.execute(conn, stmt, (region,)))
    ```
  Explanation: Parameterized queries prevent SQL injection and help with plan caching.

- Pitfall 4: Assuming MV maintenance is free
  - Bad:
    ```sql
    CREATE MATERIALIZED VIEW region_monthly_sales_mv AS
    SELECT region, date_trunc('month', order_date) AS month, SUM(amount) AS total_amount
    FROM sales_orders
    GROUP BY region, date_trunc('month', order_date);
    ```
  - Good:
    ```sql
    CREATE MATERIALIZED VIEW IF NOT EXISTS region_monthly_sales_mv AS
    SELECT region, date_trunc('month', order_date) AS month, SUM(amount) AS total_amount
    FROM sales_orders
    GROUP BY region, date_trunc('month', order_date);
    -- Remember to regularly REFRESH MATERIALIZED VIEW region_monthly_sales_mv;
    REFRESH MATERIALIZED VIEW region_monthly_sales_mv;
    ```
  Explanation: Materialized views require refresh strategies to stay up-to-date.

## Y. Why This Matters In Real Systems — production context and real usage

- Efficiency: Pushing heavy analytics into the database leverages its optimized query planner, columnar storage, and parallelism, reducing the amount of data shuffled into the application layer.
- Reproducibility: SQL-based analytics, coupled with versioned scripts, makes experiments reproducible. Materialized views store stable aggregates that dashboards can rely on.
- Scalability: Large time-series and multi-dimensional analytics often require multi-region rollups, ranking, and lag/lead computations. SQL window functions and GROUPING SETS scale well across partitions and stored data.
- Integration with ML pipelines: Julia can extract analytics-ready results directly from SQL, feeding feature generation for models without pulling entire raw tables into memory.
- Operational hygiene: Indexes, partitioning, and MV refresh strategies become part of the data engineering discipline, ensuring dashboards stay responsive.

## Z. Study Questions — 5 recall questions

1. What is a common use case for a CTE in analytics queries?
2. How do GROUPING SETS differ from a plain GROUP BY, and what does it enable in dashboards?
3. What is the difference between ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW and a simple ORDER BY in a window function?
4. What is a LATERAL join, and when would you use it?
5. What is a materialized view, and when would you choose to use one in an analytics workflow?

## Exercise — practical multi-part coding challenge

Part A: Set up and run an advanced SQL query from Julia
- Goal: Compute weekly revenue by region using a windowed sum and verify the result.
- Steps:
  1) Connect to your Postgres-compatible database from Julia.
  2) Run a SQL query that uses a CTE to compute weekly totals and a window function to compute a rolling weekly total per region.
  3) Load the result into a DataFrame and print the top 5 rows.

Code (Part A):

```julia
using LibPQ, DataFrames

conn = LibPQ.Connection("dbname=analytics user=analyst password=secret host=localhost")

qry = """
WITH weekly AS (
  SELECT
    region,
    date_trunc('week', order_date) AS week_start,
    SUM(amount) AS weekly_total
  FROM sales_orders
  GROUP BY region, date_trunc('week', order_date)
),
region_rolling AS (
  SELECT
    region,
    week_start,
    weekly_total,
    SUM(weekly_total) OVER (
      PARTITION BY region
      ORDER BY week_start
      ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
    ) AS rolling_4week
  FROM weekly
)
SELECT region, week_start, weekly_total, rolling_4week
FROM region_rolling
ORDER BY region, week_start;
"""
df = DataFrame(LibPQ.execute(conn, qry))
println(first(df, 5))
close(conn)
```

Part B: Create and refresh a materialized view for faster dashboards
- Goal: Build a materialized view of region-month totals and refresh it periodically.
- Steps:
  1) Create the MV (if not exists).
  2) Refresh the MV on a schedule or after heavy load.
  3) Query from the MV in Julia.

Code (Part B - Create MV):

```julia
using LibPQ, DataFrames

conn = LibPQ.Connection("dbname=analytics user=analyst password=secret host=localhost")

qry = """
CREATE MATERIALIZED VIEW IF NOT EXISTS region_monthly_sales_mv AS
SELECT region,
       date_trunc('month', order_date) AS month,
       SUM(amount) AS total_amount
FROM sales_orders
GROUP BY region, date_trunc('month', order_date);
"""
LibPQ.execute(conn, qry)
close(conn)
```

Code (Part B - Query MV):

```julia
using LibPQ, DataFrames

conn = LibPQ.Connection("dbname=analytics user=analyst password=secret host=localhost")

qry = """
SELECT region, month, total_amount
FROM region_monthly_sales_mv
ORDER BY region, month;
"""
df = DataFrame(LibPQ.execute(conn, qry))
println(size(df))
close(conn)
```

Part C: Export analytics results to CSV for ML pipelines
- Goal: Persist a clean CSV of region-weekly totals for feature engineering.
- Steps:
  1) Run a SQL query to fetch weekly totals per region (as in Part A).
  2) Save results to region_weekly_totals.csv.

Code (Part C):

```julia
using LibPQ, DataFrames, CSV

conn = LibPQ.Connection("dbname=analytics user=analyst password=secret host=localhost")

qry = """
SELECT region, week_start, weekly_total
FROM (
  WITH weekly AS (
    SELECT region, date_trunc('week', order_date) AS week_start, SUM(amount) AS weekly_total
    FROM sales_orders
    GROUP BY region, date_trunc('week', order_date)
  )
  SELECT * FROM weekly
) AS w
ORDER BY region, week_start;
"""
df = DataFrame(LibPQ.execute(conn, qry))
CSV.write("region_weekly_totals.csv", df)

close(conn)
```

Notes:
- Replace connection strings with your own credentials and environment configuration.
- Depending on your environment, you may want to use a connection pool, parameterized queries, or a different Julia DB driver (e.g., ODBC.jl or LibPQ.jl variants) for performance and compatibility.
- Always validate the produced results against a trusted baseline and ensure appropriate permissions on the database for read/write operations.

If you’d like, I can tailor these examples to your exact schema (table names, column types) or adapt them to a different SQL dialect (e.g., MySQL, Snowflake) while preserving the advanced analytics concepts.