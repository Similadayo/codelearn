# GraphQL — Flexible API Queries in Ruby

GraphQL gives backend services the power to expose a flexible, client-driven API where consumers specify exactly which fields they need, including nested relationships. In Ruby ecosystems, GraphQL-Ruby provides a rich DSL to define schemas, types, and resolvers. This lesson teaches you how to design a Ruby-based GraphQL API that supports flexible queries, including nested selections, fragments, and variables, while keeping performance and maintainability in mind for real-world systems.

## 1. Designing a Flexible Ruby GraphQL Schema

In this section, you’ll build a minimal in-memory data layer and define GraphQL types and a schema using the GraphQL-Ruby DSL. You’ll learn how to wire up User, Post, and their relationship, and how to resolve nested fields efficiently.

```ruby
# lib/data_store.rb
module DataStore
  USERS = [
    { id: 1, name: 'Alice', email: 'alice@example.com' },
    { id: 2, name: 'Bob',   email: 'bob@example.com'   }
  ]

  POSTS = [
    { id: 1, title: 'Hello GraphQL',  content: 'Intro to GraphQL in Ruby', author_id: 1 },
    { id: 2, title: 'Ruby & GraphQL',   content: 'Declarative schemas',      author_id: 1 },
    { id: 3, title: 'Advanced Queries', content: 'Fragment, alias, and more', author_id: 2 }
  ]

  def self.user(id)
    USERS.find { |u| u[:id] == id }
  end

  def self.post(id)
    POSTS.find { |p| p[:id] == id }
  end

  def self.posts_by_user(user_id)
    POSTS.select { |p| p[:author_id] == user_id }
  end
end
```

```ruby
# lib/graphql/types/post_type.rb
module Types
  class PostType < GraphQL::Schema::Object
    field :id,     ID,     null: false
    field :title,  String, null: false
    field :content, String, null: true
    field :author, "Types::UserType", null: false

    # Resolver for the nested author field
    def author
      DataStore.user(object[:author_id])
    end
  end
end
```

```ruby
# lib/graphql/types/user_type.rb
module Types
  class UserType < GraphQL::Schema::Object
    field :id,    ID,     null: false
    field :name,  String, null: false
    field :email, String, null: false
    # Add a few posts for the user; supports optional pagination
    field :posts, [Types::PostType], null: true do
      argument :first, Integer, required: false
    end
    def posts(first: nil)
      posts = DataStore.posts_by_user(object[:id])
      first ? posts.first(first) : posts
    end
  end
end
```

```ruby
# lib/graphql/types/query_type.rb
module Types
  class QueryType < GraphQL::Schema::Object
    description "The query root of this schema"

    field :user, Types::UserType, null: true do
      argument :id, ID, required: true
    end
    def user(id:)
      DataStore.user(id.to_i)
    end

    field :post, Types::PostType, null: true do
      argument :id, ID, required: true
    end
    def post(id:)
      DataStore.post(id.to_i)
    end

    field :users, [Types::UserType], null: false do
      argument :limit, Integer, required: false
    end
    def users(limit: 10)
      DataStore::USERS.first(limit)
    end
  end
end
```

```ruby
# lib/graphql/schema.rb
class MySchema < GraphQL::Schema
  query Types::QueryType
end
```

### Line-by-line explanation

- DataStore module defines in-memory data for users and posts to simulate a backend data layer.
- USERS and POSTS hold lightweight hash records representing entities.
- DataStore.user(id) returns the user hash with the given id.
- DataStore.post(id) returns the post hash with the given id.
- DataStore.posts_by_user(user_id) returns all posts authored by a user.
- PostType defines fields id, title, content, and author. The author field uses a string type reference to Types::UserType to support forward references.
- PostType#author resolver fetches the author user by the post’s author_id via DataStore.
- UserType defines fields id, name, email, and posts. The posts field accepts an optional argument first for pagination; it resolves to the user’s posts via DataStore.
- UserType#posts resolves to DataStore.posts_by_user(object[:id]); if first is provided, it returns only the first N posts.
- QueryType is the root query type with three fields: user, post, and users. Each field has appropriate arguments and resolvers to fetch data from DataStore.
- MySchema links the query type to the schema, enabling GraphQL::Schema.execute and other interactions.

## 2. Executing Flexible Queries: Variables, Aliases, and Fragments

This section demonstrates how to construct flexible GraphQL queries that leverage variables, field aliases, and fragments to minimize data transfer and compose complex client-driven requests.

