# Phase 4 — Building Web Servers: Middleware — Logging, CORS, and Request Pipeline (Java)

Middleware is the connective tissue of web servers: small, reusable components that intercept, transform, or augment requests and responses as they flow through a pipeline. Logging provides observability, CORS ensures cross-origin requests are intentional and secure, and the request pipeline organizes how requests are dispatched to handlers. In professional backend work, you’ll rarely write a single monolithic handler; you’ll compose middleware to enforce policies, capture metrics, and route traffic in a scalable, testable way. This lesson shows how to implement a lightweight middleware pattern in Java using the standard library, focusing on logging, CORS, and the request pipeline.

## 1. Building a Minimal Middleware-backed Web Server in Java

This section provides a self-contained, minimal example that demonstrates the core concepts: a RequestContext, a Middleware interface, a MiddlewareChain to advance through the pipeline, a couple of middleware implementations (Logging and CORS), and a simple Router/Handler that serves a time endpoint. It uses Java’s built-in HttpServer for portability and clarity.

```java
import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.Date;
import java.util.concurrent.Executors;
import java.time.Instant;

public class WebServerWithMiddleware {

    // Lightweight per-request context
    static class RequestContext {
        HttpExchange exchange;
        int statusCode = 200; // default to 200, can be changed by handlers
        Map<String, Object> attributes = new HashMap<>();
    }

    // Core middleware contract
    interface Middleware {
        void handle(RequestContext ctx, MiddlewareChain chain) throws IOException;
    }

    // Final request handler contract
    interface Handler {
        void handle(RequestContext ctx) throws IOException;
    }

    // Simple chain that lets middleware run in order and finally invoke the handler
    static class MiddlewareChain {
        private final List<Middleware> chain;
        private final Handler finalHandler;
        private int index = 0;

        MiddlewareChain(List<Middleware> chain, Handler finalHandler) {
            this.chain = chain;
            this.finalHandler = finalHandler;
        }

        void next(RequestContext ctx) throws IOException {
            if (index < chain.size()) {
                Middleware m = chain.get(index++);
                m.handle(ctx, this);
            } else {
                finalHandler.handle(ctx);
            }
        }
    }

    // 2. Logging middleware: records request details and latency
    static class LoggingMiddleware implements Middleware {
        @Override
        public void handle(RequestContext ctx, MiddlewareChain chain) throws IOException {
            long start = System.currentTimeMillis();
            chain.next(ctx);
            long duration = System.currentTimeMillis() - start;
            String path = ctx.exchange.getRequestURI().toString();
            System.out.println(String.format("[%s] %s %s -> %d (%d ms)",
                    new Date(), ctx.exchange.getRequestMethod(), path, ctx.statusCode, duration));
        }
    }

    // 3. CORS middleware: attaches permissive headers and handles preflight (OPTIONS)
    static class CorsMiddleware implements Middleware {
        private final String allowedOrigins;

        CorsMiddleware(String origins) {
            this.allowedOrigins = origins;
        }

        @Override
        public void handle(RequestContext ctx, MiddlewareChain chain) throws IOException {
            HttpExchange ex = ctx.exchange;
            // Attach CORS headers up-front
            ex.getResponseHeaders().set("Access-Control-Allow-Origin", allowedOrigins);
            ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");

            // Preflight handling
            if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) {
                ex.sendResponseHeaders(204, -1);
                return;
            }

            chain.next(ctx);
        }
    }

    // 4. A simple handler that returns current time in JSON
    static class TimeApiHandler implements Handler {
        @Override
        public void handle(RequestContext ctx) throws IOException {
            HttpExchange ex = ctx.exchange;
            String json = "{\"time\":\"" + Instant.now().toString() + "\"}";
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            ex.getResponseHeaders().set("Content-Type", "application/json");
            ex.sendResponseHeaders(ctx.statusCode, bytes.length);
            try (OutputStream os = ex.getResponseBody()) {
                os.write(bytes);
            }
        }
    }

    public static void main(String[] args) throws Exception {
        // Setup the server
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);
        // Build the pipeline: CORS -> Logging -> final handler
        List<Middleware> middlewares = Arrays.asList(
                new CorsMiddleware("*"),
                new LoggingMiddleware()
        );
        Handler finalHandler = new TimeApiHandler();

        // Route: /time
        server.createContext("/time", exchange -> {
            RequestContext ctx = new RequestContext();
            ctx.exchange = exchange;
            MiddlewareChain chain = new MiddlewareChain(middlewares, finalHandler);
            try {
                chain.next(ctx);
            } catch (IOException e) {
                // Basic error handling
                ctx.statusCode = 500;
                exchange.sendResponseHeaders(500, -1);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write("Internal Server Error".getBytes(StandardCharsets.UTF_8));
                }
            }
        });

        server.setExecutor(Executors.newFixedThreadPool(10));
        server.start();
        System.out.println("Server listening on http://localhost:8080/time");
    }
}
```

