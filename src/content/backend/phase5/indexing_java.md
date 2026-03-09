# Track: Backend Engineering
## Module: Phase 5 — Databases
### Topic: Indexing, Query Planning & Performance (Java)

Compelling intro paragraph:
Indexing, query planning, and performance tuning are the backbone of scalable backend systems. A well-chosen index strategy reduces latency, improves throughput, and lowers operational costs, while understanding how the database planner chooses plans helps you write queries that consistently hit the best path. In Java-powered backends, you also control how queries are issued, parameterized, and observed, making it possible to enforce best practices across teams and deployments. This module blends theory with pragmatic Java examples to help you design, test, and tune queries in production-grade systems.

## 1. Understanding Indexes and Why They Matter in Databases
Indexes accelerate data retrieval by allowing the database to jump to relevant rows rather than scanning every row. They come in several forms (B-tree, hash, GIN, BRIN, covering/index-only, partial, etc.) and are most valuable when they align with the query’s WHERE clause, JOIN predicates, and ORDER BY. In a Java backend, you typically create and verify indexes via SQL, then validate plans with EXPLAIN ANALYZE to ensure the queries use index scans instead of sequential scans.

```sql
-- SQL: sample schema and indexing strategy (PostgreSQL syntax)
CREATE TABLE IF NOT EXISTS orders (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  total NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Composite index to support range + sort on (user_id, created_at)
CREATE INDEX IF NOT EXISTS idx_orders_user_created
  ON orders (user_id, created_at DESC);

-- Individual index useful for status-based filtering
CREATE INDEX IF NOT EXISTS idx_orders_status
  ON orders (status);

-- Optional: covering/index-only-like idea (PostgreSQL 11+ supports INCLUDE)
-- WHERE the query only needs (user_id, created_at, total)
-- CREATE INDEX IF NOT EXISTS idx_orders_covering ON orders (user_id, created_at) INCLUDE (total, status);

-- Partial index (only for OPEN orders) to optimize a common open-workflow query
CREATE INDEX IF NOT EXISTS idx_orders_open_partial ON orders (user_id, created_at)
  WHERE status = 'OPEN';
```

```java
import java.sql.*;

public class IndexDemo {
    private final Connection conn;

    public IndexDemo(Connection conn) {
        this.conn = conn;
    }

    // Ensure schema exists (DDL from above)
    public void ensureSchema() throws SQLException {
        try (Statement stmt = conn.createStatement()) {
            stmt.executeUpdate("CREATE TABLE IF NOT EXISTS orders (" +
                "id BIGINT PRIMARY KEY, " +
                "user_id BIGINT NOT NULL, " +
                "total NUMERIC(12,2) NOT NULL, " +
                "status VARCHAR(20) NOT NULL, " +
                "created_at TIMESTAMPTZ NOT NULL DEFAULT now(), " +
                "updated_at TIMESTAMPTZ NOT NULL DEFAULT now()" +
            ");");

            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_orders_user_created " +
                "ON orders (user_id, created_at DESC);");

            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_orders_status " +
                "ON orders (status);");

            // Partial index example
            stmt.executeUpdate("CREATE INDEX IF NOT EXISTS idx_orders_open_partial ON orders (user_id, created_at) " +
                "WHERE status = 'OPEN';");
        }
    }

    // Run a representative query with parameters
    public ResultSet runQueryWithAndWithoutIndex(long userId, Timestamp since) throws SQLException {
        String sql = "SELECT id, user_id, total, status, created_at " +
                     "FROM orders WHERE user_id = ? AND created_at >= ? " +
                     "ORDER BY created_at DESC";
        PreparedStatement ps = conn.prepareStatement(sql);
        ps.setLong(1, userId);
        ps.setTimestamp(2, since);
        return ps.executeQuery();
    }

    // Explain plan for the same query to verify index usage
    public void explainQuery(long userId, Timestamp since) throws SQLException {
        String explainSql = "EXPLAIN (ANALYZE, BUFFERS) " +
                            "SELECT id, user_id, total FROM orders " +
                            "WHERE user_id = ? AND created_at >= ?";
        try (PreparedStatement ps = conn.prepareStatement(explainSql)) {
            ps.setLong(1, userId);
            ps.setTimestamp(2, since);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    System.out.println(rs.getString(1)); // print plan line
                }
            }
        }
    }
}
```

