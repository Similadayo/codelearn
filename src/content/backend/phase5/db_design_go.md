# Phase 5 — Databases: Database Design & Normalisation (1NF-3NF) in Go

Database design and normalization are foundational skills for reliable, scalable backend systems. By understanding 1NF, 2NF, and 3NF, you can build schemas that minimize redundancy, prevent update anomalies, and support clean, maintainable data access patterns. In this Go-centered lesson, you’ll see practical code to model data in 1NF, progressively decompose toward 3NF, and reason about how these choices play out in real systems.

## 1. 1NF — Atomicity and a Single Table of Order Items

In 1NF, every field must be atomic (no nested or repeating groups). A single table can model order-item data where each row represents one item within an order, but you’ll often see repeated data for customers and products since no normalization has occurred yet.

Code: Go program to create a single-Table 1NF schema (order_items_1nf) and a sample insert.

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	// NOTE: Replace with your actual DSN
	dsn := "host=localhost port=5432 user=postgres password=postgres dbname=testdb sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open:", err)
	}
	defer db.Close()

	// 1NF schema: single table where each row is one order-item
	const schema = `
	CREATE TABLE IF NOT EXISTS order_items_1nf (
		order_id INT NOT NULL,
		customer_name TEXT NOT NULL,
		customer_email TEXT NOT NULL,
		product_id INT NOT NULL,
		product_name TEXT NOT NULL,
		product_price DECIMAL(10,2) NOT NULL,
		quantity INT NOT NULL,
		PRIMARY KEY (order_id, product_id)
	);`

	_, err = db.Exec(schema)
	if err != nil {
		log.Fatal("exec 1nf schema:", err)
	}
	fmt.Println("1NF schema (order_items_1nf) created.")
}
```

### Line-by-line explanation

- package main: declares the executable package.
- import (...): imports necessary standard libraries and the PostgreSQL driver.
- _ "github.com/lib/pq": blank identifier import to register the PostgreSQL driver with database/sql.
- func main(): entry point of the program.
- dsn := "...": connection string to the Postgres database (adjust for your environment).
- sql.Open("postgres", dsn): opens a database handle for PostgreSQL.
- if err != nil { log.Fatal("open:", err) }: handles connection errors.
- defer db.Close(): ensures the connection is closed when the program ends.
- const schema = `...`: defines a SQL statement to create a single-table 1NF schema where every order-item is a separate row and all attributes are atomic.
- db.Exec(schema): executes the SQL to create the table.
- if err != nil { log.Fatal("exec 1nf schema:", err) }: handles execution errors.
- fmt.Println("1NF schema (order_items_1nf) created."): confirms success.

Notes:
- This schema is technically 1NF (atomic columns), but it contains redundant customer/product data across rows and lacks clear separation of concerns.

## 2. 2NF — Decompose to Remove Partial Dependencies

2NF removes partial dependencies on candidate keys. With a composite key (order_id, product_id) in the 1NF table, attributes that depend only on part of that key (e.g., product_name, product_price, customer_name, customer_email) should move to their own tables. This leads toward a cleaner, more maintainable design.

Code: Go program to create a 2NF schema (customers, orders, products, order_items). Each piece of data is stored in its own table, and order_items uses a composite foreign key to the other tables.

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	// NOTE: Replace with your actual DSN
	dsn := "host=localhost port=5432 user=postgres password=postgres dbname=testdb sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open:", err)
	}
	defer db.Close()

	statements := []string{
		`CREATE TABLE IF NOT EXISTS customers (
			customer_id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE
		);`,

		`CREATE TABLE IF NOT EXISTS orders (
			order_id SERIAL PRIMARY KEY,
			customer_id INT NOT NULL REFERENCES customers(customer_id),
			order_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,

		`CREATE TABLE IF NOT EXISTS products (
			product_id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			price DECIMAL(10,2) NOT NULL
		);`,

		`CREATE TABLE IF NOT EXISTS order_items (
			order_id INT NOT NULL REFERENCES orders(order_id),
			product_id INT NOT NULL REFERENCES products(product_id),
			quantity INT NOT NULL,
			PRIMARY KEY (order_id, product_id)
		);`,
	}

	for _, s := range statements {
		if _, err := db.Exec(s); err != nil {
			log.Fatalf("exec: %s error: %v", s, err)
		}
	}
	fmt.Println("2NF schema (customers, orders, products, order_items) created.")
}
```

### Line-by-line explanation

- package main / import / _ "github.com/lib/pq": same rationale as before.
- main(): entry point.
- dsn := "...": DSN for the DB (adjust as needed).
- db, err := sql.Open("postgres", dsn): opens a DB handle.
- defer db.Close(): ensures closure.
- statements := []string{ ... }: a list of CREATE TABLE statements for the 2NF design:
  - customers: stores customer_id, name, and unique email.
  - orders: stores order_id, references customers and stores order_date.
  - products: stores product_id, name, and price.
  - order_items: stores the many-to-many relationship with a composite primary key (order_id, product_id) and quantity.
- for each statement: db.Exec and error handling.
- fmt.Println(...): confirms success.

Notes:
- This design eliminates repeated customer and product data across order items.
- Foreign keys enforce referential integrity between tables.

## 3. 3NF — Eliminate Transitive Dependencies with Catalogs, Categories, and Clean Joins

3NF eliminates transitive dependencies: non-key attributes should depend only on keys. A common real-world refinement is to separate hierarchical or categorized data (e.g., product categories) so that attributes like category_name are not derived by dependencies on product_name/price. In this final design, we introduce categories and strict foreign-key-based joins.

Code: Go program to create a 3NF schema (customers, orders, categories, products, and order_items). The products table stores a category_id rather than category name; a separate categories table holds category details.

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/lib/pq"
)

func main() {
	// NOTE: Replace with your actual DSN
	dsn := "host=localhost port=5432 user=postgres password=postgres dbname=testdb sslmode=disable"
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal("open:", err)
	}
	defer db.Close()

	statements := []string{
		`DROP TABLE IF EXISTS order_items CASCADE;`,
		`DROP TABLE IF EXISTS orders CASCADE;`,
		`DROP TABLE IF EXISTS customers CASCADE;`,
		`DROP TABLE IF EXISTS products CASCADE;`,
		`DROP TABLE IF EXISTS categories CASCADE;`,

		`CREATE TABLE IF NOT EXISTS customers (
			customer_id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			email TEXT NOT NULL UNIQUE
		);`,

		`CREATE TABLE IF NOT EXISTS orders (
			order_id SERIAL PRIMARY KEY,
			customer_id INT NOT NULL REFERENCES customers(customer_id),
			order_date TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
		);`,

		`CREATE TABLE IF NOT EXISTS categories (
			category_id SERIAL PRIMARY KEY,
			name TEXT NOT NULL UNIQUE
		);`,

		`CREATE TABLE IF NOT EXISTS products (
			product_id SERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			price DECIMAL(10,2) NOT NULL,
			category_id INT NOT NULL REFERENCES categories(category_id)
		);`,

		`CREATE TABLE IF NOT EXISTS order_items (
			order_id INT NOT NULL REFERENCES orders(order_id),
			product_id INT NOT NULL REFERENCES products(product_id),
			quantity INT NOT NULL,
			PRIMARY KEY (order_id, product_id)
		);`,
	}

	for _, s := range statements {
		if _, err := db.Exec(s); err != nil {
			log.Fatalf("exec: %s error: %v", s, err)
		}
	}
	fmt.Println("3NF schema (customers, orders, categories, products, order_items) created.")
}
```

