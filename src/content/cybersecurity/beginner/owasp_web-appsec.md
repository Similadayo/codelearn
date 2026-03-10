# OWASP Top 10: SQL Injection, XSS, CSRF — Phase 2: Web Vulnerabilities

Web applications are a prime attack surface in the real world. The OWASP Top 10 highlights the most critical security risks that commonly affect web apps. In Phase 2, we dive into three high-impact vulnerabilities: SQL Injection (SQLi), Cross-Site Scripting (XSS), and Cross-Site Request Forgery (CSRF). You’ll see concrete code examples, learn how attackers exploit these flaws, and practice secure coding patterns that prevent breaches in production systems.

---

## 1. SQL Injection (SQLi)

SQL Injection happens when an application builds SQL queries by concatenating user input directly. Attackers can alter query structure, access or modify data, or run administrative commands. The secure pattern uses parameterized queries or an ORM that binds user input safely.

### Vulnerable Code: SQLi via string interpolation (Python/Flask with sqlite3)

```python
# vulnerable.py
from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)

@app.route('/user')
def get_user():
    username = request.args.get('username', '')
    conn = sqlite3.connect('db.sqlite3')
    cur = conn.cursor()
    # Vulnerable: user input is interpolated directly into the SQL string
    query = f"SELECT id, username, email FROM users WHERE username = '{username}'"
    cur.execute(query)
    row = cur.fetchone()
    conn.close()

    if row:
        return jsonify({'id': row[0], 'username': row[1], 'email': row[2]})
    return jsonify({'error': 'user not found'}), 404
```

### Line-by-line explanation for Vulnerable SQLi code

- from flask import Flask, request, jsonify
  - Imports Flask and helper utilities for handling requests and JSON responses.
- import sqlite3
  - Imports the SQLite database adapter for Python.
- app = Flask(__name__)
  - Creates a Flask application instance.
- @app.route('/user')
  - Defines an HTTP GET endpoint at /user.
- def get_user():
  - Handler function for the endpoint.
- username = request.args.get('username', '')
  - Reads the username query parameter provided by the client.
- conn = sqlite3.connect('db.sqlite3')
  - Opens a connection to the SQLite database.
- cur = conn.cursor()
  - Creates a cursor to execute SQL statements.
- query = f"SELECT id, username, email FROM users WHERE username = '{username}'"
  - Builds the SQL string by directly inserting user input (vulnerable to injection).
- cur.execute(query)
  - Executes the potentially unsafe SQL query.
- row = cur.fetchone()
  - Retrieves the first matching row (or None if not found).
- conn.close()
  - Closes the database connection.
- if row:
  - Checks if a matching user was found.
- return jsonify({'id': row[0], 'username': row[1], 'email': row[2]})
  - Returns the user data as JSON.
- return jsonify({'error': 'user not found'}), 404
  - Returns a 404 error if no user matched.

### Line-by-line explanation for Vulnerable SQLi code (continued)

- The core flaw is the interpolation of username directly into the SQL string. An attacker can supply input like:
  - username = "'; DROP TABLE users; --"
  - This could terminate the original query and execute a malicious command, potentially destroying data or exfiltrating information.
- Because the SQL is constructed as a plain string, the database engine treats the injected content as part of the query semantics.

### Secure Code: Parameterized queries (Python/Flask with sqlite3)

```python
# secure.py
from flask import Flask, request, jsonify
import sqlite3

app = Flask(__name__)

@app.route('/user')
def get_user():
    username = request.args.get('username', '')
    conn = sqlite3.connect('db.sqlite3')
    cur = conn.cursor()
    # Secure: use parameterized query to bind user input
    cur.execute("SELECT id, username, email FROM users WHERE username = ?", (username,))
    row = cur.fetchone()
    conn.close()

    if row:
        return jsonify({'id': row[0], 'username': row[1], 'email': row[2]})
    return jsonify({'error': 'user not found'}), 404
```

### Line-by-line explanation for Secure code

- The imports and app setup are the same as in the vulnerable version.
- username = request.args.get('username', '')
  - Reads the same input.
- conn = sqlite3.connect('db.sqlite3')
  - Opens the database connection.
- cur = conn.cursor()
  - Creates a cursor for SQL execution.
