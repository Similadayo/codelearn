# Phase 5 — Databases: Indexing, Query Planning & Performance (Ruby)

Indexing, query planning, and performance tuning are critical skills for backend engineers. In Ruby applications, especially with Rails, the database layer is the primary source of latency and scalability constraints. Thoughtful indexing speeds up reads, while understanding query plans helps you select efficient execution strategies and avoid costly operations. This lesson covers how indexes work, how to inspect and interpret query plans, and practical patterns to improve performance in production systems using Ruby.

## 1. Understanding Indexes and How DBs Use Them

Indexes are data structures that help the database locate rows without scanning entire tables. The most common index type in PostgreSQL is a B-tree, which efficiently supports equality and range lookups. Composite (multi-column) indexes support queries that filter on multiple columns. Partial indexes index only a subset of rows (e.g., rows matching a condition), reducing index size and maintenance cost. Unique indexes enforce uniqueness constraints and also enable fast lookups by the indexed column.

Code examples (Ruby/ActiveRecord) - creating common indexes

```ruby
# db/migrate/20240101000000_add_indexes_to_users_orders_events.rb
class AddIndexesToUsersOrdersEvents < ActiveRecord::Migration[7.0]
  def change
    # Ensure unique emails for quick lookups and user authentication
    add_index :users, :email, unique: true

    # Common query: find all orders for a user within a date range
    add_index :orders, [:user_id, :created_at]

    # Common filter: events created after a threshold; partial index reduces size
    add_index :events, :created_at, where: "created_at >= DATE '2020-01-01'"
  end
end
```

### Line-by-line explanation breaking down each line

- class AddIndexesToUsersOrdersEvents < ActiveRecord::Migration[7.0]
  - Declares a migration class to modify the database schema in Rails 7.0+.
- def change
  - Entry point for reversible migrations.
- add_index :users, :email, unique: true
  - Creates a unique b-tree index on users.email to speed up lookups and enforce uniqueness.
- add_index :orders, [:user_id, :created_at]
  - Creates a composite index on orders for queries filtering by user_id and created_at, speeding up typical order-history lookups.
- add_index :events, :created_at, where: "created_at >= DATE '2020-01-01'"
  - Creates a partial index on events.created_at for rows after 2020-01-01, reducing index size and maintenance when most queries target recent events.
- end
- end

Notes:
- In PostgreSQL, the default index type is B-tree, which handles equality and range queries well.
- Composite indexes are most beneficial when your common queries filter on the leading columns in the index order.
- Partial indexes require the database to support the WHERE clause in index definitions (PostgreSQL does).

## 2. Query Planning: EXPLAIN & EXPLAIN ANALYZE

Query planning is the database’s job of choosing the most efficient way to execute a query. The planner uses statistics about data distribution to select indexes, join methods, and access strategies. You can inspect plans with EXPLAIN (and actual timing with EXPLAIN ANALYZE). In Ruby apps (Rails), you can obtain plans via ActiveRecord or direct SQL, which helps you validate that your indexes are being used and estimate query costs.

Code examples (Ruby/ActiveRecord)

```ruby
# Using ActiveRecord to show the planner's chosen plan for a simple lookup
puts User.where(email: 'alice@example.com').explain

# Raw SQL explain analyze to see actual timing and row estimates
sql = "SELECT * FROM users WHERE email = 'alice@example.com'"
plan = ActiveRecord::Base.connection.execute("EXPLAIN ANALYZE #{sql}")
puts plan.to_a
```

### Line-by-line explanation breaking down each line

- puts User.where(email: 'alice@example.com').explain
  - Produces the query plan for the relation. This helps verify if an index is chosen and what scan type is used.
- sql = "SELECT * FROM users WHERE email = 'alice@example.com'"
  - Builds a raw SQL string for demonstration of EXPLAIN ANALYZE.
- plan = ActiveRecord::Base.connection.execute("EXPLAIN ANALYZE #{sql}")
  - Executes the EXPLAIN ANALYZE command against PostgreSQL (or your DB) to collect both the plan and actual timings.
