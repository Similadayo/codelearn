# Backend Engineering — Phase 5: Databases — ORM & Migrations (Python)

ORMs let you work with database data as native objects, reducing boilerplate and aligning your data model with your domain. Migrations provide a controlled, versioned path for evolving schemas without breaking live systems. Together, ORMs and migrations are essential for scalable, maintainable backends in production.

## 1. ORM Fundamentals and the Role of Migrations
Understanding how an ORM maps Python classes to database tables, and why migrations are needed to evolve that schema over time, is foundational for real-world systems. This section introduces the concepts with minimal runnable context to illustrate the mapping.

```python
# Conceptual ORM mapping (SQLAlchemy-like)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String(50))
```

### Line-by-line explanation
- from sqlalchemy.ext.declarative import declarative_base: Import the helper to create a base class for ORM models.
- from sqlalchemy import Column, Integer, String: Import column types used to describe table columns.
- Base = declarative_base(): Create a base class that all ORM models inherit from.
- class User(Base): Define a Python class that maps to the users table.
- __tablename__ = 'users': The database table name.
- id = Column(Integer, primary_key=True): Primary key column definition.
- name = Column(String(50)): A varchar-like column for the user name.

Discussion: Migrations are required whenever you change the schema (add columns, rename tables, modify constraints). Without migrations, rolling out schema changes across environments (dev -> staging -> prod) becomes brittle and error-prone.

## 2. Setting Up SQLAlchemy: Engine, Session, and Declarative Base
This section shows the core pieces you’ll use to connect to a database, define models, and manage sessions. We’ll use SQLite for simplicity and keep the example self-contained.

```python
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Declarative base for models
Base = declarative_base()

# Engine connects to the database
engine = create_engine('sqlite:///example.db', echo=True)

# Session factory bound to the engine
Session = sessionmaker(bind=engine)
```

### Line-by-line explanation
- from sqlalchemy.ext.declarative import declarative_base: Bring in the base class factory for ORM models.
- from sqlalchemy import create_engine: Import function to create a database engine/connection.
- from sqlalchemy.orm import sessionmaker: Import a factory for creating Session instances.
- Base = declarative_base(): Create a base class for all models (shared metadata).
- engine = create_engine('sqlite:///example.db', echo=True): Create a SQLite database file named example.db; echo=True logs SQL emitted for debugging.
- Session = sessionmaker(bind=engine): Create a factory to generate Session objects bound to the engine.

Notes:
- Replace 'sqlite:///example.db' with your production database URL (e.g., PostgreSQL) in real apps.
- In multi-threaded web apps, you typically create a scoped_session or per-request session.

## 3. Defining Models and Relationships
Defining models with relationships (one-to-many, many-to-many) is central to representing domain concepts. This example adds User and Post with a one-to-many relationship.

```python
from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

# Reuse Base and engine from previous section
# Base = declarative_base()
# engine = create_engine(...)

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String(50))

    # One-to-many: a user has many posts
    posts = relationship('Post', back_populates='author', cascade='all, delete-orphan')

class Post(Base):
    __tablename__ = 'posts'
    id = Column(Integer, primary_key=True)
    title = Column(String(100))
    content = Column(String)

    user_id = Column(Integer, ForeignKey('users.id'))
    author = relationship('User', back_populates='posts')

# Create tables
Base.metadata.create_all(engine)
```

### Line-by-line explanation
- from sqlalchemy import Column, Integer, String, ForeignKey: Import column types and foreign key support.
- from sqlalchemy.orm import relationship: Import relationship helper to link ORM classes.
- class User(Base): Define the users table as an ORM model.
- __tablename__ = 'users': Table name for users.
- id = Column(Integer, primary_key=True): Primary key column.
- name = Column(String(50)): Name column.
- posts = relationship('Post', back_populates='author', cascade='all, delete-orphan'): Define a collection of Post objects; enables users.posts to access related posts. cascade ensures related posts are deleted with the user.
- class Post(Base): Define the posts table as an ORM model.
- __tablename__ = 'posts': Table name for posts.
- id = Column(Integer, primary_key=True): Primary key.
- title = Column(String(100)): Title column.
- content = Column(String): Content column.
- user_id = Column(Integer, ForeignKey('users.id')): Foreign key to users.id.
- author = relationship('User', back_populates='posts'): Link back to the user.
- Base.metadata.create_all(engine): Create all tables in the database (if not exist).

Notes:
- The one-to-many pattern uses a ForeignKey on the child and a corresponding relationship on both sides.
- The cascade option helps manage child objects automatically on delete.

