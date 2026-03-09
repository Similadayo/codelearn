# Phase 9 — System Design & Scalability: System Design Interview Walkthroughs (Ruby)

System design interviews test your ability to craft scalable, maintainable backends under real-world constraints. In Ruby, you’ll often reason about service boundaries, storage choices, caching strategies, and reliability guarantees, then walk through concrete trade-offs. This lesson uses a running running example of a URL Shortener to illustrate structured design walkthroughs, complete with Ruby code, line-by-line explanations, common beginner mistakes, and practical exercises you can implement end-to-end.

## 1. Clarify Requirements and API Design

Before coding, you must understand constraints, throughput, latency budgets, data growth, and failure modes. This section demonstrates how to capture requirements and define a starter API contract in Ruby.

```ruby
# 1. Clarify Requirements and API Design
# A tiny design-spec builder for a URL shortener.

class DesignSpec
  def initialize
    @requirements = {}
    @api = {}
  end

  def add_requirement(name, value)
    @requirements[name] = value
  end

  def add_api_endpoint(method:, path:, params: [], response: nil)
    @api[method.to_s] ||= {}
    @api[method.to_s][path] = { params: params, response: response }
  end

  def to_api_hash
    @api
  end

  def summary
    @requirements.map { |k, v| "#{k}: #{v}" }.join('; ')
  end
end

# Example usage
spec = DesignSpec.new
spec.add_requirement(:throughput, "1000 req/s")
spec.add_requirement(:latency, "<= 50 ms")
spec.add_api_endpoint(method: :POST, path: "/shorten", params: ["url"], response: "short_code")
spec.add_api_endpoint(method: :GET, path: "/:code", params: [], response: "redirect_url")

puts "API: #{spec.to_api_hash}"
puts "Summary: #{spec.summary}"
```

### Line-by-line explanation
- Line 1-3: A header-like comment describing the purpose of this block.
- Line 5: Define a DesignSpec class to collect constraints and API shape.
- Line 6: Initialize empty hashes for requirements and API surface.
- Line 9-11: add_requirement stores constraint metadata (throughput, latency, etc.).
- Line 14-18: add_api_endpoint registers an HTTP endpoint with method, path, required params, and expected response.
- Line 20: to_api_hash returns the assembled API surface for display or docs.
- Line 23-25: summary concatenates high-level constraints into a readable string.
- Line 29-32: Create a sample spec and populate throughput, latency, and two endpoints.
- Line 34-35: Print the API surface and a human-readable summary.

Notes:
- This phase focuses on alignment with product goals, not implementation details.
- In real systems, you would evolve this into a formal design document, SLOs, error budgets, and API contracts (e.g., OpenAPI).

---

## 2. High-Level Architecture and Data Model

Now that requirements are clarified, outline the components, data flows, and a Ruby-centric data model. This section demonstrates core entities, a simple base62 ID generator, and a minimal in-memory store suitable for local prototyping.

```ruby
# 2. High-Level Architecture and Data Model
require 'securerandom'
require 'time'

module Base62
  CHARS = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".freeze

  def self.encode(n)
    return CHARS[0] if n == 0
    s = ""
    while n > 0
      s = CHARS[n % 62] + s
      n /= 62
    end
    s
  end

  def self.decode(str)
    n = 0
    str.each_char do |ch|
      n = n * 62 + CHARS.index(ch)
    end
    n
  end
end

class ShortUrlStore
  def initialize
    @store = {}
  end

  def save(code, url)
    @store[code] = { url: url, created_at: Time.now }
  end

  def fetch(code)
    entry = @store[code]
    entry ? entry[:url] : nil
  end

  def exists?(code)
    @store.key?(code)
  end
end

class UrlShortener
  def initialize(store)
    @store = store
  end

  def shorten(url)
    id = nil
    loop do
      id = SecureRandom.random_number(1 << 40)
      code = Base62.encode(id)
      break unless @store.exists?(code)
    end
    @store.save(code, url)
    code
  end

  def expand(code)
    @store.fetch(code)
  end
end

# Demonstration
store = ShortUrlStore.new
shortener = UrlShortener.new(store)
code = shortener.shorten("https://example.com/very/long/path")
puts "Code: #{code}"
puts "Original: #{shortener.expand(code)}"
```

