# Phase 4: Building Web Servers — Middleware: Logging, CORS, and Request Pipeline (Ruby)

Compelling introductory paragraph: Middleware is the heartbeat of a scalable Ruby web server. In Rack-based stacks, middleware components intercept HTTP requests and responses to perform cross-cutting concerns like logging, security, and request shaping without cluttering business logic. Mastering logging, CORS, and the request pipeline gives you observable, secure, and flexible services that can operate across multiple endpoints and teams in production.

## 1. Logging Middleware — Observability at the Edge

Code example: a minimal Rack-compatible LoggingMiddleware that emits structured JSON logs for each request, including method, path, status, and duration.

```ruby
# logging_middleware.rb
require 'json'
require 'rack'

class LoggingMiddleware
  def initialize(app)
    @app = app
  end

  def call(env)
    req = Rack::Request.new(env)
    start = Time.now
    status, headers, body = @app.call(env)
    duration_ms = ((Time.now - start) * 1000).round(2)

    log = {
      time: Time.now.utc.iso8601,
      method: req.request_method,
      path: req.fullpath,
      status: status,
      duration_ms: duration_ms
    }

    puts log.to_json
    [status, headers, body]
  end
end
```

### Line-by-line explanation
1) require 'json' – Enables converting Ruby objects to JSON for structured logs.  
2) require 'rack' – Access to Rack utilities like Rack::Request.  
3) class LoggingMiddleware – Defines a Rack middleware from which the app chain will derive.  
4) def initialize(app) – Stores the downstream app in @app.  
5) def call(env) – Entry point Rack calls for every request; env carries the request data.  
6) req = Rack::Request.new(env) – Wraps env for easy access to request data (method, path, etc.).  
7) start = Time.now – Capture the request start time for latency measurement.  
8) status, headers, body = @app.call(env) – Forward the request to the next middleware/app in the stack and capture the response.  
9) duration_ms = ((Time.now - start) * 1000).round(2) – Compute elapsed time in milliseconds.  
10) log = { ... } – Build a structured log entry with timestamp, method, path, status, and duration.  
11) puts log.to_json – Emit the log as a JSON line suitable for log aggregators.  
12) [status, headers, body] – Return the downstream response unchanged.

## 2. CORS Middleware — Secure, Flexible Cross-Origin Requests

Code example: a small Rack-compatible CORSMiddleware that conditionally handles preflight OPTIONS requests and injects appropriate Access-Control headers for allowed origins.

```ruby
# cors_middleware.rb
class CORSMiddleware
  DEFAULT_ORIGINS = ['http://localhost:3000', 'https://example.com'].freeze

  def initialize(app, allowed_origins: DEFAULT_ORIGINS,
                 allowed_methods: %w[GET POST PUT PATCH DELETE OPTIONS],
                 allowed_headers: %w[Origin Content-Type Accept Authorization])
    @app = app
    @allowed_origins = allowed_origins
    @allowed_methods = allowed_methods
    @allowed_headers = allowed_headers
  end

  def call(env)
    req = Rack::Request.new(env)
    origin = req.get_header('HTTP_ORIGIN')

    # Handle CORS preflight (OPTIONS) requests early
    if req.request_method == 'OPTIONS'
      if origin && @allowed_origins.include?(origin)
        headers = {
          'Access-Control-Allow-Origin' => origin,
          'Access-Control-Allow-Methods' => @allowed_methods.join(', '),
          'Access-Control-Allow-Headers' => @allowed_headers.join(', '),
          'Access-Control-Max-Age' => '86400',
          'Vary' => 'Origin'
        }
        return [204, headers, []]
      else
        return [403, { 'Content-Type' => 'text/plain' }, ['CORS origin not allowed']]
      end
    end

    # For actual requests, pass through and attach CORS headers when origin is allowed
    status, headers, body = @app.call(env)
    if origin && @allowed_origins.include?(origin)
      headers['Access-Control-Allow-Origin'] = origin
      headers['Vary'] = 'Origin'
      headers['Access-Control-Allow-Methods'] = @allowed_methods.join(', ')
      headers['Access-Control-Allow-Headers'] = @allowed_headers.join(', ')
    end
    [status, headers, body]
  end
end
```

### Line-by-line explanation
1) class CORSMiddleware – Defines a Rack middleware to manage CORS policies.  
2) DEFAULT_ORIGINS – A safe default origin list; can be overridden per app.  
3) def initialize(app, allowed_origins:, allowed_methods:, allowed_headers:) – Stores configuration and downstream app.  
4) def call(env) – Entry point invoked for each request.  
5) req = Rack::Request.new(env) – Convenience wrapper for request data.  
6) origin = req.get_header('HTTP_ORIGIN') – Extracts the Origin header if present.  
7) if req.request_method == 'OPTIONS' – Checks for a preflight request.  
8) if origin && @allowed_origins.include?(origin) – Valid origin allows preflight.  
9) headers = { ... } – Build appropriate CORS headers for preflight response.  
10) return [204, headers, []] – Responds with No Content for preflight.  
11) else return [403, ...] – Deny disallowed origins on preflight.  
12) status, headers, body = @app.call(env) – Forward non-preflight requests.  
13) if origin && @allowed_origins.include?(origin) – Apply CORS headers when origin is allowed.  
14) headers[...] = ... – Attach Access-Control-Allow-Origin, Methods, and Headers.  
15) [status, headers, body] – Return the final response.

