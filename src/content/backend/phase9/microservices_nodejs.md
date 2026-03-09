# Microservices vs Monolith — When & Why (JavaScript / Node.js)

In backend engineering, choosing between a monolithic architecture and a microservices ecosystem is a foundational decision that shapes deployment, scalability, team autonomy, and fault tolerance. This lesson shows practical Node.js patterns, concrete trade-offs, and real-world guidance to help engineers decide when to keep a single deployable unit versus breaking the system into independently deployable services.

## 1. Monolith vs Microservices: Definitions and Trade-offs

Monoliths bundle all domain logic, data access, and APIs into a single deployable app. Microservices split capabilities into small, independently deployable services that communicate over lightweight protocols. Understanding the baseline helps you reason about maintainability, deployment speed, fault isolation, and data ownership.

Code: A minimal monolith with two resources (users and products)

```js
// monolith/index.js
const express = require('express');
const app = express();
app.use(express.json());

const data = {
  users: [{ id: 'u1', name: 'Ada' }],
  products: [{ id: 'p1', name: 'Widget', price: 9.99 }]
};

// Users endpoints
app.get('/users', (req, res) => res.json(data.users));
app.post('/users', (req, res) => {
  const user = { id: `u${Date.now()}`, ...req.body };
  data.users.push(user);
  res.status(201).json(user);
});

// Products endpoints
app.get('/products', (req, res) => res.json(data.products));
app.post('/products', (req, res) => {
  const product = { id: `p${Date.now()}`, ...req.body };
  data.products.push(product);
  res.status(201).json(product);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Monolith listening on ${PORT}`));
```

### Line-by-line explanation
- Line 1-3: Import Express and create an app instance; enable JSON body parsing.
- Line 5-12: In-memory data store for users/products to simulate persistence.
- Lines 14-16: GET /users returns all users.
- Lines 17-22: POST /users creates a new user with a unique id and stores it.
- Lines 25-27: GET /products returns all products.
- Lines 28-33: POST /products creates a new product with a unique id and stores it.
- Lines 35-38: Start the server on a port (default 3000) and log a message.

Trade-offs to notice:
- Pros: Simple, cohesive codebase, easy to reason about, easy to test end-to-end.
- Cons: Scaling pressure, deployment risk, team bottlenecks, and hard data/domain boundaries as the app grows.

Code: Minimal microservice pair (two services) and an API gateway (all Node.js/Express)

```js
// services/user-service.js
const express = require('express');
const app = express();
app.use(express.json());

const users = [{ id: 'u1', name: 'Ada' }];

app.get('/users', (req, res) => res.json(users));
app.post('/users', (req, res) => {
  const user = { id: `u${Date.now()}`, ...req.body };
  users.push(user);
  res.status(201).json(user);
});

app.listen(3001, () => console.log('User service listening on 3001'));
```

```js
// services/product-service.js
const express = require('express');
const app = express();
app.use(express.json());

const products = [{ id: 'p1', name: 'Widget', price: 9.99 }];

app.get('/products', (req, res) => res.json(products));
app.post('/products', (req, res) => {
  const product = { id: `p${Date.now()}`, ...req.body };
  products.push(product);
  res.status(201).json(product);
});

app.listen(3002, () => console.log('Product service listening on 3002'));
```

```js
// gateway/index.js
// Simple API gateway that routes to microservices
const express = require('express');
const app = express();
app.use(express.json());

app.get('/users', async (req, res) => {
  const r = await fetch('http://localhost:3001/users');
  const data = await r.json();
  res.json(data);
});

app.get('/products', async (req, res) => {
  const r = await fetch('http://localhost:3002/products');
  const data = await r.json();
  res.json(data);
});