### Line-by-line explanation

- package main / imports: standard setup as in previous sections.
- main(): entry point.
- dsn := "...": connection string (adjust for your environment).
- statements := []string{ ... }: a sequence of SQL statements:
  - Drops existing tables in a cascade-safe order to allow clean recreation.
  - customers: same as before.
  - orders: references customers.
  - categories: new table for product categories.
  - products: now includes category_id, referencing categories; prices stay in this table.
  - order_items: maintains the many-to-many relationship with a composite key.
- Loop over statements: executes each with error handling.
- Print success message.

Notes:
- This 3NF design eliminates transitive dependencies by separating category metadata from products and by keeping all attributes tied to a primary key.
- You can easily extend this model with additional normalization (e.g., suppliers, brands) while preserving data integrity through foreign keys.

Optional: sample query to fetch a fully detailed order

```sql
SELECT
  o.order_id,
  c.name AS customer_name,
  o.order_date,
  cat.name AS category_name,
  p.name AS product_name,
  p.price AS product_price,
  oi.quantity
FROM orders o
JOIN customers c ON o.customer_id = c.customer_id
JOIN order_items oi ON oi.order_id = o.order_id
JOIN products p ON oi.product_id = p.product_id
JOIN categories cat ON p.category_id = cat.category_id
WHERE o.order_id = $1;
```

Explanation: This query demonstrates how a fully-normalized, multi-table schema is joined to present a complete view of an order: who placed it, when, what products were included, their category, and quantities.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Denormalizing data that should be separate
  - Bad:
    ```sql
    CREATE TABLE orders_bad (
      order_id INT,
      customer_name TEXT,
      customer_email TEXT,
      product_id INT,
      product_name TEXT,
      product_price DECIMAL(10,2),
      quantity INT,
      PRIMARY KEY (order_id, product_id)
    );
    ```
  - Good:
    ```sql
    CREATE TABLE customers (
      customer_id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE
    );
    CREATE TABLE orders (
      order_id SERIAL PRIMARY KEY,
      customer_id INT REFERENCES customers(customer_id),
      order_date TIMESTAMP
    );
    CREATE TABLE products (
      product_id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      price DECIMAL(10,2) NOT NULL
    );
    CREATE TABLE order_items (
      order_id INT REFERENCES orders(order_id),
      product_id INT REFERENCES products(product_id),
      quantity INT NOT NULL,
      PRIMARY KEY (order_id, product_id)
    );
    ```
  Explanation: Reduces data repetition and enforces data integrity via foreign keys.

