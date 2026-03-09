# Backend Engineering: Phase 5 — Databases

Database design and normalization are foundational skills for scalable, maintainable back-end systems. By structuring data to minimize redundancy and anomalies, you make updates safer, queries faster to reason about, and migrations more predictable. In Python-based projects, you’ll frequently model these schemas with ORMs like SQLAlchemy or interact directly with SQL engines for clarity and control. This lesson walks through 1NF, 2NF, and 3NF with concrete Python examples, showing how each normal form changes table structure and data relationships.

## 1. 1NF Fundamentals and Atomicity

One First Normal Form (1NF) principle: every column must hold atomic (indivisible) values, and each row must be uniquely identifiable. A common stumbling block is storing a list or composite data (like multiple product IDs) in a single column, which makes updates, searches, and constraints brittle.

Code example: a flat, 1NF-violating schema (order with a single items field containing comma-separated product IDs).

```python
import sqlite3

# In-memory database for illustration
conn = sqlite3.connect(':memory:')
cur = conn.cursor()

# 1NF-violating: items column holds multiple values as a single string
cur.execute('''CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_name TEXT,
    items TEXT  -- atomicity violated: stores multiple values in one field
)''')

cur.execute("INSERT INTO orders (customer_name, items) VALUES ('Alice','101,102')")
cur.execute("INSERT INTO orders (customer_name, items) VALUES ('Bob','103')")
conn.commit()

# Simple read
cur.execute("SELECT * FROM orders")
rows = cur.fetchall()
print(rows)
```

### Line-by-line explanation
1. Import the sqlite3 module to interact with a SQLite in-memory database.  
2. Create an in-memory database connection for a simple, isolated example.  
3. Obtain a cursor for executing SQL statements.  
4. Define a table named orders with an order_id primary key, a customer_name, and an items column that stores multiple product IDs as a single text field (atomicity violation).  
5. Insert a row for Alice, listing two products in one field (101,102).  
6. Insert a row for Bob, listing a single product (103).  
7. Commit the transaction to persist changes.  
8. Query all rows from orders to inspect the structure.  
9. Print the retrieved rows to the console.

## 2. From 1NF to 2NF: Eliminating Partial Dependencies

Second Normal Form (2NF) requires 1NF and that all non-prime attributes be fully functionally dependent on the primary key. In concrete terms: if a table uses a composite primary key, no non-key attribute should depend only on part of that key. A typical example is splitting order headers and items so the line-level details don’t depend on the entire composite key.

Code example: move to separate orders and order_items tables to remove partial dependencies.

```python
import sqlite3

conn = sqlite3.connect(':memory:')
cur = conn.cursor()

# 2NF: Separate header and line items; no non-key attribute depends only on part of a composite key
cur.execute('''CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    order_date TEXT
)''')

cur.execute('''CREATE TABLE order_items (
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id)
)''')

# Seed data
cur.execute("INSERT INTO orders (order_id, customer_id, order_date) VALUES (1, 201, '2026-01-01')")
cur.execute("INSERT INTO orders (order_id, customer_id, order_date) VALUES (2, 202, '2026-01-02')")

cur.execute("INSERT INTO order_items (order_id, product_id, quantity) VALUES (1, 501, 2)")
cur.execute("INSERT INTO order_items (order_id, product_id, quantity) VALUES (1, 502, 1)")
cur.execute("INSERT INTO order_items (order_id, product_id, quantity) VALUES (2, 501, 3)")
conn.commit()

# Simple join to view denormalized-ish result
cur.execute('''SELECT o.order_id, o.customer_id, o.order_date,
                      oi.product_id, oi.quantity
               FROM orders o
               JOIN order_items oi ON o.order_id = oi.order_id
               ORDER BY o.order_id, oi.product_id''')
rows = cur.fetchall()
print(rows)
```

### Line-by-line explanation
1. Import sqlite3 for database operations.  
2. Create an in-memory database connection.  
3. Get a cursor to run SQL statements.  
4. Create table orders with order_id as primary key, customer_id, and order_date (order header).  
5. Create table order_items with a composite primary key (order_id, product_id) and a quantity; include a foreign key constraint on order_id to enforce relationship to orders.  
6. Insert a sample order header with order_id 1 for customer 201 on 2026-01-01.  
7. Insert a second order header (order_id 2).  
8. Insert two items for the first order (product 501 and 502).  
9. Insert one item for the second order (product 501).  
10. Commit all changes.  
11. Run a join to show each order with its items, illustrating separated headers and lines.  
12. Print the result set.

