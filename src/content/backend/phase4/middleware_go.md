# Track: Backend Engineering — Phase 4 — Building Web Servers

Compiling robust web servers in Go hinges on mastering middleware: small, reusable wrappers around your core handlers that address cross-cutting concerns without duplicating code. In this lesson, you’ll learn how to build and compose middleware for logging, CORS, and the overall request pipeline. You’ll see practical examples, line-by-line breakdowns, common beginner pitfalls, and hands-on exercises you can adapt to real systems.

## 1. Understanding Middleware in Go: Why It Matters and How It Works

In Go, middleware are functions that wrap an HTTP handler to add behavior around the request lifecycle. They enable cross-cutting concerns (logging, authentication, CORS, metrics) to be layered in a clean, composable way.

Key ideas:
- Middleware signature: func(http.Handler) http.Handler
- Composition order: outermost vs innermost wrappers
- Predictable control flow: ensure next.ServeHTTP is called unless you intend to short-circuit

Example: a small middleware framework and a simple pipeline

```go
package main

import (
	"log"
	"net/http"
	"time"
)

type Middleware func(http.Handler) http.Handler

// Chain composes a final handler with a list of middlewares.
// The first middleware in the slice becomes the outermost wrapper.
func Chain(final http.Handler, mws ...Middleware) http.Handler {
	// Apply in reverse order so that the first middleware wraps the rest.
	for i := len(mws) - 1; i >= 0; i-- {
		final = mws[i](final)
	}
	return final
}

// A trivial final handler
func helloHandler(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Hello from Go middleware!\n"))
}

func main() {
	// Core handler
	final := http.HandlerFunc(helloHandler)

	// Build a pipeline with no-op middlewares initially
	handler := Chain(final) // empty pipeline

	// Start server
	http.ListenAndServe(":8080", handler)
}
```

### Line-by-line explanation
- type Middleware func(http.Handler) http.Handler
  - Defines the middleware type as a function that takes and returns an http.Handler, enabling composition.
- func Chain(final http.Handler, mws ...Middleware) http.Handler
  - Declares a function to compose the final handler with a list of middlewares.
- for i := len(mws) - 1; i >= 0; i-- { final = mws[i](final) }
  - Applies middlewares in reverse order so that the first in the slice wraps the rest, making the first listed middleware outermost.
- func helloHandler(w http.ResponseWriter, r *http.Request)
  - Simple final handler that writes a response.
- final := http.HandlerFunc(helloHandler)
  - Converts the function to an http.Handler.
- handler := Chain(final)
  - Creates a pipeline with no additional middleware (straight-through) to illustrate the wiring.
- http.ListenAndServe(":8080", handler)
  - Starts the HTTP server on port 8080 using the composed handler.

## 2. Logging Middleware: Observability, Performance, and Safety

Logging middleware records essential request information (method, path, client IP, latency) without modifying business logic. It helps diagnose latency, error conditions, and traffic patterns in production.

Code example: a practical logging middleware plus a tiny example of chaining it

```go
package main

import (
	"log"
	"net/http"
	"time"
)

func LoggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		// Pass control to the next handler in the chain
		next.ServeHTTP(w, r)
		duration := time.Since(start)
		log.Printf("%s %s | From=%s | Duration=%s", r.Method, r.URL.Path, r.RemoteAddr, duration)
	})
}
```

### Line-by-line explanation
- func LoggingMiddleware(next http.Handler) http.Handler
  - Middleware wrapper that takes the next handler and returns a new handler.
- return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
  - Creates a new handler function to fulfill the required interface.
- start := time.Now()
  - Records the request start time for latency calculation.
- next.ServeHTTP(w, r)
  - Invokes the next handler in the chain; crucial for continuing request processing.
- duration := time.Since(start)
  - Computes the total time spent handling the request.
- log.Printf("%s %s | From=%s | Duration=%s", r.Method, r.URL.Path, r.RemoteAddr, duration)
  - Emits a structured log line with method, path, client, and latency.

## 3. CORS Middleware: Security and Cross-Origin Resource Sharing

CORS middleware adds the appropriate response headers to allow or restrict cross-origin requests. It also handles preflight OPTIONS requests used by browsers to probe allowed methods and headers.

