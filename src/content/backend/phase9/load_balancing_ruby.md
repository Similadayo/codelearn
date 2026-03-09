# Track: Backend Engineering — Phase 9: System Design & Scalability — Load Balancing & Horizontal Scaling (Ruby)

Compelling introductory paragraph:
Load balancing and horizontal scaling are foundational techniques for building resilient, high-traffic backend systems. A load balancer distributes incoming requests across multiple backend instances, enabling higher throughput, lower latency, and fault tolerance. Horizontal scaling adds new instances to handle growth, but it also introduces challenges around session management, cache consistency, health checks, and data access patterns. In Ruby, you can explore lightweight, educational implementations to understand the mechanics, then apply these patterns with real services (Nginx, HAProxy, AWS ELB) in production. This lesson pairs concept explanations with runnable Ruby code that demonstrates round-robin routing, health-aware balancing, sticky sessions, and stateless design patterns that scale.

## 1. 1. Load Balancing Fundamentals and Why It Matters

- What it is: A load balancer sits in front of a pool of backend servers and forwards each client request to one back-end instance according to a policy (round-robin, least connections, etc.).
- Why it matters: Enables horizontal scaling, fault tolerance, and capacity planning. Keeps services responsive during traffic spikes and during instance failures.
- Ruby mindset: Build a small, idiomatic demonstration to understand the routing logic, health checks, and the interaction with backends before you adopt production-grade external balancers.

### Code: Simple Round-Robin Balancer (conceptual)

```ruby
# tiny_round_robin.rb
# A small, thread-safe round-robin balancer for a fixed set of backends.

require 'thread'

class RoundRobinBalancer
  def initialize(backends)
    @backends = backends
    @index = 0
    @lock = Mutex.new
  end

  # Returns the next backend in a thread-safe way
  def next_backend
    @lock.synchronize do
      backend = @backends[@index]
      @index = (@index + 1) % @backends.length
      backend
    end
  end
end

BACKENDS = [
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003'
]

balancer = RoundRobinBalancer.new(BACKENDS)

# Demonstration: print the next backend for 6 requests
6.times do
  puts balancer.next_backend
end
```

### Line-by-line explanation

- require 'thread': Load Ruby's thread synchronization primitives, used for a Mutex.
- class RoundRobinBalancer: Define a simple balancer class.
- def initialize(backends): Store the backend URLs, reset the index, and create a mutex to guard state.
- @backends = backends: Keep the list of backends.
- @index = 0: Start at the first backend.
- @lock = Mutex.new: Create a mutex to ensure thread-safety when multiple threads call next_backend.
- def next_backend: Public method to fetch the next backend in a thread-safe way.
- @lock.synchronize do ... end: Ensure only one thread mutates and reads the index at a time.
- backend = @backends[@index]: Pick the current backend.
- @index = (@index + 1) % @backends.length: Increment index circularly.
- backend: Return the chosen backend.
- BACKENDS = [...]: Define three backends for testing.
- balancer = RoundRobinBalancer.new: Instantiate the balancer.
- 6.times puts balancer.next_backend: Demonstrate distribution across backends.

## 2. 2. Building a Tiny Round-Robin Load Balancer in Ruby

In production, you’d typically rely on a dedicated load balancer (Nginx, HAProxy, or a cloud load balancer). Here, we implement a minimal front-end that demonstrates the routing logic and how a front-end could pick a backend.

### Code: Tiny Round-Robin Front-end (WEBrick-based proxy skeleton)

