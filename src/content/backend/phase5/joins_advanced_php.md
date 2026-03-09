# Track: Backend Engineering — Phase 5: Databases — Advanced SQL: JOINs, Subqueries & Aggregations (PHP)

Welcome to Phase 5, where we elevate SQL mastery to real-world backend challenges. In professional systems, data is interconnected, large, and performance-sensitive. Mastery of JOINs, subqueries, and aggregations unlocks powerful data retrieval patterns, reporting capabilities, and scalable APIs. This lesson provides concrete PHP examples using PDO, plus deeper SQL techniques with line-by-line explanations, common pitfalls, production considerations, and hands-on exercises.

## 1. Mastering Joins: INNER, LEFT, RIGHT, and FULL (emulation)

SQL joins are the backbone of combining related data across tables. INNER JOIN returns rows with matching keys in both tables. LEFT/RIGHT join include unmatched rows from one side, and FULL OUTER JOIN (where supported) combines both sides. MySQL does not natively support FULL OUTER JOIN; you emulate it with a UNION of LEFT and RIGHT queries.

```sql
-- INNER JOIN: fetch users with their orders (only users who have orders)
SELECT
  u.id AS user_id,
  u.name AS user_name,
  o.id AS order_id,
  o.total AS order_total
FROM users u
INNER JOIN orders o ON o.user_id = u.id
WHERE o.created_at >= '2024-01-01';
```

### Line-by-line explanation
- Line 1: Selects user and order identifiers and the order total for each matching pair.
- Line 2: Specifies the users table with alias u.
- Line 3: Performs an inner join to the orders table on the user_id relationship.
- Line 4: Filters to orders created on or after 2024-01-01.

```php
<?php
// PHP: fetch INNER JOIN results using PDO
$dsn = 'pgsql:host=db.example.com;dbname=mydb'; // or mysql:...
$user = 'dbuser';
$pass = 'secret';
$pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);

$sql = "
SELECT
  u.id AS user_id,
  u.name AS user_name,
  o.id AS order_id,
  o.total AS order_total
FROM users AS u
INNER JOIN orders AS o ON o.user_id = u.id
WHERE o.created_at >= :since
";

$stmt = $pdo->prepare($sql);
$stmt->execute(['since' => '2024-01-01']);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
print_r($rows);
```

### Line-by-line explanation
- Line 1: PHP opening tag.
- Line 2-4: Set up a PDO connection with error mode set to throw exceptions.
- Line 6-12: Define SQL for INNER JOIN with a named parameter :since.
- Line 14: Prepare the SQL statement to prevent SQL injection.
- Line 15: Execute with bound parameter for the date filter.
- Line 16-17: Fetch results as an associative array and print.

```sql
-- LEFT JOIN: fetch all users and their orders (if any)
SELECT
  u.id AS user_id,
  u.name AS user_name,
  o.id AS order_id,
  o.total AS order_total
FROM users u
LEFT JOIN orders o ON o.user_id = u.id;
```

### Line-by-line explanation
- Line 1-2: Select user fields and their order fields.
- Line 3: FROM users with alias u.
- Line 4: LEFT JOIN to orders to include all users, with nulls for users without orders.
- Line 5: Join condition on user_id.

```sql
-- FULL OUTER JOIN emulation (PostgreSQL style) vs MySQL workaround
-- PostgreSQL (native FULL OUTER JOIN)
SELECT
  a.id AS a_id,
  b.id AS b_id
FROM a
FULL OUTER JOIN b ON a.id = b.a_id;
```

```sql
-- MySQL emulation using UNION of LEFT and RIGHT (to approximate FULL JOIN)
SELECT a.id AS a_id, b.id AS b_id
FROM a
LEFT JOIN b ON a.id = b.a_id
UNION ALL
SELECT a.id AS a_id, b.id AS b_id
FROM a
RIGHT JOIN b ON a.id = b.a_id
WHERE a.id IS NULL;
```

