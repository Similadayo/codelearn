# Backend Engineering - Phase 1: Language Foundations - Error Handling & Debugging (JavaScript / Node.js)

Error handling and debugging are foundational skills for reliable, maintainable backends. In Node.js, errors propagate through asynchronous boundaries in complex ways, and improper handling can lead to silent failures, service outages, or cryptic logs. This lesson builds a solid mental model for errors, demonstrates robust patterns, and provides practical debugging techniques you can apply in real systems.

## 1. Understanding Errors in JavaScript and Synchronous Handling

JavaScript uses Error objects to represent problems. Synchronous code uses try/catch to handle them. The pattern shown below covers basic input validation, throwing, and catching.

```javascript
function divide(a, b) {
  if (typeof a !== 'number' || typeof b !== 'number') {
    throw new TypeError('Arguments must be numbers');
  }
  if (b === 0) {
    throw new Error('Cannot divide by zero');
  }
  return a / b;
}

try {
  console.log(divide(6, 2)); // 3
  console.log(divide(6, 0)); // throws
} catch (err) {
  console.error('Caught error:', err.message);
  console.error('Stack trace:', err.stack);
}
```

### Line-by-line explanation
- Line 1: Function declaration for divide(a, b).
- Line 2-4: Validate input types; throw TypeError if non-numeric arguments.
- Line 5-7: Guard against division by zero; throw a generic Error with a message.
- Line 8: Compute and return the result when inputs are valid.
- Line 10: Enter a try block to run potentially failing code.
- Line 11: Call divide(6, 2) and log the result (3).
- Line 12: Call divide(6, 0), which throws; control flow moves to catch.
- Line 14: Catch block captures the error object.
- Line 15: Log a concise error message.
- Line 16: Log the full stack trace for debugging context.

## 2. Handling Asynchronous Errors with Callbacks

Error-first callbacks are an established Node.js pattern for asynchronous operations. The callback receives (error, result), where error is non-null on failure.

```javascript
const fs = require('fs');

function readConfig(callback) {
  fs.readFile('./config.json', 'utf8', (err, data) => {
    if (err) {
      return callback(err);
    }
    try {
      const parsed = JSON.parse(data);
      callback(null, parsed);
    } catch (parseErr) {
      callback(parseErr);
    }
  });
}

readConfig((err, config) => {
  if (err) {
    console.error('Failed to load config:', err.message);
  } else {
    console.log('Config loaded:', config);
  }
});
```

### Line-by-line explanation
- Line 1: Import the built-in fs module for file I/O.
- Line 3: Define readConfig accepting a callback.
- Line 4-9: Asynchronously read config.json; on error, pass the error to the callback.
- Line 6: If there is a low-level I/O error, immediately return via callback(err).
- Line 8-12: Parse the JSON; on success, pass null and the parsed config; on JSON parsing error, pass the parseErr to the callback.
- Line 15-22: Invoke readConfig with a callback that handles both error and success paths.
- Line 16-18: Log an error message if reading/parsing failed.
- Line 19-21: Log the loaded configuration if successful.

## 3. Promises and Async/Await: Propagating and Handling Errors

Promises and async/await simplify asynchronous control flow but require explicit error handling to avoid unhandled rejections.

```javascript
function fakeDbQuery(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (id < 0) {
        reject(new Error('Invalid id'));
      } else {
        resolve({ id, name: 'Ada' });
      }
    }, 50);
  });
}

async function getUser(id) {
  if (typeof id !== 'number') {
    throw new TypeError('id must be a number');
  }
  const user = await fakeDbQuery(id);
  return user;
}

async function main() {
  try {
    const user = await getUser(5);
    console.log('User:', user);
    // Trigger an error path
    await getUser(-1);
  } catch (err) {
    console.error('Error fetching user:', err.message);
    console.error('Stack:', err.stack);
  }
}

main();
```

### Line-by-line explanation
- Line 1-11: Define fakeDbQuery to simulate an async DB call; it resolves for valid IDs and rejects for negative IDs.
- Line 12-16: getUser is an async function; it validates input type and throws a TypeError if invalid.
- Line 17-18: Await the simulated DB query result.
- Line 21-29: main is an async function that exercises both a success path and an error path inside a try/catch.
- Line 23: Successful path logs the user object.
- Line 25-27: Intentional error path to demonstrate catching a rejection as an exception.
- Line 28-31: Catch block logs the error message and stack for debugging.

## 4. Custom Error Classes and Error Codes

Creating domain-specific error classes helps surface meaningful context to callers (HTTP routes, service boundaries, etc.). Here’s a lightweight AppError with statusCode and code fields.

