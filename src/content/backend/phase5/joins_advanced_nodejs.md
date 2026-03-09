# Advanced SQL — JOINs, Subqueries & Aggregations (Node.js)

In modern backend systems, data is spread across multiple tables and services. Mastering JOINs, subqueries, and aggregations lets you express complex business questions in a single, efficient SQL query. When paired with Node.js, you can build robust data access layers, generate meaningful reports, and power features from dashboards to analytics with predictable performance.

## 1. JOINs Fundamentals

JOINs let you horizontally combine rows from two or more tables based on related columns. This section covers INNER JOIN, LEFT JOIN, RIGHT JOIN, and FULL OUTER JOIN, illustrated with practical queries and Node.js examples.

### SQL Examples

```sql
-- INNER JOIN: only matching rows
SELECT o.id AS order_id, o.amount, c.id AS customer_id, c.name
FROM orders AS o
JOIN customers AS c ON o.customer_id = c.id
ORDER BY o.id;
```

```sql
-- LEFT JOIN: keep all customers, with NULLs for missing orders
SELECT c.id AS customer_id, c.name, COALESCE(SUM(o.amount), 0) AS total_spent
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.id
GROUP BY c.id, c.name
ORDER BY total_spent DESC;
```

```sql
-- FULL OUTER JOIN: all customers and all orders, matched where possible
SELECT c.id AS customer_id, c.name AS customer_name, o.id AS order_id, o.amount
FROM customers AS c
FULL OUTER JOIN orders AS o ON o.customer_id = c.id
ORDER BY customer_id;
```

```sql
-- CROSS JOIN (less common for reporting, creates all combinations)
SELECT c.id AS customer_id, p.id AS product_id, c.name AS customer, p.name AS product
FROM customers AS c
CROSS JOIN products AS p
ORDER BY customer_id, product_id
LIMIT 10;
```

### Line-by-line explanation

INNER JOIN example:
- Line 1: SELECT o.id AS order_id, o.amount, c.id AS customer_id, c.name
  - Projects selected columns: order_id, amount, customer_id, and customer name.
- Line 2: FROM orders AS o
  - Uses orders as the primary table with alias o.
- Line 3: JOIN customers AS c ON o.customer_id = c.id
  - Joins customers using the foreign key relationship.
- Line 4: ORDER BY o.id;
  - Sorts results by order id for readability.

LEFT JOIN example:
- Line 1: SELECT c.id AS customer_id, c.name, COALESCE(SUM(o.amount), 0) AS total_spent
  - Selects customer details and a total of orders; COALESCE handles NULLs when a customer has no orders.
- Line 2: FROM customers AS c
  - Start from customers.
- Line 3: LEFT JOIN orders AS o ON o.customer_id = c.id
  - Left join ensures every customer appears.
- Line 4: GROUP BY c.id, c.name
  - Group by customer to compute sums per customer.
- Line 5: ORDER BY total_spent DESC;
  - Sorts results by total spent.

FULL OUTER JOIN example:
- Line 1: SELECT c.id AS customer_id, c.name AS customer_name, o.id AS order_id, o.amount
  - Projects customer and order fields, including unmatched rows.
- Line 2: FROM customers AS c
  - Start with customers.
- Line 3: FULL OUTER JOIN orders AS o ON o.customer_id = c.id
  - Includes all rows from both tables, matched where possible.
- Line 4: ORDER BY customer_id;
  - Sorts by customer id.

CROSS JOIN example:
- Line 1: SELECT c.id AS customer_id, p.id AS product_id, c.name AS customer, p.name AS product
  - Produces all possible customer-product pairs.
- Line 2: FROM customers AS c
  - Primary table.
- Line 3: CROSS JOIN products AS p
  - Creates the Cartesian product with all products.
- Line 4: ORDER BY customer_id, product_id
  - Sort for readability.
- Line 5: LIMIT 10;
  - Truncate to the first 10 combinations for demonstration.

### Line-by-line explanation

