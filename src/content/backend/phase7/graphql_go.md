# GraphQL — Flexible API Queries in Go

GraphQL enables clients to ask for exactly what they need, reducing over-fetch and over-fetch-related coupling between frontend and backend. In Backend Engineering Phase 7, Advanced API Features, this lesson shows how to build a Go (Golang) GraphQL API that supports flexible queries, nested relationships, filtering, and basic performance considerations. You’ll learn how to design a practical GraphQL API in Go, wire up resolvers, and reason about real-world usage and pitfalls.

## 1. Quick Start: Build a tiny GraphQL server in Go

This section provides a compact, working GraphQL server in Go using the graphql-go library. It demonstrates:

- Basic types (User, Post)
- A root Query with:
  - user(id: String!): User
  - posts(authorId: String): [Post]
  - post(id: String!): Post
- Nested relationships (Post.author)

Code (main.go):
```go
package main

import (
  "log"
  "net/http"

  "github.com/graphql-go/graphql"
  "github.com/graphql-go/handler"
)

type User struct {
  ID    string
  Name  string
  Email string
}

type Post struct {
  ID       string
  Title    string
  Content  string
  AuthorID string
}

var users = []User{
  {ID: "U1", Name: "Alice", Email: "alice@example.com"},
  {ID: "U2", Name: "Bob", Email: "bob@example.com"},
  {ID: "U3", Name: "Carol", Email: "carol@example.com"},
}

var posts = []Post{
  {ID: "P1", Title: "GraphQL in Go", Content: "Intro to GraphQL", AuthorID: "U1"},
  {ID: "P2", Title: "Advanced GraphQL", Content: "N+1 problem and batching", AuthorID: "U2"},
  {ID: "P3", Title: "Go Concurrency", Content: "Goroutines and channels", AuthorID: "U1"},
}

func findUserByID(id string) *User {
  for i := range users {
    if users[i].ID == id {
      return &users[i]
    }
  }
  return nil
}

var userType = graphql.NewObject(graphql.ObjectConfig{
  Name: "User",
  Fields: graphql.Fields{
    "id":    &graphql.Field{Type: graphql.String},
    "name":  &graphql.Field{Type: graphql.String},
    "email": &graphql.Field{Type: graphql.String},
  },
})

var postType = graphql.NewObject(graphql.ObjectConfig{
  Name: "Post",
  Fields: graphql.Fields{
    "id":      &graphql.Field{Type: graphql.String},
    "title":   &graphql.Field{Type: graphql.String},
    "content": &graphql.Field{Type: graphql.String},
    "author": &graphql.Field{
      Type: userType,
      Resolve: func(p graphql.ResolveParams) (interface{}, error) {
        // Support both Post value and *Post pointer sources
        if post, ok := p.Source.(Post); ok {
          return findUserByID(post.AuthorID), nil
        }
        if postPtr, ok := p.Source.(*Post); ok {
          return findUserByID(postPtr.AuthorID), nil
        }
        return nil, nil
      },
    },
  },
})

var rootQuery = graphql.NewObject(graphql.ObjectConfig{
  Name: "Query",
  Fields: graphql.Fields{
    "user": &graphql.Field{
      Type: userType,
      Args: graphql.FieldConfigArgument{
        "id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
      },
      Resolve: func(p graphql.ResolveParams) (interface{}, error) {
        id, _ := p.Args["id"].(string)
        return findUserByID(id), nil
      },
    },
    "post": &graphql.Field{
      Type: postType,
      Args: graphql.FieldConfigArgument{
        "id": &graphql.ArgumentConfig{Type: graphql.NewNonNull(graphql.String)},
      },
      Resolve: func(p graphql.ResolveParams) (interface{}, error) {
        id, _ := p.Args["id"].(string)
        for i := range posts {
          if posts[i].ID == id {
            return posts[i], nil
          }
        }
        return nil, nil
      },
    },
    "posts": &graphql.Field{
      Type: graphql.NewList(postType),
      Resolve: func(p graphql.ResolveParams) (interface{}, error) {
        authorID, _ := p.Args["authorId"].(string)
        if authorID == "" {
          return posts, nil
        }
        var filtered []Post
        for _, post := range posts {
          if post.AuthorID == authorID {
            filtered = append(filtered, post)
          }
        }
        return filtered, nil
      },
      Args: graphql.FieldConfigArgument{
        "authorId": &graphql.ArgumentConfig{Type: graphql.String},
      },
    },
  },
})

func main() {
  schema, err := graphql.NewSchema(graphql.SchemaConfig{Query: rootQuery})
  if err != nil {
    log.Fatal(err)
  }

  h := handler.New(&handler.Config{
    Schema: &schema,
    Pretty: true,
  })

  http.Handle("/graphql", h)
  log.Println("GraphQL server is running on http://localhost:8080/graphql")
  log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Line-by-line explanation
- Line 1: package main – declares the program’s entry package.
- Lines 3-9: imports for HTTP, logging, and GraphQL libraries.
- Lines 11-21: User struct definition representing a user entity.
- Lines 23-31: Post struct definition representing a post entity with an author reference.
- Lines 33-41: In-memory sample data for users.
- Lines 43-51: In-memory sample data for posts.
- Lines 53-62: findUserByID helper to fetch a user by ID from the in-memory slice.
- Lines 64-75: Define GraphQL User object type with fields id, name, email.
- Lines 77-101: Define GraphQL Post object type with fields id, title, content, and a nested author field. The author field uses a Resolve function to fetch the associated User.
- Lines 103-140: Define the root Query with fields:
  - user(id: String!): User – fetch by ID
  - post(id: String!): Post – fetch a single post by ID
  - posts(authorId: String): [Post] – fetch posts with optional author filter
- Lines 142-156: main function – builds the schema, configures the HTTP handler, and starts the server.
- The code demonstrates a minimal, working GraphQL API in Go with nested relations and basic filtering.

## 2. Designing a Flexible Schema: Types and Queries

Flexible API queries come from well-designed types, arguments, and resolvers. In this section we extend the previous example to support a flexible search-style query that demonstrates filtering and pagination-like behavior without requiring a separate database layer. We add a root field: searchPosts(q: String, limit: Int): [Post], which returns posts whose title or content matches the query string, up to a limit.

Code (snippet to extend rootQuery; copy into your existing codebase, adapting imports if needed):
```go
// Assumes existing types and data from Section 1 (User, Post, posts, etc.)

