# Backend Engineering — Phase 4: Building Web Servers — Your First Web Server with a Framework (Node.js)

Welcome to Phase 4, where we translate the core concepts of HTTP, routing, and request handling into a working web server using a framework. In professional backend engineering, a framework like Express.js accelerates development, enforces conventions, and provides a robust ecosystem for middleware, routing, and error handling. By building your first Express-based server, you’ll learn how to design APIs, think in terms of request/response lifecycles, and prepare your app for real-world load, observability, and maintenance.

## 1.  Project Setup and Your First Express App

This section shows how to scaffold a Node.js project and boot a minimal Express server that responds to a basic route. You’ll learn how to install dependencies, wire up a route, and start listening on a port.

```json
// package.json (starter)
{
  "name": "first-express-app",
  "version": "1.0.0",
  "description": "Your first Express web server",
  "type": "commonjs",
  "dependencies": {
    "express": "^4.18.2"
  },
  "scripts": {
    "start": "node src/index.js"
  }
}
```

```js
// src/index.js
const express = require('express');
const app = express();

// Basic route
app.get('/', (req, res) => {
  res.send('Hello from your first Express server!');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
```

### Line-by-line explanation

- package.json
  - "name", "version", and "description" describe the project metadata.
  - "type": "commonjs" ensures require() works in .js files (instead of ESM imports).
  - "express" dependency installs the Express framework.
  - "scripts.start" defines how to run the app with npm start.
- src/index.js
  - const express = require('express'); — imports the Express module.
  - const app = express(); — creates an Express application instance.
  - app.get('/', ...); — defines a route handler for GET requests on the root path.
  - res.send('Hello from your first Express server!'); — sends a plain text response to the client.
  - const PORT = process.env.PORT || 3000; — uses an environment variable for the port or falls back to 3000.
  - app.listen(PORT, () => { ... }); — starts the HTTP server and logs the listening port.

## 2.  Routing Essentials: Paths, Params, and Queries

Web servers route different URLs to handlers. This section demonstrates static routes, dynamic route parameters, and query string usage, all common patterns in production APIs.

```js
// src/index.js (enhanced for routing)
const express = require('express');
const app = express();
app.use(express.json());

// 1) Static route
app.get('/', (req, res) => res.send('Hello from Express route'));

// 2) Route parameter
app.get('/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ id, name: `User ${id}` });
});

// 3) Query string
app.get('/search', (req, res) => {
  const { q, page = 1 } = req.query;
  res.json({ query: q ?? '', page: Number(page) });
});

// 4) Health check
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: Date.now() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
```

### Line-by-line explanation

- app.use(express.json()); — enables parsing of JSON request bodies for routes that accept JSON payloads.
- app.get('/', ...) — static route returning a simple greeting.
- app.get('/users/:id', ...) — route with a dynamic parameter; req.params.id captures the part of the path that matches :id.
- res.json({ id, name: `User ${id}` }); — responds with a JSON object containing the route parameter.
- app.get('/search', ...) — demonstrates reading query strings from the URL (e.g., /search?q=express&page=2).
- const { q, page = 1 } = req.query; — destructures query parameters with a default for page.
- res.json({ query: q ?? '', page: Number(page) }); — returns a structured JSON response; uses nullish coalescing to handle missing q.
- app.get('/health', ...) — a simple health check endpoint used by monitoring systems.
- res.json({ status: 'ok', timestamp: Date.now() }); — health payload suitable for readiness and liveness probes.
- The listening logic remains the same as in Section 1.

## 3.  Middleware, JSON Bodies, and Response Helpers

Middleware is the glue that ties routing, authentication, validation, and observability together. This section shows how to wire a JSON body parser, implement a simple request logger, and create a small authorization gate as an example of middleware composition.

```js
// src/index.js (with middleware)
const express = require('express');
const app = express();

app.use(express.json());

// Simple request logger middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl} - ${new Date().toISOString()}`);
  next();
});

