# OAuth 2.0 — Login with Google / GitHub in Go

OAuth 2.0 is the standard protocol that enables users to authorize your application to access their data on another service without sharing credentials. In backend systems, implementing “Login with Google” and “Login with GitHub” provides a secure, scalable way to authenticate users and provision them into your system. This lesson walks you through the essential concepts, provides a complete Go implementation, and highlights production considerations, pitfalls, and practical exercises.

## 1. OAuth 2.0 basics for backend authentication (concepts with a small Go snippet)

- What it is: a protocol for delegated authorization where users grant your app access to certain data on another service using access tokens.
- Core pieces: OAuth2 config (client ID/secret, redirect URL, scopes, provider endpoints), authorization request, authorization code callback, token exchange, and API calls with the access token.
- Security posture: use state (CSRF protection), validate redirect URIs, limit scopes, use HTTPS, and store tokens securely.

Example snippet (conceptual, Google-like config):

```go
// Conceptual snippet: initialize OAuth2 config for Google
googleCfg := &oauth2.Config{
  ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
  ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
  RedirectURL:  "https://yourapp.example.com/auth/google/callback",
  Scopes: []string{
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  },
  Endpoint: google.Endpoint,
}
```

### Line-by-line explanation
- googleCfg: declares a new OAuth2 config for Google.
- ClientID/ClientSecret: credentials obtained from Google Cloud Console; pulled from environment for security.
- RedirectURL: the URL Google redirects back to after the user authorizes; must match the consent screen setting.
- Scopes: the permissions your app requests (profile and email for basic identity).
- Endpoint: the provider’s OAuth 2.0 endpoints; google.Endpoint provides the proper AuthURL/TokenURL.
  
Notes:
- In production, keep credentials in a secret store or environment variables.
- For GitHub, you’ll set a separate oauth2.Config with GitHub endpoints.

## 2. End-to-end Go example: Google and GitHub login (complete runnable code)

The following Go code provides a minimal HTTP server that implements:
- Login endpoints for Google and GitHub
- Callback handlers to exchange codes for tokens
- Fetching user info from Google and GitHub
- Simple in-memory CSRF state management
- A session cookie to persist the logged-in user

Code (Go):

