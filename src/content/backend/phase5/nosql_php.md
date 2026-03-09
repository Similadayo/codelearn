# NoSQL Databases — MongoDB & When to Use Them (PHP)

MongoDB is a document-oriented NoSQL database that stores data as flexible, JSON-like documents (BSON). In production PHP apps, MongoDB offers rapid development with evolving schemas, horizontal scalability, and powerful indexing. This lesson gives you a practical, PHP-focused tour: how to connect, perform CRUD, model data, decide when to use MongoDB, and avoid common beginner mistakes in real systems.

## 1. Understanding MongoDB in PHP: concepts and when it fits

MongoDB stores data in collections of documents. Each document is a self-contained unit with fields, values, and a unique _id. Collections are schemaless, but you still benefit from consistent data shapes, indexes, and well-chosen data modeling strategies (embedded vs. referenced). Use cases include content catalogs, analytics, user activity streams, and any workload with flexible schemas or high write throughput.

Code example: basic PHP connection and a simple query

```php
// composer require mongodb/mongodb
require 'vendor/autoload.php';
use MongoDB\Client;

// Connect to a MongoDB instance (local or Atlas)
$uri = 'mongodb://localhost:27017';
$client = new Client($uri);

// Pick a database and collection
$db = $client->selectDatabase('blog');
$posts = $db->selectCollection('posts');

// Simple read: find all posts with a given title
$cursor = $posts->find(['title' => 'Introducing MongoDB with PHP']);
foreach ($cursor as $doc) {
    // process each document
    print_r($doc);
}
```

### Line-by-line explanation
- // composer require mongodb/mongodb
  - This comment reminds you to install the PHP MongoDB library via Composer.
- require 'vendor/autoload.php';
  - Loads the Composer-generated autoloader so PHP can load the MongoDB classes.
- use MongoDB\Client;
  - Imports the MongoDB\Client class for convenient access to the API.
- $uri = 'mongodb://localhost:27017';
  - DSN for connecting to a MongoDB instance. Could be a localhost, a replica set, or a cloud Atlas URI.
- $client = new Client($uri);
  - Creates a MongoDB client instance using the DSN.
- $db = $client->selectDatabase('blog');
  - Selects (or creates) the database named “blog”.
- $posts = $db->selectCollection('posts');
  - Selects (or creates) the collection named “posts”.
- $cursor = $posts->find(['title' => 'Introducing MongoDB with PHP']);
  - Executes a simple query to find documents where title matches the value.
- foreach ($cursor as $doc) { print_r($doc); }
  - Iterates over the result set and prints each document.

## 2. Connecting PHP to MongoDB securely and effectively

Setting up a robust connection involves choosing a DSN (local, replica set, or cloud), handling credentials securely, and option tuning (timeouts, collections, and client behavior).

Code example: secure connection and basic client options

```php
require 'vendor/autoload.php';
use MongoDB\Client;

$dsn = getenv('MONGODB_URI') ?: 'mongodb://localhost:27017';
$options = [
    'serverSelectionTryOnce' => true,
    'socketTimeoutMS' => 5000,
    'connect' => true,
    // If using TLS/SSL in production:
    // 'tls' => true,
    // 'tlsCAFile' => '/path/to/ca.pem',
];

$client = new Client($dsn, $options);

$db = $client->selectDatabase('blog');
$tagsCol = $db->selectCollection('tags');
```

### Line-by-line explanation
- require 'vendor/autoload.php';
  - Loads Composer dependencies.
- use MongoDB\Client;
  - Namespace import for easier usage.
- $dsn = getenv('MONGODB_URI') ?: 'mongodb://localhost:27017';
  - Reads a secure URI from an environment variable or falls back to a local instance.
- $options = [ ... ];
  - Configures client behavior: attempts one server selection, short socket timeout, explicit connect.
  - TLS options are shown as comments for secure deployments.