```javascript
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR', cause) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    if (cause) this.cause = cause;
    Error.captureStackTrace(this, this.constructor);
  }
}

function getResource(id) {
  if (typeof id !== 'string') {
    throw new AppError('Invalid resource id', 400, 'INVALID_ID');
  }
  // Simulated not-found condition
  if (id === '0') {
    throw new AppError('Resource not found', 404, 'NOT_FOUND');
  }
  return { id, data: 'Some data' };
}

try {
  console.log(getResource(1));
} catch (err) {
  if (err instanceof AppError) {
    console.error(`Error [${err.code}] - ${err.message} (status ${err.statusCode})`);
  } else {
    console.error('Unexpected error:', err);
  }
}
```

### Line-by-line explanation
- Line 1-9: Define AppError as a reusable, informative error type with statusCode and code.
- Line 10-17: getResource validates input and throws AppError for invalid inputs or not-found conditions.
- Line 19-25: Try invoking getResource with a valid id; on error, the catch block handles AppError differently than generic errors.
- Line 21: If the error is AppError, log a structured message with code and HTTP-like status.
- Line 22-24: Otherwise, log the unexpected error.

## 5. Propagation, Wrapping, and Error Middleware Concepts

As systems grow, errors must be propagated cleanly across layers and optional wrappers can add context. The examples below show a simple pipeline with wrapping and a pattern suitable for route handlers.

```javascript
// Optional lightweight custom error wrapper for pipeline steps
class AppError extends Error { /* see above */ }

// Step definitions with context wrapping
function stepA(input) {
  if (!input) throw new AppError('Input required', 400, 'MISSING_INPUT');
  return input + 1;
}

function stepB(value) {
  try {
    const a = stepA(value);
    if (a > 10) throw new AppError('Value too large', 422, 'VALUE_TOO_LARGE');
    return a;
  } catch (err) {
    if (err instanceof AppError) {
      // Rewrap with additional context to preserve the original cause
      throw new AppError(`stepB failed: ${err.message}`, err.statusCode, err.code, err);
    }
    throw err;
  }
}

// Example usage
try {
  console.log(stepB(5));       // 6
  console.log(stepB(null));    // error: MISSING_INPUT
} catch (err) {
  console.error('Error in pipeline:', err.message);
  if (err.cause) console.error('Cause:', err.cause.message);
}
```

Optional Express-style error boundary helper (illustrative; not strictly required for all backends):

```javascript
// A tiny wrapper for async route handlers (Express-like)
const express = require('express');
const app = express();

const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

async function getUserRoute(req, res) {
  const user = await getUser(Number(req.params.id));
  res.json(user);
}

// Usage in a route
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await getUserRoute(req, res);
  res.json(user);
}));

// In a real app, you'd have an error-handling middleware to format responses.
```

### Line-by-line explanation
- Line 1-9: AppError class definition (refer to previous section) to ensure consistency in error shapes.
- Line 11-19: stepA validates input and returns a computed value or throws AppError.
- Line 21-31: stepB adds a protective try/catch, wrapping errors with more context when needed.
- Line 33-40: Demonstration of how errors propagate through the pipeline and how to log the final error and its cause.
- Line 42-50: (Express example) Introduces an asyncHandler wrapper to automatically catch and forward errors to Express’ error middleware.
- Line 52-59: A route example showing how the wrapper is used to keep route handlers concise and robust.

## 6. Debugging Techniques and Tools in Node.js

Front-line debugging combines code-level patterns with tooling to locate and understand failures quickly.

```bash
# Start a Node process with the inspector enabled and break on the first line
node --inspect-brk index.js

# In Chrome/Chromium, open chrome://inspect and click "Open dedicated DevTools for Node"
# Use breakpoints, inspect variables, and step through code

# Alternatively, in VS Code, run with a Node.js Debug configuration and set breakpoints
```

```js
// Example snippet for deep object inspection and helpful logging
const util = require('util');

function debugLog(obj) {
  console.log(util.inspect(obj, { depth: 2, colors: true, showHidden: false }));
}

const payload = { user: { id: 42, meta: { lastLogin: 'yesterday' } } };
debugLog(payload);
```

### Line-by-line explanation
- Line 1-4: bash commands to start Node with the inspector, enabling debugging and breakpoints.
- Line 6-13: Chrome DevTools or VS Code setup steps to connect to the Node process and use breakpoints.
- Line 15-17: Basic guidance on using the debugger to inspect scopes, call stacks, and variables.
- Line 19-25: util.inspect-based helper to print complex objects in a readable, colored format for logs.
- Line 27-31: Example payload creation and a call to debugLog to render the object structure clearly.

## X. Common Beginner Mistakes

