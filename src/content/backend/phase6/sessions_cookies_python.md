# Track: Backend Engineering — Phase 6: Authentication & Security — Sessions & Cookies (Stateful Auth)

Compelling introductory paragraph:
Stateful sessions back a robust authentication story by keeping user state server-side and tying it to a browser via a session cookie. This approach gives you control over session lifetime, revocation, and fine-grained access control, which is critical in enterprise environments, multi-service architectures, and systems requiring strict auditability. Unlike stateless JWTs that pass data to every request, stateful sessions centralize trust, facilitate revocation, and simplify role-based access decisions—but they require careful design around session storage, cookie security, and deployment in scalable environments. This lesson walks you through implementing server-side sessions in Python, with security-conscious cookie handling, CSRF considerations, and production-ready patterns.

## 1. Conceptual Foundations: Stateful Sessions with Cookies

A stateful session stores session data on the server and only the session identifier (session_id) is kept in a browser cookie. Each request presents the cookie, the server looks up the session data, and uses it to authorize actions. This separation allows you to revoke sessions, rotate identifiers on login, and centralize user state across multiple frontend clients or services.

Code snippet (conceptual):
```python
# Conceptual: server issues a session_id cookie; client returns it on subsequent requests
def make_set_cookie_header(session_id: str) -> str:
    # HttpOnly prevents JavaScript access; Secure requires HTTPS; SameSite mitigates CSRF
    return f"session_id={session_id}; HttpOnly; Secure; SameSite=Lax"
```

### Line-by-line explanation
- def make_set_cookie_header(session_id: str) -> str: Defines a tiny function to render a Set-Cookie header string for a given session_id.
- return f"session_id={session_id}; HttpOnly; Secure; SameSite=Lax": Builds the cookie string with flags:
  - HttpOnly to prevent access from client-side scripts.
  - Secure to ensure cookies are only sent over HTTPS.
  - SameSite=Lax to reduce cross-site request forgery while preserving typical navigation usability.

## 2. Building a Minimal Stateful Session Manager in Flask

This section demonstrates a small Flask app that implements server-side sessions with an in-memory store and a client cookie holding the session_id. In production, replace the in-memory store with Redis, a database, or your chosen session backend.

Code (app.py):
```python
from flask import Flask, request, jsonify
import time
import uuid

app = Flask(__name__)

# In-memory session store: sid -> { user_id, expires_at }
SESSIONS = {}
SESSION_TTL = 3600  # 1 hour
SESSION_COOKIE = 'session_id'

def create_session(user_id: int) -> str:
    sid = str(uuid.uuid4())
    SESSIONS[sid] = {
        'user_id': user_id,
        'expires_at': time.time() + SESSION_TTL
    }
    return sid

def get_session(sid: str):
    if not sid:
        return None
    sess = SESSIONS.get(sid)
    if not sess:
        return None
    if sess['expires_at'] < time.time():
        # Session expired; clean up
        SESSIONS.pop(sid, None)
        return None
    return sess

@app.post('/login')
def login():
    data = request.get_json(silent=True) or {}
    username = data.get('username')
    password = data.get('password')

    # Very naive credential check for demonstration
    if username == 'alice' and password == 'secret':
        # Optional: rotate any existing session for this client
        old_sid = request.cookies.get(SESSION_COOKIE)
        if old_sid:
            SESSIONS.pop(old_sid, None)

        sid = create_session(user_id=1)
        resp = jsonify({'message': 'logged in'})
        resp.set_cookie(
            SESSION_COOKIE,
            sid,
            httponly=True,
            secure=True,      # Set to True in production behind TLS
            samesite='Lax'      # Balance CSRF protection with usability
        )
        return resp

    return jsonify({'error': 'invalid credentials'}), 401

@app.get('/protected')
def protected():
    sid = request.cookies.get(SESSION_COOKIE)
    sess = get_session(sid)
    if not sess:
        return jsonify({'error': 'unauthorized'}), 401
    return jsonify({'message': f'Hello user {sess["user_id"]}'})

@app.post('/logout')
def logout():
    sid = request.cookies.get(SESSION_COOKIE)
    if sid:
        SESSIONS.pop(sid, None)
    resp = jsonify({'message': 'logged out'})
    resp.set_cookie(SESSION_COOKIE, '', expires=0)
    return resp

if __name__ == '__main__':
    app.run(debug=True)
```

