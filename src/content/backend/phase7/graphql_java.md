# GraphQL — Flexible API Queries in Java

GraphQL enables clients to request exactly the data they need in a single, flexible query language. In backend engineering, this means you can serve diverse frontend needs (mobile, web, third-party partners) without maintaining many versioned REST endpoints. In Java ecosystems, GraphQL Java provides a powerful, type-safe foundation to design schemas, implement resolvers, and optimize data fetching with patterns like DataLoader to avoid N+1 queries. This lesson walks you through building a flexible GraphQL API, optimizing with batch loading, handling arguments and variables, and applying best practices in real systems.

## 1. Building a Flexible GraphQL Schema in Java

This section demonstrates a minimal GraphQL API design in Java using graphql-java, including domain models, repositories, SDL-based schema, and wiring up data fetchers. The goal is to illustrate how a single GraphQL endpoint can serve flexible queries with nested relationships.

```java
// Domain models
public class User {
    private String id;
    private String name;
    // constructor, getters
}

public class Post {
    private String id;
    private String title;
    private String content;
    private String authorId;
    // constructor, getters
}
```

```java
// Repositories (in-memory sample)
import java.util.*;
import java.util.stream.*;

public class UserRepository {
    private final Map<String, User> users = new HashMap<>();

    public UserRepository() {
        users.put("1", new User("1", "Alice"));
        users.put("2", new User("2", "Bob"));
    }

    public Optional<User> findById(String id) { return Optional.ofNullable(users.get(id)); }
    public List<User> findAll() { return new ArrayList<>(users.values()); }
    public int count() { return users.size(); }
}
```

```java
// Post repository with simple data and a helper to fetch by user
import java.util.*;
import java.util.stream.*;

public class PostRepository {
    private final List<Post> posts = new ArrayList<>();

    public PostRepository() {
        posts.add(new Post("p1", "Intro to GraphQL", "Content A", "1"));
        posts.add(new Post("p2", "Advanced GraphQL", "Content B", "1"));
        posts.add(new Post("p3", "GraphQL in Java", "Content C", "2"));
    }

    public List<Post> findByUserId(String userId) {
        return posts.stream().filter(p -> p.getAuthorId().equals(userId)).collect(Collectors.toList());
    }

    // For DataLoader batch loading
    public Map<String, List<Post>> findPostsByUserIds(List<String> userIds) {
        Map<String, List<Post>> map = new HashMap<>();
        for (String id : userIds) map.put(id, new ArrayList<>());
        for (Post p : posts) {
            if (map.containsKey(p.getAuthorId())) map.get(p.getAuthorId()).add(p);
        }
        return map;
    }
}
```

```java
// SDL Schema (as a String)
String schema = """
type Query {
  user(id: ID!): User
  users(limit: Int = 10): [User!]!
}
type User {
  id: ID!
  name: String!
  posts(limit: Int = 10): [Post!]!
}
type Post {
  id: ID!
  title: String!
  content: String!
}
""";
```

```java
// Wiring: create DataFetchers and hook them to the schema
import graphql.schema.*;
import graphql.schema.idl.*;
import graphql.GraphQL;
import java.util.*;
import java.util.stream.*;

public class GraphQLServer {
    private final UserRepository userRepo = new UserRepository();
    private final PostRepository postRepo = new PostRepository();
    private final GraphQL graphQL;

    public GraphQLServer() {
        TypeDefinitionRegistry typeRegistry = new SchemaParser().parse(schema);

        DataFetcher<User> userFetcher = env -> {
            String id = env.getArgument("id");
            return userRepo.findById(id).orElse(null);
        };

        DataFetcher<List<User>> usersFetcher = env -> {
            int limit = Optional.ofNullable(env.getArgument("limit")).map(Integer::intValue).orElse(10);
            return userRepo.findAll().stream().limit(limit).collect(Collectors.toList());
        };

        DataFetcher<List<Post>> postsFetcher = env -> {
            User user = env.getSource();
            int limit = Optional.ofNullable(env.getArgument("limit")).map(Integer::intValue).orElse(10);
            List<Post> posts = postRepo.findByUserId(user.getId());
            return posts.stream().limit(limit).collect(Collectors.toList());
        };

        RuntimeWiring wiring = RuntimeWiring.newRuntimeWiring()
            .type(TypeRuntimeWiring.newTypeWiring("Query")
                .dataFetcher("user", userFetcher)
                .dataFetcher("users", usersFetcher))
            .type(TypeRuntimeWiring.newTypeWiring("User")
                .dataFetcher("posts", postsFetcher))
            .build();

        GraphQLSchema graphQLSchema = new SchemaGenerator().makeExecutableSchema(typeRegistry, wiring);
        this.graphQL = GraphQL.newGraphQL(graphQLSchema).build();
    }

    public GraphQL getGraphQL() { return graphQL; }

    // Simple execute helper
    public void execute(String query) {
        var result = graphQL.execute(query);
        System.out.println(result.getData().toString());
        if (!result.getErrors().isEmpty()) {
            System.err.println(result.getErrors());
        }
    }

    public static void main(String[] args) {
        GraphQLServer server = new GraphQLServer();
        String q = "{ user(id: \"1\") { id name posts(limit: 2) { id title } } }";
        server.execute(q);
    }
}
```

