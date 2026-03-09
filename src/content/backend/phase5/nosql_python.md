# NoSQL Databases — MongoDB & When to Use Them in Python

NoSQL databases like MongoDB offer flexible schemas, horizontal scalability, and fast development cycles for certain backend workloads. This module teaches how to use MongoDB from Python (PyMongo), when to choose a NoSQL approach, and how to model data, query efficiently, and handle consistency and transactions in production systems.

## 1. MongoDB Fundamentals: Documents, Collections, and Schema Flexibility

MongoDB stores data as JSON-like documents in collections. Each document is a self-contained unit with fields, nested structures, and arrays. The schema is flexible by design, which accelerates iteration but requires discipline to avoid data quality issues.

```python
# A Python representation of a MongoDB document (conceptual)
user = {
    "_id": "u100",
    "name": "Adele",
    "email": "adele@example.com",
    "addresses": [
        {"type": "home", "city": "Seattle", "street": "123 Maple St"},
        {"type": "work", "city": "Portland", "street": "9 Pine Ave"}
    ],
    "orders": [
        {"order_id": "O1001", "total": 59.99, "items": ["widget", "gadget"], "date": "2024-12-01"},
        {"order_id": "O1002", "total": 23.50, "items": ["notebook"], "date": "2025-01-15"}
    ]
}
```

### Line-by-line explanation
- _id: Primary identifier for the document; typically unique per collection.  
- name/email: Basic scalar fields describing the user.  
- addresses: An embedded array of sub-documents representing addresses; demonstrates embedding.  
- orders: An embedded array of sub-documents representing orders, enabling quick reads of related data without joins.  
- This document showcases MongoDB’s flexible schema: you can store nested structures directly inside a document without defining a rigid schema upfront.

## 2. Connecting to MongoDB from Python (PyMongo)

A typical Python backend connects to a MongoDB server, selects a database, and then uses collections to store and retrieve documents.

```python
from pymongo import MongoClient

# Connect to local MongoDB instance
client = MongoClient("mongodb://localhost:27017/")

# Access database and collection
db = client["shop"]
customers = db["customers"]

# Create a sample document
customer = {"name": "Ben", "email": "ben@example.com"}
insert_result = customers.insert_one(customer)
print("Inserted _id:", insert_result.inserted_id)
```

### Line-by-line explanation
- from pymongo import MongoClient: Import the PyMongo client class.
- MongoClient("mongodb://localhost:27017/"): Connect to the MongoDB server running on the default port.
- db = client["shop"]: Access or create the "shop" database.
- customers = db["customers"]: Access or create the "customers" collection.
- customer = {...}: Create a Python dict representing a document.
- insert_one(customer): Insert the document into the collection.
- print(inserted_id): Print the automatically generated ObjectId for the new document.

## 3. Basic CRUD Operations with PyMongo

Perform Create, Read, Update, and Delete operations against MongoDB collections using PyMongo.

```python
# Create
order = {"order_id": "O2001", "customer_id": "u100", "total": 49.99, "items": ["book", "pen"]}
orders = db["orders"]
orders.insert_one(order)

# Read
doc = orders.find_one({"order_id": "O2001"})
print(doc)

# Update
orders.update_one({"order_id": "O2001"}, {"$set": {"status": "shipped"}})

# Delete
orders.delete_one({"order_id": "O2001"})
```

### Line-by-line explanation
- order: A document representing a single order with fields for identifiers, totals, and items.
- orders.insert_one(order): Inserts the new order document into the orders collection.
- orders.find_one({"order_id": "O2001"}): Retrieves a single document matching the query.
- {"$set": {"status": "shipped"}}: Atomic update operator to modify specific fields without replacing the entire document.
- orders.delete_one({"order_id": "O2001"}): Removes the document that matches the query.
- These operations demonstrate typical CRUD patterns in a NoSQL workflow.

## 4. Data Modeling: Embedding vs Referencing

Choosing between embedding (storing related data inside a single document) and referencing (storing related data in separate collections and linking them) is critical for performance and flexibility.

### A) Embedding: everything in one document