import (
  "strings"
)

var rootQuery = graphql.NewObject(graphql.ObjectConfig{
  Name: "Query",
  Fields: graphql.Fields{
    // Existing fields (user, post, posts) remain as-is...

    "searchPosts": &graphql.Field{
      Type: graphql.NewList(postType),
      Args: graphql.FieldConfigArgument{
        "q":     &graphql.ArgumentConfig{Type: graphql.String},
        "limit": &graphql.ArgumentConfig{Type: graphql.Int},
      },
      Resolve: func(p graphql.ResolveParams) (interface{}, error) {
        q, _ := p.Args["q"].(string)
        limit, ok := p.Args["limit"].(int)
        if !ok || limit <= 0 {
          limit = 10
        }
        var results []Post
        for _, post := range posts {
          // Basic full-text-ish match on Title and Content
          if q == "" || strings.Contains(strings.ToLower(post.Title+post.Content), strings.ToLower(q)) {
            results = append(results, post)
            if len(results) >= limit {
              break
            }
          }
        }
        return results, nil
      },
    },
  },
})
```

### Line-by-line explanation
- Line 1: import "strings" – used for case-insensitive substring matching.
- Lines 3-22: Re-define the rootQuery object to include a new field searchPosts.
- Lines 24-38: Define the searchPosts field:
  - Type: list of Post objects.
  - Args: q (search query), limit (maximum results).
  - Resolve: extracts q and limit from arguments; defaults limit to 10 if not provided.
  - Iterates over posts, performing a case-insensitive search on Title + Content; appends matches to results until the limit is reached.
- Lines 40-41: End of the rootQuery Fields array and object.

Sample GraphQL client query:
```
query {
  searchPosts(q: "Go", limit: 2) {
    id
    title
    author { id name }
  }
}
```

Typical JSON-like response shape:
```
{
  "data": {
    "searchPosts": [
      { "id": "P3", "title": "Go Concurrency", "author": { "id": "U1", "name": "Alice" } },
      { "id": "P2", "title": "Advanced GraphQL", "author": { "id": "U2", "name": "Bob" } }
    ]
  }
}
```

## 3. Handling Nested Queries, Aliases, and Error Handling

GraphQL excels at nested data fetches, but you must design resolvers to handle nested fields efficiently and to provide clear error handling. The existing schema demonstrates nested resolution for Post.author. This section highlights:

- Nested queries: requesting a post and its author in a single query.
- Aliases (client-side): how to fetch the same type multiple times with different fields/filters (no server-side alias support needed; GraphQL supports aliasing in the query language itself).
- Error handling: returning meaningful errors when a resource is not found.

Code snippet showing a slightly more explicit resolver for a single post by ID (with error handling). This complements the previous code and demonstrates robust resolver behavior:
```go
// In rootQuery (within the "post" field resolver)
Resolve: func(p graphql.ResolveParams) (interface{}, error) {
  id, _ := p.Args["id"].(string)
  for i := range posts {
    if posts[i].ID == id {
      return posts[i], nil
    }
  }
  // Return a GraphQL-style error when the post is not found
  return nil, fmt.Errorf("post with id %s not found", id)
},
```

Notes:
- The error message is surfaced to the GraphQL client in the "errors" array, keeping normal data in the "data" field as null for that path.
- Clients can use aliases to fetch the same resource multiple times with different projections, e.g.:
  - latestPost: post(id: "P1") { id title }
  - featuredPost: post(id: "P2") { id title }

Line-by-line explanation (for the error-handling snippet):
- Line 1: Resolve: func(p graphql.ResolveParams) (interface{}, error) – resolver for the post field by ID.
- Line 2: id, _ := p.Args["id"].(string) – extract the required id argument.
- Lines 3-9: Loop through posts to find a match; return the found post.
- Lines 10-12: If no match, return a descriptive error; GraphQL will surface it to the client.

Why this matters:
- Nested resolvers allow building rich, connected data graphs without multiple round-trips.
- Proper error handling improves client UX and debugging.
- Aliases enable applying different projections of the same resource in a single query.

## 4. Common Beginner Mistakes — bad vs good code

1) Pitfall: Not validating required arguments
- Bad:
```go
// Inside a resolver (risky!)
id := p.Args["id"].(string) // can panic if missing
```
- Good:
```go
id, ok := p.Args["id"].(string)
if !ok || id == "" {
  return nil, fmt.Errorf("missing required argument: id")
}
```

2) Pitfall: N+1 data fetching (unbatched resolvers)
- Bad:
```go
// In Post.author resolver
author := findUserByID(post.AuthorID)
```
- Good (naive batching approach; per-request cache):
```go
// Simple per-request cache (pseudo-example; per-request context recommended)
if v, ok := p.Context.Value(authorCacheKey).(map[string]*User); ok {
  if author, found := v[post.AuthorID]; found {
    return author, nil
  }
}
// Fallback to loading and caching
author := findUserByID(post.AuthorID)
if v, ok := p.Context.Value(authorCacheKey).(map[string]*User); ok {
  v[post.AuthorID] = author
}
return author, nil
```

3) Pitfall: Exposing sensitive fields by default
- Bad:
```go
// User type includes email unconditionally
Fields: map[string]*graphql.Field{
  "email": &graphql.Field{Type: graphql.String},
}
```
- Good:
```go
// Do not expose sensitive fields by default; gate with a separate PublicUser type
type PublicUser struct {
  ID   string
  Name string
}
var publicUserType = graphql.NewObject(graphql.ObjectConfig{
  Name: "PublicUser",
  Fields: graphql.Fields{
    "id":   &graphql.Field{Type: graphql.String},
    "name": &graphql.Field{Type: graphql.String},
  },
})
```
  Then resolve to PublicUser in client-facing fields or implement field-level resolvers that return sanitized data.

4) Pitfall: No input sanitation in search/filter fields
- Bad:
```go
q := p.Args["q"].(string) // unvalidated
```
- Good:
```go
q, _ := p.Args["q"].(string)
q = strings.TrimSpace(q)
if len(q) > 100 { q = q[:100] } // simple safety check
```

5) Pitfall: Ignoring query complexity and depth
- Bad: Allowing deep, unbounded nested queries can cause expensive work.
- Good: Implement depth limiting, query cost analysis, or a maximum depth check at the gateway layer to prevent runaway queries.

## 5. Why This Matters In Real Systems — production context

- Flexibility vs performance: GraphQL allows clients to fetch precisely the data they need, reducing over-fetch and enabling feature-rich UIs. However, poorly designed resolvers can lead to N+1 problems, expensive nested queries, and high latency.
- Per-request data loading: Implement per-request data loaders and caches to batch and deduplicate data fetching. This is a common pattern to mitigate N+1 issues in GraphQL servers.
- Security and rate limiting: With GraphQL, a single query can traverse deep graphs and access many fields. Implement depth limiting, field whitelisting, and authentication/authorization checks to ensure clients can only access what they should.
- Instrumentation and tracing: Logging resolver latency, query complexity, and error rates helps diagnose performance issues in production.
- Caching and downstream systems: GraphQL often sits in front of multiple microservices or databases. Effective caching (HTTP, in-process, or distributed) and careful two-layer caching strategies improve latency for popular queries.
- Real-world topologies: GraphQL is well-suited for gateways, BFFs (Backend for Frontend), and service APIs where clients evolve quickly and server teams need to maintain forward compatibility.

Key production practices:
- Use a per-request DataLoader (or similar) to batch backend calls.
- Enforce a maximum query depth and a maximum number of fields per query.
- Limit or rate-limit complex queries; consider query whitelisting.
- Separate field-level access control for sensitive data (e.g., email).
- Provide observability: tracing, metrics, and error reporting.

## 6. Study Questions — 5 recall questions

1) What problem does GraphQL solve compared to traditional REST, and how does Go help you implement a GraphQL API efficiently?

2) In the graphql-go library, how do you define a type with a nested field that resolves to another type (e.g., Post.author -> User)?

3) Explain how you would prevent N+1 query problems in a GraphQL resolver design.

4) How can you enable clients to perform flexible searches or filtering through GraphQL arguments? Provide a small code example of an argument in a field.

5) What are two security practices you should apply when exposing a GraphQL API in production?

## 7. Exercise — practical multi-part coding challenge

Goal: Extend the GraphQL API from the lesson to support comments on posts, add a new query for searching posts, and demonstrate a sample client query.

Part A — Data model and types
- Add a new type Comment: ID, PostID, AuthorID, Text
- Extend Post with a new field: comments: [Comment]
- Add a simple in-memory dataset for comments, related to existing posts and users
- Implement a resolver for Post.comments that fetches comments matching the post ID

Part B — Extend the GraphQL schema
- Define a new GraphQL Object: commentType
- Extend rootQuery with a new field latestPosts(limit: Int): [Post] to return the most recent posts up to limit
- Ensure default limit is 5 if not provided

Part C — Sample client query
- Write a GraphQL query that fetches:
  - The latest 3 posts
  - For each post: id, title, author (name), and comments (text, author name)

Part D — Testing instructions
- Show a sample expected response JSON for your client query
- Briefly describe how you would verify the resolver for comments is working correctly

Code sketch (integration guidance; adapt to your existing codebase from Section 1):
```go
// Part A: Data model
type Comment struct {
  ID       string
  PostID   string
  AuthorID string
  Text     string
}

