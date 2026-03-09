# API Versioning & Deprecation Strategies in Go (Backend Engineering Phase 7)

Versioning and deprecation are foundational practices for maintaining long-lived APIs. They let you evolve a service without breaking existing clients, enable safe migrations to newer, faster, or more secure surfaces, and provide predictable sunset timelines that help teams plan changes, testing, and client migrations. In this lesson, you’ll learn practical Go patterns for version negotiation, routing, and deprecation signaling that you can apply to production services.

## 1. Versioning Goals and Principles
Versioning is about predictability, compatibility, and governance. The core goals are to allow clients to continue functioning while you improve the API, and to provide a clear path for migrating to newer versions. Key principles:
- Prefer non-breaking additive changes to avoid forcing clients to migrate.
- Clearly communicate breaking changes and provide a compatible upgrade path.
- Treat deprecation as a process with a public timeline.
- Use a deterministic versioning surface (path-based, media-type-based, or header-based) and document the strategy.

Code example: a small representation of a version surface
```go
// APIVersion represents a semantic API version surface
type APIVersion struct {
    Major int
    Minor int
    Patch int
}

// helper to format a version string
func (v APIVersion) String() string {
    return fmt.Sprintf("v%d.%d.%d", v.Major, v.Minor, v.Patch)
}
```

### Line-by-line explanation
- type APIVersion struct {...}: defines a simple semantic version structure with Major, Minor, and Patch components.
- func (v APIVersion) String() string { ... }: formats the version as a standard string like v1.2.3 for display or routing rules.

## 2. Versioning Strategies and When to Use Them
There are several common versioning strategies. Each has trade-offs around caching, clear routing, and client adoption.

- URL Path Versioning: /api/v1/... is explicit and cache-friendly.
- Media Type Versioning (Content Negotiation): Accept: application/vnd.example.v2+json is clean but can complicate caches.
- Custom Headers or Query Params: good for feature flags or experimentation, but can be less discoverable.

Code example A: Path-based versioning router (net/http)
```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
)

type User struct {
    ID   int    `json:"id"`
    Name string `json:"name"`
}

// v1 returns a stable, simple payload
func v1UserHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(User{ID: 1, Name: "Alice (v1)"})
}

// v2 returns an enhanced payload
func v2UserHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]interface{}{
        "id":        2,
        "full_name": "Alice Smith (v2)",
        "roles":     []string{"admin", "user"},
    })
}

func main() {
    http.HandleFunc("/api/v1/users", v1UserHandler)
    http.HandleFunc("/api/v2/users", v2UserHandler)
    log.Println("Starting server on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Line-by-line explanation
- imports: bring in encoding/json, log, and net/http for a minimal server.
- type User: defines a v1 payload shape to illustrate a non-breaking structure.
- v1UserHandler: serves v1 payload; sets content type and encodes JSON.
- v2UserHandler: serves v2 payload with an enhanced shape.
- main: wires HTTP routes for /api/v1/users and /api/v2/users, starts server.

Code example B: Negotiating via Accept header (media type versioning)
```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "strings"
)

type contextKey string

const versionKey contextKey = "apiVersion"

func versionedUsersHandler(w http.ResponseWriter, r *http.Request) {
    ver, _ := r.Context().Value(versionKey).(string)

    w.Header().Set("Content-Type", "application/json")
    if ver == "2" {
        json.NewEncoder(w).Encode(map[string]interface{}{
            "id":        2,
            "full_name": "Alice Smith (v2)",
            "roles":     []string{"admin", "user"},
        })
        return
    }

    // default to v1
    json.NewEncoder(w).Encode(map[string]interface{}{
        "id":   1,
        "name": "Alice (v1)",
    })
}

// middleware to inspect Accept header and set version in context
func versionNegotiation(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        accept := r.Header.Get("Accept")
        ver := "1" // default
        if strings.Contains(accept, "application/vnd.example.v2+json") {
            ver = "2"
        }
        ctx := context.WithValue(r.Context(), versionKey, ver)
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}

