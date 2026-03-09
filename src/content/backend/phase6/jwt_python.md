# JWT — Stateless Authentication in Python

Stateless authentication with JSON Web Tokens (JWT) lets backend services verify user identity without maintaining server-side sessions. By signing claims into a token, services can scale horizontally, enable API gateways, and secure microservices communication. In production, JWTs require careful handling of keys, expiration, and revocation strategies. This lesson covers core concepts, practical Python implementations (with PyJWT), and real-world considerations for secure, scalable backends.

## 1. JWT Fundamentals

Understand what a JWT is, how it is structured, and why it enables stateless authentication.

- Structure: header.payload.signature
- Signature ensures integrity and authenticity (signed with a secret or private key)
- Claims: registered (exp, iss, aud, sub) and custom application data
- Stateless: the server does not store session data; it only verifies the token on each request

Code: Creating and verifying a JWT with PyJWT (HS256)

```python
import jwt
import datetime

SECRET_KEY = "supersecretkey"  # In production, read from environment variable

def create_token(user_id: str, minutes_valid: int = 60) -> str:
    now = datetime.datetime.utcnow()
    exp = now + datetime.timedelta(minutes=minutes_valid)
    payload = {
        "sub": user_id,            # subject = user identifier
        "iss": "myapp",              # issuer
        "aud": "myapp_users",        # audience
        "iat": now,                   # issued at
        "exp": exp                    # expiration time
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token

def verify_token(token: str) -> dict:
    # Decodes and validates signature, exp, iss, and aud
    payload = jwt.decode(
        token,
        SECRET_KEY,
        algorithms=["HS256"],
        audience="myapp_users",
        issuer="myapp",
    )
    return payload
```

### Line-by-line explanation

- Line 1: Import the PyJWT library to encode/decode tokens.
- Line 2: Import datetime to compute issued-at and expiration times.
- Line 4: Define a secret key used to sign tokens (should come from env in production).
- Line 6: Define create_token with user_id and an optional validity window.
- Line 7: Get current UTC time.
- Line 8: Compute the expiration time by adding the desired duration.
- Lines 9-16: Build the token payload with standard claims (sub, iss, aud, iat, exp) for proper validation and scoping.
- Line 17: Encode the payload using HS256 and return the JWT as a string.
- Line 20: Define verify_token to decode and validate the token.
- Lines 21-27: Decode with audience and issuer checks to ensure the token is intended for this app and was issued by trusted source; will raise exceptions if invalid or expired.
- The function returns the decoded payload if validation passes.

## 2. Implementing JWT Encoding/Decoding in a Python Backend

This section demonstrates a concrete Python backend flow using PyJWT, including how to extract the token from an HTTP request and validate it.

Code: Token handling in a minimal Flask-like flow (without a full app)

```python
import jwt
import datetime
import os

SECRET_KEY = os.environ.get("JWT_SECRET", "dev-secret")

def create_token(user_id: str, minutes_valid: int = 60) -> str:
    now = datetime.datetime.utcnow()
    exp = now + datetime.timedelta(minutes=minutes_valid)
    payload = {
        "sub": user_id,
        "iss": "myapp",
        "aud": "myapp_users",
        "iat": now,
        "exp": exp
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
    return token

def decode_token(token: str) -> dict:
    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=["HS256"],
        audience="myapp_users",
        issuer="myapp"
    )
```

### Line-by-line explanation

- Line 1: Import PyJWT for token operations.
- Line 2: Import datetime for time-based claims.
- Line 4: Read the JWT signing secret from an environment variable; fallback to a default for development.
- Lines 6-14: Same token creation flow as in the fundamentals section, producing a signed HS256 JWT.
- Line 16-21: decode_token validates signature and claims; raises exceptions on invalid/expired tokens.
- The decode call enforces audience and issuer checks to prevent token misuse.

Code: Minimal decorator and endpoint example (Flask-style) to protect routes

