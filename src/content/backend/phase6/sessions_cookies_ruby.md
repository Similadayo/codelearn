# Phase 6 — Authentication & Security: Sessions & Cookies (Stateful Auth) — Ruby

Stateful authentication uses server-side session storage paired with a client-side session cookie. The cookie acts as a key that identifies the user’s session on the server, allowing the server to store and retrieve per-user data securely. This approach provides straightforward control over session lifetimes, invalidation, and user state, but requires careful handling of storage, regeneration, and cookie attributes to keep systems secure and scalable.

## 1. State-driven Auth: How Sessions and Cookies Work Together

In a stateful flow, the client holds a session cookie (often named something like rack.session or session_id). The server stores all user-specific state in a session store keyed by that cookie. On each request, the server reads the cookie, looks up the session data, and responds accordingly. This separation lets you invalidate sessions, rotate session IDs on login, and control expiration without embedding credentials in every response.

```ruby
# Minimal conceptual Rack snippet showing session access
class ConceptDemo
  def call(env)
    req = Rack::Request.new(env)
    res = Rack::Response.new
    session = req.session

    if req.path == '/whoami'
      user = session['username']
      res.write "Current user: #{user || 'guest'}"
    else
      res.write "Hello. Try /whoami to see session state."
    end

    res.finish
  end
end
```

### Line-by-line explanation

1. require 'rack' — loads the Rack library to run a minimal web app.
2. class ConceptDemo — defines a small Rack-compatible app.
3. def call(env) — Rack calls this method for every request.
4. req = Rack::Request.new(env) — wrap the environment in a request helper.
5. res = Rack::Response.new — build a response object.
6. session = req.session — access the per-request session hash.
7. if req.path == '/whoami' — simple route check.
8. user = session['username'] — read username from the session store.
9. res.write "Current user: ..." — respond with current user or guest.
10. else … end — default response path.
11. res.finish — finalize and return the HTTP response.
12. end — end of class.
13. end — end of file.

Notes:
- This is a conceptual illustration. In real apps you’ll implement login/logout flows, protected routes, and storage setup (see Rack::Session::Pool or Rails cookies/serverside stores).

## 2. Implementing Stateful Sessions in Ruby: Rack::Session::Pool (Server-side State)

Stateful auth often uses a server-side session store. Rack::Session::Pool keeps all session data on the server and stores only a session identifier in the client cookie. This reduces exposure of sensitive data in client cookies and makes it easier to invalidate sessions.

This example shows a complete, runnable Rack app with a login flow, server-side sessions, and a protected route. It uses bcrypt to hash passwords and demonstrates regenerating the session on login to prevent session fixation.

Code Block A: Stateful Rack app with server-side sessions (Rack::Session::Pool)

```ruby
require 'rack'
require 'bcrypt'

# In-memory user store with hashed passwords
USERS = {
  'alice' => BCrypt::Password.create('password123'),
  'bob'   => BCrypt::Password.create('secret456')
}

class StatefulAuthApp
  def call(env)
    req = Rack::Request.new(env)
    res = Rack::Response.new
    session = req.session

    case req.path
    when '/'
      if session['username']
        res.write "Hello, #{session['username']}! <a href='/logout'>Logout</a>"
        res.write "<br><a href='/secret'>Secret Area</a>"
      else
        res.write "Welcome! Please <a href='/login'>login</a>."
      end
    when '/login'
      if req.post?
        username = req.params['username']
        password = req.params['password']
        digest = USERS[username]
        if digest && (BCrypt::Password.new(digest) == password)
          # Persist login state in server-side session
          session['user_id'] = username
          session['username'] = username
          # Regenerate session id to prevent fixation
          req.session.options[:renew] = true
          res.redirect('/')
        else
          res.write "Invalid credentials. <a href='/login'>Try again</a>"
        end
      else
        res.write %(
          <form method="post" action="/login">
            <label>Username: <input name="username"></label><br/>
            <label>Password: <input type="password" name="password"></label><br/>
            <input type="submit" value="Login">
          </form>
        )
      end
    when '/logout'
      session.clear
      res.redirect('/')
    when '/secret'
      if session['username']
        res.write "Secret data for #{session['username']}"
      else
        res.redirect('/login')
      end
    else
      res.status = 404
      res.write "Not Found"
    end

    res.finish
  end
end

# Run the app on port 8080
Rack::Handler::WEBrick.run StatefulAuthApp.new, Port: 8080
```

Code Block B (configuring the Rack middleware with secure cookie attributes)

