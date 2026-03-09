# ORM & Migrations in Node.js — Phase 5: Databases

Databases are the backbone of most backend systems. An ORM (Object-Relational Mapper) lets you work with database tables as if they were regular JavaScript objects, reducing boilerplate and improving maintainability. Migrations are the formal mechanism to evolve your database schema over time, ensuring changes are tracked, reversible, and safe to deploy. In real systems, you’ll often combine an ORM with a robust migration strategy to support feature rollouts, hotfixes, and scalable data models.

## 1. ORM Fundamentals: Models, Schemas, and the Data Mapping

Code example uses Sequelize to define a User model, connect to a database, sync the schema, and perform basic CRUD operations.

```js
// 1. ORM Fundamentals: defining a model and performing basic CRUD
const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:', { logging: false });

class User extends Model {}
User.init({
  // attributes
  name: DataTypes.STRING,
  email: DataTypes.STRING
}, {
  sequelize,
  modelName: 'User'
});

(async () => {
  // Create the schema in the database (creates Users table)
  await sequelize.sync({ force: true });

  // Create a new user
  await User.create({ name: 'Alice', email: 'alice@example.com' });

  // Read all users
  const users = await User.findAll();
  console.log(users.map(u => u.toJSON()));
})();
```

### Line-by-line explanation breaking down each line

- const { Sequelize, DataTypes, Model } = require('sequelize');
  - Import Sequelize core classes needed to define models, data types, and the ORM instance.
- const sequelize = new Sequelize('sqlite::memory:', { logging: false });
  - Create an in-memory SQLite database instance for demonstration; disable SQL logging for clarity.
- class User extends Model {}
  - Define a User model by extending Sequelize’s Model class.
- User.init({ name: DataTypes.STRING, email: DataTypes.STRING }, { sequelize, modelName: 'User' });
  - Define the User schema with two attributes and bind the model to the Sequelize instance.
- (async () => { ... })();
  - Immediately-invoked async function to run async Sequelize calls.
- await sequelize.sync({ force: true });
  - Create the database tables; force: true drops and recreates tables to start fresh.
- await User.create({ name: 'Alice', email: 'alice@example.com' });
  - Insert a new User row into the Users table.
- const users = await User.findAll();
  - Retrieve all users from the database.
- console.log(users.map(u => u.toJSON()));
  - Print user data as plain objects for inspection.

## 2. Managing Database Changes with Migrations

Code example shows a Sequelize migration file that creates a Users table with up and down migrations.

```js
// 2. Migrations: create_users.js
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Users', {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      name: { type: Sequelize.STRING },
      email: { type: Sequelize.STRING, unique: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn('NOW') }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Users');
  }
};
```

### Line-by-line explanation breaking down each line

- 'use strict';
  - Enable strict mode for better error checking in the migration file.
- module.exports = { up: async (queryInterface, Sequelize) => { ... }, down: async (queryInterface, Sequelize) => { ... } };
  - Export a migration object with two operations: up (apply) and down (revert).
- up: async (queryInterface, Sequelize) => { ... }
  - Define the function that applies the migration.
- await queryInterface.createTable('Users', { ... });
  - Create the Users table with defined columns.
- id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true }
  - Define a primary key that auto-increments.
- name: { type: Sequelize.STRING }, email: { type: Sequelize.STRING, unique: true }
  - Add name and a unique email column.
- createdAt / updatedAt
  - Timestamps for record creation and updates (standard in Sequelize).
- down: async (queryInterface, Sequelize) => { await queryInterface.dropTable('Users'); }
  - Revert the migration by dropping the Users table.

## 3. Defining Associations and Relationships

Code example demonstrates one-to-many (User hasMany Posts) and the corresponding Post.belongsTo(User). It also shows creating and querying with associations.

```js
// 3. Associations: one-to-many relationship (User -> Posts)
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = new Sequelize('sqlite::memory:', { logging: false });

const User = sequelize.define('User', { name: DataTypes.STRING, email: DataTypes.STRING });
const Post = sequelize.define('Post', { title: DataTypes.STRING, content: DataTypes.TEXT });

User.hasMany(Post);
Post.belongsTo(User);

(async () => {
  await sequelize.sync({ force: true });

  const user = await User.create({ name: 'Eve', email: 'eve@example.com' });

  // Create a post that belongs to the user
  await Post.create({ title: 'First Post', content: 'Hello world!', UserId: user.id });

  // Fetch posts for a specific user (lazy access through association)
  const posts = await Post.findAll({ where: { UserId: user.id }, include: [User] });
  console.log(posts.map(p => p.toJSON()));
})();
```

