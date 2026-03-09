# Track: Backend Engineering — Phase 9: System Design & Scalability — Load Balancing & Horizontal Scaling (Go)

Load balancing and horizontal scaling are foundational for building resilient, scalable backend systems. In production, teams must distribute traffic efficiently across many instances, detect and isolate failed nodes, and enable services to scale out horizontally with confidence. This module focuses on practical Go implementations, common patterns, and real-world considerations that tie system design to measurable performance and reliability.

## 1. Load Balancing Fundamentals in Go

Load balancing distributes client requests across multiple backend instances to improve throughput, reduce latency, and provide fault tolerance. In practice, you’ll encounter L4 (transport level) versus L7 (application level) load balancing, health checks, session affinity, and various routing algorithms like round-robin or least connections.

Code example: a simple conceptual Round-Robin utility in Go (atomic counter for thread-safety).

```go
package main

import (
	"sync/atomic"
)

type RoundRobin struct {
	index uint64
}

func (rr *RoundRobin) Next(n int) int {
	// Atomically increment and wrap around
	i := int(atomic.AddUint64(&rr.index, 1) - 1)
	return i % n
}
```

### Line-by-line explanation
- package main: Declares the file as part of the main package for a standalone executable.
- import "sync/atomic": Imports atomic operations to safely update a shared index across goroutines.
- type RoundRobin struct { index uint64 }: Defines a simple struct to hold the current index as an unsigned 64-bit integer.
- func (rr *RoundRobin) Next(n int) int {: Method on RoundRobin to pick the next backend index given count n.
- i := int(atomic.AddUint64(&rr.index, 1) - 1): Atomically increments the index and converts the result to int, then subtracts 1 to get a zero-based value.
- return i % n: Wraps the index using modulo, ensuring it stays within [0, n-1].
```

## 2. Implementing a Round-Robin Reverse Proxy with Health Checks (Go)

This section presents a self-contained Go program that acts as a simple load balancer. It maintains a list of backends, performs periodic health checks, uses a round-robin strategy to select a healthy backend, and proxies incoming HTTP requests to that backend. Optional sticky sessions are supported via a small cookie to route a client consistently to the same backend.

```go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strconv"
	"sync"
	"sync/atomic"
	"time"
)

type Backend struct {
	URL   *url.URL
	Alive bool
	mu    sync.RWMutex
}

func (b *Backend) SetAlive(alive bool) {
	b.mu.Lock()
	b.Alive = alive
	b.mu.Unlock()
}
func (b *Backend) IsAlive() bool {
	b.mu.RLock()
	v := b.Alive
	b.mu.RUnlock()
	return v
}

type LoadBalancer struct {
	backends        []*Backend
	index           uint64
	mu              sync.RWMutex
	healthInterval  time.Duration
	client          *http.Client
	sticky          bool
}

func NewLoadBalancer(targets []string, healthInterval time.Duration, sticky bool) *LoadBalancer {
	lb := &LoadBalancer{
		healthInterval: healthInterval,
		client:         &http.Client{Timeout: 2 * time.Second},
		sticky:         sticky,
	}
	for _, t := range targets {
		u, err := url.Parse(t)
		if err != nil {
			log.Fatalf("invalid backend url %s: %v", t, err)
		}
		lb.backends = append(lb.backends, &Backend{URL: u, Alive: true})
	}
	go lb.healthCheckLoop()
	return lb
}

func (lb *LoadBalancer) healthCheckLoop() {
	for {
		lb.checkAll()
		time.Sleep(lb.healthInterval)
	}
}

func (lb *LoadBalancer) checkAll() {
	var wg sync.WaitGroup
	for _, b := range lb.backends {
		wg.Add(1)
		go func(be *Backend) {
			defer wg.Done()
			healthURL := &url.URL{Scheme: be.URL.Scheme, Host: be.URL.Host, Path: "/health"}
			ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
			defer cancel()
			req, _ := http.NewRequestWithContext(ctx, "GET", healthURL.String(), nil)
			resp, err := lb.client.Do(req)
			alive := false
			if err == nil && resp != nil {
				if resp.StatusCode >= 200 && resp.StatusCode < 400 {
					alive = true
				}
				resp.Body.Close()
			}
			be.SetAlive(alive)
		}(b)
	}
	wg.Wait()
}

