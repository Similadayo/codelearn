# Backend Engineering — Phase 6: Authentication & Security | Topic: Security — SQLi, XSS, CSRF & Rate Limiting (Node.js)

Security is a core professional competency for backend engineers. This lesson drills how to defend against SQL injection (SQLi), cross-site scripting (XSS), CSRF, and how to apply rate limiting to protect APIs under load. By combining parameterized queries, output escaping, token-based protections, and robust request throttling, you build systems that are harder to exploit and easier to maintain in production.

## 1. SQL Injection (SQLi) and Parameterized Queries

SQL injection occurs when user input is interpolated into SQL statements, allowing attackers to manipulate queries. The safe pattern is to use parameterized queries (prepared statements) so inputs are treated as data, not code.

```js
// Bad: vulnerable to SQL Injection via string interpolation
const mysql = require('mysql2/promise');
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'shop'
});

async function findUser(req, res) {
  const username = req.query.username;
  // Dangerous: user input is interpolated directly into SQL
  const [rows] = await pool.execute(
    `SELECT id, username, email FROM users WHERE username = '${username}'`
  );
  res.json(rows);
}
```

```js
// Good: use parameterized queries to prevent SQLi
async function findUserSafe(req, res) {
  const username = req.query.username;
  // Safe: input is bound as a parameter, not concatenated
  const [rows] = await pool.execute(
    'SELECT id, username, email FROM users WHERE username = ?',
    [username]
  );
  res.json(rows);
}
```

### Line-by-line explanation
- Line 1: Import the MySQL promise-based client, enabling async/await.
- Line 2: Create a pool with DB connection settings.
- Line 7: Read the username from the query string (user-controlled input).
- Line 9-11: Bad path. The username is embedded into the SQL string, allowing injection if username contains SQL syntax.
- Line 14: Safe path. The SQL uses a parameter placeholder ? and the actual value is passed in an array, ensuring the DB driver escapes it correctly.
- Line 15-16: Execute the query and return results as JSON (no sensitive data exposure intended here).

Common mistakes and mitigations
- Pitfall: Directly concatenating user input into SQL.
  - Bad: see the first block.
  - Good: parameterized query shown in the second block.
- Pitfall: Forgetting to validate input shape or length.
  - Mitigation: apply schema validation (e.g., Joi) before binding.
- Pitfall: Using dynamic table/column names with user input.
  - Mitigation: avoid dynamic SQL; whitelist allowed identifiers.

Why this matters in real systems
- SQLi is a pervasive attack vector. Parameterized queries stop attackers from changing logic, protecting user data and DB integrity. In production, combine with least-privilege DB users, input validation, and proper error handling to minimize exposure.

Study questions
- What is SQL injection and how do prepared statements mitigate it?
- Why is input validation still important even when using parameterized queries?
- How would you handle logging sensitive errors without leaking details?
- When might named parameters be preferable to positional placeholders?
- What are common signs that a vulnerability exists in your DB access code?

Exercise
- Build a small Express app with a GET /user endpoint that accepts a username and returns user data.
  - Implement a vulnerable version (for learning) and then a secure version using parameterized queries.
  - Add a unit test asserting that a typical benign input returns expected data and a malicious input does not alter the query logic.

## 2. Cross-Site Scripting (XSS)

XSS happens when an attacker-supplied input is rendered into HTML without proper escaping, enabling script execution in a victim's browser. The safe approach is to escape user data before embedding in HTML, or rely on templating engines that escape by default.

```js
// Bad: directly injecting user input into HTML response (unsafe)
const express = require('express');
const app = express();

app.get('/greet', (req, res) => {
  const name = req.query.name;
  res.send(`<h1>Welcome, ${name}!</h1>`);
});
```

```js
// Good: escape user input before embedding
const escapeHtml = require('escape-html');
const express = require('express');
const app2 = express();

app2.get('/greet', (req, res) => {
  const name = req.query.name;
  res.send(`<h1>Welcome, ${escapeHtml(name)}!</h1>`);
});
```

### Line-by-line explanation
- Bad block:
  - Line 1-2: Set up Express.
  - Line 4-8: Take user input and directly interpolate into HTML. If name contains HTML or script tags, they will execute in the browser.
