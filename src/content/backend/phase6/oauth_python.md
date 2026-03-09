# OAuth 2.0 — Login with Google / GitHub in Python

Compelling introductory paragraph:
In Backend Engineering, authentication is the gateway to secure user data and protected resources. OAuth 2.0 Login with Google or GitHub lets you delegate user authentication to trusted providers while your backend handles sessions and authorization. This lesson teaches you how to implement robust Authorization Code flows (with PKCE options), secure callback handling, token exchange, and secure session management in Python. You'll learn how to reduce risk (CSRF, redirect URI validation, token handling), while building scalable, auditable login in production systems.

## 1. OAuth 2.0 Basics for Backend Login
OAuth 2.0 enables a client (your backend) to obtain access and identity information about a user from an authorization server (Google or GitHub) after the user consents. The Authorization Code flow is common for server-side apps: you redirect the user to the provider's consent screen, the provider returns an authorization code to your callback URL, and your backend exchanges that code for tokens. Benefits include secure token handling on the server, the ability to rotate secrets, and fine-grained scopes. PKCE (Proof Key for Code Exchange) adds security for public clients and mobile apps by tying the auth request to a code_verifier without requiring a stored client secret on the client side.

Code: helper to build provider authorization URLs (without full server). This illustrates how to compose the URLs for Google and GitHub with standard scopes and a state parameter for CSRF protection.

```python
import os
import secrets
import urllib.parse

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID")
REDIRECT_BASE = os.environ.get("OAUTH_REDIRECT_BASE", "http://localhost:8000")

def generate_state() -> str:
    return secrets.token_urlsafe(16)

def google_auth_url(state: str, code_challenge: str | None = None) -> str:
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "response_type": "code",
        "scope": "openid email profile",
        "redirect_uri": f"{REDIRECT_BASE}/auth/google/callback",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    if code_challenge:
        params.update({"code_challenge": code_challenge, "code_challenge_method": "S256"})
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)

def github_auth_url(state: str, code_challenge: str | None = None) -> str:
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": f"{REDIRECT_BASE}/auth/github/callback",
        "scope": "read:user user:email",
        "state": state,
    }
    if code_challenge:
        params.update({"code_challenge": code_challenge, "code_challenge_method": "S256"})
    return "https://github.com/login/oauth/authorize?" + urllib.parse.urlencode(params)

# Example usage (not a running server):
state = generate_state()
google_url = google_auth_url(state)
github_url = github_auth_url(state)
print("Google login URL:", google_url)
print("GitHub login URL:", github_url)
```

### Line-by-line explanation
- Import necessary modules for environment config, randomness, and URL building.
- GOOGLE_CLIENT_ID, GITHUB_CLIENT_ID, and REDIRECT_BASE are read from environment to avoid hardcoding secrets.
- generate_state creates a random string to protect against CSRF.
- google_auth_url builds Google’s authorization URL with required scopes and a redirect_uri; it optionally adds PKCE fields if a code_challenge is provided.
- github_auth_url builds GitHub’s authorization URL with required scopes; it mirrors Google’s approach but uses GitHub’s endpoints.
- The example usage shows how to create authorization URLs for both providers.

## 2. Building a Python Backend (FastAPI) to Initiate OAuth 2.0 with Google and GitHub
This section provides a practical server-side implementation using FastAPI. It includes endpoints to start the OAuth flow and callback handlers to exchange codes for tokens and fetch user info. It also demonstrates a simple in-memory state store and optional PKCE support. In production, replace in-memory storage with a persistent store (Redis, database) and add proper error handling, TLS termination, and analytics.

Code: a FastAPI app that starts the OAuth flow and handles callbacks for Google and GitHub, including optional PKCE code_verifier storage per state.