// Minimal auth-like middleware
const requireAuth = (req, res, next) => {
  const token = req.headers['authorization'];
  if (token === 'secret-token') {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

// Public route
app.get('/public', (req, res) => res.json({ msg: 'Public data' }));

// Protected route
app.get('/private', requireAuth, (req, res) => res.json({ secret: '42' }));

// POST echo route (reads JSON body)
app.post('/echo', (req, res) => {
  const body = req.body;
  res.json({ received: body });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
```

### Line-by-line explanation

- app.use(express.json()); — sets up the JSON body parser so req.body contains parsed data for JSON payloads.
- The first middleware logs incoming requests with method, URL, and timestamp to aid observability.
- requireAuth — a simple middleware function demonstrating authentication gate logic; it checks the Authorization header.
- If the token matches, next() is called to proceed to the protected route; otherwise, a 401 response is sent.
- /public — a route that is accessible without authentication.
- /private — protected route that requires authorization via the requireAuth middleware.
- /echo — demonstrates reading and returning the JSON body sent by the client in a POST request.

## 4.  Error Handling and Health Checks

Production-grade servers need robust error handling, 404 responses for unknown routes, and health checks for orchestration systems (e.g., Kubernetes). This section adds a 404 handler and a global error handler, along with a health endpoint.

```js
// src/index.js (error handling)
const express = require('express');
const app = express();

app.use(express.json());

// ... (existing routes and middleware)

// 404 handler - for any unknown route
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  const status = err?.status || 500;
  res.status(status).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
```

### Line-by-line explanation

- 404 handler: app.use((req, res, next) => { ... }) catches requests that didn’t match any route; responds with a 404 and a JSON payload.
- Global error handler: app.use((err, req, res, next) => { ... }) catches any errors passed via next(err); logs the error and returns a 500-like response.
- Logging inside the error handler helps with post-mortem debugging and observability.
- The health endpoint from Section 2 remains the same and can be used by orchestration tools to check liveness/readiness.

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side.

| Bad | Good |
| --- | --- |
| <pre><code>// Blocking the event loop
app.get('/compute', (req, res) => {
  const start = Date.now();
  while (Date.now() - start < 5000) { /* busy wait */ }
  res.send('done');
});</code></pre> | <pre><code>// Non-blocking, asynchronous delay
app.get('/compute', async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 5000));
  res.send('done');
});</code></pre> |
| <pre><code>// Not handling async errors
app.get('/data', async (req, res) => {
  const data = await fetchData(); // may throw
  res.json(data);
});</code></pre> | <pre><code>// Proper error handling with try/catch
app.get('/data', async (req, res, next) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});</code></pre> |
| <pre><code>// Unsafely concatenating user input into SQL-like string
app.get('/user', (req, res) => {
  const id = req.query.id;
  const sql = `SELECT * FROM users WHERE id = ${id}`;
  pool.query(sql, (err, result) => res.json(result));
});</code></pre> | <pre><code>// Input validation and parameterized queries (conceptual)
app.get('/user', (req, res) => {
  const id = parseInt(req.query.id, 10);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  pool.query('SELECT * FROM users WHERE id = ?',[id], (err, result) => res.json(result));
});</code></pre> |
| <pre><code>// Logging sensitive data
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // logs password in plain text
  console.log(`User ${username} attempting login with password ${password}`);
  // authentication logic...
});</code></pre> | <pre><code>// Safe logging practice
app.post('/login', (req, res) => {
  const { username } = req.body;
  console.log(`User ${username} attempting login`);
  // authentication logic...
});</code></pre> |

- Pitfall 1: Blocking the event loop by performing long synchronous work in a request handler. The fix is to use non-blocking async patterns or offload heavy work to workers.
- Pitfall 2: Not handling errors in async routes. Use try/catch or a centralized error-handling pattern.
- Pitfall 3: Not validating or sanitizing inputs, leading to security and stability risks. Use validation and parameterized queries where applicable.
- Pitfall 4: Logging sensitive data (like passwords) or leaking secrets. Use safe logging practices and avoid exposing sensitive fields.
- You can add more pitfalls as you gain experience, but these four cover common, high-impact mistakes you’ll encounter early.

## Y. Why This Matters In Real Systems

In professional systems, a web server is the gateway to your business logic and data. Why this matters:

- Reliability: Proper routing, error handling, and health checks prevent cascading failures and keep services resilient under load.
- Observability: Logging, timing, and error reporting are essential for diagnosing performance bottlenecks and bugs in production.
- Security: Proper input validation, authentication gates, and careful handling of errors reduce exposure to exploits.
- Maintainability: A clean, modular structure with middleware composition makes code easier to test, extend, and deploy.
- Scalability: Stateless route handlers and non-blocking I/O enable better horizontal scaling on multiple instances or in a containerized environment.

Real systems use these patterns in concert with deployment tooling (Docker/Kubernetes), monitoring (Prometheus, Grafana), and robust CI/CD pipelines. The simple Express server you built here is a launching pad for more advanced architectures, such as microservices, API gateways, and service meshes.

## Z. Study Questions

1) What is the purpose of app.use(express.json()) in an Express app?
2) How do you access a dynamic path segment in Express, and what object contains it?
3) What’s the difference between a 404 handler and a global error handler in Express?
4) Why should you avoid synchronous, long-running work inside a request handler?
5) How would you secure a route that should only be accessible with a token?

## Exercise

Goal: Build a small Express API that demonstrates the concepts from this lesson, including routing, middleware, JSON parsing, and error handling. Use environment variable PORT to configure your server.

Part A — Project Skeleton
- Create a new directory for your project.
- Initialize a Node.js project and install Express.
- Create a minimal server file at src/index.js that starts an Express app and listens on process.env.PORT or 3000.

Part B — Implement Endpoints
- GET / should return a friendly welcome message.
- GET /health should return { status: "ok", time: <ISO timestamp> }.
- GET /users/:id should return a JSON object with the id and a generated name.
- POST /echo should accept a JSON body and echo it back as { received: <body> }.

Part C — Middleware and Security
- Add a simple request logging middleware (method, URL, timestamp).
- Add a requireAuth middleware that reads an Authorization header and only allows the route to proceed if the token equals "secret-token".
- Add a protected route GET /admin that uses requireAuth and returns { admin: true }.

Part D — Error Handling and Validation
- Add a 404 handler for unknown routes.
- Add a global error handler to return { error: "Internal Server Error" } for unhandled errors.
- Validate that POST /echo receives a JSON body; if not, return 400 with { error: "Bad Request" }.

Part E — Run and Test
- Run npm start and test with curl or a REST client:
  - curl http://localhost:PORT/
  - curl http://localhost:PORT/health
  - curl http://localhost:PORT/users/123
  - curl -X POST -H "Content-Type: application/json" -d '{"foo":"bar"}' http://localhost:PORT/echo
  - curl -H "Authorization: secret-token" http://localhost:PORT/admin

Deliverables: Provide the final src/index.js file and a sample package.json with a start script. Include brief notes on how you would extend this into a production-grade service (e.g., environment-based configuration, structured logging, error schemas, and test strategy), referencing concepts from this lesson.