# Caching with Redis — Speed Up Your API

Caching with Redis is a fundamental technique in backend engineering to dramatically reduce API latency and DB load. By storing frequently requested data in an in-memory store, your PHP APIs can serve responses in microseconds instead of querying slower data sources on every request. This module covers practical patterns, safe key design, invalidation strategies, and real-world considerations to help you deploy robust caching in production systems.

## 1. Caching Fundamentals with Redis and PHP

In this section, you’ll learn the basics: how to connect to Redis from PHP, how to store values with a time-to-live (TTL), and how to retrieve cached data efficiently.

```php
<?php
// phpredis extension must be installed and enabled
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

// Basic set with a TTL (in seconds)
$key = 'api:time now';
$ttl = 300; // 5 minutes
$redis->setex($key, $ttl, (string) time());

// Retrieve cache
$cached = $redis->get($key);
echo $cached;
```
### Line-by-line explanation
- // phpredis extension must be installed and enabled
  - Documentation note: This code relies on the phpredis extension providing the Redis class.
- $redis = new Redis();
  - Creates a new Redis client instance.
- $redis->connect('127.0.0.1', 6379);
  - Establishes a TCP connection to the Redis server on localhost port 6379.
- $key = 'api:time now';
  - Defines a cache key for storing the value.
- $ttl = 300;
  - Sets a TTL of 300 seconds (5 minutes).
- $redis->setex($key, $ttl, (string) time());
  - Stores the value with an expiration time; setex ensures the key auto-expires.
- $cached = $redis->get($key);
  - Reads the value from Redis if present; returns false if missing or expired.
- echo $cached;
  - Outputs the cached value (or empty if cache miss).

Notes:
- Using TTLs helps prevent stale data and unbounded memory use.
- If you don’t set a TTL, the key remains until explicitly deleted, increasing memory pressure.

## 2. Cache Key Design and TTL Strategy

A robust cache relies on consistent key naming, deterministic TTLs, and clear namespaces to avoid collisions and stale data. This section demonstrates how to design keys and choose TTLs that reflect data volatility.

```php
<?php
// Helper to create stable, readable keys
function cacheKey(string $entity, int $id, string $suffix = ''): string {
  $base = "cache:{$entity}:{$id}";
  return $suffix ? "{$base}:{$suffix}" : $base;
}

// Example: caching a product detail for 10 minutes
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

$key = cacheKey('product', 42, 'detail');
$payload = [
  'id' => 42,
  'name' => 'Example Product',
  'price' => 19.99,
];

// store as JSON
$redis->setex($key, 600, json_encode($payload));

// read back
$cached = $redis->get($key);
```
### Line-by-line explanation
- function cacheKey(string $entity, int $id, string $suffix = ''): string
  - Defines a deterministic naming scheme for cache keys based on entity name and id.
- $base = "cache:{$entity}:{$id}";
  - Builds the core key with a clear namespace (cache) to reduce collisions.
- return $suffix ? "{$base}:{$suffix}" : $base;
  - Optional suffix allows sub-keys like "detail" or "stats" without duplicating namespaces.
- $redis->connect('127.0.0.1', 6379);
  - Connects to Redis.
- $key = cacheKey('product', 42, 'detail');
  - Creates a stable key for the product detail of ID 42.
- $payload = [ ... ];
  - The data to cache (example product details).
- $redis->setex($key, 600, json_encode($payload));
  - Stores the payload with a TTL of 600 seconds (10 minutes).
- $cached = $redis->get($key);
  - Retrieves the cached value if present.

TTL guidance:
- Highly volatile data (e.g., session-like data, live stock) may use TTLs of 30–120 seconds.
- Moderately static data (e.g., product details that don’t change often) can use 5–60 minutes.
- Use longer TTLs for data that’s inexpensive to recompute or fetch but still needs caching.

## 3. Read-Through Caching for API Endpoints

Read-through caching automatically serves data from the cache and, on a miss, fetches from the data source, then populates the cache. This pattern is common for API endpoints that return stable data.