```python
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse, JSONResponse
import os
import secrets
import urllib.parse
import httpx

app = FastAPI()

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GITHUB_CLIENT_ID = os.environ.get("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.environ.get("GITHUB_CLIENT_SECRET")
REDIRECT_BASE = os.environ.get("OAUTH_REDIRECT_BASE", "http://localhost:8000")

# In-memory stores (demo). Use persistent storage in production.
STATE_STORE = {}
PKCE_STORE = {}

def generate_state() -> str:
    return secrets.token_urlsafe(16)

def generate_pkce_code_verifier() -> str:
    return secrets.token_urlsafe(32)

def code_challenge_verifier(verifier: str) -> str:
    import hashlib, base64
    digest = hashlib.sha256(verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode()

def google_auth_url(state: str, code_challenge: str | None = None) -> str:
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "response_type": "code",
        "scope": "openid email profile",
        "redirect_uri": f"{REDIRECT_BASE}/auth/google/callback",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    if code_challenge:
        params.update({"code_challenge": code_challenge, "code_challenge_method": "S256"})
    return "https://accounts.google.com/o/oauth2/v2/auth?" + urllib.parse.urlencode(params)

def github_auth_url(state: str, code_challenge: str | None = None) -> str:
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": f"{REDIRECT_BASE}/auth/github/callback",
        "scope": "read:user user:email",
        "state": state,
    }
    if code_challenge:
        params.update({"code_challenge": code_challenge, "code_challenge_method": "S256"})
    return "https://github.com/login/oauth/authorize?" + urllib.parse.urlencode(params)

@app.get("/auth/{provider}")
async def login(provider: str):
    state = generate_state()
    STATE_STORE[state] = {"provider": provider}
    code_verifier = generate_pkce_code_verifier()
    code_challenge = code_challenge_verifier(code_verifier)
    PKCE_STORE[state] = code_verifier
    if provider == "google":
        url = google_auth_url(state, code_challenge)
    elif provider == "github":
        url = github_auth_url(state, code_challenge)
    else:
        return JSONResponse({"error": "Unsupported provider"}, status_code=400)
    return RedirectResponse(url)

@app.get("/auth/google/callback")
async def google_callback(code: str | None = None, state: str | None = None):
    if state not in STATE_STORE:
        return JSONResponse({"error": "Invalid state"}, status_code=400)
    code_verifier = PKCE_STORE.get(state)
    token_url = "https://oauth2.googleapis.com/token"
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": f"{REDIRECT_BASE}/auth/google/callback",
        "grant_type": "authorization_code",
        "code_verifier": code_verifier,
    }
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(token_url, data=data)
        token_json = token_resp.json()
        access_token = token_json.get("access_token")
        userinfo_resp = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        userinfo = userinfo_resp.json()
    # Clean up
    del STATE_STORE[state]
    PKCE_STORE.pop(state, None)
    return {"provider": "google", "userinfo": userinfo}

@app.get("/auth/github/callback")
async def github_callback(code: str | None = None, state: str | None = None):
    if state not in STATE_STORE:
        return JSONResponse({"error": "Invalid state"}, status_code=400)
    code_verifier = PKCE_STORE.get(state)
    token_url = "https://github.com/login/oauth/access_token"
    headers = {"Accept": "application/json"}
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": f"{REDIRECT_BASE}/auth/github/callback",
        "state": state,
        "code_verifier": code_verifier
    }
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(token_url, data=data, headers=headers)
        token_json = token_resp.json()
        access_token = token_json.get("access_token")
        user_resp = await client.get("https://api.github.com/user",
                                     headers={"Authorization": f"token {access_token}"})
        user_info = user_resp.json()
    del STATE_STORE[state]
    PKCE_STORE.pop(state, None)
    return {"provider": "github", "userinfo": user_info}
```

### Line-by-line explanation
- Import FastAPI, request/response types, environment access, and httpx for HTTP calls.
- Read provider credentials and base redirect URL from environment variables to avoid hardcoding.
- STATE_STORE and PKCE_STORE are in-memory maps to tie the authorization request to the callback and to store code_verifier for PKCE.
- generate_state creates a random string to defend against CSRF in the OAuth flow.
- generate_pkce_code_verifier creates a high-entropy value used as the PKCE code_verifier.
- code_challenge_verifier derives a SHA-256-based code_challenge from the verifier (PKCE).
- google_auth_url builds Google’s authorization URL; if a PKCE code_challenge is supplied, it includes PKCE parameters.
- github_auth_url builds GitHub’s authorization URL; PKCE is optional here based on provider support.
- /auth/{provider} starts the flow by generating state and PKCE verifier, then redirects the user to the provider.
- google_callback handles Google’s authorization response, validates state, exchanges code for tokens (including code_verifier for PKCE), fetches user info, and cleans up stored state.
- github_callback does the same for GitHub, using the token endpoint and GitHub’s user API.

