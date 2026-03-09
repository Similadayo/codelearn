# Track: Backend Engineering - Module: Phase 7 — Advanced API Features - Topic: Caching with Redis — Speed Up Your API

Caching is a first-class performance technique for modern backends. Using Redis as a caching layer in Go can dramatically reduce latency for read-heavy endpoints, decrease pressure on databases, and help your services scale under load. This lesson walks you through practical patterns, concrete Go code, and real-world considerations to implement fast, reliable caches in production.

## 1. Core Redis Setup in Go: Connect, Ping, and Basic Get/Set

Code
```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

var ctx = context.Background()

func main() {
	// Establish a Redis client
	rdb := redis.NewClient(&redis.Options{
		Addr:     "localhost:6379",
		Password: "", // no password by default
		DB:       0,  // use default DB
	})
	defer rdb.Close()

	// Warm-up: ping to ensure connectivity
	if err := rdb.Ping(ctx).Err(); err != nil {
		panic(fmt.Sprintf("cannot connect to Redis: %v", err))
	}

	// Basic Set with TTL
	err := rdb.Set(ctx, "intro:hello", "world", 10*time.Second).Err()
	if err != nil {
		fmt.Println("SET error:", err)
		return
	}

	// Basic Get
	val, err := rdb.Get(ctx, "intro:hello").Result()
	if err != nil {
		fmt.Println("GET error:", err)
		return
	}
	fmt.Println("intro:hello =", val)
}
```

### Line-by-line explanation
- package main: Defines the executable program.
- import (...): Brings in context, time, fmt, and the Redis client library.
- var ctx = context.Background(): Creates a top-level context for Redis operations.
- func main(): Entry point of the program.
- rdb := redis.NewClient(...): Instantiates a Redis client with address, auth, and DB.
- defer rdb.Close(): Ensures resources are released when the program ends.
- rdb.Ping(ctx).Err(): Checks Redis connectivity; panics with a helpful message on failure.
- rdb.Set(ctx, "intro:hello", "world", 10*time.Second).Err(): Stores a string value with a 10-second TTL.
- rdb.Get(ctx, "intro:hello").Result(): Retrieves the value for the key; handles potential errors.
- fmt.Println("intro:hello =", val): Outputs the retrieved value.

## 2. Read-Through Cache Pattern in Go: Cache-aside with Redis

Code
```go
package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

type User struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// Simulated DB layer
func fetchFromDB(id int) (*User, error) {
	// In real code, fetch from your database here.
	// We simulate with a static value.
	if id <= 0 {
		return nil, errors.New("invalid id")
	}
	return &User{ID: id, Name: "Alice", Email: "alice@example.com"}, nil
}

func GetUser(ctx context.Context, rdb *redis.Client, id int) (*User, error) {
	key := fmt.Sprintf("user:%d", id)

	// Try to read from cache
	if s, err := rdb.Get(ctx, key).Result(); err == nil {
		var u User
		if err := json.Unmarshal([]byte(s), &u); err == nil {
			return &u, nil // cache hit
		}
		// If unmarshalling fails, continue to fetch from DB
	}

	// Cache miss: fetch from DB
	u, err := fetchFromDB(id)
	if err != nil {
		return nil, err
	}

	// Store result in cache with TTL
	b, _ := json.Marshal(u)
	_ = rdb.Set(ctx, key, b, time.Hour).Err() // cache for 1 hour

	return u, nil
}
```

### Line-by-line explanation
- type User struct: Defines a serializable user type for JSON encoding.
- fetchFromDB(id int): Mock DB fetch; returns a User or an error.
- GetUser(ctx, rdb, id): Implements the cache-aside pattern.
- key := fmt.Sprintf("user:%d", id): Namespaced cache key to avoid collisions.
- rdb.Get(ctx, key).Result(): Attempt to read the cached JSON blob.
- json.Unmarshal(...): Decode the cached JSON into a User struct.
- fetchFromDB(id): Fallback to DB when cache miss or decode failure.
- json.Marshal(u) & rdb.Set(..., 1*time.Hour): Serialize and store the user in Redis for 1 hour.

## 3. Caching HTTP Responses in a Go API: Simple Cache-Aside for Endpoints

