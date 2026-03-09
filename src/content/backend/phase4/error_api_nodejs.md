# Error Handling in APIs — Consistent Responses (Backend Engineering, Phase 4: Building Web Servers)

In modern backend systems, clients depend on predictable, machine-friendly error responses to drive UI behavior, retry logic, and automated tooling. Building APIs with a consistent error model reduces ambiguity, improves security by avoiding accidental data leakage, and simplifies observability across services. This lesson focuses on Node.js/Express patterns to produce uniform responses for both success and failure, including validation errors, not-found errors, and unexpected server failures.

## 1. Designing a Consistent API Error Model

A consistent API response model separates the payload from error details and uses stable codes/messages that clients can rely on. This section defines a reusable ApiError class and helpers to shape both success and error responses.

```js
// ApiError class and API response helpers
class ApiError extends Error {
  constructor(statusCode, message, code = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Helpers to shape API responses
function apiSuccess(data) {
  return { success: true, data };
}
function apiError(err) {
  // If err is ApiError, use its properties; otherwise convert to internal error
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An error occurred';
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const details = err.details ?? null;
  return {
    success: false,
    error: { code, message, details },
    data: null,
  };
}
```

### Line-by-line explanation
- Line 1-6: Define ApiError as a specialized Error with a statusCode, an optional code, and optional details. This lets you encode rich error metadata used by clients and observability tools.
- Line 9-11: apiSuccess creates a uniform envelope for successful responses: { success: true, data }.
- Line 12-21: apiError builds a consistent error envelope. It extracts code, message, statusCode, and details from the given error (falling back to sensible defaults). The envelope is { success: false, error: { code, message, details }, data: null }.
- Why this matters: a single, predictable return shape makes client handling, retries, and logging straightforward across all endpoints.

## 2. Centralizing Error Handling in Express

With a solid error model, we wire up a global error handler and demonstrate a few representative routes that leverage ApiError for control flow. This section also shows a small async wrapper to catch rejected promises.

```js
const express = require('express');
const app = express();
app.use(express.json());

// Simple in-memory store
const users = new Map([
  ['1', { id: '1', name: 'Alice' }],
  ['2', { id: '2', name: 'Bob' }],
]);

// Simple request-id middleware
const { v4: uuidv4 } = require('uuid');
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.set('X-Request-Id', req.requestId);
  next();
});

// ApiError class (redeclared for example completeness)
class ApiError extends Error {
  constructor(statusCode, message, code = null, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

// Async wrapper to auto-catch rejections
const wrapAsync = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Routes
app.get('/users/:id', wrapAsync(async (req, res) => {
  const user = users.get(req.params.id);
  if (!user) {
    throw new ApiError(404, 'User not found', 'NOT_FOUND', { id: req.params.id });
  }
  res.json(apiSuccess(user));
}));

// Validation example (POST)
app.post('/users', wrapAsync(async (req, res) => {
  const { name } = req.body || {};
  if (!name) {
    throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', { field: 'name' });
  }
  const id = String(Date.now());
  const user = { id, name };
  users.set(id, user);
  res.status(201).json(apiSuccess(user));
}));

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json(apiError(err));
  } else {
    console.error(`Unhandled error [${req.requestId}]:`, err);
    res.status(500).json(apiError(new ApiError(500, 'Internal Server Error', 'INTERNAL_SERVER_ERROR')));
  }
});

// Start
app.listen(3000, () => console.log('Server listening on http://localhost:3000'));
```

### Line-by-line explanation
- Lines 1-3: Import Express and initialize an app instance.
- Line 4: Enable JSON body parsing for API requests.
- Lines 7-13: Create a tiny in-memory user store for demonstration.
- Lines 16-22: Add a request-id middleware that assigns or propagates a unique ID per request and exposes it via X-Request-Id header. This helps trace logs and errors.
- Lines 25-33: Define a GET /users/:id route. If the user is missing, throw a structured ApiError with code NOT_FOUND and a details payload.
- Lines 36-47: Define a POST /users route with a simple validation (name required). On success, return the created user using apiSuccess envelope.
- Lines 50-58: Centralized error handling. If the error is an ApiError, respond with the standardized envelope; otherwise log and return a generic 500 envelope without leaking internal details.
- Lines 61-63: Start the server on port 3000.

