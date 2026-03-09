# GraphQL — Flexible API Queries in PHP (Phase 7: Advanced API Features)

GraphQL gives clients the power to request exactly what they need and nothing more. In PHP-backed services, this means building a flexible, well-typed, resolvable schema that can serve complex, nested queries efficiently. This lesson focuses on GraphQL in PHP using the webonyx/graphql-php library, showing how to define types, implement resolvers, and enable flexible queries with arguments, aliases, and fragments while considering real-world concerns like security and performance.

## 1. GraphQL Fundamentals in PHP: Flexible Queries

In this first concept, we build a minimal GraphQL API in PHP that exposes users and their posts. The schema supports:
- A User type with id, name, and posts
- A Post type with title and excerpt
- A root Query type with a user(id: Int!) field

Clients can request nested data and pass arguments like limit to control results. This demonstrates the core ideas of GraphQL: precise data shape, nested querying, and argument-driven filtering.

```php
<?php
require __DIR__ . '/vendor/autoload.php';

use GraphQL\Type\Definition\Type;
use GraphQL\Type\Definition\ObjectType;
use GraphQL\Type\Schema;
use GraphQL\GraphQL;

// In-memory sample data
$DATA = [
    'users' => [
        [
            'id' => 1,
            'name' => 'Alice',
            'posts' => [
                ['id' => 101, 'title' => 'Hello GraphQL', 'excerpt' => 'Intro to GraphQL in PHP'],
                ['id' => 102, 'title' => 'PHP 8 Tips', 'excerpt' => 'Modern PHP patterns'],
                ['id' => 103, 'title' => 'Advanced PHP', 'excerpt' => 'Performance and safety'],
            ],
        ],
        [
            'id' => 2,
            'name' => 'Bob',
            'posts' => [
                ['id' => 201, 'title' => 'API Design', 'excerpt' => 'REST vs GraphQL'],
            ],
        ],
    ],
];

// Define Post type
$PostType = new ObjectType([
    'name' => 'Post',
    'fields' => [
        'title' => ['type' => Type::string()],
        'excerpt' => ['type' => Type::string()],
    ],
]);

// Define User type with a posts field that accepts a limit argument
$UserType = new ObjectType([
    'name' => 'User',
    'fields' => [
        'id' => ['type' => Type::int()],
        'name' => ['type' => Type::string()],
        'posts' => [
            'type' => Type::listOf($PostType),
            'args' => [
                'limit' => ['type' => Type::int(), 'defaultValue' => 5],
            ],
            'resolve' => function ($user, $args) {
                $posts = $user['posts'] ?? [];
                $limit = isset($args['limit']) ? (int)$args['limit'] : count($posts);
                return array_slice($posts, 0, $limit);
            },
        ],
    ],
]);

// Root Query type
$QueryType = new ObjectType([
    'name' => 'Query',
    'fields' => [
        'user' => [
            'type' => $UserType,
            'args' => [
                'id' => ['type' => Type::nonNull(Type::int())],
            ],
            'resolve' => function ($root, $args) use ($DATA) {
                foreach ($DATA['users'] as $u) {
                    if ($u['id'] === $args['id']) {
                        return $u;
                    }
                }
                return null;
            },
        ],
    ],
]);

$schema = new Schema(['query' => $QueryType]);

// Read GraphQL query from request body
$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
$query = $input['query'] ?? '';
$variables = $input['variables'] ?? null;

// Execute the query
$result = GraphQL::executeQuery($schema, $query, null, null, $variables);

header('Content-Type: application/json');
echo json_encode($result->toArray(), JSON_PRETTY_PRINT);
?>
```