- $client = new Client($dsn, $options);
  - Creates the MongoDB client with the DSN and options.
- $db = $client->selectDatabase('blog');
  - Chooses the database to operate on.
- $tagsCol = $db->selectCollection('tags');
  - Chooses a collection for tag-related queries.

## 3. Basic CRUD operations in PHP with MongoDB

CRUD operations are the core of interacting with MongoDB. The PHP driver provides insertOne, find, updateOne, and deleteOne as primary methods.

Code block: Create (insertOne)

```php
$article = [
    'title' => 'A Practical Guide to MongoDB with PHP',
    'author' => 'Alex Doe',
    'content' => 'This article demonstrates CRUD with MongoDB in PHP.',
    'tags' => ['php', 'mongodb', 'nosql'],
    'createdAt' => new MongoDB\BSON\UTCDateTime()
];

$insertOneResult = $collection->insertOne($article);
$insertedId = (string)$insertOneResult->getInsertedId();
```

### Line-by-line explanation
- $article = [ ... ];
  - Creates an associative array representing a MongoDB document with fields like title, author, content, tags, and a timestamp.
- 'createdAt' => new MongoDB\BSON\UTCDateTime()
  - Stores the creation time as a BSON UTCDateTime object for precise time handling.
- $insertOneResult = $collection->insertOne($article);
  - Inserts the document into the collection; returns an InsertOneResult object.
- $insertedId = (string)$insertOneResult->getInsertedId();
  - Fetches the generated ObjectId and casts it to string for subsequent operations.

Code block: Read (find)

```php
// Read by title
$cursor = $collection->find(['title' => 'A Practical Guide to MongoDB with PHP'], [
    'projection' => ['title' => 1, 'author' => 1, '_id' => 0],
    'sort' => ['createdAt' => -1],
    'limit' => 5
]);

foreach ($cursor as $doc) {
    print_r($doc);
}
```

### Line-by-line explanation
- $cursor = $collection->find([...], [...]);
  - Executes a query with a filter, projection, sort order, and limit.
- 'projection' => ['title' => 1, 'author' => 1, '_id' => 0];
  - Limits returned fields to title and author; omits the internal _id.
- 'sort' => ['createdAt' => -1];
  - Sorts results by creation time descending.
- 'limit' => 5;
  - Returns at most five documents.
- foreach ($cursor as $doc) { print_r($doc); }
  - Iterates and prints retrieved documents.

Code block: Update (updateOne)

```php
$updateResult = $collection->updateOne(
    ['_id' => new MongoDB\BSON\ObjectId($insertedId)],
    ['$set' => ['content' => 'Updated content for the article.']]
);

if ($updateResult->getModifiedCount() > 0) {
    echo "Document updated.";
}
```

### Line-by-line explanation
- $updateResult = $collection->updateOne(filter, update);
  - Finds a single document by _id and applies updates.
- ['_id' => new MongoDB\BSON\ObjectId($insertedId)]
  - Converts the stored string ID back into an ObjectId for the query.
- ['$set' => ['content' => 'Updated content...']]
  - Sets the content field to the new value.
- if ($updateResult->getModifiedCount() > 0) { ... }
  - Checks whether a document was actually modified and reports status.

Code block: Delete (deleteOne)

```php
$deleteResult = $collection->deleteOne(['_id' => new MongoDB\BSON\ObjectId($insertedId)]);

if ($deleteResult->getDeletedCount() > 0) {
    echo "Document deleted.";
}
```

### Line-by-line explanation
- $deleteResult = $collection->deleteOne(filter);
  - Deletes a single document matching the filter.
- ['_id' => new MongoDB\BSON\ObjectId($insertedId)]
  - Uses ObjectId to locate the exact document.
- if ($deleteResult->getDeletedCount() > 0) { ... }
  - Confirms deletion occurred.

## 4. Data modeling in MongoDB: embedded vs referenced patterns and indexing