Code
```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-redis/redis/v8"
)

type Product struct {
	ID    int    `json:"id"`
	Name  string `json:"name"`
	Stock int    `json:"stock"`
}

// Simulated data source
func fetchProductFromDB(id int) (*Product, error) {
	if id <= 0 {
		return nil, fmt.Errorf("invalid id")
	}
	return &Product{ID: id, Name: "Widget", Stock: 42}, nil
}

type App struct {
	Redis *redis.Client
}

func (a *App) productHandler(w http.ResponseWriter, r *http.Request) {
	// Expect URL like /product/123
	parts := strings.Split(r.URL.Path, "/")
	if len(parts) < 3 {
		http.Error(w, "missing product id", http.StatusBadRequest)
		return
	}
	id, err := strconv.Atoi(parts[2])
	if err != nil {
		http.Error(w, "invalid id", http.StatusBadRequest)
		return
	}

	key := fmt.Sprintf("cache:product:%d", id)
	ctx := r.Context()

	// Try cache first
	if cached, err := a.Redis.Get(ctx, key).Result(); err == nil {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(cached))
		return
	}

	// Cache miss: fetch from DB
	p, err := fetchProductFromDB(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}
	data, _ := json.Marshal(p)

	// Populate cache for future requests
	_ = a.Redis.Set(ctx, key, data, 5*time.Minute).Err()

	// Return response
	w.Header().Set("Content-Type", "application/json")
	w.Write(data)
}

func main() {
	rdb := redis.NewClient(&redis.Options{ Addr: "localhost:6379" })
	app := &App{Redis: rdb}

	// Route /product/{id}
	http.HandleFunc("/product/", app.productHandler)

	fmt.Println("API listening on :8080")
	_ = http.ListenAndServe(":8080", nil)
}
```

### Line-by-line explanation
- type Product struct: Defines the shape of product data to cache and serve.
- fetchProductFromDB(id int): Simulates a DB fetch for a product.
- type App struct { Redis *redis.Client }: Wraps Redis in an app context for handlers.
- productHandler: HTTP handler for /product/{id}.
- Path parsing and validation: Extracts the numeric product ID from the URL.
- Redis Get: Attempts to fetch cached JSON for the product.
- JSON marshalling: If cache miss, marshal the DB result to JSON.
- Redis Set: Writes the JSON to Redis with a 5-minute TTL.
- HTTP response: Writes the JSON payload to the client.

## 4. Cache Invalidation and TTL Strategies: When to Evict or Refresh

Code
```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

type Article struct {
	ID    int    `json:"id"`
	Title string `json:"title"`
	Body  string `json:"body"`
}

// Simulated DB update
func updateArticleInDB(a *Article) error {
	// pretend DB write happens here
	return nil
}

func cacheKeyForArticle(id int) string {
	return fmt.Sprintf("cache:article:%d", id)
}

func updateArticleAndInvalidate(ctx context.Context, rdb *redis.Client, a *Article) error {
	// 1) Persist to DB
	if err := updateArticleInDB(a); err != nil {
		return err
	}
	// 2) Invalidate cache to ensure next read fetches fresh data
	key := cacheKeyForArticle(a.ID)
	_ = rdb.Del(ctx, key).Err() // best-effort; ignore error if key not present
	return nil
}

// Optional: refresh cache after update
func refreshCacheAfterUpdate(ctx context.Context, rdb *redis.Client, a *Article, ttl time.Duration) error {
	data, _ := json.Marshal(a)
	_ = rdb.Set(ctx, cacheKeyForArticle(a.ID), data, ttl).Err()
	return nil
}
```

### Line-by-line explanation
- Article struct: Defines a cacheable article payload.
- updateArticleInDB: Placeholder for persisting updates to the database.
- cacheKeyForArticle: Centralizes key naming to avoid typos.
- updateArticleAndInvalidate: Implements “write-through with explicit invalidate” pattern.
  - Persist to DB first.
  - Invalidate the corresponding cache key to avoid serving stale data.
- refreshCacheAfterUpdate: Optional helper to repopulate cache after DB write with a new TTL.

## 5. Observability, Resilience, and Production Considerations

Code
```go
package main

import (
	"context"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

func safeCacheGet(ctx context.Context, rdb *redis.Client, key string) (string, bool) {
	val, err := rdb.Get(ctx, key).Result()
	if err != nil {
		// Redis may be down or key missing; treat as cache miss
		return "", false
	}
	return val, true
}

func safeCacheSet(ctx context.Context, rdb *redis.Client, key string, value string, ttl time.Duration) {
	// Best effort: do not panic on cache write failure
	_ = rdb.Set(ctx, key, value, ttl).Err()
}

func main() {
	// In production, Redis should be clustered, monitored, and TTLs tuned.
	fmt.Println("This section discusses resilience patterns, not a runnable snippet.")
}
```

