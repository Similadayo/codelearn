# Track: Backend Engineering — Module: Phase 9 — System Design & Scalability — Topic: Microservices vs Monolith — When & Why (Go)

Track context: This lesson explores how to reason about monolith versus microservices architectures in production-grade Go applications. You’ll learn the tradeoffs, see concrete Go code for a monolith and a microservice-based setup, and practice identifying pitfalls and migration strategies that actually scale in real systems.

## 1. Compelling Intro: What this concept is and why it matters professionally

In modern backend engineering, you’ll frequently encounter the choice between a monolithic application and a microservices architecture. A monolith is a single deployable unit that contains all business logic and data access in one codebase. Microservices split functionality into independent services that communicate over lightweight protocols. The decision matters because it affects deployment velocity, fault isolation, scalability, team autonomy, data governance, and operational complexity. In Go, the language’s simplicity, strong standard library, and excellent concurrency primitives make both patterns approachable—yet the right choice hinges on business goals, organizational structure, and maintainability considerations. This lesson gives a clear, code-backed view of when and why to choose each approach, and what Go idioms help you implement them cleanly.

## 2.  Monolith in Go — a single, cohesive Go binary with shared data model

- Concept: A monochrome, single process that handles HTTP endpoints for multiple resources (e.g., users and orders) with a simple in-memory data store. This demonstrates a baseline you’d start with before splitting into services.

```go
// monolith.go
package main

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"sync"
)

type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Order struct {
	ID       int    `json:"id"`
	UserID   int    `json:"user_id"`
	Item     string `json:"item"`
	Quantity int    `json:"qty"`
}

type DataStore struct {
	mu         sync.RWMutex
	users      map[int]User
	orders     map[int]Order
	nextUserID int
	nextOrderID int
}

func NewDataStore() *DataStore {
	return &DataStore{
		users: map[int]User{
			1: {ID: 1, Name: "Alice"},
			2: {ID: 2, Name: "Bob"},
		},
		orders: map[int]Order{
			1: {ID: 1, UserID: 1, Item: "Book", Quantity: 2},
		},
		nextUserID: 3,
		nextOrderID: 2,
	}
}

func (ds *DataStore) ListUsers() []User {
	ds.mu.RLock()
	defer ds.mu.RUnlock()
	out := make([]User, 0, len(ds.users))
	for _, u := range ds.users {
		out = append(out, u)
	}
	return out
}

func (ds *DataStore) GetUser(id int) (User, bool) {
	ds.mu.RLock()
	defer ds.mu.RUnlock()
	u, ok := ds.users[id]
	return u, ok
}

func (ds *DataStore) CreateUser(name string) User {
	ds.mu.Lock()
	defer ds.mu.Unlock()
	u := User{ID: ds.nextUserID, Name: name}
	ds.users[u.ID] = u
	ds.nextUserID++
	return u
}

func (ds *DataStore) ListOrders() []Order {
	ds.mu.RLock()
	defer ds.mu.RUnlock()
	out := make([]Order, 0, len(ds.orders))
	for _, o := range ds.orders {
		out = append(out, o)
	}
	return out
}

func (ds *DataStore) CreateOrder(userID int, item string, qty int) Order {
	ds.mu.Lock()
	defer ds.mu.Unlock()
	o := Order{ID: ds.nextOrderID, UserID: userID, Item: item, Quantity: qty}
	ds.orders[o.ID] = o
	ds.nextOrderID++
	return o
}

func main() {
	ds := NewDataStore()

	http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			json.NewEncoder(w).Encode(ds.ListUsers())
		case http.MethodPost:
			// Expect JSON body: {"name": "Name"}
			var payload struct{ Name string `json:"name"` }
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || strings.TrimSpace(payload.Name) == "" {
				http.Error(w, "invalid payload", http.StatusBadRequest)
				return
			}
			usr := ds.CreateUser(payload.Name)
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(usr)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	http.HandleFunc("/users/", func(w http.ResponseWriter, r *http.Request) {
		// /users/{id}
		idStr := strings.TrimPrefix(r.URL.Path, "/users/")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "invalid id", http.StatusBadRequest)
			return
		}
		user, ok := ds.GetUser(id)
		if !ok {
			http.NotFound(w, r)
			return
		}
		json.NewEncoder(w).Encode(user)
	})

	http.HandleFunc("/orders", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			json.NewEncoder(w).Encode(ds.ListOrders())
		case http.MethodPost:
			// Expect JSON body: {"user_id": 1, "item": "Book", "qty": 2}
			var payload struct {
				UserID  int    `json:"user_id"`
				Item    string `json:"item"`
				Qty     int    `json:"qty"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil ||
				payload.Item == "" || payload.Qty <= 0 {
				http.Error(w, "invalid payload", http.StatusBadRequest)
				return
			}
			ord := ds.CreateOrder(payload.UserID, payload.Item, payload.Qty)
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(ord)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	http.HandleFunc("/orders/", func(w http.ResponseWriter, r *http.Request) {
		// /orders/{id}
		idStr := strings.TrimPrefix(r.URL.Path, "/orders/")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "invalid id", http.StatusBadRequest)
			return
		}
		ds.mu.RLock()
		order, ok := ds.orders[id]
		ds.mu.RUnlock()
		if !ok {
			http.NotFound(w, r)
			return
		}
		json.NewEncoder(w).Encode(order)
	})

	log.Println("Monolith server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

### Line-by-line explanation

1) package main
- Declares the executable package for a standalone Go program.

