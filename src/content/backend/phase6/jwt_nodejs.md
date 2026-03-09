# JWT — Stateless Authentication in Node.js

Stateless authentication using JSON Web Tokens (JWT) lets you verify a user’s identity without persisting session state on the server. The server signs a token containing user claims, and clients present that token with each request. This approach scales beautifully for distributed systems, microservices, and API-first backends, because you don’t need a centralized session store. However, it also introduces security concerns around token leakage, revocation, and key management. This lesson walks you through core concepts, practical Node.js examples, and best practices to build robust, production-ready JWT-based authentication.

## 1. What JWT is and why stateless authentication matters

- JWT is a compact, URL-safe token with three parts: header, payload, and signature. The server can verify authenticity without storing session data.
- Stateless authentication enables horizontal scaling, easier cross-service authentication, and simplified deployment of microservices.
- Key considerations: token expiry, signing algorithm, claims (issuer, audience, subject), and how to revoke tokens or rotate them.

Example JWT structure (conceptual):
- Header: { "alg": "HS256", "typ": "JWT" }
- Payload: { "sub": "user123", "name": "Alice", "iat": 1620000000, "exp": 1620003600, "iss": "myapp", "aud": "myapp/api" }
- Signature: HMACSHA256(base64Url(header) + "." + base64Url(payload), secret)

> Note: Do not put highly sensitive data in the JWT payload, since it is base64-encoded (not encrypted) and can be read by anyone who has the token.

## 2. Core JWT Structure and Signing (HS256)

Code example: signing a JWT with a shared secret (HS256) and including issuer, audience, and expiry.

```js
// 1. Core signing example (HS256)
const jwt = require('jsonwebtoken');

// In real apps, load from environment variables securely
const SECRET = process.env.JWT_SECRET || 'supersecret-key';

const payload = {
  sub: 'user123',       // subject - the user ID
  name: 'Alice',
  role: 'admin'
};

const token = jwt.sign(payload, SECRET, {
  expiresIn: '15m',        // short-lived access token
  issuer: 'myapp',          // iss claim
  audience: 'myapp/api'       // aud claim
});

console.log('Access Token:', token);
```

### Line-by-line explanation

- const jwt = require('jsonwebtoken');  
  Imports the jsonwebtoken library used for signing tokens.

- const SECRET = process.env.JWT_SECRET || 'supersecret-key';  
  Retrieves the signing secret from the environment or falls back to a default for local development.

- const payload = { sub: 'user123', name: 'Alice', role: 'admin' };  
  Builds the token payload with identity and authorization claims.

- const token = jwt.sign(payload, SECRET, { expiresIn: '15m', issuer: 'myapp', audience: 'myapp/api' });  
  Creates a signed JWT using HS256 by default, including expiry, issuer, and audience.

- console.log('Access Token:', token);  
  Outputs the generated token for demonstration.

## 3. Verifying JWTs and Protecting Routes

Code example: Express middleware to verify a token and protect routes.

```js
// 2. Verifying and protecting routes (HS256)
const express = require('express');
const jwt = require('jsonwebtoken');
const app = express();

const SECRET = process.env.JWT_SECRET || 'supersecret-key';
const ISSUER = 'myapp';
const AUDIENCE = 'myapp/api';

// Simple auth middleware
function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  jwt.verify(token, SECRET, { issuer: ISSUER, audience: AUDIENCE }, (err, payload) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = payload; // attach decoded claims
    next();
  });
}

// Protected route
app.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: 'This is protected data', user: req.user });
});

// Basic server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));
```

### Line-by-line explanation

- const express = require('express'); const app = express();  
  Sets up an Express app instance for routing.

- const SECRET = process.env.JWT_SECRET || 'supersecret-key'; const ISSUER = 'myapp'; const AUDIENCE = 'myapp/api';  
  Configuration for token verification (same values used during signing).

- function authMiddleware(req, res, next) { ... }  
  Defines a middleware to enforce authentication on routes.

- const header = req.headers['authorization'] || ''; const token = header.startsWith('Bearer ') ? header.slice(7) : null;  
  Extracts the token from the Authorization header in the form "Bearer <token>".

- if (!token) { ... }  
  Returns 401 when no token is provided.

- jwt.verify(token, SECRET, { issuer: ISSUER, audience: AUDIENCE }, (err, payload) => { ... });  
  Verifies the token signature and claims. If valid, payload contains the token claims.

- req.user = payload; next();  
  Attaches the decoded claims to the request for downstream handlers and proceeds.