### Line-by-line explanation
- Line 1-3: Module and library requires for randomness and time handling.
- Line 5-14: Base62 module with encoding and decoding helpers to produce URL-friendly short codes.
- Line 16-25: ShortUrlStore is a simple in-memory mapping from code -> { url, created_at } for prototyping.
- Line 27-37: UrlShortener uses the store to create unique short codes by generating random IDs and encoding them in base62; it ensures no collision by checking existence in the store.
- Line 39-41: Shorten(url) returns a new code after persisting the mapping.
- Line 43-45: expand(code) retrieves the original URL from the store.
- Line 48-50: Demonstration of shortening a URL and then expanding it to verify round-trip.
  
Architectural takeaway:
- This prototype shows a clean separation between storage (ShortUrlStore) and the domain logic (UrlShortener). In production, replace the in-memory store with Redis or a relational/NoSQL DB and consider deterministic ID generation to avoid potential collisions.

---

## 3. Data Modeling, Storage Strategy, and Caching

For real systems, you’ll add durable storage, indexing, and caching to meet latency targets. This section demonstrates a simple in-memory cache with a TTL, plus a basic sharding concept to distribute data across multiple in-process stores.

```ruby
# 3. Data Modeling, Storage Strategy, and Caching

# Simple in-memory cache with TTL
class SimpleCache
  def initialize
    @store = {}
  end

  def set(key, value, ttl_seconds)
    @store[key] = [value, Time.now + ttl_seconds]
  end

  def get(key)
    entry = @store[key]
    return nil unless entry
    value, expires_at = entry
    if Time.now > expires_at
      @store.delete(key)
      nil
    else
      value
    end
  end
end

# A very small shard: each shard is a separate in-memory map
class Shard
  def initialize
    @map = {}
  end

  def save(code, url)
    @map[code] = url
  end

  def fetch(code)
    @map[code]
  end
end

# Simple router to pick a shard based on URL hash
class ShardRouter
  def initialize(shards)
    @shards = shards
  end

  def shard_for(url)
    index = url.hash % @shards.length
    @shards[index]
  end
end

class ShardedStore
  def initialize(shards)
    @shards = shards
    @router = ShardRouter.new(shards)
  end

  def save(code, url)
    shard = @router.shard_for(url)
    shard.save(code, url)
  end

  def fetch(code)
    @shards.each do |shard|
      url = shard.fetch(code)
      return url if url
    end
    nil
  end
end

# Compose: shortener with sharded storage and cache
store_a = Shard.new
store_b = Shard.new
store_c = Shard.new
sharded_store = ShardedStore.new([store_a, store_b, store_c])
cache = SimpleCache.new

class UrlShortenerWithCache
  def initialize(store, cache)
    @store = store
    @cache = cache
  end

  def shorten(url)
    # Use an external counter in a real system; here just a random id
    code = Base62.encode(SecureRandom.random_number(1 << 40))
    @store.save(code, url)
    @cache.set(code, url, 300) # cache the mapping for 5 minutes
    code
  end

  def expand(code)
    cached = @cache.get(code)
    return cached if cached
    url = @store.fetch(code)
    @cache.set(code, url, 300) if url
    url
  end
end

long_url = "https://www.example.com/a/very/long/path?with=query"
shortener_cached = UrlShortenerWithCache.new(sharded_store, cache)
code = shortener_cached.shorten(long_url)
puts "Code (cached path): #{code}"
puts "Expanded (cached path): #{shortener_cached.expand(code)}"
```

### Line-by-line explanation
- Line 1-4: Section header and cache/shard scaffolding.
- Line 7-15: SimpleCache provides a TTL-protected in-memory cache. set stores value with expiration; get returns nil if expired.
- Line 18-26: Shard represents a small in-memory key-value store for a subset of codes.
- Line 29-34: ShardRouter computes which shard handles a given URL, ensuring distribution.
- Line 37-46: ShardedStore wraps multiple shards and provides a fetch path that searches all shards for a code (to keep the demo simple).
- Line 49-66: Compose a UrlShortenerWithCache that uses a sharded store and a cache; shorten writes to the store and primes the cache; expand first checks cache, then store, and primes cache on miss.
- Line 68-70: Demonstration of shortening and expanding with caching.

