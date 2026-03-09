# Your First Web Server with a Framework (Ruby)

Embarking on backend engineering often begins with a tiny, well-defined web service. In Ruby, a lightweight framework like Sinatra lets you spin up an HTTP server with clean routing, JSON responses, and minimal ceremony. This lesson guides you through building your first web server using Sinatra, from setup to dynamic routes, and touches on production considerations. By the end, you’ll have a runnable server, understand the request/response cycle, and know how to extend it safely in real systems.

## 1. Prerequisites and Setup

In this section you’ll set up a minimal Ruby environment and a Sinatra-based server skeleton you can run locally. You’ll learn how to declare dependencies and wire up a few basics to get an HTTP server responding.

```ruby
# Gemfile
source 'https://rubygems.org'

gem 'sinatra'
gem 'json'
```

```ruby
# app.rb
require 'sinatra'
require 'json'

set :port, 4567
set :bind, '0.0.0.0'

# Basic root route
get '/' do
  'Hello from Sinatra!'
end

# Start server if executed directly
run! if __FILE__ == $0
```

### Line-by-line explanation breaking down each line

- Gemfile: source 'https://rubygems.org' declares where gems are fetched from; gem 'sinatra' adds the Sinatra framework; gem 'json' adds JSON utilities used for APIs.
- app.rb: require 'sinatra' loads the Sinatra DSL; require 'json' loads the JSON library.
- set :port, 4567 sets the listening port to 4567.
- set :bind, '0.0.0.0' binds the server to all network interfaces, making it accessible from other machines on the network.
- get '/' do ... end defines an HTTP GET route for the root path and returns a plain string response.
- run! if __FILE__ == $0 ensures the server starts automatically when this file is run directly (ruby app.rb). It won’t auto-run if the file is required by another script or run via rackup.

## 2. Your First Route

This section focuses on the simplest possible route: responding to a GET request at the root path. You’ll see how a single route maps a URL to a Ruby block that returns a response.

```ruby
# app.rb (excerpt: minimal route)
require 'sinatra'
require 'json'

set :port, 4567
set :bind, '0.0.0.0'

get '/' do
  'Hello from Sinatra!'
end
```

### Line-by-line explanation breaking down each line

- require 'sinatra' and require 'json': load the Sinatra DSL and JSON library.
- set :port, 4567 and set :bind, '0.0.0.0': configure how the server listens.
- get '/' do ... end: define a route for GET requests to the root path.
- 'Hello from Sinatra!' return value: the HTTP response body is this string.
- The route is stateless by default; each request gets a fresh evaluation of the block.

## 3. Dynamic Routes and Parameters

Dynamic routes capture parts of the URL and expose them to your code via the params hash. This lets you tailor responses based on user input without adding query strings.

```ruby
get '/hello/:name' do
  name = params['name']
  "Hello, #{name}!"
end
```

### Line-by-line explanation breaking down each line

- get '/hello/:name' do ... end defines a route with a dynamic segment named name.
- name = params['name'] pulls the dynamic segment value from the URL (e.g., /hello/Alice yields 'Alice').
- "Hello, #{name}!" interpolates the captured value into the response string.
- Access example: GET /hello/Alice returns "Hello, Alice!".

## 4. Running the Server and Understanding Request/Response Cycle

Here you see the full server with a second route that demonstrates JSON responses. This section emphasizes how a request flows through Sinatra, how to set content types, and how to emit JSON.

```ruby
# app.rb (full example for running and JSON response)
require 'sinatra'
require 'json'

set :port, 4567
set :bind, '0.0.0.0'

get '/' do
  'Hello from Sinatra!'
end

get '/time' do
  content_type :json
  { time: Time.now, status: 'ok' }.to_json
end

# Start server if executed directly
run! if __FILE__ == $0
```

### Line-by-line explanation breaking down each line

- get '/' do ... end defines the root route as before.
- get '/time' do ... end defines a new route that returns JSON.
- content_type :json sets the HTTP Content-Type header to application/json, informing clients to treat the body as JSON.
- { time: Time.now, status: 'ok' }.to_json builds a Ruby hash and converts it to a JSON string.
- The response body is the JSON string, e.g., {"time":"2026-03-09 12:34:56 +0000","status":"ok"}.
- run! if __FILE__ == $0 ensures the server starts when you run ruby app.rb.

## 5. Common Beginner Mistakes

