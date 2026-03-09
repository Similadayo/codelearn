# Track: Backend Engineering — Module Phase 5 — Databases: ORM & Migrations in Go (Golang)

ORMs and migrations are the practical backbone of modern backend services. They let you work with rich domain models in code while keeping the database schema evolving safely over time. In Go, popular ORMs like GORM provide expressive APIs for defining models, crafting queries, and handling relationships. Migrations give you versioned, auditable changes to schemas, enabling zero-downtime deployments and safer rollbacks in production. This lesson focuses on using an ORM (GORM) and performing migrations in a Go backend context.

## 1. ORM Setup in Go with GORM

This section introduces the core ideas of modeling and connecting to a database using GORM. We define a simple User model, establish a SQLite connection, and perform an initial schema migration with AutoMigrate.

```go
package main

import (
  "log"
  "time"

  "gorm.io/driver/sqlite"
  "gorm.io/gorm"
)

type User struct {
  ID        uint      `gorm:"primaryKey"`
  Email     string    `gorm:"uniqueIndex;size:255;not null"`
  Name      string    `gorm:"size:100"`
  CreatedAt time.Time
  UpdatedAt time.Time
}

func main() {
  // Connect to a local SQLite database file
  db, err := gorm.Open(sqlite.Open("orm_setup.db"), &gorm.Config{})
  if err != nil {
    log.Fatalf("failed to connect database: %v", err)
  }

  // Automatically migrate schema (create table if not exists; update columns)
  if err := db.AutoMigrate(&User{}); err != nil {
    log.Fatalf("auto migrate failed: %v", err)
  }

  // Create a sample user
  user := User{Email: "alice@example.com", Name: "Alice"}
  if err := db.Create(&user).Error; err != nil {
    log.Fatalf("create user failed: %v", err)
  }

  log.Printf("user created with ID=%d", user.ID)
}
```

### Line-by-line explanation
- import block: brings in logging, time, and GORM SQLite driver.
- type User struct: defines a User model with an auto-increment ID, a unique Email, a Name, and timestamps.
- func main(): entry point for the program.
- db, err := gorm.Open(...): opens a connection to a SQLite database file named orm_setup.db.
- Error check: logs fatal if the connection fails.
- db.AutoMigrate(&User{}): creates the users table if it doesn't exist, and updates columns to match the model.
- user := User{...}: constructs a new user record.
- db.Create(&user).Error: inserts the new user into the database; stores generated ID in user.ID.
- log.Printf(...): confirms the record creation with the new ID.

## 2. CRUD Operations with GORM

This section demonstrates typical Create, Read, Update, and Delete (CRUD) flows using GORM, including a simple User-Post relationship to illustrate querying related data efficiently.

```go
package main

import (
  "log"
  "time"

  "gorm.io/driver/sqlite"
  "gorm.io/gorm"
)

type User struct {
  ID        uint      `gorm:"primaryKey"`
  Email     string    `gorm:"uniqueIndex;size:255;not null"`
  Name      string    `gorm:"size:100"`
  CreatedAt time.Time
  UpdatedAt time.Time
  Posts     []Post    `gorm:"foreignKey:UserID"`
}

type Post struct {
  ID        uint      `gorm:"primaryKey"`
  UserID    uint
  Title     string
  Content   string
  CreatedAt time.Time
  UpdatedAt time.Time
}

func main() {
  db, err := gorm.Open(sqlite.Open("orm_crud.db"), &gorm.Config{})
  if err != nil {
    log.Fatalf("failed to connect: %v", err)
  }

  // Ensure schema exists
  db.AutoMigrate(&User{}, &Post{})

  // Create a user
  user := User{Email: "carol@example.com", Name: "Carol"}
  db.Create(&user)

  // Create a post for the user
  post := Post{UserID: user.ID, Title: "First Post", Content: "Hello from Go and GORM!"}
  db.Create(&post)

  // Read: load user with posts
  var u User
  db.Preload("Posts").First(&u, user.ID)
  log.Printf("User: %s, Posts: %d", u.Email, len(u.Posts))

  // Update: change the user's name
  u.Name = "Carolyn"
  db.Save(&u)

  // Delete: remove the post
  db.Delete(&post)
}
```