- app.get('/protected', authMiddleware, (req, res) => { res.json({ message: 'This is protected data', user: req.user }); });  
  Demonstrates protecting a route with the middleware.

## 4. Stateless Refresh Tokens and Rotation

JWTs are often short-lived (e.g., 15 minutes) for security. A refresh token flow lets clients obtain a new access token without re-authenticating. This example uses a separate refresh secret and an in-memory store for demo purposes (replace with a persistent store in production).

```js
// 3. Refresh token flow (HS256)
const express = require('express');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const app = express();

app.use(express.json());
app.use(cookieParser());

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'access-secret';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'refresh-secret';
const ISSUER = 'myapp';
const AUDIENCE = 'myapp/api';

// Demo in-memory store for refresh tokens (do not use in production)
const refreshTokensStore = new Set();

// Mock authentication (replace with real auth)
function authenticate(reqBody) {
  // In real scenarios, verify username/password here
  return { id: 'user123', username: 'alice' };
}

app.post('/login', (req, res) => {
  const user = authenticate(req.body);

  const accessToken = jwt.sign({ sub: user.id, name: user.username }, ACCESS_TOKEN_SECRET, {
    expiresIn: '15m',
    issuer: ISSUER,
    audience: AUDIENCE
  });

  const refreshToken = jwt.sign({ sub: user.id }, REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
    issuer: ISSUER
  });

  refreshTokensStore.add(refreshToken);

  // Send access token to client; refresh token via HttpOnly cookie
  res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: true });
  res.json({ accessToken });
});

app.post('/token', (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken || !refreshTokensStore.has(refreshToken)) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, { issuer: ISSUER });
    // Issue new access token
    const newAccessToken = jwt.sign({ sub: payload.sub }, ACCESS_TOKEN_SECRET, {
      expiresIn: '15m',
      issuer: ISSUER,
      audience: AUDIENCE
    });
    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(403).json({ error: 'Refresh token invalid/expired' });
  }
});
```

### Line-by-line explanation

- const express = require('express'); const app = express(); const cookieParser = require('cookie-parser');
  Imports for routing and cookie handling.

- app.use(express.json()); app.use(cookieParser());  
  Middleware to parse JSON bodies and cookies.

- const ACCESS_TOKEN_SECRET = ..., const REFRESH_TOKEN_SECRET = ...;  
  Secrets used for signing access and refresh tokens.

- const refreshTokensStore = new Set();  
  In-memory store to track valid refresh tokens (replace with DB in production for revocation control).

- function authenticate(reqBody) { ... }  
  Placeholder for your actual authentication logic.

- app.post('/login', ...)  
  Authenticates the user, issues an access token and a refresh token, stores the refresh token, and sends the access token to the client. The refresh token is sent as an HttpOnly cookie.

- app.post('/token', ...)  
  Validates the refresh token, rotates to a new access token, and returns it to the client.