```ruby
# load_balancer_frontend.rb
# A minimal WEBrick-based front-end that proxies requests to backends using a round-robin policy.

require 'webrick'
require 'net/http'
require 'uri'
require 'thread'

class RoundRobinBalancer
  def initialize(backends)
    @backends = backends
    @index = 0
    @lock = Mutex.new
  end

  def next_backend
    @lock.synchronize do
      backend = @backends[@index]
      @index = (@index + 1) % @backends.length
      backend
    end
  end
end

BACKENDS = [
  'http://localhost:3001',
  'http://localhost:3002'
]

balancer = RoundRobinBalancer.new(BACKENDS)

server = WEBrick::HTTPServer.new(Port: 8080)

server.mount_proc '/' do |req, res|
  backend_url = balancer.next_backend
  begin
    uri = URI.parse(backend_url)
    http = Net::HTTP.new(uri.host, uri.port)

    # Build a backend request preserving method, path, headers, and body
    path = req.path
    path += "?#{req.query_string}" if req.query_string && !req.query_string.empty?

    backend_req = case req.request_method
    when 'GET'    then Net::HTTP::Get.new(path)
    when 'POST'   then Net::HTTP::Post.new(path)
    when 'PUT'    then Net::HTTP::Put.new(path)
    when 'DELETE' then Net::HTTP::Delete.new(path)
    else Net::HTTP::GenericRequest.new(req.request_method, true, true, path)
    end

    # Copy request headers to the backend request
    req.header.each do |key, value|
      backend_req[key] = value[0]
    end

    # Copy body if present
    backend_req.body = req.body if req.body

    # Dispatch to backend
    resp = http.request(backend_req)

    # Forward response back to client
    res.status = resp.code.to_i
    resp.each_header { |h, v| res[h] = v }
    res.body = resp.body
  rescue => e
    res.status = 502
    res.body = "Bad Gateway: #{e.message}"
  end
end

trap 'INT' do server.shutdown end
server.start
```

### Line-by-line explanation

- require 'webrick', 'net/http', 'uri', 'thread': Bring in a simple HTTP server, HTTP client, URL parsing, and thread safety.
- class RoundRobinBalancer ... next_backend: Same as Section 1; maintains a thread-safe index for round-robin distribution.
- BACKENDS: List the back-end servers to forward requests to.
- WEBrick::HTTPServer.new(Port: 8080): Create a small front-end listening on port 8080.
- server.mount_proc '/': Mount a handler for all paths.
- backend_url = balancer.next_backend: Choose the next back-end for the request.
- URI.parse(backend_url), Net::HTTP.new(...): Prepare an HTTP client to communicate with the chosen back-end.
- path = req.path; path += "?#{req.query_string}": Build the path to forward, including query string if present.
- backend_req = case req.request_method ... end: Create the appropriate Net::HTTP request type preserving the original HTTP method.
- req.header.each ...: Copy all incoming headers to the backend request.
- backend_req.body = req.body if req.body: Forward the body, if any.
- resp = http.request(backend_req): Execute the request against the back-end.
- res.status, resp.each_header, res.body: Return the back-end response to the client.
- rescue => e: Catch and report any proxy errors as 502.
- trap 'INT' ... server.start: Graceful shutdown handling.

Notes:
- Run two backend servers on ports 3001 and 3002 (for example, small Ruby WEBrick servers serving “Hello from backend X”). The front-end listens on 8080 and distributes requests in a round-robin fashion.

## 3. 3. Health Checks, Sticky Sessions, and Health-Aware Routing

Production-grade load balancing relies on health checks to avoid diverting traffic to failed backends. Sticky sessions ensure a user consistently hits the same backend if required (useful for sessions without centralized session stores). The following example shows a Ruby-based front-end that:
- Periodically pings backends for health status.
- Routes requests away from unhealthy backends.
- Uses a cookie to “stick” a user to a backend.

### Code: Health-aware, sticky-session front-end (WEBrick-based proxy with health checks)

