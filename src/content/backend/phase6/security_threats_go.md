# Track: Backend Engineering — Phase 6: Authentication & Security

Introduction
Security is non-negotiable in backend engineering. SQL injection, XSS, CSRF, and unbounded request flows threaten data integrity, user trust, and system availability. This lesson shows concrete Go (Golang) patterns to prevent classic web security failures, with runnable patterns you can adapt to real systems. You’ll see how to write safe database access with prepared statements, how to render user-provided data safely, how to guard state-changing actions with CSRF tokens, and how to throttle traffic to protect services from abuse. By the end, you’ll be able to reason about these risks in production and implement robust defenses.

## 1. SQL Injection — Understanding and Mitigation

SQL injection exploits string-constructed queries that incorporate untrusted input. The attacker can alter the SQL command structure, potentially leaking data, bypassing authentication, or corrupting data. The safe pattern is to use parameterized queries and prepared statements rather than building SQL by concatenating strings.

```go
package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

type User struct {
	ID           int
	Username     string
	PasswordHash string
}

// Vulnerable example: concatenating user input into SQL (unsafe)
func getUserVulnerable(db *sql.DB, username string) (*User, error) {
	// WARNING: vulnerable to SQL injection if username is crafted maliciously
	query := "SELECT id, username, password_hash FROM users WHERE username = '" + username + "'"
	row := db.QueryRow(query)
	var u User
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash); err != nil {
		return nil, err
	}
	return &u, nil
}

// Safe example: parameterized query (safe)
func getUserSecure(db *sql.DB, username string) (*User, error) {
	row := db.QueryRow("SELECT id, username, password_hash FROM users WHERE username = ?", username)
	var u User
	if err := row.Scan(&u.ID, &u.Username, &u.PasswordHash); err != nil {
		return nil, err
	}
	return &u, nil
}
```

### Line-by-line explanation
- Line 1-7: Package and imports for database access and logging.
- Lines 9-14: User struct definition to hold retrieved fields.
- Function getUserVulnerable:
  - Line 18: Builds SQL by concatenating the username directly, which can be exploited if username contains SQL syntax.
  - Line 19: Executes the dangerous query.
  - Line 20-23: Scans the result into a User object; on error, returns it.
- Function getUserSecure:
  - Line 29: Uses a parameter placeholder ? to separate code from data.
  - Line 29: Executes the parameterized query with username as a separate parameter.
  - Line 30-34: Scans and returns the User object; on error, returns it.
- Why this fixes the issue: The database driver handles escaping and ensures user input cannot alter the SQL command structure.

## 2. Cross-Site Scripting (XSS) — Prevention in Go

XSS occurs when user-supplied data is reflected into HTML without safe encoding. Go’s html/template automatically escapes data, preventing injection into HTML content. In contrast, plain string formatting or text/template can be unsafe if it bypasses escaping.

```go
package main

import (
	"html/template"
	"net/http"
)

// Bad: renders raw user input into HTML without escaping (vulnerable to XSS)
func greetBad(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	// Directly injecting user input into HTML strings
	w.Write([]byte("<div>Hello, " + name + "!</div>"))
}

// Good: uses html/template which escapes data safely
func greetGood(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("name")
	tmpl := template.Must(template.New("greet").Parse("<div>Hello, {{.Name}}!</div>"))
	data := struct{ Name string }{Name: name}
	tmpl.Execute(w, data)
}
```

### Line-by-line explanation
- Lines 1-7: Package and imports for HTML templating and HTTP handling.
- greetBad:
  - Line 12: Reads a query parameter. 
  - Line 14: Writes a raw HTML string with user input, creating a risk of XSS if name contains HTML/script.
- greetGood:
  - Line 20: Reads the same input.
  - Line 21: Creates a parsed template with a placeholder for Name.
  - Line 22: Creates a data object containing Name.
  - Line 23: Executes the template, which escapes Name automatically to prevent HTML injection.
- Why this fixes the issue: html/template escapes special characters by default, preventing attackers from injecting scripts.

## 3. CSRF — Protecting State-Changing Requests

CSRF tokens ensure that state-changing requests (like form submissions) originate from your site and not from a malicious site. In Go, a popular approach is to use the gorilla/csrf middleware, which integrates with the request context and templates.

```go
package main

import (
	"html/template"
	"net/http"

	"github.com/gorilla/csrf"
	"github.com/gorilla/mux"
)

func main() {
	r := mux.NewRouter()
	// 32-byte key: store securely (ENV/secret manager in production)
	csrfKey := []byte("a-very-secret-32-byte-key-goes-here!")
	csrfMiddleware := csrf.Protect(csrfKey)

	r.HandleFunc("/form", formHandler).Methods("GET")
	r.HandleFunc("/submit", submitHandler).Methods("POST")

	// Wrap router with CSRF middleware
	http.ListenAndServe(":8080", csrfMiddleware(r))
}

func formHandler(w http.ResponseWriter, r *http.Request) {
	// Simple form that embeds the CSRF token
	tmpl := template.Must(template.New("form").Parse(`
		<form method="POST" action="/submit">
			{{ .CSRF }}
			<input name="username" />
			<button type="submit">Submit</button>
		</form>`))
	data := map[string]interface{}{
		"CSRF": csrf.TemplateField(r),
	}
	tmpl.Execute(w, data)
}

func submitHandler(w http.ResponseWriter, r *http.Request) {
	username := r.FormValue("username")
	// If CSRF token is invalid, gorilla/csrf will reject the request before this handler runs
	w.Write([]byte("Submitted: " + username))
}
```

