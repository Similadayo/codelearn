# Track: Data Science & AI — Module: Phase 3 — Machine Learning — Topic: Advanced SQL for Analytics (Python Data Stack)

Compelling introductory paragraph: In data science and analytics, SQL remains the backbone for data extraction, transformation, and aggregation at scale. This lesson dives into advanced SQL techniques tailored for analytics workloads and shows how to leverage them from a Python data stack. You'll learn window functions, time-series bucketing, powerful joins, CTEs, and practical patterns that scale in production—from dashboards to data warehouses. Mastery here accelerates feature engineering, cohort analyses, and robust data pipelines that feed machine learning models and business dashboards.

## 1. Windowed Aggregations and Complex Analytics

In advanced analytics, window functions let you compute metrics over slices of data without collapsing it. You can create moving sums, rankings, percentiles, and cumulative metrics per group, which are essential for feature engineering and cohort analysis.

```sql
-- Windowed rolling spend per user over the last 30 days
WITH daily_sales AS (
  SELECT
    o.user_id,
    date_trunc('day', o.order_date) AS day,
    SUM(o.total_amount) AS day_total
  FROM orders o
  GROUP BY o.user_id, day
)
SELECT
  user_id,
  day,
  day_total,
  SUM(day_total) OVER (
    PARTITION BY user_id
    ORDER BY day
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) AS rolling_30d_spend,
  AVG(day_total) OVER (
    PARTITION BY user_id
    ORDER BY day
    ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
  ) AS rolling_30d_avg
FROM daily_sales
ORDER BY user_id, day;
```

### Line-by-line explanation
- WITH daily_sales AS (...): Define a CTE to compute daily totals per user.
- SELECT o.user_id, date_trunc('day', o.order_date) AS day, SUM(o.total_amount) AS day_total: For each user, bucket orders by calendar day and sum the total amount.
- FROM orders o GROUP BY o.user_id, day: Aggregate at the granularity of (user_id, day).
- SELECT user_id, day, day_total, SUM(day_total) OVER (...): Compute a rolling 30-day spend per user using a window function.
- PARTITION BY user_id ORDER BY day ROWS BETWEEN 29 PRECEDING AND CURRENT ROW: Define a 30-day window (including the current day) per user.
- AS rolling_30d_spend: Name of the rolling sum column.
- AVG(day_total) OVER (...): Compute the moving average over the same window for smoothing.
- FROM daily_sales ORDER BY user_id, day: Return results in a stable, readable order.

## 2. Time-series Analytics and Date Functions

Time-series analytics require predictable bucketing and gap handling. Date functions like date_trunc, time_bucket (where supported), and gap-filling with generate_series are essential for dashboards and anomaly detection.

```sql
-- Daily revenue by day, with padding for missing days in a 90-day window
WITH daily AS (
  SELECT
    date_trunc('day', order_date) AS day,
    SUM(total_amount) AS revenue
  FROM orders
  WHERE order_date >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY day
),
fill AS (
  SELECT generate_series(
           (SELECT MIN(day) FROM daily),
           (SELECT MAX(day) FROM daily),
           INTERVAL '1 day'
         ) AS day
)
SELECT
  f.day,
  COALESCE(d.revenue, 0) AS daily_revenue
FROM fill f
LEFT JOIN daily d ON d.day = f.day
ORDER BY f.day;
```

### Line-by-line explanation
- WITH daily AS (...): Compute revenue per day for the last 90 days.
- date_trunc('day', order_date) AS day: Normalize timestamps to calendar days.
- WHERE order_date >= CURRENT_DATE - INTERVAL '90 days': Limit to the last 90 days.
- GROUP BY day: Aggregate by day.
- fill AS (...): Create a complete series of days from the min to max observed day.
- SELECT generate_series(...): Build a contiguous sequence of days.
- COALESCE(d.revenue, 0) AS daily_revenue: Replace missing days with zero revenue.
- LEFT JOIN daily d ON d.day = f.day: Attach actual data where present, keeping all days.
- ORDER BY f.day: Ensure chronological results.

## 3. Joins, Lateral, and Advanced Set Operations

Advanced joins and lateral constructs enable per-row subqueries, top-N analytics, and cross-table correlations without exploding query complexity.

```sql
-- Top 20 products by 30-day sales using a lateral join
SELECT p.product_id, p.name,
       COALESCE(t.total_sales, 0) AS total_sales_last_30d
FROM products p
LEFT JOIN LATERAL (
  SELECT SUM(oi.quantity * oi.price) AS total_sales
  FROM order_items oi
  JOIN orders o ON oi.order_id = o.id
  WHERE oi.product_id = p.product_id
    AND o.order_date >= CURRENT_DATE - INTERVAL '30 days'
) t ON true
ORDER BY total_sales_last_30d DESC
LIMIT 20;
```