```ruby
# config.ru
require './app'  # assumes StatefulAuthApp is defined in app.rb

# Configure the session middleware to use server-side pool store
use Rack::Session::Pool,
  key: 'my_app.session',
  expire_after: 3600,   # 1 hour
  secure: true,          # only send cookies over HTTPS (in production)
  http_only: true,       # JS cannot access the cookie
  same_site: :lax

run StatefulAuthApp.new
```

### Line-by-line explanation (Code Block A)

1. require 'bcrypt' — includes password hashing/utilities for secure credentials.
2. USERS = { ... } — an in-memory user store with hashed passwords for demonstration.
3. class StatefulAuthApp — defines a Rack-compatible app handling routes.
4. def call(env) — Rack calls this method for incoming requests.
5. req = Rack::Request.new(env) — access request details.
6. res = Rack::Response.new — prepare a response.
7. session = req.session — access the session hash stored on the server.
8. case req.path — route dispatch based on path.
9. when '/': root route logic; shows login state.
10. if session['username'] — user is logged in; greet, offer links.
11. else — show a login link.
12. when '/login': login route handler.
13. if req.post? — process login form submission.
14. username = req.params['username']; password = req.params['password'] — extract credentials.
15. digest = USERS[username] — fetch stored hash for the user.
16. if digest && (BCrypt::Password.new(digest) == password) — verify password.
17. session['user_id'] = username; session['username'] = username — store login state in the server-side session.
18. req.session.options[:renew] = true — regenerate session id to prevent fixation.
19. res.redirect('/') — go back to home after login.
20. else — invalid credentials path.
21. res.write "Invalid credentials..." — show error message.
22. else — render login form when visiting /login via GET.
23. res.write %(<form ...>...</form>) — HTML login form.
24. when '/logout' — logout path.
25. session.clear — clear session data.
26. res.redirect('/') — redirect to home.
27. when '/secret' — protected route.
28. if session['username'] — user is authenticated; show secret data.
29. else — redirect to login if not authenticated.
30. else — 404 Not Found for unknown routes.
31. res.finish — finalize the response.
32. end — end of call method.
33. end — end of class.
34. Rack::Handler::WEBrick.run ... — start the server.

### Line-by-line explanation (Code Block B)

1. require './app' — load the app class from app.rb.
2. use Rack::Session::Pool, ... — install server-side session store through Pool.
3. key: 'my_app.session' — cookie name that stores the session key.
4. expire_after: 3600 — session lifetime in seconds (1 hour).
5. secure: true — require HTTPS; use only in production.
6. http_only: true — prevent JavaScript access to the cookie.
7. same_site: :lax — mitigate CSRF by constraining cross-site requests.
8. run StatefulAuthApp.new — start the app.

## 3. Security Patterns for Stateful Sessions

Stateful sessions require extra care to prevent common attacks and to scale safely. Key patterns include:

- Regenerate session IDs on login or privilege-elevation to prevent session fixation.
- Use secure, HttpOnly, and SameSite cookies to reduce risks of theft via XSS or cross-site requests.
- Implement CSRF protection for state-changing requests (e.g., form submissions).
- Consider a server-side, distributed session store (Redis, Memcached) for horizontal scaling.
- Enforce reasonable session expiration and idle timeouts; allow explicit logout.
- Use TLS everywhere to protect session cookies in transit.
- Rotate session secrets and invalidate sessions after password changes or suspicious activity.

Illustrative snippet: regenerating the session on login (already shown in Code Block A, line where req.session.options[:renew] = true). You can supplement with a separate CSRF token pattern:

```ruby
# CSRF token generation (insert in login form rendering)
session['csrf_token'] ||= SecureRandom.hex(32)

# In the login form render
res.write %(
  <input type="hidden" name="csrf_token" value="#{session['csrf_token']}">
)

# On POST, validate CSRF
if req.post? && req.params['csrf_token'] == session['csrf_token']
  # proceed with authentication
else
  res.status = 403
  res.write "CSRF check failed"
end
```

Note: In a real app, integrate CSRF protection with your framework’s helpers (Rails has built-in CSRF tokens, for example).

## X. Common Beginner Mistakes

Pitfalls developers often encounter when building stateful sessions. Bad vs good examples are shown side-by-side.

- Pitfall 1: Storing plaintext passwords in the session
  - Bad
    ```ruby
    # Bad: storing sensitive password in session
    session['password'] = password
    ```
  - Good
    ```ruby
    # Good: store only user identity; never password
    session['user_id'] = user.id
    session['username'] = user.username
    ```