### Line-by-line explanation
- Lines 1-7: Package and imports for HTML templating, HTTP handling, and CSRF/mux libraries.
- Line 12: main function initializes a router.
- Line 14-15: Define a 32-byte key (ensure it’s kept secret in production).
- Line 16: Create CSRF-protected middleware using the key.
- Lines 18-21: Register handlers for GET /form and POST /submit.
- Line 23: Start the HTTP server with CSRF protection.
- formHandler:
  - Lines 28-34: Build an inline form template and inject the CSRF token via csrf.TemplateField(r).
- submitHandler:
  - Line 38: Retrieve the submitted username.
  - Line 39: CSRF middleware automatically validates the token; handler executes only if valid.
- Why this matters: CSRF tokens prevent unauthorized actions from third-party sites, protecting authenticated sessions.

## 4. Rate Limiting — Throttling to Prevent Abuse

Rate limiting protects services from abuse and helps preserve availability. A simple per-IP token-bucket approach can be implemented with golang.org/x/time/rate, organized as middleware.

```go
package main

import (
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type ipLimiter struct {
	mu        sync.Mutex
	visitors  map[string]*visitor
	cleanupIn time.Duration
}

type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

func newIPLimiter() *ipLimiter {
	l := &ipLimiter{
		visitors:  make(map[string]*visitor),
		cleanupIn: time.Minute,
	}
	go l.cleanup()
	return l
}

func (l *ipLimiter) getLimiter(ip string) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()

	v, exists := l.visitors[ip]
	if !exists {
		// 2 requests per second with a burst of 5
		limiter := rate.NewLimiter(2, 5)
		l.visitors[ip] = &visitor{limiter: limiter, lastSeen: time.Now()}
		return limiter
	}
	v.lastSeen = time.Now()
	return v.limiter
}

func (l *ipLimiter) cleanup() {
	for {
		time.Sleep(l.cleanupIn)
		now := time.Now()
		l.mu.Lock()
		for ip, v := range l.visitors {
			// remove inactive visitors
			if now.Sub(v.lastSeen) > 3*time.Minute {
				delete(l.visitors, ip)
			}
		}
		l.mu.Unlock()
	}
}

func rateLimitMiddleware(next http.Handler) http.Handler {
	limiter := newIPLimiter()
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Use remote address as a simple IP key; consider X-Forwarded-For in real deployments
		ip := r.RemoteAddr
		l := limiter.getLimiter(ip)
		if !l.Allow() {
			http.Error(w, "Too Many Requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}
```

### Line-by-line explanation
- Lines 1-4: Package and imports for HTTP handling, synchronization, timing, and rate limiting.
- Types ipLimiter and visitor:
  - Lines 6-13: Structures to store per-IP rate limiters and last activity.
- newIPLimiter:
  - Lines 15-23: Initialize the limiter map and start a background cleanup goroutine.
- (l *ipLimiter) getLimiter:
  - Lines 25-33: Retrieve or create a per-IP limiter; update lastSeen timestamp.
- (l *ipLimiter) cleanup:
  - Lines 35-46: Periodically prune inactive IP entries to prevent unbounded growth.
- rateLimitMiddleware:
  - Lines 48-57: Middleware that checks the limiter for the requester’s IP and rejects if the limit is exceeded.
- Why this matters: Limits protect critical paths such as login and payment endpoints from flood retries and credential stuffing, helping maintain service availability under load.

## X. Common Beginner Mistakes

- SQL Injection: Bad vs Good
  - Bad: Building SQL with string concatenation
  - Good: Using parameterized queries

  Bad example:
  - query := "SELECT * FROM users WHERE username = '" + username + "'"
  - db.Query(query)

  Good example:
  - db.QueryRow("SELECT * FROM users WHERE username = ?", username)

- XSS: Bad vs Good
  - Bad: Echoing user input directly into HTML
  - Good: Render within a template that escapes by default

  Bad example:
  - fmt.Fprintf(w, "<div>%s</div>", userInput)

  Good example:
  - tmpl := template.Must(template.New("greet").Parse("<div>{{ .Name }}</div>"))
    tmpl.Execute(w, struct{ Name string }{Name: userInput})

- CSRF: Bad vs Good
  - Bad: Accepting POSTs without CSRF protection
  - Good: Use a CSRF token in forms and validate on POST

  Bad example:
  - http.HandleFunc("/submit", submitHandler) // no CSRF protection

  Good example:
  - Wrap routes with gorilla/csrf.Protect and embed csrf.TemplateField in forms