### Line-by-line explanation
- FROM products p: Start with product catalog.
- LEFT JOIN LATERAL (... ) t ON true: Attach a per-product subquery that can reference the outer row (p.product_id).
- SELECT SUM(oi.quantity * oi.price) AS total_sales: Compute total sales for the product in the last 30 days.
- FROM order_items oi JOIN orders o ON oi.order_id = o.id: Join to orders to filter by date.
- WHERE oi.product_id = p.product_id AND o.order_date >= CURRENT_DATE - INTERVAL '30 days': Correlate by product and limit to a 30-day window.
- ORDER BY total_sales_last_30d DESC LIMIT 20: Show the top 20 products by recent sales.

## 4. Subqueries, CTEs, and Performance Patterns

Structured queries with CTEs improve readability and can enable materialization in certain engines, aiding performance on large datasets and complex pipelines.

```sql
-- Readable decomposition with CTEs; materialization is engine-dependent
WITH recent_orders AS (
  SELECT id, user_id, total_amount, order_date
  FROM orders
  WHERE order_date >= CURRENT_DATE - INTERVAL '90 days'
),
customer_totals AS (
  SELECT user_id, SUM(total_amount) AS total_spend
  FROM recent_orders
  GROUP BY user_id
)
SELECT cu.user_id, cu.total_spend
FROM customer_totals cu
ORDER BY cu.total_spend DESC
LIMIT 100;
```

### Line-by-line explanation
- WITH recent_orders AS (...): Reset the scope to the 90-day window to reduce repeated filtering.
- SELECT id, user_id, total_amount, order_date FROM orders ...: Capture essential order fields.
- WHERE order_date >= CURRENT_DATE - INTERVAL '90 days': Filter to recent orders.
- customer_totals AS (...): Aggregate total spend by user from the filtered set.
- SELECT cu.user_id, cu.total_spend FROM customer_totals cu: Produce a leaderboard of top spenders.
- ORDER BY cu.total_spend DESC LIMIT 100: Retrieve the top 100 customers by spend.

Optionally, you can inspect a plan:
```sql
EXPLAIN ANALYZE
WITH recent_orders AS (
  SELECT id, user_id, total_amount, order_date
  FROM orders
  WHERE order_date >= CURRENT_DATE - INTERVAL '90 days'
),
customer_totals AS (
  SELECT user_id, SUM(total_amount) AS total_spend
  FROM recent_orders
  GROUP BY user_id
)
SELECT cu.user_id, cu.total_spend
FROM customer_totals cu
ORDER BY cu.total_spend DESC
LIMIT 100;
```

### Line-by-line explanation
- EXPLAIN ANALYZE: Request a detailed execution plan to evaluate performance characteristics and bottlenecks.

## 5. Integrating SQL with the Python Data Stack

Bringing SQL into Python enables end-to-end analytics and feature engineering pipelines that feed dashboards and ML workflows. Use SQLAlchemy for connections, pandas for data frames, and JIT transforms when appropriate.

```python
import pandas as pd
from sqlalchemy import create_engine

# Replace with your actual connection string
engine = create_engine("postgresql://username:password@host:5432/database")

# Example: daily revenue per day
query = """
SELECT date_trunc('day', order_date) AS day,
       SUM(total_amount) AS daily_revenue
FROM orders
GROUP BY day
ORDER BY day;
"""
df = pd.read_sql(query, engine)
print(df.head())
```

### Line-by-line explanation
- import pandas as pd and from sqlalchemy import create_engine: Bring in the data handling and DB connection libraries.
- engine = create_engine(...): Establish a connection pool to the PostgreSQL database. Replace with your credentials.
- query = """ ... """: Define a SQL query to compute daily revenue, suitable for loading into a DataFrame.
- df = pd.read_sql(query, engine): Execute the query and read results into a pandas DataFrame.
- print(df.head()): Quick inspection of the first rows of the result.

## X. Common Beginner Mistakes

- Bad: SELECT * with no filtering or inappropriate window framing
  - Bad:
    ```sql
    SELECT * FROM orders;
    ```
  - Good:
    ```sql
    SELECT id, order_date, total_amount FROM orders WHERE order_date >= CURRENT_DATE - INTERVAL '30 days';
    ```
- Bad: Building queries with string concatenation in Python (risk of SQL injection)
  - Bad:
    ```python
    user_id = 123
    query = "SELECT * FROM orders WHERE user_id = " + str(user_id)
    df = pd.read_sql(query, engine)
    ```
  - Good (parameterized):
    ```python
    from sqlalchemy import text
    user_id = 123
    query = text("SELECT * FROM orders WHERE user_id = :uid")
    df = pd.read_sql(query, engine, params={"uid": user_id})
    ```