### Line-by-line explanation
- User, Post: define simple domain models for users and their posts.
- UserRepository, PostRepository: in-memory data stores with helper methods to fetch by user and create mappings for batch operations.
- SDL schema: declares the Query type and nested User and Post types; supports requesting a user and their posts.
- DataFetchers:
  - userFetcher: resolves a user by ID from the input argument.
  - usersFetcher: resolves a list of users, honoring an optional limit.
  - postsFetcher: resolves the posts for a given user, honoring a limit for nested queries.
- RuntimeWiring: wires the Query fields to their corresponding data fetchers and wires the User.posts field to its resolver.
- SchemaGenerator + GraphQL: builds the executable schema and a GraphQL instance for execution.
- main: runs a sample query to fetch a user and their first two posts.
- Execution: prints data and any potential errors.

## 2. Performance Scenarios: Avoiding N+1 with DataLoader

Flexible queries are powerful, but naive resolvers often trigger N+1 database calls. DataLoader batches per-request fetches to dramatically reduce round-trips. This section shows how to integrate DataLoader to batch fetching posts for multiple users in a single batched call.

```java
// DataLoader-based optimization
import org.dataloader.BatchLoader;
import org.dataloader.DataLoader;
import org.dataloader.DataLoaderOptions;
import org.dataloader.DataLoaderRegistry;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

public class DataLoaderExample {
    private final UserRepository userRepo = new UserRepository();
    private final PostRepository postRepo = new PostRepository();

    public GraphQL buildWithDataLoader() {
        // SDL and wiring as in section 1 (omitted for brevity)
        // Build a batch loader: given a list of userIds, return a List<List<Post>> with same order
        BatchLoader<String, List<Post>> postsByUserBatchLoader = userIds -> {
            return CompletableFuture.supplyAsync(() -> {
                Map<String, List<Post>> byUser = postRepo.findPostsByUserIds(userIds);
                return userIds.stream()
                        .map(id -> byUser.getOrDefault(id, Collections.emptyList()))
                        .collect(Collectors.toList());
            });
        };

        DataLoader<String, List<Post>> postsByUserLoader = DataLoader.newDataLoader(postsByUserBatchLoader);
        DataLoaderRegistry registry = new DataLoaderRegistry();
        registry.register("postsByUser", postsByUserLoader);

        // Data fetcher that uses the DataLoader
        // In the actual wiring, you would replace the postsFetcher in section 1 with this loader:
        DataFetcher<CompletableFuture<List<Post>>> postsLoaderFetcher = env -> {
            User user = env.getSource();
            DataLoader<String, List<Post>> loader = env.getDataLoader("postsByUser");
            return loader.load(user.getId());
        };

        // Placeholder: attach postsLoaderFetcher to the User.posts field in the Wiring
        // The rest of the GraphQL setup remains the same.
        return GraphQL.newGraphQL(/* schema */)
                    .build();
    }

    public static void main(String[] args) {
        DataLoaderExample ex = new DataLoaderExample();
        GraphQL g = ex.buildWithDataLoader();
        // Construct a query that fetches multiple users and their posts
        String query = "{ users(limit: 5) { id name posts(limit: 3) { id title } } }";

        // Build ExecutionInput with registry to enable DataLoader batching
        // ExecutionInput input = ExecutionInput.newExecutionInput().query(query).dataLoaderRegistry(registry).build();

        // GraphQL result = g.execute(input);
        // System.out.println(result.getData().toString());
    }
}
```

