# Track: Backend Engineering — Phase 4: Building Web Servers — Middleware: Logging, CORS, and Request Pipeline

Middleware is the connective tissue that sits between a web server and your application logic. It lets you observe, modify, or short-circuit requests and responses in a clean, reusable way. Mastering middleware is essential for building scalable, observable, and secure backends. This lesson focuses on three critical middleware concepts in Python: logging, CORS (Cross-Origin Resource Sharing), and composing a robust request pipeline.

## 1. Conceptual Foundations: The Middleware Pattern and Simple Request/Response

```python
1 from dataclasses import dataclass
2 from typing import Callable, Dict
3
4 @dataclass
5 class Request:
6     method: str
7     path: str
8     headers: Dict[str, str]
9     body: bytes
10
11 @dataclass
12 class Response:
13     status: int
14     headers: Dict[str, str]
15     body: bytes
16
17 # A request handler takes a Request and returns a Response
18 Handler = Callable[[Request], Response]
19
20 # Final application logic
21 def final_handler(req: Request) -> Response:
22     return Response(200, {"Content-Type": "text/plain"}, b"OK")
23
24 # A minimal identity middleware (passes through)
25 def identity_middleware(next_handler: Handler) -> Handler:
26     def _handle(req: Request) -> Response:
27         return next_handler(req)
28     return _handle
29
30 # Pipeline builder: wrap the final handler with any number of middlewares
31 def build_pipeline(final: Handler, *middlewares) -> Handler:
32     handler = final
33     for mw in reversed(middlewares):
34         handler = mw(handler)
35     return handler
```

### Line-by-line explanation
- Line 1-2: Import core types to define the Request/Response shapes and a generic Handler type.
- Lines 4-9: Define a simple Request data structure with method, path, headers, and body.
- Lines 11-15: Define a simple Response data structure with status, headers, and body.
- Line 18: Define a type alias for a request handler function.
- Lines 21-22: Implement the final application logic as a simple 200 OK response.
- Lines 25-28: Provide a trivial identity middleware that simply forwards the request to the next handler.
- Lines 31-35: Implement a pipeline builder that wraps the final handler with any number of middlewares in reverse order, enabling the classic "wrap the inner handler" pattern.

## 2. Logging Middleware: Observability Without Performance Penalty

```python
1 import logging
2 from dataclasses import dataclass
3 from typing import Dict
4
5 logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
6 logger = logging.getLogger("server")
7
8 @dataclass
9 class Request:
10     method: str
11     path: str
12     headers: Dict[str, str]
13     body: bytes
14
15 @dataclass
16 class Response:
17     status: int
18     headers: Dict[str, str]
19     body: bytes
20
21 def logging_middleware(next_handler):
22     def handle(req: Request) -> Response:
23         logger.info("Incoming %s %s", req.method, req.path)
24         resp = next_handler(req)
25         logger.info("Responded %d for %s", resp.status, req.path)
26         return resp
27     return handle
28
29 def final_handler(req: Request) -> Response:
30     return Response(200, {"Content-Type": "text/plain"}, b"OK")
31
32 # Example pipeline composition with logging
33 pipeline = logging_middleware(final_handler)
34
35 req = Request("GET", "/hello", {"Host": "localhost"}, b"")
36 resp = pipeline(req)
```

### Line-by-line explanation
- Lines 1-6: Set up a basic Python logger named "server" with INFO-level output to stdout.
- Lines 8-14: Redefine the Request data structure (self-contained for readability in this section).
- Lines 16-19: Redefine the Response data structure (self-contained for readability in this section).
- Lines 21-27: Implement a LoggingMiddleware that logs the incoming request and the outgoing response status.
- Lines 29-30: Define a trivial final handler that returns 200 OK.
- Line 33: Build a pipeline by wrapping the final handler with the logging middleware.
- Lines 35-36: Create a sample Request and invoke the pipeline to demonstrate logging output.

Note: In a real project, you’d share the Request/Response types across sections via a common module; this block is self-contained for clarity.