```ruby
# health_sticky_load_balancer.rb
# Health-aware load balancer with sticky sessions (LB_BACKEND cookie)

require 'webrick'
require 'net/http'
require 'uri'
require 'thread'

class RoundRobinBalancer
  def initialize
    @index = 0
    @lock = Mutex.new
  end

  def next_backend(allowed_backends)
    @lock.synchronize do
      return nil if allowed_backends.nil? || allowed_backends.empty?
      backend = allowed_backends[@index % allowed_backends.length]
      @index = (@index + 1) % allowed_backends.length
      backend
    end
  end
end

class HealthMonitor
  def initialize(backends, interval = 5)
    @backends = backends
    @interval = interval
    @statuses = Hash[backends.map { |b| [b, true] }]
    @lock = Mutex.new
  end

  def healthy_backends
    @lock.synchronize { @statuses.select { |_, ok| ok }.keys }
  end

  def start
    @thread = Thread.new do
      loop do
        @backends.each do |b|
          begin
            uri = URI.parse(b)
            res = Net::HTTP.get_response(uri.host, '/health', uri.port)
            ok = res.is_a?(Net::HTTPSuccess)
          rescue
            ok = false
          end
          @lock.synchronize { @statuses[b] = ok }
        end
        sleep @interval
      end
    end
  end

  def stop
    @thread.kill if @thread
  end
end

BACKENDS = [
  'http://localhost:3001',
  'http://localhost:3002'
]

balancer = RoundRobinBalancer.new
monitor = HealthMonitor.new(BACKENDS, 2)
monitor.start

server = WEBrick::HTTPServer.new(Port: 8080)

server.mount_proc '/' do |req, res|
  healthy = monitor.healthy_backends
  if healthy.empty?
    res.status = 503
    res.body = "Service Unavailable"
    next
  end

  # Sticky session handling via cookie
  cookie_header = req['Cookie'] || ''
  chosen_from_cookie = nil
  if cookie_header =~ /LB_BACKEND=([^;]+)/
    candidate = $1
    chosen_from_cookie = candidate if healthy.include?(candidate)
  end

  backend_next = balancer.next_backend(healthy)
  chosen = chosen_from_cookie || backend_next

  # If we chose a backend not from cookie, set a new cookie
  if chosen != chosen_from_cookie
    res['Set-Cookie'] = "LB_BACKEND=#{chosen}; Path=/; HttpOnly"
  end

  uri = URI.parse(chosen)
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = (uri.scheme == 'https')
  path = req.path
  path += "?#{req.query_string}" if req.query_string && !req.query_string.empty?

  backend_req = case req.request_method
  when 'GET'    then Net::HTTP::Get.new(path)
  when 'POST'   then Net::HTTP::Post.new(path)
  when 'PUT'    then Net::HTTP::Put.new(path)
  when 'DELETE' then Net::HTTP::Delete.new(path)
  else Net::HTTP::GenericRequest.new(req.request_method, true, true, path)
  end

  req.header.each do |k, v|
    backend_req[k] = v[0]
  end
  backend_req.body = req.body if req.body

  begin
    resp = http.request(backend_req)
    res.status = resp.code.to_i
    resp.each_header { |h, v| res[h] = v }
    res.body = resp.body
  rescue => e
    res.status = 502
    res.body = "Bad Gateway: #{e.message}"
  end
end

trap 'INT' do server.shutdown end
server.start
```

### Line-by-line explanation

- HealthMonitor: A class that periodically pings each backend's /health endpoint and stores the up/down status.
- healthy_backends: Returns the list of backends currently considered healthy.
- start: Spawns a thread that loops, hitting each backend’s /health with a timeout and updating the status map.
- RoundRobinBalancer.next_backend(allowed_backends): Chooses the next backend from the filtered healthy list in a thread-safe way.
- Sticky session logic: If a request comes with a valid LB_BACKEND cookie, it uses that backend; otherwise it selects the next healthy backend and issues a Set-Cookie header to bind the session to that backend.
- Forwarding: The request is proxied to the chosen backend, with method, path, headers, and body preserved.
- Error handling: If the backend call fails, respond with a 502 Bad Gateway.

Notes:
- You should implement a /health endpoint on each backend that returns 200 OK when healthy.
- Start two backends on 3001 and 3002 or adjust BACKENDS accordingly.
- TLS termination can be handled at the load balancer; this example focuses on routing logic.

## 4. 4. Stateless Design, Caching, and Horizontal Scaling Patterns in Ruby

Horizontal scaling is most effective when services are stateless or rely on external stores for state. Below are Ruby patterns that promote statelessness and efficient caching.

### Code: Stateless session store backed by Redis (externalize session state)

```ruby
# stateless_session_store.rb
# Demonstrates storing session state in Redis to keep app servers stateless.

require 'redis'
require 'securerandom'
require 'json'

class StatelessSessionStore
  def initialize(redis_url)
    @redis = Redis.new(url: redis_url)
  end

  def create_session(user_id, data = {})
    session_id = SecureRandom.uuid
    payload = { user_id: user_id, data: data }.to_json
    @redis.set("session:#{session_id}", payload)
    session_id
  end

  def get_session(session_id)
    raw = @redis.get("session:#{session_id}")
    JSON.parse(raw) if raw
  end

  def update_session(session_id, data)
    @redis.set("session:#{session_id}", data.to_json)
  end
end

# Example usage (drop-in for a web app):
# store = StatelessSessionStore.new("redis://localhost:6379/0")
# sid = store.create_session(42, { foo: 'bar' })
# puts store.get_session(sid)
```

