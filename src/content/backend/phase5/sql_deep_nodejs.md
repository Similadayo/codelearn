# SQL — DDL, DML, and Querying Postgres in Node.js

Compelling introductory paragraph: In modern backend systems, PostgreSQL serves as a reliable, feature-rich relational store. DDL (Data Definition Language) lets you model your schema with constraints and indexes; DML (Data Manipulation Language) lets you create, read, update, and delete data safely; and querying is how your application derives value from stored data. When building with JavaScript/Node.js, using parameterized queries, transactions, and a robust connection pool is essential for correctness, security, and performance at scale. This lesson guides you through practical PostgreSQL usage from a Node.js backend, with concrete examples, explanations, and hands-on exercises.

## 1. DDL: Defining Schema in PostgreSQL

DDL covers creating, altering, and dropping database objects. Here we define a simple yet practical schema for users and their posts, with constraints and an index to support common access patterns.

```sql
-- DDL: Create users and posts tables with constraints
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);
```

```sql
ALTER TABLE posts ADD COLUMN published BOOLEAN DEFAULT FALSE;
```

```sql
-- Example of index creation for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);
```

```sql
-- Dropping a table (safe variant)
DROP TABLE IF EXISTS old_data;
```

### Line-by-line explanation
- CREATE TABLE IF NOT EXISTS users (...): Creates a table named users if it does not already exist.
- id SERIAL PRIMARY KEY: id auto-increments and serves as the primary key.
- username VARCHAR(50) NOT NULL UNIQUE: A required username with a uniqueness constraint.
- email VARCHAR(255) NOT NULL UNIQUE: A required, unique email field.
- created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(): Timestamp defaulting to current time.
- updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(): Timestamp defaulting to current time; to be updated on changes.
- CREATE TABLE IF NOT EXISTS posts (...): Creates a table for posts with a foreign key reference to users.
- user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE: Enforces referential integrity; deleting a user cascades to their posts.
- title TEXT NOT NULL: Title is required; large text field.
- body TEXT: Post body; can be null.
- published BOOLEAN DEFAULT FALSE: New column to indicate published state.
- CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id): Creates a non-unique index on user_id to speed up lookups by author.
- DROP TABLE IF EXISTS old_data: Safely drops a table if it exists to avoid errors during migrations.

## 2. DML: Manipulating Data with SQL and Node.js

DML covers inserting, updating, deleting, and upserting data. Below are examples in pure SQL and in Node.js using the pg library, with careful use of parameterized queries to prevent SQL injection and ensure correct typing.

```sql
-- Simple inserts
INSERT INTO users (username, email) VALUES ('alice', 'alice@example.com'), ('bob', 'bob@example.com')
RETURNING id, username;
```

```sql
-- Upsert example using ON CONFLICT
INSERT INTO users (username, email) VALUES ('charlie', 'charlie@example.com')
ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()
RETURNING id;
```

```sql
-- Basic update
UPDATE posts SET title = 'Updated Title', updated_at = NOW() WHERE id = 42;
```

```sql
-- Delete example
DELETE FROM posts WHERE id = $1;
```

```js
// DML with Node.js (parameterized, with a simple insert and upsert example)

const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.PG_CONN, // e.g., 'postgres://user:pass@host:5432/db'
  max: 20,
  idleTimeoutMillis: 30000,
});

async function upsertUser(username, email) {
  const client = await pool.connect();
  try {
    const res = await client.query(
      `INSERT INTO users (username, email) VALUES ($1, $2)
       ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()
       RETURNING id;`,
      [username, email]
    );
    return res.rows[0].id;
  } finally {
    client.release();
  }
}

async function seedUsers(users) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const ids = [];
    for (const u of users) {
      const res = await client.query(
        `INSERT INTO users (username, email) VALUES ($1, $2)
         ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, updated_at = NOW()
         RETURNING id;`,
        [u.username, u.email]
      );
      ids.push(res.rows[0].id);
    }
    await client.query('COMMIT');
    return ids;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
```

