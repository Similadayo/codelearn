# Input Validation in Backend Engineering: Never Trust User Input (Node.js)

In modern backend systems, every request comes from an untrusted actor. Even when you design with careful assumptions, clients, third-party integrations, and downstream services may send data that is malformed, malicious, or simply unexpected. Input validation is the first line of defense: it protects data integrity, guards against security vulnerabilities like injection attacks, and reduces error surfaces in your business logic. By applying rigorous validation and sanitization early in the request handling path, you create more reliable, secure, and maintainable services that can scale in real-world production environments.

## 1. Naive Input Handling vs Validation

This section demonstrates a common pitfall: accepting user input without validation, followed by a corrected version using a validation library.

Code Block: Naive login route (no validation)
```js
const express = require('express');
const app = express();

app.use(express.json());

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Naive: no validation
  if (username && password) {
    // pretend to authenticate
    res.json({ success: true });
  } else {
    res.status(400).json({ error: 'Missing credentials' });
  }
});

module.exports = app;
```

### Line-by-line explanation
- Line 1: Import the Express framework.
- Line 2: Create an Express application instance.
- Line 4: Middleware to parse JSON bodies from incoming requests.
- Line 6: Define a POST endpoint at /login.
- Lines 7-8: Destructure username and password from the request body.
- Line 10: Simple check for presence of both fields (no type/format checks).
- Line 11: If both fields exist, respond with a success payload (authentication not implemented here).
- Line 14: If either field is missing, respond with a 400 status and an error message.
- Line 16: Export the Express app for use in a server or tests.

Code Block: Validated login route using Joi
```js
const express = require('express');
const Joi = require('joi');
const app = express();

app.use(express.json());

const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(20).required(),
  password: Joi.string().min(8).max(128).required(),
});

app.post('/login', async (req, res) => {
  try {
    const value = await loginSchema.validateAsync(req.body, { abortEarly: false });
    // proceed with validated value
    res.json({ success: true, user: value.username });
  } catch (err) {
    res.status(400).json({ error: err.details.map(d => d.message) });
  }
});

module.exports = app;
```

### Line-by-line explanation
- Line 1: Import Express.
- Line 2: Import Joi validation library.
- Line 3: Create an Express app.
- Line 5: Middleware to parse JSON bodies.
- Line 7-12: Define a Joi schema for login input, constraining username to alphanumeric, length 3-20, and password to length 8-128.
- Line 14: Define the /login route.
- Line 15-21: Attempt to validate the incoming body against the schema asynchronously; abortEarly: false collects all errors.
- Line 16: On success, respond with a positive result, including the validated username.
- Line 18-21: On failure, catch the validation errors and respond with 400, listing all error messages.
- Line 24: Export the Express app.

## 2. Validation Patterns and Techniques

This section covers schema-based validation with JSON schemas (Ajv) and schema-based validation with Joi, illustrating different approaches for the same data shape.

### 2.1 JSON Schema validation with Ajv

Code Block
```js
const Ajv = require('ajv');
const ajv = new Ajv({ allErrors: true });

const signupSchema = {
  type: 'object',
  properties: {
    username: { type: 'string', minLength: 3, maxLength: 20, pattern: '^[A-Za-z0-9_]+$' },
    email: { type: 'string', format: 'email' },
    password: { type: 'string', minLength: 8 },
    age: { type: 'integer', minimum: 0, maximum: 120 }
  },
  required: ['username', 'email', 'password'],
  additionalProperties: false
};

function validateSignup(data) {
  const valid = ajv.validate(signupSchema, data);
  if (!valid) {
    const message = ajv.errorsText(ajv.errors, { dataVar: 'payload' });
    throw new Error(message);
  }
  return data;
}

// Example usage in a route
// app.post('/signup', (req, res) => {
//   try {
//     const user = validateSignup(req.body);
//     res.json({ ok: true, user });
//   } catch (e) {
//     res.status(400).json({ error: e.message });
//   }
// });
```