- Bad: Swallowing errors (empty catch) without logging or rethrowing.
  Good: Preserve the error, add context, and rethrow or convert to a known error type.

```javascript
// Bad
try {
  doSomething();
} catch (e) {
  // silently ignores
}

// Good
try {
  doSomething();
} catch (e) {
  console.error('Operation failed; rethrowing with context', e);
  throw new AppError('Operation failed in doSomething', 500, 'OP_FAILED', e);
}
```

- Bad: Throwing strings or non-Error values.
  Good: Always throw Error objects (or subclasses) to preserve stack traces.

```javascript
// Bad
throw 'Invalid user';

// Good
throw new Error('Invalid user');
```

- Bad: Not propagating async errors (neglecting Promise rejections).
  Good: Always handle rejections or attach .catch to propagate to a central handler.

```javascript
// Bad
async function fetchUser() {
  const user = await getUserFromDb(); // rejected promise unhandled
  return user;
}

// Good
async function fetchUser() {
  try {
    const user = await getUserFromDb();
    return user;
  } catch (err) {
    // optional wrap or rethrow
    throw new AppError('Failed to fetch user', 500, 'FETCH_USER_ERROR', err);
  }
}
```

- Bad: Logging only generic errors without context or stack traces.
  Good: Log with codes, messages, and stack to aid debugging.

```javascript
// Bad
console.error('Error');

// Good
console.error(`Error [FETCH_USER_ERROR]: ${err.message}`, err);
```

- Bad: Over-logging every detail in production (privacy and performance risk).
  Good: Log structured, leveled logs and avoid sensitive data; use log levels and rotation.

## Y. Why This Matters In Real Systems

- Reliability: Proper error handling prevents unhandled rejections and silent failures that degrade user experience.
- Observability: Rich error objects, stack traces, and structured logs enable faster root-cause analysis in production.
- Security and UX: Clear, safe error messages prevent leaking internal details while providing actionable information to callers.
- Maintainability: Custom error classes create a consistent contract across modules, simplifying debugging and testing.
- Debugging efficiency: Debugging tools (Node Inspector, VS Code, breakpoints) reduce time-to-resolution for intermittent or complex concurrency issues.

In real systems, you’ll typically combine:
- Synchronous guards (try/catch) for local invariants.
- Async wrappers and Promise rejection handling at module or route boundaries.
- Centralized error formatting middleware (for HTTP servers) or service-level error handlers.
- Observability pipelines with structured logs, correlation IDs, and tracing.

## Z. Study Questions

1. What is the difference between throwing a TypeError and a generic Error in JavaScript?
2. How do you propagate errors from a callback-based API to the caller of your function?
3. Why is it beneficial to create custom error classes in a backend service?
4. How can you wrap an error to add context without losing the original cause?
5. Describe how you would debug an intermittent error in a Node.js HTTP server using the inspector or VS Code.

## Exercise

Part A: Synchronous error handling and custom error
- Implement a function safeDivide(a, b) that:
  - Validates inputs are numbers; throws TypeError with a helpful message if not.
  - Throws an Error with code 'DIV_BY_ZERO' if b is 0.
  - Returns the quotient otherwise.
- Write a small script that calls safeDivide with three test cases: (10, 2), (5, 0), ('a', 2).
- For each case, catch errors, log a structured message including error name, code (if present), and message.

Part B: Asynchronous error flow with promises
- Create a function simulateNetworkCall(id) that returns a Promise:
  - Resolves with { id, data: 'payload' } after 100ms if id is positive.
  - Rejects with new Error('Network failure') if id is negative.
- Create an async function fetchData(id) that uses simulateNetworkCall and handles errors by rethrowing a new AppError with code 'NET_FAIL' and status 503 when the network call fails.
- Exercise: Call fetchData(1) and fetchData(-1) and log outcomes. Ensure errors include both the original cause and the AppError wrapper.

Part C: Error propagation in a small pipeline
- Implement three functions: step1(input), step2(value), step3(value).
  - step1 throws an AppError if input is falsy.
  - step2 calls step1, then if result > 10, throws another AppError.
  - step3 wraps any AppError from step2 with additional context and rethrows.
- Create a driver that invokes step3(0) and catches the final error, printing a structured report: { message, code, statusCode, cause } where cause is the nested error message if available.

Part D: Debugging practice
- Run a Node script with the inspector enabled and set a breakpoint in Part B’s fetchData error path.
- Connect via chrome://inspect and verify that the stack trace points to your AppError wrapper as the outer cause.

Submit the above implementations in separate files or within a single modular script, with clear separation and comments. Include at least one example output snippet showing expected console logs for a successful case and an error case.