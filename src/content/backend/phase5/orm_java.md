# Track: Backend Engineering — Module: Phase 5 — Databases — Topic: ORM & Migrations (Java)

Object-Relational Mapping (ORM) and migrations are foundational tools for building robust backends in Java. ORM abstracts database interactions into rich domain models, while migrations provide a safe, versioned path for evolving schemas as requirements change. Together, they enable faster development, cleaner code, and safer deployments in real systems where data integrity and performance matter.

## 1. ORM Fundamentals with JPA and Hibernate

Java Persistence API (JPA) provides a standard ORM layer, with Hibernate as the most popular implementation. This section introduces basic entity modeling, persistence units, and simple CRUD through the EntityManager.

```java
// src/main/java/com/example/orm/User.java
package com.example.orm;

import javax.persistence.*;

@Entity
@Table(name = "users")
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 50)
  private String username;

  @Column(nullable = false, length = 100)
  private String password;

  @Column(nullable = true, unique = true, length = 100)
  private String email;

  // JPA requires a default constructor
  public User() {}

  public User(String username, String password, String email) {
    this.username = username;
    this.password = password;
    this.email = email;
  }

  // Getters and setters
  public Long getId() { return id; }
  public String getUsername() { return username; }
  public void setUsername(String username) { this.username = username; }
  public String getPassword() { return password; }
  public void setPassword(String password) { this.password = password; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
}
```

```xml
<!-- src/main/resources/META-INF/persistence.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<persistence xmlns="http://xmlns.jcp.org/xml/ns/persistence"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             version="2.2"
             xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/persistence http://xmlns.jcp.org/xml/ns/persistence/persistence_2_2.xsd">
  <persistence-unit name="lessonPU" transaction-type="RESOURCE_LOCAL">
    <provider>org.hibernate.jpa.HibernatePersistenceProvider</provider>

    <class>com.example.orm.User</class>

    <properties>
      <property name="javax.persistence.jdbc.url" value="jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1"/>
      <property name="javax.persistence.jdbc.user" value="sa"/>
      <property name="javax.persistence.jdbc.password" value=""/>
      <property name="hibernate.dialect" value="org.hibernate.dialect.H2Dialect"/>
      <property name="hibernate.hbm2ddl.auto" value="update"/>
      <property name="hibernate.show_sql" value="true"/>
      <property name="hibernate.format_sql" value="true"/>
    </properties>
  </persistence-unit>
</persistence>
```

```java
// src/main/java/com/example/orm/App.java
package com.example.orm;

import javax.persistence.EntityManager;
import javax.persistence.EntityManagerFactory;
import javax.persistence.Persistence;

public class App {
  public static void main(String[] args) {
    EntityManagerFactory emf = Persistence.createEntityManagerFactory("lessonPU");
    EntityManager em = emf.createEntityManager();

    em.getTransaction().begin();

    User user = new User("alice", "s3cr3t", "alice@example.com");
    em.persist(user); // insert

    em.getTransaction().commit();

    // Read back
    User found = em.find(User.class, user.getId());
    System.out.println("Created user ID: " + found.getId() + ", username: " + found.getUsername());

    em.close();
    emf.close();
  }
}
```

### Line-by-line explanation

- In User.java:
  - @Entity marks the class as a JPA entity.
  - @Table(name = "users") maps the entity to the users table.
  - @Id defines the primary key field.
  - @GeneratedValue(strategy = GenerationType.IDENTITY) lets the database auto-generate the ID.
  - @Column constraints define nullability, uniqueness, and length.
  - Default constructor is required by JPA; the other constructor is for convenience.
  - Getters/setters provide access to fields.

- In persistence.xml:
  - Defines a persistence unit named lessonPU.
  - Specifies H2 in-memory database for quick prototyping.
  - Configures Hibernate as the provider and basic Hibernate settings (dialect, show SQL, ddl-auto).

- In App.java:
  - Creates an EntityManagerFactory for the lessonPU unit.
  - Begins a transaction, persists a new User, and commits.
  - Reads back the persisted User via find to verify persistence.

## 2. Relationships and Fetch Strategies

Real-world schemas model related data. This section demonstrates a one-to-many relationship (User has many Posts) and contrasts fetch strategies (LAZY vs EAGER). It also shows a safe way to fetch related data using a join fetch to avoid N+1 problems.

```java
// src/main/java/com/example/orm/Post.java
package com.example.orm;

import javax.persistence.*;

@Entity
@Table(name = "posts")
public class Post {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 200)
  private String title;

  @Lob
  @Column(nullable = false)
  private String content;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "user_id", nullable = false)
  private User author;

  public Post() {}

  public Post(String title, String content, User author) {
    this.title = title;
    this.content = content;
    this.author = author;
  }

  public Long getId() { return id; }
  public String getTitle() { return title; }
  public void setTitle(String title) { this.title = title; }
  public String getContent() { return content; }
  public void setContent(String content) { this.content = content; }
  public User getAuthor() { return author; }
  public void setAuthor(User author) { this.author = author; }
}
```