Code example: a straightforward CORS middleware with permissive defaults and preflight handling

```go
package main

import (
	"net/http"
)

func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Allow all origins for demonstration; tighten in production
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		// Handle preflight OPTIONS request
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
```

### Line-by-line explanation
- func CORSMiddleware(next http.Handler) http.Handler
  - Defines a CORS middleware wrapper.
- w.Header().Set("Access-Control-Allow-Origin", "*")
  - Sets the explicit CORS header to allow all origins. In production, replace with a safe origin list.
- w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
  - Declares which HTTP methods are allowed for cross-origin requests.
- w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
  - Declares allowed request headers for cross-origin requests.
- if r.Method == http.MethodOptions { w.WriteHeader(http.StatusOK); return }
  - Short-circuits on preflight OPTIONS requests, as browsers expect a 200 with headers.
- next.ServeHTTP(w, r)
  - Proceeds to the next handler in the chain for non-preflight requests.

## 4. Request Pipeline: Ordering, Composition, and Practical Patterns

A well-designed request pipeline layers concerns in a clear order. Typical order:
- Logging (outermost) so you capture the full duration including downstream work
- CORS (applies to all requests)
- Auth/Netrics (authorization, authentication)
- Core business logic

Code example: a multi-middleware pipeline with logging, CORS, and a simple auth check

```go
package main

import (
	"fmt"
	"net/http"
)

func AuthMiddleware(expectedKey string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			code := r.Header.Get("X-API-KEY")
			if code != expectedKey {
				http.Error(w, "Forbidden: invalid API key", http.StatusForbidden)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func finalHandler(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Secure data: you are authenticated!")
}

func main() {
	// Core handler
	final := http.HandlerFunc(finalHandler)

	// Build a pipeline: Logging -> CORS -> Auth -> Final
	// Outermost: Logging, then CORSMiddleware, then Auth, then final handler
	handler := Chain(final,
		LoggingMiddleware,
		CORSMiddleware,
		AuthMiddleware("secret-key-123"),
	)

	// Start server
	http.ListenAndServe(":8080", handler)
}
```

### Line-by-line explanation
- func AuthMiddleware(expectedKey string) func(http.Handler) http.Handler
  - Returns a middleware configured with the expected API key.
- return func(next http.Handler) http.Handler { ... }
  - Higher-order function returning the actual middleware wrapper.
- code := r.Header.Get("X-API-KEY")
  - Reads the API key from the request header.
- if code != expectedKey { http.Error(w, "Forbidden...", http.StatusForbidden); return }
  - Validates the key and short-circuits with 403 if invalid.
- next.ServeHTTP(w, r)
  - Proceeds to the next handler if authentication succeeds.
- finalHandler writes a simple success response.
- handler := Chain(final, LoggingMiddleware, CORSMiddleware, AuthMiddleware("secret-key-123"))
  - Composes the middleware chain with the final handler. Logging is outermost.
- http.ListenAndServe(":8080", handler)
  - Runs the server with the composed pipeline.

## X. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

- Pitfall 1: Failing to call the next handler (short-circuiting unintentionally)
  - Bad:
    - A middleware that handles a request but never calls next, thus bypassing downstream handlers or results.
  - Good:
    - Always call next.ServeHTTP(w, r) unless you know you should terminate the chain, or you explicitly return a response early with an appropriate status.
  - Bad example:
    ```
    func Broken(w http.ResponseWriter, r *http.Request) {
        // Mistake: never call next
        http.Error(w, "Not implemented", http.StatusNotFound)
    }
    ```
  - Good example:
    ```
    func Safe(w http.ResponseWriter, r *http.Request, next http.Handler) {
        // do something
        next.ServeHTTP(w, r)
    }
    ```

- Pitfall 2: Not handling OPTIONS (CORS preflight) correctly
  - Bad:
    - Always forwarding preflight OPTIONS requests to business logic.
  - Good:
    - Short-circuit OPTIONS with 200 and the proper CORS headers.
  - Bad example:
    ```
    func MyCORS(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.Header().Set("Access-Control-Allow-Origin", "*")
            next.ServeHTTP(w, r)
        })
    }
    ```
  - Good example (from the lesson):
    - Includes explicit handling of OPTIONS before next.ServeHTTP.

