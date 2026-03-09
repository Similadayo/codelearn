# NoSQL Databases — MongoDB & When to Use Them (Java)

NoSQL databases like MongoDB offer flexible schemas, horizontal scalability, and fast iteration cycles ideal for modern backend services. In Phase 5 of the Backend Engineering track, we focus on when to use MongoDB, how to model data in a document store, and how to interact with MongoDB from Java. You’ll learn practical patterns for CRUD operations, indexing, data modeling (embedding vs referencing), and multi-document transactions to ensure data consistency in real systems.

## 1. MongoDB in Java: Core CRUD and Basic Operations

In this section, you’ll see concrete Java code to connect to MongoDB, insert documents, query, update, delete, and manage simple indexes. These are the building blocks you’ll use in almost every backend service that leverages MongoDB.

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.MongoCollection;
import org.bson.Document;
import java.util.Arrays;

public class MongoCrudExample {
  public static void main(String[] args) {
    // 1) Connect to MongoDB (local instance)
    String connectionString = "mongodb://localhost:27017";
    try (MongoClient mongoClient = MongoClients.create(connectionString)) {
      // 2) Get database and collection
      MongoDatabase database = mongoClient.getDatabase("store");
      MongoCollection<Document> products = database.getCollection("products");

      // 3) Create: insert a new product document
      Document doc = new Document("name", "Widget")
          .append("price", 9.99)
          .append("tags", Arrays.asList("gadget", "home"));
      products.insertOne(doc);
      System.out.println("Inserted: " + doc.toJson());

      // 4) Read: find a document
      Document filter = new Document("name", "Widget");
      Document found = products.find(filter).first();
      System.out.println("Found: " + (found != null ? found.toJson() : "null"));

      // 5) Update: modify the price
      Document update = new Document("$set", new Document("price", 11.99));
      products.updateOne(filter, update);
      System.out.println("Updated price for Widget");

      // 6) Delete: remove the document
      products.deleteOne(filter);
      System.out.println("Deleted Widget");
    }
  }
}
```

### Line-by-line explanation
- Line 1-6: Import necessary MongoDB and Java classes for client, database, collection, and documents.
- Line 9: Define the main entry point.
- Line 12: Establish a connection string to a local MongoDB instance.
- Line 13: Create a MongoClient in a try-with-resources block to auto-close.
- Line 15-16: Retrieve the database named "store" and the collection "products".
- Line 19-21: Build a Document representing a product with fields name, price, and tags.
- Line 22: Insert the document into the collection.
- Line 23: Print the inserted document as JSON for confirmation.
- Line 26-28: Create a filter Document to search by name.
- Line 29: Find the first matching document.
- Line 30: Print the found document or "null" if none.
- Line 33-34: Create an update operation to set a new price.
- Line 35: Apply the update to the first matching document.
- Line 36: Confirm the update.
- Line 39-40: Delete the first matching document.
- Line 41-42: Confirm deletion and close resources.

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoCursor;
import com.mongodb.client.model.Filters;
import org.bson.Document;

public class MongoQueryExample {
  public static void main(String[] args) {
    String uri = "mongodb://localhost:27017";
    try (MongoClient client = MongoClients.create(uri)) {
      Document filter = new Document("name", "Widget");
      MongoCollection<Document> products = client.getDatabase("store").getCollection("products");

      // 1) Read with projection: only fetch name and price
      Document projection = new Document("name", 1).append("price", 1).append("_id", 0);
      Document result = products.find(filter).projection(projection).first();
      System.out.println("Projected result: " + (result != null ? result.toJson() : "null"));
    }
  }
}
```

### Line-by-line explanation
- Line 1-6: Import MongoDB client classes and Document.
- Line 9: Begin main method.
- Line 12: Create a MongoClient using the local URI with try-with-resources.
- Line 14: Create a filter Document to search for "Widget" by name.
- Line 15: Get the products collection from the store database.
- Line 18-19: Create a projection Document to include only name and price (exclude _id).
- Line 20: Execute the find with projection and take the first result.
- Line 21: Print the projected result or "null".

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.ClientSession;
import org.bson.Document;
import com.mongodb.client.model.Filters;