## 4. CRUD with ORM: Create, Read, Update, Delete
This section demonstrates how to perform basic CRUD operations with a session. It includes session lifecycle patterns and prints results to verify behavior.

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Reuse existing models and engine
# engine = create_engine(...)
# Session = sessionmaker(bind=engine)
# from models import User, Post

with Session() as session:
    # Create
    alice = User(name='Alice')
    session.add(alice)
    session.commit()  # persists Alice to the DB

    # Create a related Post
    post = Post(title='Hello ORM', content='Using SQLAlchemy ORM', author=alice)
    session.add(post)
    session.commit()

    # Read (eagerly or lazily)
    user = session.query(User).filter_by(name='Alice').first()
    print(f'User: {user.name}')
    print('Posts:', [p.title for p in user.posts])

    # Update
    user.name = 'Alice Smith'
    session.commit()

    # Delete
    session.delete(user)
    session.commit()
```

### Line-by-line explanation
- from sqlalchemy import create_engine: Import engine factory (not strictly needed if reusing from above; shown for clarity).
- from sqlalchemy.orm import sessionmaker: Import session factory.
- with Session() as session:: Create a new Session instance using a context manager to ensure proper cleanup.
- alice = User(name='Alice'): Instantiate a User object.
- session.add(alice): Stage the new user for insertion.
- session.commit(): Persist the insert to the database.
- post = Post(title='Hello ORM', content='Using SQLAlchemy ORM', author=alice): Create a Post and associate it with Alice via the relationship.
- session.add(post): Stage the post for insertion.
- session.commit(): Persist the post to the database.
- user = session.query(User).filter_by(name='Alice').first(): Query for the user by name.
- print(f'User: {user.name}'): Output the user's name.
- print('Posts:', [p.title for p in user.posts]): Show titles of related posts.
- user.name = 'Alice Smith': Update the user's name in memory.
- session.commit(): Persist the update.
- session.delete(user): Mark the user for deletion; due to cascade, related posts may be deleted as well.
- session.commit(): Persist the deletion.

Notes:
- The with statement ensures the session is closed even if an error occurs.
- Depending on your app, you may use per-request sessions (e.g., in web frameworks) rather than a single long-lived session.

## 5. Migrations with Alembic: Schema Evolution
Migrations capture schema changes in a versioned, repeatable way. Alembic is a common tool used with SQLAlchemy. This section shows a minimal migration script that adds a new column to a table, along with a downgrade.

```python
# versions/20240601_add_email.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    # Add a new nullable email column to users
    op.add_column('users', sa.Column('email', sa.String(length=255), nullable=True))
    # Optional: enforce uniqueness if desired
    op.create_unique_constraint('uq_users_email', 'users', ['email'])

def downgrade():
    # Remove the unique constraint first, then drop the column
    op.drop_constraint('uq_users_email', 'users', type_='unique')
    op.drop_column('users', 'email')
```

### Line-by-line explanation
- # versions/20240601_add_email.py: Comment line indicating file path and purpose.
- from alembic import op: Import Alembic operations helpers.
- import sqlalchemy as sa: Import SQLAlchemy types for schema definitions.
- def upgrade(): Begin the upgrade path.
- op.add_column('users', sa.Column('email', sa.String(length=255), nullable=True)): Add a new column named email to the users table; nullable=True allows existing rows to remain valid.
- op.create_unique_constraint('uq_users_email', 'users', ['email']): Create a unique constraint to ensure emails are unique (optional but common).
- def downgrade(): Begin the downgrade path (rollback).
- op.drop_constraint('uq_users_email', 'users', type_='unique'): Remove the unique constraint.
- op.drop_column('users', 'email'): Remove the email column.

Notes:
- Alembic autogeneration can help detect changes, but manual migrations like this are common for data migrations or complex changes.
- In production, you often run migrations in a controlled, zero-downtime manner (e.g., add column nullable first, backfill data, then alter constraints).

## 6. Performance and Best Practices: Avoiding Pitfalls
This section highlights common performance concerns and best practices when using an ORM in production, including loading strategies and session management.

```python
from sqlalchemy.orm import joinedload

# Avoid N+1: eager-load related posts when querying users
with Session() as session:
    users = session.query(User).options(joinedload(User.posts)).all()
    for u in users:
        print(u.name, [p.title for p in u.posts])
