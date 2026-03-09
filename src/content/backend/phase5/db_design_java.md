# Database Design & Normalisation (1NF-3NF) in Java

In backend engineering, how you structure data in your database matters just as much as how you write your business logic. Normalisation (1NF-3NF) is a disciplined approach to minimize data anomalies, improve data integrity, and make scalable, maintainable systems. This lesson uses a small invoicing domain to illustrate how atomicity, dependencies, and clear entity boundaries translate into real Java code (JPA/Hibernate) and robust SQL schemas. By the end, you’ll see how to move from a flat, potentially messy schema to properly normalised tables and well-mtyped Java models.

## 1. 1NF Basics — Atomicity and the Begin of Normalisation

What 1NF means and why it matters professionally:
- 1NF requires that all columns contain atomic (indivisible) values. No lists, no comma-separated values in a single field.
- A typical starting point is a denormalised, single-table representation that stores multiple values in one field (a repeating group). The goal is to split those into separate, related rows.

### Code Block A — Non-1NF (repeating group in a single row)
```sql
-- Non-1NF example: product_ids is a comma-separated list in one row
CREATE TABLE invoices_raw (
  invoice_id INT PRIMARY KEY,
  customer_id INT,
  customer_name VARCHAR(100),
  product_ids VARCHAR(255), -- e.g., '101,102,103'
  total DECIMAL(10,2)
);
```

### ### Line-by-line explanation
- -- Non-1NF example: product_ids is a comma-separated list in one row: This line explains the intent of the table—as a single invoice row with multiple products encoded in one field (not atomic).
- CREATE TABLE invoices_raw (...): Define a table to store invoices in a single row.
- invoice_id INT PRIMARY KEY: Unique identifier for the invoice.
- customer_id INT: Reference to the customer (denormalised social ID).
- customer_name VARCHAR(100): Redundant customer data; risk of inconsistency if the name changes.
- product_ids VARCHAR(255): Atomicity violation; stores multiple product IDs as a single string.
- total DECIMAL(10,2): The invoice total.