public class MongoUpdateInSession {
  public static void main(String[] args) {
    String uri = "mongodb://localhost:27017";
    try (MongoClient client = MongoClients.create(uri)) {
      MongoCollection<Document> products = client.getDatabase("store").getCollection("products");

      // 1) Start a session and perform an atomic update in a transaction-like way (multi-document)
      try (ClientSession session = client.startSession()) {
        session.startTransaction();
        Document filter = new Document("name", "Widget");
        Document update = new Document("$set", new Document("price", 12.49));
        products.updateOne(session, filter, update);

        // Optional: insert a log or related operation within the same session
        MongoCollection<Document> logs = client.getDatabase("store").getCollection("price_logs");
        logs.insertOne(session, new Document("product", "Widget").append("newPrice", 12.49));

        session.commitTransaction();
      }
    }
  }
}
```

### Line-by-line explanation
- Line 1-6: Import MongoDB client, session, and document utilities.
- Line 9: Begin main method.
- Line 12: Create a MongoClient for the local URI.
- Line 14: Access the products collection.
- Line 17: Open a client session to run a multi-operation transaction.
- Line 18: Start the transaction.
- Line 19-21: Build a filter to locate the product and an update to set a new price.
- Line 22: Execute the update within the session (atomic within the transaction).
- Line 25: Get the logs collection to record the price change within the same session.
- Line 26: Insert a log document inside the session.
- Line 28: Commit the transaction to apply both operations atomically.
- Line 29: The session is automatically closed due to try-with-resources.

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import org.bson.Document;
import java.util.Arrays;

public class MongoIndexingExample {
  public static void main(String[] args) {
    String uri = "mongodb://localhost:27017";
    try (MongoClient client = MongoClients.create(uri)) {
      MongoDatabase db = client.getDatabase("store");
      MongoCollection<Document> products = db.getCollection("products");

      // 1) Create a compound index to speed up category + price queries
      products.createIndex(
        com.mongodb.client.model.Indexes.compoundIndex(
          com.mongodb.client.model.Indexes.ascending("category"),
          com.mongodb.client.model.Indexes.ascending("price")
        )
      );
      System.out.println("Compound index created on category and price");

      // 2) Use the index in a query with projection
      Document filter = new Document("category", "gadgets");
      Document projection = new Document("name", 1).append("price", 1).append("_id", 0);
      Document result = products.find(filter).projection(projection).sort(new Document("price", 1)).first();
      System.out.println("Index-backed result: " + (result != null ? result.toJson() : "null"));
    }
  }
}
```

### Line-by-line explanation
- Line 1-7: Import MongoDB driver classes for index creation, queries, and documents.
- Line 10: Define main method and create a local MongoClient.
- Line 12-13: Access the database and products collection.
- Line 16-22: Build and create a compound index on category and price to optimize queries that filter by category and sort by price.
- Line 25: Create a filter for category "gadgets".
- Line 26: Create a projection to return only name and price.
- Line 27-28: Run a query using the index, apply projection, and sort by price ascending.
- Line 29: Print the first result or "null".

## 2. Data Modeling Patterns: Embedding vs Referencing

MongoDB offers schema flexibility: you can embed related data in a single document or store references to separate documents. Choosing embedding vs referencing affects query complexity, update patterns, and document growth.

### 2.1 Embedding: Single document for fast reads

```java
import org.bson.Document;
import java.util.Arrays;

public class UserWithEmbeddedAddress {
  public static Document buildUser() {
    Document address = new Document("street", "123 Main St")
        .append("city", "Metropolis")
        .append("zip", "12345");

    Document user = new Document("name", "Alice")
        .append("email", "alice@example.com")
        .append("address", address)
        .append("roles", Arrays.asList("user", "admin"));
    return user;
  }
}
```

### 2.1 Line-by-line explanation
- Line 1-2: Import Document class and Arrays helper.
- Line 4: Define a method to build a user document.
- Line 6-9: Construct an embedded address sub-document with street, city, and zip.
- Line 11-15: Build the top-level user document that includes name, email, the embedded address, and a roles array.
- Line 16: Return the assembled user document.

### 2.2 Referencing: Separate collections and explicit joins (manual)

```java
import org.bson.Document;
import org.bson.types.ObjectId;

public class UserWithReference {
  public static Document buildUserWithAddressRef(ObjectId addressId) {
    // Reference by addressId into a separate addresses collection
    Document user = new Document("name", "Bob")
        .append("email", "bob@example.com")
        .append("addressId", addressId);
    return user;
  }

  public static Document buildAddressDocument() {
    return new Document("_id", new ObjectId())
        .append("street", "456 Side St")
        .append("city", "Gotham")
        .append("zip", "67890");
  }
}
```

### 2.2 Line-by-line explanation
- Line 1-2: Import BSON Document and ObjectId types.
- Line 4-9: Build a user document that stores a reference to an address via addressId, instead of embedding the address details.
- Line 11-16: Build a separate address document with its own _id to be stored in an addresses collection.
- Line 17-18: Return the documents for insertion into their respective collections.

Notes and trade-offs:
- Embedding is great for one-to-few relationships and when you want fast reads with a single document fetch.
- Referencing keeps document sizes small and avoids duplicating large sub-documents, but requires additional queries to resolve references (or perform application-side joins).

