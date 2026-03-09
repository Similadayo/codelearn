# Track: Backend Engineering — Phase 4: Building Web Servers

Middleware is the connective tissue of a web server. In Node.js, middleware lets you intercept requests, transform data, enforce security policies, and wire together cross-cutting concerns like logging and CORS. Mastery of middleware and the request pipeline translates to maintainable code, better observability, and safer, scalable services in production.

## 1. Middleware Fundamentals and Request Pipeline

```javascript
1 const express = require('express');
2 const app = express();
3
4 // Simple middleware that runs for every request
5 function logTime(req, res, next) {
6   console.log(`Incoming ${req.method} ${req.url} at ${new Date().toISOString()}`);
7   next();
8 }
9
10 app.use(logTime);
11
12 app.get('/', (req, res) => res.send('Hello World'));
13
14 app.listen(3000, () => console.log('Server listening on port 3000'));
```

### Line-by-line explanation breaking down each line

- Line 1: Import the Express library to create a web server.
- Line 2: Create an Express application instance.
- Lines 4-8: Define a simple middleware function logTime that logs the request method and URL, then calls next() to pass control to the next middleware/route.
- Line 10: Register the middleware with the app so it runs for every incoming request.
- Line 12: Define a route for GET requests to the root path.
- Line 14: Start the server and log a message when it’s ready.

## 2. Logging Middleware

```javascript
1 const express = require('express');
2 const crypto = require('crypto');
3 const app = express();
4
5 function requestLogger() {
6   return function (req, res, next) {
7     const id = crypto.randomBytes(8).toString('hex');
8     req.id = id;
9     const start = process.hrtime();
10    res.on('finish', () => {
11      const diff = process.hrtime(start);
12      const ms = (diff[0] * 1e3) + (diff[1] / 1e6);
13      console.log(`[${new Date().toISOString()}] [req:${id}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(3)}ms`);
14    });
15    next();
16  };
17 }
18
19 app.use(requestLogger());
20
21 app.get('/', (req, res) => res.send('Hello Logging'));
22
23 app.listen(3000, () => console.log('Server listening on port 3000'));
```

### Line-by-line explanation breaking down each line

- Lines 1-3: Import Express and crypto; create app instance.
- Lines 5-17: Define a logging middleware factory requestLogger that returns the actual middleware.
- Line 7: Generate a per-request unique id (req.id) to correlate logs across middleware and handlers.
- Line 9: Record the start time with high-resolution timing.
- Lines 10-14: Attach a listener to the response's finish event to compute latency and emit a structured log line including timestamp, request id, method, URL, status, and latency.
- Line 15: Call next() to continue the pipeline.
- Line 19: Register the logging middleware.
- Line 21: Define a simple route.
- Line 23: Start the server.

## 3. CORS Middleware

```javascript
1 function corsMiddleware(options = {}) {
2   const origin = options.origin || '*';
3   const methods = (options.methods || 'GET,HEAD,POST,PUT,PATCH,DELETE').toString();
4   const headers = (options.allowedHeaders || 'Content-Type,Authorization').toString();
5   return function (req, res, next) {
6     const reqOrigin = req.headers.origin;
7     const allowedOrigin = origin === '*' ? '*' : origin;
8     const isAllowed = origin === '*' || (Array.isArray(origin) && origin.includes(reqOrigin)) || reqOrigin === origin;
9     if (isAllowed) {
10      res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
11      res.setHeader('Access-Control-Allow-Methods', methods);
12      res.setHeader('Access-Control-Allow-Headers', headers);
13      if (options.credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
14      if (req.method === 'OPTIONS') {
15        res.status(204).end();
16        return;
17      }
18      next();
19    } else {
20      res.status(403).send('CORS origin denied');
21    }
22  };
23 }
24
25 // Example usage with Express
26 const express = require('express');
27 const app = express();
28 app.use(corsMiddleware({ origin: ['https://example.com'], credentials: true }));
29 app.get('/api', (req, res) => res.json({ ok: true }));
30 app.listen(3000, () => console.log('Server listening on port 3000'));
```

### Line-by-line explanation breaking down each line