## 3. Security Enhancements: PKCE, State, and Redirect URI Validation
Security for OAuth flows hinges on preventing CSRF, binding the authorization to the initiating client, and ensuring redirect URIs are controlled and registered. PKCE adds a verifier to the code exchange, reducing risk for public clients. This section shows how to wire PKCE with state and how to validate redirect URIs to prevent open redirects.

Code: helper functions and integration into the callbacks to validate redirect URIs and handle PKCE more robustly.

```python
from typing import List
import urllib.parse

ALLOWED_REDIRECTS = {
    "google": [
        "http://localhost:8000/auth/google/callback",
        "https://yourdomain.com/auth/google/callback",
    ],
    "github": [
        "http://localhost:8000/auth/github/callback",
        "https://yourdomain.com/auth/github/callback",
    ],
}

def is_valid_redirect_uri(redirect_uri: str, provider: str) -> bool:
    allowed: List[str] = ALLOWED_REDIRECTS.get(provider, [])
    return redirect_uri in allowed

# Example: integrate into callback (pseudo-usage in the real endpoints)
# In Google callback, before exchanging code:
# if not is_valid_redirect_uri(f"{REDIRECT_BASE}/auth/google/callback", "google"):
#     return JSONResponse({"error": "Invalid redirect_uri"}, status_code=400)
```

### Line-by-line explanation
- ALLOWED_REDIRECTS maps provider names to permitted callback URLs; this prevents open redirects and ensures the provider redirects only to known endpoints.
- is_valid_redirect_uri checks if the supplied redirect_uri is in the allowed list for the given provider.
- The commented usage shows where to apply redirect_uri validation in the callback handlers before performing token exchanges.

> Production note: In real systems, you should validate the redirect_uri that comes back in the token exchange request against the one that was originally used in the authorization request. This often requires storing the exact redirect_uri alongside the state and provider in your state store.

## 4. Token Management: Creating Sturdy Sessions
After a successful login, you typically create a server-side session or issue a signed token (e.g., JWT) to the client for subsequent requests. This section demonstrates a simple approach to create a signed session token (JWT) and set it as a secure, HttpOnly cookie. For production, prefer a robust session store and rotate tokens, plus proper revocation lists.

Code: minimal JWT-based session creation and validation placeholders.

```python
import time
import jwt

JWT_SECRET = os.environ.get("JWT_SECRET", "your-secure-secret")
JWT_ALGORITHM = "HS256"
JWT_EXP_SECONDS = 3600

def create_session_token(user_id: str, provider: str) -> str:
    payload = {
        "sub": user_id,
        "provider": provider,
        "iat": int(time.time()),
        "exp": int(time.time()) + JWT_EXP_SECONDS,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_session_token(token: str):
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
```

### Line-by-line explanation
- Import time and PyJWT to build and verify tokens.
- JWT_SECRET is read from the environment to sign tokens securely; in production, use a strong secret management system.
- create_session_token builds a JWT with subject (user_id), the provider, issued-at, and expiration.
- decode_session_token verifies and decodes the token, returning the payload or None if invalid/expired.
- These helpers can be integrated into the callback handlers to issue a cookie-based session after successful login and to validate sessions on protected endpoints.

## 5. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code
A few common missteps can undermine security and reliability. Here are real-world pitfalls with side-by-side contrasts.

- Pitfall 1: Not validating the state or reusing state indirectly
Bad:
```python
# bad: trusting 'state' without checking it against a store
state = request.query_params.get("state")
```
Good:
```python
# good: verify state exists in a server-side store and belongs to this flow
state = request.query_params.get("state")
if state not in STATE_STORE:
    return JSONResponse({"error": "Invalid state"}, status_code=400)
```

- Pitfall 2: Exposing client secrets to the client or frontend
Bad:
```js
// frontend code (bad) — exposes sensitive data
const clientSecret = "<from-backend>";
fetch(`/auth/google?client_secret=${clientSecret}`);
```
Good:
```python
# backend-only: never send client_secret to frontend; use backend flow
# The frontend only redirects to /auth/google; secrets stay on server
```

