# Track: Backend Engineering — Module: Phase 5 — Databases — Topic: Indexing, Query Planning & Performance (PHP)

Compelling introductory paragraph
Indexes are the silent accelerants of your database-driven applications. They let your PHP application retrieve data in milliseconds rather than seconds by guiding the database engine to the right storage structures. Proper indexing, understanding query plans, and tuning for common access patterns are essential skills for any backend engineer. In real systems, small changes to indexing or query structure can dramatically reduce latency, lower CPU and IO usage, and improve user experience under load.

## 1. Indexing Fundamentals

This section introduces what an index is, how MySQL (InnoDB) uses B-trees, and how to create and reason about basic indexes from PHP. We’ll work with a representative table called orders to illustrate practical patterns.

### Code Block 1: Setting up a sample table (PHP)

```php
<?php
// DB connection (adjust credentials for your environment)
$dsn = "mysql:host=localhost;dbname=shop;charset=utf8mb4";
$user = "dbuser";
$password = "secret";
$options = [
  PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
  PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

$pdo = new PDO($dsn, $user, $password, $options);

// Create a sample table if it doesn't exist
$pdo->exec("
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  status ENUM('pending','paid','shipped','cancelled') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total DECIMAL(10,2) NOT NULL
) ENGINE=InnoDB;
");
```

### Line-by-line explanation

- Line 1-6: Set up a PDO connection to a MySQL database named "shop" with UTF-8 encoding and safe options (throws exceptions on errors, fetches associative arrays by default).
- Line 9-19: Create the sample orders table if it does not exist, including a primary key id, foreign-like user_id, an enum status, a created_at timestamp, and a numeric total.

### Code Block 2: Creating basic indexes (PHP)

```php
<?php
// Basic single-column index on user_id
$pdo->exec("CREATE INDEX idx_orders_user_id ON orders (user_id)");

// Composite index to support queries by user_id then status
$pdo->exec("CREATE INDEX idx_orders_user_status ON orders (user_id, status)");

// Composite index that also includes created_at to help ORDER BY and range filters
$pdo->exec("CREATE INDEX idx_orders_user_status_created ON orders (user_id, status, created_at)");
```

### Line-by-line explanation

- Line 3: Create a non-unique index named idx_orders_user_id on the user_id column to speed up lookups by user.
- Line 6: Create a composite index idx_orders_user_status on (user_id, status) to optimize queries filtering by both fields.
- Line 9: Create a larger composite index idx_orders_user_status_created on (user_id, status, created_at) to further help queries that also order by created_at, potentially enabling index-driven sorts.

## 2. Query Planning & Performance Techniques

This section covers how to inspect query plans, how to design queries to leverage indexes, and how to measure performance differences using PHP with EXPLAIN. We’ll show both a plan demonstration and a performance-sensitive query pattern.

### Code Block 3: Running EXPLAIN for a representative query (PHP)

```php
<?php
// Example: explain plan for a common query
$uid = 42;
$st = 'paid';

$explainStmt = $pdo->prepare("
  EXPLAIN FORMAT=JSON
  SELECT id, total
  FROM orders
  WHERE user_id = :uid AND status = :st
  ORDER BY created_at DESC
  LIMIT 10
");
$explainStmt->execute(['uid' => $uid, 'st' => $st]);
$planJson = $explainStmt->fetchColumn(0);
$plan = json_decode($planJson, true);

echo "Plan summary:\n";
echo json_encode($plan, JSON_PRETTY_PRINT);
```

### Line-by-line explanation

- Line 5-6: Prepare a query that asks the database to explain the execution plan for a common, index-friendly query that filters by user_id and status, sorts by created_at, and returns a small window of results.
- Line 9-12: Execute the prepared statement with bound parameters for user_id and status to avoid SQL injection and to reuse the query plan.
- Line 13: Retrieve the JSON-formatted plan produced by EXPLAIN FORMAT=JSON.
- Line 14-15: Decode the JSON into a PHP array for inspection; print a pretty-printed version to review the plan details.

### Code Block 4: A performance-focused query using the composite index (PHP)

