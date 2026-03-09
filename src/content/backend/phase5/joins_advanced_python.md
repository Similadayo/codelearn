# Advanced SQL — JOINs, Subqueries & Aggregations in Python

In backend engineering, SQL is a first-class citizen for data access. Mastering JOINs, subqueries, and aggregations lets you build efficient reports, implement complex data retrieval, and enforce robust data integrity in APIs and services. This lesson walks through practical patterns you’ll use in real systems, with Python-backed examples you can run locally to see results and performance characteristics firsthand.

## 1. JOINs: INNER, LEFT, CROSS, and Practical Variants

Python and SQL often meet at the boundary of data access. In this section, you’ll see practical examples of how to combine data across multiple tables, what you get with different JOIN types, and how to reason about NULLs and Cartesian products in production-style queries.

Code block (Python + SQL for SQLite-compatible demonstrations)
```python
import sqlite3
from datetime import datetime

# In-memory database setup
conn = sqlite3.connect(":memory:")
cur = conn.cursor()

# Create a simple schema for users, orders, products, categories, and order items
cur.executescript("""
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT
);

CREATE TABLE categories (
    id INTEGER PRIMARY KEY,
    name TEXT
);

CREATE TABLE products (
    id INTEGER PRIMARY KEY,
    name TEXT,
    category_id INTEGER,
    price REAL,
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
    id INTEGER PRIMARY KEY,
    user_id INTEGER,
    created_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id INTEGER PRIMARY KEY,
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
""")

# Seed data
cur.executemany("INSERT INTO users (id, name) VALUES (?, ?)", [
    (1, 'Alice'), (2, 'Bob'), (3, 'Carol'), (4, 'Dave')
])
cur.executemany("INSERT INTO categories (id, name) VALUES (?, ?)", [
    (1, 'Electronics'), (2, 'Books'), (3, 'Home')
])
cur.executemany("INSERT INTO products (id, name, category_id, price) VALUES (?, ?, ?, ?)", [
    (1, 'Phone', 1, 699.00),
    (2, 'Laptop', 1, 1200.00),
    (3, 'Book A', 2, 19.99),
    (4, 'Blender', 3, 49.99)
])
cur.executemany("INSERT INTO orders (id, user_id, created_at) VALUES (?, ?, ?)", [
    (1, 1, '2024-01-12'), (2, 1, '2024-02-15'),
    (3, 2, '2024-03-03')
])
cur.executemany("INSERT INTO order_items (id, order_id, product_id, quantity) VALUES (?, ?, ?, ?)", [
    (1, 1, 1, 1),   # Alice bought Phone
    (2, 1, 3, 2),   # Alice bought 2x Book A
    (3, 2, 2, 1),   # Alice bought Laptop
    (4, 3, 4, 1)    # Bob bought Blender
])
conn.commit()
```

Inner join example: fetch users and their orders with totals per order
```python
cur.execute("""
SELECT u.name AS user, o.id AS order_id, SUM(oi.quantity * p.price) AS order_total
FROM orders o
JOIN users u ON o.user_id = u.id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON oi.product_id = p.id
GROUP BY o.id, u.name
ORDER BY order_total DESC
""")
for row in cur.fetchall():
    print(row)
```

Left join example: list all users and their orders (including users with no orders)
```python
cur.execute("""
SELECT u.name AS user, o.id AS order_id
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
ORDER BY user, order_id
""")
for row in cur.fetchall():
    print(row)
```

Cross join example: Cartesian product to illustrate combinatorics (careful with size)
```python
cur.execute("""
SELECT u.name AS user, c.name AS category
FROM users u
CROSS JOIN categories c
LIMIT 6
""")
for row in cur.fetchall():
    print(row)
```

Line-by-line explanation
- import sqlite3: load the SQLite driver.
- Connect to an in-memory database for a lightweight sandbox.
- Create five tables modeling users, categories, products, orders, and order_items.
- Seed data to enable meaningful joins across tables.
- Inner join query: joins orders to their owning users and their items to produce per-order totals.
- LEFT JOIN query: preserves all users, attaching order_id where present, showing NULLs where there are no orders.
- CROSS JOIN query: discards join conditions to demonstrate a Cartesian product, with a LIMIT to avoid explosion.
- Each query uses explicit column aliases to avoid ambiguity when multiple tables share column names (e.g., id, name).

X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side
- Pitfall 1: Ambiguous column references in joins (SELECT * is risky)
  - Bad:
    ```sql
    SELECT id, name, created_at
    FROM orders o
    JOIN users u ON o.user_id = u.id;
    ```
  - Good:
    ```sql
    SELECT o.id AS order_id, u.name AS user_name, o.created_at
    FROM orders o
    JOIN users u ON o.user_id = u.id;
    ```

- Pitfall 2: Turning LEFT JOIN into INNER JOIN unintentionally
  - Bad:
    ```sql
    SELECT u.name, o.id
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    WHERE o.id IS NOT NULL;
    ```
  - Good:
    ```sql
    SELECT u.name, o.id
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id;
    ```
    Explanation: Avoid filtering on a LEFT JOIN column in WHERE without accounting for NULLs; use HAVING or move the filter into the JOIN condition if needed.

