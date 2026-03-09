# API Versioning & Deprecation Strategies in Node.js

Versioning and deprecation are foundational practices for stable, evolvable backends. In production systems, multiple clients (web, mobile, third-party integrations, and internal microservices) may rely on older API contracts while teams iterate features. Proper versioning lets you introduce changes without breaking clients, and disciplined deprecation gives customers time to migrate. In a Node.js/Express environment, you can implement versioning via URL prefixes, content negotiation (Accept headers), or custom headers, and couple that with a clear deprecation policy to surface notices and enforce sunset dates.

## 1. Versioning Strategies in Node.js

This section covers common versioning techniques and provides concrete code examples you can adapt to your stack.

### 1.1 Path-based Versioning (URL Versioning)

Path-based versioning uses the API path to signal the version, e.g., /api/v1/users vs /api/v2/users. This approach is explicit and easy for clients to adopt, and it maps cleanly to versioned route trees.

Code: Path-based versioning with separate routers for v1 and v2
```js
// server.js
const express = require('express');
const app = express();

// Separate, versioned routers
const v1Router = require('./routes/v1');
const v2Router = require('./routes/v2');

// Mount versioned routers at distinct path prefixes
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(3000, () => console.log('API listening on port 3000'));
```

```js
// routes/v1/index.js
const express = require('express');
const router = express.Router();

router.get('/users', (req, res) => {
  res.json({ version: 'v1', users: [] });
});

module.exports = router;
```

```js
// routes/v2/index.js
const express = require('express');
const router = express.Router();

router.get('/users', (req, res) => {
  res.json({ version: 'v2', users: [] });
});

module.exports = router;
```

### 1.1 Line-by-line explanation
- `// server.js` creates a new Express app.
- `const v1Router = require('./routes/v1');` imports the v1 router.
- `const v2Router = require('./routes/v2');` imports the v2 router.
- `app.use('/api/v1', v1Router);` mounts the v1 router under /api/v1.
- `app.use('/api/v2', v2Router);` mounts the v2 router under /api/v2.
- The 404 handler returns a JSON error if no route matches.
- `app.listen(3000, ...)` starts the server on port 3000.
- In `routes/v1/index.js`, the GET /users endpoint responds with a v1 payload.
- In `routes/v2/index.js`, the GET /users endpoint responds with a v2 payload.

### 1.2 Accept-header (Content Negotiation) Versioning

In content-negotiation versioning, the server examines the Accept header to decide which version to serve, then rewrites the request path to route to the corresponding versioned router.

Code: Accept-header-based versioning with URL rewriting
```js
// server.js (Accept-header-based versioning)
const express = require('express');
const app = express();

const v1Router = require('./routes/v1');
const v2Router = require('./routes/v2');

// Version negotiation middleware: rewrites URL to include version
app.use((req, res, next) => {
  const accept = req.headers.accept || '';
  let version = 'v1'; // default
  if (accept.includes('application/vnd.myapi.v2+json')) version = 'v2';
  else if (accept.includes('application/vnd.myapi.v1+json')) version = 'v1';
  // Rewrite incoming URL to route through the versioned path
  req.url = req.url.replace(/^\/api/, `/api/${version}`);
  next();
});

// Mount versioned routers
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(3000, () => console.log('API listening on port 3000'));
```

### 1.2 Line-by-line explanation
- The middleware reads the Accept header to decide the target version, defaulting to v1 if no match is found.
- It rewrites the path from `/api/...` to `/api/v{n}/...` so the request can be routed to the corresponding versioned router.
- The app then mounts the v1 and v2 routers at their respective prefixes.
- The 404 handler remains in place for unknown routes.

### 1.3 Custom header versioning (X-API-Version)

Custom header versioning lets clients signal a version using a header rather than the URL or Accept header. This is useful for platforms that can’t easily control the request path.

Code: Custom header-based versioning
```js
// server.js (custom header X-API-Version)
const express = require('express');
const app = express();

const v1Router = require('./routes/v1');
const v2Router = require('./routes/v2');

// Detect version from a custom header and rewrite the path
app.use((req, res, next) => {
  const ver = req.header('X-API-Version') || 'v1';
  req.url = req.url.replace(/^\/api/, `/api/${ver}`);
  next();
});

// Mount routers
app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);

app.listen(3000, () => console.log('API listening on port 3000'));
```

### 1.3 Line-by-line explanation
- The middleware reads the custom header `X-API-Version`; if absent, it defaults to v1.
- It rewrites the path to point to either `/api/v1/...` or `/api/v2/...`, enabling a single routing strategy to cover multiple clients.
- The routers for v1 and v2 are mounted as before.
- The server starts on port 3000.