### Line-by-line explanation
- from flask import Flask, request, jsonify: Import core Flask components for routing and responses.
- import time, uuid: Time for TTL handling and UUIDs for session IDs.
- app = Flask(__name__): Create a Flask application instance.
- SESSIONS = {}: In-memory dictionary to map session_id to session data.
- SESSION_TTL = 3600: Time-to-live for sessions in seconds.
- SESSION_COOKIE = 'session_id': Name of the cookie to hold the session identifier.
- def create_session(user_id: int) -> str: Generates a new session_id and stores metadata.
- sid = str(uuid.uuid4()): Create a unique session identifier.
- SESSIONS[sid] = { … }: Persist user_id and expiry timestamp in the store.
- return sid: Return the new session_id to the caller.
- def get_session(sid: str): Retrieves and validates a session, removing expired ones.
- if not sid: return None: Handle missing cookie.
- if not sess: return None: Handle missing session in store.
- if sess['expires_at'] < time.time(): …: Expire and clean up old sessions.
- @app.post('/login'): Login endpoint to authenticate and create a session.
- data = request.get_json(silent=True) or {}: Read login payload.
- if username == 'alice' and password == 'secret':: Simple credential check (replace in real apps).
- old_sid = request.cookies.get(SESSION_COOKIE): Read existing session if present.
- if old_sid: SESSIONS.pop(old_sid, None): Rotate/clear older session if you want to enforce one session per user.
- sid = create_session(user_id=1): Create a new server-side session.
- resp = jsonify({'message': 'logged in'}): Build response payload.
- resp.set_cookie(SESSION_COOKIE, sid, httponly=True, secure=True, samesite='Lax'): Set the session cookie with security flags.
- @app.get('/protected'): Protected endpoint that requires a valid session.
- sid = request.cookies.get(SESSION_COOKIE); sess = get_session(sid): Retrieve and validate session.
- return jsonify({'message': f'Hello user {sess["user_id"]}'}): Return a success message if authorized.
- @app.post('/logout'): Logout endpoint to invalidate the session and clear the cookie.
- if sid: SESSIONS.pop(sid, None): Remove the session from the server.
- resp.set_cookie(SESSION_COOKIE, '', expires=0): Clear the cookie on the client.
- if __name__ == '__main__': app.run(debug=True): Run the Flask app in debug mode for development.

## 3. Security Enhancements: Cookie Flags, CSRF, and Session Rotation

Security-conscious defaults are essential for real-world apps. This section shows how to rotate session IDs on login to prevent session fixation, apply robust cookie attributes, and introduce CSRF protection tokens for state-changing operations.

Code (enhanced security, staying with Flask; add to app.py or a new snippet):
```python
from flask import Flask, request, jsonify
import time, uuid, secrets

app = Flask(__name__)

SESSIONS = {}
SESSION_TTL = 3600
SESSION_COOKIE = 'session_id'

def create_session(user_id: int) -> tuple:
    sid = str(uuid.uuid4())
    csrf_token = secrets.token_hex(16)
    SESSIONS[sid] = {
        'user_id': user_id,
        'expires_at': time.time() + SESSION_TTL,
        'csrf_token': csrf_token
    }
    return sid, csrf_token

def get_session(sid: str):
    if not sid:
        return None
    sess = SESSIONS.get(sid)
    if not sess:
        return None
    if sess['expires_at'] < time.time():
        SESSIONS.pop(sid, None)
        return None
    return sess

@app.post('/login')
def login():
    data = request.get_json(silent=True) or {}
    username = data.get('username')
    password = data.get('password')

    if username == 'alice' and password == 'secret':
        # Rotate any existing session to mitigate fixation
        old_sid = request.cookies.get(SESSION_COOKIE)
        if old_sid:
            SESSIONS.pop(old_sid, None)

        sid, csrf = create_session(user_id=1)
        resp = jsonify({'message': 'logged in', 'csrf_token': csrf})
        resp.set_cookie(SESSION_COOKIE, sid, httponly=True, secure=True, samesite='Lax')
        return resp
    return jsonify({'error': 'invalid credentials'}), 401

@app.get('/csrf-token')
def csrf_token():
    sid = request.cookies.get(SESSION_COOKIE)
    sess = get_session(sid)
    if not sess:
        return jsonify({'error': 'unauthorized'}), 401
    return jsonify({'csrf_token': sess['csrf_token']})

@app.post('/update')
def update():
    sid = request.cookies.get(SESSION_COOKIE)
    sess = get_session(sid)
    if not sess:
        return jsonify({'error': 'unauthorized'}), 401

    token = request.headers.get('X-CSRF-Token')
    if not token or token != sess['csrf_token']:
        return jsonify({'error': 'invalid_csrf'}), 403

    # perform a state-changing operation here
    return jsonify({'status': 'updated'})
```

