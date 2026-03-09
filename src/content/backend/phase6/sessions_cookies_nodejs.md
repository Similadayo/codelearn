# Sessions & Cookies — Stateful Auth in Node.js

Stateful authentication uses server-maintained session data tied to a client via cookies. The server stores the user’s identity and session state, while the client receives a session cookie that proves the user’s identity on subsequent requests. This approach gives you fine-grained control over session lifetimes, revocation, and per-user context, making it ideal for trusted internal services, admin dashboards, and apps with complex user roles. However, it introduces operational considerations (scaling, session stores, cookie security) that you must handle carefully in production systems.

## 1. Core Concepts: Sessions, Cookies, and Stateful Auth

- Sessions: Server-side storage of user state (e.g., user ID, roles, last login). Each session has an ID (session identifier) that is sent to the client as a cookie.
- Cookies: Small data pieces stored by the client and sent with every request. In stateful auth, cookies carry the session ID (e.g., connect.sid) so the server can locate the session data.
- Statefulness: Unlike stateless JWT-based auth, stateful sessions keep user state on the server. This allows easy revocation and server-side control but requires a session store and careful scaling strategies.

Example concept snippet (illustrative, not production-ready by itself):
```js
// Minimal concept: on login, server associates a session with a user
app.post('/login', (req, res) => {
  // assume credentials validated
  req.session.user = { username: 'alice' }; // create/attach session data
  res.json({ ok: true });
});
```

### Line-by-line explanation
- Line 1: Define a login route for HTTP POST requests to /login.
- Line 2: Comment explaining that credentials have been validated (omitted for brevity).
- Line 3: Attach a user object to the server-side session, creating the session if it doesn’t exist.
- Line 4: Respond with a success payload to the client.

## 2. Setting Up Express with express-session

This section shows a practical Express server setup using the express-session middleware. It demonstrates how to configure session cookies, a secret, and basic routes for login, protected access, and logout.

```js
// app.js
const express = require('express');
const session = require('express-session');
const app = express();

app.use(express.json());

// Session middleware
app.use(session({
  name: 'sid',                 // cookie name
  secret: 'your-secret-key',   // should be a strong secret (store in env)
  resave: false,                 // do not resave session if unmodified
  saveUninitialized: false,      // do not create session until something stored
  cookie: {
    httpOnly: true,              // not accessible via JS in the browser
    secure: false,               // set true if using HTTPS in production
    maxAge: 1000 * 60 * 60 * 24  // 1 day
  }
}));

// Simple login endpoint (credentials check omitted)
app.post('/login', (req, res) => {
  const { username } = req.body;
  // In real apps, verify credentials here
  if (username) {
    req.session.user = { username };
    return res.json({ ok: true });
  }
  res.status(400).json({ error: 'Missing username' });
});

// Protected route
app.get('/protected', (req, res) => {
  if (req.session.user) {
    return res.json({ message: `Hello, ${req.session.user.username}` });
  }
  res.status(401).json({ error: 'Not authenticated' });
});

// Logout: destroy session and clear cookie
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Could not log out' });
    res.clearCookie('sid');
    res.json({ ok: true });
  });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### Line-by-line explanation
- Line 1-2: Import necessary modules: Express for the web framework and express-session for session management.
- Line 3: Create an Express application instance.
- Line 5: Enable JSON body parsing for incoming requests.
- Lines 8-21: Configure the session middleware:
  - Line 9: Set the cookie name to sid.
  - Line 10: Use a strong secret to sign the session ID cookie (store this securely, e.g., in an environment variable).
  - Line 11: Do not resave unchanged sessions to the store.
  - Line 12: Do not create a session until something is stored.
  - Lines 13-20: Configure the session cookie:
    - Line 14: httpOnly cookies prevent client-side JS from reading the cookie (mitigates XSS).
    - Line 15: secure set to false for local development; switch to true in production with HTTPS.
    - Line 16: maxAge defines how long the cookie lasts (here, 1 day).
- Lines 24-31: POST /login route:
  - Line 25: Extract username from request body.
  - Line 27-29: In a real app, validate credentials; here we proceed if username exists.
  - Line 28: Attach user data to the server-side session.
  - Line 29: Respond with success.
- Lines 34-40: GET /protected route:
  - Line 35: Check if a user is stored on the session.
  - Line 36: If so, respond with a user-specific message.
  - Line 38-39: If not authenticated, return 401.
- Lines 43-53: POST /logout route:
  - Line 44: Destroy the session on logout.
  - Line 45-48: Handle possible error; clear the session cookie on success.
  - Line 49-50: Respond with success.
- Line 52: Start the HTTP server on port 3000.

## 3. Implementing Login, Logout, and Access-Controlled Routes

This section dives into the practical flow: how login creates a session, how protected endpoints check for it, and how logout revokes access.

```js
// Extended snippet (login, protect, and logout flow)
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Replace with real authentication (e.g., DB check, bcrypt)
  if (username === 'alice' && password === 'password123') {
    req.session.user = { username };
    return res.json({ ok: true });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

app.get('/dash', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  // User-specific data
  res.json({ welcome: `Welcome back, ${req.session.user.username}!` });
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('sid');
    res.json({ ok: true });
  });
});
```

### Line-by-line explanation
- Line 1-3: Define a login route that accepts username/password and validates them (replace with real auth in production).
- Line 4-8: If credentials match, attach user info to the session; otherwise respond with 401.
- Line 10-14: Define a protected route /dash that requires req.session.user to exist; otherwise deny access.
- Line 16-23: Implement logout by destroying the session and clearing the cookie, then respond with success.

## 4. Session Stores and Security Best Practices

In production, avoid in-memory session stores (default MemoryStore) because they don’t scale and aren’t durable. Use a dedicated store (e.g., Redis, Mongo) to share sessions across multiple app instances.

```js
// Example: Redis-backed session store
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');
const redisClient = redis.createClient({ url: 'redis://localhost:6379' });

