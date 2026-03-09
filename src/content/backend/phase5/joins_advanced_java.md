# Advanced SQL — JOINs, Subqueries & Aggregations in Java

In backend systems, data access is the lifeblood of services. Mastering JOINs, subqueries, and aggregations lets you pull precisely the right data, at the right time, with scalable queries. This lesson focuses on how to express complex relationships across tables, reason about subqueries and derived tables, and leverage aggregations to power analytics and efficient reporting—using Java and JDBC as the practical delivery mechanism.

## 1. Mastering JOINs: Inner, Left, Right, and Full

JOINs are the primary mechanism to combine data from multiple tables. Understanding how INNER JOIN, LEFT JOIN, RIGHT JOIN, and FULL JOIN behave helps you model real-world relationships (customers, orders, products) with correctness and performance.

### SQL: INNER JOIN example
```sql
SELECT
  c.customer_id,
  c.name AS customer_name,
  o.order_id,
  o.order_date,
  o.total
FROM customers c
INNER JOIN orders o
  ON c.customer_id = o.customer_id
ORDER BY o.order_date DESC;
```

### Line-by-line explanation
- SELECT: chooses the columns to return, including customer_id, customer_name, and order details.
- FROM customers c: selects the customers table and aliases it as c.
- INNER JOIN orders o: joins the orders table, aliasing as o, returning only rows where the join condition matches.
- ON c.customer_id = o.customer_id: join condition linking each customer to their orders.
- ORDER BY o.order_date DESC: sorts results by order date in descending order.

### SQL: LEFT JOIN example
```sql
SELECT
  c.customer_id,
  c.name AS customer_name,
  o.order_id,
  o.order_date
FROM customers c
LEFT JOIN orders o
  ON c.customer_id = o.customer_id
ORDER BY c.customer_id, o.order_date DESC;
```

### Line-by-line explanation
- LEFT JOIN returns all rows from the left table (customers) and matched rows from the right table (orders). If there is no match, NULLs appear for the right-side columns.
- The rest follows INNER JOIN semantics, with the key difference being how non-matching rows are handled.

### Java: Running a join query with JDBC
```java
String sql = "SELECT c.customer_id, c.name, o.order_id, o.order_date " +
             "FROM customers c INNER JOIN orders o ON c.customer_id = o.customer_id " +
             "WHERE c.customer_id = ?";
try (Connection conn = dataSource.getConnection();
     PreparedStatement ps = conn.prepareStatement(sql)) {
    ps.setInt(1, customerId);
    try (ResultSet rs = ps.executeQuery()) {
        while (rs.next()) {
            int cid = rs.getInt("customer_id");
            String name = rs.getString("name");
            int orderId = rs.getInt("order_id");
            Date orderDate = rs.getDate("order_date");
            // Map to domain object or accumulate results
        }
    }
}
```

### Line-by-line explanation
- String sql = "...": builds a parameterized INNER JOIN query to fetch a specific customer's orders.
- DataSource.getConnection(): obtains a JDBC connection from a pool.
- PreparedStatement ps = conn.prepareStatement(sql): prepares the SQL with parameter placeholders.
- ps.setInt(1, customerId): binds the customerId parameter safely.
- ps.executeQuery(): executes the query and returns a ResultSet.
- ResultSet rs = ... and while (rs.next()): iterates through each row, extracting columns with getters.
- Mapping logic: convert each row into a domain object (e.g., CustomerOrder) or accumulate results.

### When to prefer each JOIN type
- INNER JOIN: you only want rows that have matching data in both sides.
- LEFT JOIN: you want all records from the primary table, with matched data when available.
- RIGHT JOIN: similar to LEFT JOIN but symmetrical; less common, often replaced with LEFT JOIN by flipping table order.
- FULL JOIN: returns all rows when there is a match in either side; not supported by all dialects or can be expensive.

## 2. Subqueries and Derived Tables

Subqueries let you express queries that depend on, or derive from, other queries. They enable filtering, computing per-row aggregates, and building derived tables to be joined with. We’ll cover scalar subqueries, correlated subqueries, and derived tables in FROM.

### SQL: Scalar subquery (per-row calculation)
```sql
SELECT
  c.customer_id,
  c.name,
  (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) AS order_count
FROM customers c;
```

### Line-by-line explanation
- SELECT c.customer_id, c.name: basic customer data returned per row.
- (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) AS order_count: a scalar subquery executed for each customer row to count their orders.
- FROM customers c: base table for per-row computation.

### SQL: Correlated subquery with EXISTS
```sql
SELECT
  c.customer_id,
  c.name
FROM customers c
WHERE EXISTS (
  SELECT 1
  FROM orders o
  WHERE o.customer_id = c.customer_id
    AND o.status = 'SHIPPED'
);
```

### Line-by-line explanation
- WHERE EXISTS (...): filters customers to those for which the inner query returns at least one row.
- The inner query references the outer alias c.customer_id, making it correlated.
- EXISTS is efficient for existence checks because the optimizer can stop early on first match.

