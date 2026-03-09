# Track: Backend Engineering — Phase 5: Databases — NoSQL Databases: MongoDB & When to Use Them (Go)

MongoDB is a document-oriented NoSQL database designed for flexible schemas, nested data, and scalable reads/writes. In backend Go applications, MongoDB enables rapid iteration for evolving data models, effortless horizontal scaling, and expressive queries with the Aggregation Framework. This lesson covers what MongoDB is, how to integrate it with Go, practical patterns for modeling data, and real-world guidance on when to use it in production systems.

## 1. MongoDB in Go: What it is and when to use it

- MongoDB stores data as BSON documents within collections. Each document is a JSON-like structure that can nest objects and arrays.
- When to consider MongoDB in Go apps: dynamic schemas, rapid prototyping, hierarchical data, high write throughput, and flexible indexing for various query patterns.
- Tradeoffs: no strong foreign keys by default, eventual consistency in distributed setups, and potential complexity for multi-document transactions in very strict ACID needs.

This section introduces the concept and helps you decide if MongoDB is the right fit for a given backend service.

## 2. Setup and Connection: Go MongoDB Driver

Code example: connect to MongoDB using the official Go driver, configure timeouts, and verify the connection.

```go
package main

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

func main() {
	// Create a context with a timeout for the initial connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Replace with your MongoDB URI
	uri := "mongodb://localhost:27017"

	// Create a new client and connect
	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatalf("failed to create client: %v", err)
	}
	// Ensure we disconnect and release resources on exit
	defer func() {
		_ = client.Disconnect(ctx)
	}()

	// Verify the connection with a ping
	if err := client.Ping(ctx, readpref.Primary()); err != nil {
		log.Fatalf("cannot ping MongoDB: %v", err)
	}
	// Use a database and collection in your app
	db := client.Database("exampledb")
	_ = db
}
```

### Line-by-line explanation

- Line 1: package main — declares the package.
- Imports: bring in context, logging, time, and MongoDB driver packages.
- Line 18: func main() — entry point of the program.
- Line 21: ctx, cancel := context.WithTimeout(...) — creates a context that times out after 10 seconds for the initial connection.
- Line 22: defer cancel() — ensures the context can be canceled when main exits.
- Line 25: uri := "mongodb://localhost:27017" — the MongoDB connection string (adjust for your environment).
- Line 28: mongo.Connect(ctx, options.Client().ApplyURI(uri)) — establishes a new client with the given URI.
- Line 29: if err != nil — error handling for client creation.
- Line 34: defer func() { _ = client.Disconnect(ctx) }() — ensures resources are released on exit.
- Line 38: client.Ping(ctx, readpref.Primary()) — checks the connection by pinging the primary.
- Line 40: db := client.Database("exampledb") — selects the database to operate on.
- Line 41: _ = db — placeholder to show usage; actual operations would follow.

## 3. Basic CRUD in Go with MongoDB

This section shows common operations: inserting documents, querying, updating, and deleting. We’ll use a Product model to demonstrate.

