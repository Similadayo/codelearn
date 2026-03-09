# Track: Backend Engineering — Phase 4 — Building Web Servers: Error Handling in APIs — Consistent Responses (Go)

In modern backend systems, every API call should produce a predictable, well-structured response—even when things go wrong. Consistent error handling improves developer productivity, reduces integration friction for clients, aids debugging, and boosts observability in production. In Go, you can design a stable error envelope, centralize error handling, and map business errors to precise HTTP status codes while guarding sensitive details. This lesson walks through practical patterns, concrete code, and real-world trade-offs to help you build robust APIs.

## 1. Designing a Standard API Error Format

Design a single, predictable envelope for both success and error responses. A common pattern is a top-level JSON object with a status, optional data, and an optional error object. This makes client code simpler and improves observability.

Code example (standalone snippet; can be placed in its own file or shared package):

```go
package main

import (
	"encoding/json"
	"net/http"
)

type APIError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

type APIResponse struct {
	Status string      `json:"status"`        // "success" or "error"
	Data   interface{} `json:"data,omitempty"`  // present on success
	Error  *APIError   `json:"error,omitempty"` // present on error
}

// respondSuccess writes a success envelope with data
func respondSuccess(w http.ResponseWriter, data interface{}, status int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	resp := APIResponse{
		Status: "success",
		Data:   data,
	}
	_ = json.NewEncoder(w).Encode(resp)
}

// respondError writes a consistent error envelope
func respondError(w http.ResponseWriter, status int, code string, message string, details string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	resp := APIResponse{
		Status: "error",
		Error: &APIError{
			Code:    code,
			Message: message,
			Details: details,
		},
	}
	_ = json.NewEncoder(w).Encode(resp)
}
```

### Line-by-line explanation

- Line 1 defines the package as main for a runnable example.
- Lines 4-9 import the json encoder and HTTP utilities.
- Lines 11-17 declare APIError with Code, Message, and optional Details for rich error context without leaking stack traces.
- Lines 19-26 declare APIResponse as a stable envelope with Status, optional Data, and optional Error.
- Lines 28-37 implement respondSuccess:
  - Sets Content-Type to application/json.
  - Writes the HTTP status code.
  - Builds a success envelope with Status: "success" and the provided Data.
  - Encodes the envelope to JSON.
- Lines 39-51 implement respondError:
  - Sets Content-Type to application/json.
  - Writes the HTTP status code.
  - Builds an error envelope with Status: "error" and a nested APIError.
  - Encodes the envelope to JSON.

## 2. Centralized Error Handling with Middleware in net/http

Go’s net/http has no built-in middleware pattern, but you can create a lightweight wrapper that converts errors into consistent API responses. This section shows a pattern where handlers return an error, and a small wrapper translates that error into an API envelope. This keeps business logic clean and ensures uniform client-facing errors.

Code example (standalone snippet; builds on the envelope from Section 1):

```go
package main

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
)

type AppHandler func(http.ResponseWriter, *http.Request) error

type HTTPError struct {
	StatusCode int
	Code       string
	Message    string
	Details    string
}

func (e *HTTPError) Error() string { return e.Message }

// ServeHTTP allows AppHandler to be used as a standard http.Handler
func (fn AppHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if err := fn(w, r); err != nil {
		var he *HTTPError
		// If the error is a structured HTTPError, map fields to envelope
		if errors.As(err, &he) {
			respondError(w, he.StatusCode, he.Code, he.Message, he.Details)
		} else {
			// Unexpected error: log internally, return generic message
			log.Printf("unexpected error: %v", err)
			respondError(w, http.StatusInternalServerError, "internal_error", "Internal server error", "")
		}
	}
}

// Example handler that uses the centralized error pattern
func pingHandler(w http.ResponseWriter, r *http.Request) error {
	respondSuccess(w, map[string]string{"message": "pong"}, http.StatusOK)
	return nil
}

func main() {
	mux := http.NewServeMux()
	mux.Handle("/ping", AppHandler(pingHandler))
	http.ListenAndServe(":8080", mux)
}
```

### Line-by-line explanation

- Lines 1-6 declare the package and import necessary modules (JSON, errors, logging, HTTP).
- Lines 8-10 declare AppHandler as a function type that returns an error.
- Lines 12-19 define HTTPError, a structured error with an HTTP status, a machine-readable Code, a human Message, and optional Details for debugging.
- Line 21 implements Error() so HTTPError satisfies the error interface.
- Lines 24-38 define the ServeHTTP method on AppHandler to act as a router wrapper:
  - Calls the underlying handler; if an error is returned, it is inspected.
  - If the error is an HTTPError, it maps to the envelope with the provided status/code/message/details.
  - If it’s an unknown error, it logs it and returns a generic 500 response to avoid leaking internals.
- Lines 41-46 provide a simple example handler that returns a success envelope.
- Lines 48-52 wire the HTTP server to expose /ping using the AppHandler wrapper.