func (lb *LoadBalancer) nextBackend(r *http.Request) *Backend {
	lb.mu.RLock()
	total := len(lb.backends)
	lb.mu.RUnlock()
	if total == 0 {
		return nil
	}

	// Sticky sessions: try to honor a saved backend index in a cookie
	if lb.sticky {
		if c, err := r.Cookie("LB-BACKEND"); err == nil {
			if idx, terr := strconv.Atoi(c.Value); terr == nil {
				lb.mu.RLock()
				if idx >= 0 && idx < len(lb.backends) && lb.backends[idx].IsAlive() {
					b := lb.backends[idx]
					lb.mu.RUnlock()
					return b
				}
				lb.mu.RUnlock()
			}
		}
	}

	// Round-robin among alive backends
	for i := 0; i < total; i++ {
		idx := int((atomic.AddUint64(&lb.index, 1) - 1) % uint64(total))
		lb.mu.RLock()
		b := lb.backends[idx]
		alive := b.IsAlive()
		lb.mu.RUnlock()
		if alive {
			return b
		}
	}
	return nil
}

func (lb *LoadBalancer) findBackendIndex(target *Backend) int {
	lb.mu.RLock()
	defer lb.mu.RUnlock()
	for i, b := range lb.backends {
		if b == target {
			return i
		}
	}
	return -1
}

func (lb *LoadBalancer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	b := lb.nextBackend(r)
	if b == nil || b.URL == nil {
		w.WriteHeader(http.StatusServiceUnavailable)
		fmt.Fprintln(w, "No backend available")
		return
	}

	// Prepare a reverse proxy for the selected backend
	proxy := httputil.NewSingleHostReverseProxy(b.URL)

	// Override Director to ensure path and query are preserved
	originalDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		originalDirector(req)
		// Preserve path and query from the original client request
		req.URL.Path = r.URL.Path
		req.URL.RawQuery = r.URL.RawQuery
		// Ensure the Host header matches the backend
		req.Host = b.URL.Host
	}

	// Set sticky cookie so the same backend is selected for this client
	if lb.sticky {
		idx := lb.findBackendIndex(b)
		if idx >= 0 {
			http.SetCookie(w, &http.Cookie{
				Name:  "LB-BACKEND",
				Value: strconv.Itoa(idx),
				Path:  "/",
			})
		}
	}

	proxy.ErrorHandler = func(rw http.ResponseWriter, req *http.Request, err error) {
		rw.WriteHeader(http.StatusBadGateway)
		fmt.Fprintln(rw, "Bad gateway")
	}
	proxy.ServeHTTP(w, r)
}

func main() {
	// Example backends (ensure these are running for a real test)
	targets := []string{
		"http://127.0.0.1:9001",
		"http://127.0.0.1:9002",
	}
	lb := NewLoadBalancer(targets, 5*time.Second, true)

	// Quick initial health probe
	lb.checkAll()

	http.HandleFunc("/", lb.ServeHTTP)

	fmt.Println("Load balancer listening on :8080; backends:", targets)
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Line-by-line explanation
- package main: Declares the program as an executable package.
- Imports: Bring in necessary libraries for HTTP, URL handling, synchronization, time, etc.
- type Backend: Represents a backend instance, its URL, and a flag for aliveness with a mutex for safe concurrent updates.
- SetAlive / IsAlive: Thread-safe accessors for the Alive flag.
- type LoadBalancer: Encapsulates the backends, a round-robin index, and health-check config.
- NewLoadBalancer: Constructor that parses target URLs, initializes backends, and starts the health-check loop.
- healthCheckLoop: Runs forever, periodically invoking health checks.
- checkAll: Checks each backend’s /health endpoint concurrently and updates Alive.
- nextBackend: Chooses the next healthy backend using sticky sessions (if enabled) or round-robin.
- findBackendIndex: Returns the position of a backend in the slice (used for sticky cookies).
- ServeHTTP: HTTP handler that proxies the request to the chosen backend, sets a sticky cookie, and handles proxy errors.
- main: Creates the load balancer, performs an initial health check, and starts the HTTP server on port 8080.

## X. Common Beginner Mistakes

- 1) Racey, non-atomic counters in concurrency

Bad:
```go
type LB struct {
  index int
}
func (lb *LB) Next(n int) int {
  lb.index = (lb.index + 1) % n
  return lb.index
}
```

Good:
```go
import "sync/atomic"
var idx uint64
func Next(n int) int {
  i := int(atomic.AddUint64(&idx, 1) - 1)
  return i % n
}
```

- 2) No health checks or misinterpreting health results

Bad:
```go
// Always route to backends[0] regardless of health
proxy := httputil.NewSingleHostReverseProxy(backends[0].URL)
```