## 2. Deprecation Strategies and Notices

Deprecation is about communicating lifecycle and sunset plans to clients, so they can migrate before a version is removed. This section shows a simple policy data structure and a middleware to surface notices and enforce removals.

### 2.1 Deprecation policy data structure

Code: In-memory deprecation policy (versions -> policy)
```js
// deprecations.js
// Simple in-memory deprecation policy (versions -> policy)
module.exports = {
  v1: {
    deprecateDate: '2025-01-01',
    removeDate: '2026-01-01',
    upgradeTo: 'v2'
  }
};
```

### 2.1 Line-by-line explanation
- Exports a plain object mapping version identifiers to a policy object.
- `deprecateDate`: when to start warning clients about deprecation.
- `removeDate`: when the version will be removed (hard sunset).
- `upgradeTo`: recommended version for clients to migrate to.

### 2.2 Deprecation middleware integration

Code: Middleware that emits deprecation notices and enforces removal
```js
// deprecation-middleware.js
const policies = require('./deprecations');

// Middleware to emit deprecation notices and hard removal
module.exports = function deprecationMiddleware(req, res, next) {
  // Detect version from path like /api/v1/...
  const m = req.url.match(/^\/api\/(v\d+)\//);
  if (m) {
    const ver = m[1];
    const policy = policies[ver];
    if (policy) {
      const now = new Date();
      const deprecateDate = policy.deprecateDate ? new Date(policy.deprecateDate) : null;
      const removeDate = policy.removeDate ? new Date(policy.removeDate) : null;

      // Soft deprecation: add a warning header if past deprecate date
      if (deprecateDate && now >= deprecateDate) {
        res.setHeader('Warning', `299 - API version ${ver} is deprecated; upgrade to ${policy.upgradeTo} before ${policy.removeDate}.`);
        res.setHeader('Deprecation', 'https://example.com/docs/deprecations');
        res.setHeader('Link', `<https://example.com/docs/deprecations>; rel="deprecation"`);
      }

      // Hard removal: if past remove date, block the request
      if (removeDate && now >= removeDate) {
        res.status(410).json({ error: `API version ${ver} has been removed.` });
        return;
      }
    }
  }
  next();
};
```

### 2.2 Line-by-line explanation
- Loads the deprecation policies.
- Extracts the version from the URL path (e.g., /api/v1/...).
- If a policy exists for the version, computes current time against deprecateDate and removeDate.
- If past deprecateDate, adds a 299 Warning header and a Deprecation link to guide clients.
- If past removeDate, returns HTTP 410 Gone with a message indicating removal.
- Calls next() to continue request processing when not blocked.

### 2.3 Wire-up example (integrated usage)

Code: Integrating deprecation middleware with version negotiation
```js
// server-with-deprecation.js
const express = require('express');
const app = express();

const v1Router = require('./routes/v1');
const v2Router = require('./routes/v2');
const deprecationMiddleware = require('./deprecation-middleware');

// Base path '/api' with version negotiation via Accept header
app.use((req, res, next) => {
  const accept = req.headers.accept || '';
  let version = 'v1';
  if (accept.includes('application/vnd.myapi.v2+json')) version = 'v2';
  else if (accept.includes('application/vnd.myapi.v1+json')) version = 'v1';
  req.url = req.url.replace(/^\/api/, `/api/${version}`);
  next();
});

app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
// Attach deprecation middleware early in the chain
app.use(deprecationMiddleware);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.listen(3000, () => console.log('API listening on port 3000'));
```

### 2.3 Line-by-line explanation
- Imports v1/v2 routers and the deprecation middleware.
- The version negotiation middleware rewrites the path to include the chosen version (v1 or v2) based on the Accept header.
- The v1 and v2 routers are mounted under their respective prefixes.
- The deprecation middleware is registered in the chain so warnings/removals apply to all subsequent routes.
- 404 handler for unmatched routes and server startup message.

## X. Common Beginner Mistakes

Below are real pitfalls with bad vs good examples. Each pair contrasts a common mistake with a better approach.

### Pitfall 1: Mixing version logic into business controllers

Bad
```js
// bad: version branching inside a single controller
app.get('/api/users', (req, res) => {
  if (req.headers['x-api-version'] === 'v1') {
    res.json({ version: 'v1', users: [] });
  } else {
    res.json({ version: 'v2', users: [] });
  }
});
```

Good
```js
// good: separate routers for each version, same surface
// routes/v1/users.js
router.get('/users', (req, res) => res.json({ version: 'v1', users: [] }));

