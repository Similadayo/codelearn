# Track: Backend Engineering — Phase 4 — Building Web Servers
## Topic: Routing — URL Design and Path Parameters in Go (Golang)

Routing is the mechanism that maps incoming HTTP requests to the code that will handle them. Proper URL design and clean path parameter handling are foundational skills for building scalable, maintainable backends. In Go, you can start with a lightweight, custom router using the standard library or opt for battle-tested libraries like gorilla/mux for advanced features. This lesson covers designing RESTful routes, extracting path parameters, and implementing robust routing in Go.

## 1. URL Design Principles
- Treat URLs as nouns representing resources (e.g., /users, /articles) rather than actions (e.g., /getUser).
- Use hierarchical, versioned paths when evolving APIs (e.g., /v1/users/{id}, /v2/users/{id}).
- Prefer path parameters for required identifiers and query parameters for optional filters.
- Keep routes stable and backward-compatible when possible; plan deprecations with care.
- Be mindful of encoding and validation to prevent security issues and bugs.

## 2. Implementing Path Parameters in Go with a Minimal Router (net/http)

Code demonstrates a compact router built on top of net/http that supports path parameters like /users/{id} and /articles/{category}/{id}.

```go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
)

type pathParamsKey struct{}
var pathParamsCtxKey = pathParamsKey{}

type Router struct {
	routes []route
}
type route struct {
	method  string
	pattern string
	handler http.HandlerFunc
}

func (rt *Router) Handle(method, pattern string, handler http.HandlerFunc) {
	rt.routes = append(rt.routes, route{method, pattern, handler})
}

func (rt *Router) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	for _, rr := range rt.routes {
		if rr.method != "" && rr.method != r.Method {
			continue
		}
		params, ok := matchPattern(r.URL.Path, rr.pattern)
		if ok {
			ctx := context.WithValue(r.Context(), pathParamsCtxKey, params)
			rr.handler.ServeHTTP(w, r.WithContext(ctx))
			return
		}
	}
	http.NotFound(w, r)
}

func matchPattern(path, pattern string) (map[string]string, bool) {
	pParts := strings.Split(strings.Trim(pattern, "/"), "/")
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	if len(pParts) != len(pathParts) {
		return nil, false
	}
	params := make(map[string]string)
	for i := range pParts {
		if strings.HasPrefix(pParts[i], "{") && strings.HasSuffix(pParts[i], "}") {
			key := pParts[i][1 : len(pParts[i])-1]
			params[key] = pathParts[i]
		} else if pParts[i] != pathParts[i] {
			return nil, false
		}
	}
	return params, true
}

func getPathParams(r *http.Request) map[string]string {
	if v := r.Context().Value(pathParamsCtxKey); v != nil {
		return v.(map[string]string)
	}
	return nil
}

func userHandler(w http.ResponseWriter, r *http.Request) {
	params := getPathParams(r)
	id := params["id"]
	fmt.Fprintf(w, "User ID: %s\n", id)
}

func articleHandler(w http.ResponseWriter, r *http.Request) {
	params := getPathParams(r)
	category := params["category"]
	id := params["id"]
	fmt.Fprintf(w, "Article Category: %s, ID: %s\n", category, id)
}

func main() {
	r := &Router{}
	r.Handle("GET", "/users/{id}", userHandler)
	r.Handle("GET", "/articles/{category}/{id}", articleHandler)

	log.Println("Starting server on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
```

### Line-by-line explanation
- Line 1-3: package and imports; includes context, fmt, log, net/http, strings for routing logic.
- Lines 5-7: define a private type pathParamsKey and a package-level variable pathParamsCtxKey to use as a context key (avoids collisions).
- Lines 9-14: define Router (a collection of routes) and route (method, pattern, and handler) structures.
- Lines 16-19: Router.Handle appends a new route to the router.
- Lines 21-34: Router.ServeHTTP iterates routes, filters by HTTP method, and attempts to match the request path to the route pattern. On success, it injects path parameters into the request context and invokes the handler; otherwise, it returns 404.
- Lines 36-52: matchPattern splits both the request path and route pattern, validates length, and extracts path parameters when pattern segments are in {param} form. Returns the parameters map and a boolean indicating a match.
- Lines 54-61: getPathParams retrieves path parameters from the request context.
- Lines 63-69: userHandler reads the id parameter and responds with a simple string.
- Lines 71-78: articleHandler reads category and id path parameters and responds with a formatted string.
- Lines 80-86: main wires up the routes and starts the HTTP server.