```go
package main

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Product struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	Name      string             `bson:"name"`
	Category  string             `bson:"category"`
	Price     float64            `bson:"price"`
	Tags      []string           `bson:"tags"`
	InStock   bool               `bson:"in_stock"`
	CreatedAt time.Time          `bson:"created_at"`
}

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		log.Fatalf("connect error: %v", err)
	}
	defer client.Disconnect(ctx)

	collection := client.Database("shop").Collection("products")

	// 1) InsertOne
	p := Product{
		Name:      "Widget",
		Category:  "Gadgets",
		Price:     19.99,
		Tags:      []string{"new", "featured"},
		InStock:   true,
		CreatedAt: time.Now(),
	}
	insertRes, err := collection.InsertOne(ctx, p)
	if err != nil {
		log.Fatalf("insert error: %v", err)
	}
	_ = insertRes

	// 2) Find (single document)
	var found Product
	err = collection.FindOne(ctx, bson.D{{"name", "Widget"}}).Decode(&found)
	if err != nil {
		log.Printf("find one: %v", err)
	} else {
		log.Printf("found product: %+v", found)
	}

	// 3) Find (multiple documents)
	cursor, err := collection.Find(ctx, bson.D{{"category", "Gadgets"}})
	if err != nil {
		log.Fatalf("find many: %v", err)
	}
	defer cursor.Close(ctx)
	for cursor.Next(ctx) {
		var p Product
		if err := cursor.Decode(&p); err != nil {
			log.Printf("decode: %v", err)
			continue
		}
		log.Printf("product: %+v", p)
	}
	// 4) UpdateOne
	update := bson.D{{"$set", bson.D{{"price", 17.99}}}}
	updateRes, err := collection.UpdateOne(ctx, bson.D{{"name", "Widget"}}, update)
	if err != nil {
		log.Fatalf("update: %v", err)
	}
	_ = updateRes

	// 5) DeleteOne (optional)
	_, _ = collection.DeleteOne(ctx, bson.D{{"name", "Widget"}})
}
```

### Line-by-line explanation

- Lines 1-9: package and imports for BSON, primitive IDs, MongoDB client, context, and time.
- Lines 11-20: Product struct defines the document schema with BSON tags for mapping.
- Lines 22-26: main() and context setup for operations.
- Line 29: Connect to MongoDB and select the same URI as before.
- Line 34: Access the products collection in the shop database.
- 1) InsertOne block:
  - Line 36-44: Create a Product instance and insert it with InsertOne; handle error.
- 2) Find (single document):
  - Line 47-50: FindOne with name filter and Decode into found; handle errors.
- 3) Find (multiple documents):
  - Line 53-63: Execute Find for category Gadgets, loop with cursor, decode each document.
- 4) UpdateOne:
  - Line 66-68: Prepare a $set update (price) and apply to the document named "Widget".
- 5) DeleteOne:
  - Line 71-72: Optional cleanup of the inserted document.

## 4. Indexes, Aggregation, and Performance

Indexes speed up queries; Aggregation enables server-side data processing. This section shows creating a compound index and a simple aggregation pipeline.

```go
package main

import (
	"context"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func main() {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, options.Client().ApplyURI("mongodb://localhost:27017"))
	if err != nil {
		log.Fatal(err)
	}
	defer client.Disconnect(ctx)

	collection := client.Database("shop").Collection("products")

	// 1) Create a compound index on category and price
	indexModel := mongo.IndexModel{
		Keys: bson.D{{"category", 1}, {"price", 1}},
		Options: options.Index().SetUnique(false),
	}
	_, err = collection.Indexes().CreateOne(ctx, indexModel)
	if err != nil {
		log.Fatalf("create index: %v", err)
	}

	// 2) Aggregation: average price by category for in_stock products
	pipeline := mongo.Pipeline{
		{{"$match", bson.D{{"in_stock", true}}}},
		{{"$group", bson.D{{"_id", "$category"}, {"avgPrice", bson.D{{"$avg", "$price"}}}}}},
		{{"$sort", bson.D{{"avgPrice", -1}}}},
	}
	cursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		log.Fatalf("aggregate: %v", err)
	}
	defer cursor.Close(ctx)

	type Result struct {
		ID       string  `bson:"_id"`
		AvgPrice float64 `bson:"avgPrice"`
	}
	for cursor.Next(ctx) {
		var r Result
		if err := cursor.Decode(&r); err != nil {
			log.Printf("decode: %v", err)
			continue
		}
		log.Printf("category: %s, avg price: %.2f", r.ID, r.AvgPrice)
	}
}
```

### Line-by-line explanation

- Lines 1-9: imports for context, logging, and MongoDB types.
- Lines 11-17: main function and connection setup with timeout.
- Line 21: collection := ... selects the products collection.
- 1) Create index:
  - Line 25-29: Define a compound index on category and price, non-unique.
  - Line 30: Create the index on the collection.
