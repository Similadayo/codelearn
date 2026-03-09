# Track: Backend Engineering — Phase 9: System Design & Scalability — System Design Interview Walkthroughs (JavaScript / Node.js)

System design interview walkthroughs teach you how to reason about large-scale backends, translate ambiguous requirements into concrete architectures, and communicate trade-offs clearly. In real-world jobs, you’ll design services that scale to millions of users, stay resilient under partial outages, and evolve without breaking existing clients. This lesson blends the interview pedagogy with practical Node.js patterns you can prototype and reason about in code.

## 1. Clarify the Problem and Define Success Metrics

Start every system design discussion by extracting requirements, defining success metrics, and identifying constraints. This anchors your architecture decisions and aligns stakeholders.

```js
// Requirements extraction: convert a narrative into measurable goals
function createDesignSpec(story) {
  const spec = {
    scope: story.scope ?? 'unspecified',
    latencyTargetMs: story.latencyTargetMs ?? 200,
    availabilityPct: story.availability ?? 99.9,
    dataSizeMB: story.dataSizeMB ?? 100,
  };
  const goals = [
    `Support up to ${story.maxUsers ?? 10000} concurrent users`,
    `95th percentile latency < ${spec.latencyTargetMs} ms`,
    `High availability with graceful degradation`,
  ];
  return { spec, goals };
}

// Example user story
const story = {
  scope: 'e-commerce product feed',
  latencyTargetMs: 150,
  maxUsers: 100000,
  dataSizeMB: 500,
  constraints: ['budget <= $5k/mo', 'data privacy'],
};

console.log(createDesignSpec(story));
```

### Line-by-line explanation
- Define a function createDesignSpec that takes a story (requirements) object.
- spec holds derived target values with sensible defaults.
- goals is a list of concrete, testable objectives derived from story.
- We supply a sample story and print the resulting design spec and goals to verify clarity.
- This pattern helps you begin an interview with an explicit design contract.

## 2. High-Level Architecture and Component Discovery

Describe a scalable architecture and how components communicate. Include an API gateway, core services, data stores, caching, and observability layers. Provide a small, runnable simulation that demonstrates routing decisions and multi-instance awareness.

```js
// Simple service registry and gateway routing (simulation)
class ServiceRegistry {
  constructor() {
    this.instances = {
      user: ['http://localhost:3001', 'http://localhost:3002'],
      product: ['http://localhost:3003', 'http://localhost:3004'],
    };
    this.counters = { user: 0, product: 0 };
  }

  // naive round-robin selection
  choose(serviceName) {
    const list = this.instances[serviceName] || [];
    if (list.length === 0) throw new Error('No instances for ' + serviceName);
    const idx = this.counters[serviceName] % list.length;
    this.counters[serviceName] += 1;
    return list[idx];
  }
}

// Simulated backend call (no real network in this demo)
async function simulateBackendCall(serviceName, path, method, payload) {
  // A tiny, deterministic mock of a backend response
  const backendMock = {
    user: { path, result: { id: payload?.id ?? 'u1', name: 'Alice' } },
    product: { path, result: { id: 'p1', title: 'Widget' } },
  }[serviceName];

  if (!backendMock) throw new Error('Unknown service');
  // simulate latency
  await new Promise((r) => setTimeout(r, Math.random() * 100));
  return { status: 200, data: backendMock.result };
}

// Gateway: route to a chosen instance and return simulated response
async function gatewayCall(serviceName, path, method = 'GET', payload = null) {
  const registry = new ServiceRegistry();
  const target = registry.choose(serviceName);
  // Real-world: forward to `${target}${path}` with fetch
  // Here we simulate with the backend mock
  return simulateBackendCall(serviceName, path, method, payload);
}

// Example usage
(async () => {
  console.log(await gatewayCall('user', '/profile', 'GET', { id: 'u1' }));
  console.log(await gatewayCall('user', '/profile', 'GET', { id: 'u2' }));
  console.log(await gatewayCall('product', '/items', 'GET'));
})();
```

