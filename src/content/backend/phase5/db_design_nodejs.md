# Database Design & Normalisation (1NF-3NF)
Phase 5 — Databases | Track: Backend Engineering | Language: JavaScript / Node.js

Databases live at the core of most backend systems. Good design ensures data is accurate, scalable, and easy to evolve. Normalisation—specifically 1NF through 3NF—helps us structure data to avoid redundancy, update anomalies, and inconsistent reads. In Node.js environments, understanding how to model data in SQL and then access it efficiently from code is a foundational skill for building robust APIs, services, and data-driven applications.

## 1. Understanding 1NF: Atomicity and Tables

1NF (First Normal Form) requires that all column values are atomic (indivisible) and that each row is uniquely identifiable. Repeating groups or arrays in a single column violate 1NF and lead to brittle schemas.

Code example: non-1NF design (storing multiple item IDs as a single text field)
```sql
-- Non-1NF: repeating/grouped data stored as a single column
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  items TEXT  -- contains values like '1,2,3'
);

INSERT INTO orders (user_id, items) VALUES (101, '201,202,203');
```

### Line-by-line explanation
- CREATE TABLE orders (...): Creates a table named orders with three columns.
- id SERIAL PRIMARY KEY: A unique, auto-incrementing identifier for each order.
- user_id INT NOT NULL: References the user who placed the order.
- items TEXT: A single text column intended to hold multiple item IDs; this is non-atomic.
- INSERT INTO orders (...): Inserts a sample order with a comma-delimited list of item IDs.

Code example: 1NF-friendly design (separate order_items table)
```sql
-- 1NF: atomic columns and a separate line item table
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  order_id INT NOT NULL REFERENCES orders(id),
  item_id INT NOT NULL,
  quantity INT DEFAULT 1,
  PRIMARY KEY (order_id, item_id)
);

INSERT INTO orders (user_id) VALUES (101);
INSERT INTO order_items (order_id, item_id, quantity) VALUES (1, 201, 2), (1, 202, 1), (1, 203, 5);
```

### Line-by-line explanation
- CREATE TABLE orders (...): Defines a separate table for orders with a timestamp.
- id SERIAL PRIMARY KEY: Unique order identifier.
- user_id INT NOT NULL: References the customer placing the order.
- order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP: Automatically records the time of the order.
- CREATE TABLE order_items (...): Defines a separate line-item table to store each product in an order.
- order_id INT NOT NULL REFERENCES orders(id): Foreign key linking to the parent order.
- item_id INT NOT NULL: Product identifier for the item in the order.
- quantity INT DEFAULT 1: How many of the item were ordered.
- PRIMARY KEY (order_id, item_id): Composite key ensures each (order, item) pair is unique.
- INSERT statements: Demonstrate creating an order and its items via normalised tables.

## 2. Understanding 2NF: Remove Partial Dependencies

2NF requires that all non-key attributes are fully functionally dependent on the primary key. A common pitfall is having non-key data depend on only part of a composite key.

Code example: bad 2NF design (partial dependency with order_items containing product attributes)
```sql
-- Bad 2NF: non-key attributes partially depend on product_id, stored in the line items
CREATE TABLE order_items (
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  product_name TEXT,  -- depends on product_id, not on (order_id, product_id)
  price DECIMAL(10, 2), -- depends on product_id
  quantity INT DEFAULT 1,
  PRIMARY KEY (order_id, product_id)
);
```

### Line-by-line explanation
- CREATE TABLE order_items (...): Defines a method to store line items but mixes product attributes here.
- order_id, product_id: The composite primary key for the line item.
- product_name, price: Attributes that depend on product_id, not on the full key (order_id, product_id); this creates duplication if the same product is ordered in multiple orders.
- quantity: Correctly related to the specific order-item row.
- PRIMARY KEY (order_id, product_id): Maintains uniqueness per order-item combination.

Code example: good 2NF design (separating products)
```sql
-- Good 2NF: decompose product attributes into a separate products table
CREATE TABLE products (
  product_id INT PRIMARY KEY,
  product_name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE order_items (
  order_id INT NOT NULL REFERENCES orders(id),
  product_id INT NOT NULL REFERENCES products(product_id),
  quantity INT DEFAULT 1,
  PRIMARY KEY (order_id, product_id)
);

-- Seed data
INSERT INTO products (product_id, product_name, price) VALUES (201, 'Widget A', 9.99);
INSERT INTO products (product_id, product_name, price) VALUES (202, 'Widget B', 14.99);

INSERT INTO orders (user_id) VALUES (101);
INSERT INTO order_items (order_id, product_id, quantity) VALUES (1, 201, 2), (1, 202, 1);
```