### Line-by-line explanation
- SQL block:
  - Creates a robust orders table with fields commonly used in e-commerce or data-collection apps.
  - Creates a composite index on (user_id, created_at DESC) to support queries filtering by user and ordering by creation time.
  - Adds a separate index on status to speed up status-filtered queries.
  - Demonstrates a partial index (WHERE status = 'OPEN') to optimize frequent, low-selectivity queries on open orders.
- Java class:
  - IndexDemo holds a JDBC Connection for executing DDL and DML.
  - ensureSchema() creates the table and three/indexes if they do not exist, enabling repeatable runs in development.
  - runQueryWithAndWithoutIndex() demonstrates a typical parameterized query that benefits from a composite index.
  - explainQuery() issues an EXPLAIN ANALYZE plan for the same query to verify whether an index scan is chosen and to observe runtime characteristics (e.g., planning time, actual rows, buffers).

## 2. Designing Effective Indexes: Composite, Partial, and Covering Indexes
Indexes are most effective when they align with how you filter, join, and sort data. This section demonstrates practical index designs and how to validate their usefulness with query plans.

```sql
-- Composite index for a common query: filter by user_id and date
CREATE INDEX IF NOT EXISTS idx_orders_user_created2
  ON orders (user_id, created_at);

-- Partial index to optimize an open-orders workflow
CREATE INDEX IF NOT EXISTS idx_orders_open2 ON orders (user_id, created_at)
  WHERE status = 'OPEN';

-- Covering/index-only-like index (PostgreSQL): include non-key columns to avoid heap fetches
CREATE INDEX IF NOT EXISTS idx_orders_covering
  ON orders (user_id, created_at)
  INCLUDE (total, status);
```

```java
import java.sql.*;

public class CompositeIndexTest {
    private final Connection conn;

    public CompositeIndexTest(Connection conn) { this.conn = conn; }

    public void explainWithComposite(long userId, Timestamp since) throws SQLException {
        String sql = "EXPLAIN (ANALYZE, BUFFERS) " +
                     "SELECT id, total, status FROM orders " +
                     "WHERE user_id = ? AND created_at >= ? " +
                     "ORDER BY created_at DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, userId);
            ps.setTimestamp(2, since);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) System.out.println(rs.getString(1));
            }
        }
    }

    public void queryWithCoveringIndex(long userId, Timestamp since) throws SQLException {
        // Query that can be served by a covering index (includes total, status)
        String sql = "SELECT user_id, created_at, total, status FROM orders " +
                     "WHERE user_id = ? AND created_at >= ? " +
                     "ORDER BY created_at DESC";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setLong(1, userId);
            ps.setTimestamp(2, since);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    // Read columns that are in the covering index
                    long id = rs.getLong("user_id");
                    // total and status also accessible without extra lookups
                    // (in real code, map to a DTO)
                }
            }
        }
    }
}
```

### Line-by-line explanation
- SQL block:
  - idx_orders_user_created2 reinforces the same idea as the first composite index but demonstrates a slightly different name; the order (user_id, created_at) remains optimal for range filters on created_at after user_id equality.
  - idx_orders_open2 is a partial index for open orders, focusing on a common active-set query.
  - idx_orders_covering adds INCLUDE columns (total, status) so queries selecting those columns can be served entirely from the index without touching the table.
- Java class:
  - explainWithComposite() prints the EXPLAIN ANALYZE plan for a query using the composite index.
  - queryWithCoveringIndex() shows how a query can rely on the covering index to fetch needed columns without heap lookups, illustrating the index-only scan concept.

