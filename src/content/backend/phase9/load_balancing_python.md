# Track: Backend Engineering — Phase 9: System Design & Scalability — Load Balancing & Horizontal Scaling (Python)

Load balancing and horizontal scaling are foundational techniques for building reliable, scalable backend systems. A well-designed load balancer distributes client requests across multiple backend instances, preventing any single node from becoming a bottleneck. Horizontal scaling follows the principle of adding more identical, stateless instances to handle rising demand. In this lesson, we’ll explore concepts, write Python code to illustrate patterns, and discuss real-world considerations that show up in production systems.

## 1. Load Balancing Fundamentals

A load balancer sits in front of a pool of backend nodes and forwards incoming requests to one of them. The simplest strategy is Round Robin, where requests are distributed evenly in sequence. This section provides a minimal Python-based example you can run locally to understand how a forwarder can proxy requests to multiple backends.

```python
# 1. Simple Round-Robin Load Balancer (Python, asyncio with aiohttp)
from aiohttp import web, ClientSession
import asyncio

# Backends to balance across (must be running HTTP servers)
BACKENDS = [
    'http://127.0.0.1:5001',
    'http://127.0.0.1:5002',
    'http://127.0.0.1:5003',
]

async def proxy(request):
    app = request.app

    # Pick the next backend in a round-robin fashion
    idx = app['index'] % len(BACKENDS)
    backend = BACKENDS[idx]
    app['index'] = idx + 1

    method = request.method
    path = request.rel_url  # includes query string
    url = backend + str(path)

    # Forward headers, excluding Host to avoid host header conflicts
    headers = {k: v for k, v in request.headers.items() if k.lower() != 'host'}

    # Forward the request body (possible large payloads; for demo we read all)
    body = await request.read()

    # Use a single shared session for efficiency
    async with app['client'].request(method, url, headers=headers, data=body) as resp:
        resp_body = await resp.read()

        # Build response back to the client
        response = web.Response(body=resp_body, status=resp.status)
        # Copy status headers from backend
        for k, v in resp.headers.items():
            response.headers[k] = v
        return response

async def create_app():
    app = web.Application()
    app['index'] = 0
    app['client'] = ClientSession()

    # Catch all paths and forward to backends
    app.router.add_route('*', '/{path:.*}', proxy)

    # Ensure the client session closes on shutdown
    async def on_shutdown(app):
        await app['client'].close()
    app.on_shutdown.append(on_shutdown)

    return app

# Run the asyncio web app (listening on port 8080)
web.run_app(create_app(), port=8080)
```

### Line-by-line explanation
- Imports aiohttp web framework and asyncio for async I/O.
- BACKENDS defines the downstream servers to balance across.
- proxy(request): main handler that forwards requests to a chosen backend.
- app['index'] tracks the next backend index for Round Robin.
- idx selects the backend using a modulo operation.
- backend is the chosen URL for this request.
- path captures the request path and query string to pass through.
- url builds the full target URL.
- headers strips the Host header to avoid forwarding client host information.
- body reads the full incoming request payload (note: this is straightforward for learning; streaming is better for large payloads).
- The outgoing request uses a single shared ClientSession stored in app['client'] for efficiency.
- The backend response body and status are read and returned to the client, preserving status.
- Line-by-line explanation: The create_app function initializes the app, the index counter, and a persistent HTTP client session; it registers a catch-all route and ensures the client session closes on shutdown.
- web.run_app(create_app(), port=8080) starts the event loop and serves the LB on port 8080.

## 2. Health Checks, Readiness Probes, and Backend Monitoring

Production load balancers rely on health checks to remove unhealthy backends from the pool. A backend should expose at least a liveness endpoint (healthz) and a readiness endpoint (ready). The load balancer should prefer healthy backends and gracefully degrade if all backends become unhealthy.

```python
# 2. Backend services with health/readiness endpoints (Flask-like example)
from flask import Flask, jsonify
import time
import random

app = Flask(__name__)
start_time = time.time()
HEALTHY = True

@app.route('/healthz')
def healthz():
    # Liveness probe: always report UP if the process is alive
    return jsonify(status='UP', uptime=int(time.time() - start_time))

@app.route('/ready')
def ready():
    # Readiness probe: simulate dependency checks (e.g., DB, cache)
    # In a real service, replace with actual dependency checks
    ready = HEALTHY and random.random() > 0.1
    return jsonify(ready=ready)

@app.route('/data')
def data():
    return jsonify({'data': 'sample'})

if __name__ == '__main__':
    app.run(port=5001)
```