// routes/v2/users.js
router.get('/users', (req, res) => res.json({ version: 'v2', users: [] }));
```

### Pitfall 2: Forgetting to communicate deprecation or using silent removals

Bad
```js
// bad: remove v1 endpoints without notices
app.use('/api/v1', v1Router);
```

Good
```js
// good: publish deprecation notices and schedule sunset
// (See deprecation policy example in section 2)
```

### Pitfall 3: Breaking changes without a deprecation window

Bad
```js
// bad: drop v1 routes immediately when v2 lands
app.use('/api/v2', v2Router);
```

Good
```js
// good: maintain v1 in parallel and sunset after a defined window
```

### Pitfall 4: Not testing versioned behavior or deprecation paths

Bad
```js
// bad: only tests for v2, ignore v1 and deprecation paths
```

Good
```js
// good: tests cover v1 and v2, plus deprecation warnings and removal
```

## Y. Why This Matters In Real Systems

- Stability for clients: Versioning prevents breaking changes for downstream users, including mobile apps, partner integrations, and internal microservices.
- Clear sunset plans: A formal deprecation process reduces support burden and helps coordinate migrations across teams.
- Discoverability and governance: Versioned routes, header-based negotiation, and deprecation notices give a predictable lifecycle and easier auditing.
- Observability: Instrument versions by traffic share, error rates, and deprecation warnings to drive migration planning.
- Compatibility with contracts: Use API contracts and consumer-driven contracts (CDC) to enforce compatibility guarantees across versions.
- Security considerations: Deprecation should consider vulnerability exposure; if a version has known issues, sunset planning should be timely and clear.

In production, teams typically maintain multiple active versions for a fixed window (e.g., v1 and v2 for 6–12 months), implement automated sunset workflows, and integrate deprecation signals into monitoring dashboards and API docs.

## Z. Study Questions

1. List three common API versioning strategies and one trade-off for each.  
2. How would you surface deprecation notices to clients in HTTP responses? Mention at least two mechanism (headers, body, etc.).  
3. Describe how you can implement version routing using Accept headers. What are the potential pitfalls?  
4. What is the difference between deprecation and removal in the API lifecycle? Why is a deprecation window important?  
5. Propose a small plan to migrate a live client from v1 to v2, including validation, communication, and fallback.

## Exercise

Build a small Express API with a real versioning and deprecation flow. Complete the following steps and deliverable code.

Parts:
1) Create a minimal Express app with path-based versioning:
- Implement two routers: v1 and v2, each exposing GET /users returning a simple list (e.g., [{id:1, name:'Alice'}]).
- Mount v1 at /api/v1 and v2 at /api/v2.

2) Add Accept-header versioning as an alternate path:
- Implement a middleware that rewrites /api/requests to /api/v{n} based on Accept header values application/vnd.myapi.v1+json or application/vnd.myapi.v2+json.
- Ensure both v1 and v2 routes respond identically to /api/v1/users and /api/v2/users.

3) Implement a deprecation policy for v1:
- Create a deprecations.js policy with deprecateDate (soft warning) and removeDate (hard sunset) = 6 months after deprecation date.
- Create a deprecation-middleware.js that:
  - Emits a Warning header and Link: rel="deprecation" to guide migration when past deprecateDate.
  - Returns HTTP 410 Gone if past removeDate.
- Wire the middleware into the server so deprecation warnings appear on v1 requests and v1 is sunset when the removeDate arrives.

4) Documentation and tests:
- Write a short README section describing how to run the server, how to test:
  - Path-based versioning: curl http://localhost:3000/api/v1/users and /api/v2/users
  - Accept-header versioning: curl -H "Accept: application/vnd.myapi.v2+json" http://localhost:3000/api/users
  - Deprecation behavior for v1 after deprecateDate.

5) Optional: Add simple unit tests (pseudo or actual) to verify:
- /api/v1/users returns v1 payload
- /api/v2/users returns v2 payload
- Accept-header negotiation routes to v2 when Accept requests v2
- After deprecateDate, v1 responses include Warning header and/or Deprecation link
- After removeDate, v1 requests return 410 Gone

Deliverable:
- A single repository containing:
  - server.js (path-based and Accept-based wiring)
  - routes/v1/index.js and routes/v2/index.js
  - deprecations.js and deprecation-middleware.js
  - README with run/test instructions

Notes:
- The code snippets above are intentionally compact for clarity. In production, consider factorization, robust error handling, and tests. Use environment-driven date controls (instead of fixed dates) for predictable tests, and consider external configuration for deprecation policies (JSON/DB) rather than in-memory objects.
- For large-scale services, you may also explore gateway-level versioning (e.g., API gateway or reverse proxy) to centralize traffic routing, while keeping microservice-specific versioning for deeper business logic.