- Good block:
  - Line 1-2: Set up Express.
  - Line 4-7: Read user input, escape it with a library, and inject escaped text into HTML, preventing script execution.
- Escape library behavior: escapeHtml replaces &, <, >, ", ', and / with safe HTML entities.

Common mistakes and mitigations
- Pitfall: Displaying user content without escaping in HTML responses.
  - Bad: see the first block.
  - Good: use an escaping library or template engine with auto-escaping.
- Pitfall: Safely rendering user content in JSON APIs is less risky, but avoid constructing HTML in API responses.
- Pitfall: Relying on client-side escaping only; never trust client rendering for security.

Why this matters in real systems
- XSS can steal sessions, hijack user accounts, or deface sites. Escaping user content at server response boundaries and using templates with auto-escape are proven defenses. Combine with Content Security Policy (CSP) for defense in depth.

Study questions
- What is the difference between reflected, stored, and DOM-based XSS?
- How does escaping prevent script execution in HTML?
- When should you consider using a template engine with auto-escaping?
- How can Content Security Policy complement escaping to reduce risk?
- Why should you avoid embedding JSON data directly into HTML without encoding?

Exercise
- Create a simple page that reads a query parameter and displays it inside HTML.
  - Implement both unsafe and safe variants.
  - Add a CSP header to the safe variant and verify it blocks inline scripts.

## 3. CSRF (Cross-Site Request Forgery)

CSRF tricks a user’s browser into submitting unintended requests to a trusted site. Defenses include anti-CSRF tokens, same-site cookies, and proper session handling.

```js
// CSRF protection using csurf in an Express app (cookie-based tokens)
const express = require('express');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');

const app = express();
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: false }));

// Enable CSRF protection via cookies
const csrfProtection = csrf({ cookie: true });

app.get('/form', csrfProtection, (req, res) => {
  // Form includes the CSRF token
  res.send(`
    <form action="/submit" method="POST">
      <input type="hidden" name="_csrf" value="${req.csrfToken()}"/>
      <input name="comment" />
      <button type="submit">Submit</button>
    </form>
  `);
});

app.post('/submit', csrfProtection, (req, res) => {
  // Process the submitted data securely
  res.send('Comment submitted');
});
```

### Line-by-line explanation
- Line 1-4: Import Express, csurf for CSRF tokens, cookie-parser for cookie-based storage, and body-parser to parse form data.
- Line 6-8: Create Express app and enable cookie parsing and form data parsing.
- Line 11: Create a CSRF protection middleware configured to store tokens in cookies.
- Line 13-21: GET /form renders a form that includes a hidden _csrf field with the current token.
- Line 23-26: POST /submit requires a valid CSRF token; upon submission, the server processes data and responds.

Common beginner mistakes and mitigations
- Pitfall: Sending forms without CSRF tokens or disabling CSRF protection on endpoints.
  - Bad: omitting _csrf token in forms.
  - Good: always attach a token and validate it server-side.
- Pitfall: Relying solely on same-site cookies without CSRF protection for state-changing operations.
  - Mitigation: combine same-site cookies with CSRF tokens when required.
- Pitfall: Storing tokens in localStorage or exposing them to client-side JavaScript.
  - Mitigation: use cookie-based CSRF tokens or implement double-submit cookies where appropriate.

Why this matters in real systems
- CSRF defenses are essential for state-changing endpoints (login, transfer, post creation). Proper CSRF protection prevents attackers from performing actions on behalf of legitimate users, reducing fraud risk and regulatory concerns.

Study questions
- How does CSRF differ from XSS in terms of threat model?
- Why are CSRF tokens required for forms that perform state-changing actions?
- What are the trade-offs between cookie-based CSRF tokens and double-submit cookies?
- How does SameSite cookie attribute help mitigate CSRF, and what are its limitations?
- In an API-only backend (no server-rendered HTML), how would you implement CSRF protections?

Exercise
- Extend a minimal Express app with a form submission route that changes user data.
  - Implement CSRF protection using tokens in cookies.
  - Verify attempts without a valid token are rejected.
  - Demonstrate a legitimate flow and simulate a CSRF attempt using a crafted request.

