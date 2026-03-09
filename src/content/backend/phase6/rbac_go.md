# Track: Backend Engineering — Phase 6: Authentication & Security — Role-Based Access Control (RBAC) in Go

Role-Based Access Control (RBAC) is a fundamental security pattern that assigns permissions to roles rather than individual users. In production systems, RBAC enables scalable, auditable, and maintainable access decisions across services and APIs. This lesson demonstrates how to model RBAC in Go, enforce it via middleware, and apply it to HTTP endpoints with a small, runnable example.

## 1. RBAC Model: Roles, Permissions, and Policies

In this section, we define the core RBAC concepts: roles, permissions, and the policy that maps which roles have which permissions.

```go
package main

type Role string
type Permission string

// rolePermissions maps a role to its granted permissions
var rolePermissions = map[Role][]Permission{
	"admin":  {Permission("read:posts"), Permission("write:posts"), Permission("delete:posts"),
		Permission("read:comments"), Permission("write:comments")},
	"editor": {Permission("read:posts"), Permission("write:posts"),
		Permission("read:comments"), Permission("write:comments")},
	"viewer": {Permission("read:posts"), Permission("read:comments")},
}
```

### Line-by-line explanation breaking down each line

- package main
  - Declares the main package for a standalone Go program.
- type Role string
  - Defines Role as a distinct string type to improve type-safety and readability.
- type Permission string
  - Defines Permission as a distinct string type to represent an action on a resource.
- var rolePermissions = map[Role][]Permission{ ... }
  - Creates a map that assigns a list of Permission values to each Role.
- "admin": {Permission("read:posts"), ...}
  - Admin role has full read, write, and delete permissions for posts and both read and write for comments.
- "editor": {Permission("read:posts"), ...}
  - Editor can read/write posts and comments but does not have delete permissions.
- "viewer": {Permission("read:posts"), Permission("read:comments")}
  - Viewer can only read posts and comments.
- The code uses explicit Permission(...) conversions to ensure type safety in the slice.

Notes:
- This is a compact, easily testable policy model. In larger systems, you might load policies from a database or a policy language (e.g., OPA, Casbin) for dynamic updates without redeploying code.

## 2. Permission Checks and Middleware

This section implements the permission checking logic and a reusable middleware to protect HTTP handlers.

```go
package main

import (
	"net/http"
	"strings"
)

type User struct {
	ID    string
	Roles []Role
}

// extractUserFromRequest reads a user from HTTP headers for demonstration.
// In production, replace this with proper authentication (e.g., JWT).
func extractUserFromRequest(r *http.Request) User {
	id := r.Header.Get("X-User-Id")
	rolesHeader := r.Header.Get("X-User-Roles")
	roles := []Role{}
	if rolesHeader != "" {
		for _, s := range strings.Split(rolesHeader, ",") {
			trim := strings.TrimSpace(s)
			if trim != "" {
				roles = append(roles, Role(trim))
			}
		}
	}
	return User{ID: id, Roles: roles}
}

// hasPermission checks if any of the user's roles grant the given permission.
func hasPermission(userRoles []Role, perm Permission) bool {
	for _, r := range userRoles {
		if perms, ok := rolePermissions[r]; ok {
			for _, p := range perms {
				if p == perm {
					return true
				}
			}
		}
	}
	return false
}

// RBACMiddleware wraps a handler and enforces the required permission.
// If the user is not allowed, it returns 403 Forbidden.
func RBACMiddleware(required Permission, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := extractUserFromRequest(r)
		if hasPermission(user.Roles, required) {
			next.ServeHTTP(w, r)
		} else {
			http.Error(w, "Forbidden", http.StatusForbidden)
		}
	})
}
```

### Line-by-line explanation breaking down each line

- package main
  - Declares the main package for a standalone Go program.
- import ( "net/http" "strings" )
  - Imports the HTTP server utilities and string helpers.
- type User struct { ID string; Roles []Role }
  - Defines a User with an identifier and a set of roles.