- Note: In production, you should implement refresh token rotation, revocation (e.g., store a token's state in a DB), and consider pairing refresh tokens with a client identifier.

## 5. Security pitfalls and best practices

- Never store sensitive data (passwords, secrets) in the JWT payload. Rely on opaque identifiers and fetch sensitive data server-side if needed.
- Use short-lived access tokens (e.g., 15 minutes) and a dedicated refresh mechanism for obtaining new tokens.
- Validate claims strictly: issuer (iss), audience (aud), subject (sub), and expiry (exp). Consider clock skew and set leeway if needed.
- Prefer HttpOnly, Secure cookies for refresh tokens or when possible, to reduce XSS exposure.
- Choose signing algorithm wisely:
  - HS256: simple, shared secret. Keep secrets safe and rotate regularly.
  - RS256: uses asymmetric keys (private/public). Better for distributed systems; allows public key rotation without exposing private keys.
- Token revocation challenge: JWTs are hard to revoke mid-flight. Combine short lifetimes with a revocation check for critical actions or implement a short-lived access token with a secure refresh workflow.
- Protect against CSRF if you rely on cookies for authentication. If you send JWTs via Authorization headers (Bearer tokens) from JavaScript, CSRF is less of a concern, but XSS remains a risk.
- Clock skew: allow a small leeway in expiry checks to tolerate minor time drift between systems.

## 6. Why this matters in real systems — production context

- Scale and performance: Stateless tokens remove the need for a centralized session store, enabling horizontal scaling and easier load balancing.
- Service boundaries: JWTs enable boundary-crossing authentication across microservices without a shared session store.
- Security posture: Properly implemented JWTs support auditing, authorization per-route, and fine-grained access control with claims.
- Key management: In production, manage keys securely (KMS, Vault, or environment-protected files). Plan for rotation and revocation strategies.
- Observability: Audit token issuance/rotation events and monitor for token misuse (e.g., unusual token lifetimes, revocation events, or spikes in 401/403 responses).

## Z. Study Questions — 5 recall questions

1. What are the three parts of a JWT and what does each part represent?
2. Why is it generally unsafe to store sensitive user data in a JWT payload?
3. What is the purpose of the issuer (iss) and audience (aud) claims, and how would you validate them in a Node.js middleware?
4. How does a refresh token improve user experience without compromising security, and what is one common risk you must mitigate?
5. Compare HS256 and RS256. What are the trade-offs, and when might you prefer RS256 in a multi-service environment?

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall 1: Storing tokens in localStorage (XSS risk)

Bad:
```js
// Storing token in localStorage (vulnerable to XSS)
localStorage.setItem('token', tokenFromServer);
const token = localStorage.getItem('token');
fetch('/protected', {
  headers: { 'Authorization': 'Bearer ' + token }
});
```

Good:
```js
// Use HttpOnly cookies for refresh tokens. For access tokens, send via Authorization header.
// Example: pass token from server in a response body (short-lived) and store in memory only
// and/or use an HttpOnly cookie if the token is strictly required on the client.
```

Note: If you must store tokens on the client, prefer in-memory storage for single-page apps, and minimize exposure to XSS.

### Pitfall 2: Not validating issuer/audience (iss, aud)

Bad:
```js
jwt.verify(token, SECRET, (err, payload) => {
  if (err) return res.status(403).send();
  // Proceed without validating claims
});
```

Good:
```js
jwt.verify(token, SECRET, { issuer: 'myapp', audience: 'myapp/api' }, (err, payload) => {
  if (err) return res.status(403).send();
  // payload.iss and payload.aud validated automatically
});
```

### Pitfall 3: Ignoring token expiry or clock skew

Bad:
```js
jwt.verify(token, SECRET, (err, payload) => {
  if (err) return res.status(403).send();
  // No handling for expiry beyond standard error
});
```

Good:
```js
// Include allowed clock skew to tolerate small NTP differences
jwt.verify(token, SECRET, { clockTolerance: 5 }, (err, payload) => {
  if (err) return res.status(403).send();
  // Token is valid and not expired
});
```

### Pitfall 4: Not using a refresh-token strategy or token rotation

Bad:
```js
// Reuse a long-lived access token forever
const accessToken = jwt.sign({ sub: user.id }, SECRET, { expiresIn: '60d' });
res.json({ accessToken });
```

Good:
```js
// Short-lived access token with a separate refresh token
const accessToken = jwt.sign({ sub: user.id }, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
const refreshToken = jwt.sign({ sub: user.id }, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
// Rotate: issue a new refresh token on usage and revoke old tokens when possible
```

## Y. Exercise — practical multi-part coding challenge

Goal: Build a small Express-based authentication service using JWT (HS256) with login, protected routes, and a refresh token flow. You should demonstrate understanding of signing, verifying, and rotating tokens, plus basic security considerations.

Part A — Project setup
- Create a new Node.js project (npm init -y).
- Install dependencies: express, jsonwebtoken, cookie-parser, dotenv (optional for env vars).

Part B — Implement authentication endpoints
- Implement a /login endpoint that authenticates a user (use a mock user for this exercise) and issues:
  - A short-lived access token (expiresIn: 15m) with claims { sub, name, role }.
  - A long-lived refresh token (expiresIn: 7d) with claim { sub }.
  - Send the access token in the JSON response and the refresh token via an HttpOnly, Secure cookie.
- Implement a /token endpoint to exchange a valid refresh token for a new access token.

Part C — Protect a route
- Create a /protected route that requires a valid access token via Authorization: Bearer <token>.
- The route should respond with a message and the decoded user info from the token.

Part D — Optional RS256 variant (stretch)
- If you want an extra challenge, switch the signing to RS256 using an in-project private/public key pair (read from file), and update the middleware to verify against the public key.

Part E — Security notes
- Ensure your code validates issuer and audience.
- Ensure you manage token expiry correctly and consider clock skew.
- Document trade-offs you considered between HS256 and RS256.

Deliverables
- Provide a single, cohesive code sample or a compact repository layout showing:
  - login() implementation
  - token refresh flow
  - protected route with middleware
  - environment/configuration notes (secret keys, tokens lifetimes)
- Include brief explanations for design choices and security considerations.

If you’d like, I can tailor the Exercise to a specific framework version or provide a ready-to-run repo snippet with all files.