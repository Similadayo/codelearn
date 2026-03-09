# Track: Backend Engineering — Phase 6 — Sessions & Cookies: Stateful Authentication in Go

Compelling introductory paragraph:
Stateful sessions with cookies are a foundational pattern in backend authentication. Instead of encoding all user claims into a token that must be presented on every request, you store a lightweight session identifier on the client (in a cookie) and keep the authoritative session data on the server. This approach gives you centralized control: you can revoke sessions, rotate IDs to prevent fixation, implement per-device data, and apply server-side invalidation, all while keeping the client-side surface simple. In Go, you can implement a robust, testable session store, ensure secure cookie attributes, and build middleware to protect routes—revealing how real systems balance security, scalability, and developer ergonomics.

## 1. Conceptual Foundations: Stateful Sessions with Cookies

Code: lightweight in-memory session store plus session creation and retrieval.

```go
package main

import (
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

type Session struct {
	ID        string
	UserID    string
	ExpiresAt time.Time
	Data      map[string]interface{}
}

type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	ttl      time.Duration
}

func NewSessionStore(ttl time.Duration) *SessionStore {
	return &SessionStore{
		sessions: make(map[string]*Session),
		ttl:      ttl,
	}
}

func generateSessionID() string {
	b := make([]byte, 32)
	_, err := rand.Read(b)
	if err != nil {
		// In production, handle error properly
		panic(err)
	}
	return hex.EncodeToString(b)
}

// Create a new session for a user
func (s *SessionStore) Create(userID string) *Session {
	s.mu.Lock()
	defer s.mu.Unlock()

	id := generateSessionID()
	sess := &Session{
		ID:        id,
		UserID:    userID,
		ExpiresAt: time.Now().Add(s.ttl),
		Data:      make(map[string]interface{}),
	}
	s.sessions[id] = sess
	return sess
}

// Retrieve a session by ID, with TTL expiry check
func (s *SessionStore) Get(id string) *Session {
	s.mu.RLock()
	sess, ok := s.sessions[id]
	s.mu.RUnlock()
	if !ok {
		return nil
	}
	if time.Now().After(sess.ExpiresAt) {
		s.Destroy(id)
		return nil
	}
	return sess
}

// Destroy a session by ID
func (s *SessionStore) Destroy(id string) {
	s.mu.Lock()
	delete(s.sessions, id)
	s.mu.Unlock()
}

// Simple cleanup of expired sessions
func (s *SessionStore) Cleanup() {
	now := time.Now()
	s.mu.Lock()
	for id, sess := range s.sessions {
		if now.After(sess.ExpiresAt) {
			delete(s.sessions, id)
		}
	}
	s.mu.Unlock()
}
```

### Line-by-line explanation
- Defines a Session struct to hold the ID, user linkage, expiry, and arbitrary data.
- SessionStore encapsulates a thread-safe map with a TTL for sessions.
- NewSessionStore initializes the store with an TTL and empty map.
- generateSessionID creates a cryptographically random 64-character hex string.
- Create allocates a new session, assigns expiry, and stores it.
- Get fetches a session and enforces expiry; expired sessions are removed.
- Destroy removes a session from the store.
- Cleanup iterates, removing all expired sessions.

## 2. Setting Secure Cookies: Client-Side Session IDs

Code: cookie construction and helper for reading the session cookie.

```go
package main

import (
	"net/http"
	"time"
)

func setSessionCookie(w http.ResponseWriter, sess *Session) {
	cookie := &http.Cookie{
		Name:     "session_id",
		Value:    sess.ID,
		Path:     "/",
		Expires:  sess.ExpiresAt,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteLaxMode, // adjust per site requirements
	}
	http.SetCookie(w, cookie)
}

// Read the session_id cookie value from the request
func readSessionID(r *http.Request) string {
	c, err := r.Cookie("session_id")
	if err != nil {
		return ""
	}
	return c.Value
}
```