### Line-by-line explanation
- PostgreSQL block:
  - Line 1-2: Start of a FULL OUTER JOIN between tables a and b.
  - Line 3-4: Select matching identifiers from both sides.
  - Line 5: Join condition on a_id.

- MySQL emulation block:
  - Line 1-2: Start of LEFT JOIN path, selecting a and b IDs.
  - Line 3-4: Join condition.
  - Line 5: Begin UNION ALL to combine with the RIGHT path.
  - Line 6-7: RIGHT JOIN path to include non-matching rows from b.
  - Line 8: Filter to exclude the rows already captured by the LEFT path (a.id IS NULL).

## 2. Subqueries: Scalar, EXISTS, and Correlated Subqueries

Subqueries let you nest one query inside another. Scalar subqueries return a single value, EXISTS checks for existence, and correlated subqueries reference outer query columns.

```sql
-- Scalar subquery: get each user with their total order count
SELECT
  u.id AS user_id,
  u.name AS user_name,
  (
    SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id
  ) AS order_count
FROM users u;
```

### Line-by-line explanation
- Line 1-2: Select user data.
- Line 3-5: A scalar subquery returns the number of orders for that user; it is correlated by u.id.
- Line 5: Alias for the scalar result as order_count.

```sql
-- EXISTS subquery: users who have at least one order
SELECT u.id, u.name
FROM users u
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.user_id = u.id
);
```

### Line-by-line explanation
- Line 1-2: Query users table.
- Line 3-7: EXISTS subquery checks for presence of any matching orders for the user.
- Line 7: Existence predicate ensures a user is returned only if they have an order.

```sql
-- Correlated subquery: per-user last order date
SELECT
  u.id AS user_id,
  u.name AS user_name,
  (
    SELECT MAX(o.created_at)
    FROM orders o
    WHERE o.user_id = u.id
  ) AS last_order_date
FROM users u;
```

### Line-by-line explanation
- Line 1-3: Select user data and a subquery result per user.
- Line 4-8: Correlated subquery that finds the latest order date for the user.
- Line 8: Alias for the latest date.

```sql
-- IN with subquery: products in active categories
SELECT p.id, p.name
FROM products p
WHERE p.category_id IN (
  SELECT c.id
  FROM categories c
  WHERE c.is_active = 1
);
```

### Line-by-line explanation
- Line 1-2: Query products.
- Line 3-7: IN-subquery returns IDs of active categories.
- Line 7: Filter products whose category_id is in that set.

## 3. Aggregations and Grouping: COUNT, SUM, AVG, HAVING, and ROLLUP

Aggregations summarize data. GROUP BY clusters rows, HAVING filters groups, and in databases that support it, ROLLUP creates hierarchical subtotals.

```sql
-- Basic aggregation: total orders and spend per user
SELECT
  o.user_id,
  COUNT(*) AS order_count,
  SUM(o.total) AS total_spent
FROM orders o
GROUP BY o.user_id;
```

### Line-by-line explanation
- Line 1-3: Select user_id and two aggregated values.
- Line 4: FROM orders.
- Line 5: Group by user_id to compute per-user aggregates.

```sql
-- HAVING: only users with total_spent > 100
SELECT
  o.user_id,
  COUNT(*) AS order_count,
  SUM(o.total) AS total_spent
FROM orders o
GROUP BY o.user_id
HAVING SUM(o.total) > 100;
```

### Line-by-line explanation
- Line 1-3: Same as above.
- Line 5: Grouping by user_id.
- Line 6-7: HAVING filters groups after aggregation to keep only high-spend users.

```sql
-- ROLLUP: per-user totals with a grand total
SELECT
  o.user_id,
  SUM(o.total) AS total_spent
FROM orders o
GROUP BY o.user_id WITH ROLLUP;
```

### Line-by-line explanation
- Line 1-2: Aggregate totals per user.
- Line 3: GROUP BY includes ROLLUP to generate a final grand total row.