- Lines 1-3: Define a configurable CORS middleware factory that accepts options.
- Line 2: Read origin from options (default '*').
- Line 3: Read methods from options (default common HTTP methods).
- Line 4: Read allowed headers from options (default Content-Type and Authorization).
- Lines 5-23: Return the actual middleware function.
- Line 6: Get the Origin header from the request.
- Line 8: Compute whether the incoming origin is allowed (wildcard, explicit string, or array of origins).
- Lines 10-13: If allowed, set CORS response headers accordingly; optionally enable credentials.
- Lines 14-16: Respond to preflight OPTIONS requests with 204 and halt further handling.
- Lines 18-21: If origin is not allowed, respond with 403.
- Lines 26-30: Example usage: create an Express app and apply the CORS middleware before routes.
- Line 30: Start the server.

## 4. Putting It All Together: End-to-End Request Pipeline with Logging and CORS

```javascript
1 const express = require('express');
2 const crypto = require('crypto');
3 const app = express();
4
5 // Logging middleware
6 function requestLogger() {
7   return function (req, res, next) {
8     const id = crypto.randomBytes(8).toString('hex');
9     req.id = id;
10    const start = process.hrtime();
11    res.on('finish', () => {
12      const diff = process.hrtime(start);
13      const ms = (diff[0] * 1e3) + (diff[1] / 1e6);
14      console.log(`[${new Date().toISOString()}] [req:${id}] ${req.method} ${req.originalUrl} ${res.statusCode} ${ms.toFixed(3)}ms`);
15    });
16    next();
17  };
18 }
19
20 // CORS middleware
21 function corsMiddleware(options = {}) {
22   const origin = options.origin || '*';
23   const methods = (options.methods || 'GET,HEAD,POST,PUT,PATCH,DELETE').toString();
24   const headers = (options.allowedHeaders || 'Content-Type,Authorization').toString();
25   return function (req, res, next) {
26     const reqOrigin = req.headers.origin;
27     const allowedOrigin = origin === '*' ? '*' : origin;
28     const isAllowed = origin === '*' || (Array.isArray(origin) && origin.includes(reqOrigin)) || reqOrigin === origin;
29     if (isAllowed) {
30       res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
31       res.setHeader('Access-Control-Allow-Methods', methods);
32       res.setHeader('Access-Control-Allow-Headers', headers);
33       if (options.credentials) res.setHeader('Access-Control-Allow-Credentials', 'true');
34       if (req.method === 'OPTIONS') {
35         res.status(204).end();
36         return;
37       }
38       next();
39     } else {
40       res.status(403).send('CORS origin denied');
41     }
42   };
43 }
44
45 app.use(requestLogger());
46 app.use(corsMiddleware({ origin: ['https://example.com'], credentials: true }));
47 app.use(express.json());
48
49 app.get('/api/data', (req, res) => {
50   res.json({ ok: true, id: req.id });
51 });
52
53 app.listen(3000, () => console.log('Server listening on port 3000'));
```

### Line-by-line explanation breaking down each line

- Lines 1-3: Import dependencies and create the app.
- Lines 5-18: Define the requestLogger as in Section 2 to attach a per-request id and log latency after response finishes.
- Lines 20-43: Define the corsMiddleware as in Section 3 to allow only configured origins and handle preflight OPTIONS correctly.
- Lines 45-47: Register the middlewares in the correct order: logging first, then CORS, then body parsing (express.json).
- Lines 49-51: Define a route that demonstrates access to req.id and returns a simple JSON payload.
- Line 53: Start the server.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Mistake 1: Not handling preflight OPTIONS in CORS middleware

**Bad:**
```javascript
// Bad: CORS middleware that ignores OPTIONS
function corsBad(req, res, next) {
  if (req.method === 'GET') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  next();
}
```

**Good:**
```javascript
// Good: Proper preflight handling
function corsGood(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.status(204).end();
    return;
  }
  next();
}
```

### Mistake 2: Logging sensitive data in production logs

**Bad:**
```javascript
function logReq(req, res, next) {
  console.log('REQ BODY:', req.body);
  next();
}
```

**Good:**
```javascript
function logReqSafe(req, res, next) {
  // Redact sensitive fields from the log
  const safeBody = { ...req.body };
  if (safeBody.password) safeBody.password = 'REDACTED';
  console.log(`METHOD=${req.method} URL=${req.originalUrl} BODY=${JSON.stringify(safeBody)}`);
  next();
}
```