### Line-by-line explanation
- setSessionCookie creates a Cookie with:
  - session_id as the name and the session’s ID as the value.
  - Path set to root for universal accessibility.
  - Expires aligned with the session expiry.
  - HttpOnly to prevent JavaScript access.
  - Secure to require TLS (production).
  - SameSite set to a sensible default; adjust based on cross-site needs.
- http.SetCookie adds the cookie to the response.
- readSessionID reads the cookie from the request; returns empty string if absent.

## 3. Middleware: Load Session and Protect Routes

Code: middleware to load the session from the cookie and attach it to the request context; helper to retrieve it.

```go
package main

import (
	"context"
	"net/http"
)

type contextKey string

const sessionContextKey = contextKey("session")

// Wrap a handler with session-based authentication
func requireAuth(store *SessionStore, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sid := readSessionID(r)
		if sid == "" {
			http.Error(w, "Unauthorized: no session", http.StatusUnauthorized)
			return
		}
		sess := store.Get(sid)
		if sess == nil {
			http.Error(w, "Unauthorized: invalid session", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), sessionContextKey, sess)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// Retrieve the session from the request context
func GetSession(r *http.Request) *Session {
	val := r.Context().Value(sessionContextKey)
	if sess, ok := val.(*Session); ok {
		return sess
	}
	return nil
}
```

### Line-by-line explanation
- Defines a type for context keys to avoid collisions.
- Declares a dedicated key for storing the session in the request context.
- requireAuth reads the session_id cookie, fetches the session from the store, and rejects unauthenticated requests.
- If a valid session exists, it places the session into the request context and calls the next handler.
- GetSession extracts the session from the request context for handlers that need user info.

## 4. Complete Login/Logout Flow and Session Rotation

Code: login, logout, and a protected endpoint using the middleware.

```go
package main

import (
	"fmt"
	"net/http"
	"time"
)

func loginHandler(store *SessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Simple login flow: show form on GET, process on POST
		if r.Method == http.MethodGet {
			w.Write([]byte(`<form method="POST" action="/login">
				Username: <input name="username" />
				Password: <input type="password" name="password" />
				<button type="submit">Login</button>
			</form>`))
			return
		}

		// Parse credentials
		if err := r.ParseForm(); err != nil {
			http.Error(w, "Bad Request", http.StatusBadRequest)
			return
		}
		username := r.FormValue("username")
		password := r.FormValue("password")

		// Naive credential check (replace with real user store in production)
		if username != "admin" || password != "password" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		// Session rotation: destroy any existing session to prevent fixation
		if old := readSessionID(r); old != "" {
			store.Destroy(old)
		}

		// Create a new session and set the cookie
		sess := store.Create(username) // using username as userID for simplicity
		setSessionCookie(w, sess)

		http.Redirect(w, r, "/protected", http.StatusFound)
	}
}

func logoutHandler(store *SessionStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Invalidate server-side session
		if sid := readSessionID(r); sid != "" {
			store.Destroy(sid)
		}
		// Clear the cookie
		cookie := &http.Cookie{
			Name:     "session_id",
			Value:    "",
			Path:     "/",
			Expires:  time.Unix(0, 0),
			HttpOnly: true,
			Secure:   true,
			SameSite: http.SameSiteLaxMode,
		}
		http.SetCookie(w, cookie)
		w.Write([]byte("Logged out"))
	}
}

func protectedHandler(w http.ResponseWriter, r *http.Request) {
	sess := GetSession(r)
	if sess != nil {
		w.Write([]byte(fmt.Sprintf("Hello %s! Your session ID is %s", sess.UserID, sess.ID)))
	} else {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
	}
}
```