- Pitfall 2: Storing derived or repeating attributes in multiple places
  - Bad:
    ```sql
    -- order_items holds product_name and product_price
    CREATE TABLE order_items (
      order_id INT,
      product_id INT,
      product_name TEXT,
      product_price DECIMAL(10,2),
      quantity INT,
      PRIMARY KEY (order_id, product_id)
    );
    ```
  - Good:
    ```sql
    -- query-time join to fetch product details
    SELECT oi.quantity, p.name, p.price
    FROM order_items oi
    JOIN products p ON oi.product_id = p.product_id
    WHERE oi.order_id = $1;
    ```
  Explanation: Avoids data drift by keeping product metadata in a single, authoritative source.

- Pitfall 3: Missing or weak foreign key constraints
  - Bad:
    ```sql
    CREATE TABLE orders (
      order_id INT PRIMARY KEY,
      customer_id INT, -- no FK
      order_date TIMESTAMP
    );
    ```
  - Good:
    ```sql
    CREATE TABLE orders (
      order_id SERIAL PRIMARY KEY,
      customer_id INT REFERENCES customers(customer_id),
      order_date TIMESTAMP
    );
    ```
  Explanation: Enforcing referential integrity prevents orphaned records and invalid joins.

- Pitfall 4: Not indexing join keys or frequently-filtered columns
  - Bad:
    ```sql
    CREATE TABLE order_items (
      order_id INT,
      product_id INT,
      quantity INT,
      PRIMARY KEY (order_id, product_id)
    );
    ```
  - Good:
    ```sql
    CREATE INDEX idx_order_items_order ON order_items(order_id);
    CREATE INDEX idx_order_items_product ON order_items(product_id);
    ```
  Explanation: Proper indexing speeds up joins and lookups on large datasets.

## Y. Why This Matters In Real Systems — production context and real usage

- Data integrity and consistency: Normalized schemas minimize anomalies during inserts, updates, and deletes.
- Scalability: As data grows, normalized schemas reduce duplication, simplify migrations, and enable efficient indexing and caching strategies.
- Maintainability: Clear separation of concerns (customers, products, orders, categories) makes evolving schemas easier without touching unrelated parts.
- Migrations and deployments: When evolving from 1NF to 2NF/3NF, you typically need progressive migrations, data backfills, and careful rollback plans. This often involves transformation scripts that preserve invariants.
- Performance trade-offs: Normalization improves write consistency and storage efficiency but can impact read performance due to joins. Real systems often use selective denormalization (read-optimized views or materialized joins) where justified.
- Testing and reliability: Foreign keys and constraints catch data quality issues early. Automated tests should verify join correctness and integrity across tables.

## Z. Study Questions — 5 recall questions

1. What is the defining constraint of 1NF?
2. How does 2NF differ from 1NF in terms of functional dependencies?
3. What is a transitive dependency, and how does 3NF address it?
4. Why should product metadata like category_name be placed in a separate table rather than in the products table?
5. How would you fetch a fully detailed order with customer, product, and category information using the 3NF schema?

## Exercise — practical multi-part coding challenge

Part A — Implement and migrate the 3NF schema
- Task: Create a small Go program that connects to PostgreSQL and creates the 3NF schema (customers, orders, categories, products, order_items) with proper foreign keys and indices. Include a function to drop all tables in a safe order for a clean re-run.
- Deliverables:
  - A Go file (e.g., migrate3nf.go) that creates the 3NF schema.
  - Comments documenting the reasoning for constraints and indices.
- Tips:
  - Use db.Exec for each CREATE statement; consider using transactions for atomic migrations.
  - Ensure you handle errors and print meaningful messages.

Part B — Insert sample data and run a detailed fetch
- Task: Extend your Go program to insert a small dataset into each table (two customers, two categories, two products per category, one order with multiple items) and then query a single order with all details (customer, order date, products, prices, quantities, and categories) using a multi-join SELECT.
- Deliverables:
  - Functions to insert sample data with prepared statements.
  - A query and struct-based mapping to print the order detail in a readable format.

Part C — Validation and basic constraints
- Task: Add basic validation at the Go layer (e.g., non-empty names, valid emails) and ensure that inserting invalid data is rejected by the database constraints.
- Deliverables:
  - Example error handling paths demonstrating constraint violations (caught and reported).

Part D — Optional extensions (bonus)
- Task: Add a simple API layer (even just in code) that serves a “GetOrderDetails(order_id)” endpoint-like function returning a structured object, demonstrating how normalized data is consumed by a backend service.
- Deliverables:
  - A small Go function that assembles a detailed order struct by performing a multi-join query.

Notes for instructors:
- Encourage students to reason about when normalization gains outweigh performance costs and to think about real-world workloads (read-heavy vs write-heavy).
- Prompt learners to consider migrations: how to move from 1NF to 2NF/3NF incrementally, with data backfilling and rollback plans.
- Emphasize the importance of foreign keys, indices, and explicit constraints in production-grade databases.

If you'd like, I can tailor the DSN, schema names, or add a small test suite to verify the migrations and queries end-to-end.