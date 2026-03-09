# Backend Engineering — Phase 6: Authentication & Security

Security is a core responsibility of backend systems. SQL injection (SQLi), cross-site scripting (XSS), cross-site request forgery (CSRF), and rate limiting are common attack surfaces that can cripple data integrity, user trust, and service availability. In this module, you’ll learn practical, Python-centric patterns to defend against these threats, with concrete code examples, explanations, and hands-on exercises you can adapt to real systems.

## 1. SQL Injection (SQLi)

SQL injection occurs when user input is interpolated directly into SQL queries, allowing attackers to alter query structure. The safest defense is using parameterized queries and ORM protections rather than string concatenation.

```python
# Bad: vulnerable to SQLi via string interpolation
import sqlite3

def get_user_by_email_bad(email: str):
    conn = sqlite3.connect("db.sqlite")
    cur = conn.cursor()
    # Directly interpolating user input into SQL
    query = "SELECT id, email, role FROM users WHERE email = '%s'" % email
    cur.execute(query)
    result = cur.fetchone()
    conn.close()
    return result
```

```python
# Good: parameterized query prevents SQLi
import sqlite3

def get_user_by_email_good(email: str):
    conn = sqlite3.connect("db.sqlite")
    cur = conn.cursor()
    # Use placeholders to separate query structure from data
    cur.execute("SELECT id, email, role FROM users WHERE email = ?", (email,))
    result = cur.fetchone()
    conn.close()
    return result
```

### Line-by-line explanation (Bad code block)

- import sqlite3
  - Bring in SQLite database library for demonstration.
- def get_user_by_email_bad(email: str):
  - Define a function that takes an email string as input.
-     conn = sqlite3.connect("db.sqlite")
  - Open a connection to the database file.
-     cur = conn.cursor()
  - Create a cursor to execute SQL commands.
-     query = "SELECT id, email, role FROM users WHERE email = '%s'" % email
  - Build the SQL query by injecting user input directly into the string (unsafe).
-     cur.execute(query)
  - Execute the potentially unsafe query.
-     result = cur.fetchone()
  - Fetch a single row result (or None).
-     conn.close()
  - Close the database connection.
-     return result
  - Return the retrieved row.

### Line-by-line explanation (Good code block)

- import sqlite3
  - Import the database library.
- def get_user_by_email_good(email: str):
  - Function signature unchanged for clarity.
-     conn = sqlite3.connect("db.sqlite")
  - Connect to the database.
-     cur = conn.cursor()
  - Create a cursor for executing statements.
-     cur.execute("SELECT id, email, role FROM users WHERE email = ?", (email,))
  - Execute a parameterized query; the email value is bound safely.
-     result = cur.fetchone()
  - Retrieve one matching row.
-     conn.close()
  - Close the connection.
-     return result
  - Return the result.

## 2. Cross-Site Scripting (XSS)

XSS happens when untrusted user input is rendered into HTML without proper escaping, allowing attackers to inject scripts. The safest defense is to rely on templating engines’ autoescaping and explicit escaping when constructing HTML manually.

```python
# Bad: direct string concatenation into HTML (XSS risk)
def render_comment_bad(user_input: str) -> str:
    return "<div>Comment: " + user_input + "</div>"
```

```python
# Good: escape user input before embedding
import html

def render_comment_good(user_input: str) -> str:
    safe = html.escape(user_input, quote=True)
    return f"<div>Comment: {safe}</div>"
```

```python
# Alternative good approach: template engine with auto-escaping
from jinja2 import Environment, select_autoescape

env = Environment(autoescape=select_autoescape(enabled_extensions=("html", "htm"), default_for_string=False))

def render_comment_template(user_input: str) -> str:
    template = env.from_string("<div>Comment: {{ input }}</div>")
    return template.render(input=user_input)
```

### Line-by-line explanation (Bad code block)

- def render_comment_bad(user_input: str) -> str:
  - Define a function returning HTML with user input.
-     return "<div>Comment: " + user_input + "</div>"
  - Directly append user input to HTML; if user_input contains HTML/JS, it will execute in the browser.

### Line-by-line explanation (Good code block using html.escape)

- import html
  - Import Python’s HTML escaping utilities.
- def render_comment_good(user_input: str) -> str:
  - Function signature.
-     safe = html.escape(user_input, quote=True)
  - Escape special HTML characters, including quotes.
-     return f"<div>Comment: {safe}</div>"
  - Insert the escaped content into HTML safely.

### Line-by-line explanation (Template engine)