Main wiring example (not a full program, see below for a runnable snippet):
```go
func main() {
	store := NewSessionStore(15 * time.Minute)

	mux := http.NewServeMux()
	mux.HandleFunc("/login", loginHandler(store))
	mux.HandleFunc("/logout", logoutHandler(store))
	// Protected endpoint uses the authentication middleware
	protected := http.HandlerFunc(protectedHandler)
	mux.Handle("/protected", requireAuth(store, protected))

	http.ListenAndServe(":8080", mux)
}
```

### Line-by-line explanation
- loginHandler serves a simple login form on GET and authenticates on POST.
- On successful authentication, it rotates (destroys any old session) and creates a fresh session to mitigate session fixation.
- setSessionCookie attaches a secure, httpOnly cookie to the response.
- logoutHandler invalidates the server-side session and clears the cookie on the client.
- protectedHandler demonstrates consuming the session on a protected route.
- main wires up routes and the authentication middleware to protect /protected.

## 5. Scaling and Production Considerations: Pluggable Stores

Code: an interface-based approach to allow swapping stores (in-memory, Redis, etc.) without changing routing logic.

```go
package main

import "time"

type SessionStore interface {
	Create(userID string) *Session
	Get(id string) *Session
	Destroy(id string)
	Cleanup()
	// Optional: Renew(id) or Rotate(userID)
}

func NewMemoryStore(ttl time.Duration) *SessionStore {
	// This is a placeholder to illustrate the idea.
	// In real code, instantiate a concrete type that implements SessionStore.
	return nil
}
```

Notes:
- In production, you typically replace the in-memory store with a distributed store (e.g., Redis, DynamoDB). Implementations must be thread-safe, support TTL, and work across multiple app instances.
- A Redis-backed store would implement Create/Get/Destroy/Cleanup using a shared Redis instance, enabling seamless horizontal scaling.
- Keep the cookie as the single point of client interaction, and avoid writing sensitive data into cookies. The server is the source of truth for session data.

### Line-by-line explanation
- Introduces a Store interface to decouple session lifecycle from storage backend.
- Encourages implementing concrete types (MemoryStore, RedisStore, etc.) that satisfy the interface.
- Demonstrates how production-grade backends enable horizontal scaling and centralized session invalidation.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

- Pitfall 1: Insecure cookie attributes
  - Bad:
```go
cookie := &http.Cookie{Name: "session_id", Value: sid, Path: "/"}
http.SetCookie(w, cookie)
```
  - Good:
```go
cookie := &http.Cookie{
	Name:     "session_id",
	Value:    sid,
	Path:     "/",
	Expires:  time.Now().Add(24 * time.Hour),
	HttpOnly: true,
	Secure:   true,
	SameSite: http.SameSiteLaxMode,
}
http.SetCookie(w, cookie)
```

- Pitfall 2: Session fixation (reusing the same session after login)
  - Bad:
```go
// Assume sid is read from cookie and reused for login
sess := store.Get(sid)
setSessionCookie(w, sess)
```
  - Good:
```go
// Rotate on login: discard old, create new
if old := readSessionID(r); old != "" {
	store.Destroy(old)
}
newSess := store.Create(username)
setSessionCookie(w, newSess)
```

- Pitfall 3: Storing sensitive data in cookies (no server-side session)
  - Bad:
```go
cookie := &http.Cookie{Name: "session_data", Value: "admin:true", Path: "/"}
http.SetCookie(w, cookie)
```
  - Good:
```go
// Keep only a session ID in cookie; store sensitive data on the server
sess := store.Create(username)
setSessionCookie(w, sess)
```

- Pitfall 4: Not expiring sessions or relying on in-memory only (data loss on restart)
  - Bad:
```go
type MemoryStore struct {
	sessions map[string]*Session
}
```
  - Good:
```go
type SessionStore struct {
	mu       sync.RWMutex
	sessions map[string]*Session
	ttl      time.Duration
}
```

- Pitfall 5: Neglecting secure defaults in development
  - Bad:
```go
cookie := &http.Cookie{Name: "session_id", Value: sid, Path: "/"}
```
  - Good:
```go
cookie := &http.Cookie{
	Name:     "session_id",
	Value:    sid,
	Path:     "/",
	Expires:  time.Now().Add(24 * time.Hour),
	HttpOnly: true,
	Secure:   true,
	SameSite: http.SameSiteLaxMode,
}
```

## Y. Why This Matters In Real Systems — production context and real usage

- Security: Stateful sessions give you control to revoke or rotate sessions, mitigate session fixation, and enforce expiry rules. Always use HttpOnly, Secure (TLS), and a sane SameSite policy.
- Scalability: In-memory stores fail behind multiple app instances or after restarts. Use a centralized store (Redis, DynamoDB) so all app instances share the same session state.
- Observability: Instrument session activity (creation, destruction, rotation) and monitor TTLs to detect anomalies or abuse.
- CSRF considerations: For state-changing actions, combine stateful sessions with CSRF tokens or rely on SameSite cookies to reduce risk of cross-site request forgery.
- Data governance: Keep only a minimal session reference in the cookie; never store sensitive PII or credentials in cookies. Keep heavy data on the server-side session store.
- Compliance and audits: Centralized session invalidation helps with incident response, revocation, and forensic analysis.

## Z. Study Questions — 5 recall questions

1. What is the main difference between a stateful session with cookies and a stateless JWT approach?
2. Why should the session cookie be HttpOnly and Secure in production?
3. How does session rotation on login help prevent session fixation attacks?
4. What is the purpose of the SameSite attribute, and which value is generally safe for most apps?
5. When scaling to multiple app instances, why is an external store (like Redis) important for sessions?

## Exercise — a practical multi-part coding challenge

Part A: Build a minimal in-memory session-based auth server
- Implement a Go HTTP server with:
  - A login page that authenticates a hard-coded user (e.g., admin/password).
  - Session creation, rotation on login, and a protected endpoint.
  - A logout endpoint that invalidates the session and clears the cookie.
  - Middleware to enforce authentication on the protected endpoint and expose the user info via context.
- Deliverables:
  - Working main.go with login, logout, and protected routes.
  - Clear unit-style tests for session creation, retrieval, and destruction (optional but encouraged).

Part B: Harden cookies and session lifecycle
- Update cookie attributes to HttpOnly, Secure, and SameSite.
- Implement an explicit session expiry (TTL) and a periodic Cleanup routine.
- Ensure login rotates the session even if a prior session exists (to prevent fixation).

Part C: Swap in a distributed session store (conceptual)
- Refactor to depend on a SessionStore interface (as shown in Section 5).
- Implement a Redis-backed store (pseudo-code or a minimal skeleton) and explain how you would wire it in.
- Run the same login/logout/protected routes against the Redis-backed store to demonstrate multi-instance viability.

Part D: Optional CSRF note
- If you build a mutating endpoint (e.g., POST /update-profile), implement a simple CSRF token mechanism (e.g., a per-session token stored server-side and mirrored in a cookie or header) and validate it on the server.

Starter code (Part A scaffold):
```go
package main

import (
	"net/http"
	"time"
)

func main() {
	// This is a compact scaffold for Part A. It defines nothing by itself yet.
	// Implement: SessionStore, login/logout handlers, protected route, and middleware.
	_ = time.Second // placeholder to illustrate imports
	http.ListenAndServe(":8080", http.NewServeMux())
}
```

Notes for the exercise:
- Start with the in-memory store (Section 1) and security-conscious cookie handling (Section 2).
- Add the middleware (Section 3) and the login/logout flow with rotation (Section 4).
- Finally, parameterize storage behind a SessionStore interface (Section 5) and consider a Redis-based implementation for real-world deployments (Section 5 notes).

This completes a detailed lesson on Stateful Sessions with Cookies in Go, covering architecture, secure cookie handling, middleware, lifecycle management, production considerations, and hands-on exercises to reinforce practice.