### Line-by-line explanation
- const { Pool } = require('pg'): Imports the Pool class from the pg library to manage connections.
- new Pool({ ... }): Creates a connection pool with configuration, including the connection string and pool limits.
- upsertUser(username, email): Async function to perform an upsert via a single parameterized SQL statement.
- INSERT INTO users ... VALUES ($1, $2) ON CONFLICT (username) DO UPDATE ...: Inserts a new user; on username conflict, updates the email and updated_at fields.
- res.rows[0].id: Returns the generated or existing user id.
- seedUsers(users): Seed function to insert multiple users within a single transaction.
- BEGIN / COMMIT / ROLLBACK: Transaction control to ensure all-or-nothing behavior.
- For each user: executes a parameterized upsert, collects IDs.
- TRY/FINALLY blocks: Ensures the client is released back to the pool even on error.

## 3. Querying: Reading and Analyzing Data

Querying is how you derive value. The examples show aggregations, joins, and parameterized reads, both in SQL and Node.js.

```sql
-- Top authors by post count
SELECT u.id AS user_id, u.username, COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON p.user_id = u.id
GROUP BY u.id, u.username
ORDER BY post_count DESC
LIMIT 5;
```

```js
// Node.js: fetch top authors by post count (with parameterized limit)
async function getTopAuthors(limit = 5) {
  const { rows } = await pool.query(
    `SELECT u.id AS user_id, u.username, COUNT(p.id) AS post_count
     FROM users u
     LEFT JOIN posts p ON p.user_id = u.id
     GROUP BY u.id, u.username
     ORDER BY post_count DESC
     LIMIT $1`, [limit]
  );
  return rows;
}
```

```js
// Node.js: fetch recent posts for a given user (parameterized)
async function getPostsByUser(userId, limit = 10) {
  const res = await pool.query(
    `SELECT id, title, body, created_at
     FROM posts
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`, [userId, limit]
  );
  return res.rows;
}
```

### Line-by-line explanation
- SELECT u.id AS user_id, u.username, COUNT(p.id) AS post_count ...: Aggregates post counts per user, including a left join so users with no posts still appear.
- GROUP BY u.id, u.username: Groups results by user to compute per-user counts.
- ORDER BY post_count DESC: Sorts by the number of posts, descending.
- LIMIT 5: Restricts results to the top 5 users.
- pool.query(..., [limit]): Executes a parameterized query with a numeric limit to prevent injection and ensure safe values.
- getPostsByUser(userId, limit): Reads a specific user’s posts, parameterizing both userId and limit for safety and flexibility.
- ORDER BY created_at DESC: Returns most recent posts first.

## 4. X. Common Beginner Mistakes

Bad vs Good code examples side-by-side help illustrate common pitfalls.

- Pitfall 1: SQL injection through string concatenation vs parameterized queries
  - Bad:
    ```js
    // Unsafe: string concatenation with user input
    const sql = "SELECT * FROM users WHERE username = '" + username + "'";
    const res = await pool.query(sql);
    ```
  - Good:
    ```js
    // Safe: parameterized query
    const res = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    ```

- Pitfall 2: Not using a connection pool or leaking connections
  - Bad:
    ```js
    // Leaky: not releasing the connection
    async function getUser(id) {
      const client = await pool.connect();
      const res = await client.query("SELECT * FROM users WHERE id = $1", [id]);
      // missing: client.release();
      return res.rows[0];
    }
    ```
  - Good:
    ```js
    async function getUser(id) {
      const client = await pool.connect();
      try {
        const res = await client.query("SELECT * FROM users WHERE id = $1", [id]);
        return res.rows[0];
      } finally {
        client.release();
      }
    }
    ```