```php
<?php
// PHP: aggregate query for per-user totals using PDO
$pdo = new PDO($dsn, $user, $pass, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$sql = "
SELECT
  o.user_id,
  COUNT(*) AS order_count,
  SUM(o.total) AS total_spent
FROM orders o
GROUP BY o.user_id
HAVING SUM(o.total) > :minTotal
";

$stmt = $pdo->prepare($sql);
$stmt->execute(['minTotal' => 100]);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);
```

### Line-by-line explanation
- Line 1: PHP opening tag.
- Line 2: Instantiate PDO with error handling.
- Line 3-10: SQL with GROUP BY and HAVING on total sums; uses a named parameter.
- Line 12: Prepare statement to guard against injection.
- Line 13: Execute with bound parameter minTotal.
- Line 14: Fetch results as associative arrays.

## 4. Complex Patterns: Derived Tables, Subqueries in FROM, and Performance Considerations

Real-world queries often combine joins with subqueries in a derived table to optimize or express complex logic.

```sql
-- Derived table (subquery in FROM) to compute per-user spend once, then join
SELECT
  u.id AS user_id,
  u.name AS user_name,
  d.total_spent
FROM users u
LEFT JOIN (
  SELECT user_id, SUM(total) AS total_spent
  FROM orders
  GROUP BY user_id
) AS d ON d.user_id = u.id
ORDER BY u.id;
```

### Line-by-line explanation
- Line 1-3: Select user data and the derived total_spent.
- Line 4: FROM users with alias u.
- Line 5-9: A derived table d computes per-user total spending.
- Line 9: LEFT JOIN to include users with no orders (total_spent will be NULL then).
- Line 10: Order results by user_id.

```sql
-- Composite pattern: per-user last order date and total spend in a single pass
SELECT
  u.id AS user_id,
  u.name AS user_name,
  COALESCE(s.total_spent, 0) AS total_spent,
  COALESCE(s.latest_order, NULL) AS last_order_date
FROM users u
LEFT JOIN (
  SELECT
    o.user_id,
    SUM(o.total) AS total_spent,
    MAX(o.created_at) AS latest_order
  FROM orders o
  GROUP BY o.user_id
) AS s ON s.user_id = u.id;
```

### Line-by-line explanation
- Line 1-4: Define main user query.
- Line 5-9: Derived table aggregates spend and latest order per user.
- Line 10: LEFT JOIN to bring derived metrics into the user result set.
- Line 11: Use COALESCE to normalize NULLs for users with no orders.

```sql
-- Indexing hint (production-ready): ensure join and filter columns are indexed
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_users_id ON users(id);
```

### Line-by-line explanation
- Line 1-3: Create indexes to speed up join predicates and time-bound filters.
- Line 3: Ensure the primary key is indexed (typical for users.id).

```sql
-- EXPLAIN plan to understand query performance
EXPLAIN
SELECT
  u.id AS user_id,
  u.name AS user_name,
  d.total_spent
FROM users u
LEFT JOIN (
  SELECT user_id, SUM(total) AS total_spent
  FROM orders
  GROUP BY user_id
) AS d ON d.user_id = u.id;
```

### Line-by-line explanation
- Line 1-3: An EXPLAIN plan helps you see how the database will execute the query, including join order and index usage.
- Line 5-11: The same derived-table pattern as above.

## 5. Real-World PHP Patterns: Building a Reusable Data Access Layer for Joins, Subqueries, and Aggregations

In production, you want robust, secure, and testable data access. Here are patterns to help.