```php
<?php
$uid = 42;
$st = 'paid';

// This query benefits from the (user_id, status, created_at) index
$stmt = $pdo->prepare("
  SELECT id, total
  FROM orders
  WHERE user_id = :uid AND status = :st
  ORDER BY created_at DESC
  LIMIT 10
");
$start = microtime(true);
$stmt->execute(['uid' => $uid, 'st' => $st]);
$rows = $stmt->fetchAll();
$durationMs = (microtime(true) - $start) * 1000;

echo "Query returned " . count($rows) . " rows in " . number_format($durationMs, 2) . " ms.\n";
```

### Line-by-line explanation

- Line 5-8: Prepare the same query as the EXPLAIN example, now fetching actual data.
- Line 10: Record the start time to measure query duration.
- Line 11-12: Execute the statement with bound parameters.
- Line 13: Fetch all matching rows (id, total) as an array.
- Line 14-15: Compute elapsed time in milliseconds and print a concise summary.

### Code Block 5: Interpreting EXPLAIN OUTPUT (brief example)

```php
<?php
// Example of handling a simple explain result (assuming $plan from Block 3)
echo "Plan type: " . ($plan['query_plan']['header']['select_type'] ?? 'unknown') . PHP_EOL;
echo "Index used: " . json_encode($plan['query_plan']['plan']['key'], JSON_PRETTY_PRINT) . PHP_EOL;
```

### Line-by-line explanation

- Line 4-6: Access the decoded JSON plan structure to extract high-level hints about the query type and which index was used. This helps you decide if you need to adjust indexes or query shape.

## 3. Performance Tuning Patterns

This section highlights practical patterns to optimize read-heavy workloads, including how to design for covering indexes, minimize sorts, and exploit leftmost-prefix rules in composite indexes.

### Code Block 6: Creating a covering index for a common read pattern (PHP)

```php
<?php
// A covering index for the query: (user_id, status, created_at) and selecting id, total
$pdo->exec("CREATE INDEX idx_orders_user_status_created_cover ON orders (user_id, status, created_at)");
```

### Line-by-line explanation

- Line 3: Adds a covering index that includes the columns used in the WHERE clause (user_id, status) and the ordering column (created_at). Because the index contains the columns needed by the query (id and total are included in the table), the database can satisfy the query from the index without touching the actual table rows, reducing I/O cost.

### Code Block 7: Query pattern that benefits from LIMIT and proper ordering (PHP)

```php
<?php
$uid = 7;
$st = 'paid';

$stmt = $pdo->prepare("
  SELECT id, total
  FROM orders
  WHERE user_id = :uid AND status = :st
  ORDER BY created_at DESC
  LIMIT 20
");
$start = microtime(true);
$stmt->execute(['uid' => $uid, 'st' => $st]);
$rows = $stmt->fetchAll();
$durationMs = (microtime(true) - $start) * 1000;

echo "Top 20 recent paid orders for user $uid: " . count($rows) . " rows in " . number_format($durationMs, 2) . " ms.\n";
```

### Line-by-line explanation

- Line 5-9: Prepare a common read pattern that uses the covering index to quickly fetch recent items for a particular user and status.
- Line 11: Time the operation.
- Line 12-14: Execute and fetch results.
- Line 15: Print duration.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: Not using appropriate indexes for filtering and sorting

- Bad: Filtering by user_id without a supporting composite index; sorting by created_at causes a full table scan and sort.

Bad code
```php
<?php
$uid = 42;
$st = 'paid';
$rows = $pdo->query("
  SELECT id, total
  FROM orders
  WHERE user_id = $uid AND status = '$st'
  ORDER BY created_at DESC
  LIMIT 10
")->fetchAll();
```

Good code
```php
<?php
$uid = 42;
$st = 'paid';
$stmt = $pdo->prepare("
  SELECT id, total
  FROM orders
  WHERE user_id = :uid AND status = :st
  ORDER BY created_at DESC
  LIMIT 10
");
$stmt->execute(['uid' => $uid, 'st' => $st]);
$rows = $stmt->fetchAll();
```

### Pitfall 2: Applying functions to indexed columns (preventing index usage)

- Bad: Using a function on a column prevents index usage.

Bad code
```php
<?php
$rows = $pdo->query("
  SELECT id, total
  FROM orders
  WHERE LOWER(status) = 'paid'
").fetchAll();
```