### Line-by-line explanation
- require __DIR__ . '/vendor/autoload.php';: Load Composer autoload to use GraphQL classes.
- use GraphQL\Type\Definition\Type; etc.: Import GraphQL types and helpers.
- $DATA = [...]: In-memory sample dataset representing users and their posts.
- $PostType = new ObjectType([...]);: Define a Post type with fields title and excerpt.
- $UserType = new ObjectType([...]);: Define a User type with id, name, and a posts field that accepts a limit argument and resolves to a sliced list of posts.
- $QueryType = new ObjectType([...]);: Define the root Query type with a single field user(id: Int!).
- 'resolve' => function ($root, $args) use ($DATA) { ... }: Resolver for fetching a user by id from the dataset.
- $schema = new Schema(['query' => $QueryType]);: Build the executable GraphQL schema.
- $raw = file_get_contents('php://input'); $input = json_decode($raw, true);: Read the incoming GraphQL request.
- $result = GraphQL::executeQuery($schema, $query, null, null, $variables);: Execute the query against the schema with provided variables.
- header and echo: Return the GraphQL response as JSON.
- Example query (not shown here) can request a user and their posts, with an optional limit on posts.

### Example client queries
- Basic nested query:
{
  user(id: 1) {
    id
    name
    posts(limit: 2) {
      title
      excerpt
    }
  }
}
- Query with fragments and variables (for flexibility in real apps):
query GetUser($id: Int!, $limit: Int) {
  user(id: $id) {
    ...UserFields
  }
}
fragment UserFields on User {
  id
  name
  posts(limit: $limit) {
    title
    excerpt
  }
}
Variables:
{ "id": 1, "limit": 3 }

### Line-by-line explanation (fragment example)
- The same setup as the basic example applies; we only change the query to include a fragment UserFields and a variable block to supply id and limit at runtime.

## 2. Flexible Queries: Arguments, Aliases, Fragments, and Variables

This concept demonstrates how clients can tailor responses using:
- Field arguments to filter or constrain data (e.g., limit on posts)
- Aliases to fetch multiple fields with different relationships in one query
- Fragments to reuse a common field set across multiple types
- Variables to decouple query structure from concrete values

Code example: a GraphQL query that uses aliases, a fragment, and variables. We reuse the same PHP schema from Section 1; the focus here is the client-side query string and how the server handles it.

```php
<?php
// Reuse the same schema setup from Section 1 (User, Post, Query types).

$query = <<<'GRAPHQL'
query GetUserAndFriendPosts($id: Int!, $friendId: Int!, $limit: Int = 2) {
  user(id: $id) {
    ...UserFields
    bestFriend: posts(limit: $limit) { title excerpt }  // alias on a field for flexible requests
  }
  friend: user(id: $friendId) {
    ...UserFields
  }
}
fragment UserFields on User {
  id
  name
  posts(limit: 1) {
    title
  }
}
GRAPHQL;

$variables = [
  'id' => 1,
  'friendId' => 2,
  'limit' => 2
];

// Execute the query
$result = GraphQL::executeQuery($schema, $query, null, null, $variables);

header('Content-Type: application/json');
echo json_encode($result->toArray(), JSON_PRETTY_PRINT);
```

### Line-by-line explanation
- $query = <<<'GRAPHQL' ... GRAPHQL;: A multi-line GraphQL query string using:
  - Alias bestFriend to fetch a constrained subset of posts for the user.
  - Fragment UserFields to reuse a common set of fields for User.
  - Variables $id, $friendId, and $limit to parameterize the query.
- $variables = [...]: Provide concrete values for the declared variables at runtime.
- GraphQL::executeQuery(...): Execute the query against the same schema as in Section 1.
- The response will include:
  - The primary user with fields from UserFields
  - The bestFriend posts via an aliased field
  - The friend user data via the friend alias
- Note: Fragment usage makes the query more maintainable when the same field set is used in multiple places.

## 3. Performance, Security, and Best Practices in PHP GraphQL

In production, you must consider:
- Per-field authorization: avoid leaking sensitive fields.
- Minimizing N+1 queries by grouping data fetches or caching at the resolver level.
- Input validation via GraphQL types and careful argument defaults.
- Basic request-context authentication to gate data access.

Code example: a resolver that checks auth context and uses a simple per-request cache to avoid recomputing user data.

