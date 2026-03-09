# Caching with Redis — Speed Up Your API

Caching is a fundamental technique to reduce latency, lighten load on your databases, and improve the scalability of your API. Redis, an in-memory data store, is a popular choice for implementing fast, ephemeral caches that sit alongside your Node.js services. By learning how to apply cache-aside patterns, manage invalidation, and handle failures gracefully, you can deliver significantly faster responses while maintaining data correctness in production systems.

## 1. Baseline: Why You Cache and What You Expect to Speed Up

Caching shines when you have read-heavy endpoints or expensive-to-fetch data (e.g., complex database queries, external API calls). The baseline approach is to serve data directly from the source, which can be slow and expensive under load. In this section, we outline a simple Express route that simulates an expensive fetch. This sets the stage for introducing Redis caching to speed up subsequent requests.

Code example
```js
// baseline.js
const express = require('express');
const app = express();
app.use(express.json());

// Simulated expensive data fetch (e.g., DB query)
async function fetchFromDB(id) {
  // pretend this takes ~120ms
  await new Promise((r) => setTimeout(r, 120));
  return { id, name: `Product ${id}`, price: Math.floor(Math.random() * 100) + 1 };
}

app.get('/product/:id', async (req, res) => {
  const id = req.params.id;
  const product = await fetchFromDB(id); // Always hits the DB
  res.json({ product });
});

app.listen(3000, () => console.log('Baseline server listening on port 3000'));
```

### Line-by-line explanation
- Line 1-2: Import Express and create an app instance to handle HTTP requests.
- Line 4: Enable JSON body parsing (needed for potential future endpoints).
- Lines 7-11: Define a function that simulates an expensive data fetch (e.g., a DB query) by delaying ~120ms and returning a product object.
- Lines 13-20: Define a GET endpoint at /product/:id that always calls the simulated DB fetch and returns the result.
- Lines 22-24: Start the HTTP server on port 3000.

Why this matters professionally:
- This baseline demonstrates the current latency sinners without caching. In real systems, this pattern quickly becomes a bottleneck under load, driving up DB usage, increasing tail latencies, and reducing the ability to scale.

## 2. Set Up Redis Client in Node.js

Before caching, you need a Redis client that connects to your Redis server. This section shows a robust setup using the node-redis v4 client, including proper connection handling and a simple health flag to signal Redis availability.

Code example
```js
// redis-setup.js
const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisClient = createClient({ url: REDIS_URL });

redisClient.on('error', (err) => {
  console.error('Redis client error', err);
});

// Track Redis health so the app can gracefully degrade if Redis is down
let redisHealthy = false;

(async () => {
  try {
    await redisClient.connect();
    redisHealthy = true;
    console.log('Connected to Redis');
  } catch (err) {
    redisHealthy = false;
    console.error('Failed to connect to Redis', err);
  }
})();

module.exports = { redisClient, redisHealthy };
```

### Line-by-line explanation
- Line 1: Import the Redis client factory from the redis package.
- Line 3: Resolve Redis URL from environment or default to localhost.
- Line 4: Create a Redis client instance with the URL.
- Line 6-8: Attach an error handler to log Redis client errors.
- Line 11-12: Initialize a health flag to reflect whether Redis is available.
- Lines 14-21: Immediately attempt to connect to Redis, updating the health flag accordingly. Log success or failure.
- Line 23: Export the client and health flag for use in the API layer.

Why this matters professionally:
- A clean separation of Redis setup makes it easy to reuse the client across routes and to gracefully degrade when Redis is unavailable. It also helps with testability and configurability in different environments (dev/staging/prod).

## 3. Cache-Aside Pattern (Cache-Aside / Lazy Load) for GET Endpoints

The cache-aside pattern checks the cache first; if data is missing or stale, the API fetches from the source of truth (e.g., a database), then populates the cache. This section demonstrates an end-to-end example for a product GET endpoint that caches results in Redis with a time-to-live (TTL).