### SQL: Derived table in FROM
```sql
SELECT d.customer_id, d.total_spent
FROM (
  SELECT customer_id, SUM(total) AS total_spent
  FROM orders
  GROUP BY customer_id
) d
WHERE d.total_spent > 1000;
```

### Line-by-line explanation
- Subquery in FROM: creates a derived table named d with precomputed aggregates.
- In the subquery: GROUP BY customer_id aggregates totals per customer.
- Outer query filters derived results to customers whose total_spent exceeds 1000.

### Java: Using a derived table query with parameters
```java
String sql = "SELECT d.customer_id, d.total_spent " +
             "FROM (SELECT customer_id, SUM(total) AS total_spent FROM orders GROUP BY customer_id) d " +
             "WHERE d.total_spent > ?";
try (Connection conn = dataSource.getConnection();
     PreparedStatement ps = conn.prepareStatement(sql)) {
    ps.setBigDecimal(1, new BigDecimal("1000"));
    try (ResultSet rs = ps.executeQuery()) {
        // Map results
    }
}
```

### Line-by-line explanation
- The SQL uses a derived table to compute totals and then filters by a parameter.
- The Java code demonstrates parameter-binding for safety and performance.

## 3. Aggregations, Grouping, and Window Functions

Aggregations summarize data, while GROUP BY and HAVING refine results. Window functions provide per-row analytics across a set of rows related to the current row, which is powerful for ranking, running totals, and cumulative insights without collapsing rows.

### SQL: Basic GROUP BY
```sql
SELECT
  customer_id,
  SUM(total) AS total_spent,
  COUNT(*) AS orders_count
FROM orders
GROUP BY customer_id;
```

### Line-by-line explanation
- GROUP BY customer_id: aggregates all rows per customer_id.
- SUM(total) AS total_spent: computes the total spent per customer.
- COUNT(*) AS orders_count: counts the number of orders per customer.

### SQL: HAVING filter on aggregates
```sql
SELECT
  customer_id,
  SUM(total) AS total_spent
FROM orders
GROUP BY customer_id
HAVING SUM(total) > 1000;
```

### Line-by-line explanation
- HAVING SUM(total) > 1000: filters groups after aggregation, excluding customers with total_spent <= 1000.
- NOTE: HAVING is the correct predicate for aggregate-filtering; WHERE cannot reference aggregate results.

### SQL: Window function example (running total per customer)
```sql
SELECT
  customer_id,
  order_id,
  order_date,
  SUM(total) OVER (PARTITION BY customer_id ORDER BY order_date
                   ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
FROM orders
ORDER BY customer_id, order_date;
```

### Line-by-line explanation
- SUM(total) OVER (...): computes a running total per customer, ordered by order_date.
- PARTITION BY customer_id: starts a new window for each customer.
- ORDER BY order_date: defines the frame order within each partition.
- ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW: includes all rows up to the current row in the window.
- The result includes a running_total column while preserving one row per order.

### Java: Aggregations in practice
```java
String sql = "SELECT customer_id, SUM(total) AS total_spent, COUNT(*) AS orders_count " +
             "FROM orders GROUP BY customer_id";
try (Connection conn = dataSource.getConnection();
     PreparedStatement ps = conn.prepareStatement(sql);
     ResultSet rs = ps.executeQuery()) {
    while (rs.next()) {
        int customerId = rs.getInt("customer_id");
        BigDecimal totalSpent = rs.getBigDecimal("total_spent");
        int ordersCount = rs.getInt("orders_count");
        // Map to domain objects or analytics structures
    }
}
```

### Line-by-line explanation
- The SQL computes per-customer aggregates; the Java code shows how to execute and map results in a safe, resource-lean way using try-with-resources.

## X. Common Beginner Mistakes

### 1) Bad: SELECT * in joins
- Bad:
```sql
SELECT *
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id;
```
- Good:
```sql
SELECT
  c.customer_id,
  c.name,
  o.order_id,
  o.order_date
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id;
```

### Line-by-line explanation
- SELECT * pulls all columns, which can cause column ambiguities, transfer of unnecessary data, and brittle queries if schema changes. Explicit column lists are clearer and safer.

### 2) Bad: SQL injection via string concatenation
- Bad:
```java
String sql = "SELECT * FROM orders WHERE customer_id = " + customerId;
Statement stmt = conn.createStatement();
ResultSet rs = stmt.executeQuery(sql);
```
- Good:
```java
String sql = "SELECT * FROM orders WHERE customer_id = ?";
try (PreparedStatement ps = conn.prepareStatement(sql)) {
    ps.setInt(1, customerId);
    try (ResultSet rs = ps.executeQuery()) { /* ... */ }
}
```

### Line-by-line explanation
- String concatenation builds SQL with user input, enabling injection.
- PreparedStatement parameter binding prevents SQL injection and allows query plan reuse.