## 3. Handling Validation, Not Found, and Conflicts with Unified Errors

In production APIs, you’ll return 400 for validation errors, 404 for not found, 409 for conflicts, and 500 for unexpected failures. This section shows a small server with endpoints that demonstrate validation (bad input), not found resources, and safe, consistent error responses.

Code example (standalone snippet; uses the pattern from Sections 1 and 2):

```go
package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

var users = map[string]map[string]string{
	"1": {"id": "1", "name": "Ada"},
}

func getUserByID(w http.ResponseWriter, r *http.Request) error {
	// path format: /users/{id}
	parts := strings.Trim(r.URL.Path, "/")
	segments := strings.Split(parts, "/")
	if len(segments) != 2 || segments[0] != "users" {
		return &HTTPError{StatusCode: http.StatusNotFound, Code: "not_found", Message: "Resource not found"}
	}
	id := segments[1]
	if u, ok := users[id]; ok {
		returned := map[string]string{"id": u["id"], "name": u["name"]}
		respondSuccess(w, returned, http.StatusOK)
		return nil
	}
	return &HTTPError{StatusCode: http.StatusNotFound, Code: "not_found", Message: "User not found"}
}

func createUser(w http.ResponseWriter, r *http.Request) error {
	if r.Method != http.MethodPost {
		return &HTTPError{StatusCode: http.StatusMethodNotAllowed, Code: "method_not_allowed", Message: "Method not allowed"}
	}
	var payload struct {
		Name string `json:"name"`
	}
	dec := json.NewDecoder(r.Body)
	if err := dec.Decode(&payload); err != nil {
		return &HTTPError{StatusCode: http.StatusBadRequest, Code: "invalid_json", Message: "Invalid JSON body"}
	}
	if strings.TrimSpace(payload.Name) == "" {
		return &HTTPError{StatusCode: http.StatusBadRequest, Code: "validation_error", Message: "Name is required"}
	}
	// Simple ID generation for demonstration
	newID := "2"
	users[newID] = map[string]string{"id": newID, "name": payload.Name}
	respondSuccess(w, map[string]string{"id": newID, "name": payload.Name}, http.StatusCreated)
	return nil
}

func main() {
	mux := http.NewServeMux()
	mux.Handle("/users/", AppHandler(getUserByID))
	mux.Handle("/users", AppHandler(createUser))
	http.ListenAndServe(":8080", mux)
}
```

### Line-by-line explanation

- Lines 1-6 declare the package and import encoding/json, net/http, and strings.
- Lines 8-12 define a simple in-memory user store for demonstration.
- Lines 14-32 implement getUserByID:
  - Extracts path segments to validate the format /users/{id}.
  - If format is wrong, returns not_found.
  - If the user exists, returns the user object via respondSuccess; otherwise returns not_found.
- Lines 34-50 implement createUser:
  - Ensures the request method is POST; otherwise returns method_not_allowed.
  - Decodes the JSON body into a payload struct.
  - Validates that Name is non-empty; otherwise returns validation_error.
  - Creates a new user in the in-memory store and returns the created resource with status Created.
- Lines 52-57 wire the handlers and start the HTTP server.

## 4. Observability and Safe Logging: Correlation IDs and Redacting Details

In production, you should correlate client requests across services, redact sensitive details from user-facing responses, and log context-rich messages. A minimal approach is to propagate a correlation ID via a request header, include it in logs, and expose it in error payloads for traceability.

Code snippet illustrating correlation ID integration (expand Section 2’s pattern):