```php
<?php
// Extend previous setup; this snippet shows an authorization check in a resolver
$QueryType = new ObjectType([
    'name' => 'Query',
    'fields' => [
        'user' => [
            'type' => $UserType,
            'args' => [
                'id' => ['type' => Type::nonNull(Type::int())],
            ],
            'resolve' => function ($root, $args, $context) use ($DATA) {
                // Basic auth check from context
                if (empty($context['user']) || !$context['user']['is_admin']) {
                    throw new \GraphQL\Error\UserError('Access denied: admin only.');
                }

                // Simple in-request cache for demonstration
                static $cache = [];
                $id = $args['id'];
                if (isset($cache[$id])) {
                    return $cache[$id];
                }
                foreach ($DATA['users'] as $u) {
                    if ($u['id'] === $id) {
                        $cache[$id] = $u;
                        return $u;
                    }
                }
                return null;
            },
        ],
    ],
]);

// Example: execute with context containing an admin user
$context = ['user' => ['id' => 99, 'is_admin' => true]];
$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
$query = $input['query'] ?? '';
$variables = $input['variables'] ?? null;

$result = GraphQL::executeQuery($schema, $query, null, $context, $variables);

echo json_encode($result->toArray(), JSON_PRETTY_PRINT);
```

### Why this matters for real systems
- Context-based authorization ensures only allowed fields are exposed per request, reducing data leakage risk.
- Per-request caching helps reduce repeated data fetches within a single query, which can be critical for performance in nested queries.
- Using GraphQL’s typed arguments helps catch invalid input early and makes validation easier to reason about than ad-hoc string concatenation.
- In production, you’d also consider: rate limiting, query complexity and depth analysis, error masking (avoiding leaking internal details), and observability (metrics, tracing, and logs).

## X. Common Beginner Mistakes

- 1) Bad: Exposing sensitive fields by default; Good: Gate fields in resolvers and use context for authorization.
Bad:
```php
$UserType = new ObjectType([
  'name' => 'User',
  'fields' => [
    'id' => ['type' => Type::int()],
    'name' => ['type' => Type::string()],
    'email' => ['type' => Type::string()], // exposed by default
  ],
]);
```
Good:
```php
$UserType = new ObjectType([
  'name' => 'User',
  'fields' => [
    'id' => ['type' => Type::int()],
    'name' => ['type' => Type::string()],
    'email' => [
      'type' => Type::string(),
      'resolve' => function($user, $args, $context) {
        // Only admins can see email
        if (!isset($context['user']) || !$context['user']['is_admin']) {
          return null;
        }
        return $user['email'] ?? null;
      }
    ],
  ],
]);
```

- 2) Bad: N+1 pattern on nested fields; Good: Use a batch-friendly resolver or caching pattern.
Bad:
```php
$UserType = new ObjectType([
  'name' => 'User',
  'fields' => [
    'posts' => [
      'type' => Type::listOf($PostType),
      'resolve' => function($user) {
        // Each user triggers its own data fetch
        return fetchPostsForUser($user['id']);
      }
    ]
  ]
]);
```
Good (conceptual batch/cached approach):
```php
$PostLoader = new class {
  private $cache = [];
  public function loadForUsers(array $userIds) {
    // If some users are already cached, skip them
    $missing = array_filter($userIds, fn($id) => !isset($this->cache[$id]));
    // Simulate a single bulk fetch
    foreach ($missing as $id) {
      $this->cache[$id] = fetchPostsForUser($id);
    }
    return array_map(fn($id) => $this->cache[$id], $userIds);
  }
};

$loader = new $PostLoader;
$UserType = new ObjectType([
  'name' => 'User',
  'fields' => [
    'posts' => [
      'type' => Type::listOf($PostType),
      'resolve' => function($user) use ($loader) {
        // In a real setup, pass IDs to a batch loader and return a promise-like result
        return $loader->loadForUsers([$user['id']])[0] ?? [];
      }
    ]
  ]
]);
```

- 3) Bad: Hard-coded queries leaking into code; Good: Use parameterized queries and variables to fetch data safely.
Bad:
```php
$query = '{ user(id: ' . $_GET['id'] . ') { id name } }'; // string interpolation in request handler
```
Good:
```php
$query = 'query GetUser($id: Int!) { user(id: $id) { id name } }';
$variables = ['id' => (int)$_GET['id']];
```