## 4. Rate Limiting

Rate limiting thwarts abuse by throttling requests per client IP or user. It helps protect against brute-force attacks, DDoS, and API overuse.

```js
// Basic per-IP rate limiting (in-memory store, suitable for dev)
const express = require('express');
const rateLimit = require('express-rate-limit');
const app = express();

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                 // limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.'
});

app.use(limiter);
```

```js
// Distributed rate limiting with Redis (production-friendly)
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');
const client = redis.createClient({ host: 'localhost', port: 6379 });

const limiterRedis = rateLimit({
  store: new RedisStore({ client }),
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests; please slow down.'
});

app.use(limiterRedis);
```

### Line-by-line explanation
- Block 1:
  - Line 1-3: Import Express and the rate-limit middleware.
  - Line 5-11: Define a limiter with a 15-minute window and a max of 100 requests per IP; apply a user-friendly error message.
- Block 2:
  - Line 1-3: Import Redis-backed rate limiter components.
  - Line 5-7: Create a Redis client for sharing rate limits across processes or instances.
  - Line 9-15: Configure limiter to use Redis as a store with a 15-minute window and 200 max requests.
  - Line 17: Apply the Redis-based limiter to the app.
- Operational note: In-memory rate limiting is simple but not suitable for multi-process/multi-host deployments; Redis-based rate limiting scales horizontally.

Common beginner mistakes and mitigations
- Pitfall: Relying on a single rate limit for all routes (inefficient and incorrect risk coverage).
  - Mitigation: Apply per-route limits and adjust per endpoint risk (e.g., login vs. read-only endpoints).
- Pitfall: Using a too-large window or too-small max values.
  - Mitigation: Tune based on traffic patterns; start with moderate values and observe, then adjust.
- Pitfall: Not accounting for proxies or load balancers that mask real IPs.
  - Mitigation: Use X-Forwarded-For headers (carefully) or ensure your reverse proxy passes the correct client IP and configure the rate limiter accordingly.

Why this matters in real systems
- Rate limiting preserves service availability during traffic spikes or malicious surges. It helps meet SLA commitments and reduces operational risk. In production, pair rate limiting with caching, autoscaling, and alerting to maintain performance while preventing abuse.

Study questions
- What is the difference between in-memory and Redis-backed rate limiting?
- How do you choose windowMs and max for a given API?
- What considerations are there for users behind proxies or CDNs?
- How does rate limiting interact with authenticated vs. unauthenticated endpoints?
- What metrics would you monitor to tune rate limits effectively?

Exercise
- Create an Express app with a login route and a public data fetch route.
  - Implement per-IP rate limiting on both routes, using Redis-based storage for the public route and a stricter limit on the login route.
  - Demonstrate a simulated burst and verify limits trigger appropriate responses.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- SQL Injection: concatenating user input into SQL vs parameterized queries
  - Bad:
    ```js
    const username = req.query.username;
    const q = `SELECT * FROM users WHERE username = '${username}'`;
    db.query(q);
    ```
  - Good:
    ```js
    const username = req.query.username;
    const [rows] = await db.query('SELECT * FROM users WHERE username = ?', [username]);
    ```
- XSS: unescaped user input in HTML vs escaping
  - Bad:
    ```js
    res.send(`<div>${req.query.comment}</div>`);
    ```
  - Good:
    ```js
    const escapeHtml = require('escape-html');
    res.send(`<div>${escapeHtml(req.query.comment)}</div>`);
    ```
- CSRF: no tokens vs token-protected forms
  - Bad:
    ```html
    <form action="/transfer" method="POST">
      <input name="to" />
      <button>Send</button>
    </form>
    ```
  - Good:
    ```html
    <form action="/transfer" method="POST">
      <input type="hidden" name="_csrf" value="TOKEN_HERE" />
      <input name="to" />
      <button>Send</button>
    </form>
    ```
