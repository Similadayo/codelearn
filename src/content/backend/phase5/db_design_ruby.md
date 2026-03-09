# Database Design & Normalisation (1NF-3NF) in Ruby

A solid understanding of database normalization is essential for building scalable, maintainable backend systems. In this lesson, we explore 1NF through 3NF using Ruby with ActiveRecord-style migrations and models. You’ll see how to design schemas that minimize redundancy, how to structure relationships across tables, and how to reason about real-world data integrity in production systems.

## 1. 1NF Concepts and an Example

1NF (First Normal Form) requires atomic column values and a single table structure without repeating groups. In practice, you start with a single table that records each item in an order as its own row, capturing all relevant details (even if some data is repeated across rows). This design is easy to write and understand, but it duplicates data (customer details, product details) and is not suitable for large systems.

Code: 1NF design (order_items_1nf)
```ruby
# Migration: Create a single 1NF table where each row is one order-item.
class CreateOrderItems1nf < ActiveRecord::Migration[6.0]
  def change
    create_table :order_items_1nf do |t|
      t.integer :order_id
      t.integer :customer_id        # Optional for 1NF
      t.string  :customer_name
      t.string  :customer_email
      t.string  :customer_address

      t.integer :product_id
      t.string  :product_name
      t.decimal :product_price, precision: 10, scale: 2

      t.integer :quantity
      t.date    :order_date

      t.timestamps
    end

    add_index :order_items_1nf, :order_id
    add_index :order_items_1nf, :product_id
  end
end
```

```ruby
# Seed / usage example (1NF)
OrderItem1nf.create(
  order_id: 1001,
  customer_id: 501,
  customer_name: 'Alice Smith',
  customer_email: 'alice@example.com',
  customer_address: '123 Pine St',
  product_id: 201,
  product_name: 'Widget A',
  product_price: 9.99,
  quantity: 2,
  order_date: Date.parse('2024-01-15')
)
```

### Line-by-line explanation
- class CreateOrderItems1nf: Defines a migration to create the 1NF table.
- create_table :order_items_1nf do |t|: Starts a table, each column defined via t.
- t.integer :order_id: Stores the order identifier (part of a potential composite key).
- t.integer :customer_id, t.string :customer_name, etc.: Duplicates customer attributes for every row.
- t.string :product_name, t.decimal :product_price: Duplicates product data for each line item.
- t.integer :quantity, t.date :order_date: Stores line item quantity and date.
- t.timestamps: Adds created_at/updated_at.
- add_index lines: Improve query performance on order_id and product_id.
- OrderItem1nf.create: Demonstrates inserting a single line item row with all details.

Why this matters at a glance:
- Pros: Simple to implement, easy to read for small apps.
- Cons: Data duplication, update anomalies (change customer/product data in many rows), harder to enforce referential integrity.

---

## 2. 2NF Concepts and an Example

2NF requires 1NF plus removal of partial dependencies: no non-key attribute should depend on part of a composite primary key. A common approach is to model orders, customers, and products as separate entities, with order_items linking them. This eliminates duplication of customer and product data and makes updates safer.

Code: 2NF design (normalized into customers, orders, products, order_items)
```ruby
# Migrations: split data into separate tables
class CreateCustomers < ActiveRecord::Migration[6.0]
  def change
    create_table :customers do |t|
      t.string  :name
      t.string  :email
      t.string  :address
      t.timestamps
    end
  end
end

class CreateOrders < ActiveRecord::Migration[6.0]
  def change
    create_table :orders do |t|
      t.integer :customer_id
      t.date    :order_date
      t.timestamps
    end

    add_foreign_key :orders, :customers
    add_index :orders, :customer_id
  end
end

class CreateProducts < ActiveRecord::Migration[6.0]
  def change
    create_table :products do |t|
      t.string  :name
      t.decimal :price, precision: 10, scale: 2
      t.integer :category_id
      t.timestamps
    end

    add_foreign_key :products, :categories
    add_index :products, :category_id
  end
end

class CreateOrderItems < ActiveRecord::Migration[6.0]
  def change
    create_table :order_items do |t|
      t.integer :order_id
      t.integer :product_id
      t.integer :quantity
      t.timestamps
    end

    add_foreign_key :order_items, :orders
    add_foreign_key :order_items, :products
    add_index :order_items, [:order_id, :product_id], unique: true
  end
end

class CreateCategories < ActiveRecord::Migration[6.0]
  def change
    create_table :categories do |t|
      t.string :name
      t.timestamps
    end
  end
end
```

```ruby
# Models (2NF)
class Customer < ActiveRecord::Base
  has_many :orders
end

class Order < ActiveRecord::Base
  belongs_to :customer
  has_many :order_items
  has_many :products, through: :order_items
end

class Product < ActiveRecord::Base
  belongs_to :category
  has_many :order_items
  has_many :orders, through: :order_items
end

class OrderItem < ActiveRecord::Base
  belongs_to :order
  belongs_to :product
end

class Category < ActiveRecord::Base
  has_many :products
end
```

