# HTTPS, TLS & CORS Configuration in Node.js

In modern backend systems, secure transport and disciplined access policies are not optional—they are foundational. HTTPS, TLS configuration, and CORS orchestration protect data in transit, enforce trust boundaries, and guard against common web vulnerabilities. This lesson builds practical, production-oriented patterns for Node.js backends to run over HTTPS, configure strong TLS settings, apply HTTP strict transport security, and validate cross-origin requests in a controlled way.

## 1. Setting Up a Secure HTTPS Server in Node.js

This section demonstrates how to spin up a simple HTTPS server using Node.js and Express, loading TLS credentials from disk. In development you can generate self-signed certificates; in production you would use certificates from a trusted CA (e.g., Let's Encrypt, a commercial CA, or your enterprise PKI).

```js
// dependencies
const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');

const app = express();
const PORT = process.env.PORT || 8443;

// Basic route
app.get('/', (req, res) => res.send('Secure Hello!'));

// TLS credentials
const tlsOptions = {
  key: fs.readFileSync(path.resolve(__dirname, 'certs', 'server.key')),
  cert: fs.readFileSync(path.resolve(__dirname, 'certs', 'server.crt'))
  // Consider adding passphrase if your key is encrypted
};

https.createServer(tlsOptions, app)
  .listen(PORT, () => {
    console.log(`HTTPS server listening on port ${PORT}`);
  });
```

### Line-by-line explanation
- // dependencies: Import core modules (fs, path) and TLS/HTTP helpers (https) plus Express for routing.
- const app = express(): Create an Express app to handle routes.
- app.get('/', ...): Define a simple route responding with a message at the root path.
- tlsOptions: Load the private key and certificate from the certs directory; these form the TLS identity the server presents to clients.
- https.createServer(tlsOptions, app): Create an HTTPS server that uses the provided TLS credentials and delegates requests to the Express app.
- .listen(PORT, ...): Start listening on the specified port (default 8443). Log a message when ready.

## 2. TLS Options and Cipher Suites: Fine-grained Control

TLS configuration determines which protocol versions and ciphers your server accepts. This reduces exposure to known vulnerabilities and ensures forward secrecy where possible. The following example shows stronger defaults: TLS 1.2–1.3, a curated set of ciphers, and explicit curve selection.

```js
// tls configuration with strong defaults
const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');

const app = express();

const tlsOptions = {
  key: fs.readFileSync(path.resolve(__dirname, 'certs', 'server.key')),
  cert: fs.readFileSync(path.resolve(__dirname, 'certs', 'server.crt')),

  // Enforce modern TLS versions
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',

  // Prefer server's cipher order
  honorCipherOrder: true,

  // Strong, curated cipher list (avoid weak or export-grade ciphers)
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384'
  ].join(':'),

  // Ensure the ECDH curve is robust
  ecdhCurve: 'prime256v1'
};

https.createServer(tlsOptions, app)
  .listen(8443, () => console.log('TLS-enabled server listening on 8443'));
```

### Line-by-line explanation
- minVersion / maxVersion: Restrict TLS protocols to modern versions, protecting against older, vulnerable handshakes.
- honorCipherOrder: Instructs the server to select the cipher based on its own preference rather than the client’s, enabling better security choices.
- ciphers: Explicitly specify a compact, modern cipher suite string to avoid weak ciphers. The list is joined into a single colon-delimited string as required by the TLS options.
- ecdhCurve: Selects a cryptographically strong elliptic-curve (P-256) to use for ECDHE ephemeral keys.
- The rest loads keys and initializes the HTTPS server as in the previous example.

Note: In production, you’ll typically rely on a reverse proxy or load balancer (e.g., Nginx, Traefik) to terminate TLS and forward to your Node.js service. When TLS termination is at the edge, ensure end-to-end security considerations are still met for sensitive data and that your internal services validate tokens, not transport-level security alone.

## 3. HSTS, TLS Termination, and Secure Cookies

Key security enhancements after establishing TLS include HSTS (HTTP Strict Transport Security) and safe cookie handling. This section shows how to enable HSTS, redirect HTTP to HTTPS (for development or edge cases), and set secure cookies.

```js
// Dependencies for security headers
const helmet = require('helmet');
const express = require('express');
const app = express();

// Enable various security headers, including explicit HSTS configuration
app.use(helmet());

// Explicit HSTS configuration (recommended for production)
app.use(helmet.hsts({
  maxAge: 31536000, // 1 year in seconds
  includeSubDomains: true,
  preload: true
}));

// Route example
app.get('/', (req, res) => res.send('TLS with HSTS enabled'));

// Example of setting a secure, HttpOnly cookie
app.use((req, res, next) => {
  res.cookie('session', 'dummy-token', {
    httpOnly: true,
    secure: true,      // requires HTTPS
    sameSite: 'strict' // restricts cross-site usage
  });
  next();
});
```

```js
// HTTP to HTTPS redirect (for development or non-proxy setups)
const http = require('http');
http.createServer((req, res) => {
  const host = req.headers.host || 'localhost';
  const url = req.url || '/';
  res.writeHead(301, { Location: `https://${host}${url}` });
  res.end();
}).listen(8080, () => console.log('Redirecting HTTP -> HTTPS on :8080'));
```

### Line-by-line explanation
- const helmet = require('helmet'): Import helmet, a popular security middleware for Express.
- app.use(helmet()): Enable a standard suite of security headers (X-Content-Type-Options, X-Frame-Options, etc.).
- app.use(helmet.hsts({...})): Explicitly configure HSTS with a long maxAge, subdomain coverage, and preload readiness. HSTS tells browsers to always use HTTPS for your domain.
- res.cookie('session', ...): Demonstrates setting a secure, HttpOnly, same-site cookie to mitigate theft via client-side scripts and cross-site request forgery risks.
- HTTP redirect snippet: Creates a minimal HTTP server that redirects all traffic to the corresponding HTTPS URL, useful for dev environments or legacy deployments without a load balancer.

Note: In modern deployments, TLS termination often occurs at a reverse proxy or edge gateway. In that case, you still want to set HSTS and secure cookies from the backend, and ensure the proxy forwards the appropriate X-Forwarded-Proto header for your app to detect HTTPS.

## 4. CORS Configuration for Microservices

Cross-Origin Resource Sharing (CORS) controls how resources are shared across origins in browsers. It’s not a security boundary by itself, but misconfigurations can leak data or open your APIs to unauthorized use. This section demonstrates a tight, origin-based CORS policy using the cors middleware in Express.

```js
const cors = require('cors');
const allowedOrigins = [
  'https://app.example.com',
  'https://admin.example.com'
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // allow non-browser clients (curl, Postman)
    if (allowedOrigins.indexOf(origin) !== -1) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  optionsSuccessStatus: 204
}));
```

### Line-by-line explanation
- const cors = require('cors'): Import the CORS middleware for Express.
- allowedOrigins: A white-list of origins permitted to access the API. Keep this list minimal and explicit.
- origin function: Dynamically decide whether to allow a given origin. If origin is missing (non-browser client), you can choose to allow it or handle it separately.
- credentials: true: Permit cookies, authorization headers, or TLS client certificates to be sent in cross-origin requests. This requires that the origin is explicitly allowed (not '*').
- methods: List of HTTP methods allowed via CORS for preflighted requests.
- optionsSuccessStatus: 204 to indicate successful preflight handling.

Important note: Do not use origin: '*' together with credentials: true. The browser will reject such configurations. Use a strictly defined origin list or a dynamic origin callback as shown.

## X. Common Beginner Mistakes

- Bad: Allowing all origins with credentials
  - Bad code:
    ```js
    // Not allowed in practice; browsers reject this configuration
    app.use(cors({ origin: '*', credentials: true }));
    ```
  - Good code:
    ```js
    const allowedOrigins = ['https://app.example.com'];
    app.use(cors({ origin: allowedOrigins, credentials: true }));
    ```
- Bad: Weak TLS defaults (omitting minVersion)
  - Bad code:
    ```js
    const tlsOptions = {
      key: fs.readFileSync('server.key'),
      cert: fs.readFileSync('server.crt')
    };
    ```
  - Good code:
    ```js
    const tlsOptions = {
      key: fs.readFileSync('server.key'),
      cert: fs.readFileSync('server.crt'),
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      ciphers: 'ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-GCM-SHA256',
      honorCipherOrder: true
    };
    ```
- Bad: Not redirecting HTTP to HTTPS in environments where TLS is terminated at the app
  - Bad code:
    ```js
    http.createServer(app).listen(80);
    ```
  - Good code:
    ```js
    // HTTP -> HTTPS redirection as shown in Section 3
    ```
- Bad: Missing HSTS entirely
  - Bad code:
    ```js
    // No helmet or HSTS
    app.use((req, res, next) => { res.send('OK'); next(); });
    ```
  - Good code:
    ```js
    app.use(helmet());
    app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
    ```
- Bad: Setting cookies without Secure flag in production
  - Bad code:
    ```js
    res.cookie('session', token, { httpOnly: true, sameSite: 'strict' });
    // missing secure: true
    ```
  - Good code:
    ```js
    res.cookie('session', token, { httpOnly: true, secure: true, sameSite: 'strict' });
    ```

## Y. Why This Matters In Real Systems

- Security posture: Proper HTTPS and TLS settings reduce exposure to protocol downgrades, mitigations against eavesdropping, and protection against man-in-the-middle attacks.
- Compliance and audits: Many regulations (PCI-DSS, GDPR, HIPAA, etc.) require strong transport security and auditable TLS configurations.
- Certificate management: Automating certificate issuance, renewal, and revocation (e.g., using Let’s Encrypt with cert-manager or a CA-backed service) is essential to avoid expired certs.
- End-to-end security: TLS termination at the edge requires careful handling of internal service authentication, token validation, and careful logging to avoid leaking sensitive data in headers or cookies.
- Performance and reliability: Modern TLS versions provide performance and security benefits (e.g., TLS 1.3 reduces handshake latency). However, you must test ciphers and configurations across clients to avoid compatibility problems.
- Observability and tooling: Use TLS-enabled testing (sslscan, testssl.sh), vulnerability scanners, and monitoring for TLS certificate expiry, cipher suites, and protocol support.

## Z. Study Questions

1. What is the purpose of setting minVersion and maxVersion in Node.js TLS options?
2. Why should you avoid using '*' as the CORS origin when credentials are true?
3. How does HSTS improve security, and what is a common pitfall when enabling it?
4. What is the difference between TLS termination at a load balancer vs at the Node.js process, and what extra steps might you need to take?
5. Which flag or setting reliably enforces use of modern, strong ciphers in your TLS configuration?

## Exercise

Goal: Build a small production-ish Express app that serves over HTTPS with strict TLS, proper CORS, and security headers. Provide a complete, runnable project structure and instructions.

Part A — Project scaffolding
- Create a new directory for the lesson (e.g., https-tls-cors-demo).
- Initialize a Node.js project: npm init -y
- Install dependencies: npm install express helmet cors
- Create a certs/ directory with server.key and server.crt (generate self-signed certs for development; see OpenSSL commands below).

Part B — Generate self-signed certificates (for local dev)
- On macOS/Linux:
  openssl req -nodes -new -x509 -keyout certs/server.key -out certs/server.crt -days 365 -subj "/CN=localhost"
- Ensure both files exist in certs/.

Part C — Implement the HTTPS server with TLS options, HSTS, and secure cookies
- Create index.js with the following combined setup (HTTPS server, TLS options, and basic route):

```js
const fs = require('fs');
const path = require('path');
const express = require('express');
const https = require('https');
const http = require('http');
const helmet = require('helmet');
const cors = require('cors');