```php
<?php
// Simulated expensive data source (e.g., DB call)
function fetchUserFromDb(int $userId): array {
  // Simulate heavy DB work
  sleep(0.2);
  return [
    'id' => $userId,
    'name' => 'User '.$userId,
    'email' => 'user'.$userId.'@example.com',
  ];
}

function getUserProfile(int $userId, Redis $redis, int $ttl = 300): array {
  $key = "api:user:{$userId}:profile";
  $cached = $redis->get($key);
  if ($cached !== false) {
    return json_decode($cached, true);
  }

  // Cache miss: fetch from source and populate cache
  $data = fetchUserFromDb($userId);
  $redis->setex($key, $ttl, json_encode($data));
  return $data;
}

// Example usage
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

header('Content-Type: application/json');
echo json_encode(getUserProfile(123, $redis));
```
### Line-by-line explanation
- function fetchUserFromDb(int $userId): array
  - Simulates an expensive data source fetch (e.g., DB query) for a user profile.
- sleep(0.2);
  - Emulates latency typical of a DB call.
- return [ ... ];
  - Returns a synthetic user profile payload.
- function getUserProfile(int $userId, Redis $redis, int $ttl = 300): array
  - Reads from cache first; on miss, loads from source and caches result.
- $key = "api:user:{$userId}:profile";
  - Defines a clear, namespaced cache key for user profiles.
- $cached = $redis->get($key);
  - Attempts to read cached data.
- if ($cached !== false) { return json_decode($cached, true); }
  - On a cache hit, returns the deserialized data immediately.
- $data = fetchUserFromDb($userId);
  - On a cache miss, fetches from the primary data source.
- $redis->setex($key, $ttl, json_encode($data));
  - Stores the fetched data in Redis with a TTL for future requests.
- return $data;
  - Returns the freshly retrieved data.
- // Example usage
- $redis = new Redis(); $redis->connect('127.0.0.1', 6379);
  - Creates and connects the Redis client.
- header('Content-Type: application/json');
  - Sets response content type for API output.
- echo json_encode(getUserProfile(123, $redis));
  - Serves the user profile, servicing the request with caching.

Notes:
- Read-through caching centralizes cache logic and reduces DB load on repeated requests.
- This approach assumes the data source can provide fresh data when cache misses occur.

## 4. Cache Invalidation on Writes

When data changes, you must invalidate or refresh the corresponding cache entries to prevent serving stale data. This section shows a straightforward approach: delete the relevant cache key after a write, and optionally refresh it with the new data.

```php
<?php
// Reuse the simulated DB update
function fetchUserFromDb(int $userId): array {
  sleep(0.2);
  return [
    'id' => $userId,
    'name' => 'User '.$userId,
    'email' => 'user'.$userId.'@example.com',
  ];
}

function updateUserProfile(int $userId, array $payload, Redis $redis, int $ttl = 300): array {
  // Simulate DB update
  sleep(0.3);
  $existing = fetchUserFromDb($userId);
  $updated = array_merge($existing, $payload);

  // Invalidate the specific cache key
  $redis->del("api:user:{$userId}:profile");

  // Optionally refresh cache with updated data
  $redis->setex("api:user:{$userId}:profile", $ttl, json_encode($updated));

  return $updated;
}

// Example usage
$redis = new Redis();
$redis->connect('127.0.0.1', 6379);

// Update user and refresh cache
$updated = updateUserProfile(123, ['name' => 'Updated Name'], $redis);
```
### Line-by-line explanation
- function fetchUserFromDb(int $userId): array
  - Provides the current user data from the primary data source (DB).
- sleep(0.2); and return [...]
  - Simulates an actual fetch of current user data.
- function updateUserProfile(int $userId, array $payload, Redis $redis, int $ttl = 300): array
  - Updates the user data and ensures cache coherence.
- sleep(0.3);
  - Simulates the time spent writing to the primary data source.
- $existing = fetchUserFromDb($userId);
  - Retrieves the current data before applying updates (for demonstration).
- $updated = array_merge($existing, $payload);
  - Applies the requested changes to the data.
- $redis->del("api:user:{$userId}:profile");
  - Deletes the old cached profile to prevent stale data on future reads.