## 3. Performance, Indexing, and Query Patterns

Indexes drive read performance in MongoDB. Proper indexing is essential for production workloads, especially for large datasets and frequent queries on specific fields.

### 3.1 Create useful indexes

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.Indexes;
import org.bson.Document;

public class CreateIndexExample {
  public static void main(String[] args) {
    String uri = "mongodb://localhost:27017";
    try (MongoClient client = MongoClients.create(uri)) {
      MongoCollection<Document> products = client.getDatabase("store").getCollection("products");

      // Compound index for category and price to speed up category-filtered price queries
      products.createIndex(Indexes.compoundIndex(Indexes.ascending("category"), Indexes.ascending("price")));
      System.out.println("Compound index on category + price created");
    }
  }
}
```

### 3.1 Line-by-line explanation
- Line 1-5: Import necessary MongoDB client and index utilities.
- Line 9: Open a MongoClient to the local instance.
- Line 11-12: Access the products collection.
- Line 15-16: Create a compound index on category and price to optimize queries filtering by category and sorting by price.
- Line 17: Confirm index creation.

### 3.2 Projection and efficient data transfer

```java
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import org.bson.Document;

public class ProjectionExample {
  public static void main(String[] args) {
    String uri = "mongodb://localhost:27017";
    try (MongoClient client = MongoClients.create(uri)) {
      MongoCollection<Document> products = client.getDatabase("store").getCollection("products");

      // Query with a projection to fetch only necessary fields
      Document filter = new Document("name", "Widget");
      Document projection = new Document("name", 1).append("price", 1).append("_id", 0);
      Document result = products.find(filter).projection(projection).first();
      System.out.println("Projection result: " + (result != null ? result.toJson() : "null"));
    }
  }
}
```

### 3.2 Line-by-line explanation
- Line 1-6: Import necessary classes.
- Line 9: Create a MongoClient.
- Line 11-12: Access the products collection.
- Line 15-16: Build a filter and a projection to limit returned fields.
- Line 17-18: Execute the query with projection and fetch the first result.
- Line 19: Print the result or "null".

### 3.3 Read/write patterns to consider

- Read-heavy workloads benefit from selective projections and proper indexing.
- Write-heavy workloads should consider whether to embed to reduce the number of documents updated, or to normalize and update multiple collections with transactions if necessary.
- Be mindful of document size limits (16 MB). Large, deeply nested documents can be less efficient to work with.

## 4. Transactions and Multi-Document Consistency

MongoDB supports multi-document transactions (ACID) in replica sets and sharded clusters (v4.0+). This is crucial when you need atomic operations across multiple documents or collections.

### 4.1 Transaction example: transferring stock across collections

```java
import com.mongodb.client.ClientSession;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import org.bson.Document;

public class MongoTransactionExample {
  public static void main(String[] args) {
    String uri = "mongodb://localhost:27017";
    try (MongoClient client = MongoClients.create(uri)) {
      MongoCollection<Document> inventory = client.getDatabase("store").getCollection("inventory");
      MongoCollection<Document> orders = client.getDatabase("store").getCollection("orders");

      try (ClientSession session = client.startSession()) {
        session.startTransaction();

        // Move 5 units of product "Widget" from warehouse W1 to W2
        Document filterFrom = new Document("product", "Widget").append("warehouseId", "W1");
        Document updateFrom = new Document("$inc", new Document("quantity", -5));
        inventory.updateOne(session, filterFrom, updateFrom);

        Document newOrder = new Document("product", "Widget")
            .append("warehouseFrom", "W1")
            .append("warehouseTo", "W2")
            .append("quantity", 5);
        orders.insertOne(session, newOrder);

        session.commitTransaction();
        System.out.println("Transaction committed: stock moved and order recorded.");
      } catch (Exception e) {
        // If any operation fails, the transaction is aborted
        System.err.println("Transaction aborted: " + e.getMessage());
      }
    }
  }
}
```

### Line-by-line explanation
- Line 1-6: Import client session and collection classes.
- Line 9-13: Connect to the local MongoDB instance and access inventory and orders collections.
- Line 15: Open a client session and begin a transaction.
- Line 18-19: Define a filter to locate inventory for Widget in warehouse W1.
- Line 20-21: Define an update to decrement the quantity by 5.
- Line 22: Apply the update within the session (atomic within the transaction).
- Line 24-28: Create a new order document and insert it within the same transaction to record the transfer.
- Line 30: Commit the transaction to make all operations durable.
- Line 31-34: Catch and report any errors, noting that the transaction will be aborted on failure.

## X. Common Beginner Mistakes

1) Bad: Not using indexes on frequently queried fields
- Bad
  - Query by email without an index, leading to full collection scans.
```java
Document filter = new Document("email", "user@example.com");
```
- Good
```java
import com.mongodb.client.model.Indexes;
collection.createIndex(Indexes.ascending("email"));
```

2) Bad: Embedding huge or unbounded arrays, hitting document size limits
- Bad
```java
Document doc = new Document("userId", "u123")
  .append("activityLog", generateHugeActivityLog()); // very large array