- from jinja2 import Environment, select_autoescape
  - Import Jinja2 for templating with autoescaping.
- env = Environment(autoescape=select_autoescape(enabled_extensions=("html", "htm"), default_for_string=False))
  - Create a template environment with autoescaping enabled for HTML.
- def render_comment_template(user_input: str) -> str:
  - Function signature.
-     template = env.from_string("<div>Comment: {{ input }}</div>")
  - Compile a template that escapes any variable content.
-     return template.render(input=user_input)
  - Render with user input; the engine escapes as needed.

## 3. Cross-Site Request Forgery (CSRF)

CSRF tricks users into executing unwanted actions on authenticated sites. The standard defense is a CSRF token tied to the user session and validated by the server for state-changing requests. You can implement tokens manually or rely on frameworks' built-in protections (e.g., Flask-WTF, Django CSRF middleware).

```python
# Bad: no CSRF protection for a form submission
from flask import Flask, request

app = Flask(__name__)

@app.route('/submit', methods=['POST'])
def submit():
    data = request.form['data']
    # process data (state-changing)
    return "OK"
```

```python
# Good: basic CSRF protection using a per-session token
from flask import Flask, request, session, render_template_string
import secrets

app = Flask(__name__)
app.secret_key = 'super-secret-key'  # In production, load from environment

def ensure_token():
    if '_csrf_token' not in session:
        session['_csrf_token'] = secrets.token_hex(16)

def valid_csrf(token: str) -> bool:
    return token == session.get('_csrf_token')

@app.route('/form', methods=['GET'])
def form():
    ensure_token()
    token = session['_csrf_token']
    return render_template_string('''
        <form method="POST" action="/submit">
            <input type="hidden" name="csrf_token" value="{{ token }}"/>
            <input name="data"/>
            <button type="submit">Submit</button>
        </form>
    ''', token=token)

@app.route('/submit', methods=['POST'])
def submit():
    token = request.form.get('csrf_token', '')
    if not valid_csrf(token):
        return "CSRF token invalid", 400
    data = request.form['data']
    # process state-changing data
    return "OK"
```

### Line-by-line explanation (Bad code block)

- from flask import Flask, request
  - Import Flask request handling.
- app = Flask(__name__)
  - Create the Flask app.
- @app.route('/submit', methods=['POST'])
  - Define a route for form submission (state-changing).
- def submit():
  - Handler function.
-     data = request.form['data']
  - Retrieve submitted data.
-     # process data (state-changing)
  - Placeholder for processing.
-     return "OK"
  - Respond success.

### Line-by-line explanation (Good code block)

- from flask import Flask, request, session, render_template_string
  - Import CSRF-tokens and session management helpers.
- import secrets
  - For generating secure tokens.
- app = Flask(__name__)
  - Create app.
- app.secret_key = 'super-secret-key'
  - Set a secret key for sessions (use a real secret in production).
- def ensure_token():
  - Helper to ensure a CSRF token exists in the session.
-     if '_csrf_token' not in session:
-         session['_csrf_token'] = secrets.token_hex(16)
  - Generate and store a new token if missing.
- def valid_csrf(token: str) -> bool:
  - Validate token against session value.
-     return token == session.get('_csrf_token')
  - Comparison.
- @app.route('/form', methods=['GET'])
  - Endpoint to render the form with a CSRF token.
- def form():
  - Handler.
-     ensure_token()
-     token = session['_csrf_token']
  - Retrieve token for the form.
-     return render_template_string(''' ... ''', token=token)
  - Render an HTML form including the hidden CSRF token.
- @app.route('/submit', methods=['POST'])
  - Endpoint for form submission with CSRF check.
- def submit():
  - Handler.
-     token = request.form.get('csrf_token', '')
-     if not valid_csrf(token):
-         return "CSRF token invalid", 400
  - Validate token and reject invalid submissions.
-     data = request.form['data']
  - Process the input safely.
-     return "OK"
  - Respond success.

Note: In production, prefer a framework-provided CSRF solution (e.g., Flask-WTF, Django CSRF middleware) for robustness and maintenance.

## 4. Rate Limiting

Rate limiting protects APIs from abuse, DoS, and credential-stuffing by restricting the number of requests from a client in a given window. A simple in-process rate limiter is fine for small apps or demos; for distributed systems, use a centralized store (e.g., Redis) with a token bucket or sliding window algorithm.