```python
from flask import Flask, request, jsonify
import jwt

app = Flask(__name__)

# SECRET_KEY is read from env as shown above
def verify_token(token: str) -> dict:
    return jwt.decode(
        token,
        SECRET_KEY,
        algorithms=["HS256"],
        audience="myapp_users",
        issuer="myapp",
    )

def jwt_required(func):
    from functools import wraps
    @wraps(func)
    def wrapper(*args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid Authorization header"}), 401
        token = auth.split(" ", 1)[1]
        try:
            payload = verify_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        request.user_id = payload["sub"]
        return func(*args, **kwargs)
    return wrapper

USERS = {"alice": "password123"}

@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    username = data.get("username")
    password = data.get("password")
    if not username or not password or USERS.get(username) != password:
        return jsonify({"error": "Invalid credentials"}), 401
    token = create_token(user_id=username, minutes_valid=60)
    return jsonify({"token": token})

@app.route("/protected")
@jwt_required
def protected():
    return jsonify({"message": f"Hello, user {request.user_id}!"})

if __name__ == "__main__":
    app.run(debug=True)
```

### Line-by-line explanation

- Line 1-3: Import Flask components and PyJWT for token operations.
- Line 6: Define a decorator factory jwt_required to enforce token presence/validation on routes.
- Line 7-17: Implement wrapper that reads the Authorization header, ensures it uses Bearer scheme, decodes the token, and handles common errors.
- Line 18: Attach the user_id from the token payload to the request context for downstream handlers.
- Lines 21-25: Simple in-memory user store for demonstration.
- Lines 28-37: /login endpoint authenticates credentials and issues a token via create_token.
- Line 40: Protected endpoint that requires a valid token and returns a user-specific message.
- Line 42: Run the Flask app.

## 3. Stateless Auth Flow in Real Web Apps

Understanding how a stateless JWT-based flow typically looks in a real backend:

- User logs in with credentials.
- Server issues an access token (short-lived) and optionally a refresh token (longer-lived but stored securely).
- Client sends the access token with each request in Authorization: Bearer <token>.
- Server validates token, enforces exp, and serves the request without maintaining server-side sessions.
- Token rotation/refresh and revocation strategies address practical concerns (e.g., compromised tokens).

Key patterns:
- Access tokens: HS256 or RS256; short TTL (e.g., 15–60 minutes)
- Refresh tokens: longer TTL (e.g., days/weeks) used to obtain new access tokens
- Rotate tokens: issue a new refresh token upon refresh to minimize reuse of a stolen refresh token
- Revocation: maintain a short grace window or a revocation list (e.g., Redis) if you need the ability to revoke tokens

Line-by-line notes on token flow (pseudo-steps):
- User submits credentials to /login
- Server validates credentials, issues access_token and optional refresh_token
- Client stores tokens securely (prefer HttpOnly cookies or secure storage with CSRF mitigation)
- Client calls protected endpoints with Authorization: Bearer <access_token>
- Server validates token; if expired and a valid refresh token exists, issue new tokens

## 4. Security Considerations and Best Practices

- Secrets management: Never hard-code secrets; use environment variables or a secrets manager.
- Algorithm choice: Prefer RS256 (asymmetric) for distributed systems with public keys, or HS256 with strong secret management.
- Expiration and rotation: Short-lived access tokens; implement refresh tokens with rotation and revocation.
- Token storage on client: HTTP-only cookies reduce XSS risk but require CSRF protections; localStorage increases XSS risk.
- Revocation strategy: JWTs are inherently hard to revoke; combine short TTLs with a revocation list or short-lived access tokens plus versioned claims.
- Validate all claims: iss, aud, sub, iat, exp. Do not skip these checks.
- Key rotation: Plan for key rotation; publish JWKS (public keys) for RS256 and rotate keys carefully.
- Logging and monitoring: Track failed verification attempts and token abuse patterns.

Example: Setting a token in an HttpOnly cookie (server-side)

```python
from flask import Flask, jsonify, make_response
import jwt, datetime, os

app = Flask(__name__)
SECRET_KEY = os.environ.get("JWT_SECRET", "dev-secret")

def create_token(user_id: str, minutes_valid: int = 60) -> str:
    now = datetime.datetime.utcnow()
    exp = now + datetime.timedelta(minutes=minutes_valid)
    payload = {"sub": user_id, "iss": "myapp", "aud": "myapp_users", "iat": now, "exp": exp}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")

@app.route("/login", methods=["POST"])
def login():
    # ... authenticate user ...
    token = create_token("alice", 15)
    resp = make_response(jsonify({"token": token}))
    resp.set_cookie("jwt", token, httponly=True, secure=True, samesite="Lax", max_age=900)
    return resp
```

### Line-by-line explanation

