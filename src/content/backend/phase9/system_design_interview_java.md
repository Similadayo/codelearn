# System Design Interview Walkthroughs: Phase 9 — System Design & Scalability (Java)

System design interviews test your ability to reason about large-scale backends, communicate trade-offs, and translate abstract requirements into concrete, maintainable architectures. In this module, we focus on walkthroughs you can use in Java-based backends: clarifying requirements, sketching high-level architectures, choosing data stores, designing APIs with caching and performance in mind, and applying scalable patterns like sharding and event-driven communication. You’ll see concrete Java code that demonstrates patterns you can adapt in real systems, plus common pitfalls, production context, study prompts, and a hands-on exercise.

## 1. Clarify Requirements and Goals

Compelling system design starts with clarifying what you’re building, non-functional constraints, and success criteria. In interviews, you should extract functional scope, latency targets, throughput, data growth, consistency requirements, availability needs, and budgetary constraints. This helps bound the design and informs trade-offs.

```java
// Design specification container for a walk-through
public class DesignSpec {
  private final String systemName;
  private final Map<String, String> functionalRequirements;
  private final Map<String, String> nonFunctionalRequirements;
  private final int targetQps;
  private final long dataSizeGb;
  private final String consistencyModel; // e.g., "Strong", "Eventual", "Causal"
  private final String availabilityModel; // e.g., "AP", "CP", "CA" mindset
  private final long latencyBudgetMs;

  private DesignSpec(Builder b) {
    this.systemName = b.systemName;
    this.functionalRequirements = b.functionalRequirements;
    this.nonFunctionalRequirements = b.nonFunctionalRequirements;
    this.targetQps = b.targetQps;
    this.dataSizeGb = b.dataSizeGb;
    this.consistencyModel = b.consistencyModel;
    this.availabilityModel = b.availabilityModel;
    this.latencyBudgetMs = b.latencyBudgetMs;
  }

  public static class Builder {
    private String systemName;
    private Map<String, String> functionalRequirements = new HashMap<>();
    private Map<String, String> nonFunctionalRequirements = new HashMap<>();
    private int targetQps;
    private long dataSizeGb;
    private String consistencyModel = "Eventual";
    private String availabilityModel = "High";
    private long latencyBudgetMs = 200;

    public Builder(String systemName) { this.systemName = systemName; }

    public Builder addFunctional(String id, String description) {
      functionalRequirements.put(id, description);
      return this;
    }

    public Builder addNonFunctional(String id, String description) {
      nonFunctionalRequirements.put(id, description);
      return this;
    }

    public Builder setTargetQps(int qps) { this.targetQps = qps; return this; }
    public Builder setDataSizeGb(long gb) { this.dataSizeGb = gb; return this; }
    public Builder setConsistencyModel(String c) { this.consistencyModel = c; return this; }
    public Builder setLatencyBudgetMs(long ms) { this.latencyBudgetMs = ms; return this; }
    public Builder setAvailabilityModel(String a) { this.availabilityModel = a; return this; }

    public DesignSpec build() { return new DesignSpec(this); }
  }

  // Getters omitted for brevity
}
```

```java
// Example usage: framing a URL shortener design
DesignSpec spec = new DesignSpec.Builder("URL Shortener")
  .addFunctional("FR1", "Shorten a long URL to a short code")
  .addFunctional("FR2", "Redirect short code to original URL with a cache-friendly path")
  .addNonFunctional("NFR1", "90th percentile latency < 100 ms")
  .addNonFunctional("NFR2", "99.9% availability")
  .setTargetQps(5000)
  .setDataSizeGb(50)
  .setConsistencyModel("Eventual")
  .setLatencyBudgetMs(100)
  .setAvailabilityModel("High")
  .build();
```