## 3. CORS Middleware: Safely Exposing Resources to Web Browsers

```python
1 from dataclasses import dataclass
2 from typing import Dict
3
4 @dataclass
5 class Request:
6     method: str
7     path: str
8     headers: Dict[str, str]
9     body: bytes
10
11 @dataclass
12 class Response:
13     status: int
14     headers: Dict[str, str]
15     body: bytes
16
17 def cors_middleware(allowed_origins=None, allowed_methods=None, allowed_headers=None):
18     allowed_origins = allowed_origins or ["*"]
19     allowed_methods = allowed_methods or ["GET","POST","PUT","PATCH","DELETE","OPTIONS"]
20     allowed_headers = allowed_headers or ["Content-Type","Authorization"]
21
22     def middleware(next_handler):
23         def handle(req: Request) -> Response:
24             resp = next_handler(req)
25             origin = req.headers.get("Origin")
26             if origin and (origin in allowed_origins or "*" in allowed_origins):
27                 resp.headers["Access-Control-Allow-Origin"] = origin
28                 resp.headers["Vary"] = "Origin"
29                 resp.headers["Access-Control-Allow-Methods"] = ", ".join(allowed_methods)
30                 resp.headers["Access-Control-Allow-Headers"] = ", ".join(allowed_headers)
31                 # Preflight handling: OPTIONS requests can be answered without touching the underlying app
32                 if req.method == "OPTIONS":
33                     resp.status = 204
34                     resp.body = b""
35             return resp
36         return handle
37     return middleware
```

### Line-by-line explanation
- Lines 1-3: Import essentials (dataclass and typing).
- Lines 5-9: Define Request structure for this section.
- Lines 11-15: Define Response structure for this section.
- Lines 17-21: Define CORS middleware factory with defaults: allow all origins by default; and typical methods/headers.
- Lines 22-37: The inner middleware wraps a downstream handler:
  - Line 24: Call the next handler to obtain the base response.
  - Line 25: Read the Origin header from the request.
  - Line 26-30: If the origin is allowed, set Access-Control-Allow-Origin and related headers, and prepare for preflight.
  - Lines 32-34: If the request is a preflight OPTIONS, short-circuit by returning 204 with an empty body.
  - Line 35: Return the enriched response.
- Line 37: End of middleware factory.

## 4. Request Pipeline Composition: Putting It All Together

```python
# This block assumes the Request/Response definitions and middleware
# builders from earlier sections are accessible (or redefined here for completeness).

import json
import time
from dataclasses import dataclass
from typing import Dict

@dataclass
class Request:
    method: str
    path: str
    headers: Dict[str, str]
    body: bytes

@dataclass
class Response:
    status: int
    headers: Dict[str, str]
    body: bytes

def router(req: Request) -> Response:
    if req.path == "/":
        return Response(200, {"Content-Type": "text/plain"}, b"Welcome")
    elif req.path == "/api/time":
        payload = {"time": time.time()}
        return Response(200, {"Content-Type": "application/json"}, json.dumps(payload).encode())
    else:
        return Response(404, {"Content-Type": "text/plain"}, b"Not Found")

def final_handler(req: Request) -> Response:
    return router(req)

# Re-create minimal helpers (for demonstration) or import from previous sections
def build_pipeline(final, *middlewares):
    handler = final
    for mw in reversed(middlewares):
        handler = mw(handler)
    return handler

# Re-create the two middlewares for demonstration (in a real project they'd be shared)
import logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("server")

def logging_middleware(next_handler):
    def handle(req: Request) -> Response:
        logger.info("Incoming %s %s", req.method, req.path)
        resp = next_handler(req)
        logger.info("Responded %d for %s", resp.status, req.path)
        return resp
    return handle

def cors_middleware(allowed_origins=None, allowed_methods=None, allowed_headers=None):
    allowed_origins = allowed_origins or ["*"]
    allowed_methods = allowed_methods or ["GET","POST","PUT","PATCH","DELETE","OPTIONS"]
    allowed_headers = allowed_headers or ["Content-Type","Authorization"]
    def middleware(next_handler):
        def handle(req: Request) -> Response:
            resp = next_handler(req)
            origin = req.headers.get("Origin")
            if origin and (origin in allowed_origins or "*" in allowed_origins):
                resp.headers["Access-Control-Allow-Origin"] = origin
                resp.headers["Vary"] = "Origin"
                resp.headers["Access-Control-Allow-Methods"] = ", ".join(allowed_methods)
                resp.headers["Access-Control-Allow-Headers"] = ", ".join(allowed_headers)
                if req.method == "OPTIONS":
                    resp.status = 204
                    resp.body = b""
            return resp
        return handle
    return middleware

# Build a complete pipeline
pipeline = build_pipeline(final_handler,
                          logging_middleware,
                          cors_middleware(["http://localhost:3000"]))

# Demo request (CORS-enabled path)
req = Request("GET", "/", {"Origin": "http://localhost:3000"}, b"")
resp = pipeline(req)

print("Status:", resp.status)
print("Headers:", resp.headers)
print("Body:", resp.body.decode())
```