Code example
```js
// cache-aside.js
const express = require('express');
const { createClient } = require('redis');
const { redisClient, redisHealthy } = require('./redis-setup');

const app = express();
app.use(express.json());

// Simulated DB fetch (as before)
async function fetchFromDB(id) {
  await new Promise((r) => setTimeout(r, 120));
  return { id, name: `Product ${id}`, price: Math.floor(Math.random() * 100) + 1 };
}

async function getProduct(id) {
  const cacheKey = `product:${id}`;

  // If Redis is down, skip cache (fallback to DB)
  if (redisHealthy) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (err) {
      console.error('Redis GET error', err);
      // Fall back to DB on error
    }
  }

  const product = await fetchFromDB(id);

  if (redisHealthy) {
    try {
      // Cache the result with a 5-minute TTL
      await redisClient.set(cacheKey, JSON.stringify(product), { EX: 60 * 5 });
    } catch (err) {
      console.error('Redis SET error', err);
    }
  }

  return product;
}

app.get('/product/:id', async (req, res) => {
  const id = req.params.id;
  const product = await getProduct(id);
  res.json({ product, cached: false });
});

// To demonstrate actual cache usage, we can fetch twice to show cache hit
// (In practice, remove this extra route or manage with a separate test)
app.get('/product/:id/with-cache', async (req, res) => {
  const id = req.params.id;
  const product = await getProduct(id);
  // If the data came from cache, we'd set a flag; for demonstration, assume cached on second call
  res.json({ product, cached: true });
});

app.listen(3000, () => console.log('Cache-aside server listening on port 3000'));
```

### Line-by-line explanation
- Line 1-4: Import Express and the Redis client; reuse the Redis setup for connection state.
- Lines 6-15: Reuse the DB fetch function from the baseline to keep the example focused on caching.
- Function getProduct(id):
  - cacheKey creation (Line 18): Unique key per product to avoid collisions.
  - Redis health check (Line 21): Only use Redis if it’s healthy; otherwise skip to DB.
  - Cache retrieval (Lines 23-31): Attempt to get cached data; on hit, parse and return.
  - DB fallback (Lines 34-36): If Redis miss or error, fetch from DB.
  - Cache population (Lines 38-46): If Redis is healthy, store the fetched product with a TTL of 5 minutes.
- Endpoint /product/:id (Lines 48-52): Public API that returns the product data, either fresh from DB or cached data.
- Endpoint /product/:id/with-cache (Lines 55-60): Demonstrative variant to show a subsequent call may hit the cache.
- Line 62-64: Start the server.

Why this matters professionally:
- Cache-aside minimizes DB load by serving repeat requests from Redis. It also gracefully degrades when Redis is unavailable, preserving service availability while caching remains a best-effort performance hook.

## 4. Cache Invalidation on Write Operations

Write operations must ensure the cache does not serve stale data. The typical approach is to invalidate or update the relevant cache entries when data changes. This section shows a PUT endpoint that updates a product and invalidates the corresponding cache key.

Code example
```js
// cache-invalidation.js
const express = require('express');
const { redisClient, redisHealthy } = require('./redis-setup');
const app = express();
app.use(express.json());

// Simulated in-place "DB" update
async function updateProductInDB(id, data) {
  await new Promise((r) => setTimeout(r, 100));
  return { id, ...data };
}

async function updateProduct(id, data) {
  const updated = await updateProductInDB(id, data);

  // Invalidate cache to ensure subsequent reads fetch fresh data
  const cacheKey = `product:${id}`;
  if (redisHealthy) {
    try {
      await redisClient.del(cacheKey);
    } catch (err) {
      console.error('Redis DEL error', err);
    }
  }

  return updated;
}

app.put('/product/:id', async (req, res) => {
  const id = req.params.id;
  const updated = await updateProduct(id, req.body);
  res.json({ updated });
});

app.listen(3001, () => console.log('Cache invalidation server listening on port 3001'));
```