```go
package main

import (
	"context"
	"crypto/rand"
	crand "crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

type SessionUser struct {
	Provider string `json:"provider"`
	Name     string `json:"name"`
	Email    string `json:"email"`
}

// Simple in-memory state store for CSRF protection
var (
	googleCfg *oauth2.Config
	githubCfg *oauth2.Config

	// state -> timestamp
	stateStore = map[string]time.Time{}
)

func main() {
	// Load credentials from environment
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	googleClientSecret := os.Getenv("GOOGLE_CLIENT_SECRET")
	githubClientID := os.Getenv("GITHUB_CLIENT_ID")
	githubClientSecret := os.Getenv("GITHUB_CLIENT_SECRET")

	if googleClientID == "" || googleClientSecret == "" || githubClientID == "" || githubClientSecret == "" {
		log.Fatal("Missing client credentials. Set GOOGLE_CLIENT_ID/SECRET and GITHUB_CLIENT_ID/SECRET env vars.")
	}

	googleCfg = &oauth2.Config{
		ClientID:     googleClientID,
		ClientSecret: googleClientSecret,
		RedirectURL:  "http://localhost:8080/auth/google/callback",
		Scopes: []string{
			"https://www.googleapis.com/auth/userinfo.profile",
			"https://www.googleapis.com/auth/userinfo.email",
		},
		Endpoint: google.Endpoint,
	}

	githubCfg = &oauth2.Config{
		ClientID:     githubClientID,
		ClientSecret: githubClientSecret,
		RedirectURL:  "http://localhost:8080/auth/github/callback",
		Scopes:       []string{"read:user", "user:email"},
		Endpoint: oauth2.Endpoint{
			AuthURL:  "https://github.com/login/oauth/authorize",
			TokenURL: "https://github.com/login/oauth/access_token",
		},
	}

	mux := http.NewServeMux()
	mux.HandleFunc("/", homeHandler)
	mux.HandleFunc("/login/google", handleGoogleLogin)
	mux.HandleFunc("/auth/google/callback", handleGoogleCallback)
	mux.HandleFunc("/login/github", handleGithubLogin)
	mux.HandleFunc("/auth/github/callback", handleGithubCallback)

	fmt.Println("Server started at http://localhost:8080")
	log.Fatal(http.ListenAndServe(":8080", mux))
}

func homeHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/html")
	fmt.Fprintln(w, "<h1>OAuth 2.0 Demo: Google & GitHub Login</h1>")

	// Check for existing session cookie
	if c, err := r.Cookie("user"); err == nil {
		decoded, err2 := base64.StdEncoding.DecodeString(c.Value)
		if err2 == nil {
			var s SessionUser
			if json.Unmarshal(decoded, &s) == nil {
				fmt.Fprintf(w, "<p>Logged in via %s as %s (%s)</p>", s.Provider, s.Name, s.Email)
				return
			}
		}
	}

	// If not logged in, show login options
	fmt.Fprintln(w, `<p><a href="/login/google">Login with Google</a></p>`)
	fmt.Fprintln(w, `<p><a href="/login/github">Login with GitHub</a></p>`)
}

func handleGoogleLogin(w http.ResponseWriter, r *http.Request) {
	state := randToken(16)
	// store state for CSRF protection
	stateStore[state] = time.Now()
	url := googleCfg.AuthCodeURL(state, oauth2.AccessTypeOffline, oauth2.SetAuthURLParam("prompt", "consent"))
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func handleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	state := r.FormValue("state")
	if _, ok := stateStore[state]; !ok {
		http.Error(w, "Invalid state", http.StatusBadRequest)
		return
	}
	delete(stateStore, state)

	code := r.FormValue("code")
	token, err := googleCfg.Exchange(ctx, code)
	if err != nil {
		http.Error(w, "Code exchange failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	client := googleCfg.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		http.Error(w, "Failed to fetch user info: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var user struct {
		ID             string `json:"id"`
		Email          string `json:"email"`
		Name           string `json:"name"`
		VerifiedEmail  bool   `json:"verified_email"`
		Picture        string `json:"picture"`
	}
	if err := json.Unmarshal(body, &user); err != nil {
		http.Error(w, "Failed to parse user info: "+err.Error(), http.StatusInternalServerError)
		return
	}

	session := SessionUser{Provider: "Google", Name: user.Name, Email: user.Email}
	setSessionCookie(w, session)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func handleGithubLogin(w http.ResponseWriter, r *http.Request) {
	state := randToken(16)
	stateStore[state] = time.Now()
	url := githubCfg.AuthCodeURL(state)
	http.Redirect(w, r, url, http.StatusTemporaryRedirect)
}

func handleGithubCallback(w http.ResponseWriter, r *http.Request) {
	ctx := context.Background()
	state := r.FormValue("state")
	if _, ok := stateStore[state]; !ok {
		http.Error(w, "Invalid state", http.StatusBadRequest)
		return
	}
	delete(stateStore, state)

	code := r.FormValue("code")
	token, err := githubCfg.Exchange(ctx, code)
	if err != nil {
		http.Error(w, "Code exchange failed: "+err.Error(), http.StatusInternalServerError)
		return
	}
	client := githubCfg.Client(ctx, token)
	resp, err := client.Get("https://api.github.com/user")
	if err != nil {
		http.Error(w, "Failed to fetch user: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)

	var gh struct {
		Login string `json:"login"`
		Name  string `json:"name"`
		Email string `json:"email"`
	}
	if err := json.Unmarshal(body, &gh); err != nil {
		http.Error(w, "Failed to parse user: "+err.Error(), http.StatusInternalServerError)
		return
	}
	// If email is empty, try to fetch emails endpoint
	if gh.Email == "" {
		resp2, err := client.Get("https://api.github.com/user/emails")
		if err == nil && resp2 != nil {
			defer resp2.Body.Close()
			b2, _ := io.ReadAll(resp2.Body)
			var emails []struct {
				Email    string `json:"email"`
				Primary  bool   `json:"primary"`
				Verified bool   `json:"verified"`
			}
			if json.Unmarshal(b2, &emails) == nil {
				for _, e := range emails {
					if e.Primary && e.Verified {
						gh.Email = e.Email
						break
					}
				}
			}
		}
	}
	name := gh.Name
	if name == "" {
		name = gh.Login
	}
	session := SessionUser{Provider: "GitHub", Name: name, Email: gh.Email}
	setSessionCookie(w, session)
	http.Redirect(w, r, "/", http.StatusSeeOther)
}

func randToken(n int) string {
	b := make([]byte, n)
	// crand.Read returns an error if entropy isn't available; ignore for demonstration
	if _, err := crand.Read(b); err != nil {
		// Fallback: use time-based entropy (not cryptographically strong)
		return base64.RawURLEncoding.EncodeToString([]byte(fmt.Sprintf("%d", time.Now().UnixNano())))
	}
	return base64.RawURLEncoding.EncodeToString(b)
}

func setSessionCookie(w http.ResponseWriter, s SessionUser) {
	b, _ := json.Marshal(s)
	enc := base64.StdEncoding.EncodeToString(b)
	http.SetCookie(w, &http.Cookie{
		Name:     "user",
		Value:    enc,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // set to true in production behind HTTPS
		Expires:  time.Now().Add(24 * time.Hour),
	})
}
```