### Line-by-line explanation
- Lines 1-9: Import basics and define Request/Response types for this section.
- Lines 11-18: Implement a simple router with two endpoints: “/” and “/api/time”.
- Line 21-22: Expose the final handler that delegates to the router.
- Lines 25-31: Define a generic pipeline builder to wrap the final handler with middlewares.
- Lines 34-42: Recreate a minimal logging setup to show how logs will look in a real system.
- Lines 44-47: Implement a LoggingMiddleware that logs each request and response.
- Lines 49-66: Implement a CORS middleware with origin checking, Vary header, and preflight handling for OPTIONS.
- Line 69-71: Assemble the pipeline with both middlewares and a designated allowed origin.
- Lines 74-78: Create a sample request with an Origin header and run it through the pipeline.
- The final print statements display the resulting status, headers, and body to verify behavior.

Note: The code in Section 4 demonstrates end-to-end usage. In a real project, you’d separate core types, middleware, and routing into modules and wire them with an actual web server (WSGI-compatible app) or an ASGI framework.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

- Pitfall 1: Mutating the incoming Request or downstream Response
  - Bad:
  ```python
  # Mutating request in middleware (bad)
  def bad(req: Request, next_handler):
      req.headers["X-Visited"] = "true"
      return next_handler(req)
  ```
  - Good:
  ```python
  # Do not mutate inbound data; treat it as immutable
  def good(req: Request, next_handler):
      new_req = Request(req.method, req.path, dict(req.headers), req.body)
      return next_handler(new_req)
  ```
  - Why it matters: Mutating shared objects can cause subtle bugs, make debugging hard, and break other middlewares that rely on original input.

- Pitfall 2: Logging sensitive data (exposing tokens, headers)
  - Bad:
  ```python
  # Log raw headers including Authorization (bad)
  def bad(req: Request, next_handler):
      logger.info("Headers: %s", req.headers)
      return next_handler(req)
  ```
  - Good:
  ```python
  # Redact sensitive fields when logging
  def good(req: Request, next_handler):
      safe_headers = {k: ("REDACTED" if k.lower() in {"authorization", "cookie"} else v)
                      for k, v in req.headers.items()}
      logger.info("Headers: %s", safe_headers)
      return next_handler(req)
  ```
  - Why it matters: Logs are read by humans and can be stored insecurely. Redacting prevents credential leaks and mitigates risk.

- Pitfall 3: Incorrect middleware ordering
  - Bad:
  ```python
  # CORS after the final handler; preflight may be mishandled
  pipeline = build_pipeline(final_handler, cors_middleware(...))
  ```
  - Good:
  ```python
  # Correct order: logging -> CORS -> final route handler
  pipeline = build_pipeline(final_handler, logging_middleware, cors_middleware(...))
  ```
  - Why it matters: The order determines whether all requests are observed, and whether CORS preflight gets properly answered before hitting your business logic.

