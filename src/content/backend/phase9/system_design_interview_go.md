# System Design Interview Walkthroughs in Go

System design interviews test your ability to decompose problems, choose scalable components, and reason about tradeoffs under constraints. In Go, you can leverage strong typing, interfaces, and safe concurrency to build clean, testable designs that scale. This lesson walks through a concrete example problem, demonstrates Go patterns for design and scalability, and provides practical guidance you can use in real interviews and production systems.

## 1.  Framing the Problem and Defining the API

When a system design problem is stated (e.g., build a URL shortener or a content delivery microservice), the first step is to clarify requirements, constraints, and API shape. In Go, you can model the API contracts and validation as code to demonstrate rigor and testability during the interview.

```go
package main

import (
	"errors"
	"time"
)

type ShortenRequest struct {
	URL    string
	Expiry time.Duration
}

type ShortenResponse struct {
	Code   string
	Expiry time.Time
}

// Validate checks input constraints for the request.
// This models requirement validation you would discuss during the interview.
func Validate(req ShortenRequest) error {
	if req.URL == "" {
		return errors.New("empty URL")
	}
	if req.Expiry < 0 {
		return errors.New("expiry must be non-negative")
	}
	return nil
}
```

### Line-by-line explanation breaking down each line

- Line 1: package main declares the file as part of the main package for a runnable example.
- Lines 3-8: Import block bringing in errors for validation and time for expiry semantics.
- Lines 10-13: ShortenRequest struct models the input for shortening a URL.
- Lines 15-20: ShortenResponse struct models the result, including the generated code and expiry time.
- Lines 22-31: Validate validates basic constraints (non-empty URL and non-negative expiry) to illustrate API contract checks in the interview discussion.

---

## 2.  High-Level Architecture: Interfaces, Implementations, and a Simple Service

A scalable system typically decouples storage, caching, and ID generation behind interfaces so you can swap in different implementations (in-memory for tests, distributed stores for production). This section shows interfaces and basic in-memory implementations in Go.

```go
package main

import (
	"fmt"
	"sync"
)

type Storage interface {
	Put(key string, value []byte) error
	Get(key string) ([]byte, error)
}

type InMemoryStorage struct {
	mu   sync.RWMutex
	data map[string][]byte
}

func NewInMemoryStorage() *InMemoryStorage {
	return &InMemoryStorage{data: make(map[string][]byte)}
}

func (s *InMemoryStorage) Put(key string, value []byte) error {
	s.mu.Lock()
	s.data[key] = value
	s.mu.Unlock()
	return nil
}

func (s *InMemoryStorage) Get(key string) ([]byte, error) {
	s.mu.RLock()
	val, ok := s.data[key]
	s.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("not found: %s", key)
	}
	return val, nil
}
```

```go
package main

import (
	"sync"
)

type Cache interface {
	Put(key string, value []byte)
	Get(key string) ([]byte, bool)
}

type InMemoryCache struct {
	mu   sync.RWMutex
	data map[string][]byte
}

func NewInMemoryCache() *InMemoryCache {
	return &InMemoryCache{data: make(map[string][]byte)}
}

func (c *InMemoryCache) Put(key string, value []byte) {
	c.mu.Lock()
	c.data[key] = value
	c.mu.Unlock()
}

func (c *InMemoryCache) Get(key string) ([]byte, bool) {
	c.mu.RLock()
	val, ok := c.data[key]
	c.mu.RUnlock()
	return val, ok
}
```

```go
package main

import (
	"fmt"
	"time"
)

type ShortenerService struct {
	storage Storage
	cache   Cache
}

func NewShortenerService(storage Storage, cache Cache) *ShortenerService {
	return &ShortenerService{storage: storage, cache: cache}
}

// Shorten creates a short code for the given URL and stores the mapping.
func (s *ShortenerService) Shorten(url string) (string, error) {
	// Simple deterministic-ish code, suitable for demonstration.
	// In production you would use a ULID/KSUID, hash, or sequence with collision checks.
	code := fmt.Sprintf("%x", time.Now().UnixNano())[:6]
	key := "code:" + code
	if err := s.storage.Put(key, []byte(url)); err != nil {
		return "", err
	}
	// Preload cache
	s.cache.Put(code, []byte(url))
	return code, nil
}

// Resolve fetches the original URL for a given short code.
func (s *ShortenerService) Resolve(code string) (string, error) {
	// Try cache first
	if b, ok := s.cache.Get(code); ok {
		return string(b), nil
	}
	// Fallback to storage
	b, err := s.storage.Get("code:" + code)
	if err != nil {
		return "", err
	}
	// Update cache for subsequent hits
	s.cache.Put(code, b)
	return string(b), nil
}
```