### Line-by-line explanation
- Line 1-6: Import necessary classes for HTTP server, IO, networking, collections, and time utilities.
- Line 10-14: Define a per-request context to store the HttpExchange, a default HTTP status code, and a generic attributes map for middleware to share data.
- Line 17-21: Define the Middleware interface representing a single step in the pipeline.
- Line 24-28: Define the Handler interface representing the final request processor.
- Line 31-40: Implement MiddlewareChain to progress through middleware and finally call the final handler.
- Line 42-58: Implement LoggingMiddleware to measure latency and print a line with method, path, status, and duration after the request has been processed.
- Line 61-83: Implement CorsMiddleware to attach CORS headers for every response and to handle OPTIONS preflight by returning 204 with no body.
- Line 86-98: Implement TimeApiHandler to respond with a small JSON payload containing the server time.
- Line 101-122: Set up the HttpServer, compose the middleware pipeline, wire the /time route to the pipeline, and start listening.

## 2. Logging Middleware Details and Practical Considerations

This section focuses on the logging aspect, showing a focused snippet that can be extracted and reused in your projects. The snippet assumes you have the RequestContext and MiddlewareChain from Section 1.

```java
// Focused LoggingMiddleware example (extractable)
static class LoggingMiddleware implements Middleware {
    @Override
    public void handle(RequestContext ctx, MiddlewareChain chain) throws IOException {
        long start = System.currentTimeMillis();
        chain.next(ctx);
        long duration = System.currentTimeMillis() - start;
        String path = ctx.exchange.getRequestURI().toString();
        System.out.println(String.format("[%s] %s %s -> %d (%d ms)",
                new Date(), ctx.exchange.getRequestMethod(), path, ctx.statusCode, duration));
    }
}
```

### Line-by-line explanation
- Line 1: Declares a class implementing Middleware for logging purposes.
- Line 2-3: Method signature required by the Middleware interface, taking a RequestContext and a chain.
- Line 4: Record the start time before processing.
- Line 5: Forward the request to the next middleware or final handler.
- Line 6-7: Compute duration and extract the request path for logging.
- Line 8: Print a structured log line including timestamp, method, path, response status, and latency.

## 3. CORS Middleware and Preflight Handling

This section isolates a CORS middleware example, showing how to attach headers and correctly respond to preflight OPTIONS requests. This snippet also assumes the shared infrastructure from Section 1.

```java
static class CorsMiddleware implements Middleware {
    private final String allowedOrigins;

    CorsMiddleware(String origins) {
        this.allowedOrigins = origins;
    }

    @Override
    public void handle(RequestContext ctx, MiddlewareChain chain) throws IOException {
        HttpExchange ex = ctx.exchange;
        ex.getResponseHeaders().set("Access-Control-Allow-Origin", allowedOrigins);
        ex.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        ex.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");

        // Handle CORS preflight requests
        if ("OPTIONS".equalsIgnoreCase(ex.getRequestMethod())) {
            ex.sendResponseHeaders(204, -1);
            return;
        }

        chain.next(ctx);
    }
}
```