## 3. Query Planning, the Optimizer, and How to Influence It from Java
The database optimizer chooses the plan based on statistics, available indexes, and query shape. You influence plans by writing parameterized queries, updating statistics, and sometimes guiding the planner with hints (where supported). In Java, you should prefer prepared statements to ensure plan reuse, reduce SQL injection risk, and allow the DB to cache and reuse plans efficiently.

```java
// Bad: string concatenation (vulnerable to injection, disables plan caching)
public ResultSet badQuery(long userId) throws SQLException {
    String sql = "SELECT * FROM orders WHERE user_id = " + userId;
    return getConnection().createStatement().executeQuery(sql);
}
```

```java
// Good: parameterized query (safer + enables plan reuse)
public ResultSet goodQuery(long userId) throws SQLException {
    String sql = "SELECT * FROM orders WHERE user_id = ?";
    try (PreparedStatement ps = getConnection().prepareStatement(sql)) {
        ps.setLong(1, userId);
        return ps.executeQuery();
    }
}
```

```java
// Explain plan via prepared statement to observe the chosen plan for a parameterized query
public void explainParameterized(long userId) throws SQLException {
    String sql = "EXPLAIN (FORMAT JSON) SELECT * FROM orders WHERE user_id = ?";
    try (PreparedStatement ps = getConnection().prepareStatement(sql)) {
        ps.setLong(1, userId);
        try (ResultSet rs = ps.executeQuery()) {
            if (rs.next()) {
                System.out.println(rs.getString(1)); // JSON plan
            }
        }
    }
}
```

### Line-by-line explanation
- Bad example shows string concatenation, which is unsafe and prevents the database from reusing execution plans effectively.
- Good example uses PreparedStatement with a parameter placeholder, enabling safe binding, preventing SQL injection, and allowing the database to reuse the same execution plan for different parameter values.
- explainParameterized() asks the database to produce an explain plan for a parameterized query, demonstrating how to inspect the plan without hard-coding values.

## 4. Performance Patterns: Caching, Pagination, and Query Optimization
Performance isn’t only about fast single queries; it’s about robust, scalable data access patterns. This section shows practical patterns in Java: pagination strategies, caching to avoid repeated loads, and awareness of when to fetch related data.

```java
// 1) Simple LIMIT-based pagination (offset)
public List<Order> listOrdersWithOffset(long userId, int limit, int offset) throws SQLException {
    String sql = "SELECT id, user_id, total, status, created_at " +
                 "FROM orders WHERE user_id = ? " +
                 "ORDER BY created_at DESC LIMIT ? OFFSET ?";
    try (PreparedStatement ps = conn.prepareStatement(sql)) {
        ps.setLong(1, userId);
        ps.setInt(2, limit);
        ps.setInt(3, offset);
        try (ResultSet rs = ps.executeQuery()) {
            List<Order> orders = new ArrayList<>();
            while (rs.next()) {
                orders.add(new Order(rs.getLong("id"), rs.getLong("user_id"),
                                     rs.getBigDecimal("total"), rs.getString("status"),
                                     rs.getTimestamp("created_at")));
            }
            return orders;
        }
    }
}
```

```java
// 2) Keyset pagination (stable against inserts/deletes during paging)
public List<Order> listOrdersKeyset(long userId, Timestamp lastCreatedAt, int limit) throws SQLException {
    String sql = "SELECT id, user_id, total, status, created_at " +
                 "FROM orders WHERE user_id = ? AND created_at < ? " +
                 "ORDER BY created_at DESC LIMIT ?";
    try (PreparedStatement ps = conn.prepareStatement(sql)) {
        ps.setLong(1, userId);
        ps.setTimestamp(2, lastCreatedAt);
        ps.setInt(3, limit);
        try (ResultSet rs = ps.executeQuery()) {
            List<Order> orders = new ArrayList<>();
            while (rs.next()) {
                orders.add(new Order(rs.getLong("id"), rs.getLong("user_id"),
                                     rs.getBigDecimal("total"), rs.getString("status"),
                                     rs.getTimestamp("created_at")));
            }
            return orders;
        }
    }
}
```