### Line-by-line explanation
- BatchLoader: defines how to batch-load posts for a set of userIds. It returns a List<List<Post>> whose order matches the input keys.
- Post loading: postRepo.findPostsByUserIds constructs a mapping from userId to their posts; the batch loader then maps the input keys to corresponding post lists.
- DataLoader: wraps the batch loader with a per-request cache and batching behavior.
- DataLoaderRegistry: holds the data loaders for the request lifecycle; the GraphQL execution should use this registry so DataLoader can batch across resolvers.
- postsLoaderFetcher: resolver for User.posts that uses the DataLoader to fetch posts for a user in a batched fashion.
- Wiring: the actual wiring should replace the simple posts data fetcher with this DataLoader-based fetcher, ensuring per-request batching.

Note: The core idea is to collect all requested user IDs during resolver execution and fetch all posts in a single batch call, then distribute results back to each user’s field resolution.

## 3. Advanced Query Patterns: Arguments, Aliases, and Variables

GraphQL shines when clients can tailor queries with arguments, aliases, fragments, and variables. The server-side concerns include supporting arguments for filtering, and properly handling variables in ExecutionInput.

```java
// Example: executing a query with variables
String queryWithVariables = """
query GetUser($userId: ID!) {
  user(id: $userId) {
    id
    name
    posts(limit: 2) { id, title }
  }
}
""";

Map<String, Object> variables = Map.of("userId", "1");

ExecutionInput input = ExecutionInput.newExecutionInput()
    .query(queryWithVariables)
    .variables(variables)
    .build();

ExecutionResult result = graphQL.execute(input);
System.out.println(result.getData().toString());
```

```java
// Example: alias usage (client-side convenience; server supports it transparently)
String aliasQuery = """
{
  author1: user(id: "1") { id, name }
  author2: user(id: "2") { id, name }
}
""";

ExecutionResult aliasResult = graphQL.execute(aliasQuery);
System.out.println(aliasResult.getData().toString());
```

```java
// Example: inline fragments (client-side; server supports same schema)
String fragmentQuery = """
{
  user(id: "1") {
    id
    ...UserDetails
    posts(limit: 1) { id, title }
  }
}
fragment UserDetails on User {
  name
}
""";

ExecutionResult fragmentResult = graphQL.execute(fragmentQuery);
System.out.println(fragmentResult.getData().toString());
```

### Line-by-line explanation
- variables query: demonstrates how to supply external data to a query without string-concatenation, enabling reuse and safety.
- ExecutionInput: bundles the query and its variables so the engine can resolve parameters consistently.
- alias query: shows how different fields can map to the same resolver with different arguments; the server-side resolvers are agnostic to alias usage.
- inline fragment: demonstrates how the client can conditionally request fields, while the server still resolves only what is requested.

## X. Common Beginner Mistakes

| Bad Code (Pitfall) | Good Code (Mitigation) |
| --- | --- |
| N+1 problem: DataFetcher for User.posts queries the database for each user inside a loop. | Use DataLoader to batch-load posts for all queried users in a single call. Example: loader.load(userId) inside the resolver, with a BatchLoader that returns List<Post> per user in the same input order. |
| No authorization checks in resolvers; returns large, sensitive data for every user. | Implement a context-based access control check in resolvers; throw GraphQLError or mask sensitive fields when not authorized. Example: if (!context.userCanRead(user)) throw new GraphQLError("Not authorized"); |
| Returning heavy fields unconditionally; clients request fields you fetch eagerly. | Inspect the SelectionSet to fetch heavy data only if requested, or lazy-load and populate only when field is requested. Example: if (env.getSelectionSet().contains("content")) { fetchHeavyContent(); } |
| Directly throwing NPE or unchecked exceptions on missing data. | Validate inputs and return GraphQL-compliant errors (GraphQLError) instead of crashing; use Optional and orElseThrow with a meaningful message. |
| Mixing SDL and code without keeping schema in sync; breaking refactors silently. | Maintain a single source of truth for the schema (SDL) or use code-first with tests; run a schema validation test as part of CI. |

Bad vs Good snippets (illustrative)

```java
// Bad: N+1 query example (resolver queries per user)
DataFetcher<List<Post>> postsFetcherBad = env -> {
  User user = env.getSource();
  return postRepo.findByUserId(user.getId()); // called for each user
};

// Good: DataLoader batches loads
DataFetcher<CompletableFuture<List<Post>>> postsFetcherGood = env -> {
  User user = env.getSource();
  DataLoader<String, List<Post>> loader = env.getDataLoader("postsByUser");
  return loader.load(user.getId());
}
```

```java
// Bad: No authorization check
DataFetcher<User> userFetcherBad = env -> {
  String id = env.getArgument("id");
  return userRepo.findById(id).orElse(null);
};

// Good: Authorization check in the resolver
DataFetcher<User> userFetcherGood = env -> {
  String id = env.getArgument("id");
  User user = userRepo.findById(id).orElse(null);
  if (user == null) throw new GraphQLError("User not found");
  if (!context.hasAccess(user)) throw new GraphQLError("Not authorized");
  return user;
}
```

