# NoSQL Databases — MongoDB & When to Use Them

MongoDB is a flexible, document-oriented NoSQL database that excels at storing unstructured or semi-structured data, scaling horizontally, and enabling rapid development with evolving schemas. In professional backend work, understanding when to use MongoDB, how to model data, and how to optimize for performance is essential for building resilient, scalable systems. This lesson walks you through core concepts, practical Node.js examples, and production considerations tailored for backend engineers.

## 1. Getting Started with MongoDB in Node.js

This section covers the basics: connecting to a MongoDB instance, creating a database/collection, and performing simple CRUD operations using the native MongoDB Node.js driver.

```javascript
// 1. Getting Started with MongoDB in Node.js
const { MongoClient, ObjectId } = require('mongodb');

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function run() {
  try {
    // 2. Connect to MongoDB
    await client.connect();

    // 3. Select database and collection
    const db = client.db('backend_training');
    const posts = db.collection('posts');

    // 4. Create: insert a sample document
    const result = await posts.insertOne({
      title: 'Intro to MongoDB',
      author: 'Alice',
      createdAt: new Date(),
      content: 'MongoDB stores data as BSON documents.'
    });
    console.log('Inserted _id:', result.insertedId);

    // 5. Read: find a document by _id
    const doc = await posts.findOne({ _id: result.insertedId });
    console.log('Query result:', doc);

    // 6. Update: modify a field
    await posts.updateOne({ _id: result.insertedId }, { $set: { title: 'Intro to MongoDB (Updated)' } });

    // 7. Delete: remove the document
    await posts.deleteOne({ _id: result.insertedId });

  } finally {
    // 8. Close connection
    await client.close();
  }
}
run().catch(console.error);
```

### Line-by-line explanation breaking down each line

1. Import MongoClient and ObjectId from the official MongoDB driver.
2. Define the connection URI, allowing an env var override and defaulting to localhost.
3. Create a new MongoClient with modern options for parsing and topology.
4. Define an async function to perform DB operations.
5. Connect to MongoDB. This initializes the client session.
6. Select the database name used for this lesson.
7. Access the posts collection within that database.
8. Insert a sample document to demonstrate creation.
9. Log the newly created document’s ObjectId.
10. Retrieve the inserted document by its _id to demonstrate reading.
11. Log the retrieved document.
12. Update the inserted document’s title to show an update operation.
13. Delete the document to demonstrate removal.
14. Finally block ensures the client connection is closed even if an error occurs.
15. Execute the run function and catch any errors to avoid unhandled rejections.

## 2. Data Modeling: Embedding vs Referencing

MongoDB supports flexible schemas. You can either embed related data within a single document or reference separate collections. This section shows two patterns using a blog-like example: embedding comments vs referencing comments in a separate collection.

### 2A. Embedding: Comments inside a Post

```javascript
// Embedding: Post document contains an array of embedded comments
async function insertPostWithComments(db) {
  const posts = db.collection('posts');
  const post = {
    title: 'NoSQL Modeling Patterns',
    author: 'Jordan',
    createdAt: new Date(),
    content: 'Embedding is great for data that is tightly bound to the parent.',
    comments: [
      { user: 'Sam', text: 'Very insightful!', date: new Date() },
      { user: 'Alex', text: 'Clear differences vs SQL.', date: new Date() }
    ]
  };
  const result = await posts.insertOne(post);
  return result.insertedId;
}
```

### Line-by-line explanation breaking down each line

1. Define an async function to insert a post with embedded comments.
2. Get the posts collection from the database.
3. Build a post document with an embedded comments array.
4. Insert the post into the collection.
5. Return the inserted ObjectId for reference.

### 2B. Referencing: Separate Posts and Comments Collections

```javascript
// Referencing: Separate collections for posts and comments
async function insertPostWithReferences(db) {
  const posts = db.collection('posts');
  const comments = db.collection('comments');

  // Create a post document
  const postResult = await posts.insertOne({
    title: 'NoSQL Modeling Patterns',
    author: 'Jordan',
    createdAt: new Date(),
    content: 'Referencing allows flexible comment management and growth.'
  });
  const postId = postResult.insertedId;

  // Create a separate comments document referencing the postId
  await comments.insertOne({
    postId,
    user: 'Sam',
    text: 'This approach scales well for many-to-one relationships.',
    date: new Date()
  });

  return postId;
}
```

### Line-by-line explanation breaking down each line

