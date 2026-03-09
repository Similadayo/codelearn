# Database Design & Normalisation (1NF-3NF) in PHP

Effective database design is the backbone of reliable, scalable backend systems. Normalisation—progressing from 1NF through 3NF—helps you minimize redundancy, preserve data integrity, and make updates, deletes, and queries predictable. In PHP applications, a well-normalised schema pairs with proper SQL and prepared statements to reduce bugs, simplify maintenance, and improve data consistency across services.

## 1. What normalization is and why it matters

Normalization is a systematic process of organizing data into tables to reduce duplication and ensure logical data dependencies. 1NF requires atomic column values; 2NF removes partial dependencies; 3NF removes transitive dependencies. In real systems, normalisation reduces update anomalies, makes data migrations safer, and simplifies reasoning about relationships between entities (e.g., customers, orders, products).

```sql
-- Bad: unnormalized/denormalized approach (non-atomic, potential repetition)
CREATE TABLE unnormalized_orders (
  id INT,
  customer_name VARCHAR(100),
  customer_email VARCHAR(100),
  order_date DATETIME,
  items TEXT -- stores JSON array like '[{"product_id":1,"qty":2},{"product_id":3,"qty":1}]'
);
```

```sql
-- Good: normalized shape for 1NF with atomic columns
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  order_date DATETIME NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL
);

CREATE TABLE order_items (
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Line-by-line explanation
- -- Bad: explains the concept of a non-atomic field (items JSON) that violates 1NF by storing multiple values in a single column.
- -- Good: defines four tables with atomic columns and foreign keys to enforce referential integrity.
- Customers: id is a unique primary key; name/email store customer identity.
- Orders: id primary key; customer_id links to a customer; order_date records when the order was placed.
- Products: id primary key; name/price store product details.
- Order_items: composite primary key (order_id, product_id); quantity stores how many of each product are in an order; foreign keys enforce valid relations.

## 2. 1NF: Atomic values and an example schema

Atomicity means each column holds a single value, not a list or nested structure. In PHP apps, this translates to avoiding fields that store arrays or JSON for core relations. Build an atomic schema first, then you can build relationships with foreign keys.

```php
<?php
// 1NF-era PHP: insert sample data into a fully normalised, atomic schema
$pdo = new PDO('mysql:host=localhost;dbname=shop;charset=utf8', 'user', 'pass');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Insert a customer
$stmt = $pdo->prepare('INSERT INTO customers (name, email) VALUES (?, ?)');
$stmt->execute(['Alice Doe', 'alice@example.com']);
$customerId = $pdo->lastInsertId();

// Create an order for that customer
$stmt = $pdo->prepare('INSERT INTO orders (customer_id, order_date) VALUES (?, NOW())');
$stmt->execute([$customerId]);
$orderId = $pdo->lastInsertId();

// Ensure some products exist
$pdo->exec("INSERT IGNORE INTO products (id, name, price) VALUES (1,'Widget',9.99), (2,'Gadget',14.50)");

