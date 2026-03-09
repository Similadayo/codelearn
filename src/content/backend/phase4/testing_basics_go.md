# Track: Backend Engineering — Phase 4 — Building Web Servers: Testing Basics — Unit & Integration Tests (Go)

Testing is the safety net that keeps a robust backend running as you iterate on features. In Phase 4, you’ll learn how to write reliable unit tests for small functions and integration tests that exercise components together (HTTP handlers, routers, and data stores). Mastery of these techniques reduces regressions, speeds up deployments, and makes your Go services more maintainable in production.

## 1. Testing Fundamentals: Unit vs Integration in Go

- Unit tests verify a single function or small component in isolation.
- Integration tests verify how multiple components work together (e.g., HTTP handlers with a data store).
- Go’s testing package (testing) is used for unit tests, and httptest helps test HTTP interactions without a real server.
- Effective tests are fast, deterministic, and easy to reason about. They often employ table-driven tests and dependency injection.

## 2. Unit Testing Pure Functions in Go

Code block: a simple function and its table-driven unit tests.

```go
// calculator/calculator.go
package calc

// Add returns the sum of a and b.
func Add(a, b int) int {
	return a + b
}
```

### Line-by-line explanation
- Line 1: package calc — defines the package name for the module.
- Line 4: Comment documents the function, helpful for generated docs and readability.
- Line 6: func Add(a, b int) int { — function signature: adds two ints.
- Line 7: return a + b — returns the sum; the core functionality is straightforward and side-effect free.

```go
// calculator/calculator_test.go
package calc

import "testing"

func TestAdd(t *testing.T) {
	cases := []struct {
		a, b int
		want int
	}{
		{1, 2, 3},
		{0, 5, 5},
		{-1, -1, -2},
	}
	for _, c := range cases {
		got := Add(c.a, c.b)
		if got != c.want {
			t.Fatalf("Add(%d, %d) = %d; want %d", c.a, c.b, got, c.want)
		}
	}
}
```

### Line-by-line explanation
- Line 1: package calc — tests live in the same package as the code under test.
- Line 3: import "testing" — imports the Go testing package.
- Line 5: func TestAdd(t *testing.T) { — unit test function for Add.
- Lines 6-14: cases … — table-driven approach listing input/output cases.
- Line 15: for _, c := range cases { — iterates over test cases.
- Line 16: got := Add(c.a, c.b) — calls the function under test.
- Lines 17-19: if got != c.want { t.Fatalf(...) } — asserts expected results with a descriptive message; t.Fatalf stops the test on failure.

## 3. Testing HTTP Handlers (Unit Tests)

Code block: a pure HTTP handler and its unit test using httptest.

```go
// server/server.go
package server

import (
	"encoding/json"
	"net/http"
)

// HelloHandler is a simple HTTP handler that returns a JSON message.
func HelloHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Hello, world!"})
}
```

### Line-by-line explanation
- Line 1: package server — defines the server package.
- Lines 4-9: import block — imports encoding/json for JSON responses and net/http for HTTP utilities.
- Line 12: func HelloHandler(w http.ResponseWriter, r *http.Request) { — HTTP handler signature.
- Line 13: w.Header().Set(...) — sets the Content-Type header to JSON.
- Line 14: json.NewEncoder(w).Encode(...) — writes a JSON payload: {"message": "Hello, world!"}.

```go
// server/server_test.go
package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHelloHandler(t *testing.T) {
	req := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()

	HelloHandler(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", w.Code)
	}

	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("invalid json: %v", err)
	}
	if msg, ok := resp["message"]; !ok || msg != "Hello, world!" {
		t.Fatalf("unexpected response: %#v", resp)
	}
}
```

### Line-by-line explanation
- Line 1: package server — test file in the same package.
- Lines 3-9: imports — bring in httptest, encoding/json, net/http, testing.
- Line 11: func TestHelloHandler(t *testing.T) { — test for the HelloHandler.
- Lines 12-13: req and w — create a request and a response recorder.
- Line 15: HelloHandler(w, req) — invoke the handler.
- Lines 17-19: check status code equals 200; otherwise fail.
- Lines 21-24: decode JSON body into a map; fail if decoding fails.
- Lines 25-28: validate the message value; fail if it’s not as expected.

## 4. Testing with Dependencies: Interfaces and Mocking

Code block: interface-driven design with a mock repo to test a greeting service.

```go
// greet/greet.go
package greet

import "fmt"

type User struct {
	ID   string
	Name string
}

type UserRepo interface {
	GetUser(id string) (User, error)
}

type GreetingService struct {
	Repo UserRepo
}

// Greeting returns a greeting for the user with the given id.
func (s *GreetingService) Greeting(id string) (string, error) {
	user, err := s.Repo.GetUser(id)
	if err != nil {
		return "", err
	}
	if user.Name == "" {
		return "", fmt.Errorf("empty user name")
	}
	return "Hello, " + user.Name + "!", nil
}
```

### Line-by-line explanation
- Line 1: package greet — defines the greeting-related package.
- Line 4: type User — simple user struct.
- Lines 6-9: UserRepo interface — dependency to fetch a user; supports mocking.
- Lines 11-16: GreetingService — uses an injected Repo to obtain user data.
- Lines 19-29: Greeting method — fetches user by id, validates name, returns a formatted greeting; propagates errors.

```go
// greet/greet_test.go
package greet

import "testing"

type mockRepo struct {
	User User
	Err  error
}

func (m *mockRepo) GetUser(id string) (User, error) {
	if m.Err != nil {
		return User{}, m.Err
	}
	return m.User, nil
}

func TestGreetingService_Success(t *testing.T) {
	svc := GreetingService{Repo: &mockRepo{User: User{ID: "u1", Name: "Alice"}}}
	got, err := svc.Greeting("u1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != "Hello, Alice!" {
		t.Fatalf("unexpected greeting: %q", got)
	}
}
```

### Line-by-line explanation
- Line 1: package greet — test package for greet.
- Lines 4-8: mockRepo — a simple in-memory mock that satisfies UserRepo.
- Line 10: func (m *mockRepo) GetUser(id string) (User, error) — mock implementation.
- Lines 11-15: return either an error or the preset User.
- Lines 17-26: TestGreetingService_Success — wires up the service with the mock repo and asserts the greeting.

## 5. Integration Testing with a Running Server

Code block: in-memory store, handler wiring, and a real HTTP server used for integration testing.

```go
// store/store.go
package main

import "errors"

type User struct {
	ID   string
	Name string
}

type UserStore interface {
	GetByID(id string) (User, error)
}

type InMemoryUserStore struct{ Data map[string]User }

var ErrNotFound = errors.New("user not found")

func (s *InMemoryUserStore) GetByID(id string) (User, error) {
	if u, ok := s.Data[id]; ok {
		return u, nil
	}
	return User{}, ErrNotFound
}
```

### Line-by-line explanation
- Line 1: package main — builds a small runnable example.
- Line 4: type User — domain model shared by store and handler.
- Lines 7-11: UserStore interface — contract for data retrieval.
- Line 13: InMemoryUserStore — concrete in-memory implementation.
- Line 15: ErrNotFound — sentinel error for missing users.
- Lines 17-22: GetByID — returns the user if present; otherwise an error.

```go
// store/server.go
package main

import (
	"encoding/json"
	"net/http"
	"strings"
)

func UserHandler(store UserStore) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		id := strings.TrimPrefix(r.URL.Path, "/users/")
		if id == "" {
			http.Error(w, "missing id", http.StatusBadRequest)
			return
		}
		u, err := store.GetByID(id)
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(u)
	}
}
```

### Line-by-line explanation
- Line 1: package main — keeps a single-package example.
- Lines 3-10: imports — json for encoding, http utilities, and strings for path parsing.
- Line 12: func UserHandler(store UserStore) http.HandlerFunc — returns a handler bound to a store.
- Line 13: return func(w http.ResponseWriter, r *http.Request) { — handler function.
- Line 14: id := strings.TrimPrefix(r.URL.Path, "/users/") — extracts the id from the path like /users/{id}.
- Lines 15-18: basic validation; respond with 400 if missing id.
- Lines 19-23: fetch the user; 404 if not found.
- Lines 24-26: marshal user to JSON and write to response.

```go
// store/server_integration_test.go
package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestUserHandler_Integration(t *testing.T) {
	store := &InMemoryUserStore{Data: map[string]User{"1": {ID: "1", Name: "Alice"}}}
	handler := UserHandler(store)

	// Create an in-process test server
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		handler.ServeHTTP(w, r)
	}))
	defer ts.Close()

	resp, err := http.Get(ts.URL + "/users/1")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		t.Fatalf("expected 200 OK, got %d", resp.StatusCode)
	}

	var u User
	if err := json.NewDecoder(resp.Body).Decode(&u); err != nil {
		t.Fatal(err)
	}
	if u.ID != "1" || u.Name != "Alice" {
		t.Fatalf("unexpected user: %+v", u)
	}
}
```

### Line-by-line explanation
- Line 1: package main — keeps test and code in the same package.
- Lines 3-9: imports — bring in json, http, httptest, and testing.
- Line 11: TestUserHandler_Integration — integration test for the HTTP layer with an in-memory store.
- Line 12-15: create a store with one user and bind it to the handler.
- Lines 18-23: start an in-process test server and route requests to the handler.
- Line 25: http.Get to fetch /users/1 from the test server.
- Lines 28-34: assert status 200 and decode the JSON body into a User; verify the fields.

## 6. Common Beginner Mistakes — 3+ Real Pitfalls (Bad vs Good)

- Pitfall 1: Not using table-driven tests for multiple cases.
  - Bad:
  ```go
  // bad: hard-coded one case, not scalable
  func TestAdd_Bad(t *testing.T) {
      if Add(1, 2) != 3 {
          t.Fatalf("wrong result")
      }
      if Add(2, 2) != 4 {
          t.Fatalf("wrong result")
      }
  }
  ```
  - Good:
  ```go
  func TestAdd_Good(t *testing.T) {
      cases := []struct{ a, b, want int }{
          {1, 2, 3},
          {2, 2, 4},
          {0, 5, 5},
      }
      for _, tc := range cases {
          t.Run(fmt.Sprintf("%d+%d", tc.a, tc.b), func(t *testing.T) {
              if got := Add(tc.a, tc.b); got != tc.want {
                  t.Fatalf("got %d, want %d", got, tc.want)
              }
          })
      }
  }
  ```

- Pitfall 2: Not isolating tests with subtests (loses parallelism and clarity).
  - Bad:
  ```go
  func TestSomething(t *testing.T) {
      // case A
      // case B
      // both run in same test; failures obscure which case failed
  }
  ```
  - Good:
  ```go
  func TestSomething(t *testing.T) {
      t.Run("caseA", func(t *testing.T) { /* test logic */ })
      t.Run("caseB", func(t *testing.T) { /* test logic */ })
  }
  ```

- Pitfall 3: Not using httptest for HTTP tests (testing against a real server is slow in tests).
  - Bad:
  ```go
  // spins a real server or calls external network resource
  func TestHelloHandler_E2E(t *testing.T) {
      // Start a real HTTP server on a port; this is brittle and slow
  }
  ```
  - Good:
  ```go
  func TestHelloHandler(t *testing.T) {
      req := httptest.NewRequest("GET", "/", nil)
      w := httptest.NewRecorder()
      HelloHandler(w, req)
      if w.Code != http.StatusOK { t.Fatalf("expected 200") }
  }
  ```

- Pitfall 4: Mutating shared global state across tests.
  - Bad:
  ```go
  var sharedState int

  func TestA(t *testing.T) {
      sharedState = 1
  }
  func TestB(t *testing.T) {
      if sharedState != 0 { t.Fail() } // flaky
  }
  ```
  - Good:
  ```go
  func TestA(t *testing.T) {
      // use local state
      local := 1
      _ = local
  }
  func TestB(t *testing.T) {
      local := 0
      if local != 0 { t.Fail() }
  }
  ```

## 7. Why This Matters In Real Systems

- Faster feedback: Unit tests catch regressions early in development; integration tests catch issues that unit tests miss (e.g., incorrect wiring, data conversion, or HTTP semantics).
- Safer refactors: With modular tests, you can change internal implementations with confidence as long as the public interfaces and expected behaviors stay intact.
- Better reliability in production: A comprehensive test suite reduces the risk of outages caused by broken endpoints, misbehaving dependencies, or data layer changes.
- CI readiness: Clear, fast tests enable CI pipelines to gate deployments, ensuring only healthy changes reach staging/production.
- Realistic tests at scale: Integration tests that exercise handlers with in-memory stores mirror real interactions more closely, helping prevent surprises in production.

## 8. Study Questions — 5 Recall Questions

1. What is the difference between a unit test and an integration test? Provide an example in Go for each.
2. How do you test an HTTP handler in Go without starting a real server? Name the standard library utilities you’d use.
3. What is table-driven testing in Go, and why is it advantageous for unit tests?
4. How can dependency injection simplify testing in Go? Give a short example using an interface.
5. What is httptest.Server used for, and when would you prefer httptest.ResponseRecorder over a server?

## Z. Exercise — Practical Multi-Part Coding Challenge

Goal: Build a small Go HTTP service from scratch with unit and integration tests, using dependency injection and an in-memory data store.

Part A — Create a minimal HTTP service
- Implement a simple HTTP server with two endpoints:
  - GET /ping -> {"response":"pong"}
  - GET /users/{id} -> returns a user object from an in-memory store with fields id and name (e.g., {"id":"1","name":"Alice"}).
- Use a UserStore interface and an InMemoryUserStore implementation.
- Provide a function UserHandler(store UserStore) http.HandlerFunc to wire the endpoint.

Part B — Unit tests for the handler and store
- Write a unit test for /ping using httptest to verify the response is 200 and the body is {"response":"pong"}.
- Write a unit test for UserHandler that uses a mock store to verify JSON shape and status behavior for a known ID.
- Write a unit test for InMemoryUserStore.GetByID that returns a user for a known ID and an error for an unknown ID.

Part C — Integration test with httptest.Server
- Spin up an in-memory server using httptest.NewServer and your UserHandler with a real InMemoryUserStore containing at least one user.
- Exercise both endpoints (/ping and /users/{id}) against the test server and verify correct responses.

Part D — Extend and maintain
- Add another route, POST /users to create a user in the in-memory store (auto-increment ID). Ensure unit tests cover the creation path.
- Update tests to verify the new path and ensure no regressions to existing endpoints.

Part E — CI considerations
- Outline a minimal CI plan: commands to run go test ./..., expectations for success, and how to cache test dependencies to speed up feedback.
- Include a brief note on how you would structure tests in a real project (e.g., separate packages for domain logic, handlers, and storage adapters) to aid maintainability.

If you want, I can provide starter scaffolding files (with package names and go.mod setup) to bootstrap this exercise.