INNER JOIN:
- Line 1: Projects order_id, amount, customer_id, customer name for context.
- Line 2-3: Define data sources (orders as o, customers as c) and the join predicate o.customer_id = c.id.
- Line 4: Order results deterministically by order_id.

LEFT JOIN:
- Line 1: COALESCE(SUM(o.amount), 0) ensures a 0 total for customers with no orders.
- Lines 2-5: Join customers to orders, group by customer, and sort by total_spent.

FULL OUTER JOIN:
- Lines 1-4: Retrieve all rows from customers and orders, matching where possible; NULLs indicate no match.

CROSS JOIN:
- Lines 1-5: Demonstrates the Cartesian product between two sets; useful for certain analysis, but can explode in size.

### Common Node.js usage (pg)

```js
// Node.js (pg) - JOINs examples (INNER JOIN & LEFT JOIN)
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const innerJoinQuery = `
  SELECT o.id AS order_id, o.amount, c.id AS customer_id, c.name
  FROM orders AS o
  JOIN customers AS c ON o.customer_id = c.id
  ORDER BY o.id;
`;

const leftJoinQuery = `
  SELECT c.id AS customer_id, c.name, COALESCE(SUM(o.amount), 0) AS total_spent
  FROM customers AS c
  LEFT JOIN orders AS o ON o.customer_id = c.id
  GROUP BY c.id, c.name
  ORDER BY total_spent DESC;
`;

async function fetchJoins() {
  const inner = await pool.query(innerJoinQuery);
  console.log('INNER JOIN rows:', inner.rows);

  const left = await pool.query(leftJoinQuery);
  console.log('LEFT JOIN rows:', left.rows);
}

fetchJoins().catch(console.error);
```

---

## 2. Subqueries and Derived Tables

Subqueries (also called nested queries) let you compute a value or a set of rows to use in an outer query. This section covers scalar subqueries, correlated subqueries with EXISTS, IN with subqueries, and derived tables (subqueries in FROM). We also touch on LATERAL for more dynamic subqueries.

### SQL Examples

```sql
-- A. Scalar subquery in SELECT
SELECT c.id, c.name,
  (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count
FROM customers AS c
ORDER BY order_count DESC;
```

```sql
-- B. Correlated subquery with EXISTS
SELECT * FROM customers AS c
WHERE EXISTS (
  SELECT 1
  FROM orders AS o
  WHERE o.customer_id = c.id AND o.amount > 1000
);
```

```sql
-- C. IN with subquery
SELECT * FROM customers
WHERE id IN (SELECT customer_id FROM orders WHERE amount > 500);
```

```sql
-- D. Derived table (subquery in FROM) with aggregation
SELECT t.customer_id, t.total_spent
FROM (
  SELECT customer_id, SUM(amount) AS total_spent
  FROM orders
  GROUP BY customer_id
) AS t
WHERE t.total_spent > 1000;
```

```sql
-- E. LATERAL join (advanced, often used for per-row subqueries)
SELECT c.id AS customer_id, pref.pref_name
FROM customers AS c
LEFT JOIN LATERAL (
  SELECT p.name AS pref_name
  FROM preferences p
  WHERE p.customer_id = c.id
  ORDER BY p.updated_at DESC
  LIMIT 1
) AS pref ON true;
```

### Line-by-line explanation

Scalar subquery in SELECT:
- Line 1: SELECT c.id, c.name,
  - Projects the customer’s id and name.
