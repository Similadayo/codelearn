# HTTP In Depth — Methods, Headers, Status Codes

HTTP is the backbone of web communication. In backend engineering, knowing how to use methods correctly, manipulate headers, and respond with the right status codes is essential for building robust, scalable APIs. This lesson walks through core concepts with concrete Node.js examples, line-by-line explanations, common beginner mistakes, production considerations, study prompts, and a hands-on exercise.

## 1. HTTP Methods Overview

Understand the purpose, semantics, and idempotence of common HTTP methods (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS) and how to route requests accordingly in Node.js.

```js
// 1. Node.js HTTP server demonstrating method handling
const http = require('http');
const url = require('url');

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const method = req.method;

  if (method === 'GET' && parsed.pathname === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, method }));
  } else if (method === 'GET') {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  } else if (method === 'POST' && parsed.pathname === '/echo') {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ received: body }));
    });
  } else if (method === 'PUT' || method === 'PATCH') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ method, updated: true }));
  } else if (method === 'DELETE') {
    res.writeHead(204);
    res.end();
  } else if (method === 'OPTIONS') {
    res.writeHead(204, { 'Allow': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' });
    res.end();
  } else {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
  }
});

server.listen(3000, () => console.log('Listening on http://localhost:3000'));
```

### Line-by-line explanation
- const http = require('http'); — Import the core HTTP module.
- const url = require('url'); — Import URL parsing utility.
- const server = http.createServer((req, res) => { ... }); — Create an HTTP server with a request handler.
- const parsed = url.parse(req.url, true); — Parse the request URL into pathname and query.
- const method = req.method; — Capture the HTTP method (GET, POST, etc.).
- if (method === 'GET' && parsed.pathname === '/ping') { ... } — Handle a simple health check GET.
- res.writeHead(200, { 'Content-Type': 'application/json' }); — Respond with status 200 and JSON content type.
- res.end(JSON.stringify({ ok: true, method })); — Send a JSON body indicating success and method.
- else if (method === 'GET') { ... 404 ... } — Default GET path not found.
- else if (method === 'POST' && parsed.pathname === '/echo') { ... } — Echo back posted body.
- let body = ''; req.on('data', chunk => (body += chunk)); — Accumulate incoming data chunks.
- req.on('end', () => { ... }) — When complete, respond with 201 and echoed body.
- else if (method === 'PUT' || method === 'PATCH') { ... } — Demonstrate update semantics.
- else if (method === 'DELETE') { res.writeHead(204); res.end(); } — No Content for delete.
- else if (method === 'OPTIONS') { res.writeHead(204, { 'Allow': '...' }); } — Preflight-like response.
- else { res.writeHead(405, ...); } — Unsupported method handling.
- server.listen(3000, () => console.log(...)); — Start listening on port 3000.

### Line-by-line explanation
- The handler branches on method+path to demonstrate GET, POST, PUT/PATCH, DELETE, and OPTIONS semantics.
- 201 Created for POST echo, 204 No Content for DELETE and OPTIONS, 405 for unsupported methods.
- The code intentionally uses simple pathname checks to illustrate routing without a framework.

## 2. HTTP Headers Essentials

Reading request headers and setting response headers properly enables content negotiation, content-type correctness, and client-side behavior control (caching, compression, etc.).