- cur.execute("SELECT id, username, email FROM users WHERE username = ?", (username,))
  - Executes a parameterized query. The ? placeholder is bound to the value of username by the database driver.
- row = cur.fetchone()
  - Fetches the first result.
- conn.close()
  - Closes the connection.
- The response logic remains the same.

Why this matters in production:
- Parameterized queries prevent attackers from altering query structure, protecting against data leaks, data corruption, and privilege escalation.
- Even complex inputs (quotes, semicolons, comments) are treated as data, not as part of SQL commands.
- Most modern frameworks and ORMs enforce parameter binding by default; prefer those patterns and avoid string concatenation altogether.

---

## 2. Cross-Site Scripting (XSS)

XSS occurs when an application includes untrusted input in web pages without proper escaping, allowing attackers to execute arbitrary scripts in the victim’s browser. There are stored and reflected variants. Modern templating engines and strict output encoding are the defense.

### Vulnerable Code: Direct string concatenation in HTML (Python/Flask)

```python
# vulnerable_xss.py
from flask import Flask, request

app = Flask(__name__)

@app.route('/greet')
def greet():
    name = request.args.get('name', '')
    # Vulnerable: directly injecting user input into HTML
    html = "<html><body>Welcome, " + name + "!</body></html>"
    return html
```

### Line-by-line explanation for Vulnerable XSS code

- from flask import Flask, request
  - Imports Flask and request utilities.
- app = Flask(__name__)
  - Creates a Flask app instance.
- @app.route('/greet')
  - Defines an HTTP GET endpoint at /greet.
- def greet():
  - Handler function for the endpoint.
- name = request.args.get('name', '')
  - Reads the name query parameter provided by the client.
- html = "<html><body>Welcome, " + name + "!</body></html>"
  - Constructs HTML by concatenating untrusted input directly.
- return html
  - Returns the crafted HTML to the client.

### Line-by-line explanation for Vulnerable code (continued)

- If a user passes name=<script>alert('XSS')</script>, the script tag becomes part of the HTML and will execute in the victim’s browser, enabling XSS.

### Secure Code: Template rendering with escaping (Python/Flask)

```python
# secure_xss.py
from flask import Flask, request, render_template_string

app = Flask(__name__)

@app.route('/greet')
def greet():
    name = request.args.get('name', '')
    # Secure: render through a template with automatic escaping
    template = "<html><body>Welcome, {{ name }}!</body></html>"
    return render_template_string(template, name=name)
```

### Line-by-line explanation for Secure XSS code

- from flask import Flask, request, render_template_string
  - Imports Flask utilities plus a template renderer that escapes variables by default.
- app = Flask(__name__)
  - Creates a Flask app instance.
- @app.route('/greet')
  - Defines an HTTP GET endpoint at /greet.
- def greet():
  - Handler function for the endpoint.
- name = request.args.get('name', '')
  - Reads the name query parameter.
- template = "<html><body>Welcome, {{ name }}!</body></html>"
  - A template with a placeholder for name.
- return render_template_string(template, name=name)
  - Renders the template with escaping applied to name, preventing HTML/JS injection.

Why this matters in production:
- Escape or encode all dynamic content before inserting it into HTML, JavaScript, or CSS contexts.
- Rely on templates with autoescaping enabled (most frameworks do this by default).
- Be cautious when bypassing templating (e.g., using string concatenation or dangerouslySetInnerHTML patterns in frontend frameworks).

Additional defense in depth:
- Consider Content Security Policy (CSP) to reduce the impact of any residual XSS by restricting script execution sources.
- Validate and sanitize inputs when appropriate, but never rely on sanitization alone as a substitute for proper escaping.

---

## 3. Cross-Site Request Forgery (CSRF)

CSRF tricks a user’s browser into performing unwanted actions on a site where the user is authenticated. Attackers rely on the browser to automatically include cookies. Mitigations include anti-forgery tokens, SameSite cookies, and proper request validation.

### Vulnerable Code: State-changing action without CSRF protection (Python/Flask)

```python
# vulnerable_csrf.py
from flask import Flask, request, session

app = Flask(__name__)
app.secret_key = 'supersecret'

@app.route('/transfer', methods=['POST'])
def transfer():
    if 'authenticated' not in session:
        return 'Unauthorized', 401
    amount = int(request.form.get('amount', 0))
    # Imagine this updates a bank balance - vulnerable to CSRF without tokens
    # balance -= amount
    return f'Transferred {amount} units'
```