- 2) Aggregation:
  - Line 35-39: Define a pipeline with $match (in_stock), $group (sum/avg), and $sort stages.
  - Line 40: Execute the aggregation with Aggregate.
  - Line 42-51: Iterate results, decode into Result structs, and log them.

## 5. Data Modeling Patterns in MongoDB for Go Apps

MongoDB supports embedded documents (denormalization) and references (normalization). Choosing the right pattern affects reads, writes, and consistency guarantees.

- Embedding (denormalized) example: put related data into a single document for fast reads.
- Referencing (normalized) example: store IDs of related documents and fetch separately as needed.

Code snippets illustrate both approaches.

Embedding example: an Order with embedded Customer snapshot and Items

```go
type CustomerSnapshot struct {
	ID    primitive.ObjectID `bson:"customer_id"`
	Name  string             `bson:"name"`
	Email string             `bson:"email"`
}

type Order struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	Customer  CustomerSnapshot   `bson:"customer"`
	Items     []OrderItem        `bson:"items"`
	Total     float64            `bson:"total"`
	CreatedAt time.Time          `bson:"created_at"`
}

type OrderItem struct {
	ProductID primitive.ObjectID `bson:"product_id"`
	Name      string             `bson:"name"`
	Quantity  int                `bson:"qty"`
	Price     float64            `bson:"price"`
}
```

Referencing example: separate documents for Customer and Order referencing customer_id

```go
type CustomerRef struct {
	ID    primitive.ObjectID `bson:"_id,omitempty"`
	Name  string             `bson:"name"`
	Email string             `bson:"email"`
	// more fields...
}

type OrderRef struct {
	ID        primitive.ObjectID   `bson:"_id,omitempty"`
	CustomerID primitive.ObjectID  `bson:"customer_id"`
	Items     []OrderItem          `bson:"items"`
	Total     float64              `bson:"total"`
	CreatedAt time.Time            `bson:"created_at"`
}
```

### Line-by-line explanation

- Embedding section:
  - Line 1-7: Define CustomerSnapshot, Order, and OrderItem structs with nested embedding.
  - Explanation: Embedding keeps customer info and order items inside the Order document for fast reads, reducing the need for joins (MongoDB does not have joins like SQL).
- Referencing section:
  - Line 1-7: Define CustomerRef and OrderRef structs; the key is CustomerID as a reference to a separate Customer document.
  - Explanation: Referencing reduces duplication and keeps customer data in a single place; reads may require additional lookups or application-side joins.

When to choose patterns:
- Use embedding when you read the order and its related data together frequently, and the embedded data isn’t oversized.
- Use referencing when related data is large, changes independently, or is shared across many documents (e.g., a customer profile updated often).

## 6. When to Use MongoDB in Production vs Other DBs

- Use MongoDB when you need:
  - Flexible or evolving schemas
  - Rich document structures with nested data
  - High write throughput and horizontal scaling
  - Efficient indexing on diverse query fields
- Be mindful of:
  - Lack of multi-document ACID transactions (though MongoDB supports multi-document transactions in replica sets and sharded clusters since v4.x)
  - The need for careful data modeling to avoid excessive document growth
  - Observability: monitor queries, indexing, and resource usage
- Production considerations:
  - Use replica sets for high availability and read scaling
  - Configure appropriate write concerns and read preferences
  - Use sharding for horizontal scale when datasets exceed single-node capacity
  - Employ backups, monitoring, and alerting (e.g., MongoDB Atlas or self-managed clusters)

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Not using timeouts or context cancellation
Bad:
```go
ctx := context.Background()
collection.Find(ctx, bson.D{{"category", "Gadgets"}})
```
Good:
```go
ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
defer cancel()
cursor, err := collection.Find(ctx, bson.D{{"category", "Gadgets"}})
```

- Pitfall 2: Forgetting to close cursors or connections
Bad:
```go
cursor, _ := collection.Find(ctx, bson.D{{}})
for cursor.Next(ctx) {
    // ...
}
```
Good:
```go
cursor, err := collection.Find(ctx, bson.D{{}})
if err != nil { /* handle */ }
defer cursor.Close(ctx)
for cursor.Next(ctx) {
    // decode
}
```