2-8) Imports
- Bring in standard library packages for JSON encoding/decoding, logging, HTTP server, string/strconv helpers, and synchronization primitive.

10-16) User struct
- Defines the User data model with JSON tags for marshalling.

18-24) Order struct
- Defines the Order data model.

26-32) DataStore struct
- Holds in-memory stores with a mutex to guard concurrent access and counters for IDs.

34-43) NewDataStore
- Initializes a datastore with sample data and ID counters.

45-51) ListUsers
- Returns a snapshot of all users with a read lock.

53-57) GetUser
- Retrieves a single user by ID with a read lock.

59-66) CreateUser
- Creates a new user, assigns an auto-incremented ID, stores it, and increments the counter with a write lock.

68-76) ListOrders
- Returns all orders with a read lock.

78-86) CreateOrder
- Creates a new order, assigns an ID, stores it, and increments the order counter with a write lock.

88-132) main
- Creates the datastore instance.
- Sets up HTTP routes:
  - /users with GET (list) and POST (create).
  - /users/{id} for retrieving a single user by ID.
  - /orders with GET (list) and POST (create).
  - /orders/{id} for retrieving a single order by ID.
- Starts the server on port 8080.

Notes:
- This monolith demonstrates typical resource endpoints in a single Go binary, with in-memory storage suitable for demos. In production, you’d replace in-memory stores with a database layer and add validation, authentication, and observability.

## 3.  Microservices in Go — separate services with inter-service communication

- Concept: Split functionality into independent services. Here, we implement:
  - user-service: manages users
  - order-service: manages orders
  - gateway: composes data from both services to present a unified view

### 3.1. User service (port 8001)

```go
// user-service.go
package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"sync"
)

type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type UserStore struct {
	mu     sync.RWMutex
	data   map[int]User
	nextID int
}

func NewUserStore() *UserStore {
	return &UserStore{
		data: map[int]User{
			1: {ID: 1, Name: "Alice"},
			2: {ID: 2, Name: "Bob"},
		},
		nextID: 3,
	}
}

func (s *UserStore) List() []User {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]User, 0, len(s.data))
	for _, u := range s.data {
		out = append(out, u)
	}
	return out
}

func (s *UserStore) Get(id int) (User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u, ok := s.data[id]
	return u, ok
}

func (s *UserStore) Create(name string) User {
	s.mu.Lock()
	defer s.mu.Unlock()
	u := User{ID: s.nextID, Name: name}
	s.data[u.ID] = u
	s.nextID++
	return u
}

func main() {
	store := NewUserStore()

	http.HandleFunc("/users", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			json.NewEncoder(w).Encode(store.List())
		case http.MethodPost:
			var payload struct{ Name string `json:"name"` }
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil || strings.TrimSpace(payload.Name) == "" {
				http.Error(w, "invalid payload", http.StatusBadRequest)
				return
			}
			u := store.Create(payload.Name)
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(u)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	http.HandleFunc("/users/", func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/users/")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "invalid id", http.StatusBadRequest)
			return
		}
		u, ok := store.Get(id)
		if !ok {
			http.NotFound(w, r)
			return
		}
		json.NewEncoder(w).Encode(u)
	})

	// Run on port 8001
	http.ListenAndServe(":8001", nil)
}
```

### 3.1. Line-by-line explanation

1) package main
- Declares this as an executable Go program.

3-9) Imports
- Bring in standard library features for JSON encoding, HTTP server, string helpers, synchronization.

11-15) User struct
- Defines the User representation with JSON tags.

17-23) UserStore struct
- In-memory store protected by a mutex; tracks the next ID for new users.

25-29) NewUserStore
- Initializes a store with two sample users and a starting ID.

31-39) List
- Returns all users with a read lock to ensure thread safety.