- puts plan.to_a
  - Converts the plan result into an array of rows and prints it for inspection.

Notes:
- The explain output shows components like Seq Scan, Index Scan, Bitmap Index Scan, Join methods, and estimated costs. Look for Index Scan usage as an indication an index is being used.
- In Rails, relation.explain is convenient for quick checks; EXPLAIN ANALYZE provides actual runtimes with row counts.

## 3. Performance Patterns, Patterns, and Practical Tips

Performance in Ruby apps hinges on selecting the right data access patterns, ordering query plans, and paying attention to how data is loaded. This section demonstrates practical patterns such as avoiding N+1 queries, using selective column retrieval, and leveraging covering indexes when available.

Code examples (Ruby/ActiveRecord)

```ruby
# 3a) N+1 problem vs eager loading (posts for users)
# Bad: N+1 queries
users = User.limit(5)
users.each do |u|
  puts "User #{u.id}: posts_count=#{u.posts.count}"
end

# Good: Eager loading to avoid per-user queries
users = User.includes(:posts).limit(5)
users.each do |u|
  puts "User #{u.id}: posts_count=#{u.posts.size}"
end
```

```ruby
# 3b) Selecting only needed columns to reduce data transfer
users = User.select(:id, :email).where(active: true)
users.each do |u|
  puts "User #{u.id}, #{u.email}"
end
```

```ruby
# 3c) Covering index pattern (Postgres + Rails 6+)
# This demonstrates how to create a covering index that includes non-key columns
# so queries can be served from the index without hitting the table.
class AddCoveringIndexToPosts < ActiveRecord::Migration[7.0]
  def change
    add_index :posts, [:user_id, :status], name: 'index_posts_on_user_id_and_status', include: [:created_at]
  end
end
```

### Line-by-line explanation breaking down each line (3a–3c)

- 3a Bad example:
  - users = User.limit(5)
    - Fetches five users; subsequent u.posts.count triggers a separate query per user, causing N+1.
  - users.each do |u|
  -   puts "User #{u.id}: posts_count=#{u.posts.count}"
  - end
- 3a Good example:
  - users = User.includes(:posts).limit(5)
    - Eager loads associated posts to avoid per-user queries.
  - users.each do |u|
  -   puts "User #{u.id}: posts_count=#{u.posts.size}"
  - end
- 3b Selecting columns:
  - User.select(:id, :email).where(active: true)
    - Fetches only id and email columns, reducing payload.
  - Loop prints a lean representation without extra data transfer.
- 3c Covering index migration:
  - add_index :posts, [:user_id, :status], name: 'index_posts_on_user_id_and_status', include: [:created_at]
    - Creates a covering index so queries filtering by user_id and status can be served from the index itself with created_at included.
  - This is PostgreSQL-specific and requires Rails 6+ to use include.

Notes:
- N+1 is one of the most common performance killers in ORMs. Eager loading via includes or joins reduces round-trips to the database.
- Selecting only needed columns reduces memory usage and network transfer, which can improve throughput in high-load systems.
- Covering indexes are a powerful technique when supported by your DB and framework; they allow index-only scans for common queries.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: Over-indexing / under-indexing

Bad: creating many unhelpful or redundant indexes
```ruby
# Bad: adding many separate, potentially redundant indexes
class AddTooManyIndexes < ActiveRecord::Migration[7.0]
  def change
    add_index :users, :email
    add_index :users, :username
    add_index :users, :status
    add_index :users, :last_login_at
    add_index :orders, :created_at
    add_index :orders, :status
  end
end
```

Good: targeted, minimal, and purposeful indexes
```ruby
class AddTargetedIndexes < ActiveRecord::Migration[7.0]
  def change
    add_index :users, :email, unique: true
    add_index :orders, [:user_id, :created_at]
  end
end
```

### Pitfall 2: SQL injection risk via string interpolation

Bad: interpolating user input into SQL
```ruby
def find_orders(params)
  query = "SELECT * FROM orders WHERE user_id = #{params[:user_id]}"
  Order.find_by_sql(query)
end
```