### Line-by-line explanation
- ServiceRegistry maintains instance endpoints per service and a round-robin counter.
- choose(serviceName) selects the next instance for the given service, enabling load distribution across replicas.
- simulateBackendCall emulates a backend response with latency to illustrate non-blocking behavior and failure points.
- gatewayCall wires the registry to the simulated backend, showing how an API gateway routes to services without requiring real HTTP calls.
- The IIFE demonstrates multiple calls to the gateway to show distribution across instances.

## 3. Data Modeling for Scalable Systems

Explain data modeling choices for scale, including event sourcing, read models, and eventual consistency. Here is a minimal event-sourcing pattern that can scale reads by projecting a read model separately.

```js
// Simple in-memory event store for an event-sourced user aggregate
const EventStore = [];

function appendEvent(entityId, event) {
  EventStore.push({ entityId, event, ts: Date.now() });
}

function projectUserReadModel() {
  const users = {};
  for (const rec of EventStore) {
    const { entityId, event } = rec;
    switch (event.type) {
      case 'UserCreated':
        users[entityId] = {
          id: entityId,
          name: event.payload.name,
          email: event.payload.email,
          version: 1,
        };
        break;
      case 'UserNameChanged':
        if (users[entityId]) {
          users[entityId].name = event.payload.name;
          users[entityId].version += 1;
        }
        break;
      case 'UserEmailUpdated':
        if (users[entityId]) {
          users[entityId].email = event.payload.email;
          users[entityId].version += 1;
        }
        break;
    }
  }
  return users;
}

// Example: apply a few events and project a read model
appendEvent('u1', { type: 'UserCreated', payload: { name: 'Alice', email: 'alice@example.com' } });
appendEvent('u1', { type: 'UserNameChanged', payload: { name: 'Alicia' } });
appendEvent('u1', { type: 'UserEmailUpdated', payload: { email: 'alice@acme.com' } });

console.log(projectUserReadModel());
```

### Line-by-line explanation
- EventStore is a shared, append-only log that records domain events.
- appendEvent writes a new event for a given entityId, preserving a timestamp.
- projectUserReadModel materializes a read model by replaying events in order.
- The switch handles each event type, updating the in-memory read model state and version tracking.
- The example demonstrates how you separate write side (events) from read side (projections) for scalable reads.

## 4. Caching, Partitioning, and Consistency Patterns

Show how to implement a cache-aside pattern and a simple read model with TTL to illustrate performance and consistency trade-offs.

```js
// Simple in-memory TTL cache
class SimpleCache {
  constructor(ttlMs = 5000) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }
  set(key, value) {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }
}
const cache = new SimpleCache(10000);

async function fetchUserFromDB(id) {
  // simulate DB latency
  await new Promise((r) => setTimeout(r, 50));
  return { id, name: id === 'u1' ? 'Alice' : 'User', email: id + '@example.com' };
}

async function getUser(id) {
  const cached = cache.get(id);
  if (cached) {
    console.log('cache hit for', id);
    return cached;
  }
  console.log('cache miss for', id);
  const user = await fetchUserFromDB(id);
  cache.set(id, user);
  return user;
}
```

### Line-by-line explanation
- SimpleCache implements a TTL-based cache with a Map.
- get retrieves a value if present and not expired; otherwise returns undefined.
- set stores the value with an expiration timestamp.
- fetchUserFromDB simulates a database read with latency.
- getUser uses cache-aside logic: check cache first; on miss, read from DB and populate the cache.
- The example shows how caching improves read performance but introduces eventual consistency considerations if the underlying data changes and cache invalidation is not immediate.

## 5. Reliability, Observability, and Deployment

Explain how to instrument services, implement health checks, and expose basic metrics. This helps you design for operability in production systems.