41-49) Get
- Retrieves a user by ID with a read lock; returns a boolean indicating existence.

51-60) Create
- Adds a new user, assigns an auto-incremented ID, stores it, and increments the ID counter with a write lock.

63-99) main
- Creates a user store and registers HTTP handlers:
  - GET /users: list all users
  - POST /users: create a user from {"name": "..."}
  - GET /users/{id}: fetch a specific user
- Starts the server on port 8001.

Notes:
- This service encapsulates a bounded context (User) and provides a clean HTTP API that others can consume, without exposing internal monolith-style data access.

### 3.2. Order service (port 8002)

```go
// order-service.go
package main

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"sync"
)

type Order struct {
	ID       int    `json:"id"`
	UserID   int    `json:"user_id"`
	Item     string `json:"item"`
	Quantity int    `json:"qty"`
}

type OrderStore struct {
	mu     sync.RWMutex
	data   map[int]Order
	nextID int
}

func NewOrderStore() *OrderStore {
	return &OrderStore{
		data: map[int]Order{
			1: {ID: 1, UserID: 1, Item: "Book", Quantity: 2},
		},
		nextID: 2,
	}
}

func (s *OrderStore) List() []Order {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Order, 0, len(s.data))
	for _, o := range s.data {
		out = append(out, o)
	}
	return out
}

func (s *OrderStore) Get(id int) (Order, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	o, ok := s.data[id]
	return o, ok
}

func (s *OrderStore) Create(userID int, item string, qty int) Order {
	s.mu.Lock()
	defer s.mu.Unlock()
	o := Order{ID: s.nextID, UserID: userID, Item: item, Quantity: qty}
	s.data[o.ID] = o
	s.nextID++
	return o
}

func main() {
	store := NewOrderStore()

	http.HandleFunc("/orders", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			json.NewEncoder(w).Encode(store.List())
		case http.MethodPost:
			var payload struct {
				UserID  int    `json:"user_id"`
				Item    string `json:"item"`
				Qty     int    `json:"qty"`
			}
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil ||
				payload.Item == "" || payload.Qty <= 0 {
				http.Error(w, "invalid payload", http.StatusBadRequest)
				return
			}
			o := store.Create(payload.UserID, payload.Item, payload.Qty)
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(o)
		default:
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
	})

	http.HandleFunc("/orders/", func(w http.ResponseWriter, r *http.Request) {
		idStr := strings.TrimPrefix(r.URL.Path, "/orders/")
		id, err := strconv.Atoi(idStr)
		if err != nil {
			http.Error(w, "invalid id", http.StatusBadRequest)
			return
		}
		o, ok := store.Get(id)
		if !ok {
			http.NotFound(w, r)
			return
		}
		json.NewEncoder(w).Encode(o)
	})

	// Run on port 8002
	http.ListenAndServe(":8002", nil)
}
```

### Line-by-line explanation

1) package main
- Declares the executable.

3-9) Imports
- Bring in JSON, HTTP, string parsing, and synchronization.

11-16) Order struct
- Defines the Order data model with JSON tags.

18-24) OrderStore struct
- In-memory order store protected by a mutex; next ID counter.

26-30) NewOrderStore
- Initializes sample orders and the next ID.

32-40) List
- Returns all orders with a read lock.

42-50) Get
- Retrieves an order by ID with a read lock.

52-60) Create
- Creates a new order, assigns an ID, stores it, increments the counter.

62-97) main
- Creates an order store and registers HTTP handlers:
  - GET /orders: list all orders
  - POST /orders: create an order from {"user_id": ..., "item": "...", "qty": ...}
  - GET /orders/{id}: fetch by ID
- Starts the server on port 8002.

### 3.3. Gateway (composition layer) — aggregating data from both services

```go
// gateway.go
package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type User struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type Order struct {
	ID       int    `json:"id"`
	UserID   int    `json:"user_id"`
	Item     string `json:"item"`
	Quantity int    `json:"qty"`
}

type Summary struct {
	Users  []User  `json:"users"`
	Orders []Order `json:"orders"`
}

func fetchUsers() ([]User, error) {
	client := http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://localhost:8001/users")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var users []User
	err = json.NewDecoder(resp.Body).Decode(&users)
	return users, err
}

func fetchOrders() ([]Order, error) {
	client := http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get("http://localhost:8002/orders")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	var orders []Order
	err = json.NewDecoder(resp.Body).Decode(&orders)
	return orders, err
}

func main() {
	http.HandleFunc("/summary", func(w http.ResponseWriter, r *http.Request) {
		users, uerr := fetchUsers()
		orders, oerr := fetchOrders()

		// Simple error handling for demo
		if uerr != nil || oerr != nil {
			http.Error(w, "failed to fetch data from services", http.StatusBadGateway)
			return
		}

		json := Summary{Users: users, Orders: orders}
		w.Header().Set("Content-Type", "application/json")
		enc := json.Marshal(json)
		fmt.Fprint(w, string(enc))
	})

	// Run gateway on port 8080
	http.ListenAndServe(":8080", nil)
}
```