### Line-by-line explanation
- Line 1: Import Ajv (Another JSON Schema Validator).
- Line 2: Create an Ajv instance with allErrors option to collect multiple errors.
- Lines 4-14: Define a JSON Schema for signup data; username constraints include length and an alphanumeric pattern, email must be a valid email format, password length, age range, and disallow additional properties.
- Lines 16-23: validateSignup function calls ajv.validate against the schema; if invalid, construct a readable error message from ajv.errors and throw it.
- Lines 25-33: Example route usage (commented out) showing how to integrate the validator into an Express route and return errors to the client.

Code Block: Validation with Joi (schema-first approach)

```js
const express = require('express');
const Joi = require('joi');
const app = express();

app.use(express.json());

const signupSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(20).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  age: Joi.number().integer().min(0).max(120).optional()
});

app.post('/signup', async (req, res) => {
  try {
    const value = await signupSchema.validateAsync(req.body, { abortEarly: false });
    res.json({ ok: true, value });
  } catch (err) {
    res.status(400).json({ error: err.details.map(d => d.message) });
  }
});
```

### Line-by-line explanation
- Line 1: Import Express.
- Line 2: Import Joi.
- Line 3: Create Express app.
- Line 5: JSON body parsing middleware.
- Lines 7-12: Define Joi-based signup schema: username constraints, required fields, and optional age.
- Lines 14-22: POST /signup route uses validateAsync to enforce all schema rules; abortEarly: false collects all problems.
- Lines 23-27: On success, return the validated value; on error, respond with a 400 and a list of error messages.

### 2.2 When to prefer each approach
- Ajv (JSON Schema) is great when your data shape is shared across services or when you want to reuse schemas across clients, services, and databases.
- Joi offers a rich, readable JS-centric API that is very pleasant for rapid server-side validation with explicit error messages.
- In real systems, you may combine approaches: use JSON Schema for contract validation between services, and Joi for more granular, application-layer validation inside specific endpoints.

## 3. Sanitization and Output Encoding

Validation protects structure and types; sanitization protects from content-based attacks (like XSS) and ensures safe downstream usage.

Code Block
```js
const validator = require('validator');
const express = require('express');
const app = express();

app.use(express.json());

app.post('/comment', (req, res) => {
  const { content } = req.body;
  // Sanitize and normalize input
  const safeContent = validator.escape(validator.trim(content || ''));
  if (safeContent.length > 1000) {
    return res.status(400).json({ error: 'Comment too long' });
  }
  // Persist or return sanitized content
  res.json({ content: safeContent });
});
```

### Line-by-line explanation
- Line 1: Import validator library for sanitization helpers.
- Line 2-3: Import Express and create an app.
- Line 5: JSON body parsing middleware.
- Line 7-13: Endpoint that takes content, trims whitespace, escapes HTML-like characters to prevent XSS, and enforces a length constraint.
- Line 14-16: If content exceeds allowed length, return a 400 error; otherwise, respond with the sanitized content.
- Line 18: Export the app (for server or tests).

## X. Common Beginner Mistakes

Pitfalls that undermine input validation, with bad vs good examples.

### 1) Not validating at all (trusting all input)
Bad
```js
// No validation
app.post('/submit', (req, res) => {
  const data = req.body.data;
  // proceed assuming data is valid
  res.json({ ok: true, data });
});
```

Good
```js
const Joi = require('joi');
const schema = Joi.object({ data: Joi.string().min(1).max(500).required() });

app.post('/submit', async (req, res) => {
  try {
    const value = await schema.validateAsync(req.body);
    res.json({ ok: true, value });
  } catch (e) {
    res.status(400).json({ error: e.details.map(d => d.message) });
  }
});
```

### 2) Injecting variables into queries without parameters
Bad
```js
// Dangerous: string interpolation
const id = req.params.id;
db.query(`SELECT * FROM users WHERE id = ${id}`);
```

Good
```js
// Parameterized query
const id = req.params.id;
db.query('SELECT * FROM users WHERE id = ?', [id]);
```

### 3) Skipping validation for nested objects/arrays
Bad
```js
// Accepts any shape for payload
const payload = req.body.payload;
process(payload);
```

