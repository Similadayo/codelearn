# JWT — Stateless Authentication in Go (Golang)

Welcome to Phase 6 of the Backend Engineering track. In this lesson, we dive into JSON Web Tokens (JWT) as the cornerstone of stateless authentication in Go. JWTs let services verify who a user is and what they’re allowed to do without maintaining server-side sessions. This is crucial for high-scale APIs, microservices, and truly stateless architectures where latency, scaling, and reliability matter.

---

## 1. JWT Basics and Stateless Authentication

- What is a JWT: a compact, URL-safe token consisting of a header, payload (claims), and a signature.
- Why stateless: the server does not need to store session data; it validates the token on every request.
- Pitfalls to be aware of: token revocation, rotation, proper claim usage, secure transport, and key management.

Code example: JWT structure (header and payload) and a brief signature note.

```json
// Header (base64url)
{
  "alg": "HS256",
  "typ": "JWT"
}

// Payload (base64url)
{
  "sub": "user-42",
  "name": "Alice",
  "iat": 1680000000,
  "exp": 1680003600
}
```

Notes:
- The signature is generated using a secret key (for HS256) or a private key (for RS256).
- exp (expiry) is essential to limit token lifetime.
- sub is commonly used to identify the subject (user).

### Line-by-line explanation
- The header defines the signing algorithm (HS256) and type (JWT).
- The payload carries claims about the subject (user) and token metadata (issued at, expiry).
- The signature binds header and payload with a secret or private key to prevent tampering.
- In real code, you never send the signature alone; you combine header.payload.signature as a single string separated by dots.

---

## 2. Generating JWTs in Go (HS256)

This section covers creating a signed JWT in Go using an HMAC HS256 signing method. We’ll use the github.com/golang-jwt/jwt/v4 package and a signing key loaded from environment variables for safety.

Code: JWT generation function and a tiny app to print a token.

```go
package main

import (
	"fmt"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

type Claims struct {
	Username string `json:"sub"`
	jwt.RegisteredClaims
}

func getSigningKey() string {
	if k := os.Getenv("JWT_SIGNING_KEY"); k != "" {
		return k
	}
	return "default_signing_key" // Never commit this in production
}

func generateJWT(username string) (string, error) {
	secret := []byte(getSigningKey())

	expirationTime := time.Now().Add(15 * time.Minute)
	claims := &Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "example-service",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func main() {
	token, err := generateJWT("alice")
	if err != nil {
		panic(err)
	}
	fmt.Println(token)
}
```

### Line-by-line explanation
- Import statements bring necessary packages: fmt, os, time, and jwt/v4 for token creation.
- Claims struct defines a subject field (sub) and embeds standard RegisteredClaims for iat, exp, iss, etc.
- getSigningKey reads JWT_SIGNING_KEY from the environment; falls back to a default (for demos). In production, always supply a strong, secret key via env or a secrets manager.
- generateJWT builds the token:
  - Reads the signing key as a byte slice.
  - Calculates an expiry 15 minutes in the future.
  - Populates Claims with username and standard registered claims.
  - Creates a new JWT with HS256 and the claims.
  - Signs the token with the secret and returns the token string.
- main calls generateJWT for user "alice" and prints the token.

---

## 3. Validating JWTs and Protecting Endpoints (net/http)

This section shows how to:
- Parse and validate a JWT from an Authorization: Bearer header.
- Protect an HTTP endpoint using middleware.
- Expose a login endpoint that issues a token for a given username.

Code: HTTP server with login and a protected route.

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

var signingKey = []byte(getSigningKey())

type Claims struct {
	Username string `json:"sub"`
	jwt.RegisteredClaims
}

func getSigningKey() string {
	if k := os.Getenv("JWT_SIGNING_KEY"); k != "" {
		return k
	}
	return "default_signing_key" // replace with a secure key in production
}