1. Define an async function to insert a post and a separate comment linked by postId.
2. Get the posts and comments collections from the database.
3. Insert a post document without nested comments.
4. Capture the inserted post’s _id to reference from comments.
5. Insert a comment document that references the post via postId.
6. Return the created postId for confirmation or further operations.

## 3. Indexing and Query Performance

Indexes dramatically improve read performance for common queries. This section demonstrates creating a compound index and performing a query that benefits from it, plus validating index usage with explain.

```javascript
async function ensureIndexes(db) {
  const posts = db.collection('posts');

  // Create a compound index on author (ascending) and createdAt (descending)
  const idxName = await posts.createIndex({ author: 1, createdAt: -1 }, { name: 'idx_author_created' });
  console.log('Created index:', idxName);

  // Sample query that benefits from the index
  const cursor = posts.find({ author: 'Jordan' }).sort({ createdAt: -1 }).limit(5);

  // Use explain to inspect the query plan
  const explainPlan = await cursor.explain('executionStats');
  console.log('Explain plan:', JSON.stringify(explainPlan, null, 2));

  const results = await cursor.toArray();
  return results;
}
```

### Line-by-line explanation breaking down each line

1. Define an async function to ensure necessary indexes exist and to run a representative query.
2. Access the posts collection.
3. Create a compound index on author (ascending) and createdAt (descending). The index improves queries filtering by author and ordering by date.
4. Log the name of the created index for verification.
5. Build a query that finds papers by a specific author and sorts by date, limited to 5 results.
6. Run explain on the query to inspect the execution plan and index usage.
7. Print the explain plan to stdout for inspection.
8. Execute the query and collect results as an array.
9. Return the results for further processing.

### Line-by-line explanation (optional quick recap)

- This section highlights why compound indexes help for common read patterns and how to inspect query plans to confirm index usage.

## 4. When to Use MongoDB: Practical Guidelines

MongoDB shines in scenarios with flexible schemas, evolving data models, and high write throughput. It’s well-suited for:

- Dynamic or semi-structured data (e.g., user profiles with varying fields)
- Large-scale unstructured content (logs, events, content management)
- Iterative development where schemas evolve quickly
- High-velocity writes with simple transactional needs (multi-document transactions exist but are nuanced)
- Geographically distributed deployments with horizontal scalability (sharding)

Key production considerations:
- Data modeling choice (embedding vs referencing) based on read/write patterns, document size, and growth.
- Index strategy tailored to query patterns; monitor index cardinality and write overhead.
- Consistency models: eventual consistency vs strong consistency in certain replica set configurations.
- Operational concerns: backups, monitoring, security, and schema migrations.
- Migration paths: when to denormalize or split collections; plan for resizing or reindexing.

Code example: a simple aggregation example for embedded comments to demonstrate analytics over nested data

```javascript
// Aggregation over embedded comments to compute average comments per post
async function averageCommentsPerPost(db) {
  const posts = db.collection('posts');
  const pipeline = [
    { $project: { _id: 0, title: 1, author: 1, commentCount: { $size: { $ifNull: ['$comments', []] } } } },
    { $group: { _id: '$author', averageComments: { $avg: '$commentCount' }, totalPosts: { $sum: 1 } } },
  ];
  const result = await posts.aggregate(pipeline).toArray();
  return result;
}
```

### Line-by-line explanation breaking down each line

1. Define an async function to compute analytics across posts with embedded comments.
2. Access the posts collection.
3. Build an aggregation pipeline:
   - Project each doc to include author and a derived commentCount (size of comments array, defaulting to empty array if missing).
4. Group results by author, computing the average number of comments per post and the total number of posts per author.
5. Execute the aggregation and return the results as an array.

## X. Common Beginner Mistakes

Below are common pitfalls with MongoDB and Node.js, shown with bad vs good code.

- Pitfall 1: Treating MongoDB like a relational database with joins without using proper aggregation
  - Bad:
  ```javascript
  // Attempting to join across collections in application code
  const user = await db.collection('users').findOne({ _id: userId });
  const post = await db.collection('posts').findOne({ userId: user._id });
  ```
  - Good:
  ```javascript
  // Use aggregation with $lookup to join in the database
  const result = await db.collection('users').aggregate([
    { $match: { _id: userId } },
    { $lookup: {
        from: 'posts',
        localField: '_id',
        foreignField: 'userId',
        as: 'posts'
      }
    }
  ]).toArray();
  ```