## 3. Validating Input and Returning Consistent Errors

Input validation is a critical source of consistent error shapes. This section shows how to validate request payloads with Joi and return a structured validation error when the input is invalid.

```js
const Joi = require('joi');

// Define a schema for user creation
const createUserSchema = Joi.object({
  name: Joi.string().min(2).required(),
  email: Joi.string().email().optional(),
});

const validateBody = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const details = error.details.map((d) => d.message);
    // Reuse ApiError for consistent shape
    throw new ApiError(400, 'Validation failed', 'VALIDATION_ERROR', details);
  }
  next();
};

// Apply validation to POST /users
app.post('/users', wrapAsync(validateBody(createUserSchema)), wrapAsync(async (req, res) => {
  const { name, email } = req.body;
  const id = String(Date.now());
  const user = { id, name, email };
  users.set(id, user);
  res.status(201).json(apiSuccess(user));
}));
```

### Line-by-line explanation
- Line 1: Load Joi for schema-based validation.
- Lines 4-9: Define a schema where name is a required string with a minimum length, and email is optional but must be a valid email if provided.
- Lines 11-19: create a reusable middleware validateBody(schema) that runs the schema against req.body. When validation fails, it collects error messages and throws an ApiError with code VALIDATION_ERROR and details.
- Lines 22-29: Apply the validation middleware to POST /users and implement the route using the same pattern as Section 2, returning apiSuccess on success.
- Why this helps: Joi (or any schema-based validator) ensures clients receive precise, stable error details for invalid input, and you always return a consistent envelope.

Note: If you prefer not to add Joi as a dependency, you can implement a lightweight validator that checks required fields and types and still throw ApiError with details. The key principle is consistency of error shape and metadata.

## 4. Logging and Tracing in Production

Production systems rely on logs not just for debugging, but for tracing requests across services. This section shows a minimal approach to structured logging and correlation IDs, feeding error data into logs without leaking sensitive details to clients.

```js
// Add correlation id support and structured logging
const { v4: uuidv4 } = require('uuid');

// Request ID middleware (already included earlier, but shown here explicitly)
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.set('X-Request-Id', req.requestId);
  next();
});

// Simple structured logger
function logError(req, err) {
  const payload = {
    ts: new Date().toISOString(),
    id: req.requestId,
    method: req.method,
    path: req.originalUrl,
    level: 'error',
    message: err.message,
    code: err.code || null,
  };
  console.error(JSON.stringify(payload));
}

// Updated error handler with logging
app.use((err, req, res, next) => {
  logError(req, err);
  if (err instanceof ApiError) {
    res.status(err.statusCode).json(apiError(err));
  } else {
    res.status(500).json(apiError(new ApiError(500, 'Internal Server Error', 'INTERNAL_SERVER_ERROR')));
  }
});
```

### Line-by-line explanation
- Lines 1-4: Import a UUID generator for stable request IDs and ensure a request ID is attached to each incoming request.
- Lines 7-15: logError formats a compact, structured log line including timestamp, request ID, HTTP method, path, and error metadata, and writes it as JSON to stderr. In real systems, this would route to a logger like Winston or Pino.
- Lines 18-28: A resilient error-handling middleware that logs every error and then returns a standardized envelope. ApiError instances preserve client-facing codes/messages; non-ApiError exceptions are converted into a safe 500 envelope.

Why this matters: structured, correlation-id-enabled logging makes it easy to trace a user’s journey across services, diagnose failures quickly, and correlate logs with metrics and traces in monitoring systems.

## X. Common Beginner Mistakes

- 1) Bad: Exposing stack traces or internal error details to clients.
  - Bad:
    ```js
    app.use((err, req, res, next) => {
      res.status(500).send(`<pre>${err.stack}</pre>`);
    });
    ```
  - Good:
    ```js
    app.use((err, req, res, next) => {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal Server Error' }, data: null });
    });
    ```