app.listen(3000, () => console.log('Gateway listening on 3000'));
```

### Line-by-line explanation
- User service (user-service.js)
  - Lines 1-3: Set up Express app.
  - Line 5: Initialize in-memory users list with one entry.
  - Lines 7-8: GET /users returns current users.
  - Lines 9-15: POST /users creates a new user with a unique id and appends it.
  - Line 17: Start the service on port 3001.

- Product service (product-service.js)
  - Lines 1-3: Set up Express app.
  - Line 5: Initialize in-memory products list with one entry.
  - Lines 7-8: GET /products returns products.
  - Lines 9-15: POST /products creates a new product with a unique id and appends it.
  - Line 17: Start on port 3002.

- Gateway (gateway/index.js)
  - Lines 1-3: Set up a simple Express gateway.
  - Lines 5-12: /users forwards the call to the user service and returns its response.
  - Lines 14-21: /products forwards the call to the product service and returns its response.
  - Line 23: Start gateway on port 3000.

This trio demonstrates the basic separation between services and a desire for a single entry point for clients.

## 2. Microservices: Architecture and Communication

Microservices emphasize explicit service boundaries, independent deployments, and inter-service communication. In Node.js, common patterns include REST over HTTP, lightweight messaging, and API gateways for routing, authentication, rate limiting, and observability.

Code: API Gateway routing plus two self-contained services

- User service (same as above)
- Product service (same as above)
- Gateway (enhanced with simple path-based routing to services)

```js
// gateway/index.js (enhanced)
const express = require('express');
const app = express();
app.use(express.json());

// Simple routing to microservices
app.use('/api/users', (req, res) => {
  // forward to user-service; preserve method and body
  fetch(`http://localhost:3001${req.originalUrl}`, {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    body: req.method === 'GET' ? undefined : JSON.stringify(req.body),
  })
    .then(r => r.json())
    .then(d => res.json(d))
    .catch(() => res.status(502).send('User service unavailable'));
});

app.use('/api/products', (req, res) => {
  fetch(`http://localhost:3002${req.originalUrl}`, {
    method: req.method,
    headers: { 'Content-Type': 'application/json' },
    body: req.method === 'GET' ? undefined : JSON.stringify(req.body),
  })
    .then(r => r.json())
    .then(d => res.json(d))
    .catch(() => res.status(502).send('Product service unavailable'));
});

app.listen(3000, () => console.log('Gateway listening on 3000'));
```

### Line-by-line explanation
- Lines 1-3: Import Express and create the gateway app, enabling JSON bodies.
- Lines 6-14: Route all /api/users requests to the user-service, preserving HTTP method and body for non-GET requests. The gateway handles the response or returns a 502 if the service is unavailable.
- Lines 16-24: Route all /api/products requests to the product-service with the same behavior as users.
- Line 26: Start the gateway on port 3000.

Communication patterns to consider in production:
- Synchronous HTTP, with timeouts, retries, and circuit breakers.
- Async messaging (e.g., message queues) for events and eventual consistency.
- API gateway features: auth, rate limiting, metrics, tracing.

## 3. Data Boundaries and Storage Patterns

Data architecture is a core driver of the monolith vs microservices decision. A shared database simplifies consistency but couples services; per-service databases enable autonomy but require patterns for cross-service transactions and data duplication.

Code: Shared DB approach (monolith and microservices talk to the same data store)

```js
// data/shared.js
// Pretend a single shared "store" for demonstration
const store = { users: [], products: [] };
module.exports = { store };
```

Monolith uses the shared store for both resources (simple demo; real systems would persist to a DB)

```js
// monolith/index.js (use shared.js)
const express = require('express');
const { store } = require('./data/shared');
const app = express();
app.use(express.json());

app.get('/users', (req, res) => res.json(store.users));
app.post('/users', (req, res) => {
  const u = { id: `u${Date.now()}`, ...req.body };
  store.users.push(u);
  res.status(201).json(u);
});

app.get('/products', (req, res) => res.json(store.products));
app.post('/products', (req, res) => {
  const p = { id: `p${Date.now()}`, ...req.body };
  store.products.push(p);
  res.status(201).json(p);
});

app.listen(3000, () => console.log('Monolith (shared DB) on 3000'));
```

Code: Per-service databases (each service uses its own store or DB connection)

```js
// services/user-service.js
const express = require('express');
const app = express();
app.use(express.json());

const users = [{ id: 'u1', name: 'Ada' }];