- func extractUserFromRequest(r *http.Request) User
  - Begins a function to derive a User from HTTP headers (demo purpose).
- id := r.Header.Get("X-User-Id")
  - Reads a user ID from the custom header X-User-Id.
- rolesHeader := r.Header.Get("X-User-Roles")
  - Reads a comma-separated list of roles from X-User-Roles.
- roles := []Role{}
  - Initializes an empty slice to collect roles.
- if rolesHeader != "" { for _, s := range strings.Split(rolesHeader, ",") { trim := strings.TrimSpace(s) ... } }
  - Splits the header into individual roles, trims whitespace, and appends them as Role values.
- return User{ ID: id, Roles: roles }
  - Returns a User struct populated from the headers.
- func hasPermission(userRoles []Role, perm Permission) bool
  - Declares a function to check if any user role grants a permission.
- for _, r := range userRoles { if perms, ok := rolePermissions[r]; ok { for _, p := range perms { if p == perm { return true } } } }
  - Iterates over each user role, retrieves its permissions, and checks for a match.
- return false
  - If no matching permission is found, deny access.
- func RBACMiddleware(required Permission, next http.Handler) http.Handler
  - Defines a middleware factory that requires a specific permission.
- return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { ... })
  - Returns a handler that performs the check and either forwards the request or rejects it.
- user := extractUserFromRequest(r)
  - Extracts the requesting user from headers.
- if hasPermission(user.Roles, required) { next.ServeHTTP(w, r) } else { http.Error(w, "Forbidden", http.StatusForbidden) }
  - If permitted, proceeds to the next handler; otherwise responds with 403.

Notes:
- In real systems, authentication should be done with a secure method (JWTs, OAuth2) and roles should be loaded from a trusted source (identity provider, user service). Headers used here are for demonstration and testing only.

## 3. End-to-End Application: RBAC-Protected HTTP Endpoints

The following is a runnable, small Go server that enforces RBAC on three endpoints:
- GET /posts: read posts (read:posts)
- POST /posts: create a post (write:posts)
- DELETE /posts/{id}: delete a post (delete:posts)