```java
// 3) Simple in-memory cache to avoid repeated hot reads (demo purposes)
import java.util.concurrent.*;
import java.util.*;

public class OrdersCache {
    private final ConcurrentHashMap<Long, List<Order>> cache = new ConcurrentHashMap<>();
    private final long ttlMs;

    public OrdersCache(long ttlMs) {
        this.ttlMs = ttlMs;
    }

    public List<Order> get(long userId, java.util.function.Supplier<List<Order>> loader) {
        List<Order> result = cache.get(userId);
        if (result != null) return result;
        List<Order> loaded = loader.get();
        cache.put(userId, loaded);
        // In a real system, attach TTL eviction
        return loaded;
    }
}
```

### Line-by-line explanation
- listOrdersWithOffset shows a straightforward pagination approach using LIMIT and OFFSET, simple to implement but can become slow with large offsets.
- listOrdersKeyset demonstrates keyset pagination, which is generally faster for large datasets because it uses a fixed filter on the last seen value and avoids OFFSET scanning.
- OrdersCache provides a small, thread-safe caching layer to reduce hit latency for repeated reads. In production, use a dedicated cache (e.g., Caffeine, Redis) with eviction policies and cache invalidation hooks.

## 5. Observability: Measuring, Analyzing, and Tuning
Production-grade systems require visibility into how queries perform. This section covers timing, plan inspection, and lightweight instrumentation you can wire into logs or metrics.

```java
import java.util.logging.Logger;

public class QueryMonitor {
    private static final Logger logger = Logger.getLogger(QueryMonitor.class.getName());

    public static <T> T time(String label, java.util.Supplier<T> supplier) {
        long start = System.nanoTime();
        try {
            return supplier.get();
        } finally {
            long elapsedMs = (System.nanoTime() - start) / 1_000_000;
            logger.info(label + " took " + elapsedMs + " ms");
        }
    }
}
```

```java
// Example usage: time a query and also capture EXPLAIN plan
public void timedQueryWithExplain(long userId) throws SQLException {
    String sql = "EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM orders WHERE user_id = ?";
    try (PreparedStatement ps = conn.prepareStatement(sql)) {
        ps.setLong(1, userId);
        QueryMonitor.time("ExplainPlan for user_id=" + userId, () -> {
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    // Print or ship to metrics
                    System.out.println(rs.getString(1));
                }
            } catch (SQLException e) {
                throw new RuntimeException(e);
            }
            return null;
        });
    }
}
```

### Line-by-line explanation
- QueryMonitor.time provides a tiny utility to measure and log how long a block of code takes, enabling consistent timing instrumentation for queries.
- timedQueryWithExplain demonstrates measuring both the latency of a query and collecting its explain plan, giving insight into whether an index scan is used and how long the plan executes.

## X. Common Beginner Mistakes
- Bad: N+1 queries in loops leading to hundreds or thousands of small round-trips.
- Good: Use a single join or batch fetch to reduce round trips.
```java
// Bad (N+1)
for (Order o : orders) {
    // query to fetch items per order
    PreparedStatement ps = conn.prepareStatement("SELECT * FROM order_items WHERE order_id = ?");
    ps.setLong(1, o.getId());
    ResultSet rs = ps.executeQuery();
    // accumulate
}

// Good (batch/join)
String sql = "SELECT o.id, oi.* FROM orders o LEFT JOIN order_items oi ON o.id = oi.order_id WHERE o.user_id = ?";
```

- Bad: Building SQL with string concatenation, exposing to SQL injection and hurting plan cache.
- Good: Always use prepared statements and parameter binding.
```java
// Bad
String sql = "SELECT * FROM orders WHERE user_id = " + userId;
Statement st = conn.createStatement();
st.execute(sql);

// Good
String sql = "SELECT * FROM orders WHERE user_id = ?";
PreparedStatement ps = conn.prepareStatement(sql);
ps.setLong(1, userId);
ps.executeQuery();
```