- Pitfall 3: SQL injection risk from string interpolation
  - Bad:
    ```python
    user_id = 1
    cur.execute("SELECT * FROM orders WHERE user_id = {}".format(user_id))
    ```
  - Good:
    ```python
    user_id = 1
    cur.execute("SELECT * FROM orders WHERE user_id = ?", (user_id,))
    ```
  - Additional note: Always parameterize queries to avoid injection, and prefer bound parameters even for simple values.

Y. Why This Matters In Real Systems — production context and real usage

- Performance and plans:
  - Joins can explode row counts; understand estimated row counts via EXPLAIN PLAN / EXPLAIN ANALYZE (PostgreSQL) or EXPLAIN QUERY PLAN (SQLite) to identify bottlenecks.
  - Use proper indexes on foreign keys (e.g., orders.user_id, order_items.order_id, order_items.product_id) to speed up joins.

- Data integrity and consistency:
  - Normalize data to minimize duplication, but denormalize when reporting requires speed. Use materialized views or aggregate tables for heavy dashboards.

- Query design patterns:
  - Prefer explicit column lists and aliases to avoid ambiguity as schemas evolve.
  - Combine subqueries and joins thoughtfully; sometimes CTEs (WITH clauses) can improve readability and allow better optimization for complex queries.

- Real-world constraints:
  - In high-throughput services, parameterized prepared statements improve plan reuse.
  - In multi-tenant systems, filter by tenant_id early to reduce scan scope and improve cache locality.

Z. Study Questions — 5 recall questions
1. What is the difference between an INNER JOIN and a LEFT JOIN? When would you choose one over the other?
2. How can a correlated subquery be used to compute per-record aggregates without additional joins?
3. Why should you avoid SELECT * in multi-table joins, and how do aliases help?
4. How would you rewrite a RIGHT JOIN using only LEFT JOIN syntax in databases that don’t support RIGHT JOIN?
5. What are some signs that an SQL query could benefit from an index on a join-key?

Exercise — practical multi-part coding challenge

Overview
Build a small backend analytics module using the dataset structure from Section 1. You’ll implement a series of queries that combine joins, subqueries, and aggregations, then implement a Python function-based API that returns results suitable for a REST endpoint.

Part 0: Setup and baseline data (in Python)
- Create an in-memory SQLite database with the schema used previously (users, categories, products, orders, order_items).
- Seed data with at least:
  - 4 users
  - 3 categories
  - 5 products
  - 4 orders
  - Several order_items (to total multiple orders across users)

Part 1: Revenue by user (JOIN + GROUP BY)
- Write a SQL query to compute total revenue per user (sum of quantity * product price) using proper joins.
- Return results as a list of dicts: [{ "user": "Alice", "revenue": 123.45 }, ...]

Part 2: Top customers with subqueries
- Write a scalar subquery to fetch the average order value across all orders, then include it as a column for each user as a comparison metric.
- Write a separate subquery to compute the number of orders per user and join this information to the user row.

Part 3: EXISTS-based filter
- Write a query that returns users who have at least one order in the last 90 days using EXISTS (you can seed created_at with ISO dates in the 2023-2024 range).
- Return results as a list of user names.

Part 4: Revenue by category per user (JOINs + GROUP BY)
- Build a query that shows, for each user, total revenue broken down by product category. The result can be a list of rows with user, category, revenue, e.g.:
  - { "user": "Alice", "category": "Electronics", "revenue": 1050.0 }
- Implement this with appropriate joins across users, orders, order_items, products, categories and a GROUP BY across user and category.

Part 5: Optional performance note
- Add a comment explaining how you would index the relevant columns for the queries above in a production PostgreSQL database (hint: foreign keys and frequently filtered columns).