```python
# Embedding: user document with embedded addresses and orders
user_embedded = {
    "_id": "u101",
    "name": "Carla",
    "addresses": [
        {"label": "home", "city": "Austin", "street": "10 First Ave"},
        {"label": "work", "city": "Austin", "street": "200 Market St"}
    ],
    "orders": [
        {"order_id": "O3001", "total": 29.99, "date": "2025-04-01"}
    ]
}
```

### B) Referencing: separate collections, linked by IDs

```python
# Referencing: separate collections with IDs
users = db["users"]
addresses = db["addresses"]

user_ref = {
    "_id": "u102",
    "name": "Diane",
    "address_ids": ["addr1", "addr2"]
}

addr1 = {"_id": "addr1", "user_id": "u102", "city": "Boston", "street": "11 Beacon St"}
addr2 = {"_id": "addr2", "user_id": "u102", "city": "Boston", "street": "22 Milk St"}

# Insert:
users.insert_one(user_ref)
addresses.insert_many([addr1, addr2])
```

### Joining references with an aggregation (simulate a join)

```python
# Join user with their addresses using an aggregation pipeline
pipeline = [
    {"$match": {"_id": "u102"}},
    {"$lookup": {
        "from": "addresses",
        "localField": "address_ids",
        "foreignField": "_id",
        "as": "addresses"
    }}
]
result = list(users.aggregate(pipeline))
print(result)
```

### Line-by-line explanation
- Embedding: Addresses and orders live inside the user document for fast reads of related data; great for "contains" queries where sub-documents are small and tightly coupled.
- Referencing: Data is normalized across collections; better for many-to-many or large, evolving relationships, but typically requires additional queries or an aggregation to "join" data.
- $lookup: MongoDB aggregation stage that performs a left join-like operation from one collection to another. Local fields in the source are matched against foreign fields in the target collection, with results stored in a new field (addresses).

## 5. Indexes, Aggregation, and Performance

Indexes accelerate read queries. Aggregation pipelines enable complex data processing on the server side, reducing data transfer to the application.

```python
# Ensure an index on customer_id for faster lookups
collection = db["orders"]
collection.create_index([("customer_id", 1)])
```

```python
# Simple query with projection and sort
cursor = collection.find({"customer_id": "u101"}, {"_id": 0, "order_id": 1, "total": 1}).sort("date", -1).limit(5)
for doc in cursor:
    print(doc)
```

```python
# Aggregation: total spent per customer for completed orders
pipeline = [
    {"$match": {"status": "completed"}},
    {"$group": {"_id": "$customer_id", "total_spent": {"$sum": "$total"}}},
    {"$sort": {"total_spent": -1}}
]
agg_results = list(collection.aggregate(pipeline))
print(agg_results)
```

### Line-by-line explanation
- create_index([...]): Creates a B-tree style index on the specified field(s) to speed up queries that filter or sort by those fields.
- find with projection: Projects only order_id and total fields, minimizing data transfer; sorts by date descending and limits the result set.
- Aggregation pipeline: Partitions documents by customer_id and computes the sum of the total field for each customer; sorts results by total_spent descending.
- Aggregation runs on the server, which reduces client-side processing and can handle large datasets efficiently.

## 6. When to Use MongoDB in Backend Systems (Production Context)

- Use cases: rapidly evolving schemas, hierarchical or document-like data, high write throughput, flexible indexing, and efficient reads for nested data without costly joins.
- Production patterns:
  - Use replica sets for high availability and read scaling.
  - Consider sharding for horizontal scaling of massive data and throughput.
  - Use transactions when you require ACID guarantees across multiple documents/collections (MongoDB 4.0+ with replica sets; 4.2+ supports multi-document transactions).
  - Design with clear indexing strategies, and monitor query patterns to adjust indexes as data evolves.
- Trade-offs:
  - Consistency vs. availability: MongoDB offers strong consistency within a single document, eventual consistency across shards or replicas in certain configurations.
  - Joins are possible via $lookup but are not as cheap as relational joins; use embedding for the common access patterns and referencing for large-scale relationships.
  - Enforcing complex constraints is less automatic than in relational databases; consider schema validation, application-level checks, and periodic data quality checks.