MongoDB supports flexible document forms. The choice between embedding related data inside a document or placing it in separate collections affects read/write patterns, atomicity, and document size.

Code block: Embedded pattern (single document with nested comments)

```php
$articleWithComments = [
    'title' => 'Embedded vs Referenced in MongoDB',
    'author' => 'Sam Lee',
    'content' => 'Demonstrating embedded comments.',
    'comments' => [
        [
            'author' => 'Jane',
            'text' => 'Great post!',
            'createdAt' => new MongoDB\BSON\UTCDateTime()
        ],
        [
            'author' => 'Alex',
            'text' => 'Helpful example.',
            'createdAt' => new MongoDB\BSON\UTCDateTime()
        ]
    ],
    'createdAt' => new MongoDB\BSON\UTCDateTime()
];

$collection->insertOne($articleWithComments);
```

### Line-by-line explanation
- $articleWithComments = [ ... ];
  - Creates a post document with an embedded array of comments.
- 'comments' => [ [...], [...] ]
  - A nested array of comment documents stored inside the article document.
- $collection->insertOne($articleWithComments);
  - Persists the article and all embedded comments in a single document.

Code block: Referenced pattern (separate comments collection)

```php
$article = [
    'title' => 'Referencing in MongoDB',
    'author' => 'Sam Lee',
    'content' => 'Storing a separate comments collection.',
    'createdAt' => new MongoDB\BSON\UTCDateTime(),
    // Keep a reference to related comments
    'commentIds' => []
];
$articleId = (string) $collection->insertOne($article)->getInsertedId();

// Insert related comments in a separate collection
$comments = $db->selectCollection('comments');
$comment1 = [
    'articleId' => new MongoDB\BSON\ObjectId($articleId),
    'author' => 'Jane',
    'text' => 'Nice post',
    'createdAt' => new MongoDB\BSON\UTCDateTime()
];
$comment2 = [
    'articleId' => new MongoDB\BSON\ObjectId($articleId),
    'author' => 'Alex',
    'text' => 'Thanks for the example',
    'createdAt' => new MongoDB\BSON\UTCDateTime()
];
$comments->insertMany([$comment1, $comment2]);
```

### Line-by-line explanation
- $article = [ ... ];
  - Creates a post document with a placeholder for commentIds to illustrate referencing.
- $articleId = (string) $collection->insertOne($article)->getInsertedId();
  - Inserts the article and captures its new ObjectId as a string.
- $comments = $db->selectCollection('comments');
  - Opens a separate collection for comments.
- $comment1 / $comment2 = [ ... ];
  - Each comment includes articleId as a foreign key reference to the article.
- $comments->insertMany([$comment1, $comment2]);
  - Inserts the related comments in their own collection.

Code block: Indexing for performance

```php
// Create an index to speed up queries on title and createdAt
$collection->createIndex(['title' => 1]);
$collection->createIndex(['createdAt' => -1]);

// In the referenced model, index the foreign key for comments
$comments->createIndex(['articleId' => 1]);
```

### Line-by-line explanation
- $collection->createIndex(['title' => 1]);
  - Creates an ascending index on the title field to optimize text lookups.
- $collection->createIndex(['createdAt' => -1]);
  - Creates a descending index on createdAt to support recent-item queries.
- $comments->createIndex(['articleId' => 1]);
  - Indexes the foreign key in the comments collection for efficient article-based joins (manual joins in PHP).

## 5. When to use MongoDB with PHP: decision guidelines and trade-offs

- Flexible schemas and evolving data needs: use MongoDB when documents naturally vary and you want rapid iterations.
- High write throughput and simple queries: MongoDB excels with append-heavy workloads and fast reads on indexed fields.
- Complex relational data or multi-document transactions: consider whether to embed or reference; for complex relations or multi-document consistency, you may still need relational patterns or MongoDB transactions (supported in replica sets and Atlas).
- When to avoid: highly normalized data with frequent cross-collection joins, or workloads requiring strict SQL-style guarantees and complex transactions across many entities.
- Operational considerations: plan for indexing strategy, backup/restore, monitoring, and, if scale is a concern, look at replica sets, sharding, and potentially using MongoDB Atlas for managed infrastructure.