### Line-by-line explanation
- User and Post structs: define a one-to-many relationship; User has many Posts via Posts field with foreignKey UserID.
- main(): opens a SQLite database named orm_crud.db and migrates the schema.
- db.AutoMigrate(&User{}, &Post{}): ensures both tables exist and align with models.
- Create user and post: demonstrates inserting records with foreign key relationships.
- db.Preload("Posts").First(&u, user.ID): fetches a user and eagerly loads associated posts to avoid N+1 queries.
- Update: modifies the User’s Name and persists it with db.Save(&u).
- Delete: removes the post record.

## 3. Migrations and Schema Evolution

Migrations are the mechanism by which you evolve database schemas safely over time. This section covers two practical approaches: relying on ORM-provided AutoMigrate for basic evolution, and performing explicit migrations via raw SQL for controlled changes.

```go
package main

import (
  "log"
  "time"

  "gorm.io/driver/sqlite"
  "gorm.io/gorm"
)

type User struct {
  ID        uint      `gorm:"primaryKey"`
  Email     string    `gorm:"uniqueIndex;size:255;not null"`
  Name      string    `gorm:"size:100"`
  Bio       string    `gorm:"size:512"`
  CreatedAt time.Time
  UpdatedAt time.Time
}

func migrateWithAuto(db *gorm.DB) error {
  // Approach A: AutoMigrate handles new fields and tables
  return db.AutoMigrate(&User{})
}

func migrateExplicit(db *gorm.DB) error {
  // Approach B: Explicit migration (e.g., adding Bio column if missing)
  // Check if column 'bio' exists
  var count int
  // SQLite pragma to inspect table columns
  if err := db.Raw("SELECT count(*) FROM pragma_table_info('users') WHERE name = 'bio'").Scan(&count).Error; err != nil {
    return err
  }
  if count == 0 {
    // Apply migration to add the column
    if err := db.Exec("ALTER TABLE users ADD COLUMN bio TEXT").Error; err != nil {
      return err
    }
  }
  return nil
}

func main() {
  db, err := gorm.Open(sqlite.Open("orm_migrate.db"), &gorm.Config{})
  if err != nil {
    log.Fatalf("failed to connect: %v", err)
  }

  // Start from a clean slate with AutoMigrate
  if err := migrateWithAuto(db); err != nil {
    log.Fatalf("auto migrate failed: %v", err)
  }

  // Then apply an explicit migration if desired
  if err := migrateExplicit(db); err != nil {
    log.Fatalf("explicit migration failed: %v", err)
  }

  // Example to verify: create a user with bio
  user := User{Email: "dave@example.com", Name: "Dave", Bio: "Rust lover turned Go enthusiast"}
  db.Create(&user)

  log.Printf("User %s migrated and created with ID %d", user.Email, user.ID)
}
```

### Line-by-line explanation
- User struct: adds a Bio field to illustrate evolving a model with a new column.
- migrateWithAuto: demonstrates using GORM’s AutoMigrate for basic schema evolution.
- migrateExplicit: shows how to perform an explicit migration by inspecting the existing table structure (SQLite pragma) and conditionally adding a new column.
- main: connects to the database, runs AutoMigrate to establish baseline schema, then runs the explicit migration, and finally creates a sample user with Bio to verify the column exists.
- The explicit migration pattern is a pragmatic approach in production to ensure controlled, auditable schema changes, separate from automatic schema evolution.

Note: In production, many teams prefer a dedicated migration tool (e.g., golang-migrate) with separate SQL migration files for each change. The inline example demonstrates the core ideas without requiring an external migration tool.

## X. Common Beginner Mistakes

- 1) N+1 queries when loading relations
  - Bad:
    ```go
    // N+1: loading posts for each user inside a loop
    var users []User
    db.Find(&users)
    for _, u := range users {
      var posts []Post
      db.Where("user_id = ?", u.ID).Find(&posts)
      // use posts...
    }
    ```
  - Good:
    ```go
    // Eagerly load posts in a single query
    var users []User
    db.Preload("Posts").Find(&users)
    // use users[i].Posts safely
    ```