### Line-by-line explanation breaking down each line

- Storage/Cache definitions:
  - Lines 1-2: package main and imports for storage components.
  - Lines 4-9: Storage interface declares Put/Get methods for key-value storage.
  - Lines 11-19: InMemoryStorage struct with a mutex and map; NewInMemoryStorage initializes storage.
  - Lines 21-32: Put writes with a write lock; Get reads with a read lock and returns not found if missing.
- Cache implementation:
  - Lines 1-6: Cache interface with Put/Get; InMemoryCache struct with a mutex and map.
  - Lines 9-12: NewInMemoryCache constructor.
  - Lines 14-23: Put writes under a write lock; Get reads under a read lock and returns existence flag.
- ShortenerService:
  - Lines 1-4: ShortenerService holds a storage and cache reference.
  - Lines 6-9: Constructor wiring storage and cache.
  - Shorten:
    - Generates a 6-hex-character code from current time.
    - Stores mapping under a key prefixed with "code:".
    - Caches the mapping for quick subsequent reads.
  - Resolve:
    - Checks cache first; if not found, fetches from storage.
    - Updates cache after a successful fetch.

---

## 3.  Designing for Scale: Sharding and Concurrency in Go

To scale, you commonly shard data across multiple backends. This section shows a small, self-contained sharding layer in Go that routes keys to one of several storage backends using a hash function.

```go
package main

import (
	"hash/fnv"
	"fmt"
	"sync"
)

type Storage interface {
	Put(key string, value []byte) error
	Get(key string) ([]byte, error)
}

type MapStorage struct {
	mu   sync.RWMutex
	data map[string][]byte
}

func NewMapStorage() *MapStorage {
	return &MapStorage{data: make(map[string][]byte)}
}

func (m *MapStorage) Put(key string, value []byte) error {
	m.mu.Lock()
	m.data[key] = value
	m.mu.Unlock()
	return nil
}

func (m *MapStorage) Get(key string) ([]byte, error) {
	m.mu.RLock()
	v, ok := m.data[key]
	m.mu.RUnlock()
	if !ok {
		return nil, fmt.Errorf("not found: %s", key)
	}
	return v, nil
}

func hashToShard(key string, n int) int {
	h := fnv.New32a()
	h.Write([]byte(key))
	return int(h.Sum32()) % n
}

type ShardedStorage struct {
	shards []Storage
}

func NewShardedStorage(n int) *ShardedStorage {
	shards := make([]Storage, n)
	for i := 0; i < n; i++ {
		shards[i] = NewMapStorage()
	}
	return &ShardedStorage{shards: shards}
}

func (s *ShardedStorage) Put(key string, value []byte) error {
	shard := hashToShard(key, len(s.shards))
	return s.shards[shard].Put(key, value)
}

func (s *ShardedStorage) Get(key string) ([]byte, error) {
	shard := hashToShard(key, len(s.shards))
	return s.shards[shard].Get(key)
}
 
func main() {
	storage := NewShardedStorage(8)
	key := "code:abc123"
	if err := storage.Put(key, []byte("https://example.com")); err != nil {
		fmt.Println("put error:", err)
		return
	}
	val, err := storage.Get(key)
	if err != nil {
		fmt.Println("get error:", err)
		return
	}
	fmt.Println("Retrieved:", string(val))
}
```

### Line-by-line explanation breaking down each line

- Lines 1-6: Package/import, bringing in the hash function, fmt for errors, and sync for concurrency primitives.
- Storage Map:
  - Lines 8-13: Storage interface reused for compatibility with prior blocks.
  - Lines 15-22: MapStorage struct with a RWMutex and a map; NewMapStorage initializes it.
  - Lines 24-33: Put stores a key/value under a write lock; Get reads under a read lock and returns not found if missing.
- Hashing helper:
  - Lines 38-44: hashToShard computes a shard index from the key using FNV-1a and modulus by the number of shards.
- Sharding layer:
  - Lines 46-51: ShardedStorage holds an array of Storage backends.
  - Lines 53-60: NewShardedStorage creates N shards of MapStorage.
  - Lines 62-66: Put routes the write to the correct shard based on the hash.
  - Lines 68-72: Get routes reads to the correct shard based on the hash.
- Main:
  - Lines 74-88: Demonstrates writing and reading through the sharded storage.

---

## 4.  Observability, Reliability, and Testing Patterns