```go
package main

import (
	"fmt"
	"log"
	"net/http"
	"strings"
)

type Role string
type Permission string

type User struct {
	ID    string
	Roles []Role
}

// Policy model (same as in section 1)
var rolePermissions = map[Role][]Permission{
	"admin": {
		Permission("read:posts"), Permission("write:posts"), Permission("delete:posts"),
		Permission("read:comments"), Permission("write:comments"),
	},
	"editor": {
		Permission("read:posts"), Permission("write:posts"),
		Permission("read:comments"), Permission("write:comments"),
	},
	"viewer": {
		Permission("read:posts"), Permission("read:comments"),
	},
}

// Helpers (section 2)
func extractUserFromRequest(r *http.Request) User {
	id := r.Header.Get("X-User-Id")
	rolesHeader := r.Header.Get("X-User-Roles")
	roles := []Role{}
	if rolesHeader != "" {
		for _, s := range strings.Split(rolesHeader, ",") {
			trim := strings.TrimSpace(s)
			if trim != "" {
				roles = append(roles, Role(trim))
			}
		}
	}
	return User{ID: id, Roles: roles}
}

func hasPermission(userRoles []Role, perm Permission) bool {
	for _, r := range userRoles {
		if perms, ok := rolePermissions[r]; ok {
			for _, p := range perms {
				if p == perm {
					return true
				}
			}
		}
	}
	return false
}

func RBACMiddleware(required Permission, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user := extractUserFromRequest(r)
		if hasPermission(user.Roles, required) {
			next.ServeHTTP(w, r)
		} else {
			http.Error(w, "Forbidden", http.StatusForbidden)
		}
	})
}

// Endpoint handlers
func listPosts(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Posts: [sample]")
}

func createPost(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "Post created")
}

func deletePost(w http.ResponseWriter, r *http.Request) {
	// path format: /posts/{id}
	parts := strings.Split(r.URL.Path, "/")
	var id string
	if len(parts) >= 3 {
		id = parts[2]
	}
	if id == "" {
		http.Error(w, "Post ID required", http.StatusBadRequest)
		return
	}
	fmt.Fprintf(w, "Deleted post %s\n", id)
}

func main() {
	// Route GET /posts and POST /posts with different permissions
	http.HandleFunc("/posts", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			RBACMiddleware(Permission("read:posts"), http.HandlerFunc(listPosts)).ServeHTTP(w, r)
		case http.MethodPost:
			RBACMiddleware(Permission("write:posts"), http.HandlerFunc(createPost)).ServeHTTP(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Route DELETE /posts/{id} with delete permission
	http.HandleFunc("/posts/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			RBACMiddleware(Permission("delete:posts"), http.HandlerFunc(deletePost)).ServeHTTP(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	log.Println("RBAC demo server listening on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Line-by-line explanation breaking down each line

- package main
  - Declares the main package for the executable server.
- import ( "fmt" "log" "net/http" "strings" )
  - Imports utilities for formatting, logging, HTTP serving, and string manipulation.
- type Role string; type Permission string
  - Define simple type aliases to improve clarity and type safety.
- type User struct { ID string; Roles []Role }
  - Represents an authenticated user with an ID and a set of roles.
- var rolePermissions = map[Role][]Permission{ ... }
  - Declares the policy mapping roles to their allowed permissions (admin, editor, viewer).
- func extractUserFromRequest(r *http.Request) User { ... }
  - Reads user ID and roles from headers (demo) and returns a User.
- func hasPermission(userRoles []Role, perm Permission) bool { ... }
  - Checks whether any of the user’s roles grant the specified permission.
- func RBACMiddleware(required Permission, next http.Handler) http.Handler { ... }
  - Returns a wrapper that enforces the given permission before invoking the next handler.
- func listPosts(w http.ResponseWriter, r *http.Request) { ... }
  - Handler for listing posts.
- func createPost(w http.ResponseWriter, r *http.Request) { ... }
  - Handler for creating a post.
- func deletePost(w http.ResponseWriter, r *http.Request) { ... }
  - Handler for deleting a post by ID parsed from path /posts/{id}.
- func main() { ... }
  - Entry point to start the HTTP server and register routes.

Notes:
- This is a compact, runnable example used for teaching RBAC in Go. In production, replace the header-based user extraction with a real authentication mechanism (JWT, OAuth), and centralize policy management to support dynamic updates.

## X. Common Beginner Mistakes — 3+ Real Pitfalls with Bad vs Good Code (Side-by-Side)

Pitfall 1: Hardcoding permissions in business logic instead of a centralized policy
- Bad
```go
func canAccess(roles []string, action string) bool {
	// Very naive hardcoded policy
	for _, r := range roles {
		if r == "admin" && action == "delete" {
			return true
		}
	}
	return false
}
```
- Good
```go
// Reuse the centralized policy from the RBAC model
func canAccess(roles []Role, perm Permission) bool {
	return hasPermission(roles, perm)
}
```

Pitfall 2: Relying on client-provided headers for security
- Bad
```go
// Insecure example
func isAdmin(r *http.Request) bool {
	return r.Header.Get("X-Role") == "admin"
}
```
- Good
```go
// Use a trusted authentication method (JWT, session) to derive user roles
// This example uses a token parser stub; in real systems, verify signatures and claims.
func extractUserFromRequest(r *http.Request) User {
	// Parse and validate token, then extract roles from claims
	// Placeholder for demonstration only
	return User{ID: "user1", Roles: []Role{"viewer"}}
}
```

Pitfall 3: Missing audit/logging of authorization decisions
- Bad
```go
if hasPermission(user.Roles, reqPerm) {
	// proceed
} else {
	// quietly deny
}
```
- Good
```go
if hasPermission(user.Roles, reqPerm) {
	log.Printf("RBAC: user=%s roles=%v granted=%s", user.ID, user.Roles, reqPerm)
	next.ServeHTTP(w, r)
} else {
	log.Printf("RBAC: access-denied user=%s roles=%v required=%s", user.ID, user.Roles, reqPerm)
	http.Error(w, "Forbidden", http.StatusForbidden)
}
```

Notes:
- Pitfalls highlight common real-world mistakes: hard-coded logic, insecure user data sources, and lack of auditing. The robust approach centralizes policy, uses trusted authentication, and records authorization events for audits.

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Centralized policy: RBAC decouples “who can do what” from code paths, enabling easier updates and role management without code changes.
- Auditability: Logging access decisions supports compliance (e.g., GDPR, SOC 2) and debugging of authorization issues.
- Least privilege: Start with minimal permissions per role and adjust as requirements evolve; RBAC supports this cleanly.
- Multi-tenant and distributed systems: RBAC policies can be shared across services via a policy store, or implemented with an authorization service (e.g., using OPA or Casbin).
- Performance considerations: Caching decisions and policy lookups reduces latency; ensure thread-safe policy stores and consider per-request context propagation.
- Integration with identity providers: In production, RBAC is often driven by identity/authorization claims from OAuth/JWT tokens or an IdP, enabling scalable, secure, enterprise-grade access control.
- Testing and validation: Automated tests should cover positive (allowed) and negative (denied) paths, including edge cases like missing roles or empty role sets.

## Z. Study Questions — 5 Recall Questions

1) What is the core idea of Role-Based Access Control (RBAC)?
2) How do you map roles to permissions in Go code, and why is this beneficial for scalability?
3) How would you enforce RBAC on HTTP endpoints in Go?
4) Why should you avoid trusting client-provided headers for security decisions in production?
5) What are some production considerations when integrating RBAC with identity providers and auditing?

## Exercise — Practical Multi-Part Coding Challenge

Part A: Extend RBAC to Support Resource-Based Permissions
- Task: Add a new resource type "orders" with permissions "read:orders", "write:orders".
- Deliverable: Update the policy model to include admin/editor/viewer roles for orders, and implement endpoints:
  - GET /orders (read:orders)
  - POST /orders (write:orders)
  - DELETE /orders/{id} (delete:orders) — ensure you add delete:orders in the policy as well.

Part B: Introduce a Simple In-Memory User Store
- Task: Create a small in-memory map of user IDs to roles (e.g., user1 -> ["admin"], user2 -> ["viewer"]).
- Deliverable: Implement a function fetchUserByID(id string) User that reads from this store, and modify extractUserFromRequest to use that store instead of headers for authentication.

Part C: Add Logging and Observability
- Task: Add structured logging around authorization decisions (who, what, allowed/denied, timestamp).
- Deliverable: Ensure every RBAC decision logs an event, including failed attempts.

Part D: Add Unit Tests for RBAC Logic
- Task: Write tests for:
  - hasPermission with various role combinations
  -RBACMiddleware behavior given a mock request (simulate headers or the in-memory user store)
- Deliverable: A small _rbac_test.go_ with test cases covering allow and deny paths.

Part E: Optional—Policy Reloading
- Task: Extend the policy to reload from an in-memory store or a simple JSON file at runtime (without recompiling).
- Deliverable: A reloadPolicy() function and a small demonstration showing policy changes take effect without restarting the server.

Guidance:
- Start by implementing Part A in a separate branch or file, then progressively integrate Part B through Part E.
- Keep tests deterministic by avoiding time-based randomness; seed any required data and use clean test fixtures.
- Validate that deny paths are explicit and have corresponding audit logs.

This lesson provides a practical, testable path to building and enforcing RBAC in Go, from the core model to a runnable server, plus a roadmap for production readiness and testing. If you’d like, I can supply a consolidated single-file example that includes all parts plus a basic test harness.