- 4) Bad: No pagination for lists; Good: Implement limit (and later offset) on nested lists and document limits.
Bad:
```php
'posts' => ['type' => Type::listOf($PostType), 'resolve' => function($user) {
  return $user['posts']; // returns all posts
}]
```
Good:
```php
'posts' => [
  'type' => Type::listOf($PostType),
  'args' => ['limit' => ['type' => Type::int(), 'defaultValue' => 10]],
  'resolve' => function($user, $args) {
    $posts = $user['posts'] ?? [];
    $limit = $args['limit'] ?? 10;
    return array_slice($posts, 0, $limit);
  }
]
```

## Y. Why This Matters In Real Systems

- Client-driven data: GraphQL enables mobile apps and frontends to fetch precisely what they need, reducing over-fetch and under-fetch.
- Unified API surface: A single endpoint can drive multiple resources (users, posts, comments, etc.) with strict types and resolvers, reducing API versioning friction.
- Performance considerations: Use per-field resolvers to fetch in batched queries, add caching, and avoid N+1 pitfalls. Consider query complexity and maximum depth to protect backends from expensive queries.
- Security and auditing: Context-based authorization, error masking, and observability are essential in production. Instrument GraphQL requests to monitor latency and failure modes.
- Real-world deployment: GraphQL servers can sit behind API gateways or be part of microservices ecosystems. Use logging, tracing, and metrics collectors to diagnose latency spikes and failed resolutions.

## Z. Study Questions

1) What is a GraphQL type, and how does it help you model data in PHP?  
2) How do you pass arguments to a GraphQL field, and how can a client supply those values at runtime?  
3) What is an alias in GraphQL, and how does it improve query flexibility?  
4) How can fragments help you reuse field selections across multiple queries?  
5) What are some strategies to avoid N+1 queries and improve performance in GraphQL resolvers?

## Exercise

Goal: Build a small PHP GraphQL endpoint that serves users and their posts with flexible querying, including aliases, fragments, and variables. It should demonstrate authorization, argument-based filtering, and a basic in-request cache to avoid redundant data fetching.

Part 1 — Setup and baseline schema
- Create a PHP script (e.g., graphql.php) that:
  - Uses webonyx/graphql-php (composer require webonyx/graphql-php).
  - Defines User and Post types as shown in Section 1.
  - Exposes a root query user(id: Int!) that returns a User with a posts field that accepts limit.
  - Accepts a GraphQL request body and returns a JSON response.

Part 2 — Flexible client queries
- Extend the request handling to support:
  - A query that uses aliases to fetch two users in one request.
  - A fragment that reuses a common field set for User with nested posts.
  - A query with variables for id and limit.

Part 3 — Authorization and simple caching
- Add a context-based authorization check that only allows admins to view user emails (assume emails exist in your data).
- Implement a tiny in-request cache (per request) to avoid re-fetching the same user twice.

Part 4 — Pagination and validation
- Add pagination controls to posts (limit) and ensure a default limit exists.
- Validate input using GraphQL’s type system; demonstrate how invalid input results in a GraphQL error rather than server crash.

Part 5 — Real-world considerations
- Document a few ideas for production: adding depth/complexity limits, connection-based pagination (Relay-style), and instrumentation with logs or traces.

Deliverables:
- A single PHP file (or a small set of files) implementing the GraphQL endpoint as described.
- A few example GraphQL queries to test:
  - Basic: query { user(id: 1) { id name posts(limit: 2) { title } } }
  - Alias and fragment: a query using an alias for two users and a fragment for UserFields
  - Variables: query GetUser($id: Int!, $limit: Int) { user(id: $id) { ...UserFields posts(limit: $limit) { title } } } with a variables block

Notes:
- You can scaffold a minimal HTTP server (e.g., via PHP's built-in server) or run through a simple CLI-based invocation for testing.
- The code examples above use in-memory data for simplicity; in production, you would connect to a database and fetch data with prepared statements and proper indexing.

This completes the GraphQL — Flexible API Queries lesson for PHP in Phase 7: Advanced API Features.