```ruby
# Seed / usage example (2NF)
customer = Customer.create(name: 'Alice Smith', email: 'alice@example.com', address: '123 Pine St')
order = Order.create(customer: customer, order_date: Date.parse('2024-01-15'))

category = Category.create(name: 'Gadgets')
product = Product.create(name: 'Widget A', price: 9.99, category: category)

OrderItem.create(order: order, product: product, quantity: 2)
```

### Line-by-line explanation
- CreateCustomers/CreateOrders/CreateProducts/CreateOrderItems/CreateCategories: Migrations to split concerns across tables.
- customers: name, email, address; no duplication of customer data in orders.
- orders: belongs_to customer; stores order_date.
- products: stores name, price, and category_id; no price duplication across orders.
- order_items: join table linking orders and products with quantity; uses a composite-like index for uniqueness.
- add_foreign_key and add_index: enforce referential integrity and improve query performance.
- Models: establish relationships (has_many, belongs_to, and has_many :through).
- Seed data: demonstrates creating normalized records and associating them.

Why this matters at a glance:
- Pros: Reduced duplication, consistent updates (change customer address once), easier data validation.
- Cons: Requires joins for most queries; more complex application code and slower read performance without proper indexing.

---

## 3. 3NF Concepts and an Example

3NF adds the elimination of transitive dependencies: non-key attributes should depend only on the primary key, not on other non-key attributes. In practice, this means further decoupling any derived or dependent attributes (e.g., category metadata) into their own tables and avoiding storing derived values in other tables.

Code: 3NF design (ensuring transitive dependencies are removed)
```ruby
# Migrations: ensure all non-key attributes depend only on their own table's primary key
class CreateCategories < ActiveRecord::Migration[6.0]
  def change
    create_table :categories do |t|
      t.string :name
      t.text   :description
      t.timestamps
    end
  end
end

class CreateProducts3nf < ActiveRecord::Migration[6.0]
  def change
    create_table :products do |t|
      t.string  :name
      t.decimal :price, precision: 10, scale: 2
      t.integer :category_id
      t.timestamps
    end

    add_foreign_key :products, :categories
    add_index :products, :category_id
  end
end

class CreateCustomers3nf < ActiveRecord::Migration[6.0]
  def change
    create_table :customers do |t|
      t.string :name
      t.string :email
      t.string :address
      t.timestamps
    end
  end
end

class CreateOrders3nf < ActiveRecord::Migration[6.0]
  def change
    create_table :orders do |t|
      t.integer :customer_id
      t.date    :order_date
      t.timestamps
    end

    add_foreign_key :orders, :customers
    add_index :orders, :customer_id
  end
end

class CreateOrderItems3nf < ActiveRecord::Migration[6.0]
  def change
    create_table :order_items do |t|
      t.integer :order_id
      t.integer :product_id
      t.integer :quantity
      t.timestamps
    end

    add_foreign_key :order_items, :orders
    add_foreign_key :order_items, :products
    add_index :order_items, [:order_id, :product_id], unique: true
  end
end
```

```ruby
# Models (3NF)
class Customer < ActiveRecord::Base
  has_many :orders
end

class Order < ActiveRecord::Base
  belongs_to :customer
  has_many :order_items
  has_many :products, through: :order_items
end

class Product < ActiveRecord::Base
  belongs_to :category
  has_many :order_items
  has_many :orders, through: :order_items
end

class Category < ActiveRecord::Base
  has_many :products
end

class OrderItem < ActiveRecord::Base
  belongs_to :order
  belongs_to :product
end
```

```ruby
# Seed / usage example (3NF)
category = Category.create(name: 'Gadgets', description: 'Electronic gadgets and devices')
product  = Product.create(name: 'Widget A', price: 9.99, category: category)
customer = Customer.create(name: 'Alice Smith', email: 'alice@example.com', address: '123 Pine St')
order    = Order.create(customer: customer, order_date: Date.parse('2024-01-15'))
OrderItem.create(order: order, product: product, quantity: 2)
```

### Line-by-line explanation
- Category and Product: create a dedicated category with its own metadata (description), ensuring category data is not embedded in products where it doesn’t belong.
- Products: reference category_id; price stored at product level only.
- Orders/OrderItems/Customers: maintain clear foreign-key relationships to avoid transitive dependencies (e.g., avoid storing category_name in products or order_items).
- Seed data: demonstrates a fully normalized setup where data is stored only once per entity and linked via IDs.