- Pitfall 2: Mixing string IDs with ObjectId without conversion
  - Bad:
  ```javascript
  const doc = await db.collection('posts').findOne({ _id: '60d5f...' });
  ```
  - Good:
  ```javascript
  const { ObjectId } = require('mongodb');
  const doc = await db.collection('posts').findOne({ _id: ObjectId('60d5f...') });
  ```

- Pitfall 3: Not defining or using indexes for common read patterns
  - Bad:
  ```javascript
  const results = await db.collection('comments').find({ authorId: userId }).toArray();
  ```
  - Good:
  ```javascript
  // Ensure index exists for fast lookup by author
  await db.collection('comments').createIndex({ authorId: 1 });
  const results = await db.collection('comments').find({ authorId: userId }).toArray();
  ```

- Pitfall 4: Returning entire documents when only a few fields are needed
  - Bad:
  ```javascript
  const docs = await db.collection('posts').find({}).toArray();
  ```
  - Good:
  ```javascript
  const docs = await db.collection('posts').find({}, { projection: { title: 1, author: 1 } }).toArray();
  ```

- Pitfall 5: Skipping error handling and retry on transient failures
  - Bad:
  ```javascript
  await client.connect();
  const db = client.db('db');
  // ... operations
  ```
  - Good:
  ```javascript
  async function withRetry(fn, retries = 3) {
    let attempt = 0;
    while (attempt < retries) {
      try { return await fn(); } catch (e) {
        attempt++;
        if (attempt === retries) throw e;
        await new Promise(res => setTimeout(res, 1000 * attempt));
      }
    }
  }
  await withRetry(async () => client.connect());
  ```

## Y. Why This Matters In Real Systems

In production, the right NoSQL approach hinges on practical tradeoffs:

- Data shape and access patterns drive modeling decisions. Embedding speeds reads for document-local access but can bloat documents; referencing keeps documents lean but requires additional queries or lookups.
- Indexing is essential but costly for write-heavy workloads. A balance of read performance and write throughput must be found.
- Operations: backups, replica sets, and sharding enable resilience and scale. Plan for failure domains, network partitions, and data locality.
- Migration and schema evolution: without rigid schemas, you must design for incremental changes and minimize downtime during migrations (e.g., incremental denormalization or phased refactors).
- Security and compliance: ensure proper authentication, authorization, encryption at rest/in transit, and least-privilege access to collections and operations.
- Observability: monitor query performance with explain plans, index hit rates, and slow query logs. Instrument with metrics and tracing for distributed systems.

In real systems, MongoDB is frequently used for content catalogs, user profiles with variable fields, event data, and microservices data stores where schema evolution and horizontal scaling are top priorities.

## Z. Study Questions

1. What distinguishes a NoSQL document store like MongoDB from a traditional relational database?
2. When would you choose embedding over referencing, and what are the tradeoffs?
3. How do compound indexes improve query performance? Provide a scenario where a compound index helps.
4. What is the purpose of the $lookup stage in MongoDB aggregations?
5. Name at least three production considerations (beyond code) when running MongoDB in a real system.

## Exercise

Complete the multi-part coding challenge to solidify your understanding of MongoDB in Node.js.

Part A — Environment Setup
- Create a Node.js project and install the official MongoDB driver.
- Write a script that connects to a local MongoDB instance and ensures a database named backend_training with a collection named posts.

Part B — Data Modeling Choice
- Implement two small scripts (or functions) demonstrating both embedding and referencing:
  - Embedding: Post document with an embedded comments array (2–3 comments).
  - Referencing: Post document and a separate comments collection with postId references.

Part C — Indexing and Queries
- Create an index on posts for { author: 1, createdAt: -1 } and verify with explain().
- Write a function to fetch the latest 5 posts by a given author, returning only title and createdAt.

Part D — Aggregation
- Write an aggregation pipeline that computes, for each author, the average number of comments per post (assuming embedded comments), and the total number of posts.

Part E — Migration Practice (Optional)
- Given a scenario where you start with embedded comments, write a migration script to move comments into a separate comments collection, and adjust the original post to store only a comment count.

Deliverables:
- A Git repository with the Node.js scripts and a README outlining setup instructions, commands to run each part, and expected outputs.
- Ensure your code uses async/await, proper error handling, and clean separation of concerns (e.g., a small module for database access).
- Include at least one test-like snippet demonstrating a failure retry pattern for transient connection issues.

This completes a practical, multi-part exercise that reinforces data modeling decisions, indexing, querying, and basic migrations in MongoDB with Node.js.