### Line-by-line explanation breaking down each line

- const { Sequelize, DataTypes } = require('sequelize');
  - Import necessary Sequelize constructors and data types.
- const sequelize = new Sequelize('sqlite::memory:', { logging: false });
  - Create an in-memory database for demonstration.
- const User = sequelize.define('User', { name: DataTypes.STRING, email: DataTypes.STRING });
  - Define User model with name and email fields.
- const Post = sequelize.define('Post', { title: DataTypes.STRING, content: DataTypes.TEXT });
  - Define Post model with title and content fields.
- User.hasMany(Post);
  - Establish a one-to-many association: a User has many Posts.
- Post.belongsTo(User);
  - Each Post belongs to one User.
- const user = await User.create({ name: 'Eve', email: 'eve@example.com' });
  - Create a user record.
- await Post.create({ title: 'First Post', content: 'Hello world!', UserId: user.id });
  - Create a post linked to the user via the foreign key UserId.
- const posts = await Post.findAll({ where: { UserId: user.id }, include: [User] });
  - Retrieve the user's posts, including the associated user data.
- console.log(posts.map(p => p.toJSON()));
  - Print the posts with their data.

## 4. Efficient Data Access: Eager vs Lazy Loading and Performance

Code example contrasts eager loading (loading related data in a single query) with lazy loading (loading related data on-demand).

```js
// 4a. Eager loading: fetch posts along with their users in one query
const postsWithUsers = await Post.findAll({ include: [User] });
console.log(postsWithUsers.map(p => p.toJSON()));
```

```js
// 4b. Lazy loading: fetch a post, then load its user as-needed
const post = await Post.findOne({ where: { id: 1 } });
const author = await post.getUser();
console.log({ post: post.toJSON(), author: author.toJSON() });
```

### Line-by-line explanation breaking down each line (4a)

- const postsWithUsers = await Post.findAll({ include: [User] });
  - Perform eager loading: retrieve posts and their associated User in a single query.
- console.log(postsWithUsers.map(p => p.toJSON()));
  - Print posts with embedded user data.

### Line-by-line explanation breaking down each line (4b)

- const post = await Post.findOne({ where: { id: 1 } });
  - Retrieve a single post without loading the user yet (lazy).
- const author = await post.getUser();
  - Load the related User for that post on demand.
- console.log({ post: post.toJSON(), author: author.toJSON() });
  - Output both post and author data.

Performance notes:
- Use eager loading when you know you’ll need related data for many items to minimize round-trips.
- Use lazy loading when related data is rarely needed or you want to reduce initial payload.
- Ensure proper indexes on foreign keys (e.g., UserId) to speed up joins and lookups.

## 5. Transactions and Data Integrity

Code example shows wrapping multiple writes in a transaction to guarantee atomicity.

```js
// 5. Transactions: ensure multiple writes succeed or fail together
const t = await sequelize.transaction();
try {
  const user = await User.create({ name: 'Grace', email: 'grace@example.com' }, { transaction: t });
  await Post.create({ title: 'Grace\'s Post', content: 'Transactional data!', UserId: user.id }, { transaction: t });

  // If both succeed, commit the transaction
  await t.commit();
} catch (err) {
  // If any operation fails, rollback to the previous state
  await t.rollback();
  console.error('Transaction failed:', err);
}
```

### Line-by-line explanation breaking down each line

- const t = await sequelize.transaction();
  - Start a new database transaction.
- try { ... } catch (err) { ... }
  - Attempt the operations; if anything fails, handle the error and rollback.
- const user = await User.create(..., { transaction: t });
  - Create a user within the transactional context.
- await Post.create(..., { transaction: t });
  - Create a related post within the same transaction.
- await t.commit();
  - Commit all changes atomically if everything succeeded.
- await t.rollback();
  - Roll back all changes if any step failed.
- console.error('Transaction failed:', err);
  - Log the error for debugging and auditing.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Forgetting to wait for async operations
  - Bad:
    ```js
    // Bad: not awaiting promises
    const user = User.create({ name: 'Ivan' });
    const users = User.findAll();
    ```
  - Good:
    ```js
    // Good: awaiting asynchronous calls
    const user = await User.create({ name: 'Ivan' });
    const users = await User.findAll();
    ```
