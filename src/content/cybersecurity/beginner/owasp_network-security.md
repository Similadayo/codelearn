# Phase 2 — Web Vulnerabilities: OWASP Top 10 (SQLi, XSS, CSRF)

Compelling introductory paragraph:
Web applications are a primary attack surface for modern organizations. The OWASP Top 10 highlights the most critical, prevalent web vulnerabilities that attackers weaponize to steal data, take over sessions, or perform unauthorized actions. In this module, we focus on three of the most common and impactful weaknesses: SQL Injection (SQLi), Cross-Site Scripting (XSS), and Cross-Site Request Forgery (CSRF). You will learn how these flaws arise in real code, see concrete examples in a network-security context, and practice defending them end-to-end—from secure coding patterns to production-ready mitigations. Mastery here translates to safer systems, fewer data breaches, and a stronger security posture across the software development lifecycle.

## 1. SQL Injection (SQLi)

SQL Injection happens when user-controlled input is embedded into SQL queries without proper separation from code. Attackers can alter query structure to bypass authentication, read or modify data, or even drop tables. The defense pattern is clear: never concatenate untrusted input into queries. Use parameterized queries, ORM bindings, and input validation.

### Code Block 1 — Vulnerable SQL Query (Python + sqlite3)

```python
# Vulnerable: constructs SQL by concatenating user input
import sqlite3

def vulnerable_get_user(conn, username):
    # UNSAFE: directly interpolating input into SQL
    query = "SELECT id, username, email FROM users WHERE username = '" + username + "';"
    cur = conn.cursor()
    cur.execute(query)
    return cur.fetchall()

def main():
    conn = sqlite3.connect(':memory:')
    cur = conn.cursor()
    cur.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, email TEXT)")
    cur.execute("INSERT INTO users (username, email) VALUES ('alice','alice@example.com')")
    conn.commit()

    # Example user input (in real cases this would come from an HTTP request)
    user_input = input("Username: ")
    print("Query would be:", "SELECT id, username, email FROM users WHERE username = '" + user_input + "';")

    # This will execute the vulnerable query
    print(vulnerable_get_user(conn, user_input))

if __name__ == "__main__":
    main()
```

### Code Block 2 — Secure Parameterized Query (Python + sqlite3)

```python
# Secure: uses parameterized queries to avoid injection
import sqlite3

def secure_get_user(conn, username):
    # SAFE: parameterized query; input is bound separately
    query = "SELECT id, username, email FROM users WHERE username = ?;"
    cur = conn.cursor()
    cur.execute(query, (username,))
    return cur.fetchall()

def main():
    conn = sqlite3.connect(':memory:')
    cur = conn.cursor()
    cur.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, email TEXT)")
    cur.execute("INSERT INTO users (username, email) VALUES ('alice','alice@example.com')")
    conn.commit()

    user_input = input("Username: ")
    print("Query with parameterization will fetch:")
    print(secure_get_user(conn, user_input))

if __name__ == "__main__":
    main()
```

### ### Line-by-line explanation — Code Block 1

1) import sqlite3
2) Define vulnerable_get_user(conn, username): function to fetch user
3) Build query by concatenating the string: query = "SELECT ... WHERE username = '" + username + "';"
4) Get a cursor from the connection
5) Execute the constructed query with cur.execute(query)
6) Return the fetched rows
7) In main(), create an in-memory database and users table
8) Seed the table with a user (alice)
9) Prompt for user input (simulating untrusted input)
10) Print the constructed vulnerable query for demonstration
11) Call vulnerable_get_user with the untrusted input
12) Run main() if this script is executed directly

### Line-by-line explanation — Code Block 2

1) import sqlite3
2) Define secure_get_user(conn, username): function using parameterized query
3) Set the query with a placeholder: "WHERE username = ?;"
4) Get a cursor from the connection
5) Execute the query with parameters: cur.execute(query, (username,))
6) Return the fetched rows
7) In main(), create in-memory DB and seed with alice
8) Prompt for user input (untrusted)
9) Call secure_get_user and print results
10) Run main() if executed directly

### Line-by-line explanation summary

- Code Block 1 demonstrates how straightforward string concatenation of untrusted input yields SQLi risk. The final query can be altered by crafted input.
- Code Block 2 shows the standard defense: parameterized queries/bound parameters, which keep data separate from code and prevent structural changes to the query.