```python
# 2b. Health monitor (pseudo integration with the Python LB)
# This snippet shows how a real LB might monitor health across backends.
# It is not a full integration but illustrates the concept.

import asyncio
from aiohttp import ClientSession, ClientTimeout
BACKENDS = [
    'http://127.0.0.1:5001',
    'http://127.0.0.1:5002',
    'http://127.0.0.1:5003',
]

async def health_loop(app):
    session = ClientSession()
    timeout = ClientTimeout(total=2)
    app['health'] = {b: False for b in BACKENDS}
    try:
        while True:
            for b in BACKENDS:
                try:
                    resp = await session.get(b + '/healthz', timeout=timeout)
                    healthy = resp.status == 200
                    if healthy:
                        js = await resp.json()
                        healthy = js.get('status') == 'UP'
                    app['health'][b] = healthy
                except Exception:
                    app['health'][b] = False
            await asyncio.sleep(5)
    finally:
        await session.close()

# In your create_app(), you would schedule:
# app['health_task'] = asyncio.create_task(health_loop(app))
```

### Line-by-line explanation
- The Flask-based backend exposes:
  - /healthz for liveness checks.
  - /ready for readiness checks that reflect dependency readiness.
  - /data as a sample application endpoint.
- healthz returns a simple UP status and uptime.
- ready simulates a readiness decision; in production, replace with actual dependency checks.
- The optional health monitor snippet shows how a Python-based LB could poll each backend’s healthz endpoint, update a health map, and use that information to influence routing decisions.
- ClientSession with a 2-second timeout ensures fast failure if a backend is unresponsive.

## 3. Statelessness and Externalized State for Horizontal Scaling

Horizontal scaling is straightforward when services are stateless. Any per-request state should be stored externally (e.g., in a distributed cache or database) so any instance can handle any request. This section demonstrates a tiny stateless microservice that stores and retrieves data from Redis, illustrating how external state enables true scale-out.

```python
# 3. Stateless microservice with Redis (Python/Flask)
import os
import json
from flask import Flask, request, jsonify
import redis

REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')
r = redis.Redis.from_url(REDIS_URL)

app = Flask(__name__)

@app.route('/store', methods=['POST'])
def store():
    payload = request.get_json(force=True)
    key = payload.get('key')
    value = payload.get('value')
    if not key:
        return jsonify({'error': 'key required'}), 400
    r.set(key, json.dumps(value))
    return jsonify({'ok': True, 'key': key})

@app.route('/get/<key>')
def get(key):
    val = r.get(key)
    if val is None:
        return jsonify({'error': 'not found'}), 404
    try:
        src = json.loads(val)
    except Exception:
        src = val.decode()
    return jsonify({'key': key, 'value': src})

if __name__ == '__main__':
    app.run(port=5001)
```

```python
# Notes on statelessness
# - The Redis store is external; any instance can handle '/store'/'get' calls.
# - Avoid per-instance in-memory caches for data that must be visible across all instances.
# - If you must cache, use a distributed cache (e.g., Redis, Memcached) with TTLs.
```

### Line-by-line explanation
- Imports: os for envs, json for encoding, Flask for web server, Redis client for external state.
- REDIS_URL reads a configurable Redis connection string.
- r is a Redis client created from URL, enabling distributed state storage.
- /store endpoint accepts a JSON payload with a key and a value; it validates input and stores the value in Redis as JSON.
- /get/<key> retrieves a value by key from Redis; if found, it attempts to decode JSON; otherwise returns a 404.
- The service is started on port 5001 to be used by the load balancer.

## 4. Auto-Scaling Concepts and a Simple Script

Horizontal scaling depends on dynamic demand. A typical auto-scaler monitors metrics (e.g., requests per second, latency, queue length) and adjusts the number of running instances accordingly. This section presents a small demonstration script that models simple auto-scaling decisions and prints scaling actions. In real systems, you’d integrate with container orchestration APIs (Kubernetes, ECS) or cloud autoscalers.