const app = express();
const PORT_HTTPS = process.env.PORT_HTTPS || 8443;
const PORT_HTTP = process.env.PORT_HTTP || 8080;

// Middleware: security headers
app.use(helmet());
// Explicit HSTS
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));

// CORS: allow only specific origins and credentials
const allowedOrigins = ['https://app.example.com', 'https://admin.example.com'];
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  optionsSuccessStatus: 204
}));

// Simple API endpoint
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, ts: Date.now() });
});

// Set a secure, HttpOnly cookie on first request
app.use((req, res, next) => {
  res.cookie?.('session', 'demo-token', { httpOnly: true, secure: true, sameSite: 'strict' });
  next();
});

// TLS credentials
const tlsOptions = {
  key: fs.readFileSync(path.resolve(__dirname, 'certs', 'server.key')),
  cert: fs.readFileSync(path.resolve(__dirname, 'certs', 'server.crt')),
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  ciphers: [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384'
  ].join(':'),
  honorCipherOrder: true,
  ecdhCurve: 'prime256v1'
};

// HTTPS server
https.createServer(tlsOptions, app)
  .listen(PORT_HTTPS, () => {
    console.log(`HTTPS server listening on port ${PORT_HTTPS}`);
  });

// HTTP -> HTTPS redirect (for development)
http.createServer((req, res) => {
  const host = req.headers.host || 'localhost';
  res.writeHead(301, { Location: `https://${host}${req.url}` });
  res.end();
}).listen(PORT_HTTP, () => {
  console.log(`HTTP -> HTTPS redirect on port ${PORT_HTTP}`);
});
```

Part D — Run and test
- Start the server: node index.js
- Open https://localhost:8443/api/ping in a browser (you may need to accept the self-signed certificate).
- Ensure HTTP requests to http://localhost:8080 are redirected to HTTPS.

Part E — Questions to reflect
- How would you rotate certificates automatically in a real environment?
- How can you adapt CORS to a multi-origin microservices architecture with dynamic origins?
- How would you implement end-to-end TLS where an API gateway terminates TLS but internal services communicate over TLS as well?

This structured lesson provides concrete code examples and explanations for HTTPS, TLS, and CORS in a Node.js context, with attention to practical deployment concerns, security best practices, and common pitfalls.