func main() {
    mux := http.NewServeMux()
    mux.Handle("/api/users", versionNegotiation(http.HandlerFunc(versionedUsersHandler)))

    log.Println("Starting server on :8081")
    log.Fatal(http.ListenAndServe(":8081", mux))
}
```

### Line-by-line explanation
- contextKey type and versionKey: create a typed key for safe context storage.
- versionedUsersHandler: reads the version from context and returns v1 or v2 payload accordingly.
- versionNegotiation: middleware inspects the Accept header; if it contains the v2 media type, it sets version to "2" in context; otherwise defaults to "1".
- main: attaches the middleware to /api/users and runs the server.

## 3. Deprecation Lifecycle and Signaling in Go
Deprecation is a policy, not a one-off feature. A predictable deprecation lifecycle gives clients time to migrate. Practical signals include:
- Warnings in responses (HTTP Warning header, RFC 7234 style).
- Deprecation and Sunset timestamps in headers.
- Documentation and a public deprecation schedule.
- Canary/Preview versions and a migration guide.

Code example: signaling deprecation in a handler
```go
package main

import (
    "net/http"
)

func deprecateHeader(w http.ResponseWriter, sunset string) {
    // RFC 7234: 299 Warning code for deprecation signals
    w.Header().Set("Warning", "299 - API is deprecated and will be removed on "+sunset)
    // Non-standard but widely used in practice
    w.Header().Set("Deprecation", sunset) // used by some clients for tooling
    w.Header().Set("Sunset", sunset)      // human-consumable date
}

func usersHandlerWithDeprecation(w http.ResponseWriter, r *http.Request) {
    // Example: this endpoint is still live but deprecated
    deprecateHeader(w, "2026-12-31")
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"id":3,"name":"Bob (deprecated)"}`))
}
```

### Line-by-line explanation
- deprecateHeader: sets three headers to signal deprecation: Warning (standardized 299 code), Deprecation, and Sunset (human-readable timeline).
- usersHandlerWithDeprecation: demonstrates emitting deprecation signals on a deprecated path while returning a valid payload.

Code example: basic deprecation policy with versioned sunset
```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
)

type DeprecationPolicy struct {
    OldVersion string
    SunsetDate string
    Message    string
}

var policy = DeprecationPolicy{
    OldVersion: "v1",
    SunsetDate: "2026-12-31",
    Message:    "v1 is deprecated; migrate to v2 before sunset.",
}

func versionedResourceHandler(w http.ResponseWriter, r *http.Request) {
    // If client requests v1 explicitly, warn; otherwise serve v2 by default
    ver := r.URL.Query().Get("version")
    if ver == policy.OldVersion {
        deprecateHeader(w, policy.SunsetDate)
        w.WriteHeader(http.StatusOK)
        json.NewEncoder(w).Encode(map[string]string{"message": policy.Message})
        return
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"message": "Resource v2 delivered"})
}
```

### Line-by-line explanation
- DeprecationPolicy struct and a global policy instance: captures the sunset plan for an old version.
- versionedResourceHandler: demonstrates checking a query parameter, emitting deprecation signals when an old version is requested, and delivering the newer version by default.

## 4. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)
- Pitfall 1: Mixing versioning strategies inconsistently
  - Bad:
    ```
    // Conflicting: v1 path but v2 content
    http.HandleFunc("/api/users", v1OrV2Handler)
    ```
  - Good:
    ```
    http.HandleFunc("/api/v1/users", v1UserHandler)
    http.HandleFunc("/api/v2/users", v2UserHandler)
    ```
- Pitfall 2: Failing to negotiate version and defaulting to latest silently
  - Bad:
    ```
    // Always serve v2, regardless of client
    http.HandleFunc("/api/users", v2UserHandler)
    ```
  - Good:
    ```
    // Negotiation logic via Accept header or explicit version in path
    ```