### Line-by-line explanation
- from flask import ..., import secrets: Import Flask utilities and secrets generator for CSRF tokens.
- create_session(user_id: int) -> tuple: Returns both session_id and a fresh CSRF token.
- csrf_token = secrets.token_hex(16): Generate a cryptographically strong CSRF token.
- SESSIONS[sid] = { ..., 'csrf_token': csrf_token }: Store CSRF token with the session.
- In /login: Rotate any existing session on login by removing old_sid if present.
- resp.set_cookie(..., samesite='Lax'): Use SameSite=Lax alongside HttpOnly and Secure for CSRF-friendly behavior.
- @app.get('/csrf-token'): Endpoint to fetch the CSRF token for the current session (useful for SPA).
- In /update: Validate CSRF token from X-CSRF-Token header before performing state-changing logic.

## 4. Production Readiness: Redis-backed Sessions (Scaling Across Processes)

In production, in-memory stores don't survive across worker processes or pods. A Redis-backed session store provides a centralized, distributed store with TTL support and fast access. Below is a compact example showing how to swap the in-memory store for Redis while keeping the same API surface.

Code (requirements: install redis and redis-py):
```python
import json, time, uuid
from secrets import token_hex
from flask import Flask, request, jsonify
import redis

app = Flask(__name__)

# Redis-backed session store
r = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)

SESSION_TTL = 3600
SESSION_COOKIE = 'session_id'

def create_session(user_id: int) -> tuple:
    sid = str(uuid.uuid4())
    csrf = token_hex(16)
    payload = {
        'user_id': user_id,
        'expires_at': int(time.time()) + SESSION_TTL,
        'csrf_token': csrf
    }
    r.setex(f'session:{sid}', SESSION_TTL, json.dumps(payload))
    return sid, csrf

def get_session(sid: str):
    if not sid:
        return None
    raw = r.get(f'session:{sid}')
    if not raw:
        return None
    sess = json.loads(raw)
    if sess['expires_at'] < int(time.time()):
        r.delete(f'session:{sid}')
        return None
    return sess

def destroy_session(sid: str):
    r.delete(f'session:{sid}')

@app.post('/login')
def login():
    data = request.get_json(silent=True) or {}
    username = data.get('username')
    password = data.get('password')
    if username == 'alice' and password == 'secret':
        old_sid = request.cookies.get(SESSION_COOKIE)
        if old_sid:
            destroy_session(old_sid)
        sid, csrf = create_session(user_id=1)
        resp = jsonify({'message': 'logged in', 'csrf_token': csrf})
        resp.set_cookie(SESSION_COOKIE, sid, httponly=True, secure=True, samesite='Lax')
        return resp
    return jsonify({'error': 'invalid credentials'}), 401

@app.get('/protected')
def protected():
    sid = request.cookies.get(SESSION_COOKIE)
    sess = get_session(sid)
    if not sess:
        return jsonify({'error': 'unauthorized'}), 401
    return jsonify({'message': f'Hello user {sess["user_id"]}'})

@app.post('/logout')
def logout():
    sid = request.cookies.get(SESSION_COOKIE)
    if sid:
        destroy_session(sid)
    resp = jsonify({'message': 'logged out'})
    resp.set_cookie(SESSION_COOKIE, '', expires=0)
    return resp

@app.get('/csrf-token')
def csrf_token():
    sid = request.cookies.get(SESSION_COOKIE)
    sess = get_session(sid)
    if not sess:
        return jsonify({'error': 'unauthorized'}), 401
    return jsonify({'csrf_token': sess['csrf_token']})

if __name__ == '__main__':
    app.run(debug=True)
```

### Line-by-line explanation
- import redis: Bring in Redis client to talk to the Redis server.
- r = redis.Redis(...): Create a Redis client connection pool; use decode_responses=True for simple JSON handling.
- create_session(user_id: int): Generate a distributed session_id and a CSRF token, and serialize the payload to Redis with a TTL.
- r.setex(f'session:{sid}', SESSION_TTL, json.dumps(payload)): Persist the session as a Redis key with expiration.
- get_session(sid: str): Retrieve and deserialize the session; check TTL via expires_at and delete if expired.
- destroy_session(sid): Delete the session key from Redis to revoke access.
- The Flask routes mirror the in-memory version but operate against Redis, enabling multi-process/host deployments.

## X. Common Beginner Mistakes

1) Bad: Storing sensitive user data in the client cookie (server-independent state)
Bad code:
```python
# BAD: storing full session data in the cookie
@app.post('/login')
def login():
    # after authentication
    response = jsonify({'user_id': 1, 'roles': ['admin'], 'exp': time.time() + 3600})
    response.set_cookie('session', json.dumps({'user_id': 1, 'roles': ['admin']}))
    return response
```
Good code:
```python
# GOOD: store only a session_id in cookie; keep state server-side
@app.post('/login')
def login():
    sid = create_session(user_id=1)  # stores data on the server
    resp = jsonify({'message': 'logged in'})
    resp.set_cookie('session_id', sid, httponly=True, secure=True, samesite='Lax')
    return resp
```

