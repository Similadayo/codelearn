# Caching with Redis — Speed Up Your API

Caching is a fundamental technique in backend engineering to dramatically reduce latency and load on your services. By storing frequently requested data in a fast in-memory store like Redis, your API can serve responses in memory instead of repeatedly hitting the database. This module focuses on implementing robust, production-ready caching in Java, with patterns that scale, handle invalidations, and prevent cache stampede.

## 1. Prerequisites: Redis setup and Java client basics

In production, you typically run Redis as a separate service and connect from your Java application using a client library. This section introduces a minimal Redis client setup in Java (Jedis) and a tiny cache wrapper you can reuse.

Code (Maven dependency and basic Redis client):
```xml
<!-- pom.xml -->
<dependencies>
  <dependency>
    <groupId>redis.clients</groupId>
    <artifactId>jedis</artifactId>
    <version>5.0.1</version>
  </dependency>
</dependencies>
```

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;

/**
 * Lightweight Redis cache wrapper for typical get/set operations.
 */
public class RedisCacheClient {
    private final JedisPool pool;

    public RedisCacheClient(String host, int port) {
        this.pool = new JedisPool(host, port);
    }

    // Expose pool for advanced patterns (e.g., locks) if needed
    public JedisPool getPool() {
        return pool;
    }

    public String get(String key) {
        try (Jedis jedis = pool.getResource()) {
            return jedis.get(key);
        }
    }

    public void setex(String key, int ttlSeconds, String value) {
        try (Jedis jedis = pool.getResource()) {
            jedis.setex(key, ttlSeconds, value);
        }
    }

    public void delete(String key) {
        try (Jedis jedis = pool.getResource()) {
            jedis.del(key);
        }
    }
}
```

### Line-by-line explanation
- Line 1-2: Import Jedis classes needed to manage a pool of connections.
- Line 7-12: RedisCacheClient constructor initializes a JedisPool for connection reuse.
- Line 15-17: getPool() exposes the pool for advanced usage (e.g., locks).
- Line 19-23: get() retrieves the value for a given key from Redis using a pooled resource.
- Line 25-29: setex() stores a value with a TTL (time-to-live) in seconds.
- Line 31-35: delete() removes a key from Redis, used for invalidation.

Notes:
- Using a pool improves performance and avoids creating a new connection per operation.
- This is intentionally simple to keep the lesson focused on caching patterns.

## 2. Cache-Aside pattern: Lazy loading and JSON-encoded entities

The Cache-Aside (or Lazy Cache) pattern is the most common approach for API data caching: check the cache first; if a miss occurs, load from the data source, then populate the cache. We’ll implement a tiny User example with a repository, a JSON serializer helper, and a cache-enabled service.

Code (domain model, repo, JSON util, and cache-enabled service):
```java
// Domain model
public class User {
    public long id;
    public String name;
    public int age;

    public User() {}
    public User(long id, String name, int age) {
        this.id = id; this.name = name; this.age = age;
    }
}
```

```java
// Repository interface (stub for demo)
public interface UserRepository {
    User findById(long id);
    void update(User user);
}
```

```java
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.IOException;

public class JsonUtils {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    public static String toJson(Object o) {
        try {
            return MAPPER.writeValueAsString(o);
        } catch (JsonProcessingException e) {
            throw new RuntimeException(e);
        }
    }

    public static <T> T fromJson(String s, Class<T> cls) {
        try {
            return MAPPER.readValue(s, cls);
        } catch (IOException e) {
            throw new RuntimeException(e);
        }
    }
}
```

```java
public class UserCacheService {
    private final RedisCacheClient cache;
    private final UserRepository repo;
    private static final String KEY_PREFIX = "user:";
    private static final int TTL_SECONDS = 300;

    public UserCacheService(RedisCacheClient cache, UserRepository repo) {
        this.cache = cache;
        this.repo = repo;
    }