### Line-by-line explanation
- public class DesignSpec { ... }: Defines a structured container to hold design goals and constraints for a walkthrough.
- private final String systemName; ...: Fields to capture name, functional/non-functional requirements, scale targets, data size, consistency, availability, and latency budget.
- private DesignSpec(Builder b) { ... }: Private constructor used by the Builder to create an immutable DesignSpec.
- public static class Builder { ... }: Builder pattern to fluently assemble a DesignSpec.
- public Builder(String systemName) { this.systemName = systemName; }: Initialize the builder with the system name.
- addFunctional/addNonFunctional: Collect functional/non-functional requirements as key-value pairs.
- setTargetQps/setDataSizeGb/setConsistencyModel/...: Set scale targets and constraints.
- build(): Constructs the immutable DesignSpec instance.
- DesignSpec spec = new DesignSpec.Builder("URL Shortener")...build(): Example usage showing how to capture a design goal for a URL shortener.

## 2. High-Level Architecture Sketch

A clear architecture sketch helps non-technical stakeholders visualize components and data paths. In a real system, you’d draw diagrams, but here is a compact Java model to illustrate components and dependencies that you can discuss in an interview.

```java
class ArchitectureDiagram {
  static class Component {
    String name;
    List<String> dependencies;
    Component(String name) {
      this.name = name;
      this.dependencies = new ArrayList<>();
    }
  }

  private final List<Component> components = new ArrayList<>();

  public void addComponent(String name, String... deps) {
    Component c = new Component(name);
    if (deps != null) c.dependencies.addAll(Arrays.asList(deps));
    components.add(c);
  }

  // For demonstration: print the diagram in a simple form
  public void print() {
    for (Component c : components) {
      System.out.println(c.name + " -> " + String.join(", ", c.dependencies));
    }
  }
}
```

```java
// Example usage: sketch a URL shortener architecture
ArchitectureDiagram diagram = new ArchitectureDiagram();
diagram.addComponent("API Gateway");
diagram.addComponent("Auth Service", "API Gateway");
diagram.addComponent("URL Shortener Service", "API Gateway", "Cache", "DB");
diagram.addComponent("Cache", "URL Shortener Service");
diagram.addComponent("DB", "URL Shortener Service");
diagram.print();
```

### Line-by-line explanation
- class ArchitectureDiagram { ... }: Holds a lightweight, code-friendly representation of architecture components and their dependencies.
- static class Component { String name; List<String> dependencies; ... }: Models a single system component and what it depends on.
- addComponent(String name, String... deps): Creates and registers a component with optional dependencies.
- print(): Simple utility to reveal the architecture in a readable form.
- Example usage: Builds a minimal graph showing API Gateway, Auth Service, URL Shortener, Cache, and DB, capturing dependencies between them.
- diagram.print(): Outputs the relationship map, helping you verbalize the architecture during a walkthrough.

## 3. Data Modeling and Storage Choices

Data modeling decisions and storage choices dramatically influence performance and consistency. The examples below illustrate a simple URL mapping entity and a repository abstraction with an in-memory implementation. In real systems, you would swap in SQL, NoSQL, or distributed caches as appropriate.

```java
class ShortUrl {
  String shortCode;
  String originalUrl;
  long createdAt;
  long expiresAt;
  int hitCount;
  // getters/setters omitted for brevity
}
```

```java
interface ShortUrlRepository {
  void save(ShortUrl url);
  Optional<ShortUrl> find(String shortCode);
}
```

```java
import java.util.concurrent.*;

class InMemoryShortUrlRepository implements ShortUrlRepository {
  private final ConcurrentMap<String, ShortUrl> store = new ConcurrentHashMap<>();

  @Override
  public void save(ShortUrl url) {
    store.put(url.shortCode, url);
  }

  @Override
  public Optional<ShortUrl> find(String shortCode) {
    return Optional.ofNullable(store.get(shortCode));
  }
}
```

### Line-by-line explanation
- class ShortUrl: Models the core data for a short URL, including shortCode, originalUrl, timestamps, and hitCount.
- interface ShortUrlRepository: Abstraction for persistence operations (save and lookup by short code).
- InMemoryShortUrlRepository: A thread-safe in-memory implementation using ConcurrentHashMap to store and retrieve ShortUrl objects.
- save(ShortUrl url): Persists or updates a mapping in the in-memory store.
- find(String shortCode): Retrieves a mapping, wrapped in Optional to express absence safely.
- This in-memory example demonstrates data modeling and API boundaries; in real systems, you’d have SQL/NoSQL repositories with indexing on shortCode and expiration logic.

