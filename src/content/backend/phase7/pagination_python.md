# Phase 7: Advanced API Features — Pagination, Filtering & Sorting APIs (Python)

In modern backend systems, APIs rarely return entire datasets in a single response. Clients expect paginated results, the ability to filter down to relevant records, and the ability to sort data to match UI or business requirements. Getting pagination, filtering, and sorting right is essential for performance, scalability, and a good developer experience for clients. In Python, FastAPI paired with SQLAlchemy (or Django ORM) provides clear, testable patterns to implement these features, with attention to security (validation), performance (indexes, query planning), and observability (metrics, error handling). This lesson walks you through practical patterns, with concrete, runnable examples you can adapt to real systems.

## 1. Pagination fundamentals: limit/offset

Pagination fundamentals revolve around two knobs: how many results to return (limit) and where to start (offset). This pattern is widely supported and easy to reason about, but it can become inefficient for very large datasets unless backed by proper indexing and a reasonable page size. We’ll implement a simple FastAPI endpoint that uses limit/offset with SQLAlchemy.

```python
# pagination_limit_offset.py
from typing import List
from fastapi import FastAPI, Depends, Query
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base, Session

DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=True)

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool

    class Config:
        orm_mode = True

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create tables (for demonstration)
Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/users", response_model=list[UserOut])
def read_users(limit: int = Query(20, le=100), offset: int = 0, db: Session = Depends(get_db)):
    users = db.query(User).offset(offset).limit(limit).all()
    return users
```

### Line-by-line explanation
- Import statements bring in FastAPI, SQLAlchemy, and Pydantic helpers for the API and models.
- DATABASE_URL defines the SQLite database path used during development.
- engine, SessionLocal, and Base set up SQLAlchemy’s engine, session factory, and declarative base.
- User defines a simple users table with id, name, email, and is_active fields.
- UserOut is a Pydantic schema mirroring User; orm_mode allows automatic conversion from SQLAlchemy models.
- get_db provides a per-request database session.
- Base.metadata.create_all creates the tables if they don’t exist.
- The FastAPI app exposes a /users endpoint that accepts limit and offset query params, queries the DB with offset/limit, and returns the results as a list of UserOut objects.

## 2. Cursor-based pagination for stable navigation

Cursor-based pagination uses a stable pointer (the cursor) to fetch the next page, often based on a monotonically increasing key like id or created_at. This approach avoids the drift issues of offset-based pagination on large datasets and can perform better for infinite scrolling scenarios. Here’s a self-contained example for a “posts” resource.

```python
# pagination_cursor.py
from typing import List, Optional
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy import desc
from datetime import datetime

DATABASE_URL = "sqlite:///./test_cursor.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Post(Base):
    __tablename__ = "posts"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    content = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

class PostOut(BaseModel):
    id: int
    title: str
    content: str
    created_at: datetime

    class Config:
        orm_mode = True

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/posts", response_model=list[PostOut])
def read_posts(limit: int = 20, after: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Post).order_by(Post.id)
    if after is not None:
        q = q.filter(Post.id > after)
    return q.limit(limit).all()
```

### Line-by-line explanation
- Post model defines a simple posts table with id, title, content, and created_at.
- PostOut is the Pydantic response schema with orm_mode enabled.
- The /posts endpoint uses an optional after cursor. If provided, it fetches posts with id greater than the cursor, ordered by id, and limited to the requested page size.
- The cursor (after) acts as the pointer to the last seen item in the previous page, enabling stable navigation as the dataset changes.

## 3. Filtering: narrowing results by fields

Filtering lets clients request only records matching criteria, like active users or posts containing a keyword. Proper filtering should be parameter-driven and safe against injection by leveraging ORM query builders. Here’s an example that extends the user model with a couple of filters.