Good
```js
const Joi = require('joi');
const payloadSchema = Joi.object({
  items: Joi.array().items(Joi.string()).required(),
  meta: Joi.object({ timestamp: Joi.number().required() }).optional()
});
const value = await payloadSchema.validateAsync(req.body.payload);
process(value);
```

### 4) Revealing internal errors to clients
Bad
```js
try { /* validation */ } catch (e) {
  res.status(500).send(e); // leaks stack traces
}
```

Good
```js
try { /* validation */ } catch (e) {
  console.error(e); // log securely on server
  res.status(400).json({ error: 'Invalid input' });
}
```

## Y. Why This Matters In Real Systems

- Security: Validation is a shield against injections, schema mismatches, and malformed data that could corrupt databases or trigger logic errors.
- Reliability: Early rejection of bad input prevents downstream crashes, incorrect business decisions, and cascading failures in microservices.
- Maintainability: Clear validation rules document intent, making APIs easier to reason about and simpler to test.
- Compliance: Enforces data contracts required by audits and regulatory controls by ensuring fields conform to defined formats and lengths.
- Performance: Failing bad requests early reduces unnecessary processing, DB calls, and workload on downstream services.
- Observability: Validation errors provide actionable signals for API consumers and internal teams when contracts drift or clients misuse endpoints.

In production, teams typically centralize validation into middleware, reuse shared schemas across services, and combine runtime validation with static typing where possible. Defensive programming principles—treating all inputs as untrusted—help reduce blast radius and simplify incident response when issues occur.

## Z. Study Questions

1) What is the difference between validation and sanitization? Provide examples of each in a Node.js API.  
2) How would you validate an email and password in an Express route using Joi? Show a minimal schema and route.  
3) Why should you use parameterized queries or prepared statements instead of string concatenation for database calls? Provide a short example.  
4) What are the benefits of using a JSON Schema validator like Ajv in a microservices architecture?  
5) How can you ensure error messages do not leak implementation details while still informing clients about invalid input?

## Exercise

Build a small, production-like Express API that enforces input validation and sanitization across two endpoints. Complete the parts below and provide a runnable code example.

Part A — Project setup
- Create a Node.js project with Express.
- Install dependencies: express, joi, ajv, validator.
- Create a single file server.js to host routes.

Part B — Endpoint 1: /signup (validation with Joi or Ajv)
- Accept body: { username, email, password, age (optional) }.
- Validate with a schema (choose Joi or Ajv).
- Enforce: username alphanumeric 3-20 chars, email valid, password at least 8 chars, age if provided is 0-120.
- Return 400 with detailed validation errors if invalid; otherwise return 200 with sanitized/validated payload.

Part C — Endpoint 2: /comment (sanitization)
- Accept body: { content }.
- Sanitize content using validator (trim and escape) and enforce a max length of 1000.
- Return 200 with sanitized content.

Part D — Endpoint 3: /order (security best practice)
- Accept body: { userId, productId, quantity }.
- Validate types; ensure quantity is a positive integer.
- Demonstrate a parameterized-style “database” call (simulate with a function) to avoid injection.

Part E — Minimal tests (optional)
- Write a small script or notes describing how you would test each endpoint (happy path and failure paths).

Starter code skeleton (to fill in)

```js
// server.js
const express = require('express');
const Joi = require('joi'); // or use Ajv with JSON Schema if you prefer
const validator = require('validator');
const app = express();

app.use(express.json());

// Endpoint 1: /signup
// TODO: add schema validation and handler

// Endpoint 2: /comment
// TODO: add sanitization

// Endpoint 3: /order
// TODO: add validation and simulated parameterized DB call

module.exports = app;
```

Deliverable tasks:
- Replace TODOs with fully functional routes.
- Ensure errors are returned with appropriate HTTP status codes.
- Provide a brief README-like comment in the code explaining the validation approach chosen and why.
- (Optional) Add small in-memory tests by sourcing sample requests and printing results to the console.

This lesson equips you with practical, production-aligned strategies for input validation and sanitization in Node.js backends, reinforcing the principle: never trust user input, always validate, always sanitize, and always use safe data handling practices in your web servers.