app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'change-me',
  resave: false,
  saveUninitialized: false,
  store: new RedisStore({ client: redisClient, ttl: 60 * 60 * 24 }), // 1 day TTL
  cookie: {
    httpOnly: true,
    secure: true, // requires HTTPS in production
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));
```

### Line-by-line explanation
- Line 1-2: Import Redis session store adapter for Express sessions.
- Line 3-4: Create a Redis client; in practice, configure with env vars and TLS as needed.
- Lines 6-16: Reconfigure the session middleware:
  - Line 7: Use a persistent store (RedisStore) instead of MemoryStore.
  - Line 8-9: Bind the Redis client and set session TTL to 1 day.
  - Lines 11-15: Cookie configuration for production:
    - secure: true requires HTTPS
    - sameSite: 'lax' helps mitigate CSRF while maintaining usability
    - maxAge: 1 day
- The rest mirrors the basic setup (name, secret, resave, saveUninitialized).

## 5. Cookies: Flags, Security, and Behavior

Cookies control how the browser stores and sends session identifiers. Getting cookie options right is crucial for security and user experience.

```js
app.use(session({
  name: 'sid',
  secret: 'another-strong-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true,       // require HTTPS in production
    sameSite: 'lax',    // helps protect against CSRF
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));
```

### Line-by-line explanation
- Line 1-2: Session middleware setup with explicit cookie options.
- Line 3-4: resave and saveUninitialized tuned for typical apps.
- Line 5-12: Cookie settings:
  - httpOnly: true prevents JS access to the cookie.
  - secure: true ensures the cookie is sent only over HTTPS (enable in prod).
  - sameSite: 'lax' provides CSRF protection while preserving usability for top-level navigations.
  - maxAge: 1 day duration for the session cookie.

## X. Common Beginner Mistakes

- Bad vs Good: Secure cookie handling
  - Bad:
    ```js
    app.use(session({ secret: 's', cookie: { secure: false } }));
    ```
    - Why bad: On production, cookies may be transmitted over insecure channels if HTTPS is not enforced, making them vulnerable.
  - Good:
    ```js
    app.use(session({ secret: process.env.SESSION_SECRET, cookie: { secure: true, sameSite: 'lax' } }));
    ```
    - Why good: Encourages HTTPS-only cookies and CSRF mitigation.

- Bad vs Good: Session store choice
  - Bad:
    ```js
    // MemoryStore (default) is not suitable for multi-instance apps
    app.use(session({ secret: 's', resave: false, saveUninitialized: false }));
    ```
  - Good:
    ```js
    const RedisStore = require('connect-redis')(session);
    app.use(session({ secret: 's', store: new RedisStore({ client: redisClient }), resave: false, saveUninitialized: false }));
    ```
    - Why good: Enables horizontal scaling by sharing sessions across instances.

- Bad vs Good: Cookie policy and lifecycle
  - Bad:
    ```js
    cookie: { maxAge: 3600000 } // 1 hour, but no httpOnly or sameSite
    ```
  - Good:
    ```js
    cookie: { httpOnly: true, sameSite: 'lax', secure: true, maxAge: 24 * 60 * 60 * 1000 }
    ```
    - Why good: Reduces vulnerability surface and aligns with common security standards.

- Bad vs Good: Not guarding protected routes
  - Bad:
    ```js
    app.get('/dashboard', (req, res) => {
      res.send('dashboard'); // no auth check
    });
    ```
  - Good:
    ```js
    app.get('/dashboard', (req, res) => {
      if (!req.session.user) return res.status(401).send('Not authenticated');
      res.send('dashboard');
    });
    ```
    - Why good: Prevents unauthorized access by validating session presence.

- Bad vs Good: Exposing session IDs in responses
  - Bad:
    ```js
    res.json({ sessionId: req.sessionID });
    ```
  - Good:
    ```js
    // Do not expose internal session IDs; rely on cookies for session continuity
    res.json({ ok: true });
    ```
    - Why good: Reduces risk of session fixation or leakage.

## Y. Why This Matters In Real Systems

- Stability and scalability: Stateful sessions require a shared store when you scale horizontally. In-memory stores break when you run multiple app instances or restart aggressively.
- Security posture: Proper cookie flags (HttpOnly, Secure, SameSite) and proper session invalidation are foundational to protecting against XSS, CSRF, and session hijacking.
- Operational concerns: Managing session lifetimes, revocation, and potentially rotating session secrets without breaking users requires careful planning and versioning.
- Compliance and UX: Consider user privacy (data stored in sessions), logout behavior, and cookie consent in line with regulations.

## Z. Study Questions

1. What is the difference between server-side sessions and stateless JWT authentication?
2. Why is it important to set the HttpOnly and Secure flags on session cookies?
3. How does a session store like Redis help in a horizontally scaled Node.js app?
4. What are the implications of saveUninitialized and resave options in express-session?
5. How does SameSite help mitigate CSRF in cookie-based sessions?

## Exercise

Build and deploy a small Express app that uses session-based authentication with a Redis-backed store. Complete the following tasks:

1) Project setup
- Create a Node.js project with Express and express-session.
- Add a Redis client and connect-redis to store sessions.

2) Basic authentication flow
- Implement:
  - POST /login with credential validation (hard-coded for the exercise) that creates a server-side session.
  - GET /me that returns the logged-in user from the session (requires authentication).
  - POST /logout that destroys the session and clears the cookie.

3) Production-ready session configuration
- Configure:
  - A strong secret loaded from an environment variable.
  - Redis-backed store with a TTL.
  - Cookie options: httpOnly, secure (enable in prod), sameSite, and a reasonable maxAge.
  - resave: false and saveUninitialized: false.

4) Securing routes
- Add a middleware function requireAuth(req, res, next) that blocks unauthorized access to protected routes.
- Apply requireAuth to a new protected route, e.g., GET /secure.

5) Testing plan
- Provide curl-based tests to verify login, access to protected routes, and logout.
- Demonstrate session persistence across multiple requests.

6) Bonus: discuss deployment considerations
- Explain how you would configure environment variables, TLS termination (e.g., via a reverse proxy), and how you would monitor session activity and TTL expiration in production.

Deliverables:
- A single Express app (app.js) with the described functionality.
- A README snippet detailing how to run locally (including Redis setup), how to run tests, and security notes.

Note: For production, replace hard-coded credentials with a real user store and password hashing (bcrypt) and ensure TLS is enforced so cookie Secure flag is effective.