```python
# filtering.py
from typing import List, Optional
from fastapi import FastAPI, Depends
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean
from sqlalchemy.orm import sessionmaker, declarative_base, Session

DATABASE_URL = "sqlite:///./test_filter.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    email = Column(String, unique=True)
    is_active = Column(Boolean, default=True)

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool

    class Config:
        orm_mode = True

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/users/filter", response_model=List[UserOut])
def filter_users(
    name_contains: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if name_contains:
        query = query.filter(User.name.contains(name_contains))
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    return query.all()
```

### Line-by-line explanation
- name_contains is an optional substring filter on the name column; is_active filters by boolean state.
- The query starts with all users, then conditionally adds filters only when corresponding parameters are provided.
- This pattern scales well: you can add more filters without constructing manual SQL strings.
- The endpoint returns a list of UserOut objects derived from ORM models.

## 4. Sorting: control result order deterministically

Sorting determines the order of returned pages. It’s critical to validate sort fields to prevent arbitrary expressions from being injected via user input. The following example demonstrates safe, controlled sorting.

```python
# sorting.py
from typing import List
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean, desc
from sqlalchemy.orm import sessionmaker, declarative_base, Session

DATABASE_URL = "sqlite:///./test_sort.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=True)

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool

    class Config:
        orm_mode = True

ALLOWED_SORT_FIELDS = {
    "id": User.id,
    "name": User.name,
    "email": User.email,
    "is_active": User.is_active,
}

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

Base.metadata.create_all(bind=engine)

from fastapi import FastAPI

app = FastAPI()

@app.get("/users/sorted", response_model=List[UserOut])
def sorted_users(
    limit: int = 20,
    sort_by: str = "id",
    sort_dir: str = "asc",
    db: Session = Depends(get_db)
):
    if sort_by not in ALLOWED_SORT_FIELDS:
        raise HTTPException(status_code=400, detail="Invalid sort field")
    order_col = ALLOWED_SORT_FIELDS[sort_by]
    order = desc(order_col) if sort_dir.lower() == "desc" else order_col
    return db.query(User).order_by(order).limit(limit).all()
```

### Line-by-line explanation
- ALLOWED_SORT_FIELDS maps a string name to the actual SQLAlchemy column; this constrains allowed sort keys.
- The endpoint validates sort_by against the allowed set to prevent injection and invalid fields.
- sort_dir controls ascending vs descending order; desc is used for descending order when requested.
- The query orders by the chosen column and applies a limit to the page size.

## 5. Combined pagination, filtering & sorting: a practical endpoint

Real APIs often need all three features together. The pattern is to compose predicates, a deterministic order, and then apply pagination.

```python
# combined.py
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean, desc
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from sqlalchemy.orm import joinedload

DATABASE_URL = "sqlite:///./test_combined.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    is_active = Column(Boolean, default=True)

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    is_active: bool

    class Config:
        orm_mode = True

ALLOWED_SORT_FIELDS = {
    "id": User.id,
    "name": User.name,
    "email": User.email,
    "is_active": User.is_active,
}

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

Base.metadata.create_all(bind=engine)

from fastapi import FastAPI

app = FastAPI()

@app.get("/users/advanced", response_model=List[UserOut])
def advanced_users(
    limit: int = 20,
    offset: int = 0,
    sort_by: str = "id",
    sort_dir: str = "asc",
    name_contains: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    if sort_by not in ALLOWED_SORT_FIELDS:
        raise HTTPException(status_code=400, detail="Invalid sort field")

    query = db.query(User)

    if name_contains:
        query = query.filter(User.name.contains(name_contains))
    if is_active is not None:
        query = query.filter(User.is_active == is_active)

    order_col = ALLOWED_SORT_FIELDS[sort_by]
    query = query.order_by(desc(order_col) if sort_dir == "desc" else order_col)

    return query.offset(offset).limit(limit).all()
```

### Line-by-line explanation
- Combines all three features by validating sort fields, applying filters if provided, ordering deterministically, and then paginating with offset/limit.
- The composition approach scales: add more filters or a different sort key by updating the allowed maps and predicate sections.

## X. Common Beginner Mistakes