Starter code (Python, SQLite)
```python
import sqlite3
from datetime import datetime, timedelta

def setup_db():
    conn = sqlite3.connect(":memory:")
    cur = conn.cursor()
    cur.executescript("""
    -- Schema
    CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE products (id INTEGER PRIMARY KEY, name TEXT, category_id INTEGER, price REAL,
                           FOREIGN KEY (category_id) REFERENCES categories(id));
    CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER, created_at TEXT,
                         FOREIGN KEY (user_id) REFERENCES users(id));
    CREATE TABLE order_items (id INTEGER PRIMARY KEY, order_id INTEGER, product_id INTEGER, quantity INTEGER,
                              FOREIGN KEY (order_id) REFERENCES orders(id),
                              FOREIGN KEY (product_id) REFERENCES products(id));
    """)
    # Seed data (simplified small dataset)
    cur.executemany("INSERT INTO users (id, name) VALUES (?, ?)", [
        (1, 'Alice'), (2, 'Bob'), (3, 'Carol'), (4, 'Dave')
    ])
    cur.executemany("INSERT INTO categories (id, name) VALUES (?, ?)", [
        (1, 'Electronics'), (2, 'Books'), (3, 'Home')
    ])
    cur.executemany("INSERT INTO products (id, name, category_id, price) VALUES (?, ?, ?, ?)", [
        (1, 'Phone', 1, 699.0),
        (2, 'Laptop', 1, 1200.0),
        (3, 'Book A', 2, 19.99),
        (4, 'Blender', 3, 49.99),
        (5, 'Headphones', 1, 199.0)
    ])
    now = datetime.now()
    cur.execute("INSERT INTO orders (id, user_id, created_at) VALUES (?, ?, ?)", (1, 1, (now - timedelta(days=10)).strftime('%Y-%m-%d')))
    cur.execute("INSERT INTO orders (id, user_id, created_at) VALUES (?, ?, ?)", (2, 1, (now - timedelta(days=40)).strftime('%Y-%m-%d')))
    cur.execute("INSERT INTO orders (id, user_id, created_at) VALUES (?, ?, ?)", (3, 2, (now - timedelta(days=5)).strftime('%Y-%m-%d')))
    cur.execute("INSERT INTO orders (id, user_id, created_at) VALUES (?, ?, ?)", (4, 3, (now - timedelta(days=200)).strftime('%Y-%m-%d')))
    cur.executemany("INSERT INTO order_items (id, order_id, product_id, quantity) VALUES (?, ?, ?, ?)", [
        (1, 1, 1, 1),
        (2, 1, 3, 2),
        (3, 2, 2, 1),
        (4, 3, 5, 1),
        (5, 3, 3, 2),
        (6, 4, 4, 1),
    ])
    conn.commit()
    return conn

def run_queries(conn):
    cur = conn.cursor()

    # Part 1: Revenue by user
    print("Revenue by user:")
    cur.execute("""
        SELECT u.name AS user, SUM(oi.quantity * p.price) AS revenue
        FROM users u
        JOIN orders o ON o.user_id = u.id
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        GROUP BY u.name
        ORDER BY revenue DESC
    """)
    for row in cur.fetchall():
        print(row)

    # Part 2: Scalar subquery for average order value and per-user order counts
    print("\nAverage order value (scalar subquery) shown per user:")
    cur.execute("""
        SELECT u.name,
               (SELECT AVG(total) FROM (
                   SELECT SUM(oi.quantity * p.price) AS total
                   FROM orders o2
                   JOIN order_items oi ON oi.order_id = o2.id
                   JOIN products p ON oi.product_id = p.id
                   WHERE o2.user_id = u.id
                   GROUP BY o2.id
               ) ) AS avg_order_value
        FROM users u
    """)
    for row in cur.fetchall():
        print(row)

    print("\nOrder count per user (correlated subquery):")
    cur.execute("""
        SELECT u.name,
               (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
        FROM users u
    """)
    for row in cur.fetchall():
        print(row)

    # Part 3: EXISTS-based filter (users with at least one order in last 90 days)
    ninety = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')
    print("\nUsers with at least one order in last 90 days (EXISTS):")
    cur.execute("""
        SELECT DISTINCT u.name
        FROM users u
        WHERE EXISTS (
            SELECT 1
            FROM orders o
            WHERE o.user_id = u.id
              AND o.created_at >= ?
        )
    """, (ninety,))
    for row in cur.fetchall():
        print(row)

    # Part 4: Revenue by category per user
    print("\nRevenue by user and category:")
    cur.execute("""
        SELECT u.name AS user, c.name AS category, SUM(oi.quantity * p.price) AS revenue
        FROM users u
        JOIN orders o ON o.user_id = u.id
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        GROUP BY u.name, c.name
        ORDER BY user, category
    """)
    for row in cur.fetchall():
        print(row)

def main():
    conn = setup_db()
    run_queries(conn)
    conn.close()

if __name__ == "__main__":
    main()
```

Line-by-line explanation
- setup_db initializes an in-memory SQLite database and builds a realistic schema for users, categories, products, orders, and order_items, including foreign keys to model relationships.
- Seed data populates the tables with a small but representative dataset to exercise joins and aggregations.
- Part 1 query computes total revenue per user by joining users -> orders -> order_items -> products, then aggregating by user.
- Part 2 shows scalar and correlated subqueries:
  - Scalar subquery computes the average order value per user by aggregating per-order totals in a subquery and then averaging those results.
  - Correlated subquery computes the number of orders per user by correlating the outer user_id.
- Part 3 uses EXISTS to filter for users with at least one order in the last 90 days, returning only those user names.
- Part 4 combines joins with grouping to produce revenue broken down by user and category.
- main ties the setup and queries together; run_queries prints human-readable results.

Notes for practitioners
- In real systems, replace SQLite with PostgreSQL or MySQL for richer SQL features (e.g., FULL JOIN, GROUPING SETS) and use EXPLAIN ANALYZE to tune.
- For large datasets, consider materialized views for hot aggregations and add suitable indexes on foreign keys (orders.user_id, order_items.order_id, order_items.product_id, products.category_id).

If you want to extend this lesson, you can experiment with:
- Window functions (e.g., running totals by user) if your database supports them.
- CTEs for more readable, modular queries.
- Replacing subqueries with JOINs where it improves readability or performance, depending on the query planner.

End of exercise.