- Practical guidance:
  - Start with a flexible data model, but implement schema validation at the collection level when possible to catch data quality issues early.
  - Profile queries with explain() to understand index usage and adjust design accordingly.
  - Use transactions sparingly for cross-document operations; prefer single-document updates when possible to maximize performance and simplicity.

```python
# Multi-document transaction example (requires replica set)
with client.start_session() as s:
    with s.start_transaction():
        accounts = db["accounts"]
        transfers = db["transfers"]

        # Debit sender
        accounts.update_one({"_id": "acctA"}, {"$inc": {"balance": -50}}, session=s)
        # Credit recipient
        accounts.update_one({"_id": "acctB"}, {"$inc": {"balance": 50}}, session=s)
        # Record transfer
        transfers.insert_one({"from": "acctA", "to": "acctB", "amount": 50}, session=s)
```

### Line-by-line explanation
- start_session(): Open a logical session to participate in a transaction.
- start_transaction(): Begin a multi-document transaction.
- update_one with session=s: Ensure the operation is part of the transaction.
- insert_one with session=s: Also part of the transaction, guaranteeing atomicity across writes.
- If any operation fails, the transaction is aborted and no changes are committed, preserving consistency across collections.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1 — No schema validation leads to inconsistent data

Bad code (no validation, any structure allowed):
```python
# Dangerous: inserting unpredictable data
db["users"].insert_one({"name": "Eve", "age": "unknown", "preferences": {"theme": "dark"}})
```

Good code (enforce a schema at the collection level):
```python
validator = {
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["name", "email"],
    "properties": {
      "name": {"bsonType": "string"},
      "email": {"bsonType": "string"},
      "age": {"bsonType": "int"},
      "preferences": {
        "bsonType": "object",
        "properties": {
          "theme": {"bsonType": "string"}
        }
      }
    }
  }
}
db.create_collection("users", validator=validator)
```

### Pitfall 2 — Not indexing common query patterns

Bad code (no index on a frequent filter field):
```python
# Query that scans entire collection
for o in db["orders"].find({"customer_id": "u999"}):
    pass
```

Good code (index the field used in queries):
```python
db["orders"].create_index([("customer_id", 1)])
```

### Pitfall 3 — Not using transactions for multi-document operations

Bad code (non-atomic updates):
```python
# Two updates that should be atomic but are not
db["accounts"].update_one({"_id": "acctA"}, {"$inc": {"balance": -50}})
db["accounts"].update_one({"_id": "acctB"}, {"$inc": {"balance": 50}})
```

Good code (wrap in a transaction):
```python
with client.start_session() as s:
    with s.start_transaction():
        db["accounts"].update_one({"_id": "acctA"}, {"$inc": {"balance": -50}}, session=s)
        db["accounts"].update_one({"_id": "acctB"}, {"$inc": {"balance": 50}}, session=s)
```

### Pitfall 4 — Over-embedding large or growing arrays

Bad code (unbounded, large embedding inside a single document):
```python
# A user document with a very large embedded "addresses" array
user = {"_id": "u200", "name": "Frank", "addresses": [{"city": "..."} for _ in range(1000)]}
db["users"].insert_one(user)
```

Good code (reference large or growing relations):
```python
# Separate addresses collection and reference them
addresses = db["addresses"]
addresses.insert_many([{"_id": f"addr{n}", "user_id": "u200", "city": f"City{n}"} for n in range(1000)])
db["users"].insert_one({"_id": "u200", "name": "Frank", "address_ids": [f"addr{n}" for n in range(1000)]})
```

## Y. Why This Matters In Real Systems — production context and real usage

- MongoDB is a strong fit for services that need rapid iteration, flexible data models, and scalable reads/writes. It excels in content management, user profiles, analytics-ready event streams, and applications with nested data structures.
- In production, you’ll often use replica sets for high availability and read scaling, and potentially sharding for horizontal scaling. Transactions enable ACID guarantees across multiple documents/collections when necessary, but they introduce overhead and are best used for critical cross-collection operations.
- Practical discipline includes:
  - Designing data models with read patterns in mind (embed for common reads, reference for large relations).
  - Implementing schema validation to preserve data quality.
  - Building robust indexing strategies and using explain() to validate performance.
  - Planning for failure modes, backups, and monitoring (replica set health, operation logs, query latency).