Why this matters at a glance:
- Pros: Cleanest form of normalization; easiest to enforce data integrity and update metadata in one place.
- Cons: Requires more joins for reads; can be more complex to write and optimize queries, especially for reporting.

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Storing denormalized customer data in orders
  - BAD
    ```ruby
    # Single orders table storing customer data
    class CreateOrdersDenorm < ActiveRecord::Migration[6.0]
      def change
        create_table :orders_denorm do |t|
          t.integer :customer_id
          t.string  :customer_name
          t.string  :customer_email
          t.string  :customer_address
          t.date    :order_date
          t.timestamps
        end
      end
    end
    ```
  - GOOD
    ```ruby
    # Normalized: separate customers table
    class CreateCustomersNorm < ActiveRecord::Migration[6.0]
      def change
        create_table :customers do |t|
          t.string :name
          t.string :email
          t.string :address
          t.timestamps
        end
      end
    end
    ```

- Pitfall 2: Missing foreign keys and unsafe joins
  - BAD
    ```ruby
    # Orders referencing customers by ID but no FK
    class CreateOrdersNoFK < ActiveRecord::Migration[6.0]
      def change
        create_table :orders do |t|
          t.integer :customer_id
          t.date    :order_date
          t.timestamps
        end
      end
    end
    ```
  - GOOD
    ```ruby
    class CreateOrdersWithFK < ActiveRecord::Migration[6.0]
      def change
        create_table :orders do |t|
          t.integer :customer_id
          t.date    :order_date
          t.timestamps
        end
        add_foreign_key :orders, :customers
        add_index :orders, :customer_id
      end
    end
    ```

- Pitfall 3: Ignoring indexing on join keys
  - BAD
    ```ruby
    # Querying orders by customer_id without an index
    Order.joins(:order_items).where(customer_id: 123)
    ```
  - GOOD
    ```ruby
    # Ensure index on foreign keys
    add_index :orders, :customer_id
    add_index :order_items, [:order_id, :product_id]
    # Query remains the same but performs faster due to indexing
    Order.joins(:order_items).where(customer_id: 123)
    ```

- Pitfall 4: Over-normalization without practical benefits
  - BAD: Splitting completely into many tiny tables for tiny datasets, causing excessive joins.
  - GOOD: Normalize where it reduces duplication and improves integrity, but balance with query performance and tooling support.

- Pitfall 5: Storing computed or derived attributes
  - BAD
    ```ruby
    # In products: category_name stored redundantly
    t.string :category_name
    ```
  - GOOD
    ```ruby
    # Category data lives in categories table; derive at query time via joins
    # Products reference category_id only
    ```

---

## Y. Why This Matters In Real Systems — production context and real usage

- Data integrity and anomalies: Normalized schemas prevent update/update anomalies. Changing a customer's address or a product's price in one place automatically propagates correctly where foreign keys and joins are used.
- Maintenance and evolution: As features grow (e.g., promotions, product categories, supplier data), a clean 3NF structure supports easier schema changes with minimal risk.
- Query patterns and performance: Normalized schemas often require more joins. In production, you optimize with:
  - Proper indexing on foreign keys and join keys
  - Denormalization selectively for reporting (materialized views or summary tables)
  - Caching hot reads for frequently accessed aggregates
  - Careful migrations with backward-compatible changes
- Data integrity and auditing: Foreign keys enable referential integrity; timestamps and soft deletes support audit trails.
- ORM considerations: ActiveRecord and similar ORMs map cleanly to normalized schemas, with associations that reflect real-world relationships, making the domain model expressive and maintainable.

---

## Z. Study Questions — 5 recall questions

1. What is the core difference between 1NF and 2NF?
2. Why are foreign keys important when moving from 1NF to 2NF?
3. What is a transitive dependency, and how does 3NF address it?
4. In a normalized schema, where should price live: in orders, in order_items, or in products? Why?
5. What are two common production strategies to handle the performance impact of normalized schemas?

---

## Exercise — a practical multi-part coding challenge

Goal: Build a small Ruby project (no Rails) that demonstrates a clean, normalized database (3NF) for an e-commerce-like domain, seed data, and write a query that reports orders with line items and totals.

Part 0: Prerequisites
- Ruby (2.7+ recommended)
- sqlite3 installed
- gems: activerecord, sqlite3
- Create a new directory for the exercise (e.g., db_norm_exercise)

Part 1: Setup and connection
- Create a Ruby script or IRB session to establish a database connection and require ActiveRecord.
Code:
```ruby
# setup.rb
require 'active_record'
require 'sqlite3'

ActiveRecord::Base.establish_connection(
  adapter: 'sqlite3',
  database: 'db_norm_exercise.sqlite3'
)

# Simple logger (optional)
ActiveRecord::Base.logger = Logger.new(STDOUT)
```

```ruby
# Line-by-line explanation
# require libraries: ActiveRecord for ORM, sqlite3 for the database
# establish_connection: configure a SQLite database file
# logger: prints SQL statements to stdout for learning
```