```js
// 2. Node.js HTTP server focusing on headers (Content-Type, Accept)
const http = require('http');

const parseJSON = (req) =>
  new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });

const PORT = 3001;
const server = http.createServer(async (req, res) => {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  const accept = req.headers['accept'] || '';

  if (req.method === 'POST' && contentType.includes('application/json')) {
    try {
      const body = await parseJSON(req);
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 200;
      res.end(JSON.stringify({ received: body, accept }));
    } catch {
      res.statusCode = 400;
      res.end('Invalid JSON');
    }
  } else {
    // demonstrate header usage
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('X-Powered-By', 'Node.js');
    res.statusCode = 415; // Unsupported Media Type by default
    res.end('Unsupported Content-Type. Send application/json.');
  }
});

server.listen(PORT, () => console.log(`Headers demo on http://localhost:${PORT}`));
```

### Line-by-line explanation
- const parseJSON = (req) => new Promise((resolve, reject) => { ... }); — Utility to read and parse JSON bodies asynchronously.
- req.headers['content-type'] — Read request content-type; header keys are lowercased by Node.
- if (req.method === 'POST' && contentType.includes('application/json')) { ... } — Only accept JSON bodies for POST.
- const body = await parseJSON(req); — Parse the body into a JS object.
- res.setHeader('Content-Type', 'application/json'); — Ensure the response has JSON content type.
- res.end(JSON.stringify({ received: body, accept })); — Echo the parsed body and client's Accept header.
- catch { res.statusCode = 400; ... } — Return 400 on invalid JSON.
- res.setHeader('X-Powered-By', 'Node.js'); — Demonstrate custom response headers.
- res.statusCode = 415; res.end('Unsupported Content-Type...') — Explain why 415 is used for unsupported media type.

## 3. Status Codes Deep Dive

Explore the semantics of concrete status codes and how to respond correctly for common scenarios: creation, retrieval, update, deletion, error, and rate limiting.

```js
// 3. Minimal REST-like status codes demo
const http = require('http');
const store = new Map();

const server = http.createServer((req, res) => {
  const { method, url } = req;

  if (url === '/items' && method === 'POST') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        const item = JSON.parse(body);
        const id = Math.random().toString(36).slice(2, 9);
        store.set(id, item);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id, item }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
      }
    });
    return;
  }

  if (url.startsWith('/items/') && method === 'GET') {
    const id = url.split('/').pop();
    if (store.has(id)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id, item: store.get(id) }));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
    return;
  }

  if (url.startsWith('/items/') && method === 'DELETE') {
    const id = url.split('/').pop();
    if (store.has(id)) {
      store.delete(id);
      res.writeHead(204);
      res.end();
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
    return;
  }

  res.writeHead(405, { 'Content-Type': 'text/plain' });
  res.end('Method Not Allowed');
});

server.listen(3002, () => console.log('Status codes demo on http://localhost:3002'));
```

### Line-by-line explanation
- const store = new Map(); — Simple in-memory store to simulate a resource collection.
- POST /items: parse body, generate id, store, respond 201 with created resource.
- try { const item = JSON.parse(body); ... } catch { 400 Bad Request } — Validate JSON payload.
- GET /items/:id: if found, respond 200 with item; else 404 Not Found.
- DELETE /items/:id: if exists, delete and respond 204 No Content; else 404.
- Any other path/method: respond 405 Method Not Allowed.

## 4. Headers for Caching and Negotiation

Implement ETag-based caching and basic content negotiation using headers like ETag, If-None-Match, Cache-Control, and Last-Modified.

```js
// 4. Simple ETag-based caching demo
const http = require('http');
const resource = {
  id: 'greeting',
  content: 'Hello, world!',
  etag: '"v1"'
};

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/resource') {
    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch && ifNoneMatch === resource.etag) {
      res.writeHead(304);
      res.end();
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'text/plain',
      'ETag': resource.etag,
      'Cache-Control': 'max-age=60'
    });
    res.end(resource.content);
    return;
  }
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(3003, () => console.log('ETag demo on http://localhost:3003'));
```

### Line-by-line explanation
- resource.etag = '"v1"' — A simple ETag value that would change if content changes.
- If-None-Match: If client sends the same ETag and content is unchanged, respond 304 Not Modified without body.
- On first GET, respond 200 with the body and set ETag and Cache-Control headers.
- Cache-Control: max-age=60 indicates the resource is fresh for 60 seconds.

## 5. Safe vs Idempotent Methods and Preflight (CORS)

Distinguish safe vs non-safe, idempotent vs non-idempotent methods, and show how to handle CORS preflight requests (OPTIONS) for cross-origin APIs.

```js
// 5. Safe vs idempotent concepts and simple CORS handling
const http = require('http');