```php
<?php
class DbQuery {
  private PDO $pdo;

  public function __construct(PDO $pdo) {
    $this->pdo = $pdo;
  }

  // Generic fetch with named parameters
  public function fetchAll(string $sql, array $params = []): array {
    $stmt = $this->pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
  }

  // Example: join + aggregate example
  public function userSpendingWithLastOrder(int $minTotal): array {
    $sql = "
      SELECT
        u.id AS user_id,
        u.name AS user_name,
        COALESCE(s.total_spent, 0) AS total_spent,
        COALESCE(s.latest_order, NULL) AS last_order_date
      FROM users u
      LEFT JOIN (
        SELECT user_id, SUM(total) AS total_spent, MAX(created_at) AS latest_order
        FROM orders
        GROUP BY user_id
      ) AS s ON s.user_id = u.id
      WHERE COALESCE(s.total_spent, 0) > :minTotal
      ORDER BY u.id;
    ";
    return $this->fetchAll($sql, ['minTotal' => $minTotal]);
  }
}
```

### Line-by-line explanation
- Line 1-3: PHP class and constructor hold a PDO instance for reuse.
- Line 6-11: fetchAll provides a safe, reusable way to run any SQL with parameters.
- Line 14-31: userSpendingWithLastOrder demonstrates combining a derived table with a filter on aggregated results. The method encapsulates a common pattern for reporting endpoints.

## X. Common Beginner Mistakes — 3+ Real Pitfalls (with bad vs good code)

- Pitfall 1: Using INNER JOIN when you need to include non-matching rows
  - Bad:
    ```sql
    SELECT u.id, u.name, o.total
    FROM users u
    JOIN orders o ON o.user_id = u.id;
    ```
  - Good:
    ```sql
    SELECT u.id, u.name, o.total
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id;
    ```
  - Why it matters: INNER JOIN excludes users without orders, which can skew analytics and user counts.

- Pitfall 2: Subqueries in SELECT causing N+1-like behavior instead of efficient joins
  - Bad:
    ```sql
    SELECT u.id, u.name,
      (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
    FROM users u;
    ```
  - Good (derived table approach):
    ```sql
    SELECT u.id, u.name, d.order_count
    FROM users u
    LEFT JOIN (
      SELECT user_id, COUNT(*) AS order_count
      FROM orders
      GROUP BY user_id
    ) d ON d.user_id = u.id;
    ```
  - Why it matters: Correlated subqueries in large result sets can be expensive; pre-aggregate in a derived table reduces per-row work.

- Pitfall 3: Not parameterizing queries -> SQL injection risk
  - Bad:
    ```php
    $sql = "SELECT * FROM users WHERE name = '$name'";
    $rows = $pdo->query($sql)->fetchAll();
    ```
  - Good:
    ```php
    $sql = "SELECT * FROM users WHERE name = :name";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(['name' => $name]);
    $rows = $stmt->fetchAll();
    ```
  - Why it matters: Improper string concatenation exposes vulnerabilities; prepared statements prevent injection.

- Pitfall 4: Ignoring indexes on join/filter columns
  - Bad:
    ```sql
    SELECT * FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.created_at BETWEEN '2024-01-01' AND '2024-02-01';
    ```
  - Good (add indexes):
    - CREATE INDEX idx_orders_user_id ON orders(user_id);
    - CREATE INDEX idx_orders_created_at ON orders(created_at);
  - Why it matters: Without appropriate indexes, large scans slow down critical queries.

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Data correctness and completeness: LEFT JOINs ensure you don’t omit users with no related rows, which is common in onboarding flows and analytics cohorts.
- Performance and scalability: Subqueries and derived tables can improve readability, but you must profile; sometimes indexed joins outperform nested subqueries, sometimes the opposite. Use EXPLAIN plans to guide decisions.
- Consistency and correctness under load: Use transactions when updating related tables; ensure queries remain idempotent in read-heavy reporting endpoints.
- Security: Always use parameter binding and prepared statements; validate and sanitize inputs at the boundary (e.g., API layer) and enforce least-privilege DB users.
- Maintainability: Encapsulate complex SQL in well-documented PHP methods or repository layers to avoid ad-hoc, brittle SQL scattered across the codebase.

## Z. Study Questions — 5 Recall Questions