## 2. Cross-Site Scripting (XSS)

XSS allows attackers to inject malicious scripts into web pages viewed by other users. The core defense is to avoid echoing untrusted data into HTML without proper escaping. Use templating engines with autoescaping, context-appropriate encoders, and content-security policies.

### Code Block 1 — Vulnerable XSS (Python + Flask, inline HTML)

```python
# Vulnerable: echoes user input directly into HTML
from flask import Flask, request
app = Flask(__name__)

@app.route('/greet')
def greet():
    name = request.args.get('name', '')
    # UNSAFE: directly injects user-controlled data into HTML
    return f"<html><body>Hello, {name}!</body></html>"

if __name__ == '__main__':
    app.run(debug=True)
```

### Code Block 2 — Secure XSS Prevention (Flask with templating)

```python
# Safe: render via template with escaping
from flask import Flask, request, render_template_string
app = Flask(__name__)

@app.route('/greet')
def greet():
    name = request.args.get('name', '')
    # SAFE: use template rendering which escapes by default
    template = "<html><body>Hello, {{ name }}</body></html>"
    return render_template_string(template, name=name)

if __name__ == '__main__':
    app.run(debug=True)
```

### ### Line-by-line explanation — Code Block 1

1) Import Flask and request
2) Create a Flask app
3) Define route /greet
4) Grab name from query parameters (untrusted)
5) Return an HTML string that includes the untrusted name directly
6) Run the app in debug mode

Line-by-line explanation — Code Block 2

1) Import Flask, request, render_template_string
2) Create a Flask app
3) Define route /greet
4) Get untrusted name from query parameters
5) Prepare a template string with a placeholder for name
6) Render the template with the name; the template engine escapes by default
7) Run the app

### Line-by-line explanation summary

- Code Block 1 demonstrates the vulnerability by embedding user input directly into HTML, enabling scripts to execute in other users’ browsers.
- Code Block 2 shows secure rendering via a templating system with automatic escaping, preventing raw HTML/script injection.

## 3. Cross-Site Request Forgery (CSRF)

CSRF tricks a user’s browser into performing unwanted actions on a site where they are authenticated. Defenses rely on tokens, SameSite cookies, and/or custom request validation. The simplest robust pattern is to use a CSRF token that a legitimate form includes and the server validates on submission.

### Code Block 1 — Vulnerable CSRF Scenario (Flask, no token)

```python
# Vulnerable: state-changing endpoint with no CSRF protection
import sqlite3
from flask import Flask, request, session
app = Flask(__name__)
app.secret_key = 'super-secret-key'

@app.route('/update_email', methods=['POST'])
def update_email():
    new_email = request.form['email']
    user_id = session.get('user_id')  # assumes user is logged in
    conn = sqlite3.connect('users.db')
    cur = conn.cursor()
    cur.execute("UPDATE users SET email = ? WHERE id = ?", (new_email, user_id))
    conn.commit()
    return "Email updated"
```

### Code Block 2 — Secure CSRF Protection (Flask + simple token)

```python
# Safe: CSRF token validation
import sqlite3
import secrets
from flask import Flask, request, session, render_template_string
app = Flask(__name__)
app.secret_key = 'super-secret-key'

def get_csrf_token():
    if 'csrf_token' not in session:
        session['csrf_token'] = secrets.token_urlsafe(16)
    return session['csrf_token']

@app.route('/update_email', methods=['GET', 'POST'])
def update_email():
    if request.method == 'GET':
        token = get_csrf_token()
        return render_template_string('''
            <form method="POST" action="/update_email">
              <input type="email" name="email" />
              <input type="hidden" name="csrf_token" value="{{ csrf_token }}">
              <button type="submit">Update Email</button>
            </form>
        ''', csrf_token=token)
    else:
        # Validate CSRF token
        if request.form.get('csrf_token') != session.get('csrf_token'):
            return "CSRF validation failed", 400
        new_email = request.form['email']
        user_id = session.get('user_id')
        conn = sqlite3.connect('users.db')
        cur = conn.cursor()
        cur.execute("UPDATE users SET email = ? WHERE id = ?", (new_email, user_id))
        conn.commit()
        return "Email updated"
```