> Notes
> - This is a minimal, educational router. For production-grade routing with features like strict path matching, middlewares, and robust validation, consider gorilla/mux or chi.

## 3. Path Parameters with a Production Router: gorilla/mux

Code shows how to use a feature-rich router to simplify path parameter extraction and add more advanced capabilities (subrouters, middleware, etc.).

```go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

type Post struct {
	Title   string `json:"title"`
	Content string `json:"content"`
}

func getUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]
	fmt.Fprintf(w, "User ID: %s\n", id)
}

func getArticle(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	category := vars["category"]
	id := vars["id"]
	fmt.Fprintf(w, "Article Category: %s, ID: %s\n", category, id)
}

func createPost(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id := vars["id"]

	var p Post
	if err := json.NewDecoder(r.Body).Decode(&p); err != nil {
		http.Error(w, "invalid JSON", http.StatusBadRequest)
		return
	}
	if p.Title == "" || p.Content == "" {
		http.Error(w, "missing title or content", http.StatusBadRequest)
		return
	}

	resp := map[string]interface{}{
		"user_id": id,
		"title":   p.Title,
		"content": p.Content,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/users/{id}", getUser).Methods("GET")
	r.HandleFunc("/articles/{category}/{id}", getArticle).Methods("GET")
	r.HandleFunc("/users/{id}/posts", createPost).Methods("POST")

	log.Println("Starting server on :8080")
	log.Fatal(http.ListenAndServe(":8080", r))
}
```

### Line-by-line explanation
- Lines 1-6: package and imports. We bring in encoding/json, fmt, log, net/http, and github.com/gorilla/mux for routing and parameter extraction.
- Lines 8-10: define a small Post struct to represent incoming JSON payloads.
- Lines 12-20: getUser handler extracts id via mux.Vars(r) and writes a response.
- Lines 22-30: getArticle handler extracts category and id via mux.Vars(r) and writes a response.
- Lines 32-58: createPost handler extracts id, decodes the request body into a Post, validates fields, and returns a JSON response containing the created post data.
- Lines 60-66: main creates a router, registers three routes with explicit HTTP methods, and starts the server.

> Notes
> - gorilla/mux provides a robust, battle-tested routing API with path parameters, route matching, and middleware support. It’s a common choice for production Go backends.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Not validating and type-converting path parameters
  - Bad
  ```go
  // Bad: directly using path segment as ID without validation
  func badHandler(w http.ResponseWriter, r *http.Request) {
    parts := strings.Split(r.URL.Path, "/")
    id := parts[len(parts)-1] // fragile
    // assume numeric
    fmt.Fprintln(w, id) // no validation or conversion
  }
  ```
  - Good
  ```go
  // Good: extract with a router (e.g., gorilla/mux) and validate type
  func goodHandler(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    idStr := vars["id"]
    id, err := strconv.Atoi(idStr)
    if err != nil {
      http.Error(w, "invalid id", http.StatusBadRequest)
      return
    }
    fmt.Fprintf(w, "ID: %d\n", id)
  }
  ```

- Pitfall 2: Overlapping or ambiguous routes
  - Bad
  ```go
  // Bad: generic param route can swallow more specific routes
  r.HandleFunc("/users/{id}", userHandler)
  r.HandleFunc("/users/all", allUsersHandler) // this might never hit
  ```
  - Good
  ```go
  // Good: put specific routes ahead of generic ones
  r.HandleFunc("/users/all", allUsersHandler)
  r.HandleFunc("/users/{id}", userHandler)
  ```
  - Rationale: Specific routes should be registered before generic parameterized routes to avoid accidental matches.