```

### Line-by-line explanation
- from sqlalchemy.orm import joinedload: Import the loading strategy helper to eagerly fetch relationships.
- with Session() as session:: Start a scoped session for the block.
- users = session.query(User).options(joinedload(User.posts)).all(): Query all users and eagerly load their posts in a single query.
- for u in users: Iterate users.
- print(u.name, [p.title for p in u.posts]): Print each user’s name and their post titles.

Notes:
- joinedload() reduces the N+1 problem by loading related data in one query.
- Other strategies include selectinload() and subqueryload(), depending on use case and data size.

## X. Common Beginner Mistakes
3+ real pitfalls with bad vs good code side-by-side.

- Pitfall 1: Skipping migrations and altering schema directly in production
  Bad:
  - Manually running SQL ALTER statements in production without versioning.
  - Relying on ad-hoc scripts or app startup time to modify tables.
  Good:
  - Use Alembic migrations with a proper upgrade/downgrade path.

Bad:
```sql
-- production script (manual)
ALTER TABLE users ADD COLUMN email VARCHAR(255);
```

Good:
```python
# Alembic migration: 20240601_add_email.py
from alembic import op
import sqlalchemy as sa

def upgrade():
    op.add_column('users', sa.Column('email', sa.String(length=255), nullable=True))

def downgrade():
    op.drop_column('users', 'email')
```

- Pitfall 2: N+1 queries due to lazy loading of relationships
  Bad:
```python
with Session() as session:
    users = session.query(User).all()
    for u in users:
        print(u.name, u.posts[0].title)  # triggers a query for each user
```

Good:
```python
with Session() as session:
    users = session.query(User).options(joinedload(User.posts)).all()
    for u in users:
        print(u.name, [p.title for p in u.posts])
```

- Pitfall 3: Not closing sessions or using poor session scope
  Bad:
```python
session = Session()
# long-lived session across requests or threads
```

Good:
```python
with Session() as session:
    # do work per-request or per-operation
    user = session.query(User).first()
    print(user.name)
```

- Pitfall 4: Mixing ORM models with raw SQL hacks in production
  Bad:
```python
# Inline raw SQL sprinkled across codebase
conn.execute("UPDATE users SET name = 'Alice' WHERE id = 1")
```

Good:
```python
# Use ORM for normal operations; use migrations cautiously for schema changes
# For data migrations, use a dedicated migration script or a data migration step
```

## Y. Why This Matters In Real Systems
In production, ORM + migrations underpin the ability to evolve features without breaking customer experiences. Key considerations:

- Safe schema evolution: Migrations provide a formal path to change schemas with versioning, backups, and rollback capabilities.
- Data integrity and migrations: Data migrations (e.g., populating new columns, normalizing data, backfilling historical records) require careful testing and versioned scripts.
- Performance in production: Avoid N+1 queries by selecting fetch strategies appropriate to the workload; use indexing and query optimization patterns.
- Deployment strategies: Run migrations as part of deployment pipelines, ensuring the database state matches the application code expectations.
- Testing and previews: Use dedicated staging environments with realistic data and run migration tests to validate rollback scenarios.

## Z. Study Questions
1) What is the primary purpose of an ORM, and how do migrations complement it?
2) In SQLAlchemy, what is the purpose of a declarative Base and how do you declare a one-to-many relationship?
3) How does the joinedload loading strategy help solve the N+1 problem?
4) What are the basic components of an Alembic migration script?
5) Why is per-request session management important in web applications using an ORM?

## Exercise
A practical multi-part coding challenge to reinforce ORM + migrations concepts.

Part A — Build models and basic CRUD
- Create a small SQLite database using SQLAlchemy.
- Define models for User and Article with a one-to-many relationship (User has many Articles).
- Create the tables, insert sample data (2 users, each with 1–2 articles).
- Query all users and print their articles.

Part B — Introduce a migration to add a new field
- Using Alembic, write a migration to add a new column published_at (DateTime) to the Article table.
- Ensure the downgrade drops the column.

Part C — Data migration
- Write a data migration that sets published_at to the current timestamp for any articles that have a NULL published_at value after the schema change.

Part D — Verified queries with eager loading
- Write a query that fetches all users and their articles in a single round trip, using an eager loading strategy.
- Print users with their article titles.

Part E — Small extension
- Add a tags many-to-many relationship for Article (tags table and article_tags association table).
- Seed two tags and link each article to one or more tags.
- Query to print each user with their articles and associated tag names.

What you should submit
- A single repo (or code snippets) containing:
  - models.py with User, Article (and Tags if you include Part E)
  - main.py that runs the CRUD and querying portions (Part A and Part D)
  - A migrations/ directory containing Alembic migration scripts for Part B and Part C
  - A README with quick-start instructions to reproduce the exercise locally (including how to install dependencies, run migrations, and run the Python scripts)

Hints
- Keep the code self-contained using SQLite for simplicity.
- Use a per-operation session with context managers (with Session() as session:) for reliability.
- Test migrations in a staging-like environment before applying in production.

End of lesson.