Template (update_email.html) used by the GET path is conceptually similar to the inline template above.

### ### Line-by-line explanation — Code Block 1

1) Import sqlite3 and Flask components
2) Initialize Flask app and secret key
3) Define /update_email route with POST
4) Read new_email from form data
5) Retrieve user_id from session (authenticated user)
6) Connect to DB and create a cursor
7) Execute update with parameterized query
8) Commit changes
9) Return a simple confirmation

### Line-by-line explanation — Code Block 2

1) Import sqlite3, secrets, and Flask components
2) Helper to generate/cersist CSRF token in session
3) Route handles both GET and POST
4) GET: generate token, render a form with hidden token field
5) POST: compare submitted csrf_token with session token
6) If mismatch, reject with 400
7) If valid, perform the update securely
8) Return confirmation

### Line-by-line explanation summary

- Code Block 1 shows a straightforward state-changing action with no CSRF protection, making it vulnerable to unauthorized requests from third-party sites.
- Code Block 2 demonstrates a minimal CSRF protection approach by issuing a per-session token and validating it on POST submissions.

## X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

- Pitfall 1 — SQL Injection via string concatenation
  - Bad:
    ```python
    # Bad: concatenating user input into SQL
    username = request.args.get('username')
    query = "SELECT * FROM users WHERE username = '" + username + "';"
    cur.execute(query)
    ```
  - Good:
    ```python
    # Good: parameterized query
    username = request.args.get('username')
    query = "SELECT * FROM users WHERE username = ?;"
    cur.execute(query, (username,))
    ```

- Pitfall 2 — Reflected XSS by echoing unescaped input
  - Bad:
    ```python
    name = request.args.get('name', '')
    return "<div>Hello, " + name + "!</div>"
    ```
  - Good:
    ```python
    from flask import render_template_string
    name = request.args.get('name', '')
    template = "<div>Hello, {{ name }}</div>"
    return render_template_string(template, name=name)  # escapes by default
    ```

- Pitfall 3 — CSRF protection missing on state-changing actions
  - Bad:
    ```python
    @app.route('/transfer', methods=['POST'])
    def transfer():
        amount = request.form['amount']
        # update user balance without CSRF token
    ```
  - Good:
    ```python
    # Use CSRF token from form and validate on POST
    @app.route('/transfer', methods=['GET', 'POST'])
    def transfer():
        if request.method == 'GET':
            token = generate_csrf_token()
            return render_template('transfer.html', csrf_token=token)
        else:
            if request.form.get('csrf_token') != session.get('csrf_token'):
                abort(400)
            # proceed with transfer
    ```

- Pitfall 4 — Over-reliance on client-side validation
  - Bad:
    ```python
    user_input = request.form['username']
    if len(user_input) < 3:
        return "Too short"
    # proceed
    ```
  - Good:
    ```python
    import re
    user_input = request.form['username']
    if not re.match(r'^[A-Za-z0-9_]{3,20}$', user_input):
        return "Invalid username"
    # proceed with server-side trust boundary enforced
    ```

## Y. Why This Matters In Real Systems — production context

- Risk realities
  - SQLi can expose entire user databases, alter data, or escalate privileges.
  - XSS can steal cookies, hijack sessions, deface pages, or deploy malware through injected scripts.
  - CSRF can cause unauthorized money transfers, role changes, or data deletions, especially on sites with stateful sessions.
- Defense-in-depth
  - SQLi: always use parameterized queries or ORM abstractions; perform input validation where appropriate; apply least privilege for database accounts.
  - XSS: use template engines with autoescaping; encode data for each context (HTML, JavaScript, URL); implement Content Security Policy (CSP).
  - CSRF: implement CSRF tokens, SameSite cookies, and consider double-submission patterns; leverage modern frameworks’ built-in protections.
- Production practices
  - Code reviews focusing on input handling and query construction.
  - Automated scanning with tools like OWASP ZAP, Burp Suite, and static analysis for security hotspots.
  - Threat modeling and secure-by-default configurations (CSP, Secure flags, HTTPOnly, and proper cookie attributes).
  - Regular patching and dependency management, since many vulnerabilities arise from outdated libraries.
