# Track: Backend Engineering | Module 6 — Phase 6: Authentication & Security | Topic: HTTPS, TLS & CORS Configuration (Go)

In this module, you’ll learn how to securely expose Go services over HTTPS, manage TLS certificates, and configure cross-origin resource sharing (CORS) for APIs. HTTPS protects data in transit from eavesdropping and tampering, TLS ensures authentication and perfect forward secrecy, and thoughtful CORS configuration prevents risky cross-origin interactions while allowing legitimate frontends to access backend resources. Mastery of these topics is essential for building production-grade APIs that meet security, compliance, and performance requirements.

## 1. TLS Basics: Certificates, Handshakes, and Why HTTPS

TLS is the backbone of secure communication between clients and servers. In Go, you typically run an HTTPS server by supplying a certificate and private key, and you can tighten the connection with a well-configured TLSConfig. This section covers a minimal, secure HTTPS server and the core TLS concepts you’ll configure in real systems.

```go
package main

import (
	"crypto/tls"
	"log"
	"net/http"
)

func hello(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Hello, TLS world!"))
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", hello)

	// Load server certificate and key (PEM encoded)
	certFile := "server.crt"
	keyFile := "server.key"

	// Create TLS config with sensible defaults
	tlsConfig := &tls.Config{
		MinVersion:                tls.VersionTLS12, // require TLS 1.2 or higher
		PreferServerCipherSuites: true,             // prefer server's ciphers
		// CurvePreferences, CipherSuites, and other fields can be set here for stronger security
	}

	server := &http.Server{
		Addr:      ":8443",
		Handler:   mux,
		TLSConfig: tlsConfig,
	}

	log.Println("Starting TLS server on https://localhost:8443")
	// ListenAndServeTLS requires cert and key files
	if err := server.ListenAndServeTLS(certFile, keyFile); err != nil {
		log.Fatal(err)
	}
}
```

### Line-by-line explanation breaking down each line

1. package main
2. 
3. import (
4. 	"crypto/tls"
5. 	"log"
6. 	"net/http"
7. )
8. 
9. func hello(w http.ResponseWriter, r *http.Request) {
10. 	w.Write([]byte("Hello, TLS world!"))
11. }
12. 
13. func main() {
14. 	mux := http.NewServeMux()
15. 	mux.HandleFunc("/", hello)
16. 
17. 	// Load server certificate and key (PEM encoded)
18. 	certFile := "server.crt"
19. 	keyFile := "server.key"
20. 
21. 	// Create TLS config with sensible defaults
22. 	tlsConfig := &tls.Config{
23. 		MinVersion:                tls.VersionTLS12, // require TLS 1.2 or higher
24. 		PreferServerCipherSuites: true,             // prefer server's ciphers
25. 		// CurvePreferences, CipherSuites, and other fields can be set here for stronger security
26. 	}
27. 
28. 	server := &http.Server{
29. 		Addr:      ":8443",
30. 		Handler:   mux,
31. 		TLSConfig: tlsConfig,
32. 	}
33. 
34. 	log.Println("Starting TLS server on https://localhost:8443")
35. 	// ListenAndServeTLS requires cert and key files
36. 	if err := server.ListenAndServeTLS(certFile, keyFile); err != nil {
37. 		log.Fatal(err)
38. 	}
39. }

---

## 2. Certificate Management and Renewal: Let’s Encrypt Autocert (Automatic TLS)

Automating certificate issuance and renewal is critical for operations. The autocert package from the Go ecosystem (golang.org/x/crypto/acme/autocert) handles obtaining certificates from Let's Encrypt, storing them, and renewing them as needed. This section shows how to wire autocert into a Go HTTP server, enabling automatic TLS for a domain you control.

```go
package main

import (
	"context"
	"crypto/tls"
	"fmt"
	"log"
	"net/http"

	"golang.org/x/crypto/acme/autocert"
)

func hello(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Hello with autocert!"))
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", hello)

	// Policy to allow only specific hosts
	hostPolicy := func(ctx context.Context, host string) error {
		switch host {
		case "example.com", "www.example.com":
			return nil
		default:
			return fmt.Errorf("host not allowed: %s", host)
		}
	}

	// Autocert manager to obtain/renew certs from Let's Encrypt
	m := autocert.Manager{
		Cache:      autocert.DirCache("certs"), // certificate cache directory
		Prompt:     autocert.AcceptTOS,
		HostPolicy: hostPolicy,
	}

	server := &http.Server{
		Addr:    ":443",
		Handler: m.Handler(mux), // wrap mux with autocert handler
		TLSConfig: &tls.Config{
			GetCertificate: m.GetCertificate, // provide certificate from autocert
		},
	}

	log.Println("Serving on https://example.com with autocert")
	if err := server.ListenAndServeTLS("", ""); err != nil {
		log.Fatal(err)
	}
}
```

### Line-by-line explanation breaking down each line