- $redis->setex("api:user:{$userId}:profile", $ttl, json_encode($updated));
  - Optionally repopulates the cache with updated data.
- return $updated;
  - Returns the updated payload.
- $updated = updateUserProfile(123, ['name' => 'Updated Name'], $redis);
  - Example usage showing write-through style: update and invalidate/refresh.

Notes:
- Deleting the old key before writing the new cache is a common, simple strategy.
- Consider more complex invalidation if you cache related aggregates (e.g., summaries, counts) or if updates affect multiple keys.

## 5. Advanced Patterns: Versioned Cache and Fallbacks

In large systems, simple key invalidation becomes brittle. Versioned caching and fallback strategies improve resilience and simplify mass invalidation.

- Versioned keys allow you to invalidate a whole set of related keys by bumping a version counter.
- Fallback logic ensures the API remains responsive if Redis is temporarily unavailable.

```php
<?php
// Get the current cache key with version
function getCacheKeyWithVersion(string $entity, int $id, Redis $redis): string {
  $version = (int) $redis->get("version:{$entity}:{$id}");
  if ($version <= 0) $version = 1;
  return "cache:{$entity}:{$id}:v{$version}";
}

// Invalidate by bumping the version
function invalidateCacheVersion(string $entity, int $id, Redis $redis): void {
  // Increment the version; Redis returns the new value
  $redis->incr("version:{$entity}:{$id}");
}

// Read path with versioned key and graceful fallback
function getUserProfileWithVersion(int $userId, ?Redis $redis, int $ttl = 300): array {
  if (!$redis) {
    // Redis unavailable; fetch directly
    return fetchUserFromDb($userId);
  }

  $key = getCacheKeyWithVersion('user', $userId, $redis);
  $cached = $redis->get($key);
  if ($cached !== false) {
    return json_decode($cached, true);
  }

  $data = fetchUserFromDb($userId);
  $redis->setex($key, $ttl, json_encode($data));
  return $data;
}

// Update path: invalidate version to force new cache on next read
function updateUserProfileVersioned(int $userId, array $payload, Redis $redis, int $ttl = 300): array {
  sleep(0.3);
  $updated = array_merge(fetchUserFromDb($userId), $payload);
  invalidateCacheVersion('user', $userId, $redis);
  // Optionally seed the new version cache (depends on your flow)
  $newKey = getCacheKeyWithVersion('user', $userId, $redis);
  $redis->setex($newKey, $ttl, json_encode($updated));
  return $updated;
}
```
### Line-by-line explanation
- function getCacheKeyWithVersion(string $entity, int $id, Redis $redis): string
  - Reads the current version for the entity-id pair and builds a key containing the version.
- $version = (int) $redis->get("version:{$entity}:{$id}");
  - Retrieves the version number; defaults to 1 if not set.
- if ($version <= 0) $version = 1;
  - Ensures a sane default version.
- return "cache:{$entity}:{$id}:v{$version}";
  - Returns a versioned key, ensuring that old caches are never read after a version bump.
- function invalidateCacheVersion(string $entity, int $id, Redis $redis): void
  - Bumps the version to invalidate all existing caches for this entity-id.
- $redis->incr("version:{$entity}:{$id}");
  - Increments the version counter atomically.
- function getUserProfileWithVersion(int $userId, ?Redis $redis, int $ttl = 300): array
  - Reads from the current versioned key; falls back to DB if Redis is unavailable or on miss.
- if (!$redis) { return fetchUserFromDb($userId); }
  - Graceful degradation path if Redis is not present.
- $key = getCacheKeyWithVersion('user', $userId, $redis);
  - Builds the versioned key for this user.
- $cached = $redis->get($key);
  - Attempts to read the versioned cache.
- if ($cached !== false) { return json_decode($cached, true); }
  - Returns cached data if found.
- $data = fetchUserFromDb($userId);
  - Fallback to DB on miss or absence of cache.
- $redis->setex($key, $ttl, json_encode($data));
  - Populates the new versioned cache key.
