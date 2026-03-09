# NoSQL Databases — MongoDB & When to Use Them (Ruby)

MongoDB is a leading document-oriented NoSQL database that excels when you need flexible schemas, rapid iteration, and scalable, horizontally distributable data stores. In backend engineering, choosing MongoDB can dramatically accelerate feature delivery for workloads with evolving data models, rich nested data, and high write/read throughput. This lesson focuses on MongoDB in a Ruby environment, showing how to model data, set up a Ruby app with Mongoid, perform common operations, and reason about when MongoDB is the right choice in real systems.

## 1. MongoDB Basics in Ruby: Document Model and When to Use Them

MongoDB stores data as JSON-like documents inside collections. Documents can have varying structures, nest arrays and sub-documents, and adapt as requirements evolve. This flexibility is powerful for quickly iterating features and modeling real-world hierarchical data (users, addresses, orders, etc.). However, without careful design, you can undermine performance and consistency.

```ruby
# Conceptual example: a single user document with embedded data
document = {
  _id: "507f1f77bcf86cd799439011",
  name: "Alice",
  email: "alice@example.com",
  addresses: [
    { street: "123 Main St", city: "Hometown", country: "US" }
  ],
  orders: [
    { order_id: "ORD1001", total: 29.99, items: [{ sku: "SKU123", qty: 2 }] }
  ]
}
```

### Line-by-line explanation
- document = { ... }: Defines a Ruby hash representing a MongoDB document ready to be stored in a collection.
- _id: "507f1f77bcf86cd799439011": Unique identifier for the document (MongoDB typically generates this).
- name: "Alice", email: "alice@example.com": Simple top-level fields.
- addresses: [ ... ]: An array of embedded address documents (nested data).
- orders: [ ... ]: An array of embedded order documents, each with nested items.
- This structure demonstrates MongoDB’s schema-less, nested-document model ideal for flexible hierarchies.

## 2. Setting Up Ruby with MongoDB (Mongoid) and Basic CRUD

In Ruby, Mongoid is the idiomatic ODM (Object-Document Mapper) that maps Ruby classes to MongoDB documents. This section shows how to set up Mongoid, model simple entities, and perform create/read/update/delete operations.

```ruby
# Gemfile
source "https://rubygems.org"

gem "mongoid", "~> 7.3"
```

### Line-by-line explanation
- source "https://rubygems.org": Declares the gem source.
- gem "mongoid", "~> 7.3": Adds Mongoid as a dependency for ORM-like mapping to MongoDB.

```yaml
# config/mongoid.yml
development:
  clients:
    default:
      database: myapp_development
      hosts:
        - 127.0.0.1:27017
```

### Line-by-line explanation
- development: Environment-specific settings.
- clients.default.database: Name of the MongoDB database.
- hosts: List of MongoDB host:port addresses (local in this example).

```ruby
# app/models/user.rb
class User
  include Mongoid::Document

  field :name,  type: String
  field :email, type: String

  embeds_many :addresses
  embeds_many :orders
end

# app/models/address.rb
class Address
  include Mongoid::Document
  field :street, type: String
  field :city,   type: String
  field :country, type: String

  embedded_in :user
end

# app/models/order.rb
class Order
  include Mongoid::Document
  field :order_id, type: String
  field :total,    type: Float

  embeds_many :items
  embedded_in :user
end

# app/models/item.rb
class Item
  include Mongoid::Document
  field :sku, type: String
  field :qty, type: Integer

  embedded_in :order
end
```

### Line-by-line explanation
- class User ... end: Defines a User document with fields and embedded associations.
- include Mongoid::Document: Enables Mongoid document behavior.
- field :name, :email: Declares top-level fields with explicit types.
- embeds_many :addresses / :orders: Declares embedded relationships (arrays of sub-documents).
- class Address / class Order / class Item follow the same pattern for their respective fields.
- embedded_in :user / :order: Sets the parent reference for embedded documents.