```python
# In-process rate limiter (per-process, per-IP)
import time
from flask import Flask, request, jsonify

app = Flask(__name__)

RATE_LIMIT = 5      # requests
WINDOW_SECS = 60    # per minute
WINDOW_STARTS = {}

def is_rate_limited(ip: str) -> bool:
    now = int(time.time())
    window_start = now - (now % WINDOW_SECS)
    bucket = WINDOW_STARTS.get(ip, [])
    # Drop timestamps outside the current window
    bucket = [t for t in bucket if t > window_start]
    if len(bucket) >= RATE_LIMIT:
        WINDOW_STARTS[ip] = bucket
        return True
    bucket.append(now)
    WINDOW_STARTS[ip] = bucket
    return False

@app.route('/api', methods=['GET'])
def api():
    ip = request.remote_addr or '127.0.0.1'
    if is_rate_limited(ip):
        return jsonify({"error": "rate limit exceeded"}), 429
    return jsonify({"ok": True})
```

```python
# Distributed rate limiter (using Redis)
import redis
from flask import Flask, request, jsonify

r = redis.Redis(host='localhost', port=6379, db=0)

def is_rate_limited_redis(ip: str, limit: int = 100, window: int = 60) -> bool:
    key = f"rl:{ip}"
    with r.pipeline() as pipe:
        pipe.incr(key, 1)
        pipe.expire(key, window)
        current, _ = pipe.execute()
    return current > limit

app = Flask(__name__)

@app.route('/api-rate', methods=['GET'])
def api_rate():
    ip = request.remote_addr or '127.0.0.1'
    if is_rate_limited_redis(ip, limit=100, window=60):
        return jsonify({"error": "rate limit exceeded"}), 429
    return jsonify({"ok": True})
```

### Line-by-line explanation (In-process rate limiter)

- import time
  - Access the system clock for window calculations.
- from flask import Flask, request, jsonify
  - Web framework and response helpers.
- app = Flask(__name__)
  - Create the app.
- RATE_LIMIT = 5
- WINDOW_SECS = 60
  - Configuration: 5 requests per 60 seconds.
- WINDOW_STARTS = {}
  - In-memory store of per-IP request timestamps.
- def is_rate_limited(ip: str) -> bool:
  - Helper to check/record requests.
-     now = int(time.time())
  - Current time in seconds.
-     window_start = now - (now % WINDOW_SECS)
  - Align to the start of the current window.
-     bucket = WINDOW_STARTS.get(ip, [])
  - Retrieve or start a new bucket for the IP.
-     bucket = [t for t in bucket if t > window_start]
  - Remove timestamps older than the current window.
-     if len(bucket) >= RATE_LIMIT:
  - If the bucket is full, rate limit is hit.
-         WINDOW_STARTS[ip] = bucket
  - Save the trimmed bucket.
-         return True
  - Deny the request.
-     bucket.append(now)
-     WINDOW_STARTS[ip] = bucket
  - Record the current request.
-     return False
  - Allow the request.
- @app.route('/api', methods=['GET'])
  - Example endpoint protected by rate limiting.
- def api():
-     ip = request.remote_addr or '127.0.0.1'
-     if is_rate_limited(ip):
-         return jsonify({"error": "rate limit exceeded"}), 429
-     return jsonify({"ok": True})
  - Logic to permit or reject the request.

### Line-by-line explanation (Redis-based rate limiter)

- import redis
  - Import Redis client for distributed rate limiting.
- from flask import Flask, request, jsonify
  - Flask components.
- r = redis.Redis(host='localhost', port=6379, db=0)
  - Connect to Redis.
- def is_rate_limited_redis(ip: str, limit: int = 100, window: int = 60) -> bool:
  - Helper to check/record requests using Redis.
-     key = f"rl:{ip}"
  - Unique key per IP.
-     with r.pipeline() as pipe:
-         pipe.incr(key, 1)
-         pipe.expire(key, window)
-         current, _ = pipe.execute()
  - Atomically increment the counter and set a TTL.
-     return current > limit
  - If the counter exceeds the limit, rate limit.
- app = Flask(__name__)
- @app.route('/api-rate', methods=['GET'])
- def api_rate():
-     ip = request.remote_addr or '127.0.0.1'
-     if is_rate_limited_redis(ip, limit=100, window=60):
-         return jsonify({"error": "rate limit exceeded"}), 429
-     return jsonify({"ok": True})
  - Endpoint behavior with Redis-backed rate limiting.

## X. Common Beginner Mistakes