- function updateUserProfileVersioned(int $userId, array $payload, Redis $redis, int $ttl = 300): array
  - Updates data and invalidates caches by bumping the version.
- sleep(0.3);
  - Simulated write latency.
- $updated = array_merge(fetchUserFromDb($userId), $payload);
  - Applies updates to the data payload.
- invalidateCacheVersion('user', $userId, $redis);
  - Invalidate current caches by bumping the version.
- $newKey = getCacheKeyWithVersion('user', $userId, $redis);
  - Prepare the new key for the updated data.
- $redis->setex($newKey, $ttl, json_encode($updated));
  - Seed the new cache with updated data.
- return $updated;
  - Return updated data.

Why use this pattern?
- Mass invalidation becomes a simple version bump.
- Old cached data will naturally expire as reads start using a higher version.
- You can invalidate other related caches by bumping their versions as well.

Graceful fallback notes:
- Always design code to degrade gracefully if Redis is temporarily unavailable.
- Prefer data availability over caching in edge cases (i.e., serve from the primary data source if the cache is down).

## 6. Performance Considerations and Observability

Caching brings speed and scalability, but it also adds complexity. Consider the following when deploying Redis caching in production:

- Cache hit ratio and latency
  - Instrument metrics: hits, misses, average cache latency, and TTL distribution.
  - Simple logging helpers or an APM can reveal hot keys and average time saved per request.
- Memory management
  - Monitor Redis memory usage; set maxmemory and eviction policy (Volatile-Lru, Allkeys-Lru, etc.) appropriate to your data retention needs.
- Cache warming
  - Proactively load common or high-traffic endpoints into the cache during off-peak hours or via background jobs.
- Consistency and invalidation
  - Choose a strategy (invalidate vs. refresh) that aligns with data mutability and user expectations.
- Failure handling
  - Always provide a graceful fallback to the underlying data source in case Redis is unreachable.
- Security and multi-environment considerations
  - Use separate Redis instances per environment (dev/stage/prod) and restrict access via firewalls or private networks.
- Observability hooks
  - Log cache misses with a correlation id to diagnose N+1 problems or DB bottlenecks.

Example minimal instrumentation (optional):
```php
<?php
function cacheFetch(Redis $redis, string $key, callable $load, int $ttl = 300): array {
  $start = microtime(true);
  $value = $redis->get($key);
  if ($value !== false) {
    error_log("CACHE HIT: {$key} in " . (microtime(true) - $start) . "s");
    return json_decode($value, true);
  }
  error_log("CACHE MISS: {$key} in " . (microtime(true) - $start) . "s");
  $data = $load();
  $redis->setex($key, $ttl, json_encode($data));
  return $data;
}
```

This pattern helps you understand the real-world impact of caching on latency and resource usage, which is essential for tuning performance in production systems.

## X. Common Beginner Mistakes

- Bad: No TTL; memory grows without bound
  - Bad:
    - $redis->set('user:1:profile', json_encode($data));
  - Good:
    - $redis->setex('user:1:profile', 300, json_encode($data));

- Bad: Inconsistent cache keys across code paths
  - Bad:
    - Keys like 'user:1:profile' and 'api:user:1/profile' used interchangeably.
  - Good:
    - Centralize key design in a helper (e.g., cacheKey) and reuse it everywhere.

- Bad: Not handling Redis outages gracefully
  - Bad:
    - echo json_encode($redis->get('some:key'));
  - Good:
    - Wrap Redis calls in try/catch blocks or check availability; fall back to DB if Redis is down.

- Bad: Missing invalidation on writes
  - Bad:
    - Update DB, but leave old cache in place; users may see stale data.
  - Good:
    - Delete or refresh the relevant cache keys after updates; consider versioning for broad invalidation.

- Bad: Over-caching highly dynamic data
  - Bad:
    - Caching content that changes every request (e.g., live feed) with long TTL.
  - Good:
    - Cache selectively, with shorter TTLs or conditional caching logic, or skip caching for highly volatile endpoints.

## Y. Why This Matters In Real Systems