### Line-by-line explanation
- Lines 1-3: Import Express and the Redis client health helper; set up the app.
- Lines 6-9: Simulated DB update with a short delay to mimic work.
- Lines 11-20: updateProduct performs the write to the DB and then invalidates the cache entry for the updated product.
  - Cache key construction (Line 15): Exactly matches the key used during reads.
  - Cache invalidation (Lines 16-20): If Redis is healthy, delete the key to force a rebuild on next read.
- Endpoint /product/:id (Lines 22-28): Update product data via PUT and return the updated object.
- Line 30: Start the server on port 3001.

Why this matters professionally:
- Cache invalidation is the hardest problem in caching. The simplest correct strategy for many read-heavy endpoints is to delete the cached value on write. This approach ensures read-after-write consistency without risking serving stale data.

## 5. Observability, Resilience, and Best Practices

In production, you’ll want visibility into cache effectiveness (hits vs misses), resilience to Redis outages, and sane defaults for TTLs. This section demonstrates practical patterns for metrics, error handling, and defensive defaults.

Code example
```js
// observability.js
const { redisClient, redisHealthy } = require('./redis-setup');

// Simple in-process counters (replace with a real metrics system in production)
let hits = 0;
let misses = 0;

async function getProductWithMetrics(id) {
  const cacheKey = `product:${id}`;
  if (redisHealthy) {
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        hits++;
        return JSON.parse(cached);
      }
    } catch (err) {
      console.error('Redis GET error', err);
    }
  }

  misses++;
  // Fallback to DB
  const product = await fetchFromDB(id);
  if (redisHealthy) {
    try {
      await redisClient.set(cacheKey, JSON.stringify(product), { EX: 60 * 5 });
    } catch (err) {
      console.error('Redis SET error', err);
    }
  }
  return product;
}

// Placeholder for the DB fetch used in previous sections
async function fetchFromDB(id) {
  await new Promise((r) => setTimeout(r, 120));
  return { id, name: `Product ${id}`, price: Math.floor(Math.random() * 100) + 1 };
}

module.exports = { getProductWithMetrics, hits, misses };
```

### Line-by-line explanation
- Lines 1-2: Import Redis client state helpers and expose a lightweight metric surface (hits and misses).
- Lines 4-15: getProductWithMetrics mirrors the cache-aside flow with separate counters:
  - Redis GET (Lines 7-12): If data is found, increment hits and return parsed value.
  - Miss handling (Lines 13-17): On miss, increment misses, fetch from DB, and populate the cache (when Redis is healthy).
  - Cache population (Lines 18-22): After a DB fetch, store the result with a TTL to warm the cache.
- Lines 25-28: A fallback fetchFromDB function used for demonstration.
- Lines 30-32: Export the function and the counters for external usage.

Why this matters professionally:
- Observability lets you measure cache effectiveness in real-time and tune TTLs, cache keys, and refresh strategies. Resilience patterns ensure the user experience remains acceptable under Redis outages.

## X. Common Beginner Mistakes

1) Pitfall: No TTL or very long TTL leading to staleness or memory bloat
- Bad:
```js
await redisClient.set(cacheKey, JSON.stringify(product)); // no TTL
```
- Good:
```js
await redisClient.set(cacheKey, JSON.stringify(product), { EX: 60 * 5 }); // 5 minutes
```

2) Pitfall: Not invalidating cache on writes, causing stale reads
- Bad:
```js
app.put('/product/:id', async (req, res) => {
  // update DB but never clear cache
  res.json({ ok: true });
});
```
- Good:
```js
await redisClient.del(`product:${id}`); // invalidate after write
```

3) Pitfall: Swallowing Redis errors and letting requests crash or hang
- Bad:
```js
const cached = await redisClient.get(cacheKey); // if Redis is down, this throws and crashes
```
- Good:
```js
let cached;
try { cached = await redisClient.get(cacheKey); } catch (e) { /* log and continue */ cached = null; }
```

4) Pitfall: Inconsistent key naming / lack of namespaces
- Bad:
```js
const key = `prod:${id}`; // inconsistent across routes
```
- Good:
```js
const key = `cache:product:${id}`; // consistent namespace
```