- Pitfall 3: Not checking Decode errors or ignoring cursor errors
Bad:
```go
var p Product
cursor.Decode(&p)
```
Good:
```go
for cursor.Next(ctx) {
    var p Product
    if err := cursor.Decode(&p); err != nil {
        // handle decode error
        continue
    }
    // use p
}
if err := cursor.Err(); err != nil {
    // handle cursor error
}
```

- Pitfall 4: Not using indexes for frequent queries
Bad:
```go
// querying by category without an index can be slow on large collections
collection.Find(ctx, bson.D{{"category", "Gadgets"}})
```
Good:
```go
index := mongo.IndexModel{Keys: bson.D{{"category", 1}}, Options: options.Index().SetUnique(false)}
_, _ = collection.Indexes().CreateOne(ctx, index)
```

- Pitfall 5: Over-embedding or under-embedding data
Bad (over-embedding leads to oversized documents):
```go
type Order struct {
  ID       primitive.ObjectID
  Customer Customer // huge nested struct replicated in many orders
  // ...
}
```
Good (balanced approach with references or selective embedding):
```go
type Order struct {
  ID         primitive.ObjectID
  CustomerID primitive.ObjectID
  // optionally embed a snapshot if read-time data is stable
  // ...
}
```

## Y. Why This Matters In Real Systems — production context and real usage

- Data model choices affect read latency, write throughput, and storage footprint. MongoDB’s flexible schema means you can evolve models without database migrations, but you must still plan indexes and document size.
- In production, you’ll typically deploy a replica set for high availability and optionally a sharded cluster for large-scale data. Plan your write concerns (e.g., acknowledged writes) and read preferences (e.g., primary vs secondary reads) to balance data safety and latency.
- Observability and operations:
  - Monitor slow queries and index usage with database profiling and monitoring tools.
  - Use backups and point-in-time recovery in replicas/shards.
  - Plan change management around schema evolution and aggregation logic.
- Realistic usage patterns:
  - E-commerce product catalogs: dynamic attributes, rich search/filter queries, and asynchronous analytics via aggregation.
  - User activity logs: high-velocity writes with time-based TTL indexes for log data.
  - Content management: flexible schemas for articles with embedded metadata and tags.

## Z. Study Questions — 5 recall questions

1) What is a document in MongoDB, and how does it differ from a row in a SQL table?  
2) How do you create a unique index in Go for a field like email?  
3) When would you prefer embedding data inside a document versus storing references to other documents?  
4) How does the Aggregation Framework help in reducing data transfer and processing on the application side?  
5) What are some essential production considerations when deploying MongoDB (replication, sharding, backups, and monitoring)?

## Exercise — a practical multi-part coding challenge

Goal: Build a small Go program that demonstrates core MongoDB usage in a real app pattern: product catalog with indexing, basic queries, and a simple aggregation.

Part A: Project setup
- Create a new Go module and install the official MongoDB driver.
- Connect to a local MongoDB instance and verify the connection with a ping.

Part B: Data model and insertion
- Define a Product struct with fields: ID, Name, Category, Price, InStock, CreatedAt, and Tags.
- Insert at least 3 sample products into the products collection.

Part C: Indexing
- Create a compound index on category (ascending) and price (ascending) to optimize catalog queries.

Part D: Query and projection
- Write a function to fetch all in-stock products for a given category, returning only name, price, and tags (projection).

Part E: Aggregation
- Implement a function to compute the average price per category for in-stock items, returning a map[string]float64.

Part F: Graceful shutdown
- Wire up context cancellation and a signal handler to gracefully disconnect the client on program termination.

Part G: Run and verify
- Run the program, verify inserts, and test the aggregation output by printing results to stdout.

Starter code (complete program that you can modify to complete parts A–G)