- Pitfall 3: Skipping transactions for multi-step operations
  - Bad:
    ```js
    // Not atomic: could leave DB in an inconsistent state
    await pool.query("UPDATE accounts SET balance = balance - $1 WHERE id = $2", [amount, fromId]);
    await pool.query("UPDATE accounts SET balance = balance + $1 WHERE id = $2", [amount, toId]);
    ```
  - Good:
    ```js
    async function transferFunds(fromId, toId, amount) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
        await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }
    ```

- Bonus Pitfall: Not leveraging indexes for common queries
  - Bad: Using a non-indexed, large scan for a frequent filter
  - Good: Ensure an index exists on frequently filtered columns (e.g., users.username, posts.user_id) and use them in queries aligned with those indexes.

## 5. Y. Why This Matters In Real Systems

- Data correctness: DDL constraints (PRIMARY KEY, UNIQUE, NOT NULL, FOREIGN KEY) enforce data integrity at the database layer, preventing invalid states.
- Safety and security: Parameterized queries prevent SQL injection; transactions ensure multi-step operations are atomic.
- Performance: Indexes on common query predicates (e.g., posts.user_id, users.username) dramatically improve read performance; unnecessary scans are avoided.
- Scalability: Connection pooling (pg Pool) enables high-concurrency workloads without exhausting DB connections; careful transaction boundaries prevent long-held locks.
- Observability and maintainability: Clear schema migrations, versioned migrations, and observable query performance (logs, EXPLAIN plans) are essential in production. Production systems often use migration tooling (e.g., node-based migrations, Knex migrations, Flyway) and monitor query latency.
- Reliability concerns: DDL operations can lock tables; plan schema changes with maintenance windows or online migration strategies when possible, and test migrations in staging before production.

## 6. Z. Study Questions

1) What is the difference between DDL and DML? Give examples of each from PostgreSQL.
2) How do you express a foreign key with cascade delete in PostgreSQL?
3) Write a SQL query to count the number of posts per user and return the top 3 authors.
4) In Node.js, why should you use parameterized queries instead of string concatenation when interacting with PostgreSQL?
5) What is the purpose of the RETURNING clause in INSERT or UPDATE statements?

## 7. Exercise

Goal: Build a small, well-structured data access layer for a simple blog system using PostgreSQL and Node.js. Implement schema, seed data, and a few query utilities.

Part A — Schema and Setup (SQL)
- Create the users and posts tables as described in Section 1, including:
  - Primary keys, unique constraints on username and email
  - Foreign key from posts.user_id to users.id with ON DELETE CASCADE
  - An index on posts.user_id
  - An additional published column on posts
- Write a SQL script to seed at least 3 users and 4 posts across those users.

Deliverables:
- A SQL file (schema.sql) containing DDL and index creation.
- A SQL file (seed.sql) containing insert statements for at least 3 users and 4 posts.

Part B — Data Access Layer (Node.js)
- Implement a small module db.js that exports:
  - getTopAuthors(limit)
  - getPostsByUser(userId, limit)
  - upsertUser(username, email)
  - seedUsers(users) which runs within a transaction
- Use the pg Pool and parameterized queries. Ensure connections are released properly.
- Include basic error handling that logs errors and rethrows.

Part C — Demonstration Script
- Create a script demo.js that:
  - Seeds 3 users (via seedUsers) and then prints the top authors (getTopAuthors(3)).
  - Performs an upsert for a new/existing user.
  - Fetches the posts for one of the users.
- Run with node demo.js and show the console output format you expect.

Optional extension:
- Add a function to create a new post for a given user and ensure updated_at is set automatically.
- Implement a simple pagination for getPostsByUser with offset/limit parameters.

Notes:
- Use environment variables for the database connection (PG_CONN) or provide a default in code for local development.
- Keep error messages informative but avoid leaking sensitive details in production logs.

This completes a practical, end-to-end lesson on DDL, DML, and querying PostgreSQL from Node.js, with attention to safety, performance, and real-world usage.