Good code
```php
<?php
$rows = $pdo->prepare("
  SELECT id, total
  FROM orders
  WHERE status = :st
");
$rows->execute(['st' => 'paid']);
$rows = $rows->fetchAll();
```

### Pitfall 3: Over-indexing (too many indexes hurting writes)

- Bad: Creating multiple redundant indexes, slowing inserts/updates.

Bad code
```sql
CREATE INDEX idx1 ON orders (user_id);
CREATE INDEX idx2 ON orders (status);
CREATE INDEX idx3 ON orders (created_at);
-- Plus many more indices as the app grows
```

Good code
```sql
-- Consolidate into essential composite index to support common reads
CREATE INDEX idx_orders_user_status_created ON orders (user_id, status, created_at);
```

### Pitfall 4: Not checking query plans or EXPLAIN results

- Bad: Writing queries without verifying the execution plan.

Bad code
```php
<?php
$uid = 42;
$st = 'paid';
$rows = $pdo->prepare("
  SELECT id, total
  FROM orders
  WHERE user_id = :uid AND status = :st
  LIMIT 10
");
$rows->execute(['uid' => $uid, 'st' => $st]);
```

Good code
```php
<?php
$explainStmt = $pdo->prepare("
  EXPLAIN FORMAT=JSON
  SELECT id, total
  FROM orders
  WHERE user_id = :uid AND status = :st
  ORDER BY created_at DESC
  LIMIT 10
");
$explainStmt->execute(['uid' => $uid, 'st' => $st]);
$plan = json_decode($explainStmt->fetchColumn(0), true);
```

## Y. Why This Matters In Real Systems — production context and real usage

- Latency and throughput: Proper indexing reduces per-request latency, allowing more requests per second on the same hardware.
- Cost and scale: Read-heavy apps benefit from well-chosen composite indexes; misconfigured indexes can degrade write performance and storage costs.
- Observability: Use EXPLAIN, JSON-formatted plans, and slow query logs to detect non-optimal plans in production.
- Stability and maintainability: Keep a lean set of indexes that cover your most frequent access patterns; periodically review and tune as features evolve.
- Caching and read replicas: For high-traffic services, pair indexing with caches (e.g., Redis) and read replicas to distribute load without compromising consistency.

## Z. Study Questions — 5 recall questions

1) What is a covering index and when does it help a query?
2) How does a composite index leftmost-prefix affect query optimization?
3) Name three signs you should inspect with EXPLAIN to determine if an index is used.
4) Why can using a function on a column in a WHERE clause hurt performance?
5) What is the trade-off when adding indexes in a write-heavy workload?

## Exercise — a practical multi-part coding challenge

Part A — Set up and baseline
- Create a MySQL database "shop" with a table orders (id, user_id, status, created_at, total) as shown in the lesson. Add a few dozen sample rows across different users and statuses.
- Implement the following indexes using PHP PDO:
  - idx_orders_user_id on (user_id)
  - idx_orders_user_status on (user_id, status)
  - idx_orders_user_status_created on (user_id, status, created_at)
- Write a PHP script to run EXPLAIN FORMAT=JSON for:
  - A query filtering by user_id and status with ORDER BY created_at DESC LIMIT 10
  - A variation that removes created_at from the ORDER BY and uses LIMIT 10
- Capture and print the plan; interpret whether the index is being used and which one.

Part B — Practical optimization
- Write a PHP function fetchTopRecentByUserAndStatus($uid, $status, $limit = 10) that uses prepared statements to fetch id and total, ordered by created_at DESC, limited by $limit.
- Time the execution and print the duration.
- Add a covering index (user_id, status, created_at) if not already present; re-run the function and compare timings.

Part C — Analyze and explain
- Use EXPLAIN FORMAT=JSON on your optimized function’s query and explain in a paragraph what the plan indicates (which index, range scans vs full scans, any filesort or temporary tables, etc.).
- If the plan shows a filesort or temporary table, propose a concrete index change or query adjustment and justify it.

Part D — Real-world constraints
- Describe how you would integrate slow query logging and monitoring in a production PHP application. What tooling would you use (MySQL slow query log, EXPLAIN frequency, alerting), and what thresholds would you set for actionable alerts?

Remember to run each PHP snippet in an environment connected to a real MySQL server. Use the provided patterns as a baseline and adapt to your stack conventions.