Code snippet: small decision helper illustrating embedded vs referenced choice (conceptual)

```php
function shouldEmbed(array $fields) {
    // If a sub-array (like comments) grows unbounded or is frequently updated independently, prefer referencing.
    $subarrays = ['comments', 'tags', 'attachments'];
    foreach ($subarrays as $name) {
        if (isset($fields[$name]) && is_array($fields[$name]) && count($fields[$name]) > 10) {
            return false; // prefer referencing for large or frequently updated sub-docs
        }
    }
    return true;
}
```

### Line-by-line explanation
- function shouldEmbed(array $fields) { ... }
  - A simple heuristic function to illustrate decision logic for embedding vs referencing.
- $subarrays = ['comments', 'tags', 'attachments'];
  - Names of nested structures considered in the heuristic.
- if (isset($fields[$name]) && is_array($fields[$name]) && count($fields[$name]) > 10) { return false; }
  - If a nested array is large, embedding may become unwieldy; prefer references.
- return true;
  - Default to embedding if small/simple nested structures.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Treating ObjectId as a string without conversion
Bad:
```php
// Incorrect: using string ID directly in query
$collection->find(['_id' => $insertedId]);
```

Good:
```php
// Correct: convert to ObjectId for the query
$collection->find(['_id' => new MongoDB\BSON\ObjectId($insertedId)]);
```

### Line-by-line explanation (bad)
- $collection->find(['_id' => $insertedId]);
  - Passes a string as _id; the query will fail to match.
### Line-by-line explanation (good)
- $collection->find(['_id' => new MongoDB\BSON\ObjectId($insertedId)]);
  - Converts the string to an ObjectId to correctly match the document.

- Pitfall 2: Not adding indexes for frequent query fields
Bad:
```php
// No index on fields used in queries
$cursor = $collection->find(['title' => 'Popular Post']);
```

Good:
```php
$collection->createIndex(['title' => 1]); // index recommended
$cursor = $collection->find(['title' => 'Popular Post']);
```

### Line-by-line explanation (bad)
- $collection->find(['title' => 'Popular Post']);
  - Query may be slow as it scans the collection.

### Line-by-line explanation (good)
- $collection->createIndex(['title' => 1]);
  - Creates an index to optimize lookups by title.
- $cursor = $collection->find(['title' => 'Popular Post']);
  - Now uses the index for faster retrieval.

- Pitfall 3: Large embedded documents grow unbounded
Bad:
```php
// Embedding everything, including user profiles
$doc = [
  'title' => 'Big Post',
  'content' => '...',
  'author' => [
    'name' => 'Alex',
    'email' => 'alex@example.com',
    'bio' => 'Long bio here...',
    // potentially lots more profile data
  ]
];
$collection->insertOne($doc);
```

Good:
```php
// Embedding only lightweight author id; fetch details separately when needed
$doc = [
  'title' => 'Big Post',
  'content' => '...',
  'authorId' => new MongoDB\BSON\ObjectId('60c72b2f9b1e8b3f5d3f5c1a')
];
$collection->insertOne($doc);

// In a separate query when needed:
$authors = $db->selectCollection('authors');
$authorDetails = $authors->findOne(['_id' => $doc['authorId']]);
```

### Line-by-line explanation (bad)
- Embedding entire user profile leads to oversized documents and slower updates.

### Line-by-line explanation (good)
- Use authorId as a reference and fetch author details on demand or via a separate lookup, keeping the post document lean.

- Pitfall 4: Poor error handling and silent failures
Bad:
```php
$collection->insertOne($document); // no error handling
```