// Add order items (atomic rows)
$stmt = $pdo->prepare('INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)');
$stmt->execute([$orderId, 1, 2]);
$stmt->execute([$orderId, 2, 1]);
```

### Line-by-line explanation
- Establish a PDO connection to the MySQL database.
- Insert a new customer with name and email; capture the generated customer_id.
- Create a new order referencing the customer_id; capture the generated order_id.
- Ensure some products exist (Widget, Gadget) with prices.
- Insert order items as atomic rows, each with order_id, product_id, and quantity.

## 3. 2NF: Removing partial dependencies

2NF requires 1NF plus that non-key attributes depend on the whole primary key. A common pitfall is storing product data (name, price) alongside order_line data, which creates partial dependencies when the primary key is a composite (order_id, product_id).

Bad example (2NF violation of partial dependency):
```sql
CREATE TABLE order_lines_bad (
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  product_name VARCHAR(100), -- depends on product_id
  unit_price DECIMAL(10,2),   -- depends on product_id
  PRIMARY KEY (order_id, product_id)
);
```

Good example: move product_name and unit_price to the products table; keep order_lines focused on the relationship and quantity.
```sql
CREATE TABLE order_items (
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### Line-by-line explanation
- order_lines_bad: demonstrates a composite key (order_id, product_id) with non-key attributes product_name and unit_price that depend on product_id, creating a partial dependency.
- order_items: correctly stores only the relation data (order_id, product_id, quantity) and relies on the products table to provide product details, satisfying 2NF.
- Foreign keys ensure that orders and products exist for each line item.

PHP usage for 2NF scenario (inserting into normalized order_items):
```php
<?php
// Insert an order item using normalized structure (2NF)
$pdo = new PDO('mysql:host=localhost;dbname=shop;charset=utf8', 'user', 'pass');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$stmt = $pdo->prepare('INSERT INTO order_items (order_id, product_id, quantity) VALUES (?, ?, ?)');
$stmt->execute([$orderId, 1, 2]);
```

### Line-by-line explanation
- Prepare an insert into the normalized order_items table, which relies on existing order and product records.
- Execute with the specific order_id, product_id, and quantity to record the line item.

## 4. 3NF: Removing transitive dependencies

3NF removes transitive dependencies: non-key attributes should depend only on the primary key, not on other non-key attributes. A typical transitive dependency is when a field like city or country leaks through another attribute (e.g., customer_name implies something about location).

Bad 3NF design (transitive dependency):
```sql
CREATE TABLE orders_with_transitive (
  id INT PRIMARY KEY,
  customer_id INT,
  customer_name VARCHAR(100),
  customer_city VARCHAR(100),
  order_date DATETIME
);
```

Good 3NF design: separate customers (and potentially cities) into their own tables.
```sql
CREATE TABLE customers_normalized (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  city_id INT,
  FOREIGN KEY (city_id) REFERENCES cities(id)
);

CREATE TABLE cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
);

CREATE TABLE orders_final (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  order_date DATETIME NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers_normalized(id)
);
```

### Line-by-line explanation
- orders_with_transitive shows a transitive dependency: customer_name and customer_city depend on customer_id, which itself is related to orders.
- customers_normalized separates customer data from location data, using city_id as a foreign key to a cities table.
- cities stores city names; orders_final references customers_normalized via customer_id, removing transitive leakage.

PHP usage for 3NF scenario (linking all pieces):
```php
<?php
// Create a new customer and link to an order in a 3NF design
$pdo = new PDO('mysql:host=localhost;dbname=shop;charset=utf8', 'user', 'pass');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Ensure city exists
$stmt = $pdo->prepare('INSERT IGNORE INTO cities (name) VALUES (?)');
$stmt->execute(['New York']);
$cityId = $pdo->lastInsertId();

// Create customer anchored to city
$stmt = $pdo->prepare('INSERT INTO customers_normalized (name, email, city_id) VALUES (?, ?, ?)');
$stmt->execute(['Bob Smith', 'bob@example.com', $cityId]);
$customerId = $pdo->lastInsertId();

// Create an order for that customer
$stmt = $pdo->prepare('INSERT INTO orders_final (customer_id, order_date) VALUES (?, NOW())');
$stmt->execute([$customerId]);
$orderId = $pdo->lastInsertId();
```

### Line-by-line explanation
- Insert a city if necessary and capture city_id.
- Create a customer row linked to city_id to satisfy 3NF separation of concerns.
- Create an order linked to the customer, demonstrating a fully normalised lifecycle.

## 5. Practical PHP with normalized schema: building, inserting, querying

This section ties the concepts together with a cohesive PHP example: creating the schema (as above), inserting sample data across normalized tables, and querying a complete view of an order (customer details + items) using joins.

```php
<?php
$pdo = new PDO('mysql:host=localhost;dbname=shop;charset=utf8', 'user', 'pass');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// 1) Create sample data if needed (idempotent-ish; typically you'd manage with migrations)
$pdo->exec("CREATE TABLE IF NOT EXISTS customers_normalized (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  city_id INT,
  FOREIGN KEY (city_id) REFERENCES cities(id)
)");
$pdo->exec("CREATE TABLE IF NOT EXISTS cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL
)");
$pdo->exec("CREATE TABLE IF NOT EXISTS orders_final (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  order_date DATETIME NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES customers_normalized(id)
)");
$pdo->exec("CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL
)");
$pdo->exec("CREATE TABLE IF NOT EXISTS order_items (
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES orders_final(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
)");

// 2) Seed sample data (idempotent approach simplified)
$pdo->exec("INSERT IGNORE INTO cities (name) VALUES ('New York'), ('San Francisco')");
$cityId = $pdo->query("SELECT id FROM cities WHERE name='New York'")->fetchColumn();

$pdo->exec("INSERT IGNORE INTO customers_normalized (name, email, city_id) VALUES ('Alice Doe','alice@example.com', $cityId)");
$customerId = $pdo->query("SELECT id FROM customers_normalized WHERE email='alice@example.com'")->fetchColumn();

$pdo->exec("INSERT IGNORE INTO orders_final (customer_id, order_date) VALUES ($customerId, NOW())");
$orderId = $pdo->query("SELECT id FROM orders_final WHERE customer_id=$customerId ORDER BY id DESC LIMIT 1")->fetchColumn();

$pdo->exec("INSERT IGNORE INTO products (name, price) VALUES ('Widget', 9.99), ('Gadget', 14.50)");
$wId = $pdo->query("SELECT id FROM products WHERE name='Widget'")->fetchColumn();
$gId = $pdo->query("SELECT id FROM products WHERE name='Gadget'")->fetchColumn();

$pdo->exec("INSERT IGNORE INTO order_items (order_id, product_id, quantity) VALUES
  ($orderId, $wId, 2),
  ($orderId, $gId, 1)");

// 3) Query a complete order view
$stmt = $pdo->prepare("
  SELECT o.id AS order_id, o.order_date, c.name AS customer_name, c.email AS customer_email,
         p.name AS product_name, p.price, oi.quantity
  FROM orders_final o
  JOIN customers_normalized c ON o.customer_id = c.id
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON oi.product_id = p.id
  WHERE o.id = ?
");
$stmt->execute([$orderId]);
$rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($rows as $row) {
  // Example: print or accumulate into a view model
  // echo "Order {$row['order_id']}: {$row['customer_name']} - {$row['product_name']} x{$row['quantity']}\n";
}
```

### Line-by-line explanation
- Establish and configure a PDO connection.
- Ensure schema exists for customers, cities, orders, products, and order_items.
- Seed cities and customers to demonstrate relationships; link customers to a city via city_id.
- Create an order for the customer and capture the order_id.
- Seed products; get their IDs for relation.
- Insert order_items that link the order to products with quantities.
- Query the complete order view by joining orders, customers, order_items, and products to retrieve a full picture of an order.

## X. Common Beginner Mistakes

1) Bad: Storing related data in a single wide table (no normalization)
- Bad:
```sql
CREATE TABLE orders_denorm (
  order_id INT,
  customer_name VARCHAR(100),
  customer_email VARCHAR(100),
  product_name VARCHAR(100),
  product_price DECIMAL(10,2),
  quantity INT
);
```
- Good:
```sql
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  order_date DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  price DECIMAL(10,2)
);

CREATE TABLE order_items (
  order_id INT,
  product_id INT,
  quantity INT,
  PRIMARY KEY (order_id, product_id),
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
```