    public User getUser(long id) {
        String key = KEY_PREFIX + id;
        String cached = cache.get(key);

        if (cached != null) {
            // Cache hit
            return JsonUtils.fromJson(cached, User.class);
        }

        // Cache miss: load from data source
        User user = repo.findById(id);
        if (user != null) {
            // Populate cache on success
            cache.setex(key, TTL_SECONDS, JsonUtils.toJson(user));
        } else {
            // Cache a sentinel to avoid repeated DB misses for non-existent data
            cache.setex(key, 60, "null");
        }
        return user;
    }
}
```

### Line-by-line explanation
- User class: Simple POJO representing a user entity with id, name, and age.
- UserRepository: Abstraction of the data source (DB). In real code, implement actual DB queries.
- JsonUtils: Utility to serialize/deserialize JSON using Jackson.
- UserCacheService:
  - Fields: cache (RedisCacheClient) and repo (data source).
  - getUser: Builds cache key as "user:{id}".
  - cache.get(key): Checks Redis for a cached value.
  - If cached != null: deserialize to User and return (cache hit).
  - If cache miss: fetch from repo.findById(id).
  - If found: cache result with TTL (cache.populate on success).
  - If not found: cache a sentinel "null" to avoid future DB hits for a while (cache miss handling).
  - Returns the loaded user (or null if not found).

Notes:
- Sentinel caching (storing "null") helps prevent cache stampedes for non-existent data.
- JSON encoding avoids a coupling to a particular persistence model.

## 3. Cache invalidation and TTL design for consistency

Caches must be invalidated when the underlying data changes to avoid serving stale data. This section shows a straightforward approach: invalidate on write, and optionally refresh or rehydrate after a write.

Code (update path with invalidation and optional rehydration):
```java
public class UserCacheService {
    // ... existing fields and constructor ...

    // Update user in the data source and invalidate cache
    public void updateUser(User user) {
        // Update DB first
        repo.update(user);
        // Invalidate cache entry for this user
        String key = KEY_PREFIX + user.id;
        cache.delete(key);
        // Optional: proactively refresh cache with updated data
        // User refreshedUser = repo.findById(user.id);
        // if (refreshedUser != null) cache.setex(key, TTL_SECONDS, JsonUtils.toJson(refreshedUser));
    }

    // Force refresh of a single user's cache (e.g., after background sync)
    public void refreshUserCache(long id) {
        User user = repo.findById(id);
        String key = KEY_PREFIX + id;
        if (user != null) {
            cache.setex(key, TTL_SECONDS, JsonUtils.toJson(user));
        } else {
            cache.setex(key, 60, "null");
        }
    }
}
```

### Line-by-line explanation
- updateUser:
  - Call repo.update(user) to persist changes.
  - Build key for the user and delete it from the cache to ensure stale data isn’t served.
  - Optional commented-out lines show how you could proactively rehydrate the cache with the fresh value after the DB update.
- refreshUserCache:
  - Re-fetches the user and writes the updated data back to the cache with a TTL, or caches a sentinel if not found.

Notes:
- Invalidation is the simplest and most reliable approach; proactive rehydration adds extra DB load but guarantees freshness.
- TTL values should be tuned based on data volatility and traffic patterns.

## 4. Handling cache stampede: distributed locks and safe refresh

Cache stampede happens when many requests miss the cache and hit the data source simultaneously. A common remedy is to acquire a short-lived distributed lock around the cache-milling path so only one request populates the cache after a miss.

Code (tiny Redis-based distributed lock and usage in a cached fetch):
```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.JedisPool;
import redis.clients.jedis.params.SetParams;

// Simple distributed lock using Redis SET NX PX
public class SimpleRedisLock {
    private final JedisPool pool;

    public SimpleRedisLock(JedisPool pool) {
        this.pool = pool;
    }

    public boolean acquireLock(String lockKey, long ttlMillis) {
        try (Jedis jedis = pool.getResource()) {
            SetParams params = SetParams.setParams().nx().px(ttlMillis);
            String result = jedis.set(lockKey, "1", params);
            return "OK".equals(result);
        }
    }

    public void releaseLock(String lockKey) {
        try (Jedis jedis = pool.getResource()) {
            jedis.del(lockKey);
        }
    }
}
```

```java
public class UserCacheServiceWithLock {
    private final JedisPool pool;
    private final RedisCacheClient cache;
    private final UserRepository repo;

    private static final String KEY_PREFIX = "user:";
    private static final String LOCK_PREFIX = "lock:user:";

    public UserCacheServiceWithLock(JedisPool pool, RedisCacheClient cache, UserRepository repo) {
        this.pool = pool;
        this.cache = cache;
        this.repo = repo;
    }