### Line-by-line explanation
- CREATE TABLE products (...): Introduces a central catalog of products with stable attributes.
- product_id PRIMARY KEY, product_name, price: Each product has immutable attributes stored once.
- CREATE TABLE orders (...): As before, defines the parent order.
- CREATE TABLE order_items (...): Now references products(product_id) for product details and has its own quantity.
- FOREIGN KEY references: Ensures referential integrity between orders, order_items, and products.
- Seed data: Demonstrates populating normalized tables with consistent product data and a single order.

## 3. Understanding 3NF: Remove Transitive Dependencies

3NF requires that non-key attributes depend only on the primary key, not on other non-key attributes. Transitive dependencies occur when non-key data determines other non-key data.

Code example: bad 3NF design (transitive dependency with city_name)
```sql
-- Bad 3NF: city_name depends on city_id, but both are non-key in the same table
CREATE TABLE customers (
  customer_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city_id INT,
  city_name TEXT  -- transitively dependent on city_id
);
```

### Line-by-line explanation
- CREATE TABLE customers (...): Defines a customers table that includes both city_id and city_name.
- customer_id PRIMARY KEY: Unique customer identifier.
- name: Customer name.
- city_id, city_name: City-related attributes; city_name depends on city_id, which is a dependency that should be broken up to achieve true 3NF.

Code example: good 3NF design (cities table)
```sql
CREATE TABLE cities (
  city_id INT PRIMARY KEY,
  city_name TEXT NOT NULL
);

CREATE TABLE customers (
  customer_id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city_id INT REFERENCES cities(city_id)
);

-- Seed data
INSERT INTO cities (city_id, city_name) VALUES (1, 'New York'), (2, 'San Francisco');
INSERT INTO customers (name, city_id) VALUES ('Alice', 1), ('Bob', 2);
```

### Line-by-line explanation
- CREATE TABLE cities (...): Provides a dedicated, non-redundant catalog of cities.
- city_id PRIMARY KEY, city_name: City institutionally identified by a stable key.
- CREATE TABLE customers (...): Each customer now references cities(city_id) rather than storing city_name directly.
- FOREIGN KEY city_id REFERENCES cities(city_id): Enforces referential integrity.
- Seed data: Demonstrates populating cities once and normalizing customer records to avoid transitive relationships.

## 4. Practical Node.js patterns for normalized schemas

The language-agnostic principle is to design with correct normal forms, then fetch information efficiently in code. Here are practical Node.js patterns for a normalized schema using the popular node-postgres (pg) library.

Code example: fetch an order with its items and product details
```js
// Requires: npm install pg
const { Client } = require('pg');

async function getOrderWithItems(orderId) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const res = await client.query(
    `
    SELECT
      o.id AS order_id,
      o.user_id,
      o.order_date,
      oi.product_id,
      oi.quantity,
      p.product_name,
      p.price
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.product_id = oi.product_id
    WHERE o.id = $1
    ORDER BY oi.product_id;
    `,
    [orderId]
  );

  await client.end();
  return res.rows;
}
```

### Line-by-line explanation
- const { Client } = require('pg'): Imports the PostgreSQL client.
- async function getOrderWithItems(orderId): Defines an asynchronous function to fetch an order's details.
- const client = new Client(...): Creates a database client with a connection string from environment variable.
- await client.connect(): Opens the database connection.
- const res = await client.query(`...`, [orderId]): Executes a parameterized SQL query to join orders, order_items, and products to assemble a detailed view of a single order.
- WHERE o.id = $1: Filters to the specific order using a parameter to prevent SQL injection.
- ORDER BY oi.product_id: Sorts results for readability.
- await client.end(): Closes the database connection.
- return res.rows: Returns the resulting rows for further processing.

Optional advanced pattern: using a single query to assemble nested JSON in PostgreSQL
```js
async function getOrderAsJson(orderId) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const res = await client.query(
    `
    SELECT jsonb_build_object(
      'order_id', o.id,
      'user_id', o.user_id,
      'order_date', o.order_date,
      'items', COALESCE(jsonb_agg(jsonb_build_object('product_id', oi.product_id, 'quantity', oi.quantity, 'product_name', p.product_name, 'price', p.price)), '[]')
    ) AS order_json
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.product_id = oi.product_id
    WHERE o.id = $1
    GROUP BY o.id;
    `,
    [orderId]
  );

  await client.end();
  return res.rows[0]?.order_json || null;
}
```

