# Security — SQLi, XSS, CSRF & Rate Limiting

In backend engineering, defending against common web vulnerabilities is foundational. This lesson focuses on Ruby-backed systems and covers four critical areas: SQL Injection (SQLi) prevention with parameterized queries, preventing Cross-Site Scripting (XSS) by escaping output, protecting against Cross-Site Request Forgery (CSRF) with tokens, and implementing rate limiting to throttle abuse. You’ll see concrete Ruby examples, explanations, and practical strategies you can apply to real systems.

## 1. SQL Injection (SQLi) Prevention in Ruby

SQLi occurs when user input is interpolated directly into SQL queries, allowing attackers to alter the query and potentially access or corrupt data. The safe pattern is to use parameterized queries or an ORM that binds parameters properly.

### Bad: vulnerable to SQLi via string interpolation
```ruby
# Bad: interpolates user input directly into SQL
def find_user_by_username_bad(username)
  sql = "SELECT * FROM users WHERE username = '#{username}'"
  DB.execute(sql)
end
```

### Good: ActiveRecord-style parameter binding
```ruby
# Good: ActiveRecord auto-binds parameters safely
def find_user_by_username_active_record(username)
  User.find_by(username: username)
end
```

### Good: Sequel-style positional binding
```ruby
# Good: Sequel-style bound query
def find_user_by_username_sequel(username)
  DB["SELECT * FROM users WHERE username = ?", username].first
end
```

### Good: Pure parameter binding with a generic DB interface
```ruby
# Good: generic binding (example with DB.execute supporting placeholders)
def find_user_by_username_param_bound(username)
  DB.execute("SELECT * FROM users WHERE username = ?", [username])
end
```

### Line-by-line explanation
- Bad example:
  - Line 3 defines a function that takes a username.
  - Line 4 builds SQL by embedding the username directly, which can contain quotes or SQL code.
  - Line 5 executes the unsafe SQL, enabling injection.
- Good ActiveRecord example:
  - Line 1 defines a function.
  - Line 2 uses User.find_by with a hash, which binds the username safely.
- Good Sequel example:
  - Line 1 defines a function.
  - Line 2 uses a bound SQL string with a placeholder, and passes the username as a separate parameter.
  - Line 3 fetches the first result safely.
- Generic bound example:
  - Line 1 defines a function.
  - Line 2 executes a parameterized query with a separate parameter array, preventing injection.

## 2. Preventing XSS (Cross-Site Scripting) in Ruby

XSS happens when user-supplied content is rendered into HTML without escaping, allowing attackers to inject scripts or malicious HTML. Proper escaping of dynamic content guards user-facing pages.

### Unsafe: rendering user input without escaping
```ruby
# Unsafe rendering in a plain string (not a template)
def render_comment_unsafe(comment)
  "<div>#{comment}</div>"
end
```

### Safe: HTML-escape user content before rendering
```ruby
require 'erb' # standard library for escaping

def render_comment_safe(comment)
  "<div>#{ERB::Util.html_escape(comment)}</div>"
end
```

### Rails-style escape in templates
```erb
<!-- In a Rails view template -->
<div><%= h(comment) %></div> <!-- h is alias for html_escape in Rails -->
```

### Line-by-line explanation
- Unsafe example:
  - Line 2 defines a function that returns a string containing user content directly embedded.
  - Line 3 builds an HTML string with the raw comment, allowing HTML/script injection.
- Safe example:
  - Line 1 requires ERB utilities for escaping.
  - Line 3 escapes the comment content before interpolating into HTML.
- Rails template example:
  - The template uses a helper (h) to escape the comment, ensuring safe HTML output.

## 3. Protecting Against CSRF (Cross-Site Request Forgery)

CSRF tricks a user’s browser into making unwanted actions on a site where the user is authenticated. The standard defense is to use a per-session CSRF token included in forms and validated on state-changing requests.

### Token generation and embedding in forms (Rack-like example)
```ruby
require 'securerandom'

# Simple session-backed CSRF token
def generate_csrf_token(session)
  session[:csrf_token] ||= SecureRandom.hex(32)
  session[:csrf_token]
end

# In a form (ERB-like template)
# <input type="hidden" name="csrf_token" value="<%= session[:csrf_token] %>">
```

### Server-side token validation on POST
```ruby
def valid_csrf_token?(params, session)
  return false if params['csrf_token'].nil? || session[:csrf_token].nil?
  Rack::Utils.secure_compare(params['csrf_token'], session[:csrf_token])
end

# Example usage in a POST handler
def handle_post_request(params, session)
  unless valid_csrf_token?(params, session)
    return [403, { 'Content-Type' => 'text/plain' }, ['CSRF token mismatch']]
  end
  # Process the request safely
  [200, { 'Content-Type' => 'text/plain' }, ['Success']]
end
```

### Line-by-line explanation
- Token generation:
  - Line 2 defines a function that ensures a CSRF token exists in the session.
  - Line 3 sets a new random token if none exists.
  - Line 4 returns the token for embedding in forms.
- Embedding in forms:
  - This snippet shows where to place the hidden input in the HTML form (not a code line, but part of the form template).
- Validation:
  - Line 4 checks that both the token parameter and session token exist.
  - Line 5 uses a constant-time comparison to prevent timing attacks.
- POST handler:
  - If the token is invalid, return a 403 response; otherwise proceed.