## 4. APIs, Caching, and Performance Considerations

Caching and API design are central to meeting latency budgets. The following code blocks show a simple TTL cache and a token-bucket rate limiter to illustrate performance-related components you’d discuss in an interview.

```java
import java.util.concurrent.*;
```

```java
public class TTLCache<K,V> {
  private final long ttlMillis;
  private final ConcurrentHashMap<K, CacheValue<V>> map = new ConcurrentHashMap<>();

  public TTLCache(long ttlMillis) {
    this.ttlMillis = ttlMillis;
  }

  public void put(K key, V value) {
    map.put(key, new CacheValue<>(value, System.currentTimeMillis()));
  }

  public V get(K key) {
    CacheValue<V> cv = map.get(key);
    if (cv == null) return null;
    if (System.currentTimeMillis() - cv.createdAt > ttlMillis) {
      map.remove(key);
      return null;
    }
    return cv.value;
  }

  private static class CacheValue<V> {
    final V value;
    final long createdAt;
    CacheValue(V value, long createdAt) { this.value = value; this.createdAt = createdAt; }
  }
}
```

```java
// Example usage
TTLCache<String, String> dnsCache = new TTLCache<>(60_000);
dnsCache.put("example.com", "93.184.216.34");
String ip = dnsCache.get("example.com");
```

```java
// Simple token bucket rate limiter
public class TokenBucket {
  private final long capacity;
  private final long refillRatePerMs;
  private long tokens;
  private long lastRefillTs;

  public TokenBucket(long capacity, long refillRatePerMs) {
    this.capacity = capacity;
    this.refillRatePerMs = refillRatePerMs;
    this.tokens = capacity;
    this.lastRefillTs = System.currentTimeMillis();
  }

  public synchronized boolean tryConsume(long tokens) {
    refill();
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }

  private void refill() {
    long now = System.currentTimeMillis();
    long elapsed = now - lastRefillTs;
    long added = elapsed * refillRatePerMs;
    if (added > 0) {
      this.tokens = Math.min(capacity, this.tokens + added);
      lastRefillTs = now;
    }
  }
}
```

```java
// Usage of TokenBucket
TokenBucket bucket = new TokenBucket(100, 1); // capacity 100, refill 1 token/ms
if (bucket.tryConsume(1)) {
  // proceed with the request
}
```

### Line-by-line explanation
- TTLCache: A generic TTL-enabled cache using a concurrent map to store values with their creation time.
- ttlMillis: Expiry duration for cache entries.
- put/get: Add and retrieve items, evicting them when expired.
- CacheValue: Holds the value and its insertion timestamp for expiry checks.
- dnsCache example: Demonstrates caching DNS lookups with a 60-second TTL.
- TokenBucket: A simple rate limiter implementing the token bucket algorithm.
- capacity/refillRatePerMs: Configuration for max tokens and refill speed.
- tryConsume: Atomically attempts to consume tokens; returns true if allowed.
- refill: Replenishes tokens based on elapsed time.
- bucket usage example: Allows 1 request per millisecond on average, capped at 100 tokens.

## 5. Reliability, Observability, and Operations

Production systems need health checks, metrics, and resilience patterns. Here are compact examples of health checks, lightweight metrics, and a simple circuit-breaker to illustrate operational thinking.

```java
// Health check interface
interface HealthCheck {
  boolean isHealthy();
}
```

```java
import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;

class DatabaseHealthCheck implements HealthCheck {
  private final DataSource ds;

  public DatabaseHealthCheck(DataSource ds) { this.ds = ds; }

  @Override
  public boolean isHealthy() {
    try (Connection c = ds.getConnection()) {
      return c.isValid(1000);
    } catch (SQLException e) {
      return false;
    }
  }
}
```

```java
import java.util.concurrent.atomic.AtomicLong;

class Metrics {
  private final AtomicLong requestCount = new AtomicLong();
  private final AtomicLong errorCount = new AtomicLong();

  public void recordRequest() { requestCount.incrementAndGet(); }
  public void recordError() { errorCount.incrementAndGet(); }

  public long totalRequests() { return requestCount.get(); }
  public long errorRate() { return errorCount.get(); }
}
```