- Line 2: (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count
  - Computes a scalar value per row: total orders for that customer.
- Line 3: FROM customers AS c
  - Primary table.
- Line 4: ORDER BY order_count DESC;
  - Sorts results by the derived count.

EXISTS correlated subquery:
- Lines 1-3: FROM customers AS c; WHERE EXISTS (...)
  - Outer query iterates customers; inner query checks for matching orders.
- Inner query lines:
  - SELECT 1
  - FROM orders AS o
  - WHERE o.customer_id = c.id AND o.amount > 1000
  - Uses the outer alias c to correlate.

IN with subquery:
- Lines 1-3: SELECT * FROM customers WHERE id IN (...)
  - Filters customers whose id appears in the subquery results.
- Subquery lines:
  - SELECT customer_id FROM orders WHERE amount > 500
  - Finds customers with at least one order over 500.

Derived table:
- Outer query lines:
  - SELECT t.customer_id, t.total_spent
  - FROM ( ... ) AS t
  - WHERE t.total_spent > 1000
- Inner subquery:
  - SELECT customer_id, SUM(amount) AS total_spent
  - FROM orders
  - GROUP BY customer_id
  - Produces a temp result set used by the outer query.

LATERAL:
- Outer query selects customer_id.
- LATERAL subquery (pref) is evaluated per row from customers.
- The inner subquery fetches the latest preference for that customer.
- LEFT JOIN ensures customers without preferences still appear.

### Line-by-line explanation for Node.js usage (pg)

```js
// Node.js (pg) - Subqueries & Derived Tables
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const scalarSubqueryQuery = `
  SELECT c.id, c.name,
    (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id) AS order_count
  FROM customers AS c
  ORDER BY order_count DESC;
`;

async function fetchScalarSubquery() {
  const res = await pool.query(scalarSubqueryQuery);
  console.log(res.rows);
}
```

- Line 1: import Pool from pg for connection pooling.
- Line 2: create a Pool with a database URL.
- Line 4-9: define the scalar subquery SQL to fetch each customer with a derived order_count.
- Line 11-14: async function executes the query and prints results.

```js
const existsQuery = `
  SELECT * FROM customers AS c
  WHERE EXISTS (
    SELECT 1
    FROM orders AS o
    WHERE o.customer_id = c.id AND o.amount > 1000
  );
`;
```

- Line 1: defines a query using EXISTS to filter customers.
- Lines 2-6: inner subquery references the outer table c to correlate.

```js
const derivedTableQuery = `
  SELECT t.customer_id, t.total_spent
  FROM (
    SELECT customer_id, SUM(amount) AS total_spent
    FROM orders
    GROUP BY customer_id
  ) AS t
  WHERE t.total_spent > 1000;
`;
```

- Lines 1-7: shows a subquery in FROM that aggregates orders per customer and then filters.

Derived table note:
- The subquery is aliased as t and then used by the outer query.
- This pattern can be used to separate complex aggregations for reuse.

---

## 3. Aggregations and Grouping

Aggregations summarize data. This section covers basic GROUP BY, HAVING filters, and advanced grouping patterns like GROUPING SETS/ROLLUP/CUBE, plus a window function example to show per-row cumulative context.

### SQL Examples

```sql
-- A. Basic aggregation by customer
SELECT customer_id, SUM(amount) AS total_spent, COUNT(*) AS order_count
FROM orders
GROUP BY customer_id
ORDER BY total_spent DESC;
```

```sql
-- B. Using HAVING to filter groups
SELECT customer_id, SUM(amount) AS total_spent
FROM orders
GROUP BY customer_id
HAVING SUM(amount) > 1000;
```

```sql
-- C. GROUPING SETS for subtotals and grand total
SELECT COALESCE(c.name, 'ALL') AS customer_name, SUM(o.amount) AS total_spent
FROM orders o
LEFT JOIN customers c ON o.customer_id = c.id
GROUP BY GROUPING SETS ((c.name), ()); -- subtotals by customer and grand total
```

```sql
-- D. Window function example: cumulative total per customer
SELECT
  o.id,
  o.customer_id,
  o.amount,
  SUM(o.amount) OVER (PARTITION BY o.customer_id ORDER BY o.created_at) AS running_total_per_customer
FROM orders o
ORDER BY o.customer_id, o.created_at;
```

### Line-by-line explanation

A. Basic aggregation:
- Line 1: SELECT customer_id, SUM(amount) AS total_spent, COUNT(*) AS order_count
  - Computes total spend and number of orders per customer.
- Line 2: FROM orders
  - Source table.
- Line 3: GROUP BY customer_id
  - Groups rows by customer.
- Line 4: ORDER BY total_spent DESC;
  - Ranks customers by spend.

B. HAVING filter:
- Lines 1-4: Similar to A, but HAVING SUM(amount) > 1000 restricts to high-spending customers.

C. GROUPING SETS:
- Line 1: SELECT COALESCE(c.name, 'ALL') AS customer_name, SUM(o.amount) AS total_spent
  - Creates a label for the subtotal row when customer_name is NULL.
- Line 2: FROM orders o
- Line 3: LEFT JOIN customers c ON o.customer_id = c.id
  - Keeps all customers in the left side for per-customer subtotals.
- Line 4: GROUP BY GROUPING SETS ((c.name), ())
  - First set for per-customer totals, second set for grand total.

D. Window function:
- Lines 1-4: SELECT o.id, o.customer_id, o.amount, SUM(o.amount) OVER (PARTITION BY o.customer_id ORDER BY o.created_at) AS running_total_per_customer
  - Computes a cumulative total for each customer in order, without collapsing rows.
- Line 5: FROM orders o
- Line 6: ORDER BY o.customer_id, o.created_at;
  - Ensures the window function sees a meaningful order for each partition.

### Line-by-line explanation for Node.js usage (pg)

```js
// Node.js (pg) - Aggregations
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const groupByQuery = `
  SELECT customer_id, SUM(amount) AS total_spent, COUNT(*) AS order_count
  FROM orders
  GROUP BY customer_id
  ORDER BY total_spent DESC;
`;

async function fetchGroupBy() {
  const res = await pool.query(groupByQuery);
  console.log(res.rows);
}
```

- Line 1-2: prepare the connection pool.
- Lines 4-9: define a GROUP BY query that summarizes spend and order count per customer.
- Line 11-14: execute and print results.

```js
const havingQuery = `
  SELECT customer_id, SUM(amount) AS total_spent
  FROM orders
  GROUP BY customer_id
  HAVING SUM(amount) > 1000;
`;
```

- Lines 1-4: similar aggregation with a HAVING clause to filter groups.

```js
const groupingSetsQuery = `
  SELECT COALESCE(c.name, 'ALL') AS customer_name, SUM(o.amount) AS total_spent
  FROM orders o
  LEFT JOIN customers c ON o.customer_id = c.id
  GROUP BY GROUPING SETS ((c.name), ());
`;
```

- Lines 1-6: demonstrates per-customer subtotals plus a grand total row.

```js
const windowFunctionQuery = `
  SELECT
    o.id,
    o.customer_id,
    o.amount,
    SUM(o.amount) OVER (PARTITION BY o.customer_id ORDER BY o.created_at) AS running_total_per_customer
  FROM orders o
  ORDER BY o.customer_id, o.created_at;
`;
```

- Lines 1-7: uses a window function to compute a running total per customer without reducing rows.
- Note: Window functions are evaluated after the FROM/WHERE/GROUP BY phases conceptually; in PostgreSQL they’re available directly.

---

## 4. Common Beginner Mistakes

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side.

1) N+1 Query Problem
- Bad:
```
const customers = await pool.query('SELECT id FROM customers');
for (const c of customers.rows) {
  const orders = await pool.query('SELECT * FROM orders WHERE customer_id = $1', [c.id]);
  // process
}
```
- Good:
```
const q = `
  SELECT c.id AS customer_id, c.name, o.id AS order_id, o.amount
  FROM customers c
  LEFT JOIN orders o ON o.customer_id = c.id
  ORDER BY c.id;