5) Pitfall: Not handling Redis outages gracefully
- Bad (no degradation path):
```js
const cached = await redisClient.get(cacheKey); // if Redis down, 500 error without fallback
```
- Good (graceful degradation):
```js
if (redisHealthy) { /* attempt cache */ } else { /* directly fetch DB and proceed */ }
```

## Y. Why This Matters In Real Systems

- Latency reductions: Caching hot paths can drop per-request latency from hundreds of milliseconds to single digits, dramatically improving user experience.
- Throughput and resource efficiency: Redis offloads repeated reads from your primary datastore, reducing DB load and scaling costs.
- Predictable performance under load: Cached responses help absorb traffic spikes by serving repeated requests quickly.
- Data freshness and consistency: TTLs introduce controlled staleness; cache invalidation patterns ensure consistency after writes.
- Observability and reliability: Metrics (hits/misses, eviction counts, cache warmth) guide tuning and alerting for cache health.

Practical deployment notes:
- Use a Redis cluster or managed Redis in cloud environments for high availability and sharding when needed.
- Separate cache keys per resource with a clear namespace (e.g., cache:product:<id>).
- Consider additional patterns for complex data (bulk fetch, streaming updates, or per-field invalidation).
- Use instrumentation (metrics, logs, traces) to monitor latency, hit rate, and tail latency.

## Z. Study Questions

1) What is the cache-aside pattern and when would you use it?
2) Why is TTL important in a caching layer, and what trade-offs does it create?
3) How would you gracefully degrade when Redis is unavailable?
4) How can you invalidate the cache after a write operation to ensure consistency?
5) What are common pitfalls when naming keys in a cache and how can you avoid them?

## Exercise

Goal: Build a small Express API with Redis caching, write-through invalidation, and graceful fallback. You will implement a product endpoint with cache-aside, a write endpoint that invalidates, and basic observability.

Part A — Project scaffolding (6 points)
- Create a Node.js project with Express and redis packages.
- Implement a Redis setup module (as shown in Section 2) that exports a Redis client and a health flag.

Deliverables:
- A file redis-setup.js exporting { redisClient, redisHealthy }.

Part B — Cache-aside GET endpoint (8 points)
- Implement a GET /product/:id endpoint using the getProduct function from Section 3.
- Ensure it uses Redis for the cache with a 5-minute TTL and gracefully falls back to the DB if Redis is down.

Deliverables:
- A file cache-aside.js with an Express app exposing the route.
- A function getProduct(id) that uses Redis cache and DB fallback.

Part C — Write with cache invalidation (6 points)
- Implement PUT /product/:id that updates the product (simulated) and invalidates the Redis cache for that product.

Deliverables:
- In the same file or a new route file, ensure cache invalidation via DEL.

Part D — Observability (5 points)
- Add a simple in-memory hits/misses counter or integrate a small metrics printout.
- Expose an endpoint /metrics that returns hits and misses for quick verification.

Deliverables:
- A GET /metrics endpoint providing JSON { hits, misses }.

Part E — Resilience and testing scenarios (5 points)
- Demonstrate how the code behaves if Redis is down (e.g., by simulating redisHealthy = false).
- Ensure the API still responds by fetching from DB and not failing.

Deliverables:
- A README snippet or comments explaining how to simulate Redis downtime (e.g., edit the health flag) and expected behavior.

Bonus (optional) — Batch fetch (3 points)
- Extend to support GET /products?ids=1,2,3 and fetch multiple items using MGET + selective DB fetch for misses, caching the results.

What to submit:
- A single repository with the following structure:
  - package.json
  - redis-setup.js
  - cache-aside.js (GET endpoint)
  - cache-invalidation.js (PUT endpoint) or combined in one file
  - metrics endpoint
  - README.md describing how to run and how the cache works
- Ensure all code blocks are well-commented and include the exact TTL and key-naming conventions used.

Notes:
- The exercise is designed to be incremental. Start with the baseline and progressively add caching, invalidation, and observability.
- Use environment variables for Redis URL and TTL in production-like settings.
- Focus on correctness, graceful degradation, and clarity of code rather than adding external complexities.

End of lesson.