### Line-by-line explanation

- require 'redis', 'securerandom', 'json': Bring in the Redis client, secure random IDs, and JSON encoding/decoding.
- class StatelessSessionStore: Encapsulates session storage in Redis to avoid per-instance in-memory state.
- def initialize(redis_url): Connect to Redis.
- def create_session(user_id, data): Create a new session with a unique ID and store metadata as JSON.
- def get_session(session_id): Retrieve and parse the session payload from Redis.
- def update_session(session_id, data): Overwrite the session payload with new data.
- Example usage: Demonstrates creating and retrieving a session. In a real web app, set a login cookie containing the session_id.

### Code: Simple cache layer for expensive operations (Redis-based)

```ruby
# simple_cache.rb
# Lightweight cache to avoid recomputing expensive results in stateless services.

require 'redis'

class SimpleCache
  def initialize(redis_url)
    @redis = Redis.new(url: redis_url)
  end

  # Fetch a value by key; if missing, compute via provided block and cache it
  def fetch(key)
    value = @redis.get(key)
    return value if value

    value = yield if block_given?
    @redis.set(key, value)
    value
  end
end

# Example usage:
# cache = SimpleCache.new("redis://localhost:6379/0")
# result = cache.fetch("user:123:profile") { compute_profile(123) }
```

### Line-by-line explanation

- require 'redis': Use Redis as a shared cache.
- class SimpleCache: A minimal cache wrapper around Redis.
- def initialize(redis_url): Connect to Redis.
- def fetch(key): Try to retrieve from Redis; if missing, yield to compute the value, store it, and return.
- value = yield if block_given?: Compute the value if the key was not in cache.
- The example usage demonstrates a typical read-through cache: compute-heavy operation results are cached for quick reuse across instances.

Notes:
- Stateless services avoid per-instance in-memory state; Redis acts as a shared state for sessions and caches.
- For production, consider cache invalidation policies (TTL / EXPIRES) and cache stampede prevention techniques.

## 5. 5. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

### Mistake 1: Global mutable state shared across workers (no thread-safety)

Bad:
```ruby
$BALANCER_INDEX = 0
def pick_next(backends)
  idx = $BALANCER_INDEX % backends.length
  $BALANCER_INDEX += 1
  backends[idx]
end
```

Good:
```ruby
class ThreadSafeBalancer
  def initialize(backends)
    @backends = backends
    @index = 0
    @lock = Mutex.new
  end

  def pick_next
    @lock.synchronize do
      backend = @backends[@index]
      @index = (@index + 1) % @backends.length
      backend
    end
  end
end
```

Why it matters: In multi-process or multi-threaded environments, global globals cause race conditions and inconsistent routing.

### Mistake 2: Blindly routing to first backend when one goes down (no health checks)

Bad:
```ruby
def pick_backend(backends)
  backends.first
end
```

Good:
```ruby
def pick_backend(healthy_backends)
  healthy = healthy_backends
  return nil if healthy.empty?
  healthy.sample
end
```

Why it matters: A backend failure should not degrade service; health checks help keep traffic away from unhealthy nodes.

### Mistake 3: Not setting timeouts on HTTP calls (risk of hanging)

Bad:
```ruby
res = Net::HTTP.get_response(uri, path)
```

Good:
```ruby
http = Net::HTTP.new(uri.host, uri.port)
http.open_timeout = 5
http.read_timeout = 10
req = Net::HTTP::Get.new(path)
resp = http.request(req)
```

Why it matters: Without timeouts, a slow backend can stall worker processes and exhaust resources.

### Mistake 4: Missing sticky-session handling when sessions must stay on the same backend

Bad:
```ruby
# Always route to next backend; no cookie-based binding
```