- SQLi through string concatenation
  - Bad:
    - query = "SELECT id FROM users WHERE username = '%s' AND pass = '%s'" % (username, password)
  - Good:
    - cur.execute("SELECT id FROM users WHERE username = ? AND pass = ?", (username, password))

- XSS by injecting unescaped user input
  - Bad:
    - return "<div>Comment: " + user_input + "</div>"
  - Good:
    - safe = html.escape(user_input, quote=True)
    - return f"<div>Comment: {safe}</div>"
- CSRF protection missing on state-changing actions
  - Bad:
    - @app.route('/transfer', methods=['POST'])
    - def transfer():
    -     amount = request.form['amount']
    -     # process transfer
  - Good:
    - Include and validate a CSRF token (manual or framework-based)
- Rate limiting not deployed in distributed systems
  - Bad:
    - Basic in-process limiter only; no sharing across processes or pods
  - Good:
    - Use a centralized store (Redis) with a coherent policy; consider sliding-window or token-bucket

## Y. Why This Matters In Real Systems

- Defense-in-depth: SQLi, XSS, CSRF, and abuse via high request volume are common, high-impact attack surfaces in production systems. Correctly parameterizing database queries, escaping or templating output, validating requests with CSRF tokens, and applying thoughtful rate limiting collectively reduce data theft, session hijacking, unauthorized actions, and outages.
- Production realities:
  - Shared-nothing deployments across multiple processes or containers require centralized state for rate-limiting (Redis, etcd, or a API gateway).
  - Frameworks like Flask/Django provide battle-tested patterns (ORM, templates with autoescaping, CSRF middleware) which you should lean on rather than re-inventing the wheel.
  - Logging, observability, and alerting around security controls help you detect abuse and respond quickly.
- Trade-offs:
  - Parameterized queries may incur minor overhead but prevent catastrophic data corruption.
  - Escaping vs sanitization: escaping is safer in most templating contexts; sanitization can be brittle and context-dependent.
  - CSRF token solutions require secure storage (session) and careful handling of token rotation and replay protection.
  - Rate limiting can impact legitimate users; choose thresholds appropriate for your traffic, cost, and SLAs.

## Z. Study Questions

1. Why are parameterized queries effective against SQL injection, and what is a common pitfall that parameterization prevents?
2. How does HTML escaping prevent XSS, and when might a templating engine’s autoescape be preferred over manual escaping?
3. What is a CSRF token, and what two properties must it have to protect state-changing operations?
4. Differentiate between in-process rate limiting and distributed rate limiting. Why is Redis commonly used for the latter?
5. Name a best-practice defense for CSRF in modern Python web frameworks (and mention a basic alternative if you’re not using a framework).

## Exercise

Build a small Python web service (Flask) that demonstrates all four security topics in a cohesive, end-to-end example. The exercise is split into four parts:

Part A — SQLi-safe search endpoint
- Create an in-memory SQLite database with a users table (id, username, email).
- Implement /search that accepts a query parameter q and returns matching users by using parameterized queries only.
- Ensure you handle cases with no results gracefully.

Part B — XSS-safe comment rendering
- Implement /comment with a POST endpoint that accepts a comment field.
- Demonstrate two approaches:
  - An unsafe rendering path that would be vulnerable to XSS (for learning, not for deployment).
  - A safe rendering path using html.escape or a templating engine with autoescaping.
- Return both results in a simple HTML page so you can observe the difference locally.

Part C — CSRF-protected form submission
- Implement /form (GET) to render a small form with a hidden CSRF token.
- Implement /submit (POST) to validate the CSRF token before processing the form data.
- Show a route that would be vulnerable if CSRF protection was not present (e.g., performing a state-changing action like “vote” or “transfer”) and ensure the token protection is enforced.

Part D — Rate-limited API endpoint
- Implement /api/data that returns data but is rate-limited per client IP.
- Provide two implementations:
  - In-process limiter suitable for a single-instance app (with a note about its limitations in multi-process environments).
  - Redis-backed limiter for distributed deployments.

Deliverables:
- A single Python script (e.g., app.py) that runs a Flask app implementing all four parts.
- A README or docstring at the top describing setup steps (pip install flask sqlite3 depends on the standard library; for Redis, pip install redis and ensure Redis is running if you test Part D’s Redis approach).
- Clear comments explaining security choices and trade-offs.

Notes:
- Do not expose real secrets in your code. Use environment variables or simple placeholders in the example.
- Run the app locally and test endpoints with curl or a lightweight browser. Observe the output differences between secure vs insecure approaches.
- You can expand tests with pytest or a simple script, but the core exercise should be runnable as-is.