```ruby
# CREATE / UPDATE / READ using Mongoid
user = User.create(
  name:  "Alice",
  email: "alice@example.com",
  addresses: [
    { street: "123 Main St", city: "Hometown", country: "US" }
  ],
  orders: [
    { order_id: "ORD1001", total: 29.99, items: [{ sku: "SKU123", qty: 2 }] }
  ]
)

puts "Created user: #{user.inspect}"
```

### Line-by-line explanation
- User.create(...): Creates a new User document with embedded addresses and orders. Mongoid coerces nested hashes into embedded documents.
- name:, email:, addresses:, orders:: Top-level and embedded fields populated to demonstrate nested data modeling.
- puts "Created user: ..." : Simple confirmation output.

```ruby
# QUERY example
found = User.where(email: "alice@example.com").first
puts "Found user: #{found.name} (#{found.email})"
```

### Line-by-line explanation
- User.where(email: "...").first: Queries for a user by email and returns the first match.
- found.name / found.email: Accesses fields on the retrieved document.

## 3. Working with Arrays and Embedded Documents, Indexing, and Querying

Embedded documents enable rich queries over nested data. Proper indexing is crucial for performance when you search on embedded fields.

```ruby
# index definitions (top-level and embedded)
class User
  include Mongoid::Document
  field :name,  type: String
  field :email, type: String

  index({ email: 1 }, { unique: true })
  index({ 'addresses.city' => 1 })
  embeds_many :addresses
  embeds_many :orders
end
```

### Line-by-line explanation
- index({ email: 1 }, { unique: true }): Creates a unique index on the top-level email field to enforce uniqueness and speed up lookups by email.
- index({ 'addresses.city' => 1 }): Creates an index on embedded addresses by city, enabling efficient queries like where addresses.city == "Seattle".

```ruby
# Find users who live in a given city (embedded query)
city = "Seattle"
users_in_city = User.where('addresses.city' => city).to_a
puts "Users in #{city}: #{users_in_city.map(&:name).join(', ')}"
```

### Line-by-line explanation
- User.where('addresses.city' => city): Queries for users whose embedded addresses contain a city equal to the specified value.
- to_a: Converts the result into an array for easy enumeration.
- prints user names found in that city.

```ruby
# Update an embedded document
user = User.find_by(email: 'alice@example.com')
addr = user.addresses.find_by(city: 'Hometown')
addr.street = '124 Main St'
user.save
```

### Line-by-line explanation
- User.find_by(email: ...): Locates the user by email.
- user.addresses.find_by(city: 'Hometown'): Locates the embedded address with a matching city.
- addr.street = '124 Main St': Updates a nested field on the embedded document.
- user.save: Persists changes to the parent User document (embedded docs saved with it).

```ruby
# Add a new embedded document
user.addresses << Address.new(street: '500 Market St', city: 'Portland', country: 'US')
user.save
```

### Line-by-line explanation
- user.addresses << Address.new(...): Appends a new embedded address to the user.
- user.save: Persists the updated parent document with the new embedded address.

```ruby
# Remove an embedded document
address = user.addresses.find_by(city: 'Hometown')
user.addresses.delete(address)
user.save
```

### Line-by-line explanation
- user.addresses.find_by(city: 'Hometown'): Locates the target embedded address.
- user.addresses.delete(address): Removes the embedded document from the parent.
- user.save: Persists the removal in the database.

## 4. Common Beginner Mistakes — 3+ Real Pitfalls with Bad vs Good Code

Pitfall 1: Not using appropriate indexes for queries on common fields.
- Bad:
```ruby
# No index on email
user = User.where(email: 'alice@example.com').first
```
- Good:
```ruby
class User
  include Mongoid::Document
  field :email, type: String
  index({ email: 1 }, { unique: true })
end

user = User.where(email: 'alice@example.com').first
```