var comments = []Comment{
  {ID: "C1", PostID: "P1", AuthorID: "U2", Text: "Great intro!"},
  {ID: "C2", PostID: "P1", AuthorID: "U3", Text: "Looking forward to more."},
  {ID: "C3", PostID: "P2", AuthorID: "U1", Text: "Nicer explanation on batching."},
}

// Part A (types)
var commentType = graphql.NewObject(graphql.ObjectConfig{
  Name: "Comment",
  Fields: graphql.Fields{
    "id": &graphql.Field{Type: graphql.String},
    "text": &graphql.Field{Type: graphql.String},
    "author": &graphql.Field{
      Type: userType,
      Resolve: func(p graphql.ResolveParams) (interface{}, error) {
        if c, ok := p.Source.(Comment); ok {
          return findUserByID(c.AuthorID), nil
        }
        return nil, nil
      },
    },
  },
})

// Part A: extend Post type
var postType = graphql.NewObject(graphql.ObjectConfig{
  Name: "Post",
  Fields: graphql.Fields{
    "id":      &graphql.Field{Type: graphql.String},
    "title":   &graphql.Field{Type: graphql.String},
    "content": &graphql.Field{Type: graphql.String},
    "author": &graphql.Field{
      Type: userType,
      Resolve: func(p graphql.ResolveParams) (interface{}, error) {
        if post, ok := p.Source.(Post); ok {
          return findUserByID(post.AuthorID), nil
        }
        if postPtr, ok := p.Source.(*Post); ok {
          return findUserByID(postPtr.AuthorID), nil
        }
        return nil, nil
      },
    },
    "comments": &graphql.Field{
      Type: graphql.NewList(commentType),
      Resolve: func(p graphql.ResolveParams) (interface{}, error) {
        post, ok := p.Source.(Post)
        if !ok {
          return nil, nil
        }
        var res []Comment
        for _, c := range comments {
          if c.PostID == post.ID {
            res = append(res, c)
          }
        }
        return res, nil
      },
    },
  },
})