2) Bad: Reusing the same session_id on every login (session fixation)
Bad code:
```python
@app.post('/login')
def login():
    sid = request.cookies.get('session_id') or 'fixed-id'
    # authenticate and reuse sid
    return jsonify({'message': 'logged in'}).set_cookie('session_id', sid)
```
Good code:
```python
# On successful login, rotate to a new session_id
sid = str(uuid.uuid4())
# store new session and set new cookie; optionally invalidate old session
```

3) Bad: Not using HttpOnly/Secure/SameSite flags
Bad code:
```python
resp.set_cookie('session_id', sid)  # no flags
```
Good code:
```python
resp.set_cookie('session_id', sid, httponly=True, secure=True, samesite='Lax')
```

4) Bad: Omitting CSRF protection for state-changing endpoints
Bad code:
```python
@app.post('/update')
def update():
    # perform update without CSRF
    return {'status': 'updated'}
```
Good code:
```python
# CSRF token per session; require token in header for mutating actions
def verify_csrf(sid, token):
    sess = get_session(sid)
    return sess and token == sess['csrf_token']

@app.post('/update')
def update():
    sid = request.cookies.get('session_id')
    token = request.headers.get('X-CSRF-Token')
    if not verify_csrf(sid, token):
        return jsonify({'error': 'invalid_csrf'}), 403
    return jsonify({'status': 'updated'})
```

5) Bad: Storing sessions only in memory for non-trivial apps
Bad code (single-process store):
```python
# SESSIONS dict in a single Flask worker
SESSIONS = {}
```
Good code:
```python
# Use Redis or a proper database-backed store for distributed apps
import redis
r = redis.Redis(...)
```

## Y. Why This Matters In Real Systems

- Scalability: Stateful sessions require a shared store when you run multiple app servers or containers. Redis, Memcached, or a database lets all workers share the same session state.
- Reliability and Revocation: You can revoke a session (log out all devices, suspicious activity) since the session data lives on the server, not in the client.
- Security: Server-side sessions allow tighter control over TTLs, rotation policies on login, and safer handling of sensitive user state. Cookies should be HttpOnly, Secure, and SameSite appropriately configured to mitigate XSS and CSRF risks.
- Observability and Auditing: Centralized session storage provides audit trails and easier integration with monitoring, anomaly detection, and incident response.
- Compatibility with Services: Stateful sessions support complex authorization flows, per-user session constraints, and API gateway patterns where services reference a single source of truth for user state.

## Z. Study Questions

1) What is the main difference between stateful sessions and stateless tokens in terms of where user state lives?
2) Why is rotating the session_id on login important for security?
3) What cookie attributes should you set to mitigate common web security risks, and why?
4) How does CSRF protection interact with stateful sessions, and how would you expose a CSRF token to a SPA?
5) What changes would you make to move from an in-memory session store to a production-ready Redis-backed store?

## Exercise

Part A — Build a minimal Flask app with server-side sessions (in-memory)
1) Create a Flask app with:
- /login: accepts username/password, validates (hard-coded for the exercise), creates a new session_id, stores session data server-side, and returns a Set-Cookie with the session_id (HttpOnly, Secure, SameSite=Lax).
- /protected: requires a valid session; returns a greeting with the user_id.
- /logout: invalidates the session and clears the cookie.

2) Add a /csrf-token endpoint to serve a per-session CSRF token, and require this token to mutate data via a /update endpoint (via X-CSRF-Token header).

3) Ensure the session store expires entries after TTL and that expired sessions are cleaned up.

Part B — Extend to Redis-backed sessions
1) Replace the in-memory store with Redis:
- Use Redis to store serialized session data with a TTL.
- Ensure the same public API remains (/login, /protected, /logout, /csrf-token, /update).
2) Validate that multiple app instances share the same session state via Redis.

Part C — Security review
1) Verify and adjust cookie flags (HttpOnly, Secure, SameSite).
2) Implement optional session rotation on login (invalidate previous session_id if present).
3) Demonstrate a simple login/logout flow with a short TTL (e.g., 15 minutes) and a separate refresh-like flow if you want to simulate extended sessions (optional).

Deliverables:
- A runnable Flask app (single file or modular) that passes curl/httpie tests for login, protected, csrf-token, update (with valid CSRF), and logout.
- A README snippet detailing how to run the app locally (including starting Redis if using Redis), and a brief security checklist.

Note: In a real production environment, you would separate concerns (routing, services, config), add proper error handling, input validation, and unit tests. The exercise above focuses on the core concepts of stateful sessions, cookie security, and CSRF considerations in Python backend services.