func generateJWT(username string) (string, error) {
	expirationTime := time.Now().Add(15 * time.Minute)
	claims := &Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "example-service",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(getSigningKey()))
}

func parseToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(getSigningKey()), nil
	})
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Missing Authorization header", http.StatusUnauthorized)
			return
		}
		fields := strings.Fields(authHeader)
		if len(fields) != 2 || strings.ToLower(fields[0]) != "bearer" {
			http.Error(w, "Invalid Authorization header", http.StatusUnauthorized)
			return
		}
		tokenStr := fields[1]
		claims, err := parseToken(tokenStr)
		if err != nil {
			http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}
		// Optional: enforce expiry (redundant if token.Valid is true, but explicit is clear)
		if claims.ExpiresAt != nil && claims.ExpiresAt.Time.Before(time.Now()) {
			http.Error(w, "Token expired", http.StatusUnauthorized)
			return
		}
		// Attach username to request context for downstream handlers
		ctx := context.WithValue(r.Context(), "username", claims.Username)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func protectedHandler(w http.ResponseWriter, r *http.Request) {
	username := r.Context().Value("username").(string)
	fmt.Fprintf(w, "Hello, %s", username)
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	// Expect JSON body: {"username":"alice","password":"secret"}
	var creds struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	// In a real app, verify credentials here. We accept any non-empty username for the demo.
	if creds.Username == "" {
		http.Error(w, "Missing username", http.StatusBadRequest)
		return
	}
	token, err := generateJWT(creds.Username)
	if err != nil {
		http.Error(w, "Could not generate token", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/login", loginHandler)
	mux.Handle("/protected", authMiddleware(http.HandlerFunc(protectedHandler)))
	http.ListenAndServe(":8080", mux)
}
```

### Line-by-line explanation
- Declares imports needed for HTTP handling, JSON, context, time, and JWT.
- signingKey holds the key for HS256; getSigningKey reads from env or falls back to a default.
- Claims struct defines the JWT payload with a sub (username) and standard claims (exp, iat, iss).
- generateJWT creates a signed token with a 15-minute expiry for the provided username.
- parseToken validates the token string, ensures the signing method is HS256 (or HMAC) to avoid algorithm confusion attacks, and returns the parsed claims.
- authMiddleware checks the Authorization header, validates the Bearer token, enforces expiration, and puts the username into the request context for downstream handlers.
- protectedHandler extracts the username from context and responds with a greeting.
- loginHandler parses credentials from the client and issues a JWT for the specified user.
- main wires the HTTP server with routes for login and a protected endpoint.

---

## 4. Expiration, Refresh, and Revocation Considerations

- Expiry management: short-lived access tokens reduce risk if compromised.
- Refresh tokens: long-lived tokens to obtain new access tokens; typically stored securely on client and sometimes tracked on server to allow revocation.
- Revocation strategies: maintain a token blacklist (stateful) or use short lifetimes plus frequent rotation of signing keys (stateless-ish with key rotation).
- Algorithm choice: HS256 (shared secret) vs RS256 (public/private key pair). RS256 supports better key rotation and separation of duties, but requires more infrastructure to manage keys.

Code note (RS256 alternative): If you switch to RS256, you sign with a private RSA key and verify with the corresponding public key. This example outlines the approach conceptually. See the next section for a concrete RS256 sample.

---

## 5. Security Best Practices and Real-World Considerations

- Use HTTPS/TLS for all JWT transport to protect tokens from eavesdropping.
- Do not store tokens in insecure places on clients (avoid localStorage for tokens with XSS risks; consider httpOnly cookies for refresh tokens or secure storage mechanisms on mobile apps).
- Use a strong signing key and rotate keys periodically. For RS256, consider JWKS (JSON Web Key Set) endpoints to publish public keys.
- Validate all claims: iss (issuer), sub (subject), aud (audience) if applicable, exp, nbf (not before), iat (issued at).
- Consider token binding or audience restrictions to limit token misuse.
- Implement key rotation and a fallback plan to avoid service disruption during key changes.

RS256 quick reference: With RS256, you generate a private key to sign tokens and expose the corresponding public key to validate tokens. This improves security for key rotation and multi-service authentication patterns. You would typically load the private key for signing and the public key (or JWKS endpoint) for verification, and you should verify the token’s alg matches the expected algorithm before using it.

---

## 6. Integrating JWT in Real Systems (Architecture & Patterns)

- Microservices: Use a central authentication service to issue tokens; downstream services validate tokens with a shared public key (RS256) or a shared secret (HS256).
- API gateways: Validate tokens at the edge to offload validation from downstream services.
- Refresh tokens: Keep a short-lived access token and a separate refresh token. Refresh tokens are often stored securely and can be rotated.

Sample RS256-based pattern (high level):
- Auth service signs access tokens with RS256 (private key).
- Services verify tokens with the public key (or via JWKS).
- On login, issue short-lived access tokens and optionally long-lived refresh tokens stored securely.
- Implement key rotation by publishing updated public keys via JWKS and using a kid header to select the correct key.

Code note (RS256 flow) for illustration:

- Generate: sign with private RSA key using jwt.SigningMethodRS256.
- Verify: parse with jwt.ParseWithClaims and provide RSA public key as the key function.
- Validate: check token.Claims and required claims (sub, exp, iss, aud if used).

Since RS256 requires RSA key material and a slightly longer setup, refer to real-world examples or your organization's key management workflow when adopting RS256 in production.

---

## X. Common Beginner Mistakes

1) Not validating the signing method (alg) in the token’s header
Bad:
```go
token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
	return signingKey, nil
})
```
Good:
```go
token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
	if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
		return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
	}
	return signingKey, nil
})
```

2) Storing or using a hard-coded signing key in code
Bad:
```go
signingKey := []byte("hardcoded-in-code-key")
```
Good:
```go
signingKey := []byte(getSigningKeyFromEnv())
```
and ensure the key is provided via environment variables or a secrets manager.

3) Not validating expiry (exp) or clock skew
Bad:
```go
token, _ := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
	return signingKey, nil
})
```
Good:
```go
claims, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
	return signingKey, nil
})
if err == nil && claims.Valid {
	// token is valid and not expired
}
```
(Note: In practice, check Expiry and consider a small clock skew allowance.)

4) Revealing token in URL or query params
Bad: sending tokens in query strings (e.g., /api?token=...). This can leak logs and referrers.
Good: Use Authorization: Bearer <token> headers and, when appropriate, HttpOnly cookies for refresh tokens in web apps.

5) Not handling key rotation
Bad: hard-coded key and no rotation strategy.
Good: implement key rotation with a JWKS endpoint or a mechanism to switch to a new signing key while validating older tokens with a cache until expiry.

---

## Y. Why This Matters In Real Systems — Production Context

- Performance and scalability: JWTs enable stateless authentication, reducing server load and enabling easy horizontal scaling.
- Microservice ecosystems: A single token can be validated by many services, provided they share the signing key (or have access to the public key for RS256).
- Security trade-offs: Short-lived access tokens minimize damage from token compromise; refresh tokens add complexity but improve UX and security.
- Key management: In production, never use a simple hard-coded key. Use environment variables, secret managers, or a dedicated PKI for RS256. Plan for key rotation and revocation.
- Observability: add logging around token issuance and verification, and consider rate limits on login/refresh endpoints to deter abuse.
- Transport security: Always serve JWTs over HTTPS, and consider httpOnly cookies for refresh tokens to mitigate XSS risks.

---

## Z. Study Questions — 5 Recall Questions

1) What is the primary advantage of stateless authentication with JWTs in a backend service?
2) In Go, how would you verify that a token was signed with HS256 and not with a different algorithm?
3) Why should you include an exp (expiry) claim in a JWT, and how should clock skew be handled?
4) How can you protect an HTTP endpoint using middleware in Go?
5) What are the trade-offs between HS256 and RS256 for signing JWTs in production?

---

## Exercise — Practical Multi-Part Coding Challenge

Goal: Build a small Go HTTP API that issues JWTs, protects endpoints, and demonstrates a simple refresh flow. You’ll implement a minimal login flow, a protected endpoint, and a refresh endpoint using HS256.

Part A: Set up a small Go project
- Create a new module: go mod init github.com/yourname/jwt-go-workout
- Add a main.go implementing:
  - A login endpoint at POST /login that accepts JSON { "username": "...", "password": "..." } and issues an access token using HS256 (15-minute expiry).
  - A protected endpoint at GET /protected that requires a valid JWT in Authorization: Bearer <token>.
  - An authentication middleware that validates the token and populates the request context with the username.

Part B: Implement refresh (optional for this exercise, but recommended)
- Extend the token model to also issue a refresh token along with the access token.
- Store refresh tokens in an in-memory map[string]string mapping token -> username (note: this is for learning; not suitable for production).
- Add a POST /refresh endpoint that accepts a valid refresh token and returns a new access token.

Part C: Add tests (optional but encouraged)
- Test token generation and validation.
- Test protected route access with a valid token and access denial with an invalid/expired token.

Part D: (Advanced) RS256 variant
- Switch the signing method to RS256.
- Generate a private/public RSA key pair (you can embed PEM strings for learning purposes or load from files).
- Sign tokens with the private key and verify with the public key.
- Add a small note about how you’d publish and rotate public keys (JWKS) in a real system.

Sample minimal starter code (Part A only; HS256, no refresh):

```go
package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v4"
)

