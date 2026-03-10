# Phase 2 — Web Vulnerabilities: OWASP Top 10 (SQLi, XSS, CSRF) for Red Teaming

In modern web environments, attackers routinely probe for injection, scripting, and request-forgery weaknesses to pivot into sensitive systems. This lesson focuses on three core OWASP Top 10 risk areas—SQL Injection (SQLi), Cross-Site Scripting (XSS), and Cross-Site Request Forgery (CSRF)—through a red-teaming lens. You’ll learn what each vulnerability is, how it arises in typical stacks, practical safe demonstration code in a controlled lab context, and concrete mitigations you can deploy in real systems. The goal is to empower you to simulate, detect, and remediate these threats without turning labs into open doors for misuse.

---

## 1. SQL Injection (SQLi)

SQL Injection is the manipulation of a web application's database query by injecting malicious input. It often arises when user-supplied data is concatenated into SQL statements without proper sanitization. In red-team exercises, SQLi is a primary vector to access or alter data, escalate privileges, or exfiltrate information, especially in legacy codebases or misconfigured ORMs.

### Vulnerable example: basic login with string interpolation (Python/Flask + sqlite3)

```python
# vulnerable_login.py (lab environment: do not run on anything other than a safe lab)
from flask import Flask, request
import sqlite3

app = Flask(__name__)

def get_user(username, password):
    conn = sqlite3.connect('users.db')
    cur = conn.cursor()
    # Vulnerable: string interpolation directly inserted into SQL
    query = f"SELECT id FROM users WHERE username = '{username}' AND password = '{password}'"
    cur.execute(query)
    return cur.fetchone()

@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']
    user = get_user(username, password)
    if user:
        return "Logged in", 200
    return "Invalid credentials", 401

if __name__ == '__main__':
    app.run(debug=True)
```

#### Line-by-line explanation

- import Flask, request: Set up a minimal web server and read HTTP form data.
- import sqlite3: Use SQLite as the demonstration database.
- app = Flask(__name__): Create the Flask application.
- get_user(username, password): Function to fetch a user row based on provided credentials.
- conn = sqlite3.connect('users.db'): Connect to the lab database.
- cur = conn.cursor(): Create a cursor for SQL execution.
- query = f"...": Build SQL by inserting user input directly—dangerous and exploitable.
- cur.execute(query): Execute the constructed SQL string.
- return cur.fetchone(): Return the matching user row if found.
- @app.route('/login', ...): Expose a login endpoint that consumes form data.
- if user: return "Logged in" else: return invalid credentials: Basic access logic.
- if __name__ == '__main__': Run the app for lab use only.

### Safer pattern (mitigation): parameterized queries

```python
# safe_login.py
from flask import Flask, request
import sqlite3

app = Flask(__name__)

def get_user(username, password):
    conn = sqlite3.connect('users.db')
    cur = conn.cursor()
    # Safe: parameterized query prevents injection
    cur.execute("SELECT id FROM users WHERE username = ? AND password = ?", (username, password))
    return cur.fetchone()

@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']
    user = get_user(username, password)
    if user:
        return "Logged in", 200
    return "Invalid credentials", 401

if __name__ == '__main__':
    app.run(debug=True)
```

#### Line-by-line explanation

- def get_user(...): Same purpose as before, but uses safe query execution.
- cur.execute("SELECT ... WHERE ... ?", (username, password)): Uses parameter placeholders (?) and a tuple of inputs; the DB driver handles proper escaping.
- The rest mirrors the vulnerable version, but now user input cannot alter the SQL structure.

Mitigation notes:
- Always use parameterized queries/prepared statements.
- Avoid dynamic SQL generation from user input.
- Hash and salt passwords; never store or compare plaintext passwords.
- Consider a proper authentication framework or ORM that enforces safe query practices.

---

## 2. Cross-Site Scripting (XSS)

XSS occurs when an application echoes untrusted input into HTML without proper escaping, allowing attackers to run JavaScript in the context of other users’ sessions. In red-team exercises, XSS can be leveraged to hijack sessions, deface pages, or steal tokens, especially in blogs, comments, or user-generated content features.