### Code Block B — 1NF design (atomic, related tables)
```sql
-- 1NF: split repeating groups into a related line-item table
CREATE TABLE customers (
  customer_id INT PRIMARY KEY,
  name VARCHAR(100),
  email VARCHAR(100)
);

CREATE TABLE invoices (
  invoice_id INT PRIMARY KEY,
  customer_id INT,
  total DECIMAL(10,2),
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE products (
  product_id INT PRIMARY KEY,
  name VARCHAR(100),
  unit_price DECIMAL(10,2)
);

CREATE TABLE invoice_items (
  invoice_id INT,
  product_id INT,
  quantity INT,
  unit_price DECIMAL(10,2),
  PRIMARY KEY (invoice_id, product_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

### ### Line-by-line explanation
- -- 1NF: split repeating groups into a related line-item table: This comment explains the transformation from a single wide row to related tables.
- CREATE TABLE customers (...): Define a separate, canonical customers table to store unique customer data.
- customer_id INT PRIMARY KEY, name, email: Basic customer attributes; email is optional but commonly indexed.
- CREATE TABLE invoices (...): Each invoice references a customer and stores a total amount.
- FOREIGN KEY (customer_id) REFERENCES customers(customer_id): Enforces referential integrity to customers.
- CREATE TABLE products (...): Catalog of products with their unit prices.
- CREATE TABLE invoice_items (...): Junction table representing line items for an invoice; the composite primary key (invoice_id, product_id) ensures each product appears once per invoice.
- FOREIGN KEY constraints on invoice_items link to invoices and products, enforcing valid relationships.

### Line-by-line explanation (continued)
- invoice_id INT, product_id INT, quantity INT, unit_price DECIMAL(10,2): Each line item records the quantity and the price at sale; unit_price can be used for historical pricing per item.
- PRIMARY KEY (invoice_id, product_id): Every combination of invoice and product is unique; supports multiple invoices with the same product, each as separate lines.
- FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id): Enforces that a line item belongs to an existing invoice.
- FOREIGN KEY (product_id) REFERENCES products(product_id): Enforces that a line item references a valid product.

## 2. 2NF — Removing Partial Dependencies

What 2NF focuses on:
- If a table has a composite primary key, 2NF requires that all non-key attributes depend on the whole primary key, not just part of it.
- Practically, this means moving attributes that depend on only one part of a composite key into their own table.

### Code Block C — 2NF attempt with partial dependency (illustrative)
```sql
-- 2NF illustration: invoice_items_2nf includes product_name and product_price
-- these depend on product_id (part of the key), violating strict 2NF
CREATE TABLE invoice_items_2nf (
  invoice_id INT,
  product_id INT,
  quantity INT,
  product_name VARCHAR(100),
  product_price DECIMAL(10,2),
  PRIMARY KEY (invoice_id, product_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

### ### Line-by-line explanation
- -- 2NF illustration: invoice_items_2nf includes product_name and product_price: This comment highlights the dependences that violate 2NF because product_name and product_price depend on product_id, which is part of the composite key.
- CREATE TABLE invoice_items_2nf (...): Create a version of the line-item table that still carries the product attributes with the line item.
- invoice_id, product_id, quantity: Core identifiers and the quantity per line.
- product_name VARCHAR(100), product_price DECIMAL(10,2): Product attributes embedded in the line-item table; these are the kinds of attributes we want to move out to a separate products table to satisfy 2NF.
- PRIMARY KEY (invoice_id, product_id): Composite key definition.
- FOREIGN KEY constraints: Enforce referential integrity to invoices and products.

### Code Block D — 3NF design (moving product attributes to products table)
```sql
-- 3NF: move product details to a dedicated products table
CREATE TABLE products (
  product_id INT PRIMARY KEY,
  name VARCHAR(100),
  unit_price DECIMAL(10,2)
);

CREATE TABLE invoice_items_3nf (
  invoice_id INT,
  product_id INT,
  quantity INT,
  PRIMARY KEY (invoice_id, product_id),
  FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id)
);
```

### ### Line-by-line explanation
- CREATE TABLE products (...): Create a dedicated products catalog where product details live, decoupled from line items.
- product_id, name, unit_price: Product identity and its attributes are stored in a single place for consistent reuse across invoices.
- CREATE TABLE invoice_items_3nf (...): The line-item table now references only product_id and invoice_id as keys and stores only quantity per line.
- PRIMARY KEY (invoice_id, product_id): Still uses the composite key to identify each line item uniquely.
- FOREIGN KEY constraints: Maintain referential integrity to both invoices and products.
- This separation satisfies 3NF by removing transitive dependencies: product attributes no longer reside in the line-item table.

## 3. 3NF — Java Modeling with JPA/Hibernate

Turning the clean, normalized schema into maintainable Java domain models helps you enforce structure at compile time and leverage ORM capabilities.

### Code Block E — Java entities (simplified JPA mappings)
```java
// Customer.java
import javax.persistence.*;
import java.util.List;

@Entity
@Table(name = "customers")
public class Customer {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;
  private String email;

  // Getters/setters omitted for brevity
}
```

```java
// Product.java
import javax.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "products")
public class Product {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;

  @Column(name = "unit_price")
  private BigDecimal unitPrice;

  // Optional: relationship to manufacturer
  @ManyToOne
  @JoinColumn(name = "manufacturer_id")
  private Manufacturer manufacturer;

  // Getters/setters omitted for brevity
}
```

```java
// Manufacturer.java
import javax.persistence.*;

@Entity
@Table(name = "manufacturers")
public class Manufacturer {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  private String name;
  private String country;

  // Getters/setters omitted for brevity
}
```

```java
// Invoice.java
import javax.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "invoices")
public class Invoice {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne
  @JoinColumn(name = "customer_id")
  private Customer customer;

  private BigDecimal total;

  @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
  private List<InvoiceItem> items = new ArrayList<>();

  // Convenience methods to manage bi-directional links
  public void addItem(InvoiceItem item) {
    items.add(item);
    item.setInvoice(this);
  }

  public void removeItem(InvoiceItem item) {
    items.remove(item);
    item.setInvoice(null);
  }

  // Getters/setters omitted for brevity
}
```

```java
// InvoiceItem.java
import javax.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "invoice_items")
public class InvoiceItem {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne
  @JoinColumn(name = "invoice_id")
  private Invoice invoice;

  @ManyToOne
  @JoinColumn(name = "product_id")
  private Product product;

  private int quantity;

  @Column(name = "unit_price")
  private BigDecimal unitPrice;

  // Getters/setters omitted for brevity
}
```

### ### Line-by-line explanation
- Customer.java: Defines a JPA entity for customers with id, name, and email. The @Entity and @Table annotations map the class to the customers table.
- Product.java: Maps products with id, name, unitPrice, and an optional Manufacturer relationship. The manufacturer association models the 3NF relationship to a separate manufacturers table.
- Manufacturer.java: Simple entity for manufacturers that can be related to products.
- Invoice.java: Represents an invoice, with a many-to-one relationship to Customer and a one-to-many relationship to InvoiceItem. The list of items is cascade-persisted to keep the graph consistent.
- addItem / removeItem: Convenience methods to maintain both sides of the bidirectional association.
- InvoiceItem.java: Junction entity linking invoices to products, storing quantity and unitPrice (the price at sale). Each item has its own generated id for simplicity; relationships map back to Invoice and Product.

## 4. Common Beginner Mistakes — 3+ Real Pitfalls (bad vs good)

- Mistake 1 — Storing lists in a single column (denormalised, hard to query)
  - Bad:
    ```sql
    -- Bad: product_ids as a string list
    CREATE TABLE orders_bad (
      order_id INT PRIMARY KEY,
      customer_id INT,
      product_ids VARCHAR(255)
    );
    ```
  - Good:
    ```sql
    -- Good: use a separate order_items table
    CREATE TABLE orders (
      order_id INT PRIMARY KEY,
      customer_id INT,
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    );

    CREATE TABLE order_items (
      order_id INT,
      product_id INT,
      quantity INT,
      PRIMARY KEY (order_id, product_id),
      FOREIGN KEY (order_id) REFERENCES orders(order_id),
      FOREIGN KEY (product_id) REFERENCES products(product_id)
    );
    ```
- Mistake 2 — Missing foreign keys (no referential integrity)
  - Bad:
    ```sql
    -- Bad: invoices references customer_id without FK
    CREATE TABLE invoices_no_fk (
      invoice_id INT PRIMARY KEY,
      customer_id INT,
      total DECIMAL(10,2)
    );
    ```
  - Good:
    ```sql
    -- Good: foreign key enforces valid customers
    CREATE TABLE invoices_with_fk (
      invoice_id INT PRIMARY KEY,
      customer_id INT,
      total DECIMAL(10,2),
      FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
    );
    ```
- Mistake 3 — Over-normalisation (killing performance with excessive joins)
  - Bad (over-normalised when read patterns are simple):
    ```sql
    -- Hypothetical: too many small tables for a simple read
    SELECT i.invoice_id, c.name, p.name, ii.quantity
    FROM invoices i
    JOIN customers c ON i.customer_id = c.customer_id
    JOIN invoice_items ii ON i.invoice_id = ii.invoice_id
    JOIN products p ON ii.product_id = p.product_id
    WHERE i.invoice_id = 123;
    ```
  - Good (balanced denormalisation or caching for reads)
    - Depending on workload, you might cache totals or pre-join data in materialized views or precomputed summaries, or use a read-optimised cache layer. The goal is to balance normalization with practical query performance.

- Mistake 4 — Not considering the ORM mapping implications
  - Bad: Failing to map bidirectional relationships or cascade types can lead to orphaned rows and memory leaks.
  - Good: Explicitly map relationships and consider cascade options, orphanRemoval, and fetch strategies in JPA to keep in-memory graphs in sync with the DB.

## 5. Why This Matters In Real Systems — Production Context

- Data integrity and correctness: Normalisation prevents anomalies when updating customers, products, or prices. A change to a product’s price should reflect consistently across all invoices if you model correctly.
- Queryability and reporting: Normalised schemas enable clean, predictable joins for reports (e.g., revenue by product, top customers) and more robust constraints.
- Evolvability: As requirements grow (e.g., multiple manufacturers, product variants, or warehouses), separating concerns simplifies migrations and feature work.
- Trade-offs: Normalisation improves integrity but can increase join complexity and latency. Real systems balance normalization with performance: indexing, materialized views, denormalized caches, and read replicas are common patterns.
- ORM considerations: Java teams commonly use JPA/Hibernate to model relational schemas. Properly normalised domain models map to clean database schemas and enable safer, maintainable code.

## 6. Study Questions — 5 Recall Questions

1. What is the core requirement of 1NF, and why does a comma-separated list of values violate it?
2. How does 2NF improve upon a table with a composite primary key?
3. What is a transitive dependency, and how does 3NF address it?
4. In the provided invoicing example, which tables would you expect to join to fetch all items for a given invoice?
5. How would you model a product that has a supplier/manufacturer in a 3NF schema?

## 7. Exercise — Practical Multi-part Coding Challenge

Part A — Schema Design
- Task: Design a small library system in 1NF-3NF using SQL DDL.
- Requirements:
  - Entities: Author, Book, Loan, Member.
  - Relationships: One author can write many books; a book can have many loans; a loan belongs to one member and one book.
  - 1NF: Start with a single, flat representation that stores repeated author data in a book row, then normalise step by step.

Part B — DDL Implementation (SQL)
- Provide the SQL to create 1NF structures and then the 3NF structures.
- Show 1 subtasks:
  - 1NF: a flat Loans table with embedded author data.
  - 2NF: separate tables for authors and loans, but with a composite key somewhere.
  - 3NF: fully normalised: authors, books, loans, and members with proper FKs.

Part C — Java Modeling (JPA)
- Write Java entity classes (Customer-like) for the library domain using JPA annotations:
  - Author, Book, Member, Loan.
  - Map relationships: OneToMany/ManyToOne where appropriate.
  - Include at least id, name/title, and a few fields that illustrate relationships.

Part D — Simple Data Access Snippet
- Provide a small Java code snippet (JDBC or JPA-based) that:
  - Creates the schema (using the 3NF DDL).
  - Inserts one author, one book, one member, and one loan.
  - Retrieves all loans with the member name and book title (a join across Loan, Member, Book).

Part E — Reflection Questions
- Explain how 1NF, 2NF, and 3NF progress reduce anomalies in your library system.
- Discuss a scenario where denormalisation might be preferred for read-heavy workloads.
- Outline a basic migration plan for evolving from 2NF to 3NF in a live system.

Note: The exercise intentionally uses familiar domain concepts (invoicing used in examples here, library used in exercise) to help you practice the normalization workflow end-to-end and translate it into Java data models and persistence code. If you’d like, I can provide a ready-to-run starter project (SQL scripts, Java entities, and a minimal Spring Data JPA app) for immediate hands-on practice.