- 2) Not handling transactions across multi-step writes
  - Bad:
    ```go
    // Two separate updates without a transaction
    db.Exec("UPDATE accounts SET balance = balance - ? WHERE id = ?", amt, fromID)
    db.Exec("UPDATE accounts SET balance = balance + ? WHERE id = ?", amt, toID)
    ```
  - Good:
    ```go
    db.Transaction(func(tx *gorm.DB) error {
      if err := tx.Exec("UPDATE accounts SET balance = balance - ? WHERE id = ?", amt, fromID).Error; err != nil {
        return err
      }
      if err := tx.Exec("UPDATE accounts SET balance = balance + ? WHERE id = ?", amt, toID).Error; err != nil {
        return err
      }
      return nil
    })
    ```

- 3) Ignoring or swallowing errors
  - Bad:
    ```go
    db.Create(&user) // ignore error
    ```
  - Good:
    ```go
    if err := db.Create(&user).Error; err != nil {
      // handle error (log, retry, etc.)
    }
    ```
  
- 4) Over-reliance on AutoMigrate for complex schema changes
  - Bad:
    ```go
    db.AutoMigrate(&Post{})
    ```
  - Good: combine AutoMigrate for simple evolutions with explicit, reviewed migrations for breaking changes or data migrations.

- 5) Inconsistent primary keys or manually managing IDs
  - Bad: bypassing the ORM’s ID generation
  - Good: always rely on GORM’s ID generation and let the ORM manage primary keys to avoid conflicts.

## Y. Why This Matters In Real Systems

- Consistency and safety: ORMs give you a high-level, typed representation of data and relationships, reducing boilerplate. Migrations provide a controlled, versioned path for schema evolution, enabling safe deployments.
- Performance considerations: N+1 problems, eager loading, and well-chosen indices matter. Proper use of Preload and selective queries keeps latency predictable under load.
- Team collaboration and audits: migrations create a documented history of schema changes. PRs can review both code and migration changes, improving traceability.
- Production realities: zero-downtime deployments, schema versioning, rollbacks, and compatibility with multiple services require a deliberate migration strategy, not ad-hoc schema edits.

## Z. Study Questions

1) What is AutoMigrate in GORM, and what are its typical uses and pitfalls?  
2) How does Preload help prevent N+1 queries when loading related data?  
3) What are two practical migration strategies, and when would you choose each?  
4) Why is it important to use transactions when performing multiple related writes?  
5) How would you verify that a newly added column exists after a migration in SQLite?

## Exercise

Practical multi-part coding challenge to cement ORM and migrations concepts in Go.

Part A — Project setup and models
- Create a Go module and install GORM with the SQLite driver.
- Define two models: User and Article.
  - User fields: ID (primary key), Email (unique), Name, CreatedAt, UpdatedAt
  - Article fields: ID (primary key), UserID (foreign key), Title, Body, PublishedAt (nullable)
- Establish a database connection to a local SQLite file (e.g., app.db) and AutoMigrate both models.

Part B — CRUD operations and relations
- Create two users.
- Create several articles for these users.
- Retrieve a user and preload their articles.
- Update an article’s title.
- Delete one article and verify remaining data.

Part C — Migrations and schema evolution
- Start with the models as defined in Part A.
- Implement an explicit migration to add a new column: Article.Summary (TEXT, nullable).
  - Use a check to avoid error if the column already exists.
  - Update in-code by creating an Article instance with a Summary and ensuring existing records can have Summary as NULL.
- Run a quick verify query to confirm the new column exists and can be used.

Part D — Realistic production scenario
- Demonstrate a transactional transfer-like operation: create a new Article for a user and, in a single transaction, increment a hypothetical ArticleCount counter in a separate table (or update a related field) to illustrate transactional boundaries across multiple writes.
- Ensure proper error handling and rollback behavior if any step fails.

Expected deliverables (in your repo):
- A single main.go (or modular files under cmd/) that demonstrates all parts, with clear comments.
- A separate migrations folder containing at least one SQL-like migration (if you choose to use a dedicated tool like golang-migrate) or a Go-based explicit migration function as shown in Section 3.
- A README snippet explaining how to run the code and what output to expect.

Note: If you prefer to avoid an external migration tool for the exercise, use the explicit migration pattern shown in Section 3 and keep the code self-contained within main.go.