- Real-world implications
  - A single SQLi can give an attacker admin access, a single XSS exploit can compromise user accounts, and CSRF can enable harmful actions without user consent.
  - The combination of these weaknesses can lead to multi-stage attacks (initial foothold via XSS, followed by data exfiltration via SQLi, with CSRF enabling higher-risk actions).

## Z. Study Questions — 5 recall questions

1) What is the fundamental defense against SQL Injection and why does it work?
2) How does a templating engine help prevent XSS, and what are escaping considerations across contexts?
3) What is CSRF, and how does a CSRF token protect a state-changing request?
4) Name two production-oriented mitigations you would apply to a web app in production beyond application code changes.
5) Given the following vulnerable snippet, rewrite it to be secure:
   - Vulnerable: query = "SELECT * FROM users WHERE username = '" + input + "';"

## Exercise — multi-part coding challenge

Objective: Build a minimal, contained lab app to observe SQLi, XSS, and CSRF vulnerabilities and their mitigations. Implement in Python using Flask with a lightweight SQLite database. Work in a controlled, non-production environment.

Part A — Project setup
- Prereqs: Python 3.x, Flask installed (pip install flask), sqlite3 (builtin).
- Create a directory lab_web_vuln with:
  - lab_app.py (the main app)
  - templates/ (for HTML templates)
  - data.db (SQLite database) or an in-memory setup

Part B — Part 1: Vulnerable SQLi endpoint
- Implement a simple route /user_vuln that takes a query parameter username and builds a SQL query via string concatenation (as in Code Block 1, Section 1).
- Seed the DB with a few users (e.g., alice, bob).
- Demonstrate an input like "'; DROP TABLE users; --" and show that it could alter behavior in the vulnerable path (note: do not deploy on production; keep it in a lab).

Deliverables:
- lab_app.py containing the vulnerable route.
- A short README snippet describing how to run and verify the vulnerability locally.
- A brief test plan: what inputs to try and expected risky outcomes.

Part C — Part 2: Fixed SQL endpoint
- Add a secure counterpart /user_secure that uses parameterized queries.
- Verify both endpoints work and show that the injection payload has no destructive effect.

Deliverables:
- Updated lab_app.py with the secure endpoint.
- A small test script or curl commands showing that the injection payload fails against the secure endpoint.

Part D — Part 3: Vulnerable XSS endpoint
- Implement /greet_vuln that returns a page embedding a name parameter without escaping (Code Block 1, Section 2).
- Show how a payload like <script>alert('XSS')</script> would execute in the victim’s browser.

Deliverables:
- lab_app.py with the vulnerable XSS route.
- A sample HTML page or curl output demonstrating the vulnerability (in a controlled browser environment).

Part E — Part 4: Fixed XSS endpoint
- Implement /greet_secure that uses a templating engine with escaping (Code Block 2, Section 2).
- Ensure that the same payload renders safely as text rather than executing.

Deliverables:
- lab_app.py with the secure XSS route.
- A short test procedure to confirm no script execution occurs.

Part F — Part 5: Vulnerable CSRF scenario
- Implement a state-changing endpoint /change_email_no_csrf that updates the user email without CSRF protection (Code Block 1, Section 3).
- Explain how an attacker could exploit this via a cross-site request if a user is authenticated.

Deliverables:
- lab_app.py vulnerable CSRF route.
- Documentation on the risk scenario with an example attack flow (in a lab environment).

Part G — Part 6: CSRF token protection
- Implement a safe version /change_email_csrf that uses CSRF tokens (Code Block 2, Section 3).
- Include a simple HTML form that posts to /change_email_csrf with a hidden CSRF token and validate it on POST.

Deliverables:
- lab_app.py CSRF-protected route and HTML template.
- Explanation of how the token is generated, transmitted, and validated.

Part H — Reflection and secure patterns
- Write a one-page reflection describing:
  - What vulnerability each endpoint demonstrates
  - The mitigation strategies you applied
  - How you would integrate these patterns into CI/CD and code reviews

Submission checklist:
- lab_app.py with all routes (vuln and fix) and templates
- A README.md with setup, run instructions, and test steps
- A short test plan and a reflection

Notes and safety
- Conduct all exercises in a local, isolated environment; do not deploy vulnerable code on public servers.
- Use realistic but non-destructive seeds and payloads.
- This exercise is for learning defensive coding; always follow responsible disclosure and secure coding practices.

End of lesson.