Note: This is a concise, self-contained example for learning. In production, you should:
- Serve over HTTPS and set Secure cookies.
- Use a robust session store instead of in-memory maps.
- Validate and refresh tokens as needed and validate ID tokens for OpenID Connect.
- Consider PKCE for public clients and proper error handling across all flows.

### Line-by-line explanation
- package main: defines the executable package.
- Imports: bring in context, crypto, encoding, io, logging, HTTP, OS, time, and oauth2 packages.
- type SessionUser: defines a compact structure to store a user’s identity after login.
- var googleCfg / githubCfg: OAuth2 configs for Google and GitHub, respectively.
- var stateStore: simple in-memory map for CSRF state values.
- main(): reads credentials from environment, constructs OAuth configs, wires HTTP routes, starts the server.
- homeHandler: displays a greeting, shows current login status based on the "user" cookie, or offers login options.
- handleGoogleLogin: creates a random state token, stores it for CSRF protection, redirects to Google’s OAuth consent screen.
- handleGoogleCallback: validates the state, exchanges code for a token, fetches Google userinfo, creates a session, and redirects home.
- handleGithubLogin: similar flow for GitHub: create a state, redirect to GitHub’s consent screen.
- handleGithubCallback: exchanges code for a token, fetches GitHub user data, creates a session, redirects home.
- randToken: crypto-secure random token generator; falls back to a time-based value if entropy is unavailable.
- setSessionCookie: serializes the SessionUser to JSON, base64-encodes it, and stores it in a HttpOnly cookie named "user".
  
Production takeaway:
- Use HTTPS, HttpOnly + Secure cookies, and a persistent session store instead of an in-memory map.
- Validate user identity thoroughly, and consider using OpenID Connect ID tokens for robust identity verification.

## 3. Securing sessions and production considerations (code snippet)

- Use secure cookies (HttpOnly and Secure) in production.
- Add explicit SameSite policy to cookies.
- Protect CSRF with nonces/states and implement cookie/session expiration.
- Validate tokens on the server and refresh if needed.

Code snippet (session cookie helper with secure options):

```go
func setSecureSessionCookie(w http.ResponseWriter, s SessionUser) {
	b, _ := json.Marshal(s)
	enc := base64.StdEncoding.EncodeToString(b)
	http.SetCookie(w, &http.Cookie{
		Name:     "user",
		Value:    enc,
		Path:     "/",
		HttpOnly: true,
		Secure:   true, // requires HTTPS
		SameSite: http.SameSiteLaxMode,
		Expires:  time.Now().Add(24 * time.Hour),
	})
}
```

Line-by-line explanation
- setSecureSessionCookie: a version of the cookie setter that enables a Secure flag and SameSite policy.
- b, _ := json.Marshal(s): serialize the session struct to JSON.
- enc := base64.StdEncoding.EncodeToString(b): encode the JSON as a string for cookie storage.
- http.SetCookie: creates the cookie with HttpOnly, Secure, SameSite, a path of "/", and an expiration.

Notes:
- In real deployments, consider rotating tokens, using short-lived access tokens, and storing session state in a durable store (Redis, database) with a separate session identifier.

## 4. X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code

- Pitfall 1: CSRF protection is missing or weak
  - Bad:
    ```go
    // Auto-redirect without validating 'state'
    url := googleCfg.AuthCodeURL("any-state")
    http.Redirect(w, r, url, http.StatusTemporaryRedirect)
    ```
  - Good:
    ```go
    state := randToken(16)
    stateStore[state] = time.Now()
    url := googleCfg.AuthCodeURL(state)
    http.Redirect(w, r, url, http.StatusTemporaryRedirect)
    // In the callback:
    // verify state exists in stateStore and hasn't expired
    ```