Real systems require visibility, resilience, and testability. The following Go patterns illustrate retry with backoff, cancellation, and lightweight metrics you can ship in production code.

```go
package main

import (
	"context"
	"errors"
	"fmt"
	"time"
)

// Retry performs an operation with exponential-like backoff and context cancellation.
func Retry(ctx context.Context, maxRetries int, backoff time.Duration, op func() error) error {
	var err error
	for i := 0; i <= maxRetries; i++ {
		if i > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
		}
		err = op()
		if err == nil {
			return nil
		}
	}
	return err
}
```

```go
package main

import (
	"context"
	"errors"
	"fmt"
	"time"
)

type Metrics struct {
	mu      sync.Mutex
	counters map[string]int
}

func NewMetrics() *Metrics {
	return &Metrics{counters: make(map[string]int)}
}

func (m *Metrics) Inc(name string) {
	m.mu.Lock()
	m.counters[name]++
	m.mu.Unlock()
}

func (m *Metrics) Get(name string) int {
	m.mu.Lock()
	val := m.counters[name]
	m.mu.Unlock()
	return val
}
```

### Line-by-line explanation breaking down each line (Retry)

- Retry signature line: Accepts a context, maximum retries, backoff duration, and an operation function.
- Loop iterates from 0 to maxRetries, applying backoff between attempts after the first.
- Context cancellation is respected to avoid blocking indefinitely.
- op() is invoked; if it returns nil, the function terminates successfully.
- If all attempts fail, the last error is returned.

### Line-by-line explanation breaking down each line (Metrics)

- Metrics struct holds a mutex and a map of counters for simple instrumentation.
- Inc increments a named counter under a mutex to be thread-safe.
- Get retrieves a named counter value with a small lock around access.

---

## 5.  Common Beginner Mistakes

Pitfalls you’ll often see in interviews and real systems. Each pair shows a bad pattern and a corrected approach.

- Pitfall 1: Unprotected shared maps in concurrent code
  Bad:
  ```go
  var store = map[string]string{}

  func Put(key, value string) { store[key] = value }
  func Get(key string) string { return store[key] }
  ```
  Good:
  ```go
  var (
    mu    sync.RWMutex
    store = make(map[string]string)
  )

  func Put(key, value string) {
    mu.Lock()
    store[key] = value
    mu.Unlock()
  }

  func Get(key string) (string, bool) {
    mu.RLock()
    v, ok := store[key]
    mu.RUnlock()
    return v, ok
  }
  ```

- Pitfall 2: Ignoring errors or failing to propagate them
  Bad:
  ```go
  func Save(key string, val []byte) { // error ignored
      _ = db.Put(key, val)
  }
  ```
  Good:
  ```go
  func Save(key string, val []byte) error {
      return db.Put(key, val)
  }
  ```

- Pitfall 3: Global mutable state (singletons) that make testing hard
  Bad:
  ```go
  var globalService *ShortenerService // global mutable
  ```
  Good:
  ```go
  type App struct {
      svc *ShortenerService
  }

  func NewApp(svc *ShortenerService) *App { return &App{svc: svc} }
  ```
  Then inject dependencies in tests.

- Pitfall 4: Not using context or timeouts on long-running operations
  Bad:
  ```go
  func DoWork() { time.Sleep(5 * time.Second) }
  ```
  Good:
  ```go
  func DoWork(ctx context.Context) error {
      select {
      case <-ctx.Done():
          return ctx.Err()
      case <-time.After(1 * time.Second):
          // work completes
      }
      return nil
  }
  ```

---

## 6.  Why This Matters In Real Systems

- Interplay of components: Real systems use stateless services with external storage and caches; this enables horizontal scaling and easier deployment.
- Concurrency model: Go’s goroutines, channels, and mutexes help you implement high-throughput services safely, but you must avoid data races and ensure proper synchronization.
- Observability: Instrumentation (metrics, logs, tracing) is essential for debugging production issues and for capacity planning.
- Reliability patterns: Retriable operations with backoff, timeouts, and circuit breakers prevent cascading failures and provide graceful degradation.
- Tradeoffs: Consistent hashing and sharding improve write throughput and scalability but introduce complexity around cross-shard transactions and rebalancing. Eventual consistency vs. strong consistency decisions depend on the problem domain.

In interviews, be prepared to discuss why you chose a particular data model, how you would scale with traffic growth, how you would monitor and test the system, and how you would handle partial failures (e.g., cache misses, shard outages).

---

## 7.  Study Questions