```go
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type Product struct {
	ID        primitive.ObjectID `bson:"_id,omitempty"`
	Name      string             `bson:"name"`
	Category  string             `bson:"category"`
	Price     float64            `bson:"price"`
	InStock   bool               `bson:"in_stock"`
	CreatedAt time.Time          `bson:"created_at"`
	Tags      []string           `bson:"tags"`
}

func main() {
	// Setup context with timeout for initial connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	uri := "mongodb://localhost:27017"

	client, err := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	if err != nil {
		log.Fatalf("connect error: %v", err)
	}
	defer func() {
		_ = client.Disconnect(ctx)
	}()

	// Ensure we can ping the server
	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("ping failed: %v", err)
	}

	collection := client.Database("shop").Collection("products")

	// Part A: Insert sample products
	products := []Product{
		{Name: "Widget A", Category: "Gadgets", Price: 19.99, InStock: true, CreatedAt: time.Now(), Tags: []string{"new"}},
		{Name: "Widget B", Category: "Gadgets", Price: 29.99, InStock: true, CreatedAt: time.Now(), Tags: []string{"popular"}},
		{Name: "Gizmo Pro", Category: "Tools", Price: 49.5, InStock: false, CreatedAt: time.Now(), Tags: []string{"refurbished"}},
	}
	for _, p := range products {
		_, err := collection.InsertOne(ctx, p)
		if err != nil {
			log.Printf("insert error: %v", err)
		}
	}

	// Part D: Query with projection
	category := "Gadgets"
	projection := bson.D{
		{"name", 1},
		{"price", 1},
		{"tags", 1},
		{"_id", 0},
	}
	cursor, err := collection.Find(ctx, bson.D{{"category", category}, {"in_stock", true}}, options.Find().SetProjection(projection))
	if err != nil {
		log.Fatalf("find error: %v", err)
	}
	defer cursor.Close(ctx)
	fmt.Println("In-stock Gadgets:")
	for cursor.Next(ctx) {
		var res struct {
			Name  string   `bson:"name"`
			Price float64  `bson:"price"`
			Tags  []string `bson:"tags"`
		}
		if err := cursor.Decode(&res); err != nil {
			log.Printf("decode error: %v", err)
			continue
		}
		fmt.Printf("- %s: $%.2f [%v]\n", res.Name, res.Price, res.Tags)
	}

	// Part E: Aggregation
	type aggRes struct {
		ID       string  `bson:"_id"`
		AvgPrice float64 `bson:"avgPrice"`
	}
	pipeline := mongo.Pipeline{
		{{"$match", bson.D{{"in_stock", true}}}},
		{{"$group", bson.D{{"_id", "$category"}, {"avgPrice", bson.D{{"$avg", "$price"}}}}}},
	}
	aggCursor, err := collection.Aggregate(ctx, pipeline)
	if err != nil {
		log.Fatalf("aggregate error: %v", err)
	}
	defer aggCursor.Close(ctx)
	fmt.Println("Average price by category (in-stock):")
	for aggCursor.Next(ctx) {
		var a aggRes
		if err := aggCursor.Decode(&a); err != nil {
			log.Printf("decode agg error: %v", err)
			continue
		}
		fmt.Printf("Category: %s, Avg Price: %.2f\n", a.ID, a.AvgPrice)
	}

	// Part G: Graceful shutdown (listen for SIGINT/SIGTERM)
	// (In a real app, you'd keep running and handle signals to disconnect)
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	fmt.Println("Shutting down gracefully...")
	if err := client.Disconnect(context.Background()); err != nil {
		log.Fatalf("disconnect error: %v", err)
	}
}
```

Notes for the exercise:
- Replace the URI with your actual MongoDB deployment (including authentication if needed).
- Run MongoDB locally or use a cloud-hosted instance for testing.
- The starter code includes all parts A–G in a single file. You may split into multiple files or functions as you refactor for readability.

Line-by-line explanation is provided in each code block above to help you connect theory with practical implementation.

End of lesson.