### Reflected XSS and vulnerable echo (Python/Flask)

```python
# vulnerable_xss.py
from flask import Flask, request
app = Flask(__name__)

@app.route('/greet')
def greet():
    name = request.args.get('name', '')
    # Vulnerable: directly injects user input into HTML
    return f"<html><body>Hello, {name}!</body></html>"

if __name__ == '__main__':
    app.run(debug=True)
```

#### Line-by-line explanation

- from flask import Flask, request: Set up web server and access query parameters.
- app = Flask(__name__): Create the app.
- @app.route('/greet'): Expose the /greet endpoint.
- name = request.args.get('name', ''): Read user-provided name from the query string.
- return f"<html>...{name}...</html>": Directly inject user input into HTML without escaping.

### Safe pattern: escaping or template-based rendering

Option A: escape the input before embedding

```python
# safe_xss_escape.py
from flask import Flask, request
from markupsafe import escape
app = Flask(__name__)

@app.route('/greet')
def greet():
    name = request.args.get('name', '')
    safe_name = escape(name)
    return f"<html><body>Hello, {safe_name}!</body></html>"

if __name__ == '__main__':
    app.run(debug=True)
```

Option B: use templates with auto-escaping (recommended)

```python
# safe_xss_template.py
from flask import Flask, request, render_template_string
app = Flask(__name__)

@app.route('/greet')
def greet():
    name = request.args.get('name', '')
    template = "<html><body>Hello, {{ name }}</body></html>"
    return render_template_string(template, name=name)  # Jinja2 auto-escapes

if __name__ == '__main__':
    app.run(debug=True)
```

### Line-by-line explanation

- Name input is read from the query string.
- In Option A, escape() converts characters like <, >, &, ' to safe HTML entities before insertion.
- In Option B, render_template_string or a proper template ensures auto-escaping by the template engine, preventing raw HTML from being rendered.
- The safe approach also includes maintaining a strict separation between code and content.

Stored XSS example (lab-safe prompt): injecting untrusted data into a stored field and then rendering it without escaping.

```python
# vulnerable_stored_xss.py (conceptual)
@app.route('/comment', methods=['POST'])
def comment():
    content = request.form['content']  # user-supplied
    db.execute("INSERT INTO comments (content) VALUES ('%s')" % content)  # unsafe
    db.commit()
    return "Comment saved"

@app.route('/comments')
def comments():
    rows = db.execute("SELECT content FROM comments").fetchall()
    html = "<html><body>"
    for (content,) in rows:
        html += f"<div>{content}</div>"  # unescaped content shown
    html += "</body></html>"
    return html
```

Safe recovery (escaping when rendering):

```python
# safe_stored_xss_render.py
from markupsafe import escape
...
@app.route('/comments')
def comments():
    rows = db.execute("SELECT content FROM comments").fetchall()
    html = "<html><body>"
    for (content,) in rows:
        html += f"<div>{escape(content)}</div>"
    html += "</body></html>"
    return html
```

Mitigation notes:
- Prefer templating engines with proper escaping.
- Validate and sanitize user-generated content when possible.
- Consider content security policy (CSP) to mitigate inline scripts.
- For stored XSS, always sanitize at render time; also consider input validation to limit allowed content.

---

## 3. Cross-Site Request Forgery (CSRF)

CSRF tricks a user’s browser into performing undesired actions on a site where the user is authenticated. Red-team exercises simulate CSRF to assess how well protections are implemented (tokens, SameSite cookies, referer checks). The core defense is to ensure that state-changing requests (POST/PUT/DELETE) require a token that an attacker cannot forge.

### Vulnerable flow: unsafe POST endpoint with no CSRF protection

```python
# vulnerable_csrf.py
from flask import Flask, request, session
app = Flask(__name__)
app.secret_key = 'lab_secret_key'

@app.route('/purchase', methods=['POST'])
def purchase():
    amount = request.form['amount']
    user_id = session.get('user_id')
    if not user_id:
        return "Not logged in", 401
    # simulate transfer
    return f"Transferred {amount} units"
```