- Pitfall 3: Not signaling deprecation or sunset
  - Bad:
    ```
    // Old version continues forever without warnings
    // Clients have no idea when to migrate
    ```
  - Good:
    ```
    // Emit Warning/Deprecation headers and publish a sunset date
    ```
- Pitfall 4: Ignoring caching implications
  - Bad:
    ```
    // Vary headers not configured, causing cache confusion
    w.Header().Set("Content-Type","application/json")
    ```
  - Good:
    ```
    w.Header().Set("Vary", "Accept, API-Version")
    ```
- Pitfall 5: Breaking changes without a migration path
  - Bad: removing a field in v1 without a transitional v1.1
  - Good: additive changes in v2, with a transparent migration guide

## 5. Why This Matters In Real Systems — Production Context and Real Usage
- Client stability: When an API evolves, existing clients should keep working without forced upgrades.
- Gradual migrations: Version negotiation enables canary and staged rollouts, reducing blast radius.
- Governance and compliance: Explicit deprecation schedules tie into release trains, SRE runbooks, and product roadmaps.
- Observability and automation: Deprecation headers, sunset dates, and documentation enable automated tooling to surface upcoming removals.
- Caching and scalability: Clear versioned endpoints optimize caching and CDN behaviors, reducing latency and hot spots during upgrades.
- Backward compatibility patterns: Prefer additive changes (new fields) over breaking changes; introduce a migration path (v1 -> v2) with a clear deprecation window.

## 6. Study Questions — 5 Recall Questions
1. What are the main benefits of URL path versioning versus media type versioning?
2. How would you signaling deprecation to clients in a production API?
3. Why is it important to provide a deprecation sunset date, and how should clients react?
4. What is a safe default version if a client does not specify one, and why?
5. Describe how you would implement a version negotiation middleware in Go that supports both path-based and header-based strategies.

## 7. Exercise — Practical multi-part coding challenge
Goal: Build a small Go API server that supports v1 and v2 with both path-based and header-based version negotiation, plus a deprecation signal for v1 with a sunset date.

Part A — Scaffold a minimal server
- Create a server that serves:
  - /api/v1/users returns a v1 payload
  - /api/v2/users returns a v2 payload
- Ensure responses are JSON and content-type is set.

Part B — Add header-based negotiation
- Implement an HTTP middleware that inspects the Accept header.
- If Accept contains application/vnd.example.v2+json, route to v2 logic; otherwise default to v1.
- Wire the middleware to a single route like /api/users.

Part C — Implement deprecation signaling for v1
- When a client requests v1 (via path or negotiation), attach a deprecation signal:
  - Warning header: 299 - "API is deprecated and will be removed on 2026-12-31"
  - Optional Deprecation and Sunset headers
- Publish the sunset date in project documentation and a deprecation notice endpoint.

Part D — Unit-like test helper (no external test framework required)
- Write a small test helper in Go that simulates an HTTP request with:
  - Accept: application/vnd.example.v2+json and verify that you get v2 payload
  - No Accept header and verify that you get v1 payload and deprecation headers for v1

Part E — Run and verify locally
- Start the server
- curl examples:
  - curl -H "Accept: application/vnd.example.v2+json" http://localhost:8080/api/users
  - curl http://localhost:8080/api/v1/users
  - curl http://localhost:8080/api/v2/users
- Confirm:
  - Proper JSON payloads for v1 and v2
  - Deprecation headers appear on v1 responses

Starter snippets (you’ll complete parts by integrating with the code from Sections 2–3):
```go
package main

// Part A: scaffolding (build on top of one of the versioning styles above)
```

```go
package main

// Part B: middleware skeleton for Accept header negotiation
```

```go
package main

// Part C: deprecation signaling on v1 requests
```

Notes:
- Use go 1.18+ module-compatible code.
- Prefer a single source of truth for version negotiation logic to minimize drift.
- Document the deprecation schedule publicly (e.g., in README and API docs) and consider a changelog entry for each release.

End of lesson.