## 4. Rate Limiting to Throttle Abuse

Rate limiting prevents abuse such as credential stuffing, brute-force attacks, or excessive API usage. Implement it per IP with a rolling window or token bucket. In production, Redis is a common back-end to store counters with expiration; in-memory approaches are simpler for learning.

### In-memory per-IP rate limiter (simple, volatile)
```ruby
class RateLimiter
  def initialize(limit, window_seconds)
    @limit = limit
    @window = window_seconds
    @calls = Hash.new { |h, k| h[k] = [] } # ip => [timestamps...]
  end

  def allowed?(ip)
    now = Time.now.to_i
    timestamps = @calls[ip]
    # Drop timestamps outside the window
    timestamps.delete_if { |t| t <= now - @window }
    if timestamps.length < @limit
      timestamps << now
      true
    else
      false
    end
  end
end

# Usage
# limiter = RateLimiter.new(100, 60) # 100 requests per 60 seconds per IP
```

### Redis-backed rate limiter (production-ready)
```ruby
# Requires the 'redis' gem and a Redis client
class RedisRateLimiter
  def initialize(limit, window_seconds, redis)
    @limit = limit
    @window = window_seconds
    @redis = redis
  end

  def allowed?(ip)
    key = "rl:#{ip}"
    count = @redis.incr(key)
    if count == 1
      @redis.expire(key, @window)
    end
    count <= @limit
  end
end
```

### Line-by-line explanation
- In-memory limiter:
  - Lines 1-3 define a RateLimiter with a limit and a rolling window.
  - Line 4 initializes an internal structure to track per-IP request times.
  - In allowed?(ip), lines 6-9 purge old timestamps outside the window.
  - Lines 10-16 check the current count, append a new timestamp if under the limit, and return true; otherwise return false.
- Redis limiter:
  - Lines 1-4 initialize a Redis-backed limiter.
  - Lines 7-13 increment a per-IP counter, set an expiration on first use, and compare the count to the limit.

## 5. Why This Matters In Real Systems

- Security posture and risk management: SQLi, XSS, CSRF, and abuse through rate limiting are among the most common web vulnerabilities. Addressing them reduces breach probability and protects user data.
- Production considerations:
  - Parameterized queries are faster than ad-hoc escaping and reduce risk even if you later switch databases.
  - Output escaping is essential for rendering dynamic content safely across all templates.
  - CSRF protection protects authenticated state-changing actions, especially in forms and API endpoints.
  - Rate limiting helps defend against brute-force login attempts and API abuse, while balancing user experience.
- Trade-offs:
  - Performance overhead from escaping and token verification should be measured; use efficient libraries and, where appropriate, caching.
  - False positives in rate limiting can frustrate legitimate users; design sensible thresholds and provide clear error messaging.
- Real-world practice:
  - Integrate these checks into middleware, services, and templates, not in isolated scripts.
  - Use comprehensive tests (unit, integration) to verify defense mechanisms and edge cases.
  - Monitor security events and rate-limiting metrics to tune thresholds and respond to evolving threats.

## 6. Study Questions

1) What is SQL injection, and how do parameterized queries prevent it? Give a Ruby example of a safe query.

2) Name two Ruby approaches to escaping HTML output in user-visible content. How do you apply them in practice?

3) How does a CSRF token protect a form submission, and where should the token be stored and validated?

4) What is rate limiting, and why is it important for security and reliability? How can Redis help implement rate limiting at scale?

5) Describe the difference between a naive in-memory rate limiter and a Redis-backed rate limiter. What are the trade-offs?

## 7. Exercise

Goal: Build a small tutorial-ready Ruby module that demonstrates end-to-end defense against SQLi, XSS, CSRF, and basic rate limiting.

Part A — Safe SQL Query
- Create a Ruby script that simulates a small in-memory user store (array of hashes or a simple in-memory DB).
- Implement a function safe_find_user(username) that uses parameter binding rather than string interpolation to locate a user by username.
- Verify that input containing quotes or SQL-like syntax does not alter the search behavior.

Part B — HTML Escaping in Rendering
- Implement a function render_user_bio(bio) that returns a snippet of HTML containing the bio.
- Show two versions: unsafe (concatenates directly) and safe (escapes HTML using ERB::Util.html_escape).

Part C — CSRF Token Demo
- Create a tiny session-like hash and a CSRF token generator (per-session token).
- Build a mock HTML form that includes a hidden input for the CSRF token.
- Implement a check_csrf(params, session) function and demonstrate a successful and a failed POST submission.

Part D — Minimal Rate Limiter
- Implement both an in-memory RateLimiter (per IP) and a Redis-backed RedisRateLimiter.
- Simulate 5 requests from the same IP within a short window and show that the in-memory limiter enforces the limit.
- If you have Redis available, demonstrate Redis-backed limiter behavior as well.

Deliverables:
- A single Ruby file (or a small set of files) containing the modules/classes for SQL safe query, HTML escaping, CSRF protection, and rate limiting.
- A short README-like section in the code comments explaining how to run the exercise and how to extend it for your stack (Rails, Sinatra, or a plain Rack app).

Note: The exercise is designed to be runnable in a local Ruby environment with minimal dependencies. You can start with plain Ruby and gradually wire it into a Sinatra/Rails-like flow if you want to see end-to-end behavior in a web framework.