- Line 1-3: Import Flask utilities, PyJWT, and standard libs.
- Line 5: Define a function to create a signed JWT with a short TTL.
- Lines 6-9: Build standard claims (iss, aud, iat, exp) and sign with HS256.
- Line 11-17: In login route, after authenticating, generate a token and send it as an HttpOnly cookie to mitigate XSS risks.
- Line 18-20: The cookie is httpOnly, secure in production, with SameSite policy to reduce CSRF risk.

## X. Common Beginner Mistakes

- Pitfall 1: Not validating the signature or expiration
Bad:
```python
# Dangerous: no signature check or expiration verification
payload = jwt.decode(token, options={"verify_signature": False})
```
Good:
```python
payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], audience="myapp_users", issuer="myapp")
```

- Pitfall 2: Hard-coding secrets in code
Bad:
```python
SECRET_KEY = "dev-secret-key-please-change"
```
Good:
```python
import os
SECRET_KEY = os.environ["JWT_SECRET"]  # required
```

- Pitfall 3: Skipping audience/issuer checks
Bad:
```python
payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
```
Good:
```python
payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"],
                     audience="myapp_users", issuer="myapp")
```

- Pitfall 4: Storing tokens insecurely on the client
Bad (localStorage):
- Good (HttpOnly cookie):
```python
response.set_cookie("jwt", token, httponly=True, secure=True, samesite="Lax")
```

- Pitfall 5: Using a single long-lived token without rotation
Bad:
```python
# One token, long TTL; no refresh flow
payload = {"sub": user_id, "exp": far_future}
```
Good:
```python
# Short-lived access token + refresh token; rotate on refresh
```

### Line-by-line explanation

- For each pitfall, the bad example demonstrates the insecure or suboptimal approach, and the good example shows the corrected pattern. The key ideas are to always validate tokens properly, manage secrets securely, verify all claims (iss/aud), store tokens securely on the client, and implement token rotation and refresh strategies to balance usability and security.

## Y. Why This Matters In Real Systems

- Scalability: Stateless JWTs let load-balanced services authenticate requests without shared session state.
- Microservices: JWTs can be passed between services, preserving identity without centralized session storage.
- Key management: In large systems, RS256 with a JWKS endpoint enables key rotation without secret leakage and supports distributed signers.
- Revocation challenges: JWTs cannot be arbitrarily revoked without a revocation strategy; combine short TTLs with refresh tokens and a revocation list or blacklist.
- Compliance and auditing: JWTs carry claims that enable easier auditing of access events, but you must carefully handle sensitive data inside tokens.
- Performance: Token verification is cheap but relies on cryptographic operations; cache verification results when appropriate and monitor token abuse.

## Z. Study Questions

1. What are the three parts of a JWT and what is stored in each?
2. Why is it important to verify the exp, iss, and aud claims on every token?
3. What is the difference between HS256 and RS256 in the context of JWTs?
4. How does a refresh token workflow help mitigate token revocation challenges?
5. What are the security trade-offs between storing tokens in HttpOnly cookies vs. localStorage?

## Exercise

Part A: Set up a JWT helper module
- Create a Python module auth_jwt.py that:
  - Uses PyJWT to implement create_token(user_id, minutes_valid) and verify_token(token).
  - Reads the secret from an environment variable JWT_SECRET.
  - Validates iss="myapp" and aud="myapp_users".
  - Includes robust exception handling (ExpiredSignatureError, InvalidTokenError).

Part B: Build a tiny Flask API with login and protected endpoint
- Implement a Flask app (app.py) with:
  - A /login endpoint that accepts JSON credentials (username, password) and issues an access token for a valid user.
  - A /protected endpoint protected by a decorator that validates the JWT.
  - Use the helper you built in Part A to encode/decode tokens.
  - Demonstrate token extraction from the Authorization header (Bearer token).

Part C: Add HttpOnly cookie storage (optional)
- Extend the login flow to set the JWT in an HttpOnly cookie and modify the protected route to read the token from the cookie if the Authorization header is missing.
- Ensure the cookie uses Secure (in production) and SameSite=Lax to mitigate CSRF risks.

Part D: Run and test
- Run the Flask app.
- Use curl or a simple client to:
  - POST /login with valid credentials and capture the token.
  - Access /protected with Authorization: Bearer <token>.
  - Try an expired or tampered token and observe the response.

Notes:
- Use virtual environments and install PyJWT and Flask: pip install PyJWT Flask
- This exercise reinforces token creation, verification, and a basic stateless authentication flow suitable for Python backends.