```java
// Very small, simplified circuit breaker
class SimpleCircuitBreaker {
  enum State { CLOSED, OPEN, HALF_OPEN; }
  private State state = State.CLOSED;
  private int failureCount = 0;
  private final int failureThreshold;
  private final long openTimeoutMs;
  private long lastFailureTs;

  public SimpleCircuitBreaker(int failureThreshold, long openTimeoutMs) {
    this.failureThreshold = failureThreshold;
    this.openTimeoutMs = openTimeoutMs;
  }

  public synchronized boolean allowRequest() {
    if (state == State.OPEN) {
      if (System.currentTimeMillis() - lastFailureTs > openTimeoutMs) {
        state = State.HALF_OPEN;
      } else {
        return false;
      }
    }
    return true;
  }

  public synchronized void onFailure() {
    failureCount++;
    lastFailureTs = System.currentTimeMillis();
    if (failureCount >= failureThreshold) state = State.OPEN;
  }

  public synchronized void onSuccess() {
    state = State.CLOSED;
    failureCount = 0;
  }
}
```

### Line-by-line explanation
- HealthCheck: Abstraction to verify component health.
- DatabaseHealthCheck: Tries to acquire and validate a DB connection; returns false on exception.
- Metrics: Lightweight counters to observe throughput and error rates.
- CircuitBreaker: A basic state machine with CLOSED/OPEN/HALF_OPEN to suppress failing downstream calls after repeated failures.
- allowRequest(): Determines if a call should proceed based on state.
- onFailure()/onSuccess(): Update state and counters to reflect outcomes.

## 6. Scaling Patterns — Sharding, Replication, and Caching

To build scalable systems you often shard data, replicate data for availability, and leverage caches to reduce latency. The following example covers consistent hashing, a common shard routing technique.

```java
import java.util.*;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

public class ConsistentHash {
  private final int replicas;
  private final SortedMap<Integer, String> ring = new TreeMap<>();

  public ConsistentHash(int replicas) { this.replicas = replicas; }

  public void addNode(String node) {
    for (int i = 0; i < replicas; i++) {
      int hash = hash(node + ":" + i);
      ring.put(hash, node);
    }
  }

  public void removeNode(String node) {
    for (int i = 0; i < replicas; i++) {
      int hash = hash(node + ":" + i);
      ring.remove(hash);
    }
  }

  public String getNode(String key) {
    if (ring.isEmpty()) return null;
    int hash = hash(key);
    Map.Entry<Integer, String> e = ring.ceilingEntry(hash);
    if (e == null) e = ring.firstEntry();
    return e.getValue();
  }

  private int hash(String s) {
    try {
      MessageDigest md = MessageDigest.getInstance("MD5");
      byte[] bytes = md.digest(s.getBytes(StandardCharsets.UTF_8));
      // Convert first 4 bytes to int
      return ((bytes[3] & 0xFF) << 24) | ((bytes[2] & 0xFF) << 16)
             | ((bytes[1] & 0xFF) << 8) | (bytes[0] & 0xFF);
    } catch (Exception ex) {
      throw new RuntimeException(ex);
    }
  }
}
```

```java
// Usage: map keys to 4 shards
ConsistentHash hash = new ConsistentHash(100);
hash.addNode("Shard-1");
hash.addNode("Shard-2");
hash.addNode("Shard-3");
hash.addNode("Shard-4");

String node = hash.getNode("user:12345"); // determines the shard for this key
```

### Line-by-line explanation
- ConsistentHash: Builds a ring of virtual nodes (replicas) for each real node to distribute keys.
- replicas: Number of virtual nodes per real node, improving distribution balance.
- addNode/removeNode: Add or remove nodes by creating/removing their virtual positions on the ring.
- getNode: Hashes the key, finds the nearest node clockwise on the ring, and returns it.
- hash: Uses MD5 to produce a deterministic integer from a string; MD5 is fast for this toy example.
- Usage example: Shows how to assign a user:12345 to a shard, which will help in routing read/write traffic.

## 7. Data Processing and Messaging