2) Bad: Repeating customer data in orders (no foreign key)
- Bad:
```sql
CREATE TABLE orders_no_fk (
  id INT PRIMARY KEY,
  customer_name VARCHAR(100),
  customer_email VARCHAR(100),
  order_date DATETIME
);
```
- Good:
```sql
CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100) UNIQUE
);

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT,
  order_date DATETIME,
  FOREIGN KEY (customer_id) REFERENCES customers(id)
);
```

3) Bad: Not using prepared statements (SQL injection risk)
- Bad:
```php
$pdo->exec("INSERT INTO customers (name, email) VALUES ('$name', '$email')");
```
- Good:
```php
$stmt = $pdo->prepare('INSERT INTO customers (name, email) VALUES (?, ?)');
$stmt->execute([$name, $email]);
```

## Y. Why This Matters In Real Systems

- Data integrity: Normalised schemas enforce referential integrity through foreign keys, ensuring related data remains consistent across inserts, updates, and deletes.
- Maintainability: Changes to a single entity (e.g., product attributes) live in one place, reducing anomalies and drift.
- Scalability: Joins are well-defined and indexed; caching strategies and ORMs map neatly to normalized schemas, enabling predictable query plans.
- Migrations and evolution: Phase-based normalization helps structure migrations, rollbacks, and feature flags without breaking existing data.
- Security: Using prepared statements with a normalised design reduces injection vectors and clarifies access control at the data layer.

## Z. Study Questions

1) What is the core difference between 1NF and 2NF?
2) How does moving product_name and unit_price from order_items to a separate products table illustrate 2NF?
3) Give an example of a transitive dependency and how 3NF eliminates it.
4) Why are foreign keys important in a normalised schema for a PHP application?
5) Describe how you would fetch a full order (customer details + items) using a single SQL query with joins.

## Exercise

Part A: Schema design
- Design a small e-commerce order schema demonstrating 1NF-3NF concepts. Create the following tables with appropriate data types and constraints:
  - customers (id, name, email)
  - cities (id, name)
  - customers_normalized (id, name, email, city_id)
  - products (id, name, price)
  - orders_final (id, customer_id, order_date)
  - order_items (order_id, product_id, quantity)

Part B: Data insertion (PHP PDO)
- Write a PHP script that:
  - Connects to MySQL using PDO.
  - Inserts two cities (if not exists), two customers with city links, two products, one order for one customer, and two order_items for that order.
  - Uses prepared statements to avoid SQL injection.

Part C: Data retrieval (PHP PDO)
- Write a PHP function that, given an order_id, returns a structured array containing:
  - order_id
  - order_date
  - customer: name, email, city
  - items: list of { product_name, price, quantity }
- Implement this using a single multi-join SQL query and map results into the required structure.

Part D: Reflection
- Write a brief reflection (150-300 words) on how normalisation influenced your design decisions, trade-offs you would consider if you needed ultra-fast reads (hint: denormalisation, caching, or read replicas), and how you would test data integrity during migrations in a PHP project.

You should now be able to reason about and implement normalized database schemas in PHP applications, observe how 1NF-3NF guide structure, and apply best practices to ensure data integrity, maintainability, and scalable data access patterns.