```go
package main

import (
	"context"
	"log"
	"net/http"
	"github.com/google/uuid"
)

type ctxKey string
const correlationIDKey ctxKey = "correlation_id"

func withCorrelationID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		cid := r.Header.Get("X-Correlation-Id")
		if cid == "" {
			cid = uuid.New().String()
		}
		ctx := context.WithValue(r.Context(), correlationIDKey, cid)
		// Log with correlation context
		log.Printf("correlation_id=%s method=%s path=%s", cid, r.Method, r.URL.Path)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

Line-by-line explanation would be lengthy here, but the key points:
- A unique correlation ID is generated if not supplied by the client.
- The ID is stored in the request context for downstream logging and error envelopes.
- Logs include the correlation ID to trace requests across services.
- When returning errors, you can safely include the correlation ID in Details or in a top-level header for clients to use in support tickets.

Note: To keep the lesson concise, this section shows the pattern; you can integrate correlation IDs with the API envelope (e.g., include the ID in APIResponse.Error.Details or in a top-level "trace" field) as needed.

## X. Common Beginner Mistakes — 3+ Real Pitfalls with Bad vs Good Code (Side-by-side)

- Pitfall 1: Revealing internal error details to clients
  - Bad:
    ```go
    func handler(w http.ResponseWriter, r *http.Request) {
        // some error occurs
        http.Error(w, err.Error(), http.StatusInternalServerError)
    }
    ```
  - Good:
    ```go
    func handler(w http.ResponseWriter, r *http.Request) {
        // Do not reveal err details
        respondError(w, http.StatusInternalServerError, "internal_error", "Internal server error", "")
    }
    ```

- Pitfall 2: Inconsistent error shapes between endpoints
  - Bad:
    ```go
    // On error
    w.WriteHeader(http.StatusBadRequest)
    w.Write([]byte(`{"error":"invalid input"}`)) // plain string vs envelope
    ```
  - Good:
    ```go
    respondError(w, http.StatusBadRequest, "invalid_input", "Invalid input", "field 'name' is required")
    ```

- Pitfall 3: Using the wrong HTTP status for a failure
  - Bad:
    ```go
    // Validation failed but returns 200
    w.WriteHeader(http.StatusOK)
    respondJSON(w, map[string]string{"error": "name required"})
    ```
  - Good:
    ```go
    respondError(w, http.StatusBadRequest, "validation_error", "Name is required", "")
    ```

- Pitfall 4: Not handling panics or unexpected errors
  - Bad:
    ```go
    func handler(w http.ResponseWriter, r *http.Request) {
        panic("something went wrong")
    }
    ```
  - Good:
    ```go
    // Use a recover-friendly middleware (see Section 2 pattern)
    func main() {
        // setup server with middleware that recovers and returns 500 envelope
    }
    ```

- Pitfall 5: Skipping content-type headers
  - Bad:
    ```go
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"ok"}`)) // no content-type
    ```
  - Good:
    ```go
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(APIResponse{Status: "success", Data: data})
    ```

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Client stability and contract: A fixed error envelope makes it easier for frontends, mobile apps, and third-party integrations to parse and react to errors consistently.
- Faster debugging: Structured errors with codes (e.g., not_found, validation_error, internal_error) let you quickly identify failure modes without inspecting logs.
- Observability and tracing: Correlation IDs enable end-to-end tracing across microservices, dashboards, and incident investigations.
- Security and privacy: Do not leak internal stack traces, database IDs, or internal config; provide safe messages and a details field that can be guarded behind proper access controls.
- Testing and reliability: Consistent responses simplify contract tests and contract-driven development. You can write tests that assert both success envelopes and error envelopes.

## Z. Study Questions — 5 Recall Questions

1) What are the essential fields of a consistent API error envelope, and why are they useful?  
2) How does the AppHandler pattern in Go help centralize error handling for HTTP routes?  
3) What HTTP status codes would you map to: a) validation failure, b) missing resource, c) server-side failure?  
4) Why should you avoid sending internal error details to clients, and where can you keep those details safely?  
5) How can correlation IDs improve production tracing, and how would you propagate them through your API?

## Exercise — A practical multi-part coding challenge

Goal: Build a small Go API server that uses a consistent error envelope, demonstrates common error mappings, and supports basic CRUD-like behavior for a "books" resource. You will implement an AppHandler-based error wrapper, a stable error envelope, and endpoints that return consistent responses.

Part 1 — Setup
- Create a new directory for the project and initialize a Go module.
  - go mod init backend-phase4
- Create a main.go file and implement the code from Sections 1–3 (envelopes, AppHandler, HTTPError).

Part 2 — Implement a Books API with Consistent Errors
- In-memory store:
  - books := map[string]map[string]string{"1": {"id": "1", "title": "Go in Action", "author": "William Kennedy"}}
- Endpoints:
  - GET /books/{id} -> fetch a book by id or return 404 with a consistent error envelope.
  - POST /books -> create a new book; accept JSON {"title": "...", "author": "..."}; on missing fields return 400 with a validation_error.
  - GET /ping -> simple health check returning a success envelope (for quick manual verification).
- Use the AppHandler wrapper and the unified response helpers.

Part 3 — Run and Test
- Run the server:
  - go run main.go
- Test with curl:
  - curl -i http://localhost:8080/ping
  - curl -i http://localhost:8080/books/1
  - curl -i -X POST -H "Content-Type: application/json" -d '{"title":"Untitled","author":"Anon"}' http://localhost:8080/books
  - curl -i http://localhost:8080/books/999 (expect 404 not_found)

Part 4 — Extend and Reflect
- Add a simple middleware (as in Section 4) to attach a correlation ID to logs and the error payloads.
- Ensure that your error payloads never leak internal error details.

Notes
- The code samples in this lesson are designed to be modular: sections can be combined into a single runnable service, or studied independently to understand each pattern.
- In a real project, you would extract the error envelope types, respond helpers, and AppHandler/wrapper into a shared package (e.g., package apiutil) to be reused across services.

If you want, I can provide a complete runnable main.go file that compiles as-is for Part 1, Part 2, and Part 3, or tailor the exercise to a specific repository structure you’re using.