1) What is the purpose of framing API contracts early in a system design interview?  
2) How does consistent hashing help with scaling writes and reads across shards?  
3) Why are interfaces (Storage, Cache) important for testability and deployment flexibility?  
4) What is the difference between latency and throughput, and how might a design trade those off?  
5) How would you introduce observability and retries safely in production Go services?

---

## Exercise

Goal: Build a small, self-contained Go module that demonstrates a sharded URL shortener with in-memory storage, including a simple CLI and tests.

Part 0: Starter concepts
- Use the Storage interface and a Map-based in-memory backend.
- Implement a ShardedStorage with 4–8 shards using a hash function to route keys.
- Implement a ShortenerService that can Shorten(url string) to produce a code, and Resolve(code string) to fetch the original URL.
- Add a tiny CLI to shorten and resolve codes from stdin/stdout.

Part 1: Starter code (copy-paste to start)
```go
// main.go
package main

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"time"
)

type Storage interface {
	Put(key string, value []byte) error
	Get(key string) ([]byte, error)
}

type MapStorage struct {
	// TODO: implement a thread-safe in-memory map
}

func NewMapStorage() *MapStorage { /* TODO */ return &MapStorage{} }

func (m *MapStorage) Put(key string, value []byte) error { /* TODO */ return nil }

func (m *MapStorage) Get(key string) ([]byte, error) { /* TODO */ return nil, fmt.Errorf("not implemented") }

type ShardedStorage struct {
	shards []Storage
}

func NewShardedStorage(n int) *ShardedStorage { /* TODO */ return &ShardedStorage{} }

func (s *ShardedStorage) Put(key string, value []byte) error { /* TODO */ return nil }

func (s *ShardedStorage) Get(key string) ([]byte, error) { /* TODO */ return nil, fmt.Errorf("not implemented") }

type ShortenerService struct {
	storage Storage
	// simple counter for codes
	counter uint64
}

func NewShortenerService(storage Storage) *ShortenerService { return &ShortenerService{storage: storage} }

func (s *ShortenerService) Shorten(url string) (string, error) {
	// naive code: use timestamp + counter
	code := fmt.Sprintf("%06x", time.Now().UnixNano())
	key := "code:" + code
	if err := s.storage.Put(key, []byte(url)); err != nil {
		return "", err
	}
	return code, nil
}

func (s *ShortenerService) Resolve(code string) (string, error) {
	val, err := s.storage.Get("code:" + code)
	if err != nil {
		return "", err
	}
	return string(val), nil
}

func main() {
	// Simple CLI demonstration
	storage := NewShardedStorage(4)
	svc := NewShortenerService(storage)

	fmt.Println("Enter a URL to shorten:")
	in := bufio.NewScanner(os.Stdin)
	if in.Scan() {
		url := in.Text()
		code, err := svc.Shorten(url)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		fmt.Println("Short code:", code)

		// Resolve immediately for demo
		orig, err := svc.Resolve(code)
		if err != nil {
			fmt.Println("Resolve error:", err)
			return
		}
		fmt.Println("Resolved URL:", orig)
	}
}
```

Notes:
- Complete the MapStorage, ShardedStorage, and any necessary imports.
- Extend the CLI to support repeated shorten/resolve cycles or a simple flag-based mode.

Part 2: Tasks
- Implement a thread-safe MapStorage with Put/Get.
- Implement NewShardedStorage to create N shards and route keys via a hash function.
- Implement Shorten and Resolve, ensuring the same code yields the same URL within a run (and discuss cache implications).
- Add a small test that concurrently shortens 1000 URLs and then resolves a subset to verify correctness under concurrency.

Part 3: Extensions (optional)
- Add a simple time-to-live (TTL) for shortened mappings and a background cleaner.
- Add a basic metrics counter for successful Shorten and Resolve calls.
- Replace the naive code generator with a UUID-like approach (e.g., ULID/KSUID) to reduce collision risk.

How to run
- go test ./... (if you add tests)
- go run main.go
- Input a URL and observe the short code and the immediate resolution output

What to prepare for an interview
- Be ready to explain your choice of sharding strategy, why you used interfaces, and how you would handle shard rebalancing.
- Be able to discuss tradeoffs between in-memory vs. distributed storage, caching strategies, and eventual vs. strong consistency.
- Demonstrate how you’d instrument the service for production, including metrics, logging, and tracing.

If you’d like, I can tailor alternate problems (e.g., a rate-limiter, a chat message queue, or an image processing pipeline) and provide corresponding Go-based walkthroughs and exercise sets.