- Bad: Ignoring ANALYZE/STATISTICS maintenance after large data loads or bulk imports.
- Good: Run ANALYZE (or let your DB routine maintain it) after bulk changes to refresh stats for the planner.
```sql
ANALYZE orders;
```

- Bad: Over- or under-indexing. Too many indexes slow writes; too few indexes slow reads.
- Good: Start with a targeted composite index on common filters; monitor with EXPLAIN ANALYZE and adjust.

## Y. Why This Matters In Real Systems
In production, microsecond-level gains aggregate across millions of requests. A missing or misapplied index can multiply latency by orders of magnitude under load, while over-indexing introduces write amplification and maintenance overhead. Query planning affects not just latency but resource utilization (CPU, I/O, buffers). Java applications that consistently use parameterized queries, measure plan quality, and follow pagination and caching best practices tend to see more stable SLAs, simpler scaling strategies, and clearer performance budgets. Real systems rely on a disciplined approach: design indexes around common query patterns, validate with EXPLAIN ANALYZE, and instrument latency and plan quality in production dashboards.

## Z. Study Questions
1) What is a covering index and how does it reduce heap lookups?  
2) How does keyset pagination differ from offset pagination, and why is it often preferred for large datasets?  
3) Why should you prefer prepared statements over string concatenation when issuing SQL from Java?  
4) What is the role of ANALYZE in PostgreSQL, and when should you run it?  
5) How can you verify in Java that a query is using an index scan rather than a sequential scan?

## Exercise
Multi-part practical coding challenge to solidify indexing, planning, and performance habits.

Part A — Schema and Indexing Setup
- Create a PostgreSQL (or your preferred DB) schema for a hypothetical e-commerce orders system:
  - Table: orders(id, user_id, total, status, created_at)
  - Ensure appropriate data types and constraints.
  - Implement:
    - Composite index on (user_id, created_at) to accelerate range+sort queries.
    - Partial index on (user_id, created_at) WHERE status = 'OPEN' to optimize open orders.
    - Optional covering index on (user_id, created_at) INCLUDE (total, status) if your DB supports INCLUDE.
- Populate the table with at least 100k rows (randomized) to create realistic plan behavior.

Part B — Java Query Patterns
- Write a Java class (OrderRepository) that:
  - Uses a DataSource for connection pooling.
  - Provides:
    - List<Order> fetchRecentOrders(long userId, int limit) using LIMIT.
    - List<Order> fetchOrdersKeyset(long userId, Timestamp lastCreatedAt, int limit) using keyset pagination.
    - A method explainQueryForUser(long userId) that prints EXPLAIN ANALYZE for a representative query.
  - Uses prepared statements for all parameterized queries.
  - Instruments timing via a small utility similar to the QueryMonitor above and logs plan quality.

Part C — Observability & Validation
- Add a small test or main method that:
  - Executes both pagination methods for the same user and compares average latency.
  - Runs EXPLAIN ANALYZE for a few critical queries and prints whether an index scan is used (based on the plan lines).
  - Optionally uses a simple in-memory cache for the last N users’ recent orders to demonstrate caching benefits.

Deliverables:
- SQL scripts for schema and indexes.
- A Java project snippet with the OrderRepository, supporting classes, and a main/test harness that demonstrates:
  - Proper use of prepared statements
  - EXPLAIN ANALYZE outputs
  - Pagination strategies (LIMIT/OFFSET and keyset)
  - A simple caching layer
  - Basic latency measurements and logging

Notes:
- You can adapt to PostgreSQL, MySQL 8+, or H2 (with feature adjustments). If you switch DBs, verify exact syntax for partial and covering indexes (partial is supported in PostgreSQL; MySQL has generated columns and other options; H2 may differ).
- In production, replace the simple in-memory cache with a robust external cache (e.g., Redis, Caffeine) and implement proper cache invalidation tied to write paths.