- 1) Bad: Unsafe dynamic sorting without validation
  - BAD:
    ```python
    # BAD: directly using user input to build an order_by clause
    def list_users(sort_by: str, db: Session = Depends(get_db)):
        return db.query(User).order_by(getattr(User, sort_by)).all()
    ```
  - GOOD:
    ```python
    ALLOWED_SORT_FIELDS = {"id": User.id, "name": User.name, "email": User.email, "is_active": User.is_active}
    def list_users(sort_by: str, db: Session = Depends(get_db)):
        if sort_by not in ALLOWED_SORT_FIELDS:
            raise HTTPException(400, "Invalid sort field")
        return db.query(User).order_by(ALLOWED_SORT_FIELDS[sort_by]).all()
    ```

- 2) Bad: Offset pagination on large datasets without a stable order
  - BAD:
    ```python
    def get_page(limit: int, page: int, db: Session = Depends(get_db)):
        return db.query(Item).offset(page * limit).limit(limit).all()
    ```
  - GOOD:
    ```python
    def get_page(limit: int, page: int, db: Session = Depends(get_db)):
        if page < 1:
            raise HTTPException(400, "Page must be >= 1")
        offset = (page - 1) * limit
        return db.query(Item).order_by(Item.id).offset(offset).limit(limit).all()
    ```
  - Rationale: ensure deterministic ordering (ORDER BY) and logical page indexing.

- 3) Bad: N+1 queries when filtering across relationships
  - BAD:
    ```python
    users = db.query(User).all()  # loads users
    for u in users:
        # lazy loads each user’s posts
        _ = [p.title for p in u.posts]
    ```
  - GOOD:
    ```python
    users = db.query(User).options(joinedload(User.posts)).all()
    for u in users:
        _ = [p.title for p in u.posts]  # no additional queries
    ```
  - Rationale: eager loading reduces round-trips and improves latency.

- 4) Bad: Returning total counts without consistent filtering
  - BAD:
    ```python
    def list_users(limit: int, db: Session = Depends(get_db)):
        total = db.query(User).count()  # global total, not page-specific
        items = db.query(User).limit(limit).all()
        return {"total": total, "items": items}
    ```
  - GOOD:
    ```python
    def list_users(limit: int, page: int, db: Session = Depends(get_db)):
        offset = (page - 1) * limit
        total = db.query(func.count(User.id)).scalar()
        items = db.query(User).offset(offset).limit(limit).all()
        return {"total": total, "items": items}
    ```
  - Rationale: clients should receive page-relevant totals, filtered consistently with the data.

## Y. Why This Matters In Real Systems

- UX and performance: Pagination reduces payload sizes and speeds up initial page loads, especially for dashboards and lists with thousands or millions of records.
- Determinism and consistency: Sorting by a stable key ensures pages don’t skip or duplicate records as data changes between requests.
- Scalability: Cursor-based pagination scales better for real-time apps and feeds; offset pagination can degrade with large offsets.
- Filterability and composability: Clients often need to filter and sort in combination with pagination; API surfaces should support clean, validated query parameters.
- Security and reliability: Validate filter and sort inputs to prevent SQL injection and ensure predictable query plans; guard against misuse with sane defaults and maximums.

## Z. Study Questions

1. What is the difference between limit/offset pagination and cursor-based pagination? Which scenarios favor each approach?
2. How would you validate a sort_by parameter to prevent unsafe queries?
3. Why is deterministic ordering important for pagination, and how can you enforce it in SQL queries?
4. How can you avoid the N+1 query problem when filtering on related data?
5. Describe how you would design an API endpoint that supports pagination, filtering, and sorting in a single, ergonomic URL surface.

## Exercise

Goal: Build a small FastAPI app that exposes a single resource with pagination, filtering, and sorting, backed by SQLite via SQLAlchemy. Then extend with a cursor-based pagination example.