Part 2: Define migrations (3NF schema)
- Implement migrations to create categories, products, customers, orders, and order_items with proper foreign keys.

Code:
```ruby
# migrations.rb
class CreateCategories < ActiveRecord::Migration[6.0]
  def change
    create_table :categories do |t|
      t.string :name
      t.text   :description
      t.timestamps
    end
  end
end

class CreateProducts < ActiveRecord::Migration[6.0]
  def change
    create_table :products do |t|
      t.string  :name
      t.decimal :price, precision: 10, scale: 2
      t.integer :category_id
      t.timestamps
    end
    add_foreign_key :products, :categories
    add_index :products, :category_id
  end
end

class CreateCustomers < ActiveRecord::Migration[6.0]
  def change
    create_table :customers do |t|
      t.string :name
      t.string :email
      t.string :address
      t.timestamps
    end
  end
end

class CreateOrders < ActiveRecord::Migration[6.0]
  def change
    create_table :orders do |t|
      t.integer :customer_id
      t.date    :order_date
      t.timestamps
    end
    add_foreign_key :orders, :customers
    add_index :orders, :customer_id
  end
end

class CreateOrderItems < ActiveRecord::Migration[6.0]
  def change
    create_table :order_items do |t|
      t.integer :order_id
      t.integer :product_id
      t.integer :quantity
      t.timestamps
    end
    add_foreign_key :order_items, :orders
    add_foreign_key :order_items, :products
    add_index :order_items, [:order_id, :product_id], unique: true
  end
end
```

```ruby
# Line-by-line explanation
# Each class defines a migration to create a normalized table.
# Categories: basic metadata for product classification.
# Products: references category_id; price stored at product level.
# Customers: stores customer data once.
# Orders: references customer; stores date.
# OrderItems: join table connecting orders and products with quantity.
# Foreign keys and indexes ensure referential integrity and efficient joins.
```

Part 3: Define models and associations
Code:
```ruby
# models.rb
class Category < ActiveRecord::Base
  has_many :products
end

class Product < ActiveRecord::Base
  belongs_to :category
  has_many :order_items
  has_many :orders, through: :order_items
end

class Customer < ActiveRecord::Base
  has_many :orders
end

class Order < ActiveRecord::Base
  belongs_to :customer
  has_many :order_items
  has_many :products, through: :order_items
end

class OrderItem < ActiveRecord::Base
  belongs_to :order
  belongs_to :product
end
```

```ruby
# Line-by-line explanation
# Establishes domain models and their relationships.
# Belongs_to/has_many/has_many through set up standard ORM associations.
```

Part 4: Run migrations and seed data
Code:
```ruby
# migrate_and_seed.rb
require_relative 'setup'
require_relative 'migrations'
require_relative 'models'

ActiveRecord::Base.connection.migration_context.migrate

# Seed sample data
cat = Category.create(name: 'Gadgets', description: 'Electronic gadgets')
prod1 = Product.create(name: 'Widget A', price: 9.99, category: cat)
prod2 = Product.create(name: 'Widget B', price: 14.50, category: cat)

cust = Customer.create(name: 'Alice Smith', email: 'alice@example.com', address: '123 Pine St')
order = Order.create(customer: cust, order_date: Date.today)

OrderItem.create(order: order, product: prod1, quantity: 2)
OrderItem.create(order: order, product: prod2, quantity: 1)
```

```ruby
# Line-by-line explanation
# Load setup, migrations, and models; run migrations.
# Seed data for category, products, customer, order, and line items.
```

Part 5: Query: fetch orders with line items and total per order
Code:
```ruby
# reporting.rb
require_relative 'setup'
require_relative 'migrations'
require_relative 'models'

# Ensure data exists
Order.includes(:order_items => :product, :customer).each do |ord|
  total = ord.order_items.sum { |oi| oi.quantity * oi.product.price }
  puts "Order ##{ord.id} for #{ord.customer.name} on #{ord.order_date}:"
  ord.order_items.each do |oi|
    puts "  - #{oi.product.name} x#{oi.quantity} @ #{oi.product.price}"
  end
  puts "  Total: $#{'%.2f' % total}"
end
```

```ruby
# Line-by-line explanation
# Load environment and models; eager-load associations to minimize queries.
# Iterate each order; compute total via sum over line items using product.price.
# Print a readable summary per order with items and total.
```

Notes and guidance for the exercise
- This exercise walks you through a realistic normalization path (3NF) and shows how to model relationships with AR-like syntax.
- In a real project, prefer migrations in separate files and run them with rake tasks or rails commands.
- When querying, use includes to avoid N+1 queries; adjust based on your database size and query patterns.
- You can extend this exercise with additional features (e.g., discounts, tax calculations, or customer loyalty data) while preserving normalization.

End of lesson.