## 3. Building the Request Pipeline (Rack::Builder) — Composition and Order

Code example: composing a small Rack pipeline with the LoggingMiddleware, CORSMiddleware, and a simple HelloApp using Rack::Builder. This shows how middleware order affects behavior, logging visibility, and how to host a small web service.

```ruby
# app_pipeline.rb
require 'rack'
# Simple downstream app
class HelloApp
  def call(_env)
    [200, { 'Content-Type' => 'text/plain' }, ["Hello from Ruby Rack pipeline"]]
  end
end

# Ensure the middlewares are defined (LoggingMiddleware and CORSMiddleware)
# If defined in separate files, require_relative them here:
# require_relative './logging_middleware'
# require_relative './cors_middleware'

stack = Rack::Builder.new do
  # Logging should wrap the request as early as possible
  use LoggingMiddleware
  # CORS should apply on every request and also handle preflights
  use CORSMiddleware, allowed_origins: ['http://localhost:3000', 'https://example.com']
  run HelloApp.new
end

# You can run with: Rack::Handler::WEBrick.run stack, Port: 9292
```

Line-by-line explanation
1) require 'rack' – Load Rack to construct the middleware stack.  
2) class HelloApp – Minimal downstream app that responds with a plain text message.  
3) def call(_env) – The app receives the Rack environment and returns a Rack-compatible response.  
4) [200, { 'Content-Type' => 'text/plain' }, ["Hello..."]] – The successful HTTP response payload.  
5) stack = Rack::Builder.new do ... end – Create a middleware stack container.  
6) use LoggingMiddleware – Insert the logging component so it wraps the downstream app first.  
7) use CORSMiddleware, allowed_origins: [...] – Insert CORS handling for allowed origins.  
8) run HelloApp.new – Define the final application to which the pipeline forwards after middleware.  
9) # You can run with: Rack::Handler::WEBrick.run stack, Port: 9292 – Optional command to host the stack directly.

Optional config for rackup (config.ru style)
# config.ru
require_relative './logging_middleware'
require_relative './cors_middleware'
require_relative './app_pipeline' # or HelloApp directly

use LoggingMiddleware
use CORSMiddleware, allowed_origins: ['http://localhost:3000']
run HelloApp.new

Line-by-line explanation
1) require_relative './logging_middleware' – Load the logging middleware implementation.  
2) require_relative './cors_middleware' – Load the CORS middleware implementation.  
3) require_relative './app_pipeline' – Load the app/pipeline to expose the stack.  
4) use LoggingMiddleware – Push the logging at the outer edge of the stack.  
5) use CORSMiddleware, allowed_origins: [...] – Apply CORS policy to all requests.  
6) run HelloApp.new – Run the final application inside the configured pipeline.

## X. Common Beginner Mistakes — 3+ real pitfalls (Bad vs Good)

- Pitfall 1: Logging mutates or exhausts the response body
  - Bad
  ```ruby
  def call(env)
    status, headers, body = @app.call(env)
    body.each { |chunk| puts chunk }  # Exhausts the body, breaking streaming
    [status, headers, body]
  end
  ```
  - Good
  ```ruby
  require 'logger'
  LOGGER = Logger.new(STDOUT)

  def call(env)
    start = Time.now
    status, headers, body = @app.call(env)
    duration = Time.now - start
    LOGGER.info("Request #{env['REQUEST_METHOD']} #{env['PATH_INFO']} -> #{status} (#{(duration * 1000).round(2)}ms)")
    [status, headers, body]
  end
  ```

- Pitfall 2: CORS policy too permissive or misapplied
  - Bad
  ```ruby
  def call(env)
    status, headers, body = @app.call(env)
    headers['Access-Control-Allow-Origin'] = '*'
    [status, headers, body]
  end
  ```
  - Good
  ```ruby
  def call(env)
    req = Rack::Request.new(env)
    origin = req.get_header('HTTP_ORIGIN')
    status, headers, body = @app.call(env)

    if origin && ['http://localhost:3000', 'https://myapp.com'].include?(origin)
      headers['Access-Control-Allow-Origin'] = origin
      headers['Vary'] = 'Origin'
      headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
      headers['Access-Control-Allow-Headers'] = 'Origin, Content-Type, Accept, Authorization'
    end

    [status, headers, body]
  end
  ```