// Part B: latestPosts
var rootQuery = graphql.NewObject(graphql.ObjectConfig{
  Name: "Query",
  Fields: graphql.Fields{
    // Existing fields...
    "latestPosts": &graphql.Field{
      Type: graphql.NewList(postType),
      Args: graphql.FieldConfigArgument{
        "limit": &graphql.ArgumentConfig{Type: graphql.Int},
      },
      Resolve: func(p graphql.ResolveParams) (interface{}, error) {
        limit, ok := p.Args["limit"].(int)
        if !ok || limit <= 0 {
          limit = 5
        }
        // naive: assume posts are already ordered by recency
        if limit > len(posts) {
          limit = len(posts)
        }
        return posts[:limit], nil
      },
    },
  },
})

// Part C: client query
/*
query {
  latestPosts(limit: 3) {
    id
    title
    author { name }
    comments { text, author { name } }
  }
}
*/

// Part D: Testing guidance
// Use a local GraphQL client or curl to POST the query to /graphql and verify the JSON structure matches the query shape.
```

Notes for Part D:
- Ensure your in-memory datasets include enough comments and authors to exercise the nested fields.
- Validate that post IDs generated in your dataset align with the sample queries.
- You can extend tests with unit tests for resolvers if you adopt a testing framework.

This complete lesson equips you with practical patterns for building flexible GraphQL APIs in Go and thinking about real-world usage, performance, and maintainability.