- Rate limiting: no limits vs per-route limits
  - Bad:
    ```js
    app.post('/login', (req, res) => { /* login */ });
    app.get('/data', (req, res) => { /* fetch */ });
    ```
  - Good:
    ```js
    const limiterLogin = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
    const limiterData = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });

    app.post('/login', limiterLogin, (req, res) => { /* login */ });
    app.get('/data', limiterData, (req, res) => { /* fetch */ });
    ```

## Y. Why This Matters In Real Systems — production context and real usage

- Threat modeling: SQLi, XSS, CSRF, and abuse via rate limits are among the most common web security failures. A robust backend stacks defense-in-depth: parameterized queries, output escaping, anti-CSRF tokens, and rate limiting.
- Observability: Implement structured logging around authentication attempts, DB errors, and rate-limit events. Use metrics like errors per endpoint, time-to-first-byte, and rate-limit triggers to inform capacity planning.
- Compliance and governance: Protect user data, audit admin actions, and ensure your security controls align with OWASP guidelines and relevant regulations.
- Operational considerations:
  - Use secure defaults: parameterized queries, escaping, and same-site cookies.
  - Do not reveal sensitive error details to clients.
  - Rotate credentials and use least-privilege DB accounts.
  - Validate inputs with explicit schemas and perform security testing (static analysis, dynamic scanning, and manual pentesting).

## Z. Study Questions — 5 recall questions

1) What is the primary vulnerability addressed by parameterized queries, and how do placeholders deliver safety?
2) How does escaping user content prevent XSS, and why can template engines help?
3) What roles do CSRF tokens play, and why is token storage important (cookie-based vs header-based)?
4) When is Redis-based rate limiting preferred over in-memory rate limiting, and what are the practical implications?
5) List three production practices to accompany these defenses (logging, testing, and configuration management).

## Exercise — practical multi-part coding challenge

Goal: Build a small Node.js/Express backend that demonstrates secure handling of SQL, HTML rendering, CSRF, and rate limiting. Deliver a single file or a small project you can run with npm start.

Part A: Setup
- Initialize a Node.js project and install dependencies: express, mysql2 (or sqlite3), csurf, cookie-parser, body-parser, escape-html, express-rate-limit, and optionally redis and rate-limit-redis.
- Create a minimal Express app with routes to exercise the four security concerns.

Part B: SQL safety
- Create a /user endpoint that accepts a query parameter username and returns user data.
- Provide both a vulnerable version (for learning) and a secure version using parameterized queries.
- Ensure the app can connect to a local database (you can use SQLite for simplicity or MySQL if available).

Part C: XSS safety
- Create a /greet endpoint that reads a name parameter and renders an HTML page.
- Implement and demonstrate both unsafe and safe rendering, using an escaping library for the safe version.
- Add a small HTML page that uses a template approach with auto-escaping if you want to explore templates.

Part D: CSRF protection
- Add a form submission flow (e.g., /form to render a form and /submit to handle submissions).
- Enable CSRF protection with cookie-based tokens and ensure that form submissions without a valid token fail.

Part E: Rate limiting
- Apply per-IP rate limiting on the login-like endpoint and a more generous limit on a read-only endpoint.
- Implement a Redis-backed limiter if available, otherwise demonstrate in-memory limiter with clear notes about its production limitations.

Part F: Security testing and notes
- Add simple tests or curl commands to demonstrate:
  - Safe vs unsafe SQL behavior.
  - Escaping in HTML responses.
  - CSRF token enforcement by attempting to submit a form without a token and with a token.
  - Rate limit triggers by making repeated requests.

Deliverables
- A runnable Node.js project (package.json, server.js or app.js) that demonstrates:
  - Parameterized SQL queries to prevent SQLi.
  - Escaped HTML rendering to prevent XSS.
  - CSRF token integration for form submissions.
  - Rate limiting with per-IP controls.
- A short README documenting how to run, test, and extend the app, including notes about production considerations (e.g., Redis deployment, CSRF token management, and sampling of attack vectors).

Notes
- Always prefer parameterized queries over string concatenation for database access.
- Prefer escaping or template-driven rendering rather than manual string concatenation when constructing HTML.
- Use CSRF protection on state-changing endpoints in web apps with browser clients.
- Deploy rate limiting in front of sensitive endpoints, and prefer persistent stores (like Redis) for scalable environments.