- Pitfall 4: Not handling OPTIONS (preflight) in CORS
  - Bad:
  ```python
  # CORS middleware that only sets headers after the downstream handler
  def bad(req: Request, next_handler):
      resp = next_handler(req)
      resp.headers["Access-Control-Allow-Origin"] = req.headers.get("Origin", "*")
      return resp
  ```
  - Good:
  ```python
  # Proper preflight handling: short-circuit OPTIONS requests with 204
  def good(req: Request, next_handler):
      resp = next_handler(req)
      if req.method == "OPTIONS":
          resp.status = 204
          resp.body = b""
      resp.headers["Access-Control-Allow-Origin"] = req.headers.get("Origin", "*")
      return resp
  ```
  - Why it matters: Browsers perform preflight checks for non-simple requests. Ignoring OPTIONS can block legitimate cross-origin calls.

## Y. Why This Matters In Real Systems — production context and real usage

- Observability at scale: Centralized, structured logs with correlation IDs, traces, and metrics help diagnose bottlenecks and failures quickly. Use a dedicated logging format (e.g., JSON) and integrate with a logging/telemetry backend.
- Security considerations: Redact sensitive headers (Authorization, Cookie) in logs. Ensure CORS is configured with explicit origins rather than a wildcard in production to prevent cross-origin data leaks.
- Performance and reliability: Middleware should be lightweight and non-blocking. For high throughput, consider asynchronous I/O, non-blocking logging, and batching of metrics.
- Real-world integration: In production, you’ll wire middleware into established frameworks (WSGI: Flask, Django, or ASGI: FastAPI, Starlette). The patterns shown here map directly to real middleware components used in those ecosystems.
- Observability and tracing: Extend middleware to propagate correlation IDs and integrate with tracing systems (OpenTelemetry, Jaeger) to trace requests across services.
- Security policy governance: Centralize CORS policy in environments (dev/stage/prod) to reduce misconfigurations. Audit and test CORS behavior in integration tests.

## Z. Study Questions — 5 recall questions

1. What is middleware and what problem does it solve in web servers?
2. How does the "wrap the inner handler" pattern enable multiple middlewares to process a request?
3. Why should you avoid mutating incoming Request objects inside middleware?
4. How does a CORS preflight OPTIONS request affect middleware design, and how should you respond?
5. In a production system, what are two best practices for logging middleware to improve observability and security?

## Exercise — a practical multi-part coding challenge

Part A: Build a tiny middleware-enabled web pipeline from scratch
- Implement the Request/Response models and a final route handler that supports at least two endpoints:
  - GET /            -> "Welcome" text
  - GET /api/time    -> returns JSON with current time
- Create and wire at least two middlewares:
  - LoggingMiddleware: logs requests and responses to stdout
  - CORSMiddleware: allows origins from a predefined list, handles preflight
- Compose the pipeline so that a Request passes through LoggingMiddleware first, then CORSMiddleware, then the final router.

Part B: Extend with a Router and JSON responses
- Add a router function that returns JSON for /api/time and plain text for /.
- Ensure Content-Type headers are correct for each response.

Part C: Write simple tests (no framework required)
- Test 1: A GET request to / with Origin http://example.com returns 200 and includes Access-Control-Allow-Origin equal to the Origin.
- Test 2: An OPTIONS preflight request to / with Origin http://example.com returns status 204 and has Access-Control-Allow-Methods including GET.
- Test 3: A request with a sensitive header (Authorization) is logged with redaction in the logs (you can simulate by passing a header and asserting the log contains "REDACTED").

Hints
- Reuse or re-create the small pipeline builder from Section 1 to wrap your final handler.
- For testing, you can mock the request object and call the pipeline directly, then inspect the Response object.
- Keep the code organized into modules (e.g., middleware.py, routes.py, app.py) if you expand beyond this exercise.

This completes a compact, practical lesson on middleware in Python, covering the core concepts of logging, CORS, and request pipeline composition within a simple, testable framework.