### Line-by-line explanation

1) package main
- Entry point of the gateway application.

3-9) Imports
- Include JSON, fmt, HTTP client, and timing utilities.

11-19) User, Order, Summary structs
- Reuse the data models for marshaling the composite response.

21-29) fetchUsers
- Creates an HTTP client with a 2-second timeout, calls the user-service, decodes JSON into []User, returns result or error.

31-39) fetchOrders
- Similar to fetchUsers but calls the order-service and decodes []Order.

41-56) main
- Sets up endpoint /summary that fetches data from both services, builds a Summary, and writes JSON to the response.
- Starts on port 8080.

Notes:
- The gateway demonstrates how you can compose data from multiple microservices into a single client-facing endpoint. In production, you’d add resilience patterns (timeouts, retries, circuit breakers) and possibly a more sophisticated orchestration approach.

## 4. X. Common Beginner Mistakes — 3+ real pitfalls with bad vs good code side-by-side

### Pitfall A — Prematurely splitting into microservices or sharing a DB across services

- Bad: two services share a single database connection and schemas, causing tight coupling.
```go
// bad (shared DB across services) - pseudo-snip
package main

import "database/sql"

var db *sql.DB // shared across user and order services

func main() {
	// both services use the same db handle and tables
	// User tables and Order tables live in same DB
}
```

```go
// good (bounded contexts, separate stores) - pseudo-snip
package main

type UserStore interface {
	GetAll() ([]User, error)
	Create(User) (User, error)
}
type OrderStore interface {
	GetAll() ([]Order, error)
	Create(Order) (Order, error)
}
```

### Line-by-line explanation

Bad code:

1) package main
- A single file implying a shared global DB usage across services.

3-7) Shared DB variable
- Declares a global database handle, making both “services” depend on the same resource, which couples deployments and policy.

9-13) Main
- A placeholder to illustrate that both services would reuse the same DB.

Good code:

1) package main
- Demonstrates separation of concerns with interfaces.

3-12) Interfaces for bounded contexts
- UserStore and OrderStore definitions isolate data access behind interfaces, enabling separate implementations and databases per service.

Notes:
- Bound contexts and explicit data ownership help avoid cross-service coupling and simplify evolution.

### Pitfall B — No API versioning or backwards-compatibility

- Bad: endpoint /v2/users changes break clients; no versioned contracts.
```go
// bad: un-versioned endpoints
http.HandleFunc("/users", handleUsersV2) // changing from v1 to v2 without clear contract
```

```go
// good: explicit versioned contracts
http.HandleFunc("/v1/users", handleUsersV1)
http.HandleFunc("/v2/users", handleUsersV2)
```

### Line-by-line explanation

Bad:

1) package main
- Sets up a basic HTTP server.

3-6) Versionless route
- Exposes an endpoint without a stable version, making future changes breaking for clients.

Good:

1) package main
- Start of a versioned API skeleton.

3-7) Separate handlers per version
- Registers explicit versions, enabling backward compatibility and evolving contracts.

Notes:
- Versioning helps manage migrations, disables client breakage, and supports incremental adoption.

### Pitfall C — No resilience patterns in inter-service calls

- Bad: HTTP calls into another service with no timeouts or retries.
```go
// bad: naive HTTP call
resp, err := http.Get("http://service-a/users")
if err != nil { panic(err) }
defer resp.Body.Close()
```

```go
// good: with timeouts and retry
client := http.Client{Timeout: 2 * time.Second}
for i := 0; i < 3; i++ {
	resp, err := client.Get("http://service-a/users")
	if err == nil {
		defer resp.Body.Close()
		// decode and return
		break
	}
	time.Sleep(100 * time.Millisecond)
}
```

### Line-by-line explanation

Bad:

1) package main
- Basic setup.

3-7) Simple http.Get
- No timeout guarantees; a failing call can hang or backpressure.

Good:

1) package main
- Start with a resilient client.

3-7) http.Client with timeout
- Introduces a default timeout to avoid hanging calls.

9-16) Retry loop
- Adds a few retries to tolerate transient failures, improving resilience.