### Line-by-line explanation
- jsonb_build_object: Builds a JSON object for the order.
- jsonb_agg(...): Aggregates items into a JSON array per order.
- GROUP BY o.id: Necessary for correct aggregation per order.
- This pattern reduces client-side assembly and is efficient for API responses, but requires careful indexing and query tuning.

## X. Common Beginner Mistakes

- Mistake 1: Storing lists as comma-separated strings (violates 1NF)
  Bad:
  - items TEXT = '201,202,203'
  Good:
  - Use a separate order_items table with (order_id, item_id, quantity)

- Mistake 2: Missing foreign keys and referential integrity
  Bad:
  - CREATE TABLE order_items (order_id INT, product_id INT, quantity INT);
  Good:
  - Add FOREIGN KEY (order_id) REFERENCES orders(id)
  - Add FOREIGN KEY (product_id) REFERENCES products(product_id)

- Mistake 3: Transitive dependency not removed (3NF violation)
  Bad:
  - customers(customer_id, name, city_id, city_name)
  Good:
  - Separate cities(city_id, city_name); customers(customer_id, name, city_id)

- Mistake 4: Over-normalization causing excessive joins
  Bad:
  - A single query that strings together 6+ tables for a common read
  Good:
  - Normalize for integrity, but denormalize strategically for read-heavy paths or use indexed materialized views for reporting

- Mistake 5: Not considering indexing and constraints early
  Bad:
  - No index on foreign keys or frequently filtered columns
  Good:
  - Indexes on orders.user_id, order_items.order_id, and products.product_id; foreign key constraints; appropriate unique constraints

## Y. Why This Matters In Real Systems

- Data integrity: Normalisation minimizes update anomalies and ensures consistent data across writes, updates, and deletes.
- Evolvability: As requirements change (e.g., new product attributes, new locations), a well-normalised design reduces ripple effects.
- Performance considerations: Normalized schemas require joins; design indices, query plans, and sometimes controlled denormalization (e.g., summary tables or materialized views) to balance read/write performance.
- Migrations and tooling: Phase-based migrations (1NF → 2NF → 3NF) provide a clear path for schema evolution, safer migrations, and data validation.
- Developer ergonomics: Clear relationships (foreign keys) and stable node-postgres queries reduce bugs and make APIs easier to reason about and maintain.

## Z. Study Questions

1) What is the defining requirement of 1NF, and how does a comma-separated list in a single column violate it?
2) Explain a partial dependency and give an example of how to fix it to achieve 2NF.
3) What is a transitive dependency, and how does 3NF address it? Provide an example.
4) How would you model a many-to-many relationship in a normalized schema? Briefly describe the tables and keys.
5) Why might you choose to denormalize a read-heavy path in a production system, and what strategies could you use?

## Exercise

Part A — Build a minimal 1NF schema for an e-commerce order system
1) Create a 1NF orders table where items for an order are stored as a comma-separated string (not recommended in production, but illustrative here).
2) Insert a sample order with multiple items.

Part B — Normalize to 3NF
1) Refactor into a fully normalized schema: products, orders, and order_items. Include foreign keys and basic constraints.
2) Seed sample data for two products and one order with two items.

Part C — Node.js data access
1) Write a Node.js function using node-postgres (pg) to fetch a given order’s details (order metadata plus each item’s product name and price) in a single query.
2) Extend the function to return a single JSON object representing the order with an items array.

Part D — Optional extension: JSON aggregation
1) Implement a function that returns the order as a single JSON object using PostgreSQL’s jsonb_build_object and jsonb_agg as shown in the patterns above.
2) Compare the SQL approach to assembling data in Node.js and discuss trade-offs.

Deliverables
- SQL: 1NF initial design, followed by 2NF and 3NF refactors with clear separation of concerns.
- Node.js: A small script/module that connects to a PostgreSQL database and fetches order data with and without JSON aggregation.
- Short reflection: A paragraph comparing the readability, maintainability, and performance implications of 1NF vs 3NF designs in real-world apps.

Notes for Implementers
- Use a modern PostgreSQL version for JSON capabilities and robust foreign key support.
- Use environment variables for connection strings in the Node.js examples.
- Ensure you understand how foreign keys and indices influence performance across reads and writes in normalized schemas.