1. package main
2. 
3. import (
4. 	"context"
5. 	"crypto/tls"
6. 	"fmt"
7. 	"log"
8. 	"net/http"
9. 
10. 	"golang.org/x/crypto/acme/autocert"
11. )
12. 
13. func hello(w http.ResponseWriter, r *http.Request) {
14. 	w.Write([]byte("Hello with autocert!"))
15. }
16. 
17. func main() {
18. 	mux := http.NewServeMux()
19. 	mux.HandleFunc("/", hello)
20. 
21. 	// Policy to allow only specific hosts
22. 	hostPolicy := func(ctx context.Context, host string) error {
23. 		switch host {
24. 		case "example.com", "www.example.com":
25. 			return nil
26. 		default:
27. 			return fmt.Errorf("host not allowed: %s", host)
28. 		}
29. 	}
30. 
31. 	// Autocert manager to obtain/renew certs from Let's Encrypt
32. 	m := autocert.Manager{
33. 		Cache:      autocert.DirCache("certs"), // certificate cache directory
34. 		Prompt:     autocert.AcceptTOS,
35. 		HostPolicy: hostPolicy,
36. 	}
37. 
38. 	server := &http.Server{
39. 		Addr:    ":443",
40. 		Handler: m.Handler(mux), // wrap mux with autocert handler
41. 		TLSConfig: &tls.Config{
42. 			GetCertificate: m.GetCertificate, // provide certificate from autocert
43. 		},
44. 	}
45. 
46. 	log.Println("Serving on https://example.com with autocert")
47. 	if err := server.ListenAndServeTLS("", ""); err != nil {
48. 		log.Fatal(err)
49. 	}
50. }

---

## 3. CORS Configuration in Go: Cross-Origin Resource Sharing

CORS controls how browsers make cross-origin requests to your API. Getting this right prevents unauthorized front-ends from accessing your data, while enabling authorized front-ends to interact with your services. Below are two common approaches: a lightweight middleware-free approach and a popular library-based approach.

### Approach A: Lightweight CORS middleware (no deps)

```go
package main

import (
	"net/http"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("CORS goes here"))
	})

	// Simple CORS middleware
	cors := func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Allow a specific origin; do not use "*" when credentials are present
			origin := "https://frontend.example.com"
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")

			// Preflight handling
			if r.Method == http.MethodOptions {
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}

	handler := cors(mux)
	http.ListenAndServe(":8080", handler)
}
```

### Line-by-line explanation breaking down each line

1. package main
2. 
3. import (
4. 	"net/http"
5. )
6. 
7. func main() {
8. 	mux := http.NewServeMux()
9. 	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
10. 		w.Write([]byte("CORS goes here"))
11. 	})
12. 
13. 	// Simple CORS middleware
14. 	cors := func(next http.Handler) http.Handler {
15. 		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
16. 			// Allow a specific origin; do not use "*" when credentials are present
17. 			origin := "https://frontend.example.com"
18. 			w.Header().Set("Access-Control-Allow-Origin", origin)
19. 			w.Header().Set("Vary", "Origin")
20. 			w.Header().Set("Access-Control-Allow-Credentials", "true")
21. 
22. 			// Preflight handling
23. 			if r.Method == http.MethodOptions {
24. 				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
25. 				w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
26. 				w.WriteHeader(http.StatusNoContent)
27. 				return
28. 			}
29. 
30. 			next.ServeHTTP(w, r)
31. 		})
32. 	}
33. 
34. 	handler := cors(mux)
35. 	http.ListenAndServe(":8080", handler)
36. }
```

### Approach B: CORS with rs/cors library

```go
package main