    public User getUserWithLock(long id) {
        String key = KEY_PREFIX + id;
        String cached = cache.get(key);
        if (cached != null) {
            if (!"null".equals(cached)) {
                return JsonUtils.fromJson(cached, User.class);
            }
            return null; // sentinel cached
        }

        String lockKey = LOCK_PREFIX + id;
        SimpleRedisLock lock = new SimpleRedisLock(pool);
        boolean gotLock = lock.acquireLock(lockKey, 5000); // 5s lock
        if (!gotLock) {
            // Back-off and retry
            try { Thread.sleep(50); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            return getUserWithLock(id);
        }

        try {
            // Double-check after acquiring lock
            cached = cache.get(key);
            if (cached != null) {
                if (!"null".equals(cached)) {
                    return JsonUtils.fromJson(cached, User.class);
                }
                return null;
            }

            // Load from DB and populate cache
            User user = repo.findById(id);
            if (user != null) {
                cache.setex(key, 300, JsonUtils.toJson(user));
            } else {
                cache.setex(key, 60, "null");
            }
            return user;
        } finally {
            lock.releaseLock(lockKey);
        }
    }
}
```

### Line-by-line explanation
- SimpleRedisLock:
  - acquireLock(): Attempts to set a lock key with NX (only if not exists) and PX (millisecond TTL). Returns true on success.
  - releaseLock(): Deletes the lock key to release the lock.
- UserCacheServiceWithLock:
  - getUserWithLock(): Checks cache first; on miss, tries to acquire a lock per-user. If lock acquired, reloads the data source, caches the result, and releases the lock. If not acquired, waits briefly and retries.
  - Double-check after acquiring lock ensures you don’t duplicate work if another thread already filled the cache.
  - Uses sentinel "null" for non-existent data to prevent stampede.

Notes:
- This approach prevents multiple threads/processes from hitting the DB at the same time on cache misses.
- In production, you may want to use a mature distributed lock library (e.g., Redisson) to simplify and strengthen locking semantics.

## 5. Observability, safety, and practical tips

- Always monitor cache hit rate, miss rate, percentile latency, and Redis memory usage. Metrics help you tune TTLs and cache size.
- Warm caches for hot data (cache warming) during deployment or low-traffic windows to avoid cold-start latency on rollout.
- Use a sane sentinel value strategy (e.g., "null") for non-existent data to avoid repeated DB lookups on misses.
- Prefer a namespace-based key scheme (e.g., user:, product:, order:) to prevent key collisions.
- When data changes frequently, consider shorter TTLs and explicit invalidation rather than long TTLs.
- For critical data, consider a multi-layer caching strategy: L1 (in-process) cache for ultra-fast access, Redis as L2 cache for shared state, and the DB as the source of truth.

Code (simple metrics scaffold):
```java
import java.util.concurrent.atomic.AtomicLong;

public class CacheMetrics {
    private final AtomicLong hits = new AtomicLong();
    private final AtomicLong misses = new AtomicLong();

    public void recordHit() { hits.incrementAndGet(); }
    public void recordMiss() { misses.incrementAndGet(); }