- Pitfall 2: Skipping migrations for schema changes
  - Bad:
    ```js
    // Bad: directly altering DB schema in code without migrations
    await sequelize.query("ALTER TABLE Users ADD COLUMN age INTEGER");
    ```
  - Good:
    ```js
    // Good: evolving schema via migrations
    // migration: up -> create/alter tables; down -> revert
    ```
- Pitfall 3: Not using transactions for multi-step writes
  - Bad:
    ```js
    // Bad: two independent writes without a transaction
    await User.create({ name: 'Judy' });
    await Post.create({ title: 'Untied Changes', content: '...', UserId: 9999 });
    ```
  - Good:
    ```js
    // Good: wrap in a transaction
    await sequelize.transaction(async (t) => {
      const user = await User.create({ name: 'Judy' }, { transaction: t });
      await Post.create({ title: 'Linked Post', content: '...', UserId: user.id }, { transaction: t });
    });
    ```
- Pitfall 4: Over-fetching data with eager loading when not needed
  - Bad:
    ```js
    // Bad: always fetch related data even if not used
    const posts = await Post.findAll({ include: [User] });
    ```
  - Good:
    ```js
    // Good: fetch only when needed or when data is actually used
    const posts = await Post.findAll();
    // later, conditionally load related data if required
    ```
- Pitfall 5: Not indexing foreign keys or frequently queried columns
  - Bad:
    ```sql
    -- No index on UserId; slow for large datasets
    SELECT * FROM Posts WHERE UserId = 123;
    ```
  - Good:
    ```sql
    -- Proper indexing for fast lookups
    CREATE INDEX idx_posts_userid ON Posts(UserId);
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Predictable schema evolution: Migrations give you a controlled, versioned history of schema changes that can be reviewed, tested, and rolled back if needed.
- Collaboration and CI/CD: Migrations integrate with Git workflows and deployment pipelines, ensuring database changes are part of the same release cycle as code changes.
- Data integrity and audits: Transactions ensure multi-step operations are atomic, consistent, isolated, and durable (ACID). This is crucial for financial data, user accounts, and order processing.
- Performance and scalability: Proper associations, eager vs lazy loading, and indexing influence query latency and memory usage under load. Profiling and gradual optimization are essential in production.
- Safety nets: Rollback strategies, migration tests, and seed data help maintain stable environments across development, staging, and production.

## Z. Study Questions — 5 recall questions

1. What is the primary purpose of a database migration, and how does it differ from a regular database update?
2. In Sequelize, what is the difference between hasMany and belongsTo associations, and how do you set them up?
3. When would you prefer eager loading over lazy loading, and what is a common trade-off?
4. How do you ensure atomicity when performing multiple related write operations in Node.js using an ORM?
5. What are some common signs that you need to add an index to a foreign key column in your ORM models?

## Exercise — practical multi-part coding challenge

Objective: Build a small blog data model in Node.js using Sequelize (SQLite for simplicity), implement migrations, and demonstrate basic query patterns with and without transactions.

Part A — Project setup
- Create a new directory for the exercise.
- Initialize a Node.js project: npm init -y
- Install dependencies: npm install sequelize sqlite3

Part B — Define models and associations
- Create models.js that defines:
  - User: id (PK), name, email
  - Post: id (PK), title, content, UserId (FK)
- Establish relationships: User.hasMany(Post); Post.belongsTo(User)
- Export the Sequelize instance and models

Part C — Implement migrations
- Create a migration file that creates the Users table and the Posts table with a foreign key (UserId) referencing Users.id.
- Implement both up and down methods.
- Explain how you would run migrations in your environment (e.g., using a CLI or programmatic runner).

Part D — Seed data and basic queries
- Write a seed script that inserts two users and three posts (with appropriate UserIds).
- Write a script that fetches all posts with their associated user data using eager loading.
- Write a script that fetches a single user and lazily loads their posts.

Part E — Transaction-aligned operations
- Implement a function that creates a new user and a first post for that user inside a single transaction. Ensure commit on success and rollback on error.

Part F — Optional extension (performance)
- Add an index on Posts.UserId and explain when this helps.
- Demonstrate a simple query using include to fetch users with their posts in a single operation.

Deliverables:
- A minimal, working repository structure with the described files.
- Comments in code explaining intent and decisions.
- A short README describing setup steps, how to run migrations, seed data, and run queries.

This completes a focused, practical lesson on ORM usage and migrations in a Node.js backend, including fundamentals, migration workflows, relationships, query strategies, and production considerations.