In production, caching with Redis directly impacts user experience and system stability:
- Latency reduction: API responses can drop from hundreds of milliseconds to tens of milliseconds with cached data.
- Throughput and concurrency: Redis caching reduces DB load, enabling the system to handle more requests per second.
- Reliability under load: When downstream services are slow or rate-limited, Redis can serve cached results to preserve service quality.
- Operational considerations: Cache size, eviction policies, and cache warm-up strategies require monitoring and tuning alongside application code.
- Trade-offs: Caching introduces eventual consistency concerns; ensure SLAs reflect the expected freshness of cached data and implement clear invalidation rules.

## Z. Study Questions

1) What is the purpose of a TTL in Redis caching, and how does it help with stale data?  
2) How should you design cache keys to avoid collisions and ensure discoverability? Provide an example.  
3) What is read-through caching, and how does it differ from write-through or write-behind caching patterns?  
4) How can versioned caching improve invalidation in a multi-key scenario?  
5) List three production concerns when deploying Redis caching in a backend API.

## Exercise

Part A — Implement a Read-Through Cache for a User Profile
- Objective: Create a PHP module that reads a user profile from Redis cache first; on miss, it fetches from a simulated DB and caches the result.
- Requirements:
  - Use phpredis Redis extension (or provide a Predis alternative note).
  - Implement a function getUserProfileCached(int $userId, Redis $redis, int $ttl = 300): array
  - Cache key: "api:user:{id}:profile"
  - Ensure JSON encoding/decoding is handled.
  - Simulate DB fetch with a function fetchUserFromDb(int $userId): array
- Starter skeleton:
```php
<?php
// DB simulation
function fetchUserFromDb(int $userId): array {
  // TODO: simulate load
  sleep(0.2);
  return [
    'id' => $userId,
    'name' => 'User '.$userId,
    'email' => 'user'.$userId.'@example.com',
  ];
}

function getUserProfileCached(int $userId, Redis $redis, int $ttl = 300): array {
  // TODO: implement read-through cache
}
```
- Tasks:
  - Implement getUserProfileCached with read-through logic.
  - Write a small script to call getUserProfileCached for 2-3 user IDs and demonstrate a cache miss followed by a subsequent hit.

Part B — Cache Invalidation on Write
- Objective: Add a function updateUserProfileCached(int $userId, array $payload, Redis $redis, int $ttl = 300): array
- Requirements:
  - Update the “DB” (simulate) and invalidate the corresponding cache key.
  - After updating, call getUserProfileCached to demonstrate the refreshed cache.
- Starter skeleton:
```php
<?php
function updateUserProfileCached(int $userId, array $payload, Redis $redis, int $ttl = 300): array {
  // TODO: simulate DB update and invalidate cache
}
```
- Tasks:
  - Implement the function to invalidate the cache key and optionally refresh it with updated data.
  - Show a short script that updates a user profile and then reads it again, proving the cache updated.

Part C — Versioned Cache (Advanced)
- Objective: Implement a versioned cache to enable bulk invalidation without deleting many individual keys.
- Requirements:
  - Add a version key per user: version:user:{id}
  - Cache current data under cache:user:{id}:v{version}
  - On update, increment the version and refresh the new key with updated data.
- Starter skeleton:
```php
<?php
function getCacheKeyWithVersion(int $userId, Redis $redis): string {
  // TODO: read version or default to 1
}
function invalidateCacheVersion(int $userId, Redis $redis): void {
  // TODO: increment version
}
```
- Tasks:
  - Implement the versioned key logic and demonstrate a read, update, and subsequent read using the new versioned key.

Deliverables:
- A small PHP project (single files or a module) that demonstrates read-through caching, invalidation on writes, and optional versioned caching.
- Clear console or web output showing cache misses/hits, and the timing differences between cached and non-cached reads.

Notes for implementers:
- If Redis is unavailable, your code should gracefully fallback to the primary data source (simulate DB).
- Ensure your code is well-documented and includes comments explaining the caching decisions.
- For testing, you can run PHP from CLI; include a simple script that runs the exercise scenarios.

This completes the module on Caching with Redis — Speed Up Your API in PHP.