### Line-by-line explanation
- safeCacheGet: Encapsulates a Redis read with a no-failure fallback; returns a cache miss indicator on error.
- safeCacheSet: Writes to cache as a best-effort operation, swallowing errors to avoid user-facing failures.
- main: Demonstrates that in production you must consider clustering, monitoring, and TTL tuning.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: No TTL or overly long TTL
  - Bad:
  ```go
  // No TTL results in a permanently cached item
  rdb.Set(ctx, "config:site", data, 0) // TTL 0 means no expiry
  ```
  - Good:
  ```go
  // Use a reasonable TTL to prevent stale data
  rdb.Set(ctx, "config:site", data, 24*time.Hour)
  ```

- Pitfall 2: Not invalidating cache on writes
  - Bad:
  ```go
  // Update DB but never touch the cache
  updateArticleInDB(a)
  ```
  - Good:
  ```go
  updateArticleInDB(a)
  _ = rdb.Del(ctx, cacheKeyForArticle(a.ID)).Err()
  // Optional: refresh cache with new data
  _ = refreshCacheAfterUpdate(ctx, rdb, a, 24*time.Hour)
  ```

- Pitfall 3: Ignoring Redis outages and failing loudly
  - Bad:
  ```go
  val, _ := rdb.Get(ctx, key).Result()
  // If error occurs, proceed with nil or panic
  if val == "" {
      // assume cache miss; still fetch from DB
  }
  ```
  - Good:
  ```go
  val, ok := safeCacheGet(ctx, rdb, key)
  if !ok {
      // fetch from DB and then set cache
  }
  ```

- Pitfall 4: Poor key naming and lack of namespacing
  - Bad:
  ```go
  rdb.Get(ctx, "product").Result()
  rdb.Set(ctx, "product", data, ttl)
  ```
  - Good:
  ```go
  rdb.Get(ctx, "cache:product:123").Result()
  rdb.Set(ctx, "cache:product:123", data, ttl)
  ```

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Latency and throughput: A fast cache reduces tail latency and increases request throughput, especially for read-heavy endpoints.
- Cache stampede risk: When a cache entry expires, many requests can simultaneously hit the DB. Mitigations include:
  - Staggered TTLs and per-key locking (singleflight, mutexes).
  - Read-through caching with a warm-up strategy and background refresh.
- Cache invalidation correctness: Write operations must invalidate or refresh the cached data to avoid serving stale content.
- Key strategy and namespace: Use consistent prefixes like cache:, user:, product:, so that keys are easy to reason about, searchable, and conflict-free.
- Observability: Track cache hits vs. misses, eviction rates, and Redis latency. Instrument metrics and logs to detect cache-related regressions.
- Reliability and fallbacks: Design Go services to gracefully degrade to DB reads when Redis is unavailable, rather than returning errors to users.
- Security and data size: Store only serializable, minimal data; consider access-control implications for cached payloads.

## Z. Study Questions — 5 recall questions

1) What is the cache-aside (read-through) pattern, and how is it implemented in Go with Redis in this lesson?
2) How do you set a TTL on a Redis key using the go-redis client?
3) Why is cache invalidation important after a write operation, and what is a simple invalidation approach shown here?
4) What are common strategies to avoid cache stampede and ensure cache warmth?
5) How should your application behave when Redis is down or unreachable, according to the resilience patterns demonstrated?

## Exercise — Practical multi-part coding challenge

Part A: Build a small Go HTTP API with Redis-backed caching for a product endpoint
- Implement an HTTP server with an endpoint GET /product/{id}.
- Use Redis as a cache for product payloads. Simulate a DB fetch for misses.
- Cache responses with a TTL of 5 minutes. Ensure proper JSON encoding/decoding.

Part B: Implement cache invalidation on updates
- Add a new endpoint POST /product/{id} to update product data (simulate DB write).
- After updating, invalidate the corresponding cache key in Redis. Optionally refresh the cache with updated data.

Part C: Observability and graceful degradation
- Instrument simple counters for cache hits and misses (in-memory, not external).
- Ensure that Redis outages do not crash the server; on Redis errors, fetch directly from the simulated DB source and serve data, while continuing to attempt cache writes opportunistically.

Part D: Robustness improvements (optional)
- Add per-key TTL variability to reduce stampede risk.
- Implement a basic singleflight-like mechanism to coalesce concurrent cache misses for the same key.

Deliverables
- A single Go module containing:
  - A Redis-backed cache layer with read-through pattern for a /product/{id} endpoint.
  - Cache invalidation on updates.
  - Graceful fallback in case Redis is unavailable.
  - Simple in-code metrics for hits/misses.
- Clear README or comments describing how to run Redis locally (e.g., docker run -p 6379:6379 redis:7-alpine) and how to exercise the API.

Notes
- Use the go-redis/redis v8 or v9 client as shown in the examples.
- The exercises focus on practical integration, not database wiring; simulate DB access where needed.