## 3. Achieving 3NF: Eliminating Transitive Dependencies and Designing Clean Schemas

Third Normal Form (3NF) aims to remove transitive dependencies: non-key attributes should depend only on the primary key, not on other non-key attributes. This typically means separating entities into distinct tables (e.g., Customers, Products, Categories) and wiring them with foreign keys. The result is a highly modular schema that reduces update anomalies and simplifies maintenance.

Code example: a full 3NF schema for a basic e-commerce domain (customers, categories, products, orders, order_items) with seeds and a join query to fetch an order summary.

```python
import sqlite3

conn = sqlite3.connect(':memory:')
cur = conn.cursor()

cur.executescript('''
CREATE TABLE categories (
    category_id INTEGER PRIMARY KEY,
    category_name TEXT
);

CREATE TABLE products (
    product_id INTEGER PRIMARY KEY,
    name TEXT,
    price REAL,
    category_id INTEGER,
    FOREIGN KEY (category_id) REFERENCES categories(category_id)
);

CREATE TABLE customers (
    customer_id INTEGER PRIMARY KEY,
    name TEXT,
    email TEXT
);

CREATE TABLE orders (
    order_id INTEGER PRIMARY KEY,
    customer_id INTEGER,
    order_date TEXT,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE order_items (
    order_id INTEGER,
    product_id INTEGER,
    quantity INTEGER,
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);
''')

# Seed data
cur.execute("INSERT INTO categories (category_id, category_name) VALUES (1, 'Electronics')")
cur.execute("INSERT INTO categories (category_id, category_name) VALUES (2, 'Accessories')")

cur.execute("INSERT INTO products (product_id, name, price, category_id) VALUES (501, 'Laptop', 1200.0, 1)")
cur.execute("INSERT INTO products (product_id, name, price, category_id) VALUES (502, 'Mouse', 25.0, 2)")
cur.execute("INSERT INTO products (product_id, name, price, category_id) VALUES (503, 'Keyboard', 45.0, 2)")

cur.execute("INSERT INTO customers (customer_id, name, email) VALUES (1, 'Alice', 'alice@example.com')")
cur.execute("INSERT INTO customers (customer_id, name, email) VALUES (2, 'Bob', 'bob@example.com')")

cur.execute("INSERT INTO orders (order_id, customer_id, order_date) VALUES (1001, 1, '2026-02-01')")
cur.execute("INSERT INTO orders (order_id, customer_id, order_date) VALUES (1002, 2, '2026-02-03')")

cur.execute("INSERT INTO order_items (order_id, product_id, quantity) VALUES (1001, 501, 1)")
cur.execute("INSERT INTO order_items (order_id, product_id, quantity) VALUES (1001, 502, 2)")
cur.execute("INSERT INTO order_items (order_id, product_id, quantity) VALUES (1002, 503, 1)")
conn.commit()

# Fetch a detailed order summary (join across normalized tables)
cur.execute('''
SELECT o.order_id, c.name AS customer_name, c.email,
       o.order_date, p.product_id, p.name AS product_name, p.price, oi.quantity
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON o.order_id = oi.order_id
JOIN products p ON oi.product_id = p.product_id
JOIN categories cat ON p.category_id = cat.category_id
WHERE o.order_id = 1001
ORDER BY oi.product_id
''')
summary = cur.fetchall()
print(summary)
```

### Line-by-line explanation
1. Import sqlite3 for database interaction.  
2. Create an in-memory SQLite database.  
3. Get a cursor for executing SQL.  
4-14. Create a fully normalized schema:
   - categories: category_id (PK) and category_name.
   - products: product_id (PK), name, price, category_id (FK to categories).
   - customers: customer_id (PK), name, email.
   - orders: order_id (PK), customer_id (FK to customers), order_date.
   - order_items: composite PK (order_id, product_id) with FKs to orders and products.  
15-21. Seed data for categories, products, customers, and orders.  
22-23. Commit changes.  
24-34. Run a multi-join query to fetch a detailed order summary for order_id 1001, including customer details and each product in the order.  
35. Print the resulting summary rows.

## X. Common Beginner Mistakes

### 1) Violation of atomicity in 1NF (storing lists in a single column)

Bad:
```sql
-- Bad: items column stores multiple product IDs in a single field
CREATE TABLE orders_bad (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  items TEXT
);
```