### Line-by-line explanation for Vulnerable CSRF code

- from flask import Flask, request, session
  - Imports Flask and session management utilities.
- app = Flask(__name__)
  - Creates a Flask app instance.
- app.secret_key = 'supersecret'
  - Sets a secret key required for session management.
- @app.route('/transfer', methods=['POST'])
  - Defines a POST endpoint to perform a transfer.
- def transfer():
  - Handler function for the endpoint.
- if 'authenticated' not in session:
  - Checks whether the user is logged in.
- return 'Unauthorized', 401
  - Returns a 401 error if not authenticated.
- amount = int(request.form.get('amount', 0))
  - Reads the transfer amount from the form data.
- # balance -= amount
  - Represents the state-changing action (simplified here).
- return f'Transferred {amount} units'
  - Confirms the action.

### Line-by-line explanation for Vulnerable CSRF code (continued)

- The vulnerability arises because an attacker can craft a hidden form on a malicious site that auto-submits a POST to /transfer using the victim’s browser cookies. If the victim is authenticated, an unintended transfer can occur without the user’s knowledge.

### Secure Code: CSRF token protection (Python/Flask)

```python
# secure_csrf.py
from flask import Flask, request, session, render_template_string, abort
import secrets

app = Flask(__name__)
app.secret_key = 'supersecret'

@app.route('/transfer', methods=['GET', 'POST'])
def transfer():
    if request.method == 'GET':
        # Generate a CSRF token and store it in the user session
        token = secrets.token_hex(16)
        session['csrf_token'] = token
        # Render a form that includes the CSRF token
        return render_template_string('''
            <form method="post" action="/transfer">
                <input type="hidden" name="csrf_token" value="{{ token }}">
                <input name="amount" value="100">
                <input type="submit" value="Transfer">
            </form>
        ''', token=token)

    # POST request: validate CSRF token
    token = request.form.get('csrf_token')
    if not token or token != session.get('csrf_token'):
        abort(403)

    if 'authenticated' not in session:
        return 'Unauthorized', 401

    amount = int(request.form.get('amount', 0))
    # balance -= amount
    return f'Transferred {amount} units safely (CSRF-protected)'
```

### Line-by-line explanation for Secure CSRF code

- from flask import Flask, request, session, render_template_string, abort
  - Imports necessary Flask features, including rendering templates and aborting with HTTP errors.
- import secrets
  - Imports a secure random token generator.
- app = Flask(__name__)
  - Creates a Flask app instance.
- app.secret_key = 'supersecret'
  - Sets a secret key for session management.
- @app.route('/transfer', methods=['GET', 'POST'])
  - Defines a single route that handles both showing the form and processing the transfer.
- def transfer():
  - Handler function for the endpoint.
- if request.method == 'GET':
  - If the request is to display the form.
- token = secrets.token_hex(16)
  - Generates a cryptographically secure CSRF token.
- session['csrf_token'] = token
  - Stores the token in the user’s session for later verification.
- return render_template_string(..., token=token)
  - Renders a form that includes the hidden CSRF token field.
- token = request.form.get('csrf_token')
  - On POST, reads the submitted CSRF token from the form.
- if not token or token != session.get('csrf_token'):
  - Validates the token against the one stored in the session.
- abort(403)
  - Returns a 403 Forbidden response if the token is missing or invalid.
- if 'authenticated' not in session:
  - Checks user authentication state.
- amount = int(request.form.get('amount', 0))
  - Reads the transfer amount.
- # balance -= amount
  - Represents the state-changing action (simplified).
- return f'Transferred {amount} units safely (CSRF-protected)'
  - Confirms the action after successful CSRF validation.

Why this matters in production:
- CSRF tokens prevent malicious sites from triggering state-changing requests on behalf of authenticated users.
- Combined with same-site cookies and proper session handling, CSRF resilience scales to real-world boundaries.
- Some frameworks offer built-in CSRF protection; prefer enabled, standardized solutions over ad-hoc token handling.

---

## X. Common Beginner Mistakes

Below are real-world pitfalls with bad vs. good approaches. See how small changes dramatically improve security.