```ruby
# Example usage: run a flexible query against the schema
query_string = <<-GRAPHQL
  query($userId: ID!, $postLimit: Int) {
    user1: user(id: $userId) {
      id
      name
      email
      posts(first: $postLimit) {
        id
        title
        ...PostDetails
      }
    }
  }

  fragment PostDetails on Post {
    content
  }
GRAPHQL

variables = { "userId" => 1, "postLimit" => 2 }

result = MySchema.execute(query_string, variables: variables)
```

```ruby
# Alternative invocation with direct field selection, including nested data
query_string2 = <<-GRAPHQL
  query($userId: ID!) {
    user(id: $userId) {
      id
      name
      posts {
        id
        title
        author { id name }  # nested relationship
      }
    }
  }
GRAPHQL

result2 = MySchema.execute(query_string2, variables: { "userId" => 2 })
```

### Line-by-line explanation

- query_string constructs a single GraphQL query that exercises:
  - A field alias: user1 to fetch a specific user while still enabling reuse of the same field name.
  - A nested selection: fetching posts for the user.
  - A fragment (PostDetails) to request the content field for each post in a reusable way.
- The variables hash supplies dynamic input without string interpolation, preventing injection risks and enabling client-side variability.
- MySchema.execute runs the query against the schema; the framework handles parsing, validation, and resolution.
- query_string2 demonstrates a simpler query that fetches a user and their posts, including a nested author field, illustrating deeper nesting and object graphs.
- The resulting hash (result or result2) contains data under the "data" key, with fields requested by the client.

## 3. Performance and Safety Considerations: Batching, Caching, and Validation

Flexible APIs are powerful, but can easily cause performance pitfalls if not designed with care. This section shows practical patterns to reduce N+1 queries, enable batching, and reason about safety and correctness.

```ruby
# lib/graphql/batch_setup.rb
require 'graphql/batch'

# Extend the schema to support batching (avoids N+1 when resolving associations)
class MySchema < GraphQL::Schema
  query Types::QueryType
  use GraphQL::Batch
end
```

```ruby
# lib/graphql/types/post_type.rb (with batching in resolver)
module Types
  class PostType < GraphQL::Schema::Object
    field :id, ID, null: false
    field :title, String, null: false
    field :content, String, null: true
    field :author, "Types::UserType", null: false
    def author
      # BatchLoader ensures multiple author lookups are coalesced into a single query
      BatchLoader.for(object[:author_id]).batch do |ids, loader|
        users = DataStore::USERS.select { |u| ids.include?(u[:id]) }
        ids.each { |id| loader.call(id, users.find { |u| u[:id] == id }) }
      end
    end
  end
end
```

### Line-by-line explanation

- require 'graphql/batch' enables batching support in GraphQL-Ruby.
- MySchema now uses GraphQL::Batch to automatically batch multiple author lookups during a single query execution.
- PostType#author uses BatchLoader to gather author IDs requested across all posts in the query and resolve them in a single or minimal number of data-fetching calls.
- The block receives the batch of IDs and a loader callback:
  - It finds all users whose IDs are in the batch.
  - For each requested ID, it calls loader.call(id, user) to connect the resolved user object to the corresponding post.
- This pattern dramatically reduces the number of individual lookups in typical N+1 scenarios.

Note: In production, you would typically wire a full data adapter that talks to a database (e.g., ActiveRecord) instead of the in-memory DataStore, and you would integrate proper caching and error handling.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: N+1 queries due to naive field resolvers
  - Bad:
    ```ruby
    # PostType#author resolver naive approach
    def author
      User.find(object[:author_id])
    end
    ```
  - Good:
    ```ruby
    # PostType#author resolver using batching
    def author
      BatchLoader.for(object[:author_id]).batch do |ids, loader|
        users = DataStore::USERS.select { |u| ids.include?(u[:id]) }
        ids.each { |id| loader.call(id, users.find { |u| u[:id] == id }) }
      end
    end
    ```
  - Why it matters: Batching reduces database round-trips and scales to large lists of posts/users.

- Pitfall 2: Not using variables; string interpolation in queries (security and caching risks)
  - Bad:
    ```ruby
    # Dangerous: interpolating user input into a query
    user_id = params[:id]
    query = "{ user(id: #{user_id}) { id name } }"
    MySchema.execute(query)
    ```
  - Good:
    ```ruby
    # Safe: use variables
    query = "query($id: ID!) { user(id: $id) { id name } }"
    MySchema.execute(query, variables: { id: user_id })
    ```
  - Why it matters: Variables prevent injection, enable query caching, and improve reuse of query plans.