1. What is the difference between INNER JOIN and LEFT JOIN, and when would you prefer one over the other?
2. How can you emulate a FULL OUTER JOIN in MySQL, which lacks native support?
3. What is a correlated subquery, and how does it differ from a non-correlated subquery?
4. Why is it often better to perform aggregation in a derived table (subquery in FROM) rather than a correlated subquery in SELECT?
5. How can EXPLAIN help you optimize a complex JOIN/subquery query in production?

## Exercise

Part A: Write and explain three queries using JOINs, subqueries, and aggregations.

1) INNER JOIN and aggregation
- Task: For each user, compute their total spending and number of orders for orders after 2023-01-01.
- SQL:
  ```sql
  SELECT
    u.id AS user_id,
    u.name AS user_name,
    COUNT(o.id) AS order_count,
    SUM(o.total) AS total_spent
  FROM users u
  INNER JOIN orders o ON o.user_id = u.id
  WHERE o.created_at >= '2023-01-01'
  GROUP BY u.id, u.name;
  ```
- Line-by-line explanation: (provide your own micro-explanation)
- PHP usage: implement with a PDO fetchAll and parameter binding for the date.

2) Subqueries in SELECT vs derived table
- Task: Show each user’s total orders and last order date, using a derived table for last order date.
- SQL:
  ```sql
  SELECT
    u.id AS user_id,
    u.name AS user_name,
    d.total_orders,
    d.last_order_date
  FROM users u
  LEFT JOIN (
    SELECT user_id, COUNT(*) AS total_orders, MAX(created_at) AS last_order_date
    FROM orders
    GROUP BY user_id
  ) AS d ON d.user_id = u.id;
  ```
- Line-by-line explanation: (provide your own)
- PHP usage: fetch with appropriate mapping into a data transfer object.

3) Complex real-world query: last 6 months per-user spend with order count
- Task: Return every user, the total spent, and order count in the last 6 months. Include users with zero activity.
- SQL:
  ```sql
  SELECT
    u.id AS user_id,
    u.name AS user_name,
    COALESCE(SUM(o.total), 0) AS total_spent,
    COALESCE(COUNT(o.id), 0) AS order_count
  FROM users u
  LEFT JOIN orders o
    ON o.user_id = u.id
   AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
  GROUP BY u.id, u.name
  ORDER BY u.id;
  ```
- Line-by-line explanation: (provide your own)
- PHP usage: implement as a method in your DbQuery class (see Section 5) and call userSpendingWithLastOrder(0) to test.

Part B: Implement a small PHP helper to execute a given query with parameters and map results to a PHP array of DTO-like objects.

- Code:
  ```php
  <?php
  class DtoUserSummary {
    public int $user_id;
    public string $user_name;
    public int $order_count;
    public float $total_spent;
  }

  function mapToDto(array $rows): array {
    $out = [];
    foreach ($rows as $row) {
      $dto = new DtoUserSummary();
      $dto->user_id = (int)$row['user_id'];
      $dto->user_name = $row['user_name'];
      $dto->order_count = (int)$row['order_count'];
      $dto->total_spent = (float)$row['total_spent'];
      $out[] = $dto;
    }
    return $out;
  }
  ```
- Line-by-line explanation: (provide your own)
- These patterns help with clean separation of concerns and easier testing of data access layers.

Part C: Performance quick-checks

- Task: Add an EXPLAIN plan for the per-user spend query and interpret potential bottlenecks.
- SQL: Use EXPLAIN with the last six-month spend query.
- Steps: Run EXPLAIN, review the “type” and “rows” columns, verify index usage on orders.user_id, orders.created_at, and users.id.

Deliverable: A short write-up explaining which query choices you would optimize for a production OLTP or OLAP workload, and a plan for measuring improvements (e.g., using EXPLAIN, timing, and caching strategies).

If you’d like, I can tailor the exercise to your actual schema (table names, column types, and database engine) and provide a ready-to-run PHP project skeleton with tests.