```python
# 4. Simple autoscaler logic (simulation)
import random
import time

MIN_INSTANCES = 2
MAX_INSTANCES = 10

class AutoScaler:
    def __init__(self, min_i, max_i):
        self.min_i = min_i
        self.max_i = max_i
        self.instances = min_i

    def simulate_rps(self):
        # Simulate a fluctuating load signal
        return random.randint(20, 600)

    def decide(self, rps):
        # Very naive rule: scale up if rps > 400, scale down if rps < 100
        if rps > 400:
            return min(self.instances + 1, self.max_i)
        if rps < 100:
            return max(self.instances - 1, self.min_i)
        return self.instances

    def run_once(self):
        rps = self.simulate_rps()
        new_count = self.decide(rps)
        action = None
        if new_count != self.instances:
            action = f"Scale {'up' if new_count > self.instances else 'down'}: {self.instances} -> {new_count}"
            self.instances = new_count
        return rps, action

def main():
    scaler = AutoScaler(MIN_INSTANCES, MAX_INSTANCES)
    for _ in range(20):
        rps, action = scaler.run_once()
        print(f"RPS={rps:4d}  ->  {action or 'no action'}")
        time.sleep(0.5)

if __name__ == "__main__":
    main()
```

### Line-by-line explanation
- Imports random and time for simulating load and pacing.
- MIN_INSTANCES and MAX_INSTANCES bound the scalable range.
- AutoScaler encapsulates scaling state and logic.
- simulate_rps returns a pseudo-random load value to mimic changing demand.
- decide applies a simple heuristic to determine new instance count.
- run_once executes one cycle of sensing and potential scaling, returning the observed RPS and any action.
- main runs a short demonstration loop, printing results to stdout.
- This script is a teaching tool; in production you’d hook this into an orchestrator to actually create/destroy instances or adjust container replicas.

## 5. Observability, Metrics, and Deployment Hygiene

To operate at scale, you must observe what your load balancer and backend fleet are doing. Metrics, tracing, and structured logging help you answer questions like: Are we meeting latency SLAs? Which backends are healthy? How often are we autoscaling?

```python
# 5. Minimal Prometheus metrics (Python, exposing /metrics)
from prometheus_client import start_http_server, Summary, Gauge
import time
import random

REQUEST_TIME = Summary('lb_request_processing_seconds', 'Time spent processing request')
IN_FLIGHT = Gauge('lb_in_flight_requests', 'Number of requests being processed')

def process_request():
    with REQUEST_TIME.time():
        time.sleep(random.uniform(0.01, 0.1))

if __name__ == '__main__':
    # Expose metrics on port 8000
    start_http_server(8000)
    while True:
        IN_FLIGHT.inc()
        process_request()
        IN_FLIGHT.dec()
        time.sleep(0.05)
```

### Line-by-line explanation
- Prometheus client is used to expose metrics that scraping systems can collect.
- REQUEST_TIME is a Summary metric to measure request latency.
- IN_FLIGHT is a Gauge tracking concurrent in-flight requests.
- process_request simulates a small amount of work and is wrapped with REQUEST_TIME for latency measurement.
- start_http_server(8000) starts a metrics endpoint accessible to a Prometheus server.
- The loop simulates ongoing traffic and updates the in-flight counter accordingly.

## X. Common Beginner Mistakes

Throughout load balancing and horizontal scaling, beginners frequently trip over these pitfalls. For each pitfall, you’ll see a Bad code snippet and a corrected approach.

- Pitfall 1: Forwarding all headers, including Host, can cause routing and proxying issues.

#### Bad
```python
# Bad: forward all headers as-is
headers = dict(request.headers)
```

#### Good
```python
# Good: sanitize headers before proxying
headers = {k: v for k, v in request.headers.items() if k.lower() != 'host'}
```

- Pitfall 2: Not filtering unhealthy backends; routing to a dead node.

#### Bad
```python
# Bad: always pick the next backend regardless of health
backend = BACKENDS[self.index % len(BACKENDS)]
```

#### Good
```python
# Good: prefer healthy backends, fallback to all if none known healthy
healthy = [b for b in BACKENDS if app['health'].get(b, False)]
choices = healthy or BACKENDS
backend = choices[self.index % len(choices)]
```

- Pitfall 3: Missing timeouts and retries when calling downstream services.

#### Bad
```python
resp = await session.request(method, url, headers=headers, data=body)
```