`;
const res = await pool.query(q);
// process res.rows to group by customer if needed
```

2) Missing/Incorrect Join Keys (Cartesian Product risk)
- Bad:
```
SELECT *
FROM orders o
JOIN customers c ON o.id = c.id; -- incorrect key; should be o.customer_id = c.id
```
- Good:
```
SELECT *
FROM orders o
JOIN customers c ON o.customer_id = c.id;
```

3) SQL Injection Risk / No Parameterization
- Bad:
```
const userId = req.params.userId;
const res = await pool.query(`SELECT * FROM users WHERE id = ${userId}`);
```
- Good:
```
const res = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

4) SELECT * in Production Queries
- Bad:
```
SELECT * FROM orders WHERE customer_id = $1;
```
- Good:
```
SELECT id, amount, created_at FROM orders WHERE customer_id = $1;
```
- Rationale: minimizes data transfer, clarifies contract, and reduces coupling.

5) Not Handling NULLs after LEFT JOIN
- Bad:
```
SELECT c.id, o.amount
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id;
```
- Good:
```
SELECT c.id, COALESCE(SUM(o.amount), 0) AS total_spent
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id;
```
- Rationale: makes downstream logic simpler and avoids unexpected NULLs.

---

## 5. Why This Matters In Real Systems

- Data correctness and performance: JOINs, subqueries, and aggregations are the backbone of reporting and analytics. Improper joins or unindexed conditions can explode query times.
- Production patterns:
  - Use parameterized queries to avoid SQL injection in APIs.
  - Prefer JOINs to subqueries for relational questions when possible; use subqueries for derived data when necessary.
  - Use proper indexes to support join predicates and grouping: e.g., orders(customer_id), orders(created_at), and customers(id).
  - Consider EXPLAIN ANALYZE (PostgreSQL) or EXPLAIN (MySQL) to inspect query plans.
  - Use window functions for running totals, rankings, and time-based analytics without collapsing rows.
- Node.js considerations:
  - Use connection pools to manage concurrency and resource limits.
  - Stream large result sets if needed (e.g., using cursors) to avoid high memory usage.
  - Handle data consistency with transactions for multi-statement writes.
  - Always sanitize and parameterize inputs; validate inputs at the API boundary.
- Real-world use cases:
  - E-commerce dashboards showing per-customer lifetime value (LTV).
  - Reporting services that require subtotals and grand totals (GROUPING SETS/ROLLUP).
  - Denormalized reporting tables and materialized views to speed reads, with clear ETL boundaries.

---

## Z. Study Questions

1) What is the difference between INNER JOIN and LEFT JOIN in terms of result rows and NULLs?

2) How does a correlated subquery differ from a non-correlated subquery? Provide a simple example of each.

3) What is the HAVING clause used for, and how does it differ from WHERE in the context of aggregations?

4) Explain GROUPING SETS and how it enables subtotals and grand totals in a single query. Provide a small example.

5) Why are parameterized queries important in Node.js, and how would you convert a concatenated query into a parameterized one?

---

## Exercise

Part A: Snapshot Reporting Query
- Build a single query that returns, for every customer, their total_spent, order_count, and a grand total row at the end. Use GROUPING SETS to produce the subtotals and grand total in one pass.
- Provide both the SQL and a Node.js function (using pg) to run it and print results.

Part B: Per-Order Running Total
- Write a query that returns, for each order, the running total spent by that customer up to and including that order. Use a window function for the running total.
- Implement a Node.js function to fetch and log the results.

Part C: Subquery-Docused API Endpoint
- Create a small Node.js function that, given a customer_id, returns:
  - The customer info
  - The total_spent for that customer
  - The number of orders
- Use a derived table (subquery in FROM) and a JOIN to assemble the data in a single query.

Part D: Performance Hint
- Explain how you would use EXPLAIN ANALYZE (PostgreSQL) to inspect the plan for Part A, and list two index recommendations that would likely improve performance for the Part A query.

Hints:
- Assume tables:
  - customers(id, name, email, created_at)
  - orders(id, customer_id, amount, created_at)
- Use parameterized queries in Node.js.
- Write small, self-contained functions with clear names and minimal external dependencies beyond pg.

End-to-end, this lesson provides a practical, production-aware tour of advanced SQL patterns in a Node.js backend, reinforcing best practices and common pitfalls along the way.