Pitfall 2: Fetching entire documents when only a few fields are needed.
- Bad:
```ruby
# Retrieve full user document unnecessarily
user = User.where(email: 'alice@example.com').first
puts user.inspect
```
- Good:
```ruby
# Project only needed fields
user = User.only(:name, :email).find_by(email: 'alice@example.com')
puts "Name: #{user.name}, Email: #{user.email}"
```

Pitfall 3: Growing documents too large with unbounded embedded arrays.
- Bad:
```ruby
# Push an unbounded, growing array every time
user.orders << { order_id: "ORD#{SecureRandom.hex(4)}", total: 19.99, items: [] }
user.save
```
- Good:
```ruby
# Cap embedded arrays or move to separate collections when they grow too large
# Example: store large histories in a separate collection and keep a summary in the user
class User
  embeds_many :orders
  field :order_count, type: Integer, default: 0
end
# On new order:
user.order_count += 1
user.save
```

Pitfall 4 (bonus): Ignoring multi-document consistency and transactions when needed.
- Bad (no transaction for multi-document change):
```ruby
# Update user balance outside a transaction (risky)
user.balance -= 10
transaction_log.create(user_id: user.id, change: -10)
user.save
```
- Good (use a transaction where supported):
```ruby
# MongoDB 4.0+ multi-document ACID-like transaction (conceptual)
session = client.start_session
session.with_transaction do
  user = User.find(user_id, session: session)
  user.balance -= 10
  user.save
  transaction_log.insert_one({ user_id: user_id, change: -10 }, session: session)
end
```

## 5. Why This Matters In Real Systems — production context and real usage

- Data modeling choices impact scalability: Embedding vs referencing affects read/write patterns and document size. Embedded docs enable fast reads for typical user-centric queries but can bloat documents; referencing allows greater normalization and easier updates, at the cost of more joins (via separate queries or $lookup in MongoDB 3.2+).
- Indexing strategy drives performance: Carefully index fields you frequently query or sort by. Compound indexes can speed up common query patterns but add write overhead.
- Transactions and consistency: MongoDB supports multi-document transactions (with replica sets and in sharded clusters with limitations). Use transactions when multiple documents must be updated atomically.
- Schema evolution: MongoDB allows evolving schemas without migrations that lock your database. However, plan deprecations and migrations to avoid inconsistent reads during transitions.
- Operational considerations: Replication provides high availability; read preferences can steer reads to secondaries for read scaling; backups and point-in-time recovery require planning in a NoSQL ecosystem.
- Observability: Collect metrics on query latency, index usage, and document growth. Use explain plans to understand slow queries and optimize indexes.
- Data lifecycle and TTL: Use TTL indexes for data with expiry (e.g., sessions, tokens) to manage data retention automatically.

## 6. Study Questions — 5 recall questions

1) What is the primary difference between embedding documents and using references in MongoDB, and when would you choose one approach over the other?  
2) How does indexing on an embedded field (e.g., addresses.city) affect query performance, and what are potential trade-offs?  
3) How do you configure a Mongoid model to ensure a top-level field (like email) is unique?  
4) What is a practical scenario where a multi-document transaction would be appropriate in MongoDB?  
5) If you expect a user document to grow very large due to many orders, what design strategy could help maintain performance?

## 7. Exercise — a practical multi-part coding challenge

Goal: Build a small Ruby app using Mongoid to model a blog-like structure with users, posts, and comments stored as embedded documents. Demonstrate basic CRUD, indexing, and a query that traverses embedded data.

Part A — Setup and models
- Tasks:
  - Create a Gemfile with Mongoid and a configuration snippet to connect to a local MongoDB instance.
  - Define User, Post, and Comment models with appropriate fields.
  - Make Post embedded in User; Comments embedded in Post.

Code (Gemfile and models):
```ruby
# Gemfile
source "https://rubygems.org"

gem "mongoid", "~> 7.3"
```

### Line-by-line explanation
- Gemfile setup and dependency declaration for Mongoid.