Good:
```go
// Periodically ping /health and mark Alive accordingly
go lb.healthCheckLoop()
// And in selection, pick only backends where back.IsAlive() == true
```

- 3) No per-backend timeouts or overly aggressive client behavior

Bad:
```go
resp, err := http.Get(url) // no timeout; potential hangs
```

Good:
```go
client := &http.Client{Timeout: 2 * time.Second}
resp, err := client.Get(url)
```

- 4) Not preserving or correctly handling headers and client data

Bad:
```go
proxy.Director = func(req *http.Request) {
  // blindly rewrite; may lose original headers
}
```

Good:
```go
proxy.Director = func(req *http.Request) {
  // Use the target backend but preserve essential headers from the original request
  originalDirector(req)
  req.Host = backend.URL.Host
}
```

- 5) Missing resource cleanup and error propagation

Bad:
```go
resp, _ := http.Get(url)
defer resp.Body.Close() // missing if error
```

Good:
```go
resp, err := http.Get(url)
if err != nil { /* handle */ }
defer resp.Body.Close()
```

## Y. Why This Matters In Real Systems

- Reliability and uptime: Horizontal scaling with stateless services reduces single points of failure. A load balancer can route around failed nodes and enable rolling upgrades with zero downtime.
- Performance and cost: Distributing traffic across multiple instances improves throughput and can help meet SLOs while optimizing resource utilization.
- Observability: In production, you must monitor latency, error rates, backend health, and traffic patterns. Load balancers provide a critical telemetry surface for SRE and DevOps.
- Complexity management: In real systems you’ll need L4/L7 balance, sticky sessions, blue/green or canary deployments, circuit breakers, and metrics dashboards. Go’s concurrency model helps implement high-throughput proxies, but you must design for fault tolerance and recoverability.
- Statelessness and data locality: Stateless frontends scale easily; shared data (store in Redis, distributed caches) and proper session management are essential for true horizontal scaling.

## Z. Study Questions

1) What is the difference between L4 and L7 load balancing, and where would you typically apply each?  
2) How does a round-robin algorithm behave when one backend becomes unhealthy? How can health checks fix this?  
3) What are the trade-offs of enabling sticky sessions in a load balancer? When might you want to avoid them?  
4) Why is it important to use timeouts and proper cancellation in backend requests?  
5) How does statelessness enable true horizontal scaling, and what patterns help manage state in a distributed system?

## Exercise

Multi-part practical coding challenge: Extend the provided Go-based load balancer to be more production-ready and flexible.

Part A — Dynamic backends from config file
- Create a JSON config file (e.g., backends.json) with a list of backend URLs.
- Modify the load balancer to load backends from this file on startup and to watch for changes (e.g., periodically re-read or use a file watcher) to update the backend pool without restarting the process.
- Acceptance: The proxy updates backends automatically when the config changes; health checks apply to new backends and remove stale ones.

Part B — Health endpoint and status reporting
- Implement an HTTP endpoint on the load balancer itself at /status that returns a summary: number of backends, number healthy, current algorithm, and whether sticky sessions are enabled.
- Ensure /health on each backend is respected by health checks and do not route traffic to dead backends.
- Acceptance: GET /status returns a 200 with a JSON payload; dead backends do not appear in the healthy count.

Part C — Optional: Least-Connections algorithm
- Add a command-line flag or configuration switch to choose between Round-Robin and Least-Connections routing.
- For Least-Connections, route to the backend with the lowest current active connections. You may simulate this by tracking a per-backend connection count around proxy.ServeHTTP lifecycle.
- Acceptance: The algorithm switch works and routes requests according to the selected method.

Part D — Test plan
- Create a simple test backend (e.g., two small HTTP servers responding with “backend 1” and “backend 2” on different ports, plus a /health endpoint that returns 200).
- Validate: load balancer starts, health checks update statuses, backends are load-balanced according to the chosen algorithm, and the /status endpoint reflects the correct state.

Guidance and expectations
- Keep the code modular: separate concerns (health checks, routing, config loading, metrics).
- Ensure timeouts are present for backend requests and health checks to avoid blocking the balancer.
- Favor stateless design for easy horizontal scaling; store minimal per-request data on the client or in a distributed cache if needed.
- Add comments and logging to aid in maintenance and debugging.
- Provide a README or in-code documentation outlining how to run the balancer, how to configure backends, and how to test the exercise locally.

This lesson gives you a practical blueprint for building and reasoning about load balancing and horizontal scaling with Go, emphasizing clean design, fault tolerance, and real-world production concerns.