    public long getHits() { return hits.get(); }
    public long getMisses() { return misses.get(); }
}
```

### Line-by-line explanation
- AtomicLong fields track concurrent-safe counters for cache hits and misses.
- recordHit/recordMiss increment their respective counters.
- getHits/getMisses expose metrics for observability, which you can push to a monitoring system (Prometheus, OpenTelemetry, etc.).

Notes:
- Integrate these metrics into your cache path: after a successful cache hit, call recordHit(); after a miss, call recordMiss().
- For production, wire these metrics to your monitoring/observability stack and add dashboards.

## X. Common Beginner Mistakes

- Pitfall 1: Not handling nulls and sentinel values
  Bad:
  ```java
  String cached = cache.get("user:1");
  if (cached != null) {
      return JsonUtils.fromJson(cached, User.class);
  }
  // DB hit
  ```
  Good:
  ```java
  String cached = cache.get("user:1");
  if (cached != null && !"null".equals(cached)) {
      return JsonUtils.fromJson(cached, User.class);
  }
  // DB hit
  ```
  Explanation: If the data doesn’t exist, you should cache a sentinel; otherwise repeated misses occur on non-existent data.

- Pitfall 2: Long TTLs on frequently changing data
  Bad:
  ```java
  cache.setex(key, 86400, JsonUtils.toJson(user)); // 24h TTL
  ```
  Good:
  ```java
  cache.setex(key, 300, JsonUtils.toJson(user)); // 5 minutes, adjust to data volatility
  ```
  Explanation: A TTL that’s too long risks serving stale data; tune TTLs to data volatility and update frequency.

- Pitfall 3: Invalidation race conditions
  Bad:
  ```java
  repo.update(user);
  cache.delete(key); // no guarantee of subsequent reads
  ```
  Good:
  ```java
  repo.update(user);
  cache.delete(key); // immediate invalidation
  // Optional: refreshCache(key) immediately after or via a background maintainer
  ```
  Explanation: Deleting cache after a write is correct; you can optionally refresh quickly to ensure fresh data is cached, but avoid racey reads.

- Pitfall 4: Not handling cache stampede
  Bad:
  ```java
  // On cache miss, all threads query DB simultaneously
  String cached = cache.get(key);
  if (cached == null) {
      User u = repo.findById(id);
      cache.setex(key, ttl, JsonUtils.toJson(u));
  }
  ```
  Good:
  ```java
  // Use a per-key lock to ensure only one thread populates the cache
  ```
  Explanation: Without locking, a flood of cache misses can overwhelm your DB. Use per-key locks or specialized libraries to serialize cache population.

- Pitfall 5: Ignoring error handling and resource leaks
  Bad:
  ```java
  Jedis jedis = pool.getResource();
  // never close in finally
  ```
  Good:
  ```java
  try (Jedis jedis = pool.getResource()) {
      // work
  }
  ```
  Explanation: Always use try-with-resources or proper finally blocks to return Redis connections to the pool and avoid leaks.

## Y. Why This Matters In Real Systems

- Latency reduction: Redis can serve frequently accessed data orders of magnitude faster than a database.
- Read-heavy workloads: APIs with high read volume (e.g., user profiles, catalog data) greatly benefit from caching.
- DB load relief: Reducing DB hits lowers CPU, I/O, and database connection pool usage, improving overall system stability.
- Consistency considerations: Cache invalidation and TTL design determine how fresh data appears; plan for acceptable staleness and eventual consistency in your domain.
- Resilience patterns: Cache stampede protection, distributed locking, and sentinel caching prevent cascading failures during cache misses and data bursts.
- Observability: Monitoring hit/miss ratios and latency helps you tune TTLs, cache size, and invalidation strategies for real-world traffic.

## Z. Study Questions

1) What is the Cache-Aside pattern and when would you use it?
2) Why would you cache a sentinel value like "null" for non-existent data?
3) How does a per-key distributed lock help prevent cache stampede, and what are potential caveats?
4) What are common TTL considerations when caching frequently updated data?
5) How would you invalidate a cache entry after updating the underlying data source?

## Exercise

You will implement a small, self-contained caching module in Java using Redis (Jedis) and demonstrate a cache-aside flow with a mock database.

Part A — Setup and basic cache client
- Create a Java project (no framework required) with Jedis as a dependency.
- Implement the RedisCacheClient as shown in Section 1.
- Create a stubbed in-memory UserRepository that simulates a database (e.g., a Map<Long, User>).

Part B — Cache-Aside for User data
- Implement JsonUtils and a UserCacheService that uses RedisCacheClient and UserRepository to fetch a User by id with a 5-minute TTL on cache.
- If a User is not found, store a sentinel value "null" for 60 seconds.

Part C — Invalidation on update
- Add an updateUser(User user) method to the service that updates the "DB" and invalidates the corresponding cache entry immediately.

Part D — Optional cache stampede protection
- Implement SimpleRedisLock and integrate a guarded getUserWithLock(long id) method in a new class or the same service to demonstrate a safe cache-fill path.

Part E — Basic validation and usage
- Write a small main method or JUnit-like test harness that:
  - Seeds the mock database with a couple of users.
  - Fetches a user (miss → DB → cache).
  - Fetches again (hit).
  - Updates a user and then fetches (invalidate + read-from-DB → cache).

Deliverables:
- A single repository containing:
  - RedisCacheClient.java
  - JsonUtils.java
  - User.java
  - UserRepository.java (mock implementation)
  - UserCacheService.java
  - SimpleRedisLock.java
  - UserCacheServiceWithLock.java (optional, demonstrates lock usage)
  - CacheMetrics.java (optional for observability)
  - A small Main or Test class that exercises the flow

Note: In real projects, you would wire this into a Spring Boot service, handle exceptions more gracefully, and add proper unit tests with mocks. This exercise emphasizes the core caching patterns, TTL strategy, invalidation, and simple distributed locking to prevent cache stampedes.