Notes:
- This demonstrates core patterns: caching to reduce read latency, and sharding to spread write/read load. In real systems, you would back stores with Redis/Elasticsearch/Cassandra/etc., and you might implement a global index for reverse lookups.

---

## 4. Observability, Reliability, and API Gateway Patterns

Production systems require visibility, health checks, and reliability protections (logs, metrics, circuit breakers, etc.). This section shows simple instrumentation hooks and a health check stub in Ruby.

```ruby
# 4. Observability, Reliability, and API Gateway Patterns

require 'logger'

class Metrics
  def initialize
    @counts = Hash.new(0)
  end

  def inc(key, by = 1)
    @counts[key] += by
  end

  def get(key)
    @counts[key]
  end
end

class HealthCheck
  def ok?
    true
  end
end

class ApiLogger
  def initialize
    @logger = Logger.new(STDOUT)
  end

  def info(msg)
    @logger.info(msg)
  end
end

# Simple integration example
logger = ApiLogger.new
metrics = Metrics.new

# simulate a request
def process_shortening(url, code, metrics, logger)
  metrics.inc(:requests_total)
  logger.info("Shortening: #{url} -> #{code}")
end

process_shortening("https://example.com/x", "abc123", metrics, logger)
puts "Requests: #{metrics.get(:requests_total)}"
```

### Line-by-line explanation
- Line 1-2: Bring in Ruby's standard logger.
- Line 4-10: Metrics class accumulates simple counters (e.g., total requests, cache hits).
- Line 12-16: HealthCheck stub; in a real system this would probe dependencies (DBs, caches, queues).
- Line 18-24: ApiLogger wraps a standard Ruby logger for consistent logging.
- Line 28-37: A tiny function demonstrates instrumentation by incrementing a request counter and emitting a log line when a shortening event occurs.
- Line 39-41: Execute a simulated request and print the metrics value.

Notes:
- In real deployments, you would export metrics to a system like Prometheus, include tracing (OpenTelemetry), and add dashboards for latency, error rates, and saturation.

---

## 5. Common Beginner Mistakes

Three or more real pitfalls with bad vs good code side-by-side. Each item shows a short, concrete Ruby example and a corrected version.

### Mistake 1: Relying on in-process, in-memory state for persistence in multi-process deployments

Bad (in-memory global map; unsafe across processes)
```ruby
# Bad: global in-memory map
$global_url_map = {}

def short_bad(url)
  code = (url.hash % 1000000).to_s(62)
  $global_url_map[code] = url
  code
end

def expand_bad(code)
  $global_url_map[code]
end
```

Good (external, durable store with proper isolation)
```ruby
# Good: external store (pseudo-Redis-like interface)
# In real systems, replace with Redis or a DB-backed store.
class ExternalStore
  def initialize
    @map = {}
  end
  def save(code, url)
    @map[code] = url
  end
  def fetch(code)
    @map[code]
  end
end

$external_store = ExternalStore.new

def short_good(url)
  code = SecureRandom.urlsafe_base64(6)
  $external_store.save(code, url)
  code
end

def expand_good(code)
  $external_store.fetch(code)
end
```

### Mistake 2: Skipping input validation (security and correctness)

Bad
```ruby
def shorten_bad(url)
  code = SecureRandom.alphanumeric(6)
  STORE[code] = url
  code
end
```

Good (validate URL before shortening)
```ruby
require 'uri'

def shorten_good(url)
  uri = URI.parse(url)
  raise "Invalid URL" unless uri.is_a?(URI::HTTP) || uri.is_a?(URI::HTTPS)
  code = Base62.encode(SecureRandom.random_number(1 << 40))
  STORE[code] = url
  code
end
```

### Mistake 3: Not using TTL or cache invalidation

Bad (no TTL, leading to stale cache)
```ruby
class BadCache
  def initialize
    @store = {}
  end
  def set(key, value)
    @store[key] = value
  end
  def get(key)
    @store[key]
  end
end
```

Good (TTL-aware cache)
```ruby
class TtlCache
  def initialize
    @store = {}
  end
  def set(key, value, ttl_seconds)
    @store[key] = [value, Time.now + ttl_seconds]
  end
  def get(key)
    value, expires_at = @store[key]
    return nil if value.nil? || Time.now > expires_at
    value
  end
end
```