app.get('/users', (req, res) => res.json(users));
app.post('/users', (req, res) => {
  const u = { id: `u${Date.now()}`, ...req.body };
  users.push(u);
  res.status(201).json(u);
});

app.listen(3001, () => console.log('User service (separate DB) on 3001'));
```

```js
// services/product-service.js
const express = require('express');
const app = express();
app.use(express.json());

const products = [{ id: 'p1', name: 'Widget', price: 9.99 }];

app.get('/products', (req, res) => res.json(products));
app.post('/products', (req, res) => {
  const p = { id: `p${Date.now()}`, ...req.body };
  products.push(p);
  res.status(201).json(p);
});

app.listen(3002, () => console.log('Product service (separate DB) on 3002'));
```

### Line-by-line explanation
- Shared DB example
  - Lines 1-3: Define a single in-memory store shared by both resources.
  - Monolith (lines 5-23): Reads and writes to the same store for /users and /products.
  - This demonstrates how a single store forces strong coupling between resources.

- Per-service DB example
  - User service code uses its own in-memory array for users.
  - Product service code uses its own in-memory array for products.
  - Each service maintains its own data boundary and can evolve independently.

Notes:
- In production, per-service DBs would be real databases with separate connections. The monolith would usually point to a single database instance. The choice influences transaction boundaries, data duplication, and cross-service consistency strategies.

## 4. When & Why: Decision Criteria

Choosing monolith vs microservices is a context-driven decision. Consider these criteria and trade-offs.

- Team structure and autonomy: If teams own domain boundaries independently and deploy independently, microservices can help. If teams are small or cross-functional, a monolith reduces coordination overhead.
- Data consistency and transactions: Strong ACID requirements across domains favor a monolith or carefully orchestrated saga patterns in microservices.
- Deployment and scale: If you need to scale subdomains independently (e.g., order processing vs user management), microservices shine.
- Complexity and operational burden: Microservices add operational complexity (orchestration, monitoring, failure modes). Start with a monolith and split when clear boundaries exist.
- Latency and network reliability: Microservices introduce network calls; be mindful of latency, timeouts, retries, and circuit breakers.

Code: Simple decision helper (illustrative)

```js
function decideArchitecture({ domains, teamCount, requiresStrongTransactions, latencySensitive }) {
  // Very simplified heuristic
  const domainBoundaries = domains?.length ?? 0;
  if (domainBoundaries > 1 && teamCount > 1 && !requiresStrongTransactions) {
    return 'microservices';
  }
  if (latencySensitive) {
    // Favors monolith for reduced inter-service hops
    return 'monolith';
  }
  // Default to monolith for smaller teams or weaker domain separation
  return 'monolith';
}
```

### Line-by-line explanation
- Lines 2-3: Accept a structured input describing the system context.
- Lines 4-9: If there are multiple domains and multiple teams with no strong cross-domain transactions, suggest microservices.
- Lines 10-13: If latency is a critical factor, suggest a monolith to minimize inter-service calls.
- Lines 14-16: Otherwise, default to monolith to reduce complexity.

Real-world guidance:
- In practice, use lightweight early validation (e.g., domain boundaries) and incremental refactoring instead of a big-bang split.
- Start with a well-abstracted service interface, then decide whether to own data, deploy independently, and how to handle data consistency.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### 1) Prematurely splitting into microservices

Bad: code shows direct cross-service coupling from a frontend to backend services without a gateway.

```js
// Bad: Frontend calls internal microservice endpoints directly
fetch('http://localhost:3001/users');
fetch('http://localhost:3002/products');
```

Good: use a stable API gateway that encapsulates internal topology.

```js
// Good: Frontend calls gateway only
fetch('http://localhost:3000/api/users');
fetch('http://localhost:3000/api/products');
```

### 2) Tight coupling through shared in-process state or DB

Bad: a single module shared by all services, enabling cross-service state leakage.

```js
// Bad: Shared in-memory module accessed by multiple services
// shared/db.js used by both monolith and microservices
const store = { users: [], products: [] };
module.exports = { store };
```

Good: each service owns its own data boundary and database access.

```js
// Good: Per-service data store (in production, separate DBs)
const users = [{ id: 'u1', name: 'Ada' }];
module.exports = { users };
```

### 3) Synchronous inter-service calls without resilience

Bad: an API endpoint calls two services one after another synchronously, causing cascading latency or outages.

```js
// Bad: Composition without resilience
app.get('/order/:id', async (req, res) => {
  const user = await fetchUser(req.params.id);
  const product = await fetchProduct(req.params.id);
  res.json({ user, product });
});
```

Good: use asynchronous composition with timeouts, fallbacks, and possibly a cache or message-based approach.

```js
// Good: Timeouts and fallback
async function safeFetch(url, timeout = 1000) {
  return Promise.race([
    fetch(url).then(r => r.json()),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
  ]);
}
```

## Y. Why This Matters In Real Systems

- Reliability and fault isolation: Microservices can prevent a single failure from taking down the entire system, but partial outages require circuit breakers, timeouts, and graceful degradation.
- Deploy velocity and independence: Microservices enable independent teams to ship features quickly, but require robust CI/CD, versioning, and API contracts.
- Observability: Distributed tracing, metrics, and centralized logs are essential to understand cross-service flows.
- Data management: Per-service DBs improve autonomy but complicate transactions; patterns like sagas, events, and eventual consistency become important.
- Security and compliance: A gateway with authentication/authorization, mutual TLS, and per-service security policies is common in production.

Production-ready considerations to explore:
- Observability: add tracing (OpenTelemetry), metrics (Prometheus), and logs (ELK/Cloud logging).
- Fault tolerance: implement retries with backoff, circuit breakers, and idempotent endpoints.
- Deployment: containerization (Docker), orchestration (Kubernetes), and canary deployments.
- Testing: integration tests across services, contract tests for API compatibility, and contract-driven development.

## Z. Study Questions — 5 recall questions

1) What are the main differences between a monolith and microservices in terms of deployment and data ownership?
2) Why is an API gateway often used in microservice architectures?
3) What are the risks of cross-service transactions, and what patterns help mitigate them?
4) How does per-service database ownership affect consistency and queries across services?
5) Name three production practices that improve reliability in a microservice-based system.

## Exercise

You will implement a small end-to-end example that starts with a monolith and then demonstrates a microservices split with a gateway. You can run this locally with Node.js (no external databases required for the exercise; in-memory stores are fine for demonstration).

Part A — Build the monolith (baseline)
- Create a directory structure:
  - monolith/index.js
  - monolith/data.js (shared in-memory store)
- Implement a small Express app with:
  - GET /users and POST /users
  - GET /products and POST /products
- Run: node monolith/index.js
- Test:
  - POST /users with { "name": "Lin" } and then GET /users
  - POST /products with { "name": "Gadget", "price": 19.99 } and then GET /products

Part B — Split into microservices
- Create:
  - services/user-service.js (as shown above)
  - services/product-service.js (as shown above)
  - gateway/index.js (as shown above, using gateway routing)
- Run:
  - node services/user-service.js
  - node services/product-service.js
  - node gateway/index.js
- Test via gateway:
  - POST /api/users with { "name": "Lin" } and then GET /api/users
  - POST /api/products with { "name": "Gadget", "price": 19.99 } and then GET /api/products

Part C — Observability and resilience (optional extension)
- Add a simple /health endpoint to each service that returns a status flag.
- Add a gateway-wide /health that pings all services and returns aggregated health status.
- Add basic console-based logging in each microservice to trace requests and responses.

Deliverables:
- Monolith: Working app with 2 resources.
- Microservices: Worker services for users and products and a gateway routing through /api/*.
- Health checks and basic resilience patterns (timeouts and error handling) demonstrated in code comments.

Tips:
- Start small, evolve boundaries as domain concepts become clearer.
- Use the gateway as the single external surface; avoid exposing internal service endpoints directly to clients.
- When introducing microservices, prepare for operations: logging, metrics, tracing, and deployment automation early.