- Pitfall 3: Not escaping or validating output, leading to security issues
  - Bad
  ```go
  // Bad: echoing path parameters directly into HTML/JSON without validation
  func badEcho(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    fmt.Fprintf(w, "<div>User: %s</div>", vars["id"])
  }
  ```
  - Good
  ```go
  // Good: respond with a safe JSON payload
  func goodJSON(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    id := vars["id"]
    resp := map[string]string{"user_id": id}
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(resp)
  }
  ```

- Bonus Pitfall: Ignoring versioning and hot path performance
  - Bad
  ```go
  // Bad: unversioned, ad-hoc routes scattered across code
  http.HandleFunc("/users/123", userHandler) // hard-coded example
  ```
  - Good
  ```go
  // Good: versioned API and consistent routing
  r := mux.NewRouter()
  r.HandleFunc("/v1/users/{id}", getUserV1).Methods("GET")
  http.ListenAndServe(":8080", r)
  ```

## Y. Why This Matters In Real Systems — production context and real usage

- Clarity and consistency: A well-designed URL space makes APIs intuitive for developers, reduces onboarding time, and minimizes confusion when teams evolve.
- Versioning and backward compatibility: Versioned paths (e.g., /v1, /v2) enable safe evolution of endpoints without breaking existing clients.
- Maintainability and scalability: A clean router abstraction (custom or library-based) keeps route definitions centralized, aiding testing, logging, and middleware placement.
- Security and correctness: Strong validation of path parameters prevents crashes, prevents injection in logs or responses, and ensures data integrity before business logic runs.
- Observability and monitoring: Structured routes enable better metrics, tracing, and error reporting per route, improving incident response.
- Performance considerations: A naive router may scale poorly with many routes; libraries like gorilla/mux are optimized and battle-tested for production workloads.

## Z. Study Questions — 5 recall questions

1) Why should you prefer nouns for resource paths (e.g., /users, /articles) rather than verbs (e.g., /getUser)?  
2) How do you extract path parameters when using gorilla/mux? Provide a short code snippet.  
3) What is the difference between path parameters and query parameters? When should you use each?  
4) What are two common mistakes that lead to fragile routing in Go web servers?  
5) How does API versioning help in long-lived services, and what is a typical pattern to implement it in Go?

## Exercise — a practical multi-part coding challenge

Goal: Build a small Go web service that demonstrates clean URL design, path parameter extraction, input validation, and versioned routes. You may use the custom net/http router from Section 2 or the gorilla/mux library from Section 3.

Part A — Setup and basic routes
- Create a small Go project with a single main package.
- Implement a router (you may reuse the custom Router from Section 2) with these routes:
  - GET /v1/users/{id} -> returns JSON {"id": "<id>"} if id is numeric, else 400.
  - GET /v1/articles/{category}/{id} -> returns JSON {"category": "<category>", "id": "<id>"}.
  - POST /v1/users/{id}/posts -> accepts JSON body {"title": "...", "content": "..."} and returns JSON {"user_id": "<id>", "title": "...", "content": "...", "post_id": 1}.
- Ensure proper Content-Type headers and JSON responses.
- Validate path parameters: id must be numeric; category non-empty; body fields non-empty.

Part B — Optional enhancement with gorilla/mux
- If you choose gorilla/mux, implement the same routes using mux.Vars for extracting path params and demonstrate validation inside handlers.

Part C — Versioning and forward compatibility
- Add a v2 prefix route (e.g., /v2/users/{id}) that mirrors v1 behavior for the same endpoints.
- Add a small note in the response that this is the v1 or v2 API, to demonstrate version awareness.

Part D — Validation and error handling
- Ensure all error paths return clear HTTP status codes (400 for bad input, 404 for not found, 500 for server errors) and helpful messages.
- Include a simple unit/test scaffold proving that path parameter extraction and validation behave as expected (optional but encouraged).

Part E — Deliverables
- Provide a single Go file (or a small folder structure) with runnable code and instructions to run (e.g., go run main.go).
- Include brief README-like notes inside the repo explaining how to test the endpoints with curl and what responses to expect.

Notes for the Exercise
- You can start with the minimal Router in Section 2 and incrementally add the features described in Part A through E.
- If you use gorilla/mux, be mindful of module initialization (go mod init, go get github.com/gorilla/mux).
- Focus on clear, maintainable routing design and robust input validation to mirror real-world backend requirements.