- Pitfall 3: Over-fetching by forcing heavy fields to always load
  - Bad:
    ```ruby
    # Resolver loads heavy content eagerly (even if not requested)
    def content
      load_heavy_content(object[:content_id])
    end
    ```
  - Good:
    ```ruby
    # Only resolve heavy content when requested (handled by GraphQL field resolution)
    def content
      load_heavy_content(object[:content_id]) if context[:include_content]
    end
    ```
  - Why it matters: Over-fetching wastes bandwidth and increases latency for clients that don’t need heavy data.

- Pitfall 4: Not validating input shapes or error handling
  - Bad:
    ```ruby
    # Assume the caller always provides id; no error handling
    def user(id:)
      DataStore.user(id)
    end
    ```
  - Good:
    ```ruby
    def user(id:)
      raise GraphQL::ExecutionError, "Invalid ID" unless id && id.to_i > 0
      DataStore.user(id.to_i)
    rescue => e
      GraphQL::ExecutionError.new("Internal error: #{e.message}")
    end
    ```
  - Why it matters: Clear, user-friendly errors and guards prevent leaking server internals and improve API reliability.

## Y. Why This Matters In Real Systems — production context and real usage

- Flexibility vs. performance: GraphQL lets clients fetch exactly what they need, reducing over-fetching common in REST, but you must guard against heavy payloads and expensive fields.
- N+1 and batching: Without batching, nested relations can trigger many small queries. Implement batching (e.g., GraphQL::Batch with BatchLoader or a database-level includes/preloads) to amortize data-fetching costs.
- Observability: Instrument queries to monitor latency, error rates, and field-level costs. Add logging of query shapes (which fields are most frequently requested) to guide schema evolution.
- Security and complexity: Implement depth and complexity limits to prevent abusive queries. Consider whitelisting allowed fields or rate-limiting client queries in high-traffic systems.
- Caching strategies: Leverage client-side persisted queries, server-side caching for common subgraphs, and memoization in resolvers where appropriate.
- Schema evolution: GraphQL shines in evolving APIs. Use deprecation hints, clear messaging, and tooling to help clients migrate as the schema grows.

Practical takeaways:
- Start with a clean, well-typed schema that models your domain, and resolve fields with minimal, deterministic logic.
- Use batching to tame N+1 queries and make sure lazy loading patterns are in place where data sources are remote.
- Enable query analysis (depth/complexity) and observability to operate a robust production GraphQL service.
- Educate clients to use variables, fragments, and aliases to unlock the full power of flexible queries.

## Z. Study Questions — 5 recall questions

1) What is the primary advantage of using fragments in GraphQL queries?
2) How does GraphQL-Ruby’s BatchLoader help prevent N+1 query problems?
3) Why should you use variables instead of string interpolation when executing a GraphQL query?
4) In the provided schema, how would you fetch a user and limit the number of posts returned for that user?
5) Name two production concerns you should address when exposing a GraphQL API in a backend service.

## Exercise — a practical multi-part coding challenge

Goal: Build and run a small GraphQL Ruby API that demonstrates flexible queries (fields, nested data, aliases, and variables) and includes a basic batching example.

Part A — Project setup
- Create a new Ruby project (Gemfile).
- Add gems: graphql, and batch-loader (for batching).
- Initialize a simple in-memory data store similar to the DataStore in Section 1.

Part B — Schema and types
- Implement Types::UserType, Types::PostType, and Types::QueryType as shown in Section 1.
- Implement a DataStore module with users and posts and resolvers for:
  - User.posts to return the user’s posts (with optional first for pagination).
  - Post.author to return the author user.

Part C — Query execution
- Write a Ruby script that builds and executes a GraphQL query against MySchema.
- Use a query with:
  - A variable for user id.
  - A nested posts selection showing id and title.
  - A fragment to fetch post content on the posts.
- Print the resulting JSON data.

Part D — Flexible query features
- Extend the tests or script to demonstrate:
  - Field alias: fetch the same user under a different alias.
  - Nested alias and fragment mix.
  - Variables for user id and post limit.

Part E — Optional batching demonstration
- Introduce GraphQL::Batch and implement a BatchLoader-based author resolver for PostType (as shown in Section 3).
- Run a query that fetches multiple posts across different users to observe batching behavior.

Hints
- Keep data structures simple and deterministic for the exercise to focus on GraphQL mechanics.
- Use GraphQL::Schema.execute with variables for better practice and to illustrate safe query execution.
- If you run into resolution order issues with circular type references, use forward references (e.g., "Types::UserType") in field definitions.

End of lesson.