```yaml
# config/mongoid.yml
development:
  clients:
    default:
      database: blog_development
      hosts:
        - 127.0.0.1:27017
```

### Line-by-line explanation
- Mongoid configuration to connect to a local database in development environment.

```ruby
# app/models/user.rb
class User
  include Mongoid::Document

  field :name,  type: String
  field :email, type: String

  embeds_many :posts

  index({ email: 1 }, { unique: true })
end
```

### Line-by-line explanation
- User document with name/email fields.
- embeds_many :posts: posts embedded within a user.
- Unique index on email to enforce uniqueness at the top level.

```ruby
# app/models/post.rb
class Post
  include Mongoid::Document

  field :title,   type: String
  field :body,    type: String
  field :created_at, type: Time, default: -> { Time.now }

  embeds_many :comments
  embedded_in :user
end
```

### Line-by-line explanation
- Post document with title/body and a timestamp.
- embeds_many :comments: comments embedded within a post.
- embedded_in :user: post belongs to a user.

```ruby
# app/models/comment.rb
class Comment
  include Mongoid::Document

  field :author, type: String
  field :text,   type: String
  field :created_at, type: Time, default: -> { Time.now }

  embedded_in :post
end
```

### Line-by-line explanation
- Comment document with author/text and timestamp.
- embedded_in :post: comment belongs to a post.

Part B — Creating data
- Tasks:
  - Create a user with two posts, each with two comments.
  - Show how to create using nested hashes.

```ruby
user = User.create(
  name: "Bob",
  email: "bob@example.com",
  posts: [
    {
      title: "Hello World",
      body: "This is my first post.",
      comments: [
        { author: "Alice", text: "Welcome!" },
        { author: "Eve", text: "Nice post." }
      ]
    },
    {
      title: "Ruby with MongoDB",
      body: "Mongoid makes working with MongoDB pleasant.",
      comments: [
        { author: "Charlie", text: "Agreed." },
        { author: "Dana", text: "Love Mongoid." }
      ]
    }
  ]
)
```

### Line-by-line explanation
- User.create(...): Creates a user with nested posts and comments in one operation.
- posts: Array of hash literals representing embedded Post documents.
- comments: Nested array of comments for each post.

Part C — Query and update
- Tasks:
  - Find all posts by a user with a specific post title.
  - Add a new comment to a given post.
  - Update a comment’s text.

```ruby
# Find posts with a given title for a user
user = User.find_by(email: "bob@example.com")
matching_posts = user.posts.where(title: "Hello World")
puts "Found posts: #{matching_posts.map(&:title).join(', ')}"
```

### Line-by-line explanation
- User.find_by(email: ...): Locate the user.
- user.posts.where(title: "Hello World"): Query embedded posts for a title match.

```ruby
# Add a new comment to the first matching post
post = matching_posts.first
post.comments << Comment.new(author: "Mallory", text: "Nice article!")
user.save
```

### Line-by-line explanation
- matching_posts.first: Select the target post.
- post.comments << Comment.new(...): Append a new embedded comment to the post.
- user.save: Persist changes to the user document (which contains the post and its comments).

```ruby
# Update a specific comment's text
comment = post.comments.find_by(author: "Alice")
comment.text = "Welcome to the blog!"
user.save
```

### Line-by-line explanation
- post.comments.find_by(author: "Alice"): Locate a specific embedded comment.
- comment.text = "...": Modify the comment field.
- user.save: Persist changes.

What you should learn and be able to do after this exercise:
- Define Mongoid models with embedded documents and proper indexing.
- Build a small, nested data model (User -> Post -> Comment) and perform common CRUD on embedded content.
- Reason about when embeddings are appropriate (read-heavy, hierarchical data) and how to manage growth and indexing in a real Ruby application.

If you’d like, I can tailor the lesson to a specific Ruby framework (e.g., Rails with Mongoid) or adjust the exercise complexity for a lab/reset class.