Notes:
- In production, you’d use a proper circuit breaker (e.g., go-chi/circuitbreaker or Hystrix-like patterns), exponential backoff, and graceful fallbacks.

### Pitfall D — Over-splitting entities with tiny services

- Bad: creating a microservice for every tiny capability leads to excessive inter-service chatter.
```go
// bad: 10 microservices for a single feature
// service1: validate, service2: business rule, service3: logging, etc.
```

```go
// good: group related capabilities under bounded contexts
// 3-5 cohesive services with clear ownership
```

### Line-by-line explanation

Bad:
- Conceptual illustration: too many services leads to routing complexity and higher latency.

Good:
- Advocates for cohesive services with bounded contexts to balance isolation and performance.

Notes:
- Aim for service boundaries that reflect domain concepts, not arbitrary UI or minor features.

## 5. Y. Why This Matters In Real Systems — production context and real usage

- System design implications:
  - Fault isolation: Microservices can fail independently; a monolith’s failure can degrade the entire system.
  - Deployability: Monoliths are simpler to deploy; microservices enable independent deployments and polyglot tech stacks.
  - Data boundaries: Microservices encourage bounded contexts and separate data stores, reducing cross-service coupling but introducing eventual consistency.
  - Observability: Distributed tracing, metrics, and centralized logging are essential for microservices; single-log monoliths are easier to observe but can become unwieldy at scale.
  - Scaling strategy: Monoliths scale as a single unit; microservices scale components independently, matching demand patterns.
  - Development velocity: Microservices empower autonomous teams but demand governance (APIs, versioning) and robust CI/CD.
  - Network overhead: Microservices incur serialization/deserialization costs and network latency; go with efficient protocols (HTTP/2, gRPC) and payload shapes.

- Go-specific patterns that help in both models:
  - Use context.Context for cancellation and timeouts.
  - Set sane defaults on http.Clients; reuse clients to avoid connection leaks.
  - Favor interfaces and dependency injection to enable testability and swapability.
  - Instrumentation: Prometheus metrics, OpenTelemetry traces, structured logs.
  - Testing strategies: Unit tests for business logic; integration tests that mock downstream services.

- Migration strategies:
  - Strangler Fig pattern: gradually replace monolith features with microservices, routing to new services while the old functionality remains until fully migrated.
  - Data migration plan: move data ownership incrementally; avoid distributed transactions when possible; consider sagas for eventual consistency.

## 6. Z. Study Questions — 5 recall questions

1) What are the core tradeoffs between a monolith and microservices in terms of deployment, scaling, and fault isolation?
2) In Go, how would you design a microservice to own a bounded context (e.g., users) and expose a stable HTTP API?
3) How does a gateway/service composition layer help clients when using multiple microservices?
4) Why is API versioning important in microservices, and what are common versioning strategies?
5) What resilience patterns should you consider when a microservice calls another service (timeouts, retries, circuit breakers, fallbacks)?

## 7. Exercise — practical multi-part coding challenge

Part A: Build a monolith in Go
- Task: Implement a monolith with two resources: Users and Orders, using in-memory stores (as in the Monolith example).
- Deliverables:
  - monolith.go with endpoints:
    - GET /users, POST /users
    - GET /users/{id}
    - GET /orders, POST /orders
    - GET /orders/{id}
- Run and test:
  - Start: go run monolith.go
  - Test with curl:
    - curl http://localhost:8080/users
    - curl -X POST -d '{"name":"Charlie"}' -H "Content-Type: application/json" http://localhost:8080/users
    - curl http://localhost:8080/orders
- Acceptance: Monolith serves simple serializable JSON, supports creation, and returns IDs.

Part B: Split into microservices
- Create three separate Go services:
  - user-service.go (port 8001) as in section 3.1
  - order-service.go (port 8002) as in section 3.2
  - gateway.go (port 8080) as in section 3.3
- Run:
  - go run user-service.go
  - go run order-service.go
  - go run gateway.go
- Then test gateway:
  - curl http://localhost:8080/summary
- Acceptance: Gateway returns a composite JSON containing users from the user-service and orders from the order-service.

Part C: Simple migration plan
- Outline a Strangler Fig plan:
  - Identify a feature boundary (e.g., “Order processing”).
  - Create a new microservice that implements that boundary.
  - Route a portion of traffic to the new service via the gateway.
  - Slowly migrate all logic until the monolith feature is fully replaced.

Note: The exercise intentionally uses self-contained, minimal Go code to demonstrate concepts. In real projects, you’d add authentication, validation, error handling, tests, and CI/CD pipelines.

If you want, I can tailor the exercise to a specific team size, data model, or a continuous deployment setup.