```java
// Bad: Unconditional heavy field fetch
DataFetcher<Post> postFetcherBad = env -> {
  Post p = // fetch minimal post data
  p.setContent(contentService.fetch(p.getId())); // always fetch content
  return p;
};

// Good: Conditional fetch based on field requested
DataFetcher<Post> postFetcherGood = env -> {
  Post p = // fetch basic fields
  if (env.getSelectionSet().contains("content")) {
    p.setContent(contentService.fetch(p.getId()));
  }
  return p;
}
```

```java
// Bad: Silence errors in GraphQL layer
try {
  // resolver logic
} catch (Exception e) {
  // swallow error
}
// Client sees no information
```

```java
// Bad: Schema drift
// Code changes but SDL not updated, tests fail silently
```

```java
// Good: Use a test to validate schema and resolver contracts
@Test
public void testUserQuerySchemaMatchesResolver() {
  // load SDL, build runtime wiring, execute a sample query, assert structure
}
```

## Y. Why This Matters In Real Systems

- Flexibility at scale: GraphQL lets diverse clients fetch exactly what they need, reducing over-fetch and under-fetch compared to REST. This is especially valuable for mobile clients with bandwidth constraints and for dashboards with dynamic data needs.
- Efficient data access: When designed with DataLoader and batch loaders, you minimize N+1 queries, improving latency and DB load characteristics under concurrent user loads.
- Evolving schemas: GraphQL enables progressive enhancement and deprecation without breaking existing clients. You can introduce new fields and types, and deprecate older ones gradually.
- Security and governance: Centralized type-checked contracts help enforce authorization, field-level permissions, and auditing. Instrumentation and logging can capture query complexity, resolver timings, and error budgets.
- Observability and reliability: In production, you’ll want query complexity limits, depth limiting, tracing, caching layers (e.g., persisted queries), and structured logs to detect performance regressions early.

## Z. Study Questions

1. What problem does DataLoader solve in a GraphQL backend, and how does it avoid N+1 queries?
2. How do you execute a GraphQL query with variables in graphql-java, and why are variables beneficial?
3. Why is aliasing and fragments a client-side concern, and how does the server benefit from supporting them through resolvers?
4. What are some strategies to prevent schema drift when evolving a GraphQL API (SDL vs code-first approaches)?
5. How can you monitor and constrain GraphQL queries in production (e.g., depth, complexity, error handling)?

## Exercise

Part A — Extend the API with Comment type and batch-loaded comments

- Extend domain:
  - Add a Comment type with fields id, content, author (User).
  - Extend Post to expose a field comments(limit: Int = 10): [Comment!]!

- Implement repositories:
  - Create CommentRepository with in-memory data: (postId, List<Comment>), and a batch method findCommentsByPostIds(List<String> postIds) that returns Map<String, List<Comment>>.

- Update SDL:
  - Add type Comment { id: ID!, content: String!, author: User } and extend Post with comments field.

- Implement wiring:
  - Add DataLoader<String, List<Comment>> for comments by postId, similar to the posts DataLoader pattern.
  - In the Post resolver, resolve comments via the DataLoader so multiple posts fetch their comments in a single batched call.
  - Implement Comment.author resolver to resolve the author User (direct lookup or DataLoader for users as a future improvement).

Part B — Practical main and query

- Update the main to run a sample query like:
  {
    user(id: "1") {
      id
      name
      posts(limit: 2) {
        id
        title
        comments { id, content, author { id, name } }
      }
    }
  }

- Ensure the DataLoader registry is wired into ExecutionInput for batched loading of comments and, optionally, authors.

Part C — Quick tests

- Write a small test that asserts:
  - The query returns a non-null user with nested posts, and each post contains a list of comments.
  - The comments' author fields resolve to a User with a valid id and name.
  - The DataLoader batches calls (you can observe fewer than naive count of database/service calls).

Part D — Reflections

- Describe how this approach scales when you add more relations (e.g., likes, tags) and how you would evolve the schema to handle authorization, caching, and schema introspection in a production-grade system.

Note: The exercise emphasizes practical hands-on coding. You can implement the classes in a single module or break them into packages (domain, repository, graphql) as your project structure allows. The key learning outcomes are building a flexible GraphQL API in Java, leveraging DataLoader for performance, and applying the concepts to real-world backend systems.