Event-driven patterns help decouple components and improve resilience. A tiny in-process event bus demonstrates publish-subscribe behavior that you can extend to distributed messaging.

```java
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Consumer;

public class SimpleEventBus {
  private final ExecutorService executor = Executors.newCachedThreadPool();
  private final Map<String, List<Consumer<Object>>> listeners = new ConcurrentHashMap<>();

  public void subscribe(String eventType, Consumer<Object> handler) {
    listeners.computeIfAbsent(eventType, k -> new CopyOnWriteArrayList<>()).add(handler);
  }

  public void publish(String eventType, Object data) {
    List<Consumer<Object>> handlers = listeners.get(eventType);
    if (handlers != null) {
      for (var h : handlers) {
        executor.submit(() -> h.accept(data));
      }
    }
  }

  public void shutdown() { executor.shutdown(); }
}
```

```java
// Usage
SimpleEventBus bus = new SimpleEventBus();
bus.subscribe("URL_SHORTENED", payload -> System.out.println("URL shortened: " + payload));
bus.publish("URL_SHORTENED", "http://short.ly/abcd");
```

### Line-by-line explanation
- SimpleEventBus: Lightweight asynchronous event distribution mechanism.
- executor: Thread pool to handle handlers without blocking the publisher.
- listeners: Map of event type to a list of handlers.
- subscribe(eventType, handler): Register a callback for a given event type.
- publish(eventType, data): Dispatches the event to all registered handlers asynchronously.
- shutdown(): Cleanly shut down the executor.
- Usage: Demonstrates subscribing to a URL_SHORTENED event and publishing an event with payload.

## X. Common Beginner Mistakes — 3+ Real Pitfalls

- Pitfall 1: Not handling thread safety in shared state
  - Bad:
    ```java
    public class Counter { public int count = 0; public void inc() { count++; } }
    ```
  - Good:
    ```java
    public class Counter {
      private final AtomicInteger count = new AtomicInteger(0);
      public void inc() { count.incrementAndGet(); }
      public int get() { return count.get(); }
    }
    ```

- Pitfall 2: Tight coupling between components (no interfaces)
  - Bad:
    ```java
    class UserService {
      private final EmailSender emailSender = new SmtpEmailSender();
      void register(User u) { /* ... */ emailSender.sendWelcome(u); }
    }
    ```
  - Good:
    ```java
    interface EmailSender { void sendWelcome(User u); }
    class SmtpEmailSender implements EmailSender { public void sendWelcome(User u) { /* SMTP */ } }
    class UserService {
      private final EmailSender emailSender;
      public UserService(EmailSender emailSender) { this.emailSender = emailSender; }
      void register(User u) { /* ... */ emailSender.sendWelcome(u); }
    }
    ```

- Pitfall 3: Ignoring data expiration and cache invalidation
  - Bad:
    ```java
    Map<String, String> cache = new HashMap<>();
    void put(String k, String v) { cache.put(k, v); }
    String get(String k) { return cache.get(k); } // no TTL handling
    ```
  - Good:
    ```java
    // TTLCache example from Section 4 demonstrates TTL handling and eviction
    ```

- Pitfall 4: Not validating inputs or assuming trusted clients
  - Bad:
    ```java
    String shorten(String url) { return url.substring(0, 8); }
    ```
  - Good:
    ```java
    String shorten(String url) {
      if (url == null || url.isEmpty()) throw new IllegalArgumentException("URL required");
      // additional normalization and validation
      return url.substring(0, 8);
    }
    ```

- Pitfall 5: Over-optimizing early before bottlenecks are proven
  - Bad: Complex distributed consensus without evidence.
  - Good: Start with simple, observable local caches, measure, and scale gradually.

## Y. Why This Matters In Real Systems

- Clarity and communication: In production, you must articulate trade-offs (latency vs. consistency, CAP considerations) to stakeholders, engineers, and SRE teams.
- End-to-end performance: Caching decisions, data modeling, and shard routing must collectively meet latency budgets under real traffic patterns.
- Operational readiness: Health checks, metrics, and fault-tolerance patterns are not optional—they define blast radius, MTTR, and service level objectives.
- Evolution and maintenance: Architecture should support incremental changes (new storage backends, new cache layers, or new services) without large rewrites.