Attack page (lab-only) that performs a cross-site request if the user is authenticated:

```html
<!-- attacker.html (lab environment) -->
<!DOCTYPE html>
<html>
  <body>
    <form action="https://target.lab/purchase" method="post" id="csfr-form">
      <input type="hidden" name="amount" value="1000" />
      <noscript>Auto-submitting form</noscript>
    </form>
    <script>document.getElementById('csfr-form').submit();</script>
  </body>
</html>
```

#### Line-by-line explanation

- The Flask route purchase() processes a POST request to transfer funds without any CSRF token verification.
- In many browsers, if a logged-in user visits the attacker page, the browser can auto-submit the form to the target, performing the action without explicit consent.
- The attacker HTML page demonstrates the concept of CSRF in a controlled lab, not a real-world attack, to help you test defenses.

### Mitigated approach: CSRF tokens and SameSite cookies

Lab-safe example implementing a token check

```python
# csrf_protected.py
from flask import Flask, request, session, render_template_string
import secrets

app = Flask(__name__)
app.secret_key = 'lab_secret_key'

def generate_csrf_token():
    token = secrets.token_hex(16)
    session['csrf_token'] = token
    return token

def validate_csrf(token_from_form):
    token = session.get('csrf_token')
    return token and token == token_from_form

@app.route('/purchase', methods=['GET', 'POST'])
def purchase():
    if request.method == 'GET':
        token = generate_csrf_token()
        # Simple form embedding the token
        form = f"""
        <form action="/purchase" method="post">
            <input type="hidden" name="csrf_token" value="{token}">
            <input name="amount" value="100" />
            <input type="submit" />
        </form>
        """
        return render_template_string(form)
    else:
        if not validate_csrf(request.form.get('csrf_token')):
            return "CSRF validation failed", 400
        amount = request.form['amount']
        user_id = session.get('user_id')
        if not user_id:
            return "Not logged in", 401
        # perform the transfer (lab-safe)
        return f"Transferred {amount} units"

if __name__ == '__main__':
    # Hint: set cookies with SameSite attribute in real deployments
    app.run(debug=True)
```

#### Line-by-line explanation

- generate_csrf_token creates a random token and stores it in the user session.
- validate_csrf checks that the submitted token matches the one stored in session.
- GET /purchase returns a form with a CSRF token embedded.
- POST /purchase requires a valid CSRF token; otherwise, it rejects the request.
- This pattern prevents unauthorized cross-origin state-changing requests.
- In production, also set cookies with SameSite=Lax or SameSite=Strict to limit cross-site cookie sending.

Mitigation notes:
- Always require CSRF tokens for state-changing requests (POST/PUT/DELETE).
- Use framework-provided CSRF protections when available (e.g., Flask-WWTForms CSRF, Django CSRF middleware).
- Consider SameSite cookies and referer/header checks as additional defenses.
- Combine CSRF protections with user education and strong input validation.

---

## X. Common Beginner Mistakes

Bad vs Good code snippets side-by-side to illustrate typical pitfalls and proper patterns.

- SQLi: direct string concatenation vs parameterized queries
  - Bad:
    ```python
    query = "SELECT * FROM users WHERE username = '" + username + "'"
    cur.execute(query)
    ```
  - Good:
    ```python
    cur.execute("SELECT * FROM users WHERE username = ?", (username,))
    ```

- XSS: unescaped user input in HTML vs template escaping
  - Bad:
    ```python
    return f"<div>{user_input}</div>"
    ```
  - Good:
    ```python
    from markupsafe import escape
    return f"<div>{escape(user_input)}</div>"
    ```
  - Or using templates with auto-escaping:
    ```python
    return render_template("user.html", name=user_input)
    ```