Good:
```ruby
# Read LB_BACKEND cookie to bind a user to a backend
cookie = (req['Cookie'] || '')
backend_for_user = nil
if cookie =~ /LB_BACKEND=([^;]+)/
  candidate = $1
  backend_for_user = candidate if healthy.include?(candidate)
end
chosen = backend_for_user || balancer.next_backend(healthy)
res['Set-Cookie'] = "LB_BACKEND=#{chosen}; Path=/; HttpOnly" unless backend_for_user
```

Why it matters: Stateful sessions (logins, shopping carts) rely on sticking to a backend to avoid session loss or extra redis lookups.

### Mistake 5: Ignoring TLS termination and X-Forwarded headers

Bad:
```ruby
# Forward HTTPS request to HTTP backends without headers
```

Good:
```ruby
backend_req['X-Forwarded-Proto'] = 'https' if req.scheme == 'https'
```

Additionally, configure the front-end to terminate TLS and pass along TLS metadata to backends if appropriate.

Why it matters: Real systems often terminate TLS at the load balancer and pass origin information to backends for proper authentication, redirects, and logging.

## 6. 6. Why This Matters In Real Systems — Production Context

- Fault tolerance: A health-aware balancer minimizes downtime by steering traffic away from unhealthy instances.
- Scalability: Horizontal scaling adds capacity by increasing the number of stateless workers. Stateless design and externalized state (Redis, caches) prevent per-instance degradation when scaling.
- Observability: Track request distribution, backend health, and cache hit rates to tune autoscaling and capacity planning.
- Compliance and security: TLS termination at the balancer reduces certificate management on each app server; forward headers like X-Forwarded-For enable accurate client IP accounting, rate limiting, and audit trails.
- Real-world patterns: Use established tools (Nginx/Haproxy for LB, Kubernetes Ingress, AWS ELB/ALB) in front of application servers, while retaining the Ruby-driven experiments for intuition and teaching.

## 7. 7. Study Questions — 5 Recall Questions

1. What is the primary difference between a round-robin load balancer and a health-aware load balancer?
2. Why is stateless design important when horizontally scaling a web service?
3. How can you implement sticky sessions in a Ruby-based proxy, and what is a potential risk?
4. What role does an external cache like Redis play in horizontal scaling?
5. Name two TLS-related considerations when placing a load balancer in front of your Ruby apps.

## 8. 8. Exercise — Practical multi-part coding challenge

Part A: Set up two tiny Ruby backends
- Create two small WEBrick servers running on ports 3001 and 3002.
- Each backend responds with a distinct message (e.g., "Backend 1" and "Backend 2") and implements a /health endpoint returning 200 OK when ready.
- Verify both backends are healthy using curl.

Part B: Implement a minimal Ruby front-end load balancer
- Use the load_balancer_frontend.rb from Section 2.
- Extend it to optionally enable a health check (pulls /health), skipping unhealthy backends.
- Demonstrate a Round-Robin distribution across healthy backends by curling the front-end at localhost:8080.

Part C: Add health checks and sticky sessions
- Use the health_sticky_load_balancer.rb from Section 3.
- Start two backends with /health endpoints responding OK.
- Start the front-end and observe:
  - Requests are distributed to healthy backends.
  - A cookie LB_BACKEND ties a client to a backend for subsequent requests.
  - If one backend goes down, traffic flows to the remaining healthy backend.

Part D: Stateless pattern with Redis (optional for deeper realism)
- Implement a simple Redis-backed session store as in stateless_session_store.rb.
- Demonstrate creating a session and retrieving it later using a session_id.
- Explain why the application server instances remain stateless.

Part E: Discussion and scaling plan
- Given a traffic spike, outline how you would scale out using:
  - A cloud load balancer in front of a pool of Ruby application servers.
  - External session and cache stores (Redis, Memcached) to keep application servers stateless.
  - Health checks and autoscaling policies to maintain SLOs.

Notes for running code locally:
- Ruby 3.x recommended.
- You can install WEBrick (comes with Ruby standard library) and Redis (external service).
- Start backends first, then the front-end. For TLS, consider using a reverse proxy that terminates TLS in front of the front-end for simplicity in local experiments.

If you’d like, I can provide a ready-to-run docker-compose.yml that wires together two tiny Ruby backends, a WEBrick-based front-end, and a Redis container to demonstrate the full workflow end-to-end.