import (
	"net/http"

	"github.com/rs/cors"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("CORS with rs/cors"))
	})

	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"https://frontend.example.com"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowCredentials: true,
	})

	http.ListenAndServe(":8080", c.Handler(mux))
}
```

### Line-by-line explanation breaking down each line (library approach)

1. package main
2. 
3. import (
4. 	"net/http"
5. 
6. 	"github.com/rs/cors"
7. )
8. 
9. func main() {
10. 	mux := http.NewServeMux()
11. 	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
12. 		w.Write([]byte("CORS with rs/cors"))
13. 	})
14. 
15. 	c := cors.New(cors.Options{
16. 		AllowedOrigins:   []string{"https://frontend.example.com"},
17. 		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
18. 		AllowCredentials: true,
19. 	})
20. 
21. 	http.ListenAndServe(":8080", c.Handler(mux))
22. }

---

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1: Allowing insecure TLS or not enforcing minimum TLS version
  - Bad:
```go
tlsConfig := &tls.Config{
	MinVersion: tls.VersionSSL30, // deprecated/unsafe
}
```
  - Good:
```go
tlsConfig := &tls.Config{
	MinVersion: tls.VersionTLS12,
	PreferServerCipherSuites: true,
}
```

- Pitfall 2: Not setting HSTS (Strict-Transport-Security) in responses
  - Bad (no HSTS header):
```go
// No HSTS header
w.Header().Set("Content-Type", "application/json")
```
  - Good (HSTS enabled):
```go
w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
```

- Pitfall 3: CORS misconfiguration with credentials and wildcard origins
  - Bad (Allow-Origin: * with credentials):
```go
w.Header().Set("Access-Control-Allow-Origin", "*")
w.Header().Set("Access-Control-Allow-Credentials", "true")
```
  - Good (reflective origin or restricted origin)
```go
origin := r.Header.Get("Origin")
allowed := origin == "https://frontend.example.com"
if allowed {
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Vary", "Origin")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
}
```

- Pitfall 4: Not rotating or renewing certificates
  - Bad (static certs without renewal):
```go
// certs loaded once; no renewal logic
server.ListenAndServeTLS("server.crt", "server.key")
```
  - Good (autocert or renewal workflow integrated):
```go
// See autocert example in Section 2 for automatic renewal
```

---

## Y. Why This Matters In Real Systems — production context and real usage

- Security posture: Enforcing TLS 1.2+/TLS 1.3, strong ciphers, and forward secrecy reduces risk from protocol downgrades and cipher defects.
- Certificate lifecycle: Automated issuance, renewal, and revocation (ACME/Let’s Encrypt) minimize outage risk and operator effort; stale certs cause downtime.
- Traffic integrity and privacy: TLS protects data in transit against eavesdropping and tampering; TLS features like session resumption improve performance.
- Correct CORS: Proper origin whitelisting and credentials handling prevent unauthorized web apps from accessing sensitive APIs, reducing cross-site leakage and CSRF-like exposure.
- Observability: TLS termination points, TLS fingerprints, and HSTS reporting help you audit and monitor encryption posture across services.

In real systems, you’ll typically combine TLS hardening (MinVersion, CipherSuites, HSTS), automated certificate management (autocert or external CA tooling), and robust, standards-aligned CORS middleware or libraries in a cohesive security posture. You’ll also test under load, verify behavior with preflight requests, and monitor certificate expiry to avoid outages.

---

## Z. Study Questions — 5 recall questions

1. What does MinVersion in Go’s tls.Config control, and why should you set it to at least TLS 1.2?
2. How does the autocert.Manager simplify TLS in a Go server, and what is the purpose of the HostPolicy field?
3. What is the correct way to configure CORS when you also require credentials for cross-origin requests?
4. Why is it important to include the Strict-Transport-Security header in your HTTPS responses, and what does includeSubDomains do?
5. How can you handle preflight OPTIONS requests in a Go HTTP server to support CORS safely?

---

## Exercise — a practical multi-part coding challenge

Goal: Build a small Go HTTPS server with TLS hardening, HSTS, and CORS for a frontend domain.

Part A: Bare HTTPS server with TLS
- Create a Go program that serves on https://localhost:8443.
- Use a self-signed certificate pair server.crt and server.key (you can generate with openssl a la openssl req -x509 -newkey rsa:2048 -days 365 -nodes -keyout server.key -out server.crt).
- Implement a /ping endpoint that returns "pong".

Code outline (Part A):
```go
package main

import (
	"crypto/tls"
	"fmt"
	"log"
	"net/http"
)

func ping(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintln(w, "pong")
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/ping", ping)

	tlsConfig := &tls.Config{
		MinVersion: tls.VersionTLS12,
		// Other strong defaults can be added here
	}

	srv := &http.Server{
		Addr:      ":8443",
		Handler:   mux,
		TLSConfig: tlsConfig,
	}

	log.Println("HTTPS server listening on https://localhost:8443")
	if err := srv.ListenAndServeTLS("server.crt", "server.key"); err != nil {
		log.Fatal(err)
	}
}
```

Part B: TLS hardening and HSTS
- Extend Part A to:
  - Enforce TLS 1.2+ (already in place).
  - Add Strict-Transport-Security header for all responses.
  - Ensure responses include HSTS with includeSubDomains and preload parameters.

Part C: CORS for a frontend domain
- Add a CORS layer that allows only https://frontend.example.com and handles preflight OPTIONS requests.
- Do not use “*” for Access-Control-Allow-Origin when credentials are allowed.

Part D (Optional): Autocert integration
- If you want an automated path, adapt the autocert example from Section 2 to serve TLS for example.com in production. You will need to configure DNS for the domain and use a real HTTP-01/TLS-ALPN-01 challenge flow as applicable.

Deliverables:
- A single Go file implementing Part A, Part B, and Part C ( Parts A–C can be combined in one program).
- A brief README-style note describing how to generate the certificate for local testing (openssl) and how to run the server.
- Ensure the server includes:
  - TLS 1.2+ enforcement
  - HSTS header
  - CORS permitting only a specific frontend domain with credentials
  - A simple /ping endpoint for verification

If you’d like, I can tailor the exercises to a particular Go framework (net/http vs. chi/gorilla/mchi) or help wire autocert into a containerized deployment scenario.