Good:
```php
try {
    $result = $collection->insertOne($document);
    if ($result->getInsertedCount() === 1) {
        // success
    }
} catch (Exception $e) {
    // log and handle the error gracefully
    error_log('MongoDB insert failed: ' . $e->getMessage());
}
```

### Line-by-line explanation (bad)
- $collection->insertOne($document);
  - Executes but silently fails if an exception occurs or constraints are violated.

### Line-by-line explanation (good)
- try { $result = $collection->insertOne($document); ... } catch (Exception $e) { ... }
  - Wraps in a try/catch to surface and handle errors properly.

## Y. Why This Matters In Real Systems — production context

- Reliability and observability: MongoDB PHP drivers expose operation results, generated IDs, and error details. In production, log outcomes, monitor write concerns, and capture exceptions to alert on issues.
- Performance tuning: Indexing, appropriate data modeling, and query shaping are essential to achieve predictable latency. Start with default indexes and iteratively refine based on query patterns.
- Operational considerations: Use replica sets for high availability, enable backups, and consider sharding for horizontal scaling if your data or traffic grows significantly. For managed environments, MongoDB Atlas can simplify many operational tasks.
- Consistency vs availability: MongoDB offers tunable read/write concerns. Choose appropriate settings (readPreference, writeConcern) based on your service-level requirements.
- Security posture: Enforce authentication, least privilege users, encrypted connections (TLS/SSL), and rotate credentials. Use environment variables for credentials and avoid hardcoding secrets.

## Z. Study Questions — 5 recall questions

1) What is a document in MongoDB, and how does it relate to a JSON-like structure in PHP?  
2) How do you convert a string ID to an ObjectId in PHP when querying by _id?  
3) Why would you choose embedding vs referencing for related data? Give one example each.  
4) What is the purpose of creating indexes in MongoDB, and how do you create one in PHP?  
5) Name two essential production considerations when using MongoDB with PHP (e.g., replication, transactions, security).

## Exercise — practical multi-part coding challenge

Goal: Build a small PHP module to manage articles with comments in MongoDB, using either embedded or referenced data patterns. Deliverables: a PHP script or class(es) that can connect, insert articles, add comments, fetch articles with comments, and demonstrate indexing.

Part A — Setup and connection
- Task: Install the PHP MongoDB driver (composer require mongodb/mongodb), and write a small script that connects to MongoDB using a DSN from an environment variable.
- Deliverable: A script named tools/db_connect.php that exposes a $db or $collection handle for further operations.

Part B — Create articles with an embedded comments approach
- Task: Implement a function to insert an article with an initial set of comments embedded inside the article document.
- Deliverable: A PHP function insertArticleWithComments($title, $author, $content, array $initialComments) that stores the article with embedded comments.

Part C — Read articles with embedded comments (or a subset)
- Task: Implement a function getRecentArticles(int $limit) that returns the latest articles with embedded comments (if any).
- Deliverable: Function and sample usage.

Part D — Indexing and performance test
- Task: Create an index on article title and on createdAt; demonstrate a query by title and a separate query by a date range.
- Deliverable: Code to createIndex for both fields and two sample queries with explanation of expected performance differences.

Part E — Refactoring to a referenced model (optional extension)
- Task: Refactor Part B and Part C to use a separate comments collection with articleId as a reference, and adjust queries accordingly.
- Deliverable: A small refactor plan and prototype code showing how to fetch articles with their comments via a join-like approach in PHP (manual lookup).

Hints and constraints
- Use MongoDB\BSON\ObjectId for _id handling and MongoDB\BSON\UTCDateTime for timestamps.
- Demonstrate error handling with try/catch blocks around write operations.
- Keep the code readable and modular; consider placing shared connection logic in a class like MongoDBDatabase or MongoStore.
- Include comments in code to explain design decisions (embedded vs referenced) and indexing choices.

This completes a focused, PHP-oriented lesson on NoSQL with MongoDB, covering core concepts, practical code, pitfalls, production considerations, and hands-on exercises.