### Mistake 4: Blocking IO in request path without async work

Bad (synchronous expansion with potential latency)
```ruby
def expand_sync(code)
  # pretend fetch from DB
  sleep(0.05)
  "https://example.com/#{code}"
end
```

Good (separate work from request thread, using a background job pattern)
```ruby
# Pseudo-background work queue
require 'thread'
QUEUE = Queue.new

def enqueue_expand(code)
  QUEUE << code
end

def worker
  loop do
    code = QUEUE.pop
    # process and persist metrics, pre-fetch, etc.
  end
end

Thread.new { worker }

def expand_async(code)
  enqueue_expand(code)
  "in-progress"
end
```

Why these matter:
- Real systems span multiple processes and machines; in-memory/global state is unsafe for production.
- Input validation prevents abuse and accidental misrouting.
- Caches require TTLs to avoid serving stale data.
- Asynchrony helps meet strict latency budgets.

---

## 6. Why This Matters In Real Systems

System design interview answers translate directly into production resilience and business outcomes. Consider:

- Throughput and latency budgets drive architectural choices (caching layers, sharding, and asynchronous processing).
- Data integrity vs availability trades: deterministic IDs vs random IDs; eventual consistency vs strong consistency for critical mappings.
- Observability is non-negotiable: you must be able to answer "how is the system performing?" in real-time, not after incidents.
- Reliability patterns such as idempotency, backoff, circuit breakers, and graceful degradation are essential for user trust.
- Evolvability matters: design for API versioning, feature toggles, and gradual migrations as requirements shift.

In Ruby ecosystems, think about using proven components (Redis, Sidekiq/ActiveJob, PostgreSQL, caching layers) and keeping components loosely coupled with clear interfaces. This approach yields scalable, maintainable systems aligned with both technical and business goals.

---

## 7. Study Questions

1) What is base62 encoding, and why is it commonly used for URL short codes?  
2) How would you design a URL shortener to scale to 1,000 req/s with low latency? Outline components and data flows.  
3) What is the difference between strong vs eventual consistency, and how does that affect design decisions for mapping codes to URLs?  
4) Why is caching important, and what are typical TTL values for hot-path lookups? How would you invalidate a cache when the mapping changes?  
5) Name three production observability practices you would include in your system design (e.g., metrics, tracing, logging) and why they matter.

---

## Exercise

A practical multi-part coding challenge to apply the concepts in Ruby.

Part A — Implement a minimal in-memory URL shortener
- Implement a Base62 encoder/decoder (reuse the Base62 module from Section 2 if desired).
- Build an in-memory store (Hash-based) with thread-safety for mapping codes to URLs.
- Provide a Shorten and Expand API:
  - shorten(url) -> code
  - expand(code) -> url or nil
- Ensure the API is deterministic enough for testing (avoid obvious collisions).

Part B — Add a Redis-like external store (mock for local tests)
- Create a simple ExternalStore interface with save(code, url) and fetch(code).
- Implement a thread-safe in-memory ExternalStore as the backing store for testing and demonstrate Shorten/Expand using the external store.

Part C — Introduce a TTL cache for high-traffic reads
- Implement a TTLCache with set(key, value, ttl) and get(key).
- Wire the TTLCache into your URL shortener so expands first consult the cache, then fall back to the store, and refresh the cache on hits.
- Add a simple test script to demonstrate cache hits and misses.

Part D — Simulate multi-threaded traffic
- Write a small driver that runs 5–10 worker threads performing shorten and expand operations on random URLs.
- Measure and print a simple throughput metric (ops/sec) and cache hit rate.
- Observe how adding the cache improves latency and reduces store load.

Deliverables:
- A single Ruby file (or a small set of files) that compiles and runs, printing outputs that demonstrate correctness (shorten/expand round-trips) and metrics (throughput, cache hits).
- A short README-style block describing assumptions, how to run tests, and how to extend for real-world production deployment.

This completes Phase 9 — System Design & Scalability: System Design Interview Walkthroughs in Ruby. You now have a structured approach to designing scalable backend systems, with Ruby code that illustrates API contracts, data modeling, storage strategies, caching, observability, and common pitfalls—plus an actionable exercise to practice end-to-end.