- Pitfall 2: Secrets stored in code or logs
  - Bad:
    ```go
    googleCfg := &oauth2.Config{
      ClientID:     "YOUR_CLIENT_ID",
      ClientSecret: "YOUR_CLIENT_SECRET",
      // ...
    }
    ```
  - Good:
    ```go
    googleCfg := &oauth2.Config{
      ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
      ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
      // ...
    }
    // Secrets are loaded from environment or a secret manager
    ```
- Pitfall 3: Lack of HTTPS and insecure cookies
  - Bad:
    ```go
    http.SetCookie(w, &http.Cookie{Name: "user", Value: enc, Path: "/"})
    ```
  - Good:
    ```go
    http.SetCookie(w, &http.Cookie{
      Name:     "user",
      Value:    enc,
      Path:     "/",
      HttpOnly: true,
      Secure:   true,
      SameSite: http.SameSiteLaxMode,
      Expires:  time.Now().Add(24 * time.Hour),
    })
    ```
- Pitfall 4: Not handling errors from token exchange or userinfo fetch
  - Bad:
    ```go
    token, _ := googleCfg.Exchange(ctx, code)
    client := googleCfg.Client(ctx, token)
    resp, _ := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
    ```
  - Good:
    ```go
    token, err := googleCfg.Exchange(ctx, code)
    if err != nil { http.Error(w, "Code exchange failed", http.StatusInternalServerError); return }
    client := googleCfg.Client(ctx, token)
    resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
    if err != nil { http.Error(w, "Failed to fetch user info", http.StatusInternalServerError); return }
    ```

## 5. Y. Why This Matters In Real Systems — production context and real usage

- Security posture
  - Use HTTPS across all endpoints; cookies should be Secure and HttpOnly to minimize risk of XSS/CSRF.
  - Validate identity data using OpenID Connect ID tokens when available; verify issuer (iss), audience (aud), and token expiry.
  - Implement token refresh and rotation: short-lived access tokens with refresh tokens where applicable.
- Reliability and scale
  - Don’t rely on in-memory state for CSRF or sessions in multi-instance deployments; use a distributed store (Redis, DynamoDB, etc.).
  - Implement proper session expiration and cleanup policies; consider a dedicated session service or middleware.
- User provisioning and UX
  - Provide a consistent user profile inside your app; handle cases where user email is missing or unverified.
  - Offer logout that invalidates the session on server side if you maintain a session store.
- Compliance and auditing
  - Log OAuth events for security auditing (start of login, callback success, errors).
  - Respect user privacy and scopes; request only what you need and disclose data usage in your privacy policy.

## 6. Z. Study Questions — 5 recall questions

1) What is the purpose of the state parameter in OAuth 2.0 authorization requests?
2) Which Google endpoint is typically used to fetch basic user identity information after obtaining an access token?
3) How do you configure GitHub OAuth endpoints in Go if you don’t use a provider-specific package?
4) Why is it important to store the client secret securely and not in source code?
5) What are some real-world security improvements you would add to the sample in production?

## 7. Exercise — a practical multi-part coding challenge

Part A. Add a logout endpoint
- Implement a /logout route that clears the user session cookie and redirects to /.
- Requirements:
  - Invalidate the cookie by setting an expired date.
  - Confirm logout to the user.

Part B. Add a /me endpoint and update UI
- Implement /me that returns the currently logged-in user as JSON.
- Update the home page to show a small “Me” link when logged in.
- Example: GET /me returns { "provider":"Google","name":"Alice","email":"alice@example.com" }

Part C. Refactor and unify small helpers
- Extract a common function to decode the session cookie and return a SessionUser (or nil if not authenticated).
- Use this helper in homeHandler and /me.
- Ensure error handling is consistent.

Part D. Production polish (optional)
- Replace the in-memory state store with a Redis-backed store or a small database to track CSRF states with TTL.
- Switch cookies to Secure and SameSite policies and enable TLS in your deployment.
- Add a simple token validation step for Google’s ID token (OIDC) if you choose to verify identity tokens directly.

Deliverable
- Provide a single Go file (or modular files if you prefer) that compiles and runs with proper Google and GitHub credentials set in environment variables.
- Include clear comments and minimal tests if you wish to extend.

This completes a full, practical lesson on implementing OAuth 2.0 login with Google and GitHub in Go, covering core concepts, a working sample, production considerations, common beginner mistakes, and hands-on exercises to solidify understanding.