Good:
```python
# Good: split items into a separate table
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  order_date TEXT
);

CREATE TABLE order_items (
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  PRIMARY KEY (order_id, product_id)
);
```

### 2) Partial dependency in a composite-key table (2NF violation)

Bad:
```sql
CREATE TABLE order_items_bad (
  order_id INTEGER,
  product_id INTEGER,
  product_name TEXT,
  quantity INTEGER,
  PRIMARY KEY (order_id, product_id)
);
```

Good:
```sql
CREATE TABLE products (
  product_id INTEGER PRIMARY KEY,
  product_name TEXT
);
CREATE TABLE order_items (
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

### 3) Transitive dependency in 3NF violation (customer name stored in orders)

Bad:
```sql
CREATE TABLE orders_bad (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  customer_name TEXT,  -- transitive through customer_id
  order_date TEXT
);
```

Good:
```sql
CREATE TABLE customers (
  customer_id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT
);
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  order_date TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);
```

### 4) Missing foreign key constraints

Bad:
```sql
CREATE TABLE orders_bad (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER  -- no FK constraint
);
```

Good:
```sql
CREATE TABLE orders (
  order_id INTEGER PRIMARY KEY,
  customer_id INTEGER,
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);
```

### 5) Under- or over-indexing for query patterns

Bad (no index guidance):
```sql
CREATE TABLE order_items (
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  PRIMARY KEY (order_id, product_id)
);
```

Good (add index for common queries):
```sql
CREATE TABLE order_items (
  order_id INTEGER,
  product_id INTEGER,
  quantity INTEGER,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES orders(order_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);
CREATE INDEX idx_order_customer ON orders (customer_id);
```

## Y. Why This Matters In Real Systems

- Data integrity: Normalization enforces data consistency and reduces update anomalies. Changes to a product name, for example, live in one place (the Products table) rather than in every order line.
- Maintainability: Clear entity boundaries (Customers, Products, Orders, OrderItems, Categories) map to real-domain concepts, making code, migrations, and debugging easier.
- Query simplicity vs. performance: 3NF yields straightforward joins for report generation, but can incur more joins at read time. Strategically placed indices (FKs, commonly filtered columns) and occasional controlled denormalization (e.g., read-heavy analytics) can improve performance without sacrificing integrity.
- Migrations and evolution: With normalized schemas, adding new attributes or new entities is safer and less disruptive. Tools like Alembic (for SQLAlchemy) or Django migrations help evolve schemas without data loss.
- ORM considerations: ORMs encourage using relationships and foreign keys; they also often handle migrations and lazy loading. Understanding the underlying SQL helps you write efficient queries and avoid n+1 patterns.

## Z. Study Questions

1. What does 1NF require for column values and row uniqueness?  
2. How does 2NF address partial dependencies, and why is a composite primary key involved?  
3. What is a transitive dependency, and how does 3NF resolve it?  
4. Provide an example of a design change that could lead to data anomalies if not properly normalized.  
5. When might you choose to denormalize a schema in a production system, and what trade-offs does that involve?

## Exercise

Part A: Create a 3NF schema for a small e-commerce domain in Python using sqlite3. Include tables: categories, products, customers, orders, order_items as shown in the 3NF example. Seed with at least 2 customers, 2 categories, 4 products, and 2 orders (with multiple items).

Part B: Write a Python function fetch_order_summary(order_id) that returns a readable dictionary containing:
- order_id, order_date
- customer_name, customer_email
- items: a list of dictionaries with product_id, product_name, category_name, price, quantity

Part C: Implement add_order(customer_id, items) where items is a list of {product_id, quantity}. The function should insert a new order and its order_items within a database transaction and roll back on failure.

Part D: Run a sample flow: create a new order for an existing customer with multiple items, then fetch and print the order summary.

Code starter for the Exercise (you may reuse and adapt from the 3NF example above):

```python
import sqlite3

def setup_schema(conn):
    cur = conn.cursor()
    cur.executescript('''
    -- schema as in 3NF example
    CREATE TABLE categories (
        category_id INTEGER PRIMARY KEY,
        category_name TEXT
    );
    CREATE TABLE products (
        product_id INTEGER PRIMARY KEY,
        name TEXT,
        price REAL,
        category_id INTEGER,
        FOREIGN KEY (category_id) REFERENCES categories(category_id)
    );
    CREATE TABLE customers (
        customer_id INTEGER PRIMARY KEY,
        name TEXT,
        email TEXT
    );
    CREATE TABLE orders (
        order_id INTEGER PRIMARY KEY,
        customer_id INTEGER,
        order_date TEXT,
        FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    );
    CREATE TABLE order_items (
        order_id INTEGER,
        product_id INTEGER,
        quantity INTEGER,
        PRIMARY KEY (order_id, product_id),
        FOREIGN KEY (order_id) REFERENCES orders(order_id),
        FOREIGN KEY (product_id) REFERENCES products(product_id)
    );
    ''')
    conn.commit()

def seed_data(conn):
    cur = conn.cursor()
    cur.execute("INSERT INTO categories (category_id, category_name) VALUES (1, 'Electronics')")
    cur.execute("INSERT INTO categories (category_id, category_name) VALUES (2, 'Accessories')")

    cur.execute("INSERT INTO products (product_id, name, price, category_id) VALUES (501, 'Laptop', 1200.0, 1)")
    cur.execute("INSERT INTO products (product_id, name, price, category_id) VALUES (502, 'Mouse', 25.0, 2)")
    cur.execute("INSERT INTO products (product_id, name, price, category_id) VALUES (503, 'Keyboard', 45.0, 2)")
    cur.execute("INSERT INTO products (product_id, name, price, category_id) VALUES (504, 'USB-C Cable', 10.0, 2)")

    cur.execute("INSERT INTO customers (customer_id, name, email) VALUES (1, 'Alice', 'alice@example.com')")
    cur.execute("INSERT INTO customers (customer_id, name, email) VALUES (2, 'Bob', 'bob@example.com')")

    cur.execute("INSERT INTO orders (order_id, customer_id, order_date) VALUES (1001, 1, '2026-02-01')")
    cur.execute("INSERT INTO orders (order_id, customer_id, order_date) VALUES (1002, 2, '2026-02-03')")

    cur.execute("INSERT INTO order_items (order_id, product_id, quantity) VALUES (1001, 501, 1)")
    cur.execute("INSERT INTO order_items (order_id, product_id, quantity) VALUES (1001, 502, 2)")
    cur.execute("INSERT INTO order_items (order_id, product_id, quantity) VALUES (1002, 503, 1)")
    conn.commit()

def fetch_order_summary(conn, order_id):
    cur = conn.cursor()
    cur.execute('''
    SELECT o.order_id, o.order_date, c.name AS customer_name, c.email AS customer_email,
           p.product_id, p.name AS product_name, p.price, cat.category_name, oi.quantity
    FROM orders o
    JOIN customers c ON o.customer_id = c.customer_id
    JOIN order_items oi ON o.order_id = oi.order_id
    JOIN products p ON oi.product_id = p.product_id
    JOIN categories cat ON p.category_id = cat.category_id
    WHERE o.order_id = ?
    ORDER BY p.product_id
    ''', (order_id,))
    rows = cur.fetchall()
    if not rows:
        return None
    summary = {
        "order_id": order_id,
        "order_date": rows[0][1],
        "customer_name": rows[0][2],
        "customer_email": rows[0][3],
        "items": []
    }
    for r in rows:
        summary["items"].append({
            "product_id": r[4],
            "product_name": r[5],
            "category_name": r[7],
            "price": r[6],
            "quantity": r[8]
        })
    return summary

def add_order(conn, customer_id, items, order_date="2026-02-10"):
    """
    items: list of dicts {"product_id": int, "quantity": int}
    """
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO orders (order_id, customer_id, order_date) VALUES ((SELECT COALESCE(MAX(order_id), 1000) + 1 FROM orders), ?, ?)", (customer_id, order_date))
        order_id = cur.lastrowid
        for itm in items:
            cur.execute("INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)", (order_id, itm["product_id"], itm["quantity"]))
        conn.commit()
        return order_id
    except Exception as e:
        conn.rollback()
        raise e

def main():
    conn = sqlite3.connect(':memory:')
    setup_schema(conn)
    seed_data(conn)

    # Exercise: add a new order and fetch summary
    new_order_id = add_order(conn, 1, [{"product_id": 503, "quantity": 2}, {"product_id": 504, "quantity": 3}])
    print("New order id:", new_order_id)

    summary = fetch_order_summary(conn, new_order_id)
    print("Order summary:", summary)

if __name__ == "__main__":
    main()