- Pitfall 2: Not regenerating session ID on login (session fixation risk)
  - Bad
    ```ruby
    # Bad: no session rotation
    session['user_id'] = user.id
    ```
  - Good
    ```ruby
    # Good: rotate session on login to avoid fixation
    req.session.options[:renew] = true
    session['user_id'] = user.id
    ```

- Pitfall 3: Missing CSRF protection on state-changing requests
  - Bad
    ```ruby
    # Bad: form submission without CSRF token
    <form action="/update" method="post">
      <!-- fields -->
    </form>
    ```
  - Good
    ```ruby
    # Good: include CSRF token and verify on server
    session['csrf_token'] ||= SecureRandom.hex(32)
    <input type="hidden" name="csrf_token" value="#{session['csrf_token']}">
    # Server: verify req.params['csrf_token'] == session['csrf_token']
    ```

- Pitfall 4: Relying on insecure or absent cookie attributes
  - Bad
    ```ruby
    use Rack::Session::Pool  # defaults: may be http_only and secure missing in prod
    ```
  - Good
    ```ruby
    use Rack::Session::Pool,
      key: 'my_app.session',
      expire_after: 3600,
      secure: true,
      http_only: true,
      same_site: :lax
    ```

- Pitfall 5: Not expiring or invalidating sessions when users log out or change credentials
  - Bad
    ```ruby
    # No explicit logout or invalidation
    session['user_id'] = nil
    ```
  - Good
    ```ruby
    # Proper logout
    session.clear
    ```

## Y. Why This Matters In Real Systems

- Security: Stateful sessions rely on cookies and a server-side session store. If the session store is compromised, or if session cookies are stolen, attackers can impersonate users. Use TLS, HttpOnly, and SameSite cookies, and rotate session IDs on login.
- Scalability: In-memory session stores (per-process) won’t scale horizontally. Use distributed stores like Redis or Memcached, and share the same session store across app instances.
- Compliance and Auditability: Sessions allow you to invalidate specific user sessions (e.g., on password change or device logout) without forcing all users to re-authenticate.
- Maintainability: Centralized session management makes it easier to implement features like multi-factor prompts, administrative logout, and session analytics.
- Real-world integration: Most Rails and Sinatra apps rely on server-side sessions or database-backed stores, with careful attention to cookie security and session lifetimes. Stateless tokens (JWT) are an alternative, but those require different handling for revocation and rotation.

## Z. Study Questions

1) What is the role of the session cookie in a stateful authentication flow?  
2) Why is regenerating the session ID on login important? What attack does it mitigate?  
3) Name three cookie attributes that help protect a session cookie in transit and on the client.  
4) How can you invalidate a user’s remaining sessions after a password change?  
5) How do server-side sessions differ from stateless tokens (e.g., JWT) in terms of revocation and storage?

## Exercise

Complete and expand a small Rack-based authentication app that uses server-side sessions to protect resources. This exercise is split into parts to reinforce the concepts learned above.

Part 1 — Build a minimal Rack app with server-side sessions
- Create exercise_app.rb that implements a login page, a protected dashboard, and a logout route using Rack::Session::Pool (or a similar server-side store).
- Use a hashed password store (bcrypt) and store only user_id and username in the session.
- Regenerate the session on login to prevent session fixation.
- Run using rackup or a simple Rack handler.

Part 2 — Add a protected route and session expiration
- Add a /dashboard route that is accessible only when the user is logged in.
- Configure the session to expire after 15 minutes of inactivity (or 1 hour as you prefer) and automatically prompt re-authentication after expiration.
- On each request, check last_seen timestamp in the session; if expired, clear the session and redirect to /login.

Part 3 — Implement CSRF protection for state-changing requests
- Generate a CSRF token per session and include it as a hidden field on the login form (and any other POST form).
- Validate the CSRF token on POST requests; reject with 403 if invalid.

Part 4 — Improve security posture for production
- Show how to wire config.ru for secure cookies: HttpOnly, Secure, SameSite, and a reasonable expire_after.
- Outline how you would switch to a distributed session store (e.g., Redis) for horizontal scaling and what changes would be needed to your app code.

Deliverables:
- A runnable exercise_app.rb implementing Parts 1–3.
- A config.ru snippet configuring Rack::Session::Pool with secure cookie attributes (Part 4 guidance).
- Brief README-style instructions on how to run the app locally (Ruby, Bundler, and Rack gems required).

Notes:
- You can keep the in-memory user store for the exercise, but clearly mark where in production you would replace it with a real user store (database) and a robust password hashing strategy.
- If you use Rails or Sinatra in your environment, adapt the concepts accordingly (the core ideas: session storage, secure cookies, session rotation, CSRF protection, and proper invalidation).