Good: use parameterized queries or ORM query methods
```ruby
def find_orders(params)
  Order.where(user_id: params[:user_id])
end
```

### Pitfall 3: N+1 queries due to lazy loading

Bad: accessing associations inside a loop without preloading
```ruby
users = User.limit(10)
users.each do |u|
  puts u.posts.count
end
```

Good: preload associations
```ruby
users = User.includes(:posts).limit(10)
users.each do |u|
  puts u.posts.count
end
```

### Pitfall 4: Not validating or inspecting query plans

Bad: assuming the index is used without verification
```ruby
User.where(email: 'user@example.com').to_a
```

Good: explicitly inspect the plan
```ruby
puts User.where(email: 'user@example.com').explain
```

Notes:
- The goal is to avoid performance regressions by ensuring you have the right indexes, safe queries, and visibility into how the database will execute them.
- Regularly inspecting explain plans after schema changes helps you catch regressions early.

## Y. Why This Matters In Real Systems

In production systems, indexes are a double-edged sword. They accelerate reads but slow down writes and increase storage, so you must balance read/write patterns. Proper indexing reduces latency, improves user experience, and lowers operational costs by reducing CPU and I/O. However, over-indexing or creating poorly chosen composite indexes can degrade performance and complicate maintenance.

Real-world practices:
- Baseline performance: measure before and after changes using explain plans and real workloads.
- Use EXPLAIN ANALYZE in staging to capture actual timings and row counts.
- Prefer targeted composite indexes for common query patterns rather than many single-column indexes.
- Consider covering indexes (PostgreSQL INCLUDE) to allow index-only scans for frequent queries.
- Maintain statistics and vacuum/analyze regularly to keep the planner informed, especially after large data loads or deletions.
- Be mindful of write-heavy workloads: every new index adds write overhead; remove indexes that are rarely used or redundant.
- Use tools and instrumentation in your stack (Rails logs, ActiveRecord explains, database monitoring) to identify hotspots and validate improvements.

## Z. Study Questions — 5 recall questions

1) What is the primary purpose of an index in a database, and how does it generally improve query performance?
2) How does a composite index differ from a single-column index, and when would you choose one?
3) How can you verify which index a given query will use in PostgreSQL?
4) What is an index-only scan, and what feature enables it in PostgreSQL?
5) Why is eager loading (includes) important in reducing N+1 queries in Ruby ORMs like ActiveRecord?

## Exercise — a practical multi-part coding challenge

Overview:
You are given a Ruby on Rails-like environment with three tables: users, orders, and events. The following tasks guide you through designing an indexing strategy, validating query plans, and applying performance best practices in code.

Part A — Add targeted indexes
- Create the following indexes:
  - A unique index on users.email.
  - A composite index on orders (user_id, created_at).
  - A partial index on events (created_at) for recent events (created_at >= '2020-01-01').
- Provide the migration code (ActiveRecord syntax) you would run.

Part B — Validate query plans with and without indexes
- Write a Ruby snippet that:
  - Shows the explain plan for a query that looks up a user by email using ActiveRecord.
  - Runs an EXPLAIN ANALYZE for the same query using raw SQL.
- Explain how you would interpret the results to decide if an index is being used.

Part C — Detect and fix N+1 queries
- Given the pattern of loading users and iterating to fetch posts, identify a potential N+1 problem.
- Provide both a bad version (N+1) and a corrected version using eager loading.
- Explain what changes you made and why they improve performance.

Part D — A small performance benchmark
- Implement a small Ruby script that measures and prints the wall-clock time to run:
  - A query that selects a handful of users by status and prints their emails.
  - The same query performed after an appropriate index is in place and after applying includes for eager loading.
- Print results and provide a short interpretation of the impact of indexing and eager loading.

Deliverables:
- The Ruby migration code snippets for Part A.
- The Ruby snippet for Part B (explain calls).
- The before/after code for Part C (N+1 vs eager loading) plus a short explanation.
- The benchmark script for Part D and a brief interpretation of the results.

This completes a compact, production-oriented lesson on indexing, query planning, and performance in a Ruby-based backend.