```java
// src/main/java/com/example/orm/User.java (updated)
@Entity
@Table(name = "users")
public class User {

  // ... existing fields ...

  @OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  private java.util.List<Post> posts = new java.util.ArrayList<>();

  public java.util.List<Post> getPosts() { return posts; }
  public void addPost(Post post) {
    posts.add(post);
    post.setAuthor(this);
  }
  public void removePost(Post post) {
    posts.remove(post);
    post.setAuthor(null);
  }
}
```

```java
// Example usage to avoid N+1 (join fetch)
import javax.persistence.TypedQuery;

// inside a transaction
TypedQuery<User> q = em.createQuery(
  "SELECT u FROM User u LEFT JOIN FETCH u.posts WHERE u.id = :id", User.class);
q.setParameter("id", 1L);
User userWithPosts = q.getSingleResult();
```

### Line-by-line explanation

- Post.java:
  - @Entity and @Table map the Post entity to posts.
  - id is the primary key with auto-increment.
  - title and content store post data; content uses @Lob for larger text.
  - @ManyToOne with FetchType.LAZY defines a many-to-one relationship to User, loaded lazily.
  - @JoinColumn links the posts.user_id column to users.id.
  - Constructors, getters, and setters follow.

- User.java (updated):
  - @OneToMany maps the collection of posts to the author field in Post.
  - cascade = ALL ensures child posts follow parent lifecycle (persist, remove, etc.).
  - orphanRemoval = true ensures posts removed from the list get deleted.
  - fetch = LAZY prevents loading all posts with the user unless explicitly accessed.
  - addPost/removePost manage both sides of the relationship.

- Join fetch example:
  - Using LEFT JOIN FETCH in the JPQL query fetches the user and their posts in a single query, avoiding the N+1 problem when accessing user.getPosts() outside a lazy session.

## 3. Migrations with Flyway: Schema Evolution Safely

Migrations are the reliable way to evolve a database schema over time. This section covers both SQL-based migrations via Flyway and a Java-based migration example. It also includes a minimal configuration for integrating Flyway into a Java project (or a Maven/Gradle setup).

```sql
-- src/main/resources/db/migration/V1__schema.sql
CREATE TABLE users (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE
);

CREATE TABLE posts (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content CLOB,
  user_id BIGINT NOT NULL,
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

```sql
-- src/main/resources/db/migration/V2__add_last_login.sql
ALTER TABLE users ADD COLUMN last_login TIMESTAMP;
```

```sql
-- src/main/resources/db/migration/V3__create_indexes.sql
CREATE INDEX idx_users_username ON users (username);
CREATE INDEX idx_posts_user ON posts (user_id);
```

```java
// Optional: Java-based Flyway migration (for more complex upgrades)
package db.migration;

import org.flywaydb.core.api.migration.BaseJavaMigration;
import org.flywaydb.core.api.migration.Context;
import java.sql.Statement;

public class V4__Add_email_verified extends BaseJavaMigration {
  @Override
  public void migrate(Context context) throws Exception {
    try (Statement stmt = context.getConnection().createStatement()) {
      stmt.execute("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE");
    }
  }
}
```

```java
// src/main/java/com/example/orm/FlywayConfig.java
package com.example.orm;

import org.flywaydb.core.Flyway;

public class FlywayConfig {
  public static void migrate() {
    Flyway flyway = Flyway.configure()
      .dataSource("jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1", "sa", "")
      .locations("classpath:db/migration")
      .load();
    flyway.migrate();
  }
}
```

```xml
<!-- Example Maven plugin configuration (pom.xml) -->
<build>
  <plugins>
    <plugin>
      <groupId>org.flywaydb</groupId>
      <artifactId>flyway-maven-plugin</artifactId>
      <version>9.16.0</version>
      <configuration>
        <url>jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1</url>
        <user>sa</user>
        <password></password>
        <locations>classpath:db/migration</locations>
      </configuration>
    </plugin>
  </plugins>
</build>
```

### Line-by-line explanation

- V1__schema.sql, V2__add_last_login.sql, V3__create_indexes.sql:
  - Each file is a distinct migration. Flyway tracks which migrations have been applied via a schema history table (flyway_schema_history).
  - V1 creates the initial schema; V2 and V3 apply incremental changes without altering previous migrations.

- V4__Add_email_verified.java:
  - Java-based migration that enables complex upgrades that are hard to express in SQL alone.
  - The migrate method executes the SQL to alter the users table, adding a new column.

- FlywayConfig.java:
  - Sets up Flyway with a data source and migration location, then runs migrate() to apply pending migrations.

- pom.xml snippet:
  - Integrates Flyway as a Maven plugin so migrations run during build or via mvn flyway:migrate.

## 4. Practical Patterns: Repositories, Transactions, Auditing

Production-grade data access uses repositories, explicit transaction boundaries, and auditing. This section provides a simple repository pattern with manual transaction management and an auditable base.

```java
// src/main/java/com/example/orm/repo/UserRepository.java
package com.example.orm.repo;