### Line-by-line explanation
- Line 1: Defines CorsMiddleware implementing the Middleware interface.
- Line 2-4: Store the allowed origins (could be "*" for public) via constructor.
- Line 7-14: On handling a request, set the standard CORS headers on the response.
- Line 16-20: If the request method is OPTIONS (preflight), respond with 204 and no body, bypassing the final handler.
- Line 22: If not a preflight, continue down the pipeline by calling chain.next(ctx).

## 4. Putting It All Together: Request Pipeline and Routing Patterns

In real systems, you’ll implement more sophisticated routing and possibly separate the pipeline from the HTTP server. Here we show a concise pattern you can adapt:

- Define a shared RequestContext that carries request data across middleware.
- Use a MiddlewareChain that persists per-request state and preserves order.
- Place cross-cutting concerns (logging, CORS, metrics) early in the chain.
- Implement a Router/Handler as the final stage to dispatch to endpoints.

Code sketch (conceptual; reuse from Section 1 for a working example):
- Create a list of middleware: [CorsMiddleware, LoggingMiddleware, MetricsMiddleware, AuthMiddleware, …]
- Create a final Handler per route (e.g., TimeApiHandler for /time, EchoHandler for /echo).
- For each route, instantiate a MiddlewareChain with the same middlewares and a route-specific final handler.

Note: The full working example in Section 1 demonstrates how to wire these pieces together for a concrete route. For production-grade servers, you would typically integrate with a real framework (Spring Boot, Micronaut, Quarkus) that already provides robust middleware concepts and better routing and testing tooling. The value here is to understand the mechanics of how a request travels through a chain of concerns and how to implement and compose your own middleware in Java without a framework.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Misplacing CORS handling in the final handler instead of a dedicated middleware.
  - Bad:
    - Each endpoint manually handles OPTIONS; headers may be inconsistent across routes.
  - Good:
    - A dedicated CorsMiddleware runs for every request, ensuring consistent headers and correct preflight responses.

Bad
```java
// Inside a route handler
if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
  exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
  exchange.sendResponseHeaders(204, -1);
  return;
}
exchange.getResponseHeaders().set("Content-Type", "application/json");
// handle rest of request
```

Good
```java
// Centralized in CorsMiddleware (see Section 3)
```

- Pitfall 2: Logging in every handler instead of a single, consistent logging middleware.
  - Bad:
    - Each endpoint prints logs; you end up duplicating logic and missing latency metrics when a route changes.
  - Good:
    - A single LoggingMiddleware captures method, path, status, and latency for all routes.

Bad
```java
exchange.getResponseHeaders().set("Content-Type", "application/json");
exchange.sendResponseHeaders(200, bytes.length);
System.out.println("[LOG] " + exchange.getRequestMethod() + " " + exchange.getRequestURI());
```

Good
```java
// Use LoggingMiddleware as shown in Section 2
```

- Pitfall 3: Incorrect middleware order, leading to missing headers or late logging.
  - Bad:
    - Logging runs after final handler, so you don’t capture the right lifecycle, or CORS headers aren’t present for preflight.
  - Good:
    - Place CORS first (to handle preflight) and then Logging (to capture full lifecycle).

Bad
```java
List<Middleware> middlewares = Arrays.asList(new LoggingMiddleware(), new CorsMiddleware("*"));
```

Good
```java
List<Middleware> middlewares = Arrays.asList(new CorsMiddleware("*"), new LoggingMiddleware());
```

- Pitfall 4: Not sharing state safely between middleware (thread-safety and per-request isolation).
  - Bad:
    - Storing per-request data in a static or global object without per-request isolation.
  - Good:
    - Use a per-request RequestContext instance passed through the chain; do not use shared mutable state.

Bad
```java
static int requestCount = 0; // shared and not thread-safe
```

Good
```java
RequestContext ctx = new RequestContext(); // per-request
```