- 2) Bad: Inconsistent response shapes across endpoints (sometimes { data }, sometimes { error } only).
  - Bad:
    ```js
    // GET /foo
    res.json({ data: foo });
    // POST /bar error
    res.status(400).send({ error: 'Bad Request' });
    ```
  - Good: Use a single envelope format:
    ```js
    // Success
    res.json({ success: true, data: foo });
    // Error (via ApiError and envelope)
    res.status(400).json({ success: false, error: { code, message, details }, data: null });
    ```
- 3) Bad: Throwing generic Error with arbitrary status codes or no status code at all.
  - Bad:
    ```js
    throw new Error('Not found');
    // then assume 404 somewhere
    res.status(404).send('Not found');
    ```
  - Good:
    ```js
    throw new ApiError(404, 'Not found', 'NOT_FOUND', { id: '123' });
    ```
- 4) Bad: Leaking sensitive data in error details (stack traces, DB schemas).
  - Bad:
    ```js
    res.status(500).json({ error: err });
    ```
  - Good:
    ```js
    res.status(500).json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal Server Error', details: null } });
    ```
- Why these matter: predictable, secured, and observable failures enable safer onboarding, easier debugging, and robust client behavior in production.

## Y. Why This Matters In Real Systems

- Consistency enables client libraries and UI to implement uniform retry and error-handling logic.
- Security and compliance: avoid leaking stack traces or internal data; provide controlled error metadata.
- Observability: a single error envelope plus correlation IDs makes it feasible to trace issues across microservices, dashboards, and alerting.
- Developer productivity: faster onboarding when new endpoints automatically return stable shapes; easier automated testing with fixed error schemas.

Key production practices to adopt:
- Use a dedicated ApiError class with a stable set of error codes (e.g., NOT_FOUND, VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, RATE_LIMIT, INTERNAL_SERVER_ERROR).
- Always return JSON with a consistent envelope: { success, data, error } where error is { code, message, details }.
- Include a correlation ID (X-Request-Id) for tracing.
- Hide internal details from clients; log details server-side only.
- Centralize error handling in a single middleware chain to avoid duplication.

## Z. Study Questions

1) What are the benefits of a consistent error envelope in API design?
2) How does a dedicated ApiError class help with error handling in Express?
3) Why should you avoid returning stack traces to clients in production?
4) How can correlation IDs (X-Request-Id) improve debugging across services?
5) Describe how input validation errors should be surfaced to clients using a stable error code and details.

## Exercise

Build a small Express app that demonstrates a complete, end-to-end implementation of consistent API error handling and responses. Follow these parts:

Part A — Scaffold and error model
- Create an Express app with a simple in-memory store (e.g., items by id).
- Implement ApiError class and two helpers: apiSuccess and apiError (as shown in Section 1).
- Start a server on port 3000 and confirm basic routes run.

Part B — Consistent error handling
- Add a global error handler that uses the ApiError class to produce the standardized envelope for errors and the apiSuccess envelope for success.
- Implement an async route handler that uses the wrapAsync pattern to catch rejections.

Part C — End-to-end endpoints
- Implement GET /items/:id that returns an item if found or a NOT_FOUND error with a details object containing the id if not found.
- Implement POST /items that accepts { name } and returns the created item, but validates that name exists, otherwise returns a VALIDATION_ERROR with details.

Part D — Validation and logging
- Integrate a simple Joi-based validation for POST /items as shown in Section 3, or implement equivalent custom validation.
- Add a request-id and a minimal structured logging function that logs errors as JSON including the requestId, method, path, and error code/message.

Part E — Run and test
- Run the app and test with curl:
  - Successful GET: curl -s http://localhost:3000/items/1
  - Not found: curl -s -i http://localhost:3000/items/999
  - Create item: curl -s -X POST -H "Content-Type: application/json" -d '{"name":"Widget"}' http://localhost:3000/items
  - Invalid create: curl -s -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3000/items
- Verify that all responses follow the same envelope pattern:
  - Success: { "success": true, "data": { ... } }
  - Error: { "success": false, "error": { "code": "...", "message": "...", "details": ... }, "data": null }

Deliverables:
- A single Express app file (e.g., app.js) containing all parts above, or modularized but with all required behavior demonstrated.
- Clear comments explaining the error model usage, the global error handler, and how to extend it for additional error codes.

This completes a practical, production-aware approach to error handling with consistent responses in a Node.js backend API.