- Pitfall 3: Not handling preflight OPTIONS requests (or doing it after the downstream app)
  - Bad
  ```ruby
  def call(env)
    @app.call(env)  # Preflight never short-circuits; OPTIONS may reach business logic
  end
  ```
  - Good
  ```ruby
  def call(env)
    req = Rack::Request.new(env)
    if req.request_method == 'OPTIONS'
      origin = req.get_header('HTTP_ORIGIN')
      if origin
        return [204, {
          'Access-Control-Allow-Origin' => origin,
          'Access-Control-Allow-Methods' => 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers' => 'Origin, Content-Type, Accept'
        }, []]
      end
    end
    @app.call(env)
  end
  ```

- Pitfall 4: Logger not thread-safe in multi-threaded servers
  - Bad
  ```ruby
  def call(env)
    puts "Request: #{env['REQUEST_METHOD']} #{env['PATH_INFO']}"
    @app.call(env)
  end
  ```
  - Good
  ```ruby
  require 'logger'
  LOGGER = Logger.new(STDOUT)

  def call(env)
    LOGGER.info("Request: #{env['REQUEST_METHOD']} #{env['PATH_INFO']}")
    @app.call(env)
  end
  ```

## Y. Why This Matters In Real Systems — Production Context and Real Usage

- Observability and traceability: Centralized, structured logs (JSON), enriched with timestamps, request IDs, and duration help operators diagnose latency, errors, and bottlenecks in microservices.
- Security and correctness: CORS policies prevent unauthorized cross-origin calls; preflight handling ensures browsers can negotiate permissions without leaking sensitive data.
- Performance considerations: Middleware ordering matters; logging and CORS should be lightweight and non-blocking. Use asynchronous logging or dedicated log collectors in high-throughput systems.
- Reliability and maintainability: Stateless middleware per request simplifies horizontal scaling. Use a thread-safe logger, avoid mutating response bodies, and keep middleware idempotent.
- Operational practices: Instrumentation around request IDs for correlation, standardized log formats, and consistent middleware interfaces make it easier to integrate with monitoring, tracing, and incident response workflows.

## Z. Study Questions — 5 Recall Questions

1) What is Rack in Ruby, and how does middleware fit into its model?  
2) How does a preflight (OPTIONS) request differ from a normal GET/POST request in a CORS workflow?  
3) Why is it important not to exhaust the response body in a logging middleware?  
4) What header is commonly added to responses to indicate how requests from various origins should be handled?  
5) How can you compose multiple middleware components into a single runnable web server in Ruby?

## Exercise — Practical multi-part coding challenge

Part A — Implement a small set of middlewares
- Implement a simple LoggingMiddleware (if not already implemented in your project) that logs method, path, status, and duration in JSON format (as shown in the 1. section).
- Implement a CORS middleware that only allows origins from a whitelist (e.g., http://localhost:3000 and https://yourdomain.com) and handles preflight OPTIONS requests correctly.

Part B — Build a Rack-based web service
- Create a tiny downstream app (HelloApp) that returns 200 with a plain text body.
- Compose the pipeline using Rack::Builder in a single file (e.g., app_pipeline.rb) with this order: LoggingMiddleware -> CORSMiddleware -> HelloApp.
- Run the stack with a Rack server (WEBrick or Puma) on port 9292.

Part C — Verify behavior locally
- Start the server and send a curl request from a whitelisted origin using a script-friendly command or via curl with the Origin header:
  - curl -i -H "Origin: http://localhost:3000" http://localhost:9292/
  - Observe the Access-Control-Allow-Origin header and the logged JSON line in the console.
- Send a preflight request:
  - curl -i -X OPTIONS -H "Origin: http://localhost:3000" -H "Access-Control-Request-Method: POST" http://localhost:9292/
  - Confirm you receive a 204 response with the appropriate CORS headers and no response body.

Part D — Optional extension
- Add a RequestIDMiddleware that creates a unique request ID for each incoming request (e.g., using SecureRandom.uuid) and attaches it to env['HTTP_X_REQUEST_ID'] and the response header 'X-Request-ID'. Thread-safely log the request ID in your LoggingMiddleware.
- Update your log format to include the request ID.

Notes for instructors
- Emphasize the importance of middleware order and the separation of concerns: logging should be non-intrusive, CORS should only affect HTTP headers and preflight handling, and the final application logic remains clean and testable.
- Encourage students to run under a multi-threaded server to observe concurrency considerations (e.g., thread-safe logging).
- Suggest integrating structured logging and log aggregation endpoints in a real project (e.g., JSON logs shipped to Elasticsearch or a hosted service).

This lesson covers: building and wiring logging and CORS concerns as Rack middleware, understanding the request pipeline, common pitfalls, and applying these concepts in real Ruby web servers.