- Pitfall 3: Logging too late or mutating response in a way that breaks downstreams
  - Bad:
    - Measuring time after next.ServeHTTP but then writing to the response writer (which is already used by downstream).
  - Good:
    - Record start time, call next.ServeHTTP, then compute duration (without altering the response after the fact unless you wrap the writer to capture status codes).
  - Bad example:
    ```
    func BrokenLog(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            next.ServeHTTP(w, r)
            // If you modify headers after, or write again, may cause issues
            log.Println("done")
        })
    }
    ```
  - Good example:
    - Measure duration and log without interfering with the response stream.

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Observability: Logging middleware provides visibility into latency, throughput, error rates, and endpoints. It’s a foundation for tracing and monitoring.
- Security and Compliance: CORS configuration is essential for controlling cross-origin access, preventing unauthorized front-ends from talking to your APIs. Authentication middleware enforces access controls.
- Maintainability and Reuse: Middleware make cross-cutting concerns reusable across routes and services. Teams can build common middleware libraries to enforce consistency.
- Performance and Correctness: Proper ordering matter—placing logging outermost helps capture full request time, while CORS must respond quickly to preflight requests to avoid client timeouts.
- Testing and Reliability: Middleware can be tested in isolation (unit tests) and integrated in end-to-end tests for the full request pipeline. Consider panic recovery middleware and metrics too.

## Z. Study Questions — 5 Recall Questions

1. What is middleware in Go, and how does the http.Handler chain enable cross-cutting concerns?
2. How does the Chain function determine the order in which middlewares are applied?
3. Why is handling preflight OPTIONS requests important in a CORS middleware?
4. In what order should you typically place logging, CORS, authentication, and business-logic middlewares, and why?
5. What are common mistakes when implementing middleware, and how can you guard against them?

## Exercise — Practical Multi-Part Coding Challenge

Part A: Build a minimal server with a middleware pipeline
- Create a self-contained Go program using net/http.
- Implement a middleware chain like in the lesson (LoggingMiddleware, CORSMiddleware).
- Expose a simple endpoint /status that returns JSON {"status":"ok"}.

Code scaffold to implement (fill in the missing parts):

```go
package main

import (
	"encoding/json"
	"net/http"
)

type Middleware func(http.Handler) http.Handler

func Chain(final http.Handler, mws ...Middleware) http.Handler {
	// Implement as shown in the lesson
	for i := len(mws) - 1; i >= 0; i-- {
		final = mws[i](final)
	}
	return final
}

func LoggingMiddleware(next http.Handler) http.Handler {
	// Implement as shown in the lesson (or reuse from the lesson)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// naive implementation for brevity
		next.ServeHTTP(w, r)
	})
}

func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func statusHandler(w http.ResponseWriter, r *http.Request) {
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func main() {
	final := http.HandlerFunc(statusHandler)
	// Pipeline: Logging -> CORS -> Final
	handler := Chain(final, LoggingMiddleware, CORSMiddleware)

	http.ListenAndServe(":8080", handler)
}
```

Part B: Extend with authentication
- Add an AuthMiddleware that expects a header X-API-KEY with a known value (e.g., "letmein") and returns 403 otherwise.
- Compose it into the pipeline so that unauthorized requests don’t reach the status endpoint.

Part C: Add a panic-recovery middleware
- Implement RecoverMiddleware that recovers from panics in downstream handlers and returns a 500 with a JSON error.
- Integrate it into the chain and test by adding a handler that deliberately panics when /panic is requested.

Part D: Test and verification
- Run the server and verify:
  - GET /status returns {"status":"ok"} and logs the request.
  - CORS headers are present on responses and OPTIONS preflight returns 200.
  - With header X-API-KEY: letmein, you get 200 from /status; with a different key or none, you get 403.
  - Accessing /panic returns a 500 with a JSON error message.
- Optional: add a simple go test that asserts the middleware chain preserves response status and headers for a known route.

Notes
- All code samples use only the Go standard library.
- In real systems, you’d want to turn on structured logging, integrate with a logger library, and consider rate limiting, request IDs, and distributed tracing in your middleware suite.