### 3) Bad: N+1 query pattern
- Bad:
```java
List<Customer> customers = fetchAllCustomers();
for (Customer c : customers) {
    List<Order> orders = fetchOrdersForCustomer(c.getId());
    c.setOrders(orders);
}
```
- Good (single, joined query or batch fetch)
```sql
SELECT c.customer_id, c.name, o.order_id, o.order_date
FROM customers c
LEFT JOIN orders o ON c.customer_id = o.customer_id;
```
or a batched approach with IN (...) on a single prepared statement.
```

### Line-by-line explanation
- N+1: running a separate query for each parent row causes many round-trips and slow performance.
- The better approach reduces database chatter by joining or batching.

### 4) Bad: Assuming non-null join results
- Bad:
```java
while (rs.next()) {
    String orderDate = rs.getString("order_date"); // may be NULL for left joins
    // ...
}
```
- Good:
```java
Date orderDate = rs.getDate("order_date"); // handles NULLs safely
```

### Line-by-line explanation
- LEFT JOINs can produce NULL values in right-side columns; code must guard against nulls or use appropriate getters that return null-safe types.

## Y. Why This Matters In Real Systems

- Performance and scalability: complex JOINs and subqueries can blow up if misused. Use proper indexing (foreign keys on join columns, supporting columns for filters) and analyze plans with EXPLAIN/QUERY PLAN.
- Correctness and data integrity: understanding how JOIN types affect the result set ensures you don’t lose data or propagate NULLs unintentionally.
- Maintainability: explicit column lists and clear subquery structure make queries easier to optimize and debug.
- Real-world patterns: derived tables enable pre-aggregation (materialized-like behavior), window functions power analytics dashboards, and HAVING pre-filters data without transporting excess rows.
- Operational concerns: combine advanced SQL with JDBC best practices (connection pooling, proper exception handling, resource cleanup) to keep services robust under load.

## Z. Study Questions

1) What is the difference between INNER JOIN and LEFT JOIN with an example scenario?
2) How does a correlated subquery differ from an uncorrelated subquery? Provide a use case.
3) When should you use HAVING instead of WHERE, and why?
4) Explain N+1 query problems and how to mitigate them in a Java/JDBC context.
5) How can window functions empower analytics in an order-tracking system? Provide an example.

## Exercise

Multi-part practical coding challenge. You will implement SQL snippets and a small Java program that demonstrates the concepts from this lesson against a hypothetical e-commerce schema (tables: customers, orders, order_items, products).

Part A — Write SQL queries
1) INNER JOIN with order details
- Task: List each customer with their most recent order (order_id, order_date) and total per order.
- Expected shape: customer_id, customer_name, order_id, order_date, order_total
- Hint: join customers to orders, and order totals come from orders.total.

2) Subquery and derived table usage
- Task 2a: For every customer, compute the number of orders they have using a scalar subquery.
- Task 2b: Use a derived table to precompute each customer’s total_spent (SUM(orders.total)) and then filter to those who spent more than 1000.
- Provide both SQL statements.

3) Aggregations and windowing
- Task: Produce a running total of spend per customer ordered by order_date, showing running_total alongside each row.

Part B — Java program scaffold
Create a small Java class that uses JDBC to connect to a database (dataSource or DriverManager) and executes the queries from Part A. The program should:
- Map results into simple POJOs (CustomerOrder, CustomerSpending, RunningTotalRow).
- Use PreparedStatement for parameterized queries where applicable.
- Demonstrate resource-safe handling with try-with-resources.
- Print the results in a readable format.

Part C — Extension (optional)
- Add parameterization to allow filtering by a minimum order_date (e.g., only orders after 2023-01-01) in the INNER JOIN query.
- Use a window function variant if your DB supports it and show how the running_total responds to the date filter.

Starter code (fill in the blanks as you complete each task)
- SQL templates:
  - Inner join with latest order (to be refined by you):
    SELECT c.customer_id, c.name AS customer_name, o.order_id, o.order_date, o.total
    FROM customers c
    INNER JOIN orders o ON c.customer_id = o.customer_id
    -- optionally add filters
    ;
  - Scalar subquery:
    SELECT c.customer_id, c.name, (SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.customer_id) AS order_count
    FROM customers c;
  - Derived table:
    SELECT d.customer_id, d.total_spent
    FROM (
      SELECT customer_id, SUM(total) AS total_spent
      FROM orders
      GROUP BY customer_id
    ) d
    WHERE d.total_spent > 1000;
  - Running total (window function):
    SELECT customer_id, order_id, order_date,
           SUM(total) OVER (PARTITION BY customer_id ORDER BY order_date
                          ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_total
    FROM orders
    ORDER BY customer_id, order_date;

- Java skeleton:
  - DataSource setup (or DriverManager) and a simple POJO class:
    public class CustomerOrder {
        int customerId;
        String customerName;
        int orderId;
        Date orderDate;
        BigDecimal total;
        // getters/setters
    }

    public class Main {
        public static void main(String[] args) {
            // Initialize dataSource or connection
            // Call methods to run Part A and print results
        }
    }

Notes:
- Use a real database connection in your environment to run the exercises. If you’re practicing offline, you can mock the results or use an in-memory database like H2 or SQLite for quick iteration.
- Focus on correctness, readability, and safe resource handling. After completing each part, reflect on performance considerations (indexes, query plans, and data volume expectations).