import com.example.orm.User;
import java.util.List;
import java.util.Optional;

public interface UserRepository {
  User save(User user);
  Optional<User> findById(Long id);
  List<User> findAll();
  void delete(User user);
}
```

```java
// src/main/java/com/example/orm/repo/JpaUserRepository.java
package com.example.orm.repo;

import com.example.orm.User;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import java.util.List;
import java.util.Optional;

public class JpaUserRepository implements UserRepository {
  private final EntityManager em;

  public JpaUserRepository(EntityManager em) {
    this.em = em;
  }

  @Override
  public User save(User user) {
    if (user.getId() == null) {
      em.persist(user);
      return user;
    } else {
      return em.merge(user);
    }
  }

  @Override
  public Optional<User> findById(Long id) {
    return Optional.ofNullable(em.find(User.class, id));
  }

  @Override
  public List<User> findAll() {
    TypedQuery<User> q = em.createQuery("SELECT u FROM User u", User.class);
    return q.getResultList();
  }

  @Override
  public void delete(User user) {
    em.remove(em.contains(user) ? user : em.merge(user));
  }
}
```

```java
// src/main/java/com/example/orm/AuditEntity.java
package com.example.orm;

import javax.persistence.*;
import java.time.LocalDateTime;

@MappedSuperclass
public abstract class AuditEntity {

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  protected void onCreate() {
    LocalDateTime now = LocalDateTime.now();
    this.createdAt = now;
    this.updatedAt = now;
  }

  @PreUpdate
  protected void onUpdate() {
    this.updatedAt = LocalDateTime.now();
  }

  public LocalDateTime getCreatedAt() { return createdAt; }
  public LocalDateTime getUpdatedAt() { return updatedAt; }
}
```

```java
// src/main/java/com/example/orm/User.java (extended auditing)
package com.example.orm;

import javax.persistence.*;
import java.util.List;