- CSRF: no token vs token-protected requests
  - Bad:
    ```python
    @app.route('/transfer', methods=['POST'])
    def transfer():
        amount = request.form['amount']
        # no CSRF protection
        return "OK"
    ```
  - Good:
    ```python
    @app.route('/transfer', methods=['POST'])
    def transfer():
        token = request.form.get('csrf_token')
        if not validate_csrf(token):
            return "CSRF failed", 400
        # proceed after CSRF check
        return "OK"
    ```

- Password handling: plaintext passwords vs hashing
  - Bad:
    ```python
    if password == stored_password:
        login()
    ```
  - Good:
    ```python
    import bcrypt
    if bcrypt.checkpw(password.encode(), stored_hash):
        login()
    ```

- Content Security: inline scripts and unsafe approvals
  - Bad: inline event handlers or inline scripts
  - Good: CSP-compliant structure with external scripts and nonces per request (conceptual)

---

## Y. Why This Matters In Real Systems

- Financial and personal data: SQLi can exfiltrate credentials, order data, or PII, triggering regulatory fines (e.g., GDPR, CCPA) and remediation costs.
- Reputation and trust: XSS can deface sites or hijack accounts, eroding user trust and affecting brand value.
- Compliance and lifecycle: CSRF protections are a baseline requirement for modern frameworks; lacking CSRF defenses can invalidate compliance audits.
- Red team value: In production-like environments, red teams use controlled SQLi/XSS/CSRF simulations to validate defenses, train blue teams, and tune WAFs, content security policies, and automated scanners. The goal is to reduce mean time to detect and remediate, not to maximize exploit success.

Practical takeaways for real systems:
- Use parameterized queries everywhere; never construct SQL with user input.
- Use templating engines with auto-escaping, and adopt a strict Content Security Policy (CSP).
- Implement CSRF protections, tokens, and SameSite cookies; validate tokens for all critical state-changing operations.
- Enforce secure password storage (hashing + salting) and regular vulnerability scanning.
- Implement defense-in-depth: input validation, output encoding, access controls, logging, and anomaly detection.

---

## Z. Study Questions

1. What is SQL Injection and how do parameterized queries mitigate it?
2. How do reflected and stored XSS differ, and what are common defenses?
3. What is CSRF and why are tokens effective in preventing it?
4. How does the SameSite cookie attribute help reduce CSRF risk?
5. In a red-team lab, what steps would you take to safely test for SQLi, XSS, and CSRF in a running application?

---

## Exercise

Part 1: Build a tiny lab web app (Flask) that contains vulnerable and patched paths for SQLi, XSS, and CSRF.

- Deliverables:
  - A single Python file lab_app.py that runs a small lab server.
  - A SQLite in-memory database or temporary file with a users table and a comments table.
  - Endpoints:
    - /login (POST): vulnerable version and a patched version toggle.
    - /comment (POST/GET): demonstrate stored XSS vulnerability and safe rendering.
    - /purchase (GET/POST): demonstrate CSRF vulnerability and patched CSRF protection.
  - A simple HTML page or script to demonstrate a lab CSRF attempt against the vulnerable endpoint (clearly labeled as lab use only).

- Part 2: Implement mitigations in the same file
  - SQL: switch to parameterized queries.
  - XSS: render with escaping/templates.
  - CSRF: implement a simple token mechanism and discuss SameSite cookies.

- Part 3: Automated basic test
  - A small Python script test_lab.py that:
    - Hits /login with a payload intended to break the SQL query and confirms that the patched version rejects it.
    - Requests /comment and /display, ensuring that user-provided content is escaped.
    - Attempts a CSRF-like POST to /purchase without a token and confirms rejection, then with a valid token.

- Part 4: Reflection
  - Write a short reflection (200–400 words) on how these protections affect the attack surface and how blue-team monitoring should adapt to detect attempts during a red-team exercise.

Note on safety and ethics:
- Do all exercises in a controlled, isolated lab environment you own or are authorized to test.
- Do not deploy intentionally vulnerable code to production or public systems.
- Document findings responsibly and focus on fixes, not exploitation in real-world systems.

If you would like, I can provide a ready-to-run lab_app.py and test_lab.py skeletons you can drop into a sandbox environment to begin the exercises.