## Z. Study Questions — 5 Recall Questions

1. What is the primary purpose of a design spec in a system design interview, and which fields would you capture?
2. How does consistent hashing help with shard rebalancing, and why is it preferable to simple modulo-based sharding in many systems?
3. Explain the difference between strong consistency and eventual consistency. In which scenarios would you choose each?
4. How does a TTL-based cache help reduce latency, and what are common risks you must manage (e.g., stale data)?
5. Describe a simple, scalable approach to implementing an event-driven workflow in a Java backend without bringing in external messaging infrastructure.

## Exercise — Practical Multi-Part Coding Challenge

Goal: Build a small, self-contained demonstration of a scalable URL shortener architecture using the patterns shown in sections above. You’ll implement sharding routing, a TTL cache for redirects, and a tiny event-driven notification for analytics.

Part A — Implement a shard router using ConsistentHash
- Task: Create a ShardRouter class that uses the ConsistentHash class from Section 6 to map a short code to a shard node.
- Deliverables:
  - A working ShardRouter with addShard(String shardId), removeShard(String shardId), getShardForKey(String key).
  - A small test snippet mapping 1000 short codes and printing distribution counts.
- Starter code (you can adapt from Section 6):
```java
public class ShardRouter {
  private final ConsistentHash hash = new ConsistentHash(100);

  public void addShard(String shardId) { hash.addNode(shardId); }
  public void removeShard(String shardId) { hash.removeNode(shardId); }

  public String getShardForKey(String key) {
    return hash.getNode(key);
  }
}
```
- Test snippet:
```java
public class ShardRouterTest {
  public static void main(String[] args) {
    ShardRouter router = new ShardRouter();
    router.addShard("Shard-A");
    router.addShard("Shard-B");
    router.addShard("Shard-C");

    Map<String, Integer> counts = new HashMap<>();
    for (int i = 0; i < 1000; i++) {
      String key = "short" + i;
      String shard = router.getShardForKey(key);
      counts.merge(shard, 1, Integer::sum);
    }
    System.out.println(counts);
  }
}
```

Part B — Implement a TTL cache for redirects
- Task: Implement a TTLCache similar to Section 4 to store the mapping from shortCode to originalUrl with a TTL.
- Deliverables:
  - A TTLCache<String, String> instance with TTL in milliseconds.
  - Example storing and retrieving a URL, showing eviction after TTL.
- Starter code:
```java
public class RedirectCacheDemo {
  public static void main(String[] args) throws InterruptedException {
    TTLCache<String, String> cache = new TTLCache<>(2000); // 2 seconds TTL
    cache.put("abcd", "https://example.com/some-long-url");
    System.out.println("Cached: " + cache.get("abcd"));
    Thread.sleep(2500);
    System.out.println("After TTL: " + cache.get("abcd"));
  }
}
```

Part C — Simple event-driven analytics
- Task: Use SimpleEventBus to publish a URL_SHORTENED event when a new short URL is created and print analytics to stdout.
- Deliverables:
  - EventBus instance, a subscriber for "URL_SHORTENED" events, and a publish example.
- Starter code (can reuse Section 7 example):
```java
SimpleEventBus bus = new SimpleEventBus();
bus.subscribe("URL_SHORTENED", payload -> System.out.println("Analytics: " + payload));
bus.publish("URL_SHORTENED", "shortCode=abcd, originalUrl=https://example.com/");
```

Part D — Optional integration sketch
- Task: Wire together ShardRouter, RedirectCacheDemo, and SimpleEventBus to simulate:
  - Receiving a shorten request -> generate short code -> route to shard -> store mapping in in-memory repository -> publish URL_SHORTENED event.
- Deliverables:
  - A single main class that demonstrates the flow with console output indicating shard mapping, cache behavior, and analytics events.

Notes
- The exercise is designed to be approachable without external dependencies. In production, you would replace in-memory components with persistent stores, distributed caches, and a real message broker (e.g., Kafka, NATS).
- Focus on design reasoning, trade-offs, and how the code you write maps to the interview topics: scalability, data locality, fault tolerance, and observability.

End of lesson.