type Claims struct {
	Username string `json:"sub"`
	jwt.RegisteredClaims
}

var signingKey = []byte("learners-secret-key")

func generateToken(username string) (string, error) {
	exp := time.Now().Add(15 * time.Minute)
	claims := &Claims{
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(exp),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "jwt-workout",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(signingKey)
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
	var cred struct{ Username, Password string }
	if err := json.NewDecoder(r.Body).Decode(&cred); err != nil {
		http.Error(w, "Bad request", http.StatusBadRequest)
		return
	}
	// Dummy authentication: accept any non-empty username
	if cred.Username == "" {
		http.Error(w, "Missing username", http.StatusBadRequest)
		return
	}
	token, err := generateToken(cred.Username)
	if err != nil {
		http.Error(w, "Could not generate token", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"token": token})
}

func parseToken(tokenStr string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		return signingKey, nil
	})
	if err != nil || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}
	return claims, nil
}

func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth == "" {
			http.Error(w, "Authorization header missing", http.StatusUnauthorized)
			return
		}
		parts := strings.Fields(auth)
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			http.Error(w, "Invalid Authorization header", http.StatusUnauthorized)
			return
		}
		token := parts[1]
		claims, err := parseToken(token)
		if err != nil {
			http.Error(w, "Unauthorized: "+err.Error(), http.StatusUnauthorized)
			return
		}
		// Optionally validate exp here (jwt library already checked exp on token.Valid)
		ctx := context.WithValue(r.Context(), "username", claims.Username)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func protectedHandler(w http.ResponseWriter, r *http.Request) {
	user := r.Context().Value("username").(string)
	fmt.Fprintf(w, "Welcome, %s! This is a protected endpoint.", user)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/login", loginHandler)
	mux.Handle("/protected", authMiddleware(http.HandlerFunc(protectedHandler)))
	http.ListenAndServe(":8080", mux)
}
```

What you’ll learn
- How to issue and verify JWTs in Go using a secure library.
- How to create a simple, stateless authentication flow without server-side sessions.
- How to protect endpoints with middleware and pass user identity into handlers.

If you’d like, I can tailor the exercise to your preferred Go project structure (e.g., using chi or gorilla/morux, or adding Docker configuration, tests, and RS256 optional variant).