- Pitfall 5: Overusing synchronous I/O or blocking in critical sections.
  - Bad:
    - Heavy synchronous work in the middleware can slow all requests.
  - Good:
    - Use asynchronous patterns or offload heavy work to a thread pool where appropriate; keep middleware lightweight.

Bad
```java
// Do heavy DB work directly in Middleware
```

Good
```java
// Keep middleware fast; delegate heavy work to background tasks or dedicated services
```

## Y. Why This Matters In Real Systems — production context and real usage

- Observability and troubleshooting: Centralized logging via a consistent middleware pattern makes it easier to trace requests across services, debug latency issues, and correlate logs with metrics and traces in distributed systems.
- Security and policy enforcement: CORS is a policy decision that must be enforced consistently across all endpoints. A dedicated middleware ensures that all routes conform to the same policy and reduces the risk of misconfigurations.
- Modularity and maintainability: A clean request pipeline separates concerns (authentication, rate limiting, routing, telemetry). This makes it easier to maintain, test, and extend the server as requirements evolve.
- Performance and scalability: A lightweight, non-blocking approach (or appropriately offloading work) in middleware reduces contention and helps the server scale under load. Thread pools and efficient logging reduce TLS overhead, GC pressure, and context-switching overhead in high-traffic environments.
- Real-world usage: In production, you often pair this approach with a framework (Spring Boot, Micronaut) that provides well-tested middleware concepts, auto-configuration for CORS, metrics, tracing, and robust test coverage. The value of this lesson is understanding how the building blocks work so you can reason about, extend, or adapt middleware in any stack.

## Z. Study Questions — 5 recall questions

1) What is middleware in the context of a web server, and how does it relate to the request pipeline?
2) How does a CORS preflight OPTIONS request work, and why should it be handled by middleware rather than per-route logic?
3) Why is the order of middleware important? Provide a scenario where changing the order breaks behavior.
4) How can you ensure you log the response status for a request when using a pipeline?
5) What are the advantages of keeping per-request state in a RequestContext object rather than in static fields?

## Exercise — a practical multi-part coding challenge

Goal: Extend the lightweight Java middleware server to support more routes, add a rate-limiting middleware, and demonstrate a cleaner, more testable pipeline.

Part A: Add an additional route /api/time that returns the current time (already included in Section 1). Also add /api/echo that echoes a query parameter as JSON.
- Extend TimeApiHandler to handle both /time and /echo
- For /echo, read a query parameter msg and respond with {"echo":"<msg>"} or {"echo":""} if missing
- Ensure Content-Type is application/json for both

Part B: Implement a RateLimitMiddleware that limits requests per IP to N requests per minute (simple in-memory map, not suitable for production, but good for learning)
- Use a Map<String, Long> to track the timestamp of the last minute’s first request and a counter per IP
- If the count exceeds the limit within the minute window, respond with 429 Too Many Requests and a small JSON body: {"error":"rate-limited"}

Part C: Wire the new middleware into the pipeline and add a new route /time that uses the full chain (Cors, Logging, RateLimit)
- Update the server to apply the RateLimitMiddleware globally or per-route as you prefer

Part D: Run and verify
- Start the server and test with curl:
  - curl -i http://localhost:8080/time
  - curl -i http://localhost:8080/echo?msg=hello
  - Try rapid repeated calls to /time to trigger rate-limiting after N requests per minute
- Observe the console logs produced by LoggingMiddleware and inspect headers for CORS

Deliverables:
- A self-contained Java file (or files) implementing the described middleware and routes
- Brief notes on how you would test rate limiting in a distributed environment (mock external clocks, per-instance counters, etc.)
- Brief rationale for any design decisions you made (e.g., early CORS vs late, synchronous vs asynchronous, per-route vs global middleware)

Note: The provided examples are intentionally lightweight and focused on teaching middleware concepts, not production-grade architecture. In real systems, you would likely migrate this pattern to a framework that supports advanced routing, dependency injection, and robust testing.