const server = http.createServer((req, res) => {
  // Basic CORS setup
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    // Preflight request
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'GET' && req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(3004, () => console.log('CORS demo on http://localhost:3004'));
```

### Line-by-line explanation
- Access-Control-Allow-Origin: '*' — Allows cross-origin requests from anywhere (production may require restricted origins).
- If the request method is OPTIONS, respond 204 to complete the preflight and proceed with actual request later.
- GET /ping demonstrates a safe, idempotent operation without side effects.
- The example highlights that GET is safe and idempotent; POST/PUT/PATCH/DELETE may modify state and are not safe.

## X. Common Beginner Mistakes

3+ real pitfalls with bad vs good code side-by-side.

- Mistake 1: Assuming headers are case-sensitive
  - Bad:
    // Accessing a header with capitalized key (node lowercases keys)
    const ct = req.headers['Content-Type']; // undefined in Node
  - Good:
    const ct = req.headers['content-type']; // correct in Node

- Mistake 2: Ignoring body streaming for POST/PUT
  - Bad:
    // Assume body is available as req.body synchronously (not in native http)
    const body = req.body;
  - Good:
    // Accumulate chunks and parse when 'end' fires
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => { /* parse body */ });

- Mistake 3: Not setting proper status codes for errors
  - Bad:
    res.end('Error');
  - Good:
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Bad Request');

- Mistake 4: Failing to handle OPTIONS/CORS on APIs
  - Bad:
    // API denies cross-origin requests without preflight support
    res.end('Not allowed from other origins');
  - Good:
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(204); // preflight OK for OPTIONS
    res.end();

## Y. Why This Matters In Real Systems

- Correct HTTP methods ensure safe and predictable semantics for clients and intermediaries (caches, proxies).
- Headers enable content negotiation, caching, and security controls (CORS, compression, language).
- Proper status codes drive correct client behavior, error handling, and developer experience; they also influence monitoring, logs, and incident triage.
- Real systems rely on:
  - Consistent use of 200/201/204 vs 400/401/403/404/409/422/500 as appropriate.
  - ETag and Cache-Control to minimize bandwidth and latency.
  - Proper CORS configuration for public APIs while preventing misuse.
  - Clear error bodies with machine-readable formats when possible (e.g., { error: '...' }).

## Z. Study Questions

1) What is the primary difference between 200 and 201 status codes?
2) How does If-None-Match with ETag enable client-side caching?
3) Why is Content-Type important for POST/PUT requests?
4) When should you use 204 No Content versus 200 with a body for a DELETE operation?
5) What headers are typically included in a CORS preflight response (OPTIONS)?

## Exercise

Part A: Build a small RESTful API for a "notes" resource with Node.js http module.

Part tasks:
- Create an in-memory store for notes (id, title, content).
- Implement endpoints:
  - POST /notes to create a new note. Return 201 with the created note including id.
  - GET /notes/:id to fetch a note. Return 200 with the note or 404 if not found.
  - PUT /notes/:id to update a note. Return 200 with updated note or 404 if not found.
  - DELETE /notes/:id to delete a note. Return 204 on success or 404 if not found.
  - GET /notes/:id with If-None-Match header for ETag-based caching. Use a simple in-memory ETag derived from the note content; return 304 if unchanged.
- Ensure you parse JSON bodies and respond with proper Content-Type.
- Add CORS headers to allow cross-origin requests (Access-Control-Allow-Origin: '*') and handle OPTIONS preflight.

Part B: Extend Part A to include basic content negotiation.

- If Accept header includes application/json, respond with JSON as before.
- If Accept does not include application/json, respond with 406 Not Acceptable.

Part C: Write a short script to test your API using Node.js http.request or curl equivalents:
- Create a note, then fetch it, update it, and delete it, verifying status codes and ETag caching behavior.

Tips:
- Start a single process and run the script; observe the console logs and HTTP responses.
- Use descriptive JSON bodies, e.g., { "title": "Sample", "content": "This is a note." }.

This completes a compact, practical, hand-on session covering HTTP methods, headers, status codes, and real-system usage in a Node.js backend.