- Rate Limiting: Bad vs Good
  - Bad: No rate limiting on public endpoints
  - Good: Per-IP limiter with a clear fallback for bursts and a cleanup strategy

  Bad example:
  - http.ListenAndServe(":8080", handler) // no limiter

  Good example:
  - http.ListenAndServe(":8080", rateLimitMiddleware(handler))

## Y. Why This Matters In Real Systems

- Security is a cross-cutting concern: SQLi, XSS, CSRF, and DoS are common attack surfaces in production workloads.
- Production patterns:
  - Use parameterized queries everywhere; rely on ORM or database drivers for safety.
  - Centralize input validation and enforce encoding at render time; prefer html/template for output that touches HTML.
  - Apply CSRF protection consistently to state-changing endpoints, especially forms and API actions that cause changes.
  - Implement rate limiting at the edge or via a distributed store (e.g., Redis) for true scalability; per-IP in-memory mappers can be sufficient for small services but may not survive multi-instance deployments.
  - Log security-relevant events (SQL errors with sanitized inputs, CSRF token validation failures, rate limit hits) for incident response and audits.
- Production considerations:
  - Use prepared statements or ORM query builders; avoid dynamic SQL construction.
  - Use content security policies (CSP) and proper cookie flags (HttpOnly, Secure, SameSite) to further mitigate XSS and CSRF.
  - Consider WAFs, service meshes, and rate-limiters across microservices to enforce policies consistently.
  - Ensure secret keys (CSRF, sessions, encryption) are stored securely, rotated, and not hard-coded.

## Z. Study Questions

1) What is the primary risk of building SQL queries via string concatenation with user input?
2) How does html/template help prevent XSS in Go applications?
3) What is a CSRF token, and how does gorilla/csrf assist in implementing it?
4) Why is per-IP rate limiting important, and what are common pitfalls when implementing it in a multi-instance deployment?
5) Name two best practices for securing forms and APIs in production beyond the techniques shown here.

## Exercise

Part A — Set up a small app with safe SQL access
- Create a minimal Go HTTP server with a SQLite in-memory database.
- Seed the database with a single user:
  - username: alice
  - password: (bcrypt-hash of "password123")
- Implement a login flow with:
  - Insecure login handler (demonstrates SQLi vulnerability) using string concatenation (for learning, not for production).
  - Safe login handler using a prepared statement with a parameterized query.
  - Password check using bcrypt.CompareHashAndPassword.

Code scaffolding (you can adapt and expand):

```go
package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	"golang.org/x/crypto/bcrypt"
	_ "github.com/mattn/go-sqlite3"
)

type User struct {
	ID           int
	Username     string
	PasswordHash string
}

func main() {
	// Initialize in-memory DB and seed user
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil { log.Fatal(err) }
	defer db.Close()

	_, err = db.Exec(`CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, password_hash TEXT)`)
	if err != nil { log.Fatal(err) }

	// Create bcrypt hash for "password123" and insert user
	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	_, err = db.Exec(`INSERT INTO users (username, password_hash) VALUES (?, ?)`, "alice", string(hash))
	if err != nil { log.Fatal(err) }

	http.HandleFunc("/login-vuln", func(w http.ResponseWriter, r *http.Request) {
		// Insecure login endpoint (demonstration)
		username := r.FormValue("username")
		password := r.FormValue("password")
		u, err := getUserVulnerable(db, username)
		if err != nil { http.Error(w, "Invalid user", http.StatusUnauthorized); return }
		assertPassword(u, password, w)
	})

	http.HandleFunc("/login-secure", func(w http.ResponseWriter, r *http.Request) {
		// Secure login endpoint using prepared statements
		username := r.FormValue("username")
		password := r.FormValue("password")
		u, err := getUserSecure(db, username)
		if err != nil { http.Error(w, "Invalid user", http.StatusUnauthorized); return }
		assertPassword(u, password, w)
	})

	fmt.Println("Server running on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

// Reuse vulnerable/secure functions from previous example (omitted here for brevity)
```

Part B — Add CSRF, XSS-safe rendering, and rate-limiting
- Add Gorilla CSRF protection to a form submission endpoint (as shown in the CSRF section).
- Render a user-visible page using html/template to ensure escaping.
- Apply per-IP rate limiting middleware to the login endpoints.

Part C — Observability and hardening
- Add logging for login attempts (success/failure) and rate-limit rejections.
- Consider a distributed rate limiter (e.g., Redis-backed) if you have multiple nodes.
- Add Content Security Policy headers and cookie security flags.

Deliverables
- A single Go module with:
  - A secure login flow using prepared statements and bcrypt.
  - CSRF protection using Gorilla CSRF.
  - XSS-safe rendering using html/template.
  - Rate limiting middleware to throttle abusive requests.
- A short README describing how to run the server, how to reproduce a vulnerable scenario for learning, and how the mitigation works.

Notes
- In all examples, replace hard-coded keys (CSRF, etc.) with environment variables or a secrets manager in real deployments.
- For production, consider switching from in-memory rate limiters to distributed stores for multi-instance consistency.