Pitfalls beginners often hit when building web servers with a framework. For each pitfall, you’ll see a Bad example and a Good example.

- Pitfall 1: Global mutable state across requests
  Bad:
  ```ruby
  # app.rb
  $counter = 0
  get '/visit' do
    $counter += 1
    "Visited #{$counter} times"
  end
  ```
  Good:
  ```ruby
  enable :sessions
  get '/visit' do
    session[:counter] ||= 0
    session[:counter] += 1
    "Visited #{session[:counter]} times"
  end
  ```

- Pitfall 2: Blocking long-running work inside a route
  Bad:
  ```ruby
  get '/heavy' do
    sleep 5
    "Done"
  end
  ```
  Good:
  ```ruby
  get '/heavy' do
    # Offload to a background job in a real system
    status 202
    "Accepted; processing in background"
  end
  ```

- Pitfall 3: Not handling errors or edge cases
  Bad:
  ```ruby
  get '/boom' do
    raise "boom"
  end
  ```
  Good:
  ```ruby
  get '/boom' do
    halt 500, { error: 'boom' }.to_json
  end

  error do
    'Something went wrong'
  end
  ```

- Pitfall 4: Not setting content_type for JSON responses
  Bad:
  ```ruby
  get '/whoami' do
    { name: 'Alice' }.to_json
  end
  ```
  Good:
  ```ruby
  get '/whoami' do
    content_type :json
    { name: 'Alice' }.to_json
  end
  ```

## 6. Why This Matters In Real Systems

Back-end services in production need to be reliable, observable, and scalable. Sinatra is great for lightweight services, prototyping, or microservices, but production systems require careful handling of concurrency, error handling, logging, and deployment.

- Performance and concurrency: Sinatra runs on Rack-compatible servers (like Puma, Thin, or Unicorn). Choose a server appropriate for expected traffic and use a thread-safe design.
- Observability: centralize logs, metrics, and traces. Use middleware to log requests, response times, and statuses. Instrument critical endpoints to measure latency and error rates.
- Security: sanitize inputs, avoid leaking stack traces, and enable basic protections (hidden routes, rate limiting, input validation).
- Deployment: behind a reverse proxy (Nginx/Envoy), with proper port binding, SSL/TLS termination, and health checks. Use environment variables for config (ports, timeouts) to ease deployments.
- Maintainability: prefer small, well-scoped routes, error handling, and clear JSON interfaces for APIs. As traffic grows, consider moving to Rails or a more opinionated framework, or introduce background workers for heavy tasks.

## Z. Study Questions

1. How do you define a dynamic route in Sinatra, and how do you access the dynamic segment?  
2. What does content_type :json do, and why is it important for API endpoints?  
3. How can you start the Sinatra server manually, and what does run! do?  
4. Why should you avoid long-running work directly in a request-response route, and what’s a common alternative?  
5. How would you add simple request logging to a Sinatra app without introducing external dependencies?

## Exercise

Build a small Sinatra-based API service and demonstrate end-to-end understanding with the following tasks. Use a single file app.rb.

Part A — Setup and a root endpoint
- Create a Sinatra app that listens on port 4567 and binds to 0.0.0.0.
- Implement a root route GET / that returns a friendly welcome string.

Part B — Dynamic greeting
- Add a dynamic route GET /greet/:name that returns a JSON object: { "message": "Hello, <name>!" }.
- Ensure the response is valid JSON and sets the content type accordingly.

Part C — Health endpoint with uptime
- Implement a /health route that returns JSON: { "status": "ok", "uptime_seconds": <seconds> }.
- Track server start time so uptime is calculated relative to startup.

Part D — Echo API (POST)
- Implement POST /echo that accepts a JSON body and echoes it back as the response with content_type: json.
- If the body is not valid JSON, return a JSON error message with a 400 status.

Part E — Lightweight request logger
- Add a tiny Rack middleware (SimpleLogger) that prints: [TIMESTAMP] METHOD PATH
- Ensure all requests are logged, including the root and dynamic routes.

Part F — Run and test
- Start the server with ruby app.rb.
- Test with curl:
  - curl http://localhost:4567/
  - curl http://localhost:4567/greet/YourName
  - curl -X POST -H "Content-Type: application/json" -d '{"foo": "bar"}' http://localhost:4567/echo
  - curl http://localhost:4567/health

Provide your code in a single file and include a brief note on how you tested each endpoint (what you observed, any expected vs actual outputs).