- Pitfall 1: Building SQL directly from user input
  - Bad:
    - query = f"SELECT * FROM users WHERE id = {user_id}"
    - cur.execute(query)
  - Good:
    - cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
  - Why it matters: Parameter binding prevents SQL injection by treating input as data, not as SQL code.

- Pitfall 2: Displaying unescaped user input in HTML
  - Bad:
    - html = "<div>" + user_input + "</div>"
  - Good:
    - return render_template('page.html', user_input=user_input)
  - Why it matters: Unescaped content can execute scripts in the browser; templates with escaping reduce risk.

- Pitfall 3: Omitting CSRF protection on state-changing endpoints
  - Bad:
    - POST /transfer accepts data without any token verification.
  - Good:
    - POST /transfer requires a CSRF token (and uses SameSite cookies where possible).
  - Why it matters: Attackers can cause unintended actions on behalf of logged-in users.

- Pitfall 4: Relying solely on client-side validation
  - Bad:
    - Validating input with JavaScript only; server-side checks are missing.
  - Good:
    - Server-side validation, server-side escaping, and robust authentication checks.

- Pitfall 5: Trusting the browser’s Content-Type and headers
  - Bad:
    - Accepting text/html responses into JavaScript without proper sanitization.
  - Good:
    - Strict content handling, proper MIME types, and validating input/output contexts.

---

## Y. Why This Matters In Real Systems

- Security incidents are costly: data breaches can lead to fines, legal liability, downtime, and loss of customer trust.
- SQLi can expose entire databases, including passwords and PII, leading to long-term brand damage.
- XSS can compromise user sessions, steal tokens, and directly hijack accounts.
- CSRF can trigger fraudulent transactions or actions, especially in financial or enterprise apps.
- Production systems require defense-in-depth: input validation, parameterized queries, proper templating, CSRF protection, secure session handling, and defense-in-depth policies (CSP, SRI, least privilege, logging, monitoring).
- Adoption of secure coding practices early reduces remediation costs and helps meet compliance standards like PCI-DSS, GDPR, or HIPAA.

---

## Z. Study Questions

1. What is SQL Injection, and why do string-concatenated queries pose a risk?
2. How does parameterized querying mitigate SQLi, and what does the binding mechanism look like in code?
3. Differentiate between stored and reflected XSS. How do modern templates prevent both?
4. What is CSRF, and how do anti-CSRF tokens protect state-changing actions?
5. Name two additional security controls you can apply beyond code fixes to defend against these vulnerabilities in production.

---

## Exercise

Part A: Build a small Flask app that demonstrates all three vulnerabilities and their mitigations in a safe, educational environment.

1) Create a minimal Flask project with three endpoints:
   - /search?user=: Demonstrates SQLi vulnerability.
   - /comment?text=: Demonstrates XSS vulnerability.
   - /transfer (POST): Demonstrates CSRF vulnerability.

2) Implement vulnerabilities (as isolated, non-production examples) and then implement fixes:
   - SQLi: First, a vulnerable query that interpolates user input; second, a secure version using parameterized queries.
   - XSS: First, an unsafe HTML response built with string concatenation; second, a safe version using a template with escaping.
   - CSRF: First, a post endpoint without CSRF protection; second, a CSRF-protected version using a token stored in session and included in forms.

3) Provide a simple test workflow:
   - Run the app locally.
   - Visit /search?user=alice to observe the safe behavior; try a crafted input to confirm vulnerability (in a controlled learning environment only).
   - Submit a comment with a script tag in /comment?text=<script>alert('XSS')</script> and verify whether the script executes (in a safe, isolated environment) before applying the mitigation.
   - Attempt a POST to /transfer from a forged page to illustrate CSRF risk, then verify protection after implementing CSRF tokens.

Deliverables:
- A single repository (or a consolidated code snippet) containing the vulnerable and secure variants for SQLi, XSS, and CSRF.
- A short README explaining how to run the app, what to observe, and how the mitigations work.

Notes:
- For safety, do not deploy vulnerable code to any public server. Use a local environment or a sandbox.
- Focus on clear, correct usage of parameter binding, escaping, and CSRF token patterns.
- Consider adding a CSP header and SameSite cookie attribute to further strengthen production defenses.

End of lesson.