#### Good
```python
from aiohttp import ClientTimeout
timeout = ClientTimeout(total=2)
resp = await session.request(method, url, headers=headers, data=body, timeout=timeout)
if resp.status >= 500:
    # retry or fail fast
    pass
```

- Pitfall 4: Using in-memory per-process state for routing decisions in a multi-process environment.

#### Bad
```python
# Global mutable state (not safe across processes)
index = 0
index = (index + 1) % len(BACKENDS)
```

#### Good
```python
# Use a thread/process-safe mechanism (e.g., atomic counter in a shared store or use OS-provided coordination)
# For learning, demonstrate with asyncio.Lock in a single-process demo, or rely on external service for true atomicity.
```

- Pitfall 5: Assuming sticky sessions are always acceptable; they reduce load-balancer effectiveness.

#### Bad
```python
# Bad: try to lock user sessions to a single backend using cookies at the LB layer
# (not shown; hypothetical risky approach)
```

#### Good
```python
# Good: design stateless services; if session affinity is required, rely on a distributed session store
# (e.g., Redis) so any instance can serve any user.
```

## Y. Why This Matters In Real Systems

- Availability and resilience: Load balancing distributes traffic to prevent a single point of failure. If one backend goes down, the LB can route to others to maintain service continuity.
- Performance and latency: Proper distribution reduces tail latency by avoiding hot spots. Choice of strategy (Round Robin, Least Connections, IP Hash, etc.) affects how you handle fluctuating load.
- Horizontal scaling discipline: Stateless services enable linear scaling by adding more instances; any instance can handle any request without a local dependency on a previous one.
- Health checks and readiness: Proactive health checks allow automated recovery (rerouting, auto-healing) and reduce user impact during failures.
- Observability: Metrics, traces, and logs enable operators to detect saturation, latencies, and misconfigurations quickly.

Key production patterns:
- Use external state for sessions and caches (Redis, Memcached) to avoid per-instance state.
- Prefer L7 load balancers when you need application-aware routing; use NLB/L4 when you only need high-throughput transport-level balancing.
- Combine load balancing with autoscalers to meet demand spikes without over-provisioning.
- Implement circuit breakers and backoff strategies to protect backend services from cascading failures.

## Z. Study Questions

1) What is the main difference between L4 and L7 load balancing, and when would you choose one over the other?

2) Why is statelessness important for horizontal scaling, and how can you achieve it in practice?

3) Describe how a "least connections" strategy works and how you would implement it in code.

4) What are health checks and readiness probes, and how should a load balancer use their results?

5) What is the role of an external state store (e.g., Redis) in scalable microservices, and what are the trade-offs?

## Exercise

Part A — Implement a Round-Robin Load Balancer with Health Checks (Python)
- Build upon the Round-Robin LB from Section 1.
- Extend the proxy to filter backends by health status using a /healthz endpoint on each backend (Section 2).
- If all backends report unhealthy, route to the full list but log a warning.

Deliverables:
- A single Python file lb_health_rr.py implementing:
  - A configurable list of backends.
  - A background health monitor that polls /healthz every 5 seconds.
  - Round-robin routing across only healthy backends when possible.
  - Graceful shutdown of the HTTP client session.

Part B — Add Least Conversations (Least Connections) Mode
- Extend the LB to support a mode named --mode=rr|lc (Round Robin or Least Connections).
- In Least Connections mode, choose the backend with the fewest active connections (you can simulate this with a simple per-backend counter updated on request start/end).
- Provide a simple test harness to simulate a few concurrent requests and show how connections are distributed.

Part C — Autoscaler Integration (Conceptual)
- Sketch how you would connect the LB with an autoscaler to adjust the number of backend instances.
- Describe:
  - What metrics you’d expose (p95 latency, max RPS, saturation, etc.).
  - How you’d trigger scaling actions (scale-up when 90th percentile latency > SLA for a sustained period; scale-down when utilization is low for a long time).
  - How you’d handle state during scaling (warm-up periods, draining, health checks, etc.).

Hints:
- Use asyncio and aiohttp for the LB; you can start a small set of local Flask servers as backends for testing.
- Keep the exercise approachable: focus on correctness and clarity rather than production-grade stability.
- For Part C, you don’t need to implement an actual auto-scaler; instead, outline the data flow, APIs, and decision logic with small pseudocode.

End of lesson.