@Entity
@Table(name = "users")
public class User extends AuditEntity {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 50)
  private String username;

  @Column(nullable = false, length = 100)
  private String password;

  @Column(unique = true, length = 100)
  private String email;

  @OneToMany(mappedBy = "author", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
  private List<Post> posts;

  public User() {}

  public User(String username, String password, String email) {
    this.username = username;
    this.password = password;
    this.email = email;
  }

  public Long getId() { return id; }
  public String getUsername() { return username; }
  public void setUsername(String username) { this.username = username; }
  public String getPassword() { return password; }
  public void setPassword(String password) { this.password = password; }
  public String getEmail() { return email; }
  public void setEmail(String email) { this.email = email; }
  public List<Post> getPosts() { return posts; }
}
```

```java
// Example usage with transaction boundary
EntityManager em = emf.createEntityManager();
em.getTransaction().begin();
try {
  User user = new User("bob", "p4ss", "bob@example.com");
  JpaUserRepository repo = new JpaUserRepository(em);
  repo.save(user);
  em.getTransaction().commit();
} catch (Exception ex) {
  em.getTransaction().rollback();
  throw ex;
} finally {
  em.close();
}
```

### Line-by-line explanation

- User and Post in the repository section:
  - UserRepository defines a generic contract for CRUD operations.
  - JpaUserRepository implements data access via EntityManager, using standard JPA patterns:
    - save uses persist for new entities and merge for updates.
    - findById returns Optional to signal missing data safely.
    - findAll uses JPQL to fetch all users.
    - delete removes an entity, merging it if detached.

- AuditEntity and updated User:
  - AuditEntity is a base class with created_at and updated_at timestamps.
  - @PrePersist and @PreUpdate ensure timestamps are set automatically on insert/update.
  - User extends AuditEntity to inherit auditing behavior.

- Transaction example:
  - Demonstrates explicit transaction management with begin, commit, rollback, and proper cleanup.

## X. Common Beginner Mistakes

- Pitfall 1: N+1 problem with lazy loading
  - Bad:
    ```java
    // Within a transaction, loading a user then iterating posts lazily
    User user = em.find(User.class, 1L);
    for (Post p : user.getPosts()) {
      System.out.println(p.getTitle());
    }
    ```
  - Good:
    ```java
    // Fetch user with posts in one query
    TypedQuery<User> q = em.createQuery(
      "SELECT u FROM User u LEFT JOIN FETCH u.posts WHERE u.id = :id", User.class);
    q.setParameter("id", 1L);
    User user = q.getSingleResult();
    for (Post p : user.getPosts()) {
      System.out.println(p.getTitle());
    }
    ```
- Pitfall 2: Not wrapping persistence operations in a transaction
  - Bad:
    ```java
    User u = new User("charlie", "pwd", "charlie@example.com");
    em.persist(u); // Risky: no active transaction
    ```
  - Good:
    ```java
    em.getTransaction().begin();
    em.persist(u);
    em.getTransaction().commit();
    ```
- Pitfall 3: Mixing managed and detached instances carelessly
  - Bad:
    ```java
    User u = new User("dana", "pwd", "dana@example.com");
    em.persist(u);
    em.detach(u);
    u.setEmail("dana@new.example"); // changes lost if not merged
    em.merge(u);
    ```
  - Good:
    ```java
    em.getTransaction().begin();
    User u = new User("dana", "pwd", "dana@example.com");
    em.persist(u);
    em.flush(); // ensure ID assigned
    u.setEmail("dana@new.example");
    em.merge(u);
    em.getTransaction().commit();
    ```
- Pitfall 4: Overusing cascade REMOVE unintentionally deleting related data
  - Bad:
    ```java
    @OneToMany(mappedBy = "author", cascade = CascadeType.REMOVE)
    private List<Post> posts;
    ```
  - Good:
    ```java
    @OneToMany(mappedBy = "author", cascade = { CascadeType.PERSIST, CascadeType.MERGE }, orphanRemoval = true)
    private List<Post> posts;
    ```
- Pitfall 5: Bypassing ORM for raw SQL in application logic
  - Bad:
    ```java
    // Direct JDBC usage scattered in service logic
    Statement st = conn.createStatement();
    st.executeUpdate("UPDATE users SET email = 'new@example.com' WHERE id = " + id);
    ```
  - Good:
    ```java
    User u = em.find(User.class, id);
    em.getTransaction().begin();
    u.setEmail("new@example.com");
    em.merge(u);
    em.getTransaction().commit();
    ```

## Y. Why This Matters In Real Systems

- Data integrity and migrations: Phase-5 practices ensure schema evolution is versioned, auditable, and reversible.
- Team velocity: ORM reduces boilerplate, enabling engineers to model domain concepts directly in code.
- Performance considerations: Lazy loading, fetch strategies, and proper indexing prevent costly queries and scaling bottlenecks.
- Safe deployments: Migrations built with Flyway/Liquibase provide repeatable, auditable deployments across environments.
- Observability: When combined with auditing, you get an immutable history of data changes.

## Z. Study Questions

1. What is the difference between FetchType.LAZY and FetchType.EAGER, and when would you choose each?
2. How does Hibernate handle bidirectional relationships, and what are common pitfalls with cascading?
3. What is a Flyway migration, and how do you apply versioned migrations to evolve a schema safely?
4. What is an N+1 query problem, and how can it be mitigated using join fetch or EntityGraph?
5. How would you implement a simple auditing scheme to automatically record created_at and updated_at timestamps?

## Exercise

Part A — Set up a minimal project with ORM and migrations

1) Create a Java project (Maven or Gradle) and add dependencies for:
   - javax.persistence and a JPA provider (Hibernate)
   - H2 or another in-memory database for testing
   - Flyway for migrations (or rely on Maven plugin)

2) Implement entities:
   - User (id, username, password, email)
   - Post (id, title, content, user_id FK to User)

3) Configure a persistence unit (persistence.xml) using an in-memory database (H2) and Hibernate, with hbm2ddl.auto set to update.

4) Implement a simple App class that:
   - Creates a User
   - Creates a few Posts associated with that User
   - Queries the User with posts using a join fetch

5) Add Flyway migrations:
   - V1__schema.sql to create users and posts tables
   - V2__add_last_login.sql to add last_login column to users
   - V3__create_indexes.sql to create helpful indexes

6) Optionally add a Java-based migration (V4__) to add an additional column and demonstrate Java migrations.

Part B — Implement a small Repository and auditing

1) Create a UserRepository interface and a JpaUserRepository implementation (as shown in Section 4).

2) Add an Auditable base class and update User to extend the base for created_at and updated_at timestamps.

3) Demonstrate a transactional create and update flow with proper error handling.

Deliverables:
- A runnable Java project (with a main class) that demonstrates ORM basics, relationships, and migrations.
- A quick-start README or docstring inside the project detailing how to run migrations, start the application, and observe outputs (e.g., SQL logs).

Notes:
- The code provided in this lesson uses a simple in-memory database for clarity. In real deployments, switch to a robust RDBMS (PostgreSQL/MySQL/etc.) and configure data sources accordingly.
- When using ORMs in production, consider tuning fetch strategies, batch sizes, second-level caches, and connection pool settings for performance and stability.