```js
const express = require('express');
const app = express();

let requestCount = 0;
let lastError = null;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now(), reqCount: requestCount });
});

app.post('/data', (req, res) => {
  requestCount++;
  // simulate potential failure
  if (Math.random() < 0.01) {
    lastError = 'random_failure';
    res.status(500).json({ error: 'internal_error' });
  } else {
    res.json({ ok: true, echo: req.body });
  }
});

function renderMetrics() {
  // Very lightweight metrics endpoint (Prometheus-like)
  return `requests${' '}${requestCount}\nlast_error${' '}${lastError ?? 'none'}\n`;
}

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(renderMetrics());
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Gateway listening on ${PORT}`));
```

### Line-by-line explanation
- Create an Express app and initialize simple counters for observability.
- /health endpoint reports status, timestamp, and request count for rapid health checks.
- /data simulates workload; a small chance of error demonstrates failure scenarios.
- /metrics exposes a minimal, human- and machine-readable metrics snapshot.
- The server starts on a configurable port; this pattern is foundational for production readiness.

## 6. Trade-offs, Sizing, and Capacity Planning

Discuss how to think about workload estimates, caching budgets, and sizing decisions. Include a simple capacity estimator.

```js
// Simple capacity estimator for DB connections based on RPS and latency
function estimateDBConnections(rps, avgLatencyMs, safetyFactor = 1.5) {
  const latencySec = avgLatencyMs / 1000;
  // crude guideline: connections ~ rps * latency * safetyFactor
  return Math.ceil(rps * latencySec * safetyFactor);
}

// Example usage
const rps = 1000;
console.log('Estimated DB connections:', estimateDBConnections(rps, 20, 2));

// Also consider sharding/partitioning strategy in text, not just code:
// - Decide on partition keys
// - Plan for horizontal scaling
```

### Line-by-line explanation
- estimateDBConnections converts latency from ms to seconds and applies a safety factor to account for bursts and non-ideal conditions.
- It returns a rough estimate of required DB connections to keep latency targets under load.
- The example demonstrates a practical starting point for capacity planning discussions; you would pair this with a real model and monitoring data in production.

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side.

- Mistake 1: Not clarifying requirements and success metrics
  Bad:
  ```js
  // Hasty design without explicit goals
  function designSolution() {
    return { components: ['api', 'db'] };
  }
  ```
  Good:
  ```js
  // Clear, explicit design spec
  const designSpec = {
    scope: 'read-heavy product feed',
    latencyTargetMs: 200,
    availability: 99.9
  };
  ```

- Mistake 2: Ignoring cache invalidation and consistency
  Bad:
  ```js
  // Always hitting DB; no cache
  async function getProduct(id) {
    return fetch(`/db/products/${id}`).then(r => r.json());
  }
  ```
  Good:
  ```js
  // Cache-aside with invalidation on write
  const cache = new SimpleCache(10000);
  async function getProduct(id) {
    const cached = cache.get(id);
    if (cached) return cached;
    const product = await fetch(`/db/products/${id}`).then(r => r.json());
    cache.set(id, product);
    return product;
  }

  async function updateProduct(id, update) {
    // write through to DB
    await fetch(`/db/products/${id}`, { method: 'PUT', body: JSON.stringify(update) });
    // invalidate cache
    cache.set(id, undefined);
  }
  ```

- Mistake 3: Not designing for idempotency and failure tolerance
  Bad:
  ```js
  // Non-idempotent operation
  app.post('/like', (req, res) => {
    // increments a counter for a post
  });
  ```
  Good:
  ```js
  // Idempotent-like behavior via idempotency key
  const processedKeys = new Set();
  app.post('/like', (req, res) => {
    const key = req.headers['idempotency-key'];
    if (processedKeys.has(key)) return res.status(200).json({ ok: true });
    // perform increment
    processedKeys.add(key);
    res.json({ ok: true });
  });
  ```

- Mistake 4: Over- or under-engineering without trade-offs
  Bad: building many microservices for a small app
  Good: start with a modular monolith or a small set of services, then split as load and domain boundaries necessitate it.

## Y. Why This Matters In Real Systems

- Production reality: systems face partial outages, traffic bursts, and evolving requirements. You must align with SLOs, SLAs, and budgets.
- Practices that consistently pay off:
  - Clear design contracts: requirements → design spec → success criteria.
  - Architectural primitives: API gateway, service registry, retries with backoff, circuit breakers.
  - Observability: health checks, metrics, structured logs, tracing (distributed tracing for microservices).
  - Data strategy: choose write-heavy vs read-heavy models; consider eventual consistency where appropriate.
  - Capacity planning: baseline estimates, load testing, and dynamic scaling strategies (auto-scaling groups, canaries, blue/green deploys).

## Z. Study Questions

1) What are the four steps of a standard system design interview approach, and what does each contribute?  
2) Compare SQL vs NoSQL choices for a session store in a high-traffic app; what trade-offs matter?  
3) Name and describe two common caching patterns and when you would choose them.  
4) How would you design an API to be idempotent for a “like” action? Provide a high-level approach and a code sketch.  
5) What deployment strategies help minimize risk when releasing a new design in production? Briefly describe blue/green and canary deployments.

## Exercise

Part A — Build a minimal API Gateway with two mock backends (User and Product)

- Create a small Node.js project with a gateway that routes GET /users/:id and GET /products/:id to two simulated services.
- Implement a ServiceRegistry with two instances per service to demonstrate multi-instance routing (round-robin).
- Implement a simple in-memory cache for GET /users/:id with a TTL.
- Expose a /health and /metrics endpoint to demonstrate observability.

Starter code snippets (you can place these in separate files, e.g., gateway.js, services/mockBackends.js)

1) gateway.js (gateway with registry and routing)
```js
// gateway.js
class ServiceRegistry {
  constructor() {
    this.instances = {
      user: ['http://localhost:3001', 'http://localhost:3002'],
      product: ['http://localhost:3003', 'http://localhost:3004'],
    };
    this.counters = { user: 0, product: 0 };
  }
  choose(serviceName) {
    const list = this.instances[serviceName] || [];
    if (list.length === 0) throw new Error('No instances for ' + serviceName);
    const idx = this.counters[serviceName] % list.length;
    this.counters[serviceName] += 1;
    return list[idx];
  }
}