### Mistake 3: Middleware forgets to call next(), causing hangs

**Bad:**
```javascript
function m1(req, res, next) {
  console.log('hi');
  // forgot next();
}
```

**Good:**
```javascript
function m2(req, res, next) {
  console.log('hi');
  next();
}
```

### Mistake 4: Logging every request with high verbosity in production

**Bad:**
```javascript
function verboseLogger(req, res, next) {
  console.log(`DEBUG: ${req.method} ${req.originalUrl} ${req.headers['authorization'] || ''}`);
  next();
}
```

**Good:**
```javascript
function structuredLogger(req, res, next) {
  // Use a proper logger with levels (pseudo-example)
  const log = {
    ts: new Date().toISOString(),
    level: 'info',
    method: req.method,
    path: req.originalUrl,
  };
  // In production, route to a centralized log store with levels
  console.log(JSON.stringify(log));
  next();
}
```

## Y. Why This Matters In Real Systems

- Observability and troubleshootability: Consistent, structured logs with per-request IDs let you trace a user action across services, identify latency hotspots, and diagnose failures quickly.
- Security and privacy: Logging should redact sensitive data (passwords, tokens) and avoid leaking PII or secrets. CORS misconfigurations can expose internal services to unwanted origins and increase risk of data leakage.
- Performance and scalability: Middleware chains add overhead. Keep middleware lightweight, and consider asynchronous tasks (e.g., non-blocking IO, external logging) outside the critical path.
- Reliability and correctness: Correct ordering matters. Logging, CORS, authentication, and body-parsing typically must run in a deliberate sequence to ensure preflight checks, security, and data formats are enforced before processing routes.
- Operational discipline: Use correlation IDs, structured logs, log levels, and centralized log aggregation. Implement health checks, error handling middleware, and metrics.

## Z. Study Questions — 5 recall questions

1) What is the purpose of middleware in a Node.js/Express server, and how does the request pipeline determine the order requests are processed?
2) How can you generate and propagate a per-request correlation ID, and why is it helpful for logs across multiple middleware components?
3) Explain how CORS works and what a preflight OPTIONS request is used for.
4) Why is it important to redact sensitive data in logs, and what are common fields you should avoid logging?
5) What is the difference between res.on('finish') and res.on('close') in the context of logging?

## Exercise — practical multi-part coding challenge

Part A — Scaffold and implement core middleware
- Create a single file server.js (or set up an Express project) that implements:
  - A requestLogger middleware that attaches a per-request id and logs latency after the response is sent.
  - A corsMiddleware that accepts an origin whitelist (array) and enables credentials. It should properly handle preflight OPTIONS requests.
  - A simple JSON body parser route using express.json().

Part B — End-to-end pipeline
- Wire the middlewares in a sensible order: logging, CORS, body parsing, then routes.
- Add a route GET /api/status that returns { ok: true, id: <per-request-id> }.
- Add a route POST /api/echo that echoes back received JSON, but with sensitive fields redacted in the response only for logging (not the response body).

Part C — Test and observe
- Run the server and test with curl:
  - A preflight OPTIONS request to /api/status with Origin header to verify CORS headers and 204 response.
  - A GET request to /api/status and verify the log contains the request id and latency.
  - A POST request to /api/echo with a sensitive field (e.g., password) and verify the response matches input and logs redact sensitive data.
Part D — Optional extension
- Add an environment-based log level (info/debug) and switch the requestLogger to emit more structured JSON logs when LOG_LEVEL=debug.

Starter snippet for Part A (copy this into server.js and fill in the rest as you progress):

```javascript
// Starter
const express = require('express');
const app = express();

// TODO: implement requestLogger, corsMiddleware, and routes
```

Hints
- Keep middleware small and focused; if a piece of logic grows, consider extracting it into a separate module.
- Use res.on('finish') to measure accurate response times.
- For production, consider using a dedicated logging library (e.g., pino, winston) and a log aggregation system.

This lesson covers the core ideas behind building a robust backend: understanding the request pipeline, implementing useful middleware like logging and CORS, and applying best practices to make real systems observable, secure, and maintainable.