```
- Good
```java
Document doc = new Document("userId", "u123")
  .append("activityLogIds", Arrays.asList("log1","log2","log3")); // references to logs in a separate collection
```

3) Bad: Storing dates as strings
- Bad
```java
Document doc = new Document("createdAt", "2026-03-09");
```
- Good
```java
import java.util.Date;
Document doc = new Document("createdAt", new Date());
```

4) Bad: Mixing types for _id (relying on strings or numbers inconsistently)
- Bad
```java
Document bad = new Document("_id", "id-001"); // string id, inconsistent with ObjectId usage
```
- Good
```java
import org.bson.types.ObjectId;
Document good = new Document("_id", new ObjectId()); // ObjectId for automatic uniqueness
```

5) Bad: Not handling potential race conditions in concurrent writes
- Bad
```java
// naive increment without concurrency control
collection.updateOne(Filters.eq("_id", id), Updates.inc("counter", 1));
```
- Good
```java
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;
collection.updateOne(Filters.eq("_id", id),
  new Document("$inc", new Document("counter", 1))
);
```

## Y. Why This Matters In Real Systems

- Flexibility vs discipline: MongoDB’s schema-less nature speeds up development but requires disciplined data modeling decisions to avoid inconsistent data and brittle queries.
- Read/write patterns drive design: For write-heavy workloads, embedding can reduce the need for multiple writes, but it can increase document size. For complex relationships, referencing with careful query design and optional transactions maintains data integrity.
- Indexing is a must: Without proper indexes, even small data sets can underperform. In production, you’ll tune indexes based on query patterns, and you may implement partial indexes or TTL indexes for time-based data.
- Transactions unlock consistency: Multi-document transactions enable safer operations across collections, which is essential for financial, inventory, or order workflows.
- Operational considerations: Sharding and replica sets are often necessary to meet latency, throughput, and availability requirements in real systems.

## Z. Study Questions

1) What are the main advantages of using MongoDB’s document model for backend services?
2) When would you choose embedding vs. referencing for related data?
3) How do you ensure fast reads for common queries in MongoDB (mention indexing strategies)?
4) What is a multi-document transaction in MongoDB, and when would you use it?
5) Why is projecting only required fields important in large collections?

## Exercise

Part A — Setup and basic CRUD (Java)

- Create a Java class MongoPractice that connects to a MongoDB instance, obtains a database named "store", and a collection named "products".
- Implement the following methods:
  - insertProduct(String name, double price, List<String> tags): inserts a product document.
  - findProductByName(String name): returns the product document with only name and price fields (use projection).
  - updateProductPrice(String name, double newPrice): updates the price of the first product matching the name.
  - deleteProduct(String name): deletes the first product matching the name.
- Add a main method to demonstrate calling these methods with a sample product.

Part B — Data Modeling Practice

- Implement two helper methods:
  - buildUserWithEmbeddedAddress(): returns a Document that embeds an address sub-document (see 2.1 Embedding example).
  - buildUserWithAddressReference(): returns a Document that references an address by addressId (see 2.2 Referencing example).
- Demonstrate by printing the created Documents.

Part C — Indexing and Performance

- Create a compound index on category and price for the products collection.
- Run a query to fetch all products in category "gadgets" sorted by price, projecting only name and price.

Part D — Transactions

- Assume an inventory and orders collection. Implement a method transferStockTransactional(product, fromWarehouse, toWarehouse, quantity) that uses a MongoDB ClientSession to:
  - Decrement the quantity from inventory for the source warehouse.
  - Increment the quantity in inventory for the target warehouse.
  - Insert a record in a hypothetical "stock_transfers" collection documenting the transfer.
- Ensure the operations occur within a single transaction and are rolled back on error.

Deliverables for the exercise:
- Complete Java files with properly structured classes and methods.
- Demonstration code that compiles and runs against a local MongoDB instance.
- Comments explaining the rationale behind your design choices (embedding vs referencing, index usage, and transaction boundaries).

This lesson provides a practical, production-oriented view of NoSQL with MongoDB in a Java backend. It equips you to design data models, write efficient data access code, and reason about when to rely on transactions in real systems.