Part A — Setup and basic pagination
- Create a FastAPI app with a SQLite database.
- Define a simple Product model with fields: id (int), name (str), category (str), price (float), in_stock (bool), created_at (datetime).
- Implement /products endpoint using limit and offset (default limit 20, max 100).
- Return a response structure that includes the list of products and a total count of records (optional for page UI).

Part B — Filtering and sorting
- Extend /products to accept:
  - category: Optional[str]
  - min_price: Optional[float]
  - max_price: Optional[float]
  - in_stock: Optional[bool]
  - sort_by: Optional[str] with allowed fields id, name, price, created_at
  - sort_dir: Optional[str] with values 'asc' or 'desc'
- Sanely validate sort_by against a whitelist and apply the sort.
- Apply filters only when provided; ensure the resulting query uses a single database query.

Part C — Cursor-based pagination
- Add /products_cursor endpoint that uses a cursor (after_id) to fetch the next page (default limit 20).
- The cursor is the last seen product id; results should be ordered by id ascending.
- Ensure the endpoint works when there are gaps in IDs and when the dataset updates between requests.

Part D — Bonus: N+1 mitigation
- If you introduce a separate relation (e.g., each product has a relationship to a Supplier with name), demonstrate how to eagerly fetch related data to avoid N+1 queries.

Suggested starter code (you can modify and extend):

```python
# exercise_products.py
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Float, Boolean, DateTime, func
from sqlalchemy.orm import sessionmaker, declarative_base, Session, joinedload
from datetime import datetime

DATABASE_URL = "sqlite:///./exercise_products.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    category = Column(String, index=True)
    price = Column(Float)
    in_stock = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class ProductOut(BaseModel):
    id: int
    name: str
    category: str
    price: float
    in_stock: bool
    created_at: datetime

    class Config:
        orm_mode = True

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

Base.metadata.create_all(bind=engine)

app = FastAPI()

# Part A: basic pagination
@app.get("/products", response_model=List[ProductOut])
def get_products(limit: int = 20, offset: int = 0, db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.id).offset(offset).limit(limit).all()

# Part B: filtering and sorting
@app.get("/products/advanced", response_model=List[ProductOut])
def get_products_advanced(
    limit: int = 20,
    offset: int = 0,
    sort_by: str = "id",
    sort_dir: str = "asc",
    category: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    in_stock: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    ALLOWED_SORT_FIELDS = {"id": Product.id, "name": Product.name, "price": Product.price, "created_at": Product.created_at}
    if sort_by not in ALLOWED_SORT_FIELDS:
        raise HTTPException(status_code=400, detail="Invalid sort field")
    order_col = ALLOWED_SORT_FIELDS[sort_by]
    order = order_col if sort_dir == "asc" else desc(order_col)

    query = db.query(Product)
    if category:
        query = query.filter(Product.category == category)
    if min_price is not None:
        query = query.filter(Product.price >= min_price)
    if max_price is not None:
        query = query.filter(Product.price <= max_price)
    if in_stock is not None:
        query = query.filter(Product.in_stock == in_stock)

    return query.order_by(order).offset(offset).limit(limit).all()

# Part C: cursor-based pagination
@app.get("/products_cursor", response_model=List[ProductOut])
def get_products_cursor(limit: int = 20, after_id: Optional[int] = None, db: Session = Depends(get_db)):
    q = db.query(Product).order_by(Product.id)
    if after_id is not None:
        q = q.filter(Product.id > after_id)
    return q.limit(limit).all()

# Part D: optional Supplier relation to illustrate N+1 mitigation
# (If you add a Supplier relationship, use joinedload to fetch in one query)
class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True)
    name = Column(String)

# For demonstration purposes, you could add a ForeignKey from Product to Supplier
# and then in a query use: db.query(Product).options(joinedload(Product.supplier)).all()
```

Note: The exercise starter provides scaffolding. Fill in missing relationships, migrations, or tests as needed for your environment. The important parts are the patterns for pagination, filtering, sorting, and the cursor-based approach.

End of lesson content.