// For this exercise we simulate backend calls rather than performing real HTTP requests.
async function simulateBackendCall(serviceName, path, method, payload) {
  const backendMap = {
    user: { path, result: { id: payload?.id ?? 'u1', name: 'Alice' } },
    product: { path, result: { id: 'p1', title: 'Widget' } },
  };
  const entry = backendMap[serviceName];
  if (!entry) throw new Error('Unknown service');
  await new Promise((r) => setTimeout(r, Math.random() * 100)); // latency
  return { status: 200, data: entry.result };
}

async function gatewayCall(serviceName, path, method = 'GET', payload = null) {
  const registry = new ServiceRegistry();
  const target = registry.choose(serviceName);
  // In real life: fetch(`${target}${path}`, { method, body: payload ? JSON.stringify(payload) : undefined })
  // Here we simulate:
  return simulateBackendCall(serviceName, path, method, payload);
}

// Example usage
(async () => {
  console.log(await gatewayCall('user', '/profile', 'GET', { id: 'u1' }));
  console.log(await gatewayCall('user', '/profile', 'GET', { id: 'u2' }));
  console.log(await gatewayCall('product', '/items', 'GET'));
})();
```

2) Run and test
- Install Node (v18+ recommended for global fetch if you swap simulateBackendCall with real fetch).
- Run: node gateway.js
- You should see two user responses (from different simulated instances) and one product response, demonstrating multi-instance routing.

3) Exercise extension ideas
- Swap simulateBackendCall with real HTTP fetch calls to actual endpoints.
- Add a health check that pings each service instance and marks unhealthy ones as unavailable.
- Implement a real cache layer for GET /users/:id using TTL and an eviction policy.

Notes
- This lesson intentionally uses simulated backends to keep the focus on architecture, routing, and data flows rather than network programming details.
- In real systems, you would replace simulateBackendCall with real HTTP calls (e.g., using fetch or axios), integrate a service mesh for more advanced routing, and wire up distributed tracing (OpenTelemetry) for end-to-end visibility.

If you want, I can tailor the exercise to a specific stack version (e.g., Node 20 with ESM, or TypeScript) or add Docker-compose scaffolding for running all services locally.