- Pitfall 3: Accepting any redirect_uri without validation
Bad:
```python
redirect_uri = request.query_params.get("redirect_uri")
# risk: redirect_uri is unchecked and could point to attacker
```
Good:
```python
redirect_uri = request.query_params.get("redirect_uri")
if not is_valid_redirect_uri(redirect_uri, provider="google"):
    return JSONResponse({"error": "Invalid redirect_uri"}, status_code=400)
```

- Pitfall 4: Failing to verify token scopes and ID token audience
Bad:
```python
# assume any token is valid and contains required fields
userinfo = token_response.json()
```
Good:
```python
# verify audience, issuer, and required claims before trusting tokens
```

- Pitfall 5: Not handling token exchange errors or provider outages
Bad:
```python
token_resp = await client.post(token_url, data=data)
```
Good:
```python
token_resp = await client.post(token_url, data=data)
if token_resp.status_code >= 400:
    # log and return a safe error
    return JSONResponse({"error": "Token exchange failed"}, status_code=502)
```

## 6. Why This Matters In Real Systems — production context and real usage
In production, OAuth 2.0 login is a component of your authentication and authorization strategy, not a one-off script. Real systems must:
- Securely manage secrets: store client IDs/secrets and JWT signing keys in a secret manager; rotate keys regularly.
- Enforce PKCE and CSRF protections: use a strong, verifiable state value; PKCE is strongly recommended for public clients or where clients cannot securely store secrets.
- Validate redirect URIs rigorously: only allow pre-registered, exact redirect URLs to prevent open redirect and phishing attacks.
- Use OpenID Connect when possible: request openid, email, profile scopes to obtain a user identifier (sub) and avoid reinventing user identifiers.
- Implement token lifetimes and refresh tokens: short-lived access tokens with secure refresh tokens (rotated on each use) reduce exposure risk.
- Secure storage and sessions: prefer server-side sessions or signed tokens with HttpOnly cookies; protect against XSS and CSRF.
- Observability and auditing: log OAuth flows, unusual login patterns, and failed attempts; monitor for abuse or brute-force attempts.
- Data model design: store a normalized user entity with links to provider identity (provider, provider_id, email) to support linking multiple providers to a single local user.

Production-ready patterns you may adopt:
- Use a persistent cache/db for state and PKCE code_verifiers; expire stale entries.
- Validate id_token (for OIDC) by verifying issuer, audience, and nonce.
- Use provider metadata (discovery) to dynamically fetch endpoints and supported features.

## Z. Study Questions — 5 recall questions
1) What are the main differences between the Authorization Code flow and the Implicit flow, and why is the Authorization Code flow preferred for backend servers?  
2) What is PKCE and why should you use it even when your backend has a client secret?  
3) How does a state parameter protect against CSRF in OAuth redirects?  
4) How do you securely exchange an authorization code for tokens, and what should you verify in the response?  
5) Why is redirect URI validation important, and how would you implement it in code?

## Exercise — a practical multi-part coding challenge
Part 1: Scaffold a FastAPI project
- Create a Python FastAPI app similar to Section 2 that supports Google and GitHub login flows.
- Use environment variables for client IDs, secrets, and the redirect base.
- Implement at least one provider using Authorization Code with PKCE (generate code_verifier and code_challenge, include in auth URL and token request).

Part 2: Harden security with PKCE and redirect validation
- Add PKCE support end-to-end (code_verifier stored per state and sent during token exchange).
- Implement strict redirect_uri validation using a per-provider allowed list.
- Ensure the state value is checked against a server-side store.

Part 3: Implement session management
- After a successful login, issue a signed JWT for the user and set it as an HttpOnly cookie.
- Create a protected route that requires a valid session cookie and returns the logged-in user’s email.

Part 4: Production readiness
- Replace in-memory stores with a Redis-backed or database-backed store for state PKCE and user sessions.
- Add basic error handling and logging around all OAuth network calls.
- Create a simple test harness that mocks provider responses to validate the flow.

Part 5: Documentation and testing
- Write a short README describing how to configure the app, what scopes are requested, and how to run the server locally.
- Add a few unit tests that verify: (a) state validation fails on invalid state, (b) redirect URIs are rejected if not whitelisted, (c) token exchange handles error responses gracefully.

Note: This lesson provides a structured approach to building a robust OAuth 2.0 login experience for Google and GitHub in a Python backend. In real projects, you would integrate with a proper OAuth library, adhere to provider changes, and incorporate comprehensive tests, observability, and security reviews.