- Bad: Relying on N+1 queries for analytics-heavy joins
  - Bad:
    ```sql
    SELECT * FROM users;
    -- For each user, fetch latest order in separate query (N queries)
    ```
  - Good (set-based join):
    ```sql
    SELECT u.user_id, o.id AS latest_order
    FROM users u
    LEFT JOIN LATERAL (
      SELECT id
      FROM orders
      WHERE orders.user_id = u.user_id
      ORDER BY order_date DESC
      LIMIT 1
    ) o ON true;
    ```
- Bad: Skipping time zone handling for timestamps
  - Bad:
    ```sql
    SELECT * FROM events WHERE event_time >= '2024-01-01';
    ```
  - Good:
    ```sql
    SELECT * FROM events WHERE event_time AT TIME ZONE 'UTC' >= TIMESTAMP '2024-01-01 00:00:00+00';
    ```
- Bad: Omitting explicit column lists leading to schema drift
  - Bad:
    ```sql
    SELECT *
    FROM orders
    JOIN customers USING (customer_id);
    ```
  - Good:
    ```sql
    SELECT o.id, o.order_date, o.total_amount, c.name
    FROM orders o
    JOIN customers c ON o.customer_id = c.id;
    ```

## Y. Why This Matters In Real Systems

- Reliability and reproducibility: Advanced SQL ensures you can produce the same analytics results across environments (dev, staging, prod) with clear, auditable queries.
- Feature engineering for ML: Windowed aggregates, time-series features, and cohort calculations become reusable data features for models (e.g., recency, frequency, monetary value).
- Performance and cost: Proper use of CTEs, indexing, window framing, and set-based operations reduces compute time and supports large-scale dashboards and BI tooling.
- Data quality and governance: Explicit bucketing, time zone handling, and robust joins minimize data leakage and inconsistencies across reports and ML pipelines.
- Production dashboards and dashboards refresh: Time-series bucketing and gap-filling are critical to ensure dashboards render complete histories without misleading gaps.

## Z. Study Questions

1. What is the difference between ROWS BETWEEN x PRECEDING AND CURRENT ROW and RANGE BETWEEN x PRECEDING AND CURRENT ROW in a window function?
2. How would you fill gaps in a time series to ensure continuity for a 90-day daily revenue plot?
3. What is a LATERAL join, and when would you use it for analytics queries?
4. Why are Common Table Expressions (CTEs) useful for readability and potential performance, and how can you determine if materialization is beneficial in your engine?
5. How do you securely parameterize SQL queries in Python to avoid SQL injection vulnerabilities?

## Exercise

Part A — Schema assumption
Assume you have a simple e-commerce analytics schema with the following tables:
- users(user_id BIGINT, created_at TIMESTAMP WITH TIME ZONE)
- orders(id BIGINT, user_id BIGINT, order_date TIMESTAMP WITH TIME ZONE, total_amount DECIMAL)

Part B — SQL tasks
1) Write a query to compute Daily Active Users (DAU) for the last 60 days. DAU is the count of distinct users who placed at least one order on a given day.
2) Write a query to compute a 7-day moving total revenue (sum of total_amount) per day for the last 60 days.
3) Write a query using a LATERAL join to fetch, for each product placeholder table (assume there is a products table with product_id, name), the total sales in the last 30 days. If you don’t have product-related tables in this schema, illustrate with a generic placeholder.

Part C — Python tasks
4) Using the Python data stack, connect to the database, run the DAU query and the 7-day moving revenue query, and load the results into two pandas DataFrames. Print the first few rows of each to verify structure.

Part D — Expected outputs
5) Describe the expected columns for each result and the data types you would anticipate.

Code templates to get you started (fill in as needed):

- DAU query (example)
```sql
SELECT day, COUNT(DISTINCT user_id) AS dau
FROM (
  SELECT DATE(order_date) AS day, user_id
  FROM orders
  WHERE order_date >= CURRENT_DATE - INTERVAL '60 days'
) s
GROUP BY day
ORDER BY day;
```

- 7-day moving revenue per day (example)
```sql
WITH daily AS (
  SELECT DATE(order_date) AS day, SUM(total_amount) AS revenue
  FROM orders
  WHERE order_date >= CURRENT_DATE - INTERVAL '60 days'
  GROUP BY day
)
SELECT day,
       SUM(revenue) OVER (
         ORDER BY day
         ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
       ) AS seven_day_revenue
FROM daily
ORDER BY day;
```

- Python connection snippet (example)
```python
import pandas as pd
from sqlalchemy import create_engine

engine = create_engine("postgresql://username:password@host:5432/database")

# DAU
dau_query = """
-- fill in DAU query here
"""

dau_df = pd.read_sql(dau_query, engine)

# 7-day revenue
revenue_query = """
-- fill in 7-day revenue query here
"""

rev_df = pd.read_sql(revenue_query, engine)

print(dau_df.head())
print(rev_df.head())
```

You're encouraged to implement and run the queries against a real or test database to validate results, adjust for your SQL dialect (PostgreSQL, Snowflake, etc.), and iterate on performance optimizations.