- Real systems often blend NoSQL with SQL or other data stores depending on use case (polyglot persistence). For example, a user service might store profiles in MongoDB, while financial ledger data could live in a relational store for strict ACID constraints.

## Z. Study Questions — 5 recall questions

1. What is the primary difference between embedding and referencing in MongoDB data modeling?
2. How do you perform a cross-collection join-like operation in MongoDB using PyMongo?
3. What are the benefits and drawbacks of using MongoDB transactions?
4. How can you ensure data quality in a MongoDB collection without a traditional schema?
5. Why is indexing important, and how would you decide which fields to index for a query?

## Exercise — practical multi-part coding challenge

Part A: Setup and basic data
- Connect to a local MongoDB instance.
- Create two collections: users and orders.
- Insert sample data:
  - A user with embedded orders (demonstrate embedding).
  - A second user that uses a referencing approach to orders (demonstrate referencing pattern with IDs).

Part B: Indexing and simple queries
- Create an index on orders.customer_id.
- Write a query to fetch the last 5 orders for a given customer with a projection that only returns order_id, total, and date.

Part C: Aggregation
- Write an aggregation to compute the total amount spent per customer for completed orders, sorted by total spent descending.

Part D: Transaction
- Simulate a funds transfer between two accounts collections:
  - accounts collection with documents { _id, balance }
  - transfers collection to record each transfer
- Implement a multi-document transaction that debits one account and credits another, and records the transfer atomically.

Part E: Validation and performance planning
- Create a collection with a JSON schema validator to enforce that documents have required fields (e.g., name and email for users).
- Explain how you would assess which fields to index after running typical workload queries.

Starter code outline (fill in as you work through the parts). You can run these in a Python script with PyMongo installed.

```python
from pymongo import MongoClient, ASCENDING
client = MongoClient("mongodb://localhost:27017/")
db = client["shop"]

# Part A: Data modeling
# 1) Embedding example
user_embed = {
    "_id": "u_embed",
    "name": "Grace",
    "email": "grace@example.com",
    "orders": [
        {"order_id": "O2002", "total": 15.99, "date": "2025-02-12"}
    ]
}
db["users"].insert_one(user_embed)

# 2) Referencing example
db["addresses"].drop()  # optional cleanup
db["orders"].drop()
user_ref = {"_id": "u_ref", "name": "Hank", "address_ids": []}
db["users"].insert_one(user_ref)

addr1 = {"_id": "a1", "user_id": "u_ref", "city": "Denver"}
db["addresses"].insert_one(addr1)

# Part B: Indexing and queries
db["orders"].create_index([("customer_id", ASCENDING)])

# Part C: Aggregation
# (Assume orders have "status" and "total" fields)
pipeline = [
    {"$match": {"status": "completed"}},
    {"$group": {"_id": "$customer_id", "total_spent": {"$sum": "$total"}}},
    {"$sort": {"total_spent": -1}}
]
# results = list(db["orders"].aggregate(pipeline))

# Part D: Transaction
with client.start_session() as s:
    with s.start_transaction():
        db["accounts"].insert_one({"_id": "acc1", "balance": 1000}, session=s)
        db["accounts"].insert_one({"_id": "acc2", "balance": 500}, session=s)
        db["accounts"].update_one({"_id": "acc1"}, {"$inc": {"balance": -200}}, session=s)
        db["accounts"].update_one({"_id": "acc2"}, {"$inc": {"balance": 200}}, session=s)
        db["transfers"].insert_one({"from": "acc1", "to": "acc2", "amount": 200}, session=s)

# Part E: Validation
validator = {
  "$jsonSchema": {
    "bsonType": "object",
    "required": ["name", "email"],
    "properties": {
      "name": {"bsonType": "string"},
      "email": {"bsonType": "string"},
      "age": {"bsonType": "int"}
    }
  }
}
db.create_collection("validated_users", validator=validator)

print("Exercise scaffold complete. Run and test in your environment.")
```

Note: Replace or extend the starter data, queries, and validation to fit your testing environment. This exercise reinforces data modeling choices, indexing strategies, aggregation patterns, transactional integrity, and schema validation in a practical, Python-based backend workflow.